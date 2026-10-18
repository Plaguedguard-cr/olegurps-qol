import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { AttackProfileResolver, createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { AmmoService, readAttackAmmunition } from "../scripts/tools/ammo-service.js";
import { projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { applyAttackOverride, parseAccuracyComponents } from "../scripts/tools/weapon-attack-overrides.js";
import { executePreparedGgaRoll } from "../scripts/tools/prepared-gga-roll.js";
import { SprayingFireSessionService } from "../scripts/tools/spraying-fire-session-service.js";
import { resolveRuntimeAttackProfile, attackProfileError, loadAttackProfileTranslations } from "../scripts/tools/attack-profile-runtime.js";

globalThis.foundry = { utils: { deepClone: structuredClone, randomID: () => crypto.randomUUID() },
  applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { user: { id: "gm", isGM: true }, i18n: { lang: "ru", localize: key => key } };
globalThis.canvas = { scene: { id: "scene", regions: { contents: [] } } };
const catalogs = new CatalogService({ logger: null, fetcher: async url => {
  const definition = Object.values(CATALOG_DEFINITIONS).find(entry => url.endsWith(entry.filename));
  return { ok: true, json: async () => JSON.parse(await readFile(new URL("../data/catalogs/" + definition.filename, import.meta.url), "utf8")) };
} });
await catalogs.load();
const compatibility = new AmmunitionCompatibilityService(catalogs);
const resolver = new AttackProfileResolver({ catalogs, compatibility });
const modeId = "W27s4Lm8QlkKVKUPn";
assert.ok(catalogs.getMode(modeId));
const binding = { status: "confirmed", binding: { confirmed: true, modeId,
  equipmentId: catalogs.getEquipmentForMode(modeId).equipment_id, bindingId: "confirmed-model" } };
globalThis.OleGURPSQOL = { catalogs, ammunitionCompatibility: compatibility,
  weaponCatalogBindings: { analyzeMode: () => binding } };
const type = (ammoId = "ht_7_62x39mm", kind = "ammo-item") => ({
  source: "catalog", book: "ht", kind, ammoId, name: ammoId, key: "ht:" + kind + ":" + ammoId });

function fixture({ actorId = "actor-a", types = [type(), type("ht_357_magnum_9x33mmr")], legacy = false } = {}) {
  const raw = { uuid: "gga-mode", name: "AK-47", mode: "Rifle", damage: "5d+1 pi",
    level: "13", acc: "5+2", rof: "10", rcl: "2", range: "500/3100", bulk: "-6", shots: "30+1" };
  const weapon = { id: "weapon", name: raw.name, attackRef: { path: "system.ranged.00000", uuid: raw.uuid },
    ammoType: "Unconfirmed custom caliber label", capacity: 30, magazines: [20, 9], loadedIndex: 0, totalAmmo: 49 };
  if (!legacy) {
    weapon.ammunitionInventory = { version: 1, installedId: "mag-a",
      stocks: types.map(entry => ({ key: entry.key, type: entry, rounds: 10 })),
      magazines: [{ id: "mag-a", weaponId: weapon.id, capacity: 30, rounds: 20, ammoKey: types[0].key },
        { id: "mag-b", weaponId: weapon.id, capacity: 30, rounds: 9, ammoKey: types[1].key }] };
    projectAmmoInventory(weapon);
  }
  const flags = { world: { gurpsAmmoManager: { version: legacy ? 9 : 10, weapons: [weapon],
    attackOverrides: {}, governingSkills: {}, untouched: { value: 42 } } } };
  const actor = { id: actorId, isOwner: true, system: { ranged: { "00000": raw }, skills: {}, equipment: {} },
    getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); },
    update: async changes => {
      for (const path of Object.keys(changes)) {
        if (path.endsWith("-=sprayingFireSessions")) delete flags.world.gurpsAmmoManager.sprayingFireSessions;
        else throw new Error("Unexpected update");
      }
    } };
  const service = new AmmoService(actor);
  const state = () => actor.getFlag("world", "gurpsAmmoManager");
  const attack = () => applyAttackOverride({ ...raw, path: "system.ranged.00000", data: raw,
    ...parseAccuracyComponents(raw.acc), level: Number(raw.level), bulk: Number(raw.bulk) }, state());
  const profile = (options = {}) => resolver.resolve({ actorId, weaponId: weapon.id, attack: attack(),
    rawAttack: raw, state: state(), ammunition: service.readAttackAmmunition(weapon.id), binding, ...options });
  return { actor, service, state, attack, raw, weapon, flags, profile };
}

let messageSequence = 0;
function nativeRuntime(actor) {
  const messages = [];
  const runtime = { game: { user: game.user, settings: { get: () => null } },
    GURPS: { ModifierBucket: { modifierStack: {}, applyMods: async () => [] }, setLastTargetedRoll() {} },
    canvas: { tokens: { placeables: [] } },
    Roll: { create: formula => ({ formula, total: 10, dice: [{ results: [3, 3, 4].map(result => ({ result })) }],
      async evaluate() { return this; } }) },
    renderTemplate: async (path, data) => { assert.equal(path, "systems/gurps/templates/die-roll-chat-message.hbs"); return data.followon; },
    ChatMessage: { getSpeaker: () => ({ actor: actor.id }),
      create: async data => {
        // Foundry V14's DocumentFlagsField cleans data in place before constructing the document.
        if (data.flags?.["olegurps-qol"]?.attackProfile) {
          const profile = data.flags["olegurps-qol"].attackProfile;
          profile.mode.mode = profile.mode.mode;
          assert.equal(Object.isFrozen(profile), false);
        }
        const message = { ...data, id: "native-" + ++messageSequence,
          async setFlag(scope, key, value) { this.flags ??= {}; this.flags[scope] ??= {}; this.flags[scope][key] = structuredClone(value); },
          getFlag(scope, key) { return this.flags?.[scope]?.[key]; } };
        messages.push(message); return message;
      } } };
  return { runtime, messages };
}
function shoot(fx, { attackId = crypto.randomUUID(), amount = 3, execute = null, resolverOverride = resolver } = {}) {
  const { runtime } = nativeRuntime(fx.actor);
  return fx.service.executeShot({ weaponId: "weapon", attackId,
    prepare: ({ state, ammunition }) => ({ amount, profile: resolverOverride.resolve({
      actorId: fx.actor.id, weaponId: "weapon", rawAttack: fx.raw, attack: fx.attack(), state, binding,
      ammunition, context: { physicalShots: amount, kind: "normal" } }) }),
    execute: execute ?? (({ profile }) => executePreparedGgaRoll({ actor: fx.actor, attack: fx.attack(),
      attackProfile: profile, shotSnapshot: createShotSnapshot(profile, { attackId, resourceTiming: "after-attack" }),
      effectiveSkill: 13, physicalShots: amount, effectiveRoF: amount, rcl: 2, consumeAction: false, runtime })) });
}

test("basic installed cartridge is confirmed without catalog-stat substitution or mutations", () => {
  const fx = fixture(), before = structuredClone({ raw: fx.raw, flags: fx.flags });
  const p = fx.profile();
  assert.equal(p.ammunition.status, "confirmed"); assert.equal(p.compatibility.status, "compatible");
  assert.equal(p.resource.magazineId, "mag-a"); assert.equal(p.ammunition.ammoId, "ht_7_62x39mm");
  for (const field of ["damage", "range", "rof", "rcl", "shots"]) assert.equal(p.effective[field], fx.raw[field]);
  assert.equal(p.effective.acc, 5); assert.equal(p.effective.scopeBonus, 2);
  assert.deepEqual(p.transformations, []); assert.equal(p.sources.catalogStatisticsApplied, false);
  assert.deepEqual({ raw: fx.raw, flags: fx.flags }, before);
  assert.throws(() => { p.effective.damage = "changed"; }, TypeError);
});

test("GCS changes remain raw basis; overrides are recorded once and no HP/AP/HT64 effects are applied", () => {
  const fx = fixture(); fx.raw.damage = "7d(2) pi++"; fx.raw.range = "777/3333";
  fx.flags.world.gurpsAmmoManager.attackOverrides["uuid:gga-mode"] = {
    skillLevel: 15, acc: 6, scopeBonus: 3, rof: "12", rcl: "1", bulk: -5 };
  const p = fx.profile();
  assert.equal(p.raw.damage, "7d(2) pi++"); assert.equal(p.effective.damage, p.raw.damage);
  assert.equal(p.effective.range, "777/3333"); assert.equal(p.effective.level, 15);
  assert.equal(p.effective.rof, "12"); assert.equal(p.effective.rcl, "1");
  assert.equal(p.transformations.length, 6);
  assert.equal(new Set(p.transformations.map(entry => entry.id)).size, 6);
  assert.ok(p.transformations.every(entry => entry.source === "OleGURPS.attackOverrides"));
  assert.deepEqual(fx.profile(), p);
});

test("item and family with the same ID remain separate identities", () => {
  const fx = fixture({ types: [type("ht_357_magnum_9x33mmr"), type("ht_357_magnum_9x33mmr", "ammo-family")] });
  const a = fx.profile();
  fx.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.installedId = "mag-b";
  const b = fx.profile();
  assert.equal(a.ammunition.kind, "ammo-item"); assert.equal(b.ammunition.kind, "ammo-family");
  assert.notEqual(a.ammunition.ammoKey, b.ammunition.ammoKey);
  assert.equal(b.ammunition.familyId, b.ammunition.ammoId);
});

test("legacy label is never inferred or migrated by resolving or executing", async () => {
  const fx = fixture({ legacy: true });
  assert.equal(fx.profile().ammunition.status, "legacy"); assert.equal(fx.profile().compatibility.status, "undetermined");
  assert.equal(fx.profile().ammunition.ammoId, null);
  await shoot(fx);
  assert.equal(fx.state().version, 9); assert.equal(fx.state().weapons[0].ammunitionInventory, undefined);
  assert.deepEqual(fx.state().weapons[0].magazines, [17, 9]);
});

test("archived saved ammunition remains unresolved even with forged catalog identity", () => {
  const fx = fixture({ types: [{ ...type(), source: "test", key: "olegurps-qol:test-cartridge:v1" }, type()] });
  assert.equal(fx.profile().ammunition.status, "unresolved"); assert.equal(fx.profile().compatibility.status, "undetermined");
});

test("missing catalogs, unresolved IDs and unconfirmed bindings stay distinct from compatibility", () => {
  const fx = fixture();
  const absent = new AttackProfileResolver();
  const options = { actorId: fx.actor.id, attack: fx.attack(), rawAttack: fx.raw, ammunition: fx.service.readAttackAmmunition("weapon"), binding };
  assert.equal(absent.resolve(options).ammunition.status, "unavailable");
  assert.equal(absent.resolve(options).compatibility.status, "unavailable");
  assert.equal(resolver.resolve({ ...options, binding: { status: "suggested" } }).compatibility.status, "undetermined");
  const bad = structuredClone(options); bad.ammunition.type.ammoId = "does-not-exist";
  assert.equal(resolver.resolve(bad).ammunition.status, "unresolved");
});

test("actual incompatible cartridge blocks before native roll and consumption", async () => {
  const fx = fixture();
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-b" });
  const before = fx.state(); let calls = 0;
  await assert.rejects(shoot(fx, { execute: async () => { calls++; return { rolled: true }; } }), /IncompatibleAmmunition/);
  assert.equal(calls, 0); assert.deepEqual(fx.state(), before);
});

test("undetermined fallback may execute but is never reported as compatible", async () => {
  const fx = fixture();
  const unknown = new AttackProfileResolver({ catalogs, compatibility: { checkCompatibility: () => ({ status: "undetermined", reasons: [{ code: "NO_DATA" }], relation: null }) } });
  const result = await shoot(fx, { resolverOverride: unknown });
  assert.equal(result.profile.compatibility.status, "undetermined"); assert.equal(result.spent, 3);
});

test("two attacks, magazine switch and reopened service preserve independent native-message snapshots", async () => {
  const fx = fixture({ types: [type(), { key: "old", source: "legacy", name: "Second saved type" }] });
  const originalSystem = structuredClone(fx.actor.system);
  const first = await shoot(fx, { attackId: "first", amount: 5 });
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-b" });
  fx.service = new AmmoService(fx.actor);
  const second = await shoot(fx, { attackId: "second", amount: 2 });
  const a = first.message.getFlag("olegurps-qol", "shotSnapshot"), b = second.message.getFlag("olegurps-qol", "shotSnapshot");
  assert.equal(a.magazineId, "mag-a"); assert.equal(a.spent, 5);
  assert.equal(b.magazineId, "mag-b"); assert.equal(b.spent, 2);
  assert.equal(a.ammunition.ammoId, "ht_7_62x39mm"); assert.equal(b.ammunition.status, "legacy");
  assert.equal(a.correlation.attackMessageId, first.message.id);
  assert.equal(b.correlation.attackMessageId, second.message.id);
  assert.equal(a.correlation.nativeDamageLink, "unlinked"); assert.equal(b.correlation.damageMessageId, null);
  assert.equal(first.message.content.split('<details')[0], '[@actor-a@D:"AK-47 (Rifle)"]');
  assert.match(first.message.content, /<p>ht_7_62x39mm<\/p><p>HT176<\/p>/);
  assert.doesNotMatch(first.message.content, /<details[^>]*\bopen/);
  assert.deepEqual(first.message.getFlag("olegurps-qol", "shotSnapshot"), a);
  assert.deepEqual(fx.state().weapons[0].magazines, [15, 7]);
  assert.deepEqual(fx.actor.system, originalSystem);
});

test("different actors and modes keep independent IDs, profiles and receipts", async () => {
  const a = fixture(), b = fixture({ actorId: "actor-b" });
  b.raw.mode = "Single"; b.raw.uuid = "other-mode";
  const [first, second] = await Promise.all([shoot(a, { attackId: "same-request" }), shoot(b, { attackId: "same-request" })]);
  assert.notEqual(first.snapshot.actorId, second.snapshot.actorId);
  assert.notEqual(first.snapshot.mode.uuid, second.snapshot.mode.uuid);
  assert.equal(a.state().weapons[0].magazines[0], 17); assert.equal(b.state().weapons[0].magazines[0], 17);
});

test("simultaneous duplicate execution and persisted replay never roll or charge twice", async () => {
  const fx = fixture(); let nativeCalls = 0;
  const execute = async () => { nativeCalls++; await new Promise(resolve => setTimeout(resolve, 5)); return { rolled: true }; };
  await Promise.all([shoot(fx, { attackId: "once", execute }), shoot(fx, { attackId: "once", execute })]);
  assert.equal(nativeCalls, 1); assert.equal(fx.state().weapons[0].magazines[0], 17);
  // A different Actor document instance simulates reloading, without the in-memory execution cache.
  const actorAfterReload = { ...fx.actor };
  const replay = await new AmmoService(actorAfterReload).executeShot({ weaponId: "weapon", attackId: "once",
    prepare: () => assert.fail("persisted replay must not prepare"), execute: () => assert.fail("must not execute") });
  assert.equal(replay.duplicate, true); assert.equal(fx.state().weapons[0].magazines[0], 17);
});

test("install waits for native execution and only the initial magazine is charged", async () => {
  const fx = fixture();
  let started, release;
  const running = new Promise(resolve => { started = resolve; });
  const pause = new Promise(resolve => { release = resolve; });
  const firing = shoot(fx, { execute: async () => { started(); await pause; return { rolled: true }; } });
  await running;
  const switching = fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-b" });
  assert.equal(fx.service.readAttackAmmunition("weapon").magazineId, "mag-a");
  release(); await firing; await switching;
  assert.deepEqual(fx.state().weapons[0].magazines, [17, 9]);
  assert.equal(fx.service.readAttackAmmunition("weapon").magazineId, "mag-b");
});

test("insufficient rounds, preparation cancellation and native canRoll cancellation do not charge", async () => {
  const fx = fixture(), before = fx.state();
  await assert.rejects(shoot(fx, { amount: 21, execute: () => assert.fail("must not roll") }), /InsufficientRounds/);
  assert.deepEqual(fx.state(), before);
  const cancelled = await fx.service.executeShot({ weaponId: "weapon", attackId: "cancel",
    prepare: () => null, execute: () => assert.fail("must not roll") });
  assert.equal(cancelled.rolled, false); assert.deepEqual(fx.state(), before);
  await shoot(fx, { execute: async () => ({ rolled: false }) });
  assert.deepEqual(fx.state(), before);
});

test("rapid bursts consume physical cartridges, not the number of projectiles", async () => {
  const fx = fixture(); fx.raw.rof = "3x9";
  const result = await shoot(fx, { amount: 3 });
  assert.equal(result.spent, 3); assert.equal(result.profile.effective.rof, "3x9");
  assert.equal(fx.state().weapons[0].magazines[0], 17);
});

test("no physical magazine preserves unmanaged execution without manufacturing cartridges", async () => {
  const fx = fixture();
  fx.flags.world.gurpsAmmoManager.weapons[0] = { ...fx.weapon, ammunitionInventory: undefined,
    ammoUnconfigured: true, capacity: 0, magazines: [], loadedIndex: -1, totalAmmo: 0 };
  const result = await shoot(fx, { amount: 100 });
  assert.equal(result.profile.resource.kind, "unmanaged"); assert.equal(result.spent, 0);
  assert.deepEqual(fx.state().weapons[0].magazines, []); assert.equal(fx.state().weapons[0].totalAmmo, 0);
});

test("energy/rocket-like untracked modes never acquire a magazine via the runtime adapter", () => {
  const fx = fixture();
  for (const name of ["Beam", "Rocket launcher"]) {
    const p = resolveRuntimeAttackProfile({ actor: fx.actor, attack: { name, uuid: "unmanaged:" + name,
      data: { damage: "6d burn", shots: "1" } } });
    assert.equal(p.resource.kind, "unmanaged"); assert.equal(p.resource.magazineId, null);
    assert.equal(p.effective.damage, "6d burn");
  }
});

test("permissions and invalid inventories block before rolling without repair", async () => {
  const fx = fixture(), originalUser = game.user;
  fx.actor.isOwner = false; game.user = { id: "other", isGM: false };
  try { await assert.rejects(shoot(fx), /Permission/); }
  finally { game.user = originalUser; }
  fx.actor.isOwner = true;
  fx.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.magazines[0].rounds = -1;
  const before = fx.state();
  await assert.rejects(shoot(fx), /Review/); assert.deepEqual(fx.state(), before);
});

test("stale settings save preserves resource receipts and committed magazine counts", async () => {
  const fx = fixture(), stale = fx.state();
  await shoot(fx, { attackId: "receipt" }); await fx.service.saveState(stale);
  assert.equal(fx.state().shotReceipts.receipt.spent, 3);
  assert.equal(fx.state().weapons[0].magazines[0], 17);
});

function sprayingFixture() {
  const fx = fixture();
  const token = { id: "token", document: { id: "token", getFlag: () => null }, scene: { id: "scene" } };
  const service = new SprayingFireSessionService({ actor: fx.actor, token, weapon: fx.weapon, attack: fx.attack() });
  return { ...fx, spray: service };
}

test("Spraying preserves delayed consumption, pins its magazine and finalizes per-attack snapshots once", async () => {
  const fx = sprayingFixture();
  const session = await fx.spray.createPlanned({ plannedAmmo: 7, targets: [{ tokenId: "a" }, { tokenId: "b" }] });
  const messages = new Map(); fx.spray.runtime.game.messages = { get: id => messages.get(id) };
  for (let i = 0; i < 2; i++) {
    const { runtime } = nativeRuntime(fx.actor);
    const options = { physicalShots: 3, effectiveSkill: 13, effectiveRoF: 3, rcl: 2 };
    const result = await fx.spray.executeTarget(session, options, actual => executePreparedGgaRoll({
      actor: fx.actor, attack: fx.attack(), ...actual,
      shotSnapshot: createShotSnapshot(actual.attackProfile, { attackId: actual.attackId, resourceTiming: "spraying-completion" }),
      consumeAction: false, runtime }));
    messages.set(result.message.id, result.message);
    session.targets[i].completed = true;
    await fx.spray.save(session);
    assert.equal(fx.state().weapons[0].magazines[0], 20);
  }
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-b" });
  await assert.rejects(fx.spray.finish());
  assert.deepEqual(fx.state().weapons[0].magazines, [20, 9]);
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-a" });
  assert.equal(await fx.spray.finish(), true); assert.equal(await fx.spray.finish(), false);
  assert.deepEqual(fx.state().weapons[0].magazines, [13, 9]);
  for (const message of messages.values()) {
    const shot = message.getFlag("olegurps-qol", "shotSnapshot");
    assert.equal(shot.magazineId, "mag-a"); assert.equal(shot.spent, 3);
    assert.equal(message.getFlag("olegurps-qol", "burstReceipt").totalSpent, 7);
    assert.equal(message.getFlag("olegurps-qol", "burstReceipt").traverseSpent, 1);
  }
});

test("Spraying cancellation after a target preserves ammunition and finalizes zero consumption", async () => {
  const fx = sprayingFixture();
  const session = await fx.spray.createPlanned({ plannedAmmo: 4, targets: [{ tokenId: "a" }, { tokenId: "b" }] });
  const { runtime } = nativeRuntime(fx.actor);
  const result = await fx.spray.executeTarget(session, { physicalShots: 2, effectiveSkill: 13, effectiveRoF: 2, rcl: 2 },
    options => executePreparedGgaRoll({ actor: fx.actor, attack: fx.attack(), ...options, consumeAction: false, runtime }));
  fx.spray.runtime.game.messages = { get: () => result.message };
  await fx.spray.cancel();
  assert.equal(fx.state().weapons[0].magazines[0], 20);
  assert.equal(result.message.getFlag("olegurps-qol", "shotSnapshot").spent, 0);
});

test("new errors have both RU/EN translations and use the active Foundry dictionary", async () => {
  const ru = JSON.parse(await readFile(new URL("../lang/ru.json", import.meta.url), "utf8"));
  const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
  for (const key of Object.keys(ru).filter(key => key.startsWith("OleGURPS.AttackProfile."))) {
    assert.ok(en[key]); const code = key.split(".").at(-1);
    assert.equal(attackProfileError(code, { game: { i18n: { localize: k => ru[k] } } }), ru[key]);
    assert.equal(attackProfileError(code, { game: { i18n: { localize: k => en[k] } } }), ru[key]);
  }
});

test("native message visibility is unchanged by profile metadata for GM/blind/whisper", async () => {
  const fx = fixture();
  for (const mode of ["publicroll", "gmroll", "blindroll", "selfroll"]) {
    const { runtime } = nativeRuntime(fx.actor);
    runtime.game.settings.get = () => mode;
    runtime.ChatMessage.applyRollMode = (data, rollMode) => {
      assert.equal(rollMode, mode);
      if (mode !== "publicroll") data.whisper = ["gm"];
      if (mode === "blindroll") data.blind = true;
    };
    const profile = fx.profile();
    const result = await executePreparedGgaRoll({ actor: fx.actor, attack: fx.attack(), attackProfile: profile,
      shotSnapshot: createShotSnapshot(profile, { attackId: mode }), effectiveSkill: 13,
      physicalShots: 1, effectiveRoF: 1, rcl: 2, consumeAction: false, runtime });
    assert.equal(result.message.blind === true, mode === "blindroll");
    assert.deepEqual(result.message.whisper, mode === "publicroll" ? undefined : ["gm"]);
    assert.equal(result.message.getFlag("olegurps-qol", "attackProfile").resource.magazineId, "mag-a");
  }
});

test("Suppression activation charges once; later zone attacks use the prepaid original magazine", async () => {
  const fx = fixture(), activationId = "suppression:session";
  const activation = await shoot(fx, { attackId: activationId, amount: 5, execute: async () => ({ rolled: true }) });
  await shoot(fx, { attackId: activationId, amount: 5, execute: () => assert.fail("activation must not repeat") });
  await fx.service.inventoryTransaction("weapon", "install", { magazineId: "mag-b" });
  const { SuppressionFireApp } = await import("../scripts/tools/suppression-fire-app.js");
  const options = { physicalShots: 5, effectiveRoF: 5, effectiveSkill: 13, rcl: 2 };
  const app = Object.create(SuppressionFireApp.prototype);
  Object.assign(app, { actor: fx.actor, weapon: fx.weapon, attack: fx.attack(),
    sessionService: { session: { sessionId: "session", ammunitionProfile: activation.profile,
      ammunitionReceipt: activation.receipt, zones: [{ depleted: false, shotsAllocated: 5, hitsRemaining: 5 }] } },
    _withTargetSelection: async (_id, operation) => operation(), _executionOptions: () => ({ ...options }),
    fireService: { executeRangedAttack: async (_attack, actual) => {
      assert.equal(actual.attackProfile.resource.magazineId, "mag-a");
      assert.equal(actual.attackProfile.ammunition.ammoId, "ht_7_62x39mm");
      assert.equal(actual.resourceTiming, "suppression-prepaid"); assert.equal(actual.resourceReceiptId, activationId);
      return { rolled: false };
    } } });
  await app._executeRequest({ zoneIndex: 0, targetId: "target" });
  assert.deepEqual(fx.state().weapons[0].magazines, [15, 9]);
});

test("Suppression saved-session normalization retains prepaid profile and receipt on reopening", async () => {
  const { SuppressionFireSessionService } = await import("../scripts/tools/suppression-fire-session-service.js");
  const fx = fixture(); let tokenFlags = {};
  const document = { id: "source", getFlag: (_scope, key) => tokenFlags[key],
    setFlag: async (_scope, key, value) => { tokenFlags[key] = structuredClone(value); } };
  const token = { id: "source", document, scene: { id: "scene", regions: { contents: [] } } };
  const runtime = { foundry, game, canvas: { scene: token.scene } };
  const service = new SuppressionFireSessionService({ actor: fx.actor, token, weapon: fx.weapon, attack: fx.attack(), runtime });
  await service.ensureSession();
  const profile = fx.profile();
  await service.markAmmoConsumed({ profile, receipt: { attackId: "suppression:one", spent: 5 } });
  const reopened = new SuppressionFireSessionService({ actor: fx.actor, token, weapon: fx.weapon, attack: fx.attack(), runtime });
  const saved = await reopened.loadExisting();
  assert.deepEqual(saved.ammunitionProfile, profile); assert.equal(saved.ammunitionReceipt.spent, 5);
  let updates;
  service.scene.regions.contents.push({ id: "region", flags: { "olegurps-qol": {
    type: "suppressionFire", sessionId: saved.sessionId, zoneIndex: 0 } } });
  service.scene.updateEmbeddedDocuments = async (_type, values) => { updates = values; };
  await service._syncRegionFlags(saved);
  assert.deepEqual(updates[0]["flags.olegurps-qol.ammunitionProfile"], profile);
  assert.equal(updates[0]["flags.olegurps-qol.ammunitionReceipt"].spent, 5);
});

test("cached server manifests load only new profile translations for RU/EN without changing user settings", async () => {
  for (const language of ["ru", "en"]) {
    const makeRuntime = () => {
      const translations = { existing: "preserved" };
      return { location: {}, fetch: async url => ({ ok: true, json: async () =>
        JSON.parse(await readFile(new URL("../lang/" + language + ".json", import.meta.url), "utf8")) }),
        game: { i18n: { lang: language, translations, localize: key =>
          key.split(".").reduce((value, part) => value?.[part], translations) ?? key } },
        foundry: { utils: { setProperty: (target, path, value) => {
          const parts = path.split("."); for (const part of parts.slice(0, -1)) target = target[part] ??= {};
          target[parts.at(-1)] = value;
        } } } };
    };
    for (let reload = 0; reload < 2; reload++) {
      const runtime = makeRuntime(); await loadAttackProfileTranslations(runtime);
      assert.notEqual(attackProfileError("IncompatibleAmmunition", runtime), "IncompatibleAmmunition");
      assert.equal(runtime.game.i18n.lang, language);
      assert.equal(runtime.game.i18n.translations.existing, "preserved");
      assert.deepEqual(runtime.game.i18n.translations, {existing:"preserved"});
    }
  }
});

test("legacy Spraying retries failed cleanup without spending twice or migrating the inventory", async () => {
  const fx = fixture({ legacy: true });
  const service = new SprayingFireSessionService({ actor: fx.actor, token: { id: "token", document: { id: "token", getFlag: () => null } },
    weapon: fx.weapon, attack: fx.attack() });
  const session = await service.createPlanned({ plannedAmmo: 4, targets: [{ completed: true }, { completed: true }] });
  const update = fx.actor.update; fx.actor.update = async () => { throw new Error("CleanupFailure"); };
  await assert.rejects(service.finish(), /CleanupFailure/);
  assert.equal(fx.state().weapons[0].magazines[0], 16);
  assert.equal(fx.state().sprayingFireSessions[service.key].ammoConsumed, true);
  fx.actor.update = update;
  assert.equal(await service.finish(), true);
  assert.equal(fx.state().weapons[0].magazines[0], 16);
  assert.equal(fx.state().weapons[0].ammunitionInventory, undefined);
});

test("failed consumption persistence leaves counts intact and pending native message blocks replay after reload", async () => {
  const fx = fixture(), { runtime, messages } = nativeRuntime(fx.actor), attackId = "storage-failure";
  const originalSetFlag = fx.actor.setFlag, originalMessages = game.messages;
  fx.actor.setFlag = async () => { throw new Error("StorageFailure"); };
  game.messages = { contents: messages };
  try {
    await assert.rejects(shoot(fx, { attackId, execute: ({ profile }) => executePreparedGgaRoll({ actor: fx.actor,
      attack: fx.attack(), attackProfile: profile,
      shotSnapshot: createShotSnapshot(profile, { attackId, resourceTiming: "after-attack" }),
      effectiveSkill: 13, physicalShots: 3, effectiveRoF: 3, rcl: 2, consumeAction: false, runtime }) }), /StorageFailure/);
    assert.equal(messages.length, 1); assert.equal(fx.state().weapons[0].magazines[0], 20);
    assert.equal(messages[0].getFlag("olegurps-qol", "shotSnapshot"), undefined);
    fx.actor.setFlag = originalSetFlag;
    await assert.rejects(new AmmoService({ ...fx.actor }).executeShot({ weaponId: "weapon", attackId,
      prepare: () => assert.fail("already rolled"), execute: () => assert.fail("already rolled") }), /IncompleteShotAccounting/);
    assert.equal(fx.state().weapons[0].magazines[0], 20);
  } finally { game.messages = originalMessages; fx.actor.setFlag = originalSetFlag; }
});

test("incomplete explosive recipe prevents native attack and any resource write", async () => {
  for (const [variantId, customId] of [["ht_apex", "unfinished"], ["ht_apex", null], ["ht_aphex", null]]) {
  const custom = type(); custom.recipe = { version: 1, variantId, ...(customId ? { customId } : {}) };
  custom.key += ":recipe-v1:" + variantId + (customId ? ":custom:" + customId : "");
  const fx = fixture({ types: [custom, type()] });
  const before = JSON.stringify(fx.state()), system = JSON.stringify(fx.actor.system);
  await assert.rejects(fx.service.executeShot({ weaponId: "weapon", attackId: "incomplete-custom",
    prepare: () => ({ amount: 1, profile: { compatibility: { status: "undetermined" },
      damage: { status: "unresolved", nativeSafe: false } } }),
    execute: () => assert.fail("Incomplete recipe must not roll") }), /IncompleteExplosiveRecipe/);
  assert.equal(JSON.stringify(fx.state()), before);
  assert.equal(JSON.stringify(fx.actor.system), system);
  }
});
