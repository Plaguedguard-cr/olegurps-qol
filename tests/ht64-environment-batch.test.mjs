import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, api, context } from "./fixtures/ht-special-context.mjs";
import { ENVIRONMENT_VARIANTS, reviewEnvironmentDefinition, environmentalVisibility, gasConsequenceDuration, smokeBuildSeconds, environmentalContactSchedule } from "../scripts/tools/environment-ammunition.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { shotDamageComponents } from "../scripts/tools/damage-shot-link.js";
import { automaticAmmoMessages, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";

function numerical(id, override = {}) {
  const option = catalogs.getVariant("ht", id), conditions = option.eligibility_v1.conditions;
  const d = { variantId: id, verified: true, source: { kind: "gm", note: "isolated numeric test; no factory cartridge claim" },
    availabilityTL: Math.max(8, option.min_tl), caliberMm: 25,
    platforms: conditions.weapon_platforms_any ?? [], munitionClasses: conditions.munition_classes_any ?? [],
    projectileClasses: conditions.projectile_classes_any ?? [], baseVariantId: conditions.requires_base_variant_id,
    muzzleVelocityFps: id === "ht_liquid" ? 400 : 1500, sourceCost: 2,
    filler: { id: "isolated", name: "Isolated sourced substance", source: "fixture", dose: 1, doseUnit: "source-defined dose", route: "blood", effect: { verified: true, description: "Isolated test-only effect; no real toxic agent or invented clinical properties" }, cost: 3 },
    evidence: Object.fromEntries(option.eligibility_v1.explicit_evidence_required.map(key => [key, { value: true, source: "isolated fixture" }])),
    components: ["ht_poison_gas", "ht_white_phosphorus"].includes(id) ? [{ role: "follow-up", relation: "follow_up", formula: id === "ht_poison_gas" ? "2d cr ex" : "2d burn ex" }] : [], ...override };
  const facts = { evidence: {}, nativeEffects: { [option.eligibility_v1.overlap_guard]: false }, combinationConflicts: [],
    weaponActions: { values: ["manual"], complete: true }, provenance: [] };
  const r = reviewEnvironmentDefinition(option, facts, d);
  return { option, d, facts, r, effect: resolveAmmunitionEffects({ raw: { damage: "4d pi", range: "100/1000" }, variantId: id,
    baseStatus: "compatible", constructionStatus: "gm-approved", facts: r.facts }) };
}
test("P5 scope matches thirteen audited variants and the structured source review", async () => {
  const audit = JSON.parse(await fs.readFile(new URL("../docs/audit/ht64-independent-audit.json", import.meta.url), "utf8"));
  const review = JSON.parse(await fs.readFile(new URL("../docs/audit/olegurps_ht_64_structured_review_v1.json", import.meta.url), "utf8"));
  assert.deepEqual(audit.records.filter(r => r.implementationGroup === "P5_environment_payloads").map(r => r.variantId).sort(), Object.keys(ENVIRONMENT_VARIANTS).sort());
  for (const id of Object.keys(ENVIRONMENT_VARIANTS)) assert.deepEqual(review.records.find(r => r.id === id).conditions, catalogs.getVariant("ht", id).eligibility_v1.conditions);
});
for (const id of Object.keys(ENVIRONMENT_VARIANTS)) test(id + " exact mechanics, required evidence, TL/caliber/platform, no invented filler", () => {
  const s = numerical(id); assert.equal(s.r.status, "resolved"); assert.equal(s.effect.nativeSafe, true);
  assert.deepEqual(s.effect.rules.environment.mechanics, s.option.mechanics);
  assert.equal(s.effect.rules.environment.chatHint, s.option.chat_hint_ru);
  assert.equal(s.effect.rules.environment.automaticApplication, false);
  assert.equal(reviewEnvironmentDefinition(s.option, s.facts, null).status, "unresolved");
  assert.equal(numerical(id, { availabilityTL: s.option.min_tl - 1 }).r.status, "unresolved");
  assert.equal(numerical(id, { evidence: {} }).r.status, "unresolved");
  const prohibited = { ...s.facts, evidence: { [s.option.eligibility_v1.explicit_evidence_required[0]]: { value: false, source: "source prohibition" } } };
  assert.equal(reviewEnvironmentDefinition(s.option, prohibited, s.d).status, "unresolved");
  if (s.option.mechanics.min_caliber_mm) assert.equal(numerical(id, { caliberMm: s.option.mechanics.min_caliber_mm - .01 }).r.status, "unresolved");
  if (s.d.platforms.length) assert.equal(reviewEnvironmentDefinition(s.option, { ...s.facts, weaponPlatforms: { values: ["laser"], complete: true } }, s.d).status, "unresolved");
  if (["ht_poison", "ht_liquid", "ht_poison_gas", "ht_tear_gas", "ht_tear_gas_vomit"].includes(id)) {
    assert.equal(numerical(id, { filler: null }).r.reason, "P5FillerMissing");
    assert.equal(numerical(id, { filler: { ...s.d.filler, dose: 0 } }).r.status, "unresolved");
    assert.equal(numerical(id, { filler: { ...s.d.filler, effect: {} } }).r.reason, "P5FillerMissing");
    assert.equal(numerical(id, { filler: { ...s.d.filler, doseUnit: "" } }).r.reason, "P5FillerMissing");
  }
  const repeat = resolveAmmunitionEffects({ raw: { damage: "4d pi", range: "100/1000" }, variantId: id, baseStatus: "compatible", constructionStatus: "gm-approved", facts: s.r.facts, previousTransformations: [{ effectId: id, applied: true }] });
  assert.equal(repeat.nativeSafe, false);
});
test("liquid halves damage, quarters range and requires strictly below 500 fps", () => {
  const s = numerical("ht_liquid"); assert.equal(s.effect.formula, "2d(0.2) cr"); assert.equal(s.effect.effectiveChanges.range, "25/250");
  for (const value of [null, 0, 500, 501]) assert.equal(numerical("ht_liquid", { muzzleVelocityFps: value }).r.reason, "P5VelocityRequired");
});
test("poison retains common HP conditions, selected dose, cost and prohibits generic automatic-affliction", () => {
  const s = numerical("ht_poison"); assert.equal(s.effect.formula, "4d(0.5) pi+"); assert.equal(s.effect.rules.costPerShot, 5);
  assert.equal(s.effect.rules.hollowPoint.zeroDRTreatedAs, 1); assert.deepEqual(s.effect.rules.environment.filler, s.d.filler);
  assert.equal(numerical("ht_poison", { muzzleVelocityFps: 800 }).effect.nativeSafe, false);
  assert.equal(numerical("ht_poison", { filler: { ...s.d.filler, route: "inhaled" } }).r.status, "unresolved");
});
test("five smokes retain distinct vision and sensor rules with no invented cloud radius", () => {
  assert.equal(environmentalVisibility("ht_smoke"), -10); assert.equal(environmentalVisibility("ht_colored_smoke"), -7);
  assert.deepEqual(numerical("ht_hot_smoke").effect.rules.environment.mechanics.affects, ["infravision", "hyperspectral_vision"]);
  assert.deepEqual(numerical("ht_prism_smoke").effect.rules.environment.mechanics.affects, ["hot_smoke", "laser_beams"]);
  assert.deepEqual(numerical("ht_em_smoke").effect.rules.environment.mechanics.affects, ["hot_smoke", "radar", "imaging_radar"]);
  assert.equal(environmentalVisibility("ht_hot_smoke"), null); assert.equal(smokeBuildSeconds(undefined), null); assert.equal(smokeBuildSeconds(15), 3);
});
test("illumination and signal are distinct; gas resistances and aftermath use known numbers only", () => {
  assert.equal(environmentalVisibility("ht_illumination", { penalty: -8 }), -3);
  assert.equal(environmentalVisibility("ht_signal_flare", { penalty: -8 }), -5);
  assert.equal(environmentalVisibility("ht_signal_flare", { penalty: -1 }), -1);
  assert.equal(environmentalVisibility("ht_tear_gas", { pathYards: 2 }), -6);
  assert.equal(environmentalVisibility("ht_tear_gas_vomit", { pathYards: 5 }), -10);
  assert.equal(gasConsequenceDuration({ exposureMinutes: 2, marginOfFailure: 3 }), 5);
  assert.equal(gasConsequenceDuration({ exposureMinutes: 2, marginOfFailure: 3, vomiting: true }), 17);
  assert.equal(gasConsequenceDuration({ exposureMinutes: 2, marginOfFailure: 0 }), null);
  const tear = numerical("ht_tear_gas").effect.rules.environment.mechanics; assert.deepEqual(tear.resistance.map(r => r.modifier), [-2, -2]);
  assert.deepEqual(numerical("ht_tear_gas_vomit").effect.rules.environment.mechanics.resistance.map(r => r.modifier), [-2, -2, -2]);
  const wp = numerical("ht_white_phosphorus").effect.rules.environment.mechanics;
  assert.equal(wp.fragment_repeated_damage, "1d(0.2) burn each 10s up to 60s"); assert.equal(wp.brush_off_roll, "DX");
});
const mid = "Wr3VDL3Z6SR3KCz3K", aid = "ht_specific_hafla_dm34_35mm_wp";
function published() { const c = context(mid), p = automatic.prepare({ modeId: mid, base: c.base, variantId: "ht_white_phosphorus" }); return { c, p }; }
test("source WP ready under strict policy preserves native blast, fragments, range and source price", () => {
  const { c, p } = published(); assert.equal(p.state, "complete"); assert.equal(automatic.admission(p, { policy: "strict" }).authority, "reference");
  const shot = resolver.resolve({ actorId: "a", weaponId: "w", rawAttack: c.raw, binding: c.binding, ammunition: { type: p.type }, profilePolicy: "strict" });
  assert.equal(shot.damage.nativeSafe, true); assert.equal(shot.damage.formula, "1d-2 burn ex");
  assert.deepEqual(shot.damage.components.map(c => c.formula), ["1d-2 burn ex", "1d(0.2) cut"]);
  assert.equal(shot.damage.transformations.filter(t => t.applied).length, 0); assert.equal(shot.effective.range, "10/90");
  assert.equal(shot.damage.rules.costPerShot, undefined); assert.equal(automatic.admission(p, { approval: { active: false } }).allowed, false);
});
test("base WP derives immutable shot only; saved recipes reload, switch and native secondary Damage remain stable/private", () => {
  const { c, p } = published(), old = JSON.stringify(c.base);
  const profile = resolver.resolve({ actorId: "a", weaponId: "w", rawAttack: c.raw, binding: c.binding, ammunition: { type: c.base } });
  assert.equal(profile.ammunition.recipe.variantId, "ht_white_phosphorus"); assert.equal(JSON.stringify(c.base), old);
  const shot = createShotSnapshot(profile, { attackId: "a1", spent: 1, messageId: "m1" });
  const message = { id: "m1", visible: true, isContentVisible: true, flags: { "olegurps-qol": { shotSnapshot: shot } } };
  assert.equal(shotDamageComponents(message)[0].formula, "1d(0.2) cut");
  assert.deepEqual(shotDamageComponents({ ...message, isContentVisible: false }), []);
  const serialized = JSON.stringify(shot); const fresh = JSON.parse(serialized); c.raw.damage = "1d pi";
  assert.equal(shotDamageComponents({ ...message, flags: { "olegurps-qol": { shotSnapshot: fresh } } })[0].formula, "1d(0.2) cut");
  assert.equal(JSON.stringify(shot), serialized); assert.equal(Object.isFrozen(profile.damage.rules.environment), true);
  const saved = JSON.parse(JSON.stringify(p.type)); assert.equal(automatic.prepare({ modeId: mid, base: context(mid).base, variantId: "ht_white_phosphorus", savedType: saved }).state, "complete");
  saved.recipe.autoProfile.revision++; assert.equal(automatic.prepare({ modeId: mid, base: context(mid).base, variantId: "ht_white_phosphorus", savedType: saved }).state, "incomplete");
});
test("no bore/TL-only permissions and original excluded grenades/sprays remain excluded", () => {
  const ak = context("W27s4Lm8QlkKVKUPn");
  for (const id of Object.keys(ENVIRONMENT_VARIANTS)) {
    const p = automatic.prepare({ modeId: "W27s4Lm8QlkKVKUPn", base: ak.base, variantId: id });
    assert.notEqual(p.state, "complete"); assert.equal(automatic.admission(p, { policy: "permissive", approval: { active: true } }).allowed, false);
  }
  for (const wrong of ["W27s4Lm8QlkKVKUPn", "WwWcYlJpks2oLc-nv", "w6R_sr11lEsrygm0K"])
    assert.notEqual(automatic.prepare({ modeId: wrong, base: published().c.base, variantId: "ht_white_phosphorus" }).state, "complete");
});
test("UI uses localized RU/EN labels; saved WP stock never restores an English-only new label", () => {
  const { c, p } = published(), weapon = { id: "w", attackRef: { path: "system.ranged.mode" }, ammunitionInventory: { version: 1, stocks: [{ key: p.type.key, type: p.type, quantity: 2 }], magazines: [], installedId: null } };
  for (const lang of ["ru", "en"]) {
    const types = availableAmmoTypes({ id: "a", binding: c.binding, system: { ranged: { mode: c.raw } } }, weapon, api, lang);
    const wp = types.find(t => t.key === p.type.key); assert.equal(wp.unavailable, false);
    assert.equal(wp.label, c.base.name + " " + automaticAmmoMessages[lang].P5ht_white_phosphorus);
  }
});
test("actual locale loader fetches P5 even when prior package translations are cached", async () => {
  for (const lang of ["ru", "en"]) {
    const locale = JSON.parse(await fs.readFile(new URL("../lang/" + lang + ".json", import.meta.url), "utf8")), translations = {};
    const runtime = { location: {}, game: { i18n: { lang, translations, localize: key => key.endsWith("P5ht_white_phosphorus") ? key : "cached" } },
      fetch: async () => ({ ok: true, json: async () => locale }), foundry: { utils: { setProperty: (o, k, v) => { o[k] = v; } } } };
    await loadAutomaticAmmoTranslations(runtime);
    for (const [key, value] of Object.entries(automaticAmmoMessages[lang]).filter(([k]) => k.startsWith("P5"))) assert.equal(translations["OleGURPS.AutomaticAmmo." + key], value);
  }
});
test("WP one physical shot spends once, damage inspection/switch/reload spends nothing and deletion returns remaining rounds", async () => {
  const { c, p } = published(); let state = { weapons: [{ id: "w", attackRef: { path: "system.ranged.mode" }, ammunitionInventory: { version: 1, stocks: [], magazines: [], installedId: null } }] };
  const w = state.weapons[0]; applyInventoryOperation(w, "add-stock", { ammoKey: p.type.key, amount: 5 }, { allowedTypes: [p.type] });
  let index = 0; applyInventoryOperation(w, "add-magazines", { capacity: 2, amount: 2 }, { makeId: () => "m" + (++index) });
  applyInventoryOperation(w, "load", { magazineId: "m1", ammoKey: p.type.key, amount: 2 }, { allowedTypes: [p.type] });
  applyInventoryOperation(w, "install", { magazineId: "m1" }); projectAmmoInventory(w);
  const actor = { id: "a", isOwner: true, system: { ranged: { mode: c.raw } }, getFlag: () => state, setFlag: async (_s, _k, value) => { state = structuredClone(value); } };
  const service = new AmmoService(actor), prepare = ({ ammunition }) => ({ amount: 1, profile: resolver.resolve({ actorId: "a", weaponId: "w", rawAttack: c.raw, binding: c.binding, ammunition }) });
  const operation = { weaponId: "w", attackId: "s1", prepare, execute: async () => ({ rolled: true, message: { id: "message", setFlag: async () => {} } }) };
  const prepared = await service.executeShot(operation); assert.equal(prepared.profile.damage.nativeSafe, true);
  const after = JSON.stringify(state); await service.executeShot(operation); assert.equal(JSON.stringify(state), after);
  const fresh = JSON.parse(after); applyInventoryOperation(fresh.weapons[0], "install", { magazineId: "m2" });
  applyInventoryOperation(fresh.weapons[0], "delete-magazine", { magazineId: "m1" });
  assert.equal(fresh.weapons[0].ammunitionInventory.stocks[0].rounds, 4);
});
test("contact burning schedules cap at ten seconds or sixty seconds without automatic Rolls", () => {
  assert.equal(environmentalContactSchedule("ht_illumination", 12).intervals, 10);
  assert.equal(environmentalContactSchedule("ht_signal_flare", 2).formula, "1d burn");
  assert.deepEqual(environmentalContactSchedule("ht_white_phosphorus", 100), { formula: "1d(0.2) burn", intervalSeconds: 10, maximumSeconds: 60, intervals: 6, removalRoll: "DX", automaticApplication: false });
  assert.equal(environmentalContactSchedule("ht_white_phosphorus", 9).intervals, 0);
  assert.equal(environmentalContactSchedule("ht_white_phosphorus", null), null);
});
test("source WP selected as base refuses incomplete payload before a roll or ammunition spending", async () => {
  const { c } = published(); let state = { weapons: [{ id: "w", ammunitionInventory: { version: 1, stocks: [], magazines: [], installedId: null } }] };
  const type = { ...c.base, key: "ht:ammo-item:" + aid }, w = state.weapons[0];
  applyInventoryOperation(w, "add-stock", { ammoKey: type.key, amount: 1 }, { allowedTypes: [type] });
  applyInventoryOperation(w, "add-magazines", { capacity: 1, amount: 1 }, { makeId: () => "m" });
  applyInventoryOperation(w, "load", { magazineId: "m", ammoKey: type.key, amount: 1 }, { allowedTypes: [type] });
  applyInventoryOperation(w, "install", { magazineId: "m" }); projectAmmoInventory(w);
  const old = JSON.stringify(state), actor = { id: "a", isOwner: true, getFlag: () => state, setFlag: async (_s, _k, value) => { state = structuredClone(value); } };
  let rolls = 0;
  await assert.rejects(new AmmoService(actor).executeShot({ weaponId: "w", attackId: "blocked", prepare: ({ ammunition }) => ({ amount: 1,
    profile: resolver.resolve({ actorId: "a", weaponId: "w", rawAttack: { ...c.raw, damage: "4d pi" }, binding: c.binding, ammunition }) }),
    execute: async () => { rolls++; return { rolled: true }; } }), /IncompleteAmmunitionProfile/);
  assert.equal(rolls, 0); assert.equal(JSON.stringify(state), old);
});
test("liquid supports confirmed solid crushing baseline and refuses existing native divisors/compound effects", () => {
  const s = numerical("ht_liquid"), resolve = damage => resolveAmmunitionEffects({ raw: { damage, range: "100/1000" }, variantId: "ht_liquid", baseStatus: "compatible", constructionStatus: "gm-approved", facts: s.r.facts });
  assert.equal(resolve("4d cr").formula, "2d(0.2) cr");
  assert.equal(resolve("4d! cr").formula, "2d(0.2)! cr");
  for (const damage of ["4d(0.2) cr", "4d pi inc", "4d pi [2d cut]", "HT-2 aff"]) assert.equal(resolve(damage).nativeSafe, false);
});
