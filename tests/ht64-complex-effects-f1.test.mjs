import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { F1_CONDITION_ROWS, NATIVE_CONDITION_ROWS, ammunitionInstructionKeys } from "../scripts/tools/ammunition-condition-presentation.js";
import { shotAmmunitionConditions, ammunitionConditionTexts } from "../scripts/tools/damage-shot-link.js";
import { automaticAmmoText, loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";

const scope = "olegurps-qol";
const matrix = JSON.parse(await readFile(new URL("../docs/audit/ht64-complex-effects-decision-matrix.json", import.meta.url), "utf8"));
function fixture(variant, id = "A") {
  const shot = {version:1, attackId:"attack-"+id, actorId:"actor", spent:1,
    correlation:{attackMessageId:id}, mode:{name:"Saved weapon"},
    ammunition:{source:"catalog",status:"confirmed",name:"Saved cartridge",book:"ht",ammoId:"saved-id",recipe:{variantId:variant}},
    profile:{actorId:"actor",damage:{nativeSafe:true,variantId:variant,rules:{},support:{manual:[]}},context:{}}};
  const message = {id,visible:true,isContentVisible:true,content:"No cartridge name here",speaker:{actor:"actor"},flags:{[scope]:{shotSnapshot:shot}}};
  const runtime = {game:{user:{id:"player",isGM:false},i18n:{lang:"ru"},messages:new Map([[id,message]])}};
  return {shot,message,runtime};
}
test("approved matrix contracts: exactly 23 F1 and five NO_CODE IDs", () => {
  for (const [packageId, rows] of [["F1",F1_CONDITION_ROWS],["NO_CODE",NATIVE_CONDITION_ROWS]])
    assert.deepEqual(Object.keys(rows).sort(),matrix.effects.filter(e=>e.future_package===packageId).map(e=>e.effect_id).sort());
});
for (const [id,key] of Object.entries({...F1_CONDITION_ROWS,...NATIVE_CONDITION_ROWS})) {
  test("saved conditions: "+id, () => {
    const f=fixture(id.split(":")[0]);
    if(id.endsWith(":zero-dr"))f.shot.profile.damage.rules.zeroDRTreatedAs=1;
    if(id.endsWith(":knockback"))f.shot.profile.damage.rules.knockback={multiplier:2};
    if(id.endsWith(":b409"))f.shot.profile.context.shotgun={extremelyClose:true};
    if(id.endsWith(":hafla-smoke-manual")) {
      f.shot.ammunition.ammoId="ht_specific_hafla_dm34_35mm_wp";
      f.shot.mode.standaloneRef={modeId:"Wr3VDL3Z6SR3KCz3K"};
      f.shot.profile.damage.rules.environment={nativePreserved:true,source:{kind:"reference"}};
    }
    const before=JSON.stringify(f.message);
    for(const language of ["ru","en"]) {
      f.runtime.game.i18n.lang=language;
      assert(ammunitionInstructionKeys(f.shot).includes(key));
      assert(shotAmmunitionConditions(f.message,f.runtime).includes(automaticAmmoText(key,language)));
      assert.notEqual(automaticAmmoText(key,language),key);
    }
    assert.equal(JSON.stringify(f.message),before);
  });
}
test("ordinary and unresolved shots have no empty conditions section; NO_CODE needs saved native context",()=>{
  for(const variant of [null,"ht_match","ht_hollow_point"]){const f=fixture(variant);assert.deepEqual(shotAmmunitionConditions(f.message,f.runtime),[]);}
  const f=fixture("ht_apdu");f.shot.profile.damage.nativeSafe=false;assert.deepEqual(shotAmmunitionConditions(f.message,f.runtime),[]);
  for(const variant of ["ht_baton","ht_beanbag","ht_frangible"]){const f=fixture(variant);assert(!ammunitionInstructionKeys(f.shot).includes("F1Knockback"));assert(!ammunitionInstructionKeys(f.shot).includes("F1ZeroDR"));}
});
test("HAFLA smoke numbers never propagate to other WP, names, identities, unresolved or guessed recipes",()=>{
  const f=fixture("ht_white_phosphorus");f.shot.ammunition.name="Buck HAFLA DM34";
  f.shot.mode.standaloneRef={modeId:"Wr3VDL3Z6SR3KCz3K"};
  f.shot.profile.damage.rules.environment={nativePreserved:true,source:{kind:"reference"}};
  assert(!ammunitionInstructionKeys(f.shot).includes("F1HAFLASmoke"));
  f.shot.ammunition.ammoId="ht_specific_hafla_dm34_35mm_wp";
  assert(ammunitionInstructionKeys(f.shot).includes("F1HAFLASmoke"));
  for(const [object,field,value]of [[f.shot.ammunition,"status","unconfirmed"],[f.shot.ammunition,"book","ut"],[f.shot.mode.standaloneRef,"modeId","other"],[f.shot.profile.damage.rules.environment,"nativePreserved",false]]) {
    const old=object[field];object[field]=value;assert(!ammunitionInstructionKeys(f.shot).includes("F1HAFLASmoke"));object[field]=old;
  }
});
test("overlapping instructions deduplicate without removing distinct conditions",()=>{
  const f=fixture("ht_frangible");f.shot.profile.damage.rules.zeroDRTreatedAs=1;
  const manual=[{id:"ObjectWithoutDR"},{id:"NoOverpenetrationWithDR"},{id:"ObjectWithoutDR"}];
  f.shot.profile.damage.support.manual=manual;f.shot.profile.context.environment={manual};
  const texts=shotAmmunitionConditions(f.message,f.runtime);assert.equal(texts.length,2);assert.equal(new Set(texts).size,2);
  const t=fixture("ht_tracer");t.shot.profile.damage.components=[{role:"kinetic",status:"resolved",formula:"8dx2(2) pi inc"}];
  assert.equal(shotAmmunitionConditions(t.message,t.runtime).length,2);
});
test("public/whisper/blind permissions precede even flags, for GM and players",()=>{
  for(const isGM of [false,true])for(const [visible,isContentVisible]of [[false,false],[true,false],[false,true]]) {
    const message={visible,isContentVisible,get flags(){throw Error("private flags read");},getFlag(){throw Error("private snapshot read");}};
    assert.deepEqual(shotAmmunitionConditions(message,{game:{user:{isGM}}}),[]);
  }
  for(const isGM of [false,true])for(const visibility of [{blind:false,whisper:[]},{blind:false,whisper:["player"]},{blind:true,whisper:["gm"]}]){
    const f=fixture("ht_apdu");Object.assign(f.message,visibility);f.runtime.game.user.isGM=isGM;
    // Foundry's visible/isContentVisible are authoritative, never an inferred recipient bypass.
    assert.equal(shotAmmunitionConditions(f.message,f.runtime).length,1);
    f.message.isContentVisible=false;assert.deepEqual(shotAmmunitionConditions(f.message,f.runtime),[]);
  }
});
test("linked Damage uses exact readable original shot, never identity-copy, latest attack or magazine",()=>{
  const f=fixture("ht_heat"),other=fixture("ht_tracer","B");f.runtime.game.messages.set("B",other.message);
  const damage={id:"D",visible:true,isContentVisible:true,speaker:{actor:"actor"},flags:{[scope]:{damageLink:{status:"linked",originatingAttackMessageId:"A",attackId:"attack-A",actorId:"actor",damageComponent:"kinetic",identityCopy:other.shot}}}};
  const expected=shotAmmunitionConditions(f.message,f.runtime),saved=JSON.stringify(f.shot);
  f.runtime.game.lastShot=other.shot;f.runtime.game.currentMagazine={ammo:"other"};
  assert.deepEqual(shotAmmunitionConditions(damage,f.runtime),expected);
  f.message.flags[scope].shotSnapshot=JSON.parse(saved);assert.deepEqual(shotAmmunitionConditions(damage,f.runtime),expected);
  for(const field of ["attackId","actorId","damageComponent"]){const link=damage.flags[scope].damageLink,old=link[field];link[field]="wrong";assert.deepEqual(shotAmmunitionConditions(damage,f.runtime),[]);link[field]=old;}
  f.runtime.game.messages.set("A",{visible:true,isContentVisible:false,get flags(){throw Error("private source flags");}});
  assert.deepEqual(shotAmmunitionConditions(damage,f.runtime),[]);
  f.runtime.game.messages.delete("A");assert.deepEqual(shotAmmunitionConditions(damage,f.runtime),[]);
});
test("no target facts, secret checks, arbitrary IDs, calculations or resource reads in instructions",()=>{
  const f=fixture("ht_apdu"),secret="SECRET-DR-TARGET-COORDINATES";
  f.shot.profile.damage.rules.secret=secret;f.shot.target={name:secret,DR:secret};
  f.shot.profile.damage.support.manual=[{id:"private-field",text:secret},{id:"P4Secret",name:secret}];
  for(const key of ["actors","settings","scenes","lastTargetedRoll"])Object.defineProperty(f.runtime.game,key,{get(){throw Error("forbidden current state "+key);}});
  const before=JSON.stringify(f.shot),texts=shotAmmunitionConditions(f.message,f.runtime);
  assert.equal(texts.length,1);assert(!texts.join(" ").includes(secret));assert.equal(JSON.stringify(f.shot),before);
  assert.deepEqual(ammunitionConditionTexts([{id:"P4Secret",text:secret}]),[]);
});
test("RU/EN new keys load through actual translation loader including stale cache",async()=>{
  const files=await Promise.all(["ru","en"].map(async lang=>JSON.parse(await readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"))));
  const keys=[...new Set([...Object.values(F1_CONDITION_ROWS),...Object.values(NATIVE_CONDITION_ROWS),"F1Title"])];
  for(const [index,lang]of ["ru","en"].entries()) {
    let fetches=0;const i18n={lang,translations:{},_fallback:{},localize:key=>i18n.translations[key]??key};
    await loadAutomaticAmmoTranslations({location:{},foundry:{utils:{setProperty:(object,key,value)=>object[key]=value}},game:{i18n},fetch:async path=>{fetches++;assert(path.endsWith("/"+lang+".json"));return {ok:true,json:async()=>files[index]};}});
    assert.equal(fetches,1);
    for(const key of keys)assert.equal(i18n.localize("OleGURPS.AutomaticAmmo."+key),automaticAmmoText(key,lang));
  }
});
