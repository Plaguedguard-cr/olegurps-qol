import test from "node:test";
import assert from "node:assert/strict";
import { listRangedGoverningSkills, resolveRangedGoverningSkill,
  bindingForGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { getTrademarkMoveSkillPreview } from "../scripts/tools/trademark-move-model.js";

const actorWith = () => ({ system: { attributes: { PER: { value: 10 } }, skills: {
  rifle: { name: "Guns/TL9 (Rifle)", uuid: "rifle-id", level: 13 },
  pistol: { name: "Guns/TL9 (Pistol)", uuid: "pistol-id", level: 14 },
  bow: { name: "Bow", uuid: "bow-id", level: 11 },
  other: { name: "First Aid", level: 15 },
  cqb: { name: "Close-Quarters Battle (Rifle)", level: 17, relativelevel: 4 },
  quick: { name: "Quick-Shot (Rifle)", level: 11 },
  ta: { name: "Targeted Attack (Guns (Rifle)/Face)", level: 11,
    prerequisite: "Guns (Rifle)", targetLocation: "Face" }
} } });
const attack = binding => ({ name: "MAC", level: 8, rof: "4", acc: "0",
  data: { bulk: -7 }, governingSkillBinding: binding });
const values = () => ({ rangeIndex: 0, manualRangeSelected: false, shots: 4,
  targetDistanceOverride: 8, moveAndAttack: false, rangedRapidStrike: false,
  hitLocationId: "torso", visibility: { mode: "normal" } });
const bands = [{ index: 0, max: 20, penalty: 0, label: "20 yds" }];
const targeting = { getSelection: id => ({ zoneId: id, label: id,
  canonicalKeys: [id], penalty: id === "face" ? -5 : 0 }) };

test("ranged selector lists real combat skills and resolves stable identity", () => {
  const actor = actorWith();
  const skills = listRangedGoverningSkills(actor);
  assert.deepEqual(skills.map(skill => skill.name),
    ["Guns/TL9 (Rifle)", "Guns/TL9 (Pistol)", "Bow"]);
  const binding = bindingForGoverningSkill(skills[0]);
  assert.deepEqual(binding, { key: "id:rifle-id", name: "Guns/TL9 (Rifle)" });
  assert.equal(resolveRangedGoverningSkill({ actor, binding }).level, 13);
  actor.system.skills.rifle.level = 14;
  assert.equal(resolveRangedGoverningSkill({ actor, binding }).level, 14);
  assert.equal(resolveRangedGoverningSkill({ actor,
    binding: { key: "old-id", name: "Guns/TL9 (Rifle)" } }).level, 14);
  assert.equal(resolveRangedGoverningSkill({ actor,
    legacySpecialty: "rifle" }).key, "id:rifle-id");
  actor.system.skills.rifle2 = { name: "Guns/TL8 (Rifle)", level: 12 };
  assert.equal(resolveRangedGoverningSkill({ actor, legacySpecialty: "rifle" }), null);
});

test("legacy specialty migrates per ranged attack and preserves distinct bindings", async () => {
  const actor = actorWith();
  const state = { version: 9, weapons: [
    { id: "mac", name: "MAC", attackRef: { path: "system.ranged.00001" },
      governingSpecialty: "rifle", capacity: 10, magazines: [10], loadedIndex: 0, totalAmmo: 10 },
    { id: "pistol", name: "Pistol", attackRef: { path: "system.ranged.00002" },
      governingSpecialty: "pistol", capacity: 10, magazines: [10], loadedIndex: 0, totalAmmo: 10 }
  ] };
  actor.getFlag = () => state;
  actor.setFlag = async (_scope, _key, value) => { Object.assign(state, value); };
  const priorFoundry = globalThis.foundry;
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  try {
    const loaded = await new AmmoService(actor).loadState();
    assert.equal(loaded.governingSkills["path%3Asystem%2Eranged%2E00001"].key, "id:rifle-id");
    assert.equal(loaded.governingSkills["path%3Asystem%2Eranged%2E00002"].key, "id:pistol-id");
    state.governingSkills["path%3Asystem%2Eranged%2E00001"] = {
      key: "retired-id", name: "Guns/TL9 (Rifle)" };
    const refreshed = await new AmmoService(actor).loadState();
    assert.equal(refreshed.governingSkills["path%3Asystem%2Eranged%2E00001"].key, "id:rifle-id");
  } finally { globalThis.foundry = priorFoundry; }
});

test("weapon base remains Ranged Level while Governing Skill anchors techniques", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const actor = actorWith();
    const token = { actor };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const binding = { key: "id:rifle-id", name: "Guns/TL9 (Rifle)" };
    const weapon = attack(binding);
    const current = values();
    let details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.deepEqual([details.baseSkill, details.effectiveSkill], [8, 8]);
    assert.equal(details.baseSkillName, "Ranged Weapon Level");
    assert.equal(details.modifiers.reduce((sum, modifier) => sum + modifier.value, 0), 0);
    actor.system.skills.rifle.level = 14;
    details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.deepEqual([details.baseSkill, details.effectiveSkill], [8, 8]);
    current.moveAndAttack = true;
    assert.equal(fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting)
      .closeQuartersBattle.cqbBase, 5);
    current.targetDistanceOverride = 20;
    assert.equal(fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting)
      .effectiveSkill, 1);
    current.moveAndAttack = false;
    current.rangedRapidStrike = true;
    current.targetDistanceOverride = 8;
    const rrs = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.equal(rrs.modifiers.find(entry => entry.label.includes("Quick-Shot"))?.value, -3);
    current.hitLocationId = "face";
    const ta = createTargetedAttackContext({ actor, attack: weapon });
    const face = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting, ta);
    assert.equal(face.modifiers.find(entry => entry.label.includes("Targeted Attack"))?.value, -3);
    const preview = getTrademarkMoveSkillPreview({ attack: weapon, values: current,
      rangeBands: bands, targetingService: targeting, targetedAttackContext: ta,
      calculateSkillDetails: fire.calculateEffectiveFireSkillDetails });
    assert.equal(preview.baseSkill, 8);
    assert.equal(preview.effectiveSkill, face.effectiveSkill + 1);
    assert.equal(fire.calculateEffectiveFireSkillDetails(attack(null), values(), bands, targeting).baseSkill, 8);
    const standalone = createFireControlContext({ token, fireService: new FireService({ actor, token }),
      mode: "standalone" });
    assert.equal(standalone.calculateEffectiveFireSkillDetails(
      { ...weapon, level: 9 }, values(), bands, targeting).baseSkill, 9);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});

test("weapon 14 applies CQB, Quick-Shot and Targeted Attack relative to bound Guns 13", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const actor = actorWith();
    const token = { actor };
    const weapon = { ...attack({ key: "id:rifle-id", name: "Guns/TL9 (Rifle)" }),
      level: 14, data: { bulk: -5 } };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const current = values();
    let details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.deepEqual([details.baseSkill, details.effectiveSkill], [14, 14]);
    current.moveAndAttack = true;
    details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.deepEqual([details.closeQuartersBattle.governingSkillLevel,
      details.closeQuartersBattle.techniqueRelativeLevel,
      details.closeQuartersBattle.weaponTechniqueLevel,
      details.closeQuartersBattle.cqbBase,
      details.closeQuartersBattle.effectivePenalty], [13, 4, 18, 13, -1]);
    assert.equal(details.effectiveSkill, 13);
    current.moveAndAttack = false;
    current.rangedRapidStrike = true;
    details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting);
    assert.equal(details.modifiers.find(entry => entry.label.includes("Quick-Shot"))?.value, -2);
    assert.equal(details.effectiveSkill, 12);
    current.rangedRapidStrike = false;
    current.hitLocationId = "face";
    const ta = createTargetedAttackContext({ actor, attack: weapon });
    details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting, ta);
    assert.equal(details.modifiers.find(entry => entry.label.includes("Targeted Attack"))?.value, -2);
    assert.equal(details.effectiveSkill, 12);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});

test("prepared GGA roll records Ranged Level without a Governing Skill delta", async () => {
  const { executePreparedGgaRoll } = await import("../scripts/tools/prepared-gga-roll.js");
  const runtime = {
    GURPS: { ModifierBucket: { modifierStack: {}, applyMods: async () => [] },
      setLastTargetedRoll() {} },
    game: { user: { id: "user" }, settings: { get: () => null } },
    canvas: { tokens: { placeables: [] } },
    ChatMessage: { getSpeaker: () => ({ actor: "actor", token: null }),
      create: async data => data },
    Roll: { create: () => ({ total: 10, dice: [{ results: [
      { result: 3 }, { result: 3 }, { result: 4 }] }],
      evaluate: async function() { return this; } }) },
    renderTemplate: async () => "<p>GGA</p>",
    CONFIG: { sounds: { dice: "dice" } }
  };
  const actor = { id: "actor", canRoll: async () => ({ canRoll: true, hasActions: true }) };
  const result = await executePreparedGgaRoll({ actor, token: null,
    attack: { name: "MAC", level: 8 }, baseSkill: 8,
    baseSkillName: "Ranged Weapon Level", effectiveSkill: 8,
    physicalShots: 4, effectiveRoF: 4, rcl: 2, consumeAction: false, runtime });
  assert.equal(result.rollData.origtarget, 8);
  assert.equal(result.rollData.finaltarget, 8);
  assert.equal(result.rollData.modifier, 0);
});

test("both RRS slots retain the weapon Skill while CQB checks each distance", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const actor = actorWith();
    const token = { actor };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const weapon = attack({ key: "id:rifle-id", name: "Guns/TL9 (Rifle)" });
    const slots = [8, 20].map(targetDistanceOverride =>
      fire.calculateEffectiveFireSkillDetails(weapon, {
        ...values(), targetDistanceOverride, moveAndAttack: true, rangedRapidStrike: true
      }, bands, targeting));
    assert.deepEqual(slots.map(slot => slot.baseSkill), [8, 8]);
    assert.deepEqual(slots.map(slot => slot.closeQuartersBattle?.cqbBase ?? null), [5, null]);
    assert.deepEqual(slots.map(slot => slot.effectiveSkill), [3, -1]);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});

test("ambiguous legacy Rifle skills do not guess a technique governing skill", () => {
  const prior = { game: globalThis.game, GURPS: globalThis.GURPS };
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
  globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
  try {
    const actor = actorWith();
    actor.system.skills.rifle2 = { name: "Guns/TL8 (Rifle)", level: 12 };
    const token = { actor };
    const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
    const current = { ...values(), governingSpecialty: "rifle",
      moveAndAttack: true, rangedRapidStrike: true, hitLocationId: "face" };
    const weapon = attack(null);
    const ta = createTargetedAttackContext({ actor, attack: weapon });
    const details = fire.calculateEffectiveFireSkillDetails(weapon, current, bands, targeting, ta);
    assert.equal(details.baseSkill, 8);
    assert.equal(details.closeQuartersBattle, null);
    assert.equal(details.combatCalculation.channels.find(entry => entry.id === "rangedRapidStrike")?.resolvedValue, -6);
    assert.equal(details.modifiers.find(entry => entry.label.includes("Targeted Attack")), undefined);
  } finally {
    globalThis.game = prior.game;
    globalThis.GURPS = prior.GURPS;
  }
});
