import { HT_CONFIRMED_SHOTSHELL_MODE_PROJECTILES } from "../ht-shotshell-source-data.js";
// Projectile identity comes from a confirmed cartridge/mode link, never a weapon label or distance.
export function shotgunProjectileKind({ record, mode, identity, construction, nativeSafe } = {}) {
  if (!nativeSafe || identity?.status !== "confirmed" || identity.book !== "ht" ||
      !["shotgun_shell", "separate_powder_and_shot"].includes(record?.ammunition_class) || !record.weapon_mode_ids?.includes(mode?.weapon_mode_id)) return null;
  if (identity.recipe?.variantId === "ht_rifled_slug")
    return ["compatible", "user-defined", "gm-approved"].includes(construction?.status) || ["user-defined","gm-approved"].includes(construction?.authority) ? "slug" : null;
  // A source-backed explicit single-projectile load takes precedence over the native shot baseline.
  if (record.projectile_kind === "slug") return "slug";
  if (!identity.recipe || identity.recipe.variantId === "ht_plus_p") {
    const reviewed = HT_CONFIRMED_SHOTSHELL_MODE_PROJECTILES[mode.weapon_mode_id];
    if (reviewed) return reviewed.kind;
  }
  if ((!identity.recipe || identity.recipe.variantId === "ht_plus_p") &&
      /^\d+\s*[xX\u00d7*]\s*\d+$/u.test(mode.stats?.rate_of_fire ?? "")) return "shot";
  return null;
}
