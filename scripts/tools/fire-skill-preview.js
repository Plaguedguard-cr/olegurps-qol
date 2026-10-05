export function getProbabilityColor(probability) {
  if (!Number.isFinite(probability)) return "inherit";
  const ratio = Math.min(1, Math.max(0, probability / 100));
  const red = [148, 50, 54];
  const amber = [212, 154, 38];
  const green = [40, 118, 70];
  const start = ratio <= 0.5 ? red : amber;
  const end = ratio <= 0.5 ? amber : green;
  const progress = ratio <= 0.5 ? ratio * 2 : (ratio - 0.5) * 2;
  const channel = index => Math.round(start[index] + ((end[index] - start[index]) * progress));
  return "rgb(" + channel(0) + ", " + channel(1) + ", " + channel(2) + ")";
}

export const skillProbabilityColor = getProbabilityColor;

export function get3d6SuccessProbability(target) {
  const calculated = target === null || target === undefined ? Number.NaN : Number(target);
  if (!Number.isFinite(calculated)) return Number.NaN;
  const successTarget = Math.min(16, Math.max(4, Math.trunc(calculated)));
  let successfulOutcomes = 0;
  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      for (let third = 1; third <= 6; third += 1) {
        if (first + second + third <= successTarget) successfulOutcomes += 1;
      }
    }
  }
  return (successfulOutcomes / 216) * 100;
}

export function getFireSkillPreview(value) {
  const calculated = value === null || value === undefined ? Number.NaN : Number(value);
  if (!Number.isFinite(calculated)) {
    return { level: "\u2014", chance: "\u2014", probability: Number.NaN };
  }
  const level = Math.max(3, Math.trunc(calculated));
  const probability = get3d6SuccessProbability(level);
  return {
    level: String(level),
    chance: probability.toFixed(1).replace(".", ","),
    probability
  };
}
