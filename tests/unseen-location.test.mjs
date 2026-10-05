import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVisibility, visibilityRules } from "../scripts/tools/limited-visibility.js";

globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");

function app(state) {
  const result = Object.create(FirePreparationApp.prototype);
  result.visibility = normalizeVisibility(state);
  result.token = { actor: { system: { hearing: 12 } },
    document: { getCenterPoint: () => ({ x: 5, y: 5 }) } };
  result.rangeBands = [{ index: 0, max: 10, penalty: 0 },
    { index: 1, max: 100, penalty: -4 }];
  result.fireState = { shots: "1", hitLocation: { zoneId: "silhouette", regionId: null } };
  result.targetRangeRecommendationProvider = () => { throw Error("secret target read"); };
  return result;
}

test("unseen position is unknown until an explicit source is chosen", () => {
  globalThis.game = { user: { targets: new Set([{ id: "hidden" }]) } };
  const result = app({ mode: "unseen" });
  assert.equal(result._hasUnseenDirection(), false);
  assert.equal(result._readTargetRangeRecommendation(), null);
  const html = result._buildUnseenLocationContent(result.visibility);
  assert.match(html, /data-fire-action="hearing-check"/);
  assert.match(html, /data-fire-action="blind-fire"/);
  assert.doesNotMatch(html, /hidden/);
});

test("hearing success remains -6; exact position alone gives -4", () => {
  const heard = normalizeVisibility({ mode: "unseen", location: "approximate", hearing: "success" });
  const exact = normalizeVisibility({ mode: "unseen", location: "exact" });
  assert.equal(visibilityRules(heard).penalty, -6);
  assert.equal(visibilityRules(exact).penalty, -4);
  assert.equal(visibilityRules(normalizeVisibility({ mode: "unseen", location: "hex" })).penalty, -6);
  assert.equal(visibilityRules(heard).aimAllowed, false);
  assert.equal(visibilityRules(heard).random, true);
});

test("a selected hex uses its center and never reads the hidden Token", () => {
  globalThis.game = { user: { targets: { [Symbol.iterator]() { throw Error("target read"); } } } };
  globalThis.canvas = {
    grid: {
      getCenterPoint: ({ i, j }) => ({ x: i * 10 + 5, y: j * 10 + 5 }),
      isGridless: false,
      measurePath: ([a, b]) => ({ spaces: Math.hypot(a.x - b.x, a.y - b.y) })
    },
    get tokens() { throw Error("token layer read"); }
  };
  const result = app({ mode: "unseen", location: "hex", blindFireHex: { i: 2, j: 0 } });
  assert.equal(result._hasUnseenDirection(), true);
  assert.equal(result._readTargetRangeRecommendation().distance, 20);
  assert.equal(result.getShotOptions().targetDistanceOverride, 20);
});

test("a Token source needs an active matching Foundry target", () => {
  const target = { id: "chosen" };
  globalThis.game = { user: { targets: new Set([target]) } };
  const result = app({ mode: "unseen", location: "approximate", targetTokenId: "chosen" });
  assert.equal(result._hasUnseenDirection(), true);
  globalThis.game.user.targets.clear();
  assert.equal(result._hasUnseenDirection(), false);
  result.visibility.blindFireHex = { i: 1, j: 1 };
  assert.equal(result._hasUnseenDirection(), false);
});


test("visibility breakdown keeps unseen safeguards active", () => {
  globalThis.game = { user: { targets: new Set() } };
  globalThis.canvas = { grid: { getCenterPoint: () => ({ x: 0, y: 0 }) } };
  const result = app({ mode: "unseen" });
  result.calculateEffectiveSkill = options => {
    assert.equal(options.visibility.mode, "unseen");
    return 14;
  };
  const html = result._buildVisibilityBreakdown();
  assert.match(html, /-6/);
  assert.match(html, /14/);
});


test("location buttons keep only the chosen method and precision pressed", () => {
  const result = app({ mode: "unseen", location: "approximate", locationMethod: "other" });
  result._knownMethodOpen = true;
  let html = result._buildUnseenLocationContent(result.visibility);
  assert.match(html, /data-fire-action="known-location" class="is-selected" aria-pressed="true"/);
  assert.match(html, /data-fire-action="known-approx" class="is-selected" aria-pressed="true"/);
  assert.match(html, /data-fire-action="known-exact" class="" aria-pressed="false"/);
  result.visibility.location = "exact";
  html = result._buildUnseenLocationContent(result.visibility);
  assert.match(html, /data-fire-action="known-approx" class="" aria-pressed="false"/);
  assert.match(html, /data-fire-action="known-exact" class="is-selected" aria-pressed="true"/);
  result.visibility = normalizeVisibility({ mode: "unseen", location: "hex",
    locationMethod: "blind-fire", blindFireHex: { i: 12, j: 8 } });
  html = result._buildUnseenLocationContent(result.visibility);
  assert.match(html, /data-fire-action="blind-fire" class="is-selected" aria-pressed="true"/);
  assert.match(html, /12, 8/);
  assert.match(html, /data-fire-action="known-location" class="" aria-pressed="false"/);
});

test("Esc keeps the previous blindFireHex; Enter replaces it", async () => {
  const previousElement = globalThis.Element;
  globalThis.Element = class Element {
    closest(selector) { return selector === "button[data-fire-action]" ? this : null; }
  };
  try {
    globalThis.game = { user: { targets: new Set() } };
    const result = app({ mode: "unseen", location: "hex",
      locationMethod: "blind-fire", blindFireHex: { i: 2, j: 3 } });
    result.rendered = true;
    result._getHitControl = () => null;
    result._captureFields = () => {};
    result._readTargetRangeRecommendation = () => ({ rangeIndex: 0 });
    result.render = async () => {};
    result.fireState.manualRangeSelected = false;
    const button = new globalThis.Element();
    button.dataset = { fireAction: "blind-fire" };
    const event = { target: button, preventDefault() {}, stopPropagation() {} };
    result._pickBlindFireHex = async () => null;
    await result._onClick(event);
    assert.deepEqual(result.visibility.blindFireHex, { i: 2, j: 3 });
    assert.equal(result.visibility.locationMethod, "blind-fire");
    result._pickBlindFireHex = async () => ({ offset: { i: 4, j: 5 } });
    await result._onClick(event);
    assert.deepEqual(result.visibility.blindFireHex, { i: 4, j: 5 });
    assert.equal(result.visibility.locationMethod, "blind-fire");
    assert.equal(result.fireState.selectedRangeIndex, 0);
  } finally {
    globalThis.Element = previousElement;
  }
});
