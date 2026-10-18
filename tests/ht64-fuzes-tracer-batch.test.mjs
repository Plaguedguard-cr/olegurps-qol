import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, api, context, inventoryFixture } from "./fixtures/ht-special-context.mjs";
import { FUZE_TRACER_VARIANTS, reviewFuzeTracerDefinition, sourceFuzeTracerDefinition, airburstAttackBonus, fuzeTracerShotEvents } from "../scripts/tools/fuze-tracer-ammunition.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { ammunitionCandidates, availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { automaticAmmoMessages, automaticAmmoText, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { FirePreparationApp } from "../scripts/tools/fire-preparation-app.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { applyInventoryOperation } from "../scripts/tools/ammo-inventory.js";
import { shotDamageComponents } from "../scripts/tools/damage-shot-link.js";

const mid = "WK6cr08HEjTSsvYNS", ak = "W27s4Lm8QlkKVKUPn";
// Numerical contracts only; these fixtures never assert an actual factory cartridge.
function numerical(id, changes = {}, original = {}) {
  const option = catalogs.getVariant("ht", id), explosive = ["ht_airburst", "ht_self_destruct"].includes(id);
  const definition = { version: 1, variantId: id, verified: true, source: { kind: "gm", note: "isolated numerical fixture, not a real cartridge" },
    availabilityTL: 7, baseDamage: explosive ? "4d cr ex [1d cut]" : "4d pi", sourceRange: "100/1000", sourceCost: 2,
    projectileClasses: option.eligibility_v1.conditions.projectile_classes_any ?? [],
    munitionClasses: option.eligibility_v1.conditions.munition_classes_any ?? [],
    evidence: Object.fromEntries(option.eligibility_v1.explicit_evidence_required.map(key => [key, { value: true, source: "isolated fixture" }])),
    fuseTL: 7, fuseSource: "isolated fixture", airburstAlreadyIncluded: false, ...changes };
  const facts = { evidence: {}, nativeEffects: {}, classes: { values: [], complete: false }, combinationConflicts: [], ...original };
  const review = reviewFuzeTracerDefinition(option, facts, definition);
  const resolve = (ctx = {}, prior = []) => resolveAmmunitionEffects({ raw: { damage: definition.baseDamage, range: definition.sourceRange },
    variantId: id, baseStatus: "compatible", constructionStatus: "gm-approved", facts: review.facts, context: ctx, previousTransformations: prior });
  return { option, definition, review, facts, resolve };
}
test("P6 scope matches all four source-reviewed IDs and unchanged mechanics/eligibility", async () => {
  const audit = readAuditFixture('ht64-independent-audit');
  const review = readAuditFixture('olegurps_ht_64_structured_review_v1');
  assert.deepEqual(audit.records.filter(r => r.implementationGroup === "P6_fuses_tracer").map(r => r.variantId).sort(), Object.keys(FUZE_TRACER_VARIANTS).sort());
  for (const id of Object.keys(FUZE_TRACER_VARIANTS)) {
    assert.deepEqual(review.records.find(r => r.id === id).conditions, catalogs.getVariant("ht", id).eligibility_v1.conditions);
    assert.deepEqual(audit.records.find(r => r.variantId === id).mechanicsAsCatalogued, catalogs.getVariant("ht", id).mechanics);
  }
});
test("owner source is accepted for fuze/tracer designs while source prohibitions remain",()=>{
  for(const id of Object.keys(FUZE_TRACER_VARIANTS)){
    const s=numerical(id,{source:{kind:'user',note:'Owner construction'}});
    assert.equal(s.review.status,'resolved');
    const key=s.option.eligibility_v1.explicit_evidence_required[0];
    assert.equal(numerical(id,{source:{kind:'user',note:'Owner construction'}},{evidence:{[key]:{value:false,source:'Confirmed physical restriction'}}}).review.status,'unresolved');
  }
});
for (const id of Object.keys(FUZE_TRACER_VARIANTS)) test(id + " general sourced calculation, evidence/TL/conflict gates and no repeated transformation", () => {
  const s = numerical(id); assert.equal(s.review.status, "resolved");
  const effect = s.resolve({ physicalDistance: 50 }); assert.equal(effect.nativeSafe, true);
  assert.deepEqual(effect.rules.fuzeTracer.mechanics, s.option.mechanics);
  assert.equal(effect.rules.costPerShot, 3); assert.equal(effect.rules.fuzeTracer.chatHint, s.option.chat_hint_ru);
  assert.equal(effect.rules.fuzeTracer.automaticApplication, false);
  for (const changes of [{ verified: false }, { evidence: {} }, { availabilityTL: s.option.min_tl - 1 }, { source: { kind: "reference", note: "" } }])
    assert.equal(numerical(id, changes).review.status, "unresolved");
  const key = s.option.eligibility_v1.explicit_evidence_required[0];
  assert.equal(numerical(id, {}, { evidence: { [key]: { value: false, source: "explicit source prohibition" } } }).review.reason, "P6SourceConflict");
  assert.equal(s.resolve({}, [{ effectId: id, applied: true }]).nativeSafe, false);
  assert.equal(resolveAmmunitionEffects({ raw: { damage: s.definition.baseDamage, range: "100/1000" }, variantId: id,
    baseStatus: "undetermined", constructionStatus: "world-policy", facts: s.review.facts }).nativeSafe, false);
});
test("Airburst mutually exclusive TL5/6 area +3 or air +1; TL7/8 area +4 only", () => {
  for (const tl of [5,6,7,8]) {
    const s = numerical("ht_airburst", { availabilityTL: tl, fuseTL: tl });
    for (const [target, bonus] of [["area",tl<7?3:4],["air",tl<7?1:0],["point",0],["unknown",0]]) {
      assert.equal(airburstAttackBonus(s.definition,s.option.mechanics,target),bonus);
      assert.equal(s.resolve({ airburstTarget:target }).rules.fuzeTracer.bonus,bonus);
    }
  }
  for (const tl of [null,4,9]) assert.equal(numerical("ht_airburst", { fuseTL:tl }).review.reason,"P6FuseConditionsMissing");
  const s = numerical("ht_airburst"),effect=s.resolve({airburstTarget:"area"});
  assert.equal(effect.transformations.find(t=>t.field==="attackBonus").to,4);
  assert.equal(s.resolve({airburstTarget:"area"},effect.transformations).nativeSafe,false);
});
test("Airburst native Shrapnel/Beehive/ABF cannot be upgraded again", () => {
  for (const value of ["already_airburst_shrapnel","already_airburst_beehive","already_airburst_abf"]) {
    assert.equal(numerical("ht_airburst",{}, {classes:{values:[value],complete:true}}).review.reason,"P6NativeAirburstAlready");
    assert.equal(numerical("ht_airburst",{nativeAirburstClasses:[value]}).review.reason,"P6NativeAirburstAlready");
  }
  assert.equal(numerical("ht_airburst",{}, {nativeEffects:{"do-not-duplicate-native-airburst":true}}).review.reason,"P6NativeAirburstAlready");
  assert.equal(numerical("ht_airburst",{airburstAlreadyIncluded:true}).review.status,"unresolved");
});
test("Airburst shared Fire Control channel adds bonus once and point choice removes it", () => {
  globalThis.GURPS = {};
  const s = numerical("ht_airburst"), attack = { level:13,acc:0,rof:"1",rcl:"2",data:{bulk:"-2",range:"100/1000"},
    ammunitionFuzeTracer:{definition:s.definition,mechanics:s.option.mechanics} };
  const fire = createFireControlContext({token:null,fireService:new FireService({})});
  const bands=[{index:0,max:10,penalty:0,label:"isolated zero range penalty"}],targeting={getSelection:()=>({zoneId:"torso",label:"Torso",penalty:0})};
  for (const [target,skill] of [["point",13],["area",17],["air",13],["area",17]]) {
    const r=fire.calculateEffectiveFireSkillDetails(attack,{airburstTarget:target,rangeIndex:0,shots:1,aimSeconds:0,manualModifier:0},bands,targeting);
    assert.equal(r.effectiveSkill,skill);assert.equal(r.combatCalculation.rollModifiers.filter(m=>m.channel==="ammunitionAirburst").length,skill===17?1:0);
  }
});
test("Airburst completed miss stores MoF squared only for applicable attack, preserves primary/fragments", () => {
  const s=numerical("ht_airburst"),damage=s.resolve({airburstTarget:"area"}),profile={actorId:"a",damage,context:{physicalShots:1},resource:{magazineId:"m"},ammunition:{},mode:{}};
  assert.deepEqual(damage.components.map(c=>c.formula),["4d cr ex","1d cut"]);
  const shot=createShotSnapshot(profile,{attackId:"x",outcome:{failure:true,margin:-3}});
  assert.equal(shot.ammunitionEvents.scatterYards,9);assert.ok(Object.isFrozen(shot.ammunitionEvents));
  assert.equal(fuzeTracerShotEvents(profile,{failure:false,margin:2}).scatterYards,null);
  assert.equal(fuzeTracerShotEvents({...profile,damage:s.resolve({airburstTarget:"point"})},{failure:true,margin:-3}).scatterYards,null);
  assert.equal(fuzeTracerShotEvents(profile,{failure:true,margin:1}).scatterYards,null);
});
test("P6 native Damage exposes only real source secondary components and preserves privacy",()=>{
  for(const id of Object.keys(FUZE_TRACER_VARIANTS)) {
    const s=numerical(id),damage=s.resolve({physicalDistance:1,airburstTarget:"area"});
    const profile={actorId:"a",version:1,damage,context:{physicalShots:1},resource:{magazineId:"m"},ammunition:{recipe:{variantId:id}},mode:{}};
    const shot=createShotSnapshot(profile,{attackId:"x",messageId:"m1"});
    const message={id:"m1",visible:true,isContentVisible:true,flags:{"olegurps-qol":{shotSnapshot:shot}}};
    const components=shotDamageComponents(message);assert.deepEqual(components.map(c=>c.formula),["ht_airburst","ht_self_destruct"].includes(id)?["1d cut"]:[]);
    assert.deepEqual(shotDamageComponents({...message,isContentVisible:false}),[]);
  }
});
test("Incendiary adds inc once, no extra damage component or auto ignition", () => {
  const s=numerical("ht_incendiary");assert.equal(s.resolve().formula,"4d pi inc");
  assert.equal(s.resolve().components.length,1);assert.deepEqual(s.resolve().support.manual,["ignition-adjudication"]);
  const native=numerical("ht_incendiary",{baseDamage:"4d(2) pi inc",nativePreserved:true,independentIncendiary:true});
  assert.equal(native.resolve().formula,"4d(2) pi inc");assert.equal(native.resolve().transformations[0].applied,false);
});
test("Self-Destruct requires TL6 and design, stores exact source distance without guessing half damage", () => {
  const unknown=numerical("ht_self_destruct").resolve({physicalDistance:101});
  assert.equal(unknown.rules.fuzeTracer.selfDestructDistanceYards,null);assert.equal(unknown.rules.fuzeTracer.distanceReached,null);
  assert.deepEqual(unknown.components.map(c=>c.formula),["4d cr ex","1d cut"]);
  const s=numerical("ht_self_destruct",{selfDestructDistanceYards:300,selfDestructDistanceSource:"isolated sourced fuse"});
  assert.equal(s.resolve({physicalDistance:299}).rules.fuzeTracer.distanceReached,false);
  assert.equal(s.resolve({physicalDistance:300}).rules.fuzeTracer.distanceReached,true);
  assert.equal(numerical("ht_self_destruct",{selfDestructDistanceYards:300}).review.status,"unresolved");
  assert.equal(numerical("ht_self_destruct",{availabilityTL:5}).review.reason,"P6TLRequired");
});
test("Tracer inc uses this shot's half-damage boundary; no single shot/permanent next-turn bonus", () => {
  const s=numerical("ht_tracer");
  for (const [d,f] of [[0,"4d pi inc"],[100,"4d pi inc"],[101,"4d pi"]]) assert.equal(s.resolve({physicalDistance:d}).formula,f);
  assert.equal(s.resolve({kind:"normal"}).reason,"P6DistanceMissing");
  assert.equal(numerical("ht_tracer",{sourceRange:"10"}).review.reason,"P6RangeMissing");
  for(const shots of [1,10,100]) {
    const effect=s.resolve({physicalDistance:50,physicalShots:shots});
    assert.equal(effect.rules.fuzeTracer.nextTurnBonus.applied,false);assert.equal(effect.rules.fuzeTracer.nextTurnBonus.minimumBurstShots,null);
    assert.equal(effect.rules.fuzeTracer.revealsShooter,true);
  }
  const native=numerical("ht_tracer",{baseDamage:"4d pi inc",nativePreserved:true,independentIncendiary:true});
  assert.equal(native.resolve({physicalDistance:101}).formula,"4d pi inc");
});
for (const id of ["ht_incendiary","ht_tracer"]) test("KPV APHCI-T "+id+" source-confirmed admission, native inc/cost/saved recipe unchanged", () => {
  const c=context(mid),p=automatic.prepare({modeId:mid,base:c.base,variantId:id});
  assert.equal(p.state,"complete");assert.equal(p.rulesStatus,"undetermined");assert.equal(automatic.admission(p,{policy:"strict"}).authority,"reference");
  assert.equal(automatic.admission(p,{approval:{active:false}}).allowed,true);
  const shot=resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},context:{kind:"normal",physicalDistance:3000}});
  assert.equal(shot.damage.formula,c.raw.damage);assert.equal(shot.damage.rules.costPerShot,6.7);assert.equal(shot.transformations.filter(t=>t.applied).length,0);
  const saved=JSON.parse(JSON.stringify(p.type));assert.equal(automatic.prepare({modeId:mid,base:c.base,variantId:id,savedType:saved}).state,"complete");
  saved.recipe.autoProfile.revision++;assert.equal(automatic.prepare({modeId:mid,base:c.base,variantId:id,savedType:saved}).state,"incomplete");
});
test("native base APHCI-T derives immutable tracer metadata without rewriting stock", () => {
  const c=context(mid),before=JSON.stringify(c.base),shot=resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},context:{physicalDistance:1}});
  assert.equal(shot.ammunition.recipe.variantId,"ht_tracer");assert.equal(shot.damage.formula,"8dx2(2) pi inc");assert.equal(JSON.stringify(c.base),before);
});
test("magazine switch clears stale fuze preview metadata instead of carrying a previous bonus",()=>{
  const c=context(ak),old=globalThis.OleGURPSQOL;globalThis.OleGURPSQOL=api;
  try {
    const actor={id:"a",binding:c.binding,system:{ranged:{mode:c.raw}},getFlag:()=>({weapons:[]})};
    const attack={...c.raw,path:"system.ranged.mode",data:c.raw,ammunitionFuzeTracer:{definition:numerical("ht_airburst").definition,mechanics:catalogs.getVariant("ht","ht_airburst").mechanics}};
    const result=withRuntimeAmmoStats(attack,actor,{weapons:[]});
    assert.equal(result.ammunitionFuzeTracer,undefined);assert.ok(attack.ammunitionFuzeTracer);assert.equal(result.data.damage,c.raw.damage);
  } finally {globalThis.OleGURPSQOL=old;}
});
test("no guessed real cartridge; world policy/approval cannot invent any missing P6 design", () => {
  for (const id of Object.keys(FUZE_TRACER_VARIANTS)) {
    const c=context(ak),p=automatic.prepare({modeId:ak,base:c.base,variantId:id});
    assert.notEqual(p.state,"complete");assert.equal(automatic.admission(p,{policy:"permissive",approval:{active:true}}).allowed,false);
  }
  for(const id of ["ht_airburst","ht_self_destruct"])assert.notEqual(automatic.prepare({modeId:mid,base:context(mid).base,variantId:id}).state,"complete");
  assert.equal(sourceFuzeTracerDefinition(catalogs,ak,catalogs.getAmmoItem("ht","ht_14_5x114mm"),"ht_tracer"),null);
});
test("known kinetic bullet satisfies only Tracer projectile class, never supplies missing component proof",()=>{
  const r=compatibility.checkCompatibility(ak,"ht_tracer",{book:"ht",kind:"projectile-upgrade",ammoItemId:context(ak).base.ammoId});
  assert.equal(r.status,"undetermined");assert.equal(r.eligibility.checks.find(c=>c.field==="projectile_classes_any").status,"confirmed");
  assert.equal(r.eligibility.checks.find(c=>c.field==="explicit_evidence_required.tracer_component_for_this_round_confirmed").status,"undetermined");
  assert.notEqual(automatic.prepare({modeId:ak,base:context(ak).base,variantId:"ht_tracer"}).state,"complete");
});
test("existing source ABF/Beehive reject a second Airburst without changing catalogue status",()=>{
  for(const ammoId of ["ht_specific_aim9l_abf","ht_specific_hydra_70mm_beehive"]) {
    const ammo=catalogs.getAmmoItem("ht",ammoId),modeId=ammo.weapon_mode_ids[0];
    const p=automatic.prepare({modeId,base:{source:"catalog",book:"ht",kind:"ammo-item",ammoId,name:ammo.name},variantId:"ht_airburst"});
    assert.equal(p.state,"incompatible");assert.deepEqual(p.reasons,["P6NativeAirburstAlready"]);
    assert.equal(automatic.admission(p,{policy:"permissive",approval:{active:true}}).allowed,false);
  }
});
test("all four generic source profiles require exact cartridge/mode/equipment; no per-Actor recipes",()=>{
  const c=context(ak),mode=catalogs.getMode(ak),equipment=catalogs.getEquipmentForMode(ak),ammo=catalogs.getAmmoItem("ht",c.base.ammoId);
  for(const id of Object.keys(FUZE_TRACER_VARIANTS)) {
    const s=numerical(id),d={...s.definition,source:{kind:"reference",note:"isolated source contract, not a real cartridge"},modeId:ak,equipmentId:equipment.equipment_id,ammoId:ammo.id};
    const record={...ammo,fuze_tracer_profiles:{[id]:d}};
    const fixtureCatalogs={getMode:()=>({...mode,raw_calc:{damage:d.baseDamage},stats:{...mode.stats,range:d.sourceRange}}),getEquipmentForMode:()=>equipment,getVariant:()=>s.option,getAmmoItem:()=>record};
    assert.deepEqual(sourceFuzeTracerDefinition(fixtureCatalogs,ak,record,id),d);
    const service=new AutomaticAmmunitionProfileService({catalogs:fixtureCatalogs,compatibility:{checkCompatibility:(mid,aid)=>({status:aid===ammo.id?"compatible":"undetermined",eligibility:{facts:s.facts}})}});
    assert.equal(service.prepare({modeId:ak,base:c.base,variantId:id}).state,"complete");
    for(const key of ["modeId","equipmentId","ammoId"]) {
      record.fuze_tracer_profiles[id]={...d,[key]:"wrong"};
      assert.equal(sourceFuzeTracerDefinition(fixtureCatalogs,ak,record,id),null);
    }
  }
});
for(const id of ["ht_incendiary","ht_tracer"])test(id+" AmmoService consumes once, retry preserves receipt, snapshot/reload keep original inc",async()=>{
  const s=inventoryFixture(mid,id);const sys=JSON.stringify(s.actor.system);let calls=0;const message={id:"m",setFlag:async(scope,key,value)=>{message[key]=value;}};
  const args={weaponId:"weapon",attackId:id,prepare:s.prepare,execute:async()=>{calls++;return{rolled:true,message,rollData:{failure:false,margin:2}};}};
  const r=await s.service.executeShot(args);assert.equal(r.spent,1);assert.equal(r.weapon.totalAmmo,9);assert.equal(message.shotSnapshot.spent,1);
  const serialized=JSON.stringify(message.shotSnapshot),reload=JSON.parse(serialized);assert.equal(reload.profile.damage.formula,"8dx2(2) pi inc");
  applyInventoryOperation(r.weapon,"install",{magazineId:"m2"});assert.equal(JSON.stringify(message.shotSnapshot),serialized);
  const retry=await s.service.executeShot(args);assert.equal(retry.duplicate,true);assert.equal(calls,1);assert.equal(s.state().weapons[0].totalAmmo,9);
  assert.equal(JSON.stringify(s.actor.system),sys);
});
test("P6 labels/reasons RU/EN, conditional Airburst selector and cached Foundry translation load",async()=>{
  const c=context(mid),weapon={id:"w",attackRef:{path:"system.ranged.mode"}};
  for(const lang of ["ru","en"]) {
    const actor={id:"a",binding:c.binding,system:{ranged:{mode:c.raw}}};const types=ammunitionCandidates(actor,weapon,api,lang);
    for(const type of types.filter(t=>t.unavailable&&Object.hasOwn(FUZE_TRACER_VARIANTS,t.recipe?.variantId)))assert.ok(!availableAmmoTypes(actor,weapon,api,lang).some(t=>t.key===type.key));
    // Own UI stays Russian under both Foundry locales; EN dictionary remains a compatibility resource.
    for(const id of Object.keys(FUZE_TRACER_VARIANTS))assert.ok(types.find(t=>t.recipe?.variantId===id).label.includes(automaticAmmoMessages.ru["P6"+id]));
    const json=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    for(const [key,value] of Object.entries(automaticAmmoMessages[lang]).filter(([key])=>key.startsWith("P6")))assert.equal(json["OleGURPS.AutomaticAmmo."+key],value);
  }
  const app=Object.create(FirePreparationApp.prototype);app.attack={};assert.equal(app._buildFuzeTracerContent({}),"");
  app.attack.ammunitionFuzeTracer={definition:numerical("ht_airburst").definition};assert.match(app._buildFuzeTracerContent({airburstTarget:"area"}),/value="area" selected/);
  for(const lang of ["ru","en"]) {
    const i18n={lang,translations:{},localize:key=>key.includes("P6")?key:"old cached translation"};let fetched=0;
    await loadAutomaticAmmoTranslations({location:{},game:{i18n},fetch:async()=>{fetched++;return{ok:true,json:async()=>JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"))};},foundry:{utils:{setProperty:(target,key,value)=>{target[key]=value;}}}});
    assert.equal(fetched,0);assert.deepEqual(i18n.translations,{});
    assert.equal(automaticAmmoText("P6ht_tracer",lang),automaticAmmoMessages.ru.P6ht_tracer);
  }
});
