import { readWeaponSkillTLPolicy, saveWeaponSkillTLPreference } from "./weapon-skill-tl-policy.js";

import { moduleText } from "../localization.js";
const text = name => moduleText("OleGURPS.WeaponSkillTL." + name);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export class WeaponSkillSettingsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-weapon-skill-settings", classes: ["olegurps-qol"], tag: "form",
    window: { title: text("Title"), resizable: false },
    position: { width: 480, height: "auto" },
    form: { closeOnSubmit: true, handler: async function(_event, _form, formData) {
      await saveWeaponSkillTLPreference(formData.object.ignoreWeaponSkillTLDifferences === true);
    } }
  };
  async _prepareContext() { return readWeaponSkillTLPolicy(); }
  async _renderHTML(context) {
    return `<div class="standard-form"><div class="form-group"><label for="olegurps-ignore-weapon-tl">${escape(text("Label"))}</label><div class="form-fields"><input id="olegurps-ignore-weapon-tl" name="ignoreWeaponSkillTLDifferences" type="checkbox" ${context.ignoreWeaponSkillTLDifferences ? "checked" : ""}></div><p class="hint">${escape(text("Hint"))}</p></div><footer class="form-footer"><button type="submit"><i class="fas fa-save"></i>${escape(text("Save"))}</button></footer></div>`;
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

export function registerWeaponSkillSettings(runtime = globalThis) {
  runtime.game.settings.registerMenu("olegurps-qol", "weapon-skills", {
    name: text("Title"), label: text("Open"),
    hint: text("MenuHint"), icon: "fas fa-user-gear",
    type: WeaponSkillSettingsApp, restricted: false
  });
  runtime.Hooks.on("updateUser", (user, changes) => {
    if (user.id !== runtime.game.user?.id) return;
    if (!Object.keys(changes).some(key => key === "flags" || key.startsWith("flags.olegurps-qol."))) return;
    for (const app of runtime.foundry.applications.instances.values()) {
      if (app instanceof WeaponSkillSettingsApp) void app.render({ force: true });
      else if (app.attack?.standaloneRef || app.sourceAttacks?.some(attack => attack.standaloneRef)) app._onActorUpdate?.(app.actor);
      else if (app.managerState?.weapons?.some(weapon => weapon.standaloneWeaponId)) void app.refreshContent?.();
    }
  });
}
