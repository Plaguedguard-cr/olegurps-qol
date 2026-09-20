import { MeleeAssistantApp } from "./melee-assistant-app.js";
import {
  MeleeAssistantStateService,
  applyMeleeAttackOverride,
  collectMeleeAttacks,
  getMeleeAttackSettings,
  setMeleeGoverningSkill,
  setSelectedMeleeAttack
} from "./melee-assistant-state.js";
import { TargetingService } from "./targeting-service.js";
import { createMeleeTargetedAttackContext } from "./targeted-attack-service.js";

const OPEN_MELEE_ASSISTANTS = new Map();
const LAST_MELEE_BODYPLANS = new Map();

function selectedToken() {
  const controlled = globalThis.canvas?.tokens?.controlled ?? [];
  if (controlled.length === 0) {
    ui.notifications.error("Токен не выбран. Выделите один токен и запустите макрос снова.");
    return null;
  }
  if (controlled.length > 1) {
    ui.notifications.error("Выбрано несколько токенов. Оставьте выбранным только один токен.");
    return null;
  }
  return controlled[0];
}

export async function openMeleeAssistant() {
  if (!globalThis.foundry?.applications?.api?.ApplicationV2) {
    return ui.notifications.error("Melee Assistant требует Foundry VTT с ApplicationV2.");
  }
  if (typeof globalThis.GURPS?.performAction !== "function" || typeof globalThis.GURPS?.parselink !== "function" ||
      typeof globalThis.GURPS?.DamageChat?.create !== "function") {
    return ui.notifications.error("Не найдены необходимые API GURPS Game Aid.");
  }

  const token = selectedToken();
  if (!token) return;
  const actor = token.actor;
  if (!actor) return ui.notifications.error("У выбранного токена нет связанного персонажа.");
  if (!actor.isOwner) return ui.notifications.error("У вас нет прав на использование атак персонажа «" + actor.name + "».");

  const windowKey = String(globalThis.canvas?.scene?.id ?? "scene") + ":" + token.id;
  const existing = OPEN_MELEE_ASSISTANTS.get(windowKey);
  if (existing?.rendered) {
    existing.bringToTop?.();
    return existing;
  }

  const sourceAttacks = collectMeleeAttacks(actor);
  if (!sourceAttacks.length) return ui.notifications.warn("У выбранного персонажа нет melee-атак GGA.");

  const stateService = new MeleeAssistantStateService(actor);
  let state = await stateService.load();
  const sourceAttack = sourceAttacks.find(entry => entry.key === state.selectedAttackKey) ?? sourceAttacks[0];
  if (state.selectedAttackKey !== sourceAttack.key) {
    setSelectedMeleeAttack(state, sourceAttack);
    state = await stateService.save(state);
  }
  const attack = applyMeleeAttackOverride(sourceAttack, state);
  const targetedAttackContext = createMeleeTargetedAttackContext({ actor, attack });
  let savedGoverningSkill = getMeleeAttackSettings(state, sourceAttack).governingSkill ?? "";
  if (savedGoverningSkill && !targetedAttackContext.specialtyOptions.some(option => option.value === savedGoverningSkill)) {
    setMeleeGoverningSkill(state, sourceAttack, "");
    state = await stateService.save(state);
    savedGoverningSkill = "";
  }
  const bodyplan = LAST_MELEE_BODYPLANS.get(windowKey) ?? "humanoid";
  const targetingService = await TargetingService.create({ attack, bodyplan });

  const app = new MeleeAssistantApp({
    token,
    actor,
    sourceAttacks,
    state,
    stateService,
    selectedAttackKey: sourceAttack.key,
    targetingService,
    targetedAttackContext,
    initialGoverningSkill: savedGoverningSkill,
    onBodyplanChange: service => LAST_MELEE_BODYPLANS.set(windowKey, service.bodyplan),
    onClose: () => OPEN_MELEE_ASSISTANTS.delete(windowKey)
  });
  OPEN_MELEE_ASSISTANTS.set(windowKey, app);
  await app.render({ force: true });
  return app;
}
