import { parseElevationHeight } from "./fire-range-service.js";

const ApplicationV2 = globalThis.foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export class TrademarkMoveExecutionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "trademark-move-execution"],
    tag: "section",
    window: { title: "Trademark Move", resizable: false, minimizable: true },
    position: { width: 360, height: "auto" }
  };

  constructor({ slots, rangeBands = [], readTargetRangeContext = null, calculatePreviews = null, execute }, options = {}) {
    super(options);
    this.slots = slots.map(slot => ({ ...slot, completed: false }));
    this.rangeBands = rangeBands;
    this.readTargetRangeContext = readTargetRangeContext;
    this.calculatePreviews = calculatePreviews;
    this._previewGeneration = 0;
    this.execute = execute;
    this.situation = { visibilityMode: "normal", partialPenalty: -1, manualModifier: 0,
      rangeIndex: null, height: 0, elevationDirection: "level" };
    this._readTargetElevation();
    this._targetHookId = null;
    this._tokenHookId = null;
    this._targetChange = this._onTargetChange.bind(this);
    this._tokenChange = this._onTokenChange.bind(this);
    this.busy = false;
    this._click = this._onClick.bind(this);
    this._change = this._onChange.bind(this);
    this._input = this._onInput.bind(this);
  }

  _readTargetElevation() {
    const context = this.readTargetRangeContext?.();
    this.situation.height = context?.height ?? 0;
    this.situation.elevationDirection = context?.elevationDirection ?? "level";
  }
  _formatRangeSelection(rangeValue = this.situation.rangeIndex) {
    const index = rangeValue === "" || rangeValue === null ? null : Number(rangeValue);
    const range = this.rangeBands.find(entry => entry.index === index);
    const penalty = entry => `(${entry.penalty >= 0 ? "+" : ""}${entry.penalty})`;
    if (range) return `\u0412\u0440\u0443\u0447\u043d\u0443\u044e: ${range.label} ${penalty(range)}`;
    const context = this.readTargetRangeContext?.();
    if (!context || !Number.isFinite(Number(context.distance)))
      return "\u0410\u0432\u0442\u043e: \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0434\u043d\u0443 \u0446\u0435\u043b\u044c";
    const measured = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(context.distance);
    const targetRange = this.rangeBands.find(entry => entry.index === context.rangeIndex);
    return `\u0426\u0435\u043b\u044c: ${measured} \u044f\u0440\u0434\u043e\u0432${targetRange ? ` \u00b7 ${targetRange.label} ${penalty(targetRange)}` : ""}`;
  }
  _updateRangeSelection() {
    const summary = this.element?.querySelector("[data-tm-range-selection]");
    if (summary) summary.textContent = this._formatRangeSelection(
      this.element?.querySelector('[name="tmRangeIndex"]')?.value ?? "");
  }
  _onTargetChange(user) {
    if (user && user !== globalThis.game?.user) return;
    this._readTargetElevation();
    const height = this.element?.querySelector('[name="tmHeight"]');
    if (height) height.value = String(this.situation.height);
    this._updateRangeSelection();
    for (const direction of ["high", "low"]) {
      const control = this.element?.querySelector('[name="tm' + (direction === "high" ? "High" : "Low") + 'Ground"]');
      if (control) control.checked = this.situation.elevationDirection === direction;
    }
    this._captureSituation();
    void this._refreshPreviews();
  }
  _onTokenChange(document, change) {
    const targets = Array.from(globalThis.game?.user?.targets ?? []);
    if (targets.length !== 1 || targets[0]?.id !== document?.id) return;
    if (!["x", "y", "elevation"].some(key => Object.hasOwn(change ?? {}, key))) return;
    this._onTargetChange(globalThis.game?.user);
  }
  _captureSituation() {
    const field = name => this.element?.querySelector(`[name="${name}"]`);
    const visibilityMode = field("tmVisibility")?.value ?? "normal";
    const rangeValue = field("tmRangeIndex")?.value ?? "";
    this.situation = {
      visibilityMode,
      partialPenalty: visibilityMode === "partial" ? Number(field("tmPartialPenalty")?.value) : -1,
      manualModifier: Number(field("tmManualModifier")?.value),
      rangeIndex: rangeValue === "" ? null : Number(rangeValue),
      height: parseElevationHeight(field("tmHeight")?.value),
      elevationDirection: field("tmHighGround")?.checked ? "high"
        : field("tmLowGround")?.checked ? "low" : "level"
    };
    return this.situation;
  }
  _formatSkillPreview(preview) {
    return preview ? `\u042d\u0444\u0444. ${preview.effectiveSkill} (${preview.successChance}%)`
      : "\u042d\u0444\u0444. \u2014 (\u2014%)";
  }
  async _refreshPreviews() {
    const generation = ++this._previewGeneration;
    let previews;
    try { previews = await this.calculatePreviews?.({ ...this.situation }) ?? []; }
    catch (_error) { previews = this.slots.map(() => null); }
    if (generation !== this._previewGeneration) return;
    for (const [index, preview] of previews.entries()) {
      const display = this.element?.querySelector(`[data-tm-effective="${index}"]`);
      if (display) display.textContent = this._formatSkillPreview(preview);
    }
    return previews;
  }
  async close(options = {}) {
    if (this._targetHookId !== null) globalThis.Hooks?.off?.("targetToken", this._targetHookId);
    if (this._tokenHookId !== null) globalThis.Hooks?.off?.("updateToken", this._tokenHookId);
    this._targetHookId = null;
    this._tokenHookId = null;
    return super.close(options);
  }
  async _prepareContext() { return {}; }
  async _renderHTML() {
    ++this._previewGeneration;
    let previews;
    try { previews = await this.calculatePreviews?.({ ...this.situation }) ?? []; }
    catch (_error) { previews = this.slots.map(() => null); }
    return '<div class="tm-execution-controls"><label>Visibility <select name="tmVisibility">' +
      [["normal", "Normal"], ["partial", "Partial"], ["unseen", "Unseen"], ["unseen-exact", "Unseen exact"], ["known", "Known location"], ["blind", "Blind"]].map(([value, text]) =>
        '<option value="' + value + '"' + (this.situation.visibilityMode === value ? ' selected' : '') + '>' + text + '</option>').join("") +
      '</select></label><label class="tm-range-field">Range <select name="tmRangeIndex"><option value="">Auto from selected target</option>' +
      this.rangeBands.map(range => '<option value="' + escape(range.index) + '"' +
        (this.situation.rangeIndex === range.index ? ' selected' : '') + '>' +
        escape(range.label) + ' (' + (range.penalty >= 0 ? '+' : '') + escape(range.penalty) + ')</option>').join('') +
      '</select></label><div class="tm-range-selection" data-tm-range-selection aria-live="polite">' +
      escape(this._formatRangeSelection()) + '</div><label>Height <input name="tmHeight" type="number" min="0" step="any" value="' + escape(this.situation.height) + '"></label>' +
      '<div class="tm-elevation-directions"><label>High Ground <input name="tmHighGround" type="checkbox"' +
        (this.situation.elevationDirection === "high" ? ' checked' : '') + '></label>' +
      '<label>Low Ground <input name="tmLowGround" type="checkbox"' +
        (this.situation.elevationDirection === "low" ? ' checked' : '') + '></label></div>' +
      '<label data-tm-partial-penalty' + (this.situation.visibilityMode === "partial" ? '' : ' hidden') + '>Partial penalty <input name="tmPartialPenalty" type="number" min="-9" max="-1" value="' + escape(this.situation.partialPenalty) + '"></label>' +
      '<label>Situational modifier <input name="tmManualModifier" type="number" step="1" value="' + escape(this.situation.manualModifier) + '"></label></div>' +
      '<div class="tm-execution-list">' + this.slots.map((slot, index) =>
      '<button type="button" data-tm-slot="' + index + '"' + (slot.completed ? ' disabled' : '') + '>' +
      '<strong>' + (index + 1) + '. ' + escape(slot.label) + (slot.completed ? ' \u2713' : '') + '</strong>' +
      '<small>' + escape(slot.summary) + ' | <span data-tm-effective="' + index + '">' +
      escape(this._formatSkillPreview(previews[index])) + '</span></small></button>').join("") + '</div>';
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
  _onRender(context, options) {
    super._onRender(context, options);
    if (this._targetHookId === null && globalThis.Hooks?.on)
      this._targetHookId = globalThis.Hooks.on("targetToken", this._targetChange);
    if (this._tokenHookId === null && globalThis.Hooks?.on)
      this._tokenHookId = globalThis.Hooks.on("updateToken", this._tokenChange);
    this.element?.removeEventListener("click", this._click);
    this.element?.addEventListener("click", this._click);
    this.element?.removeEventListener("change", this._change);
    this.element?.addEventListener("change", this._change);
    this.element?.removeEventListener("input", this._input);
    this.element?.addEventListener("input", this._input);
  }
  _onChange(event) {
    if (["tmHighGround", "tmLowGround"].includes(event.target?.name) && event.target.checked) {
      const other = this.element?.querySelector(event.target.name === "tmHighGround"
        ? '[name="tmLowGround"]' : '[name="tmHighGround"]');
      if (other) other.checked = false;
    }
    if (event.target?.name === "tmRangeIndex") this._updateRangeSelection();
    if (event.target?.name === "tmVisibility") {
      const partial = this.element?.querySelector("[data-tm-partial-penalty]");
      if (partial) partial.hidden = event.target.value !== "partial";
    }
    this._captureSituation();
    void this._refreshPreviews();
  }
  _onInput(event) {
    if (!["tmHeight", "tmManualModifier", "tmPartialPenalty"].includes(event.target?.name)) return;
    this._captureSituation();
    void this._refreshPreviews();
  }
  async _onClick(event) {
    const button = event.target?.closest?.("button[data-tm-slot]");
    if (!button || this.busy) return;
    const slot = this.slots[Number(button.dataset.tmSlot)];
    if (!slot || slot.completed) return;
    this._captureSituation();
    const { visibilityMode, height } = this.situation;
    if (height === null || this.situation.rangeIndex !== null &&
        !this.rangeBands.some(range => range.index === this.situation.rangeIndex) ||
        !Number.isInteger(this.situation.manualModifier) ||
        this.situation.visibilityMode === "partial" &&
        (!Number.isInteger(this.situation.partialPenalty) || this.situation.partialPenalty < -9 || this.situation.partialPenalty > -1)) {
      globalThis.ui.notifications.error("Invalid range, height, situational modifier, or visibility penalty.");
      return;
    }
    this.busy = true;
    for (const control of this.element.querySelectorAll("button[data-tm-slot]")) control.disabled = true;
    try {
      let expectedEffectiveSkill = null;
      if (this.calculatePreviews) {
        const preview = (await this._refreshPreviews())?.[Number(button.dataset.tmSlot)];
        if (!preview) throw new Error("Effective skill is unavailable. Select a range or one target.");
        expectedEffectiveSkill = preview.effectiveSkill;
      }
      if (await this.execute(slot.step, { ...this.situation }, expectedEffectiveSkill)) {
        slot.completed = true;
        if (this.slots.every(entry => entry.completed)) return await this.close();
      }
    } catch (error) {
      globalThis.ui.notifications.error(error?.message ?? String(error));
    } finally {
      this.busy = false;
      if (this.rendered) await this.render({ force: true });
    }
  }
}