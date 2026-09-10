function getRollMessages(result) {
  return Object.keys(result ?? {})
    .filter(key => key.toLowerCase().includes("message") && result[key])
    .map(key => result[key]);
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
  effectiveSkill,
  physicalShots,
  effectiveRoF,
  extremelyClose = false,
  rcl,
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
    isRanged: true
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
    if (Number.isFinite(Number(cap))) maximumTarget = Number(cap);
  }

  const baseSkill = Math.trunc(Number(attack?.level) || 0);
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
  const hitCap = Math.max(0, Math.trunc(Number(effectiveRoF) || 0));
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
    targetmods,
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
    rofrcl: potentialHits
  };
  GURPS.setLastTargetedRoll?.(chatdata, speaker.actor, speaker.token, true);

  const content = await renderTemplate("systems/gurps/templates/die-roll-chat-message.hbs", chatdata);
  const messageData = {
    user: game.user.id,
    speaker,
    content,
    rolls: [roll],
    sound: runtime.CONFIG?.sounds?.dice
  };
  const rollMode = game.settings?.get?.("core", "rollMode");
  if (rollMode) ChatMessage.applyRollMode?.(messageData, rollMode);
  await ChatMessage.create(messageData);

  const actorToken = canvas?.tokens?.placeables?.find(entry => entry.id === speaker.token);
  if (actorToken) {
    try {
      const loader = runtime.__olegurpsLoadTokenActions ?? (() => import("/systems/gurps/module/token-actions.js"));
      const { TokenActions } = await loader();
      const actions = await TokenActions.fromToken(actorToken);
      await actions.consumeAction(action, chatthing, actionObject, usingRapidStrike);
    } catch (error) {
      console.error("Не удалось обновить GGA action state после подготовленного броска:", error);
    }
  }

  return { rolled: true, rollData: chatdata, roll };
}