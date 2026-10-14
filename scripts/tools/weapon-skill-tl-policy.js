export const WEAPON_SKILL_TL_FLAG = "ignoreWeaponSkillTLDifferences";
const scope = "olegurps-qol";

// Read the rolling user's preference once. Historical results use the copy in their shotSnapshot.
export function readWeaponSkillTLPolicy(user = globalThis.game?.user) {
  return { version: 1, userId: user?.id ?? null,
    ignoreWeaponSkillTLDifferences: user?.getFlag?.(scope, WEAPON_SKILL_TL_FLAG) === true };
}

export async function saveWeaponSkillTLPreference(enabled, runtime = globalThis) {
  const user = runtime.game?.user;
  if (!user?.setFlag) throw new Error("UserUnavailable");
  await user.setFlag(scope, WEAPON_SKILL_TL_FLAG, enabled === true);
}

// Kept for API compatibility: Russian resources are synchronously bundled.
export async function loadWeaponSkillTLTranslations() {}
