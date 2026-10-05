import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMartialArtsDamage,
  calculateMeleeEffectiveSkill,
  calculateMeleeSkillBeforeDeceptive,
  executeNativeMeleeAttack,
  executeNativeMeleeDamage,
  getMaximumDeceptiveAttackPenalty,
  getTelegraphicCriticalBonus,
  isMeleeCriticalSuccess,
  prepareEffectiveMeleeDamage
} from "../scripts/tools/melee-service.js";

class FakeApplicationV2 {}
class FakeInput { constructor(name, checked = false) { this.name = name; this.checked = checked; } }
class FakeSelect { constructor(name, value) { this.name = name; this.value = value; } }
globalThis.HTMLInputElement = FakeInput;
globalThis.HTMLSelectElement = FakeSelect;
globalThis.foundry = { applications: { api: { ApplicationV2: FakeApplicationV2 } },
  utils: { deepClone: structuredClone } };
globalThis.game = { user: { targets: new Set() } };
globalThis.ui = { notifications: { warn() {}, error() {} } };
const { MeleeAssistantApp } = await import("../scripts/tools/melee-assistant-app.js");
const { getMeleeAttackSlots } = await import("../scripts/tools/melee-attack-slots.js");

function assistant({ level = 20, rapidStrike = false, double = false } = {}) {
  const app = Object.create(MeleeAssistantApp.prototype);
  app.actor = { id: "actor", system: {} };
  app.sourceAttack = { name: "Sword", mode: "Swing", level };
  app.attack = { ...app.sourceAttack, damage: "3d+1 cut", damageAction: {
    type: "damage", formula: "3d+1", damagetype: "cut"
  } };
  app.fireState = {
    allOutAttack: double, allOutAttackMode: double ? "double" : "determined",
    rapidStrike, rapidStrikeMastery: false, moveAndAttack: false,
    committedAttack: false, committedMode: "determined", committedSteps: false,
    defensiveAttack: false, defensiveBonus: "parry", telegraphicAttack: false,
    manualModifier: "0", deceptiveAttack: "0", evaluate: "0",
    governingSpecialty: "Sword", dicePlusAdds: false,
    hitLocation: { zoneId: "torso", regionId: null }
  };
  app.targetingService = {
    getDefaultSelection: () => ({ zoneId: "torso", regionId: null }),
    getSelection: id => ({ zoneId: id, regionId: null, label: "Torso", penalty: 0,
      random: false }),
    getZone: () => ({})
  };
  app.targetedAttackContext = { specialtyOptions: [], getSkillLevel: () => level,
    resolve: () => null };
  app._attackSlots = getMeleeAttackSlots(app.fireState);
  app._attackSlotStates = app._attackSlots.map(() => ({ manualModifier: "0",
    deceptiveAttack: "0", telegraphicAttack: false,
    hitLocation: { zoneId: "torso", regionId: null }, blindFighting: null }));
  app._attackConfigurationCache = new Map();
  app._activeAttackSlot = 0;
  app._refreshHitLocationContent = () => {};
  app._updateAttackSlotControls = () => {};
  app._updateMeleePreview = () => {};
  return app;
}

test("Telegraphic adds 4, suppresses Evaluate and Deceptive Attack", () => {
  const ordinary = { baseSkill: 12, evaluate: 3, deceptiveAttack: -2 };
  assert.equal(calculateMeleeEffectiveSkill(ordinary), 13);
  const telegraphic = { ...ordinary, telegraphicAttack: true };
  assert.equal(calculateMeleeSkillBeforeDeceptive(telegraphic), 16);
  assert.equal(calculateMeleeEffectiveSkill(telegraphic), 16);
  assert.equal(getMaximumDeceptiveAttackPenalty(16, false, true), 0);
  assert.equal(getTelegraphicCriticalBonus(telegraphic), 4);
});

test("Telegraphic critical threshold excludes its effective bonus", async () => {
  assert.equal(isMeleeCriticalSuccess(5, 14), false);
  assert.equal(isMeleeCriticalSuccess(5, 15), true);
  assert.equal(isMeleeCriticalSuccess(6, 15), false);
  assert.equal(getTelegraphicCriticalBonus({ baseSkill: 8, telegraphicAttack: true,
    visibilityCap: true }), 1);
  let received;
  const original = function(data) { received = structuredClone(data); };
  globalThis.GURPS = {
    setLastTargetedRoll: original,
    SetLastActor() {},
    performAction: async () => {
      const unrelated = { thing: "Other", rtotal: 5, finaltarget: 18, isCritSuccess: true };
      globalThis.GURPS.setLastTargetedRoll(unrelated, "actor", null, true);
      assert.equal(unrelated.isCritSuccess, true);
      const data = { thing: "Sword", rtotal: 5, finaltarget: 18, isCritSuccess: true };
      globalThis.GURPS.setLastTargetedRoll(data, "actor", null, true);
      assert.equal(data.isCritSuccess, false);
      return true;
    }
  };
  const result = await executeNativeMeleeAttack({ actor: { id: "actor" },
    sourceAttack: { name: "Sword", level: 14 }, effectiveSkill: 18,
    telegraphicCriticalBonus: 4 });
  assert.equal(result.success, true);
  assert.equal(received.isCritSuccess, false);
  assert.equal(globalThis.GURPS.setLastTargetedRoll, original);
});

test("Committed Determined, Strong, two steps and Defensive damage use shared helpers", async () => {
  assert.equal(calculateMeleeEffectiveSkill({ baseSkill: 14, committedAttack: true,
    committedMode: "determined" }), 16);
  assert.equal(calculateMeleeEffectiveSkill({ baseSkill: 14, committedAttack: true,
    committedMode: "determined", committedSteps: true }), 14);
  assert.equal(applyMartialArtsDamage("1d+3", { committedStrong: true }), "1d+4");
  assert.equal(applyMartialArtsDamage("1d+3", { defensiveAttack: true }), "1d+1");
  assert.equal(applyMartialArtsDamage("3d+1", { defensiveAttack: true }), "3d-2");
  const actor = { id: "actor", system: {} };
  const attack = { damage: "3d+1 cut", damageAction: {
    type: "damage", formula: "3d+1", damagetype: "cut"
  } };
  assert.equal((await prepareEffectiveMeleeDamage({ actor, attack,
    committedStrong: true })).formula, "3d+2 cut");
  assert.equal((await prepareEffectiveMeleeDamage({ actor, attack,
    defensiveAttack: true })).formula, "3d-2 cut");
  const oneDie = { damage: "1d+3 cut", damageAction: {
    type: "damage", formula: "1d+3", damagetype: "cut"
  } };
  assert.equal((await prepareEffectiveMeleeDamage({ actor, attack: oneDie,
    committedStrong: true, dicePlusAdds: true })).formula, "2d cut");
  let rolledFormula;
  globalThis.GURPS = { SetLastActor() {}, DamageChat: { create: async (_actor, formula) => {
    rolledFormula = formula;
  } } };
  await executeNativeMeleeDamage({ actor, attack, defensiveAttack: true });
  assert.equal(rolledFormula, "3d-2");
});

test("Telegraphic is per slot; Committed and Defensive enter every snapshot", () => {
  const app = assistant({ rapidStrike: true, double: true });
  app._attackSlotStates[1].telegraphicAttack = true;
  let slots = app._createAttackSnapshots();
  assert.deepEqual(slots.map(slot => slot.effectiveSkill), [20, 18, 14]);
  assert.deepEqual(slots.map(slot => slot.telegraphicAttack), [false, true, false]);
  assert.equal(slots[1].telegraphicCriticalBonus, 4);
  assert.equal(slots[1].deceptiveDefensePenalty, 2);
  assert.match(slots[1].overrideText, /\u0417\u0430\u0449\u0438\u0442\u0430 \u0446\u0435\u043b\u0438: \+2/u);
  app.fireState.allOutAttack = false;
  app.fireState.committedAttack = true;
  app.fireState.committedMode = "determined";
  app.fireState.committedSteps = true;
  app._refreshAttackSlots();
  slots = app._createAttackSnapshots();
  assert.deepEqual(slots.map(slot => slot.type), ["rs1", "rs2"]);
  assert.equal(slots.every(slot => slot.committedAttack && slot.committedSteps), true);
  assert.deepEqual(slots.map(slot => slot.effectiveSkill), [18, 14]);
  assert.equal(slots.every(slot => slot.maneuver.type === "committedAttack"), true);
  assert.equal(slots.every(slot => slot.martialSummary.includes("Retreat")), true);
  app.fireState.committedAttack = false;
  app.fireState.defensiveAttack = true;
  app.fireState.defensiveBonus = "block";
  slots = app._createAttackSnapshots();
  assert.equal(slots.every(slot => slot.defensiveAttack && slot.defensiveBonus === "block"), true);
  assert.equal(slots.every(slot => slot.damageData.defensiveAttack), true);
  assert.equal(slots.every(slot => slot.maneuver.type === "defensiveAttack"), true);
  assert.equal(slots.every(slot => slot.martialSummary.includes("Block +1")), true);
});

test("maneuver selection clears incompatible choices and Telegraphic clears Deceptive", async () => {
  const app = assistant({ double: true });
  await app._onInput({ target: new FakeInput("committedAttack", true) });
  assert.equal(app.fireState.allOutAttack, false);
  assert.equal(app.fireState.committedAttack, true);
  await app._onInput({ target: new FakeInput("defensiveAttack", true) });
  assert.equal(app.fireState.committedAttack, false);
  assert.equal(app.fireState.defensiveAttack, true);
  await app._onInput({ target: new FakeInput("moveAndAttack", true) });
  assert.equal(app.fireState.defensiveAttack, false);
  assert.equal(app.fireState.moveAndAttack, true);
  await app._onInput({ target: new FakeInput("allOutAttack", true) });
  assert.equal(app.fireState.moveAndAttack, false);
  assert.equal(app.fireState.allOutAttack, true);
  app.fireState.deceptiveAttack = "-2";
  await app._onInput({ target: new FakeInput("telegraphicAttack", true) });
  assert.equal(app.fireState.deceptiveAttack, "0");
  assert.equal(app.fireState.telegraphicAttack, true);
  assert.equal(app._normalizeManeuverState().maximum, 0);
});

test("Martial Arts controls expose inline help without a dialog", () => {
  const html = assistant()._buildMartialArtsOptions();
  assert.match(html, /name="telegraphicAttack"/);
  assert.match(html, /name="committedAttack"/);
  assert.match(html, /name="defensiveAttack"/);
  assert.equal((html.match(/class="gam-melee-martial-help"/g) ?? []).length, 3);
  assert.match(html, /title="\+4 \u043a \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044e/u);
});

test("Telegraphic and Deceptive remain separate in AoA Double slots", () => {
  const app = assistant({ double: true });
  app.fireState.telegraphicAttack = true;
  app._attackSlotStates[0].telegraphicAttack = true;
  app._attackSlotStates[1].deceptiveAttack = "-2";
  const slots = app._createAttackSnapshots();
  assert.deepEqual(slots.map(slot => slot.type), ["aoa1", "aoa2"]);
  assert.deepEqual(slots.map(slot => slot.effectiveSkill), [24, 18]);
  assert.deepEqual(slots.map(slot => slot.telegraphicAttack), [true, false]);
  assert.deepEqual(slots.map(slot => slot.deceptiveAttack), [0, -2]);
  assert.deepEqual(slots.map(slot => slot.deceptiveDefensePenalty), [2, -1]);
});

test("Committed Strong applies to every Rapid Strike snapshot", () => {
  const app = assistant({ rapidStrike: true });
  app.fireState.committedAttack = true;
  app.fireState.committedMode = "strong";
  const slots = app._createAttackSnapshots();
  assert.deepEqual(slots.map(slot => slot.effectiveSkill), [14, 14]);
  assert.equal(slots.every(slot => slot.damageData.committedStrong), true);
  assert.equal(slots.every(slot => slot.overrideText.includes("+1 damage")), true);
});
