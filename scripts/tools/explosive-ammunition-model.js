import { basicDamageDice } from "./basic-damage-dice.js";

export const FRAGMENT_MODEL_VERSION = "olegurps-fragments-v1";
const positive = n => typeof n === "number" && Number.isFinite(n) && n > 0;
export function calculateExplosiveRecipe(variantId, parameters = {}) {
  const p = structuredClone(parameters), warnings = [], reasons = [];
  const explosion = { status: "unresolved", formula: null, rawDice: null, source: "Basic Set B415" };
  const fragmentation = { status: "unresolved", formula: null, rawDice: null,
    source: "OleGURPS house model", version: FRAGMENT_MODEL_VERSION };
  const result = { version: 1, parameters: p, explosion, fragmentation, warnings, reasons, status: "unresolved" };
  if (!["ht_apex", "ht_aphex"].includes(variantId)) { reasons.push("unsupported-construction"); return result; }
  const source = p.source && ["user", "gm", "reference"].includes(p.source.kind) && String(p.source.note ?? "").trim();
  const mass = positive(p.projectileMassG);
  if (!mass) reasons.push("projectile-mass-required");
  if (!source) reasons.push("parameter-source-required");
  const explosive = positive(p.explosiveMassG) && positive(p.ref);
  if (!explosive) reasons.push("explosive-mass-and-ref-required");
  const physical = mass && explosive && p.explosiveMassG < p.projectileMassG;
  if (mass && explosive && !physical) reasons.push("invalid-explosive-mass");
  const apexValid = variantId !== "ht_apex" || (physical && p.explosiveMassG < p.projectileMassG * 0.05);
  if (variantId === "ht_apex" && physical && !apexValid) reasons.push("apex-charge-must-be-less-than-five-percent");
  if (source && physical && apexValid) {
    const dice = 12 * Math.sqrt(p.explosiveMassG / 453.59237 * p.ref);
    if (positive(dice)) Object.assign(explosion, { status: "resolved", rawDice: dice, formula: basicDamageDice(dice) + " cr ex" });
    else reasons.push("nonfinite-model-result");
  }
  const q = p.q ?? 1;
  fragmentation.neutralQAssumption = p.q == null || q === 1;
  const fragmentInputs = positive(p.fragmentMassG) && positive(p.referenceMassG) && positive(p.referenceDice) &&
    positive(q) && String(p.referenceSource ?? "").trim();
  if (!fragmentInputs) reasons.push("fragment-calibration-required");
  const fragmentMassValid = mass && positive(p.fragmentMassG) && p.fragmentMassG <= p.projectileMassG &&
    (!positive(p.explosiveMassG) || p.fragmentMassG + p.explosiveMassG <= p.projectileMassG);
  if (mass && positive(p.fragmentMassG) && !fragmentMassValid) reasons.push("invalid-fragment-mass");
  if (source && fragmentInputs && fragmentMassValid) {
    const dice = p.referenceDice * Math.sqrt(p.fragmentMassG / p.referenceMassG * q);
    if (positive(dice)) Object.assign(fragmentation, { status: "resolved", rawDice: dice, formula: basicDamageDice(dice) + " cut" });
    else reasons.push("nonfinite-model-result");
  }
  if (p.ref > 3 || q > 10 || p.referenceDice > 100 || p.projectileMassG > 100000 ||
      fragmentation.rawDice > p.referenceDice * 10 || explosion.rawDice > 1000) warnings.push("unusual-model-parameters");
  if (explosion.status === "resolved" && fragmentation.status === "resolved" && reasons.length === 0) result.status = "resolved";
  return result;
}
