import {LT_BOW_PROFILES} from './lt-bow-source.js';
const parents=Object.values(LT_BOW_PROFILES).filter(p=>p.kind!=='bow'&&p.modeId!=='WFAwJH7XlIK-bIy0Q');
const hook='lt_p3_object_eLTP3GrapplingHook',padded='lt_p3_object_eLTP3PaddedGrapplingHook';
export const LT_CROSSBOW_UTILITY_PROFILES=Object.freeze(Object.fromEntries(parents.flatMap(parent=>['rope','hook'].map(kind=>{
 const modeId='WLTP7'+kind+'_'+parent.modeId;
 return [modeId,Object.freeze({modeId,parentModeId:parent.modeId,name:parent.name+' — '+(kind==='rope'?'Weighted Rope':'Grappling Hook'),kind:'crossbow-'+kind,damage:'spec.',range:'spec.',source:'LT125; LT74–76',noDamage:true,recoverable:true,procedure:'ranged',hitBonus:0,ammoIds:kind==='rope'?['lt_p7_weighted_rope']:[hook,padded]})];
}))));
export const ltCrossbowUtilityProfile=id=>LT_CROSSBOW_UTILITY_PROFILES[id]??null;
export function projectLTCrossbowUtility(book,data){
 if(book==='weapons')for(const p of Object.values(LT_CROSSBOW_UTILITY_PROFILES)){
  const equipment=data.equipment.find(e=>e.modes.some(m=>m.weapon_mode_id===p.parentModeId));if(!equipment)continue;
  const existing=equipment.modes.find(m=>m.weapon_mode_id===p.modeId);if(existing){existing.lt_personal_contract={...p,equipmentId:equipment.equipment_id};continue;}
  const parent=equipment.modes.find(m=>m.weapon_mode_id===p.parentModeId),mode=structuredClone(parent);
  Object.assign(mode,{weapon_mode_id:p.modeId,index:equipment.modes.length,usage:p.kind==='crossbow-rope'?'Доставить верёвку с грузом':'Доставить крюк с верёвкой',lt_personal_contract:{...p,equipmentId:equipment.equipment_id},lt_ammo_item_ids:[...p.ammoIds],raw_calc:{damage:'spec.'}});
  delete mode.lt_bow_contract;
  mode.stats={...mode.stats,damage:{base:'spec.'},accuracy:parent.stats.accuracy,range:'spec.',rate_of_fire:'1',shots:'1',recoil:null};
  mode.lt_ranged_contract={rclNotApplicable:true,source:p.source};equipment.modes.push(mode);
 }
 if(book==='lt'){
  if(!data.ammo_items.some(a=>a.id==='lt_p7_weighted_rope'))data.ammo_items.push({id:'lt_p7_weighted_rope',name:'Верёвка с грузом',ammo_family_id:'lt_p7_weighted_rope',specific_model_only:true,projectile_classes:['lt_utility_rope'],source_ref_raw:'LT125',weapon_mode_ids:[]});
  for(const p of Object.values(LT_CROSSBOW_UTILITY_PROFILES))for(const id of p.ammoIds){
   const item=data.ammo_items.find(a=>a.id===id);if(!item)throw Error('LT125 physical utility item missing: '+id);
   item.weapon_mode_ids=[...new Set([...(item.weapon_mode_ids??[]),p.modeId])];
   let family=data.ammo_families.find(f=>f.id===item.ammo_family_id);if(!family){family={id:item.ammo_family_id,name:item.name,ammo_item_ids:[id],compatible_weapon_mode_ids:[]};data.ammo_families.push(family);}
   family.compatible_weapon_mode_ids=[...new Set([...(family.compatible_weapon_mode_ids??[]),p.modeId])];
  }
 }
 return data;
}
