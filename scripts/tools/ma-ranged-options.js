import { ltBowProfile } from '../lt-bow-source.js';
import { ltPersonalProfile } from '../lt-personal-source.js';
import { readActorStrength } from './strength-service.js';
import { hasCombatTrait, learnedMeleeSkills } from './melee-penalty-techniques.js';
import { finiteLevel, objectSkillRows } from './combat-technique-data.js';
import { allowsCinematicTechniqueDefaults } from './combat-technique-preference.js';

// Exact LT source modes or an explicitly bound native skill and one-use feed.
export function maRangedKinds(attack, skill) {
  const id=attack?.standaloneRef?.modeId??attack?.catalogBinding?.modeId;
  const bow=ltBowProfile(id);
  const personal=ltPersonalProfile(id);
  const nativeFeed=String(attack?.data?.shots??attack?.shots??'').trim();
  if(bow?.kind==='bow')return ['quickBow'];
  if(personal?.kind==='thrown'||!id&&/^thrown weapon\b/i.test(skill?.name??'')&&/^T\(1\)$/i.test(nativeFeed))
    return ['thrownSequence','thrownBurst'];
  if(!id&&/^bow$/i.test(skill?.name??'')&&/^1\(2\)$/.test(nativeFeed))return ['quickBow'];
  return [];
}

function weaponMaster(actor, attack, skill, family) {
  return hasCombatTrait(actor,'Weapon Master',skill,attack) ||
    objectSkillRows(actor?.system?.ads).some(row => row.disabled!==true&&row.active!==false&&
      [row.name,row.originalName].some(name=>/^weapon master\b/i.test(name??'')&&
        (/\(all (?:muscle-powered )?weapons\)/i.test(name)||name.toLowerCase()==='weapon master'&&Number(row.points)===45||
          family==='bow'&&/\(bows?\)/i.test(name))));
}

export function quickBowPlan({actor,attack,skill,moveAndAttack,allOutAttack,fastDraw,realistic,drawDeficit=0}) {
  const heroic=hasCombatTrait(actor,'Heroic Archer');
  const master=weaponMaster(actor,attack,skill,'bow');
  const penalty=(heroic&&master?-1:heroic||master?-3:-6)-(realistic?4:0)-drawDeficit;
  const drawSkill=learnedMeleeSkills(actor).filter(row=>/^fast-draw\s*\(arrow\)$/i.test(row.name))
    .reduce((best,row)=>Math.max(best,finiteLevel(row)),-Infinity);
  if(moveAndAttack&&!heroic||!Number.isFinite(skill?.level)||fastDraw&&!Number.isFinite(drawSkill))return null;
  return {kind:'quickBow',penalty,draw:skill.level+penalty+(allOutAttack?1:0),heroic,master,
    attackAccuracy:heroic&&!moveAndAttack?Number(attack.acc)||0:0,
    fastDraw:fastDraw?drawSkill-(realistic?4:0)-(moveAndAttack?1:0):null,
    drawDeficit,source:'MA97, MA119-120; LT75, B270'};
}

export function thrownSequencePlan({actor,attack,skill,count,weight,ready,hand,confirmedPreparation=false}) {
  if(!allowsCinematicTechniqueDefaults()||!Number.isSafeInteger(count)||count<2||ready<count)return null;
  if(!confirmedPreparation&&(
    !Number.isFinite(weight)||weight<=0||!Number.isInteger(ready)||ready<count||
    ready>(weight<1?4:1)*(hand==='both'?2:1)))return null;
  const master=weaponMaster(actor,attack,skill,'thrown');
  return {kind:'thrownSequence',count,weight,penalty:(master?-3:-6)*(count-1),source:'MA120-121'};
}

export function throwingArtRangeMultipliers(attack, profile=null) {
  const source=attack?.ltPersonalOverrides?.range??
    ltPersonalProfile(attack?.standaloneRef?.modeId??attack?.catalogBinding?.modeId)?.range??
    profile?.raw?.range??attack?.data?.range;
  const match=/^x(\d+(?:\.\d+)?)\/x(\d+(?:\.\d+)?)$/i.exec(
    String(source??'').trim().replaceAll('×','x').replaceAll('¥','x'));
  return match?.slice(1).map(Number)??null;
}

export function thrownBurstPlan({actor,attack,selection,profile,count}) {
  const weight=Number(selection.weight),strength=readActorStrength(actor).derivedST;
  const liftingST=strength.lifting;
  if(!Number.isFinite(weight)||weight<=0||!Number.isFinite(liftingST)||liftingST<=0||
    !Number.isInteger(count)||count<2||!selection.ready||weight>=1)return null;
  const lift=liftingST>=10?Math.round(liftingST**2/5):liftingST**2/5;
  const cinematic=allowsCinematicTechniqueDefaults();
  const maxWeight=lift/(selection.container?2:selection.sharp&&!cinematic?50:20);
  if(count*weight>maxWeight+1e-9)return null;
  const dx=Number(actor?.system?.attributes?.DX?.value),learned=learnedMeleeSkills(actor);
  const art=learned.find(row=>/^throwing art$/i.test(row.name));
  const throwing=Math.max(dx-3,...learned.filter(row=>/^throwing$/i.test(row.name)).map(finiteLevel));
  const useArt=selection.throwingArt===true&&!!art;
  const level=useArt?finiteLevel(art):throwing;
  if(!Number.isFinite(level))return null;
  const range=String(profile?.effective?.range??attack?.data?.range??'').split('/').map(Number);
  const damage=/^(\d+)d(?:6)?([+-]\d+)?(.*)$/.exec(profile?.damage?.formula??attack?.data?.damage??'');
  if(!damage)return null;
  const artBonus=useArt?Math.min(2,Math.max(0,level-dx+1)):0;
  const dice=Number(damage[1]), adds=Number(damage[2]??0)-dice*(count<=4?1:2)+dice*artBonus;
  const factor=count<=4?2/3:1/3;
  const effectiveST=profile?.damage?.rules?.ltPersonal?.range?.st??strength.effective;
  const multipliers=throwingArtRangeMultipliers(attack,profile);
  const manual=String(selection.rangeWithArt??'').trim();
  if(artBonus&&!multipliers&&!/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(manual))return null;
  const attackRange=multipliers&&Number.isFinite(effectiveST)?multipliers.map(n=>n*(effectiveST+artBonus)):
    artBonus?manual.split('/').map(Number):range;
  if(attackRange.length!==2||!attackRange.every(n=>Number.isFinite(n)&&n>0)||attackRange[0]>attackRange[1])return null;
  return {kind:'thrownBurst',level,skill:useArt?'Throwing Art':'Throwing',acc:0,rof:count,rcl:2,
    bulk:selection.container?-6:-2, count, maxWeight,
    damage:dice+'d'+(adds?(adds>0?'+':'')+adds:'')+damage[3],
    range:attackRange.map(n=>Math.floor(n*factor)).join('/'),
    ...(artBonus?{artRangeSource:multipliers?'ST multiplier':'confirmed Throwing Art range'}:{}),source:'MA120, B226, B373'};
}

export function projectThrownBurst(attack, burst) {
  if(!burst)return attack;
  return {...attack,maThrownBurst:true,level:burst.level,acc:0,rof:String(burst.rof),rcl:2,
    platformRules:{...attack.platformRules,rclNotApplicable:false},
    data:{...attack.data,damage:burst.damage,range:burst.range,halfd:Number(burst.range.split('/')[0]),
      acc:0,accuracy:0,bulk:burst.bulk,rcl:2,rof:String(burst.rof)}};
}

export function resolveMaRangedPlan(actor, attack, skill, values, profile=null) {
  const selection=values?.maRanged;
  if(!selection?.kind||!maRangedKinds(attack,skill).includes(selection.kind))return null;
  if(selection.kind==='quickBow')return quickBowPlan({actor,attack,skill,moveAndAttack:values.moveAndAttack,
    allOutAttack:values.allOutAttack&&!values.moveAndAttack,fastDraw:selection.fastDraw,realistic:selection.realistic,
    drawDeficit:profile?.damage?.rules?.ltBow?.drawing?.drawDeficit??0});
  if(selection.kind==='thrownSequence')return thrownSequencePlan({actor,attack,skill,
    count:Number(selection.count),weight:Number(selection.weight),ready:selection.ready?Number(selection.count):0,
    hand:selection.hand,confirmedPreparation:selection.ready===true});
  return thrownBurstPlan({actor,attack,selection,profile,count:Number(selection.count)});
}

export function readiedThrowFeed(weapon, ammunition, requestedKey=ammunition?.ammoKey) {
  if(ltPersonalProfile(weapon)?.kind!=='thrown'||ammunition?.kind!=='physical-magazine'||
    !ammunition.magazineId||!requestedKey)return null;
  const stock=weapon.ammunitionInventory?.stocks.find(entry=>entry.key===requestedKey);
  if(!stock)return null;
  const loaded=ammunition.ammoKey===requestedKey?ammunition.available:0;
  return {loaded,stock:stock.rounds,available:loaded+stock.rounds,ammoKey:requestedKey,type:stock.type};
}
