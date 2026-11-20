// Native GGA checks and module-owned bookkeeping for MA78/80/85/87.
import {executeWithCapturedRollMessage,buildAttackModifierBreakdownHtml} from './prepared-gga-roll.js';
import {withActorResourceWrite} from './actor-resource-writes.js';
import {MeleeProfileService,meleeProfileContext,meleeMartialGrips,resolveMeleeProfile} from './melee-profile-service.js';
import {captureMeleeExecutionState} from './melee-execution-state.js';
import {physicalMeleeIdentity,withMeleeTechniqueExecution,meleeActorTurnKey} from './melee-technique-sequences.js';
import {executeNativeMeleeDamage,performSpecialMeleeAttack,prepareEffectiveMeleeDamage,resolveDerivedDamageFormula} from './melee-service.js';
import {resolveMeleePenaltyTechnique} from './combat-technique-registry.js';
import {learnedMeleeSkills,techniqueIdentity} from './melee-penalty-techniques.js';
import {combatPerkLabel} from './ma-combat-perks.js';
import {meleeSpecialHint} from './melee-special-hints.js';
import {resolveStrengthDamage} from './strength-service.js';
import {installMeleeNativeDamage,numericMeleeDamageEvent} from './melee-native-damage.js';
const scope='olegurps-qol',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const own=actor=>{if(!actor?.isOwner&&!globalThis.game?.user?.isGM)throw Error('Нет прав владельца персонажа.');};
const storageKey=value=>encodeURIComponent(String(value)).replaceAll('.','%2E');
export function initialCarvingProgress(actor,context){
 const entry=context.carvingId&&actor?.getFlag?.(scope,'meleeInitialCarving')?.[storageKey(context.carvingId)];
 const count=context.strokeCount;
 let completed=0;
 for(let stroke=1;stroke<=count;stroke++){
  const hasLine=entry?.parts.some(p=>p.stroke===stroke&&p.mark!==false&&(p.hit||stroke>1&&p.misaligned));
  if(!hasLine)break;
  completed=stroke;
 }
 return {entry,completed,stroke:Math.min(completed+1,count),finished:completed===count};
}
export function meleeTechniqueTurnKey(manualTurn=''){
 const c=globalThis.game?.combat;
 return c?.started?c.id+':'+c.round+':'+c.turn:'manual:'+String(manualTurn||'0');
}
export function meleeTechniqueReadiness(actor,attack){return actor?.getFlag?.(scope,'meleeTechniqueReadiness')?.[storageKey(physicalMeleeIdentity(attack))]??null;}
export function assertMeleeTechniqueReady(actor,attack,manualTurn=''){
 if(Object.values(actor?.getFlag?.(scope,'meleeTechniqueReadiness')??{}).some(s=>s.turnEnded&&s.turnKey===meleeActorTurnKey(actor)))throw Error('Провал Reverse Grip завершил ход персонажа; другая атака в этом ходу невозможна.');
 const state=meleeTechniqueReadiness(actor,attack);if(!state)return;
 if(state.dropped)throw Error('Оружие выпущено после Reverse Grip. На следующем ходу подтвердите Ready/подбор.');
}
export async function nativeTechniqueCheck({actor,name,level,details='',nativeAction=null,attackCheck=null}){
 own(actor);
 const bucket=globalThis.GURPS?.ModifierBucket;
 const before=structuredClone(bucket?.modifierStack?.modifierList??[]);
 const rollName=String(nativeAction?.name??name).trim();
 const execution=await executeWithCapturedRollMessage({actorId:actor.id,
  messageFilter:data=>String(data.rolls?.[0]?.formula??'').startsWith('3d6['+rollName+']'),execute:attackCheck??(()=>globalThis.GURPS.performAction({
  ...(nativeAction??{type:'skill-spell',name,target:level,isSkillOnly:true,orig:'S:'+name}),
  overridetxt:details?'<details class="olegurps-chat-details"><summary>Техника</summary><div>'+details+'</div></details>':undefined
 },actor))});
 if(!execution.message)return {rolled:false,cancelled:true};
 const native=globalThis.GURPS.lastTargetedRolls?.[actor.id]??globalThis.GURPS.lastTargetedRoll??{},total=execution.message.rolls?.[0]?.total;
 if(!Number.isFinite(total)||!Number.isFinite(Number(native.finaltarget))||Number(native.rtotal)!==total)throw Error('Не удалось связать результат native GGA с броском техники; последствия автоматически не применены.');
 const finaltarget=Number(native.finaltarget),margin=finaltarget-total,success=execution.result!==false&&native.failure!==true;
 const criticalFailure=!success&&native.isCritFailure===true;
 return {rolled:true,message:execution.message,total,finaltarget,margin,success,criticalFailure,criticalSuccess:success&&native.isCritSuccess===true,
  nativeGga:true,bucketBefore:before};
}

function specialDamageFormula(actor, prepared, roll, result, shin){
 if(roll.damage==='weapon')return prepared;
 if(roll.damage==='thr cr')return 'thr cr';
 const raw=resolveStrengthDamage(actor,'thrust',{applyArmST:roll.damage==='aggressiveParry'}).baseFormula;
 const match=/^(\d+)d(?:6)?([+-]\d+)?$/.exec(raw??'');
 if(!match)throw Error('Не удалось определить thrust для ответного урона.');
 const dice=Number(match[1]),adds=Number(match[2]??0),jam=roll.damage==='jam';
 const dx=Number(actor.system?.attributes?.DX?.value),level=result.special.underlyingLevel;
 const name=techniqueIdentity(result.governingSkill),relative=level-dx;
 const bonus=name==='brawling'?(relative>=2?1:0):name==='boxing'?(relative>=2?2:relative>=1?1:0):
  name==='karate'?(relative>=1?2:relative>=0?1:0):0;
 const value=adds+Math.min(jam?-3:-4,(jam?-1:-2)-dice)+bonus*dice+
  (jam&&shin?shin.flat+shin.bonus*dice:0);
 return dice+'d'+(value>0?'+'+value:value<0?value:'')+' cr';
}

export async function executeMeleeSpecialCheck({actor,attack,result,roll,shin=null}){
 return withMeleeTechniqueExecution(async()=>{
  own(actor);
  if(!result?.available||result.special.error||!roll||roll.kind==='attack'||!Number.isFinite(roll.effectiveLevel))
   throw Error(result?.special.error??'Укажите условия для этого броска.');
  const hint=meleeSpecialHint(result.special.ref);
  const name=result.name+' ('+roll.label+')';
  const attribute=['Parry','Block','Dodge','DX'].includes(roll.kind)?roll.kind:null;
  const quotedName='"'+name.replaceAll('"','\\"')+'"';
  const defenseRef={Parry:'P:',Block:'B:'}[attribute];
  const nativeAction=attribute?{type:'attribute',name,attribute,attrkey:attribute.toUpperCase(),
   target:roll.effectiveLevel,orig:defenseRef?defenseRef+quotedName:attribute}:{type:'skill-spell',name,
    target:roll.effectiveLevel,isSkillOnly:true,orig:'SK:'+quotedName};
  let damage=null;
  if(roll.damage){
   const expression=specialDamageFormula(actor,attack.damage,roll,result,shin);
   const projection=roll.damage==='weapon'?attack:{name:result.name,damage:expression,data:{damage:expression}};
   damage=await prepareEffectiveMeleeDamage({actor,attack:projection,damage:expression});
   if(!damage)throw Error('Формула урона особой техники не распознана GGA.');
  }
 const perks=[...(result.perks??[]),...(roll.combatPerks??[])];
 const snapshot={id:result.id,source:result.sources,skill:result.governingSkill,techniqueLevel:result.level,
   defaultLevel:result.defaultLevel,maximum:result.maximum,learned:result.learned,roll:structuredClone(roll),
   ...(perks.length?{perks:structuredClone(perks)}:{}),
   ...(shin?{shin:structuredClone(shin)}:{}),
   attack:{key:attack?.key??null,modeId:attack?.meleeProfile?.modeId??attack?.standaloneRef?.modeId??null},
   damage:damage&&structuredClone(damage)};
 const shinHint=shin?(game.i18n.lang==='ru'?
   ' Удар голенью: проверьте травму своей ноги при DR цели '+shin.selfInjuryDR+' или выше (MA112, B379).':
   ' Shin kick: check injury to your leg when the target has DR '+shin.selfInjuryDR+' or higher (MA112, B379).'):'';
 const details=esc(roll.label)+' '+esc(roll.effectiveLevel)+'. '+esc(hint.text)+' '+esc(hint.sources)+'.'+esc(shinHint)+
   (perks.length?' <small>'+perks.map(perk=>esc(combatPerkLabel(perk))).join(' · ')+'</small>':'');
  const attackCheck=roll.kind==='hit'?()=>performSpecialMeleeAttack({actor,attack,rollName:name,
   level:roll.effectiveLevel,skillCap:roll.skillCap,details,drunken:perks.find(perk=>perk.name==='Drunken Fighting')}):null;
  const outcome=await nativeTechniqueCheck({actor,name,level:roll.effectiveLevel,details,nativeAction,attackCheck});
  if(!outcome.rolled)return outcome;
  await outcome.message.setFlag(scope,'meleeSpecialRoll',{version:1,actorId:actor.id,...snapshot,
   result:{total:outcome.total,level:outcome.finaltarget,margin:outcome.margin}});
  if(damage&&(outcome.success||roll.kind==='contest'))await outcome.message.update({content:outcome.message.content+
   '<p><button type="button" data-melee-special-damage>Урон после ручного подтверждения: '+esc(damage.formula)+'</button></p>'});
  return outcome;
 });
}
export async function attemptReverseGrip({actor,attack,skill,context={}}){
 return withMeleeTechniqueExecution(async()=>{
  own(actor);assertMeleeTechniqueReady(actor,attack,context.manualTurn);
  const previous=meleeTechniqueReadiness(actor,attack),turnKey=meleeActorTurnKey(actor,context.manualTurn);
  if(previous?.turnKey===turnKey)throw Error('Быстрая смена уже предпринималась в этом ходу (MA102).');
  const profileContext=meleeProfileContext(actor,attack),profile=profileContext?.profiles.find(p=>p.modeId===(profileContext.saved.modeId||profileContext.source.modeId));
  if(!profile||!meleeMartialGrips(profile).includes('reversed'))throw Error('Нет подтверждённого источникового маршрута Reversed Grip для этого оружия.');
  const result=resolveMeleePenaltyTechnique('reverseGrip',{actor,attack,governingSkill:skill,context});
  if(!result.available)throw Error(result.reason);
  const expected=captureMeleeExecutionState(actor,attack),from=attack.meleeProfile?.grip??profileContext.saved.grip??'published';
  const roll=await nativeTechniqueCheck({actor,name:'Reverse Grip ('+skill.name+')',level:result.level,
   details:esc(skill.name)+' '+skill.level+'; '+result.defaultModifier+' → '+result.modifier+'. MA78; MA102.'});
  if(!roll.rolled)return roll;
  if(captureMeleeExecutionState(actor,attack)!==expected)throw Error('Оружие изменилось во время броска; хват не изменён.');
  let selfDamage=null;
  if(roll.success)await new MeleeProfileService(actor).save(attack,{...profileContext.saved,grip:from==='reversed'?'published':'reversed'},{context:profileContext});
  else if(roll.criticalFailure){
   const thrust=profileContext.profiles.find(p=>/^thr.*\bimp\b/.test(p.stats.damage));
   if(thrust){const projected=resolveMeleeProfile({actor,attack,context:profileContext,selection:{...profileContext.saved,modeId:thrust.modeId}});
    const prepared=await prepareEffectiveMeleeDamage({actor,attack:projected});
    if(prepared){const action={...prepared.action,formula:resolveDerivedDamageFormula(prepared.action.formula,'-2'),damagetype:'cut',next:null};action.overridetxt=action.formula;
     selfDamage={action,formula:action.formula+' cut'};}}
  }
  await withActorResourceWrite(actor,async()=>{const state=structuredClone(actor.getFlag(scope,'meleeTechniqueReadiness')??{});
   state[storageKey(physicalMeleeIdentity(attack))]={turnKey,dropped:!roll.success,turnEnded:!roll.success,from,to:roll.success?(from==='reversed'?'published':'reversed'):from,rollMessageId:roll.message.id};await actor.setFlag(scope,'meleeTechniqueReadiness',state);
   if(!globalThis.game?.combat?.started)await actor.setFlag(scope,'meleeTechniqueManualTurn',String(context.manualTurn||'0'));});
  const outcome={version:1,kind:'reverseGrip',nativeGga:true,success:roll.success,criticalFailure:roll.criticalFailure,turnKey,
   roll:{total:roll.total,finaltarget:roll.finaltarget,margin:roll.margin},
   dropped:!roll.success,turnEnded:!roll.success,selfDamage:selfDamage?{action:selfDamage.action,formula:selfDamage.formula}:null,
   selfDamageUnresolved:roll.criticalFailure&&!selfDamage,technique:result};
  await roll.message.setFlag(scope,'meleeTechniqueProcedure',outcome);
  await roll.message.update({content:roll.message.content+'<details class="olegurps-chat-details"><summary>Смена хвата</summary><p>'+esc(roll.success?'Быстрая смена выполнена; хват сохраняется до конца хода.':'Оружие выпущено; ход завершён.')+
   (roll.criticalFailure?' Tip Slash по собственному торсу; HP и защита применяются вручную.':'')+'</p>'+(selfDamage?'<button type="button" data-melee-technique-self-damage>Урон Tip Slash по себе: '+esc(selfDamage.formula)+'</button>':'')+'</details>'});
  return {rolled:true,messageId:roll.message.id,...outcome};
 });
}
export async function acknowledgeTechniqueReady(actor,attack,manualTurn=''){
 own(actor);const current=meleeTechniqueReadiness(actor,attack);
 if(current?.turnKey===meleeActorTurnKey(actor,manualTurn))throw Error('Провал завершил ход; Ready возможен на следующем ходу.');
 return withActorResourceWrite(actor,async()=>{const state=structuredClone(actor.getFlag(scope,'meleeTechniqueReadiness')??{});
  const value=state[storageKey(physicalMeleeIdentity(attack))];if(value)state[storageKey(physicalMeleeIdentity(attack))]={...value,dropped:false,turnEnded:false,readyAcknowledged:true};await actor.setFlag(scope,'meleeTechniqueReadiness',state);
  if(!globalThis.game?.combat?.started)await actor.setFlag(scope,'meleeTechniqueManualTurn',String(manualTurn||'0'));});
}
export async function advanceMeleeTechniqueTurn(actor,manualTurn){
 own(actor);if(globalThis.game?.combat?.started)throw Error('В Combat используется фактический текущий ход.');
 const turn=String(manualTurn??'').trim();if(!turn||meleeActorTurnKey(actor,turn)===meleeActorTurnKey(actor))throw Error('Укажите новый номер хода вне Combat.');
 return withActorResourceWrite(actor,()=>actor.setFlag(scope,'meleeTechniqueManualTurn',turn));
}

export function sequenceUseCount(actor,sequence){
 const encounter=globalThis.game?.combat?.id??sequence.encounter??'manual';
 const data=actor?.getFlag?.(scope,'meleeTechniqueUses');
 if(data?.encounter!==encounter)return 0;
 const recorded=data.recorded?.[storageKey(sequence.id+'|'+sequence.targetId)],count=Number(data.uses?.[storageKey(sequence.name+'|'+sequence.targetId)]??0);
 return recorded===true?Math.max(0,count-1):Number.isInteger(recorded)?recorded-1:count;
}
export async function recordSequenceUse(actor,sequence){
 if(sequence.kind!=='combination')return;
 own(actor);return withActorResourceWrite(actor,async()=>{
  const encounter=globalThis.game?.combat?.id??sequence.encounter??'manual';let data=structuredClone(actor.getFlag(scope,'meleeTechniqueUses')??{});
  if(data.encounter!==encounter)data={version:1,encounter,uses:{},recorded:{}};
  const event=storageKey(sequence.id+'|'+sequence.targetId),key=storageKey(sequence.name+'|'+sequence.targetId);
  if(!data.recorded[event]){data.uses[key]=Number(data.uses[key]??0)+1;data.recorded[event]=data.uses[key];await actor.setFlag(scope,'meleeTechniqueUses',data);}
 });
}

export async function recordInitialCarvingPart(message,{rollData,hit}={}){
 const shot=message?.getFlag(scope,'shotSnapshot'),plan=shot?.profile?.damage?.rules?.meleeTechniques;
 if(!plan?.results?.some(r=>r.id==='initialCarving'))return null;
 const context=plan.selection.context,native=rollData??globalThis.GURPS?.lastTargetedRolls?.[shot.actorId]??{};
 const total=Number(message.rolls?.[0]?.total??native.rtotal),margin=Number(native.finaltarget??shot.profile.context.effectiveSkill)-total;
 const misaligned=hit===false&&context.stroke>1&&margin>=-4&&margin<0;
 const die=misaligned?await new Roll('1d6').evaluate():null;
 const result={version:1,kind:'initialCarving',letter:context.letter,stroke:context.stroke,strokeCount:context.strokeCount,carvingId:context.carvingId,
  targetIds:shot.profile.context.techniqueTargets??[],targetLocationKeys:context.targetLocationKeys??[],
  nativeGga:true,total,margin,hit:hit!==false,misaligned,alignmentDie:die?.total??null,
  status:hit!==false||misaligned?'awaiting-defense-DR-and-GM':'missed',mark:null};
 const actor=game.actors.get(shot.actorId);
 await withActorResourceWrite(actor,async()=>{const ledger=structuredClone(actor.getFlag(scope,'meleeInitialCarving')??{}),id=storageKey(context.carvingId);
  const entry=ledger[id]??{letter:context.letter,strokeCount:context.strokeCount,targetSignature:JSON.stringify([context.manualTarget??null,context.targetLocationKeys??[],shot.profile.context.techniqueTargets??[]]),parts:[]};
  entry.parts.push({stroke:context.stroke,attackMessageId:message.id,hit:result.hit,misaligned,mark:null});ledger[id]=entry;await actor.setFlag(scope,'meleeInitialCarving',ledger);});
 await message.setFlag(scope,'meleeTechniqueProcedure',result);
 const description=misaligned?'Линия не соединена с предыдущей: зазор либо наложение. 1d = '+die.total+'; вариант определяет GM.':hit===false?'Движение не удалось.':'Движение попало; защита и Damage после DR ещё не подтверждены.';
 await message.update({content:message.content+'<details class="olegurps-chat-details"><summary>Движение Initial Carving</summary><p>'+(context.letter?esc(context.letter)+' · ':'')+'Штрих '+context.stroke+' из '+context.strokeCount+'. '+esc(description)+
  ' Для отметины нужен ≥1 cutting Damage после DR; металл/сходный твёрдый материал не отмечается. MA85.</p>'+(result.status!=='missed'?'<button type="button" data-melee-carving-mark="yes">GM: отметина подтверждена</button><button type="button" data-melee-carving-mark="no">GM: отметины нет</button>':'')+'</details>'});
 return result;
}
export async function resolveInitialCarvingMark(message,mark){
 if(!game.user.isGM)throw Error('Фактическую отметину Initial Carving подтверждает GM.');
 const result=message.getFlag(scope,'meleeTechniqueProcedure');
 if(result?.kind!=='initialCarving'||result.status==='missed')throw Error('Нет движения, способного оставить отметину.');
 const resolved={...result,status:'GM-resolved',mark:mark===true,adjudicator:game.user.id};
 const actor=game.actors.get(message.speaker.actor);
 await withActorResourceWrite(actor,async()=>{const ledger=structuredClone(actor.getFlag(scope,'meleeInitialCarving')??{}),entry=ledger[storageKey(result.carvingId)];
  const part=entry?.parts.find(p=>p.attackMessageId===message.id);if(part){part.mark=resolved.mark;await actor.setFlag(scope,'meleeInitialCarving',ledger);}});
 await message.setFlag(scope,'meleeTechniqueProcedure',resolved);
 await message.update({content:message.content+'<details class="olegurps-chat-details"><summary>Решение GM: Initial Carving</summary><p>'+esc(resolved.letter)+'; движение '+resolved.stroke+': '+(resolved.mark?'отметина подтверждена.':'отметины нет.')+'</p></details>'});return resolved;
}

export function executePressureFollowup(message,options={}){return withMeleeTechniqueExecution(()=>executePressureFollowupUnlocked(message,options));}
async function executePressureFollowupUnlocked(message,{confirmHit=false,confirmPenetration=false}={}){
 const shot=message?.getFlag(scope,'shotSnapshot'),plan=shot?.profile?.damage?.rules?.meleeTechniques;
 const technique=plan?.results?.find(r=>r.id==='pressurePointStrike'),actor=globalThis.game?.actors?.get(shot?.actorId);
 if(!technique||!actor)throw Error('Нет сохранённого Pressure-Point Strike.');own(actor);
 const previous=message.getFlag(scope,'meleeTechniqueProcedure');if(previous?.attackerRoll)throw Error('Бросок процедуры уже выполнен.');
 if(previous?.attackHit===false)throw Error('Исходная атака не попала; особая процедура недоступна.');
 if(!confirmHit)throw Error('Сначала подтвердите, что атака прошла защиту.');
 const name=plan.selection.context.pressureSkill,secret=/^Pressure Secrets/i.test(name);
 if(!secret&&!confirmPenetration)throw Error('Pressure Points требует хотя бы 1 Damage после DR.');
 const skill=learnedMeleeSkills(actor).find(e=>techniqueIdentity(e.name)===techniqueIdentity(name));
 if(!skill)throw Error('Особый навык не найден.');
 const roll=await nativeTechniqueCheck({actor,name,level:Number(skill.level??skill.import),details:'Pressure-Point Strike. B215; MA87.'});
 if(!roll.rolled)return roll;
 const targetActorId=shot.profile.context?.techniqueTargets?.[0]?.actorId??plan.selection.context.pressureTargetActorId??null;
 const procedure={version:1,kind:secret?'pressureSecrets':'pressurePoints',confirmedHit:true,confirmedPenetration:confirmPenetration,targetActorId,
  attackerRoll:{messageId:roll.message.id,total:roll.total,level:roll.finaltarget,margin:roll.margin,success:roll.success},
  status:secret||!roll.success?'resolved':'awaiting-defender-HT',damageMultiplier:secret&&roll.success?(plan.selection.context.targetVitals?3:2):1,
  ...(!secret&&!roll.success?{won:false,effect:'Pressure Points не сработал; сопротивление цели не требуется (B348).'}:{})};
 await message.setFlag(scope,'meleeTechniqueProcedure',procedure);
  await roll.message.update({content:roll.message.content+'<details class="olegurps-chat-details"><summary>Особая процедура</summary><p>'+esc(secret?(roll.success?'Pressure Secrets успешен. Проникающий урон ×'+procedure.damageMultiplier+'; применение после DR вручную.':'Pressure Secrets не сработал; обычный урон сохраняется.'):roll.success?'Для Pressure Points нужен фактический native HT roll цели. Контест и эффект ещё не разрешены.':procedure.effect)+'</p></details>'});
 return procedure;
}

export function executePressureDefense(message){return withMeleeTechniqueExecution(()=>executePressureDefenseUnlocked(message));}
async function executePressureDefenseUnlocked(message){
 const procedure=message?.getFlag(scope,'meleeTechniqueProcedure');
 if(procedure?.kind!=='pressurePoints'||!procedure.attackerRoll)throw Error('Сначала нужен Pressure Points roll нападающего.');
 if(procedure.status!=='awaiting-defender-HT'||!procedure.attackerRoll.success)throw Error('Сопротивление не требуется: процедура Pressure Points не ожидает HT.');
 const target=game.actors.get(procedure.targetActorId);if(!target)throw Error('Для процедуры не задан Actor цели.');own(target);
 if(game.messages.some(m=>m.getFlag(scope,'pressureDefenseFor')?.attackMessageId===message.id))throw Error('HT roll для этого воздействия уже выполнен.');
 const ht=Number(target.system?.attributes?.HT?.value);if(!Number.isFinite(ht))throw Error('HT цели не определён.');
 const roll=await nativeTechniqueCheck({actor:target,name:'HT – Pressure Points',level:ht,details:'Сопротивление Pressure Points. B215.',nativeAction:GURPS.parselink('HT').action});
 if(!roll.rolled)return roll;
 await roll.message.setFlag(scope,'pressureDefenseFor',{attackMessageId:message.id,actorId:target.id,nativeGga:true,
  total:roll.total,level:roll.finaltarget,margin:roll.margin});
 return {messageId:roll.message.id,total:roll.total,margin:roll.margin};
}
export async function resolvePressureContest(message){
 const procedure=message?.getFlag(scope,'meleeTechniqueProcedure'),shot=message?.getFlag(scope,'shotSnapshot'),attacker=game.actors.get(shot?.actorId);
 own(attacker);if(procedure?.kind!=='pressurePoints'||!procedure.attackerRoll)throw Error('Нет ожидающего Pressure Points Contest.');
 if(procedure.status==='resolved')return procedure;
 const target=game.actors.get(procedure.targetActorId);if(!target)throw Error('Actor цели не задан.');
 const defender=game.messages.find(m=>{
  const link=m.getFlag(scope,'pressureDefenseFor'),author=m.author??m.user;
  const user=typeof author==='string'?game.users.get(author):author;
  return link?.attackMessageId===message.id&&link.actorId===target.id&&link.nativeGga&&m.speaker.actor===target.id&&m.rolls?.length&&
    !!user&&(user.isGM||target.testUserPermission?.(user,'OWNER'));
 });
 if(!defender)throw Error('Ожидается настоящий GGA HT roll владельца цели.');
 const resistance=defender.getFlag(scope,'pressureDefenseFor'),won=procedure.attackerRoll.success===true&&procedure.attackerRoll.margin>resistance.margin;
 const locations=shot?.profile?.damage?.rules?.meleeTechniques?.selection.context.targetLocationKeys??[];
 const effect=locations.some(k=>/arm|leg|hand|foot|wing|tail/.test(k))?'Паралич конечности на 5d секунд.':locations.includes('face')?'Stun; IQ каждую секунду для восстановления.':locations.includes('skull')?'Слепота на 2d секунд.':locations.some(k=>/torso|vitals/.test(k))?'Нарушение дыхания / suffocation; HT каждую секунду для восстановления.':'Для этой зоны специальный эффект B215 не определён; решение вручную.';
 const result={...procedure,status:'resolved',defenderRoll:{...resistance,messageId:defender.id},won,
  effect:won?'Pressure Points: '+effect+' Длительность и состояние применяются вручную (B215).':'Цель выдержала воздействие; специального эффекта нет.'};
 await message.setFlag(scope,'meleeTechniqueProcedure',result);
 await message.update({content:message.content+'<details class="olegurps-chat-details"><summary>Результат Pressure Points</summary><p>'+esc(result.effect)+' '+procedure.attackerRoll.margin+' против '+resistance.margin+'.</p></details>'});
 return result;
}

let installed=false;const boundChatRoots=new WeakSet();
export function installMeleeTechniqueProcedureHooks(){
 if(installed||!globalThis.Hooks?.on)return;installed=true;
 Hooks.on('renderChatMessageHTML',(message,root)=>{
  if(boundChatRoots.has(root))return;boundChatRoots.add(root);
  root.addEventListener('click',async event=>{
   const button=event.target.closest?.('[data-melee-technique-self-damage],[data-melee-pressure-followup],[data-melee-pressure-defense],[data-melee-pressure-resolve],[data-melee-carving-mark],[data-melee-special-damage]');if(!button)return;
   button.disabled=true;
   try{
    if(button.hasAttribute('data-melee-special-damage')){
     const saved=message.getFlag(scope,'meleeSpecialRoll'),actor=game.actors.get(saved?.actorId);own(actor);
     if(!saved?.damage)throw Error('Нет сохранённого урона особой техники.');
     const action=structuredClone(saved.damage.action);
     installMeleeNativeDamage();
     await GURPS.performAction(action,actor,numericMeleeDamageEvent(event,action));
    }else if(button.hasAttribute('data-melee-technique-self-damage')){
     const procedure=message.getFlag(scope,'meleeTechniqueProcedure'),actor=game.actors.get(message.speaker.actor);own(actor);
     if(!procedure?.selfDamage)throw Error('Нет сохранённого Tip Slash.');await executeNativeMeleeDamage({actor,preparedDamage:procedure.selfDamage});
    }else if(button.hasAttribute('data-melee-carving-mark'))await resolveInitialCarvingMark(message,button.dataset.meleeCarvingMark==='yes');
    else if(button.hasAttribute('data-melee-pressure-defense'))await executePressureDefense(message);
    else if(button.hasAttribute('data-melee-pressure-resolve'))await resolvePressureContest(message);
    else await executePressureFollowup(message,{confirmHit:true,confirmPenetration:button.dataset.meleePressureFollowup==='penetrated'});
   }catch(error){globalThis.ui?.notifications?.error(error.message);}finally{button.disabled=false;}
  });
 });
}
