// Basic Set B371/B470, shared by falling and explicit explosive/fragment calculations.
export function basicDamageDice(value) {
  if (!Number.isFinite(value) || value < 0) throw Error("InvalidDamageDice");
  if (value === 0) return "0";
  if (value < 1) return value <= 0.25 ? "1d-3" : value <= 0.5 ? "1d-2" : "1d-1";
  return Math.floor(value + 0.5 + Number.EPSILON) + "d";
}
