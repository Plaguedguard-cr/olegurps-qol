import { moduleMessage } from "../localization.js";
import { maRussian } from "./ma-combat-options.js";
const ApplicationV2 = globalThis.foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

export class RangedAttackExecutionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "ranged-attack-execution"],
    tag: "section",
    window: { title: "Быстрая двойная стрельба", resizable: false, minimizable: true },
    position: { width: 360, height: "auto" }
  };

  constructor({ slots, execute, ordered = false }, options = {}) {
    super(options);
    this.slots = slots.map(slot => ({ ...slot, completed: false }));
    this.execute = execute;
    this.ordered = ordered;
    this.busy = false;
    this._click = this._onClick.bind(this);
  }

  async _prepareContext() { return {}; }
  _isAvailable(index) {
    return !this.slots[index]?.completed&&(!this.ordered||this.slots.slice(0,index).every(slot=>slot.completed));
  }
  async _renderHTML() {
    return '<div class="rrs-execution-list">' + this.slots.map((slot, index) =>
      '<button type="button" data-rrs-execution-slot="' + index + '"' + (!this._isAvailable(index) ? ' disabled' : '') + '>' +
      '<strong>' + escape(slot.label??('Атака '+(index+1))) + (slot.cancelled ? ' ×' : slot.completed ? ' \u2713' : '') + '</strong>' +
      '<small>' + escape(slot.summary) + '</small></button>' +
      (this.ordered&&this._isAvailable(index)?'<button type="button" data-rrs-skip-slot="'+index+'">'+
        (maRussian()?'Отменить бросок':'Cancel throw')+'</button>':'')).join('') + '</div>';
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("click", this._click);
    this.element?.addEventListener("click", this._click);
  }
  async _onClick(event) {
    const skip=event.target?.closest?.("button[data-rrs-skip-slot]");
    if(skip&&this.ordered&&!this.busy){
      const index=Number(skip.dataset.rrsSkipSlot);
      if(!this.slots[index]||!this._isAvailable(index))return;
      Object.assign(this.slots[index],{completed:true,cancelled:true});
      if(this.slots.every(entry=>entry.completed))return this.close();
      await this.render({force:true});
      return;
    }
    const button = event.target?.closest?.("button[data-rrs-execution-slot]");
    if (!button || this.busy) return;
    const index = Number(button.dataset.rrsExecutionSlot);
    const slot = this.slots[index];
    if (!slot || !this._isAvailable(index)) return;
    this.busy = true;
    for (const control of this.element.querySelectorAll("button[data-rrs-execution-slot], button[data-rrs-skip-slot]")) control.disabled = true;
    try {
      const result=await this.execute(slot,this.slots.every(entry=>!entry.completed||entry.cancelled));
      if(result==='stop')return await this.close();
      if(result){
        slot.completed = true;
        if (this.slots.every(entry => entry.completed)) return await this.close();
      }
    } catch (error) {
      globalThis.ui.notifications.error(moduleMessage(error));
    } finally {
      this.busy = false;
      if (this.rendered) await this.render({ force: true });
    }
  }
}
