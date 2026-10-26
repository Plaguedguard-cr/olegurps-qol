import { moduleText } from './localization.js';

// Only module-owned entrypoints. Never discover or evaluate World Macro commands.
const macro = (id, macroId, image, section, tokenRequired = false) => Object.freeze({
  id, macroId, labelKey: `OleGURPS.Macro.${macroId}`,
  image: `modules/olegurps-qol/assets/${image}.png`, section, tokenRequired,
  handler: id, method: 'open', gmOnly: false
});

export const LAUNCHER_ACTIONS = Object.freeze([
  macro('ammo', 'OQshooting000001', 'shooting-assistant', 'Combat', true),
  macro('fireControl', 'OQfirecontrol001', 'fire-control', 'Combat'),
  macro('melee', 'OQMeleeAssist001', 'melee-assistant', 'Combat', true),
  macro('damage', 'OQDamageMacro001', 'damage', 'Combat'),
  macro('explosion', 'OQexplosion00001', 'explosion-and-fragmentation', 'Combat'),
  macro('fright', 'OQfright00000001', 'fright-check', 'Checks'),
  macro('reaction', 'OQreaction000001', 'reaction-roll', 'Checks'),
  macro('critical', 'OQcritical000001', 'critical-table', 'Checks'),
  macro('luck', 'OQLuckMacro00001', 'luck', 'Checks'),
  macro('falling', 'OQfalling0000001', 'falling', 'Tools')
]);

export function launcherActions() {
  return [...LAUNCHER_ACTIONS];
}

export async function runLauncherAction(id, runtime = globalThis) {
  const action = LAUNCHER_ACTIONS.find(entry => entry.id === id);
  if (!action) {
    throw new Error(moduleText('OleGURPS.Launcher.Unavailable'));
  }
  const target = runtime.game.olegurpsQOL?.[action.handler];
  if (typeof target?.[action.method] !== 'function') {
    throw new Error(moduleText('OleGURPS.Launcher.Unavailable'));
  }
  // No token selection, ownership override, rolls, or resource writes here.
  return target[action.method]();
}
