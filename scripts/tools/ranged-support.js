import { parseWeaponStrength } from './weapon-strength-resolver.js';
import { parseWeaponBulk } from './weapon-bulk.js';

export const SUPPORT_SELECTION_SOURCE = 'ShootingAssistant.support';
export function rangedWeaponKind(mode) {
  const family=String(mode?.governing_skill?.skill?.name??'').toLowerCase();
  const specialty=String(mode?.governing_skill?.skill?.specialization??'').toLowerCase();
  const ordinary=['pistol','rifle','shotgun','submachine gun','light machine gun','musket','machine gun'];
  const firearm=mode?.weapon_family==='firearm'&&['guns','gunner'].includes(family)&&ordinary.includes(specialty)||
    mode?.weapon_family==='gunner'&&family==='gunner'&&specialty==='machine gun';
  return {firearm,pistol:firearm&&family==='guns'&&specialty==='pistol'&&!['two-handed-marker','two-handed'].includes(mode?.hand_use?.value)};
}
export function rangedSupportTypes(mode) {
  const kind=rangedWeaponKind(mode),parsed=parseWeaponStrength(mode?.stats?.strength);
  return ['none',...(kind.firearm&&parsed.bipod?['bipod']:[]),...(kind.firearm&&parsed.mounted?['mounted']:[]),
    ...(kind.pistol?['pistol-two-handed']:[])];
}
export function bindSupportSelection(value,identity) {
  return value&&value!=='none'?{value,actorId:identity.actorId,instanceId:identity.instanceId,
    modeId:identity.modeId,equipmentId:identity.equipmentId,source:SUPPORT_SELECTION_SOURCE}:null;
}
/** Explicit user declaration, revalidated at preview and execution. Never reads Actor flags. */
export function selectedRangedSupport({actor,identity,mode,selection,braced=false}) {
  const availableTypes=rangedSupportTypes(mode),requested=selection?.value??'none';
  const bound=selection?.source===SUPPORT_SELECTION_SOURCE&&['actorId','instanceId','modeId','equipmentId']
    .every(k=>!!identity[k]&&selection[k]===identity[k]);
  const accepted=requested!=='none'&&bound&&availableTypes.includes(requested);
  const posture=typeof actor?.system?.conditions?.posture==='string'?actor.system.conditions.posture:null;
  const evidence=accepted?{source:SUPPORT_SELECTION_SOURCE,...identity,scope:'current-attack'}:{};
  const input=accepted?{braced,confirmed:true,confirmedType:requested,evidence,posture,
    ...(requested==='pistol-two-handed'?{hands:2}:{installed:true,inUse:true,...(requested==='mounted'?{ready:true}:{})})}:{braced};
  return {input,availableTypes,selection:accepted?bindSupportSelection(requested,identity):null,
    rejection:requested!=='none'&&!accepted?'unsupported-or-unbound-support-selection':null};
}
export function rangedSupportEffects(support,rawBulk) {
  const publishedBulk=parseWeaponBulk(rawBulk)?.numericBulk??null;
  const type=support.status==='CONFIRMED'?support.confirmedType:null;
  return {publishedBulk,effectiveBulk:type==='mounted'?null:type==='pistol-two-handed'&&publishedBulk!==null?publishedBulk+1:publishedBulk,
    bulkIgnored:type==='mounted',bracingEligible:['bipod','mounted','pistol-two-handed'].includes(type),
    rule:type==='pistol-two-handed'?'HT84':type==='mounted'?'B270; B412; HT160':type==='bipod'?'B270; B412; HT160':null};
}
/** Local calculation view. Published attack/catalog Bulk remains intact. */
export function withSupportBulk(attack,effects) {
  if(!effects||!effects.bulkIgnored&&effects.effectiveBulk===effects.publishedBulk)return attack;
  const bulk=effects.bulkIgnored?0:effects.effectiveBulk;
  return {...attack,bulk,data:{...attack?.data,bulk},bulkMetadata:{...attack?.bulkMetadata,numericBulk:bulk}};
}
