import {captureMeleeExecutionState,notifyMeleeExecutionError} from './melee-execution-state.js';
import {meleeTechniqueControls,readTechniqueContextField,meleeTechniqueExplanation,filterMeleeTechniquePicker,MELEE_TECHNIQUE_CSS} from './melee-technique-controls.js';
import {normalizeMeleeTechniques,meleeSkillFamily,isCleanTechniqueAttack,meleeAttackUsesHand,learnedMeleeSkills,readMeleePosture,techniqueIdentity,hasCombatTrait,cinematicTraining} from './melee-penalty-techniques.js';
import {getCombatRule,resolveCombatTechnique} from './combat-technique-registry.js';
import {validateDualWeaponSequence,resolveCombination,offHandAttackPenalty,physicalMeleeIdentity} from './melee-technique-sequences.js';
import {combatPerkLabel} from './ma-combat-perks.js';
import {attemptReverseGrip,acknowledgeTechniqueReady,assertMeleeTechniqueReady,advanceMeleeTechniqueTurn,initialCarvingProgress,executeMeleeSpecialCheck} from './melee-technique-procedures.js';
import {meleeSpecialRollPreviews} from './melee-service.js';
import {allowsCinematicTechniqueDefaults} from './combat-technique-preference.js';
import { allOutMeleeModes, expandedRapidStrikeCount, extraAttackRanks, maAttackApplicability, maOptionText, maProjectedAttack, maRapidStrikePenalty, maRussian, readShieldDefenseBonus } from './ma-combat-options.js';
import {generateId} from '../random-id.js';
import {readGgaShieldAttack} from './shield-equipment-adapter.js';
import {weaponWeightControls,openWeaponWeightEditor} from './weapon-weight-app.js';
import {setWeaponBackpack,readWeaponWeightState} from './weapon-weight.js';
import { moduleMessage, moduleText } from "../localization.js";
import {WeaponListVisibility, meleeVisibilityEntries, hiddenWeaponsHTML, visibilityText} from './weapon-list-visibility.js';
import { FirePreparationApp } from "./fire-preparation-app.js";
import { isAmmunitionHistoryOnlyUpdate } from './weapon-assistant-app.js';
import { getEvaluateStatusTurns } from "./aim-status-effects.js";
import { checkHearingMinusTwo, meleeVisibilityRules, normalizeVisibility } from "./limited-visibility.js";
import { TargetingService } from "./targeting-service.js";
import { MeleeAttackExecutionApp, executeMeleeAttackSnapshot } from "./melee-attack-execution-app.js";
import { orderedWhirlwindTargets,buildWhirlwindSlots } from './melee-strike-sequence.js';
import { getMeleeAttackSlots } from "./melee-attack-slots.js";
import {replaceFoundryTargets} from './foundry-targets.js';
import { createMeleeTargetedAttackContext } from "./targeted-attack-service.js";
import { openMeleeAttackEditor } from "./melee-attack-editor.js";
import { openStrengthEditor } from './strength-editor-app.js';
import { weaponStrengthExplanation } from './weapon-strength-display.js';
import { isStrengthUpdate, sameStrengthActor } from './strength-service.js';
import { openStandaloneWeaponLibrary } from "./standalone-weapon-configuration.js";
import { StandaloneWeaponDraft, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { HT_TEAR_SPRAY_MODE } from './biochemical-integration.js';
import { inferMeleeDamageModel } from './melee-damage-model.js';
import { committedStrongEligible, defensiveAttackContext, meleeMartialText } from './melee-martial-rules.js';
import {blindFightingContextKey} from './blind-fighting-context.js';
import {executeWithCapturedRollMessage} from './prepared-gga-roll.js';
import { MeleeProfileService,meleeProfileContext,meleeMartialGrips,resolveMeleeProfile } from './melee-profile-service.js';
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
  setMeleeTechniques,
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

function meleeOptionHelp(id) {
  const { hint, label } = maOptionText(id);
  const text = escapeHTML(label + ' – ' + hint);
  return `<span class="gam-melee-martial-help" tabindex="0" title="${text}" aria-label="${text}">(?)</span>`;
}

function meleeSlotColorClass(slot, index) {
  if (slot.extraAttack) {
    const color = (Number(slot.type.slice(2)) - 1) % 4 + 1;
    return `gam-melee-colored-slot gam-melee-ea-color-${color}`;
  }
  return slot.type === 'rs3' ? 'gam-melee-colored-slot gam-melee-rs3-color' : 'gam-rapid-attack-' + (index + 1);
}

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
    this._techniqueSelection=normalizeMeleeTechniques(getMeleeAttackSettings(state,sourceAttack).techniques);
    this._specialConfirmations={};
    this.fireState.techniqueSequence=this._techniqueSelection.ids.includes('combination')?'combination':this._techniqueSelection.ids.includes('dualWeaponAttack')?'dualWeaponAttack':null;
    this.fireState.combinationLength=(this._techniqueSelection.sequence?.configurations?.length??this._techniqueSelection.context.combinationLength)===3?3:2;
    this._requestedCombination=this._techniqueSelection.context.requestedCombination??null;
    this._fixedCombination=this.fireState.techniqueSequence==='combination'?this._techniqueSelection.sequence??null:null;
    this._attackSlots = this._getAttackSlots();
    this._attackSlotStates = this._attackSlots.map(()=>this._snapshotAttackConfiguration());
    if(this._fixedCombination&&this.fireState.techniqueSequence==='combination')this._attackSlotStates=this._fixedCombination.configurations.map(c=>this._cloneAttackConfiguration(c));
    if(this.fireState.techniqueSequence==='dualWeaponAttack'&&this._techniqueSelection.sequence?.configurations)this._attackSlotStates=this._techniqueSelection.sequence.configurations.slice(-2).map(c=>this._cloneAttackConfiguration(c));
    this._attackConfigurationCache = new Map();
    this._activeAttackSlot = 0;
    this._executionWindows = new Set();
    this._effectiveDamage = null;
    this._damagePreviewRevision = 0;
    if(this.fireState.techniqueSequence&&this._attackSlotStates[0])this._applyAttackConfiguration(this._attackSlotStates[0]);
    if (!this._visibleAttacks().length) this.selectedAttackKey = '';
  }

  _resolveGoverningSkill(savedValue = "") {
    const options = this.targetedAttackContext?.specialtyOptions ?? [];
    if (options.some(option => option.value === savedValue)) return savedValue;
    return this.targetedAttackContext?.automaticSpecialty ?? "";
  }

  _snapshotAttackConfiguration() {
    return {
      attackKey:this.selectedAttackKey,governingSpecialty:this.fireState.governingSpecialty,
      rapidStrikeMastery:this.fireState.rapidStrikeMastery===true,
      spendEffort:this._attackSlotStates?.[this._activeAttackSlot]?.spendEffort !== false,
      feintSlot:this._attackSlotStates?.[this._activeAttackSlot]?.feintSlot??'',
      techniques:{ids:(this._techniqueSelection?.ids??[]).filter(id=>!['combination','dualWeaponAttack'].includes(id)),context:structuredClone(this._techniqueSelection?.context??{})},
      targetIds:Array.from(globalThis.game?.user?.targets??[]).map(t=>t.id),
      manualModifier: String(this.fireState.manualModifier ?? ""),
      deceptiveAttack: String(this.fireState.deceptiveAttack ?? "0"),
      telegraphicAttack: this.fireState.telegraphicAttack === true,
      hitLocation: { ...(this.fireState.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _cloneAttackConfiguration(configuration) {
    return {
      attackKey:configuration?.attackKey??this.selectedAttackKey,governingSpecialty:configuration?.governingSpecialty??this.fireState.governingSpecialty,
      rapidStrikeMastery:(configuration?.rapidStrikeMastery??this.fireState.rapidStrikeMastery)===true,
      spendEffort:configuration?.spendEffort!==false,
      feintSlot:configuration?.feintSlot??'',
      techniques:normalizeMeleeTechniques(configuration?.techniques),targetIds:[...(configuration?.targetIds??[])],
      manualModifier: String(configuration?.manualModifier ?? ""),
      deceptiveAttack: String(configuration?.deceptiveAttack ?? "0"),
      telegraphicAttack: configuration?.telegraphicAttack === true,
      hitLocation: { ...(configuration?.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _applyAttackConfiguration(configuration) {
    const state = this._cloneAttackConfiguration(configuration);
    if(this.fireState.techniqueSequence||this.fireState.useExtraAttacks){
      const source=this.sourceAttacks.find(a=>a.key===state.attackKey);
      if(source){this.selectedAttackKey=source.key;this.sourceAttack=source;this.attack=applyMeleeAttackOverride(source,this._meleeState,this.actor);
        this.targetedAttackContext=createMeleeTargetedAttackContext({actor:this.actor,attack:this.attack});
        if(this.targetingService instanceof TargetingService){const previous=this.targetingService;
          this.targetingService=new TargetingService({definition:previous.definition,table:previous.table,tableSource:previous.tableSource,attack:this.attack});
          this._targetingServices?.set(this.targetingService.bodyplan,this.targetingService);}}
      this.fireState.governingSpecialty=state.governingSpecialty;
      this.fireState.rapidStrikeMastery=state.rapidStrikeMastery;
      this._techniqueSelection=state.techniques;
    }
    this._syncTechniqueTargeting();
    const selection = this.targetingService.getSelection(state.hitLocation.zoneId, state.hitLocation.regionId);
    if(!selection&&this._buildingAttackSnapshots)throw Error('Выбранная зона недоступна оружию этого шага последовательности.');
    this.fireState.manualModifier = state.manualModifier;
    this.fireState.deceptiveAttack = state.deceptiveAttack;
    this.fireState.telegraphicAttack = state.telegraphicAttack;
    this.fireState.hitLocation = selection
      ? { zoneId: selection.zoneId, regionId: selection.regionId ?? null }
      : { ...this.targetingService.getDefaultSelection() };
  }

  _saveActiveAttackConfiguration({captureTargets=false}={}) {
    if(this._attackSlotStates){const previous=this._attackSlotStates[this._activeAttackSlot],next=this._snapshotAttackConfiguration();
      if(!captureTargets&&previous)next.targetIds=[...(previous.targetIds??[])];
      this._attackSlotStates[this._activeAttackSlot]=next;}
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

  _getAttackSlots(){
    const selection=this._techniqueSelection;
    const manualGrappleFirstAttack=selection?.context?.strikeGrapple==='newHead'&&selection.ids.some(id=>id==='kneeStrike'||id==='uppercut');
    return getMeleeAttackSlots({...this.fireState,manualGrappleFirstAttack,
      rapidCount:this._rapidStrikeCount(), extraAttacks:this.fireState.useExtraAttacks?extraAttackRanks(this.actor):[]});
  }

  _refreshAttackSlots() {
    this._saveActiveAttackConfiguration({captureTargets:!this._sequencePreviewRunning&&!this._buildingAttackSnapshots});
    const previous = new Map(this._attackSlots.map((slot, index) => [slot.type, this._attackSlotStates[index]]));
    for (const [type, configuration] of previous) this._attackConfigurationCache.set(type, this._cloneAttackConfiguration(configuration));
    const previousActive = this._attackSlots[this._activeAttackSlot]?.type;
    const aliases = { attack: ["aoa1", "aoa", "rs1"], aoa: ["aoa1", "attack", "rs1"],
      aoa1: ["aoa", "attack", "rs1"], aoa2: ["rs1", "rs2", "attack"],
      rs1: ["aoa2", "attack", "aoa"], rs2: ["aoa2", "rs1", "attack"] };
    const fallback = this._attackSlotStates[this._activeAttackSlot];
    this._attackSlots = this._getAttackSlots();
    this._attackSlotStates = this._attackSlots.map(slot => {
      const existing = previous.get(slot.type) ?? this._attackConfigurationCache.get(slot.type);
      const source = slot.label==='Удар после захвата'&&fallback?fallback:existing ??
        (aliases[slot.type]??[]).map(type => previous.get(type) ?? this._attackConfigurationCache.get(type)).find(Boolean) ?? fallback;
      const configuration = this._cloneAttackConfiguration(source);
      return configuration;
    });
    this._activeAttackSlot = Math.max(0, this._attackSlots.findIndex(slot => slot.type === previousActive));
    this._applyAttackConfiguration(this._attackSlotStates[this._activeAttackSlot]);
    this._refreshHitLocationContent();
    this._updateAttackSlotControls();
  }

  async _switchAttackSlot(index) {
    const next = Number(index);
    if (!Number.isInteger(next) || next < 0 || next >= this._attackSlots.length) return;
    this._saveActiveAttackConfiguration({captureTargets:true});
    this._activeAttackSlot = next;
    this._applyAttackConfiguration(this._attackSlotStates[next]);
    if(this.fireState.techniqueSequence&&(globalThis.canvas?.tokens?.setTargets||globalThis.game?.user?.updateTokenTargets))await replaceFoundryTargets(this._attackSlotStates[next]?.targetIds??[]);
    this._refreshHitLocationContent();
    this._updateMeleePreview();
    if(this.fireState.techniqueSequence){setSelectedMeleeAttack(this._meleeState,this.sourceAttack);await this._persistCurrentPreferences();}
  }

  _getRapidStrikePenalty() {
    if (!this._attackSlots[this._activeAttackSlot]?.rapidStrike) return 0;
    const mastery = cinematicTraining(this.actor, this._governingMeleeSkill(), this.attack,
      { weaponMasterApplies:this.fireState.rapidStrikeMastery }) || this.fireState.rapidStrikeMastery;
    const count = this._attackSlots.filter(slot=>slot.rapidStrike).length;
    return count === 2 ? getRapidStrikePenalty(mastery) : maRapidStrikePenalty(count, mastery, false);
  }

  _rapidStrikeCount() {
    if(!this.fireState.rapidStrike)return 2;
    return expandedRapidStrikeCount(this.fireState.maRapidCount, allowsCinematicTechniqueDefaults());
  }

  _maState() {
    const slot = this._attackSlots?.[this._activeAttackSlot];
    const targets = globalThis.game?.user?.targets;
    const targetShield = targets?.size===1 ? readShieldDefenseBonus([...targets][0]?.actor) : null;
    return { movement:this.fireState.maMovement, movementConfirmed:this.fireState.maMovementConfirmed,
      effort:this.fireState.maEffort, floorLunge:this.fireState.maFloorLunge,
      stunt:this.fireState.maStunt||'tumbling', stuntPenalty:this.fireState.maStuntPenalty,
      stuntRebounds:this.fireState.maStuntRebounds, evadeJump:this.fireState.maEvadeJump,
      standing:this.fireState.maStanding, byLegs:this.fireState.maByLegs, swingNeedsJump:this.fireState.maSwingNeedsJump,
      rapidCount:slot?.rapidStrike?this._attackSlots.filter(step=>step.rapidStrike).length:null, extraAttack:slot?.extraAttack,
      feintSlot:this._attackSlotStates?.[this._activeAttackSlot]?.feintSlot??'',
      attackOption:this.fireState.maAttackOption, attackOptionConfirmed:this.fireState.maAttackOptionConfirmed,
      pummelConfirmed:this.fireState.maPummelConfirmed, pummelGuarded:this.fireState.maPummelGuarded,
      shinArmor:this.fireState.maShinArmor, shieldDB:this.fireState.maShieldDB??'',
      targetShield, shieldHandheld:this.fireState.maShieldHandheld,
      shieldDisarm:targetShield?.handheld===false?false:this.fireState.maShieldDisarm,
      spend:this._attackSlotStates?.[this._activeAttackSlot]?.spendEffort !== false };
  }

  _buildAdditionalMeleeOptions() {
    const state = this.fireState, ru = maRussian(), slot = this._attackSlots[this._activeAttackSlot];
    const tip = meleeOptionHelp;
    const check = (name, label, current) =>
      `<label><input type="checkbox" name="${name}" ${current?'checked':''}>${escapeHTML(label)}</label>`;
    const choose = (name, label, ids, selected) => `<label>${escapeHTML(label)}
      <select name="${name}"><option value="">${ru?'Нет':'None'}</option>
      ${ids.map(id=>`<option value="${id}" ${selected===id?'selected':''}>${escapeHTML(maOptionText(id).label)}</option>`).join('')}</select></label>
      ${ids.includes(selected) ? tip(selected) : ''}`;
    const rank = extraAttackRanks(this.actor).length;
    const strikes=this._techniqueSelection?.ids?.filter(id=>['spinningKick','kicking','jam'].includes(id)).map(id=>({id}));
    const profile = maAttackApplicability(this.attack,this._governingMeleeSkill(),{strikes});
    const attackOptions=['pummel','shin','shove','strikeShield'].filter(id=>profile[id]);
    const requiresDB=state.maAttackOption==='strikeShield'||state.maAttackOption==='shove'&&profile.shield;
    const recordedShield=state.maAttackOption==='strikeShield'?this._maState().targetShield:null;
    const shieldHandheld=recordedShield?.handheld??state.maShieldHandheld;
    const efforts = state.moveAndAttack ? ['lunge','charge'] : state.allOutAttack || state.defensiveAttack ?
      (state.rapidStrike?['flurry']:[]) : state.committedAttack ?
        ['lunge',...(state.rapidStrike?['flurry']:[])] : ['mighty','lunge',...(state.rapidStrike?['flurry']:[])];
    return `<div class="gam-melee-martial-options gam-ma-options">
      ${attackOptions.length?`<div class="gam-melee-martial-row">
        ${choose('maAttackOption',ru?'Вариант удара':'Attack option',attackOptions,state.maAttackOption)}</div>`:''}
      ${state.maAttackOption==='pummel'&&profile.pummelNeedsConfirmation?`<div class="gam-melee-martial-row">
        ${check('maPummelConfirmed',ru?'Оружие подходит для Pummeling':'Weapon suits Pummeling',state.maPummelConfirmed)}
        ${check('maPummelGuarded',ru?'Есть защитная дужка':'Has a basket hilt',state.maPummelGuarded)}</div>`:''}
      ${state.maAttackOption==='shin'?`<div class="gam-melee-martial-row">
        ${check('maAttackOptionConfirmed',ru?'Цель спереди или сбоку и не лежит':'Target is upright and ahead or to the side',state.maAttackOptionConfirmed)}
        ${check('maShinArmor',ru?'Жёсткая броня голени':'Rigid shin armor',state.maShinArmor)}</div>`:''}
      ${requiresDB?`<div class="gam-melee-martial-row"><label>DB <input ${recordedShield?'readonly':'name="maShieldDB"'} type="number" min="0"
        step="1" value="${escapeHTML(recordedShield?.value??state.maShieldDB??'')}"></label>
        ${state.maAttackOption==='strikeShield'&&recordedShield?.handheld==null?
          check('maShieldHandheld',ru?'Ручной щит или плащ':'Hand-held buckler or cloak',state.maShieldHandheld):''}
        ${state.maAttackOption==='strikeShield'&&shieldHandheld?
          check('maShieldDisarm',ru?'Выбить из рук':'Disarm',state.maShieldDisarm):''}</div>`:''}
      ${state.moveAndAttack ? `<div class="gam-melee-martial-row">
        ${choose('maMovement',ru?'Движение':'Movement',['acrobatic','flying'],state.maMovement)}
        ${state.maMovement ? check('maMovementConfirmed',ru?'Могу достать цель после движения':'Can reach target after movement',state.maMovementConfirmed) : ''}</div>` : ''}
      ${state.moveAndAttack&&state.maMovement==='acrobatic'?`<div class="gam-melee-martial-row">
        <label>${ru?'Трюк':'Stunt'} <select name="maStunt">${[
          ['tumbling',ru?'Кувырок':'Tumbling'],['banister',ru?'По перилам':'Banister sliding'],
          ['swinging',ru?'На верёвке':'Swinging'],['ticTac','Tic-Tac'],['spinning',ru?'Разворот':'Spinning'],
          ['evade',ru?'Проскочить мимо':'Evade'],['skid',ru?'Скольжение':'Skidding']
        ].map(([id,label])=>`<option value="${id}" ${(state.maStunt||'tumbling')===id?'selected':''}>${label}</option>`).join('')}</select></label>
        ${['swinging','ticTac','spinning','evade','skid'].includes(state.maStunt)?
          `<label>${ru?'Штраф трюка':'Stunt penalty'} <input name="maStuntPenalty" type="number" ${state.maStunt==='evade'?'':'min="0"'} step="1" value="${escapeHTML(state.maStuntPenalty??(state.maStunt==='skid'?2:0))}"></label>`:''}
        ${state.maStunt==='ticTac'?`<label>${ru?'Отскоков':'Rebounds'} <input name="maStuntRebounds" type="number"
          min="1" step="1" value="${escapeHTML(state.maStuntRebounds??1)}"></label>`:''}
        ${state.maStunt==='evade'?check('maEvadeJump',ru?'Прыгать через цель':'Jump over the foe',state.maEvadeJump):''}
        ${state.maStunt==='banister'?check('maStanding',ru?'Стоя':'Standing',state.maStanding):''}
        ${state.maStunt==='swinging'?check('maByLegs',ru?'Вис на ногах':'Swing by legs',state.maByLegs)+
          check('maSwingNeedsJump',ru?'Нужно допрыгнуть':'Jump to reach',state.maSwingNeedsJump):''}</div>`:''}
      ${rank?`<div class="gam-melee-martial-row">${check('useExtraAttacks',maOptionText('extraAttack').label+' '+rank,state.useExtraAttacks)} ${tip('extraAttack')}</div>`:''}
      ${state.rapidStrike&&allowsCinematicTechniqueDefaults()?`<div class="gam-melee-martial-row">
        <label>${escapeHTML(maOptionText('expanded').label)} <input name="maRapidCount" type="number" min="2"
          step="1" value="${this._rapidStrikeCount()}"></label> ${tip('expanded')}</div>`:''}
      ${this._attackSlots.length>1&&!slot?.type.startsWith('combo')&&!slot?.type.startsWith('dwa')?
        `<div class="gam-melee-martial-row"><label>${escapeHTML(maOptionText('feintSlot').label)}
          <select name="maFeintSlot">${[['',ru?'Атака':'Attack'],['feint','Feint'],['beat','Beat'],
            ['ruse','Ruse'],['defensive','Defensive Feint']].map(([id,label])=>
            `<option value="${id}" ${this._maState().feintSlot===id?'selected':''}>${label}</option>`).join('')}</select></label> ${tip('feintSlot')}</div>`:''}
      ${efforts.length?`<div class="gam-melee-martial-row">
        ${choose('maEffort',ru?'Сверхусилие':'Extra effort',efforts,state.maEffort)}
        ${this._attackSlots.length>1&&((state.maEffort==='flurry'&&slot?.rapidStrike)||state.maEffort==='mighty')?
          check('maSpendEffort',ru?'Применить в этом слоте':'Apply to this slot',this._maState().spend):''}</div>`:''}
      ${(state.allOutAttack&&state.allOutAttackMode==='long'||state.maEffort==='lunge')?
        `<div class="gam-melee-martial-row">${check('maFloorLunge',ru?'Выпад с опорой':'Floor lunge',state.maFloorLunge)}</div>`:''}
    </div>`;
  }

  _getHitLocationMarkers(zoneId, regionId = null) {
    if (this._attackSlots.length < 2) return [];
    return this._attackSlotStates.flatMap((configuration, index) => {
      const selection = configuration?.hitLocation;
      const matchesZone = selection?.zoneId === zoneId;
      const matchesRegion = regionId === null || !selection?.regionId || selection.regionId === regionId;
      if (!matchesZone || !matchesRegion) return [];
      return [{
        className: meleeSlotColorClass(this._attackSlots[index], index) + (index === this._activeAttackSlot ? " is-active" : ""),
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
    this._syncTechniqueTargeting();
    const visibility = this._getMeleeVisibilityRules();
    const newRules=(this._techniqueSelection?.ids??[]).map(getCombatRule).filter(rule=>rule?.strikeProfile);
    const fixedLocation=newRules.find(rule=>rule.strikeProfile.fixedLocation)?.strikeProfile.fixedLocation;
    const selection = fixedLocation?this._fixedStrikeLocation(fixedLocation):
      visibility?.random ? this.targetingService.getSelection("silhouette") : this._getSelectedLocation();
    const zone = this.targetingService.getZone(selection?.zoneId);
    const strikeIds=(this._techniqueSelection?.ids??[]).filter(id=>['backKick','backStrike','hammerFist','kicking','crack','pressurePointStrike'].includes(id));
    if(this.attack?.unarmedRef&&this.attack.meleeProfile?.attackType==='kick'&&!strikeIds.some(id=>['kicking','backKick'].includes(id)))strikeIds.push('kicking');
    const context=this._techniqueContext();
    const strikes=strikeIds.map(id=>resolveCombatTechnique(id,{actor:this.actor,attack:this.attack,meleePenalty:true,governingSkill:this._governingMeleeSkill(),context})).filter(r=>r.available);
    if(!fixedLocation){
      for(const rule of newRules.filter(r=>r.strikeProfile.projected!==false)){
        const strike=resolveCombatTechnique(rule.id,{actor:this.actor,attack:this.attack,governingSkill:this._governingMeleeSkill(),context,previewStrike:true});
        if(strike.available)strikes.push({...strike,defaultModifier:strike.originalModifier});
      }
    }
    for(const strike of strikes)if(strike.id==='kicking')strike.aliases=[this.attack.name,this.attack.mode].filter(Boolean);
    for(const strike of strikes)if(['backKick','backStrike'].includes(strike.id)&&selection?.penalty<0)strike.targetPenalty=-1;
    const tipSlash=this._techniqueSelection?.ids.includes('initialCarving')&&context.carvingTipSlash&&/\bimp\b/.test(this.attack.damage);
    if(tipSlash){const skill=this._governingMeleeSkill();strikes.push({id:'tipSlash',name:'Tip Slash',level:skill?.level,modifier:0,defaultModifier:0});}
    const targetOptions={
      specialty: this.fireState.governingSpecialty,
      target: selection?.canonicalKeys ?? [selection?.canonicalKey, ...(zone?.taAliases ?? [])],
      basePenalty: selection?.penalty ?? 0
    };
    const candidates=visibility?.random||fixedLocation?[]:strikes.map(strike=>this.targetedAttackContext?.resolve({...targetOptions,strikeTechnique:strike})).filter(Boolean);
    if(!fixedLocation&&!newRules.length&&!tipSlash&&!strikeIds.some(id=>['backKick','backStrike','hammerFist','kicking','crack'].includes(id))&&!visibility?.random){const ordinary=this.targetedAttackContext?.resolve(targetOptions);if(ordinary)candidates.push(ordinary);}
    const targetedAttack=candidates.sort((a,b)=>b.effectivePenalty-a.effectivePenalty)[0]??null;
    return {
      selection,
      targetedAttack,
      penalty: (targetedAttack?.effectivePenalty ?? selection?.penalty ?? 0) +
        (visibility?.precisionPenalty && selection?.zoneId !== "silhouette" ? visibility.precisionPenalty : 0)
    };
  }

  _fixedStrikeLocation(zone){
    const name={eye:'Глаз',face:'Верхняя часть лица',ear:'Ухо'}[zone];
    return {...this.targetingService.getSelection(zone),zoneId:zone,canonicalKey:zone,canonicalKeys:[zone],label:name,penalty:0,random:false};
  }

  _governingMeleeSkill(){
    if(this.attack?.unarmedRef)return this.attack.meleeProfile?.skill;
    const bound=this.attack?.standaloneRef?.governingSkill??this.attack?.equipmentRef?.governingSkill;if(bound)return bound;
    const selected=this.targetedAttackContext?.specialtyOptions?.find(s=>s.value===this.fireState.governingSpecialty);
    return selected?{name:selected.label,level:selected.level}:null;
  }

  _syncTechniqueTargeting(){
    if(!(this.targetingService instanceof TargetingService))return;
    const ids=this._techniqueSelection?.ids??[],context=this._techniqueContext();
    const skill=this._governingMeleeSkill();
    let pressureSecrets=false,damageType=null;
    const strikeRules=ids.map(getCombatRule).filter(rule=>rule?.strikeProfile);
    const restrictEye=strikeRules.some(rule=>rule.id==='uppercut');
    const waiveGroin=ids.includes('kneeStrike')&&context.strikeGrapple==='front';
    const fixed=strikeRules.find(rule=>rule.strikeProfile.fixedLocation)?.strikeProfile.fixedLocation;
    const strikeDamage=strikeRules.find(rule=>rule.strikeProfile.damage)?.strikeProfile.damage;
    if(strikeDamage)damageType=strikeDamage.split(/\s+/).at(-1);
    if(ids.includes('pressurePointStrike')&&/^Pressure Secrets/i.test(context.pressureSkill??''))pressureSecrets=resolveCombatTechnique('pressurePointStrike',{actor:this.actor,attack:this.attack,governingSkill:skill,context}).available===true;
    if(ids.includes('initialCarving')&&context.carvingTipSlash){const result=resolveCombatTechnique('initialCarving',{actor:this.actor,attack:this.attack,governingSkill:skill,context});if(result.available)damageType=result.damageType;}
    const previous=this.targetingService;
    const strikeTargetingSignature=JSON.stringify([restrictEye,fixed??null,waiveGroin]);
    if(!!previous.damageProfile.pressureSecrets===pressureSecrets&&(previous.damageProfile.techniqueDamageType??null)===damageType&&
      (previous.damageProfile.strikeTargetingSignature??'[false,null,false]')===strikeTargetingSignature)return;
    this.targetingService=new TargetingService({definition:previous.definition,table:previous.table,tableSource:previous.tableSource,attack:{...this.attack,meleeTechniqueTargeting:{pressureSecrets,damageType,allowEye:restrictEye||fixed==='eye',waiveGroin}}});
    this.targetingService.damageProfile.techniqueDamageType=damageType;
    this.targetingService.damageProfile.strikeTargetingSignature=strikeTargetingSignature;
    this._targetingServices?.set(this.targetingService.bodyplan,this.targetingService);
  }

  _getBaseSkillLevel() {
    this._refreshStandaloneAttack();
    if (this.attack?.standaloneRef) return this.attack.standaloneRef.governingSkill?.resolved ? this.attack.level : null;
    const attackLevel = Number(this.attack?.level ?? this.sourceAttack?.level);
    return Number.isFinite(attackLevel) ? Math.trunc(attackLevel) : null;
  }

  _currentTechniqueSelection(){
    const selected=normalizeMeleeTechniques(this._techniqueSelection),slot=this._attackSlots?.[this._activeAttackSlot];
    selected.context=this._techniqueContext();
    selected.ids=selected.ids.filter(id=>!['combination','dualWeaponAttack'].includes(id));
    if(this.fireState.techniqueSequence==='dualWeaponAttack'&&slot?.type.startsWith('dwa'))selected.ids.push('dualWeaponAttack');
    if(this.fireState.techniqueSequence==='combination'&&slot?.type.startsWith('combo'))selected.ids.push('combination');
    if(this._fixedCombination)selected.sequence=structuredClone(this._fixedCombination);
    const hands=this.attack?.unarmedRef?(meleeAttackUsesHand(this.attack)?1:0):this.attack?.meleeProfile?.strength?.hands??this.attack?.meleeProfile?.hands?.hands;
    if(Number.isInteger(hands))selected.context.weaponHands=hands;
    selected.context.hand=slot?.hand??selected.context.hand??'main';
    selected.context.weaponMasterApplies=this.fireState.rapidStrikeMastery===true;
    const location=this._getLocationResult().selection;
    selected.context.targetLocationKeys=location?.canonicalKeys??[location?.canonicalKey??location?.zoneId];
    selected.context.targetVitals=selected.context.targetLocationKeys.includes('vitals');
    return selected;
  }

  _techniqueContext(){
    const ids=this._techniqueSelection?.ids??[],saved=this._techniqueSelection?.context??{};
    const context={...saved,cinematicDefaults:allowsCinematicTechniqueDefaults()};
    delete context.specialConfirmed;
    if(Object.keys(this._specialConfirmations??{}).length)context.specialConfirmed={...this._specialConfirmations};
    delete context.retryCarving;
    if(ids.includes('attackFromAbove'))context.fromAbove=true;
    if(ids.includes('closeCombat'))context.closeCombat=true;
    if(saved.rearAttackConfirmed===undefined)context.rearAttackConfirmed=saved.behindKnown===true&&saved.legsFree===true;
    if(saved.rearAttackConfirmed!==undefined)context.behindKnown=context.legsFree=saved.rearAttackConfirmed;
    if(ids.includes('cavalryTraining')){
      context.mounted=true;
      const riding=learnedMeleeSkills(this.actor).filter(s=>/^Riding(?:\s*\(|$)/i.test(s.name));
      if(riding.length===1)context.ridingSkill=riding[0].name;
    }
    if(ids.includes('fightingWhileSeated')&&readMeleePosture(this.actor).value==='sitting'&&saved.posture===undefined)context.posture='seated';
    if(ids.includes('pressurePointStrike')){
      const options=this._pressureSkillOptions(context);
      if(options.length===1)context.pressureSkill=options[0];
    }
    if(ids.some(id=>getCombatRule(id)?.strikeProfile)){
      const targets=[...(globalThis.game?.user?.targets??[])];
      const token=targets.length===1?targets[0]:null;
      const target=token?.actor??globalThis.game?.actors?.get?.(context.strikeTargetActorId);
      if(target)context.strikeTarget={
        actorId:target.id,tokenId:token?.id??null,sceneId:token?.document?.parent?.id??null,name:token?.name??target.name,
        posture:readMeleePosture(target).value,sm:target.system?.attributes?.SM?.value??target.system?.SM??null,
        hasEyes:hasCombatTrait(target,'No Eyes')||hasCombatTrait(target,'No Head')?false:null,
        hp:target.system?.HP?.max??null
      };
    }
    if(ids.some(id=>id==='crack'||id==='reverseGrip')){
      const source=meleeProfileContext(this.actor,this.attack);
      const profile=source?.profiles.find(p=>p.modeId===(source.saved.modeId||source.source.modeId));
      if(ids.includes('crack')&&['lt:whip','lt:light-whip'].includes(profile?.modelId))context.whipKind='ordinary';
      if(ids.includes('reverseGrip')){
        context.reversibleWeapon=!!profile&&meleeMartialGrips(profile).includes('reversed');
        context.canThrust=!!source?.profiles.some(p=>/^thr/i.test(p.stats.damage));
      }
    }
    context.manualTurn=String(this.actor?.getFlag?.('olegurps-qol','meleeTechniqueManualTurn')??'0');
    if(ids.includes('initialCarving')){
      context.letter=String(context.letter??'').trim().toUpperCase();
      context.strokeCount=context.strokeCount??2;
      context.autoCarvingProgress=true;
      context.carvingTipSlash=!/\bcut\b/.test(this.attack?.damage??'')&&/\bimp\b/.test(this.attack?.damage??'');
      const progress=initialCarvingProgress(this.actor,context);
      context.retryCarving=this._retryCarving===context.carvingId&&progress.completed>1;
      context.stroke=context.retryCarving?progress.completed:progress.stroke;
      return this._tipSlashContext(context);
    }
    return context;
  }

  _pressureSkillOptions(context){
    const skill=this._governingMeleeSkill();
    return [...new Set(learnedMeleeSkills(this.actor)
      .filter(s=>/^Pressure (?:Points|Secrets)(?:\s*\(|$)/i.test(s.name))
      .filter(s=>resolveCombatTechnique('pressurePointStrike',{actor:this.actor,attack:this.attack,governingSkill:skill,
        context:{...context,pressureSkill:s.name,cinematicDefaults:true}}).available)
      .map(s=>s.name))];
  }

  _tipSlashContext(input){
    const context={...input};
    if(!context.carvingTipSlash||!this._techniqueSelection?.ids?.includes('initialCarving'))return context;
    const source=meleeProfileContext(this.actor,this.attack);
    if(!source||this.attack.hasMeleeDamageOverride)return context;
    const grip=this.attack.meleeProfile?.grip,hands=this.attack.meleeProfile?.strength?.hands;
    const profiles=source.profiles.map(p=>resolveMeleeProfile({actor:this.actor,attack:this.attack,context:source,selection:{...source.saved,modeId:p.modeId}}))
      .filter(a=>!a.readinessReason&&a.meleeProfile?.grip===grip&&a.meleeProfile?.strength?.hands===hands);
    const reaches=profiles.map(a=>String(a.meleeProfile?.reach??a.reach??''));
    if(!reaches.length||reaches.some(r=>!r||!/^[C\d.,*\s–-]+$/i.test(r)))return context;
    const distances=reaches.flatMap(r=>[...r.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0])));
    context.tipSlashReach=distances.length?String(Math.max(...distances)):'C';
    context.tipSlashReachSource='profile';
    return context;
  }

  _techniquePanelHTML(){
    const selection=this._currentTechniqueSelection();
    const options=this._getMeleeCalculationOptions(),plan=resolveMeleeCombatCalculation(options)?.metadata.meleeTechniques;
    const currentTargets=[...(globalThis.game?.user?.targets??[])].map(t=>t.id);
    const targets=new Set((this._attackSlotStates??[]).flatMap((slot,i)=>{
      const ids=i===this._activeAttackSlot?currentTargets:slot.targetIds??[];
      return ids.length?ids:[slot.techniques?.context?.manualTarget].filter(Boolean);
    }));
    const knownHands=!!this.attack?.unarmedRef||Number.isInteger(this.attack?.meleeProfile?.strength?.hands);
    const knownWhip=selection.context.whipKind==='ordinary'&&['lt:whip','lt:light-whip'].includes(meleeProfileContext(this.actor,this.attack)?.source.modelId);
    const knownTipReach=selection.context.tipSlashReachSource==='profile';
    const sequenceSetup=this.fireState.techniqueSequence==='combination'?this._combinationSetupHTML():'';
    return meleeTechniqueControls({...options,selection,errors:plan?.errors??[],picker:this._techniquePicker,
      activeOpen:this._activeTechniquesOpen,sequenceSetup,
      pressureOptions:selection.ids.includes('pressurePointStrike')?this._pressureSkillOptions(selection.context):[],
      hasTarget:currentTargets.length>0,needsAdjacency:targets.size>1,knownHands,knownWhip,knownTipReach,
      hasEncounter:!!this.actor?.getFlag?.('olegurps-qol','meleeTechniqueUses')},escapeHTML);
  }

  _combinationSetupHTML(){
    const length=this.fireState.combinationLength;
    const recipe=this._fixedCombination?.name??this._requestedCombination??'Выберите атаку и зону в каждом слоте.';
    const count=this._requestedCombination?'':`<label>Атак в Combination <select name="meleeCombinationLength">
      <option value="2" ${length===2?'selected':''}>2</option>
      <option value="3" ${length===3?'selected':''}>3</option></select></label>`;
    return `<div class="gam-melee-combination-setup">${count}
      <button type="button" data-melee-technique-action="fix-combination">Закрепить шаги</button>
      <small>${escapeHTML(recipe)}</small></div>`;
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
      governingSkill: this._governingMeleeSkill(),
      meleeTechniques:this._currentTechniqueSelection(),
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
      defensiveAttack: this.fireState.defensiveAttack,
      hitLocationPenalty: location.penalty,
      hitLocationBasePenalty: location.selection?.penalty ?? 0,
      hitLocationLabel: "Зона попадания: " + (location.selection?.label ?? ""),
      targetedAttack: location.targetedAttack,
      precisionPenalty,
      rapidStrikePenalty: this._getRapidStrikePenalty(),
      maOptions: this._maState(),
      visibilityPenalty: this._getMeleeVisibilityRules()?.penalty ?? 0,
      visibilityCap: this._getMeleeVisibilityRules()?.cap ?? false
    };
  }

  _normalizeManeuverState(sequenceSkillBeforeDeceptive=null) {
    if (!allOutMeleeModes.includes(this.fireState.allOutAttackMode)) {
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
      if(this.fireState.maEffort!=='charge')this.fireState.deceptiveAttack = "0";
    } else if (this.fireState.allOutAttack) {
      this.fireState.committedAttack = false;
      this.fireState.defensiveAttack = false;
    } else if (this.fireState.committedAttack) {
      this.fireState.defensiveAttack = false;
    }
    if (this.fireState.telegraphicAttack) this.fireState.deceptiveAttack = "0";
    const options = this._getMeleeCalculationOptions();
    const beforeDeceptive = Number.isFinite(sequenceSkillBeforeDeceptive)?sequenceSkillBeforeDeceptive:calculateMeleeSkillBeforeDeceptive(options);
    const deceptive = normalizeDeceptiveAttackPenalty(
      this.fireState.deceptiveAttack,
      beforeDeceptive,
      this.fireState.moveAndAttack&&this.fireState.maEffort!=='charge',
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
        this.fireState.moveAndAttack&&this.fireState.maEffort!=='charge', this.fireState.telegraphicAttack)
    };
  }

  _buildDeceptiveOptions(selected = this.fireState.deceptiveAttack,sequenceSkillBeforeDeceptive=null) {
    const maneuver = this._normalizeManeuverState(sequenceSkillBeforeDeceptive);
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
    return this._resolvedMeleeCalculation()?.effectiveSkill??null;
  }

  _resolvedMeleeCalculation(){
    const ordinary=resolveMeleeCombatCalculation(this._getMeleeCalculationOptions());
    if(!ordinary||!this.fireState.techniqueSequence||this._buildingAttackSnapshots||this._sequencePreviewRunning)return ordinary;
    this._sequencePreviewRunning=true;
    try{return this._createAttackSnapshots({preview:true})[this._activeAttackSlot]?.combatCalculation??ordinary;}
    catch(error){return {...ordinary,effectiveSkill:null,metadata:{...ordinary.metadata,meleeSequenceError:error.message}};}
    finally{this._sequencePreviewRunning=false;}
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

  _buildAttackStats(damage = this._effectiveDamage?.formula ?? this.attack?.damage,reach=this._effectiveDamage?.evidence?.techniques?.reach) {
    const strikePlan=this._effectiveDamage?.evidence?.techniques;
    const physicalStrike=strikePlan?.primaryStrike;
    const values = [
      meleeOutcomeLabel(this.attack,damage),
      "Reach " + (reach || this.attack?.reach || "-")
    ];
    if(!physicalStrike)values.push("Parry " + (this.attack?.parry || "-"));
    const resource=utMeleeResourceLabel(this.actor,this.attack);
    if(resource)values.push(resource);
    const unarmed=this.attack?.meleeProfile?.unarmed;
    if(physicalStrike){
      const skill=strikePlan.results.find(row=>row.id===physicalStrike.id)?.governingSkill;
      if(skill)values.push(skill);
    }else if(unarmed)values.push(unarmed.alreadyIncluded?'Исходный Damage GGA':unarmed.manualDamage?'Ручной Damage':unarmed.selectedSkill+' +'+unarmed.bonusPerDie+'/куб thrust'+(unarmed.naturalPerDie?' · естественное оружие +'+unarmed.naturalPerDie+'/куб':''));
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
    this._updateAttackSlotControls();
    this._onActiveTechniquesToggle ??= ({target}) => {
      if (target.matches?.('[data-melee-active-techniques]')) this._activeTechniquesOpen=target.open;
    };
    this.element?.addEventListener('toggle',this._onActiveTechniquesToggle,true);
    if (this._weaponVisibilityHook == null && globalThis.Hooks?.on) this._weaponVisibilityHook = Hooks.on('updateUser', (user, changes) => {
      if (user.id === game.user.id && changes.flags?.['olegurps-qol']?.weaponListVisibility && this.rendered && !this._visibilityBusy && !this._visibilityClosed)
        {this.sourceAttacks=collectMeleeAttacks(this.actor);void this._refreshVisibleWeapons();}
    });
  }

  _buildContent(fireState) {
    if (!this._visibleAttacks().length) return `<div class="gam-fire-preparation gam-melee-preparation"><p>${visibilityText('EmptyMelee')}</p>${hiddenWeaponsHTML(this.weaponVisibility,this._visibilityEntries(),'melee','data-melee-action')}<button type="button" data-melee-action="standalone-library" aria-label="${visibilityText('AddToList')}">+</button></div>`;
    const skillPreview = this._getSkillPreview();
    const calculation=this._resolvedMeleeCalculation();
    const techniqueErrors=this.element?.querySelector('[data-melee-technique-errors]');
    if(techniqueErrors)techniqueErrors.textContent=calculation?.metadata.meleeTechniques?.errors.join(' ')??'';
    const baseSkill = calculation?.baseSkill;
    const baseSkillText = Number.isFinite(baseSkill) ? String(baseSkill) : "-";
    const maneuver = this._normalizeManeuverState(calculation?.metadata.beforeDeceptive);
    const deceptiveOptions = this._buildDeceptiveOptions(maneuver.deceptive,maneuver.beforeDeceptive);
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
              ${this.sourceAttack?.unarmedRef&&this.sourceAttack.unarmedRef.profile?.part!=='accessory'?'':weaponWeightControls(this.actor,this._visibilityEntry()?.id,{actionAttribute:'data-melee-action'})}
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
            <span class="gam-fire-source-skill">${moduleText('OleGURPS.Strength.BaseLabel')}: <span data-melee-base-skill>${baseSkillText}</span></span>
          </div>
        </div>
        ${this._buildVisibilityContent()}
        <style>${MELEE_TECHNIQUE_CSS}</style><section data-melee-technique-controls>${this._techniquePanelHTML()}</section>
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
                <div class="gam-melee-all-out-controls">
                  <label class="gam-melee-maneuver-toggle">
                  <input type="checkbox" name="allOutAttack" aria-label="Тотальная атака" ${fireState.allOutAttack ? "checked" : ""}>
                  <span>Тотальная атака</span></label>
                  <div class="gam-melee-all-out-variant">
                    <select name="allOutAttackMode" aria-label="Вариант тотальной атаки" ${fireState.allOutAttack ? "" : "disabled"}>
                      <option value="determined" ${fireState.allOutAttackMode === "determined" ? "selected" : ""}>Determined</option>
                      <option value="strong" ${fireState.allOutAttackMode === "strong" ? "selected" : ""}>Strong</option>
                      <option value="double" ${fireState.allOutAttackMode === "double" ? "selected" : ""}>Double</option>
                      <option value="long" ${fireState.allOutAttackMode === "long" ? "selected" : ""}>Long</option>
                    </select>
                    ${fireState.allOutAttack && fireState.allOutAttackMode === 'long' ? meleeOptionHelp('long') : ''}
                  </div>
                </div>
              </div>
              ${this._buildMartialArtsOptions(fireState)}
              ${this._buildAdditionalMeleeOptions()}
              <label class="gam-fire-field gam-melee-deceptive">
                <span>Обманная атака</span>
                <span class="gam-melee-deceptive-controls">
                  <select name="deceptiveAttack" aria-label="Штраф обманной атаки" ${fireState.moveAndAttack && fireState.maEffort!=='charge' || fireState.telegraphicAttack || maneuver.maximum === 0 ? "disabled" : ""}>
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
          <button type="button" data-melee-action="confirm"><i class="fa-solid fa-sword"></i> <span data-melee-confirm-label>Выполнить атаку</span></button>
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

  _registerTargetHook() {
    if(this._targetHookId!=null)return;
    this._targetHookId=globalThis.Hooks?.on('targetToken',user=>{
      if(user!==globalThis.game?.user||this._submitting||this._buildingAttackSnapshots)return;
      if(this.fireState.maAttackOption==='strikeShield'){
        this.fireState.maShieldDisarm=false;
        void this.render({force:true});
      }
      if(this._techniqueSelection?.ids.length||this.fireState.techniqueSequence)this._updateMeleePreview();
    });
  }

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
    let maneuver = this._normalizeManeuverState();
    const evaluateInput = this.element?.querySelector('[name="evaluate"]');
    if (evaluateInput) evaluateInput.disabled = !!this.fireState.telegraphicAttack;
    const base = this.element?.querySelector("[data-melee-base-skill]");
    const calculation=this._resolvedMeleeCalculation();
    if(this.fireState.techniqueSequence)maneuver=this._normalizeManeuverState(calculation?.metadata.beforeDeceptive);
    const techniqueRoot=this.element?.querySelector('[data-melee-technique-controls]');
    const hasSpecialRoll=this._techniqueSelection?.ids.some(id=>getCombatRule(id)?.operation==='SPECIAL_CHECK');
    const techniqueFingerprint=JSON.stringify([this.selectedAttackKey,calculation?.governingSkill,this._currentTechniqueSelection(),
      hasSpecialRoll?this.fireState.manualModifier:null,hasSpecialRoll?calculation?.channels?.map(c=>c.resolvedValue):null,
      [...(globalThis.game?.user?.targets??[])].map(t=>t.id),calculation?.metadata.meleeTechniques?.results.map(r=>[r.id,r.level,r.maximum,r.available,r.reason]),calculation?.metadata.meleeTechniques?.errors]);
    if(techniqueRoot&&techniqueFingerprint!==this._techniqueControlFingerprint){
      techniqueRoot.innerHTML=this._techniquePanelHTML();
      this._techniqueControlFingerprint=techniqueFingerprint;
    }
    const errors=this.element?.querySelector('[data-melee-technique-errors]');if(errors)errors.textContent=[...(calculation?.metadata.meleeTechniques?.errors??[]),calculation?.metadata.meleeSequenceError].filter(Boolean).join(' ');
    const baseSkill = calculation?.baseSkill;
    if (base) {
      base.textContent = Number.isFinite(baseSkill) ? String(baseSkill) : "-";
      base.title=[weaponStrengthExplanation(this.attack?.meleeProfile?.weaponStrength??this.attack?.weaponStrength,{baseLevel:baseSkill}),
        ...(calculation?.metadata.combatPerks??[]).map(perk=>combatPerkLabel(perk))].filter(Boolean).join('\n');
    }

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
      deceptive.innerHTML = this._buildDeceptiveOptions(maneuver.deceptive,maneuver.beforeDeceptive);
      deceptive.value = String(maneuver.deceptive);
      deceptive.disabled = !!this.fireState.moveAndAttack && this.fireState.maEffort!=='charge' ||
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
        class="gam-attack-slot gam-melee-rapid-attack ${meleeSlotColorClass(slot, index)} ${index === this._activeAttackSlot ? "is-active" : ""}"
        title="${escapeHTML(slot.handLabel??slot.label)}" aria-pressed="${index === this._activeAttackSlot}">${escapeHTML(slot.label)}</button>`
    ).join("");
  }

  _getEffectiveDamageOptions() {
    this._refreshStandaloneAttack();
    const metadata=resolveMeleeCombatCalculation(this._getMeleeCalculationOptions())?.metadata;
    return {
      actor: this.actor,
      attack: this.attack,
      techniquePlan:metadata?.meleeTechniques??null,
      maOptions:metadata?.maOptions??null,
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
    if(confirm){
      const context=this._techniqueSelection?.ids.includes('initialCarving')?this._techniqueContext():null;
      const finished=context&&!context.retryCarving&&initialCarvingProgress(this.actor,context).finished;
      const special=this._techniqueSelection?.ids.map(getCombatRule).find(rule=>rule?.specialProfile)?.specialProfile;
      const ownCheck=special&&special.kind!=='attack';
      const confirmation=special?.confirm&&!this._specialConfirmations[special.ref];
      const label=confirm.querySelector('[data-melee-confirm-label]');
      if(label)label.textContent=ownCheck?'Броски в «Активных техниках»':context?context.retryCarving?'Повторить бросок штриха':'Бросок штриха '+context.stroke:'Выполнить атаку';
      confirm.disabled=this._submitting||!!ownCheck||!!confirmation||!!finished||!!resourceReason||this.attack?.meleeProfile?.utExotic?.contactProcedure===true;
      confirm.title=confirmation?special.confirm:finished?'Нажмите «Начать заново» для новой надписи.':resourceReason??(this.attack?.meleeProfile?.utExotic?.contactProcedure?'Подтвердите контакт в редакторе экземпляра.':'');
    }
    this._effectiveDamage = preparedDamage;
    const button=this.element?.querySelector('[data-melee-action="damage"]');
    if(button){button.disabled=!preparedDamage;button.title=preparedDamage?'Бросить текущий урон':reason;}
    const meta = this.element?.querySelector("[data-melee-attack-meta]");
    if (!meta) return;
    const text = this._buildAttackStats(preparedDamage?.formula ?? reason,preparedDamage?.evidence?.techniques?.reach);
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
    if(this.fireState.techniqueSequence)this._saveActiveAttackConfiguration({captureTargets:!this._sequencePreviewRunning&&!this._buildingAttackSnapshots});
    const settings = getMeleeAttackSettings(this._meleeState, this.sourceAttack);
    let changed = false;
    const techniques=this._currentTechniqueSelection();
    techniques.context=structuredClone(this._techniqueSelection?.context??{});
    delete techniques.context.cinematicDefaults;
    delete techniques.context.requestedCombination;
    delete techniques.context.strikeTarget;
    if(techniques.context.strikeGrapple==='newHead')delete techniques.context.strikeGrapple;
    if(this.fireState.techniqueSequence==='combination'){
      techniques.context.combinationLength=this.fireState.combinationLength;
      if(this._requestedCombination)techniques.context.requestedCombination=this._requestedCombination;
    }
    if(this.fireState.techniqueSequence==='dualWeaponAttack')techniques.sequence={kind:'dualWeaponAttack',configurations:this._attackSlotStates.map(c=>this._cloneAttackConfiguration(c))};
    else if(this.fireState.techniqueSequence==='combination'&&this._fixedCombination)techniques.sequence={...this._fixedCombination,configurations:this._attackSlotStates.filter((_,i)=>this._attackSlots[i].type.startsWith('combo')).map(c=>this._cloneAttackConfiguration(c))};
    if(JSON.stringify(settings.techniques??{ids:[],context:{}})!==JSON.stringify(techniques)){
      setMeleeTechniques(this._meleeState,this.sourceAttack,techniques);changed=true;
    }
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
    this.fireState.maPummelConfirmed=false;
    this.fireState.maPummelGuarded=false;
    this._specialConfirmations={};
    if(this.fireState.techniqueSequence&&this._attackSlotStates[this._activeAttackSlot])this._attackSlotStates[this._activeAttackSlot].attackKey=sourceAttack.key;
    this.sourceAttack = sourceAttack;
    this.attack = applyMeleeAttackOverride(sourceAttack, this._meleeState,this.actor);
    this._effectiveDamage = null;
    this._damagePreviewRevision += 1;
    this.targetedAttackContext = createMeleeTargetedAttackContext({ actor: this.actor, attack: this.attack });
    const attackSettings = getMeleeAttackSettings(this._meleeState, sourceAttack);
    this._techniqueSelection=normalizeMeleeTechniques(attackSettings.techniques);
    this.visibility = normalizeVisibility(attackSettings.visibility);
    const saved = attackSettings.governingSkill ?? "";
    this.fireState.governingSpecialty = this._resolveGoverningSkill(saved);
    if(this.fireState.techniqueSequence&&this._attackSlotStates[this._activeAttackSlot]){
      const current=this._attackSlotStates[this._activeAttackSlot];
      const coordinates=Object.fromEntries(['hand','manualTarget','adjacentTargets','encounter'].filter(k=>current.techniques?.context?.[k]!==undefined).map(k=>[k,current.techniques.context[k]]));
      this._techniqueSelection.context={...coordinates,...this._techniqueSelection.context};
      current.governingSpecialty=this.fireState.governingSpecialty;current.techniques=normalizeMeleeTechniques(this._techniqueSelection);
      current.rapidStrikeMastery=attackSettings.rapidStrikeMastery===true;
    }
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


  _createAttackSnapshots({preview=false}={}) {
    if (this.weaponVisibility && !this._visibleAttacks().some(a=>a.key===this.selectedAttackKey)) throw Error(visibilityText('Empty'));
    this._refreshStandaloneAttack();
    if (this.attack?.readinessReason) throw new Error(this.attack.readinessReason);
    assertMeleeTechniqueReady(this.actor,this.attack,this._techniqueSelection?.context?.manualTurn);
    if(this._techniqueSelection?.ids.includes('reverseGrip'))throw Error('Для Reverse Grip используйте отдельный бросок быстрой смены хвата; обычная атака не выполняет перехват.');
    this._saveActiveAttackConfiguration({captureTargets:!preview});
    const previousActive = this._activeAttackSlot;
    const snapshots = [];
    const maManeuverEffort={};
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
        let calculationOptions=this._getMeleeCalculationOptions();
        const maSelection=this._maState();
        let feint=null;
        if(maSelection.feintSlot&&this._attackSlots.length>1&&!slot.type.startsWith('combo')&&!slot.type.startsWith('dwa')){
          const result=resolveCombatTechnique('feint',{...calculationOptions,
            context:{...calculationOptions.meleeTechniques?.context,specialFeint:maSelection.feintSlot}});
          const check=result?.special?.rolls?.[0];
          if(!result?.available||!Number.isFinite(check?.level))throw Error(result?.reason??'Feint (B365)');
          feint={name:maSelection.feintSlot==='feint'?'Feint':maSelection.feintSlot==='defensive'?'Defensive Feint':
            maSelection.feintSlot[0].toUpperCase()+maSelection.feintSlot.slice(1), base:check.level,
            skill:result.special.selectedSkill};
          calculationOptions={...calculationOptions,baseSkill:check.level,meleeTechniques:null,weaponBond:false,
            hitLocationPenalty:0,hitLocationBasePenalty:0,telegraphicAttack:false,targetedAttack:null,
            deceptiveAttack:0,precisionPenalty:0,maOptions:{...maSelection,spend:false}};
        }
        const combatCalculation = resolveMeleeCombatCalculation(calculationOptions);
        const option=combatCalculation?.metadata.maOptions;
        if(option?.error)throw Error(option.error);
        if(combatCalculation?.metadata.meleeTechniques?.available===false)throw Error(combatCalculation.metadata.meleeTechniques.errors.join(' '));
        const special=combatCalculation?.metadata.meleeTechniques?.special?.special;
        if(special?.kind&&special.kind!=='attack')throw Error('Используйте свой бросок в «Активных техниках».');
        if(special?.error)throw Error(special.error);
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
          executionState:captureMeleeExecutionState(this.actor,sourceAttack),
          damageOptions: this._getEffectiveDamageOptions(),
          techniqueTargets:(this._attackSlotStates[index]?.targetIds??[]).map(id=>({tokenId:id,actorId:globalThis.canvas?.scene?.tokens?.get?.(id)?.actorId??null})),
          skillCap: combatCalculation.metadata.meleeCaps.some(cap=>cap.maximum===9) ? 9 : null,
          selectedAttack: globalThis.foundry?.utils?.deepClone?.(this.attack) ?? structuredClone(this.attack),
          governingSkill: this.fireState.governingSpecialty,
          governingSkillInfo:combatCalculation.governingSkill,
          targetIds:[...(this._attackSlotStates[index]?.targetIds??[])],
          techniqueContext:this._currentTechniqueSelection().context,
          hand:slot.hand??this._currentTechniqueSelection().context.hand??'main',
          baseSkill: combatCalculation.baseSkill,
          effectiveSkill,
          combatCalculation,
          calculationOptions,
          maSelection, feint,
          maManeuverEffort,
          hitLocation: { ...(randomLocation||combatCalculation.metadata.meleeTechniques?.fixedLocation ? locationResult.selection : this.fireState.hitLocation) },
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
            ...martialNotes,
            ...(combatCalculation.metadata.combatPerks??[]).map(perk=>escapeHTML(combatPerkLabel(perk)))].filter(Boolean).join("<br>")+
            meleeTechniqueExplanation(combatCalculation.metadata.meleeTechniques,escapeHTML),
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
      if(!preview){this._refreshHitLocationContent();this._updateMeleePreview();}
    }
    const sequence=this._applyTechniqueSequence(snapshots,{fix:this._fixingCombination===true});
    if(!preview&&sequence.some(slot=>slot.maSelection?.extraAttack)){
      const used = new Set();
      const unready = new Set();
      for(const slot of sequence){
        const rank=slot.maSelection?.extraAttack;
        const attack=slot.selectedAttack;
        const key=attack.unarmedRef?
          'body:'+String(attack.unarmedRef.profile?.part??attack.unarmedRef.id)+':'+slot.hand:
          physicalMeleeIdentity(attack);
        const skill=techniqueIdentity(slot.feint?.skill??slot.governingSkillInfo?.name);
        if(rank&&(rank.unresolvedSpecialization||rank.singleSkill&&!([skill,meleeSkillFamily({name:skill})].includes(rank.singleSkill)))){
          throw Error(slot.label+' – '+(maRussian()?'Нужен указанный в преимуществе навык.':'The advantage requires its specified skill.')+' (MA44).');
        }
        if(rank&&!rank.multiStrike&&used.has(key)&&!slot.feint){
          throw Error(slot.label+' – '+(maRussian()?'Нужен другой экземпляр оружия или другая конечность.':
            'Use a different weapon or limb.')+' (B53, MA44).');
        }
        if(unready.has(key))throw Error(slot.label+' – '+(maRussian()?'Оружию требуется Ready после предыдущей атаки.':
          'This weapon requires Ready after the preceding attack.')+' (MA127).');
        if(!slot.feint){
          used.add(key);
          if(attack.meleeProfile?.strength?.ready)unready.add(key);
        }
      }
    }
    return sequence;
  }

  _sequenceSteps(snapshots){
    return snapshots.filter(s=>this.fireState.techniqueSequence==='dualWeaponAttack'?s.type.startsWith('dwa'):s.type.startsWith('combo')).map(s=>{
      const location=s.targetingService.getSelection(s.hitLocation.zoneId,s.hitLocation.regionId),attack=s.selectedAttack;
      const effects=s.combatCalculation.metadata.meleeTechniques?.results.filter(r=>['hammerFist','kicking','backKick','backStrike','crack','pressurePointStrike','initialCarving'].includes(r.id))??[];
      const attackName=effects.length?effects.map(r=>r.id==='kicking'?'Kick':r.id==='initialCarving'?'Initial Carving ('+s.techniqueContext.letter+', '+s.techniqueContext.stroke+')':r.name).join(' + '):(attack.unarmedRef?(attack.meleeProfile?.attackType==='kick'?'Kick':'Punch'):
        attack.meleeProfile?.motion==='swing'?'Swing':attack.meleeProfile?.motion==='thrust'?'Thrust':attack.mode);
      const ids=s.targetIds??[],manual=s.techniqueContext.manualTarget;
      if(ids.length>1)throw Error('Для каждого шага выберите одну цель.');
      if(ids.some(id=>!globalThis.canvas?.scene?.tokens?.get?.(id)))throw Error('Сохранённая цель отсутствует на текущей сцене; выберите цель этого шага заново.');
      const targetId=ids[0]??(manual?'manual:'+manual:null);if(!targetId)throw Error('Для последовательности нужна цель Token или явный ручной ID.');
      const rawKey=location?.canonicalKeys?.[0]??location?.canonicalKey??s.hitLocation.zoneId;
      const hands=meleeAttackUsesHand(attack)?attack.meleeProfile?.strength?.hands??attack.meleeProfile?.hands?.hands??s.techniqueContext.weaponHands??(attack.unarmedRef?1:null):0;
      return {snapshot:s,actor:this.actor,attack,attackName,skill:s.governingSkillInfo,
        targetId,targetKey:String(rawKey).replace(/(^|[- ])\w/g,v=>v.toUpperCase()),randomLocation:s.randomLocation,
        effectiveSkill:s.combatCalculation.metadata.beforeDeceptive??s.effectiveSkill,masteryContext:s.techniqueContext,hand:meleeAttackUsesHand(attack)&&hands!==2?s.hand:'none',hands,
        grapple:!attack.damage};
    });
  }

  _applyTechniqueSequence(snapshots,{fix=false}={}){
    if(!this.fireState.techniqueSequence)return snapshots;
    const steps=this._sequenceSteps(snapshots),mode=this.fireState.techniqueSequence;
    const targets=new Set(steps.map(s=>s.targetId));
    const adjacent=targets.size<=1||steps.every(s=>s.snapshot.techniqueContext.adjacentTargets===true);
    let sequence;
    if(mode==='dualWeaponAttack')sequence=validateDualWeaponSequence({actor:this.actor,steps,rapidStrike:this.fireState.rapidStrike,adjacent});
    else{
      if(!fix&&!this._fixedCombination)throw Error('Сначала закрепите состав и порядок Combination.');
      if(!adjacent)throw Error('Пропуски между целями расходуют атаки (MA127) и нарушают фиксированную Combination. Подтвердите смежность целей.');
      sequence=resolveCombination({actor:this.actor,steps,rapidStrike:this.fireState.rapidStrike,
        fixedName:fix?this._requestedCombination:this._fixedCombination?.name});
    }
    if(!sequence.available)throw Error(sequence.errors.join(' '));
    const signature=JSON.stringify(steps.map(s=>[s.skill.name,s.attackName,s.targetKey,s.hand]));
    if(mode==='combination'&&!fix&&this._fixedCombination.signature&&this._fixedCombination.signature!==signature)throw Error('Изменены атаки, руки или зоны фиксированной Combination; закрепите новый состав.');
    const encounter=globalThis.game?.combat?.id??this.actor?.getFlag?.('olegurps-qol','meleeTechniqueEncounter')??steps[0]?.snapshot.techniqueContext.encounter??'manual';
    const group=generateId(globalThis,{preferFoundry:true});
    for(const [index,s] of steps.entries()){
      const snapshot=s.snapshot;
      snapshot.hand=s.hand;
      const extra=mode==='combination'?sequence.steps[index].modifier+offHandAttackPenalty(this.actor,s.attack,s.skill,s.hand):offHandAttackPenalty(this.actor,s.attack,s.skill,s.hand);
      const included=s.hand==='off'&&!s.attack.unarmedRef&&!isCleanTechniqueAttack(s.attack)?snapshot.techniqueContext.offHandIncluded:null;
      if(s.hand==='off'&&!s.attack.unarmedRef&&!isCleanTechniqueAttack(s.attack)&&!Number.isFinite(included))throw Error('Неизвестно, включён ли off-hand штраф в исходный уровень. Укажите его явно.');
      if(Number.isFinite(included)&&(included>0||included<-4))throw Error('Уже учтённый off-hand штраф должен быть от -4 до 0.');
      const transmittedExtra=extra-(Number.isFinite(included)?included:0);
      const selection=snapshot.calculationOptions.meleeTechniques;
      const sequenceOptions={...snapshot.calculationOptions,meleeTechniques:{...selection,context:{...selection?.context,sameDualWeaponTarget:sequence.sameTarget===true}},
        sequenceModifier:{id:mode==='combination'?'combination':'offHand',label:mode==='combination'?'Combination':'Другая рука',value:transmittedExtra}};
      snapshot.combatCalculation=resolveMeleeCombatCalculation(sequenceOptions);
      if(sequence.steps[index].perks?.length)snapshot.combatCalculation.metadata.combatPerks=[
        ...(snapshot.combatCalculation.metadata.combatPerks??[]),...sequence.steps[index].perks];
      snapshot.combatCalculation.metadata.meleeSequence=structuredClone(sequence);
      snapshot.effectiveSkill=snapshot.combatCalculation.effectiveSkill;
      snapshot.deceptiveAttack=snapshot.combatCalculation.metadata.deceptivePenalty;
      snapshot.deceptiveDefensePenalty=getDeceptiveDefensePenalty(snapshot.deceptiveAttack);
      snapshot.telegraphicCriticalBonus=getTelegraphicCriticalBonus(sequenceOptions);
      snapshot.modifierDetails=snapshot.combatCalculation.modifiers.filter(m=>m.value).map(m=>({label:m.explanation||m.label,value:m.value}));
      snapshot.sequence={version:1,id:group,kind:mode,index,length:steps.length,name:sequence.name??'Dual-Weapon Attack',targetId:s.targetId,encounter:encounter??null,
        defenseModifier:mode==='dualWeaponAttack'?sequence.defenseModifier:0,sources:sequence.sources,definition:structuredClone(sequence)};
      snapshot.damageOptions={...snapshot.damageOptions,sequence:snapshot.sequence,techniquePlan:snapshot.combatCalculation.metadata.meleeTechniques};
      snapshot.overrideText+='<details class="olegurps-chat-details"><summary>Последовательность</summary><p>'+escapeHTML(snapshot.sequence.name)+'; '+(index+1)+'/'+steps.length+'; '+extra+'. '+escapeHTML(sequence.sources.join('; '))+'</p></details>';
    }
    if(fix){this._fixedCombination={kind:'combination',name:sequence.name,signature,configurations:this._attackSlotStates.filter((_,i)=>this._attackSlots[i].type.startsWith('combo')).map(c=>this._cloneAttackConfiguration(c))};}
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
      if(this._techniqueSelection?.ids.includes('initialCarving')&&!this._techniqueSelection.context.carvingId){
        this._techniqueSelection.context.carvingId=generateId();
        await this._persistCurrentPreferences();
      }
      let snapshots = this._createAttackSnapshots();
      if(this._techniqueSelection.ids.includes('whirlwindAttack')){
        if(snapshots.length!==1)throw Error('Whirlwind Attack занимает весь манёвр.');
        const context=snapshots[0].techniqueContext;
        const targets=orderedWhirlwindTargets({actor:this.actor,tokens:[...(globalThis.game?.user?.targets??[])],
          direction:context.strikeDirection,confirmed:context.strikeWhirlwind,theaterNames:context.strikeFoes,
          actors:globalThis.game?.actors?.contents??[]});
        snapshots=await buildWhirlwindSlots(snapshots[0],targets,context.strikeDirection);
      }
      this._pairEarClaps(snapshots);
      let movementConfirmation=false;
      const single=snapshots.length===1&&!snapshots[0].sequence;
      if (single) {
        const result=await executeMeleeAttackSnapshot(snapshots[0]);
        movementConfirmation=result.movementConfirmation===true;
        if(movementConfirmation)snapshots[0].movementConfirmation=true;
        if(result.message)delete this._specialConfirmations.Counterattack;
        if(result.message)this._retryCarving=null;
        if(result.message&&snapshots[0].techniqueContext.strikeGrapple==='newHead'){
          this._techniqueSelection.context.strikeGrapple='';
          this.fireState.allOutAttack=false;
          this._refreshAttackSlots();
          await this._persistCurrentPreferences();
          await this.render({force:true});
        }
      }
      if(!single||movementConfirmation){
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
      notifyMeleeExecutionError(error);
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updateMeleePreview();
    }
  }

  _pairEarClaps(snapshots){
    const effect=snapshot=>snapshot.combatCalculation.metadata.meleeTechniques?.strikes?.find(strike=>strike.procedure==='ear');
    if(!snapshots.some(snapshot=>snapshot.techniqueContext.strikeTwoEars&&effect(snapshot)))return;
    const steps=snapshots.filter(snapshot=>effect(snapshot));
    const targets=steps.map(snapshot=>effect(snapshot).target);
    if(steps.length!==2||!targets[0]?.actorId||targets.some(target=>target.actorId!==targets[0].actorId||target.tokenId!==targets[0].tokenId))throw Error('Для двойного Ear Clap нужны два удара по одной выбранной цели.');
    if(steps.some(snapshot=>!snapshot.selectedAttack.unarmedRef))throw Error('Для двойного Ear Clap нужны две свободные пустые руки.');
    const id=generateId();
    steps.forEach((snapshot,index)=>{
      snapshot.earPair={id,index,length:2};
      if(!snapshot.sequence){
        snapshot.sequence={kind:'earClap',id,index,length:2,name:'Ear Clap',targetId:targets[index].tokenId??targets[index].actorId,
          sources:['MA70'],defenseModifier:0};
      }
    });
  }

  async _onInput(event) {
    const maField = event.target;
    if (['maMovement','maMovementConfirmed','maEffort','maFloorLunge','maSpendEffort','maRapidCount','maFeintSlot',
      'maAttackOption','maAttackOptionConfirmed','maPummelConfirmed','maPummelGuarded','maShinArmor','maShieldDB','maShieldHandheld','maShieldDisarm',
      'maStunt','maStuntPenalty','maStuntRebounds','maEvadeJump','maStanding','maByLegs','maSwingNeedsJump','useExtraAttacks'].includes(maField?.name)) {
      if (event.type !== 'change') return;
      if (maField.name === 'maSpendEffort') this._attackSlotStates[this._activeAttackSlot].spendEffort=maField.checked;
      else if (maField.name === 'maFeintSlot') this._attackSlotStates[this._activeAttackSlot].feintSlot=maField.value;
      else this.fireState[maField.name]=maField.type==='checkbox'?maField.checked:maField.value;
      if(maField.name==='maMovement')this.fireState.maMovementConfirmed=false;
      if(maField.name==='maStunt'){
        delete this.fireState.maStuntPenalty;
        this.fireState.maMovementConfirmed=false;
      }
      if(maField.name==='maAttackOption'){
        this.fireState.maAttackOptionConfirmed=false;
        this.fireState.maPummelConfirmed=false;
        this.fireState.maPummelGuarded=false;
      }
      if(maField.name==='maShieldHandheld'&&!maField.checked)this.fireState.maShieldDisarm=false;
      if(maField.name==='maRapidCount'||maField.name==='useExtraAttacks')this._refreshAttackSlots();
      await this.render({force:true});
      return;
    }
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!field) return;
    if(field.name==='meleeTechniqueSearch'){
      this._techniquePicker.query=field.value;
      filterMeleeTechniquePicker(field);
      return;
    }
    if(field.dataset.meleeTechniqueContext||field.dataset.meleeTechniqueIncluded||field.dataset.meleeTechniqueDamageIncluded){
      if(event.type!=='change')return;
      if(field.dataset.meleeTechniqueIncluded||field.dataset.meleeTechniqueDamageIncluded){const name=field.dataset.meleeTechniqueIncluded?'includedModifiers':'includedDamage',id=field.dataset.meleeTechniqueIncluded??field.dataset.meleeTechniqueDamageIncluded;
        this._techniqueSelection.context[name]??={};if(field.value==='')delete this._techniqueSelection.context[name][id];else this._techniqueSelection.context[name][id]=Number(field.value);}
      else{
        const [key,value]=readTechniqueContextField(field);
        const context=this._techniqueSelection.context;
        if(key==='letter'){
          const letter=value.trim().toUpperCase();
          if(letter!==(context.letter??'')){context.carvingId=generateId();this._retryCarving=null;}
          context.letter=letter;
        }else if(key.startsWith('strikeSkill:')){
          context.strikeSkills??={};
          const id=key.slice('strikeSkill:'.length);
          if(value)context.strikeSkills[id]=value;else delete context.strikeSkills[id];
        }else if(key.startsWith('specialSkill:')){
          context.specialSkills??={};
          context.specialSkills[key.slice('specialSkill:'.length)]=value;
        }else if(key.startsWith('specialConfirm:')){
          this._specialConfirmations[key.slice('specialConfirm:'.length)]=value;
          this._updateMeleePreview();
          return;
        }else{
          context[key]=value;
          if(key==='strikeGrapple'){
            if(value==='newHead'){
              this.fireState.allOutAttack=true;
              this.fireState.allOutAttackMode='double';
              this.fireState.moveAndAttack=false;
              this.fireState.committedAttack=false;
              this.fireState.defensiveAttack=false;
              this.fireState.rapidStrike=false;
            }
            this._refreshAttackSlots();
          }
        }
      }
      await this._persistCurrentPreferences();this._saveActiveAttackConfiguration();await this.render({force:true});this._updateMeleePreview();return;
    }
    if(field.name==='meleeCombinationLength'){
      this.fireState.combinationLength=Number(field.value)===3?3:2;this._fixedCombination=null;this._refreshAttackSlots();await this._persistCurrentPreferences();await this.render({force:true});return;
    }
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
        if (!allOutMeleeModes.includes(this.fireState.allOutAttackMode)) {
          this.fireState.allOutAttackMode = "determined";
        }
      }
      this._refreshAttackSlots();
    } else if (field.name === "allOutAttackMode") {
      this.fireState.allOutAttackMode = allOutMeleeModes.includes(field.value)
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
    if(this.rendered&&['moveAndAttack','rapidStrike','allOutAttack','allOutAttackMode','committedAttack','defensiveAttack'].includes(field.name))
      await this.render({force:true});
  }

  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const picker=target?.closest('[data-technique-picker]');
    if(picker){
      const mode=picker.dataset.techniquePicker;
      this._techniquePicker=this._techniquePicker?.mode===mode?null:{mode,query:''};
      const root=this.element.querySelector('[data-melee-technique-controls]');
      root.innerHTML=this._techniquePanelHTML();
      root.querySelector('[name="meleeTechniqueSearch"]')?.focus();
      return;
    }
    const add=target?.closest('[data-melee-technique-add]');
    if(add){
      const id=add.dataset.meleeTechniqueAdd,rule=getCombatRule(id);
      if(add.dataset.strikeSkill){
        this._techniqueSelection.context.strikeSkills??={};
        this._techniqueSelection.context.strikeSkills[id]=add.dataset.strikeSkill;
      }
      if(!rule?.meleePenalty&&rule?.operation!=='SEQUENCE')return;
      if(rule.specialProfile){
        const idSet=this._techniqueSelection.ids;
        this._techniqueSelection.ids=idSet.filter(current=>!getCombatRule(current)?.specialProfile||current===id);
        const context=this._techniqueSelection.context;
        context.specialSkills??={};
        if(add.dataset.specialSkill)context.specialSkills[id]=add.dataset.specialSkill;else delete context.specialSkills[id];
        delete this._specialConfirmations[rule.specialProfile.ref];
      }
      this._techniquePicker=null;
      this._activeTechniquesOpen=true;
      if(!this._techniqueSelection.ids.includes(id))this._techniqueSelection.ids.push(id);
      const context=this._techniqueSelection.context;
      if(id==='initialCarving'){
        const letter=add.dataset.techniqueLetter??'';
        if(!context.carvingId||letter!==(context.letter??'')){
          context.carvingId=generateId();
          this._retryCarving=null;
        }
        context.letter=letter;
      }
      if(id==='combination'||id==='dualWeaponAttack'){
        this.fireState.techniqueSequence=id;
        this._requestedCombination=add.dataset.techniqueRecipe??null;
        if(this._requestedCombination)this.fireState.combinationLength=Number(add.dataset.techniqueCount);
        if(!this._requestedCombination||techniqueIdentity(this._fixedCombination?.name)!==techniqueIdentity(this._requestedCombination))this._fixedCombination=null;
        this._refreshAttackSlots();
      }
      await this._persistCurrentPreferences();
      await this.render({force:true});
      this._updateMeleePreview();
      return;
    }
    const techniqueAction=target?.closest('[data-melee-technique-action]');
    if(techniqueAction?.dataset.meleeTechniqueAction==='special-roll'){
      if(this._submitting)return;
      this._submitting=true;
      techniqueAction.disabled=true;
      try{
        this._captureFields();
        this._refreshStandaloneAttack();
        const options=this._getMeleeCalculationOptions();
        const plan=resolveMeleeCombatCalculation(options)?.metadata.meleeTechniques;
        const result=plan?.special;
        if(!plan?.available||result?.id!==techniqueAction.dataset.specialId)
          throw Error(plan?.errors.join(' ')||'Выберите особую технику.');
        const roll=meleeSpecialRollPreviews(options,result.special).find(step=>step.id===techniqueAction.dataset.specialRoll);
        const shin=result.id==='jam'&&options.maOptions?.attackOption==='shin'?
          maProjectedAttack(options,{strikes:[{id:'jam'}]}):null;
        if(shin?.error)throw Error(shin.error);
        await executeMeleeSpecialCheck({actor:this.actor,attack:options.attack,result,roll,shin});
      }catch(error){ui.notifications.error(error.message);}
      finally{this._submitting=false;if(techniqueAction.isConnected)techniqueAction.disabled=false;}
      return;
    }
    if(['new-carving','retry-carving','new-encounter','ordinary-mounted'].includes(techniqueAction?.dataset.meleeTechniqueAction)){
      const action=techniqueAction.dataset.meleeTechniqueAction,context=this._techniqueSelection.context;
      if(action==='new-encounter')await this.actor.setFlag('olegurps-qol','meleeTechniqueEncounter',generateId());
      if(action==='new-carving'){context.carvingId=generateId();this._retryCarving=null;}
      if(action==='retry-carving')this._retryCarving=context.carvingId;
      if(action==='ordinary-mounted')context.mountedStyle='ordinary';
      await this._persistCurrentPreferences();
      await this.render({force:true});
      return;
    }
    if(['reverse-grip','pickup-ready','advance-turn'].includes(techniqueAction?.dataset.meleeTechniqueAction)){
      techniqueAction.disabled=true;
      try{
        const options=this._getMeleeCalculationOptions();
        if(techniqueAction.dataset.meleeTechniqueAction==='advance-turn')await advanceMeleeTechniqueTurn(this.actor,generateId());
        else if(techniqueAction.dataset.meleeTechniqueAction==='pickup-ready')await acknowledgeTechniqueReady(this.actor,this.attack,options.meleeTechniques.context.manualTurn);
        else{
          const result=await attemptReverseGrip({actor:this.actor,attack:this.attack,skill:options.governingSkill,context:options.meleeTechniques.context});
          if(result.success)this._techniqueSelection.ids=this._techniqueSelection.ids.filter(id=>id!=='reverseGrip');
        }
        this._refreshStandaloneAttack();await this._persistCurrentPreferences();await this.render({force:true});
      }catch(error){ui.notifications.error(moduleMessage(error));}finally{techniqueAction.disabled=false;}return;
    }
    if(techniqueAction?.dataset.meleeTechniqueAction==='fix-combination'){
      try{this._fixingCombination=true;this._createAttackSnapshots();await this._persistCurrentPreferences();await this.render({force:true});}
      catch(error){ui.notifications.error(moduleMessage(error));}finally{this._fixingCombination=false;}return;
    }
    const remove=target?.closest('[data-melee-technique-remove]');
    if(remove){const id=remove.dataset.meleeTechniqueRemove;this._techniqueSelection.ids=this._techniqueSelection.ids.filter(value=>value!==id);if(id===this.fireState.techniqueSequence){this.fireState.techniqueSequence=null;this._fixedCombination=null;this._refreshAttackSlots();}await this._persistCurrentPreferences();await this.render({force:true});return;}
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
    if(['weight-backpack','weight-edit'].includes(action)){
      const id=this._visibilityEntry()?.id;
      if(action==='weight-edit')return openWeaponWeightEditor(this.actor,id);
      await setWeaponBackpack(this.actor,id,readWeaponWeightState(this.actor,id).backpack===false);return;
    }
    if (['hide-weapon','restore-weapon','restore-all-weapons','import-legacy-visibility'].includes(action)) {
      if (this._visibilityBusy) return;
      this._visibilityBusy = true; button.disabled = true;
      try {
        await this.weaponVisibility.change(action === 'import-legacy-visibility'?'import-legacy':action === 'hide-weapon' ? 'hide' : action === 'restore-weapon' ? 'restore' : 'restore-all',
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
