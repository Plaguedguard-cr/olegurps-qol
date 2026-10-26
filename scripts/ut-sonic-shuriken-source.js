// Ultra-Tech 2007, UT166. A reusable thrown weapon, never the UT169 robot.
export const SONIC_SHURIKEN=Object.freeze({modeId:'WBZHReQ7xAJVZ8Bzc',equipmentId:'etE8H6yu0IeEbB-4J',name:'Sonic Shuriken',tl:10,superscience:true,damage:'thr(3) cut',acc:1,rof:1,shots:'T(1)',st:5,bulk:0,weightLb:0.1,cost:400,lc:2,source:'UT166'});
export const sonicShuriken=weapon=>(typeof weapon==='string'?weapon:weapon?.standaloneModeId??weapon?.catalogModeId)===SONIC_SHURIKEN.modeId;
export function sonicShurikenStats(actor,stats){
  const st=Number(actor?.system?.attributes?.ST?.value),thr=String(actor?.system?.thrust??'').trim();
  // Freeze the native actor's current thrust. Never send a derived OTF to historical Damage.
  const valid=Number.isFinite(st)&&st>0&&/^\d+d(?:6)?(?:[+-]\d+)?$/.test(thr);
  return {...stats,damage:valid?thr+'(3) cut':'thr(3) cut',range:valid?`${st*0.5}/${st}`:stats.range,shots:'T(1)',rcl:null};
}
export function projectSonicShuriken(book,data){
  if(book!=='weapons')return data;
  return {...data,equipment:data.equipment.map(e=>e.equipment_id!==SONIC_SHURIKEN.equipmentId?e:{...e,modes:e.modes.map(m=>m.weapon_mode_id!==SONIC_SHURIKEN.modeId?m:{...m,stats:{...m.stats,shots:'T(1)'}})})};
}
