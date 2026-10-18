import { correctedHTLabel, correctedHTModeStatistics, correctedHTSkillDefaults, reviewedHTModeIdentity, reviewedHTAmmoIdentity } from "./ht-source-corrections.js";
import { projectHTPreGaussMode } from './ht-pre-gauss-profiles.js';
import { projectHTLaserMode } from './ht-laser-source.js';
// Runtime source correction only. The imported HT176 row and source hashes stay untouched.
export const LEMAT = Object.freeze({ equipmentId: "ezbrl54zlak7I4wFF", revolverModeId: "WbrBqEG-vOeKVREkf",
  shotModeId: "WdzSSShGT_yv4ctOi", revolverAmmoId: "ht_42_caplock_lemat",
  shotAmmoId: "olegurps_lemat_18g_shot_charge", source: "HT94; user-verified LeMat barrel identity correction v1" });
export const LEMAT_SHOT_CHARGE = Object.freeze({ id: LEMAT.shotAmmoId, name: "18G (LeMat)",
  ammo_family_id: "olegurps_lemat_18g_powder_and_shot", ammunition_class: "separate_powder_and_shot",
  ammunition_construction: "powder_and_shot", projectile_kind: "shot", weapon_mode_ids: Object.freeze([LEMAT.shotModeId]),
  weight_per_shot_lb: null, cost_per_shot_usd: null, book_cost_weight_verified: false,
  provenance: Object.freeze({ kind: "olegurps-source-backed-correction", version: 1, source: LEMAT.source,
    officialTableRow: false, economics: "unknown; HT176 .42 values do not apply" }) });

export function lematBarrel(modeId) {
  if (![LEMAT.revolverModeId, LEMAT.shotModeId].includes(modeId)) return null;
  return { equipmentId: LEMAT.equipmentId, modeId, capacity: modeId === LEMAT.shotModeId ? 1 : 9,
    ammoId: modeId === LEMAT.shotModeId ? LEMAT.shotAmmoId : LEMAT.revolverAmmoId,
    manual: [{ id: "BarrelSwitchReady", application: "manual-Ready-before-switch", source: "HT94" }] };
}
export function correctHTMode(mode, equipment) {
  mode = projectHTPreGaussMode(mode, equipment);
  mode = projectHTLaserMode(mode, equipment);
  mode = reviewedHTModeIdentity(mode, equipment);
  mode = correctedHTModeStatistics(mode, equipment);
  mode = correctedHTSkillDefaults(mode, equipment);
  if (equipment?.equipment_id !== LEMAT.equipmentId || equipment.source !== "HT" ||
      mode?.weapon_mode_id !== LEMAT.shotModeId) return mode;
  return { ...mode, ht_ammo_item_ids: [LEMAT.shotAmmoId], ht_ammo_family_ids: [LEMAT_SHOT_CHARGE.ammo_family_id],
    ht_ammo_resolution: { ...mode.ht_ammo_resolution, status: "source_verified_existing_round",
      source: LEMAT.source, runtimeCorrection: 1 } };
}
export function correctHTAmmo(ammo) {
  ammo = reviewedHTAmmoIdentity(ammo);
  ammo = correctedHTLabel(ammo);
  return ammo?.id === LEMAT.revolverAmmoId ? { ...ammo,
    weapon_mode_ids: ammo.weapon_mode_ids.filter(id => id !== LEMAT.shotModeId) } : ammo;
}
export function currentHTPairAmmo(catalogs, modeId, historicalAmmoId) {
  const id = modeId === LEMAT.shotModeId && historicalAmmoId === LEMAT.revolverAmmoId
    ? LEMAT.shotAmmoId : historicalAmmoId;
  return catalogs.getAmmoItem("ht", id);
}
