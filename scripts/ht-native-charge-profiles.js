import { LEMAT } from "./ht-physical-ammunition-evidence.js";
// User-verified source provenance. Divisor syntax alone never establishes construction.
const entry = (ammoId, nativeDamage, construction, source, extra = {}) => Object.freeze({
  version: 1, ammoId, nativeDamage, construction, source, projectileEffectsIncluded: true, ...extra
});
export const HT_NATIVE_PLUS_P_BASELINES = Object.freeze({
  W5biN11nvUhQ00ewl: entry("ht_13x92mmsr_mauser", "5dx2(2) pi", "aphc", "HT112/120/167"),
  WApJkhMAYa4wlXViK: entry("ht_5_7x28mm_fabrique_nationale", "2d+2(2) pi-", "aphc", "HT101-102/167"),
  WTrwxX4jwWz6xKiPz: entry("ht_5_7x28mm_fabrique_nationale", "3d-1(2) pi-", "aphc", "HT124/126/167"),
  "WYmXQkUoq1luUajT-": entry("ht_9x21mm_gyurza", "3d-2(2) pi-", "aphc", "HT101-102/167"),
  WecVKS0hiwdjXu_uS: entry("ht_9x21mm_gyurza", "3d-1(2) pi-", "aphc", "HT124/126/167"),
  WgOt4XUnNzTOpdiAO: entry("ht_9x39mm", "3d(2) pi-", "aphc", "HT118/120/167", { originalSubsonic: true }),
  WHsI3V0zdU2TUI6w7: entry("ht_476_enfield_12_05x22mmr", "2d(0.5) pi++", "hollow_point", "HT91/166-167"),
  WK6cr08HEjTSsvYNS: entry("ht_14_5x114mm", "8dx2(2) pi inc", "aphci_tracer", "HT134/137/167", { individualGMRequired: true }),
  W10jqOZ0kjeSuoY3C: entry("ht_5_66x39mm", "5d imp", "underwater_dart", "HT85/117/169", {
    individualGMRequired: true, underwaterDistanceMultiplier: 25, maximumDepthFeet: 130, automatic: true }),
  WdzSSShGT_yv4ctOi: entry(LEMAT.shotAmmoId, "1d(0.5) pi-", "powder_shot", "HT94/165-166; OleGURPS physical identity correction v1",
    { individualGMRequired: true })
});

// Explicit safety refusals apply even to an approved recipe. They never rewrite saved resources.
export const HT_NATIVE_PLUS_P_RESTRICTIONS = Object.freeze({
  W7i4ZauQl8q2o5nTt: "plus-p-low-damage-roundtrip-unverified"
});

export function reviewedNativePlusPBaseline(mode, ammo) {
  const proof = HT_NATIVE_PLUS_P_BASELINES[mode?.weapon_mode_id];
  if (!proof || ammo?.id !== proof.ammoId || !ammo.weapon_mode_ids?.includes(mode.weapon_mode_id) ||
      !mode.ht_ammo_item_ids?.includes(ammo.id) || mode.ht_ammo_resolution?.status !==
        (proof.construction === "powder_shot" ? "source_verified_existing_round" : "exact_chambering") ||
      mode.raw_calc?.damage !== proof.nativeDamage || mode.role !== "attack" || mode.hidden || mode.combat_type !== "ranged" ||
      !["firearm", "gunner"].includes(mode.weapon_family) ||
      ammo.ammunition_class !== (proof.construction === "powder_shot" ? "separate_powder_and_shot" : "small_arms_cartridge") ||
      ammo.ammunition_construction !== (proof.construction === "powder_shot" ? "powder_and_shot" : "fixed_cased") ||
      mode.resolution_flags?.length || ammo.native_linked_mode_ids?.length) return null;
  return { ...proof, modeId: mode.weapon_mode_id };
}
