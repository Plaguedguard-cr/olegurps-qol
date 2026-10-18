import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogs, compatibility, api } from './fixtures/ht-special-context.mjs';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { ammunitionCandidates, displayedAmmoTypes } from '../scripts/tools/ammo-management-app.js';
import { resolveRuntimeAttackProfile, withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import { ammunitionConditionTexts } from '../scripts/tools/damage-shot-link.js';
import { HT_PROJECT_WEAPON_POLICIES } from '../scripts/ht-source-corrections.js';

globalThis.OleGURPSQOL = api;
const ZIP = 'WwlfY-FYthqkLvByK', LR = 'ht_22_long_rifle_5_7x16mmr';
const EXPECTED = {
  standard: { damage: '1d+1 pi-', range: '70/800', st: '6' },
  ht_ap: { damage: '1d-1(2) pi-', range: '70/800', st: '6' },
  ht_aphc: { damage: '1d+1(2) pi-', range: '70/800', st: '6' },
  ht_subsonic_pistol: { damage: '1d+1 pi-', range: '56/640', st: '6' },
  ht_plus_p: { damage: '1d+1 pi-', range: '77/880', st: '7' }
};
async function fixture(modeId = ZIP) {
  const flags = {};
  const actor = { id: crypto.randomUUID(), isOwner: true,
    system: { attributes: { DX: { value: 16 }, IQ: { value: 16 } }, skills: {} },
    getFlag: (s, k) => flags[s]?.[k], setFlag: async (s, k, v) => { (flags[s] ??= {})[k] = structuredClone(v); } };
  const definitions = new StandaloneWeaponService(actor, catalogs);
  const draft = new StandaloneWeaponDraft({ catalogs, type: 'ranged' });
  draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id); draft.modeIds = new Set([modeId]);
  const record = await definitions.save(draft), service = new AmmoService(actor);
  await service.loadState();
  const state = () => actor.getFlag('world', 'gurpsAmmoManager');
  const weapon = () => state().weapons.find(w => w.standaloneWeaponId === record.id);
  const candidates = () => ammunitionCandidates(actor, weapon(), api);
  const attack = () => readStandaloneAttack(actor, record.id, modeId);
  const tx = (op, args) => service.inventoryTransaction(weapon().id, op, args,
    { allowedTypes: w => ammunitionCandidates(actor, w, api) });
  const fire = (id = crypto.randomUUID(), execute = async () => ({ rolled: true, message: { id: 'message-' + id } })) =>
    service.executeShot({ weaponId: weapon().id, attackId: id,
      prepare: ({ state, ammunition }) => ({ amount: 1, profile: resolveRuntimeAttackProfile({
        actor, attack: attack(), weaponId: weapon().id, state, ammunition }) }), execute });
  return { actor, flags, definitions, record, service, state, weapon, candidates, attack, tx, fire };
}

test('project policy reuses exact .22 LR and preserves HT92 stats, Malf and empty initial resources', async () => {
  const f = await fixture(), mode = catalogs.getMode(ZIP);
  assert.equal(mode.ammunitionIdentityPolicy.authority, 'user-approved-project-policy');
  assert.equal(HT_PROJECT_WEAPON_POLICIES[ZIP].ammoId, LR);
  assert.deepEqual(mode.ht_ammo_item_ids, [LR]);
  assert.equal(compatibility.checkCompatibility(ZIP, LR).status, 'compatible');
  assert.equal(f.record.equipmentSnapshot.local_notes, 'Malf 12.');
  assert.deepEqual(mode.weaponReliability, { malf: 12, source: 'HT92', application: 'manual' });
  const attack = f.attack(); assert.equal(attack.readinessReason, null);
  for (const [k, v] of Object.entries({ damage: '1d+1 pi-', acc: 0, range: '70/800', rof: '1', shots: '1(10i)', rcl: '2' }))
    assert.equal(attack[k], v, k);
  assert.equal(f.weapon().totalAmmo, 0); assert.equal(f.weapon().ammunitionInventory.magazines[0].rounds, 0);
  let executions = 0; await assert.rejects(f.fire(undefined, async () => { executions++; return { rolled: true }; }), /InsufficientRounds/);
  assert.equal(executions, 0);
});

test('all ready constructions are exactly the existing .22 LR set; no .22 Short/Long/WMR or unsupported ammunition', async () => {
  const f = await fixture(), candidates = f.candidates();
  assert.deepEqual(candidates.filter(t => !t.unavailable).map(t => t.recipe?.variantId ?? 'standard').sort(), Object.keys(EXPECTED).sort());
  assert.ok(candidates.every(t => t.ammoId === LR));
  for (const id of ['ht_22_short_5_7x11mmr', 'ht_22_long', 'ht_22_wmr']) {
    assert.notEqual(compatibility.checkCompatibility(ZIP, id, { book: 'ht', kind: 'ammo-item' }).status, 'compatible');
  }
  for (const type of candidates.filter(t => t.unavailable)) {
    assert.ok(type.reason, type.recipe?.variantId);
    await assert.rejects(f.tx('add-stock', { ammoKey: type.key, amount: 1 }), /TypeUnavailable/, type.recipe?.variantId);
  }
  assert.equal(f.weapon().totalAmmo, 0);
});

for (const [variant, expected] of Object.entries(EXPECTED)) test('Zip-Gun full physical pipeline: ' + variant, async () => {
  const f = await fixture(), type = f.candidates().find(t => (t.recipe?.variantId ?? 'standard') === variant);
  const system = structuredClone(f.actor.system);
  await f.tx('add-stock', { ammoKey: type.key, amount: 3 });
  const mag = f.weapon().ammunitionInventory.installedId;
  await f.tx('load', { magazineId: mag, ammoKey: type.key, amount: 1 });
  const id = crypto.randomUUID(); let executions = 0;
  const shot = await f.fire(id, async () => { executions++; return { rolled: true, message: { id: 'chat' } }; });
  assert.equal(shot.spent, 1); assert.equal(f.weapon().totalAmmo, 2); assert.equal(f.weapon().magazines[0], 0);
  assert.equal(shot.profile.damage.nativeSafe, true, shot.profile.damage.reason);
  assert.equal(shot.profile.damage.formula, expected.damage); assert.equal(shot.profile.effective.range, expected.range);
  assert.equal(String(shot.profile.effective.st), expected.st);
  assert.equal(String(shot.profile.effective.acc), '0'); assert.equal(shot.profile.effective.rof, '1');
  assert.equal(shot.profile.effective.rcl, '2'); assert.equal(shot.profile.effective.shots, '1(10i)');
  assert.equal(shot.profile.weaponReliability.malf, 12); assert.equal(shot.snapshot.profile.weaponReliability.malf, 12);
  const snapshot = JSON.stringify(shot.snapshot);
  await f.fire(id, async () => { executions++; throw Error('duplicate executed'); }); assert.equal(executions, 1);
  await new AmmoService(f.actor).loadState(); assert.equal(f.weapon().totalAmmo, 2);
  assert.equal(JSON.stringify(shot.snapshot), snapshot); assert.deepEqual(f.actor.system, system);
  await f.tx('load', { magazineId: mag, ammoKey: type.key, amount: 1 });
  const preview = withRuntimeAmmoStats(f.attack(), f.actor, f.state());
  assert.match(ammunitionConditionTexts(preview.ammunitionConditions).join(' '), /Malf 12/);
});

test('magazine variants remain separate; cancellation/failure and concurrent duplicate preserve physical accounting', async () => {
  const f = await fixture(), types = f.candidates(), base = types.find(t => !t.recipe), ap = types.find(t => t.recipe?.variantId === 'ht_ap');
  for (const t of [base, ap]) await f.tx('add-stock', { ammoKey: t.key, amount: 2 });
  const first = f.weapon().ammunitionInventory.installedId;
  await f.tx('add-magazines', { amount: 1, capacity: 1 }); const second = f.weapon().ammunitionInventory.magazines.find(m => m.id !== first).id;
  await f.tx('load', { magazineId: first, ammoKey: base.key, amount: 1 });
  await f.tx('load', { magazineId: second, ammoKey: ap.key, amount: 1 }); await f.tx('install', { magazineId: second });
  const before = JSON.stringify(f.state());
  assert.equal((await f.fire(undefined, async () => ({ rolled: false }))).rolled, false);
  await assert.rejects(f.fire(undefined, async () => { throw Error('cancelled executor'); }), /cancelled executor/);
  assert.equal(JSON.stringify(f.state()), before);
  const id = crypto.randomUUID(); let calls = 0;
  const results = await Promise.all([f.fire(id, async () => { calls++; return { rolled: true }; }), f.fire(id)]);
  assert.equal(calls, 1); assert.equal(results[0].profile.damage.formula, EXPECTED.ht_ap.damage);
  assert.equal(f.weapon().ammunitionInventory.magazines.find(m => m.id === first).rounds, 1);
  assert.equal(f.weapon().totalAmmo, 3); await f.tx('install', { magazineId: first });
  assert.equal((await f.fire()).profile.damage.formula, EXPECTED.standard.damage);
});

test('saved pre-policy definition, magazines, stocks and shot history survive; missing imported Acc reads as printed zero', async () => {
  const f = await fixture(), saved = f.actor.getFlag('olegurps-qol', 'standaloneWeapons');
  saved.weapons[0].modes[0].snapshot = structuredClone(catalogs.getSourceCatalog('weapons').equipment.find(e => e.equipment_id === f.record.source.equipmentId).modes[0]);
  saved.weapons[0].modes[0].overrides.damage = '1d+2 pi-';
  const prior = structuredClone(saved); await f.actor.setFlag('olegurps-qol', 'standaloneWeapons', prior);
  const beforeState = JSON.stringify(f.state()); assert.equal(f.attack().acc, 0); assert.equal(f.attack().data.damage, '1d+2 pi-');
  assert.equal(f.candidates().filter(t => !t.unavailable).length, 5);
  assert.deepEqual(f.actor.getFlag('olegurps-qol', 'standaloneWeapons'), prior); assert.equal(JSON.stringify(f.state()), beforeState);
});

test('legacy unmanaged Zip-Gun cannot execute without an installed physical cartridge', async () => {
  const f = await fixture(), state = structuredClone(f.state()), weapon = state.weapons[0];
  delete weapon.ammunitionInventory; weapon.magazines = []; weapon.ammoUnconfigured = true; weapon.totalAmmo = 0;
  await f.actor.setFlag('world', 'gurpsAmmoManager', state);
  await assert.rejects(f.fire(), /MagazineNotInstalled/);
});

test('all 511 audited native links keep their previous outcome except the approved Zip-Gun pair', () => {
  const unresolved = new Set(['W82oDY970UdeqLXTF', 'WGJgRQusTscOtoLC9', 'Wkvf5salwlKpkRx_c', 'WOAL2ladqiRbTuvRU']);
  const rows = catalogs.getCatalog('ht').ammo_items.flatMap(a => a.weapon_mode_ids.map(modeId => ({ modeId, ammoId: a.id })));
  assert.equal(rows.length, 511);
  for (const row of rows) assert.equal(compatibility.checkCompatibility(row.modeId, row.ammoId, { book: 'ht', kind: 'ammo-item' }).status,
    row.modeId === 'WdzSSShGT_yv4ctOi' ? 'incompatible' : unresolved.has(row.modeId) ? 'undetermined' : 'compatible', row.modeId);
});

test('other .22 LR pistols keep their exact assortment; rifle and special platform restrictions stay distinct', async () => {
  for (const modeId of catalogs.getAmmoItem('ht', LR).weapon_mode_ids.filter(id => id !== ZIP)) {
    const f = await fixture(modeId), ids = f.candidates().filter(t => t.ammoId === LR && !t.unavailable).map(t => t.recipe?.variantId ?? 'standard').sort();
    const expected = modeId === 'WL0SlLUJxX2V_3KVh' ? ['standard'] : modeId === 'WXXqZ-u9AGxWAhfph' ? [...Object.keys(EXPECTED), 'ht_sapfsds'].sort() : Object.keys(EXPECTED).sort();
    assert.deepEqual(ids, expected, modeId); assert.equal(catalogs.getMode(modeId).ammunitionIdentityPolicy, undefined);
  }
});
