import {readGgaShieldAttack} from './shield-equipment-adapter.js';
import { moduleMessage } from "../localization.js";
import {WeaponListVisibility, meleeVisibilityEntries, hiddenWeaponsHTML, visibilityText} from './weapon-list-visibility.js';
import { FirePreparationApp } from "./fire-preparation-app.js";
import { isAmmunitionHistoryOnlyUpdate } from './weapon-assistant-app.js';
import { getEvaluateStatusTurns } from "./aim-status-effects.js";
import { checkHearingMinusTwo, meleeVisibilityRules, normalizeVisibility } from "./limited-visibility.js";
import { TargetingService } from "./targeting-service.js";
import { MeleeAttackExecutionApp, executeMeleeAttackSnapshot } from "./melee-attack-execution-app.js";
import { getMeleeAttackSlots } from "./melee-attack-slots.js";
import { createMeleeTargetedAttackContext } from "./targeted-attack-service.js";
import { openMeleeAttackEditor } from "./melee-attack-editor.js";
import { openStrengthEditor } from './strength-editor-app.js';
import { isStrengthUpdate, sameStrengthActor } from './strength-service.js';
import { openStandaloneWeaponLibrary } from "./standalone-weapon-configuration.js";
import { StandaloneWeaponDraft, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { HT_TEAR_SPRAY_MODE } from './biochemical-integration.js';
import { inferMeleeDamageModel } from './melee-damage-model.js';
import { committedStrongEligible, defensiveAttackContext, meleeMartialText } from './melee-martial-rules.js';
import {blindFightingContextKey} from './blind-fighting-context.js';
import {executeWithCapturedRollMessage} from './prepared-gga-roll.js';
import { MeleeProfileService } from './melee-profile-service.js';
import { meleeCombatControls, meleeCombatControlsHTML, saveMeleeCombatControl, selectMeleeCombatMode,meleePhysicalAttackGroups,meleeOutcomeLabel } from './melee-combat-controls.js';
import {utMeleeResourceReason,utMeleeResourceLabel} from './ut-melee-resources.js';
import { readStandaloneAttack, listStandaloneAttacks } from "./standalone-attack-service.js";
import {
  applyMeleeAttackOverride,
  collectMeleeAttacks,
  clearMeleeAttackOverride,
  getMeleeAttackSettings,
  normalizeMeleeAssistantState,
  setMeleeAttackOverride,
  setMeleeDicePlusAdds,
  setMeleeGoverningSkill,
  setMeleeRapidStrikeMastery,
  setMeleeWeaponBond,
  setMeleeVisibility,
  setSelectedMeleeAttack
} from "./melee-assistant-state.js";
import {
  calculateMeleeEffectiveSkill,
  calculateMeleeSkillBeforeDeceptive,
  resolveMeleeCombatCalculation,
  executeNativeMeleeDamage,
  getDeceptiveDefensePenalty,
  getEvaluateBonus,
  getMaximumDeceptiveAttackPenalty,
  getTelegraphicCriticalBonus,
  getRapidStrikePenalty,
  normalizeDeceptiveAttackPenalty,
  prepareEffectiveMeleeDamage
} from "./melee-service.js";

const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

const MARTIAL_ARTS_HINTS = Object.freeze({
  telegraphic: "+4 \u043a \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044e; +2 \u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0439 \u0437\u0430\u0449\u0438\u0442\u0435 \u0446\u0435\u043b\u0438. \u041d\u0435 \u0441\u043e\u0447\u0435\u0442\u0430\u0435\u0442\u0441\u044f \u0441 Deceptive Attack."
});

export class MeleeAssistantApp extends FirePreparationApp {
  static DEFAULT_OPTIONS = {
    id: "olegurps-melee-assistant",
    classes: ["olegurps-qol", "fire-preparation", "melee-assistant"],
    tag: "section",
    window: { title: "Помощник ближнего боя", resizable: true },
    position: { width: 1120, height: "auto" }
  };

  constructor({ token, actor, sourceAttacks, state, stateService, selectedAttackKey,
    targetingService, targetedAttackContext, initialGoverningSkill = "", onBodyplanChange, onClose }, options = {}) {
    const sourceAttack = sourceAttacks.find(entry => entry.key === selectedAttackKey) ?? sourceAttacks[0] ?? {key:'',name:'',level:0,damage:'',data:{}};
    const attack = applyMeleeAttackOverride(sourceAttack, state, actor);
    super({
      mode: "melee",
      token,
      weapon: { id: "melee-" + actor.id, name: "Помощник ближнего боя" },
      attack,
      rangeBands: [],
      recommendation: null,
      getTargetRangeRecommendation: () => null,
      targetingService,
      targetedAttackContext,
      initialGoverningSpecialty: initialGoverningSkill,
      maximumShots: 1,
      rateOfFireProfile: { type: "single", display: "1", baseRoF: 1 },
      calculateShotLimits: () => ({ minShots: 1, maxShots: 1 }),
      calculateRapidFireBonus: () => 0,
      calculateAimBonus: () => 0,
      calculateBracingBonus: () => 0,
      calculateLaserBonus: () => 0,
      calculateFireMode: () => ({ effectiveRoF: 1, rapidFireBonus: 0 }),
      calculateEffectiveSkill: null,
      onTargetingServiceChange: onBodyplanChange,
      onHearingCheck: manualLevel => checkHearingMinusTwo(actor, manualLevel),
      onClose
    }, {
      ...options,
      id: options.id ?? "olegurps-melee-assistant-" + token.id,
      window: { title: "Помощник ближнего боя - " + actor.name, resizable: true, ...(options.window ?? {}) }
    });
    this.actor = actor;
    this.weaponVisibility = new WeaponListVisibility(actor);
    this._evaluateManuallyEdited = false;
    this._lastEvaluateStatusTurns = this._getStatusEvaluateTurns();
    this.sourceAttacks = sourceAttacks;
    this._meleeState = state;
    this.stateService = stateService;
    this._stateSaveQueue = Promise.resolve();
    this.selectedAttackKey = sourceAttack.key;
    this.sourceAttack = sourceAttack;
    this.attack = attack;
    this.visibility = normalizeVisibility(getMeleeAttackSettings(state, sourceAttack).visibility);
    this.calculateEffectiveSkill = () => this._calculateEffectiveSkill();
    this.fireState.evaluate = this._lastEvaluateStatusTurns ? String(this._lastEvaluateStatusTurns) : "";
    this.fireState.dicePlusAdds = state.dicePlusAdds === true;
    this.fireState.allOutAttack = false;
    this.fireState.allOutAttackMode = "determined";
    this.fireState.deceptiveAttack = "0";
    this.fireState.telegraphicAttack = false;
    this.fireState.committedAttack = false;
    this.fireState.committedMode = "determined";
    this.fireState.committedSteps = false;
    this.fireState.defensiveAttack = false;
    this.fireState.governingSpecialty = this._resolveGoverningSkill(initialGoverningSkill);
    this.fireState.rapidStrikeMastery =
      getMeleeAttackSettings(state, sourceAttack).rapidStrikeMastery === true;
    this.fireState.rapidStrike = false;
    this._attackSlots = getMeleeAttackSlots(this.fireState);
    this._attackSlotStates = [this._snapshotAttackConfiguration()];
    this._attackConfigurationCache = new Map();
    this._activeAttackSlot = 0;
    this._executionWindows = new Set();
    this._effectiveDamage = null;
    this._damagePreviewRevision = 0;
    if (!this._visibleAttacks().length) this.selectedAttackKey = '';
  }

  _resolveGoverningSkill(savedValue = "") {
    const options = this.targetedAttackContext?.specialtyOptions ?? [];
    if (options.some(option => option.value === savedValue)) return savedValue;
    return this.targetedAttackContext?.automaticSpecialty ?? "";
  }

  _snapshotAttackConfiguration() {
    return {
      manualModifier: String(this.fireState.manualModifier ?? ""),
      deceptiveAttack: String(this.fireState.deceptiveAttack ?? "0"),
      telegraphicAttack: this.fireState.telegraphicAttack === true,
      hitLocation: { ...(this.fireState.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _cloneAttackConfiguration(configuration) {
    return {
      manualModifier: String(configuration?.manualModifier ?? ""),
      deceptiveAttack: String(configuration?.deceptiveAttack ?? "0"),
      telegraphicAttack: configuration?.telegraphicAttack === true,
      hitLocation: { ...(configuration?.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _applyAttackConfiguration(configuration) {
    const state = this._cloneAttackConfiguration(configuration);
    const selection = this.targetingService.getSelection(state.hitLocation.zoneId, state.hitLocation.regionId);
    this.fireState.manualModifier = state.manualModifier;
    this.fireState.deceptiveAttack = state.deceptiveAttack;
    this.fireState.telegraphicAttack = state.telegraphicAttack;
    this.fireState.hitLocation = selection
      ? { zoneId: selection.zoneId, regionId: selection.regionId ?? null }
      : { ...this.targetingService.getDefaultSelection() };
  }

  _saveActiveAttackConfiguration() {
    if (this._attackSlotStates) this._attackSlotStates[this._activeAttackSlot] = this._snapshotAttackConfiguration();
  }

  _normalizeAttackConfigurationLocations({ reset = false } = {}) {
    const normalize = configuration => {
      const state = this._cloneAttackConfiguration(configuration);
      const selection = reset ? null :
        this.targetingService.getSelection(state.hitLocation.zoneId, state.hitLocation.regionId);
      state.hitLocation = selection
        ? { zoneId: selection.zoneId, regionId: selection.regionId ?? null }
        : { ...this.targetingService.getDefaultSelection() };
      return state;
    };
    this._attackSlotStates = this._attackSlotStates.map(normalize);
    this._attackConfigurationCache = new Map([...this._attackConfigurationCache].map(
      ([type, configuration]) => [type, normalize(configuration)]
    ));
  }

  _refreshAttackSlots() {
    this._saveActiveAttackConfiguration();
    const previous = new Map(this._attackSlots.map((slot, index) => [slot.type, this._attackSlotStates[index]]));
    for (const [type, configuration] of previous) this._attackConfigurationCache.set(type, this._cloneAttackConfiguration(configuration));
    const previousActive = this._attackSlots[this._activeAttackSlot]?.type;
    const aliases = { attack: ["aoa1", "aoa", "rs1"], aoa: ["aoa1", "attack", "rs1"],
      aoa1: ["aoa", "attack", "rs1"], aoa2: ["rs1", "rs2", "attack"],
      rs1: ["aoa2", "attack", "aoa"], rs2: ["aoa2", "rs1", "attack"] };
    const fallback = this._attackSlotStates[this._activeAttackSlot];
    this._attackSlots = getMeleeAttackSlots(this.fireState);
    this._attackSlotStates = this._attackSlots.map(slot => {
      const existing = previous.get(slot.type) ?? this._attackConfigurationCache.get(slot.type);
      const source = existing ??
        aliases[slot.type].map(type => previous.get(type) ?? this._attackConfigurationCache.get(type)).find(Boolean) ?? fallback;
      const configuration = this._cloneAttackConfiguration(source);
      return configuration;
    });
    this._activeAttackSlot = Math.max(0, this._attackSlots.findIndex(slot => slot.type === previousActive));
    this._applyAttackConfiguration(this._attackSlotStates[this._activeAttackSlot]);
    this._refreshHitLocationContent();
    this._updateAttackSlotControls();
  }

  _switchAttackSlot(index) {
    const next = Number(index);
    if (!Number.isInteger(next) || next < 0 || next >= this._attackSlots.length) return;
    this._saveActiveAttackConfiguration();
    this._activeAttackSlot = next;
    this._applyAttackConfiguration(this._attackSlotStates[next]);
    this._refreshHitLocationContent();
    this._updateMeleePreview();
  }

  _getRapidStrikePenalty() {
    return this._attackSlots[this._activeAttackSlot]?.rapidStrike
      ? getRapidStrikePenalty(this.fireState.rapidStrikeMastery)
      : 0;
  }

  _getHitLocationMarkers(zoneId, regionId = null) {
    if (this._attackSlots.length < 2) return [];
    return this._attackSlotStates.flatMap((configuration, index) => {
      const selection = configuration?.hitLocation;
      const matchesZone = selection?.zoneId === zoneId;
      const matchesRegion = regionId === null || !selection?.regionId || selection.regionId === regionId;
      if (!matchesZone || !matchesRegion) return [];
      return [{
        className: "gam-rapid-attack-" + (index + 1) + (index === this._activeAttackSlot ? " is-active" : ""),
        label: this._attackSlots[index].label
      }];
    });
  }

  _refreshHitLocationContent() {
    const targeting = this.element?.querySelector(".gam-fire-targeting");
    if (targeting) targeting.outerHTML = this._buildHitLocationContent(this.fireState);
  }

  _captureFields() {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    this.fireState.manualModifier = root.querySelector('[name="manualModifier"]')?.value ?? this.fireState.manualModifier;
    this.fireState.evaluate = root.querySelector('[name="evaluate"]')?.value ?? this.fireState.evaluate;
    this.fireState.moveAndAttack = !!root.querySelector('[name="moveAndAttack"]')?.checked;
    this.fireState.dicePlusAdds = !!root.querySelector('[name="dicePlusAdds"]')?.checked;
    this.fireState.allOutAttack = !!root.querySelector('[name="allOutAttack"]')?.checked;
    this.fireState.allOutAttackMode = root.querySelector('[name="allOutAttackMode"]')?.value ?? this.fireState.allOutAttackMode;
    this.fireState.deceptiveAttack = root.querySelector('[name="deceptiveAttack"]')?.value ?? this.fireState.deceptiveAttack;
    this.fireState.telegraphicAttack = !!root.querySelector('[name="telegraphicAttack"]')?.checked;
    this.fireState.committedAttack = !!root.querySelector('[name="committedAttack"]')?.checked;
    this.fireState.committedMode = root.querySelector('[name="committedMode"]')?.value ?? this.fireState.committedMode;
    this.fireState.committedSteps = !!root.querySelector('[name="committedSteps"]')?.checked;
    this.fireState.defensiveAttack = !!root.querySelector('[name="defensiveAttack"]')?.checked;
    this.fireState.governingSpecialty = root.querySelector('[name="governingSpecialty"]')?.value ?? this.fireState.governingSpecialty;
    this.fireState.rapidStrikeMastery =
      !!root.querySelector('[name="rapidStrikeMastery"]')?.checked;
    if (this.fireState.rapidStrike) this.fireState.moveAndAttack = false;
    this._saveActiveAttackConfiguration();
  }

  getShotOptions() {
    return {
      governingSpecialty: this.fireState.governingSpecialty,
      rapidStrikeMastery: this.fireState.rapidStrikeMastery,
      manualModifier: this.fireState.manualModifier,
      evaluate: this.fireState.evaluate,
      moveAndAttack: this.fireState.moveAndAttack,
      dicePlusAdds: this.fireState.dicePlusAdds,
      allOutAttack: this.fireState.allOutAttack,
      allOutAttackMode: this.fireState.allOutAttackMode,
      deceptiveAttack: this.fireState.deceptiveAttack,
      telegraphicAttack: this.fireState.telegraphicAttack,
      committedAttack: this.fireState.committedAttack,
      committedMode: this.fireState.committedMode,
      committedSteps: this.fireState.committedSteps,
      defensiveAttack: this.fireState.defensiveAttack,
      rapidStrike: this.fireState.rapidStrike,
      attackSlot: this._attackSlots[this._activeAttackSlot]?.type,
      bodyplanId: this.fireState.bodyplanId,
      hitLocationId: this.fireState.hitLocation.zoneId,
      hitRegionId: this.fireState.hitLocation.regionId
    };
  }

  _readTargetRangeRecommendation() { return null; }

  _visibilityForTargeting() {
    return this._getMeleeVisibilityRules()?.random ? this.visibility : null;
  }

  _getMeleeVisibilityRules() {
    return meleeVisibilityRules(this.visibility, this._getBlindFightingAttempt()?.result === "success");
  }

  _getBlindFightingAttempt() {
    if(!this._blindFighting||this._blindFighting.used||this._blindFighting.context!==blindFightingContextKey(this)){
      if(this._buildingAttackSnapshots&&!this._blindFighting?.used)return null;
      this._blindFighting=null;return null;
    }return this._blindFighting;
  }

  _hasBlindFighting() {
    return !!this.actor?.findSkill?.("^Blind Fighting$");
  }

  async _checkBlindFighting(button) {
    if (this._getBlindFightingAttempt() || !this.visibility) return;
    button.disabled = true;
    try {
      const context=blindFightingContextKey(this);
      const result=await executeWithCapturedRollMessage({actorId:this.actor.id,
        execute:()=>globalThis.GURPS.executeOTF("[S:Blind Fighting]",false,null,this.actor)});
      if(!result.message||context!==blindFightingContextKey(this))return;
      this._blindFighting={context,result:result.result?'success':'failure',used:false};
      await this.render({ force: true });
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  _buildVisibilityBreakdown() {
    const rules = this._getMeleeVisibilityRules();
    if (!rules) return "";
    const final = this._calculateEffectiveSkill();
    const before = calculateMeleeSkillBeforeDeceptive({
      ...this._getMeleeCalculationOptions(), visibilityPenalty: 0, visibilityCap: false
    });
    return `<span>\u0420\u0430\u0441\u0447\u0451\u0442: ${before ?? "\u2013"}</span>
      <span>\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c: ${rules.penalty}</span>
      ${rules.cap ? "<span>Cap: 9</span>" : ""}
      <strong>\u0418\u0442\u043e\u0433: ${final ?? "\u2013"}</strong>`;
  }

  _buildVisibilityRuleHint() {
    return this._getMeleeVisibilityRules()?.random
      ? "<p>Зона попадания: случайная; Targeted Attack \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.</p>" : "";
  }

  _buildVisibilityContent() {
    const content = super._buildVisibilityContent();
    if (!content) return "";
    const blindAttempt=this._getBlindFightingAttempt();
    const blindFighting = this._hasBlindFighting()
      ? `<div class="gam-melee-blind-fighting"><button type="button" data-melee-action="blind-fighting" ${blindAttempt ? "disabled" : ""}>Blind Fighting</button>
        <span>${blindAttempt?.result === "success" ? "\u0423\u0441\u043f\u0435\u0445: \u0448\u0442\u0440\u0430\u0444 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u0438 \u0441\u043d\u044f\u0442" : blindAttempt?.result === "failure" ? "\u041f\u0440\u043e\u0432\u0430\u043b: \u043e\u0431\u044b\u0447\u043d\u044b\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u0438" : ""}</span></div>`
      : "";
    return content.replace(/<\/section>$/, `${blindFighting}</section>`);
  }

  _getSelectedLocation() {
    return this.targetingService.getSelection(this.fireState.hitLocation.zoneId, this.fireState.hitLocation.regionId)
      ?? this.targetingService.getSelection("silhouette");
  }

  _refreshStandaloneAttack() {
    const ref = this.sourceAttack?.standaloneRef;
    const current = ref ? readStandaloneAttack(this.actor, ref.weaponId, ref.modeId) : this.sourceAttack?.equipmentRef?readGgaShieldAttack(this.actor,this.sourceAttack):this.sourceAttack;
    if (!current) {
      this.attack = { ...this.attack, level: null, readinessReason: "Автономный режим удалён. Выберите другую атаку." };
      return;
    }
    this.sourceAttack = current;
    this.attack = applyMeleeAttackOverride(current,this._meleeState,this.actor);
    if (ref || this.attack.meleeProfile) {
      this.targetedAttackContext = createMeleeTargetedAttackContext({ actor: this.actor, attack: this.attack });
      this.fireState.governingSpecialty = this._resolveGoverningSkill(this.fireState.governingSpecialty);
    }
  }

  _getLocationResult() {
    this._refreshStandaloneAttack();
    const visibility = this._getMeleeVisibilityRules();
    const selection = visibility?.random ? this.targetingService.getSelection("silhouette") : this._getSelectedLocation();
    const zone = this.targetingService.getZone(selection?.zoneId);
    const targetedAttack = visibility?.random ? null : this.targetedAttackContext?.resolve({
      specialty: this.fireState.governingSpecialty,
      target: selection?.canonicalKeys ?? [selection?.canonicalKey, ...(zone?.taAliases ?? [])],
      basePenalty: selection?.penalty ?? 0
    }) ?? null;
    return {
      selection,
      targetedAttack,
      penalty: (targetedAttack?.effectivePenalty ?? selection?.penalty ?? 0) +
        (visibility?.precisionPenalty && selection?.zoneId !== "silhouette" ? visibility.precisionPenalty : 0)
    };
  }

  _getBaseSkillLevel() {
    this._refreshStandaloneAttack();
    if (this.attack?.standaloneRef) return this.attack.standaloneRef.governingSkill?.resolved ? this.attack.level : null;
    const attackLevel = Number(this.attack?.level ?? this.sourceAttack?.level);
    return Number.isFinite(attackLevel) ? Math.trunc(attackLevel) : null;
  }

  _getMeleeCalculationOptions() {
    const location = this._getLocationResult();
    const precisionPenalty = this._getMeleeVisibilityRules()?.precisionPenalty &&
      location.selection?.zoneId !== "silhouette"
      ? this._getMeleeVisibilityRules().precisionPenalty : 0;
    const governing = this.targetedAttackContext?.specialtyOptions?.find(
      option => option.value === this.fireState.governingSpecialty);
    return {
      actor: this.actor,
      attack: this.attack,
      attackSlot: this._attackSlots[this._activeAttackSlot]?.type ?? null,
      governingSkill: this.attack?.unarmedRef ? this.attack.meleeProfile?.skill : this.attack?.standaloneRef?.governingSkill ?? this.attack?.equipmentRef?.governingSkill ?? (governing ? { name: governing.label, level: governing.level } : null),
      baseSkill: this._getBaseSkillLevel(),
      weaponBond: !this.attack?.unarmedRef && getMeleeAttackSettings(this._meleeState, this.sourceAttack).weaponBond === true,
      manualModifier: this.fireState.manualModifier,
      evaluate: this.fireState.evaluate,
      moveAndAttack: this.fireState.moveAndAttack,
      allOutAttack: this.fireState.allOutAttack,
      allOutAttackMode: this.fireState.allOutAttackMode,
      deceptiveAttack: this.fireState.deceptiveAttack,
      telegraphicAttack: this.fireState.telegraphicAttack,
      committedAttack: this.fireState.committedAttack,
      committedMode: this.fireState.committedMode,
      committedSteps: this.fireState.committedSteps,
      hitLocationPenalty: location.penalty,
      hitLocationBasePenalty: location.selection?.penalty ?? 0,
      hitLocationLabel: "Зона попадания: " + (location.selection?.label ?? ""),
      targetedAttack: location.targetedAttack,
      precisionPenalty,
      rapidStrikePenalty: this._getRapidStrikePenalty(),
      visibilityPenalty: this._getMeleeVisibilityRules()?.penalty ?? 0,
      visibilityCap: this._getMeleeVisibilityRules()?.cap ?? false
    };
  }

  _normalizeManeuverState() {
    if (!["determined", "strong", "double"].includes(this.fireState.allOutAttackMode)) {
      this.fireState.allOutAttackMode = "determined";
    }
    if (!["determined", "strong"].includes(this.fireState.committedMode)) {
      this.fireState.committedMode = "determined";
    }
    if (this.fireState.rapidStrike) this.fireState.moveAndAttack = false;
    if (this.fireState.moveAndAttack) {
      this.fireState.allOutAttack = false;
      this.fireState.committedAttack = false;
      this.fireState.defensiveAttack = false;
      this.fireState.deceptiveAttack = "0";
    } else if (this.fireState.allOutAttack) {
      this.fireState.committedAttack = false;
      this.fireState.defensiveAttack = false;
    } else if (this.fireState.committedAttack) {
      this.fireState.defensiveAttack = false;
    }
    if (this.fireState.telegraphicAttack) this.fireState.deceptiveAttack = "0";
    const options = this._getMeleeCalculationOptions();
    const beforeDeceptive = calculateMeleeSkillBeforeDeceptive(options);
    const deceptive = normalizeDeceptiveAttackPenalty(
      this.fireState.deceptiveAttack,
      beforeDeceptive,
      this.fireState.moveAndAttack,
      this.fireState.telegraphicAttack
    );
    this.fireState.deceptiveAttack = String(deceptive);
    const calculation = resolveMeleeCombatCalculation({ ...options, deceptiveAttack: deceptive });
    this._saveActiveAttackConfiguration();
    return {
      beforeDeceptive,
      deceptive,
      defensePenalty: getDeceptiveDefensePenalty(deceptive),
      defenseModifier: calculation?.metadata.defenseModifier ??
        getDeceptiveDefensePenalty(deceptive) + (this.fireState.telegraphicAttack ? 2 : 0),
      maximum: getMaximumDeceptiveAttackPenalty(beforeDeceptive,
        this.fireState.moveAndAttack, this.fireState.telegraphicAttack)
    };
  }

  _buildDeceptiveOptions(selected = this.fireState.deceptiveAttack) {
    const maneuver = this._normalizeManeuverState();
    const selectedValue = Number(selected);
    const options = [];
    for (let penalty = 0; penalty <= maneuver.maximum; penalty += 2) {
      const value = -penalty;
      options.push('<option value="' + value + '" ' +
        (value === selectedValue || value === maneuver.deceptive ? "selected" : "") + '>' +
        (value === 0 ? "0" : String(value)) + '</option>');
    }
    return options.join("");
  }

  _calculateEffectiveSkill() {
    this._normalizeManeuverState();
    return calculateMeleeEffectiveSkill(this._getMeleeCalculationOptions());
  }

  _buildAttackModifierDetails(_locationResult, _maneuver, effectiveSkill, calculation = null) {
    calculation ??= resolveMeleeCombatCalculation(this._getMeleeCalculationOptions());
    const details = calculation?.modifiers.filter(entry => entry.value !== 0)
      .map(entry => ({ label: entry.explanation || entry.label, value: entry.value })) ?? [];
    const sourceLevel = Number(this.sourceAttack?.level ?? this.sourceAttack?.import);
    const adjustment = Number.isFinite(sourceLevel) && calculation
      ? calculation.baseSkill - sourceLevel : 0;
    if (adjustment) details.unshift({ label: "Поправка уровня выбранной атаки", value: adjustment });
    const described = details.reduce((total, entry) => total + Number(entry.value), 0);
    const expected = Number(effectiveSkill) - (Number.isFinite(sourceLevel) ? sourceLevel : calculation?.baseSkill ?? 0);
    if (Number.isFinite(expected) && expected !== described)
      details.push({ label: "Поправка броска", value: expected - described });
    return details;
  }

  _buildAttackStats(damage = this._effectiveDamage?.formula ?? this.attack?.damage) {
    const values = [
      meleeOutcomeLabel(this.attack,damage),
      "Reach " + (this.attack?.reach || "-"),
      "Parry " + (this.attack?.parry || "-")
    ];
    const resource=utMeleeResourceLabel(this.actor,this.attack);
    if(resource)values.push(resource);
    const unarmed=this.attack?.meleeProfile?.unarmed;
    if(unarmed)values.push(unarmed.alreadyIncluded?'Исходный Damage GGA':unarmed.manualDamage?'Ручной Damage':unarmed.selectedSkill+' +'+unarmed.bonusPerDie+'/куб thrust'+(unarmed.naturalPerDie?' · естественное оружие +'+unarmed.naturalPerDie+'/куб':''));
    return values.join(" · ");
  }

  _buildGoverningSkillSelector(fireState = this.fireState) {
    this._refreshStandaloneAttack();
    return meleeCombatControlsHTML(meleeCombatControls(this.actor, this.sourceAttack,{attacks:this.sourceAttacks}), {
      mastery: fireState.rapidStrikeMastery, visibility: !!this.visibility,
      ...(!this.attack?.unarmedRef&&!this.attack?.standaloneRef&&!this.attack?.equipmentRef?.virtual?{governingSkills:this.targetedAttackContext?.specialtyOptions??[],
        governingSpecialty:fireState.governingSpecialty}:{})
    }, escapeHTML);
  }
  _getDefensiveContext() {
    return defensiveAttackContext(this.attack);
  }

  _buildMartialArtsOptions(fireState = this.fireState) {
    const defense=this._getDefensiveContext();
    return `<div class="gam-melee-martial-options">
      <div class="gam-melee-martial-row">
        <label><input type="checkbox" name="telegraphicAttack" ${fireState.telegraphicAttack ? "checked" : ""}>Telegraphic Attack</label>
        <span class="gam-melee-martial-help" title="${escapeHTML(MARTIAL_ARTS_HINTS.telegraphic)}" aria-label="${escapeHTML(MARTIAL_ARTS_HINTS.telegraphic)}">(?)</span>
        <small data-telegraphic-note ${fireState.telegraphicAttack ? "" : "hidden"}>\u0417\u0430\u0449\u0438\u0442\u0430 \u0446\u0435\u043b\u0438: +2</small>
      </div>
      <div class="gam-melee-martial-row">
        <label><input type="checkbox" name="committedAttack" ${fireState.committedAttack ? "checked" : ""}>Committed Attack</label>
        <span class="gam-melee-martial-help" title="${escapeHTML(meleeMartialText('strongHint'))}" aria-label="${escapeHTML(meleeMartialText('strongHint'))}">(?)</span>
        <span class="gam-melee-martial-detail" data-committed-detail ${fireState.committedAttack ? "" : "hidden"}>
          <select name="committedMode" aria-label="Режим решительной атаки">
            <option value="determined" ${fireState.committedMode === "determined" ? "selected" : ""}>Точная</option>
            <option value="strong" ${fireState.committedMode === "strong" ? "selected" : ""}>Сильная</option>
          </select>
          <label><input type="checkbox" name="committedSteps" ${fireState.committedSteps ? "checked" : ""}>2 \u0448\u0430\u0433\u0430 (-2)</label>
        </span>
        <small data-committed-note ${fireState.committedAttack ? "" : "hidden"}>\u0417\u0430\u0449\u0438\u0442\u044b: -2; Retreat \u043d\u0435\u043b\u044c\u0437\u044f.</small>
      </div>
      <div class="gam-melee-martial-row">
        <label><input type="checkbox" name="defensiveAttack" ${fireState.defensiveAttack ? "checked" : ""}>Defensive Attack</label>
        <span class="gam-melee-martial-help" data-defensive-help data-tooltip="${escapeHTML(defense.hint)}" data-tooltip-class="gam-melee-defensive-hint" aria-label="${escapeHTML(defense.hint)}">(?)</span>
      </div>
    </div>`;
  }

  _buildAttackOptions() {
    const groups=meleePhysicalAttackGroups(this._visibleAttacks(),this.selectedAttackKey,this.actor),entries=this._visibilityEntries();
    return groups.map(({attack})=>'<option value="'+escapeHTML(attack.key)+'" '+(attack.key===this.selectedAttackKey?'selected':'')+'>'+escapeHTML(entries.find(e=>e.source.key===attack.key)?.label||attack.name||attack.label)+'</option>').join('');
  }

  _visibilityEntries() { return meleeVisibilityEntries(this.actor, this.sourceAttacks); }
  _visibilityEntry() { return this._visibilityEntries().find(e => e.source.key === this.selectedAttackKey); }
  _visibleAttacks() { return this.weaponVisibility ? this.weaponVisibility.visible(this._visibilityEntries()).map(e => e.source) : this.sourceAttacks; }
  async _refreshVisibleWeapons() {
    const next = this._visibleAttacks();
    if (!next.some(a => a.key === this.selectedAttackKey)) {
      if (next[0]) await this._selectAttack(next[0].key, {persistSelection:false});
      else { this.selectedAttackKey = ''; this._effectiveDamage = null; this._damagePreviewRevision += 1; }
    }
    if (this.rendered && !this._visibilityClosed) await this.render({force:true});
  }
  _onRender(context, options) {
    super._onRender(context, options);
    if (this._weaponVisibilityHook == null && globalThis.Hooks?.on) this._weaponVisibilityHook = Hooks.on('updateUser', (user, changes) => {
      if (user.id === game.user.id && changes.flags?.['olegurps-qol']?.weaponListVisibility && this.rendered && !this._visibilityBusy && !this._visibilityClosed)
        {this.sourceAttacks=collectMeleeAttacks(this.actor);void this._refreshVisibleWeapons();}
    });
  }

  _buildContent(fireState) {
    if (!this._visibleAttacks().length) return `<div class="gam-fire-preparation gam-melee-preparation"><p>${visibilityText('EmptyMelee')}</p>${hiddenWeaponsHTML(this.weaponVisibility,this._visibilityEntries(),'melee','data-melee-action')}<button type="button" data-melee-action="standalone-library" aria-label="${visibilityText('AddToList')}">+</button></div>`;
    const skillPreview = this._getSkillPreview();
    const baseSkill = this._getBaseSkillLevel();
    const baseSkillText = Number.isFinite(baseSkill) ? String(baseSkill) : "-";
    const maneuver = this._normalizeManeuverState();
    const deceptiveOptions = this._buildDeceptiveOptions(maneuver.deceptive);
    const defenseText = fireState.telegraphicAttack ? "\u0417\u0430\u0449\u0438\u0442\u0430 \u0446\u0435\u043b\u0438: +2"
      : maneuver.defensePenalty === 0 ? "\u0437\u0430\u0449\u0438\u0442\u0430 0" : "\u0437\u0430\u0449\u0438\u0442\u0430 " + maneuver.defensePenalty;
    const attackStats = this._buildAttackStats();
    return `
      <div class="gam-fire-preparation gam-melee-preparation">
        <div class="gam-fire-summary gam-melee-summary">
          <div class="gam-fire-summary-main">
            <div class="gam-melee-attack-row">
              <select name="meleeAttackKey" class="gam-melee-attack-select" aria-label="Melee attack">${this._buildAttackOptions()}</select>
              <button type="button" class="gam-melee-icon-button" data-melee-action="hide-weapon" title="${visibilityText(this._visibilityEntry()?.id ? 'Hide' : 'NoIdentity')}" aria-label="${visibilityText('Hide')}" ${this._visibilityEntry()?.id ? '' : 'disabled'}><i class="fa-solid fa-eye-slash"></i></button>
              <button type="button" class="gam-melee-icon-button" data-melee-action="edit" title="Редактировать параметры" aria-label="Редактировать параметры"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="gam-melee-icon-button" data-melee-action="strength" title="Временные поправки силы">ST</button>
              <button type="button" class="gam-melee-icon-button" data-melee-action="standalone-library" title="Добавить оружие из библиотеки" aria-label="Добавить оружие из библиотеки">+</button>
              <button type="button" class="gam-melee-damage-button" data-melee-action="damage"><i class="fa-solid fa-burst"></i> Урон</button>
              <label class="gam-melee-dice-adds" title="Преобразование кубиков и прибавок, Basic Set, стр. 269">
                <input type="checkbox" name="dicePlusAdds" ${fireState.dicePlusAdds ? "checked" : ""}>
                <span>Dices&amp;Adds</span>
              </label>
            </div>
            ${hiddenWeaponsHTML(this.weaponVisibility, this._visibilityEntries(), 'melee', 'data-melee-action')}
            <p class="gam-fire-attack-stats" data-melee-attack-meta title="${escapeHTML(attackStats)}">${escapeHTML(attackStats)}</p>
            <div data-melee-governing>${this._buildGoverningSkillSelector(fireState)}</div>
          </div>
          <div class="gam-fire-skill" aria-live="polite">
            <span class="gam-fire-skill-label">Эффективное умение</span>
            <strong class="gam-fire-skill-value" data-skill-preview>${skillPreview.level} (${skillPreview.chance}%)</strong>
            <span class="gam-fire-source-skill">Значение умения: <span data-melee-base-skill>${baseSkillText}</span></span>
          </div>
        </div>
        ${this._buildVisibilityContent()}
        <div class="gam-fire-layout">
          <div class="gam-fire-left gam-melee-left">
            <div class="gam-fire-fields gam-melee-fields">
              <label class="gam-fire-field gam-melee-manual">
                <span>Бонусы/штрафы</span>
                <input type="number" name="manualModifier" value="${escapeHTML(fireState.manualModifier)}" placeholder="0" step="1">
              </label>
              <div class="gam-fire-field gam-fire-field-checkbox gam-melee-move">
                <span>Движение и атака</span>
                <input type="checkbox" name="moveAndAttack" aria-label="Движение и атака" ${fireState.moveAndAttack ? "checked" : ""} ${fireState.rapidStrike ? "disabled" : ""}>
              </div>
              <div class="gam-fire-field gam-melee-rapid-strike">
                <label class="gam-melee-maneuver-toggle">
                  <input type="checkbox" name="rapidStrike" aria-label="Rapid Strike" ${fireState.rapidStrike ? "checked" : ""}>
                  <span>Rapid Strike</span>
                </label>
              </div>
              <div class="gam-attack-slots gam-melee-attack-slots" data-melee-attack-slots></div>
              <div class="gam-fire-field gam-melee-all-out">
                <span class="gam-melee-all-out-controls">
                  <label class="gam-melee-maneuver-toggle">
                  <input type="checkbox" name="allOutAttack" aria-label="Тотальная атака" ${fireState.allOutAttack ? "checked" : ""}>
                  <span>Тотальная атака</span></label>
                  <select name="allOutAttackMode" aria-label="Вариант тотальной атаки" ${fireState.allOutAttack ? "" : "disabled"}>
                    <option value="determined" ${fireState.allOutAttackMode === "determined" ? "selected" : ""}>Точная</option>
                    <option value="strong" ${fireState.allOutAttackMode === "strong" ? "selected" : ""}>Сильная</option>
                    <option value="double" ${fireState.allOutAttackMode === "double" ? "selected" : ""}>Двойная</option>
                  </select>
                </span>
              </div>
              ${this._buildMartialArtsOptions(fireState)}
              <label class="gam-fire-field gam-melee-deceptive">
                <span>Обманная атака</span>
                <span class="gam-melee-deceptive-controls">
                  <select name="deceptiveAttack" aria-label="Штраф обманной атаки" ${fireState.moveAndAttack || fireState.telegraphicAttack || maneuver.maximum === 0 ? "disabled" : ""}>
                    ${deceptiveOptions}
                  </select>
                  <small data-deceptive-defense>${defenseText}</small>
                </span>
              </label>
              <label class="gam-fire-aim gam-melee-evaluate">
                <span>Оценка:</span>
                <input type="number" name="evaluate" value="${escapeHTML(fireState.evaluate)}" ${fireState.telegraphicAttack ? "disabled" : ""} placeholder="0" min="0" step="1" inputmode="numeric" aria-label="Последовательные маневры Оценка">
                <span>ход.</span>
              </label>
            </div>
          </div>
          ${this._buildHitLocationContent(fireState)}
        </div>
        <div class="gam-fire-actions">
          <button type="button" data-melee-action="confirm"><i class="fa-solid fa-sword"></i> Выполнить атаку</button>
          <button type="button" data-melee-action="cancel"><i class="fa-solid fa-xmark"></i> Отмена</button>
        </div>
      </div>
    `;
  }

  _getStatusEvaluateTurns() {
    return getEvaluateStatusTurns(this.token?.actor ?? this.actor);
  }

  _syncEvaluateStatusEffect() {
    const turns = this._getStatusEvaluateTurns();
    if (turns === this._lastEvaluateStatusTurns) return;
    this._lastEvaluateStatusTurns = turns;
    if (this._evaluateManuallyEdited) return;
    const value = turns ? String(turns) : "";
    this.fireState.evaluate = value;
    const input = this.element?.querySelector('[name="evaluate"]');
    if (input) input.value = value;
    this._updateMeleePreview();
  }

  _registerTargetHook() {}

  _onActorUpdate(updated, changes) {
    if (!sameStrengthActor(updated,this.actor)) return;
    if (isAmmunitionHistoryOnlyUpdate(changes)) return;
    if(isStrengthUpdate(changes)){void this._updateEffectiveDamagePreview();return;}
    this._captureFields();
    this.sourceAttacks = collectMeleeAttacks(this.actor);
    if (!this._visibleAttacks().some(a => a.key === this.selectedAttackKey)) {
      if (this.rendered) void this._refreshVisibleWeapons();
      return;
    }
    this.sourceAttack = this.sourceAttacks.find(a=>a.key===this.selectedAttackKey);
    this._refreshStandaloneAttack();
    this.targetedAttackContext = createMeleeTargetedAttackContext({actor:this.actor,attack:this.attack});
    if(this.rendered)void this.render();
  }

  _updateTargetRecommendation() {
    this._updateSkillPreview();
    void this._updateEffectiveDamagePreview();
  }

  _updateRapidFirePreview() {}

  _updateMeleePreview() {
    this._refreshStandaloneAttack();
    const maneuver = this._normalizeManeuverState();
    const evaluateInput = this.element?.querySelector('[name="evaluate"]');
    if (evaluateInput) evaluateInput.disabled = !!this.fireState.telegraphicAttack;
    const base = this.element?.querySelector("[data-melee-base-skill]");
    const baseSkill = this._getBaseSkillLevel();
    if (base) base.textContent = Number.isFinite(baseSkill) ? String(baseSkill) : "-";

    const manual = this.element?.querySelector('[name="manualModifier"]');
    if (manual) manual.value = this.fireState.manualModifier;
    const move = this.element?.querySelector('[name="moveAndAttack"]');
    if (move) {
      move.checked = !!this.fireState.moveAndAttack;
      move.disabled = !!this.fireState.rapidStrike;
    }
    const mastery = this.element?.querySelector('[name="rapidStrikeMastery"]');
    if (mastery) mastery.checked = !!this.fireState.rapidStrikeMastery;
    const rapid = this.element?.querySelector('[name="rapidStrike"]');
    if (rapid) rapid.checked = !!this.fireState.rapidStrike;
    this._updateAttackSlotControls();
    const allOut = this.element?.querySelector('[name="allOutAttack"]');
    if (allOut) allOut.checked = !!this.fireState.allOutAttack;
    const allOutMode = this.element?.querySelector('[name="allOutAttackMode"]');
    if (allOutMode) {
      allOutMode.value = this.fireState.allOutAttackMode;
      allOutMode.disabled = !this.fireState.allOutAttack;
    }
    const telegraphic = this.element?.querySelector('[name="telegraphicAttack"]');
    if (telegraphic) telegraphic.checked = !!this.fireState.telegraphicAttack;
    const telegraphicNote = this.element?.querySelector('[data-telegraphic-note]');
    if (telegraphicNote) telegraphicNote.hidden = !this.fireState.telegraphicAttack;
    const committed = this.element?.querySelector('[name="committedAttack"]');
    if (committed) committed.checked = !!this.fireState.committedAttack;
    const committedDetail = this.element?.querySelector('[data-committed-detail]');
    if (committedDetail) committedDetail.hidden = !this.fireState.committedAttack;
    const committedNote = this.element?.querySelector('[data-committed-note]');
    if (committedNote) committedNote.hidden = !this.fireState.committedAttack;
    const committedMode = this.element?.querySelector('[name="committedMode"]');
    if (committedMode) committedMode.value = this.fireState.committedMode;
    const committedSteps = this.element?.querySelector('[name="committedSteps"]');
    if (committedSteps) committedSteps.checked = !!this.fireState.committedSteps;
    const defensive = this.element?.querySelector('[name="defensiveAttack"]');
    if (defensive) defensive.checked = !!this.fireState.defensiveAttack;
    const defensiveHelp=this.element?.querySelector('[data-defensive-help]');
    if(defensiveHelp){const hint=this._getDefensiveContext().hint;defensiveHelp.dataset.tooltip=hint;defensiveHelp.setAttribute('aria-label',hint);}
    const deceptive = this.element?.querySelector('[name="deceptiveAttack"]');
    if (deceptive) {
      deceptive.innerHTML = this._buildDeceptiveOptions(maneuver.deceptive);
      deceptive.value = String(maneuver.deceptive);
      deceptive.disabled = !!this.fireState.moveAndAttack ||
        !!this.fireState.telegraphicAttack || maneuver.maximum === 0;
    }
    const defense = this.element?.querySelector("[data-deceptive-defense]");
    if (defense) defense.textContent = this.fireState.telegraphicAttack
      ? "\u0417\u0430\u0449\u0438\u0442\u0430 \u0446\u0435\u043b\u0438: +2"
      : maneuver.defensePenalty === 0 ? "\u0437\u0430\u0449\u0438\u0442\u0430 0"
        : "\u0437\u0430\u0449\u0438\u0442\u0430 " + maneuver.defensePenalty;
    this._updateSkillPreview();
    void this._updateEffectiveDamagePreview();
  }

  _updateAttackSlotControls() {
    const root = this.element?.querySelector("[data-melee-attack-slots]");
    if (!root) return;
    root.hidden = this._attackSlots.length < 2;
    root.innerHTML = this._attackSlots.map((slot, index) =>
      `<button type="button" data-melee-action="attack-slot" data-attack-slot="${index}"
        class="gam-attack-slot gam-melee-rapid-attack gam-rapid-attack-${index + 1} ${index === this._activeAttackSlot ? "is-active" : ""}"
        aria-pressed="${index === this._activeAttackSlot}">${escapeHTML(slot.label)}</button>`
    ).join("");
  }

  _getEffectiveDamageOptions() {
    this._refreshStandaloneAttack();
    return {
      actor: this.actor,
      attack: this.attack,
      dicePlusAdds: this.fireState.dicePlusAdds,
      allOutStrong: this.fireState.allOutAttack && this.fireState.allOutAttackMode === "strong",
      committedStrong: this.fireState.committedAttack && this.fireState.committedMode === "strong" && committedStrongEligible(this.attack),
      defensiveAttack: this.fireState.defensiveAttack
    };
  }

  async _prepareEffectiveDamage() {
    return prepareEffectiveMeleeDamage(this._getEffectiveDamageOptions());
  }

  _showEffectiveDamage(preparedDamage,reason='Формула урона не определена') {
    const resourceReason=utMeleeResourceReason(this.actor,this.attack);
    const confirm=this.element?.querySelector('[data-melee-action="confirm"]');
    if(confirm){confirm.disabled=!!resourceReason||this.attack?.meleeProfile?.utExotic?.contactProcedure===true;confirm.title=resourceReason??(this.attack?.meleeProfile?.utExotic?.contactProcedure?'Подтвердите контакт в редакторе экземпляра.':'');}
    this._effectiveDamage = preparedDamage;
    const button=this.element?.querySelector('[data-melee-action="damage"]');
    if(button){button.disabled=!preparedDamage;button.title=preparedDamage?'Бросить текущий урон':reason;}
    const meta = this.element?.querySelector("[data-melee-attack-meta]");
    if (!meta) return;
    const text = this._buildAttackStats(preparedDamage?.formula ?? reason);
    meta.textContent = text;
    meta.title = text;
  }

  async _updateEffectiveDamagePreview() {
    if (!this.selectedAttackKey || !this._visibleAttacks().some(a=>a.key===this.selectedAttackKey)) return;
    const revision = ++this._damagePreviewRevision;
    try {
      const preparedDamage = await this._prepareEffectiveDamage();
      if (revision === this._damagePreviewRevision) this._showEffectiveDamage(preparedDamage);
    } catch (error) {
      if (revision === this._damagePreviewRevision) {
        this._showEffectiveDamage(null,error.message);
        console.warn("Помощник ближнего боя damage preview:", error);
      }
    }
  }

  async _persistState() {
    const snapshot = normalizeMeleeAssistantState(this._meleeState);
    const save = this._stateSaveQueue
      .catch(() => null)
      .then(() => this.stateService.save(snapshot));
    this._stateSaveQueue = save;
    await save;
  }

  async _persistCurrentPreferences() {
    if (!this.selectedAttackKey) return;
    const settings = getMeleeAttackSettings(this._meleeState, this.sourceAttack);
    let changed = false;
    if (JSON.stringify(settings.visibility ?? null) !== JSON.stringify(normalizeVisibility(this.visibility))) {
      setMeleeVisibility(this._meleeState, this.sourceAttack, this.visibility);
      changed = true;
    }
    if ((settings.governingSkill ?? "") !== this.fireState.governingSpecialty) {
      setMeleeGoverningSkill(this._meleeState, this.sourceAttack, this.fireState.governingSpecialty);
      changed = true;
    }
    if ((settings.rapidStrikeMastery === true) !== (this.fireState.rapidStrikeMastery === true)) {
      setMeleeRapidStrikeMastery(this._meleeState, this.sourceAttack, this.fireState.rapidStrikeMastery);
      changed = true;
    }
    if (this._meleeState.dicePlusAdds !== (this.fireState.dicePlusAdds === true)) {
      setMeleeDicePlusAdds(this._meleeState, this.fireState.dicePlusAdds);
      changed = true;
    }
    if (changed) await this._persistState();
  }

  async close(options = {}) {
    this._visibilityClosed = true;
    if (this._weaponVisibilityHook != null) { Hooks.off('updateUser',this._weaponVisibilityHook); this._weaponVisibilityHook = null; }
    this._captureFields();
    try {
      await this._persistCurrentPreferences();
      await this._stateSaveQueue;
    } catch (error) {
      console.error("Помощник ближнего боя state save:", error);
    }
    return super.close(options);
  }

  async _selectAttack(key, {persistSelection = true} = {}) {
    this.sourceAttacks = [...this.sourceAttacks.filter(a => !a.standaloneRef), ...listStandaloneAttacks(this.actor, "melee")];
    this._captureFields();
    const sourceAttack = this._visibleAttacks().find(entry => entry.key === key);
    if (!sourceAttack || sourceAttack.key === this.selectedAttackKey) return;
    // Personal list filtering selects a visible row locally; it must not save Actor state.
    if (persistSelection) await this._persistCurrentPreferences();
    if (persistSelection && this.selectedAttackKey && sourceAttack.standaloneRef &&
        this.sourceAttack?.standaloneRef?.weaponId === sourceAttack.standaloneRef.weaponId &&
        this.sourceAttack.standaloneRef.modeId !== sourceAttack.standaloneRef.modeId)
      await selectMeleeCombatMode(this.actor, sourceAttack);
    this.selectedAttackKey = sourceAttack.key;
    this.sourceAttack = sourceAttack;
    this.attack = applyMeleeAttackOverride(sourceAttack, this._meleeState,this.actor);
    this._effectiveDamage = null;
    this._damagePreviewRevision += 1;
    this.targetedAttackContext = createMeleeTargetedAttackContext({ actor: this.actor, attack: this.attack });
    const attackSettings = getMeleeAttackSettings(this._meleeState, sourceAttack);
    this.visibility = normalizeVisibility(attackSettings.visibility);
    const saved = attackSettings.governingSkill ?? "";
    this.fireState.governingSpecialty = this._resolveGoverningSkill(saved);
    this.fireState.rapidStrikeMastery = attackSettings.rapidStrikeMastery === true;
    if (persistSelection) {
      setSelectedMeleeAttack(this._meleeState, sourceAttack);
      if (saved && this.fireState.governingSpecialty !== saved) {
        setMeleeGoverningSkill(this._meleeState, sourceAttack, "");
      }
      await this._persistState();
    }

    const service = await TargetingService.create({ attack: this.attack, bodyplan: this.fireState.bodyplanId });
    this.targetingService = service;
    this._targetingServices = new Map([[service.bodyplan, service]]);
    this._normalizeAttackConfigurationLocations();
    this._applyAttackConfiguration(this._attackSlotStates[this._activeAttackSlot]);

    const meta = this.element?.querySelector("[data-melee-attack-meta]");
    if (meta) {
      meta.textContent = this._buildAttackStats();
      meta.title = this._buildAttackStats();
    }
    const governing = this.element?.querySelector("[data-melee-governing]");
    const attackSelector=this.element?.querySelector('[name="meleeAttackKey"]');
    if(attackSelector)attackSelector.innerHTML=this._buildAttackOptions();
    if (governing) governing.innerHTML = this._buildGoverningSkillSelector(this.fireState);
    const targeting = this.element?.querySelector(".gam-fire-targeting");
    if (targeting) targeting.outerHTML = this._buildHitLocationContent(this.fireState);
    this._updateMeleePreview();
  }

  async _editAttack() {
    if(this.attack?.standaloneRef?.modeId===HT_TEAR_SPRAY_MODE){
      await openStandaloneWeaponLibrary({actor:this.actor,type:'melee'});
      const key=this.selectedAttackKey;this.selectedAttackKey='';await this._selectAttack(key);return;
    }
    const result = await openMeleeAttackEditor({
      DialogV2: foundry.applications.api.DialogV2,
      actor: this.actor,
      attack: this.attack,
      escapeHTML,
      manualAttack:applyMeleeAttackOverride(this.sourceAttack,this._meleeState),
      weaponBond: getMeleeAttackSettings(this._meleeState, this.sourceAttack).weaponBond === true
    });
    if (!result) return;
    if (result.action === "reset") {
      if(result.profileContext)await new MeleeProfileService(this.actor).reset(this.sourceAttack,{expectedRevision:result.profileRevision});
      clearMeleeAttackOverride(this._meleeState, this.sourceAttack);
    } else if (result.action === "save") {
      const candidate=result.manualChanged?{...this.sourceAttack,...result.value,
        hasMeleeDamageOverride:result.value.damage!==this.sourceAttack.damage,
        meleeManualOverride:{skillLevel:result.value.skillLevel,parry:result.value.parry}}:
        applyMeleeAttackOverride(this.sourceAttack,this._meleeState);
      if(result.profileSelection)await new MeleeProfileService(this.actor).save(candidate,result.profileSelection,
        {context:result.profileContext,expectedRevision:result.profileRevision});
      const current = { skillLevel: Number(this.attack.level),
        damage: String(this.attack.damage ?? "").trim(),
        reach: String(this.attack.reach ?? "").trim(),
        parry: String(this.attack.parry ?? "").trim() };
      const modelChanged=result.value.damageModel&&JSON.stringify(this.attack.damageModel??inferMeleeDamageModel(this.attack.damage))!==JSON.stringify(result.value.damageModel);
      if ((!result.profileSelection||result.manualChanged)&&(Object.keys(current).some(key => current[key] !== result.value[key])||modelChanged||
        (this.attack.applyArmST===true)!==(result.value.applyArmST===true))) {
        setMeleeAttackOverride(this._meleeState, this.sourceAttack, result.value);
      }
      if(!this.attack.standaloneRef)setMeleeWeaponBond(this._meleeState, this.sourceAttack, result.weaponBond);
      else if(result.weaponBond!==getMeleeAttackSettings(this._meleeState,this.sourceAttack).weaponBond){
        const catalogs=globalThis.OleGURPSQOL?.catalogs,service=new StandaloneWeaponService(this.actor,catalogs);
        const existing=service.get(this.attack.standaloneRef.weaponId);
        const draft=new StandaloneWeaponDraft({actor:this.actor,catalogs,type:'melee',existing});
        draft.weaponBond=result.weaponBond;draft.weaponBondChanged=true;await service.save(draft);
      }
    }
    await this._persistState();
    const currentKey = this.selectedAttackKey;
    this.selectedAttackKey = "";
    await this._selectAttack(currentKey);
  }

  async _rollDamage(button) {
    this._captureFields();
    this._normalizeManeuverState();
    button.disabled = true;
    try {
      const preparedDamage = await this._prepareEffectiveDamage();
      if (!preparedDamage) throw new Error("Формула урона выбранной melee-атаки не распознана GGA.");
      this._damagePreviewRevision += 1;
      this._showEffectiveDamage(preparedDamage);
      await executeNativeMeleeDamage({
        ...this._getEffectiveDamageOptions(),
        preparedDamage
      });
    } catch (error) {
      console.error("Помощник ближнего боя damage:", error);
      ui.notifications.error(moduleMessage(error));
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  _getManeuverPayload() {
    if (this.fireState.allOutAttack) {
      return { type: "allOutAttack", option: this.fireState.allOutAttackMode };
    }
    if (this.fireState.moveAndAttack) return { type: "moveAndAttack" };
    if (this.fireState.committedAttack) return { type: "committedAttack",
      option: this.fireState.committedMode, steps: this.fireState.committedSteps };
    if (this.fireState.defensiveAttack) return {type:'defensiveAttack'};
    return { type: "attack" };
  }


  _createAttackSnapshots() {
    if (this.weaponVisibility && !this._visibleAttacks().some(a=>a.key===this.selectedAttackKey)) throw Error(visibilityText('Empty'));
    this._refreshStandaloneAttack();
    if (this.attack?.readinessReason) throw new Error(this.attack.readinessReason);
    this._saveActiveAttackConfiguration();
    const previousActive = this._activeAttackSlot;
    const snapshots = [];
    this._buildingAttackSnapshots=true;
    try {
      for (let index = 0; index < this._attackSlots.length; index += 1) {
        const slot = this._attackSlots[index];
        this._activeAttackSlot = index;
        this._applyAttackConfiguration(this._attackSlotStates[index]);
        const maneuverState = this._normalizeManeuverState();
        const locationResult = this._getLocationResult();
        const randomLocation = locationResult.selection?.random === true;
        const locationText = !randomLocation && locationResult.selection?.label && Number(locationResult.penalty) === 0
          ? "Зона попадания: " + locationResult.selection.label : "";
        const combatCalculation = resolveMeleeCombatCalculation(this._getMeleeCalculationOptions());
        const effectiveSkill = combatCalculation?.effectiveSkill;
        if (!Number.isFinite(effectiveSkill)) throw new Error("Effective skill is unavailable.");
        const telegraphicCriticalBonus = getTelegraphicCriticalBonus(this._getMeleeCalculationOptions());
        const martialNotes = [
          this.fireState.telegraphicAttack ? "\u0417\u0430\u0449\u0438\u0442\u0430 \u0446\u0435\u043b\u0438: +2" : "",
          this.fireState.committedAttack && this.fireState.committedMode === "strong"
            ? meleeMartialText(committedStrongEligible(this.attack)?'strongApplied':'strongUnchanged') : "",
          this.fireState.committedAttack
            ? "\u0417\u0430\u0449\u0438\u0442\u044b: -2; Retreat \u043d\u0435\u043b\u044c\u0437\u044f." : "",
        ].filter(Boolean);
        const sourceAttack = globalThis.foundry?.utils?.deepClone?.(this.sourceAttack) ?? structuredClone(this.sourceAttack);
        const blindFightingAttempt = this._getBlindFightingAttempt();
        snapshots.push({
          type: slot.type,
          label: slot.label,
          actor: this.actor,
          sourceAttack,
          damageOptions: this._getEffectiveDamageOptions(),
          skillCap: this.fireState.moveAndAttack || this._getMeleeVisibilityRules()?.cap ? 9 : null,
          selectedAttack: globalThis.foundry?.utils?.deepClone?.(this.attack) ?? structuredClone(this.attack),
          governingSkill: this.fireState.governingSpecialty,
          baseSkill: combatCalculation.baseSkill,
          effectiveSkill,
          combatCalculation,
          hitLocation: { ...(randomLocation ? locationResult.selection : this.fireState.hitLocation) },
          visibility: normalizeVisibility(this.visibility),
          blindFighting: blindFightingAttempt?.result ?? null,
          blindFightingAttempt,
          isBlindFightingCurrent: blindFightingAttempt
            ? () => this._getBlindFightingAttempt() === blindFightingAttempt : null,
          clearTargets: !!this._getMeleeVisibilityRules()?.random ||
            !!this.visibility?.blindFireHex || !!this.visibility?.hex,
          hitLocationLabel: locationResult.selection?.label ?? "",
          targetedAttack: locationResult.targetedAttack,
          deceptiveAttack: maneuverState.deceptive,
          telegraphicAttack: this.fireState.telegraphicAttack,
          telegraphicCriticalBonus,
          committedAttack: this.fireState.committedAttack,
          committedMode: this.fireState.committedMode,
          committedSteps: this.fireState.committedSteps,
          defensiveAttack: this.fireState.defensiveAttack,
          martialSummary: martialNotes.join("; "),
          manualModifier: this.fireState.manualModifier,
          damageData: { dicePlusAdds: this.fireState.dicePlusAdds,
            allOutStrong: this.fireState.allOutAttack && this.fireState.allOutAttackMode === "strong",
            committedStrong: this.fireState.committedAttack && this.fireState.committedMode === "strong" && committedStrongEligible(this.attack),
            defensiveAttack: this.fireState.defensiveAttack },
          rapidStrikePenalty: this._getRapidStrikePenalty(),
          locationText,
          overrideText: [this._attackSlots.length > 1 ? slot.label : "", locationText,
            ...martialNotes].filter(Boolean).join("<br>"),
          modifierDetails: this._buildAttackModifierDetails(locationResult, maneuverState, effectiveSkill, combatCalculation),
          randomLocation,
          targetingService: this.targetingService,
          maneuver: this._getManeuverPayload(),
          deceptiveDefensePenalty: maneuverState.defenseModifier
        });
      }
    } finally {
      this._buildingAttackSnapshots=false;
      this._activeAttackSlot = previousActive;
      this._applyAttackConfiguration(this._attackSlotStates[previousActive]);
      this._refreshHitLocationContent();
      this._updateMeleePreview();
    }
    return snapshots;
  }

  _consumeBlindFighting() {
    this._blindFighting = null;
  }

  async _performAttack(button) {
    this._captureFields();
    const skills = this.targetedAttackContext?.specialtyOptions ?? [];
    if (skills.length && !this.fireState.governingSpecialty) {
      ui.notifications.warn("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 Основной навык \u0434\u043b\u044f \u044d\u0442\u043e\u0439 melee-\u0430\u0442\u0430\u043a\u0438.");
      return;
    }
    const visibility = this._getMeleeVisibilityRules();
    if (visibility?.random && this.visibility?.mode === "unseen" && !this._hasUnseenDirection()) {
      ui.notifications.warn("\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u0435\u043a\u0441.");
      return;
    }
    if (visibility?.random && this.visibility?.mode === "blind" &&
      !this.visibility.knownLocation && !this.visibility.hex) {
      ui.notifications.warn("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0435\u0434\u043f\u043e\u043b\u0430\u0433\u0430\u0435\u043c\u044b\u0439 \u0433\u0435\u043a\u0441.");
      return;
    }
    this._submitting = true;
    button.disabled = true;
    try {
      const snapshots = this._createAttackSnapshots();
      if (snapshots.length === 1) {
        await executeMeleeAttackSnapshot(snapshots[0]);
      } else {
        const app = new MeleeAttackExecutionApp({
          slots: snapshots,
          onClose: () => this._executionWindows.delete(app)
        }, { id: "olegurps-melee-attacks-" + foundry.utils.randomID() });
        this._executionWindows.add(app);
        try {
          await app.render({ force: true });
        } catch (error) { this._executionWindows.delete(app); throw error; }
      }
    } catch (error) {
      console.error("Помощник ближнего боя attack:", error);
      ui.notifications.error(moduleMessage(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updateMeleePreview();
    }
  }

  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!field) return;
    if (['governingSpecialty', 'meleePrimarySkill', 'meleeGrip', 'rapidStrikeMastery'].includes(field.name)) this._captureFields();
    if (field.name === "meleeVisibility") {
      await this.activateVisibility(field.checked ? { mode: "partial", partialPenalty: -1 } : null);
      this._blindFighting = null;
      this._saveActiveAttackConfiguration();
      await this._persistCurrentPreferences();
      return;
    }
    if (["visibilityMode", "partialPenalty", "accustomed", "manualHearing"].includes(field.name)) {
      if (field.name === "visibilityMode") this._blindFighting = null;
      await super._onInput(event);
      this._saveActiveAttackConfiguration();
      this._refreshHitLocationContent();
      this._updateMeleePreview();
      await this._persistCurrentPreferences();
      return;
    }
    if (field.name === "bodyplanId") {
      this._captureFields();
      await super._onInput(event);
      this._normalizeAttackConfigurationLocations({ reset: true });
      this._applyAttackConfiguration(this._attackSlotStates[this._activeAttackSlot]);
      this._refreshHitLocationContent();
      this._updateMeleePreview();
      return;
    }
    if (field.name === "meleeAttackKey") {
      if (event.type === "change") await this._selectAttack(field.value);
      return;
    }
    if (['meleePrimarySkill', 'meleeGrip','meleeNeuralSetting','meleeAttackMode'].includes(field.name)) {
      if (event.type !== 'change') return;
      this._captureFields();
      try {
        const raw = applyMeleeAttackOverride(this.sourceAttack, this._meleeState);
        if(field.name==='meleeAttackMode'&&meleeCombatControls(this.actor,raw,{attacks:this.sourceAttacks}).modeSelection==='attack')return this._selectAttack(field.value);
        await saveMeleeCombatControl(this.actor, raw, field.name === 'meleeGrip' ? 'grip' : field.name==='meleeAttackMode'?'modeId':field.name==='meleeNeuralSetting'?'neuralSetting':'skill', field.value);
        this._refreshStandaloneAttack();
        await this._persistCurrentPreferences();
        await this.render({ force: true });
        this._updateMeleePreview();
      } catch (error) {
        ui.notifications.error(moduleMessage(error));
        await this.render({ force: true });
      }
      return;
    }
    if (field.name === "governingSpecialty") {
      this.fireState.governingSpecialty = field.value;
      setMeleeGoverningSkill(this._meleeState, this.sourceAttack, field.value);
      await this._persistState();
      this._updateTargetedAttackPreview();
    } else if (field.name === "rapidStrikeMastery") {
      this.fireState.rapidStrikeMastery = field.checked;
      setMeleeRapidStrikeMastery(this._meleeState, this.sourceAttack, field.checked);
      await this._persistState();
    } else if (field.name === "manualModifier") {
      this.fireState.manualModifier = field.value;
    } else if (field.name === "evaluate") {
      const value = Number(String(field.value).replace(",", "."));
      if (field.value !== "" && (!Number.isInteger(value) || value < 0)) field.value = "0";
      this.fireState.evaluate = field.value;
      this._evaluateManuallyEdited = true;
    } else if (field.name === "moveAndAttack") {
      this.fireState.moveAndAttack = field.checked && !this.fireState.rapidStrike;
      if (this.fireState.moveAndAttack) {
        this.fireState.allOutAttack = false;
        this.fireState.committedAttack = false;
        this.fireState.defensiveAttack = false;
        this.fireState.deceptiveAttack = "0";
      }
      this._refreshAttackSlots();
    } else if (field.name === "rapidStrike") {
      this.fireState.rapidStrike = field.checked;
      if (field.checked) this.fireState.moveAndAttack = false;
      this._refreshAttackSlots();
    } else if (field.name === "allOutAttack") {
      this.fireState.allOutAttack = field.checked;
      if (field.checked) {
        this.fireState.moveAndAttack = false;
        this.fireState.committedAttack = false;
        this.fireState.defensiveAttack = false;
        if (!["determined", "strong", "double"].includes(this.fireState.allOutAttackMode)) {
          this.fireState.allOutAttackMode = "determined";
        }
      }
      this._refreshAttackSlots();
    } else if (field.name === "allOutAttackMode") {
      this.fireState.allOutAttackMode = ["determined", "strong", "double"].includes(field.value)
        ? field.value : "determined";
      this._refreshAttackSlots();
    } else if (field.name === "committedAttack") {
      this.fireState.committedAttack = field.checked;
      if (field.checked) {
        this.fireState.moveAndAttack = false;
        this.fireState.allOutAttack = false;
        this.fireState.defensiveAttack = false;
      }
      this._refreshAttackSlots();
    } else if (field.name === "committedMode") {
      this.fireState.committedMode = field.value === "strong" ? "strong" : "determined";
    } else if (field.name === "committedSteps") {
      this.fireState.committedSteps = field.checked;
    } else if (field.name === "defensiveAttack") {
      this.fireState.defensiveAttack = field.checked;
      if (field.checked) {
        this.fireState.moveAndAttack = false;
        this.fireState.allOutAttack = false;
        this.fireState.committedAttack = false;
      }
      this._refreshAttackSlots();
    } else if (field.name === "telegraphicAttack") {
      this.fireState.telegraphicAttack = field.checked;
      if (field.checked) this.fireState.deceptiveAttack = "0";
      this._saveActiveAttackConfiguration();
    } else if (field.name === "deceptiveAttack") {
      this.fireState.deceptiveAttack = field.value;
      if (Number(field.value) !== 0) this.fireState.telegraphicAttack = false;
    } else if (field.name === "dicePlusAdds") {
      this.fireState.dicePlusAdds = field.checked;
      setMeleeDicePlusAdds(this._meleeState, field.checked);
      await this._persistState();
    }
    this._updateMeleePreview();
  }

  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const hitControl = this._getHitControl(target);
    if (hitControl) {
      await super._onClick(event);
      this._updateMeleePreview();
      this._refreshHitLocationContent();
      return;
    }
    if (target?.closest("button[data-fire-action]")) {
      await super._onClick(event);
      this._refreshHitLocationContent();
      this._updateMeleePreview();
      return;
    }
    const button = target?.closest("button[data-melee-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.meleeAction;
    if (['hide-weapon','restore-weapon','restore-all-weapons'].includes(action)) {
      if (this._visibilityBusy) return;
      this._visibilityBusy = true; button.disabled = true;
      try {
        await this.weaponVisibility.change(action === 'hide-weapon' ? 'hide' : action === 'restore-weapon' ? 'restore' : 'restore-all',
          action === 'hide-weapon' ? this._visibilityEntry()?.id : action === 'restore-weapon' ? button.dataset.visibilityId : 'melee', () => this._visibilityEntries());
        if (!this._visibilityClosed) {
          await this._refreshVisibleWeapons();
        }
      } catch (error) { ui.notifications.error(moduleMessage(error)); }
      finally { this._visibilityBusy = false; if (button.isConnected) button.disabled = false; }
      return;
    }
    if (action === "strength") return openStrengthEditor(this.actor);
    if (action === "standalone-library") {
      await openStandaloneWeaponLibrary({actor:this.actor,type:'melee'});
      if(!this._visibilityClosed){this.sourceAttacks=collectMeleeAttacks(this.actor);await this._refreshVisibleWeapons();}
      return;
    }
    if (action === "blind-fighting") return this._checkBlindFighting(button);
    if (action === "cancel") return this.close();
    if (action === "attack-slot") return this._switchAttackSlot(button.dataset.attackSlot);
    if (action === "edit") return this._editAttack();
    if (action === "damage") return this._rollDamage(button);
    if (action === "confirm" && !this._submitting) return this._performAttack(button);
  }
}
