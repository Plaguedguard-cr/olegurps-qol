import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GrenadeService,readGrenades,grenadeReadyStep} from '../scripts/tools/grenade-service.js';
import {mountGrenadeAssistant} from '../scripts/tools/grenade-assistant.js';
const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_ut_ammunition_catalog_v2_7.json',import.meta.url),'utf8'));
const catalogs={getVariant:(_b,id)=>raw.warheads.find(p=>p.id===id)};
const selection={bodyId:'mini40',payloadId:'he',tl:9};
const input={base:16,st:12,target:'ground',distance:1};
function fixture(){const flags={};const actor={id:'a',isOwner:true,system:{},getFlag:(s,k)=>flags[s]?.[k],async setFlag(s,k,v){(flags[s]??={})[k]=structuredClone(v);},async update(updates){for(const[path,value]of Object.entries(updates)){const keys=path.split('.').slice(1);let p=flags;for(const k of keys.slice(0,-1))p=p[k]??={};p[keys.at(-1)]=structuredClone(value);}}};const runtime={game:{user:{id:'owner',isGM:false},time:{worldTime:0},combat:null}};return {actor,runtime,service:new GrenadeService(actor,{catalogs,runtime})};}
const event=(f,id)=>readGrenades(f.actor).events.find(e=>e.id===id);
async function ready(f,id){let n=0;while(event(f,id).state==='prepared'){assert.ok(n++<8);await f.service.arm(id);}return n;}
for(const mode of ['smart-time','command','impact','anti-tamper'])for(const programming of ['now','prior'])test(mode+' '+programming+': independent drawing, activation and three programming Ready',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:mode,delay:7,programming});
 assert.equal(grenadeReadyStep(e).kind,'draw-ready');assert.equal(e.preparation.activated,false);assert.equal(e.dueAt,null);
 await f.service.arm(e.id);assert.equal(grenadeReadyStep(event(f,e.id)).kind,'activation-ready');
 await f.service.arm(e.id);
 if(programming==='now'){for(let n=1;n<=3;n++){const x=event(f,e.id);assert.equal(x.programming.readyDone,n-1);assert.equal(x.state,'prepared');assert.equal(x.preparation.activated,true);await f.service.arm(e.id);}}
 const completed=event(f,e.id);assert.equal(completed.state,'armed');assert.equal(completed.programming.completed,true);assert.equal(completed.programming.needsReprogramming,false);assert.equal(completed.dueAt,null);assert.equal(completed.spent,0);
 const restored=new GrenadeService(f.actor,{catalogs,runtime:f.runtime});assert.deepEqual(await restored.arm(e.id),completed);
 assert.equal(completed.history.filter(h=>h.kind==='program-ready').length,programming==='now'?3:0);
});
test('new parameter requires accessible unlocked code and three new Ready; no physical preparation is repeated',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'smart-time',delay:9,programming:'prior'});await ready(f,e.id);const before=event(f,e.id);
 await assert.rejects(f.service.reconfigure(e.id,{fuseMode:'smart-time',delay:10}),/код/);assert.deepEqual(event(f,e.id),before);
 await f.service.reconfigure(e.id,{fuseMode:'smart-time',delay:10,codeAccess:true});assert.equal(event(f,e.id).programming.parameters.delay,9);assert.equal(event(f,e.id).programming.needsReprogramming,true);
 assert.equal(await ready(f,e.id),3);assert.equal(event(f,e.id).programming.parameters.delay,10);assert.deepEqual(event(f,e.id).preparation,before.preparation);
});
test('partial programming survives a new service; changing pending parameters restarts all three',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'command'});await f.service.arm(e.id);await f.service.arm(e.id);await f.service.arm(e.id);
 f.service=new GrenadeService(f.actor,{catalogs,runtime:f.runtime});assert.equal(event(f,e.id).programming.readyDone,1);
 await f.service.reconfigure(e.id,{fuseMode:'impact'});assert.equal(event(f,e.id).programming.readyDone,0);assert.equal(await ready(f,e.id),3);
});
test('cancel and resume preserve this exact instance and its completed program, without changing a second grenade',async()=>{
 const f=fixture(),a=await f.service.prepare({selection,smart:true,fuseMode:'command'}),b=await f.service.prepare({selection,smart:true,fuseMode:'command'});await ready(f,a.id);const other=event(f,b.id),program=event(f,a.id).programming;
 await f.service.cancel(a.id);assert.equal(event(f,a.id).state,'armed');assert.equal(event(f,a.id).paused,true);await f.service.resume(a.id);assert.equal(event(f,a.id).state,'armed');assert.equal(event(f,a.id).paused,false);assert.deepEqual(event(f,a.id).programming,program);assert.deepEqual(event(f,b.id),other);
});
test('pin fallback and returning to the unchanged saved program do not erase it or invent programming Ready',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'smart-time',delay:31,programming:'prior'});await ready(f,e.id);
 await f.service.reconfigure(e.id,{fuseMode:'time',delay:2});assert.equal(event(f,e.id).programming.parameters.delay,31);
 assert.equal(event(f,e.id).state,'prepared');assert.equal(grenadeReadyStep(event(f,e.id)).kind,'pin-ready');
 await f.service.reconfigure(e.id,{fuseMode:'smart-time'});assert.equal(event(f,e.id).fuse.delay,31);assert.equal(event(f,e.id).state,'armed');assert.equal(event(f,e.id).programming.needsReprogramming,false);
});
test('conventional pin fallback needs its own Ready and cannot freely revert after pulling the pin',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'command',programming:'prior'});await ready(f,e.id);await f.service.reconfigure(e.id,{fuseMode:'time'});assert.equal(await ready(f,e.id),1);assert.equal(event(f,e.id).preparation.pinPulled,true);await assert.rejects(f.service.reconfigure(e.id,{fuseMode:'command',codeAccess:true}),/UT147/);assert.equal(event(f,e.id).programming.parameters.mode,'command');assert.equal(event(f,e.id).fuse.delay,2);
});
for(const [mode,tamperMode,delay] of [['time','command',2],['smart-time','command',0],['smart-time','command',1209600],['impact','command',null],['command','command',null],['anti-tamper','command',null],['anti-tamper','smart-time',5]])test('source fuse bounds and applicable delay: '+mode+'/'+tamperMode+'/'+delay,async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:mode,tamperMode,delay,programming:'prior'});assert.equal(e.fuse.delay,delay);await ready(f,e.id);let rolls=0;
 await f.service.release(e.id,input,{roll:async()=>{rolls++;return {total:10};}});const released=event(f,e.id);
 const timed=['time','smart-time'].includes(mode)||mode==='anti-tamper'&&tamperMode==='smart-time';assert.equal(released.dueAt,timed?delay:null);
 if(timed)await f.service.advance(delay);else await f.service.trigger(e.id);
 const done=event(f,e.id);await f.service.trigger(e.id);await f.service.release(e.id,input,{roll:async()=>{throw Error('duplicate');}});assert.deepEqual(event(f,e.id),done);assert.equal(rolls,1);
 await assert.rejects(f.service.reconfigure(e.id,{fuseMode:'impact',codeAccess:true}));
});
test('no unsupported Smart fuse, invalid delay, unrecognised preprogrammed flag or free bypass',async()=>{
 const f=fixture();for(const delay of [-1,1209601,1.5])await assert.rejects(f.service.prepare({selection,smart:true,fuseMode:'smart-time',delay}));
 await assert.rejects(f.service.prepare({selection:{id:'ht-m67'},smart:true}));await assert.rejects(f.service.prepare({selection,smart:true,fuseMode:'homing'}));await assert.rejects(f.service.prepare({selection,smart:true,fuseMode:'command',programming:'skip'}));await assert.rejects(f.service.prepare({selection,fuseMode:'command'}));
});
test('programming and arming do not need Combat; Combat changes only existing event clock',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'smart-time',delay:2,programming:'prior'});f.runtime.game.combat={id:'combat',started:true,round:1};await ready(f,e.id);await f.service.release(e.id,input,{roll:async()=>({total:10})});assert.throws(()=>f.service.advance(1));f.runtime.game.combat.round=3;await f.service.advance(0);assert.equal(event(f,e.id).state,'detonated');
});
test('old prepared Smart events retain their original Ready protocol and no implicit migration',async()=>{
 const f=fixture(),e=await f.service.prepare({selection,smart:true,fuseMode:'command'}),s=readGrenades(f.actor);delete s.events[0].programming;delete s.events[0].preparation;s.events[0].fuse.ready=3;await f.actor.setFlag('olegurps-qol','handGrenades',s);
 assert.equal(await ready(f,e.id),3);assert.equal(event(f,e.id).programming,undefined);
});
test('OWNER is rechecked for programming, cancellation and resume; Actor.system remains untouched',async()=>{
 const f=fixture(),system=structuredClone(f.actor.system),e=await f.service.prepare({selection,smart:true,fuseMode:'command'});f.actor.isOwner=false;
 for(const action of [()=>f.service.arm(e.id),()=>f.service.reconfigure(e.id,{fuseMode:'impact'}),()=>f.service.cancel(e.id),()=>f.service.resume(e.id)])await assert.rejects(action,/владельца/);assert.deepEqual(f.actor.system,system);
});
test('switching the actual assistant from Smart UT to ordinary M67 clears stale Smart state before preparation',async()=>{
 const f=fixture(),saved={theatre:true,draft:{actorId:f.actor.id,id:'ut',...selection,smart:true,fuseMode:'command'}},actors=[f.actor];actors.get=id=>actors.find(a=>a.id===id);
 const panel={querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},innerHTML:''},root={querySelector:()=>panel},dialog={close:async()=>{},element:{getBoundingClientRect:()=>({bottom:700})}};
 const globals={game:{...f.runtime.game,actors,user:{id:'owner',getFlag:()=>saved,async setFlag(){}}},Hooks:{on:()=>1,off(){}},innerHeight:1000,OleGURPSQOL:{catalogs:{...catalogs,async load(){}}}},originals=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try{for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});const c=await mountGrenadeAssistant(root,{dialog,showCalculator(){}});assert.equal(c.draft.smart,true);c.select('ht-rpg43');assert.equal(c.draft.smart,false);const fuse=/<div class="og-grenade-fuse">(.*?)<\/div>/s.exec(panel.innerHTML)?.[1];assert.equal((fuse.match(/При ударе/g)??[]).length,1);assert.doesNotMatch(fuse,/Задержка/);c.select('ht-m67');assert.equal(c.draft.smart,false);await c.run('prepare');assert.equal(c.current.profile.id,'ht-m67');assert.equal(c.current.fuse.smart,false);assert.equal(c.current.programming,undefined);await dialog.close();}
 finally{for(const [key,value]of originals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
});
