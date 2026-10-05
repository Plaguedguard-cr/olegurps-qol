const MODULE_ID = "olegurps-qol";

export function buildAimStatusEffects() {
  return [1, 2, 3].map(bonus => ({
    id: `${MODULE_ID}-aim-${bonus}`,
    name: `Aim +${bonus}`,
    img: `modules/${MODULE_ID}/assets/status-effects/Aim${bonus}.png`,
    order: 1,
    changes: []
  }));
}

export function getAimStatusSeconds(actor) {
  let seconds = 0;
  for (const effect of actor?.effects ?? []) {
    if (effect.disabled) continue;
    for (const status of effect.statuses ?? []) {
      const match = /^olegurps-qol-aim-([123])$/.exec(status);
      if (match) seconds = Math.max(seconds, Number(match[1]));
    }
  }
  return seconds;
}
