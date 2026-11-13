import { WeaponStrengthResolver, createWeaponStrengthEvidence, parseWeaponStrength } from './weapon-strength-resolver.js';
import { resolveRangedGoverningSkill } from './ranged-governing-skill-service.js';
import { getAttackOverride } from './weapon-attack-overrides.js';
import { moduleText } from '../localization.js';
import { parseStandaloneSkill } from './standalone-skill-service.js';
import { parseWeaponBulk } from './weapon-bulk.js';
import { rangedWeaponKind, selectedRangedSupport, rangedSupportEffects } from './ranged-support.js';
import { ltPersonalProfile } from '../lt-personal-source.js';
import { ltArtilleryProfile, ltArtilleryConfiguration } from '../lt-artillery-source.js';
import { ltArtilleryCocking, ltArtillerySkill } from './lt-artillery.js';
import { weaponStrengthExplanation } from './weapon-strength-display.js';

/** Current GGA observations plus the explicit, separately recorded UI declaration. */
export function rangedSupportObservations({actor, profile, pistol = false, declaredType = null}) {
  const parsed = parseWeaponStrength(profile.raw?.st);
  const posture = actor?.system?.conditions?.posture;
  return {
    posture: typeof posture === 'string' && ['standing','prone','kneeling','crouching','sitting','crawling'].includes(posture) ? posture : null,
    postureSource: 'Actor.system.conditions.posture (GGA)',
    bipodNotation: parsed.bipod, mountNotation: parsed.mounted, restNotation: parsed.rest,
    foldingStockCapability: parseWeaponBulk(profile.raw?.bulk)?.hasFoldingStock === true,
    pistolMode: pistol,
    missing: [ ...(parsed.bipod && declaredType!=='bipod' ? ['bipod-installed-and-in-use'] : []),
      ...(declaredType==='bipod' && posture!=='prone' ? ['prone-posture-required'] : []),
      ...(parsed.mounted && declaredType!=='mounted' ? ['mount-installed-in-use-and-ready'] : []),
      ...(parsed.rest ? ['musket-rest-ready-stationary-standing'] : []),
      ...(pistol && declaredType!=='pistol-two-handed' ? ['selected-two-handed-pistol-grip'] : []),
      ...(parseWeaponBulk(profile.raw?.bulk)?.hasFoldingStock ? ['current-stock-position'] : []) ]
  };
}

export function rangedStrengthBase(actor, attack, governingSkill = resolveRangedGoverningSkill({actor,binding:attack?.governingSkillBinding})) {
  const manual = getAttackOverride(actor?.getFlag?.('world','gurpsAmmoManager'),attack);
  const explicit = attack?.governingSkillBinding?.strengthBase === 'explicit-clean-skill' && governingSkill?.level > 0;
  const supplied = attack?.weaponStrengthProvenance;
  const clean = !manual && !supplied && !!governingSkill && (!!attack?.standaloneRef || explicit);
  return { level: clean ? governingSkill.level : Number(attack?.level), clean, supplied, manual: !!manual,
    source: clean ? 'ranged-skill:' + governingSkill.source : manual ? 'owner-override' : 'native-total', governingSkill };
}

export function resolveRangedWeaponStrength({ actor, attack, profile, catalogs, weapon = null }) {
  const binding = profile.binding?.confirmed, modeId=binding?.modeId, mode=catalogs?.getMode(modeId), equipment=catalogs?.getEquipmentForMode(modeId);
  const instanceId=attack?.standaloneRef?.weaponId??profile.weaponId??attack?.data?.parentuuid??attack?.key??attack?.path;
  const identity={actorId:actor?.id??profile.actorId,instanceId,equipmentId:binding?.equipmentId,modeId};
  const base=rangedStrengthBase(actor,attack), skill=mode?.governing_skill?.skill;
  const family=String(skill?.name??'').toLowerCase(),specialty=String(skill?.specialization??'').toLowerCase();
  const {firearm,pistol}=rangedWeaponKind(mode);
  const support=selectedRangedSupport({actor,identity,mode,selection:profile.context?.supportSelection,braced:profile.context?.braced===true});
  // Exact source registries distinguish throws, personal engines, and mounted artillery.
  // Crossbow skill alone does not make a bow/crossbow a personal artillery engine.
  const personal=ltPersonalProfile(modeId), artillery=ltArtilleryProfile(modeId);
  // Template-derived ST on utility/improvised extras is not a published minimum for that item.
  const publishedPersonalST=parseWeaponStrength(personal?.stats?.strength);
  const thrown=mode?.combat_type==='ranged'&&personal?.procedure==='ranged'&&!personal.kind.startsWith('crossbow-')&&publishedPersonalST.status==='KNOWN';
  const engine=mode?.combat_type==='ranged'&&artillery?.mechanical===true;
  const supported=firearm||thrown||engine;
  weapon??=actor?.getFlag?.('world','gurpsAmmoManager')?.weapons?.find(w=>w.id===profile.weaponId);
  const engineWeapon=engine?{...weapon,catalogModeId:modeId}:null;
  const configuration=engine?ltArtilleryConfiguration(engineWeapon):null;
  const drawing=engine?ltArtilleryCocking(engineWeapon,actor):null;
  if(engine&&attack?.standaloneRef&&base.clean){
    const selected=ltArtillerySkill(actor,engineWeapon);
    if(selected?.resolved){base.level=selected.level;base.source='lt-artillery-skill:'+selected.source;}
    else {base.clean=false;base.source='unresolved-artillery-skill';}
  }
  if(engine){
    // Use the existing artillery installation declaration, never ST-P3's support select.
    support.input={braced:profile.context?.braced===true};support.selection=null;support.availableTypes=['none'];
    if(!artillery.personal&&artillery.mountRequired&&configuration.mountReady&&configuration.setupReady)
      support.input={...support.input,confirmed:true,confirmedType:'mounted',installed:true,inUse:true,ready:true,
        evidence:{...identity,scope:'current-attack',source:'ltArtilleryConfiguration.mountReady+setupReady'}};
  }
  const normalizedSpecialty=value=>({'smg':'submachine gun','lmg':'light machine gun'}[String(value??'').toLowerCase()]??String(value??'').toLowerCase());
  const selectedIdentity=parseStandaloneSkill(base.governingSkill?.name);
  if(base.clean&&!attack?.standaloneRef&&(!mode||selectedIdentity?.family!==family||normalizedSpecialty(selectedIdentity?.specialty)!==normalizedSpecialty(specialty))){
    base.clean=false;base.level=Number(attack?.level);base.source='native-total';
  }
  if(mode&&!supported){
    base.clean=false;base.level=attack?.standaloneRef?(base.governingSkill?.level??Number(attack?.level)):Number(attack?.level);base.source='existing-out-of-scope-base';
  }
  const proof={...identity,scope:'base-level',source:base.source};
  const plusP=profile.ammunition?.recipe?.variantId==='ht_plus_p';
  const transformed=profile.damage?.rules?.requiredStrength;
  const rawST=profile.raw?.st;
  const instance=attack?.standaloneRef?actor?.getFlag?.('olegurps-qol','standaloneWeapons')?.weapons?.find(w=>w.id===instanceId):null;
  const needsOverride=rawST!==undefined&&String(rawST).trim()!==String(mode?.stats?.strength??'').trim();
  const result=new WeaponStrengthResolver({catalogs}).resolve({actor,weaponIdentity:identity,instance,
    category:engine?(artillery.personal?'personal-artillery':'mechanical-artillery'):thrown?'thrown':firearm?(pistol?'pistol':'firearm'):null,
    source:{book:equipment?.source??equipment?.book,page:equipment?.reference},
    override:needsOverride?{modeId,instanceId,st:rawST}:null,
    provenance:base.supplied??(base.clean?{status:'CLEAN',evidence:proof}:{status:'UNKNOWN'}),
    support:support.input,
    damageProfile:profile.damage?.rules?.ltPersonal?.strength,
    drawingProfile:drawing?{...drawing,strength:drawing.effectiveST}:null,
    ammunition:plusP?{variantId:'ht_plus_p',...(transformed?{requiredStrength:transformed}:{})}:{},
    conditions:!supported?{specialRule:'outside-supported-ranged-ST-scope'}:plusP&&(!profile.damage?.nativeSafe||!transformed)?{specialRule:'unresolved-plus-p-transformation'}:{} });
  let reason=null;
  if(!mode)reason=moduleText('OleGURPS.Strength.UnknownRequirement');
  else if(!supported)reason=moduleText(personal?.procedure==='ranged'&&!personal.kind.startsWith('crossbow-')?
    'OleGURPS.Strength.UnprovenPersonalRequirement':'OleGURPS.Strength.RangedExcluded');
  else if(engine&&!artillery.personal&&!result.requirement.ignored)reason=moduleText('OleGURPS.Strength.ArtilleryPersonalManual');
  else if(result.penalty.provenanceStatus==='UNKNOWN')reason=moduleText('OleGURPS.Strength.UnknownBase');
  else if(result.penalty.desired===null)reason=moduleText('OleGURPS.Strength.UnknownRequirement');
  const compact=createWeaponStrengthEvidence(result);
  return {...compact,support:{...compact.support,runtime:engine?{
    source:'ltArtilleryConfiguration',mountReady:configuration.mountReady,setupReady:configuration.setupReady,
    missing:artillery.mountRequired&&(!configuration.mountReady||!configuration.setupReady)?['artillery-installation-not-ready']:[]
  }:rangedSupportObservations({actor,profile,pistol,declaredType:support.selection?.value}),
    selection:support.selection,availableTypes:support.availableTypes,rejection:support.rejection,
    effects:rangedSupportEffects(result.support,profile.raw?.bulk)},
    baseLevel:base.level,scope:mode?(engine?(artillery.personal?'personal-artillery':'mechanical-artillery'):thrown?'thrown':firearm?'firearm':'excluded'):'unknown',
    ...(thrown||engine?{operation:{
      damage:{...result.strengthForDamage,formula:profile.damage?.formula??null,
        ...(profile.damage?.nativeSafe&&!profile.damage?.rules?.ltPersonal?.strength?{status:'NOT_APPLICABLE',kind:'fixed',reason:null}:{})},
      range:profile.damage?.effectiveChanges?.range??null,
      drawing:drawing?{...result.strengthForDrawing,requiredST:drawing.requiredST,method:drawing.method,applyArmST:drawing.applyArmST}:null,
      ...(engine?{artillery:{personal:artillery.personal,source:artillery.source,
        ratedST:artillery.ratedST,configuration:{...configuration},
        personalUse:artillery.personal?'source-personal-engine':'manual-BL-hands-base-LT81-82'}}:{})}}:{}),
    transformation:result.requirement.transformation,reason,
    ammunition:{ammoId:profile.ammunition?.ammoId??null,ammoKey:profile.ammunition?.ammoKey??null,
      magazineId:profile.resource?.magazineId??null,variantId:profile.ammunition?.recipe?.variantId??'ordinary'}};
}

export function rangedStrengthChannel(evidence) {
  const external=evidence?.proposedDelta==null?0:(evidence.externalComponents??[]).filter(c=>c.scope==='external-channel').reduce((n,c)=>n+c.value,0);
  return {id:'weaponStrength',value:(evidence?.proposedDelta??0)-external,label:moduleText('OleGURPS.Strength.Shortage'),source:'WeaponStrengthResolver'};
}

export function rangedStrengthExplanation(evidence, options) {
  if(!evidence)return '';
  if(evidence.scope==='excluded')return evidence.reason===moduleText('OleGURPS.Strength.UnprovenPersonalRequirement')?evidence.reason:'';
  const transformation=evidence.transformation;
  const runtime=evidence.support?.runtime;
  const selected=evidence.support?.selection?.value;
  const calculation=weaponStrengthExplanation(evidence,options);
  if(evidence.scope==='personal-artillery'||evidence.scope==='mechanical-artillery')
    return [calculation,moduleText('OleGURPS.Strength.ArtilleryHandling',{st:evidence.source.rawST?.replace(/\[\d+\]$/,'')??'?'}),
      evidence.ratedST!==null?moduleText('OleGURPS.Strength.ArtilleryRated',{st:evidence.ratedST}):''].filter(Boolean).join(' ');
  if(selected){
    const type=moduleText('OleGURPS.Support.'+selected);
    const effects=evidence.support.effects;
    return [calculation,transformation?moduleText('OleGURPS.Strength.PlusP',{before:transformation.before,after:transformation.after}):'',
      moduleText(evidence.support.status==='CONFIRMED'?'OleGURPS.Strength.SupportApplied':'OleGURPS.Strength.SupportPosture',{type}),
      effects?.bulkIgnored||effects?.effectiveBulk!==effects?.publishedBulk?moduleText('OleGURPS.Support.Bulk',{
        before:effects?.publishedBulk,after:effects?.bulkIgnored?moduleText('OleGURPS.Support.Ignored'):effects?.effectiveBulk}):''].filter(Boolean).join(' ');
  }
  return [calculation,transformation?moduleText('OleGURPS.Strength.PlusP',{before:transformation.before,after:transformation.after}):'',
    runtime?.bipodNotation?moduleText('OleGURPS.Strength.BipodUnconfirmed'):'',
    runtime?.mountNotation?moduleText('OleGURPS.Strength.MountUnconfirmed'):'',
    runtime?.restNotation?moduleText('OleGURPS.Strength.RestManual'):'',
    runtime?.pistolMode?moduleText('OleGURPS.Strength.PistolGripUnconfirmed'):'',
    runtime?.foldingStockCapability?moduleText('OleGURPS.Strength.StockUnconfirmed'):''].filter(Boolean).join(' ');
}

export function rangedStrengthSignature(evidence){
  if(!evidence)return null;
  return JSON.stringify([evidence.weaponIdentity,evidence.source,evidence.baseLevel,evidence.effectiveRequiredST,evidence.applicableST,
    evidence.provenanceStatus,evidence.knownIncludedPenalty,evidence.proposedDelta,evidence.ammunition,evidence.externalComponents,evidence.transformation,
    // B364 checkbox remains an independent Aim channel. Compare actual support observations instead.
    evidence.support?{...evidence.support,braced:undefined}:null,evidence.operation]);
}
