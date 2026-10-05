import test from "node:test";
import assert from "node:assert/strict";
import { parseRateOfFire } from "../scripts/tools/fire-service.js";
import { getSuppressionFireCapacity } from "../scripts/tools/suppression-fire-service.js";
import { angularOrder, planSprayingFire, sprayingCapacity } from "../scripts/tools/spraying-fire-service.js";
import { SprayingFireSessionService, getSpecialFireOwner } from "../scripts/tools/spraying-fire-session-service.js";

globalThis.foundry = { utils: { deepClone: structuredClone, randomID: () => "session-id" } };
globalThis.game = { user: { id: "user" } };
globalThis.canvas = { scene: { id: "scene", regions: { contents: [] } }, grid: { size: 1 } };

const point = (id, x, y) => ({ id, w: 1, h: 1, visible: true, document: { id, x, y, width: 1, height: 1 } });
const source = point("source", 0, 0);

test("RoF parser and availability honor ordinary and full-auto minimums", () => {
  assert.equal(sprayingCapacity(parseRateOfFire("4"), 100, 100).eligible, false);
  assert.match(sprayingCapacity(parseRateOfFire("4"), 100, 100).reason, /RoF/);
  assert.equal(sprayingCapacity(parseRateOfFire("5"), 1, 100).eligible, false);
  assert.equal(sprayingCapacity(parseRateOfFire("5"), 2, 100).eligible, true);
  assert.equal(sprayingCapacity(parseRateOfFire("100!"), 24, 100).eligible, false);
  assert.equal(sprayingCapacity(parseRateOfFire("100!"), 25, 100).eligible, true);
  assert.equal(sprayingCapacity(parseRateOfFire("100!/10!"), 3, 100).usableModes[0].fullRoF, 10);
});

test("sector checks wraparound, reject outside targets, and reverse angular order", () => {
  const upper = point("upper", 10, -1);
  const middle = point("middle", 10, 0);
  const lower = point("lower", 10, 1);
  const outside = point("outside", 8, 8);
  const forward = angularOrder(source, [middle, lower, upper]);
  assert.equal(forward.valid, true);
  assert.deepEqual(forward.ordered.map(token => token.id), ["upper", "middle", "lower"]);
  assert.deepEqual(angularOrder(source, [middle, lower, upper], "right-to-left").ordered.map(token => token.id),
    ["lower", "middle", "upper"]);
  assert.equal(angularOrder(source, [middle, outside]).valid, false);
});

test("traverse uses adjacent target distances and RoF 16 boundary", () => {
  const targets = [point("a", 10, -1), point("b", 10, 0), point("c", 10, 1)];
  const measure = (a, b) => ({ "a:b": 1.2, "b:c": 2.1 })[a.id + ":" + b.id];
  const low = planSprayingFire({ source, targets, fullRoF: 16, minRoF: 1, measure });
  assert.equal(low.valid, true);
  assert.equal(low.waste, 5);
  assert.deepEqual(low.rows.map(row => row.wastedShots), [0, 2, 3]);
  const high = planSprayingFire({ source, targets, fullRoF: 100, minRoF: 25, measure });
  assert.equal(high.waste, 10);
  assert.equal(high.minimum, 25);
});

function fixture() {
  const flags = { world: { gurpsAmmoManager: {
    weapons: [{ id: "weapon", name: "Gun", capacity: 100, magazines: [40], loadedIndex: 0, totalAmmo: 40 }],
    chatSettings: {}
  } } };
  const actor = {
    id: "actor",
    getFlag(scope, key) { return structuredClone(flags[scope]?.[key]); },
    async setFlag(scope, key, value) {
      flags[scope] ??= {};
      const previous = flags[scope][key] ?? {};
      flags[scope][key] = structuredClone({ ...previous, ...value,
        sprayingFireSessions: value.sprayingFireSessions === undefined
          ? previous.sprayingFireSessions
          : { ...previous.sprayingFireSessions, ...value.sprayingFireSessions } });
    },
    async update(changes) {
      for (const path of Object.keys(changes)) {
        const prefix = "flags.world.gurpsAmmoManager.";
        assert.ok(path.startsWith(prefix));
        if (path === prefix + "-=sprayingFireSessions") {
          delete flags.world.gurpsAmmoManager.sprayingFireSessions;
        } else if (path.startsWith(prefix + "sprayingFireSessions.-=")) {
          const key = path.slice((prefix + "sprayingFireSessions.-=").length);
          delete flags.world.gurpsAmmoManager.sprayingFireSessions[key];
        } else throw new Error("Unexpected flag update: " + path);
      }
    }
  };
  const document = { id: "source", x: 0, y: 0, width: 1, height: 1, elevation: 0, getFlag: () => null };
  const token = { id: "source", document, scene: { id: "scene" } };
  const weapon = flags.world.gurpsAmmoManager.weapons[0];
  const service = new SprayingFireSessionService({ token, actor, weapon, attack: { rof: "100!", name: "Gun" } });
  return { actor, token, service, flags };
}

async function plannedSession(service, overrides = {}) {
  return service.createPlanned({
    modeIndex: 0, direction: "left-to-right",
    targets: [{ tokenId: "a", completed: false }, { tokenId: "b", completed: false }],
    plannedAmmo: 2, ...overrides
  });
}
test("cancellation after a completed target preserves physical ammo and clears ownership", async () => {
  const { actor, token, service, flags } = fixture();
  const session = await plannedSession(service);
  assert.equal(getSpecialFireOwner({ actor, token })?.type, "spraying");
  await service.save({ ...session, state: "planned", plannedAmmo: 12,
    targets: [{ completed: true }, { completed: false }] });
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
  await service.cancel();
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
  assert.equal(getSpecialFireOwner({ actor, token }), null);
});

test("deleting one Spraying Fire session preserves another user's plan", async () => {
  const { actor, service, flags } = fixture();
  const own = await plannedSession(service);
  const otherKey = "scene:other-source:other-user";
  flags.world.gurpsAmmoManager.sprayingFireSessions[otherKey] = {
    ...own, sourceTokenId: "other-source", userId: "other-user"
  };
  assert.equal(await service.cancel(), true);
  assert.equal(service.findExisting(), null);
  assert.deepEqual(Object.keys(actor.getFlag("world", "gurpsAmmoManager").sprayingFireSessions), [otherKey]);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
});

test("finish consumes planned ammo once and insufficient ammo keeps the session", async () => {
  const { service, flags } = fixture();
  const session = await plannedSession(service);
  await service.save({ ...session, state: "planned", plannedAmmo: 12,
    targets: [{ completed: true }, { completed: true }] });
  flags.world.gurpsAmmoManager.weapons[0].magazines[0] = 10;
  await assert.rejects(service.finish());
  assert.ok(service.findExisting());
  flags.world.gurpsAmmoManager.weapons[0].magazines[0] = 40;
  assert.equal(await service.finish(), true);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 28);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].totalAmmo, 28);
  assert.equal(await service.finish(), false);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 28);
});
test("Spraying window enforces target order, passes effective Rcl, and delays ammo", async () => {
  globalThis.foundry.applications = { api: { ApplicationV2: class { async render() {} } } };
  const { SprayingFireApp } = await import("../scripts/tools/spraying-fire-app.js");
  const { actor, token, service, flags } = fixture();
  const targets = [point("a", 10, -1), point("b", 10, 0), point("c", 10, 1)];
  globalThis.canvas.grid.isGridless = false;
  globalThis.canvas.grid.measurePath = ([a, b]) => ({ spaces: Math.hypot(a.x - b.x, a.y - b.y) });
  globalThis.canvas.tokens = { get: id => targets.find(entry => entry.id === id) };
  const session = await plannedSession(service);
  await service.save({ ...session, state: "planned", modeIndex: 0,
    targets: targets.map((entry, index) => ({
      tokenId: entry.id, sceneId: "scene", name: "Target",
      geometry: entry.document, shots: index + 1, modifier: 0,
      manualDistance: null, heightOverride: null, highGroundOverride: null,
      completed: false, traverseDistance: 0, wastedShots: 0, usedSnapshot: null
    })) });
  let rollCount = 0;
  const attack = { rof: "100", name: "Gun", level: 12, rcl: "2" };
  const fakeFireService = {
    parseRateOfFire, parseAttackRcl: () => 2,
    calculateRapidFireBonus: () => 0,
    calculateRangedAllOutAttackBonus: () => 0,
    async executeRangedAttack(_attack, options) {
      rollCount++;
      assert.equal(options.rcl, 2 + rollCount - 1);
      assert.equal(options.physicalShots, rollCount);
      assert.equal(options.consumeAction, rollCount === 3);
      return { rolled: true, rollData: { rofrcl: 0 }, message: null };
    }
  };
  const context = {
    getFireModeState: (_attack, values) => ({ effectiveRoF: values.shots, extremelyClose: false }),
    calculateEffectiveFireSkillDetails: () => ({ effectiveSkill: 12 }),
    getFireBonuses: () => ({ aimBonus: 0, sightBonus: 0, bracingBonus: 0, laserBonus: 0, moveAttackPenalty: 0 }),
    getTaggedModifierSettings: () => null,
    getGgaTargetRangeRecommendation: () => null
  };
  const app = new SprayingFireApp({
    token, actor, weapon: flags.world.gurpsAmmoManager.weapons[0], attack,
    fireService: fakeFireService, fireContext: context,
    rangeBands: [{ index: 0, max: 100, penalty: 0, label: "near" }],
    targetingService: {}, sessionService: service
  });
  const display = app._recompute();
  assert.deepEqual(display.rows.map(row => row.traverseDistance), [0, 1, 1]);
  assert.deepEqual(display.rows.map(row => row.wastedShots), [0, 2, 2]);
  assert.equal(display.plan.waste, display.rows.reduce((sum, row) => sum + row.wastedShots, 0));
  assert.equal(display.plannedAmmo, display.shots + display.plan.waste);
  const cardStates = html => [...html.matchAll(/class="sf-card (?:active|waiting|done) (expanded|collapsed)"/g)].map(match => match[1]);
  const html = app._content();
  assert.doesNotMatch(html, /undefined/);
  assert.deepEqual(cardStates(html), ["expanded", "collapsed", "collapsed"]);
  assert.equal((html.match(/sf-transfer/g) ?? []).length, 0);
  assert.equal((html.match(/data-action="roll"/g) ?? []).length, 1);
  assert.match(html, /data-action="toggle-target" data-index="1" aria-expanded="false"/);
  assert.match(html, /data-action="finish"/);
  assert.match(html, /data-action="reselect"/);
  assert.match(html, /data-action="cancel"/);
  const clickHeader = async index => app._onClick({
    target: { closest: () => ({ disabled: false, dataset: { action: "toggle-target", index: String(index) } }) },
    preventDefault() {}
  });
  await clickHeader(1);
  assert.deepEqual(cardStates(app._content()), ["expanded", "expanded", "collapsed"]);
  await clickHeader(1);
  assert.deepEqual(cardStates(app._content()), ["expanded", "collapsed", "collapsed"]);
  assert.match(html, /data-field="manualDistance"/);
  assert.match(html, /data-action="auto-distance"/);
  assert.match(html, /data-field="heightOverride"/);
  assert.match(html, /data-field="modifier"/);
  const originalTargets = structuredClone(app.session.targets);
  for (const count of [2, 5]) {
    const previewTokens = Array.from({ length: count }, (_, index) => point("preview-" + index, 10, index - 2));
    canvas.tokens.get = id => previewTokens.find(entry => entry.id === id);
    app.session.targets = previewTokens.map(entry => ({ ...structuredClone(originalTargets[0]),
      tokenId: entry.id, geometry: entry.document, completed: false, usedSnapshot: null }));
    app._expandedTargets.clear();
    assert.deepEqual(cardStates(app._content()), ["expanded", ...Array(count - 1).fill("collapsed")]);
  }
  app.session.targets = originalTargets;
  canvas.tokens.get = id => targets.find(entry => entry.id === id);
  app._expandedTargets.clear();
  await app._rollTarget(2);
  assert.equal(rollCount, 0);
  await app._rollTarget(0);
  assert.equal(rollCount, 1);
  assert.equal(service.findExisting().targets[0].completed, true);
  assert.equal(service.findExisting().nextTarget, 1);
  assert.deepEqual(cardStates(app._content()), ["collapsed", "expanded", "collapsed"]);
  await clickHeader(0);
  assert.deepEqual(cardStates(app._content()), ["expanded", "expanded", "collapsed"]);
  assert.match(app._content(), /data-action="roll" data-index="0"  disabled/);
  await app._rollTarget(0);
  assert.equal(rollCount, 1);
  const reopened = new SprayingFireApp({
    token, actor, weapon: flags.world.gurpsAmmoManager.weapons[0], attack,
    fireService: fakeFireService, fireContext: context,
    rangeBands: [{ index: 0, max: 100, penalty: 0, label: "near" }],
    targetingService: {}, sessionService: service
  });
  assert.deepEqual(cardStates(reopened._content()), ["collapsed", "expanded", "collapsed"]);
  assert.doesNotMatch(app._content(), /undefined/);
  assert.equal(app._recompute().plan.waste, 4);
  await app._rollTarget(2);
  assert.equal(rollCount, 1);
  await app._rollTarget(1);
  assert.deepEqual(cardStates(app._content()), ["collapsed", "collapsed", "expanded"]);
  await app._rollTarget(2);
  assert.equal(rollCount, 3);
  assert.equal(service.findExisting().nextTarget, -1);
  assert.deepEqual(cardStates(app._content()), ["collapsed", "collapsed", "collapsed"]);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
});
test("shared Fire Control accepts a per-target distance override", async () => {
  const { createFireControlContext } = await import("../scripts/tools/fire-control-context.js");
  const service = {
    resolvePhysicalFireDistance: ({ targetDistance, selectedDistance, manualRangeSelected }) =>
      manualRangeSelected ? selectedDistance : targetDistance,
    parseHalfDamageRange: () => null,
    resolveMultipleProjectileFire: ({ physicalDistance, physicalShots }) =>
      ({ physicalDistance, effectiveRoF: physicalShots })
  };
  const context = createFireControlContext({ token: source, fireService: service });
  const bands = [{ index: 0, max: 100, penalty: -7, label: "100" }];
  const mode = context.getFireModeState({ rof: "5" },
    { shots: 5, rangeIndex: 0, targetDistanceOverride: 17 }, bands);
  assert.equal(mode.physicalDistance, 17);
  game.user.targets = new Set([point("ordinary-target", 25, 0)]);
  canvas.grid.measurePath = ([a, b]) => ({ spaces: Math.hypot(a.x - b.x, a.y - b.y) });
  const ordinary = context.getFireModeState({ rof: "5" },
    { shots: 5, rangeIndex: 0, targetDistanceOverride: null }, bands);
  assert.equal(ordinary.physicalDistance, 25);
  game.user.targets = new Set();
});
test("ownership blocks a second user's session on the same source Token", async () => {
  const { actor, token, service } = fixture();
  await plannedSession(service);
  const original = game.user.id;
  try {
    game.user.id = "other-user";
    assert.equal(getSpecialFireOwner({ actor, token })?.type, "spraying");
    const other = new SprayingFireSessionService({
      token, actor, weapon: service.weapon, attack: service.attack
    });
    await assert.rejects(plannedSession(other));
  } finally {
    game.user.id = original;
  }
});

test("ownership sees saved Suppression Fire sessions regardless of user", async () => {
  const { actor, token, service } = fixture();
  token.document.getFlag = (scope, key) => scope === "olegurps-qol" && key === "suppressionFireSessions"
    ? { existing: { state: "draft", sceneId: "scene", sourceTokenId: "source", userId: "other-user" } }
    : null;
  assert.equal(getSpecialFireOwner({ actor, token })?.type, "suppression");
  await assert.rejects(plannedSession(service));
});
test("Canvas picker hides and restores its parent app without awaiting minimize", async () => {
  const { selectSprayingTargets } = await import("../scripts/tools/spraying-fire-selection.js");
  const events = {};
  const view = {
    addEventListener: (type, handler) => { events[type] = handler; },
    removeEventListener: type => { delete events[type]; }
  };
  const parent = {
    rendered: true, element: { style: { visibility: "visible" } },
    minimize() { throw new Error("minimize must not block selection"); }
  };
  const runtime = {
    canvas: { app: { view }, canvasCoordinatesFromClient: p => p,
      tokens: { placeables: [], setTargets() {} } },
    game: { user: { targets: new Set() } },
    document: { createElement: () => ({ remove() {} }), body: { append() {} } },
    addEventListener: (type, handler) => { events[type] = handler; },
    removeEventListener: type => { delete events[type]; }
  };
  const picker = selectSprayingTargets(source, [parent], runtime);
  await new Promise(setImmediate);
  assert.equal(parent.element.style.visibility, "hidden");
  events.keydown({ key: "Escape", preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(await picker, null);
  assert.equal(parent.element.style.visibility, "visible");
  assert.equal(events.keydown, undefined);
});

test("Canvas selection rejects an outside token, preserves right click, and requires two targets", async () => {
  const { selectSprayingTargets } = await import("../scripts/tools/spraying-fire-selection.js");
  const selected = [];
  const events = {};
  const a = point("a", 10, 0);
  const b = point("b", 10, 1);
  const outside = point("outside", 8, 8);
  const view = {
    addEventListener: (type, handler) => { events[type] = handler; },
    removeEventListener: type => { delete events[type]; }
  };
  const runtime = {
    canvas: {
      app: { view }, grid: { size: 1 },
      canvasCoordinatesFromClient: ({ x, y }) => ({ x, y }),
      tokens: { placeables: [a, b, outside], setTargets: ids => selected.push([...ids]) }
    },
    game: { user: { targets: new Set() } },
    document: { createElement: () => ({ remove() {} }), body: { append() {} } },
    ui: { notifications: { warn() {} } },
    addEventListener: (type, handler) => { events[type] = handler; },
    removeEventListener: type => { delete events[type]; }
  };
  const click = (x, y, button = 0) => {
    let intercepted = false;
    events.click({ button, clientX: x, clientY: y,
      preventDefault: () => { intercepted = true; }, stopImmediatePropagation() {} });
    return intercepted;
  };
  const fx = fixture();
  const promise = selectSprayingTargets(source, [], runtime);
  await new Promise(setImmediate);
  assert.equal(click(10.2, 0.2), true);
  let resolved = false;
  promise.then(() => { resolved = true; });
  events.keydown({ key: "Enter", preventDefault() {}, stopImmediatePropagation() {} });
  await new Promise(setImmediate);
  assert.equal(resolved, false);
  assert.equal(fx.service.findExisting(), null);
  assert.equal(getSpecialFireOwner({ actor: fx.actor, token: fx.token }), null);
  assert.equal(click(8.2, 8.2), true);
  assert.deepEqual(selected.at(-1), ["a"]);
  assert.equal(click(10.2, 0.2), true);
  assert.deepEqual(selected.at(-1), []);
  assert.equal(click(10.2, 0.2), true);
  assert.equal(click(10.2, 1.2, 2), false);
  assert.deepEqual(selected.at(-1), ["a"]);
  assert.equal(click(10.2, 1.2), true);
  events.keydown({ key: "Enter", preventDefault() {}, stopImmediatePropagation() {} });
  const confirmed = await promise;
  assert.deepEqual(confirmed.map(token => token.id), ["a", "b"]);
  assert.equal(fx.service.findExisting(), null);
  await fx.service.createPlanned({
    targets: confirmed.map(target => ({ tokenId: target.id, completed: false })),
    plannedAmmo: 2
  });
  assert.equal(fx.service.findExisting()?.state, "planned");
  assert.equal(getSpecialFireOwner({ actor: fx.actor, token: fx.token })?.type, "spraying");
  await fx.service.cancel();
  const cancelled = selectSprayingTargets(source, [], runtime);
  await new Promise(setImmediate);
  events.keydown({ key: "Escape", preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(await cancelled, null);
  assert.equal(fx.service.findExisting(), null);
  assert.equal(getSpecialFireOwner({ actor: fx.actor, token: fx.token }), null);
  assert.equal(events.click, undefined);
  const controller = new AbortController();
  const interrupted = selectSprayingTargets(source, [], runtime, controller.signal);
  await new Promise(setImmediate);
  controller.abort();
  assert.equal(await interrupted, null);
  assert.equal(events.click, undefined);
  const closed = selectSprayingTargets(source, [], runtime);
  await new Promise(setImmediate);
  events.pagehide();
  assert.equal(await closed, null);
  assert.equal(events.click, undefined);
});

test("special-fire menu keeps unavailable modes visible with concrete reasons", async () => {
  globalThis.foundry.applications = { api: { ApplicationV2: class {} } };
  const { SpecialFireMenuApp } = await import("../scripts/tools/special-fire-menu-app.js");
  const app = new SpecialFireMenuApp({ registry: [
    { id: "suppression", label: "Suppression Fire", description: "One",
      icon: "fa-solid fa-burst", hasSession: () => true,
      availability: () => ({ available: true }), open() {} },
    { id: "spraying", label: "Spraying Fire", description: "Two",
      hasSession: () => false, availability: () => ({ available: false, reason: "RoF 5+" }), open() {} }
  ] });
  const html = await app._renderHTML();
  assert.match(html, /Suppression Fire.*\u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c/s);
  assert.match(html, /data-mode="spraying" disabled>Spraying Fire/);
  assert.match(html, /title="RoF 5\+"/);
});

test("stale Shooting Assistant saves preserve active sessions without resurrecting cancelled ones", async () => {
  const { service } = fixture();
  const staleBeforeStart = await service.ammo.loadState();
  await plannedSession(service);
  staleBeforeStart.weapons[0].totalAmmo = 35;
  await service.ammo.saveState(staleBeforeStart);
  assert.ok(service.findExisting());
  assert.equal((await service.ammo.loadState()).weapons[0].totalAmmo, 35);
  const staleBeforeCancel = await service.ammo.loadState();
  await service.cancel();
  await service.ammo.saveState(staleBeforeCancel);
  assert.equal(service.findExisting(), null);
});
test("existing Suppression Fire capacity remains based on its five-round minimum", () => {
  assert.equal(getSuppressionFireCapacity({
    profile: parseRateOfFire("4"), loaded: 100, totalAmmo: 100
  }).eligible, false);
  assert.equal(getSuppressionFireCapacity({
    profile: parseRateOfFire("5"), loaded: 4, totalAmmo: 100
  }).eligible, false);
  assert.equal(getSuppressionFireCapacity({
    profile: parseRateOfFire("5"), loaded: 5, totalAmmo: 5
  }).eligible, true);
});

test("reselect clears completed plan and modifiers without spending ammo", async () => {
  const { service, flags } = fixture();
  const session = await plannedSession(service);
  await service.save({ ...session, state: "planned", plannedAmmo: 9, nextTarget: 1,
    common: { ...session.common, aimSeconds: 3, manualModifier: 2 },
    targets: [{ completed: true, shots: 5, manualDistance: 25, modifier: -2 },
      { completed: false, shots: 2, manualDistance: null, modifier: 0 }] });
  assert.equal(await service.cancel(), true);
  assert.equal(service.findExisting(), null);
  assert.equal(getSpecialFireOwner({ token: service.token, actor: service.actor }), null);
  const fresh = await plannedSession(service);
  assert.equal(fresh.common.aimSeconds, 0);
  assert.equal(fresh.targets.some(target => target.completed), false);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
});
test("switching between full-auto RoF modes keeps a legal minimum allocation", async () => {
  const { SprayingFireApp } = await import("../scripts/tools/spraying-fire-app.js");
  const { actor, token, service, flags } = fixture();
  const targets = [point("a", 10, -1), point("b", 10, 0), point("c", 10, 1)];
  canvas.grid.isGridless = false;
  canvas.grid.measurePath = ([a, b]) => ({ spaces: Math.hypot(a.x - b.x, a.y - b.y) });
  canvas.tokens = { get: id => targets.find(entry => entry.id === id) };
  const session = await plannedSession(service, { modeIndex: 1 });
  await service.save({ ...session, state: "planned", modeIndex: 1,
    targets: targets.map(entry => ({
      tokenId: entry.id, sceneId: "scene", name: "Target", geometry: entry.document,
      shots: 1, modifier: 0, manualDistance: null, heightOverride: null,
      highGroundOverride: null, completed: false, traverseDistance: 0,
      wastedShots: 0, usedSnapshot: null
    })) });
  const app = new SprayingFireApp({
    token, actor, weapon: flags.world.gurpsAmmoManager.weapons[0],
    attack: { rof: "100!/10!", name: "Gun", level: 12, rcl: "2" },
    fireService: { parseRateOfFire, parseAttackRcl: () => 2,
      calculateRapidFireBonus: () => 0 },
    fireContext: {
      getFireModeState: (_attack, values) => ({ effectiveRoF: values.shots }),
      calculateEffectiveFireSkillDetails: () => ({ effectiveSkill: 12 }),
      getFireBonuses: () => ({})
    },
    rangeBands: [{ index: 0, max: 100, penalty: 0, label: "near" }],
    targetingService: {}, sessionService: service
  });
  app._refresh = async () => {};
  await app._onInput({ type: "change", target: { dataset: { field: "modeIndex" }, value: "0" } });
  assert.equal(app.session.modeIndex, 0);
  assert.equal(app._recompute().plannedAmmo, 25);
  await app._onInput({ type: "change", target: { dataset: { field: "modeIndex" }, value: "1" } });
  assert.equal(app.session.modeIndex, 1);
  assert.equal(app._recompute().plannedAmmo, 5);
  assert.deepEqual(app.session.targets.map(target => target.shots), [1, 1, 1]);
});
test("legacy selecting flag has no ownership and is removed before a new picker", async () => {
  const { actor, token, service, flags } = fixture();
  flags.world.gurpsAmmoManager.sprayingFireSessions = {
    [service.key]: { state: "selecting", sceneId: "scene", sourceTokenId: "source",
      weaponKey: service.weaponKey, userId: "user", targets: [] }
  };
  assert.equal(service.findExisting(), null);
  assert.equal(getSpecialFireOwner({ actor, token }), null);
  assert.equal(await service.discardUnconfirmed(), true);
  assert.equal(flags.world.gurpsAmmoManager.sprayingFireSessions, undefined);
  await assert.rejects(service.save({ state: "selecting" }));
  assert.equal(flags.world.gurpsAmmoManager.sprayingFireSessions, undefined);
});

test("reselect releases ownership before starting its temporary Canvas picker", async () => {
  const { SprayingFireApp } = await import("../scripts/tools/spraying-fire-app.js");
  const { actor, token, service, flags } = fixture();
  await plannedSession(service);
  let resumed = false;
  const app = {
    _rolling: false, _pending: Promise.resolve(), sessionService: service,
    async close() {},
    async onReselect() {
      resumed = true;
      assert.equal(service.findExisting(), null);
      assert.equal(getSpecialFireOwner({ actor, token }), null);
    }
  };
  const button = { disabled: false, dataset: { action: "reselect" } };
  await SprayingFireApp.prototype._onClick.call(app, {
    target: { closest: () => button }, preventDefault() {}
  });
  assert.equal(resumed, true);
  assert.equal(flags.world.gurpsAmmoManager.sprayingFireSessions, undefined);
});
test("Cancel deletes a completed plan before close and menu return without spending ammo", async () => {
  const { SprayingFireApp } = await import("../scripts/tools/spraying-fire-app.js");
  const { actor, token, service, flags } = fixture();
  const session = await plannedSession(service);
  await service.save({ ...session, targets: [
    { tokenId: "a", completed: true, shots: 3, modifier: 2, usedSnapshot: { rollMessageId: "chat-1" } },
    { tokenId: "b", completed: false, shots: 4, modifier: -1, manualDistance: 30 }
  ], plannedAmmo: 12, common: { aimSeconds: 2, manualModifier: 4 }, nextTarget: 1 });
  const messages = ["chat-1"];
  const order = [];
  const originalUpdate = actor.update;
  actor.update = async changes => {
    await new Promise(setImmediate);
    await originalUpdate(changes);
    order.push("delete");
  };
  const app = {
    _rolling: false, _pending: Promise.resolve(), sessionService: service, rendered: true,
    async close() {
      order.push("close");
      assert.equal(service.findExisting(), null);
      assert.equal(getSpecialFireOwner({ actor, token }), null);
    },
    async onComplete() { order.push("refresh"); },
    async onCancel() {
      order.push("menu");
      assert.equal(service.findExisting(), null);
    }
  };
  const button = { disabled: false, dataset: { action: "cancel" } };
  await SprayingFireApp.prototype._onClick.call(app, {
    target: { closest: () => button }, preventDefault() {}
  });
  assert.deepEqual(order, ["delete", "close", "refresh", "menu"]);
  assert.equal(flags.world.gurpsAmmoManager.sprayingFireSessions, undefined);
  assert.equal(flags.world.gurpsAmmoManager.weapons[0].magazines[0], 40);
  assert.deepEqual(messages, ["chat-1"]);
});

test("special-fire menu changes from no session to resume only after plan confirmation", async () => {
  const { SpecialFireMenuApp } = await import("../scripts/tools/special-fire-menu-app.js");
  const { actor, token, service } = fixture();
  const blocked = "Finish the current special-fire mode";
  const registry = [
    { id: "suppression", label: "Suppression Fire", description: "Suppression",
      hasSession: () => false,
      availability: () => getSpecialFireOwner({ actor, token })?.type === "spraying"
        ? { available: false, reason: blocked } : { available: true }, open() {} },
    { id: "spraying", label: "Spraying Fire", description: "Spraying",
      hasSession: () => !!service.findExisting(),
      availability: () => ({ available: true }), open() {} }
  ];
  const menu = new SpecialFireMenuApp({ registry });
  const before = await menu._renderHTML();
  assert.match(before, /data-mode="suppression" >Suppression Fire/);
  assert.doesNotMatch(before, /Spraying Fire[^<]*\u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c/);
  await plannedSession(service);
  const after = await menu._renderHTML();
  assert.match(after, /data-mode="suppression" disabled>Suppression Fire/);
  assert.match(after, /Spraying Fire[^<]*\u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c/);
  const reopened = new SprayingFireSessionService({
    actor, token, weapon: service.weapon, attack: service.attack
  });
  assert.equal(reopened.findExisting()?.state, "planned");
  await service.cancel();
  const cancelled = await menu._renderHTML();
  assert.match(cancelled, /data-mode="suppression" >Suppression Fire/);
  assert.doesNotMatch(cancelled, /Spraying Fire[^<]*\u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c/);
});