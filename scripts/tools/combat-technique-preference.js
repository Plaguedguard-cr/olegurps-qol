const scope = 'olegurps-qol';
export const CINEMATIC_DEFAULTS_FLAG = 'allowCinematicTechniqueDefaults';

export function allowsCinematicTechniqueDefaults(user = globalThis.game?.user) {
  return user?.getFlag?.(scope, CINEMATIC_DEFAULTS_FLAG) !== false;
}

export async function saveCinematicTechniqueDefaults(enabled, user = globalThis.game?.user) {
  if (!user?.setFlag) throw Error('Текущий пользователь недоступен.');
  await user.setFlag(scope, CINEMATIC_DEFAULTS_FLAG, enabled === true);
}
