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

export async function loadWeaponSkillTLTranslations(runtime = globalThis) {
  const i18n = runtime.game?.i18n, prefix = "OleGURPS.WeaponSkillTL.";
  if (!runtime.fetch || !runtime.location || !i18n || i18n.localize(prefix + "Label") !== prefix + "Label") return;
  const language = String(i18n.lang).startsWith("ru") ? "ru" : "en";
  const response = await runtime.fetch("/modules/olegurps-qol/lang/" + language + ".json");
  if (!response.ok) throw new Error("WeaponSkillTLTranslationsUnavailable");
  for (const [key, value] of Object.entries(await response.json())) if (key.startsWith(prefix))
    runtime.foundry.utils.setProperty(i18n.translations, key, value);
}
