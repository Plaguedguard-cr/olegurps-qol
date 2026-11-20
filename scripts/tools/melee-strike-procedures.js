import { nativeTechniqueCheck } from './melee-technique-procedures.js';
import { learnedMeleeSkills, meleeSkillFamily } from './melee-penalty-techniques.js';
import { finiteLevel } from './combat-technique-data.js';
import { applyMessageMode } from './chat-message-mode.js';
import { immovableCollision,collisionDice } from './fall-collision-rules.js';
import { withMeleeTechniqueExecution } from './melee-technique-sequences.js';
import { rollBasicDamage } from './melee-native-damage.js';

const scope='olegurps-qol';
const outcomeKey='meleeStrikeOutcome';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=(actor,name)=>Number(actor?.system?.attributes?.[name.toUpperCase()]?.value??actor?.system?.attributes?.[name]?.value??actor?.system?.[name]?.value);
const own=actor=>!!actor&&(actor.isOwner||globalThis.game?.user?.isGM);
const canEdit=message=>message?.isAuthor||globalThis.game?.user?.isGM;
const bestSkill=(actor,name)=>learnedMeleeSkills(actor).filter(row=>meleeSkillFamily(row)===name).map(finiteLevel).sort((a,b)=>b-a)[0]??null;
const getPlan=snapshot=>snapshot.combatCalculation?.metadata?.meleeTechniques??snapshot.damageOptions?.techniquePlan;
const knownMeleeSkills=new Set(['axe/mace','boxing','brawling','broadsword','cloak','flail','force sword','force whip','garrote','jitte/sai','judo','karate','knife','kusari','lance','main-gauche','monowire whip','net','polearm','rapier','saber','shield','shortsword','smallsword','spear','staff','sumo wrestling','tonfa','two-handed axe/mace','two-handed flail','two-handed sword','whip','wrestling']);

function targetActor(reference){
 const scene=reference.sceneId&&globalThis.game?.scenes?.get(reference.sceneId);
 if(reference.tokenId){
  const token=scene?.tokens?.get(reference.tokenId)??globalThis.canvas?.scene?.tokens?.get(reference.tokenId);
  return token?.actor?.id===reference.actorId?token.actor:null;
 }
 return reference.actorId?globalThis.game?.actors?.get(reference.actorId)??null:null;
}

function textMessage(actor,heading,details,rolls=[]){
 return globalThis.ChatMessage.create(applyMessageMode(globalThis.ChatMessage,{
  speaker:globalThis.ChatMessage.getSpeaker({actor}),rolls,
  content:'<p><strong>'+escape(heading)+'</strong></p><p>'+escape(details)+'</p>'
 },globalThis.game));
}

async function check(actor,attribute,modifier,title){
 const level=attr(actor,attribute);
 if(!Number.isFinite(level))throw Error('Нет подтверждённого '+attribute+' для броска.');
 return nativeTechniqueCheck({actor,name:title,level:level+modifier});
}

async function posture(actor,value){
 // GGA 0.18.23 has Lying Down but no separate face-up/face-down posture.
 const id=value==='kneeling'?'kneel':value==='prone'||value==='supine'?'prone':null;
 if(id&&own(actor)&&globalThis.CONFIG?.statusEffects?.some(effect=>effect.id===id)){
  await actor.toggleStatusEffect(id,{active:true});
 }
}

async function timedStatus(actor,id,seconds){
 if(!own(actor)||!(seconds>0)||actor.statuses?.has(id)||!globalThis.CONFIG?.statusEffects?.some(effect=>effect.id===id))return;
 await actor.toggleStatusEffect(id,{active:true});
 const effect=actor.effects.find(entry=>entry.statuses?.has(id)&&!entry.disabled);
 if(effect)await effect.update({'duration.seconds':seconds,'duration.startTime':game.time.worldTime});
}

function receipt(roll){
 return {messageId:roll.message.id,total:roll.total,margin:roll.margin,level:roll.finaltarget,
  success:roll.success,criticalFailure:roll.criticalFailure,criticalSuccess:roll.criticalSuccess};
}

function modifierText(value){return value>0?'+'+value:String(value);}

export async function prepareStrikeAttack(snapshot){
 const plan=getPlan(snapshot);
 const strike=plan?.strikes?.find(s=>s.procedure==='flying'||s.procedure==='spin');
 if(!strike)return {allowed:true};
 // A cancelled native Attack can reuse its already completed prerequisite in this open slot.
 if(snapshot.strikePrerequisite)return {allowed:true,receipt:snapshot.strikePrerequisite};
 const actor=snapshot.actor;
 if(strike.procedure==='flying'){
  const dx=attr(actor,'DX'),jumping=bestSkill(actor,'jumping');
  if(!Number.isFinite(dx))throw Error('Для прыжка нужен DX.');
  const roll=await nativeTechniqueCheck({actor,name:jumping>dx?'Jumping – '+strike.name:'DX – '+strike.name,level:Math.max(dx,jumping??0),details:'Прыжок с разбега (B352, MA83).'});
  if(!roll.rolled)return {allowed:false,cancelled:true};
  if(!roll.success){
   await recordStrikeOutcome(roll.message,actor,plan,null,'failedLeap');
   return {allowed:false,completed:true,message:roll.message};
  }
  return {allowed:true,receipt:{kind:'broadJump',roll:receipt(roll)}};
 }
 const target=targetActor(strike.target);
 const targetLevel=strike.opponentLevel??learnedMeleeSkills(target).filter(row=>knownMeleeSkills.has(meleeSkillFamily(row))).map(finiteLevel).sort((a,b)=>b-a)[0];
 if(!Number.isFinite(targetLevel)||targetLevel<=0)throw Error('Укажите лучший подтверждённый боевой навык цели для Contest.');
 const actual=Number(plan.selection.context.strikeOpponentMargin);
 if(!own(target)&&(plan.selection.context.strikeOpponentMargin==null||!Number.isFinite(actual)))throw Error('Нужен результат броска владельца цели для Quick Contest.');
 const attackerRoll=await nativeTechniqueCheck({actor,name:strike.name+' – Quick Contest',level:strike.skillLevel+Number(snapshot.deceptiveAttack??0),details:'Подготовительный Quick Contest против лучшего боевого навыка цели (MA79).'});
 if(!attackerRoll.rolled)return {allowed:false,cancelled:true};
 const defenderRoll=own(target)?await nativeTechniqueCheck({actor:target,name:'Защита от обмана – '+strike.name,level:targetLevel}):null;
 if(defenderRoll&&!defenderRoll.rolled)return {allowed:false,cancelled:true};
 const margin=defenderRoll?.margin??actual;
 return {allowed:true,receipt:{kind:'spinningContest',attacker:receipt(attackerRoll),defender:defenderRoll?receipt(defenderRoll):{level:targetLevel,margin,reported:true},modifier:margin-attackerRoll.margin}};
}

function outcomeControls(plan,status){
 const strikes=plan.strikes??[];
 const has=procedure=>strikes.some(s=>s.procedure===procedure);
 if(status==='awaitingDefense'){
  const options=[['hit','Атака прошла защиту'],['defended','Цель защитилась']];
  if(strikes.some(s=>s.bodyInjury?.when?.includes('shield')))options.push(['shield','Цель блокировала щитом']);
  if(has('axe'))options.push(['retreat','Цель защитилась только за счёт Retreat']);
  if(has('return')&&plan.selection.context.closeCombat)options.push(['dodged','Цель уклонилась']);
  return options.map(([id,label])=>button(id,label)).join('');
 }
 if(['miss','defended','failedLeap','shield','dodged'].includes(status)&&strikes.some(s=>s.recovery?.when.includes(status)))return button('recover','Проверить равновесие');
 if(['miss','dodged'].includes(status)&&strikes.some(s=>s.wrap))return button('wrap','Проверить попадание в себя (B392)');
 if(strikes.some(s=>s.bodyInjury?.when?.includes(status)))return button('selfDamage','Бросить Damage по атакующему');
 return '';
}

function button(id,label){return '<button type="button" data-melee-strike-step="'+id+'">'+label+'</button>';}

function needsDefense(plan){
 return plan.strikes.some(s=>s.recovery?.when.includes('defended')||!!s.bodyInjury||
  ['axe','ear','eyePoke','eyePluck','eyeRake','lethalEye','return','slam','push'].includes(s.procedure));
}

function attackOutcome(result,plan){
 if(result.hit===false&&!result.criticalFailure&&result.strikeMargin===-1&&
   plan.strikes.some(s=>s.procedure==='eyePoke'||s.procedure==='eyePluck'&&s.relativeSM>=5))return 'awaitingDefense';
 if(result.hit===false)return 'miss';
 return result.criticalSuccess===true||!needsDefense(plan)?'hit':'awaitingDefense';
}

export async function recordStrikeOutcome(message,actor,plan,result,status=null,earPair=null){
 if(!plan?.strikes?.length||!message)return;
 if(message.getFlag(scope,outcomeKey))return;
 const phase=status??attackOutcome(result,plan);
 const state={version:1,status:phase,actorId:actor.id,plan:structuredClone(plan),checks:{},earPair,
  criticalFailure:result?.criticalFailure===true,criticalSuccess:result?.criticalSuccess===true,
  faceByOne:phase==='awaitingDefense'&&result?.hit===false};
 await message.setFlag(scope,outcomeKey,state);
 if(earPair)return;
 const landing=plan.strikes.find(s=>s.postureAfter);
 if(landing&&(!landing.cinematicLanding||phase==='miss'))await posture(actor,landing.postureAfter);
 const html=outcomeHTML(state);
 if(html)await message.update({content:message.content+html});
 if((phase==='miss'||phase==='failedLeap')&&plan.strikes.some(s=>s.recovery?.when.includes(phase)))await runStrikeStep(message,'recover');
 if(phase==='miss'&&plan.strikes.some(s=>s.bodyInjury?.when?.includes(phase)))await runStrikeStep(message,'selfDamage');
 if(phase==='hit')await followConfirmedHit(message,state);
}

export async function finishEarClapPair(slots){
 if(slots.length!==2||slots.some(slot=>!slot.completed||slot.awaitingDefense))return;
 const hits=slots.filter(slot=>slot.passedDefense).map(slot=>globalThis.game?.messages?.get(slot.resultMessageId)).filter(Boolean);
 const message=hits[0];if(!message)return;
 const state=structuredClone(message.getFlag(scope,outcomeKey));
 if(state.pairResolved)return;
 state.status='hit';state.earPairHits=hits.length;state.pairResolved=true;
 await save(message,state);
 if(hits.length===2)await append(message,'<p>Двойной Ear Clap: оба удара прошли защиту. Один Quick Contest (MA70).</p>');
 await followConfirmedHit(message,state);
}

function outcomeHTML(state){
 const controls=outcomeControls(state.plan,state.status);
 const notes=state.plan.strikes.flatMap(strike=>{
  const entries=[];
  if(state.faceByOne)entries.push('Промах на 1. Удар пришёлся в лицо, защищает DR черепа (MA72).');
  if(strike.postureAfter==='supine')entries.push('Атакующий заканчивает лёжа лицом вверх.');
  if(strike.procedure==='axe'&&state.status!=='miss')entries.push('У цели Parry-1 против последующих атак до её хода.');
  if(strike.bodyInjury?.when?.includes(state.status))entries.push('Бросьте исходный Damage по атакующему: '+strike.bodyInjury.zone+'.');
  if(strike.recovery?.defenseOnMiss&&state.status==='miss')entries.push('До следующего хода DX и активные защиты атакующего -2.');
  return entries;
 });
 if(!controls&&!notes.length)return '';
 return '<details class="olegurps-chat-details" open><summary>Последствия удара</summary>'+notes.map(note=>'<p>'+escape(note)+'</p>').join('')+controls+'</details>';
}

async function append(message,html){await message.update({content:message.content+html});}
async function save(message,state){await message.setFlag(scope,outcomeKey,structuredClone(state));}

async function balanced(actor,strike,state){
 const recovery=strike.recovery;
 if(recovery.criticalFalls&&state.criticalFailure)return {fall:true,critical:true};
 const dx=attr(actor,'DX')+recovery.dx;
 const acrobatics=bestSkill(actor,'acrobatics');
 const alternate=acrobatics!==null&&recovery.acrobatics!==undefined?acrobatics+recovery.acrobatics:-Infinity;
 const useAcro=alternate>dx;
 if(!Number.isFinite(Math.max(dx,alternate)))throw Error('Неизвестен DX для равновесия.');
 const roll=await nativeTechniqueCheck({actor,name:(useAcro?'Acrobatics':'DX')+' – '+strike.name,level:Math.max(dx,alternate)});
 if(!roll.rolled)return null;
 return {roll:receipt(roll),fall:!roll.success&&!recovery.offBalance,offBalance:!roll.success&&recovery.offBalance===true};
}

async function followConfirmedHit(message,state){
 const extra=[];
 for(const strike of state.plan.strikes){
  if(strike.bodyInjury?.mode==='hurtingYourself')extra.push('<label>Исходный Damage <input type="number" min="0" data-strike-raw></label>'+
   '<label>Твёрдый DR цели <input type="number" min="0" data-strike-dr></label>'+button('hardImpact','Рассчитать Hurting Yourself'));
  switch(strike.procedure){
   case 'ear':extra.push(button('ear','Quick Contest – Ear Clap'));break;
   case 'eyePoke':
   case 'eyePluck':
   case 'eyeRake':
   case 'lethalEye':
    extra.push(button('flinch','Will цели – вздрагивание'));
    if(strike.procedure==='eyeRake')extra.push('<label>Damage после DR <input type="number" min="0" data-strike-penetration></label>'+button('rake','HT цели – ослепление'));
    if(!state.faceByOne&&['eyePoke','eyePluck'].includes(strike.procedure))extra.push('<label>Damage после DR <input type="number" min="0" data-strike-penetration></label>'+button('eyeDamage','Проверить ранение глаза'));
    break;
   case 'slam':
    extra.push(button('slam','Ответный Damage столкновения')+
      '<label>Damage, нанесённый цели <input type="number" min="0" data-strike-raw></label>'+button('slamBalance','Сравнить Damage и проверить падение'));
    if(strike.cinematicLanding)extra.push(button('cinematicLanding','Acrobatics-5 – приземление'));
    break;
   case 'drop':
    if(strike.id==='elbowDrop'&&['kneeling','sitting'].includes(strike.targetPosture))extra.push(button('elbowBalance','Был Knockback – проверить падение'));
    break;
   case 'push':
    if(['leg','skull','face','neck'].includes(strike.zone))extra.push(button('push','Цель отброшена – проверка равновесия'));
    break;
  }
 }
 if(extra.length)await append(message,'<details class="olegurps-chat-details"><summary>Броски после попадания</summary>'+[...new Set(extra)].join('')+'</details>');
}

const lowerLocation={skull:'корпус',eye:'корпус',face:'корпус',neck:'корпус',torso:'нога',silhouette:'нога',arm:'нога',hand:'нога',groin:'стопа',leg:'стопа'};

async function runStrikeStep(message,step,{penetration=null,raw=null,dr=null}={}){
 if(!canEdit(message))throw Error('Результат этой атаки подтверждает автор или GM.');
 const state=structuredClone(message.getFlag(scope,outcomeKey));
 if(!state?.plan?.strikes?.length)throw Error('Снимок техники недоступен.');
 const actor=globalThis.ChatMessage.getSpeakerActor?.(message.speaker)??globalThis.game?.actors?.get(state.actorId);
 if(!own(actor))throw Error('Нужны права владельца атакующего.');
 if(state.checks[step])return false;
 const signalled=['hit','defended','shield','retreat','dodged'].includes(step);
 if(signalled){
  if(state.status!=='awaitingDefense')return false;
  const strike=state.plan.strikes.find(s=>s.procedure==='axe');
  if(step==='retreat'&&(!strike||!lowerLocation[strike.zone]))throw Error('Перенос попадания применяется только при Axe Kick выше стопы.');
  if(step==='retreat')state.location=lowerLocation[strike.zone];
  state.status=step==='retreat'?'hit':step;
  await save(message,state);
  await append(message,'<p>'+escape(step==='retreat'?'Axe Kick попал в зону: '+state.location:step==='hit'?'Удар прошёл защиту.':'Защита цели подтверждена.')+'</p>'+outcomeHTML(state));
  if(state.status==='hit')await followConfirmedHit(message,state);
  if(state.status!=='hit'&&state.plan.strikes.some(s=>s.cinematicLanding))await posture(actor,'prone');
  if(['defended','shield'].includes(step)&&state.plan.strikes.some(s=>s.recovery?.when.includes(step)))await runStrikeStep(message,'recover');
  if(step==='shield'&&state.plan.strikes.some(s=>s.bodyInjury?.when?.includes(step)))await runStrikeStep(message,'selfDamage');
  return true;
 }
 if(step==='recover'){
  const strike=state.plan.strikes.find(s=>s.recovery?.when.includes(state.status));
  if(!strike)return false;
  const result=await balanced(actor,strike,state);
  if(!result)return false;
  state.checks.recover=result;
  await save(message,state);
  if(result.fall)await posture(actor,'prone');
  if(result.offBalance)await append(message,'<p>Атакующий потерял равновесие. Retreat недоступен до следующего хода.</p>');
  if(result.fall&&strike.recovery.collision){
   const hp=strike.actorHP;
   if(hp>0){
    const collision=immovableCollision({hp,speed:strike.movement+strike.leap,hardSurface:true});
    if(collision.damage)await rollBasicDamage(actor,{formula:collision.damage.dice,damagetype:'cr'},strike.name+' – столкновение с землёй (B431)');
   }
  }
  return true;
 }
 if(step==='selfDamage'){
  const strike=state.plan.strikes.find(s=>s.bodyInjury?.when?.includes(state.status));
  const action=message.getFlag(scope,'shotSnapshot')?.profile?.damage?.rules?.meleeSnapshot?.action;
  if(!strike||!action)return false;
  const roll=await rollBasicDamage(actor,action,strike.name+' – Damage по атакующему ('+strike.bodyInjury.zone+')');
  if(!roll)return false;
  state.checks.selfDamage={messageId:roll.id,total:roll.rolls?.[0]?.total};
  await save(message,state);
  return true;
 }
 if(step==='wrap'){
  const strike=state.plan.strikes.find(s=>s.wrap);
  if(!strike||!['miss','dodged'].includes(state.status))return false;
  const effective=message.getFlag(scope,'shotSnapshot')?.profile?.context?.effectiveSkill;
  if(!Number.isFinite(effective))throw Error('Нет подтверждённого уровня исходного Return Strike.');
  const roll=await nativeTechniqueCheck({actor,name:'Return Strike – попадание в себя (B392)',level:Math.min(9,effective)});
  if(!roll.rolled)return false;
  state.checks.wrap=receipt(roll);
  await save(message,state);
  if(roll.success)await append(message,'<p>Возможное попадание в себя. Примените допустимую защиту ближнего боя. После её провала используйте исходный Damage.</p>');
  return true;
 }
 if(state.status!=='hit')return false;
 if(step==='cinematicLanding'){
  if(!state.plan.strikes.some(s=>s.cinematicLanding))return false;
  const level=Math.max(attr(actor,'DX')-6,bestSkill(actor,'acrobatics')??0)-5;
  const roll=await nativeTechniqueCheck({actor,name:'Acrobatics – приземление Drop Kick',level});
  if(!roll.rolled)return false;
  if(!roll.success)await posture(actor,'prone');
  state.checks.cinematicLanding=receipt(roll);
  await save(message,state);
  return true;
 }
 if(step==='hardImpact'){
  const effect=state.plan.strikes.find(s=>s.bodyInjury?.mode==='hurtingYourself')?.bodyInjury;
  if(!effect||raw===null||!Number.isInteger(raw)||raw<0||dr===null||!Number.isInteger(dr)||dr<0)throw Error('Укажите исходный Damage и эффективный твёрдый DR, без Tough Skin.');
  const damage=dr>=effect.threshold||state.faceByOne?Math.min(dr,Math.floor(raw/(effect.divisor??5))):0;
  state.checks.hardImpact={raw,dr,damage,zone:effect.zone};
  await save(message,state);
  await append(message,'<p>Hurting Yourself: '+damage+' cr ('+escape(effect.zone)+'), собственный DR защищает.</p>');
  return true;
 }
 const strike=state.plan.strikes.find(s=>step==='ear'||step==='cripple'&&state.checks.ear?s.procedure==='ear':['slam','slamBalance'].includes(step)?s.procedure==='slam':
  step==='elbowBalance'?s.id==='elbowDrop':step==='push'?s.procedure==='push':
  ['eyePoke','eyePluck','eyeRake','lethalEye'].includes(s.procedure));
 if(!strike)return false;
 const target=targetActor(strike.target);
 if(step==='slam'){
  const hp=Number(strike.target.hp??target?.system?.HP?.max);
  if(!(hp>0))throw Error('Нужна цель с подтверждённым HP до атаки.');
  const damage=collisionDice(hp,strike.movement+strike.closing);
  const roll=await rollBasicDamage(actor,{formula:damage.dice,damagetype:'cr'},'Drop Kick – ответное столкновение');
  if(!roll)return false;
  state.checks.slam={messageId:roll.id,total:roll.rolls?.[0]?.total};
  await save(message,state);
  await append(message,'<p>Укажите результат Damage по цели для сравнения по B371.</p>');
  return true;
 }
 if(!own(target))throw Error('Этот бросок должен выполнить владелец цели или GM.');
 if(step==='slamBalance'){
  const received=state.checks.slam?.total;
  if(raw===null||!Number.isInteger(raw)||raw<0||!Number.isFinite(received))throw Error('Сначала бросьте ответный Damage и укажите исходный Damage по цели.');
  const targetFalls=raw>0&&raw>=received*2,requiresDX=!targetFalls&&raw>=received;
  const roll=requiresDX?await check(target,'DX',0,'DX – столкновение Drop Kick'):null;
  if(roll&&!roll.rolled)return false;
  const fall=targetFalls||roll?.success===false;
  if(fall)await posture(target,'prone');
  state.checks.slamBalance={dealt:raw,received,fall,roll:roll?receipt(roll):null};
  await save(message,state);
  await append(message,'<p>'+escape(fall?'Цель упала после столкновения.':'Цель устояла после столкновения.')+'</p>');
  return true;
 }
 if(step==='ear'){
  const attacker=await nativeTechniqueCheck({actor,name:'Ear Clap – Quick Contest',level:strike.skillLevel});
  if(!attacker.rolled)return false;
  const defender=await check(target,'HT',0,'HT – Ear Clap');
  if(!defender.rolled)return false;
  const win=attacker.margin>defender.margin;
  const crippling=attacker.criticalSuccess||defender.criticalFailure;
  state.checks.ear={attacker:receipt(attacker),defender:receipt(defender),win,crippling};
  await save(message,state);
  if(win){
   const double=state.earPairHits===2;
   if(!double&&globalThis.CONFIG?.statusEffects?.some(effect=>effect.id==='stun'))await target.toggleStatusEffect('stun',{active:true});
   const duration=await globalThis.Roll.create(double?'2d6':'1d6').evaluate();
   if(double)await timedStatus(target,'deaf',duration.total);
   await textMessage(target,'Ear Clap',(double?'Deafness на ':'Физическое оглушение. DX-1 и Hard of Hearing на ')+duration.total+' с.',[duration]);
  }
  if(crippling)await append(message,'<p>В конце боя определите длительность потери слуха по B422.</p>'+button('cripple','HT – длительность увечья'));
  return true;
 }
 if(step==='eyeDamage'){
  if(state.faceByOne||!['eyePoke','eyePluck'].includes(strike.procedure))return false;
  const hp=Number(strike.target.hp);
  if(!(hp>0)||penetration===null||!Number.isInteger(penetration)||penetration<0)throw Error('Нужны HP цели и подтверждённый Damage после DR.');
  const limit=Math.floor(hp/10)+1,crippled=penetration>=limit,injury=Math.min(limit,penetration);
  if(crippled&&strike.procedure==='eyePluck'&&strike.relativeSM<5){
   const roll=await check(target,'HT',0,'HT – Eye-Pluck');
   if(!roll.rolled)return false;
   state.checks.eyeDamage={injury,crippled,permanent:!roll.success,roll:receipt(roll)};
  }else state.checks.eyeDamage={injury,crippled};
  await save(message,state);
  await append(message,'<p>Ранение глаза: '+injury+' HP.'+(crippled?' Глаз покалечен.':'')+(state.checks.eyeDamage.permanent?' Утрата постоянная.':'')+'</p>');
  if(crippled&&!state.checks.eyeDamage.permanent)await append(message,'<p>В конце боя определите длительность увечья по B422.</p>'+button('cripple','HT – длительность увечья'));
  return true;
 }
 if(step==='cripple'){
  if(!state.checks.eyeDamage?.crippled&&!state.checks.ear?.crippling)return false;
  const roll=await cripplingDuration(target,strike.name);
  if(!roll)return false;
  state.checks.cripple=receipt(roll);
  await save(message,state);
  return true;
 }
 const config={
  flinch:['Will',0,'Will – вздрагивание',roll=>roll.success?'Цель сохраняет равновесие.':'Атаки и защиты цели -1 до конца её следующего хода.'],
  rake:['HT',-penetration,'HT – Eye-Rake',roll=>roll.criticalFailure?'Один глаз покалечен. Реальное ранение равно округлённому вниз HP/10.':roll.success?'Ослепления нет.':'Цель ослеплена на '+(-roll.margin)+' мин.'],
  elbowBalance:['DX',0,'DX – Knockback после Elbow Drop',roll=>roll.success?'Цель сохранила положение.':'Цель упала без перемещения.'],
  push:['DX',strike.zone==='leg'?-2:-3,'DX – Push Kick',roll=>roll.success?'Цель устояла.':'Цель падает.']
 }[step];
 if(step==='rake'&&(penetration===null||!Number.isInteger(penetration)||penetration<0))throw Error('Укажите целое неотрицательное Damage после DR.');
 if(!config||step==='rake'&&strike.procedure!=='eyeRake')return false;
 const [stat,mod,name,describe]=config;
 const roll=await check(target,stat,mod,name);
 if(!roll.rolled)return false;
 state.checks[step]=receipt(roll);
 await save(message,state);
 if(['push','elbowBalance'].includes(step)&&!roll.success)await posture(target,'prone');
 if(step==='rake'&&!roll.success&&!roll.criticalFailure)await timedStatus(target,'blind',-roll.margin*60);
 await append(message,'<p>'+escape(describe(roll))+'</p>');
 return true;
}

async function cripplingDuration(target,name){
 const roll=await check(target,'HT',0,'HT – длительность '+name+' (B422)');
 if(!roll.rolled)return null;
 if(roll.criticalFailure||roll.success){
  await append(roll.message,'<p>'+escape(roll.criticalFailure?'Постоянное увечье.':'Временное увечье, пока не восстановится HP.')+'</p>');
 }else{
  const duration=await globalThis.Roll.create('1d6').evaluate();
  await textMessage(target,name,'Длительное увечье: '+duration.total+' мес.',[duration]);
 }
 return roll;
}

let installed=false;
export function installMeleeStrikeProcedureHooks(){
 if(installed||!globalThis.Hooks?.on)return;
 installed=true;
 globalThis.Hooks.on('renderChatMessageHTML',(message,html)=>{
  const root=html?.[0]??html;
  if(!root?.querySelectorAll)return;
  for(const control of root.querySelectorAll('[data-melee-strike-step]')){
   if(!canEdit(message)){control.disabled=true;continue;}
   control.addEventListener('click',async()=>{
    control.disabled=true;
    try{
     const field=name=>control.closest('details')?.querySelector('[data-strike-'+name+']')?.value;
     const read=name=>field(name)?Number(field(name)):null;
     await withMeleeTechniqueExecution(()=>runStrikeStep(message,control.dataset.meleeStrikeStep,{
      penetration:read('penetration'),raw:read('raw'),dr:read('dr')
     }));
    }catch(error){globalThis.ui?.notifications?.warn(error.message);}
    finally{control.disabled=false;}
   });
  }
 });
}
