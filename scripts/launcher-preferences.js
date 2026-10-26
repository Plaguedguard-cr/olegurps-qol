export const LAUNCHER_MODULE = 'olegurps-qol';
export const LAUNCHER_POSITIONS = Object.freeze(['bucket', 'hotbar-left', 'hotbar-right', 'controls', 'custom']);
export const LAUNCHER_SETTINGS = Object.freeze({ visible: 'launcherVisible', position: 'launcherPosition', custom: 'launcherCoordinates', size: 'launcherSize' });
export const LAUNCHER_SIZE = Object.freeze({ min: 28, max: 72, step: 4, default: 40 });

export function normalizeLauncherSize(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return LAUNCHER_SIZE.default;
  const clamped = Math.min(LAUNCHER_SIZE.max, Math.max(LAUNCHER_SIZE.min, value));
  return LAUNCHER_SIZE.min + Math.round((clamped - LAUNCHER_SIZE.min) / LAUNCHER_SIZE.step) * LAUNCHER_SIZE.step;
}

export function normalizeLauncherPreferences(value = {}) {
  const custom = value.custom;
  return {
    visible: value.visible !== false,
    size: normalizeLauncherSize(value.size),
    position: LAUNCHER_POSITIONS.includes(value.position) ? value.position : 'bucket',
    custom: custom && Number.isFinite(custom.x) && Number.isFinite(custom.y)
      ? { x: Math.max(0, custom.x), y: Math.max(0, custom.y) } : null
  };
}

export function readLauncherPreferences(runtime = globalThis) {
  return normalizeLauncherPreferences(Object.fromEntries(Object.entries(LAUNCHER_SETTINGS)
    .map(([key, setting]) => [key, runtime.game.settings.get(LAUNCHER_MODULE, setting)])));
}

let writes = Promise.resolve();
export function saveLauncherPreferences(changes, runtime = globalThis) {
  const userId = runtime.game.user.id;
  const next = writes.catch(() => {}).then(async () => {
    if (runtime.game.user.id !== userId) throw new Error('Launcher user changed');
    const value = normalizeLauncherPreferences({ ...readLauncherPreferences(runtime), ...changes });
    for (const key of Object.keys(LAUNCHER_SETTINGS)) {
      if (!Object.hasOwn(changes, key)) continue;
      await runtime.game.settings.set(LAUNCHER_MODULE, LAUNCHER_SETTINGS[key], value[key]);
    }
    return readLauncherPreferences(runtime);
  });
  writes = next;
  return next;
}

export function resetLauncherPosition(runtime = globalThis) {
  return saveLauncherPreferences({ custom: null, position: 'bucket' }, runtime);
}
