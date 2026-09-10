const FLAG_SCOPE = "world";
const FLAG_KEY = "gurpsAmmoManager";
const STATE_VERSION = 8;

const clone = value => foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
const randomId = () => foundry?.utils?.randomID?.(16) ?? crypto.randomUUID();
const parseNumber = (value, fallback = 0) => {
  const text = String(value ?? "").trim().replace(",", ".");
  if (text === "") return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
};
const clampInteger = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Math.min(maximum, Math.max(minimum, Math.trunc(parseNumber(value, minimum))));

export class AmmoService {
  constructor(actor) {
    this.actor = actor;
  }

  sumMagazines(weapon) {
    return weapon.magazines.reduce((sum, rounds) => sum + rounds, 0);
  }

  looseAmmo(weapon) {
    return Math.max(0, weapon.totalAmmo - this.sumMagazines(weapon));
  }

  defaultChatSettings() {
    return {
      mode: "self",
      events: { fire: true, spend: false, reload: false, topUp: false, unload: false, stock: false },
      fireFields: {
        ammoType: true,
        shots: true,
        hits: true,
        loadedMagazine: true,
        totalAmmo: true
      }
    };
  }

  normalizeChatSettings(raw) {
    const defaults = this.defaultChatSettings();
    const settings = raw && typeof raw === "object" ? clone(raw) : {};
    settings.mode = settings.mode === "all" ? "all" : defaults.mode;
    settings.events = settings.events && typeof settings.events === "object" ? settings.events : {};
    settings.fireFields =
      settings.fireFields && typeof settings.fireFields === "object" ? settings.fireFields : {};
    for (const key of Object.keys(defaults.events)) {
      if (typeof settings.events[key] !== "boolean") settings.events[key] = defaults.events[key];
    }
    for (const key of Object.keys(defaults.fireFields)) {
      if (typeof settings.fireFields[key] !== "boolean") {
        settings.fireFields[key] = defaults.fireFields[key];
      }
    }
    return settings;
  }

  defaultState() {
    return { version: STATE_VERSION, chatSettings: this.defaultChatSettings(), weapons: [] };
  }

  normalizeWeaponShape(weapon) {
    weapon.id ||= randomId();
    weapon.name = String(weapon.name ?? "Оружие");
    weapon.attackRef ||= {};
    weapon.ammoType =
      String(weapon.ammoType ?? weapon.ammoRef?.name ?? "Патроны").trim() || "Патроны";
    weapon.capacity = clampInteger(weapon.capacity, 1, 100000);
    weapon.magazines = Array.isArray(weapon.magazines)
      ? weapon.magazines.map(value => clampInteger(value, 0, weapon.capacity))
      : [0];
    if (weapon.magazines.length === 0) weapon.magazines.push(0);
    weapon.loadedIndex = clampInteger(weapon.loadedIndex, 0, weapon.magazines.length - 1);
    const allocated = this.sumMagazines(weapon);
    const storedTotal = parseNumber(weapon.totalAmmo, Number.NaN);
    weapon.totalAmmo = Number.isFinite(storedTotal) ? clampInteger(storedTotal, 0) : allocated;
    delete weapon.ammoRef;
    return weapon;
  }

  async loadState() {
    const saved = this.actor.getFlag(FLAG_SCOPE, FLAG_KEY);
    const state = saved && typeof saved === "object" ? clone(saved) : this.defaultState();
    state.version = STATE_VERSION;
    state.chatSettings = this.normalizeChatSettings(state.chatSettings);
    delete state.chatReports;
    state.weapons = Array.isArray(state.weapons) ? state.weapons : [];
    state.weapons.forEach(weapon => this.normalizeWeaponShape(weapon));
    return state;
  }

  async saveState(state) {
    await this.actor.setFlag(FLAG_SCOPE, FLAG_KEY, state);
  }

  repairWeaponAmmo(weapon) {
    let deficit = Math.max(0, this.sumMagazines(weapon) - weapon.totalAmmo);
    let removed = 0;
    if (deficit <= 0) return removed;
    for (let index = weapon.magazines.length - 1; index >= 0 && deficit > 0; index--) {
      if (index === weapon.loadedIndex) continue;
      const amount = Math.min(deficit, weapon.magazines[index]);
      weapon.magazines[index] -= amount;
      deficit -= amount;
      removed += amount;
    }
    if (deficit > 0) {
      const index = weapon.loadedIndex;
      const amount = Math.min(deficit, weapon.magazines[index]);
      weapon.magazines[index] -= amount;
      removed += amount;
    }
    return removed;
  }

  async repairState(state, showWarning = true) {
    const repaired = [];
    let changed = false;
    for (const weapon of state.weapons) {
      this.normalizeWeaponShape(weapon);
      const removed = this.repairWeaponAmmo(weapon);
      if (removed > 0) {
        changed = true;
        repaired.push(`${weapon.name}: -${removed}`);
      }
    }
    if (changed) {
      await this.saveState(state);
      if (showWarning) {
        ui.notifications.warn(
          "Общий боезапас был меньше суммы патронов в магазинах. " +
          `Магазины скорректированы: ${repaired.join(", ")}.`
        );
      }
    }
    return changed;
  }
}
