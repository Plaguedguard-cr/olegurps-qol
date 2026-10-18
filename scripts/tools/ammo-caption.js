import { installedMagazine } from "./ammo-inventory.js";
import { ammoDisplayName } from "./ammo-management-localization.js";
import { StandaloneWeaponService } from "./standalone-weapon-service.js";
import { moduleText } from "../localization.js";
import { executionAmmoCaption } from './weapon-profile-presentation.js';

/** Saved display identity only; historical names do not grant admission. */
export function inventoryAmmoName(type) {
  return String(type?.name && !['catalog', 'legacy'].includes(type.source)
    ? type.name : ammoDisplayName(type, 'ru') ?? '').trim() || 'Неизвестное прежнее название';
}

/** Read the one existing ledger, grouping by physical identity AND recipe key. */
export function ammoStockRows(weapon) {
  const inventory = weapon.ammunitionInventory;
  if (!inventory || weapon.ammunitionReview) return [];
  const rows = new Map(inventory.stocks.map(stock => [stock.key,
    { key: stock.key, name: inventoryAmmoName(stock.type), loose: stock.rounds, loaded: 0 }]));
  for (const magazine of inventory.magazines) {
    if (!magazine.rounds) continue;
    if (!rows.has(magazine.ammoKey)) rows.set(magazine.ammoKey,
      { key: magazine.ammoKey, name: 'Неизвестное прежнее название', loose: 0, loaded: 0 });
    rows.get(magazine.ammoKey).loaded += magazine.rounds;
  }
  return [...rows.values()].filter(row => row.loose || row.loaded)
    .map(row => ({ ...row, total: row.loose + row.loaded }));
}

export function renderAmmunitionSummary(actor, weapon, escapeHTML, presentation = null) {
  const inventory = weapon.ammunitionInventory, magazine = installedMagazine(weapon);
  if (inventory && (!magazine?.rounds || !magazine.ammoKey))
    return `<div class="gam-ammo-stock-row">${escapeHTML(moduleText('OleGURPS.Ammo.NoSelectedType'))}</div>`;
  const rows = ammoStockRows(weapon);
  if (!rows.length) return `<div class="gam-ammo-stock-row"><strong>${escapeHTML(executionAmmoCaption(ammoCaption(actor, weapon),presentation))}</strong> — всего ${weapon.totalAmmo}, свободно ${Math.max(0, weapon.totalAmmo - weapon.magazines.reduce((n, rounds) => n + rounds, 0))}</div>`;
  return rows.filter(row => row.key === magazine?.ammoKey).map(row => `<div class="gam-ammo-stock-row" data-ammo-stock-key="${escapeHTML(row.key)}"><strong>${escapeHTML(executionAmmoCaption(row.name,presentation))}</strong> — всего ${row.total}, в магазинах ${row.loaded}, свободно ${row.loose}</div>`).join('');
}

/** Display only: exact saved identity first; never parse a weapon name for a caliber. */
export function ammoCaption(actor, weapon, catalogs = globalThis.OleGURPSQOL?.catalogs) {
  const installed = installedMagazine(weapon);
  const selectedType = installed?.rounds && weapon.ammunitionInventory?.stocks.find(s => s.key === installed.ammoKey)?.type;
  if (selectedType) return inventoryAmmoName(selectedType);
  if (!weapon.standaloneWeaponId) return String(weapon.ammoType ?? "").trim() || moduleText("OleGURPS.Ammo.UnknownCaliber");
  const record = new StandaloneWeaponService(actor).get(weapon.standaloneWeaponId);
  const mode = record?.modes.find(m => m.modeId === weapon.standaloneModeId)?.snapshot;
  const inventory = weapon.ammunitionInventory;
  const type = inventory?.stocks.find(s => s.key === installed?.ammoKey)?.type ?? weapon.ammunitionBinding;
  if ((type?.source === "catalog" || type?.confirmed === true) && catalogs?.getAmmoItem?.(type.book, type.ammoId))
    return type.source === "catalog" ? ammoDisplayName(type) : catalogs.getAmmoItem(type.book, type.ammoId).name;
  if (mode?.ht_ammo_resolution?.status === "exact_chambering" && mode.ht_ammo_item_ids?.length === 1) {
    const ammo = catalogs?.getAmmoItem?.("ht", mode.ht_ammo_item_ids[0]);
    if (ammo?.name) return ammo.name;
  }
  const caliber = String(mode?.caliber_hint ?? record?.equipmentSnapshot?.caliber ?? "").trim();
  return caliber || moduleText("OleGURPS.Ammo.UnknownCaliber");
}
