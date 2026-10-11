import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { StandaloneWeaponDraft, StandaloneWeaponService, searchStandaloneModels, standaloneModeStats,
  standaloneHasResources, standaloneAmmoCarrier, standaloneText } from "../scripts/tools/standalone-weapon-service.js";
import { standaloneConfigurationHTML } from "../scripts/tools/standalone-weapon-configuration.js";
import { WeaponConfigurationDraft, weaponConfigurationHTML } from "../scripts/tools/weapon-configuration.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";

const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
  json: async () => JSON.parse(await fs.readFile(new URL('../data/catalogs/' + url.split('/').at(-1), import.meta.url), 'utf8')) }) });
await catalogs.load();
globalThis.foundry = { utils: { deepClone: structuredClone } };
function fixture() {
  const flags = {}, writes = [];
  const actor = { isOwner: true, system: { ranged: {}, melee: {}, skills: {} },
    getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); writes.push([scope, key]); } };
  return { actor, flags, writes, service: new StandaloneWeaponService(actor, catalogs) };
}
function draft(type = 'ranged', name = 'Izhmash AK-47', existing = null) {
  const d = new StandaloneWeaponDraft({ catalogs, type, existing });
  if (!existing) {
    const models = searchStandaloneModels(catalogs, type, name);
    d.selectModel((models.find(e => e.name === name) ?? models[0]).equipment_id);
  }
  return d;
}

test('search spans LT/HT/UT, matches names and keeps melee and ranged distinct', () => {
  for (const source of ['LT', 'HT', 'UT']) for (const type of ['melee', 'ranged']) {
    const models = searchStandaloneModels(catalogs, type, '', source);
    assert.ok(models.length > 0);
    assert.ok(models.every(e => e.source === source && e.modes.some(m => m.combat_type === type && m.role === 'attack' && !m.hidden)));
  }
  assert.equal(searchStandaloneModels(catalogs, 'ranged', 'AK-47')[0].name.includes('AK-47'), true);
  assert.equal(searchStandaloneModels(catalogs, 'ranged', 'does-not-exist').length, 0);
});

test('ranged creation stores exact catalog IDs/revision/snapshots without GGA attacks or Actor.system changes', async () => {
  const { actor, service, writes } = fixture(), before = structuredClone(actor.system), d = draft();
  const record = await service.save(d);
  assert.match(record.id, /^ow-/);
  assert.equal(record.type, 'ranged');
  assert.equal(record.source.equipmentId, d.modelId);
  assert.equal(record.source.revision, CATALOG_DEFINITIONS.weapons.revision);
  assert.ok(record.source.sourceHash);
  assert.deepEqual(record.modes.map(m => m.snapshot), d.selectedModes);
  assert.equal(record.resourceLinks.ammoWeaponId, record.id);
  assert.equal(record.readiness, 'definition-only');
  assert.deepEqual(actor.system, before);
  assert.deepEqual(writes, [['olegurps-qol', 'standaloneWeapons']]);
});

test('melee modes retain separate governing skills, usage, Reach, Parry and sw/thr source expressions', async () => {
  const { service } = fixture(), d = draft('melee', 'Axe');
  assert.ok(d.availableModes.length >= 2);
  const record = await service.save(d);
  assert.ok(record.modes.length >= 2);
  for (const mode of record.modes) assert.deepEqual(mode.snapshot, catalogs.getMode(mode.modeId));
  assert.ok(new Set(record.modes.map(m => m.snapshot.governing_skill.skill.name)).size > 1);
  assert.match(record.modes[0].snapshot.raw_calc.damage, /sw|thr/);
  assert.deepEqual(record.resourceLinks, {});
});

test('selecting a subset of modes never merges modes or stats and editing can add a mode', async () => {
  const { service } = fixture(), d = draft('melee', 'Axe');
  const ids = d.availableModes.map(m => m.weapon_mode_id);
  d.modeIds = new Set([ids[0]]);
  const first = await service.save(d);
  assert.equal(first.modes.length, 1);
  const edit = draft('melee', '', first);
  edit.modeIds.add(ids[1]);
  const next = await service.save(edit);
  assert.equal(next.modes.length, 2);
  assert.equal(next.id, first.id);
  assert.deepEqual(next.modes[0].snapshot, first.modes[0].snapshot);
});

test('missing stats stay null; manual overrides are separate from immutable source data', async () => {
  const { service } = fixture(), d = draft('ranged', 'Atlatl');
  const mode = d.selectedModes[0], stats = standaloneModeStats(mode);
  assert.equal(stats.rcl, null);
  d.setOverride(mode.weapon_mode_id, 'rcl', '1');
  const saved = await service.save(d);
  assert.equal(saved.modes[0].snapshot.stats.recoil, null);
  assert.equal(saved.modes[0].overrides.rcl, '1');
  assert.match(standaloneConfigurationHTML(d), /data-standalone-stat="rcl"/);
});

test('an unresolved catalog skill can be entered manually without inventing a skill level', () => {
  const equipment = searchStandaloneModels(catalogs, 'ranged').find(e => e.modes.some(m =>
    m.combat_type === 'ranged' && m.role === 'attack' && !m.hidden && !m.governing_skill?.skill));
  assert.ok(equipment);
  const d = new StandaloneWeaponDraft({ catalogs, type: 'ranged' }); d.selectModel(equipment.equipment_id);
  const mode = d.selectedModes.find(m => !m.governing_skill?.skill);
  const originalSkill = structuredClone(mode.governing_skill);
  d.setOverride(mode.weapon_mode_id, 'governingSkill', 'Guns/TL8 (Rifle)');
  assert.match(standaloneConfigurationHTML(d), /data-standalone-stat="governingSkill"/);
  assert.equal(d.overrides[mode.weapon_mode_id].governingSkill, 'Guns/TL8 (Rifle)');
  assert.equal(d.overrides[mode.weapon_mode_id].level, undefined);
  assert.deepEqual(mode.governing_skill, originalSkill);
});

test('reopening or an unavailable/revised catalog preserves original source, overrides and settings', async () => {
  const { actor, service } = fixture(), d = draft();
  d.setOverride(d.selectedModes[0].weapon_mode_id, 'acc', '9');
  const saved = await service.save(d);
  const offline = new StandaloneWeaponService(actor, null);
  const edit = new StandaloneWeaponDraft({ catalogs: null, type: 'ranged', existing: offline.get(saved.id) });
  const again = await offline.save(edit);
  assert.equal(again.id, saved.id);
  assert.deepEqual(again.source, saved.source);
  assert.deepEqual(again.modes, saved.modes);
  assert.deepEqual(again.settings, saved.settings);
});

test('reimport/reordering/changing GGA attacks and skills does not rebind a stored weapon', async () => {
  const { actor, service } = fixture();
  const saved = await service.save(draft());
  actor.system = { ranged: { '00001': { name: saved.name } }, melee: {}, skills: { rifle: { level: 20 } } };
  assert.deepEqual(service.get(saved.id), saved);
  const carrier = standaloneAmmoCarrier(saved);
  assert.deepEqual(carrier.attackRef, {});
  assert.equal(carrier.weaponBond, false);
});

test('independent copies of a model get different IDs; simultaneous writes keep both records', async () => {
  const { actor, service } = fixture();
  const results = await Promise.all([service.save(draft()), new StandaloneWeaponService(actor, catalogs).save(draft())]);
  assert.notEqual(results[0].id, results[1].id);
  assert.equal(service.list().length, 2);
});

test('stale editors fail without overwriting newer settings or resurrecting deleted weapons', async () => {
  const { service } = fixture(), saved = await service.save(draft());
  const a = draft('ranged', '', saved), b = draft('ranged', '', saved);
  await service.save(a);
  await assert.rejects(service.save(b), new RegExp(standaloneText('Stale')));
  const latest = service.get(saved.id), stale = draft('ranged', '', latest);
  await service.remove(saved.id);
  await assert.rejects(service.save(stale), new RegExp(standaloneText('Stale')));
});

test('deletion and catalog changes reject remaining stocks, magazines and unresolved inventory', async () => {
  const { actor, service, flags } = fixture(), saved = await service.save(draft());
  for (const extra of [{ totalAmmo: 3 }, { magazines: [0] }, { ammunitionReview: { reason: 'legacy' } },
    { ammunitionInventory: { version: 1, stocks: [{ rounds: 5 }], magazines: [] } }]) {
    flags.world = { gurpsAmmoManager: { weapons: [{ ...standaloneAmmoCarrier(saved), ...extra }] } };
    const before = structuredClone(flags);
    assert.equal(standaloneHasResources(actor, saved.id), true);
    await assert.rejects(service.remove(saved.id), new RegExp('Боеприпасы'));
    const change = draft('ranged', '', saved); change.selectModel(searchStandaloneModels(catalogs, 'ranged', 'Atlatl')[0].equipment_id);
    await assert.rejects(service.save(change), new RegExp('Боеприпасы'));
    assert.deepEqual(flags, before);
  }
});

test('empty deletion keeps unrelated weapons, ammo and historical shot snapshots', async () => {
  const { service, flags } = fixture(), saved = await service.save(draft());
  const other = { id: 'gga', totalAmmo: 15, magazines: [5], attackRef: { path: 'system.ranged.00000' } };
  flags.world = { gurpsAmmoManager: { weapons: [standaloneAmmoCarrier(saved), other], shotReceipts: { attack: { damage: '5d+1 pi' } } } };
  const before = structuredClone(flags.world);
  await service.remove(saved.id);
  assert.equal(service.get(saved.id), null);
  assert.deepEqual(flags.world, before);
});

test('ranged form checkbox permits creation without a GGA attack and defaults to existing behavior', async () => {
  const { actor } = fixture(), model = new WeaponConfigurationDraft({ actor, state: { weapons: [] }, attacks: [], catalogs });
  assert.equal(model.standalone, false);
  assert.match(weaponConfigurationHTML(model), /name="standaloneWeapon"/);
  model.standalone = true;
  model.standaloneDraft.selectModel(draft().modelId);
  const result = await model.commit({ id: 'unused' });
  assert.deepEqual(result.weapon.attackRef, {});
  assert.equal(result.weapon.totalAmmo, 0);
  assert.deepEqual(result.weapon.magazines, []);
});

test('AmmoService restores standalone carriers without inferred skills, magazines or duplicate records', async () => {
  const { actor, service } = fixture(), saved = await service.save(draft());
  const ammo = new AmmoService(actor), state = await ammo.loadState();
  assert.equal(state.weapons.length, 1);
  assert.equal(state.weapons[0].standaloneWeaponId, saved.id);
  assert.deepEqual(state.weapons[0].magazines, []);
  assert.deepEqual(state.governingSkills, {});
  await ammo.saveState(state);
  assert.equal((await ammo.loadState()).weapons.length, 1);
  assert.deepEqual(actor.system.ranged, {});
});

test('non-owner writes and invalid model/type/mode combinations fail without touching flags', async () => {
  const { actor, service, flags } = fixture(); actor.isOwner = false;
  await assert.rejects(service.save(draft()), new RegExp(standaloneText('Owner')));
  actor.isOwner = true;
  await assert.rejects(service.save(new StandaloneWeaponDraft({ catalogs, type: 'melee' })), new RegExp(standaloneText('SelectModes')));
  const bad = draft(); bad.type = 'melee';
  await assert.rejects(service.save(bad), new RegExp(standaloneText('SelectModes')));
  assert.deepEqual(flags, {});
});

test('a queued stock write blocks ranged deletion and preserves definitions and ammunition', async () => {
  const { actor, service } = fixture(), saved = await service.save(draft());
  const ammo = new AmmoService(actor); await ammo.saveState(await ammo.loadState());
  const type = { key: 'ht:ammo-item:a', source: 'catalog', book: 'ht', kind: 'ammo-item', ammoId: 'a', name: 'A' };
  const addition = ammo.inventoryTransaction(saved.id, 'add-stock', { ammoKey: type.key, amount: 3 }, { allowedTypes: [type] });
  const deletion = ammo.removeStandaloneWeapon(saved.id);
  await addition;
  await assert.rejects(deletion, new RegExp('Боеприпасы'));
  assert.ok(service.get(saved.id));
  assert.equal((await ammo.loadState()).weapons[0].totalAmmo, 3);
});

test('ranged deletion removes only its empty carrier and keeps other resources and shot receipts', async () => {
  const { actor, service, flags } = fixture(), saved = await service.save(draft());
  const other = { id: 'gga', totalAmmo: 15, capacity: 30, magazines: [5], loadedIndex: 0, attackRef: {} };
  flags.world = { gurpsAmmoManager: { weapons: [standaloneAmmoCarrier(saved), other], shotReceipts: { old: { damage: '4d pi' } } } };
  const ammo = new AmmoService(actor), next = await ammo.removeStandaloneWeapon(saved.id);
  assert.equal(service.get(saved.id), null);
  assert.deepEqual(next.weapons, [other]);
  assert.deepEqual(flags.world.gurpsAmmoManager.shotReceipts, { old: { damage: '4d pi' } });
});
