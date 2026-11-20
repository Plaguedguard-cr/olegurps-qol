import { finiteLevel } from './combat-technique-data.js';
import { allowsCinematicTechniqueDefaults } from './combat-technique-preference.js';
import { cinematicTraining, findTechniqueLevel, hasCombatTrait, learnedMeleeSkills, meleeSkillFamily,
 readMeleePosture, techniqueIdentity } from './melee-penalty-techniques.js';
import { unarmedBonus } from './combat-technique-unarmed.js';
import { collisionDice } from './fall-collision-rules.js';
import { adaptedTechniqueDefault, armorFamiliarity, readCombatPerks, techniqueMastery } from './ma-combat-perks.js';

const key=techniqueIdentity;
const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const unarmedSkills=new Set(['boxing','brawling','karate','judo','sumo wrestling','wrestling']);
const weaponSkills=new Set(['axe/mace','broadsword','cloak','flail','force sword','force whip','garrote','jitte/sai','knife','kusari','lance','main-gauche','monowire whip','rapier','saber','shield','shortsword','smallsword','spear','staff','tonfa','two-handed axe/mace','two-handed flail','two-handed sword','whip']);
const lying=['prone','supine'];
const grounded=[...lying,'crawling'];
const low=['leg','foot','groin'];
const high=['skull','eye','face','neck'];
const horizontalBlocked=['elbowDrop','elbowStrike','kneeDrop','kneeStrike','twoHandedPunch','uppercut'];
const headExposure=['stamp','uppercut','axe','drop','head','rearElbow','knee'];
const bodyPart={
 hand:'Свободная пустая рука',hands:'Две свободные пустые руки',finger:'Свободные пальцы для удара',
 foot:'Свободная пригодная нога',feet:'Две свободные пригодные ноги',
 elbow:'Свободный локоть для удара',knee:'Свободное колено для удара',head:'Пригодная для удара голова'
};
const postureOptions=[['','Выберите положение'],['standing','Стоя'],['crouching','На корточках'],
 ['kneeling','На коленях'],['sitting','Сидя'],['crawling','Ползком'],['prone','Лицом вниз'],['supine','Лицом вверх']];

function strikePosture(actor,manual){
 const current=readMeleePosture(actor,manual);
 if(current.source==='gga-posture'&&current.value==='prone'&&manual==='supine')return {...current,value:'supine'};
 return current;
}

function skillOptions(rule,{actor,attack,governingSkill,context={}}){
 const {defaults,part}=rule.strikeProfile;
 const dx=numeric(actor?.system?.attributes?.DX?.value);
 const learned=learnedMeleeSkills(actor);
 const isWeapon=part==='weapon'||part==='underlying'&&!attack?.unarmedRef;
 const physicalSkill=attack?.meleeProfile?.skill??attack?.standaloneRef?.governingSkill??attack?.equipmentRef?.governingSkill;
 const bound=physicalSkill?.resolved&&key(physicalSkill.name)!=='gga'?physicalSkill:governingSkill;
 const weaponId=attack?.standaloneRef?.weaponId??attack?.equipmentRef?.instanceId??null;
 const candidates=learned.flatMap(entry=>{
   const name=entry.name, family=meleeSkillFamily({name});
   if(/\s(?:Art|Sport)$/i.test(name))return [];
   if(isWeapon&&(!weaponSkills.has(family)||key(bound?.name)!==key(name)||bound?.learned===false))return [];
   const adaptation=!isWeapon&&part!=='underlying'&&adaptedTechniqueDefault(actor,rule,name,defaults);
   if(!isWeapon&&!unarmedSkills.has(family)&&!adaptation)return [];
   if(!isWeapon&&part==='underlying'&&!attack?.unarmedRef?.profile?.skills?.some(skill=>key(skill)===family))return [];
   const original=Object.keys(defaults).find(n=>key(n)===family);
   const native=defaults[original]??defaults[isWeapon?'weapon':'unarmed'];
   const applyAdaptation=adaptation&&(!Number.isFinite(native)||adaptation.defaultModifier>native);
   const modifier=applyAdaptation?adaptation.defaultModifier:native;
   if(!Number.isFinite(modifier))return [];
   const level=finiteLevel(entry);
   const skill={name,level,baseLevel:level,dx,learned:true,key:entry.uuid,entry,weaponId};
   const trained=findTechniqueLevel({actor,rule,skill,defaultModifier:modifier,maximum:rule.maximum});
   return [{skill,modifier,trained,adaptation:applyAdaptation?adaptation:null}];
 });
 if(!candidates.length&&!isWeapon&&Number.isFinite(defaults.DX)&&dx>0){
   candidates.push({skill:{name:'DX',level:dx,baseLevel:dx,dx,learned:false},modifier:defaults.DX,trained:null});
 }
 const selected=context.strikeSkills?.[rule.id];
 const defaultFirst=(a,b)=>(b.trained?.level??b.skill.level+b.modifier)-(a.trained?.level??a.skill.level+a.modifier);
 candidates.sort((a,b)=>Number(!!b.trained)-Number(!!a.trained)||defaultFirst(a,b));
 return {candidates,chosen:selected?candidates.find(c=>c.skill.name===selected):candidates.find(c=>c.skill.name===governingSkill?.name)??candidates[0],isWeapon};
}

function underlyingPart(attack){
 const source=attack?.unarmedRef?.profile;
 if(!source)return 'weapon';
 if(source.part==='hand')return 'hand';
 if(source.part==='foot'||source.penalty===-2&&['accessory','claws'].includes(source.part))return 'foot';
 if(source.part==='claws')return 'hand';
 return source.part;
}

function targetZone(context){
 const keys=(context.targetLocationKeys??[]).filter(Boolean).map(key);
 return ['skull','eye','face','neck','foot','leg','groin','arm','hand','vitals','torso','silhouette'].find(zone=>
  keys.some(value=>value===zone||new RegExp('(?:^|[ -])'+zone+'(?:s|$)').test(value)))??null;
}

function validPart(actor,part,id,context){
 const lacks=trait=>hasCombatTrait(actor,trait);
 if(horizontalBlocked.includes(id)&&lacks('Horizontal'))return 'Анатомия Horizontal исключает этот удар (MA115).';
 if(lacks('No Manipulators')&&!['head','weapon','teeth','striker'].includes(part))return 'No Manipulators исключает эту ударную конечность (MA116).';
 if(['hands','hand','finger','elbow'].includes(part)&&lacks('No Arms'))return 'У персонажа нет рук.';
 if(part==='finger'&&lacks('No Fine Manipulators'))return 'Нет подходящих пальцев (MA116).';
 const legless=lacks('No Legs')||lacks('Legless')||lacks('Lame (Legless)');
 if(legless&&(['foot','feet','knee'].includes(part)||id==='elbowDrop'))return 'Legless исключает этот удар (MA116).';
 if(part==='feet'&&(lacks('Missing Legs')||lacks('Lame (Missing Legs)')))return 'Для удара нужны две пригодные ноги (MA116).';
 if(part==='head'&&lacks('No Head'))return 'У персонажа нет головы.';
 if(bodyPart[part]&&context.strikeLimbConfirmed!==true)return 'Подтвердите доступную ударную часть тела.';
 return null;
}

function byPosture({id,procedure,part,posture,target,zone}){
 const standing=target==='standing';
 const attackStanding=posture==='standing'||posture==='crouching';
 const kick=['foot','feet'].includes(part);
 const aerial=['jump','flying','pole','slam'].includes(procedure);
 const head=high.includes(zone);
 const leg=low.includes(zone);
 const specific=zone&&zone!=='silhouette';
 const forbid=reason=>({reason,accuracy:0,damage:0});
 const down=grounded.includes(target);
 let accuracy=0,damage=0;
 if(posture==='kneeling'&&(kick||['kneeDrop','kneeStrike'].includes(id)))return forbid('С колен этот удар недоступен (MA99).');
 if(posture==='crawling'&&(kick||['elbowDrop','kneeDrop','twoHandedPunch'].includes(id)))return forbid('Ползком этот удар недоступен (MA99).');
 if(posture==='prone'&&kick)return forbid('Лицом вниз этот удар ногой недоступен (MA99).');
 if((lying.includes(posture)||posture==='sitting')&&(aerial||['elbowDrop','kneeDrop'].includes(id)&&posture!=='sitting'||id==='kneeDrop'))return forbid('Этот удар недоступен из текущего положения (MA99).');
 if(id==='elbowDrop'){
  if(!attackStanding&&posture!=='kneeling')return forbid('Для Elbow Drop нужно стоять или быть на коленях (MA99).');
  if(!(posture==='kneeling'?down:['kneeling','sitting',...lying].includes(target)))return forbid('Положение цели не подходит для Elbow Drop (MA70, MA99).');
  if(posture==='kneeling')damage--;
 }
 if(id==='kneeDrop'&&(!attackStanding||!lying.includes(target)))return forbid('Для Knee Drop нужно стоять, цель должна лежать (MA76).');
 if(id==='uppercut'&&!standing)return forbid('Uppercut требует стоящую цель (MA81).');
 if(attackStanding&&lying.includes(target)){
  if(['elbowStrike','kneeStrike','headButt'].includes(id))return forbid('Сверху до лежащей цели этим ударом не дотянуться (MA99).');
  if(['hand','hands','finger'].includes(part))accuracy-=2;
 }
 if(standing&&head&&(posture==='sitting'||posture==='crawling')&&id==='elbowStrike')return forbid('Из этого положения локоть не достаёт до головы стоящей цели (MA99).');
 if(id==='elbowStrike'&&posture==='crawling')accuracy--;
 if(lying.includes(posture)){
  if(head&&!down&&['elbowStrike','headButt','kneeStrike'].includes(id))return forbid('С земли этот удар не достаёт до головы цели выше положения ползком (MA99).');
  if(standing&&['elbowStrike','headButt','kneeStrike'].includes(id)&&posture==='prone'&&zone!=='foot')return forbid('Лицом вниз этой техникой до стоящей цели можно достать только по стопе (MA99).');
  if(standing&&['elbowStrike','headButt'].includes(id)&&posture==='supine'&&!['foot','leg'].includes(zone))return forbid('Лёжа на спине можно достать только до ног или стоп стоящей цели (MA99).');
  if(standing&&!leg&&['knee','uppercut','hardSurface','ear','eyePoke','eyePluck','eyeRake','lethalEye','lethalHand','twoHands'].includes(procedure))return forbid('Лёжа удар не достаёт выше паха стоящей цели (MA99).');
  if(posture==='supine'&&kick&&procedure!=='stamp'&&procedure!=='axe'){accuracy+=2;damage--;}
 }
 if(id==='headButt'){
  if(attackStanding&&!standing||posture==='kneeling'&&down)accuracy-=2;
  if(standing&&['kneeling','crawling','sitting','prone','supine'].includes(posture)&&!leg)return forbid('Из этого положения Head Butt достаёт только до нижних зон стоящей цели (MA99).');
 }
 if(id==='kneeStrike'&&posture==='crawling'&&!lying.includes(target)&&!(target==='sitting'&&['leg','foot'].includes(zone))&&!(standing&&zone==='foot'))return forbid('Эта зона вне досягаемости Knee Strike ползком (MA99).');
 if(id==='stampKick'&&!down&&!(standing&&['foot','leg'].includes(zone)))return forbid('Stamp Kick применим к лежащей/ползущей цели или стопе/ноге стоящей цели.');
 if((procedure==='stamp'||procedure==='axe')&&!attackStanding&&posture!=='kneeling'){
  if(!down&&!(standing&&zone==='foot'))return forbid('Из этого положения удар сверху достаёт только до стопы стоящей цели или цели на земле (MA99).');
  damage--;
 }else if(posture==='sitting'&&(kick||id==='kneeStrike')){accuracy--;damage--;}
 if(attackStanding&&specific&&(head&&['kneeling','sitting'].includes(target)||standing&&kick&&['leg','foot'].includes(zone)))accuracy++;
 if(standing&&['kneeling','sitting','crawling',...lying].includes(posture)&&specific){
  const shift=['kneeling','sitting'].includes(posture)?1:2;
  if(head)accuracy-=shift;
  if(leg&&(shift===1||zone!=='groin'))accuracy+=shift;
 }
 return {reason:null,accuracy,damage};
}

export function strikeReachValues(value){
 const raw=String(value??'');
 const values=[...raw.matchAll(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?/g)].flatMap(match=>{
  const start=Number(match[1]),end=Number(match[2]);
  return Number.isInteger(start)&&Number.isInteger(end)&&end>start&&end-start<=30?Array.from({length:end-start+1},(_,i)=>start+i):[start];
 });
 if(/(?:^|[,\s])C(?:$|[,\s])/i.test(raw))values.unshift(0);
 return values;
}

function damageAdjustment(floor,perDie=0,offset=0,divisor=1){return {floor,perDie,offset,divisor};}

export function evaluateMeleeStrike(rule,options){
 const {actor,attack={},context={}}=options;
 const spec=rule.strikeProfile,{procedure}=spec;
 const {candidates,chosen,isWeapon}=skillOptions(rule,options);
 const chosenSkills=candidates.map(c=>({name:c.skill.name,learned:!!c.trained}));
 const result={id:rule.id,name:rule.name,operation:rule.operation,sources:rule.sources,notes:[],
  learnedApplicable:candidates.some(c=>c.trained),strikeSkills:chosenSkills,strikeSkill:chosen?.skill.name??null};
 const fail=reason=>({...result,available:false,reason});
 if(!chosen)return fail('Нужен подходящий изученный навык для этого способа атаки.');
 const {skill,modifier:initial,trained}=chosen;
 const cinematicAllowed=context.cinematicDefaults??allowsCinematicTechniqueDefaults();
 const unusualPole=procedure==='pole'&&readCombatPerks(actor,'Unusual Training').some(perk=>perk.specialization==='pole-vault kick');
 const normalMastery=cinematicTraining(actor,skill,attack,context);
 const mastery=spec.realisticDefault?hasCombatTrait(actor,'Trained by a Master'):unusualPole||normalMastery;
 const learned=!!trained&&(!rule.cinematic||mastery);
 if(rule.cinematic&&!learned&&!spec.realisticDefault&&!cinematicAllowed)return fail('Кинематографический Default отключён в личных настройках.');
 const modifier=learned?trained.modifier:initial;
 const base=skill.level,part=spec.part==='underlying'?underlyingPart(attack):spec.part;
 const underlying=spec.part==='underlying'&&!isWeapon?attack.unarmedRef?.profile:null;
 const projected=!isWeapon&&(spec.damage!=null||procedure==='slam'||!!underlying?.damage);
 const pursuit=options.allOutAttack?'out':options.committedAttack?'committed':options.moveAndAttack?'move':options.defensiveAttack?'defensive':'attack';
 const preview=options.previewStrike===true;
 let reach=spec.reach??(isWeapon||underlying||!projected?attack.meleeProfile?.reach??attack.reach:'C');
 let damage=spec.damage??underlying?.damage??null,flat=0,adjustment=null,accuracy=0,targetParry=0,postureAfter=null,recovery=null;
 let bodyInjury=null,damageMultiplier=1,defense=null,rangeLimit=null;
 let grapple=null,waiveLocationPenalty=false,targetDefenseModifier=0,wrap=false,cinematicLanding=false;
 const notes=result.notes;
 const target=context.strikeTarget??{};
 const postureInfo=strikePosture(actor,context.posture),posture=postureInfo.value??'standing';
 const targetPosture=target.posture??context.strikeTargetPosture??null;
 const zone=spec.fixedLocation??targetZone(context);
 const knownReach=strikeReachValues(reach);
 if(isWeapon){
  if(attack.unarmedRef||attack.readinessReason||attack.meleeProfile?.utExotic?.instructionOnly)return fail('Нужна готовая физическая атака оружием.');
  const motion=attack.meleeProfile?.motion??(/^sw/i.test(attack.damage)?'swing':/^thr/i.test(attack.damage)?'thrust':null);
  const required=spec.motion??(procedure==='whirlwind'?'swing':null);
  if(required&&motion!==required)return fail('Выберите режим оружия с движением '+required+'.');
  if(procedure==='spring'&&!/\b(?:cr|imp|cut|pi[+-]*|burn|cor)\b/i.test(attack.damage))return fail('Для Springing Attack нужен удар оружием с обычным Damage.');
  if(!preview&&procedure==='return'&&context.strikeWeaponConfirmed!==true)return fail('Подтвердите гибкое ударное оружие с подходящим хватом.');
  if(!preview&&procedure==='spin'&&context.strikeWeaponConfirmed!==true)return fail('Подтвердите, что этим оружием можно нанести удар с разворота.');
  if(!knownReach.length)return fail('Дальность выбранной атаки оружия неизвестна.');
 }else if(attack?.unarmedRef==null)return fail('Выберите безоружный профиль в списке оружия.');
 const anatomy=validPart(actor,part,rule.id,preview?{...context,strikeLimbConfirmed:true}:context);
 if(anatomy)return fail(anatomy);
 if(spec.maneuver==='power'&&!['out','committed'].includes(pursuit)||spec.maneuver==='out'&&pursuit!=='out'||spec.maneuver==='move'&&pursuit!=='move'){
  if(!preview)return fail('Выберите '+({power:'Committed Attack или All-Out Attack',out:'All-Out Attack',move:'Move and Attack'})[spec.maneuver]+'.');
 }
 if(!preview&&spec.maneuver&&options.allOutAttack&&options.allOutAttackMode==='double')return fail('Техника заменяет манёвр целиком и не даёт второй атаки от Double.');
 if(!preview&&headExposure.includes(procedure)&&!targetPosture)return fail('Укажите положение цели.');
 const postureEffects=byPosture({id:rule.id,procedure,part,posture,target:targetPosture,zone});
 if(!preview&&postureEffects.reason)return fail(postureEffects.reason);
 accuracy+=postureEffects.accuracy;
 flat+=postureEffects.damage;
 if(spec.maneuver){
  defense=pursuit==='out'?{none:true}:pursuit==='committed'?{modifier:-2,retreat:false}:{modifier:-2,retreat:false};
 }
 const isLeg=part==='foot'||part==='feet';
 if(isLeg&&!['drop','slam','spin','flying','pole','jump','stamp'].includes(procedure))recovery={when:['miss'],dx:0};
 const distance=numeric(context.strikeDistance??target.distance);
 const movement=numeric(context.strikeMovement);
 const ownSM=numeric(actor?.system?.additionalresources?.bodyplanSM??actor?.system?.attributes?.SM?.value??actor?.system?.SM)??numeric(context.strikeOwnSM);
 const targetSM=numeric(target.sm??context.strikeTargetSM);
 const relativeSM=ownSM!==null&&targetSM!==null?targetSM-ownSM:null;
 const boots=attack?.unarmedRef?.id==='boots'||context.strikeFootwear==='boots';
 switch(procedure){
  case 'axe':{
   if(high.includes(zone)&&!preview&&(relativeSM===null||relativeSM>=1&&targetPosture==='standing'||relativeSM>=2&&!grounded.includes(targetPosture)))return fail('Проверьте разницу SM и положение цели для удара в голову.');
   if(zone==='foot'){
    damage='thr+1 cr';reach='C';recovery={when:['miss'],dx:0,offBalance:true};
   }else adjustment=pursuit==='out'?damageAdjustment(2,1):damageAdjustment(1,1,0,2);
   if(defense&&!defense.none)defense.dodge=false;
   notes.push('При успехе Attack последующие Parry цели -1 до её хода. Если только Retreat спасает цель, перенесите попадание ниже (MA67).');
   break;
  }
  case 'slam':{
   const hp=numeric(actor?.system?.HP?.max??actor?.system?.HP?.value),closing=numeric(context.strikeClosing);
   if(!preview&&(movement===null||movement<1||closing===null||closing<0||hp===null||hp<=0))return fail('Для Drop Kick нужны HP, разбег от одного ярда и встречное перемещение цели (0, если его не было).');
   if(hp>0&&movement>=1&&closing>=0)damage=collisionDice(hp,movement+closing).dice+' cr';
   flat+=boots?3:2;
   defense={dodge:false,retreat:false,ground:true};
   postureAfter='prone';
   cinematicLanding=cinematicAllowed&&context.strikeDropAcrobatics===true;
   notes.push('Ответный урон столкновения и сравнение повреждений разрешаются по B371.');
   break;
  }
  case 'ear':notes.push('После неудачной защиты: Quick Contest Ear Clap против HT. Два попадания по одной цели дают один Contest и Deafness вместо временного оглушения/Hard of Hearing (MA70).');break;
  case 'drop':
   adjustment=pursuit==='out'?rule.id==='elbowDrop'?damageAdjustment(3,2,-1):damageAdjustment(3,1,1):damageAdjustment(2,1);
   targetParry=-2;postureAfter=rule.id==='elbowDrop'?'supine':'kneeling';
   bodyInjury={when:['miss','shield'],zone:rule.id==='elbowDrop'?'arm':'leg',mode:'full'};
   notes.push('Для Parry вес атаки равен ST атакующего (B376). При промахе или блоке щитом примените тот же Damage к атакующему.');
   break;
  case 'rearElbow':
   if(!preview&&context.strikeRear!==true)return fail('Elbow Strike требует цель сзади в ближнем бою.');
   if(options.allOutAttackMode==='long')return fail('Elbow Strike исключает All-Out Attack (Long).');
   if(options.hitLocationBasePenalty<0)accuracy--;
   bodyInjury={zone:'arm',mode:'hurtingYourself',divisor:10,threshold:3};
   break;
  case 'hardSurface':
  case 'lethalHand':
  case 'lethalFoot':
   if(!preview&&procedure==='lethalHand'&&!['bare','fingered'].includes(context.strikeHandwear))return fail('Выберите открытую кисть или перчатку с отдельными пальцами.');
   if(!preview&&procedure==='lethalFoot'&&!['bare','pointed'].includes(context.strikeFootwear))return fail('Нужна открытая стопа или разрешённая GM остроконечная обувь.');
   bodyInjury={zone:isLeg?'foot':'hand',mode:'hurtingYourself',threshold:1};
   break;
  case 'eyePoke':
  case 'eyePluck':
  case 'eyeRake':
  case 'lethalEye':
   if(spec.fixedLocation==='eye'&&target.hasEyes===false)return fail('У цели нет доступного глаза.');
   if(procedure==='eyePluck'&&!preview&&relativeSM===null)return fail('Укажите SM атакующего и цели.');
   if(procedure==='eyePoke'||procedure==='eyePluck')bodyInjury={zone:'hand',mode:'hurtingYourself',threshold:1};
   notes.push('После неудачной защиты цель проверяет Will. Провал даёт -1 к атакам и защитам до конца следующего хода (MA72).');
   if(procedure==='eyePluck'&&relativeSM>=5)notes.push('Из-за разницы SM последствия и Damage по Eye-Poke.');
   break;
  case 'head':
   flat+=(skill.name==='DX'?-1:0)+(context.strikeHelmet===true?1:0);
   bodyInjury={zone:'skull',mode:'hurtingYourself',threshold:3,armor:true};
   notes.push('Ранение от Parry относится к лицу. При Hurting Yourself действует DR черепа и жёсткого шлема (MA74).');
   break;
  case 'jump':{
   if(pursuit==='out'){
    const move=numeric(context.strikeMove??actor?.system?.currentmove??actor?.system?.basicmove?.value);
    if(!preview&&(move===null||movement===null||movement<Math.max(2,Math.floor(move/2))))return fail('Для All-Out Jump Kick укажите разбег не меньше половины Move, минимум 2 ярда.');
    targetParry=-2;adjustment=damageAdjustment(2,1);recovery={when:['miss','defended'],dx:-4,acrobatics:-2};
   }else{
    if(!preview&&context.strikeTwoSteps!==true)return fail('Для Committed Jump Kick нужны два шага в сторону цели.');
    reach='C, 1, 2';adjustment=damageAdjustment(1,1,0,2);recovery={when:['miss'],dx:0};
    if(defense)defense.dodge=false;
   }
   break;
  }
  case 'push':
   if(!preview&&!['silhouette','torso','leg','skull','face','neck'].includes(zone))return fail('Push Kick допускает корпус, ногу, череп, лицо или шею.');
   damageMultiplier=2;
   notes.push('Удвоенный результат используется только для Knockback. Равновесие: DX-2 при толчке в ногу, DX-3 при толчке в голову/шею (MA78).');
   break;
  case 'return':{
   wrap=context.closeCombat===true;
   const valid=knownReach.filter(value=>value>=1).map(value=>value-1).filter(value=>value>0||wrap);
   if(!preview&&(!valid.length||distance===null||!valid.includes(distance)||distance===0&&!wrap))return fail('Return Strike требует рабочий Reach на ярд дальше цели. Для дистанции C используйте Close Combat.');
   rangeLimit=valid.length?Math.max(...valid):null;reach=valid.map(d=>d===0?'C':d).join(', ');
   notes.push('Только DR спины. Если цель знает приём, примените защиту от удара сбоку; иначе правила атаки сзади. При wrap shot промах или Dodge могут задеть атакующего (MA78, B392).');
   break;
  }
  case 'spin':
   if(!preview&&!target.actorId&&numeric(context.strikeOpponentLevel)===null)return fail('Выберите цель для Quick Contest или задайте её лучший боевой навык.');
   if(pursuit==='out'){accuracy-=2;adjustment=damageAdjustment(2,1);}
   if(defense&&!defense.none)defense={modifier:-3,retreat:false,...(isLeg?{dodge:false}:{usedParry:false})};
   if(isLeg)recovery={when:['miss','defended'],dx:-2};
   break;
  case 'stamp':recovery={when:['miss'],dx:0,offBalance:true};break;
  case 'twoHands':
   adjustment=damageAdjustment(1,1);bodyInjury={zone:'both hands',mode:'hurtingYourself',threshold:3};
   notes.push('Ранение от Parry получает каждая рука полностью. До следующего хода доступен один Cross Parry (MA81, MA121).');
   break;
  case 'uppercut':
   if(!preview&&zone==='foot'||!preview&&!['silhouette','torso','arm',...high].includes(zone)&&!(relativeSM>0))return fail('Ограничение зон Uppercut зависит от относительного SM цели (MA81).');
   break;
  case 'flying':
   if(!preview&&(movement===null||movement<=0||numeric(context.strikeLeap)===null||numeric(context.strikeLeap)<=0))return fail('Укажите разбег и длину прыжка.');
   if(!preview&&(options.rapidStrikePenalty||options.allOutAttackMode==='double'||context.combination))return fail('Flying Jump Kick / Flying Lunge занимает весь манёвр.');
   if(!preview){
    const jumping=learnedMeleeSkills(actor).filter(e=>key(e.name)==='jumping').map(finiteLevel).sort((a,b)=>b-a)[0]??0;
    const move=numeric(actor?.system?.basicmove?.value??actor?.system?.basicmove);
    const groundMove=Math.max(move??0,Math.floor(jumping/2));
    const enhanced=hasCombatTrait(actor,'Enhanced Move (Ground)');
    const superJump=hasCombatTrait(actor,'Super Jump');
    const hardLimit=enhanced||superJump?numeric(context.strikeMaximumJump):runningBroadJump(groundMove,movement);
    if(hardLimit===null||hardLimit<=0||numeric(context.strikeLeap)>hardLimit)return fail('Длина прыжка превышает предел B352 или этот предел не подтверждён.');
   }
   adjustment=damageAdjustment(2,1);targetParry=-2;
   defense={modifier:-2,retreat:false,...(isLeg?{dodge:false}:{usedParry:false})};
   recovery={when:['miss','defended','failedLeap'],dx:-8,acrobatics:-4,collision:true};
   break;
  case 'pole':
   if(!learnedMeleeSkills(actor).some(e=>key(e.name)==='jumping'))return fail('Нужен изученный Jumping.');
   if(!preview&&(!context.strikePole||!context.strikeTwoSteps||hasCombatTrait(actor,'No Fine Manipulators')||hasCombatTrait(actor,'No Arms')))return fail('Нужен пригодный шест, две руки и два шага.');
   adjustment=damageAdjustment(3,1,1);targetParry=-2;
   recovery={when:['miss','defended'],dx:-4,acrobatics:-2};
   break;
  case 'spring':
   if(!preview&&context.strikeCrouchedTurn!==true)return fail('Подтвердите полный предыдущий ход на корточках и первый удар после него.');
   adjustment=damageAdjustment(2,1);recovery={when:['miss'],dx:0,criticalFalls:true,defenseOnMiss:-2};
   break;
  case 'whirlwind':
   if(!isWeapon&&!['hand','foot'].includes(part))return fail('Для Whirlwind нужен удар рукой, ногой или мах оружием.');
   if(!preview&&(!context.strikeWhirlwind||!['cw','ccw'].includes(context.strikeDirection)||options.allOutAttackMode==='double'||
      context.combination||options.rapidStrikePenalty||options.attackSlot&&options.attackSlot!=='attack'))return fail('Whirlwind выполняется только отдельной последовательностью по всем соседним противникам.');
   reach='C, 1';
   break;
 }
 if(['knee','uppercut'].includes(procedure)&&['held','front','newHead'].includes(context.strikeGrapple)){
  const sameTurn=context.strikeGrapple==='newHead';
  if(!preview&&sameTurn&&(!options.allOutAttack||options.allOutAttackMode!=='double'||options.rapidStrikePenalty||
      context.combination||options.attackSlot&&options.attackSlot!=='aoa2'))return fail('Удар после захвата головы в этом ходу занимает второй шаг All-Out Attack (Double).');
  const frontal=context.strikeGrapple==='front';
  const strong=sameTurn&&['eye','face','skull'].includes(zone);
  grapple={kind:context.strikeGrapple,sameTurn,frontal,strong,retreat:false,dodge:procedure==='knee'?-2:-1,block:-2,parry:-2,
   sources:procedure==='knee'?['MA76','MA118','MA121']:['MA118','MA121']};
  waiveLocationPenalty=procedure==='knee'&&frontal&&zone==='groin';
  if(waiveLocationPenalty)notes.push('При захвате спереди штраф за пах снят (MA76).');
  if(strong){adjustment=damageAdjustment(2,1);notes.push('Удар в голову после захвата в том же All-Out Attack (Double): Damage как при Strong (MA118).');}
  if(procedure==='knee'){
   targetDefenseModifier=-2;
   notes.push('Цель в захвате защищается с -2 и без Retreat (MA76, MA121).');
  }else notes.push('Цель в захвате: Dodge-1, Block и Parry-2; захваченная конечность не защищает, Retreat и Acrobatic Dodge недоступны (MA121).');
 }
 if(projected&&boots&&['spin','push','flying'].includes(procedure)&&isLeg)flat++;
 if(bodyInjury)notes.push('Самоповреждение зависит от подтверждённых DR/Parry (B379).');
 if(targetParry)notes.push('Parry цели '+targetParry+'.');
 if(postureAfter)notes.push(postureAfter==='kneeling'?'После броска атакующий на коленях.':'После броска атакующий лежит.');
 if(recovery)notes.push('Проверка равновесия: DX'+(recovery.dx||'')+(recovery.acrobatics!=null?' или Acrobatics'+recovery.acrobatics:'')+'.');
 let bonus=spec.bonus!==false?unarmedBonus({...skill,name:canonicalSkill(skill.name)}):0;
 if(underlying)bonus+=underlying.naturalPerDie??0;
 if(procedure==='eyePluck'&&relativeSM>=5)bonus=0;
 if(procedure==='drop'&&meleeSkillFamily(skill)==='wrestling')flat+=base-skill.dx>=2?2:base-skill.dx>=1?1:0;
 if(procedure==='slam'&&meleeSkillFamily(skill)==='sumo wrestling')bonus=base-skill.dx>=2?2:base-skill.dx>=1?1:0;
 if(projected&&hasCombatTrait(actor,'Horizontal')){
  if(procedure==='head')bonus++;
  if(isLeg&&!['stamp','slam'].includes(procedure)&&!(procedure==='axe'&&zone==='foot')&&attack.unarmedRef?.profile?.part!=='claws')bonus--;
 }
 const attackPenalty=projected?base-Number(options.baseSkill??attack.level??base):
  !isWeapon&&procedure==='whirlwind'?-Number(attack.meleeProfile?.unarmed?.technique?.modifier??attack.meleeProfile?.unarmed?.attackPenalty??0):0;
 const rawEncumbrance=projected&&meleeSkillFamily(skill)==='karate'?Number(Object.values(actor?.system?.encumbrance??{}).find(e=>e.current)?.level??0):0;
 const armor=armorFamiliarity(actor,skill.name,rawEncumbrance),encumbrance=rawEncumbrance-armor;
 const masteryPerk=techniqueMastery(actor,rule,skill,rule.maximum);
 const perks=[chosen.adaptation,masteryPerk,armor?{name:'Armor Familiarity',modifier:armor,source:'MA49'}:null,
  unusualPole&&learned&&!normalMastery?{name:'Unusual Training',source:'MA52; MA87',condition:'pole-vault-kick'}:null].filter(Boolean);
 return {...result,available:true,reason:null,governingSkill:skill.name,governingSkillLevel:base,defaultModifier:initial,
  defaultLevel:base+initial,maximum:base+(masteryPerk?.maximum??rule.maximum),learned,learnedLevel:trained?.level??null,modifier,originalModifier:initial,...(perks.length?{perks}:{}),
  level:base+modifier,entry:learned?trained.entry:null,reach,damageFlat:0,damageType:null,cap:null,posture:{value:posture},
  strike:{part,projected,isWeapon,procedure,damage,reach,flat,adjustment,bonusPerDie:bonus,attackPenalty:attackPenalty-encumbrance+accuracy,
    damageMultiplier,rangeLimit,motion:isWeapon?spec.motion??attack.meleeProfile?.motion:null,fixedLocation:spec.fixedLocation??null,
    target,zone,postureAfter,recovery,bodyInjury,defense,targetParry,targetDefenseModifier,grapple,waiveLocationPenalty,wrap,replaceManeuver:!!spec.maneuver,
    actorHP:numeric(actor?.system?.HP?.max),cinematicLanding,targetPosture,
    standardPosture:{value:['crawling','prone','supine'].includes(posture)?-4:['kneeling','sitting','seated'].includes(posture)?-2:0,source:postureInfo.source},
    maneuver:pursuit,accuracy,specialAccuracy:accuracy-postureEffects.accuracy,skillLevel:base+modifier+(procedure==='spin'&&pursuit==='out'?-2:0),distance,movement,
    closing:numeric(context.strikeClosing),leap:numeric(context.strikeLeap),relativeSM,opponentLevel:numeric(context.strikeOpponentLevel),
    offBalance:recovery?.offBalance===true}};
}

function canonicalSkill(name){
 const family=meleeSkillFamily({name});
 return ['Brawling','Boxing','Karate'].find(value=>key(value)===family)??name;
}

export function strikeTechniqueFields(rules,{actor,attack,context={},hasTarget=false,attackSlot}){
 const fields=new Map();
 const add=(name,label,type='check',choices)=>fields.set(name,{name,label,type,choices});
 const selector=(name,label,choices)=>add(name,label,'select',[['','Выберите'],...choices]);
 const number=(name,label)=>add(name,label,'number');
 const unarmed=rules.map(rule=>rule.strikeProfile.part==='underlying'?underlyingPart(attack):rule.strikeProfile.part).filter(part=>bodyPart[part]);
 if(unarmed.length)add('strikeLimbConfirmed',[...new Set(unarmed.map(part=>bodyPart[part]))].join(' / '));
 const procedures=new Set(rules.map(rule=>rule.strikeProfile.procedure));
 const knownPosture=readMeleePosture(actor);
 if(unarmed.length&&knownPosture.source!=='gga-posture')add('posture','Положение атакующего','select',postureOptions);
 if(unarmed.length&&knownPosture.source==='gga-posture'&&knownPosture.value==='prone')add('posture','Положение лёжа','select',[['','Лицом вниз'],['supine','Лицом вверх']]);
 if([...procedures].some(p=>headExposure.includes(p))&&!context.strikeTarget?.posture)add('strikeTargetPosture','Положение цели','select',postureOptions);
 if(procedures.has('rearElbow'))add('strikeRear','Цель позади');
 if(procedures.has('knee')||procedures.has('uppercut'))add('strikeGrapple','Захват цели','select',[
  ['','Без захвата'],['held','Цель уже в моём захвате'],...(procedures.has('knee')?[['front','Цель в моём захвате спереди']]:[]),
  ['newHead','Голова захвачена в этом ходу']
 ]);
 if(procedures.has('head'))add('strikeHelmet','Жёсткий шлем');
 if(procedures.has('ear')&&attackSlot&&attackSlot!=='attack')add('strikeTwoEars','Хлопок по обоим ушам. Обе руки свободны.');
 const zone=targetZone(context);
 if(procedures.has('eyePluck')||procedures.has('axe')&&high.includes(zone)||
    procedures.has('uppercut')&&zone&&!['silhouette','torso','arm','foot',...high].includes(zone)){
  if(numeric(context.strikeTarget?.sm)===null)number('strikeTargetSM','SM цели');
  if(numeric(actor?.system?.attributes?.SM?.value??actor?.system?.SM)===null)number('strikeOwnSM','SM атакующего');
 }
 if(procedures.has('lethalHand'))selector('strikeHandwear','Кисть',[['bare','Без перчатки'],['fingered','Перчатка с пальцами'],['closed','Варежка / боксёрская перчатка']]);
 if(procedures.has('lethalFoot'))selector('strikeFootwear','Стопа',[['bare','Босиком / открытая'],['pointed','Остроконечная обувь, разрешённая GM'],['boots','Закрытая обувь']]);
 if(procedures.has('slam')){
  selector('strikeFootwear','Обувь',[['bare','Обычная / босиком'],['boots','Тяжёлые ботинки']]);
  number('strikeClosing','Встречный ход цели, ярды');
  if(context.cinematicDefaults)add('strikeDropAcrobatics','GM допускает приземление с Acrobatics-5');
 }
 if(['slam','jump','flying'].some(p=>procedures.has(p)))number('strikeMovement','Движение к цели, ярды');
 if(['jump','pole'].some(p=>procedures.has(p)))add('strikeTwoSteps','Два шага к цели');
 if(procedures.has('pole'))add('strikePole','Шест в двух свободных руках');
 if(procedures.has('flying'))number('strikeLeap','Длина прыжка, ярды');
 if(procedures.has('flying')&&(hasCombatTrait(actor,'Enhanced Move (Ground)')||hasCombatTrait(actor,'Super Jump')))number('strikeMaximumJump','Подтверждённый предел прыжка по B352');
 if(procedures.has('return')){add('strikeWeaponConfirmed','Гибкое оружие для возвратного удара');number('strikeDistance','До цели, ярды');}
 if(procedures.has('spin')&&rules.some(r=>r.id==='spinningStrike'))add('strikeWeaponConfirmed','Оружие позволяет удар с разворота');
 if(procedures.has('spin')){
  number('strikeOpponentLevel','Лучший боевой навык цели');
  if(!context.strikeTarget?.owned)number('strikeOpponentMargin','Результат цели в Contest (запас броска)');
 }
 if(procedures.has('spring'))add('strikeCrouchedTurn','Полный предыдущий ход на корточках. Это первый удар.');
 if(procedures.has('whirlwind')){
  selector('strikeDirection','Направление',[['cw','По часовой'],['ccw','Против часовой']]);
  if(!hasTarget)add('strikeFoes','Противники по порядку, через ;','text');
  add('strikeWhirlwind','Все противники в пределах ярда. Других действий в этом ходу нет.');
 }
 if(!hasTarget&&['ear','eyePoke','eyeRake','eyePluck','lethalEye','spin','slam'].some(p=>procedures.has(p)))selector('strikeTargetActorId','Цель',(globalThis.game?.actors?.contents??[]).filter(a=>a.visible!==false).map(a=>[a.id,a.name]));
 return [...fields.values()];
}

export function strikeDamageDelta(strike,dice){
 const rule=strike.adjustment;
 return strike.flat+(rule?Math.max(rule.floor,Math.floor(dice*rule.perDie/rule.divisor)+rule.offset):0);
}

export function runningBroadJump(move,run){
 const standing=Math.max(0,2*move-3);
 return Math.min(standing*2,standing+2*run)/3;
}
