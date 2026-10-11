import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { catalogs, compatibility, automatic, resolver, context, inventoryFixture, api } from "./fixtures/ht-special-context.mjs";
import { auditPlusPCategoryB } from "../scripts/audits/ht-plus-p-category-b.mjs";
import { parseRateOfFire, parseRecoil, resolveMultipleProjectileFire, FireService } from "../scripts/tools/fire-service.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { calculateHitsFromMargin } from "../scripts/tools/prepared-gga-roll.js";
import { shotgunProjectileKind } from "../scripts/tools/shotgun-ammunition.js";
import { availableAmmoTypes, ammoManagementHTML } from "../scripts/tools/ammo-management-app.js";
import { ammunitionConditionTexts, shotAmmunitionConditions } from "../scripts/tools/damage-shot-link.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { recipeFingerprint, setAmmunitionApproval } from "../scripts/tools/ammunition-approval-service.js";
import { loadAutomaticAmmoTranslations, automaticAmmoText } from "../scripts/tools/automatic-ammunition-localization.js";
import { readStandaloneAttack } from "../scripts/tools/standalone-attack-service.js";
import { StandaloneWeaponService, StandaloneWeaponDraft } from "../scripts/tools/standalone-weapon-service.js";
const baseline = JSON.parse(await fs.readFile(new URL("../docs/audit/ht-plus-p-blockers.json", import.meta.url), "utf8"));
const awaitHistoricalCategoryB = await fs.readFile(new URL("../docs/audit/ht-plus-p-category-b.json", import.meta.url), "utf8");
const b = baseline.rows.filter(r => r.primaryCategory === "B");
const win = "W19ooSM10ivSwlXSP", usas = "W2EHajHoWWSlF8B6z", vickers = "W1h1yefMQlw39LdSu";
const report = auditPlusPCategoryB({ catalogs, compatibility, baseline });
test("B boundary: historical 85/21 retained; all 106 calculable; E/F closed and seven reviewed G admitted", () => {
  assert.equal(report.examined,511); assert.equal(report.rows.length,106); assert.equal(report.previousReady,284);
  assert.equal(report.newNumericProfiles,106); assert.equal(report.newReadyWithoutLoadingConfirmation,79);
  assert.equal(report.readyWithoutLoadingConfirmation,370); assert.equal(report.readyAfterRequiredGMConfirmations,390);
  assert.equal(report.incompleteB,0); assert.equal(report.loadingChecks,27); assert.equal(report.standaloneOnlyBlockedPairs,6);
  assert.deepEqual(report.unchangedClosed,{E:{count:12,opened:0},F:{count:98,opened:0},G:{count:11,opened:7}});
  assert.ok(report.all.every(r=>r.rulesStatus==='undetermined'));
  const historical=JSON.parse(awaitHistoricalCategoryB);
  assert.equal(historical.newNumericProfiles,85);assert.equal(historical.incompleteB,21);
  for(const row of report.rows) { assert.ok(row.source); assert.equal(row.numericReady,true); }
});
test("Vickers native 10! is ready, HT166 damage/ranges/ST are computed without pressure or caliber", () => {
  const row=report.rows.find(r=>r.modeId===vickers);
  assert.equal(row.effective.damage,'7d+1 pi');assert.equal(row.effective.range,'880/3630');assert.equal(row.effective.st,'20M');assert.equal(row.effective.rof,'10!');
  const c=context(vickers),type=automatic.prepare({modeId:vickers,base:c.base,variantId:'ht_plus_p'}).type;
  const p=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,ammunition:{type},profilePolicy:'permissive'});
  assert.equal(p.damage.rules.costMultiplier,1.5);assert.equal(p.damage.rules.pressure.possibleMalfPenalty,-1);
  assert.equal(p.damage.rules.pressure.automaticActionConsequences,'unresolved-Malf-and-RoF');
});
test("physical and pellet RoF remain separate for six patterns and all native delimiters", () => {
  const service=new FireService({});
  for(const [n,m] of [[1,9],[2,9],[3,9],[6,9],[2,7],[2,13]])for(const delimiter of ['x','X','\u00d7','*']) {
    const raw=n+delimiter+m,p=parseRateOfFire(raw);assert.equal(p.baseRoF,n);assert.equal(p.projectileMultiplier,m);
    for(let shots=1;shots<=n;shots++) {const f=resolveMultipleProjectileFire({rof:raw,physicalShots:shots,physicalDistance:20,halfDamageRange:40});
      assert.equal(f.rawRoF,raw);assert.equal(f.physicalShotsMax,n);assert.equal(f.projectilesPerShot,m);assert.equal(f.effectiveRoF,shots*m);}
  }
  assert.equal(service.calculateRapidFireBonus(9),2);assert.equal(service.calculateRapidFireBonus(18),4);
  assert.equal(parseRateOfFire('10!').modes[0].minRoF,3);assert.equal(parseRateOfFire('3#').source,'3#');
});
test("HT79 composite Rcl follows confirmed shot/slug identity, never range or a fraction",()=>{
  for(const recoil of [3,4,5,7]) {assert.equal(parseRecoil('1/'+recoil,{projectileKind:'shot',extremelyClose:true}),1);
    assert.equal(parseRecoil('1/'+recoil,{projectileKind:'slug'}),recoil);assert.equal(parseRecoil('1/'+recoil),null);}
  assert.equal(parseRecoil('2'),2);assert.equal(parseRecoil('1/5 garbage',{projectileKind:'shot'}),null);
  const mode=catalogs.getMode(win),record=catalogs.getAmmoItem('ht',context(win).base.ammoId);
  const input={record,mode,identity:{status:'confirmed',book:'ht'},nativeSafe:true};
  assert.equal(shotgunProjectileKind(input),'shot');assert.equal(shotgunProjectileKind({...input,identity:{status:'legacy',book:'ht'}}),null);
  assert.equal(shotgunProjectileKind({...input,record:{...record,projectile_kind:'slug'}}),'slug');
  assert.equal(shotgunProjectileKind({...input,identity:{...input.identity,recipe:{variantId:'ht_rifled_slug'}},construction:{status:'undetermined'}}),null);
});
test("B409 boundary is strict and uses current +P HalfD; pellets remain independent hits",()=>{
  for(const half of [40,44])for(const m of [7,9,13]) {
    for(const [distance,close] of [[half*.1-0.001,true],[half*.1,false],[half*.1+0.001,false]]) {
      const f=resolveMultipleProjectileFire({rof:'2x'+m,physicalShots:2,physicalDistance:distance,halfDamageRange:half});
      assert.equal(f.extremelyClose,close);assert.equal(f.effectiveRoF,close?2:2*m);assert.equal(f.closeDamageMultiplier,close?Math.floor(m/2):null);
    }
  }
  assert.equal(resolveMultipleProjectileFire({rof:'2x9',physicalShots:1,physicalDistance:null,halfDamageRange:44}).extremelyClose,false);
  assert.equal(calculateHitsFromMargin(9,1,4,{failure:false}),5);assert.equal(calculateHitsFromMargin(18,1,-1,{failure:true}),0);
});
test("common native execution rejects unresolved composite Rcl before rolls and resource writes",async()=>{
  const c=context(win),profile=resolver.resolve({actorId:'actor',rawAttack:c.raw,
    ammunition:{type:{source:'legacy',name:'Slug (unverified label)'}}});
  const service=new FireService({actor:{id:'actor'}});
  await assert.rejects(service.executeRangedAttack({rcl:'1/5'},{attackProfile:profile,rcl:1}),/подтверждённый тип снаряда/);
});
test("B409 calculation report uses completed +P Damage, preserving raw and native per-pellet damage",async()=>{
  const source=await fs.readFile(new URL('../scripts/tools/ammo.js',import.meta.url),'utf8');
  const first=source.indexOf('function getCloseDamageReport('),last=source.indexOf('function calculateRapidFireBonus(',first);
  const report=runInNewContext('('+source.slice(first,last).trim()+')',{fireService:new FireService({}),getAttackDamageFormula:a=>a.data.damage});
  const raw={damage:'2d-1 pi',range:'40/800',st:'11\u2020'},damage=resolveAmmunitionEffects({raw,variantId:'ht_plus_p',baseStatus:'compatible',constructionStatus:'world-policy'});
  assert.equal(damage.formula,'2d pi');const result=report({data:raw},{extremelyClose:true,closeDamageMultiplier:6},{damage});
  assert.equal(result.formula,'12d');assert.equal(result.source,'2d pi');assert.equal(raw.damage,'2d-1 pi');assert.equal(damage.formula,'2d pi');
});
test("GM physical RoF decision preserves pellets and !/#, without changing Rcl",()=>{
  for(const [raw,expected] of [['2x9','3x9'],['2\u00d79','3\u00d79'],['10!','3!'],['3#','3#'],['2','3']]) {
    const p=resolveAmmunitionEffects({raw:{damage:'1d+1 pi',range:'40/800',st:'11\u2020',rof:raw,rcl:'1/5'},variantId:'ht_plus_p',baseStatus:'compatible',constructionStatus:'gm-approved',facts:{plusPDecision:{rof:3}}});
    assert.equal(p.effectiveChanges.rof,expected);assert.equal(p.effectiveChanges.rcl,undefined);
  }
});
test("powder-and-shot requires GM confirmation before stock/load; exact confirmation persists in old snapshot",async()=>{
  const row=b.find(r=>r.GM.loadingCheckRequired),c=context(row.modeId),type=automatic.prepare({modeId:row.modeId,base:c.base,variantId:'ht_plus_p'}).type;
  assert.ok(type);const f=inventoryFixture(row.modeId,'ht_plus_p');let settings={};
  const runtime={game:{user:{isGM:true,id:'gm'},settings:{get:()=>settings,set:async(s,k,v)=>{settings=structuredClone(v);}}},OleGURPSQOL:api};
  const input={actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type},profilePolicy:'permissive'};
  assert.equal(resolver.resolve(input).damage.reason,'plus-p-loading-check-required');
  const approval=await setAmmunitionApproval({actor:f.actor,weapon:f.state().weapons[0],type,active:true,plusPDecision:{loadingCheckPassed:true}},runtime);
  assert.equal(approval.plusPDecision.loadingConfirmation.gmId,'gm');assert.equal(approval.plusPDecision.loadingConfirmation.perShot,false);
  const p=resolver.resolve({...input,approval}),shot=createShotSnapshot(p,{attackId:'loaded',messageId:'msg'}),saved=JSON.stringify(shot);
  assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.rules.loadingCheck.perShot,false);
  await setAmmunitionApproval({actor:f.actor,weapon:f.state().weapons[0],type,active:false},runtime);
  assert.equal(JSON.stringify(shot),saved);assert.equal(JSON.parse(saved).profile.damage.rules.pressure.decision.loadingConfirmation.id,approval.plusPDecision.loadingConfirmation.id);
  const oldApi=globalThis.OleGURPSQOL,oldGet=game.settings.get;globalThis.OleGURPSQOL=api;
  try {game.settings.get=(s,k)=>k==='ammunitionApprovals'?{}:'permissive';const types=availableAmmoTypes(f.actor,f.state().weapons[0],api,'ru'),p=types.find(t=>t.recipe?.variantId==='ht_plus_p');assert.equal(p.unavailable,true);
    assert.match(ammoManagementHTML(f.state().weapons[0],{ammoKey:p.key,magazineId:'m2',language:'ru'},types),/data-inventory-action="load" disabled/);
    const before=JSON.stringify(f.state());
    await assert.rejects(f.service.inventoryTransaction('weapon','load',{magazineId:'m2',ammoKey:p.key,amount:1},{allowedTypes:types}),/TypeUnavailable/);
    assert.equal(JSON.stringify(f.state()),before);
  }finally{globalThis.OleGURPSQOL=oldApi;game.settings.get=oldGet;}
});
test("ordinary conventional-case legacy stock remains distinct and unload/deletion returns its own rounds with ready +P",async()=>{
  const f=inventoryFixture(win,'ht_plus_p'),regular=context(win).base;
  const heavy={...regular,ammoId:'ht_12_gauge_2_75_18_5x70mmr_heavy_load'};
  const {ammoTypeKey}=await import('../scripts/tools/ammo-inventory.js');regular.key=ammoTypeKey(regular);heavy.key=ammoTypeKey(heavy);
  assert.notEqual(regular.key,heavy.key);const types=[regular,heavy];
  await f.service.inventoryTransaction('weapon','add-stock',{ammoKey:regular.key,amount:3},{allowedTypes:types});
  await f.service.inventoryTransaction('weapon','add-stock',{ammoKey:heavy.key,amount:7},{allowedTypes:types});
  await f.service.inventoryTransaction('weapon','load',{magazineId:'m2',ammoKey:heavy.key,amount:4},{allowedTypes:types});
  const previousTotal=f.state().weapons[0].totalAmmo;
  await f.service.inventoryTransaction('weapon','delete-magazine',{magazineId:'m2'});
  const state=f.state().weapons[0];assert.equal(state.totalAmmo,previousTotal);
  assert.equal(state.ammunitionInventory.stocks.find(s=>s.key===heavy.key).rounds,7);
  assert.equal(state.ammunitionInventory.stocks.find(s=>s.key===regular.key).rounds,3);
  assert.equal(automatic.prepare({modeId:win,base:heavy,variantId:'ht_plus_p'}).state,'complete');
});
test("shotgun stock/spend once per physical shell, magazine switch/reload preserve old Damage and identity",async()=>{
  for(const modeId of [win,usas])for(const shots of [1,2]) {
    const f=inventoryFixture(modeId,'ht_plus_p'),c=context(modeId);
    const result=await f.service.executeShot({weaponId:'weapon',attackId:modeId+shots,prepare:({ammunition})=>({profile:resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition,profilePolicy:'permissive',context:{shotgun:{rawRoF:c.raw.rof,projectilesPerShot:9,physicalDistance:4,halfDamageRange:44,extremelyClose:true,closeDamageMultiplier:4}}}),amount:shots}),execute:async()=>({rolled:true,message:{id:'attack'}})});
    assert.equal(result.spent,shots);assert.equal(f.state().weapons[0].totalAmmo,10-shots);assert.equal(result.profile.effective.ammunitionProjectileKind,'shot');
    const saved=JSON.stringify(result.snapshot);await f.service.inventoryTransaction('weapon','install',{magazineId:'m2'});assert.equal(f.state().weapons[0].totalAmmo,10-shots);
    assert.equal(JSON.stringify(result.snapshot),saved);assert.equal(JSON.parse(saved).profile.damage.formula,'1d+1 pi');
    const msg={id:'attack',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:result.snapshot}}};
    assert.match(shotAmmunitionConditions(msg).join(' '),/B409/);assert.deepEqual(shotAmmunitionConditions({...msg,isContentVisible:false}),[]);
  }
});
test("missing Acc and Bulk remain precise standalone-only blockers; composite Rcl is accepted",async()=>{
  const actor={id:'standalone',isOwner:true,system:{attributes:{DX:{value:12}},skills:{}},flags:{},getFlag(s,k){return this.flags[s]?.[k];},async setFlag(s,k,v){(this.flags[s]??={})[k]=structuredClone(v);}};
  for(const modeId of [win,...b.filter(r=>r.downstreamStandaloneReadiness.restrictions.some(v=>['Acc','Bulk'].includes(v))).map(r=>r.modeId)]){
    const eq=catalogs.getEquipmentForMode(modeId),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(eq.equipment_id);draft.modeIds=new Set([modeId]);
    const record=await new StandaloneWeaponService(actor,catalogs).save(draft);const attack=readStandaloneAttack(actor,record.id,modeId);
    if(modeId===win)assert.equal(attack.readinessReason,null);else{assert.match(attack.readinessReason,/Acc|Bulk/);assert.ok(attack.data.acc===null||attack.data.bulk===null);}
  }
});
test("Malf and native B409 GM operation appear before the attack; no damage/DR double scaling",async()=>{
  const text=await fs.readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');assert.match(text,/data-ammunition-conditions/);
  assert.match(text,/_ammunitionConditionsHTML\(this\._getRapidFireState\(\)\)/);
  const c=context(vickers),p=automatic.prepare({modeId:vickers,base:c.base,variantId:'ht_plus_p'});
  const damage=resolver.resolve({actorId:'a',rawAttack:c.raw,binding:c.binding,ammunition:{type:p.type},profilePolicy:'permissive'}).damage;
  assert.match(ammunitionConditionTexts(damage.support.manual,'ru').join(' '),/Malf -1/);
  assert.equal(damage.rules.pressure.weaponQuality,null);assert.equal(damage.support.status,'GM-MEDIATED');
  assert.match(automaticAmmoText('ShotgunCloseGM','ru',{pellets:9,factor:4}),/автоматически Damage\/DR не масштабируются/);
});
test("new diagnostics load RU/EN even with cached older keys, without changing language",async()=>{
  for(const language of ['ru','en']){const data=JSON.parse(await fs.readFile(new URL('../lang/'+language+'.json',import.meta.url),'utf8')),translations={'OleGURPS.AutomaticAmmo.PlusPDecision':'old'};
    const runtime={location:{},fetch:async()=>({ok:true,json:async()=>data}),game:{i18n:{lang:language,translations,localize:key=>translations[key]??key}},foundry:{utils:{setProperty:(o,k,v)=>o[k]=v}}};
    await loadAutomaticAmmoTranslations(runtime);for(const key of ['ShotgunCloseGM','ProjectileRclRequired','plus-p-case-construction-unverified'])assert.equal(translations['OleGURPS.AutomaticAmmo.'+key],data['OleGURPS.AutomaticAmmo.'+key]);assert.equal(runtime.game.i18n.lang,language);
  }
});
