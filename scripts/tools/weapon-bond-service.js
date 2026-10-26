import { weaponText } from './weapon-localization.js';

function collectAds(tree, seen = new Set()) {
  if (!tree || typeof tree !== "object" || seen.has(tree)) return [];
  seen.add(tree);
  return Object.values(tree).flatMap(entry => entry && typeof entry === "object"
    ? [entry, ...collectAds(entry.contains, seen), ...collectAds(entry.collapsed, seen)] : []);
}

export function hasWeaponBondPerk(actor) {
  return collectAds(actor?.system?.ads).some(entry =>
    [entry?.originalName,entry?.name].some(name=>/^Weapon Bond(?:\s*\([^()]*\))?$/iu.test(String(name ?? "").trim())));
}

export function isWeaponBondActive(actor, setting, ownerConfirmedPerk=false) {
  return setting === true && (hasWeaponBondPerk(actor)||ownerConfirmedPerk===true);
}

export function weaponBondCheckbox({ available, checked, name = "weaponBond", manualAllowed=false } = {}) {
  const enabled=available||manualAllowed;
  return `<label class="gam-config-checkbox" style="display:flex;align-items:center;gap:8px" ${manualAllowed&&!available?'title="Перк не найден автоматически. Флажок подтверждает наличие требуемого Weapon Bond у персонажа для этого оружия."':''}><input type="checkbox" name="${name}" style="width:auto;flex:0 0 auto;margin:0" ${enabled && checked ? "checked" : ""} ${enabled ? "" : "disabled"}><span>Weapon Bond${enabled ? "" : ` <i class="fa-solid fa-lock" aria-label="${weaponText('BondRequired')}" title="${weaponText('BondRequired')}"></i>`}</span></label>`;
}
