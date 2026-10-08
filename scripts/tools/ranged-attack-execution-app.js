const ApplicationV2 = globalThis.foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

export class RangedAttackExecutionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "ranged-attack-execution"],
    tag: "section",
    window: { title: "Ranged Rapid Strike", resizable: false, minimizable: true },
    position: { width: 360, height: "auto" }
  };

  constructor({ slots, execute }, options = {}) {
    super(options);
    this.slots = slots.map(slot => ({ ...slot, completed: false }));
    this.execute = execute;
    this.busy = false;
    this._click = this._onClick.bind(this);
  }

  async _prepareContext() { return {}; }
  async _renderHTML() {
    return '<div class="rrs-execution-list">' + this.slots.map((slot, index) =>
      '<button type="button" data-rrs-execution-slot="' + index + '"' + (slot.completed ? ' disabled' : '') + '>' +
      '<strong>Attack ' + (index + 1) + (slot.completed ? ' \u2713' : '') + '</strong>' +
      '<small>' + escape(slot.summary) + '</small></button>').join('') + '</div>';
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("click", this._click);
    this.element?.addEventListener("click", this._click);
  }
  async _onClick(event) {
    const button = event.target?.closest?.("button[data-rrs-execution-slot]");
    if (!button || this.busy) return;
    const slot = this.slots[Number(button.dataset.rrsExecutionSlot)];
    if (!slot || slot.completed) return;
    this.busy = true;
    for (const control of this.element.querySelectorAll("button[data-rrs-execution-slot]")) control.disabled = true;
    try {
      if (await this.execute(slot, this.slots.every(entry => !entry.completed))) {
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