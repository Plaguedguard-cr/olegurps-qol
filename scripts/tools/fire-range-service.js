import { parseDamageRange } from "./ammunition-effects.js";
import { HT_NATIVE_PLUS_P_BASELINES } from "../ht-native-charge-profiles.js";

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

export function calculateEffectiveDistance(distance, height, { elevationDirection = "level", beamWeapon = false } = {}) {
  const sourceDistance = Number(distance);
  const elevation = parseElevationHeight(height);
  if (!Number.isFinite(sourceDistance) || sourceDistance < 0 || elevation === null) return null;
  if (elevation === 0 || beamWeapon || elevationDirection === "level") return sourceDistance;
  if (elevationDirection === "high") return Math.max(sourceDistance / 2, sourceDistance - elevation / 2);
  if (elevationDirection === "low") return sourceDistance + elevation;
  return null;
}

export function isBeamWeapon(attack) {
  // The current GGA Ranged model has no canonical beam flag. Never infer this from names or damage text.
  return attack?.data?.isBeamWeapon === true;
}

export function resolveElevationRange({
  rangeBands,
  rangeIndex,
  distance = null,
  height,
  elevationDirection = "level",
  beamWeapon = false
} = {}) {
  const elevation = parseElevationHeight(height);
  if (elevation === null || elevation <= 0 || beamWeapon || elevationDirection === "level") return null;

  const selectedRange = rangeBands?.find(range => range.index === Number(rangeIndex)) ?? null;
  const measured = distance !== null && distance !== undefined && distance !== ""
    ? Number(distance) : null;
  const sourceDistance = Number.isFinite(measured) && measured >= 0
    ? measured : getRangeBandDistance(selectedRange);
  if (!selectedRange || !Number.isFinite(sourceDistance)) return null;

  const effectiveDistance = calculateEffectiveDistance(sourceDistance, elevation, { elevationDirection, beamWeapon });
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
  distance = null,
  height,
  elevationDirection = "level",
  beamWeapon = false,
  environmentCapability = null, attackEnvironment = "air", depthFeet = null, weaponRange = null
} = {}) {
  const selectedRange = rangeBands?.find(range => range.index === Number(rangeIndex)) ?? null;
  const elevation = resolveElevationRange({ rangeBands, rangeIndex, distance, height, elevationDirection, beamWeapon });
  const environment = resolveAttackEnvironment({ capability: environmentCapability, environment: attackEnvironment,
    depthFeet, actualDistance: distance != null && distance !== "" ? distance : getRangeBandDistance(selectedRange),
    range: weaponRange, heightYards: height, elevationDirection, beamWeapon });
  return {
    selectedRange,
    effectiveRange: environment && !environment.error ? findRangeBandForDistance(rangeBands, environment.rangeDistance ?? environment.effectiveDistance) : elevation?.range ?? selectedRange,
    elevation, ...(environment ? { environment } : {})
  };
}
/** Attack context only. A numerical profile or a weapon name cannot establish underwater capability. */
export function resolveAttackEnvironment({ capability, environment = "air", depthFeet = null, actualDistance, range,
  heightYards = 0, elevationDirection = "level", beamWeapon = false } = {}) {
  const proof = capability && HT_NATIVE_PLUS_P_BASELINES[capability.modeId];
  const dart = proof?.construction === "underwater_dart" && capability.ammoId === proof.ammoId &&
    capability.nativeDamage === proof.nativeDamage && capability.source === proof.source;
  const actual = actualDistance == null || actualDistance === "" ? null : Number(actualDistance);
  const base = { version: 1, environment, actualDistance: actual, multiplier: 1, effectiveDistance: actual,
    depthFeet: null, source: dart ? proof.source : null, manual: [], error: null };
  if (!dart) return environment === "air" ? null : { ...base, error: "EnvironmentIdentityRequired" };
  if (!Number.isFinite(actual) || actual < 0) return { ...base, error: "EnvironmentDistanceRequired" };
  if (environment === "air-water") return { ...base, error: "EnvironmentTransitionGM" };
  if (!["air", "underwater"].includes(environment)) return { ...base, error: "EnvironmentIdentityRequired" };
  if (environment === "underwater") {
    const depth = depthFeet == null || depthFeet === "" ? null : Number(depthFeet);
    if (!Number.isFinite(depth) || depth < 0) return { ...base, error: "EnvironmentDepthRequired" };
    base.depthFeet = depth;
    if (depth > proof.maximumDepthFeet) return { ...base, error: "EnvironmentDepthExceeded" };
    base.multiplier = proof.underwaterDistanceMultiplier;
    base.effectiveDistance = actual * base.multiplier;
    base.manual.push({ id: "UnderwaterMalf", modifier: proof.automatic ? -2 : -1, application: "manual-GM", source: "HT85",
      separateFromPlusP: true });
  }
  // Keep the physical environment distance distinct from the existing elevation adjustment.
  const adjusted = calculateEffectiveDistance(actual, heightYards, { elevationDirection, beamWeapon });
  if (adjusted === null) return { ...base, error: "EnvironmentDistanceRequired" };
  if (adjusted !== actual) Object.assign(base, { heightYards: parseElevationHeight(heightYards), elevationDirection,
    rangeDistance: adjusted * base.multiplier });
  const limits = parseDamageRange(range);
  if (!limits) return { ...base, error: "EnvironmentRangeRequired" };
  base.range = limits;
  const distanceForRange = base.rangeDistance ?? base.effectiveDistance;
  const beyond = limit => distanceForRange - limit > Number.EPSILON * Math.max(distanceForRange, limit) * 4;
  base.beyondHalfDamage = beyond(limits.halfDamage);
  base.beyondMaximum = beyond(limits.maximum);
  if (base.beyondMaximum) base.error = "EnvironmentBeyondMaximum";
  if (base.beyondHalfDamage) base.manual.push({ id: "EnvironmentHalfDamage", application: "native-GGA-apply-damage-GM", source: "B378" });
  return base;
}
