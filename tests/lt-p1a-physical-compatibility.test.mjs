import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { StandaloneWeaponDraft, StandaloneWeaponService, standaloneAmmoCarrier } from '../scripts/tools/standalone-weapon-service.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { ammoTypeKey, projectAmmoInventory } from '../scripts/tools/ammo-inventory.js';
import { AttackProfileResolver, createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { AutomaticAmmunitionProfileService } from '../scripts/tools/automatic-ammunition-profiles.js';
import { readStandaloneAttack, standaloneCatalogBinding } from '../scripts/tools/standalone-attack-service.js';
import { withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import { FireService } from '../scripts/tools/fire-service.js';
import { executePreparedGgaRoll } from '../scripts/tools/prepared-gga-roll.js';

globalThis.foundry = { utils: { deepClone: structuredClone }, applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { user: { id: 'owner', isGM: false, getFlag: () => undefined },
  settings: { get: () => null }, i18n: { lang: 'ru', localize: k => k }, messages: { contents: [] } };
const { ammunitionCandidates, displayedAmmoTypes } = await import('../scripts/tools/ammo-management-app.js');
const { FirePreparationApp } = await import('../scripts/tools/fire-preparation-app.js');
const expected = JSON.parse(await fs.readFile(new URL('./fixtures/lt-p1a-physical-pairs.json', import.meta.url), 'utf8'));
// P5 now supplies the actual fitted physical loads; the historical audit fixture stays unchanged.
const p5Resolved=new Set(['WadZ9BFUFoPATpyuT','WS7SJUj_6I5AIBmpi']);
const {ltFlameProfile}=await import('../scripts/lt-flame-source.js');
const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
  json: async () => JSON.parse(await fs.readFile(new URL('../data/catalogs/' + url.split('/').at(-1), import.meta.url), 'utf8')) }) });
await catalogs.load();
const compatibility = new AmmunitionCompatibilityService(catalogs);
const automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
const resolver = new AttackProfileResolver({ catalogs, compatibility });
const api = globalThis.OleGURPSQOL = { catalogs, ammunitionCompatibility: compatibility, automaticAmmunitionProfiles: automatic };
const check = (mode, ammo, kind = 'ammo-item', extra = {}) => compatibility.checkCompatibility(mode, ammo, { book: 'lt', kind, ...extra });
function typeFor(id, kind = 'ammo-item') {
  const record = kind === 'ammo-item' ? catalogs.getAmmoItem('lt', id) : catalogs.getAmmoFamily('lt', id);
  const type = { source: 'catalog', book: 'lt', kind, ammoId: id, name: record.name };
  type.key = ammoTypeKey(type); return type;
}
async function fixture(modeId, id, kind = 'ammo-item') {
  const flags = {}, writes = [];
  const actor = { id: crypto.randomUUID(), isOwner: true,
    system: { skills: {}, attributes: { DX: { value: 20 }, IQ: { value: 20 } }, ranged: {}, melee: {} },
    getFlag: (s, k) => structuredClone(flags[s]?.[k]),
    setFlag: async (s, k, value) => { flags[s] ??= {}; flags[s][k] = structuredClone(value); writes.push([s, k]); } };
  const mode = catalogs.getMode(modeId), equipment = catalogs.getEquipmentForMode(modeId), skill = mode.governing_skill.skill;
  if (skill) actor.system.skills.main = { name: skill.name + (/^(Guns|Gunner|Artillery|Liquid Projector)$/.test(skill.name) ? '/TL' + equipment.tech_level : '') +
    (skill.specialization ? ' (' + skill.specialization + ')' : ''), level: 20, points: 1 };
  const draft = new StandaloneWeaponDraft({ catalogs, type: 'ranged' }); draft.selectModel(equipment.equipment_id); draft.modeIds = new Set([modeId]);
  const record = await new StandaloneWeaponService(actor, catalogs).save(draft), weapon = standaloneAmmoCarrier(record);
  const type = typeFor(id, kind), magazineId = crypto.randomUUID();
  // Pre-correction persisted owner data, including an already installed invalid load.
  weapon.ammunitionInventory = { version: 1, installedId: magazineId,
    stocks: [{ key: type.key, type: { ...type, note: 'owner note', parameters: { arbitrary: 'preserve' } }, rounds: 5 }],
    magazines: [{ id: magazineId, weaponId: weapon.id, capacity: Math.max(1, weapon.capacity), rounds: 1, ammoKey: type.key }] };
  projectAmmoInventory(weapon);
  const old = { attackId: 'old', spent: 1, ammunition: { ...type }, profile: { damage: { formula: '4d cr' } } };
  await actor.setFlag('world', 'gurpsAmmoManager', { version: 10, weapons: [weapon],
    shotReceipts: { old }, attackOverrides: { preserved: { damage: 'owner override' } }, governingSkills: {} });
  const service = new AmmoService(actor), state = () => actor.getFlag('world', 'gurpsAmmoManager');
  const attack = () => readStandaloneAttack(actor, record.id, modeId);
  const profile = () => resolver.resolve({ actorId: actor.id, weaponId: weapon.id, attack: attack(), rawAttack: attack().data,
    state: state(), binding: standaloneCatalogBinding(attack(), catalogs), ammunition: service.readAttackAmmunition(weapon.id) });
  const transaction = (operation, args, options = { allowedTypes: () => [type] }) => service.inventoryTransaction(weapon.id, operation, args, options);
  return { actor, flags, writes, weapon, record, modeId, type, magazineId, service, state, attack, profile, transaction };
}

test('Fire Control checks the current installed LT party even with a stale compatible attack', async () => {
  for (const row of expected.pairs) {
    const f = await fixture(row.modeId, row.ammoId);
    const reason = FirePreparationApp.prototype._proximityReason.call({ actor: f.actor, weapon: f.weapon,
      attack: {}, fireState: {}, _getRapidFireState:()=>null });
    if(p5Resolved.has(row.modeId)||ltFlameProfile(row.modeId)?.ammoId===row.ammoId){assert.equal(reason,null);continue;}
    assert.equal(reason, compatibility.checkCompatibility(row.modeId,row.ammoId,{book:'lt',kind:'ammo-item',ltBow:{}}).reasons[0].message);
  }
  const f = await fixture('WX-yHEQghov5Xp29y', 'lt_bombard_stone_ball_lt87');
  assert.equal(FirePreparationApp.prototype._proximityReason.call({ actor: f.actor, weapon: f.weapon,
    attack: {}, fireState: {}, _getRapidFireState: () => null }), null);
});

for (const row of expected.pairs.filter(r=>!p5Resolved.has(r.modeId))) test(`exact item/family verdict and authoritative load/fire guard: ${row.modeId}`, async () => {
  const p6=ltFlameProfile(row.modeId)?.ammoId===row.ammoId;
  assert.equal(check(row.modeId, row.ammoId).status, p6?'compatible':row.expected);
  assert.equal(check(row.modeId, row.familyId, 'ammo-family').status, p6?'incompatible':row.expected);
  for (const [id, kind] of [[row.ammoId, 'ammo-item'], [row.familyId, 'ammo-family']]) {
    const f = await fixture(row.modeId, id, kind), before = JSON.stringify(f.state()), count = f.writes.length;
    assert.ok(!ammunitionCandidates(f.actor, f.weapon, api).some(t => t.ammoId === id && !t.unavailable));
    const historical = displayedAmmoTypes(f.actor, f.weapon, api).find(t => t.key === f.type.key);
    assert.equal(historical.unavailable, true); assert.equal(historical.historical, true); assert.ok(historical.reason);
    await assert.rejects(f.transaction('load', { magazineId: f.magazineId, ammoKey: f.type.key, amount: 1 }), /LT|заряд|снаряд|направляющ|подгонк/);
    await assert.rejects(f.transaction('add-stock', { ammoKey: f.type.key, amount: 1 }));
    // Caller-supplied good type/list must not substitute for the actual persisted bad party.
    await assert.rejects(f.transaction('load', { magazineId: f.magazineId, ammoKey: f.type.key, amount: 1,
      type: typeFor('lt_arquebus_bullet_lt93') }, { allowedTypes: () => [{ ...typeFor('lt_arquebus_bullet_lt93'), key: f.type.key }] }));
    let prepared = 0, rolled = 0;
    await assert.rejects(f.service.executeShot({ weaponId: f.weapon.id, attackId: crypto.randomUUID(),
      prepare: () => { prepared++; return { profile: f.profile(), amount: 1 }; }, execute: () => { rolled++; return { rolled: true }; } }));
    assert.equal(prepared, 0); assert.equal(rolled, 0);
    const profile = f.profile(); assert.equal(profile.damage.nativeSafe, false); assert.equal(profile.compatibility.status, p6?kind==='ammo-item'?'compatible':'incompatible':row.expected);
    assert.ok(withRuntimeAmmoStats(f.attack(), f.actor, f.state()).ammunitionReadinessReason);
    // Even an obsolete/forged successful profile is rechecked against the current loaded stock.
    const forged = { ...structuredClone(profile), compatibility: { status: 'compatible' }, damage: { ...profile.damage, nativeSafe: true } };
    await assert.rejects(new FireService({ actor: f.actor, preparedRollExecutor: () => { rolled++; } }).executeRangedAttack(f.attack(), { attackProfile: forged, physicalShots: 1 }));
    await assert.rejects(executePreparedGgaRoll({ actor: f.actor, attack: f.attack(), attackProfile: forged, physicalShots: 1, effectiveSkill: 20 }));
    assert.equal(rolled, 0); assert.equal(JSON.stringify(f.state()), before); assert.equal(f.writes.length, count);
    const saved = JSON.parse(before); f.flags.world.gurpsAmmoManager = saved;
    assert.equal(new AmmoService(f.actor).readAttackAmmunition(f.weapon.id).type.note, 'owner note');
    assert.equal(JSON.stringify(f.state()), before); // serialization/F5 boundary, no migration or conversion.
    await f.transaction('unload', { magazineId: f.magazineId, amount: 1 });
    assert.equal(f.state().weapons[0].ammunitionInventory.stocks[0].rounds, 6);
    assert.deepEqual(f.state().shotReceipts, saved.shotReceipts);
    assert.deepEqual(f.state().attackOverrides, saved.attackOverrides);
  }
});

test('187 original native physical links retain admission; P4 identifies the old Puckle cylinder; conditional links stay unconfirmed', () => {
  const guarded = new Set(expected.pairs.map(r => r.modeId + ':' + r.ammoId)); let compatible = 0;
  // Preserve the original P1a boundary; the 15 additional P2 links have their own full matrix.
  for (const item of catalogs.getSourceCatalog('lt').ammo_items) for (const mode of item.weapon_mode_ids) {
    // New P4 parties have their own individual matrix. The old cylinder ID is preserved as a device.
    if(item.id.startsWith('lt_p4_improvised_')||['lt_puckle_round_ball_lt93','lt_puckle_square_bullet_lt93'].includes(item.id))continue;
    if (guarded.has(mode + ':' + item.id)) continue;
    if(item.id==='lt_puckle_gun_bullet_lt93'){assert.equal(check(mode,item.id).status,'incompatible');continue;}
    assert.equal(check(mode, item.id).status, 'compatible', mode + ':' + item.id); compatible++;
  }
  assert.equal(compatible, 187);
  assert.equal(expected.pairs.filter(r => r.expected === 'undetermined' && r.before !== 'compatible').length, 15);
});

test('22 F20 and17 F21 source mechanisms reject the modifier without changing ordinary projectile admission', () => {
  for (const [option, ids] of [['artillery_lead', expected.f20], ['catapult_overweight', expected.f21]]) for (const mode of ids) {
    assert.equal(check(mode, option, 'projectile-option').status, 'incompatible', mode + ':' + option);
    const itemId = catalogs.getModeLinks(mode).ammoItemIds[0];
    const type = typeFor(itemId);
    assert.notEqual(automatic.prepare({ modeId: mode, base: type, variantId: option }).state, 'complete');
  }
  assert.equal(check('WYkHC34-KuQjgMNb-', 'catapult_overweight', 'projectile-option').status, 'undetermined');
  assert.equal(check('W5TNQWnLaM0EvaZwK', 'lead_substitute_ballista', 'projectile-option').status, 'compatible');
});

test('a family with multiple legal children keeps item identity and never becomes a generic cartridge', () => {
  const mode = 'WqUeIOkvQIgCeKWou';
  assert.equal(check(mode, 'bow_arrow', 'ammo-family').status, 'undetermined');
  for (const item of ['lt_regular_arrow', 'lt_blunt_arrow_lt73']) {
    assert.equal(check(mode, item).status, 'compatible');
    const result = check(mode, 'bow_arrow', 'ammo-family', { ammoItemId: item });
    assert.equal(result.status, 'compatible'); assert.equal(result.relation.ammoItemId, item);
  }
  assert.equal(check(mode, 'bow_arrow', 'ammo-family', { ammoItemId: 'lt_arrow_guide_dart' }).status, 'incompatible');
});

test('ordinary fitted stone still loads through the service; snapshot remains independent of later admission', async () => {
  const f = await fixture('WX-yHEQghov5Xp29y', 'lt_bombard_stone_ball_lt87');
  await f.transaction('unload', { magazineId: f.magazineId, amount: 1 });
  await assert.rejects(f.transaction('load', { magazineId: f.magazineId, ammoKey: f.type.key, amount: 1 }),/контейнер/);
  const w=f.flags.world.gurpsAmmoManager.weapons[0];w.ltEarly.geometryInitialized=false;await f.transaction('lt-early-configure',{settings:{crew:1,setupReady:true,mountReady:true,procedureReady:true,ignitionReady:true}});
  const type={...f.type,recipe:{version:1,variantId:'lt_artillery_load',customId:'p5-stone',parameters:{accounting:'prepared',loading:'loose',powder:'serpentine',projectileMass:25,fit:{equipmentId:f.record.source.equipmentId,weaponId:w.id,barrels:[0]}}}};type.key=ammoTypeKey(type);
  await f.transaction('save-recipe',{type},{allowedTypes:()=>[type]});await f.transaction('add-stock',{ammoKey:type.key,amount:1},{allowedTypes:()=>[type]});
  const slot=f.state().weapons[0].ammunitionInventory.magazines.find(m=>m.ltEarlyPlace===0&&!m.ltEarlyLegacy);
  await f.transaction('load',{magazineId:slot.id,ammoKey:type.key,amount:1},{allowedTypes:()=>[type]});
  await f.transaction('install',{magazineId:slot.id},{allowedTypes:()=>[type]});
  const profile = f.profile(); assert.equal(profile.damage.nativeSafe, true); assert.equal(profile.damage.formula, '13d+2 pi++');
  assert.equal(profile.effective.range, '80/550');
  const snapshot = createShotSnapshot(profile, { attackId: 'before', spent: 1 }); const original = JSON.stringify(snapshot);
  const before = JSON.stringify(f.state());
  assert.equal(snapshot.profile.damage.formula, '13d+2 pi++'); assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(JSON.stringify(snapshot), original); assert.equal(JSON.stringify(f.state()), before);
  f.actor.isOwner = false;
  await assert.rejects(f.transaction('load', { magazineId: f.magazineId, ammoKey: f.type.key, amount: 1 }), /Permission/);
  await assert.rejects(f.service.executeShot({ weaponId: f.weapon.id, attackId: 'foreign', prepare: () => null, execute: () => null }), /Permission/);
});

test('queued attacks recheck a party changed after submission; historical receipts remain idempotent', async () => {
  const f = await fixture('WX-yHEQghov5Xp29y', 'lt_bombard_stone_ball_lt87');
  let prepared = 0, rolled = 0;
  const pending = f.service.executeShot({ weaponId: f.weapon.id, attackId: 'queued',
    prepare: () => { prepared++; return { amount: 1, profile: f.profile() }; },
    execute: () => { rolled++; } });
  const metal = typeFor('lt_bombard_metal_ball_lt87');
  const inventory = f.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory;
  inventory.stocks[0].type = metal; inventory.stocks[0].key = metal.key;
  inventory.magazines[0].ammoKey = metal.key;
  const before = JSON.stringify(f.state());
  await assert.rejects(pending, error => error.code === 'LT_BOMBARD_METAL_UNPROVEN');
  assert.equal(prepared, 0); assert.equal(rolled, 0); assert.equal(JSON.stringify(f.state()), before);
  const result = await f.service.executeShot({ weaponId: f.weapon.id, attackId: 'old',
    prepare: () => { prepared++; }, execute: () => { rolled++; } });
  assert.equal(result.duplicate, true); assert.equal(result.receipt.spent, 1);
  assert.equal(prepared, 0); assert.equal(rolled, 0); assert.equal(JSON.stringify(f.state()), before);
});

test('installing an already loaded invalid LT magazine cannot bypass load admission', async () => {
  const f = await fixture('W-RYCc6uU-OXKoBah', 'lt_ballista_10_lb_stone_lt81');
  f.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.installedId = null;
  const before = JSON.stringify(f.state());
  await assert.rejects(f.transaction('install', { magazineId: f.magazineId }),
    error => error.code === 'LT_BUNDLE_REQUIRES_SEPARATE_STONES');
  assert.equal(JSON.stringify(f.state()), before);
});

test('ordinary single-stone modes retain all six heavy stones; bundle options cannot authorize the wrong physical stone', () => {
  for (const row of expected.pairs.filter(r => r.expected === 'incompatible')) {
    const item = catalogs.getAmmoItem('lt', row.ammoId);
    const ordinary = item.weapon_mode_ids.find(id => id !== row.modeId);
    assert.equal(check(ordinary, row.ammoId).status, 'compatible');
    assert.equal(check(row.modeId, 'artillery_lead', 'projectile-option', { ammoItemId: row.ammoId }).status, 'incompatible');
    assert.equal(check(row.modeId, 'artillery_lead', 'projectile-option').status, 'undetermined');
  }
});
