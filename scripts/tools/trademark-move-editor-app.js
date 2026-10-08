import { normalizeTrademarkMoveStep, getTrademarkHitLocationOptions, getTrademarkHitLocationValue } from "./trademark-move-model.js";
import { TargetingService } from "./targeting-service.js";
import { createTargetedAttackContext } from "./targeted-attack-service.js";
import { getRangedRapidStrikeSpecialties } from "./ranged-rapid-strike-service.js";

const ApplicationV2 = globalThis.foundry.applications.api.ApplicationV2;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const label = text => text.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

export class TrademarkMoveEditorApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["olegurps-qol", "trademark-move-editor"],
    tag: "section",
    window: { title: "Trademark Move", resizable: true, minimizable: true },
    position: { width: 720, height: "auto" }
  };

  constructor({ actor, weapons, steps, calculatePreview, onSave, onDelete }, options = {}) {
    super(options);
    this.actor = actor;
    this.weapons = weapons;
    this.steps = (steps?.length ? steps : [this._newStep()]).map(normalizeTrademarkMoveStep);
    this.calculatePreview = calculatePreview;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.hasSaved = !!steps?.length;
    this.services = new Map();
    this._previewGenerations = new Map();
    this.busy = false;
    this._click = this._onClick.bind(this);
    this._change = this._onChange.bind(this);
    this._input = this._onInput.bind(this);
  }

  _newStep() {
    const first = this.weapons[0];
    return { weaponId: first?.weapon.id ?? "", attackRef: first?.attackRef ?? null,
      shots: first?.profile?.modes?.[0]?.minRoF ?? 1, rofMode: 0, bodyplanId: "humanoid", hitLocationId: "silhouette", aimSeconds: 0 };
  }

  _weapon(step) { return this.weapons.find(entry => entry.weapon.id === step.weaponId); }

  async _service(step) {
    const weapon = this._weapon(step);
    if (!weapon) return null;
    const key = weapon.weapon.id + ":" + step.bodyplanId;
    if (!this.services.has(key)) this.services.set(key,
      TargetingService.create({ attack: weapon.attack, bodyplan: step.bodyplanId }));
    return this.services.get(key);
  }

  _previewText(preview) {
    if (!preview) return "\u0411\u0430\u0437\u0430: \u2014 | \u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: \u2014 | \u042d\u0444\u0444.: \u2014";
    const modifiers = preview.totalModifiers >= 0 ? `+${preview.totalModifiers}` : String(preview.totalModifiers);
    return `\u0411\u0430\u0437\u0430: ${preview.baseSkill} | \u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: ${modifiers} | \u042d\u0444\u0444.: ${preview.effectiveSkill} (${preview.successChance}%)`;
  }

  async _updateStepPreview(index) {
    const step = this.steps[index];
    if (!step) return;
    const generation = (this._previewGenerations.get(index) ?? 0) + 1;
    this._previewGenerations.set(index, generation);
    const bodyplanId = step.bodyplanId;
    const current = this._weapon(step);
    const service = await this._service(step);
    if (this._previewGenerations.get(index) !== generation || this.steps[index] !== step ||
        step.bodyplanId !== bodyplanId || this._weapon(step) !== current) return;
    const targeted = current ? createTargetedAttackContext({ actor: this.actor, attack: current.attack }) : null;
    const preview = current && service ? this.calculatePreview?.(current, step, service, targeted) : null;
    const display = this.element?.querySelector(`[data-tm-step="${index}"] [data-tm-skill-preview]`);
    if (display) display.textContent = this._previewText(preview);
  }

  _capture() {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    for (const [index, step] of this.steps.entries()) {
      const row = root.querySelector('[data-tm-step="' + index + '"]');
      if (!row) continue;
      const field = name => row.querySelector('[name="' + name + '"]');
      const weaponId = field("weaponId")?.value ?? step.weaponId;
      const weaponChanged = weaponId !== step.weaponId;
      if (weaponChanged) {
        step.weaponId = weaponId;
        step.attackRef = this._weapon(step)?.attackRef ?? null;
        step.governingSpecialty = "";
        step.hitLocationId = "silhouette";
        step.hitRegionId = null;
        step.rofMode = 0;
        step.shots = this._weapon(step)?.profile?.modes?.[0]?.minRoF ?? 1;
      }
      if (!weaponChanged) step.shots = Number(field("shots")?.value);
      if (!weaponChanged) step.rofMode = Number(field("rofMode")?.value ?? 0);
      if (!weaponChanged) step.governingSpecialty = field("governingSpecialty")?.value ?? "";
      const bodyplanId = field("bodyplanId")?.value ?? "humanoid";
      const bodyplanChanged = bodyplanId !== step.bodyplanId;
      if (bodyplanChanged) { step.hitLocationId = "silhouette"; step.hitRegionId = null; }
      step.bodyplanId = bodyplanId;
      const location = (field("hitLocation")?.value ?? "silhouette::").split("::");
      if (!weaponChanged && !bodyplanChanged) {
        step.hitLocationId = location[0];
        step.hitRegionId = location[1] || null;
      }
      step.aimSeconds = Number(field("aimSeconds")?.value ?? 0);
      for (const name of ["braced", "laserSight", "moveAndAttack", "allOutAttack", "rangedRapidStrike"])
        step[name] = !!field(name)?.checked;
      if (step.moveAndAttack) step.allOutAttack = false;
    }
  }

  async _prepareContext() { return {}; }

  async _renderHTML() {
    const rows = await Promise.all(this.steps.map(async (step, index) => {
      const current = this._weapon(step);
      const service = await this._service(step);
      const targeted = current ? createTargetedAttackContext({ actor: this.actor, attack: current.attack }) : null;
      const quickSpecialties = current && step.rangedRapidStrike
        ? getRangedRapidStrikeSpecialties({ actor: this.actor, attack: current.attack }) : [];
      const specialtyOptions = targeted?.specialtyOptions.length ? targeted.specialtyOptions : quickSpecialties;
      const profile = current?.profile;
      const modes = profile?.type === "full-auto" ? profile.modes : [];
      const locations = getTrademarkHitLocationOptions(service, step);
      const opts = (items, value, text, selected) => items.map(item =>
        '<option value="' + escape(value(item)) + '"' + (String(value(item)) === String(selected) ? ' selected' : '') +
        '>' + escape(text(item)) + '</option>').join("");
      const locationValue = getTrademarkHitLocationValue(locations, step);
      const preview = current && service ? this.calculatePreview?.(current, step, service, targeted) : null;
      return '<article class="tm-step" data-tm-step="' + index + '"><header><strong>' + (index + 1) + '.</strong>' +
        '<span></span><button type="button" data-tm-action="up" data-index="' + index + '"' + (index ? '' : ' disabled') + '>\u2191</button>' +
        '<button type="button" data-tm-action="down" data-index="' + index + '"' + (index < this.steps.length - 1 ? '' : ' disabled') + '>\u2193</button>' +
        '<button type="button" data-tm-action="remove" data-index="' + index + '"' + (this.steps.length > 1 ? '' : ' disabled') + '>' + label("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c") + '</button></header>' +
        '<div class="tm-fields"><label>' + label("\\u041e\\u0440\\u0443\\u0436\\u0438\\u0435") +
        '<select name="weaponId">' + opts(this.weapons, x => x.weapon.id, x => x.attack.label, step.weaponId) + '</select></label>' +
        '<label>RoF <select name="rofMode">' + (modes.length ? opts(modes, x => x.index, x => x.label, step.rofMode) :
          '<option value="0">' + escape(profile?.display ?? "1") + '</option>') + '</select></label>' +
        '<label>' + label("\\u0412\\u044b\\u0441\\u0442\\u0440\\u0435\\u043b\\u044b") +
        '<input name="shots" type="number" min="1" step="1" value="' + escape(step.shots) + '"></label>' +
        '<label>Bodyplan <select name="bodyplanId">' + opts(TargetingService.getBodyplanOptions(), x => x.id, x => x.label, step.bodyplanId) + '</select></label>' +
        '<label>Hit Location <select name="hitLocation">' + opts(locations, x => x.zoneId + "::" + (x.regionId ?? ""), x => x.label, locationValue) + '</select></label>' +
        '<label>Governing Skill <span>' + escape(current?.attack?.governingSkillBinding?.name ?? "Ranged Level fallback") + '</span></label>' +
        '<div class="tm-aim-preview-row"><label>Aim <input name="aimSeconds" type="number" min="0" step="1" value="' + escape(step.aimSeconds) + '"></label>' +
        '<span data-tm-skill-preview>' + escape(this._previewText(preview)) + '</span></div>' +
        '</div><div class="tm-checks">' + [
          ["braced", "Braced"], ["laserSight", "Laser Sight"], ["moveAndAttack", "Move and Attack"],
          ["allOutAttack", "All-Out Attack (Determined)"], ["rangedRapidStrike", "Ranged Rapid Strike"]
        ].map(([name, text]) => '<label><input type="checkbox" name="' + name + '"' + (step[name] ? ' checked' : '') + '> ' + text + '</label>').join("") +
        '</div></article>';
    }));
    return '<div class="tm-editor"><div class="tm-list">' + rows.join("") + '</div><footer>' +
      '<button type="button" data-tm-action="add">' + label("\\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u0430\\u0442\\u0430\\u043a\\u0443") + '</button>' +
      '<button type="button" data-tm-action="cancel">' + label("\\u041e\\u0442\\u043c\\u0435\\u043d\\u0430") + '</button>' +
      '<button type="button" data-tm-action="save">' + label("\\u0421\\u043e\\u0445\\u0440\\u0430\\u043d\\u0438\\u0442\\u044c") + '</button>' +
      (this.hasSaved ? '<button type="button" data-tm-action="delete">' + label("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c Trademark Move") + '</button>' : '') +
      '</footer></div>';
  }

  _replaceHTML(result, content) { content.innerHTML = result; }
  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.removeEventListener("click", this._click);
    this.element?.removeEventListener("change", this._change);
    this.element?.addEventListener("click", this._click);
    this.element?.addEventListener("change", this._change);
    this.element?.removeEventListener("input", this._input);
    this.element?.addEventListener("input", this._input);
  }
  async _onChange(event) {
    const name = event.target?.name;
    this._capture();
    if (["weaponId", "bodyplanId", "rangedRapidStrike"].includes(name)) await this.render({ force: true });
    else await this._updateStepPreview(Number(event.target?.closest?.("[data-tm-step]")?.dataset.tmStep));
  }
  async _onInput(event) {
    if (!["shots", "aimSeconds"].includes(event.target?.name)) return;
    this._capture();
    await this._updateStepPreview(Number(event.target?.closest?.("[data-tm-step]")?.dataset.tmStep));
  }
  async _onClick(event) {
    const button = event.target?.closest?.("button[data-tm-action]");
    if (!button || this.busy) return;
    this._capture();
    const action = button.dataset.tmAction;
    const index = Number(button.dataset.index);
    if (action === "cancel") return this.close();
    if (action === "add") this.steps.push(normalizeTrademarkMoveStep(this._newStep()));
    if (action === "remove" && this.steps.length > 1) this.steps.splice(index, 1);
    if (action === "up" && index > 0) [this.steps[index - 1], this.steps[index]] = [this.steps[index], this.steps[index - 1]];
    if (action === "down" && index < this.steps.length - 1) [this.steps[index + 1], this.steps[index]] = [this.steps[index], this.steps[index + 1]];
    if (["add", "remove", "up", "down"].includes(action)) return this.render({ force: true });
    if (action === "delete") {
      const confirmed = await globalThis.foundry.applications.api.DialogV2.confirm({
        window: { title: "Trademark Move" },
        content: "<p>" + label("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c \\u0441\\u043e\\u0445\\u0440\\u0430\\u043d\\u0451\\u043d\\u043d\\u044b\\u0439 Trademark Move?") + "</p>"
      });
      if (!confirmed) return;
    }
    if (!["save", "delete"].includes(action)) return;
    this.busy = true;
    try {
      if (action === "save") await this.onSave(this.steps.map(normalizeTrademarkMoveStep));
      else await this.onDelete();
      await this.close();
    } catch (error) {
      globalThis.ui.notifications.error(error?.message ?? String(error));
    } finally { this.busy = false; }
  }
}