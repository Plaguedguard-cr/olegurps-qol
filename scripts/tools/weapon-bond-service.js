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

export function isWeaponBondActive(_actor, setting) {
  return setting === true;
}

export function weaponBondCheckbox({ checked, name = "weaponBond" } = {}) {
  return `<label class="gam-config-checkbox" style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="${name}" style="width:auto;flex:0 0 auto;margin:0" ${checked ? "checked" : ""}><span>Weapon Bond</span></label>`;
}
