import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { AutomaticAmmunitionProfileService } from '../scripts/tools/automatic-ammunition-profiles.js';
import { FireService } from '../scripts/tools/fire-service.js';
import { createFireControlContext } from '../scripts/tools/fire-control-context.js';
import { resolveRuntimeAttackProfile, withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import { createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { projectAmmoInventory } from '../scripts/tools/ammo-inventory.js';
import { bindingForGoverningSkill, listRangedGoverningSkills } from '../scripts/tools/ranged-governing-skill-service.js';
import { setAttackOverride, applyAttackOverride } from '../scripts/tools/weapon-attack-overrides.js';
import { resolveRangedWeaponStrength, rangedStrengthExplanation, rangedStrengthSignature } from '../scripts/tools/ranged-weapon-strength.js';
import { bindSupportSelection, rangedSupportTypes } from '../scripts/tools/ranged-support.js';
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();
const compatibility=new AmmunitionCompatibilityService(catalogs),automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
const ak='W27s4Lm8QlkKVKUPn',glock='W1doZcasYO-1Xw3Lf',m60='WhQTP2P4KY4yewyBD',m2='WR0KjQaYwU2kPV2uB';
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,weaponCatalogBindings:{analyzeMode:a=>a.binding}};
globalThis.game={user:{id:'owner',isGM:false,targets:new Set()},settings:{get:()=>null},i18n:{lang:'ru'}};
globalThis.foundry={utils:{deepClone:structuredClone}};
function bucket(initial=[]){const list=structuredClone(initial);globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:list},addModifier:(value,desc,_unused,tagged)=>list.push({modint:value,desc,tagged:!!tagged}),clear:()=>{list.length=0;},applyMods:async()=>{const out=structuredClone(list);list.length=0;return out;}},SetLastActor(){},setLastTargetedRoll(){}};return list;}
function fixture({id=ak,st=8,level=16,explicit=true,plusP=false}={}){
 const mode=catalogs.getMode(id),eq=catalogs.getEquipmentForMode(id),raw={uuid:'native-row',name:eq.name,mode:'ST-P2',level,import:level,st:mode.stats.strength,damage:mode.raw_calc.damage,acc:mode.stats.accuracy,bulk:mode.stats.bulk,rcl:mode.stats.recoil,rof:mode.stats.rate_of_fire,range:mode.stats.range,shots:mode.stats.shots};
 const base={source:'catalog',book:'ht',kind:'ammo-item',ammoId:mode.ht_ammo_item_ids?.[0],name:'standard',key:'ordinary'},boost=automatic.prepare({modeId:id,base,variantId:'ht_plus_p'}).type;
 const weapon={id:'weapon',attackRef:{uuid:raw.uuid,path:'system.ranged.mode'},capacity:30,ammunitionInventory:{version:1,installedId:plusP?'plus':'ordinary',stocks:[{key:'ordinary',type:base,rounds:50},...(boost?[{key:boost.key,type:boost,rounds:50}]:[])],magazines:[{id:'ordinary',weaponId:'weapon',capacity:30,rounds:20,ammoKey:'ordinary'},...(boost?[{id:'plus',weaponId:'weapon',capacity:30,rounds:20,ammoKey:boost.key}]:[])]}};projectAmmoInventory(weapon);
 let state={version:10,weapons:[weapon],attackOverrides:{},governingSkills:{}};
 const actor={id:'a',isOwner:true,items:{contents:[]},system:{attributes:{ST:{value:st,import:st},DX:{value:16}},ranged:{mode:raw},skills:{one:{name:'Guns/TL8 (Rifle)',level:16,import:16,points:4},two:{name:'Guns/TL8 (Pistol)',level:16,import:16,points:4},three:{name:'Guns/TL7 (Light Machine Gun)',level:16,import:16,points:4},four:{name:'Gunner/TL6 (Machine Gun)',level:16,import:16,points:4}}},binding:{status:'confirmed',binding:{confirmed:true,modeId:id,equipmentId:eq.equipment_id}},getFlag:(s,k)=>s==='world'&&k==='gurpsAmmoManager'?structuredClone(state):undefined,setFlag:async(s,k,v)=>{assert.equal(s,'world');assert.equal(k,'gurpsAmmoManager');state=structuredClone(v);}};
 const selected=listRangedGoverningSkills(actor).find(s=>id===m60?s.name==='Guns/TL7 (Light Machine Gun)':id===m2?s.name==='Gunner/TL6 (Machine Gun)':s.specialty===(id===glock?'pistol':'rifle'));
 const attack={...raw,path:'system.ranged.mode',data:raw,governingSkillBinding:bindingForGoverningSkill(selected,{explicitCleanSkill:explicit})};
 const token={id:'t',actor},service=new FireService({actor,token}),fire=createFireControlContext({token,fireService:service}),values={rangeIndex:0,manualRangeSelected:true,shots:1,rofMode:1,aimSeconds:0,hitLocationId:'torso'},bands=[{index:0,max:2,penalty:0,label:'0-2'}],targeting={getSelection:()=>({penalty:0,label:'Torso'})};
 return {actor,attack,raw,service,weapon,token,state:()=>state,profile:()=>resolveRuntimeAttackProfile({actor,attack}),details:(extra={})=>fire.calculateEffectiveFireSkillDetails(attack,{...values,...extra},bands,targeting),install:id=>{state.weapons[0].ammunitionInventory.installedId=id;projectAmmoInventory(state.weapons[0]);}};
}
const evidence=f=>f.details().combatCalculation.metadata.weaponStrength;
for(const [st,target]of [[8,15],[9,16],[10,16]])test('AK ST'+st+' has one shared channel and target'+target,()=>{bucket();const f=fixture({st}),d=f.details();assert.equal(d.effectiveSkill,target);assert.equal(evidence(f).provenanceStatus,'CLEAN');assert.equal(evidence(f).effectiveRequiredST,9);assert.equal(d.combatCalculation.channels.filter(c=>c.id==='weaponStrength').length,1);assert.equal(d.combatCalculation.channels.some(c=>c.id==='requiredStrength'),false);});
test('pistol handling uses published ST8 without an invented two-hand reduction',()=>{bucket();const f=fixture({id:glock,st:7});assert.equal(f.details().effectiveSkill,15);assert.equal(evidence(f).effectiveRequiredST,8);});
test('+P raw9 dagger ->10 dagger once, target14, existing Damage6d-1 unchanged',()=>{bucket();const f=fixture({plusP:true}),p=f.profile(),e=evidence(f);assert.equal(p.damage.formula,'6d-1 pi');assert.equal(e.baseRequiredST,9);assert.equal(e.effectiveRequiredST,10);assert.deepEqual(e.suffixes,['\u2020']);assert.equal(e.transformation.passes,1);assert.equal(e.transformation.after,'10\u2020');assert.equal(f.details().effectiveSkill,14);assert.equal(e.proposedDelta,-2);const bad=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,damage:{...p.damage,rules:{...p.damage.rules,requiredStrength:{value:11,suffix:'\u2020'}}}}});assert.equal(bad.proposedDelta,null);const incompatible=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,damage:{...p.damage,nativeSafe:false}}});assert.equal(incompatible.proposedDelta,null);});
test('KNOWN_INCLUDED15 with proven -1 sends only -1 to reach14',()=>{bucket();const f=fixture({plusP:true,level:15,explicit:false});f.attack.weaponStrengthProvenance={status:'KNOWN_INCLUDED',knownIncludedPenalty:-1,evidence:{actorId:'a',instanceId:'weapon',modeId:ak,scope:'base-level',source:'controlled-QA-base15-includes-minus1'}};assert.equal(evidence(f).provenanceStatus,'KNOWN_INCLUDED');assert.equal(evidence(f).proposedDelta,-1);assert.equal(f.details().effectiveSkill,14);});
test('UNKNOWN native15, inferred or mismatched bindings cannot fabricate a clean base',()=>{bucket();const f=fixture({plusP:true,level:15,explicit:false});assert.equal(f.details().effectiveSkill,15);assert.equal(evidence(f).proposedDelta,null);assert.equal(evidence(f).provenanceStatus,'UNKNOWN');assert.match(evidence(f).reason,/ST/);f.attack.governingSkillBinding=bindingForGoverningSkill(listRangedGoverningSkills(f.actor).find(s=>s.specialty==='pistol'),{explicitCleanSkill:true});assert.equal(f.details().effectiveSkill,15);assert.equal(evidence(f).provenanceStatus,'UNKNOWN');f.actor.binding.binding.modeId='missing';assert.equal(f.details().effectiveSkill,15);assert.equal(evidence(f).proposedDelta,null);});
test('explicit clean skill rebuilds from16 while owner manual override preserves13',()=>{bucket();const f=fixture({level:15});assert.equal(f.details().baseSkill,16);assert.equal(f.details().effectiveSkill,15);const state=f.state();setAttackOverride(state,f.attack,{skillLevel:13,rof:'10',acc:4,scopeBonus:0,bulk:-5,rcl:'2'});f.actor.setFlag('world','gurpsAmmoManager',state);Object.assign(f.attack,applyAttackOverride(f.attack,state));assert.equal(f.details().effectiveSkill,13);assert.equal(evidence(f).provenanceStatus,'UNKNOWN');});
test('switching +P magazine back to ordinary removes transformed ST and stale overlay data',()=>{bucket();const f=fixture({plusP:true});const overlay=withRuntimeAmmoStats(f.attack,f.actor,f.state());assert.equal(overlay.ammunitionRequiredStrength.value,10);assert.equal(f.details().effectiveSkill,14);f.install('ordinary');const ordinary=withRuntimeAmmoStats(overlay,f.actor,f.state());assert.equal(ordinary.ammunitionRequiredStrength,undefined);assert.equal(ordinary.st,'9\u2020');assert.equal(ordinary.data.st,'9\u2020');assert.equal(ordinary.weaponStrength.effectiveRequiredST,9);assert.equal(f.details().effectiveSkill,15);assert.equal(f.profile().damage.formula,'5d+1 pi');});
test('exact changed mode and per-instance ST override use their own requirement',()=>{bucket();const f=fixture(),p=f.profile();const g=fixture({id:glock,st:7});assert.equal(g.profile().weaponStrength.weaponIdentity.modeId,glock);const e=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,raw:{...p.raw,st:'11'}}});assert.equal(e.effectiveRequiredST,11);assert.equal(e.proposedDelta,-3);assert.equal(e.source.overrideApplied,true);});
test('braced has its old Aim bonus and never implies a bipod reduction',()=>{bucket();const f=fixture({id:m60});const a=f.details({braced:false}),b=f.details({braced:true});assert.equal(a.combatCalculation.metadata.weaponStrength.effectiveRequiredST,12);assert.equal(b.combatCalculation.metadata.weaponStrength.effectiveRequiredST,12);assert.equal(b.combatCalculation.metadata.weaponStrength.support.braced,true);assert.equal(b.combatCalculation.metadata.weaponStrength.proposedDelta,-4);assert.equal(b.effectiveSkill,a.effectiveSkill);const aimed=f.details({braced:true,aimSeconds:1});assert.equal(aimed.combatCalculation.channels.find(c=>c.id==='braced').resolvedValue,1);});
test('B/R/M notation stays explicit; no mount/rest support is invented',()=>{bucket();const f=fixture(),p=f.profile();for(const st of ['12B\u2020','9R','16M','M']){const e=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,raw:{...p.raw,st}}});assert.equal(e.support.status,'UNSPECIFIED');assert.equal(e.requirementIgnored,false);assert.equal(e.effectiveRequiredST,st==='M'?null:Number.parseInt(st));if(st==='M')assert.equal(e.proposedDelta,null);}});
test('bow stays excluded; a Bow binding cannot prove clean Crossbow personal artillery',()=>{bucket();const f=fixture(),p=f.profile();f.actor.system.skills.bow={name:'Bow',level:18,points:4};const selected=apiBow();function apiBow(){return bindingForGoverningSkill(listRangedGoverningSkills(f.actor).find(s=>s.family==='bow'),{explicitCleanSkill:true});}for(const id of ['WqUeIOkvQIgCeKWou','W5TNQWnLaM0EvaZwK']){const e=resolveRangedWeaponStrength({actor:f.actor,attack:{...f.attack,level:13,governingSkillBinding:selected},catalogs,profile:{...p,binding:{confirmed:{modeId:id,equipmentId:catalogs.getEquipmentForMode(id).equipment_id}},raw:{st:catalogs.getMode(id).stats.strength}}});assert.equal(e.proposedDelta,null);assert.equal(e.scope,id==='W5TNQWnLaM0EvaZwK'?'personal-artillery':'excluded');assert.equal(e.baseLevel,13);assert.equal(e.provenanceStatus,'UNKNOWN');}});
test('confirmed external -1 reconciles into ST -1; an unknown ST label is never deleted',()=>{bucket([{modint:-1,desc:'Minimum ST'}]);const f=fixture({plusP:true}),proof={actorId:'a',instanceId:'weapon',modeId:ak,scope:'base-level',source:'controlled-external-contract'};f.attack.weaponStrengthProvenance={status:'CLEAN',evidence:proof,externalComponents:[{id:'st-external',value:-1,confirmed:true,scope:'external-channel',evidence:proof}]};assert.equal(f.details().effectiveSkill,14);assert.equal(f.details().combatCalculation.channels.find(c=>c.id==='weaponStrength').resolvedValue,-1);delete f.attack.weaponStrengthProvenance;assert.equal(f.details().effectiveSkill,13);assert.equal(GURPS.ModifierBucket.modifierStack.modifierList.length,1);});
test('other Aim, laser, range, manual, visibility and RF channels retain explicit values',()=>{bucket([{modint:2,desc:'external'}]);const f=fixture(),d=f.details({aimSeconds:3,braced:true,laserSight:true,manualModifier:-2,visibility:{mode:'partial',partialPenalty:-2},shots:10,rofMode:0});const c=Object.fromEntries(d.combatCalculation.channels.map(c=>[c.id,c.resolvedValue]));assert.equal(c.weaponStrength,-1);assert.equal(c.aim,6);assert.equal(c.braced,1);assert.equal(c.laser,1);assert.equal(c.modifierBucket,2);assert.equal(c.situational,-2);assert.equal(c.visibility,-2);assert.equal(c.rapidFire,2);assert.equal(d.effectiveSkill,23);});
test('FireService forwards the ST channel once and preserves the existing Bucket',async()=>{const list=bucket([{modint:2,desc:'my modifier'}]),f=fixture({plusP:true}),d=f.details();let captured;f.service.preparedRollExecutor=async options=>{captured={options,mods:structuredClone(list)};return {rolled:true,rollData:{finaltarget:options.effectiveSkill}};};const r=await f.service.executeRangedAttack(f.attack,{...d,physicalShots:1,effectiveRoF:1,rcl:2});assert.equal(r.rollData.finaltarget,16);assert.equal(r.rollData.weaponStrengthDelta,-2);assert.equal(captured.mods.filter(m=>m.desc==='\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u0430\u044f ST').length,1);assert.deepEqual(list,[{modint:2,desc:'my modifier',tagged:false}]);});
test('stale ST or selected magazine rejects an old calculation before rolling',async()=>{bucket();const f=fixture({plusP:true}),d=f.details();f.actor.system.attributes.ST.value=12;await assert.rejects(f.service.executeRangedAttack(f.attack,{...d,physicalShots:1,effectiveRoF:1,rcl:2}),/ST/);});
test('prepaid ballistics can use current handling ST without mutating the receipt profile',async()=>{bucket();const f=fixture({plusP:true}),receipt=f.profile(),encoded=JSON.stringify(receipt);f.actor.system.attributes.ST.value=9;const d=f.details();f.service.preparedRollExecutor=async o=>({rolled:true,rollData:{finaltarget:o.effectiveSkill}});const r=await f.service.executeRangedAttack(f.attack,{...d,attackProfile:receipt,resourceTiming:'suppression-prepaid',physicalShots:1,effectiveRoF:1,rcl:2});assert.equal(r.rollData.finaltarget,15);assert.equal(r.rollData.weaponStrengthDelta,-1);assert.equal(JSON.stringify(receipt),encoded);assert.equal(receipt.damage.formula,'6d-1 pi');});
test('actual AmmoService snapshot freezes transmitted delta and spends only one round',async()=>{bucket();const f=fixture({plusP:true}),d=f.details(),s=new AmmoService(f.actor),before=structuredClone(f.actor.system);f.service.preparedRollExecutor=async o=>({rolled:true,rollData:{finaltarget:o.effectiveSkill}});const r=await s.executeShot({weaponId:'weapon',attackId:'p2-test',prepare:({ammunition})=>({amount:1,profile:resolveRuntimeAttackProfile({actor:f.actor,attack:f.attack,ammunition})}),execute:({profile})=>f.service.executeRangedAttack(f.attack,{...d,attackProfile:profile,physicalShots:1,effectiveRoF:1,rcl:2})});assert.equal(r.snapshot.profile.weaponStrength.transmittedDelta,-2);assert.equal(r.spent,1);assert.equal(f.state().weapons[0].ammunitionInventory.magazines.find(m=>m.id==='plus').rounds,19);assert.deepEqual(f.actor.system,before);const frozen=JSON.stringify(r.snapshot);f.actor.system.attributes.ST.value=12;f.install('ordinary');assert.equal(JSON.stringify(r.snapshot),frozen);assert.equal(r.snapshot.profile.damage.formula,'6d-1 pi');});
test('legacy snapshots without ST metadata and locale dictionaries remain supported',async()=>{const shot=createShotSnapshot({actorId:'a',mode:{},resource:{magazineId:'m'},ammunition:{},damage:{formula:'1d pi'}},{attackId:'old'});assert.equal(shot.profile.weaponStrength,undefined);for(const lang of ['ru','en']){const d=JSON.parse(await fs.readFile(new URL('../lang/'+lang+'.json',import.meta.url),'utf8'));assert.ok(d['OleGURPS.Strength.Shortage']);assert.ok(d['OleGURPS.Strength.UnknownBase']);}});
test('runtime prone posture and invented accessory flags cannot prove bipod use',()=>{bucket();const f=fixture({id:m60});f.actor.system.conditions={posture:'prone'};f.attack.bipod=true;f.attack.mounted=true;
 const e=evidence(f);assert.equal(e.support.runtime.posture,'prone');assert.equal(e.support.confirmedType,null);assert.equal(e.effectiveRequiredST,12);assert.equal(e.proposedDelta,-4);
 assert.match(rangedStrengthExplanation(e),/использование не подтверждено/);assert.ok(e.support.runtime.missing.includes('bipod-installed-and-in-use'));
});
test('Bulk star is capability only and an arbitrary context support claim is ignored',()=>{bucket();const f=fixture(),p=f.profile();const e=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,raw:{...p.raw,bulk:'-5*'},context:{...p.context,support:{confirmedType:'mounted',confirmed:true,installed:true,inUse:true,ready:true}}}});
 assert.equal(e.support.runtime.foldingStockCapability,true);assert.equal(e.effectiveRequiredST,9);assert.equal(e.support.confirmedType,null);assert.match(rangedStrengthExplanation(e),/Положение складного приклада/);
});
test('posture changes invalidate current preview while historical snapshots stay frozen',async()=>{bucket();const f=fixture({id:m60});f.actor.system.conditions={posture:'prone'};const d=f.details(),e=d.combatCalculation.metadata.weaponStrength,shot=createShotSnapshot(f.profile(),{attackId:'posture-history'}),saved=JSON.stringify(shot);
 f.actor.system.conditions.posture='standing';assert.notEqual(rangedStrengthSignature(e),rangedStrengthSignature(evidence(f)));
 await assert.rejects(f.service.executeRangedAttack(f.attack,{...d,physicalShots:1,effectiveRoF:1,rcl:2}),/ST/);assert.equal(JSON.stringify(shot),saved);
});
test('new support hints have ru/en keys and Russian runtime under either Foundry locale',async()=>{
 for(const locale of ['ru','en']){const d=JSON.parse(await fs.readFile(new URL('../lang/'+locale+'.json',import.meta.url),'utf8'));
  for(const key of ['BipodUnconfirmed','MountUnconfirmed','RestManual','PistolGripUnconfirmed','StockUnconfirmed'])assert.ok(d['OleGURPS.Strength.'+key]);
  game.i18n.lang=locale;bucket();assert.match(rangedStrengthExplanation(evidence(fixture({id:m60}))),/Сошки/);
 }game.i18n.lang='ru';
});

test('M2 Gunner Machine Gun mode retains ST21M and transmits -13 without a proven mount',()=>{bucket();const f=fixture({id:m2}),e=evidence(f);assert.equal(e.scope,'firearm');assert.equal(e.publishedRequiredST,21);assert.equal(e.effectiveRequiredST,21);assert.equal(e.requirementIgnored,false);assert.equal(e.provenanceStatus,'CLEAN');assert.equal(e.proposedDelta,-13);assert.equal(f.details().effectiveSkill,3);assert.match(rangedStrengthExplanation(e),/установка и использование не подтверждены/);});
const selection=(f,value)=>bindSupportSelection(value,evidence(f).weaponIdentity);
test('support choices use exact published category and B/M, never a display name',()=>{
 assert.deepEqual(rangedSupportTypes(catalogs.getMode(ak)),['none']);assert.deepEqual(rangedSupportTypes(catalogs.getMode(m60)),['none','bipod']);
 assert.deepEqual(rangedSupportTypes(catalogs.getMode(m2)),['none','mounted']);assert.deepEqual(rangedSupportTypes(catalogs.getMode(glock)),['none','pistol-two-handed']);
 assert.deepEqual(rangedSupportTypes({...catalogs.getMode(ak),name:'pistol M60 bipod mount'}),['none']);
});
for(const [posture,required,target]of [['prone',8,16],['standing',12,12],['kneeling',12,12],[null,12,12]])test('selected M60 bipod with posture '+posture,()=>{
 bucket();const f=fixture({id:m60});f.actor.system.conditions={posture};const d=f.details({supportSelection:selection(f,'bipod')}),e=d.combatCalculation.metadata.weaponStrength;
 assert.equal(e.effectiveRequiredST,required);assert.equal(d.effectiveSkill,target);assert.equal(e.support.selection.source,'ShootingAssistant.support');
 assert.deepEqual(e.support.runtime.missing,posture==='prone'?[]:['prone-posture-required']);
 assert.equal(e.support.observed.posture,posture??undefined);if(posture!=='prone')assert.match(rangedStrengthExplanation(e),/положение лёжа/);
});
test('M2 mount ignores requirement while retaining source21 and removing local Bulk penalties',()=>{
 bucket();const f=fixture({id:m2}),d=f.details({supportSelection:selection(f,'mounted'),closeCombat:true}),e=d.combatCalculation.metadata.weaponStrength;
 assert.equal(e.publishedRequiredST,21);assert.equal(e.effectiveRequiredST,null);assert.equal(e.requirementIgnored,true);assert.equal(e.proposedDelta,0);
 assert.equal(e.support.effects.bulkIgnored,true);assert.equal(d.effectiveSkill,16);assert.equal(f.raw.bulk,'-9');
 assert.equal(f.details().effectiveSkill,3);
});
test('pistol ST10 two hands requires8 and effective Bulk -3 becomes-2',()=>{
 bucket();const f=fixture({id:glock}),p=f.profile();const e=resolveRangedWeaponStrength({actor:f.actor,attack:f.attack,catalogs,profile:{...p,raw:{...p.raw,st:'10',bulk:'-3'},context:{supportSelection:selection(f,'pistol-two-handed')}}});
 assert.equal(e.baseRequiredST,10);assert.equal(e.effectiveRequiredST,8);assert.equal(e.proposedDelta,0);assert.equal(e.support.effects.effectiveBulk,-2);assert.equal(e.support.effects.publishedBulk,-3);
});
for(const [aim,braced,bonus]of [[0,false,0],[0,true,0],[1,false,1],[1,true,1]])test('pistol support Aim'+aim+' checkbox'+braced+' yields one bracing '+bonus,()=>{
 bucket();const f=fixture({id:glock,st:7}),d=f.details({supportSelection:selection(f,'pistol-two-handed'),aimSeconds:aim,braced}),channels=d.combatCalculation.channels;
 assert.equal(channels.find(c=>c.id==='braced').resolvedValue,bonus);assert.equal(channels.filter(c=>c.id==='braced').length,1);assert.equal(d.combatCalculation.metadata.weaponStrength.effectiveRequiredST,7);
});
test('supported pistol close-combat uses improved Bulk without changing the raw weapon',()=>{
 bucket();const f=fixture({id:glock,st:8}),normal=f.details({closeCombat:true}),supported=f.details({closeCombat:true,supportSelection:selection(f,'pistol-two-handed')});
 assert.equal(supported.effectiveSkill,normal.effectiveSkill+1);assert.equal(f.raw.bulk,'-2');
});
test('bipod and mount Aim share the existing braced channel with checkbox',()=>{
 bucket();for(const id of [m60,m2]){const f=fixture({id});f.actor.system.conditions={posture:'prone'};
 for(const braced of [true,false]){const d=f.details({supportSelection:selection(f,id===m60?'bipod':'mounted'),aimSeconds:1,braced});assert.equal(d.combatCalculation.channels.find(c=>c.id==='braced').resolvedValue,1);}}
});
test('+P selected M60 bipod applies12 ->13 ->9 once',()=>{
 bucket();const f=fixture({id:m60,plusP:true});f.actor.system.conditions={posture:'prone'};
 const e=f.details({supportSelection:selection(f,'bipod')}).combatCalculation.metadata.weaponStrength;
 assert.equal(e.effectiveRequiredST,9);assert.equal(e.proposedDelta,-1);assert.equal(e.transformation.passes,1);
});
test('KNOWN_INCLUDED mounted base can refund known -2 while UNKNOWN does not',()=>{
 bucket();const f=fixture({id:m2,level:14,explicit:false});const e=evidence(f),supportSelection=selection(f,'mounted');
 f.attack.weaponStrengthProvenance={status:'KNOWN_INCLUDED',knownIncludedPenalty:-2,evidence:{...e.weaponIdentity,source:'explicit-controlled-base',scope:'base-level'}};
 assert.equal(f.details({supportSelection}).effectiveSkill,16);delete f.attack.weaponStrengthProvenance;
 assert.equal(f.details({supportSelection}).effectiveSkill,14);
});
test('bound support never transfers between actor, physical instance, equipment or mode',()=>{
 bucket();const f=fixture({id:m60});f.actor.system.conditions={posture:'prone'};const s=selection(f,'bipod');
 for(const key of ['actorId','instanceId','modeId','equipmentId']){const d=f.details({supportSelection:{...s,[key]:'other'}});assert.equal(d.effectiveSkill,12);assert.equal(d.supportSelection,null);}
 assert.equal(fixture().details({supportSelection:s}).effectiveSkill,15);
});
test('unsupported choices and missing UI declaration source cannot reduce requirement',()=>{
 bucket();const f=fixture();for(const supportSelection of [{...selection(f,'mounted')}, {...selection(f,'mounted'),source:'arbitrary-flag'}])assert.equal(f.details({supportSelection}).effectiveSkill,15);
});
test('support choice leaves external Bucket, input Actor.system and attack untouched',()=>{
 const list=bucket([{modint:2,desc:'external'}]),f=fixture({id:m60});f.actor.system.conditions={posture:'prone'};const encoded=JSON.stringify([f.actor.system,f.attack]);
 assert.equal(f.details({supportSelection:selection(f,'bipod')}).effectiveSkill,18);assert.equal(JSON.stringify([f.actor.system,f.attack]),encoded);assert.deepEqual(list,[{modint:2,desc:'external'}]);
});
test('FireService snapshot freezes selected support and applied Aim evidence',async()=>{
 bucket();const f=fixture({id:m60});f.actor.system.conditions={posture:'prone'};const supportSelection=selection(f,'bipod'),d=f.details({supportSelection,aimSeconds:1});
 f.service.preparedRollExecutor=async o=>({rolled:true,rollData:{finaltarget:o.effectiveSkill}});
 const r=await new AmmoService(f.actor).executeShot({weaponId:'weapon',attackId:'support-execution',prepare:({ammunition})=>({amount:1,profile:resolveRuntimeAttackProfile({actor:f.actor,attack:f.attack,ammunition,context:{supportSelection}})}),execute:({profile})=>f.service.executeRangedAttack(f.attack,{...d,aimSeconds:1,attackProfile:profile,physicalShots:1,effectiveRoF:1,rcl:2})});
 const shot=r.snapshot,encoded=JSON.stringify(shot);assert.equal(shot.profile.weaponStrength.transmittedDelta,0);assert.equal(shot.profile.weaponStrength.support.confirmedType,'bipod');assert.equal(shot.profile.weaponStrength.support.effects.appliedBracingBonus,1);
 f.actor.system.conditions.posture='standing';f.actor.system.attributes.ST.value=12;f.details();assert.equal(JSON.stringify(shot),encoded);assert.equal(r.spent,1);
});
