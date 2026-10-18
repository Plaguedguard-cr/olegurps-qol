import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/ut-ammunition-fixture.mjs';
import { changedAmmunitionCards } from '../scripts/tools/weapon-assistant-app.js';
import { FirePreparationApp } from '../scripts/tools/fire-preparation-app.js';

test('a new shot receipt updates only the changed card; receipt-only writes build no cards', () => {
  const before = { weapons: [{ id: 'a', magazines: [9] }, { id: 'b', magazines: [20] }], shotReceipts: {} };
  const after = structuredClone(before); after.weapons[0].magazines[0]--;
  after.shotReceipts.A = { spent: 1 };
  const changes = { flags: { world: { gurpsAmmoManager: after } } };
  assert.deepEqual(changedAmmunitionCards(before, after, changes), ['a']);
  assert.deepEqual(changedAmmunitionCards(before, { ...before, shotReceipts: after.shotReceipts }, changes), []);
  assert.equal(changedAmmunitionCards(before, { ...after, campaignTL: 12 }, changes), null);
  const uaw = { id: 'main', standaloneWeaponId: 'UAW', standaloneModeId: 'WtM51JNSpOUIy3Eo1',
    ammunitionInventory: { installedId: 'mag' } };
  const shotgun = { ...uaw, id: 'shotgun', standaloneModeId: 'WRvS5pz3LMCzqQyiZ' };
  const old = { weapons: [uaw, shotgun], uawActiveFeeds: { UAW: 'shotgun' } };
  const next = structuredClone(old); next.weapons[0].etcBattery = { charge: 399 };
  assert.deepEqual(changedAmmunitionCards(old, next, changes), ['shotgun']);
});

test('UI awaits confirmed completion, rejects double click, keeps failed operations open and awaits cleanup', async () => {
  const original = globalThis.Element;
  class Element { closest(selector) { return selector === 'button[data-fire-action]' ? this : null; } }
  globalThis.Element = Element;
  const button = new Element(); Object.assign(button, { dataset: { fireAction: 'confirm' }, isConnected: true });
  let finish, closes = 0, calls = 0, closedOptions;
  const app = { _getHitControl: () => null, _captureFields() {}, _proximityReason: () => null,
    fireState: {}, getShotOptions: () => ({}), confirmCallback: async () => { calls++; return new Promise(resolve => { finish = resolve; }); },
    close: async options => { closes++; closedOptions = options; await Promise.resolve(); } };
  const event = { target: button, preventDefault() {}, stopPropagation() {} };
  try {
    const one = FirePreparationApp.prototype._onClick.call(app, event);
    assert.equal(button.disabled, true); assert.equal(closes, 0);
    await FirePreparationApp.prototype._onClick.call(app, event); assert.equal(calls, 1);
    finish(false); await one; assert.equal(closes, 0); assert.equal(button.disabled, false);
    const two = FirePreparationApp.prototype._onClick.call(app, event); finish(true); await two;
    assert.equal(closes, 1); assert.deepEqual(closedOptions, { animate: false }); assert.equal(app._submitting, false);
  } finally { globalThis.Element = original; }
});
