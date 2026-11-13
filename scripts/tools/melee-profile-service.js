import {utExoticSource,utExoticHints,utExoticEffect,utExoticQuality,normalizeUTExoticSelection} from '../ut-exotic-melee-source.js';
import {resolveUnarmedAttack} from './bs-unarmed.js';
import {assertShieldEquipmentReference} from './shield-equipment-adapter.js';
import {htOrdinarySource,htOrdinaryGripPolicy,htOrdinaryHints,htOrdinaryTipDamage} from '../ht-ordinary-melee-source.js';
import {utOrdinarySource,utOrdinaryAllowed,utOrdinaryQuality,utOrdinaryHints} from '../ut-ordinary-melee-source.js';
import {htSpecialSource,htSpecialGripPolicy,htSpecialHints} from '../ht-special-melee-source.js';
import {resolveHTMeleeQuality} from '../ht-melee-quality.js';
import {ltImprovisedSource,ltImprovisedGripPolicy,ltImprovisedHints,resolveImprovisedQuality,techniqueDamageBonus,publishedHandParry} from '../lt-improvised-source.js';
import {ltShieldToolGripPolicy,ltShieldToolHints,shieldModeAllowed,shieldQualityGrades,resolveShieldQuality} from '../lt-shield-tool-source.js';
import { meleeSource, meleeSiblingSources, meleeSkillRules } from '../melee-source-data.js';
import { readActorStrength } from './strength-service.js';
import { resolveProfileWeaponStrength, projectMeleeStrength, unboundMeleeStrength } from './melee-weapon-strength.js';
import { resolveStandaloneSkill, standaloneSkillDescription } from './standalone-skill-service.js';
import { withActorResourceWrite } from './actor-resource-writes.js';
import { parseCampaignTL } from './tech-level.js';
import { ltMeleeQualityProfile,ltMaterialChoices,ltMaterialEffect,ltMaterialHints,LT_MATERIALS,
  meleeWeaponTL,ltTechQualityGrades,ltSuperfineAllowed } from '../lt-melee-quality-data.js';
import {ltBladeGripPolicy,ltBladeTipDamage,ltBladeHints} from '../lt-blade-source.js';
import {ltImpactGripPolicy,ltImpactHints,ltImpactSkillDamage} from '../lt-impact-source.js';
import {ltPolearmGripPolicy,ltPolearmHints} from '../lt-polearm-source.js';
import {ltFlexibleGripPolicy,ltFlexibleHints} from '../lt-flexible-source.js';

export const MELEE_PROFILE_FLAG='meleeProfiles';
const scope='olegurps-qol',copy=value=>structuredClone(value);
const text=value=>String(value??'').trim();
export const meleeProfileKey=attack=>attack?.equipmentRef?'equipment:'+encodeURIComponent(attack.equipmentRef.instanceId):attack?.standaloneRef?'weapon:'+attack.standaloneRef.weaponId:
  attack?.key?'attack:'+encodeURIComponent(attack.key).replaceAll('.','%2E'):null;
const state=actor=>actor?.getFlag?.(scope,MELEE_PROFILE_FLAG)??{version:1,revision:0,profiles:{}};
export function meleeNanothornAllowed(actor,profile,saved={}) {
  const limit=parseCampaignTL(actor?.getFlag?.(scope,'campaignTL'));
  return !!profile?.nanothornCapable&&(limit===null||limit>=11||normalizeUTExoticSelection(profile,saved).blade==='nanothorn');
}
export const readMeleeProfileSelection=(actor,attack)=>state(actor).profiles?.[meleeProfileKey(attack)]??
  state(actor).profiles?.[attack?.equipmentRef?.legacyProfileKey]??{};
// Individually verified physical swords only. Tip grips, force blades and flexible weapons are excluded.
export const meleeMartialGrips=profile=>htSpecialGripPolicy(profile)?.grips??htOrdinaryGripPolicy(profile)?.grips??ltImprovisedGripPolicy(profile)?.grips??ltShieldToolGripPolicy(profile)?.grips??ltFlexibleGripPolicy(profile)?.grips??ltBladeGripPolicy(profile)?.grips??ltImpactGripPolicy(profile)?.grips??ltPolearmGripPolicy(profile)?.grips??(profile?.modelId==='lt:longsword'?['defensive','reversed']:[]);
export function meleeQualityOptions(actor,profile,saved={},selection=saved) {
  if(profile.improvised||profile.fixedPublishedQuality)return profile.qualityOptions;
  if(profile.shield)return shieldQualityGrades(profile,selection);
  const limit=profile.ltConstruction?meleeWeaponTL(selection):parseCampaignTL(actor?.getFlag?.(scope,'campaignTL'));
  const fixed=profile.ltConstruction?LT_MATERIALS[selection.material||selection.baselineMaterial||profile.baselineMaterial]?.fixedQuality:null;
  const id=selection.material||selection.baselineMaterial||profile.baselineMaterial;
  const allowed=profile.ltConstruction&&ltMaterialChoices(profile).includes(id)?ltMaterialEffect(profile,id).allowedQualities:null;
  return ltTechQualityGrades(profile,selection).filter(o=>(!fixed||o.level===fixed)&&(!allowed||allowed.includes(o.level))&&(!Number.isInteger(o.tl)||limit===null||o.tl<=limit||saved.quality===o.level));
}
export function meleeMaterialOptions(actor,profile,saved={},selection=saved) {
  if(profile.utOrdinary)return ['published'];
  const weaponTL=meleeWeaponTL(selection);
  const limit=weaponTL??parseCampaignTL(actor?.getFlag?.(scope,'campaignTL'));
  return ltMaterialChoices(profile).filter(id=>limit===null||LT_MATERIALS[id].tl<=limit||saved.material===id||saved.baselineMaterial===id||profile.baselineMaterial===id);
}

export function meleeProfileContext(actor,attack,{catalogs=globalThis.OleGURPSQOL?.catalogs,sourceModeId=null}={}) {
  const saved=readMeleeProfileSelection(actor,attack),ref=attack?.standaloneRef;
  const record=ref?actor?.getFlag?.(scope,'standaloneWeapons')?.weapons?.find(w=>w.id===ref.weaponId):null;
  const id=ref?.modeId??sourceModeId??saved.sourceModeId??attack?.catalogBinding?.modeId??
    meleeSource(attack?.data?.originaluuid)?.modeId??meleeSource(attack?.uuid)?.modeId;
  const source=ltMeleeQualityProfile(id,catalogs,meleeSource(id));
  if(!source||!source.primarySkills.length&&!source.contactProcedure||source.manualOnly||record&&source.equipmentId!==record.source.equipmentId)return null;
  if(!ref&&saved.anchor&&(saved.anchor.name!==attack.name||saved.anchor.reference!==text(attack.data?.pageref)))return null;
  const profiles=source.ltConstruction?(catalogs.getEquipment(source.equipmentId)?.modes??[])
    .filter(m=>m.combat_type==='melee'&&m.role==='attack').map(m=>ltMeleeQualityProfile(m.weapon_mode_id,catalogs,meleeSource(m.weapon_mode_id))).filter(p=>p&&!p.manualOnly):meleeSiblingSources(id).filter(p=>!p.manualOnly);
  return {source,profiles,record,catalogs,saved,key:meleeProfileKey(attack),imported:!ref&&!attack?.equipmentRef?.virtual};
}

/** B270: a shortage penalizes skill; dagger and double dagger have distinct readiness thresholds. */
export function resolveMeleeHands(st,grip='published',actualST=null,publishedHands=null,requiresTwoHands=false) {
  if(requiresTwoHands&&grip==='one-handed')return {reason:'Для этого режима нужны две работающие руки; ST не заменяет вторую руку (LT58; B270).'};
  const match=/^(\d+)\s*([†‡]?)$/.exec(text(st));
  if(!match)return {minimumST:null,maximumST:null,hands:grip==='published'?publishedHands:null,ready:null,penalty:0,
    reason:grip!=='published'?'Для этого ST альтернативный хват не подтверждён.':null};
  const minimumST=Number(match[1]),symbol=match[2],one=grip==='one-handed';
  if(!['published','one-handed'].includes(grip)||one&&!symbol)return {reason:'Этот хват не разрешён для выбранного режима.'};
  const required=one?Math.ceil(minimumST*(symbol==='†'?1.5:3)):minimumST;
  const reason=one&&(!Number.isFinite(actualST)||actualST<required)?`Одноручный хват требует ST ${required} (B270).`:null;
  const unready=symbol==='‡'?(one?false:actualST<Math.ceil(minimumST*1.5)):
    symbol==='†'&&one&&actualST<minimumST*2;
  return {minimumST,maximumST:minimumST*3,requiredST:required,hands:requiresTwoHands?2:one?1:symbol?2:1,symbol,
    ready:unready?'Требуется Ready после атаки.':null,
    penalty:Number.isFinite(actualST)?Math.min(0,actualST-minimumST):0,reason};
}

export function calculateMeleeCost(base,book,modifiers=[]) {
  if(!Number.isFinite(Number(base))||Number(base)<0)throw Error('Исходная цена не определена.');
  if(book==='LT')return Number((Number(base)*Math.max(0.2,1+modifiers.reduce((n,m)=>n+Number(m.costFactor??0),0))).toPrecision(15));
  return Number(base)*modifiers.reduce((n,m)=>n*Number(m.costMultiplier??1),1);
}

export function resolveMeleeQuality(profile,selection={}, {imported=false,manualDamage=false,publishedInput=false}={}) {
  if(profile.utExotic)return utExoticQuality(profile,selection,{imported,manualDamage,publishedInput});
  if(profile.utOrdinary)return utOrdinaryQuality(profile,selection,{imported,manualDamage,publishedInput});
  if(htSpecialSource(profile.modeId)||htOrdinarySource(profile.modeId))return resolveHTMeleeQuality(profile,selection,{imported,manualDamage,publishedInput});
  if(profile.improvised||profile.fixedPublishedQuality)return resolveImprovisedQuality(profile,selection);
  if(profile.shield)return resolveShieldQuality(profile,selection,{imported,publishedInput});
  const weaponTL=meleeWeaponTL(selection),highTL=!!profile.ltConstruction&&weaponTL!==null&&weaponTL>=7;
  const declaredBaseline=selection.baselineQuality??(imported?null:profile.baselineQuality);
  const baseline=publishedInput?profile.baselineQuality:declaredBaseline;
  const level=selection.quality||declaredBaseline||(publishedInput?profile.baselineQuality:null);
  const unknownImportedMaterial=!!profile.ltConstruction&&imported&&!publishedInput&&!selection.baselineMaterial;
  const options=ltTechQualityGrades(profile,selection),balance=selection.balance?profile.balanceOptions?.find(o=>o.level===selection.balance):null;
  if(selection.balance&&!balance)throw Error('Эта балансировка не подтверждена для оружия.');
  // An imported original grade can belong to another era; only the target grade uses current TL limits.
  const quality=level?options.find(o=>o.level===level):null,original=baseline?profile.qualityOptions?.find(o=>o.level===baseline):null;
  if(baseline&&!original)throw Error('Исходное качество не подтверждено для оружия.');
  if(level&&!quality)throw Error('Это качество не подтверждено для оружия.');
  if(selection.quality&&(!baseline||manualDamage))throw Error('Для изменения качества нужен подтверждённый исходный профиль урона. Ручной Damage сохранён.');
  let material='published',damageBonus=(quality?.damageBonus??0)-(original?.damageBonus??0),
    damageTypes=quality?.damageTypes??original?.damageTypes??[],skillBonus=balance?.skillBonus??0,
    costBase=profile.cost,modifiers=[quality??{},balance??{}],materialTransform=null,hints=[],mass=profile.mass??null,
    blade='standard',baselineBlade='standard',cost=null;
  if(profile.ltConstruction){
    const baselineMaterial=publishedInput?profile.baselineMaterial:selection.baselineMaterial||profile.baselineMaterial;
    material=selection.material||selection.baselineMaterial||profile.baselineMaterial;
    if(selection.material&&imported&&!publishedInput&&(!selection.baselineMaterial||!declaredBaseline))throw Error('Сначала укажите исходный материал и качество импорта; исходный Damage сохранён.');
    if(selection.material&&manualDamage)throw Error('Материал нельзя пересчитать поверх ручного Damage. Ручной Damage сохранён.');
    if(imported&&!publishedInput&&selection.quality&&selection.quality!==baseline&&!selection.baselineMaterial)
      throw Error('Для изменения качества укажите исходный материал импорта.');
    const from=ltMaterialEffect(profile,baselineMaterial),to=ltMaterialEffect(profile,material);
    blade=selection.blade||selection.baselineBlade||'standard';
    baselineBlade=publishedInput?'standard':selection.baselineBlade||'standard';
    if(!['standard','superfine'].includes(blade)||!['standard','superfine'].includes(baselineBlade))throw Error('Исполнение кромки не подтверждено.');
    if(selection.blade&&imported&&!publishedInput&&(!selection.baselineBlade||!selection.baselineMaterial||!declaredBaseline))
      throw Error('Для изменения кромки укажите уже включённые качество, материал и кромку импорта.');
    if(selection.blade&&manualDamage)throw Error('Кромку нельзя пересчитать поверх ручного Damage.');
    if(blade==='superfine'&&(weaponTL===null||weaponTL<9))throw Error('Superfine Blade требует индивидуальный ТУ оружия 9 или выше (UT163).');
    if(blade==='superfine'&&!ltSuperfineAllowed(profile,material)||baselineBlade==='superfine'&&!ltSuperfineAllowed(profile,baselineMaterial))
      throw Error('Superfine не подтверждён для этого материала или конструкции с собственным AD.');
    if(blade==='superfine'&&(level==='Very Fine'||selection.coating))throw Error('Сочетание Superfine с Very Fine или серебрением не подтверждено источником.');
    if(baseline&&(from.fixedQuality&&baseline!==from.fixedQuality||from.allowedQualities&&!from.allowedQualities.includes(baseline)))
      throw Error('Исходное качество импорта не соответствует указанному материалу.');
    if(to.fixedQuality&&level&&level!==to.fixedQuality)throw Error('Этот материал допускает только качество '+to.fixedQuality+'.');
    if(to.allowedQualities&&level&&!to.allowedQualities.includes(level))throw Error('Клинок из этого материала не может быть выше Good.');
    const qDamage=(q,m,edge)=>['cut','imp'].includes(m.type)?edge==='superfine'?2:!m.noQualityDamage?q?.damageBonus??0:0:0;
    damageBonus=to.damage-from.damage+qDamage(quality,to,blade)-qDamage(original,from,baselineBlade);
    damageTypes=['cr','cut','imp'];
    materialTransform=selection.material||publishedInput||selection.blade||baselineBlade==='superfine'?
      {from:from.id,to:to.id,type:to.type,divisor:blade==='superfine'&&['cut','imp'].includes(to.type)?2:to.divisor,replaceDivisor:true}:null;
    const baseBalance=selection.baselineBalance?profile.balanceOptions.find(b=>b.level===selection.baselineBalance):null;
    if(selection.baselineBalance&&!baseBalance)throw Error('Исходная балансировка не подтверждена.');
    if(imported&&selection.balance&&!baseBalance)throw Error('Для изменения балансировки укажите уже включённую балансировку импорта.');
    // A named source skill is rebuilt from the learned skill, so it contains no imported balance bonus.
    skillBonus=(balance??baseBalance)?.skillBonus??0;
    if(imported&&!selection.skill&&!publishedInput)skillBonus-=baseBalance?.skillBonus??0;
    if(selection.coating&&!['silver'].includes(selection.coating))throw Error('Покрытие не подтверждено.');
    if(selection.coating&&unknownImportedMaterial)throw Error('Для серебрения укажите исходный материал импорта.');
    if(selection.coating&&(!to.metal||material==='silver'))throw Error('Серебрение допускается для металлического оружия, кроме цельного серебра.');
    costBase=profile.cost*to.scale;modifiers=[quality??{},balance??baseBalance??{},to,...(selection.coating?[{costFactor:2}]:[])];
    mass=profile.mass==null?null:profile.mass*(to.massMultiplier??1);
    if(unknownImportedMaterial)mass=null;
    hints=ltMaterialHints(profile,material,quality);
    if(selection.coating)hints.push(highTL?
      'Серебрение: +200% после остальных модификаций; поломка как у основы. Уязвимость и уменьшенный множитель повреждений применяются вручную. MA216; B275.':
      'Серебрение: +2 CF; поломка как у основы. Уязвимость и уменьшенный множитель повреждений применяются вручную. LT59; B275.');
    if(blade==='superfine')hints.push('Superfine: итоговые +2 cut/imp и AD(2), без дополнительного +1 от Fine. UT163 прямо не разъясняет сложение: это консервативное решение модуля.');
    if(weaponTL===null)hints.push('ТУ изготовления не задан: сохранён прежний расчёт LT. ТУ кампании, Actor и появления модели не подставляется.');
    if(highTL){
      // MA216 explicitly applies grade/balance/silver percentages after other modifications.
      const adjustments={quality:quality?.costAdjustment??0,balance:(balance??baseBalance)?.costFactor??0,
        silver:material==='silver'?19:0,coating:selection.coating?2:0};
      const edgeMultiplier=blade==='superfine'?6:1;
      // Solid silver is a fixed Good construction, +1900%; do not also subtract 60% for Good.
      if(material==='silver'){adjustments.quality=0;}
      const total=Object.values(adjustments).reduce((n,v)=>n+v,0);
      cost={rule:'B274; B275; MA216; UT163',regime:'high-tl-percentages',publishedBase:profile.cost,
        materialBase:unknownImportedMaterial?null:costBase,bladeMultiplier:edgeMultiplier,adjustments,
        sumAdjustment:total,multiplier:Math.max(0.2,1+total),minimumMultiplier:0.2,rounding:'none-published'};
      costBase*=edgeMultiplier;
    }
    if(profile.damagePart==='hilt'||profile.damagePart==='shaft'){
      damageBonus=0;materialTransform=null;
      hints.push(profile.damagePart==='shaft'?'Качество, материал и Superfine кромки не меняют Damage древка. LT69; LT71[18].':
        'Качество, материал и Superfine кромки не меняют Damage гарды. LT65; LT71[5].');
    }
  }
  const price=ltImprovisedSource(profile.modeId)&&costBase==null||imported&&!baseline||unknownImportedMaterial?null:cost?
    Number((costBase*cost.multiplier).toPrecision(15)):calculateMeleeCost(costBase,profile.book,modifiers);
  return {level:quality?.level??(imported?'imported':'published'),baseline:baseline??'unknown',
    ...(Number.isInteger(quality?.tl)?{requiredTL:quality.tl,superscience:quality.superscience===true}:{}),
    material:unknownImportedMaterial?'imported-unknown':material,balance:balance?.level??selection.baselineBalance??'published',damageBonus,
    damageTypes,replaceDamageType:quality?.replaceDamageType??null,
    armorDivisor:quality?.armorDivisor??null,skillBonus,price,
    weaponTL,
    ...(profile.ltConstruction?{materialTransform,coating:selection.coating||'',blade,baselineBlade,hints,mass,
      inputSource:publishedInput?'published-selected-mode':imported?'gga-import':'published',
      ...(imported?{importedBaseline:{quality:declaredBaseline,material:selection.baselineMaterial||'unknown',balance:selection.baselineBalance||'unknown'}}:{}),
      cost:cost?{...cost,final:price}:{regime:'low-tl-cf',publishedBase:profile.cost,materialBase:unknownImportedMaterial?null:costBase,modifiers:modifiers.map(m=>m.costFactor??0),sumCF:modifiers.reduce((n,m)=>n+(m.costFactor??0),0),minimumMultiplier:0.2,rounding:'none-published',final:price}}:{}),
    sourcePages:profile.book==='LT'?[...(highTL?['B274','MA216']:['LT14','LT59']),...(profile.ltConstruction?['LT71','B275']:[]),...(blade==='superfine'?['UT163']:[])]:profile.book==='HT'?['B274','HT196','HT198']:['UT163-164']};
}

export function resolveMeleeProfile({actor,attack,selection=null,context=meleeProfileContext(actor,attack)}={}) {
  if(attack?.unarmedRef)return resolveUnarmedAttack(actor,attack,selection??undefined);
  if(!context)return {...attack,weaponStrength:unboundMeleeStrength(actor,attack)};
  selection=selection??context.saved;
  let profile=context.profiles.find(p=>p.modeId===(selection.modeId||context.source.modeId));
  if(!profile)return {...attack,readinessReason:'Выбранный режим не принадлежит этому оружию.'};
  selection=normalizeUTExoticSelection(profile,selection);
  try {
    if(selection.blade==='nanothorn'&&!meleeNanothornAllowed(actor,profile,context.saved))throw Error('Nanothorn не допускается ТУ кампании ниже 11 (UT164).');
    if(!utOrdinaryAllowed(profile,selection))throw Error('Сначала явно выберите модификацию Variable Force Sword за +$500 для этого экземпляра.');
    if(!shieldModeAllowed(profile,selection))throw Error('Для этой атаки требуется явно выбрать установленный шип или кромку данного щита.');
    const same=profile.modeId===context.source.modeId;
    const recordMode=context.record?.modes.find(m=>m.modeId===profile.modeId);
    const manual=recordMode?.overrides??{};
    const grip=selection.grip||'published',gripPolicy=htSpecialGripPolicy(profile)??htOrdinaryGripPolicy(profile)??ltImprovisedGripPolicy(profile)??ltShieldToolGripPolicy(profile)??ltFlexibleGripPolicy(profile)??ltBladeGripPolicy(profile)??ltImpactGripPolicy(profile)??ltPolearmGripPolicy(profile),martial=meleeMartialGrips(profile).includes(grip);
    const chosenSkill=selection.skill||profile.primarySkills[0];
    if(profile.skillAttackModifiers?.[chosenSkill]!==undefined)profile={...profile,attackModifier:profile.skillAttackModifiers[chosenSkill]};
    if(profile.skillStats?.[chosenSkill])profile={...profile,stats:{...profile.stats,...profile.skillStats[chosenSkill]}};
    if(grip==='tip'&&martial){
      if(manual.damage||same&&attack.hasMeleeDamageOverride)throw Error('Хват за остриё нельзя пересчитать поверх ручного Damage.');
      profile={...profile,stats:{...profile.stats,damage:htOrdinarySource(profile.modeId)?htOrdinaryTipDamage(profile):ltBladeTipDamage(profile)}};
    }
    const sourceStats=profile.stats;
    const unarmedSkillBonus=profile.unarmedSkillBonus||profile.damagePart==='hilt'&&profile.primarySkills.includes('Brawling');
    const motion=profile.motion??(/^sw/i.test(sourceStats.damage)?'swing':/^thr/i.test(sourceStats.damage)?'thrust':'fixed');
    const rebuildUnarmed=!!unarmedSkillBonus&&!!selection.skill&&!manual.damage&&!attack.hasMeleeDamageOverride;
    const damage=rebuildUnarmed?sourceStats.damage:grip==='tip'&&martial?sourceStats.damage:same?attack.damage:manual.damage??sourceStats.damage;
    let reach=same?attack.reach:manual.reach??sourceStats.reach;
    const st=same?attack.st:manual.st??sourceStats.st;
    if(selection.quality&&!meleeQualityOptions(actor,profile,context.saved,selection).some(o=>o.level===selection.quality))
      throw Error(profile.ltConstruction?'Выбранное качество не допускается ТУ оружия или источниковым профилем.':
        'Выбранное качество не допускается ТУ кампании или источниковым профилем оружия.');
    if(profile.ltConstruction&&selection.material&&!meleeMaterialOptions(actor,profile,context.saved,selection).includes(selection.material))
      throw Error('Материал не подтверждён для конструкции или заданного ТУ.');
    const publishedInput=!!profile.ltConstruction&&context.imported&&(!same||grip==='tip'&&martial);
    if(profile.ltConstruction&&!profile.utOrdinary&&!profile.shield&&(selection.material||selection.blade||selection.baselineBlade==='superfine')){
      const from=ltMaterialEffect(profile,publishedInput?profile.baselineMaterial:selection.baselineMaterial||profile.baselineMaterial);
      const actual=String(damage??'').split(',')[0].match(/\s+(cr|cut|imp|burn|cor|tox|fat|pi(?:\+\+|\+|-)?)(?=\s|$)/u)?.[1];
      if(actual!==from.type)throw Error('Исходный тип Damage не соответствует материалу. Ручной Damage сохранён.');
    }
    const quality=resolveMeleeQuality(profile,selection,{imported:context.imported,
      manualDamage:!!manual.damage||same&&!!attack.hasMeleeDamageOverride,publishedInput});
    if(profile.neural){
      const installed=selection.neuralSettings?.length?selection.neuralSettings:[selection.neuralSetting].filter(Boolean);
      if(new Set(installed).size!==installed.length||installed.length>6||installed.some(s=>!['agony','ecstasy','stun','paralysis','seizure','death'].includes(s))||!installed.includes(selection.neuralSetting))throw Error('Выберите установленную настройку Neural этого экземпляра.');
      if((installed.length>1||installed.includes('death'))&&(selection.weaponTL??Number.parseInt(profile.techLevel))<11)throw Error('Tunable / high-power Neural требует ТУ11+ (UT165).');
      quality.price=profile.cost*(1+Math.max(0,installed.length-1)*0.5);
    }
    const strength=readActorStrength(actor),actualST=strength.kinds.st.effective;
    const hands=resolveMeleeHands(st,martial?'published':grip,actualST,profile.hands??null,profile.requiresTwoHands);
    const gripEffects={skill:0,damage:0,swingReduction:false,parry:0,conditions:[]};
    if(martial){
      gripEffects.conditions.push(grip==='reversed'&&gripPolicy?.freeReverse?
        'Haladie: свободный выбор обычного/обратного хвата без Ready (LT56).':'Для смены хвата требуется Ready (MA109–112).');
      if(grip==='defensive'||grip==='tip'){
        hands.hands=2;
        const twoHanded=gripPolicy?.twoHanded??true;
        gripEffects.skill=twoHanded?0:-2;
        gripEffects.damage=grip==='tip'?0:twoHanded?0:1;
        gripEffects.swingReduction=grip==='defensive'&&twoHanded&&motion==='swing';
        gripEffects.parry=1;
        gripEffects.conditions.push('Обе руки заняты оружием. Parry показан спереди (+1); сбоку вместо этого суммарный штраф −3 к базовому Parry (MA111; B390).');
        if(grip==='tip'){
          reach='C';gripEffects.conditions.push('Только Thrust за остриё; Swing невозможен. Штраф за щели в доспехе уменьшается на 2 вручную (MA111).');
        }
      }else{
        gripEffects.damage=motion==='thrust'?1:0;
        gripEffects.swingReduction=motion==='swing';gripEffects.parry=-2;
        const hasOne=/1/.test(sourceStats.reach),hasTwo=/2/.test(sourceStats.reach);
        reach=hasOne?hasTwo?'C,1':'C':hasTwo?'1':'C';
        gripEffects.conditions.push('Reach показан спереди и сбоку; назад Reach '+(hasOne||hasTwo?'1':'C')+'. Back Strike и специальные парирования учитываются вручную (MA111–112).');
      }
    }
    const rawSkill=selection.skill||profile.primarySkills[0];
    const importedBaseline=context.imported&&!selection.skill&&same;
    let skill=profile.contactProcedure?{resolved:true,name:'\u041a\u043e\u043d\u0442\u0430\u043a\u0442',level:0,source:'manual-contact'}:importedBaseline?{resolved:true,name:'Импортированный итог GGA',level:attack.level,
      source:'gga-imported-total',directWeaponPenalty:profile.attackModifier,directPenaltyAlreadyIncluded:true}:
      resolveStandaloneSkill({actor,record:context.record??{id:context.key,equipmentSnapshot:context.catalogs?.getEquipment(profile.equipmentId)},mode:{modeId:profile.modeId,
        overrides:{governingSkill:rawSkill},snapshot:{governing_skill:{status:'resolved',skill:{name:profile.primarySkills[0]},attack_modifier:profile.attackModifier},
          defaults:meleeSkillRules(profile,rawSkill)}}});
    const ownerOverride=same?attack.meleeManualOverride:null;
    if(ownerOverride)skill={...skill,resolved:true,level:ownerOverride.skillLevel,source:'owner-override',
      directPenaltyAlreadyIncluded:true};
    const damageSkill=unarmedSkillBonus?{...(profile.technique?techniqueDamageBonus(profile,skill,actor):ltImpactSkillDamage({...profile,unarmedSkillBonus:true},rawSkill,skill,actor)),
      alreadyIncluded:context.imported&&same&&!rebuildUnarmed,
      ...((context.imported&&same&&!rebuildUnarmed||manual.damage||attack.hasMeleeDamageOverride)?{bonusPerDie:0}:{})}:profile.damagePart==='hilt'?{name:'Brawling',source:'LT71[5]; B182',alreadyIncluded:context.imported&&same,
      bonusPerDie:(!context.imported||publishedInput)&&!manual.damage&&!attack.hasMeleeDamageOverride&&skill.source==='learned'&&rawSkill==='Brawling'&&
        Number(skill.sourceLevel??skill.level)>=Number(actor?.system?.attributes?.DX?.value)+2?1:0}:null;
    const attackOnly=importedBaseline||ownerOverride?0:profile.attackOnlyModifier??0;
    const weaponStrength=resolveProfileWeaponStrength({actor,attack,profile,context,selection,skill,importedBaseline,ownerOverride,st,hands,martial,motion});
    const additional=quality.skillBonus+gripEffects.skill+attackOnly;
    const levelBeforeStrength=skill.resolved?skill.level+additional:null;
    const level=projectMeleeStrength(levelBeforeStrength,weaponStrength);
    const projectedStrengthDelta=weaponStrength.proposedDelta??0;
    const defenseLevel=level===null?null:level-attackOnly;
    let parry=same?attack.parry:manual.parry??sourceStats.parry;
    if(ownerOverride){
      parry=ownerOverride.parry;
      if(additional&&/^\d+[UF]*$/i.test(parry))parry=parry.replace(/^\d+/,v=>String(Number(v)+Math.floor(level/2)-Math.floor(skill.level/2)));
    }else if(!importedBaseline){
      const match=/^([+-]?\d+)([UF]*)$/i.exec(manual.parry??sourceStats.parry);
      if(match&&defenseLevel!==null)parry=String(3+Math.floor(defenseLevel/2)+Number(match[1])-(profile.parrySkillAlreadyIncluded??0))+match[2];
    }else if((additional||projectedStrengthDelta)&&/^\d+[UF]*$/i.test(parry))parry=parry.replace(/^\d+/,v=>String(Number(v)+Math.floor(level/2)-Math.floor(attack.level/2)));
    if(gripEffects.parry&&/^\d+[UF]*$/i.test(parry))parry=parry.replace(/^\d+/,v=>String(Number(v)+gripEffects.parry));
    // LT63: this is the user's hand, not the improvised object or its attack technique.
    if(!importedBaseline&&!ownerOverride)parry=publishedHandParry(profile,rawSkill,skill,actor)??parry;
    if((profile.modelId==='lt:tonfa'||profile.betterHandParry)&&!ownerOverride){
      const levels=[];const visit=tree=>{for(const entry of Object.values(tree??{}))if(entry&&typeof entry==='object'){
        if(['Brawling','Karate'].includes(entry.name)&&Number(entry.points)>0&&Number.isFinite(Number(entry.level??entry.import)))levels.push(Number(entry.level??entry.import));
        visit(entry.contains);visit(entry.collapsed);
      }};visit(actor?.system?.skills);
      if(levels.length&&/^\d+$/.test(parry))parry=String(Math.max(Number(parry),3+Math.floor(Math.max(...levels)/2)));
    }
    const resolved={version:1,weaponId:attack.standaloneRef?.weaponId??context.key,equipmentId:profile.equipmentId,
      modeId:profile.modeId,sourcePages:profile.sourcePages,quality,grip,gripEffects,damageSkill,
      damagePart:profile.damagePart??null,...(profile.utExotic?{utExotic:{modelId:profile.modelId,instructionOnly:!!profile.instructionOnly,resistanceEffect:utExoticEffect(profile,selection),linked:!!profile.linked,tightBeam:!!profile.tightBeam,contactOnly:!!profile.contactOnly,contactProcedure:!!profile.contactProcedure,manualLinkedAction:profile.manualLinkedAction??null}}:{}),...(profile.utOrdinary?{utOrdinary:{modelId:profile.modelId,energy:profile.energy===true,unpowered:profile.unpowered===true,variable:selection.blade==='variable-force-sword',partialSpecial:profile.partialSpecial===true,sourceTL:profile.techLevel}}:{}),...(profile.htSpecial?{htSpecial:{modelId:profile.modelId,instructionOnly:profile.instructionOnly===true,resistanceEffect:profile.resistanceEffect??null,manualLinkedAction:profile.manualLinkedAction??null,spray:profile.spray===true}}:{}),manualHints:profile.utExotic?utExoticHints(profile):profile.utOrdinary?utOrdinaryHints(profile):htSpecialSource(profile.modeId)?htSpecialHints(profile):htOrdinarySource(profile.modeId)?htOrdinaryHints(profile):ltImprovisedSource(profile.modeId)?ltImprovisedHints(profile):ltShieldToolGripPolicy(profile)?ltShieldToolHints(profile):ltFlexibleGripPolicy(profile)?ltFlexibleHints(profile):ltBladeGripPolicy(profile)?ltBladeHints(profile):ltPolearmGripPolicy(profile)?ltPolearmHints(profile):ltImpactHints(profile),
      ...(profile.damageCap?{damageCap:profile.damageCap}:{}),
      ...(profile.attackOnlyModifier?{attackOnlyModifier:profile.attackOnlyModifier,attackOnlyAlreadyIncluded:importedBaseline||!!ownerOverride}:{}),
      ...(profile.occupiedHands?{occupiedHands:profile.occupiedHands}:{}),
      motion,
      skill:{...skill,entry:undefined,candidates:undefined},attackLevel:level,levelBeforeStrength,projectedStrengthDelta,weaponStrength,directWeaponPenalty:profile.attackModifier,
      applyArmST:selection.applyArmST??attack.applyArmST===true,
      strength:{...hands,actualST,penaltyAlreadyIncluded:importedBaseline||!!ownerOverride},damageExpression:damage,reach,parry,
      conditions:[hands.ready,...gripEffects.conditions].filter(Boolean)};
    return {...attack,...(attack.equipmentRef?{equipmentRef:{...attack.equipmentRef,governingSkill:skill}}:{}),mode:profile.usage??attack.mode,label:profile.usage?attack.name+' – '+profile.usage:attack.name,
      level,damage,reach,parry,st,meleeProfile:resolved,applyArmST:resolved.applyArmST,
      skillDescription:(ownerOverride?'Ручной итог: '+level:importedBaseline?'Итог GGA: '+level:standaloneSkillDescription({...skill,level}))+(weaponStrength.reason?' '+weaponStrength.reason:''),
      ...(attack.standaloneRef?{standaloneRef:{...attack.standaloneRef,modeId:profile.modeId,governingSkill:skill}}:{}),
      data:{...attack.data,damage,reach,parry,st,level},
      readinessReason:hands.reason??(!skill.resolved?skill.reason:null)??(same&&!profile.contactProcedure?attack.readinessReason:null)};
  }catch(error){return {...attack,readinessReason:error.message,meleeProfileError:error.message};}
}

export class MeleeProfileService {
  constructor(actor){this.actor=actor;}
  reset(attack,{expectedRevision=state(this.actor).revision??0}={}) {
    return withActorResourceWrite(this.actor,async()=>{
      if(!this.actor?.isOwner&&!globalThis.game?.user?.isGM)throw Error('Нет прав на изменение оружия персонажа.');
      const current=copy(state(this.actor)),key=meleeProfileKey(attack);
      if(!key||(current.revision??0)!==expectedRevision)throw Error('Настройки уже изменены. Откройте редактор заново.');
      current.profiles??={};
      current.profiles[key]={...current.profiles[key],sourceModeId:null,modeId:null,grip:'published',quality:'',balance:'',skill:'',
        material:'',coating:'',baselineMaterial:'',baselineBalance:'',baselineQuality:null,anchor:null,applyArmST:false,
        weaponTL:null,blade:'',baselineBlade:''};
      current.revision=(current.revision??0)+1;await this.actor.setFlag(scope,MELEE_PROFILE_FLAG,current);
    });
  }
  save(attack,selection,{context=meleeProfileContext(this.actor,attack),expectedRevision=state(this.actor).revision??0}={}) {
    return withActorResourceWrite(this.actor,async()=>{
      if(!this.actor?.isOwner&&!globalThis.game?.user?.isGM)throw Error('Нет прав на изменение оружия персонажа.');
      if(!context?.key)throw Error('Источниковый профиль оружия не определён.');
      if(attack.equipmentRef)assertShieldEquipmentReference(this.actor,attack.equipmentRef);
      if(attack.standaloneRef){
        const live=this.actor.getFlag(scope,'standaloneWeapons')?.weapons?.find(w=>w.id===attack.standaloneRef.weaponId);
        if(!live||live.revision!==context.record?.revision||live.source.equipmentId!==context.source.equipmentId)
          throw Error('Оружие уже изменено или удалено. Откройте редактор заново.');
      }
      const current=copy(state(this.actor));
      if((current.revision??0)!==expectedRevision)throw Error('Настройки уже изменены. Откройте редактор заново.');
      const previous=context.source.ltConstruction?current.profiles?.[context.key]??current.profiles?.[attack?.equipmentRef?.legacyProfileKey]??{}:{};
      selection=normalizeUTExoticSelection(context.source,{...previous,...selection});
      const value={...previous,sourceModeId:context.source.modeId,modeId:selection.modeId||context.source.modeId,
        grip:selection.grip||'published',quality:selection.quality||'',balance:selection.balance||'',skill:selection.skill||'',
        weaponTL:meleeWeaponTL(selection),
        ...(context.source.utExotic?{neuralSetting:selection.neuralSetting||null,neuralSettings:selection.neuralSettings??[],waterConnected:selection.waterConnected===true}:{}),
        ...(context.source.ltConstruction?{material:selection.material||'',coating:selection.coating||'',
          baselineMaterial:selection.baselineMaterial||'',baselineBalance:selection.baselineBalance||'',
          blade:selection.blade||'',baselineBlade:selection.baselineBlade||''}:{}),
        applyArmST:selection.applyArmST??attack.applyArmST===true,
        baselineQuality:selection.baselineQuality||null,
        ...(context.imported?{anchor:{name:attack.name,reference:text(attack.data?.pageref)}}:{})};
      const resolved=resolveMeleeProfile({actor:this.actor,attack,selection:value,context});
      if(resolved.readinessReason)throw Error(resolved.readinessReason);
      current.profiles??={};current.profiles[context.key]=value;current.revision=(current.revision??0)+1;
      await this.actor.setFlag(scope,MELEE_PROFILE_FLAG,current);return resolved;
    });
  }
}
