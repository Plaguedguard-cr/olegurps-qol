import { FirePreparationApp } from "./fire-preparation-app.js";
import { TargetingService } from "./targeting-service.js";
import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { createMeleeTargetedAttackContext } from "./targeted-attack-service.js";
import { openMeleeAttackEditor } from "./melee-attack-editor.js";
import {
  applyMeleeAttackOverride,
  clearMeleeAttackOverride,
  getMeleeAttackSettings,
  normalizeMeleeAssistantState,
  setMeleeAttackOverride,
  setMeleeDicePlusAdds,
  setMeleeGoverningSkill,
  setMeleeRapidStrikeMastery,
  setSelectedMeleeAttack
} from "./melee-assistant-state.js";
import {
  calculateMeleeEffectiveSkill,
  calculateMeleeSkillBeforeDeceptive,
  executeNativeMeleeAttack,
  executeNativeMeleeDamage,
  getDeceptiveDefensePenalty,
  getEvaluateBonus,
  getMaximumDeceptiveAttackPenalty,
  getRapidStrikePenalty,
  normalizeDeceptiveAttackPenalty,
  prepareEffectiveMeleeDamage
} from "./melee-service.js";

const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

export class MeleeAssistantApp extends FirePreparationApp {
  static DEFAULT_OPTIONS = {
    id: "olegurps-melee-assistant",
    classes: ["olegurps-qol", "fire-preparation", "melee-assistant"],
    tag: "section",
    window: { title: "Melee Assistant", resizable: true },
    position: { width: 1120, height: "auto" }
  };

  constructor({ token, actor, sourceAttacks, state, stateService, selectedAttackKey,
    targetingService, targetedAttackContext, initialGoverningSkill = "", onBodyplanChange, onClose }, options = {}) {
    const sourceAttack = sourceAttacks.find(entry => entry.key === selectedAttackKey) ?? sourceAttacks[0];
    const attack = applyMeleeAttackOverride(sourceAttack, state);
    super({
      mode: "melee",
      token,
      weapon: { id: "melee-" + actor.id, name: "Melee Assistant" },
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
      onClose
    }, {
      ...options,
      id: options.id ?? "olegurps-melee-assistant-" + token.id,
      window: { title: "Melee Assistant - " + actor.name, resizable: true, ...(options.window ?? {}) }
    });
    this.actor = actor;
    this.sourceAttacks = sourceAttacks;
    this._meleeState = state;
    this.stateService = stateService;
    this._stateSaveQueue = Promise.resolve();
    this.selectedAttackKey = sourceAttack.key;
    this.sourceAttack = sourceAttack;
    this.attack = attack;
    this.calculateEffectiveSkill = () => this._calculateEffectiveSkill();
    this.fireState.evaluate = "";
    this.fireState.dicePlusAdds = state.dicePlusAdds === true;
    this.fireState.allOutAttack = false;
    this.fireState.allOutAttackMode = "determined";
    this.fireState.deceptiveAttack = "0";
    this.fireState.governingSpecialty = this._resolveGoverningSkill(initialGoverningSkill);
    this.fireState.rapidStrikeMastery =
      getMeleeAttackSettings(state, sourceAttack).rapidStrikeMastery === true;
    this.fireState.rapidStrike = false;
    this._rapidStrikeActive = 0;
    this._rapidStrikeStates = null;
    this._singleAttackState = this._snapshotAttackConfiguration();
    this._effectiveDamage = null;
    this._damagePreviewRevision = 0;
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
      hitLocation: { ...(this.fireState.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _cloneAttackConfiguration(configuration) {
    return {
      manualModifier: String(configuration?.manualModifier ?? ""),
      deceptiveAttack: String(configuration?.deceptiveAttack ?? "0"),
      hitLocation: { ...(configuration?.hitLocation ?? this.targetingService.getDefaultSelection()) }
    };
  }

  _applyAttackConfiguration(configuration) {
    const state = this._cloneAttackConfiguration(configuration);
    const selection = this.targetingService.getSelection(state.hitLocation.zoneId, state.hitLocation.regionId);
    this.fireState.manualModifier = state.manualModifier;
    this.fireState.deceptiveAttack = state.deceptiveAttack;
    this.fireState.hitLocation = selection
      ? { zoneId: selection.zoneId, regionId: selection.regionId ?? null }
      : { ...this.targetingService.getDefaultSelection() };
  }

  _saveActiveAttackConfiguration() {
    const snapshot = this._snapshotAttackConfiguration();
    if (this.fireState.rapidStrike && this._rapidStrikeStates) {
      this._rapidStrikeStates[this._rapidStrikeActive] = snapshot;
    } else {
      this._singleAttackState = snapshot;
    }
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
    this._singleAttackState = normalize(this._singleAttackState);
    if (this._rapidStrikeStates) this._rapidStrikeStates = this._rapidStrikeStates.map(normalize);
  }

  _setRapidStrikeEnabled(enabled) {
    const next = enabled === true;
    if (next === this.fireState.rapidStrike) return;
    this._saveActiveAttackConfiguration();
    if (next) {
      const initial = this._cloneAttackConfiguration(this._singleAttackState);
      this._rapidStrikeStates ??= [
        this._cloneAttackConfiguration(initial),
        this._cloneAttackConfiguration(initial)
      ];
      this.fireState.rapidStrike = true;
      this.fireState.moveAndAttack = false;
      this._rapidStrikeActive = 0;
      this._applyAttackConfiguration(this._rapidStrikeStates[0]);
    } else {
      this.fireState.rapidStrike = false;
      this._applyAttackConfiguration(this._singleAttackState);
    }
  }

  _switchRapidStrikeAttack(index) {
    if (!this.fireState.rapidStrike || !this._rapidStrikeStates) return;
    const next = Number(index) === 1 ? 1 : 0;
    this._saveActiveAttackConfiguration();
    this._rapidStrikeActive = next;
    this._applyAttackConfiguration(this._rapidStrikeStates[next]);
    this._refreshHitLocationContent();
    this._updateMeleePreview();
  }

  _getRapidStrikePenalty() {
    return this.fireState.rapidStrike
      ? getRapidStrikePenalty(this.fireState.rapidStrikeMastery)
      : 0;
  }

  _getHitLocationMarkers(zoneId, regionId = null) {
    if (!this.fireState.rapidStrike || !this._rapidStrikeStates) return [];
    return this._rapidStrikeStates.flatMap((configuration, index) => {
      const selection = configuration?.hitLocation;
      const matchesZone = selection?.zoneId === zoneId;
      const matchesRegion = regionId === null || !selection?.regionId || selection.regionId === regionId;
      if (!matchesZone || !matchesRegion) return [];
      return [{
        className: "gam-rapid-attack-" + (index + 1) + (index === this._rapidStrikeActive ? " is-active" : ""),
        label: "Атака " + (index + 1)
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
      rapidStrike: this.fireState.rapidStrike,
      rapidStrikeAttack: this._rapidStrikeActive + 1,
      bodyplanId: this.fireState.bodyplanId,
      hitLocationId: this.fireState.hitLocation.zoneId,
      hitRegionId: this.fireState.hitLocation.regionId
    };
  }

  _getSelectedLocation() {
    return this.targetingService.getSelection(this.fireState.hitLocation.zoneId, this.fireState.hitLocation.regionId)
      ?? this.targetingService.getSelection("silhouette");
  }

  _getLocationResult() {
    const selection = this._getSelectedLocation();
    const zone = this.targetingService.getZone(selection?.zoneId);
    const targetedAttack = this.targetedAttackContext?.resolve({
      specialty: this.fireState.governingSpecialty,
      target: selection?.canonicalKeys ?? [selection?.canonicalKey, ...(zone?.taAliases ?? [])],
      basePenalty: selection?.penalty ?? 0
    }) ?? null;
    return {
      selection,
      targetedAttack,
      penalty: targetedAttack?.effectivePenalty ?? selection?.penalty ?? 0
    };
  }

  _getBaseSkillLevel() {
    const governingLevel = this.targetedAttackContext?.getSkillLevel?.(this.fireState.governingSpecialty);
    if (Number.isFinite(governingLevel)) return governingLevel;
    const attackLevel = Number(this.attack?.level);
    return Number.isFinite(attackLevel) ? Math.trunc(attackLevel) : null;
  }

  _getMeleeCalculationOptions() {
    return {
      baseSkill: this._getBaseSkillLevel(),
      manualModifier: this.fireState.manualModifier,
      evaluate: this.fireState.evaluate,
      moveAndAttack: this.fireState.moveAndAttack,
      allOutAttack: this.fireState.allOutAttack,
      allOutAttackMode: this.fireState.allOutAttackMode,
      deceptiveAttack: this.fireState.deceptiveAttack,
      hitLocationPenalty: this._getLocationResult().penalty,
      rapidStrikePenalty: this._getRapidStrikePenalty()
    };
  }

  _normalizeManeuverState() {
    if (!["determined", "strong"].includes(this.fireState.allOutAttackMode)) {
      this.fireState.allOutAttackMode = "determined";
    }
    if (this.fireState.rapidStrike) this.fireState.moveAndAttack = false;
    if (this.fireState.moveAndAttack) {
      this.fireState.allOutAttack = false;
      this.fireState.deceptiveAttack = "0";
    }
    const options = this._getMeleeCalculationOptions();
    const beforeDeceptive = calculateMeleeSkillBeforeDeceptive(options);
    const deceptive = normalizeDeceptiveAttackPenalty(
      this.fireState.deceptiveAttack,
      beforeDeceptive,
      this.fireState.moveAndAttack
    );
    this.fireState.deceptiveAttack = String(deceptive);
    this._saveActiveAttackConfiguration();
    return {
      beforeDeceptive,
      deceptive,
      defensePenalty: getDeceptiveDefensePenalty(deceptive),
      maximum: getMaximumDeceptiveAttackPenalty(beforeDeceptive, this.fireState.moveAndAttack)
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

  _buildAttackModifierDetails(locationResult, maneuver, effectiveSkill) {
    const integer = value => {
      const number = Number(String(value ?? "").trim().replace(",", "."));
      return Number.isFinite(number) ? Math.trunc(number) : 0;
    };
    const details = [];
    const sourceLevel = integer(this.sourceAttack?.level ?? this.sourceAttack?.import);
    const baseSkill = integer(this._getBaseSkillLevel());
    const governing = this.targetedAttackContext?.specialtyOptions?.find(
      option => option.value === this.fireState.governingSpecialty
    );
    if (baseSkill !== sourceLevel) {
      details.push({
        label: governing ? `Governing skill: ${governing.label}` : "Изменение базового уровня атаки",
        value: baseSkill - sourceLevel
      });
    }

    const manualModifier = integer(this.fireState.manualModifier);
    const evaluateBonus = getEvaluateBonus(this.fireState.evaluate);
    if (manualModifier) details.push({ label: "Бонусы/штрафы", value: manualModifier });
    if (evaluateBonus) details.push({ label: "Оценка", value: evaluateBonus });
    if (this.fireState.allOutAttack && this.fireState.allOutAttackMode === "determined") {
      details.push({ label: "Тотальная атака (Точная)", value: 4 });
    }
    if (this.fireState.moveAndAttack) {
      details.push({ label: "Движение и атака", value: -4 });
    }
    const rapidStrikePenalty = this._getRapidStrikePenalty();
    if (rapidStrikePenalty) {
      details.push({
        label: rapidStrikePenalty === -3 ? "Rapid Strike (WM / TBaM)" : "Rapid Strike",
        value: rapidStrikePenalty
      });
    }

    const locationPenalty = integer(locationResult?.penalty);
    if (locationPenalty) {
      const locationLabel = locationResult?.selection?.label ?? "";
      const techniqueName = locationResult?.targetedAttack?.entry?.name ??
        locationResult?.targetedAttack?.attackVariant;
      const techniqueLabel = techniqueName && /^Targeted Attack\b/iu.test(techniqueName)
        ? techniqueName : (techniqueName ? `Targeted Attack: ${techniqueName}` : "");
      details.push({
        label: techniqueLabel
          ? `${techniqueLabel} / Hit Location: ${locationLabel}`
          : `Hit Location: ${locationLabel}`,
        value: locationPenalty
      });
    }
    if (maneuver.deceptive) {
      details.push({
        label: `Обманная атака (защита цели ${maneuver.defensePenalty})`,
        value: maneuver.deceptive
      });
    }

    const expectedModifier = integer(effectiveSkill) - sourceLevel;
    const describedModifier = details.reduce((total, entry) => total + integer(entry.value), 0);
    const undisclosedModifier = expectedModifier - describedModifier;
    if (undisclosedModifier) {
      details.push({
        label: this.fireState.moveAndAttack
          ? "Ограничение Движения и атаки (макс. 9)"
          : "Коррекция итогового уровня",
        value: undisclosedModifier
      });
    }
    return details;
  }

  _buildAttackStats(damage = this._effectiveDamage?.formula ?? this.attack?.damage) {
    const values = [
      "Урон " + (damage || "-"),
      "Reach " + (this.attack?.reach || "-"),
      "Parry " + (this.attack?.parry || "-")
    ];
    return values.join(" · ");
  }

  _buildGoverningSkillSelector(fireState = this.fireState) {
    const skills = this.targetedAttackContext?.specialtyOptions ?? [];
    const options = skills.map(skill => '<option value="' + escapeHTML(skill.value) + '" ' +
      (fireState.governingSpecialty === skill.value ? "selected" : "") + '>' +
      escapeHTML(skill.label) + '</option>').join("");
    return '<div class="gam-melee-governing-controls">' +
      '<label class="gam-fire-governing-skill">' +
      '<span>Governing skill:</span>' +
      '<select name="governingSpecialty" required aria-label="Governing skill" ' + (skills.length ? "" : "disabled") + '>' +
      '<option value="">' + (skills.length ? "Выберите навык" : "Навыки не найдены") + '</option>' +
      options +
      '</select>' +
      '</label>' +
      '<label class="gam-melee-rapid-mastery" title="Weapon Master / Trained by a Master для выбранной melee-атаки">' +
      '<input type="checkbox" name="rapidStrikeMastery" ' +
      (fireState.rapidStrikeMastery ? "checked" : "") + '>' +
      '<span>WM / TBaM</span>' +
      '</label>' +
      '</div>';
  }
  _buildAttackOptions() {
    return this.sourceAttacks.map(attack => '<option value="' + escapeHTML(attack.key) + '" ' +
      (attack.key === this.selectedAttackKey ? "selected" : "") + '>' + escapeHTML(attack.label) + '</option>').join("");
  }

  _buildContent(fireState) {
    const skillPreview = this._getSkillPreview();
    const baseSkill = this._getBaseSkillLevel();
    const baseSkillText = Number.isFinite(baseSkill) ? String(baseSkill) : "-";
    const evaluateBonus = getEvaluateBonus(fireState.evaluate);
    const maneuver = this._normalizeManeuverState();
    const deceptiveOptions = this._buildDeceptiveOptions(maneuver.deceptive);
    const defenseText = maneuver.defensePenalty === 0 ? "защита 0" : "защита " + maneuver.defensePenalty;
    const attackStats = this._buildAttackStats();
    return `
      <div class="gam-fire-preparation gam-melee-preparation">
        <div class="gam-fire-summary gam-melee-summary">
          <div class="gam-fire-summary-main">
            <div class="gam-melee-attack-row">
              <select name="meleeAttackKey" class="gam-melee-attack-select" aria-label="Melee attack">${this._buildAttackOptions()}</select>
              <button type="button" class="gam-melee-icon-button" data-melee-action="edit" title="Редактировать параметры" aria-label="Редактировать параметры"><i class="fa-solid fa-pen"></i></button>
              <button type="button" class="gam-melee-damage-button" data-melee-action="damage"><i class="fa-solid fa-burst"></i> Урон</button>
              <label class="gam-melee-dice-adds" title="Modifying Dice + Adds, Basic Set p. 269">
                <input type="checkbox" name="dicePlusAdds" ${fireState.dicePlusAdds ? "checked" : ""}>
                <span>Dice + Adds</span>
              </label>
            </div>
            <p class="gam-fire-attack-stats" data-melee-attack-meta title="${escapeHTML(attackStats)}">${escapeHTML(attackStats)}</p>
            <div data-melee-governing>${this._buildGoverningSkillSelector(fireState)}</div>
          </div>
          <div class="gam-fire-skill" aria-live="polite">
            <span class="gam-fire-skill-label">Эффективное умение</span>
            <strong class="gam-fire-skill-value" data-skill-preview>${skillPreview.level} (${skillPreview.chance}%)</strong>
            <span class="gam-fire-source-skill">Значение умения: <span data-melee-base-skill>${baseSkillText}</span></span>
          </div>
        </div>
        <div class="gam-fire-layout">
          <div class="gam-fire-left gam-melee-left">
            <div class="gam-fire-fields gam-melee-fields">
              <label class="gam-fire-field">
                <span>Бонусы/штрафы</span>
                <input type="number" name="manualModifier" value="${escapeHTML(fireState.manualModifier)}" placeholder="0" step="1">
              </label>
              <div class="gam-fire-field gam-fire-field-checkbox">
                <span>Движение и атака</span>
                <input type="checkbox" name="moveAndAttack" aria-label="Движение и атака" ${fireState.moveAndAttack ? "checked" : ""} ${fireState.rapidStrike ? "disabled" : ""}>
              </div>
              <div class="gam-fire-field gam-melee-rapid-strike">
                <span>Rapid Strike</span>
                <span class="gam-melee-rapid-controls">
                  <input type="checkbox" name="rapidStrike" aria-label="Rapid Strike" ${fireState.rapidStrike ? "checked" : ""}>
                  <span class="gam-melee-rapid-attacks" ${fireState.rapidStrike ? "" : "hidden"}>
                    <button type="button" data-melee-action="rapid-attack" data-rapid-attack="0"
                      class="gam-melee-rapid-attack gam-rapid-attack-1 ${this._rapidStrikeActive === 0 ? "is-active" : ""}"
                      aria-pressed="${this._rapidStrikeActive === 0}">Атака 1</button>
                    <button type="button" data-melee-action="rapid-attack" data-rapid-attack="1"
                      class="gam-melee-rapid-attack gam-rapid-attack-2 ${this._rapidStrikeActive === 1 ? "is-active" : ""}"
                      aria-pressed="${this._rapidStrikeActive === 1}">Атака 2</button>
                  </span>
                </span>
              </div>
              <div class="gam-fire-field gam-melee-all-out">
                <span>Тотальная атака</span>
                <span class="gam-melee-all-out-controls">
                  <input type="checkbox" name="allOutAttack" aria-label="Тотальная атака" ${fireState.allOutAttack ? "checked" : ""}>
                  <select name="allOutAttackMode" aria-label="Вариант тотальной атаки" ${fireState.allOutAttack ? "" : "disabled"}>
                    <option value="determined" ${fireState.allOutAttackMode === "determined" ? "selected" : ""}>Точная</option>
                    <option value="strong" ${fireState.allOutAttackMode === "strong" ? "selected" : ""}>Сильная</option>
                  </select>
                </span>
              </div>
              <label class="gam-fire-field gam-melee-deceptive">
                <span>Обманная атака</span>
                <span class="gam-melee-deceptive-controls">
                  <select name="deceptiveAttack" aria-label="Штраф обманной атаки" ${fireState.moveAndAttack || maneuver.maximum === 0 ? "disabled" : ""}>
                    ${deceptiveOptions}
                  </select>
                  <small data-deceptive-defense>${defenseText}</small>
                </span>
              </label>
              <label class="gam-fire-aim gam-melee-evaluate">
                <span>Оценка:</span>
                <input type="number" name="evaluate" value="${escapeHTML(fireState.evaluate)}" placeholder="0" min="0" step="1" inputmode="numeric" aria-label="Последовательные маневры Оценка">
                <span>ход.</span>
                <span class="gam-fire-aim-effective">Eff. mod:</span>
                <strong class="gam-fire-aim-bonus" data-evaluate-preview>+${evaluateBonus}</strong>
              </label>
            </div>
            <section class="gam-melee-empty-range" aria-hidden="true"></section>
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

  _registerTargetHook() {}

  _updateTargetRecommendation() {
    this._updateSkillPreview();
    void this._updateEffectiveDamagePreview();
  }

  _updateRapidFirePreview() {}

  _updateMeleePreview() {
    const maneuver = this._normalizeManeuverState();
    const evaluate = this.element?.querySelector("[data-evaluate-preview]");
    if (evaluate) evaluate.textContent = "+" + getEvaluateBonus(this.fireState.evaluate);
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
    const rapidAttacks = this.element?.querySelector(".gam-melee-rapid-attacks");
    if (rapidAttacks) rapidAttacks.hidden = !this.fireState.rapidStrike;
    for (const button of this.element?.querySelectorAll("[data-rapid-attack]") ?? []) {
      const active = Number(button.dataset.rapidAttack) === this._rapidStrikeActive;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const allOut = this.element?.querySelector('[name="allOutAttack"]');
    if (allOut) allOut.checked = !!this.fireState.allOutAttack;
    const allOutMode = this.element?.querySelector('[name="allOutAttackMode"]');
    if (allOutMode) {
      allOutMode.value = this.fireState.allOutAttackMode;
      allOutMode.disabled = !this.fireState.allOutAttack;
    }
    const deceptive = this.element?.querySelector('[name="deceptiveAttack"]');
    if (deceptive) {
      deceptive.innerHTML = this._buildDeceptiveOptions(maneuver.deceptive);
      deceptive.value = String(maneuver.deceptive);
      deceptive.disabled = !!this.fireState.moveAndAttack || maneuver.maximum === 0;
    }
    const defense = this.element?.querySelector("[data-deceptive-defense]");
    if (defense) defense.textContent = maneuver.defensePenalty === 0
      ? "защита 0"
      : "защита " + maneuver.defensePenalty;
    this._updateSkillPreview();
    void this._updateEffectiveDamagePreview();
  }

  _getEffectiveDamageOptions() {
    return {
      actor: this.actor,
      attack: this.attack,
      dicePlusAdds: this.fireState.dicePlusAdds,
      allOutStrong: this.fireState.allOutAttack && this.fireState.allOutAttackMode === "strong"
    };
  }

  async _prepareEffectiveDamage() {
    return prepareEffectiveMeleeDamage(this._getEffectiveDamageOptions());
  }

  _showEffectiveDamage(preparedDamage) {
    this._effectiveDamage = preparedDamage;
    const meta = this.element?.querySelector("[data-melee-attack-meta]");
    if (!meta) return;
    const text = this._buildAttackStats(preparedDamage?.formula ?? this.attack?.damage);
    meta.textContent = text;
    meta.title = text;
  }

  async _updateEffectiveDamagePreview() {
    const revision = ++this._damagePreviewRevision;
    try {
      const preparedDamage = await this._prepareEffectiveDamage();
      if (revision === this._damagePreviewRevision) this._showEffectiveDamage(preparedDamage);
    } catch (error) {
      if (revision === this._damagePreviewRevision) {
        this._showEffectiveDamage(null);
        console.warn("Melee Assistant damage preview:", error);
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
    const settings = getMeleeAttackSettings(this._meleeState, this.sourceAttack);
    let changed = false;
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
    this._captureFields();
    try {
      await this._persistCurrentPreferences();
      await this._stateSaveQueue;
    } catch (error) {
      console.error("Melee Assistant state save:", error);
    }
    return super.close(options);
  }

  async _selectAttack(key) {
    this._captureFields();
    const sourceAttack = this.sourceAttacks.find(entry => entry.key === key);
    if (!sourceAttack || sourceAttack.key === this.selectedAttackKey) return;
    this.selectedAttackKey = sourceAttack.key;
    this.sourceAttack = sourceAttack;
    this.attack = applyMeleeAttackOverride(sourceAttack, this._meleeState);
    this._effectiveDamage = null;
    this._damagePreviewRevision += 1;
    this.targetedAttackContext = createMeleeTargetedAttackContext({ actor: this.actor, attack: this.attack });
    const attackSettings = getMeleeAttackSettings(this._meleeState, sourceAttack);
    const saved = attackSettings.governingSkill ?? "";
    this.fireState.governingSpecialty = this._resolveGoverningSkill(saved);
    this.fireState.rapidStrikeMastery = attackSettings.rapidStrikeMastery === true;
    setSelectedMeleeAttack(this._meleeState, sourceAttack);
    if (saved && this.fireState.governingSpecialty !== saved) {
      setMeleeGoverningSkill(this._meleeState, sourceAttack, "");
    }
    await this._persistState();

    const service = await TargetingService.create({ attack: this.attack, bodyplan: this.fireState.bodyplanId });
    this.targetingService = service;
    this._targetingServices = new Map([[service.bodyplan, service]]);
    this._normalizeAttackConfigurationLocations();
    this._applyAttackConfiguration(this.fireState.rapidStrike
      ? this._rapidStrikeStates?.[this._rapidStrikeActive]
      : this._singleAttackState);

    const meta = this.element?.querySelector("[data-melee-attack-meta]");
    if (meta) {
      meta.textContent = this._buildAttackStats();
      meta.title = this._buildAttackStats();
    }
    const governing = this.element?.querySelector("[data-melee-governing]");
    if (governing) governing.innerHTML = this._buildGoverningSkillSelector(this.fireState);
    const targeting = this.element?.querySelector(".gam-fire-targeting");
    if (targeting) targeting.outerHTML = this._buildHitLocationContent(this.fireState);
    this._updateMeleePreview();
  }

  async _editAttack() {
    const result = await openMeleeAttackEditor({
      DialogV2: foundry.applications.api.DialogV2,
      attack: this.attack,
      escapeHTML
    });
    if (!result) return;
    if (result.action === "reset") {
      clearMeleeAttackOverride(this._meleeState, this.sourceAttack);
    } else if (result.action === "save") {
      setMeleeAttackOverride(this._meleeState, this.sourceAttack, result.value);
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
      console.error("Melee Assistant damage:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  _getManeuverPayload() {
    if (this.fireState.allOutAttack) {
      return { type: "allOutAttack", option: this.fireState.allOutAttackMode };
    }
    if (this.fireState.moveAndAttack) return { type: "moveAndAttack" };
    return { type: "attack" };
  }


  async _executePreparedAttack(attackNumber = null) {
    const locationResult = this._getLocationResult();
    const randomLocation = locationResult.selection?.random === true;
    const locationText = !randomLocation && locationResult.selection?.label && Number(locationResult.penalty) === 0
      ? "Hit Location: " + locationResult.selection.label : "";
    const maneuver = this._normalizeManeuverState();
    const effectiveSkill = this._calculateEffectiveSkill();
    if (!Number.isFinite(effectiveSkill)) throw new Error("Не удалось рассчитать effective skill.");

    const attackLabel = attackNumber ? "Rapid Strike - Атака " + attackNumber : "";
    const overrideText = [attackLabel, locationText].filter(Boolean).join("<br>");
    const attackResult = await executeNativeMeleeAttack({
      actor: this.actor,
      sourceAttack: this.sourceAttack,
      effectiveSkill,
      locationText,
      overrideText,
      modifierDetails: this._buildAttackModifierDetails(locationResult, maneuver, effectiveSkill),
      captureMessage: randomLocation,
      maneuver: this._getManeuverPayload(),
      deceptiveDefensePenalty: maneuver.defensePenalty
    });

    if (attackResult.success && randomLocation) {
      try {
        const random = await this.targetingService.resolveRandomHitLocation();
        const hitLocations = buildRandomHitLocationsHtml([random], {
          escapeHtml: escapeHTML,
          contourTitle: "Контурное рисование"
        });
        const message = attackResult.message;
        if (message?.update) {
          const content = String(message.content ?? message._source?.content ?? "");
          await message.update({ content: content + hitLocations });
        } else {
          ui.notifications.warn("Атака выполнена, но случайную Hit Location не удалось добавить в её сообщение.");
        }
      } catch (error) {
        console.error("Melee Assistant random Hit Location:", error);
        ui.notifications.warn("Атака выполнена, но случайную Hit Location определить не удалось.");
      }
    }
    return attackResult;
  }

  async _performAttack(button) {
    this._captureFields();
    const skills = this.targetedAttackContext?.specialtyOptions ?? [];
    if (skills.length && !this.fireState.governingSpecialty) {
      ui.notifications.warn("Выберите Governing skill для этой melee-атаки.");
      return;
    }

    this._submitting = true;
    button.disabled = true;
    const rapidStrike = this.fireState.rapidStrike && this._rapidStrikeStates;
    const previousActive = this._rapidStrikeActive;
    try {
      if (!rapidStrike) {
        await this._executePreparedAttack();
      } else {
        const configurations = this._rapidStrikeStates.map(state => this._cloneAttackConfiguration(state));
        for (let index = 0; index < 2; index += 1) {
          this._rapidStrikeActive = index;
          this._rapidStrikeStates[index] = this._cloneAttackConfiguration(configurations[index]);
          this._applyAttackConfiguration(this._rapidStrikeStates[index]);
          try {
            await this._executePreparedAttack(index + 1);
          } catch (error) {
            console.error("Melee Assistant Rapid Strike attack " + (index + 1) + ":", error);
            ui.notifications.error("Атака " + (index + 1) + ": " + (error?.message ?? String(error)));
          }
        }
      }
    } catch (error) {
      console.error("Melee Assistant attack:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      if (rapidStrike) {
        this._rapidStrikeActive = previousActive;
        this._applyAttackConfiguration(this._rapidStrikeStates[previousActive]);
        this._refreshHitLocationContent();
      }
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updateMeleePreview();
    }
  }
  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!field) return;
    if (field.name === "bodyplanId") {
      this._captureFields();
      await super._onInput(event);
      this._normalizeAttackConfigurationLocations({ reset: true });
      this._applyAttackConfiguration(this.fireState.rapidStrike
        ? this._rapidStrikeStates?.[this._rapidStrikeActive]
        : this._singleAttackState);
      this._refreshHitLocationContent();
      this._updateMeleePreview();
      return;
    }
    if (field.name === "meleeAttackKey") {
      if (event.type === "change") await this._selectAttack(field.value);
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
    } else if (field.name === "moveAndAttack") {
      this.fireState.moveAndAttack = field.checked && !this.fireState.rapidStrike;
      if (this.fireState.moveAndAttack) {
        this.fireState.allOutAttack = false;
        this.fireState.deceptiveAttack = "0";
      }
    } else if (field.name === "rapidStrike") {
      this._setRapidStrikeEnabled(field.checked);
      this._refreshHitLocationContent();
    } else if (field.name === "allOutAttack") {
      this.fireState.allOutAttack = field.checked;
      if (field.checked) {
        this.fireState.moveAndAttack = false;
        if (!["determined", "strong"].includes(this.fireState.allOutAttackMode)) {
          this.fireState.allOutAttackMode = "determined";
        }
      }
    } else if (field.name === "allOutAttackMode") {
      this.fireState.allOutAttackMode = field.value === "strong" ? "strong" : "determined";
    } else if (field.name === "deceptiveAttack") {
      this.fireState.deceptiveAttack = field.value;
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
    const button = target?.closest("button[data-melee-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.meleeAction;
    if (action === "cancel") return this.close();
    if (action === "rapid-attack") return this._switchRapidStrikeAttack(button.dataset.rapidAttack);
    if (action === "edit") return this._editAttack();
    if (action === "damage") return this._rollDamage(button);
    if (action === "confirm" && !this._submitting) return this._performAttack(button);
  }
}
