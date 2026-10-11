import { isArchivedAmmoType } from "./ammo-inventory.js";
import { HT_12G_CASE_CONSTRUCTIONS } from "../ht-shotshell-source-data.js";
import { variantAbbreviation } from "./ammunition-recipes.js";
import { isMultishotVariant, MULTISHOT_LABELS } from "./multishot-ammunition.js";
import { automaticAmmoText } from "./automatic-ammunition-localization.js";

export const ammoManagementLabels = {
  en: {
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
    Scope: "Loose stock belongs to this weapon, matching the existing ammunition manager."
  },
  ru: {
    ConstructionUnconfirmed: "конструкция не подтверждена для этого патрона и оружия (undetermined)",
    ConstructionIncompatible: "конструкция несовместима с этим оружием (incompatible)",
    Base: "базовый", Cartridge: "патрон", AmmoFamily: "семейство",
    LightCased12G: '12G 2.75" — облегчённая гильза', ConventionalCased12G: '12G 2.75" — обычная гильза',
    Title: "Снарядить / Разрядить", Ammo: "Тип боеприпаса", Loose: "Свободный запас", Quantity: "Количество",
    Add: "Добавить", Remove: "Убрать", Magazines: "Магазины", Total: "Всего", Magazine: "Магазин",
    Capacity: "Ёмкость", Installed: "В оружии", Empty: "Пустой", NoMagazine: "Магазинов нет",
    Load: "Снарядить", Unload: "Разрядить", UnloadAll: "Разрядить весь", Install: "Установить в оружие", Eject: "Извлечь из оружия",
    AddMagazines: "Добавить магазины", MagazineCount: "Количество магазинов", Delete: "Удалить магазин",
    DeleteHint: "Оставшиеся патроны возвращаются в свободный запас перед удалением.",
    Legacy: "сохранённый тип; совместимость не проверена", NoAmmo: "Нет подтверждённого базового боеприпаса",
    Review: "Требуется проверка: исходные данные боезапаса сохранены; операции с ресурсами недоступны.",
    InvalidQuantity: "Введите корректное целое количество.", InsufficientStock: "Недостаточно свободных патронов этого типа.",
    CapacityExceeded: "Количество превышает свободную ёмкость магазина.", MixedTypes: "Разрядите магазин перед сменой типа патронов.",
    InsufficientRounds: "В магазине нет такого количества патронов.", MagazineMissing: "Выбранный магазин больше недоступен.",
    MagazineNotInstalled: "Выбранный магазин не установлен.", TypeUnavailable: "Этот тип патронов недоступен для снаряжения.",
    MagazineLimit: "За раз можно добавить до 100 магазинов, всего до 1000; максимальная ёмкость — 100000.",
    WeaponMissing: "Это оружие больше недоступно.", Permission: "Требуются права владельца персонажа или GM.",
    UnknownOperation: "Неизвестная операция с патронами.", Changed: "Боезапас обновлён.", Stored: "Сохранённый тип (требуется проверка)",
    Scope: "Свободный запас относится к этому оружию, как в существующем менеджере патронов."
  }
};

export function ammoText(name, runtime = globalThis) {
  const key = "OleGURPS.Ammo." + name;
  const i18n = runtime.game?.i18n, translated = i18n?.localize?.(key);
  if (translated && translated !== key) return translated;
  const language = String(i18n?.lang ?? "en").startsWith("ru") ? "ru" : "en";
  return ammoManagementLabels[language][name] ?? ammoManagementLabels.en[name] ?? name;
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
