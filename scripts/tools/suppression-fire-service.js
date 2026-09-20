export const SUPPRESSION_FIRE_MINIMUM_SHOTS = 5;

const integer = value => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

export function getSuppressionFireCapacity({ profile, loaded = 0, totalAmmo = 0 } = {}) {
  const fullRoF = Math.max(0, integer(profile?.baseRoF));
  const availableShots = Math.max(0, Math.min(fullRoF, integer(loaded), integer(totalAmmo)));
  return {
    fullRoF,
    availableShots,
    eligible: fullRoF >= SUPPRESSION_FIRE_MINIMUM_SHOTS &&
      availableShots >= SUPPRESSION_FIRE_MINIMUM_SHOTS,
    maximumZones: Math.floor(availableShots / SUPPRESSION_FIRE_MINIMUM_SHOTS)
  };
}

export function validateSuppressionFireAllocation(zoneShots, maximumShots) {
  const shots = Array.isArray(zoneShots) ? zoneShots.map(integer) : [];
  const totalShots = shots.reduce((total, value) => total + value, 0);
  const errors = [];
  if (!shots.length) errors.push("нужна хотя бы одна зона");
  if (shots.some(value => value < SUPPRESSION_FIRE_MINIMUM_SHOTS)) {
    errors.push("в каждую зону нужно назначить минимум " +
      SUPPRESSION_FIRE_MINIMUM_SHOTS + " выстрелов");
  }
  if (totalShots > Math.max(0, integer(maximumShots))) {
    errors.push("сумма выстрелов не может превышать " +
      Math.max(0, integer(maximumShots)));
  }
  return { valid: errors.length === 0, shots, totalShots, errors };
}

export function calculateSuppressionFireSkill({
  uncappedSkill,
  rapidFireBonus = 0,
  mounted = false
} = {}) {
  const raw = Number(uncappedSkill);
  const bonus = Math.max(0, integer(rapidFireBonus));
  const cap = (mounted === true ? 8 : 6) + bonus;
  return {
    cap,
    effectiveSkill: Number.isFinite(raw) ? Math.min(Math.trunc(raw), cap) : null
  };
}

export function calculateSuppressionFireHits({ remainingShots, rcl, margin } = {}) {
  const remaining = Math.max(0, integer(remainingShots));
  const recoil = Math.max(1, integer(rcl));
  const successMargin = Number(margin);
  if (!Number.isInteger(successMargin)) return null;
  if (successMargin < 0 || remaining === 0) return 0;
  return Math.min(remaining, 1 + Math.floor(successMargin / recoil));
}