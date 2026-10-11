import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { automatic, catalogs, compatibility, resolver, context, inventoryFixture } from "./fixtures/ht-special-context.mjs";
import { recipeFingerprint } from "../scripts/tools/ammunition-approval-service.js";
import { htDamageDice, resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { resolveAttackEnvironment, resolveEffectiveRange } from "../scripts/tools/fire-range-service.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { HT_NATIVE_PLUS_P_BASELINES } from "../scripts/ht-native-charge-profiles.js";
import { applyInventoryOperation } from "../scripts/tools/ammo-inventory.js";
import { ammunitionConditionTexts } from "../scripts/tools/damage-shot-link.js";
import { automaticAmmoMessages } from "../scripts/tools/automatic-ammunition-localization.js";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { api } from "./fixtures/ht-special-context.mjs";
const modeId="W10jqOZ0kjeSuoY3C",c=context(modeId),prepared=automatic.prepare({modeId,base:c.base,variantId:"ht_plus_p"});
const approval={active:true,actorId:"actor",weaponId:"weapon",modeId,ammoId:c.base.ammoId,variantId:"ht_plus_p",
  recipeId:prepared.type.recipe.customId,fingerprint:recipeFingerprint(prepared.type)};
const input={actorId:"actor",weaponId:"weapon",rawAttack:{...c.raw,bulk:"-5*"},binding:c.binding,
  ammunition:{type:prepared.type},approval,profilePolicy:"permissive"};
const profile=resolver.resolve(input),capability=profile.environmentCapability;
const environment=(medium="underwater",distance=20,depth=100,range="825/3520")=>resolveAttackEnvironment({capability,
  environment:medium,actualDistance:distance,depthFeet:depth,range});

test("APS exact native imp +P preserves source type, both ranges, ST, cost, RoF, Rcl and folding stock",()=>{
  assert.equal(prepared.state,"complete");assert.equal(prepared.rulesStatus,"undetermined");
  assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.damage.formula,"5d+2 imp");
  assert.equal(profile.effective.range,"825/3520");assert.equal(profile.effective.st,"10\u2020");
  assert.equal(profile.effective.rof,"10");assert.equal(profile.effective.rcl,"3");assert.equal(profile.effective.bulk,"-5*");
  assert.equal(profile.damage.rules.costPerShot,catalogs.getAmmoItem("ht",c.base.ammoId).cost_per_shot_usd*1.5);
  assert.equal(profile.damage.transformations.filter(t=>t.effectId==="ht_plus_p"&&t.applied).length,1);
  assert.equal(profile.damage.rules.nativeProjectile.construction,"underwater_dart");
  assert.equal(profile.damage.components.length,1);
  const base=resolver.resolve({...input,ammunition:{type:c.base},approval:null});
  assert.equal(base.damage.formula,"5d imp");assert.equal(base.effective.range,"750/3,200");assert.equal(base.effective.st,"9\u2020");
  assert.deepEqual(base.environmentCapability,capability);
});
test("APS world policy cannot replace individual manufacture/safety approval; revoke blocks future shots",()=>{
  assert.equal(automatic.admission(prepared,{policy:"permissive"}).allowed,false);
  assert.equal(automatic.admission(prepared,{policy:"strict",approval}).allowed,true);
  assert.equal(resolver.resolve({...input,approval:null}).damage.nativeSafe,false);
  assert.equal(resolver.resolve({...input,approval:{...approval,active:false}}).damage.nativeSafe,false);
  assert.equal(resolver.resolve({...input,approval:{...approval,weaponId:"foreign"}}).damage.nativeSafe,false);
  assert.equal(resolveAmmunitionEffects({raw:c.raw,variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts:prepared.facts}).reason,"plus-p-individual-dart-required");
});
test("APS list explains individual manufacturing/safety approval in RU and EN",()=>{
  const actor={binding:c.binding,system:{ranged:{mode:c.raw}}},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"}};
  for(const lang of["ru","en"]){const type=availableAmmoTypes(actor,weapon,api,lang).find(t=>t.recipe?.variantId==="ht_plus_p");
    assert.equal(type.unavailable,true);assert.equal(type.reason,automaticAmmoMessages[lang]["plus-p-individual-dart-required"]);
  }
});
test("APS uses air x1 and underwater x25 exactly once, never x1000",()=>{
  assert.equal(environment("air").effectiveDistance,20);assert.equal(environment().effectiveDistance,500);
  assert.equal(environment().multiplier,25);assert.equal(environment().actualDistance,20);
  const replay=resolver.resolve({...input,context:{environment:environment()}});
  assert.equal(replay.context.environment.effectiveDistance,500);
  assert.equal(resolver.resolve({...input,context:replay.context}).context.environment.effectiveDistance,500);
});
test("APS validates 130ft depth, unknown depth, air-water transition and exact identity",()=>{
  assert.equal(environment("underwater",20,130).error,null);
  assert.equal(environment("underwater",20,130.01).error,"EnvironmentDepthExceeded");
  assert.equal(environment("underwater",20,"").error,"EnvironmentDepthRequired");
  assert.equal(environment("air-water").error,"EnvironmentTransitionGM");
  assert.equal(environment("air",20,200).error,null);
  assert.equal(resolveAttackEnvironment({capability:{...capability,ammoId:"foreign"},environment:"underwater",actualDistance:20,depthFeet:10,range:"825/3520"}).error,"EnvironmentIdentityRequired");
  assert.equal(resolveAmmunitionEffects({raw:{...c.raw,damage:"5d imp"},variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"gm-approved",facts:{}}).nativeSafe,false);
});
test("APS compares effective distance to half-D and maximum at precise boundaries",()=>{
  assert.equal(environment("underwater",33).beyondHalfDamage,false);
  assert.equal(environment("underwater",33.001).beyondHalfDamage,true);
  assert.equal(environment("underwater",140.8).beyondMaximum,false);
  assert.equal(environment("underwater",140.801).error,"EnvironmentBeyondMaximum");
  assert.equal(environment("air",825).beyondHalfDamage,false);
  assert.equal(environment("air",3520).beyondMaximum,false);
  assert.equal(environment("air",3520.001).error,"EnvironmentBeyondMaximum");
  assert.equal(resolver.resolve({...input,context:{environment:environment("underwater",141)}}).damage.nativeSafe,false);
});
test("shared range selection applies underwater penalty once and leaves ordinary weapons unchanged",()=>{
  const bands=[{index:0,max:20,penalty:-6},{index:1,max:500,penalty:-14},{index:2,max:"500+",penalty:-15}];
  const args={rangeBands:bands,rangeIndex:0,height:0,environmentCapability:capability,attackEnvironment:"underwater",depthFeet:10,weaponRange:"825/3520"};
  const r=resolveEffectiveRange(args);assert.equal(r.environment.actualDistance,20);assert.equal(r.environment.effectiveDistance,500);
  assert.equal(r.effectiveRange.penalty,-14);assert.equal(r.effectiveRange.index,1);
  assert.equal(resolveEffectiveRange({rangeBands:bands,rangeIndex:0}).effectiveRange.penalty,-6);
});
test("environment snapshot retains physical distance separately from existing elevation adjustment",()=>{
  const bands=[{index:0,max:20,penalty:-6},{index:1,max:500,penalty:-14}];
  const r=resolveEffectiveRange({rangeBands:bands,rangeIndex:0,height:10,elevationDirection:"low",
    environmentCapability:capability,attackEnvironment:"underwater",depthFeet:100,weaponRange:"825/3520"});
  assert.equal(r.environment.actualDistance,20);assert.equal(r.environment.effectiveDistance,500);
  assert.equal(r.environment.rangeDistance,750);
  const replay=resolver.resolve({...input,context:{environment:r.environment}});
  assert.equal(replay.context.environment.actualDistance,20);assert.equal(replay.context.environment.rangeDistance,750);
});
test("underwater Malf stays separate from +P and half-D uses the native application control",()=>{
  const env=environment("underwater",40);
  assert.deepEqual(env.manual.find(c=>c.id==="UnderwaterMalf"),{id:"UnderwaterMalf",modifier:-2,application:"manual-GM",source:"HT85",separateFromPlusP:true});
  assert.ok(profile.damage.support.manual.some(c=>c.id==="PlusPReliability"));
  assert.equal(profile.effective.malf,undefined);
  for(const lang of ["ru","en"]){const lines=ammunitionConditionTexts(env.manual,lang);assert.equal(lines.length,2);assert.match(lines[0],/-2/);}
});
test("old shot environment, admission and native Damage remain immutable after settings, magazine and reload",()=>{
  const water=resolver.resolve({...input,context:{environment:environment()}}),shot=createShotSnapshot(water,{attackId:"old",messageId:"attack"}),saved=JSON.stringify(shot);
  resolver.resolve({...input,approval:{...approval,active:false},context:{environment:environment("air")}});
  assert.equal(JSON.stringify(shot),saved);assert.ok(Object.isFrozen(shot.profile.context.environment));
  assert.equal(JSON.parse(saved).profile.damage.formula,"5d+2 imp");assert.equal(JSON.parse(saved).profile.context.environment.effectiveDistance,500);
  assert.equal(JSON.parse(saved).profile.construction.admission.authority,"gm-approved");
});
test("APS actual physical round consumption persists once across repeated attacks and magazine switch",async()=>{
  const f=inventoryFixture(modeId,"ht_plus_p"),prepare=({ammunition})=>({profile:resolver.resolve({...input,ammunition,context:{environment:environment()}}),amount:1});
  const r=await f.service.executeShot({weaponId:"weapon",attackId:"aps",prepare,execute:async()=>({rolled:true,message:{id:"attack"}})});
  assert.equal(r.spent,1);assert.equal(f.state().weapons[0].totalAmmo,9);
  const repeated=await f.service.executeShot({weaponId:"weapon",attackId:"aps",prepare});assert.equal(repeated.duplicate,true);
  assert.equal(f.state().weapons[0].totalAmmo,9);
  const w=f.state().weapons[0];applyInventoryOperation(w,"install",{magazineId:"m2"});
  assert.equal(w.totalAmmo,9);assert.equal(r.snapshot.profile.context.environment.effectiveDistance,500);
});
test("Derringer baseline avoids normalization; HT166 1.0/1.1 confirms discrete edge without house ruling",()=>{
  const d=context("W7i4ZauQl8q2o5nTt");assert.equal(resolveAmmunitionEffects({raw:d.raw}).formula,"1d-3(0.5) pi-");
  assert.equal(htDamageDice(1,-3,1,1),"1d-5");assert.equal(htDamageDice(1,-3,1,1.1),"1d-5");
  assert.equal((3.5-3)*1.1,0.55);assert.equal(d.raw.rof,"2x65");assert.equal(d.raw.rcl,"1");assert.equal(d.raw.acc,null);
  assert.equal(automatic.prepare({modeId:"W7i4ZauQl8q2o5nTt",base:d.base,variantId:"ht_plus_p"}).reasons[0],"plus-p-low-damage-roundtrip-unverified");
  assert.deepEqual([1,2,3,4,5,6].map(n=>Math.max(1,n-3)),[1,1,1,1,2,3]);
  assert.deepEqual([1,2,3,4,5,6].map(n=>Math.max(1,n-5)),[1,1,1,1,1,1]);
});
test("environment reasons and labels have actual RU/EN locale entries",async()=>{
  for(const lang of ["ru","en"]){const locale=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    for(const key of Object.keys(automaticAmmoMessages[lang]).filter(k=>k.startsWith("Environment")||["UnderwaterMalfGM","plus-p-individual-dart-required"].includes(k)))
      assert.equal(locale["OleGURPS.AutomaticAmmo."+key],automaticAmmoMessages[lang][key]);
  }
});
