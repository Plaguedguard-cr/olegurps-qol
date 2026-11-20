import {createTargetedAttackContext, createMeleeTargetedAttackContext} from './combat-technique-targeted.js';
import {resolveRangedRapidStrike} from './ranged-rapid-strike-resolver.js';
import {resolveCloseQuartersBattle, getCloseQuartersBattleRange} from './close-quarters-battle-resolver.js';
import {resolveCloseHipShooting, findCloseHipShooting} from './close-hip-shooting-resolver.js';
import {resolveProfileTechnique, resolveBasicKickDefault} from './combat-technique-unarmed.js';
import {ltImprovisedSource} from '../lt-improvised-source.js';
import {finiteLevel, relativeLevel, readCombatTechniqueSkills} from './combat-technique-data.js';
import {evaluateMeleePenalty,evaluateCombatRiding,resolveMeleeTechniquePlan as buildMeleeTechniquePlan} from './melee-penalty-techniques.js';
import {resolveCombination} from './melee-technique-sequences.js';
import {evaluateMeleeStrike} from './melee-strike-techniques.js';
import {MA_SPECIAL_RULES} from './melee-special-data.js';
import {evaluateMeleeSpecial} from './melee-special-techniques.js';
export {readCombatTechniqueSkills} from './combat-technique-data.js';

// The only rule registry. Compatibility APIs, panel rows and channel replacements
// all reference these descriptors. Specialized algorithms deliberately retain
// their original precedence, matching, clamps and null/default behavior.
const CHANNEL_RULES = [
  {
    id: "weaponBond", combatType: "both", kind: "perk", activation: "weapon-setting",
    channel: "weaponBond", priority: 10, affectedChannels: ["weaponBond"],
    when: c => c.weaponBond === true,
    resolve: ({context:c}) => ({ value: c.weaponBondAdjustment??1, source: "weapon-bond", label: "Weapon Bond" })
  },
  {
    id: "rangedRapidStrike", combatType: "ranged", kind: "combat-option", activation: "manual",
    calculate: resolveRangedRapidStrike,
    channel: "rangedRapidStrike", priority: 10, affectedChannels: ["rangedRapidStrike"],
    when: c => !!c.rapidStrike && !c.rapidStrike.quickShotEntry,
    resolve: () => ({ value: -6, source: "ranged-rapid-strike", label: "Ranged Rapid Strike" })
  },
  {
    id: "quickShot", combatType: "ranged", kind: "learned-technique", activation: "option-dependent",
    channel: "rangedRapidStrike", priority: 30, affectedChannels: ["rangedRapidStrike"],
    when: c => !!c.rapidStrike?.quickShotEntry,
    resolve: ({ context: c }) => ({ value: c.rapidStrike.penalty,
      source: "quick-shot", label: c.rapidStrike.quickShotLabel ?? "Quick-Shot",
      explanation: "Ranged Rapid Strike -6 -> Quick-Shot " + c.rapidStrike.penalty })
  },
  {
    id: "rangedTargetedAttack", combatType: "ranged", kind: "learned-technique",
    activation: "automatic", channel: "hitLocation", priority: 30,
    affectedChannels: ["hitLocation"], when: c => !!c.targetedAttack,
    resolve: ({ context: c }) => ({ value: c.targetedAttack.effectivePenalty,
      source: "targeted-attack", label: c.hitLocationLabel,
      explanation: "Hit Location " + c.hitLocationBase + " -> Targeted Attack " + c.targetedAttack.effectivePenalty })
  },
  {
    id: "closeQuartersBattle", combatType: "ranged", kind: "learned-technique",
    activation: "automatic", channel: "moveAndAttack", priority: 30,
    affectedChannels: ["moveAndAttack"], when: c => !!c.closeQuartersBattle,
    resolve: ({ context: c }) => ({ value: c.closeQuartersBattle.effectivePenalty,
      source: "close-quarters-battle", label: c.closeQuartersBattleLabel,
      explanation: "Move and Attack " + c.moveAttackBase + " -> CQB " + c.closeQuartersBattle.effectivePenalty })
  },
  {
    id: "closeHipShooting", combatType: "ranged", kind: "learned-technique",
    activation: "manual", channel: "closeCombatBulk", priority: 30,
    affectedChannels: ["closeCombatBulk"], when: c => !!c.closeHipShooting,
    resolve: ({ context: c }) => ({ value: c.closeHipShooting.effectivePenalty,
      source: "close-hip-shooting", label: c.closeHipLabel,
      explanation: "Close Combat Bulk " + c.closeCombatBulkBase + " -> Close-Hip Shooting " + c.closeHipShooting.effectivePenalty })
  },
  {
    id: "meleeTargetedAttack", combatType: "melee", kind: "learned-technique",
    activation: "automatic", channel: "hitLocation", priority: 30,
    affectedChannels: ["hitLocation"], when: c => !!c.targetedAttack,
    resolve: ({ context: c }) => ({ value: c.targetedAttack.effectivePenalty,
      source: "targeted-attack", label: c.hitLocationLabel,
      explanation: "Hit Location " + c.hitLocationBase + " -> Targeted Attack " + c.targetedAttack.effectivePenalty })
  },
  {
    id: "rapidStrike", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "rapidStrike", priority: 10, affectedChannels: ["rapidStrike"],
    when: c => !!c.rapidStrikePenalty,
    resolve: ({ context: c }) => ({ value: c.rapidStrikePenalty,
      label: c.rapidStrikePenalty === -3 ? "Rapid Strike (WM / TBaM)" : "Rapid Strike",
      metadata: { rapidStrikePenalty: c.rapidStrikePenalty } })
  },
  {
    id: "telegraphicAttack", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "telegraphicAttack", priority: 30, affectedChannels: ["telegraphicAttack"],
    incompatibilities: ["deceptiveAttack", "evaluate"], when: c => !!c.telegraphicAttack,
    resolve: () => ({ value: 4, label: "Telegraphic Attack",
      metadata: { defenseModifier: 2, excludesCriticalBonus: 4 } })
  },
  {
    id: "deceptiveAttack", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "deceptiveAttack", priority: 20, affectedChannels: ["deceptiveAttack"],
    incompatibilities: ["telegraphicAttack"], when: c => !!c.deceptivePenalty,
    resolve: ({ context: c }) => ({ value: c.deceptivePenalty,
      label: "Deceptive Attack", metadata: { defenseModifier: -Math.abs(c.deceptivePenalty) / 2 } })
  },
  {
    id: "evaluate", combatType: "melee", kind: "contextual", activation: "contextual",
    channel: "evaluate", priority: 10, affectedChannels: ["evaluate"],
    incompatibilities: ["telegraphicAttack"], when: c => !!c.evaluateBonus,
    resolve: ({ context: c }) => ({ value: c.evaluateBonus, label: "\u041e\u0446\u0435\u043d\u043a\u0430" })
  },
  {
    id: "moveAndAttack", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "moveAndAttack", priority: 10, affectedChannels: ["moveAndAttack"],
    when: c => !!c.moveAndAttack,
    resolve: () => ({ value: -4, label: "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0438 \u0430\u0442\u0430\u043a\u0430" })
  },
  {
    id: "allOutDetermined", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "maneuverAttackBonus", priority: 10, affectedChannels: ["maneuverAttackBonus"],
    when: c => !!c.allOutAttack && c.allOutAttackMode === "determined" && !c.moveAndAttack,
    resolve: () => ({ value: 4, label: "\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430 (\u0422\u043e\u0447\u043d\u0430\u044f)" })
  },
  {
    id: "committedDetermined", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "maneuverAttackBonus", priority: 10, affectedChannels: ["maneuverAttackBonus"],
    when: c => !!c.committedAttack && c.committedMode === "determined" && !c.allOutAttack && !c.moveAndAttack,
    resolve: () => ({ value: 2, label: "Committed Attack (Determined)" })
  },
  {
    id: "committedSteps", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "committedSteps", priority: 10, affectedChannels: ["committedSteps"],
    when: c => !!c.committedAttack && !!c.committedSteps && !c.allOutAttack && !c.moveAndAttack,
    resolve: () => ({ value: -2, label: "Committed Attack (2 steps)" })
  }
];

const targeted = factory => ({
  createContext: factory,
  calculate: options => (options.techniqueContext ?? factory(options)).resolve(options),
  baseSkills: 'Exact selected governing skill; legacy GGA binding policy retained',
  specialization: ['governing-skill', 'attack-variant', 'hit-location'],
  levelPolicy: { default: 'hit-location penalty', maximum: 'half penalty rounded down', learned: 'relative before absolute' },
  restrictions: ['Exact attack descriptor', 'Matching target', 'No unconfirmed parent substitution'],
  interactions: { operation: 'replace', channel: 'hitLocation', stacking: 'once' },
  snapshot: 'Existing targetedAttack and calculation channel; no schema migration'
});
const profileTechnique = (name, defaultPenalty) => ({
  calculate: ({actor, profile}) => profile?.technique === name && ltImprovisedSource(profile.modeId)?.technique === name
    ? resolveProfileTechnique(actor, profile) : null,
  baseSkills: name === 'Kicking' ? ['DX', 'Brawling', 'Karate'] : ['Brawling', 'Karate'],
  specialization: ['Brawling or Karate when named'], weaponBinding: 'Existing LT modeId only',
  levelPolicy: { default: defaultPenalty, maximum: 'base skill', learned: 'points>0 or learned=true; absolute level' },
  restrictions: ['Only published LT profiles', 'No recursive defaults', 'No universal technique-as-skill'],
  interactions: { operation: 'base-skill', directWeaponPenalty: 'once', damageBonus: 'base Brawling/Karate only' },
  snapshot: 'Existing meleeSnapshot.combatProfile.skill'
});
const TECHNIQUE_ADAPTERS = {
  rangedTargetedAttack: { name: 'Targeted Attack (Ranged)', sources: ['HT252', 'TS45', 'MA68'],
    ...targeted(createTargetedAttackContext),
    restrictions: ['Matching Guns specialty and TL', 'Unambiguous learned parent', 'Matching target'] },
  meleeTargetedAttack: { name: 'Targeted Attack (Melee)', sources: ['MA68'], ...targeted(createMeleeTargetedAttackContext) },
  quickShot: { name: 'Quick-Shot', sources: ['HT252', 'TS45'], calculate: resolveRangedRapidStrike,
    baseSkills: ['Guns'], specialization: ['Guns specialty'],
    levelPolicy: { default: -6, maximum: 0, learned: 'relative before absolute' },
    restrictions: ['Selected learned Guns', 'Legacy specialty matching'],
    interactions: { operation: 'replace', channel: 'rangedRapidStrike', stacking: 'once; never add to -6' },
    snapshot: 'Existing rapidStrike and rangedRapidStrike channel' },
  closeQuartersBattle: { name: 'Close-Quarters Battle', sources: ['HT250', 'TS43'], calculate: resolveCloseQuartersBattle,
    baseSkills: ['Guns'], specialization: ['Guns specialty'],
    levelPolicy: { default: 0, maximum: 4, learned: 'relative before absolute' },
    restrictions: ['Move and Attack', 'Known distance <= Per + Acute Vision', 'Selected learned Guns'],
    interactions: { operation: 'replace', channel: 'moveAndAttack', cap: 'weapon attack level', stacking: 'Bulk/movement once' },
    snapshot: 'Existing closeQuartersBattle and moveAndAttack channel' },
  closeHipShooting: { name: 'Close-Hip Shooting', sources: ['TS43'], calculate: resolveCloseHipShooting, find: findCloseHipShooting,
    baseSkills: ['Guns'], specialization: ['Guns specialty'],
    levelPolicy: { default: 0, maximum: 3, learned: 'absolute before relative' },
    restrictions: ['Manually enabled', 'Selected learned Guns', 'Finite Bulk'],
    interactions: { operation: 'replace', channel: 'closeCombatBulk', cap: 'weapon attack level', stacking: 'Bulk once' },
    snapshot: 'Existing closeHipShooting and closeCombatBulk channel' },
  hammerFist: { name: 'Hammer Fist', sources: ['LT64', 'MA73'], ...profileTechnique('Hammer Fist', -1) },
  kicking: { name: 'Kicking', sources: ['LT149', 'B231', 'MA75'], ...profileTechnique('Kicking', -2) }
};

const OTHER_RULES = [
  { id: 'hammerFist', combatType: 'melee', kind: 'learned-technique', activation: 'profile-dependent' },
  { id: 'kicking', combatType: 'melee', kind: 'learned-technique', activation: 'profile-dependent' },
  { id: 'basicKick', name: 'Kick (Basic Set)', combatType: 'melee', kind: 'attack-mode', activation: 'profile-dependent',
    sources: ['B271', 'B274'], calculate: resolveBasicKickDefault,
    restrictions: ['Existing BS kick profiles only', 'Learned Kicking is not applied to BS projections'],
    interactions: { operation: 'base-skill', stacking: 'default kick penalty and encumbrance once' } },
  ...[['defensiveGrip', 'Defensive Grip', 'defensive', 'MA109'],
    ['reversedGrip', 'Reversed Grip', 'reversed', 'MA111'],
    ['tipGrip', 'Tip Grip (Thrust)', 'tip', 'MA111']].map(([id,name,grip,source]) => ({
    id, name, grip, combatType: 'melee', kind: 'grip', activation: 'weapon-setting', sources: [source],
    handler: 'MeleeProfileService (existing gripEffects, Reach, Parry, Damage)',
    restrictions: ['Only individually supported source profiles', 'Ready is advisory', 'Not learned Reverse Grip (MA78)'],
    calculate: c => c.availableGrips?.includes(grip) ? {grip, available: true} : null
  })),
  {id:'allOutDouble',name:'All-Out Attack (Double)',combatType:'melee',kind:'maneuver',sources:['B365'],handler:'Existing melee attack slots'},
  {id:'allOutStrong',name:'All-Out Attack (Strong)',combatType:'melee',kind:'maneuver',sources:['B365'],handler:'applyAllOutAttackStrong'},
  {id:'committedStrong',name:'Committed Attack (Strong)',combatType:'melee',kind:'maneuver',sources:['MA99'],handler:'Existing martial damage resolver'},
  {id:'defensiveAttack',name:'Defensive Attack',combatType:'melee',kind:'maneuver',sources:['MA100'],handler:'Existing martial damage resolver'}
];

// MA-PENALTY-1: these are entries in the SAME registry, not an independent catalog.
const meleePenalty=(id,name,page,defaultModifier,penaltyChannel,extra={})=>({
 id,name,sources:['MA'+page],combatType:'melee',kind:'learned-technique',activation:'contextual',meleePenalty:true,
 baseGroup:'combat',defaultModifier,maximum:0,penaltyChannel,operation:'REPLACE',allowsDefaultParent:true,
 baseSkills:'Melee Weapon / unarmed combat; exact learned parent',specialization:'Exact parent skill; weapon/letter where required',
 prerequisites:'Learned prerequisite skill; rule-specific context checked by calculate',
 levelPolicy:{default:defaultModifier,maximum:0,learned:'exact prerequisite specialty; relative before absolute'},
 restrictions:['Exact learned parent; no default transfer between weapon skills'],
 interactions:{operation:'replace',channel:penaltyChannel,combination:'explicit allowed pairs, MA64'},
 snapshot:'profile.damage.rules.meleeTechniques',...extra,
 calculate:options=>evaluateMeleePenalty(getCombatRule(id),{...options,combatRidingRule:getCombatRule('combatRiding')})
});
const MELEE_PENALTY_RULES=[
 {id:'combatRiding',name:'Combat Riding',sources:['MA69'],combatType:'melee',kind:'learned-technique',auxiliary:true,operation:'CONTEXT',activation:'mounted-cap',
  baseSkills:['Riding'],specialization:'Exact Riding mount specialty',defaultModifier:0,maximum:4,
  levelPolicy:{default:0,maximum:4},restrictions:['Cap only; no Riding control/Ready action in Melee Assistant'],snapshot:'profile.damage.rules.meleeTechniques.results.capEvidence',
  calculate:options=>evaluateCombatRiding(getCombatRule('combatRiding'),options)},
 {id:'combination',name:'Combinations',sources:['MA80–81','MA127'],combatType:'melee',kind:'learned-technique',operation:'SEQUENCE',activation:'sequence',
  baseSkills:'Underlying exact skills of every fixed Targeted Attack',specialization:'Fixed attack/target/order and hand recipe',
  levelPolicy:{default:'Split levels; -6/-12 or two hands -4/-9; halve only eligible portions',maximum:'Every portion at most underlying attack',points:'Hard plus attack count; common improvement'},
  restrictions:['No extra Rapid Strike or DWA replacement','Realistic third attack needs 5 points','Ready/stuck and setup requirements preserved'],
  snapshot:'profile.damage.rules.meleeSequence.definition',
  defaultModifier:'-6/-12; two hands -4/-9; cinematic half rounded down',maximum:'underlying fixed attacks',
  calculate:options=>{const r=resolveCombination(options);return {id:'combination',name:'Combinations',...r,reason:r.errors.join(' ')||null};}},
 meleePenalty('attackFromAbove','Attack from Above',67,-2,'techniqueAbove'),
 meleePenalty('backKick','Back Kick',67,-4,'techniqueStrike',{baseSkills:['Karate']}),
 meleePenalty('backStrike','Back Strike',67,-2,'techniqueRear',{baseGroup:'weapon'}),
 meleePenalty('cavalryTraining','Cavalry Training',69,-2,'techniqueMounted',{baseGroup:'weapon'}),
 meleePenalty('closeCombat','Close Combat',69,-4,'techniqueCloseCombat',{baseGroup:'weapon',maximum:'half default'}),
 meleePenalty('groundFighting','Ground Fighting',73,-4,'techniquePosture'),
 meleePenalty('lowFighting','Low Fighting',77,-2,'techniquePosture'),
 meleePenalty('fightingWhileSeated','Fighting While Seated',83,-2,'techniquePosture',{cinematic:true}),
 meleePenalty('crack','Crack',70,-4,'techniqueCrack',{baseSkills:['Whip']}),
 meleePenalty('pressurePointStrike','Pressure-Point Strike',87,-2,'techniquePressure',{cinematic:true}),
 meleePenalty('reverseGrip','Reverse Grip',78,-6,'techniqueGrip',{baseGroup:'weapon',operation:'CONTEXT'}),
 meleePenalty('dualWeaponAttack','Dual-Weapon Attack',83,-4,'techniqueDwa',{cinematic:true}),
 meleePenalty('initialCarving','Initial Carving',85,-4,'techniqueCarving',{baseGroup:'weapon',cinematic:true}),
];

const strike=(id,name,title,page,defaults,part,properties={})=>{
 const {maximum=0,cinematic=false,layer='techniqueStrike',aliases,...strikeProfile}=properties;
 return {...meleePenalty(id,name,page,Object.values(defaults)[0],layer,{
   title,baseSkills:Object.keys(defaults),maximum,cinematic,allowsDefaultParent:id==='headButt',...(aliases?{aliases}:{}),
   levelPolicy:{default:defaults,maximum,learned:'exact prerequisite specialty; relative before absolute'},
   strikeProfile:{defaults,part,...strikeProfile}
 }),calculate:options=>evaluateMeleeStrike(getCombatRule(id),options)};
};
const MA_STRIKE_RULES=[
 strike('axeKick','Axe Kick','Удар пяткой сверху','67',{Karate:-4},'foot',{damage:'thr cr',reach:'C, 1',maneuver:'power',procedure:'axe'}),
 strike('dropKick','Drop Kick','Удар двумя ногами в прыжке','70',{Brawling:-1,'Sumo Wrestling':-1,Wrestling:-2},'feet',{reach:'2',maneuver:'move',procedure:'slam'}),
 strike('earClap','Ear Clap','Хлопок по уху','70',{Boxing:-3,Brawling:-3,Karate:-3},'hand',{maximum:-1,damage:'thr-3 cr',fixedLocation:'ear',procedure:'ear'}),
 strike('elbowDrop','Elbow Drop','Падение на локоть','70–71',{Brawling:-4,Wrestling:-5},'elbow',{damage:'thr cr',maneuver:'power',procedure:'drop'}),
 strike('elbowStrike','Elbow Strike','Удар локтем назад','71',{Brawling:-2,Karate:-2},'elbow',{damage:'thr-1 cr',procedure:'rearElbow'}),
 strike('exoticHandStrike','Exotic Hand Strike','Экзотический удар рукой','71',{Karate:-1},'hand',{damage:'thr cr',procedure:'hardSurface'}),
 strike('eyePoke','Eye-Poke','Тычок в глаз','72',{Boxing:-9,Brawling:-9,Karate:-9},'finger',{maximum:-4,damage:'thr-3 cr',fixedLocation:'eye',bonus:false,procedure:'eyePoke'}),
 strike('eyeRake','Eye-Rake','Царапающий удар по глазам','72',{Brawling:-5,Karate:-5},'hand',{damage:'thr-1 cr',fixedLocation:'face',bonus:false,procedure:'eyeRake'}),
 strike('headButt','Head Butt','Удар головой','74',{Brawling:-1,Karate:-1,DX:-2},'head',{damage:'thr-1 cr',bonus:false,procedure:'head'}),
 strike('jumpKick','Jump Kick','Удар ногой с прыжком','75',{Karate:-4},'foot',{damage:'thr cr',reach:'C, 1',maneuver:'power',procedure:'jump'}),
 strike('kneeDrop','Knee Drop','Падение на колено','76',{Brawling:-3,Wrestling:-4},'knee',{damage:'thr cr',maneuver:'power',procedure:'drop'}),
 strike('kneeStrike','Knee Strike','Удар коленом','76',{Brawling:-1,Karate:-1},'knee',{damage:'thr cr',procedure:'knee'}),
 strike('pushKick','Push Kick','Толчок ногой','78',{Brawling:-3,Karate:-3},'foot',{damage:'thr kb',reach:'C, 1',procedure:'push'}),
 strike('returnStrike','Return Strike','Возвратный удар','78',{Flail:-5,Kusari:-5},'weapon',{motion:'swing',procedure:'return'}),
 strike('spinningPunch','Spinning Punch','Удар рукой с разворота','79–80',{Karate:-2},'hand',{damage:'thr-1 cr',maneuver:'power',procedure:'spin',layer:'techniqueSpin'}),
 strike('spinningKick','Spinning Kick','Удар ногой с разворота','79–80',{Karate:-3},'foot',{damage:'thr cr',reach:'C, 1',maneuver:'power',procedure:'spin',layer:'techniqueSpin'}),
 strike('spinningStrike','Spinning Strike','Удар оружием с разворота','79–80',{weapon:-2},'weapon',{motion:'swing',maneuver:'power',procedure:'spin',layer:'techniqueSpin'}),
 strike('stampKick','Stamp Kick','Топчущий удар','80–81',{Brawling:-3,Karate:-3},'foot',{damage:'thr+1 cr',procedure:'stamp'}),
 strike('twoHandedPunch','Two-Handed Punch','Удар двумя руками','81',{Brawling:-2},'hands',{damage:'thr cr',procedure:'twoHands'}),
 strike('uppercut','Uppercut','Апперкот','81',{Boxing:-1,Brawling:-1,Karate:-1},'hand',{damage:'thr cr',procedure:'uppercut'}),
 strike('eyePluck','Eye-Pluck','Вырывание глаза','72',{Brawling:-10,Karate:-10},'finger',{cinematic:true,maximum:-4,damage:'thr-3 cr',fixedLocation:'eye',procedure:'eyePluck'}),
 strike('lethalEyePoke','Lethal Eye-Poke','Смертельный тычок в глаз','72',{Karate:-11},'finger',{cinematic:true,maximum:-5,damage:'thr-2 pi',fixedLocation:'eye',procedure:'lethalEye',aliases:['Lethal Eye-Poke','Targeted Attack (Karate Lethal Strike/Eye)','TA (Karate Lethal Strike/Eye)']}),
 strike('flyingJumpKick','Flying Jump Kick','Летящий удар ногой','83–84',{Karate:-7},'foot',{cinematic:true,damage:'thr cr',reach:'C, 1',maneuver:'move',procedure:'flying'}),
 strike('flyingLunge','Flying Lunge','Летящий выпад','83–84',{weapon:-4},'weapon',{cinematic:true,motion:'thrust',maneuver:'move',procedure:'flying'}),
 strike('lethalKick','Lethal Kick','Смертельный удар ногой','85',{Karate:-4},'foot',{cinematic:true,realisticDefault:true,damage:'thr-1 pi',reach:'C, 1',procedure:'lethalFoot'}),
 strike('lethalStrike','Lethal Strike','Смертельный удар рукой','85',{Karate:-2},'finger',{cinematic:true,realisticDefault:true,damage:'thr-2 pi',procedure:'lethalHand'}),
 strike('poleVaultKick','Pole-Vault Kick','Удар ногой с опорой на шест','87',{Karate:-4},'foot',{cinematic:true,damage:'thr cr',reach:'C, 1, 2',maneuver:'out',procedure:'pole'}),
 strike('springingAttack','Springing Attack','Пружинящий удар','87–89',{unarmed:-2,weapon:-2},'underlying',{cinematic:true,procedure:'spring',layer:'techniqueSpring'}),
 strike('whirlwindAttack','Whirlwind Attack','Вихревая атака','89',{Boxing:-5,Karate:-5,weapon:-5},'underlying',{cinematic:true,maneuver:'out',procedure:'whirlwind'}),
];

// RANGED_PANEL is presentation metadata only, merged into the owning entries.
// It intentionally exposes exactly the two existing controls.


const RANGED_PANEL = Object.freeze([
  {
    id: "rangedRapidStrike",
    name: "Ranged Rapid Strike",
    resolver: options => resolveCombatTechnique("quickShot",options),
    help: {
      type: "\u0411\u043e\u0435\u0432\u0430\u044f \u043e\u043f\u0446\u0438\u044f",
      default: "\u2013",
      prerequisite: "\u041e\u0440\u0443\u0436\u0438\u0435 \u0441 RoF 2+",
      maximum: "\u2013",
      description: [
        "\u041f\u043e\u0437\u0432\u043e\u043b\u044f\u0435\u0442 \u043e\u0440\u0443\u0436\u0438\u044e \u0441 RoF 2+ \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u0432\u0435 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043b\u044c\u043d\u0438\u0435 \u0430\u0442\u0430\u043a\u0438 \u0437\u0430 \u043e\u0434\u0438\u043d \u0445\u043e\u0434. \u041e\u0431\u0449\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 RoF \u043e\u0440\u0443\u0436\u0438\u044f \u0434\u0435\u043b\u0438\u0442\u0441\u044f \u043c\u0435\u0436\u0434\u0443 \u0434\u0432\u0443\u043c\u044f \u0430\u0442\u0430\u043a\u0430\u043c\u0438.",
        "\u041a\u0430\u0436\u0434\u0430\u044f \u0430\u0442\u0430\u043a\u0430 \u0438\u043c\u0435\u0435\u0442 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0431\u0440\u043e\u0441\u043e\u043a, \u0446\u0435\u043b\u044c, \u0437\u043e\u043d\u0443 \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u0431\u043e\u043d\u0443\u0441 RoF. \u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u0448\u0442\u0440\u0430\u0444 \u0441\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u0442 -6 \u043a \u043e\u0431\u0435\u0438\u043c \u0430\u0442\u0430\u043a\u0430\u043c. \u0422\u0435\u0445\u043d\u0438\u043a\u0430 Quick-Shot \u0434\u043b\u044f \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0435\u0433\u043e Основной навык \u0443\u043c\u0435\u043d\u044c\u0448\u0430\u0435\u0442 \u0435\u0433\u043e \u0432\u043f\u043b\u043e\u0442\u044c \u0434\u043e 0.",
        "\u0414\u0432\u0435 \u0446\u0435\u043b\u0438 \u0434\u043e\u043b\u0436\u043d\u044b \u043d\u0430\u0445\u043e\u0434\u0438\u0442\u044c\u0441\u044f \u043f\u0440\u0438\u043c\u0435\u0440\u043d\u043e \u0432 \u043f\u0440\u0435\u0434\u0435\u043b\u0430\u0445 \u0441\u0435\u043a\u0442\u043e\u0440\u0430 30\u00b0."
      ],
      implementation: [
        "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f Attack 1 \u0438 Attack 2 \u0441 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u043c\u0438 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430\u043c\u0438. \u041f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 Quick-Shot \u0438\u0449\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438, \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0448\u0442\u0440\u0430\u0444 \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f.",
        "\u0421\u0435\u043a\u0442\u043e\u0440 30\u00b0 \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u044c\u044e \u0438\u0433\u0440\u043e\u043a\u0430 \u0438 GM; \u043c\u043e\u0434\u0443\u043b\u044c \u043d\u0435 \u0431\u043b\u043e\u043a\u0438\u0440\u0443\u0435\u0442 \u0430\u0442\u0430\u043a\u0443 \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0443\u0441\u043b\u043e\u0432\u0438\u044e."
      ]
    },
    availability: context => context.rrsAvailable
      ? { available: true } : { available: false, reason: "Ranged Rapid Strike \u0442\u0440\u0435\u0431\u0443\u0435\u0442 RoF 2+" },
    status: context => String(context.rrsPenalty ?? -6)
  },
  {
    id: "closeHipShooting",
    name: "Close-Hip Shooting",
    resolver: options => resolveCombatTechnique("closeHipShooting",options),
    help: {
      type: "Average Technique",
      default: "Guns",
      prerequisite: "Guns",
      maximum: "Guns +3",
      description: [
        "Close-Hip Shooting \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f \u043f\u0440\u0438 \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u0435 \u043f\u043e \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a\u0443 \u0432 close combat, \u043a\u043e\u0433\u0434\u0430 \u0441\u0442\u0440\u0435\u043b\u043e\u043a \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043e\u0440\u0443\u0436\u0438\u0435 \u0431\u043b\u0438\u0437\u043a\u043e \u043a \u0442\u0435\u043b\u0443 \u0438 \u0441\u0442\u0440\u0435\u043b\u044f\u0435\u0442 \u0438\u043d\u0441\u0442\u0438\u043d\u043a\u0442\u0438\u0432\u043d\u043e.",
        "\u0412\u043c\u0435\u0441\u0442\u043e \u043e\u0431\u044b\u0447\u043d\u043e\u0433\u043e \u0448\u0442\u0440\u0430\u0444\u0430 Bulk \u043a Guns \u0431\u0435\u0440\u0443\u0442 \u0443\u0440\u043e\u0432\u0435\u043d\u044c Close-Hip Shooting, \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u044e\u0442 Bulk \u0438 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0438\u0432\u0430\u044e\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u044b\u0447\u043d\u044b\u043c Guns: CHS result = min(Guns, Close-Hip Shooting + Bulk).",
        "\u041f\u0440\u0438\u043c\u0435\u0440: Guns (Rifle) 13, Close-Hip Shooting (Rifle) 16, Bulk -5. \u041f\u043e\u043b\u0443\u0447\u0430\u0435\u0442\u0441\u044f 16 - 5 = 11; min(13, 11) = 11. \u0411\u0435\u0437 \u0442\u0435\u0445\u043d\u0438\u043a\u0438: 13 - 5 = 8."
      ],
      implementation: [
        "\u0422\u0435\u0445\u043d\u0438\u043a\u0430 \u0438\u0449\u0435\u0442\u0441\u044f \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e Основной навык. \u0415\u0451 \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043e\u0442 Guns \u0434\u043e Guns +3.",
        "\u0418\u0433\u0440\u043e\u043a \u0432\u0440\u0443\u0447\u043d\u0443\u044e \u0432\u043a\u043b\u044e\u0447\u0430\u0435\u0442 \u0442\u0435\u0445\u043d\u0438\u043a\u0443, \u043a\u043e\u0433\u0434\u0430 \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044e close combat. \u041c\u043e\u0434\u0443\u043b\u044c \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 Target \u0438 \u043d\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044e \u0438\u043b\u0438 \u0433\u0435\u043e\u043c\u0435\u0442\u0440\u0438\u044e Canvas.",
        "\u0414\u043b\u044f \u043e\u0440\u0443\u0436\u0438\u044f \u0441 Ranged Level, \u043e\u0442\u043b\u0438\u0447\u043d\u044b\u043c \u043e\u0442 Guns, \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0442\u0435\u0445\u043d\u0438\u043a\u0438 \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f \u043a \u0442\u0435\u043a\u0443\u0449\u0435\u043c\u0443 Ranged Level. Bulk \u0443\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u043e\u0434\u0438\u043d \u0440\u0430\u0437."
      ]
    },
    availability: context => findCombatTechnique("closeHipShooting",{
      actor: context.actor, governingSkill: context.governingSkill
    }) ? { available: true } : { available: false, reason: "\u0422\u0435\u0445\u043d\u0438\u043a\u0430 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0443 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0430" },
    status: () => ""
  }
]);

export const COMBAT_RULES = Object.freeze([...CHANNEL_RULES, ...OTHER_RULES, ...MELEE_PENALTY_RULES,...MA_STRIKE_RULES,...MA_SPECIAL_RULES].map(rule => {
  const panel = RANGED_PANEL.find(entry => entry.id === rule.id);
  const adapter=TECHNIQUE_ADAPTERS[rule.id];
  const expanded=['hammerFist','kicking'].includes(rule.id)?{
    meleePenalty:true,baseGroup:'unarmed',baseSkills:['Brawling','Karate'],maximum:0,
    defaultModifier:rule.id==='hammerFist'?-1:-2,operation:'REPLACE',penaltyChannel:'techniqueStrike',
    calculatePenalty:options=>evaluateMeleePenalty(getCombatRule(rule.id),options)
  }:{};
  const names={weaponBond:'Weapon Bond',rangedRapidStrike:'Ranged Rapid Strike',rapidStrike:'Rapid Strike',
    telegraphicAttack:'Telegraphic Attack',deceptiveAttack:'Deceptive Attack',evaluate:'Evaluate',
    moveAndAttack:'Move and Attack',allOutDetermined:'All-Out Attack (Determined)',
    committedDetermined:'Committed Attack (Determined)',committedSteps:'Committed Attack (2 steps)'};
  return Object.freeze({ ...rule, name: rule.name??rule.id, ...adapter,...expanded,
    ...(rule.specialProfile ? {calculate:options=>evaluateMeleeSpecial(rule,options)} : {}),
    ...((rule.meleePenalty||expanded.meleePenalty)&&!(rule.operation==='CONTEXT'||rule.operation==='SEQUENCE'||rule.operation==='SPECIAL_CHECK')?{
      channel:rule.penaltyChannel??expanded.penaltyChannel,priority:30,
      when:c=>c.meleeTechniques?.available&&c.meleeTechniques.results.some(r=>r.id===rule.id&&r.available),
      resolve:({context:c})=>({operation:'replace',value:c.meleeTechniques.channels.find(channel=>channel.id===(rule.penaltyChannel??expanded.penaltyChannel))?.value,
        source:rule.id,label:rule.name??adapter?.name,metadata:{meleeTechniques:c.meleeTechniques}})
    }:{}),
    category:rule.combatType,type:rule.id==='evaluate'?'maneuver':rule.kind,
    ...((adapter||rule.meleePenalty||rule.auxiliary||rule.operation==='SEQUENCE') ? {availability: options => {
      const {available,reason}=inspectCombatTechnique(rule.id,options);
      return {available,reason};
    }} : {}),
    ...panel, ...(panel ? {rangedPanel: true} : {}),
    // Existing names on non-technique descriptors must also survive the merge.
    ...(!adapter && !panel ? {name: rule.name ?? names[rule.id] ?? rule.id} : {}) });
}));

export function resolveMeleeTechniques(options={}) {return buildMeleeTechniquePlan(options,COMBAT_RULES);}
export function resolveMeleePenaltyTechnique(id,options={}) {
 return resolveCombatTechnique(id,{...options,meleePenalty:true});
}
export function getMeleeTechniqueRows(options={}) {
 return COMBAT_RULES.filter(r=>r.meleePenalty||r.operation==='SEQUENCE').map(rule=>({rule,result:(rule.calculatePenalty??rule.calculate)(options)}));
}

export function getCombatRule(id) { return COMBAT_RULES.find(rule => rule.id === id) ?? null; }
export function getCombatRules(combatType) {
  return COMBAT_RULES.filter(rule => rule.channel &&
    (rule.combatType === combatType || rule.combatType === 'both'));
}
function requireRule(id) {
  const rule=getCombatRule(id);
  if(!rule)throw Error('Unknown combat rule: '+id);
  return rule;
}
export function resolveCombatTechnique(id, options={}) {
  const rule=requireRule(id);
  if(rule.calculatePenalty&&(options.meleePenalty||options.attack&&!options.profile))return rule.calculatePenalty(options);
  if(typeof rule.calculate !== 'function')throw Error('Rule has no technique calculation: '+id);
  return rule.calculate(options);
}
export function combatGripAvailable(grip, availableGrips=[]) {
  const rule=COMBAT_RULES.find(entry=>entry.kind==='grip'&&entry.grip===grip);
  return rule ? !!rule.calculate({availableGrips}) : availableGrips.includes(grip);
}
export function findCombatTechnique(id, options={}) {
  const rule=requireRule(id);
  return rule.find ? rule.find(options) : resolveCombatTechnique(id,options);
}
export function createCombatTechniqueContext(id, options={}) {
  const rule=requireRule(id);
  if(!rule.createContext)throw Error('Rule has no technique context: '+id);
  const context=rule.createContext(options);
  return {...context, resolve: selection => resolveCombatTechnique(id,
    {...options,...selection,techniqueContext:context})};
}

// Diagnostic API. Never adds a second modifier or writes to an Actor/snapshot.
// Legacy callers receive the raw calculation above, including their null/defaults.
export function inspectCombatTechnique(id, options={}) {
  const rule=requireRule(id), result=resolveCombatTechnique(id,options);
  if(rule.meleePenalty&&options.attack&&!options.profile||rule.auxiliary||rule.operation==='SEQUENCE')return {
    id,name:rule.name,kind:rule.kind,...result,attackLevel:result?.level??null,
    originalModifier:result?.originalModifier??null,finalModifier:result?.modifier??null,
    explanation:result?.available?rule.name+': '+result.originalModifier+' → '+result.modifier:result?.reason,
    snapshotPath:rule.snapshot??'profile.damage.rules.meleeSequence',result};
  const entry=result?.quickShotEntry ?? result?.entry ?? null;
  const profileResult=id==='hammerFist'||id==='kicking';
  const available=id==='quickShot'?!!entry:profileResult?result?.resolved===true:result!==null;
  let reason=null;
  if(!available){
    const skill=options.governingSkill;
    if(profileResult&&(ltImprovisedSource(options.profile?.modeId)?.technique!==rule.name||options.profile?.technique!==rule.name))reason='unsupported-profile';
    else if(profileResult)reason=result?.reason??'no-compatible-base-skill';
    else if(skill&&(skill.resolved===false||skill.learned===false||skill.family!=='guns'))reason='no-compatible-learned-base-skill';
    else if(id==='closeHipShooting'&&!options.enabled)reason='not-enabled';
    else if(id==='closeQuartersBattle'&&!options.moveAndAttack)reason='requires-move-and-attack';
    else if(id==='closeQuartersBattle'&&(!Number.isFinite(options.physicalDistance)||
      getCloseQuartersBattleRange(options.actor)===null||options.physicalDistance<0||
      options.physicalDistance>getCloseQuartersBattleRange(options.actor)))reason='distance-unavailable-or-out-of-range';
    else reason='no-applicable-technique-for-selected-skill-weapon-target-or-level';
  }
  const baseSkillLevel=profileResult ? (result?.baseSkill==='DX'?Number(options.actor?.system?.attributes?.DX?.value):
    readCombatTechniqueSkills(options.actor,{objectRows:true}).filter(e=>e.name===result?.baseSkill&&
      (Number(e.points)>0||e.learned===true)).map(finiteLevel).filter(Number.isFinite).sort((a,b)=>b-a)[0]??null)
    :result?.governingSkillLevel??options.governingSkill?.level??null;
  const originalModifier=result?.basePenalty??result?.movePenalty??result?.bulk??
    (id==='quickShot'?-6:profileResult?rule.levelPolicy.default+(result?.directWeaponPenalty??0):
      options.basePenalty??options.movePenalty??null);
  const finalModifier=result?.effectivePenalty??result?.penalty??originalModifier;
  const attackBase=Number(options.attack?.level);
  const attackLevel=profileResult?result?.level??null:result?.cqbBase??result?.closeHipBase??
    (Number.isFinite(attackBase)&&Number.isFinite(finalModifier)?attackBase+finalModifier:null);
  const defaultModifier=typeof rule.levelPolicy?.default==='number'?rule.levelPolicy.default:options.basePenalty??null;
  return {id, name:rule.name,kind:rule.kind,available,reason,
    governingSkill:result?.governingSkill??result?.governingSkillName??result?.baseSkill??options.governingSkill?.name??null,
    governingSkillLevel:baseSkillLevel,
    specialization:result?.specialty??result?.baseSkill??options.governingSkill?.specialty??null,
    learned:profileResult?result?.learned===true:!!entry,
    learnedLevel:result?.techniqueLevel??(profileResult&&result?.learned?result.sourceLevel:finiteLevel(entry)),
    learnedRelativeLevel:entry?relativeLevel(entry):null,
    defaultModifier,defaultLevel:Number.isFinite(baseSkillLevel)&&Number.isFinite(defaultModifier)?baseSkillLevel+defaultModifier:null,
    originalModifier, finalModifier,
    attackLevel,
    explanation:reason?rule.name+': '+reason:
      rule.name+': '+originalModifier+' -> '+finalModifier+'; attack '+attackLevel,
    snapshotPath:rule.snapshot??null,result};
}
