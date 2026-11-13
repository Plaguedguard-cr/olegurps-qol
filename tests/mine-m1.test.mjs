import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {HT_MINES,LIMPET_BODIES,minePayloads,resolveMine} from '../scripts/tools/mine-catalog.js';
import {mineSector,mineDistance,mineDirectedAttack,normalizeMineTargets,calculateMine} from '../scripts/tools/mine-rules.js';
import {performMineOperation,readMines,canManageMine} from '../scripts/tools/mine-service.js';
import {mineLabels} from '../scripts/tools/mine-localization.js';
import {utGrenadeChoices} from '../scripts/tools/grenade-ut.js';
import {syncMineMarker,removeMineMarker} from '../scripts/tools/mine-map.js';
const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_ut_ammunition_catalog_v2_7.json',import.meta.url),'utf8'));
const catalogs={getVariant:(_b,id)=>raw.warheads.find(p=>p.id===id)};
const profile=id=>resolveMine({id},catalogs),target=(extra={})=>({id:'t',name:'Target',distance:10,elevationFeet:0,sm:0,postureModifier:0,modifier:0,dodged:0,coverChecked:true,inSector:true,blastCoverDR:0,projectileCoverDR:0,...extra});
function runtime(values=[]){
 let state={version:1,events:[]},serial=0;const messages=[],flags={};
 const gm={id:'gm',name:'GM',isGM:true,active:true},owner={id:'owner',name:'Owner',isGM:false,active:true};
 const actor={id:'actor',isOwner:true,name:'Actor',system:{attributes:{HT:{value:12},IQ:{value:10},ST:{value:10},WILL:{value:12}},HP:{max:10}},testUserPermission:u=>u.id==='gm'||u.id==='owner'};
 messages.get=id=>messages.find(m=>m.id===id);
 const rt={game:{user:gm,users:[gm,owner],actors:new Map([[actor.id,actor]]),messages,settings:{get:()=>structuredClone(state),set:async(_s,_k,v)=>{state=structuredClone(v);}}},OleGURPSQOL:{catalogs},
   renderTemplate:async(_p,data)=>'<p>'+data.rtotal+'</p>',Roll:{create:formula=>({formula,total:values.length?values.shift():10,async evaluate(){return this;}})},
   ChatMessage:{create:async data=>{const m={...data,id:'m'+ ++serial,getFlag:(s,k)=>data.flags?.[s]?.[k]};messages.push(m);return m;}},
   mineLocation:async()=>({ggaKey:'Torso',canonicalKey:'torso',label:'Torso',total:10}),mineNativeDamage:async(e,c)=>{const m=await rt.ChatMessage.create({flags:{'olegurps-qol':{mineReceipt:{eventId:e.id,key:c.id}}}});return m.id;}};
 Object.defineProperty(rt,'canvas',{get(){throw Error('canvas forbidden');}});return {rt,gm,owner,actor,messages,flags};
}
const expected={tmi35:['5dx8',null,0],ozm3:['5d','4d',5],smi35:['4dx2','4d',null],m16:['6dx2','4d',null],m86:['8d','2d',6],claymore:['6dx3',null,0],stingmore:['2d+1',null,0]};
for(const p of HT_MINES)test('HT189 exact '+p.id,()=>{assert.deepEqual([p.blast.formula,p.fragments?.formula??null,p.burstHeightFeet],expected[p.id]);assert.match(p.source,/189/);});
test('all supported UT standard-body profiles resolve with existing payload source',()=>{
 let count=0;for(const body of LIMPET_BODIES)for(const tl of [9,10,11,12])for(const payload of minePayloads(catalogs,body.id,tl)){
   const choices=utGrenadeChoices(payload.id,tl);
   const params={bodyId:body.id,tl,payloadId:payload.id,chemicalId:choices[0]?.id,swarmType:choices[0]?.id,setting:Object.keys(payload.damage_table)[0],durationValue:5,durationUnit:'minutes',message:'Stop',payloadNote:'GM handles continuation'};
   const p=resolveMine(params,catalogs);assert.equal(p.diameter,body.size);assert.match(p.name,/Limpet Mine/);assert.match(p.source,/147/);assert.equal(p.burstHeightFeet,0);assert.equal(p.tl,tl);count++;
 }assert.ok(count>150);
});
test('no dispenser, arbitrary body, SEFOP or unconfirmed 25 mm Jammer mine',()=>{for(const id of ['saucer40','missile100','dispenser'])assert.deepEqual(minePayloads(catalogs,id,12),[]);assert.throws(()=>resolveMine({bodyId:'hand64',tl:12,payloadId:'sefop'},catalogs));assert.ok(!minePayloads(catalogs,'thimble25',12).some(p=>p.id==='expendable_jammer'));});
test('UT154/155 placed shaped and HEMP preserve direct/linked/fragment separation and TL adds',()=>{
 const p=resolveMine({bodyId:'thimble25',tl:10,payloadId:'shaped_charge'},catalogs);assert.equal(p.direct.formula,'5d+5x3');assert.equal(p.direct.divisor,10);assert.equal(p.blast.formula,'2d');assert.equal(p.fragments.formula,'1d+1');
 const h=resolveMine({bodyId:'hand64',tl:11,payloadId:'hemp'},catalogs);assert.equal(h.direct.formula,'6d+6x8');assert.equal(h.blast.formula,'8d');
});
test('source constants cannot be changed by an instance',()=>{const p=profile('claymore');p.directed.pellets=1;assert.equal(profile('claymore').directed.pellets,700);assert.ok(Object.isFrozen(HT_MINES[0]));});
test('ordinary and bounding slant distances use actual height',()=>{assert.equal(mineDistance(profile('tmi35'),target({distance:4,elevationFeet:9})),5);assert.equal(mineDistance(profile('ozm3'),target({distance:0,elevationFeet:0})),5/3);assert.throws(()=>mineDistance(profile('smi35'),target()));});
test('sector is inclusive at both boundaries and normalizes north wrap',()=>{for(const a of [330,30,0,360])assert.equal(mineSector(a,0,60),true);for(const a of [30.0001,329.9999,180])assert.equal(mineSector(a,0,60),false);assert.equal(mineSector(0,350,60),true);});
test('Claymore HT189 independent numeric sequence at 10/30/100 yards',()=>{
 let remaining=700;const actual=[];for(const [distance,total]of [[10,10],[30,9],[100,7]]){const a=mineDirectedAttack(profile('claymore'),target({slantDistance:distance}),remaining,total);actual.push([a.skill,a.hits]);remaining=a.remaining;}
 assert.deepEqual(actual,[[14,5],[11,3],[8,2]]);assert.equal(remaining,690);
});
test('Stingmore own half/max range, damage, divisor and +9',()=>{const p=profile('stingmore');assert.deepEqual([p.directed.pellets,p.directed.formula,p.directed.divisor,p.directed.type,p.directed.halfDamage,p.directed.maxRange],[600,'1d-2',.2,'cr',15,75]);const a=mineDirectedAttack(p,target({slantDistance:75}),600,7);assert.equal(a.skill,8);assert.equal(a.hits,2);assert.equal(a.damageFactor,2);assert.equal(mineDirectedAttack(p,target({slantDistance:75.001}),600,3).eligible,false);let remaining=600;const rows=[];for(const[d,total]of[[15,10],[30,9],[75,7]]){const row=mineDirectedAttack(p,target({slantDistance:d}),remaining,total);rows.push([row.skill,row.hits,row.damageFactor]);remaining=row.remaining;}assert.deepEqual(rows,[[13,4,1],[11,3,2],[8,2,2]]);assert.equal(remaining,591);});
test('range boundaries are inclusive and half damage starts beyond 1/2D',()=>{const p=profile('claymore');assert.equal(mineDirectedAttack(p,target({slantDistance:270}),700,3).eligible,true);assert.equal(mineDirectedAttack(p,target({slantDistance:270.001}),700,3).eligible,false);assert.equal(mineDirectedAttack(p,target({slantDistance:55}),700,3).damageFactor,1);assert.equal(mineDirectedAttack(p,target({slantDistance:55.001}),700,3).damageFactor,2);});
test('direction does not alter circular blast',async()=>{const {rt}=runtime([108]);const r=await calculateMine(profile('claymore'),[target({inSector:false,distance:6})],{},rt);assert.equal(r.components.find(c=>c.key==='blast').value,6);assert.equal(r.targets[0].directed.hits,0);});
test('OZM immediate drop cancels fragments only',async()=>{const {rt}=runtime([30]);const r=await calculateMine(profile('ozm3'),[target({distance:0,dropImmediately:true})],{},rt);assert.equal(r.targets[0].fragments.hits,0);assert.equal(r.components[0].value,6);});
test('OZM exception never leaks to M86/M16/SMi35',async()=>{for(const id of ['m86','m16','smi35']){const {rt}=runtime([30,10,14,14,14]);const p=profile(id),r=await calculateMine(p,[target({distance:1,dropImmediately:true})],{heightFeet:p.burstHeightFeet??7},rt);assert.ok(r.targets[0].fragments.hits>0);assert.equal(r.targets[0].fragments.avoided,undefined);}});
test('cover requires explicit adjudication, never a fabricated wall result',()=>{assert.throws(()=>normalizeMineTargets(profile('ozm3'),[target({coverChecked:false})]));assert.throws(()=>normalizeMineTargets(profile('ozm3'),[target({elevationFeet:''})]));});
test('fragment cover applies only to actual random covered locations',async()=>{const {rt}=runtime([0,12,14]);const r=await calculateMine(profile('m86'),[target({distance:4,coveredLocations:['Torso'],projectileCoverDR:20})],{},rt);assert.equal(r.components.find(c=>c.key==='fragment0').value,0);assert.equal(r.components.find(c=>c.key==='fragment0').location,'Torso');for(const[coverRoll,expected]of[[3,14],[5,0]]){const f=runtime([0,12,14,coverRoll]);const r=await calculateMine(profile('m86'),[target({distance:4,partialCoveredLocations:['Torso'],projectileCoverDR:20})],{},f.rt);assert.equal(r.components.find(c=>c.key==='fragment0').value,expected);assert.equal(r.components.find(c=>c.key==='fragment0').coverRoll,coverRoll);}});
test('finite stream exhausted by large stationary nearest target',()=>{const p=profile('claymore'),a=mineDirectedAttack(p,target({slantDistance:6,sm:20,immobile:true}),700,10);assert.equal(a.hits,700);assert.equal(a.remaining,0);assert.equal(mineDirectedAttack(p,target({slantDistance:10}),a.remaining,3).hits,0);});
test('B409 close bundle uses no RoF bonus and consumes half the original load',()=>{const a=mineDirectedAttack(profile('claymore'),target({slantDistance:2}),700,8);assert.equal(a.skill,9);assert.equal(a.rapidFire,0);assert.equal(a.multiplier,350);assert.equal(a.hits,1);assert.equal(a.remaining,350);});
test('duplicate target identities, missing sector, invalid conditions rejected before rolling',()=>{assert.throws(()=>normalizeMineTargets(profile('claymore'),[target(),target()]));assert.throws(()=>normalizeMineTargets(profile('claymore'),[target({inSector:undefined})]));assert.throws(()=>normalizeMineTargets(profile('tmi35'),[target()],{atmosphere:'unknown'}));});
test('scene-less service persists placement and completes one idempotent detonation',async()=>{const f=runtime();const req={operation:'place',eventId:'mine',input:{selection:{id:'tmi35'},theatre:true}};await performMineOperation(req,f.owner,f.rt);const before=structuredClone(f.actor.system);await performMineOperation({operation:'detonate',eventId:'mine',input:{targets:[target()],atmosphere:'normal'}},f.owner,f.rt);const n=f.messages.length;assert.ok(n>=1);assert.equal(readMines(f.rt).events[0].state,'done');await performMineOperation({operation:'detonate',eventId:'mine'},f.gm,f.rt);assert.equal(f.messages.length,n);assert.deepEqual(f.actor.system,before);});
test('unauthorized user cannot place with чужой Actor or detonate someone else’s mine',async()=>{const f=runtime(),stranger={id:'stranger',isGM:false};await assert.rejects(()=>performMineOperation({operation:'place',eventId:'m',input:{selection:{id:'tmi35'},theatre:true,actorId:'actor'}},stranger,f.rt));await performMineOperation({operation:'place',eventId:'m',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);assert.equal(canManageMine(readMines(f.rt).events[0],stranger,f.rt),false);await assert.rejects(()=>performMineOperation({operation:'detonate',eventId:'m'},stranger,f.rt));});
test('native failure retains mine; persisted receipt recovers without new Damage',async()=>{const f=runtime([240]);await performMineOperation({operation:'place',eventId:'m',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);let count=0;f.rt.mineNativeDamage=async(e,c)=>{count++;await f.rt.ChatMessage.create({flags:{'olegurps-qol':{mineReceipt:{eventId:e.id,key:c.id}}}});throw Error('connection lost after create');};await assert.rejects(()=>performMineOperation({operation:'detonate',eventId:'m',input:{targets:[target({distance:1})],atmosphere:'normal'}},f.owner,f.rt));assert.equal(readMines(f.rt).events[0].state,'resolving');await performMineOperation({operation:'resume',eventId:'m'},f.owner,f.rt);assert.equal(count,1);assert.equal(readMines(f.rt).events[0].state,'done');});
test('ambiguous native failure blocks automatic retry until explicit GM recovery',async()=>{const f=runtime([240]);await performMineOperation({operation:'place',eventId:'m',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);f.rt.mineNativeDamage=async()=>{throw Error('failed');};await assert.rejects(()=>performMineOperation({operation:'detonate',eventId:'m',input:{targets:[target({distance:1})],atmosphere:'normal'}},f.owner,f.rt));await assert.rejects(()=>performMineOperation({operation:'resume',eventId:'m'},f.owner,f.rt));await assert.rejects(()=>performMineOperation({operation:'recover',eventId:'m',input:{key:'t:blast',decision:'retry',note:'checked'}},f.owner,f.rt));const e=await performMineOperation({operation:'recover',eventId:'m',input:{key:'t:blast',decision:'retry',note:'checked no application'}},f.gm,f.rt);assert.equal(e.receipts[0].state,'pending');});
test('all module mine captions have RU/EN resources',()=>{for(const [key,pair]of Object.entries(mineLabels)){assert.equal(pair.length,2,key);assert.ok(pair.every(v=>typeof v==='string'&&v.length),key);}});
test('UT153 independently fixed HE mine values and TL increase',()=>{
 for(const [bodyId,blast,fragment]of [['thimble25','4d','1d+1'],['mini40','8d','2d'],['hand64','8dx2','3d']]){
  const p=resolveMine({bodyId,tl:9,payloadId:'he'},catalogs);assert.equal(p.blast.formula,blast);assert.equal(p.fragments.formula,fragment);
 }
 assert.equal(resolveMine({bodyId:'hand64',tl:10,payloadId:'he'},catalogs).blast.formula,'8d+8x2');
});
test('every UT warhead family runs the shared calculator, including all chemical checks',async()=>{
 const families=new Set();for(const tl of [9,10,11,12])for(const p of minePayloads(catalogs,'hand64',tl)){
  if(families.has(p.id))continue;families.add(p.id);const choices=utGrenadeChoices(p.id,tl),params={bodyId:'hand64',tl,payloadId:p.id,chemicalId:choices[0]?.id,swarmType:choices[0]?.id,setting:Object.keys(p.damage_table)[0],durationValue:5,durationUnit:'minutes',message:'Stop',payloadNote:'Manual continuation'};
  const f=runtime(),mine=resolveMine(params,catalogs),effect={modifier:0,exposed:true,confirmed:true,note:'GM handles duration and subsequent turns',atmosphere:'normal',gravity:true,objectExtent:0,layers:1,strandDamage:0,fearValue:12,radiationFactor:2};
  const t=target({actorId:'actor',distance:0,effect,contact:mine.requiresContact});
  const r=await calculateMine(mine,[t],{},f.rt);assert.equal(r.targets.length,1,p.id);assert.ok(r.components.every(c=>Number.isFinite(c.value)),p.id);
  if(mine.payloadEffect?.chemical?.checks?.length)assert.equal(r.targets[0].effects.length,mine.payloadEffect.chemical.checks.length);
  for(const effect of r.targets[0].effects??[])for(const c of effect.components.filter(c=>c.radiation))assert.equal(c.rads,c.rawRads/2);
 }assert.equal(families.size,24);
 for(const payloadId of ['biochemical_aerosol','biochemical_liquid'])for(const filler of utGrenadeChoices(payloadId,12)){
  const f=runtime(),p=resolveMine({bodyId:'hand64',tl:12,payloadId,chemicalId:filler.id,payloadNote:'specified alloy / mental program'},catalogs),r=await calculateMine(p,[target({actorId:'actor',distance:0,effect:{modifier:0,exposed:true,confirmed:true,note:'GM tracks later cycles',sealedDR:0}})],{},f.rt);
  assert.ok(r.components.every(c=>Number.isFinite(c.value)),filler.id);
  if(p.payloadEffect.chemical.duration.delaySeconds>0&&p.payloadEffect.chemical.checks.length){assert.equal(r.targets[0].effects.length,0);assert.ok(r.targets[0].deferredChecks.length>0);}
 }
 const chemical=chemicalId=>resolveMine({bodyId:'hand64',tl:12,payloadId:'biochemical_aerosol',chemicalId},catalogs);
 const f=runtime([10,4]),nerve=await calculateMine(chemical('nerve'),[target({actorId:'actor',distance:0,effect:{exposed:true}})],{},f.rt);
 assert.equal(nerve.targets[0].effects.length,1);assert.equal(nerve.targets[0].deferredChecks[0].id,'residue');assert.equal(nerve.components[0].value,4);assert.equal(nerve.components[0].divisor,-1);
 const g=runtime([18,4]),paralysis=await calculateMine(chemical('paralysis'),[target({actorId:'actor',distance:0,effect:{exposed:true}})],{},g.rt);
 assert.equal(paralysis.components[0].nativeSafe,false);assert.equal(paralysis.components[0].type,'SOURCE_UNDETERMINED');
});
test('scene-less detonation without an Actor or any victims still records one event',async()=>{
 const f=runtime();f.rt.game.actors.clear();await performMineOperation({operation:'place',eventId:'empty',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);
 const e=await performMineOperation({operation:'detonate',eventId:'empty',input:{targets:[],atmosphere:'normal'}},f.owner,f.rt);assert.equal(e.state,'done');assert.equal(e.result.targets.length,0);assert.equal(f.messages.length,1);
});
test('nearer target ordering is independent of input order and uses shared pool',async()=>{
 const f=runtime([0,10,14,14,14,14,14,0,10,14,14,14]);const r=await calculateMine(profile('claymore'),[target({id:'far',distance:30}),target({id:'near',distance:10})],{},f.rt);
 assert.deepEqual(r.targets.map(t=>t.target.id),['near','far']);assert.equal(r.targets[0].directed.remaining,695);assert.equal(r.targets[1].directed.remaining,693);
});
test('water/vacuum wave falloff and cover are applied after slant distance',async()=>{
 for(const [atmosphere,value]of [['normal',20],['water',60],['vacuum',6]]){const f=runtime([240]);const r=await calculateMine(profile('tmi35'),[target({distance:4,blastCoverDR:3})],{atmosphere},f.rt);assert.equal(r.components[0].value,value-3);}
});
test('shared OWNER and GM permissions are tied to the exact actor identity',async()=>{
 const f=runtime();const e=await performMineOperation({operation:'place',eventId:'owned',input:{selection:{id:'tmi35'},theatre:true,actorId:'actor'}},f.gm,f.rt);assert.equal(canManageMine(e,f.owner,f.rt),true);assert.equal(canManageMine({...e,actorId:'missing'},f.owner,f.rt),false);
});
test('directional posture applies and effective skill below three cannot hit',()=>{const p=profile('claymore'),standing=mineDirectedAttack(p,target({slantDistance:10}),700,10),prone=mineDirectedAttack(p,target({slantDistance:10,postureModifier:-2}),700,10);assert.equal(prone.skill,standing.skill-2);assert.equal(mineDirectedAttack(p,target({slantDistance:270,sm:-10}),700,3).hits,0);});
test('placed shaped charge guarantees its contact fragment even on a failed fragment check',async()=>{const p=resolveMine({bodyId:'thimble25',tl:9,payloadId:'shaped_charge'},catalogs),f=runtime([10,50,18,4]);const r=await calculateMine(p,[target({distance:0,contact:true})],{},f.rt);assert.equal(r.targets[0].fragments.hits,1);});
test('calculation failure retains placed device without an issued effect',async()=>{const f=runtime();await performMineOperation({operation:'place',eventId:'calcfail',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);f.rt.Roll.create=()=>{throw Error('roll unavailable');};await assert.rejects(()=>performMineOperation({operation:'detonate',eventId:'calcfail',input:{targets:[target()],atmosphere:'normal'}},f.owner,f.rt));assert.equal(readMines(f.rt).events[0].state,'placed');assert.equal(f.messages.length,0);});
test('loss of elected authority stops before issuing Damage and leaves recoverable calculation',async()=>{const f=runtime();await performMineOperation({operation:'place',eventId:'failover',input:{selection:{id:'tmi35'},theatre:true}},f.owner,f.rt);f.rt.Roll.create=()=>({total:200,async evaluate(){f.gm.active=false;return this;}});await assert.rejects(()=>performMineOperation({operation:'detonate',eventId:'failover',input:{targets:[target()],atmosphere:'normal'}},f.owner,f.rt));assert.equal(readMines(f.rt).events[0].state,'calculating');assert.equal(f.messages.length,0);});
test('mine cell and arrow persist independently of grenade drawings and cleanup preserves grenade',async()=>{
 const f=runtime();f.gm.color='#ff0055';f.rt.game.users.get=id=>f.rt.game.users.find(u=>u.id===id);let serial=0;
 const grenade={id:'grenade',getFlag:(_s,k)=>k==='grenadeEvent'?'old':null},drawings=[grenade];
 const scene={id:'scene',grid:{type:0},drawings,async createEmbeddedDocuments(_kind,rows){for(const row of rows){const d={...structuredClone(row),id:'d'+ ++serial,getFlag:(s,k)=>row.flags[s]?.[k]};drawings.push(d);}return drawings.slice(-rows.length);},async deleteEmbeddedDocuments(_kind,ids){for(const id of ids){const i=drawings.findIndex(d=>d.id===id);if(i>=0)drawings.splice(i,1);}}};f.rt.game.scenes=new Map([[scene.id,scene]]);
 const event={id:'mapped',profile:profile('claymore'),userId:f.gm.id,actorId:f.actor.id,theatre:false,facing:90,map:{sceneId:'scene',x:5,y:5,pixelsPerYard:100}};
 await Promise.all([syncMineMarker(event,f.rt),syncMineMarker(event,f.rt)]);assert.equal(drawings.length,3);assert.ok(drawings.slice(1).every(d=>!d.getFlag('olegurps-qol','grenadeEvent')));await removeMineMarker(event,f.rt);assert.deepEqual(drawings,[grenade]);
});
test('source-defined bounding height cannot be overwritten; unknown height requires explicit input',async()=>{const f=runtime();await assert.rejects(()=>performMineOperation({operation:'place',eventId:'badheight',input:{selection:{id:'ozm3'},heightFeet:6,theatre:true}},f.owner,f.rt));await assert.rejects(()=>performMineOperation({operation:'place',eventId:'unknownheight',input:{selection:{id:'m16'},theatre:true}},f.owner,f.rt));const e=await performMineOperation({operation:'place',eventId:'manualheight',input:{selection:{id:'m16'},heightFeet:7,theatre:true}},f.owner,f.rt);assert.equal(e.heightFeet,7);assert.equal(e.profile.burstHeightFeet,null);});
