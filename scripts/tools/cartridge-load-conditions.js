// P1 conditions extend the existing recipe/effect pipeline; no crafting, Rolls or Actor writes.
export const CARTRIDGE_LOAD_IDS = Object.freeze([
  "ht_plus_p", "ht_match_grade", "ht_match_handloaded", "ht_subsonic_pistol", "ht_subsonic_rifle", "ht_silent"
]);
const proof = value => value?.value === true && typeof value.source === "string" && value.source.trim().length > 0;
const success = check => check?.success === true && Number.isFinite(check.target) &&
  Number.isFinite(check.total) && check.total <= check.target && typeof check.reference === "string" && check.reference.trim();

export function handloadCondition(facts, scope = null) {
  const d = facts?.handloadDefinition;
  if (!d?.batchId?.trim?.() || d.handloaded !== true || !d.source?.trim?.() ||
      !d.actorId || !d.weaponId || !d.modeId || !d.ammoId ||
      !["matched_to_this_individual_weapon", "armoury_and_iq_guns_success", "handloaded_batch"].every(key => proof(facts.evidence?.[key])))
    return "P1HandloadEvidenceMissing";
  if (!success(d.armoury) || d.armoury.skill !== "Armoury" ||
      !success(d.iqGuns) || d.iqGuns.skill !== "Guns" || d.iqGuns.basedOn !== "IQ")
    return "P1HandloadChecksMissing";
  // A successful-looking number is not a replacement for the confirmed result.
  if (d.armoury.total === 18 || d.armoury.total === 17 || d.iqGuns.total === 18 || d.iqGuns.total === 17 ||
      d.armoury.total < 3 || d.iqGuns.total < 3) return "P1HandloadChecksMissing";
  if (facts.classes?.values?.includes("automatic_weapon") ||
      facts.weaponActions?.values?.some(action => ["automatic", "self_loading"].includes(action)))
    return "P1HandloadWeaponMismatch";
  if (scope && ["actorId", "weaponId", "modeId", "ammoId"].some(key => !scope[key] || d[key] !== scope[key]))
    return "P1HandloadWeaponMismatch";
  return null;
}

export function silentCondition(facts, scope = null) {
  const d = facts?.silentDefinition;
  if (!proof(facts?.evidence?.silent_ammunition_design_confirmed_for_weapon) || d?.captivePiston !== true ||
      d.specialFirearmCompatible !== true || !d.source?.trim?.() || !d.modeId || !d.ammoId || !d.baseDamage || !d.sourceRange)
    return "P1SilentEvidenceMissing";
  if (scope && ["modeId", "ammoId"].some(key => !scope[key] || d[key] !== scope[key])) return "P1SilentEvidenceMissing";
  return null;
}
