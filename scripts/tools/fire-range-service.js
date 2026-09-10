export function parseElevationHeight(value) {
  const text = String(value ?? "").trim();
  if (text === "") return 0;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getRangeBandDistance(range) {
  const raw = range?.max;
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  const normalized = String(raw ?? "")
    .trim()
    .replaceAll(" ", "")
    .replaceAll(",", "")
    .replace(/\+$/, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function findRangeBandForDistance(rangeBands, distance) {
  const yards = Number(distance);
  if (!Number.isFinite(yards) || yards < 0 || !Array.isArray(rangeBands)) return null;
  for (const range of rangeBands) {
    if (typeof range?.max === "string") return range;
    const maximum = Number(range?.max);
    if (Number.isFinite(maximum) && yards <= maximum) return range;
  }
  return null;
}

export function calculateEffectiveDistance(distance, height, { highGround = false, beamWeapon = false } = {}) {
  const sourceDistance = Number(distance);
  const elevation = parseElevationHeight(height);
  if (!Number.isFinite(sourceDistance) || sourceDistance < 0 || elevation === null) return null;
  if (elevation === 0 || beamWeapon) return sourceDistance;
  return highGround
    ? Math.max(sourceDistance / 2, sourceDistance - elevation / 2)
    : sourceDistance + elevation;
}

export function isBeamWeapon(attack) {
  // The current GGA Ranged model has no canonical beam flag. Never infer this from names or damage text.
  return attack?.data?.isBeamWeapon === true;
}

export function resolveElevationRange({
  rangeBands,
  rangeIndex,
  height,
  highGround = false,
  beamWeapon = false
} = {}) {
  const elevation = parseElevationHeight(height);
  if (elevation === null || elevation <= 0 || beamWeapon) return null;

  const selectedRange = rangeBands?.find(range => range.index === Number(rangeIndex)) ?? null;
  const sourceDistance = getRangeBandDistance(selectedRange);
  if (!selectedRange || !Number.isFinite(sourceDistance)) return null;

  const effectiveDistance = calculateEffectiveDistance(sourceDistance, elevation, { highGround, beamWeapon });
  const effectiveRange = findRangeBandForDistance(rangeBands, effectiveDistance);
  if (!effectiveRange) return null;

  return {
    sourceDistance,
    effectiveDistance,
    rangeIndex: effectiveRange.index,
    range: effectiveRange
  };
}

export function resolveEffectiveRange({
  rangeBands,
  rangeIndex,
  height,
  highGround = false,
  beamWeapon = false
} = {}) {
  const selectedRange = rangeBands?.find(range => range.index === Number(rangeIndex)) ?? null;
  const elevation = resolveElevationRange({ rangeBands, rangeIndex, height, highGround, beamWeapon });
  return {
    selectedRange,
    effectiveRange: elevation?.range ?? selectedRange,
    elevation
  };
}
