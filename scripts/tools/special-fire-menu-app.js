const ApplicationV2 = foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export class SpecialFireMenuApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-special-fire-menu",
    classes: ["olegurps-qol", "special-fire-menu"],
    tag: "section",
    window: { title: "\u0420\u0435\u0436\u0438\u043c\u044b \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b", resizable: false },
    position: { width: 350, height: "auto" }
  };

  constructor({ registry, onClose }, options = {}) {
    super(options);
    this.registry = registry;
    this.onCloseCallback = onClose;
    this._boundClick = this._onClick.bind(this);
  }

  async _prepareContext() { return {}; }

  async _renderHTML() {
    return '<div class="sf-menu">' + this.registry.map(mode => {
      const availability = mode.availability();
      const saved = mode.hasSession();
      const disabled = !availability.available;
      const title = disabled ? availability.reason : saved ? "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0439 \u0440\u0435\u0436\u0438\u043c" : mode.description;
      return '<div class="sf-menu-entry" title="' + escape(title) + '">' +
        '<button type="button" data-mode="' + escape(mode.id) + '" ' + (disabled ? "disabled" : "") + '>' +
        (mode.icon ? '<i class="' + escape(mode.icon) + '"></i> ' : "") +
        escape(mode.label) + (saved ? " \u2014 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c" : "") + '</button>' +
        '<small>' + escape(disabled ? availability.reason : mode.description) + '</small></div>';
    }).join("") + '</div>';
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement) || root.dataset.specialFireListeners === "true") return;
    root.addEventListener("click", this._boundClick);
    root.dataset.specialFireListeners = "true";
  }

  async _onClick(event) {
    const button = event.target?.closest?.("button[data-mode]");
    if (!button || button.disabled) return;
    const mode = this.registry.find(entry => entry.id === button.dataset.mode);
    if (!mode) return;
    const availability = mode.availability();
    if (!availability.available) {
      ui.notifications.warn(availability.reason);
      await this.render({ force: true });
      return;
    }
    button.disabled = true;
    try {
      await this.close();
      await mode.open();
    } catch (error) {
      console.error("OleGURPS QOL | Special fire mode:", error);
      ui.notifications.error(error?.message ?? String(error));
    }
  }

  async close(options = {}) {
    const result = await super.close(options);
    this.onCloseCallback?.(this);
    return result;
  }
}