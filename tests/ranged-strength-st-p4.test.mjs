import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { LT_ARTILLERY_PROFILES } from '../scripts/lt-artillery-source.js';
import { ltArtilleryCocking, ltArtilleryLoadError } from '../scripts/tools/lt-artillery.js';
import { ltEarlySlots } from '../scripts/tools/lt-early-firearms.js';
import { LT_PERSONAL_PROFILES, ltPersonalAmmoId, ltPersonalProfile } from '../scripts/lt-personal-source.js';
import { StandaloneWeaponService, StandaloneWeaponDraft, standaloneAmmoCarrier } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { resolveRuntimeAttackProfile, withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import { createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { ammoTypeKey } from '../scripts/tools/ammo-inventory.js';
import { FireService } from '../scripts/tools/fire-service.js';
import { createFireControlContext } from '../scripts/tools/fire-control-context.js';
import { basicStrengthDamage } from '../scripts/tools/gurps-strength-damage.js';
import { bindingForGoverningSkill, listRangedGoverningSkills } from '../scripts/tools/ranged-governing-skill-service.js';
import { setAttackOverride, applyAttackOverride } from '../scripts/tools/weapon-attack-overrides.js';
import { parseWeaponStrength } from '../scripts/tools/weapon-strength-resolver.js';
import { resolveRangedWeaponStrength, rangedStrengthExplanation } from '../scripts/tools/ranged-weapon-strength.js';

globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,targets:new Set()},settings:{get:()=>null},i18n:{lang:'ru'}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:new AmmunitionCompatibilityService(catalogs),weaponCatalogBindings:{analyzeMode:actor=>actor.binding}};
const knife='W9_OmSPoA9CK9Ge1M',axe='WhuLczmoJXSQgBzGz',spear='Wu1wX2lpPMDtA5FNi',ballista='W5TNQWnLaM0EvaZwK',cheiro='WvGuW2iUJrxKGNrHM';
function bucket(entries=[]){const list=structuredClone(entries);globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:list},addModifier:(value,desc,_u,tagged)=>list.push({modint:value,desc,tagged:!!tagged}),clear:()=>{list.length=0;},applyMods:async()=>{const result=structuredClone(list);list.length=0;return result;}},SetLastActor(){},setLastTargetedRoll(){}};return list;}
async function fixture(id=knife,st=5){
 bucket();const mode=catalogs.getMode(id),eq=catalogs.getEquipmentForMode(id),flags={};
 const actor={id:'actor',isOwner:true,flags,items:{contents:[]},system:{attributes:{ST:{value:st,import:st},DX:{value:16},IQ:{value:16}},swing:basicStrengthDamage(st,'swing'),thrust:basicStrengthDamage(st,'thrust'),skills:{}},getFlag(s,k){return structuredClone(flags[s]?.[k]);},async setFlag(s,k,v){flags[s]??={};flags[s][k]=structuredClone(v);}};
 for(const rule of [mode.governing_skill?.skill,...(mode.defaults??[]).filter(s=>s.type==='skill')].filter(Boolean))actor.system.skills[rule.name+(rule.specialization??'')]={name:rule.name+(['Gunner','Artillery'].includes(rule.name)?'/TL'+LT_ARTILLERY_PROFILES[id].tl:'')+(rule.specialization?' ('+rule.specialization+')':''),level:16,import:16,points:4};
 const draft=new StandaloneWeaponDraft({actor,catalogs,type:'ranged'});draft.selectModel(eq.equipment_id);draft.modeIds=new Set([id]);
 const record=await new StandaloneWeaponService(actor,catalogs).save(draft),weapon=standaloneAmmoCarrier(record),art=LT_ARTILLERY_PROFILES[id];
 if(art)weapon.ltEarly.settings={...weapon.ltEarly.settings,setupReady:true,mountReady:true,visionReady:true,procedureReady:true,crew:1+art.additionalCrew,cocking:'crank'};
 await actor.setFlag('world','gurpsAmmoManager',{version:10,weapons:[weapon],attackOverrides:{},shotReceipts:{}});
 const service=new AmmoService(actor),current=()=>actor.getFlag('world','gurpsAmmoManager').weapons[0],raw=()=>readStandaloneAttack(actor,record.id,id);
 const tx=(op,args,type)=>service.inventoryTransaction(weapon.id,op,args,type?{allowedTypes:()=>[type]}:{});
 const ammoId=art?(art.ammunition.find(a=>['stone','bolt'].includes(a.kind))??art.ammunition[0]).id:id==='Wt63kR2Ebkr9chL4b'?'lt_shaped_sling_stone_lt76':ltPersonalAmmoId(ltPersonalProfile(id));
 const type={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:catalogs.getAmmoItem('lt',ammoId)?.name};
 if(art)type.recipe={version:1,variantId:'lt_artillery_load',customId:'p4-load',parameters:{accounting:'components',loading:'mechanical',powder:null,powderQuality:'normal',massFactor:1,fit:{equipmentId:eq.equipment_id,weaponId:weapon.id,barrels:[0]}}};
 type.key=ammoTypeKey(type);
 async function load(){if(type.recipe)await tx('save-recipe',{type},type);await tx('add-stock',{ammoKey:type.key,amount:3},type);await tx('load',{magazineId:current().ammunitionInventory.installedId,ammoKey:type.key,amount:1},type);if(art)await tx('lt-early-configure',{settings:{...current().ltEarly.settings,ignitionReady:true}});}
 const profile=()=>resolveRuntimeAttackProfile({actor,attack:raw()});
 const fire=new FireService({actor}),context=createFireControlContext({token:{actor},fireService:fire,mode:'weapon'});
 const details=(attack=raw())=>context.calculateEffectiveFireSkillDetails(withRuntimeAmmoStats(attack,actor),{rangeIndex:0,shots:1,rofMode:0,aimSeconds:0,manualModifier:0,visibility:{mode:'normal'}},[{max:2,penalty:0}],null);
 const proof=()=>({actorId:actor.id,instanceId:record.id,equipmentId:eq.equipment_id,modeId:id,scope:'base-level',source:'controlled-P4'});
 const setST=value=>{actor.system.attributes.ST={value,import:value};actor.system.swing=basicStrengthDamage(value,'swing');actor.system.thrust=basicStrengthDamage(value,'thrust');};
 return {actor,record,weapon,current,raw,profile,fire,details,proof,service,tx,type,load,setST};
}

for(const [st,target,formula,range]of [[5,15,'1d-4 imp','4/7.5'],[6,16,'1d-4 imp','4.8/9'],[7,16,'1d-3 imp','5.6/10.5']])test('Large Knife exact thrown ST'+st+' -> '+target,async()=>{
 const f=await fixture(knife,st);await f.load();const p=f.profile(),e=p.weaponStrength;
 assert.equal(p.damage.nativeSafe,true,p.damage.reason);assert.equal(e.scope,'thrown');assert.equal(e.weaponIdentity.modeId,knife);assert.equal(e.publishedRequiredST,6);assert.equal(e.applicableST,st);assert.equal(e.provenanceStatus,'CLEAN');assert.equal(e.proposedDelta,target-16);assert.equal(f.details().effectiveSkill,target);assert.equal(p.damage.formula,formula);assert.equal(p.effective.range,range);assert.equal(e.operation.damage.value,st);assert.equal(e.operation.damage.maximumST,null);
});
for(const [id,st,target,damage,range]of [[axe,9,15,'1d cut','9/13.5'],[spear,8,15,'1d imp','8/12'],['Wt63kR2Ebkr9chL4b',5,15,'1d-3 pi','30/50']])test('individual thrown/ranged source '+id,async()=>{
 const f=await fixture(id,st);await f.load();assert.equal(f.details().effectiveSkill,target);assert.equal(f.profile().damage.formula,damage);assert.equal(f.profile().effective.range,range);
});
test('throwing damage has no melee cap or arbitrary shortage subtraction; lifting does not add damage',async()=>{
 const f=await fixture(knife,30);await f.load();assert.equal(f.profile().damage.formula,'3d imp');assert.equal(f.profile().weaponStrength.operation.damage.value,30);assert.equal(f.profile().effective.range,'24/45');
 f.setST(5);f.actor.system.ads={s:{name:'Striking ST',level:2},l:{name:'Lifting ST',level:20}};
 assert.equal(f.profile().weaponStrength.applicableST,5);assert.equal(f.profile().weaponStrength.operation.damage.value,7);assert.equal(f.profile().damage.formula,'1d-3 imp');assert.equal(f.profile().effective.range,'4/7.5');assert.equal(f.details().effectiveSkill,15);
});
test('explicit Arm ST is retained for damage/range without adding it to handling by guess',async()=>{
 const f=await fixture(knife,5);f.actor.system.ads={a:{name:'Arm ST',level:2}};await f.tx('lt-personal-configure',{configuration:{applyArmST:true}});await f.load();
 const p=f.profile();assert.equal(p.damage.formula,'1d-3 imp');assert.equal(p.effective.range,'5.6/10.5');assert.equal(p.weaponStrength.applicableST,5);assert.equal(f.details().effectiveSkill,15);
});
test('KNOWN_INCLUDED changes only the proven ST component; UNKNOWN keeps native total',async()=>{
 const f=await fixture();await f.load();const a={...f.raw(),level:15,weaponStrengthProvenance:{status:'KNOWN_INCLUDED',knownIncludedPenalty:-1,evidence:f.proof()}};
 assert.equal(f.details(a).effectiveSkill,15);assert.equal(f.details(a).combatCalculation.metadata.weaponStrength.proposedDelta,0);
 f.setST(6);assert.equal(f.details(a).effectiveSkill,16);
 a.weaponStrengthProvenance={status:'UNKNOWN'};assert.equal(f.details(a).effectiveSkill,15);assert.equal(f.details(a).combatCalculation.metadata.weaponStrength.proposedDelta,null);
});
test('Owner override and independent external Bucket survive the single ST channel',async()=>{
 const f=await fixture();await f.load();const list=bucket([{modint:2,desc:'independent'}]);const a=f.raw(),s=f.actor.getFlag('world','gurpsAmmoManager');assert.equal(setAttackOverride(s,a,{skillLevel:13,rof:'1',acc:0,scopeBonus:0,bulk:-2,rcl:null}),true);await f.actor.setFlag('world','gurpsAmmoManager',s);
 const overridden=applyAttackOverride(a,s),d=f.details(overridden);assert.equal(d.effectiveSkill,15);assert.equal(d.combatCalculation.metadata.weaponStrength.provenanceStatus,'UNKNOWN');assert.deepEqual(list,[{modint:2,desc:'independent'}]);
});
test('proven external ST is reconciled; named but unproven ST remains independent',async()=>{
 const f=await fixture();await f.load();const a=f.raw(),e=f.proof();bucket([{modint:-1,desc:'ST'}]);a.weaponStrengthProvenance={status:'CLEAN',evidence:e,externalComponents:[{id:'known',value:-1,scope:'external-channel',confirmed:true,evidence:e}]};
 assert.equal(f.details(a).effectiveSkill,15);assert.equal(f.details(a).combatCalculation.channels.find(c=>c.id==='weaponStrength').resolvedValue,0);delete a.weaponStrengthProvenance;assert.equal(f.details(a).effectiveSkill,14);
});
test('artillery skill refresh preserves an explicit Owner total and does not treat it as CLEAN',async()=>{
 const f=await fixture(ballista,8);await f.load();const a=f.raw(),s=f.actor.getFlag('world','gurpsAmmoManager');assert.equal(setAttackOverride(s,a,{skillLevel:13,rof:'1',acc:4,scopeBonus:0,bulk:-2,rcl:null}),true);await f.actor.setFlag('world','gurpsAmmoManager',s);
 const overridden=applyAttackOverride(a,s);assert.equal(f.details(overridden).effectiveSkill,13);assert.equal(f.details(overridden).combatCalculation.metadata.weaponStrength.provenanceStatus,'UNKNOWN');assert.equal(withRuntimeAmmoStats(overridden,f.actor).level,13);
});
test('native ranged row uses exact thrown skill and mode, never melee ST or imported cleanliness',async()=>{
 const f=await fixture();await f.load();const p=f.profile(),native={...f.raw().data,uuid:'native-knife',parentuuid:'one-physical-knife',level:16,import:16};f.actor.system.ranged={knife:native};
 f.actor.binding={status:'confirmed',binding:p.binding.confirmed};const a={...native,path:'system.ranged.knife',data:native,governingSkillBinding:bindingForGoverningSkill(listRangedGoverningSkills(f.actor)[0],{explicitCleanSkill:true})};
 assert.equal(f.details(a).effectiveSkill,15);assert.equal(f.details(a).combatCalculation.metadata.weaponStrength.weaponIdentity.modeId,knife);
 delete a.governingSkillBinding;assert.equal(f.details(a).effectiveSkill,16);assert.equal(f.details(a).combatCalculation.metadata.weaponStrength.provenanceStatus,'UNKNOWN');
 const before=JSON.stringify(f.actor.flags['olegurps-qol'].standaloneWeapons);f.details(a);assert.equal(JSON.stringify(f.actor.flags['olegurps-qol'].standaloneWeapons),before);assert.equal(f.actor.flags['olegurps-qol'].standaloneWeapons.weapons.length,1);
});
test('one physical knife switching melee to thrown uses exact ranged mode and rereads its own ST',async()=>{
 const f=await fixture();await f.load();const melee=catalogs.getEquipmentForMode(knife).modes.find(m=>m.combat_type==='melee'),equipmentId=catalogs.getEquipmentForMode(knife).equipment_id;assert.ok(melee);
 const native={...f.raw().data,uuid:knife,parentuuid:'physical-knife',level:16,st:'6'};f.actor.system.ranged={knife:native};f.actor.system.melee={knife:{...native,uuid:melee.weapon_mode_id,st:melee.stats.strength}};
 f.actor.binding={status:'confirmed',binding:{confirmed:true,modeId:melee.weapon_mode_id,equipmentId}};
 const before=structuredClone(f.actor.flags),m={...f.actor.system.melee.knife,path:'system.melee.knife',data:f.actor.system.melee.knife};assert.equal(resolveRuntimeAttackProfile({actor:f.actor,attack:m,context:{kind:'melee'}}).weaponStrength,undefined);
 f.actor.binding.binding.modeId=knife;const ranged={...native,st:'99',data:{...native,st:'99'},path:'system.ranged.knife',governingSkillBinding:bindingForGoverningSkill(listRangedGoverningSkills(f.actor)[0],{explicitCleanSkill:true})};
 const p=resolveRuntimeAttackProfile({actor:f.actor,attack:ranged});assert.equal(p.weaponStrength.weaponIdentity.modeId,knife);assert.equal(p.weaponStrength.publishedRequiredST,6);assert.equal(p.weaponStrength.baseRequiredST,6);assert.equal(f.details(ranged).effectiveSkill,15);assert.deepEqual(f.actor.flags,before);assert.equal(f.actor.flags['olegurps-qol'].standaloneWeapons.weapons.length,1);
});
test('fixed thrown Damage owner formula does not use thr or a melee cap',async()=>{
 const f=await fixture();const saved=f.actor.flags['olegurps-qol'].standaloneWeapons.weapons[0];saved.modes[0].overrides.damage='2d cut';await f.load();assert.equal(f.profile().damage.formula,'2d cut');assert.equal(f.profile().weaponStrength.operation.damage.kind,'fixed');f.setST(30);assert.equal(f.profile().damage.formula,'2d cut');
});
for(const [id,handling,rated]of [[ballista,7,8],['WUGC7s4EJ_mYffi3H',7,10],['WHm2NbM8FdpkrepQR',12,13],['WKpzIbv50y67GMjMq',13,15],[cheiro,9,14],['Wipc49tj5CGUW2u1Z',7,7],['WeHxrM0WiwSIkqOhR',7,10],['WdMI3ek-qxYwJ05JU',12,13]])test('exact LT83 handling and Rated ST '+id,async()=>{
 const f=await fixture(id,20);const p=f.profile().weaponStrength;assert.equal(p.publishedRequiredST,handling);assert.equal(p.ratedST,rated);assert.equal(p.applicableST,20);assert.equal(parseWeaponStrength(p.source.rawST).ratedST,rated);assert.equal(p.operation.drawing.requiredST,Math.min(10,rated));assert.equal(p.operation.drawing.value,20);
});
test('personal artillery shoots loaded fixed Damage with low handling ST despite inability to cock again',async()=>{
 const f=await fixture(ballista,8);await f.load();f.setST(6);const p=f.profile();assert.equal(p.damage.formula,'1d+2 cr');assert.equal(p.effective.range,'220/275');assert.equal(f.details().effectiveSkill,15);assert.equal(p.weaponStrength.ratedST,8);assert.equal(p.weaponStrength.operation.damage.kind,'fixed');assert.equal(p.weaponStrength.operation.damage.value,null);assert.equal(p.weaponStrength.operation.drawing.value,6);assert.match(ltArtilleryLoadError(f.current(),f.actor),/ST 8/);assert.equal(f.raw().readinessReason,null);
});
test('crank affects drawing only, uses lifting and selected arm, never Striking ST or crew as skill penalty',async()=>{
 const f=await fixture(cheiro,10);f.actor.system.ads={l:{name:'Lifting ST',level:1},a:{name:'Arm ST',level:3},s:{name:'Striking ST',level:50}};
 await f.load();assert.equal(ltArtilleryCocking(f.current(),f.actor).effectiveST,11);assert.equal(f.details().effectiveSkill,16);
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,cocking:'hand'}});assert.equal(ltArtilleryCocking(f.current(),f.actor).requiredST,14);assert.match(ltArtilleryLoadError(f.current(),f.actor),/ST 14/);assert.equal(f.details().effectiveSkill,16);
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,applyArmST:true}});assert.equal(ltArtilleryCocking(f.current(),f.actor).effectiveST,14);assert.equal(f.profile().weaponStrength.applicableST,10);assert.equal(f.profile().damage.formula,'2d+1 imp');assert.equal(f.details().effectiveSkill,16);
});
test('mounted mechanical artillery uses its own installation; no BL or hands are invented',async()=>{
 const f=await fixture('WQazt507venteh0Yq',5);await f.load();let e=f.profile().weaponStrength;assert.equal(e.scope,'mechanical-artillery');assert.equal(e.requirementIgnored,true);assert.equal(e.proposedDelta,0);assert.equal(f.details().effectiveSkill,16);assert.equal(e.support.evidence.source,'ltArtilleryConfiguration.mountReady+setupReady');
 await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,mountReady:false,setupReady:false}});e=f.profile().weaponStrength;assert.equal(e.proposedDelta,null);assert.equal(e.requirementIgnored,false);assert.match(e.reason,/BL/);assert.equal(e.operation.artillery.personalUse,'manual-BL-hands-base-LT81-82');assert.equal(e.support.confirmedType,null);
});
test('actual FireService bridge and AmmoService receipt freeze delta, damage and drawing at shot time',async()=>{
 const f=await fixture(ballista,8);await f.load();f.setST(6);const before=structuredClone(f.actor.system),d=f.details();let transmitted;
 f.fire.preparedRollExecutor=async o=>{transmitted=o;return {rolled:true,rollData:{finaltarget:o.effectiveSkill}};};
 const r=await f.service.executeShot({weaponId:f.record.id,attackId:'p4-history',prepare:()=>({amount:1,profile:f.profile()}),execute:({profile})=>f.fire.executeRangedAttack(f.raw(),{...d,attackProfile:profile,physicalShots:1,effectiveRoF:1,rcl:null})});
 assert.equal(transmitted.effectiveSkill,15);assert.equal(r.snapshot.profile.weaponStrength.transmittedDelta,-1);assert.equal(r.snapshot.profile.weaponStrength.operation.drawing.value,6);assert.equal(r.spent,1);assert.equal(ltEarlySlots(f.current())[0].rounds,0);assert.deepEqual(f.actor.system,before);
 const frozen=JSON.stringify(r.snapshot);f.setST(20);await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,cocking:'hand',crew:4}});assert.equal(JSON.stringify(r.snapshot),frozen);assert.equal(r.snapshot.profile.damage.formula,'1d+2 cr');assert.equal(r.snapshot.profile.weaponStrength.ratedST,8);
});
test('stale artillery preparation invalidates Attack preview before any roll',async()=>{
 const f=await fixture(cheiro,14);await f.load();const d=f.details();await f.tx('lt-early-configure',{settings:{...f.current().ltEarly.settings,cocking:'hand'}});await assert.rejects(f.fire.executeRangedAttack(f.raw(),{...d,physicalShots:1,effectiveRoF:1,rcl:null}),/ST/);
});
test('legacy snapshot remains readable and missing ST stays unknown, not zero',()=>{
 const s=createShotSnapshot({actorId:'a',mode:{},resource:{magazineId:'m'},ammunition:{},damage:{formula:'1d cr'}},{attackId:'legacy'});assert.equal(s.profile.damage.formula,'1d cr');assert.equal(s.profile.weaponStrength,undefined);assert.equal(parseWeaponStrength('7[8]').handlingST,null);assert.equal(parseWeaponStrength('').handlingST,null);
});
test('personal artillery distinction has ru/en resources and Russian existing details',async()=>{
 const f=await fixture(ballista,8);const e=f.profile().weaponStrength;for(const locale of ['ru','en']){const d=JSON.parse(await fs.readFile(new URL('../lang/'+locale+'.json',import.meta.url),'utf8'));for(const key of ['ArtilleryHandling','ArtilleryRated','ArtilleryPersonalManual'])assert.ok(d['OleGURPS.Strength.'+key]);game.i18n.lang=locale;assert.match(rangedStrengthExplanation(e),/ST для обращения: 7†/);assert.match(rangedStrengthExplanation(e),/Rated ST механизма: 8/);}game.i18n.lang='ru';
});
test('all 48 published personal source rows have their own exact numerical minimum and B270 boundary',()=>{
 const rows=Object.values(LT_PERSONAL_PROFILES).filter(p=>p.procedure==='ranged'&&p.stats?.strength);assert.equal(rows.length,48);
 for(const p of rows){const mode=catalogs.getMode(p.modeId),equipment=catalogs.getEquipmentForMode(p.modeId),required=Number.parseInt(p.stats.strength);assert.equal(mode.stats.strength,p.stats.strength,p.modeId);
  for(const [st,expected]of [[required-1,-1],[required,0]]){const actor={id:'source-check',system:{attributes:{ST:{value:st,import:st}}}},identity={actorId:actor.id,instanceId:'physical',equipmentId:equipment.equipment_id,modeId:p.modeId};
   const e=resolveRangedWeaponStrength({actor,catalogs,attack:{level:16,weaponStrengthProvenance:{status:'CLEAN',evidence:{...identity,scope:'base-level',source:'published-ST-data-check'}}},profile:{actorId:actor.id,weaponId:'physical',binding:{confirmed:identity},raw:{st:mode.stats.strength}}});assert.equal(e.scope,'thrown',p.modeId);assert.equal(e.proposedDelta,expected,p.modeId);}
 }
});
test('five template-derived personal extras do not gain an unproven minimum ST penalty',()=>{
 const ids=['WLTP3PilumThrown','WLTP3AngonThrown','WLTP3FootwearThrown','WLTP3CaltropThrown','WLTP3PitonThrown'];
 for(const modeId of ids){const mode=catalogs.getMode(modeId),actor={id:'a',system:{attributes:{ST:{value:1,import:1}}}},equipment=catalogs.getEquipmentForMode(modeId),identity={actorId:'a',instanceId:'one-item',equipmentId:equipment.equipment_id,modeId};
  assert.equal(parseWeaponStrength(mode.stats.strength).status,'KNOWN');const e=resolveRangedWeaponStrength({actor,catalogs,attack:{level:16,weaponStrengthProvenance:{status:'CLEAN',evidence:{...identity,scope:'base-level',source:'explicit-base'}}},profile:{actorId:'a',weaponId:'one-item',binding:{confirmed:identity},raw:{st:mode.stats.strength}}});assert.equal(e.scope,'excluded');assert.equal(e.proposedDelta,null);assert.match(rangedStrengthExplanation(e),/не подтверждена источником/);
 }
});
