import {utWarheadName} from './ut-nomenclature.js';
// Saved grenade effects reuse chemical rules and native GGA chat without a Token.
import {withActorResourceWrite} from './actor-resource-writes.js';
import {generateId} from '../random-id.js';
import {readGrenades,GRENADE_FLAG} from './grenade-service.js';
import {resistanceAttribute,visionResistanceModifier,resistanceOutcome} from './resistance-roll.js';
import {getCriticalState} from './prepared-gga-roll.js';
import {grenText as t,escapeGrenade as esc} from './grenade-localization.js';

const scope='olegurps-qol',copy=value=>structuredClone(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const integer=(value,fallback=0)=>{const n=value==null||value===''?fallback:Number(value);if(!Number.isSafeInteger(n))throw Error(t('InvalidEffectInput'));return n;};
export function grenadeComponentDivisor(component,distance,atmosphere){
  if(!finite(distance)||distance<0)throw Error(t('InvalidEffectInput'));
  const environment=component.falloff==='double-distance'?({normal:1,'very-thin':2,trace:4,vacuum:4}[atmosphere]??null):1;
  if(environment===null)throw Error(t('ChooseAtmosphere'));
  const d=distance===0||component.falloff==='direct'?1:component.falloff==='distance-squared'?distance**2:component.falloff==='distance'?distance:component.falloff==='double-distance'?2*distance:3*distance;
  return d*environment;
}
export function grenadeResistancePlan(profile,input,target){
  const e=profile.payloadEffect;if(!e)throw Error(t('InvalidEffectInput'));
  const d=Number(input.distance),f=e.family,bonus=integer(input.modifier),shield=integer(input.mindShield);
  if(shield<0||!finite(d)||d<0)throw Error(t('InvalidEffectInput'));
  let attribute='HT',modifier=0,applies=true;
  if(e.chemical?.checks?.length){
    const check=e.chemical.checks.find(c=>c.id===input.checkId);if(!check)throw Error(t('InvalidEffectInput'));
    const effect={...copy(e.resistanceEffect),chemical:copy(e.chemical)};
    const conditions=visionResistanceModifier(effect,{checkId:check.id,exposed:input.exposed===true,protected:input.protected===true,immune:input.immune===true});
    return {attribute:'HT',modifier:conditions.modifier+bonus,applies:conditions.applies&&(e.radius==null||d<=e.radius),chemicalEffect:effect,checkId:check.id,conditions};
  }
  if(['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(f)){
    attribute=f==='terror_psi_bomb'?'Fright Check':'Will';modifier=e.modifier+shield;
    applies=input.digitalMind!==true&&input.iqZero!==true&&target?.system?.attributes?.IQ?.value!==0;
  }else if(f==='emp'){
    const dr=integer(input.dr);if(dr<0)throw Error(t('InvalidEffectInput'));
    modifier=-8+Math.floor(dr/2);applies=input.electrical===true;
  }else if(['strobe','warbler'].includes(f)){
    modifier=Number(/HT([+-]\d+)/.exec(e.parameters.damage)?.[1]);
    if(!finite(modifier))throw Error(t('InvalidEffectInput'));
    modifier+=Math.floor(d)+(input.protectedSense?5:0);applies=input.exposed===true;
    if(f==='warbler'&&Number(input.elapsedSeconds??0)>=10)applies=false;
  }else if(f==='flare'){
    modifier=(input.darkness?-3:0)+(input.protectedSense?5:0);applies=input.exposed===true&&d<=(e.radius??0)*.01;
  }else return null;
  return {attribute,modifier:modifier+bonus,applies:applies&&(e.radius==null||f==='flare'||d<=e.radius)};
}
export function grenadeAfflictionOutcome(profile,native,input={}){
  const e=profile.payloadEffect,margin=Math.max(0,-native.margin),criticalSuccess=native.isCritSuccess,criticalFailure=!criticalSuccess&&(native.isCritFailure||native.finaltarget<=0&&native.margin<=-10),success=criticalSuccess||!criticalFailure&&!native.failure;
  if(e.chemical){const effect={...copy(e.resistanceEffect),chemical:copy(e.chemical)};return {...resistanceOutcome(effect,native,input),chemical:copy(e.chemical),checkId:input.checkId};}
  const result={success,criticalSuccess,criticalFailure,margin,consequence:success?t('ResistanceSucceeded'):e.rules.join(' ')};
  if(success)return result;
  if(e.family==='psi_bomb')Object.assign(result,{stunned:true,recoveryModifier:-5,unconsciousMinutes:margin>=5?margin:0,memoryLostSeconds:2});
  if(e.family==='message_psi_bomb')Object.assign(result,{stunned:true,recoveryModifier:-5,unconsciousMinutes:0,echoMinutes:margin>=5?margin:0,message:e.message,memoryLostSeconds:2});
  if(e.family==='strobe')Object.assign(result,{stunned:true,blindnessSeconds:margin,seizureMinutes:margin>=5||input.epilepsy?margin:0});
  if(e.family==='warbler')Object.assign(result,{deafnessMinutes:margin,painMinutes:margin,cripplingHearing:margin>=5});
  if(e.family==='flare')result.blindnessSeconds=margin;
  if(e.family==='emp')Object.assign(result,{disabledSeconds:margin,robot:'unconsciousness',fullCyborg:'seizure'});
  return result;
}
export function grenadeEffectInput(profile,input,runtime=globalThis){
  const e=profile.payloadEffect;if(!e||e.version!==1)throw Error(t('InvalidEffectInput'));
  const distance=Number(input.distance);if(input.distance===''||!finite(distance)||distance<0)throw Error(t('InvalidEffectInput'));
  const target=input.targetActorId?runtime.game.actors.get(input.targetActorId):null;
  if(input.targetActorId&&!target?.isOwner)throw Error(t('EffectNoTarget'));
  if(e.knockback&&!target?.isOwner)throw Error(t('EffectNoTarget'));
  const plan=grenadeResistancePlan(profile,{...input,distance},target);
  if(plan?.applies&&plan.attribute!=='Fright Check')resistanceAttribute(target,plan.attribute);
  if(plan?.applies&&plan.attribute==='Fright Check'&&(input.fearValue==null||input.fearValue===''||!Number.isSafeInteger(Number(input.fearValue))))throw Error(t('EffectNoTarget'));
  for(const c of e.components)grenadeComponentDivisor(c,distance,input.atmosphere);
  if(['procedure','swarm'].includes(e.kind)||e.kind==='chemical'&&!e.chemical.checks.length){
    if(input.confirmed!==true||!String(input.note??'').trim()||String(input.note).length>4000)throw Error(t('EffectProcedureRequired'));
  }
  if(e.family==='vortex'&&(!['normal','very-thin','trace','vacuum'].includes(input.atmosphere)||input.objectExtent==null||input.objectExtent===''||!finite(Number(input.objectExtent))||Number(input.objectExtent)<0))throw Error(t('InvalidEffectInput'));
  if(e.family==='tangler'&&(integer(input.layers,1)<1||integer(input.strandDamage)<0))throw Error(t('InvalidEffectInput'));
  return {input:{...copy(input),distance},target,plan};
}
async function resistanceRoll(target,plan,input,runtime){
  const base=resistanceAttribute(target,plan.attribute),finaltarget=Math.trunc(base+plan.modifier),roll=await runtime.Roll.create('3d6').evaluate(),total=Number(roll.total);
  const native={rtotal:total,finaltarget,margin:finaltarget-total,failure:total>=17||total>finaltarget,...getCriticalState(total,finaltarget)};
  const data={...native,prefix:'',chatthing:plan.attribute,thing:t('EffectRoll'),origtarget:base,fromUser:runtime.game.user.id,targetmods:[{modint:plan.modifier,mod:plan.modifier,desc:t('EffectModifier')}],modifier:plan.modifier,multiples:[{rtotal:total,rolls:(roll.dice?.[0]?.results??[]).map(r=>r.result).join()}],showPlus:true,isDraggable:false};
  const content=await runtime.renderTemplate('systems/gurps/templates/die-roll-chat-message.hbs',data);
  return {native,roll,base,content,target:{id:target.id,name:target.name,attribute:plan.attribute,base,modifier:plan.modifier}};
}
export async function calculateGrenadeEffect(profile,input,runtime=globalThis){
  const validated=grenadeEffectInput(profile,input,runtime),{target,plan}=validated,e=profile.payloadEffect,d=validated.input.distance;
  const result={version:1,family:e.family,source:profile.source,distance:d,components:[],procedure:copy(e),note:String(input.note??''),applies:true,...(target?{target:{id:target.id,name:target.name}}:{})},rolls=[];
  const components=copy(e.components);
  if(e.family==='flare'&&input.contact===true)components.push({key:'contact',formula:'1d',type:'burn',divisor:1,modifiers:'',falloff:'direct',nativeSafe:true});
  if(components.length){
    const {parseFragmentDamage}=await import('./explosion-fragmentation.js');
    for(const component of components){
      const parsed=parseFragmentDamage(component.formula);if(!parsed)throw Error(t('InvalidFormula'));
      const roll=await runtime.Roll.create(parsed.formula).evaluate();rolls.push(roll);
      const divisor=grenadeComponentDivisor(component,d,input.atmosphere),value=Math.max(0,Math.floor(Number(roll.total)/divisor));
      const row={...component,total:Number(roll.total),distanceDivisor:divisor,value,...(component.radiation?{rads:value}:{})};
      if(e.knockback&&component.type==='cr'&&target){const st=Number(target.system.attributes?.ST?.value),hp=Number(target.system.HP?.max),resistance=Math.max((st||hp)-2,1);if(finite(resistance)){row.knockback={yards:Math.floor(value/resistance)*2,direction:e.knockback,resistance,manualMovement:true,source:'B104/378; UT158'};}}
      result.components.push(row);
    }
  }
  if(plan){
    if(!plan.applies)result.resistance={applies:false,reason:t('EffectNotApplicable')};
    else if(plan.attribute==='Fright Check'){
      const {frightCheckTarget,frightCheckEntry}=await import('./fright.js');
      const target=frightCheckTarget(Number(input.fearValue),plan.modifier,input.rule15===true),roll=await runtime.Roll.create('3d6').evaluate();rolls.push(roll);
      const total=Number(roll.total),success=total<=target,margin=Math.max(1,total-target);result.resistance={attribute:plan.attribute,target,total,success,modifier:plan.modifier,source:'UT159; B360–361'};
      if(!success){const tableRoll=await runtime.Roll.create('3d6+'+margin).evaluate();rolls.push(tableRoll);result.resistance.tableTotal=Number(tableRoll.total);result.resistance.tableEntry=copy(frightCheckEntry(Number(tableRoll.total)));}
    }else{
      const check=await resistanceRoll(target,plan,input,runtime);rolls.push(check.roll);result.nativeContent=check.content;
      result.resistance={applies:true,...check.target,...check.native,...grenadeAfflictionOutcome(profile,check.native,input)};
    }
  }
  if(e.family==='tangler'){const base=Number(/ST\s+(\d+)/.exec(e.parameters.damage)?.[1]),layers=integer(input.layers,1),damage=integer(input.strandDamage),bonus=Number(/\+(\d+)/.exec(e.parameters.layer_bonus)?.[1]),strength=Math.max(0,base+(layers-1)*bonus-damage);result.tangler={base,layers,bonus,damage,strength,dr:Math.floor(strength/3),freed:strength===0,escape:'ST or Escape Quick Contest; 1 second; failure costs 1 FP',manual:true};}
  if(e.family==='vortex')result.applies=input.atmosphere!=='vacuum'&&input.gravity===true&&Number(input.objectExtent)<=e.radius;
  if(e.family==='stasis')result.applies=input.protected!==true;
  return {result,rolls};
}
export function grenadeEffectResultHTML(record){
  const r=record.result;if(!r)return `<p>${esc(record.recovery?.note??t('EffectRecover'))}</p>`;
  return `<div class="og-grenade-effect-result"><strong>${esc(t('EffectResult'))}: ${esc(utWarheadName(r.family)??r.family)}</strong>${r.target?'<p>'+esc(t('EffectTarget'))+': '+esc(r.target.name)+'</p>':''}
    ${r.components.map((c,index)=>`<p>${esc(c.formula)} ${esc(c.type+' '+(c.modifiers??''))}: ${c.total} / ${c.distanceDivisor} = <strong>${c.value}</strong>${c.radiation?' · '+esc(t('EffectRadiation'))+': '+c.rads:''}${c.knockback?' · '+esc(t('Knockback'))+': '+c.knockback.yards+' '+esc(t(c.knockback.direction==='inward'?'Inward':'Outward')):''}
    ${c.nativeSafe&&c.value>0?`<button type="button" data-grenade-component="${index}">${esc(t('EffectNative'))}</button>`:''}</p>`).join('')}
    ${r.nativeContent??''}${r.resistance?`<p>${esc(r.resistance.applies===false?t('EffectNotApplicable'):r.resistance.consequence??(r.resistance.success?t('ResistanceSucceeded'):t('ResistanceFailed')))}${r.resistance.tableEntry?' '+esc(r.resistance.tableEntry[3]):''}</p>`:''}
    ${r.resistance?.attribute==='Fright Check'?'<p>3d6: '+r.resistance.total+' / '+r.resistance.target+(r.resistance.tableTotal?' · '+esc(t('FrightTable'))+': '+r.resistance.tableTotal:'')+'</p>':''}
    ${r.resistance?.stunned?'<p>'+esc(t('Stunned'))+'</p>':''}
    ${r.resistance?.unconsciousMinutes?'<p>'+esc(t('UnconsciousMinutes'))+': '+r.resistance.unconsciousMinutes+'</p>':''}
    ${r.resistance?.echoMinutes?'<p>'+esc(t('EchoMinutes'))+': '+r.resistance.echoMinutes+'</p>':''}
    ${['blindnessSeconds','seizureMinutes','deafnessMinutes','painMinutes','disabledSeconds','memoryLostSeconds'].filter(k=>r.resistance?.[k]>0).map(k=>'<p>'+esc(t(k))+': '+r.resistance[k]+'</p>').join('')}
    ${r.tangler?`<p>ST ${r.tangler.strength}; DR ${r.tangler.dr}. ${esc(t('Rule_tangler'))}</p>`:''}
    ${r.applies===false?'<p>'+esc(t('EffectNotApplicable'))+'</p>':''}
    <p>${esc(r.note)}</p><details class="olegurps-chat-details"><summary>${esc(t('Properties'))}</summary>${r.procedure.rules.map(rule=>'<p>'+esc(rule)+'</p>').join('')}<p>${esc(r.source)}</p></details></div>`;
}
export async function applyGrenadeNativeDamage(record,index,runtime=globalThis){
  const actor=runtime.game.actors.get(record?.sourceActorId),component=record?.state==='done'?record.result?.components?.[index]:null;
  if(!actor?.isOwner)throw Error(t('NoActor'));
  if(!component?.nativeSafe||!Number.isSafeInteger(component.value)||component.value<=0||!['cr','burn','cut','cor','tox','fat'].includes(component.type))throw Error(t('InvalidEffectInput'));
  const {createGgaDamageWithEasterEgg}=await import('./damage-result-easter-egg.js');
  return createGgaDamageWithEasterEgg({DamageChat:runtime.GURPS.DamageChat,actor,args:[actor,String(component.value)+(component.divisor!==1?'('+component.divisor+')':''),component.type,{shiftKey:false,ctrlKey:false,data:{}},null,[],component.nativeModifier||null]});
}
export class GrenadeEffectService{
  constructor(actor,{runtime=globalThis}={}){this.actor=actor;this.runtime=runtime;}
  apply(eventId,input,{receiptId=generateId(this.runtime,{preferFoundry:true})}={}){
    if(!this.actor?.isOwner)throw Error(t('NoActor'));
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(receiptId))throw Error(t('InvalidEffectInput'));
    return withActorResourceWrite(this.actor,async()=>{
      if(!this.actor.isOwner)throw Error(t('NoActor'));
      const state=readGrenades(this.actor),event=state.events.find(e=>e.id===eventId);if(!event?.detonation?.profile?.payloadEffect)throw Error(t('EffectNeedsDetonation'));
      const profile=event.detonation.profile,existing=event.effectResults?.find(r=>r.id===receiptId);
      if(existing){if(existing.state==='done')return copy(existing);throw Error(t('EffectRecover'));}
      if(event.effectResults?.some(r=>r.state==='resolving'&&r.userId===this.runtime.game.user.id))throw Error(t('EffectRecover'));
      grenadeEffectInput(profile,input,this.runtime);
      const record={id:receiptId,userId:this.runtime.game.user.id,state:'resolving',input:copy(input),profile:copy(profile),sourceEventId:event.id,sourceActorId:this.actor.id};
      (event.effectResults??=[]).push(record);await this.actor.setFlag(scope,GRENADE_FLAG,state);
      const {result,rolls}=await calculateGrenadeEffect(profile,input,this.runtime);record.result=result;
      const message=await this.runtime.ChatMessage.create({speaker:{actor:this.actor.id,alias:this.actor.name},content:grenadeEffectResultHTML(record),rolls,
        flags:{[scope]:{grenadeEffectResult:{...copy(record),state:'done'}}}});
      if(!this.actor.isOwner)throw Error(t('NoActor'));
      record.messageId=message.id;record.state='done';
      const current=readGrenades(this.actor),currentEvent=current.events.find(e=>e.id===eventId),currentRecord=currentEvent?.effectResults?.find(r=>r.id===receiptId);
      if(!currentRecord||currentRecord.state!=='resolving')throw Error(t('EffectRecover'));
      Object.assign(currentRecord,record);await this.actor.setFlag(scope,GRENADE_FLAG,current);return copy(record);
    });
  }
  confirmRecovery(eventId,receiptId,note){
    if(!this.runtime.game.user.isGM||!this.actor?.isOwner||!String(note??'').trim())throw Error(t('EffectRecover'));
    return withActorResourceWrite(this.actor,async()=>{const state=readGrenades(this.actor),event=state.events.find(e=>e.id===eventId),record=event?.effectResults?.find(r=>r.id===receiptId);
      if(record?.state!=='resolving')throw Error(t('EffectRecover'));record.state='reviewed';record.recovery={userId:this.runtime.game.user.id,note:String(note)};await this.actor.setFlag(scope,GRENADE_FLAG,state);return copy(record);});
  }
  endArea(eventId,note){
    if(!this.actor?.isOwner||!String(note??'').trim())throw Error(t('EffectProcedureRequired'));
    return withActorResourceWrite(this.actor,async()=>{const state=readGrenades(this.actor),event=state.events.find(e=>e.id===eventId);if(!event?.detonation?.profile?.payloadEffect)throw Error(t('EffectNeedsDetonation'));
      event.effectAreaEnded??={userId:this.runtime.game.user.id,note:String(note),at:state.clock.elapsed};await this.actor.setFlag(scope,GRENADE_FLAG,state);return copy(event.effectAreaEnded);});
  }
}
