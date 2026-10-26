import {normalizeLTQuality,ltPersonalQualityOptions} from './tools/lt-quality.js';
import {ltCrossbowUtilityProfile} from './lt-crossbow-utility-source.js';
// Personal LT-P3 source rows, checked against LT63,72-78 and LT125. Raw catalogs remain unchanged.
const rows = [
 ["WiQNALmY3-6VRXnXY","ehbq3XMkJxIU60wS8","Atlatl","atlatl-dart","sw-1 imp","x3/x4","77",["lt_atlatl_dart_lt77"],null,{"accuracy":"1","bulk":"-3","strength":"5","shots":"1(1)","techLevel":"0"}],
 ["WJu2Z4zwQ9NFqc5Km","ehbq3XMkJxIU60wS8","Atlatl","atlatl-javelin","sw+1 imp","x2/x3","77",["lt_atlatl_javelin"],null,{"accuracy":"3","bulk":"-4","strength":"6","shots":"1(1)","techLevel":"0"}],
 ["WD7iZ_sU7XylHwqN_","ezsPC1CjmIOv-Hg3f","Blowpipe","blowpipe-dart","1d-3 pi-","x4","76",["lt_blowpipe_dart_lt76"],null,{"accuracy":"1","bulk":"-6","strength":"2","shots":"1(2)","techLevel":"0"}],
 ["WQiw6nornpsdGHCov","ej-C1vqAdSnwD4nQg","Bola Perdida","thrown","sw cr","x6/x10","76",[],null,{"accuracy":"0","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"0"}],
 ["WL7CmYMQsVEm-e2XJ","eN-OkDp86ufSWaXn6","Bolas","bolas","thr-1 cr","x3","76",[],null,{"accuracy":"0","bulk":"-2","strength":"7","shots":"T(1)","techLevel":"0"}],
 ["WtqrhaQ4JBSXuIeyg","eKPBObWzRN5w7bnh1","Boomerang","thrown","sw cr","x6/x10","77",[],null,{"accuracy":"2","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"0"}],
 ["WofsykiukDG6DrXBB","ebM68sA9cP1shwII6","Chakram","thrown","thr+1 cut","x4/x6","77",[],null,{"accuracy":"1","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"2"}],
 ["W8m71X9eqA_z9XeNr","e2ZjQMq5KWtBdh8De","Cloak, Expensive (Status 4)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-4","strength":"5","shots":"T(1)","techLevel":"1"}],
 ["Wd5y4dN9DRYFFI3Ph","eSijFQOkU-Qd_zTQU","Cloak, Freeman (Status 0)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-4","strength":"5","shots":"T(1)","techLevel":"1"}],
 ["WCL9GXHmC43gku14G","edWPubhxFifK9dRiT","Cloak, Leather/Wool, Expensive (Status 4)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-6","strength":"8","shots":"T(1)","techLevel":"1"}],
 ["WHeINgjs4SVy3rIen","eTVB7wY8nIFlgDUTY","Cloak, Leather/Wool, Freeman (Status 0)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-6","strength":"8","shots":"T(1)","techLevel":"1"}],
 ["WVVq3XkY_f1YwCqC4","eDo5tQS4L3fBPDy_b","Cloak, Leather/Wool, Poor (Status -2)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-6","strength":"8","shots":"T(1)","techLevel":"1"}],
 ["WvdSqXlWs_SOXet72","eDPrbm1N4SkOqB_6i","Cloak, Poor (Status -2)","cloak","spec.","2","76",[],null,{"accuracy":"1","bulk":"-6","strength":"8","shots":"T(1)","techLevel":"1"}],
 ["WM_7xi8TwSxpRihZ2","eEkk6WpqrCj5KoCNQ","Dagger","thrown","thr-1 imp","x0.5/x1","77",[],null,{"accuracy":"0","bulk":"-1","strength":"5","shots":"T(1)","techLevel":"1"}],
 ["Wlxe2_8BiREGT_6TB","eSOtTYHTtotFif7ly","Dart Sling","dart-sling","sw imp","x6/x10","76",["lt_dart_sling_dart_lt76"],null,{"accuracy":"1","bulk":"-4","strength":"6","shots":"1(2)","techLevel":"1"}],
 ["WUT0gfmvp1m0cFJGL","eY5X7wZEb_oGlYi3t","Discus","thrown","thr+2 cr","x4/x6","77",[],null,{"accuracy":"2","bulk":"-3","strength":"6","shots":"T(1)","techLevel":"1"}],
 ["WJORKREFCHlwtcROT","eLMadXvd-l99hQHlD","Harpoon","harpoon","thr+5 imp","x1/x1.5","77",[],null,{"accuracy":"2","bulk":"-6","strength":"11","shots":"T(1)","techLevel":"2"}],
 ["Wl_Q7exUelWCfo0Ga","eVGqW67Wj3KmybMVN","Hatchet","thrown","sw cut","x1.5/x2.5","77",[],null,{"accuracy":"1","bulk":"-2","strength":"8","shots":"T(1)","techLevel":"0"}],
 ["W04WeGwpSVXBrCCCw","e-vSXirgD31Jj55u_","Heavy Sling","heavy-sling","sw+2 cr","x3/x6","76",["lt_heavy_sling_shaped_rock_lt76"],null,{"accuracy":"1","bulk":"-5","strength":"8\u2020","shots":"1(2)","techLevel":"0"}],
 ["WqrX0vMt5n6kLV5mq","eyFzn-BFYhzHXAAXt","Hungamunga","hungamunga","sw-1 cut","x0.8/x1.5","77",[],null,{"accuracy":"1","bulk":"-3","strength":"6","shots":"T(1)","techLevel":"2"}],
 ["W666IAfB0ft-hoH3z","ekHIDinjTY_Oqkw2K","Javelin","thrown","thr+1 imp","x1.5/x2.5","77",[],null,{"accuracy":"3","bulk":"-4","strength":"6","shots":"T(1)","techLevel":"1"}],
 ["Wbeu-Rh82UeIe7Gqs","ezjgs0iC8JAk19X0Z","Javelin w. Thong","thrown","thr+1 imp","x1.75/x2.75","77",[],null,{"accuracy":"4","bulk":"-4","strength":"6","shots":"T(1)","techLevel":"1"}],
 ["W4A2YqblVK_LoJh0L","exm4FaVMtZYJ0xJMN","Large Hungamunga","hungamunga","sw+2 cut","x1/x1.5","77",[],null,{"accuracy":"2","bulk":"-3","strength":"11","shots":"T(1)","techLevel":"2"}],
 ["W9_OmSPoA9CK9Ge1M","e4Cqh4R-bWl7CS7dQ","Large Knife","thrown","thr imp","x0.8/x1.5","77",[],null,{"accuracy":"0","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"0"}],
 ["WGOJzjBsf78jRPn96","e5jVOy-jQ57VCe3Sq","Large Net","net-large","spec.","spec.","76",[],null,{"accuracy":"1","bulk":"-6","strength":"11","shots":"T(1)","techLevel":"0"}],
 ["W8f7fOdKN4ZBmhYrh","eE8_Dy15zRaLiEs45","Large Throwing Knife","thrown","thr imp","x1/x2","77",[],null,{"accuracy":"1","bulk":"-1","strength":"6","shots":"T(1)","techLevel":"2"}],
 ["WxT1QaWNJoCXVhDOG","ezsJcg7MdbH3xWJ-X","Lariat","lariat","spec.","spec.","76",[],null,{"accuracy":"0","bulk":"-2","strength":"7\u2020","shots":"T(spec.)","techLevel":"1"}],
 ["WJLaTFUJHSN-6pM_k","en-fdeTeZmFoFeRDl","Mace","thrown","sw+3 cr","x0.5/x1","77",[],null,{"accuracy":"1","bulk":"-4","strength":"12","shots":"T(1)","techLevel":"2"}],
 ["WN_Mx1qav5f-zgLjY","epmob6UUA0uVCdlIF","Melee Net","net-small","spec.","spec.","76",[],null,{"accuracy":"1","bulk":"-4","strength":"8","shots":"T(1)","techLevel":"2"}],
 ["WPNX4pByD7gohEd6f","eNROYfnjT1DYJkdkS","Round Mace","thrown","sw+2 cr","x0.5/x1","77",[],null,{"accuracy":"1","bulk":"-4","strength":"12","shots":"T(1)","techLevel":"0"}],
 ["WLLYK8pXkZ87jxOB-","edWyoRhbknJaNvsTK","Sai","thrown","thr imp","x0.8/x1.5","77",[],null,{"accuracy":"0","bulk":"-3","strength":"7","shots":"T(1)","techLevel":"3"}],
 ["Wt63kR2Ebkr9chL4b","eagFqPQa18YmSVdJu","Sling","sling","sw pi","x6/x10","76",["lt_shaped_sling_stone_lt76","lt_sling_pellet_lt76","lt_sling_unshaped_stone"],null,{"accuracy":"0","bulk":"-4","strength":"6","shots":"1(2)","techLevel":"0"}],
 ["WwEfzHtEktP_7pGQJ","ee1kRIRXHzUdofj74","Small Knife","thrown","thr-1 imp","x0.5/x1","77",[],null,{"accuracy":"0","bulk":"-1","strength":"5","shots":"T(1)","techLevel":"0"}],
 ["WHR31ryZU3AjwHqmw","eOJFIXvUSkQk5KC2f","Small Mace","thrown","sw+2 cr","x1/x1.5","77",[],null,{"accuracy":"1","bulk":"-3","strength":"10","shots":"T(1)","techLevel":"2"}],
 ["W1i_YQwOXwfSsNi87","euFuvEaABw1ncQz2M","Small Round Mace","thrown","sw+1 cr","x1/x1.5","77",[],null,{"accuracy":"1","bulk":"-3","strength":"10","shots":"T(1)","techLevel":"0"}],
 ["WhuLczmoJXSQgBzGz","elbJwTmAPdiWFj-Mg","Small Throwing Axe","thrown","sw+1 cut","x1/x1.5","77",[],null,{"accuracy":"1","bulk":"-3","strength":"10","shots":"T(1)","techLevel":"0"}],
 ["WSeSXfbUXTcrrZXGD","emViZt-5rQnxGAIVU","Small Throwing Knife","thrown","thr-1 imp","x0.8/x1.5","77",[],null,{"accuracy":"1","bulk":"0","strength":"5","shots":"T(1)","techLevel":"2"}],
 ["Wu1wX2lpPMDtA5FNi","eyvtiiimEqgyXYWaU","Spear","thrown","thr+3 imp","x1/x1.5","77",[],null,{"accuracy":"2","bulk":"-6","strength":"9","shots":"T(1)","techLevel":"0"}],
 ["WyBRd-s6EQ7s2ls_a","enjD63xIeaGU_03QB","Spear w. Thong","thrown","thr+3 imp","x1.25/x1.75","77",[],null,{"accuracy":"3","bulk":"-6","strength":"9","shots":"T(1)","techLevel":"0"}],
 ["WjjbiXtJUu9FPc31Z","edBYbyqTMO4WubN7W","Spike Shuriken","thrown","thr-2 imp","x0.5/x1","77",[],null,{"accuracy":"1","bulk":"0","strength":"5","shots":"T(1)","techLevel":"3"}],
 ["WoPZ6WfjRMTWppGsv","e4vmwyvGiD7CFh3Vl","Staff Sling","staff-sling","sw+1 pi","x10/x15","76",["lt_shaped_sling_stone_lt76","lt_sling_pellet_lt76","lt_sling_unshaped_stone","lt_standard_staff_sling_stone"],null,{"accuracy":"1","bulk":"-6","strength":"7\u2020","shots":"1(2)","techLevel":"1"}],
 ["W_OizRQv4WHBPSYIf","eWOkljQnuFOlvvblh","Star Shuriken","thrown","thr-1 cut","x0.5/x1","77",[],null,{"accuracy":"1","bulk":"0","strength":"5","shots":"T(1)","techLevel":"3"}],
 ["WrowHYC-dAZA488wu","egFCiRwXHfTTs_Y47","Stone-Launching Stick","stone-stick","sw-1 cr","x2/x3","77",["lt_stone_launching_stick_shaped_stone_lt77"],null,{"accuracy":"0","bulk":"-2","strength":"5","shots":"1(1)","techLevel":"0"}],
 ["W8IyQCWWhWneTzs48","ek2DWesEupFg8hTVR","Throwing Axe","thrown","sw+2 cut","x1/x1.5","77",[],null,{"accuracy":"2","bulk":"-3","strength":"11","shots":"T(1)","techLevel":"0"}],
 ["WO60e2cUBoUzSuKLd","enzUzuxESLCS0HUZs","Throwing Dart","thrown","thr imp","x2.5/x3.5","77",[],null,{"accuracy":"1","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"2"}],
 ["WHdOJqxV7QhQcqk6H","eS-ANKpu6RBtWJYtk","Throwing Stick","thrown","sw-1 cr","x4/x8","77",[],null,{"accuracy":"1","bulk":"-2","strength":"6","shots":"T(1)","techLevel":"0"}],
 ["Wo3FP4KhrHj4Ovw39","e3m2R0EN6occeIRSW","Wooden Stake","thrown","thr(0.5) imp","x0.5/x1","77",[],null,{"accuracy":"0","bulk":"-2","strength":"5","shots":"T(1)","techLevel":"0"}],
 ["WTsaH0A-_oG-k93sT","e2iRKQHG9mWXhyKis","Woomera","woomera","sw+3 imp","x1.5/x2","77",[],null,{"accuracy":"2","bulk":"-6","strength":"9","shots":"1(1)","techLevel":"0"}]
];
const extras=[
 ['WLTP3PilumThrown','eLTP3Pilum','Pilum','pilum','thr+3 imp','x1/x1.5','73',[],'Wu1wX2lpPMDtA5FNi'],
 ['WLTP3AngonThrown','eLTP3Angon','Angon','pilum','thr+3 imp','x1/x1.5','73',[],'Wu1wX2lpPMDtA5FNi'],
 ['WLTP3FootwearThrown','eLTP3Footwear','Footwear — thrown by laces','footwear','sw-1 cr','x3/x5','63',[],'WQiw6nornpsdGHCov'],
 ['WLTP3CaltropThrown','eLTP3Caltrop','Caltrop — thrown','caltrop','thr-3 imp','x0.25/x0.5','63',[],'WjjbiXtJUu9FPc31Z'],
 ['WLTP3PitonThrown','eLTP3Piton','Piton — thrown','piton','thr-1 imp','x0.8/x1.5','125',[],'WSeSXfbUXTcrrZXGD'],
 ['WLTP3BlowpipePowder','eLTP3BlowpipePowder','Blowpipe — Powder','powder','spec.','1','72',[],'WD7iZ_sU7XylHwqN_'],
 ['WLTP3MetsubushiPowder','eLTP3Metsubushi','Metsubushi','metsubushi','spec.','1','72',[],'WD7iZ_sU7XylHwqN_'],
 ['WLTP3GrapplingHook','eLTP3GrapplingHook','Grappling Hook','grapnel','spec.','spec.','125',[],null],
 ['WLTP3PaddedGrapplingHook','eLTP3PaddedGrapplingHook','Grappling Hook — padded','grapnel-padded','spec.','spec.','125',[],null]
];
const noDamageKinds=new Set(['cloak','net-large','net-small','lariat','powder','metsubushi','grapnel','grapnel-padded']);
const launcherKinds=new Set(['atlatl-dart','atlatl-javelin','blowpipe-dart','dart-sling','heavy-sling','sling','staff-sling','stone-stick','woomera','powder','metsubushi']);
export const LT_PERSONAL_PROFILES=Object.freeze(Object.fromEntries([...rows,...extras].map(([modeId,equipmentId,name,kind,damage,range,page,ammoIds,template,stats])=>[
 modeId,Object.freeze({modeId,equipmentId,name,kind,damage,range,source:'LT'+page,ammoIds,template,stats,
  noDamage:noDamageKinds.has(kind),recoverable:!launcherKinds.has(kind)||['atlatl-dart','atlatl-javelin','dart-sling','woomera'].includes(kind),
  procedure:['powder','metsubushi'].includes(kind)?'melee-powder':kind.startsWith('grapnel')?'utility':'ranged',
  hitBonus:kind==='footwear'||kind==='caltrop'?-2:kind==='piton'?-4:0})])));
export const ltPersonalProfile=value=>{const id=typeof value==='string'?value:value?.standaloneModeId??value?.catalogModeId;return LT_PERSONAL_PROFILES[id]??ltCrossbowUtilityProfile(id);};
export function isLTProcedureMode(mode){return ltPersonalProfile(mode?.weapon_mode_id)?.procedure!=='ranged'&&!!ltPersonalProfile(mode?.weapon_mode_id);}
export function supportsStandaloneMode(mode,type){return isLTProcedureMode(mode)?type==='ranged':mode?.combat_type===type;}
export function ltPersonalAmmoId(p){
 if(p.kind==='atlatl-javelin'||p.modeId==='W666IAfB0ft-hoH3z')return 'lt_atlatl_javelin';
 if(p.kind==='woomera')return 'lt_p3_object_'+LT_PERSONAL_PROFILES.Wu1wX2lpPMDtA5FNi.equipmentId;
 return p.ammoIds[0]??'lt_p3_object_'+p.equipmentId;
}
export function ltPersonalRecoverable(p){return !!p?.recoverable;}
export function ltPersonalConfiguration(weapon){
 const raw=weapon?.ltPersonal??{},rope=raw.ropeLengthYards;
 return {version:1,applyArmST:raw.applyArmST===true,ropeLengthYards:rope==null||String(rope).trim()===''?null:Number(rope),...(ltPersonalProfile(weapon)?.kind.startsWith('crossbow-')?{utilityRatedST:raw.utilityRatedST==null||String(raw.utilityRatedST).trim()===''?null:Number(raw.utilityRatedST),utilityOrientation:raw.utilityOrientation??'horizontal'}:{}),...(raw.quality?{quality:normalizeLTQuality(raw.quality,ltPersonalQualityOptions(ltPersonalProfile(weapon)??{}))}:{})};
}
const sourceAliases={WD7iZ_sU7XylHwqN_:['Fukiya'],WUT0gfmvp1m0cFJGL:['Quoit'],
 WQiw6nornpsdGHCov:['Bola Loca'],WqrX0vMt5n6kLV5mq:['Mongwanga'],W4A2YqblVK_LoJh0L:['Mongwanga'],WoPZ6WfjRMTWppGsv:['Fustibal'],WO60e2cUBoUzSuKLd:['Jarid','Nageyari','Skaen','Uchi-ne','Plumbata'],
 W8f7fOdKN4ZBmhYrh:['Flying Dart','Fei Biao'],WSeSXfbUXTcrrZXGD:['Flying Dart','Fei Biao']};
const addedPhysical=[
 {id:'lt_p3_heavy_sling_lead',name:'Heavy Sling — lead bullet',ammo_family_id:'lt_p3_heavy_sling_lead',weapon_mode_ids:['W04WeGwpSVXBrCCCw'],projectile_classes:['heavy_sling_rock'],variant_id:'sling_lead',tech_level_raw:'2',weight_lb:1,source_ref_raw:'LT74,78'},
 {id:'lt_p3_heavy_sling_unshaped',name:'Heavy Sling — unshaped rock',ammo_family_id:'lt_p3_heavy_sling_unshaped',weapon_mode_ids:['W04WeGwpSVXBrCCCw'],projectile_classes:['heavy_sling_rock'],variant_id:'sling_stone_unshaped',tech_level_raw:'0',weight_lb:1,price_usd:0,source_ref_raw:'LT78 n3'},
 {id:'lt_p3_stone_stick_unshaped',name:'Stone-Launching Stick — unshaped stone',ammo_family_id:'lt_p3_stone_stick_unshaped',weapon_mode_ids:['WrowHYC-dAZA488wu'],projectile_classes:['stone_launcher_stone'],variant_id:'sling_stone_unshaped',tech_level_raw:'0',price_usd:0,source_ref_raw:'LT78 n3'}
];
function appendPhysical(data,item){
 let current=data.ammo_items.find(a=>a.id===item.id);
 if(!current){current={...structuredClone(item),ammo_type:item.projectile_classes[0],variant_id:item.variant_id??null,specific_model_only:true,catalog_added_from_book:true};data.ammo_items.push(current);}
 current.weapon_mode_ids=[...new Set([...current.weapon_mode_ids,...item.weapon_mode_ids])];
 let family=data.ammo_families.find(f=>f.id===current.ammo_family_id);
 if(!family){family={id:current.ammo_family_id,name:current.name,ammo_item_ids:[],compatible_weapon_mode_ids:[],cross_source_interchangeable:false};data.ammo_families.push(family);}
 family.ammo_item_ids=[...new Set([...family.ammo_item_ids,item.id])];family.compatible_weapon_mode_ids=[...new Set([...family.compatible_weapon_mode_ids,...current.weapon_mode_ids])];
}
export function projectLTPersonalSourceData(book,data){
 if(book==='weapons'){
  for(const row of extras){const p=ltPersonalProfile(row[0]);if(data.equipment.some(e=>e.equipment_id===p.equipmentId))continue;
   const source=data.equipment.find(e=>e.modes.some(m=>m.weapon_mode_id===p.template))??data.equipment.find(e=>e.source==='LT'&&e.modes.some(m=>m.combat_type==='ranged'));
   const template=source.modes.find(m=>m.weapon_mode_id===p.template)??source.modes.find(m=>m.combat_type==='ranged'),mode=structuredClone(template);
   const equipment={equipment_id:p.equipmentId,name:p.name,reference:p.source,modes:[mode],source:'LT',tech_level:['piton','caltrop'].includes(p.kind)?'2':p.kind.startsWith('grapnel')?'1':p.kind==='powder'?'0':null};
   Object.assign(mode,{weapon_mode_id:p.modeId,index:0,usage:p.procedure==='melee-powder'?'Порошковая атака':p.procedure==='utility'?'Бросить крюк':'Thrown',usage_notes:null,combat_type:p.procedure==='melee-powder'?'melee':p.procedure==='utility'?'effect':'ranged',hidden:false,role:'attack',lt_ammo_item_ids:[]});
   Object.assign(mode.stats,ltPersonalProfile(p.template)?.stats??{});delete mode.stats.techLevel;
   if(p.kind==='footwear'){
    const sling=data.equipment.flatMap(e=>e.modes).find(m=>m.weapon_mode_id==='Wt63kR2Ebkr9chL4b');
    mode.governing_skill=structuredClone(sling.governing_skill);mode.defaults=structuredClone(sling.defaults);
    delete mode.governing_skill_selection;
   }
   if(p.procedure!=='ranged'){mode.stats={...mode.stats,accuracy:null,recoil:null,bulk:null,strength:null,rate_of_fire:'1',shots:p.kind==='metsubushi'?'1':'1(2)'};}
   if(p.kind.startsWith('grapnel')){
    mode.governing_skill={status:'resolved',skill:{name:'Throwing',specialization:null,modifier:0},candidates:[{name:'Throwing',specialization:null,modifier:0}],basis:'LT125: Throwing or DX-3'};
    mode.defaults=[{type:'skill',name:'Throwing',specialization:null,modifier:0},{type:'dx',modifier:-3}];
    delete mode.governing_skill_selection;
   }
   mode.weapon_family='muscle-powered-ranged';delete mode.ammunition_profile;delete mode.ht_ammo_item_ids;mode.caliber_hint=null;
   data.equipment.push(equipment);
  }
  for(const equipment of data.equipment)if(equipment.source==='LT')for(const mode of equipment.modes){const p=ltPersonalProfile(mode.weapon_mode_id);if(!p)continue;
   mode.lt_personal_contract={...p};mode.lt_ranged_contract={...mode.lt_ranged_contract,rclNotApplicable:true,source:p.source};mode.stats.recoil=null;
   if(p.stats){const{techLevel,...stats}=p.stats;Object.assign(mode.stats,stats);}
   const derived=/^(sw|thr)([+-]\d+)?\s+(\S+)$/.exec(p.damage),fixed=/^(\d+d(?:[+-]\d+)?)\s+(\S+)$/.exec(p.damage);
   mode.stats.damage=p.noDamage?{base:'spec.'}:derived?{st:derived[1],base:derived[2]?.replace(/^\+/,''),type:derived[3]}:fixed?{base:fixed[1],type:fixed[2]}:mode.stats.damage;
   mode.raw_calc={...mode.raw_calc,damage:p.damage};mode.stats.range=p.range;
   if(p.modeId==='WQiw6nornpsdGHCov')mode.governing_skill_selection={...mode.governing_skill_selection,candidate_defaults:[{name:'Bolas',defaults:[]},{name:'Sling',defaults:[{type:'dx',modifier:-6}]}]};
   const ammo=[...p.ammoIds,ltPersonalAmmoId(p),...addedPhysical.filter(a=>a.weapon_mode_ids.includes(p.modeId)).map(a=>a.id)];
   mode.lt_ammo_item_ids=[...new Set([...(mode.lt_ammo_item_ids??[]),...ammo])];
   const aliases=sourceAliases[p.modeId]??(p.kind==='woomera'?['Amirre','Mirru']:p.kind==='bolas'?['Mijin']:[]);
   if(aliases.length)equipment.aliases=[...new Set([...(equipment.aliases??[]),...aliases])];
  }
 }
 if(book==='lt'){
  for(const p of Object.values(LT_PERSONAL_PROFILES)){
   if(!p.ammoIds.length||p.kind==='woomera'||p.modeId==='W666IAfB0ft-hoH3z')appendPhysical(data,{id:ltPersonalAmmoId(p),name:p.name+' — физический предмет',ammo_family_id:ltPersonalAmmoId(p),weapon_mode_ids:[p.modeId],source_equipment_id:p.kind==='woomera'?LT_PERSONAL_PROFILES.Wu1wX2lpPMDtA5FNi.equipmentId:p.equipmentId,projectile_classes:[p.procedure==='melee-powder'?'lt_powder_load':p.kind==='woomera'?'lt_full_spear':'lt_personal_object'],source_ref_raw:p.source});
  }
  for(const item of addedPhysical)appendPhysical(data,item);
  for(const p of Object.values(LT_PERSONAL_PROFILES)){const item=data.ammo_items.find(a=>a.id===ltPersonalAmmoId(p));if(item&&!item.tech_level_raw)item.tech_level_raw=p.stats?.techLevel??(['piton','caltrop'].includes(p.kind)?'2':p.kind.startsWith('grapnel')?'1':p.kind==='powder'?'0':null);}
  const lead=data.ammo_items.find(a=>a.id==='lt_sling_pellet_lt76');if(lead)lead.tech_level_raw='2';
  const staff=data.ammo_items.find(a=>a.id==='lt_standard_staff_sling_stone');if(staff)staff.notes_ru='Штатный камень Staff Sling; свинец применяется отдельной партией по LT74,78.';
  if(!data.projectile_options.some(v=>v.id==='lt_personal_load'))data.projectile_options.push({id:'lt_personal_load',name:'Партия LT: Note и способ доставки',applies_to:['lt_personal_object','lt_powder_load'],source_ref:'LT63,72-78,125,128-130',damage_rule:'Physical source profile; user-specified delivery is resolved manually.'});
 }
 return data;
}
export function registerLTPersonalSettings(runtime=globalThis){
 runtime.game.settings.register('olegurps-qol','ltSlingCrushingDamage',{name:'Пращи: пониженное пробитие (LT75)',
  hint:'Необязательное правило Poor Sling Penetration: piercing обычных пращей становится crushing. По умолчанию выключено.',scope:'world',config:true,type:Boolean,default:false});
}
