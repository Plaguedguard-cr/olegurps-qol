function collectAds(tree, seen = new Set()) {
  if (!tree || typeof tree !== "object" || seen.has(tree)) return [];
  seen.add(tree);
  return Object.values(tree).flatMap(entry => entry && typeof entry === "object"
    ? [entry, ...collectAds(entry.contains, seen), ...collectAds(entry.collapsed, seen)] : []);
}

export function hasWeaponBondPerk(actor) {
  return collectAds(actor?.system?.ads).some(entry =>
    /^Weapon Bond(?:\s*\([^()]*\))?$/iu.test(String(entry?.name ?? "").trim()));
}

export function isWeaponBondActive(actor, setting) {
  return setting === true && hasWeaponBondPerk(actor);
}

export function weaponBondCheckbox({ available, checked, name = "weaponBond" } = {}) {
  return `<label class="gam-config-checkbox" style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="${name}" style="width:auto;flex:0 0 auto;margin:0" ${available && checked ? "checked" : ""} ${available ? "" : "disabled"}><span>Weapon Bond${available ? "" : ' <i class="fa-solid fa-lock" aria-label="Locked" title="Weapon Bond perk required"></i>'}</span></label>`;
}
