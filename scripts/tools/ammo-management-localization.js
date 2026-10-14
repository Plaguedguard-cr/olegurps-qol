import { russianUI } from "../russian-ui.js";
import { isArchivedAmmoType } from "./ammo-inventory.js";
import { HT_12G_CASE_CONSTRUCTIONS } from "../ht-shotshell-source-data.js";
import { variantAbbreviation } from "./ammunition-recipes.js";
import { isMultishotVariant, MULTISHOT_LABELS } from "./multishot-ammunition.js";
import { automaticAmmoText } from "./automatic-ammunition-localization.js";

export const ammoManagementLabels = {
  en: {
    SealedResourceQuantity: "Use a complete factory unit: five shots for P11, one for a disposable tube. The selected slot capacity must match.",
    SealedResourceSpent: "This cluster or tube has been used. Select a new empty slot and install a fresh factory unit from stock.",
    SealedResourcePartial: "A partly used factory cluster cannot be dismantled or topped up. Keep its remaining shots; delete the empty cluster after the last shot.",
    SealedResourceReview: "Saved unit data needs review: P11 capacity must be five, disposable tube capacity one. Remaining ammunition is preserved.",
    SealedClusterHint: "P11: add stock in five-shot clusters. Install a whole cluster in a capacity-five slot. Used clusters cannot be topped up (HT92).",
    DisposableTubeHint: "One stock unit is a new loaded tube or complete disposable weapon. Use a capacity-one slot; a spent slot cannot be loaded again.",
    HTIdentityUnverified: "The exact cartridge for this weapon version is unconfirmed. Attack cancelled; stock preserved. Check the model and chamber with the GM.",
    UnknownCaliber: "Caliber not confirmed",
    ConstructionUnconfirmed: "construction not confirmed for this cartridge/platform (undetermined)",
    ConstructionIncompatible: "construction incompatible with this platform (incompatible)",
    Base: "base", Cartridge: "cartridge", AmmoFamily: "family",
    LightCased12G: '12G 2.75" — Light Cased', ConventionalCased12G: '12G 2.75" — Conventional Cased',
    Title: "Load / Unload", Ammo: "Ammunition type", Loose: "Loose stock", Quantity: "Quantity",
    Add: "Add", Remove: "Remove", Magazines: "Magazines", Total: "Total", Magazine: "Magazine",
    Capacity: "Capacity", Installed: "In weapon", Empty: "Empty", NoMagazine: "No magazines",
    Load: "Load", Unload: "Unload", UnloadAll: "Unload all", Install: "Install in weapon", Eject: "Eject from weapon",
    AddMagazines: "Add magazines", MagazineCount: "Number of magazines", Delete: "Delete magazine",
    DeleteHint: "Any remaining rounds are returned to loose stock before deletion.",
    Legacy: "saved type; compatibility not verified", NoAmmo: "No confirmed base ammunition",
    Review: "Review required: original ammunition data retained; resource operations are disabled.",
    InvalidQuantity: "Enter a valid whole quantity.", InsufficientStock: "Not enough loose ammunition of this type.",
    CapacityExceeded: "The quantity exceeds the magazine's free capacity.", MixedTypes: "Unload the magazine before changing its ammunition type.",
    InsufficientRounds: "The magazine does not contain that many rounds.", MagazineMissing: "The selected magazine is no longer available.",
    MagazineNotInstalled: "The selected magazine is not installed.", TypeUnavailable: "This ammunition type is unavailable for loading.",
    MagazineLimit: "Add at most 100 magazines at once, up to 1000 total; maximum capacity is 100000.",
    WeaponMissing: "This weapon is no longer available.", Permission: "Actor ownership or GM permission is required.",
    UnknownOperation: "Unknown ammunition operation.", Changed: "Ammunition updated.", Stored: "Saved type (review required)",
    Scope: "Loose stock belongs to this weapon, matching the existing ammunition manager.",
    Loading: "Loading…", Unloading: "Unloading…", Saving: "Saving…"
  },
  ru: Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.Ammo.")).map(([key, value]) => [key.slice(14), value]))
};

import { moduleText } from "../localization.js";
export function ammoText(name, runtime = globalThis) {
  if(/[\u0400-\u04ff]/u.test(String(name)))return String(name);
  const key = "OleGURPS.Ammo." + name;
  return moduleText(key, {}, ammoManagementLabels.ru[name] ?? "Не удалось выполнить операцию. Проверьте сохранённый боезапас и повторите попытку.");
}

// This window has its own language; it does not change the world's language setting.
export const ammoWindowText = (name, language = "ru") => ammoText(name, { game: { i18n: { lang: language } } });

// Unsupported saved identities remain in the ledger, without offering their old labels for new loading.
export function ammoDisplayName(type, language = globalThis.game?.i18n?.lang ?? "en") {
  if (isArchivedAmmoType(type)) return ammoWindowText("Stored", language);
  const reviewed = type?.source === "catalog" && type.book === "ht" && type.kind === "ammo-item" && HT_12G_CASE_CONSTRUCTIONS[type.ammoId];
  const id=type?.recipe?.variantId, multishot=isMultishotVariant(id);
  if (!reviewed) return multishot ? String(type.name ?? "").replace(new RegExp(MULTISHOT_LABELS[id]+"$"),automaticAmmoText("P3"+id,language)) : type?.name;
  const suffix = type.recipe ? multishot ? automaticAmmoText("P3"+id,language) : variantAbbreviation(id) : null;
  if (type.recipe && !suffix) return type.name;
  return ammoWindowText(reviewed.caseConstruction === "light_cased" ? "LightCased12G" : "ConventionalCased12G", language) + (suffix ? " " + suffix : "");
}
