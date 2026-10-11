// User-verified HT176-177 rows: [3] Light Cased (HT164), [4] Shotshell (HT173).
// Legacy IDs are physical ledger identities, not charge or projectile classifications.
export const HT_12G_CASE_CONSTRUCTIONS = Object.freeze({
  ht_12_gauge_2_75_18_5x70mmr: Object.freeze({
    gcsIndex: 159, sourceEquipmentId: "emis_swYROtIbe6ZY", caseConstruction: "light_cased",
    weightPerShotLb: 0.11, costPerShotUsd: 0.50, footnotes: Object.freeze([3, 4]),
    source: "HT176-177 [3,4]; HT164 Light Cased; HT173 Shotshell; user-verified source correction", baselinePlusP: false
  }),
  ht_12_gauge_2_75_18_5x70mmr_heavy_load: Object.freeze({
    gcsIndex: 160, sourceEquipmentId: "eV9LEdHXs6dUkNDpf", caseConstruction: "conventional_cased",
    weightPerShotLb: 0.13, costPerShotUsd: 0.70, footnotes: Object.freeze([4]),
    source: "HT176-177 [4]; HT173 Shotshell; user-verified source correction", baselinePlusP: false
  })
});

export function reviewedShotshellConstruction(record) {
  const reviewed = HT_12G_CASE_CONSTRUCTIONS[record?.id];
  if (!reviewed || record.gcs_index !== reviewed.gcsIndex || record.source_equipment_id !== reviewed.sourceEquipmentId ||
      record.ammunition_class !== "shotgun_shell" || record.ammunition_construction !== "fixed_cased" ||
      record.book_cost_weight_verified !== true || record.weight_per_shot_lb !== reviewed.weightPerShotLb ||
      record.cost_per_shot_usd !== reviewed.costPerShotUsd) return null;
  return reviewed;
}

// HT91/199: explicit source modes, never infer shot/slug from a shared cartridge family.
export const HT_CONFIRMED_SHOTSHELL_MODE_PROJECTILES = Object.freeze({
  Wx10NaVSr1cp1bwKv: Object.freeze({ kind: "shot", source: "HT91/199 Condor AM-402 source shot mode" }),
  "WkzlenFdgtlwesK-q": Object.freeze({ kind: "slug", source: "HT91/199 Condor AM-402 source slug mode" })
});

// Exact HT91/199 source modes share this verified chamber; never transfer these facts to another shotgun.
export function reviewedMultishotFacts(mode, ammo, variantId) {
  if (!["ht_rifled_slug","ht_baton","ht_beanbag","ht_canister","ht_shotshell","ht_buck_and_ball","ht_shrapnel","ht_duplex","ht_triplex","ht_beehive","ht_multi_flechette","ht_rubber_shot","ht_abf"].includes(variantId) || ammo?.id !== "ht_12_gauge_2_75_18_5x70mmr" ||
      !reviewedShotshellConstruction(ammo) || !ammo.weapon_mode_ids.includes(mode?.weapon_mode_id)) return null;
  const kind = HT_CONFIRMED_SHOTSHELL_MODE_PROJECTILES[mode.weapon_mode_id]?.kind;
  if (!kind) return null;
  const source = "HT91/199 Condor AM-402 explicit shot/slug modes; HT166 Rifled Slug TL6";
  const common = { source, caliberMm:18.5, weaponPlatforms:{values:["shotgun"],complete:true} };
  if (variantId!=="ht_rifled_slug") return common;
  return { ...common, availabilityTL: 6,
    evidence: { slug_load_compatible_with_chamber: { value: true, source } },
    multishotDefinition: { source, baselineKind: kind === "shot" ? "buckshot" : "slug", slugRcl: 10,
      ...(kind === "slug" ? { nativeVariant: variantId, nativeDamage: "4d pi+", nativeRange: "52/1,750", nativeRoF: "1", nativeRcl: "10" } : {}) } };
}
