// MA80–81, MA83, MA126–128. No independent registry and no new attack roller.
import {hasCombatTrait,cinematicTraining,techniqueIdentity,techniqueLearned,learnedMeleeSkills} from './melee-penalty-techniques.js';
import {readCombatTechniqueSkills} from './combat-technique-data.js';
import {hasSpecializedCombatPerk} from './ma-combat-perks.js';
const key=techniqueIdentity;
export function meleeActorTurnKey(actor,manualTurn=''){
 const combat=globalThis.game?.combat;
 return combat?.started?combat.id+':'+combat.round+':'+combat.turn:'manual:'+String(manualTurn||actor?.getFlag?.('olegurps-qol','meleeTechniqueManualTurn')||'0');
}
export function physicalMeleeIdentity(attack){
 return attack?.unarmedRef?'body:'+attack.unarmedRef.id:attack?.standaloneRef?'weapon:'+attack.standaloneRef.weaponId:
  attack?.equipmentRef?'equipment:'+attack.equipmentRef.instanceId:attack?.data?.parentuuid?'equipment:'+attack.data.parentuuid:
  attack?.name?'imported-name:'+key(attack.name):attack?.uuid||attack?.key;
}
export function offHandAttackPenalty(actor,attack,skill,hand){
 if(hand!=='off')return 0;
 // Basic Set unarmed attacks have no off hand. Harsh Realism MA124 is NOT enabled.
 if(attack?.unarmedRef)return 0;
 return hasCombatTrait(actor,'Ambidexterity')||hasSpecializedCombatPerk(actor,'Off-Hand Weapon Training',skill?.name)?0:-4;
}
export function validateDualWeaponSequence({actor,steps,rapidStrike=false,combination=false,adjacent=false}={}){
 const errors=[];
 if(!Array.isArray(steps)||steps.length!==2)return {available:false,errors:['DWA требует ровно две атаки разными руками.']};
 if(rapidStrike||combination)errors.push('DWA несовместим с заменой той же атаки на Rapid Strike / Combination (MA127).');
 if(steps[0].hand===steps[1].hand||!steps.every(s=>['main','off'].includes(s.hand)))errors.push('Назначьте разные руки двум ударам DWA.');
 for(const s of steps){if(s.hands!==1||s.attack?.readinessReason)errors.push('Для каждого удара нужно готовое одноручное оружие/свободная рука.');}
 if(!steps.every(s=>s.attack?.unarmedRef)&&physicalMeleeIdentity(steps[0].attack)===physicalMeleeIdentity(steps[1].attack))errors.push('Для двух вооружённых ударов нужны два отдельных экземпляра оружия.');
 const targets=new Set(steps.map(s=>s.targetId).filter(Boolean));
 const sameTarget=targets.size===1&&steps.every(s=>s.targetId);
 if(targets.size>1&&!adjacent)errors.push('Для двух целей DWA требуется подтверждённая смежность (B417).');
 return {version:1,kind:'dualWeaponAttack',available:!errors.length,errors,sources:['B417','MA83','MA127'],sameTarget:!!sameTarget,
  defenseModifier:targets.size===1?-1:0,steps:steps.map(s=>({attackKey:s.attack?.key,physicalIdentity:physicalMeleeIdentity(s.attack),
    hand:s.hand,hands:s.hands,skill:s.skill?.name,targetId:s.targetId,offHandPenalty:offHandAttackPenalty(actor,s.attack,s.skill,s.hand),
    ...(s.hand==='off'&&!s.attack?.unarmedRef&&!hasCombatTrait(actor,'Ambidexterity')&&
       hasSpecializedCombatPerk(actor,'Off-Hand Weapon Training',s.skill?.name)?{perks:[{name:'Off-Hand Weapon Training',modifier:4,source:'MA50'}]}:{})}))};
}

export function combinationName(steps){
 return 'Combination ('+steps.map(s=>s.skill.name+' '+s.attackName+'/'+s.targetKey).join(' + ')+')';
}
export function resolveCombination({actor,steps,rapidStrike=false,dualWeaponAttack=false,fixedName=null}={}){
 const errors=[];
 if(!Array.isArray(steps)||![2,3].includes(steps.length))return {available:false,errors:['Combination требует двух или трёх фиксированных Targeted Attacks.']};
 if(rapidStrike||dualWeaponAttack)errors.push('Combination заменяет единственный Rapid Strike; DWA/ещё один Rapid Strike одновременно запрещены (MA127).');
 for(const s of steps){
  if(!s.skill?.name||!Number.isFinite(s.skill.level)||!s.targetKey||s.randomLocation)errors.push('Каждый шаг должен фиксировать точный навык, атаку и зону.');
  if(s.grapple||!s.attack?.damage)errors.push('Эта последовательность требует отсутствующего состояния захвата/броска; она не исполняется как обычный Damage.');
  if(s.attack?.readinessReason)errors.push('В последовательности есть неготовое оружие.');
 }
 const identities=steps.map(s=>physicalMeleeIdentity(s.attack));
 for(let i=0;i<steps.length;i++)if(identities.slice(0,i).includes(identities[i])){
  const previous=steps.slice(0,i).filter((s,n)=>identities[n]===identities[i]);
  if(previous.some(s=>{const a=s.attack;return a?.meleeProfile?.strength?.ready||a?.meleeProfile?.hands?.ready||
    (a?.meleeProfile?.motion==='swing'||/^sw/i.test(a?.sourceDamage??a?.damage))&&/\bimp\b/.test(a.damage)||a?.data?.stuck===true;}))
   errors.push('Повторное применение оружия, становящегося неготовым/застревающего, не допускается (MA80).');
  if(!steps[i].attack?.unarmedRef&&previous.some(s=>s.hand!==steps[i].hand))errors.push('Передача одного оружия между руками не входит в Combination; нужны два отдельных экземпляра.');
 }
 const name=combinationName(steps);if(fixedName&&key(name)!==key(fixedName))errors.push('Фиксированный состав Combination изменён; закрепите новую последовательность.');
 const parentsLearned=steps.every(s=>s.skill.learned!==false&&learnedMeleeSkills(actor).some(e=>key(e.name)===key(s.skill.name)));
 const matching=parentsLearned?readCombatTechniqueSkills(actor).filter(e=>[e.name,e.originalName].some(n=>key(n)===key(name))&&techniqueLearned(e)):[];
 // MA80's point schedule uniquely determines the common improvement. A single
 // imported numeric level is NOT interpreted as three different split levels.
 let learned=null,improvement=0;
 for(const e of matching){const points=Number(e.points),gain=Number.isInteger(points)&&points>=steps.length+2?points-steps.length-1:null;
  if(gain!==null&&gain>improvement){learned=e;improvement=gain;}}
 const qualifies=steps.map(s=>cinematicTraining(actor,s.skill,s.attack,s.masteryContext));
 const cinematic=qualifies.every(Boolean);
 if(steps.length===3&&!cinematic&&!(learned&&Number(learned.points)>=5))errors.push('Реалистичная трёхударная Combination требует изучения минимум за 5 points (MA80).');
 const twoHands=steps.some(s=>s.hand==='main'&&s.hands===1)&&steps.some(s=>s.hand==='off'&&s.hands===1);
 const ordinary=steps.length===2?(twoHands?-4:-6):(twoHands?-9:-12),defaultModifiers=qualifies.map(q=>q?Math.floor(ordinary/2):ordinary);
 const maximumImprovement=Math.min(...defaultModifiers.map(p=>-p));
 improvement=Math.min(maximumImprovement,improvement);
 const defaultModifier=defaultModifiers.every(p=>p===defaultModifiers[0])?defaultModifiers[0]:null;
 return {version:1,kind:'combination',name,available:!errors.length,errors,sources:['MA80–81','MA127'],learned:!!learned,
  points:learned?Number(learned.points):0,defaultModifier,defaultModifiers,maximumImprovement,improvement,modifier:defaultModifier===null?null:defaultModifier+improvement,cinematic,cinematicByStep:qualifies,twoHands,
  steps:steps.map((s,i)=>({attackKey:s.attack.key,skill:s.skill.name,attackName:s.attackName,targetKey:s.targetKey,hand:s.hand,
   defaultModifier:defaultModifiers[i],modifier:defaultModifiers[i]+improvement,baseTechniqueLevel:s.effectiveSkill,level:s.effectiveSkill+defaultModifiers[i]+improvement+offHandAttackPenalty(actor,s.attack,s.skill,s.hand),
   offHandPenalty:offHandAttackPenalty(actor,s.attack,s.skill,s.hand)}))};
}

let queue=Promise.resolve();
export function withMeleeTechniqueExecution(operation){
 const run=queue.catch(()=>{}).then(operation);queue=run.catch(()=>{});return run;
}
export function addSequenceChannel(calculation,id,value,metadata){
 const result=structuredClone(calculation);
 result.channels.push({id,label:id,kind:'learned-technique',baseValue:value,resolvedValue:value,source:id,resolver:id,explanation:id+' '+value,roll:true,appliedRules:[id]});
 result.modifiers.push({channel:id,label:id,value,baseValue:value,resolvedValue:value,source:id,resolver:id});
 if(value)result.rollModifiers.push({channel:id,value,label:id,source:id});
 result.uncappedSkill+=value;
 const caps=result.metadata.meleeCaps??[],maximum=Math.min(Infinity,...caps.map(c=>Number(c.maximum)).filter(Number.isFinite));
 result.effectiveSkill=Math.min(maximum,result.uncappedSkill);result.capAdjustment=result.effectiveSkill-result.uncappedSkill;
 result.modifiers=result.modifiers.filter(m=>m.channel!=='cap');
 if(result.capAdjustment)result.modifiers.push({channel:'cap',label:'Предел навыка',value:result.capAdjustment,source:'cap'});
 result.activeRules.push({id,kind:'learned-technique',activation:'sequence'});result.metadata.meleeSequence=structuredClone(metadata);return result;
}
