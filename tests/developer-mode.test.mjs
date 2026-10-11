import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { armTestRoll, cancelTestRoll, getPendingTestRoll, evaluatePreparedCheck, subscribeTestRoll } from "../scripts/tools/developer-roll-service.js";
import { executePreparedGgaRoll, executePreparedSkillRoll } from "../scripts/tools/prepared-gga-roll.js";

const gm = { id: "gm", isGM: true };
globalThis.game = { user: gm };
afterEach(() => { globalThis.game.user = gm; cancelTestRoll(); });

class TestRoll {
  constructor(formula, data = null) {
    this.formula = formula;
    this.terms = data?.terms ?? [{ class: "Die", number: 3, faces: 6, modifiers: [], results: [], evaluated: false }];
    this.dice = this.terms;
    this.total = data?.total;
    this.evaluated = data?.evaluated ?? false;
  }
  static create(formula) { return new TestRoll(formula); }
  static fromData(data) { return new TestRoll(data.formula, data); }
  toJSON() { return structuredClone({ class: "Roll", formula: this.formula, terms: this.terms, evaluated: this.evaluated, total: this.total }); }
  async evaluate() {
    this.total = 12; this.evaluated = true;
    this.terms[0].results = [4, 4, 4].map(result => ({ result, active: true }));
    return this;
  }
}
function fixture(user = gm) {
  const messages = [];
  const runtime = {
    Roll: TestRoll, game: { user, settings: { get: () => null }, i18n: { localize: () => "Test roll" } },
    GURPS: { ModifierBucket: { modifierStack: {}, applyMods: async () => [] }, setLastTargetedRoll() {} },
    canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({}), create: async data => { messages.push(data); return data; } },
    renderTemplate: async (_path, data) => `<p>${data.rtotal}: ${data.failure}</p>`
  };
  const actor = { id: "actor", canRoll: async () => ({ canRoll: true, hasActions: true }) };
  const run = () => executePreparedGgaRoll({ actor, attack: { name: "Gun", level: 25 },
    effectiveSkill: 25, physicalShots: 20, effectiveRoF: 20, rcl: 1, consumeAction: false, runtime });
  return { runtime, actor, messages, run };
}

for (const total of [3, 10, 17, 18]) {
  test(`forced attack ${total}: real dice, unchanged outcomes and visible mark`, async () => {
    armTestRoll(total); const fx = fixture(); const result = await fx.run();
    assert.equal(result.roll.total, total);
    assert.ok(result.roll instanceof TestRoll);
    assert.equal(result.roll.dice[0].results.reduce((s, r) => s + r.result, 0), total);
    assert.ok(result.roll.dice[0].results.every(r => r.result >= 1 && r.result <= 6));
    assert.equal(result.rollData.rtotal, total);
    assert.equal(result.rollData.failure, total >= 17);
    assert.equal(result.rollData.isCritSuccess, total === 3);
    assert.equal(result.rollData.isCritFailure, total === 18);
    assert.equal(result.rollData.rofrcl, total >= 17 ? 0 : Math.min(20, 26 - total));
    assert.match(fx.messages[0].content, /Test roll/);
    assert.equal(fx.messages[0].rolls[0], result.roll);
    assert.deepEqual(fx.messages[0].flags["olegurps-qol"].testRoll, { total, userId: "gm" });
    assert.equal(getPendingTestRoll(), null);
    const ordinary = await fx.run();
    assert.equal(ordinary.roll.total, 12);
    assert.doesNotMatch(ordinary.message.content, /Test roll/);
    assert.equal(ordinary.message.flags, undefined);
  });
  test(`prepared skill supports forced ${total}`, async () => {
    armTestRoll(total); const fx = fixture(); let locations = 0;
    const result = await executePreparedSkillRoll({ baseSkill: 25, effectiveSkill: 25,
      effectiveRoF: 20, rcl: 1, location: { random: true },
      targetingService: { resolveRandomHitLocations: async () => { locations++; return []; } }, runtime: fx.runtime });
    assert.equal(result.roll.total, total);
    assert.equal(result.rollData.failure, total >= 17);
    assert.equal(locations, total >= 17 ? 0 : 1);
    assert.equal(result.message.flags["olegurps-qol"].testRoll.total, total);
    assert.equal(getPendingTestRoll(), null);
  });
}
test("cancellation before evaluation retains pending result", async () => {
  armTestRoll(17); const fx = fixture(); fx.actor.canRoll = async () => ({ canRoll: false });
  assert.equal((await fx.run()).rolled, false);
  assert.equal(getPendingTestRoll(), 17);
  assert.equal(fx.messages.length, 0);
});
test("manual cancellation restores ordinary rolls", async () => {
  armTestRoll(3); cancelTestRoll();
  assert.equal(getPendingTestRoll(), null);
  assert.equal((await fixture().run()).roll.total, 12);
});
test("other users, including another GM, do not consume the override", async () => {
  armTestRoll(18);
  for (const user of [{ id: "other-gm", isGM: true }, { id: "player", isGM: false }]) {
    assert.equal((await fixture(user).run()).roll.total, 12);
    assert.equal(getPendingTestRoll(), 18);
  }
});
test("loss of GM rights prevents forcing and direct API access", async () => {
  armTestRoll(17); globalThis.game.user = { id: "gm", isGM: false };
  assert.equal((await fixture(globalThis.game.user).run()).roll.total, 12);
  for (const call of [() => armTestRoll(3), cancelTestRoll, getPendingTestRoll, () => subscribeTestRoll(() => {})]) {
    assert.throws(call, /requires a GM/);
  }
  globalThis.game.user = gm;
  assert.equal(getPendingTestRoll(), 17);
});
test("pending result is isolated when the current client user changes", () => {
  armTestRoll(3); globalThis.game.user = { id: "second", isGM: true };
  assert.equal(getPendingTestRoll(), null); cancelTestRoll();
  globalThis.game.user = gm; assert.equal(getPendingTestRoll(), 3);
});
test("damage, table rolls, modified formulas and unsupported callers are not forced", async () => {
  armTestRoll(17); const { runtime } = fixture();
  for (const [formula, kind] of [["2d6+1", "prepared-attack"], ["3d6+2", "prepared-skill"],
    ["3d6", "damage"], ["3d6", "hit-location"], ["3d6", "native-gga"]]) {
    assert.equal((await evaluatePreparedCheck(formula, runtime, kind)).testRoll, null);
    assert.equal(getPendingTestRoll(), 17);
  }
  const native = await runtime.Roll.create("3d6").evaluate();
  assert.equal(native.total, 12); assert.equal(getPendingTestRoll(), 17);
});
test("failed reconstruction retains the request and never publishes a false result", async () => {
  armTestRoll(10); const { runtime } = fixture();
  runtime.Roll = { create: TestRoll.create, fromData: () => { throw new Error("bad reconstruction"); } };
  await assert.rejects(evaluatePreparedCheck("3d6", runtime, "prepared-attack"), /bad reconstruction/);
  assert.equal(getPendingTestRoll(), 10);
});
test("invalid reconstructed dice retain the request", async () => {
  armTestRoll(10); const { runtime } = fixture();
  runtime.Roll = { create: TestRoll.create, fromData: () => ({ total: 10, dice: [{ results: [{ result: 10 }] }] }) };
  await assert.rejects(evaluatePreparedCheck("3d6", runtime, "prepared-attack"), /could not reconstruct/);
  assert.equal(getPendingTestRoll(), 10);
});
test("invalid totals cannot replace an existing request", () => {
  armTestRoll(10);
  for (const total of [2, 19, 3.5, NaN, "17", null]) assert.throws(() => armTestRoll(total), RangeError);
  assert.equal(getPendingTestRoll(), 10);
});
test("concurrent prepared checks consume a request only once", async () => {
  armTestRoll(3); const fx = fixture();
  const results = await Promise.all([fx.run(), fx.run()]);
  assert.deepEqual(results.map(r => r.roll.total).sort((a,b) => a-b), [3, 12]);
  assert.equal(fx.messages.filter(m => m.flags).length, 1);
});
test("UI observers receive arm, consumption and manual cancellation", async () => {
  let updates = 0; const stop = subscribeTestRoll(() => updates++);
  armTestRoll(10); await fixture().run(); cancelTestRoll(); stop(); armTestRoll(3);
  assert.equal(updates, 3);
});
test("new module instance starts without a pending result", async () => {
  armTestRoll(18);
  const fresh = await import("../scripts/tools/developer-roll-service.js?new-session");
  assert.equal(fresh.getPendingTestRoll(), null);
  assert.equal(getPendingTestRoll(), 18);
});
test("ApplicationV2 menu, window and saved API references enforce GM rights", async () => {
  globalThis.foundry = { applications: { api: { ApplicationV2: class {
    render() { return this; } async close() {} _onRender() {}
  } } } };
  const { DeveloperModeWindow, developerApi, registerDeveloperModeMenu } = await import("../scripts/tools/developer-mode-app.js");
  let menu;
  globalThis.game.settings = { registerMenu: (_module, _key, data) => { menu = data; } };
  registerDeveloperModeMenu();
  assert.equal(menu.restricted, true);
  assert.equal(menu.type, DeveloperModeWindow);
  const window = new DeveloperModeWindow();
  assert.equal((await window._prepareContext()).totals.length, 16);
  globalThis.game.user = { id: "player", isGM: false };
  assert.throws(() => new DeveloperModeWindow(), /requires a GM/);
  assert.throws(() => window.render(), /requires a GM/);
  await assert.rejects(window._prepareContext(), /requires a GM/);
  for (const call of [developerApi.open, () => developerApi.arm(3), developerApi.cancel, developerApi.getPending]) assert.throws(call, /requires a GM/);
});
test("English and Russian localization keys match and manifest declares both languages", () => {
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const en = read("../lang/en.json"), ru = read("../lang/ru.json");
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort());
  assert.equal(ru["OleGURPS.Developer.TestRoll"], "\u0422\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0431\u0440\u043e\u0441\u043e\u043a");
  assert.deepEqual(read("../module.json").languages.map(l => l.lang), ["en", "ru"]);
});

test("unsupported native terms never consume the pending result", async () => {
  armTestRoll(3); const { runtime } = fixture();
  runtime.Roll = { create: formula => {
    const roll = TestRoll.create(formula); roll.terms[0].modifiers = ["kh2"]; return roll;
  } };
  await assert.rejects(evaluatePreparedCheck("3d6", runtime, "prepared-attack"), /Unsupported prepared/);
  assert.equal(getPendingTestRoll(), 3);
});

test("module API hides the developer facade from players", async () => {
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync(new URL("../scripts/main.js", import.meta.url), "utf8");
  const declaration = source.split(/\r?\n/).find(line => line.startsWith('Object.defineProperty(api, "developer"'));
  assert.ok(declaration);
  const context = { api: {}, developerApi: { open() {} }, game: { user: { isGM: false } } };
  runInNewContext(declaration, context);
  assert.equal(context.api.developer, undefined);
  context.game.user.isGM = true;
  assert.equal(context.api.developer, context.developerApi);
});

test("developer fallback resolves every label without loaded language metadata", async () => {
  const { developerText } = await import("../scripts/tools/developer-localization.js");
  for (const lang of ["en", "ru"]) {
    const values = JSON.parse(readFileSync(new URL("../lang/ru.json", import.meta.url), "utf8"));
    const runtime = { game: { i18n: { lang, localize: key => key } } };
    for (const [key, value] of Object.entries(values)) {
      if (!key.startsWith("OleGURPS.Developer.")) continue;
      assert.equal(developerText(key.split(".").at(-1), runtime), value);
    }
  }
  assert.equal(developerText("Open", { game: { i18n: { lang: "ru", localize: () => "Native translation" } } }), "Native translation");
  const ru = JSON.parse(readFileSync(new URL("../lang/ru.json", import.meta.url), "utf8"));
  assert.equal(developerText("Open", { game: { i18n: { lang: "en", localize: () => "Open developer mode" } } }), ru["OleGURPS.Developer.Open"]);
});
