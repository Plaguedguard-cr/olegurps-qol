// Effective views only; imported bytes, IDs, GCS hashes and saved objects remain unchanged.
export const HT_SOURCE_REVIEW = Object.freeze({
  W82oDY970UdeqLXTF: ['ht_5_56x45mm_nato', 'HT117,119: R6001 chamber/load not specified'],
  Wkvf5salwlKpkRx_c: ['ht_5_56x45mm_nato', 'HT117,119: R653 chamber/load not specified'],
  WGJgRQusTscOtoLC9: ['ht_5_56x45mm_nato', 'HT117,119: XM177E1 early load not specified'],
  WOAL2ladqiRbTuvRU: ['ht_17_5mm_flintlock_mle_1777', 'HT90,107: pistol and musket loads need separate evidence']
});
// Project policy, not a claim that HT92 establishes this exact cartridge.
// The existing physical item and all its shared construction rules are reused.
export const HT_PROJECT_WEAPON_POLICIES = Object.freeze({
  'WwlfY-FYthqkLvByK': Object.freeze({
    version: 1, authority: 'user-approved-project-policy', date: '2026-10-18',
    ammoId: 'ht_22_long_rifle_5_7x16mmr', caliber: '.22 Long Rifle (.22 LR)', physicalCartridgeRequired:true,
    weaponReliability: Object.freeze({malf:12, source:'HT92', application:'manual'})
  })
});
// HT117 explicitly separates the original .223 AR-15 family from the M16A2's modified NATO load.
// HT119 identifies these early carbine variants; HT90 explicitly shares pistol statistics with AN XIII.
export const HT_REVIEWED_LOADS = Object.freeze({
  W82oDY970UdeqLXTF:{ammoId:'ht_223_remington',source:'HT117/119',original:'ht_5_56x45mm_nato'},
  Wkvf5salwlKpkRx_c:{ammoId:'ht_223_remington',source:'HT117/119',original:'ht_5_56x45mm_nato'},
  WGJgRQusTscOtoLC9:{ammoId:'ht_223_remington',source:'HT117/119',original:'ht_5_56x45mm_nato'},
  WOAL2ladqiRbTuvRU:{ammoId:'ht_specific_mas_an_xiii_17_1_flintlock',source:'HT90/91',original:'ht_17_5mm_flintlock_mle_1777'}
});
export function reviewedHTModeIdentity(mode,equipment) {
  const policy=equipment?.source==='HT'&&HT_PROJECT_WEAPON_POLICIES[mode?.weapon_mode_id];
  if(policy)return {...mode,ht_ammo_item_ids:[policy.ammoId],ht_ammo_family_ids:[],caliber_hint:policy.caliber,
    ammunitionIdentityPolicy:{version:policy.version,authority:policy.authority,date:policy.date,ammoId:policy.ammoId,physicalCartridgeRequired:policy.physicalCartridgeRequired},
    weaponReliability:{...policy.weaponReliability},
    ht_ammo_resolution:{status:'project_approved_existing_round',authority:policy.authority,source:'User decision 2026-10-18'},
    ht_ammo_review:{status:'project_approved_existing_round',authority:policy.authority,source_ref:'User decision 2026-10-18',book:'HT'}};
  const evidence=equipment?.source==='HT'&&HT_REVIEWED_LOADS[mode?.weapon_mode_id];
  if(!evidence||!mode.ht_ammo_item_ids?.includes(evidence.original))return mode;
  return {...mode,ht_ammo_item_ids:[evidence.ammoId],ht_ammo_family_ids:[],
    sourceIdentityCorrection:{version:1,source:evidence.source,original:evidence.original,value:evidence.ammoId}};
}
export function reviewedHTAmmoIdentity(ammo) {
  if(!ammo)return ammo;
  const removed=new Set(Object.entries(HT_REVIEWED_LOADS).filter(([,e])=>e.original===ammo.id).map(([id])=>id));
  const added=Object.entries(HT_REVIEWED_LOADS).filter(([,e])=>e.ammoId===ammo.id).map(([id])=>id);
  return removed.size||added.length?{...ammo,weapon_mode_ids:[...new Set([...(ammo.weapon_mode_ids??[]).filter(id=>!removed.has(id)),...added])]}:ammo;
}
export const HT_AMMO_LABELS = Object.freeze({
  ht_87x94mmr_hotchkiss: ['37x94mmR Hotchkiss', 'HT177'],
  ht_25_59mmb: ['25x59mmB', 'HT145,177'],
  ht_2_2_25: ['2-inch (51mm)', 'HT146,177; WPS 2.25 lb is separate'],
  ht_56_50_spencer_14x22mmr: ['.56-50 Spencer (13x29mmR)', 'HT177'],
  ht_700_nitro_express_17_8x80mmr: ['.700 Nitro Express (17.8x89mmR)', 'HT177']
});
const weapons = Object.freeze({
  'eskonu-RTnPuz4Jeb':['Colt MK 18 MOD 0, 5.56x45mm NATO','HT119/121: M4A1 SOPMOD variant'],
  eQ4obQuHBibDtmkbr: ['Colt M1860 Army, .44 Caplock', 'HT93,176'],
  'evF3-TuMJAg4Zbb26': ['Kolomna 9M14M Malyutka-M, 125mm', 'HT151,152'],
  eUdNUMGliwRPJX_8G: ['Universal Model 3000 Enforcer, .30 M1', 'HT113']
});
export function correctedHTLabel(record, kind='ammo') {
  const fix=(kind==='weapon'?weapons:HT_AMMO_LABELS)[record?.equipment_id??record?.id];
  return fix ? {...record,name:fix[0],sourceLabelCorrection:{version:1,original:record.name,source:fix[1]}} : record;
}
export function htIdentityNeedsReview(modeId, ammoId) {
  const entry=HT_SOURCE_REVIEW[modeId];return entry?.[0]===ammoId ? entry[1] : null;
}
export function correctedHTSkillDefaults(mode,equipment) {
  if(equipment?.source!=='HT'||mode?.weapon_mode_id!=='WaIDKb3cN40p-9pJu'||mode.raw_calc?.damage!=='1d pi-')return mode;
  const affected=new Set(['Rifle','Musket','Shotgun','Light Machine Gun','Submachine Gun']);
  const changes=[];
  const defaults=mode.defaults.map((rule,index)=>{
    if(rule.type!=='skill'||rule.name!=='Guns'||!affected.has(rule.specialization)||rule.modifier!==-2)return rule;
    changes.push({index,original:-2,value:-4});return {...rule,modifier:-4};
  });
  return changes.length?{...mode,defaults,sourceDefaultsCorrection:{version:1,source:'HT98',changes}}:mode;
}
// Explicit printed zeroes lost by the import, never a blanket null-to-zero rule.
const printedStatistics = Object.freeze({
  'WwlfY-FYthqkLvByK':['1d+1 pi-', 'HT92', {accuracy:'0'}],
  'W6bfzGQAngvdHu-iw': ['1d pi-', 'HT91', {accuracy:'0'}],
  WHDjicfM33QKdP30o: ['2d-1 pi', 'HT91', {accuracy:'0'}],
  W7i4ZauQl8q2o5nTt: ['1d-3(0.5) pi-', 'HT91', {accuracy:'0'}],
  WlalvGJfGaAfR_YFJ: ['1d pi-', 'HT98', {accuracy:'0'}],
  WHmfXni9O7QkIO36y: ['1d pi-', 'HT97,101', {accuracy:'0'}],
  WW1fVT2VBDy4d6fe6: ['1d-4 pi-', 'HT88', {accuracy:'0'}],
  'W-XOyXGVN7aug_D_r': ['1d pi-', 'HT98,101', {accuracy:'0'}],
  'WBpX1soaGNjp-7TDQ': ['1d pi-', 'HT101', {accuracy:'0'}],
  WzR7GE1ZY6PB7velA: ['4dx2(10) cr ex', 'HT148', {accuracy:'0'}],
  WbiMQvLGw4VhGQmTc: ['6dx3(10) cr ex', 'HT148', {accuracy:'0'}],
  WUUPnRzYsh54XEY7W: ['1d pi-', 'HT101', {accuracy:'0'}],
  WhyC2rpq5gO7kJvPq: ['7dx3(10) cr ex', 'HT147,148', {accuracy:'0',recoil:'1'}],
  WhGAE0Z1tyyGl34FX: ['3d pi+', 'HT101', {accuracy:'0'}],
  Wd25u9Begix9h_smN: ['1d-3 pi-', 'HT89,90', {accuracy:'0'}],
  WCkWdl3YZOTZX7SwG: ['1d pi+', 'HT91', {accuracy:'0'}],
  WMj5eviUtsrGfgUyQ: ['1d+1 pi++', 'HT91', {accuracy:'0'}],
  WTxOUBfDLkJZPyxQ6: ['2d-1 pi', 'HT94', {accuracy:'0'}],
  WsRdm1ykv3AFJUMGr: ['1d-3 pi-', 'HT89,90', {accuracy:'0'}],
  WhZTKRbxWw3dUNLFi: ['1d-3 pi-', 'HT89', {accuracy:'0'}],
  W5gRSZbBIrYN9XoUY: ['1d-3 pi-', 'HT89,90', {accuracy:'0'}],
  WBUF21Cjj4FcgwAM2: ['1d-3 pi-', 'HT89', {accuracy:'0'}],
  Wr_7MnorYDlPSb2qW: ['2d+1 pi-', 'HT91', {accuracy:'0'}],
  WL0SlLUJxX2V_3KVh: ['1d pi-', 'HT98', {accuracy:'0',bulk:'0'}],
  'WaIDKb3cN40p-9pJu': ['1d pi-', 'HT98', {accuracy:'0',bulk:'0'}]
});
export function correctedHTModeStatistics(mode, equipment) {
  if(equipment?.source==='HT'&&equipment.equipment_id==='e3iE6ManVTuN4oEVH'&&mode?.weapon_mode_id==='WGZlqJxbZOxd6FR4h'&&
    mode.raw_calc?.damage==='2d-3(0.5) cr'&&mode.stats?.damage?.base==='2d-3')
    return {...mode,raw_calc:{...mode.raw_calc,damage:'1d-3(0.5) cr'},stats:{...mode.stats,damage:{...mode.stats.damage,base:'1d-3'}},
      sourceDamageCorrection:{version:1,source:'HT88, baton table; HT89, paint/pepper described separately',original:'2d-3(0.5) cr',value:'1d-3(0.5) cr'}};
  const printed = equipment?.source === 'HT' && printedStatistics[mode?.weapon_mode_id];
  if (printed && mode.raw_calc?.damage === printed[0]) {
    const changes=Object.entries(printed[2]).filter(([field])=>mode.stats?.[field]===null);
    if (!changes.length) return mode;
    return {...mode,stats:{...mode.stats,...Object.fromEntries(changes)},
      sourceStatisticsCorrection:{version:1,source:printed[1],
        fields:changes.map(([field,value])=>({field,original:null,value}))}};
  }
  if (equipment?.source !== 'HT' || equipment.equipment_id !== 'eljdnUMCeKzh9iOXg' ||
      mode?.weapon_mode_id !== 'Wx13jpOUxRC_YeDo6' || mode.stats?.accuracy !== null ||
      mode.raw_calc?.damage !== '6dx2 cr ex [3d cut]') return mode;
  return {...mode, stats:{...mode.stats,accuracy:'0'},
    sourceStatisticsCorrection:{version:1,source:'HT150',field:'accuracy',original:null,value:'0'}};
}
