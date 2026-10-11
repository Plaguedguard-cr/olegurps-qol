import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, context } from "./fixtures/ht-special-context.mjs";
import { reviewedNativePlusPBaseline } from "../scripts/ht-native-charge-profiles.js";
import { htDamageDice, resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { recipeFingerprint } from "../scripts/tools/ammunition-approval-service.js";
import { automaticAmmoMessages } from "../scripts/tools/automatic-ammunition-localization.js";
import { inventoryFixture } from "./fixtures/ht-special-context.mjs";
import { auditPlusPCategoryG } from "../scripts/audits/ht-plus-p-category-g.mjs";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { api } from "./fixtures/ht-special-context.mjs";

const examples = [
  ["W5biN11nvUhQ00ewl","11d(2) pi","2310/9680","18B\u2020"],
  ["WApJkhMAYa4wlXViK","3d-1(2) pi-","187/1870","9"],
  ["WTrwxX4jwWz6xKiPz","3d(2) pi-","198/2090","9\u2020"],
  ["WYmXQkUoq1luUajT-","3d-1(2) pi-","176/1980","10"],
  ["WecVKS0hiwdjXu_uS","3d(2) pi-","187/1980","9\u2020"],
  ["WgOt4XUnNzTOpdiAO","3d+1(2) pi-","440/1870","9\u2020"],
  ["WHsI3V0zdU2TUI6w7","2d+1(0.5) pi++","121/1320","11"]
];
export function preparedG(modeId) { const c=context(modeId);return automatic.prepare({modeId,base:c.base,variantId:"ht_plus_p"}); }
export function profileG(modeId, extra={}) { const c=context(modeId),p=preparedG(modeId);return resolver.resolve({
  actorId:"actor",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},profilePolicy:"permissive",...extra }); }

for(const [modeId,damage,range,st] of examples)test("reviewed native +P preserves exact projectile: "+modeId,()=>{
  const prepared=preparedG(modeId),p=profileG(modeId),ammo=catalogs.getAmmoItem("ht",context(modeId).base.ammoId);
  assert.equal(prepared.state,"complete");assert.equal(prepared.rulesStatus,"undetermined");
  assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,damage);assert.equal(p.effective.range,range);assert.equal(p.effective.st,st);
  assert.equal(p.raw.damage,context(modeId).raw.damage);assert.equal(p.damage.rules.costMultiplier,1.5);
  assert.equal(p.damage.rules.costPerShot,ammo.cost_per_shot_usd*1.5);
  assert.equal(p.damage.rules.nativeProjectile.projectileEffectsIncluded,true);
  assert.equal(p.damage.transformations.filter(t=>t.effectId==="ht_plus_p"&&t.applied).length,1);
  assert.equal(p.damage.transformations.filter(t=>/ht_aphc|ht_hollow_point/.test(t.effectId)&&t.applied).length,0);
  assert.equal(p.damage.rules.nativeProjectile.application,"already-in-native-profile-preserved");
  assert.equal(profileG(modeId,{profilePolicy:"strict"}).damage.nativeSafe,false);
  assert.equal(automatic.admission(prepared,{policy:"strict",approval:{active:true}}).allowed,true);
});

test("native APHC/HP cannot be deduced from divisor or applied a second time",()=>{
  for(const modeId of examples.map(x=>x[0])) {
    const c=context(modeId),p=preparedG(modeId),facts=p.facts;
    const unproven=resolveAmmunitionEffects({raw:c.raw,variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts:{}});
    assert.equal(unproven.nativeSafe,false);assert.equal(unproven.reason,"native-armor-divisor-needs-explicit-provenance");
    for(const variantId of ["ht_ap","ht_aphc","ht_hollow_point"]){
      assert.equal(resolveAmmunitionEffects({raw:c.raw,variantId,baseStatus:"compatible",constructionStatus:"gm-approved",facts}).nativeSafe,false);
    }
    const mode=catalogs.getMode(modeId),ammo=catalogs.getAmmoItem("ht",c.base.ammoId);
    assert.equal(reviewedNativePlusPBaseline({...mode,weapon_mode_id:"unknown"},ammo),null);
    assert.equal(reviewedNativePlusPBaseline(mode,{...ammo,id:"foreign"}),null);
    assert.equal(reviewedNativePlusPBaseline({...mode,raw_calc:{damage:"99d(2) pi"}},ammo),null);
    assert.equal(resolveAmmunitionEffects({raw:c.raw,variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts,
      previousTransformations:[{effectId:"ht_plus_p",applied:true}]}).nativeSafe,false);
    assert.equal(resolveAmmunitionEffects({raw:{...c.raw,followUp:"1d burn"},variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts}).nativeSafe,false);
  }
});

test("native HP keeps zero-DR and optional expansion; AS Val retains suppressor without invented subsonic velocity",()=>{
  const hp=profileG("WHsI3V0zdU2TUI6w7");assert.equal(hp.damage.rules.zeroDRTreatedAs,1);
  assert.ok(hp.damage.support.manual.some(c=>c.id==="ObjectWithoutDR"));assert.ok(hp.damage.support.manual.some(c=>c.id==="NativeHPExpansion"));
  const val=profileG("WgOt4XUnNzTOpdiAO");assert.equal(val.damage.rules.acoustics.plusPVelocity,"undetermined");
  assert.equal(val.damage.rules.hearing,undefined);assert.ok(val.damage.support.manual.some(c=>c.id==="PlusPSubsonicUnverified"));
});

test("shared cartridge FN pistol and P90 preserve independent immutable snapshots after reload",()=>{
  const pistol=profileG("WApJkhMAYa4wlXViK"),p90=profileG("WTrwxX4jwWz6xKiPz");
  assert.equal(pistol.ammunition.ammoId,p90.ammunition.ammoId);assert.notEqual(pistol.damage.formula,p90.damage.formula);
  const shot=createShotSnapshot(pistol,{attackId:"old",messageId:"message"}),saved=JSON.stringify(shot);
  profileG("WTrwxX4jwWz6xKiPz",{profilePolicy:"strict"});
  assert.equal(JSON.stringify(shot),saved);assert.equal(JSON.parse(saved).profile.damage.formula,"3d-1(2) pi-");assert.ok(Object.isFrozen(shot.profile.damage));
});

test("KPV retains APHCI-T through existing charge engine and requires individual GM manufacturing decision",()=>{
  const modeId="WK6cr08HEjTSsvYNS",p=preparedG(modeId),c=context(modeId);
  assert.equal(p.state,"complete");assert.equal(p.rulesStatus,"undetermined");
  assert.equal(automatic.admission(p,{policy:"permissive"}).allowed,false);
  const approval={active:true,actorId:"actor",weaponId:"weapon",modeId,ammoId:p.type.ammoId,
    variantId:"ht_plus_p",recipeId:p.type.recipe.customId,fingerprint:recipeFingerprint(p.type)};
  const resolved=profileG(modeId,{approval});
  assert.equal(resolved.damage.nativeSafe,true);assert.equal(resolved.damage.formula,"6dx3(2) pi inc");
  assert.equal(resolved.effective.range,"2310/9680");assert.equal(resolved.effective.st,"25M");
  assert.deepEqual(resolved.damage.components.map(c=>c.role),["kinetic"]);
  assert.equal(resolved.damage.rules.nativeProjectile.construction,"aphci_tracer");
  assert.equal(resolveAmmunitionEffects({raw:c.raw,variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts:p.facts}).reason,"plus-p-individual-handload-required");
});

test("APS numerical profile is complete but world policy does not confirm individual construction",()=>{
  assert.equal(htDamageDice(5,0,1,1.1),"5d+2");
  const c=context("W10jqOZ0kjeSuoY3C");assert.equal(c.raw.damage,"5d imp");
  const p=preparedG("W10jqOZ0kjeSuoY3C");assert.equal(p.state,"complete");assert.equal(p.rulesStatus,"undetermined");
  assert.equal(automatic.admission(p,{policy:"permissive"}).allowed,false);
  assert.equal(automatic.admission(p,{policy:"strict",approval:{active:true}}).allowed,true);
});

test("Derringer exact HT166 roundtrip fails identity; no fabricated accuracy or altered shot charge",()=>{
  assert.equal(htDamageDice(1,-3,1,1),"1d-5");assert.equal(htDamageDice(1,-3,1,1.1),"1d-5");
  const c=context("W7i4ZauQl8q2o5nTt");assert.equal(c.raw.rof,"2x65");assert.equal(c.raw.acc,null);
  assert.equal(c.raw.damage,"1d-3(0.5) pi-");
  assert.equal(preparedG("W7i4ZauQl8q2o5nTt").reasons[0],"plus-p-low-damage-roundtrip-unverified");
  // Native GGA piercing minimum is 1. Compare all natural die faces, without forced Rolls.
  assert.deepEqual([1,2,3,4,5,6].map(n=>Math.max(1,n-3)),[1,1,1,1,2,3]);
  assert.deepEqual([1,2,3,4,5,6].map(n=>Math.max(1,n-5)),[1,1,1,1,1,1]);
});

test("LeMat shot barrel uses corrected source-backed identity; historical .42 cannot prepare +P",()=>{
  const modeId="WdzSSShGT_yv4ctOi",c=context(modeId);assert.equal(c.base.ammoId,"olegurps_lemat_18g_shot_charge");
  assert.equal(c.raw.rof,"1x11");assert.equal(preparedG(modeId).state,"complete");
  assert.equal(automatic.prepare({modeId,base:{...c.base,ammoId:"ht_42_caplock_lemat"},variantId:"ht_plus_p"}).state,"incompatible");
  assert.equal(automatic.admission(preparedG(modeId),{policy:"permissive"}).allowed,false);
  assert.equal(htDamageDice(1,0,1,1.1),"1d");
  assert.equal(catalogs.getCatalog("ht").ammo_items.some(a=>/18\s*gauge/i.test(a.name)),false);
});

test("new G diagnostics resolve in RU and EN locale files",async()=>{
  for(const lang of ["ru","en"]){const locale=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    for(const key of ["NativeHPExpansionGM","PlusPSubsonicUnverifiedGM","plus-p-underwater-mechanic-unimplemented","plus-p-low-damage-roundtrip-unverified","plus-p-18g-identity-unconfirmed","plus-p-individual-handload-required"])
      assert.equal(locale["OleGURPS.AutomaticAmmo."+key],automaticAmmoMessages[lang][key]);
  }
});

test("native G shot consumes one physical round once; changing magazine preserves old shot",async()=>{
  const f=inventoryFixture("WApJkhMAYa4wlXViK","ht_plus_p");
  const c=context("WApJkhMAYa4wlXViK"),prepare=({ammunition})=>({profile:resolver.resolve({actorId:"actor",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition,profilePolicy:"permissive"}),amount:1});
  const result=await f.service.executeShot({weaponId:"weapon",attackId:"native-g-shot",prepare,execute:async()=>({rolled:true,message:{id:"attack"}})});
  assert.equal(result.spent,1);
  const saved=JSON.stringify(result.shotSnapshot ?? result.profile);
  const repeat=await f.service.executeShot({weaponId:"weapon",attackId:"native-g-shot",prepare});
  assert.equal(repeat.duplicate,true);assert.equal(f.state().weapons[0].totalAmmo,9);
  assert.equal(JSON.stringify(result.shotSnapshot ?? result.profile),saved);
});

test("511 recount preserves existing 363, all 27 confirmations and closed E/F; historical G boundary is exact",async()=>{
  const historical=JSON.parse(await fs.readFile(new URL("../docs/audit/ht-plus-p-blockers.json",import.meta.url),"utf8"));
  const before=JSON.parse(await fs.readFile(new URL("../docs/audit/ht-12g-case-correction.json",import.meta.url),"utf8"));
  const result=auditPlusPCategoryG({catalogs,compatibility,historical,before});
  assert.equal(result.examined,511);assert.equal(result.rows.length,11);assert.equal(result.previousWorldReady,363);
  assert.equal(result.existingReadyPreserved,true);assert.equal(result.existing27LoadingConfirmationsPreserved,true);
  assert.equal(result.excludedEFStillClosed,true);assert.equal(result.numericalG,10);assert.equal(result.nativeGGAReadyAfterGM,10);
  assert.equal(result.worldPolicyReady,370);assert.equal(result.loadingGMRequired,27);assert.equal(result.individualGMG,3);
  assert.equal(result.potentialAfterAllRequiredGMDecisions,400);assert.equal(result.incompleteG,1);
  assert.deepEqual(result.officialStatuses,{undetermined:511});
});

test("restricted special G exposes precise RU/EN reason without admitting stock or an approved bypass",()=>{
  for(const modeId of ["W7i4ZauQl8q2o5nTt"]){
    const c=context(modeId),actor={binding:c.binding,system:{ranged:{mode:c.raw}}},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"}};
    const p=preparedG(modeId);assert.equal(automatic.admission(p,{policy:"permissive",approval:{active:true}}).allowed,false);
    for(const lang of ["ru","en"]){const type=availableAmmoTypes(actor,weapon,api,lang).find(t=>t.recipe?.variantId==="ht_plus_p");
      assert.equal(type.unavailable,true);assert.equal(type.reason,automaticAmmoMessages[lang][p.reasons[0]]);
    }
  }
});
