// High-Tech 4e, HT13,71,181. These are optical afflictions, not numeric Damage.
export const HT_LASER_PROFILES=Object.freeze({
  WALzMQGej7znsQIsa:Object.freeze({modeId:'WALzMQGej7znsQIsa',equipmentId:'eLgOAdNLrSH2jazh8',name:'NORINCO QXJ04',
    cellSize:'M',shots:100,attribute:'HT',modifier:-5,halfRange:1500,maximum:4500,coneWidth:3,
    outcome:'temporary-blindness',source:'HT181',batterySource:'HT13,181'}),
  W46_tIuztoKnpftYj:Object.freeze({modeId:'W46_tIuztoKnpftYj',equipmentId:'eqIYFShOVnvBaECYE',name:'NORINCO ZM87',
    cellSize:'VL',shots:1000,attribute:'HT',modifier:-10,halfRange:3600,maximum:11000,coneWidth:null,
    outcome:'crippling-blindness',source:'HT181; B422',batterySource:'HT13,181'})
});
export const htLaserProfile=id=>Object.hasOwn(HT_LASER_PROFILES,id??'')?HT_LASER_PROFILES[id]:null;
export const htLaserWeapon=weapon=>htLaserProfile(weapon?.standaloneModeId??weapon?.catalogModeId);
export function projectHTLaserMode(mode,equipment){
  const p=equipment?.source==='HT'&&htLaserProfile(mode?.weapon_mode_id);
  if(!p||p.equipmentId!==equipment.equipment_id)return mode;
  return {...mode,ht_laser_source:{...p},attack_resolution:{...mode.attack_resolution,
    geometry:p.coneWidth?{type:'cone',width_yards_at_max_range:p.coneWidth,source:'HT181'}:null}};
}
export function htLaserEffect(id,range=null){
  const p=htLaserProfile(id);if(!p)return null;
  const n=Number(String(range??p.halfRange).replaceAll(',','').split('/')[0]);
  return {version:1,id:p.modeId,name:p.name,attribute:p.attribute,modifier:p.modifier,
    condition:'vision-laser',halfRange:Number.isFinite(n)&&n>0?n:p.halfRange,outcome:p.outcome,source:p.source};
}
export function htLaserInstructions(id){
  const p=htLaserProfile(id);if(!p)return [];
  return [(p.coneWidth?'Зелёный луч, конус 3 ярда на максимальной дальности; область — вручную. ':'Треножная установка, узкий луч; прицеливание именно в глаза не требуется. ')+
    'Действует только на смотрящих в сторону лазера. HT181.',
    'Сопротивление: за ½D +3, Protected Vision +5, Nictitating Membrane +1/уровень; DR не помогает. HT181.'];
}
export function htLaserDamage(raw,id){
  const p=htLaserProfile(id);if(!p)return null;
  const match=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/),effect=htLaserEffect(id,raw.range);
  const valid=String(raw.damage)===`HT${p.modifier} aff`&&!!match;
  return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Для лазера HT нужен штатный профиль сопротивления и Range.',
    rawFormula:raw.damage,formula:null,components:[],transformations:[],effectiveChanges:{},
    rules:{instructionOnly:true,htLaser:id,resistanceEffect:effect,ammunitionSource:'HT181',
      ballisticRange:match?{halfDamage:Number(match[1]),maximum:Number(match[2]),minimum:null,source:'HT181'}:null},
    support:{manual:htLaserInstructions(id).map(text=>({id:'SpecializedPlatform',text}))}};
}
