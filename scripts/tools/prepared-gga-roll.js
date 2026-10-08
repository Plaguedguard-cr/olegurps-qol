import { buildRandomHitLocationsHtml } from "./hit-location-result.js";

function getRollMessages(result) {
  return Object.keys(result ?? {})
    .filter(key => key.toLowerCase().includes("message") && result[key])
    .map(key => result[key]);
}

export function buildCompactAttackModifiers(value) {
  const modifier = Number(value);
  if (!Number.isFinite(modifier) || modifier === 0) return [];
  const normalized = Math.trunc(modifier);
  return [{ mod: normalized, modint: normalized, desc: "" }];
}

const escapeModifierHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

export function normalizeAttackModifierDetails(modifiers = []) {
  return (Array.isArray(modifiers) ? modifiers : []).flatMap(entry => {
    const rawValue = typeof entry === "number" ? entry : entry?.value ?? entry?.modint ?? entry?.mod;
    const value = Math.trunc(Number(rawValue));
    if (!Number.isFinite(value) || value === 0) return [];
    const rawLabel = typeof entry === "object" ? entry?.label ?? entry?.desc : "";
    const label = String(rawLabel ?? "").trim().replace(/^[-+]?\d+\s+/u, "") || "\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440";
    return [{ label, value }];
  });
}

export function reconcileAttackModifierDetails(modifiers = [], expectedTotal = 0, capLabel = "Ограничение effective skill") {
  const details = normalizeAttackModifierDetails(modifiers);
  const describedTotal = details.reduce((total, entry) => total + entry.value, 0);
  const adjustment = Math.trunc(Number(expectedTotal)) - describedTotal;
  if (Number.isFinite(adjustment) && adjustment !== 0) {
    details.push({ label: capLabel, value: adjustment });
  }
  return details;
}

export function buildAttackModifierBreakdownHtml(modifiers = []) {
  const details = normalizeAttackModifierDetails(modifiers);
  if (!details.length) return "";
  const lines = details.map(({ label, value }) =>
    `<span class="olegurps-attack-modifier-item">${escapeModifierHtml(label)} (${value > 0 ? "+" : ""}${value})</span>`
  ).join("<br>");
  return `<details class="olegurps-attack-modifiers"><summary style="cursor:pointer"><strong>\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b:</strong></summary><div>${lines}</div></details>`;
}
const ACTIVE_CHAT_MESSAGE_CAPTURES = new WeakMap();

export async function createRollChatMessage(ChatMessage, messageData, options) {
  if (typeof ChatMessage?.create !== "function") throw new Error("ChatMessage.create недоступен.");
  return ChatMessage.create(messageData, options);
}

export async function executeWithCapturedRollMessage({ ChatMessage = globalThis.ChatMessage, actorId = "", execute } = {}) {
  if (typeof ChatMessage?.create !== "function" || typeof execute !== "function") {
    return { result: await execute?.(), message: null };
  }

  let captureState = ACTIVE_CHAT_MESSAGE_CAPTURES.get(ChatMessage);
  if (!captureState) {
    const originalCreate = ChatMessage.create;
    captureState = { originalCreate, sessions: new Set(), wrapper: null };
    captureState.wrapper = function(messageData, ...args) {
      const creation = Promise.resolve(originalCreate.call(this, messageData, ...args));
      const speakerActor = String(messageData?.speaker?.actor ?? "");
      const hasRoll = Array.isArray(messageData?.rolls) && messageData.rolls.length > 0;
      for (const session of captureState.sessions) {
        if (!session.messagePromise && hasRoll && (!session.actorId || speakerActor === session.actorId)) {
          session.messagePromise = creation;
        }
      }
      return creation;
    };
    ChatMessage.create = captureState.wrapper;
    ACTIVE_CHAT_MESSAGE_CAPTURES.set(ChatMessage, captureState);
  }

  const session = { actorId: String(actorId ?? ""), messagePromise: null };
  captureState.sessions.add(session);
  let result;
  try {
    result = await execute();
  } finally {
    captureState.sessions.delete(session);
    if (captureState.sessions.size === 0) {
      if (ChatMessage.create === captureState.wrapper) ChatMessage.create = captureState.originalCreate;
      ACTIVE_CHAT_MESSAGE_CAPTURES.delete(ChatMessage);
    }
  }
  return { result, message: session.messagePromise ? await session.messagePromise : null };
}

function getCriticalState(total, target) {
  return {
    isCritSuccess: total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16),
    isCritFailure: total >= 18 || (total === 17 && target <= 15) || (total - target >= 10 && target > 0)
  };
}

export async function executePreparedGgaRoll({
  actor,
  token,
  attack,
  baseSkill: preparedBaseSkill = null,
  baseSkillName = null,
  effectiveSkill,
  physicalShots,
  effectiveRoF,
  extremelyClose = false,
  rcl,
  maximumHits = null,
  contextLabel = "",
  consumeAction = true,
  maneuver = null,
  capLabel = undefined,
  visibilityPenalty = 0,
  visibilityCapAdjustment = 0,
  concealTargetDetails = false,
  trademarkMoveBonus = 0,
  rangedRapidStrikePenalty = 0,
  quickShotBonus = 0,
  quickShotLabel = null,
  combatCalculation = null,
  runtime = globalThis
}) {
  const GURPS = runtime.GURPS;
  const game = runtime.game;
  const canvas = runtime.canvas;
  const ChatMessage = runtime.ChatMessage;
  const Roll = runtime.Roll;
  const renderTemplate = runtime.renderTemplate;
  if (!GURPS?.ModifierBucket || !ChatMessage || !Roll?.create || !renderTemplate) {
    throw new Error("GGA prepared-roll API недоступен.");
  }

  const cleanName = String(attack?.name ?? "").replace(/\[[^\]]*]/g, "").trim();
  const exactName = attack?.mode ? `${cleanName} (${String(attack.mode).trim()})` : cleanName;
  const quotedName = exactName.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const actorPrefix = actor?.id ? `@${actor.id}@` : "";
  const chatthing = `[${actorPrefix}R:"${quotedName}"]`;
  const followon = `[${actorPrefix}D:"${quotedName}"]`;
  const action = {
    type: "attack",
    name: exactName,
    orig: `R:"${quotedName}"`,
    isMelee: false,
    isRanged: true,
    ...(maneuver ? { maneuver } : {})
  };
  const actionObject = attack?.data ?? attack;
  const canRoll = typeof actor?.canRoll === "function"
    ? await actor.canRoll(action, token, chatthing, actionObject)
    : { canRoll: true, hasActions: true };
  for (const message of getRollMessages(canRoll)) runtime.ui?.notifications?.warn?.(message);
  if (!canRoll?.canRoll) return { rolled: false, rollData: null };

  const taggedSettings = game?.settings?.get?.("gurps", "use-tagged-modifiers");
  if (taggedSettings?.autoAdd && typeof actor?.addTaggedRollModifiers === "function") {
    await GURPS.ModifierBucket.clearTaggedModifiers?.();
    await actor.addTaggedRollModifiers(chatthing, { obj: actionObject, action }, actionObject);
  }

  const usingRapidStrike = !!GURPS.ModifierBucket.modifierStack?.usingRapidStrike;
  const targetmods = await GURPS.ModifierBucket.applyMods([]);
  let modifier = 0;
  let maximumTarget = null;
  for (const entry of targetmods) {
    const value = Number(entry?.modint ?? entry?.mod ?? 0);
    if (Number.isFinite(value)) modifier += value;
    const cap = await GURPS.applyModifierDesc?.(actor, String(entry?.desc ?? ""));
    if (typeof cap === "number" && Number.isFinite(cap)) maximumTarget = cap;
  }

  const selectedBase = preparedBaseSkill === null ? Number.NaN : Number(preparedBaseSkill);
  const baseSkill = Math.trunc(Number.isFinite(selectedBase) ? selectedBase : Number(attack?.level) || 0);
  const preparedSkill = Math.trunc(Number(effectiveSkill));
  let finaltarget = Number.isFinite(preparedSkill) ? preparedSkill : baseSkill + modifier;
  if (Number.isFinite(maximumTarget)) finaltarget = Math.min(finaltarget, maximumTarget);
  finaltarget = Math.max(3, finaltarget);

  const formula = `3d6[${cleanName.replaceAll("[", "").replaceAll("]", "").trim()}]`;
  const roll = Roll.create(formula);
  await roll.evaluate();
  const total = Number(roll.total);
  const margin = finaltarget - total;
  const seventeen = total >= 17;
  const failure = seventeen || margin < 0;
  const { isCritSuccess, isCritFailure } = getCriticalState(total, finaltarget);
  const rollValues = roll.dice?.[0]?.results?.map(entry => entry.result) ?? [];
  const speaker = ChatMessage.getSpeaker({ actor });
  const normalHitCap = Math.max(0, Math.trunc(Number(effectiveRoF) || 0));
  const hasRequestedHitCap = maximumHits !== null && maximumHits !== undefined && maximumHits !== "";
  const requestedHitCap = Number(maximumHits);
  const hitCap = hasRequestedHitCap && Number.isFinite(requestedHitCap)
    ? Math.min(normalHitCap, Math.max(0, Math.trunc(requestedHitCap)))
    : normalHitCap;
  const safeRcl = Math.max(1, Math.trunc(Number(rcl) || 1));
  const potentialHits = margin >= 0 ? Math.min(hitCap, 1 + Math.floor(margin / safeRcl)) : 0;
  const displayRof = !extremelyClose && attack?.rof && String(attack.rof).match(/[xX\u00d7*]/u)
    ? `${physicalShots}\u00d7${Math.max(1, Math.trunc(hitCap / Math.max(1, physicalShots)))}`
    : String(effectiveRoF ?? physicalShots ?? 1);

  const chatdata = {
    prefix: "",
    chatthing,
    thing: cleanName,
    origtarget: baseSkill,
    fromUser: game.user.id,
    targetmods: buildCompactAttackModifiers(finaltarget - baseSkill),
    multiples: [{ rtotal: total, loaded: !!roll.isLoaded, rolls: rollValues.join() }],
    showPlus: true,
    rtotal: total,
    loaded: !!roll.isLoaded,
    rolls: rollValues.join(","),
    modifier: finaltarget - baseSkill,
    finaltarget,
    isCritSuccess,
    isCritFailure,
    margin,
    failure,
    seventeen,
    isDraggable: !seventeen && margin !== 0,
    otf: `${margin >= 0 ? "+" : ""}${margin} margin for ${cleanName}`,
    followon,
    optlabel: "",
    isBlind: false,
    rof: displayRof,
    rcl: safeRcl,
    rofrcl: concealTargetDetails ? null : potentialHits
  };
  GURPS.setLastTargetedRoll?.(chatdata, speaker.actor, speaker.token, true);

  let content = await renderTemplate("systems/gurps/templates/die-roll-chat-message.hbs", chatdata);
  if (contextLabel) {
    const safeContext = String(contextLabel).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
    content += `<p><strong>${safeContext}</strong></p>`;
  }
  const displayedModifiers = concealTargetDetails
    ? normalizeAttackModifierDetails([
        { label: "\u041f\u0440\u043e\u0447\u0438\u0435 \u043c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b", value: finaltarget - baseSkill - visibilityPenalty - visibilityCapAdjustment - trademarkMoveBonus - rangedRapidStrikePenalty - quickShotBonus },
        { label: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c", value: visibilityPenalty },
        { label: capLabel ?? "Cap Shooting Blind: 9", value: visibilityCapAdjustment },
        { label: "Trademark Move", value: trademarkMoveBonus },
        ...(combatCalculation ? [{ label: "Ranged Rapid Strike / Quick-Shot",
          value: combatCalculation.channels.find(entry => entry.id === "rangedRapidStrike")?.resolvedValue ?? 0 }]
          : [{ label: "Ranged Rapid Strike", value: rangedRapidStrikePenalty },
            { label: quickShotLabel ?? "Quick-Shot", value: quickShotBonus }])
      ])
    : reconcileAttackModifierDetails(combatCalculation
      ? [...combatCalculation.modifiers.filter(entry => entry.value !== 0),
          { label: "Trademark Move", value: trademarkMoveBonus }]
      : targetmods, finaltarget - baseSkill, capLabel);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(displayedModifiers);
  if (modifierBreakdown) content += modifierBreakdown;
  if (combatCalculation && !concealTargetDetails) {
    const transitions = combatCalculation.channels.filter(entry =>
      entry.resolver && entry.baseValue !== entry.resolvedValue)
      .map(entry => `<span>${escapeModifierHtml(entry.explanation ||
        `${entry.id}: ${entry.baseValue} -> ${entry.resolvedValue}`)}</span>`);
    content += `<details class="olegurps-combat-channel-breakdown"><summary style="cursor:pointer">Skill details</summary><div><strong>${escapeModifierHtml(
      combatCalculation.baseSkillName)}: ${combatCalculation.baseSkill}</strong>` +
      (transitions.length ? `<br>${transitions.join("<br>")}` : "") + `</div></details>`;
  }
  const messageData = {
    user: game.user.id,
    speaker,
    content,
    rolls: [roll],
    sound: runtime.CONFIG?.sounds?.dice
  };
  const rollMode = game.settings?.get?.("core", "rollMode");
  if (rollMode) ChatMessage.applyRollMode?.(messageData, rollMode);
  const chatMessage = await createRollChatMessage(ChatMessage, messageData);

  const actorToken = canvas?.tokens?.placeables?.find(entry => entry.id === speaker.token);
  if (consumeAction && actorToken) {
    try {
      const loader = runtime.__olegurpsLoadTokenActions ?? (() => import("/systems/gurps/module/token-actions.js"));
      const { TokenActions } = await loader();
      const actions = await TokenActions.fromToken(actorToken);
      await actions.consumeAction(action, chatthing, actionObject, usingRapidStrike);
    } catch (error) {
      console.error("Не удалось обновить GGA action state после подготовленного броска:", error);
    }
  }

  return { rolled: true, rollData: chatdata, roll, message: chatMessage };
}
// Generic prepared skill roll: no ranged document, attack dialogs or ammunition side effects.
export async function executePreparedSkillRoll({ actor, baseSkill, effectiveSkill, effectiveRoF = 1,
  rcl = null, location, targetingService, closeMultiplier = null, modifierDetails = [], runtime = globalThis }) {
  if (!Number.isFinite(Number(effectiveSkill))) throw new Error("Не рассчитано Эффективное умение.");
  const finaltarget = Math.max(3, Math.trunc(Number(effectiveSkill)));
  const roll = runtime.Roll.create("3d6[Fire Control]");
  await roll.evaluate();
  const total = Number(roll.total);
  const margin = finaltarget - total;
  const failure = total >= 17 || margin < 0;
  const critical = getCriticalState(total, finaltarget);
  const hits = !failure && Number.isFinite(rcl) && rcl > 0
    ? Math.min(effectiveRoF, 1 + Math.floor(margin / rcl)) : null;
  let locationLabel = location?.label ?? "";
  let randomHitLocations = [];
  if (!failure && location?.random && targetingService) {
    try {
      const locationCount = Number.isInteger(hits) ? hits : 1;
      randomHitLocations = await targetingService.resolveRandomHitLocations(locationCount);
      locationLabel = "";
    } catch (error) {
      console.error("Fire Control: не удалось определить случайные зоны попаданий.", error);
      runtime.ui?.notifications?.warn?.("Бросок выполнен, но случайные зоны не определены.");
    }
  }
  const data = {
    prefix: "", chatthing: "Fire Control", thing: "Fire Control", origtarget: baseSkill,
    fromUser: runtime.game.user.id,
    targetmods: buildCompactAttackModifiers(finaltarget - baseSkill), showPlus: true,
    multiples: [{ rtotal: total, loaded: !!roll.isLoaded, rolls: (roll.dice?.[0]?.results ?? []).map(r => r.result).join() }],
    rtotal: total, modifier: finaltarget - baseSkill, finaltarget, margin, failure,
    seventeen: total >= 17, ...critical, isDraggable: false,
    followon: "", optlabel: "", isBlind: false,
    rof: hits === null ? null : String(effectiveRoF), rcl, rofrcl: hits
  };
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let content = await runtime.renderTemplate("systems/gurps/templates/die-roll-chat-message.hbs", data);
  const displayedModifiers = reconcileAttackModifierDetails(modifierDetails, finaltarget - baseSkill);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(displayedModifiers);
  if (modifierBreakdown) content += modifierBreakdown;
  if (randomHitLocations.length) {
    content += buildRandomHitLocationsHtml(randomHitLocations, { escapeHtml: escape });
  }
  const hasDisplayedLocationModifier = displayedModifiers.some(entry =>
    String(entry?.label ?? "").includes("Hit Location:")
  );
  const attackDetails = [];
  if (locationLabel && !hasDisplayedLocationModifier) attackDetails.push(`Hit Location: ${escape(locationLabel)}`);
  if (closeMultiplier) attackDetails.push(`Extremely Close: basic damage \u00d7${closeMultiplier}, DR \u00d7${closeMultiplier}`);
  if (attackDetails.length) content += `<details class="olegurps-attack-context"><summary style="cursor:pointer">Attack details</summary><div>${attackDetails.join("<br>")}</div></details>`;
  const message = { user: runtime.game.user.id, speaker: runtime.ChatMessage.getSpeaker(actor ? { actor } : {}),
    content, rolls: [roll], sound: runtime.CONFIG?.sounds?.dice };
  const rollMode = runtime.game.settings?.get?.("core", "rollMode");
  if (rollMode) runtime.ChatMessage.applyRollMode?.(message, rollMode);
  const chatMessage = await createRollChatMessage(runtime.ChatMessage, message);
  return { rolled: true, rollData: data, roll, message: chatMessage };
}
