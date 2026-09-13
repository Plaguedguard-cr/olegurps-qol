import { createStandaloneAttack } from "./fire-control-context.js";
import { resolveElevationRange } from "./fire-range-service.js";
import { TargetingService } from "./targeting-service.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

const FIRE_PREPARATION_CSS = `
  .gam-fire-rof-container { display: contents; }
  .gam-fire-manual-stats { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px; }
  .gam-fire-manual-stats label { display: inline-flex; align-items: center; gap: 5px; }
  .gam-fire-manual-stats input { width: 68px; margin: 0; }
  .gam-fire-shotgun { display: inline-flex; align-items: center; gap: 5px; }
  .gam-fire-shotgun input[type="checkbox"] { width: auto; margin: 0; }
  .gam-fire-shotgun input[name="projectileMultiplier"] { width: 56px; margin: 0; }
  .gam-fire-shotgun input[name="projectileMultiplier"]:disabled { opacity: 0.45; }
  .gam-fire-source-skill input { width: 68px; margin: 0; }
  .gam-fire-missing-stats { display: block; color: #e5bd73; min-height: 1em; }

  .gam-fire-preparation {
    display: grid;
    gap: 12px;
    width: 100%;
    max-height: 82vh;
    overflow-y: auto;
    padding: 2px 8px 2px 2px;
    box-sizing: border-box;
    font-size: 0.92em;
  }

  .gam-fire-preparation,
  .gam-fire-preparation * { box-sizing: border-box; }

  .gam-fire-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 9px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.32);
  }

  .gam-fire-summary-main { min-width: 0; }
  .gam-fire-governing-skill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    margin-top: 5px;
    font-size: 0.86em;
    color: rgba(230, 224, 216, 0.82);
  }
  .gam-fire-governing-skill select {
    width: auto;
    min-width: 120px;
    max-width: 220px;
    height: 26px;
    margin: 0;
  }
  .gam-fire-summary h3 { margin: 0 0 4px; }
  .gam-fire-summary p { margin: 0; opacity: 0.82; }
  .gam-fire-attack-stats {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gam-fire-skill {
    display: grid;
    flex: 0 0 auto;
    justify-items: end;
    gap: 2px;
    text-align: right;
    white-space: nowrap;
  }

  .gam-fire-skill-label,
  .gam-fire-source-skill { font-size: 0.82em; opacity: 0.72; }
  .gam-fire-skill-value { font-size: 1.22em; }

  .gam-fire-layout {
    display: grid;
    grid-template-columns: minmax(400px, 1fr) minmax(430px, 1fr);
    align-items: start;
    gap: 16px;
  }

  .gam-fire-left,
  .gam-fire-targeting { display: grid; gap: 11px; min-width: 0; }

  .gam-fire-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }

  .gam-fire-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(90px, 130px);
    align-items: center;
    gap: 8px;
  }

  .gam-fire-field input { width: 100%; margin: 0; }
  .gam-fire-field input::placeholder,
  .gam-fire-aim input::placeholder { color: currentColor; opacity: 0.45; }
  .gam-fire-field-checkbox {
    align-self: start;
    min-height: 34px;
  }
  .gam-fire-field-checkbox input { width: auto; justify-self: start; }

  .gam-fire-toggle-group {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .gam-fire-aim-group {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .gam-fire-aim,
  .gam-fire-braced {
    display: grid;
    grid-template-columns: 46px 60px auto auto auto;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .gam-fire-aim { min-height: 34px; }

  .gam-fire-aim input {
    width: 60px;
    margin: 0;
  }

  .gam-fire-aim-effective,
  .gam-fire-aim-bonus { white-space: nowrap; }

  .gam-fire-braced input {
    grid-column: 2;
    justify-self: start;
    width: auto;
    margin: 0;
  }


  .gam-fire-rof {
    padding: 8px 10px;
    border: 1px solid rgba(128, 128, 128, 0.32);
    border-radius: 5px;
    text-align: center;
  }
  .gam-fire-rof-full-auto {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    text-align: left;
  }

  .gam-fire-rof-mode {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .gam-fire-rof-mode select {
    width: auto;
    min-width: 82px;
    margin: 0;
  }

  .gam-fire-rof-multiple {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
    gap: 6px 14px;
    text-align: left;
  }

  .gam-fire-rof-multiple span {
    min-width: 0;
    white-space: normal;
  }

  .gam-fire-range-heading,
  .gam-hit-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 5px;
  }

  .gam-fire-range-heading h4,
  .gam-fire-range-heading p,
  .gam-hit-heading h4,
  .gam-hit-heading p { margin: 0; }
  .gam-fire-range-heading p,
  .gam-hit-heading p { opacity: 0.72; font-size: 0.82em; }

  .gam-hit-heading-controls {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    min-width: 0;
  }

  .gam-hit-heading-controls select {
    width: auto;
    min-width: 118px;
    height: 28px;
    margin: 0;
    padding-block: 1px;
  }

  .gam-fire-elevation-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin-left: auto;
  }

  .gam-fire-height-field,
  .gam-fire-high-ground {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .gam-fire-height-field input {
    width: 72px;
    height: 26px;
    margin: 0;
  }

  .gam-fire-height-unit { opacity: 0.72; font-size: 0.82em; }
  .gam-fire-elevation-separator { opacity: 0.5; }
  .gam-fire-high-ground input { margin: 0; }

  .gam-fire-effective-distance {
    margin: 0 0 6px;
    padding: 5px 8px;
    border-left: 3px solid #b84646;
    border-radius: 3px;
    background: rgba(155, 38, 38, 0.12);
    color: inherit;
  }

  .gam-fire-effective-distance[hidden] { display: none; }

  .gam-fire-range-list {
    display: grid;
    gap: 3px;
    max-height: 440px;
    overflow-y: auto;
    padding: 2px;
  }

  .gam-fire-range-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(128px, auto);
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 29px;
    margin: 0;
    padding: 4px 8px;
    border: 1px solid rgba(128, 128, 128, 0.34);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.025);
    color: inherit;
    text-align: left;
  }

  .gam-fire-range-row.recommended {
    outline: 1px dashed #5aa6d8;
    outline-offset: -3px;
    background: rgba(40, 110, 160, 0.16);
  }

  .gam-fire-range-row.selected {
    border-color: #e79027;
    box-shadow: inset 4px 0 0 #e79027;
    background: rgba(190, 105, 25, 0.18);
  }

  .gam-fire-range-row.selected.recommended {
    background: linear-gradient(90deg, rgba(190, 105, 25, 0.2), rgba(40, 110, 160, 0.18));
  }

  .gam-fire-range-row.elevation-recommended {
    border-color: #b84646;
    box-shadow: inset -4px 0 0 #b84646;
    background: rgba(155, 38, 38, 0.14);
  }

  .gam-fire-range-row.selected.elevation-recommended {
    border-color: #e79027;
    box-shadow: inset 4px 0 0 #e79027, inset -4px 0 0 #b84646;
    background: linear-gradient(90deg, rgba(190, 105, 25, 0.2), rgba(155, 38, 38, 0.17));
  }

  .gam-fire-range-row.recommended.elevation-recommended {
    background: linear-gradient(90deg, rgba(40, 110, 160, 0.18), rgba(155, 38, 38, 0.17));
  }

  .gam-fire-range-row.selected.recommended.elevation-recommended {
    box-shadow: inset 4px 0 0 #e79027, inset -4px 0 0 #b84646;
    background: linear-gradient(
      90deg,
      rgba(190, 105, 25, 0.2) 0%,
      rgba(40, 110, 160, 0.18) 50%,
      rgba(155, 38, 38, 0.17) 100%
    );
  }

  .gam-fire-range-penalty { min-width: 34px; text-align: right; }

  .gam-fire-range-markers {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    font-size: 0.78em;
  }

  .gam-fire-range-marker {
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
  }

  .gam-fire-range-marker-selected { background: rgba(210, 120, 30, 0.28); }
  .gam-fire-range-marker-recommended { background: rgba(55, 135, 190, 0.28); }
  .gam-fire-range-marker-elevation { background: rgba(175, 48, 48, 0.3); }

  .gam-hit-panel {
    display: grid;
    grid-template-columns: minmax(220px, 1.08fr) minmax(185px, 0.92fr);
    align-items: start;
    gap: 10px;
  }

  .gam-hit-map {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 941 / 1672;
    overflow: hidden;
    border: 1px solid rgba(128, 128, 128, 0.38);
    border-radius: 7px;
    background: #000;
  }

  .gam-hit-stage {
    position: relative;
    width: 100%;
    aspect-ratio: var(--gam-hit-aspect, 941 / 1672);
    max-height: 100%;
  }

  .gam-hit-stage img,
  .gam-hit-overlay {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .gam-hit-stage img { object-fit: fill; pointer-events: none; }
  .gam-hit-overlay { overflow: hidden; pointer-events: none; }
  .gam-hit-region { pointer-events: all; cursor: pointer; outline: none; }
  .gam-hit-region[aria-disabled="true"] { pointer-events: none; cursor: not-allowed; }

  .gam-hit-region-shape {
    fill: var(--zone-color);
    fill-opacity: 0;
    stroke: transparent;
    stroke-width: 2px;
    vector-effect: non-scaling-stroke;
    transition: fill-opacity 100ms ease, stroke 100ms ease, filter 100ms ease;
  }

  .gam-hit-region.has-base-fill .gam-hit-region-shape {
    fill-opacity: 0.82;
    stroke: #fff;
    stroke-width: 1.25px;
  }

  .gam-hit-region-shape.has-base-fill {
    fill-opacity: 0.82;
  }

  .gam-hit-region.is-hovered .gam-hit-region-shape {
    fill-opacity: 0.35;
    stroke: var(--zone-color);
    filter: drop-shadow(0 0 4px var(--zone-color));
  }

  .gam-hit-region.is-selected .gam-hit-region-shape {
    fill-opacity: 0.5;
    stroke: #fff;
    filter: drop-shadow(0 0 5px var(--zone-color));
  }

  .gam-hit-region.has-base-fill.is-hovered .gam-hit-region-shape,
  .gam-hit-region.has-base-fill.is-selected .gam-hit-region-shape,
  .gam-hit-region.is-hovered .gam-hit-region-shape.has-base-fill,
  .gam-hit-region.is-selected .gam-hit-region-shape.has-base-fill {
    fill-opacity: 0.82;
  }

  .gam-hit-region.has-base-outline .gam-hit-region-shape {
    stroke: #fff;
    stroke-width: 1.25px;
  }

  .gam-hit-region.has-base-outline.is-selected .gam-hit-region-shape { stroke-width: 2px; }
  .gam-hit-region.has-base-outline.is-hovered:not(.is-selected) .gam-hit-region-shape {
    stroke: var(--zone-color);
    stroke-width: 2px;
  }

  .gam-hit-list {
    display: grid;
    min-width: 0;
    gap: 3px;
    max-height: none;
    overflow: visible;
    padding: 1px;
  }

  .gam-hit-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: auto;
    min-height: 34px;
    overflow: hidden;
    margin: 0;
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--zone-color) 48%, transparent);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.025);
    color: inherit;
    text-align: left;
    white-space: normal;
  }

  .gam-hit-row-color {
    width: 8px;
    height: 19px;
    border-radius: 3px;
    background: var(--zone-color);
  }

  .gam-hit-row-label {
    display: block;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.08;
    white-space: normal;
  }

  .gam-hit-row-penalty {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    min-width: 26px;
    text-align: right;
    white-space: nowrap;
  }
  .gam-hit-row-penalty-base.has-ta { color: #e45b64; }
  .gam-hit-row-penalty-arrow { opacity: 0.72; }
  .gam-hit-row-penalty-effective { color: #67c985; }
  .gam-hit-row-ta { font-size: 0.72em; color: #67c985; }

  .gam-hit-row.is-hovered {
    background: color-mix(in srgb, var(--zone-color) 28%, transparent);
    box-shadow: inset 3px 0 0 var(--zone-color);
  }

  .gam-hit-row.is-selected {
    border-color: var(--zone-color);
    background: color-mix(in srgb, var(--zone-color) 42%, transparent);
    box-shadow: inset 4px 0 0 var(--zone-color), 0 0 5px color-mix(in srgb, var(--zone-color) 55%, transparent);
  }

  .gam-hit-row:disabled { opacity: 0.38; cursor: not-allowed; }

  .gam-fire-actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid rgba(128, 128, 128, 0.32);
    background: rgba(12, 12, 20, 0.96);
    box-shadow: 0 -6px 12px rgba(0, 0, 0, 0.28);
  }

  .gam-fire-actions button { width: 100%; min-height: 36px; margin: 0; }

  @media (max-width: 900px) {
    .gam-fire-layout { grid-template-columns: 1fr; }
    .gam-hit-panel { grid-template-columns: minmax(220px, 0.8fr) minmax(200px, 1.2fr); }
  }

  @media (max-width: 560px) {
    .gam-fire-summary { align-items: flex-start; }
    .gam-fire-fields,
    .gam-fire-actions,
    .gam-hit-panel { grid-template-columns: 1fr; }
    .gam-fire-range-row { grid-template-columns: minmax(0, 1fr) auto; }
    .gam-fire-range-markers { grid-column: 1 / -1; justify-content: flex-start; }
    .gam-hit-map { max-width: 270px; justify-self: center; }
  }
`;

const escapeHTML = value => {
  const text = String(value ?? "");
  if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const svgCoordinate = value => (Number(value) * 1000).toFixed(1);
const formatDistance = value => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3
}).format(Number(value));

const formatAttackStat = value => String(value ?? "").trim() || "—";

const skillProbabilityColor = probability => {
  if (!Number.isFinite(probability)) return "inherit";
  const ratio = Math.min(1, Math.max(0, probability / 100));
  const start = [224, 74, 74];
  const end = [74, 190, 105];
  const channel = index => Math.round(start[index] + ((end[index] - start[index]) * ratio));
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

export class FirePreparationApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-fire-preparation",
    classes: ["olegurps-qol", "fire-preparation"],
    tag: "section",
    window: { title: "Подготовка выстрела", resizable: true },
    position: { width: 1120, height: "auto" }
  };

  constructor({ mode = "weapon", parseRateOfFire, token, weapon, attack, rangeBands, recommendation, beamWeapon = false, targetingService, targetedAttackContext = null, initialGoverningSpecialty = "", initialStandaloneValues = null, maximumShots, rateOfFireProfile, calculateShotLimits, calculateRapidFireBonus, calculateAimBonus, calculateBracingBonus, calculateLaserBonus, calculateFireMode, calculateEffectiveSkill, onTargetingServiceChange, onGoverningSpecialtyChange, onStandaloneValuesChange, onConfirm, onClose }, options = {}) {
    super({
      ...options,
      id: options.id ?? (mode === "standalone" ? "olegurps-fire-control-standalone" : `olegurps-fire-preparation-${token.id}-${weapon.id}`),
      window: { title: mode === "standalone" ? "Огонь — Fire Control" : `Огонь — ${weapon.name}`, resizable: true, ...(options.window ?? {}) }
    });
    this.mode = mode;
    this.parseRateOfFire = parseRateOfFire;
    this.token = token;
    this.weapon = weapon;
    this.attack = attack;
    this.rangeBands = rangeBands;
    this.recommendation = recommendation;
    this.beamWeapon = beamWeapon;
    this.targetingService = targetingService;
    this._targetingServices = new Map([[targetingService.bodyplan, targetingService]]);
    this._bodyplanRequestId = 0;
    this.targetedAttackContext = targetedAttackContext;
    this.maximumShots = maximumShots;
    this.rateOfFireProfile = rateOfFireProfile;
    this.calculateShotLimits = calculateShotLimits;
    this.calculateRapidFireBonus = calculateRapidFireBonus;
    this.calculateAimBonus = calculateAimBonus;
    this.calculateBracingBonus = calculateBracingBonus;
    this.calculateLaserBonus = calculateLaserBonus;
    this.calculateFireMode = calculateFireMode;
    this.calculateEffectiveSkill = calculateEffectiveSkill;
    this.targetingServiceChangeCallback = onTargetingServiceChange;
    this.governingSpecialtyChangeCallback = onGoverningSpecialtyChange;
    this.standaloneValuesChangeCallback = onStandaloneValuesChange;
    this.confirmCallback = onConfirm;
    this.closeCallback = onClose;
    const defaultHitLocation = targetingService.getDefaultSelection();
    const recommendedRangeIndex = Number.isInteger(recommendation?.rangeIndex) ? recommendation.rangeIndex : null;
    const initialRofMode = rateOfFireProfile?.type === "full-auto" ? "0" : null;
    const savedGoverningSpecialty = String(initialGoverningSpecialty ?? "").trim();
    const governingSpecialty = targetedAttackContext?.automaticSpecialty ??
      (targetedAttackContext?.specialtyOptions.some(option => option.value === savedGoverningSpecialty)
        ? savedGoverningSpecialty
        : "");
    this.fireState = {
      skillLevel: "", acc: "", bulk: "", rcl: "", halfd: "",
      shotgun: false,
      projectileMultiplier: "",
      shots: "",
      governingSpecialty,
      rofMode: initialRofMode,
      manualModifier: "",
      aimSeconds: "",
      braced: false,
      laserSight: false,
      moveAndAttack: false,
      height: "",
      highGround: false,
      selectedRangeIndex: recommendedRangeIndex,
      manualRangeSelected: false,
      elevationSourceRangeIndex: recommendedRangeIndex,
      bodyplanId: targetingService.bodyplan,
      hitLocation: { ...defaultHitLocation }
    };
    if (this.mode === "standalone" && initialStandaloneValues && typeof initialStandaloneValues === "object") {
      for (const name of ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier"]) {
        this.fireState[name] = String(initialStandaloneValues[name] ?? "");
      }
      this.fireState.shotgun = initialStandaloneValues.shotgun === true;
    }
    if (this.mode === "standalone") this._refreshStandaloneAttack();
    this._submitting = false;
    this._closeNotified = false;
    this._skillPreviewTimer = null;
    this._rangeLayoutObserver = null;
    this._boundClick = this._onClick.bind(this);
    this._boundInput = this._onInput.bind(this);
    this._boundPointerOver = this._onPointerOver.bind(this);
    this._boundPointerOut = this._onPointerOut.bind(this);
    this._boundKeydown = this._onKeydown.bind(this);
  }

  async _prepareContext(_options) {
    return { fireState: this.fireState };
  }

  async _renderHTML(context, _options) {
    return this._buildContent(context.fireState);
  }

  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (!this._skillPreviewTimer) {
      this._skillPreviewTimer = globalThis.setInterval(() => {
        this._updateRapidFirePreview();
        this._updateSkillPreview();
      }, 300);
    }
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    if (!this._rangeLayoutObserver && globalThis.ResizeObserver) {
      this._rangeLayoutObserver = new globalThis.ResizeObserver(() => this._syncRangeListHeight());
      this._rangeLayoutObserver.observe(root);
    }
    if (root.dataset.gamFireListeners === "true") {
      globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
      return;
    }
    if (!root.querySelector("style[data-gam-fire-style]")) {
      const style = document.createElement("style");
      style.dataset.gamFireStyle = "true";
      style.textContent = FIRE_PREPARATION_CSS;
      root.prepend(style);
    }
    root.addEventListener("click", this._boundClick);
    root.addEventListener("input", this._boundInput);
    root.addEventListener("change", this._boundInput);
    root.addEventListener("pointerover", this._boundPointerOver);
    root.addEventListener("pointerout", this._boundPointerOut);
    root.addEventListener("keydown", this._boundKeydown);
    root.dataset.gamFireListeners = "true";
    globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
  }

  async close(options = {}) {
    if (this._skillPreviewTimer) {
      globalThis.clearInterval(this._skillPreviewTimer);
      this._skillPreviewTimer = null;
    }
    this._rangeLayoutObserver?.disconnect();
    this._rangeLayoutObserver = null;
    const result = await super.close(options);
    if (!this._closeNotified) {
      this._closeNotified = true;
      this.closeCallback?.(this);
    }
    return result;
  }

  getStandaloneValues() {
    if (this.mode !== "standalone") return null;
    return {
      skillLevel: String(this.fireState.skillLevel ?? ""),
      acc: String(this.fireState.acc ?? ""),
      bulk: String(this.fireState.bulk ?? ""),
      rcl: String(this.fireState.rcl ?? ""),
      halfd: String(this.fireState.halfd ?? ""),
      shotgun: this.fireState.shotgun === true,
      projectileMultiplier: String(this.fireState.projectileMultiplier ?? "")
    };
  }

  _notifyStandaloneValuesChange() {
    const values = this.getStandaloneValues();
    if (!values || !this.standaloneValuesChangeCallback) return;
    try {
      const pending = this.standaloneValuesChangeCallback(values);
      pending?.catch?.(error => console.error("Не удалось сохранить параметры standalone Fire Control:", error));
    } catch (error) {
      console.error("Не удалось сохранить параметры standalone Fire Control:", error);
    }
  }

  _captureFields() {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    this.fireState.shots = root.querySelector('[name="shots"]')?.value ?? "";
    this.fireState.rofMode = root.querySelector('[name="rofMode"]')?.value ?? this.fireState.rofMode;
    this.fireState.governingSpecialty = root.querySelector('[name="governingSpecialty"]')?.value ??
      this.fireState.governingSpecialty;
    this.fireState.manualModifier = root.querySelector('[name="manualModifier"]')?.value ?? "";
    this.fireState.aimSeconds = root.querySelector('[name="aimSeconds"]')?.value ?? "";
    this.fireState.braced = !!root.querySelector('[name="braced"]')?.checked;
    this.fireState.laserSight = !!root.querySelector('[name="laserSight"]')?.checked;
    this.fireState.moveAndAttack = !!root.querySelector('[name="moveAndAttack"]')?.checked;
    this.fireState.height = root.querySelector('[name="height"]')?.value ?? "";
    this.fireState.highGround = !!root.querySelector('[name="highGround"]')?.checked;
    if (this.mode === "standalone") {
      for (const name of ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier"]) {
        this.fireState[name] = root.querySelector(`[name="${name}"]`)?.value ?? this.fireState[name];
      }
      this.fireState.shotgun = !!root.querySelector('[name="shotgun"]')?.checked;
      this._refreshStandaloneAttack();
      this._notifyStandaloneValuesChange();
    }
  }

  _refreshStandaloneAttack() {
    if (this.mode !== "standalone") return;
    this.attack = createStandaloneAttack(this.fireState);
    this.rateOfFireProfile = this.parseRateOfFire?.(this.attack.rof) ?? this.rateOfFireProfile;
    this.fireState.rofMode = null;
  }

  _getShotsValue(fireState = this.fireState) {
    if (String(fireState.shots ?? "").trim() !== "") return fireState.shots;
    if (this.mode === "standalone" || this.rateOfFireProfile?.type === "full-auto") {
      return String(this._getShotLimits(fireState).minShots);
    }
    return fireState.shots;
  }

  getShotOptions() {
    return {
      shots: this._getShotsValue(),
      rofMode: this.fireState.rofMode,
      governingSpecialty: this.fireState.governingSpecialty,
      shotgun: this.fireState.shotgun,
      projectileMultiplier: this.fireState.projectileMultiplier,
      manualModifier: this.fireState.manualModifier,
      aimSeconds: this.fireState.aimSeconds,
      braced: this.fireState.braced,
      laserSight: this.fireState.laserSight,
      moveAndAttack: this.fireState.moveAndAttack,
      height: this.fireState.height,
      highGround: this.fireState.highGround,
      rangeIndex: this.fireState.selectedRangeIndex,
      manualRangeSelected: this.fireState.manualRangeSelected,
      bodyplanId: this.fireState.bodyplanId,
      hitLocationId: this.fireState.hitLocation.zoneId,
      hitRegionId: this.fireState.hitLocation.regionId
    };
  }

  _getShotLimits(fireState = this.fireState) {
    const calculated = this.calculateShotLimits?.(fireState.rofMode);
    const fallbackMax = Math.max(1, Math.trunc(Number(this.maximumShots) || 1));
    const minShots = Math.max(1, Math.trunc(Number(calculated?.minShots) || 1));
    const unlimited = this.mode === "standalone" && calculated?.maxShots == null;
    const maxShots = unlimited
      ? null
      : Math.max(minShots, Math.trunc(Number(calculated?.maxShots) || fallbackMax));
    return { ...calculated, minShots, maxShots };
  }

  _syncShotLimits({ clamp = false } = {}) {
    const limits = this._getShotLimits();
    const input = this.element?.querySelector('[name="shots"]');
    const label = this.element?.querySelector('[data-shots-label]');
    if (input) {
      input.min = String(limits.minShots);
      if (Number.isFinite(limits.maxShots)) input.max = String(limits.maxShots);
      else input.removeAttribute("max");
      input.placeholder = String(limits.minShots);
    }
    if (label) {
      if (this.mode === "standalone") label.textContent = "Выстрелы";
      else {
        const range = limits.minShots === limits.maxShots
          ? String(limits.maxShots)
          : `${limits.minShots}-${limits.maxShots}`;
        label.textContent = `Выстрелы (${range})`;
      }
    }
    if (!clamp || (this.mode !== "standalone" && this.rateOfFireProfile?.type !== "full-auto")) return limits;

    const rawShots = String(this.fireState.shots ?? "").trim();
    if (rawShots === "") {
      if (input) input.value = "";
      return limits;
    }
    const current = Number(rawShots);
    const shots = Number.isInteger(current)
      ? Math.max(limits.minShots, Number.isFinite(limits.maxShots) ? Math.min(limits.maxShots, current) : current)
      : limits.minShots;
    this.fireState.shots = String(shots);
    if (this.mode === "standalone") this._refreshStandaloneAttack();
    if (input) input.value = this.fireState.shots;
    return limits;
  }

  _getSkillPreview() {
    const calculatedValue = this.calculateEffectiveSkill?.(this.getShotOptions(), this.targetingService);
    const calculated = calculatedValue === null || calculatedValue === undefined
      ? Number.NaN
      : Number(calculatedValue);
    if (!Number.isFinite(calculated)) return { level: "—", chance: "—", probability: Number.NaN };
    const level = Math.max(3, Math.trunc(calculated));
    const successTarget = Math.min(16, level);
    let successfulOutcomes = 0;
    for (let first = 1; first <= 6; first += 1) {
      for (let second = 1; second <= 6; second += 1) {
        for (let third = 1; third <= 6; third += 1) {
          if (first + second + third <= successTarget) successfulOutcomes += 1;
        }
      }
    }
    const probability = (successfulOutcomes / 216) * 100;
    const chance = probability.toFixed(1).replace(".", ",");
    return { level: String(level), chance, probability };
  }

  _getAimBonus(fireState = this.fireState) {
    const value = Number(this.calculateAimBonus?.(
      fireState.aimSeconds,
      fireState.moveAndAttack,
      fireState.braced,
      fireState.laserSight
    ));
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }

  _updateAimPreview() {
    const aimPreview = this.element?.querySelector("[data-aim-preview]");
    const laserPreview = this.element?.querySelector("[data-laser-preview]");
    const effectiveModifier = this._getAimBonus() + this._getBracingBonus();
    if (aimPreview) aimPreview.textContent = `+${effectiveModifier}`;
    if (laserPreview) laserPreview.textContent = `+${this.fireState.laserSight ? this._getLaserBonus() : 1}`;
    this._updateAttackStats();
  }

  _getBracingBonus(fireState = this.fireState) {
    const value = Number(this.calculateBracingBonus?.(
      fireState.braced,
      fireState.aimSeconds,
      fireState.moveAndAttack,
      fireState.laserSight
    ));
    return value === 1 ? 1 : 0;
  }

  _getLaserBonus(fireState = this.fireState) {
    const value = Number(this.calculateLaserBonus?.(
      fireState.laserSight,
      fireState.aimSeconds,
      fireState.braced,
      fireState.moveAndAttack
    ));
    return value === 1 ? 1 : 0;
  }


  _getDisplayedRoF(fireMode) {
    if (this.rateOfFireProfile?.type === "multiple-projectile" && fireMode?.extremelyClose) {
      return String(Math.max(1, Math.trunc(Number(this.rateOfFireProfile.baseRoF) || 1)));
    }
    return formatAttackStat(this.rateOfFireProfile?.display || this.attack?.rof);
  }

  _getDisplayedAcc(fireState = this.fireState) {
    if (this.mode === "standalone" && this.attack?.acc === null) return "—";
    const baseAcc = Number(this.attack?.acc);
    if (!Number.isFinite(baseAcc)) return "—";
    return String(Math.trunc(baseAcc) + (fireState.braced && !fireState.moveAndAttack ? 1 : 0));
  }

  _getAttackStatsText(displayedRoF, displayedAcc = this._getDisplayedAcc()) {
    return [
      this.weapon.ammoType,
      `магазин ${this.weapon.magazines[this.weapon.loadedIndex]}/${this.weapon.capacity}`,
      `RoF ${displayedRoF}`,
      `Acc ${displayedAcc}`,
      `Bulk ${formatAttackStat(this.attack?.data?.bulk ?? this.attack?.bulk)}`,
      `Rcl ${formatAttackStat(this.attack?.rcl ?? this.attack?.data?.rcl)}`
    ].join(" · ");
  }

  _getRapidFireState(fireState = this.fireState) {
    const calculated = this.calculateFireMode?.({
      ...this.getShotOptions(),
      shots: this._getShotsValue(fireState),
      rangeIndex: fireState.selectedRangeIndex
    });
    const effectiveRoF = Math.max(1, Math.trunc(Number(calculated?.effectiveRoF) || Number(fireState.shots) || 1));
    return {
      ...calculated,
      effectiveRoF,
      rapidFireBonus: this.calculateRapidFireBonus(effectiveRoF)
    };
  }

  _updateAttackStats(fireMode = this._getRapidFireState()) {
    if (this.mode === "standalone") {
      this._updateStandaloneHints();
      return;
    }
    const attackStats = this.element?.querySelector("[data-attack-stats]");
    if (!attackStats) return;
    const text = this._getAttackStatsText(this._getDisplayedRoF(fireMode));
    attackStats.textContent = text;
    attackStats.title = text;
  }

  _updateRapidFirePreview() {
    const fireMode = this._getRapidFireState();
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const rof = this.element?.querySelector("[data-rof-preview]");
    const effective = this.element?.querySelector("[data-effective-rof]");
    const preview = this.element?.querySelector("[data-rapid-preview]");
    if (rof) rof.textContent = displayedRoF;
    if (effective) effective.textContent = String(fireMode.effectiveRoF);
    if (preview) preview.textContent = `+${fireMode.rapidFireBonus}`;
    this._updateAttackStats(fireMode);
  }

  _updateSkillPreview() {
    if (this._submitting) return;
    const preview = this.element?.querySelector("[data-skill-preview]");
    if (!preview) return;
    const { level, chance, probability } = this._getSkillPreview();
    preview.textContent = `${level} (${chance}%)`;
    preview.style.color = skillProbabilityColor(probability);
  }

  _getElevationCalculation(fireState = this.fireState) {
    return resolveElevationRange({
      rangeBands: this.rangeBands,
      rangeIndex: fireState.selectedRangeIndex ?? fireState.elevationSourceRangeIndex,
      height: fireState.height,
      highGround: fireState.highGround,
      beamWeapon: this.beamWeapon
    });
  }

  _updateElevationPreview() {
    const calculation = this._getElevationCalculation();
    for (const row of this.element?.querySelectorAll("[data-range-index]") ?? []) {
      const elevationRecommended = calculation?.rangeIndex === Number(row.dataset.rangeIndex);
      row.classList.toggle("elevation-recommended", elevationRecommended);
      const marker = row.querySelector("[data-elevation-marker]");
      if (marker) marker.hidden = !elevationRecommended;
    }

    const summary = this.element?.querySelector("[data-effective-distance]");
    if (!summary) return;
    summary.hidden = !calculation;
    const value = summary.querySelector("[data-effective-distance-value]");
    if (value && calculation) value.textContent = formatDistance(calculation.effectiveDistance);
    globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
  }

  _syncRangeListHeight() {
    const rangeList = this.element?.querySelector(".gam-fire-range-list");
    const hitList = this.element?.querySelector(".gam-hit-list");
    if (!rangeList || !hitList) return;

    const rangeRect = rangeList.getBoundingClientRect();
    const hitRect = hitList.getBoundingClientRect();
    const sideBySide = hitRect.left >= rangeRect.right - 4;
    if (!sideBySide) {
      rangeList.style.removeProperty("max-height");
      return;
    }

    const visibleRows = [...rangeList.querySelectorAll(".gam-fire-range-row")].slice(0, 7);
    if (!visibleRows.length) return;

    const styles = globalThis.getComputedStyle?.(rangeList);
    const gap = Number.parseFloat(styles?.rowGap || styles?.gap || "0") || 0;
    const paddingTop = Number.parseFloat(styles?.paddingTop || "0") || 0;
    const paddingBottom = Number.parseFloat(styles?.paddingBottom || "0") || 0;
    const rowsHeight = visibleRows.reduce(
      (total, row) => total + row.getBoundingClientRect().height,
      0
    );
    const height = Math.ceil(rowsHeight + gap * Math.max(0, visibleRows.length - 1) + paddingTop + paddingBottom);
    if (height > 120) rangeList.style.maxHeight = `${height}px`;
  }

  _selectRange(index) {
    const nextIndex = this.fireState.selectedRangeIndex === index ? null : index;
    this.fireState.selectedRangeIndex = nextIndex;
    this.fireState.manualRangeSelected = nextIndex !== null;
    if (nextIndex !== null) this.fireState.elevationSourceRangeIndex = nextIndex;
    for (const row of this.element?.querySelectorAll("[data-range-index]") ?? []) {
      const selected = Number(row.dataset.rangeIndex) === nextIndex;
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-pressed", String(selected));
      const marker = row.querySelector("[data-selected-marker]");
      if (marker) marker.hidden = !selected;
    }
    this._updateElevationPreview();
    this._updateRapidFirePreview();
    this._updateSkillPreview();
  }

  _selectHitLocation(zoneId, regionId = null) {
    const selection = this.targetingService.getSelection(zoneId, regionId);
    if (!selection) return;
    this.fireState.hitLocation = { zoneId: selection.zoneId, regionId: selection.regionId };

    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      const selected = row.dataset.hitZoneId === selection.zoneId;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-pressed", String(selected));
    }
    for (const region of this.element?.querySelectorAll(".gam-hit-region[data-hit-region-id]") ?? []) {
      const selected = region.dataset.hitZoneId === selection.zoneId &&
        (!selection.regionId || region.dataset.hitRegionId === selection.regionId);
      region.classList.toggle("is-selected", selected);
      region.setAttribute("aria-pressed", String(selected));
    }
    this._updateTargetedAttackPreview();
    this._updateSkillPreview();
  }


  async _switchBodyplan(bodyplanId) {
    const requestedId = String(bodyplanId ?? "");
    if (requestedId === this.targetingService.bodyplan) return;

    const requestId = ++this._bodyplanRequestId;
    const selector = this.element?.querySelector('[name="bodyplanId"]');
    if (selector) selector.disabled = true;

    try {
      let service = this._targetingServices.get(requestedId);
      if (!service) {
        service = await TargetingService.create({ attack: this.attack, bodyplan: requestedId });
        this._targetingServices.set(service.bodyplan, service);
      }
      if (requestId !== this._bodyplanRequestId) return;

      this.targetingServiceChangeCallback?.(service);
      this.targetingService = service;
      this.fireState.bodyplanId = service.bodyplan;
      this.fireState.hitLocation = { ...service.getDefaultSelection() };

      const targeting = this.element?.querySelector(".gam-fire-targeting");
      if (targeting) targeting.outerHTML = this._buildHitLocationContent(this.fireState);
      this._updateSkillPreview();
      globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
    } catch (error) {
      console.error("Не удалось переключить bodyplan:", error);
      ui.notifications.error(error?.message ?? "Не удалось переключить bodyplan.");
      const currentSelector = this.element?.querySelector('[name="bodyplanId"]');
      if (currentSelector) currentSelector.value = this.targetingService.bodyplan;
    } finally {
      const currentSelector = this.element?.querySelector('[name="bodyplanId"]');
      if (currentSelector) currentSelector.disabled = false;
    }
  }

  _setHoveredHitLocation(zoneId = null, regionId = null) {
    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      row.classList.toggle("is-hovered", !!zoneId && row.dataset.hitZoneId === zoneId);
    }
    for (const region of this.element?.querySelectorAll(".gam-hit-region[data-hit-region-id]") ?? []) {
      const hovered = !!zoneId && region.dataset.hitZoneId === zoneId &&
        (!regionId || region.dataset.hitRegionId === regionId);
      region.classList.toggle("is-hovered", hovered);
    }
  }

  _getHitControl(target) {
    return target instanceof Element ? target.closest("[data-hit-zone-id]") : null;
  }

  _onPointerOver(event) {
    const control = this._getHitControl(event.target);
    if (!control || control.dataset.hitDisabled === "true") return;
    const previous = this._getHitControl(event.relatedTarget);
    if (previous === control) return;
    this._setHoveredHitLocation(control.dataset.hitZoneId, control.dataset.hitRegionId ?? null);
  }

  _onPointerOut(event) {
    const control = this._getHitControl(event.target);
    if (!control) return;
    const next = this._getHitControl(event.relatedTarget);
    if (next === control) return;
    if (next && next.dataset.hitDisabled !== "true") {
      this._setHoveredHitLocation(next.dataset.hitZoneId, next.dataset.hitRegionId ?? null);
    } else {
      this._setHoveredHitLocation();
    }
  }

  _onKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const control = this._getHitControl(event.target);
    if (!control || control.dataset.hitDisabled === "true") return;
    event.preventDefault();
    this._selectHitLocation(control.dataset.hitZoneId, control.dataset.hitRegionId ?? null);
  }

  _persistGoverningSpecialty(value) {
    try {
      const pending = this.governingSpecialtyChangeCallback?.(value);
      pending?.catch?.(error => {
        console.error("Не удалось сохранить governing Guns specialty:", error);
        ui.notifications.error("Не удалось сохранить выбранный governing Guns specialty.");
      });
    } catch (error) {
      console.error("Не удалось сохранить governing Guns specialty:", error);
      ui.notifications.error("Не удалось сохранить выбранный governing Guns specialty.");
    }
  }

  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!field) return;
    if (field.name === "bodyplanId") {
      await this._switchBodyplan(field.value);
      return;
    }
    if (this.mode === "standalone" &&
      ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier", "shotgun"].includes(field.name)) {
      if (field.name === "shotgun") this.fireState.shotgun = field.checked;
      else this.fireState[field.name] = field.value;
      this._refreshStandaloneAttack();
      this._notifyStandaloneValuesChange();
      if (field.name === "shotgun") {
        const multiplier = this.element?.querySelector('[name="projectileMultiplier"]');
        if (multiplier) multiplier.disabled = !field.checked;
      }
      if (field.name === "shotgun" || field.name === "projectileMultiplier") {
        const rofBlock = this.element?.querySelector("[data-rof-container]");
        if (rofBlock) rofBlock.innerHTML = this._buildRofContent(this.fireState);
      }
      this._updateAimPreview();
      this._updateRapidFirePreview();
      this._updateSkillPreview();
      return;
    }
    if (field.name === "shots") {
      this.fireState.shots = field.value;
      if (this.mode === "standalone") {
        this._refreshStandaloneAttack();
        const rofBlock = this.element?.querySelector("[data-rof-container]");
        if (rofBlock) rofBlock.innerHTML = this._buildRofContent(this.fireState);
      }
    }
    else if (field.name === "rofMode") this.fireState.rofMode = field.value;
    else if (field.name === "governingSpecialty") {
      const changed = this.fireState.governingSpecialty !== field.value;
      this.fireState.governingSpecialty = field.value;
      this._updateTargetedAttackPreview();
      if (changed) this._persistGoverningSpecialty(field.value);
    }
    else if (field.name === "manualModifier") this.fireState.manualModifier = field.value;
    else if (field.name === "aimSeconds") {
      const seconds = Number(String(field.value).replace(",", "."));
      if (field.value !== "" && (!Number.isInteger(seconds) || seconds < 0)) field.value = "0";
      this.fireState.aimSeconds = field.value;
    } else if (field.name === "braced") this.fireState.braced = field.checked;
    else if (field.name === "laserSight") this.fireState.laserSight = field.checked;
    else if (field.name === "moveAndAttack") this.fireState.moveAndAttack = field.checked;
    else if (field.name === "height") {
      const numericHeight = Number(String(field.value).replace(",", "."));
      if (field.value !== "" && Number.isFinite(numericHeight) && numericHeight < 0) field.value = "0";
      this.fireState.height = field.value;
    } else if (field.name === "highGround") {
      this.fireState.highGround = field.checked;
    }
    if (field.name === "shots" || field.name === "rofMode") {
      this._syncShotLimits({ clamp: field.name === "rofMode" || event.type === "change" });
      this._updateRapidFirePreview();
    }
    if (field.name === "aimSeconds" || field.name === "braced" || field.name === "laserSight" || field.name === "moveAndAttack") this._updateAimPreview();
    if (field.name === "height" || field.name === "highGround") this._updateElevationPreview();
    this._updateSkillPreview();
  }

  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const hitControl = this._getHitControl(target);
    if (hitControl) {
      event.preventDefault();
      if (hitControl.dataset.hitDisabled !== "true") {
        this._captureFields();
        this._selectHitLocation(hitControl.dataset.hitZoneId, hitControl.dataset.hitRegionId ?? null);
      }
      return;
    }

    const range = target?.closest("[data-range-index]");
    if (range) {
      event.preventDefault();
      this._captureFields();
      this._selectRange(Number(range.dataset.rangeIndex));
      return;
    }

    const button = target?.closest("button[data-fire-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.fireAction === "cancel") {
      await this.close();
      return;
    }
    if (button.dataset.fireAction !== "confirm" || this._submitting) return;

    this._captureFields();
    this._submitting = true;
    button.disabled = true;
    try {
      const completed = await this.confirmCallback?.(this.getShotOptions(), this.targetingService);
      if (completed) await this.close();
    } catch (error) {
      console.error("GURPS Fire Preparation:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      if (button.isConnected) button.disabled = false;
    }
  }

  _renderSvgGeometry(geometry) {
    const shapeClass = ["gam-hit-region-shape", geometry.baseFill ? "has-base-fill" : ""].filter(Boolean).join(" ");
    if (geometry.type === "ellipse") {
      return `<ellipse class="${shapeClass}" cx="${svgCoordinate(geometry.cx)}" cy="${svgCoordinate(geometry.cy)}" rx="${svgCoordinate(geometry.rx)}" ry="${svgCoordinate(geometry.ry)}"></ellipse>`;
    }
    if (geometry.type === "path") {
      const path = (geometry.rings ?? [])
        .map(points => `M ${points.map(([x, y]) => `${svgCoordinate(x)} ${svgCoordinate(y)}`).join(" L ")} Z`)
        .join(" ");
      return `<path class="${shapeClass}" fill-rule="${geometry.fillRule ?? "nonzero"}" d="${path}"></path>`;
    }
    const points = (geometry.points ?? [])
      .map(([x, y]) => `${svgCoordinate(x)},${svgCoordinate(y)}`)
      .join(" ");
    return `<polygon class="${shapeClass}" points="${points}"></polygon>`;
  }

  _formatModifier(value) {
    const number = Math.trunc(Number(value) || 0);
    return number >= 0 ? `+${number}` : String(number);
  }

  _getTargetedAttack(zone, fireState = this.fireState) {
    return this.targetedAttackContext?.resolve({
      specialty: fireState.governingSpecialty,
      target: [zone?.canonicalKey ?? zone?.id, ...(zone?.taAliases ?? [])],
      basePenalty: zone?.penalty
    }) ?? null;
  }

  _buildHitLocationPenalty(zone, fireState = this.fireState) {
    const base = this._formatModifier(zone?.penalty);
    const targetedAttack = this._getTargetedAttack(zone, fireState);
    if (!targetedAttack) return `<span class="gam-hit-row-penalty-base">${base}</span>`;
    return `
      <span class="gam-hit-row-penalty-base has-ta">${base}</span>
      <span class="gam-hit-row-penalty-arrow" aria-hidden="true">→</span>
      <span class="gam-hit-row-penalty-effective">${this._formatModifier(targetedAttack.effectivePenalty)}</span>
      <span class="gam-hit-row-ta">TA</span>
    `;
  }

  _updateTargetedAttackPreview() {
    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      const zone = this.targetingService.getZone(row.dataset.hitZoneId);
      const penalty = row.querySelector("[data-hit-penalty]");
      if (zone && penalty) penalty.innerHTML = this._buildHitLocationPenalty(zone);
    }
  }

  _buildGoverningSkillSelector(fireState) {
    if (this.mode !== "weapon" || !this.targetedAttackContext?.requiresSelection) return "";
    const options = this.targetedAttackContext.specialtyOptions.map(option =>
      `<option value="${escapeHTML(option.value)}" ${fireState.governingSpecialty === option.value ? "selected" : ""}>Guns (${escapeHTML(option.label)})</option>`
    ).join("");
    return `
      <label class="gam-fire-governing-skill">
        <span>Governing skill:</span>
        <select name="governingSpecialty" required aria-label="Governing Guns specialty">
          <option value="">Выберите Guns specialty</option>
          ${options}
        </select>
      </label>
    `;
  }

  _buildHitLocationContent(fireState) {
    const selection = fireState.hitLocation;
    const bodyplanOptions = TargetingService.getBodyplanOptions().map(option =>
      `<option value="${escapeHTML(option.id)}" ${this.targetingService.bodyplan === option.id ? "selected" : ""}>${escapeHTML(option.label)}</option>`
    ).join("");
    const rows = this.targetingService.zones.map(zone => {
      const selected = selection.zoneId === zone.id;
      const disabled = !zone.available;
      return `
        <button
          type="button"
          class="gam-hit-row ${selected ? "is-selected" : ""}"
          data-hit-zone-id="${zone.id}"
          data-hit-disabled="${disabled}"
          aria-pressed="${selected}"
          style="--zone-color:${zone.color}"
          title="${escapeHTML(zone.unavailableReason)}"
          ${disabled ? "disabled" : ""}
        >
          <span class="gam-hit-row-color" aria-hidden="true"></span>
          <span class="gam-hit-row-label">${escapeHTML(zone.label)}</span>
          <strong class="gam-hit-row-penalty" data-hit-penalty>${this._buildHitLocationPenalty(zone, fireState)}</strong>
        </button>
      `;
    }).join("");

    const regions = this.targetingService.regions.map(region => {
      const zone = this.targetingService.getZone(region.zoneId);
      const selected = selection.zoneId === region.zoneId && (!selection.regionId || selection.regionId === region.id);
      const disabled = !zone?.available;
      const shapes = region.geometry.map(geometry => this._renderSvgGeometry(geometry)).join("");
      return `
        <g
          class="gam-hit-region ${region.baseOutline ? "has-base-outline" : ""} ${region.baseFill ? "has-base-fill" : ""} ${selected ? "is-selected" : ""}"
          data-hit-zone-id="${region.zoneId}"
          data-hit-region-id="${region.id}"
          data-hit-disabled="${disabled}"
          role="button"
          tabindex="${disabled ? -1 : 0}"
          aria-label="${escapeHTML(region.label ?? zone?.label)}"
          aria-pressed="${selected}"
          aria-disabled="${disabled}"
          style="--zone-color:${zone?.color ?? "#888"}"
        >${shapes}</g>
      `;
    }).join("");

    return `
      <aside class="gam-fire-targeting gam-bodyplan-${escapeHTML(this.targetingService.bodyplan)}">
        <section>
          <div class="gam-hit-heading">
            <h4>Hit Location</h4>
            <div class="gam-hit-heading-controls">
              <select name="bodyplanId" aria-label="Bodyplan">${bodyplanOptions}</select>
              <p>${escapeHTML(this.targetingService.label)} · ${this.targetingService.tableSource === "gga" ? "GGA" : "fallback"}</p>
            </div>
          </div>
          <div class="gam-hit-panel">
            <div class="gam-hit-map">
              <div class="gam-hit-stage" style="--gam-hit-aspect:${escapeHTML(this.targetingService.aspectRatio)}">
                <img src="${escapeHTML(this.targetingService.image)}" alt="${escapeHTML(this.targetingService.label)} hit locations">
                <svg class="gam-hit-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Интерактивная схема зон попадания">${regions}</svg>
              </div>
            </div>
            <div class="gam-hit-list" role="listbox" aria-label="Зоны попадания">${rows}</div>
          </div>
        </section>
      </aside>
    `;
  }


  _buildStandaloneStats(fireState) {
    const fields = [["acc", "Acc"], ["bulk", "Bulk"], ["rcl", "Rcl"], ["halfd", "½D, yd"]];
    const stats = fields.map(([name, label]) =>
      `<label>${label} <input type="text" name="${name}" value="${escapeHTML(fireState[name])}" placeholder="—" aria-label="${label}" title="${name === "halfd" ? "Необязательно: ½D для определения Extremely Close" : "Необязательная характеристика"}"></label>`
    ).join("");
    const shotgun = `<div class="gam-fire-shotgun">
      <span>Дробовик</span>
      <input type="checkbox" name="shotgun" aria-label="Дробовик" ${fireState.shotgun ? "checked" : ""}>
      <span aria-hidden="true">×</span>
      <input type="number" name="projectileMultiplier" value="${escapeHTML(fireState.projectileMultiplier)}" placeholder="—" min="2" step="1" inputmode="numeric" aria-label="Число снарядов после ×" ${fireState.shotgun ? "" : "disabled"}>
    </div>`;
    return `<div class="gam-fire-manual-stats">${stats}${shotgun}</div><small class="gam-fire-missing-stats" data-missing-stats></small>`;
  }

  _updateStandaloneHints() {
    const hints = this.element?.querySelector("[data-missing-stats]");
    if (!hints) return;
    const missing = [];
    if (Number(this.fireState.aimSeconds) > 0 && this.attack.acc === null) missing.push("Aim: нужен Acc");
    if (this.fireState.moveAndAttack && this.attack.data.bulk === null) missing.push("Движение и атака: нужен Bulk");
    if (this.fireState.shotgun && !(Number.isInteger(Number(this.fireState.projectileMultiplier)) && Number(this.fireState.projectileMultiplier) > 1)) {
      missing.push("Дробовик: нужен целый множитель после ×");
    }
    if (this.rateOfFireProfile.type === "multiple-projectile" && !this.fireState.halfd) missing.push("Для Extremely Close нужен ½D");
    hints.textContent = missing.join(" · ");
  }

  _buildRofContent(fireState) {
    const fireMode = this._getRapidFireState(fireState);
    const rapidFireBonus = fireMode.rapidFireBonus;
    const multipleProjectile = this.rateOfFireProfile?.type === "multiple-projectile";
    const fullAuto = this.rateOfFireProfile?.type === "full-auto";
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const rofModeOptions = fullAuto
      ? this.rateOfFireProfile.modes.map(mode => `
          <option value="${mode.index}" ${String(fireState.rofMode ?? "0") === String(mode.index) ? "selected" : ""}>${escapeHTML(mode.label)}</option>
        `).join("")
      : "";
    const rofContent = multipleProjectile
      ? `<div class="gam-fire-rof gam-fire-rof-multiple">
          <span>RoF: <strong data-rof-preview>${escapeHTML(displayedRoF)}</strong></span>
          <span>Эффективный RoF: <strong data-effective-rof>${fireMode.effectiveRoF}</strong></span>
          <span>Бонус RoF: <strong data-rapid-preview>+${rapidFireBonus}</strong></span>
        </div>`
      : fullAuto && this.rateOfFireProfile.modes.length > 1
        ? `<div class="gam-fire-rof gam-fire-rof-full-auto">
            <label class="gam-fire-rof-mode">
              <span>Режим RoF:</span>
              <select name="rofMode" aria-label="Режим скорострельности">${rofModeOptions}</select>
            </label>
            <span>Бонус RoF: <strong data-rapid-preview>+${rapidFireBonus}</strong></span>
          </div>`
        : `<div class="gam-fire-rof">Бонус RoF: <strong data-rapid-preview>+${rapidFireBonus}</strong></div>`;
    return rofContent;
  }

  _buildContent(fireState) {
    const fireMode = this._getRapidFireState(fireState);
    const aimBonus = this._getAimBonus(fireState);
    const bracingBonus = this._getBracingBonus(fireState);
    const laserBonus = this._getLaserBonus(fireState);
    const aimedFireModifier = aimBonus + bracingBonus;
    const displayedAcc = this._getDisplayedAcc(fireState);
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const shotLimits = this._getShotLimits(fireState);
    const shotsRange = shotLimits.minShots === shotLimits.maxShots
      ? String(shotLimits.maxShots)
      : `${shotLimits.minShots}-${shotLimits.maxShots}`;
    const shotsLabel = this.mode === "standalone" ? "Выстрелы" : `Выстрелы (${shotsRange})`;
    const shotsMax = Number.isFinite(shotLimits.maxShots) ? ` max="${shotLimits.maxShots}"` : "";
    const rofContent = this._buildRofContent(fireState);
    const skillPreview = this._getSkillPreview();
    const sourceSkill = Number(this.attack?.level);
    const sourceSkillText = Number.isFinite(sourceSkill) && sourceSkill > 0 ? String(Math.trunc(sourceSkill)) : "—";
    const attackStats = this.mode === "standalone" ? "" : this._getAttackStatsText(displayedRoF, displayedAcc);
    const elevation = this._getElevationCalculation(fireState);
    const recommendedPenalty = Number(this.recommendation?.penalty);
    const recommendationText = Number.isFinite(recommendedPenalty)
      ? `GGA target: ${recommendedPenalty >= 0 ? "+" : ""}${recommendedPenalty}`
      : "GGA target: нет рекомендации";
    const rows = this.rangeBands.map(range => {
      const selected = fireState.selectedRangeIndex === range.index;
      const recommended = this.recommendation?.rangeIndex === range.index;
      const elevationRecommended = elevation?.rangeIndex === range.index;
      const penalty = range.penalty >= 0 ? `+${range.penalty}` : String(range.penalty);
      return `
        <button type="button" class="gam-fire-range-row ${selected ? "selected" : ""} ${recommended ? "recommended" : ""} ${elevationRecommended ? "elevation-recommended" : ""}" data-range-index="${range.index}" aria-pressed="${selected}">
          <span>${escapeHTML(range.label)}</span>
          <strong class="gam-fire-range-penalty">${penalty}</strong>
          <span class="gam-fire-range-markers">
            <span class="gam-fire-range-marker gam-fire-range-marker-selected" data-selected-marker ${selected ? "" : "hidden"}>Выбрано</span>
            ${recommended ? '<span class="gam-fire-range-marker gam-fire-range-marker-recommended">GGA target</span>' : ""}
            <span class="gam-fire-range-marker gam-fire-range-marker-elevation" data-elevation-marker ${elevationRecommended ? "" : "hidden"}>Высота</span>
          </span>
        </button>
      `;
    }).join("");

    return `
      <div class="gam-fire-preparation">
        <div class="gam-fire-summary">
          <div class="gam-fire-summary-main">
            <h3>${escapeHTML(this.mode === "standalone" ? "Fire Control" : this.weapon.name)}</h3>
            ${this.mode === "standalone" ? this._buildStandaloneStats(fireState) : `<p class="gam-fire-attack-stats" data-attack-stats title="${escapeHTML(attackStats)}">${escapeHTML(attackStats)}</p>`}
            ${this._buildGoverningSkillSelector(fireState)}
          </div>
          <div class="gam-fire-skill" aria-live="polite">
            <span class="gam-fire-skill-label">Эффективное умение</span>
            <strong class="gam-fire-skill-value" data-skill-preview style="color: ${skillProbabilityColor(skillPreview.probability)}">${skillPreview.level} (${skillPreview.chance}%)</strong>
            ${this.mode === "standalone" ? `<label class="gam-fire-source-skill">Значение умения: <input type="number" name="skillLevel" value="${escapeHTML(fireState.skillLevel)}" placeholder="0" min="1" step="1" required autofocus></label>` : `<span class="gam-fire-source-skill">Значение умения: ${sourceSkillText}</span>`}
          </div>
        </div>
        <div class="gam-fire-layout">
          <div class="gam-fire-left">
            <div class="gam-fire-fields">
              <label class="gam-fire-field">
                <span data-shots-label>${shotsLabel}</span>
                <input type="number" name="shots" value="${escapeHTML(fireState.shots)}" placeholder="${shotLimits.minShots}" min="${shotLimits.minShots}"${shotsMax} step="1" ${this.mode === "weapon" ? "autofocus" : ""}>
              </label>
              <label class="gam-fire-field">
                <span>Бонусы/штрафы</span>
                <input type="number" name="manualModifier" value="${escapeHTML(fireState.manualModifier)}" placeholder="0" step="1">
              </label>
              <div class="gam-fire-toggle-group">
                <div class="gam-fire-field gam-fire-field-checkbox">
                  <span>Лазер <strong data-laser-preview>+${fireState.laserSight ? laserBonus : 1}</strong></span>
                  <input type="checkbox" name="laserSight" aria-label="Лазерный прицел" ${fireState.laserSight ? "checked" : ""}>
                </div>
                <div class="gam-fire-field gam-fire-field-checkbox">
                  <span>Движение и атака</span>
                  <input type="checkbox" name="moveAndAttack" aria-label="Движение и атака" ${fireState.moveAndAttack ? "checked" : ""}>
                </div>
              </div>
              <div class="gam-fire-aim-group">
                <label class="gam-fire-aim">
                  <span>Aim:</span>
                  <input type="number" name="aimSeconds" value="${escapeHTML(fireState.aimSeconds)}" placeholder="0" min="0" step="1" inputmode="numeric" aria-label="Aim в секундах">
                  <span>сек.</span>
                  <span class="gam-fire-aim-effective">Eff. mod:</span>
                  <strong class="gam-fire-aim-bonus" data-aim-preview>+${aimedFireModifier}</strong>
                </label>
                <div class="gam-fire-braced" title="Бонус применяется только при Aim">
                  <span>Упор</span>
                  <input type="checkbox" name="braced" aria-label="Упор" ${fireState.braced ? "checked" : ""}>
                </div>
              </div>
              <div class="gam-fire-rof-container" data-rof-container>${rofContent}</div>
            </div>
            <section>
              <div class="gam-fire-range-heading">
                <h4>Расстояние</h4>
                <div class="gam-fire-elevation-controls">
                  <label class="gam-fire-height-field">
                    <span>Высота</span>
                    <input type="number" name="height" value="${escapeHTML(fireState.height)}" min="0" step="any" inputmode="decimal" aria-label="Высота в ярдах">
                    <span class="gam-fire-height-unit">ярды</span>
                  </label>
                  <span class="gam-fire-elevation-separator" aria-hidden="true">|</span>
                  <label class="gam-fire-high-ground">
                    <span>I have the high ground</span>
                    <input type="checkbox" name="highGround" ${fireState.highGround ? "checked" : ""}>
                  </label>
                </div>
                <p>${escapeHTML(recommendationText)}</p>
              </div>
              <div
                class="gam-fire-effective-distance"
                data-effective-distance
                aria-live="polite"
                ${elevation ? "" : "hidden"}
              >
                Реальная дистанция: <strong data-effective-distance-value>${elevation ? formatDistance(elevation.effectiveDistance) : ""}</strong> ярдов
              </div>
              <div class="gam-fire-range-list" role="listbox" aria-label="Диапазоны расстояния">${rows}</div>
            </section>
          </div>
          ${this._buildHitLocationContent(fireState)}
        </div>
        <div class="gam-fire-actions">
          <button type="button" data-fire-action="confirm"><i class="fa-solid fa-crosshairs"></i> Выполнить выстрел</button>
          <button type="button" data-fire-action="cancel"><i class="fa-solid fa-xmark"></i> Отмена</button>
        </div>
      </div>
    `;
  }
}