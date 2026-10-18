import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDoubleKnockback as calc, knockbackHits, knockbackTargetContext,
  reportDoubleKnockback, installDoubleKnockback } from '../scripts/tools/double-knockback.js';

const hit = (damage = 31, damageType = 'cr', damageModifier = 'dkb') =>
  ({ damage, damageType, damageModifier, armorDivisor: 0.25, roll: { total: damage } });
const message = (payload = [hit()]) => ({ id: 'damage', visible: true, isContentVisible: true,
  speaker: { actor: 'attacker' }, flags: { gurps: { transfer: { type: 'damageItem', payload } } } });
const target = (st, name = 'Target') => ({ id: name, name, actor: {
  system: { attributes: { ST: { value: st, import: 99 } } }, testUserPermission: () => true } });
function runtime(targets = [], answers = []) {
  const created = [], prompts = [];
  return { created, prompts, game: { user: { id: 'owner', isGM: false, targets: new Set(targets) },
    scenes: new Map(), messages: new Map() }, canvas: { tokens: new Map(targets.map(t => [t.id, t])) },
  foundry: { applications: { api: { DialogV2: { wait: async options => {
    prompts.push(options); return answers.shift() ?? false;
  } } } } }, ChatMessage: { create: async data => { created.push(data); return data; } } };
}

test('B104/B378: round full ST-2 intervals then double distance, never basic damage', () => {
  assert.deepEqual(calc(31, 10), { ordinary: 3, yards: 6, balancePenalty: -5 });
  for (const st of [1, 2, 3]) assert.equal(calc(31, st).yards, 62);
  assert.equal(calc(7, 10).yards, 0); assert.equal(calc(0, 1).yards, 0);
  assert.equal(calc(8, 10).yards, 2); assert.equal(calc(15, 10).yards, 2);
  for (const st of [0, -1, NaN, '', null]) assert.throws(() => calc(31, st));
  assert.throws(() => calc(31, 10, 'pi')); assert.throws(() => calc(31, 10, 'cut'));
  assert.equal(calc(31, 10, 'cut', true).yards, 6);
  assert.equal(calc(31, 10, 'cut', false).yards, 0);
});

test('structured GGA basic damage ignores divisor, injury and HTML, keeps each hit/component separate', () => {
  const m = message([hit(31), hit(40, 'cut'), hit(100, 'burn'), hit(500, 'cr', null), hit(9)]);
  m.content = '9999'; m.rolls = [{ total: 9999 }]; m.injury = 9999;
  assert.deepEqual(knockbackHits(m), [
    { index: 0, damage: 31, type: 'cr' }, { index: 1, damage: 40, type: 'cut' },
    { index: 4, damage: 9, type: 'cr' }]);
  for (const entry of [hit(1, 'pi'), hit(1, 'cr', 'dbt'), hit(NaN), hit(-1), hit('31')])
    assert.deepEqual(knockbackHits(message([entry])), []);
});

test('ST uses current target modifiers; never attacker; saved scene target wins current selection', () => {
  const rt = runtime([target(10)]), m = message();
  assert.equal(knockbackTargetContext(m, rt).strength, 10);
  rt.game.user.targets.add(target(20, 'second'));
  assert.equal(knockbackTargetContext(m, rt).strength, null);
  m.flags['olegurps-qol'] = { knockbackTargets: { sceneId: 'past', tokenIds: ['saved'] } };
  rt.game.scenes.set('past', { tokens: new Map([['saved', target(12)]]) });
  assert.equal(knockbackTargetContext(m, rt).strength, 12);
  m.flags['olegurps-qol'].knockbackTargets.tokenIds.push('missing');
  assert.equal(knockbackTargetContext(m, rt).strength, null);
  for (const st of [null, '', 0, 'bad']) assert.equal(knockbackTargetContext(message(), runtime([target(st)])).strength, null);
  const hidden = target(10); hidden.actor.testUserPermission = () => false;
  assert.equal(knockbackTargetContext(message(), runtime([hidden])).strength, null);
});

test('OWNER publishes result from historical roll repeatedly with no Actor/resource writes or reroll', async () => {
  const rt = runtime([target(10)]), m = message(), before = structuredClone(m);
  const one = await reportDoubleKnockback(m, rt), two = await reportDoubleKnockback(m, rt);
  assert.equal(rt.created.length, 2); assert.deepEqual(one, two); assert.deepEqual(m, before);
  assert.match(one.content, /6 ярдов \(6 гексов\)/); assert.match(one.content, /: -5/);
  assert.match(one.content, /<details[^>]*><summary>/); assert.doesNotMatch(one.content, /<details[^>]* open/);
  assert.equal(rt.prompts.length, 0);
});

test('no Target or invalid ST prompts in Russian; cancel/X/Esc publish nothing', async () => {
  for (const answer of [false, null, 'cancel', 'calculate']) {
    const rt = runtime([], [answer]); assert.equal(await reportDoubleKnockback(message(), rt), null);
    assert.equal(rt.created.length, 0); assert.equal(rt.prompts[0].window.title, 'ST цели');
  }
  const rt = runtime([target(null)], [{ strength: 10, cuttingStopped: null }]);
  assert.match((await reportDoubleKnockback(message(), rt)).content, /6 ярдов/);
});

test('cutting requires explicit DR condition; penetrating cutting and subthreshold crushing have no fall roll', async () => {
  for (const [m, answers] of [[message([hit(31, 'cut')]), [{ strength: 10, cuttingStopped: false }]],
    [message([hit(7)]), []]]) {
    const rt = runtime([target(10)], answers), result = await reportDoubleKnockback(m, rt);
    assert.match(result.content, /Цель не отброшена/); assert.doesNotMatch(result.content, /Проверка по/);
  }
  const rt = runtime([target(10)], [{ strength: 10, cuttingStopped: true }]);
  assert.match((await reportDoubleKnockback(message([hit(31, 'cut')]), rt)).content, /6 ярдов/);
});

test('multiple hits explicitly select one, not their sum; preserve private recipients', async () => {
  const m = message([hit(8), hit(31), hit(100, 'burn')]); m.whisper = ['owner']; m.blind = true;
  const rt = runtime([target(10)], [{ index: '0' }]);
  const result = await reportDoubleKnockback(m, rt);
  assert.match(result.content, /2 ярдов/); assert.deepEqual(result.whisper, ['owner']); assert.equal(result.blind, true);
  assert.equal(result.flags['olegurps-qol'].knockbackResult.hitIndex, 0);
  const cancelled = runtime([target(10)], [false]);
  assert.equal(await reportDoubleKnockback(m, cancelled), null); assert.equal(cancelled.created.length, 0);
  m.visible = false; assert.equal(await reportDoubleKnockback(m, rt), null);
});

test('render hooks install once, append one own button and support persisted native Damage', () => {
  const hooks = new Map(), rt = runtime(); let next = 0, button;
  rt.Hooks = { on: (name, fn) => { const id = ++next; hooks.set(id, { name, fn }); return id; },
    off: (_name, id) => hooks.delete(id) };
  rt.document = { querySelectorAll: () => [], createElement: () => ({ dataset: {}, addEventListener() {} }) };
  const native = { untouched: true };
  const root = { querySelector: selector => selector === '[data-olegurps-dkb]' ? button : null,
    append: b => { button = b; } };
  const install = installDoubleKnockback(rt); assert.equal(installDoubleKnockback(rt), install);
  const mark = [...hooks.values()].find(x => x.name === 'renderChatMessageHTML').fn;
  mark(message(), root); const first = button; mark(message(), root);
  assert.equal(button, first); assert.equal(button.textContent, 'Рассчитать dkb'); assert.equal(native.untouched, true);
  for (const lang of ['ru', 'en']) {
    rt.game.i18n = { lang }; button = null; mark(message(), root);
    assert.equal(button.textContent, 'Рассчитать dkb');
  }
  const capture = [...hooks.values()].find(x => x.name === 'preCreateChatMessage').fn;
  const targetData = { sceneId: 'attack-scene', tokenIds: ['attack-target'] };
  rt.game.messages.set('attack', { flags: { 'olegurps-qol': { knockbackTargets: targetData } } });
  const damage = message(); damage.flags['olegurps-qol'] = { damageLink: { originatingAttackMessageId: 'attack' } };
  let patch; damage.updateSource = value => { patch = value; }; capture(damage);
  assert.deepEqual(patch['flags.olegurps-qol.knockbackTargets'], targetData);
  patch = null; const ordinary = message([hit(1, 'pi')]); ordinary.updateSource = value => { patch = value; };
  capture(ordinary); assert.equal(patch, null);
  install.uninstall(); assert.equal(hooks.size, 0);
});
