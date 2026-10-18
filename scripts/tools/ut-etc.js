import { htDamageDice, parseKineticDamage, parseDamageRange } from './kinetic-damage-math.js';
import { publishedTL, parseCampaignTL } from './tech-level.js';
import { moduleText } from '../localization.js';
import { applyLPExecutionRequest, LP_PROFILES, lpAdmission } from './ut-liquid-propellant.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { gaussSpeedHTML } from './ut-gauss.js';

export const etcText = key => moduleText('OleGURPS.ETC.' + key);
// UT137-139 (2007). Classes follow the source sections, not caliber or a name heuristic.
// N is the published nominal feed, without the additional chambered round.
const rows = [
  ['WngbnzWRwLntvaRbR','7_5mm_clp','A',18,240,'pistol',137],
  ['WlqvLkGz-INk0A-_o','7_5mm_clp','A',30,450,'pistol',137],
  ['W9chB7ydzOWTAxQP0','10mm_clp','A',20,540,'pistol',137],
  ['WIAo1otMCstnbi4Dv','15mm_clp','A',9,870,'pistol',137],
  ['W5_0Tkbdr1S4b4Hlv','10mm_clp','B',30,750,'SMG',137],
  ['WoLIvHFqsiusWgmXF','5_7mm_cl','B',100,1000,'PDW',137],
  ['WFc8O-LgWxenUseNy','7mm_cl','B',50,1600,'rifle',137],
  ['W30vD5BH3t_VdkWUZ','10mm_cl','B',50,1800,'rifle',137],
  ['W3Ggl5bTeg_44b_rU','10mm_clr','B',12,2700,'rifle',137],
  ['WeFF7cHxefAAGmowq','7mm_cl','B',10,800,'rifle',137],
  ['WlstnlxI_Mm-2UJf0','15mm_cl','B',10,8000,'rifle',137],
  ['WdUnAFzFvv59Smhhk','25mm_cl','B',8,8000,'rifle',137],
  ['W5_HQQYf_zjoG9A7J','7mm_cl','C',200,3000,'machine-gun',138],
  ['WgqAB3QGTUZrgtdES','25mm_cl','C',34,17000,'mounted-machine-gun',138],
  ['WYYJ_58OEKOTk38wi','5_7mm_cl','B',200,2400,'rifle',137],
  ['W6-C_sQqk0Ak_c-8_','7mm_cl','C',400,14000,'mounted-machine-gun',138],
  ['W6bX3WBkGZdZfoeMu','15mm_cl','C',50,34000,'mounted-machine-gun',138],
  ['W8mzf5YoC9fFjAhO2','18_5mm_pc','B',5,450,'shotgun',138],
  ['WwK7xKN4sLQXIuQ64','18_5mm_pc','B',10,800,'shotgun',138],
  ['Wap9nUEQPwuDkUEUp','18_5mm_pc','B',5,330,'shotgun',138],
  ['WtM51JNSpOUIy3Eo1','10mm_clp','B',40,2100,'UAW-shared',137],
  ['WRvS5pz3LMCzqQyiZ','18_5mm_pc','B',40,2100,'UAW-shared',137],
  ['WmyROTLk0gs7lrYCE','10mm_clr','C',60,11000,'machine-gun',138],
  ['WOMuCBSS_c_nIstvm','100mm_cl',null,null,100000,'tank-external-power',138]
];
export const ETC_PROFILES = Object.freeze(Object.assign(Object.create(null),Object.fromEntries(rows.map(([modeId,familyId,cellSize,nominalCapacity,basePrice,weaponClass,page]) =>
  [modeId,Object.freeze({modeId,familyId,cellSize,nominalCapacity,basePrice,weaponClass,minimumTL:9,
    source:'UT139',feedSource:'UT'+page,capacity:cellSize?10*nominalCapacity:null,chargePerPhysicalShot:cellSize?1:0,
    stateKey:cellSize?'etcBattery':null,id:'ut-etc',accounting:cellSize?'module-10x-published-nominal-feed':'tank-external-manual'})]))));
export function etcBlocker(modeId) {
  if (ETC_PROFILES[modeId]) return null;
  if (modeId==='WkudgdqO3lymAYks5') return etcText('Underbarrel');
  return etcText('Unsupported');
}
export function etcAdmission(modeId, catalogs, campaignTL = null) {
  const profile = ETC_PROFILES[modeId], mode = catalogs?.getMode(modeId);
  const equipment = catalogs?.getEquipmentForMode(modeId);
  if (!profile || equipment?.source !== 'UT' || mode?.ammunition_profile?.primary_ammo_family_id !== profile.familyId)
    return {allowed:false,reason:etcBlocker(modeId) ?? etcText('Unsupported')};
  const known = [profile.minimumTL,publishedTL(mode.ammunition_profile.native_weapon_tl)].filter(n=>n!==null);
  const requiredTL = known.length ? Math.max(...known) : null, limit = parseCampaignTL(campaignTL);
  return {allowed:limit===null || requiredTL===null || requiredTL<=limit,requiredTL,profile,
    reason:limit!==null && requiredTL!==null && requiredTL>limit ? etcText('TL') : null};
}
// Applied only by the queued configuration writer. Reading/reloading never installs a cell.
export function applyExecutionRequest(weapon, current, request, catalogs, campaignTL) {
  if (!['ordinary','etc','lp'].includes(request?.variant)) throw Error(etcText('Unsupported'));
  if (request.variant === 'lp') return applyLPExecutionRequest(weapon,current,request,catalogs,campaignTL);
  if (request.variant === 'etc') {
    const admission = etcAdmission(request.modeId,catalogs,campaignTL);
    if (!admission.allowed) throw Error(admission.reason);
    if (weapon.standaloneModeId && weapon.standaloneModeId !== request.modeId) throw Error(etcText('Unsupported'));
    weapon.catalogModeId = request.modeId;
    // Switching off and back on cannot manufacture a fresh cell, even if an old state is damaged.
    if (admission.profile.cellSize && !current?.etcConfigured && current?.executionVariant !== 'etc' && !Object.hasOwn(weapon,'etcBattery')) {
      const p = admission.profile;
      weapon.etcBattery = {type:p.cellSize,nonRechargeable:false,capacity:p.capacity,charge:p.capacity};
    }
    weapon.etcConfigured = true;
  }
  weapon.executionVariant = request.variant;
}
// Weapon conversion precedes ammunition construction. Payload replacements thus retain their own
// printed Damage; APDS's +1/die and range modifiers operate on the converted weapon baseline.
export function etcBallistics(raw, modeId) {
  const profile = ETC_PROFILES[modeId], p = parseKineticDamage(raw?.damage), range = parseDamageRange(raw?.range);
  if (!profile || !p || !range || raw.linked || raw.followup || raw.followUp || raw.components?.length)
    throw Error(etcText('Original'));
  const damage = htDamageDice(p.dice,p.adds,p.multiplier,1.5) +
    (p.divisor !== 1 ? '('+p.divisor+')' : '') + p.minimum + ' ' + p.type + p.suffix;
  return {...raw,damage,range:Math.round(range.halfDamage*1.5)+'/'+Math.round(range.maximum*1.5),
    halfd:Math.round(range.halfDamage*1.5)};
}
export function executionConfigurationHTML(modeId, variant, catalogs, campaignTL, escape, gaussSpeed='standard') {
  if(gaussProfile(modeId))return gaussSpeedHTML({catalogModeId:modeId,gaussSpeed},escape);
  if (!ETC_PROFILES[modeId] && !['W8mzf5YoC9fFjAhO2','WwK7xKN4sLQXIuQ64','Wap9nUEQPwuDkUEUp',
    'WkudgdqO3lymAYks5','WtM51JNSpOUIy3Eo1','WRvS5pz3LMCzqQyiZ','WmyROTLk0gs7lrYCE','WOMuCBSS_c_nIstvm'].includes(modeId)) return '';
  const admission=etcAdmission(modeId,catalogs,campaignTL), selected=variant==='etc';
  const lp=lpAdmission(modeId,catalogs,campaignTL),p=ETC_PROFILES[modeId]??LP_PROFILES[modeId];
  return `<label>${escape(etcText('Execution'))}<select name="weaponExecution"><option value="ordinary"${variant==='ordinary'?' selected':''}>${escape(etcText('Ordinary'))}</option>`+
    (admission.allowed||selected?`<option value="etc"${selected?' selected':''}>ETC</option>`:'')+
    (lp.allowed||variant==='lp'?`<option value="lp"${variant==='lp'?' selected':''}>Liquid Propellant</option>`:'')+
    '</select></label>'+
    (p?`<p class="hint">${escape(etcText('Price'))}: $${p.basePrice*(selected?2:variant==='lp'?1.5:1)} · UT${p.feedSource.slice(2)},139</p>`:'')+
    (!admission.allowed?`<p class="hint">${escape(admission.reason)}</p>`:'');
}
