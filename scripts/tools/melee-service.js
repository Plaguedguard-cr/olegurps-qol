import {assertMeleeExecutionState} from './melee-execution-state.js';
import {validateWeaponShotResources} from './weapon-resources.js';
import {applyMessageMode} from './chat-message-mode.js';
import { weaponStrengthExplanation } from './weapon-strength-display.js';
import {ltShieldToolSource,shieldModeAllowed} from '../lt-shield-tool-source.js';
import {ltImprovisedSource} from '../lt-improvised-source.js';
import {utOrdinarySource,utOrdinaryAllowed} from '../ut-ordinary-melee-source.js';
import {utExoticSource} from '../ut-exotic-melee-source.js';
import {readMeleeProfileSelection} from './melee-profile-service.js';
import {htSpecialSource} from '../ht-special-melee-source.js';
import {meleeProfileKey} from './melee-profile-service.js';
import {assertShieldEquipmentReference} from './shield-equipment-adapter.js';
import {HT_TEAR_SPRAY_MODE} from './biochemical-integration.js';
import {AmmoService} from './ammo-service.js';
import { performActionWithoutGgaConfirmation as performMeleeActionWithoutConfirmation } from './gga-roll-confirmation.js';
import { createGgaDamageWithEasterEgg } from "./damage-result-easter-egg.js";
import { buildAttackModifierBreakdownHtml, buildCompactAttackModifiers, executeWithCapturedRollMessage, executePreparedGgaRoll } from "./prepared-gga-roll.js";
import { resolveRuntimeAttackProfile, newAttackId } from "./attack-profile-runtime.js";
import { AttackProfileResolver, createShotSnapshot } from "./attack-profile-resolver.js";
import { resolveStrengthDamage } from './strength-service.js';
import { getMeleeNativeDamageParser, parseCompleteMeleeDamage, inferMeleeDamageModel, parseMeleeDamageTerms } from './melee-damage-model.js';
import { installMeleeNativeDamage, numericMeleeDamageEvent, basicDamageOnly, rollBasicDamage } from './melee-native-damage.js';
import { meleeStrengthChannel } from './melee-weapon-strength.js';
import { resolveCombatCalculation } from "./combat-calculation-engine.js";
import { getCombatRules,resolveMeleeTechniques } from "./combat-technique-registry.js";
import {hasCombatTrait,isCleanTechniqueAttack,meleeTechniqueRuntimeContext} from './melee-penalty-techniques.js';
import {combatPerkLabel,drunkenFighting,drunkenTaggedCredit,hasSpecializedCombatPerk} from './ma-combat-perks.js';
import {offHandAttackPenalty} from './melee-technique-sequences.js';
import { committedStrongEligible } from './melee-martial-rules.js';
import { strikeDamageDelta } from './melee-strike-techniques.js';
import { extendedMeleeReach, maRussian, resolveMeleeCombatOptions, spendCombatFatigue } from './ma-combat-options.js';

const integer = value => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

export function getRapidStrikePenalty(hasWeaponMasterOrTrainedByMaster = false) {
  return hasWeaponMasterOrTrainedByMaster === true ? -3 : -6;
}
export function unarmedDamageExplanation(attack){
  const u=attack?.meleeProfile?.unarmed;if(!u)return '';
  const message=u.alreadyIncluded?'Сохранён исходный Damage GGA; бонус повторно не добавляется.':u.manualDamage?'Сохранён ручной Damage; бонус повторно не добавляется.':
    u.selectedSkill+': +'+u.bonusPerDie+'/куб × '+u.baseThrustDice+' куб. базового thrust'+(u.naturalPerDie?'; естественное оружие +'+u.naturalPerDie+'/куб':'')+'; всего +'+u.totalBonus+'.';
  return '<details class="olegurps-chat-details"><summary>Безоружный урон</summary><div>'+message+' '+u.pages.join('; ')+'.</div></details>';
}
export function getEvaluateBonus(value) {
  return Math.min(3, Math.max(0, integer(value)));
}

export function getAllOutAttackSkillBonus(allOutAttack, mode) {
  return allOutAttack && mode === "determined" ? 4 : 0;
}

function resolveMeleePass(options, deceptivePenalty = 0) {
  if (options.baseSkill === null || options.baseSkill === undefined) return null;
  const baseSkill = Number(options.baseSkill) - (options.attack?.meleeProfile?.projectedStrengthDelta ?? 0);
  if (!Number.isFinite(baseSkill)) return null;
  const hitLocationBase = Number(options.hitLocationBasePenalty ?? options.hitLocationPenalty ?? 0);
  const precisionPenalty = integer(options.precisionPenalty);
  const techniqueContext=meleeTechniqueRuntimeContext(options.actor,{...options.meleeTechniques?.context,
    rapidStrike:!!options.rapidStrikePenalty,combination:!!options.combination});
  const techniquePlan=options.meleeTechniques?.ids?.length?resolveMeleeTechniques({...options,
    baseSkill,selection:options.meleeTechniques,context:techniqueContext}):null;
  const replacement=techniquePlan?.available&&techniquePlan.strikeManeuver;
  const moveAndAttack=!!options.moveAndAttack&&!replacement;
  const maOptions=resolveMeleeCombatOptions({...options, strengthDamage:isStrengthBasedMeleeDamage(options.attack)},techniquePlan);
  const projected=maOptions?.projected;
  const replacedSkill=Number.isFinite(projected?.level);
  const shieldTarget=projected?.action==='strikeShield';
  const capMove=moveAndAttack&&!maOptions?.bypassMoveCap;
  const fixedLocation=!!techniquePlan?.fixedLocation;
  const waiveLocationPenalty=techniquePlan?.available&&techniquePlan.strikes?.some(strike=>strike.waiveLocationPenalty);
  const projectedSkill=techniquePlan?.available&&techniquePlan.primaryStrike&&techniquePlan.results.find(row=>row.id===techniquePlan.primaryStrike.id);
  const specialKind=techniquePlan?.special?.special?.kind;
  const drunken=!specialKind||specialKind==='attack'?drunkenFighting(options.actor):null;
  const ordinaryOffHand=!options.sequenceModifier&&techniqueContext.hand==='off'&&techniqueContext.weaponHands===1&&
    !options.meleeTechniques?.ids?.some(id=>['dualWeaponAttack','combination'].includes(id))&&
    !options.attack?.unarmedRef&&isCleanTechniqueAttack(options.attack)&&(!specialKind||specialKind==='attack');
  const offHand=ordinaryOffHand?offHandAttackPenalty(options.actor,options.attack,options.governingSkill,'off'):0;
  const offHandPerk=ordinaryOffHand&&!offHand&&!hasCombatTrait(options.actor,'Ambidexterity')&&hasSpecializedCombatPerk(options.actor,'Off-Hand Weapon Training',options.governingSkill?.name)?
    {name:'Off-Hand Weapon Training',modifier:4,source:'MA50'}:null;
  const perks=[...(options.attack?.meleeProfile?.skill?.perks??[]),...(options.attack?.meleeProfile?.unarmed?.perks??[]),
    ...(techniquePlan?.available?techniquePlan.results.flatMap(row=>row.perks??[]):[]),...[drunken,offHandPerk].filter(Boolean)];
  const context = {
    meleeTechniques:techniquePlan,
    weaponBond: !replacedSkill&&!options.attack?.unarmedRef && options.weaponBond === true,
    targetedAttack: fixedLocation||waiveLocationPenalty||shieldTarget?null:options.targetedAttack ?? null,
    hitLocationBase:waiveLocationPenalty||shieldTarget?0:hitLocationBase, hitLocationLabel: options.hitLocationLabel ?? "Зона попадания",
    rapidStrikePenalty: integer(maOptions?.rapidPenalty??options.rapidStrikePenalty),
    telegraphicAttack: !!options.telegraphicAttack, deceptivePenalty,
    evaluateBonus: getEvaluateBonus(options.evaluate), moveAndAttack,
    allOutAttack: !!options.allOutAttack&&!replacement, allOutAttackMode: options.allOutAttackMode,
    committedAttack: !!options.committedAttack&&!replacement, committedMode: options.committedMode,
    committedSteps: !!options.committedSteps&&!replacement
  };
  const calculation=resolveCombatCalculation({ combatType: "melee", actor: options.actor,
    attack: options.attack, baseAttackLevel: replacedSkill?projected.level:baseSkill, governingSkill: replacedSkill?
      {name:projected.skill,level:projected.level,resolved:true}:projectedSkill?
      {name:projectedSkill.governingSkill,level:projectedSkill.governingSkillLevel,learned:projectedSkill.governingSkill!=='DX',resolved:true}:options.governingSkill,
    attackSlot: options.attackSlot, context,
    channels: [
      meleeStrengthChannel(techniquePlan?.primaryStrike||replacedSkill?null:options.attack?.meleeProfile?.weaponStrength??options.attack?.weaponStrength, { reconcileExternal: true }),
      { id:'ammunitionConstruction',value:options.attack?.standaloneRef?.modeId===HT_TEAR_SPRAY_MODE||options.attack?.meleeProfile?.htSpecial?.spray?2:0,label:'Широкая струя (HT180)' },
      { id: "weaponBond", value: 0, label: "Weapon Bond", kind: "perk" },
      ...(drunken?[{id:'drunkenFighting',value:drunken.modifier,label:combatPerkLabel(drunken),kind:'perk',source:drunken.source}]:[]),
      ...(ordinaryOffHand?[{id:'offHand',value:offHand,label:'Неосновная рука',source:'B14; MA50'}]:[]),
      { id: "situational", value: integer(options.manualModifier), label: "\u0411\u043e\u043d\u0443\u0441\u044b/\u0448\u0442\u0440\u0430\u0444\u044b" },
      { id: "evaluate", value: 0, label: "\u041e\u0446\u0435\u043d\u043a\u0430" },
      { id: "telegraphicAttack", value: 0, label: "Telegraphic Attack" },
      { id: "committedSteps", value: 0, label: "Committed Attack (2 steps)" },
      { id: "maneuverAttackBonus", value: 0, label: "Бонус атаки от манёвра" },
      { id: "moveAndAttack", value: 0, label: "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0438 \u0430\u0442\u0430\u043a\u0430" },
      ...(maOptions?.moveDelta?[{id:'maMovement',value:maOptions.moveDelta,
        label:maOptions.effort==='charge'?'Heroic Charge':'Move and Attack (MA107)',source:'MA107; MA131'}]:[]),
      ...(shieldTarget?[{id:'maStrikeShield',value:projected.hitModifier,label:'Striking at Shields',source:'MA112'}]:[]),
      { id: "rapidStrike", value: 0, label: "Rapid Strike" },
      { id: "visibility", value: integer(options.visibilityPenalty), label: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c" },
      { id: "hitLocation", value: !shieldTarget&&!fixedLocation&&!waiveLocationPenalty&&Number.isFinite(hitLocationBase) ? hitLocationBase : 0,
        label: options.hitLocationLabel ?? "Зона попадания" },
      { id: "precision", value: fixedLocation||shieldTarget?0:precisionPenalty, label: "Precision" },
      { id: "deceptiveAttack", value: 0, label: "Deceptive Attack" },
      ...(options.sequenceModifier?[{id:options.sequenceModifier.id,value:options.sequenceModifier.value,label:options.sequenceModifier.label??options.sequenceModifier.id,kind:'learned-technique',source:'MA-PENALTY-1'}]:[]),
      ...(techniquePlan?.available?techniquePlan.channels:[])
    ], rules: getCombatRules("melee"), caps: [
      ...(capMove ? [{ maximum: 9, label: "Предел навыка при движении и атаке: 9" }] : []),
      ...(options.visibilityCap ? [{ maximum: 9, label: "Предел навыка при ограниченной видимости: 9" }] : []),
      ...(techniquePlan?.available?techniquePlan.caps:[])
    ] });
  if(techniquePlan)calculation.metadata.meleeTechniques=techniquePlan;
  if(perks.length)calculation.metadata.combatPerks=perks;
  calculation.metadata.meleeCaps=[...(capMove||options.visibilityCap?[{maximum:9}]:[]),...(techniquePlan?.available?techniquePlan.caps:[])];
  if(maOptions)calculation.metadata.maOptions=maOptions;
  if(techniquePlan?.available&&techniquePlan.strikes){
    calculation.metadata.parryModifier=techniquePlan.strikes.reduce((sum,strike)=>sum+strike.targetParry,0);
    calculation.metadata.defenseModifier=(calculation.metadata.defenseModifier??0)+techniquePlan.strikes.reduce((sum,strike)=>sum+strike.targetDefenseModifier,0);
  }
  return calculation;
}

export function calculateMeleeSkillBeforeDeceptive(options = {}) {
  return resolveMeleePass(options)?.effectiveSkill ?? null;
}

export function resolveMeleeCombatCalculation(options = {}) {
  const before = resolveMeleePass(options);
  if (!before) return null;
  const deceptivePenalty = normalizeDeceptiveAttackPenalty(options.deceptiveAttack,
    before.effectiveSkill, options.moveAndAttack&&!before.metadata.maOptions?.bypassMoveCap, options.telegraphicAttack);
  const result = resolveMeleePass(options, deceptivePenalty);
  if (result) result.metadata = { ...result.metadata,
    defenseModifier: (result.metadata.defenseModifier ?? 0),
    deceptivePenalty, beforeDeceptive: before.effectiveSkill,
    weaponStrengthDelta: result.channels.find(c=>c.id==='weaponStrength')?.resolvedValue??0 };
  return result;
}

export function meleeSpecialRollPreviews(options, special) {
  if (!special?.rolls) return [];
  return special.rolls.map(roll => {
    if (!Number.isFinite(roll.level)) return { ...roll, effectiveLevel: null };
    if (roll.kind !== 'hit') return { ...roll, effectiveLevel: roll.level + integer(options.manualModifier) };
    const grand = special.ref === 'GrandDisarm';
    const result = resolveMeleeCombatCalculation({ ...options, meleeTechniques: null,
      baseSkill: roll.level + (options.attack?.meleeProfile?.projectedStrengthDelta ?? 0),
      hitLocationPenalty: 0, hitLocationBasePenalty: 0, targetedAttack: null, precisionPenalty: 0,
      ...(grand ? { allOutAttack: false, moveAndAttack: false, committedAttack: false,
        deceptiveAttack: 0, telegraphicAttack: false, evaluate: 0, rapidStrikePenalty: 0 } : {}) });
    return { ...roll, effectiveLevel: result?.effectiveSkill ?? null,
      skillCap: result?.metadata?.meleeCaps?.some(cap => cap.maximum === 9) ? 9 : null,
      ...(result?.metadata?.combatPerks?.length?{combatPerks:result.metadata.combatPerks}:{}),
      modifiers: result?.channels.map(({ id, resolvedValue }) => ({ id, value: resolvedValue })) ?? [] };
  });
}

// A special-technique hit may have no damage and a standalone weapon need not
// have a GGA melee row. Use the native attack roll with the prepared target.
export async function performSpecialMeleeAttack({actor, attack, rollName, level, skillCap,
  details='', maneuver, deceptiveDefensePenalty=0, damageLink=false, drunken=null}) {
  const {doRoll}=await import('/systems/gurps/module/dierolls/dieroll.js');
  const GGA=globalThis.GURPS;
  const name=String(attack.name).replace(/\[[^\]]*]/g,'').trim();
  const exact=attack.mode?name+' ('+attack.mode+')':name;
  const quoted=exact.replaceAll('\\','\\\\').replaceAll('"','\\"');
  const ref=type=>'[@'+actor.id+'@'+type+':"'+quoted+'"]';
  const action={type:'attack',name:exact,orig:'M:"'+quoted+'"',isMelee:true,isRanged:false,maneuver,deceptiveDefensePenalty};
  const mods=GGA.ModifierBucket,stack=mods.modifierStack;
  const capDesc=Number.isFinite(skillCap)?'Предел атаки *Max:'+skillCap:null;
  const addCap=capDesc&&!stack.modifierList.some(mod=>mod.desc===capDesc);
  try {
    return await doRoll({actor,thing:rollName??name,chatthing:ref('M'),
      origtarget:level+drunkenTaggedCredit(actor,attack,drunken,'melee'),action,
      targetmods:addCap?[{mod:'0',modint:0,desc:capDesc}]:[],
      optionalArgs:{action,obj:attack.data??attack,text:details,followon:damageLink?ref('D'):undefined}});
  } finally {
    // Native cancellation removes tagged entries. This zero-valued *Max is
    // forwarded by GGA as an untagged entry, so remove only our cap.
    if(addCap&&stack.modifierList.some(mod=>mod.desc===capDesc)){
      stack.modifierList=stack.modifierList.filter(mod=>mod.desc!==capDesc);
      stack.sum();
      mods.refresh();
    }
  }
}

async function rollCounterattack({actor,attack,profile,attackId,level,skillCap,details,maneuver,deceptiveDefensePenalty,telegraphicCriticalBonus,drunken}) {
  const GGA=globalThis.GURPS;
  GGA.SetLastActor?.(actor);
  const name=String(attack.name).replace(/\[[^\]]*]/g,'').trim();
  const execute=()=>withTelegraphicCriticalLimit(GGA,actor.id,name,telegraphicCriticalBonus,
    ()=>performSpecialMeleeAttack({actor,attack,level,skillCap,details,maneuver,deceptiveDefensePenalty,damageLink:true,drunken}));
  const {result,message}=await executeWithCapturedRollMessage({actorId:actor.id,
    messageFilter:data=>String(data.rolls?.[0]?.formula??'').startsWith('3d6['+name+']'),execute});
  if(message)await message.setFlag('olegurps-qol','shotSnapshot',
    structuredClone(createShotSnapshot(profile,{attackId,messageId:message.id})));
  return {rolled:!!message,rollData:message?GGA.lastTargetedRolls?.[actor.id]:null,hit:message?result!==false:false,message};
}

export function getMaximumDeceptiveAttackPenalty(skillBeforeDeceptive, moveAndAttack = false, telegraphicAttack = false) {
  const skill = Number(skillBeforeDeceptive);
  if (moveAndAttack || telegraphicAttack || !Number.isFinite(skill) || skill <= 10) return 0;
  return Math.max(0, Math.floor((Math.trunc(skill) - 10) / 2) * 2);
}

export function normalizeDeceptiveAttackPenalty(value, skillBeforeDeceptive, moveAndAttack = false,
  telegraphicAttack = false) {
  const requested = Math.floor(Math.abs(integer(value)) / 2) * 2;
  const maximum = getMaximumDeceptiveAttackPenalty(skillBeforeDeceptive, moveAndAttack, telegraphicAttack);
  const penalty = Math.min(requested, maximum);
  return penalty === 0 ? 0 : -penalty;
}

export function getDeceptiveDefensePenalty(value) {
  return -Math.floor(Math.abs(integer(value)) / 2);
}

export function calculateMeleeEffectiveSkill(options = {}) {
  return resolveMeleeCombatCalculation(options)?.effectiveSkill ?? null;
}

export function getTelegraphicCriticalBonus(options = {}) {
  if (!options.telegraphicAttack) return 0;
  const withBonus = calculateMeleeEffectiveSkill(options);
  const withoutBonus = calculateMeleeEffectiveSkill({ ...options, telegraphicAttack: false,
    evaluate: 0, deceptiveAttack: 0 });
  return Number.isFinite(withBonus) && Number.isFinite(withoutBonus)
    ? Math.max(0, withBonus - withoutBonus) : 0;
}

export function isMeleeCriticalSuccess(total, target) {
  return total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16);
}

async function withTelegraphicCriticalLimit(GURPS, actorId, attackName, bonus, perform) {
  if (!bonus || typeof GURPS?.setLastTargetedRoll !== "function") return perform();
  const original = GURPS.setLastTargetedRoll;
  const wrapped = function(chatdata, rolledActorId, tokenId, updateOtherClients) {
    if (String(rolledActorId ?? "") === String(actorId ?? "") &&
        (!chatdata?.thing || String(chatdata.thing).trim() === attackName) &&
        Number.isFinite(Number(chatdata?.rtotal)) && Number.isFinite(Number(chatdata?.finaltarget))) {
      chatdata.isCritSuccess = isMeleeCriticalSuccess(
        Number(chatdata.rtotal), Number(chatdata.finaltarget) - bonus
      );
    }
    return original.call(this, chatdata, rolledActorId, tokenId, updateOtherClients);
  };
  GURPS.setLastTargetedRoll = wrapped;
  try { return await perform(); }
  finally { if (GURPS.setLastTargetedRoll === wrapped) GURPS.setLastTargetedRoll = original; }
}

export function modifyDicePlusAdds(formula) {
  const source = String(formula ?? "").trim();
  const match = source.match(/^(\d+)d(?:6)?\s*\+\s*(\d+)(.*)$/iu);
  if (!match) return source;
  let dice = Number(match[1]);
  let adds = Number(match[2]);
  dice += Math.floor(adds / 7) * 2;
  adds %= 7;
  if (adds >= 4) {
    dice += 1;
    adds -= 4;
  }
  return String(dice) + "d" + (adds > 0 ? "+" + adds : "") + match[3];
}

export function applyMartialArtsDamage(formula, { committedStrong = false, defensiveAttack = false, strengthBased = false } = {}) {
  committedStrong = committedStrong && strengthBased;
  const source = String(formula ?? "").trim();
  if (!committedStrong && !defensiveAttack) return source;
  const dice = source.match(/^(\d+)d(6)?([+-]\d+)?(.*)$/iu);
  if (dice) {
    const count = Number(dice[1]);
    const adjustment = (committedStrong ? 1 : 0) - (defensiveAttack ? Math.max(2, count) : 0);
    const adds = integer(dice[3]) + adjustment;
    return `${count}d${dice[2] ?? ""}${adds ? (adds > 0 ? "+" : "") + adds : ""}${dice[4]}`;
  }
  const flat = source.match(/^(\d+)(.*)$/u);
  if (flat) {
    const adjustment = (committedStrong ? 1 : 0) - (defensiveAttack ? 2 : 0);
    return String(Number(flat[1]) + adjustment) + flat[2];
  }
  throw new Error("Unsupported melee damage formula for Martial Arts modifier.");
}

export function applyAllOutAttackStrong(formula) {
  const source = String(formula ?? "").trim();
  const match = source.match(/^(\d+)d(?:6)?([+-]\d+)?(.*)$/iu);
  if (!match) return source;
  const dice = Number(match[1]);
  const adds = integer(match[2]);
  const strongBonus = Math.max(2, dice);
  const totalAdds = adds + strongBonus;
  const addText = totalAdds === 0 ? "" : (totalAdds > 0 ? "+" : "") + totalAdds;
  return String(dice) + "d" + addText + match[3];
}

function damageUsesStrength(value, seen = new Set()) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return /(?:^|[^a-z])(sw|swing|thr|thrust)(?=$|[^a-z])/iu.test(value);
  if (Array.isArray(value)) return value.some(entry => damageUsesStrength(entry, seen));
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const key of ["damage", "sourceDamage", "originalDamage", "derivedformula", "formula", "damageAction", "action", "parsedDamage"]) {
    if (damageUsesStrength(value[key], seen)) return true;
  }
  return false;
}

export function isStrengthBasedMeleeDamage(attack) {
  if(attack?.meleeProfile)return ['swing','thrust'].includes(attack.meleeProfile.motion);
  return damageUsesStrength(attack);
}

export function resolveDerivedDamageFormula(baseFormula, actionFormula = "") {
  const base = String(baseFormula ?? "").trim();
  const add = String(actionFormula ?? "").trim();
  const baseMatch = base.match(/^(\d+)d(?:6)?([+-]\d+)?(.*)$/iu);
  if (!baseMatch) return null;
  const terms = parseMeleeDamageTerms(add);
  if (!terms) return null;
  const dice = Number(baseMatch[1])+terms.dice;
  if(dice<0)return null;
  const totalAdds = integer(baseMatch[2]) + terms.adds;
  const adds = totalAdds === 0 ? "" : (totalAdds > 0 ? "+" : "") + totalAdds;
  return String(dice) + "d" + adds + baseMatch[3] + terms.suffix;
}

export function getCurrentTargetNames() {
  return Array.from(globalThis.game?.user?.targets ?? []).map(token => String(token?.name ?? "")).filter(Boolean);
}


export function freezeMeleeAttackProfile({actor,attack,preparedDamage,context={}}){
  const profile=structuredClone(new AttackProfileResolver().resolve({actorId:actor?.id,
    attack,rawAttack:{...attack?.data,damage:preparedDamage?.formula??attack?.damage},ammunition:null,context:{...context,kind:'melee'}}));
  profile.effective.damage=preparedDamage?.formula??null;
  if(preparedDamage?.evidence?.techniques?.reach!==null&&preparedDamage?.evidence?.techniques?.reach!==undefined)profile.effective.reach=preparedDamage.evidence.techniques.reach;
  if(preparedDamage?.evidence?.techniques?.motion)profile.effective.motion=preparedDamage.evidence.techniques.motion;
  if(preparedDamage?.evidence?.maOptions){
    const options=structuredClone(preparedDamage.evidence.maOptions);
    profile.context.maCombatOptions=options;
    if(options.projected?.reach)profile.effective.reach=options.projected.reach;
    if(options.long)profile.effective.reach=extendedMeleeReach(profile.effective.reach??attack?.meleeProfile?.reach??attack?.reach);
  }
  if(attack?.equipmentRef){
    profile.mode.equipmentRef=structuredClone(attack.equipmentRef);
    // GGA's native D:name(mode) link names its original row. The chosen attacking
    // part remains in meleeSnapshot.combatProfile, with its frozen numeric Damage.
    if(!attack.equipmentRef.virtual)profile.mode.mode=attack.equipmentRef.nativeMode;
  }
  profile.sources.raw=attack?.equipmentRef?'Actor.system.equipment (read-only)':attack?.standaloneRef?'flags.olegurps-qol.standaloneWeapons':'Actor.system.melee';
  profile.sources.overrides='world.olegurpsMeleeAssistant';
  profile.damage={...profile.damage,formula:preparedDamage?.formula??null,nativeSafe:!!preparedDamage,
    status:preparedDamage?'resolved':'unresolved',components:[],reason:preparedDamage?null:'melee-damage-unresolved',
    rules:{meleeSnapshot:{version:1,action:preparedDamage?structuredClone(preparedDamage.action):null,
      evidence:preparedDamage?.evidence??null,combatProfile:attack?.meleeProfile?structuredClone(attack.meleeProfile):null}}};
  if(preparedDamage?.evidence?.techniques?.motion&&profile.damage.rules.meleeSnapshot.combatProfile)profile.damage.rules.meleeSnapshot.combatProfile.motion=preparedDamage.evidence.techniques.motion;
  if(preparedDamage?.evidence?.maOptions?.projected?.shieldDisarm){
    profile.effective.damage=null;
    profile.damage={...profile.damage,formula:null,rules:{...profile.damage.rules,instructionOnly:true,
      meleeSnapshot:{...profile.damage.rules.meleeSnapshot,action:null}}};
  }
  const weaponStrength=attack?.meleeProfile?.weaponStrength??attack?.weaponStrength;
  if(preparedDamage?.evidence?.techniques)profile.damage.rules.meleeTechniques=structuredClone(preparedDamage.evidence.techniques);
  if(preparedDamage?.evidence?.sequence)profile.damage.rules.meleeSequence=structuredClone(preparedDamage.evidence.sequence);
  if(preparedDamage?.evidence?.techniqueTargets)profile.context.techniqueTargets=structuredClone(preparedDamage.evidence.techniqueTargets);
  if(weaponStrength){
    profile.damage.rules.weaponStrength={...structuredClone(weaponStrength),
      transmittedDelta:Number.isFinite(context.weaponStrengthDelta)?context.weaponStrengthDelta:null};
  }
  if(attack?.meleeProfile?.unarmed){profile.damage.rules.bsUnarmed=structuredClone(attack.meleeProfile.unarmed);profile.sources.raw=attack.unarmedRef.native?'Actor.system.melee (read-only)':'Basic Set body projection (read-only)';}
  if(attack?.meleeProfile?.utOrdinary)profile.damage.rules.utOrdinary={...structuredClone(attack.meleeProfile.utOrdinary),sourcePages:structuredClone(attack.meleeProfile.sourcePages),manualHints:structuredClone(attack.meleeProfile.manualHints)};
  if(attack?.meleeProfile?.utExotic){
    const ut=structuredClone(attack.meleeProfile.utExotic);profile.damage.rules.utExotic={...ut,manualHints:structuredClone(attack.meleeProfile.manualHints)};
    if(ut.resistanceEffect){profile.damage.rules.resistanceEffect=ut.resistanceEffect;profile.context.resistanceApplicable=true;}
    if(ut.manualLinkedAction){profile.damage.rules.componentOrder=['kinetic','linked'];profile.damage.components=[{role:'kinetic',status:'resolved',formula:preparedDamage?.formula},{role:'linked',status:'resolved',formula:ut.manualLinkedAction.formula+' '+ut.manualLinkedAction.damagetype,source:'UT165',manualConditions:true}];}
    if(ut.tightBeam)profile.damage.rules.tightBeam=true;
    if(ut.instructionOnly){profile.damage={...profile.damage,formula:'spec.',nativeSafe:true,status:'resolved',reason:null,rules:{...profile.damage.rules,instructionOnly:true}};profile.effective.damage='spec.';}
  }
  const special=attack?.meleeProfile?.htSpecial;
  if(special){
    profile.damage.rules.htSpecial={...structuredClone(special),sourcePages:structuredClone(attack.meleeProfile.sourcePages),manualHints:structuredClone(attack.meleeProfile.manualHints)};
    if(special.manualLinkedAction){
      const a=special.manualLinkedAction;profile.damage.rules.componentOrder=['kinetic','linked'];
      profile.damage.components=[{role:'kinetic',status:'resolved',formula:preparedDamage?.formula},
        {role:'linked',status:'resolved',formula:a.formula+' '+a.damagetype,source:'HT199',manualConditions:true}];
    }
    if(special.resistanceEffect){profile.damage.rules.resistanceEffect=structuredClone(special.resistanceEffect);profile.context.resistanceApplicable=true;}
    if(special.instructionOnly){profile.damage={...profile.damage,formula:'spec.',nativeSafe:true,status:'resolved',reason:null,rules:{...profile.damage.rules,instructionOnly:true}};profile.effective.damage='spec.';}
  }
  return profile;
}

export async function executeUTMeleeContact({actor,attack,confirmed=false}={}){
  const p=utExoticSource(attack?.meleeProfile?.modeId);if(!p?.contactProcedure||confirmed!==true||!actor?.isOwner)throw Error('Нужен подтверждённый контакт владельца экземпляра.');
  const preparedDamage=p.instructionOnly?null:await prepareEffectiveMeleeDamage({actor,attack});
  if(!p.instructionOnly&&!preparedDamage)throw Error('GGA не распознал Damage контакта.');
  const profile=freezeMeleeAttackProfile({actor,attack,preparedDamage}),attackId=newAttackId();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return new AmmoService(actor).executeMeleeResource({attack,modeId:p.modeId,attackId,execute:async evidence=>{
    if(evidence)profile.damage.rules.utExotic.resource=structuredClone(evidence);
    const snapshot=createShotSnapshot(profile,{attackId});
    const message=await ChatMessage.create(applyMessageMode(ChatMessage,{speaker:ChatMessage.getSpeaker({actor}),content:'<p><strong>'+esc(p.name)+': контакт подтверждён.</strong></p>'+
      (evidence?'<p>Ресурс: '+evidence.after+' '+esc(evidence.unit)+', расход '+evidence.spent+'.</p>':'')+
      (preparedDamage?'<div class="roll-message gga-chat-message">'+GURPS.gurpslink('[D:"'+attack.name.replaceAll('"','')+'"]')+'</div>':'')+
      '<details class="olegurps-chat-details"><summary>Условия контакта</summary><p>'+esc(p.hints.join(' '))+'</p>'+(evidence?.payload?'<p>'+esc(evidence.payload)+'</p>':'')+'</details>',
      flags:{'olegurps-qol':{shotSnapshot:structuredClone(snapshot),...(profile.damage.rules.resistanceEffect?{resistanceEffect:structuredClone(profile.damage.rules.resistanceEffect)}:{})}}},globalThis.game));
    await message.setFlag('olegurps-qol','shotSnapshot',structuredClone(createShotSnapshot(profile,{attackId,messageId:message.id})));return {rolled:true,message,contact:true};
  }});
}

export async function executeNativeMeleeAttack({ actor, sourceAttack, effectiveSkill, locationText = "", overrideText = "", modifierDetails = [], captureMessage = false, maneuver = null, deceptiveDefensePenalty = 0, telegraphicCriticalBonus = 0, damageOptions = {}, combatCalculation = null, skillCap = null, expectedExecution = null, maManeuverEffort = null } = {}) {
  const techniquePlan=combatCalculation?.metadata?.meleeTechniques??damageOptions.techniquePlan;
  const counterattack=techniquePlan?.special?.id==='counterattack';
  if(techniquePlan&&!techniquePlan.available)throw Error(techniquePlan.errors.join(' '));
  if(techniquePlan)damageOptions={...damageOptions,techniquePlan};
  const knownExternal=(techniquePlan?.externalAdjustments??[]).reduce((n,e)=>n+e.value,0);
  const perks=combatCalculation?.metadata?.combatPerks??[];
  const drunken=perks.find(perk=>perk.name==='Drunken Fighting');
  const rollEffectiveSkill=effectiveSkill-knownExternal;
  const validateExecution=()=>assertMeleeExecutionState(actor,sourceAttack,expectedExecution);
  const maOptions=damageOptions.maOptions;
  const rollWithCombatOptions = async (profile, args, alreadyLocked=false) => {
    let receipt;
    const result=await executePreparedGgaRoll({...args,attackProfile:profile,
      ...(maOptions?.effortCost?{beforeRoll:async()=>{
        const shared=maManeuverEffort&&['lunge','charge'].includes(maOptions.effort);
        const previous=shared?maManeuverEffort[maOptions.effort]:null;
        if(previous){
          const fp=actor.system?.FP?.value,hp=actor.system?.HP?.value;
          if(fp<=-actor.system?.FP?.max)
            throw Error(maRussian()?'Персонаж без сознания при -FP (B426).':'The actor is unconscious at -FP (B426).');
          profile.context.maCombatOptions.fatigue={before:fp,after:fp,hpBefore:hp,hpAfter:hp,cost:0,injury:0,
            source:previous.source,unconscious:false,reused:true};
        }else{
          receipt=await spendCombatFatigue(actor,maOptions.effortCost,{alreadyLocked,requireConscious:true});
          profile.context.maCombatOptions.fatigue=receipt;
          if(shared)maManeuverEffort[maOptions.effort]=receipt;
        }
      }}:{})});
    if(receipt&&result.message){
      const critical=result.rollData?.isCritFailure===true;
      const hint=maRussian()?
        `ЕУ: ${receipt.before} → ${receipt.after}. ЕЖ: ${receipt.hpBefore} → ${receipt.hpAfter}. ${receipt.unconscious?'При -макс. ЕУ персонаж без сознания до восстановления положительных ЕУ (B426).':receipt.after<=0?'Проверяйте Will перед каждым манёвром, кроме Do Nothing. При провале персонаж падает и бездействует до положительных ЕУ. При критическом провале немедленно проверьте HT на сердечный приступ (B426, B429).':''} ${critical?'Критический провал: 1 ЕЖ травмы конечности сверх обычных последствий (B357).':''}`:
        `FP: ${receipt.before} → ${receipt.after}. HP: ${receipt.hpBefore} → ${receipt.hpAfter}. ${receipt.unconscious?'At -max FP, the character is unconscious until FP are positive (B426).':receipt.after<=0?'Roll Will before each maneuver other than Do Nothing. Failure causes collapse and incapacity until FP are positive. On a critical failure, immediately roll HT to avoid a heart attack (B426, B429).':''} ${critical?'Critical miss: 1 HP of injury to the limb in addition to normal consequences (B357).':''}`;
      await result.message.update({content:result.message.content+'<p>'+hint+'</p>'});
    }
    return result;
  };
  validateExecution();
  if(maneuver?.type==='defensiveAttack')maneuver={type:'defensiveAttack'};
  if(sourceAttack?.standaloneRef?.modeId===HT_TEAR_SPRAY_MODE){
    if(!actor?.isOwner||sourceAttack.readinessReason)throw Error(sourceAttack.readinessReason??'Permission');
    const service=new AmmoService(actor);await service.loadState();const weapon=actor.getFlag('world','gurpsAmmoManager').weapons.find(w=>w.standaloneWeaponId===sourceAttack.standaloneRef.weaponId),attackId=newAttackId();
    const result=await service.executeShot({weaponId:weapon.id,attackId,
      prepare:({state,ammunition})=>({amount:1,profile:resolveRuntimeAttackProfile({actor,attack:sourceAttack,weaponId:weapon.id,state,ammunition,context:{kind:'melee',effectiveSkill}})}),
      execute:({profile})=>executePreparedGgaRoll({actor,attack:sourceAttack,attackProfile:profile,shotSnapshot:createShotSnapshot(profile,{attackId}),baseSkill:sourceAttack.level,baseSkillName:sourceAttack.skillDescription,effectiveSkill:rollEffectiveSkill,physicalShots:1,effectiveRoF:1,rcl:1,combatType:'melee',maneuver,combatCalculation,skillCap,attackContextHtml:overrideText||locationText})});
    return {success:result.rolled,hit:result.rollData?!result.rollData.failure:false,message:result.message,rollData:result.rollData};
  }
  if(sourceAttack?.equipmentRef)assertShieldEquipmentReference(actor,sourceAttack.equipmentRef);
  const selectedShield=damageOptions.attack??sourceAttack;
  const selectedId=selectedShield?.meleeProfile?.modeId??selectedShield?.standaloneRef?.modeId??selectedShield?.equipmentRef?.modeId;
  if(!utOrdinaryAllowed(utOrdinarySource(selectedId),readMeleeProfileSelection(actor,sourceAttack)))throw Error('Для этой длины нужна явно выбранная модификация Variable Force Sword этого экземпляра.');
  const utSource=utExoticSource(selectedId),instructionOnly=(utSource??htSpecialSource(selectedId))?.instructionOnly===true;
  if(utSource?.contactProcedure)throw Error('Этот режим требует подтверждённого контакта в редакторе, без нового Attack.');
  const shieldSource=ltShieldToolSource(selectedId)??ltImprovisedSource(selectedId);
  if(!shieldModeAllowed(shieldSource,actor?.getFlag?.('olegurps-qol','meleeProfiles')?.profiles?.[meleeProfileKey(sourceAttack)]??{}))throw Error('Ударный элемент этого щита больше не установлен. Откройте профиль заново.');
  if (utSource||instructionOnly||sourceAttack?.unarmedRef||sourceAttack?.standaloneRef||sourceAttack?.equipmentRef?.virtual) {
    if (!actor?.isOwner || sourceAttack.readinessReason) throw new Error(sourceAttack.readinessReason ?? "Нет прав на атаку.");
    const selectedAttack=damageOptions.attack??sourceAttack;
    if(selectedAttack.readinessReason)throw Error(selectedAttack.readinessReason);
    const preparedDamage = instructionOnly?null:await prepareEffectiveMeleeDamage({ ...damageOptions, actor, attack: selectedAttack });
    if (!preparedDamage&&!instructionOnly) throw new Error("Формула автономной атаки не распознана GGA.");
    const attack = { ...selectedAttack, data: { ...selectedAttack.data, damage: preparedDamage?.formula??'spec.' } };
    const profile = freezeMeleeAttackProfile({ actor, attack, preparedDamage,
      context: { effectiveSkill, weaponBond:combatCalculation?.channels?.find(c=>c.id==='weaponBond')?.resolvedValue===1,
        weaponStrengthDelta:combatCalculation?.metadata?.weaponStrengthDelta,
        ...(perks.length?{combatPerks:perks}:{}),
        deceptiveDefensePenalty, telegraphicCriticalBonus } });
    if(damageOptions.techniqueTargets)profile.context.techniqueTargets=structuredClone(damageOptions.techniqueTargets);
    validateWeaponShotResources(actor,profile,1,attack);
    const attackId = newAttackId();
    const run=async evidence=>{
    if(evidence){profile.resourceConsumption={utMelee:structuredClone(evidence)};profile.damage.rules.utExotic.resource=structuredClone(evidence);}
    if(counterattack&&!maOptions)return rollCounterattack({actor,attack,profile,attackId,level:rollEffectiveSkill,skillCap,drunken,
      details:(overrideText||locationText)+unarmedDamageExplanation(selectedAttack),maneuver,deceptiveDefensePenalty,telegraphicCriticalBonus});
    return rollWithCombatOptions(profile,{ actor, attack,
      shotSnapshot: maOptions?null:createShotSnapshot(profile, { attackId }), baseSkill: sourceAttack.level,
      baseSkillName: sourceAttack.skillDescription, effectiveSkill:rollEffectiveSkill, physicalShots: 1, effectiveRoF: 1, rcl: 1,
      combatType: "melee", maneuver, telegraphicCriticalBonus, combatCalculation, skillCap,
      deceptiveDefensePenalty, attackContextHtml: (overrideText || locationText)+unarmedDamageExplanation(selectedAttack) },!!utSource);};
    const result=utSource?await new AmmoService(actor).executeMeleeResource({attack:selectedAttack,modeId:selectedId,attackId,validate:validateExecution,execute:run}):await run(null);
    if(result.rolled&&result.utMeleeResourceEvidence){
      const resource=structuredClone(result.utMeleeResourceEvidence);profile.damage.rules.utExotic.resource=resource;profile.resourceConsumption={utMelee:resource};
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      await result.message.update({content:result.message.content+'<p>Ресурс: '+resource.after+'/'+resource.capacity+' '+esc(resource.unit)+'; расход '+resource.spent+'.</p>'});
    }
    if (result.rolled&&(!counterattack||maOptions||result.utMeleeResourceEvidence)) await result.message.setFlag("olegurps-qol", "shotSnapshot",
      structuredClone(createShotSnapshot(profile, { attackId, messageId: result.message.id })));
    return { success: result.rolled, hit: result.rollData ? !result.rollData.failure : false,
      message: result.message, rollData: result.rollData };
  }
  if (typeof globalThis.GURPS?.performAction !== "function") throw new Error("GGA performAction недоступен.");
  const selectedAttack=damageOptions.attack??sourceAttack;
  if(selectedAttack?.readinessReason)throw Error(selectedAttack.readinessReason);
  const preparedDamage=await prepareEffectiveMeleeDamage({...damageOptions,actor,attack:selectedAttack});
  const profile=freezeMeleeAttackProfile({actor,attack:selectedAttack,preparedDamage,
    context:{effectiveSkill,weaponBond:combatCalculation?.channels?.find(c=>c.id==='weaponBond')?.resolvedValue===1,
      weaponStrengthDelta:combatCalculation?.metadata?.weaponStrengthDelta,
      ...(perks.length?{combatPerks:perks}:{}),
      deceptiveDefensePenalty,telegraphicCriticalBonus,maneuver}});
  const attackId=newAttackId();
  if(maOptions){
    validateWeaponShotResources(actor,profile,1,selectedAttack);
    const result=await rollWithCombatOptions(profile,{actor,attack:selectedAttack,baseSkill:combatCalculation?.baseSkill,
      effectiveSkill:rollEffectiveSkill,physicalShots:1,effectiveRoF:1,rcl:1,combatType:'melee',maneuver,
      telegraphicCriticalBonus,combatCalculation,skillCap,deceptiveDefensePenalty,attackContextHtml:overrideText||locationText});
    if(result.rolled)await result.message.setFlag('olegurps-qol','shotSnapshot',
      structuredClone(createShotSnapshot(profile,{attackId,messageId:result.message.id})));
    return {success:result.rolled,hit:result.rollData?!result.rollData.failure:false,message:result.message,rollData:result.rollData};
  }
  if(counterattack){
    const result=await rollCounterattack({actor,attack:sourceAttack,profile,attackId,level:rollEffectiveSkill,skillCap,drunken,
      details:overrideText||locationText,maneuver,deceptiveDefensePenalty,telegraphicCriticalBonus});
    return {success:result.rolled,hit:result.hit,message:result.message,rollData:result.rollData};
  }
  const originalLevel = Number(sourceAttack?.level ?? sourceAttack?.import);
  if (!Number.isFinite(originalLevel) || !Number.isFinite(Number(effectiveSkill))) {
    throw new Error("Не удалось определить уровень выбранной melee-атаки.");
  }
  const name = String(sourceAttack?.name ?? "").trim();
  const mode = String(sourceAttack?.mode ?? "").trim();
  if (!name) throw new Error("У выбранной melee-атаки нет названия.");
  const actionName = mode ? name + " (" + mode + ")" : name;
  const modifier = Math.trunc(Number(rollEffectiveSkill)) - Math.trunc(originalLevel)+drunkenTaggedCredit(actor,sourceAttack,drunken,'melee');
  const [compactModifier] = buildCompactAttackModifiers(modifier);
  const modifierBreakdown = buildAttackModifierBreakdownHtml(modifierDetails,weaponStrengthExplanation(
    profile.damage?.rules?.weaponStrength,{baseLevel:combatCalculation?.baseSkill??originalLevel}));
  const attackContext = overrideText || locationText;
  const contextBreakdown = attackContext
    ? `<details class="olegurps-attack-context"><summary style="cursor:pointer">Условия атаки</summary><div>${attackContext}</div></details>` : "";
  const displayText = [contextBreakdown, modifierBreakdown].filter(Boolean).join("");
  const perform = () => performMeleeActionWithoutConfirmation(() => globalThis.GURPS.performAction({
    type: "attack",
    name: actionName,
    isMelee: true,
    isRanged: false,
    mod: compactModifier ? String(compactModifier.modint) : undefined,
    desc: compactModifier?.desc ?? "",
    overridetxt: displayText || undefined,
    maneuver,
    deceptiveDefensePenalty: integer(deceptiveDefensePenalty),
    orig: "M:" + actionName
  }, actor, null, getCurrentTargetNames()));
  globalThis.GURPS.SetLastActor?.(actor);
  const criticalName = name.replace(/\[[^\]]*\]/gu, "").replace(/ +/gu, " ").trim();
  const execute = () => withTelegraphicCriticalLimit(globalThis.GURPS, actor?.id,
    criticalName, telegraphicCriticalBonus, perform);
  const execution = (captureMessage||preparedDamage)&&globalThis.ChatMessage
    ? await executeWithCapturedRollMessage({ ChatMessage: globalThis.ChatMessage, actorId: actor?.id, execute })
    : { result: await execute(), message: null };
  // Native GGA returns false for a rolled miss as well as for cancellation. A captured roll proves execution.
  if(execution.message?.setFlag)await execution.message.setFlag('olegurps-qol','shotSnapshot',
    structuredClone(createShotSnapshot(profile,{attackId,messageId:execution.message.id})));
  if(execution.message?.setFlag&&profile.damage.rules.resistanceEffect)await execution.message.setFlag('olegurps-qol','resistanceEffect',
    {...structuredClone(profile.damage.rules.resistanceEffect),eligible:execution.result!==false});
  return { success: !!execution.message||!!execution.result, hit:execution.message?execution.result!==false:undefined,
    message: execution.message ?? null };
}

function materializeDamageAction(source, actor, { dicePlusAdds = false, allOutStrong = false,
  committedStrong = false, defensiveAttack = false, applyArmST = false, meleeProfile=null, martialAttack=null,techniquePlan=null,maOptions=null } = {}, overrideText = "") {
  if (!source || !["damage", "deriveddamage"].includes(source.type)) return null;
  const applyCommitted = committedStrong && committedStrongEligible(martialAttack,source);
  const action = { ...source };
  if (action.type === "deriveddamage") {
    const mode = /sw/i.test(action.derivedformula) ? 'swing' : 'thrust';
    const strength = resolveStrengthDamage(actor,mode,{applyArmST,maximumST:meleeProfile?.strength?.maximumST??null});
    if(!strength.ready)throw Error(strength.reason);
    const resolved = resolveDerivedDamageFormula(strength.baseFormula, action.formula);
    if (!resolved) return null;
    action.type = "damage";
    action.formula = resolved;
    action.overridetxt = resolved;
    delete action.derivedformula;
    action.olegurpsStrength={effectiveST:strength.effectiveST,strengthKind:strength.strengthKind,
      mode,baseFormula:strength.baseFormula,source:strength.source,applied:strength.applied??null,
      modifiers:strength.strength.modifiers,ggaDamage:strength.strength.ggaDamage};
  }
  const primaryStrike=techniquePlan?.primaryStrike;
  const quality=primaryStrike?null:meleeProfile?.quality;
  if(quality){
    if(quality.damageBonus&&quality.damageTypes.includes(action.damagetype)){
      action.formula=resolveDerivedDamageFormula(action.formula,(quality.damageBonus>0?'+':'')+quality.damageBonus);
      if(!action.formula)return null;
    }
    if(quality.replaceDamageType&&action.damagetype==='cut'){
      action.damagetype=quality.replaceDamageType;
      action.formula=action.formula.replace(/\([\d.]+\)/,'');
      action.formula=action.formula.replace(/(!?)$/,'('+quality.armorDivisor+')$1');
    }
    if(quality.materialTransform){
      action.damagetype=quality.materialTransform.type;
      if(quality.materialTransform.replaceDivisor){
        action.formula=action.formula.replace(/\([\d.]+\)/,'');
        if(quality.materialTransform.divisor)action.formula=action.formula.replace(/(!?)$/,'('+quality.materialTransform.divisor+')$1');
      }
    }
  }
  const grip=primaryStrike?null:meleeProfile?.gripEffects;
  const unarmed=primaryStrike?null:meleeProfile?.unarmed;
  if(unarmed&&!unarmed.alreadyIncluded&&!unarmed.manualDamage&&source.type==='deriveddamage'&&/^thr/i.test(source.derivedformula)){
    const bonus=unarmed.baseThrustDice*(unarmed.bonusPerDie+unarmed.naturalPerDie);
    action.formula=resolveDerivedDamageFormula(action.formula,(bonus>=0?'+':'')+bonus);
    if(!action.formula)return null;
    action.olegurpsUnarmed=structuredClone(unarmed);
  }
  if(!primaryStrike&&meleeProfile?.damageSkill?.bonusPerDie){
    const dice=Number(/^(\d+)d/.exec(action.formula)?.[1]??0),bonus=dice*meleeProfile.damageSkill.bonusPerDie;
    action.formula=resolveDerivedDamageFormula(action.formula,'+'+bonus);
    if(!action.formula)return null;
  }
  if(grip?.damage||grip?.swingReduction){
    const dice=Number(/^(\d+)d/.exec(action.formula)?.[1]??0);
    const adjustment=(grip.damage??0)-(grip.swingReduction?Math.max(2,dice):0);
    action.formula=resolveDerivedDamageFormula(action.formula,(adjustment>=0?'+':'')+adjustment);
    if(!action.formula)return null;
  }
  if(techniquePlan){
    if(!techniquePlan.available)throw Error(techniquePlan.errors.join(' '));
    const dice=Number(/^(\d+)d/.exec(action.formula)?.[1]??0);
    const strikeBonus=(primaryStrike?.bonusPerDie??0)*dice;
    const strikeAdditions=(techniquePlan.strikes??[]).reduce((sum,strike)=>sum+strikeDamageDelta(strike,dice),0);
    const delta=techniquePlan.damageFlat-(techniquePlan.damageReduction?Math.max(2,dice):0)+strikeBonus+strikeAdditions;
    if(delta){action.formula=resolveDerivedDamageFormula(action.formula,(delta>0?'+':'')+delta);if(!action.formula)return null;}
    if(techniquePlan.damageType)action.damagetype=techniquePlan.damageType;
    action.olegurpsMeleeTechniques=structuredClone(techniquePlan);
  }
  if (allOutStrong&&!techniquePlan?.strikeManeuver) action.formula = applyAllOutAttackStrong(action.formula);
  const optionAttack=maOptions?.projected;
  if(optionAttack?.bonus||optionAttack?.flat){
    const dice=Number(/^(\d+)d/.exec(action.formula)?.[1]??0);
    const delta=dice*(optionAttack.bonus??0)+(optionAttack.flat??0);
    if(delta)action.formula=resolveDerivedDamageFormula(action.formula,(delta>0?'+':'')+delta);
    if(!action.formula)return null;
  }
  if(optionAttack?.knockbackOnly)action.olegurpsKnockbackOnly=true;
  if(maOptions?.swingPenalty&&!optionAttack?.formula){
    const dice=Number(/^(\d+)d/.exec(action.formula)?.[1]??0);
    action.formula=resolveDerivedDamageFormula(action.formula,String(-Math.max(2,dice)));
    if(!action.formula)return null;
  }
  if (applyCommitted || defensiveAttack) {
    const committed=applyCommitted&&!techniquePlan?.strikeManeuver;
    action.formula = applyMartialArtsDamage(action.formula, { committedStrong:committed, defensiveAttack, strengthBased:committed });
    if(committed)action.olegurpsCommittedStrong={applied:true,bonus:1,source:'MA100',sourceType:source.type,derivedformula:source.derivedformula};
  }
  if (dicePlusAdds) action.formula = modifyDicePlusAdds(action.formula);
  if(!primaryStrike&&meleeProfile?.damageCap){
    const cap=/^1d([+-]\d+)?$/.exec(meleeProfile.damageCap);
    const value=/^(\d+)d(?:6)?([+-]\d+)?(.*)$/.exec(action.formula);
    if(!cap||!value)throw Error('Не удалось проверить предел Damage стрелы (LT63).');
    if(Number(value[1])>1||Number(value[2]??0)>Number(cap[1]??0))action.formula=meleeProfile.damageCap+value[3];
    action.olegurpsDamageCap={maximum:meleeProfile.damageCap,source:'LT63'};
  }
  if(techniquePlan)action.overridetxt=action.formula;
  if(techniquePlan?.strikes?.some(strike=>strike.procedure==='lethalEye'))action.hitlocation='Eye';
  if(source.next){
    action.next=materializeDamageAction(source.next,actor,{dicePlusAdds,allOutStrong,committedStrong,defensiveAttack,applyArmST},source.next.orig??'');
    if(!action.next)return null;
  }
  return action;
}

function structuredDamageAction(attack) {
  const candidates = [
    attack?.damageAction,
    attack?.action?.damage,
    attack?.data?.damageAction,
    attack?.data?.action?.damage,
    attack?.data?.parsedDamage,
    attack?.data?.damage
  ];
  for (const candidate of candidates) {
    const action = candidate?.action ?? candidate;
    if (action && typeof action === "object" && ["damage", "deriveddamage"].includes(action.type)) return action;
  }
  return null;
}

function projectedStrikeDamageAction(expression){
 const model=inferMeleeDamageModel(expression);
 if(model.mode!=='thrust')return fallbackDamageAction(expression);
 const formula=model.bonus>0?'+'+model.bonus:model.bonus<0?String(model.bonus):'';
 return {type:'deriveddamage',derivedformula:'thr',formula,damagetype:model.damageType,orig:expression};
}

function fallbackDamageAction(expression) {
  const match = String(expression ?? "").trim().match(
    /^(?<formula>(?:\d+d(?:6)?(?:[+-]\d+)?|\d+)(?:[xX*]\d+(?:\.\d+)?)?(?:\(\d*\.?\d+\))?!?)\s+(?<type>[^\s,]+)(?<extra>.*)$/u
  );
  if (!match?.groups) return null;
  return {
    type: "damage",
    formula: match.groups.formula,
    damagetype: match.groups.type,
    extdamagetype: match.groups.extra.trim() || undefined,
    orig: String(expression).trim()
  };
}

export async function buildMeleeDamageAction({ actor, attack, damage, dicePlusAdds = false,
  allOutStrong = false, committedStrong = false, defensiveAttack = false,techniquePlan=null,maOptions=null } = {}) {
  if(maOptions?.error)throw Error(maOptions.error);
  if(techniquePlan?.available===false)throw Error(techniquePlan.errors.join(' '));
  if(techniquePlan?.special?.special.kind&&techniquePlan.special.special.kind!=='attack')return null;
  const optionAttack=maOptions?.projected;
  const projection=optionAttack?.formula?
    {damage:optionAttack.formula,part:optionAttack.action==='pummel'&&!optionAttack.reversed?'hand':'weapon'}:techniquePlan?.primaryStrike;
  if(projection){
    if(!projection.damage)throw Error('Для этой техники ещё не определён Damage.');
    damage=projection.damage;
    attack={...attack,damage:projection.damage,sourceDamage:'',damageModel:null,
      applyArmST:optionAttack?.reversed?attack.applyArmST:['hand','hands','elbow','finger'].includes(projection.part),
      meleeProfile:{...(optionAttack?.formula?{}:attack.meleeProfile),
        strength:{maximumST:optionAttack?.reversed?attack.meleeProfile?.strength?.maximumST??null:null},
        motion:projection.damage.startsWith('thr')?'thrust':'collision'}};
  }
  const expression = String(damage ?? attack?.damage ?? "").trim();
  const sourceExpression = String(Array.isArray(attack?.sourceDamage)
    ? attack.sourceDamage.join(", ")
    : attack?.sourceDamage ?? "").trim();
  const hasDamageOverride = !!sourceExpression && expression !== sourceExpression;
  let action = projection?projectedStrikeDamageAction(expression):hasDamageOverride?null:structuredDamageAction(attack);
  if (!action && expression) {
    const nativeParser = await getMeleeNativeDamageParser();
    action = parseCompleteMeleeDamage(expression,nativeParser) ?? (!nativeParser?fallbackDamageAction(expression):null);
  }
  const applyStrong = (allOutStrong || maOptions?.effort==='mighty') && isStrengthBasedMeleeDamage(attack);
  return materializeDamageAction(action, actor,
    { dicePlusAdds, allOutStrong: applyStrong, committedStrong, defensiveAttack, applyArmST:attack?.applyArmST===true,
      meleeProfile:attack?.meleeProfile??null,martialAttack:attack,techniquePlan,maOptions }, expression);
}

export function formatMeleeDamageAction(action) {
  if (!action?.formula) return "";
  return [action.formula, action.damagetype, action.extdamagetype]
    .map(value => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export async function prepareEffectiveMeleeDamage({ actor, attack, dicePlusAdds = false,
  allOutStrong = false, committedStrong = false, defensiveAttack = false,techniquePlan=null,sequence=null,techniqueTargets=null,strikePrerequisite=null,maOptions=null } = {}) {
  const action = await buildMeleeDamageAction({ actor, attack, dicePlusAdds, allOutStrong,
    committedStrong, defensiveAttack,techniquePlan,maOptions });
  if(!action)return null;
  if(sequence?.kind==='whirlwind'&&sequence.location?.key)action.hitlocation=sequence.location.key;
  const components=[];for(let node=action;node;node=node.next)components.push(formatMeleeDamageAction(node));
  return {action,formula:components.join(', '),
    evidence:{version:1,sourceDamage:String(attack?.damage??''),damageModel:attack?.damageModel??inferMeleeDamageModel(attack?.damage),
      combatProfile:attack?.meleeProfile?structuredClone(attack.meleeProfile):null,
      applyArmST:attack?.applyArmST===true,strength:action.olegurpsStrength??null,...(techniquePlan?{techniques:structuredClone(techniquePlan)}:{}),...(sequence?{sequence:structuredClone(sequence)}:{}),...(techniqueTargets?{techniqueTargets:structuredClone(techniqueTargets)}:{}),
      ...(strikePrerequisite?{strikePrerequisite:structuredClone(strikePrerequisite)}:{}),
      ...(maOptions?{maOptions:structuredClone(maOptions)}:{}),
      martial:{dicePlusAdds,allOutStrong:allOutStrong&&!techniquePlan?.strikeManeuver&&isStrengthBasedMeleeDamage(attack),
        committedStrongRequested:committedStrong,committedStrong:action.olegurpsCommittedStrong?.applied===true,defensiveAttack}}};
}

export async function executeNativeMeleeDamage({ actor, attack, dicePlusAdds = false, allOutStrong = false,
  committedStrong = false, defensiveAttack = false, preparedDamage = null } = {}) {
  const DamageChat = globalThis.GURPS?.DamageChat;
  if (typeof DamageChat?.create !== "function") throw new Error("GGA DamageChat недоступен.");
  installMeleeNativeDamage();
  const applyStrong = allOutStrong && isStrengthBasedMeleeDamage(attack);
  let action = preparedDamage?.action
    ?? (await prepareEffectiveMeleeDamage({ actor, attack, dicePlusAdds, allOutStrong: applyStrong,
      committedStrong, defensiveAttack }))?.action;
  if (!action) throw new Error("Формула урона выбранной melee-атаки не распознана GGA.");
  globalThis.GURPS.SetLastActor?.(actor);
  const targets = getCurrentTargetNames();
  let rolled = false;
  while (action) {
    if(basicDamageOnly(action)){
      const message=await rollBasicDamage(actor,action);
      if(!message)return rolled;
      action=action.next;rolled=true;
      continue;
    }
    await createGgaDamageWithEasterEgg({
      DamageChat,
      actor,
      args: [
        actor,
        action.formula,
        action.damagetype,
        numericMeleeDamageEvent(null,action),
        action.overridetxt ?? null,
        [...targets],
        action.extdamagetype ?? null,
        action.hitlocation ?? null
      ]
    });
    rolled = true;
    action = action.next;
  }
  return rolled;
}
