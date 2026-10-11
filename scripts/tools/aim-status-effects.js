const MODULE_ID = "olegurps-qol";

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
