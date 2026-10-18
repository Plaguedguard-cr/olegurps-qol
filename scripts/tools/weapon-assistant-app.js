import { moduleMessage } from "../localization.js";
import { installViewportBounds, releaseViewportBounds } from './application-viewport.js';
import { uawGroup, activeUAWCarrier } from './ut-uaw.js';
const ApplicationV2 = foundry.applications.api.ApplicationV2;

// An ammunition-only update can redraw its changed cards. Skill, definition,
// campaign or unknown changes still invalidate the entire displayed model.
export function changedAmmunitionCards(before, after, changes) {
  if (!Object.hasOwn(changes.flags?.world ?? {}, 'gurpsAmmoManager') ||
      Object.keys(changes).some(key=>!['flags','_stats','_id'].includes(key)) ||
      Object.keys(changes.flags ?? {}).some(key=>key!=='world') ||
      Object.keys(changes.flags?.world ?? {}).some(key=>key!=='gurpsAmmoManager')) return null;
  // Receipts record history; no manager card or toolbar renders them.
  const {weapons:oldWeapons = [], shotReceipts:oldReceipts, ...oldRest} = before;
  const {weapons:newWeapons = [], shotReceipts:newReceipts, ...newRest} = after;
  if (JSON.stringify(oldRest) !== JSON.stringify(newRest) ||
      JSON.stringify(oldWeapons.map(w=>w.id)) !== JSON.stringify(newWeapons.map(w=>w.id))) return null;
  return [...new Set(newWeapons.filter((weapon,index)=>JSON.stringify(weapon)!==JSON.stringify(oldWeapons[index]))
    .map(w=>uawGroup(w)?activeUAWCarrier(after,w).id:w.id))];
}

export class WeaponAssistantApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-shooting-assistant",
    classes: ["olegurps-qol", "shooting-assistant"],
    tag: "section",
    window: { title: "Помощник стрельбы", resizable: true },
    position: { width: 820, height: "auto" }
  };

  constructor({ token, managerState, title, buildContent, buildWeaponCards, handleAction, styles, onClose }, options = {}) {
    super({
      ...options,
      id: options.id ?? `olegurps-shooting-assistant-${token.id}`,
      window: { title, resizable: true, ...(options.window ?? {}) }
    });
    this.token = token;
    this.managerState = managerState;
    this.buildContent = buildContent;
    this.buildWeaponCards = buildWeaponCards;
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
    installViewportBounds(this);
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
    releaseViewportBounds(this);
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

  async refreshContent({weaponIds = null} = {}) {
    const manager = this.element?.querySelector(".gam-ammo-manager");
    if (!manager) {
      await this.render({ force: true });
      return;
    }
    const list = manager.querySelector('.gam-weapon-list');
    const scrollTop = list?.scrollTop ?? 0;
    const template = document.createElement("template");
    if (weaponIds && this.buildWeaponCards) {
      if (!weaponIds.length) return;
      template.innerHTML = this.buildWeaponCards(this.managerState, weaponIds).trim();
      // A grouped UAW card can change its carrier identity when switching feeds.
      if (template.content.children.length !== weaponIds.length) return this.refreshContent();
      const current = new Map(Array.from(list.children).map(card=>[card.dataset.weaponCard,card]));
      for (const replacement of Array.from(template.content.children)) {
        const card = current.get(replacement.dataset.weaponCard);
        if (!card) return this.refreshContent();
        if (card.outerHTML !== replacement.outerHTML) card.replaceWith(replacement);
      }
      list.scrollTop = scrollTop;
      return;
    }
    template.innerHTML = this.buildContent(this.managerState, this.uiState).trim();
    const nextManager = template.content.firstElementChild;
    if (!(nextManager instanceof HTMLElement)) return;
    for (const selector of [".gam-toolbar", ".gam-weapon-list", "[data-ammo-result]"]) {
      const current = manager.querySelector(selector);
      const replacement = nextManager.querySelector(selector);
      if (current && replacement && current.outerHTML !== replacement.outerHTML) current.replaceWith(replacement);
    }
    manager.querySelector('.gam-weapon-list').scrollTop = scrollTop;
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
      const result = await this.handleAction({ action, weaponId, magazineIndex: button.dataset.magazineIndex, app: this });
      if (result?.managerState) this.setManagerState(result.managerState);
      if (result?.message) this.setResult(result.message);
      // The disabled state is transient, not part of the rendered card model.
      if (button.isConnected) button.disabled = false;
      if (result?.changed) await this.refreshContent({weaponIds:result.weaponIds ?? null});
    } catch (error) {
      if (button.isConnected) button.disabled = false;
      console.error("GURPS Ammo Manager:", error);
      ui.notifications.error(moduleMessage(error));
    }
  }
}
