import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {openReactionRoll} from '../scripts/tools/reaction.js';
import {SOCIAL_SKILLS, SOCIAL_MODIFIERS, listSocialSkills, classifySocialRoll, socialOutcomeHTML,
  rollSocialSkill, openSocialReaction} from '../scripts/tools/social-reaction.js';

const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
const skillTree = () => Object.fromEntries(Object.entries(SOCIAL_SKILLS).map(([family, skill], i) =>
  [String(i).padStart(5, '0'), {name: skill.name + (family === 'savoirFaire' ? ' (Military)' : ''), uuid: family, level: 14}]));
function fixture(total = 10) {
  const messages = [], dialogs = [], errors = [], warnings = [], evaluated = [], writes = [];
  const actor = {id: 'owned', name: 'QA <Actor>', isOwner: true, system: {skills: skillTree()},
    update: () => assert.fail('Actor update forbidden'), setFlag: () => assert.fail('Actor flag write forbidden')};
  const runtime = {game: {user: {id: 'player', isGM: false, character: actor}, settings: {get: () => 'publicroll'}},
    canvas: {tokens: {controlled: []}, get targets() {assert.fail('Targets must never be inspected');}},
    foundry: {utils: {escapeHTML: escape}, applications: {api: {DialogV2: {input: async options => {
      dialogs.push(options); return {skillPath: 'system.skills.00000', reaction: 1, skill: 2, situation: -1};
    }}}}},
    ui: {notifications: {error: message => errors.push(message), warn: message => warnings.push(message)}},
    Roll: class {
      constructor(formula) {assert.equal(formula, '3d6'); this.formula = formula;}
      async evaluate() {evaluated.push(this); this.total = total; return this;}
      async render() {return `<div class="dice-roll"><h4 class="dice-total">${this.total}</h4></div>`;}
    },
    ChatMessage: {getSpeaker: ({actor: selected} = {}) => selected ? {actor: selected.id, alias: selected.name} : {},
      applyRollMode: (data, mode) => {data.rollMode = mode;},
      create: async data => {const message = {id: 'chat-' + messages.length, ...data}; messages.push(message); return message;}}};
  return {runtime, actor, messages, dialogs, errors, warnings, evaluated, writes};
}

// Captured from the unchanged legacy macro before this feature was added.
const legacyHashes = [
  [-11, 'b571356b35448d932609dacb7443c1a8a09e36c16367006c2cd2d24c19f68190'],
  [-8, '892a33c37c87b01d7d88d818cd7e346c94c8904a9b7eee411c2d3cd8c4d1cad6'],
  [-5, '721c8bfaea235ede33d3f2d4a37d9153d78fc27c653a4fce66747c1f25af9d10'],
  [-2, '1c197b33eb6166a96852c5c009dadac4332a0e36b0944a7f439c7526c5998699'],
  [1, '27d0098b5efed9d9d278348b675cd1f39b4c5b686a37cf8e30302f870dfc2dfe'],
  [4, 'bfe550f2d4d2087f509a94ed064301a618770d90f6c99ae933e260820b652bc9'],
  [7, '5fb35dbf6d135bb7125989aebaf77d8f0e4ea2f0972c6d6e337c56affc9ff5f3'],
  [10, '4f3f6bbf538627040597299f8ad00dfacf4493fc4c67e2ac7a4ca49c60866eff']
];
for (const [modifier, hash] of legacyHashes) test(`legacy reaction modifier ${modifier}: all table text and chat HTML remain byte-identical`, async () => {
  const fx = fixture();
  Object.assign(globalThis, fx.runtime);
  game.user.getFlag = () => ({modifier}); game.user.setFlag = async (...args) => fx.writes.push(args);
  foundry.applications.api.DialogV2.input = async options => {fx.dialogs.push(options); return {modifier};};
  await openReactionRoll();
  assert.equal(createHash('sha256').update(fx.messages[0].content).digest('hex'), hash);
  assert.equal(fx.evaluated.length, 1); assert.equal(fx.messages.length, 1);
  assert.deepEqual(fx.writes, [['world', 'gurpsReactionRoll', {modifier}]]);
  assert.equal(fx.dialogs[0].ok.label, 'Бросить'); assert.equal(fx.dialogs[0].modal, false);
  assert.equal(fx.dialogs[0].buttons[0].label, 'Социальный навык');
});

for (const [target, total, outcome] of [
  [3,3,'criticalSuccess'], [3,4,'criticalSuccess'], [3,5,'failure'], [14,5,'success'], [15,5,'criticalSuccess'],
  [15,6,'success'], [16,6,'criticalSuccess'], [14,14,'success'], [14,15,'failure'],
  [6,15,'failure'], [6,16,'criticalFailure'], [7,16,'failure'], [7,17,'criticalFailure'],
  [15,17,'criticalFailure'], [16,17,'failure'], [20,17,'failure'], [20,18,'criticalFailure'],
  [30,18,'criticalFailure'], [3,13,'criticalFailure'], [3,12,'failure']
]) test(`B347-348 target ${target}, 3d6=${total}: ${outcome}`, () => {
  const result = classifySocialRoll(total, target);
  assert.equal(result.outcome, outcome); assert.equal(result.margin, target - total);
  assert.equal(result.success, outcome === 'success' || outcome === 'criticalSuccess');
  if (result.success && result.margin < 0 || !result.success && result.margin > 0) assert.match(result.degree, /Автоматический/);
});

test('B345: no ordinary social roll below effective skill 3 and no clamping or rule-of-16 cap', async () => {
  const fx = fixture(10), path = 'system.skills.00000';
  await assert.rejects(rollSocialSkill({actor: fx.actor, skillPath: path, modifiers: {situation: -12}}, fx.runtime), /ниже 3/);
  assert.equal(fx.evaluated.length, 0);
  const msg = await rollSocialSkill({actor: fx.actor, skillPath: path, modifiers: {situation: 16}}, fx.runtime);
  assert.equal(msg.flags['olegurps-qol'].socialSkillRoll.effectiveSkill, 30);
});

test('only the six supported skills and real numeric sheet levels are offered, including collapsed skills and translations', () => {
  const fx = fixture();
  Object.assign(fx.actor.system.skills, {
    folder: {name: 'Social', contains: {a: {name: 'Этикет (Высшее общество)', originalName: 'Savoir-Faire (High Society)', level: '13'},
      b: {name: 'Streetwise-ish', level: 20}, c: {name: 'Diplomacy', type: 'technique', level: 20}},
      collapsed: {a: {name: 'Sex Appeal', level: {value: 12}}}},
    blank: {name: 'Diplomacy', level: ''}, invalid: {name: 'Intimidation', level: 'Will-5'},
    unrelated: {name: 'Acting', level: 20}
  });
  const skills = listSocialSkills(fx.actor);
  assert.equal(skills.length, 8); assert.equal(skills[6].family, 'savoirFaire'); assert.equal(skills[6].level, 13);
  assert.equal(skills[7].path, 'system.skills.folder.collapsed.a');
  assert.equal(new Set(skills.map(s => s.family)).size, 6);
});

for (const [family, definition] of Object.entries(SOCIAL_SKILLS)) {
  for (const [total, outcome] of [[10,'success'],[15,'failure'],[18,'criticalFailure'],[3,'criticalSuccess']])
    test(`${definition.name}: ${outcome} publishes one native roll and all four closed rule sections`, async () => {
      const fx = fixture(total), skill = listSocialSkills(fx.actor).find(s => s.family === family), before = JSON.stringify(fx.actor.system);
      const msg = await rollSocialSkill({actor: fx.actor, skillPath: skill.path, modifiers: {reaction: 2, skill: -1, situation: -1}, note: '<img onerror=bad>'}, fx.runtime);
      const saved = msg.flags['olegurps-qol'].socialSkillRoll;
      assert.equal(saved.outcome, outcome); assert.equal(saved.skill.name, skill.name); assert.equal(saved.effectiveSkill, 14);
      assert.deepEqual(saved.modifiers, {reaction: 2, skill: -1, situation: -1}); assert.equal(saved.modifier, 0);
      assert.equal(msg.rolls.length, 1); assert.equal(fx.evaluated.length, 1); assert.equal(fx.messages.length, 1);
      assert.equal(msg.rolls[0].formula, '3d6'); assert.equal(msg.speaker.actor, fx.actor.id);
      assert.equal(msg.rollMode, 'publicroll'); assert.match(msg.content, /QA &lt;Actor&gt;/);
      assert.match(msg.content, /&lt;img onerror=bad&gt;/); assert.doesNotMatch(msg.content, /<img/);
      assert.match(msg.content, /Фактический исход проверки/); assert.match(msg.content, /Степень (успеха|провала)/);
      assert.doesNotMatch(msg.content, /Это результат только личной проверки/);
      const html = socialOutcomeHTML(family);
      assert.equal((html.match(/<details\b/g) ?? []).length, 4); assert.doesNotMatch(msg.content, /<details\b[^>]*\bopen(?:\s|=|>)/);
      assert.deepEqual([...html.matchAll(/<summary>([^<]+)<\/summary>/g)].map(m => m[1]), ['Успех','Провал','Критический провал','Критический успех']);
      assert.equal(JSON.stringify(fx.actor.system), before);
      const frozen = JSON.stringify(saved), frozenHTML = msg.content;
      fx.actor.name = 'Changed'; fx.actor.system.skills[skill.path.split('.').at(-1)].level = 30;
      assert.equal(JSON.stringify(saved), frozen); assert.equal(msg.content, frozenHTML);
    });
}

test('skill-specific rules preserve Diplomacy safety, Intimidation fear, Sex Appeal Very Good and applicability', () => {
  assert.match(SOCIAL_SKILLS.diplomacy.failure, /лучшую/); assert.match(SOCIAL_SKILLS.diplomacy.criticalFailure, /сохраняется/);
  assert.match(SOCIAL_SKILLS.intimidation.criticalSuccess, /проверки страха/); assert.match(SOCIAL_SKILLS.intimidation.criticalSuccess, /критическом провале его Will/);
  assert.match(SOCIAL_SKILLS.intimidation.failure, /предварительного состязания Fast-Talk/);
  assert.match(SOCIAL_SKILLS.sexAppeal.success, /Очень хорошую/); assert.match(SOCIAL_SKILLS.sexAppeal.failure, /одна попытка/);
  assert.match(SOCIAL_SKILLS.savoirFaire.criticalFailure, /специализации/); assert.match(SOCIAL_SKILLS.streetwise.success, /преступного мира/);
});

test('PLAYER OWNER and GM use the same single-roll path; non-owner is rejected', async () => {
  for (const isGM of [true,false]) {
    const fx = fixture(); fx.runtime.game.user.isGM = isGM;
    await openSocialReaction(fx.runtime); assert.equal(fx.messages.length, 1); assert.equal(fx.evaluated.length, 1);
  }
  const fx = fixture(); fx.actor.isOwner = false;
  await assert.rejects(rollSocialSkill({actor: fx.actor, skillPath: 'system.skills.00000'}, fx.runtime), /владельца/);
  await openSocialReaction(fx.runtime); assert.equal(fx.evaluated.length, 0); assert.equal(fx.errors.length, 1);
});

test('social button branches without legacy rolls or settings writes', async () => {
  const fx = fixture(); Object.assign(globalThis, fx.runtime);
  game.user.getFlag = () => ({modifier: 5}); game.user.setFlag = () => assert.fail('Legacy preference must not be written');
  let calls = 0;
  foundry.applications.api.DialogV2.input = async options => {
    fx.dialogs.push(options); return calls++ === 0 ? options.buttons[0].callback() : {skillPath: 'system.skills.00000'};
  };
  await openReactionRoll(); assert.equal(fx.evaluated.length, 1); assert.equal(fx.messages.length, 1);
  assert.ok(fx.messages[0].flags['olegurps-qol'].socialSkillRoll);
});

test('cancel, missing skills, multiple controlled characters and invalid values never roll', async () => {
  const fx = fixture(); fx.runtime.foundry.applications.api.DialogV2.input = async () => null;
  await openSocialReaction(fx.runtime);
  fx.actor.system.skills = {}; await openSocialReaction(fx.runtime); assert.equal(fx.warnings.length, 1);
  fx.runtime.canvas.tokens.controlled = [{actor: fx.actor},{actor: fx.actor}]; await openSocialReaction(fx.runtime); assert.equal(fx.errors.length, 1);
  fx.actor.system.skills = skillTree();
  for (const value of ['1.5','abc',Infinity]) await assert.rejects(rollSocialSkill({actor: fx.actor, skillPath: 'system.skills.00000', modifiers: {reaction: value}}, fx.runtime), /целыми/);
  assert.equal(fx.evaluated.length, 0); assert.equal(fx.messages.length, 0);
});

test('stale selected skill identity cannot silently bind to a different sheet row', async () => {
  const fx = fixture(), expectedSkill = listSocialSkills(fx.actor)[0];
  fx.actor.system.skills['00000'] = {name: 'Diplomacy', uuid: 'different', level: 18};
  await assert.rejects(rollSocialSkill({actor: fx.actor, skillPath: expectedSkill.path, expectedSkill}, fx.runtime), /изменился/);
  assert.equal(fx.evaluated.length, 0);
});

test('new workflow has no target selection, NPC/Actor writes, extra reaction roll or automatic contest', () => {
  const source = readFileSync(new URL('../scripts/tools/social-reaction.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.targets\b|\.setTarget\(|\.update\(|\.setFlag\(|\.unsetFlag\(|\.performAction\(/);
  assert.equal((source.match(/new runtime\.Roll\(/g) ?? []).length, 1);
  assert.deepEqual(Object.keys(SOCIAL_MODIFIERS), ['reaction','skill','situation']);
});

test('Russian UI is identical under ru/en and the four collapsed explanations remain', async () => {
  const contents = [];
  for (const lang of ['ru','en']) {
    const fx = fixture(); fx.runtime.game.i18n = {lang};
    await openSocialReaction(fx.runtime); contents.push(fx.dialogs[0].content);
    assert.equal((fx.messages[0].content.match(/data-social-outcome=/g) ?? []).length, 4);
    assert.doesNotMatch(fx.dialogs[0].content, /class="hint"|data-social-hint/);
  }
  assert.equal(contents[0], contents[1]);
});
