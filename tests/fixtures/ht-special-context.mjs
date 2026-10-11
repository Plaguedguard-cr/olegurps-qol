import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../../scripts/ammunition-compatibility-service.js";
import { AutomaticAmmunitionProfileService } from "../../scripts/tools/automatic-ammunition-profiles.js";
import { AttackProfileResolver } from "../../scripts/tools/attack-profile-resolver.js";
import { applyInventoryOperation, projectAmmoInventory } from "../../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../../scripts/tools/ammo-service.js";
globalThis.foundry = { utils: { deepClone: structuredClone }, applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { user: { id: "gm", isGM: true }, i18n: { lang: "ru", localize: key => key }, settings: { get: () => "permissive" } };
export const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([book, d]) => [book,
  JSON.parse(await fs.readFile(new URL("../../data/catalogs/" + d.filename, import.meta.url), "utf8"))])));
export const catalogs = new CatalogService({ logger: null, fetcher: async u => ({ ok: true,
  json: async () => data[Object.keys(CATALOG_DEFINITIONS).find(b => u.endsWith(CATALOG_DEFINITIONS[b].filename))] }) });
await catalogs.load();
export const compatibility = new AmmunitionCompatibilityService(catalogs);
export const automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
export const resolver = new AttackProfileResolver({ catalogs, compatibility, automaticProfiles: automatic });
export const modes = { aw: "Wxm8TWSvu5UFTAaDn", ak: "W27s4Lm8QlkKVKUPn", glock: "W1doZcasYO-1Xw3Lf", mp5: "Ww9qXLufPV8uXb5rB", mp7: "W1miyD-ozfViISq7K" };
export function context(modeId) {
  const m = catalogs.getMode(modeId), a = catalogs.getAmmoItem("ht", m.ht_ammo_item_ids[0]);
  return { raw: { name: catalogs.getEquipmentForMode(modeId).name, damage: m.raw_calc.damage, acc: m.stats.accuracy,
    range: m.stats.range, rof: m.stats.rate_of_fire, rcl: m.stats.recoil, st: m.stats.strength },
    binding: { status: "confirmed", binding: { confirmed: true, modeId } },
    base: { source: "catalog", book: "ht", kind: "ammo-item", ammoId: a.id, name: a.name } };
}
export function profile(modeId, variantId, extra = {}) {
  const c = context(modeId), p = automatic.prepare({ modeId, base: c.base, variantId });
  const type = p.type ?? { ...c.base, recipe: { version: 1, variantId } };
  return resolver.resolve({ actorId: "actor", weaponId: "weapon", rawAttack: c.raw, binding: c.binding,
    ammunition: { type, ammoKey: type.key }, profilePolicy: "permissive", ...extra });
}
export const api = { catalogs, ammunitionCompatibility: compatibility, automaticAmmunitionProfiles: automatic,
  weaponCatalogBindings: { analyzeMode: actor => actor.binding } };
export function inventoryFixture(modeId, variantId) {
  const c = context(modeId), type = automatic.prepare({ modeId, base: c.base, variantId }).type;
  let state = { weapons: [{ id: "weapon", attackRef: { path: "system.ranged.mode" },
    ammunitionInventory: { version: 1, stocks: [], magazines: [], installedId: null } }] };
  const weapon = state.weapons[0];
  applyInventoryOperation(weapon, "add-stock", { ammoKey: type.key, amount: 10 }, { allowedTypes: [type] });
  let index = 0;
  applyInventoryOperation(weapon, "add-magazines", { capacity: 5, amount: 2 }, { makeId: () => "m" + (++index) });
  applyInventoryOperation(weapon, "load", { magazineId: "m1", ammoKey: type.key, amount: 4 }, { allowedTypes: [type] });
  applyInventoryOperation(weapon, "install", { magazineId: "m1" }); projectAmmoInventory(weapon);
  const actor = { id: "actor", isOwner: true, system: { ranged: { mode: c.raw } }, binding: c.binding,
    getFlag: (scope, key) => scope === "world" && key === "gurpsAmmoManager" ? state : undefined,
    setFlag: async (scope, key, value) => { if (scope === "world" && key === "gurpsAmmoManager") state = structuredClone(value); } };
  const service = new AmmoService(actor);
  return { actor, service, type, state: () => state, prepare: ({ ammunition }) => ({
    profile: resolver.resolve({ actorId: actor.id, weaponId: "weapon", rawAttack: c.raw, binding: c.binding, ammunition }), amount: 1 }) };
}
