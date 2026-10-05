const MODULE_ID = "olegurps-qol";
const SETTING_KEY = "status-effect-visibility";
const ApplicationV2 = foundry.applications.api.ApplicationV2;

export function getManagedStatusEffects() {
  const effects = CONFIG.statusEffects ?? [];
  return effects.filter(effect => effect.id?.startsWith(`${MODULE_ID}-`));
}

export function getStatusEffectVisibility() {
  return game.settings.get(MODULE_ID, SETTING_KEY) ?? {};
}

export function applyStatusEffectVisibility(visibility = getStatusEffectVisibility()) {
  for (const effect of getManagedStatusEffects()) {
    effect.hud = visibility[effect.id] !== false;
  }
}

export class StatusEffectVisibilityMenu extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-status-effect-visibility",
    classes: ["olegurps-qol", "status-effect-visibility"],
    tag: "section",
    window: {
      title: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432 OleGURPS QOL",
      resizable: true
    },
    position: { width: 440, height: 500 }
  };

  async _prepareContext() {
    const visibility = getStatusEffectVisibility();
    return {
      effects: getManagedStatusEffects().map(effect => ({
        id: effect.id,
        name: game.i18n.localize(effect.name),
        visible: visibility[effect.id] !== false
      }))
    };
  }

  async _renderHTML(context) {
    return renderTemplate(`modules/${MODULE_ID}/templates/status-effect-visibility.hbs`, context);
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element?.querySelector(".olegurps-status-effect-visibility");
    form?.addEventListener("submit", event => this._onSubmit(event));
    form?.querySelector('[data-action="cancel"]')?.addEventListener("click", () => this.close());
  }

  async _onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const visibility = {};
    for (const effect of getManagedStatusEffects()) {
      visibility[effect.id] = formData.has(effect.id);
    }
    await game.settings.set(MODULE_ID, SETTING_KEY, visibility);
    await this.close();
  }
}

export function registerStatusEffectVisibilitySetting() {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432",
    scope: "client",
    config: false,
    type: Object,
    default: {},
    onChange: visibility => {
      applyStatusEffectVisibility(visibility);
      if (canvas?.hud?.token?.rendered) canvas.hud.token.render();
      for (const app of Object.values(ui.windows ?? {})) {
        if (app.constructor?.name === "EffectPicker") app.render(true);
      }
    }
  });
  game.settings.registerMenu(MODULE_ID, "status-effect-visibility-menu", {
    name: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432 OleGURPS QOL",
    label: "\u041d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c",
    hint: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435, \u043a\u0430\u043a\u0438\u0435 \u044d\u0444\u0444\u0435\u043a\u0442\u044b \u043c\u043e\u0434\u0443\u043b\u044f \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0432 Assign Status Effect.",
    icon: "fas fa-eye",
    type: StatusEffectVisibilityMenu,
    restricted: false
  });
}
