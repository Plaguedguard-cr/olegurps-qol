import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { migrateAmmoInventory, applyInventoryOperation, projectAmmoInventory, validateInventory,
  inventoryTotal, magazineFill } from "../scripts/tools/ammo-inventory.js";
import { ammoText, ammoManagementLabels, ammoWindowText, ammoDisplayName } from "../scripts/tools/ammo-management-localization.js";

let sequence = 0;
const makeId = () => "mag-" + ++sequence;
globalThis.foundry = { utils: { deepClone: structuredClone, randomID: makeId }, applications: { api: {
  ApplicationV2: class {
    constructor(options) { this.options = options; }
    _onRender() {}
    async close() { this.rendered = false; }
  }
} } };
globalThis.game = { user: { isGM: true }, i18n: { lang: "en", localize: key => key } };
globalThis.ui = { notifications: { error() {}, warn() {} } };
const subscriptions = new Map();
globalThis.Hooks = { on: (name, fn) => { const key = ++sequence; subscriptions.set(key, { name, fn }); return key; },
  off: (_name, key) => subscriptions.delete(key) };
const { AmmoManagementApp, ammoManagementHTML, availableAmmoTypes, displayedAmmoTypes } = await import("../scripts/tools/ammo-management-app.js");
const typeA = { key: "ht:ammo-item:a", source: "catalog", name: "A", book: "ht", kind: "ammo-item", ammoId: "a" };
const typeB = { key: "ht:ammo-item:b", source: "catalog", name: "B", book: "ht", kind: "ammo-item", ammoId: "b" };
const archived = { key: "olegurps-qol:test-cartridge:v1", source: "test", name: "Test Cartridge (Temporary)" };
const fresh = () => ({ id: "weapon", name: "Gun", attackRef: { path: "system.ranged.00000" }, ammoUnconfigured: true,
  ammoType: "saved label", totalAmmo: 0, capacity: 0, magazines: [], loadedIndex: -1 });
function inventory() { const weapon = fresh(); migrateAmmoInventory(weapon, makeId); return weapon; }
const operate = (weapon, operation, args) => applyInventoryOperation(weapon, operation, args,
  { makeId, allowedTypes: [typeA, typeB, ...(weapon.ammunitionInventory.stocks.map(stock => stock.type))] });
const addMagazines = (weapon, capacity, amount = 1) => {
  operate(weapon, "add-magazines", { capacity, amount }); return weapon.ammunitionInventory.magazines.at(-amount);
};
function archivedInventory() {
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  weapon.ammunitionInventory.testEnabled = true; // Historical property is retained, never consulted.
  weapon.ammunitionInventory.stocks.push({ key: archived.key, type: structuredClone(archived), rounds: 30 });
  Object.assign(magazine, { rounds: 20, ammoKey: archived.key });
  weapon.ammunitionInventory.installedId = magazine.id;
  projectAmmoInventory(weapon);
  return weapon;
}
function fixture(weapon = fresh()) {
  let state = { version: 9, weapons: [structuredClone(weapon)], attackOverrides: { keep: { skillLevel: 13, rof: "10", acc: 5, scopeBonus: 1, bulk: -6, rcl: "2" } }, governingSkills: {}, custom: { preserved: true } };
  const actor = { id: "actor", isOwner: true, system: { ranged: {}, skills: {}, equipment: { original: true } },
    getFlag: (scope,key) => scope==="world"&&key==="gurpsAmmoManager"?structuredClone(state):undefined, setFlag: async (_scope, _key, next) => { state = structuredClone(next); },
    update: async changes => { for (const key of Object.keys(changes)) {
      if (key.endsWith("-=sprayingFireSessions")) delete state.sprayingFireSessions;
    } }
  };
  return { actor, service: new AmmoService(actor), get state() { return structuredClone(state); } };
}

test("v9 migration preserves exact loose stock, counts, individual magazines and installed position", () => {
  const weapon = { ...fresh(), ammoUnconfigured: false, totalAmmo: 120, capacity: 30, magazines: [23, 30, 0], loadedIndex: 1,
    ammoType: "User's old type", custom: { untouched: true } };
  const result = migrateAmmoInventory(weapon, makeId);
  assert.equal(result.valid, true);
  assert.equal(weapon.ammunitionInventory.stocks[0].rounds, 67);
  assert.equal(weapon.ammunitionInventory.stocks[0].type.name, "User's old type");
  assert.equal(weapon.ammunitionInventory.stocks[0].type.source, "legacy");
  assert.equal(weapon.ammunitionInventory.installedId, weapon.ammunitionInventory.magazines[1].id);
  projectAmmoInventory(weapon);
  assert.deepEqual(weapon.magazines, [23, 30, 0]); assert.equal(weapon.totalAmmo, 120);
  assert.equal(weapon.ammoType, "User's old type"); assert.deepEqual(weapon.custom, { untouched: true });
});

test("migration is idempotent and reopening retains permanent IDs without extra resources", async () => {
  const fx = fixture({ ...fresh(), ammoUnconfigured: false, totalAmmo: 80, capacity: 30, magazines: [10, 30], loadedIndex: 0 });
  await fx.service.inventoryTransaction("weapon", "initialize");
  const before = fx.state;
  await new AmmoService(fx.actor).inventoryTransaction("weapon", "initialize");
  assert.deepEqual(fx.state, before);
});

test("new unconfigured weapon never acquires a fictional magazine or stock", () => {
  const weapon = inventory(); projectAmmoInventory(weapon);
  assert.deepEqual(weapon.ammunitionInventory.magazines, []);
  assert.deepEqual(weapon.ammunitionInventory.stocks, []);
  assert.equal(weapon.loadedIndex, -1); assert.equal(weapon.totalAmmo, 0);
});

test("ambiguous, fractional, excessive and inconsistent legacy data are preserved for review", async () => {
  for (const fields of [{ totalAmmo: 10, capacity: 30, magazines: [20], loadedIndex: 0 },
    { totalAmmo: 10.5, capacity: 30, magazines: [5], loadedIndex: 0 },
    { totalAmmo: 80, capacity: 30, magazines: [40], loadedIndex: 0 }]) {
    const fx = fixture({ ...fresh(), ammoUnconfigured: false, ...fields });
    const state = await fx.service.loadState();
    assert.ok(state.weapons[0].ammunitionReview);
    assert.equal(await fx.service.repairState(state), false);
    const next = await fx.service.inventoryTransaction("weapon", "initialize");
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(next.weapons[0][key], value);
    assert.equal(next.weapons[0].ammunitionInventory, undefined);
    await assert.rejects(fx.service.inventoryTransaction("weapon", "add-magazines", { capacity: 30, amount: 1 }), /Review/);
  }
});

test("bulk creation creates separate empty magazines with mixed capacities and stable ownership IDs", () => {
  const weapon = inventory(); addMagazines(weapon, 30, 2); addMagazines(weapon, 40, 3); addMagazines(weapon, 10);
  const entries = weapon.ammunitionInventory.magazines;
  assert.deepEqual(entries.map(entry => entry.capacity), [30, 30, 40, 40, 40, 10]);
  assert.equal(new Set(entries.map(entry => entry.id)).size, 6);
  assert.ok(entries.every(entry => entry.rounds === 0 && entry.ammoKey === null && entry.weaponId === weapon.id));
  assert.equal(inventoryTotal(weapon.ammunitionInventory), 0);
});

test("partial and full loads move only matching free stock without changing total", () => {
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 100 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 23 });
  assert.equal(weapon.ammunitionInventory.stocks[0].rounds, 77);
  assert.equal(weapon.ammunitionInventory.magazines[0].rounds, 23);
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 7 });
  assert.equal(weapon.ammunitionInventory.magazines[0].rounds, 30); assert.equal(weapon.totalAmmo, 100);
});

test("partial and full unloads return the same type and permit a new type only when empty", () => {
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  for (const type of [typeA, typeB]) operate(weapon, "add-stock", { ammoKey: type.key, amount: 50 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 20 });
  const before = structuredClone(weapon);
  assert.throws(() => operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeB.key, amount: 1 }), /MixedTypes/);
  assert.deepEqual(weapon, before);
  operate(weapon, "unload", { magazineId: magazine.id, amount: 7 });
  assert.equal(weapon.ammunitionInventory.magazines[0].rounds, 13);
  operate(weapon, "unload", { magazineId: magazine.id, amount: 13 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeB.key, amount: 30 });
  assert.equal(weapon.ammunitionInventory.magazines[0].ammoKey, typeB.key);
  assert.equal(weapon.totalAmmo, 100);
});

test("stock removal never takes rounds out of magazines and cannot exceed free stock", () => {
  const weapon = inventory(), magazine = addMagazines(weapon, 10);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 20 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 10 });
  const before = structuredClone(weapon);
  assert.throws(() => operate(weapon, "remove-stock", { ammoKey: typeA.key, amount: 11 }), /InsufficientStock/);
  assert.deepEqual(weapon, before);
  operate(weapon, "remove-stock", { ammoKey: typeA.key, amount: 6 });
  assert.equal(weapon.ammunitionInventory.magazines[0].rounds, 10); assert.equal(weapon.totalAmmo, 14);
});

test("all invalid quantities, capacity overflow and stock shortages leave the ledger unchanged", () => {
  const weapon = inventory(), magazine = addMagazines(weapon, 10);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 20 });
  for (const amount of [-1, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 11, 21]) {
    const before = structuredClone(weapon);
    assert.throws(() => operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount }));
    assert.deepEqual(weapon, before);
  }
});

test("install, replace and eject preserve all rounds and project the installed magazine's own capacity", () => {
  const weapon = inventory(), first = addMagazines(weapon, 10), second = addMagazines(weapon, 40);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 50 });
  operate(weapon, "load", { magazineId: first.id, ammoKey: typeA.key, amount: 10 });
  operate(weapon, "load", { magazineId: second.id, ammoKey: typeA.key, amount: 23 });
  operate(weapon, "install", { magazineId: first.id }); assert.equal(weapon.capacity, 10);
  operate(weapon, "install", { magazineId: second.id }); assert.equal(weapon.capacity, 40); assert.equal(weapon.loadedIndex, 1);
  assert.equal(weapon.totalAmmo, 50);
  operate(weapon, "eject", { magazineId: second.id }); assert.equal(weapon.loadedIndex, -1);
  assert.equal(weapon.ammunitionInventory.installedId, null);
  assert.equal(weapon.ammunitionInventory.selectionEjected, true);
  assert.equal(weapon.totalAmmo, 50); assert.deepEqual(weapon.magazines, [10, 23]);
});

test("deleting a filled or installed magazine returns contents without changing other IDs or total", () => {
  const weapon = inventory(), first = addMagazines(weapon, 10), second = addMagazines(weapon, 30);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 20 });
  operate(weapon, "load", { magazineId: first.id, ammoKey: typeA.key, amount: 8 });
  operate(weapon, "install", { magazineId: first.id });
  operate(weapon, "delete-magazine", { magazineId: first.id });
  assert.equal(weapon.ammunitionInventory.stocks[0].rounds, 20);
  assert.equal(weapon.ammunitionInventory.installedId, second.id);
  assert.equal(weapon.ammunitionInventory.magazines[0].id, second.id); assert.equal(weapon.totalAmmo, 20);
});

test("a sequence of stock, load, unload, replace, shoot and delete operations conserves rounds", () => {
  const weapon = inventory(), first = addMagazines(weapon, 30), second = addMagazines(weapon, 40);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 120 });
  operate(weapon, "add-stock", { ammoKey: typeB.key, amount: 50 });
  for (const [operation, args] of [["load", { magazineId: first.id, ammoKey: typeA.key, amount: 23 }],
    ["load", { magazineId: second.id, ammoKey: typeB.key, amount: 30 }], ["unload", { magazineId: first.id, amount: 6 }],
    ["install", { magazineId: first.id }], ["install", { magazineId: second.id }]]) {
    operate(weapon, operation, args); assert.equal(inventoryTotal(weapon.ammunitionInventory), 170);
  }
  operate(weapon, "consume", { magazineId: second.id, amount: 9 }); assert.equal(weapon.totalAmmo, 161);
  operate(weapon, "delete-magazine", { magazineId: second.id }); assert.equal(weapon.totalAmmo, 161);
  operate(weapon, "remove-stock", { ammoKey: typeA.key, amount: 10 }); assert.equal(weapon.totalAmmo, 151);
});

test("live service consumption decrements installed rounds once, retains stock and other magazines", async () => {
  const fx = fixture(); await fx.service.inventoryTransaction("weapon", "initialize");
  await fx.service.inventoryTransaction("weapon", "add-magazines", { capacity: 40, amount: 2 });
  await fx.service.inventoryTransaction("weapon", "add-stock", { ammoKey: typeA.key, amount: 90 }, { allowedTypes: [typeA] });
  const id = fx.state.weapons[0].ammunitionInventory.magazines[0].id;
  await fx.service.inventoryTransaction("weapon", "load", { magazineId: id, ammoKey: typeA.key, amount: 30 }, { allowedTypes: [typeA] });
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: id });
  const state = await fx.service.loadState();
  assert.equal(await fx.service.consumeLoadedRounds(state, state.weapons[0], 7), 7);
  assert.deepEqual(state.weapons[0].magazines, [23, 0]); assert.equal(state.weapons[0].totalAmmo, 83);
  assert.equal(state.weapons[0].ammunitionInventory.stocks[0].rounds, 60);
  assert.equal(await fx.service.consumeLoadedRounds(state, state.weapons[0], 24), false);
});

test("a Fire Control snapshot from before migration consumes the authoritative new inventory", async () => {
  const fx = fixture({ ...fresh(), ammoUnconfigured: false, capacity: 30, magazines: [23], loadedIndex: 0, totalAmmo: 143 });
  const beforeMigration = await fx.service.loadState();
  assert.equal(beforeMigration.weapons[0].ammunitionInventory, undefined);
  await fx.service.inventoryTransaction("weapon", "initialize");
  assert.equal(await fx.service.consumeLoadedRounds(beforeMigration, beforeMigration.weapons[0], 7), 7);
  assert.equal(fx.state.weapons[0].totalAmmo, 136);
  assert.equal(fx.state.weapons[0].ammunitionInventory.magazines[0].rounds, 16);
  assert.equal(fx.state.weapons[0].ammunitionInventory.stocks[0].rounds, 120);
});

test("serialized transactions reread latest stocks and reject concurrent overdraw without partial writes", async () => {
  const fx = fixture(); await fx.service.inventoryTransaction("weapon", "initialize");
  await fx.service.inventoryTransaction("weapon", "add-stock", { ammoKey: typeA.key, amount: 10 }, { allowedTypes: [typeA] });
  const outcomes = await Promise.allSettled([fx.service.inventoryTransaction("weapon", "remove-stock", { ammoKey: typeA.key, amount: 7 }),
    new AmmoService(fx.actor).inventoryTransaction("weapon", "remove-stock", { ammoKey: typeA.key, amount: 7 })]);
  assert.deepEqual(outcomes.map(entry => entry.status), ["fulfilled", "rejected"]);
  assert.equal(fx.state.weapons[0].totalAmmo, 3);
});

test("a failed persistence write leaves caller and saved inventory unchanged", async () => {
  const fx = fixture(); await fx.service.inventoryTransaction("weapon", "initialize");
  const before = fx.state;
  fx.actor.setFlag = async () => { throw new Error("storage unavailable"); };
  await assert.rejects(fx.service.inventoryTransaction("weapon", "add-magazines", { capacity: 30, amount: 2 }), /storage unavailable/);
  assert.deepEqual(fx.state, before);
});

test("stale configuration saves preserve the latest inventory, overrides, custom settings and GGA system", async () => {
  const fx = fixture(), system = structuredClone(fx.actor.system);
  await fx.service.inventoryTransaction("weapon", "initialize");
  const old = await fx.service.loadState();
  await fx.service.inventoryTransaction("weapon", "add-stock", { ammoKey: typeA.key, amount: 120 }, { allowedTypes: [typeA] });
  old.weapons[0].weaponBond = true;
  await fx.service.saveState(old);
  assert.equal(fx.state.weapons[0].totalAmmo, 120); assert.equal(fx.state.weapons[0].weaponBond, true);
  assert.deepEqual(fx.state.attackOverrides, old.attackOverrides); assert.deepEqual(fx.state.custom, { preserved: true });
  assert.deepEqual(fx.actor.system, system);
});

test("one dropdown and one detail panel keep 1, 10, 30 and 50 magazines compact", () => {
  for (const count of [1, 10, 30, 50]) {
    const weapon = inventory();
    if(count<=10)addMagazines(weapon,30,count);
    else { weapon.ammunitionInventory.magazines=Array.from({length:count},()=>({id:makeId(),weaponId:weapon.id,capacity:30,rounds:0,ammoKey:null}));weapon.ammunitionInventory.installedId=weapon.ammunitionInventory.magazines[0].id;projectAmmoInventory(weapon); }
    const html = ammoManagementHTML(weapon, { magazineId: weapon.ammunitionInventory.magazines[0].id }, []);
    assert.equal((html.match(/name="inventoryMagazine"/g) ?? []).length, 1);
    assert.equal((html.match(/data-magazine-detail/g) ?? []).length, 1);
    assert.equal((html.match(/<option value="mag-/g) ?? []).length, count);
    assert.doesNotMatch(html, /gam-card/);
  }
});

test("changing dropdown selection targets a stable ID and displays only that magazine", async () => {
  const fx = fixture(), app = new AmmoManagementApp({ actor: fx.actor, weaponId: "weapon" });
  app.element = { querySelector: () => null };
  let renders = 0; app.refreshMagazine = async () => { renders++; };
  await app._onChange({ target: { name: "inventoryMagazine", value: "stable-choice" } });
  assert.equal(app.ui.magazineId, "stable-choice"); assert.equal(renders, 1);
  const weapon = inventory(), first = addMagazines(weapon, 10), second = addMagazines(weapon, 40);
  operate(weapon, "install", { magazineId: first.id });
  const html = ammoManagementHTML(weapon, { magazineId: second.id }, []);
  assert.match(html, new RegExp('value="' + second.id + '" selected'));
  assert.match(html, /aria-valuemax="40"/); assert.match(html, /Магазин №2/);
});

test("fill bar uses continuous red-yellow-green hue and exact accessible counts", () => {
  for (const rounds of [0, 1, 6, 15, 23, 30]) {
    const fill = magazineFill(rounds, 30);
    assert.equal(fill.ratio, rounds / 30); assert.equal(fill.hue, rounds / 30 * 120);
  }
  assert.equal(magazineFill(15, 30).hue, 60); assert.equal(magazineFill(30, 30).hue, 120);
  assert.notEqual(magazineFill(14, 30).hue, magazineFill(15, 30).hue);
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  const html = ammoManagementHTML(weapon, { magazineId: magazine.id }, []);
  assert.match(html, /aria-valuenow="0"/); assert.match(html, /0\/30/); assert.match(html, /Пустой/);
});

test("retired saved ammunition cannot be created or loaded, even with old GM flags and caller options", async () => {
  for (const isGM of [true, false]) {
    globalThis.game.user.isGM = isGM;
    try {
      const fx = fixture(archivedInventory()), saved = fx.state.weapons[0];
      await fx.service.inventoryTransaction("weapon", "initialize");
      assert.deepEqual(fx.state.weapons[0], saved);
      const before = fx.state;
      const weapon = before.weapons[0], magazineId = weapon.ammunitionInventory.magazines[0].id;
      assert.ok(!availableAmmoTypes(fx.actor, weapon, null).some(type => type.key === archived.key));
      assert.ok(displayedAmmoTypes(fx.actor, weapon, null).find(type => type.key === archived.key).unavailable);
      await assert.rejects(fx.service.inventoryTransaction("weapon", "test-mode", { enabled: true }), /UnknownOperation/);
      for (const type of [archived, { ...typeA, key: archived.key }]) {
        const options = { allowedTypes: [type], testMode: true };
        await assert.rejects(fx.service.inventoryTransaction("weapon", "add-stock", { ammoKey: archived.key, amount: 1 }, options), /TypeUnavailable/);
        await assert.rejects(fx.service.inventoryTransaction("weapon", "load", { ammoKey: archived.key, magazineId, amount: 1 }, options), /TypeUnavailable/);
      }
      assert.deepEqual(fx.state, before);
      assert.throws(() => applyInventoryOperation(inventory(), "add-stock", { ammoKey: archived.key, amount: 1 },
        { allowedTypes: [archived], testMode: true }), /TypeUnavailable/);
    } finally { globalThis.game.user.isGM = true; }
  }
});

test("archived rounds unload and return on magazine deletion before explicit stock removal", async () => {
  for (const action of ["unload", "delete-magazine"]) {
    const fx = fixture(archivedInventory()), original = fx.state;
    const magazineId = original.weapons[0].ammunitionInventory.installedId;
    await fx.service.inventoryTransaction("weapon", action, { magazineId, amount: 20 });
    const weapon = fx.state.weapons[0];
    assert.equal(weapon.totalAmmo, 50);
    assert.equal(weapon.ammunitionInventory.stocks[0].rounds, 50);
    assert.deepEqual(weapon.ammunitionInventory.stocks[0].type, archived);
    assert.equal(weapon.ammunitionInventory.testEnabled, true);
    if (action === "delete-magazine") {
      assert.equal(weapon.ammunitionInventory.installedId, null);
      assert.deepEqual(weapon.ammunitionInventory.magazines, []);
    } else assert.equal(weapon.ammunitionInventory.magazines[0].rounds, 0);
    await fx.service.inventoryTransaction("weapon", "remove-stock", { ammoKey: archived.key, amount: 50 });
    assert.equal(fx.state.weapons[0].totalAmmo, 0);
    assert.deepEqual(fx.state.weapons[0].ammunitionInventory.stocks[0].type, archived);
    assert.deepEqual(fx.actor.system, { ranged: {}, skills: {}, equipment: { original: true } });
    assert.deepEqual(fx.state.attackOverrides, original.attackOverrides);
  }
});

test("catalog choices use confirmed compatibility only", () => {
  const weapon = inventory();
  const api = { weaponCatalogBindings: { analyzeMode: () => ({ status: "confirmed", binding: { modeId: "mode" } }) },
    catalogs: { getModeLinks: () => ({ ammoItemIds: ["a"], ammoFamilyIds: [] }) },
    ammunitionCompatibility: { getCompatibleAmmunition: () => ({ ammunition: [
      { ...typeA, status: "compatible", record: { name: "A" } },
      { ...typeB, status: "undetermined", record: { name: "B" } },
      { ammoId: "ht64", book: "ht", kind: "cartridge-upgrade", status: "compatible", record: { name: "Upgrade" } }
    ] }) } };
  assert.deepEqual(availableAmmoTypes({}, weapon, api).map(type => type.key), [typeA.key]);
});

test("window Actor and approval-policy subscriptions refresh current content and are removed on close", async () => {
  const fx = fixture(); await fx.service.inventoryTransaction("weapon", "initialize");
  const app = new AmmoManagementApp({ actor: fx.actor, weaponId: "weapon" });
  app.element = { dataset: {}, addEventListener() {}, removeEventListener() {}, querySelector: () => null };
  let refreshes = 0; app.refresh = async () => { refreshes++; };
  app._onRender({}, {}); app._onRender({}, {});
  assert.equal(subscriptions.size, 2);
  subscriptions.get(app._hook).fn({ id: "unrelated" }); assert.equal(refreshes, 0);
  subscriptions.get(app._hook).fn(fx.actor); assert.equal(refreshes, 1);
  subscriptions.get(app._approvalHook).fn({ key: "unrelated" }); assert.equal(refreshes, 1);
  subscriptions.get(app._approvalHook).fn({ key: "olegurps-qol.preparedAmmoPolicy" }); assert.equal(refreshes, 2);
  subscriptions.get(app._approvalHook).fn({ key: "olegurps-qol.ammunitionApprovals" }); assert.equal(refreshes, 3);
  await app.close(); assert.equal(subscriptions.size, 0);
});

test("window reopening reads saved selection candidates, quantities and permanent magazine IDs", async () => {
  const fx = fixture(); await fx.service.inventoryTransaction("weapon", "initialize");
  await fx.service.inventoryTransaction("weapon", "add-magazines", { capacity: 40, amount: 10 });
  const id = fx.state.weapons[0].ammunitionInventory.magazines[7].id;
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: id });
  const app = new AmmoManagementApp({ actor: fx.actor, weaponId: "weapon" });
  const context = await app._prepareContext();
  assert.equal(app.ui.magazineId, id); assert.equal(context.weapon.ammunitionInventory.magazines.length, 10);
  assert.equal(context.weapon.capacity, 40);
});

test("RU/EN management keeps ammunition operations without installation, test controls or removed messages", () => {
  const weapon = archivedInventory(), magazine = weapon.ammunitionInventory.magazines[0];
  const before = structuredClone(weapon);
  for (const language of ["ru", "en"]) {
    const html = ammoManagementHTML(weapon, { language, magazineId: magazine.id, ammoKey: archived.key }, displayedAmmoTypes({}, weapon, null, language));
    assert.doesNotMatch(html, /data-inventory-action="(?:install|eject|test-mode)"|inventoryTestMode/);
    for (const name of ["DeleteHint", "Changed"]) assert.ok(!html.includes(ammoWindowText(name, language)));
    for (const action of ["load", "unload", "unload-all", "delete-magazine", "add-magazines", "add-stock", "remove-stock"])
      assert.ok(html.includes(`data-inventory-action="${action}"`));
    assert.ok(html.includes(ammoWindowText("Installed", language)));
    assert.ok(html.includes(ammoWindowText("Stored", language)));
    // The revised UX preserves the known historical name exclusively in the remnants group.
    assert.doesNotMatch(html, /GM test mode/);
    assert.match(html, /<optgroup label="Сохранённые остатки">[^]*Test Cartridge \(Temporary\)/);
    assert.equal((html.match(/Test Cartridge \(Temporary\)/g)??[]).length,1);
    for (const action of ["load", "add-stock"]) assert.match(html, new RegExp(`data-inventory-action="${action}" disabled`));
    for (const action of ["unload", "unload-all", "delete-magazine", "remove-stock"])
      assert.doesNotMatch(html, new RegExp(`data-inventory-action="${action}" disabled`));
  }
  assert.deepEqual(weapon, before);
});

test("external installation refreshes the open window without transferring or consuming rounds", async () => {
  const weapon = inventory(), first = addMagazines(weapon, 10), second = addMagazines(weapon, 40);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 80 });
  operate(weapon, "load", { magazineId: first.id, ammoKey: typeA.key, amount: 10 });
  operate(weapon, "load", { magazineId: second.id, ammoKey: typeA.key, amount: 23 });
  operate(weapon, "install", { magazineId: first.id });
  const fx = fixture(weapon), app = new AmmoManagementApp({ actor: fx.actor, weaponId: "weapon" });
  app.element = { dataset: {}, addEventListener() {}, removeEventListener() {}, querySelector: () => null };
  await app._prepareContext();
  let updated;
  app.refresh = async () => { updated = await app._prepareContext(); };
  app._onRender({}, {});
  const before = fx.state.weapons[0];
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: second.id });
  await subscriptions.get(app._hook).fn(fx.actor);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updated.weapon.ammunitionInventory.installedId, second.id);
  assert.deepEqual(updated.weapon.ammunitionInventory.stocks, before.ammunitionInventory.stocks);
  assert.deepEqual(updated.weapon.ammunitionInventory.magazines, before.ammunitionInventory.magazines);
  assert.equal(updated.weapon.totalAmmo, 80);
  const html = ammoManagementHTML(updated.weapon, { ...app.ui, magazineId: second.id }, []);
  assert.ok(html.includes(ammoWindowText("Installed", "ru")));
  await app.close();
});

test("successful management is silent while errors remain visible and notify", async () => {
  const fx = fixture(inventory()), app = new AmmoManagementApp({ actor: fx.actor, weaponId: "weapon" });
  app.refresh = async () => {};
  app.ui.message = "old error";
  await app._operate("add-magazines", { capacity: 30, amount: 1 });
  assert.equal(app.ui.message, "");
  const original = globalThis.ui.notifications.error;
  let notified;
  globalThis.ui.notifications.error = message => { notified = message; };
  try {
    await app._operate("unload", { magazineId: fx.state.weapons[0].ammunitionInventory.magazines[0].id, amount: 1 });
    assert.ok(app.ui.message);
    assert.equal(notified, app.ui.message);
    assert.notEqual(notified, ammoWindowText("Changed", "ru"));
  } finally { globalThis.ui.notifications.error = original; }
});

test("RU/EN translations load, match and omit retired cartridge keys", () => {
  assert.deepEqual(Object.keys(ammoManagementLabels.en).sort(), Object.keys(ammoManagementLabels.ru).sort());
  for (const language of ["ru", "en"]) {
    const translations = JSON.parse(readFileSync(new URL(`../lang/${language}.json`, import.meta.url), "utf8"));
    for (const name of ["Test", "TestMode", "TestDisabled", "TestNotice"]) {
      assert.ok(!Object.hasOwn(translations, "OleGURPS.Ammo." + name));
      assert.ok(!Object.hasOwn(ammoManagementLabels[language], name));
    }
    assert.equal(ammoText("Stored", { game: { i18n: { lang: language, localize: key => translations[key] ?? key } } }),
      ammoWindowText("Stored", language));
    assert.equal(ammoDisplayName(archived, language), ammoManagementLabels.ru.Stored);
    assert.equal(ammoDisplayName(typeA, language), "A");
  }
  const app = new AmmoManagementApp({ actor: fixture().actor, weaponId: "weapon" });
  assert.equal(app.ui.language, "ru");
  assert.equal(ammoWindowText("Load"), "Снарядить");
  assert.equal(ammoWindowText("Load", "en"), "Снарядить");
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  const html = ammoManagementHTML(weapon, { language: app.ui.language, magazineId: magazine.id }, []);
  assert.match(html, /Тип боеприпаса/);
  assert.match(html, /Снарядить/);
  assert.match(html, /Разрядить/);
  assert.doesNotMatch(html, /Ammunition type|Load|Unload|GM test mode/);
});

test("invalid inventory cannot install two magazines or change another weapon's ownership", () => {
  const weapon = inventory(); const magazine = addMagazines(weapon, 10);
  const wrong = structuredClone(weapon.ammunitionInventory); wrong.magazines[0].weaponId = "other";
  assert.equal(validateInventory(wrong, weapon.id), false);
  wrong.magazines[0].weaponId = weapon.id; wrong.installedId = [magazine.id];
  assert.equal(validateInventory(wrong, weapon.id), false);
});

test("Spraying Fire retries failed session cleanup without consuming new-format ammo twice", async () => {
  const { SprayingFireSessionService } = await import("../scripts/tools/spraying-fire-session-service.js");
  const weapon = inventory(), magazine = addMagazines(weapon, 30);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 50 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 30 });
  operate(weapon, "install", { magazineId: magazine.id });
  const fx = fixture(weapon);
  const token = { id: "token", document: { id: "token" } };
  const service = new SprayingFireSessionService({ token, actor: fx.actor, weapon, attack: { rof: "10" },
    runtime: { canvas: { scene: { id: "scene" } }, game: { user: { id: "gm" } } } });
  const state = fx.state;
  state.sprayingFireSessions = { [service.key]: { state: "planned", weaponKey: service.weaponKey,
    plannedAmmo: 7, targets: [{ completed: true }, { completed: true }] } };
  await fx.actor.setFlag("world", "gurpsAmmoManager", state);
  const update = fx.actor.update; fx.actor.update = async () => { throw Error("cleanup unavailable"); };
  await assert.rejects(service.finish(), /cleanup unavailable/);
  assert.equal(fx.state.weapons[0].totalAmmo, 43);
  assert.equal(fx.state.sprayingFireSessions[service.key].ammoConsumed, true);
  fx.actor.update = update;
  assert.equal(await service.finish(), true);
  assert.equal(await service.finish(), false);
  assert.equal(fx.state.weapons[0].totalAmmo, 43);
});

test("Fire Control Actor refresh projects new capacity and remaining rounds without modifying GGA", async () => {
  const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
  const weapon = inventory(), magazine = addMagazines(weapon, 40);
  operate(weapon, "add-stock", { ammoKey: typeA.key, amount: 60 });
  operate(weapon, "load", { magazineId: magazine.id, ammoKey: typeA.key, amount: 23 });
  operate(weapon, "install", { magazineId: magazine.id });
  const fx = fixture(weapon), original = structuredClone(fx.actor.system);
  const app = Object.create(FirePreparationApp.prototype);
  Object.assign(app, { actor: fx.actor, mode: "weapon", weapon: { id: "weapon", capacity: 30, magazines: [30], loadedIndex: 0 },
    attack: { name: "Gun", level: 13 }, _captureFields() {}, render() {} });
  app._onActorUpdate(fx.actor);
  assert.equal(app.weapon.capacity, 40); assert.equal(app.weapon.magazines[0], 23);
  assert.deepEqual(fx.actor.system, original);
});
