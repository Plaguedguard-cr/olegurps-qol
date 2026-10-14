import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import { moduleText as russianText } from "../scripts/localization.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { catalogs, compatibility, automatic, resolver, context, api } from "./fixtures/ht-special-context.mjs";
import { reviewedShotshellConstruction } from "../scripts/ht-shotshell-source-data.js";
import { availableAmmoTypes } from "../scripts/tools/ammo-management-app.js";
import { ammoDisplayName, ammoText } from "../scripts/tools/ammo-management-localization.js";
import { ammoTypeKey, applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { parseRecoil, resolveMultipleProjectileFire } from "../scripts/tools/fire-service.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { resolveHTCatalogFacts } from "../scripts/ht-option-eligibility.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { assertWeaponPreservation, restoreHaflaErrata } from "./fixtures/ht-preservation-contract.mjs";

const lightId = "ht_12_gauge_2_75_18_5x70mmr", conventionalId = lightId + "_heavy_load";
const historical = readAuditFixture('ht-plus-p-category-b');
const rows = historical.rows.filter(row => row.ammoId === conventionalId);
const base = ammoId => ({ source: "catalog", book: "ht", kind: "ammo-item", ammoId, name: catalogs.getAmmoItem("ht", ammoId).name });
const prepare = (modeId, ammoId = conventionalId) => automatic.prepare({ modeId, base: base(ammoId), variantId: "ht_plus_p" });
const input = (modeId, type, extra = {}) => { const c = context(modeId); return { actorId: "actor", weaponId: "weapon", rawAttack: c.raw,
  binding: c.binding, ammunition: { type }, profilePolicy: "permissive", ...extra }; };

test("HT176-177 confirmed case constructions retain exact source rows, IDs, WPS/CPS and footnotes", () => {
  for (const [id, index, weight, cost, notes, kind] of [[lightId,159,.11,.5,[3,4],"light_cased"], [conventionalId,160,.13,.7,[4],"conventional_cased"]]) {
    const record = catalogs.getAmmoItem("ht", id), reviewed = reviewedShotshellConstruction(record);
    assert.equal(record.id,id); assert.equal(record.gcs_index,index); assert.equal(record.weight_per_shot_lb,weight); assert.equal(record.cost_per_shot_usd,cost);
    assert.deepEqual(reviewed.footnotes,notes); assert.equal(reviewed.caseConstruction,kind); assert.equal(reviewed.baselinePlusP,false);
    assert.match(reviewed.source,/HT176-177/); assert.equal(reviewedShotshellConstruction({...record,weight_per_shot_lb:1}),null);
  }
});

for (const row of rows) test("conventional-case +P: " + row.modeId + " " + row.name, () => {
  const p = prepare(row.modeId), resolved = resolver.resolve(input(row.modeId,p.type));
  assert.equal(p.state,"complete"); assert.equal(p.rulesStatus,"undetermined"); assert.equal(p.facts.caseConstruction.caseConstruction,"conventional_cased");
  assert.equal(p.facts.plusPBaselineUnresolved,undefined); assert.equal(resolved.damage.nativeSafe,true);
  const expected = resolveAmmunitionEffects({raw:context(row.modeId).raw,variantId:"ht_plus_p",baseStatus:"compatible",constructionStatus:"world-policy",facts:p.facts});
  assert.equal(resolved.damage.formula,expected.formula); assert.equal(resolved.effective.range,expected.effectiveChanges.range);
  assert.equal(resolved.effective.st,expected.effectiveChanges.st); assert.equal(resolved.raw.damage,row.raw.damage);
  assert.ok(Math.abs(resolved.damage.rules.costPerShot-1.05)<1e-12); assert.equal(resolved.damage.rules.costMultiplier,1.5);
  assert.equal(resolved.damage.rules.pressure.application,"manual-GM");
  assert.equal(resolved.effective.rof,row.raw.rof); assert.equal(resolved.effective.rcl,row.raw.rcl);
  assert.equal(resolver.resolve(input(row.modeId,p.type,{profilePolicy:"strict"})).damage.nativeSafe,false);
  assert.equal(automatic.admission(p,{policy:"strict",approval:{active:true}}).allowed,true);
  assert.equal(automatic.admission(p,{policy:"permissive",approval:{active:false}}).allowed,false);
  const c=context(row.modeId), actor={id:"actor",system:{ranged:{mode:c.raw}},binding:c.binding};
  const types=availableAmmoTypes(actor,{id:"weapon",attackRef:{path:"system.ranged.mode"}},api,"ru");
  const option=types.find(type=>type.ammoId===conventionalId&&type.recipe?.variantId==="ht_plus_p");
  assert.equal(option.unavailable,false); assert.match(option.label,/обычная гильза.*\+P/); assert.match(option.name,/обычная гильза.*\+P/);
});

test("Winchester takes exact native fields once; cases retain mass and independent base costs", () => {
  for(const [id,cost] of [[lightId,.75],[conventionalId,1.05]]) {
    const p=prepare("W19ooSM10ivSwlXSP",id),r=resolver.resolve(input("W19ooSM10ivSwlXSP",p.type));
    assert.equal(r.raw.damage,"1d+1 pi"); assert.equal(r.damage.formula,"1d+1 pi"); assert.equal(r.effective.range,"44/880"); assert.equal(r.effective.st,"12\u2020");
    assert.ok(Math.abs(r.damage.rules.costPerShot-cost)<1e-12);
    assert.deepEqual(p.facts.nativeEffects,{}); assert.equal(automatic.prepare({modeId:"W19ooSM10ivSwlXSP",base:base(id),variantId:"ht_plus_p",savedType:JSON.parse(JSON.stringify(p.type))}).state,"complete");
  }
});

test("Condor shot and slug preserve distinct original damage, Rcl and projectile counts", () => {
  for(const [modeId,kind,damage,rcl,count] of [["Wx10NaVSr1cp1bwKv","shot","1d pi",1,9],["WkzlenFdgtlwesK-q","slug","4d+1 pi+",10,1]]) {
    const p=resolver.resolve(input(modeId,prepare(modeId).type));
    assert.equal(p.damage.formula,damage); assert.equal(p.effective.ammunitionProjectileKind,kind);
    assert.equal(parseRecoil(p.effective.rcl,{projectileKind:kind}),rcl);
    const f=resolveMultipleProjectileFire({rof:p.effective.rof,physicalShots:1,physicalDistance:20,halfDamageRange:40});
    assert.equal(f.projectilesPerShot,count); assert.equal(f.effectiveRoF,count);
    assert.equal(compatibility.checkCompatibility(modeId,"ht_rifled_slug",{book:"ht",kind:"projectile-option",ammoItemId:conventionalId}).status,"undetermined");
  }
});

test("M26 and Masterkey numeric native profiles do not fabricate autonomous Bulk", () => {
  for(const row of rows.filter(row=>row.standaloneOnly.length)) {
    assert.deepEqual(row.standaloneOnly,["Bulk"]); assert.equal(row.raw.bulk,null);
    const p=resolver.resolve(input(row.modeId,prepare(row.modeId).type));assert.equal(p.damage.nativeSafe,true);
    assert.equal(p.effective.bulk,undefined);assert.equal(catalogs.getMode(row.modeId).stats.bulk,null);
  }
});

test("both case labels localize without changing keys, saved names or recipes", async () => {
  for(const language of ["ru","en"]) {
    const data=JSON.parse(await fs.readFile(new URL("../lang/"+language+".json",import.meta.url),"utf8"));
    for(const [id,key] of [[lightId,"LightCased12G"],[conventionalId,"ConventionalCased12G"]]) {
      const type=base(id),saved=JSON.stringify(type),identity=ammoTypeKey(type);
      assert.equal(ammoDisplayName(type,language),russianText("OleGURPS.Ammo."+key));
      assert.equal(ammoText(key,{game:{i18n:{lang:language,localize:k=>data[k]??k}}}),russianText("OleGURPS.Ammo."+key));
      assert.equal(typeof data["OleGURPS.Ammo."+key],"string");
      assert.equal(ammoTypeKey(type),identity); assert.equal(JSON.stringify(type),saved);
    }
  }
});

test("independent legacy ledgers, old recipes and snapshot survive switch, reload and GM revocation without repeat spend", async () => {
  const modeId="W19ooSM10ivSwlXSP",p=prepare(modeId),light=prepare(modeId,lightId).type;
  const weapon={id:"weapon",ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}},types=[p.type,light,base(conventionalId),base(lightId)].map(type=>({...type,key:ammoTypeKey(type)}));
  for(const type of types)applyInventoryOperation(weapon,"add-stock",{ammoKey:type.key,amount:8},{allowedTypes:types});
  let n=0;applyInventoryOperation(weapon,"add-magazines",{capacity:5,amount:2},{makeId:()=>"m"+(++n)});
  applyInventoryOperation(weapon,"load",{magazineId:"m1",ammoKey:p.type.key,amount:4},{allowedTypes:types});
  applyInventoryOperation(weapon,"load",{magazineId:"m2",ammoKey:light.key,amount:3},{allowedTypes:types});
  applyInventoryOperation(weapon,"install",{magazineId:"m1"});projectAmmoInventory(weapon);
  let state={weapons:[weapon]};const system={ranged:{mode:context(modeId).raw}},originalSystem=JSON.stringify(system);
  const actor={id:"actor",isOwner:true,system,getFlag:()=>state,setFlag:async(s,k,v)=>{state=structuredClone(v);}};
  const service=new AmmoService(actor),legacyRecipes=JSON.stringify(state.weapons[0].ammunitionInventory.stocks.map(s=>s.type.recipe));
  const result=await service.executeShot({weaponId:"weapon",attackId:"old",prepare:({ammunition})=>({profile:resolver.resolve({...input(modeId,p.type),ammunition}),amount:2}),execute:async()=>({rolled:true,message:{id:"old"}})});
  assert.equal(result.spent,2);assert.equal(state.weapons[0].totalAmmo,30);
  const snapshot=JSON.stringify(result.snapshot);
  await service.inventoryTransaction("weapon","install",{magazineId:"m2"});assert.equal(state.weapons[0].totalAmmo,30);
  state=JSON.parse(JSON.stringify(state));const restored=JSON.parse(snapshot);
  for(const language of ["ru","en"])ammoDisplayName(restored.profile.ammunition,language);
  assert.equal(resolver.resolve(input(modeId,p.type,{profilePolicy:"strict"})).damage.nativeSafe,false);
  assert.equal(JSON.stringify(restored),snapshot);assert.equal(JSON.stringify(result.snapshot),snapshot);
  assert.equal(createShotSnapshot(result.profile,{attackId:"separate"}).profile.damage.formula,"1d+1 pi");
  for(let i=0;i<2;i++)assert.equal(restored.profile.damage.formula,"1d+1 pi");
  assert.equal(state.weapons[0].totalAmmo,30);assert.equal(JSON.stringify(state.weapons[0].ammunitionInventory.stocks.map(s=>s.type.recipe)),legacyRecipes);
  await service.inventoryTransaction("weapon","delete-magazine",{magazineId:"m1"});assert.equal(state.weapons[0].totalAmmo,30);
  assert.equal(state.weapons[0].ammunitionInventory.stocks.find(s=>s.key===p.type.key).rounds,6);
  assert.equal(state.weapons[0].ammunitionInventory.stocks.find(s=>s.key===light.key).rounds,5);
  assert.equal(JSON.stringify(actor.system),originalSystem);
});

test("unverified source row refuses the correction rather than interpreting the heavy legacy name", () => {
  const original=catalogs.getAmmoItem.bind(catalogs), altered=Object.create(catalogs);
  altered.getAmmoItem=(book,id)=>id===conventionalId?{...original(book,id),gcs_index:999}:original(book,id);
  // The semantic review itself fails closed; no physical pressure/weight inference is introduced.
  assert.equal(reviewedShotshellConstruction(altered.getAmmoItem("ht",conventionalId)),null);
  assert.equal(reviewedShotshellConstruction({...original("ht",lightId),id:"unknown_heavy_load"}),null);
  const facts=resolveHTCatalogFacts({mode:catalogs.getMode("W19ooSM10ivSwlXSP"),ammo:altered.getAmmoItem("ht",conventionalId),catalogs,
    selectedVariants:[catalogs.getVariant("ht","ht_plus_p")]});
  assert.equal(facts.plusPBaselineUnresolved,true);assert.equal(facts.caseConstruction,undefined);
  const checked=new AutomaticAmmunitionProfileService({catalogs,compatibility:{checkCompatibility:(...args)=>{
    const r=structuredClone(compatibility.checkCompatibility(...args));if(args[1]==="ht_plus_p")r.eligibility.facts=facts;return r;
  }}});
  const result=checked.prepare({modeId:"W19ooSM10ivSwlXSP",base:base(conventionalId),variantId:"ht_plus_p"});
  assert.equal(result.state,"incomplete");assert.deepEqual(result.reasons,["plus-p-case-construction-unverified"]);
});

test("unchanged source catalogs and historical audits retain exact byte hashes", async () => {
  const expected={
    "data/catalogs/olegurps_weapon_reference_catalog_v5_6.json":"6d9aabb0292efbe25d3f302e682eb8120b5fe385788f07ef8d3c8acc0ba6f4d0",
    "data/catalogs/olegurps_ht_ammunition_catalog_v1_3.json":"435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385",
    "docs/audit/ht-plus-p-blockers.json":"28b6dc691d3245ff44afe72a0bf07a838e4ffd545bbbcc5c1ca19edd0b2f7d7b",
    "docs/audit/ht-plus-p-category-b.json":"895adcb0ebf81ddfd4f2e3d73931d316bc412ac40a97c27da0118e684f40eb23"
  };
  for(const [file,hash]of Object.entries(expected)) {
    if (file.startsWith('docs/')) { assertHistoricalAudit(file,hash); continue; }
    let bytes = await fs.readFile(new URL("../"+file,import.meta.url));
    if (file === "data/catalogs/olegurps_weapon_reference_catalog_v5_6.json") {
      const proof = readAuditFixture('ht-v1-3-preservation');
      assertWeaponPreservation(bytes.toString("utf8"), proof); // Current bytes: only approved FN BAR and HAFLA errata.
      bytes = restoreHaflaErrata(bytes.toString("utf8"), proof); // Keep the original 12G-era byte baseline too.
    }
    assert.equal(createHash("sha256").update(bytes).digest("hex"),hash);
  }
  assert.equal(rows.length,21);assert.ok(rows.every(r=>r.reason==="plus-p-heavy-load-baseline-unresolved"));
});
