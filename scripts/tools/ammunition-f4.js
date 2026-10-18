import { f4Text } from "./ammunition-f4-localization.js";
import { canManageAmmunitionShot } from './ammunition-approval-service.js';

export const F4_ROWS = Object.freeze({
  "ht_subsonic_pistol:hearing":"Hearing", "ht_subsonic_rifle:hearing":"Hearing", "ht_silent:hearing":"Hearing",
  "ht_hollow_point:malf":"Reliability", "ht_plus_p:reliability":"Reliability", "ht_tracer:next-turn":"Tracer",
  "ht_match_handloaded:checks":"Handload", "ht_plus_p:loading-support":"Loading", "ht_plus_p:native-conditions":"Native"
});
export function f4RowsForShot(shot) {
  if (!shot?.profile?.damage?.nativeSafe) return [];
  const v=shot.profile.damage.variantId??shot.ammunition?.recipe?.variantId;
  return Object.entries(F4_ROWS).filter(([id])=>id.startsWith(v+":")).map(([id,kind])=>({id,kind}));
}
const readable = source => source?.visible===true&&source?.isContentVisible===true;
export function permittedF4(resolved, runtime=globalThis) {
  // Do not even inspect the snapshot before permissions on its source.
  if (!canManageAmmunitionShot(resolved,runtime) || !readable(resolved?.source)) return false;
  const saved=resolved.source.getFlag?.("olegurps-qol","shotSnapshot")??resolved.source.flags?.["olegurps-qol"]?.shotSnapshot;
  return saved?.version===1 && saved.correlation?.attackMessageId===resolved.source.id &&
    !!saved.attackId && saved.actorId===saved.profile?.actorId &&
    JSON.stringify(saved)===JSON.stringify(resolved.shot);
}
const finite = n => typeof n==="number"&&Number.isFinite(n);
export function calculateF4(resolved,id,input={},runtime=globalThis) {
  if (!permittedF4(resolved,runtime)||!f4RowsForShot(resolved.shot).some(r=>r.id===id)) return null;
  const shot=resolved.shot, variant=id.split(":")[0], rules=shot.profile.damage.rules??{};
  const missing={status:"unresolved",key:"Missing",automaticApplication:false};
  if (F4_ROWS[id]==="Hearing") {
    if (!input.listener||!finite(input.distance)||input.distance<0) return missing;
    const listener=runtime.game.actors?.get(input.listener);
    if(!runtime.game?.user?.isGM&&listener?.isOwner!==true)return missing;
    const base=Number(listener?.system?.hearing);
    if (!listener||!Number.isFinite(base)||base<=0) return missing;
    if (variant==="ht_silent") return rules.silent?.hearingTableDistanceYards===16 ?
      {status:"manual",key:"SilentResult",values:{distance:input.distance},automaticApplication:false}:missing;
    if (![input.distanceModifier,input.otherModifier,input.suppressor].every(finite)||typeof input.included!=="boolean") return missing;
    const ammo=variant==="ht_subsonic_pistol"?-1:-2;
    const modifier=input.distanceModifier+input.otherModifier+(input.included?0:input.suppressor)+ammo;
    return {status:"resolved",key:"HearingResult",values:{base,modifier,ammo,target:base+modifier},automaticApplication:false};
  }
  if (F4_ROWS[id]==="Reliability") {
    if (input.confirmed!==true||!Number.isInteger(input.tl)||input.tl<0||!Number.isInteger(input.malf)||input.malf<2||input.malf>18||
        !["automatic","self_loading","other"].includes(input.action)) return missing;
    const saved=rules.pressure;
    if (saved?.weaponTL!=null&&saved.weaponTL!==input.tl||saved?.weaponQuality&&
        (saved.weaponQuality==="cheap"?"cheap":["normal","fine","very_fine"].includes(saved.weaponQuality)?"normal":saved.weaponQuality)!==input.quality ||
        finite(Number(shot.profile.raw?.malf))&&shot.profile.raw.malf!=null&&Number(shot.profile.raw.malf)!==input.malf) return missing;
    let modifier=0;
    if (variant==="ht_hollow_point") modifier=input.tl>=5&&input.tl<=7&&input.action!=="other"?-1:0;
    else if (input.tl>=5&&input.tl<=6) modifier=-1;
    else if (input.tl>=7&&input.tl<=8) {
      if (!["cheap","normal"].includes(input.quality)) return missing;
      modifier=input.quality==="cheap"?-1:0;
    }
    return {status:"manual",key:"MalfResult",values:{base:input.malf,modifier,malf:input.malf+modifier,
      extra:variant==="ht_plus_p"?f4Text("PressureManual"):""},automaticApplication:false};
  }
  return {status:"manual",key:"Rule"+F4_ROWS[id],values:{},automaticApplication:false};
}

// One transient Combatant marker, not a permanent ledger, Actor modifier or bucket.
const tracerScope="olegurps-qol",tracerFlag="tracerNextTurn",queues=new WeakMap();
const orderFingerprint = c => {
  let a=2166136261,b=5381;
  for(const ch of JSON.stringify((c.turns??[]).map(x=>x.id))){a=Math.imul(a^ch.charCodeAt(0),16777619);b=Math.imul(b,33)^ch.charCodeAt(0);}
  return `${c.turns.length}:${a>>>0}:${b>>>0}`;
};
function combatBinding(actorId,tokenId,runtime) {
  const c=runtime.game?.combat;
  if (!c?.started||!Number.isInteger(c.round)||c.round<1||!Number.isInteger(c.turn)) return null;
  const list=c.turns??[],found=list.filter(x=>x.actorId===actorId&&(!tokenId||x.tokenId===tokenId));
  if (found.length!==1) return null;
  const combatant=found[0],index=list.indexOf(combatant);
  // The order stays only in runtime comparison, never hidden Combatant IDs in a public snapshot.
  return {c,combatant,index};
}
export function captureF4Combat(actorId,tokenId,runtime=globalThis) {
  const b=combatBinding(actorId,tokenId,runtime);
  return b&&b.c.turn===b.index ? {combatId:b.c.id,combatantId:b.combatant.id,round:b.c.round,turn:b.c.turn,order:orderFingerprint(b.c)}:null;
}
export function tracerBonus(actorId,tokenId,runtime=globalThis) {
  const b=combatBinding(actorId,tokenId,runtime); if(!b||b.c.turn!==b.index) return 0;
  const states=[runtime.game?.actors?.get?.(actorId)?.getFlag?.(tracerScope,tracerFlag),b.combatant.getFlag?.(tracerScope,tracerFlag)];
  return states.some(state=>state?.version===1&&state.expired!==true&&state.actorId===actorId&&state.tokenId===b.combatant.tokenId&&state.combatId===b.c.id&&
    state.round===b.c.round&&state.turn===b.c.turn&&state.originRound===b.c.round-1&&
    state.order===orderFingerprint(b.c)) ? 1:0;
}
export async function confirmTracer(resolved,confirmed,runtime=globalThis) {
  if (!permittedF4(resolved,runtime)||confirmed!==true||resolved.messageId!==resolved.source.id||
      resolved.source.blind===true||(resolved.source.whisper?.length??0)>0 ||
      !f4RowsForShot(resolved.shot).some(r=>r.id==="ht_tracer:next-turn")) throw Error(f4Text("TracerBlocked"));
  const shot=resolved.shot,b=combatBinding(shot.actorId,shot.profile.context?.tokenId,runtime),origin=shot.profile.context?.f4?.combat;
  if(!b||!origin||origin.combatId!==b.c.id||origin.combatantId!==b.combatant.id||origin.round!==b.c.round||origin.turn!==b.c.turn||b.index!==b.c.turn)
    throw Error(f4Text("TracerBlocked"));
  const actor=runtime.game?.actors?.get?.(shot.actorId);
  const storage=runtime.game?.user?.isGM?b.combatant:actor;
  if(!storage?.setFlag||!runtime.game?.user?.isGM&&actor?.isOwner!==true)throw Error(f4Text('TracerBlocked'));
  const previous=queues.get(storage)??Promise.resolve();
  const next=previous.catch(()=>{}).then(async()=>{
    const now=captureF4Combat(shot.actorId,b.combatant.tokenId,runtime);
    if(JSON.stringify(now)!==JSON.stringify(origin))throw Error(f4Text("TracerBlocked"));
    const saved=storage.getFlag?.(tracerScope,tracerFlag);
    if(saved?.attackId===shot.attackId)return false;
    await storage.setFlag(tracerScope,tracerFlag,{version:1,actorId:shot.actorId,tokenId:b.combatant.tokenId,
      combatId:b.c.id,attackId:shot.attackId,attackMessageId:resolved.source.id,originRound:origin.round,
      round:origin.round+1,turn:origin.turn,order:orderFingerprint(b.c)});
    return true;
  });queues.set(storage,next);return next;
}

export function appendF4Conditions(details,resolved,runtime,refresh) {
  if (!readable(resolved?.source)) return;
  const rows=f4RowsForShot(resolved?.shot);if(!rows.length)return;
  const doc=runtime.document,add=(p,tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;p.append(e);return e;};
  if(!permittedF4(resolved,runtime))return;
  const local=add(details,"details");local.className="olegurps-f4-local";add(local,"summary",f4Text("Local"));add(local,"div",f4Text("Hint"));
  const select=add(local,"select");select.setAttribute("aria-label",f4Text("Local"));for(const r of rows){const o=add(select,"option",f4Text(r.kind));o.value=r.id;}
  const fields=add(local,"div"),controls=new Map(),out=add(local,"div");fields.className="olegurps-f2-fields";
  const build=()=>{
    fields.replaceChildren();controls.clear();out.textContent="";
    const kind=F4_ROWS[select.value],keys=kind==="Hearing"?["listener","distance",...(select.value.startsWith("ht_silent:")?[]:["distanceModifier","otherModifier","suppressor","included"])]:
      kind==="Reliability"?["malf","tl","quality","action","confirmed"]:kind==="Tracer"?["confirmed"]:[];
    for(const key of keys){const label=add(fields,"label",f4Text(kind==="Tracer"&&key==="confirmed"?"ConfirmTracer":key));const choices={included:["yes","no"],confirmed:["yes","no"],quality:["cheap","normal"],action:["automatic","self_loading","other"]}[key];
      const c=add(label,choices?"select":"input");c.name=key;if(choices){for(const v of ["",...choices]){const o=add(c,"option",v?f4Text(v):"—");o.value=v;}}
      else{c.type=key==="listener"?"text":"number";c.step="any";}c.addEventListener("input",()=>{out.textContent="";});controls.set(key,c);}
  };select.addEventListener("change",build);build();
  const button=add(local,"button",f4Text("Calculate"));button.type="button";
  button.addEventListener("click",async event=>{
    event.preventDefault();event.stopPropagation();const current=refresh();if(!permittedF4(current,runtime)||current.shot.attackId!==resolved.shot.attackId){local.remove();return;}
    const input={};for(const[key,c]of controls)input[key]=["included","confirmed"].includes(key)?c.value===""?undefined:c.value==="yes":["listener","quality","action"].includes(key)?c.value:c.value.trim()===""?undefined:Number(c.value);
    try{if(F4_ROWS[select.value]==="Tracer"){await confirmTracer(current,input.confirmed,runtime);out.textContent=f4Text("TracerReady");}
      else{const r=calculateF4(current,select.value,input,runtime);out.textContent=r?f4Text(r.key,r.values):"";}}
    catch(e){out.textContent=e.message;}
  });
}

export async function expireTracerMarkers(combat,runtime=globalThis) {
  if (!runtime.game?.user?.isGM) return;
  for (const combatant of combat.combatants?.contents??combat.turns??[]) {
    const state=combatant.getFlag?.(tracerScope,tracerFlag);
    if (!state||state.expired) continue;
    if (!combat.started||state.combatId!==combat.id||combat.round<state.originRound||
        combat.round>state.round||combat.round===state.round&&combat.turn>state.turn||state.order!==orderFingerprint(combat))
      await combatant.setFlag(tracerScope,tracerFlag,{...state,expired:true});
  }
}
