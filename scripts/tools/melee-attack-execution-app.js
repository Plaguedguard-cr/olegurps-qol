import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { executeNativeMeleeAttack } from "./melee-service.js";
import { withClearedFoundryTargets } from "./foundry-targets.js";

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

export async function executeMeleeAttackSnapshot(snapshot) {
  const roll = () => executeNativeMeleeAttack({
    actor: snapshot.actor,
    sourceAttack: snapshot.sourceAttack,
    effectiveSkill: snapshot.effectiveSkill,
    locationText: snapshot.locationText,
    overrideText: snapshot.overrideText,
    modifierDetails: snapshot.modifierDetails,
    captureMessage: true,
    maneuver: snapshot.maneuver,
    deceptiveDefensePenalty: snapshot.deceptiveDefensePenalty,
    telegraphicCriticalBonus: snapshot.telegraphicCriticalBonus
  });
  const result = snapshot.clearTargets ? await withClearedFoundryTargets(roll) : await roll();
  if (result.success && snapshot.randomLocation) {
    try {
      const random = await snapshot.targetingService.resolveRandomHitLocation();
      const html = buildRandomHitLocationsHtml([random], {
        escapeHtml: escapeHTML,
        contourTitle: "\u041a\u043e\u043d\u0442\u0443\u0440\u043d\u043e\u0435 \u0440\u0438\u0441\u043e\u0432\u0430\u043d\u0438\u0435"
      });
      if (result.message?.update) {
        const content = String(result.message.content ?? result.message._source?.content ?? "");
        await result.message.update({ content: content + html });
      } else {
        ui.notifications.warn("\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0443\u044e Hit Location \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0435\u0451 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435.");
      }
    } catch (error) {
      console.error("Melee Assistant random Hit Location:", error);
      ui.notifications.warn("\u0410\u0442\u0430\u043a\u0430 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430, \u043d\u043e \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0443\u044e Hit Location \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c.");
    }
  }
  return { ...result, completed: result.success || !!result.message };
}

export class MeleeAttackExecutionApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "melee-attack-execution"],
    tag: "section",
    window: { title: "\u0410\u0442\u0430\u043a\u0438", resizable: false, minimizable: true },
    position: { width: 310, height: "auto" }
  };

  constructor({ slots, onClose }, options = {}) {
    super(options);
    this.slots = slots.map(slot => ({ ...slot, completed: false }));
    this.onClose = onClose;
    this._busy = false;
    this._closed = false;
    this._boundClick = this._onClick.bind(this);
  }

  async _prepareContext() { return {}; }

  async _renderHTML() {
    return `<div class="gam-melee-execution-list">${this.slots.map((slot, index) => `
      <button type="button" data-execution-slot="${index}" ${slot.completed ? "disabled" : ""}>
        <strong>${escapeHTML(slot.label)}${slot.completed ? " \u2713" : ""}</strong>
        <small>${escapeHTML(slot.effectiveSkill)} \u00b7 ${escapeHTML(slot.hitLocationLabel || "Hit Location")}${slot.martialSummary ? " \u00b7 " + escapeHTML(slot.martialSummary) : ""}</small>
      </button>`).join("")}</div>`;
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("click", this._boundClick);
    this.element?.addEventListener("click", this._boundClick);
  }

  async _onClick(event) {
    const button = event.target instanceof Element ? event.target.closest("button[data-execution-slot]") : null;
    if (!button || this._busy || this._closed) return;
    const index = Number(button.dataset.executionSlot);
    const slot = this.slots[index];
    if (!slot || slot.completed) return;
    this._busy = true;
    for (const control of this.element?.querySelectorAll("button[data-execution-slot]") ?? []) control.disabled = true;
    try {
      const result = await executeMeleeAttackSnapshot(slot);
      if (this._closed) return;
      if (result.completed) {
        slot.completed = true;
        if (this.slots.every(entry => entry.completed)) return await this.close();
      } else {
        ui.notifications.warn("\u0411\u0440\u043e\u0441\u043e\u043a \u043d\u0435 \u0431\u044b\u043b \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.");
      }
    } catch (error) {
      console.error("Melee Assistant attack " + slot.label + ":", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._busy = false;
      if (!this._closed && this.rendered) await this.render({ force: true });
    }
  }

  async close(options = {}) {
    if (this._closed) return;
    this._closed = true;
    const result = await super.close(options);
    this.slots = [];
    this.onClose?.();
    return result;
  }
}
