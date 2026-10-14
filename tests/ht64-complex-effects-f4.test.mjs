import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { F4_ROWS, f4RowsForShot, calculateF4, captureF4Combat, tracerBonus, confirmTracer, expireTracerMarkers, appendF4Conditions } from "../scripts/tools/ammunition-f4.js";
import { F4_TEXT, f4Text } from "../scripts/tools/ammunition-f4-localization.js";
import { publicManufactureCheck, createRegisteredHandload, registeredHandloadFacts, handloadEditorHTML } from "../scripts/tools/handload-registration.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";
import { resolveAmmunitionEffects } from "../scripts/tools/ammunition-effects.js";
import { ammunitionConditionSource, renderShotAmmunitionConditions } from "../scripts/tools/damage-shot-link.js";
import { handloadCondition } from "../scripts/tools/cartridge-load-conditions.js";

// All fixtures here are synthetic rule cases, not new catalog or factory cartridges.
function fixture(id) {
  const variant=id.split(":")[0],shot={version:1,attackId:"shot",actorId:"shooter",spent:1,mode:{name:"fixture"},ammunition:{recipe:{variantId:variant}},
    correlation:{attackMessageId:"attack"},profile:{actorId:"shooter",raw:{},context:{tokenId:"token",physicalShots:1},
      damage:{variantId:variant,nativeSafe:true,rules:{silent:{hearingTableDistanceYards:16}},components:[{role:"kinetic",status:"resolved",formula:"5d pi"}]}}};
  const source={id:"attack",visible:true,isContentVisible:true,speaker:{actor:"shooter"},flags:{"olegurps-qol":{shotSnapshot:shot}},content:"original",whisper:[],blind:false};
  const runtime={game:{user:{isGM:true},messages:new Map([[source.id,source]]),actors:new Map([["listener",{system:{hearing:13}}]])}};
  return {shot,source,runtime,resolved:{source,shot,role:"kinetic",messageId:source.id}};
}
const hearing={listener:"listener",distance:16,distanceModifier:-2,otherModifier:1,suppressor:-3,included:false};
const malf={tl:6,malf:17,action:"self_loading",quality:"normal",confirmed:true};
const matrix=readAuditFixture('ht64-complex-effects-decision-matrix');
test("exact nine approved F4 IDs without DATA or new compatibility",()=>assert.deepEqual(Object.keys(F4_ROWS).sort(),matrix.effects.filter(r=>r.future_package==="F4").map(r=>r.effect_id).sort()));
for(const [id,kind]of Object.entries(F4_ROWS))test(id+" explicit GM conditions, read-only snapshot and no false automatic result",()=>{
  const f=fixture(id),before=JSON.stringify(f.source),input=kind==="Hearing"?hearing:kind==="Reliability"?malf:{};
  const r=calculateF4(f.resolved,id,input,f.runtime);assert.notEqual(r.status,"unresolved");assert.equal(r.automaticApplication,false);
  if(["Hearing","Reliability"].includes(kind))assert.equal(calculateF4(f.resolved,id,{},f.runtime).status,"unresolved");
  assert.equal(JSON.stringify(f.source),before);assert.equal(f4RowsForShot(f.shot).some(r=>r.id===id),true);
  f.runtime.game.user.isGM=false;assert.equal(calculateF4(f.resolved,id,input,f.runtime),null);f.runtime.game.user.isGM=true;
  f.source.isContentVisible=false;assert.equal(calculateF4(f.resolved,id,input,f.runtime),null);
});
test("Hearing -1/-2 is listener-only and suppressor applied once",()=>{
  for(const [v,penalty]of [["ht_subsonic_pistol",-1],["ht_subsonic_rifle",-2]]){
    const f=fixture(v+":hearing"),r=calculateF4(f.resolved,v+":hearing",hearing,f.runtime);
    assert.equal(r.values.ammo,penalty);assert.equal(r.values.target,13-2+1-3+penalty);assert.equal(f.shot.profile.context.effectiveSkill,undefined);
    const included=calculateF4(f.resolved,v+":hearing",{...hearing,distanceModifier:-5,included:true},f.runtime);assert.equal(included.values.target,r.values.target);
    for(const key of ["listener","distance","distanceModifier","otherModifier","suppressor","included"]){const input={...hearing};delete input[key];assert.equal(calculateF4(f.resolved,v+":hearing",input,f.runtime).status,"unresolved");}
    assert.equal(calculateF4(f.resolved,v+":hearing",{...hearing,listener:"missing"},f.runtime).status,"unresolved");
  }
});
test("Silent table anchor 16 not universal penalty or inferred availability",()=>{
  const f=fixture("ht_silent:hearing");assert.equal(calculateF4(f.resolved,"ht_silent:hearing",hearing,f.runtime).key,"SilentResult");
  assert.equal(calculateF4(f.resolved,"ht_silent:hearing",hearing,f.runtime).values.target,undefined);
  delete f.shot.profile.damage.rules.silent;assert.equal(calculateF4(f.resolved,"ht_silent:hearing",hearing,f.runtime).status,"unresolved");
  f.shot.profile.damage.nativeSafe=false;assert.equal(f4RowsForShot(f.shot).length,0);
});
test("HP TL5-7 automatic/self-loading only; missing Malf never invented",()=>{
  const f=fixture("ht_hollow_point:malf");for(const tl of [4,5,6,7,8,9])for(const action of ["automatic","self_loading","other"]){
    const r=calculateF4(f.resolved,"ht_hollow_point:malf",{...malf,tl,action},f.runtime);assert.equal(r.values.modifier,tl>=5&&tl<=7&&action!=="other"?-1:0);
  }for(const input of [{...malf,malf:null},{...malf,tl:undefined},{...malf,action:undefined},{...malf,confirmed:false}])assert.equal(calculateF4(f.resolved,"ht_hollow_point:malf",input,f.runtime).status,"unresolved");
});
test("+P TL5-6 vs Cheap TL7-8, unknown quality, source conflict, no automatic RoF/NP change",()=>{
  const f=fixture("ht_plus_p:reliability");for(const tl of [4,5,6,7,8,9])for(const quality of ["cheap","normal",undefined]){
    const r=calculateF4(f.resolved,"ht_plus_p:reliability",{...malf,tl,quality},f.runtime);
    if([7,8].includes(tl)&&!quality){assert.equal(r.status,"unresolved");continue;}
    assert.equal(r.values.modifier,[5,6].includes(tl)||[7,8].includes(tl)&&quality==="cheap"?-1:0);assert.equal(r.status,"manual");
  }f.shot.profile.damage.rules.pressure={weaponTL:7,weaponQuality:"cheap"};assert.equal(calculateF4(f.resolved,"ht_plus_p:reliability",malf,f.runtime).status,"unresolved");
  assert.equal(f.shot.profile.raw.rof,undefined);
});
test("private source and nonGM reject before snapshot or listener reads; exact correlation required",()=>{
  const secret={source:{visible:false,isContentVisible:false},get shot(){throw Error("secret read");}};
  const runtime={game:{user:{isGM:true},get actors(){throw Error("listener read");}}};assert.equal(calculateF4(secret,"ht_subsonic_rifle:hearing",hearing,runtime),null);
  secret.source.visible=true;secret.source.isContentVisible=true;runtime.game.user.isGM=false;assert.equal(calculateF4(secret,"ht_subsonic_rifle:hearing",hearing,runtime),null);
  const f=fixture("ht_subsonic_rifle:hearing");f.shot.correlation.attackMessageId="other";assert.equal(calculateF4(f.resolved,"ht_subsonic_rifle:hearing",hearing,f.runtime),null);
});
test("caller cannot substitute another variant or attack for the authoritative source snapshot",()=>{
  const f=fixture("ht_subsonic_rifle:hearing"),copy=structuredClone(f.shot);copy.profile.damage.variantId="ht_subsonic_pistol";
  assert.equal(calculateF4({...f.resolved,shot:copy},"ht_subsonic_pistol:hearing",hearing,f.runtime),null);
  copy.profile.damage.variantId="ht_subsonic_rifle";copy.attackId="other";assert.equal(calculateF4({...f.resolved,shot:copy},"ht_subsonic_rifle:hearing",hearing,f.runtime),null);
});
function combatFixture(){
  const f=fixture("ht_tracer:next-turn"),one={id:"one",actorId:"shooter",tokenId:"token",flags:{},getFlag(){return this.flags.tracer;},async setFlag(scope,key,value){this.flags.tracer=structuredClone(value);this.writes=(this.writes??0)+1;}};
  const other={id:"other",actorId:"other-shooter",tokenId:"other-token",getFlag(){return null;}};
  f.runtime.game.combat={id:"combat",started:true,round:3,turn:0,turns:[one,other],combatants:{contents:[one,other]}};
  f.shot.profile.context.f4={combat:captureF4Combat("shooter","token",f.runtime)};return {...f,one,other};
}
test("Tracer explicit GM confirmation; source turn zero, next own turn +1, stranger/late zero",async()=>{
  const f=combatFixture(),c=f.runtime.game.combat;await assert.rejects(confirmTracer(f.resolved,false,f.runtime));
  assert.equal(await confirmTracer(f.resolved,true,f.runtime),true);assert.equal(tracerBonus("shooter","token",f.runtime),0);
  assert.equal(await confirmTracer(f.resolved,true,f.runtime),false);assert.equal(f.one.writes,1);
  c.turn=1;assert.equal(tracerBonus("other-shooter","other-token",f.runtime),0);c.round=4;c.turn=0;
  assert.equal(tracerBonus("shooter","token",f.runtime),1);assert.equal(tracerBonus("shooter","wrong-token",f.runtime),0);
  // Reload reconstructs the runtime from saved state without rearming or adding a stack.
  const saved=JSON.parse(JSON.stringify(f.one.flags));f.one.flags=saved;assert.equal(tracerBonus("shooter","token",f.runtime),1);
  await assert.rejects(confirmTracer(f.resolved,true,f.runtime));c.round=5;assert.equal(tracerBonus("shooter","token",f.runtime),0);
  await expireTracerMarkers(c,f.runtime);c.round=4;assert.equal(tracerBonus("shooter","token",f.runtime),0);
});
test("Tracer combat reset/order change, inaccessible attack and repeated component Damage cannot activate",async()=>{
  const f=combatFixture(),c=f.runtime.game.combat;const before=JSON.stringify(f.source);
  f.resolved.messageId="damage";await assert.rejects(confirmTracer(f.resolved,true,f.runtime));f.resolved.messageId="attack";
  for(const field of ["blind","whisper"]){f.source[field]=field==="blind"?true:["gm"];await assert.rejects(confirmTracer(f.resolved,true,f.runtime));f.source[field]=field==="blind"?false:[];}
  await confirmTracer(f.resolved,true,f.runtime);c.turns.reverse();assert.equal(tracerBonus("shooter","token",f.runtime),0);await expireTracerMarkers(c,f.runtime);assert.equal(f.one.flags.tracer.expired,true);
  assert.equal(JSON.stringify(f.source),before);assert(!JSON.stringify(f.one.flags).includes('"other"'));c.started=false;assert.equal(captureF4Combat("shooter","token",f.runtime),null);
});
test("same-turn multiple confirmed bursts cannot stack; no numeric long-burst threshold invented",async()=>{
  const f=combatFixture();await confirmTracer(f.resolved,true,f.runtime);f.shot.attackId="second";await confirmTracer(f.resolved,true,f.runtime);
  f.runtime.game.combat.round++;assert.equal(tracerBonus("shooter","token",f.runtime),1);assert.equal(f.one.flags.tracer.minimumBurstShots,undefined);
});
class Parser {
  parseFromString(content){const data=JSON.parse(content);const card={textContent:data.skill,querySelector:q=>q===".success"?data.success?{}:null:q===".failure"?!data.success?{}:null:null,
    querySelectorAll:()=>[{getAttribute:()=>`${data.margin} margin for ${data.skill}`} ]};return {querySelector:()=>card};}
}
function manufacturing(){
  const f=fixture("ht_match_handloaded:checks"),msg=(id,skill)=>({id,visible:true,isContentVisible:true,whisper:[],blind:false,rolls:[{total:9}],content:JSON.stringify({skill,success:true,margin:4})});
  f.runtime.DOMParser=Parser;f.runtime.crypto={randomUUID:()=>"new-batch-identity"};f.runtime.game.messages.set("armoury",msg("armoury","Armoury"));f.runtime.game.messages.set("guns",msg("guns","Guns"));
  const facts={availabilityTL:8,weaponActions:{values:["bolt_action"],complete:true},munitionClasses:{values:["cased_round"],complete:true},projectileClasses:{values:["solid"],complete:true},provenance:[]};
  const option={id:"ht_match_handloaded",eligibility_v1:{contract:"ht-option-eligibility-v1",conditions:{munition_classes_any:["cased_round"],weapon_actions_any:["bolt_action"]},explicit_evidence_required:["matched_to_this_individual_weapon","armoury_and_iq_guns_success","handloaded_batch"]}};
  const args={actor:{id:"shooter"},weapon:{id:"weapon"},modeId:"mode",type:{book:"ht",kind:"ammo-item",ammoId:"ammo",name:"fixture",recipe:{variantId:"ht_match_handloaded"}},facts,option,
    input:{batch:"batch",source:"synthetic manufacture evidence",armoury:"armoury",iqGuns:"guns",confirmed:true}};return {...f,args};
}
test("register public native Armoury/IQ-Guns results as new individual batch, no old recipe overwrite",()=>{
  const f=manufacturing(),before=JSON.stringify(f.args.type),type=createRegisteredHandload(f.args,f.runtime),d=type.recipe.autoProfile.handloadDefinition;
  assert.equal(type.recipe.customId,"new-batch-identity");assert.equal(d.batchId,"batch");assert.equal(d.iqGuns.basedOn,"IQ");assert.equal(d.armoury.total,9);
  assert.equal(JSON.stringify(f.args.type),before);assert.equal(handloadCondition(registeredHandloadFacts(f.args.facts,d),{...d,weaponId:"different"}),"P1HandloadWeaponMismatch");
});
test("manufacture rejects 17/18, failure, private checks, wrong skill/basis confirmation, duplicate check, automatic or unknown action",()=>{
  for(const total of [2,17,18]){const f=manufacturing();f.runtime.game.messages.get("armoury").rolls[0].total=total;assert.throws(()=>createRegisteredHandload(f.args,f.runtime));}
  for(const patch of [{blind:true},{whisper:["gm"]},{visible:false},{isContentVisible:false},{content:JSON.stringify({skill:"Armoury",success:false,margin:-1})},{content:JSON.stringify({skill:"Cooking",success:true,margin:3})}]){const f=manufacturing();Object.assign(f.runtime.game.messages.get("armoury"),patch);assert.throws(()=>createRegisteredHandload(f.args,f.runtime));}
  for(const action of ["automatic","self_loading"]){const f=manufacturing();f.args.facts.weaponActions.values=[action];assert.throws(()=>createRegisteredHandload(f.args,f.runtime));}
  const f=manufacturing();f.args.facts.weaponActions.complete=false;assert.throws(()=>createRegisteredHandload(f.args,f.runtime));f.args.facts.weaponActions.complete=true;f.args.input.confirmed=false;assert.throws(()=>createRegisteredHandload(f.args,f.runtime));f.args.input.confirmed=true;f.args.input.iqGuns="armoury";assert.throws(()=>createRegisteredHandload(f.args,f.runtime));
});
test("individual registration remains catalog-undetermined, needs GM approval, computes Acc once and rejects other weapon",()=>{
  const f=manufacturing(),type=createRegisteredHandload(f.args,f.runtime);
  const compatibility={checkCompatibility:(mode,id)=>id==="ammo"?{status:"compatible"}:{status:"undetermined",eligibility:{facts:f.args.facts}}};
  const catalogs={getVariant:()=>f.args.option,getAmmoItem:()=>({name:"fixture"})};
  const service=new AutomaticAmmunitionProfileService({catalogs,compatibility});
  const prepared=service.prepare({modeId:"mode",base:type,variantId:"ht_match_handloaded",savedType:type});
  assert.equal(prepared.state,"complete");assert.equal(prepared.rulesStatus,"undetermined");assert.equal(service.admission(prepared,{policy:"permissive"}).allowed,false);
  assert.equal(service.admission(prepared,{policy:"strict",approval:{active:true}}).allowed,true);
  const args={raw:{damage:"5d pi",acc:"4+2"},variantId:"ht_match_handloaded",baseStatus:"compatible",constructionStatus:"gm-approved",facts:prepared.facts,context:{actorId:"shooter",weaponId:"weapon",modeId:"mode",ammoId:"ammo"}};
  const r=resolveAmmunitionEffects(args);assert.equal(r.nativeSafe,true);assert.equal(r.effectiveChanges.acc,6);assert.equal(r.effectiveChanges.scopeBonus,2);
  assert.equal(resolveAmmunitionEffects({...args,context:{...args.context,weaponId:"another"}}).nativeSafe,false);
  const facts=structuredClone(prepared.facts);facts.handloadDefinition.nativeAccuracyIncluded=true;assert.equal(resolveAmmunitionEffects({...args,facts}).effectiveChanges?.acc,undefined);
});
test("+P loading/support and native HP/subsonic descriptions never roll, spend or imply velocity",()=>{
  const f=fixture("ht_plus_p:loading-support"),before=JSON.stringify(f.source);
  for(const id of ["ht_plus_p:loading-support","ht_plus_p:native-conditions"]){const r=calculateF4(f.resolved,id,{},f.runtime);assert.equal(r.status,"manual");assert.equal(r.automaticApplication,false);}
  assert.equal(JSON.stringify(f.source),before);assert.match(f4Text("RuleLoading"),/Guns.*IQ/);assert.match(f4Text("RuleNative"),/HP/);assert.match(f4Text("RuleNative"),/inc/);
});
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this.textContent="";this.dataset={};}
  get value(){return this._value??(this.tag==="select"?this.children[0]?.value:"")??"";}set value(v){this._value=v;}
  append(e){this.children.push(e);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this.events[k]=v;}replaceChildren(){this.children=[];}remove(){this.removed=true;}querySelector(){return null;}
}
test("existing GGA card: closed own section, local GM properties only, player has instructions but no hidden input",async()=>{
  const f=fixture("ht_subsonic_rifle:hearing");f.runtime.document={createElement:t=>new Element(t)};const card=new Element("div"),root={querySelector:s=>s.includes("gga-chat-message")?card:null};
  const details=renderShotAmmunitionConditions(f.source,root,f.runtime);assert(details);assert(!details.attrs.open);
  const local=details.children.find(e=>e.className==="olegurps-f4-local");assert(local);const fields=local.children.find(e=>e.className==="olegurps-f2-fields");
  for(const label of fields.children){const c=label.children[0];c.value=c.name==="included"?"no":c.name==="listener"?"listener":String(hearing[c.name]);}
  const before=JSON.stringify(f.source);await local.children.find(e=>e.tag==="button").events.click({preventDefault(){},stopPropagation(){}});assert.equal(JSON.stringify(f.source),before);
  assert(fields.children.every(l=>!Object.hasOwn(l.children[0].attrs,"value")));
  f.runtime.game.user.isGM=false;const player=new Element("details");appendF4Conditions(player,f.resolved,f.runtime,()=>null);assert(!player.children.some(e=>e.className==="olegurps-f4-local"));
  await local.children.find(e=>e.tag==="button").events.click({preventDefault(){},stopPropagation(){}});assert.equal(local.removed,true);
  assert.equal(handloadEditorHTML({recipe:{variantId:"ht_match_handloaded"}},f.runtime),"");
});
test("RU/EN synchronized; own F4 remains Russian under en/missing translations, no GGA dictionary mutation",async()=>{
  const ru=JSON.parse(await fs.readFile(new URL("../lang/ru.json",import.meta.url),"utf8")),en=JSON.parse(await fs.readFile(new URL("../lang/en.json",import.meta.url),"utf8"));
  for(const[key,[r,e]]of Object.entries(F4_TEXT)){assert.equal(ru["OleGURPS.F4."+key],r);assert.equal(en["OleGURPS.F4."+key],e);assert.equal(f4Text(key),r);}
  for(const lang of ["ru","en",undefined]){globalThis.game={i18n:{lang,translations:{GURPS:{text:"native"}},localize:()=>"English"}};const before=JSON.stringify(game.i18n);assert.equal(f4Text("Hearing"),F4_TEXT.Hearing[0]);assert.equal(JSON.stringify(game.i18n),before);}delete globalThis.game;
});
