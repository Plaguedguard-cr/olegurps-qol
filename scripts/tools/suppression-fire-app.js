import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { SuppressionFireRegionService } from "./suppression-fire-region-service.js";
import {
  calculateSuppressionFireHits,
  calculateSuppressionFireSkill,
  getSuppressionFireCapacity,
  SUPPRESSION_FIRE_MINIMUM_SHOTS,
  validateSuppressionFireAllocation
} from "./suppression-fire-service.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

const integer = value => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

const SUPPRESSION_FIRE_CSS = `
  .gam-suppression {
    display: grid;
    gap: 10px;
    max-height: 78vh;
    overflow-y: auto;
    padding: 2px 7px 2px 2px;
    box-sizing: border-box;
    font-size: 0.9em;
  }
  .gam-suppression, .gam-suppression * { box-sizing: border-box; }
  .gam-suppression-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(128,128,128,.32);
  }
  .gam-suppression-summary h3,
  .gam-suppression-summary p { margin: 0; }
  .gam-suppression-summary p { opacity: .78; }
  .gam-suppression-ammo { text-align: right; white-space: nowrap; }
  .gam-suppression-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }
  .gam-suppression-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(105px, 160px);
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .gam-suppression-field input,
  .gam-suppression-field select { width: 100%; margin: 0; }
  .gam-suppression-check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    min-height: 30px;
  }
  .gam-suppression-check input { width: auto; margin: 0; }
  .gam-suppression-range {
    grid-column: 1 / -1;
    grid-template-columns: max-content minmax(0, 1fr);
  }
  .gam-suppression-range select { min-width: 0; max-width: none; }
  .gam-suppression-zones { display: grid; gap: 7px; }
  .gam-suppression-zone {
    display: grid;
    gap: 7px;
    padding: 8px;
    border: 1px solid rgba(128,128,128,.34);
    border-radius: 5px;
    background: rgba(255,255,255,.025);
  }
  .gam-suppression-zone-head {
    display: grid;
    grid-template-columns: auto 86px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .gam-suppression-zone-head input { width: 86px; margin: 0; }
  .gam-suppression-zone-skill { justify-self: end; white-space: nowrap; }
  .gam-suppression-region-status { min-height: 22px; opacity: .78; }
  .gam-suppression-region-status.ready { color: #7ed38c; opacity: 1; }
  .gam-suppression-region-status.depleted { color: #d28a8a; opacity: 1; }
  .gam-suppression-hit-pool { font-weight: 700; color: #e6c98c; }
  .gam-suppression-status { min-height: 1.2em; margin: 0; color: #e4bd75; }
  .gam-suppression-actions {
    position: sticky;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding-top: 9px;
    border-top: 1px solid rgba(128,128,128,.32);
    background: rgba(12,12,20,.96);
  }
  .gam-suppression-actions button { min-height: 34px; margin: 0; }
  @media (max-width: 620px) {
    .gam-suppression-controls { grid-template-columns: 1fr; }
    .gam-suppression-range { grid-column: auto; grid-template-columns: max-content minmax(0, 1fr); }
    .gam-suppression-zone-head { grid-template-columns: auto 78px; }
    .gam-suppression-zone-skill { grid-column: 1 / -1; justify-self: start; }
  }
`;

export class SuppressionFireApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-suppression-fire",
    classes: ["olegurps-qol", "suppression-fire"],
    tag: "section",
    window: { title: "Suppression Fire", resizable: true },
    position: { width: 680, height: "auto" }
  };

  constructor({
    token, actor, weapon, attack, fireService, rangeBands, targetingService,
    targetedAttackContext, calculateEffectiveFireSkillDetails, getEffectRangePenalty,
    consumeAmmo, sessionService, placementApps = [], onGoverningSkillChange, onComplete, onClose
  }, options = {}) {
    super({
      ...options,
      id: options.id ?? "olegurps-suppression-fire-" + token.id + "-" + weapon.id,
      window: { title: "Suppression Fire - " + weapon.name, resizable: true, ...(options.window ?? {}) }
    });
    this.token = token;
    this.actor = actor;
    this.weapon = weapon;
    this.attack = attack;
    this.fireService = fireService;
    this.rangeBands = rangeBands;
    this.targetingService = targetingService;
    this.targetedAttackContext = targetedAttackContext;
    this.calculateEffectiveFireSkillDetails = calculateEffectiveFireSkillDetails;
    this.getEffectRangePenalty = getEffectRangePenalty;
    this.consumeAmmo = consumeAmmo;
    this.sessionService = sessionService;
    this.placementApps = placementApps.filter(Boolean);
    this.governingSkillChangeCallback = onGoverningSkillChange;
    this.completeCallback = onComplete;
    this.closeCallback = onClose;
    this.profile = fireService.parseRateOfFire(attack.rof);
    const session = sessionService?.session;
    this.regionService = new SuppressionFireRegionService({
      token, actor, weapon, attack, sessionId: session?.sessionId
    });
    const specialties = this._governingOptions();
    const saved = String(session?.controls?.governingSpecialty ?? weapon.governingSpecialty ?? "");
    this._state = {
      zoneCount: Math.max(1, integer(session?.zoneCount ?? 1)),
      zoneShots: session?.zones?.map(zone => Math.max(0, integer(zone.shotsAllocated))) ??
        [SUPPRESSION_FIRE_MINIMUM_SHOTS],
      mounted: !!session?.controls?.mounted,
      aimSeconds: session?.controls?.aimSeconds ?? "",
      braced: !!session?.controls?.braced,
      laserSight: !!session?.controls?.laserSight,
      manualModifier: session?.controls?.manualModifier ?? "",
      rangeIndex: session?.controls?.rangeIndex ?? null,
      governingSpecialty: specialties.some(option => option.value === saved)
        ? saved
        : (targetedAttackContext?.automaticSpecialty ?? "")
    };
    this._submitting = false;
    this._boundInput = this._onInput.bind(this);
    this._boundClick = this._onClick.bind(this);
  }

  _isStarted() {
    return this.sessionService?.hasStarted === true || this.sessionService?.session?.ammoConsumed === true;
  }

  _isActive() { return this.sessionService?.isActive === true; }

  _capacity() {
    return getSuppressionFireCapacity({
      profile: this.profile,
      loaded: this.weapon.magazines[this.weapon.loadedIndex],
      totalAmmo: this.weapon.totalAmmo
    });
  }

  _governingOptions() {
    const options = [...(this.targetedAttackContext?.specialtyOptions ?? [])];
    const saved = String(this.weapon?.governingSpecialty ?? "").trim();
    if (saved && !options.some(option => option.value === saved)) {
      options.push({ value: saved, label: "Guns (" + saved + ")" });
    }
    return options;
  }

  _captureFields() {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    this._state.zoneCount = Math.max(1, integer(root.querySelector('[name="zoneCount"]')?.value));
    this._state.zoneShots = Array.from(root.querySelectorAll("[data-zone-shots]"))
      .map(input => integer(input.value));
    this._state.mounted = !!root.querySelector('[name="mounted"]')?.checked;
    this._state.aimSeconds = root.querySelector('[name="aimSeconds"]')?.value ?? "";
    this._state.braced = !!root.querySelector('[name="braced"]')?.checked;
    this._state.laserSight = !!root.querySelector('[name="laserSight"]')?.checked;
    this._state.manualModifier = root.querySelector('[name="manualModifier"]')?.value ?? "";
    const range = root.querySelector('[name="rangeIndex"]')?.value ?? "";
    this._state.rangeIndex = range === "" ? null : integer(range);
    this._state.governingSpecialty =
      root.querySelector('[name="governingSpecialty"]')?.value ?? this._state.governingSpecialty;
  }

  _controlsSnapshot() {
    return {
      mounted: this._state.mounted,
      aimSeconds: this._state.aimSeconds,
      braced: this._state.braced,
      laserSight: this._state.laserSight,
      manualModifier: this._state.manualModifier,
      rangeIndex: this._state.rangeIndex,
      governingSpecialty: this._state.governingSpecialty
    };
  }

  async _persistDraft() {
    const session = await this.sessionService.saveDraftConfiguration({
      zoneCount: this._state.zoneCount,
      zoneShots: this._state.zoneShots,
      controls: this._controlsSnapshot()
    });
    this.regionService.setSessionId(session.sessionId);
    return session;
  }

  async _withPlacementWindowsMinimized(operation) {
    const candidates = [this, ...this.placementApps]
      .filter((app, index, list) => app?.rendered && list.indexOf(app) === index);
    const restore = [];
    try {
      for (const app of candidates) {
        if (app.minimized) continue;
        await app.minimize();
        restore.push(app);
      }
      return await operation();
    } finally {
      for (const app of restore.reverse()) {
        if (app.rendered && app.minimized) await app.maximize();
      }
    }
  }
  _silhouette() {
    return this.targetingService.getSelection("silhouette") ??
      this.targetingService.getSelection(
        this.targetingService.getDefaultSelection().zoneId,
        this.targetingService.getDefaultSelection().regionId
      );
  }

  _baseValues() {
    const silhouette = this._silhouette();
    return {
      shots: 1,
      rofMode: "0",
      governingSpecialty: this._state.governingSpecialty,
      manualModifier: this._state.manualModifier,
      aimSeconds: this._state.aimSeconds,
      braced: this._state.braced,
      laserSight: this._state.laserSight,
      moveAndAttack: false,
      allOutAttack: false,
      height: "",
      highGround: false,
      rangeIndex: this._state.rangeIndex,
      hitLocationId: silhouette?.zoneId ?? "silhouette",
      hitRegionId: silhouette?.regionId ?? null
    };
  }

  _zonePreview(shots) {
    const details = this.calculateEffectiveFireSkillDetails(
      this.attack, this._baseValues(), this.rangeBands, this.targetingService, this.targetedAttackContext
    );
    const rapidFireBonus = this.fireService.calculateRapidFireBonus(shots);
    const uncappedSkill = Number.isFinite(details?.effectiveSkill)
      ? details.effectiveSkill + rapidFireBonus
      : null;
    return {
      rapidFireBonus,
      uncappedSkill,
      ...calculateSuppressionFireSkill({
        uncappedSkill,
        rapidFireBonus,
        mounted: this._state.mounted
      })
    };
  }

  _rangeEntry() {
    return this.rangeBands.find(entry => entry.index === this._state.rangeIndex) ?? null;
  }

  _executionOptions({ zoneIndex, shots, remainingShots, targetName, consumeAction }) {
    const preview = this._zonePreview(shots);
    const range = this._rangeEntry();
    const aimed = this.fireService.resolveAimedFireBonuses({
      accuracy: this.attack.acc,
      scopeBonus: this.attack.scopeBonus ?? this.attack.data?.scopeBonus ?? 0,
      aimSeconds: this._state.aimSeconds,
      braced: this._state.braced,
      laserSight: this._state.laserSight,
      moveAndAttack: false
    });
    return {
      shots,
      physicalShots: shots,
      effectiveRoF: shots,
      rapidFireBonus: preview.rapidFireBonus,
      effectiveSkill: preview.effectiveSkill,
      rcl: this.fireService.parseAttackRcl(this.attack),
      aimSeconds: this.fireService.normalizeAimSeconds(this._state.aimSeconds),
      aimBonus: aimed.aimBonus,
      braced: this._state.braced,
      bracingBonus: aimed.bracingBonus,
      sightBonus: aimed.sightBonus,
      laserSight: this._state.laserSight,
      laserBonus: aimed.laserBonus,
      moveAndAttack: false,
      moveAttackPenalty: 0,
      allOutAttack: false,
      allOutAttackBonus: 0,
      manualModifier: integer(this._state.manualModifier),
      rangePenalty: range?.penalty ?? 0,
      rangeLabel: range?.label ?? "",
      effectRangePenalty: this.getEffectRangePenalty?.() ?? null,
      hitLocationPenalty: 0,
      hitLocationModifierLabel: "Random Hit Location",
      extremelyClose: false,
      contextLabel: "Suppression Fire - Zone " + (zoneIndex + 1) + " - " + targetName,
      maximumHits: remainingShots,
      consumeAction,
      maneuver: { type: "allOutAttack", option: "suppressionFire" }
    };
  }

  _zoneContent(index, pairMap) {
    const sessionZone = this.sessionService.session?.zones?.[index];
    const shots = sessionZone?.shotsAllocated ?? this._state.zoneShots[index] ?? SUPPRESSION_FIRE_MINIMUM_SHOTS;
    const preview = this._zonePreview(shots);
    const skill = Number.isFinite(preview.effectiveSkill) ? preview.effectiveSkill : "-";
    const raw = Number.isFinite(preview.uncappedSkill) ? preview.uncappedSkill : "-";
    const pair = pairMap.get(index);
    const ready = !!pair?.target && !!pair?.corridor;
    const depleted = this._isActive() && sessionZone?.depleted;
    const remaining = Math.max(0, integer(sessionZone?.hitsRemaining ?? shots));
    const remainingText = this._isActive()
      ? "\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: " + remaining + " / " + shots
      : "";
    const regionText = depleted
      ? "Zone depleted - no remaining hits"
      : ready
        ? (this._isActive()
            ? `Target + Corridor - remaining hits: ${sessionZone?.hitsRemaining ?? shots}`
            : "Target Zone + Corridor ready")
        : "Region not selected";
    return `
      <section class="gam-suppression-zone" data-zone="${index}">
        <div class="gam-suppression-zone-head">
          <strong>Zone ${index + 1}</strong>
          <input type="number" data-zone-shots data-zone-index="${index}"
            min="${SUPPRESSION_FIRE_MINIMUM_SHOTS}" step="1" value="${escapeHTML(shots)}"
            aria-label="Shots for Zone ${index + 1}" ${this._isStarted() ? "disabled" : ""}>
          <span class="gam-suppression-zone-skill" data-zone-preview="${index}">
            RF +${preview.rapidFireBonus} | cap ${preview.cap} | skill ${skill}
            <span title="Before cap">(${raw})</span>
          </span>
        </div>
        <div class="gam-suppression-region-status ${ready ? "ready" : ""} ${depleted ? "depleted" : ""}">
          ${escapeHTML(regionText)}
        </div>
        ${remainingText ? '<div class="gam-suppression-hit-pool" data-zone-hits="' + index + '">' +
          escapeHTML(remainingText) + '</div>' : ""}
      </section>
    `;
  }

  _governingContent(disabled) {
    const options = this._governingOptions();
    if (!options.length) {
      return '<label class="gam-suppression-field"><span>Governing skill</span>' +
        '<input type="text" value="No GGA skill found" disabled></label>';
    }
    return '<label class="gam-suppression-field"><span>Governing skill</span>' +
      '<select name="governingSpecialty" ' + disabled + '>' +
      '<option value="">Select Guns specialty</option>' +
      options.map(option => '<option value="' + escapeHTML(option.value) + '" ' +
        (option.value === this._state.governingSpecialty ? "selected" : "") + '>' +
        escapeHTML(option.label) + '</option>').join("") +
      '</select></label>';
  }

  _rangeOptions() {
    return '<option value="">Select range</option>' + this.rangeBands.map(range =>
      '<option value="' + range.index + '" ' +
      (range.index === this._state.rangeIndex ? "selected" : "") + '>' +
      escapeHTML(range.label) + ' (' + (range.penalty >= 0 ? "+" : "") + range.penalty + ')' +
      '</option>'
    ).join("");
  }

  _buildContent() {
    const capacity = this._capacity();
    const sessionCount = Math.max(1, integer(this.sessionService.session?.zoneCount ?? 1));
    const maximumZones = this._isStarted()
      ? Math.max(sessionCount, capacity.maximumZones, 1)
      : Math.max(1, capacity.maximumZones);
    this._state.zoneCount = this._isStarted()
      ? sessionCount
      : Math.min(maximumZones, Math.max(1, this._state.zoneCount));
    while (this._state.zoneShots.length < this._state.zoneCount) {
      this._state.zoneShots.push(SUPPRESSION_FIRE_MINIMUM_SHOTS);
    }
    this._state.zoneShots.length = this._state.zoneCount;
    const pairMap = this.regionService.getZonePairs(this._state.zoneCount);
    const disabled = this._isStarted() ? "disabled" : "";
    const zoneOptions = Array.from({ length: maximumZones }, (_entry, index) => {
      const value = index + 1;
      return '<option value="' + value + '" ' +
        (value === this._state.zoneCount ? "selected" : "") + '>' + value + '</option>';
    }).join("");
    const zones = Array.from({ length: this._state.zoneCount }, (_entry, index) =>
      this._zoneContent(index, pairMap)
    ).join("");
    const allocation = validateSuppressionFireAllocation(this._state.zoneShots, capacity.availableShots);
    const totalRemaining = this.sessionService.session?.zones?.reduce(
      (total, zone) => total + Math.max(0, integer(zone.hitsRemaining)), 0
    ) ?? 0;
    const statusText = this._isActive()
      ? `Suppression Fire is active - total remaining hits: ${totalRemaining}`
      : allocation.valid
        ? `Allocated ${allocation.totalShots} of ${capacity.availableShots} rounds`
        : allocation.errors.join("; ");    return `
      <div class="gam-suppression">
        <div class="gam-suppression-summary">
          <div>
            <h3>${escapeHTML(this.weapon.name)}</h3>
            <p>Skill ${escapeHTML(this.attack.level)} | RoF ${escapeHTML(this.attack.rof)}
              | Rcl ${escapeHTML(this.attack.rcl || "-")} | Acc ${escapeHTML(this.attack.acc ?? "-")}</p>
          </div>
          <div class="gam-suppression-ammo">
            <strong>${this.weapon.magazines[this.weapon.loadedIndex]}/${this.weapon.capacity}</strong>
            <br><small>Available ${capacity.availableShots}</small>
          </div>
        </div>

        <div class="gam-suppression-controls">
          ${this._governingContent(disabled)}
          <label class="gam-suppression-field">
            <span>2-yard zones</span>
            <select name="zoneCount" ${disabled || maximumZones <= 1 ? "disabled" : ""}>${zoneOptions}</select>
          </label>
          <label class="gam-suppression-field">
            <span>Aim, sec.</span>
            <input type="number" name="aimSeconds" min="0" step="1"
              value="${escapeHTML(this._state.aimSeconds)}" placeholder="0" ${disabled}>
          </label>
          <label class="gam-suppression-field">
            <span>Mounted / stabilized</span>
            <input type="number" name="manualModifier" step="1"
              value="${escapeHTML(this._state.manualModifier)}" placeholder="0" ${disabled}>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="braced" ${this._state.braced ? "checked" : ""} ${disabled}>
            <span>Brace</span>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="laserSight" ${this._state.laserSight ? "checked" : ""} ${disabled}>
            <span>Laser</span>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="mounted" ${this._state.mounted ? "checked" : ""} ${disabled}>
            <span>Mounted / stabilized</span>
          </label>
          <label class="gam-suppression-field gam-suppression-range">
            <span>Range</span>
            <select name="rangeIndex" ${disabled}>${this._rangeOptions()}</select>
          </label>
        </div>

        <div class="gam-suppression-zones">${zones}</div>
        <p class="gam-suppression-status" data-suppression-status>${escapeHTML(statusText)}</p>
        <div class="gam-suppression-actions">
          <button type="button" data-suppression-action="execute"
            ${this._isStarted() || !capacity.eligible ? "disabled" : ""}>
            <i class="fa-solid fa-burst"></i> \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c
          </button>
          <button type="button" data-suppression-action="select-zones" ${this._isStarted() ? "disabled" : ""}>
            <i class="fa-solid fa-draw-polygon"></i> \u0412\u044b\u0434\u0435\u043b\u0438\u0442\u044c \u0437\u043e\u043d\u044b
          </button>
          <button type="button" data-suppression-action="clear-zones">
            <i class="fa-solid fa-eraser"></i> \u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0437\u043e\u043d\u044b
          </button>
        </div>
      </div>
    `;
  }

  async _prepareContext() { return {}; }
  async _renderHTML() { return this._buildContent(); }
  _replaceHTML(result, content) { content.innerHTML = result; }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    if (!root.querySelector("style[data-suppression-fire-style]")) {
      const style = document.createElement("style");
      style.dataset.suppressionFireStyle = "true";
      style.textContent = SUPPRESSION_FIRE_CSS;
      root.prepend(style);
    }
    if (root.dataset.suppressionFireListeners !== "true") {
      root.addEventListener("input", this._boundInput);
      root.addEventListener("change", this._boundInput);
      root.addEventListener("click", this._boundClick);
      root.dataset.suppressionFireListeners = "true";
    }
    this._updatePreview();
  }

  async close(options = {}) {
    const result = await super.close(options);
    this.closeCallback?.(this);
    return result;
  }

  _updatePreview() {
    const capacity = this._capacity();
    const allocation = validateSuppressionFireAllocation(this._state.zoneShots, capacity.availableShots);
    const totalRemaining = this.sessionService.session?.zones?.reduce(
      (total, zone) => total + Math.max(0, integer(zone.hitsRemaining)), 0
    ) ?? 0;
    const status = this.element?.querySelector("[data-suppression-status]");
    if (status) status.textContent = this._isActive()
      ? `Suppression Fire is active - total remaining hits: ${totalRemaining}`
      : allocation.valid
        ? `Allocated ${allocation.totalShots} of ${capacity.availableShots} rounds`
        : allocation.errors.join("; ");
    this._state.zoneShots.forEach((shots, index) => {
      const preview = this._zonePreview(shots);
      const node = this.element?.querySelector('[data-zone-preview="' + index + '"]');
      if (node) node.textContent = "RF +" + preview.rapidFireBonus +
        " | cap " + preview.cap +
        " | skill " + (Number.isFinite(preview.effectiveSkill) ? preview.effectiveSkill : "-");
    });
    const execute = this.element?.querySelector('[data-suppression-action="execute"]');
    if (execute) execute.disabled = this._submitting || this._isStarted() || !capacity.eligible;
    const select = this.element?.querySelector('[data-suppression-action="select-zones"]');
    if (select) select.disabled = this._submitting || this._isStarted();
    const clear = this.element?.querySelector('[data-suppression-action="clear-zones"]');
    if (clear) clear.disabled = this._submitting;
  }

  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target : null;
    if (!field || this._isStarted()) return;
    this._captureFields();
    if (field.name === "zoneCount") {
      const capacity = this._capacity();
      this._state.zoneCount = Math.min(capacity.maximumZones, Math.max(1, integer(field.value)));
      while (this._state.zoneShots.length < this._state.zoneCount) {
        this._state.zoneShots.push(SUPPRESSION_FIRE_MINIMUM_SHOTS);
      }
      this._state.zoneShots.length = this._state.zoneCount;
      await this.regionService.pruneZones(this._state.zoneCount);
      await this._persistDraft();
      await this.render({ force: true });
      return;
    }
    if (field.name === "governingSpecialty") {
      await this.governingSkillChangeCallback?.(field.value);
    }
    await this._persistDraft();
    this._updatePreview();
  }

  async _appendRandomLocations(message, count) {
    if (!message?.update || count <= 0) return;
    try {
      const locations = await this.targetingService.resolveRandomHitLocations(count);
      const html = buildRandomHitLocationsHtml(locations, { escapeHtml: escapeHTML });
      const content = String(message.content ?? "");
      await message.update({ content: content + html });
    } catch (error) {
      console.error("Suppression Fire random Hit Location:", error);
      ui.notifications.warn("The attack was rolled, but Random Hit Location could not be added to its message.");
    }
  }

  async _createSummary(zoneSnapshots) {
    const mountedText = this._state.mounted ? "yes" : "no";
    const rows = zoneSnapshots.map(zone => {
      const targetNames = zone.targets.length
        ? zone.targets.map(target => escapeHTML(target.name)).join(", ")
        : "no targets inside target/corridor";
      return "<li>Zone " + (zone.index + 1) + ": <strong>" + zone.shots +
        "</strong> rounds; RF <strong>+" + zone.preview.rapidFireBonus +
        "</strong>; cap <strong>" + zone.preview.cap + "</strong>; targets: " + targetNames + "</li>";
    }).join("");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.token }),
      content: '<div style="font-size:.88em;line-height:1.3">' +
        '<h3 style="margin:0 0 5px">Suppression Fire</h3>' +
        '<p style="margin:0 0 5px"><strong>' + escapeHTML(this.weapon.name) + '</strong>' +
        ' | All-Out Attack (Suppression Fire)' +
        ' | mounted/stabilized: <strong>' + mountedText + '</strong></p>' +
        '<ol style="margin:0;padding-left:22px">' + rows + '</ol></div>'
    });
  }

  _validate() {
    const capacity = this._capacity();
    const allocation = validateSuppressionFireAllocation(
      this._state.zoneShots.slice(0, this._state.zoneCount), capacity.availableShots
    );
    const errors = [...allocation.errors];
    if (!capacity.eligible) errors.push("Suppression Fire requires RoF 5+ and at least 5 available rounds");
    if (!this._rangeEntry()) errors.push("Select a range");
    return { valid: errors.length === 0, errors, allocation, capacity };
  }
  async _selectZones(button) {
    this._captureFields();
    if (this._submitting || this._isStarted()) return;
    this._submitting = true;
    this._updatePreview();
    try {
      await this._persistDraft();
      const result = await this._withPlacementWindowsMinimized(
        () => this.regionService.placeZones(this._state.zoneCount)
      );
      if (!result.ok) {
        const notify = result.cancelled ? ui.notifications.warn : ui.notifications.error;
        notify.call(ui.notifications, result.error);
        return;
      }
      await this.sessionService.setPlacement(result.refs);
      if (!result.adjacency.valid) {
        ui.notifications.warn(result.adjacency.error + " Place adjacent target zones before firing.");
      } else {
        ui.notifications.info("Target zones and suppression corridors created.");
      }
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire Regions:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _clearZones(button) {
    if (this._submitting) return;
    this._submitting = true;
    this._updatePreview();
    try {
      const result = await this.sessionService.finish({ deleteRegions: true });
      ui.notifications.info(result.removedRegions
        ? `Removed suppression Regions: ${result.removedRegions}.`
        : "No Regions were found for this Suppression Fire session.");
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire clear Regions:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _perform(button) {
    this._captureFields();
    if (this._isStarted()) {
      ui.notifications.info("This Suppression Fire is already active; ammunition was not consumed again.");
      return;
    }
    await this._persistDraft();
    const validation = this._validate();
    if (!validation.valid) {
      ui.notifications.error("Allocation error: " + validation.errors.join("; ") + ".");
      return;
    }
    const refreshed = await this.regionService.refreshCorridors(this._state.zoneCount);
    if (!refreshed.valid) {
      ui.notifications.error(refreshed.errors.join(" "));
      return;
    }
    const regionValidation = this.regionService.validate(this._state.zoneCount);
    if (!regionValidation.valid) {
      ui.notifications.error(regionValidation.errors.join(" "));
      return;
    }
    const zones = validation.allocation.shots.map((shots, index) => ({
      index,
      shots,
      preview: this._zonePreview(shots),
      pair: regionValidation.pairs[index],
      targets: this.regionService.getTargets(regionValidation.pairs[index])
    }));

    this._submitting = true;
    button.disabled = true;
    let activated = false;
    try {
      const activation = await this.sessionService.activate({
        zoneShots: validation.allocation.shots,
        controls: this._controlsSnapshot()
      });
      if (activation.alreadyActive) {
      ui.notifications.info("This Suppression Fire is already active; ammunition was not consumed again.");
        return;
      }
      activated = true;
      const consumed = await this.consumeAmmo(validation.allocation.totalShots);
      if (!consumed) throw new Error("Unable to consume the allocated ammunition.");
      await this.sessionService.markAmmoConsumed();
      await this._createSummary(zones);

      let consumeAction = true;
      let completed = false;
      outer: for (const zone of zones) {
        const persistentZone = this.sessionService.session?.zones?.[zone.index];
        if (!persistentZone || persistentZone.depleted) continue;
        let hitsRemaining = persistentZone.hitsRemaining;
        for (const target of zone.targets) {
          if (hitsRemaining <= 0) break;
          const options = this._executionOptions({
            zoneIndex: zone.index,
            shots: persistentZone.shotsAllocated,
            remainingShots: hitsRemaining,
            targetName: target.name,
            consumeAction
          });
          const result = await this.fireService.executeRangedAttack(this.attack, options);
          if (!result.rolled) continue;
          consumeAction = false;
          const margin = this.fireService.extractMarginFromRoll(result.rollData);
          const calculatedHits = calculateSuppressionFireHits({
            remainingShots: hitsRemaining,
            rcl: options.rcl,
            margin
          });
          if (Number.isInteger(calculatedHits)) {
            const recorded = await this.sessionService.recordHits(zone.index, calculatedHits);
            hitsRemaining = Math.max(0, hitsRemaining - recorded.actualHits);
            await this._appendRandomLocations(result.message, recorded.actualHits);
            if (recorded.completed) {
              completed = true;
              break outer;
            }
          }
        }
      }
      if (completed) ui.notifications.info("Suppression Fire was depleted and ended.");
      await this.completeCallback?.();
      await this.render({ force: true });
    } catch (error) {
      if (activated && !this.sessionService.session?.ammoConsumed) {
        await this.sessionService.revertActivation();
      }
      console.error("Suppression Fire:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-suppression-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.suppressionAction === "select-zones" && !this._submitting) {
      return this._selectZones(button);
    }
    if (button.dataset.suppressionAction === "clear-zones" && !this._submitting) {
      return this._clearZones(button);
    }
    if (button.dataset.suppressionAction === "execute" && !this._submitting) {
      return this._perform(button);
    }
  }
}
