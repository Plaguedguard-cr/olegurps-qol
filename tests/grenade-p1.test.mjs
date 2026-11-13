import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {HAND_GRENADES,resolveHandGrenade,utGrenadePayloads} from '../scripts/tools/grenade-catalog.js';
import {grenadeSkills,grenadeRange,grenadeCheck,grenadeScatter,grenadeLanding} from '../scripts/tools/grenade-rules.js';
import {GrenadeService,readGrenades,grenadeInventory} from '../scripts/tools/grenade-service.js';
import {grenadeMapContext,markGrenade} from '../scripts/tools/grenade-map.js';
import {grenadeLabels,grenText} from '../scripts/tools/grenade-localization.js';

const ut=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_ut_ammunition_catalog_v2_7.json',import.meta.url),'utf8'));
const weapons=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8'));
const catalogs={getVariant:(book,id)=>ut.warheads.find(p=>p.id===id)};
// Independent B277/HT192 table expectations: weight, blast, fragments, fuse.
const table={
 'bs-black-powder':[1,'3d','1d',[3,4,5]],'bs-concussion6':[1,'6d',null,[4]],'bs-fragmentation6':[1,'4d','2d',[4]],
 'bs-molotov':[1,null,null,[]],'bs-chemical':[1,null,null,[2]],'bs-concussion7':[1,'5dx2',null,[4]],'bs-fragmentation7':[1,'8d','3d',[4]],
 'bs-stun':[1,null,null,[2]],'bs-plasma':[1,'6dx4',null,[2]],'lt-paper':[5,'5d',null,[]],'lt-iron':[30,'6dx4','2d',[]],
 'ht-main':[2.2,'3d','1d',[3,4,5]],'ht-stiel':[1.3,'5d',null,[4,5]],'ht-mills':[1.7,'5d-1','2d',[7]],
 'ht-mk2':[1.3,'4d+1','2d',[4,5]],'ht-mk3':[1,'8d+2',null,[4,5]],'ht-eihand':[.6,'6d+1',null,[4,5]],
 'ht-anm8':[1.8,null,null,[1,2]],'ht-anm14':[2,null,null,[1,2]],'ht-rpg43':[2.6,'6d',null,[]],
 'ht-m26':[1,'8d+2','2d',[4,5]],'ht-m34':[1.5,'2d','1d',[4,5]],'ht-m67':[.9,'9d','2d',[4,5]],
 'ht-dm51':[1,'3d+2','3d',[4,5]],'ht-dm51-bare':[.3,'5d',null,[4,5]],'ht-stun':[.5,null,null,[1,2]],
 'ht-arges':[.4,'3d-1','2d',[4,5]],'ht-stingball':[.5,'1d+1','1d-1',[2,3]]};
for(const p of HAND_GRENADES)test('book table '+p.id,()=>{
 assert.deepEqual([p.weight,p.blast?.formula??null,p.fragments?.formula??null,p.fuse.delays],table[p.id]);
 assert.ok(p.source);assert.ok(p.ready>=1);
 if(p.modeId){const e=weapons.equipment.find(e=>e.equipment_id===p.equipmentId);assert.ok(e,'exact equipment '+p.equipmentId);assert.ok(e.modes.some(m=>m.weapon_mode_id===p.modeId),'exact mode '+p.modeId);}
});
test('B226 default is full DX for area and best DX-3/Dropping-4 for individual; range bonus uses learned Throwing',()=>{
 const a={system:{attributes:{ST:{value:12},DX:{value:12}},skills:{a:{name:'Dropping',level:18}}}};
 assert.equal(grenadeSkills(a,'ground').base,12);assert.equal(grenadeSkills(a,'individual').base,14);
 a.system.skills.b={name:'Throwing',level:14};assert.equal(grenadeSkills(a).base,14);assert.equal(grenadeSkills(a).rangeBonus,2);
 assert.equal(grenadeRange({st:12,weight:1,rangeBonus:2}).max,49);
 assert.equal(grenadeRange({st:10,weight:161}).max,0);
 assert.deepEqual(grenadeRange({st:12,weight:.5,saucer:true}),{max:60,half:36,hands:1,source:'UT147'});
});
test('B414 modifiers, normal and capped square scatter, six directions, Dodge MoS',()=>{
 assert.equal(grenadeCheck({base:12,distance:10,target:'ground'}).effective,12);
 assert.equal(grenadeCheck({base:12,distance:10,target:'individual'}).effective,8);
 assert.equal(grenadeScatter({total:15,skill:12,distance:11,direction:2}).yards,3);
 assert.equal(grenadeScatter({total:15,skill:12,distance:11,special:true}).yards,6);
 const dodge=grenadeScatter({total:10,skill:14,distance:20,dodgeMargin:3,special:true});assert.equal(dodge.yards,3);assert.equal(dodge.rule,'B414-Dodge');
 assert.equal(grenadeScatter({total:4,skill:14,distance:20,dodgeMargin:3}).yards,0);
 assert.equal(grenadeScatter({total:18,skill:14,distance:20}).needsReview,true);
 assert.equal(grenadeScatter({total:17,skill:16,distance:20}).criticalFailure,false);
 assert.equal(grenadeScatter({total:17,skill:20,distance:20}).needsReview,true);
 for(let direction=1;direction<=6;direction++){const point=grenadeLanding({intended:{x:0,y:0},facing:30,scatter:{yards:3,direction}});assert.ok(Math.abs(Math.hypot(point.x,point.y)-3)<1e-8);}
});
test('UT requires explicit compatible payload/TL, excludes placed shaped charge and HEMP; TL10 bonus once',()=>{
 assert.throws(()=>resolveHandGrenade({bodyId:'hand64',tl:9},catalogs),/начинку/);
 for(const payloadId of ['shaped_charge','hemp','plasma'])assert.throws(()=>resolveHandGrenade({bodyId:'hand64',payloadId,tl:9},catalogs));
 assert.equal(resolveHandGrenade({bodyId:'hand64',payloadId:'he',tl:10},catalogs).blast.formula,'8d+8x2');
 assert.equal(resolveHandGrenade({bodyId:'mini40',payloadId:'plasma',tl:10},catalogs).blast.type,'burn');
 assert.equal(resolveHandGrenade({bodyId:'mini40',payloadId:'plasma',tl:10},catalogs).superscience,true);
 assert.equal(resolveHandGrenade({bodyId:'thimble25',payloadId:'strobe',tl:9},catalogs).blast,null);
 assert.ok(utGrenadePayloads(catalogs,'hand64',9).some(p=>p.id==='he'));
 assert.ok(utGrenadePayloads(catalogs,'thimble25',9).some(p=>p.id==='expendable_jammer'));
 assert.equal(resolveHandGrenade({bodyId:'mini40',payloadId:'emp',tl:9},catalogs).blast.formula,'1d');
 assert.equal(resolveHandGrenade('ht-m34').fragments.type,'burn');assert.equal(resolveHandGrenade('ht-m34').fragments.divisor,.2);
 assert.equal(resolveHandGrenade('ht-stingball').fragmentRadius,7);
});
function fixture(){
 const flags={};const actor={id:'actor',isOwner:true,system:{attributes:{ST:{value:12},DX:{value:12}},skills:{a:{name:'Throwing',level:16}}},
 getFlag(s,k){return flags[s]?.[k];},async setFlag(s,k,v){flags[s]??={};flags[s][k]=structuredClone(v);},async update(changes){for(const [path,value]of Object.entries(changes)){const parts=path.split('.');let p=flags;for(const k of parts.slice(1,-1))p=p[k]??={};p[parts.at(-1)]=structuredClone(value);}}};
 const runtime={game:{user:{id:'owner',isGM:false},time:{worldTime:0},combat:null}};
 const service=new GrenadeService(actor,{catalogs,runtime});return {actor,runtime,service,flags};
}
const input={base:16,distance:10,target:'ground',intended:{x:10,y:0},facing:0};
const roll=async()=>({total:10,direction:2});
async function armed(f,id='ht-m67',extra={}){const e=await f.service.prepare({selection:{id},...extra});await f.service.arm(e.id);return e.id;}
test('cancelled roll, invalid distance, permission and invalid fuses never spend',async()=>{
 const f=fixture(),id=await armed(f);const system=structuredClone(f.actor.system);
 assert.deepEqual(await f.service.release(id,input,{roll:async()=>({cancelled:true})}),{cancelled:true});
 assert.equal(readGrenades(f.actor).events[0].state,'armed');
 await assert.rejects(f.service.release(id,{...input,distance:10000},{roll}));
 await assert.rejects(f.service.prepare({selection:{id:'ht-m67'},delay:2}));
 f.actor.isOwner=false;await assert.rejects(f.service.arm(id));assert.deepEqual(f.actor.system,system);
});
test('physical loose stock and frozen result commit once, restored service cannot debit/reroll',async()=>{
 const f=fixture();await f.actor.setFlag('world','gurpsAmmoManager',{weapons:[{id:'grenades',catalogModeId:'WBxhKpTfRkp7r7qfu',totalAmmo:3,magazines:[]}]});
 const inventory=grenadeInventory(f.actor)[0];assert.equal(inventory.quantity,3);
 const id=await armed(f,'ht-m67',{inventory}),before=structuredClone(f.actor.system);
 const event=await f.service.release(id,input,{roll});assert.equal(event.spent,1);assert.equal(f.flags.world.gurpsAmmoManager.weapons[0].totalAmmo,2);
 const restored=new GrenadeService(f.actor,{runtime:f.runtime,catalogs});const again=await restored.release(id,input,{roll:async()=>{throw Error('unexpected reroll')}});
 assert.deepEqual(again,event);assert.equal(f.flags.world.gurpsAmmoManager.weapons[0].totalAmmo,2);
 event.profile.blast.formula='999d';assert.equal(readGrenades(f.actor).events[0].profile.blast.formula,'9d');assert.deepEqual(f.actor.system,before);
 await restored.advance(4);const det=readGrenades(f.actor).events[0].detonation;assert.ok(det);await restored.advance(100);assert.deepEqual(readGrenades(f.actor).events[0].detonation,det);
});
test('intent survives uncertain GGA failure; automatic retry is refused after F5',async()=>{
 const f=fixture(),id=await armed(f);await assert.rejects(f.service.release(id,input,{roll:async()=>{throw Error('transport')}}),/transport/);
 assert.equal(readGrenades(f.actor).events[0].state,'resolving');await assert.rejects(f.service.release(id,input,{roll}),/повтор запрещён/);
});
test('BS starts on arm, HT on release; Combat combatants add no seconds, rounds add one; rewind never resurrects',async()=>{
 const f=fixture(),id=await armed(f,'bs-fragmentation6');assert.equal(readGrenades(f.actor).events[0].dueAt,4);
 await f.service.advance(4);assert.equal(readGrenades(f.actor).events[0].state,'detonated');
 const second=await armed(f);assert.equal(readGrenades(f.actor).events[1].dueAt,null);await f.service.release(second,input,{roll});
 f.runtime.game.combat={id:'combat',started:true,round:1,turn:0};await f.service.advance();
 f.runtime.game.combat.turn=1;await f.service.advance();assert.equal(readGrenades(f.actor).clock.elapsed,4);
 f.runtime.game.combat.round=5;await f.service.advance();assert.equal(readGrenades(f.actor).events[1].state,'detonated');
 f.runtime.game.combat.round=2;await f.service.advance();assert.equal(readGrenades(f.actor).events[1].state,'detonated');
 assert.throws(()=>f.service.advance(1),/Combat/);assert.ok(id);
});
test('theatre path never reads canvas or scene under absent, backdrop, combat-map, denied-marks contexts',async()=>{
 for(const mode of ['absent','backdrop','map','denied']){
  const f=fixture();Object.defineProperty(f.runtime,'canvas',{get(){throw Error('canvas access '+mode);}});
  Object.defineProperty(f.runtime.game,'scenes',{get(){throw Error('scene access '+mode);}});
  const id=await armed(f,'ht-anm8',{theatre:true});await f.service.release(id,input,{roll});await f.service.advance(2);
  assert.equal(readGrenades(f.actor).events[0].state,'detonated');
 }
});
test('UT programmable delay requires Smart; impact waits for confirmed hard surface, command idempotent',async()=>{
 const f=fixture(),selection={bodyId:'mini40',payloadId:'he',tl:9};
 await assert.rejects(f.service.prepare({selection,fuseMode:'smart-time',delay:5}),/Smart/);
 await assert.rejects(f.service.prepare({selection,fuseMode:'smart-time',delay:1209601,smart:true}));
 const e=await f.service.prepare({selection,fuseMode:'command',smart:true});for(let n=0;n<5;n++)await f.service.arm(e.id);assert.equal(readGrenades(f.actor).events[0].programming.readyDone,3);await f.service.release(e.id,input,{roll});
 assert.equal(readGrenades(f.actor).events[0].dueAt,null);const first=await f.service.trigger(e.id);assert.equal(first.state,'detonated');assert.deepEqual(await f.service.trigger(e.id),first);
 const i=await f.service.prepare({selection,fuseMode:'impact',smart:true});for(let n=0;n<5;n++)await f.service.arm(i.id);assert.equal(readGrenades(f.actor).events[1].programming.readyDone,3);await f.service.release(i.id,{...input,hardImpact:false},{roll});assert.equal(readGrenades(f.actor).events[1].state,'waiting');
});
test('a pending critical outcome reserves the physical unit until explicit GM accounting review',async()=>{
 const f=fixture();await f.actor.setFlag('world','gurpsAmmoManager',{weapons:[{id:'physical',catalogModeId:'WBxhKpTfRkp7r7qfu',totalAmmo:2,magazines:[]}]});
 const id=await armed(f,'ht-m67',{inventory:grenadeInventory(f.actor)[0]});
 const event=await f.service.release(id,input,{roll:async()=>({total:18,direction:3})});
 assert.equal(event.resourcePending,true);assert.equal(event.spent,0);assert.equal(f.flags.world.gurpsAmmoManager.weapons[0].totalAmmo,2);assert.equal(grenadeInventory(f.actor).length,0);
 f.runtime.game.user.isGM=true;await assert.rejects(f.service.adjudicate(id,{note:'Critical miss reviewed'}),/Сверьте/);
 const resolved=await f.service.adjudicate(id,{note:'The grenade stayed in hand, stock unchanged',released:false,resourceConfirmed:true});assert.equal(resolved.state,'armed');assert.equal(grenadeInventory(f.actor).length,1);
});
test('position corrections preserve the original outcome; in-hand BS detonation and rewind high-water are explicit',async()=>{
 const f=fixture(),id=await armed(f),event=await f.service.release(id,input,{roll});
 await f.service.correctPosition(id,{landing:{x:4,y:5},place:'GM corrected position'});await f.service.advance(4);
 const result=readGrenades(f.actor).events[0];assert.deepEqual(result.outcome,event.outcome);assert.deepEqual(result.detonation.landing,{x:4,y:5});
 const second=await armed(f,'bs-concussion6');await f.service.advance(4);assert.equal(readGrenades(f.actor).events.find(e=>e.id===second).detonation.place,'В руке персонажа');
});
test('map conversion is explicit, no scene is required for numeric results, markers honor permission and corrected coordinates',async()=>{
 let created=null;const scene={id:'scene',grid:{distance:1,units:'yd'},drawings:[],async createEmbeddedDocuments(type,data){created={type,data};return [{id:'drawing'}];}};
 const runtime={canvas:{ready:true,scene,dimensions:{size:100}},game:{user:{id:'owner',can:()=>false}}};
 assert.equal(grenadeMapContext(runtime).pixelsPerYard,100);
 const event={id:'event',actorId:'actor',theatre:false,map:{sceneId:'scene'},landing:{x:1,y:2},profile:{name:'M67'}};
 assert.equal(await markGrenade(event,runtime),null);assert.equal(created,null);
 runtime.game.user.can=()=>true;assert.equal(await markGrenade(event,runtime),'drawing');assert.equal(created.data[0].x,94);
 event.correction={landing:{x:3,y:4}};await markGrenade(event,runtime);assert.equal(created.data[0].y,394);
 runtime.canvas.scene.grid.units='m';assert.ok(Math.abs(grenadeMapContext(runtime).pixelsPerYard-91.44)<1e-8);
 runtime.canvas.scene.grid.units='unknown';assert.equal(grenadeMapContext(runtime),null);
});
test('grenade labels have ru/en resources and own UI stays Russian without consulting the Foundry locale',async()=>{
 const ru=JSON.parse(await fs.readFile(new URL('../lang/ru.json',import.meta.url),'utf8')),en=JSON.parse(await fs.readFile(new URL('../lang/en.json',import.meta.url),'utf8'));
 for(const [key,value]of Object.entries(grenadeLabels)){assert.equal(ru['OleGURPS.Grenade.'+key],value);assert.ok(en['OleGURPS.Grenade.'+key]);}
 assert.equal(grenText('Theatre'),'Театр разума');
});
test('Saucer uses UT147 range and B270 ST shortage once on a clean generic Throwing skill',async()=>{
 const f=fixture(),event=await f.service.prepare({selection:{bodyId:'saucer40',payloadId:'he',tl:9}});
 await f.service.arm(event.id);
 const result=await f.service.release(event.id,{base:12,st:4,distance:10,target:'ground'},{roll:async check=>{
  assert.equal(check.handlingPenalty,-1);assert.equal(check.effective,11);return {total:10,direction:1};
 }});
 assert.equal(result.outcome.range.max,20);assert.equal(result.profile.requiredST,5);
});
test('Dodge after a completed throw uses defense margin without rewriting the attack or spending again',async()=>{
 const f=fixture();await f.actor.setFlag('world','gurpsAmmoManager',{weapons:[{id:'physical',catalogModeId:'WBxhKpTfRkp7r7qfu',totalAmmo:2,magazines:[]}]});
 const id=await armed(f,'ht-m67',{inventory:grenadeInventory(f.actor)[0]});
 const original=await f.service.release(id,{...input,base:20,target:'individual'},{roll});
 const defended=await f.service.applyDodge(id,3,{directionRoll:async()=>2});
 assert.deepEqual(defended.outcome,original.outcome);assert.equal(defended.defense.scatter.yards,3);assert.equal(defended.defense.scatter.dodgeMargin,3);
 assert.equal(f.flags.world.gurpsAmmoManager.weapons[0].totalAmmo,1);
 assert.deepEqual(await f.service.applyDodge(id,3,{directionRoll:async()=>{throw Error('duplicate direction roll')}}),defended);
 await f.service.advance(4);const final=readGrenades(f.actor).events[0];assert.deepEqual(final.detonation.landing,defended.defense.landing);assert.deepEqual(final.landing,original.landing);
});
test('post-attack Dodge is rejected for ground, critical success and a different already-recorded margin',async()=>{
 const f=fixture(),ground=await armed(f);await f.service.release(ground,input,{roll});
 await assert.rejects(f.service.applyDodge(ground,2,{directionRoll:async()=>1}));
 const critical=await armed(f);await f.service.release(critical,{...input,target:'individual'},{roll:async()=>({total:4,direction:1})});
 await assert.rejects(f.service.applyDodge(critical,2,{directionRoll:async()=>1}));
 const ordinary=await armed(f);await f.service.release(ordinary,{...input,base:20,target:'individual'},{roll});
 await f.service.applyDodge(ordinary,2,{directionRoll:async()=>1});await assert.rejects(f.service.applyDodge(ordinary,3,{directionRoll:async()=>1}),/уже зафиксирован/);
 assert.throws(()=>f.service.applyDodge(ordinary,-1));
});
test('B65-66 Lifting ST does not increase the ST or BL used for throwing distance',()=>{
 const f=fixture();f.actor.system.ads={lift:{name:'Lifting ST',level:8}};
 const skills=grenadeSkills(f.actor);assert.equal(skills.st,12);
 assert.ok(Math.abs(grenadeRange({st:skills.st,weight:30,rangeBonus:skills.rangeBonus}).max-5.6)<1e-8);
});
