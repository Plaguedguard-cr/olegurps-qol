import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { StandaloneWeaponService } from "../scripts/tools/standalone-weapon-service.js";
import { initializeInstalledMagazine, applyInventoryOperation, inventoryTotal } from "../scripts/tools/ammo-inventory.js";
import { approvalKey, recipeFingerprint, actorDecisionKey } from "../scripts/tools/ammunition-approval-service.js";
import { ammoCaption } from "../scripts/tools/ammo-caption.js";
import { CatalogService } from "../scripts/catalog-service.js";
import { moduleText, moduleMessage } from "../scripts/localization.js";
import { russianUI } from "../scripts/russian-ui.js";
import { ammoText } from "../scripts/tools/ammo-management-localization.js";
import { automaticAmmoText } from "../scripts/tools/automatic-ammunition-localization.js";
import { f3Text } from "../scripts/tools/ammunition-f3-localization.js";
import { MeleeAssistantStateService } from "../scripts/tools/melee-assistant-state.js";
import { criticalTableSelectionHTML } from "../scripts/tools/critical-table-selection.js";

globalThis.foundry = { utils: { deepClone: structuredClone } };
const type = { key:"ht:ammo-item:round",source:"catalog",book:"ht",kind:"ammo-item",ammoId:"round",name:"Round" };
function carrier(id="weapon", standaloneWeaponId=null) {
  return { id, ...(standaloneWeaponId ? {standaloneWeaponId,standaloneModeId:"primary"} : {}),
    ammunitionInventory:{version:1,stocks:[{key:type.key,type:structuredClone(type),rounds:7}],
      magazines:[{id:id+"-first",weaponId:id,capacity:10,rounds:0,ammoKey:null},
        {id:id+"-second",weaponId:id,capacity:30,rounds:30,ammoKey:type.key}],installedId:null} };
}
function fixture(weapons=[carrier()]) {
  const record={id:"standalone",name:"Example",type:"ranged",revision:1,source:{equipmentId:"fixture"},modes:[{modeId:"primary",snapshot:{}},{modeId:"secondary",snapshot:{}}],resourceLinks:{ammoWeaponId:"weapon"}};
  const flags={world:{gurpsAmmoManager:{version:10,weapons:structuredClone(weapons),shotReceipts:{old:{damage:"5d pi",spent:1}},custom:"kept"}},"olegurps-qol":{standaloneWeapons:{version:1,weapons:weapons.some(w=>w.standaloneWeaponId==='standalone')?[record]:[]}}};
  const writes=[];
  const actor={id:"actor",isOwner:true,system:{ranged:{},skills:{}},getFlag:(s,k)=>structuredClone(flags[s]?.[k]),
    setFlag:async(s,k,v)=>{writes.push({set:[s,k]});flags[s]??={};flags[s][k]=mergeFlags(flags[s][k],v);},
    update:async changes=>{writes.push(structuredClone(changes));for(const [path,v] of Object.entries(changes)){const[,s,k]=path.split('.');flags[s]??={};if(k.startsWith('-='))delete flags[s][k.slice(2)];else flags[s][k]=mergeFlags(flags[s][k],v);}}};
  let approvals={};
  globalThis.game={user:{isGM:true},i18n:{lang:"en",localize:()=>"OLD ENGLISH"},settings:{get:()=>structuredClone(approvals),set:async(_s,_k,v)=>{approvals=structuredClone(v);}}};
  return {actor,flags,writes,record,ammo:new AmmoService(actor),standalone:new StandaloneWeaponService(actor),get approvals(){return approvals;},set approvals(v){approvals=v;}};
}
function mergeFlags(before, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(patch);
  const result = structuredClone(before ?? {});
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith("-=")) delete result[key.slice(2)];
    else result[key] = mergeFlags(result[key], value);
  }
  return result;
}
test("recursive Foundry flag merge removes only owned active links and restores them on failure", async () => {
  for (const fail of [false, true]) {
    const f = fixture([carrier("weapon", "standalone"), carrier("other")]);
    const own = "uuid:olegurps:standalone:primary", foreign = "uuid:olegurps:foreign:primary";
    const encode = key => "key:" + encodeURIComponent(key).replaceAll(".", "%2E");
    Object.assign(f.flags.world.gurpsAmmoManager, {
      governingSkills: { [own]: {kind:"standalone", weaponId:"standalone"}, [foreign]: {kind:"standalone", weaponId:"foreign"} },
      attackOverrides: {[own]: {damage:"1d"}, [foreign]: {damage:"2d"}},
      sprayingFireSessions: {own:{actorId:"actor",weaponKey:"weapon"}, other:{actorId:"actor",weaponKey:"other"}}
    });
    f.flags.world.olegurpsMeleeAssistant = {selectedAttackKey:own,attacks:{[encode(own)]:{saved:1},[encode(foreign)]:{saved:2}}};
    const before = structuredClone(f.flags);
    if (fail) {const update=f.actor.update;let calls=0;f.actor.update=async changes=>{await update(changes);if(++calls===1)throw Error("write failed");};}
    if (fail) {await assert.rejects(f.standalone.remove("standalone"),/write failed/);assert.deepEqual(f.flags,before);}
    else {
      await f.standalone.remove("standalone");
      const state=f.flags.world.gurpsAmmoManager;
      assert.deepEqual(state.governingSkills,{[foreign]:before.world.gurpsAmmoManager.governingSkills[foreign]});
      assert.deepEqual(state.attackOverrides,{[foreign]:{damage:"2d"}});
      assert.deepEqual(state.sprayingFireSessions,{other:{actorId:"actor",weaponKey:"other"}});
      assert.deepEqual(f.flags.world.olegurpsMeleeAssistant,{selectedAttackKey:"",attacks:{[encode(foreign)]:{saved:2}}});
      assert.equal(f.writes.length,1);
    }
  }
});
test("first stable physical magazine is persisted once, even empty before a full magazine",async()=>{
  const f=fixture(),before=f.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory;
  let state=await f.ammo.loadState();assert.equal(state.weapons[0].loadedIndex,0);assert.equal(state.weapons[0].capacity,10);
  assert.equal(f.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.installedId,"weapon-first");
  assert.deepEqual(state.weapons[0].ammunitionInventory.stocks,before.stocks);assert.deepEqual(state.weapons[0].ammunitionInventory.magazines,before.magazines);
  assert.equal(state.weapons[0].totalAmmo,37);assert.equal(f.ammo.readAttackAmmunition("weapon").available,0);
  assert.equal(f.writes.length,1);await f.ammo.loadState();await f.ammo.inventoryTransaction("weapon","initialize");assert.equal(f.writes.length,1);
  await f.ammo.inventoryTransaction("weapon","install",{magazineId:"weapon-second"});
  state=await new AmmoService(f.actor).loadState();assert.equal(state.weapons[0].loadedIndex,1);assert.equal(f.ammo.readAttackAmmunition("weapon").available,30);
  assert.equal(initializeInstalledMagazine(state.weapons[0]),false);
});
test("invalid selection alone selects first; malformed counts and ownership stay untouched",()=>{
  for(const installedId of [null,undefined,"missing",9]){const w=carrier();w.ammunitionInventory.installedId=installedId;assert.equal(initializeInstalledMagazine(w),true);assert.equal(w.loadedIndex,0);assert.equal(inventoryTotal(w.ammunitionInventory),37);}
  for(const modify of [w=>w.ammunitionInventory.magazines[0].weaponId="other",w=>w.ammunitionInventory.stocks[0].rounds=-1,w=>w.ammunitionInventory.magazines[1].rounds=31]){const w=carrier();modify(w);const before=structuredClone(w);assert.equal(initializeInstalledMagazine(w),false);assert.deepEqual(w,before);}
});
test("legacy invalid index alone initializes without migrating quantities or creating magazines",async()=>{
  const legacy={id:"legacy",totalAmmo:30,capacity:30,magazines:[0,20],loadedIndex:99,ammoType:"Saved"};
  const f=fixture([legacy]);const state=await f.ammo.loadState();assert.equal(state.weapons[0].loadedIndex,0);assert.equal(state.weapons[0].ammunitionInventory,undefined);
  assert.deepEqual(state.weapons[0].magazines,legacy.magazines);assert.equal(state.weapons[0].totalAmmo,30);assert.equal(f.writes.length,1);
});
test("deleting installed magazine returns rounds and selects first remaining stable ID",()=>{
  const w=carrier();w.ammunitionInventory.installedId="weapon-second";
  applyInventoryOperation(w,"delete-magazine",{magazineId:"weapon-second"});assert.equal(w.ammunitionInventory.installedId,"weapon-first");assert.equal(w.loadedIndex,0);
  assert.equal(inventoryTotal(w.ammunitionInventory),37);assert.equal(w.ammunitionInventory.stocks[0].rounds,37);
  applyInventoryOperation(w,"delete-magazine",{magazineId:"weapon-first"});assert.equal(w.ammunitionInventory.installedId,null);assert.deepEqual(w.magazines,[]);
});
test("all owned channels are deleted in one Actor update; other resources, history and system survive",async()=>{
  const first=carrier("weapon","standalone"),second=carrier("weapon:secondary","standalone");second.standaloneModeId="secondary";
  const other=carrier("other");const f=fixture([first,second,other]),stale=await f.ammo.loadState(),beforeSystem=structuredClone(f.actor.system);
  const receipts=structuredClone(f.flags.world.gurpsAmmoManager.shotReceipts), preservedOther=structuredClone(stale.weapons[2]);f.writes.length=0;
  await f.standalone.remove("standalone");assert.equal(f.writes.length,1);
  assert.deepEqual(Object.keys(f.writes[0]),["flags.olegurps-qol.standaloneWeapons","flags.world.gurpsAmmoManager"]);
  assert.deepEqual(f.flags.world.gurpsAmmoManager.weapons,[preservedOther]);assert.deepEqual(f.flags.world.gurpsAmmoManager.shotReceipts,receipts);assert.deepEqual(f.actor.system,beforeSystem);
  await f.ammo.saveState(stale);assert.deepEqual(f.flags.world.gurpsAmmoManager.weapons,[preservedOther]);
  assert.equal(await f.standalone.remove("standalone"),null);await f.ammo.removeStandaloneWeapon("weapon");
  await assert.rejects(f.ammo.inventoryTransaction("weapon","add-magazines",{capacity:30,amount:1}),/WeaponMissing/);
});
test("ambiguous owner, shared IDs or malformed inventory blocks deletion before mutation",async()=>{
  for(const alter of [f=>f.flags.world.gurpsAmmoManager.weapons.push({...carrier("weapon"),standaloneWeaponId:"another"}),
    f=>f.flags.world.gurpsAmmoManager.weapons[0].ammunitionInventory.magazines[0].weaponId="other",
    f=>f.flags.world.gurpsAmmoManager.weapons[0].ammunitionReview={reason:"invalid"}]){
    const f=fixture([carrier("weapon","standalone")]);alter(f);const before=structuredClone(f.flags);
    await assert.rejects(f.standalone.remove("standalone"),/неоднозначны/);assert.deepEqual(f.flags,before);assert.equal(f.writes.length,0);
  }
});
test("failed Actor update restores both branches before surfacing failure",async()=>{
  const f=fixture([carrier("weapon","standalone")]),before=structuredClone(f.flags),original=f.actor.update;let calls=0;
  f.actor.update=async changes=>{await original(changes);if(++calls===1)throw Error("write failed");};
  await assert.rejects(f.standalone.remove("standalone"),/write failed/);assert.deepEqual(f.flags,before);assert.equal(calls,2);
});
test("exact scoped approvals are cleaned; unrelated approvals remain; failed cleanup rolls Actor back",async()=>{
  for(const fail of [false,true]){
    const f=fixture([carrier("weapon","standalone")]),recipeType={...type,recipe:{variantId:"ht_plus_p",customId:"recipe"}};
    const key=approvalKey({actorId:"actor",weaponId:"weapon",modeId:"primary",type:recipeType});
    f.approvals={[key]:{actorId:"actor",weaponId:"weapon",modeId:"primary",ammoId:"round",recipeId:"recipe",fingerprint:recipeFingerprint(recipeType)},unrelated:{actorId:"else",weaponId:"else"}};
    const before=structuredClone(f.flags),beforeApprovals=structuredClone(f.approvals);
    if(fail)game.settings.set=async()=>{throw Error("world failed");};
    if(fail){await assert.rejects(f.standalone.remove("standalone"),/world failed/);assert.deepEqual(f.flags,before);assert.deepEqual(f.approvals,beforeApprovals);}
    else{await f.standalone.remove("standalone");assert.deepEqual(f.approvals,{unrelated:beforeApprovals.unrelated});}
  }
});
test("OWNER deletion cleans local decisions without GM or world writes; foreign resources and legacy data survive",async()=>{
  const f=fixture([carrier("weapon","standalone"),carrier("other")]),t={...type,recipe:{customId:"r"}};
  const key=approvalKey({actorId:"actor",weaponId:"weapon",modeId:"primary",type:t});f.approvals={[key]:{actorId:"actor",weaponId:"weapon",modeId:"primary",ammoId:"round",recipeId:"r"}};
  const own=actorDecisionKey({actorId:'actor',weaponId:'weapon',modeId:'primary',type:t});
  f.flags['olegurps-qol'].ammunitionDecisions={[own]:{actorId:'actor',weaponId:'weapon',modeId:'primary'},foreign:{actorId:'other',weaponId:'other',modeId:'primary'}};
  game.user={id:'owner',isGM:false};game.settings.set=async()=>{throw Error('WorldSettingWriteForbidden');};
  const before=structuredClone(f.flags),legacy=structuredClone(f.approvals);
  await f.standalone.remove('standalone');
  assert.equal(f.standalone.get('standalone'),null);
  assert.deepEqual(f.flags.world.gurpsAmmoManager.weapons,[before.world.gurpsAmmoManager.weapons[1]]);
  assert.deepEqual(f.flags.world.gurpsAmmoManager.shotReceipts,before.world.gurpsAmmoManager.shotReceipts);
  assert.deepEqual(f.flags['olegurps-qol'].ammunitionDecisions,{foreign:before['olegurps-qol'].ammunitionDecisions.foreign});
  assert.deepEqual(f.approvals,legacy);assert.equal(f.writes.length,2);
});
test("two instances of the same model and caliber retain independent resources on deletion", async () => {
  const f=fixture([carrier("weapon","standalone"),carrier("second","copy")]);
  f.flags["olegurps-qol"].standaloneWeapons.weapons.push({...structuredClone(f.record),id:"copy",resourceLinks:{ammoWeaponId:"second"}});
  const other=structuredClone(f.flags.world.gurpsAmmoManager.weapons[1]);
  await f.standalone.remove("standalone");
  assert.deepEqual(f.flags.world.gurpsAmmoManager.weapons,[other]);assert.equal(f.standalone.list()[0].id,"copy");
});
test("a user without ownership cannot delete the definition or any ammunition", async () => {
  const f=fixture([carrier("weapon","standalone")]),before=structuredClone(f.flags);
  f.actor.isOwner=false;game.user.isGM=false;
  await assert.rejects(f.standalone.remove("standalone"),/Нет прав/);assert.deepEqual(f.flags,before);assert.equal(f.writes.length,0);
});
test("a concurrent world approval change is retained and rolls Actor deletion back", async () => {
  const f=fixture([carrier("weapon","standalone")]),t={...type,recipe:{customId:"r"}};
  const key=approvalKey({actorId:"actor",weaponId:"weapon",modeId:"primary",type:t});
  f.approvals={[key]:{actorId:"actor",weaponId:"weapon",modeId:"primary",ammoId:"round",recipeId:"r"}};
  const before=structuredClone(f.flags),update=f.actor.update;
  f.actor.update=async patch=>{await update(patch);f.approvals={...f.approvals,foreign:{actorId:"else"}};};
  await assert.rejects(f.standalone.remove("standalone"),/ApprovalScopeRequired/);
  assert.deepEqual(f.flags,before);assert.ok(f.approvals.foreign);assert.ok(f.approvals[key]);
});
test("suppression lifecycle on a Token blocks deletion without orphaning its resources", async () => {
  const f=fixture([carrier("weapon","standalone")]),before=structuredClone(f.flags);
  game.scenes={contents:[{tokens:{contents:[{getFlag:()=>({active:{actorId:"actor",weaponKey:"weapon"}})}]}}]};
  await assert.rejects(f.standalone.remove("standalone"),/подавляющий огонь/);
  assert.deepEqual(f.flags,before);assert.equal(f.writes.length,0);
  game.scenes.contents[0].tokens.contents[0].getFlag=()=>({foreign:{actorId:"else",weaponKey:"weapon"}});
  await f.standalone.remove("standalone");assert.equal(f.standalone.get("standalone"),null);
});
test("an older melee preference window cannot restore a deleted standalone attack", async () => {
  const f=fixture([carrier("weapon","standalone")]);f.record.type="melee";
  const key="uuid:olegurps:standalone:primary",encoded="key:"+encodeURIComponent(key);
  const stale={version:5,selectedAttackKey:key,attacks:{[encoded]:{rapidStrikeMastery:true}}};
  f.flags.world.olegurpsMeleeAssistant=structuredClone(stale);
  await f.standalone.remove("standalone");await new MeleeAssistantStateService(f.actor).save(stale);
  assert.equal(f.flags.world.olegurpsMeleeAssistant.selectedAttackKey,"");
  assert.equal(Object.hasOwn(f.flags.world.olegurpsMeleeAssistant.attacks,encoded),false);
});
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL("../data/catalogs/"+url.split("/").at(-1),import.meta.url),"utf8"))})});
await catalogs.load();
test("caption uses confirmed cartridge identity then saved caliber, never a name heuristic",()=>{
  for(const name of ["Izhmash AK-47","KBP RPO-A","Girard LeMat"]){
    const e=catalogs.getCatalog("weapons").equipment.find(e=>e.name.startsWith(name)),mode=e.modes[0];
    const f=fixture(),r={...f.record,source:{equipmentId:e.equipment_id},equipmentSnapshot:e,modes:[{modeId:mode.weapon_mode_id,snapshot:mode}]};f.flags["olegurps-qol"].standaloneWeapons.weapons=[r];
    const w={id:"weapon",standaloneWeaponId:r.id,standaloneModeId:mode.weapon_mode_id,ammoType:""};
    assert.equal(ammoCaption(f.actor,w,catalogs),mode.ht_ammo_resolution?.status==="exact_chambering" ? catalogs.getAmmoItem("ht",mode.ht_ammo_item_ids[0]).name : mode.caliber_hint);
  }
  const f=fixture([carrier("weapon","standalone")]),w={id:"weapon",standaloneWeaponId:"standalone",standaloneModeId:"primary",name:"KBP RPO-A, 93mm"};
  assert.equal(ammoCaption(f.actor,w,catalogs),"Калибр не подтверждён");
  f.record.modes[0].snapshot.caliber_hint="saved caliber";assert.equal(ammoCaption(f.actor,w,catalogs),"saved caliber");
  assert.equal(ammoCaption(f.actor,{...w,standaloneModeId:"secondary"},catalogs),"Калибр не подтверждён");
  const bound={book:"ht",ammoId:"ht_7_62x39mm",confirmed:true,name:"7.62x39mm"};
  assert.equal(ammoCaption(f.actor,{...w,ammunitionBinding:bound},catalogs),"7.62x39mm");
});
test("Russian bundle exactly matches locale; English and poisoned caches cannot change UI",()=>{
  const ru=JSON.parse(fs.readFileSync(new URL("../lang/ru.json",import.meta.url),"utf8")),en=JSON.parse(fs.readFileSync(new URL("../lang/en.json",import.meta.url),"utf8"));
  assert.deepEqual(russianUI,ru);assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
  for(const language of ["ru","en",undefined]){const runtime={game:{i18n:{lang:language,localize:()=>"STILL ENGLISH"}}};const before=structuredClone(runtime.game.i18n.lang);
    assert.equal(ammoText("Load",runtime),"Снарядить");assert.equal(f3Text("retch",runtime),"Рвотные позывы");
    assert.match(criticalTableSelectionHTML(String,runtime),/Критические попадания/);assert.equal(runtime.game.i18n.lang,before);
  }
  assert.equal(moduleText("OleGURPS.AutomaticAmmo.F3Visibility",{penalty:-10}),"штраф видимости -10");
  assert.match(moduleText("missing-key"),/недоступен/);assert.match(moduleMessage("UnexpectedEnglishError"),/Не удалось/);
});
test("ammo instructions are exact, numbered-ready and preserve all mandatory manual limits",()=>{
  assert.match(automaticAmmoText("F2Falloff","en"),/floor\(207\/\(2×3\)\)=34/);
  assert.match(f3Text("RuleIllumination"),/−3/);assert.doesNotMatch(f3Text("RuleIllumination"),/−5/);
  assert.match(f3Text("RuleSignal"),/−5/);
  // HT171: radius (yards) / 5 is development time in seconds, not a smaller cloud.
  for(const lang of ["ru","en"]){const runtime={game:{i18n:{lang}}};
    assert.match(f3Text("RuleOtherCloud",runtime),/радиус\/5 секунд/);
    assert.match(f3Text("RuleOtherCloud",runtime),/1–4 минуты.*HT171/);
    assert.match(f3Text("RuleCloud",runtime),/1 секунду на каждые 5 ярдов радиуса/);
  }
  assert.match(f3Text("RuleWP"),/1d\(0\.2\) burn/);assert.match(f3Text("RuleWP"),/6 интервалов \/ 60 секунд/);
  assert.match(f3Text("RuleGasVision"),/только участок/);assert.match(f3Text("RuleGasVision"),/−3 за ярд/);assert.match(automaticAmmoText("F1VomitingGas"),/5×MoF/);
});
