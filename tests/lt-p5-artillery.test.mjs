import {LT_ARTILLERY_PROFILES as LT_EARLY_PROFILES,LT_OVERWEIGHT_RANGE,ltArtilleryFutureLoad} from '../scripts/lt-artillery-source.js';
import {ltArtilleryManifest,ltArtilleryCocking} from '../scripts/tools/lt-artillery.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';

test('P5 exact historical scope: 68 modes, 62 equipment, 47 mechanical and 21 gunpowder',()=>{
 const rows=Object.values(LT_EARLY_PROFILES);assert.equal(rows.length,68);assert.equal(new Set(rows.map(p=>p.equipmentId)).size,62);
 assert.equal(rows.filter(p=>p.mechanical).length,47);assert.equal(rows.filter(p=>p.bundle).length,6);assert.equal(rows.filter(p=>p.oneArmed).length,11);
});

test('special devices retain individual source fit and explicit delivery blockers; grape truth uses full round mass',()=>{
 assert.equal(ltArtilleryFutureLoad('WYkHC34-KuQjgMNb-','incendiary_sphere').status,'BLOCKED');
 assert.equal(ltArtilleryFutureLoad('WQazt507venteh0Yq','incendiary_sphere').status,'SOURCE_UNDETERMINED');
 assert.equal(ltArtilleryFutureLoad('W4PYHnE0if9L3zath','iron_bomb').rangeFactor,0.5);
 assert.equal(ltArtilleryFutureLoad('W4gnbkfxzHAYre3kO','paper_bomb').sourceFit,'undetermined');
});
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {LT_TEN_EYED_MODES,ltEarlyImprovisedId} from '../scripts/lt-early-firearms-source.js';
import {ltEarlySlots,ltEarlyActiveSlot,ltEarlyPowderRequirements,ltEarlyReadiness,ltEarlyTypeAssessment,initializeLTEarlyCarrier,ltEarlyDamage} from '../scripts/tools/lt-early-firearms.js';
import {duckArcCandidates,duckFootContextError,resolveDuckFootChecks} from '../scripts/tools/lt-duck-foot.js';
import {ltEarlyManagementHTML,ltEarlyPlacesHTML,captureLTEarlyInputs} from '../scripts/tools/lt-early-firearms-editor.js';
import {resolveRuntimeAttackProfile} from '../scripts/tools/attack-profile-runtime.js';
import {validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponService,StandaloneWeaponDraft,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';

globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
function actor(){return {id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{DX:{value:20},IQ:{value:20},ST:{import:14,value:14}},skills:{}},getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
async function fixture(id){
 const p=LT_EARLY_PROFILES[id],a=actor(),m=catalogs.getMode(id);
 for(const skill of [...(m.defaults??[]).filter(s=>s.type==='skill'),m.governing_skill?.skill].filter(Boolean))a.system.skills[skill.name+(skill.specialization??'')]={name:skill.name+(skill.specialization?' ('+skill.specialization+')':''),level:20,points:4};
 const definitions=new StandaloneWeaponService(a,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(p.equipmentId);draft.modeIds=new Set([id]);
 const record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);weapon.ltEarly.settings={ignitionReady:true,setupReady:true,mountReady:true,visionReady:true,procedureReady:true,crew:200,cocking:'crank'};
 await a.setFlag('world','gurpsAmmoManager',{weapons:[weapon],attackOverrides:{},shotReceipts:{}});const service=new AmmoService(a);
 const current=()=>a.flags.world.gurpsAmmoManager.weapons[0],attack=()=>readStandaloneAttack(a,record.id,current().standaloneModeId);
 const type=(parameters={},ammoId=p.ammoIds[0])=>{const t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:catalogs.getAmmoItem('lt',ammoId)?.name,recipe:{version:1,variantId:'lt_artillery_load',customId:crypto.randomUUID(),parameters:{accounting:'components',loading:p.mechanical?'mechanical':'loose',powder:p.powder,powderQuality:'normal',fit:{equipmentId:p.equipmentId,weaponId:weapon.id,barrels:Array.from({length:p.places},(_,i)=>i)},projectileMass:Math.min(p.roundMass/2,1),massFactor:1,flamingReady:true,heatedReady:true,...parameters}}};t.key=ammoTypeKey(t);return t;};
 const tx=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>[t]});
 const stock=async(t,count=20)=>{await tx('save-recipe',{type:t},t);await tx('add-stock',{ammoKey:t.key,amount:count},t);return t;};
 const components=async(t,count=20)=>{for(const r of ltEarlyPowderRequirements(p,t.recipe.parameters,t.ammoId))await tx('lt-early-component',{type:t,kind:r.kind,amount:count},t);};
 const load=async(t,slots=ltEarlySlots(current()))=>{for(const slot of slots)await tx('load',{magazineId:slot.id,ammoKey:t.key,amount:slot.capacity},t);};
 const profile=(state=a.getFlag('world','gurpsAmmoManager'),ammunition=readAttackAmmunition(state.weapons[0]),distance=50)=>resolver.resolve({actor:a,actorId:a.id,weaponId:weapon.id,attack:attack(),state,ammunition,binding:standaloneCatalogBinding(attack(),catalogs),context:{physicalDistance:distance,physicalShots:1,...(p.kind==='duck'&&distance>2?{duckArc:{version:1,widthDegrees:30,offset:0,order:'left-to-right',confirmed:true,primaryTokenId:'test-primary',otherTargets:[]}}:{})}});
 const shoot=async(attackId=crypto.randomUUID(),distance=50,execute=async()=>({rolled:true,rollData:{failure:false,rtotal:10,finaltarget:20,margin:10},messageId:'native-'+attackId}))=>{await tx('lt-early-configure',{settings:{...current().ltEarly.settings,ignitionReady:true,visionReady:true,procedureReady:true}});return service.executeShot({weaponId:weapon.id,attackId,prepare:({state,ammunition})=>({profile:profile(state,ammunition,distance),amount:1}),execute});};
 return {p,actor:a,weapon,record,definitions,service,current,attack,type,tx,stock,components,load,profile,shoot};
}

test('fresh artillery exposes every source base for preparation without granting raw loading',async()=>{
 const {displayedAmmoTypes}=await import('../scripts/tools/ammo-management-app.js');
 for(const p of Object.values(LT_EARLY_PROFILES)){
  const f=await fixture(p.modeId),types=displayedAmmoTypes(f.actor,f.current());
  assert.equal(types.filter(t=>!t.recipe).length,p.ammoIds.length,p.modeId);
  assert.ok(types.every(t=>t.requiresPreparation&&t.unavailable));assert.equal(f.current().totalAmmo,0);
 }
});

for(const p of Object.values(LT_EARLY_PROFILES))for(const ammo of p.ammunition){
 const factors=ammo.kind==='overweight'?Object.keys(LT_OVERWEIGHT_RANGE).map(Number).filter(n=>n>1):[1];
 for(const factor of factors)test(p.modeId+'/'+ammo.id+'/mass-'+factor+': complete physical path, frozen history and compact chat',async()=>{
  const f=await fixture(p.modeId),t=f.type({loading:p.mechanical?'mechanical':ammo.kind==='heated'?'cloth':'loose',massFactor:factor},ammo.id);
  const units=p.stockUnits,shots=p.containerCapacity;
  await f.stock(t,units*shots);await f.components(t,shots*2);await f.load(t);
  assert.equal(f.current().totalAmmo,units*shots,'load conserves physical stocks');
  const loaded=structuredClone(f.current()),distance=p.oneArmed?Math.max(1,Number(p.stats.range.split('/')[1])*LT_OVERWEIGHT_RANGE[factor]*0.5):10;
  const profile=f.profile(undefined,undefined,distance);assert.equal(profile.damage.nativeSafe,true,profile.damage.reason);assert.equal(f.attack().readinessReason,null);
  const result=await f.shoot(crypto.randomUUID(),distance);assert.equal(result.spent,1);assert.equal(f.current().totalAmmo,units*(shots-1));
  assert.equal(result.receipt.stockUnitsSpent,units);assert.deepEqual(f.current().ltEarly.components,loaded.ltEarly.components,'no second powder debit');
  const charge=result.receipt.ltEarlyCharges[0].charge;assert.equal(charge.stockUnits,units);assert.equal(charge.artillery.material,ammo.material);
  assert.equal(result.snapshot.profile.damage.formula,profile.damage.formula);assert.ok(Object.isFrozen(result.snapshot.profile.damage));
  const summary=ammunitionChatData(result.snapshot.profile);assert.ok(summary);assert.ok(summary.lines.length<=3);
  const saved=JSON.stringify(result.snapshot);await f.tx('lt-early-configure',{settings:{crew:1}});f.actor.system.attributes.ST.value=1;
  assert.equal(JSON.stringify(result.snapshot),saved,'history independent of live settings and ST');
 });
}

test('six bundles reject old single heavy stones, require exact counts and unload all individual stones',async()=>{
 for(const p of Object.values(LT_EARLY_PROFILES).filter(p=>p.bundle)){
  const f=await fixture(p.modeId),t=f.type();await f.stock(t,p.stockUnits-1);
  const before=JSON.stringify(f.actor.flags);await assert.rejects(f.load(t));assert.equal(JSON.stringify(f.actor.flags),before);
  await f.tx('add-stock',{ammoKey:t.key,amount:1},t);await f.load(t);assert.equal(f.current().ammunitionInventory.stocks[0].rounds,0);
  await f.tx('unload',{magazineId:ltEarlySlots(f.current())[0].id,amount:1},t);assert.equal(f.current().ammunitionInventory.stocks[0].rounds,p.stockUnits);
  const old='lt_ballista_'+p.stockUnits+'_lb_stone_lt81';assert.equal(compatibility.checkCompatibility(p.modeId,old,{book:'lt',kind:'ammo-item'}).status,'incompatible');
 }
});

test('source numeric contracts: Double Gastraphetes, Polybolos, personal lead, chain, grape and heat',async()=>{
 const d=LT_EARLY_PROFILES.WS7SJUj_6I5AIBmpi;assert.equal(d.stockUnits,2);assert.equal(d.projectileMass,2);
 const poly=LT_EARLY_PROFILES.WPbgxSlo98d3MBoQ_;assert.equal(poly.containerCapacity,20);assert.equal(poly.projectileMass,0.2);assert.equal(poly.betweenShotsReady,5);
 for(const p of Object.values(LT_EARLY_PROFILES).filter(p=>p.cannon)){
  const f=await fixture(p.modeId);
  for(const kind of ['chain','grape','heated']){
   const id=p.ammunition.find(a=>a.kind===kind).id,t=f.type({accounting:'prepared',loading:kind==='heated'?'cloth':'loose',heatedReady:true},id),damage=ltEarlyDamage({modeId:p.modeId,weapon:f.current(),type:t,catalogs});
   assert.equal(damage.nativeSafe,true,damage.reason);
   if(kind==='chain'){assert.ok(damage.formula.endsWith('(0.5) cut'));assert.equal(damage.effectiveChanges.range,p.stats.range.replaceAll(',','').split('/').map(Number).map(n=>n/2).join('/'));assert.equal(damage.rules.ltArtillery.costMultiplier,2);}
   if(kind==='grape'){assert.equal(damage.rules.projectiles.projectilesPerShot,Math.floor(p.roundMass*40));assert.equal(damage.effectiveChanges.range,'60/600');assert.equal(damage.effectiveChanges.rcl,1);}
   if(kind==='heated'){assert.equal(damage.components[1].formula,'3d burn');assert.equal(damage.rules.ltArtillery.burnDurationSeconds,30);assert.equal(damage.rules.ltArtillery.crew,3+p.additionalCrew);assert.equal(damage.rules.ltArtillery.malfDelta,-1);}
  }
 }
 for(const [id,formula] of [['W5TNQWnLaM0EvaZwK','1d+3 pi+'],['WUGC7s4EJ_mYffi3H','1d+4 pi+'],['WHm2NbM8FdpkrepQR','2d+2 pi++'],['WKpzIbv50y67GMjMq','2d+3 pi++']]){
  const f=await fixture(id),t=f.type({},f.p.ammunition.find(a=>a.kind==='lead').id),damage=ltEarlyDamage({modeId:id,weapon:f.current(),type:t,catalogs});assert.equal(damage.formula,formula);
 }
});

test('Bombard stone keeps table damage/range; metal remains source-undetermined',async()=>{
 for(const [id,damage,range,metal] of [['WX-yHEQghov5Xp29y','13d+2 pi++','80/550','lt_bombard_metal_ball_lt87'],['W3_f6uxd42Wb3ehoq','6dx5 pi++','130/740','lt_bombard_large_metal_ball_lt87']]){
  const f=await fixture(id),t=f.type(),r=ltEarlyDamage({modeId:id,weapon:f.current(),type:t,catalogs});assert.equal(r.formula,damage);assert.equal(r.effectiveChanges.range,range);
  assert.equal(compatibility.checkCompatibility(id,metal,{book:'lt',kind:'ammo-item'}).status,'undetermined');
 }
});

test('every ordinary artillery load preserves published Damage, including the already-lead Long-Range Gun',async()=>{
 for(const p of Object.values(LT_EARLY_PROFILES)){
  const f=await fixture(p.modeId),ammo=p.ammunition.find(a=>['stone','bolt','ball','bundle-stone'].includes(a.kind))??p.ammunition.find(a=>a.kind==='lead'),type=f.type({},ammo.id);
  const r=ltEarlyDamage({modeId:p.modeId,weapon:f.current(),type,catalogs});assert.equal(r.formula,p.stats.damage,p.modeId);
 }
 const f=await fixture('WrTP-ra4EWWw_9Blj'),t=f.type(),p=ltEarlyDamage({modeId:f.p.modeId,weapon:f.current(),type:t,catalogs});assert.equal(p.formula,'7d-1 pi++');assert.equal(p.rules.ltEarly.brief.length,0);
});

test('mass coefficients never escape eleven engines; incorrect fit, heated powder package, size and mass are rejected',async()=>{
 for(const p of Object.values(LT_EARLY_PROFILES)){
  const f=await fixture(p.modeId),a=p.ammunition[0];
  for(const parameters of [{fit:{equipmentId:p.equipmentId,weaponId:'foreign',barrels:[0]}},{massFactor:2},{massFactor:1.7},{projectileMass:NaN,fit:{equipmentId:'wrong',weaponId:f.weapon.id,barrels:[0]}}]){
   const t=f.type(parameters,a.id);assert.equal(ltEarlyTypeAssessment({modeId:p.modeId,type:t,catalogs,weapon:f.current()}).applicationAllowed,false);
  }
 }
 const f=await fixture('WadZ9BFUFoPATpyuT'),heated=f.p.ammunition.find(a=>a.kind==='heated');
 assert.equal(ltEarlyTypeAssessment({modeId:f.p.modeId,type:f.type({loading:'paper'},heated.id),catalogs,weapon:f.current()}).applicationAllowed,false);
});

test('personal cocking uses Lifting ST and explicit Arm ST; loaded fixed Damage ignores later ST',async()=>{
 const f=await fixture('WKpzIbv50y67GMjMq'),t=f.type();f.actor.system.attributes.ST.value=9;f.actor.system.attributes.ST.import=9;
 await f.stock(t);await assert.rejects(f.load(t),/ST 10/);
 f.actor.system.ads={a:{name:'Lifting ST',level:1},b:{name:'Arm ST',level:5}};
 assert.equal(ltArtilleryCocking(f.current(),f.actor).effectiveST,10);await f.load(t);
 const formula=f.profile().damage.formula;f.actor.system.attributes.ST.value=1;assert.equal(f.profile().damage.formula,formula);
 await f.tx('unload',{magazineId:ltEarlySlots(f.current())[0].id,amount:1},t);
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,cocking:'hand',applyArmST:true}});
 assert.equal(ltArtilleryCocking(f.current(),f.actor).effectiveST,7);
});

test('standing alongside artillery removes every Aim increment; explicit distance reaches Fire Control unchanged',async()=>{
 const f=await fixture('WVDXm1zp4eENVl-SF'),t=f.type();await f.stock(t);await f.components(t);await f.load(t);
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,standAside:true,visionReady:false}});
 const p=f.profile(),attack={...f.attack(),acc:0,scopeBonus:2,ammunitionLTEarly:p.damage.rules.ltArtillery};
 const context=createFireControlContext({token:{actor:f.actor},fireService:new FireService({actor:f.actor}),mode:'standalone'});
 const bonus=context.getFireBonuses(attack,{aimSeconds:3,braced:true,laserSight:false});assert.equal(bonus.aimBonus,0);assert.equal(bonus.bracingBonus,0);assert.equal(bonus.sightBonus,0);
 const {FirePreparationApp}=await import('../scripts/tools/fire-preparation-app.js');
 const options=FirePreparationApp.prototype.getShotOptions.call({mode:'standalone',actor:f.actor,attack,weapon:f.current(),fireState:{projectileDistance:'12.5',aimSeconds:3,braced:true,hitLocation:{zoneId:'torso'}},_getShotsValue:()=>1,rangeBands:[{index:0,max:15,penalty:-5}]});
 assert.equal(options.targetDistanceOverride,12.5);assert.equal(options.aimSeconds,0);assert.equal(options.braced,false);
 attack.ammunitionLTEarly={...attack.ammunitionLTEarly,indirect:true};
 const indirect=FirePreparationApp.prototype.getShotOptions.call({mode:'standalone',actor:f.actor,attack,weapon:f.current(),fireState:{projectileDistance:'12.5',hitLocation:{zoneId:'skull',regionId:'face'}},_getShotsValue:()=>1,rangeBands:[{index:0,max:15,penalty:-5}]});
 assert.equal(indirect.hitLocationId,'silhouette');assert.equal(indirect.hitRegionId,null);assert.equal(indirect.suppressTargetedAttack,true);
 assert.match(FirePreparationApp.prototype._buildHitLocationContent.call({attack},{}),/Точка падения/);
});

test('Vision delay is torsion-specific: six flexion engines and Cheiroballistra retain ordinary Aim',()=>{
 const rows=Object.values(LT_EARLY_PROFILES);assert.equal(rows.filter(p=>p.narrowVision).length,29);
 for(const name of ['Arbalest','Gastraphetes, Double','Gastraphetes, Mountain','Petrobolos, 5-lb.','Petrobolos, 40-lb.','Springald','Cheiroballistra, 18”'])assert.equal(rows.find(p=>p.name===name).narrowVision,false,name);
 const springald=rows.find(p=>p.name==='Springald');assert.equal(springald.singleArmConstruction,true);assert.equal(springald.oneArmed,false,'LT83 stone overweight scope excludes Springald');assert.equal(springald.indirectAvailable,false);
});

test('Heated Shot requires both cloth bags and clay atomically; crew, cancel, duplicate and OWNER guards remain authoritative',async()=>{
 const f=await fixture('WadZ9BFUFoPATpyuT'),id=f.p.ammunition.find(a=>a.kind==='heated').id,t=f.type({loading:'cloth'},id);await f.stock(t,1);
 for(const r of ltEarlyPowderRequirements(f.p,t.recipe.parameters,t.ammoId)){
  const before=JSON.stringify(f.actor.flags);await assert.rejects(f.load(t));assert.equal(JSON.stringify(f.actor.flags),before);
  await f.tx('lt-early-component',{type:t,kind:r.kind,amount:r.amount},t);
 }await f.load(t);
 const requirements=ltEarlyPowderRequirements(f.p,t.recipe.parameters,t.ammoId);assert.equal(requirements.find(r=>r.kind==='cloth').amount,2);assert.equal(requirements.find(r=>r.kind==='clay').amount,1);
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,crew:14}});assert.match(ltEarlyReadiness(f.current()),/15/);await assert.rejects(f.shoot());
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,crew:15}});
 const before=JSON.stringify(f.actor.flags);await f.service.executeShot({weaponId:f.weapon.id,attackId:'cancel',prepare:({state,ammunition})=>({amount:1,profile:f.profile(state,ammunition)}),execute:async()=>({rolled:false})});assert.equal(JSON.stringify(f.actor.flags),before);
 const result=await f.shoot('one');let called=0;await Promise.all([1,2].map(()=>f.service.executeShot({weaponId:f.weapon.id,attackId:'one',prepare:()=>{called++;},execute:()=>{called++;}})));assert.equal(called,0);assert.equal(result.spent,1);
 f.actor.isOwner=false;await assert.rejects(f.tx('lt-early-configure',{settings:{crew:99}}),/Permission/);
});

test('measured powder for a different fitted projectile mass cannot silently become a new charge',async()=>{
 const f=await fixture('WadZ9BFUFoPATpyuT'),light=f.type({projectileMass:1}),heavy=f.type({projectileMass:40});
 await f.stock(light,1);await f.components(light,1);await f.stock(heavy,1);
 const before=JSON.stringify(f.actor.flags);await assert.rejects(f.load(heavy),/мерная навеска/);assert.equal(JSON.stringify(f.actor.flags),before);
 await f.load(light);await f.tx('unload',{magazineId:ltEarlySlots(f.current())[0].id,amount:1},light);assert.equal(f.current().ltEarly.components.find(c=>c.kind==='propellant').rounds,1);
});
