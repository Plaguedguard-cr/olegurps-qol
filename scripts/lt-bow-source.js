import {normalizeLTQuality} from './tools/lt-quality.js';
// LT72-78 and B277: personal bows/crossbows only. No artillery, original JSON or GCS writes.
const rows=[
 ['WqUeIOkvQIgCeKWou','Longbow','bow',11,2,3,15,20],
 ['Wjy-E-qXjBlmT-V5z','Regular Bow','bow',10,1,2,15,20],
 ['WCUkJUmXxsGLdGrEc','Short Bow','bow',7,0,1,15,20],
 ['WnqU4wFdAaHmghhfn','Reflex Bow','bow',10,3,3,20,25],
 ['WHHB1FrefOB5s-4aP','Straight Composite Bow','bow',10,2,2,15,20],
 ['Wt-bMJQAZnEeMXWiA','Tubular Bow','bow',8,2,2,20,25],
 ['WHwsNi90Y4m49YOzg','Crossbow','wood',7,4,4,20,25],
 ['Ws0Es7ZR78_sIW-uP','Gastraphetes','belly',10,5,4,25,30],
 ['WwpI_P5DL8za5501B','Repeating Crossbow','repeating',8,1,1,7,15],
 ['WxBwICnOg7tP-Gqfq','Composite Crossbow','wood',8,5,4,25,30],
 ['Wdn9cVYekaOlUeQnQ','Pistol Crossbow','pistol',7,2,1,15,20],
 ['WEccMSldVWlEmz-AU','Prodd','prodd',7,4,2,20,25],
 ['W11eNBa3voVFCsgWv','Slurbow — 2 medium','slurbow',9,3,1,25,30,2],
 ['WFAwJH7XlIK-bIy0Q','Slurbow — 5 small','slurbow',9,2,1,15,20,5],
 ['WVvwyyO4VoyeTryRo','Fowling Crossbow','steel',8,5,4,25,30,1,1.5],
 ['WEG0MRykkKI4AzUzD','Hunting Crossbow','steel',10,5,4,25,30,1,2],
 ['WPn4rW6HE64VST_pm','Military Crossbow','steel',12,5,4,25,30,1,3],
 ['Wak71wpexyuS6wOgQ','Siege Crossbow','steel',14,5,4,25,30,1,3]
];
export const LT_BOW_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,name,kind,min,bonus,acc,half,max,units=1,cranequin=null])=>
 [modeId,Object.freeze({modeId,name,kind,minRatedST:min,bonus,acc,half,max,units,cranequin,damageType:kind==='prodd'?'pi':'imp',source:'LT74-78'})])));
export const LT_REPEATING_COCKING_POLICY=Object.freeze({version:1,modeId:'WwpI_P5DL8za5501B',maximumSTFactor:1,
 source:'LT73',supersededSource:'LT74: 70%',authority:'user-approved-project-decision',date:'2026-10-24',officialErratum:false});
export const ltBowProfile=value=>LT_BOW_PROFILES[typeof value==='string'?value:value?.standaloneModeId??value?.catalogModeId]??null;
// Definition settings are authoritative even before a stale carrier has been saved again.
export function readLTBowConfiguration(actor,weapon){
 const record=weapon?.standaloneWeaponId&&actor?.getFlag?.('olegurps-qol','standaloneWeapons')?.weapons?.find(r=>r.id===weapon.standaloneWeaponId);
 return record?record.settings?.ltBow??{}:weapon?.ltBow??{};
}
export const LT_BOW_IDS=Object.freeze(rows.filter(r=>r[2]==='bow').map(r=>r[0]));
export const LT_ARROW_IDS=Object.freeze({
 lt_regular_arrow:'regular',lt_bodkin_arrow:'bodkin',lt_barbed_arrow_lt73:'barbed',lt_blunt_arrow_lt73:'blunt',
 lt_cutting_arrow_lt73:'cutting',lt_bowel_raker_arrow_lt73:'bowel_raker',lt_fire_arrow_lt73:'fire_arrow',
 lt_fire_cage_arrow_lt73:'fire_cage',lt_flight_arrow_lt73:'flight',lt_humming_bulb_arrow_lt73:'humming_bulb',
 lt_flaming_arrow_b410:'flaming',lt_flaming_humming_bulb_arrow_lt73:'flaming_humming'
});
export const LT_SLURBOW_AMMO=Object.freeze({
 W11eNBa3voVFCsgWv:'lt_slurbow_medium_dart_lt76',
 'WFAwJH7XlIK-bIy0Q':'lt_slurbow_small_dart_lt76'
});
export function ltBowUnits(modeId,configuration={}){
 const p=ltBowProfile(modeId);return !p?1:p.kind==='bow'&&configuration.shotMode==='panjagan5'?5:p.kind==='bow'&&configuration.shotMode==='panjagan10'?10:modeId==='WFAwJH7XlIK-bIy0Q'&&configuration.shotMode==='single-small'?1:p.units;
}
export function ltBowCapacity(modeId,configuration={}){
 const p=ltBowProfile(modeId);return p?.kind==='repeating'?10:ltBowUnits(modeId,configuration);
}
export function normalizeLTBowConfiguration(value,modeId){
 const p=ltBowProfile(modeId);if(!p)return null;
 const raw=value?.ratedST,ratedST=raw==null||String(raw).trim()===''?null:Number(raw);
 if(ratedST!==null&&(!Number.isSafeInteger(ratedST)||ratedST<p.minRatedST))throw Error('Rated ST: нужно целое значение не ниже '+p.minRatedST+' (LT75-76).');
 const shotMode=value?.shotMode??'ordinary';
 if(!(p.kind==='bow'?['ordinary','navak','panjagan5','panjagan10']:modeId==='WFAwJH7XlIK-bIy0Q'?['ordinary','single-small']:['ordinary']).includes(shotMode))throw Error('Этот вариант подачи не подтверждён для выбранной модели LT.');
 const drawMethod=p.kind==='repeating'?'hand':value?.drawMethod??(p.kind==='steel'?'cranequin':p.kind==='belly'?'belly':'hand');
 if(!['hand','one-leg','two-legs','goats-foot','cranequin','belly'].includes(drawMethod))throw Error('Неизвестный способ натяжения.');
 if(p.kind==='bow'&&!['hand','one-leg','two-legs'].includes(drawMethod)||drawMethod==='cranequin'&&!p.cranequin||drawMethod==='belly'&&p.kind!=='belly')throw Error('Нет источникового профиля этого приспособления для выбранного оружия.');
 return {version:1,ratedST,shotMode,drawMethod,applyArmST:value?.applyArmST===true,...(value?.quality?{quality:normalizeLTQuality(value.quality,{missile:true})}:{}),
  arrowGuideInstalled:value?.arrowGuideInstalled===true,panjaganInstalled:value?.panjaganInstalled===true};
}
export function ltBowAmmoRule(ammoId){
 if(LT_ARROW_IDS[ammoId])return LT_ARROW_IDS[ammoId];
 if(['lt_bodkin_crossbow_bolt','lt_bodkin_gastraphetes_bolt_lt76'].includes(ammoId))return 'bodkin';
 if(ammoId==='lt_arrow_guide_dart')return 'arrow_guide';
 if(['lt_standard_crossbow_bolt','lt_pistol_crossbow_dart_lt76','lt_prodd_pellet_lt76','lt_gastraphetes_bolt_lt76',
  'lt_slurbow_medium_dart_lt76','lt_slurbow_small_dart_lt76'].includes(ammoId))return 'regular';
 return null;
}
export function ltBowPhysicalAdmission(modeId,ammoId,kind,configuration={}){
 const p=ltBowProfile(modeId);if(!p)return null;
 const fail=(status,code,message)=>({status,reasons:[{code,message}]});
 if(ammoId==='lt_arrow_guide_dart'||ammoId==='bow_arrow_guide_dart'){
  if(p.kind!=='bow')return fail('incompatible','LT_NAVAK_BOW_REQUIRED','Navak предназначен для луков, не для этого режима.');
  return configuration.arrowGuideInstalled===true&&configuration.shotMode==='navak'?{status:'compatible',reasons:[]}:
   fail('undetermined','LT_NAVAK_GUIDE_REQUIRED','LT78: установите физическую направляющую и выберите Navak.');
 }
 if(p.kind==='slurbow'){
  const id=LT_SLURBOW_AMMO[modeId],family=modeId==='W11eNBa3voVFCsgWv'?'slurbow_medium_dart':'slurbow_small_dart';
  if(ammoId===id&&kind==='ammo-item'||ammoId===family&&kind==='ammo-family')return {status:'compatible',reasons:[]};
  if(ammoId==='lt_slurbow_dart_lt76'||ammoId==='slurbow_dart')return fail('undetermined','LT_SLURBOW_SIZE_REQUIRED','LT74/76: прежний дротик не определяет средний или малый размер; разгрузка доступна.');
  return fail('incompatible','LT_SLURBOW_WRONG_DART','Slurbow требует отдельный дротик опубликованного размера.');
 }
 return null;
}

const newItems=[
 {id:'lt_slurbow_medium_dart_lt76',name:'Slurbow — средний дротик',ammo_family_id:'slurbow_medium_dart',weapon_mode_ids:['W11eNBa3voVFCsgWv'],price_usd:0.5,weight_lb:0.03,projectile_classes:['slurbow_medium_dart'],source_ref_raw:'LT74,76,78 n.3',tech_level_raw:'3'},
 {id:'lt_slurbow_small_dart_lt76',name:'Slurbow — малый дротик',ammo_family_id:'slurbow_small_dart',weapon_mode_ids:['WFAwJH7XlIK-bIy0Q'],price_usd:0.5,weight_lb:0.02,projectile_classes:['slurbow_small_dart'],source_ref_raw:'LT74,76,78 n.3',tech_level_raw:'3'},
 {id:'lt_bodkin_gastraphetes_bolt_lt76',name:'Gastraphetes — Bodkin Bolt',ammo_family_id:'gastraphetes_personal_bolt',weapon_mode_ids:['Ws0Es7ZR78_sIW-uP'],price_usd:2,weight_lb:0.15,variant_id:'crossbow_bodkin',projectile_classes:['hand_crossbow_bolt'],source_ref_raw:'LT76; B277',tech_level_raw:'3'},
 {id:'lt_flaming_arrow_b410',name:'Flaming Arrow',ammo_family_id:'bow_arrow',weapon_mode_ids:LT_BOW_IDS,variant_id:'flaming',projectile_classes:['bow_arrow'],source_ref_raw:'B410; LT73'},
 {id:'lt_flaming_humming_bulb_arrow_lt73',name:'Flaming Humming Bulb Arrow',ammo_family_id:'bow_arrow',weapon_mode_ids:LT_BOW_IDS,variant_id:'flaming_humming',projectile_classes:['bow_arrow'],source_ref_raw:'LT73; B410'}
];
export function projectLTBowSourceData(book,data){
 if(book==='weapons'){
  for(const equipment of data.equipment??[])if(equipment.source==='LT')for(const mode of equipment.modes??[]){
   const p=ltBowProfile(mode.weapon_mode_id);if(!p)continue;
   const aliases=p.kind==='repeating'?['Chukonu','Zhuge Nu']:['WnqU4wFdAaHmghhfn','WHHB1FrefOB5s-4aP'].includes(p.modeId)?['Dai-kyu']:p.kind==='prodd'?['Prod']:[];
   if(aliases.length)equipment.aliases=[...new Set([...(equipment.aliases??[]),...aliases])];
   mode.lt_bow_contract={...p,ratedSTRequired:true,sourceDamageVerified:true};
   const add=newItems.filter(a=>a.weapon_mode_ids.includes(p.modeId));
   mode.lt_ammo_item_ids=[...new Set([...(mode.lt_ammo_item_ids??[]),...add.map(a=>a.id)])];
  }
 }
 if(book!=='lt')return data;
 for(const id of ['flaming','flaming_humming'])if(!data.projectile_options.some(x=>x.id===id))data.projectile_options.push({id,name:id==='flaming'?'Flaming Arrow':'Flaming Humming Bulb',applies_to:['bow_arrow'],source_ref:'B410; LT73',damage_rule:'Prepared lit arrow; source-specific linked burning damage.'});
 for(const item of newItems)if(!data.ammo_items.some(a=>a.id===item.id))data.ammo_items.push({...structuredClone(item),ammo_type:item.projectile_classes[0],variant_id:item.variant_id??null,specific_model_only:true,catalog_added_from_book:true});
 for(const item of newItems){let f=data.ammo_families.find(f=>f.id===item.ammo_family_id);
  if(!f){f={id:item.ammo_family_id,name:item.name,ammo_item_ids:[],compatible_weapon_mode_ids:[],cross_source_interchangeable:false};data.ammo_families.push(f);}
  f.ammo_item_ids=[...new Set([...f.ammo_item_ids,item.id])];f.compatible_weapon_mode_ids=[...new Set([...f.compatible_weapon_mode_ids,...item.weapon_mode_ids])];
 }
 for(const a of data.ammo_items){
  if(LT_ARROW_IDS[a.id]&&a.id!=='lt_flaming_arrow_b410'&&a.id!=='lt_flaming_humming_bulb_arrow_lt73'){
   a.weight_lb=a.id==='lt_flight_arrow_lt73'?0.05:a.id==='lt_fire_arrow_lt73'?0.2:0.1;
   if(a.id==='lt_blunt_arrow_lt73')a.price_usd=1;if(a.id==='lt_fire_arrow_lt73')a.price_usd=7;
  }
  if(['lt_bodkin_arrow','lt_bodkin_crossbow_bolt','lt_fire_arrow_lt73'].includes(a.id))a.tech_level_raw='3';
  if(a.id==='lt_fire_cage_arrow_lt73')a.tech_level_raw='2';
 }
 return data;
}
