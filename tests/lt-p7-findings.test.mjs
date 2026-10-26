import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {catalogs,compatibility,p7Fixture} from './helpers/lt-p7-context.mjs';
import {LT_BOW_PROFILES,LT_ARROW_IDS} from '../scripts/lt-bow-source.js';
import {LT_PERSONAL_PROFILES,ltPersonalProfile} from '../scripts/lt-personal-source.js';
import {LT_EARLY_PROFILES,LT_TEN_EYED_MODES} from '../scripts/lt-early-firearms-source.js';
import {LT_ARTILLERY_PROFILES,ltArtilleryFutureLoad} from '../scripts/lt-artillery-source.js';
import {LT_FLAME_PROFILES} from '../scripts/lt-flame-source.js';
import {LT_CROSSBOW_UTILITY_PROFILES} from '../scripts/lt-crossbow-utility-source.js';
import {ltPersonalDamage} from '../scripts/tools/lt-personal.js';
import {ltBowDamage,resolveLTBowBase} from '../scripts/tools/lt-bow.js';
const history=JSON.parse(await fs.readFile(new URL('./fixtures/lt-p7-historical-contract.json',import.meta.url),'utf8'));
const modes=ids=>ids.map(id=>catalogs.getMode(id)),check=(mid,id,kind='ammo-item')=>compatibility.checkCompatibility(mid,id,{book:'lt',kind});
const findings={
 F01:r=>modes(r.affectedModeIds).forEach(m=>assert.equal(m.stats.recoil,null)),
 F02:r=>modes(r.affectedModeIds).forEach(m=>assert.ok(m.stats.accuracy==='0'||m.stats.bulk==='0')),
 F03:r=>modes(r.affectedModeIds).forEach(m=>assert.equal(m.lt_ranged_contract.bulkValues.length,2)),
 F04:()=>assert.deepEqual(catalogs.getMode('WQiw6nornpsdGHCov').governing_skill.candidates.map(s=>s.name),['Bolas','Sling']),
 F05:()=>{assert.equal(LT_TEN_EYED_MODES.length,5);for(const id of LT_TEN_EYED_MODES)assert.equal(LT_EARLY_PROFILES[id].places,10);},
 F06:r=>r.affectedModeIds.forEach(id=>assert.equal(ltPersonalProfile(id).noDamage,true)),
 F07:r=>modes(r.affectedModeIds).forEach(m=>assert.equal(m.stats.range,'spec.')),
 F08:r=>modes(r.affectedModeIds).forEach(m=>assert.match(m.stats.rate_of_fire,/^1x\d+$/)),
 F09:()=>assert.equal(catalogs.getMode('WDgJJrXmNb2ltlJ8G').governing_skill.skill.name,'Gunner'),
 F10:()=>assert.equal(catalogs.getMode('W666IAfB0ft-hoH3z').stats.range,'x1.5/x2.5'),
 F11:()=>assert.equal(catalogs.getMode('WPn4rW6HE64VST_pm').stats.bulk,'-8'),
 F12:()=>assert.equal(catalogs.getMode('WqrX0vMt5n6kLV5mq').stats.strength,'6'),
 F13:()=>assert.equal(catalogs.getMode('Wo3FP4KhrHj4Ovw39').stats.bulk,'-2'),
 F14:r=>modes(r.affectedModeIds).forEach(m=>assert.ok(m.lt_bow_contract||m.lt_personal_contract||m.lt_early_contract||m.lt_artillery_contract||m.lt_flame_contract)),
 F15:r=>r.affectedModeIds.forEach(id=>assert.equal(LT_FLAME_PROFILES[id].linked,true)),
 F16:r=>modes(r.affectedModeIds).forEach(m=>{assert.equal(m.stats.recoil,'1');assert.equal(m.stats.rate_of_fire,'1x100');}),
 F17:()=>assert.equal(LT_EARLY_PROFILES.WNE2rB6BVUwchQrnf.places,4),
 F18:r=>r.affectedModeIds.forEach(id=>{const p=LT_ARTILLERY_PROFILES[id];assert.equal(p.stockUnits,p.pellets);const old=history.physicalRelations.find(r=>r.modeId===id&&r.sourceVerdict==='INCOMPATIBLE');assert.equal(check(id,old.ammoId).status,'incompatible');}),
 F19:()=>{const a=catalogs.getMode('W11eNBa3voVFCsgWv'),b=catalogs.getMode('WFAwJH7XlIK-bIy0Q');assert.ok(a.lt_ammo_item_ids.includes('lt_slurbow_medium_dart_lt76'));assert.ok(b.lt_ammo_item_ids.includes('lt_slurbow_small_dart_lt76'));assert.equal(LT_BOW_PROFILES[a.weapon_mode_id].units,2);assert.equal(LT_BOW_PROFILES[b.weapon_mode_id].units,5);},
 F20:r=>r.affectedModeIds.forEach(id=>assert.equal(check(id,'artillery_lead','projectile-option').status,'incompatible')),
 F21:r=>r.affectedModeIds.forEach(id=>assert.equal(check(id,'catapult_overweight','projectile-option').status,'incompatible')),
 F22:()=>{assert.equal(check('WqUeIOkvQIgCeKWou','bow_arrow','ammo-family').status,'undetermined');assert.equal(check('WRLeJSlkTELYgEN_u','lt_puckle_gun_bullet_lt93').status,'incompatible');},
 F23:()=>{for(const v of catalogs.getCatalog('lt').projectile_options)assert.doesNotMatch(v.status??'',/^GM_/);},
 F24:()=>{for(const p of Object.values(LT_FLAME_PROFILES))assert.equal(catalogs.getAmmoItem('lt',p.ammoId).tech_level_raw,'3');assert.equal(catalogs.getAmmoItem('lt','lt_fire_cage_arrow_lt73').tech_level_raw,'2');assert.equal(catalogs.getAmmoItem('lt','lt_bodkin_arrow').tech_level_raw,'3');},
 F25:r=>r.affectedModeIds.forEach(id=>{const a=LT_ARTILLERY_PROFILES[id].ammunition.find(a=>a.kind==='lead');assert.equal(catalogs.getAmmoItem('lt',a.id).price_per_lb_usd,1.6);}),
 F26:()=>assert.equal(catalogs.getVariant('lt','grapeshot').pellets_formula,'floor(40 * full_round_weight_lb)'),
 F27:()=>{for(const mid of ['WqUeIOkvQIgCeKWou','WHwsNi90Y4m49YOzg']){const id=mid==='WqUeIOkvQIgCeKWou'?'lt_bodkin_arrow':'lt_bodkin_crossbow_bolt',d=ltBowDamage({modeId:mid,configuration:{ratedST:14},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:id},catalogs});assert.match(d.formula,/\(2\) pi$/);}},
 F28:()=>{assert.equal(Object.values(LT_FLAME_PROFILES).filter(p=>p.jet).length,5);for(const p of Object.values(LT_FLAME_PROFILES))assert.ok(p.seconds>0);},
 F29:r=>r.affectedModeIds.forEach(id=>{assert.equal(resolveLTBowBase({modeId:id,configuration:{}}).ready,false);assert.equal(resolveLTBowBase({modeId:id,configuration:{ratedST:24}}).ready,true);}),
 F30:async()=>{const f=await p7Fixture('WqUeIOkvQIgCeKWou',{bow:{ratedST:14}});const p=f.profile(undefined,{kind:'preview',type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_regular_arrow'}});assert.match(p.damage.formula,/^\d+d/);assert.doesNotMatch(p.damage.formula,/thr|sw/);},
 F31:()=>{for(const m of catalogs.getCatalog('lt').ammo_items.filter(a=>a.weapon_mode_ids.length))assert.ok(m.source_ref_raw||m.source_ref||m.source_book);},
 F32:()=>{assert.equal(Object.keys(LT_CROSSBOW_UTILITY_PROFILES).length,22);assert.ok(ltPersonalProfile('WLTP3BlowpipePowder').noDamage);assert.equal(ltArtilleryFutureLoad('WYkHC34-KuQjgMNb-','incendiary_sphere').status,'BLOCKED');}
};
for(const r of history.findings)test('individual finding '+r.id+': '+r.title,()=>findings[r.id](r));
const gaps={
 'SRC-01':()=>assert.equal(ltPersonalProfile('WLTP3BlowpipePowder').procedure,'melee-powder'),
 'SRC-02':()=>assert.equal(ltPersonalProfile('WLTP3MetsubushiPowder').noDamage,true),
 'SRC-03':()=>{for(const id of ['WLTP3PilumThrown','WLTP3AngonThrown'])assert.equal(ltPersonalProfile(id).kind,'pilum');},
 'SRC-04':()=>assert.equal(ltBowDamage({modeId:'WEccMSldVWlEmz-AU',configuration:{ratedST:14},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_prodd_pellet_lt76',recipe:{version:1,variantId:'incendiary_sphere'}},catalogs}).nativeSafe,false),
 'SRC-05':()=>assert.equal(resolveLTBowBase({modeId:'WFAwJH7XlIK-bIy0Q',configuration:{ratedST:14,shotMode:'single-small'}}).ready,true),
 'SRC-06':()=>findings.F19(),
 'SRC-07':()=>assert.equal(check('W04WeGwpSVXBrCCCw','lt_p3_heavy_sling_lead').status,'compatible'),
 'SRC-08':()=>{assert.equal(check('W04WeGwpSVXBrCCCw','lt_p3_heavy_sling_unshaped').status,'compatible');assert.equal(check('WrowHYC-dAZA488wu','lt_p3_stone_stick_unshaped').status,'compatible');},
 'SRC-09':()=>assert.equal(ltPersonalDamage({modeId:'Wt63kR2Ebkr9chL4b',weapon:{},actor:{getFlag:()=>undefined,system:{attributes:{ST:{value:14}}}},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_shaped_sling_stone_lt76',recipe:{version:1,variantId:'incendiary_catapult_pot'}},catalogs,compatibility}).nativeSafe,false),
 'SRC-10':()=>assert.equal(Object.values(LT_ARTILLERY_PROFILES).filter(p=>p.bundle&&p.ammunition.some(a=>a.kind==='bundle-stone'&&a.mass===1)).length,6),
 'SRC-11':()=>assert.equal(Object.values(LT_ARTILLERY_PROFILES).filter(p=>p.bundle&&p.ammunition.some(a=>a.kind==='bundle-lead'&&a.mass===1)).length,6),
 'SRC-12':()=>assert.equal(check('W3_f6uxd42Wb3ehoq','lt_bombard_large_stone_ball_lt87').status,'compatible'),
 'SRC-13':()=>assert.equal(check('WRLeJSlkTELYgEN_u','lt_puckle_square_bullet_lt93').status,'undetermined'),
 'SRC-14':()=>assert.ok(Object.values(LT_EARLY_PROFILES).every(p=>p.powder)),
 'SRC-15':()=>assert.equal(LT_EARLY_PROFILES.WRLeJSlkTELYgEN_u.places,9),
 'SRC-16':()=>assert.equal(ltPersonalProfile('WLTP3FootwearThrown').hitBonus,-2),
 'SRC-17':()=>assert.equal(ltPersonalProfile('WLTP3CaltropThrown').hitBonus,-2),
 'SRC-18':()=>assert.equal(ltPersonalProfile('WLTP3PitonThrown').hitBonus,-4),
 'SRC-19':()=>assert.equal(Object.values(LT_CROSSBOW_UTILITY_PROFILES).flatMap(p=>p.ammoIds).length,33),
 'SRC-20':()=>{for(const p of Object.values(LT_ARTILLERY_PROFILES).filter(p=>p.personal))assert.notEqual(check(p.modeId,'lt_p3_object_eLMadXvd-l99hQHlD').status,'compatible');},
 'SRC-21':()=>assert.equal(ltPersonalProfile('WLTP3GrapplingHook').procedure,'utility'),
 'SRC-22':()=>assert.equal(resolveLTBowBase({modeId:'WqUeIOkvQIgCeKWou',configuration:{ratedST:14,quality:{quality:'fine',balance:'balanced'}}}).configuration.quality.quality,'fine'),
 'SRC-23':()=>assert.equal(resolveLTBowBase({modeId:'WqUeIOkvQIgCeKWou',configuration:{ratedST:14,quality:{reducedAcc:true}}}).configuration.quality.reducedAcc,true),
 'SRC-24':()=>{assert.ok(LT_FLAME_PROFILES.Wf9D7K1uIf9a1YFcF.fuels.includes('naphtha'));assert.ok(!LT_FLAME_PROFILES.WOtCDhbkzhdvewbDK.fuels.includes('naphtha'));},
 'SRC-25':()=>assert.equal(ltArtilleryFutureLoad('WYkHC34-KuQjgMNb-','incendiary_sphere').status,'BLOCKED'),
 'SRC-26':()=>assert.equal(LT_ARTILLERY_PROFILES['WYkHC34-KuQjgMNb-'].indirectAvailable,true),
 'SRC-27':()=>{const modeId='WLTP3MetsubushiPowder',ammoId=catalogs.getMode(modeId).lt_ammo_item_ids[0],d=ltPersonalDamage({modeId,weapon:{},actor:{system:{attributes:{ST:{value:14}}},getFlag:()=>undefined},attack:{level:20},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId,recipe:{version:1,variantId:'lt_personal_load',parameters:{delivery:'respiratory',note:'Owner substance'}}},catalogs,compatibility});assert.equal(d.nativeSafe,true);assert.equal(d.formula,null);assert.equal(d.components.length,0);assert.equal(d.rules.ltPersonal.delivery,'respiratory');assert.equal(d.rules.attackResult.effectsManual,true);},
 'SRC-28':()=>assert.ok(catalogs.getEquipmentForMode('WHHB1FrefOB5s-4aP').aliases.includes('Dai-kyu'))
};
for(const r of history.sourceGaps)test('individual source gap '+r.auditId+': '+r.name,()=>gaps[r.auditId]());
