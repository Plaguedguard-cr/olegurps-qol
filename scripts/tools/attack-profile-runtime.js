import { AttackProfileResolver, createShotSnapshot } from "./attack-profile-resolver.js";
import { AmmoService } from "./ammo-service.js";
import { readAmmunitionApproval } from "./ammunition-approval-service.js";
import { automaticAmmoPolicy, automaticAmmoText } from "./automatic-ammunition-localization.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";

export const newAttackId = () => globalThis.crypto.randomUUID();
const translationLoads = new Map();

// Foundry can retain an older server-side module manifest with no languages registered.
// Load only this feature's new keys; never translate existing UI text or change the language setting.
export async function loadAttackProfileTranslations(runtime = globalThis) {
  if (!runtime.location || !runtime.fetch || !runtime.game?.i18n) return;
  const language = String(runtime.game.i18n.lang ?? "ru").startsWith("ru") ? "ru" : "en";
  const key = "OleGURPS.AttackProfile.IncompatibleAmmunition";
  if (runtime.game.i18n.localize(key) !== key) return;
  if (!translationLoads.has(language)) translationLoads.set(language, (async () => {
    const response = await runtime.fetch("/modules/olegurps-qol/lang/" + language + ".json");
    if (!response.ok) throw new Error("AttackProfileTranslationsUnavailable");
    return response.json();
  })());
  try {
    const translations = await translationLoads.get(language);
    for (const [name, value] of Object.entries(translations)) if (name.startsWith("OleGURPS.AttackProfile."))
      runtime.foundry.utils.setProperty(runtime.game.i18n.translations, name, value);
  }
  catch (error) { translationLoads.delete(language); throw error; }
}

export function resolveRuntimeAttackProfile({ actor, attack, weaponId = null, state = null,
  ammunition = undefined, context = {}, runtime = globalThis }) {
  const api = runtime.OleGURPSQOL;
  state ??= actor?.getFlag?.("world", "gurpsAmmoManager") ?? {};
  const matches = (state.weapons ?? []).filter(weapon =>
    attack?.standaloneRef?.combatType === "ranged" ?
      weapon.standaloneWeaponId === attack.standaloneRef.weaponId && weapon.standaloneModeId === attack.standaloneRef.modeId :
      attack?.uuid ? weapon.attackRef?.uuid === attack.uuid : attack?.path && weapon.attackRef?.path === attack.path);
  weaponId ??= matches.length === 1 ? matches[0].id : null;
  if (ammunition === undefined) ammunition = weaponId ? new AmmoService(actor).readAttackAmmunition(weaponId) : null;
  const rawAttack = attack?.standaloneRef?.combatType === "ranged" ?
    readStandaloneAttack(actor, attack.standaloneRef.weaponId, attack.standaloneRef.modeId)?.data :
    attack?.path?.split(".").reduce((value, key) => value?.[key], actor) ?? attack?.data ?? attack;
  let binding = standaloneCatalogBinding(attack, api?.catalogs);
  if (attack?.path && api?.weaponCatalogBindings) {
    try { binding = api.weaponCatalogBindings.analyzeMode(actor, attack.path); }
    catch { binding = { status: "undetermined" }; }
  }
  return new AttackProfileResolver({ catalogs: api?.catalogs, compatibility: api?.ammunitionCompatibility })
    .resolve({ actorId: actor?.id ?? null, weaponId, attack, rawAttack, state, binding, ammunition, context,
      profilePolicy: automaticAmmoPolicy(runtime),
      approval: ammunition?.type ? readAmmunitionApproval({ actorId: actor.id, weaponId,
        modeId: binding?.binding?.modeId, type: ammunition.type }, runtime) : null });
}

export function pendingShotSnapshot(profile, attackId, { resourceTiming = "external", resourceReceiptId = null } = {}) {
  return createShotSnapshot(profile, { attackId, spent: 0, resourceTiming, resourceReceiptId });
}

export function attackProfileError(code, runtime = globalThis) {
  if (["IncompleteAmmunitionProfile", "ProjectileRclRequired"].includes(code)) return automaticAmmoText(code, runtime.game?.i18n?.lang);
  if (code === "IncompleteExplosiveRecipe") return explosiveText("IncompleteShot", runtime);
  const key = "OleGURPS.AttackProfile." + code;
  const localized = runtime.game?.i18n?.localize?.(key);
  return localized && localized !== key ? localized : code;
}

/** Preview overlays only: resolve again from Actor.system, never from an already adjusted data clone. */
export function withRuntimeAmmoStats(attack, actor, state) {
  const cleanAttack = { ...attack };
  delete cleanAttack.ammunitionFuzeTracer;
  try {
    const profile = resolveRuntimeAttackProfile({ actor, attack, state });
    if (profile.damage.nativeSafe) {
      const changes = profile.damage.effectiveChanges ?? {};
      return { ...cleanAttack, ammunitionProjectileKind: profile.effective.ammunitionProjectileKind ?? null,
        ...(profile.damage.rules.projectiles ? { ammunitionB409Eligible: profile.damage.rules.projectiles.b409Eligible } : {}),
        ...(profile.environmentCapability ? { ammunitionEnvironment: profile.environmentCapability } : {}),
        ammunitionConditions: [...profile.damage.support?.manual ?? [], ...profile.context?.barrel?.manual ?? []],
        ...(profile.damage.rules.fuzeTracer ? { ammunitionFuzeTracer: {
          definition: profile.ammunition.recipe.autoProfile.definition, mechanics: profile.damage.rules.fuzeTracer.mechanics } } : {}),
        ...(changes.acc !== undefined ? {
        acc: profile.damage.effectiveChanges.acc, scopeBonus: profile.damage.effectiveChanges.scopeBonus } : {}),
        ...(changes.rof !== undefined ? { rof: changes.rof } : {}),
        ...(changes.rcl !== undefined ? { rcl: changes.rcl } : {}),
        ...(changes.st !== undefined ? { st: changes.st } : {}),
        ...(profile.damage.rules.requiredStrength ? { ammunitionRequiredStrength: profile.damage.rules.requiredStrength } : {}),
        data: { ...attack.data, ...changes } };
    }
  } catch { /* Inventory review remains owned by the normal AmmoService flow. */ }
  return Object.hasOwn(attack ?? {}, "ammunitionFuzeTracer") ? cleanAttack : attack;
}
