// Explicit project decisions over UT2007, not official errata. No Actor writes.
export const UT_COMPATIBILITY_REVISION='ut-16-final-2026-10-18';
export const PARTISAN_NEEDLER='WTVT6tvGqOqE1N6e6';
export const ICE_GUN='WPP4GGv21sVx2-CHg';
export const UT_SWARM_MINIMUM_MM=40;
export const UT_EXCLUDED_LP_SHOTGUNS=Object.freeze(['W8mzf5YoC9fFjAhO2','WwK7xKN4sLQXIuQ64','Wap9nUEQPwuDkUEUp','WkudgdqO3lymAYks5','WRvS5pz3LMCzqQyiZ']);
export const UT_ICE_HOMING=Object.freeze(['homing','homing_ir','homing_multispectral_passive','homing_multispectral_antiradiation','homing_multispectral_active','homing_multiscanner']);
export const PARTISAN_EXTERNAL_DART=Object.freeze({basis:'user-approved-conditional',source:'UT139–140; user decision 2026-10-18',
  supply:'external-prepared',familyId:'3mm_n',dosesPerPhysicalShot:1,foundryProduces:false,effect:'manual-after-penetration'});
export function utCompatibilityDecision(modeId,candidateId,{caliberMm}={}){
  const result=(status,reason,basis,conditions=[])=>({status,reason,basis,conditions,revision:UT_COMPATIBILITY_REVISION});
  if(candidateId==='liquid_propellant'&&UT_EXCLUDED_LP_SHOTGUNS.includes(modeId))return {
    ...result('undetermined','UT139: LP для существующего 18.5mmPC не доказан; пользователь окончательно исключил эту конверсию.','user-exclusion'),
    implementationExcluded:true,availabilityTL:9};
  if(candidateId==='swarm'&&caliberMm<UT_SWARM_MINIMUM_MM)return {
    ...result('incompatible','UT152/UT156: принят приоритет специального правила UT156 — Swarm только от 40mm.','UT156-priority-over-UT152',['source-conflict','specific-rule-priority']),availabilityTL:10};
  if(modeId===PARTISAN_NEEDLER&&candidateId==='drugged_dart')return {
    ...result('conditional','Готовый внешний Drugged Dart 3mmN разрешён пользователем; литейка UT140 создаёт только обычные металлические иглы.','user-approved-conditional',['external-prepared-dart','owner-payload','manual-effect']),
    availabilityTL:9,ammunitionSupply:PARTISAN_EXTERNAL_DART};
  if(modeId===ICE_GUN&&UT_ICE_HOMING.includes(candidateId))return {
    ...result('incompatible',candidateId==='homing'||candidateId==='homing_ir'?
      'Пользовательский конструкционный запрет: ледяная игла 3mm Ice Gun не содержит электронику и управление, при любом TL.':
      'UT146: Multi-Spectral/Multiscanner требуют не менее 10mm даже при TL12; Ice Gun имеет 3mm.',
      candidateId==='homing'||candidateId==='homing_ir'?'user-construction-exclusion':'UT146-caliber-limit'),availabilityTL:9};
  return null;
}
export function applyUTCompatibilityPolicy(book,data){
  if(book==='weapons')for(const equipment of data.equipment??[])if(equipment.source==='UT')for(const mode of equipment.modes??[]){
    if(mode.weapon_mode_id===PARTISAN_NEEDLER&&mode.ammunition_profile?.primary_ammo_family_id==='3mm_n'){
      const p=mode.ammunition_profile;p.special_load_ids=[...new Set([...p.special_load_ids,'drugged_dart'])];
      p.compatibility_decisions={revision:UT_COMPATIBILITY_REVISION,drugged_dart:PARTISAN_EXTERNAL_DART,
        foundryOutput:'ordinary-metal-needles-only',foundryCreatesDoses:false};
    }
    if(mode.weapon_mode_id===ICE_GUN)mode.ammunition_profile.compatibility_decisions={revision:UT_COMPATIBILITY_REVISION,homing:'excluded-at-all-TLs'};
  }
  if(book==='ut'){
    const swarm=data.warheads?.find(r=>r.id==='swarm');
    if(swarm){swarm.compatibility.min_size_mm=UT_SWARM_MINIMUM_MM;swarm.compatibility_decision={revision:UT_COMPATIBILITY_REVISION,
      sourceConflict:['UT152:25mm','UT156:40mm'],priority:'UT156',officialErratum:false};}
  }
  return data;
}
