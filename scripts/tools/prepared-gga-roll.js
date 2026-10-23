import { validateProximityShot } from './ut-he-proximity.js';
import {applyMessageMode} from './chat-message-mode.js';
import {SHOT_STORAGE_VERSION} from './shot-history-storage.js';
import { evaluatePreparedCheck, testRollNotice } from "./developer-roll-service.js";
import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { requiresUTPowerAccounting } from "../ut-source-data.js";
import { moduleText } from "../localization.js";
import { manualProjectileGuidance } from './ut-sefop.js';
import { utConventionalReadiness, UT_CONVENTIONAL_READY_MODES as UT_CONVENTIONAL_MODES } from "./ut-conventional-ammunition.js";
import { UT_SPECIAL_MODES, utSpecialReadiness, utPayloadChatHTML } from './ut-special-ammunition.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { captureKnockbackTargets } from './double-knockback.js';
import { gaussManualConditions } from './ut-gauss.js';

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
  return `<details class="olegurps-attack-modifiers olegurps-chat-details"><summary style="cursor:pointer"><strong>\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b:</strong></summary><div>${lines}</div></details>`;
}
const ACTIVE_CHAT_MESSAGE_CAPTURES = new WeakMap();
export {applyMessageMode as applyPreparedMessageMode} from './chat-message-mode.js';

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

/**
 * Count hits from RoF/Rcl using the already resolved attack outcome.
 * Pass executor rollData for attack results; omitted data keeps the legacy
 * arithmetic-only contract. Failure takes precedence even without a margin.
 */
export function calculateHitsFromMargin(shots, rcl, margin, rollData = null) {
  if(rollData?.manualProjectileHit===true)return null;
  if (rollData?.failure === true || rollData?.success === false) return 0;
  const safeShots = Math.max(0, Math.trunc(Number(shots) || 0));
  if(safeShots===1&&Number.isInteger(margin))return margin>=0?1:0;
  const safeRcl = Math.max(1, Math.trunc(Number(rcl) || 1));
  if (!Number.isInteger(margin)) return null;
  if (margin < 0) return 0;
  return Math.min(safeShots, 1 + Math.floor(margin / safeRcl));
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
  attackProfile = null,
  shotSnapshot = null,
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
  combatType = "ranged",
  attackContextHtml = "",
  deceptiveDefensePenalty = 0,
  telegraphicCriticalBonus = 0,
  skillCap = null,
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
  validateProximityShot(attackProfile);
  validateWeaponShotPower(actor, attackProfile, physicalShots ?? 1, attack);
  if (requiresUTPowerAccounting(attackProfile?.binding?.confirmed?.modeId ?? attack?.standaloneRef?.modeId))
    throw Object.assign(new Error(moduleText("OleGURPS.AttackProfile.UTPowerAccountingRequired")),
      { code: "UTPowerAccountingRequired" });
  const utReason = utSpecialReadiness(attackProfile?.binding?.confirmed?.modeId ?? attack?.standaloneRef?.modeId)??utConventionalReadiness(attackProfile?.binding?.confirmed?.modeId ?? attack?.standaloneRef?.modeId,
    attackProfile?.effective ?? attack?.data ?? attack);
  if (utReason) throw Object.assign(new Error(moduleText('OleGURPS.AttackProfile.'+utReason)),{code:utReason});
  const utModeId=attackProfile?.binding?.confirmed?.modeId ?? attack?.standaloneRef?.modeId;
  if(htPreGaussProfile(utModeId)&&(!attackProfile?.damage?.nativeSafe||attackProfile.damage.rules?.htSourceProfile!==utModeId))
    throw Error('Для этой атаки нужен подтверждённый физический заряд HT.');
  if ((UT_CONVENTIONAL_MODES[utModeId] || UT_SPECIAL_MODES[utModeId]) && attackProfile?.damage?.nativeSafe !== true)
    throw Object.assign(new Error(moduleText('OleGURPS.AttackProfile.'+(attackProfile?.damage?.reason ?? 'UTVariantUnavailable'))),
      {code:attackProfile?.damage?.reason ?? 'UTVariantUnavailable'});
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
  const manualSEFOP=!!attackProfile?.damage?.rules?.manualSEFOP;
  const proximity=!!attackProfile?.damage?.rules?.heProximity;
  const manualGuided=proximity||!!manualProjectileGuidance(attackProfile);
  const attackPrefix = combatType === "melee" ? "M" : "R";
  const chatthing = `[${actorPrefix}${attackPrefix}:"${quotedName}"]`;
  const followon = attackProfile?.damage?.rules?.instructionOnly&&!(attackProfile.damage.rules.fluid&&attackProfile.damage.components.some(c=>c.role==='linked')) ? '' : `[${actorPrefix}D:"${quotedName}"]`;
  const action = {
    type: "attack",
    name: exactName,
    orig: `${attackPrefix}:"${quotedName}"`,
    isMelee: combatType === "melee",
    isRanged: combatType !== "melee",
    ...(combatType === "melee" ? { deceptiveDefensePenalty: Math.trunc(Number(deceptiveDefensePenalty) || 0) } : {}),
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
  if (combatType === "melee" && Number.isFinite(preparedSkill)) finaltarget += modifier;
  if (skillCap !== null && Number.isFinite(Number(skillCap))) finaltarget = Math.min(finaltarget, Number(skillCap));
  if (Number.isFinite(maximumTarget)) finaltarget = Math.min(finaltarget, maximumTarget);
  finaltarget = Math.max(3, finaltarget);

  const formula = `3d6[${cleanName.replaceAll("[", "").replaceAll("]", "").trim()}]`;
  const { roll, testRoll } = await evaluatePreparedCheck(formula, runtime, "prepared-attack");
  const total = Number(roll.total);
  const margin = finaltarget - total;
  const seventeen = total >= 17;
  const hotCartridge=attackProfile?.damage?.rules?.plasmaGun?.hot===true;
  const hotshotMalf=(attackProfile?.damage?.rules?.plasmaParticle?.hotshot===true||hotCartridge)&&total>=14;
  const failure = seventeen || margin < 0 || hotshotMalf;
  const { isCritSuccess } = getCriticalState(total, finaltarget - Math.max(0, Number(telegraphicCriticalBonus) || 0));
  const { isCritFailure } = getCriticalState(total, finaltarget);
  const rollValues = roll.dice?.[0]?.results?.map(entry => entry.result) ?? [];
  const speaker = ChatMessage.getSpeaker({ actor });
  const normalHitCap = Math.max(0, Math.trunc(Number(effectiveRoF) || 0));
  const hasRequestedHitCap = maximumHits !== null && maximumHits !== undefined && maximumHits !== "";
  const requestedHitCap = Number(maximumHits);
  const hitCap = hasRequestedHitCap && Number.isFinite(requestedHitCap)
    ? Math.min(normalHitCap, Math.max(0, Math.trunc(requestedHitCap)))
    : normalHitCap;
  const safeRcl = Math.max(1, Math.trunc(Number(rcl) || 1));
  const potentialHits = calculateHitsFromMargin(hitCap, safeRcl, margin, { failure,manualProjectileHit:manualGuided });
  const displayRof = !extremelyClose && attack?.rof && String(attack.rof).match(/[xX\u00d7*]/u)
    ? `${physicalShots}\u00d7${Math.max(1, Math.trunc(hitCap / Math.max(1, physicalShots)))}`
    : String(effectiveRoF ?? physicalShots ?? 1);

  const chatdata = {
    prefix: "",
    chatthing: manualGuided ? escapeModifierHtml(exactName+' — '+moduleText('OleGURPS.UTPayload.'+(proximity?'ProximityRegistration':manualSEFOP?'SEFOPRegistration':'HomingRegistration'))) : attack?.standaloneRef ? escapeModifierHtml(exactName) : chatthing,
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
    followon:manualGuided?'':followon,
    optlabel: "",
    isBlind: false,
    rof: combatType === "melee" ? null : attackProfile?.damage?.rules?.plb&&attackProfile.damage.rules.physicalRanged.sourceRoF.includes('x')?attackProfile.damage.rules.physicalRanged.sourceRoF.replace('x','×'):displayRof,
    rcl: combatType === "melee" || attack?.platformRules?.rclNotApplicable ? null : safeRcl,
    rofrcl: combatType === "melee" || concealTargetDetails || manualGuided ? null : potentialHits,
    ...(manualGuided?{manualProjectileHit:true,projectileHit:'manual'}:{})
  };
  GURPS.setLastTargetedRoll?.(chatdata, speaker.actor, speaker.token, true);

  let content = testRollNotice(testRoll, runtime) + await renderTemplate("systems/gurps/templates/die-roll-chat-message.hbs", chatdata);
  if(attackProfile?.damage?.rules?.plasmaParticle?.hotshot)content+=`<p>${hotshotMalf?'Отказ Hotshot (Malf14). Последствия по B407 применяются вручную.':'Hotshot: Malf14; расход ×2. UT133.'}</p>`;
  if(attackProfile?.damage?.rules?.utMicrowave)content+='<p>Конус: затронутые цели определяют вручную, в том числе при промахе.</p>';
  if(attackProfile?.damage?.rules?.sonicNeural?.coneWidth)content+='<p>Конус: затронутые цели определяют вручную, в том числе при промахе.</p>';
  if(failure&&(attackProfile?.damage?.rules?.sonicScreamer||attackProfile?.damage?.rules?.exoticBeam?.family==='ghost')){
    const link=typeof GURPS.gurpslink==='function'?GURPS.gurpslink(followon):followon;
    content+=`<div class="roll-message gga-chat-message olegurps-cone-damage">${link}</div>`;
  }
  if(hotCartridge&&hotshotMalf)content+='<p>\u041e\u0442\u043a\u0430\u0437 Hot Power Cartridge (Malf14); B407 \u2014 \u0432\u0440\u0443\u0447\u043d\u0443\u044e.</p>';
  const electro=attackProfile?.damage?.rules?.electrolaser;
  if(electro)content+=`<p>Режим: ${electro.mode==='kill'?'Kill':'Standard'}. Расход: ${electro.unitsPerShot} ${electro.unitsPerShot===1?'заряд':'заряда'} на выстрел.</p>`+
    `<details class="olegurps-chat-details"><summary>Условия электролазера</summary><p>Смена Standard/Kill требует Ready (UT119). ${electro.mode==='kill'?'Kill: LC2.':''}</p>`+
    `<p>${potentialHits} попаданий: ожог${attackProfile.damage.rules.resistanceEffect?' и независимое HT-сопротивление для каждого попадания':''}. ${electro.visibilityDR?'Добавочный DR лучу от видимости: '+electro.visibilityDR+'; учтите вручную при Damage.':''}</p></details>`;
  if(manualGuided){
    const damageLink=typeof GURPS.gurpslink==='function'?GURPS.gurpslink(followon):followon;
    content+=(proximity?'':`<p class="olegurps-sefop-outcome">${escapeModifierHtml(moduleText('OleGURPS.UTPayload.'+(manualSEFOP?'SEFOPManualOutcome':'HomingManualOutcome')))}</p>`)+
      `<div class="roll-message gga-chat-message olegurps-sefop-manual-damage">${damageLink}</div>`;
  }
  if(attackProfile?.damage?.rules?.backblast){
    const b=attackProfile.damage.rules.backblast;let auxiliary='';
    if(attackProfile.damage.rules.instructionOnly&&typeof GURPS.gurpslink==='function'&&runtime.document){
      const template=runtime.document.createElement('template');template.innerHTML=GURPS.gurpslink('['+b.formula+']');
      const link=template.content.querySelector('.gurpslink');if(link){link.dataset.olegurpsShotComponent='backblast';auxiliary='<div class="roll-message gga-chat-message">'+template.innerHTML+'</div>';}
    }
    content+=`<details class="olegurps-chat-details" data-ut-backblast><summary>Обратная струя</summary><p>${escapeModifierHtml(b.formula)}; конус ${b.coneYards} ярд. позади. Затронутые цели — вручную. UT145.</p>${auxiliary}</details>`;
  }
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
        { label: capLabel ?? "Предел навыка при стрельбе вслепую: 9", value: visibilityCapAdjustment },
        { label: "Фирменный приём", value: trademarkMoveBonus },
        ...(combatCalculation ? [{ label: "Ranged Rapid Strike / Quick-Shot",
          value: combatCalculation.channels.find(entry => entry.id === "rangedRapidStrike")?.resolvedValue ?? 0 }]
          : [{ label: "Ranged Rapid Strike", value: rangedRapidStrikePenalty },
            { label: quickShotLabel ?? "Quick-Shot", value: quickShotBonus }])
      ])
    : reconcileAttackModifierDetails(combatCalculation
      ? [...combatCalculation.modifiers.filter(entry => entry.value !== 0),
          { label: "Фирменный приём", value: trademarkMoveBonus }]
      : targetmods, finaltarget - baseSkill, capLabel);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(displayedModifiers);
  if (modifierBreakdown) content += modifierBreakdown;
  if (combatType === "melee" && attackContextHtml && !concealTargetDetails) {
    content += `<details class="olegurps-attack-context olegurps-chat-details"><summary>Подробности атаки</summary><div>${attackContextHtml}</div></details>`;
  }
  content += utPayloadChatHTML(shotSnapshot?.profile ?? attackProfile, escapeModifierHtml);
  const emConditions=gaussManualConditions((shotSnapshot?.profile??attackProfile)?.binding?.confirmed?.modeId);
  if(emConditions.length)content+=`<details class="olegurps-chat-details"><summary>Особенности оружия</summary>${emConditions.map(c=>escapeModifierHtml(c.text)).join('<br>')}</details>`;
  const reliability=(shotSnapshot?.profile ?? attackProfile)?.weaponReliability;
  if(reliability&&!hotCartridge&&!attackProfile?.damage?.rules?.plasmaParticle?.hotshot)content+=`<details class="olegurps-chat-details"><summary>Особенности оружия</summary>Malf ${escapeModifierHtml(reliability.malf)} (${escapeModifierHtml(reliability.source)}). Проверка надёжности — вручную; поправки боеприпаса учитываются отдельно.</details>`;
  const messageData = {
    // Payload text belongs to the selected shot only; never copy weapon/GCS Notes.
    user: game.user.id,
    speaker,
    content,
    rolls: [roll],
    sound: runtime.CONFIG?.sounds?.dice,
    ...((testRoll || attackProfile || shotSnapshot) ? { flags: { "olegurps-qol": {
      knockbackTargets: captureKnockbackTargets(runtime),
      ...(attackProfile?.damage?.rules?.resistanceEffect?{resistanceEffect:{...structuredClone(attackProfile.damage.rules.resistanceEffect),eligible:!!attackProfile.damage.rules.chemical||!!attackProfile.damage.rules.utMicrowave||!!attackProfile.damage.rules.sonicNeural?.coneWidth||!failure,...(electro?{hits:potentialHits}:{})}}:{}),
      ...(testRoll ? { testRoll } : {}),
      ...(shotSnapshot?.profile ? {shotStorageVersion:SHOT_STORAGE_VERSION} : attackProfile ? { attackProfile: structuredClone(attackProfile) } : {}),
      ...(shotSnapshot ? { [shotSnapshot.resourceTiming === "after-attack" || shotSnapshot.resourceTiming === "spraying-completion"
        ? "pendingShotSnapshot" : "shotSnapshot"]: structuredClone(shotSnapshot) } : {}) } } } : {})
  };
  applyMessageMode(ChatMessage,messageData,game);
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
  const { roll, testRoll } = await evaluatePreparedCheck("3d6[Fire Control]", runtime, "prepared-skill");
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
  let content = testRollNotice(testRoll, runtime) + await runtime.renderTemplate("systems/gurps/templates/die-roll-chat-message.hbs", data);
  const displayedModifiers = reconcileAttackModifierDetails(modifierDetails, finaltarget - baseSkill);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(displayedModifiers);
  if (modifierBreakdown) content += modifierBreakdown;
  if (randomHitLocations.length) {
    content += buildRandomHitLocationsHtml(randomHitLocations, { escapeHtml: escape });
  }
  const hasDisplayedLocationModifier = displayedModifiers.some(entry =>
    String(entry?.label ?? "").includes("Зона попадания:")
  );
  const attackDetails = [];
  if (locationLabel && !hasDisplayedLocationModifier) attackDetails.push(`Зона попадания: ${escape(locationLabel)}`);
  if (closeMultiplier) attackDetails.push(`Предельно близко: базовый урон \u00d7${closeMultiplier}, DR \u00d7${closeMultiplier}`);
  if (attackDetails.length) content += `<details class="olegurps-attack-context olegurps-chat-details"><summary style="cursor:pointer">Условия атаки</summary><div>${attackDetails.join("<br>")}</div></details>`;
  const message = { user: runtime.game.user.id, speaker: runtime.ChatMessage.getSpeaker(actor ? { actor } : {}),
    content, rolls: [roll], sound: runtime.CONFIG?.sounds?.dice,
    ...(testRoll ? { flags: { "olegurps-qol": { testRoll } } } : {}) };
  applyMessageMode(runtime.ChatMessage,message,runtime.game);
  const chatMessage = await createRollChatMessage(runtime.ChatMessage, message);
  return { rolled: true, rollData: data, roll, message: chatMessage };
}
import { validateWeaponShotResources as validateWeaponShotPower } from './weapon-resources.js';
