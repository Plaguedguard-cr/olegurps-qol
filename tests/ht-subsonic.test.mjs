import test from "node:test";
import assert from "node:assert/strict";
import { modes, profile, context, compatibility, automatic, inventoryFixture, api } from "./fixtures/ht-special-context.mjs";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { shotAmmunitionConditions, resolveDamageShotLink } from "../scripts/tools/damage-shot-link.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
for (const [mode, variant, damage, range, hearing] of [[modes.glock, "ht_subsonic_pistol", "2d+2 pi", "128/1440", -1],
  [modes.mp5, "ht_subsonic_pistol", "3d-1 pi", "136/1520", -1], [modes.mp7, "ht_subsonic_rifle", "2d+2 pi-", "108/1140", -2],
  [modes.ak, "ht_subsonic_rifle", "3d+1 pi", "300/1860", -2]]) test("Subsonic source calculations " + mode, () => {
  const p = profile(mode, variant); assert.equal(p.damage.nativeSafe, true); assert.equal(p.damage.formula, damage);
  assert.equal(p.effective.range, range); assert.equal(p.damage.rules.hearing.modifier, hearing);
  assert.equal(p.damage.rules.hearing.application, "manual-GM"); assert.equal(p.damage.rules.costMultiplier, 1.3);
  assert.equal(p.damage.support.status, "GM-MEDIATED"); assert.equal(p.effective.rof, p.raw.rof); assert.equal(p.effective.rcl, p.raw.rcl);
  assert.equal(p.effective.acc, p.raw.acc); assert.ok(Object.isFrozen(p.damage.rules.hearing));
});
test("already subsonic families and native suppressed modes reject a second conversion", () => {
  for (const mode of ["Wapl3E1_vfsL9VNHk", "W0QWktb1ew78lPGkn", "WpACBMVJjP4kIdUVH", "WgOt4XUnNzTOpdiAO", "W7NtnojR74un6e1j2", "WYheeWjkm9YieUNJm"])
    for (const variant of ["ht_subsonic_pistol", "ht_subsonic_rifle"]) assert.equal(compatibility.checkCompatibility(mode, variant).status, "incompatible");
});
test("classification follows the cartridge, unknown velocity remains undetermined", () => {
  assert.equal(compatibility.checkCompatibility(modes.mp5, "ht_subsonic_rifle").status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.ak, "ht_subsonic_pistol").status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.aw, "ht_subsonic_rifle").status, "undetermined");
  const p = profile(modes.aw, "ht_subsonic_rifle"); assert.equal(p.damage.nativeSafe, false);
});
test("raw guard, existing native effects, divisor and journal prevent duplicate Subsonic", () => {
  const p = profile(modes.ak, "ht_subsonic_rifle"), c = context(modes.ak);
  for (const rawAttack of [{ ...c.raw, range: "?" }, { ...c.raw, damage: "5d(2) pi" }, { ...c.raw, ammunitionEffects: ["subsonic"] }])
    assert.equal(profile(modes.ak, "ht_subsonic_rifle", { rawAttack }).damage.nativeSafe, false);
  assert.equal(resolveAmmunitionEffects({ raw: c.raw, variantId: "ht_subsonic_rifle", baseStatus: "compatible",
    constructionStatus: "compatible", facts: p.construction.eligibility.facts, previousTransformations: p.transformations }).nativeSafe, false);
});
test("Subsonic preview updates Range and 1/2D once, without Actor writes", () => {
  const f = inventoryFixture(modes.ak, "ht_subsonic_rifle"); f.actor.system.ranged.mode.halfd = "500";
  globalThis.OleGURPSQOL = api; const before = JSON.stringify(f.actor.system);
  const a = { data: f.actor.system.ranged.mode, path: "system.ranged.mode" };
  const once = withRuntimeAmmoStats(a, f.actor), twice = withRuntimeAmmoStats(once, f.actor);
  assert.equal(once.data.range, "300/1860"); assert.equal(once.data.halfd, 300); assert.deepEqual(twice, once);
  assert.equal(JSON.stringify(f.actor.system), before);
});
test("standalone preview finds its physical carrier by saved weapon and mode IDs", async () => {
  const f = inventoryFixture(modes.ak, "ht_subsonic_rifle"), get = f.actor.getFlag, set = f.actor.setFlag;
  let owned;
  f.actor.getFlag = (scope, key) => scope === "olegurps-qol" && key === "standaloneWeapons" ? owned : get(scope, key);
  f.actor.setFlag = async (scope, key, value) => {
    if (scope === "olegurps-qol" && key === "standaloneWeapons") owned = value; else await set(scope, key, value);
  };
  const { StandaloneWeaponService, StandaloneWeaponDraft } = await import("../scripts/tools/standalone-weapon-service.js");
  const { readStandaloneAttack } = await import("../scripts/tools/standalone-attack-service.js");
  const draft = new StandaloneWeaponDraft({ catalogs: api.catalogs, type: "ranged" });
  draft.selectModel(api.catalogs.getEquipmentForMode(modes.ak).equipment_id);
  const record = await new StandaloneWeaponService(f.actor, api.catalogs).save(draft);
  Object.assign(f.state().weapons[0], { standaloneWeaponId: record.id, standaloneModeId: modes.ak, attackRef: {} });
  globalThis.OleGURPSQOL = api;
  const attack = readStandaloneAttack(f.actor, record.id, modes.ak), before = JSON.stringify(f.actor.system);
  const adjusted = withRuntimeAmmoStats(attack, f.actor);
  assert.equal(adjusted.data.range, "300/1860"); assert.equal(JSON.stringify(f.actor.system), before);
  const foreign = { ...attack, standaloneRef: { ...attack.standaloneRef, weaponId: "other-weapon" } };
  assert.equal(withRuntimeAmmoStats(foreign, f.actor).data.range, attack.data.range);
});
test("Subsonic stock, one spend, magazine switch, reload, historical repeated Damage and RU/EN", async () => {
  const f = inventoryFixture(modes.ak, "ht_subsonic_rifle"); const beforeSystem = JSON.stringify(f.actor.system);
  const result = await f.service.executeShot({ weaponId: "weapon", attackId: "shot", prepare: f.prepare, execute: async () => ({ rolled: true, message: { id: "attack" } }) });
  assert.equal(result.spent, 1); assert.equal(f.state().weapons[0].totalAmmo, 9);
  const historical = JSON.stringify(result.snapshot);
  await f.service.inventoryTransaction("weapon", "install", { magazineId: "m2" });
  assert.equal(f.state().weapons[0].totalAmmo, 9);
  const duplicate = await new f.service.constructor(f.actor).executeShot({ weaponId: "weapon", attackId: "shot", prepare: () => { throw Error("MustNotRecalculate"); } });
  assert.equal(duplicate.duplicate, true);
  const source = { id: "attack", visible: true, isContentVisible: true, flags: { "olegurps-qol": { shotSnapshot: JSON.parse(historical) } } };
  const damage = { visible: true, isContentVisible: true, flags: { "olegurps-qol": { damageLink: { status: "linked", originatingAttackMessageId: "attack", attackId: "shot" } } } };
  for (const lang of ["ru", "en"]) {
    const runtime = { game: { i18n: { lang }, messages: new Map([["attack", source]]) } };
    const notes = shotAmmunitionConditions(source, runtime); assert.equal(notes.length, 1); assert.match(notes[0], /-2/);
    assert.equal(resolveDamageShotLink(damage, runtime).shotSnapshot.damage.formula, "3d+1 pi");
    assert.equal(resolveDamageShotLink(damage, runtime).shotSnapshot.damage.rules.hearing.modifier, -2);
    const types = availableAmmoTypes(f.actor, f.state().weapons[0], api, lang);
    assert.equal(types.find(t => t.key === f.type.key).unavailable, false);
    assert.doesNotMatch(ammoManagementHTML(f.state().weapons[0], { ammoKey: f.type.key, language: lang }, types), /data-recipe-editor/);
  }
  source.isContentVisible = false; assert.deepEqual(shotAmmunitionConditions(source), []);
  assert.equal(JSON.stringify(result.snapshot), historical); assert.equal(JSON.stringify(f.actor.system), beforeSystem);
});
