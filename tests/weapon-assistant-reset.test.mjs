import test from 'node:test';
import assert from 'node:assert/strict';
import {AmmoService} from '../scripts/tools/ammo-service.js';

let sequence = 0;
globalThis.foundry = {utils: {deepClone: structuredClone, randomID: length => String(++sequence).padStart(length, '0')},
  applications: {api: {ApplicationV2: class {async render() {return this;}},}, instances: new Map()}};
globalThis.game = {user: {id: 'player', isGM: false}, scenes: {contents: []}, settings: {registerMenu() {}}};
globalThis.canvas = {tokens: {controlled: []}};
globalThis.ui = {notifications: {error: message => assert.fail(message)}};
const {resetWeaponAssistant, WeaponAssistantResetApp, registerWeaponAssistantReset} = await import('../scripts/tools/weapon-assistant-reset.js');

function merge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith('-=')) delete target[key.slice(2)];
    else if (value && typeof value === 'object' && !Array.isArray(value)) merge(target[key] ??= {}, value);
    else target[key] = structuredClone(value);
  }
}
function fixture() {
  const history = {'saved-attack': {attackId: 'saved-attack', spent: 3,
    snapshot: {damage: {formula: '3d+2 pi'}, weaponId: 'old-weapon'}}};
  const flags = {world: {gurpsAmmoManager: {version: 10,
    weapons: [{id: 'old-weapon', name: 'Old helper gun', totalAmmo: 83, magazines: [11, 30], capacity: 30, loadedIndex: 1}],
    shotReceipts: structuredClone(history), attackOverrides: {old: {skillLevel: 99}},
    governingSkills: {old: {name: 'Old skill'}}, customRecipes: {old: true}, chatSettings: {mode: 'self'}},
    unrelated: {keep: true}},
    'olegurps-qol': {standaloneWeapons: {version: 1, weapons: [{id: 'ranged', type: 'ranged', modes: []}, {id: 'melee', type: 'melee', modes: []}]},
      weaponCatalogBindings: {version: 1, entries: [{id: 'ranged-binding', anchor: {type: 'ranged'}}, {id: 'melee-binding', anchor: {type: 'melee'}}]},
      campaignTL: 8, customOther: {keep: true}}};
  const updates = [];
  const actor = {id: 'owned-' + ++sequence, uuid: 'Actor.owned-' + sequence, name: 'QA <Actor>', isOwner: true, documentName: 'Actor',
    system: {ranged: {'00000': {name: 'Current sheet gun', mode: 'Single', uuid: 'sheet-mode', damage: '2d pi', level: 13}},
      melee: {'00000': {name: 'Sword', damage: 'sw cut'}}, equipment: {kept: true}, skills: {}},
    getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    update: async patch => {
      updates.push(structuredClone(patch));
      for (const [path, value] of Object.entries(patch)) {
        assert.ok(path.startsWith('flags.'));
        const parts = path.slice(6).split('.'); let parent = flags;
        for (const key of parts.slice(0, -1)) parent = parent[key] ??= {};
        const key = parts.at(-1);
        if (key.startsWith('-=')) delete parent[key.slice(2)];
        else if (value && typeof value === 'object' && !Array.isArray(value)) merge(parent[key] ??= {}, value);
        else parent[key] = structuredClone(value);
      }
    }};
  return {actor, flags, updates, history};
}

test('reset menu is available to players and lists only owned characters', async () => {
  let menu;
  registerWeaponAssistantReset({game: {settings: {registerMenu: (...args) => {menu = args;}}}});
  assert.equal(menu[0], 'olegurps-qol'); assert.equal(menu[2].restricted, false);
  const fx = fixture(), foreign = {id: 'foreign', name: 'Foreign', isOwner: false};
  game.actors = [fx.actor, foreign];
  const app = new WeaponAssistantResetApp(), context = await app._prepareContext();
  assert.deepEqual(context.actors, [fx.actor]);
  const html = await app._renderHTML(context);
  assert.match(html, /QA &lt;Actor&gt;/); assert.doesNotMatch(html, /Foreign/);
  assert.match(html, /data-action="requestReset"/); assert.doesNotMatch(html, /data-action="confirmReset"/);
  assert.match(html, /история атак сохранятся/);
  for (const lang of ['ru', 'en']) {
    game.i18n = {lang};
    assert.equal(await app._renderHTML(context), html);
  }
});

test('no confirmation and cancellation do not write any data', async () => {
  const fx = fixture(), before = structuredClone(fx.flags);
  assert.equal(await resetWeaponAssistant(fx.actor), false);
  const app = new WeaponAssistantResetApp(); app.confirming = true;
  await WeaponAssistantResetApp.DEFAULT_OPTIONS.actions.cancelReset.call(app);
  assert.equal(app.confirming, false); assert.deepEqual(fx.flags, before); assert.equal(fx.updates.length, 0);
});

test('foreign character cannot be reset even with confirmation', async () => {
  const fx = fixture(), before = structuredClone(fx.flags); fx.actor.isOwner = false;
  await assert.rejects(resetWeaponAssistant(fx.actor, {confirmed: true}), /прав владельца/);
  assert.deepEqual(fx.flags, before); assert.equal(fx.updates.length, 0);
});

test('confirmed reset is atomic, removes helper ammunition/settings/ranged weapons and preserves history and melee', async () => {
  const fx = fixture(), other = fixture(), otherBefore = structuredClone(other.flags), system = structuredClone(fx.actor.system);
  await resetWeaponAssistant(fx.actor, {confirmed: true});
  assert.equal(fx.updates.length, 1);
  const saved = fx.flags.world.gurpsAmmoManager;
  assert.deepEqual(saved.weapons, []); assert.deepEqual(saved.attackOverrides, {}); assert.deepEqual(saved.governingSkills, {});
  assert.equal(saved.customRecipes, undefined); assert.equal(saved.chatSettings.mode, 'all');
  assert.deepEqual(saved.shotReceipts, fx.history); assert.equal(saved.rebuildFromCharacter, true);
  assert.deepEqual(fx.flags['olegurps-qol'].standaloneWeapons.weapons, [{id: 'melee', type: 'melee', modes: []}]);
  assert.deepEqual(fx.flags['olegurps-qol'].weaponCatalogBindings.entries, [{id: 'melee-binding', anchor: {type: 'melee'}}]);
  assert.equal(fx.flags['olegurps-qol'].campaignTL, 8); assert.deepEqual(fx.flags.world.unrelated, {keep: true});
  assert.deepEqual(fx.flags['olegurps-qol'].customOther, {keep: true});
  assert.deepEqual(fx.actor.system, system); assert.deepEqual(other.flags, otherBefore);
});

test('next open reads the current sheet once, starts with zero ammunition and keeps stable new IDs afterwards', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {value: {}, configurable: true});
  t.after(() => Object.defineProperty(globalThis, 'crypto', descriptor));
  const fx = fixture(); await resetWeaponAssistant(fx.actor, {confirmed: true});
  fx.actor.system.ranged['00000'].name = 'Changed after reset';
  fx.actor.system.ranged['00001'] = {name: 'New sheet gun', uuid: 'new-sheet-mode'};
  const service = new AmmoService(fx.actor), next = await service.loadState();
  assert.equal(next.weapons.length, 2); assert.equal(next.weapons[0].name, 'Changed after reset – Single');
  assert.ok(next.weapons.every(w => w.totalAmmo === 0 && w.magazines.length === 0 && w.ammoUnconfigured));
  assert.deepEqual(next.weapons.map(w => w.attackRef.uuid), ['sheet-mode', 'new-sheet-mode']);
  assert.deepEqual(next.shotReceipts, fx.history);
  const ids = next.weapons.map(w => w.id), writes = fx.updates.length;
  assert.deepEqual((await service.loadState()).weapons.map(w => w.id), ids);
  assert.equal(fx.updates.length, writes); assert.equal(fx.flags.world.gurpsAmmoManager.rebuildFromCharacter, false);
});

test('stale settings cannot restore pre-reset weapons or magazines', async () => {
  const fx = fixture(), service = new AmmoService(fx.actor), stale = fx.actor.getFlag('world', 'gurpsAmmoManager');
  await resetWeaponAssistant(fx.actor, {confirmed: true}); const before = structuredClone(fx.flags);
  await assert.rejects(service.saveState(stale), /устарело после сброса/);
  assert.deepEqual(fx.flags, before);
});

test('repeated confirmations reset once and cannot erase a newly rebuilt assistant', async () => {
  const fx = fixture();
  const outcomes = await Promise.allSettled([resetWeaponAssistant(fx.actor, {confirmed: true}), resetWeaponAssistant(fx.actor, {confirmed: true})]);
  assert.equal(outcomes[0].status, 'fulfilled'); assert.equal(outcomes[1].status, 'rejected');
  assert.equal(fx.updates.length, 1);
});

test('pending attack and active suppression prevent reset without writes', async () => {
  const fx = fixture(); fx.flags.world.gurpsAmmoManager.shotReceipts.pending = {status: 'pending'};
  await assert.rejects(resetWeaponAssistant(fx.actor, {confirmed: true}), /завершите текущую атаку/);
  delete fx.flags.world.gurpsAmmoManager.shotReceipts.pending;
  fx.flags['olegurps-qol'].suppressionFireSessions = {active: {actorId: fx.actor.id}};
  await assert.rejects(resetWeaponAssistant(fx.actor, {confirmed: true}), /завершите подавляющий огонь/);
  assert.equal(fx.updates.length, 0);
});

test('confirmation targets the captured actor and duplicate clicks stay disabled while resetting', async () => {
  const fx = fixture(); game.actors = {get: id => id === fx.actor.id ? fx.actor : null};
  const app = new WeaponAssistantResetApp(); app.element = {querySelector: () => ({value: fx.actor.id})};
  const actions = WeaponAssistantResetApp.DEFAULT_OPTIONS.actions;
  await actions.requestReset.call(app); assert.equal(app.actorId, fx.actor.id); assert.equal(app.confirming, true);
  const html = await app._renderHTML({actors: [fx.actor], actor: fx.actor});
  assert.match(html, /data-action="confirmReset"/); assert.match(html, /Отменить удаление после подтверждения нельзя/);
  await Promise.all([actions.confirmReset.call(app, null, {}), actions.confirmReset.call(app, null, {})]);
  assert.equal(fx.updates.length, 1); assert.equal(app.confirming, false); assert.match(app.result, /Сброшено/);
});
