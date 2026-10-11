import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalogs, modes, compatibility, automatic, context, profile, inventoryFixture, resolver } from "./fixtures/ht-special-context.mjs";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { CARTRIDGE_LOAD_IDS, handloadCondition } from "../scripts/tools/cartridge-load-conditions.js";
import { hasLegacyPlusPAdmission, LEGACY_PLUS_P_PAIR_COUNT, LEGACY_PLUS_P_AUTOMATIC_COUNT } from "../scripts/tools/legacy-plus-p-admission.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { AttackProfileResolver } from "../scripts/tools/attack-profile-resolver.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { recipeFingerprint } from "../scripts/tools/ammunition-approval-service.js";
import { evaluateHTOptionEligibility } from "../scripts/ht-option-eligibility.js";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { automaticAmmoMessages, automaticAmmoText } from "../scripts/tools/automatic-ammunition-localization.js";
import { api } from "./fixtures/ht-special-context.mjs";

const scope = { actorId: "actor", weaponId: "individual-one", modeId: modes.aw, ammoId: context(modes.aw).base.ammoId };
const facts = () => ({ evidence: Object.fromEntries(["matched_to_this_individual_weapon", "armoury_and_iq_guns_success", "handloaded_batch"].map(k => [k, { value: true, source: "synthetic confirmed-result fixture; not a factory cartridge" }])),
  weaponActions: { values: ["bolt_action"], complete: true }, handloadDefinition: { ...scope, batchId: "batch-one", handloaded: true,
    source: "synthetic HT174 contract", armoury: { skill: "Armoury", target: 13, total: 10, success: true, reference: "confirmed-check-A" },
    iqGuns: { skill: "Guns", basedOn: "IQ", target: 12, total: 11, success: true, reference: "confirmed-check-G" } } });
const handload = (f = facts(), c = scope, acc = "6+3") => resolveAmmunitionEffects({ raw: { damage: "7d pi", acc },
  variantId: "ht_match_handloaded", baseStatus: "compatible", constructionStatus: "compatible", facts: f, context: c });

test("P1 all six catalogue contracts and source mechanics remain unchanged", () => {
  assert.equal(CARTRIDGE_LOAD_IDS.length, 6);
  for (const id of CARTRIDGE_LOAD_IDS) assert.equal(catalogs.getVariant("ht", id).layer, "cartridge_upgrade");
  assert.equal(catalogs.getVariant("ht", "ht_match_handloaded").mechanics.accuracy_bonus_cap, 2);
  assert.equal(catalogs.getVariant("ht", "ht_silent").mechanics.hearing_table_distance_yards, 16);
});
test("handloaded arithmetic floor/cap two preserves scope and original damage; factory Match remains cap one", () => {
  for (const [base, expected] of [[0,0],[1,1],[2,3],[3,4],[4,6],[6,8],[10,12]]) {
    const p = handload(facts(), scope, base + "+3");
    assert.equal(p.nativeSafe, true); assert.equal(p.effectiveChanges.acc, expected); assert.equal(p.effectiveChanges.scopeBonus, 3);
    assert.equal(p.formula, "7d pi"); assert.equal(p.rules.costMultiplier, 1);
  }
  assert.equal(profile(modes.aw, "ht_match_grade").effective.acc, 7);
  assert.equal(handload().effectiveChanges.acc, 8);
});
test("handload cannot cross identical-model gun, actor, mode or ammo identities", () => {
  for (const field of Object.keys(scope)) assert.equal(handload(facts(), { ...scope, [field]: "different" }).reason, "P1HandloadWeaponMismatch");
  assert.equal(handload(facts(), {}).nativeSafe, false);
  const f = facts(); f.weaponActions.values = ["automatic"]; assert.equal(handload(f).nativeSafe, false);
});
test("handload requires both actually confirmed successful skill checks and real batch evidence", () => {
  for (const check of ["armoury", "iqGuns"]) for (const change of [{ success: false },{ total: 17, target: 20 },{ reference: "" },{ total: 14 }]) {
    const f = facts(); Object.assign(f.handloadDefinition[check], change); assert.equal(handload(f).reason, "P1HandloadChecksMissing");
  }
  const f = facts(); f.handloadDefinition.iqGuns.basedOn = "DX"; assert.equal(handload(f).nativeSafe, false);
  delete f.handloadDefinition.batchId; assert.equal(handloadCondition(f), "P1HandloadEvidenceMissing");
  assert.equal(handload({}).nativeSafe, false);
});
test("handload native accuracy and immutable journal cannot apply the personal bonus twice", () => {
  const f = facts(); f.handloadDefinition.nativeAccuracyIncluded = true;
  const native = handload(f); assert.equal(native.effectiveChanges, undefined); assert.equal(native.transformations[0].applied, false);
  const p = handload(); assert.equal(resolveAmmunitionEffects({ raw: { damage: "7d pi", acc: "6+3" }, variantId: "ht_match_handloaded",
    baseStatus: "compatible", constructionStatus: "compatible", facts: facts(), context: scope, previousTransformations: p.transformations }).nativeSafe, false);
});
test("Match general manual/single-shot/revolver/bolt actions and HP/AP/APHC preserve native Damage without reapplication", () => {
  const option=catalogs.getVariant('ht','ht_match_grade');
  for(const action of ['manual','single_shot','revolver','bolt_action'])for(const projectile of ['solid','hollow_point','ap','aphc']){
    const f={availabilityTL:8,weaponActions:{values:[action],complete:true},projectileClasses:{values:[projectile],complete:true},
      classes:{values:[],complete:true},evidence:{factory_match_grade_for_this_ammunition:{value:true,source:'synthetic factory construction fixture'}}};
    assert.equal(evaluateHTOptionEligibility(option,f).status,'compatible');
    const raw={damage:projectile==='hollow_point'?'7d(0.5) pi+':projectile==='solid'?'7d pi':'7d(2) pi-',acc:'6+3'};
    const p=resolveAmmunitionEffects({raw,variantId:'ht_match_grade',baseStatus:'compatible',constructionStatus:'compatible',facts:f});
    assert.equal(p.nativeSafe,true);assert.equal(p.formula,raw.damage);assert.equal(p.effectiveChanges.acc,7);
  }
  const raw={damage:'7d(2) pi-',acc:'6+3'},p=resolveAmmunitionEffects({raw,variantId:'ht_match_handloaded',baseStatus:'compatible',constructionStatus:'compatible',facts:facts(),context:scope});
  assert.equal(p.formula,raw.damage);assert.equal(p.effectiveChanges.acc,8);
});
test("Silent confirmed captive-piston fixture preserves source ballistic stats; exact Hearing table not universal modifier", () => {
  const raw = { damage: "2d pi", range: "100/1000", acc: 2 }, f = { baseCostPerShot: 1,
    evidence: { silent_ammunition_design_confirmed_for_weapon: { value: true, source: "synthetic design fixture" } },
    silentDefinition: { ...scope, captivePiston: true, specialFirearmCompatible: true, source: "synthetic exact design", baseDamage: raw.damage, sourceRange: raw.range } };
  const run = (facts=f, context=scope, source=raw) => resolveAmmunitionEffects({ raw: source, variantId: "ht_silent", baseStatus: "compatible", constructionStatus: "compatible", facts, context });
  const p = run(); assert.equal(p.nativeSafe, true); assert.equal(p.formula, raw.damage); assert.equal(p.effectiveChanges, undefined);
  assert.equal(p.rules.costPerShot, 10); assert.equal(p.rules.silent.hearingTableDistanceYards, 16); assert.equal(p.rules.silent.universalHearingModifier, null);
  assert.equal(p.support.status, "GM-MEDIATED"); assert.equal(run({}, scope).nativeSafe, false);
  assert.equal(run(f, { ...scope, modeId: "another" }).nativeSafe, false);
  assert.equal(run(f, scope, { ...raw, range: "200/1000" }).nativeSafe, false);
  f.silentDefinition.nativeCostIncluded = true; assert.equal(run().rules.costPerShot, 1);
});
test("no real handloaded or Silent batch is fabricated from factory Match or permissive policy", () => {
  for (const variantId of ["ht_match_handloaded", "ht_silent"]) {
    const p = automatic.prepare({ modeId: modes.aw, base: context(modes.aw).base, variantId });
    assert.equal(p.state, "incomplete"); assert.equal(automatic.admission(p, { policy: "permissive", approval: { active: true } }).allowed, false);
    assert.equal(profile(modes.aw, variantId).damage.nativeSafe, false);
  }
});
test("legacy +P policy list is frozen; neither GM approval nor policy admits a new unproven pair", () => {
  assert.equal(LEGACY_PLUS_P_PAIR_COUNT, 400); assert.equal(LEGACY_PLUS_P_AUTOMATIC_COUNT, 370);
  assert.equal(hasLegacyPlusPAdmission(catalogs, modes.glock, context(modes.glock).base.ammoId), true);
  const p = automatic.prepare({ modeId: modes.glock, base: context(modes.glock).base, variantId: "ht_plus_p" });
  assert.equal(p.facts.legacyPlusPAdmission, true); assert.equal(p.facts.evidence.weapon_pressure_rating_verified?.value, undefined);
  assert.equal(automatic.admission(p, { policy: "permissive" }).allowed, true);
  const shot = profile(modes.glock, "ht_plus_p");
  assert.deepEqual(shot.damage.rules.pressureAdmission, { legacyPolicyAdmission: true, ratingVerified: false,
    ratingSource: null, basis: "preserved-legacy-policy" });
  const fresh = structuredClone(p); fresh.facts.legacyPlusPAdmission = false;
  for (const policy of ["permissive", "strict"]) assert.deepEqual(automatic.admission(fresh, { policy, approval: { active: true } }), { allowed: false, authority: "pressure-proof-required" });
  fresh.facts.evidence.weapon_pressure_rating_verified = { value: true, source: "synthetic verified platform rating" };
  fresh.rulesStatus = "compatible"; assert.equal(automatic.admission(fresh, { policy: "strict" }).allowed, true);
  const changed = { getMode: id => ({ ...catalogs.getMode(id), stats: { ...catalogs.getMode(id).stats, range: "1/2" } }), getEquipmentForMode: id => catalogs.getEquipmentForMode(id) };
  assert.equal(hasLegacyPlusPAdmission(changed, modes.glock, context(modes.glock).base.ammoId), false);
});
test("saved +P recipe and source stats stay unchanged; Subsonic classes/native exclusions and snapshot survive reload", () => {
  const before=JSON.parse(fs.readFileSync('docs/audit/ht64-cartridge-loads-before.json','utf8'));
  for (const pair of before.p1.ht_plus_p.pairs) assert.equal(hasLegacyPlusPAdmission(catalogs, pair.modeId, pair.ammoId), true);
  assert.equal(compatibility.checkCompatibility(modes.mp5, "ht_subsonic_rifle").status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.ak, "ht_subsonic_pistol").status, "incompatible");
  assert.equal(compatibility.checkCompatibility("Wapl3E1_vfsL9VNHk", "ht_subsonic_pistol").status, "incompatible");
  const p = profile(modes.ak, "ht_subsonic_rifle"); assert.equal(p.damage.formula, "3d+1 pi"); assert.equal(p.effective.range, "300/1860");
  const shot = createShotSnapshot(p,{attackId:'p1',spent:1,messageId:'attack'}), text=JSON.stringify(shot);
  profile(modes.aw,"ht_match_grade"); assert.equal(JSON.stringify(JSON.parse(text)),text); assert.equal(Object.isFrozen(shot.profile),true);
});
test("new +P source combination cannot roll from copied legacy recipe or old GM approval without pressure proof", () => {
  const c=context(modes.glock), altered={ getMode: id=>({...catalogs.getMode(id),stats:{...catalogs.getMode(id).stats,range:"161/1801"}}),
    getEquipmentForMode:id=>catalogs.getEquipmentForMode(id),getAmmoItem:(...args)=>catalogs.getAmmoItem(...args),
    getCatalog:(...args)=>catalogs.getCatalog(...args),getVariant:(...args)=>catalogs.getVariant(...args) };
  const service=new AutomaticAmmunitionProfileService({catalogs:altered,compatibility});
  const p=service.prepare({modeId:modes.glock,base:c.base,variantId:'ht_plus_p'});
  assert.equal(p.facts.legacyPlusPAdmission,false);assert.equal(p.state,'complete');
  const approval={actorId:'actor',weaponId:'weapon',modeId:modes.glock,active:true,ammoId:c.base.ammoId,variantId:'ht_plus_p',
    recipeId:p.type.recipe.customId,fingerprint:recipeFingerprint(p.type)};
  const engine=new AttackProfileResolver({catalogs:altered,compatibility,automaticProfiles:service});
  for(const policy of ['permissive','strict']){
    const shot=engine.resolve({actorId:'actor',weaponId:'weapon',rawAttack:{...c.raw,range:'161/1801'},binding:c.binding,
      ammunition:{type:p.type},approval,profilePolicy:policy});
    assert.equal(shot.damage.nativeSafe,false);assert.equal(shot.damage.reason,'P1PressureProofRequired');
    assert.equal(shot.damage.rules.pressureAdmission.basis,'pressure-proof-required');
  }
});
test("P1 shared AmmoService spends once and repeat attack/reload retain old snapshot", async () => {
  const f=inventoryFixture(modes.ak,"ht_subsonic_rifle"),before=JSON.stringify(f.actor.system);
  const result=await f.service.executeShot({weaponId:'weapon',attackId:'p1',prepare:f.prepare,execute:async()=>({rolled:true,message:{id:'attack'}})});
  assert.equal(result.spent,1);assert.equal(f.state().weapons[0].totalAmmo,9);
  const old=JSON.stringify(result.snapshot);await f.service.inventoryTransaction('weapon','install',{magazineId:'m2'});
  const duplicate=await new f.service.constructor(f.actor).executeShot({weaponId:'weapon',attackId:'p1',prepare:()=>{throw Error('MustNotRecompute');}});
  assert.equal(duplicate.duplicate,true);assert.equal(f.state().weapons[0].totalAmmo,9);assert.equal(JSON.stringify(result.snapshot),old);assert.equal(JSON.stringify(f.actor.system),before);
});
test("P1 new labels and reason keys have exact RU/EN parity and real unavailable UI choices", () => {
  const f=inventoryFixture(modes.aw,'ht_match_grade');
  for(const lang of ['ru','en']) {
    const locale=JSON.parse(fs.readFileSync('lang/'+lang+'.json','utf8'));
    for(const [key,text] of Object.entries(automaticAmmoMessages[lang]).filter(([key])=>key.startsWith('P1')))assert.equal(locale['OleGURPS.AutomaticAmmo.'+key],text);
    const types=availableAmmoTypes(f.actor,f.state().weapons[0],api,lang);
    for(const id of ['ht_match_handloaded','ht_silent']) {const t=types.find(t=>t.recipe?.variantId===id);assert.equal(t.unavailable,true);assert.ok(t.label.includes(automaticAmmoText('P1'+id,lang)));
      assert.equal(t.reason,automaticAmmoText(id==='ht_silent'?'P1SilentEvidenceMissing':'P1HandloadEvidenceMissing',lang));}
  }
});
