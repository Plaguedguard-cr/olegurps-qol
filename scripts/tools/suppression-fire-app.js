import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { getTokenFireRangeContext } from "./fire-control-context.js";
import { SuppressionFireRegionService } from "./suppression-fire-region-service.js";
import { getFireSkillPreview, skillProbabilityColor } from "./fire-skill-preview.js";
import { activateSuppressionFireRuntime, registerSuppressionFireRuntimeContext } from "./suppression-fire-runtime-service.js";
import {
  getSafeSuppressionTargetName,
  selectSuppressionManualTarget,
  setSuppressionTargets,
  suppressionTargetId,
  SUPPRESSION_TARGET_FALLBACK
} from "./suppression-fire-presentation.js";
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

const valuesOf = collection => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  try { return Array.from(collection.values?.() ?? collection); }
  catch (_error) { return []; }
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
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(128,128,128,.32);
  }
  .gam-suppression-summary h3,
  .gam-suppression-summary p { margin: 0; }
  .gam-suppression-summary p { opacity: .78; }
  .gam-suppression-ammo { text-align: right; white-space: nowrap; }
  .gam-fire-skill {
    display: grid;
    justify-items: end;
    gap: 2px;
    text-align: right;
    white-space: nowrap;
  }
  .gam-fire-skill-label,
  .gam-fire-source-skill { font-size: 0.82em; opacity: 0.72; }
  .gam-fire-skill-value { font-size: 1.22em; }
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
  .gam-suppression-edit-corridor {
    width: 30px;
    min-width: 30px;
    height: 30px;
    margin: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .gam-suppression-zone-skill { justify-self: end; white-space: nowrap; }
  .gam-suppression-zone.active { border-color: rgba(110,190,125,.72); }
  .gam-suppression-zone.depleted { opacity: .62; }
  .gam-suppression-zone-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
  .gam-suppression-zone-meta label { display:grid; gap:3px; margin:0; }
  .gam-suppression-zone-meta input, .gam-suppression-zone-meta select { width:100%; margin:0; }
  .gam-suppression-zone-meta label.gam-suppression-high-ground {
    display: flex;
    flex-direction: row;
    align-items: center;
    align-self: end;
    justify-content: flex-start;
    gap: 6px;
    min-height: 30px;
  }
  .gam-suppression-zone-meta label.gam-suppression-high-ground input { width: auto; }
  .gam-suppression-zone-targets { min-height:20px; opacity:.82; }
  .gam-suppression-zone-actions { display:flex; flex-wrap:wrap; gap:6px; }
  .gam-suppression-zone-actions button { flex:0 1 auto; min-width:0; margin:0; padding:5px 9px; }
  .gam-suppression-region-status { min-height: 22px; opacity: .78; }
  .gam-suppression-region-status.ready { color: #7ed38c; opacity: 1; }
  .gam-suppression-region-status.depleted { color: #d28a8a; opacity: 1; }
  .gam-suppression-hit-pool { font-weight: 700; color: #e6c98c; }
  .gam-suppression-status { min-height: 1.2em; margin: 0; color: #e4bd75; }
  .gam-suppression-actions {
    display: grid;
    grid-template-columns: minmax(86px, auto) minmax(0, 1fr) minmax(90px, auto);
    gap: 8px;
    padding-top: 7px;
    border-top: 1px solid rgba(128,128,128,.32);
  }
  .gam-suppression-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    min-height: 42px;
    height: auto;
    margin: 0;
    padding: 5px 7px;
    line-height: 1.15;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .gam-suppression-actions button i { flex: 0 0 auto; }
  .gam-suppression-actions .gam-suppression-manual-toggle { padding-inline: 12px; white-space: nowrap; }
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
    window: { title: "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c (\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430)", resizable: true },
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
      window: { title: "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c (\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430) - " + weapon.name, resizable: true, ...(options.window ?? {}) }
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
      zoneRanges: session?.zones?.map(zone => ({
        rangeIndex: zone.rangeIndex,
        height: zone.height ?? "",
        highGround: zone.highGround === true
      })) ?? [{ rangeIndex: null, height: "", highGround: false }],
      activeZoneIndex: 0,
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
    this._switchingTargets = false;
    this._targetsInitialized = false;
    this._skipCloseTargetSave = false;
    this._boundInput = this._onInput.bind(this);
    this._boundClick = this._onClick.bind(this);
    this._boundTargetChange = this._onTargetChange.bind(this);
    this._targetHookId = globalThis.Hooks?.on?.("targetToken", this._boundTargetChange);
    this._registerRuntime();
  }

  _registerRuntime() {
    const sessionId = this.sessionService.session?.sessionId;
    if (!sessionId) return;
    this._unregisterRuntime = registerSuppressionFireRuntimeContext(sessionId, {
      runtime: globalThis,
      sessionService: this.sessionService,
      regionService: this.regionService,
      buildRequest: (zoneIndex, target, event) => this._buildRequest(zoneIndex, target, event),
      executeRequest: request => this._executeRequest(request, { consumeAction: false, allowDraft: false }),
      onSessionChange: async () => {
        if (this.rendered) await this.render({ force: true });
      },
      onEnded: async () => {
        this.sessionService.session = null;
        if (this.rendered) await this.render({ force: true });
      }
    });
    if (this._isAutomaticActive()) {
      void activateSuppressionFireRuntime(sessionId).catch(error => {
        console.error("OleGURPS QOL | Suppression Fire runtime restore:", error);
      });
    }
  }

  _ensureZoneState() {
    while (this._state.zoneShots.length < this._state.zoneCount) {
      this._state.zoneShots.push(SUPPRESSION_FIRE_MINIMUM_SHOTS);
    }
    while (this._state.zoneRanges.length < this._state.zoneCount) {
      this._state.zoneRanges.push({ rangeIndex: null, height: "", highGround: false });
    }
    this._state.zoneShots.length = this._state.zoneCount;
    this._state.zoneRanges.length = this._state.zoneCount;
  }

  _isStarted() {
    return this.sessionService?.hasStarted === true || this.sessionService?.session?.ammoConsumed === true;
  }

  _isActive() { return this.sessionService?.isActive === true; }
  _isManualActive() { return this.sessionService?.isManualActive === true; }
  _isAutomaticActive() { return this.sessionService?.isAutomaticActive === true; }

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

  _captureFields({ captureZoneCount = true } = {}) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    if (captureZoneCount) {
      this._state.zoneCount = Math.max(1, integer(root.querySelector('[name="zoneCount"]')?.value));
    }
    this._ensureZoneState();
    for (const input of root.querySelectorAll("[data-zone-shots]")) {
      this._state.zoneShots[integer(input.dataset.zoneIndex)] = integer(input.value);
    }
    for (const field of root.querySelectorAll("[data-zone-range-index]")) {
      const index = integer(field.dataset.zoneIndex);
      this._state.zoneRanges[index].rangeIndex = field.value === "" ? null : integer(field.value);
    }
    for (const field of root.querySelectorAll("[data-zone-height]")) {
      this._state.zoneRanges[integer(field.dataset.zoneIndex)].height = field.value ?? "";
    }
    for (const field of root.querySelectorAll("[data-zone-high-ground]")) {
      this._state.zoneRanges[integer(field.dataset.zoneIndex)].highGround = !!field.checked;
    }
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
      zoneConfigs: this._state.zoneRanges.map(entry => ({
        rangeIndex: entry.rangeIndex,
        height: entry.height,
        highGround: entry.highGround
      })),
      controls: this._controlsSnapshot()
    });
    this.regionService.setSessionId(session.sessionId);
    this._registerRuntime();
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

  _baseValues(zoneIndex = 0, targetContext = null) {
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
      height: targetContext?.height ?? this._state.zoneRanges[zoneIndex]?.height ?? "",
      elevationDirection: targetContext?.elevationDirection ?? (Number(this._state.zoneRanges[zoneIndex]?.height) > 0
        ? this._state.zoneRanges[zoneIndex]?.highGround ? "high" : "low" : "level"),
      rangeIndex: targetContext?.rangeIndex ?? this._state.zoneRanges[zoneIndex]?.rangeIndex ?? null,
      hitLocationId: silhouette?.zoneId ?? "silhouette",
      hitRegionId: silhouette?.regionId ?? null
    };
  }

  _zonePreview(shots, zoneIndex = 0, targetContext = null) {
    const details = this.calculateEffectiveFireSkillDetails(
      this.attack, this._baseValues(zoneIndex, targetContext), this.rangeBands, this.targetingService, this.targetedAttackContext
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

  _formatZonePreview(preview) {
    const rapidFireBonus = Number.isFinite(preview?.rapidFireBonus) ? preview.rapidFireBonus : 0;
    const calculated = Number.isFinite(preview?.uncappedSkill) ? preview.uncappedSkill : "-";
    const cap = Number.isFinite(preview?.cap) ? preview.cap : "-";
    const effective = Number.isFinite(preview?.effectiveSkill) ? preview.effectiveSkill : "-";
    return "RF +" + rapidFireBonus + " | \u0440\u0430\u0441\u0447\u0451\u0442 " + calculated +
      " | cap " + cap + " | \u0438\u0442\u043e\u0433 " + effective;
  }

  _getDisplayedSkillPreview() {
    const shots = this._state.zoneShots[0] ?? SUPPRESSION_FIRE_MINIMUM_SHOTS;
    return getFireSkillPreview(this._zonePreview(shots).effectiveSkill);
  }
  _rangeEntry(zoneIndex = 0, targetContext = null) {
    const index = targetContext?.rangeIndex ?? this._state.zoneRanges[zoneIndex]?.rangeIndex;
    return this.rangeBands.find(entry => entry.index === index) ?? null;
  }

  _executionOptions({ zoneIndex, shots, remainingShots, targetName, consumeAction, targetContext = null }) {
    const preview = this._zonePreview(shots, zoneIndex, targetContext);
    const range = this._rangeEntry(zoneIndex, targetContext);
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

  _targetById(id) {
    return globalThis.canvas?.tokens?.get?.(id) ??
      globalThis.canvas?.tokens?.placeables?.find(token =>
        String(token?.document?.id ?? token?.id ?? "") === String(id)
      ) ?? null;
  }

  _targetNames(zone) {
    const token = this._targetById(zone?.targetId);
    return token ? [getSafeSuppressionTargetName(token)] : [];
  }

  _targetDetails(zone) {
    const token = this._targetById(zone?.targetId);
    if (!token) return [];
    const name = getSafeSuppressionTargetName(token);
    const context = this._targetContext(token);
    if (!context) return [name];
    const height = Number(context.height) > 0 ? ", \u0432\u044b\u0441\u043e\u0442\u0430 " + context.height : "";
    const range = context.distance + " \u044f\u0440\u0434\u043e\u0432" + height;
    return [name === SUPPRESSION_TARGET_FALLBACK ? range : name + ": " + range];
  }
  _zoneRangeOptions(selected) {
    return '<option value="">Выберите расстояние</option>' +
      this.rangeBands.map(range =>
        '<option value="' + range.index + '" ' + (range.index === selected ? "selected" : "") + '>' +
        escapeHTML(range.label) + ' (' + (range.penalty >= 0 ? "+" : "") + range.penalty + ')</option>'
      ).join("");
  }

  _zoneContent(index, pairMap) {
    const zone = this.sessionService.session?.zones?.[index] ?? {};
    const shots = zone.shotsAllocated ?? this._state.zoneShots[index] ?? SUPPRESSION_FIRE_MINIMUM_SHOTS;
    const preview = this._zonePreview(shots, index);
    const pair = pairMap.get(index);
    const ready = !!pair?.target && !!pair?.corridor;
    const depleted = zone.depleted === true;
    const active = this._isActive() && !depleted;
    const remaining = Math.max(0, integer(zone.hitsRemaining ?? shots));
    const range = this._state.zoneRanges[index] ?? {};
    const targets = this._isAutomaticActive()
      ? this.regionService.getTargets(pair).map(entry => {
          const context = this._targetContext(entry.token);
          const name = getSafeSuppressionTargetName(entry.token);
          return context ? name + ": " + context.distance + " \u044f\u0440\u0434\u043e\u0432" : name;
        })
      : this._targetDetails(zone);
    const regionText = depleted
      ? "\u0417\u043e\u043d\u0430 \u0438\u0441\u0447\u0435\u0440\u043f\u0430\u043d\u0430"
      : active
        ? "\u0417\u043e\u043d\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u0430; \u0433\u0435\u043e\u043c\u0435\u0442\u0440\u0438\u044f \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0430"
        : ready
          ? "\u0426\u0435\u043b\u0435\u0432\u0430\u044f \u0437\u043e\u043d\u0430 \u0438 corridor \u0433\u043e\u0442\u043e\u0432\u044b"
          : "\u041e\u0431\u043b\u0430\u0441\u0442\u044c \u043d\u0435 \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u0430";
    const geometryLocked = this._isStarted() ? "disabled" : "";
    const targetingLocked = this._isAutomaticActive() ? "disabled" : "";
    return `
      <section class="gam-suppression-zone ${active ? "active" : ""} ${depleted ? "depleted" : ""}" data-zone="${index}">
        <div class="gam-suppression-zone-head">
          <strong>\u0417\u043e\u043d\u0430 ${index + 1}${active ? " \u2014 \u0410\u041a\u0422\u0418\u0412\u041d\u0410" : depleted ? " \u2014 \u0418\u0421\u0427\u0415\u0420\u041f\u0410\u041d\u0410" : ""}</strong>
          <input type="number" data-zone-shots data-zone-index="${index}"
            min="${SUPPRESSION_FIRE_MINIMUM_SHOTS}" step="1" value="${escapeHTML(shots)}" ${geometryLocked}>
          <span class="gam-suppression-zone-skill" data-zone-preview="${index}">
            ${escapeHTML(this._formatZonePreview(preview))}
          </span>
        </div>
        <div class="gam-suppression-region-status ${ready ? "ready" : ""} ${depleted ? "depleted" : ""}">
          ${escapeHTML(regionText)}
        </div>
        ${this._isActive() ? `<div class="gam-suppression-hit-pool">\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: ${remaining} / ${shots}</div>` : ""}
        <div class="gam-suppression-zone-targets" data-zone-targets="${index}">
          <strong>\u0426\u0435\u043b\u0438:</strong> ${escapeHTML(targets.length ? targets.join(", ") : "\u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b")}
        </div>
        <div class="gam-suppression-zone-meta">
          <label><span>\u0420\u0430\u0441\u0441\u0442\u043e\u044f\u043d\u0438\u0435</span>
            <select data-zone-range-index data-zone-index="${index}" ${targetingLocked}>${this._zoneRangeOptions(range.rangeIndex)}</select>
          </label>
          <label><span>\u0412\u044b\u0441\u043e\u0442\u0430</span>
            <input type="number" min="0" step="1" data-zone-height data-zone-index="${index}" value="${escapeHTML(range.height ?? "")}" ${targetingLocked}>
          </label>
          <label class="gam-suppression-check gam-suppression-high-ground">
            <input type="checkbox" data-zone-high-ground data-zone-index="${index}" ${range.highGround ? "checked" : ""} ${targetingLocked}>
            <span>\u0421\u0442\u0440\u0435\u043b\u043e\u043a \u0432\u044b\u0448\u0435</span>
          </label>
        </div>
        <div class="gam-suppression-zone-actions">
          <button type="button" data-suppression-action="fire-zone" data-zone-index="${index}" ${!this._isManualActive() || depleted || !ready ? "disabled" : ""}>
            <i class="fa-solid fa-burst"></i> \u041e\u0433\u043e\u043d\u044c
          </button>
          <button type="button" data-suppression-action="targets-zone" data-zone-index="${index}" ${targetingLocked}>
            <i class="fa-solid fa-crosshairs"></i> \u0426\u0435\u043b\u0438
          </button>
          <button type="button" data-suppression-action="select-zone" data-zone-index="${index}" ${geometryLocked}>
            <i class="fa-solid fa-draw-polygon"></i> \u0412\u044b\u0434\u0435\u043b\u0438\u0442\u044c
          </button>
          <button type="button" data-suppression-action="edit-corridor" data-zone-index="${index}" ${geometryLocked || !ready ? "disabled" : ""}>
            <i class="fa-solid fa-pen"></i> \u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c
          </button>
          <button type="button" data-suppression-action="delete-zone" data-zone-index="${index}" ${geometryLocked || !ready ? "disabled" : ""}>
            <i class="fa-solid fa-trash"></i> \u0423\u0434\u0430\u043b\u0438\u0442\u044c
          </button>
        </div>
      </section>
    `;
  }
  _governingContent(disabled) {
    const options = this._governingOptions();
    if (!options.length) {
      return '<label class="gam-suppression-field"><span>\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u044f\u044e\u0449\u0438\u0439 \u043d\u0430\u0432\u044b\u043a</span>' +
        '<input type="text" value="\u041d\u0430\u0432\u044b\u043a GGA \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d" disabled></label>';
    }
    return '<label class="gam-suppression-field"><span>\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u044f\u044e\u0449\u0438\u0439 \u043d\u0430\u0432\u044b\u043a</span>' +
      '<select name="governingSpecialty" ' + disabled + '>' +
      '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044e Guns</option>' +
      options.map(option => '<option value="' + escapeHTML(option.value) + '" ' +
        (option.value === this._state.governingSpecialty ? "selected" : "") + '>' +
        escapeHTML(option.label) + '</option>').join("") +
      '</select></label>';
  }

  _rangeOptions() {
    return '<option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0430\u0441\u0441\u0442\u043e\u044f\u043d\u0438\u0435</option>' + this.rangeBands.map(range =>
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
    this._ensureZoneState();
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
    const statusText = this._isManualActive()
      ? "\u0420\u0443\u0447\u043d\u043e\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0430\u043a\u0442\u0438\u0432\u0435\u043d; \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: " + totalRemaining
      : this._isAutomaticActive()
        ? "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0430\u043a\u0442\u0438\u0432\u0435\u043d; \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: " + totalRemaining
        : allocation.valid
          ? "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432: " + allocation.totalShots + " \u0438\u0437 " + capacity.availableShots
          : allocation.errors.join("; ");    const skillPreview = this._getDisplayedSkillPreview();
    const sourceSkill = Number(this.attack?.level);
    const sourceSkillText = Number.isFinite(sourceSkill) ? Math.trunc(sourceSkill) : "\u2014";
    return `
      <div class="gam-suppression">
        <div class="gam-suppression-summary">
          <div>
            <h3>${escapeHTML(this.weapon.name)}</h3>
            <p>\u041d\u0430\u0432\u044b\u043a ${escapeHTML(this.attack.level)} | RoF ${escapeHTML(this.attack.rof)}
              | Rcl ${escapeHTML(this.attack.rcl || "-")} | Acc ${escapeHTML(this.attack.acc ?? "-")}</p>
          </div>
          <div class="gam-suppression-ammo">
            <strong>${this.weapon.magazines[this.weapon.loadedIndex]}/${this.weapon.capacity}</strong>
            <br><small>\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e: ${capacity.availableShots}</small>
          </div>
          <div class="gam-fire-skill" aria-live="polite">
            <span class="gam-fire-skill-label">\u042d\u0444\u0444\u0435\u043a\u0442\u0438\u0432\u043d\u043e\u0435 \u0443\u043c\u0435\u043d\u0438\u0435</span>
            <strong class="gam-fire-skill-value" data-skill-preview
              style="color: ${skillProbabilityColor(skillPreview.probability)}">${skillPreview.level} (${skillPreview.chance}%)</strong>
            <span class="gam-fire-source-skill">\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0443\u043c\u0435\u043d\u0438\u044f:
              <span data-source-skill>${sourceSkillText}</span></span>
          </div>
        </div>

        <div class="gam-suppression-controls">
          ${this._governingContent(disabled)}
          <label class="gam-suppression-field">
            <span>\u0417\u043e\u043d\u044b \u043f\u043e 2 \u044f\u0440\u0434\u0430</span>
            <select name="zoneCount" ${disabled || maximumZones <= 1 ? "disabled" : ""}>${zoneOptions}</select>
          </label>
          <label class="gam-suppression-field">
            <span>\u041f\u0440\u0438\u0446\u0435\u043b\u0438\u0432\u0430\u043d\u0438\u0435, \u0441\u0435\u043a.</span>
            <input type="number" name="aimSeconds" min="0" step="1"
              value="${escapeHTML(this._state.aimSeconds)}" placeholder="0" ${disabled}>
          </label>
          <label class="gam-suppression-field">
            <span>\u0411\u043e\u043d\u0443\u0441\u044b/\u0448\u0442\u0440\u0430\u0444\u044b</span>
            <input type="number" name="manualModifier" step="1"
              value="${escapeHTML(this._state.manualModifier)}" placeholder="0" ${disabled}>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="braced" ${this._state.braced ? "checked" : ""} ${disabled}>
            <span>\u0423\u043f\u043e\u0440</span>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="laserSight" ${this._state.laserSight ? "checked" : ""} ${disabled}>
            <span>\u041b\u0430\u0437\u0435\u0440</span>
          </label>
          <label class="gam-suppression-check">
            <input type="checkbox" name="mounted" ${this._state.mounted ? "checked" : ""} ${disabled}>
            <span>\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 / \u0441\u0442\u0430\u0431\u0438\u043b\u0438\u0437\u0430\u0446\u0438\u044f</span>
          </label>
        </div>

        <div class="gam-suppression-zones">${zones}</div>
        <p class="gam-suppression-status" data-suppression-status>${escapeHTML(statusText)}</p>
        <div class="gam-suppression-actions">
          <button type="button" class="gam-suppression-manual-toggle" data-suppression-action="toggle-manual"
            ${this._isAutomaticActive() || (!this._isManualActive() && !capacity.eligible) ? "disabled" : ""}>
            <i class="fa-solid ${this._isManualActive() ? "fa-stop" : "fa-play"}"></i>
            <span>${this._isManualActive() ? "\u0417\u0430\u043a\u043e\u043d\u0447\u0438\u0442\u044c" : "\u041d\u0430\u0447\u0430\u0442\u044c"}</span>
          </button>
          <button type="button" data-suppression-action="execute"
            ${this._isStarted() || !capacity.eligible ? "disabled" : ""}>
            <i class="fa-solid fa-burst"></i><span>${this._isAutomaticActive()
              ? "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0440\u0435\u0436\u0438\u043c \u0430\u043a\u0442\u0438\u0432\u0435\u043d"
              : "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0440\u0435\u0436\u0438\u043c"}</span>
          </button>
          <button type="button" data-suppression-action="cancel"
            ${this.sessionService.canCancelUnfired ? "" : "disabled"}>
            <i class="fa-solid fa-xmark"></i><span>\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c</span>
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
    this.regionService?.clearPlacementHighlights?.({ cancel: true });
    if (!this._skipCloseTargetSave && !this._isAutomaticActive() && this._targetsInitialized) await this._saveCurrentZoneTarget();
    if (!this._isAutomaticActive()) this._unregisterRuntime?.();
    if (this._targetHookId !== undefined) {
      globalThis.Hooks?.off?.("targetToken", this._targetHookId);
      this._targetHookId = undefined;
    }
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
    if (status) status.textContent = this._isManualActive()
      ? "\u0420\u0443\u0447\u043d\u043e\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0430\u043a\u0442\u0438\u0432\u0435\u043d; \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: " + totalRemaining
      : this._isAutomaticActive()
        ? "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0430\u043a\u0442\u0438\u0432\u0435\u043d; \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439: " + totalRemaining
        : allocation.valid
          ? "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432: " + allocation.totalShots + " \u0438\u0437 " + capacity.availableShots
          : allocation.errors.join("; ");    this._state.zoneShots.forEach((shots, index) => {
      const preview = this._zonePreview(shots, index);
      const node = this.element?.querySelector('[data-zone-preview="' + index + '"]');
      if (node) node.textContent = this._formatZonePreview(preview);
    });
    const skillPreview = this._getDisplayedSkillPreview();
    const skillNode = this.element?.querySelector("[data-skill-preview]");
    if (skillNode) {
      skillNode.textContent = skillPreview.level + " (" + skillPreview.chance + "%)";
      skillNode.style.color = skillProbabilityColor(skillPreview.probability);
    }
    const execute = this.element?.querySelector('[data-suppression-action="execute"]');
    if (execute) execute.disabled = this._submitting || this._isStarted() || !capacity.eligible;
    const cancel = this.element?.querySelector('[data-suppression-action="cancel"]');
    if (cancel) cancel.disabled = this._submitting || !this.sessionService.canCancelUnfired;
    const manualToggle = this.element?.querySelector('[data-suppression-action="toggle-manual"]');
    if (manualToggle) manualToggle.disabled = this._submitting || this._isAutomaticActive() ||
      (!this._isManualActive() && !capacity.eligible);
    const pairs = this.regionService.getZonePairs(this._state.zoneCount);
    for (const button of this.element?.querySelectorAll(
      '[data-suppression-action="select-zone"],[data-suppression-action="edit-corridor"],[data-suppression-action="delete-zone"]'
    ) ?? []) {
      const index = integer(button.dataset.zoneIndex);
      const pair = pairs.get(index);
      button.disabled = this._submitting || this._isStarted() ||
        (button.dataset.suppressionAction !== "select-zone" && (!pair?.target || !pair?.corridor));
    }
  }

  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target : null;
    if (!field || this._isAutomaticActive()) return;
    const manualTargetField = field.matches?.("[data-zone-range-index],[data-zone-height],[data-zone-high-ground]");
    if (this._isManualActive() && !manualTargetField) return;
    if (field.name === "zoneCount") {
      if (this._isStarted()) return;
      this._captureFields({ captureZoneCount: false });
      const capacity = this._capacity();
      const previousCount = this._state.zoneCount;
      const nextCount = Math.min(capacity.maximumZones, Math.max(1, integer(field.value)));
      this.regionService.clearPlacementHighlights({ cancel: true });
      if (nextCount < previousCount) await this.regionService.pruneZones(nextCount);
      const session = await this.sessionService.resizeDraftZones(nextCount);
      this._state.zoneCount = nextCount;
      this._state.zoneShots = session.zones.map(zone => zone.shotsAllocated);
      this._state.zoneRanges = session.zones.map(zone => ({
        rangeIndex: zone.rangeIndex,
        height: zone.height ?? "",
        highGround: zone.highGround === true
      }));
      this._state.activeZoneIndex = Math.min(this._state.activeZoneIndex, nextCount - 1);
      if (this._targetsInitialized) {
        const targetId = session.zones[this._state.activeZoneIndex]?.targetId ?? null;
        this._switchingTargets = true;
        try { await setSuppressionTargets(targetId ? [targetId] : []); }
        finally { this._switchingTargets = false; }
      }
      await this._persistDraft();
      await this.render({ force: true });
      return;
    }
    this._captureFields();
    this._updatePreview();
    if (field.name === "governingSpecialty") {
      await this.governingSkillChangeCallback?.(field.value);
      this._updatePreview();
    }
    await this._persistDraft();
  }

  async _onTargetChange(user, token, targeted) {
    if (this._skipCloseTargetSave || !this.sessionService.session || this._switchingTargets || this._isAutomaticActive() ||
        String(user?.id ?? "") !== String(globalThis.game?.user?.id ?? "")) return;
    this._targetsInitialized = true;
    await this._saveCurrentZoneTarget(targeted ? token : null);
    const zone = this.sessionService.session?.zones?.[this._state.activeZoneIndex];
    const node = this.element?.querySelector('[data-zone-targets="' + this._state.activeZoneIndex + '"]');
    if (node) {
      const names = this._targetDetails(zone);
      node.innerHTML = "<strong>\u0426\u0435\u043b\u0438:</strong> " +
        escapeHTML(names.length ? names.join(", ") : "\u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b");
    }
  }

  async _saveCurrentZoneTarget(preferredToken = null) {
    if (this._skipCloseTargetSave || !this.sessionService.session || this._switchingTargets || this._isAutomaticActive() || !this._targetsInitialized) return;
    const target = selectSuppressionManualTarget(globalThis.game?.user?.targets, preferredToken);
    const targetId = suppressionTargetId(target);
    const currentIds = valuesOf(globalThis.game?.user?.targets).map(suppressionTargetId).filter(Boolean);
    if (currentIds.length !== (targetId ? 1 : 0) || (targetId && currentIds[0] !== targetId)) {
      this._switchingTargets = true;
      try { await setSuppressionTargets(targetId ? [targetId] : []); }
      finally { this._switchingTargets = false; }
    }
    await this.sessionService.setZoneTarget(this._state.activeZoneIndex, targetId);
  }

  async _selectTargetsForZone(zoneIndex) {
    if (this._isAutomaticActive()) return;
    await this._saveCurrentZoneTarget();
    this._state.activeZoneIndex = integer(zoneIndex);
    const targetId = this.sessionService.session?.zones?.[this._state.activeZoneIndex]?.targetId ?? null;
    this._switchingTargets = true;
    try {
      await setSuppressionTargets(targetId ? [targetId] : []);
      this._targetsInitialized = true;
    } finally {
      this._switchingTargets = false;
    }
    await this.render({ force: true });
  }
  _targetContext(target) {
    return getTokenFireRangeContext({
      sourceToken: this.token,
      targetToken: target,
      rangeBands: this.rangeBands,
      runtime: globalThis
    });
  }

  async _buildRequest(zoneIndex, target, event = {}) {
    const zone = this.sessionService.session?.zones?.[zoneIndex];
    if (!zone || zone.depleted) return null;
    const targetContext = this._targetContext(target);
    if (!targetContext) return null;
    const targetId = target?.document?.id ?? target?.id;
    const preview = await this._withTargetSelection(targetId, async () =>
      this._zonePreview(zone.shotsAllocated, zoneIndex, targetContext)
    );
    return {
      zoneIndex,
      target,
      targetId,
      targetName: getSafeSuppressionTargetName(target),
      distance: targetContext.distance,
      height: targetContext.height,
      highGround: targetContext.elevationDirection === "high",
      rangeIndex: targetContext.rangeIndex,
      rangePenalty: targetContext.rangePenalty,
      rangeLabel: targetContext.rangeLabel,
      rapidFireBonus: preview.rapidFireBonus,
      uncappedSkill: preview.uncappedSkill,
      cap: preview.cap,
      effectiveSkill: preview.effectiveSkill,
      hitsRemaining: zone.hitsRemaining,
      movementId: event.movementId ?? null,
      position: event.position ?? null,
      createdAt: Date.now()
    };
  }
  async _withTargetSelection(targetId, operation) {
    const prior = valuesOf(globalThis.game?.user?.targets)
      .map(token => token?.document?.id ?? token?.id)
      .filter(Boolean);
    this._switchingTargets = true;
    try {
      if (targetId) await setSuppressionTargets([targetId]);
      return await operation();
    } finally {
      await setSuppressionTargets(prior);
      this._switchingTargets = false;
    }
  }

  async _executeRequest(request, { consumeAction = false, allowDraft = false } = {}) {
    const zone = this.sessionService.session?.zones?.[request.zoneIndex];
    if (!zone || zone.depleted) return null;
    const targetContext = {
      rangeIndex: request.rangeIndex,
      distance: request.distance,
      height: request.height,
      elevationDirection: Number(request.height) > 0 ? request.highGround ? "high" : "low" : "level"
    };
    return this._withTargetSelection(request.targetId, async () => {
      const options = this._executionOptions({
        zoneIndex: request.zoneIndex,
        shots: zone.shotsAllocated,
        remainingShots: zone.hitsRemaining,
        targetName: request.targetName,
        consumeAction,
        targetContext
      });
      const result = await this.fireService.executeRangedAttack(this.attack, options);
      if (!result.rolled) return result;
      const margin = this.fireService.extractMarginFromRoll(result.rollData);
      const calculatedHits = calculateSuppressionFireHits({
        remainingShots: zone.hitsRemaining,
        rcl: options.rcl,
        margin
      });
      if (Number.isInteger(calculatedHits)) {
        const recorded = await this.sessionService.recordHits(
          request.zoneIndex, calculatedHits, { allowDraft }
        );
        await this._appendRandomLocations(result.message, recorded.actualHits);
      }
      return result;
    });
  }
  async _fireZone(zoneIndex) {
    if (!this._isManualActive()) return;
    this._captureFields();
    const zone = this.sessionService.session?.zones?.[zoneIndex];
    if (!zone || zone.depleted || zone.hitsRemaining <= 0) return;
    const target = this._targetById(zone.targetId);
    if (!target) {
      globalThis.ui?.notifications?.warn?.("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0446\u0435\u043b\u044c \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u0417\u043e\u043d\u044b.");
      return;
    }
    const request = await this._buildRequest(zoneIndex, target, { movementId: "manual" });
    if (request) {
      await this._executeRequest(request, { consumeAction: true, allowDraft: false });
    }
    await this.render({ force: true });
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
      ui.notifications.warn("\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0443\u044e \u0437\u043e\u043d\u0443 \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044f \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435.");
    }
  }

  async _createSummary(zoneSnapshots) {
    const mountedText = this._state.mounted ? "yes" : "no";
    const rows = zoneSnapshots.map(zone => {
      const targetNames = zone.targets.length
        ? zone.targets.map(target => escapeHTML(getSafeSuppressionTargetName(target))).join(", ")
        : "no targets inside target/corridor";
      return "<li>Zone " + (zone.index + 1) + ": <strong>" + zone.shots +
        "</strong> rounds; RF <strong>+" + zone.preview.rapidFireBonus +
        "</strong>; cap <strong>" + zone.preview.cap + "</strong>; targets: " + targetNames + "</li>";
    }).join("");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.token }),
      content: '<div style="font-size:.88em;line-height:1.3">' +
        '<h3 style="margin:0 0 5px">Suppression Fire (\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430)</h3>' +
        '<p style="margin:0 0 5px"><strong>' + escapeHTML(this.weapon.name) + '</strong></p>' +
        '<details class="olegurps-suppression-breakdown"><summary style="cursor:pointer">Zone details</summary>' +
        '<div>mounted/stabilized: <strong>' + mountedText + '</strong></div>' +
        '<ol style="margin:0;padding-left:22px">' + rows + '</ol></details></div>'
    });
  }

  _validate() {
    const capacity = this._capacity();
    const allocation = validateSuppressionFireAllocation(
      this._state.zoneShots.slice(0, this._state.zoneCount), capacity.availableShots
    );
    const errors = [...allocation.errors];
    if (!capacity.eligible) errors.push("\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0442\u0440\u0435\u0431\u0443\u0435\u0442 RoF 5+ \u0438 \u043c\u0438\u043d\u0438\u043c\u0443\u043c 5 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432");
    return { valid: errors.length === 0, errors, allocation, capacity };
  }
  async _selectZone(button, zoneIndex) {
    this._captureFields();
    if (this._submitting || this._isStarted()) return;
    this._submitting = true;
    this._updatePreview();
    try {
      await this._persistDraft();
      const index = integer(zoneIndex);
      const result = await this._withPlacementWindowsMinimized(
        () => this.regionService.placeZone(index, this._state.zoneCount)
      );
      if (!result.ok) {
        const notify = result.cancelled ? globalThis.ui?.notifications?.warn : globalThis.ui?.notifications?.error;
        notify?.call(globalThis.ui?.notifications, result.error);
        return;
      }
      await this.sessionService.setZonePlacement(index, result.ref);
      globalThis.ui?.notifications?.info?.("Зона " + (index + 1) + " размещена.");
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire Region:", error);
      globalThis.ui?.notifications?.error?.(error?.message ?? String(error));
    } finally {
      this.regionService.clearPlacementHighlights({ cancel: true });
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }
  async _editCorridor(button, zoneIndex) {
    if (this._submitting || this._isStarted()) return;
    const index = integer(zoneIndex);
    const pair = this.regionService.getZonePairs(this._state.zoneCount).get(index);
    if (!pair?.target || !pair?.corridor) {
      ui.notifications.warn("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0434\u0435\u043b\u0438\u0442\u0435 target zone \u0438 corridor \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u0437\u043e\u043d\u044b.");
      return;
    }
    this._submitting = true;
    this._updatePreview();
    try {
      const result = await this._withPlacementWindowsMinimized(() =>
        this.regionService.editCorridor(index, {
          onCellsChange: cells => this.sessionService.setManualCorridor(index, cells)
        })
      );
      if (!result?.ok && !result?.cancelled) {
        ui.notifications.error(result?.error ?? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c corridor.");
      }
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire corridor editor:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this.regionService.clearPlacementHighlights({ cancel: true });
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _deleteZone(button, zoneIndex) {
    if (this._submitting || this._isStarted()) return;
    this._submitting = true;
    try {
      const index = integer(zoneIndex);
      await this.regionService.deleteZone(index);
      await this.sessionService.clearZone(index);
      if (this._targetsInitialized && this._state.activeZoneIndex === index) {
        this._switchingTargets = true;
        try { await setSuppressionTargets([]); }
        finally { this._switchingTargets = false; }
      }
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire delete Zone:", error);
      globalThis.ui?.notifications?.error?.(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }
  async _clearZones(button) {
    if (this._submitting) return;
    this.regionService.clearPlacementHighlights({ cancel: true });
    this._submitting = true;
    this._updatePreview();
    try {
      const result = await this.sessionService.finish({ deleteRegions: true });
      ui.notifications.info(result.removedRegions
        ? `\u0423\u0434\u0430\u043b\u0435\u043d\u043e \u043e\u0431\u043b\u0430\u0441\u0442\u0435\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f: ${result.removedRegions}.`
        : "\u041e\u0431\u043b\u0430\u0441\u0442\u0438 \u044d\u0442\u043e\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.");
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

  async _prepareActivation() {
    this._captureFields();
    if (this._isStarted()) {
      globalThis.ui?.notifications?.info?.("\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u0443\u0436\u0435 \u0430\u043a\u0442\u0438\u0432\u0435\u043d.");
      return null;
    }
    if (!this.token || !this.actor) {
      globalThis.ui?.notifications?.error?.("\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 Token/Actor \u0434\u043b\u044f Suppression Fire \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.");
      return null;
    }
    await this._persistDraft();
    const validation = this._validate();
    if (!validation.valid) {
      globalThis.ui?.notifications?.error?.(
        "\u041e\u0448\u0438\u0431\u043a\u0430 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f: " + validation.errors.join("; ")
      );
      return null;
    }
    const refreshed = await this.regionService.refreshCorridors(this._state.zoneCount);
    if (!refreshed.valid) {
      globalThis.ui?.notifications?.error?.(refreshed.errors.join(" "));
      return null;
    }
    await this.sessionService.reconcileRegions();
    const regionValidation = this.regionService.validate(this._state.zoneCount);
    if (!regionValidation.valid) {
      globalThis.ui?.notifications?.error?.(regionValidation.errors.join(" "));
      return null;
    }
    return validation;
  }

  async _startSuppressionMode(mode, button) {
    if (this._submitting || this._isStarted()) return;
    const validation = await this._prepareActivation();
    if (!validation) return;
    this._submitting = true;
    if (button?.isConnected) button.disabled = true;
    let activated = false;
    let ammoConsumed = false;
    try {
      const activation = mode === "manual"
        ? await this.sessionService.activateManual({
            zoneShots: validation.allocation.shots,
            controls: this._controlsSnapshot()
          })
        : await this.sessionService.activateAutomatic({
            zoneShots: validation.allocation.shots,
            controls: this._controlsSnapshot()
          });
      if (activation.alreadyActive) return;
      activated = true;
      const consumed = await this.consumeAmmo(validation.allocation.totalShots);
      if (!consumed) {
        throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043f\u0438\u0441\u0430\u0442\u044c \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0435 \u043f\u0430\u0442\u0440\u043e\u043d\u044b.");
      }
      ammoConsumed = true;
      await this.sessionService.markAmmoConsumed();
      await this._createSummary(validation.allocation.shots.map((shots, index) => ({
        index,
        shots,
        preview: this._zonePreview(shots, index),
        targets: []
      })));
      if (mode === "automatic") {
        this._registerRuntime();
        await activateSuppressionFireRuntime(this.sessionService.session.sessionId);
      }
      await this.completeCallback?.(mode);
      await this.render({ force: true });
    } catch (error) {
      if (activated && !ammoConsumed && !this.sessionService.session?.ammoSpent) {
        await this.sessionService.revertActivation();
      }
      console.error("Suppression Fire:", error);
      globalThis.ui?.notifications?.error?.(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button?.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _toggleManual(button) {
    if (this._submitting || this._isAutomaticActive()) return;
    if (!this._isManualActive()) return this._startSuppressionMode("manual", button);
    this._submitting = true;
    if (button?.isConnected) button.disabled = true;
    try {
      await this.sessionService.finishManual();
      await this.render({ force: true });
    } catch (error) {
      console.error("Suppression Fire manual finish:", error);
      globalThis.ui?.notifications?.error?.(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button?.isConnected) button.disabled = false;
      this._updatePreview();
    }
  }

  async _cancelUnfired(button) {
    if (this._submitting || !this.sessionService.canCancelUnfired) return;
    this._submitting = true;
    this._skipCloseTargetSave = true;
    this._switchingTargets = true;
    this._updatePreview();
    this.regionService.clearPlacementHighlights({ cancel: true });
    try {
      const cancelled = await this.sessionService.cancelUnfired();
      if (!cancelled) {
        this._skipCloseTargetSave = false;
        this._switchingTargets = false;
        ui.notifications.warn("\u041e\u0442\u043c\u0435\u043d\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430: \u0440\u0435\u0436\u0438\u043c \u0443\u0436\u0435 \u043d\u0430\u0447\u0430\u0442 \u0438\u043b\u0438 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c.");
        await this.render({ force: true });
        return;
      }
      try { await setSuppressionTargets([]); }
      finally {
        this._targetsInitialized = false;
        await this.close();
      }
    } catch (error) {
      if (this.sessionService.session) {
        this._skipCloseTargetSave = false;
        this._switchingTargets = false;
      }
      console.error("Suppression Fire cancel:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button?.isConnected) button.disabled = false;
      if (this.rendered) this._updatePreview();
    }
  }
  async _perform(button) {
    return this._startSuppressionMode("automatic", button);
  }
  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-suppression-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.suppressionAction;
    const zoneIndex = integer(button.dataset.zoneIndex);
    if (action === "fire-zone" && !this._submitting) return this._fireZone(zoneIndex);
    if (action === "targets-zone" && !this._submitting) return this._selectTargetsForZone(zoneIndex);
    if (action === "select-zone" && !this._submitting) return this._selectZone(button, zoneIndex);
    if (action === "edit-corridor" && !this._submitting) return this._editCorridor(button, zoneIndex);
    if (action === "delete-zone" && !this._submitting) return this._deleteZone(button, zoneIndex);
    if (action === "toggle-manual" && !this._submitting) return this._toggleManual(button);
    if (action === "execute" && !this._submitting) return this._perform(button);
    if (action === "cancel" && !this._submitting) return this._cancelUnfired(button);
  }
}
