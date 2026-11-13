import {generateId} from '../random-id.js';
import {resolveMine} from './mine-catalog.js';
import {calculateMine,normalizeMineTargets} from './mine-rules.js';
import {mt,mineEscape as esc} from './mine-localization.js';

export const MINE_SCOPE='olegurps-qol',MINE_SETTING='placedMines';
const copy=v=>structuredClone(v),installed=new WeakSet(),queues=new WeakMap();
export const readMines=(runtime=globalThis)=>copy(runtime.game.settings.get(MINE_SCOPE,MINE_SETTING)??{version:1,events:[]});
export const mineAuthority=(runtime=globalThis)=>[...runtime.game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
export function canManageMine(event,user,runtime=globalThis){return !!(user&&(user.isGM||event.userId===user.id||!!event.actorId&&runtime.game.actors.get(event.actorId)?.testUserPermission(user,'OWNER')));}
const save=(state,rt)=>{if(mineAuthority(rt)?.id!==rt.game.user.id)throw Error(mt('NoGM'));return rt.game.settings.set(MINE_SCOPE,MINE_SETTING,copy(state));};
const receipt=(rt,id,key)=>[...rt.game.messages].find(m=>m.getFlag?.(MINE_SCOPE,'mineReceipt')?.eventId===id&&m.getFlag(MINE_SCOPE,'mineReceipt')?.key===key);
export function mineResultHTML(event){
  const r=event.result;if(!r)return `<p>${esc(mt('Recovery'))}</p>`;
  return `<article class="og-mine-result"><strong>${esc(event.profile.name)} – ${esc(event.initiatorName??'')}</strong>${r.targets.map(row=>`<p><strong>${esc(row.target.name)}</strong>: ${row.blast?mt('Blast')+' '+Math.max(0,row.blast.value-row.blast.coverDR):''}${row.fragments?' · '+mt('Fragments')+' '+row.fragments.hits:''}${row.directed?' · '+mt('Pellets')+' '+row.directed.hits:''}${(row.effects??[]).map(e=>e.resistance?' · '+esc(e.resistance.consequence??e.resistance.reason??''):e.tangler?' · Tangler ST '+e.tangler.strength:'').join('')}</p>`).join('')}
    <details class="olegurps-chat-details"><summary>${esc(mt('Details'))}</summary><p>${esc(event.profile.source)} · ${esc(mt('Height'))}: ${r.heightFeet}</p>
    ${r.targets.map(row=>`<section><strong>${esc(row.target.name)}</strong> · ${row.distance.toFixed(3)} yd${row.nativeContent??''}${(row.effects??[]).map(e=>e.nativeContent??'').join('')}
      ${row.blast?'<p>'+esc(mt('Blast'))+': '+row.blast.roll.total+' / '+row.blast.divisor+' – Cover DR '+row.blast.coverDR+' = '+Math.max(0,row.blast.value-row.blast.coverDR)+'</p>':''}
      ${row.attacks.map(a=>'<p>'+esc(mt(a.kind))+': '+a.base+' + RoF '+(a.rapidFire??0)+' + Range '+a.range+' + SM '+a.sm+' + Posture '+(a.posture??0)+' + '+esc(mt('Modifier'))+' '+(a.modifier??0)+' = '+a.skill+'; 3d6 '+a.total+'; '+esc(mt('Hits'))+' '+a.hits+'</p>').join('')}
      <ol>${r.components.filter(c=>c.targetId===row.target.id).map(c=>'<li>'+esc(c.location??c.key)+': '+esc(c.formula)+' '+esc(c.type==='SOURCE_UNDETERMINED'?'Damage':c.type)+'; '+(c.roll?c.roll.total+' → ':'')+c.value+(c.divisor!==1?' ('+c.divisor+')':'')+(c.coverDR?' · Cover DR '+c.coverDR:'')+'</li>').join('')}</ol>
      ${(row.effects??[]).map(e=>e.components.filter(c=>c.radiation).map(c=>'<p>Radiation: '+c.rawRads+' / '+c.radiationFactor+' = '+c.rads+' rad</p><p>'+esc(mt('RadiationFollowup'))+'</p>').join('')+e.components.filter(c=>!c.nativeSafe&&!c.radiation).map(c=>'<p>'+esc(c.note??mt('UnknownDamage'))+': '+c.value+'</p>').join('')+(e.resistance?.tableEntry?'<p>'+esc(JSON.stringify(e.resistance.tableEntry))+'</p>':'')).join('')}
      ${(row.deferredChecks??[]).map(c=>'<p>'+esc(c.label)+' · HT'+c.modifier+' · '+(c.delaySeconds!=null?c.delaySeconds+' s · ':'')+esc(c.reason)+' · '+esc(c.source)+'</p>').join('')}</section>`).join('')}
    <p>${esc(mt('Remaining'))}: ${r.remaining}</p></details>${event.profile.payloadEffect?.rules?.length?`<details><summary>${esc(mt('Note'))}</summary>${event.profile.payloadEffect.rules.map(rule=>'<p>'+esc(rule)+'</p>').join('')}${r.targets.flatMap(row=>(row.effects??[]).map(e=>e.procedure?.chemical?.cloud?'<p>'+esc(JSON.stringify(e.procedure.chemical.cloud))+'</p>':'')).join('')}</details>`:''}</article>`;
}
async function nativeDamage(event,c,runtime){
  const old=receipt(runtime,event.id,c.id);if(old)return old.id;
  const actor=runtime.game.actors.get(event.actorId)??runtime.game.user,tag={eventId:event.id,key:c.id,targetId:c.targetId,targetActorId:c.targetActorId,location:c.location,drMultiplier:c.drMultiplier??1};
  // The static GGA create() reads current targets and ChatMessage.getSpeaker().
  // Use its native parser and payload builder with an explicit speaker instead:
  // this keeps theatre entirely independent of canvas and the modifier bucket.
  const builder=new runtime.GURPS.DamageChat();
  if(typeof builder._getDiceData!=='function'||typeof builder._createDraggableSection!=='function')throw Error('Нативный GGA Damage несовместим с минами.');
  const modifier=c.nativeModifier||(/\bsur\b/.test(c.modifiers)?'sur':/\binc\b/.test(c.modifiers)?'inc':null);
  const dice=builder._getDiceData(String(c.value)+(c.divisor!==1?'('+c.divisor+')':''),c.type,[],null,modifier);
  if(!dice)throw Error(mt('Invalid'));
  const payload=await builder._createDraggableSection(actor,dice,c.targetName,[],c.location??null);
  const content=await runtime.renderTemplate('systems/gurps/templates/damage-message.hbs',{draggableData:[payload],rolled:false,dice:String(c.value),loaded:false,damageTypeText:c.type+(modifier?' '+modifier:''),modifiers:[],userTarget:null,hitlocation:c.location,numtimes:''});
  const message=await runtime.ChatMessage.create({speaker:{actor:event.actorId??undefined,alias:event.initiatorName},content,rolls:[payload.roll],
    flags:{gurps:{transfer:{type:'damageItem',payload:[payload],userTarget:null}},[MINE_SCOPE]:{mineReceipt:tag}}});
  return message.id;
}
async function renderAttacks(event,rt){
  for(const row of event.result.targets){
    row.nativeContent='';
    for(const attack of row.attacks){
      const total=attack.total,skill=attack.skill,success=skill>=3&&(total<=4||(total<17&&total<=skill));
      row.nativeContent+=await rt.renderTemplate('systems/gurps/templates/die-roll-chat-message.hbs',{
        prefix:'',chatthing:event.profile.name+' / '+row.target.name,thing:mt(attack.kind),origtarget:attack.base,fromUser:event.initiatorId,
        targetmods:[{modint:skill-attack.base,mod:skill-attack.base,desc:mt('Modifier')}],modifier:skill-attack.base,showPlus:true,
        multiples:[{rtotal:total,rolls:attack.dice?.join(',')||'3d6',loaded:false}],rtotal:total,finaltarget:skill,margin:skill-total,failure:!success,
        isCritSuccess:total<=4||total===5&&skill>=15||total===6&&skill>=16,isCritFailure:total===18||total===17&&skill<=15||total-skill>=10,
        isDraggable:false,rof:attack.kind==='Pellets'?String(event.profile.directed.pellets):null,rcl:attack.kind==='Pellets'?1:null,rofrcl:attack.hits,
      });
    }
  }
}
export async function performMineOperation(request,user,runtime=globalThis){
  if(mineAuthority(runtime)?.id!==runtime.game.user.id)throw Error(mt('NoGM'));
  const state=readMines(runtime),input=request.input??{};
  let event=state.events.find(e=>e.id===request.eventId);
  if(request.operation==='place'){
    if(event){if(!canManageMine(event,user,runtime))throw Error(mt('Denied'));return copy(event);}
    const actor=input.actorId?runtime.game.actors.get(input.actorId):null;
    if(input.actorId&&!actor?.testUserPermission(user,'OWNER'))throw Error(mt('Denied'));
    const profile=resolveMine(input.selection,runtime.OleGURPSQOL?.catalogs),height=input.heightFeet??profile.burstHeightFeet;
    if(height===''||height==null||!Number.isFinite(Number(height))||Number(height)<0)throw Error(mt('Invalid'));
    if(profile.burstHeightFeet!==null&&Number(height)!==profile.burstHeightFeet)throw Error(mt('Invalid'));
    if(profile.directed&&(!Number.isFinite(Number(input.facing))||input.facing===''))throw Error(mt('Invalid'));
    if(input.theatre!==true){
      const map=input.map,scene=runtime.game.scenes.get(map?.sceneId);
      if(!scene||!scene.testUserPermission(user,'OBSERVER')||![map.x,map.y,map.pixelsPerYard].every(Number.isFinite)||map.pixelsPerYard<=0)throw Error(mt('Invalid'));
    }
    event={id:request.eventId,userId:user.id,actorId:actor?.id??null,initiatorId:user.id,initiatorName:user.name,profile:copy(profile),selection:copy(input.selection),
      theatre:input.theatre===true,map:input.theatre===true?null:copy(input.map),place:String(input.place??''),heightFeet:Number(height),facing:profile.directed?Number(input.facing):null,state:'placed',placedAt:Date.now(),receipts:[]};
    state.events.push(event);await save(state,runtime);
    if(!event.theatre){const {syncMineMarker}=await import('./mine-map.js');await syncMineMarker(event,runtime);}
    return copy(event);
  }
  if(!event||!canManageMine(event,user,runtime))throw Error(mt('Denied'));
  if(request.operation==='recover'){
    if(!user.isGM||!String(input.note??'').trim()||!['retry','done'].includes(input.decision))throw Error(mt('Denied'));
    if(event.state==='calculating'&&input.key==='calculation'&&input.decision==='retry'){
      event.state='placed';event.calculationRecovery={userId:user.id,note:String(input.note),at:Date.now()};await save(state,runtime);return copy(event);
    }
    const r=event.receipts.find(r=>r.key===input.key);if(r?.state!=='resolving')throw Error(mt('Invalid'));
    r.state=input.decision==='done'?'done':'pending';r.review={userId:user.id,note:String(input.note),at:Date.now()};await save(state,runtime);return copy(event);
  }
  if(!['detonate','resume'].includes(request.operation))throw Error(mt('Invalid'));
  if(event.state==='done')return copy(event);
  if(event.state==='calculating')throw Error(mt('Recovery'));
  if(event.state==='placed'){
    if(request.operation!=='detonate')throw Error(mt('Invalid'));
    const targets=normalizeMineTargets(event.profile,input.targets,{heightFeet:event.heightFeet,atmosphere:input.atmosphere,runtime});
    if(!user.isGM&&targets.some(t=>event.profile.payloadEffect&&t.actorId&&!runtime.game.actors.get(t.actorId)?.testUserPermission(user,'OWNER')))throw Error(mt('Denied'));
    event.state='calculating';event.initiatorId=user.id;event.initiatorName=user.name;event.input=copy(input);await save(state,runtime);
    try{event.result=await calculateMine(event.profile,input.targets,{heightFeet:event.heightFeet,atmosphere:input.atmosphere},runtime);await renderAttacks(event,runtime);
      event.receipts=event.result.components.filter(c=>c.nativeSafe&&c.value>0).map(c=>({key:c.id,state:'pending'}));event.receipts.push({key:'summary',state:'pending'});event.state='resolving';await save(state,runtime);
    }catch(error){event.state='placed';event.lastError=String(error.message);await save(state,runtime);throw error;}
  }
  if(event.state!=='resolving')throw Error(mt('Recovery'));
  for(const r of event.receipts){
    const old=receipt(runtime,event.id,r.key);
    if(old){r.state='done';r.messageId=old.id;await save(state,runtime);continue;}
    if(r.state==='done')continue;
    if(r.state==='resolving')throw Error(mt('Recovery'));
    r.state='resolving';await save(state,runtime);
    if(r.key==='summary'){
      const m=await runtime.ChatMessage.create({speaker:{actor:event.actorId??undefined,alias:event.initiatorName},content:mineResultHTML(event),
        flags:{[MINE_SCOPE]:{mineReceipt:{eventId:event.id,key:'summary'},mineDetonation:{id:event.id,profile:copy(event.profile),result:copy(event.result)}}}});r.messageId=m.id;
    }else{
      const c=event.result.components.find(c=>c.id===r.key);r.messageId=runtime.mineNativeDamage?await runtime.mineNativeDamage(event,c):await nativeDamage(event,c,runtime);
    }
    r.state='done';await save(state,runtime);
  }
  // Cleanup is retried independently; a failed delete never reruns calculation or Damage.
  if(!event.theatre){const {removeMineMarker}=await import('./mine-map.js');await removeMineMarker(event,runtime);}
  event.state='done';event.completedAt=Date.now();await save(state,runtime);return copy(event);
}
export async function processMineRequests(runtime=globalThis){
  if(mineAuthority(runtime)?.id!==runtime.game.user.id)return;
  const previous=queues.get(runtime)??Promise.resolve();
  const next=previous.catch(()=>{}).then(async()=>{
    for(const user of runtime.game.users)for(const request of Object.values(user.getFlag(MINE_SCOPE,'mineRequests')??{})){
      if(request.state!=='pending')continue;
      const latest=user.getFlag(MINE_SCOPE,'mineRequests')?.[request.id];if(latest?.state!=='pending')continue;
      await user.update({['flags.'+MINE_SCOPE+'.mineRequests.'+request.id+'.state']:'processing'});
      try{const event=await performMineOperation(request,user,runtime);await user.update({['flags.'+MINE_SCOPE+'.mineRequests.'+request.id]:{id:request.id,eventId:event.id,state:'done'}});}
      catch(error){await user.update({['flags.'+MINE_SCOPE+'.mineRequests.'+request.id]:{id:request.id,eventId:request.eventId,state:'error',error:String(error.message)}});}
    }
  });queues.set(runtime,next);return next;
}
export async function requestMineOperation(operation,eventId,input={},runtime=globalThis){
  if(!mineAuthority(runtime))throw Error(mt('NoGM'));
  const user=runtime.game.user,id=generateId(runtime,{preferFoundry:true}),request={id,eventId:eventId??generateId(runtime,{preferFoundry:true}),operation,input:copy(input),state:'pending'};
  await user.update({['flags.'+MINE_SCOPE+'.mineRequests.'+id]:request});
  if(mineAuthority(runtime).id===user.id)await processMineRequests(runtime);
  return new Promise((resolve,reject)=>{
    let hook,timer;const finish=(value,error)=>{runtime.Hooks.off('updateUser',hook);clearTimeout(timer);user.update({['flags.'+MINE_SCOPE+'.mineRequests.-='+id]:null}).catch(()=>{});error?reject(error):resolve(value);};
    const check=()=>{const r=user.getFlag(MINE_SCOPE,'mineRequests')?.[id];if(r?.state==='done')finish(readMines(runtime).events.find(e=>e.id===r.eventId));else if(r?.state==='error')finish(null,Error(r.error));};
    hook=runtime.Hooks.on('updateUser',u=>{if(u.id===user.id)check();});timer=setTimeout(()=>{runtime.Hooks.off('updateUser',hook);reject(Error(mt('Recovery')));},120000);check();
  });
}
export function installMineService(runtime=globalThis){
  if(installed.has(runtime.Hooks))return;installed.add(runtime.Hooks);
  runtime.game.settings.register(MINE_SCOPE,MINE_SETTING,{scope:'world',config:false,type:Object,default:{version:1,events:[]},restricted:true});
  const reconcile=()=>processMineRequests(runtime).catch(e=>console.error('OleGURPS | Mines',e));runtime.Hooks.on('updateUser',reconcile);
  // No scene or canvas access in theatre mode, including at startup.
  reconcile();
  const markers=()=>{if(mineAuthority(runtime)?.id!==runtime.game.user.id)return;const mapped=readMines(runtime).events.filter(e=>!e.theatre);
    if(mapped.length)import('./mine-map.js').then(m=>m.reconcileMineMarkers(runtime)).catch(e=>console.error('OleGURPS | Mine markers',e));};
  for(const hook of ['canvasReady','updateUser'])runtime.Hooks.on(hook,markers);markers();
}
