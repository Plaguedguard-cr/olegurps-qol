import { createGgaDamageWithEasterEgg } from "./damage-result-easter-egg.js";
import { buildAttackModifierBreakdownHtml, buildCompactAttackModifiers, executeWithCapturedRollMessage } from "./prepared-gga-roll.js";

const integer = value => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

export function getRapidStrikePenalty(hasWeaponMasterOrTrainedByMaster = false) {
  return hasWeaponMasterOrTrainedByMaster === true ? -3 : -6;
}
export function getEvaluateBonus(value) {
  return Math.min(3, Math.max(0, integer(value)));
}

export function getAllOutAttackSkillBonus(allOutAttack, mode) {
  return allOutAttack && mode === "determined" ? 4 : 0;
}

export function calculateMeleeSkillBeforeDeceptive({ baseSkill, manualModifier = 0, evaluate = 0,
  moveAndAttack = false, allOutAttack = false, allOutAttackMode = "determined",
  hitLocationPenalty = 0, rapidStrikePenalty = 0 } = {}) {
  const base = Number(baseSkill);
  if (!Number.isFinite(base)) return null;
  const allOutBonus = moveAndAttack ? 0 : getAllOutAttackSkillBonus(allOutAttack, allOutAttackMode);
  let effective = Math.trunc(base) + integer(manualModifier) + getEvaluateBonus(evaluate) +
    integer(hitLocationPenalty) + integer(rapidStrikePenalty) + allOutBonus;
  if (moveAndAttack) effective = Math.min(9, effective - 4);
  return effective;
}

export function getMaximumDeceptiveAttackPenalty(skillBeforeDeceptive, moveAndAttack = false) {
  const skill = Number(skillBeforeDeceptive);
  if (moveAndAttack || !Number.isFinite(skill) || skill <= 10) return 0;
  return Math.max(0, Math.floor((Math.trunc(skill) - 10) / 2) * 2);
}

export function normalizeDeceptiveAttackPenalty(value, skillBeforeDeceptive, moveAndAttack = false) {
  const requested = Math.floor(Math.abs(integer(value)) / 2) * 2;
  const maximum = getMaximumDeceptiveAttackPenalty(skillBeforeDeceptive, moveAndAttack);
  return -Math.min(requested, maximum);
}

export function getDeceptiveDefensePenalty(value) {
  return -Math.floor(Math.abs(integer(value)) / 2);
}

export function calculateMeleeEffectiveSkill(options = {}) {
  const beforeDeceptive = calculateMeleeSkillBeforeDeceptive(options);
  if (!Number.isFinite(beforeDeceptive)) return null;
  const deceptive = normalizeDeceptiveAttackPenalty(
    options.deceptiveAttack,
    beforeDeceptive,
    options.moveAndAttack
  );
  return beforeDeceptive + deceptive;
}

export function modifyDicePlusAdds(formula) {
  const source = String(formula ?? "").trim();
  const match = source.match(/^(\d+)d(?:6)?\s*\+\s*(\d+)(.*)$/iu);
  if (!match) return source;
  let dice = Number(match[1]);
  let adds = Number(match[2]);
  dice += Math.floor(adds / 7) * 2;
  adds %= 7;
  if (adds >= 4) {
    dice += 1;
    adds -= 4;
  }
  return String(dice) + "d" + (adds > 0 ? "+" + adds : "") + match[3];
}

export function applyAllOutAttackStrong(formula) {
  const source = String(formula ?? "").trim();
  const match = source.match(/^(\d+)d(?:6)?([+-]\d+)?(.*)$/iu);
  if (!match) return source;
  const dice = Number(match[1]);
  const adds = integer(match[2]);
  const strongBonus = Math.max(2, dice);
  const totalAdds = adds + strongBonus;
  const addText = totalAdds === 0 ? "" : (totalAdds > 0 ? "+" : "") + totalAdds;
  return String(dice) + "d" + addText + match[3];
}

function damageUsesStrength(value, seen = new Set()) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return /(?:^|[^a-z])(sw|swing|thr|thrust)(?=$|[^a-z])/iu.test(value);
  if (Array.isArray(value)) return value.some(entry => damageUsesStrength(entry, seen));
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const key of ["damage", "sourceDamage", "originalDamage", "derivedformula", "formula", "damageAction", "action", "parsedDamage"]) {
    if (damageUsesStrength(value[key], seen)) return true;
  }
  return false;
}

export function isStrengthBasedMeleeDamage(attack) {
  return damageUsesStrength(attack);
}

export function resolveDerivedDamageFormula(baseFormula, actionFormula = "") {
  const base = String(baseFormula ?? "").trim();
  const add = String(actionFormula ?? "").trim();
  const baseMatch = base.match(/^(\d+)d(?:6)?([+-]\d+)?(.*)$/iu);
  if (!baseMatch) return null;
  const actionMatch = add.match(/^([+-]\d+)?(.*)$/u);
  if (!actionMatch) return null;
  const dice = Number(baseMatch[1]);
  const totalAdds = integer(baseMatch[2]) + integer(actionMatch[1]);
  const adds = totalAdds === 0 ? "" : (totalAdds > 0 ? "+" : "") + totalAdds;
  return String(dice) + "d" + adds + baseMatch[3] + actionMatch[2];
}

export function getCurrentTargetNames() {
  return Array.from(globalThis.game?.user?.targets ?? []).map(token => String(token?.name ?? "")).filter(Boolean);
}


async function performMeleeActionWithoutConfirmation(callback) {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2 || typeof DialogV2.wait !== "function") return callback();
  const originalWait = DialogV2.wait;
  const confirmationTitle = globalThis.game?.i18n?.localize?.("GURPS.confirmRoll") ?? "Roll Confirmation";
  let bypassed = false;
  const bypassWait = function(options, ...args) {
    if (!bypassed && options?.window?.title === confirmationTitle) {
      bypassed = true;
      const rollButton = options?.buttons?.find(button => button?.action === "roll")
        ?? options?.buttons?.find(button => button?.default === true);
      return typeof rollButton?.callback === "function"
        ? Promise.resolve(rollButton.callback(null, rollButton, null))
        : Promise.resolve(false);
    }
    return originalWait.call(this, options, ...args);
  };
  DialogV2.wait = bypassWait;
  try {
    return await callback();
  } finally {
    if (DialogV2.wait === bypassWait) DialogV2.wait = originalWait;
  }
}

export async function executeNativeMeleeAttack({ actor, sourceAttack, effectiveSkill, locationText = "", overrideText = "", modifierDetails = [], captureMessage = false, maneuver = null, deceptiveDefensePenalty = 0 } = {}) {
  if (typeof globalThis.GURPS?.performAction !== "function") throw new Error("GGA performAction недоступен.");
  const originalLevel = Number(sourceAttack?.level ?? sourceAttack?.import);
  if (!Number.isFinite(originalLevel) || !Number.isFinite(Number(effectiveSkill))) {
    throw new Error("Не удалось определить уровень выбранной melee-атаки.");
  }
  const name = String(sourceAttack?.name ?? "").trim();
  const mode = String(sourceAttack?.mode ?? "").trim();
  if (!name) throw new Error("У выбранной melee-атаки нет названия.");
  const actionName = mode ? name + " (" + mode + ")" : name;
  const modifier = Math.trunc(Number(effectiveSkill)) - Math.trunc(originalLevel);
  const [compactModifier] = buildCompactAttackModifiers(modifier);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(modifierDetails);
  const displayText = [overrideText || locationText, modifierBreakdown].filter(Boolean).join("<br>");
  const perform = () => performMeleeActionWithoutConfirmation(() => globalThis.GURPS.performAction({
    type: "attack",
    name: actionName,
    isMelee: true,
    isRanged: false,
    mod: compactModifier ? String(compactModifier.modint) : undefined,
    desc: compactModifier?.desc ?? "",
    overridetxt: displayText || undefined,
    maneuver,
    deceptiveDefensePenalty: integer(deceptiveDefensePenalty),
    orig: "M:" + actionName
  }, actor, null, getCurrentTargetNames()));
  globalThis.GURPS.SetLastActor?.(actor);
  const execution = captureMessage
    ? await executeWithCapturedRollMessage({ ChatMessage: globalThis.ChatMessage, actorId: actor?.id, execute: perform })
    : { result: await perform(), message: null };
  return { success: !!execution.result, message: execution.message ?? null };
}

function materializeDamageAction(source, actor, dicePlusAdds, allOutStrong = false, overrideText = "") {
  if (!source || !["damage", "deriveddamage"].includes(source.type)) return null;
  const action = { ...source };
  if (action.type === "deriveddamage") {
    const base = /sw/i.test(action.derivedformula) ? actor?.system?.swing : actor?.system?.thrust;
    const resolved = resolveDerivedDamageFormula(base, action.formula);
    if (!resolved) return null;
    action.type = "damage";
    action.formula = resolved;
    action.overridetxt = overrideText || action.orig || null;
    delete action.derivedformula;
  }
  if (allOutStrong) action.formula = applyAllOutAttackStrong(action.formula);
  if (dicePlusAdds) action.formula = modifyDicePlusAdds(action.formula);
  return action;
}

function structuredDamageAction(attack) {
  const candidates = [
    attack?.damageAction,
    attack?.action?.damage,
    attack?.data?.damageAction,
    attack?.data?.action?.damage,
    attack?.data?.parsedDamage,
    attack?.data?.damage
  ];
  for (const candidate of candidates) {
    const action = candidate?.action ?? candidate;
    if (action && typeof action === "object" && ["damage", "deriveddamage"].includes(action.type)) return action;
  }
  return null;
}

let nativeDamageParserPromise = null;
async function getNativeDamageParser() {
  if (typeof globalThis.GURPS?.parseForRollOrDamage === "function") {
    return globalThis.GURPS.parseForRollOrDamage.bind(globalThis.GURPS);
  }
  nativeDamageParserPromise ??= import("/systems/gurps/lib/parselink.js")
    .then(module => module.parseForRollOrDamage)
    .catch(() => null);
  return nativeDamageParserPromise;
}

function fallbackDamageAction(expression) {
  const match = String(expression ?? "").trim().match(
    /^(?<formula>(?:\d+d(?:6)?(?:[+-]\d+)?|\d+)(?:[xX*]\d+(?:\.\d+)?)?(?:\(\d*\.?\d+\))?!?)\s+(?<type>[^\s,]+)(?<extra>.*)$/u
  );
  if (!match?.groups) return null;
  return {
    type: "damage",
    formula: match.groups.formula,
    damagetype: match.groups.type,
    extdamagetype: match.groups.extra.trim() || undefined,
    orig: String(expression).trim()
  };
}

export async function buildMeleeDamageAction({ actor, attack, damage, dicePlusAdds = false, allOutStrong = false } = {}) {
  const expression = String(damage ?? attack?.damage ?? "").trim();
  const sourceExpression = String(Array.isArray(attack?.sourceDamage)
    ? attack.sourceDamage.join(", ")
    : attack?.sourceDamage ?? "").trim();
  const hasDamageOverride = !!sourceExpression && expression !== sourceExpression;
  let action = hasDamageOverride ? null : structuredDamageAction(attack);
  if (!action && expression) {
    const nativeParser = await getNativeDamageParser();
    action = nativeParser?.(expression)?.action ?? fallbackDamageAction(expression);
  }
  const applyStrong = allOutStrong && isStrengthBasedMeleeDamage(attack);
  return materializeDamageAction(action, actor, dicePlusAdds, applyStrong, expression);
}

export function formatMeleeDamageAction(action) {
  if (!action?.formula) return "";
  return [action.formula, action.damagetype, action.extdamagetype]
    .map(value => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export async function prepareEffectiveMeleeDamage({ actor, attack, dicePlusAdds = false, allOutStrong = false } = {}) {
  const action = await buildMeleeDamageAction({ actor, attack, dicePlusAdds, allOutStrong });
  return action ? { action, formula: formatMeleeDamageAction(action) } : null;
}

export async function executeNativeMeleeDamage({ actor, attack, dicePlusAdds = false, allOutStrong = false,
  preparedDamage = null } = {}) {
  const DamageChat = globalThis.GURPS?.DamageChat;
  if (typeof DamageChat?.create !== "function") throw new Error("GGA DamageChat недоступен.");
  const applyStrong = allOutStrong && isStrengthBasedMeleeDamage(attack);
  let action = preparedDamage?.action
    ?? (await prepareEffectiveMeleeDamage({ actor, attack, dicePlusAdds, allOutStrong: applyStrong }))?.action;
  if (!action) throw new Error("Формула урона выбранной melee-атаки не распознана GGA.");
  globalThis.GURPS.SetLastActor?.(actor);
  const targets = getCurrentTargetNames();
  let rolled = false;
  while (action) {
    await createGgaDamageWithEasterEgg({
      DamageChat,
      actor,
      args: [
        actor,
        action.formula,
        action.damagetype,
        { shiftKey: false, ctrlKey: false, data: {} },
        action.overridetxt ?? null,
        [...targets],
        action.extdamagetype ?? null,
        action.hitlocation ?? null
      ]
    });
    rolled = true;
    action = materializeDamageAction(action.next, actor, dicePlusAdds, applyStrong, action.next?.orig ?? "");
  }
  return rolled;
}