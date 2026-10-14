import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { evaluateHTOptionEligibility, resolveHTCatalogFacts } from "../scripts/ht-option-eligibility.js";
import { assertWeaponPreservation } from "./fixtures/ht-preservation-contract.mjs";
const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([b,d]) => [b, JSON.parse(await fs.readFile(new URL("../data/catalogs/" + d.filename, import.meta.url), "utf8"))])));
const collections = ["cartridge_upgrades", "projectile_options", "projectile_upgrades", "case_construction_options"];
const variants = collections.flatMap(c => data.ht[c]);
async function loaded(mutate = () => {}) { const fixture = structuredClone(data); mutate(fixture); const catalogs = new CatalogService({ logger:null, fetcher:async u=>({ok:true,json:async()=>fixture[Object.keys(CATALOG_DEFINITIONS).find(b=>u.endsWith(CATALOG_DEFINITIONS[b].filename))]}) }); const service = new AmmunitionCompatibilityService(catalogs); await service.load(); return {catalogs,service}; }
const {catalogs,service} = await loaded();
const python = "W1FMPB_-58qp_bH-M";
const option = id => data.ht[collections.find(c=>data.ht[c].some(r=>r.id===id))].find(r=>r.id===id);
const facts = () => ({ availabilityTL:9, munitionClasses:{values:[],complete:false},projectileClasses:{values:[],complete:false}, weaponActions:{values:[],complete:false},weaponPlatforms:{values:[],complete:false},caseTypes:{values:[],complete:false},classes:{values:[],complete:false},evidence:{},nativeEffects:{},combinationConflicts:[],missingContext:[] });
for (const variant of variants) test("HT eligibility loads and checks " + variant.id, () => {
  assert.deepEqual(catalogs.getVariant("ht",variant.id).eligibility_v1,variant.eligibility_v1);
  const r=service.checkCompatibility(python,variant.id); const familySupported=["ht_ap","ht_aphc","ht_hollow_point"].includes(variant.id);
  if(familySupported)assert.equal(r.status,"compatible");else assert.notEqual(r.status,"compatible");
  assert.ok(r.eligibility.checks.some(c=>c.field.startsWith("explicit_evidence_required."))); assert.equal(r.eligibility.applicationAllowed,familySupported);
});
test("all 64 contracts and review IDs match; four current catalogs ready", async()=>{
  const audit=readAuditFixture('olegurps_ht_64_structured_review_v1'); assert.equal(variants.length,64);assert.equal(audit.total,64);assert.deepEqual(audit.records.map(r=>r.id).sort(),variants.map(r=>r.id).sort());assert.equal(catalogs.getStatus("ht").version.revision,"1.3");assert.equal(catalogs.getStatus("ht").relationships.internal.eligibilityOptions,64);for(const b of Object.keys(CATALOG_DEFINITIONS))assert.equal(catalogs.getStatus(b).status,"ready");
});
test("all original HT fields, mechanics, HT178 and rocket data retained", async()=>{
  const proof=readAuditFixture('ht-v1-3-preservation'); const normalized=structuredClone(data.ht);for(const c of collections)for(const r of normalized[c])delete r.eligibility_v1;normalized.revision="1.2";delete normalized.audit.structured_option_review_count;delete normalized.audit.structured_option_review_version;delete normalized.data_rule_review_v1_3;assert.equal(createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),proof.normalizedPreviousHash);
});
test("matching type/TL cannot replace pressure proof",()=>{
  const r=service.checkCompatibility(python,"ht_plus_p",{availabilityTL:9});assert.equal(r.status,"undetermined");assert.ok(r.eligibility.checks.some(c=>c.field==="munition_classes_any"&&c.status==="confirmed")); assert.ok(r.reasons.some(c=>c.message.includes("weapon_pressure_rating_verified")));
});
test("caller claims of verification and guessed caliber cannot bypass catalog evidence",()=>{
  assert.equal(service.checkCompatibility(python,"ht_plus_p",{availabilityTL:9,evidence:{weapon_pressure_rating_verified:true},caliberMm:10,weaponPlatforms:["rifle"]}).status,"undetermined");
});
test("confirmed action prohibits manual-only match load",()=>{
  const m=data.weapons.equipment.filter(e=>e.source==="HT").flatMap(e=>e.modes).find(m=>m.role==="attack"&&!m.hidden&&m.mechanism?.action_system==="automatic"&&m.mechanism.confidence==="high"&&m.ht_ammo_item_ids?.length); assert.ok(m);const r=service.checkCompatibility(m.weapon_mode_id,"ht_match_grade");assert.equal(r.status,"incompatible");assert.ok(r.eligibility.checks.some(c=>c.status==="incompatible"&&["weapon_actions_any","forbidden_classes"].includes(c.field)));
});
test("known cased round prohibits caseless option, absent class is not denial",()=>{
  assert.equal(service.checkCompatibility(python,"ht_caseless").status,"incompatible");const f=facts(); assert.equal(evaluateHTOptionEligibility(option("ht_caseless"),f).status,"undetermined");
});
test("minimum and maximum caliber bounds distinguish unknown/confirmed/prohibited",()=>{
  for(const [id,key,good,bad] of [["ht_baton","minimum_caliber_mm",10,9],["ht_sapfsds","maximum_caliber_mm",10,11]]){const f=facts();let r=evaluateHTOptionEligibility(option(id),f);assert.equal(r.checks.find(c=>c.field===key).status,"undetermined");f.caliberMm=good;r=evaluateHTOptionEligibility(option(id),f);assert.equal(r.checks.find(c=>c.field===key).status,"confirmed");f.caliberMm=bad;assert.equal(evaluateHTOptionEligibility(option(id),f).status,"incompatible");}
});
test("caliber_hint and numeric text in names are never numeric caliber evidence",()=>{
  const r=service.checkCompatibility(python,"ht_baton"); assert.equal(r.eligibility.facts.caliberMm,9);
  const ammo={...catalogs.getAmmoItem("ht","ht_357_magnum_9x33mmr"),id:"unreviewed_99mm",name:"99mm"};
  const mode={...catalogs.getMode(python),caliber_hint:"99mm"};
  const f=resolveHTCatalogFacts({mode,ammo,catalogs});assert.equal(f.caliberMm,undefined);
  assert.equal(evaluateHTOptionEligibility(option("ht_baton"),f).checks.find(c=>c.field==="minimum_caliber_mm").status,"undetermined");
});
test("required base variant and explicit exclusions are respected",()=>{
  assert.equal(service.checkCompatibility(python,"ht_poison").status,"undetermined");assert.equal(service.checkCompatibility(python,"ht_poison",{baseVariantId:"ht_solid"}).status,"incompatible");const r=service.checkCompatibility(python,"ht_poison",{baseVariantId:"ht_hollow_point"});assert.equal(r.status,"undetermined");assert.equal(r.eligibility.facts.combinationConflicts.length,0);assert.equal(service.checkCompatibility(python,"ht_plus_p",{selectedVariantIds:["ht_match_grade"]}).status,"incompatible");
});
test("exclusive projectile layers reject AP plus APHC instead of stacking",()=>{
  assert.equal(service.checkCompatibility(python,"ht_ap",{selectedVariantIds:["ht_aphc"]}).status,"incompatible");
});
test("unknown proposed options/context stay undetermined",()=>{
  assert.equal(service.checkCompatibility(python,"ht_plus_p",{selectedVariantIds:["missing"]}).status,"undetermined");assert.equal(service.checkCompatibility(python,"ht_plus_p",{ammoItemId:"missing"}).status,"undetermined");
});
test("minimum availability TL is separate from native weapon TL",()=>{
  const r=service.checkCompatibility(python,"ht_self_destruct");assert.equal(r.eligibility.checks.find(c=>c.field==="minimum_availability_tl").status,"undetermined");assert.equal(service.checkCompatibility(python,"ht_self_destruct",{availabilityTL:5}).status,"incompatible");
});
test("light shotshell case at TL5-7 is not rejected by broad small-arms TL8",()=>{
  const ammo=data.ht.ammo_items.find(a=>a.ammunition_class==="shotgun_shell"&&a.weapon_mode_ids.some(id=>{const m=catalogs.getMode(id);return m.role==="attack"&&!m.hidden&&m.combat_type==="ranged";}));const modeId=ammo.weapon_mode_ids.find(id=>{const m=catalogs.getMode(id);return m.role==="attack"&&!m.hidden&&m.combat_type==="ranged";});const r=service.checkCompatibility(modeId,"ht_light_case",{ammoItemId:ammo.id,availabilityTL:6});assert.equal(r.status,"undetermined");assert.equal(r.eligibility.checks.find(c=>c.field==="min_tl").status,"undetermined");assert.equal(service.checkCompatibility(python,"ht_light_case",{availabilityTL:6}).status,"incompatible");
});
test("actual native Linked effect prevents adding the guarded transform again",()=>{
  const r=service.checkCompatibility("WYtq-OBcCaZp7ShJJ","ht_heat");assert.equal(r.status,"incompatible");assert.equal(r.eligibility.applicationAllowed,false);assert.equal(r.eligibility.facts.nativeEffects["do-not-duplicate-native-linked-effects"],true);
});
test("native overlap absence cannot be inferred; confirmed overlap is prohibition",()=>{
  const f=facts();let r=evaluateHTOptionEligibility(option("ht_airburst"),f);assert.equal(r.checks.find(c=>c.field==="overlap_guard").status,"undetermined");f.nativeEffects["do-not-duplicate-native-airburst"]=true;assert.equal(evaluateHTOptionEligibility(option("ht_airburst"),f).status,"incompatible");
});
test("pure evaluator compatible only after ALL source-backed facts confirmed (test facts)",()=>{
  const f=facts();f.munitionClasses={values:["fixed_round"],complete:true};f.evidence.weapon_pressure_rating_verified={value:true,source:"test-source-pressure-contract"};assert.equal(evaluateHTOptionEligibility(option("ht_plus_p"),f).status,"compatible");delete f.evidence.weapon_pressure_rating_verified.source;assert.equal(evaluateHTOptionEligibility(option("ht_plus_p"),f).status,"undetermined");f.evidence.weapon_pressure_rating_verified={value:false,source:"test-source-pressure-contract"};assert.equal(evaluateHTOptionEligibility(option("ht_plus_p"),f).status,"incompatible");
});
test("unsupported future predicate remains undetermined",()=>{
  const o=structuredClone(option("ht_plus_p")),f=facts();o.eligibility_v1.conditions.future_requirement=true;assert.equal(evaluateHTOptionEligibility(o,f).checks.find(c=>c.field==="future_requirement").status,"undetermined");
});
for(const field of ["contract","on_missing_evidence","bounds","evidence-array"])test("invalid eligibility isolated to HT: "+field,async()=>{
  const {catalogs:c,service:s}=await loaded(d=>{const e=d.ht.projectile_options[0].eligibility_v1;if(field==="contract")e.contract="unknown";if(field==="on_missing_evidence")e.on_missing_evidence="compatible";if(field==="bounds"){e.conditions.minimum_caliber_mm=20;e.conditions.maximum_caliber_mm=10;}if(field==="evidence-array")e.explicit_evidence_required=null;});assert.equal(c.getStatus("ht").status,"unavailable");assert.equal(s.checkCompatibility("WlstnlxI_Mm-2UJf0","he").status,"compatible");
});
test("eligibility snapshots cannot change cached records",()=>{const r=service.checkCompatibility(python,"ht_plus_p");assert.throws(()=>r.eligibility.checks.push({}),TypeError);assert.throws(()=>r.restrictions.eligibility_v1.conditions.munition_classes_any.push("anything"),TypeError);assert.deepEqual(catalogs.getVariant("ht","ht_plus_p").eligibility_v1,option("ht_plus_p").eligibility_v1);});

test("audit bytes and weapon reference outside HT pointer preserved",async()=>{
  const proof=readAuditFixture('ht-v1-3-preservation');for(const [file,expected] of Object.entries(proof.auditHashes))assertHistoricalAudit(file,expected);
  const current=await fs.readFile(new URL("../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json",import.meta.url),"utf8");assertWeaponPreservation(current,proof);
});

test("confirmed directed HT178 ammo can provide variant context without authorizing an option",()=>{const r=service.checkCompatibility(python,"ht_plus_p",{ammoItemId:"ht_38_special_9x29mmr",availabilityTL:9});assert.equal(r.status,"undetermined");assert.equal(r.eligibility.facts.provenance[0].ammoItemId,"ht_38_special_9x29mmr");assert.ok(r.eligibility.checks.some(c=>c.field==="munition_classes_any"&&c.status==="confirmed"));});
test("known incompatible ammo context rejects but unknown pair remains undetermined",()=>{assert.equal(service.checkCompatibility(python,"ht_plus_p",{ammoItemId:"ht_22_short_5_6x11mmr"}).status,"incompatible");const audit=data.ht.interchangeability_rules.flatMap(r=>r.explicit_direction_v1?.mode_pair_assessments??[]).find(p=>p.status==="undetermined");assert.equal(service.checkCompatibility(audit.mode_id,"ht_plus_p",{ammoItemId:audit.target_ammo_item_id}).status,"undetermined");});
