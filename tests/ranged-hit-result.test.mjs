import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { FireService } from "../scripts/tools/fire-service.js";
import { executePreparedGgaRoll } from "../scripts/tools/prepared-gga-roll.js";
import { calculateSuppressionFireHits } from "../scripts/tools/suppression-fire-service.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { ammoDisplayName } from "../scripts/tools/ammo-management-localization.js";
import { resolveRuntimeAttackProfile, newAttackId, attackProfileError } from "../scripts/tools/attack-profile-runtime.js";

// Use the production transaction boundary in the private-closure tests as well.
function attachAmmoState(actor, state, onSave = () => {}) {
  globalThis.foundry ??= { utils: { deepClone: structuredClone } };
  const weapon = state.weapons[0];
  actor.isOwner = true;
  actor.getFlag = () => structuredClone(state);
  actor.setFlag = async (_scope, _key, next) => {
    Object.assign(weapon, structuredClone(next.weapons[0]));
    Object.assign(state, structuredClone(next)); state.weapons[0] = weapon;
    onSave();
  };
  return new AmmoService(actor);
}

const scenarios = [
  { name: "A: skill 20, roll 17, single shot", skill: 20, total: 17, shots: 1, rcl: 1, hits: 0, failure: true, critical: false },
  { name: "B: skill 20, roll 18, single shot", skill: 20, total: 18, shots: 1, rcl: 1, hits: 0, failure: true, critical: true },
  { name: "C: skill 25, roll 17, RoF 20", skill: 25, total: 17, shots: 20, rcl: 1, hits: 0, failure: true, critical: false },
  { name: "D: skill 25, roll 18, RoF 20", skill: 25, total: 18, shots: 20, rcl: 1, hits: 0, failure: true, critical: true },
  { name: "E: ordinary rapid fire success", skill: 20, total: 12, shots: 10, rcl: 2, hits: 5, failure: false, critical: false },
  { name: "F: ordinary negative-margin failure", skill: 12, total: 13, shots: 10, rcl: 2, hits: 0, failure: true, critical: false },
  { name: "G: critical success retains RoF/Rcl hits", skill: 20, total: 4, shots: 10, rcl: 2, hits: 9, failure: false, critical: false, critSuccess: true },
  { name: "H: critical failure below 17", skill: 5, total: 15, shots: 10, rcl: 2, hits: 0, failure: true, critical: true }
];

function fixture({ total = 17, canRoll = true } = {}) {
  const messages = [];
  const templates = [];
  const dice = [];
  let remaining = total;
  for (let i = 0; i < 3; i++) {
    const result = Math.min(6, remaining - (2 - i));
    dice.push({ result });
    remaining -= result;
  }
  let evaluations = 0;
  const actor = { id: "actor", canRoll: async () => ({ canRoll, hasActions: canRoll }) };
  const attack = { name: "Gun", level: 25, rof: "20", rcl: "1", data: { damage: "2d pi" } };
  const runtime = {
    GURPS: { ModifierBucket: { modifierStack: {}, applyMods: async () => [] },
      setLastTargetedRoll(data) { this.lastTargetedRoll = data; } },
    game: { user: { id: "user" }, settings: { get: () => null } },
    canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({ actor: "actor", token: null }),
      async create(data) { const message = { id: "message-" + messages.length, ...data }; messages.push(message); return message; } },
    Roll: { create: () => ({ total, dice: [{ results: dice }],
      async evaluate() { evaluations++; return this; } }) },
    async renderTemplate(_path, data) { templates.push(data); return "<p>GGA roll</p>"; }
  };
  return { actor, attack, runtime, messages, templates, get evaluations() { return evaluations; } };
}

async function roll(scenario, extra = {}) {
  const fx = fixture(scenario);
  const result = await executePreparedGgaRoll({ actor: fx.actor, token: null, attack: fx.attack,
    effectiveSkill: scenario.skill, physicalShots: scenario.shots, effectiveRoF: scenario.shots,
    rcl: scenario.rcl, consumeAction: false, runtime: fx.runtime, ...extra });
  return { fx, result };
}

for (const scenario of scenarios) {
  test("prepared roll: " + scenario.name, async () => {
    const { fx, result } = await roll(scenario);
    assert.equal(result.rolled, true);
    assert.equal(result.rollData.failure, scenario.failure);
    assert.equal(result.rollData.isCritFailure, scenario.critical);
    assert.equal(result.rollData.isCritSuccess, scenario.critSuccess ?? false);
    assert.equal(result.rollData.rofrcl, scenario.hits);
    assert.equal(result.rollData.rof, String(scenario.shots));
    assert.equal(result.rollData.rcl, scenario.rcl);
    assert.equal(fx.templates[0].rofrcl, scenario.hits);
    assert.equal(fx.runtime.GURPS.lastTargetedRoll, result.rollData);
    assert.equal(fx.evaluations, 1);
    assert.equal(fx.messages.length, 1);
  });

  test("secondary calculation: " + scenario.name, async () => {
    const { result } = await roll(scenario);
    const service = new FireService({ actor: {}, token: {} });
    const before = structuredClone(result.rollData);
    assert.equal(service.calculateHitsFromMargin(scenario.shots, scenario.rcl,
      service.extractMarginFromRoll(result.rollData), result.rollData), scenario.hits);
    assert.deepEqual(result.rollData, before);
  });
}

test("17 is critical only at the existing low-skill threshold", async () => {
  const { result } = await roll({ skill: 15, total: 17, shots: 10, rcl: 1 });
  assert.equal(result.rollData.failure, true);
  assert.equal(result.rollData.isCritFailure, true);
  assert.equal(result.rollData.rofrcl, 0);
});

test("successful hit count respects RoF and the requested hit cap", async () => {
  const { result } = await roll({ skill: 25, total: 10, shots: 20, rcl: 1 }, { maximumHits: 3 });
  assert.equal(result.rollData.failure, false);
  assert.equal(result.rollData.rofrcl, 3);
  const service = new FireService({ actor: {}, token: {} });
  assert.equal(service.calculateHitsFromMargin(3, 1, 15, result.rollData), 3);
});

test("explicit failure or success=false overrides positive or unavailable margin", () => {
  const service = new FireService({ actor: {}, token: {} });
  for (const outcome of [{ failure: true }, { success: false }, { failure: true, success: true }]) {
    assert.equal(service.calculateHitsFromMargin(20, 1, 8, outcome), 0);
    assert.equal(service.calculateHitsFromMargin(20, 1, null, outcome), 0);
  }
  assert.equal(service.calculateHitsFromMargin(20, 2, 8, { failure: false }), 5);
  assert.equal(service.calculateHitsFromMargin(20, 2, null, { failure: false }), null);
});

// Exercise the actual private closure body with injected boundaries, without exposing
// a production API or reproducing its ammunition/report logic in the test.
const ammoSource = readFileSync(new URL("../scripts/tools/ammo.js", import.meta.url), "utf8");
function privateFunction(start, end, dependencies) {
  const first = ammoSource.indexOf(start);
  const last = ammoSource.indexOf(end, first);
  assert.ok(first >= 0 && last > first, "private function boundaries exist");
  return runInNewContext("(" + ammoSource.slice(first, last).trim() + ")", dependencies);
}

function shootingFixture(fx, scenario) {
  const service = new FireService({ actor: fx.actor, token: {} });
  const weapon = { id: "weapon", name: "Gun", capacity: 40, magazines: [40], loadedIndex: 0, totalAmmo: 40 };
  const state = { weapons: [weapon] };
  const options = { physicalShots: scenario.shots, effectiveRoF: scenario.shots,
    rcl: scenario.rcl, effectiveSkill: scenario.skill, randomHitLocation: true };
  const payloads = [];
  const reports = [];
  let saves = 0;
  let randomLocations = 0;
  const ammoService = attachAmmoState(fx.actor, state, () => { saves++; });
  const renderReport = privateFunction("function buildFireChatBody(", "async function fireAndRoll(", {
    shouldReportField: () => true, escapeHTML: String, buildFireSkillBreakdownHtml: () => "",
    buildRandomHitLocationsHtml: () => "<details>locations</details>"
  });
  const execute = privateFunction("async function fireAndRoll(", "async function spendWithoutRoll(", {
    normalizeVisibility: () => null,
    ammoService, actor: fx.actor, token: { id: "source" }, newAttackId, ammoDisplayName,
    resolveRuntimeAttackProfile, attackProfileError,
    repairState: async () => {}, getWeaponContext: () => ({ weapon, attack: fx.attack }),
    getRangeBands: () => [], getTaggedModifierSettings: () => null,
    parseShotOptions: () => options, getCloseDamageReport: () => null,
    executeRangedAttack: (attack, shotOptions) => executePreparedGgaRoll({ actor: fx.actor, attack,
      ...shotOptions, consumeAction: false, runtime: fx.runtime }),
    extractMarginFromRoll: data => service.extractMarginFromRoll(data),
    calculateHitsFromMargin: (...args) => service.calculateHitsFromMargin(...args),
    saveState: async () => { saves++; },
    buildFireChatBody: (savedState, payload) => { payloads.push(payload); return renderReport(savedState, payload); },
    reportToChat: async (_state, _kind, _name, body) => reports.push(body),
    ui: { notifications: { warn() {} } }, console
  });
  const targeting = { async resolveRandomHitLocations(hits) { randomLocations += hits; return []; } };
  return { weapon, state, options, payloads, reports, targeting, execute,
    get saves() { return saves; }, get randomLocations() { return randomLocations; } };
}

test("automatic miss spends all 10 fired rounds and reports zero hits", async () => {
  const scenario = { skill: 25, total: 17, shots: 10, rcl: 1 };
  const fx = fixture(scenario);
  const shooting = shootingFixture(fx, scenario);
  assert.equal(await shooting.execute(shooting.state, "weapon", {}, shooting.targeting), true);
  assert.equal(shooting.weapon.magazines[0], 30);
  assert.equal(shooting.weapon.totalAmmo, 30);
  assert.equal(shooting.saves, 1);
  assert.equal(shooting.payloads[0].fired, 10);
  assert.equal(shooting.payloads[0].hits, 0);
  assert.equal(shooting.payloads[0].rcl, 1);
  assert.match(shooting.reports[0], /<strong>0<\/strong>/);
  assert.equal(shooting.randomLocations, 0);
  assert.equal(fx.messages.length, 1);
  assert.equal(fx.evaluations, 1);
});

test("cancelled shot does not spend ammo, resolve locations, or create reports", async () => {
  const scenario = { skill: 25, total: 17, shots: 10, rcl: 1, canRoll: false };
  const fx = fixture(scenario);
  const shooting = shootingFixture(fx, scenario);
  assert.equal(await shooting.execute(shooting.state, "weapon", {}, shooting.targeting), false);
  assert.equal(shooting.weapon.magazines[0], 40);
  assert.equal(shooting.weapon.totalAmmo, 40);
  assert.equal(shooting.saves, 0);
  assert.equal(shooting.reports.length, 0);
  assert.equal(shooting.randomLocations, 0);
  assert.equal(fx.messages.length, 0);
  assert.equal(fx.evaluations, 0);
});

test("RRS prepared slots retain physical expenditure on 17 and 18 with zero hits", async () => {
  for (const total of [17, 18]) {
    const scenario = { skill: 25, total, shots: 10, rcl: 1 };
    const fx = fixture(scenario);
    const shooting = shootingFixture(fx, scenario);
    for (const shots of [6, 4]) {
      const shotOptions = { ...shooting.options, physicalShots: shots, effectiveRoF: shots };
      assert.equal(await shooting.execute(shooting.state, "weapon", {}, shooting.targeting,
        false, { attack: fx.attack, shotOptions }), true);
    }
    assert.deepEqual(shooting.payloads.map(p => p.hits), [0, 0]);
    assert.deepEqual(shooting.payloads.map(p => p.fired), [6, 4]);
    assert.equal(shooting.weapon.magazines[0], 30);
    assert.equal(shooting.weapon.totalAmmo, 30);
    assert.equal(shooting.randomLocations, 0);
    assert.equal(fx.messages.length, 2);
  }
});

for (const scenario of scenarios) {
  test("Suppression hit calculation: " + scenario.name, async () => {
    const { result } = await roll(scenario);
    assert.equal(calculateSuppressionFireHits({ remainingShots: scenario.shots,
      rcl: scenario.rcl, margin: result.rollData.margin, rollData: result.rollData }), scenario.hits);
  });
}

async function withAppRuntime(execute) {
  const previous = { foundry: globalThis.foundry, game: globalThis.game, canvas: globalThis.canvas, ui: globalThis.ui };
  const target = { id: "target", visible: true, document: { id: "target", hidden: false } };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } },
    utils: { deepClone: structuredClone } };
  globalThis.game = { user: { id: "user", targets: new Set() } };
  globalThis.canvas = { tokens: { get: () => target, setTargets() {} } };
  globalThis.ui = { notifications: { warn() {} } };
  try { return await execute(target); }
  finally { Object.assign(globalThis, previous); }
}

for (const allowDraft of [true, false]) {
  test("Suppression " + (allowDraft ? "manual" : "automatic") + " forwards the failed roll to hit recording", async () => {
    await withAppRuntime(async () => {
      const { SuppressionFireApp } = await import("../scripts/tools/suppression-fire-app.js");
      for (const total of [17, 18]) {
        const { result } = await roll({ skill: 25, total, shots: 20, rcl: 1 });
        const recorded = [];
        const locations = [];
        const service = new FireService({ actor: {}, token: {},
          preparedRollExecutor: async () => result });
        const app = {
          attack: {}, fireService: service,
          sessionService: { session: { zones: [{ shotsAllocated: 20, hitsRemaining: 20 }] },
            async recordHits(index, hits, options) {
              recorded.push({ index, hits, options }); return { actualHits: hits };
            } },
          _withTargetSelection: (_id, execute) => execute(),
          _executionOptions: () => ({ rcl: 1, combatCalculation: { rollModifiers: [] } }),
          async _appendRandomLocations(_message, hits) { locations.push(hits); }
        };
        const priorGurps = globalThis.GURPS;
        globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] },
          clear() {}, addModifier() {} } };
        try {
          await SuppressionFireApp.prototype._executeRequest.call(app,
            { zoneIndex: 0, targetId: "target" }, { allowDraft });
        } finally { globalThis.GURPS = priorGurps; }
        assert.deepEqual(recorded, [{ index: 0, hits: 0, options: { allowDraft } }]);
        assert.deepEqual(locations, [0]);
      }
    });
  });
}

test("Spraying failures skip random locations and retain planned physical expenditure", async () => {
  await withAppRuntime(async target => {
    const { SprayingFireApp } = await import("../scripts/tools/spraying-fire-app.js");
    const { SprayingFireSessionService } = await import("../scripts/tools/spraying-fire-session-service.js");
    for (const canRoll of [true, false]) {
      for (const total of [17, 18]) {
        const fx = fixture({ total, canRoll });
        let randomLocations = 0;
        const plannedTarget = { tokenId: "target", name: "Target", shots: 10, completed: false };
        const session = { sessionId: "test-session", weaponKey: "weapon", state: "planned", plannedAmmo: 10,
          nextTarget: 0, targets: [plannedTarget] };
        const state = { weapons: [{ id: "weapon", capacity: 40, magazines: [40], loadedIndex: 0, totalAmmo: 40 }],
          sprayingFireSessions: { key: session } };
        const ammo = attachAmmoState(fx.actor, state);
        const sessionService = new SprayingFireSessionService({ actor: fx.actor,
          token: { id: "source" }, weapon: state.weapons[0], attack: fx.attack });
        Object.defineProperty(sessionService, "key", { value: "key" });
        sessionService.ammo = ammo;
        sessionService.deleteSession = async () => { delete state.sprayingFireSessions.key; return true; };
        const row = { target: plannedTarget, distance: 10, effectiveRcl: 1,
          skill: { effectiveSkill: 25 }, fireMode: { effectiveRoF: 10 },
          bonuses: {}, values: {} };
        const app = {
          session, sessionService, attack: fx.attack, _expandedTargets: new Set(),
          _recompute: () => ({ valid: true, plannedAmmo: 10, rows: [row] }),
          _targetToken: () => target, _queueSave: async () => sessionService.save(session), _refresh: async () => {},
          fireContext: { getTaggedModifierSettings: () => null },
          fireService: {
            calculateRangedAllOutAttackBonus: () => 0,
            executeRangedAttack: (attack, options) => executePreparedGgaRoll({ actor: fx.actor,
              attack, ...options, consumeAction: false, runtime: fx.runtime })
          },
          targetingService: { async resolveRandomHitLocations(hits) { randomLocations += hits; return []; } }
        };
        await SprayingFireApp.prototype._rollTarget.call(app, 0);
        assert.equal(randomLocations, 0);
        assert.equal(plannedTarget.completed, canRoll);
        assert.equal(state.weapons[0].magazines[0], 40);
        assert.equal(await SprayingFireSessionService.prototype.finish.call(sessionService), canRoll);
        assert.equal(state.weapons[0].magazines[0], canRoll ? 30 : 40);
        assert.equal(state.weapons[0].totalAmmo, canRoll ? 30 : 40);
        assert.equal(fx.messages.length, canRoll ? 1 : 0);
      }
    }
  });
});
