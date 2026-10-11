import test from "node:test";
import assert from "node:assert/strict";
import { modes, context, compatibility, automatic, api, inventoryFixture, resolver } from "./fixtures/ht-special-context.mjs";
import { resolveAmmunitionEffects, scaleRequiredStrength } from "../scripts/tools/ammunition-effects.js";
import { weaponStrengthPenalty } from "../scripts/tools/fire-control-context.js";
import { readAmmunitionApproval, setAmmunitionApproval } from "../scripts/tools/ammunition-approval-service.js";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { evaluateHTOptionEligibility } from "../scripts/ht-option-eligibility.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
test("+P calculation needs no numeric pressure; admission never changes unknown platform safety", () => {
  for (const modeId of [modes.ak, modes.glock, modes.aw]) {
    const c = context(modeId), r = compatibility.checkCompatibility(modeId, "ht_plus_p", { availabilityTL: 9, evidence: { weapon_pressure_rating_verified: true } });
    assert.equal(r.status, "undetermined"); assert.ok(r.reasons.some(r => r.message.includes("weapon_pressure_rating_verified")));
    const p = automatic.prepare({ modeId, base: c.base, variantId: "ht_plus_p" });
    assert.equal(p.state, "complete"); assert.equal(p.rulesStatus, "undetermined"); assert.deepEqual(p.missing, []);
    assert.equal(automatic.admission(p, { policy: "permissive" }).allowed, true);
    assert.equal(automatic.admission(p, { policy: "strict" }).allowed, false);
    assert.equal(automatic.admission(p, { policy: "strict", approval: { active: true } }).allowed, true);
    assert.equal(automatic.admission(p, { policy: "permissive", approval: { active: false } }).allowed, false);
  }
});
test("+P explicit contraindication and Match conflict remain prohibited", () => {
  const r = compatibility.checkCompatibility(modes.glock, "ht_plus_p", { availabilityTL: 8 });
  const facts = structuredClone(r.eligibility.facts);
  facts.evidence.weapon_pressure_rating_verified = { value: false, source: "pressure-rating-fixture" };
  assert.equal(evaluateHTOptionEligibility(api.catalogs.getVariant("ht", "ht_plus_p"), facts).status, "incompatible");
  assert.equal(compatibility.checkCompatibility(modes.aw, "ht_plus_p", { selectedVariantIds: ["ht_match_grade"] }).status, "incompatible");
});
test("+P HT165/166 applies Damage, both ranges, required ST and cost from immutable raw data", () => {
  const raw = { damage: "4d-1 pi+", range: "100/1000", st: "9\u2020", rof: "1", rcl: "3" }, before = JSON.stringify(raw);
  const p = resolveAmmunitionEffects({ raw, variantId: "ht_plus_p", baseStatus: "compatible", constructionStatus: "compatible", facts: { weaponTL: 5 } });
  assert.equal(p.nativeSafe, true); assert.equal(p.support.status, "GM-MEDIATED");
  assert.deepEqual(p.effectiveChanges, { range: "110/1100", st: "10\u2020" });
  assert.equal(p.formula, "4d pi+"); assert.equal(p.rules.costMultiplier, 1.5);
  assert.equal(p.rules.pressure.possibleMalfPenalty, -1); assert.equal(p.rules.pressure.rofChange, null);
  assert.equal(p.transformations.find(t=>t.effectId.endsWith(":Malf")).applied, false); assert.equal(JSON.stringify(raw), before);
  assert.equal(resolveAmmunitionEffects({ raw, variantId: "ht_plus_p", baseStatus: "compatible", constructionStatus: "compatible", previousTransformations:p.transformations }).nativeSafe, false);
});
test("+P required ST rounds to nearest, preserves operating suffixes and uses the shared skill channel", () => {
  for (const [st, expected] of [[9,10],[10,11],[11,12],[15,17]]) {
    for(const suffix of ["","\u2020","\u2021","R","B","M"]) assert.equal(scaleRequiredStrength(st+suffix),expected+suffix);
  }
  assert.equal(scaleRequiredStrength("9/11"), null); assert.equal(scaleRequiredStrength("9 unknown"), null); assert.equal(scaleRequiredStrength(null),null);
  const actor={system:{attributes:{ST:{value:9}}}}, before=JSON.stringify(actor);
  assert.equal(weaponStrengthPenalty({ammunitionRequiredStrength:{value:10,application:"existing-fire-skill-channels"}},actor),-1);
  assert.equal(weaponStrengthPenalty({ammunitionRequiredStrength:{value:12,application:"manual-GM-existing-support-rules"}},actor),0);
  assert.equal(JSON.stringify(actor),before);
});
test("+P missing quality is not cheap; automatic RoF is unresolved, and a loading skill check is not a shot penalty", () => {
  for (const [weaponQuality, expected] of [[undefined, null], ["cheap", -1]]) {
    const p = resolveAmmunitionEffects({ raw: { damage: "4d pi", range: "100/1000", st: "10" }, variantId: "ht_plus_p",
      baseStatus: "compatible", constructionStatus: "compatible", facts: { weaponTL: 8, weaponQuality,
        weaponActions: { values: ["automatic"] }, munitionClasses: { values: ["powder_and_shot"] } } });
    assert.equal(p.rules.pressure.possibleMalfPenalty, expected); assert.equal(p.rules.pressure.rofChange, null);
    assert.equal(p.rules.loadingCheck.perShot, false); assert.equal(p.rules.loadingCheck.application, "manual-GM-before-loading");
    assert.equal(p.nativeSafe, false); assert.equal(p.reason, "plus-p-loading-check-required");
  }
});
test("+P stock, magazine, Hit, history and reload work under permissive admission; unresolved legacy recipe cannot spend", async () => {
  const f = inventoryFixture(modes.glock, "ht_frangible");
  for (const language of ["ru", "en"]) {
    const types = availableAmmoTypes(f.actor, f.state().weapons[0], api, language), p = types.find(t => t.recipe?.variantId === "ht_plus_p");
    assert.equal(p.unavailable, false); assert.equal(p.support, "GM-MEDIATED"); assert.equal(p.status,"undetermined");
    const html = ammoManagementHTML(f.state().weapons[0], { ammoKey: p.key, language }, types);
    assert.doesNotMatch(html, /data-inventory-action="add-stock" disabled/); assert.match(html,/data-plus-p-approval/); assert.doesNotMatch(html, /data-recipe-editor/);
  }
  const type = f.state().weapons[0].ammunitionInventory.stocks[0].type;
  type.recipe = { version: 1, variantId: "ht_plus_p" }; const before = JSON.stringify(f.state());
  await assert.rejects(f.service.executeShot({ weaponId: "weapon", attackId: "blocked", prepare: ({ ammunition }) => ({
    profile: resolver.resolve({ actorId: f.actor.id, weaponId: "weapon", rawAttack: context(modes.glock).raw,
      binding: context(modes.glock).binding, ammunition }), amount: 1 }), execute: () => { throw Error("MustNotRoll"); } }), /IncompleteAmmunitionProfile/);
  assert.equal(JSON.stringify(f.state()), before);
  const ready=inventoryFixture(modes.glock,"ht_plus_p");
  const prepare=({ammunition})=>({profile:resolver.resolve({actorId:"actor",weaponId:"weapon",rawAttack:context(modes.glock).raw,binding:context(modes.glock).binding,ammunition,profilePolicy:"permissive"}),amount:1});
  const result=await ready.service.executeShot({weaponId:"weapon",attackId:"plusP",prepare,execute:async()=>({rolled:true,message:{id:"attack"}})});
  assert.equal(result.spent,1); assert.equal(result.snapshot.profile.damage.formula,"3d-1 pi");
  const history=JSON.stringify(result.snapshot); await ready.service.inventoryTransaction("weapon","install",{magazineId:"m2"});
  assert.equal(ready.state().weapons[0].totalAmmo,9);assert.equal(JSON.stringify(JSON.parse(history)),history);
  assert.equal(JSON.stringify(result.snapshot),history);
});
test("+P GM decisions persist by exact mode/recipe, allow strict use and revoke future shots only", async()=>{
  const f=inventoryFixture(modes.glock,"ht_plus_p"),c=context(modes.glock);let settings={};
  const runtime={game:{user:{isGM:true,id:"gm"},settings:{get:()=>settings,set:async(s,k,v)=>{settings=structuredClone(v);}}},OleGURPSQOL:api};
  const approval=await setAmmunitionApproval({actor:f.actor,weapon:f.state().weapons[0],type:f.type,active:true,plusPDecision:{malfModifier:-1,rof:4}},runtime);
  assert.deepEqual(readAmmunitionApproval({actorId:"actor",weaponId:"weapon",modeId:modes.glock,type:f.type},runtime),approval);
  const shot=resolver.resolve({actorId:"actor",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition:{type:f.type},approval,profilePolicy:"strict"});
  assert.equal(shot.damage.nativeSafe,true);assert.equal(shot.effective.rof,"4");assert.equal(shot.damage.rules.pressure.decision.malfModifier,-1);
  const previous=globalThis.OleGURPSQOL, previousGet=globalThis.game.settings.get;
  globalThis.OleGURPSQOL=api;globalThis.game.settings.get=(scope,key)=>key==='ammunitionApprovals'?settings:'strict';
  try {const preview=withRuntimeAmmoStats({path:'system.ranged.mode',data:c.raw,rof:c.raw.rof},f.actor);
    assert.equal(preview.rof,'4');assert.equal(preview.st,'9');assert.equal(preview.data.range,'176/1980');
  } finally {globalThis.OleGURPSQOL=previous;globalThis.game.settings.get=previousGet;}
  assert.equal(shot.construction.status,"undetermined");const old=JSON.stringify(shot);
  const revoked=await setAmmunitionApproval({actor:f.actor,weapon:f.state().weapons[0],type:f.type,active:false},runtime);
  assert.equal(resolver.resolve({actorId:"actor",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition:{type:f.type},approval:revoked,profilePolicy:"permissive"}).damage.nativeSafe,false);
  assert.equal(JSON.stringify(shot),old);assert.equal(readAmmunitionApproval({actorId:"actor",weaponId:"weapon",modeId:modes.ak,type:f.type},runtime),null);
});
