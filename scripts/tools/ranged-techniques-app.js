import { getRangedTechnique, getRangedTechniqueRows } from "./ranged-techniques-registry.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const CSS = [
  ".gam-techniques { display:grid; gap:7px; padding:10px; min-width:0; }",
  ".gam-technique-row { display:grid; grid-template-columns:24px minmax(0,1fr) auto 27px; align-items:center; gap:7px; padding:7px 8px; border:1px solid var(--color-border-light-primary,#7b6c61); border-radius:5px; }",
  ".gam-technique-row input { margin:0; width:18px; height:18px; }",
  ".gam-technique-lock { text-align:center; }",
  ".gam-technique-name { min-width:0; overflow-wrap:anywhere; font-weight:600; }",
  ".gam-technique-status { font-size:.86em; opacity:.82; white-space:nowrap; }",
  ".gam-technique-help { width:25px; min-height:25px; padding:0; margin:0; }",
  ".gam-technique-rules { display:grid; gap:9px; padding:12px; line-height:1.35; }",
  ".gam-technique-rules h3, .gam-technique-rules h4 { margin:0; }",
  ".gam-technique-rules p { margin:0; }",
  ".gam-technique-rules dl { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:3px 10px; margin:0; }",
  ".gam-technique-rules dt { font-weight:700; }",
  ".gam-technique-rules dd { margin:0; overflow-wrap:anywhere; }"
].join("");

export class RangedTechniqueHelpApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "ranged-technique-help"],
    tag: "section",
    window: { title: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0442\u0435\u0445\u043d\u0438\u043a\u0438", resizable: false, minimizable: true },
    position: { width: 460, height: "auto" }
  };
  constructor(technique, options = {}) {
    super({ ...options, id: options.id ?? "olegurps-technique-help-" + technique.id });
    this.technique = technique;
  }
  async _prepareContext() { return { technique: this.technique }; }
  async _renderHTML(context) {
    const entry = context.technique;
    const help = entry.help;
    const fields = [
      ["\u0422\u0438\u043f", help.type], ["Default", help.default],
      ["Prerequisite", help.prerequisite], ["Maximum", help.maximum]
    ].map(([key, value]) => "<dt>" + escapeHTML(key) + "</dt><dd>" +
      escapeHTML(value) + "</dd>").join("");
    const description = help.description.map(line => "<p>" + escapeHTML(line) + "</p>").join("");
    const implementation = help.implementation.map(line => "<p>" + escapeHTML(line) + "</p>").join("");
    return "<style>" + CSS + "</style><div class='gam-technique-rules'><h3>" +
      escapeHTML(entry.name) + "</h3><dl>" + fields + "</dl>" +
      "<h4>\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</h4>" + description + "<h4>\u041a\u0430\u043a \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0432 OleGURPS</h4>" +
      implementation + "</div>";
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

export class RangedTechniquesApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "ranged-techniques"],
    tag: "section",
    window: { title: "\u0422\u0435\u0445\u043d\u0438\u043a\u0438 \u0438 \u043f\u0440\u0438\u0451\u043c\u044b", resizable: false, minimizable: true },
    position: { width: 390, height: "auto" }
  };
  constructor({ getContext, onToggle, onClose } = {}, options = {}) {
    super(options);
    this.getContext = getContext;
    this.onToggle = onToggle;
    this.onCloseCallback = onClose;
    this._helpApps = new Map();
    this._boundChange = this._onChange.bind(this);
    this._boundClick = this._onClick.bind(this);
  }
  getRows() { return getRangedTechniqueRows(this.getContext()); }
  async _prepareContext() { return { rows: this.getRows() }; }
  async _renderHTML(context) {
    const rows = context.rows.map(row => {
      const control = row.available
        ? "<input type='checkbox' data-technique-id='" + escapeHTML(row.id) + "'" +
          (row.active ? " checked" : "") + ">"
        : "<span class='gam-technique-lock' title='" + escapeHTML(row.reason) + "' aria-label='" +
          escapeHTML(row.reason) + "'>\ud83d\udd12</span><input type='checkbox' disabled hidden>";
      return "<div class='gam-technique-row' data-technique-row='" + escapeHTML(row.id) +
        "' title='" + escapeHTML(row.reason) + "'>" + control +
        "<span class='gam-technique-name'>" + escapeHTML(row.name) + "</span>" +
        "<span class='gam-technique-status'>" + escapeHTML(row.status) + "</span>" +
        "<button type='button' class='gam-technique-help' data-technique-help='" +
        escapeHTML(row.id) + "' aria-label='\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435: " + escapeHTML(row.name) + "'>(?)</button></div>";
    }).join("");
    return "<style>" + CSS + "</style><div class='gam-techniques'>" + rows + "</div>";
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("change", this._boundChange);
    this.element?.removeEventListener("click", this._boundClick);
    this.element?.addEventListener("change", this._boundChange);
    this.element?.addEventListener("click", this._boundClick);
  }
  async _onChange(event) {
    const id = event.target?.dataset?.techniqueId;
    if (!id) return;
    await this.onToggle?.(id, event.target.checked);
    this.syncRows();
  }
  async _onClick(event) {
    const id = event.target?.closest?.("[data-technique-help]")?.dataset.techniqueHelp;
    if (!id) return;
    event.preventDefault();
    const entry = getRangedTechnique(id);
    if (!entry) return;
    let app = this._helpApps.get(id);
    if (!app) {
      app = new RangedTechniqueHelpApp(entry);
      this._helpApps.set(id, app);
    }
    await app.render({ force: true });
    app.bringToFront();
  }
  syncRows() {
    for (const row of this.getRows()) {
      const element = this.element?.querySelector?.('[data-technique-row="' + row.id + '"]');
      if (!element) continue;
      const input = element.querySelector("input[data-technique-id]");
      const lock = element.querySelector(".gam-technique-lock");
      if (!!input !== row.available || !!lock === row.available) {
        this.render({ force: true });
        return;
      }
      if (input) input.checked = row.active;
      const status = element.querySelector(".gam-technique-status");
      if (status) status.textContent = row.status;
      element.title = row.reason;
    }
  }
  async close(options = {}) {
    for (const app of this._helpApps.values()) await app.close();
    this._helpApps.clear();
    const result = await super.close(options);
    this.onCloseCallback?.();
    return result;
  }
}

