import { executePreparedGgaRoll } from "./prepared-gga-roll.js";

export function parseRateOfFire(value) {
  const text = String(value ?? "").trim();
  if (/^\d+\s*!(?:\s*\/\s*\d+\s*!)*$/u.test(text)) {
    const modes = Array.from(text.matchAll(/(\d+)\s*!/gu), (match, index) => {
      const fullRoF = Math.max(1, Number(match[1]));
      return {
        index,
        fullRoF,
        minRoF: Math.ceil(fullRoF / 4),
        label: `${fullRoF}!`
      };
    });
    return {
      type: "full-auto",
      source: text,
      baseRoF: modes[0].fullRoF,
      projectileMultiplier: 1,
      display: text,
      modes
    };
  }

  const multiple = text.match(/^(\d+)\s*[xX\u00d7*]\s*(\d+)$/u);
  if (multiple) {
    const baseRoF = Number(multiple[1]);
    const projectileMultiplier = Number(multiple[2]);
    if (baseRoF >= 1 && projectileMultiplier > 1) {
      return {
        type: "multiple-projectile",
        source: text,
        baseRoF,
        projectileMultiplier,
        display: `${baseRoF}\u00d7${projectileMultiplier}`
      };
    }
  }

  const ordinary = text.match(/\d+/);
  return {
    type: "ordinary",
    source: text,
    baseRoF: ordinary ? Math.max(1, Number(ordinary[0])) : 1,
    projectileMultiplier: 1,
    display: text
  };
}

export function resolveRateOfFireLimits({ rof, loaded, modeIndex = 0 } = {}) {
  const profile = typeof rof === "object" && rof?.type ? rof : parseRateOfFire(rof);
  const ammo = Math.max(0, Math.trunc(Number(loaded) || 0));
  if (profile.type !== "full-auto") {
    return {
      profile,
      modeIndex: 0,
      fullRoF: profile.baseRoF,
      minRoF: 1,
      minShots: 1,
      maxShots: Math.max(1, Math.min(profile.baseRoF, ammo))
    };
  }

  const requestedMode = Math.trunc(Number(modeIndex));
  const selectedMode = profile.modes[requestedMode] ?? profile.modes[0];
  const maxShots = Math.min(selectedMode.fullRoF, ammo);
  const minShots = ammo < selectedMode.minRoF ? ammo : selectedMode.minRoF;
  return {
    profile,
    modeIndex: selectedMode.index,
    fullRoF: selectedMode.fullRoF,
    minRoF: selectedMode.minRoF,
    minShots,
    maxShots
  };
}

export function normalizeAccuracy(value) {
  const match = String(value ?? "").trim().match(/^(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const accuracy = Number(match[1].replace(",", "."));
  return Number.isFinite(accuracy) && accuracy >= 0 ? Math.trunc(accuracy) : null;
}

export function normalizeAimSeconds(value) {
  const seconds = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : 0;
}

export function calculateAimBonus(accuracy, seconds) {
  const normalizedAccuracy = normalizeAccuracy(accuracy);
  const normalizedSeconds = normalizeAimSeconds(seconds);
  if (normalizedAccuracy === null || normalizedSeconds === 0) return 0;
  const uncappedBonus = normalizedAccuracy + Math.min(normalizedSeconds - 1, 2);
  return Math.min(uncappedBonus, normalizedAccuracy * 2);
}

export function calculateBracingBonus(braced, aimSeconds) {
  const enabled = braced === true || braced === 1 ||
    ["true", "1", "on"].includes(String(braced ?? "").trim().toLowerCase());
  return enabled && normalizeAimSeconds(aimSeconds) > 0 ? 1 : 0;
}

export function normalizeBulk(value) {
  const match = String(value ?? "").trim().match(/^[+-]?\d+/);
  if (!match) return null;
  const bulk = Number(match[0]);
  return Number.isFinite(bulk) ? Math.trunc(bulk) : null;
}

export function calculateMoveAttackPenalty(bulk, moveAndAttack) {
  const enabled = moveAndAttack === true || moveAndAttack === 1 ||
    ["true", "1", "on"].includes(String(moveAndAttack ?? "").trim().toLowerCase());
  if (!enabled) return 0;
  return Math.min(-2, normalizeBulk(bulk) ?? -2);
}

export function resolveAimedFireBonuses({
  accuracy,
  aimSeconds,
  braced,
  laserSight,
  moveAndAttack = false
} = {}) {
  const moving = moveAndAttack === true || moveAndAttack === 1 ||
    ["true", "1", "on"].includes(String(moveAndAttack ?? "").trim().toLowerCase());
  const laserEnabled = laserSight === true || laserSight === 1 ||
    ["true", "1", "on"].includes(String(laserSight ?? "").trim().toLowerCase());
  const normalizedSeconds = normalizeAimSeconds(aimSeconds);
  const normalizedAccuracy = normalizeAccuracy(accuracy);

  if (moving || normalizedSeconds === 0 || normalizedAccuracy === null) {
    const laserBonus = laserEnabled ? 1 : 0;
    return {
      aimBonus: 0,
      bracingBonus: 0,
      laserBonus,
      aimedFireBonus: laserBonus,
      aimedFireCap: null
    };
  }

  const aimedFireCap = normalizedAccuracy * 2;
  let remaining = aimedFireCap;
  const baseAimBonus = Math.min(normalizedAccuracy, remaining);
  remaining -= baseAimBonus;
  const bracingBonus = Math.min(calculateBracingBonus(braced, normalizedSeconds), remaining);
  remaining -= bracingBonus;
  const extraAimBonus = Math.min(Math.min(normalizedSeconds - 1, 2), remaining);
  remaining -= extraAimBonus;
  const aimBonus = baseAimBonus + extraAimBonus;
  const laserBonus = Math.min(laserEnabled ? 1 : 0, remaining);
  const aimedFireBonus = aimBonus + bracingBonus + laserBonus;

  return { aimBonus, bracingBonus, laserBonus, aimedFireBonus, aimedFireCap };
}

export function parseHalfDamageRange(value) {
  const match = String(value ?? "").trim().match(/^(\d+(?:[.,]\d+)?)(?=\s*(?:\/|yds?|yards?|$))/i);
  if (!match) return null;
  const range = Number(match[1].replace(",", "."));
  return Number.isFinite(range) && range > 0 ? range : null;
}
export function parseRecoil(value, { extremelyClose = false } = {}) {
  const match = String(value ?? "").trim().match(/^(\d+)(?:\s*\/\s*(\d+))?/);
  if (!match) return 1;
  const ordinary = Math.max(1, Number(match[1]));
  const close = match[2] ? Math.max(1, Number(match[2])) : ordinary;
  return extremelyClose ? close : ordinary;
}

export function resolvePhysicalFireDistance({ selectedDistance, targetDistance, manualRangeSelected = false } = {}) {
  const selected = selectedDistance === null || selectedDistance === undefined || selectedDistance === ""
    ? Number.NaN
    : Number(selectedDistance);
  const target = targetDistance === null || targetDistance === undefined || targetDistance === ""
    ? Number.NaN
    : Number(targetDistance);
  if (manualRangeSelected && Number.isFinite(selected) && selected >= 0) return selected;
  if (Number.isFinite(target) && target >= 0) return target;
  return Number.isFinite(selected) && selected >= 0 ? selected : null;
}

export function resolveMultipleProjectileFire({ rof, physicalShots, physicalDistance, halfDamageRange } = {}) {
  const profile = typeof rof === "object" && rof?.type ? rof : parseRateOfFire(rof);
  const shots = Math.max(1, Math.trunc(Number(physicalShots) || 1));
  const distance = physicalDistance === null || physicalDistance === undefined || physicalDistance === ""
    ? Number.NaN
    : Number(physicalDistance);
  const halfDamage = halfDamageRange === null || halfDamageRange === undefined || halfDamageRange === ""
    ? Number.NaN
    : Number(halfDamageRange);
  const extremelyClose = profile.type === "multiple-projectile" &&
    Number.isFinite(distance) && distance >= 0 &&
    Number.isFinite(halfDamage) && halfDamage > 0 &&
    distance <= halfDamage * 0.1;
  const effectiveRoF = extremelyClose ? shots : shots * profile.projectileMultiplier;

  return {
    profile,
    physicalShots: shots,
    physicalDistance: Number.isFinite(distance) && distance >= 0 ? distance : null,
    halfDamageRange: Number.isFinite(halfDamage) && halfDamage > 0 ? halfDamage : null,
    extremelyClose,
    effectiveRoF,
    closeDamageMultiplier: extremelyClose ? Math.floor(profile.projectileMultiplier / 2) : null
  };
}

export function multiplyBasicDamageFormula(value, multiplier) {
  const source = String(value ?? "").trim();
  const factor = Math.trunc(Number(multiplier));
  const match = source.match(/^(\d+)d(?:\s*([+-])\s*(\d+))?(?=\s|$)/i);
  if (!match || factor < 1) return null;
  const dice = Number(match[1]) * factor;
  const signedAdds = match[2] ? Number(`${match[2]}${match[3]}`) * factor : 0;
  return `${dice}d${signedAdds > 0 ? `+${signedAdds}` : signedAdds < 0 ? signedAdds : ""}`;
}

export class FireService {
  constructor({ actor, token, preparedRollExecutor = executePreparedGgaRoll }) {
    this.actor = actor;
    this.token = token;
    this.preparedRollExecutor = preparedRollExecutor;
    this._previewModifierSnapshot = null;
  }

  getShotLimits(attack, loaded, modeIndex = 0) {
    return resolveRateOfFireLimits({ rof: attack?.rof, loaded, modeIndex });
  }

  getMaximumShots(attack, loaded, modeIndex = 0) {
    return this.getShotLimits(attack, loaded, modeIndex).maxShots;
  }

  parseAttackRcl(attack, options = {}) {
    return parseRecoil(attack?.rcl, options);
  }

  calculateRapidFireBonus(shots) {
    const count = Math.max(1, Math.trunc(Number(shots) || 1));
    if (count <= 4) return 0;
    if (count <= 8) return 1;
    if (count <= 12) return 2;
    if (count <= 16) return 3;
    if (count <= 24) return 4;
    if (count <= 49) return 5;
    if (count <= 99) return 6;
    return 7 + Math.floor(Math.log2(count / 100));
  }
  parseRateOfFire(value) {
    return parseRateOfFire(value);
  }

  resolveRateOfFireLimits(options) {
    return resolveRateOfFireLimits(options);
  }

  normalizeAccuracy(value) {
    return normalizeAccuracy(value);
  }

  normalizeAimSeconds(value) {
    return normalizeAimSeconds(value);
  }

  calculateAimBonus(accuracy, seconds) {
    return calculateAimBonus(accuracy, seconds);
  }

  calculateBracingBonus(braced, aimSeconds) {
    return calculateBracingBonus(braced, aimSeconds);
  }

  normalizeBulk(value) {
    return normalizeBulk(value);
  }

  calculateMoveAttackPenalty(bulk, moveAndAttack) {
    return calculateMoveAttackPenalty(bulk, moveAndAttack);
  }

  resolveAimedFireBonuses(options) {
    return resolveAimedFireBonuses(options);
  }

  parseHalfDamageRange(value) {
    return parseHalfDamageRange(value);
  }
  parseRecoil(value, options = {}) {
    return parseRecoil(value, options);
  }

  resolvePhysicalFireDistance(options) {
    return resolvePhysicalFireDistance(options);
  }

  resolveMultipleProjectileFire(options) {
    return resolveMultipleProjectileFire(options);
  }

  multiplyBasicDamageFormula(value, multiplier) {
    return multiplyBasicDamageFormula(value, multiplier);
  }

  calculateHitsFromMargin(shots, rcl, margin) {
    const safeShots = Math.max(0, Math.trunc(Number(shots) || 0));
    const safeRcl = Math.max(1, Math.trunc(Number(rcl) || 1));
    if (!Number.isInteger(margin)) return null;
    if (margin < 0) return 0;
    return Math.min(safeShots, 1 + Math.floor(margin / safeRcl));
  }

  extractMarginFromRoll(rollData) {
    if (!rollData || typeof rollData !== "object") return null;
    const directKeys = [
      "margin", "marginOfSuccess", "marginSuccess", "marginresult",
      "marginResult", "mrgn"
    ];
    for (const key of directKeys) {
      if (Number.isFinite(Number(rollData[key]))) return Math.trunc(Number(rollData[key]));
    }
    const target = Number(
      rollData.target ?? rollData.finaltarget ?? rollData.modifiedtarget ?? rollData.effectiveSkill
    );
    const rolled = Number(rollData.total ?? rollData.result ?? rollData.roll ?? rollData.rtotal);
    if (Number.isFinite(target) && Number.isFinite(rolled)) return Math.trunc(target - rolled);
    if (rollData.otf && typeof rollData.otf === "object") return this.extractMarginFromRoll(rollData.otf);
    if (rollData.data && typeof rollData.data === "object") return this.extractMarginFromRoll(rollData.data);
    return null;
  }

  getLatestChatMessageId() {
    const messages = game.messages?.contents ?? [];
    return messages.length ? messages[messages.length - 1].id : null;
  }

  getLastRollForActor() {
    return (
      GURPS.lastTargetedRolls?.[this.actor.id] ||
      GURPS.lastTargetedRolls?.[this.token.id] ||
      GURPS.lastTargetedRoll ||
      null
    );
  }

  getModifierSnapshot() {
    const list = GURPS.ModifierBucket?.modifierStack?.modifierList;
    if (!Array.isArray(list)) return [];
    return list.map(entry => ({
      modint: Number(entry.modint ?? entry.mod ?? 0),
      desc: String(entry.desc ?? ""),
      tagged: !!entry.tagged
    }));
  }

  restoreModifierSnapshot(snapshot) {
    GURPS.ModifierBucket.clear?.();
    for (const modifier of snapshot) {
      GURPS.ModifierBucket.addModifier(modifier.modint, modifier.desc, undefined, modifier.tagged);
    }
  }
  getPreviewModifierTotal() {
    const snapshot = this._previewModifierSnapshot ?? this.getModifierSnapshot();
    return snapshot.reduce((total, entry) => {
      if (entry?.tagged) return total;
      const value = Number(entry?.modint ?? entry?.mod ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  async executeRangedAttack(attack, options) {
    const modifierSnapshot = this.getModifierSnapshot();
    const appliedModifiers = [];
    let result = { rolled: false, rollData: null };
    this._previewModifierSnapshot = modifierSnapshot;

    try {
      const hasEffectRangePenalty = options.effectRangePenalty !== null &&
        options.effectRangePenalty !== "" &&
        Number.isFinite(Number(options.effectRangePenalty));
      const effectRangePenalty = hasEffectRangePenalty ? Number(options.effectRangePenalty) : 0;
      const rangeAdjustment = hasEffectRangePenalty
        ? options.rangePenalty - effectRangePenalty
        : options.rangePenalty;
      if (rangeAdjustment !== 0) {
        const description = hasEffectRangePenalty
          ? `Коррекция выбранного расстояния: ${options.rangeLabel}`
          : `Расстояние: ${options.rangeLabel}`;
        GURPS.ModifierBucket.addModifier(rangeAdjustment, description);
        appliedModifiers.push(`расстояние ${options.rangePenalty} (${options.rangeLabel})`);
      }
      if (options.hitLocationPenalty !== 0) {
        GURPS.ModifierBucket.addModifier(
          options.hitLocationPenalty,
          `Hit Location: ${options.hitLocationModifierLabel}`
        );
        appliedModifiers.push(`hit location ${options.hitLocationPenalty} (${options.hitLocationModifierLabel})`);
      }
      if (options.rapidFireBonus > 0) {
        GURPS.ModifierBucket.addModifier(
          options.rapidFireBonus,
          `Скорострельность: ${options.effectiveRoF ?? options.shots} снарядов`
        );
        appliedModifiers.push(`скорострельность +${options.rapidFireBonus}`);
      }
      if (options.laserBonus > 0) {
        GURPS.ModifierBucket.addModifier(options.laserBonus, "Лазерный прицел");
        appliedModifiers.push(`лазерный прицел +${options.laserBonus}`);
      }
      if (options.aimBonus > 0) {
        GURPS.ModifierBucket.addModifier(options.aimBonus, "Aim");
        appliedModifiers.push(`Aim +${options.aimBonus}`);
      }
      if (options.bracingBonus > 0) {
        GURPS.ModifierBucket.addModifier(options.bracingBonus, "Упор");
        appliedModifiers.push(`Упор +${options.bracingBonus}`);
      }
      if (options.moveAttackPenalty < 0) {
        GURPS.ModifierBucket.addModifier(options.moveAttackPenalty, "Движение и атака");
        appliedModifiers.push(`движение и атака ${options.moveAttackPenalty}`);
      }
      if (options.manualModifier !== 0) {
        GURPS.ModifierBucket.addModifier(options.manualModifier, "Бонусы/штрафы");
        const sign = options.manualModifier > 0 ? "+" : "";
        appliedModifiers.push(`ручной модификатор ${sign}${options.manualModifier}`);
      }

      GURPS.SetLastActor?.(this.actor);
      result = await this.preparedRollExecutor({
        actor: this.actor,
        token: this.token,
        attack,
        effectiveSkill: options.effectiveSkill,
        physicalShots: options.physicalShots,
        effectiveRoF: options.effectiveRoF,
        extremelyClose: options.extremelyClose,
        rcl: options.rcl
      });
    } finally {
      try {
        this.restoreModifierSnapshot(modifierSnapshot);
      } catch (cleanupError) {
        console.error("Не удалось восстановить Modifier Bucket:", cleanupError);
        GURPS.ModifierBucket.clear?.();
      } finally {
        this._previewModifierSnapshot = null;
      }
    }

    return { ...result, appliedModifiers };
  }
}
