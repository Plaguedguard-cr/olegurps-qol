import test from "node:test";
import assert from "node:assert/strict";
import { modes, profile, context, compatibility, automatic, inventoryFixture, api } from "./fixtures/ht-special-context.mjs";
import { resolveAimedFireBonuses } from "../scripts/tools/fire-service.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
import { resolveDamageShotLink } from "../scripts/tools/damage-shot-link.js";
for (const [modeId, scope] of [[modes.aw, 3], ["WUUPXVnYQI61MZ71z", 2], ["Wn6vWZmf30XK2i2l6", 3]])
  test("Match confirmed factory family on " + modeId, () => {
    const p = profile(modeId, "ht_match_grade"); assert.equal(p.damage.nativeSafe, true); assert.equal(p.effective.acc, 7);
    assert.equal(p.effective.scopeBonus, scope); assert.equal(p.damage.formula, p.raw.damage); assert.equal(p.effective.range, p.raw.range);
    assert.equal(p.damage.rules.costMultiplier, 2); assert.equal(p.damage.support.status, "AUTOMATED");
    assert.equal(p.construction.status, "compatible"); assert.equal(p.ammunition.recipe.autoProfile.revision, 1);
    assert.ok(p.ammunition.recipe.autoProfile.source.references.some(r => r.source === "reviewed-ht-factory-match-v1"));
  });
test("Match floor, maximum +1, scope preserved, and bonus only through existing Aim", () => {
  for (const [base, expected] of [[0, 0], [2, 2], [3, 3], [4, 5], [6, 7], [10, 11]]) {
    const p = resolveAmmunitionEffects({ raw: { damage: "7d pi", acc: base + "+3" }, variantId: "ht_match_grade",
      baseStatus: "compatible", constructionStatus: "compatible" });
    assert.equal(p.effectiveChanges.acc, expected); assert.equal(p.effectiveChanges.scopeBonus, 3);
    assert.equal(resolveAimedFireBonuses({ accuracy: expected, scopeBonus: 3, aimSeconds: 0 }).aimedFireBonus, 0);
    if (base === 6) {
      assert.equal(resolveAimedFireBonuses({ accuracy: expected, scopeBonus: 3, aimSeconds: 1 }).aimedFireBonus, 10);
      assert.equal(resolveAimedFireBonuses({ accuracy: expected, scopeBonus: 3, aimSeconds: 1, moveAndAttack: true }).aimedFireBonus, 0);
    }
  }
});
test("Match automatic, +P and unsuitable projectiles prohibited; unknown factory or handload proof stays unknown", () => {
  assert.equal(compatibility.checkCompatibility(modes.ak, "ht_match_grade").status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.aw, "ht_match_grade", { selectedVariantIds: ["ht_plus_p"] }).status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.aw, "ht_match_grade", { selectedVariantIds: ["ht_apds"] }).status, "incompatible");
  assert.equal(compatibility.checkCompatibility("W1FMPB_-58qp_bH-M", "ht_match_grade").status, "undetermined");
  assert.equal(compatibility.checkCompatibility(modes.aw, "ht_match_handloaded").status, "undetermined");
});
test("Match guard preserves raw source, rejects unknown Acc and tampered saved rule, and applies once", () => {
  const p = profile(modes.aw, "ht_match_grade");
  assert.equal(profile(modes.aw, "ht_match_grade", { rawAttack: { ...p.raw, acc: "?" } }).damage.nativeSafe, false);
  assert.equal(resolveAmmunitionEffects({ raw: p.raw, variantId: "ht_match_grade", baseStatus: "compatible", constructionStatus: "compatible",
    previousTransformations: p.transformations }).nativeSafe, false);
  const type = automatic.prepare({ modeId: modes.aw, base: context(modes.aw).base, variantId: "ht_match_grade" }).type;
  const forged = structuredClone(type); forged.recipe.autoProfile.model.rule.accuracyFactor = 99;
  assert.equal(profile(modes.aw, "ht_match_grade", { ammunition: { type: forged } }).damage.nativeSafe, false);
  assert.equal(p.raw.acc, "6+3"); assert.ok(Object.isFrozen(p.ammunition.recipe.autoProfile));
});
test("Match stock, Fire Control Acc, reload and repeated native Damage use historical snapshot without double spend", async () => {
  const f = inventoryFixture(modes.aw, "ht_match_grade"); globalThis.OleGURPSQOL = api;
  const attack = { data: f.actor.system.ranged.mode, path: "system.ranged.mode", acc: 6, scopeBonus: 3 };
  const before = JSON.stringify(f.actor.system), preview = withRuntimeAmmoStats(attack, f.actor);
  assert.equal(preview.acc, 7); assert.equal(preview.scopeBonus, 3); assert.equal(preview.data.acc, 7);
  assert.deepEqual(withRuntimeAmmoStats(preview, f.actor), preview);
  for (const lang of ["ru", "en"]) {
    const types = availableAmmoTypes(f.actor, f.state().weapons[0], api, lang);
    assert.equal(types.find(t => t.key === f.type.key).unavailable, false);
    assert.doesNotMatch(ammoManagementHTML(f.state().weapons[0], { ammoKey: f.type.key, language: lang }, types), /data-recipe-editor/);
  }
  const result = await f.service.executeShot({ weaponId: "weapon", attackId: "match", prepare: f.prepare,
    execute: async () => ({ rolled: true, message: { id: "attack" } }) });
  const saved = JSON.stringify(result.snapshot); assert.equal(result.spent, 1); assert.equal(f.state().weapons[0].totalAmmo, 9);
  await f.service.inventoryTransaction("weapon", "install", { magazineId: "m2" });
  const source = { id: "attack", visible: true, isContentVisible: true, flags: { "olegurps-qol": { shotSnapshot: JSON.parse(saved) } } };
  const damage = { visible: true, isContentVisible: true, flags: { "olegurps-qol": { damageLink: { status: "linked", originatingAttackMessageId: "attack", attackId: "match" } } } };
  for (let i = 0; i < 2; i++) {
    const s = resolveDamageShotLink(damage, { game: { messages: new Map([["attack", source]]) } }).shotSnapshot;
    assert.equal(s.damage.formula, "7d pi"); assert.equal(s.damageAttack.acc, 7);
  }
  assert.equal(f.state().weapons[0].totalAmmo, 9); assert.equal(JSON.stringify(result.snapshot), saved);
  assert.equal(JSON.stringify(f.actor.system), before);
});
