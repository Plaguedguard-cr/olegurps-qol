import {rollResistance,selectedResistanceToken} from './resistance-roll.js';
import {grenadeResistancePlan,grenadeAfflictionOutcome,GrenadeEffectService} from './grenade-effects.js';
import {grenadeDisplayName,utChemicalName,utWarheadName} from './ut-nomenclature.js';
import {grenText as t,escapeGrenade as esc} from './grenade-localization.js';
import {applyMessageMode} from './chat-message-mode.js';
import {withActorResourceWrite} from './actor-resource-writes.js';

const scope='olegurps-qol';
const afflictions=['emp','strobe','warbler','flare','psi_bomb','message_psi_bomb','terror_psi_bomb'];
export const grenadeHasCheck=p=>!!(p?.payloadEffect?.chemical?.checks?.length||afflictions.includes(p?.payloadEffect?.family));
export function grenadeChatContext(message){
  if(message?.visible===false||message?.isContentVisible===false)return null;
  const c=message?.flags?.[scope]?.grenadeEffectCard;
  return c?.version===1&&typeof c.eventId==='string'&&typeof c.sourceActorId==='string'&&c.profile?.payloadEffect?.version===1?structuredClone(c):null;
}
export function grenadeCheckActor(runtime=globalThis,{theatre=false}={}){
  if(!theatre&&(runtime.canvas?.tokens?.controlled?.length??0)>0)return selectedResistanceToken(runtime);
  // GGA sheet selection (LastActor) also works without a Scene or a Token.
  const last=runtime.GURPS?.LastActor,actor=last?.isOwner&&runtime.game.actors.get(last.id)===last?last:runtime.game.user.character;
  if(!actor||runtime.game.actors.get(actor.id)!==actor||!actor.isOwner)throw Error(t('ChooseResistanceActor'));
  return {actor,isOwner:true};
}
export function grenadeTraits(actor){
  const result=[],seen=new Set();
  const visit=tree=>{if(!tree||typeof tree!=='object'||seen.has(tree))return;seen.add(tree);
    for(const a of Object.values(tree)){if(!a||typeof a!=='object'||a.disabled===true||a.inactive===true||a.active===false||a.enabled===false||a.suppressed===true)continue;
      result.push({name:String(a.name??'').normalize('NFKC').trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLowerCase(),level:a.level,specialization:String(a.specialization??a.specialty??'').trim().toLowerCase()});visit(a.contains);visit(a.collapsed);}};
  visit(actor?.system?.ads);return result;
}
export function grenadeProtection(profile,actor,input={}){
  const e=profile.payloadEffect,c=e.chemical,traits=grenadeTraits(actor),has=name=>traits.some(a=>a.name===name.toLowerCase()||a.name+' ('+a.specialization+')'===name.toLowerCase()||a.name.replace(/^immunity \((poison|metabolic hazards|nanomachines)\)$/,'immunity to $1')===name.toLowerCase());
  const sensory=['strobe','warbler','flare'].includes(e.family),psychic=['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(e.family);
  const level=name=>{const values=traits.filter(a=>a.name===name.toLowerCase()).map(a=>Number(a.level));return values.length&&values.every(v=>v===values[0]&&Number.isSafeInteger(v)&&v>=0)?values[0]:0;};
  const defaults={distance:0,modifier:0,exposed:true,protected:false,immune:false,checkId:c?.checks?.[0]?.id,
    protectedSense:sensory&&(e.family==='warbler'?has('Protected Hearing')||has('Protected Sense (Hearing)'):has('Protected Vision')||has('Protected Sense (Vision)')),
    mindShield:psychic?level('Mind Shield'):0,digitalMind:psychic&&has('Digital Mind'),iqZero:actor?.system?.attributes?.IQ?.value===0,
    epilepsy:has('Epilepsy'),electrical:has('Electrical'),dr:0,elapsedSeconds:0,darkness:false};
  const choices={...defaults,...input},lines=[];
  let bonus=0,immunity=null;
  if(c){
    const route=choices.checkId==='eyes'?'vision':choices.checkId==='contact'?'contact':['breathing','vomit','respiratory'].includes(choices.checkId)?'respiratory':c.route;
    if(route==='respiratory'&&has("Doesn't Breathe"))immunity="Doesn't Breathe";
    if(route==='respiratory'&&['riot','tear','tear_vomit','pheromone'].includes(c.id)&&has('Filter Lungs'))immunity='Filter Lungs';
    if(route==='contact'&&has('Sealed'))immunity='Sealed';
    // Chemicals/drugs only; diseases, radiation, smoke and unrelated traits grant no bonus.
    const poison=['riot','nerve','sleep','paralysis','pheromone','tear','tear_vomit','mustard','nerve_poison','sleep_poison','nerve_contact','sleep_contact'].includes(c.id);
    const metabolic=poison||c.immunities?.includes('Immunity to Metabolic Hazards');
    if(metabolic&&has('Immunity to Metabolic Hazards'))immunity='Immunity to Metabolic Hazards';
    if(poison&&has('Immunity to Poison'))immunity='Immunity to Poison';
    if(c.immunities?.includes('Immunity to Metabolic Hazards')&&has('Immunity to Nanomachines'))immunity='Immunity to Nanomachines';
    for(const a of traits){const name=a.name==='resistant'&&a.specialization?a.name+' ('+a.specialization+')':a.name,m=/^resistant(?: to)? (?:\(\s*)?(poison|metabolic hazards|nanomachines)(?:\s*\))?(?:\s*\(\s*\+(3|8)\s*\))?$/.exec(name);
      if(m&&(m[1]==='poison'&&poison||m[1]==='metabolic hazards'&&metabolic||m[1]==='nanomachines'&&c.immunities?.includes('Immunity to Metabolic Hazards'))){const v=Number(m[2]??a.level);if(v===3||v===8)bonus=Math.max(bonus,v);}}
    if(bonus)lines.push(t('ApplicableResistance')+': +'+bonus+' (B80–81)');
    if(choices.protected||choices.immune||!choices.exposed)immunity=t('ManualProtection');
  }
  const plan=grenadeResistancePlan(profile,{...choices,modifier:Number(choices.modifier)+bonus},actor);
  if(!plan)throw Error(t('InvalidEffectInput'));
  if(immunity)lines.push(immunity);
  if(psychic&&choices.mindShield)lines.push('Mind Shield: +'+choices.mindShield);
  if(sensory&&choices.protectedSense)lines.push((e.family==='warbler'?'Protected Hearing':'Protected Vision')+': +5');
  return {choices,plan:{...plan,applies:plan.applies&&!immunity,immunity:immunity??t('EffectNotApplicable'),lines:[...lines,...(plan.conditions?.lines??[])]}};
}
async function askGrenadeConditions(effect,runtime,actor,context){
  const e=context.profile.payloadEffect,c=e.chemical,defaults=grenadeProtection(context.profile,actor).choices;
  const field=(name,label,value=0)=>`<label>${esc(label)}<input type="number" step="${name==='distance'?'0.1':'1'}" name="${name}" value="${esc(value)}"></label>`;
  const check=(name,label,value=false)=>`<label class="og-grenade-check"><span>${esc(label)}</span><input type="checkbox" name="${name}" ${value?'checked':''}></label>`;
  let extra=c?.checks.length>1?`<label>${esc(t('EffectCheck'))}<select name="checkId">${c.checks.map(v=>`<option value="${esc(v.id)}">${esc(v.label)} (HT${v.modifier})</option>`).join('')}</select></label>`:'';
  if(c)extra+=check('protected',t('EffectProtected'))+check('immune',t('EffectImmune'));
  if(['strobe','warbler','flare'].includes(e.family))extra+=check('protectedSense',t('EffectProtectedSense'),defaults.protectedSense);
  if(e.family==='strobe')extra+=check('epilepsy',t('Epilepsy'),defaults.epilepsy);
  if(e.family==='warbler')extra+=field('elapsedSeconds',t('ElapsedSeconds'));
  if(e.family==='flare')extra+=check('darkness',t('EffectDarkness'));
  if(e.family==='emp')extra+=check('electrical',t('EffectElectrical'),defaults.electrical)+field('dr',t('EffectDR'));
  if(['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(e.family))extra+=field('mindShield','Mind Shield',defaults.mindShield)+check('digitalMind',t('EffectDigitalMind'),defaults.digitalMind);
  if(e.family==='terror_psi_bomb')extra+=check('rule15',t('EffectRule15'));
  return runtime.foundry.applications.api.DialogV2.wait({window:{title:t('EffectConditions')},position:{width:440},modal:false,rejectClose:false,
    content:`<p><strong>${esc(actor.name)}</strong></p>`+field('modifier',t('EffectModifier'))+field('distance',t('Distance'))+extra+`<p>${esc(t('ActorProtectionRead'))}</p>`,
    buttons:[{action:'roll',label:t('Roll'),default:true,callback:(_event,button)=>{const values=Object.fromEntries([...button.form.elements].filter(f=>f.name).map(f=>[f.name,f.type==='checkbox'?f.checked:f.type==='number'?Number(f.value):f.value]));return {...defaults,...values};}},{action:'cancel',label:t('CancelAction'),callback:()=>false}]});
}
export async function sendGrenadeEffect(event,runtime=globalThis){
  const actor=runtime.game.actors.get(event.actorId);
  if(!actor?.isOwner)throw Error(t('NoActor'));
  const saved=actor.getFlag(scope,'handGrenades')?.events?.find(e=>e.id===event.id);
  if(!saved?.detonation?.profile?.payloadEffect)throw Error(t('EffectNeedsDetonation'));
  const context={version:1,sourceActorId:actor.id,eventId:saved.id,theatre:!!saved.theatre,profile:structuredClone(saved.detonation.profile)};
  const p=context.profile,e=p.payloadEffect,chemical=e.chemical,name=chemical?(utChemicalName(chemical.id)??chemical.name):(utWarheadName(e.family)??grenadeDisplayName(p));
  const checks=chemical?.checks??(grenadeHasCheck(p)?[{label:e.attribute??'HT',modifier:e.modifier??(e.family==='emp'?-8:Number(/HT([+-]\d+)/.exec(e.parameters.damage)?.[1])||0)}]:[]);
  const content=`<article class="og-grenade-effect-card"><strong>${esc(grenadeDisplayName(p))}</strong>${checks.map(c=>`<p>${esc(name)} – ${esc(t('Check'))} ${esc(e.attribute??'HT')}${c.modifier<0?'-'+Math.abs(c.modifier):c.modifier>0?'+'+c.modifier:''}${checks.length>1?' · '+esc(c.label):''}</p>`).join('')}<p>${esc(chemical?.brief??e.rules?.[0]??'')}</p></article>`;
  return runtime.ChatMessage.create(applyMessageMode(runtime.ChatMessage,{speaker:{actor:actor.id,alias:actor.name},content,flags:{[scope]:{grenadeEffectCard:context}}},runtime.game));
}
export async function rollGrenadeEffect(message,runtime=globalThis){
  const c=grenadeChatContext(message);if(!c||!grenadeHasCheck(c.profile))return null;
  const p=c.profile,e=p.payloadEffect,attribute=e.attribute??'HT';
  const effect={version:1,id:'grenade-'+c.eventId,name:e.chemical?(utChemicalName(e.chemical.id)??e.chemical.name):grenadeDisplayName(p),attribute,modifier:e.chemical?.checks[0]?.modifier??e.modifier??(e.family==='emp'?-8:Number(/HT([+-]\d+)/.exec(e.parameters.damage)?.[1])||0),source:[p.source,e.chemical?.source].filter(Boolean).join('; ')};
  const result=await rollResistance(message,runtime,{
    effect,selectActor:()=>grenadeCheckActor(runtime,c),conditions:(_effect,rt,actor)=>(rt.__olegurpsGrenadeConditions??askGrenadeConditions)(_effect,rt,actor,c),
    plan:(choices,actor)=>grenadeProtection(p,actor,choices).plan,
    ...(attribute==='Fright Check'?{base:actor=>{const n=Number(actor.system.frightcheck);if(!Number.isSafeInteger(n)||n<1)throw Error(t('EffectNoTarget'));return n;},maxTarget:choices=>choices.rule15?14:13}:{}),
    outcome:(native,choices)=>{
      let outcome=grenadeAfflictionOutcome(p,native,choices);
      if(!e.chemical&&!outcome.success&&attribute!=='Fright Check'){
        const lines=Object.entries(outcome).filter(([key,value])=>/Seconds$|Minutes$/.test(key)&&Number(value)>0).map(([key,value])=>t(({unconsciousMinutes:'UnconsciousMinutes',echoMinutes:'EchoMinutes'})[key]??key)+': '+value);
        if(outcome.stunned)lines.unshift(t('Stunned'));
        if(outcome.cripplingHearing)lines.push(t('CripplingHearing'));
        outcome.consequence=lines.join(' · ')||t('AutomaticFailureManual');
      }
      if(attribute==='Fright Check')outcome={...outcome,success:native.rtotal<=native.finaltarget,criticalSuccess:false,criticalFailure:false,consequence:native.rtotal<=native.finaltarget?t('ResistanceSucceeded'):t('FrightTableManual')};
      return {...outcome,label:outcome.criticalSuccess?t('CriticalSuccess'):outcome.criticalFailure?t('CriticalFailure'):outcome.success?t('Success'):t('Failure'),marginText:(outcome.success?t('SuccessMargin'):t('FailureMargin'))+': '+Math.abs(native.margin)};
    },
    flags:({actor,choices,result,native,immune,conditions})=>({grenadeCheck:{version:1,eventId:c.eventId,sourceActorId:c.sourceActorId,sourceMessageId:message.id,profile:structuredClone(p),actorId:actor.id,actorName:actor.name,checkId:choices.checkId??null,
      ...(immune?{immune:true,consequence:conditions.immunity}:{success:result.success,criticalSuccess:result.criticalSuccess,criticalFailure:result.criticalFailure,margin:native.margin,consequence:result.consequence,duration:grenadeCheckDuration(p,result,native)}),conditions:structuredClone(choices),protection:{modifier:conditions.modifier,lines:structuredClone(conditions.lines)}}})
  });
  if(attribute==='Fright Check'&&result&&!result.immune&&!result.success){
    const {frightCheckEntry}=await import('./fright.js'),margin=Math.max(1,-result.margin),roll=await runtime.Roll.create('3d6+'+margin).evaluate();
    const entry=frightCheckEntry(Number(roll.total)),consequence=entry[3];
    const table=await runtime.ChatMessage.create(applyMessageMode(runtime.ChatMessage,{speaker:result.message.speaker,rolls:[roll],content:`<p>${esc(t('FrightTable'))}: ${roll.total}. ${esc(consequence)}</p>`,flags:{[scope]:{grenadeFrightTable:{version:1,checkMessageId:result.message.id,eventId:c.eventId,total:Number(roll.total),entry:structuredClone(entry)}}}},runtime.game));
    await result.message.update({['flags.'+scope+'.grenadeCheck.consequence']:consequence,['flags.'+scope+'.grenadeCheck.frightTableMessageId']:table.id});
  }
  return result;
}
export function grenadeCheckDuration(profile,result,native){
  const duration=Object.fromEntries(Object.entries(result).filter(([key])=>/Seconds$|Minutes$/.test(key)));
  if(result.success)return duration;
  const c=profile.payloadEffect.chemical,mof=native.margin<0?-native.margin:null;if(!c)return duration;
  if(c.duration?.whileExposed)duration.whileExposed=true;
  if(mof!==null){
    if(c.duration?.afterExposureMinutesPerMoF&&(c.duration.afterExposureThreshold==null||mof>=c.duration.afterExposureThreshold))duration.afterExposureMinutes=mof*c.duration.afterExposureMinutesPerMoF;
    if(c.duration?.unconsciousMinutesPerMoF&&(c.duration.unconsciousFailureThreshold==null||mof>=c.duration.unconsciousFailureThreshold))duration.unconsciousMinutes=mof*c.duration.unconsciousMinutesPerMoF;
    if(c.duration?.paralysisMinutesPerMoF&&!result.criticalFailure&&mof>=(c.duration.paralysisFailureThreshold??0))duration.paralysisMinutes=mof*c.duration.paralysisMinutesPerMoF;
  }
  return duration;
}
export async function resolveGrenadeComponents(message,runtime=globalThis){
  const c=grenadeChatContext(message);if(!c)return null;
  const actor=runtime.game.actors.get(c.sourceActorId);if(!actor?.isOwner)throw Error(t('NoActor'));
  const e=c.profile.payloadEffect;
  const field=(key,label,value=0)=>`<label>${esc(t(label))}<input name="${key}" type="number" min="0" step="${key==='distance'?'0.1':'1'}" value="${value}"></label>`;
  const check=(key,label)=>`<label class="og-grenade-check"><span>${esc(t(label))}</span><input name="${key}" type="checkbox"></label>`;
  const needsTarget=!!e.knockback;
  const input=await runtime.foundry.applications.api.DialogV2.wait({window:{title:t('EffectConditions')},position:{width:440},modal:false,rejectClose:false,
    content:field('distance','Distance')+(needsTarget?`<p>${esc(t('ChooseResistanceActor'))}</p>`:'')+
      (['thermobaric','vortex'].includes(e.family)?`<label>${esc(t('EffectAtmosphere'))}<select name="atmosphere">${['normal','very-thin','trace','vacuum'].map((v,i)=>`<option value="${v}">${esc(t(['EffectNormal','EffectVeryThin','EffectTrace','EffectVacuum'][i]))}</option>`).join('')}</select></label>`:'')+
      (e.family==='vortex'?check('gravity','EffectGravity')+field('objectExtent','ObjectExtent'):'')+
      (e.family==='stasis'?check('protected','EffectProtected'):'')+(e.family==='tangler'?field('layers','TanglerLayers',1)+field('strandDamage','StrandDamage'):'')+
      (grenadeHasCheck(c.profile)?check('contact','DirectContact'):'')+
      (['procedure','swarm','chemical'].includes(e.kind)&&!grenadeHasCheck(c.profile)?check('confirmed','EffectConfirm')+`<label>${esc(t('EffectNote'))}<input name="note" type="text" maxlength="4000"></label>`:''),
    buttons:[{action:'calculate',label:t('EffectApply'),callback:(_event,button)=>Object.fromEntries([...button.form.elements].filter(f=>f.name).map(f=>[f.name,f.type==='checkbox'?f.checked:f.type==='number'?Number(f.value):f.value]))},{action:'cancel',label:t('CancelAction'),callback:()=>false}]});
  if(!input)return null;
  if(needsTarget)input.targetActorId=grenadeCheckActor(runtime,c).actor.id;
  // Combined EMP physical component is independent of its separate HT check.
  if(grenadeHasCheck(c.profile)){
    const {calculateGrenadeEffect,grenadeEffectResultHTML}=await import('./grenade-effects.js');
    const componentProfile=structuredClone(c.profile);componentProfile.payloadEffect={...componentProfile.payloadEffect,family:'components',kind:'components'};
    if(e.family==='flare'&&input.contact===true)componentProfile.payloadEffect.components.push({key:'contact',formula:'1d',type:'burn',divisor:1,modifiers:'',falloff:'direct',nativeSafe:true});
    const {result,rolls}=await calculateGrenadeEffect(componentProfile,input,runtime);
    const record={state:'done',sourceActorId:actor.id,sourceEventId:c.eventId,result};
    return runtime.ChatMessage.create(applyMessageMode(runtime.ChatMessage,{speaker:{actor:actor.id,alias:actor.name},content:grenadeEffectResultHTML(record),rolls,flags:{[scope]:{grenadeEffectResult:record}}},runtime.game));
  }
  return new GrenadeEffectService(actor,{runtime}).apply(c.eventId,input);
}
export function grenadeCheckHistory(event,runtime=globalThis){
  const hidden=new Set(runtime.game.actors.get(event?.actorId)?.getFlag?.(scope,'grenadeClearedChecks')?.[event.id]??[]),rows=[];
  for(const message of runtime.game.messages??[]){const r=message.flags?.[scope]?.grenadeCheck;if(message.visible===false||message.isContentVisible===false||r?.version!==1||r.eventId!==event?.id||r.sourceActorId!==event?.actorId||hidden.has(message.id))continue;rows.push({id:message.id,...structuredClone(r)});}
  for(const record of event?.effectResults??[]){const r=record.result?.resistance,key=event.actorId+':'+event.id+':'+record.id;if(record.state!=='done'||!r||hidden.has(key))continue;
    rows.push({id:key,actorName:record.result.target?.name??r.name??t('None'),immune:r.applies===false,success:r.success,margin:r.margin??(r.target!=null&&r.total!=null?r.target-r.total:undefined),consequence:r.consequence??(r.applies===false?t('EffectNotApplicable'):t('LegacyResultManual'))});}
  return rows;
}
export const grenadeCheckSummary=row=>[row.actorName,row.immune?t('EffectNotApplicable'):(row.criticalSuccess?t('CriticalSuccess'):row.criticalFailure?t('CriticalFailure'):row.success?t('Success'):t('Failure'))+(Number.isFinite(row.margin)?' '+t('ByMargin')+' '+Math.abs(row.margin):''),row.consequence].filter(Boolean).join(' – ');
export async function clearGrenadeCheckHistory(event,runtime=globalThis){
  const rows=grenadeCheckHistory(event,runtime);if(!rows.length)return false;
  const actor=runtime.game.actors.get(event.actorId);if(!actor?.isOwner)throw Error(t('NoActor'));
  const yes=await runtime.foundry.applications.api.DialogV2.confirm({window:{title:t('ClearCheckHistory')},content:`<p>${esc(t('ClearCheckHistoryQuestion'))}</p>`,modal:false,rejectClose:false});
  if(!yes)return false;
  await withActorResourceWrite(actor,async()=>{if(!actor.isOwner)throw Error(t('NoActor'));await actor.update({['flags.'+scope+'.grenadeClearedChecks.'+event.id]:[...new Set([...(actor.getFlag(scope,'grenadeClearedChecks')?.[event.id]??[]),...rows.map(r=>r.id)])]});});return true;
}
const installed=new WeakSet(),bound=new WeakSet();
export function installGrenadeEffectChat(runtime=globalThis){
  if(installed.has(runtime.Hooks))return;installed.add(runtime.Hooks);
  const render=(message,html)=>{const c=grenadeChatContext(message),root=html?.querySelector?html:html?.[0];if(!c||!root)return;
    const actions=[];
    if(grenadeHasCheck(c.profile))actions.push({key:'grenadeCheck',selector:'[data-grenade-check]',label:t('Roll')+' '+(c.profile.payloadEffect.attribute??'HT'),run:rollGrenadeEffect});
    if(!grenadeHasCheck(c.profile)||c.profile.payloadEffect.components.length||c.profile.payloadEffect.family==='flare')actions.push({key:'grenadeComponentCalculation',selector:'[data-grenade-component-calculation]',label:t('EffectApply'),run:resolveGrenadeComponents});
    for(const action of actions){let button=root.querySelector(action.selector);if(!button){button=runtime.document.createElement('button');button.type='button';button.dataset[action.key]='true';button.textContent=action.label;(root.querySelector('.message-content')??root).append(button);}
      if(bound.has(button))continue;bound.add(button);button.addEventListener('click',async click=>{click.preventDefault();click.stopPropagation();if(button.disabled)return;button.disabled=true;try{await action.run(message,runtime);}catch(error){runtime.ui.notifications.warn(error.message);}finally{button.disabled=false;}});}
  };
  for(const hook of ['renderChatMessageHTML','renderChatMessage'])runtime.Hooks.on(hook,render);
  for(const root of runtime.document?.querySelectorAll?.('[data-message-id]')??[]){const message=runtime.game.messages.get(root.dataset.messageId);if(message)render(message,root);}
}
