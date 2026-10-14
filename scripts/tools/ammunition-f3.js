import { environmentalVisibility, gasConsequenceDuration, smokeBuildSeconds, environmentalContactSchedule } from "./environment-ammunition.js";
import { ammunitionInstructionKeys } from "./ammunition-condition-presentation.js";
import { f3Text } from "./ammunition-f3-localization.js";
import { appendInstructionSteps } from "../localization.js";

// Only the 21 approved F3 rows. No construction or catalog changes.
export const F3_ROWS = Object.freeze(Object.fromEntries([
  ["ht_poison:delivery", "Poison", ["kinetic"]], ["ht_poison_gas:blast", "PoisonGas", ["kinetic", "follow-up", "linked"]],
  ...["ht_illumination", "ht_signal_flare"].flatMap(v => [[v + ":vision", "Light", ["kinetic"]], [v + ":contact", "Contact", ["kinetic"]]]),
  ...["ht_smoke", "ht_colored_smoke", "ht_hot_smoke", "ht_prism_smoke", "ht_em_smoke"].flatMap(v => [[v + ":cloud", "Cloud", ["kinetic"]], [v + ":sensors", "Sensors", ["kinetic"]]]),
  ...["ht_tear_gas", "ht_tear_gas_vomit"].flatMap(v => [[v + ":duration", "GasDuration", ["kinetic", "linked"]], [v + ":vision", "GasVision", ["kinetic", "linked"]]]),
  ["ht_white_phosphorus:repeat-burn", "WP", ["fragmentation"]]
].map(([id, kind, components]) => [id, { kind, components }])));
export function f3RowsForShot(shot) {
  if (!shot?.profile?.damage?.nativeSafe) return [];
  const variant = shot.profile.damage.variantId ?? shot.ammunition?.recipe?.variantId;
  return Object.entries(F3_ROWS).filter(([id]) => id.startsWith(variant + ":")).map(([id, row]) => ({ id, ...row }));
}
const finite = n => typeof n === "number" && Number.isFinite(n);
const nonnegative = n => finite(n) && n >= 0;
const positive = n => finite(n) && n > 0;
const missing = (...fields) => ({ status: "unresolved", fields });
const result = (key, values = {}) => ({ status: "resolved", key, values, automaticApplication: false });

/** Arithmetic from one completed shot and explicit local GM assertions. No timers or writes. */
export function calculateF3({ shot, source, role = "kinetic", messageId = source?.id }, id, input = {}, runtime = globalThis) {
  const row = F3_ROWS[id];
  if (!runtime.game?.user?.isGM || source?.visible !== true || source?.isContentVisible !== true ||
      shot?.correlation?.attackMessageId !== source.id || !f3RowsForShot(shot).some(r => r.id === id) ||
      source.id !== messageId && !row.components.includes(role)) return null;
  const variant = id.split(":")[0], environment = shot.profile.damage.rules?.environment;
  if (!["reference", "gm"].includes(environment?.source?.kind) || !environment.source.note?.trim()) return missing("construction");
  if (["Poison", "PoisonGas"].includes(row.kind)) {
    const f = environment.filler;
    if (!f?.id || !f.name || !f.source?.trim() || !positive(f.dose) || !f.doseUnit?.trim() ||
        f.effect?.verified !== true || !f.effect.description?.trim()) return missing("substance", "dose", "construction");
    if (input.carrierResolved !== true) return missing("carrierResolved");
    if (row.kind === "Poison") {
      if (!["blood", "contact"].includes(f.route)) return missing("route");
      if (input.contact === false || f.route === "blood" && input.penetration === false) return result("NoDelivery");
      if (input.contact !== true || f.route === "blood" && input.penetration !== true ||
          f.route === "contact" && input.protectionResolved !== true) return missing("contact", f.route === "blood" ? "penetration" : "protectionResolved");
      return result("Delivery", { substance: f.name, dose: f.dose, unit: f.doseUnit, rule: f.effect.description });
    }
    if (!shot.profile.damage.components?.some(c => c.role === "follow-up" && c.status === "resolved") ||
        input.blastConfirmed !== true || input.gasConfirmed !== true || input.areaConfirmed !== true || input.exposureConfirmed !== true)
      return missing("blastConfirmed", "gasConfirmed", "areaConfirmed", "exposureConfirmed");
    return result("GasDelivery", { substance: f.name, dose: f.dose, unit: f.doseUnit, rule: f.effect.description });
  }
  if (row.kind === "Light") {
    if (input.areaConfirmed === false) return result("Outside");
    if (input.areaConfirmed !== true || input.activeConfirmed !== true || !finite(input.penalty) || input.penalty > 0) return missing("areaConfirmed", "activeConfirmed", "penalty");
    return result("Visibility", { penalty: environmentalVisibility(variant, { penalty: input.penalty }) });
  }
  if (["Contact", "WP"].includes(row.kind)) {
    if (input.contact === false || row.kind === "WP" && input.remaining === false) return result("NoContact");
    if (input.contact !== true || row.kind === "WP" && input.remaining !== true || !nonnegative(input.start) ||
        !nonnegative(input.elapsed) || typeof input.ended !== "boolean" || input.ended && (!nonnegative(input.end) || input.end < input.start))
      return missing("contact", ...(row.kind === "WP" ? ["remaining"] : []), "start", "elapsed", "ended", "end");
    const elapsed = input.ended ? Math.min(input.elapsed, input.end - input.start) : input.elapsed;
    const schedule = environmentalContactSchedule(variant, elapsed);
    return result("Schedule", { ...schedule, countedSeconds: Math.min(elapsed, schedule.maximumSeconds) });
  }
  if (row.kind === "Cloud") {
    if (input.chargeConfirmed !== true || input.ruleConfirmed !== true || !positive(input.radius) || !nonnegative(input.start) ||
        !positive(input.duration) || !nonnegative(input.elapsed)) return missing("chargeConfirmed", "ruleConfirmed", "radius", "start", "duration", "elapsed");
    // HT171 lists these as variants of Smoke; they retain its build time and lifetime.
    if (input.duration < 60 || input.duration > 240) return missing("duration");
    return result("CloudBuild", {
      radius: input.radius, start: input.start, end: input.start + input.duration,
      build: smokeBuildSeconds(input.radius),
      state: f3Text(input.elapsed < input.duration ? "Active" : "Ended", runtime)
    });
  }
  if (row.kind === "Sensors") {
    if (input.intersects === false || input.activeConfirmed === false) return result("Outside");
    if (input.intersects !== true || input.activeConfirmed !== true || input.chargeConfirmed !== true ||
        !["optical", "infrared", "hyperspectral", "laser", "radar", "imagingRadar"].includes(input.sensor)) return missing("intersects", "activeConfirmed", "chargeConfirmed", "sensor");
    if (input.sensor === "optical")
      return result("Visibility", { penalty: environmentalVisibility(variant) });
    const affected = ["ht_hot_smoke", "ht_prism_smoke", "ht_em_smoke"].includes(variant) && ["infrared", "hyperspectral"].includes(input.sensor) ||
      variant === "ht_prism_smoke" && input.sensor === "laser" || variant === "ht_em_smoke" && ["radar", "imagingRadar"].includes(input.sensor);
    if (affected && input.sensor !== "laser") return result("Visibility", { penalty: -10 });
    return result(affected ? "SensorAffected" : "SensorUnknown", { sensor: f3Text(input.sensor, runtime) });
  }
  if (row.kind === "GasVision") {
    if (!nonnegative(input.path)) return missing("path");
    return result("Visibility", { penalty: environmentalVisibility(variant, { pathYards: input.path }) });
  }
  if (input.outcome === "success") return result("Success");
  if (input.outcome !== "failure" || !positive(input.mof) || !Number.isInteger(input.mof) ||
      !["cough", "blind", ...(variant === "ht_tear_gas_vomit" ? ["retch"] : [])].includes(input.consequence) ||
      typeof input.exposureEnded !== "boolean" || !nonnegative(input.start)) return missing("outcome", "mof", "consequence", "exposureEnded", "start");
  const vomiting = input.consequence === "retch";
  const after = gasConsequenceDuration({ exposureMinutes: 0, marginOfFailure: input.mof, vomiting });
  if (!input.exposureEnded) return result("ExposureOngoing", { after });
  if (!nonnegative(input.end) || input.end < input.start) return missing("end");
  const duration = gasConsequenceDuration({ exposureMinutes: (input.end - input.start) / 60, marginOfFailure: input.mof, vomiting });
  return result("GasDuration", { consequence: f3Text(input.consequence, runtime), duration, after, end: input.end + after * 60 });
}

export const F3_FIELDS = Object.freeze({
  Poison: ["carrierResolved", "contact", "penetration", "protectionResolved"],
  PoisonGas: ["carrierResolved", "blastConfirmed", "gasConfirmed", "areaConfirmed", "exposureConfirmed"],
  Light: ["areaConfirmed", "activeConfirmed", "penalty"], Contact: ["contact", "start", "elapsed", "ended", "end"],
  WP: ["contact", "remaining", "start", "elapsed", "ended", "end"],
  Cloud: ["chargeConfirmed", "ruleConfirmed", "radius", "start", "duration", "elapsed"],
  Sensors: ["chargeConfirmed", "activeConfirmed", "intersects", "sensor"], GasVision: ["path"],
  GasDuration: ["consequence", "outcome", "mof", "start", "exposureEnded", "end"]
});
const booleans = new Set(["carrierResolved", "contact", "penetration", "protectionResolved", "blastConfirmed", "gasConfirmed", "areaConfirmed", "exposureConfirmed", "activeConfirmed", "remaining", "ended", "chargeConfirmed", "ruleConfirmed", "intersects", "exposureEnded"]);
export function f3Extension(resolved, runtime) {
  const rows = f3RowsForShot(resolved?.shot);
  const keys = [...new Set(rows.map(r => r.kind))];
  return {
    rows: rows.map(r => ({ ...r, name: f3Text("Name" + r.kind, runtime) })),
    instructions(details) {
      const variant = rows[0]?.id.split(":")[0];
      for (const kind of keys) {
        const key = kind === "Light" ? (variant === "ht_signal_flare" ? "RuleSignal" : "RuleIllumination") : "Rule" + kind;
        appendInstructionSteps(details, f3Text(key, runtime), runtime.document);
      }
      if (rows.some(r => r.kind === "Sensors")) appendInstructionSteps(details, f3Text("Rule" + variant, runtime), runtime.document);
      const cloud = resolved?.shot?.profile?.damage?.rules?.environment?.sourceCloud;
      if (variant === "ht_white_phosphorus" && cloud)
        appendInstructionSteps(details, f3Text("SourceCloud", runtime, {radius:cloud.radiusYards,seconds:cloud.durationSeconds}), runtime.document);
      // HAFLA source knowledge remains in F1, without copying those numbers to other WP or catalogs.
      // The exact HAFLA smoke instructions are already included by F1; do not repeat them.
    },
    fields(id) {
      const row = F3_ROWS[id]; if (!row) return null;
      return F3_FIELDS[row.kind].map(key => {
        const choices = booleans.has(key) ? ["yes", "no"] : key === "sensor" ? ["optical", "infrared", "hyperspectral", "laser", "radar", "imagingRadar"] :
          key === "outcome" ? ["success", "failure"] : key === "consequence" ? ["cough", "blind", ...(id.startsWith("ht_tear_gas_vomit:") ? ["retch"] : [])] : null;
        return { key, label: f3Text(key, runtime), wide: !!choices, choices: choices ? [["", "\u2014"], ...choices.map(c => [c, f3Text(c, runtime)])] : null };
      });
    },
    calculate(current, id, controls) {
      const input = {};
      for (const [key, control] of controls) input[key] = booleans.has(key) ? control.value === "" ? undefined : control.value === "yes" :
        ["sensor", "outcome", "consequence"].includes(key) ? control.value : control.value.trim() === "" ? undefined : Number(control.value);
      const answer = calculateF3(current, id, input, runtime);
      if (!answer) return "";
      return answer.status === "unresolved" ? f3Text("Missing", runtime, { fields: answer.fields.map(k => f3Text(k, runtime)).join(", ") }) :
        f3Text("Result", runtime, { result: f3Text(answer.key, runtime, answer.values) });
    }
  };
}
