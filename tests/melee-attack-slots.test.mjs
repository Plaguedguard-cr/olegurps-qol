import test from "node:test";
import assert from "node:assert/strict";

class FakeApplicationV2 {
  constructor() {
    this.rendered = true;
    this.element = { querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} };
  }
  async render() { return this; }
  async close() { this.rendered = false; }
}
globalThis.foundry = {
  applications: { api: { ApplicationV2: FakeApplicationV2 } },
  utils: { deepClone: structuredClone, randomID: () => "test" }
};
globalThis.game = { user: { targets: new Set() } };
globalThis.ui = { notifications: { warn: () => {}, error: () => {} } };
globalThis.GURPS = { SetLastActor: () => {}, performAction: async () => true };

const { getMeleeAttackSlots } = await import("../scripts/tools/melee-attack-slots.js");
const { MeleeAssistantApp } = await import("../scripts/tools/melee-assistant-app.js");
const { MeleeAttackExecutionApp } = await import("../scripts/tools/melee-attack-execution-app.js");

function assistant({ double = false, rapidStrike = false, mastery = false } = {}) {
  const app = Object.create(MeleeAssistantApp.prototype);
  app.actor = { id: "actor" };
  app.sourceAttack = { name: "Sword", level: 14, mode: "Swing" };
  app.attack = { ...app.sourceAttack, damage: "1d+2 cut" };
  app.fireState = {
    allOutAttack: double, allOutAttackMode: double ? "double" : "determined",
    rapidStrike, rapidStrikeMastery: mastery, moveAndAttack: false,
    manualModifier: "0", deceptiveAttack: "0", evaluate: "0",
    governingSpecialty: "Sword", dicePlusAdds: false,
    hitLocation: { zoneId: "torso", regionId: null }
  };
  app.targetingService = {
    getDefaultSelection: () => ({ zoneId: "torso", regionId: null }),
    getSelection: () => ({ zoneId: "torso", regionId: null, label: "Torso", penalty: 0 }),
    getZone: () => ({})
  };
  app.targetedAttackContext = { specialtyOptions: [], getSkillLevel: () => 14, resolve: () => null };
  app._attackSlots = getMeleeAttackSlots(app.fireState);
  app._attackSlotStates = app._attackSlots.map(() => ({ manualModifier: "0", deceptiveAttack: "0", hitLocation: { zoneId: "torso", regionId: null } }));
  app._attackConfigurationCache = new Map();
  app._activeAttackSlot = 0;
  app._refreshHitLocationContent = () => {};
  app._updateMeleePreview = () => {};
  return app;
}

test("slot combinations use the shared skill pipeline and mastery penalty", () => {
  for (const [options, labels, skills, penalties] of [
    [{}, ["\u0410\u0442\u0430\u043a\u0430"], [14], [0]],
    [{ double: true }, ["AoA 1", "AoA 2"], [14, 14], [0, 0]],
    [{ rapidStrike: true }, ["RS 1", "RS 2"], [8, 8], [-6, -6]],
    [{ rapidStrike: true, mastery: true }, ["RS 1", "RS 2"], [11, 11], [-3, -3]],
    [{ double: true, rapidStrike: true }, ["AoA", "RS 1", "RS 2"], [14, 8, 8], [0, -6, -6]],
    [{ double: true, rapidStrike: true, mastery: true }, ["AoA", "RS 1", "RS 2"], [14, 11, 11], [0, -3, -3]]
  ]) {
    const app = assistant(options);
    const snapshots = app._createAttackSnapshots();
    assert.deepEqual(snapshots.map(slot => slot.label), labels);
    assert.deepEqual(snapshots.map(slot => slot.effectiveSkill), skills);
    assert.deepEqual(snapshots.map(slot => slot.rapidStrikePenalty), penalties);
  }
});

test("each slot keeps its configuration and snapshots ignore later edits", () => {
  const app = assistant({ double: true, rapidStrike: true });
  app._attackSlotStates[1].manualModifier = "2";
  app._attackSlotStates[2].manualModifier = "-1";
  const snapshots = app._createAttackSnapshots();
  assert.deepEqual(snapshots.map(slot => slot.effectiveSkill), [14, 10, 7]);
  app.fireState.rapidStrikeMastery = true;
  app.sourceAttack.name = "Changed";
  assert.deepEqual(snapshots.map(slot => slot.effectiveSkill), [14, 10, 7]);
  assert.deepEqual(snapshots.map(slot => slot.sourceAttack.name), ["Sword", "Sword", "Sword"]);
});

class FakeElement {
  constructor(index) { this.dataset = { executionSlot: String(index) }; this.disabled = false; }
  closest() { return this; }
}
globalThis.Element = FakeElement;

test("execution permits RS 2, AoA, RS 1 and closes after all complete", async () => {
  const calls = [];
  globalThis.GURPS.performAction = async action => { calls.push(action.overridetxt); return true; };
  let closed = 0;
  const window = new MeleeAttackExecutionApp({ slots: assistant({ double: true, rapidStrike: true })._createAttackSnapshots(), onClose: () => closed++ });
  for (const index of [2, 0, 1]) await window._onClick({ target: new FakeElement(index) });
  assert.deepEqual(calls.map(text => text.split("<br>")[0]), ["RS 2", "AoA", "RS 1"]);
  assert.equal(calls[0].includes("Rapid Strike (-6)"), true);
  assert.equal(calls[1].includes("Rapid Strike"), false);
  assert.equal(closed, 1);
  assert.equal(window.rendered, false);
});

test("closing after one attack leaves other slots unrolled", async () => {
  const calls = [];
  globalThis.GURPS.performAction = async action => { calls.push(action.overridetxt); return true; };
  const window = new MeleeAttackExecutionApp({ slots: assistant({ double: true, rapidStrike: true })._createAttackSnapshots() });
  await window._onClick({ target: new FakeElement(1) });
  assert.equal(window.slots[1].completed, true);
  await window.close();
  assert.equal(calls.length, 1);
  assert.equal(window.slots.length, 0);
});

test("a missed GGA roll completes its slot when ChatMessage was created", async () => {
  const original = globalThis.ChatMessage;
  const messages = [];
  globalThis.ChatMessage = { create: async data => { const message = { ...data }; messages.push(message); return message; } };
  globalThis.GURPS.performAction = async () => {
    await globalThis.ChatMessage.create({ speaker: { actor: "actor" }, rolls: [{}] });
    return false;
  };
  try {
    const window = new MeleeAttackExecutionApp({ slots: assistant({ double: true })._createAttackSnapshots() });
    await window._onClick({ target: new FakeElement(0) });
    assert.equal(messages.length, 1);
    assert.deepEqual(window.slots.map(slot => slot.completed), [true, false]);
  } finally {
    globalThis.ChatMessage = original;
  }
});

test("turning Rapid Strike off and on restores both slot configurations", () => {
  const app = assistant({ rapidStrike: true });
  app._attackSlotStates[1].manualModifier = "4";
  app.fireState.rapidStrike = false;
  app._refreshAttackSlots();
  assert.deepEqual(app._attackSlots.map(slot => slot.type), ["attack"]);
  app.fireState.rapidStrike = true;
  app._refreshAttackSlots();
  assert.equal(app._attackSlotStates[1].manualModifier, "4");
});
