import { immutableCopy, SHOT_FLAG_SCOPE } from "./attack-profile-resolver.js";
import { diagnoseGgaDamageAdapters, warnGgaDamageCompatibility, ammoEffectText } from "./gga-damage-compatibility.js";
import { appendInstructionSteps } from "../localization.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { automaticAmmoText } from "./automatic-ammunition-localization.js";
import { isExplosiveVariant } from "./explosive-attack-profiles.js";
import { isEnvironmentVariant } from "./environment-ammunition.js";
import { isFuzeTracerVariant } from "./fuze-tracer-ammunition.js";
import { ammunitionInstructionKeys, f1ManualConditionKey } from "./ammunition-condition-presentation.js";
import { f2RowsForShot, appendF2Conditions } from "./ammunition-f2.js";
import { f3RowsForShot, f3Extension } from "./ammunition-f3.js";
import { localizeOwnChat } from "./chat-ui-localization.js";
import { f4RowsForShot, appendF4Conditions, expireTracerMarkers } from "./ammunition-f4.js";
import {applyGyrojetDamageResult} from './gyrojet-range.js';

const installations = new WeakMap();
const flag = message => message?.getFlag?.(SHOT_FLAG_SCOPE, "shotSnapshot") ?? message?.flags?.[SHOT_FLAG_SCOPE]?.shotSnapshot;
const owned = message => !!(message?.flags?.[SHOT_FLAG_SCOPE]?.attackProfile ||
  message?.flags?.[SHOT_FLAG_SCOPE]?.pendingShotSnapshot || flag(message));
const modeOf = message => flag(message)?.mode ?? message?.flags?.[SHOT_FLAG_SCOPE]?.attackProfile?.mode ??
  message?.flags?.[SHOT_FLAG_SCOPE]?.pendingShotSnapshot?.mode;
const actorIdOf = message => flag(message)?.actorId ?? message?.flags?.[SHOT_FLAG_SCOPE]?.attackProfile?.actorId ??
  message?.flags?.[SHOT_FLAG_SCOPE]?.pendingShotSnapshot?.actorId;
const readable = message => message?.visible === true && message?.isContentVisible === true;
const exactModeName = mode => {
  const name = String(mode?.name ?? "").replace(/\[[^\]]*]/g, "").trim();
  return mode?.mode ? `${name} (${String(mode.mode).trim()})` : name;
};
function matchesNativeDamageMode(action, mode, GURPS) {
  const name = exactModeName(mode);
  if (action?.name === name) return true;
  // GGA encodes an embedded quote in a native attack name as a wildcard.
  // Compare the parser's canonical result for this exact saved mode, never a wildcard search.
  try {
    const escaped = name.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const expected = GURPS?.parselink?.('D:"' + escaped + '"')?.action;
    return expected?.type === "attackdamage" && expected.name === action?.name;
  } catch { return false; }
}
const completed = (shot, messageId) => shot?.version === 1 && !!shot.attackId && !!shot.actorId &&
  !!shot.ammunition && !!shot.mode && !!shot.profile && shot.profile.actorId === shot.actorId &&
  shot.correlation?.attackMessageId === messageId && Number.isSafeInteger(shot.spent) && shot.spent >= 0;
const identityCopy = shot => ({ version: shot.version, attackId: shot.attackId, actorId: shot.actorId,
  mode: shot.mode, magazineId: shot.magazineId, ammunition: shot.ammunition, spent: shot.spent,
  resourceTiming: shot.resourceTiming, resourceReceiptId: shot.resourceReceiptId,
  ...(shot.profile?.damage ? { damage: shot.profile.damage, damageAttack: shot.profile.effective,
    transformations: shot.profile.transformations, context: shot.profile.context } : {}) });
const unlinked = reason => ({ status: "unlinked", reason });
const explosiveShot = shot => isExplosiveVariant(shot?.ammunition?.recipe?.variantId) || isEnvironmentVariant(shot?.ammunition?.recipe?.variantId) || isFuzeTracerVariant(shot?.ammunition?.recipe?.variantId);
const componentConditionIds = new Set(["P4LinkedFollowUp", "P4Fragmentation", "P4SAPLEReliability", "P4HESH", "P4Tandem", "P4Thermobaric"]);
export function ammunitionConditionSource(message, runtime = globalThis) {
  // Permission checks precede even reading flags, for both the clicked message and its source.
  if (!readable(message)) return null;
  let source = message, shot = flag(message);
  let role = "kinetic";
  if (!completed(shot, message.id)) {
    const link = message?.getFlag?.(SHOT_FLAG_SCOPE, "damageLink") ?? message?.flags?.[SHOT_FLAG_SCOPE]?.damageLink;
    if (link?.status !== "linked" || !link.originatingAttackMessageId || !link.attackId) return null;
    source = runtime.game?.messages?.get(link.originatingAttackMessageId);
    if (!readable(source)) return null;
    shot = flag(source);
    if (!completed(shot, source.id) || shot.attackId !== link.attackId ||
        (link.actorId && link.actorId !== shot.actorId) ||
        (message.speaker?.actor && message.speaker.actor !== shot.actorId)) return null;
    role = link.damageComponent ?? "kinetic";
    if (role !== "kinetic" && !shot.profile.damage?.components?.some(c => c.role === role && c.status === "resolved")) return null;
  }
  return shot.profile.damage?.nativeSafe ? { source, shot, role, messageId: message.id } : null;
}
export function shotAmmunitionConditions(message, runtime = globalThis) {
  const resolved = ammunitionConditionSource(message, runtime);
  if (!resolved) return [];
  const { shot } = resolved;
  const damage = shot.profile.damage;
  if (!damage?.nativeSafe) return [];
  const language = runtime.game?.i18n?.lang ?? "ru";
  const keys = ammunitionInstructionKeys(shot), excluded = new Set(keys), context = shot.profile.context;
  const replaced = {Linked:"P4LinkedFollowUp",Internal:"P4LinkedFollowUp",Fragments:"P4Fragmentation",
    Falloff:"P4Thermobaric",Spall:"P4HESH",Tandem:"P4Tandem",Reliability:"P4SAPLEReliability"};
  for (const row of f2RowsForShot(shot)) if (replaced[row.kind]) excluded.add(replaced[row.kind]);
  const existingComponentNote = explosiveShot(shot) && damage.components?.some(c =>
    ["linked", "follow-up"].includes(c.role) && c.status === "resolved");
  if (!existingComponentNote) excluded.add("P4LinkedFollowUp");
  const legacy = [...ammunitionConditionTexts(damage.support?.manual, language, excluded),
    ...ammunitionConditionTexts(context?.environment?.manual, language, excluded),
    ...ammunitionConditionTexts(context?.barrel?.manual, language, excluded),
    ...(context?.platform?.instruction?[context.platform.instruction]:[])];
  // Preserve pre-existing component guidance in this one section, rather than a duplicate details.
  if (existingComponentNote && !f2RowsForShot(shot).some(r => ["Linked", "Internal"].includes(r.kind)) &&
      !damage.support?.manual?.some(c => c.id === "P4LinkedFollowUp"))
    legacy.push(explosiveText(damage.rules?.componentOrder ? "P4LinkedFollowUp" : "ManualConditions", runtime, language));
  if (!keys.length && !legacy.length) return [];
  return [...new Set([...keys.map(key => automaticAmmoText(key, language)), ...legacy])];
}
export function ammunitionConditionTexts(conditions = [], language = globalThis.game?.i18n?.lang ?? "ru", excludedKeys = new Set()) {
  return (conditions ?? []).flatMap(condition => {
    if(condition.id==='SpecializedPlatform'&&typeof condition.text==='string')return [condition.text];
    const f1Key = f1ManualConditionKey(condition.id);
    if (f1Key) return excludedKeys.has(f1Key) ? [] : [automaticAmmoText(f1Key, language)];
    if (componentConditionIds.has(condition.id)) return excludedKeys.has(condition.id) ? [] : [explosiveText(condition.id, {}, language, {tl:condition.tl,threshold:condition.threshold})];
    const key = { Hearing: "HearingGM", ObjectWithoutDR: "ObjectWithoutDRGM", NoOverpenetrationWithDR: "NoOverpenetrationGM",
      PlusPReliability: "PlusPReliabilityGM", PlusPAutomaticRoF: "PlusPAutomaticRoFGM", MinimumSTSupport: "MinimumSTSupportGM",
      NativeHPExpansion: "NativeHPExpansionGM", PlusPSubsonicUnverified: "PlusPSubsonicUnverifiedGM",
      UnderwaterMalf: "UnderwaterMalfGM", EnvironmentHalfDamage: "EnvironmentHalfDamageGM", BarrelSwitchReady: "BarrelSwitchReadyGM", DUIncendiary: "DUIncendiaryGM",
      BuckAndBall:"BuckAndBallGM",DoubleKnockbackNative:"DoubleKnockbackNativeGM",NonlethalRisk:"NonlethalRiskGM",PublishedBurst:"PublishedBurstGM" }[condition.id];
    const text = key ? automaticAmmoText(key, language, { modifier: condition.modifier, st: condition.st }) : null;
    return text ? [text + (condition.id === "PlusPReliability" && condition.modifier != null ? " Malf " + condition.modifier + "." : "")] : [];
  });
}
export function renderShotAmmunitionConditions(message, root, runtime = globalThis) {
  root?.querySelector?.("[data-olegurps-special-effects]")?.remove?.();
  const conditions = shotAmmunitionConditions(message, runtime);
  const resolved = ammunitionConditionSource(message, runtime);
  if ((!conditions.length && !f2RowsForShot(resolved?.shot).length && !f3RowsForShot(resolved?.shot).length && !f4RowsForShot(resolved?.shot).length) || !runtime.document) return null;
  const card = root?.querySelector?.(".roll-message.gga-chat-message, .damage-message");
  if (!card) return null;
  const details = runtime.document.createElement("details"), summary = runtime.document.createElement("summary");
  details.dataset.olegurpsSpecialEffects = "true";
  summary.textContent = automaticAmmoText("F1Title", runtime.game?.i18n?.lang ?? "ru");
  details.append(summary);
  for (const text of conditions) appendInstructionSteps(details, text, runtime.document);
  appendF2Conditions(details, resolved, runtime, () => ammunitionConditionSource(message, runtime), f3Extension(resolved, runtime));
  appendF4Conditions(details, resolved, runtime, () => ammunitionConditionSource(message, runtime));
  card.append(details);
  return details;
}
export function shotDamageComponents(message, runtime = globalThis) {
  if (!readable(message)) return [];
  const shot = flag(message);
  if (!completed(shot, message.id) || !explosiveShot(shot)) return [];
  const composite=shot.profile.damage?.model?.kind==="published-composite" || !!shot.profile.damage?.rules?.componentOrder || !!shot.profile.damage?.rules?.fuzeTracer;
  const roles=composite ? shot.profile.damage.components.filter(c=>c.role!=="kinetic"&&c.status==="resolved").map(c=>c.role) : ["follow-up","fragmentation"];
  return roles.map(role => {
    const component = shot.profile.damage?.components?.find(c => c.role === role);
    const resolved = shot.profile.damage?.nativeSafe && component?.status === "resolved" && !!component.formula;
    return { role, label: explosiveText({"linked":"P4Linked","main-charge":"P4MainCharge","follow-up":"Explosion","fragmentation":"Fragmentation"}[role], runtime),
      formula: resolved ? component.formula : null, reason: resolved ? null : shot.profile.damage?.reason ?? "unconfirmed-compatibility" };
  });
}

/** Read the exact clicked document synchronously, before native GGA dispatch can await. */
export function captureDamageSource(action, event, runtime = globalThis) {
  if (!event || action?.calcOnly) return null;
  const element = event.currentTarget ?? event.target;
  const component = element?.dataset?.olegurpsShotComponent;
  const secondary = ["follow-up", "fragmentation", "linked", "main-charge"].includes(component);
  if (action?.type !== "attackdamage" && !(action?.type === "damage" && secondary)) return null;
  if (!element?.classList?.contains("gurpslink") || !element.closest?.(".roll-message.gga-chat-message")) return null;
  const messageId = element.dataset?.olegurpsShotDamageSource ?? element.closest("[data-message-id]")?.dataset?.messageId;
  if (!messageId) return null;
  const source = runtime.game?.messages?.get(messageId);
  if (!owned(source) && element.dataset?.olegurpsShotDamageSource !== messageId) return null;
  // Only the native D: link for this module's prepared ranged attack is eligible.
  const mode = modeOf(source);
  if (source && (!mode || (!secondary && !matchesNativeDamageMode(action, mode, runtime.GURPS)) ||
      (action.sourceId && action.sourceId !== actorIdOf(source)))) return null;
  if (!source) return { ...unlinked("source-missing"), sourceMessageId: messageId };
  if (!readable(source)) return { ...unlinked("source-inaccessible"), sourceMessageId: messageId };
  const shot = flag(source);
  if (!completed(shot, messageId)) return { ...unlinked("snapshot-incomplete"), sourceMessageId: messageId };
  const actor = runtime.ChatMessage?.getSpeakerActor?.(source.speaker) ?? runtime.game?.actors?.get(shot.actorId);
  if (!actor || actor.id !== shot.actorId) return { ...unlinked("actor-unavailable"), sourceMessageId: messageId };
  return { status: "linked", sourceMessageId: messageId, actor,
    component: secondary ? component : "kinetic", shot: immutableCopy(identityCopy(shot)) };
}

/** Resolve only through explicit IDs, with current document permissions. Never inspect current ammo. */
export function resolveDamageShotLink(damage, runtime = globalThis) {
  if (!readable(damage)) return unlinked("damage-inaccessible");
  const link = damage.getFlag?.(SHOT_FLAG_SCOPE, "damageLink") ?? damage.flags?.[SHOT_FLAG_SCOPE]?.damageLink;
  if (link?.status !== "linked") return unlinked(link?.reason ?? "link-missing");
  if (link.storage === "identity-copy") return immutableCopy({ ...link, sourceAvailable:
    readable(runtime.game?.messages?.get(link.originatingAttackMessageId)) });
  const source = runtime.game?.messages?.get(link.originatingAttackMessageId);
  if (!source) return unlinked("source-missing");
  if (!readable(source)) return unlinked("source-inaccessible");
  const shot = flag(source);
  if (!completed(shot, source.id) || shot.attackId !== link.attackId) return unlinked("snapshot-incomplete");
  return immutableCopy({ ...link, attackId: shot.attackId, actorId: shot.actorId, shotSnapshot: identityCopy(shot) });
}

/** Narrow wrappers preserve GGA dispatch, native damage rendering and native document creation. */
export function installDamageShotLink(runtime = globalThis) {
  const { GURPS, ChatMessage, Hooks } = runtime;
  if (installations.has(GURPS)) return installations.get(GURPS);
  const prototype = GURPS?.DamageChat?.prototype;
  if (typeof GURPS?.performAction !== "function" || typeof prototype?._createChatMessage !== "function" ||
      typeof ChatMessage?.create !== "function" || !Hooks?.on) throw new Error("DamageShotLinkNativeAPIUnavailable");
  const events = new WeakMap(), rolls = new WeakMap(), creations = new Map();
  const originals = { perform: GURPS.performAction, resolve: GURPS.resolveDamageRoll,
    render: prototype._createChatMessage, create: ChatMessage.create };
  const diagnostic = diagnoseGgaDamageAdapters(runtime);
  warnGgaDamageCompatibility(diagnostic, runtime);
  const effectContracts = { attackdamage: GURPS.actionFuncs?.attackdamage, damage: GURPS.actionFuncs?.damage,
    parser: GURPS.parselink, create: GURPS.DamageChat.create, dice: prototype._getDiceData };
  const warn = error => runtime.console?.error?.("OleGURPS QOL | Damage metadata:", error);
  const forwardEvent = (event, context) => {
    // Every invocation owns a distinct event view, including repeated API calls with the same DOM event.
    const currentTarget = event.currentTarget, target = event.target;
    const forwarded = new Proxy(event, { get(object, key) {
      if (key === "currentTarget") return currentTarget;
      if (key === "target") return target;
      const value = Reflect.get(object, key, object);
      return typeof value === "function" ? value.bind(object) : value;
    } });
    events.set(forwarded, context);
    return forwarded;
  };
  const perform = function(action, actor, event, ...args) {
    let context;
    try {
      // The optional native multiple/combine dialog may already have captured this click before its await.
      context = event && events.get(event) || captureDamageSource(action, event, runtime);
    } catch (error) { warn(error); }
    if (!context) return originals.perform.call(this, action, actor, event, ...args);
    const sourceMode = modeOf(runtime.game?.messages?.get(context.sourceMessageId));
    if (sourceMode?.standaloneRef && context.status !== "linked") return false;
    if (event?.currentTarget?.dataset?.olegurpsShotComponent && context.status !== "linked") return false;
    let dispatched = action;
    if (context.status === "linked" && ["attackdamage", "damage"].includes(action?.type) && !action.calcOnly) {
      const damage = context.shot.damage;
      const component = context.component && context.component !== "kinetic" ? damage?.components?.find(c=>c.role === context.component) : null;
      const formula = component ? component.formula : damage?.formula;
      if (explosiveShot(context.shot) && (!damage?.nativeSafe || (context.component !== "kinetic" &&
          (!component || component.status !== "resolved" || !formula)))) {
        runtime.ui?.notifications?.warn?.(explosiveText("Unavailable", runtime, runtime.game?.i18n?.lang ?? "ru",
          { reason: explosiveText(damage?.reason ?? "unconfirmed-compatibility", runtime) }));
        return false;
      }
      const unchanged = effectContracts.attackdamage === GURPS.actionFuncs?.attackdamage &&
        effectContracts.damage === GURPS.actionFuncs?.damage && effectContracts.parser === GURPS.parselink &&
        effectContracts.create === GURPS.DamageChat.create && effectContracts.dice === prototype._getDiceData;
      if (!unchanged) warnGgaDamageCompatibility({ compatible: false,
        problems: ["GURPS.actionFuncs / DamageChat / parselink: " + ammoEffectText("ContractChanged", {}, runtime)] }, runtime);
      if (diagnostic.compatible && unchanged && damage?.nativeSafe) {
        // Use GGA's own parser and normal damage dispatch, including its access/modifier/confirmation path.
        const parsed = GURPS.parselink(formula)?.action;
        if (parsed?.type === "damage" && !parsed.next) dispatched = { ...parsed,
          costs: action.costs, mod: action.mod, desc: action.desc, blindroll: action.blindroll,
          att: structuredClone(context.shot.damageAttack), sourceId: context.shot.actorId };
        else runtime.ui?.notifications?.warn?.(ammoEffectText("Unresolved", {
          reason: ammoEffectText("native-parser-contract-changed", {}, runtime) }, runtime));
      } else if (diagnostic.compatible && unchanged) runtime.ui?.notifications?.warn?.(ammoEffectText("Unresolved", {
        reason: ammoEffectText(damage?.reason ?? "snapshot-damage-unavailable", {}, runtime) }, runtime));
    }
    if ((context.component && context.component !== "kinetic" || sourceMode?.standaloneRef) && dispatched === action) {
      if (sourceMode?.standaloneRef) runtime.ui?.notifications?.warn?.("Урон автономной атаки недоступен: снимок или адаптер GGA не содержит поддерживаемой формулы.");
      return false;
    }
    // GGA's LastActor may belong to another window. Use this clicked source's Actor; native canRoll still runs.
    return originals.perform.call(this, dispatched, context.actor ?? actor, forwardEvent(event, context), ...args);
  };
  const resolve = function(event, actor, otf, ...args) {
    let context;
    try { context = captureDamageSource(GURPS.parselink?.(otf)?.action, event, runtime); }
    catch (error) { warn(error); }
    return originals.resolve.call(this, context ? forwardEvent(event, context) : event,
      context?.actor ?? actor, otf, ...args);
  };
  const render = function(actor, diceData, targetmods, draggableData, event, ...args) {
    const context = event && events.get(event), roll = draggableData?.[0]?.roll;
    if(context?.status==='linked'&&actor?.id===context.shot.actorId&&context.shot.damage?.nativeSafe)
      draggableData=draggableData.map(d=>applyGyrojetDamageResult(d,context.shot.damage.rules?.gyrojetRange,context.component??'kinetic'));
    if (context && roll && typeof roll === "object") {
      rolls.set(roll, context.status === "linked" && actor?.id !== context.shot.actorId
        ? unlinked("actor-mismatch") : context);
    }
    return originals.render.call(this, actor, diceData, targetmods, draggableData, event, ...args);
  };
  const preCreate = (message, data) => {
    const link = message.flags?.[SHOT_FLAG_SCOPE]?.damageLink;
    const context = creations.get(link?.damageEventId);
    if (!context || message.flags?.gurps?.transfer?.type !== "damageItem") return;
    let metadata = { version: 1, damageEventId: link.damageEventId, damageMessageId: message.id ?? null, reason: null,
      ...(context.component ? { damageComponent: context.component } : {}) };
    try {
      if (context.status !== "linked") metadata = { ...metadata, ...unlinked(context.reason) };
      else if (message.speaker?.actor !== context.shot.actorId) metadata = { ...metadata, ...unlinked("actor-mismatch") };
      else {
        const source = runtime.game.messages.get(context.sourceMessageId);
        if (!source) metadata = { ...metadata, ...unlinked("source-missing") };
        else if (!readable(source)) metadata = { ...metadata, ...unlinked("source-inaccessible") };
        else if (!completed(flag(source), source.id) || flag(source).attackId !== context.shot.attackId)
          metadata = { ...metadata, ...unlinked("snapshot-incomplete") };
        else {
          // Private content is NEVER copied into a second document, even if today's recipients match.
          // A reference is safe to resolve only after checking visibility of the source and the damage.
          const publicSource = !source.blind && source.whisper?.length === 0;
          metadata = { ...metadata, status: "linked", originatingAttackMessageId: source.id, attackId: context.shot.attackId,
            storage: publicSource ? "identity-copy" : "reference",
            ...(publicSource ? { attackId: context.shot.attackId, actorId: context.shot.actorId,
              shotSnapshot: structuredClone(context.shot) } : {}) };
        }
      }
    } catch (error) { warn(error); metadata = { ...metadata, ...unlinked("metadata-unavailable") }; }
    message.updateSource({ [`flags.${SHOT_FLAG_SCOPE}.damageLink`]: metadata });
  };
  const create = function(data, ...args) {
    const transfer = data?.["flags.gurps.transfer"] ?? data?.flags?.gurps?.transfer;
    const context = data?.rolls?.[0] && rolls.get(data.rolls[0]);
    if (!context || transfer?.type !== "damageItem") return originals.create.call(this, data, ...args);
    rolls.delete(data.rolls[0]);
    let damageEventId, prepared;
    try {
      damageEventId = runtime.crypto.randomUUID();
      prepared = { ...data, flags: { ...data.flags, gurps: { ...data.flags?.gurps, transfer },
        [SHOT_FLAG_SCOPE]: { ...data.flags?.[SHOT_FLAG_SCOPE],
        damageLink: { version: 1, damageEventId, status: "unlinked", reason: "metadata-unavailable" } } } };
      // Foundry's expansion lets a nested `flags` object overwrite a flat `flags.gurps.transfer`.
      // Normalize that native key before adding our namespace, preserving the original transfer payload.
      delete prepared["flags.gurps.transfer"];
    } catch (error) { warn(error); return originals.create.call(this, data, ...args); }
    creations.set(damageEventId, context);
    let creation;
    try { creation = originals.create.call(this, prepared, ...args); }
    catch (error) { creations.delete(damageEventId); throw error; }
    return Promise.resolve(creation).then(async message => {
      const link = message?.getFlag?.(SHOT_FLAG_SCOPE, "damageLink");
      if (message?.isAuthor && link?.damageEventId === damageEventId && link.damageMessageId !== message.id) {
        try { await message.setFlag(SHOT_FLAG_SCOPE, "damageLink", { ...link, damageMessageId: message.id }); }
        catch (error) { warn(error); }
      }
      return message;
    }).finally(() => creations.delete(damageEventId));
  };
  const mark = (message, html) => {
    const root = html?.querySelectorAll ? html : html?.[0];
    root?.querySelector?.("[data-olegurps-special-effects]")?.remove?.();
    if (!readable(message)) return;
    localizeOwnChat(root, runtime);
    if (!owned(message) && !message?.flags?.[SHOT_FLAG_SCOPE]?.damageLink) return;
    const shot = flag(message), ammunition = shot?.ammunition;
    const ammunitionName = completed(shot, message.id) && ammunition?.source === "catalog" &&
      ammunition.status === "confirmed" && typeof ammunition.name === "string" ? ammunition.name.trim() : "";
    renderShotAmmunitionConditions(message, root, runtime);
    for (const element of root?.querySelectorAll(".roll-message.gga-chat-message .gurpslink") ?? []) {
      let action;
      try { action = element.dataset.otf && GURPS.parselink?.(element.dataset.otf)?.action; }
      catch { continue; }
      if (action?.type === "attackdamage" && matchesNativeDamageMode(action, modeOf(message), GURPS)) {
        element.dataset.olegurpsShotDamageSource = message.id;
        // GGA dispatch reads data-action/data-otf, not the visible text of its native span.
        // Only a completed, readable source with a confirmed saved identity may supply this label.
        if (ammunitionName && (!action.sourceId || action.sourceId === shot.actorId))
          element.textContent = "D:" + ammunitionName;
        if (completed(shot, message.id) && explosiveShot(shot) && !element.dataset.olegurpsComponentsRendered && runtime.document) {
          element.dataset.olegurpsComponentsRendered = "true";
          let anchor = element;
          for (const component of shotDamageComponents(message, runtime)) {
            const button = element.cloneNode(true);
            button.removeAttribute("data-olegurps-components-rendered");
            button.dataset.olegurpsShotComponent = component.role;
            button.dataset.gurpsClickwired = "true"; button.dataset.gurpsContextmenuwired = "true";
            button.textContent = "D:" + component.label;
            button.title = explosiveText(shot.profile.damage?.rules?.componentOrder ? "P4LinkedFollowUp" : "ManualConditions", runtime);
            if (shot.profile.damage?.rules?.componentOrder && component.role === "fragmentation")
              button.title += " " + explosiveText("P4Fragmentation", runtime);
            if (component.formula) {
              const parsed = GURPS.parselink(component.formula);
              const template = runtime.document.createElement("template"); template.innerHTML = parsed.text;
              const native = template.content.querySelector(".gurpslink");
              if (!native || parsed.action?.type !== "damage") continue;
              button.dataset.otf = component.formula; button.dataset.action = native.dataset.action;
              button.addEventListener("click", event => {
                event.preventDefault();
                const current = captureDamageSource(GURPS.parselink(component.formula)?.action, event, runtime);
                if (current?.status === "linked") void GURPS.performAction(GURPS.parselink(component.formula).action, current.actor, event);
              });
              button.addEventListener("contextmenu", event => {
                event.preventDefault();
                const current = captureDamageSource(GURPS.parselink(component.formula)?.action, event, runtime);
                if (current?.status === "linked") void GURPS.resolveDamageRoll(event, current.actor, component.formula);
              });
            } else {
              delete button.dataset.action; delete button.dataset.otf;
              button.setAttribute("aria-disabled", "true");
              button.style.opacity = "0.6"; button.style.cursor = "not-allowed";
              button.title = explosiveText("Unavailable", runtime, runtime.game?.i18n?.lang ?? "ru",
                { reason: explosiveText(component.reason, runtime) });
              button.addEventListener("click", event => event.preventDefault());
            }
            anchor.after(button); anchor = button;
          }
        }
      }
    }
  };
  const hooks = [["preCreateChatMessage", Hooks.on("preCreateChatMessage", preCreate)],
    ["renderChatMessageHTML", Hooks.on("renderChatMessageHTML", mark)],
    ["renderChatMessage", Hooks.on("renderChatMessage", mark)],
    ["updateCombat", Hooks.on("updateCombat", combat => expireTracerMarkers(combat, runtime).catch(error =>
      console.error("OleGURPS F4 | tracer expiry", error)))]];
  GURPS.performAction = perform;
  if (typeof originals.resolve === "function") GURPS.resolveDamageRoll = resolve;
  prototype._createChatMessage = render;
  ChatMessage.create = create;
  // Foundry can render persisted chat before this ready-time integration installs its hooks.
  for (const root of runtime.document?.querySelectorAll("[data-message-id]") ?? []) {
    const message = runtime.game?.messages?.get(root.dataset.messageId);
    if (message) mark(message, root);
  }
  const installation = { diagnostic, resolve: message => resolveDamageShotLink(message, runtime), uninstall() {
    if (GURPS.performAction === perform) GURPS.performAction = originals.perform;
    if (GURPS.resolveDamageRoll === resolve) GURPS.resolveDamageRoll = originals.resolve;
    if (prototype._createChatMessage === render) prototype._createChatMessage = originals.render;
    if (ChatMessage.create === create) ChatMessage.create = originals.create;
    for (const [name, id] of hooks) Hooks.off(name, id);
    installations.delete(GURPS);
  } };
  installations.set(GURPS, installation);
  return installation;
}
