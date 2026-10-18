import test from "node:test";
import assert from "node:assert/strict";
import { api, modes, context, resolver, inventoryFixture } from "./fixtures/ht-special-context.mjs";
import { ownerRuntime, reloadOwnerActor } from "./fixtures/ht-plus-p-owner.mjs";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";

for (const [modeId, variantId, damage] of [
  [modes.aw, "ht_apds", "9d(2) pi-"],
  [modes.aw, "ht_sapfsds", "7d(2) pi-"],
  [modes.glock, "ht_frangible", "2d+2(0.5) pi+"],
  [modes.aw, "ht_match_grade", "7d pi"],
  [modes.ak, "ht_subsonic_rifle", "3d+1 pi"]
]) test("reference authority admits fresh and persisted OWNER choices: " + variantId, async () => {
  const f = inventoryFixture(modeId, variantId), c = context(modeId), actor = reloadOwnerActor(f.actor);
  const weapon = actor.getFlag("world", "gurpsAmmoManager").weapons[0];
  const previous = { game: globalThis.game, api: globalThis.OleGURPSQOL };
  globalThis.game = { ...previous.game, ...ownerRuntime(actor, api).game };
  globalThis.OleGURPSQOL = api;
  try {
    const profile = resolver.resolve({ actorId: actor.id, weaponId: weapon.id, rawAttack: c.raw,
      binding: c.binding, ammunition: { type: f.type }, profilePolicy: "strict" });
    assert.equal(profile.damage.formula, damage); assert.equal(profile.damage.nativeSafe, true);
    const shot = createShotSnapshot(profile, { attackId: "historical" }), saved = JSON.stringify(shot);
    const before = JSON.stringify(actor.getFlag("world", "gurpsAmmoManager"));
    for (const language of ["ru", "en"]) for (const current of [weapon,
      { ...weapon, ammunitionInventory: { ...weapon.ammunitionInventory, stocks: [] } }]) {
      const type = availableAmmoTypes(actor, current, api, language).find(type => type.key === f.type.key);
      assert.ok(type); assert.equal(type.unavailable, false);
      assert.equal(type.preparation.admission.authority, "reference");
    }
    assert.equal(JSON.stringify(actor.getFlag("world", "gurpsAmmoManager")), before);
    await new AmmoService(actor).inventoryTransaction(weapon.id, "add-stock", { ammoKey: f.type.key, amount: 1 },
      { allowedTypes: current => availableAmmoTypes(actor, current, api) });
    assert.equal(actor.getFlag("world", "gurpsAmmoManager").weapons[0].totalAmmo, 11);
    assert.equal(JSON.stringify(shot), saved);
    const invalid = resolver.resolve({ rawAttack: { ...c.raw, linked: true }, binding: c.binding, ammunition: { type: f.type } });
    assert.equal(invalid.damage.nativeSafe, false);
  } finally { globalThis.game = previous.game; globalThis.OleGURPSQOL = previous.api; }
});
