import { normalizeAccuracy, normalizeBulk } from "./fire-service.js";
import { visibilityRules } from "./limited-visibility.js";
import { findRangeBandForDistance, getRangeBandDistance, isBeamWeapon, resolveEffectiveRange } from "./fire-range-service.js";

function sceneDistanceToYards(value, runtime = globalThis) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const Length = runtime.GURPS?.Length;
  if (!Length?.from || !Length?.Unit?.Yard) return number;
  const unit = Length.unitFromString?.(
    runtime.canvas?.scene?.grid?.units ?? Length.Unit.Yard
  ) ?? Length.Unit.Yard;
  const yards = Length.from(number, unit)?.to(Length.Unit.Yard)?.value;
  return Number.isFinite(Number(yards)) ? Number(yards) : null;
}

export function measureTokenDistanceYards(sourceToken, targetToken, runtime = globalThis) {
  if (!sourceToken || !targetToken || sourceToken === targetToken) return null;
  try {
    const sourceDocument = sourceToken.document ?? sourceToken;
    const targetDocument = targetToken.document ?? targetToken;
    const path = runtime.canvas?.grid?.measurePath?.([sourceDocument, targetDocument]);
    const sceneDistance = runtime.canvas?.grid?.isGridless ? path?.distance : path?.spaces;
    const yards = sceneDistanceToYards(sceneDistance, runtime);
    return Number.isFinite(yards) && yards >= 0 ? yards : null;
  } catch (error) {
    console.warn("OleGURPS QOL | Unable to measure target distance:", error);
    return null;
  }
}

export function measureCanvasPointDistanceYards(sourceToken, point, runtime = globalThis) {
  const grid = runtime.canvas?.grid;
  const source = (sourceToken?.document ?? sourceToken)?.getCenterPoint?.() ?? sourceToken?.center;
  if (!grid || !Number.isFinite(source?.x) || !Number.isFinite(source?.y) ||
      !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  try {
    const path = grid.measurePath?.([source, point]);
    const sceneDistance = grid.isGridless ? path?.distance : path?.spaces;
    const yards = sceneDistanceToYards(sceneDistance, runtime);
    return Number.isFinite(yards) && yards >= 0 ? yards : null;
  } catch (error) {
    console.warn("OleGURPS QOL | Unable to measure selected hex:", error);
    return null;
  }
}

export function getTokenFireRangeContext({ sourceToken, targetToken, rangeBands, runtime = globalThis } = {}) {
  const distance = measureTokenDistanceYards(sourceToken, targetToken, runtime);
  if (!Number.isFinite(distance)) return null;
  const sourceElevation = Number((sourceToken?.document ?? sourceToken)?.elevation ?? 0);
  const targetElevation = Number((targetToken?.document ?? targetToken)?.elevation ?? 0);
  const height = sceneDistanceToYards(Math.abs(targetElevation - sourceElevation), runtime) ?? 0;
  const range = findRangeBandForDistance(rangeBands, distance);
  return {
    distance,
    height,
    highGround: sourceElevation > targetElevation,
    rangeIndex: range?.index ?? null,
    rangePenalty: range?.penalty ?? 0,
    rangeLabel: range?.label ?? ""
  };
}

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
    const visibility = visibilityRules(values?.visibility);
    const aimed = fireService.resolveAimedFireBonuses({
      accuracy: attack?.acc, scopeBonus: attack?.scopeBonus ?? attack?.data?.scopeBonus ?? 0,
      aimSeconds: visibility && !visibility.aimAllowed ? 0 : values?.aimSeconds,
      braced: visibility && !visibility.aimAllowed ? false : values?.braced,
      laserSight: visibility?.random ? false : values?.laserSight,
      moveAndAttack: parseBoolean(values?.moveAndAttack)
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
    return measureTokenDistanceYards(token, targets[0], globalThis);
  }

  function getTargetRangeRecommendation(rangeBands) {
    const distance = getSingleTargetPhysicalDistanceYards();
    if (!Number.isFinite(distance)) return null;
    const range = findRangeBandForDistance(rangeBands, distance);
    if (!range) return null;
    return {
      rangeIndex: range.index,
      penalty: range.penalty,
      distance,
      source: "physical-target-distance"
    };
  }

  function getFireModeState(attack, values, rangeBands) {
    const selectedIndex = values?.rangeIndex === null || values?.rangeIndex === ""
      ? Number.NaN
      : Number(values?.rangeIndex);
    const selectedRange = rangeBands.find(entry => entry.index === selectedIndex) ?? null;
    const selectedDistance = getRangeBandDistance(selectedRange);
    const explicitDistance = values?.targetDistanceOverride;
    const blindUnknown = values?.visibility?.mode === "unseen" ||
      values?.visibility?.mode === "blind" && !values.visibility.knownLocation;
    const targetDistance = explicitDistance !== null && explicitDistance !== undefined &&
      explicitDistance !== "" && Number.isFinite(Number(explicitDistance))
      ? Number(explicitDistance) : blindUnknown ? null : getSingleTargetPhysicalDistanceYards();
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

  function getApplicableEffectModifierTotal(attack, skipTargets = false) {
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
        ...(!skipTargets && Array.isArray(data.targets)
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

  function calculateEffectiveFireSkillDetails(attack, values, rangeBands, targetingService, targetedAttackContext = null) {
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
    const blindUnknown = values?.visibility?.mode === "unseen" ||
      values?.visibility?.mode === "blind" && !values.visibility.knownLocation;
    const effectRangePenalty = settings?.autoAdd && useEffects && !blindUnknown
      ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null
      : null;
    const rangeAdjustment = effectiveRange
      ? effectiveRange.penalty - (Number.isFinite(effectRangePenalty) ? effectRangePenalty : 0)
      : 0;
    const manualValue = Number(String(values?.manualModifier ?? "").replace(",", "."));
    const manualModifier = Number.isFinite(manualValue) ? Math.trunc(manualValue) : 0;
    const { aimBonus, bracingBonus, sightBonus, laserBonus, moveAttackPenalty } = getFireBonuses(attack, values);
    const allOutAttackBonus = fireService.calculateRangedAllOutAttackBonus(
      values?.allOutAttack, values?.moveAndAttack
    );
    const fireMode = getFireModeState(attack, values, rangeBands);
    const rapidFireBonus = getRapidFireBonus(attack, fireMode.effectiveRoF);
    const visibility = visibilityRules(values?.visibility);
    const hitLocation = targetingService?.getSelection(
      visibility?.random ? "silhouette" : values?.hitLocationId,
      visibility?.random ? null : values?.hitRegionId
    );
    const targetedAttack = !visibility?.random && !values?.suppressTargetedAttack && targetedAttackContext?.resolve({
      specialty: values?.governingSpecialty,
      target: hitLocation?.canonicalKeys ?? hitLocation?.canonicalKey ?? hitLocation?.zoneId,
      basePenalty: hitLocation?.penalty
    });
    const hitLocationPenalty = Number(targetedAttack?.effectivePenalty ?? hitLocation?.penalty ?? 0);
    const bucketModifier = getPreviewBucketTotal();
    const effectModifier = getApplicableEffectModifierTotal(attack, blindUnknown);
    const targetLabel = targetedAttack?.entry?.name ?? targetedAttack?.attackVariant ?? "";
    const targetedAttackLabel = /^Targeted Attack\b/iu.test(targetLabel)
      ? targetLabel : (targetLabel ? `Targeted Attack: ${targetLabel}` : "Targeted Attack");
    const hitLocationLabel = targetedAttack
      ? `${targetedAttackLabel} / Hit Location: ${hitLocation?.label ?? ""}`
      : `Hit Location: ${hitLocation?.label ?? ""}`;
    const modifiers = [
      { label: "Modifier Bucket", value: bucketModifier },
      { label: "Эффекты GGA", value: effectModifier },
      { label: `Расстояние: ${effectiveRange?.label ?? ""}`, value: rangeAdjustment },
      { label: `Скорострельность: ${fireMode.effectiveRoF ?? ""}`, value: rapidFireBonus },
      { label: "Aim", value: aimBonus },
      { label: "Упор", value: bracingBonus },
      { label: "Optical Sight", value: sightBonus },
      { label: "Лазерный прицел", value: laserBonus },
      { label: "Движение и атака", value: moveAttackPenalty },
      { label: "Тотальная атака (Точная)", value: allOutAttackBonus },
      { label: "Бонусы/штрафы", value: manualModifier },
      { label: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c", value: visibility?.penalty ?? 0 },
      { label: hitLocationLabel, value: hitLocationPenalty }
    ];

    const calculatedSkill = baseLevel + modifiers.reduce((total, entry) => total + Number(entry.value || 0), 0);
    const effectiveSkill = visibility?.blind ? Math.min(calculatedSkill, 9) : calculatedSkill;
    if (visibility?.blind && effectiveSkill < calculatedSkill) {
      modifiers.push({ label: "Cap Shooting Blind: 9", value: effectiveSkill - calculatedSkill });
    }
    return { effectiveSkill, calculatedSkill, modifiers };
  }

  function calculateEffectiveFireSkill(attack, values, rangeBands, targetingService, targetedAttackContext = null) {
    return calculateEffectiveFireSkillDetails(
      attack, values, rangeBands, targetingService, targetedAttackContext
    )?.effectiveSkill ?? null;
  }

  return { getRangeBands, getGgaTargetRangeRecommendation, getTargetRangeRecommendation, getFireModeState,
    getTaggedModifierSettings, getApplicableEffectModifierTotal, calculateEffectiveFireSkill, calculateEffectiveFireSkillDetails,
    getFireBonuses, getRapidFireBonus };
}
