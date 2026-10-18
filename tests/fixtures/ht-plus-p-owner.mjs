import assert from "node:assert/strict";

// Actor ownership is the only authority; world persistence is deliberately unavailable.
export function ownerRuntime(actor, api) {
  return { OleGURPSQOL: api, game: { user: { id: "owner", isGM: false },
    actors: new Map([[actor.id, actor]]), settings: {
      get: (_scope, key) => key === "ammunitionProfilePolicy" ? "strict" : null,
      set: async () => { throw Error("WorldSettingWriteForbidden"); },
      register: () => { throw Error("WorldSettingRegistrationForbidden"); }
    } } };
}

// Simulate document persistence and a new client-side Actor instance.
export function reloadOwnerActor(actor) {
  const flags = JSON.parse(JSON.stringify({ world: { gurpsAmmoManager: actor.getFlag("world", "gurpsAmmoManager") },
    "olegurps-qol": { ammunitionDecisions: actor.getFlag("olegurps-qol", "ammunitionDecisions") ?? {} } }));
  return { ...actor, getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); } };
}

export function assertUnprovenPressure(profile) {
  assert.equal(profile.construction.status, "undetermined");
  assert.equal(profile.damage.rules.pressureAdmission.legacyPolicyAdmission, true);
  assert.equal(profile.damage.rules.pressureAdmission.ratingVerified, false);
  assert.equal(profile.damage.rules.pressureAdmission.ratingSource, null);
  assert.equal(profile.damage.rules.pressureAdmission.basis, "preserved-legacy-policy");
}
