import { normalizeAccuracy, normalizeBulk } from "./fire-service.js";
import { getRangeBandDistance, isBeamWeapon, resolveEffectiveRange } from "./fire-range-service.js";

export function createStandaloneAttack(values) {
  const rawShots = Number(values.shots);
  const shots = Number.isInteger(rawShots) && rawShots > 0 ? rawShots : 1;
  const rawMultiplier = Number(values.projectileMultiplier);
  const projectileMultiplier = Number.isInteger(rawMultiplier) && rawMultiplier > 1 ? rawMultiplier : null;
  const shotgun = values.shotgun === true || values.shotgun === 1 ||
    ["true", "1", "on"].includes(String(values.shotgun ?? "").trim().toLowerCase());
  const rof = shotgun && projectileMultiplier ? `${shots}×${projectileMultiplier}` : "";
  return {
    name: "Fire Control",
    level: values.skillLevel,
    acc: normalizeAccuracy(values.acc),
    rof,
    rcl: String(values.rcl ?? "").trim(),
    data: { bulk: normalizeBulk(values.bulk), halfd: values.halfd }
  };
}

export function createFireControlContext({ token, fireService, mode = "weapon" }) {
  const parseBoolean = value => value === true || value === 1 || ["true", "1", "on"].includes(String(value ?? "").toLowerCase());
  function getFireBonuses(attack, values) {
    const hasAcc = fireService.normalizeAccuracy(attack?.acc) !== null;
    const hasBulk = fireService.normalizeBulk(attack?.data?.bulk ?? attack?.bulk) !== null;
    const aimed = fireService.resolveAimedFireBonuses({
      accuracy: attack?.acc, aimSeconds: values?.aimSeconds,
      braced: values?.braced, moveAndAttack: parseBoolean(values?.moveAndAttack)
    });
    return {
      ...aimed,
      bracingBonus: mode === "standalone" && !hasAcc ? 0 : aimed.bracingBonus,
      moveAttackPenalty: mode === "standalone" && !hasBulk ? 0 : fireService.calculateMoveAttackPenalty(
        attack?.data?.bulk ?? attack?.bulk, parseBoolean(values?.moveAndAttack)
      )
    };
  }
  function getRapidFireBonus(_attack, shots) {
    return fireService.calculateRapidFireBonus(shots);
  }
  function getRangeBands() {
    const ranges = globalThis.GURPS?.rangeObject?.ranges;
    if (!Array.isArray(ranges) || ranges.length === 0) {
      throw new Error("GGA не предоставила активную таблицу дистанций.");
    }
    return ranges.map((range, index) => {
      const penalty = Number(range.penalty);
      if (!Number.isFinite(penalty)) {
        throw new Error(`GGA вернула некорректный модификатор дистанции в строке ${index + 1}.`);
      }
      return {
        index,
        penalty,
        max: range.max,
        label: String(range.moddesc ?? range.desc ?? range.description ?? range.max ?? index + 1)
      };
    });
  }

  function getRecordedGgaTargetPenalty(target) {
    try {
      const targetGroups = globalThis.GURPS?.EffectModifierControl?._ui?.targets;
      if (!Array.isArray(targetGroups)) return null;
      const group = targetGroups.find(entry => entry?.name === target.name) ??
        (targetGroups.length === 1 ? targetGroups[0] : null);
      const modifier = group?.targetmodifiers?.find(entry => {
        const description = String(entry?.desc ?? "");
        return entry?.itemId === "combatmod" && description.includes(target.name) && /^[+-]?\d+\s/.test(description);
      });
      const match = String(modifier?.desc ?? "").match(/^([+-]?\d+)\s/);
      return match ? Number(match[1]) : null;
    } catch (error) {
      console.warn("Не удалось прочитать target-range modifier GGA:", error);
      return null;
    }
  }


  function getGgaTargetRangeRecommendation(rangeBands) {
    const targets = Array.from(game.user?.targets ?? []);
    if (targets.length !== 1) return null;
    const target = targets[0];
    const penalty = getRecordedGgaTargetPenalty(target);
    if (!Number.isFinite(penalty)) return null;
    const range = rangeBands.find(entry => entry.penalty === penalty);
    if (!range) return null;
    return {
      rangeIndex: range.index,
      penalty,
      source: "gga-effect-modifiers"
    };
  }
  function getSingleTargetPhysicalDistanceYards() {
    const targets = Array.from(game.user?.targets ?? []);
    if (targets.length !== 1 || !token || targets[0] === token) return null;
    try {
      const target = targets[0];
      const path = canvas?.grid?.measurePath?.([token.document, target.document]);
      const sceneDistance = canvas?.grid?.isGridless ? path?.distance : path?.spaces;
      const Length = globalThis.GURPS?.Length;
      if (!Number.isFinite(Number(sceneDistance)) || !Length?.from || !Length?.Unit?.Yard) return null;
      const unit = Length.unitFromString?.(canvas?.scene?.grid?.units ?? Length.Unit.Yard) ?? Length.Unit.Yard;
      const yards = Length.from(Number(sceneDistance), unit)?.to(Length.Unit.Yard)?.value;
      return Number.isFinite(Number(yards)) && Number(yards) >= 0 ? Number(yards) : null;
    } catch (error) {
      console.warn("Не удалось определить физическую дистанцию до target:", error);
      return null;
    }
  }

  function getFireModeState(attack, values, rangeBands) {
    const selectedIndex = values?.rangeIndex === null || values?.rangeIndex === ""
      ? Number.NaN
      : Number(values?.rangeIndex);
    const selectedRange = rangeBands.find(entry => entry.index === selectedIndex) ?? null;
    const selectedDistance = getRangeBandDistance(selectedRange);
    const targetDistance = getSingleTargetPhysicalDistanceYards();
    const physicalDistance = fireService.resolvePhysicalFireDistance({
      selectedDistance,
      targetDistance,
      manualRangeSelected: values?.manualRangeSelected === true
    });
    const halfDamageRange = fireService.parseHalfDamageRange(attack?.data?.halfd) ??
      fireService.parseHalfDamageRange(attack?.data?.range);
    return fireService.resolveMultipleProjectileFire({
      rof: attack?.rof,
      physicalShots: values?.shots,
      physicalDistance,
      halfDamageRange
    });
  }

  function getTaggedModifierSettings() {
    try {
      return game.settings?.get?.("gurps", "use-tagged-modifiers") ?? null;
    } catch (_error) {
      return null;
    }
  }

  function splitModifierTags(value) {
    const tags = Array.isArray(value) ? value : String(value ?? "").split(",");
    return tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean);
  }

  function getRangedRollTags(attack, settings) {
    return new Set([
      ...splitModifierTags(settings?.allRolls),
      ...splitModifierTags(settings?.allAttackRolls),
      ...splitModifierTags(settings?.allRangedRolls),
      ...splitModifierTags(attack?.data?.modifierTags)
    ]);
  }

  function getApplicableEffectModifierTotal(attack) {
    const settings = getTaggedModifierSettings();
    if (!settings?.autoAdd || (mode === "standalone" && !token)) return 0;

    try {
      const effectUi = globalThis.GURPS?.EffectModifierControl?._ui;
      if (!effectUi?.getData) return 0;
      const effectToken = effectUi.getToken?.();
      if (effectToken && effectToken !== token) return 0;
      const data = effectUi.getData();
      if (!data || typeof data.then === "function") return 0;
      const entries = [
        ...(Array.isArray(data.selfmodifiers) ? data.selfmodifiers : []),
        ...(Array.isArray(data.targets)
          ? data.targets.flatMap(group => Array.isArray(group?.targetmodifiers) ? group.targetmodifiers : [])
          : [])
      ];
      const rollTags = getRangedRollTags(attack, settings);
      let total = 0;
      for (const entry of entries) {
        const match = String(entry?.desc ?? "").match(/^([+-]\d+)/);
        if (!match) continue;
        const modifier = Number(match[1]);
        for (const tag of entry?.tags ?? []) {
          if (rollTags.has(String(tag).trim().toLowerCase())) total += modifier;
        }
      }
      return total;
    } catch (_error) {
      return 0;
    }
  }

  function getPreviewBucketTotal() {
    return fireService.getPreviewModifierTotal();
  }

  function calculateEffectiveFireSkill(attack, values, rangeBands, targetingService, targetedAttackContext = null) {
    const baseLevel = Number(attack?.level);
    if (!Number.isFinite(baseLevel) || baseLevel <= 0) return null;

    const selectedIndex = values?.rangeIndex === null || values?.rangeIndex === ""
      ? Number.NaN
      : Number(values?.rangeIndex);
    const { effectiveRange } = resolveEffectiveRange({
      rangeBands,
      rangeIndex: selectedIndex,
      height: values?.height,
      highGround: parseBoolean(values?.highGround),
      beamWeapon: isBeamWeapon(attack)
    });
    const settings = getTaggedModifierSettings();
    const useEffects = mode === "weapon" || (token && globalThis.GURPS?.EffectModifierControl?._ui?.getToken?.() === token);
    const effectRangePenalty = settings?.autoAdd && useEffects
      ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null
      : null;
    const rangeAdjustment = effectiveRange
      ? effectiveRange.penalty - (Number.isFinite(effectRangePenalty) ? effectRangePenalty : 0)
      : 0;
    const manualValue = Number(String(values?.manualModifier ?? "").replace(",", "."));
    const manualModifier = Number.isFinite(manualValue) ? Math.trunc(manualValue) : 0;
    const { aimBonus, bracingBonus, moveAttackPenalty } = getFireBonuses(attack, values);
    const laserBonus = parseBoolean(values?.laserSight) ? 1 : 0;
    const fireMode = getFireModeState(attack, values, rangeBands);
    const rapidFireBonus = getRapidFireBonus(attack, fireMode.effectiveRoF);
    const hitLocation = targetingService?.getSelection(values?.hitLocationId, values?.hitRegionId);
    const targetedAttack = targetedAttackContext?.resolve({
      specialty: values?.governingSpecialty,
      target: hitLocation?.zoneId,
      basePenalty: hitLocation?.penalty
    });
    const hitLocationPenalty = Number(targetedAttack?.effectivePenalty ?? hitLocation?.penalty ?? 0);

    return baseLevel +
      getPreviewBucketTotal() +
      getApplicableEffectModifierTotal(attack) +
      rangeAdjustment +
      rapidFireBonus +
      aimBonus +
      bracingBonus +
      laserBonus +
      moveAttackPenalty +
      manualModifier +
      hitLocationPenalty;
  }


  return { getRangeBands, getGgaTargetRangeRecommendation, getFireModeState,
    getTaggedModifierSettings, getApplicableEffectModifierTotal, calculateEffectiveFireSkill,
    getFireBonuses, getRapidFireBonus };
}
