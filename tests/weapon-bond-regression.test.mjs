import test from "node:test";
import assert from "node:assert/strict";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { executePreparedGgaRoll } from "../scripts/tools/prepared-gga-roll.js";
import { bindingForGoverningSkill, listRangedGoverningSkills } from "../scripts/tools/ranged-governing-skill-service.js";

globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");

function fixture({ perk = true, attackLevel = 13 } = {}) {
  const saved = { weapons: [{ id: "ak", weaponBond: false }, { id: "control", weaponBond: false }] };
  const actor = { id: "actor", getFlag(scope, key) {
    assert.equal(scope, "world"); assert.equal(key, "gurpsAmmoManager"); return saved;
  }, system: { skills: { rifle: { name: "Guns/TL9 (Rifle)", uuid: "rifle", import: 13, level: 13 } },
    ads: perk ? { bond: { name: "Weapon Bond" } } : {} } };
  const token = { id: "token", actor };
  const attack = { name: "Izhmash AK-47", level: attackLevel, rof: "10", acc: 4,
    governingSkillBinding: bindingForGoverningSkill(listRangedGoverningSkills(actor)[0]),
    weaponBond: false, data: { bulk: "-5" } };
  const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
  const bands = [{ index: 0, max: 5, penalty: 0, label: "5 yds" }];
  const targeting = { getSelection: () => ({ zoneId: "torso", canonicalKeys: ["torso"], label: "Torso", penalty: 0 }) };
  const app = () => {
    const current = Object.create(FirePreparationApp.prototype);
    current.mode = "weapon"; current.actor = actor; current.token = token;
    current.weapon = { ...saved.weapons[0] }; // The window holds its own snapshot.
    current.attack = structuredClone(attack); current.visibility = null;
    current.fireState = { shots: "1", manualModifier: "", aimSeconds: "", height: "",
      elevationDirection: "level", rangedRapidStrike: false, closeHipShooting: false,
      selectedRangeIndex: 0, manualRangeSelected: true, bodyplanId: "humanoid",
      hitLocation: { zoneId: "torso", regionId: null } };
    current.calculateEffectiveSkill = values => fire.calculateEffectiveFireSkillDetails(
      current.attack, values, bands, targeting).effectiveSkill;
    return current;
  };
  return { saved, actor, attack, fire, bands, targeting, app };
}

test("live weapon configuration overrides the stale Fire Control attack snapshot", () => {
  const f = fixture(), app = f.app();
  f.saved.weapons[0].weaponBond = true;
  assert.equal(app._getSkillPreview().level, "14");
  assert.equal(app._getModifierTotalText(), "+1");
  f.saved.weapons[0].weaponBond = false;
  assert.equal(app._getSkillPreview().level, "13");
  assert.equal(app._getModifierTotalText(), "0");
  assert.equal(app.attack.level, 13);
});

test("switching both ways never accumulates or subtracts Weapon Bond", () => {
  const f = fixture(), app = f.app();
  const source = structuredClone(f.actor.system);
  for (const enabled of [true, false, true, true, false, false, true, false]) {
    f.saved.weapons[0].weaponBond = enabled;
    assert.equal(Number(app._getSkillPreview().level), 13 + Number(enabled));
    assert.equal(app._getModifierTotalText(), enabled ? "+1" : "0");
  }
  assert.deepEqual(f.actor.system, source);
});

test("fresh and reused Fire Control windows agree after reopening and switching weapons", () => {
  const f = fixture(), existing = f.app();
  f.saved.weapons[0].weaponBond = true;
  for (const window of [existing, f.app()]) assert.equal(window._getSkillPreview().level, "14");
  existing.weapon = { ...f.saved.weapons[1] };
  existing.attack = { ...f.attack, name: "Control rifle", weaponBond: true };
  assert.equal(existing._getSkillPreview().level, "13");
  existing.weapon = { ...f.saved.weapons[0] };
  assert.equal(existing._getSkillPreview().level, "14");
  f.saved.weapons[0].weaponBond = false;
  for (const window of [existing, f.app()]) assert.equal(window._getSkillPreview().level, "13");
});

test("a weapon without Weapon Bond and an actor without the perk get no bonus", () => {
  const f = fixture(), app = f.app();
  app.attack.weaponBond = true;
  assert.equal(app._getSkillPreview().level, "13");
  const absent = fixture({ perk: false }), noPerk = absent.app();
  absent.saved.weapons[0].weaponBond = true;
  assert.equal(noPerk._getSkillPreview().level, "13");
  assert.equal(noPerk._getModifierTotalText(), "0");
});

test("other modifiers survive Weapon Bond toggles unchanged", () => {
  const f = fixture(), app = f.app();
  app.fireState.manualModifier = "-2";
  app.fireState.aimSeconds = "1";
  for (const enabled of [false, true, false]) {
    f.saved.weapons[0].weaponBond = enabled;
    const options = app.getShotOptions();
    const details = f.fire.calculateEffectiveFireSkillDetails(app.attack, options, f.bands, f.targeting);
    assert.equal(details.baseSkill, 13);
    assert.equal(details.governingSkill.level, 13);
    assert.equal(details.effectiveSkill, 15 + Number(enabled));
    assert.equal(details.modifiers.find(m => m.channel === "aim").value, 4);
    assert.equal(details.modifiers.find(m => m.channel === "situational").value, -2);
  }
});

test("a real visibility penalty of -1 stays -1 with or without Weapon Bond", () => {
  const f = fixture(), app = f.app();
  app.visibility = { mode: "partial", partialPenalty: -1 };
  for (const enabled of [false, true, false]) {
    f.saved.weapons[0].weaponBond = enabled;
    assert.equal(Number(app._getSkillPreview().level), 12 + Number(enabled));
    assert.equal(app.visibility.partialPenalty, -1);
  }
});

test("unrelated GGA attack bonuses are not guessed to be embedded Weapon Bond", () => {
  const f = fixture({ attackLevel: 14 }), app = f.app();
  f.saved.weapons[0].weaponBond = false;
  assert.equal(app._getSkillPreview().level, "14");
  f.saved.weapons[0].weaponBond = true;
  assert.equal(app._getSkillPreview().level, "15");
  assert.equal(app._getGoverningSkill().level, 13);
  assert.equal(app.attack.level, 14);
});

test("standalone checks do not read weapon configuration or add Weapon Bond", () => {
  const f = fixture(), app = f.app();
  app.mode = "standalone"; app.weapon = null;
  app.actor.getFlag = () => { throw new Error("Unexpected configuration read"); };
  app.attack.weaponBond = false;
  assert.doesNotThrow(() => app.getShotOptions());
});

test("prepared GGA roll agrees with the current preview, modifiers and governing skill", async () => {
  const f = fixture(), app = f.app();
  const messages = [];
  const runtime = {
    GURPS: { ModifierBucket: { modifierStack: {}, applyMods: async () => [] }, setLastTargetedRoll() {} },
    game: { user: { id: "user" }, settings: { get: () => null } }, canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({}), create: async data => { messages.push(data); return data; } },
    Roll: { create: () => ({ total: 10, dice: [{ results: [3, 3, 4].map(result => ({ result })) }],
      async evaluate() { return this; } }) },
    renderTemplate: async () => "<p>GGA</p>"
  };
  for (const enabled of [false, true, false]) {
    f.saved.weapons[0].weaponBond = enabled;
    const details = f.fire.calculateEffectiveFireSkillDetails(app.attack, app.getShotOptions(), f.bands, f.targeting);
    const result = await executePreparedGgaRoll({ actor: f.actor, attack: app.attack,
      baseSkill: details.baseSkill, effectiveSkill: details.effectiveSkill, combatCalculation: details.combatCalculation,
      physicalShots: 1, effectiveRoF: 1, rcl: 2, consumeAction: false, runtime });
    assert.equal(result.rollData.origtarget, 13);
    assert.equal(result.rollData.finaltarget, 13 + Number(enabled));
    assert.equal(result.rollData.modifier, Number(enabled));
    assert.equal(result.rollData.finaltarget, Number(app._getSkillPreview().level));
    assert.equal(details.governingSkill.level, 13);
    assert.equal(result.rollData.failure, false);
  }
  assert.equal(messages.length, 3);
});

test("prepared FireService toggles restore the existing GGA bucket without accumulation", async () => {
  const f = fixture(), app = f.app(), previous = globalThis.GURPS;
  const stack = [{ modint: -2, desc: "Existing modifier", tagged: false }];
  const bucket = {
    modifierStack: { modifierList: stack },
    addModifier(modint, desc, _unused, tagged = false) { stack.push({ modint, desc, tagged }); },
    clear() { stack.length = 0; }, applyMods: async () => [...stack]
  };
  const runtime = {
    GURPS: { ModifierBucket: bucket, setLastTargetedRoll() {} },
    game: { user: { id: "user" }, settings: { get: () => null } }, canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({}), create: async data => data },
    Roll: { create: () => ({ total: 10, dice: [{ results: [3, 3, 4].map(result => ({ result })) }],
      async evaluate() { return this; } }) }, renderTemplate: async () => "<p>GGA</p>"
  };
  globalThis.GURPS = runtime.GURPS;
  try {
    const service = new FireService({ actor: f.actor, token: { actor: f.actor },
      preparedRollExecutor: options => executePreparedGgaRoll({ ...options, runtime }) });
    for (const enabled of [false, true, false, true]) {
      f.saved.weapons[0].weaponBond = enabled;
      const options = app.getShotOptions();
      const details = f.fire.calculateEffectiveFireSkillDetails(app.attack, options, f.bands, f.targeting);
      assert.equal(details.effectiveSkill, 11 + Number(enabled));
      const result = await service.executeRangedAttack(app.attack, {
        baseSkill: details.baseSkill, effectiveSkill: details.effectiveSkill,
        combatCalculation: details.combatCalculation, physicalShots: 1, effectiveRoF: 1,
        rcl: 2, consumeAction: false
      });
      assert.equal(result.rollData.finaltarget, 11 + Number(enabled));
      assert.equal(result.rollData.modifier, -2 + Number(enabled));
      assert.deepEqual(stack, [{ modint: -2, desc: "Existing modifier", tagged: false }]);
    }
  } finally { globalThis.GURPS = previous; }
});
