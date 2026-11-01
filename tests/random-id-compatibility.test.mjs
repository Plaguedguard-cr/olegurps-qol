import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {generateId} from '../scripts/random-id.js';
import {migrateAmmoInventory, applyInventoryOperation, inventoryTotal} from '../scripts/tools/ammo-inventory.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {newAttackId} from '../scripts/tools/attack-profile-runtime.js';

let sequence = 0;
const idLengths = [];
globalThis.foundry = {
  utils: {deepClone: structuredClone, randomID(length) {
    assert.equal(this, foundry.utils);
    idLengths.push(length);
    return (++sequence).toString(36).padStart(length, '0');
  }},
  applications: {api: {
    ApplicationV2: class {
      constructor(options) { this.options = options; }
      async render() {
        this.html = await this._renderHTML(await this._prepareContext({}), {});
        this.element = {addEventListener() {}};
        this.rendered = true;
        opened.push(this);
        return this;
      }
      async close() { this.rendered = false; }
    },
    DialogV2: {}
  }}
};
globalThis.game = {user: {id: 'qa', isGM: true}, i18n: {lang: 'ru', localize: key => key},
  settings: {get() {}}, messages: {contents: []}};
globalThis.ui = {notifications: {error: message => assert.fail(message), warn() {}}};
globalThis.GURPS = {executeOTF() {}, ModifierBucket: {modifierStack: {modifierList: []}}};
const hooks = new Map(), opened = [];
globalThis.Hooks = {on: (name, callback) => { const id = ++sequence; hooks.set(id, {name, callback}); return id; },
  off: (_name, id) => hooks.delete(id)};
const {openAmmoManager} = await import('../scripts/tools/ammo.js');

function withoutCrypto(t, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {value, configurable: true});
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'crypto', descriptor) : delete globalThis.crypto);
}

const legacyWeapon = () => ({id: 'existing-weapon', name: 'Saved gun',
  attackRef: {path: 'system.ranged.00000'}, ammoType: 'Saved ammunition',
  totalAmmo: 83, capacity: 30, magazines: [11, 30, 0], loadedIndex: 1,
  notes: 'Keep user notes', weaponBond: true});
function fixture(weapon = legacyWeapon()) {
  const snapshot = {version: 1, attackId: 'old-attack', weaponId: weapon.id,
    damage: {formula: '3d+2 pi'}, spent: 2};
  const message = {id: 'historical-message', flags: {'olegurps-qol': {shotSnapshot: structuredClone(snapshot)}}};
  let state = {version: 9, weapons: [structuredClone(weapon)],
    shotReceipts: {'old-attack': {attackId: 'old-attack', spent: 2, snapshot}},
    attackOverrides: {}, governingSkills: {}};
  const writes = [];
  const actor = {id: 'actor-' + ++sequence, name: 'QA Actor', isOwner: true,
    system: {ranged: {'00000': {name: 'Saved gun', level: '14', damage: '3d+2 pi', rof: '3', rcl: '2', acc: '4'}},
      skills: {}, equipment: {kept: true}},
    getFlag: (scope, key) => scope === 'world' && key === 'gurpsAmmoManager' ? structuredClone(state) : undefined,
    setFlag: async (scope, key, value) => {
      assert.equal(scope, 'world'); assert.equal(key, 'gurpsAmmoManager');
      state = structuredClone(value); writes.push(structuredClone(value));
    }};
  game.messages.contents = [message];
  return {actor, service: new AmmoService(actor), state: () => structuredClone(state), writes, message};
}

test('native UUID generation keeps its receiver and remains preferred', () => {
  const runtime = {crypto: {randomUUID() { assert.equal(this, runtime.crypto); return 'native-uuid'; }},
    foundry: {utils: {randomID: () => assert.fail('unexpected fallback')}}};
  assert.equal(generateId(runtime), 'native-uuid');
});

test('fallback uses Foundry randomID with exactly 16 characters and its receiver', () => {
  const runtime = {crypto: {}, foundry: {utils: {randomID(length) {
    assert.equal(this, runtime.foundry.utils); assert.equal(length, 16); return 'foundry-identity';
  }}}};
  assert.equal(generateId(runtime), 'foundry-identity');
  runtime.crypto.randomUUID = 'unavailable';
  assert.equal(generateId(runtime), 'foundry-identity');
});

for (const [environment, cryptoValue] of [['crypto without randomUUID', {}], ['no crypto object', undefined]]) {
  test(`${environment}: migration and magazine addition preserve all resources and selection`, t => {
    withoutCrypto(t, cryptoValue);
    const weapon = legacyWeapon();
    assert.deepEqual(migrateAmmoInventory(weapon), {changed: true, valid: true});
    const inventory = structuredClone(weapon.ammunitionInventory);
    assert.equal(inventory.stocks[0].rounds, 42);
    assert.deepEqual(inventory.magazines.map(m => m.rounds), [11, 30, 0]);
    assert.equal(inventory.installedId, inventory.magazines[1].id);
    assert.equal(inventoryTotal(inventory), 83);
    const ids = inventory.magazines.map(m => m.id);
    applyInventoryOperation(weapon, 'add-magazines', {capacity: 30, amount: 2});
    assert.deepEqual(weapon.ammunitionInventory.magazines.slice(0, 3), inventory.magazines);
    assert.equal(weapon.ammunitionInventory.installedId, inventory.installedId);
    assert.deepEqual(weapon.magazines, [11, 30, 0, 0, 0]);
    assert.equal(weapon.totalAmmo, 83); assert.equal(weapon.loadedIndex, 1);
    assert.equal(new Set(weapon.ammunitionInventory.magazines.map(m => m.id)).size, 5);
    assert.ok(ids.every(id => id.length === 16));
    const before = structuredClone(weapon);
    assert.deepEqual(migrateAmmoInventory(weapon), {changed: false, valid: true});
    assert.deepEqual(weapon, before);
    assert.equal(newAttackId().length, 16);
  });

  for (const isGM of [true, false]) test(`${environment}: ${isGM ? 'GM' : 'PLAYER OWNER'} opens legacy assistant, initializes, adds magazines and reopens`, async t => {
    withoutCrypto(t, cryptoValue); game.user.isGM = isGM;
    const fx = fixture(), system = structuredClone(fx.actor.system);
    const history = structuredClone(fx.state().shotReceipts), message = structuredClone(fx.message);
    globalThis.canvas = {scene: {id: 'qa-scene'}, tokens: {controlled: [{id: fx.actor.id, name: 'QA token', actor: fx.actor}]}};
    t.after(async () => { for (const app of opened.splice(0)) if (app.rendered) await app.close(); });
    await openAmmoManager();
    const app = opened.at(-1);
    assert.ok(app.rendered); assert.match(app.html, /data-weapon-card="existing-weapon"/);
    assert.equal(app.managerState.weapons[0].totalAmmo, 83);
    await app.close();
    await fx.service.inventoryTransaction('existing-weapon', 'initialize');
    const migrated = fx.state().weapons[0].ammunitionInventory;
    await fx.service.inventoryTransaction('existing-weapon', 'add-magazines', {capacity: 30, amount: 2});
    await openAmmoManager();
    const next = opened.at(-1), weapon = next.managerState.weapons[0];
    assert.ok(next.rendered); assert.match(next.html, /data-weapon-card="existing-weapon"/);
    assert.equal(weapon.totalAmmo, 83); assert.deepEqual(weapon.magazines, [11, 30, 0, 0, 0]);
    assert.equal(weapon.loadedIndex, 1); assert.equal(weapon.ammunitionInventory.installedId, migrated.installedId);
    assert.deepEqual(weapon.ammunitionInventory.magazines.slice(0, 3), migrated.magazines);
    assert.equal(weapon.notes, 'Keep user notes'); assert.equal(weapon.weaponBond, true);
    assert.deepEqual(fx.state().shotReceipts, history); assert.deepEqual(fx.message, message);
    assert.deepEqual(fx.actor.system, system);
    assert.ok(fx.writes.every(s => JSON.stringify(s.shotReceipts) === JSON.stringify(history)));
    await next.close(); assert.equal(hooks.size, 0);
  });

  test(`${environment}: existing magazine IDs and explicitly ejected selection survive`, async t => {
    withoutCrypto(t, cryptoValue);
    for (const ejected of [false, true]) {
      const weapon = legacyWeapon(); let n = 0;
      migrateAmmoInventory(weapon, () => ['old-mag-a', 'old-mag-b', 'old-mag-c'][n++]);
      if (ejected) Object.assign(weapon.ammunitionInventory, {installedId: null, selectionEjected: true});
      const fx = fixture(weapon), before = structuredClone(weapon.ammunitionInventory);
      await fx.service.loadState();
      await fx.service.inventoryTransaction(weapon.id, 'add-magazines', {capacity: 30, amount: 1});
      const saved = fx.state().weapons[0];
      assert.deepEqual(saved.ammunitionInventory.magazines.slice(0, 3), before.magazines);
      assert.equal(saved.ammunitionInventory.installedId, before.installedId);
      assert.equal(saved.totalAmmo, 83);
      if (ejected) assert.equal(saved.loadedIndex, -1);
    }
  });
}

function scriptFiles(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? scriptFiles(url) : /\.[cm]?js$/.test(entry.name) ? [url] : [];
  });
}
test('HTTP compatibility guard: only the shared generator may reference randomUUID in module scripts', () => {
  const helper = new URL('../scripts/random-id.js', import.meta.url).href;
  const unsafe = scriptFiles(new URL('../scripts/', import.meta.url))
    .filter(file => file.href !== helper && /\brandomUUID\b/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(unsafe.map(file => file.pathname), [], 'Use generateId instead of a secure-context-only API');
  assert.ok(idLengths.length > 0); assert.ok(idLengths.every(length => length === 16));
});
