const LIMB_AND_APPENDAGE_KEYS = new Set([
  "arm",
  "hand",
  "leg",
  "foot",
  "foreleg",
  "hindleg",
  "hind-leg",
  "mid-leg",
  "wing",
  "tail",
  "extremity"
]);

function semanticKey(location) {
  return String(
    location?.semanticKey ??
    location?.zoneId ??
    location?.canonicalKey ??
    ""
  ).trim().toLowerCase();
}

export function hasConsecutiveTorsoLocations(locations, minimum = 5) {
  let consecutive = 0;
  for (const location of locations ?? []) {
    consecutive = semanticKey(location) === "torso" ? consecutive + 1 : 0;
    if (consecutive >= minimum) return true;
  }
  return false;
}

export function containsOnlyLimbOrAppendageLocations(locations) {
  return (locations?.length ?? 0) >= 4 &&
    locations.every(location => LIMB_AND_APPENDAGE_KEYS.has(semanticKey(location)));
}

export function getRandomHitLocationGroupTitle(locations, {
  contourTitle = "Контурная стрельба"
} = {}) {
  const count = locations?.length ?? 0;
  if (hasConsecutiveTorsoLocations(locations)) return `Без творческого подхода (${count})`;
  if (containsOnlyLimbOrAppendageLocations(locations)) return `${contourTitle} (${count})`;
  return `Зоны попаданий (${count})`;
}

export function createRandomHitLocationDisplay(location, { random = Math.random } = {}) {
  const label = String(location?.label ?? "");
  const eggShooter = semanticKey(location) === "groin" && Number(random()) < 0.05;
  return {
    ...location,
    displayLabel: eggShooter ? `${label} (Яйцестрел)` : label,
    displayEasterEgg: eggShooter ? "egg-shooter" : null
  };
}

export function buildRandomHitLocationsHtml(locations, {
  escapeHtml = value => String(value ?? ""),
  contourTitle = "Контурная стрельба"
} = {}) {
  if (!locations?.length) return "";
  const items = locations.map(location => {
    const details = (location.detailRolls ?? [])
      .map(detail => `${detail.label} 1d6: ${detail.total}`)
      .join("; ");
    const rollDetails = details ? `; ${details}` : "";
    return `<li>${escapeHtml(location.displayLabel ?? location.label)} ` +
      `(3d6: ${escapeHtml(location.total)}${escapeHtml(rollDetails)})</li>`;
  }).join("");
  const title = getRandomHitLocationGroupTitle(locations, { contourTitle });
  return `<details><summary style="cursor:pointer;"><strong>${escapeHtml(title)}</strong></summary>` +
    `<ol style="margin:6px 0 0;padding-left:24px;">${items}</ol></details>`;
}