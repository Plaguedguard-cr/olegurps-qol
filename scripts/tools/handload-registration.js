import { handloadCondition } from "./cartridge-load-conditions.js";
import { ammoTypeKey } from "./ammo-inventory.js";
import { f4Text } from "./ammunition-f4-localization.js";
import { HT_AUTOMATIC_SPECIAL_RULES } from "./ht-kinetic-rules.js";
import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";

/** Individual manufacture is evidence for this batch, never a new factory catalog row. */
export function registeredHandloadFacts(original,definition,scope=null) {
  if(!definition?.registeredByGM||!original?.weaponActions?.complete||!original.weaponActions.values?.length)return null;
  const facts=structuredClone(original);facts.handloadDefinition=structuredClone(definition);facts.evidence??={};
  for(const key of ["matched_to_this_individual_weapon","armoury_and_iq_guns_success","handloaded_batch"])
    facts.evidence[key]={value:true,source:definition.source};
  return handloadCondition(facts,scope)?null:facts;
}
export function publicManufactureCheck(message,skill,runtime=globalThis) {
  if(!runtime.game?.user?.isGM||message?.visible!==true||message?.isContentVisible!==true)return null;
  // Public recipes must never copy blind/whisper rolls or reveal their results.
  if(message.blind===true||(message.whisper?.length??0)>0||message.rolls?.length!==1)return null;
  const total=message.rolls[0].total;if(!Number.isInteger(total)||total<3||total>=17)return null;
  const card=new runtime.DOMParser().parseFromString(message.content??"","text/html").querySelector(".roll-message.gga-chat-message");
  if(!card?.querySelector(".success")||card.querySelector(".failure")||!new RegExp("\\b"+skill+"\\b","i").test(card.textContent))return null;
  const matches=[...card.querySelectorAll("[data-otf]")].map(e=>e.getAttribute("data-otf")).filter(s=>/^[+-]?\d+ margin for /.test(s));
  if(matches.length!==1)return null;const margin=Number(matches[0].match(/^[+-]?\d+/)[0]);
  if(margin<0)return null;
  return {skill,success:true,target:total+margin,total,reference:message.id,...(skill==="Guns"?{basedOn:"IQ"}:{})};
}
export function createRegisteredHandload({actor,weapon,type,modeId,facts,option,input},runtime=globalThis) {
  if(!runtime.game?.user?.isGM||type?.recipe?.variantId!=="ht_match_handloaded"||!modeId||input?.confirmed!==true||
      !input.batch?.trim()||!input.source?.trim())throw Error(f4Text("BatchBlocked"));
  const armoury=publicManufactureCheck(runtime.game.messages.get(input.armoury),"Armoury",runtime);
  const iqGuns=publicManufactureCheck(runtime.game.messages.get(input.iqGuns),"Guns",runtime);
  if(!armoury||!iqGuns||input.armoury===input.iqGuns)throw Error(f4Text("BatchBlocked"));
  const definition={handloaded:true,registeredByGM:true,batchId:input.batch.trim(),source:input.source.trim(),
    actorId:actor.id,weaponId:weapon.id,modeId,ammoId:type.ammoId,armoury,iqGuns};
  const reviewed=registeredHandloadFacts(facts,definition,definition);
  if(!reviewed||evaluateHTOptionEligibility(option,reviewed).status!=="compatible")throw Error(f4Text("BatchBlocked"));
  const recipe={version:1,variantId:"ht_match_handloaded",customId:runtime.crypto.randomUUID(),parameters:{},
    autoProfile:{version:1,id:"individual-handloaded-batch",revision:1,origin:"gm",handloadDefinition:definition,
      model:{version:1,kind:"special-rule",status:"resolved",rule:structuredClone(HT_AUTOMATIC_SPECIAL_RULES.ht_match_handloaded)}}};
  const result={source:"catalog",book:"ht",kind:"ammo-item",ammoId:type.ammoId,name:type.name+" · "+definition.batchId,recipe};
  result.key=ammoTypeKey(result);return result;
}
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function handloadEditorHTML(type,runtime=globalThis) {
  if(!runtime.game?.user?.isGM||type?.recipe?.variantId!=="ht_match_handloaded")return "";
  return `<details data-handload-registration><summary>${escape(f4Text("Handload"))}</summary><p>${escape(f4Text("RuleHandload"))}</p>`+
    `<div class="gam-inventory-add">`+["batch","source","armoury","iqGuns"].map(key=>`<label>${escape(f4Text(key))}<input name="handload-${key}"></label>`).join("")+
    `</div><label><input type="checkbox" name="handload-confirmed">${escape(f4Text("checkBasis"))}</label>`+
    `<button type="button" data-inventory-action="register-handload">${escape(f4Text("SaveBatch"))}</button></details>`;
}
