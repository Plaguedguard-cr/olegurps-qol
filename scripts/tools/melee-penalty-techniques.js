// MA63–89. Pure read-only evaluators; descriptors live ONLY in combat-technique-registry.
import {readCombatTechniqueSkills,finiteLevel,relativeLevel,objectSkillRows} from './combat-technique-data.js';
import {allowsCinematicTechniqueDefaults} from './combat-technique-preference.js';
import {kickingAdaptation,techniqueMastery,readCombatPerks} from './ma-combat-perks.js';
export const techniqueIdentity=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/[‐‑‒–—−]/g,'-').replace(/\s+/g,' ');
const key=techniqueIdentity,number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
export function techniqueGroups(value){
 const groups=[];let depth=0,start=0;for(const [i,c] of [...String(value??'')].entries()){
  if(c==='('){if(!depth)start=i+1;depth++;}else if(c===')'&&depth&&!--depth)groups.push(String(value).slice(start,i));
 }return groups;
}
export const techniqueLearned=e=>e?.learned===true||Number(e?.points)>0||e?.points==null&&key(e?.type)==='technique';
export function learnedMeleeSkills(actor){return readCombatTechniqueSkills(actor).filter(e=>key(e.type)!=='technique'&&techniqueLearned(e)&&finiteLevel(e)!==null);}
export function hasCombatTrait(actor,name,skill=null,attack=null){
 return objectSkillRows(actor?.system?.ads).some(e=>{
  if(e.disabled===true||e.active===false)return false;
  const base=key(name);
  return [e.name,e.originalName].filter(Boolean).some(value=>{
   const n=key(value),explicit=key(e.specialization??e.specialty??e.skillName);
   if(n===base&&!['weapon master','off-hand weapon training'].includes(base))return true;
   if(n!==base&&!n.startsWith(base+' ('))return false;
   const special=techniqueGroups(n).at(-1)??explicit;
   if(base==='weapon master'){
    const family=meleeSkillFamily(skill);if(!weapons.has(family)||skill?.learned===false)return false;
    if((n===base&&Number(e.points)===45)||['all weapons','all muscle-powered weapons'].includes(special))return true;
    if(['all swords','swords'].includes(special)&&['broadsword','shortsword','two-handed sword','rapier','saber','smallsword','main-gauche'].includes(family))return true;
    if(special==='fencing weapons'&&fencing.has(family))return true;
   }
   return special&&special.split(/\s*(?:,|\band\b|\+)\s*/).some(part=>[skill?.name,attack?.name].filter(Boolean).some(v=>key(v)===part));
  });
 });
}
const anyWeaponMaster=actor=>objectSkillRows(actor?.system?.ads).some(e=>e.disabled!==true&&e.active!==false&&[e.name,e.originalName].some(n=>/^weapon master(?:\s*\(|$)/i.test(String(n??''))));
export const cinematicTraining=(actor,skill,attack,context={})=>hasCombatTrait(actor,'Trained by a Master')||hasCombatTrait(actor,'Weapon Master',skill,attack)||
 context.weaponMasterApplies===true&&skill?.learned!==false&&weapons.has(meleeSkillFamily(skill))&&anyWeaponMaster(actor);
function prerequisiteNames(value){
 if(Array.isArray(value))return value.flatMap(prerequisiteNames);
 if(value&&typeof value==='object')return ['name','skillName','skill','governingSkill','default','prerequisite'].flatMap(k=>prerequisiteNames(value[k]));
 return typeof value==='string'?[value]:[];
}
const combatParent=value=>key(value).replace(/\s+(?:art|sport)$/,'');
function carvingSpecialization(entry,name){
 const groups=techniqueGroups(name);
 const combined=String(groups[0]??'').split(/\s*\/\s*/);
 return entry.techniqueSpecialization??entry.letter??groups[1]??combined[1];
}
export function learnedCarvingLetters({actor,rule,skill}){
 if(!skill || skill.learned===false)return [];
 const letters=new Set();
 for(const entry of readCombatTechniqueSkills(actor)){
  if(!techniqueLearned(entry))continue;
  for(const name of [entry.name,entry.originalName]){
   if(key(name)!=='initial carving'&&!key(name).startsWith('initial carving ('))continue;
   const letter=String(carvingSpecialization(entry,name)??'').trim().toUpperCase();
   if(/^\p{L}$/u.test(letter)&&findTechniqueLevel({actor,rule,skill,specialization:letter}))letters.add(letter);
  }
 }
 return [...letters].sort();
}
export function findTechniqueLevel({actor,rule,skill,specialization=null,defense=null,defaultModifier=rule.defaultModifier,maximum=rule.maximum??0}){
 const base=number(skill?.level);if(base===null)return null;
 maximum=techniqueMastery(actor,rule,skill,maximum,specialization,defense)?.maximum??maximum;
 let best=null;
 for(const entry of readCombatTechniqueSkills(actor)){
  if(!techniqueLearned(entry))continue;
  const names=[entry.name,entry.originalName].filter(Boolean),name=names.find(n=>(rule.aliases??[rule.name]).some(a=>key(n)===key(a)||key(n).startsWith(key(a)+' (')));
  if(!name)continue;
  const groups=techniqueGroups(name);
  const lethalEyeAlias=rule.id==='lethalEyePoke'&&/^(?:targeted attack|ta)\s*\(karate lethal strike\/eye\)$/i.test(key(name));
  const defenseParts=defense?groups.flatMap(part=>part.split(/\s*[:/,]\s*(?=(?:parry|block|dodge)\b)|(?<=\bparry|\bblock|\bdodge)\s*[:/,]\s*/i)):groups;
  if(defense&&!defenseParts.some(part=>key(part)===key(defense))&&key(entry.defense??entry.defenseType)!==key(defense))continue;
  const namedDefenseParent=defenseParts.find(part=>!['dodge','block','parry'].includes(key(part)))??(defense==='Dodge'?'Dodge':null);
  const namedParts=lethalEyeAlias?['Karate']:defense?[namedDefenseParent]:rule.id==='initialCarving'&&String(groups[0]).includes('/')?String(groups[0]).split(/\s*\/\s*/):groups;
  const parents=prerequisiteNames(entry.governingSkill??entry.governingSkillName??entry.skillName??entry.specialty??entry.specialization??entry.prerequisite??entry.prereq??entry.default??entry.defaults??namedParts[0]);
  const parentId=entry.skillUuid??entry.skilluuid??entry.skillId;
  const idMatch=parentId&&[skill?.entry?.uuid,skill?.entry?.originaluuid,skill?.key].includes(parentId);
  const parent=parents.find(p=>key(p)===key(skill.name))??(!rule.specialProfile?parents.find(p=>combatParent(p)===combatParent(skill.name)&&(unarmed.has(combatParent(p))||weapons.has(combatParent(p)))):null);
  if(!idMatch&&!parent)continue;
  if(entry.weaponId&&entry.weaponId!==skill.weaponId)continue;
  const specific=rule.id==='initialCarving'?carvingSpecialization(entry,name):entry.techniqueSpecialization??entry.letter??namedParts[1];
  if(specialization!==null&&key(specific)!==key(specialization))continue;
  const relative=relativeLevel(entry),absolute=finiteLevel(entry);
  const parentBase=parent&&key(parent)!==key(skill.name)?finiteLevel(learnedMeleeSkills(actor).find(e=>key(e.name)===key(parent))):base;
  const raw=relative??(absolute===null||parentBase===null?null:absolute-parentBase);if(raw===null)continue;
  const modifier=Math.max(defaultModifier,Math.min(maximum,raw));
  if(!best||modifier>best.modifier)best={entry,name,level:base+modifier,modifier,rawLevel:absolute,relativeLevel:relative};
 }
 return best;
}
export function readMeleePosture(actor,manual='auto'){
 const known=key(actor?.system?.conditions?.posture);
 const aliases={prone:'prone',lying:'prone','lying prone':'prone',crawl:'crawling',crawling:'crawling',kneel:'kneeling',kneeling:'kneeling',crouch:'crouching',crouching:'crouching',sit:'sitting',sitting:'sitting',supine:'supine','lying face-up':'supine',standing:'standing'};
 if(known&&aliases[known])return {value:aliases[known]==='sitting'&&manual==='seated'?'seated':aliases[known],source:'gga-posture',raw:known};
 const values=['standing','kneeling','crouching','sitting','seated','prone','supine','crawling'];
 return values.includes(manual)?{value:manual,source:'manual'}:{value:null,source:'unknown'};
}
export function evaluateCombatRiding(rule,{actor,governingSkill:skill}={}){
 const entry=learnedMeleeSkills(actor).find(e=>key(e.name)===key(skill?.name)&&/^riding(?:\s*\(|$)/i.test(e.name));
 if(!entry)return {id:rule.id,name:rule.name,available:false,reason:'Нужен изученный Riding с точной специализацией.',sources:rule.sources};
 const base=finiteLevel(entry),trained=findTechniqueLevel({actor,rule,skill:{...skill,level:base}});
 const mastery=techniqueMastery(actor,rule,skill,rule.maximum);
 return {id:rule.id,name:rule.name,available:true,reason:null,operation:'CONTEXT',governingSkill:entry.name,governingSkillLevel:base,
  defaultModifier:0,defaultLevel:base,maximum:base+(mastery?.maximum??4),learned:!!trained,level:trained?.level??base,
  modifier:trained?.modifier??0,sources:rule.sources,...(mastery?{perks:[mastery]}:{})};
}
export function longestMeleeReach(attack){
 const text=String(attack?.meleeProfile?.reach??attack?.reach??attack?.data?.reach??'');
 if(/(?:^|[,\s])C(?:$|[,\s])/i.test(text))return {close:true,longest:0,raw:text};
 const values=[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
 return {close:false,longest:values.length?Math.max(...values):null,raw:text};
}
const unarmed=new Set(['boxing','brawling','karate','judo','wrestling','sumo wrestling']);
const fencing=new Set(['main-gauche','rapier','saber','smallsword']);
const weapons=new Set(['axe/mace','broadsword','cloak','flail','force sword','force whip','garrote','jitte/sai','knife','kusari','lance','main-gauche','monowire whip','net','polearm','rapier','saber','shield','shortsword','smallsword','spear','staff','tonfa','two-handed axe/mace','two-handed flail','two-handed sword','whip']);
export const meleeSkillFamily=skill=>combatParent(key(skill?.name).replace(/\s*\([^()]*\)\s*$/,''));
export const isMeleeTechniqueWeaponSkill=skill=>weapons.has(meleeSkillFamily(skill));
export function meleeAttackUsesHand(attack){
 if(!attack?.unarmedRef)return true;
 const p=attack.unarmedRef.profile;
 return p?.part==='hand'||p?.part==='claws'&&p.penalty!==-2;
}
export function isCleanTechniqueAttack(attack){
 if(attack?.hasMeleeDamageOverride||attack?.meleeManualOverride?.skillLevel!=null)return false;
 const skill=attack?.meleeProfile?.skill;
 return attack?.unarmedRef&&(attack.unarmedRef.native===false||attack.meleeProfile?.unarmed?.alreadyIncluded===false)&&!attack.hasMeleeDamageOverride||
   !!(attack?.standaloneRef&&attack.standaloneRef.governingSkill?.source!=='gga-imported-total')||
   !!(skill?.resolved&&skill?.source&&!/imported|manual/.test(skill.source));
}
export function evaluateMeleePenalty(rule,options={}){
 const {actor,attack={},governingSkill:skill}=options,context={...options.context};
 const cinematicDefaults=context.cinematicDefaults??allowsCinematicTechniqueDefaults();
 const physicalHands=attack.meleeProfile?.strength?.hands??attack.meleeProfile?.hands?.hands;
 if(Number.isInteger(physicalHands))context.weaponHands=physicalHands;
 const family=meleeSkillFamily(skill),base=number(skill?.level),posture=readMeleePosture(actor,context.posture);
 const unavailable=reason=>({id:rule.id,name:rule.name,available:false,reason,sources:rule.sources,operation:rule.operation});
 const defaultSourceKnown=skill?.source==='skill-default'?learnedMeleeSkills(actor).some(e=>key(e.name)===key(skill.sourceName)):
  skill?.source==='attribute-default'&&number(actor?.system?.attributes?.[skill.sourceName]?.value)!==null;
 const defaultParent=skill?.resolved===true&&skill.learned===false&&!!defaultSourceKnown&&!!skill.rule;
 if(base===null||skill?.resolved===false||skill?.learned===false&&!defaultParent||family==='gga')return unavailable('Выберите подтверждённый базовый навык.');
 if(!defaultParent&&!learnedMeleeSkills(actor).some(e=>key(e.name)===key(skill.name)))return unavailable('Базовый навык должен быть изучен либо подтверждён источниковым default у этого Actor.');
 const adaptation=rule.id==='kicking'&&family==='acrobatics'?kickingAdaptation(actor,skill.name):null;
 if(!adaptation&&(!unarmed.has(family)&&!weapons.has(family)||rule.baseGroup==='weapon'&&!weapons.has(family)||rule.baseGroup==='unarmed'&&!unarmed.has(family)||
  Array.isArray(rule.baseSkills)&&!rule.baseSkills.some(n=>key(n)===family)))return unavailable('Базовый навык не подходит этой технике.');
 if(attack.unarmedRef&&!unarmed.has(family)&&!adaptation)return unavailable('Оружейный навык не управляет этой безоружной атакой.');
 const profileParent=attack.meleeProfile?.skill??attack.standaloneRef?.governingSkill;
 if(profileParent?.resolved&&profileParent.name&&key(profileParent.name)!=='gga'&&key(profileParent.name)!==key(skill.name))return unavailable('Управляющий навык не совпадает с выбранным физическим профилем атаки.');
 const isKick=attack.meleeProfile?.attackType==='kick'||attack.unarmedRef?.profile?.penalty===-2;
 const isHand=attack.unarmedRef&&attack.unarmedRef.profile?.part==='hand';
 let initial=rule.defaultModifier,maximum=rule.maximum??0,damageFlat=0,damageType=null,damageReduction=false,reach=null,cap=null,capEvidence=null,notes=[],specialization=null;
 switch(rule.id){
 case 'attackFromAbove':
  if(!context.fromAbove)return unavailable('Нужно явно указать атаку падением сверху (B402).');
  notes.push('Обнаружение: Stealth против Vision; защита предупреждённой цели -2. Падение свыше 2 ярдов – отдельный урон (B402).');break;
 case 'backKick':
  if(!isKick||family!=='karate')return unavailable('Back Kick требует обычный Kick и Karate.');
  if(!context.behindKnown||!context.legsFree)return unavailable('Нужно знать о противнике сзади; ноги должны быть свободны.');
  if(['seated','sitting','supine'].includes(posture.value))return unavailable('Back Kick невозможен из указанного положения (MA99).');
  notes.push('До следующего хода все активные защиты -2.');break;
 case 'backStrike':
  if(unarmed.has(family)||attack.unarmedRef)return unavailable('Back Strike требует оружейный навык.');
  if(!context.behindKnown||!context.legsFree)return unavailable('Нужно знать о противнике сзади; ноги должны быть свободны.');
  if(attack.meleeProfile?.grip==='reversed'){
   if(attack.meleeProfile.motion!=='thrust')return unavailable('Reversed Grip: назад допустим только Thrust остриём (MA112).');
  }else{reach='1';damageReduction=attack.meleeProfile?.motion==='swing'||/^sw/i.test(attack.sourceDamage??attack.damage);notes.push('Reach назад 1; swing Damage уменьшается на 2 либо на 1/куб, если это хуже.');}
  notes.push('До следующего хода все активные защиты -2; штраф Reversed Grip Parry складывается.');break;
 case 'cavalryTraining':{
  if(!context.mounted)return unavailable('Укажите верховую атаку.');
  if(context.mountedStyle==='couched-lance')return unavailable('Для couched Lance нужен отсутствующий расчёт столкновения mount/target (B397); обычный thrust его не заменяет.');
  const riding=learnedMeleeSkills(actor).filter(e=>key(e.name)===key(context.ridingSkill)).sort((a,b)=>finiteLevel(b)-finiteLevel(a))[0];
  if(!riding||!/^riding(?:\s*\(|$)/i.test(riding.name))return unavailable('Выберите изученный Riding с нужной специализацией.');
  const ridingSkill={name:riding.name,level:finiteLevel(riding)};
  if(!options.combatRidingRule)return unavailable('Нет общей записи Combat Riding для расчёта предела.');
  const combat=evaluateCombatRiding(options.combatRidingRule,{actor,governingSkill:ridingSkill});cap=combat.level;capEvidence=combat;
  if(!context.mountAttacked&&!context.fastMount)notes.push('Штрафы атаки mount и высокой скорости отсутствуют; предел Riding / Combat Riding сохраняется.');
  if(context.fastMount)damageFlat=1;
  notes.push('Предел верховой атаки: '+cap+' ('+(combat.learned?'Combat Riding':'Riding')+').');break;
 }
 case 'closeCombat':{
  if(!context.closeCombat)return unavailable('Укажите close combat.');
  if(attack.meleeProfile?.grip==='tip')return unavailable('Tip Grip уже даёт Reach C; штраф Close Combat отсутствует.');
  const r=longestMeleeReach(attack);if(r.close)return unavailable('Оружие уже имеет Reach C.');
  if(![1,2,3].includes(r.longest))return unavailable('Для этого Reach формула Close Combat MA69 не установлена.');
  initial=-4*r.longest;maximum=initial/2;
  damageFlat=(attack.meleeProfile?.motion==='swing'||/^sw/i.test(attack.sourceDamage??attack.damage))?-r.longest:0;
  notes.push('Swing Damage '+damageFlat+' сохраняется независимо от изученного уровня.');break;
 }
 case 'groundFighting':if(!['prone','supine','crawling'].includes(posture.value))return unavailable('Нужно положение лёжа или ползком.');break;
 case 'lowFighting':if(!['kneeling','crouching'].includes(posture.value))return unavailable('Нужно положение на коленях или на корточках.');break;
 case 'fightingWhileSeated':if(posture.value!=='seated')return unavailable('Техника относится к сидению на стуле/опоре; sit GGA не подтверждает опору.');break;
 case 'crack':{
  const kind=context.whipKind??(context.ordinaryWhip?'ordinary':null);
  if(family!=='whip'||!(kind==='ordinary'||kind==='cinematic-like'&&cinematicDefaults))return unavailable('Укажите обычный кнут или Whip-подобный предмет при разрешённых кинематографических Default (MA70).');
  if(kind==='cinematic-like')notes.push('Ремень/верёвка и подобный предмет: явно разрешённое кинематографическое исключение MA70; собственные штрафы предмета сохраняются.');
  damageFlat=2;break;}
 case 'hammerFist':if(!isHand||!['brawling','karate'].includes(family))return unavailable('Нужен обычный Punch с Brawling/Karate.');
  if(attack.hasMeleeDamageOverride||attack.meleeProfile?.unarmed?.alreadyIncluded)return unavailable('Для Hammer Fist выберите явный базовый навык и исходный BS Damage.');
  damageFlat=-1;notes.push('Damage thr-2 + базовый Brawling/Karate bonus; саморанение 1/10, урон от болезненного парирования -1 (MA73).');break;
 case 'kicking':if(!isKick||!['brawling','karate'].includes(family)&&!adaptation)return unavailable('Нужен обычный Kick с подходящим базовым навыком.');
  if(attack.meleeProfile?.unarmed?.alreadyIncluded)return unavailable('Исходный итог GGA Kick неизвестен: выберите явный Brawling/Karate.');break;
 case 'pressurePointStrike':{
  const special=learnedMeleeSkills(actor).find(e=>key(e.name)===key(context.pressureSkill));
  if(!special||!/^pressure (?:points|secrets)(?:\s*\(|$)/i.test(special.name))return unavailable('Нужен изученный Pressure Points или Pressure Secrets.');
  if(/^pressure secrets/i.test(special.name)){
   if(!attack.unarmedRef)return unavailable('Pressure Secrets требует безоружный удар.');
   if(!hasCombatTrait(actor,'Trained by a Master')||!learnedMeleeSkills(actor).some(e=>key(e.name)==='pressure points'&&finiteLevel(e)>=16))return unavailable('Pressure Secrets: нужны TBaM и Pressure Points 16+.');
  }else{
   const groups=techniqueGroups(special.name);
   if(!attack.unarmedRef&&(!groups.length||key(groups[0])!==key(skill.name)||!String(attack.damage).includes(' cr')))return unavailable('Для оружия нужна точная Pressure Points-специализация и crushing Damage.');
   if(attack.unarmedRef&&family!=='karate')return unavailable('Для обычного безоружного Pressure Points требуется Karate.');
  }
  if(!cinematicTraining(actor,skill,attack,context))return unavailable('Для навыка Pressure Points/Secrets нужно подтверждённое кинематографическое преимущество.');
  notes.push(/^pressure secrets/i.test(special.name)?'После попадания нужен отдельный Pressure Secrets roll; удвоение/утроение только при успехе (B215).':'Только после проникновения хотя бы 1 Damage: Quick Contest Pressure Points против HT (B215).');break;
 }
 case 'reverseGrip':
  if(attack.meleeProfile?.grip==='defensive'||attack.meleeProfile?.grip==='tip')return unavailable('Быстрая смена не работает из Defensive/Tip Grip (MA102).');
  if(!context.reversibleWeapon||!context.canThrust)return unavailable('Нужен подтверждённый допускающий Reversed Grip колющий режим.');
  initial=family==='tonfa'?0:context.weaponHands===2?-4:-6;
  notes.push('Нужен отдельный бросок: провал – оружие выпущено и ход завершён; критический провал – также Tip Slash по своему торсу. Новый хват сохраняется до конца хода.');break;
 case 'dualWeaponAttack':
  if(context.rapidStrike||context.combination)return unavailable('DWA, Rapid Strike и Combination заменяют одну и ту же единственную атаку (MA127).');
  if(context.weaponHands!==1||isKick||!meleeAttackUsesHand(attack))return unavailable('Для DWA нужна отдельная свободная рука и одноручная атака.');
  notes.push('Два независимых удара разными руками; off-hand -4 отдельно. Одна цель защищается -1 против обоих ударов (B417).');break;
 case 'initialCarving':
  if(!fencing.has(family))return unavailable('Нужен fencing skill.');
  specialization=String(context.letter??'').trim().toUpperCase();
  if(specialization&&!/^\p{L}$/u.test(specialization))return unavailable('Выберите изученную специализацию на одну букву.');
  if(!/\bcut\b/.test(String(attack.damage))){
   if(!context.carvingTipSlash||!/\bimp\b/.test(String(attack.damage))||!(attack.meleeProfile?.motion==='thrust'||/^thr/i.test(attack.sourceDamage??attack.damage)))return unavailable('Нужен cutting режим либо явно выбранный Tip Slash колющего режима.');
   if(!/^(?:C|[1-9]\d*(?:\.\d+)?)$/i.test(String(context.tipSlashReach??'')))return unavailable('Укажите подтверждённую максимальную Reach текущего хвата для Tip Slash (MA113).');
   reach=String(context.tipSlashReach);damageFlat=-2;damageType='cut';notes.push('Tip Slash: swing-атака с Damage колющего режима -2, тип cut и максимальная Reach текущего хвата (MA113); качество сохраняется.');
  }
  if(!Number.isInteger(context.stroke)||context.stroke<1)return unavailable('Укажите номер движения буквы.');
  if(!Number.isInteger(context.strokeCount)||context.strokeCount<context.stroke)return unavailable('Укажите общее число штрихов.');
  notes.push('Буква примерно 4×4 дюйма; нужна минимум 1 cutting Damage после DR. Промах последующего движения на 1–4 даёт несоединённую линию (MA85).');break;
 }
 const trained=defaultParent||rule.id==='initialCarving'&&!specialization?null:findTechniqueLevel({actor,rule,skill:{...skill,weaponId:attack.standaloneRef?.weaponId??attack.equipmentRef?.instanceId},specialization,defaultModifier:initial,maximum});
 const unusual=rule.id==='dualWeaponAttack'&&context.sameDualWeaponTarget===true&&readCombatPerks(actor,'Unusual Training').some(p=>
   p.specialization==='dual-weapon attack, both attacks must target the same foe');
 const cinema=unusual||cinematicTraining(actor,skill,attack,context),useLearned=!!trained&&(!rule.cinematic||cinema);
 if(trained&&rule.cinematic&&!cinema)notes.push('Изученное кинематографическое улучшение не применено: подходящий TBaM/Weapon Master не подтверждён. Для нераспознанной области существующего WM укажите применимость штатным контролом WM / TBaM.');
 if(rule.cinematic&&!useLearned&&!cinematicDefaults&&rule.id!=='dualWeaponAttack')return unavailable('Кинематографические Default выключены в персональных настройках модуля.');
 let modifier=useLearned?trained.modifier:initial,originalModifier=initial;
 if(rule.id==='initialCarving'&&context.stroke===1)modifier=originalModifier=0;
 if(rule.id==='cavalryTraining'){
  originalModifier=(context.mountAttacked?-2:0)+(context.fastMount?-1:0);
  modifier=(context.mountAttacked?Math.max(-2,modifier):0)+(context.fastMount&&modifier<-1?-1:0);
 }
 if(['groundFighting','lowFighting','fightingWhileSeated'].includes(rule.id))notes.push(rule.id==='groundFighting'?
  'Защита с земли: -3 по Default, -2 при relative -3/-2, -1 при -1/0; применение защиты вручную (MA73).':
  'Защитный штраф уменьшается до -1 при relative -1 и до 0 при full skill; защита применяется вручную.');
 const mastery=techniqueMastery(actor,rule,skill,maximum,specialization);
 const perks=[mastery,adaptation,unusual&&useLearned?{name:'Unusual Training',source:'MA52',condition:'same-target'}:null].filter(Boolean);
 return {id:rule.id,name:rule.name,available:true,reason:null,sources:rule.sources,operation:rule.operation,
  governingSkill:skill.name,governingSkillLevel:base,specialization,defaultModifier:initial,defaultLevel:base+initial,maximum:base+(mastery?.maximum??maximum),...(perks.length?{perks}:{}),
  learned:useLearned,learnedLevel:trained?.level??null,entry:useLearned?trained.entry:null,
  originalModifier,modifier,level:base+modifier,damageFlat,damageType,damageReduction,reach,cap,capEvidence,notes,posture,
  defaultParent,cinematicImprovementSuppressed:!!trained&&!!rule.cinematic&&!cinema};
}

export function normalizeMeleeTechniques(value){
 const v=value&&typeof value==='object'?value:{};
 return {ids:[...new Set(Array.isArray(v.ids)?v.ids.filter(x=>typeof x==='string'):[])],context:structuredClone(v.context??{}),
  ...(v.sequence&&typeof v.sequence==='object'?{sequence:structuredClone(v.sequence)}:{})};
}

export function resolveMeleeTechniquePlan(options,rules){
 const selected=normalizeMeleeTechniques(options.selection),byId=new Map(rules.map(r=>[r.id,r]));
 const results=[],errors=[],channels=[];let damageFlat=0,damageType=null,damageReduction=false,reach=null;const caps=[],externalAdjustments=[];
 const strikes=[];
 let special=null;
 const physicalContext={...selected.context,...options.context},tipSlash=selected.ids.includes('initialCarving')&&physicalContext.carvingTipSlash&&/\bimp\b/.test(String(options.attack?.damage));
 for(const id of selected.ids){
  const rule=byId.get(id);if(rule?.operation==='SEQUENCE')continue;if(!rule?.meleePenalty){errors.push('Эта техника не подключена к атакующему пути: '+id);continue;}
  const projected=tipSlash&&id!=='initialCarving'?{...options.attack,reach:physicalContext.tipSlashReach,meleeProfile:{...options.attack?.meleeProfile,motion:'swing',reach:physicalContext.tipSlashReach}}:options.attack;
  const result=(rule.calculatePenalty??rule.calculate)({...options,attack:projected,context:physicalContext});results.push(result);
  if(!result.available){errors.push(result.name+': '+result.reason);continue;}
  if(result.special){
   if(special)errors.push('Выберите одно особое действие для этого броска.');
   special=result;
   if(rule.operation==='SPECIAL_CHECK')continue;
   channels.push({id:rule.penaltyChannel,value:result.modifier,label:rule.name,source:rule.sources[0],kind:'learned-technique',
    originalModifier:result.originalModifier,resolvedTechniqueModifier:result.modifier});
   continue;
  }
  if(rule.operation==='CONTEXT'||rule.operation==='SEQUENCE')continue;
  if(channels.some(c=>c.id===rule.penaltyChannel)){errors.push('Нельзя дважды заменять один штраф: '+rule.name);continue;}
  if(id==='backKick'&&selected.ids.includes('kicking')){errors.push('Back Kick уже включает собственный штраф Kick; Kicking повторно не складывается.');continue;}
  if((id==='groundFighting'||id==='lowFighting'||id==='fightingWhileSeated')&&selected.ids.filter(x=>['groundFighting','lowFighting','fightingWhileSeated'].includes(x)).length>1){errors.push('Выберите одну технику положения.');continue;}
  if(result.strike){
   const strike={...result.strike,id,name:rule.name};
   strikes.push(strike);
   if(strike.reach!==null)reach=strike.reach;
   channels.push({id:rule.penaltyChannel,value:result.modifier+strike.attackPenalty,label:rule.name,source:rule.sources[0],
    kind:'learned-technique',originalModifier:result.originalModifier,resolvedTechniqueModifier:result.modifier,origin:'physical-strike'});
   continue;
  }
  // BS/MA kick penalties are already present in the clean physical profile.
  const included=(id==='kicking'||id==='backKick')&&options.attack?.meleeProfile?.unarmed?.alreadyIncluded!==true?
    number(options.attack?.meleeProfile?.unarmed?.technique?.modifier)??number(options.attack?.meleeProfile?.unarmed?.attackPenalty)??0:0;
  const context={...selected.context,...options.context},clean=isCleanTechniqueAttack(options.attack);
  const declared=clean?null:result.originalModifier===0?0:number(context.includedModifiers?.[id]);
  const externalPosture=rule.penaltyChannel==='techniquePosture'&&context.posturePenaltyEvidence?.source==='gga-tagged-posture';
  if(!clean&&!externalPosture&&declared===null){errors.push(result.name+': неизвестно, включён ли исходный штраф в уровень GGA. Укажите уже учтённую величину явно.');continue;}
  if(declared!==null&&(!Number.isInteger(declared)||declared>0||declared<result.originalModifier)){errors.push(result.name+': уже учтённая величина выходит за пределы исходного штрафа.');continue;}
  const exactLocationExtra=['backKick','backStrike'].includes(id)&&options.hitLocationBasePenalty<0?-1:0;
  channels.push({id:rule.penaltyChannel,value:result.modifier-included-(declared??0)+exactLocationExtra,label:rule.name,
   source:'MA-PENALTY-1',kind:'learned-technique',explanation:rule.name+': '+result.originalModifier+' → '+result.modifier,
   originalModifier:result.originalModifier,resolvedTechniqueModifier:result.modifier,profileIncluded:included,
   origin:declared!==null?'owner-declared':externalPosture?'gga-tagged-posture':'clean-profile',declaredIncluded:declared});
  const includedDamage=clean||!result.damageFlat?null:number(context.includedDamage?.[id]);
  if(result.damageFlat&&!clean&&includedDamage===null)errors.push(result.name+': неизвестно, включена ли поправка в Damage GGA. Укажите уже учтённую величину.');
  if(includedDamage!==null&&(!Number.isInteger(includedDamage)||includedDamage<Math.min(0,result.damageFlat)||includedDamage>Math.max(0,result.damageFlat)))errors.push(result.name+': уже учтённая поправка Damage выходит за пределы эффекта техники.');
  damageFlat+=result.damageFlat-(includedDamage??0);
  if(result.damageType){if(damageType&&damageType!==result.damageType)errors.push('Несовместимые преобразования типа Damage.');damageType=result.damageType;}
  if(result.damageReduction&&!clean&&typeof context.swingReductionIncluded!=='boolean')errors.push('Укажите, включён ли в исходный Damage штраф swing Back Strike.');
  damageReduction||=result.damageReduction&&(clean||context.swingReductionIncluded!==true);if(result.reach!==null)reach=result.reach;
  if(result.cap!==null)caps.push({maximum:result.cap,label:'Предел Riding / Combat Riding'});
  if(rule.penaltyChannel==='techniquePosture'&&result.posture.source==='gga-posture'){
   const proof=options.context?.posturePenaltyEvidence;
   if(proof?.source==='gga-tagged-posture'&&proof.value===result.originalModifier)externalAdjustments.push(proof);
   else if(options.context?.ggaPostureAutoAdd)errors.push('Не подтверждён источник уже действующего штрафа положения GGA; поправка не применяется.');
  }
 }
 if(special?.special.kind!=='attack'&&special&&(selected.ids.length>1||physicalContext.combination||physicalContext.rapidStrike))errors.push('Особый бросок выполняется отдельно.');
 if(selected.ids.includes('hammerFist')&&selected.ids.includes('backKick'))errors.push('Hammer Fist и Back Kick используют разные ударные части.');
 const parents=new Set(results.filter(r=>r.available&&r.operation!=='CONTEXT').map(r=>key(r.governingSkill)));
 if(parents.size>1)errors.push('MA64 требует общего управляющего навыка для сочетания техник одной атаки.');
 // These are permitted *effects*, not permission to add any two numeric skills.
 const postureIds=['groundFighting','lowFighting','fightingWhileSeated'];
 const contextual=new Set([...postureIds,'attackFromAbove','cavalryTraining','closeCombat']);
 const strikeIds=new Set(['hammerFist','kicking','backKick','backStrike','crack']);
 for(let a=0;a<results.length;a++)for(let b=a+1;b<results.length;b++){
  const x=results[a].id,y=results[b].id;
  const pair=[x,y],spinPair=pair.includes('spinningPunch')&&pair.some(id=>['elbowStrike','exoticHandStrike','hammerFist','lethalStrike'].includes(id))||
    pair.includes('spinningKick')&&pair.includes('lethalKick');
  const counterattack=pair.includes('counterattack')&&results[a].special?.kind!=='hit'&&results[b].special?.kind!=='hit'&&
    !pair.some(id=>['reverseGrip','stayingSeated','combatRiding'].includes(id));
  const allowed=!pair.includes('whirlwindAttack')&&(spinPair||counterattack||
    pair.includes('springingAttack')&&pair.some(id=>strikes.some(s=>s.id===id&&s.procedure!=='spring')||strikeIds.has(id))||
    contextual.has(x)&&!contextual.has(y)||contextual.has(y)&&!contextual.has(x)||
    (postureIds.includes(x)&&['closeCombat','cavalryTraining'].includes(y))||(postureIds.includes(y)&&['closeCombat','cavalryTraining'].includes(x))||
    ([x,y].includes('pressurePointStrike')&&(strikeIds.has(x)||strikeIds.has(y)))||
    ([x,y].includes('dualWeaponAttack')&&!['reverseGrip','backKick','kicking','dropKick','flyingJumpKick','flyingLunge'].some(id=>[x,y].includes(id))));
  if(!allowed)errors.push('Для сочетания '+results[a].name+' + '+results[b].name+' нет подтверждённого допуска MA64.');
 }
 const primary=strikes.find(s=>s.projected&&!['spin','spring'].includes(s.procedure))??
  strikes.find(s=>s.projected&&s.procedure==='spin')??strikes.find(s=>s.projected)??null;
 const spin=strikes.find(s=>s.projected&&s.procedure==='spin');
 if(primary){
  for(const secondary of strikes.filter(s=>s.projected&&s!==primary)){
   const channel=channels.find(c=>c.id===byId.get(secondary.id).penaltyChannel);
   channel.value-=secondary.attackPenalty-secondary.specialAccuracy;
  }
  reach=primary.reach;
 }
 if(spin&&selected.ids.includes('hammerFist')&&!options.attack?.meleeProfile?.unarmed)errors.push('Spinning Hammer Fist требует подтверждённый профиль руки.');
 const standardPosture=(primary??strikes[0])?.standardPosture;
 if(standardPosture?.value&&!results.some(r=>postureIds.includes(r.id))){
  channels.push({id:'techniqueBodyPosture',value:standardPosture.value,label:'Положение (MA99)',kind:'situational',source:'MA99'});
  const proof=physicalContext.posturePenaltyEvidence;
  if(standardPosture.source==='gga-posture'&&physicalContext.ggaPostureAutoAdd){
   if(proof?.source==='gga-tagged-posture'&&proof.value===standardPosture.value)externalAdjustments.push(proof);
   else errors.push('Не удалось сверить уже действующий штраф положения GGA (MA99).');
  }
 }
 const strikeManeuver=strikes.find(s=>s.replaceManeuver)??null;
 const fixedLocation=strikes.find(s=>s.fixedLocation)?.fixedLocation??null;
 if(fixedLocation&&options.targetedAttack)errors.push('Штраф зоны уже включён в эту технику.');
 const motion=tipSlash?'swing':primary?(primary.procedure==='slam'?'collision':'thrust'):strikes.find(s=>s.motion)?.motion??null;
 return {version:1,available:errors.length===0,errors,results,channels,damageFlat,damageType,damageReduction,reach,motion,caps,externalAdjustments,
  ...(special?{special}:{}),
  ...(strikes.length?{strikes,primaryStrike:primary,strikeManeuver,fixedLocation}:{}),
  operation:results.length>1?'COMBINE':results[0]?.operation??null,source:'MA64',selection:selected};
}

export function meleeTechniqueRuntimeContext(actor,context={},runtime=globalThis){
 const result={...context,cinematicDefaults:allowsCinematicTechniqueDefaults(runtime.game?.user)},posture=readMeleePosture(actor,context.posture);
 const tagged=runtime.game?.settings?.get?.('gurps','use-tagged-modifiers');
 if(posture.source==='gga-posture'&&tagged?.autoAdd){
  result.ggaPostureAutoAdd=true;
  const effects=Array.from(actor?.effects??[]).filter(e=>!e.disabled&&!e.isSuppressed&&e.flags?.gurps?.effect?.type==='posture');
  const meleeTags=String(tagged.allMeleeRolls??'melee').split(',').map(s=>s.trim()).filter(Boolean);
  const entries=effects.flatMap(e=>(e.changes??[]).filter(c=>c.key==='system.conditions.self.modifiers'&&meleeTags.some(tag=>String(c.value).split(/\s+/).includes('#'+tag))).map(c=>{
   const raw=String(c.value),token=/^GURPS\.\S+/.exec(raw)?.[0];
   const description=token?raw.replace(token,runtime.game?.i18n?.localize?.(token)??token):raw;
   return {effectId:e.id,value:Number(/^\s*(-?\d+)/.exec(description)?.[1]),description,raw,source:'gga-tagged-posture'};
  }));
  if(entries.length===1&&Number.isFinite(entries[0].value))result.posturePenaltyEvidence=entries[0];
 }
 return result;
}
