import test from "node:test";
import assert from "node:assert/strict";
import { meleeVisibilityRules } from "../scripts/tools/limited-visibility.js";
import { calculateMeleeEffectiveSkill, calculateMeleeSkillBeforeDeceptive,
  getMaximumDeceptiveAttackPenalty } from "../scripts/tools/melee-service.js";

class FakeApplicationV2 {}
globalThis.foundry = {
  applications: { api: { ApplicationV2: FakeApplicationV2 } },
  utils: { deepClone: structuredClone }
};
globalThis.game = { user: { targets: new Set() } };
globalThis.ui = { notifications: { warn() {}, error() {} } };
const { MeleeAssistantApp } = await import("../scripts/tools/melee-assistant-app.js");
const { executeMeleeAttackSnapshot } = await import("../scripts/tools/melee-attack-execution-app.js");

function assistant({ visibility = null, double = false, rapidStrike = false, level = 20 } = {}) {
  const app = Object.create(MeleeAssistantApp.prototype);
  app.actor = { id: "actor", findSkill: () => null };
  app.token = { actor: app.actor };
  app.sourceAttack = { name: "Sword", mode: "Swing", level, reach: "1" };
  app.attack = { ...app.sourceAttack };
  app.visibility = visibility;
  app.fireState = {
    allOutAttack: double, allOutAttackMode: double ? "double" : "determined",
    rapidStrike, rapidStrikeMastery: false, moveAndAttack: false,
    manualModifier: "0", deceptiveAttack: "0", evaluate: "0",
    governingSpecialty: "Sword", dicePlusAdds: false,
    hitLocation: { zoneId: "head", regionId: null }
  };
  app.targetingService = {
    getDefaultSelection: () => ({ zoneId: "silhouette", regionId: null }),
    getSelection: id => ({ zoneId: id, regionId: null, label: id,
      penalty: id === "head" ? -5 : 0, random: id === "silhouette" }),
    getZone: () => ({})
  };
  app.targetedAttackContext = { specialtyOptions: [], getSkillLevel: () => level,
    resolve: () => ({ effectivePenalty: -3, entry: { name: "Targeted Attack" } }) };
  app._attackSlots = app.fireState.allOutAttack && rapidStrike
    ? [{ type: "aoa", label: "AoA", rapidStrike: false },
      { type: "rs1", label: "RS 1", rapidStrike: true },
      { type: "rs2", label: "RS 2", rapidStrike: true }]
    : [{ type: "attack", label: "Attack", rapidStrike: false }];
  app._attackSlotStates = app._attackSlots.map(() => ({ manualModifier: "0", deceptiveAttack: "0",
    hitLocation: { zoneId: "head", regionId: null }, blindFighting: null }));
  app._activeAttackSlot = 0;
  app._refreshHitLocationContent = () => {};
  app._updateMeleePreview = () => {};
  return app;
}

test("melee visibility penalties, Wild Swing and cap", () => {
  for (const [state, penalty, cap] of [
    [null, 0, false],
    [{ mode: "partial", partialPenalty: -3 }, -3, false],
    [{ mode: "unseen" }, -6, true],
    [{ mode: "unseen", location: "exact" }, -5, true],
    [{ mode: "known" }, -5, true],
    [{ mode: "blind" }, -10, true],
    [{ mode: "blind", accustomed: true }, -6, true]
  ]) {
    const rules = meleeVisibilityRules(state);
    assert.equal(rules?.penalty ?? 0, penalty);
    assert.equal(rules?.cap ?? false, cap);
    const options = { baseSkill: 20, visibilityPenalty: penalty, visibilityCap: cap };
    assert.equal(calculateMeleeSkillBeforeDeceptive(options), cap ? 9 : 20 + penalty);
  }
});

test("visibility cap disables Deceptive Attack below skill 10", () => {
  const options = { baseSkill: 20, visibilityPenalty: -6, visibilityCap: true, deceptiveAttack: -8 };
  assert.equal(getMaximumDeceptiveAttackPenalty(calculateMeleeSkillBeforeDeceptive(options)), 0);
  assert.equal(calculateMeleeEffectiveSkill(options), 9);
  assert.equal(calculateMeleeEffectiveSkill({ baseSkill: 20, visibilityPenalty: -3,
    deceptiveAttack: -8 }), 11);
});

test("unseen forces random location and suppresses Targeted Attack", () => {
  const app = assistant({ visibility: { mode: "unseen", location: "exact" } });
  const location = app._getLocationResult();
  assert.equal(location.selection.zoneId, "silhouette");
  assert.equal(location.targetedAttack, null);
  assert.equal(app._getMeleeCalculationOptions().visibilityPenalty, -5);
  assert.equal(app._getMeleeCalculationOptions().visibilityCap, true);
});

test("Blind Fighting success applies only to its slot and adds -2 for a chosen location", () => {
  const app = assistant({ visibility: { mode: "unseen" }, double: true, rapidStrike: true });
  app._attackSlotStates[1].blindFighting = "success";
  app._attackSlotStates[2].blindFighting = "failure";
  const snapshots = app._createAttackSnapshots();
  assert.deepEqual(snapshots.map(slot => slot.effectiveSkill), [9, 9, 8]);
  assert.deepEqual(snapshots.map(slot => slot.randomLocation), [true, false, true]);
  assert.deepEqual(snapshots.map(slot => slot.blindFighting), [null, "success", "failure"]);
  assert.deepEqual(snapshots.map(slot => slot.visibility.mode), ["unseen", "unseen", "unseen"]);
  assert.equal(snapshots[1].modifierDetails.some(entry => entry.value === -5), true);
  assert.equal(snapshots[1].modifierDetails.some(entry => entry.value === -2), false);
  assert.equal(snapshots[1].clearTargets, false);
  assert.equal(snapshots[0].clearTargets, true);
});

test("empty blind hex executes without Token or Reach/distance access", async () => {
  const app = assistant({ visibility: { mode: "unseen", location: "hex",
    blindFireHex: { i: 999, j: 999 } } });
  app.targetedAttackContext.resolve = () => null;
  const snapshot = app._createAttackSnapshots()[0];
  assert.deepEqual(snapshot.visibility.blindFireHex, { i: 999, j: 999 });
  assert.equal(snapshot.clearTargets, true);
  let targetNames;
  globalThis.GURPS = {
    SetLastActor() {},
    performAction: async (_action, _actor, _event, targets) => {
      targetNames = targets;
      return true;
    }
  };
  globalThis.game.user.targets = new Set();
  globalThis.canvas = { get tokens() { throw new Error("token layer read"); },
    get grid() { throw new Error("range or Reach read"); } };
  const result = await executeMeleeAttackSnapshot({ ...snapshot, randomLocation: false });
  assert.equal(result.success, true);
  assert.deepEqual(targetNames, []);
});

test("Blind Fighting result is consumed in active and cached slots", () => {
  const app = assistant({ visibility: { mode: "unseen" }, double: true, rapidStrike: true });
  app._attackSlotStates[0].blindFighting = "success";
  app._attackSlotStates[1].blindFighting = "failure";
  app._attackConfigurationCache = new Map([["attack", { blindFighting: "success" }]]);
  app._blindFighting = "success";
  app._consumeBlindFighting();
  assert.equal(app._blindFighting, null);
  assert.equal(app._attackSlotStates.every(slot => slot.blindFighting === null), true);
  assert.equal(app._attackConfigurationCache.get("attack").blindFighting, null);
});

test("Hearing-2 uses the shared GGA callback for actor and manual values", async () => {
  const { checkHearingMinusTwo } = await import("../scripts/tools/limited-visibility.js");
  const calls = [];
  globalThis.GURPS = { executeOTF: async otf => { calls.push(otf); return true; } };
  assert.equal(await checkHearingMinusTwo({ system: { hearing: 12 } }), true);
  assert.equal(await checkHearingMinusTwo({ system: {} }, 10), true);
  assert.deepEqual(calls, ["[Hearing -2]", "[Hearing10 -2]"]);
});
