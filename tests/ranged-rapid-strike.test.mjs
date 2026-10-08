import test from "node:test";
import assert from "node:assert/strict";
import { resolveRangedRapidStrike, validateRangedRapidStrikeSplit } from "../scripts/tools/ranged-rapid-strike-service.js";
import { calculateEffectiveDistance, resolveEffectiveRange } from "../scripts/tools/fire-range-service.js";
import { getTokenFireRangeContext } from "../scripts/tools/fire-control-context.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { normalizeTrademarkMoveStep, applyTrademarkMoveBonus } from "../scripts/tools/trademark-move-model.js";
import { FireService } from "../scripts/tools/fire-service.js";

const guns = (specialty, level) => ({ name: "Guns (" + specialty + ")", level });
const quick = (specialty, level, extra = {}) => ({
  name: "Quick-Shot (" + specialty + ")", type: "technique", level, ...extra
});
const actorWith = (...entries) => ({ system: { skills: Object.fromEntries(entries.map((entry, i) => [i, entry])) } });
const attack = { name: "Pistol", level: 16, rof: "3" };

test("Quick-Shot uses matching Guns specialty and clamps the RRS penalty", () => {
  for (const [technique, expected] of [[null, -6], [10, -6], [12, -4], [13, -3],
    [15, -1], [16, 0], [19, 0]]) {
    const actor = actorWith(guns("Pistol", 16), ...(technique === null ? [] : [quick("Pistol", technique)]));
    const result = resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" });
    assert.equal(result.penalty, expected);
    assert.equal(-6 + result.quickShotBonus, expected);
  }
  const mismatched = actorWith(guns("Pistol", 16), guns("Rifle", 16), quick("Rifle", 16));
  assert.equal(resolveRangedRapidStrike({ actor: mismatched, attack, governingSpecialty: "pistol" }).penalty, -6);
  assert.equal(resolveRangedRapidStrike({ actor: mismatched, attack, governingSpecialty: "rifle" }).penalty, 0);
});

test("structured Quick-Shot prerequisite overrides its name and relative level is clamped", () => {
  const actor = actorWith(guns("Pistol", 16), guns("Rifle", 16),
    quick("Rifle", null, { prerequisite: "Guns (Pistol)", relativelevel: -2 }));
  assert.equal(resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" }).penalty, -2);
  assert.equal(resolveRangedRapidStrike({ actor, attack, governingSpecialty: "rifle" }).penalty, -6);
  actor.system.skills[2].relativelevel = 3;
  assert.equal(resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" }).penalty, 0);
  actor.system.skills[2].name = "Localized Technique";
  actor.system.skills[2].originalName = "Quick-Shot (Rifle)";
  assert.equal(resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" }).penalty, 0);
});

test("High, Low, and Level elevation use measured distance and preserve beam range", () => {
  assert.equal(calculateEffectiveDistance(40, 10, { elevationDirection: "high" }), 35);
  assert.equal(calculateEffectiveDistance(40, 10, { elevationDirection: "low" }), 50);
  assert.equal(calculateEffectiveDistance(40, 10, { elevationDirection: "level" }), 40);
  assert.equal(calculateEffectiveDistance(40, 100, { elevationDirection: "high" }), 20);
  assert.equal(calculateEffectiveDistance(40, 10, { elevationDirection: "low", beamWeapon: true }), 40);
  const bands = [{ index: 0, max: 30, penalty: -3 }, { index: 1, max: 40, penalty: -4 },
    { index: 2, max: 50, penalty: -5 }];
  assert.equal(resolveEffectiveRange({ rangeBands: bands, rangeIndex: 1, distance: 40,
    height: 10, elevationDirection: "high" }).effectiveRange.index, 1);
  assert.equal(resolveEffectiveRange({ rangeBands: bands, rangeIndex: 1, distance: 40,
    height: 10, elevationDirection: "low" }).effectiveRange.index, 2);
});

test("token elevation selects High, Low, or Level only from available Token elevations", () => {
  const runtime = { canvas: { grid: { isGridless: false, measurePath: () => ({ spaces: 40 }) } } };
  const bands = [{ index: 0, max: 40, penalty: -4 }];
  const source = { document: { elevation: 10 } };
  const target = { document: { elevation: 0 } };
  const read = () => getTokenFireRangeContext({ sourceToken: source, targetToken: target, rangeBands: bands, runtime });
  assert.deepEqual([read().distance, read().height, read().elevationDirection], [40, 10, "high"]);
  target.document.elevation = 20;
  assert.deepEqual([read().height, read().elevationDirection], [10, "low"]);
  target.document.elevation = 10;
  assert.deepEqual([read().height, read().elevationDirection], [0, "level"]);
  delete target.document.elevation;
  assert.deepEqual([read().height, read().elevationDirection], [0, "level"]);
});

test("RoF 3 is split once between two RRS attacks", () => {
  assert.equal(validateRangedRapidStrikeSplit(2, 1, 3), true);
  assert.equal(validateRangedRapidStrikeSplit(1, 2, 3), true);
  assert.equal(validateRangedRapidStrikeSplit(2, 2, 3), false);
  assert.equal(validateRangedRapidStrikeSplit(0, 3, 3), false);
  assert.equal(validateRangedRapidStrikeSplit(1, 1, 1), false);
});

test("Trademark Move stores RRS flag and recalculates Quick-Shot and TA from current actor", () => {
  const raw = { weaponId: "w", shots: 2, rangedRapidStrike: true, hitLocationId: "vitals",
    quickShotBonus: 1, hitLocationPenalty: -1, manualModifier: 4 };
  const saved = normalizeTrademarkMoveStep(raw);
  assert.equal(saved.rangedRapidStrike, true);
  for (const key of ["quickShotBonus", "hitLocationPenalty", "manualModifier"])
    assert.equal(Object.hasOwn(saved, key), false);
  const actor = actorWith(guns("Pistol", 16), quick("Pistol", 12),
    { name: "Targeted Attack (Guns (Pistol)/Vitals)", type: "technique", level: 15,
      prerequisite: "Guns (Pistol)", targetLocation: "Vitals" });
  const before = resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" });
  const taBefore = createTargetedAttackContext({ actor, attack }).resolve({
    specialty: "pistol", target: "vitals", basePenalty: -3
  });
  assert.equal(before.penalty, -4);
  assert.equal(taBefore?.effectivePenalty, -1);
  actor.system.skills[1].level = 16;
  const after = resolveRangedRapidStrike({ actor, attack, governingSpecialty: "pistol" });
  assert.equal(after.penalty, 0);
  const stepOptions = applyTrademarkMoveBonus({ effectiveSkill: 16 + after.penalty + taBefore.effectivePenalty });
  assert.equal(stepOptions.effectiveSkill, 16);
  assert.equal(stepOptions.trademarkMoveBonus, 1);
});

test("FireService keeps RRS, Quick-Shot, and Trademark Move as distinct modifiers", async () => {
  const previous = globalThis.GURPS;
  const stack = [];
  globalThis.GURPS = { ModifierBucket: {
    modifierStack: { modifierList: stack },
    addModifier(value, desc) { stack.push({ modint: value, desc }); },
    clear() { stack.length = 0; }
  } };
  try {
    let applied;
    const service = new FireService({ actor: {}, token: {},
      preparedRollExecutor: async options => { applied = { options, modifiers: [...stack] }; return { rolled: true }; } });
    const options = applyTrademarkMoveBonus({ effectiveSkill: 11,
      rangedRapidStrikePenalty: -6, quickShotBonus: 4, quickShotLabel: "Quick-Shot (Pistol)",
      rangePenalty: 0, hitLocationPenalty: -1, hitLocationModifierLabel: "Vitals (TA)",
      rapidFireBonus: 0, laserBonus: 0, aimBonus: 0, sightBonus: 0, bracingBonus: 0,
      moveAttackPenalty: 0, allOutAttackBonus: 0, visibilityPenalty: 0,
      manualModifier: 0, effectRangePenalty: null });
    await service.executeRangedAttack(attack, options);
    assert.deepEqual(applied.modifiers.filter(m => ["Ranged Rapid Strike", "Quick-Shot (Pistol)",
      "Trademark Move"].includes(m.desc)), [
      { modint: -6, desc: "Ranged Rapid Strike" },
      { modint: 4, desc: "Quick-Shot (Pistol)" },
      { modint: 1, desc: "Trademark Move" }
    ]);
    assert.equal(applied.modifiers.find(m => m.desc === "Hit Location: Vitals (TA)")?.modint, -1);
    assert.equal(stack.length, 0);
  } finally { globalThis.GURPS = previous; }
});


test("RRS slots keep independent targets, locations, shots, and recommendations", async () => {
  const prior = { foundry: globalThis.foundry, game: globalThis.game, canvas: globalThis.canvas };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
  const tokens = {
    A: { id: "A", distance: 20, height: 5, direction: "low" },
    B: { id: "B", distance: 30, height: 10, direction: "high" }
  };
  globalThis.game = { user: { targets: new Set([tokens.A]) } };
  globalThis.canvas = { tokens: {
    setTargets(ids) { globalThis.game.user.targets = new Set(ids.map(id => tokens[id])); },
    get(id) { return tokens[id]; }
  } };
  try {
    const app = Object.create(FirePreparationApp.prototype);
    app.mode = "weapon";
    app.fireState = { shots: "3", rofMode: "0", hitLocation: { zoneId: "vitals", regionId: null },
      selectedRangeIndex: 0, manualRangeSelected: false, height: "5", elevationDirection: "low",
      rangedRapidStrike: false };
    app.calculateShotLimits = () => ({ maxShots: 3, minShots: 1 });
    app.rangeBands = [{ index: 0, label: "20 yd" }, { index: 1, label: "30 yd" }];
    app.visibility = null;
    app.recommendation = { distance: 20, rangeIndex: 0, source: "physical-target-distance" };
    app._readTargetRangeRecommendation = () => {
      const target = [...globalThis.game.user.targets][0];
      return target ? { distance: target.distance, rangeIndex: target.distance === 20 ? 0 : 1,
        source: "physical-target-distance" } : null;
    };
    app._syncTargetElevation = () => {
      const target = [...globalThis.game.user.targets][0];
      app.fireState.height = target ? String(target.height) : "";
      app.fireState.elevationDirection = target?.direction ?? "level";
      app.fireState.selectedRangeIndex = target ? target.distance === 20 ? 0 : 1 : null;
    };
    app._updateTargetRecommendation = () => { app.recommendation = app._readTargetRangeRecommendation(); };
    app._captureFields = () => {};
    app.render = async () => {};
    app._enableRrs();
    assert.deepEqual(app._rrsSlots.map(slot => slot.shots), ["2", "1"]);
    assert.deepEqual(app._getRrsRangeMarkers(0), [1]);
    await app._switchRrsSlot(1);
    assert.equal(globalThis.game.user.targets.size, 0);
    assert.equal(app.recommendation, null);
    app.fireState.selectedRangeIndex = 1;
    app.fireState.manualRangeSelected = true;
    assert.deepEqual(app._getRrsRangeMarkers(1), [2]);
    app.fireState.manualRangeSelected = false;
    globalThis.canvas.tokens.setTargets(["B"]);
    app._onTargetToken(globalThis.game.user);
    await new Promise(resolve => setTimeout(resolve, 60));
    app.fireState.hitLocation = { zoneId: "face", regionId: null };
    assert.equal(app.recommendation.distance, 30);
    assert.equal(app.fireState.elevationDirection, "high");
    await app._switchRrsSlot(0);
    assert.deepEqual([...globalThis.game.user.targets].map(token => token.id), ["A"]);
    assert.equal(app.recommendation.distance, 20);
    assert.deepEqual(app._getRrsRangeMarkers(0), [1]);
    assert.deepEqual(app._getRrsRangeMarkers(1), [2]);
    app.fireState.selectedRangeIndex = 1;
    assert.deepEqual(app._getRrsRangeMarkers(1), [1, 2]);
    app.fireState.selectedRangeIndex = 0;
    assert.equal(app.fireState.hitLocation.zoneId, "vitals");
    assert.equal(app.fireState.shots, "2");
    await app._switchRrsSlot(1);
    assert.deepEqual([...globalThis.game.user.targets].map(token => token.id), ["B"]);
    assert.equal(app.fireState.hitLocation.zoneId, "face");
    assert.equal(app.fireState.shots, "1");
    assert.equal(app.fireState.elevationDirection, "high");
    assert.equal(app.recommendation.distance, 30);
  } finally {
    globalThis.foundry = prior.foundry;
    globalThis.game = prior.game;
    globalThis.canvas = prior.canvas;
  }
});


test("Modifiers display equals the shared ranged modifier sum as conditions change", async () => {
  const previous = { foundry: globalThis.foundry, game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [{ modint: 2, desc: "Bucket" }] } } };
  try {
    const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
    const { createFireControlContext } = await import("../scripts/tools/fire-control-context.js");
    const actor = actorWith(guns("Pistol", 16), quick("Pistol", 13),
      { name: "Targeted Attack (Guns (Pistol)/Vitals)", type: "technique", level: 15,
        prerequisite: "Guns (Pistol)", targetLocation: "Vitals" });
    const ranged = { level: 16, rof: "6", acc: "2", data: { bulk: "-2" } };
    const token = { actor };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const bands = [{ index: 0, max: 100, penalty: -4, label: "100" }];
    const targeting = { getSelection: id => ({ zoneId: id, label: id,
      canonicalKeys: [id], penalty: id === "vitals" ? -3 : -5 }) };
    const ta = createTargetedAttackContext({ actor, attack: ranged });
    const values = { rangeIndex: 0, shots: 6, manualModifier: 2, aimSeconds: 1,
      braced: true, laserSight: true, allOutAttack: true, hitLocationId: "vitals",
      governingSpecialty: "pistol", rangedRapidStrike: true };
    const app = Object.create(FirePreparationApp.prototype);
    app.attack = ranged;
    app.targetingService = targeting;
    app.getShotOptions = () => values;
    app.calculateEffectiveSkill = options =>
      fire.calculateEffectiveFireSkill(ranged, options, bands, targeting, ta);
    const expected = () => {
      const details = fire.calculateEffectiveFireSkillDetails(ranged, values, bands, targeting, ta);
      const total = details.modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
      return total > 0 ? "+" + total : String(total);
    };
    assert.equal(app._getModifierTotalText(), expected());
    values.manualModifier = -7;
    values.hitLocationId = "face";
    assert.equal(app._getModifierTotalText(), expected());
  } finally {
    globalThis.foundry = previous.foundry;
    globalThis.game = previous.game;
    globalThis.GURPS = previous.GURPS;
  }
});


test("RRS hit-location markers move with the selected zone immediately", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
    const app = Object.create(FirePreparationApp.prototype);
    app.fireState = { rangedRapidStrike: true, hitLocation: { zoneId: "vitals", regionId: null } };
    app._rrsSlots = [
      { hitLocation: { zoneId: "vitals", regionId: null } },
      { hitLocation: { zoneId: "torso", regionId: null } }
    ];
    app._activeRrsSlot = 0;
    app.visibility = null;
    const regions = ["vitals", "face", "torso"].map(id => ({
      id, zoneId: id, geometry: [{}]
    }));
    app.targetingService = { getSelection: zoneId => ({ zoneId, regionId: null }), regions };
    const rows = Object.fromEntries(regions.map(({ id }) => [id, {
      dataset: { hitZoneId: id }, classList: { toggle() {} }, setAttribute() {},
      marker: { innerHTML: "" }, querySelector() { return this.marker; }
    }]));
    const shapes = Object.fromEntries(regions.map(({ id }) => [id, {
      dataset: { hitZoneId: id, hitRegionId: id }, classList: { toggle() {} },
      setAttribute() {}, nextElementSibling: null, inserted: "",
      insertAdjacentHTML(_position, html) { this.inserted = html; }
    }]));
    const staleMarker = { classList: { contains: name => name === "gam-hit-region-marker" },
      nextElementSibling: null, remove() { shapes.vitals.nextElementSibling = null; this.removed = true; } };
    shapes.vitals.nextElementSibling = staleMarker;
    app.element = { querySelectorAll: selector => selector.startsWith(".gam-hit-row")
      ? Object.values(rows) : selector.startsWith(".gam-hit-region") ? Object.values(shapes) : [] };
    app._renderSvgGeometry = () => "<path></path>";
    app._updateTargetedAttackPreview = () => {};
    app._updateSkillPreview = () => {};

    app._selectHitLocation("face");
    assert.equal(app._rrsSlots[0].hitLocation.zoneId, "face");
    assert.equal(app._rrsSlots[1].hitLocation.zoneId, "torso");
    assert.equal(rows.vitals.marker.innerHTML, "");
    assert.match(rows.face.marker.innerHTML, /gam-rapid-attack-1/);
    assert.match(rows.torso.marker.innerHTML, /gam-rapid-attack-2/);
    assert.equal(staleMarker.removed, true);
    assert.match(shapes.face.inserted, /gam-rapid-attack-1/);
    assert.match(shapes.torso.inserted, /gam-rapid-attack-2/);
  } finally { globalThis.foundry = previous; }
});
