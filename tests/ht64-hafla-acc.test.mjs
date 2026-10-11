import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, automatic, resolver, context } from "./fixtures/ht-special-context.mjs";
import { StandaloneWeaponDraft, StandaloneWeaponService, standaloneModeStats } from "../scripts/tools/standalone-weapon-service.js";
import { readStandaloneAttack } from "../scripts/tools/standalone-attack-service.js";
import { FireService, normalizeAccuracy, calculateAimBonus, resolveAimedFireBonuses } from "../scripts/tools/fire-service.js";
import { createFireControlContext } from "../scripts/tools/fire-control-context.js";
import { assertWeaponPreservation, restoreHaflaErrata } from "./fixtures/ht-preservation-contract.mjs";

const mid = "Wr3VDL3Z6SR3KCz3K", aid = "ht_specific_hafla_dm34_35mm_wp";
test("HAFLA source, draft snapshot and ordinary standalone attack preserve known Acc zero", async () => {
  const flags = {}, actor = { id: "a", isOwner: true, system: { ranged: {}, skills: { s: { name: "Guns/TL7 (Grenade Launcher)", level: 13, points: 1 } }, attributes: { DX: { value: 10 }, IQ: { value: 10 } } },
    getFlag: (s,k) => flags[s]?.[k], setFlag: async (s,k,v) => { flags[s] ??= {}; flags[s][k] = structuredClone(v); } };
  const mode = catalogs.getMode(mid); assert.equal(mode.stats.accuracy, "0"); assert.equal(standaloneModeStats(mode).acc, "0");
  const draft = new StandaloneWeaponDraft({ catalogs, type: "ranged" }); draft.selectModel("eHZit_0bsmz0CCCxc");
  const before = JSON.stringify(actor.system), record = await new StandaloneWeaponService(actor, catalogs).save(draft);
  assert.equal(record.modes[0].snapshot.stats.accuracy, "0");
  const attack = readStandaloneAttack(actor, record.id, mid);
  assert.equal(attack.acc, 0); assert.equal(attack.data.acc, "0"); assert.equal(attack.readinessReason, null); assert.equal(attack.level, 13);
  assert.equal(JSON.stringify(actor.system), before);
  record.modes[0].snapshot.stats.accuracy = null;
  flags["olegurps-qol"].standaloneWeapons.weapons[0] = record;
  const unknown = readStandaloneAttack(actor, record.id, mid);
  assert.equal(unknown.acc, null); assert.ok(unknown.readinessReason);
});
test("Acc zero Aim 0/1/2/3 uses the shared fire service and effective skill pipeline", () => {
  const attack = { level: 13, acc: 0, scopeBonus: 0, rof: "1", rcl: "2", data: { bulk: "-2", range: "10/90" } };
  const fire = createFireControlContext({ token: null, fireService: new FireService({}) });
  globalThis.GURPS = {};
  const bands = [{ index: 0, max: 10, penalty: 0, label: "isolated zero range penalty" }];
  const targeting = { getSelection: () => ({ zoneId: "torso", label: "Torso", penalty: 0 }) };
  for (const [seconds, bonus] of [[0,0],[1,0],[2,1],[3,2],[10,2]]) {
    assert.equal(calculateAimBonus(0, seconds), bonus);
    assert.equal(resolveAimedFireBonuses({ accuracy: 0, aimSeconds: seconds }).aimBonus, bonus);
    const skill = fire.calculateEffectiveFireSkill(attack, { aimSeconds: seconds, rangeIndex: 0, shots: 1, hitLocationId: "torso", manualModifier: 0 }, bands, targeting);
    assert.equal(skill, 13 + bonus);
  }
});
test("unknown Acc remains unknown and positive Acc/caps/Move and Attack remain unchanged", () => {
  for (const missing of [null, undefined, "", "unknown", "-"]) {
    assert.equal(normalizeAccuracy(missing), null);
    assert.equal(calculateAimBonus(missing, 3), 0);
    assert.equal(resolveAimedFireBonuses({ accuracy: missing, aimSeconds: 3 }).aimBonus, 0);
  }
  for (const [acc, expected] of [[1,[0,1,2,2]],[4,[0,4,5,6]]]) for(let s=0;s<4;s++) {
    assert.equal(calculateAimBonus(acc,s),expected[s]);
    assert.equal(resolveAimedFireBonuses({accuracy:acc,aimSeconds:s}).aimBonus,expected[s]);
  }
  assert.equal(resolveAimedFireBonuses({accuracy:0,aimSeconds:3,moveAndAttack:true}).aimBonus,0);
});
test("source errata is exactly HAFLA null to zero; all other weapon stats/IDs/hashes stay unchanged", async () => {
  const raw = await fs.readFile(new URL("../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json",import.meta.url),"utf8"), proof = JSON.parse(await fs.readFile(new URL("../docs/audit/ht-v1-3-preservation.json",import.meta.url),"utf8"));
  assertWeaponPreservation(raw,proof);
  const previous = JSON.parse(restoreHaflaErrata(raw,proof)), expected = structuredClone(previous);
  expected.equipment.flatMap(e=>e.modes).find(m=>m.weapon_mode_id===mid).stats.accuracy="0";
  expected.catalog_errata_v1=proof.approvedHaflaErrata.metadata;
  assert.deepEqual(JSON.parse(raw),expected);
  assert.equal(previous.catalog_errata_v1.revision,1);
});
test("WP recipe identity, native Damage/range and existing GM hints are untouched by accuracy errata", () => {
  const c = context(mid), p = automatic.prepare({modeId:mid,base:c.base,variantId:"ht_white_phosphorus"});
  assert.equal(c.base.ammoId,aid); assert.equal(p.state,"complete");
  const profile = resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},profilePolicy:"strict"});
  assert.equal(profile.damage.nativeSafe,true); assert.deepEqual(profile.damage.components.map(c=>c.formula),["1d-2 burn ex","1d(0.2) cut"]);
  assert.equal(profile.effective.acc,"0"); assert.equal(profile.effective.range,"10/90");
  assert.equal(profile.ammunition.recipe.autoProfile.revision,1);
  assert.equal(profile.damage.rules.environment.chatHint,catalogs.getVariant("ht","ht_white_phosphorus").chat_hint_ru);
});
