import { FirePreparationApp } from "./fire-preparation-app.js";
import { FireService } from "./fire-service.js";
import { TargetingService } from "./targeting-service.js";
import { createFireControlContext } from "./fire-control-context.js";
import { executePreparedSkillRoll } from "./prepared-gga-roll.js";
import { parseElevationHeight } from "./fire-range-service.js";

export async function openFireControl() {
  if (!globalThis.GURPS?.ModifierBucket) {
    ui.notifications.error("Не найден GURPS Game Aid.");
    return;
  }
  const controlled = globalThis.canvas?.tokens?.controlled ?? [];
  const token = controlled.length === 1 ? controlled[0] : null;
  const actor = token?.actor ?? game.user?.character ?? null;
  const service = new FireService({ actor, token });
  const context = createFireControlContext({ token, fireService: service, mode: "standalone" });
  const rangeBands = context.getRangeBands();
  const targetingService = await TargetingService.create();
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
    mode: "standalone", token, attack: {}, rangeBands, targetingService,
    recommendation: context.getGgaTargetRangeRecommendation(rangeBands),
    maximumShots: 1, rateOfFireProfile: service.parseRateOfFire(""),
    calculateShotLimits: shotLimits,
    parseRateOfFire: value => service.parseRateOfFire(value),
    calculateRapidFireBonus: shots => context.getRapidFireBonus(app.attack, shots),
    calculateAimBonus: (aimSeconds, moveAndAttack) => context.getFireBonuses(app.attack, { aimSeconds, moveAndAttack }).aimBonus,
    calculateBracingBonus: (braced, aimSeconds, moveAndAttack) => context.getFireBonuses(app.attack, { braced, aimSeconds, moveAndAttack }).bracingBonus,
    calculateFireMode: values => context.getFireModeState(app.attack, values, rangeBands),
    calculateEffectiveSkill: values => context.calculateEffectiveFireSkill(app.attack, values, rangeBands, targetingService),
    onConfirm: async values => {
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
      const location = targetingService.getSelection(values.hitLocationId, values.hitRegionId);
      if (!location) return false;
      const fireMode = context.getFireModeState(app.attack, values, rangeBands);
      const effectiveSkill = context.calculateEffectiveFireSkill(app.attack, values, rangeBands, targetingService);
      const rcl = /^\s*[1-9]\d*(?:\s*\/\s*[1-9]\d*)?\s*$/.test(app.attack.rcl)
        ? service.parseAttackRcl(app.attack, { extremelyClose: fireMode.extremelyClose }) : null;
      const result = await executePreparedSkillRoll({ actor, effectiveSkill, baseSkill,
        effectiveRoF: fireMode.effectiveRoF, rcl,
        location, targetingService, closeMultiplier: fireMode.closeDamageMultiplier });
      return result.rolled;
    }
  });
  await app.render({ force: true });
  return app;
}
