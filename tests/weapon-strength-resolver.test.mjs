import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { meleeSource } from '../scripts/melee-source-data.js';
import { parseWeaponStrength, WeaponStrengthResolver, createWeaponStrengthEvidence } from '../scripts/tools/weapon-strength-resolver.js';
import { readActorStrength, resolveStrengthDamage } from '../scripts/tools/strength-service.js';
import { basicStrengthDamage } from '../scripts/tools/gurps-strength-damage.js';
import { resolveLTBowBase } from '../scripts/tools/lt-bow.js';
import { resolveMeleeProfile } from '../scripts/tools/melee-profile-service.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { weaponStrengthPenalty } from '../scripts/tools/fire-control-context.js';
import { resolveAmmunitionEffects } from '../scripts/tools/ammunition-effects.js';

const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
  json: async () => JSON.parse(await fs.readFile(new URL('../data/catalogs/' + url.split('/').at(-1), import.meta.url), 'utf8')) }) });
await catalogs.load();
const resolver = new WeaponStrengthResolver({ catalogs });
const ids = { longsword: 'w0djXNfWD-9ebEkWu', longsword2: 'wSyyMVFZwpR_0-Gfi', glaive: 'wKaBftlfcmfO4Q3ph',
  ak: 'W27s4Lm8QlkKVKUPn', kentucky: 'Wv8XXYHOKVmG7Ut9V', pistol: 'W1doZcasYO-1Xw3Lf',
  bipod: 'WhQTP2P4KY4yewyBD', mount: 'WR0KjQaYwU2kPV2uB', bow: 'WqUeIOkvQIgCeKWou',
  crossbow: 'WHwsNi90Y4m49YOzg', artillery: 'W5TNQWnLaM0EvaZwK', thrown: 'W9_OmSPoA9CK9Ge1M' };
function actor(st = 8) {
  const flags = {};
  return { id: 'actor', isOwner: true, system: { attributes: { ST: { import: st, value: st }, DX: { value: 12 } },
    swing: basicStrengthDamage(st, 'swing'), thrust: basicStrengthDamage(st, 'thrust'), ads: {},
    skills: Object.fromEntries(['Broadsword', 'Two-Handed Sword', 'Force Sword'].map((name, i) => [i, { name, level: 16, import: 16, points: 4 }])) },
    items: { contents: [] }, getFlag: (s, k) => flags[s + '.' + k],
    setFlag: async (s, k, v) => { flags[s + '.' + k] = structuredClone(v); },
    update: () => { throw Error('Actor.update forbidden'); } };
}
function input(id = ids.ak, st = 8, category = 'firearm') {
  const eq = catalogs.getEquipmentForMode(id);
  return { actor: actor(st), weaponIdentity: { actorId: 'actor', instanceId: 'one', equipmentId: eq.equipment_id, modeId: id },
    category, source: { book: eq.book, page: eq.reference, sourceRevision: 'ST-AUDIT-main' } };
}
function proof(i, extra = {}) {
  return { source: 'explicit-ST-P0-control', modeId: i.weaponIdentity.modeId, instanceId: 'one', actorId: 'actor', ...extra };
}
function clean(i) { return { status: 'CLEAN', evidence: proof(i, { scope: 'base-level' }) }; }
function evaluate(i) { return resolver.resolve({ ...i, provenance: i.provenance ?? clean(i) }); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

for (const [raw, n, suffixes, rated] of [[10, 10, '', null], ['9\u2020', 9, '\u2020', null],
  ['12\u2021', 12, '\u2021', null], ['12B\u2020', 12, 'B\u2020', null], ['21M', 21, 'M', null],
  ['9R', 9, 'R', null], ['12B', 12, 'B', null], ['16M\u2020', 16, 'M\u2020', null],
  ['11R\u2020', 11, 'R\u2020', null], ['7\u2020[8]', 7, '\u2020', 8], ['0', 0, '', null]]) {
  test('strict ST parser: ' + raw, () => {
    const p = parseWeaponStrength(raw);
    assert.equal(p.status, 'KNOWN'); assert.equal(p.rawST, raw); assert.equal(p.handlingST, n);
    assert.equal(p.suffixes.join(''), suffixes); assert.equal(p.ratedST, rated);
    assert.equal(p.dagger, suffixes.includes('\u2020')); assert.equal(p.doubleDagger, suffixes.includes('\u2021'));
    assert.equal(p.rest, suffixes.includes('R')); assert.equal(p.bipod, suffixes.includes('B')); assert.equal(p.mounted, suffixes.includes('M'));
  });
}
for (const raw of ['', null, 'M', '10 pounds', '10RB\u2020', '10B\u2021', '7[8]', '9\u2020\u2021', -1, 2.5, true, '9007199254740992']) {
  test('unknown ST never becomes zero: ' + String(raw), () => {
    const p = parseWeaponStrength(raw);
    assert.equal(p.status, 'UNKNOWN'); assert.equal(p.handlingST, null); assert.equal(p.ratedST, null);
    assert.ok(p.reason); if (raw === 'M') assert.equal(p.mounted, true);
  });
}
for (const [st, expected] of [[8, -1], [9, 0], [10, 0]]) {
  test('source AK-47 ST9 dagger at Actor ST ' + st, () => {
    const r = evaluate(input(ids.ak, st));
    assert.equal(r.requirement.published, 9); assert.equal(r.requirement.effective, 9);
    assert.equal(r.penalty.applicabilityStatus, 'CONFIRMED'); assert.equal(r.penalty.desired, expected);
    assert.equal(r.penalty.delta, expected); assert.equal(Object.is(r.penalty.delta, -0), false);
  });
}
test('CLEAN skill16, required10, ST8 proposes -2 and future14', () => {
  const r = evaluate(input(ids.longsword, 8, 'melee'));
  assert.equal(r.penalty.provenanceStatus, 'CLEAN'); assert.equal(r.penalty.knownIncluded, 0);
  assert.equal(r.penalty.desired, -2); assert.equal(r.penalty.delta, -2); assert.equal(16 + r.penalty.delta, 14);
});
test('KNOWN_INCLUDED level15 with proven -1 proposes only -1 and future14', () => {
  const i = input(ids.longsword, 8, 'melee');
  i.provenance = { status: 'KNOWN_INCLUDED', knownIncludedPenalty: -1, evidence: proof(i, { scope: 'base-level' }) };
  const r = evaluate(i); assert.equal(r.penalty.desired, -2); assert.equal(r.penalty.delta, -1); assert.equal(15 + r.penalty.delta, 14);
});
test('opaque imported15, names, bucket text, and import-level difference do not prove provenance', () => {
  const i = input(ids.ak); i.provenance = { status: 'UNKNOWN', level: 15, import: 16, modifierName: 'Minimum ST', bucket: '-1 Minimum ST' };
  const r = evaluate(i); assert.equal(r.penalty.desired, -1); assert.equal(r.penalty.provenanceStatus, 'UNKNOWN');
  assert.equal(r.penalty.knownIncluded, null); assert.equal(r.penalty.delta, null);
});
test('unbound CLEAN and invalid included penalties remain UNKNOWN', () => {
  const i = input();
  for (const p of [{ status: 'CLEAN' }, { ...clean(i), knownIncludedPenalty: -1 },
    { status: 'KNOWN_INCLUDED', knownIncludedPenalty: 1, evidence: proof(i, { scope: 'base-level' }) },
    { status: 'KNOWN_INCLUDED', knownIncludedPenalty: '-1', evidence: proof(i, { scope: 'base-level' }) }]) {
    const r = evaluate({ ...i, provenance: p }); assert.equal(r.penalty.provenanceStatus, 'UNKNOWN'); assert.equal(r.penalty.delta, null);
  }
});
test('provenance from another physical instance or mode cannot be reused', () => {
  const i = input();
  for (const field of ['modeId', 'instanceId', 'actorId']) {
    const r = evaluate({ ...i, provenance: { status: 'CLEAN', evidence: { ...proof(i, { scope: 'base-level' }), [field]: 'other' } } });
    assert.equal(r.penalty.delta, null);
  }
  const noInstance = { ...i, weaponIdentity: { ...i.weaponIdentity, instanceId: null }, provenance: clean(i) };
  assert.equal(evaluate(noInstance).penalty.delta, null);
});
test('confirmed external component included in base is compact and not inferred by label', () => {
  const i = input(ids.longsword, 8, 'melee'), e = proof(i, { scope: 'base-level' });
  i.provenance = { status: 'KNOWN_INCLUDED', knownIncludedPenalty: -1, evidence: e,
    externalComponents: [{ id: 'exact-ST-component', value: -1, scope: 'base-level', confirmed: true, evidence: e, notes: 'private' }] };
  const r = evaluate(i); assert.equal(r.penalty.delta, -1); assert.equal(r.provenance.externalComponents.length, 1);
  assert.equal(JSON.stringify(r).includes('private'), false);
});
test('separate external-channel ST is retained but requires a future transport reconciliation', () => {
  const i = input(), e = proof(i, { scope: 'external-channel' });
  i.provenance = { ...clean(i), externalComponents: [{ id: 'known-bucket-ST', value: -1, scope: 'external-channel', confirmed: true, evidence: e }] };
  const r = evaluate(i); assert.equal(r.penalty.desired, -1); assert.equal(r.penalty.externalReconciliationRequired, true);
  assert.equal(r.penalty.delta, -1); assert.equal(createWeaponStrengthEvidence(r).transmittedDelta, null);
});
test('malformed, duplicate, or unconfirmed external components cannot authorize a delta', () => {
  const i = input(), e = proof(i), c = { id: 'st', value: -1, scope: 'external-channel', confirmed: true, evidence: e };
  for (const externalComponents of [{}, [c, c], [{ ...c, confirmed: false }]])
    assert.equal(evaluate({ ...i, provenance: { ...clean(i), externalComponents } }).penalty.delta, null);
});
test('Kentucky +P uses raw9 dagger ->10 dagger exactly once', () => {
  const i = input(ids.kentucky); i.ammunition = { variantId: 'ht_plus_p' };
  const r = evaluate(i); assert.equal(r.source.rawST, '9\u2020'); assert.equal(r.requirement.effective, 10);
  assert.deepEqual(r.requirement.suffixes, ['\u2020']); assert.equal(r.penalty.desired, -2);
  assert.equal(r.requirement.transformation.passes, 1);
});
test('already transformed +P result from current ammunition service is validated, never scaled again', () => {
  const i = input(ids.kentucky), effects = resolveAmmunitionEffects({ raw: { damage: '4d-1 pi+', range: '100/1000', st: '9\u2020' },
    variantId: 'ht_plus_p', baseStatus: 'compatible', constructionStatus: 'compatible', facts: { weaponTL: 5 } });
  i.ammunition = { variantId: 'ht_plus_p', requiredStrength: effects.rules.requiredStrength };
  const before = JSON.stringify(effects), r = evaluate(i);
  assert.equal(r.requirement.effective, 10); assert.equal(r.requirement.transformation.suppliedEffective, true);
  assert.equal(JSON.stringify(effects), before); assert.equal(effects.formula, '4d pi+');
});
test('stale or double-scaled +P ST and unidentified transformation return no penalty', () => {
  const i = input(ids.kentucky);
  for (const ammunition of [{ variantId: 'ht_plus_p', effectiveST: '11\u2020' },
    { variantId: 'ht_plus_p', effectiveST: '10M' }, { requiredStrength: { value: 10 } }]) {
    const r = evaluate({ ...i, ammunition }); assert.equal(r.penalty.desired, null); assert.equal(r.penalty.delta, null);
  }
});
test('same Longsword instance selects source ST10 / ST9 dagger by exact mode, not by name', () => {
  const one = input(ids.longsword, 8, 'melee'), two = input(ids.longsword2, 8, 'melee');
  const a = evaluate(one), b = evaluate(two);
  assert.equal(a.weaponIdentity.instanceId, b.weaponIdentity.instanceId); assert.equal(a.weaponIdentity.equipmentId, b.weaponIdentity.equipmentId);
  assert.equal(a.requirement.effective, 10); assert.equal(b.requirement.effective, 9);
  assert.equal(a.penalty.desired, -2); assert.equal(b.penalty.desired, -1);
});
test('mode/equipment mismatch and stale source ST fail closed', () => {
  const i = input();
  for (const patch of [{ weaponIdentity: { ...i.weaponIdentity, equipmentId: 'other' } },
    { mode: catalogs.getMode(ids.pistol) }, { mode: { ...catalogs.getMode(ids.ak), stats: { strength: '10' } } }]) {
    const r = evaluate({ ...i, ...patch }); assert.equal(r.penalty.desired, null); assert.equal(r.penalty.delta, null);
  }
});
test('instance overrides replace only their matching mode; empty override is UNKNOWN, not a fallback', () => {
  const i = input(ids.longsword, 8, 'melee');
  const r = evaluate({ ...i, override: { modeId: ids.longsword, instanceId: 'one', st: '12' } });
  assert.equal(r.requirement.published, 10); assert.equal(r.requirement.base, 12); assert.equal(r.penalty.desired, -4);
  for (const st of ['', null]) assert.equal(evaluate({ ...i, override: { modeId: ids.longsword, instanceId: 'one', st } }).penalty.desired, null);
  assert.equal(evaluate({ ...i, override: { modeId: ids.longsword2, instanceId: 'one', st: '12' } }).penalty.desired, null);
});
test('bare braced off/on never supplies bipod, mount, or pistol grip evidence', () => {
  const i = input(ids.bipod, 8);
  for (const braced of [false, true]) {
    const r = evaluate({ ...i, support: { braced } }); assert.equal(r.support.braced, braced);
    assert.equal(r.support.confirmedType, null); assert.equal(r.requirement.effective, 12); assert.equal(r.penalty.desired, -4);
  }
});
for (const [id, type, category, state, required] of [
  [ids.ak, 'ordinary', 'firearm', {}, 9],
  [ids.bipod, 'bipod', 'firearm', { installed: true, inUse: true, posture: 'prone' }, 8],
  [ids.mount, 'mounted', 'firearm', { installed: true, inUse: true, ready: true }, null],
  [ids.pistol, 'pistol-two-handed', 'pistol', { hands: 2 }, 7],
  [ids.pistol, 'stock-attached', 'pistol', { installed: true, inUse: true }, 7],
  [ids.ak, 'stock-folded', 'firearm', { installed: true, inUse: true }, 11]
]) {
  test('source-backed support: ' + type, () => {
    const i = input(id, 8, category), r = evaluate({ ...i, support: { braced: true, confirmed: true, confirmedType: type, evidence: proof(i), ...state } });
    assert.equal(r.support.status, 'CONFIRMED'); assert.equal(r.requirement.effective, required);
    assert.equal(r.requirement.ignored, type === 'mounted');
    assert.equal(r.penalty.desired, type === 'mounted' ? 0 : -Math.max(0, required - 8) || 0);
  });
}
test('incomplete bipod, another-instance mount, or pistol grip on rifle stays MANUAL', () => {
  const i = input(ids.bipod);
  for (const support of [{ confirmedType: 'bipod', confirmed: true, evidence: proof(i), installed: true, inUse: true },
    { confirmedType: 'mounted', confirmed: true, installed: true, inUse: true, ready: true, evidence: { ...proof(i), instanceId: 'other' } },
    { confirmedType: 'pistol-two-handed', confirmed: true, evidence: proof(i), hands: 2 }]) {
    const r = evaluate({ ...i, support }); assert.equal(r.support.status, 'MANUAL');
    assert.equal(r.support.confirmedType, null); assert.equal(r.requirement.effective, 12);
    assert.equal(r.penalty.applicabilityStatus, 'CONFIRMED'); assert.equal(r.penalty.delta, -4);
  }
});
test('M without a number is unknown unless actual mounted use is proven; never ST0', () => {
  const i = input(ids.mount), override = { modeId: ids.mount, instanceId: 'one', st: 'M' };
  const unknown = evaluate({ ...i, override }); assert.equal(unknown.requirement.base, null); assert.equal(unknown.penalty.desired, null);
  const mounted = evaluate({ ...i, override, support: { confirmedType: 'mounted', confirmed: true, evidence: proof(i), installed: true, inUse: true, ready: true } });
  assert.equal(mounted.requirement.effective, null); assert.equal(mounted.requirement.ignored, true); assert.equal(mounted.penalty.desired, 0);
});
test('UT harness coefficient and special accessories are never guessed', () => {
  const i = input();
  const harness = evaluate({ ...i, support: { confirmedType: 'ut-harness', confirmed: true, evidence: proof(i) } });
  assert.equal(harness.penalty.applicabilityStatus, 'MANUAL'); assert.equal(harness.penalty.desired, null);
  for (const specialRule of ['Rocket Striker', 'Smartgrip', 'Gravitic Compensator', 'Hyperdense'])
    assert.equal(evaluate({ ...i, conditions: { specialRule } }).penalty.desired, null);
});
test('proved one-handed dagger thresholds return Ready only when needed; no invented skill multiplier', () => {
  for (const [st, expectedReady] of [[18, true], [24, false]]) {
    const i = input('wnDOACzBDQIrJ9e7w', st, 'melee');
    const r = evaluate({ ...i, selection: { grip: 'one-handed', confirmed: true, evidence: proof(i) } });
    assert.equal(r.penalty.desired, 0); assert.equal(!!r.hints.ready, expectedReady);
  }
});
test('unproven grip and required second operating hand return no guessed penalty', () => {
  const i = input(ids.longsword, 8, 'melee');
  assert.equal(evaluate({ ...i, selection: { grip: 'defensive' } }).penalty.desired, null);
  const r = evaluate({ ...i, selection: { grip: 'one-handed', confirmed: true, evidence: proof(i) }, conditions: { requiresTwoHands: true } });
  assert.equal(r.penalty.desired, null);
});
test('source Maul double dagger has distinct Ready and one-handed thresholds', () => {
  for (const [st, ready] of [[13, true], [20, false]]) {
    const r = evaluate(input('w58mAioCCxiLCg3XJ', st, 'melee'));
    assert.equal(!!r.hints.ready, ready); assert.equal(r.handedness.minimumOneHandedST, 39);
  }
  const i = input('w58mAioCCxiLCg3XJ', 38, 'melee');
  assert.equal(evaluate({ ...i, selection: { grip: 'one-handed', confirmed: true, evidence: proof(i) } }).penalty.delta, null);
});
test('natural Punch/Kick/Bite have no invented minST, cap, or fatigue hint', () => {
  for (const name of ['Punch', 'Kick', 'Bite']) {
    const i = { actor: actor(1), category: 'natural', weaponIdentity: { actorId: 'actor', modeId: 'natural:' + name, instanceId: 'one' } };
    const r = evaluate(i); assert.equal(r.requirement.effective, null); assert.equal(r.penalty.desired, 0);
    assert.equal(r.penalty.applicabilityStatus, 'NOT_APPLICABLE'); assert.equal(r.hints.fatigue, null); assert.equal(r.strengthForDamage.maximumST, null);
  }
});
test('fixed-energy Force Glaive still has handling deficit without using ST Damage', () => {
  const r = evaluate({ ...input(ids.glaive, 6, 'melee'), conditions: { damageKind: 'fixed-energy' }, currentMeleeStrength: { penalty: 0, minimumSTPenaltyDeferred: true } });
  assert.equal(r.requirement.effective, 7); assert.equal(r.penalty.desired, -1);
  assert.equal(r.strengthForDamage.status, 'NOT_APPLICABLE'); assert.equal(r.legacy.minimumSTPenaltyDeferred, true); assert.equal(r.legacy.penalty, 0);
});
test('personal artillery uses handling7 independently of rated8 and the existing drawing profile', () => {
  const r = evaluate({ ...input(ids.artillery, 6, 'personal-artillery'), drawingProfile: { effectiveST: 6, requiredST: 8, ratedST: 8, method: 'hand', source: 'LT83' } });
  assert.equal(r.requirement.base, 7); assert.equal(r.requirement.ratedST, 8); assert.equal(r.penalty.desired, -1);
  assert.equal(r.strengthForDrawing.requiredST, 8);
});
test('mechanical artillery requires separate proven personal use and Basic Lift', () => {
  const i = input('WVDXm1zp4eENVl-SF', 19, 'mechanical-artillery'); // LT82 Ballista, 1-lb., ST20M dagger.
  assert.equal(evaluate(i).penalty.desired, null);
  const r = evaluate({ ...i, conditions: { personalUseConfirmed: true, basicLiftSufficient: true, evidence: proof(i) } });
  assert.equal(r.penalty.desired, -1);
});
for (const [id, category, formula] of [[ids.bow, 'bow', '1d+1'], [ids.crossbow, 'crossbow', '1d+3']]) {
  test('existing Rated12 ' + category + ' remains outside new Attack automation', () => {
    const i = input(id, 11, category), before = JSON.stringify(i.actor.system);
    const existing = resolveLTBowBase({ actor: i.actor, modeId: id, configuration: { ratedST: 12, drawMethod: 'hand' } });
    const r = evaluate({ ...i, drawingProfile: { ...existing.drawing, ratedST: existing.ratedST } });
    assert.equal(r.penalty.applicabilityStatus, 'OUT_OF_SCOPE'); assert.equal(r.penalty.desired, null); assert.equal(r.penalty.delta, null);
    assert.equal(r.strengthForDrawing.ratedST, 12); assert.equal(existing.dice, formula); assert.equal(JSON.stringify(i.actor.system), before);
  });
}
test('Handling, Damage, and Drawing reuse separate existing strength evidence; no automatic subtype stacking', () => {
  const i = input(ids.longsword, 8, 'melee');
  i.actor.system.ads = { s: { name: 'Striking ST', level: 3 }, l: { name: 'Lifting ST', level: 5 }, a: { name: 'Arm ST', level: 2 } };
  i.actor.system.swing = basicStrengthDamage(11, 'swing'); i.actor.system.thrust = basicStrengthDamage(11, 'thrust');
  const state = readActorStrength(i.actor), damage = resolveStrengthDamage(i.actor, 'swing');
  const r = evaluate({ ...i, actorStrength: state, damageProfile: damage, drawingProfile: { effectiveST: state.kinds.lifting.effective, source: 'LT83' }, selection: { applyArmST: true } });
  assert.equal(r.strengthForHandling.value, 8); assert.equal(r.strengthForDamage.value, 11); assert.equal(r.strengthForDrawing.value, 13);
  assert.equal(r.penalty.desired, -2);
  assert.equal(evaluate({ ...i, conditions: { handlingKind: 'arm' } }).penalty.applicabilityStatus, 'MANUAL');
});
test('readActorStrength module ST adjustment is reused without writing Actor flags', () => {
  const i = input(ids.longsword, 8, 'melee');
  i.actor.getFlag = (s, k) => k === 'strengthAdjustments' ? { revision: 2, modifiers: { st: 2 } } : undefined;
  i.actor.setFlag = () => { throw Error('write forbidden'); };
  const r = evaluate(i); assert.equal(r.strengthForHandling.value, 10); assert.equal(r.penalty.desired, 0); assert.equal(r.strengthForHandling.revision, 2);
});
test('known zero is distinct from unknown Actor ST, unknown kind, and work-only ST', () => {
  const i = input();
  const unknown = actor(); delete unknown.system.attributes.ST;
  for (const patch of [{ actor: unknown }, { category: null }, { mode: { ...catalogs.getMode(ids.ak), ht_work_only: true } }])
    assert.equal(evaluate({ ...i, ...patch }).penalty.desired, null);
  assert.equal(evaluate(input(ids.ak, 9)).penalty.desired, 0);
  const opaque = evaluate({ ...input(ids.ak, 9), provenance: { status: 'UNKNOWN' } });
  assert.equal(opaque.penalty.desired, 0); assert.equal(opaque.penalty.delta, null);
});
test('mounted evidence cannot erase an unrelated invalid grip or special rule', () => {
  const i = input(ids.mount), support = { confirmedType: 'mounted', confirmed: true, installed: true, inUse: true, ready: true, evidence: proof(i) };
  for (const patch of [{ selection: { grip: 'invalid' } }, { conditions: { specialRule: 'unresolved' } }]) {
    const r = evaluate({ ...i, support, ...patch }); assert.equal(r.penalty.desired, null); assert.equal(r.penalty.delta, null);
  }
});
test('explicit actor strength snapshot cannot be borrowed from another actor or marked unsupported', () => {
  const i = input(), state = readActorStrength(i.actor);
  assert.equal(evaluate({ ...i, actorStrength: { ...state, actorId: 'other' } }).penalty.delta, null);
  const unsupported = { ...state, kinds: { ...state.kinds, st: { ...state.kinds.st, supported: false } } };
  assert.equal(evaluate({ ...i, actorStrength: unsupported }).penalty.desired, null);
});
test('result and proposed snapshot evidence are deterministic, serializable, detached, and omit private data', () => {
  const i = input(ids.longsword, 8, 'melee'), privateObject = { notes: 'PRIVATE-ACTOR-NOTE', secret: 'PRIVATE-SECRET' }; privateObject.self = privateObject;
  i.provenance = { ...clean(i), privateObject };
  i.damageProfile = { effectiveST: 8, strengthKind: 'st+striking', baseFormula: '1d-2', source: 'B16', actor: i.actor, privateObject };
  i.actor.setFlag = () => { throw Error('setFlag forbidden'); }; freeze(i);
  const before = JSON.stringify(i.actor.system), r = evaluate(i), again = evaluate(i), snapshot = createWeaponStrengthEvidence(r);
  assert.deepEqual(r, again); assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
  assert.equal(JSON.stringify(r).includes('PRIVATE-'), false); assert.equal(snapshot.transmittedDelta, null); assert.equal(snapshot.proposedDelta, -2);
  snapshot.weaponIdentity.instanceId = 'changed'; assert.equal(r.weaponIdentity.instanceId, 'one');
  snapshot.source.ruleReferences.push('changed'); assert.deepEqual(r.source.ruleReferences, ['B270']);
  assert.equal(JSON.stringify(i.actor.system), before);
});
test('ST-P1 melee integration and independent +P/ranged calculation preserve their boundaries', async () => {
  const before = globalThis.OleGURPSQOL; globalThis.OleGURPSQOL = { catalogs };
  try {
    for (const [id, st, legacyLevel, desired] of [[ids.longsword, 8, 14, -2], [ids.glaive, 6, 15, -1]]) {
      const a = actor(st), draft = new StandaloneWeaponDraft({ actor: a, catalogs, type: 'melee' });
      draft.selectModel(catalogs.getEquipmentForMode(id).equipment_id); draft.modeIds = new Set([id]);
      const record = await new StandaloneWeaponService(a, catalogs).save(draft), raw = readStandaloneAttack(a, record.id, id);
      const old = resolveMeleeProfile({ actor: a, attack: raw }), system = JSON.stringify(a.system);
      const i = { ...input(id, st, 'melee'), actor: a, instance: record, weaponIdentity: { modeId: id },
        currentMeleeStrength: old.meleeProfile.strength };
      i.provenance = { status: 'UNKNOWN' }; const r = resolver.resolve(i);
      assert.equal(r.penalty.desired, desired); assert.equal(r.penalty.delta, null);
      assert.equal(resolveMeleeProfile({ actor: a, attack: raw }).level, legacyLevel); assert.equal(JSON.stringify(a.system), system);
    }
    const a = actor(8), attack = { st: '9\u2020', level: 16 };
    assert.equal(weaponStrengthPenalty(attack, a), 0);
    // ST-P2: a scalar +P flag alone proves neither weapon identity nor a clean base.
    assert.equal(weaponStrengthPenalty({ ...attack, ammunitionRequiredStrength: { value: 10, application: 'existing-fire-skill-channels' } }, a), 0);
  } finally { globalThis.OleGURPSQOL = before; }
});
