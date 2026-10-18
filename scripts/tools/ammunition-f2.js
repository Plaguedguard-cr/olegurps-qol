import { canManageAmmunitionShot } from './ammunition-approval-service.js';
// Read-only adapters for the approved F2 effects. No rolls, persistence or Actor writes.
import { heshSpall, thermobaricDamage, tandemDamage } from "./explosive-attack-profiles.js";
import { fragmentHitCount, parseFragmentDamage, fragmentTargetProfile, FRAGMENT_POSTURES } from "./explosion-fragmentation.js";
import { calculateHitsFromMargin } from "./prepared-gga-roll.js";
import { f2Text } from "./ammunition-f2-localization.js";
import { selfDestructDistanceReached } from "./fuze-tracer-ammunition.js";
import { explosiveText } from "./explosive-ammunition-localization.js";

const row = (variants, suffix, kind, component) => variants.split(" ").map(v => [v + ":" + suffix, { kind, component }]);
export const F2_ROWS = Object.freeze(Object.fromEntries([
  ...row("ht_rubber_shot", "injury", "Elements", "kinetic"),
  ...row("ht_canister ht_shotshell ht_multi_flechette ht_duplex ht_triplex", "elements", "Elements", "kinetic"),
  ...row("ht_buck_and_ball", "allocation", "Allocation", "kinetic"),
  ...row("ht_le ht_he ht_efp ht_heat ht_hedp ht_hesh ht_ms_heat ht_thermobaric", "linked", "Linked", "linked"),
  ...row("ht_saple ht_apex ht_saphe ht_saphec ht_aphex", "internal", "Internal", "follow-up"),
  ...row("ht_le ht_saple ht_apex ht_he ht_saphe ht_aphex ht_hedp ht_white_phosphorus", "fragment-hits", "Fragments", "fragmentation"),
  ...row("ht_ms_heat", "tandem", "Tandem", "main-charge"),
  ...row("ht_hesh", "spall", "Spall", "kinetic"),
  ...row("ht_thermobaric", "falloff", "Falloff", "kinetic"),
  ...row("ht_saple", "fuze-reliability", "Reliability", "follow-up"),
  ...row("ht_self_destruct", "flight", "Flight", "kinetic")
]));
export function f2RowsForShot(shot) {
  if (!shot?.profile?.damage?.nativeSafe) return [];
  const variant = shot.profile.damage.variantId ?? shot.ammunition?.recipe?.variantId;
  return Object.entries(F2_ROWS).filter(([id]) => id.startsWith(variant + ":")).map(([id, value]) => ({ id, ...value }));
}
const number = value => typeof value === "number" && Number.isFinite(value);
const nonnegative = value => number(value) && value >= 0;
const boolean = value => typeof value === "boolean";
const component = (shot, role) => shot.profile.damage.components?.find(c => c.role === role && c.status === "resolved");
const formulaDice = formula => {
  const match = String(formula ?? "").match(/^(\d+d(?:6)?(?:[+-]\d+)?(?:[x\u00d7*]\d+(?:\.\d+)?)*)(?:\([\d.]+\))? (?:cut|cr ex|burn ex)$/);
  return match ? parseFragmentDamage(match[1]) : null;
};

/** Only the original GGA card and its persisted Roll, never the lastTargetedRoll. */
export function savedF2Facts({ source, shot }, runtime = globalThis) {
  const context = shot.profile.context ?? {};
  const physical = Number.isSafeInteger(context.physicalShots) && context.physicalShots >= 0 ? context.physicalShots : null;
  const hitCap = Number.isSafeInteger(context.effectiveRoF) && context.effectiveRoF >= 0 ? context.effectiveRoF : null;
  const np = context.shotgun?.projectilesPerShot;
  const elements = physical !== null && Number.isSafeInteger(np) && np >= 1 ? physical * np : hitCap;
  let hits = null;
  const Parser = runtime.DOMParser;
  if (Parser) {
    const card = new Parser().parseFromString(source.content ?? "", "text/html").querySelector(".roll-message.gga-chat-message");
    const rolls = source.rolls ?? [], total = rolls.length === 1 ? rolls[0]?.total : null;
    const margins = [...(card?.querySelectorAll('[data-otf]') ?? [])].map(e => e.getAttribute("data-otf")).filter(t => /^[+-]?\d+ margin for /.test(t));
    const margin = margins.length === 1 ? Number(margins[0].match(/^[+-]?\d+/)[0]) : null;
    // Cross-check the saved context against native GGA. A cap or missing result stays unknown.
    if (hitCap !== null && number(total) && Number.isInteger(margin) && total + margin === context.effectiveSkill &&
        number(context.rcl) && context.rcl >= 1 && (card?.querySelector(".success") || card?.querySelector(".failure")))
      hits = calculateHitsFromMargin(hitCap, context.rcl, margin, { failure: !!card.querySelector(".failure") });
  }
  return { physical, elements, hits };
}

export const F2_FIELDS = Object.freeze({
  Elements: [], Allocation: [], Linked: [],
  Internal: ["carrierHit", "penetration"],
  Fragments: ["target", "distance", "sm", "posture", "cover", "total", "guaranteed", "carrierHit", "penetration"],
  Tandem: ["era", "precursor", "main", "rawConfirmed"],
  Spall: ["nonpenetration", "laminated", "dr"],
  Falloff: ["damage", "distance", "rawConfirmed"],
  Reliability: ["tl", "die"], Flight: ["path"]
});

/** Local GM assertions are never facts added to the immutable shot. */
export function calculateF2({ shot, source, role = "kinetic", messageId = source?.id }, id, input = {}, runtime = globalThis) {
  if (!canManageAmmunitionShot({source,shot},runtime) || source?.visible !== true || source?.isContentVisible !== true ||
      shot?.correlation?.attackMessageId !== source.id || !f2RowsForShot(shot).some(r => r.id === id)) return null;
  const descriptor = F2_ROWS[id], kind = descriptor.kind, damage = shot.profile.damage;
  const missing = fields => ({ status: "unresolved", fields });
  const result = (key, values = {}) => ({ status: "resolved", key, values, automaticApplication: false });
  // A component Damage card can calculate only that component, not neighboring results.
  if (source.id !== messageId && role !== descriptor.component &&
      !(kind === "Linked" && role === "kinetic" && component(shot, "kinetic")?.relation === "linked-blast-primary")) return null;
  if (kind === "Elements") return { status: "manual", key: "Elements" };
  if (kind === "Linked") return { status: "manual", key: "Linked" };
  if (kind === "Allocation") {
    const facts = savedF2Facts({ source, shot }, runtime), allocation = damage.rules?.hitAllocation;
    if (facts.physical !== 1 || !Number.isSafeInteger(facts.hits) || !allocation?.pellet) return missing(["Facts", "Allocation"]);
    return result("AllocationResult", { ball: Math.min(1, facts.hits), pellets: Math.max(0, facts.hits - 1), formula: allocation.pellet });
  }
  if (kind === "Internal") {
    if (!component(shot, "follow-up") || !boolean(input.carrierHit) || !boolean(input.penetration)) return missing(["carrierHit", "penetration"]);
    if (input.carrierHit && savedF2Facts({ source, shot }, runtime).hits === 0) return missing(["carrierHit", "Facts"]);
    return result(input.carrierHit && input.penetration ? "InternalReady" : "ExternalOnly");
  }
  if (kind === "Fragments") {
    const dice = formulaDice(component(shot, "fragmentation")?.formula);
    if (!dice || typeof input.target !== "string" || !input.target.trim() || !nonnegative(input.distance) || !number(input.sm) ||
        !["standing", "crouching", "kneeling", "crawling", "sitting", "lying"].includes(input.posture) || !number(input.cover) || input.cover > 0 ||
        !Number.isInteger(input.total) || input.total < 3 || input.total > 18 || !boolean(input.guaranteed))
      return missing(["target", "distance", "sm", "posture", "cover", "total", "guaranteed", "Components"]);
    if (input.guaranteed && (!component(shot, "follow-up") || input.carrierHit !== true || input.penetration !== true)) return missing(["carrierHit", "penetration", "guaranteed"]);
    if (input.guaranteed && savedF2Facts({ source, shot }, runtime).hits === 0) return missing(["carrierHit", "Facts"]);
    const { dangerRadius: radius, effectiveSkill: skill } = fragmentTargetProfile({ damage: dice, distance: input.distance,
      sm: input.sm, postureModifier: FRAGMENT_POSTURES[input.posture].modifier, coverModifier: input.cover });
    return result("HitResult", { hits: fragmentHitCount({ total: input.total, skill, inRange: input.distance <= radius, followUp: input.guaranteed }), skill, radius });
  }
  if (kind === "Tandem") {
    if (!damage.rules?.tandem || !component(shot, "kinetic") || !component(shot, "main-charge") || !boolean(input.era) || !nonnegative(input.precursor) || !nonnegative(input.main) || input.rawConfirmed !== true)
      return missing(F2_FIELDS.Tandem);
    const r = tandemDamage({ precursor: input.precursor, main: input.main, reactiveArmor: input.era });
    return result(input.era ? "ERAStages" : "TandemResult", { ...input, damage: r.damage });
  }
  if (kind === "Spall") {
    if (input.nonpenetration !== true || !boolean(input.laminated) || !nonnegative(input.dr)) return missing(F2_FIELDS.Spall);
    // HT170 uses the linked blast maximum, never the kinetic impact maximum.
    const blast = component(shot, "linked");
    const dice = /\bcr\s+ex\b/.test(blast?.formula ?? "") ? formulaDice(blast.formula) : null;
    if (!dice) return missing(["Components"]);
    const r = heshSpall({ maximumBlast: Math.max(0, (6 * dice.dice + dice.adds) * dice.multiplier), dr: input.dr, laminated: input.laminated });
    return result(input.laminated ? "Laminated" : "SpallResult", { damage: r.damage, dr: r.effectiveDR });
  }
  if (kind === "Falloff") {
    if (!damage.rules?.explosionFalloff || !component(shot, "kinetic") || !nonnegative(input.damage) || !number(input.distance) || input.distance <= 0 || input.rawConfirmed !== true)
      return missing(F2_FIELDS.Falloff);
    const r = thermobaricDamage({ damage: input.damage, distanceYards: input.distance });
    return result("DamageResult", { damage: r.damage, divisor: r.divisor });
  }
  if (kind === "Reliability") {
    if (!Number.isInteger(input.tl) || input.tl < 5) return missing(["tl"]);
    const saved = damage.rules?.sapleReliability ?? damage.support?.manual?.find(c => c.id === "P4SAPLEReliability");
    const savedTL = saved?.tl ?? (number(saved?.successAtMost) ? saved.successAtMost + 2 : null);
    if (savedTL !== null && savedTL !== undefined && savedTL !== input.tl) return missing(["tl"]);
    if (input.tl >= 7) return result("NoFuzeRoll");
    if (!Number.isInteger(input.die) || input.die < 1 || input.die > 6) return missing(["die"]);
    return result("FuzeResult", { die: input.die, threshold: input.tl - 2, state: f2Text(input.die <= input.tl - 2 ? "triggered" : "failed", runtime) });
  }
  const rule = damage.rules?.fuzeTracer;
  if (!rule || rule.variantId !== "ht_self_destruct" || !number(rule.selfDestructDistanceYards) || rule.selfDestructDistanceYards <= 0 ||
      !rule.selfDestructDistanceSource || !nonnegative(input.path)) return missing(["Flight", "path"]);
  return result("FlightResult", { distance: rule.selfDestructDistanceYards, state: f2Text(selfDestructDistanceReached(rule, input.path) ? "reached" : "unreached", runtime) });
}

const booleanFields = new Set(["carrierHit", "penetration", "guaranteed", "era", "rawConfirmed", "nonpenetration", "laminated"]);
export function appendF2Conditions(details, resolved, runtime, refresh, extension = {}) {
  let rows = f2RowsForShot(resolved?.shot);
  if (!rows.length && !extension.rows?.length) return;
  const doc = runtime.document, add = (parent, tag, text) => { const el = doc.createElement(tag); if (text !== undefined) el.textContent = text; parent.append(el); return el; };
  if (!canManageAmmunitionShot(resolved,runtime)) return;
  if (resolved.messageId !== resolved.source.id) rows = rows.filter(r => r.component === resolved.role ||
    r.kind === "Linked" && resolved.role === "kinetic" && component(resolved.shot, "kinetic")?.relation === "linked-blast-primary");
  rows.push(...(extension.rows ?? []).filter(r => resolved.messageId === resolved.source.id || r.components.includes(resolved.role)));
  if (!rows.length) return;
  const local = add(details, "details"); local.className = "olegurps-f2-local";
  add(local, "summary", f2Text("Local", runtime)); add(local, "div", f2Text("LocalHint", runtime));
  const select = add(local, "select"); select.setAttribute("aria-label", f2Text("Local", runtime));
  for (const r of rows) { const option = add(select, "option", r.name ?? f2Text("Name" + r.kind, runtime)); option.value = r.id; }
  const fields = add(local, "div"); fields.className = "olegurps-f2-fields";
  const controls = new Map(), output = add(local, "div");
  const build = () => {
    fields.replaceChildren(); output.textContent = ""; controls.clear();
    const extra = extension.fields?.(select.value);
    if (extra) {
      for (const field of extra) {
        const label = add(fields, "label", field.label); if (field.wide) label.className = "olegurps-f2-wide";
        const control = add(label, field.choices ? "select" : "input"); control.name = field.key;
        if (field.choices) for (const [value, text] of field.choices) { const option = add(control, "option", text); option.value = value; }
        else { control.type = field.type ?? "number"; control.step = "any"; }
        control.addEventListener("input", () => { output.textContent = ""; });
        control.addEventListener("change", () => { output.textContent = ""; });
        controls.set(field.key, control);
      }
      return;
    }
    const kind = F2_ROWS[select.value].kind;
    const keys = kind === "Fragments" && !component(resolved.shot, "follow-up") ? F2_FIELDS.Fragments.slice(0, 6) : F2_FIELDS[kind];
    for (const key of keys) {
      const label = add(fields, "label", f2Text(key, runtime));
      if (booleanFields.has(key) || key === "target") label.className = "olegurps-f2-wide";
      const choices = booleanFields.has(key) ? ["", "yes", "no"] : key === "posture" ? ["", "standing", "crouching", "kneeling", "crawling", "sitting", "lying"] : null;
      const control = add(label, choices ? "select" : "input");
      control.name = key;
      if (choices) for (const choice of choices) { const option = add(control, "option", choice ? f2Text(choice, runtime) : "\u2014"); option.value = choice; }
      else { control.type = key === "target" ? "text" : "number"; control.step = "any"; }
      // User values remain properties of this GM-only DOM, never value attributes or message HTML.
      control.addEventListener("input", () => { output.textContent = ""; });
      controls.set(key, control);
    }
  };
  select.addEventListener("change", build); build();
  const calculate = add(local, "button", f2Text("Calculate", runtime)); calculate.type = "button";
  calculate.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation(); output.textContent = "";
    const current = refresh();
    if (!canManageAmmunitionShot(current,runtime) || !current || current.source.id !== resolved.source.id || current.shot.attackId !== resolved.shot.attackId || current.role !== resolved.role) { local.remove(); return; }
    if (extension.fields?.(select.value)) {
      output.textContent = extension.calculate(current, select.value, controls);
      return;
    }
    const input = {};
    for (const [key, control] of controls) input[key] = booleanFields.has(key) ? control.value === "" ? undefined : control.value === "yes" :
      ["target", "posture"].includes(key) ? control.value : control.value.trim() === "" ? undefined : Number(control.value);
    if (F2_ROWS[select.value].kind === "Fragments" && !component(current.shot, "follow-up")) input.guaranteed = false;
    const result = calculateF2(current, select.value, input, runtime);
    if (!result) return;
    output.textContent = result.status === "unresolved" ? f2Text("Missing", runtime, { fields: result.fields.map(k => f2Text(k, runtime)).join(", ") }) :
      f2Text("Result", runtime, { result: f2Text(result.key, runtime, result.values).replace(/\.$/, "") });
  });
  const clear = add(local, "button", f2Text("Clear", runtime)); clear.type = "button";
  clear.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); build(); });
}
