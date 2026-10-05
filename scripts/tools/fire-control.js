import { FirePreparationApp } from "./fire-preparation-app.js";
import { FireService } from "./fire-service.js";
import { TargetingService } from "./targeting-service.js";
import { createFireControlContext } from "./fire-control-context.js";
import { executePreparedSkillRoll } from "./prepared-gga-roll.js";
import { parseElevationHeight } from "./fire-range-service.js";
import { normalizeVisibility } from "./limited-visibility.js";
import { withClearedFoundryTargets } from "./foundry-targets.js";

const MODULE_ID = "olegurps-qol";
const STANDALONE_VALUES_FLAG = "standaloneFireControlValues";
const LAST_STANDALONE_BODYPLANS = new Map();
const LAST_STANDALONE_VALUES = new Map();
const STANDALONE_SAVE_TIMERS = new Map();
let standaloneSaveQueue = Promise.resolve();

const normalizeStandaloneValues = values => ({
  skillLevel: String(values?.skillLevel ?? ""),
  acc: String(values?.acc ?? ""),
  bulk: String(values?.bulk ?? ""),
  rcl: String(values?.rcl ?? ""),
  halfd: String(values?.halfd ?? ""),
  shotgun: values?.shotgun === true,
  projectileMultiplier: String(values?.projectileMultiplier ?? "")
});

function getStandaloneTargetKey(token, actor, user) {
  const tokenUuid = token?.document?.uuid ?? token?.uuid ??
    (token?.id ? `Scene.${globalThis.canvas?.scene?.id ?? "unknown"}.Token.${token.id}` : null);
  if (tokenUuid) return `token:${tokenUuid}`;
  if (actor?.id) return `actor:${actor.id}`;
  return `user:${user?.id ?? "default"}`;
}

function getSavedStandaloneValues(user, targetKey) {
  const cached = LAST_STANDALONE_VALUES.get(targetKey);
  if (cached) return { ...cached };
  const savedByTarget = user?.getFlag?.(MODULE_ID, STANDALONE_VALUES_FLAG);
  const saved = savedByTarget && typeof savedByTarget === "object"
    ? savedByTarget[targetKey]
    : null;
  if (!saved || typeof saved !== "object") return null;
  const normalized = normalizeStandaloneValues(saved);
  LAST_STANDALONE_VALUES.set(targetKey, normalized);
  return { ...normalized };
}

function queueStandaloneValuesSave(user, targetKey) {
  if (!user?.setFlag) return Promise.resolve();
  standaloneSaveQueue = standaloneSaveQueue
    .catch(() => undefined)
    .then(async () => {
      const snapshot = LAST_STANDALONE_VALUES.get(targetKey);
      if (!snapshot) return;
      const current = user.getFlag?.(MODULE_ID, STANDALONE_VALUES_FLAG);
      const savedByTarget = current && typeof current === "object" && !Array.isArray(current)
        ? { ...current }
        : {};
      savedByTarget[targetKey] = { ...snapshot };
      await user.setFlag(MODULE_ID, STANDALONE_VALUES_FLAG, savedByTarget);
    })
    .catch(error => {
      console.error("Не удалось сохранить параметры standalone Fire Control для токена:", error);
    });
  return standaloneSaveQueue;
}

function rememberStandaloneValues(user, targetKey, values, { immediate = false } = {}) {
  LAST_STANDALONE_VALUES.set(targetKey, normalizeStandaloneValues(values));
  const pendingTimer = STANDALONE_SAVE_TIMERS.get(targetKey);
  if (pendingTimer) globalThis.clearTimeout(pendingTimer);
  STANDALONE_SAVE_TIMERS.delete(targetKey);
  if (immediate) return queueStandaloneValuesSave(user, targetKey);
  const timer = globalThis.setTimeout(() => {
    STANDALONE_SAVE_TIMERS.delete(targetKey);
    void queueStandaloneValuesSave(user, targetKey);
  }, 250);
  STANDALONE_SAVE_TIMERS.set(targetKey, timer);
  return undefined;
}

export async function openFireControl() {
  if (!globalThis.GURPS?.ModifierBucket) {
    ui.notifications.error("Не найден GURPS Game Aid.");
    return;
  }
  const controlled = globalThis.canvas?.tokens?.controlled ?? [];
  const token = controlled.length === 1 ? controlled[0] : null;
  const currentUser = game.user;
  const actor = token?.actor ?? currentUser?.character ?? null;
  const standaloneTargetKey = getStandaloneTargetKey(token, actor, currentUser);
  const initialStandaloneValues = getSavedStandaloneValues(currentUser, standaloneTargetKey);
  const service = new FireService({ actor, token });
  const context = createFireControlContext({ token, fireService: service, mode: "standalone" });
  const rangeBands = context.getRangeBands();
  const targetSelectionKey = actor?.id ?? token?.id ?? game.user?.id ?? "default";
  const initialBodyplan = LAST_STANDALONE_BODYPLANS.get(targetSelectionKey) ?? "humanoid";
  const targetingService = await TargetingService.create({
    bodyplan: initialBodyplan
  });
  let app;
  const shotLimits = () => ({
    profile: service.parseRateOfFire(app?.attack?.rof),
    modeIndex: 0,
    fullRoF: null,
    minRoF: 1,
    minShots: 1,
    maxShots: null
  });
  app = new FirePreparationApp({
    mode: "standalone", token, actor, attack: {}, rangeBands, targetingService,
    getTargetRangeRecommendation: () => context.getTargetRangeRecommendation(rangeBands),
    initialStandaloneValues,
    maximumShots: 1, rateOfFireProfile: service.parseRateOfFire(""),
    calculateShotLimits: shotLimits,
    parseRateOfFire: value => service.parseRateOfFire(value),
    calculateRapidFireBonus: shots => context.getRapidFireBonus(app.attack, shots),
    calculateAimBonus: (aimSeconds, moveAndAttack, braced, laserSight) =>
      context.getFireBonuses(app.attack, { aimSeconds, braced, laserSight, moveAndAttack }).aimBonus,
    calculateBracingBonus: (braced, aimSeconds, moveAndAttack, laserSight) =>
      context.getFireBonuses(app.attack, { aimSeconds, braced, laserSight, moveAndAttack }).bracingBonus,
    calculateLaserBonus: (laserSight, aimSeconds, braced, moveAndAttack) =>
      context.getFireBonuses(app.attack, { aimSeconds, braced, laserSight, moveAndAttack }).laserBonus,
    calculateFireMode: values => context.getFireModeState(app.attack, values, rangeBands),
    calculateEffectiveSkill: (values, currentTargetingService = targetingService) => context.calculateEffectiveFireSkill(app.attack, values, rangeBands, currentTargetingService),
    onTargetingServiceChange: currentTargetingService =>
      LAST_STANDALONE_BODYPLANS.set(targetSelectionKey, currentTargetingService.bodyplan),
    onStandaloneValuesChange: values =>
      rememberStandaloneValues(currentUser, standaloneTargetKey, values),
    onClose: currentApp => {
      const values = currentApp.getStandaloneValues?.();
      if (values) void rememberStandaloneValues(currentUser, standaloneTargetKey, values, { immediate: true });
    },
    onConfirm: async (values, currentTargetingService = targetingService) => {
      const baseSkill = Number(app.attack.level);
      if (!Number.isInteger(baseSkill) || baseSkill <= 0) {
        ui.notifications.warn("Введите положительное целое Значение умения.");
        return false;
      }
      if (!Number.isInteger(Number(values.manualModifier || 0)) || parseElevationHeight(values.height) === null) {
        ui.notifications.warn("Проверьте Бонусы/штрафы и Высоту.");
        return false;
      }
      const multiplier = Number(values.projectileMultiplier);
      if (values.shotgun && !(Number.isInteger(multiplier) && multiplier > 1)) {
        ui.notifications.warn("Дробовик: введите целый множитель после × (не меньше 2).");
        return false;
      }
      const limits = shotLimits(values.rofMode);
      const shots = Number(values.shots);
      if (!Number.isInteger(shots) || shots < limits.minShots ||
        (Number.isFinite(limits.maxShots) && shots > limits.maxShots)) {
        const allowed = Number.isFinite(limits.maxShots)
          ? `от ${limits.minShots} до ${limits.maxShots}`
          : `${limits.minShots} или больше`;
        ui.notifications.warn(`Выстрелы: допустимо ${allowed}.`);
        return false;
      }
      const location = currentTargetingService.getSelection(values.hitLocationId, values.hitRegionId);
      if (!location) return false;
      const fireMode = context.getFireModeState(app.attack, values, rangeBands);
      const skillDetails = context.calculateEffectiveFireSkillDetails(app.attack, values, rangeBands, currentTargetingService);
      const effectiveSkill = skillDetails?.effectiveSkill;
      const rcl = /^\s*[1-9]\d*(?:\s*\/\s*[1-9]\d*)?\s*$/.test(app.attack.rcl)
        ? service.parseAttackRcl(app.attack, { extremelyClose: fireMode.extremelyClose }) : null;
      const visibility = normalizeVisibility(values.visibility);
      const targets = visibility?.targetTokenId ? [...(game.user?.targets ?? [])] : [];
      if (visibility?.mode === "unseen" &&
          (Boolean(visibility.targetTokenId) === Boolean(visibility.blindFireHex) ||
           visibility.targetTokenId &&
             (visibility.location !== "approximate" && visibility.location !== "exact" ||
              targets.length !== 1 || targets[0]?.id !== visibility.targetTokenId))) {
        ui.notifications.warn("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u0435\u043a\u0441 \u0434\u043b\u044f \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
        return false;
      }
      const roll = () => executePreparedSkillRoll({ actor, effectiveSkill, baseSkill,
        effectiveRoF: fireMode.effectiveRoF, rcl,
        location, targetingService: currentTargetingService, closeMultiplier: fireMode.closeDamageMultiplier,
        modifierDetails: skillDetails?.modifiers ?? [] });
      const result = visibility?.mode === "unseen" && visibility.blindFireHex
        ? await withClearedFoundryTargets(roll) : await roll();
      return result.rolled;
    }
  });
  await app.render({ force: true });
  return app;
}
