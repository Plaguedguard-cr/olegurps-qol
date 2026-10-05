import test from "node:test";
import assert from "node:assert/strict";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";

const bands = [{ index: 0, max: 100, penalty: 0, label: "100" }];
const target = {
  getSelection(id) {
    return { zoneId: id, label: id, penalty: id === "silhouette" ? 0 : -5 };
  }
};
const service = {
  normalizeAccuracy: () => 1,
  normalizeBulk: () => 1,
  resolveAimedFireBonuses: ({ aimSeconds, laserSight }) => ({
    aimBonus: Number(aimSeconds) > 0 ? 3 : 0,
    sightBonus: 0,
    bracingBonus: 0,
    laserBonus: laserSight ? 1 : 0
  }),
  calculateMoveAttackPenalty: () => 0,
  calculateRapidFireBonus: () => 0,
  resolvePhysicalFireDistance: () => 10,
  parseHalfDamageRange: () => null,
  resolveMultipleProjectileFire: () => ({ effectiveRoF: 1 }),
  calculateRangedAllOutAttackBonus: () => 0,
  getPreviewModifierTotal: () => 0
};

function context() {
  globalThis.game = {
    user: { targets: new Set() },
    settings: { get: () => null }
  };
  globalThis.GURPS = {};
  return createFireControlContext({ token: null, fireService: service });
}
const values = {
  rangeIndex: 0, shots: 1, hitLocationId: "head", aimSeconds: 1,
  laserSight: true, braced: false, manualModifier: 0
};

test("visibility uses ordinary Fire Control and forces random/zero Aim for unseen targets", () => {
  const fire = context();
  const attack = { level: 20, acc: 3, rof: "1", data: { bulk: -2 } };
  const ordinary = fire.calculateEffectiveFireSkill(attack, values, bands, target);
  assert.equal(ordinary, 19);
  for (const penalty of [-1, -3, -6, -9]) {
    const result = fire.calculateEffectiveFireSkill(attack,
      { ...values, visibility: { mode: "partial", partialPenalty: penalty } }, bands, target);
    assert.equal(result, ordinary + penalty);
  }
  const unseen = fire.calculateEffectiveFireSkillDetails(attack,
    { ...values, visibility: { mode: "unseen" } }, bands, target);
  assert.equal(unseen.effectiveSkill, 14);
  assert.equal(unseen.modifiers.find(entry => entry.label === "Aim").value, 0);
  assert.equal(unseen.modifiers.find(entry => entry.label === "Hit Location: silhouette").value, 0);
  const known = fire.calculateEffectiveFireSkill(attack,
    { ...values, visibility: { mode: "known" } }, bands, target);
  assert.equal(known, 16);
});

test("Shooting Blind applies -10 or -6 before the final cap of 9", () => {
  const fire = context();
  const attack = { level: 30, acc: 3, rof: "1", data: { bulk: -2 } };
  for (const [accustomed, penalty] of [[false, -10], [true, -6]]) {
    const details = fire.calculateEffectiveFireSkillDetails(attack,
      { ...values, visibility: { mode: "blind", accustomed } }, bands, target);
    assert.equal(details.calculatedSkill, 30 + penalty);
    assert.equal(details.effectiveSkill, 9);
    assert.equal(details.modifiers.find(entry => entry.label === "Cap Shooting Blind: 9").value,
      9 - details.calculatedSkill);
  }
});


test("blind-fire picker selects only a Grid cell and leaves token data untouched", async () => {
  const { selectBlindFireHex } = await import("../scripts/tools/blind-fire-hex-selection.js");
  const view = new EventTarget();
  const runtimeEvents = new EventTarget();
  let tokenReads = 0;
  const canvas = {
    app: { canvas: view },
    canvasCoordinatesFromClient: ({ x, y }) => ({ x, y }),
    grid: {
      getOffset: ({ x, y }) => ({ i: Math.floor(x / 10), j: Math.floor(y / 10) }),
      getCenterPoint: ({ i, j }) => ({ x: i * 10 + 5, y: j * 10 + 5 }),
      getVertices: ({ i, j }) => [
        { x: i * 10, y: j * 10 }, { x: i * 10 + 10, y: j * 10 },
        { x: i * 10 + 10, y: j * 10 + 10 }
      ]
    },
    get tokens() { tokenReads++; throw new Error("hidden token access"); }
  };
  const hint = { textContent: "", remove() {} };
  const runtime = {
    canvas,
    document: { createElement: () => hint, body: { append() {} } },
    addEventListener: runtimeEvents.addEventListener.bind(runtimeEvents),
    removeEventListener: runtimeEvents.removeEventListener.bind(runtimeEvents)
  };
  const app = { element: { style: { visibility: "visible" } } };
  const selected = selectBlindFireHex(app, runtime);
  const click = new Event("click", { cancelable: true });
  Object.defineProperties(click, {
    button: { value: 0 }, clientX: { value: 24 }, clientY: { value: 33 }
  });
  view.dispatchEvent(click);
  const enter = new Event("keydown", { cancelable: true });
  Object.defineProperty(enter, "key", { value: "Enter" });
  runtimeEvents.dispatchEvent(enter);
  const result = await selected;
  assert.deepEqual(result.offset, { i: 2, j: 3 });
  assert.equal(tokenReads, 0);
  assert.equal(app.element.style.visibility, "visible");
});

test("distance to a selected hex uses the shared grid path and scene units", async () => {
  const { measureCanvasPointDistanceYards } = await import("../scripts/tools/fire-control-context.js");
  const runtime = {
    canvas: { grid: { isGridless: false, measurePath: ([a, b]) =>
      ({ spaces: Math.hypot(a.x - b.x, a.y - b.y) }) } }
  };
  const source = { document: { getCenterPoint: () => ({ x: 5, y: 5 }) } };
  assert.equal(measureCanvasPointDistanceYards(source, { x: 25, y: 5 }, runtime), 20);
});


test("visibility block hides restricted target names and explains the blind cap", async () => {
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  globalThis.CONST = { TOKEN_DISPLAY_MODES: { HOVER: 10, ALWAYS: 20 } };
  globalThis.game = { user: { targets: new Set([{
    visible: true,
    document: { name: "Secret Enemy", hidden: true, displayName: 20 }
  }]) } };
  const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
  const app = Object.create(FirePreparationApp.prototype);
  app.token = { actor: { system: { hearing: 12 } } };
  app.visibility = { mode: "blind", accustomed: false, hearing: "success", knownLocation: true, hex: null };
  app.getShotOptions = () => ({ visibility: app.visibility });
  app.calculateEffectiveSkill = values => values.visibility ? 9 : 24;
  app.targetingService = {};
  const html = app._buildVisibilityContent();
  assert.match(html, /Cap Shooting Blind: 9/);
  assert.match(html, /Hearing-2/);
  assert.doesNotMatch(html, /Secret Enemy/);
  assert.match(html, /\\u0426\\u0435\\u043b\\u044c|\u0426\u0435\u043b\u044c/);
});


test("unknown blind position never reads target distance or target modifiers", () => {
  globalThis.game = {
    user: { targets: { [Symbol.iterator]() { throw new Error("target position read"); } } },
    settings: { get: () => ({ autoAdd: true }) }
  };
  globalThis.GURPS = {
    EffectModifierControl: { _ui: {
      getToken: () => null,
      getData: () => ({ selfmodifiers: [], targets: [{ targetmodifiers: [
        { desc: "-9 Secret Enemy", tags: ["ranged"], itemId: "combatmod" }
      ] }] })
    } }
  };
  const fire = createFireControlContext({ token: null, fireService: {
    ...service,
    resolvePhysicalFireDistance: ({ targetDistance }) => targetDistance,
    resolveMultipleProjectileFire: ({ physicalDistance }) => ({ physicalDistance, effectiveRoF: 1 })
  } });
  const blind = { ...values, visibility: { mode: "blind", knownLocation: false } };
  assert.equal(fire.getFireModeState({ rof: "1" }, blind, bands).physicalDistance, null);
  const details = fire.calculateEffectiveFireSkillDetails(
    { level: 20, acc: 3, rof: "1", data: { bulk: -2 } }, blind, bands, target);
  assert.equal(details.modifiers.find(entry => entry.label === "\u042d\u0444\u0444\u0435\u043a\u0442\u044b GGA").value, 0);
});


test("blind hex roll needs no physical target and does not touch token layer", async () => {
  const { withClearedFoundryTargets } = await import("../scripts/tools/foundry-targets.js");
  let tokenLayerReads = 0;
  const runtime = {
    game: { user: { targets: new Set() } },
    canvas: { get tokens() { tokenLayerReads++; throw new Error("token layer read"); } }
  };
  let rolled = 0;
  const result = await withClearedFoundryTargets(async () => { rolled++; return "rolled"; }, runtime);
  assert.equal(result, "rolled");
  assert.equal(rolled, 1);
  assert.equal(tokenLayerReads, 0);
});

test("blind hex roll clears and restores previous Foundry targets even on failure", async () => {
  const { withClearedFoundryTargets } = await import("../scripts/tools/foundry-targets.js");
  const prior = { document: { id: "prior-target" } };
  const user = { targets: new Set([prior]) };
  const calls = [];
  const runtime = {
    game: { user },
    canvas: { tokens: { setTargets(ids, options) {
      calls.push({ ids: [...ids], mode: options.mode });
      user.targets = ids.length ? new Set([prior]) : new Set();
    } } }
  };
  const result = await withClearedFoundryTargets(() => {
    assert.equal(user.targets.size, 0);
    return "rolled";
  }, runtime);
  assert.equal(result, "rolled");
  assert.deepEqual(calls, [
    { ids: [], mode: "replace" },
    { ids: ["prior-target"], mode: "replace" }
  ]);
  calls.length = 0;
  await assert.rejects(withClearedFoundryTargets(() => {
    assert.equal(user.targets.size, 0);
    throw new Error("roll failed");
  }, runtime), /roll failed/);
  assert.deepEqual(calls, [
    { ids: [], mode: "replace" },
    { ids: ["prior-target"], mode: "replace" }
  ]);
});

test("known-position Token keeps safe name and Token distance/elevation", async () => {
  const { getSafeTargetName } = await import("../scripts/tools/foundry-targets.js");
  const { getTokenFireRangeContext } = await import("../scripts/tools/fire-control-context.js");
  const source = { document: { id: "source", elevation: 8 } };
  const known = { document: { id: "known", elevation: 2, name: "Known Target",
    hidden: false, displayName: 20 } };
  const hidden = { document: { id: "hidden", name: "Hidden Target",
    hidden: true, displayName: 20 } };
  const runtime = {
    CONST: { TOKEN_DISPLAY_MODES: { HOVER: 10, ALWAYS: 20 } },
    canvas: { grid: { isGridless: false, measurePath: ([a, b]) => {
      assert.equal(a, source.document);
      assert.equal(b, known.document);
      return { spaces: 14 };
    } } }
  };
  assert.equal(getSafeTargetName(known, runtime), "Known Target");
  assert.equal(getSafeTargetName(hidden, runtime), "\u0426\u0435\u043b\u044c");
  assert.deepEqual(getTokenFireRangeContext({
    sourceToken: source, targetToken: known, rangeBands: bands, runtime
  }), {
    distance: 14, height: 6, highGround: true,
    rangeIndex: 0, rangePenalty: 0, rangeLabel: "100"
  });
});

test("unknown blind position does not inspect selected target for a display name", async () => {
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  globalThis.game = { user: { targets: {
    [Symbol.iterator]() { throw new Error("target read"); }
  } } };
  const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
  const app = Object.create(FirePreparationApp.prototype);
  app.token = { actor: { system: { hearing: 12 } } };
  app.visibility = { mode: "blind", accustomed: false, hearing: "failure",
    knownLocation: false, hex: { i: 2, j: 3 } };
  app.getShotOptions = () => ({ visibility: app.visibility });
  app.calculateEffectiveSkill = () => 9;
  app.targetingService = {};
  assert.doesNotThrow(() => app._buildVisibilityContent());
});
