import { withActorResourceWrite } from './actor-resource-writes.js';
import { finiteLevel, objectSkillRows } from './combat-technique-data.js';
import { learnedMeleeSkills, meleeSkillFamily, techniqueGroups, techniqueIdentity } from './melee-penalty-techniques.js';
import { resolveProfileTechnique, unarmedBonus } from './combat-technique-unarmed.js';
import { LT_SHIELD_TOOL_PROFILES, ltShieldToolSource } from '../lt-shield-tool-source.js';
import { meleeSource, meleeSiblingSources } from '../melee-source-data.js';

export const allOutMeleeModes = ['determined', 'strong', 'double', 'long'];

export const MA_MELEE_OPTIONS = {
  long: ['All-Out Attack (Long)', 'Тотальная атака (длинная)', 'MA97-98',
    'Reach +1 yd. Thrust unchanged; swing -2 or -1/die, whichever is worse. Incompatible with Defensive Grip. A floor lunge needs a free supporting hand and a DX roll. No active defenses.',
    'Досягаемость +1 ярд. Урон thrust прежний; swing -2 или -1 за куб, что хуже. Несовместимо с Defensive Grip. Для выпада с опорой нужны свободная опорная рука и проверка DX. Активные защиты недоступны.'],
  acrobatic: ['Acrobatic Attack', 'Акробатическая атака', 'MA105-107',
    'Move and Attack. Roll the stunt first at an extra -2. Attack at an extra -2, even with Heroic Charge. Resolve movement, reach and Acrobatic Dodge manually.',
    'Движение и атака. Сначала проверка трюка с дополнительным -2. К атаке ещё -2 даже с Heroic Charge. Перемещение, возможность достать цель и Acrobatic Dodge разрешаются вручную.'],
  flying: ['Flying Attack', 'Атака в прыжке', 'MA107, B352',
    'Confirm a run and a reachable landing. Roll DX or Jumping before attacking. Failure means a fall and ends the turn. Attack at -5, cap 9. Heroic Charge leaves -1 and removes the cap.',
    'Подтвердите разбег и возможность достать цель после приземления. До атаки бросок DX или Jumping. Провал означает падение и конец хода. Атака -5, предел 9. Heroic Charge оставляет -1 и снимает предел.'],
  pummel: ['Pummeling', 'Удар эфесом или торцом', 'MA111-112, LT56',
    'Reach C. With a sword or fencing weapon use the hilt, or use the butt of a Reach C/1 weapon. DX, Brawling or Karate at -1. Tonfa or a knuckle guard allows full DX/Boxing/Brawling/Karate. Thrust cr, skill bonus, +1 with two hands.',
    'Reach C. Удар эфесом меча или фехтовального оружия либо торцом оружия с Reach C/1. DX, Brawling или Karate с -1. Тонфа и закрытая гарда допускают полный DX/Boxing/Brawling/Karate. Thrust cr, бонус навыка и +1 при двух руках.'],
  shin: ['Shin Kicks', 'Удар голенью', 'MA112, B379',
    'Use Kicking, Jam or Spinning Kick against a foe in front or to the side who is not lying down. Replace any boot bonus with +1 for rigid leg armor. A crushing Shin Striker adds +1/die and changes the self-injury threshold to DR 3.',
    'Kicking, Jam или Spinning Kick по цели спереди или сбоку, если она не лежит. Бонус обуви заменяется на +1 за жёсткую броню голени. Striker (Crushing; Limb, Shin) даёт +1 за куб, травма себе возможна от DR 3.'],
  shove: ['Shoves with Weapons', 'Толчок оружием или щитом', 'MA112, B372, B378',
    'Roll weapon skill for a ready shield or rigid Reach 1+ weapon. Thrust at -1/die for one hand or a shield, plus maximum Reach or shield DB. Double the result for knockback only. Resolve movement manually.',
    'Бросок навыка готового щита или жёсткого оружия с Reach 1+. Thrust с -1 за куб для одной руки или щита, плюс максимальный Reach или DB. Удвойте результат для отбрасывания. Перемещение вручную.'],
  strikeShield: ['Striking at Shields', 'Удар по щиту', 'MA112, B400-401, B484',
    'Attack at -4 + DB. For disarming a buckler or cloak apply another -2. A strapped shield can only be damaged. Target may Dodge or Block without DB and may retreat. Resolve defense, damage to the object, or the contest by hand.',
    'Атака с -4 + DB. Для выбивания баклера или плаща дополнительно -2. Закреплённый щит можно только повредить. Цель может уклониться или блокировать без DB и отступить. Защита, Damage предмета и состязание вручную.'],
  extraAttack: ['Extra Attack', 'Extra Attack', 'B53, MA126-127',
    'One independent attack per level. Use another limb or weapon unless you have Multi-Strike. Apply any skill limitation. Only one attack in the maneuver can be traded for a multiple-attack sequence.',
    'Одна самостоятельная атака за уровень преимущества. Без Multi-Strike нужна другая конечность или другое оружие. Учитывайте ограничение по навыку. В манёвре только одну атаку можно заменить последовательностью.'],
  expanded: ['Expanded Rapid Strike', 'Расширенный Rapid Strike', 'MA127',
    'Cinematic option. Each attack in the sequence takes -6 per extra attack. Weapon Master or Trained by a Master halves it.',
    'Кинематографическая опция. Каждая атака последовательности получает -6 за дополнительную атаку. Weapon Master или Trained by a Master делит штраф пополам.'],
  feintSlot: ['Feint in this slot', 'Финт в этом слоте', 'MA97, MA127, B365',
    'Replace a melee attack with your part of a Feint contest. Maneuver and slot penalties still apply. Resolve the contest and the affected defenses manually.',
    'Заменяет атаку своей частью состязания Feint. Штрафы манёвра и слота сохраняются. Состязание и изменение защит разрешаются вручную.'],
  flurry: ['Flurry of Blows', 'Шквал ударов', 'B357, MA131',
    '1 FP per selected Rapid Strike blow. Halve its penalty again, dropping fractions. One offensive extra effort per turn. Unavailable with Move and Attack.',
    '1 ЕУ за выбранный удар Rapid Strike. Делит его штраф пополам с отбрасыванием дроби. Одно наступательное сверхусилие за ход. Недоступно при движении и атаке.'],
  mighty: ['Mighty Blows', 'Могучие удары', 'B357, MA131',
    '1 FP per selected melee blow made with Attack. Adds +2 or +1 per die to ST-based damage, whichever is greater. One offensive extra effort per turn.',
    '1 ЕУ за выбранный удар в манёвре «Атака». К урону от ST добавляет +2 или +1 за куб, что больше. Одно наступательное сверхусилие за ход.'],
  lunge: ['Great Lunge', 'Мощный выпад', 'MA131',
    '1 FP. Use the reach and damage of All-Out Attack (Long) while retaining the maneuver’s defenses. Attack, Committed Attack, or Move and Attack. Incompatible with Defensive Grip.',
    '1 ЕУ. Досягаемость и урон как у длинной тотальной атаки, защиты определяет манёвр. Доступно в Attack, Committed Attack и Move and Attack. Несовместимо с Defensive Grip.'],
  charge: ['Heroic Charge', 'Героический рывок', 'MA131',
    '1 FP. Melee Move and Attack loses its -4 and skill cap; the extra -1 for Flying or -2 for Acrobatic Attack stays. Defenses still follow the maneuver.',
    '1 ЕУ. В ближнем бою снимает обычный штраф -4 и предел движения и атаки. Оставляет -1 за прыжок или -2 за акробатику. Защиты определяет манёвр.'],
  quickBow: ['Quick-Shooting Bows', 'Быстрая стрельба из лука', 'MA97, MA119-120',
    'Ready an arrow or use Fast-Draw (Arrow), then roll Bow to draw and again to shoot. Both Bow rolls at -6, -3 with Heroic Archer or Weapon Master, -1 with both. All-Out Attack (Determined) +1. Move and Attack requires Heroic Archer.',
    'Подготовьте стрелу или бросьте Fast-Draw (Arrow), затем Bow для натяжения и Bow для выстрела. Оба броска Bow с -6, -3 с Heroic Archer или Weapon Master, -1 с обоими. All-Out Attack (Determined) +1. Движение и атака требует Heroic Archer.'],
  thrownSequence: ['Rapid Strike with Thrown Weapons', 'Последовательное метание', 'MA103, MA120-121',
    'Declare all throws first. Each is at -6 per extra throw, halved for an applicable Weapon Master. Ready up to four weapons under 1 lb. or one heavier weapon per hand. Confirm mixed readiness, Fast-Draw and Quick-Swap manually. A failed Fast-Draw or critical miss ends the sequence.',
    'Объявите все броски заранее. Штраф -6 за дополнительный бросок, половина с подходящим Weapon Master. В одной руке готовы до четырёх предметов легче 1 lb. или один более тяжёлый. Смешанную подготовку, Fast-Draw и Quick-Swap подтвердите вручную. Провал Fast-Draw или критический промах завершает серию.'],
  thrownBurst: ['Rapid Fire with Thrown Weapons', 'Метание горстью', 'MA120, B373',
    'One Throwing or Throwing Art attack with ready small objects. Hand: BL/50 sharp, BL/20 blunt or cinematic. Container: BL/2. Acc 0, RoF equals count, Rcl 2. Up to 4: -1/die, 2/3 range. 5+: -2/die, 1/3 range.',
    'Одна атака Throwing или Throwing Art готовыми мелкими предметами. Рукой: BL/50 острых, BL/20 тупых или кинематографических. Из ёмкости: BL/2. Acc 0, RoF по числу предметов, Rcl 2. До 4: -1 за куб и 2/3 Range. От 5: -2 за куб и 1/3 Range.']
};

export function maOptionText(id) {
  const [en, ru, page, enHint, ruHint] = MA_MELEE_OPTIONS[id];
  const effort=['flurry','mighty','lunge','charge'].includes(id);
  const fatigue=effort?(maRussian()?
    ' При расходе ниже 0 ЕУ теряется 1 ЕЖ за каждый ЕУ. Проверка Will при истощении и бессознательность при -макс. ЕУ разрешаются по B426. Один тип наступательного сверхусилия за ход (MA131).':
    ' Each FP spent below zero also costs 1 HP. Resolve the Will check for exhaustion and unconsciousness at -max FP per B426. One offensive extra-effort option per turn (MA131).'):'';
  return maRussian() ? { label: ru, hint: ruHint + ' (' + page + ')' + fatigue } :
    { label: en, hint: enHint + ' (' + page + ')' + fatigue };
}

export const maRussian = () => /^ru\b/i.test(globalThis.game?.i18n?.lang ?? 'en');
const canonical = techniqueIdentity;

export function extraAttackRanks(actor) {
  return objectSkillRows(actor?.system?.ads).flatMap(row => {
    if (row.disabled === true || row.active === false) return [];
    const match = [row.originalName, row.name].map(canonical)
      .map(name => /^extra attack(?:\s+(\d+))?(?=$|\s*\()/.exec(name)).filter(Boolean)
      .sort((a,b)=>Number(!!b[1])-Number(!!a[1]))[0];
    if (!match) return [];
    const rank = Number(row.levels ?? row.level ?? match[1] ?? 1);
    if (!Number.isInteger(rank) || rank < 1) return [];
    const details = [row.name, row.notes, row.modifier, row.specialization,
      ...Object.values(row.modifiers ?? {}).filter(mod => mod?.disabled !== true).map(mod => mod?.name)]
      .filter(Boolean).join(' ');
    const multiStrike = /\bmulti[ -]strike\b/i.test(details);
    const singleSkill = /single skill\s*[:=]\s*([^;,)]+)/i.exec(details)?.[1] ??
      (row.name?.includes('Single Skill') ? techniqueGroups(row.name).at(-1)?.replace(/^Single Skill\s*:?\s*/i, '') : null);
    return Array.from({ length: rank }, () => ({ multiStrike, singleSkill: singleSkill ? canonical(singleSkill) : null,
      unresolvedSpecialization: /single skill/i.test(details) && !singleSkill }));
  });
}

export function expandedRapidStrikeCount(value, cinematic) {
  const count = Number(value);
  return cinematic && Number.isSafeInteger(count) ? Math.max(2, count) : 2;
}

export function maRapidStrikePenalty(count, mastery, flurry) {
  const penalty = 6 * Math.max(1, count - 1) / (mastery ? 2 : 1);
  return -Math.floor(penalty / (flurry ? 2 : 1));
}

const reachValues = reach => String(reach??'').split(/[,/]/).map(n => Number(n.trim().replace(/\*$/, ''))).filter(Number.isInteger);
const pummelMode = usage => /\b(?:pommel|hilt|pummeling|butt strike)\b/i.test(usage??'');

export function readShieldDefenseBonus(actor, profile=null) {
  const db = row => [row?.defenseBonus, row?.db].map(value=>
    typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value):value).find(value=>Number.isInteger(value)&&value>=0);
  const candidates=objectSkillRows(actor?.system?.equipment?.carried).flatMap(row=>{
    if(row.equipped!==true)return [];
    const id=row.uuid;
    const bound=actor.getFlag?.('olegurps-qol','meleeEquipmentBindings')?.[id];
    const explicit=['shield','cloak'].includes(canonical(row.type))||row.isShield===true;
    const source=ltShieldToolSource(bound?.modeId);
    const identities=[id,row.originaluuid,bound?.equipmentId].filter(Boolean);
    const shield=source?.shield===true||Object.values(LT_SHIELD_TOOL_PROFILES)
      .some(mode=>mode.shield&&identities.includes(mode.equipmentId));
    if(!explicit&&!shield)return [];
    const value=db(row);
    return value===undefined?[null]:[{value,handheld:typeof row.handheld==='boolean'?row.handheld:null,instanceId:id??null}];
  });
  const direct=db(profile);
  if(direct!==undefined)return {value:direct,handheld:profile.handheld??null,instanceId:profile.weaponId??null};
  return candidates.length===1?candidates[0]:null;
}

export function maAttackApplicability(attack, governingSkill, techniquePlan) {
  const family=meleeSkillFamily(governingSkill), profile=attack?.meleeProfile;
  const id=profile?.modeId??attack?.catalogBinding?.modeId??attack?.standaloneRef?.modeId;
  const published=meleeSource(id);
  const siblings=published?meleeSiblingSources(id):[];
  const shield=ltShieldToolSource(id)?.shield===true||family==='shield';
  const flex=['kusari','whip','flail','two-handed flail','net','cloak','monowire whip'].includes(family);
  const unarmed=!!attack?.unarmedRef;
  const reach=reachValues(profile?.reach??attack?.reach??attack?.data?.reach);
  const sword=['broadsword','shortsword','two-handed sword','rapier','saber','smallsword','main-gauche'].includes(family);
  const publishedSword=published?.primarySkills?.some(name=>['broadsword','shortsword','two-handed sword','rapier','saber','smallsword','main-gauche'].includes(canonical(name)));
  const publishedClose=[published,...siblings].some(mode=>/(?:^|[,/])\s*(?:C|1)\*?(?:$|[,/-])/i.test(mode?.stats?.reach??''));
  const existingPummel=pummelMode(published?.usage??attack?.mode);
  const publishedPummel=siblings.find(mode=>pummelMode(mode.usage));
  const reversed=profile?.grip==='reversed'&&reach.includes(1);
  const kick=techniquePlan?.strikes?.find(item=>['spinningKick','kicking','jam'].includes(item.id));
  return {
    pummel: !unarmed && !shield && !flex && !!attack && published?.modelId!=='lt:haladie' &&
      !/\bhaladie\b/i.test(attack?.name??'') &&
      (existingPummel||publishedPummel||reversed||(published?publishedSword||publishedClose:
        sword||reach.some(n=>n===1)||/\bC\b/i.test(profile?.reach??attack?.reach??''))),
    shin: !!kick||!techniquePlan?.primaryStrike&&unarmed&&
      (['kick','boots'].includes(attack.unarmedRef.id)||profile?.attackType==='kick'),
    shinTechnique:kick?.id??null,
    shove: !unarmed&&(shield||!flex&&!!family&&reach.some(n=>n>=1)),
    strikeShield: !!attack && !!(attack.damage??attack.data?.damage),
    shield, reach, guarded: /(?:^|[:-])(?:backsword|cutlass|tonfa)(?:$|[-:])/i.test(published?.modelId??''),
    existingPummel, publishedPummel, reversed, published, siblings,
    pummelNeedsConfirmation:!published&&!existingPummel
  };
}

export function maProjectedAttack(options, techniquePlan) {
  const selection=options.maOptions, action=selection?.attackOption;
  if(!action)return null;
  const source=maAttackApplicability(options.attack,options.governingSkill,techniquePlan);
  if(!source[action])return {error:maOptionText(action).hint};
  const profile=options.attack?.meleeProfile;
  const hands=profile?.hands?.hands??profile?.strength?.hands??(String(options.attack?.st??'').includes('†')?2:1);
  if(action==='pummel'){
    if(source.existingPummel)return {action,reach:'C'};
    if(source.pummelNeedsConfirmation&&!selection.pummelConfirmed)
      return {error:maRussian()?'Подтвердите пригодность оружия для Pummeling (MA111).':
        'Confirm that this weapon is suitable for Pummeling (MA111).'};
    if(source.reversed){
      const pattern=/^thr([+-]\d+)?\s+(\w+)$/i;
      const selected=source.published?.stats?.damage??options.attack?.sourceDamage??profile?.damageExpression??options.attack?.damage;
      const alternatives=new Set(source.siblings.map(row=>row.stats?.damage).filter(value=>pattern.test(value??'')));
      const match=pattern.exec(selected??'')??(alternatives.size===1?pattern.exec([...alternatives][0]):null);
      if(!match)return {error:maRussian()?'Выберите режим с подтверждённым thrust Damage для удара торцом (MA112).':
        'Select a confirmed thrust Damage mode for the reversed butt strike (MA112).'};
      const modifier=Number(match[1]??0)-(canonical(match[2])==='cr'?0:1);
      return {action,reach:'1',formula:'thr'+(modifier?(modifier>0?'+':'')+modifier:'')+' cr',reversed:true};
    }
    if(source.publishedPummel)return {error:(maRussian()?'Выберите готовый режим оружия: ':'Select the published weapon mode: ')+source.publishedPummel.usage};
    const dx=Number(options.actor?.system?.attributes?.DX?.value);
    const guarded=source.guarded||selection.pummelGuarded===true;
    const names=guarded?['dx','boxing','brawling','karate']:['dx','brawling','karate'];
    const penalty=guarded?0:-1;
    const base=learnedMeleeSkills(options.actor).filter(row=>names.includes(canonical(row.name)))
      .map(row=>({name:row.name,level:finiteLevel(row)+penalty,bonus:unarmedBonus({name:row.name,learned:true,dx,baseLevel:finiteLevel(row)})}));
    if(Number.isFinite(dx))base.push({name:'DX',level:dx+penalty,bonus:0});
    if(!guarded){
      const technique=hands===2?'Two-Handed Punch':'Hammer Fist';
      const substitute=resolveProfileTechnique(options.actor,{technique,attackModifier:0});
      const parent=base.find(skill=>skill.name===substitute?.baseSkill);
      if(substitute?.resolved&&parent)base.push({...parent,name:technique,level:substitute.level});
    }
    const best=base.sort((a,b)=>b.level-a.level||b.bonus-a.bonus)[0];
    if(!best)return {error:maOptionText(action).hint};
    return {action,reach:'C',level:best.level,skill:best.name,bonus:best.bonus,formula:hands===2?'thr+1 cr':'thr cr'};
  }
  if(action==='shove'){
    const db=Number(selection.shieldDB);
    if(source.shield&&(!Number.isInteger(db)||db<0||selection.shieldDB===''))return {error:maOptionText(action).hint};
    const maxReach=source.shield?db:Math.max(...source.reach);
    return {action,reach:source.shield?profile?.reach??options.attack?.reach??'1':profile?.reach??options.attack?.reach,
      formula:'thr'+(maxReach?'+'+maxReach:'')+' cr',bonus:hands===1||source.shield?-1:0,knockbackOnly:true};
  }
  if(action==='shin'){
    if(!selection.attackOptionConfirmed)return {error:maOptionText(action).hint};
    const striker=objectSkillRows(options.actor?.system?.ads).some(row=>row.disabled!==true&&row.active!==false&&
      [row.name,row.originalName].some(name=>/^striker\b/i.test(name??''))&&
      /crushing/i.test(row.name??'')&&/\bshin\b/i.test([row.name,row.notes].join(' ')));
    const boots=source.shinTechnique!=='jam'&&(options.attack?.unarmedRef?.id==='boots'||
      techniquePlan?.strikes?.some(strike=>strike.id==='spinningKick')&&options.meleeTechniques?.context?.strikeFootwear==='boots');
    return {action,flat:Number(selection.shinArmor===true)-Number(!!boots),
      bonus:striker?1:0,selfInjuryDR:striker?3:1};
  }
  const recorded=selection.targetShield;
  const entered=selection.shieldDB;
  const db=recorded?.value??(entered===''||entered==null?null:Number(entered));
  const disarm=!!selection.shieldDisarm;
  if(!Number.isInteger(db)||db<0||disarm&&!(recorded?.handheld??selection.shieldHandheld))
    return {error:maOptionText(action).hint};
  return {action,hitModifier:-4+db-(disarm?2:0),shieldDB:db,shieldDisarm:disarm,
    ...(recorded?{shieldInstanceId:recorded.instanceId,shieldDBSource:'equipped'}:{})};
}

export function resolveMeleeCombatOptions(options, techniquePlan) {
  const selection = options.maOptions ?? {};
  const movement = options.moveAndAttack && !techniquePlan?.strikeManeuver ? selection.movement ?? null : null;
  const maneuver = techniquePlan?.strikeManeuver?.maneuver ??
    (options.moveAndAttack ? 'move' : options.allOutAttack ? 'allOut' :
      options.committedAttack ? 'committed' : options.defensiveAttack ? 'defensive' : 'attack');
  const nominalLong = options.allOutAttack && options.allOutAttackMode === 'long' && !techniquePlan?.strikeManeuver;
  const permittedEffort = {
    flurry: maneuver !== 'move' && !!options.rapidStrikePenalty,
    mighty: maneuver === 'attack' && !techniquePlan?.strikeManeuver && options.strengthDamage,
    lunge: ['attack', 'committed', 'move'].includes(maneuver) && !techniquePlan?.strikeManeuver,
    charge: maneuver === 'move'
  };
  const effort = permittedEffort[selection.effort] && selection.spend !== false ? selection.effort : null;
  const long = nominalLong || effort === 'lunge';
  const projected=maProjectedAttack(options,techniquePlan);
  const active = long || effort || movement || selection.rapidCount > 2 || selection.extraAttack || projected;
  if (!active) return null;
  const grip = options.attack?.meleeProfile?.grip;
  const defensiveGrip = /defensive/i.test(String(grip?.id ?? grip?.name ?? grip?.label ?? grip ?? ''));
  const sourceDamage=projected?.formula??techniquePlan?.primaryStrike?.damage??options.attack?.damage??options.attack?.data?.damage??'';
  const swing=(!projected?.formula&&!techniquePlan?.primaryStrike&&options.attack?.meleeProfile?.motion==='swing')||
    /^\s*(?:sw|swing)\b/i.test(String(sourceDamage));
  const hands=options.attack?.meleeProfile?.hands?.hands??options.attack?.meleeProfile?.strength?.hands??
    (String(options.attack?.st??'').includes('†')?2:null);
  const floorLunge=long&&selection.floorLunge===true;
  const rebounds=Number(selection.stuntRebounds);
  const reboundPenalty=movement==='acrobatic'&&selection.stunt==='ticTac'&&Number.isSafeInteger(rebounds)?
    Math.max(0,rebounds-1)*2:0;
  return {
    long, floorLunge, movement, effort, projected,
    effortCost: effort ? 1 : 0, rapidCount: selection.rapidCount ?? null, extraAttack: selection.extraAttack ?? null,
    swingPenalty: long && swing,
    moveDelta: (effort === 'charge' ? 4 : 0) - (movement === 'flying' ? 1 : movement === 'acrobatic' ? 2 : 0) - reboundPenalty,
    bypassMoveCap: effort === 'charge',
    rapidPenalty: effort === 'flurry' ? Math.trunc(options.rapidStrikePenalty / 2) : options.rapidStrikePenalty,
    error: projected?.error??(long&&defensiveGrip?'Defensive Grip (MA98, MA131)':
      floorLunge&&hands===2?(maRussian()?'Для выпада нужна рука для опоры (MA97).':
        'A floor lunge needs a supporting hand (MA97).'):null)
  };
}

export function extendedMeleeReach(reach) {
  return String(reach ?? '').split(',').map(value => value.trim().replace(/^(C|\d+)(\*?)$/i,
    (_, distance, star) => String(distance.toUpperCase() === 'C' ? 1 : Number(distance) + 1) + star)).join(',');
}

export function movementChecks(actor, option, state) {
  const dx = Number(actor?.system?.attributes?.DX?.value);
  const skills = learnedMeleeSkills(actor);
  const best = (name, fallback = -Infinity) => Math.max(fallback,
    ...skills.filter(skill => canonical(skill.name) === name).map(finiteLevel));
  if (option === 'flying') {
    const jumping = best('jumping');
    return [{ name: jumping > dx ? 'Jumping' : 'DX', level: Math.max(dx, jumping), procedure: 'flying' }];
  }
  if (option !== 'acrobatic') return [];
  const acrobatics = best('acrobatics', dx - 6);
  const stunt=state?.stunt??'tumbling';
  const extra=Math.max(0,Math.trunc(Number(state?.stuntPenalty??(stunt==='skid'?2:0))||0));
  const ht=Number(actor?.system?.attributes?.HT?.value);
  const rebase=name=>Number.isFinite(ht)?best(name)+dx-ht:-Infinity;
  const running=rebase('running'),skating=rebase('skating');
  const evadeSkill=state?.evadeJump?'Jumping':'Acrobatics';
  const evadeModifier=Math.trunc(Number(state?.stuntPenalty)||0);
  const checks = {
    tumbling: { name:'Acrobatics', level:acrobatics, procedure:'tumbling' },
    banister: state?.standing?
      { name:'Acrobatics',level:acrobatics-8,procedure:'banister' }:
      { name:acrobatics>dx?'Acrobatics':'DX',level:Math.max(dx,acrobatics)-2,procedure:'banister' },
    swinging: { name:'Acrobatics',level:acrobatics-extra-(state?.byLegs?2:0),procedure:'swinging' },
    ticTac: { name:best('jumping')>acrobatics?'Jumping':'Acrobatics',
      level:Math.max(acrobatics,best('jumping'))-4-extra,procedure:'ticTac' },
    spinning: { name:running>acrobatics?'Running (DX)':'Acrobatics',level:Math.max(acrobatics,running)-extra,procedure:'spinning' },
    evade: { name:evadeSkill,level:(state?.evadeJump?best('jumping'):acrobatics)+evadeModifier,procedure:'evade' },
    skid: { name:skating>dx?'Skating (DX)':'DX',level:Math.max(dx,skating)-extra,procedure:'skid' }
  };
  const current=checks[stunt]??checks.tumbling;
  const first=stunt==='swinging'&&state?.swingNeedsJump?
    [{ name:'Jumping',level:best('jumping',dx),procedure:'swingReach' }] : [];
  const count=stunt==='ticTac'?Number(state?.stuntRebounds??1):1;
  if(!Number.isSafeInteger(count)||count<1||!Number.isFinite(current.level))throw Error('MA105-107');
  const steps=stunt==='ticTac'?Math.min(count,Math.max(1,Math.floor((current.level-5)/2)+2)):count;
  const series=Array.from({length:steps},(_,index)=>({...current,level:current.level-index*2,
    ...(count>1?{step:index+1,count}:{})}));
  return [...first,...series].map(check=>({...check,level:check.level-2}));
}

export function movementOutcome(check, result) {
  const stage=result.success?0:result.criticalFailure?2:1;
  const entries={
    flying:[['Reach the landing point.','Прыжок выполнен.'],['Fall and end the turn.','Падение и конец хода.']],
    tumbling:[['Full Move. Add Move to the range of incoming ranged attacks.','Полный Move. К дальности входящих дальних атак прибавьте Move.'],
      ['Half Move and no ranged benefit. Recheck reach.','Половина Move без бонуса против дальних атак. Проверьте досягаемость.'],
      ['Fall without moving.','Падение без перемещения.']],
    banister:[['Slide at Move 5.','Скольжение с Move 5.'],['Land standing at a random point along the stairs.','Приземление стоя в случайной точке лестницы.'],
      ['Fall and resolve collision at Move 5, or 7 if standing. With open air alongside, 1d of 4-6 sends you over the railing.','Падение и столкновение при Move 5 или 7, если стояли. Если рядом пустота, на 4-6 на 1d падение через перила.']],
    skid:[['Slide the distance allowed by this turn. Later turns halve the previous distance.','Перемещение по шкале скольжения. В последующие ходы половина предыдущей дистанции.'],
      ['Fall if standing, otherwise stop.','Падение стоя, иначе остановка.'],['Fall and resolve collision with the ground.','Падение со столкновением с землёй.']],
    spinning:[['Choose your final facing.','Выберите итоговое направление.'],['Roll 1d for a random facing.','Бросьте 1d для случайного направления.'],['Fall.','Падение.']],
    swingReach:[['You reach the support.','Опора достигнута.'],['Miss the support and lose the turn.','Опора не достигнута, ход потрачен.'],['Miss the support and fall.','Опора не достигнута, падение.']],
    swinging:[['Choose the spot where you let go.','Выберите место приземления.'],['Reach a random point along the path. Recheck reach.','Случайная точка траектории. Проверьте досягаемость.'],
      ['Fall at a random location and resolve collision at the maximum swing distance as velocity.','Падение в случайной точке. Скорость столкновения равна максимальной дальности раскачивания.']],
    ticTac:[['Rebound from the surface. Resolve distance and height manually.','Отскок. Определите дистанцию и высоту вручную.'],
      ['Fall from the height of the leap.','Падение с высоты прыжка.'],['Fall and take maximum falling damage for that height.','Падение с максимальным уроном для этой высоты.']],
    evade:[['Resolve the Quick Contest manually. Victory lets you pass, a tie stops you, and a loss gives +1 damage to the foe if they hit before your next turn.',
      'Разрешите состязание вручную. Победа позволяет пройти, ничья останавливает, поражение даёт противнику +1 к урону при попадании до вашего следующего хода.']]
  };
  const outcomes=entries[check.procedure];
  const text=(outcomes[stage]??outcomes.at(-1))[maRussian()?1:0];
  const manual=check.procedure==='evade'||stage===1&&['tumbling','banister','swinging','spinning','skid'].includes(check.procedure);
  const stop=manual||stage>0;
  const dodge=check.procedure==='flying'||check.procedure==='swingReach'&&stage===0||check.procedure==='evade'?'':maRussian()?
    ' Следующее уклонение считается Acrobatic Dodge '+(stage===0?'+2.':'-2.'):
    ' The next Dodge counts as Acrobatic Dodge '+(stage===0?'+2.':'-2.');
  return {text:text+dodge,stop,manual};
}

export function planCombatFatigue(value, max, cost) {
  if (![value, max, cost].every(Number.isFinite) || max <= 0 || cost <= 0)
    throw Error('FP (B357, B426)');
  return { before: value, after: Math.max(-max, value - cost), cost, injury: Math.min(cost, Math.max(0, cost - value)), source: 'B357, B426, MA131' };
}

export async function spendCombatFatigue(actor, cost, {alreadyLocked=false, requireConscious=false}={}) {
  if (!actor?.isOwner && !globalThis.game?.user?.isGM) throw Error('FP: OWNER / GM');
  const spend=async () => {
    const fp = actor.system?.FP;
    const receipt = planCombatFatigue(fp?.value, fp?.max, cost);
    if (requireConscious && receipt.before <= -Number(fp?.max)) throw Error(maRussian() ? 'Персонаж без сознания при -FP (B426).' :
      'The actor is unconscious at -FP (B426).');
    const hpBefore=actor.system?.HP?.value;
    if (!Number.isFinite(hpBefore)) throw Error('HP (B426)');
    const hpAfter=hpBefore-receipt.injury;
    const update={'system.FP.value':receipt.after};
    if(receipt.injury)update['system.HP.value']=hpAfter;
    await actor.update(update);
    return {...receipt,hpBefore,hpAfter,unconscious:receipt.after===-fp.max};
  };
  return alreadyLocked?spend():withActorResourceWrite(actor,spend);
}
