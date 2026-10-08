import test from "node:test";
import assert from "node:assert/strict";
import { resolveCombatCalculation, resolveRelativeTechniqueLevel } from "../scripts/tools/combat-calculation-engine.js";
import { getCombatRules } from "../scripts/tools/combat-technique-registry.js";
import { listRangedGoverningSkills, bindingForGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { createTargetedAttackContext, createMeleeTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { resolveMeleeCombatCalculation, getRapidStrikePenalty, executeNativeMeleeAttack } from "../scripts/tools/melee-service.js";
import { executePreparedGgaRoll, executePreparedSkillRoll } from "../scripts/tools/prepared-gga-roll.js";

const channel = (id, value) => ({ id, value, label: id });
const synthetic = (id, target, value, priority = 10) => ({ id, combatType: "both",
  kind: "learned-technique", activation: "manual", channel: target, priority,
  resolve: () => ({ value, explanation: id + " resolved" }) });

function generic(rules, count = 4) {
  return resolveCombatCalculation({ combatType: "melee", baseAttackLevel: 15,
    channels: ["a", "b", "c", "d"].slice(0, count).map(id => channel(id, -5)), rules });
}

test("one, two, three, and four independent techniques compose without duplicated base channels", () => {
  const ids = ["a", "b", "c", "d"];
  const rules = ids.map((id, index) => synthetic("technique" + index, id, -index - 1));
  for (let count = 1; count <= 4; count += 1) {
    const result = generic(rules.slice(0, count), count);
    const expected = 15 - count * (count + 1) / 2;
    assert.equal(result.effectiveSkill, expected);
    assert.equal(result.channels.length, count);
    assert.equal(result.activeRules.length, count);
    assert.equal(result.modifiers.length, count);
    assert.ok(result.channels.every(entry => entry.baseValue === -5 && entry.resolver));
    assert.deepEqual(generic([...rules.slice(0, count)].reverse(), count).channels,
      result.channels);
  }
});

test("channel conflict uses explicit priority and tied replacements fail deterministically", () => {
  const first = synthetic("first", "a", -2, 10);
  const second = synthetic("second", "a", -1, 20);
  for (const rules of [[first, second], [second, first]]) {
    const result = generic(rules, 1);
    assert.equal(result.channels[0].resolvedValue, -1);
    assert.equal(result.channels[0].resolver, "second");
    assert.deepEqual(result.rejectedRules.map(entry => entry.reason), ["channel-priority"]);
  }
  assert.throws(() => generic([first, synthetic("third", "a", -1, 10)], 1),
    /Conflicting combat rules/);
});

test("incompatibility rejects the lower-priority rule, and metadata stays separate from skill", () => {
  const telegraphic = { ...synthetic("telegraphic", "a", 4, 30),
    incompatibilities: ["deceptive"], resolve: () => ({ value: 4, metadata: { defenseModifier: 2 } }) };
  const deceptive = synthetic("deceptive", "b", -2, 20);
  const result = generic([deceptive, telegraphic], 2);
  assert.equal(result.effectiveSkill, 15 + 4 - 5);
  assert.deepEqual(result.rejectedRules, [{ id: "deceptive", reason: "incompatible", with: "telegraphic" }]);
  assert.equal(result.metadata.defenseModifier, 2);
});

test("relative technique level uses the concrete attack base for melee and ranged", () => {
  assert.deepEqual(resolveRelativeTechniqueLevel({ techniqueLevel: 12,
    governingSkillLevel: 14, baseAttackLevel: 15 }),
  { relativeLevel: -2, attackTechniqueLevel: 13 });
  assert.deepEqual(resolveRelativeTechniqueLevel({ techniqueLevel: 17,
    governingSkillLevel: 13, baseAttackLevel: 14 }),
  { relativeLevel: 4, attackTechniqueLevel: 18 });
  assert.equal(resolveRelativeTechniqueLevel({ baseAttackLevel: 15 }), null);
});

function rangedActor({ quick = 13, cqb = 17, chs = 16, face = 11, vitals = 12 } = {}) {
  const skills = [
    { name: "Guns/TL9 (Rifle)", uuid: "rifle", level: 13 },
    { name: "Guns/TL9 (Pistol)", uuid: "pistol", level: 13 },
    ...(quick == null ? [] : [{ name: "Quick-Shot (Rifle)", type: "TECHNIQUE", level: quick }]),
    ...(cqb == null ? [] : [{ name: "Close-Quarters Battle (Rifle)", type: "TECHNIQUE", level: cqb }]),
    ...(chs == null ? [] : [{ name: "Close-Hip Shooting (Rifle)", type: "TECHNIQUE", level: chs }]),
    ...(face == null ? [] : [{ name: "Targeted Attack (Guns (Rifle)/Face)", type: "TECHNIQUE",
      level: face, prerequisite: "Guns/TL9 (Rifle)", targetLocation: "Face" }]),
    ...(vitals == null ? [] : [{ name: "Targeted Attack (Guns (Rifle)/Vitals)", type: "TECHNIQUE",
      level: vitals, prerequisite: "Guns/TL9 (Rifle)", targetLocation: "Vitals" }])
  ];
  return { system: { attributes: { PER: { value: 10 } }, skills: Object.fromEntries(skills.map((x, i) => [i, x])) } };
}
const locations = {
  face: { zoneId: "face", canonicalKeys: ["face"], label: "Face", penalty: -5 },
  vitals: { zoneId: "vitals", canonicalKeys: ["vitals"], label: "Vitals", penalty: -3 },
  torso: { zoneId: "torso", canonicalKeys: ["torso"], label: "Torso", penalty: 0 }
};
function rangedFixture(actor, level = 13) {
  const governingSkill = listRangedGoverningSkills(actor).find(entry => entry.specialty === "rifle");
  const attack = { name: "AK", level, rof: "4", acc: "0", data: { bulk: -5 },
    governingSkillBinding: bindingForGoverningSkill(governingSkill) };
  const token = { actor };
  const fireService = new FireService({ actor, token });
  const fire = createFireControlContext({ token, fireService });
  const ta = createTargetedAttackContext({ actor, attack });
  const bands = [{ index: 0, max: 5, penalty: 0, label: "5 yds" },
    { index: 1, max: 30, penalty: -3, label: "30 yds" }];
  const targeting = { getSelection: id => locations[id] ?? locations.torso };
  const values = { rangeIndex: 0, manualRangeSelected: true, moveAndAttack: true,
    closeHipShooting: true, rangedRapidStrike: true, shots: 1,
    hitLocationId: "face", visibility: { mode: "normal" } };
  return { actor, attack, fireService, fire, ta, bands, targeting, values,
    details: () => fire.calculateEffectiveFireSkillDetails(attack, values, bands, targeting, ta) };
}
function withRangedRuntime(fn) {
  const previous = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try { return fn(); } finally { globalThis.game = previous.game; globalThis.GURPS = previous.GURPS; }
}

test("full ranged composition resolves four techniques/options to effective 8", () => withRangedRuntime(() => {
  const fixture = rangedFixture(rangedActor());
  const result = fixture.details();
  const channels = Object.fromEntries(result.combatCalculation.channels.map(entry => [entry.id, entry]));
  assert.deepEqual([result.baseSkill, channels.rangedRapidStrike.resolvedValue,
    channels.hitLocation.resolvedValue, channels.moveAndAttack.resolvedValue,
    channels.closeCombatBulk.resolvedValue, result.effectiveSkill],
    [13, 0, -2, -1, -2, 8]);
  assert.equal(result.combatCalculation.activeRules.length, 4);
  assert.equal(result.combatCalculation.modifiers.reduce((sum, entry) => sum + entry.value, 0), -5);
  assert.ok(result.combatCalculation.channels.every(entry =>
    entry.id !== "rangedRapidStrike" || entry.baseValue === -6));
}));

test("ranged partial levels, absent and mismatched techniques keep independent channels", () => withRangedRuntime(() => {
  const partial = rangedFixture(rangedActor({ quick: 11, cqb: 15, chs: 14, face: 10, vitals: 12 }));
  let result = partial.details();
  const get = id => result.combatCalculation.channels.find(entry => entry.id === id).resolvedValue;
  assert.deepEqual([get("rangedRapidStrike"), get("moveAndAttack"), get("closeCombatBulk"), get("hitLocation")],
    [-2, -3, -4, -3]);
  partial.values.hitLocationId = "vitals";
  result = partial.details();
  assert.equal(get("hitLocation"), -1);
  partial.values.hitLocationId = "face";
  partial.values.rangeIndex = 1;
  result = partial.details();
  assert.equal(result.closeQuartersBattle, null);
  assert.equal(get("moveAndAttack"), -5);
  const absent = rangedFixture(rangedActor({ quick: null, cqb: null, chs: null, face: null, vitals: null }));
  absent.values.closeHipShooting = false;
  result = absent.details();
  assert.deepEqual([result.combatCalculation.channels.find(x => x.id === "rangedRapidStrike").resolvedValue,
    result.combatCalculation.channels.find(x => x.id === "hitLocation").resolvedValue], [-6, -5]);
}));

test("melee composition uses attack level 15, TA relative -2, Rapid Strike mastery, maneuver and situation", () => {
  const actor = { system: { skills: {
    sword: { name: "Axe/Mace", uuid: "sword", level: 14 },
    ta: { name: "Targeted Attack (Axe/Mace /Face) (Axe/Mace)", type: "TECHNIQUE",
      level: 12, prerequisite: "Axe/Mace", targetLocation: "Face" }
  } } };
  const attack = { name: "Axe", mode: "Swung", level: 15, skill: "Axe/Mace" };
  const ta = createMeleeTargetedAttackContext({ actor, attack }).resolve({
    specialty: "id:sword", target: "face", basePenalty: -5 });
  assert.equal(ta?.effectivePenalty, -2);
  const result = resolveMeleeCombatCalculation({ actor, attack, baseSkill: attack.level,
    governingSkill: { name: "Axe/Mace", level: 14 }, hitLocationBasePenalty: -5,
    hitLocationLabel: "Face", targetedAttack: ta, rapidStrikePenalty: getRapidStrikePenalty(true),
    allOutAttack: true, allOutAttackMode: "determined", manualModifier: 1 });
  assert.deepEqual([result.baseSkill, result.channels.find(x => x.id === "hitLocation").resolvedValue,
    result.channels.find(x => x.id === "rapidStrike").resolvedValue,
    result.channels.find(x => x.id === "maneuverAttackBonus").resolvedValue,
    result.effectiveSkill], [15, -2, -3, 4, 15]);
  assert.equal(result.metadata.rapidStrikePenalty, -3);
  assert.equal(resolveMeleeCombatCalculation({ baseSkill: 15, rapidStrikePenalty: -6 }).effectiveSkill, 9);
});

test("melee Telegraphic suppresses Deceptive and Evaluate with explicit rule definitions", () => {
  const result = resolveCombatCalculation({ combatType: "melee", baseAttackLevel: 15,
    channels: [channel("telegraphicAttack", 0), channel("deceptiveAttack", 0), channel("evaluate", 0)],
    rules: getCombatRules("melee"), context: { telegraphicAttack: true,
      deceptivePenalty: -2, evaluateBonus: 3 } });
  assert.equal(result.effectiveSkill, 19);
  assert.deepEqual(result.rejectedRules.map(entry => entry.id).sort(), ["deceptiveAttack", "evaluate"]);
  assert.equal(result.metadata.defenseModifier, 2);
});

test("attack slots resolve independent Targeted Attacks without mutating shared context", () => withRangedRuntime(() => {
  const fixture = rangedFixture(rangedActor());
  fixture.values.closeHipShooting = false;
  fixture.values.moveAndAttack = false;
  fixture.values.rangedRapidStrike = false;
  const first = fixture.details();
  fixture.values.hitLocationId = "vitals";
  const second = fixture.details();
  assert.deepEqual([first.combatCalculation.channels.find(x => x.id === "hitLocation").resolvedValue,
    second.combatCalculation.channels.find(x => x.id === "hitLocation").resolvedValue], [-2, -1]);
  assert.equal(first.combatCalculation.channels.find(x => x.id === "hitLocation").resolvedValue, -2);
}));


test("ranged preview result drives actual roll modifiers once", async () => {
  const fixture = withRangedRuntime(() => rangedFixture(rangedActor()));
  const calculation = withRangedRuntime(() => fixture.details().combatCalculation);
  const previous = globalThis.GURPS;
  const stack = [];
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: stack },
    addModifier(value, desc) { stack.push({ modint: value, desc }); },
    clear() { stack.length = 0; } } };
  try {
    let captured;
    const service = new FireService({ actor: fixture.actor, token: { actor: fixture.actor },
      preparedRollExecutor: async options => { captured = { options, modifiers: [...stack] }; return { rolled: true }; } });
    await service.executeRangedAttack(fixture.attack, { baseSkill: 13,
      baseSkillName: "Ranged Weapon Level", effectiveSkill: calculation.effectiveSkill,
      combatCalculation: calculation, trademarkMoveBonus: 0,
      rangedRapidStrikePenalty: -6, quickShotBonus: 6,
      hitLocationPenalty: -2, moveAttackPenalty: -1,
      closeHipShooting: { closeHipBase: 11 } });
    assert.equal(captured.options.effectiveSkill, 8);
    assert.equal(captured.options.baseSkill, 13);
    assert.equal(captured.options.combatCalculation, calculation);
    assert.deepEqual(captured.modifiers.map(entry => entry.modint).sort((a, b) => a - b), [-2, -2, -1]);
    assert.equal(stack.length, 0);
  } finally { globalThis.GURPS = previous; }
});

test("Melee Assistant takes its base from the selected attack entry even when Governing Skill differs", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { MeleeAssistantApp } = await import("../scripts/tools/melee-assistant-app.js");
    const app = Object.create(MeleeAssistantApp.prototype);
    app.attack = { name: "Axe", level: 15 };
    app.sourceAttack = { name: "Axe", level: 15 };
    app.targetedAttackContext = { getSkillLevel: () => 14 };
    app.fireState = { governingSpecialty: "axe/mace" };
    assert.equal(app._getBaseSkillLevel(), 15);
  } finally { globalThis.foundry = previous; }
});


test("close combat Bulk without Close-Hip stays a separate contextual channel", () => withRangedRuntime(() => {
  const fixture = rangedFixture(rangedActor());
  fixture.values.moveAndAttack = false;
  fixture.values.closeHipShooting = false;
  fixture.values.closeCombat = true;
  fixture.values.rangedRapidStrike = false;
  fixture.values.hitLocationId = "torso";
  const result = fixture.details();
  assert.equal(result.combatCalculation.channels.find(entry => entry.id === "closeCombatBulk").resolvedValue, -5);
  assert.equal(result.effectiveSkill, 8);
}));

test("ranged relative techniques keep weapon level 14 as base when Guns is 13", () => withRangedRuntime(() => {
  const fixture = rangedFixture(rangedActor(), 14);
  const result = fixture.details();
  assert.equal(result.baseSkill, 14);
  assert.equal(result.governingSkill.level, 13);
  assert.deepEqual([result.closeQuartersBattle.weaponTechniqueLevel,
    result.closeHipShooting.weaponTechniqueLevel], [18, 17]);
  assert.equal(result.effectiveSkill, 9);
}));

test("melee slots resolve Face and Vitals Targeted Attack independently", () => {
  const actor = { system: { skills: {
    axe: { name: "Axe/Mace", uuid: "axe", level: 14 },
    face: { name: "Targeted Attack (Axe/Mace /Face) (Axe/Mace)", type: "TECHNIQUE",
      level: 12, prerequisite: "Axe/Mace", targetLocation: "Face" },
    vitals: { name: "Targeted Attack (Axe/Mace /Vitals) (Axe/Mace)", type: "TECHNIQUE",
      level: 13, prerequisite: "Axe/Mace", targetLocation: "Vitals" }
  } } };
  const attack = { name: "Axe", mode: "Swung", level: 15, skill: "Axe/Mace" };
  const ta = createMeleeTargetedAttackContext({ actor, attack });
  const build = (target, penalty, slot) => resolveMeleeCombatCalculation({
    actor, attack, attackSlot: slot, baseSkill: 15, governingSkill: { name: "Axe/Mace", level: 14 },
    hitLocationBasePenalty: penalty, hitLocationLabel: target,
    targetedAttack: ta.resolve({ specialty: "id:axe", target, basePenalty: penalty }),
    rapidStrikePenalty: -6 });
  const face = build("face", -5, "attack-1");
  const vitals = build("vitals", -3, "attack-2");
  assert.deepEqual([face.channels.find(x => x.id === "hitLocation").resolvedValue,
    vitals.channels.find(x => x.id === "hitLocation").resolvedValue], [-2, -1]);
  assert.deepEqual([face.effectiveSkill, vitals.effectiveSkill], [7, 8]);
  assert.deepEqual([face.attackSlot, vitals.attackSlot], ["attack-1", "attack-2"]);
});

test("Deceptive Attack combines with a situation modifier without mixing defense into skill", () => {
  const result = resolveMeleeCombatCalculation({ baseSkill: 16, manualModifier: 1,
    deceptiveAttack: -4 });
  assert.equal(result.effectiveSkill, 13);
  assert.equal(result.channels.find(entry => entry.id === "deceptiveAttack").resolvedValue, -4);
  assert.equal(result.metadata.defenseModifier, -2);
});


test("prepared GGA message shows channel transitions from the same ranged calculation", async () => {
  const fixture = withRangedRuntime(() => rangedFixture(rangedActor()));
  const calculation = withRangedRuntime(() => fixture.details().combatCalculation);
  let message;
  const runtime = {
    GURPS: { ModifierBucket: { modifierStack: {},
      applyMods: async () => calculation.rollModifiers.map(entry => ({ modint: entry.value, desc: entry.label })) },
      setLastTargetedRoll() {} },
    game: { user: { id: "user" }, settings: { get: () => null } },
    canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({ actor: "actor", token: null }),
      create: async data => { message = data; return data; } },
    Roll: { create: () => ({ total: 10, dice: [{ results: [
      { result: 3 }, { result: 3 }, { result: 4 }] }],
      evaluate: async function() { return this; } }) },
    renderTemplate: async () => "<p>GGA</p>",
    CONFIG: { sounds: { dice: "dice" } }
  };
  const actor = { id: "actor", canRoll: async () => ({ canRoll: true, hasActions: true }) };
  const result = await executePreparedGgaRoll({ actor, token: null,
    attack: fixture.attack, baseSkill: 13, baseSkillName: "Ranged Weapon Level",
    effectiveSkill: calculation.effectiveSkill, combatCalculation: calculation,
    physicalShots: 1, effectiveRoF: 1, rcl: 1, consumeAction: false, runtime });
  assert.equal(result.rollData.finaltarget, 8);
  assert.match(message.content, /<details class="olegurps-attack-modifiers"><summary style="cursor:pointer">/);
  assert.match(message.content, /<details class="olegurps-combat-channel-breakdown"><summary style="cursor:pointer">Skill details<\/summary><div><strong>Ranged Weapon Level: 13/);
  assert.doesNotMatch(message.content, /<details[^>]*\bopen\b/);
  assert.match(message.content, /Ranged Weapon Level: 13/);
  assert.match(message.content, /Ranged Rapid Strike -6 -&gt; Quick-Shot 0/);
  assert.match(message.content, /Hit Location -5 -&gt; Targeted Attack -2/);
  assert.match(message.content, /Move and Attack -5 -&gt; CQB -1/);
  assert.match(message.content, /Close Combat Bulk -5 -&gt; Close-Hip Shooting -2/);
});


test("melee native roll uses the resolved skill and channel breakdown", async () => {
  const calculation = resolveMeleeCombatCalculation({ baseSkill: 15,
    hitLocationBasePenalty: -5, hitLocationLabel: "Face",
    targetedAttack: { effectivePenalty: -2 }, rapidStrikePenalty: -6,
    allOutAttack: true, allOutAttackMode: "determined", manualModifier: 1 });
  assert.equal(calculation.effectiveSkill, 12);
  const previous = { GURPS: globalThis.GURPS, game: globalThis.game };
  let action;
  globalThis.GURPS = { performAction: async input => { action = input; return true; }, SetLastActor() {} };
  globalThis.game = { user: { targets: new Set() } };
  try {
    const result = await executeNativeMeleeAttack({ actor: { id: "actor" },
      sourceAttack: { name: "Axe", level: 15 }, effectiveSkill: calculation.effectiveSkill,
      modifierDetails: calculation.modifiers.filter(entry => entry.value !== 0)
        .map(entry => ({ label: entry.explanation || entry.label, value: entry.value })) });
    assert.equal(result.success, true);
    assert.equal(action.mod, "-3");
    assert.match(action.overridetxt, /Hit Location -5 -&gt; Targeted Attack -2/);
  } finally { globalThis.GURPS = previous.GURPS; globalThis.game = previous.game; }
});


test("standalone Fire Control folds modifiers and contextual attack details", async () => {
  let message;
  const runtime = {
    Roll: { create: () => ({ total: 10, dice: [{ results: [
      { result: 3 }, { result: 3 }, { result: 4 }] }],
      evaluate: async function() { return this; } }) },
    game: { user: { id: "user" }, settings: { get: () => null } },
    ChatMessage: { getSpeaker: () => ({}), create: async data => { message = data; return data; } },
    renderTemplate: async () => "<p>GGA</p>", CONFIG: { sounds: { dice: "dice" } }
  };
  await executePreparedSkillRoll({ actor: { id: "actor" }, baseSkill: 13, effectiveSkill: 11,
    modifierDetails: [{ label: "Range", value: -2 }],
    location: { label: "Face", random: false }, closeMultiplier: 2, runtime });
  assert.match(message.content, /<details class="olegurps-attack-modifiers"><summary/);
  assert.match(message.content, /Range \(-2\)/);
  assert.match(message.content, /<details class="olegurps-attack-context"><summary/);
  assert.match(message.content, /Hit Location: Face/);
  assert.match(message.content, /Extremely Close/);
  assert.doesNotMatch(message.content, /<details[^>]*\bopen\b/);
});
