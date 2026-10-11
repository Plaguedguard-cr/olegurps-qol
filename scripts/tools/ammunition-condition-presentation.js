// Presentation only. These IDs describe the approved F1/NO_CODE rows, not new effects.
export const F1_CONDITION_ROWS = Object.freeze({
  "ht_frangible:overpenetration": "F1Frangible",
  "ht_apdu:ignition": "F1DU", "ht_apdsdu:ignition": "F1DU", "ht_apfsdsdu:ignition": "F1DU",
  "ht_underwater_dart:environment": "F1Underwater",
  "ht_baton:injury": "F1Impact", "ht_beanbag:injury": "F1Impact",
  "ht_shrapnel:burst": "F1Burst", "ht_beehive:burst": "F1Burst", "ht_abf:burst": "F1Burst",
  "ht_liquid:delivery": "F1Liquid",
  "ht_tear_gas:resistance": "F1TearGas", "ht_tear_gas_vomit:resistance": "F1VomitingGas",
  "ht_white_phosphorus:removal": "F1WPRemoval",
  "ht_airburst:bonus-scatter": "F1Airburst", "ht_airburst:geometry": "F1AirburstGeometry",
  "ht_incendiary:inc-ignition": "F1Incendiary", "ht_tracer:inc-ignition": "F1TracerIncendiary",
  "ht_tracer:visibility": "F1TracerVisibility",
  "ht_heat:era": "F1ERA", "ht_hedp:era": "F1ERA",
  "ht_aphex:incendiary-info": "F1APHEX",
  "ht_white_phosphorus:hafla-smoke-manual": "F1HAFLASmoke"
});
export const NATIVE_CONDITION_ROWS = Object.freeze({
  "ht_hollow_point:zero-dr": "F1ZeroDR", "ht_frangible:zero-dr": "F1ZeroDR",
  "ht_baton:knockback": "F1Knockback", "ht_beanbag:knockback": "F1Knockback",
  "ht_shotshell:b409": "F1Shotgun"
});
const aliases = Object.freeze({
  DUIncendiary: "F1DU", NoOverpenetrationWithDR: "F1Frangible",
  NonlethalRisk: "F1Impact", DoubleKnockbackNative: "F1Knockback", PublishedBurst: "F1Burst",
  ObjectWithoutDR: "F1ZeroDR"
});
export function f1ManualConditionKey(id) { return aliases[id] ?? null; }

/** Read only the completed, permission-checked shot supplied by the existing adapter. */
export function ammunitionInstructionKeys(shot) {
  const damage = shot?.profile?.damage;
  if (!damage?.nativeSafe) return [];
  const variant = damage.variantId ?? shot.ammunition?.recipe?.variantId;
  const keys = Object.entries(F1_CONDITION_ROWS)
    .filter(([id]) => id.startsWith(variant + ":") && !id.endsWith(":hafla-smoke-manual"))
    .map(([, key]) => key);
  if (["ht_hollow_point", "ht_frangible"].includes(variant) && damage.rules?.zeroDRTreatedAs === 1)
    keys.push("F1ZeroDR");
  if (["ht_baton", "ht_beanbag"].includes(variant) && damage.rules?.knockback?.multiplier === 2)
    keys.push("F1Knockback");
  if (shot.profile.context?.shotgun?.extremelyClose === true) keys.push("F1Shotgun");
  // The approved smoke numbers belong only to this confirmed source cartridge.
  // Never infer them from WP, caliber, the Actor, the display name or a current catalog lookup.
  const ammo = shot.ammunition, environment = damage.rules?.environment;
  const mode = shot.mode?.standaloneRef?.modeId ?? ammo?.recipe?.autoProfile?.modeId;
  if (variant === "ht_white_phosphorus" && ammo?.source === "catalog" && ammo.status === "confirmed" &&
      ammo.book === "ht" && ammo.ammoId === "ht_specific_hafla_dm34_35mm_wp" &&
      mode === "Wr3VDL3Z6SR3KCz3K" && environment?.nativePreserved === true && environment.source?.kind === "reference")
    keys.push("F1HAFLASmoke");
  return [...new Set(keys)];
}
