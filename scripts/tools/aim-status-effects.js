const MODULE_ID = "olegurps-qol";
export const EVALUATE_AUTOFILL_SETTING = "evaluate-status-autofill";

const TYPES = {
  aim: { label: "Aim", icon: "Aim" },
  evaluate: { label: "Evaluate", icon: "Evaluate" }
};

function buildPreparationStatusEffects(type) {
  const { label, icon } = TYPES[type];
  return [1, 2, 3].map(bonus => ({
    id: `${MODULE_ID}-${type}-${bonus}`,
    name: `${label} +${bonus}`,
    img: `modules/${MODULE_ID}/assets/status-effects/${icon}${bonus}.png`,
    order: 1,
    changes: []
  }));
}

export function buildAimStatusEffects() {
  return buildPreparationStatusEffects("aim");
}

export function buildEvaluateStatusEffects() {
  return buildPreparationStatusEffects("evaluate");
}

function getPreparationStatusValue(actor, type) {
  let value = 0;
  const prefix = `${MODULE_ID}-${type}-`;
  for (const effect of actor?.effects ?? []) {
    if (effect.disabled) continue;
    for (const status of effect.statuses ?? []) {
      if (!status.startsWith(prefix)) continue;
      const bonus = status.slice(prefix.length);
      if (/^[123]$/.test(bonus)) value = Math.max(value, Number(bonus));
    }
  }
  return value;
}

export function getAimStatusSeconds(actor) {
  return getPreparationStatusValue(actor, "aim");
}

export function getEvaluateStatusTurns(actor) {
  return getPreparationStatusValue(actor, "evaluate");
}

export function isEvaluateStatusAutofillEnabled() {
  return game.settings.get(MODULE_ID, EVALUATE_AUTOFILL_SETTING) === true;
}

export function registerEvaluateStatusSetting() {
  game.settings.register(MODULE_ID, EVALUATE_AUTOFILL_SETTING, {
    name: "\u0410\u0432\u0442\u043e\u043f\u043e\u0434\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 \u041e\u0446\u0435\u043d\u043a\u0438 \u0438\u0437 \u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432",
    hint: "\u041f\u043e\u0434\u0441\u0442\u0430\u0432\u043b\u044f\u0442\u044c \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u041e\u0446\u0435\u043d\u043a\u0438 \u0432 Melee Assistant \u0438\u0437 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432 Evaluate. \u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u043c\u043e\u0436\u043d\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
}
