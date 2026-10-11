import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService } from "../scripts/catalog-service.js";
import { StandaloneWeaponDraft, StandaloneWeaponService } from "../scripts/tools/standalone-weapon-service.js";
import { readStandaloneAttack } from "../scripts/tools/standalone-attack-service.js";
import { createRangedTargetedAttackContext, resolveRangedGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { createTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { FireService } from "../scripts/tools/fire-service.js";
globalThis.foundry = { utils: { deepClone: structuredClone },
  applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { user: { targets: new Set() }, settings: { get: () => null } };
globalThis.GURPS = { ModifierBucket: { modifierStack: { modifierList: [] } } };
const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");

const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
  json: async () => JSON.parse(await fs.readFile(new URL("../data/catalogs/" + url.split("/").at(-1), import.meta.url), "utf8")) }) });
await catalogs.load();
const skill = (specialty, level = 14, tl = 8) => ({ name: `Guns/TL${tl} (${specialty})`, level, points: 1, type: "SKILL" });
const ta = (specialty, level = 11, tl = 8, target = "Face") => ({
  name: `Targeted Attack (Guns/TL${tl} (${specialty})/${target})`,
  prerequisite: `Guns/TL${tl} (${specialty})`, targetLocation: target, level, points: 1, type: "TECHNIQUE" });
const bands = [{ index: 0, max: 5, penalty: 0, label: "5 yds" }];
const targeting = { getSelection: id => ({ zoneId: id, canonicalKeys: [id], label: id,
  penalty: id === "face" ? -5 : id === "vitals" ? -3 : 0 }) };
const values = { shots: 1, rangeIndex: 0, manualRangeSelected: true,
  hitLocationId: "face", visibility: { mode: "normal" } };

async function fixture(skills = [], dx = 10) {
  const flags = {};
  const actor = { id: "actor", isOwner: true, system: { ranged: {}, melee: {},
    skills: Object.fromEntries(skills.map((entry, index) => [index, entry])), attributes: { DX: { value: dx } } },
    getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); } };
  const draft = new StandaloneWeaponDraft({ catalogs, type: "ranged" });
  draft.selectModel(catalogs.getEquipmentForMode("W1miyD-ozfViISq7K").equipment_id);
  const record = await new StandaloneWeaponService(actor, catalogs).save(draft);
  return { actor, record, attack: () => readStandaloneAttack(actor, record.id) };
}

function details(actor, attack, options = values) {
  const token = { actor };
  const fire = createFireControlContext({ token, fireService: new FireService({ actor, token }) });
  return fire.calculateEffectiveFireSkillDetails(attack, options, bands, targeting,
    createRangedTargetedAttackContext({ actor, attack }));
}

test("SMG defaults from Rifle without mandatory TA specialty or transferred Rifle improvement", async () => {
  const f = await fixture([skill("Rifle"), skill("Pistol", 10), ta("Rifle", 12)]);
  const before = JSON.stringify(f.actor.system), attack = f.attack();
  const resolved = resolveRangedGoverningSkill({ actor: f.actor, binding: attack.governingSkillBinding });
  assert.deepEqual([resolved.specialty, resolved.sourceName, resolved.level, resolved.learned],
    ["smg", "Guns/TL8 (Rifle)", 12, false]);
  const context = createRangedTargetedAttackContext({ actor: f.actor, attack });
  assert.equal(context.requiresSelection, false);
  assert.deepEqual(context.specialtyOptions, []);
  assert.equal(context.resolve({ target: "face", basePenalty: -5 }), null);
  const face = details(f.actor, attack);
  assert.equal(face.effectiveSkill, 7);
  const channels = face.combatCalculation.channels.filter(entry => entry.id === "hitLocation");
  assert.equal(channels.length, 1); assert.equal(channels[0].resolvedValue, -5);
  assert.equal(JSON.stringify(f.actor.system), before);
});

test("exact learned SMG TA replaces its location channel once and ignores better Rifle TA", async () => {
  const f = await fixture([skill("SMG"), skill("Rifle", 20), ta("SMG"), ta("Rifle", 20), ta("SMG", 13, 8, "Vitals")]);
  const attack = f.attack(), context = createRangedTargetedAttackContext({ actor: f.actor, attack });
  assert.equal(context.automaticSpecialty, "smg"); assert.equal(context.requiresSelection, false);
  const face = details(f.actor, attack);
  assert.equal(face.effectiveSkill, 11);
  assert.equal(face.combatCalculation.channels.filter(entry => entry.id === "hitLocation").length, 1);
  assert.equal(context.resolve({ target: "face", basePenalty: -5 }).entry.name, ta("SMG").name);
  assert.equal(details(f.actor, attack, { ...values, hitLocationId: "vitals" }).effectiveSkill, 13);
});

test("no studied TA and a lawful attribute default retain ordinary hit locations", async () => {
  for (const skills of [[skill("Rifle")], [ta("Rifle", 20)]]) {
    const f = await fixture(skills, 16), attack = f.attack();
    assert.equal(attack.readinessReason, null);
    assert.equal(attack.level, 12);
    assert.equal(createRangedTargetedAttackContext({ actor: f.actor, attack }).requiresSelection, false);
    assert.equal(details(f.actor, attack).effectiveSkill, 7);
  }
});

test("unresolved skill still blocks standalone readiness; TA never manufactures a default", async () => {
  const f = await fixture([ta("SMG", 20)], null), attack = f.attack();
  assert.equal(attack.standaloneRef.governingSkill.resolved, false);
  assert.ok(attack.readinessReason); assert.equal(attack.level, null);
  assert.equal(createRangedTargetedAttackContext({ actor: f.actor, attack }).enabled, false);
});

test("TL policy changes only resolved base and never transfers Rifle TA to SMG or another TL", async () => {
  const previous = globalThis.game;
  const f = await fixture([skill("Rifle", 14, 9), ta("Rifle", 14, 9)]);
  try {
    for (const enabled of [false, true, false]) {
      globalThis.game = { user: { id: "roller", targets: new Set(), getFlag: () => enabled }, settings: { get: () => null } };
      const attack = f.attack(), face = details(f.actor, attack);
      assert.equal(attack.level, enabled ? 12 : 11);
      assert.equal(face.effectiveSkill, enabled ? 7 : 6);
      assert.equal(createRangedTargetedAttackContext({ actor: f.actor, attack }).resolve({ target: "face", basePenalty: -5 }), null);
    }
  } finally { globalThis.game = previous; }
});

test("native GGA base is retained while matching bound TA uses the learned governing level", () => {
  const actor = { system: { skills: { smg: skill("SMG"), rifle: skill("Rifle", 20),
    smgTA: ta("SMG"), rifleTA: ta("Rifle", 20) } } };
  const attack = { name: "Native SMG", level: 16, rof: "1", acc: 0, data: { bulk: -3 },
    governingSkillBinding: { name: "Guns/TL8 (SMG)" } };
  const face = details(actor, attack);
  assert.equal(face.baseSkill, 16); assert.equal(face.effectiveSkill, 13);
  assert.equal(createRangedTargetedAttackContext({ actor, attack }).requiresSelection, false);
  delete actor.system.skills.smgTA;
  assert.equal(details(actor, attack).effectiveSkill, 11);
});

test("legacy native required skill is never replaced by default source metadata or a foreign binding", () => {
  const actor = { system: { skills: { rifle: skill("Rifle"), rifleTA: ta("Rifle", 12),
    pistol: skill("Pistol"), pistolTA: ta("Pistol", 12) } } };
  const attack = { name: "Native default", level: 12, rof: "1", acc: 0, data: { bulk: -3,
    governingSkillName: "Guns/TL8 (SMG)", defaultSkillName: "Guns/TL8 (Rifle)" } };
  for (const binding of [null, { name: "Guns/TL8 (Rifle)" }]) {
    attack.governingSkillBinding = binding;
    const context = createRangedTargetedAttackContext({ actor, attack });
    assert.equal(context.requiresSelection, false);
    assert.equal(context.resolve({ specialty: "rifle", target: "face", basePenalty: -5 }), null);
    assert.equal(details(actor, attack).effectiveSkill, 7);
  }
  attack.data.governingSkillName = "Guns/TL9 (Rifle)";
  assert.equal(details(actor, attack).effectiveSkill, 7);
  attack.data.governingSkillName = "Guns/TL8 (SMG)";
  actor.system.skills.smg = skill("SMG"); actor.system.skills.smgTA = ta("SMG");
  attack.governingSkillBinding = null;
  const context = createRangedTargetedAttackContext({ actor, attack });
  assert.equal(context.resolve({ governingSkill: { name: "Guns/TL8 (Rifle)", family: "guns",
    specialty: "rifle", level: 14 }, target: "face", basePenalty: -5 }), null);
});

test("explicit TA TL cannot transfer; missing legacy TL is used only with a unique parent", () => {
  const actor = { system: { skills: { smg: skill("SMG"), otherTL: skill("SMG", 20, 9), wrong: ta("SMG", 20, 9) } } };
  const attack = { name: "SMG", level: 14, governingSkillBinding: { name: "Guns/TL8 (SMG)" } };
  const resolve = () => createRangedTargetedAttackContext({ actor, attack }).resolve({ target: "face", basePenalty: -5 });
  assert.equal(resolve(), null);
  actor.system.skills.legacy = { name: "Targeted Attack (Guns (SMG)/Face)", level: 12, type: "TECHNIQUE" };
  assert.equal(resolve(), null);
  delete actor.system.skills.otherTL;
  assert.equal(resolve().effectivePenalty, -2);
  delete actor.system.skills.legacy;
  actor.system.skills.structured = { name: "Targeted Attack (Guns (SMG)/Face)",
    prerequisite: { name: "Guns/TL9 (SMG)" }, level: 20, type: "TECHNIQUE" };
  assert.equal(resolve(), null);
});

test("unlearned zero-point TA gives no improvement; legacy choices contain only real TA parents", () => {
  const actor = { system: { skills: { smg: skill("SMG"), rifle: skill("Rifle"), pistol: skill("Pistol"),
    unlearned: { ...ta("SMG", 14), points: 0 }, rifleTA: ta("Rifle", 12) } } };
  const context = createTargetedAttackContext({ actor });
  assert.deepEqual(context.specialtyOptions.map(option => option.value), ["rifle"]);
  assert.equal(context.resolve({ specialty: "smg", target: "face", basePenalty: -5 }), null);
});

test("shared UI preview displays ordinary Face -5 for a default, and TA replacement only for studied SMG", async () => {
  for (const learned of [false, true]) {
    const f = await fixture([skill(learned ? "SMG" : "Rifle"), ta(learned ? "SMG" : "Rifle")]);
    const app = Object.create(FirePreparationApp.prototype);
    Object.assign(app, { actor: f.actor, mode: "weapon", attack: f.attack(), fireState: {},
      targetedAttackContext: createRangedTargetedAttackContext({ actor: f.actor, attack: f.attack() }),
      _visibilityForTargeting: () => ({ mode: "normal" }) });
    const html = app._buildHitLocationPenalty({ id: "face", penalty: -5 });
    assert.equal(html.includes("has-ta"), learned);
    assert.ok(html.includes("-5"));
    if (learned) assert.ok(html.includes("-3"));
  }
});
