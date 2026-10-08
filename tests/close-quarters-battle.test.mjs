import test from "node:test";
import assert from "node:assert/strict";
import { getCloseQuartersBattleRange, resolveCloseQuartersBattle } from "../scripts/tools/close-quarters-battle-service.js";
import { createFireControlContext, resolveCurrentTargetDistance } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { getTrademarkMoveSkillPreview } from "../scripts/tools/trademark-move-model.js";

const actorWith = (per, skills, ads = {}) => ({
  system: { attributes: { PER: { value: per } }, skills: Object.fromEntries(
    skills.map((entry, index) => [index, entry])), ads }
});
const guns = (specialty, level) => ({ name: "Guns/TL9 (" + specialty + ")", level });
const cqb = (specialty, level, extra = {}) => ({
  name: "Close-Quarters Battle (" + specialty + ")", type: "technique", level, ...extra
});
const attack = (level = 13, bulk = -5) => ({
  name: "AK", level, rof: "1", acc: "4", data: { bulk }
});
const resolve = (actor, options = {}) => resolveCloseQuartersBattle({
  actor, attack: attack(options.attackLevel ?? 13, options.bulk ?? -5),
  governingSpecialty: options.specialty ?? "rifle", moveAndAttack: options.moveAndAttack ?? true,
  movePenalty: Math.min(-2, options.bulk ?? -5), physicalDistance: options.distance ?? 8
});

test("CQB requires matching Guns, technique, Move and Attack and known physical distance", () => {
  const actor = actorWith(10, [guns("Rifle", 13), cqb("Rifle", 17)]);
  assert.equal(resolve(actor).cqbBase, 12);
  assert.equal(resolve(actor, { moveAndAttack: false }), null);
  assert.equal(resolve(actor, { specialty: "pistol" }), null);
  assert.equal(resolve(actor, { distance: 11 }), null);
  assert.equal(resolve(actor, { distance: "" }), null);
  assert.equal(resolve(actor, { attackLevel: 12 })?.cqbBase, 11);
  assert.equal(resolve(actorWith(10, [guns("Rifle", 13)])), null);
  assert.equal(resolve(actorWith(10, [guns("Rifle", 13), cqb("Pistol", 17)])), null);
});

test("CQB technique caps at Guns+4 and the final attack never exceeds Ranged Level", () => {
  for (const [level, bulk, technique, base, penalty] of [
    [8, -5, 13, 8, -5], [13, -5, 13, 8, -5], [15, -5, 15, 10, -3],
    [17, -5, 17, 12, -1], [23, -5, 17, 12, -1],
    [17, -2, 17, 13, 0], [15, -2, 15, 13, 0]
  ]) {
    const result = resolve(actorWith(10, [guns("Rifle", 13), cqb("Rifle", level)]), { bulk });
    assert.deepEqual([result.techniqueLevel, result.cqbBase, result.effectivePenalty],
      [technique, base, penalty]);
  }
  const relative = actorWith(10, [guns("Rifle", 13),
    cqb("Rifle", 8, { relativelevel: 4, prerequisite: "Guns/TL9 (Rifle)" })]);
  assert.equal(resolve(relative).techniqueLevel, 17);
  relative.system.skills[1].relativelevel = -2;
  assert.equal(resolve(relative).techniqueLevel, 13);
});

test("CQB range uses Per plus Acute Vision, with final vision value once", () => {
  const actor = actorWith(11, [guns("Rifle", 13), cqb("Rifle", 17)],
    { 0: { name: "Acute Vision", levels: 2 } });
  assert.equal(getCloseQuartersBattleRange(actor), 13);
  assert.equal(resolve(actor, { distance: 13 })?.cqbBase, 12);
  assert.equal(resolve(actor, { distance: 13.01 }), null);
  actor.system.vision = 13;
  assert.equal(getCloseQuartersBattleRange(actor), 13);
  actor.system.vision = 14;
  assert.equal(getCloseQuartersBattleRange(actor), 14);
});

test("shared fire calculation replaces Bulk once, then applies later modifiers", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const actor = actorWith(10, [guns("Rifle", 13), cqb("Rifle", 17)]);
    const token = { actor };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const weapon = attack();
    const bands = [{ index: 0, max: 20, penalty: -3, label: "20 yds" }];
    const targeting = { getSelection: () => ({ zoneId: "face", label: "Face", penalty: -5 }) };
    const values = { rangeIndex: 0, manualRangeSelected: false, targetDistanceOverride: 8,
      moveAndAttack: true, governingSpecialty: "rifle", shots: 1, hitLocationId: "face",
      manualModifier: 2, visibility: { mode: "normal" } };
    const details = () => fire.calculateEffectiveFireSkillDetails(weapon, values, bands, targeting);
    let result = details();
    assert.equal(result.closeQuartersBattle.cqbBase, 12);
    assert.equal(result.modifiers.find(entry => entry.label.includes("CQB base"))?.value, -1);
    assert.equal(result.effectiveSkill, 13 + result.modifiers.reduce((n, entry) => n + entry.value, 0));
    values.targetDistanceOverride = 20;
    result = details();
    assert.equal(result.closeQuartersBattle, null);
    assert.equal(result.modifiers.find(entry => entry.label.includes("CQB base")), undefined);
    assert.equal(result.modifiers.find(entry => entry.value === -5 && entry.label.includes("CQB base")), undefined);
    values.targetDistanceOverride = 8;
    values.configuredPreview = true;
    assert.equal(details().closeQuartersBattle, null);
    values.configuredPreview = false;
    values.rangedRapidStrike = true;
    assert.equal(details().closeQuartersBattle?.cqbBase, 12);
    values.visibility = { mode: "partial", partialPenalty: -2 };
    assert.equal(details().closeQuartersBattle?.cqbBase, 12);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});

test("manual Range drives CQB without a Target and reacts to every range change", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS, canvas: globalThis.canvas };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  globalThis.canvas = { tokens: { get: () => null }, grid: {
    isGridless: false, measurePath: ([, target]) => ({ spaces: target.yards }),
    getCenterPoint: hex => ({ x: hex.x, y: hex.y })
  } };
  try {
    const actor = actorWith(12, [guns("Rifle", 13), cqb("Rifle", 17)]);
    const token = { actor, document: { getCenterPoint: () => ({ x: 0, y: 0 }) } };
    const weapon = attack(13, -5);
    const bands = [
      { index: 0, max: 5, penalty: -2, label: "5 yd" },
      { index: 1, max: 15, penalty: -4, label: "15 yd" }
    ];
    const targeting = { getSelection: () => ({ zoneId: "torso", label: "Torso", penalty: 0 }) };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const values = { rangeIndex: 0, manualRangeSelected: true, moveAndAttack: true,
      governingSpecialty: "rifle", shots: 1, hitLocationId: "torso",
      visibility: { mode: "normal" } };
    const details = () => fire.calculateEffectiveFireSkillDetails(weapon, values, bands, targeting);
    assert.deepEqual(resolveCurrentTargetDistance({ values, rangeBands: bands, sourceToken: token }),
      { distance: 5, source: "manual-range" });
    let result = details();
    assert.deepEqual([result.baseSkill, result.closeQuartersBattle.cqbBase,
      result.modifiers.reduce((sum, entry) => sum + entry.value, 0), result.effectiveSkill],
      [13, 12, -3, 10]);
    values.rangeIndex = 1;
    result = details();
    assert.equal(result.closeQuartersBattle, null);
    assert.equal(result.effectiveSkill, 4);
    values.rangeIndex = 0;
    assert.equal(details().effectiveSkill, 10);

    const target = { id: "target", document: { yards: 10 } };
    globalThis.canvas.tokens.get = id => id === target.id ? target : null;
    globalThis.game.user.targets = new Set([target]);
    assert.deepEqual(resolveCurrentTargetDistance({ values, rangeBands: bands, sourceToken: token }),
      { distance: 5, source: "manual-range" });
    values.manualRangeSelected = false;
    values.rangeIndex = 1;
    assert.deepEqual(resolveCurrentTargetDistance({ values, rangeBands: bands, sourceToken: token }),
      { distance: 10, source: "target" });
    assert.equal(details().closeQuartersBattle.cqbBase, 12);
    target.document.yards = 15;
    assert.equal(details().closeQuartersBattle, null);
    values.manualRangeSelected = true;
    values.rangeIndex = 0;
    assert.equal(details().closeQuartersBattle.cqbBase, 12);
    values.manualRangeSelected = false;
    values.rangeIndex = 1;
    assert.equal(details().closeQuartersBattle, null);

    globalThis.game.user.targets.clear();
    assert.equal(resolveCurrentTargetDistance({ values, rangeBands: bands, sourceToken: token }), null);
    assert.equal(details().closeQuartersBattle, null);
    values.manualRangeSelected = true;
    values.rangeIndex = 0;
    const preview = getTrademarkMoveSkillPreview({ attack: weapon, values, rangeBands: bands,
      targetingService: targeting, calculateSkillDetails: fire.calculateEffectiveFireSkillDetails });
    assert.deepEqual([preview.baseSkill, preview.totalModifiers, preview.effectiveSkill], [13, -2, 11]);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
    globalThis.canvas = prior.canvas;
  }
});

test("clicking Range rows immediately updates CQB skill and modifier previews", async () => {
  const prior = { foundry: globalThis.foundry, game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
    const actor = actorWith(12, [guns("Rifle", 13), cqb("Rifle", 17)]);
    const token = { actor };
    const weapon = attack(13, -5);
    const bands = [{ index: 0, max: 5, penalty: -2 }, { index: 1, max: 15, penalty: -4 }];
    const targeting = { getSelection: () => ({ zoneId: "torso", penalty: 0 }) };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const preview = { style: {}, textContent: "" };
    const modifiers = { textContent: "" };
    const app = Object.create(FirePreparationApp.prototype);
    app.mode = "weapon";
    app.actor = actor;
    app.attack = weapon;
    app.targetingService = targeting;
    app.fireState = { selectedRangeIndex: null, manualRangeSelected: false };
    app.element = { querySelectorAll: () => [], querySelector: selector =>
      selector === "[data-skill-preview]" ? preview :
        selector === "[data-total-modifier]" ? modifiers : null };
    app.getShotOptions = () => ({ rangeIndex: app.fireState.selectedRangeIndex,
      manualRangeSelected: app.fireState.manualRangeSelected, moveAndAttack: true,
      governingSpecialty: "rifle", shots: 1, hitLocationId: "torso",
      visibility: { mode: "normal" } });
    app.calculateEffectiveSkill = values =>
      fire.calculateEffectiveFireSkill(weapon, values, bands, targeting);
    app._updateElevationPreview = () => {};
    app._updateRrsRangeMarkers = () => {};
    app._updateRapidFirePreview = () => {};
    app._updateRrsPreview = () => {};
    app._selectRange(0);
    assert.match(preview.textContent, /^10 /u);
    assert.equal(modifiers.textContent, "-3");
    app._selectRange(1);
    assert.match(preview.textContent, /^4 /u);
    assert.equal(modifiers.textContent, "-9");
    app._selectRange(0);
    assert.match(preview.textContent, /^10 /u);
    assert.equal(modifiers.textContent, "-3");
  } finally {
    globalThis.foundry = prior.foundry;
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});

test("ranged technique distance uses the selected hex and each RRS slot's manual Range", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS, canvas: globalThis.canvas };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  const targets = {
    A: { id: "A", document: { yards: 15 } },
    B: { id: "B", document: { yards: 5 } }
  };
  globalThis.canvas = { tokens: { get: id => targets[id] }, grid: {
    isGridless: false, measurePath: ([, target]) => ({ spaces: target.yards ?? 8.4 }),
    getCenterPoint: () => ({ x: 8, y: 4 })
  } };
  try {
    const actor = actorWith(12, [guns("Rifle", 13), cqb("Rifle", 17)]);
    const token = { actor, document: { getCenterPoint: () => ({ x: 0, y: 0 }) } };
    const bands = [{ index: 0, max: 5, penalty: -2 }, { index: 1, max: 15, penalty: -4 }];
    const point = { visibility: { mode: "unseen", blindFireHex: { x: 8, y: 4 } } };
    assert.deepEqual(resolveCurrentTargetDistance({ values: point, rangeBands: bands, sourceToken: token }),
      { distance: 8.4, source: "blind-fire-hex" });
    globalThis.game.user.targets = new Set([targets.A]);
    assert.deepEqual(resolveCurrentTargetDistance({ values: point, rangeBands: bands, sourceToken: token }),
      { distance: 8.4, source: "blind-fire-hex" });
    globalThis.game.user.targets.clear();
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const targeting = { getSelection: () => ({ zoneId: "torso", penalty: 0 }) };
    const base = { shots: 1, moveAndAttack: true, rangedRapidStrike: true,
      governingSpecialty: "rifle", hitLocationId: "torso", visibility: { mode: "normal" } };
    const first = { ...base, targetTokenId: "A", rangeIndex: 0, manualRangeSelected: true };
    const second = { ...base, targetTokenId: "B", rangeIndex: 1, manualRangeSelected: true };
    assert.equal(resolveCurrentTargetDistance({ values: first, rangeBands: bands, sourceToken: token }).distance, 5);
    assert.equal(resolveCurrentTargetDistance({ values: second, rangeBands: bands, sourceToken: token }).distance, 15);
    assert.equal(fire.calculateEffectiveFireSkillDetails(attack(), first, bands, targeting).closeQuartersBattle.cqbBase, 12);
    assert.equal(fire.calculateEffectiveFireSkillDetails(attack(), second, bands, targeting).closeQuartersBattle, null);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
    globalThis.canvas = prior.canvas;
  }
});

test("Guns 15 remains the CQB default for imported 13 and relative -2", () => {
  const imported = actorWith(15, [guns("Rifle", 15), cqb("Rifle", 13)]);
  assert.equal(resolveCloseQuartersBattle({ actor: imported, attack: attack(15, -3),
    governingSpecialty: "rifle", moveAndAttack: true, movePenalty: -3,
    physicalDistance: 8 }).techniqueLevel, 15);
  imported.system.skills[1].relativelevel = -2;
  assert.equal(resolveCloseQuartersBattle({ actor: imported, attack: attack(15, -3),
    governingSpecialty: "rifle", moveAndAttack: true, movePenalty: -3,
    physicalDistance: 8 }).techniqueLevel, 15);
  for (const relative of [0, 1, 2, 3, 4, 7]) {
    imported.system.skills[1].relativelevel = relative;
    const actual = resolveCloseQuartersBattle({ actor: imported, attack: attack(15, -3),
      governingSpecialty: "rifle", moveAndAttack: true, movePenalty: -3,
      physicalDistance: 8 });
    assert.equal(actual.techniqueLevel, 15 + Math.min(relative, 4));
  }
});

test("RRS slots measure their own targets and TA, Quick-Shot, Trademark Move follow CQB", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS, canvas: globalThis.canvas };
  const near = { id: "near", document: { yards: 8 } };
  const far = { id: "far", document: { yards: 20 } };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  globalThis.canvas = { tokens: { get: id => ({ near, far })[id] }, grid: {
    isGridless: false, measurePath: ([, target]) => ({ spaces: target.yards })
  } };
  try {
    const actor = actorWith(10, [guns("Rifle", 13), cqb("Rifle", 17),
      { name: "Quick-Shot (Rifle)", type: "technique", level: 13 },
      { name: "Targeted Attack (Guns (Rifle)/Face)", type: "technique",
        level: 11, prerequisite: "Guns (Rifle)", targetLocation: "Face" }]);
    const token = { id: "source", actor, document: { yards: 0 } };
    const weapon = attack();
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const bands = [{ index: 0, max: 20, penalty: -3, label: "20 yds" }];
    const targeting = { getSelection: () => ({ zoneId: "face", label: "Face",
      canonicalKeys: ["face"], penalty: -5 }) };
    const ta = createTargetedAttackContext({ actor, attack: weapon });
    const values = { rangeIndex: 0, manualRangeSelected: false, moveAndAttack: true,
      governingSpecialty: "rifle", rangedRapidStrike: true, shots: 1,
      hitLocationId: "face", visibility: { mode: "normal" } };
    const details = targetTokenId => fire.calculateEffectiveFireSkillDetails(weapon,
      { ...values, targetTokenId }, bands, targeting, ta);
    const first = details("near");
    const second = details("far");
    assert.equal(first.closeQuartersBattle?.cqbBase, 12);
    assert.equal(second.closeQuartersBattle, null);
    assert.equal(first.modifiers.find(entry => entry.label.includes("Targeted Attack"))?.value, -2);
    assert.equal(first.combatCalculation.channels.find(entry => entry.id === "rangedRapidStrike")?.resolvedValue, 0);
    assert.equal(first.modifiers.find(entry => entry.label.includes("Quick-Shot"))?.value, 0);
    assert.equal(first.effectiveSkill - second.effectiveSkill, 4);
    const preview = getTrademarkMoveSkillPreview({ attack: weapon,
      values: { ...values, targetTokenId: "near" }, rangeBands: bands,
      targetingService: targeting, targetedAttackContext: ta,
      calculateSkillDetails: fire.calculateEffectiveFireSkillDetails });
    assert.equal(preview.effectiveSkill, first.effectiveSkill + 1);
    assert.equal(preview.modifiers.find(entry => entry.label.includes("CQB base"))?.value, -1);
    const editor = getTrademarkMoveSkillPreview({ attack: weapon,
      values: { ...values, targetTokenId: "near", configuredPreview: true }, rangeBands: bands,
      targetingService: targeting, targetedAttackContext: ta,
      calculateSkillDetails: fire.calculateEffectiveFireSkillDetails });
    assert.equal(editor.modifiers.some(entry => entry.label.includes("CQB base")), false);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
    globalThis.canvas = prior.canvas;
  }
});
