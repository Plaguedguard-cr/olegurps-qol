import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { F2_ROWS, f2RowsForShot, calculateF2, savedF2Facts, appendF2Conditions } from "../scripts/tools/ammunition-f2.js";
import { ammunitionConditionSource, renderShotAmmunitionConditions } from "../scripts/tools/damage-shot-link.js";
import { f2Messages, f2Text } from "../scripts/tools/ammunition-f2-localization.js";
import { loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { fragmentTargetProfile, FRAGMENT_POSTURES } from "../scripts/tools/explosion-fragmentation.js";

// Deliberately synthetic calculation fixtures, not catalog products or live evidence.
function fixture(id) {
  const variant=id.split(":")[0], shot={version:1,actorId:"actor",attackId:"attack-A",spent:1,mode:{name:"saved weapon"},
    ammunition:{source:"catalog",status:"confirmed",name:"saved ammunition",recipe:{variantId:variant}},correlation:{attackMessageId:"A"},
    profile:{actorId:"actor",context:{physicalShots:1,effectiveRoF:3,effectiveSkill:15,rcl:1,shotgun:{projectilesPerShot:3}},damage:{nativeSafe:true,variantId:variant,
      components:[{role:"kinetic",status:"resolved",formula:"6dx2(10) cr ex",relation:"primary"},{role:"follow-up",status:"resolved",formula:"2d cr ex",relation:"follow_up"},
        {role:"main-charge",status:"resolved",formula:"6dx7(10) cr ex"},{role:"linked",status:"resolved",formula:"6dx3 cr ex"},{role:"fragmentation",status:"resolved",formula:"3d+2 cut"}],
      rules:{tandem:{cumulativeWithoutERA:true},explosionFalloff:{distanceDivisor:2},hitAllocation:{first:"ball",later:"pellets",pellet:"1d+1 pi"},
        fuzeTracer:{variantId:"ht_self_destruct",selfDestructDistanceYards:100,selfDestructDistanceSource:"fixture confirmed fuse"}},support:{manual:[]}}}};
  const message={id:"A",visible:true,isContentVisible:true,content:"saved native",rolls:[{total:11}],speaker:{actor:"actor"},flags:{"olegurps-qol":{shotSnapshot:shot}}};
  const runtime={game:{user:{isGM:true},i18n:{lang:"ru"},messages:new Map([["A",message]])},DOMParser:class{parseFromString(){return{querySelector:()=>({
    querySelectorAll:()=>[{getAttribute:()=>"+4 margin for saved weapon"}],querySelector:s=>s===".success"?{}:null})};}}};
  return {shot,message,runtime,resolved:{shot,source:message,role:"kinetic",messageId:"A"}};
}
const positive={carrierHit:true,penetration:true,target:"GM private target",distance:5,sm:0,posture:"standing",cover:0,total:10,guaranteed:false,
  era:false,precursor:40,main:140,rawConfirmed:true,nonpenetration:true,laminated:false,dr:151,damage:101,tl:6,die:4,path:101};
const matrix=JSON.parse(await fs.readFile(new URL("../docs/audit/ht64-complex-effects-decision-matrix.json",import.meta.url),"utf8"));
test("exactly the 33 approved F2 IDs, no F1/F3/F4/DATA expansion",()=>{
  assert.equal(Object.keys(F2_ROWS).length,33);
  assert.deepEqual(Object.keys(F2_ROWS).sort(),matrix.effects.filter(e=>e.future_package==="F2").map(e=>e.effect_id).sort());
});
for(const [id,{kind}]of Object.entries(F2_ROWS))test(id+" read-only adapter and missing-data gate",()=>{
  const f=fixture(id),before=JSON.stringify(f.message);assert(f2RowsForShot(f.shot).some(r=>r.id===id));
  const r=calculateF2(f.resolved,id,positive,f.runtime);assert(r);assert.equal(r.status,["Elements","Linked"].includes(kind)?"manual":"resolved");
  const absent=calculateF2(f.resolved,id,{},f.runtime);assert(absent);if(!["Elements","Linked","Allocation"].includes(kind))assert.equal(absent.status,"unresolved");
  assert.equal(JSON.stringify(f.message),before);
  f.runtime.game.user.isGM=false;assert.equal(calculateF2(f.resolved,id,positive,f.runtime),null);
  f.runtime.game.user.isGM=true;f.shot.profile.damage.nativeSafe=false;assert.equal(calculateF2(f.resolved,id,positive,f.runtime),null);
});
test("physical cartridges, NP elements, resolved hits, failures and close-range groups remain separate",()=>{
  const f=fixture("ht_duplex:elements");assert.deepEqual(savedF2Facts(f.resolved,f.runtime),{physical:1,elements:3,hits:3});
  f.shot.profile.context.shotgun.projectilesPerShot=9;f.shot.profile.context.effectiveRoF=1;
  assert.deepEqual(savedF2Facts(f.resolved,f.runtime),{physical:1,elements:9,hits:1});
  delete f.runtime.DOMParser;assert.equal(savedF2Facts(f.resolved,f.runtime).hits,null);
  const g=fixture("ht_duplex:elements");g.runtime.DOMParser=class{parseFromString(){return{querySelector:()=>({querySelectorAll:()=>[{getAttribute:()=>"+4 margin for saved weapon"}],querySelector:s=>s===".failure"?{}:null})}}};
  assert.equal(savedF2Facts(g.resolved,g.runtime).hits,0);
  const h=fixture("ht_duplex:elements");h.shot.profile.context.effectiveSkill=16;assert.equal(savedF2Facts(h.resolved,h.runtime).hits,null);
});
test("Buck-and-Ball uses saved actual hits; never allocates multiple physical charges",()=>{
  const id="ht_buck_and_ball:allocation",f=fixture(id),run=()=>calculateF2(f.resolved,id,{},f.runtime);
  assert.deepEqual(run().values,{ball:1,pellets:2,formula:"1d+1 pi"});
  f.shot.profile.context.physicalShots=2;assert.equal(run().status,"unresolved");
  f.shot.profile.context.physicalShots=1;f.shot.profile.context.effectiveRoF=0;assert.deepEqual(run().values,{ball:0,pellets:0,formula:"1d+1 pi"});
  delete f.runtime.DOMParser;assert.equal(run().status,"unresolved");
});
test("Follow-Up requires carrier hit AND confirmed penetration; Linked remains independent",()=>{
  const id="ht_aphex:internal",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  assert.equal(run({carrierHit:true,penetration:true}).key,"InternalReady");
  for(const [hit,penetration]of [[true,false],[false,true],[false,false]])assert.equal(run({carrierHit:hit,penetration}).key,"ExternalOnly");
  assert.equal(run({carrierHit:true}).status,"unresolved");
  f.shot.profile.context.effectiveRoF=0;
  assert.equal(run({carrierHit:true,penetration:true}).status,"unresolved");
  const linked=fixture("ht_heat:linked");const before=JSON.stringify(linked.shot.profile.damage.components);assert.equal(calculateF2(linked.resolved,"ht_heat:linked",{},linked.runtime).status,"manual");assert.equal(JSON.stringify(linked.shot.profile.damage.components),before);
});
test("fragmentation requires selected target geometry, posture, SM, cover and already confirmed native roll",()=>{
  const id="ht_he:fragment-hits",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  assert.deepEqual(run(positive).values,{hits:2,skill:13,radius:15});
  assert.equal(run({...positive,total:17}).values.hits,0);assert.equal(run({...positive,distance:16}).values.hits,0);
  assert.equal(run({...positive,posture:"lying",cover:-2}).values.skill,9);
  for(const field of ["target","distance","sm","posture","cover","total","guaranteed"]){const input={...positive};delete input[field];assert.equal(run(input).status,"unresolved");}
  assert.equal(run({...positive,cover:1}).status,"unresolved");
  const ap=fixture("ht_apex:fragment-hits");const r=calculateF2(ap.resolved,"ht_apex:fragment-hits",{...positive,guaranteed:true,total:18,distance:99},ap.runtime);
  assert.equal(r.values.hits,1);
  assert.equal(calculateF2(ap.resolved,"ht_apex:fragment-hits",{...positive,guaranteed:true,penetration:false},ap.runtime).status,"unresolved");
  ap.shot.profile.damage.components=ap.shot.profile.damage.components.filter(c=>c.role!=="follow-up");assert.equal(calculateF2(ap.resolved,"ht_apex:fragment-hits",{...positive,guaranteed:true},ap.runtime).status,"unresolved");
});
test("the separate fragmentation macro and F2 share range, posture, danger radius and skill arithmetic",()=>{
  for(const distance of [0,2,5,15,500])for(const posture of Object.values(FRAGMENT_POSTURES)) {
    const args={damage:{effectiveDice:3},distance,sm:2,postureModifier:posture.modifier};
    const ordinary=fragmentTargetProfile(args),covered=fragmentTargetProfile({...args,coverModifier:-2});
    assert.equal(ordinary.dangerRadius,15);assert.equal(ordinary.effectiveSkill,15+ordinary.rangeMod+posture.modifier+2);
    assert.equal(covered.effectiveSkill,ordinary.effectiveSkill-2);assert.equal(covered.dangerRadius,ordinary.dangerRadius);
  }
});
test("ERA true/false/unknown: stages XOR total and independent Linked",()=>{
  const id="ht_ms_heat:tandem",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  assert.equal(run(positive).values.damage,180);assert.equal(run({...positive,era:true}).key,"ERAStages");assert.equal(run({...positive,era:true}).values.damage,undefined);
  for(const era of [null,undefined,"false"])assert.equal(run({...positive,era}).status,"unresolved");
  assert.equal(run({...positive,rawConfirmed:false}).status,"unresolved");
});
test("HESH gates nonpenetration and armor, derives maximum from saved formula, preserves fractional result",()=>{
  const id="ht_hesh:spall",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  assert.equal(run(positive).values.damage,7.2);assert.equal(run(positive).values.dr,2);
  assert.equal(run({...positive,laminated:true}).key,"Laminated");
  for(const input of [{...positive,nonpenetration:false},{...positive,laminated:undefined},{...positive,dr:undefined},{...positive,dr:-1}])assert.equal(run(input).status,"unresolved");
  f.shot.profile.damage.components[0].formula="unknown";assert.equal(run(positive).status,"unresolved");
});
test("Thermobaric /2r never /3r or both; zero/unknown and already reduced inputs blocked",()=>{
  const id="ht_thermobaric:falloff",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  const r=run(positive);assert.deepEqual(r.values,{damage:10,divisor:10});assert.notEqual(r.values.damage,Math.floor(101/15));assert.equal(r.automaticApplication,false);
  for(const input of [{...positive,distance:0},{...positive,distance:undefined},{...positive,distance:-1},{...positive,rawConfirmed:false}])assert.equal(run(input).status,"unresolved");
});
test("SAPLE TL5/6/7, no new rolls, saved threshold cannot be bypassed",()=>{
  const id="ht_saple:fuze-reliability",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  for(const tl of [5,6]){assert.equal(run({tl,die:tl-2}).values.state,f2Text("triggered",f.runtime));assert.equal(run({tl,die:tl-1}).values.state,f2Text("failed",f.runtime));assert.equal(run({tl}).status,"unresolved");}
  assert.equal(run({tl:7}).key,"NoFuzeRoll");assert.equal(run({tl:undefined,die:1}).status,"unresolved");
  f.shot.profile.damage.rules.sapleReliability={successAtMost:3};assert.equal(run({tl:7}).status,"unresolved");
  const before=JSON.stringify(f.shot);run({tl:5,die:3});run({tl:5,die:3});assert.equal(JSON.stringify(f.shot),before);
});
test("Self-Destruct uses source-confirmed fuse distance, actual path, never halfDamage or target distance",()=>{
  const id="ht_self_destruct:flight",f=fixture(id),run=input=>calculateF2(f.resolved,id,input,f.runtime);
  assert.equal(run({path:100}).values.state,f2Text("reached",f.runtime));assert.equal(run({path:99}).values.state,f2Text("unreached",f.runtime));
  assert.equal(run({distance:100}).status,"unresolved");f.shot.profile.damage.rules.fuzeTracer.selfDestructDistanceSource=null;assert.equal(run({path:100}).status,"unresolved");
});
test("exact readable source and component, reload/current-magazine/neighbor independence",()=>{
  const id="ht_ms_heat:tandem",f=fixture(id),damage={id:"D",visible:true,isContentVisible:true,speaker:{actor:"actor"},flags:{"olegurps-qol":{damageLink:{status:"linked",originatingAttackMessageId:"A",attackId:"attack-A",actorId:"actor",damageComponent:"main-charge"}}}};
  const r=ammunitionConditionSource(damage,f.runtime);assert.equal(r.role,"main-charge");assert.equal(calculateF2(r,id,positive,f.runtime).values.damage,180);
  assert.equal(calculateF2({...r,role:"fragmentation"},id,positive,f.runtime),null);
  const saved=JSON.stringify(f.message);f.runtime.game.currentMagazine={ammo:"other"};f.runtime.game.lastTargetedRoll={total:18};f.runtime.game.messages.set("A",JSON.parse(saved));
  assert.equal(calculateF2(ammunitionConditionSource(damage,f.runtime),id,positive,f.runtime).values.damage,180);
  for(const field of ["attackId","actorId","damageComponent"]){const link=damage.flags["olegurps-qol"].damageLink,old=link[field];link[field]="foreign";assert.equal(ammunitionConditionSource(damage,f.runtime),null);link[field]=old;}
  f.runtime.game.messages.set("A",{visible:false,isContentVisible:false,get flags(){throw Error("private flags read");}});assert.equal(ammunitionConditionSource(damage,f.runtime),null);
});
test("public/whisper/blind checks precede flags and do not bypass visibility for GM",()=>{
  for(const isGM of [true,false])for(const [visible,isContentVisible]of [[false,false],[true,false],[false,true]]){
    const message={visible,isContentVisible,getFlag(){throw Error("private flags read");},get flags(){throw Error("private flags read");}};
    assert.equal(ammunitionConditionSource(message,{game:{user:{isGM}}}),null);
  }
});
test("all new RU/EN keys pass the actual loader, including an older F1 cache",async()=>{
  for(const lang of ["ru","en"]){const json=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));let fetches=0;
    const i18n={lang,translations:{},localize:k=>i18n.translations[k]??k};
    for(const k of ["ShotgunCloseGM","BarrelSwitchReadyGM","LeMatIdentityReview","DUIncendiaryGM","DUMinimumCaliber","MultishotDecision","DoubleKnockbackNativeGM","P5ht_white_phosphorus","P6ht_tracer","P1ht_silent","P7ht_caseless","F1HAFLASmoke","F1Title"])i18n.translations["OleGURPS.AutomaticAmmo."+k]="old cache";
    await loadAutomaticAmmoTranslations({game:{i18n},location:{},fetch:async()=>{fetches++;return{ok:true,json:async()=>json}},foundry:{utils:{setProperty:(o,k,v)=>o[k]=v}}});assert.equal(fetches,1);
    for(const [k,v]of Object.entries(f2Messages[lang]))assert.equal(f2Text(k,{game:{i18n}}),v);
  }
});

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.value="";this.textContent="";}
  append(el){this.children.push(el);if(this.tag==="select"&&this.children.length===1)this.value=el.value;}
  setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,fn){this.events[k]=fn;} replaceChildren(){this.children=[];}
  remove(){this.removed=true;} querySelector(){return null;}
}
test("GM local input never updates public HTML/flags; player render has no controls or secrets; revocation clears local UI",()=>{
  const id="ht_thermobaric:falloff",f=fixture(id);f.runtime.document={createElement:tag=>new Element(tag)};
  // Option value is assigned after append, as it is in the real DOM.
  Object.defineProperty(Element.prototype,"value",{get(){return (this.tag==="select"&&!this._value?this.children[0]?.value:this._value)??""},set(v){this._value=v}});
  const details=new Element("details");appendF2Conditions(details,f.resolved,f.runtime,()=>ammunitionConditionSource(f.message,f.runtime));
  const local=details.children.find(e=>e.className==="olegurps-f2-local");assert(local);assert(!local.attrs.open);
  const choose=local.children.find(e=>e.tag==="select");choose.value=id;choose.events.change();
  const fields=local.children.find(e=>e.className==="olegurps-f2-fields");const controls=fields.children.map(e=>e.children[0]);
  controls.find(c=>c.name==="damage").value="91357";controls.find(c=>c.name==="distance").value="7";controls.find(c=>c.name==="rawConfirmed").value="yes";
  const before=JSON.stringify(f.message);const button=local.children.find(e=>e.tag==="button"&&e.textContent===f2Text("Calculate",f.runtime));button.events.click({preventDefault(){},stopPropagation(){}});
  assert.equal(JSON.stringify(f.message),before);assert(!JSON.stringify(f.message).includes("91357"));assert(controls.every(c=>!Object.hasOwn(c.attrs,"value")));
  f.runtime.game.user.isGM=false;const player=new Element("details");appendF2Conditions(player,f.resolved,f.runtime,()=>null);
  assert(!player.children.some(e=>e.tag==="input"||e.tag==="select"||e.tag==="button"||e.className==="olegurps-f2-local"));assert(!JSON.stringify(player).includes("91357"));
  button.events.click({preventDefault(){},stopPropagation(){}});assert(local.removed);
});
test("F2 adapters cannot create rolls, messages, mutations or read current Actors/settings/targets",async()=>{
  const text=await fs.readFile(new URL("../scripts/tools/ammunition-f2.js",import.meta.url),"utf8");
  assert(!/ChatMessage\.|\.toMessage\(|new Roll\(|\.setFlag\(|\.update\(|game\.actors|game\.settings|lastTargetedRoll|openExplosionFragmentation\(/.test(text.replace(/\/\*\*[\s\S]*?\*\//g,"")));
});
