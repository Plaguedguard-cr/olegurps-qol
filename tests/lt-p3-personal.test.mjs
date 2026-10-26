import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {LT_PERSONAL_PROFILES,ltPersonalAmmoId} from '../scripts/lt-personal-source.js';
import {ltPersonalDamage,resolveLTPersonalRange} from '../scripts/tools/lt-personal.js';
import {StandaloneWeaponService,StandaloneWeaponDraft,standaloneAmmoCarrier,searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {ltBowDrawing} from '../scripts/tools/lt-bow.js';
import {hasWeaponBondPerk,isWeaponBondActive} from '../scripts/tools/weapon-bond-service.js';
import {resolveCombatCalculation} from '../scripts/tools/combat-calculation-engine.js';
import {attackApplicationResult,attackApplicationHTML} from '../scripts/tools/attack-application-result.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
function actor(){return {id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{DX:{value:20},ST:{import:14,value:14}},swing:'2d',thrust:'1d',skills:{}},getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
const type=id=>{const t={source:'catalog',book:'lt',kind:'ammo-item',ammoId:id,name:catalogs.getAmmoItem('lt',id)?.name};return {...t,key:ammoTypeKey(t)};};
async function fixture(id,configuration={},a=actor()){
 const m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id);
 for(const skill of [...(m.defaults??[]).filter(s=>s.type==='skill'),...(m.governing_skill_selection?.candidates??[]),m.governing_skill?.skill].filter(Boolean))a.system.skills[skill.name+(skill.specialization??'')]={name:skill.name+(skill.specialization?' ('+skill.specialization+')':''),level:20,points:4};
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(e.equipment_id);draft.modeIds=new Set([id]);
 const definitions=new StandaloneWeaponService(a,catalogs),record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);weapon.ltPersonal={ropeLengthYards:10,...configuration};
 const state=a.getFlag('world','gurpsAmmoManager')??{weapons:[],attackOverrides:{},shotReceipts:{}};state.weapons.push(weapon);await a.setFlag('world','gurpsAmmoManager',state);const service=new AmmoService(a);
 const current=()=>a.flags.world.gurpsAmmoManager.weapons.find(w=>w.id===weapon.id);
 const attack=()=>readStandaloneAttack(a,record.id,id);
 const profile=(state=a.getFlag('world','gurpsAmmoManager'),ammunition=readAttackAmmunition(state.weapons.find(w=>w.id===weapon.id)))=>resolver.resolve({actor:a,actorId:a.id,weaponId:weapon.id,attack:attack(),state,ammunition,context:{physicalDistance:1},binding:standaloneCatalogBinding(attack(),catalogs)});
 const tx=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>[t]});
 const load=async(t,n=1)=>{await tx('add-stock',{ammoKey:t.key,amount:n},t);await tx('load',{magazineId:current().ammunitionInventory.installedId,ammoKey:t.key,amount:n},t);};
 const shoot=(attackId=crypto.randomUUID(),execute=async()=>({rolled:true,rollData:{failure:false,rtotal:10,finaltarget:20,margin:10},messageId:'native-'+attackId}))=>service.executeShot({weaponId:weapon.id,attackId,prepare:({state,ammunition})=>({profile:profile(state,ammunition),amount:1}),execute});
 return {actor:a,draft,record,weapon,current,definitions,service,profile,attack,tx,load,shoot};
}
test('Repeating uses the user-approved 100% preparation limit; 70%, 100%, above 100%, temporary and source-applicable ST stay separate from firing',()=>{
 const a=actor();a.system.attributes.ST.value=20;
 const draw=(ratedST,applyArmST=false)=>ltBowDrawing(a,'WwpI_P5DL8za5501B',{ratedST,drawMethod:'hand',applyArmST});
 assert.equal(draw(14).selfCocking.allowed,true);assert.equal(draw(20).selfCocking.allowed,true);assert.equal(draw(21).selfCocking.allowed,false);
 assert.equal(draw(20).sourceDecision.officialErratum,false);assert.equal(draw(20).selfCocking.preparationOnly,true);assert.match(draw(20).note,/100%/);
 a.system.ads={l:{name:'Lifting ST',level:2},r:{name:'Arm ST',level:3},s:{name:'Striking ST',level:50}};
 assert.equal(draw(22).selfCocking.allowed,true);assert.equal(draw(23).selfCocking.allowed,false);assert.equal(draw(25,true).selfCocking.allowed,true);
 a.flags['olegurps-qol']={strengthAdjustments:{modifiers:{st:-5}}};assert.equal(draw(20,true).selfCocking.allowed,true);assert.equal(draw(21,true).selfCocking.allowed,false);
});
test('the registry covers 48 audited modes plus nine explicit source gaps; powder and utility classifications stay non-ranged',()=>{
 assert.equal(Object.keys(LT_PERSONAL_PROFILES).length,57);assert.equal(catalogs.getDiagnostics().state,'ready');
 assert.equal(catalogs.getMode('WLTP3BlowpipePowder').combat_type,'melee');assert.equal(catalogs.getMode('WLTP3MetsubushiPowder').combat_type,'melee');assert.equal(catalogs.getMode('WLTP3GrapplingHook').combat_type,'effect');
 assert.ok(searchStandaloneModels(catalogs,'ranged','Fukiya').length);assert.equal(searchStandaloneModels(catalogs,'melee','Metsubushi').length,0);
});

test('improvised footwear uses Sling alone, even when Bolas is much higher',async()=>{
 const a=actor();a.system.skills={s:{name:'Sling',level:22,points:4},b:{name:'Bolas',level:40,points:4}};
 const f=await fixture('WLTP3FootwearThrown',{},a);
 // fixture gives source skills level 20; preserve this deliberately unequal pair.
 a.system.skills={s:{name:'Sling',level:22,points:4},b:{name:'Bolas',level:40,points:4}};
 assert.equal(f.attack().level,22);assert.equal(catalogs.getMode('WLTP3FootwearThrown').governing_skill_selection,undefined);
 assert.equal(catalogs.getAmmoItem('lt','lt_p3_object_eLTP3Caltrop').tech_level_raw,'2');
});

test('old LT definitions read the shared personal source projection without rewriting flags or overrides',async()=>{
 const f=await fixture('WLTP3FootwearThrown');const saved=f.actor.flags['olegurps-qol'].standaloneWeapons.weapons.find(w=>w.id===f.record.id);
 delete saved.modes[0].snapshot.lt_personal_contract;saved.modes[0].snapshot.governing_skill_selection={strategy:'best-available-unmodified',candidates:[{name:'Bolas'},{name:'Sling'}]};
 saved.modes[0].snapshot.stats.range='old';saved.modes[0].overrides={range:'x4/x6'};
 const before=JSON.stringify(f.actor.flags),read=f.definitions.get(f.record.id);
 assert.equal(read.modes[0].snapshot.stats.range,'x3/x5');assert.equal(read.modes[0].snapshot.governing_skill_selection,undefined);
 assert.equal(read.modes[0].overrides.range,'x4/x6');assert.equal(JSON.stringify(f.actor.flags),before);
});
for(const p of Object.values(LT_PERSONAL_PROFILES))test(p.name+' / '+p.modeId+': every linked physical load runs stock, load, profile, shot, history and recovery',async()=>{
 const f=await fixture(p.modeId);assert.equal(f.attack().readinessReason,null,p.name+': '+f.attack().readinessReason);
 for(const id of catalogs.getMode(p.modeId).lt_ammo_item_ids){
  const t=type(id);assert.equal(compatibility.checkCompatibility(p.modeId,id,{book:'lt',kind:'ammo-item'}).status,'compatible');await f.load(t);
  const profile=f.profile();assert.equal(profile.damage.nativeSafe,true,profile.damage.reason);assert.equal(profile.effective.rcl,null);assert.ok(!/\bthr|\bsw/.test(profile.damage.formula??''));
  if(p.noDamage){assert.equal(profile.effective.damage,null);assert.equal(profile.damage.components.length,0);assert.equal(profile.attackResult.kind,p.kind);}
  const result=await f.shoot();assert.equal(result.spent,1);assert.equal(readAttackAmmunition(f.current()).available,0);assert.equal(result.snapshot.profile.damage.formula,profile.damage.formula);
  if(p.noDamage){assert.equal(result.snapshot.applicationResult.status,'check-succeeded');assert.equal(result.snapshot.applicationResult.check.total,10);}
  if(p.recoverable){const key=Object.keys(f.current().ltObjects).at(-1),before=JSON.stringify(result.snapshot);
   await f.tx('lt-personal-return',{attackId:key,ammoKey:t.key,confirmed:true});const n=f.current().ammunitionInventory.stocks.find(s=>s.key===t.key).rounds;
   await f.tx('lt-personal-return',{attackId:key,ammoKey:t.key,confirmed:true});assert.equal(f.current().ammunitionInventory.stocks.find(s=>s.key===t.key).rounds,n);assert.equal(JSON.stringify(result.snapshot),before);
  }
 }
});
test('Sling, Staff and Heavy use individual stone/lead transformations; optional crushing stays off by default',async()=>{
 assert.equal(catalogs.getAmmoItem('lt','lt_p3_heavy_sling_lead').weight_lb,1);
 assert.equal(catalogs.getAmmoItem('lt','lt_p3_heavy_sling_lead').price_usd,undefined);
 for(const id of ['Wt63kR2Ebkr9chL4b','WoPZ6WfjRMTWppGsv','W04WeGwpSVXBrCCCw']){
  const f=await fixture(id),ids=catalogs.getMode(id).lt_ammo_item_ids;
  const profile=ammo=>f.profile(undefined,{kind:'preview',type:type(ammo)}),stone=profile(ids.find(x=>!catalogs.getAmmoItem('lt',x).variant_id||catalogs.getAmmoItem('lt',x).variant_id==='sling_stone_shaped'));
  const lead=profile(ids.find(x=>catalogs.getAmmoItem('lt',x).variant_id==='sling_lead')),unshaped=profile(ids.find(x=>catalogs.getAmmoItem('lt',x).variant_id==='sling_stone_unshaped'));
  assert.equal(lead.damage.rules.ballisticRange.maximum,stone.damage.rules.ballisticRange.maximum*2);assert.equal(unshaped.damage.rules.attackBonus,-1);
  assert.equal(lead.damage.rules.ltPersonal.policy.slingCrushing,false);assert.match(stone.damage.formula,id==='W04WeGwpSVXBrCCCw'?/cr$/:/pi$/);
 }
 const f=await fixture('Wt63kR2Ebkr9chL4b'),raw=ltPersonalDamage({actor:f.actor,attack:f.attack(),raw:f.attack().data,modeId:'Wt63kR2Ebkr9chL4b',weapon:f.current(),type:type('lt_shaped_sling_stone_lt76'),catalogs,compatibility,policy:{slingCrushing:true}});assert.match(raw.formula,/cr$/);
});
test('Atlatl dart, javelin, full Woomera spear and ordinary Throwing Dart remain distinct physical identities',async()=>{
 const a=await fixture('WiQNALmY3-6VRXnXY'),w=await fixture('WTsaH0A-_oG-k93sT'),d=LT_PERSONAL_PROFILES.WO60e2cUBoUzSuKLd;
 await assert.rejects(a.load(type(ltPersonalAmmoId(d))));await assert.rejects(w.load(type('lt_atlatl_dart_lt77')));
 const spear=ltPersonalAmmoId(LT_PERSONAL_PROFILES.Wu1wX2lpPMDtA5FNi);assert.equal(ltPersonalAmmoId(LT_PERSONAL_PROFILES['WTsaH0A-_oG-k93sT']),spear);await w.load(type(spear));assert.equal(w.profile().damage.formula,'2d+3 imp');
});
test('Net formulas use unmodified skill/ST; Lariat uses actual rope length and B411 ready time; no dummy Damage',async()=>{
 const large=await fixture('WGOJzjBsf78jRPn96'),small=await fixture('WN_Mx1qav5f-zgLjY'),lasso=await fixture('WxT1QaWNJoCXVhDOG',{ropeLengthYards:17});
 for(const f of [large,small,lasso])await f.load(type(ltPersonalAmmoId(LT_PERSONAL_PROFILES[f.weapon.standaloneModeId])));
 assert.equal(large.profile().effective.range,'11');assert.equal(small.profile().effective.range,'18');assert.equal(lasso.profile().effective.range,'17');assert.equal(lasso.profile().damage.rules.ltPersonal.range.readyAfterMiss,4);
 await lasso.tx('lt-personal-configure',{configuration:{ropeLengthYards:null}});assert.equal(lasso.profile().damage.nativeSafe,false);
});
test('fractional source ranges remain exact; utility Basic Lift and Throwing bonuses use B355/B226 without Lifting/Striking substitution',async()=>{
 const f=await fixture('Wbeu-Rh82UeIe7Gqs');f.actor.system.attributes.ST.value=13;await f.load(type(ltPersonalAmmoId(LT_PERSONAL_PROFILES['Wbeu-Rh82UeIe7Gqs'])));
 assert.equal(f.profile().effective.range,'22.75/35.75');
 const a=actor();a.system.attributes.ST.value=10;a.system.ads={l:{name:'Lifting ST',level:50},s:{name:'Striking ST',level:50}};
 const range=kind=>resolveLTPersonalRange({actor:a,profile:LT_PERSONAL_PROFILES[kind]});
 assert.equal(range('WLTP3GrapplingHook').maximum,25);assert.equal(range('WLTP3PaddedGrapplingHook').maximum,20);
 a.system.skills.t={name:'Throwing',level:22,points:4};assert.equal(range('WLTP3GrapplingHook').maximum,30);
});
test('cancel, duplicate, custom recipe, full Note, changed ST, old snapshot and foreign owner remain protected',async()=>{
 const f=await fixture('W666IAfB0ft-hoH3z'),t=type('lt_atlatl_javelin');t.recipe={version:1,variantId:'lt_personal_load',customId:'personal-javelin',parameters:{note:'x'.repeat(500),delivery:'penetration',savingThrow:'manual HT',description:'Keep the whole personal description.'}};t.key=ammoTypeKey(t);
 await f.tx('save-recipe',{type:t},t);await f.load(t);const before=JSON.stringify(f.actor.flags);await f.shoot('cancel',async()=>({rolled:false}));assert.equal(JSON.stringify(f.actor.flags),before);
 const r=await f.shoot('one'),snapshot=JSON.stringify(r.snapshot);await f.shoot('one',()=>{throw Error('Duplicate roll');});
 f.actor.flags['olegurps-qol'].strengthAdjustments={modifiers:{st:5,striking:4,lifting:20}};assert.equal(JSON.stringify(r.snapshot),snapshot);assert.equal(r.snapshot.profile.damage.formula,'1d+1 imp');
 assert.equal(ammunitionChatData(r.snapshot.profile).fields.find(x=>x.value==='x'.repeat(500)).value.length,500);
 f.actor.isOwner=false;const denied=JSON.stringify(f.actor.flags);await assert.rejects(f.tx('lt-personal-return',{attackId:'one',ammoKey:t.key,confirmed:true}),/Permission/);assert.equal(JSON.stringify(f.actor.flags),denied);
});
test('LT Weapon Bond accepts an explicit owner perk confirmation when discovery fails and applies only once',async()=>{
 const f=await fixture('Wt63kR2Ebkr9chL4b');assert.equal(hasWeaponBondPerk(f.actor),false);assert.equal(isWeaponBondActive(f.actor,true),false);
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.get(f.record.id)});draft.weaponBond=true;draft.weaponBondChanged=true;await f.definitions.save(draft);
 const a=f.attack();assert.equal(a.weaponBondPerkConfirmed,true);assert.equal(isWeaponBondActive(f.actor,a.weaponBondSetting,a.weaponBondPerkConfirmed),true);
 f.actor.system.ads={a:{name:'Localized perk',originalName:'Weapon Bond (Sling)'}};assert.equal(hasWeaponBondPerk(f.actor),true);assert.equal(isWeaponBondActive(f.actor,true,true),true);
 const other={...f.record,source:{...f.record.source,source:'UT'},settings:{weaponBond:true}};
 assert.equal(standaloneAmmoCarrier(other,{...f.current(),weaponBondPerkConfirmed:true}).weaponBondPerkConfirmed,undefined);
});

test('utility checks use shared skill channels without inheriting melee/ranged techniques',()=>{
 const calc=resolveCombatCalculation({combatType:'skill',baseAttackLevel:14,channels:[{id:'manual',value:-2}],rules:[
  {id:'combat-only',combatType:'both',channel:'manual',resolve:()=>({value:100})}
 ]});
 assert.equal(calc.effectiveSkill,12);assert.equal(calc.combatType,'skill');assert.deepEqual(calc.activeRules,[]);
 assert.equal(calc.rollModifiers[0].value,-2);
});

test('no-Damage results preserve failed native checks and do not manufacture a hit or injury',()=>{
 const profile={attackResult:{kind:'net-large',label:'Net',defensesManual:true}};
 const result=attackApplicationResult(profile,{failure:true,rtotal:16,finaltarget:5,margin:-11},'native-id');
 assert.equal(result.status,'check-failed');assert.equal(result.check.total,16);assert.equal(result.attackId,'native-id');
 assert.equal(result.damage,null);assert.equal(result.defense,'manual-unresolved');
 assert.match(attackApplicationHTML(result,String),/проверка неудачна/);assert.doesNotMatch(attackApplicationHTML(result,String),/data-otf|0d|0 HP/);
});

test('a powder distance typo can be corrected before claiming a shot execution ID',async()=>{
 const {LTPersonalProcedureApp}=await import('../scripts/tools/lt-personal-procedure.js');
 const f=await fixture('WLTP3MetsubushiPowder'),app=Object.create(LTPersonalProcedureApp.prototype);
 let distance='2',calls=0;const button={disabled:false,isConnected:true},message={textContent:''};
 Object.assign(app,{actor:f.actor,weaponId:f.weapon.id,busy:false,service:{executeShot:async()=>{calls++;return {rolled:false};}},element:{querySelector:s=>s.includes('action=apply')?button:s.includes('distance')?{value:distance}:s.includes('modifier')?{value:'0'}:message}});
 await app.apply();assert.equal(calls,0);assert.match(message.textContent,/Дистанция/);assert.equal(button.disabled,false);
 distance='1';await app.apply();assert.equal(calls,1);assert.equal(app.busy,false);
});
