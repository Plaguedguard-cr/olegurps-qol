// Resource accounting only. Catalog compatibility and ballistic rules belong to their existing services.
export const AMMO_INVENTORY_VERSION = 1;
const copy = value => structuredClone(value);
const id = () => globalThis.crypto.randomUUID();
export const isArchivedAmmoType = type => !!type && !["catalog", "legacy"].includes(type.source);
export const ammoTypeKey = binding => binding.source && binding.source !== "catalog" ? binding.key :
  [binding.book, binding.kind, encodeURIComponent(binding.ammoId)].join(":") +
    (binding.recipe ? ":recipe-v1:" + encodeURIComponent(binding.recipe.variantId) +
      (binding.recipe.customId ? ":custom:" + encodeURIComponent(binding.recipe.customId) : "") : "");
export const whole = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
export const inventoryTotal = inventory => inventory.stocks.reduce((sum, entry) => sum + entry.rounds, 0) +
  inventory.magazines.reduce((sum, entry) => sum + entry.rounds, 0);
export const installedMagazine = weapon => weapon.ammunitionInventory?.magazines.find(entry =>
  entry.id === weapon.ammunitionInventory.installedId) ?? null;

export function validateInventory(inventory, weaponId) {
  if (inventory?.version !== AMMO_INVENTORY_VERSION || !Array.isArray(inventory.stocks) ||
      !Array.isArray(inventory.magazines)) return false;
  const types = new Set();
  for (const stock of inventory.stocks) {
    if (!stock.key || types.has(stock.key) || !whole(stock.rounds) || !stock.type ||
        stock.type.key !== stock.key) return false;
    types.add(stock.key);
  }
  const ids = new Set();
  for (const magazine of inventory.magazines) {
    if (!magazine.id || ids.has(magazine.id) || magazine.weaponId !== weaponId ||
        !whole(magazine.capacity, 1) || !whole(magazine.rounds) || magazine.rounds > magazine.capacity ||
        magazine.rounds && !types.has(magazine.ammoKey)) return false;
    ids.add(magazine.id);
  }
  return (inventory.installedId === null || ids.has(inventory.installedId)) && whole(inventoryTotal(inventory));
}

/** Preserve v9's per-weapon ownership: total includes magazines, loose = total - their sum. */
export function migrateAmmoInventory(weapon, makeId = id) {
  if (weapon.ammunitionInventory) return { changed: false, valid: validateInventory(weapon.ammunitionInventory, weapon.id) };
  if (weapon.ammunitionReview) return { changed: false, valid: false };
  const magazines = weapon.magazines;
  const empty = weapon.ammoUnconfigured === true && Array.isArray(magazines) && magazines.length === 0;
  const valid = Array.isArray(magazines) && magazines.every(rounds => whole(rounds) && rounds <= weapon.capacity) &&
    (empty ? weapon.capacity === 0 && weapon.loadedIndex === -1 :
      whole(weapon.capacity, 1) && magazines.length > 0 && whole(weapon.loadedIndex) && weapon.loadedIndex < magazines.length) &&
    whole(weapon.totalAmmo) && weapon.totalAmmo >= magazines.reduce((sum, rounds) => sum + rounds, 0);
  if (!valid) {
    weapon.ammunitionReview = { reason: "LEGACY_AMMO_INVALID", original: copy({
      ammoType: weapon.ammoType, ammoUnconfigured: weapon.ammoUnconfigured,
      totalAmmo: weapon.totalAmmo, capacity: weapon.capacity, magazines: weapon.magazines, loadedIndex: weapon.loadedIndex }) };
    return { changed: true, valid: false };
  }
  const key = "legacy:" + weapon.id;
  const type = { key, source: "legacy", name: String(weapon.ammoType ?? "") };
  const allocated = magazines.reduce((sum, rounds) => sum + rounds, 0);
  weapon.ammunitionInventory = { version: AMMO_INVENTORY_VERSION,
    stocks: weapon.totalAmmo || !empty ? [{ key, type, rounds: weapon.totalAmmo - allocated }] : [],
    magazines: magazines.map(rounds => ({ id: makeId(), weaponId: weapon.id,
      capacity: weapon.capacity, rounds, ammoKey: rounds ? key : null })), installedId: null };
  if (weapon.loadedIndex >= 0) weapon.ammunitionInventory.installedId = weapon.ammunitionInventory.magazines[weapon.loadedIndex].id;
  return { changed: true, valid: true };
}

/** A read-only projection for existing RoF, shot limits and reports. Never a second ledger. */
export function projectAmmoInventory(weapon) {
  const inventory = weapon.ammunitionInventory;
  if (!validateInventory(inventory, weapon.id)) return false;
  const loaded = installedMagazine(weapon);
  weapon.magazines = inventory.magazines.map(entry => entry.rounds);
  weapon.loadedIndex = loaded ? inventory.magazines.indexOf(loaded) : -1;
  weapon.capacity = loaded?.capacity ?? 0;
  weapon.totalAmmo = inventoryTotal(inventory);
  weapon.ammoUnconfigured = inventory.magazines.length === 0;
  return true;
}

export function magazineFill(rounds, capacity) {
  const ratio = capacity > 0 ? Math.max(0, Math.min(1, rounds / capacity)) : 0;
  return { ratio, percent: ratio * 100, hue: ratio * 120 };
}

export function applyInventoryOperation(weapon, operation, args = {}, { allowedTypes = [], makeId = id } = {}) {
  if (!validateInventory(weapon.ammunitionInventory, weapon.id)) throw new Error("Review");
  const inventory = copy(weapon.ammunitionInventory);
  const fail = key => { throw new Error(key); };
  const count = (value, minimum = 1) => whole(value, minimum) ? value : fail("InvalidQuantity");
  const magazine = () => inventory.magazines.find(entry => entry.id === args.magazineId) ?? fail("MagazineMissing");
  const stockFor = key => inventory.stocks.find(entry => entry.key === key) ?? fail("TypeUnavailable");
  const available = key => {
    if (isArchivedAmmoType(inventory.stocks.find(entry => entry.key === key)?.type)) fail("TypeUnavailable");
    return allowedTypes.find(entry => entry.key === key && !entry.unavailable && !isArchivedAmmoType(entry)) ?? fail("TypeUnavailable");
  };
  const stock = key => {
    const type = available(key);
    let entry = inventory.stocks.find(entry => entry.key === key);
    if (!entry) { entry = { key, type: copy(type), rounds: 0 }; inventory.stocks.push(entry); }
    return entry;
  };
  if (operation === "save-recipe") {
    if (!args.type?.recipe?.customId || args.type.key !== ammoTypeKey(args.type) || inventory.stocks.some(s => s.key === args.type.key)) fail("InvalidRecipe");
    inventory.stocks.push({ key: args.type.key, type: copy(args.type), rounds: 0 });
  } else if (operation === "add-stock") stock(args.ammoKey).rounds += count(args.amount);
  else if (operation === "remove-stock") {
    const entry = stockFor(args.ammoKey), amount = count(args.amount);
    if (amount > entry.rounds) fail("InsufficientStock");
    entry.rounds -= amount;
  } else if (operation === "add-magazines") {
    const capacity = count(args.capacity), amount = count(args.amount);
    if (amount > 100 || capacity > 100000 || inventory.magazines.length + amount > 1000) fail("MagazineLimit");
    for (let index = 0; index < amount; index++) inventory.magazines.push({ id: makeId(), weaponId: weapon.id,
      capacity, rounds: 0, ammoKey: null });
  } else if (operation === "load") {
    const entry = magazine(), amount = count(args.amount);
    available(args.ammoKey);
    if (entry.rounds && entry.ammoKey !== args.ammoKey) fail("MixedTypes");
    const source = stockFor(args.ammoKey);
    if (source.rounds < amount) fail("InsufficientStock");
    if (entry.capacity - entry.rounds < amount) fail("CapacityExceeded");
    source.rounds -= amount; entry.rounds += amount; entry.ammoKey = args.ammoKey;
  } else if (operation === "unload" || operation === "delete-magazine") {
    const entry = magazine(), amount = operation === "delete-magazine" ? entry.rounds : count(args.amount);
    if (amount > entry.rounds) fail("InsufficientRounds");
    if (amount) stockFor(entry.ammoKey).rounds += amount;
    entry.rounds -= amount;
    if (!entry.rounds) entry.ammoKey = null;
    if (operation === "delete-magazine") {
      inventory.magazines = inventory.magazines.filter(other => other.id !== entry.id);
      if (inventory.installedId === entry.id) inventory.installedId = null;
    }
  } else if (operation === "install") inventory.installedId = magazine().id;
  else if (operation === "eject") {
    if (inventory.installedId !== magazine().id) fail("MagazineNotInstalled");
    inventory.installedId = null;
  } else if (operation === "consume") {
    const entry = magazine(), amount = count(args.amount);
    if (inventory.installedId !== entry.id) fail("MagazineNotInstalled");
    if (entry.rounds < amount) fail("InsufficientRounds");
    entry.rounds -= amount;
    if (!entry.rounds) entry.ammoKey = null;
  } else fail("UnknownOperation");
  if (!validateInventory(inventory, weapon.id)) fail("InvalidQuantity");
  weapon.ammunitionInventory = inventory;
  projectAmmoInventory(weapon);
  return inventory;
}
