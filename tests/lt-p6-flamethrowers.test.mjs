import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {LT_FLAME_PROFILES,ltFlameProfile} from '../scripts/lt-flame-source.js';
import {ltFlameCharge,ltFlameRequirements,ltFlameTypeAssessment,applyLTFlameOperation} from '../scripts/tools/lt-flame.js';
import {ltEarlyReadiness,ltEarlyShotPlan,ltEarlyDamage} from '../scripts/tools/lt-early-firearms.js';
import {StandaloneWeaponService,StandaloneWeaponDraft,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {createLTFlameBurn} from '../scripts/tools/lt-flame-burn.js';
import {ltFlameManagementHTML} from '../scripts/tools/lt-flame-editor.js';
import {shotDamageComponents} from '../scripts/tools/damage-shot-link.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {validateWeaponAttackOverride,openWeaponAttackEditor} from '../scripts/tools/weapon-attack-editor.js';
import {normalizeAttackOverride} from '../scripts/tools/weapon-attack-overrides.js';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';

globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
function actor(){return {id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{DX:{value:20},IQ:{value:20},ST:{import:14,value:14}},skills:{},ads:{}},getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
async function fixture(p){
 const a=actor(),m=catalogs.getMode(p.modeId);
 for(const skill of [...(m.defaults??[]).filter(s=>s.type==='skill'),m.governing_skill?.skill].filter(Boolean))a.system.skills[skill.name+(skill.specialization??'')]={name:skill.name+'/TL3'+(skill.specialization?' ('+skill.specialization+')':''),level:20,points:4};
 const definitions=new StandaloneWeaponService(a,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(p.equipmentId);draft.modeIds=new Set([p.modeId]);
 const record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);await a.setFlag('world','gurpsAmmoManager',{weapons:[weapon],attackOverrides:{},shotReceipts:{}});
 const service=new AmmoService(a),current=()=>a.flags.world.gurpsAmmoManager.weapons[0],attack=()=>readStandaloneAttack(a,record.id,p.modeId);
 const type=(fuel=p.fuels[0],extra={})=>{const t={source:'catalog',book:'lt',kind:'ammo-item',ammoId:p.ammoId,name:p.name,recipe:{version:1,variantId:'lt_flame_load',customId:crypto.randomUUID(),parameters:{accounting:'components',fuel,bodyMaterial:'bamboo',volumePints:2,powderLb:0.2,fragmentsLb:0.1,fragmentsMaterial:'metal',resinLb:0.05,fit:{equipmentId:p.equipmentId,weaponId:weapon.id,barrels:[0]},...extra}}};t.key=ammoTypeKey(t);return t;};
 const tx=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>t?[t]:[]});
 const setup=async(t)=>{await tx('save-recipe',{type:t},t);assert.equal(current().totalAmmo,0);await tx('add-stock',{ammoKey:t.key,amount:2},t);for(const r of ltFlameRequirements(p,t.recipe.parameters))await tx('lt-early-component',{type:t,kind:r.kind,amount:2},t);await tx('load',{magazineId:current().ammunitionInventory.installedId,ammoKey:t.key,amount:1},t);};
 const op=async(action,args={})=>{const c=ltFlameCharge(current());return tx('lt-flame-'+action,{chargeId:c?.id,revision:c?.flame.revision,...args});};
 const ready=async()=>{if(p.name==='Fire-Siphon'){
  // Focused pure check transition here; real native GGA pump checks are verified live.
  const state=a.getFlag('world','gurpsAmmoManager'),w=state.weapons[0],c=ltFlameCharge(w);await applyLTFlameOperation(w,'lt-flame-ready',{chargeId:c.id,revision:0,confirmed:true,seconds:10,crew:2,crewST:14},{catalogs,actor:a,runCheck:async()=>({rolled:true,success:true,target:14})});await a.setFlag('world','gurpsAmmoManager',state);
 }else for(let n=0;n<(p.irreversible&&p.name!=='Eruptor'?3:1);n++)await op('ready',{confirmed:true,seconds:p.system==='liquid'?10:p.system==='blowpipe'?20:1,twoHands:true});};
 const profile=(state=a.getFlag('world','gurpsAmmoManager'),ammunition=readAttackAmmunition(state.weapons[0]))=>resolver.resolve({actor:a,actorId:a.id,weaponId:weapon.id,attack:attack(),state,ammunition,binding:standaloneCatalogBinding(attack(),catalogs),context:{physicalDistance:p.jet?3:1,physicalShots:1,effectiveRoF:1}});
 const shoot=(id=crypto.randomUUID(),execute=async()=>({rolled:true,rollData:{failure:false,rtotal:10,finaltarget:20,margin:10}}))=>service.executeShot({weaponId:weapon.id,attackId:id,prepare:({state,ammunition})=>({profile:profile(state,ammunition),amount:1}),execute});
 return {p,a,record,weapon,service,current,attack,type,tx,setup,op,ready,profile,shoot};
}
test('exact six source identities, five Jets, no invented Acc/Rcl or deferred contract',()=>{
 assert.equal(Object.keys(LT_FLAME_PROFILES).length,6);
 for(const p of Object.values(LT_FLAME_PROFILES)){const m=catalogs.getMode(p.modeId);assert.equal(catalogs.getEquipmentForMode(p.modeId).equipment_id,p.equipmentId);assert.equal(m.stats.accuracy,null);assert.equal(m.stats.recoil,null);assert.equal(m.lt_ranged_contract.jetDeferred,undefined);assert.equal(m.lt_flame_contract.seconds,p.seconds);assert.equal(catalogs.getAmmoItem('lt',p.ammoId).tech_level_raw,'3');}
 assert.equal(Object.values(LT_FLAME_PROFILES).filter(p=>p.jet).length,5);
});
for(const p of Object.values(LT_FLAME_PROFILES))for(const fuel of p.fuels)for(const fragmentsMaterial of p.linked?['metal','pottery']:[null])for(const bodyMaterial of p.system==='disposable'?['bamboo','paper']:[null])for(const accounting of ['components','prepared'])test(p.name+'/'+fuel+'/'+(fragmentsMaterial??bodyMaterial??'')+'/'+accounting+': full physical path, seconds and frozen Damage',async()=>{
 const f=await fixture(p),t=f.type(fuel,{accounting,fragmentsMaterial,bodyMaterial,note:'Весь пользовательский Note',savingThrow:'Ручное условие',description:'Полное описание'});await f.setup(t);
 assert.ok(ltEarlyReadiness(f.current()));await f.ready();assert.equal(ltEarlyReadiness(f.current()),null);
 const before=structuredClone(f.current()),readyBurn=p.irreversible&&p.name!=='Eruptor'?1:0,r=await f.shoot();assert.equal(r.profile.damage.formula,p.stats.damage);assert.equal(r.spent,p.jet?0:1);assert.equal(r.receipt.ltFlame.secondsSpent,p.jet?1:0);assert.equal(r.receipt.ltFlame.after,p.seconds-readyBurn-1);
 assert.deepEqual(f.current().ltEarly.components,before.ltEarly.components);assert.equal(f.current().totalAmmo,p.jet?2:1);
 assert.equal(r.snapshot.profile.damage.rules.ltFlame.composition.fuel,fuel);assert.ok(Object.isFrozen(r.snapshot.profile.damage));
 const source={id:'source',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:{...r.snapshot,correlation:{attackMessageId:'source'}}}}};
 if(p.linked){const components=shotDamageComponents(source,{game:{messages:new Map([['source',source]])}});assert.ok(components.some(c=>c.formula==='1 pi-'));}
 const summary=ammunitionChatData(r.snapshot.profile);assert.ok(summary.lines.length<=4);assert.ok(JSON.stringify(summary).includes('Весь пользовательский Note'));
 const saved=JSON.stringify(r.snapshot);f.a.system.attributes.ST.value=1;await f.tx('lt-early-configure',{settings:{applyArmST:true}});assert.equal(JSON.stringify(r.snapshot),saved);
});
test('one physical fuel portion is moved from stock exactly once; loose auxiliaries never duplicate the mixture',async()=>{
 for(const p of Object.values(LT_FLAME_PROFILES)){
  const f=await fixture(p),t=f.type();await f.setup(t);const w=f.current(),c=ltFlameCharge(w);assert.equal(w.ammunitionInventory.stocks[0].rounds,1);assert.equal(w.ammunitionInventory.magazines[0].rounds,1);assert.equal(c.stockKind,'measured-fuel-portion');assert.equal(c.components.filter(r=>r.kind==='fuel').length,1);assert.ok(c.componentDebits.every(r=>r.kind!=='fuel'));assert.ok(w.ltEarly.components.every(r=>r.kind!=='fuel'));
  if(p.system==='disposable')assert.equal(c.componentDebits.find(r=>r.kind==='body').material,'bamboo');
  if(p.system==='liquid'){assert.equal(c.components[0].volumePints,2);assert.equal(c.components[0].publishedUnit.weightLbPerPint,1);}
  await f.tx('unload',{magazineId:w.ammunitionInventory.installedId,amount:1,chargeId:c.id,revision:c.flame.revision});assert.equal(f.current().ammunitionInventory.stocks[0].rounds,2);assert.ok(f.current().ltEarly.components.every(r=>r.rounds===2));
 }
});
test('each model rejects all foreign physical families, fuel substitutions and fitted instances',async()=>{
 for(const p of Object.values(LT_FLAME_PROFILES)){const f=await fixture(p);for(const other of Object.values(LT_FLAME_PROFILES))if(other!==p)assert.equal(compatibility.checkCompatibility(p.modeId,other.ammoId,{book:'lt',kind:'ammo-item'}).status,'incompatible');
  for(const fuel of ['greek-fire','naphtha','pine-resin','powder','powder-fragments','pitch'])assert.equal(ltFlameTypeAssessment({modeId:p.modeId,type:f.type(fuel),catalogs,weapon:f.current()}).applicationAllowed,p.fuels.includes(fuel));
  const bad=f.type();bad.recipe.parameters.fit.weaponId='foreign';assert.equal(ltFlameTypeAssessment({modeId:p.modeId,type:bad,catalogs,weapon:f.current()}).applicationAllowed,false);
  if(p.irreversible)assert.equal(ltFlameTypeAssessment({modeId:p.modeId,type:f.type(p.fuels[0],{accounting:'prepared',recovered:true,remainingSeconds:1,sourceChargeId:'previously-burning'}),catalogs,weapon:f.current()}).applicationAllowed,false);
 }
});
test('first, last and zero seconds; no repeat-ID or cancelled attack debit',async()=>{
 for(const p of Object.values(LT_FLAME_PROFILES)){const f=await fixture(p),t=f.type();await f.setup(t);await f.ready();
  const before=JSON.stringify(f.a.flags);await f.shoot('cancelled',async()=>({rolled:false}));assert.equal(JSON.stringify(f.a.flags),before);
  if(p.jet){await f.shoot('first');const after=JSON.stringify(f.a.flags);await f.shoot('first');assert.equal(JSON.stringify(f.a.flags),after);
   if(p.irreversible)await f.op('advance',{seconds:ltFlameCharge(f.current()).flame.remaining-1});else{for(let n=0;n<p.seconds-2;n++)await f.shoot();}
   assert.equal(ltFlameCharge(f.current()).flame.remaining,1);const last=await f.shoot('last');assert.equal(last.spent,1);assert.equal(last.receipt.ltFlame.after,0);
  }else await f.shoot('last');
  await assert.rejects(f.shoot('empty'));assert.ok(ltEarlyReadiness(f.current()));
 }
});
test('Fire-Lance cannot regain its device by Reload, stop, stale Ready or unload',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES).find(p=>p.system==='disposable')),t=f.type();await f.setup(t);const c=ltFlameCharge(f.current());await f.op('ready',{seconds:1,confirmed:true});
 await assert.rejects(f.tx('lt-flame-ready',{chargeId:c.id,revision:0,seconds:1,confirmed:true}));await f.op('ready',{seconds:1,confirmed:true});
 await assert.rejects(f.tx('unload',{magazineId:f.current().ammunitionInventory.installedId,amount:1,chargeId:c.id,revision:2}));await f.op('stop',{confirmed:true});
 const args={magazineId:f.current().ammunitionInventory.installedId,ammoKey:t.key,amount:1};await assert.rejects(f.tx('load',args,t));await f.tx('lt-flame-replace',args,t);assert.equal(f.current().totalAmmo,1);assert.notEqual(ltFlameCharge(f.current()).flame.deviceId,c.flame.deviceId);
});
test('liquid stop requires new preparation; measured unloading cannot refill time',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),t=f.type();await f.setup(t);await f.ready();await f.shoot();await f.op('stop',{confirmed:true});assert.ok(ltEarlyReadiness(f.current()));await f.ready();
 const c=ltFlameCharge(f.current()),args={magazineId:f.current().ammunitionInventory.installedId,amount:1,chargeId:c.id,revision:c.flame.revision};await assert.rejects(f.tx('unload',args));await f.tx('unload',{...args,remainingVolumePints:1.5});
 const residual=f.current().ammunitionInventory.stocks.find(s=>s.type.recipe.parameters.recovered);assert.equal(residual.rounds,1);assert.equal(residual.type.recipe.parameters.remainingSeconds,11);await f.tx('load',{magazineId:args.magazineId,ammoKey:residual.key,amount:1},residual.type);assert.equal(ltFlameCharge(f.current()).flame.remaining,11);
});
test('legacy loaded containers remain unloadable beside the fixed P6 place without converting their old rounds into seconds',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),t=f.type();await f.setup(t);const state=f.a.getFlag('world','gurpsAmmoManager'),w=state.weapons[0],charge=structuredClone(ltFlameCharge(w)),place=w.ammunitionInventory.installedId,old={source:'catalog',book:'lt',kind:'ammo-item',ammoId:f.p.ammoId,name:'Прежнее топливо',note:'Сохранить'};old.key=ammoTypeKey(old);
 w.ammunitionInventory.stocks.push({key:old.key,type:old,rounds:5});w.ammunitionInventory.magazines.push({id:'legacy',weaponId:w.id,capacity:12,rounds:3,ammoKey:old.key,ltEarlyLegacy:true});await f.a.setFlag('world','gurpsAmmoManager',state);
 await assert.rejects(f.tx('install',{magazineId:'legacy'}));await f.tx('unload',{magazineId:'legacy',amount:3});assert.equal(f.current().ammunitionInventory.stocks.find(s=>s.key===old.key).rounds,8);assert.deepEqual(ltFlameCharge(f.current()),charge);
 const legacySelected=f.a.getFlag('world','gurpsAmmoManager');legacySelected.weapons[0].ammunitionInventory.installedId='legacy';await f.a.setFlag('world','gurpsAmmoManager',legacySelected);await f.tx('install',{magazineId:place});assert.equal(ltFlameCharge(f.current()).flame.remaining,12);
});
test('all six UI views are Russian, keep Note and distinguish resources',async()=>{
 for(const p of Object.values(LT_FLAME_PROFILES)){const f=await fixture(p),t=f.type(),html=ltFlameManagementHTML(f.current(),{ammoKey:t.key},[t],v=>String(v));assert.ok(html.includes('Физическая партия'));assert.ok(html.includes('Сохранить новую партию с запасом 0'));assert.ok(!html.includes('магазин'));assert.ok(html.includes('Note / содержимое'));}
});
test('pump failures and cancellation do not spend fuel; recharge needs time and an actual successful check',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES).find(p=>p.name==='Fire-Siphon')),t=f.type();await f.setup(t);const w=f.current(),c=ltFlameCharge(w),before=JSON.stringify(w),args={chargeId:c.id,revision:0,confirmed:true,seconds:10,crew:2,crewST:14};
 assert.deepEqual(await applyLTFlameOperation(w,'lt-flame-ready',args,{catalogs,actor:f.a,runCheck:async()=>({rolled:false})}),{cancelled:true});assert.equal(JSON.stringify(w),before);
 await applyLTFlameOperation(w,'lt-flame-ready',args,{catalogs,actor:f.a,runCheck:async()=>({rolled:true,success:false})});assert.equal(c.flame.remaining,60);assert.equal(c.flame.stage,'loaded');assert.equal(c.flame.checks.length,1);
 for(const p of Object.values(LT_FLAME_PROFILES).filter(p=>p.rechargeSeconds)){
  const g=await fixture(p),t=g.type();await g.setup(t);await g.ready();await g.op('advance',{seconds:ltFlameCharge(g.current()).flame.remaining});const w=g.current();
  await assert.rejects(g.op('recharge',{seconds:p.rechargeSeconds-1}));
  await applyLTFlameOperation(w,'lt-flame-recharge',{seconds:p.rechargeSeconds,confirmed:true,expectedRevision:0},{catalogs,actor:g.a,runCheck:async()=>({rolled:true,success:false})});assert.equal(w.ltEarly.flameRecharge,null);
  await assert.rejects(g.tx('load',{magazineId:w.ammunitionInventory.installedId,ammoKey:t.key,amount:1},t));
  await applyLTFlameOperation(w,'lt-flame-recharge',{seconds:p.rechargeSeconds,confirmed:true,expectedRevision:1},{catalogs,actor:g.a,runCheck:async()=>({rolled:true,success:true,messageId:'native-check'})});
  await g.tx('load',{magazineId:w.ammunitionInventory.installedId,ammoKey:t.key,amount:1},t);assert.equal(ltFlameCharge(g.current()).flame.remaining,p.seconds);assert.equal(g.current().ltEarly.flameRecharge,null);
 }
});
test('ST comes from common ST and explicitly selected Arm ST, without Striking/Lifting additions',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),t=f.type();await f.setup(t);f.a.system.ads={a:{name:'Striking ST',level:10},b:{name:'Lifting ST',level:9},c:{name:'Arm ST',level:2}};
 assert.equal(f.profile().damage.rules.ltFlame.strength.effective,14);await f.tx('lt-early-configure',{settings:{applyArmST:true}});assert.equal(f.profile().damage.rules.ltFlame.strength.effective,16);assert.equal(f.profile().effective.range,'8/16');
 f.a.isOwner=false;const saved=JSON.stringify(f.a.flags);await assert.rejects(f.tx('lt-flame-ready',{confirmed:true,seconds:10}));await assert.rejects(f.shoot());assert.equal(JSON.stringify(f.a.flags),saved);
});
test('a native bound ST-range does not retain an old numerical GGA range after a temporary ST adjustment',async()=>{
 for(const p of Object.values(LT_FLAME_PROFILES).filter(p=>p.stats.range.startsWith('x'))){
  const f=await fixture(p),t=f.type();await f.setup(t);await f.a.setFlag('olegurps-qol','strengthAdjustments',{version:1,revision:1,modifiers:{st:2}});
  const r=ltEarlyDamage({modeId:p.modeId,actor:f.a,raw:{damage:'9d burn',range:p.system==='liquid'?'7/14':'2.8'},attack:{},weapon:f.current(),type:t,catalogs});assert.equal(r.effectiveChanges.range,p.system==='liquid'?'8/16':'3.2');assert.equal(r.formula,'9d burn');
  const manual=ltEarlyDamage({modeId:p.modeId,actor:f.a,attack:{ltEarlyOverrides:{range:'20'}},weapon:f.current(),type:t,catalogs});assert.equal(manual.effectiveChanges.range,'20');
 }
});
test('P6 Jet ignores ranged distance/speed bands, Aim, bracing and optics without invented Acc/Rcl',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),t=f.type();await f.setup(t);await f.ready();const attack=withRuntimeAmmoStats(f.attack(),f.a,f.a.getFlag('world','gurpsAmmoManager'));
 const token={id:'jet',actor:f.a},context=createFireControlContext({token,fireService:new FireService({actor:f.a,token})});
 const details=context.calculateEffectiveFireSkillDetails(attack,{shots:'1',rangeIndex:1,configuredPreview:true,aimSeconds:4,braced:true},[{index:0,max:2,penalty:0,label:'2'},{index:1,max:100,penalty:-12,label:'100+speed'}],{getSelection:()=>({zoneId:'torso',penalty:0,label:'Torso'})});
 for(const id of ['range','aim','braced'])assert.equal(details.combatCalculation.channels.find(c=>c.id===id).resolvedValue,0,id);assert.equal(attack.acc,null);assert.equal(attack.rcl,null);
});
test('the shared native attack editor saves source-inapplicable Acc as null and keeps ordinary validation strict',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),attack=f.attack(),values={skillLevel:20,rof:'Jet',bulk:-6};
 const result=validateWeaponAttackOverride(values,()=>({valid:true}),attack);assert.equal(result.valid,true);assert.equal(result.value.acc,null);assert.equal(result.value.rcl,null);assert.deepEqual(normalizeAttackOverride(JSON.parse(JSON.stringify(result.value))),result.value);
 assert.equal(validateWeaponAttackOverride({...values,rof:'1',rcl:2,scopeBonus:0},()=>({valid:true}),{catalogModeId:'ordinary'}).valid,false);
 let content;const edited=await openWeaponAttackEditor({attack,parseRateOfFire:()=>({valid:true}),DialogV2:{wait:async data=>{content=data.content;return {action:'save',values};}}});assert.equal(edited.value.acc,null);assert.match(content.match(/<input[^>]+name="acc"[^>]*>/)[0],/disabled/);
});
test('Explosives Fireworks uses the common IQ-based TL defaults from B168 and B194',()=>{
 const a=actor();a.system.attributes.IQ.value=10;
 for(const [tl,expected]of [[0,5],[2,15],[3,20],[4,19],[5,17],[6,15]]){
  a.system.skills={a:{name:'Explosives/TL'+tl+' (Fireworks)',level:20,points:4}};
  const s=resolveStandaloneSkill({actor:a,record:{id:'prep',equipmentSnapshot:{tech_level:'3'}},mode:{modeId:'fireworks',overrides:{},snapshot:{governing_skill:{status:'resolved',skill:{name:'Explosives',specialization:'Fireworks'}},defaults:[{type:'iq',modifier:-5},{type:'skill',name:'Explosives',specialization:'Fireworks',modifier:0}]}}});assert.equal(s.level,expected,'TL'+tl);
 }
});
test('ongoing duration survives failed message creation, concurrent repeats and Damage history preparation',async()=>{
 const f=await fixture(Object.values(LT_FLAME_PROFILES)[0]),t=f.type();await f.setup(t);await f.ready();const attack=await f.shoot(),source={id:'initial',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:{...attack.snapshot,correlation:{attackMessageId:'initial'}}}}},original=JSON.stringify(source),weapons=JSON.stringify(f.current());
 let rolls=0,creates=0;const messages=new Map(),runtime={game:{...game,actors:new Map([[f.a.id,f.a]]),messages},GURPS:{gurpslink:x=>x},Roll:{create:()=>({evaluate:async()=>{rolls++;return {total:4,toJSON:()=>({formula:'1d6',total:4})};}}),fromJSON:JSON.parse},ChatMessage:{getSpeaker:()=>({actor:f.a.id}),create:async data=>{if(++creates===1)throw Error('Temporary failure');const message={id:'burn',flags:data.flags,async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};messages.set(message.id,message);return message;}}};
 await assert.rejects(createLTFlameBurn(source,{runtime}));const [a,b]=await Promise.all([createLTFlameBurn(source,{runtime}),createLTFlameBurn(source,{runtime,water:true})]);assert.equal(a.id,b.id);assert.equal(rolls,1);assert.equal(a.flags['olegurps-qol'].shotSnapshot.profile.damage.formula,'1d burn');assert.equal(JSON.stringify(source),original);assert.equal(JSON.stringify(f.current()),weapons);
 const event=a.flags['olegurps-qol'].shotSnapshot.profile.damage.rules.ltFlame.ongoingEvent;assert.equal(event.durationSeconds,4);assert.equal(event.water,false);f.a.isOwner=false;assert.throws(()=>createLTFlameBurn(source,{runtime}));
});
