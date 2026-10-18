import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import { automaticAmmoText } from "../scripts/tools/automatic-ammunition-localization.js";
import { moduleText as russianText } from "../scripts/localization.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, resolver, context, api } from "./fixtures/ht-special-context.mjs";
import { MULTISHOT_IDS, reviewMultishotConstruction, bindMultishotDefinition } from "../scripts/tools/multishot-ammunition.js";
import { resolveAmmunitionEffects, htDamageDice } from "../scripts/tools/ammunition-effects.js";
import { recipeFingerprint, approvalKey, actorDecisionKey, setAmmunitionApproval } from "../scripts/tools/ammunition-approval-service.js";
import { resolveMultipleProjectileFire } from "../scripts/tools/fire-service.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { applyInventoryOperation, projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { ammunitionCandidates, availableAmmoTypes, multishotApprovalHTML } from "../scripts/tools/ammo-management-app.js";
import { automaticAmmoMessages, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { ammunitionConditionTexts } from "../scripts/tools/damage-shot-link.js";
import { ammoEffectMessages } from "../scripts/tools/gga-damage-compatibility.js";
const source="isolated GM integration contract; not a published factory round";
const raw={damage:"4d pi+",acc:"3+1",scopeBonus:1,range:"100/900",halfd:100,rof:"3",rcl:"3",st:"10"};
function contract(id,extra={}) {
 const o=catalogs.getVariant("ht",id), platform=o.eligibility_v1.conditions.weapon_platforms_any[0];
 const d={designConfirmed:true,source,platform,caliberMm:40,availabilityTL:8,count:9,elementMm:8.13,shotSize:"buckshot",elementType:"pi++",baselineKind:"slug",slugRcl:4,...extra};
 const f={caliberMm:d.caliberMm,availabilityTL:d.availabilityTL,baseCostPerShot:2,evidence:{},nativeEffects:{},missingContext:[],combinationConflicts:[],provenance:[],weaponPlatforms:{values:[d.platform],complete:true},munitionClasses:{values:[],complete:false}};
 const review=reviewMultishotConstruction(o,f,d);
 if(review.facts.multishotDefinition)review.facts.multishotDefinition.shotSizes=structuredClone(catalogs.getCatalog("ht").shot_sizes);
 return {o,d,f,review};
}
function effect(id,data={},definition={}) {
 const c=contract(id,definition);
 return resolveAmmunitionEffects({raw:{...raw,...data},variantId:id,baseStatus:"compatible",constructionStatus:"gm-approved",facts:c.review.facts});
}
test("P3 contains all thirteen source-reviewed IDs and no other package",async()=>{
 const a=readAuditFixture('ht64-independent-audit');
 assert.deepEqual(a.records.filter(r=>r.implementationGroup==="P3_multishot_nonlethal").map(r=>r.variantId).sort(),[...MULTISHOT_IDS].sort());
 assert.equal(MULTISHOT_IDS.length,13);
});
for(const id of MULTISHOT_IDS)test(id+" requires an exact design, suitable platform, TL and matching chamber",()=>{
 const c=contract(id);assert.equal(reviewMultishotConstruction(c.o,c.f).status,"undetermined");
 const wrong=reviewMultishotConstruction(c.o,{...c.f,weaponPlatforms:{values:["laser"],complete:true}},c.d);assert.notEqual(wrong.status,"compatible");
 assert.notEqual(reviewMultishotConstruction(c.o,{...c.f,availabilityTL:1},{...c.d,availabilityTL:1}).status,"compatible");
 const requirement=c.o.eligibility_v1.explicit_evidence_required[0];
 assert.notEqual(reviewMultishotConstruction(c.o,{...c.f,evidence:{[requirement]:{value:false,source:"source prohibition"}}},c.d).status,"compatible");
 assert.notEqual(reviewMultishotConstruction(c.o,c.f,{...c.d,caliberMm:41}).status,"compatible");
 const b=automatic.prepare({modeId:"W27s4Lm8QlkKVKUPn",base:{...context("W27s4Lm8QlkKVKUPn").base,ammoId:"ht_12_gauge_2_75_18_5x70mmr"},variantId:id});assert.equal(b.state,"incomplete");
});
test("slug converts the exact buckshot source, keeps confirmed recoil and removes pellets",()=>{
 const r=effect("ht_rifled_slug",{damage:"1d pi",acc:"2",rof:"3x9",range:"35/700",halfd:35},{baselineKind:"buckshot",caliberMm:18.5});
 assert.equal(r.nativeSafe,true);assert.equal(r.formula,"4d pi+");assert.equal(r.effectiveChanges.acc,3);assert.equal(r.effectiveChanges.range,"87.5/1050");assert.equal(r.effectiveChanges.rof,"3");assert.equal(r.effectiveChanges.rcl,"4");assert.equal(r.rules.projectiles.b409Eligible,false);
 assert.equal(effect("ht_rifled_slug",{damage:"1d pi",rof:"3x9"},{baselineKind:"buckshot",slugRcl:undefined}).nativeSafe,false);
 assert.equal(effect("ht_rifled_slug",{damage:"1d(0.5) pi-",rof:"3x11"},{baselineKind:"buckshot"}).nativeSafe,false);
});
test("exact source Condor native slug is preserved and a different weapon cannot inherit its data",()=>{
 for(const modeId of ["Wx10NaVSr1cp1bwKv","WkzlenFdgtlwesK-q"]){const c=context(modeId),p=automatic.prepare({modeId,base:c.base,variantId:"ht_rifled_slug"});
  assert.equal(p.state,"complete");const r=resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},profilePolicy:"permissive"});
  assert.equal(r.damage.nativeSafe,true);assert.equal(r.damage.formula,"4d pi+");assert.equal(r.effective.rcl,"10");assert.equal(r.effective.rof,"1");
  if(modeId==="WkzlenFdgtlwesK-q"){assert.equal(r.effective.range,c.raw.range);assert.equal(r.damage.transformations.filter(t=>t.applied).length,0);}}
 const other=context("W19ooSM10ivSwlXSP");assert.notEqual(automatic.prepare({modeId:"W19ooSM10ivSwlXSP",base:other.base,variantId:"ht_rifled_slug"}).state,"complete");
});
for(const id of ["ht_baton","ht_beanbag"])test(id+" starts with slug, uses HT166 and exact Acc/knockback threshold",()=>{
 for(const caliberMm of [14.99,15,35,35.01]){
  const r=effect(id,{damage:"1d pi",acc:"2",rof:"3x9",range:"40/800",halfd:40},{baselineKind:"buckshot",caliberMm});
  const doubled=id==="ht_baton"?caliberMm>35:caliberMm>=15;
  assert.equal(r.nativeSafe,true);assert.equal(r.formula,htDamageDice(4,0,1,.2)+ (id==="ht_baton"?"(0.5) cr":"(0.2) cr")+(doubled?" dkb":""));
  assert.equal(r.effectiveChanges.acc,id==="ht_baton"?2:0);assert.equal(r.effectiveChanges.range,id==="ht_baton"?"20/240":"12.5/150");
  assert.equal(r.rules.knockback.multiplier,(id==="ht_baton"?caliberMm>35:caliberMm>=15)?2:1);assert.equal(r.rules.costMultiplier,id==="ht_baton"?2:3);
 }
});
for(const [id,n,factor]of [["ht_duplex",2,.85],["ht_triplex",3,.7]])test(id+" separates element RoF from physical rounds and never applies B409",()=>{
 const r=effect(id);assert.equal(r.nativeSafe,true);assert.equal(r.formula,htDamageDice(4,0,1,factor)+" pi+");assert.equal(r.effectiveChanges.rof,"3x"+n);assert.equal(r.effectiveChanges.rcl,"1");assert.equal(r.rules.costMultiplier,1.5);
 assert.equal(r.effectiveChanges.range,id==="ht_duplex"?"50/450":"33.333333333333/300");
 const fire=resolveMultipleProjectileFire({rof:r.effectiveChanges.rof,physicalShots:2,physicalDistance:0,halfDamageRange:r.effectiveChanges.halfd,b409Eligible:r.rules.projectiles.b409Eligible});assert.equal(fire.effectiveRoF,2*n);assert.equal(fire.extremelyClose,false);
 const c=contract(id,{platform:"automatic_rifle",availabilityTL:6});assert.equal(c.review.status,"incompatible");
});
for(const [id,type,range,cost]of [["ht_shotshell","pi","40.65/813",undefined],["ht_canister","pi++","40.65/406.5",undefined],["ht_multi_flechette","pi-","406.5/4878",4],["ht_rubber_shot","cr","16.26/81.3",2]])test(id+" shares 1/sqrt(NP), size ranges, element RoF and source costs",()=>{
 const r=effect(id);assert.equal(r.nativeSafe,true);assert.equal(r.formula,htDamageDice(4,0,1,1/3)+(id==="ht_rubber_shot"?"(0.2)":"")+" "+type);assert.equal(r.effectiveChanges.range,range);assert.equal(r.effectiveChanges.rof,"3x9");assert.equal(r.effectiveChanges.rcl,"1");assert.equal(r.rules.projectiles.b409Eligible,id==="ht_shotshell");assert.equal(r.rules.costMultiplier,cost);
 assert.equal(effect(id,{}, {b409Applicable:true}).rules.projectiles.b409Eligible,true);
 for(const definition of [{count:undefined},{count:0},{count:1.5},{elementMm:undefined},{elementMm:-1}])assert.equal(effect(id,{},definition).nativeSafe,false);
 assert.equal(effect(id,{rof:"3x9"}).nativeSafe,false);
});
test("shotshell table distinguishes buckshot/birdshot/smallshot and never fills unlisted diameter gaps",()=>{
 for(const [shotSize,elementMm,type,divisor]of [["buckshot",8.13,"pi",1],["birdshot",2.03,"pi-",.5],["smallshot",1.02,"pi-",.2]]){
 const r=effect("ht_shotshell",{}, {shotSize,elementMm});assert.equal(r.nativeSafe,true);assert.ok(r.formula.endsWith(type));assert.equal(r.formula.includes('('+divisor+')'),divisor!==1);}
 assert.equal(effect("ht_shotshell",{}, {shotSize:"buckshot",elementMm:8}).nativeSafe,false);
});
test("buck-and-ball keeps unequal components, first ball/later pellets and manual allocation",()=>{
 const r=effect("ht_buck_and_ball",{}, {count:3});assert.equal(r.nativeSafe,true);assert.equal(r.formula,raw.damage);assert.equal(r.rules.hitAllocation.pellet,"1d+1 pi");assert.equal(r.rules.hitAllocation.ball,raw.damage);assert.equal(r.rules.hitAllocation.automatic,false);assert.equal(r.effectiveChanges.rof,"3x4");assert.equal(r.rules.projectiles.b409Eligible,false);assert.equal(r.effectiveChanges.range,"90/810");assert.equal(r.support.status,"GM-MEDIATED");assert.equal(ammunitionConditionTexts(r.support.manual,"ru").length,1);
});
for(const id of ["ht_shrapnel","ht_beehive","ht_abf"])test(id+" preserves only an attested published native effect and explicit GM burst",()=>{
 assert.equal(effect(id).nativeSafe,false);const damage=id==="ht_beehive"?"3d cut":"6d cr ex";
 const r=effect(id,{damage,range:"100/900"},{nativeVariant:id,nativeDamage:damage,burstDistance:50});assert.equal(r.nativeSafe,true);assert.equal(r.formula,damage);assert.equal(r.rules.costMultiplier,id==="ht_shrapnel"?2:5);assert.equal(r.rules.burst.geometryAutomatic,false);assert.equal(r.transformations.filter(t=>t.applied).length,0);
 assert.equal(effect(id,{damage:"5d cr ex"},{nativeVariant:id,nativeDamage:damage,burstDistance:50}).nativeSafe,false);
 assert.equal(effect(id,{damage},{nativeVariant:id,nativeDamage:damage}).nativeSafe,false);
});
test("B409 strict fractional boundary uses current half-D and only eligible shot; native DR scaling once",()=>{
 for(const halfDamageRange of [87.5,12.5,16.26])for(const [offset,close]of [[-.00001,true],[0,false],[.00001,false]]){
 const f=resolveMultipleProjectileFire({rof:"3x9",physicalShots:2,physicalDistance:halfDamageRange/10+offset,halfDamageRange,b409Eligible:true});assert.equal(f.extremelyClose,close);assert.equal(f.effectiveRoF,close?2:18);assert.equal(f.closeDamageMultiplier,close?4:null);}
 const nonshot=resolveMultipleProjectileFire({rof:"3x9",physicalShots:2,physicalDistance:0,halfDamageRange:100,b409Eligible:false});assert.equal(nonshot.extremelyClose,false);
});
const modeId="W27s4Lm8QlkKVKUPn", c=context(modeId);
function scoped(id="ht_duplex",extra={}) {
 const d={designConfirmed:true,source,platform:"automatic_rifle",caliberMm:7.62,availabilityTL:8,...extra};
 const pending=automatic.prepare({modeId,base:c.base,variantId:id});const type=bindMultishotDefinition(pending.type,d);
 const approval={active:true,actorId:"a",weaponId:"w",modeId,ammoId:type.ammoId,variantId:id,recipeId:type.recipe.customId,fingerprint:recipeFingerprint(type),multishotDecision:d};
 return {type,approval,d};
}
function shot(s,approval=s.approval){return resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:c.binding,ammunition:{type:s.type},approval,profilePolicy:"permissive"});}
test("embedded user load is admitted without changing official undetermined or allowing world policy to invent it",()=>{
 const s=scoped();assert.equal(compatibility.checkCompatibility(modeId,"ht_duplex",{book:"ht",kind:"projectile-option",ammoItemId:c.base.ammoId}).status,"undetermined");
 assert.equal(shot(s).damage.nativeSafe,true);assert.equal(shot(s,null).damage.nativeSafe,true);
 for(const a of [{...s.approval,actorId:"b"},{...s.approval,weaponId:"x"},{...s.approval,active:false},{...s.approval,multishotDecision:{...s.d,availabilityTL:7}}])assert.equal(shot(s,a).damage.nativeSafe,true);
 assert.equal(shot(scoped("ht_triplex")).damage.nativeSafe,true);
 const wrong=resolver.resolve({actorId:"a",weaponId:"w",rawAttack:c.raw,binding:context("W19ooSM10ivSwlXSP").binding,ammunition:{type:s.type},approval:s.approval});assert.equal(wrong.damage.nativeSafe,false);
});
test("GM recipe identity separates NP, dimensions and burst data; old stock and immutable snapshot survive reload",async()=>{
 const s=scoped(), p=shot(s), snap=createShotSnapshot(p,{attackId:"attack",spent:2,messageId:"m",resourceTiming:"after-attack"});
 const serialized=JSON.stringify(snap);assert.ok(Object.isFrozen(snap.profile));
 let flags={weapons:[{id:"w",ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}}]};const w=flags.weapons[0];
 const s2=scoped("ht_triplex");assert.notEqual(s.type.key,s2.type.key);
 const changed=bindMultishotDefinition(s.type,{...s.d,count:20});assert.notEqual(changed.key,s.type.key);
 for(const type of [s.type,s2.type])applyInventoryOperation(w,"add-stock",{ammoKey:type.key,amount:10},{allowedTypes:[s.type,s2.type]});
 let i=0;applyInventoryOperation(w,"add-magazines",{capacity:5,amount:2},{makeId:()=>"m"+(++i)});
 for(let j=0;j<2;j++)applyInventoryOperation(w,"load",{magazineId:"m"+(j+1),ammoKey:[s.type,s2.type][j].key,amount:5},{allowedTypes:[s.type,s2.type]});
 applyInventoryOperation(w,"install",{magazineId:"m1"});
 const actor={id:"a",isOwner:true,getFlag:()=>structuredClone(flags),setFlag:async(_s,_k,value)=>{flags=structuredClone(value);}};
 const execute={weaponId:"w",attackId:"spend",prepare:()=>({profile:p,amount:2}),execute:async()=>({rolled:true,message:{id:"m",setFlag:async()=>{}}})};
 await new AmmoService(actor).executeShot(execute);
 assert.equal(flags.weapons[0].ammunitionInventory.magazines[0].rounds,3);
 await new AmmoService(actor).executeShot(execute);
 assert.equal(flags.weapons[0].ammunitionInventory.magazines[0].rounds,3);
 applyInventoryOperation(flags.weapons[0],"install",{magazineId:"m2"});projectAmmoInventory(flags.weapons[0]);assert.equal(flags.weapons[0].totalAmmo,18);
 assert.equal(JSON.stringify(snap),serialized);assert.deepEqual(JSON.parse(serialized).profile.damage,p.damage);
});
test("owner decision service validates the individual definition without world writes",async()=>{
 const s=scoped(),actor={id:"a",isOwner:true,binding:c.binding,getFlag:(_s,k)=>local[k],setFlag:async(_s,k,v)=>{local[k]=structuredClone(v);}},weapon={id:"w",attackRef:{path:"system.ranged.x"}};let approvals={},local={};
 const runtime={game:{user:{id:"gm",isGM:true},settings:{get:()=>structuredClone(approvals),set:async(_m,_s,v)=>{approvals=structuredClone(v);}}},OleGURPSQOL:api};
 const a=await setAmmunitionApproval({actor,weapon,type:s.type,active:true,multishotDecision:s.d},runtime);assert.equal(a.multishotDecision.source,source);
 await assert.rejects(setAmmunitionApproval({actor,weapon,type:s.type,active:true,multishotDecision:{...s.d,count:5}},runtime),/MultishotSourceConflict/);
 await setAmmunitionApproval({actor,weapon,type:s.type,active:false},runtime);assert.equal(local.ammunitionDecisions[actorDecisionKey({actorId:"a",weaponId:"w",modeId,type:s.type})].active,false);assert.deepEqual(approvals,{});
});
test("new RU/EN controls actually load, show all thirteen labels and keep GM conditions closed",async()=>{
 for(const language of ["ru","en"]){const values=JSON.parse(await fs.readFile(new URL('../lang/'+language+'.json',import.meta.url),'utf8'));const dict={};
 const runtime={location:{},fetch:async()=>({ok:true,json:async()=>values}),game:{i18n:{lang:language,translations:dict,localize:k=>dict[k]??k}},foundry:{utils:{setProperty:(o,k,v)=>o[k]=v}}};
 await loadAutomaticAmmoTranslations(runtime);assert.deepEqual(dict,{});assert.equal(automaticAmmoText('MultishotDecision',language),automaticAmmoMessages.ru.MultishotDecision);
 const pending=automatic.prepare({modeId,base:c.base,variantId:"ht_duplex"});const html=multishotApprovalHTML({...pending.type,preparation:pending},language);assert.ok(html.includes('data-multishot-approval'));assert.ok(!/<details[^>]*\bopen/.test(html));assert.ok(!html.includes('undefined'));
 for(const id of MULTISHOT_IDS){assert.ok(values['OleGURPS.AutomaticAmmo.P3'+id]);assert.equal(automaticAmmoText('P3'+id,language),russianText('OleGURPS.AutomaticAmmo.P3'+id));}}
});
test("native load guards validate count, type, divisor, recoil and beanbag Acc without a second transformation",()=>{
 for(const id of ["ht_baton","ht_beanbag"]){const damage=id==="ht_baton"?"1d(0.5) cr":"1d(0.2) cr";
  const r=effect(id,{damage,acc:0},{nativeVariant:id,nativeDamage:damage});assert.equal(r.nativeSafe,true);assert.equal(r.formula,damage+" dkb");assert.equal(r.rules.costPerShot,2);
  assert.equal(effect(id,{damage:"4d pi+"},{nativeVariant:id,nativeDamage:"4d pi+"}).nativeSafe,false);}
 assert.equal(effect("ht_beanbag",{damage:"1d(0.2) cr",acc:3},{nativeVariant:"ht_beanbag",nativeDamage:"1d(0.2) cr"}).nativeSafe,false);
 for(const id of ["ht_duplex","ht_triplex"]){const n=id==="ht_duplex"?2:3,damage="3d pi+";
  assert.equal(effect(id,{damage,rof:"3x"+n,rcl:1},{nativeVariant:id,nativeDamage:damage}).nativeSafe,true);
  assert.equal(effect(id,{damage,rof:"3x9",rcl:1},{nativeVariant:id,nativeDamage:damage}).nativeSafe,false);}
 const shot=effect("ht_shotshell",{damage:"1d pi",rof:"3x9",rcl:1},{nativeVariant:"ht_shotshell",nativeDamage:"1d pi"});assert.equal(shot.nativeSafe,true);assert.equal(shot.formula,"1d pi");
 assert.equal(effect("ht_shotshell",{damage:"1d pi",rof:"3x9",rcl:2},{nativeVariant:"ht_shotshell",nativeDamage:"1d pi"}).nativeSafe,false);
 const mixed=effect("ht_buck_and_ball",{rof:"3x4",rcl:1},{nativeVariant:"ht_buck_and_ball",nativeDamage:raw.damage,count:3});assert.equal(mixed.nativeSafe,true);assert.equal(mixed.rules.hitAllocation.pellet,"1d+1 pi");
 assert.equal(effect("ht_abf",{damage:"6d cr ex [2d cut]"},{nativeVariant:"ht_abf",nativeDamage:"6d cr ex [2d cut]",burstDistance:50}).nativeSafe,false);
});
test("non-shotgun baton and beanbag use confirmed solid impact, not explosive or arbitrary native source",()=>{
 for(const id of ["ht_baton","ht_beanbag"]){const r=effect(id,{damage:"4d cr"},{platform:"grenade_launcher",baselineKind:"solid"});assert.equal(r.nativeSafe,true);assert.ok(r.formula.endsWith(' cr dkb'));
  assert.equal(effect(id,{damage:"4d cr ex"},{platform:"grenade_launcher",baselineKind:"solid"}).nativeSafe,false);}
});

test("solid impact is selectable in the existing GM control and native dkb is never doubled again",()=>{
 for(const id of ["ht_baton","ht_beanbag"]){const c=contract(id,{platform:"grenade_launcher",baselineKind:"solid"});
  const html=multishotApprovalHTML({recipe:{variantId:id},preparation:{facts:c.review.facts},multishotDecision:c.d},"ru");
  assert.ok(html.includes('value="solid" selected'));assert.ok(html.includes(automaticAmmoMessages.ru.MultishotSolidBaseline));
  const damage=id==="ht_baton"?"1d(0.5) cr dkb":"1d(0.2) cr dkb";
  const r=effect(id,{damage,acc:0},{nativeVariant:id,nativeDamage:damage});assert.equal(r.nativeSafe,true);assert.equal(r.formula,damage);assert.equal(r.transformations.filter(t=>t.applied).length,0);
 }
});
test("approved rubber load is available through the existing window; NP recipes remain distinct and known caliber cannot change",()=>{
 const mid="WkzlenFdgtlwesK-q",native=context(mid),pending=automatic.prepare({modeId:mid,base:native.base,variantId:"ht_rubber_shot"});
 assert.equal(pending.facts.caliberMm,18.5);
 const d={designConfirmed:true,platform:"shotgun",source,caliberMm:18.5,availabilityTL:8,count:6,elementMm:5};
 const type=bindMultishotDefinition(pending.type,d),actor={id:"a",binding:native.binding,system:{ranged:{mode:native.raw}}},weapon={id:"w",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{version:1,stocks:[{key:type.key,type,rounds:0}],magazines:[],installedId:null}};
 const a={active:true,actorId:"a",weaponId:"w",modeId:mid,ammoId:type.ammoId,variantId:"ht_rubber_shot",recipeId:type.recipe.customId,fingerprint:recipeFingerprint(type),multishotDecision:d};
 const original=game.settings.get;game.settings.get=(_s,k)=>k==="ammunitionApprovals"?{[approvalKey({actorId:"a",weaponId:"w",modeId:mid,type})]:a}:"permissive";
 try{const choice=availableAmmoTypes(actor,weapon,api,"ru").find(t=>t.key===type.key);assert.equal(choice.unavailable,false);assert.ok(choice.label.includes(automaticAmmoMessages.ru.P3ht_rubber_shot));
  const p=resolver.resolve({actorId:"a",weaponId:"w",rawAttack:native.raw,binding:native.binding,ammunition:{type},approval:a,profilePolicy:"permissive"});assert.equal(p.damage.nativeSafe,true);assert.equal(p.effective.rof,"1x6");assert.equal(p.damage.rules.projectiles.b409Eligible,false);
  assert.equal(automatic.prepare({modeId:mid,base:native.base,variantId:"ht_rubber_shot",savedType:type,approval:{...a,multishotDecision:{...d,caliberMm:40}}}).state,"complete");
 }finally{game.settings.get=original;}
});
test("bounded plus-P evidence proves the 86 additions, preserves old 284 and does not call the general audit",async()=>{
 const d=readAuditFixture('ht64-multishot-plus-p-diagnostic');
 assert.equal(d.examined,511);assert.equal(d.oldReadyPreserved,284);assert.equal(d.worldReady,370);assert.deepEqual(d.lost,[]);assert.equal(d.newReady.length,86);assert.deepEqual(d.categories,{B:79,G:7});assert.equal(d.derivedAggregate,1308);assert.equal(d.exactDelta86,true);
 assert.equal(new Set(d.newReady.map(x=>x.modeId+'|'+x.ammoId)).size,86);
});

test("saved compound native load remains unavailable and explains the actual reason in RU and EN",()=>{
 const damage="3d pi [1d cut]",s=scoped("ht_duplex",{nativeVariant:"ht_duplex",nativeDamage:damage,nativeRoF:"3x2",nativeRcl:"1"});
 const actor={id:"a",binding:c.binding,system:{ranged:{mode:{...c.raw,damage,rof:"3x2",rcl:"1"}}}};
 const weapon={id:"w",attackRef:{path:"system.ranged.mode"},ammunitionInventory:{version:1,stocks:[{key:s.type.key,type:s.type,rounds:0}],magazines:[],installedId:null}};
 const original=game.settings.get;game.settings.get=(_s,k)=>k==="ammunitionApprovals"?{[approvalKey({actorId:"a",weaponId:"w",modeId,type:s.type})]:s.approval}:"permissive";
 try{for(const lang of ["ru","en"]){const choice=ammunitionCandidates(actor,weapon,api,lang).find(t=>t.key===s.type.key);assert.equal(availableAmmoTypes(actor,weapon,api,lang).find(t=>t.key===s.type.key).unavailable,true);assert.equal(choice.unavailable,true);assert.equal(choice.reason,ammoEffectMessages.ru['unsupported-or-compound-native-damage']);}}
 finally{game.settings.get=original;}
});
