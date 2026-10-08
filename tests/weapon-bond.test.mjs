import test from "node:test";
import assert from "node:assert/strict";
import { hasWeaponBondPerk, isWeaponBondActive, weaponBondCheckbox } from "../scripts/tools/weapon-bond-service.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { getMeleeAttackSettings, normalizeMeleeAssistantState,
  setMeleeWeaponBond } from "../scripts/tools/melee-assistant-state.js";
import { resolveMeleeCombatCalculation } from "../scripts/tools/melee-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { listRangedGoverningSkills, bindingForGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { getTrademarkMoveSkillPreview } from "../scripts/tools/trademark-move-model.js";

const bondActor = () => ({ system: { attributes: { PER: { value: 10 } }, ads: { group: { name: "Other", contains: {
  perk: { name: "Weapon Bond (AK-47)" }
} } }, skills: {
  rifle: { name: "Guns/TL9 (Rifle)", uuid: "rifle", level: 13 },
  quick: { name: "Quick-Shot (Rifle)", type: "TECHNIQUE", level: 13 },
  cqb: { name: "Close-Quarters Battle (Rifle)", type: "TECHNIQUE", level: 17 },
  hip: { name: "Close-Hip Shooting (Rifle)", type: "TECHNIQUE", level: 16 },
  face: { name: "Targeted Attack (Guns (Rifle)/Face)", type: "TECHNIQUE",
    level: 11, prerequisite: "Guns/TL9 (Rifle)", targetLocation: "Face" }
} } });

function rangedFixture() {
  const actor = bondActor();
  const governing = listRangedGoverningSkills(actor).find(skill => skill.specialty === "rifle");
  const attack = { name: "AK", level: 13, weaponBond: true, rof: "4", acc: "0",
    data: { bulk: -5 }, governingSkillBinding: bindingForGoverningSkill(governing) };
  const token = { actor };
  const service = new FireService({ actor, token });
  const fire = createFireControlContext({ token, fireService: service });
  const ta = createTargetedAttackContext({ actor, attack });
  const bands = [{ index: 0, max: 5, penalty: 0, label: "5 yds" }];
  const targeting = { getSelection: id => id === "face"
    ? { zoneId: "face", canonicalKeys: ["face"], label: "Face", penalty: -5 }
    : { zoneId: "torso", canonicalKeys: ["torso"], label: "Torso", penalty: 0 } };
  const values = { rangeIndex: 0, manualRangeSelected: true, shots: 1,
    moveAndAttack: true, closeHipShooting: true, rangedRapidStrike: true,
    hitLocationId: "face", visibility: { mode: "normal" } };
  const details = (selectedAttack = attack, selectedValues = values) =>
    fire.calculateEffectiveFireSkillDetails(selectedAttack, selectedValues, bands, targeting, ta);
  return { actor, attack, service, fire, ta, bands, targeting, values, details };
}

function withRangedRuntime(callback) {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try { return callback(); }
  finally { globalThis.game = prior.game; globalThis.GURPS = prior.GURPS; }
}

test("Weapon Bond perk lookup unlocks a visible checkbox but does not select a weapon by name", () => {
  const absent = { system: { ads: { one: { name: "Weapon Bonded" } } } };
  const present = bondActor();
  assert.equal(hasWeaponBondPerk(absent), false);
  assert.equal(hasWeaponBondPerk({ system: { ads: { one: { name: "Weapon Bond" } } } }), true);
  assert.equal(hasWeaponBondPerk(present), true);
  assert.equal(isWeaponBondActive(absent, true), false);
  assert.equal(isWeaponBondActive(present, false), false);
  assert.match(weaponBondCheckbox({ available: false, checked: true }), /disabled/);
  assert.match(weaponBondCheckbox({ available: false }), /fa-lock/);
  assert.doesNotMatch(weaponBondCheckbox({ available: false, checked: true }), / checked/);
  assert.match(weaponBondCheckbox({ available: true, checked: true }), / checked/);
  assert.doesNotMatch(weaponBondCheckbox({ available: true }), /disabled|fa-lock/);
});

test("ranged weapon setting persists per configured weapon id without touching attack level", async () => {
  const prior = globalThis.foundry;
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  const attackRef = { uuid: "ak-entry", path: "system.ranged.00001", name: "AK", mode: "" };
  let stored = null;
  const actor = { system: { skills: {} }, getFlag: () => stored,
    setFlag: async (_scope, _key, value) => { stored = structuredClone(value); } };
  try {
    const service = new AmmoService(actor);
    const state = service.defaultState();
    state.weapons = [
      { id: "bonded", name: "AK", attackRef, weaponBond: true,
        ammoType: "7.62", capacity: 30, magazines: [30], totalAmmo: 30, loadedIndex: 0 },
      { id: "control", name: "Control", attackRef: { uuid: "other-entry" }, weaponBond: false,
        ammoType: "7.62", capacity: 30, magazines: [30], totalAmmo: 30, loadedIndex: 0 }
    ];
    await service.saveState(state);
    const restored = await new AmmoService(actor).loadState();
    assert.deepEqual(restored.weapons.map(weapon => [weapon.id, weapon.weaponBond]),
      [["bonded", true], ["control", false]]);
    assert.equal(stored.weapons[0].attackRef.uuid, "ak-entry");
    assert.equal(stored.weapons[0].level, undefined);
  } finally { globalThis.foundry = prior; }
});

test("Weapon Bond adds one independent modifier to Quick-Shot, TA, CQB and Close-Hip", () => withRangedRuntime(() => {
  const f = rangedFixture();
  const result = f.details();
  const channels = Object.fromEntries(result.combatCalculation.channels.map(x => [x.id, x.resolvedValue]));
  assert.deepEqual([result.baseSkill, result.governingSkill.level, channels.weaponBond,
    channels.rangedRapidStrike, channels.hitLocation, channels.moveAndAttack,
    channels.closeCombatBulk, result.effectiveSkill], [13, 13, 1, 0, -2, -1, -2, 9]);
  assert.deepEqual(result.combatCalculation.rollModifiers.filter(x => x.channel === "weaponBond"),
    [{ channel: "weaponBond", value: 1, label: "Weapon Bond", source: "weapon-bond" }]);
  assert.deepEqual(result.combatCalculation.activeRules.find(x => x.id === "weaponBond"),
    { id: "weaponBond", kind: "perk", activation: "weapon-setting" });
  assert.equal(f.attack.level, 13);
  const unbonded = f.details({ ...f.attack, weaponBond: false });
  assert.equal(unbonded.effectiveSkill, 8);
  assert.equal(unbonded.combatCalculation.channels.find(x => x.id === "weaponBond").resolvedValue, 0);
  const noPerk = f.details({ ...f.attack, weaponBond: true });
  delete f.actor.system.ads;
  assert.equal(f.details().effectiveSkill, 8);
  assert.equal(noPerk.effectiveSkill, 9);
}));

test("each RRS attack gets one bond modifier and Trademark Move uses the shared preview", () => withRangedRuntime(() => {
  const f = rangedFixture();
  const first = f.details(f.attack, { ...f.values, contextLabel: "Attack 1" });
  const second = f.details(f.attack, { ...f.values, contextLabel: "Attack 2" });
  for (const result of [first, second]) {
    assert.equal(result.effectiveSkill, 9);
    assert.equal(result.combatCalculation.rollModifiers.filter(x => x.channel === "weaponBond").length, 1);
  }
  const values = { rangeIndex: 0, manualRangeSelected: true, hitLocationId: "torso",
    shots: 1, visibility: { mode: "normal" }, configuredPreview: true };
  const preview = getTrademarkMoveSkillPreview({ attack: f.attack, values,
    rangeBands: f.bands, targetingService: f.targeting, targetedAttackContext: f.ta,
    calculateSkillDetails: f.fire.calculateEffectiveFireSkillDetails });
  assert.equal(preview.baseSkill, 13);
  assert.equal(preview.effectiveSkill, 15);
  assert.equal(preview.modifiers.find(x => x.label === "Weapon Bond")?.value, 1);
  assert.equal(preview.modifiers.find(x => x.label === "Trademark Move")?.value, 1);
  assert.equal(preview.probability > 0, true);
}));

test("ranged actual GGA modifier stack uses the preview calculation exactly once", async () => {
  const f = withRangedRuntime(rangedFixture);
  const calculation = withRangedRuntime(() => f.details().combatCalculation);
  const prior = globalThis.GURPS;
  const stack = [];
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: stack },
    addModifier(value, desc) { stack.push({ modint: value, desc }); },
    clear() { stack.length = 0; } } };
  try {
    let captured;
    const service = new FireService({ actor: f.actor, token: { actor: f.actor },
      preparedRollExecutor: async options => {
        captured = { options, modifiers: [...stack] }; return { rolled: true };
      } });
    await service.executeRangedAttack(f.attack, { baseSkill: 13,
      baseSkillName: "Ranged Weapon Level", effectiveSkill: calculation.effectiveSkill,
      combatCalculation: calculation, trademarkMoveBonus: 0 });
    assert.equal(captured.options.effectiveSkill, 9);
    assert.deepEqual(captured.modifiers.filter(x => x.desc === "Weapon Bond"),
      [{ modint: 1, desc: "Weapon Bond" }]);
    assert.equal(stack.length, 0);
    await service.executeRangedAttack(f.attack, { baseSkill: 13,
      baseSkillName: "Ranged Weapon Level", effectiveSkill: calculation.effectiveSkill + 1,
      combatCalculation: calculation, trademarkMoveBonus: 1 });
    assert.equal(captured.options.effectiveSkill, 10);
    assert.deepEqual(captured.modifiers.filter(x => ["Weapon Bond", "Trademark Move"].includes(x.desc)),
      [{ modint: 1, desc: "Weapon Bond" }, { modint: 1, desc: "Trademark Move" }]);
    assert.equal(stack.length, 0);
  } finally { globalThis.GURPS = prior; }
});

test("melee per-entry binding persists and uses the same perk channel", () => {
  const actor = bondActor();
  const axe = { uuid: "axe-entry", path: "system.melee.00001", level: 13 };
  const sword = { uuid: "sword-entry", path: "system.melee.00002", level: 13 };
  const state = normalizeMeleeAssistantState({});
  setMeleeWeaponBond(state, axe, true);
  const restored = normalizeMeleeAssistantState(structuredClone(state));
  assert.equal(getMeleeAttackSettings(restored, axe).weaponBond, true);
  assert.equal(getMeleeAttackSettings(restored, sword).weaponBond, undefined);
  const bonded = resolveMeleeCombatCalculation({ actor, attack: axe, baseSkill: 13,
    weaponBond: getMeleeAttackSettings(restored, axe).weaponBond, rapidStrikePenalty: -6 });
  const control = resolveMeleeCombatCalculation({ actor, attack: sword, baseSkill: 13,
    weaponBond: getMeleeAttackSettings(restored, sword).weaponBond, rapidStrikePenalty: -6 });
  assert.deepEqual([bonded.baseSkill, bonded.effectiveSkill, control.effectiveSkill], [13, 8, 7]);
  assert.equal(bonded.rollModifiers.find(x => x.channel === "weaponBond")?.value, 1);
});


test("checking melee Weapon Bond alone does not create a skill-level override", async () => {
  const prior = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {},
    DialogV2: { wait: async () => ({ action: "save", values: {
      skillLevel: "13", damage: "1d cut", reach: "1", parry: "0", weaponBond: "on"
    } }) } } } };
  try {
    const { MeleeAssistantApp } = await import("../scripts/tools/melee-assistant-app.js");
    const app = Object.create(MeleeAssistantApp.prototype);
    app.actor = bondActor();
    app.sourceAttack = { uuid: "axe-entry", path: "system.melee.00001", name: "Axe" };
    app.attack = { ...app.sourceAttack, label: "Axe", level: 13,
      damage: "1d cut", reach: "1", parry: "0" };
    app.selectedAttackKey = "uuid:axe-entry";
    app._meleeState = normalizeMeleeAssistantState({});
    app._persistState = async () => {};
    app._selectAttack = async () => {};
    await app._editAttack();
    const saved = getMeleeAttackSettings(app._meleeState, app.sourceAttack);
    assert.equal(saved.weaponBond, true);
    assert.equal(saved.override, undefined);
    assert.equal(app.attack.level, 13);
  } finally { globalThis.foundry = prior; }
});


test("personal fire report keeps Weapon Bond inside collapsed skill details", async () => {
  const prior = globalThis.foundry;
  globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
  try {
    const { buildFireSkillBreakdownHtml } = await import("../scripts/tools/ammo.js");
    const html = buildFireSkillBreakdownHtml({ baseSkillName: "Ranged Weapon Level",
      baseSkill: 13, combatCalculation: { modifiers: [
        { channel: "weaponBond", label: "Weapon Bond", value: 1 }
      ] } }, value => String(value));
    assert.match(html, /<details[^>]*>.*Ranged Weapon Level: <strong>13<\/strong>/);
    assert.match(html, /Weapon Bond: <strong>\+1<\/strong>/);
    assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  } finally { globalThis.foundry = prior; }
});
