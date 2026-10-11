// Reviewed cartridge identities. No weapon-name, bore or Actor TL inference.
export const HT_FACTORY_MATCH_SOURCE = "https://static.hornady.media/presscenter/docs/1411008168-1768498925-Hornady-2026-Product-Catalog.pdf";
export const HT_FACTORY_MATCH_FAMILIES = Object.freeze({
  ht_7_62x51mm_nato_308_winchester: ["80966", "8097", "8105"],
  ht_300_winchester_magnum_7_62x66mmb: ["82043", "82180"],
  ht_338_lapua_magnum_8_6x70mm: ["8230", "82300"]
});
const naturallySubsonic = ["ht_32_acp_7_65x17mmsr_browning", "ht_380_acp_9x17mm", "ht_9x18mm_makarov", "ht_45_acp_11_43x23mm", "ht_9x39mm"];
const pistolSupersonic = ["ht_22_long_rifle_5_7x16mmr", "ht_9x19mm_parabellum"];
const pdwSupersonic = ["ht_4_6x30mm_royal_ordnance", "ht_5_7x28mm_fabrique_nationale"];
// HT123/125: these exact source modes already reduce ordinary 9mm to subsonic velocity.
const nativeSubsonicModes = ["Wapl3E1_vfsL9VNHk", "W0QWktb1ew78lPGkn", "WpACBMVJjP4kIdUVH"];
const rifleSupersonicSources = Object.freeze({
  ht_7_62x39mm: "https://ppu-usa.com/ppu/7-62x39/"
});
export const HT_FRANGIBLE_SOURCE = "https://sinterfire.com/wp-content/uploads/2023/07/2023-SinterFire-Reloading-Manual-25JUL2023.pdf";
const frangibleFamilies = ["ht_380_acp_9x17mm", "ht_9x19mm_parabellum", "ht_38_special_9x29mmr", "ht_40_s_w_10x21mm",
  "ht_10x25mm_auto", "ht_45_acp_11_43x23mm", "ht_223_remington", "ht_7_62x51mm_nato_308_winchester"];

export function applyHTSubsonicExclusions(facts, mode, ammo, selectedVariants) {
  if (!selectedVariants.some(v => ["ht_subsonic_pistol", "ht_subsonic_rifle"].includes(v?.id)) ||
      !ammo?.weapon_mode_ids?.includes(mode?.weapon_mode_id)) return;
  if (naturallySubsonic.includes(ammo.id) || nativeSubsonicModes.includes(mode.weapon_mode_id)) {
    facts.availabilityTL ??= 8;
    facts.evidence.original_load_supersonic = { value: false, source: "HT165; HT123/125 native subsonic source modes" };
    facts.originalLoadSpeed = { status: "subsonic", source: facts.evidence.original_load_supersonic.source };
  }
}

export function applyHTSpecialEvidence(facts, mode, ammo, selectedVariants) {
  const selected = selectedVariants.map(v => v?.id);
  if (selected.some(v => ["ht_match_grade", "ht_subsonic_pistol", "ht_subsonic_rifle", "ht_frangible", "ht_plus_p"].includes(v)) &&
      ammo.book_cost_weight_verified && Number.isFinite(ammo.cost_per_shot_usd)) facts.baseCostPerShot = ammo.cost_per_shot_usd;
  const evidence = (id, value, source) => { facts.evidence[id] = { value, source }; };
  if (selected.includes("ht_match_grade")) {
    if (selectedVariants.some(v => v?.layer === "projectile" && !["ht_solid", "ht_hollow_point", "ht_ap", "ht_aphc"].includes(v.id)))
      facts.combinationConflicts.push("HT165 Match supports Solid/HP/AP/APHC projectiles only");
    if (facts.weaponActions.complete && facts.weaponActions.values.some(v => ["manual", "single_shot", "bolt_action", "revolver"].includes(v)) &&
        !mode.mechanism?.fire_capabilities?.includes("automatic-fire")) {
      facts.classes.exclusions ??= [];
      facts.classes.exclusions.push({ value: "automatic_weapon", source: "HT165; high-confidence catalog action_system/fire capabilities" });
    }
    const products = HT_FACTORY_MATCH_FAMILIES[ammo.id];
    if (products) {
      facts.availabilityTL ??= 8;
      evidence("factory_match_grade_for_this_ammunition", true, "HT165; Hornady 2026 p29, factory Match products " + products.join(", ") + ": " + HT_FACTORY_MATCH_SOURCE);
      facts.provenance.push({ source: "reviewed-ht-factory-match-v1", ammoItemId: ammo.id, products: [...products], references: [HT_FACTORY_MATCH_SOURCE] });
    }
  }
  if (selected.some(v => ["ht_subsonic_pistol", "ht_subsonic_rifle"].includes(v))) {
    const source = "HT165; reviewed neutral fixed-round catalog family";
    let cartridgeClass = null, supersonic = null;
    if (naturallySubsonic.includes(ammo.id) || nativeSubsonicModes.includes(mode.weapon_mode_id)) supersonic = false;
    else if (pistolSupersonic.includes(ammo.id)) { cartridgeClass = "pistol"; supersonic = true; }
    else if (pdwSupersonic.includes(ammo.id)) { cartridgeClass = "pdw"; supersonic = true; }
    else if (rifleSupersonicSources[ammo.id]) { cartridgeClass = "rifle"; supersonic = true; }
    if (cartridgeClass) {
      evidence("cartridge_pistol_class_verified", cartridgeClass === "pistol", source);
      evidence("cartridge_rifle_or_pdw_class_verified", cartridgeClass !== "pistol", source);
      facts.cartridgeClass = cartridgeClass;
    }
    if (supersonic !== null) {
      facts.availabilityTL ??= 8;
      const proof = rifleSupersonicSources[ammo.id] ?? source;
      evidence("original_load_supersonic", supersonic, supersonic ? proof : "HT165; HT123/125 native subsonic source modes");
      facts.originalLoadSpeed = { status: supersonic ? "supersonic" : "subsonic", source: facts.evidence.original_load_supersonic.source };
      facts.provenance.push({ source: "reviewed-ht-subsonic-v1", ammoItemId: ammo.id, modeId: mode.weapon_mode_id, references: [proof] });
    }
  }
  if (selected.includes("ht_frangible") && frangibleFamilies.includes(ammo.id)) {
    facts.availabilityTL ??= 8;
    evidence("frangible_construction_confirmed", true, "HT167; SinterFire 2023 pp4-11 exact cartridge construction: " + HT_FRANGIBLE_SOURCE);
    facts.provenance.push({ source: "reviewed-ht-frangible-v1", ammoItemId: ammo.id, references: [HT_FRANGIBLE_SOURCE] });
  }
  if (selected.includes("ht_plus_p")) {
    facts.availabilityTL ??= 4; // HT165 construction availability, never the Actor's TL.
    const tl = String(mode.tl ?? mode.tech_level ?? "").match(/^\d+$/);
    if (tl) facts.weaponTL = Number(tl[0]);
    facts.provenance.push({ source: "HT165 numerical +P rule; individual platform safety remains undetermined", ammoItemId: ammo.id });
  }
}
