import test from "node:test";
import assert from "node:assert/strict";
import { modes, profile, context, inventoryFixture, compatibility, api } from "./fixtures/ht-special-context.mjs";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { shotAmmunitionConditions, resolveDamageShotLink } from "../scripts/tools/damage-shot-link.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
import { evaluateHTOptionEligibility } from "../scripts/ht-option-eligibility.js";
test("Frangible source-backed construction adjusts divisor, piercing and range; Damage dice unchanged", () => {
  const p = profile(modes.glock, "ht_frangible"); assert.equal(p.damage.nativeSafe, true);
  assert.equal(p.damage.formula, "2d+2(0.5) pi+"); assert.equal(p.effective.range, "144/1620");
  assert.equal(p.damage.rules.costMultiplier, 1.5); assert.ok(Math.abs(p.damage.rules.costPerShot - 0.45) < 1e-10);
  assert.equal(p.damage.rules.zeroDRTreatedAs, 1); assert.equal(p.damage.rules.overpenetration.prohibitedWhenTargetHasDR, true);
  assert.equal(p.damage.rules.overpenetration.application, "manual-GM"); assert.equal(p.damage.rules.overpenetration.ordinaryArmorPenetration, "preserved");
  assert.equal(p.damage.support.status, "GM-MEDIATED"); assert.deepEqual(p.damage.support.manual.map(c => c.id), ["ObjectWithoutDR", "NoOverpenetrationWithDR"]);
  assert.equal(p.effective.acc, p.raw.acc); assert.equal(p.effective.rof, p.raw.rof); assert.equal(p.effective.rcl, p.raw.rcl);
});
test("Frangible all four piercing steps cap at pi++, existing divisors are never replaced blindly", () => {
  for (const [base, expected] of [["pi-", "pi"], ["pi", "pi+"], ["pi+", "pi++"], ["pi++", "pi++"]]) {
    const p = resolveAmmunitionEffects({ raw: { damage: "3d " + base, range: "100/1000" }, variantId: "ht_frangible",
      baseStatus: "compatible", constructionStatus: "compatible" });
    assert.equal(p.formula, "3d(0.5) " + expected); assert.equal(p.nativeSafe, true);
  }
  assert.equal(profile(modes.glock, "ht_frangible", { rawAttack: { ...context(modes.glock).raw, damage: "2d+2(2) pi" } }).damage.nativeSafe, false);
});
test("Frangible unreviewed construction stays undetermined; explicit projectile incompatibility stays prohibited", () => {
  assert.equal(compatibility.checkCompatibility(modes.ak, "ht_frangible").status, "undetermined");
  assert.equal(profile(modes.ak, "ht_frangible").damage.nativeSafe, false);
  const p = profile(modes.glock, "ht_frangible"), facts = structuredClone(p.construction.eligibility.facts);
  facts.projectileClasses = { values: ["buckshot"], complete: true };
  assert.equal(evaluateHTOptionEligibility(api.catalogs.getVariant("ht", "ht_frangible"), facts).status, "incompatible");
});
test("Frangible unchanged stocks on switch; immutable conditions and historical Damage survive reload", async () => {
  const f = inventoryFixture(modes.glock, "ht_frangible"), before = JSON.stringify(f.actor.system);
  const result = await f.service.executeShot({ weaponId: "weapon", attackId: "frangible", prepare: f.prepare,
    execute: async () => ({ rolled: true, message: { id: "attack" } }) });
  const saved = JSON.stringify(result.snapshot); assert.equal(result.spent, 1); assert.equal(f.state().weapons[0].totalAmmo, 9);
  await f.service.inventoryTransaction("weapon", "install", { magazineId: "m2" }); assert.equal(f.state().weapons[0].totalAmmo, 9);
  const source = { id: "attack", visible: true, isContentVisible: true, flags: { "olegurps-qol": { shotSnapshot: JSON.parse(saved) } } };
  const damage = { visible: true, isContentVisible: true, flags: { "olegurps-qol": { damageLink: { status: "linked", originatingAttackMessageId: "attack", attackId: "frangible" } } } };
  const runtime = { game: { messages: new Map([["attack", source]]), i18n: { lang: "ru" } } };
  for (let i = 0; i < 2; i++) {
    const link = resolveDamageShotLink(damage, runtime); assert.equal(link.shotSnapshot.damage.formula, "2d+2(0.5) pi+");
    assert.equal(link.shotSnapshot.damage.rules.zeroDRTreatedAs, 1); assert.equal(link.shotSnapshot.damage.rules.overpenetration.application, "manual-GM");
  }
  for (const lang of ["ru", "en"]) {
    runtime.game.i18n.lang = lang; const notes = shotAmmunitionConditions(source, runtime); assert.equal(notes.length, 2);
    assert.ok(notes.some(note=>/DR\s*1/.test(note))); assert.ok(notes.some(note=>/B408/.test(note)));
    const types = availableAmmoTypes(f.actor, f.state().weapons[0], api, lang);
    assert.equal(types.find(t => t.key === f.type.key).unavailable, false);
    assert.doesNotMatch(ammoManagementHTML(f.state().weapons[0], { ammoKey: f.type.key, language: lang }, types), /data-recipe-editor/);
  }
  source.visible = false; assert.deepEqual(shotAmmunitionConditions(source, runtime), []);
  assert.equal(JSON.stringify(result.snapshot), saved); assert.equal(JSON.stringify(f.actor.system), before);
});
test("Frangible transformation journal prevents repeating numerical or special effects", () => {
  const p = profile(modes.glock, "ht_frangible");
  assert.equal(p.damage.transformations.find(t => t.effectId.endsWith(":overpenetration")).applied, false);
  assert.equal(resolveAmmunitionEffects({ raw: p.raw, variantId: "ht_frangible", baseStatus: "compatible", constructionStatus: "compatible",
    previousTransformations: p.transformations }).nativeSafe, false);
});
test("Frangible conditions belong to native Damage identity copies or permitted references after reload",()=>{
  const p=profile(modes.glock,"ht_frangible");
  const copy={visible:true,isContentVisible:true,flags:{"olegurps-qol":{damageLink:{status:"linked",storage:"identity-copy",shotSnapshot:{damage:p.damage}}}}};
  const runtime={game:{i18n:{lang:"ru"},messages:new Map()}};
  // A damage-only identity copy cannot establish a completed attack's identity.
  for(let i=0;i<2;i++)assert.deepEqual(shotAmmunitionConditions(JSON.parse(JSON.stringify(copy)),runtime),[]);
  const snapshot=createShotSnapshot(p,{attackId:"a",messageId:"attack",spent:1});
  const source={id:"attack",visible:true,isContentVisible:true,flags:{"olegurps-qol":{shotSnapshot:snapshot}}};
  runtime.game.messages.set("attack",source);
  const linked={visible:true,isContentVisible:true,flags:{"olegurps-qol":{damageLink:{status:"linked",originatingAttackMessageId:"attack",attackId:"a"}}}};
  for(let i=0;i<2;i++)assert.equal(shotAmmunitionConditions(JSON.parse(JSON.stringify(linked)),runtime).length,2);
  source.visible=false;assert.deepEqual(shotAmmunitionConditions(linked,runtime),[]);
  copy.isContentVisible=false;assert.deepEqual(shotAmmunitionConditions(copy,runtime),[]);
  const reference={visible:true,isContentVisible:true,flags:{"olegurps-qol":{damageLink:{status:"linked",storage:"reference",originatingAttackMessageId:"hidden",attackId:"a"}}}};
  assert.deepEqual(shotAmmunitionConditions(reference,runtime),[]);
});
