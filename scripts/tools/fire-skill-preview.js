export function skillProbabilityColor(probability) {
  if (!Number.isFinite(probability)) return "inherit";
  const ratio = Math.min(1, Math.max(0, probability / 100));
  const start = [224, 74, 74];
  const end = [74, 190, 105];
  const channel = index => Math.round(start[index] + ((end[index] - start[index]) * ratio));
  return "rgb(" + channel(0) + ", " + channel(1) + ", " + channel(2) + ")";
}

export function getFireSkillPreview(value) {
  const calculated = value === null || value === undefined ? Number.NaN : Number(value);
  if (!Number.isFinite(calculated)) {
    return { level: "\u2014", chance: "\u2014", probability: Number.NaN };
  }
  const level = Math.max(3, Math.trunc(calculated));
  const successTarget = Math.min(16, level);
  let successfulOutcomes = 0;
  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      for (let third = 1; third <= 6; third += 1) {
        if (first + second + third <= successTarget) successfulOutcomes += 1;
      }
    }
  }
  const probability = (successfulOutcomes / 216) * 100;
  return {
    level: String(level),
    chance: probability.toFixed(1).replace(".", ","),
    probability
  };
}
