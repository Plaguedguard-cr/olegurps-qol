import { getStatusEffectVisibility, getManagedStatusEffects, applyStatusEffectVisibility } from "./status-effect-visibility.js";
import { buildAimStatusEffects, buildEvaluateStatusEffects } from "./aim-status-effects.js";

const MODULE_ID = "olegurps-qol";
const TAGGED_MODIFIERS_SETTING = "use-tagged-modifiers";
let iconHookRegistered = false;

const DEFENSES = [
  { id: "dodge", label: "Dodge", setting: "allDODGERolls" },
  { id: "block", label: "Block", setting: "allBlockRolls" },
  { id: "parry", label: "Parry", setting: "allParryRolls" }
];

function firstTag(value) {
  return String(value ?? "").split(",").map(tag => tag.trim().replace(/^#/, "").toLowerCase())
    .find(tag => /^[^\s#@,]+$/.test(tag));
}

export function buildDefenseStatusEffects(taggedSettings) {
  return DEFENSES.flatMap(({ id, label, setting }) => {
    const tag = firstTag(taggedSettings?.[setting]);
    if (!tag) throw new Error(`GGA setting ${setting} has no usable defense tag`);
    return [1, 2, 3].map(bonus => ({
      id: `${MODULE_ID}-${id}-${bonus}`,
      name: `${label} +${bonus}`,
      img: `modules/${MODULE_ID}/assets/status-effects/${id}${bonus}.png`,
      order: 1,
      changes: [{
        key: "system.conditions.self.modifiers",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: `+${bonus} ${label} #${tag} @combatmod`
      }]
    }));
  });
}

function extendEffectPicker(EffectPicker) {
  const marker = Symbol.for("olegurps-qol.status-effect-picker");
  if (EffectPicker.prototype[marker]) return;
  const originalGetData = EffectPicker.prototype.getData;
  EffectPicker.prototype.getData = function (...args) {
    const data = originalGetData.apply(this, args);
    const activeIds = new Set(this.actor.effects
      .filter(effect => !effect.disabled)
      .flatMap(effect => Array.from(effect.statuses ?? [])));
    const managed = getManagedStatusEffects();
    const managedIds = new Set(managed.map(effect => effect.id));
    const visibility = getStatusEffectVisibility();
    const dead = CONFIG.statusEffects.find(effect => effect.id === "dead");
    const effects = [
      ...(dead && !activeIds.has("dead") ? [{ ...dead, localizedName: "Dead" }] : []),
      ...managed
        .filter(effect => visibility[effect.id] !== false && !activeIds.has(effect.id))
        .map(effect => ({ ...effect, localizedName: game.i18n.localize(effect.name) }))
    ];
    const categories = data.categories.map(category => ({
      ...category,
      effects: category.effects.filter(effect => !managedIds.has(effect.id))
    })).filter(category => category.effects.length);
    if (effects.length) categories.unshift({
      key: "olegurps-qol", label: "OleGURPS QOL", effects, hasEffects: true
    });
    return { ...data, categories };
  };
  Object.defineProperty(EffectPicker.prototype, marker, { value: true });
}

export async function registerCustomStatusEffects() {
  if (game.system.id !== "gurps") return;

  // GGA replaces CONFIG.statusEffects during init and lists explicit IDs in its picker.
  const { default: EffectPicker } = await import("/systems/gurps/module/actor/effect-picker.js");
  const settings = game.settings.get("gurps", TAGGED_MODIFIERS_SETTING);
  const effects = [...buildAimStatusEffects(), ...buildEvaluateStatusEffects(), ...buildDefenseStatusEffects(settings)];
  for (const effect of effects) {
    const existing = CONFIG.statusEffects.find(entry => entry.id === effect.id);
    if (!existing) CONFIG.statusEffects.push(effect);
    // Foundry's Actor#toggleStatusEffect also resolves by status ID as a property.
    Object.defineProperty(CONFIG.statusEffects, effect.id, {
      value: existing ?? effect, configurable: true, writable: true, enumerable: true
    });
  }
  applyStatusEffectVisibility();
  extendEffectPicker(EffectPicker);

  if (!iconHookRegistered) {
    Hooks.on("preCreateActiveEffect", (effect, data) => {
      const statusId = Array.from(data.statuses ?? [])
        .find(id => id === "dead" || id.startsWith(`${MODULE_ID}-`));
      const status = CONFIG.statusEffects.find(entry => entry.id === statusId);
      if (status) effect.updateSource({ img: status.img });
    });
    iconHookRegistered = true;
  }
}
