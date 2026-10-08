import { planSprayingFire } from "./spraying-fire-service.js";
import { getTokenFireRangeContext, measureTokenDistanceYards } from "./fire-control-context.js";
import { findRangeBandForDistance, resolveEffectiveRange, isBeamWeapon } from "./fire-range-service.js";
import { setSuppressionTargets } from "./suppression-fire-presentation.js";
import { getFireSkillPreview } from "./fire-skill-preview.js";
import { buildRandomHitLocationsHtml } from "./hit-location-result.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const integer = value => Number.isInteger(Number(value)) ? Number(value) : null;
const clone = value => foundry.utils.deepClone(value);
const ammoError = "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432 \u0434\u043b\u044f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u043d\u043e\u0439 \u043e\u0447\u0435\u0440\u0435\u0434\u0438";

export class SprayingFireApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-spraying-fire",
    classes: ["olegurps-qol", "spraying-fire"],
    tag: "section",
    window: { title: "Spraying Fire", resizable: true },
    position: { width: 690, height: 650 }
  };

  constructor({ token, actor, weapon, attack, fireService, fireContext, rangeBands,
    targetingService, targetedAttackContext, sessionService, managerApp, onReselect, onComplete, onCancel, onClose }, options = {}) {
    super({ ...options, id: options.id ?? "olegurps-spraying-fire-" + token.id + "-" + weapon.id });
    Object.assign(this, { token, actor, weapon, attack, fireService, fireContext, rangeBands,
      targetingService, targetedAttackContext, sessionService, managerApp, onReselect, onComplete, onCancel, onCloseCallback: onClose });
    this.session = sessionService.findExisting();
    this._pending = Promise.resolve();
    this._rolling = false;
    this._explicitCancel = false;
    this._cancelDeletion = null;
    this._expandedTargets = new Map();
    this._boundClick = this._onClick.bind(this);
    this._boundInput = this._onInput.bind(this);
  }

  _mode() {
    const profile = this.fireService.parseRateOfFire(this.attack.rof);
    return profile.type === "full-auto"
      ? profile.modes[this.session.modeIndex] ?? profile.modes[0]
      : { index: 0, fullRoF: profile.baseRoF, minRoF: 1, label: profile.display };
  }

  _targetToken(target) {
    if (target.sceneId === canvas?.scene?.id) {
      const live = canvas?.tokens?.get?.(target.tokenId);
      if (live) return live;
    }
    return { document: target.geometry };
  }

  _recompute() {
    const mode = this._mode();
    const targets = this.session.targets;
    const tokenObjects = targets.map(target => this._targetToken(target));
    const fixed = targets.some(target => target.completed);
    const plan = planSprayingFire({
      source: this.token, targets: tokenObjects, direction: this.session.direction,
      fullRoF: mode.fullRoF, minRoF: mode.minRoF,
      preserveOrder: fixed, measure: measureTokenDistanceYards
    });
    if (!plan.rows) return { plan, rows: [], mode, valid: false, shots: 0, plannedAmmo: this.session.plannedAmmo ?? 0, remaining: mode.fullRoF - (this.session.plannedAmmo ?? 0) };
    const targetByToken = new Map(tokenObjects.map((object, index) => [object, targets[index]]));
    const orderedTargets = plan.rows.map(row => targetByToken.get(row.target));
    if (!fixed && orderedTargets.some((target, index) => target !== targets[index])) {
      this.session.targets = orderedTargets;
    }
    const rows = plan.rows.map((row, index) => {
      const target = orderedTargets[index];
      if (!target) return null;
      target.traverseDistance = target.completed ? target.usedSnapshot?.display?.traverseDistance ?? row.traverseDistance : row.traverseDistance;
      target.wastedShots = target.completed ? target.usedSnapshot?.display?.wastedShots ?? row.wastedShots : row.wastedShots;
      const liveToken = this._targetToken(target);
      const automatic = getTokenFireRangeContext({ sourceToken: this.token, targetToken: liveToken, rangeBands: this.rangeBands });
      const distance = target.completed && target.usedSnapshot
        ? target.usedSnapshot.distance
        : target.manualDistance ?? automatic?.distance ?? null;
      const range = findRangeBandForDistance(this.rangeBands, distance);
      const height = target.completed && target.usedSnapshot
        ? target.usedSnapshot.height
        : target.heightOverride ?? automatic?.height ?? 0;
      const highGround = target.completed && target.usedSnapshot
        ? target.usedSnapshot.highGround
        : target.highGroundOverride ?? (automatic?.elevationDirection === "high");
      const values = {
        ...this.session.common, manualModifier: Number(this.session.common.manualModifier || 0) + Number(target.modifier || 0),
        shots: target.shots, rangeIndex: range?.index ?? null, height, elevationDirection: height > 0 ? highGround ? "high" : "low" : "level",
        targetDistanceOverride: distance, hitLocationId: "silhouette",
        governingSpecialty: this.session.common.governingSpecialty ?? this.weapon.governingSpecialty ?? ""
      };
      const fireMode = this.fireContext.getFireModeState(this.attack, values, this.rangeBands);
      const skill = this.fireContext.calculateEffectiveFireSkillDetails(
        this.attack, values, this.rangeBands, this.targetingService, this.targetedAttackContext
      );
      const bonuses = this.fireContext.getFireBonuses(this.attack, values);
      const effectiveRange = resolveEffectiveRange({
        rangeBands: this.rangeBands, rangeIndex: range?.index,
        distance, height, elevationDirection: height > 0 ? highGround ? "high" : "low" : "level", beamWeapon: isBeamWeapon(this.attack)
      }).effectiveRange ?? range;
      const rcl = this.fireService.parseAttackRcl(this.attack, { extremelyClose: fireMode.extremelyClose });
      const data = {
        target, index, automatic, distance, height, highGround, range: effectiveRange, values,
        traverseDistance: target.traverseDistance, wastedShots: target.wastedShots,
        fireMode, skill, bonuses,
        baseRcl: rcl, effectiveRcl: rcl === null ? null : rcl + index,
        rfBonus: this.fireService.calculateRapidFireBonus(fireMode.effectiveRoF),
        preview: getFireSkillPreview(skill?.effectiveSkill)
      };
      return target.completed && target.usedSnapshot ? { ...data, ...target.usedSnapshot.display } : data;
    });
    plan.waste = rows.reduce((sum, row) => sum + (Number(row?.target?.wastedShots) || 0), 0);
    plan.minimum = Math.max(mode.minRoF, rows.length + plan.waste);
    plan.valid = plan.minimum <= mode.fullRoF;
    const shots = rows.reduce((sum, row) => sum + (Number(row?.target?.shots) || 0), 0);
    const plannedAmmo = shots + plan.waste;
    this.session.plannedAmmo = plannedAmmo;
    this.session.nextTarget = this.session.targets.findIndex(target => !target.completed);
    const shotsValid = rows.every(row => Number.isInteger(row?.target?.shots) && row.target.shots >= 1);
    const specialtyValid = !this.targetedAttackContext?.requiresSelection ||
      this.targetedAttackContext.specialtyOptions.some(option => option.value === this.session.common.governingSpecialty);
    return { plan, rows, mode, shots, plannedAmmo, remaining: mode.fullRoF - plannedAmmo,
      valid: plan.valid && shotsValid && specialtyValid && plannedAmmo >= mode.minRoF && plannedAmmo <= mode.fullRoF };
  }

  _queueSave() {
    if (this._explicitCancel) return this._pending;
    const snapshot = clone(this.session);
    this._pending = this._pending.catch(() => {}).then(() => this.sessionService.save(snapshot));
    return this._pending;
  }

  async _prepareContext() { return {}; }
  async _renderHTML() { return this._content(); }
  _replaceHTML(result, content) { content.innerHTML = result; }

  _content() {
    const data = this._recompute();
    const common = this.session.common;
    const locked = this.session.targets.some(target => target.completed);
    const loaded = this._knownAmmo ?? this.weapon.magazines[this.weapon.loadedIndex] ?? 0;
    const total = this._knownTotal ?? this.weapon.totalAmmo ?? 0;
    const available = Math.min(loaded, total);
    const problem = !data.valid ? (data.plan.reason ?? (this.targetedAttackContext?.requiresSelection &&
      !this.targetedAttackContext.specialtyOptions.some(option => option.value === common.governingSpecialty)
        ? "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 governing Guns specialty" : "\u041d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0439 \u0440\u0430\u0441\u0445\u043e\u0434 RoF"))
      : data.plannedAmmo > available ? ammoError : "";
    const modeOptions = this.fireService.parseRateOfFire(this.attack.rof).type === "full-auto"
      ? this.fireService.parseRateOfFire(this.attack.rof).modes.filter(mode => mode.fullRoF >= 5)
        .map(mode => '<option value="' + mode.index + '"' + (mode.index === this.session.modeIndex ? " selected" : "") + '>' + escape(mode.label) + '</option>').join("")
      : '<option value="0">' + escape(this.attack.rof) + '</option>';
    const field = (label, name, value, type = "number", extra = "") =>
      '<label>' + label + '<input data-field="' + name + '" type="' + type + '" value="' + escape(value) + '" ' + extra + '></label>';
    const check = (label, name, checked) =>
      '<label class="sf-check"><input data-field="' + name + '" type="checkbox" ' + (checked ? "checked" : "") +
      (locked ? " disabled" : "") + '>' + label + '</label>';
    const governingOptions = this.targetedAttackContext?.specialtyOptions ?? [];
    const governingSelect = governingOptions.length ?
      '<label>Governing Skill<select data-field="governingSpecialty" ' + (locked ? "disabled" : "") + '>' +
      '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 Guns specialty</option>' +
      governingOptions.map(option => '<option value="' + escape(option.value) + '"' +
        (option.value === common.governingSpecialty ? " selected" : "") + '>' + escape(option.label) + '</option>').join("") +
      '</select></label>' : "";
    const numericFields = [
      field("Aim, \u0441", "aimSeconds", common.aimSeconds, "number", 'min="0" step="1" ' + (locked ? "disabled" : "")),
      field("\u041e\u0431\u0449\u0438\u0439 \u043c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440", "manualModifier", common.manualModifier, "number", 'step="1" ' + (locked ? "disabled" : ""))
    ].join("");
    const checkFields = [
      check("\u0423\u043f\u043e\u0440", "braced", common.braced),
      check("\u041b\u0430\u0437\u0435\u0440", "laserSight", common.laserSight),
      check("All-Out Attack", "allOutAttack", common.allOutAttack),
      check("\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0438 \u0430\u0442\u0430\u043a\u0430", "moveAndAttack", common.moveAndAttack)
    ].join("");
    const cards = data.rows.map(row => {
      const target = row.target;
      const completed = !!target.completed;
      const active = !completed && row.index === this.session.nextTarget;
      const status = completed ? "\u2713" : active ? "\u0442\u0435\u043a\u0443\u0449\u0430\u044f" : "\u043e\u0436\u0438\u0434\u0430\u0435\u0442";
      const attr = ' data-index="' + row.index + '" ';
      const disabled = completed ? "disabled" : "";
      const expanded = this._expandedTargets.get(target.tokenId) ?? active;
      const summary = "<span>" + escape(target.shots) + " \u0432\u044b\u0441\u0442\u0440.</span>" +
        "<span>\u041d\u0430\u0432\u044b\u043a " + escape(row.preview.level) + "</span>" +
        "<span>Rcl " + escape(row.effectiveRcl ?? "\u2014") + "</span>";
      const transfer = row.index ?
        '<div class="sf-pair sf-transfer"><span>\u041f\u0435\u0440\u0435\u043d\u043e\u0441: <b>' + escape(Number.isFinite(row.traverseDistance) ? row.traverseDistance.toFixed(1) : "\u2014") +
        ' \u044f\u0440\u0434\u043e\u0432</b></span><span>\u041f\u043e\u0442\u0435\u0440\u044f\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432: <b>' + escape(row.wastedShots ?? 0) + '</b></span></div>' : "";
      return '<section class="sf-card ' + (completed ? "done" : active ? "active" : "waiting") + (expanded ? " expanded" : " collapsed") + '">' +
        '<h3><button type="button" class="sf-card-toggle" data-action="toggle-target"' + attr +
        'aria-expanded="' + expanded + '">' +
        '<span class="sf-card-title">\u0426\u0435\u043b\u044c ' + (row.index + 1) + ' \u2014 ' + status +
        (target.name && target.name !== "\u0426\u0435\u043b\u044c" ? ' <small>' + escape(target.name) + '</small>' : "") + '</span>' +
        '<span class="sf-card-summary">' + summary + '</span><i class="fas fa-chevron-' + (expanded ? "down" : "right") + '" aria-hidden="true"></i>' +
        '</button></h3>' + (expanded ? '<div class="sf-card-details"><div class="sf-grid">' +
        '<label>\u0412\u044b\u0441\u0442\u0440\u0435\u043b\u044b<input type="number" min="1" step="1" data-field="shots"' + attr + 'value="' + escape(target.shots) + '" ' + disabled + '></label>' +
        '<div class="sf-distance"><label>\u0414\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044f<input type="number" min="0" step="0.1" data-field="manualDistance"' + attr +
        'value="' + escape(target.manualDistance ?? "") + '" placeholder="' + escape(row.automatic?.distance?.toFixed?.(1) ?? "") + '" ' + disabled + '></label>' +
        '<button type="button" data-action="auto-distance"' + attr + disabled + '>\u0410\u0432\u0442\u043e ' + escape(row.automatic?.distance?.toFixed?.(1) ?? "\u2014") + '</button></div>' +
        '<div class="sf-elevation"><label>Elevation<input type="number" min="0" step="0.1" data-field="heightOverride"' + attr +
        'value="' + escape(target.heightOverride ?? "") + '" placeholder="' + escape(row.automatic?.height ?? 0) + '" ' + disabled + '></label>' +
        '<label class="sf-check"><input type="checkbox" data-field="highGroundOverride"' + attr +
        (row.highGround ? " checked" : "") + ' ' + disabled + '>\u0412\u044b\u0448\u0435</label></div>' +
        '<div class="sf-pair"><span>Effective RoF: <b>' + escape(row.fireMode.effectiveRoF) + '</b></span><span>RF bonus: <b>+' + escape(row.rfBonus) + '</b></span></div>' +
        '<div class="sf-pair"><span>Rcl: <b>' + escape(row.baseRcl ?? "\u2014") + '</b></span><span>\u042d\u0444\u0444. Rcl: <b>' + escape(row.effectiveRcl ?? "\u2014") + '</b></span></div>' +
        '<label>\u0414\u043e\u043f. \u043c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440<input type="number" step="1" data-field="modifier"' + attr +
        'value="' + escape(target.modifier ?? 0) + '" ' + disabled + '></label>' +
        '<div class="sf-pair"><span>\u042d\u0444\u0444. \u0443\u043c\u0435\u043d\u0438\u0435: <b>' + escape(row.preview.level) + '</b></span><span>3d6: <b>' + escape(row.preview.chance) + '%</b></span></div>' +
        '<div class="sf-pair"><span>\u041c\u0430\u043a\u0441. \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: <b>' + escape(row.fireMode.effectiveRoF) + '</b></span></div>' +
        transfer + '</div><button type="button" data-action="roll"' + attr + (active && !problem && row.skill && !this._rolling ? "" : " disabled") +
        '>\u0426\u0435\u043b\u044c ' + (row.index + 1) + (completed ? " \u2713" : " \u2014 \u0410\u0442\u0430\u043a\u0430") + '</button></div>' : "") + '</section>';
    }).join("");
    return '<div class="sf-root"><div class="sf-overview"><strong class="sf-weapon">' + escape(this.weapon.name) + '</strong>' +
      (governingSelect || '<span>Governing Skill: <b>' + escape(common.governingSpecialty || this.weapon.governingSpecialty || this.attack.name) + '</b></span>') +
      '<label>RoF mode<select data-field="modeIndex" ' + (locked ? "disabled" : "") + '>' + modeOptions + '</select></label>' +
      '<span class="sf-ammo">\u041c\u0430\u0433\u0430\u0437\u0438\u043d: <b>' + escape(loaded) + '</b> / \u0411\u043e\u0435\u0437\u0430\u043f\u0430\u0441: <b>' + escape(total) + '</b></span>' +
      '<label>\u041f\u0435\u0440\u0435\u043d\u043e\u0441<select data-field="direction" ' + (locked ? "disabled" : "") + '>' +
      '<option value="left-to-right"' + (this.session.direction === "left-to-right" ? " selected" : "") + '>\u0421\u043b\u0435\u0432\u0430 \u2192 \u043d\u0430\u043f\u0440\u0430\u0432\u043e</option>' +
      '<option value="right-to-left"' + (this.session.direction === "right-to-left" ? " selected" : "") + '>\u0421\u043f\u0440\u0430\u0432\u0430 \u2192 \u043d\u0430\u043b\u0435\u0432\u043e</option></select></label></div>' +
      '<div class="sf-modifiers"><div class="sf-numeric">' + numericFields + '</div><div class="sf-options">' + checkFields + '</div></div>' +
      '<div class="sf-totals">\u041f\u043e \u0446\u0435\u043b\u044f\u043c: ' + data.shots +
      ' | \u041f\u043e\u0442\u0435\u0440\u0438 \u043d\u0430 \u043f\u0435\u0440\u0435\u043d\u043e\u0441: ' + (data.plan.waste ?? '\u2014') +
      ' | \u0412\u0441\u0435\u0433\u043e: ' + data.plannedAmmo +
      ' | \u041c\u0438\u043d\u0438\u043c\u0443\u043c: ' + (data.plan.minimum ?? '\u2014') +
      ' | \u041e\u0441\u0442\u0430\u0442\u043e\u043a RoF: ' + data.remaining + '</div>' +
      (problem ? '<p class="sf-error">' + escape(problem) + '</p>' : "") +
      '<div class="sf-cards">' + cards + '</div>' +
      '<footer><button type="button" data-action="finish" ' +
      (this.session.nextTarget === -1 && !problem && data.rows.length ? "" : 'disabled title="' +
      (this.session.nextTarget !== -1 ? "\u041d\u0435 \u0432\u0441\u0435 \u0446\u0435\u043b\u0438 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u044b" : escape(problem)) + '"') +
      '>\u0417\u0430\u043a\u043e\u043d\u0447\u0438\u0442\u044c</button>' +
      '<button type="button" data-action="reselect">\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u044b\u0431\u043e\u0440 \u0446\u0435\u043b\u0435\u0439</button>' +
      '<button type="button" data-action="cancel">\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u0443</button></footer></div>';
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement) || root.dataset.sprayingListeners === "true") return;
    root.addEventListener("click", this._boundClick);
    root.addEventListener("input", this._boundInput);
    root.addEventListener("change", this._boundInput);
    root.dataset.sprayingListeners = "true";
  }

  async close(options = {}) {
    if (this._cancelDeletion) await this._cancelDeletion;
    const result = await super.close(options);
    this.onCloseCallback?.(this);
    return result;
  }

  async _refresh() {
    if (this._explicitCancel) return;
    const scroll = this.element?.querySelector(".window-content")?.scrollTop ?? 0;
    const active = this.element?.querySelector(":focus");
    const field = active?.dataset?.field;
    const action = active?.dataset?.action;
    const index = active?.dataset?.index;
    const start = active?.selectionStart;
    await this.render({ force: true });
    const content = this.element?.querySelector(".window-content");
    if (content) content.scrollTop = scroll;
    if (action === "toggle-target") this.element?.querySelector('button[data-action="toggle-target"][data-index="' + index + '"]')?.focus?.();
    if (field) {
      const selector = '[data-field="' + field + '"]' + (index === undefined ? "" : '[data-index="' + index + '"]');
      const replacement = this.element?.querySelector(selector);
      replacement?.focus?.();
      if (Number.isInteger(start)) replacement?.setSelectionRange?.(start, start);
    }
  }

  async _onInput(event) {
    const element = event.target;
    const field = element?.dataset?.field;
    if (!field || this._explicitCancel) return;
    if (event.type === "input" && ["direction", "modeIndex", "governingSpecialty", "braced", "laserSight", "allOutAttack", "moveAndAttack", "highGroundOverride"].includes(field)) return;
    if (event.type === "change" && !["direction", "modeIndex", "governingSpecialty", "braced", "laserSight", "allOutAttack", "moveAndAttack", "highGroundOverride"].includes(field)) return;
    if (this._rolling) return;
    const target = element.dataset.index === undefined ? null : this.session.targets[Number(element.dataset.index)];
    const locked = this.session.targets.some(item => item.completed);
    if ((target?.completed) || (locked && !target)) return;
    const previous = clone(this.session);
    const value = element.type === "checkbox" ? element.checked : element.value;
    if (field === "direction") this.session.direction = value;
    else if (field === "modeIndex") {
      this.session.modeIndex = Number(value);
      const mode = this._mode();
      const plan = planSprayingFire({
        source: this.token, targets: this.session.targets.map(item => this._targetToken(item)),
        direction: this.session.direction, fullRoF: mode.fullRoF, minRoF: mode.minRoF,
        measure: measureTokenDistanceYards
      });
      if (plan.rows) {
        const minimumTargetShots = Math.max(this.session.targets.length, mode.minRoF - plan.waste);
        const maximumTargetShots = mode.fullRoF - plan.waste;
        const assigned = this.session.targets.reduce((sum, item) => sum + item.shots, 0);
        if (assigned > maximumTargetShots) this.session.targets.forEach(item => { item.shots = 1; });
        const current = this.session.targets.reduce((sum, item) => sum + item.shots, 0);
        if (current < minimumTargetShots) this.session.targets[0].shots += minimumTargetShots - current;
      }
    }
    else if (target) {
      if (field === "shots") {
        const parsed = integer(value);
        if (!parsed || parsed < 1) {
          for (const action of this.element?.querySelectorAll?.('button[data-action="roll"], button[data-action="finish"]') ?? []) action.disabled = true;
          return;
        }
        target.shots = parsed;
      } else if (field === "manualDistance" || field === "heightOverride") {
        const parsed = value === "" ? null : Number(value);
        if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return;
        target[field] = parsed;
      } else if (field === "modifier") {
        const parsed = integer(value);
        if (parsed === null) return;
        target.modifier = parsed;
      } else if (field === "highGroundOverride") target.highGroundOverride = value;
    } else if (field in this.session.common) {
      if (element.type === "checkbox" || field === "governingSpecialty") this.session.common[field] = value;
      else {
        const parsed = integer(value);
        if (parsed === null || (field === "aimSeconds" && parsed < 0)) return;
        this.session.common[field] = parsed;
      }
    }
    const data = this._recompute();
    const ammo = await this.sessionService.currentAmmo();
    if (this._explicitCancel) return;
    this._knownAmmo = ammo.loaded;
    this._knownTotal = ammo.total;
    if ((!data.valid || data.plannedAmmo > Math.min(ammo.loaded, ammo.total)) &&
        ["shots", "direction", "modeIndex"].includes(field)) {
      this.session = previous;
      ui.notifications.warn(data.plan.reason ?? (data.plannedAmmo > Math.min(ammo.loaded, ammo.total) ? ammoError :
        "\u041f\u0440\u0435\u0432\u044b\u0448\u0435\u043d \u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0439 RoF"));
      await this._refresh();
      return;
    }
    await this._queueSave();
    await this._refresh();
  }

  async _onClick(event) {
    const button = event.target?.closest?.("button[data-action]");
    if (!button || button.disabled || this._rolling || this._explicitCancel) return;
    event.preventDefault();
    const action = button.dataset.action;
    try {
      if (action === "toggle-target") {
        const index = Number(button.dataset.index);
        const target = this.session.targets[index];
        if (!target) return;
        const expanded = this._expandedTargets.get(target.tokenId) ?? (index === this.session.nextTarget);
        this._expandedTargets.set(target.tokenId, !expanded);
        await this._refresh();
      } else if (action === "auto-distance") {
        const target = this.session.targets[Number(button.dataset.index)];
        if (target?.completed) return;
        target.manualDistance = null;
        await this._queueSave();
        await this._refresh();
      } else if (action === "roll") {
        await this._rollTarget(Number(button.dataset.index));
      } else if (action === "finish") {
        await this._pending;
        const done = await this.sessionService.finish();
        if (!done) return;
        await this.onComplete?.();
        await this.close();
      } else if (action === "reselect" || action === "cancel") {
        this._explicitCancel = true;
        this._cancelDeletion = (async () => {
          await this._pending;
          await this.sessionService.cancel();
          if (this.sessionService.findExisting()) throw new Error("Spraying Fire session was not deleted.");
        })();
        await this._cancelDeletion;
        this._cancelDeletion = null;
        setSuppressionTargets([]);
        await this.close();
        if (action === "reselect") await this.onReselect?.();
        else {
          await this.onComplete?.();
          await this.onCancel?.();
        }
      }
    } catch (error) {
      this._cancelDeletion = null;
      if (this.rendered) this._explicitCancel = false;
      console.error("OleGURPS QOL | Spraying Fire:", error);
      ui.notifications.error(error?.message ?? String(error));
    }
  }

  async _rollTarget(index) {
    if (this._rolling || index !== this.session.nextTarget || this.session.targets[index]?.completed) return;
    this._rolling = true;
    const previousTargets = Array.from(game?.user?.targets ?? []).map(target => target.id);
    try {
      await this._pending;
      const liveTarget = canvas?.tokens?.get?.(this.session.targets[index]?.tokenId);
      if (!liveTarget || !liveTarget.visible || liveTarget.document?.hidden) {
        throw new Error("\u0426\u0435\u043b\u044c \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u043d\u0430 Canvas");
      }
      setSuppressionTargets([liveTarget.id]);
      const data = this._recompute();
      const row = data.rows[index];
      const ammo = await this.sessionService.currentAmmo();
      this._knownAmmo = ammo.loaded;
      this._knownTotal = ammo.total;
      if (data.plannedAmmo > Math.min(ammo.loaded, ammo.total)) throw new Error(ammoError);
      if (!data.valid || !row?.skill || !Number.isFinite(row.distance) || row.effectiveRcl === null) {
        throw new Error("\u041f\u043b\u0430\u043d \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b \u043d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c");
      }
      const bonuses = row.bonuses;
      const values = row.values;
      const tagged = this.fireContext.getTaggedModifierSettings();
      const effectRangePenalty = tagged?.autoAdd
        ? this.fireContext.getGgaTargetRangeRecommendation(this.rangeBands)?.penalty ?? null : null;
      const result = await this.fireService.executeRangedAttack(this.attack, {
        shots: row.target.shots, physicalShots: row.target.shots,
        effectiveRoF: row.fireMode.effectiveRoF, extremelyClose: row.fireMode.extremelyClose,
        rcl: row.effectiveRcl, maximumHits: row.fireMode.effectiveRoF,
        effectiveSkill: row.skill.effectiveSkill,
        rangePenalty: row.range?.penalty ?? 0, rangeLabel: row.range?.label ?? "",
        effectRangePenalty, hitLocationPenalty: 0, hitLocationModifierLabel: "Random Location",
        rapidFireBonus: row.rfBonus,
        aimBonus: bonuses.aimBonus ?? 0, sightBonus: bonuses.sightBonus ?? 0,
        bracingBonus: bonuses.bracingBonus ?? 0, laserBonus: bonuses.laserBonus ?? 0,
        moveAttackPenalty: bonuses.moveAttackPenalty ?? 0,
        allOutAttackBonus: this.fireService.calculateRangedAllOutAttackBonus(values.allOutAttack, values.moveAndAttack),
        manualModifier: Number(values.manualModifier) || 0,
        contextLabel: "Spraying Fire - " + row.target.name + " - " + (index + 1),
        consumeAction: index === this.session.targets.length - 1
      });
      if (!result.rolled) {
        ui.notifications.warn("\u0411\u0440\u043e\u0441\u043e\u043a \u0430\u0442\u0430\u043a\u0438 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d");
        return;
      }
      const target = this.session.targets[index];
      const live = this._targetToken(target);
      target.completed = true;
      target.usedSnapshot = {
        distance: row.distance, height: row.height, highGround: row.highGround,
        geometry: clone({
          id: target.tokenId, x: live.document?.x, y: live.document?.y,
          width: live.document?.width, height: live.document?.height, elevation: live.document?.elevation
        }),
        display: {
          automatic: row.automatic, fireMode: row.fireMode, skill: row.skill,
          bonuses: row.bonuses, baseRcl: row.baseRcl, effectiveRcl: row.effectiveRcl,
          rfBonus: row.rfBonus, preview: row.preview, traverseDistance: row.traverseDistance,
          wastedShots: row.wastedShots
        },
        rollMessageId: result.message?.id ?? null
      };
      this._recompute();
      this._expandedTargets.clear();
      await this._queueSave();
      const hits = result.rollData?.failure ? 0 : Number(result.rollData?.rofrcl ?? 0);
      if (hits > 0 && result.message) {
        try {
          const locations = await this.targetingService.resolveRandomHitLocations(hits);
          const html = buildRandomHitLocationsHtml(locations, { escapeHtml: escape });
          if (html) await result.message.update({ content: result.message.content + html });
        } catch (error) {
          console.error("Spraying Fire random Hit Location:", error);
          ui.notifications.warn("\u041f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044f \u0435\u0441\u0442\u044c, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0435 \u0437\u043e\u043d\u044b \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u044b");
        }
      }
    } finally {
      setSuppressionTargets(previousTargets);
      this._rolling = false;
      await this._refresh();
    }
  }
}