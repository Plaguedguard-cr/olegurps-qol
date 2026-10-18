/** HT166: fractional-dice bands, including sub-die and >12d branches. No rounded mean. */
export function htDamageDice(dice, adds = 0, multiplier = 1, factor = 1) {
  const value = (dice + adds / 3.5) * multiplier * factor;
  if (!Number.isFinite(value) || value <= 0) throw new Error("UnresolvedDamageDice");
  if (value > 12) return "6dx" + Math.round(value / 6);
  if (value < 1) {
    const rounded = Math.round((value + 1e-10) * 100) / 100;
    const penalty = rounded < 0.33 ? 5 : rounded < 0.43 ? 4 : rounded < 0.57 ? 3 : rounded < 0.76 ? 2 : rounded < 0.96 ? 1 : 0;
    return "1d" + (penalty ? "-" + penalty : "");
  }
  // HT's worked example expresses 34.5/3.5 as 9.86 and rounds it to 10d.
  const whole = Math.floor(value + 1e-10), fraction = Math.round((value - whole + 1e-10) * 100) / 100;
  if (fraction < 0.15 - 1e-10) return whole + "d";
  if (fraction < 0.43 - 1e-10) return whole + "d+1";
  if (fraction < 0.65 - 1e-10) return whole + "d+2";
  if (fraction < 0.86 - 1e-10) return (whole + 1) + "d-1";
  return (whole + 1) + "d";
}

export function parseKineticDamage(formula) {
  const m = String(formula ?? "").trim().match(/^(\d+(?:\.\d+)?)d(?:6)?((?:[+-]\d+){0,2})(?:[x\u00d7*](\d+(?:\.\d+)?))?\s*(?:\((\d+(?:\.\d+)?)\))?(!)?\s+(pi\+\+|pi\+|pi-|pi)(\s+inc)?$/i);
  if (!m) return null;
  const adds = (m[2].match(/[+-]\d+/g) ?? []).reduce((sum, n) => sum + Number(n), 0);
  return { dice: Number(m[1]), adds, multiplier: Number(m[3] ?? 1), divisor: Number(m[4] ?? 1),
    type: m[6].toLowerCase(), diceText: m[1] + "d" + m[2] + (m[3] ? "x" + m[3] : ""),
    minimum: m[5] ?? "", suffix: m[7] ?? "" };
}

/** Nearest integer, halves upward; preserve supported GGA operating suffixes verbatim. */
export function parseDamageRange(value) {
  const match = String(value ?? "").trim().replaceAll(",", "").match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (!match || !(Number(match[1]) > 0) || !(Number(match[2]) >= Number(match[1]))) return null;
  return { halfDamage: Number(match[1]), maximum: Number(match[2]) };
}

