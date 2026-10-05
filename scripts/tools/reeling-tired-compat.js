const MODULE_ID = "olegurps-qol";
const SETTING_KEY = "fix-reeling-tired";
const ACTOR_MARKER = Symbol.for("olegurps-qol.reeling-tired-actor");
const EFFECT_MARKER = Symbol.for("olegurps-qol.reeling-tired-effect");

function enabled() {
  return game.settings.get(MODULE_ID, SETTING_KEY);
}

function activeStatus(effect, statusId) {
  if (effect.disabled || effect.isSuppressed || effect.active === false) return false;
  return effect.statuses?.has?.(statusId)
    || Array.from(effect.statuses ?? []).includes(statusId)
    || effect.getFlag?.("core", "statusId") === statusId;
}

function hasStatus(actor, statusId) {
  return Array.from(actor.appliedEffects ?? actor.effects ?? [])
    .some(effect => activeStatus(effect, statusId));
}

function belowOneThird(resource) {
  const value = Number(resource?.value);
  const maximum = Number(resource?.max);
  return Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0
    && value < maximum / 3;
}

export function getEffectiveReelingTiredState(actor) {
  const reelingStatus = hasStatus(actor, "reeling");
  const tiredStatus = hasStatus(actor, "exhausted");
  return {
    reeling: belowOneThird(actor.system?.HP) || reelingStatus,
    tired: belowOneThird(actor.system?.FP) || tiredStatus,
    tiredStatus
  };
}

function hasExhaustedStChange(actor) {
  return Array.from(actor.appliedEffects ?? actor.effects ?? []).some(effect =>
    activeStatus(effect, "exhausted") && Array.from(effect.changes ?? []).some(change =>
      change.key === "system.attributes.ST.import"
      && change.type === "multiply" && Number(change.value) === 0.5));
}

function restoreExhaustedStImport(actor) {
  if (!hasExhaustedStChange(actor)) return;
  // A preexisting GGA effect may already have applied its ST.import multiplier.
  // The Foundry v14 change handler is intercepted below; this also covers
  // actors prepared before installation or by a different effect path.
  const source = Number(actor._source?.system?.attributes?.ST?.import);
  const prepared = Number(actor.system?.attributes?.ST?.import);
  if (Number.isFinite(source) && Number.isFinite(prepared)
    && [source * 0.5, Math.floor(source * 0.5), Math.ceil(source * 0.5)].includes(prepared)) {
    actor.system.attributes.ST.import = source;
  }
}

function refreshActors() {
  if (game.system?.id !== "gurps") return;
  const actors = new Set(game.actors?.contents ?? []);
  for (const token of globalThis.canvas?.tokens?.placeables ?? []) {
    if (token.actor) actors.add(token.actor);
  }
  for (const actor of actors) {
    actor.prepareData();
    actor.render?.();
  }
}

export function registerReelingTiredSetting() {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "\u0418\u0441\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c Reeling \u0438 Tired",
    hint: "\u041a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442 \u044d\u0444\u0444\u0435\u043a\u0442\u044b \u043d\u0438\u0437\u043a\u0438\u0445 HP \u0438 FP \u043a Move, Dodge \u0438 ST, \u0432\u043a\u043b\u044e\u0447\u0430\u044f \u0448\u0442\u0430\u0442\u043d\u044b\u0435 \u044d\u0444\u0444\u0435\u043a\u0442\u044b Reeling \u0438 Tired GGA.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: refreshActors
  });
}

export function installReelingTiredCompatibility() {
  if (game.system?.id !== "gurps") return;

  const ActorClass = CONFIG.Actor.documentClass;
  const actorPrototype = ActorClass?.prototype;
  if (!actorPrototype || typeof actorPrototype.calculateDerivedValues !== "function") {
    throw new Error("GGA calculateDerivedValues is unavailable");
  }

  if (!actorPrototype[ACTOR_MARKER]) {
    const original = actorPrototype.calculateDerivedValues;
    actorPrototype.calculateDerivedValues = function (...args) {
      if (!enabled()) return original.apply(this, args);

      const state = getEffectiveReelingTiredState(this);
      this.system.conditions.reeling = state.reeling;
      this.system.conditions.exhausted = state.tired;
      if (state.tiredStatus) restoreExhaustedStImport(this);

      // GGA computes every encumbrance row, current Move and Dodge here.
      const result = original.apply(this, args);
      if (state.tired) {
        const strength = Number(this.system.attributes?.ST?.value);
        if (Number.isFinite(strength)) this.system.attributes.ST.value = Math.ceil(strength / 2);
      }
      return result;
    };
    Object.defineProperty(actorPrototype, ACTOR_MARKER, { value: true });
  }

  const EffectClass = CONFIG.ActiveEffect.documentClass;
  if (typeof EffectClass?.applyChange === "function" && !EffectClass[EFFECT_MARKER]) {
    const original = EffectClass.applyChange;
    EffectClass.applyChange = function (targetDoc, change, options) {
      // Keep GGA's exhausted status and all other changes. Its ST.import
      // multiplier would affect Basic Lift and damage during data preparation.
      if (enabled() && targetDoc instanceof ActorClass
        && change?.key === "system.attributes.ST.import"
        && change.type === "multiply" && Number(change.value) === 0.5
        && change.effect && activeStatus(change.effect, "exhausted")) {
        return {};
      }
      return original.call(this, targetDoc, change, options);
    };
    Object.defineProperty(EffectClass, EFFECT_MARKER, { value: true });
  }

  if (enabled()) refreshActors();
}
