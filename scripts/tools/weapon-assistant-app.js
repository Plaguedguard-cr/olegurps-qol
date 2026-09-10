const ApplicationV2 = foundry.applications.api.ApplicationV2;

export class WeaponAssistantApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-shooting-assistant",
    classes: ["olegurps-qol", "shooting-assistant"],
    tag: "section",
    window: { title: "Shooting Assistant", resizable: true },
    position: { width: 820, height: "auto" }
  };

  constructor({ token, managerState, title, buildContent, handleAction, styles, onClose }, options = {}) {
    super({
      ...options,
      id: options.id ?? `olegurps-shooting-assistant-${token.id}`,
      window: { title, resizable: true, ...(options.window ?? {}) }
    });
    this.token = token;
    this.managerState = managerState;
    this.buildContent = buildContent;
    this.handleAction = handleAction;
    this.managerStyles = styles;
    this.closeCallback = onClose;
    this.uiState = { result: "" };
    this._boundClick = this._onManagerClick.bind(this);
  }

  async _prepareContext(_options) {
    return { managerState: this.managerState, uiState: this.uiState };
  }

  async _renderHTML(context, _options) {
    return this.buildContent(context.managerState, context.uiState);
  }

  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement) || root.dataset.gamListeners === "true") return;
    if (this.managerStyles && !root.querySelector("style[data-gam-manager-style]")) {
      const style = document.createElement("style");
      style.dataset.gamManagerStyle = "true";
      style.textContent = this.managerStyles;
      root.prepend(style);
    }
    root.addEventListener("click", this._boundClick);
    root.dataset.gamListeners = "true";
  }

  async close(options = {}) {
    const result = await super.close(options);
    this.closeCallback?.(this);
    return result;
  }

  setManagerState(managerState) {
    this.managerState = managerState;
  }

  setResult(message) {
    this.uiState.result = String(message ?? "");
    const result = this.element?.querySelector("[data-ammo-result]");
    if (result) result.textContent = this.uiState.result;
  }

  async refreshContent() {
    const manager = this.element?.querySelector(".gam-ammo-manager");
    if (!manager) {
      await this.render({ force: true });
      return;
    }
    const scrollTop = manager.scrollTop;
    const template = document.createElement("template");
    template.innerHTML = this.buildContent(this.managerState, this.uiState).trim();
    const nextManager = template.content.firstElementChild;
    if (!(nextManager instanceof HTMLElement)) return;
    for (const selector of [".gam-toolbar", ".gam-weapon-list", "[data-ammo-result]"]) {
      const current = manager.querySelector(selector);
      const replacement = nextManager.querySelector(selector);
      if (current && replacement) current.replaceWith(replacement);
    }
    manager.scrollTop = scrollTop;
  }

  async _onManagerClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-ammo-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.ammoAction;
    const weaponId = button.dataset.weaponId;
    button.disabled = true;
    try {
      const result = await this.handleAction({ action, weaponId, app: this });
      if (result?.managerState) this.setManagerState(result.managerState);
      if (result?.message) this.setResult(result.message);
      if (result?.changed) await this.refreshContent();
      else if (button.isConnected) button.disabled = false;
    } catch (error) {
      if (button.isConnected) button.disabled = false;
      console.error("GURPS Ammo Manager:", error);
      ui.notifications.error(error?.message ?? String(error));
    }
  }
}