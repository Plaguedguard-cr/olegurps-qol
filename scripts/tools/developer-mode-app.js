import { developerText } from "./developer-localization.js";
import { requireDeveloperGM, armTestRoll, cancelTestRoll, getPendingTestRoll, subscribeTestRoll } from "./developer-roll-service.js";

export class DeveloperModeWindow extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-developer-mode", classes: ["olegurps-qol"], tag: "section",
    window: { title: "OleGURPS.Developer.Title", resizable: false },
    position: { width: 380, height: "auto" }
  };
  #selected = 10;
  #unsubscribe = null;

  constructor(options = {}) {
    requireDeveloperGM();
    super({ ...options, window: { ...options.window, title: developerText("Title") } });
  }
  render(...args) { requireDeveloperGM(); return super.render(...args); }

  async _prepareContext() {
    requireDeveloperGM();
    return { totals: Array.from({ length: 16 }, (_, i) => ({ value: i + 3, selected: i + 3 === this.#selected })),
      pending: getPendingTestRoll(),
      labels: Object.fromEntries(["Hint", "Result", "Apply", "Pending", "None", "Cancel"]
        .map(name => [name, developerText(name)])) };
  }
  async _renderHTML(context) {
    requireDeveloperGM();
    return renderTemplate("modules/olegurps-qol/templates/developer-mode.hbs", context);
  }
  _replaceHTML(result, content) { requireDeveloperGM(); content.innerHTML = result; }
  _onRender(context, options) {
    requireDeveloperGM();
    super._onRender(context, options);
    const select = this.element.querySelector("[name=total]");
    select.addEventListener("change", () => { requireDeveloperGM(); this.#selected = Number(select.value); });
    this.element.querySelector("[data-action=apply]").addEventListener("click", () => armTestRoll(Number(select.value)));
    this.element.querySelector("[data-action=cancel]").addEventListener("click", () => cancelTestRoll());
    this.#unsubscribe ??= subscribeTestRoll(() => {
      if (game.user?.isGM) void this.render({ force: true });
      else void this.close();
    });
  }
  async close(...args) {
    this.#unsubscribe?.(); this.#unsubscribe = null;
    return super.close(...args);
  }
}

let windowInstance;
export function openDeveloperMode() {
  requireDeveloperGM();
  windowInstance ??= new DeveloperModeWindow();
  return windowInstance.render({ force: true });
}

export const developerApi = Object.freeze({
  open: openDeveloperMode, arm: armTestRoll, cancel: cancelTestRoll, getPending: getPendingTestRoll
});

export function registerDeveloperModeMenu() {
  game.settings.registerMenu("olegurps-qol", "developer-mode", {
    name: developerText("Title"), label: developerText("Open"),
    hint: developerText("Hint"), icon: "fas fa-flask",
    type: DeveloperModeWindow, restricted: true
  });
}
