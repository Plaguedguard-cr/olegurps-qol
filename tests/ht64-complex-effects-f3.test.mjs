import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { F3_ROWS, F3_FIELDS, f3RowsForShot, calculateF3, f3Extension } from "../scripts/tools/ammunition-f3.js";
import { appendF2Conditions } from "../scripts/tools/ammunition-f2.js";
import { ammunitionConditionSource, renderShotAmmunitionConditions } from "../scripts/tools/damage-shot-link.js";
import { f3Messages, f3Text } from "../scripts/tools/ammunition-f3-localization.js";
import { loadAutomaticAmmoTranslations } from "../scripts/tools/automatic-ammunition-localization.js";
import { ammunitionInstructionKeys } from "../scripts/tools/ammunition-condition-presentation.js";

// Synthetic arithmetic fixtures. These are not catalog cartridges or live evidence.
function fixture(id) {
  const variant=id.split(":")[0], shot={version:1,attackId:"attack-A",actorId:"actor",spent:1,mode:{name:"saved mode"},
    ammunition:{source:"catalog",status:"confirmed",recipe:{variantId:variant}},correlation:{attackMessageId:"A"},profile:{actorId:"actor",context:{},damage:{nativeSafe:true,variantId:variant,
      components:[{role:"kinetic",status:"resolved",formula:"1d-2 burn ex"},{role:"follow-up",status:"resolved",formula:"1d cr ex"},{role:"fragmentation",status:"resolved",formula:"1d(0.2) cut"}],
      rules:{environment:{source:{kind:"reference",note:"calculation fixture only"},filler:{id:"fixture",name:"fixture substance",source:"fixture source",dose:1,doseUnit:"fixture unit",route:"blood",effect:{verified:true,description:"fixture rule"}}}}}}};
  const source={id:"A",visible:true,isContentVisible:true,speaker:{actor:"actor"},content:"original",flags:{"olegurps-qol":{shotSnapshot:shot}}};
  const runtime={game:{user:{isGM:true},messages:new Map([["A",source]]),i18n:{lang:"ru"}}};
  return {shot,source,runtime,resolved:{shot,source,role:"kinetic",messageId:"A"}};
}
const positive={carrierResolved:true,contact:true,penetration:true,protectionResolved:true,blastConfirmed:true,gasConfirmed:true,areaConfirmed:true,exposureConfirmed:true,
  activeConfirmed:true,penalty:-8,remaining:true,start:100,elapsed:30,ended:false,end:220,chargeConfirmed:true,ruleConfirmed:true,radius:10,duration:120,
  intersects:true,sensor:"optical",path:2,consequence:"cough",outcome:"failure",mof:3,exposureEnded:true};
const matrix=readAuditFixture('ht64-complex-effects-decision-matrix');
test("exactly all 21 F3 IDs, no F4 DATA or unrelated effects",()=>{
  assert.equal(Object.keys(F3_ROWS).length,21);assert.deepEqual(Object.keys(F3_ROWS).sort(),matrix.effects.filter(e=>e.future_package==="F3").map(e=>e.effect_id).sort());
});
for(const [id,row] of Object.entries(F3_ROWS))test(id+" explicit conditions, read-only arithmetic and missing-data gate",()=>{
  const f=fixture(id),before=JSON.stringify(f.source);const r=calculateF3(f.resolved,id,positive,f.runtime);assert.equal(r.status,"resolved");assert.equal(r.automaticApplication,false);
  assert.equal(calculateF3(f.resolved,id,{},f.runtime).status,"unresolved");assert.equal(JSON.stringify(f.source),before);assert(f3RowsForShot(f.shot).some(r=>r.id===id));
  f.runtime.game.user.isGM=false;assert.equal(calculateF3(f.resolved,id,positive,f.runtime),null);f.runtime.game.user.isGM=true;
  f.shot.profile.damage.nativeSafe=false;assert.equal(calculateF3(f.resolved,id,positive,f.runtime),null);assert(F3_FIELDS[row.kind]);
});
function run(id,input){const f=fixture(id);return calculateF3(f.resolved,id,input,f.runtime);}
test("illumination -3 / signal -5, better darkness retained, area and active conditions explicit",()=>{
  for(const [v,limit]of [["ht_illumination",-3],["ht_signal_flare",-5]])for(const penalty of [-10,-5,-3,-1,0])assert.equal(run(v+":vision",{...positive,penalty}).values.penalty,Math.max(penalty,limit));
  assert.equal(run("ht_illumination:vision",{...positive,areaConfirmed:false}).key,"Outside");
  for(const input of [{...positive,areaConfirmed:undefined},{...positive,activeConfirmed:false},{...positive,penalty:1}])assert.equal(run("ht_signal_flare:vision",input).status,"unresolved");
});
test("flare contact full seconds 0/1/10/>10 and contact ending, no assumed light duration",()=>{
  for(const v of ["ht_illumination","ht_signal_flare"])for(const elapsed of [0,0.9,1,10,99])assert.equal(run(v+":contact",{...positive,elapsed}).values.intervals,Math.min(10,Math.floor(elapsed)));
  assert.equal(run("ht_illumination:contact",{...positive,ended:true,end:103,elapsed:50}).values.intervals,3);
  assert.equal(run("ht_illumination:contact",{...positive,contact:false}).key,"NoContact");
  assert.equal(run("ht_illumination:contact",{...positive,ended:undefined}).status,"unresolved");
  assert.equal(run("ht_illumination:contact",{...positive,ended:true,end:99}).status,"unresolved");
});
test("only ordinary smoke radius/5; no inherited timing or invented lifetimes",()=>{
  const ordinary=run("ht_smoke:cloud",positive);assert.equal(ordinary.key,"CloudBuild");assert.equal(ordinary.values.build,2);assert.equal(ordinary.values.radius,10);assert.equal(ordinary.values.end,220);
  // HT171: these are Smoke variants and retain its base timing.
  for(const v of ["ht_colored_smoke","ht_hot_smoke","ht_prism_smoke","ht_em_smoke"]){const r=run(v+":cloud",positive);assert.equal(r.key,"CloudBuild");assert.equal(r.values.build,2);assert.equal(run(v+":cloud",{...positive,duration:undefined}).status,"unresolved");for(const duration of [59,241])assert.equal(run(v+':cloud',{...positive,duration}).status,'unresolved');}
  for(const input of [{...positive,radius:undefined},{...positive,duration:undefined},{...positive,ruleConfirmed:false},{...positive,duration:59},{...positive,duration:241}])assert.equal(run("ht_smoke:cloud",input).status,"unresolved");
  assert.match(run("ht_smoke:cloud",{...positive,elapsed:120}).values.state,/./);
});
test("HT171 Smoke variants retain optical penalties and extend them only to named sensors",()=>{
  assert.equal(run("ht_smoke:sensors",positive).values.penalty,-10);assert.equal(run("ht_colored_smoke:sensors",positive).values.penalty,-7);
  for(const v of ["ht_hot_smoke","ht_prism_smoke","ht_em_smoke"])for(const sensor of ["optical","infrared","hyperspectral"]){const r=run(v+":sensors",{...positive,sensor});assert.equal(r.key,"Visibility");assert.equal(r.values.penalty,-10);}
  assert.equal(run("ht_prism_smoke:sensors",{...positive,sensor:"laser"}).key,"SensorAffected");assert.equal(run("ht_em_smoke:sensors",{...positive,sensor:"laser"}).key,"SensorUnknown");
  for(const sensor of ["radar","imagingRadar"])assert.equal(run("ht_em_smoke:sensors",{...positive,sensor}).values.penalty,-10);
  assert.equal(run("ht_hot_smoke:sensors",{...positive,sensor:"radar"}).key,"SensorUnknown");assert.equal(run("ht_hot_smoke:sensors",positive).values.penalty,-10);
  assert.equal(run("ht_smoke:sensors",{...positive,intersects:false}).key,"Outside");assert.equal(run("ht_smoke:sensors",{...positive,sensor:undefined}).status,"unresolved");
});
test("gas uses only path inside cloud: 0/1/2/>4 and -10 floor; unknown stays unknown",()=>{
  for(const v of ["ht_tear_gas","ht_tear_gas_vomit"])for(const path of [0,1,2,4,10])assert.equal(run(v+":vision",{path}).values.penalty,Math.max(-10,-3*path));
  for(const path of [undefined,-1,NaN,Infinity,"2"])assert.equal(run("ht_tear_gas:vision",{path}).status,"unresolved");
});
test("one resistance at a time: MoF / 5MoF, success unknown and ongoing exposure",()=>{
  for(const consequence of ["cough","blind"]){const r=run("ht_tear_gas_vomit:duration",{...positive,consequence});assert.equal(r.values.duration,5);assert.equal(r.values.after,3);assert.equal(r.values.end,400);}
  const retch=run("ht_tear_gas_vomit:duration",{...positive,consequence:"retch"});assert.equal(retch.values.duration,17);assert.equal(retch.values.after,15);assert.equal(retch.values.end,1120);
  assert.equal(run("ht_tear_gas:duration",{...positive,consequence:"retch"}).status,"unresolved");
  assert.equal(run("ht_tear_gas:duration",{outcome:"success"}).key,"Success");
  for(const input of [{...positive,outcome:undefined},{...positive,mof:undefined},{...positive,mof:0},{...positive,mof:1.5},{...positive,end:99}])assert.equal(run("ht_tear_gas:duration",input).status,"unresolved");
  const ongoing=run("ht_tear_gas:duration",{...positive,exposureEnded:false,end:undefined});assert.equal(ongoing.key,"ExposureOngoing");assert.equal(ongoing.values.end,undefined);
  assert.equal(run("ht_tear_gas_vomit:duration",{...positive,consequence:"blind",mof:1}).values.after,1); // does not inherit retching MoF
});
test("WP 0/9/10/59/60/61, max six, removal / extinguishing / unknown contact",()=>{
  for(const elapsed of [0,9,10,59,60,61])assert.equal(run("ht_white_phosphorus:repeat-burn",{...positive,elapsed}).values.intervals,Math.min(6,Math.floor(elapsed/10)));
  for(const [end,n]of [[109,0],[110,1],[119,1],[160,6]])assert.equal(run("ht_white_phosphorus:repeat-burn",{...positive,ended:true,end,elapsed:100}).values.intervals,n);
  for(const field of ["contact","remaining","start","elapsed","ended"]){const input={...positive};delete input[field];assert.equal(run("ht_white_phosphorus:repeat-burn",input).status,"unresolved");}
  for(const input of [{...positive,contact:false},{...positive,remaining:false}])assert.equal(run("ht_white_phosphorus:repeat-burn",input).key,"NoContact");
  assert.equal(run("ht_white_phosphorus:repeat-burn",positive).values.formula,"1d(0.2) burn");
});
test("poison never invents substance dose route or successful poisoning; gas components explicit",()=>{
  const id="ht_poison:delivery",f=fixture(id),calc=i=>calculateF3(f.resolved,id,i,f.runtime);assert.equal(calc(positive).key,"Delivery");assert.equal(calc({...positive,penetration:false}).key,"NoDelivery");
  f.shot.profile.damage.rules.environment.filler.route="contact";assert.equal(calc({...positive,penetration:false}).key,"Delivery");assert.equal(calc({...positive,protectionResolved:false}).status,"unresolved");
  f.shot.profile.damage.rules.environment.filler.route="unknown";assert.equal(calc(positive).status,"unresolved");
  delete f.shot.profile.damage.rules.environment.filler;assert.equal(calc(positive).status,"unresolved");
  const g=fixture("ht_poison_gas:blast");g.shot.profile.damage.components=[];assert.equal(calculateF3(g.resolved,"ht_poison_gas:blast",positive,g.runtime).status,"unresolved");
  assert.equal(run("ht_poison_gas:blast",{...positive,exposureConfirmed:false}).status,"unresolved");
});
test("exact attack and linked component, switching current ammo/reload/repeated calculations cannot mutate saved state",()=>{
  const id="ht_white_phosphorus:repeat-burn",f=fixture(id),before=JSON.stringify(f.source);f.runtime.game.currentMagazine={variantId:"ht_smoke"};
  for(let i=0;i<3;i++)assert.equal(calculateF3(ammunitionConditionSource(f.source,f.runtime),id,positive,f.runtime).values.intervals,3);
  const restored=JSON.parse(JSON.stringify(f.source));f.runtime.game.messages.set("A",restored);assert.equal(calculateF3(ammunitionConditionSource(restored,f.runtime),id,positive,f.runtime).values.intervals,3);assert.equal(JSON.stringify(f.source),before);
  const damage={id:"D",visible:true,isContentVisible:true,speaker:{actor:"actor"},flags:{"olegurps-qol":{damageLink:{status:"linked",originatingAttackMessageId:"A",attackId:"attack-A",actorId:"actor",damageComponent:"fragmentation"}}}};
  assert.equal(calculateF3(ammunitionConditionSource(damage,f.runtime),id,positive,f.runtime).status,"resolved");damage.flags["olegurps-qol"].damageLink.damageComponent="kinetic";assert.equal(calculateF3(ammunitionConditionSource(damage,f.runtime),id,positive,f.runtime),null);
  restored.flags["olegurps-qol"].shotSnapshot.correlation.attackMessageId="wrong";assert.equal(ammunitionConditionSource(damage,f.runtime),null);
});
test("public whisper blind permission checks precede any flags; inaccessible origin never replaced",()=>{
  for(const access of [{visible:false,isContentVisible:true},{visible:true,isContentVisible:false}]){const hidden={id:"hidden",...access,get flags(){throw Error("private flags read");}};assert.equal(ammunitionConditionSource(hidden,{game:{messages:new Map()}}),null);}
  const f=fixture("ht_smoke:cloud");const d={id:"D",visible:true,isContentVisible:true,flags:{"olegurps-qol":{damageLink:{status:"linked",originatingAttackMessageId:"hidden",attackId:"attack-A"}}}};
  f.runtime.game.messages.set("hidden",{visible:true,isContentVisible:false,get flags(){throw Error("private origin flags read");}});assert.equal(ammunitionConditionSource(d,f.runtime),null);
  assert.equal(calculateF3({...f.resolved,source:{...f.source,isContentVisible:false}},"ht_smoke:cloud",positive,f.runtime),null);
});
test("HAFLA F1 smoke knowledge retained only for exact saved confirmed identity",()=>{
  const f=fixture("ht_white_phosphorus:repeat-burn");Object.assign(f.shot.ammunition,{book:"ht",ammoId:"ht_specific_hafla_dm34_35mm_wp"});f.shot.mode.standaloneRef={modeId:"Wr3VDL3Z6SR3KCz3K"};f.shot.profile.damage.rules.environment.nativePreserved=true;
  assert(ammunitionInstructionKeys(f.shot).includes("F1HAFLASmoke"));f.shot.ammunition.ammoId="other_wp";assert(!ammunitionInstructionKeys(f.shot).includes("F1HAFLASmoke"));
});
test("actual RU EN translation loading refreshes F2 cache, key parity and interpolation",async()=>{
  assert.deepEqual(Object.keys(f3Messages.ru).sort(),Object.keys(f3Messages.en).sort());
  for(const lang of ["ru","en"]){const json=JSON.parse(await fs.readFile(new URL("../lang/"+lang+".json",import.meta.url),"utf8"));const i18n={lang,translations:{},localize:k=>i18n.translations[k]??k};let calls=0;
    for(const [k,v]of Object.entries(json))if(!k.includes(".F3"))i18n.translations[k]=v;
    const before=structuredClone(i18n.translations);
    await loadAutomaticAmmoTranslations({game:{i18n},fetch:async()=>{calls++;return{ok:true,json:async()=>json}},location:{},foundry:{utils:{setProperty:(o,k,v)=>o[k]=v}}});assert.equal(calls,0);
    assert.deepEqual(i18n.translations,before);
    for(const [k,v]of Object.entries(f3Messages.ru)){assert.ok(json["OleGURPS.AutomaticAmmo.F3"+k]);assert.equal(f3Text(k,{game:{i18n}}),v.replace(/\{\w+\}/g,"\u2014"));}
    assert(f3Text("Visibility",{game:{i18n}},{penalty:-10}).includes("-10"));
  }
});
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.textContent="";}
  get value(){return(this.tag==="select"&&!this._value?this.children[0]?.value:this._value)??"";}set value(v){this._value=v;}
  append(el){this.children.push(el);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.events[k]=fn;}replaceChildren(){this.children=[];}remove(){this.removed=true;}querySelector(){return null;}
}
test("one existing closed section and F2 form shared with F3, private local properties, rerender clears and revocation removes controls",()=>{
  const id="ht_white_phosphorus:repeat-burn",f=fixture(id);f.runtime.document={createElement:t=>new Element(t)};const card=new Element("div"),root={querySelector:s=>s.includes("gga-chat-message")?card:null};
  const details=renderShotAmmunitionConditions(f.source,root,f.runtime);assert(details);assert(!details.attrs.open);const forms=details.children.filter(c=>c.className==="olegurps-f2-local");assert.equal(forms.length,1);const local=forms[0];assert(!local.attrs.open);
  const select=local.children.find(c=>c.tag==="select");assert(select.children.some(c=>c.value==="ht_white_phosphorus:fragment-hits"));assert(select.children.some(c=>c.value===id));select.value=id;select.events.change();
  const fields=local.children.find(c=>c.className==="olegurps-f2-fields"),controls=fields.children.map(c=>c.children[0]);for(const c of controls)c.value=["contact","remaining"].includes(c.name)?"yes":c.name==="ended"?"no":c.name==="start"?"91357":"30";
  const before=JSON.stringify(f.source);local.children.find(c=>c.tag==="button").events.click({preventDefault(){},stopPropagation(){}});assert.equal(JSON.stringify(f.source),before);assert(!JSON.stringify(f.source).includes("91357"));assert(controls.every(c=>!c.attrs.value&&!c.attrs.title&&!c.attrs["aria-label"]));
  select.events.change();assert(fields.children.every(c=>c.children[0].value===""));
  f.runtime.game.user.isGM=false;const player=new Element("details");appendF2Conditions(player,f.resolved,f.runtime,()=>null,f3Extension(f.resolved,f.runtime));assert(!player.children.some(c=>c.className==="olegurps-f2-local"));assert(!JSON.stringify(player).includes("91357"));
  local.children.find(c=>c.tag==="button").events.click({preventDefault(){},stopPropagation(){}});assert(local.removed);
});
test("F3 uses shared helpers and cannot create messages rolls timers scene effects or actor writes",async()=>{
  const source=await fs.readFile(new URL("../scripts/tools/ammunition-f3.js",import.meta.url),"utf8");for(const helper of ["environmentalVisibility(","gasConsequenceDuration(","smokeBuildSeconds(","environmentalContactSchedule("])assert(source.includes(helper));
  assert(!/new Roll\(|ChatMessage\.|\.toMessage\(|\.update\(|\.setFlag\(|setTimeout\(|setInterval\(|game\.actors|game\.settings|canvas\.|createEmbeddedDocuments/.test(source));
});
