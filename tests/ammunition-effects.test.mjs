import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { AttackProfileResolver, createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { resolveAmmunitionEffects, htDamageDice } from "../scripts/tools/ammunition-effects.js";
import { ammoTypeKey, applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { diagnoseGgaDamageAdapters, warnGgaDamageCompatibility, ammoEffectText, loadAmmoEffectTranslations } from "../scripts/tools/gga-damage-compatibility.js";
globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
const { availableAmmoTypes, ammoManagementHTML } = await import("../scripts/tools/ammo-management-app.js");
const catalogs = new CatalogService({ logger: null, fetcher: async url => {
  const def = Object.values(CATALOG_DEFINITIONS).find(d => url.endsWith(d.filename));
  return { ok: true, json: async () => JSON.parse(await fs.readFile(new URL("../data/catalogs/" + def.filename, import.meta.url), "utf8")) };
} });
await catalogs.load();
const compatibility = new AmmunitionCompatibilityService(catalogs), modeId = "W27s4Lm8QlkKVKUPn";
const binding = { status: "confirmed", binding: { confirmed: true, modeId } };
const raw = { name: "AK-47", mode: "Rifle", damage: "5d+1 pi", uuid: "mode", level: 13 };
const isolatedEffects = options => resolveAmmunitionEffects({ baseStatus:"compatible",constructionStatus:"compatible",...options });
const resolver = new AttackProfileResolver({ catalogs, compatibility });
const type = variantId => { const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: "ht_7_62x39mm", name: "7.62x39mm",
  ...(variantId ? { recipe: { version: 1, variantId } } : {}) }; return { ...type, key: ammoTypeKey(type) }; };
const profile = (variantId, attack = raw, extra = {}) => resolver.resolve({ actorId: "actor", weaponId: "weapon", attack,
  rawAttack: attack, binding, ammunition: { kind: "physical-magazine", magazineId: "mag", ammoKey: type(variantId).key,
    type: type(variantId), available: 20, total: 50 }, ...extra });
for (const [variant, expected] of [[null, "5d+1 pi"], ["ht_ap", "4d-1(2) pi-"], ["ht_aphc", "5d+1(2) pi-"],
  ["ht_hollow_point", "5d+1(0.5) pi+"]]) test("AK47 control " + (variant ?? "ordinary"), () => {
  const p = profile(variant); assert.equal(p.effective.damage, expected); assert.equal(p.damage.formula, expected);
  assert.equal(p.damage.nativeSafe, true); assert.equal(p.compatibility.status, "compatible");
  assert.equal(p.construction.status, "compatible"); assert.equal(p.raw.damage, "5d+1 pi");
  assert.ok(Object.isFrozen(p)); assert.ok(Object.isFrozen(p.damage));
});
test("reviewed class rules authorize an exact family; caliber/caller claims cannot change the cartridge", () => {
  const p = profile("ht_ap", raw, { ammunition: { type: { ...type("ht_ap"), ammoId: "ht_357_magnum_9x33mmr" } } });
  assert.notEqual(p.damage.status, "resolved"); assert.equal(p.effective.damage, raw.damage);
  const result = compatibility.checkCompatibility("W1FMPB_-58qp_bH-M", "ht_aphc", { availabilityTL: 8, evidence: { hardcore_penetrator_construction_available: true } });
  assert.equal(result.status, "compatible");
  const unsupported = compatibility.checkCompatibility("W1FMPB_-58qp_bH-M", "ht_apds", { availabilityTL: 8, evidence: { apds_round_for_this_chamber_confirmed: true } });
  assert.equal(unsupported.status, "undetermined");
});
test("AK47 explosive constructions remain unavailable with independent compatibility and missing source facts", () => {
  for (const id of ["ht_apex", "ht_aphex"]) { const p = profile(id);
    assert.equal(p.compatibility.status, "incompatible" === p.construction.status ? "incompatible" : "compatible");
    assert.notEqual(p.construction.status, "compatible"); assert.equal(p.effective.damage, raw.damage);
    assert.equal(p.damage.nativeSafe, false);
  }
});
for (const [id, expected] of [["ht_apex", "4d-1(2) pi-"], ["ht_aphex", "5d+1(2) pi-"]]) test("isolated explosive model " + id, () => {
  const r = isolatedEffects({ raw, variantId: id, facts: { caliberMm: 7.62 } });
  assert.equal(r.formula, expected); assert.equal(r.components[0].role, "kinetic");
  assert.equal(r.components[1].role, "follow-up"); assert.equal(r.components[1].internalOnPenetration, true);
  assert.equal(r.components[1].status, "unresolved"); assert.equal(r.components[1].formula, null);
  assert.equal(r.components[2].role, "fragmentation"); assert.equal(r.components[2].formula, null);
  assert.equal(r.nativeSafe, false); assert.equal(r.reason, "published-explosion-and-fragmentation-missing");
  assert.equal(r.components.some(c => c.role === "incendiary"), id === "ht_aphex");
});
test("known secondary formulas still require a conditional native adapter, never Linked or automatic hits", () => {
  const r = isolatedEffects({ raw, variantId: "ht_aphex", facts: { caliberMm: 25 },
    secondary: { source: "isolated published fixture", explosion: "2d cr ex", fragmentation: "1d cut" } });
  assert.equal(r.reason, "native-follow-up-adapter-unavailable"); assert.equal(r.nativeSafe, false);
  assert.equal(r.components[1].formula, "2d cr ex"); assert.equal(r.components[1].requires, "resolve-carrier-penetration-then-B414-B415-explosion");
});
test("HT166 bands including adds, fractions, negative adds, multiplier, >12d and exact boundaries", () => {
  for (const [n, expected] of [[0.2,"1d-5"],[0.33,"1d-4"],[0.43,"1d-3"],[0.57,"1d-2"],[0.76,"1d-1"],[0.96,"1d"],
    [3.14,"3d"],[3.15,"3d+1"],[3.43,"3d+2"],[3.65,"4d-1"],[3.86,"4d"],[12,"12d"],[13,"6dx2"],[21,"6dx4"]])
    assert.equal(htDamageDice(n), expected, String(n));
  assert.equal(htDamageDice(5,1,1,0.7), "4d-1"); assert.equal(htDamageDice(3,-1,1,0.7), "2d");
  assert.equal(htDamageDice(6,2,1,1.5), "10d"); assert.equal(htDamageDice(6,0,5,0.7), "6dx4");
});
test("existing divisor and compound/native components cannot be silently transformed again", () => {
  for (const damage of ["5d+1(2) pi-", "5d+1(3) pi", "5d+1 pi, 2d cr ex", "5d+1 pi [1d cut]", "sw+1 pi"])
    assert.equal(profile("ht_ap", { ...raw, damage }).damage.nativeSafe, false, damage);
  for (const field of ["linked", "followUp", "followup", "components", "ammunitionEffects"])
    assert.equal(profile("ht_ap", { ...raw, [field]: ["existing"] }).damage.nativeSafe, false);
  assert.equal(isolatedEffects({raw,variantId:"ht_ap",facts:{caliberMm:7.62,nativeEffects:{"native-linked":true}}}).reason,"native-components-or-effects-already-present");
});
test("journal proves ordering/source/reason; duplicate application is rejected", () => {
  const p = profile("ht_ap"); assert.deepEqual(p.transformations.map(t => t.order), [1,2,3,4]);
  for (const entry of p.transformations) assert.ok(entry.source && entry.effectId && entry.reason && "from" in entry && "to" in entry);
  const r = isolatedEffects({ raw: p.effective, variantId: "ht_ap", facts: { caliberMm: 7.62 }, previousTransformations: p.transformations });
  assert.equal(r.reason, "already-applied-use-original-profile"); assert.equal(r.formula, p.effective.damage);
  const overridden=profile("ht_ap",raw,{state:{attackOverrides:{"uuid:mode":{skillLevel:14,rof:"10",acc:4,scopeBonus:0,rcl:"2",bulk:-5}}}});
  assert.deepEqual(overridden.transformations.map(t=>t.order),[1,2,3,4,5,6,7,8,9,10]);
  for(const entry of overridden.transformations)assert.ok(entry.effectId&&entry.reason);
});
test("HP caps pi++, preserves dice/modifiers and delegates DR0 rule; conditional Malf/expansion never silently skipped", () => {
  const p = profile("ht_hollow_point", { ...raw, damage: "5d-1+2! pi++" });
  assert.equal(p.damage.formula, "5d-1+2(0.5)! pi++"); assert.equal(p.damage.rules.zeroDRTreatedAs, 1);
  for (const facts of [{ caliberMm: 7.62, muzzleVelocityFps: 900, availabilityTL: 8 },
    { caliberMm: 7.62, muzzleVelocityFps: 2400, availabilityTL: 7, weaponActions: { values: ["automatic"] } }])
    assert.equal(isolatedEffects({ raw, variantId: "ht_hollow_point", facts }).reason, "HP-conditional-rule-requires-native-support");
});
test("invalid/stacked recipes and unconfirmed bindings stay raw", () => {
  assert.equal(resolveAmmunitionEffects({raw,variantId:"ht_ap",facts:{caliberMm:7.62}}).reason,"unconfirmed-compatibility");
  const t = type("ht_ap"); t.recipe.variantIds = ["ht_ap", "ht_aphc"];
  assert.equal(profile("ht_ap", raw, { ammunition: { type: t } }).compatibility.status, "incompatible");
  t.recipe.variantIds=["ht_aphc"];
  assert.equal(profile("ht_ap", raw, { ammunition: { type: t } }).compatibility.status, "incompatible");
  assert.equal(profile("ht_ap", raw, { binding: { status: "undetermined" } }).effective.damage, raw.damage);
});
test("normal load window exposes separate AP/APHC/HP stocks and blocks incomplete APEX/APHEX loading in RU/EN", () => {
  const api = { catalogs, ammunitionCompatibility: compatibility, weaponCatalogBindings: { analyzeMode: () => binding } };
  // Explicitly remove the approved library to exercise genuinely missing inputs.
  api.automaticAmmunitionProfiles = new resolver.automaticProfiles.constructor({catalogs,compatibility,library:[]});
  const weapon = { id: "weapon", name: "AK", attackRef: { path: "system.ranged.0" }, totalAmmo: 0,
    ammunitionInventory: { version: 1, installedId: null, stocks: [], magazines: [] } };
  for (const lang of ["ru", "en"]) {
    const types = availableAmmoTypes({}, weapon, api, lang);
    const playable = types.filter(t => !t.unavailable);
    assert.equal(playable.length, 7); assert.equal(new Set(playable.map(t => t.key)).size, 7);
    assert.equal(types.find(t=>t.recipe?.variantId === "ht_plus_p").unavailable,true); // Fixture has no numeric weapon ST.
    assert.ok(playable.some(t => t.recipe?.variantId === "ht_subsonic_rifle"));
    assert.ok(playable.some(t => t.recipe?.variantId === "ht_sapfsds"));
    for (const id of ["ht_apex", "ht_aphex"]) {
      const type = types.find(t => t.recipe?.variantId === id); assert.ok(type.unavailable); assert.equal(type.status, "incompatible" === type.status ? "incompatible" : "undetermined");
      const html = ammoManagementHTML(weapon, { language: lang, ammoKey: type.key }, types);
      assert.doesNotMatch(html, new RegExp('value="' + type.key + '"[^>]*disabled'));
      assert.match(html, /data-inventory-action="add-stock" disabled/);
      assert.match(html, /Профиль не подготовлен/);
      assert.equal(type.preparation.rulesStatus, type.status);
      assert.ok(type.preparation.missing.includes("explosiveMassG"));
    }
    for (const type of playable) applyInventoryOperation(weapon, "add-stock", { ammoKey: type.key, amount: 12 }, { allowedTypes: types });
    for (const type of types.filter(t => t.unavailable)) assert.throws(() => applyInventoryOperation(weapon, "add-stock", { ammoKey: type.key, amount: 1 }, { allowedTypes: types }), /TypeUnavailable/);
  }
});
test("physical recipe magazines keep separate ledgers; switching and deleting never destroy/swap types", () => {
  const types = [type(),type("ht_ap"),type("ht_aphc"),type("ht_hollow_point")];
  const weapon = { id: "weapon", ammunitionInventory: { version:1, installedId:"m0", stocks: types.map(t=>({key:t.key,type:t,rounds:10})),
    magazines: types.map((t,i)=>({id:"m"+i,weaponId:"weapon",capacity:30,rounds:20,ammoKey:t.key})) } };
  projectAmmoInventory(weapon); const before = JSON.stringify(weapon.ammunitionInventory.stocks);
  applyInventoryOperation(weapon,"install",{magazineId:"m2"}); assert.equal(JSON.stringify(weapon.ammunitionInventory.stocks),before);
  const snapshot = createShotSnapshot(profile("ht_aphc"), {attackId:"A"});
  applyInventoryOperation(weapon,"consume",{magazineId:"m2",amount:3}); assert.equal(weapon.ammunitionInventory.magazines[2].rounds,17);
  assert.equal(snapshot.profile.damage.formula,"5d+1(2) pi-");
  applyInventoryOperation(weapon,"delete-magazine",{magazineId:"m2"}); assert.equal(weapon.ammunitionInventory.stocks[2].rounds,27);
});
function nativeContracts() {
  class DamageChat { static create(actor,dice,type,event) {} _createChatMessage(actor,dice,mods,payload,event) {} _getDiceData(dice,type,mods) {} }
  return { GURPS: { performAction(action,actor) {},resolveDamageRoll(event,actor,otf) {},DamageChat,
    actionFuncs: { attackdamage(context) {},damage(context) {} },parselink(text) { return {action:{type:"damage",formula:"4d-1(2)",damagetype:"pi-"}}; } },
    ChatMessage:{create(data){},getSpeakerActor(speaker){}},Hooks:{on(name,fn){},off(name,id){}},
    game:{user:{isGM:true},i18n:{lang:"ru",localize:k=>k}}, ui:{notifications:{warn(text){}}} };
}
test("GGA contract diagnostics pass present API and refuse missing or changed signatures/results without rolling", () => {
  assert.equal(diagnoseGgaDamageAdapters(nativeContracts()).compatible,true);
  const foundry14=nativeContracts();foundry14.ChatMessage.create=function create(data={},operation={}){};
  assert.equal(diagnoseGgaDamageAdapters(foundry14).compatible,true);
  for (const [owner,key] of [["GURPS","performAction"],["GURPS","resolveDamageRoll"],["ChatMessage","create"],["Hooks","on"]])
    for (const replacement of [null,()=>{}]) { const r=nativeContracts();r[owner][key]=replacement;assert.equal(diagnoseGgaDamageAdapters(r).compatible,false); }
  const r=nativeContracts();r.GURPS.parselink= text=>({action:{type:"roll",formula:"4d"}});
  assert.ok(diagnoseGgaDamageAdapters(r).problems.includes("GURPS.parselink damage result"));
});
test("one understandable GM diagnostic per session; localization uses both actual loaded bundles", async () => {
  const r=nativeContracts(),warnings=[];r.ui.notifications.warn=t=>warnings.push(t);
  r.GURPS.resolveDamageRoll=null; const diagnosis=diagnoseGgaDamageAdapters(r);
  warnGgaDamageCompatibility(diagnosis,r);warnGgaDamageCompatibility(diagnosis,r);
  assert.equal(warnings.length,1);assert.match(warnings[0],/resolveDamageRoll/);
  for (const lang of ["ru","en"]) { const bundle=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    const runtime={game:{i18n:{lang,localize:key=>bundle[key]??key}}};
    const ru=JSON.parse(await fs.readFile(new URL("../lang/ru.json",import.meta.url),"utf8"));
    assert.equal(ammoEffectText("AdapterUnavailable",{points:"TEST"},runtime),ru["OleGURPS.AmmoEffects.AdapterUnavailable"].replace("{points}","TEST"));
    const effectSource=await fs.readFile(new URL("../scripts/tools/ammunition-effects.js",import.meta.url),"utf8");
    const reasons=[...effectSource.matchAll(/unresolved\("([^"]+)"\)/g)].map(match=>match[1]);
    for(const reason of reasons){
      const key=Object.keys(bundle).find(key=>key.endsWith("."+reason));
      assert.ok(key,lang+" missing "+reason);
      assert.notEqual(ammoEffectText(reason,{},runtime),reason);
      assert.equal(ammoEffectText(reason,{},runtime),ru[key]);
    }
  }
});
test("cached Foundry manifest loads new ammunition translations for both languages without changing user language",async()=>{
  for(const language of ["ru","en"]){
    const dictionary={};const runtime={location:{},fetch:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL("../lang/"+language+".json",import.meta.url),"utf8"))}),
      foundry:{utils:{setProperty(object,key,value){object[key]=value;}}},game:{i18n:{lang:language,translations:dictionary,localize:key=>dictionary[key]??key}}};
    await loadAmmoEffectTranslations(runtime);
    assert.equal(runtime.game.i18n.lang,language);assert.deepEqual(dictionary,{});
    assert.match(ammoEffectText("AdapterUnavailable",{points:"TEST"},runtime),/TEST/);
    assert.equal(dictionary["OleGURPS.Ammo.Title"],undefined);
  }
});
test("AmmoService reads the installed construction, snapshots each shot, persists receipts and spends once",async()=>{
  const types=[type(),type("ht_ap"),type("ht_aphc"),type("ht_hollow_point")];
  let saved={version:10,weapons:[{id:"weapon",name:"AK",attackRef:{path:"system.ranged.0"},ammunitionInventory:{version:1,installedId:"m0",
    stocks:types.map(t=>({key:t.key,type:t,rounds:10})),magazines:types.map((t,i)=>({id:"m"+i,weaponId:"weapon",capacity:30,rounds:20,ammoKey:t.key}))}}]};
  projectAmmoInventory(saved.weapons[0]);
  const actor={id:"actor",isOwner:true,system:{ranged:{0:structuredClone(raw)}},getFlag:()=>structuredClone(saved),
    setFlag:async(scope,key,value)=>{saved=structuredClone(value);}};
  const system=JSON.stringify(actor.system),service=new AmmoService(actor),shots=[];let rolls=0;
  for(let i=0;i<types.length;i++){
    await service.inventoryTransaction("weapon","install",{magazineId:"m"+i});
    const options={weaponId:"weapon",attackId:"construction-shot-"+i,
      prepare:({state,ammunition})=>({amount:i+1,profile:resolver.resolve({actorId:actor.id,weaponId:"weapon",attack:raw,rawAttack:raw,binding,ammunition,state})}),
      execute:async()=>{rolls++;return{rolled:true,message:{id:"message-"+i,async setFlag(scope,key,value){shots[i]=structuredClone(value);}}};}};
    const result=await service.executeShot(options);
    assert.equal(result.snapshot.profile.damage.formula,profile(types[i].recipe?.variantId).damage.formula);
    assert.equal(result.snapshot.ammunition.recipe?.variantId,types[i].recipe?.variantId);
    assert.equal((await service.executeShot(options)).duplicate,true);
  }
  assert.equal(rolls,4);assert.deepEqual(saved.weapons[0].ammunitionInventory.magazines.map(m=>m.rounds),[19,18,17,16]);
  assert.deepEqual(saved.weapons[0].ammunitionInventory.stocks.map(s=>s.rounds),[10,10,10,10]);
  assert.equal(shots[1].profile.damage.formula,"4d-1(2) pi-");assert.equal(shots[2].profile.damage.formula,"5d+1(2) pi-");
  assert.equal(JSON.stringify(actor.system),system);
});
