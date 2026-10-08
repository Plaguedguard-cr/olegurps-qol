import test from "node:test";
import assert from "node:assert/strict";
import { hasTrademarkMovePerk, normalizeTrademarkMove, applyTrademarkMoveBonus, getTrademarkMoveSkillPreview, getTrademarkHitLocationOptions, getTrademarkHitLocationValue } from "../scripts/tools/trademark-move-model.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { BODYPLAN_DEFINITIONS, TargetingService } from "../scripts/tools/targeting-service.js";

test("perk lookup accepts plain and qualified Trademark Move in nested ads", () => {
  assert.equal(hasTrademarkMovePerk({ system: { ads: { a: { name: "Other" } } } }), false);
  assert.equal(hasTrademarkMovePerk({ system: { ads: { a: { name: "Trademark Move" } } } }), true);
  assert.equal(hasTrademarkMovePerk({ system: { ads: { a: { name: "Other", contains: {
    b: { name: "Trademark Move (Tangler Pistol)" }
  } } } } }), true);
});

test("step normalization retains template data and discards situational data", () => {
  const raw = { steps: [{ weaponId: "gun", attackRef: { path: "system.ranged.1", name: "Gun" },
    shots: "2", hitLocationId: "face", bodyplanId: "humanoid", aimSeconds: "1",
    braced: true, targetTokenId: "target", rangePenalty: -4, manualModifier: 3,
    visibility: { mode: "partial" }, height: 2 }] };
  const move = normalizeTrademarkMove(raw);
  assert.equal(move.steps[0].shots, 2);
  assert.equal(move.steps[0].hitLocationId, "face");
  assert.equal(move.steps[0].braced, true);
  for (const key of ["targetTokenId", "rangePenalty", "manualModifier", "visibility", "height"])
    assert.equal(Object.hasOwn(move.steps[0], key), false);
});

test("Trademark Move adds one skill point and one visible FireService modifier", async () => {
  const stack = [];
  const prior = globalThis.GURPS;
  globalThis.GURPS = { ModifierBucket: {
    modifierStack: { modifierList: stack },
    addModifier(value, desc) { stack.push({ modint: value, desc }); },
    clear() { stack.length = 0; }
  } };
  try {
    let seen;
    const service = new FireService({ actor: {}, token: {}, preparedRollExecutor: async options => {
      seen = { options, modifiers: [...stack] };
      return { rolled: true };
    } });
    const prepared = applyTrademarkMoveBonus({ effectiveSkill: 11, rangePenalty: 0,
      hitLocationPenalty: 0, rapidFireBonus: 0, laserBonus: 0, aimBonus: 0,
      sightBonus: 0, bracingBonus: 0, moveAttackPenalty: 0, allOutAttackBonus: 0,
      visibilityPenalty: 0, manualModifier: 0, effectRangePenalty: null });
    await service.executeRangedAttack({ name: "Gun" }, prepared);
    assert.equal(seen.options.effectiveSkill, 12);
    assert.deepEqual(seen.modifiers.filter(entry => entry.desc === "Trademark Move"),
      [{ modint: 1, desc: "Trademark Move" }]);
    assert.equal(stack.length, 0);
  } finally { globalThis.GURPS = prior; }
});
test("concealed ranged roll still lists Trademark Move separately", async () => {
  const { executePreparedGgaRoll } = await import("../scripts/tools/prepared-gga-roll.js");
  let message;
  const runtime = {
    GURPS: {
      ModifierBucket: { modifierStack: {}, applyMods: async () => [{ modint: 1, desc: "Trademark Move" }] },
      setLastTargetedRoll() {}
    },
    game: { user: { id: "user" }, settings: { get: () => null } },
    canvas: { tokens: { placeables: [] } },
    ChatMessage: {
      getSpeaker: () => ({ actor: "actor", token: null }),
      create: async data => { message = data; return data; }
    },
    Roll: { create: () => ({ total: 10, dice: [{ results: [{ result: 3 }, { result: 3 }, { result: 4 }] }],
      evaluate: async function() { return this; } }) },
    renderTemplate: async () => "<p>GGA</p>",
    CONFIG: { sounds: { dice: "dice" } }
  };
  const actor = { id: "actor", canRoll: async () => ({ canRoll: true, hasActions: true }) };
  const result = await executePreparedGgaRoll({ actor, token: null,
    attack: { name: "Gun", level: 11 }, effectiveSkill: 12, physicalShots: 1,
    effectiveRoF: 1, rcl: 1, consumeAction: false, concealTargetDetails: true,
    visibilityPenalty: 0, visibilityCapAdjustment: 0, trademarkMoveBonus: 1, runtime });
  assert.equal(result.rolled, true);
  assert.equal(result.rollData.finaltarget, 12);
  assert.match(message.content, /Trademark Move \(\+1\)/);
});
test("Humanoid Hit Location menu shows generic limbs once and keeps other saved regions", () => {
  const definition = BODYPLAN_DEFINITIONS.humanoid;
  const service = new TargetingService({
    definition, table: definition.randomTable, tableSource: "fallback",
    attack: { data: { damage: "1d pi" } }
  });
  const choices = getTrademarkHitLocationOptions(service);
  const labels = choices.map(choice => choice.label);
  assert.equal(new Set(labels).size, labels.length);
  for (const zone of service.zones.filter(entry => entry.available))
    assert.ok(choices.some(choice => choice.zoneId === zone.id));
  for (const zoneId of ["face", "skull", "eye", "neck", "vitals", "groin"]) {
    assert.equal(choices.filter(choice => choice.zoneId === zoneId &&
      choice.label === service.getSelection(zoneId)?.label).length, 1);
  }
  for (const zoneId of ["foot", "hand", "arm", "leg"]) {
    assert.equal(choices.filter(choice => choice.zoneId === zoneId).length, 1);
    assert.equal(choices.find(choice => choice.zoneId === zoneId)?.regionId, null);
    for (const side of ["left", "right"]) {
      const savedSide = { hitLocationId: zoneId, hitRegionId: side + "-" + zoneId };
      assert.equal(getTrademarkHitLocationValue(choices, savedSide), zoneId + "::");
    }
  }
  assert.equal(choices.find(choice => choice.zoneId === "face")?.regionId, null);
  const saved = getTrademarkHitLocationOptions(service, {
    hitLocationId: "face", hitRegionId: "face"
  });
  assert.equal(saved.filter(choice => choice.zoneId === "face").length, 1);
  assert.equal(saved.find(choice => choice.zoneId === "face")?.regionId, "face");
  assert.equal(getTrademarkHitLocationValue(saved, { hitLocationId: "face", hitRegionId: "face" }), "face::face");
});
test("Trademark Move displays the full manual or target range", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { TrademarkMoveExecutionApp } = await import("../scripts/tools/trademark-move-execution-app.js");
    const app = Object.create(TrademarkMoveExecutionApp.prototype);
    app.slots = [{ label: "Pistol", summary: "Face | RoF 2", completed: false }];
    app.calculatePreviews = async () => [{ effectiveSkill: 13, successChance: "83,8" }];
    app.rangeBands = [{ index: 1, label: "for range/speed 7 yds", penalty: -3 }];
    app.situation = { visibilityMode: "normal", partialPenalty: -1, manualModifier: 0,
      rangeIndex: 1, height: 0, elevationDirection: "level" };
    let target = { distance: 6.5, rangeIndex: 1 };
    app.readTargetRangeContext = () => target;
    const html = await app._renderHTML();
    assert.match(html, /data-tm-range-selection[^>]*>[^<]*for range\/speed 7 yds/);
    assert.match(html, /Face \| RoF 2 \| <span data-tm-effective="0">\u042d\u0444\u0444\. 13 \(83,8%\)/);
    assert.match(app._formatRangeSelection(""), /6,5[^<]*for range\/speed 7 yds/);
    target = null;
    assert.match(app._formatRangeSelection(""), /\u0410\u0432\u0442\u043e/);
  } finally {
    globalThis.foundry = previous;
  }
});

test("Trademark Move preview shares Fire Control skill breakdown and the roll bonus", () => {
  const previous = { game: globalThis.game, GURPS: globalThis.GURPS };
  const actor = { system: { skills: {
    0: { name: "Guns (Pistol)", level: 16 },
    1: { name: "Targeted Attack (Guns (Pistol)/Face)", type: "technique", level: 14,
      prerequisite: "Guns (Pistol)", targetLocation: "Face" },
    2: { name: "Quick-Shot (Pistol)", type: "technique", level: 13 }
  } } };
  const token = { actor };
  const attack = { name: "Pistol", level: 16, rof: "1", acc: "0", data: { bulk: "-2" } };
  const bands = [{ index: 0, max: 7, penalty: -3, label: "7 yds" }];
  const targetingService = { getSelection: () => ({ zoneId: "face", label: "Face",
    canonicalKeys: ["face"], penalty: -5 }) };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const targetedAttackContext = createTargetedAttackContext({ actor, attack });
    const calculateSkillDetails = fire.calculateEffectiveFireSkillDetails;
    const values = { configuredPreview: true, hitLocationId: "face", governingSpecialty: "pistol",
      shots: 1, aimSeconds: 0, braced: false, laserSight: false,
      moveAndAttack: false, allOutAttack: false, rangedRapidStrike: false };
    const preview = () => getTrademarkMoveSkillPreview({ attack, values, rangeBands: bands,
      targetingService, targetedAttackContext, calculateSkillDetails });
    const face = preview();
    assert.equal(face.baseSkill, 16);
    assert.equal(face.modifiers.find(entry => entry.label.includes("Targeted Attack"))?.value, -2);
    assert.equal(face.totalModifiers, -1);
    assert.equal(face.effectiveSkill, 15);
    values.rangedRapidStrike = true;
    const quick = preview();
    assert.equal(quick.modifiers.filter(entry => entry.label === "Ranged Rapid Strike").length, 0);
    assert.equal(quick.modifiers.find(entry => entry.label.includes("Quick-Shot"))?.value, -3);
    assert.equal(quick.totalModifiers, -4);
    assert.equal(quick.effectiveSkill, 12);
    const situation = { ...values, configuredPreview: false, rangeIndex: 0,
      manualRangeSelected: true, height: 0, elevationDirection: "level",
      visibility: { mode: "partial", partialPenalty: -1 }, manualModifier: -2 };
    const live = getTrademarkMoveSkillPreview({ attack, values: situation, rangeBands: bands,
      targetingService, targetedAttackContext, calculateSkillDetails });
    const rollDetails = calculateSkillDetails(attack, situation, bands, targetingService, targetedAttackContext);
    assert.equal(live.baseSkill + live.totalModifiers, live.effectiveSkill);
    assert.equal(live.effectiveSkill,
      applyTrademarkMoveBonus({ effectiveSkill: rollDetails.effectiveSkill }).effectiveSkill);
    assert.equal(live.effectiveSkill, 6);
  } finally {
    globalThis.game = previous.game;
    globalThis.GURPS = previous.GURPS;
  }
});

test("Trademark Move execution refreshes each card for situation and target changes", async () => {
  const previous = { foundry: globalThis.foundry, game: globalThis.game };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  globalThis.game = { user: {} };
  try {
    const { TrademarkMoveExecutionApp } = await import("../scripts/tools/trademark-move-execution-app.js");
    const app = Object.create(TrademarkMoveExecutionApp.prototype);
    app.slots = [{}, {}];
    app.rangeBands = [{ index: 1, label: "7 yds", penalty: -3 }];
    app._previewGeneration = 0;
    app.situation = { visibilityMode: "normal", partialPenalty: -1, manualModifier: 0,
      rangeIndex: null, height: 0, elevationDirection: "level" };
    let target = null;
    app.readTargetRangeContext = () => target;
    const fields = {
      tmVisibility: { value: "normal" }, tmRangeIndex: { value: "" },
      tmPartialPenalty: { value: "-1" }, tmManualModifier: { value: "0" },
      tmHeight: { value: "0" }, tmHighGround: { checked: false }, tmLowGround: { checked: false }
    };
    const displays = [{ textContent: "" }, { textContent: "" }];
    const partial = { hidden: true };
    const rangeSummary = { textContent: "" };
    app.element = { querySelector(selector) {
      const name = selector.match(/^\[name="([^"]+)"\]$/)?.[1];
      if (name) return fields[name] ?? null;
      if (selector === "[data-tm-partial-penalty]") return partial;
      if (selector === "[data-tm-range-selection]") return rangeSummary;
      const index = selector.match(/^\[data-tm-effective="(\d+)"\]$/)?.[1];
      return index === undefined ? null : displays[Number(index)];
    } };
    let latest;
    app.calculatePreviews = async situation => {
      latest = situation;
      const adjustment = situation.manualModifier + (situation.rangeIndex === 1 ? -3 : 0) +
        (situation.visibilityMode === "partial" ? situation.partialPenalty : 0) -
        (situation.elevationDirection === "high" ? situation.height : 0) -
        (target ? target.distance : 0);
      return [13, 15].map(base => ({ effectiveSkill: base + adjustment, successChance: "50,0" }));
    };
    const flush = () => new Promise(resolve => setImmediate(resolve));
    const change = (name, value, input = false) => {
      if ("checked" in fields[name]) fields[name].checked = value;
      else fields[name].value = value;
      app[input ? "_onInput" : "_onChange"]({ target: { name, value, checked: value } });
      return flush();
    };
    await change("tmRangeIndex", "1");
    assert.equal(latest.rangeIndex, 1);
    assert.match(displays[0].textContent, /10 \(50,0%\)/);
    assert.match(displays[1].textContent, /12 \(50,0%\)/);
    await change("tmVisibility", "partial");
    assert.equal(partial.hidden, false);
    assert.equal(latest.visibilityMode, "partial");
    await change("tmHeight", "2", true);
    await change("tmHighGround", true);
    assert.equal(latest.height, 2);
    assert.equal(latest.elevationDirection, "high");
    await change("tmManualModifier", "-2", true);
    assert.equal(latest.manualModifier, -2);
    target = { distance: 1, height: 3, elevationDirection: "low", rangeIndex: 1 };
    app._onTargetChange(globalThis.game.user);
    await flush();
    assert.equal(latest.height, 3);
    assert.equal(latest.elevationDirection, "low");
    assert.equal(displays[1].textContent, app._formatSkillPreview({
      effectiveSkill: 15 - 3 - 1 - 2 - 1, successChance: "50,0" }));
  } finally {
    globalThis.foundry = previous.foundry;
    globalThis.game = previous.game;
  }
});

test("Trademark Move editor puts skill preview beside Aim and refreshes it", async () => {
  const previous = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { TrademarkMoveEditorApp } = await import("../scripts/tools/trademark-move-editor-app.js");
    const app = Object.create(TrademarkMoveEditorApp.prototype);
    app._previewGenerations = new Map();
    app.actor = { system: { skills: {} } };
    app.weapons = [{ weapon: { id: "gun" }, attack: { label: "Pistol", level: 16 },
      attackRef: {}, profile: { type: "semi-auto", display: "1" } }];
    app.steps = [normalizeTrademarkMove({ steps: [{ weaponId: "gun", shots: 1,
      hitLocationId: "silhouette", aimSeconds: 0 }] }).steps[0]];
    app._service = async () => ({ zones: [{ id: "silhouette", available: true }], regions: [],
      getSelection: () => ({ zoneId: "silhouette", regionId: null, label: "Silhouette" }) });
    app.calculatePreview = (_current, step) => ({ baseSkill: 16, totalModifiers: step.aimSeconds,
      effectiveSkill: 16 + step.aimSeconds, successChance: "98,1" });
    const html = await app._renderHTML();
    assert.match(html, /tm-aim-preview-row/);
    assert.match(html, /Aim[^<]*<input[^>]*><\/label><span data-tm-skill-preview>/);
    assert.match(html, /\u0411\u0430\u0437\u0430: 16 \| \u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: \+0/);
    const display = { textContent: "" };
    app.element = { querySelector: () => display };
    app._capture = () => { app.steps[0].aimSeconds = 2; };
    await app._onInput({ target: { name: "aimSeconds", closest: () => ({ dataset: { tmStep: "0" } }) } });
    assert.match(display.textContent, /\u042d\u0444\u0444\.: 18 \(98,1%\)/);
  } finally {
    globalThis.foundry = previous;
  }
});
