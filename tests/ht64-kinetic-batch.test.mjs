import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, context, api } from "./fixtures/ht-special-context.mjs";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { DU_OPTIONS, reviewDUConstruction, evaluateDUIgnition } from "../scripts/tools/du-ammunition.js";
import { evaluateHTOptionEligibility } from "../scripts/ht-option-eligibility.js";
import { recipeFingerprint, setAmmunitionApproval, approvalKey } from "../scripts/tools/ammunition-approval-service.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { availableAmmoTypes, duApprovalHTML } from "../scripts/tools/ammo-management-app.js";
import { automaticAmmoMessages, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { ammunitionConditionTexts } from "../scripts/tools/damage-shot-link.js";
const ids=["ht_solid","ht_hollow_point","ht_ap","ht_aphc","ht_frangible","ht_apds","ht_apfsds","ht_sapfsds","ht_underwater_dart","ht_apdu","ht_apdsdu","ht_apfsdsdu"];
const raw={damage:"6d pi+",range:"100/300",halfd:100,acc:"5",st:"10",rof:"3",rcl:"2",bulk:"-5"};
function facts(id,caliber=20){return {caliberMm:caliber,availabilityTL:8,baseCostPerShot:2,muzzleVelocityFps:2000,
  evidence:DU_OPTIONS[id]?{[DU_OPTIONS[id].eligibility_v1.explicit_evidence_required[0]]:{value:true,source:"isolated explicit GM design test; not a factory catalog record"}}:{},
  nativeEffects:{},weaponPlatforms:{values:["autocannon"],complete:true}};}
function numeric(id,extra={},f=facts(id)){return resolveAmmunitionEffects({raw:{...raw,...extra},variantId:id,baseStatus:"compatible",constructionStatus:"gm-approved",facts:f});}

test("batch contains exactly the twelve reviewed P2 IDs; pure DU predicates match catalog contracts",async()=>{
  const audit=JSON.parse(await fs.readFile(new URL("../docs/audit/ht64-independent-audit.json",import.meta.url),"utf8"));
  assert.deepEqual(audit.records.filter(r=>r.implementationGroup==="P2_kinetic_projectiles").map(r=>r.variantId).sort(),[...ids].sort());
  for(const [id,option]of Object.entries(DU_OPTIONS)){const original=catalogs.getVariant("ht",id);assert.equal(option.min_tl,original.min_tl);
    assert.ok(Object.isFrozen(option.eligibility_v1.conditions));
    assert.deepEqual(option.eligibility_v1.conditions,original.eligibility_v1.conditions);
    assert.deepEqual(option.eligibility_v1.explicit_evidence_required,original.eligibility_v1.explicit_evidence_required);}
});

for(const [id,formula,range,cost]of [
  ["ht_hollow_point","6d(0.5) pi++","100/300",1], ["ht_ap","4d+1(2) pi+","100/300",1.5],
  ["ht_aphc","6d(2) pi+","100/300",2], ["ht_frangible","6d(0.5) pi++","90/270",1.5],
  ["ht_apds","8d-1(2) pi","150/450",3], ["ht_apfsds","9d(2) pi-","200/600",4],
  ["ht_sapfsds","6d(2) pi-","150/450",2], ["ht_apdu","7d+1(2) pi+","100/300",3],
  ["ht_apdsdu","9d(2) pi","150/450",4], ["ht_apfsdsdu","10d+1(2) pi","200/600",5]
])test(id+" uses HT166 bands, exact divisor/piercing, both ranges and CPS",()=>{
  const r=numeric(id);assert.equal(r.nativeSafe,true);assert.equal(r.formula,formula);assert.equal(r.effectiveChanges?.range??raw.range,range);
  assert.equal(r.rules.costMultiplier,cost);assert.equal(r.rules.costPerShot,2*cost);
  if(r.effectiveChanges?.range)assert.equal(r.effectiveChanges.halfd,Number(range.split('/')[0]));
  assert.equal(raw.damage,"6d pi+");assert.equal(r.components.length,1);
});

test("ht_solid preserves the actual native formula, divisor, costs and compound effects without a second transform",()=>{
  for(const damage of ["6d pi+","6d(2) pi-","5d imp","6d pi+ + 1d burn"]){const r=resolveAmmunitionEffects({raw:{...raw,damage}});
    assert.equal(r.formula,damage);assert.equal(r.nativeSafe,true);assert.deepEqual(r.transformations,[]);assert.deepEqual(r.rules,{});}
});
test("ht_underwater_dart preserves the exact APS native projectile and multiplies underwater distance only",()=>{
  const c=context("W10jqOZ0kjeSuoY3C");for(const [environment,expected]of [["underwater",500],["air",20]]){
    const p=resolver.resolve({actorId:"a",rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base},context:{environment:{environment,actualDistance:20,depthFeet:100}}});
    assert.equal(p.damage.formula,"5d imp");assert.equal(p.damage.nativeSafe,true);assert.equal(p.context.environment.effectiveDistance,expected);
    assert.equal(p.damage.rules.costMultiplier,2);assert.equal(p.damage.rules.costPerShot,2);assert.equal(p.damage.rules.costApplication,"included-in-source-cartridge-price");}
  const c2=context("W27s4Lm8QlkKVKUPn");const p=resolver.resolve({actorId:"a",rawAttack:{...c2.raw,damage:"5d imp"},binding:c2.binding,ammunition:{type:c2.base},context:{environment:{environment:"underwater",actualDistance:20,depthFeet:100}}});
  assert.equal(p.damage.nativeSafe,false);assert.equal(p.environmentCapability,undefined);
});

test("DU caliber boundaries and APFSDSDU piercing differ from ordinary APFSDS",()=>{
  for(const [id,caliber,original,expected]of [
    ["ht_apdu",19.99,"pi+","pi"],["ht_apdu",20,"pi+","pi+"],
    ["ht_apdsdu",29.99,"pi++","pi+"],["ht_apdsdu",30,"pi++","pi++"],
    ["ht_apfsdsdu",9.99,"pi++",null],["ht_apfsdsdu",10,"pi++","pi+"],
    ["ht_apfsdsdu",39.99,"pi+","pi"],["ht_apfsdsdu",40,"pi+","pi+"],
    ["ht_apfsdsdu",20,"pi","pi"],["ht_apfsdsdu",20,"pi-","pi-"]]){
    const r=numeric(id,{damage:"6d "+original},facts(id,caliber));if(expected)assert.equal(r.formula.split(' ')[1],expected);else assert.equal(r.nativeSafe,false);
  }
  assert.equal(numeric("ht_apfsds",{damage:"6d pi++"},facts("ht_apfsds",20)).formula.split(' ')[1],"pi");
});
test("DU availability TL, separate design evidence and platforms remain real predicates",()=>{
  for(const id of Object.keys(DU_OPTIONS)){
    const f=facts(id);assert.equal(reviewDUConstruction(DU_OPTIONS[id],f).status,"compatible");
    assert.equal(reviewDUConstruction(DU_OPTIONS[id],{...f,availabilityTL:7}).status,"incompatible");
    assert.equal(reviewDUConstruction(DU_OPTIONS[id],{...f,availabilityTL:undefined}).status,"undetermined");
    assert.equal(reviewDUConstruction(DU_OPTIONS[id],{...f,evidence:{}}).status,"undetermined");
    for(const caliberMm of [undefined,0,-1,NaN])assert.equal(numeric(id,{}, {...f,caliberMm}).nativeSafe,false);
    const bad={...f,weaponPlatforms:{values:["rifle"],complete:true}};
    assert.equal(reviewDUConstruction(DU_OPTIONS[id],bad).status,id==="ht_apfsdsdu"?"incompatible":"undetermined");
    assert.equal(numeric(id,{},bad).nativeSafe,false);
    const req=DU_OPTIONS[id].eligibility_v1.explicit_evidence_required[0];assert.equal(reviewDUConstruction(DU_OPTIONS[id],{...f,evidence:{[req]:{value:false,source:"prohibited design"}}}).status,"incompatible");
  }
});
test("DU guards reject native divisors, inc, effects, journals and mixed projectile layers",()=>{
  for(const id of Object.keys(DU_OPTIONS)){
    for(const data of [{damage:"6d(2) pi+"},{damage:"6d pi+ inc"},{linked:true},{followUp:true},{ammunitionEffects:["native"]}])assert.equal(numeric(id,data).nativeSafe,false);
    const first=numeric(id);assert.equal(resolveAmmunitionEffects({raw,variantId:id,baseStatus:"compatible",constructionStatus:"gm-approved",facts:facts(id),previousTransformations:first.transformations}).nativeSafe,false);
    const bad=compatibility.checkCompatibility("W27s4Lm8QlkKVKUPn",id,{book:"ht",kind:"projectile-option",ammoItemId:"ht_7_62x39mm",selectedVariantIds:["ht_apds",id]});
    assert.equal(bad.status,"incompatible");assert.ok(bad.eligibility.facts.combinationConflicts.length);
  }
});
test("DU ignition distinguishes original DR 9/10/11, flexible armor and proven penetration without inc dice",()=>{
  for(const armorDR of [9,10,11])for(const flexible of [true,false])for(const penetratingDamage of [0,1]){
    const r=evaluateDUIgnition({armorDR,flexible,penetratingDamage});assert.equal(r.status,armorDR>=10&&!flexible&&penetratingDamage>0?"eligible-for-GM-ruling":"condition-not-met");assert.equal(r.applyAutomatically,false);
  }
  assert.equal(evaluateDUIgnition({armorDR:11,penetratingDamage:5}).status,"undetermined");
  assert.equal(evaluateDUIgnition({armorDR:11,flexible:false,penetratingDamage:5,nativeIncendiary:true}).status,"native-effect-preserved");
  for(const id of Object.keys(DU_OPTIONS)){const r=numeric(id);assert.ok(r.support.manual.some(c=>c.id==="DUIncendiary"));assert.equal(r.rules.incendiary.minimumOriginalArmorDR,10);assert.equal(r.rules.incendiary.automaticDamage,false);assert.ok(!r.formula.includes('inc'));assert.equal(r.components.length,1);}
});

const modeId="W27s4Lm8QlkKVKUPn",c=context(modeId),pending=automatic.prepare({modeId,base:c.base,variantId:"ht_apdu"});
const decision={designConfirmed:true,platform:"source_verified_other_platform",caliberMm:7.62,availabilityTL:8,source:"isolated explicit GM design test, not source-confirmed production ammunition"};
const approval={active:true,actorId:"du-test",weaponId:"weapon",modeId,ammoId:c.base.ammoId,variantId:"ht_apdu",recipeId:pending.type.recipe.customId,fingerprint:recipeFingerprint(pending.type),duDecision:decision};
const profile=(a=approval)=>resolver.resolve({actorId:"du-test",weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition:{type:pending.type},approval:a,profilePolicy:"permissive"});
test("scoped DU GM proof admits only the attested physical design; world policy cannot supply it",()=>{
  assert.equal(pending.state,"incomplete");assert.equal(automatic.admission(pending,{policy:"permissive"}).allowed,false);
  assert.equal(profile(null).damage.nativeSafe,false);assert.equal(profile().damage.nativeSafe,true);
  for(const a of [{...approval,actorId:"other"},{...approval,weaponId:"other"},{...approval,active:false},{...approval,duDecision:{...decision,designConfirmed:false}},{...approval,duDecision:{...decision,caliberMm:20}},{...approval,duDecision:{...decision,availabilityTL:7}}])assert.equal(profile(a).damage.nativeSafe,false);
  assert.equal(compatibility.checkCompatibility(modeId,"ht_apdu",{book:"ht",kind:"projectile-option",ammoItemId:c.base.ammoId}).status,"undetermined");
});
test("existing GM approval service validates and persists DU evidence, rejects non-GM and source conflicts",async()=>{
  let settings={};const actor={id:"du-test",binding:c.binding},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"}};
  const runtime={game:{user:{id:"gm",isGM:true},settings:{get:()=>settings,set:async(s,k,v)=>{settings=v;}}},OleGURPSQOL:api};
  await assert.rejects(setAmmunitionApproval({actor,weapon,type:pending.type,active:true},runtime),/DUConfirmationRequired/);
  const saved=await setAmmunitionApproval({actor,weapon,type:pending.type,active:true,duDecision:decision},runtime);assert.deepEqual(saved.duDecision,decision);
  await assert.rejects(setAmmunitionApproval({actor,weapon,type:pending.type,active:true,duDecision:decision},{...runtime,game:{...runtime.game,user:{isGM:false}}}),/Permission/);
  await assert.rejects(setAmmunitionApproval({actor,weapon,type:pending.type,active:true,duDecision:{...decision,caliberMm:20}},runtime),/DUIdentityConflict/);
  const before=JSON.stringify(saved);const revoked=await setAmmunitionApproval({actor,weapon,type:pending.type,active:false},runtime);assert.equal(revoked.active,false);assert.equal(JSON.stringify(saved),before);
});
test("DU stock, separate magazine, immutable snapshot, one spend and reload use existing AmmoService",async()=>{
  let state={weapons:[{id:"weapon",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}}]};
  const w=state.weapons[0],type=pending.type;
  applyInventoryOperation(w,"add-stock",{ammoKey:type.key,amount:4},{allowedTypes:[type]});
  applyInventoryOperation(w,"add-magazines",{capacity:2,amount:2},{makeId:(()=>{let i=0;return()=>"m"+(++i)})()});
  applyInventoryOperation(w,"load",{magazineId:"m1",ammoKey:type.key,amount:2},{allowedTypes:[type]});applyInventoryOperation(w,"install",{magazineId:"m1"});projectAmmoInventory(w);
  const actor={id:"du-test",isOwner:true,getFlag:()=>state,setFlag:async(s,k,v)=>{state=structuredClone(v);}},service=new AmmoService(actor),messages=[];
  const execute={weaponId:"weapon",attackId:"du-shot",prepare:({ammunition})=>({amount:1,profile:resolver.resolve({actorId:actor.id,weaponId:"weapon",rawAttack:c.raw,binding:c.binding,ammunition,approval,profilePolicy:"permissive"})}),execute:async()=>({rolled:true,message:{id:"m",setFlag:async(s,k,v)=>messages.push(v)}})};
  const shot=await service.executeShot(execute);assert.equal(shot.spent,1);assert.equal(state.weapons[0].totalAmmo,3);const saved=JSON.stringify(messages[0]);
  await service.inventoryTransaction("weapon","install",{magazineId:"m2"});assert.equal(state.weapons[0].totalAmmo,3);
  assert.equal((await new AmmoService(actor).executeShot(execute)).duplicate,true);assert.equal(state.weapons[0].totalAmmo,3);
  assert.equal(JSON.stringify(messages[0]),saved);assert.equal(JSON.parse(saved).profile.damage.nativeSafe,true);assert.equal(JSON.parse(saved).profile.damage.rules.incendiary.requiresPenetration,true);
  const snap=createShotSnapshot(profile(),{attackId:"immutable",spent:1});assert.ok(Object.isFrozen(snap.profile.damage));assert.equal(JSON.parse(JSON.stringify(snap)).profile.damage.formula,snap.profile.damage.formula);
});
test("existing APDS recipe identity remains valid after adding CPS support",()=>{
  const b=context("Wxm8TWSvu5UFTAaDn"),p=automatic.prepare({modeId:b.binding.binding.modeId,base:b.base,variantId:"ht_apds"});
  assert.equal(p.type.recipe.autoProfile.model.rule.costFactor,undefined);
  assert.equal(automatic.prepare({modeId:b.binding.binding.modeId,base:b.base,variantId:"ht_apds",savedType:p.type}).state,"complete");
  const result=resolver.resolve({actorId:"old",rawAttack:b.raw,binding:b.binding,ammunition:{type:p.type}});assert.equal(result.damage.nativeSafe,true);assert.equal(result.damage.rules.costMultiplier,3);
});
test("DU UI describes refusals and GM conditions in RU/EN without presenting service keys",async()=>{
  for(const lang of ["ru","en"]){const actual=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));
    const html=duApprovalHTML({...pending.type,preparation:pending},lang);assert.ok(html.includes(automaticAmmoMessages[lang].DUDesign));assert.ok(!html.includes('>source_verified_other_platform<'));assert.ok(!/<details[^>]*\sopen/.test(html));
    for(const [key,text]of Object.entries(automaticAmmoMessages[lang]).filter(([k])=>k.startsWith('DU')))assert.equal(actual['OleGURPS.AutomaticAmmo.'+key],text);
    const i18n={lang,translations:{},localize:key=>key==='OleGURPS.AutomaticAmmo.DUIncendiaryGM'?key:'cached old text'};
    await loadAutomaticAmmoTranslations({game:{i18n},location:{},fetch:async()=>({ok:true,json:async()=>actual}),foundry:{utils:{setProperty:(o,k,v)=>{o[k]=v}}}});
    assert.equal(i18n.translations['OleGURPS.AutomaticAmmo.DUIncendiaryGM'],actual['OleGURPS.AutomaticAmmo.DUIncendiaryGM']);assert.equal(i18n.lang,lang);
    const conditions=ammunitionConditionTexts(numeric('ht_apdu').support.manual,lang);assert.ok(conditions[0].includes('DR 10+'));
  }
});
test("real load-window choices remain blocked before scoped proof and admit only the approved DU recipe",()=>{
  const originalGet=game.settings.get,approvals={};const actor={id:"du-test",binding:c.binding,system:{ranged:{mode:c.raw}}},weapon={id:"weapon",attackRef:{path:"system.ranged.mode"}};
  game.settings.get=(s,k)=>k==="ammunitionApprovals"?approvals:"permissive";
  try{const before=availableAmmoTypes(actor,weapon,api,"ru").find(t=>t.recipe?.variantId==="ht_apdu");assert.equal(before.unavailable,true);assert.equal(before.reason,automaticAmmoMessages.ru.DUConfirmationRequired);
    approvals[approvalKey({actorId:actor.id,weaponId:weapon.id,modeId,type:pending.type})]=approval;
    const after=availableAmmoTypes(actor,weapon,api,"ru").find(t=>t.recipe?.variantId==="ht_apdu");assert.equal(after.unavailable,false);assert.equal(after.preparation.state,"complete");assert.equal(after.key,before.key);
    approvals[approvalKey({actorId:actor.id,weaponId:weapon.id,modeId,type:pending.type})]={...approval,active:false};
    const revoked=availableAmmoTypes(actor,weapon,api,"ru").find(t=>t.recipe?.variantId==="ht_apdu");assert.equal(revoked.unavailable,true);assert.equal(revoked.reason,automaticAmmoMessages.ru.Revoked);
    const incompatible=availableAmmoTypes(actor,weapon,api,"ru").find(t=>t.recipe?.variantId==="ht_apfsdsdu");assert.equal(incompatible.unavailable,true);assert.ok(incompatible.reason.includes(automaticAmmoMessages.ru.DUMinimumCaliber));assert.ok(incompatible.reason.includes(automaticAmmoMessages.ru.DUPlatformProhibited));
  }finally{game.settings.get=originalGet;}
});
test("DU attestation cannot overcome explicit prohibition, native effects or contradictory platform",()=>{
  const f=facts('ht_apdu'),req=DU_OPTIONS.ht_apdu.eligibility_v1.explicit_evidence_required[0];
  assert.notEqual(reviewDUConstruction(DU_OPTIONS.ht_apdu,{...f,evidence:{[req]:{value:false,source:'verified prohibited design'}}},{...decision,platform:'autocannon',caliberMm:20}).status,'compatible');
  const tank={...facts('ht_apfsdsdu'),weaponPlatforms:{values:['rifle'],complete:true}};
  assert.equal(reviewDUConstruction(DU_OPTIONS.ht_apfsdsdu,tank,{...decision,platform:'tank_gun',caliberMm:20}).reason,'DUPlatformConflict');
  assert.equal(numeric('ht_apdu',{}, {...f,nativeEffects:{'native-du-incendiary':true}}).nativeSafe,false);
  const stacked={...pending.type,recipe:{...pending.type.recipe,variantIds:['ht_apds','ht_apdu']}};
  assert.equal(resolver.resolve({actorId:'du-test',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type:stacked},approval}).damage.nativeSafe,false);
});
test("unknown CPS stays unknown and supplied price is multiplied only in the immutable result",()=>{
  for(const id of ['ht_ap','ht_aphc','ht_apds','ht_apfsds','ht_sapfsds',...Object.keys(DU_OPTIONS)]){
    const f=facts(id);delete f.baseCostPerShot;const r=numeric(id,{},f);assert.equal(r.rules.costPerShot,undefined);assert.equal(r.nativeSafe,true);
    const before=JSON.stringify(f);numeric(id,{},f);assert.equal(JSON.stringify(f),before);
  }
});
