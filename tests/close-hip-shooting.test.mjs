import test from "node:test";
import assert from "node:assert/strict";
import { findCloseHipShooting, resolveCloseHipShooting } from "../scripts/tools/close-hip-shooting-service.js";
import { getRangedTechniqueRows } from "../scripts/tools/ranged-techniques-registry.js";
import { listRangedGoverningSkills, bindingForGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";

const actorWith = (techniqueLevel = 16, extra = []) => ({ system: { skills: {
  rifle: { name: "Guns/TL9 (Rifle)", uuid: "rifle-id", level: 13 },
  pistol: { name: "Guns/TL9 (Pistol)", uuid: "pistol-id", level: 13 },
  ...(techniqueLevel == null ? {} : { chs: { name: "Close-Hip Shooting (Rifle)",
    type: "TECHNIQUE", level: techniqueLevel, prerequisite: "Guns/TL9 (Rifle)" } }),
  ...Object.fromEntries(extra.map((entry, index) => ["extra" + index, entry]))
} } });
const skill = (actor, specialty = "rifle") => listRangedGoverningSkills(actor)
  .find(entry => entry.specialty === specialty);
const attack = (actor, level = 13, bulk = -5) => ({ name: "AK", level,
  rof: "4", acc: "0", data: { bulk }, governingSkillBinding: bindingForGoverningSkill(skill(actor)) });

function withRuntime(fn) {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try { return fn(); } finally { globalThis.game = prior.game; globalThis.GURPS = prior.GURPS; }
}

test("Close-Hip Shooting matches the bound Guns specialty and clamps to Guns..Guns+3", () => {
  const actor = actorWith();
  assert.equal(findCloseHipShooting({ actor, governingSkill: skill(actor) }).level, 16);
  assert.equal(findCloseHipShooting({ actor, governingSkill: skill(actor, "pistol") }), null);
  actor.system.skills.chs.level = 10;
  assert.equal(findCloseHipShooting({ actor, governingSkill: skill(actor) }).level, 13);
  actor.system.skills.chs.level = 20;
  assert.equal(findCloseHipShooting({ actor, governingSkill: skill(actor) }).level, 16);
  assert.equal(findCloseHipShooting({ actor: actorWith(null), governingSkill: skill(actor) }), null);
});

test("Close-Hip Shooting uses weapon level plus relative technique, applies Bulk once, and needs no Target", () => {
  const actor = actorWith();
  const governingSkill = skill(actor);
  const result = resolveCloseHipShooting({ actor, attack: attack(actor), governingSkill, enabled: true });
  assert.deepEqual([result.techniqueLevel, result.techniqueRelativeLevel, result.weaponTechniqueLevel,
    result.bulk, result.closeHipBase, result.effectivePenalty], [16, 3, 16, -5, 11, -2]);
  assert.equal(resolveCloseHipShooting({ actor, attack: attack(actor), governingSkill, enabled: false }), null);
  assert.equal(resolveCloseHipShooting({ actor, attack: attack(actor, 14), governingSkill,
    enabled: true }).closeHipBase, 12);
  assert.equal(resolveCloseHipShooting({ actor, attack: attack(actor, 13, -2), governingSkill,
    enabled: true }).closeHipBase, 13);
});

test("registry locks only on missing matching technique; RRS needs RoF but not Quick-Shot", () => {
  const actor = actorWith();
  const context = { actor, governingSkill: skill(actor), rrsAvailable: true,
    rrsPenalty: -6, fireState: { rangedRapidStrike: false, closeHipShooting: false } };
  let rows = getRangedTechniqueRows(context);
  assert.equal(rows[0].name, "Ranged Rapid Strike");
  assert.deepEqual([rows[0].available, rows[0].status, rows[1].available], [true, "-6", true]);
  context.governingSkill = skill(actor, "pistol");
  rows = getRangedTechniqueRows(context);
  assert.equal(rows[1].available, false);
  assert.ok(rows[1].help.description.length > 0);
  context.governingSkill = skill(actor);
  context.rrsAvailable = false;
  assert.equal(getRangedTechniqueRows(context)[0].available, false);
  assert.equal(getRangedTechniqueRows({ ...context, actor: actorWith(null) })[1].available, false);
});

test("shared preview applies CHS without geometry and retains RRS/Quick-Shot modifiers", () => withRuntime(() => {
  const actor = actorWith(16, [{ name: "Quick-Shot (Rifle)", type: "TECHNIQUE", level: 10 }]);
  const token = { actor };
  const weapon = attack(actor);
  const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
  const bands = [{ index: 0, max: 30, penalty: 0, label: "30 yds" }];
  const targeting = { getSelection: () => ({ zoneId: "torso", label: "Torso", penalty: 0 }) };
  const values = { rangeIndex: 0, manualRangeSelected: true, moveAndAttack: true,
    closeHipShooting: true, shots: 1, hitLocationId: "torso", visibility: { mode: "normal" } };
  const details = () => fire.calculateEffectiveFireSkillDetails(weapon, values, bands, targeting);
  let result = details();
  assert.deepEqual([result.baseSkill, result.closeHipShooting.closeHipBase,
    result.modifiers.reduce((total, part) => total + part.value, 0), result.effectiveSkill], [13, 11, -7, 6]);
  assert.equal(result.modifiers.filter(part => part.label.includes("Close-Hip result")).length, 1);
  values.closeHipShooting = false;
  result = details();
  assert.equal(result.effectiveSkill, 8, JSON.stringify(result.modifiers));
  values.closeHipShooting = true;
  values.moveAndAttack = false;
  values.manualRangeSelected = false;
  values.targetDistanceOverride = 100;
  assert.equal(details().effectiveSkill, 11);
  values.rangedRapidStrike = true;
  assert.equal(details().effectiveSkill, 11 - 6 + 3);
  assert.equal(details().closeHipShooting.closeHipBase, 11);
}));

test("actual roll receives one CHS modifier with no repeated Bulk", async () => {
  const prior = globalThis.GURPS;
  const stack = [];
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: stack },
    addModifier(value, desc) { stack.push({ modint: value, desc }); },
    clear() { stack.length = 0; } } };
  try {
    let applied;
    const service = new FireService({ actor: {}, token: {},
      preparedRollExecutor: async options => { applied = { options, modifiers: [...stack] }; return { rolled: true }; } });
    await service.executeRangedAttack({ name: "AK", level: 13 }, {
      effectiveSkill: 11, baseSkill: 13, baseSkillName: "Ranged Weapon Level",
      closeHipShooting: { governingSkillName: "Guns/TL9 (Rifle)", governingSkillLevel: 13,
        label: "Close-Hip Shooting (Rifle)", techniqueLevel: 16, bulk: -5, closeHipBase: 11 },
      moveAttackPenalty: -2, rangePenalty: 0, rapidFireBonus: 0,
      hitLocationPenalty: 0, manualModifier: 0, visibilityPenalty: 0
    });
    const chs = applied.modifiers.filter(item => item.desc.includes("Close-Hip result"));
    assert.equal(chs.length, 1);
    assert.equal(chs[0].modint, -2);
    assert.equal(applied.modifiers.filter(item => item.desc.includes("Move and Attack")).length, 0);
  } finally { globalThis.GURPS = prior; }
});


test("technique checkboxes keep the window above the main app and allow multiple selections", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
    const actor = actorWith();
    const order = [];
    const app = Object.create(FirePreparationApp.prototype);
    app.actor = actor;
    app.fireState = { rangedRapidStrike: false, closeHipShooting: false };
    app._captureFields = () => {};
    app._getGoverningSkill = () => skill(actor);
    app._rrsAllowed = () => true;
    app._enableRrs = () => { app.fireState.rangedRapidStrike = true; app._rrsSlots = [{}, {}]; };
    app.render = async () => { order.push("main render"); };
    app._techniqueApp = { syncRows: () => order.push("sync"),
      bringToFront: () => order.push("techniques front"),
      close: () => order.push("close") };
    await app._setTechniqueActive("closeHipShooting", true);
    await app._setTechniqueActive("rangedRapidStrike", true);
    assert.deepEqual(app.fireState, { rangedRapidStrike: true, closeHipShooting: true });
    assert.deepEqual(order, ["main render", "sync", "techniques front",
      "main render", "sync", "techniques front"]);
  } finally { globalThis.foundry = previous; }
});


test("personal fire report folds weapon level and technique details by default", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { buildFireSkillBreakdownHtml } = await import("../scripts/tools/ammo.js");
    const html = buildFireSkillBreakdownHtml({ baseSkillName: "Ranged Weapon Level", baseSkill: 13,
      closeHipShooting: { governingSkillName: "Guns/TL9 (Rifle)", governingSkillLevel: 13,
        label: "Close-Hip Shooting (Rifle)", techniqueLevel: 16, bulk: -5, closeHipBase: 11 },
      closeQuartersBattle: { governingSkillName: "Guns/TL9 (Rifle)", governingSkillLevel: 13,
        label: "Close-Quarters Battle (Rifle)", techniqueLevel: 17,
        weaponTechniqueLevel: 17, movePenalty: -5, cqbBase: 12 }
    }, value => String(value));
    assert.match(html, /<details class="olegurps-fire-skill-breakdown"><summary style="cursor:pointer">Skill details<\/summary><div>Ranged Weapon Level: <strong>13<\/strong>/);
    assert.match(html, /Close-Hip result: <strong>11<\/strong>/);
    assert.match(html, /CQB base: <strong>12<\/strong>/);
    assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
    const withoutBase = buildFireSkillBreakdownHtml({ closeHipShooting: {
      governingSkillName: "Guns (Rifle)", governingSkillLevel: 13,
      label: "Close-Hip Shooting", techniqueLevel: 16, bulk: -5, closeHipBase: 11
    } }, value => String(value));
    assert.match(withoutBase, /<details class="olegurps-fire-skill-breakdown"><summary style="cursor:pointer">Techniques<\/summary>/);
    assert.doesNotMatch(withoutBase, /<details[^>]*\bopen\b/);
  } finally { globalThis.foundry = previous; }
});
