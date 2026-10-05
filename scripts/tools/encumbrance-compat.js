const MODULE_ID = "olegurps-qol";
const FLAG_KEY = "manualEncumbrance";
const SETTING_KEY = "automatic-encumbrance";
const ACTOR_MARKER = Symbol.for("olegurps-qol.encumbrance-actor");
const SHEET_MARKER = Symbol.for("olegurps-qol.encumbrance-sheet");
const calculatedKeys = new WeakMap();
const CALCULATED_TITLE = "\u0420\u0430\u0441\u0447\u0451\u0442\u043d\u0430\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0435\u043c\u0443 \u0432\u0435\u0441\u0443";

function automatic() {
  return game.settings.get("gurps", SETTING_KEY) === true;
}

function currentKey(encumbrance) {
  return Object.keys(encumbrance ?? {}).find(key => !!encumbrance[key]?.current);
}

function manualKey(actor) {
  return actor.getFlag?.(MODULE_ID, FLAG_KEY);
}

export function calculatedEncumbranceKey(actor) {
  return calculatedKeys.get(actor) ?? currentKey(actor.system?.encumbrance);
}

function applyManualLevel(actor) {
  const nativeRows = actor.system?.encumbrance;
  const realKey = currentKey(nativeRows);
  if (realKey) calculatedKeys.set(actor, realKey);
  const chosen = manualKey(actor);
  if (!chosen || !nativeRows?.[chosen]) return;
  // GGA's prepared encumbrance rows can share references with Actor._source.
  // Keep the manual arrow in prepared data; only our flag is persistent.
  const rows = foundry.utils.deepClone(nativeRows);
  actor.system.encumbrance = rows;
  for (const [key, row] of Object.entries(rows)) row.current = key === chosen;
  const row = rows[chosen];
  actor.system.currentmove = row.currentmove;
  actor.system.currentdodge = row.currentdodge;
  actor.system.currentsprint = row.currentsprint;
}

function bindSheet(sheet, html) {
  if (!automatic() || !sheet.actor?.isOwner) return;
  const rows = html.find("#encumbrance .enc[data-key], .ms-encumbrance-table .ms-enc-row[data-key]");
  if (!rows.length) return;
  const actor = sheet.actor;
  const realKey = calculatedEncumbranceKey(actor);
  const selected = manualKey(actor);
  rows.each((_index, element) => {
    element.classList.add("olegurps-enc-clickable");
    if (element.classList.contains("ms-enc-row")) element.classList.add("ms-clickable");
    else element.classList.add("clickable");
    if (selected && selected !== realKey && element.dataset.key === realKey) {
      element.classList.add("olegurps-enc-calculated");
      element.title = CALCULATED_TITLE;
    }
  });
  rows.on("click.olegurps-enc", async event => {
    if (!automatic()) return;
    if (event.target.closest("[data-otf], button, a, input, select, textarea, [role=button]")) return;
    const key = event.currentTarget.dataset.key;
    if (!actor.system.encumbrance?.[key]) return;
    event.preventDefault();
    event.stopPropagation();
    const actual = calculatedEncumbranceKey(actor);
    const old = manualKey(actor);
    if (key === actual) {
      if (!old) return;
      await actor.unsetFlag(MODULE_ID, FLAG_KEY);
    } else {
      if (key === old) return;
      await actor.setFlag(MODULE_ID, FLAG_KEY, key);
    }
    actor.prepareData();
    sheet.render(false);
  });
}

function refreshActors() {
  const actors = new Set(game.actors?.contents ?? []);
  for (const token of canvas?.tokens?.placeables ?? []) {
    if (token.actor) actors.add(token.actor);
  }
  for (const actor of actors) actor.prepareData();
  for (const app of Object.values(ui.windows ?? {})) {
    if (app.actor && app.actor.system?.encumbrance) app.render(false);
  }
}

export function installEncumbranceCompatibility() {
  if (game.system?.id !== "gurps") return;
  const actorPrototype = CONFIG.Actor.documentClass?.prototype;
  if (typeof actorPrototype?.calculateDerivedValues !== "function") {
    throw new Error("GGA calculateDerivedValues is unavailable");
  }
  if (!actorPrototype[ACTOR_MARKER]) {
    const original = actorPrototype.calculateDerivedValues;
    actorPrototype.calculateDerivedValues = function (...args) {
      const auto = automatic();
      if (!auto && manualKey(this) && this._source.system?.encumbrance) {
        this.system.encumbrance = foundry.utils.deepClone(this._source.system.encumbrance);
      }
      const result = original.apply(this, args);
      if (auto) applyManualLevel(this);
      return result;
    };
    Object.defineProperty(actorPrototype, ACTOR_MARKER, { value: true });
  }

  const SheetClass = CONFIG.Actor.sheetClasses?.character?.["gurps.GurpsActorSheet"]?.cls;
  const sheetPrototype = SheetClass?.prototype;
  if (typeof sheetPrototype?.activateListeners !== "function") {
    throw new Error("GGA ActorSheet.activateListeners is unavailable");
  }
  if (!sheetPrototype[SHEET_MARKER]) {
    const original = sheetPrototype.activateListeners;
    sheetPrototype.activateListeners = function (html) {
      original.call(this, html);
      bindSheet(this, html);
    };
    Object.defineProperty(sheetPrototype, SHEET_MARKER, { value: true });
    Hooks.on("canvasReady", refreshActors);
    Hooks.on("updateSetting", setting => {
      if (setting.key === `gurps.${SETTING_KEY}`) {
        globalThis.setTimeout(refreshActors, 0);
      }
    });
  }
  refreshActors();
}
