// UT2007 pp.127-128,133. Model-bound cartridge identities are module compatibility
// boundaries, not published calibers or a claim of cross-model interchangeability.
const rows=[
 ['W42mmtM2Oihtfy08e','eUwiutML2-xkfJWWh','Plasma Pistol',11,'7d+2(2) burn ex',3,40,3,'C',4,375,1100,1.6,'6','-2',2200,3,'Pistol'],
 ['Wrb5_sR1KSduU7rrt','eBGZsm_PP8XiNEWoP','Heavy Plasma Pistol',11,'10d(2) burn ex',3,33,3,'2C',4,500,1500,3.3,'9','-3',5600,3,'Pistol'],
 ['WHs5Yz2afrKml6XgG','eqxaQbUiJiwWXBnjs','Heavy Plasma Gun',10,'3dx5(2) burn ex',3,20,5,'Dp','8+3',750,2250,20,'15†','-6',40000,1,'Rifle'],
 ['Wdw5CaMp83KiQ4UTJ','eWbtKKChDGkfk1Shm','Heavy Fusion Gun',11,'20d(2) burn ex',3,20,5,'Dp','8+4',1000,3000,20,'15†','-6',40000,1,'Rifle'],
 ['W6qqfh7aOIrsrLtoE','e-7_T84gq2Yfvorui','Plasma Battle Rifle',11,'3dx5(2) burn ex',3,10,3,'2C','8+2',750,2250,10,'10†','-4',18000,2,'Rifle'],
 ['WJeubh-KpBhPFl4Os','eGCjfmC2kfzkEs64a','Plasma Cannon',10,'6dx25(2) burn ex',1,40,5,'10Fp',12,7500,22500,5000,'240M','-10',2000000,1,'Beams'],
 ['WMnfmbUMEqiNT0FVI','eZefpjy-dK_VFwABw','Plasma Gatling Gun',10,'6dx5(2) burn ex',10,100,5,'5Ep',12,1500,4500,250,'50M','-9',320000,1,'Beams'],
 ['W9K1UUxW-nbT2uD_3','eFndVnjm3zOMjj1KO','Semi-Portable Plasma Gun',10,'20d(2) burn ex',3,100,5,'Ep',12,1000,3000,70,'27M','-8',140000,1,'Beams'],
 ['W6Egpk7c3gUzZxExi','e7Mft8MiyBUm7ODkP','Fusion Cannon',11,'4dx50(2) burn ex',1,40,5,'10Fp',12,10000,30000,5000,'240M','-10',2000000,1,'Beams'],
 ['W7-OzPpG-_md0YJ6-','eI7-2g5Wl-qjliCEb','Fusion Gatling Gun',11,'8dx5(2) burn ex',10,100,5,'5Ep',12,4000,12000,250,'50M','-9',320000,1,'Beams'],
 ['WPffX2YxnxTGpJKdC','exWzKs75nBF02nSuI','Semi-Portable Fusion Gun',11,'6dx5(2) burn ex',3,100,5,'Ep',12,1500,4500,70,'27M','-8',140000,1,'Beams']
];
export const PLASMA_GUN_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,tl,damage,rof,shots,reload,sourceSet,acc,halfRange,maximum,weightLb,st,bulk,cost,lc,specialty])=>
 [modeId,Object.freeze({modeId,equipmentId,name,tl,damage,rof,shots,reload,sourceSet,acc,halfRange,maximum,weightLb,st,bulk,cost,lc,specialty,rcl:2,hotAllowed:rof!==10,source:'UT127–128'})])));
export const plasmaGunProfile=id=>Object.hasOwn(PLASMA_GUN_PROFILES,id??'')?PLASMA_GUN_PROFILES[id]:null;
export const plasmaGunWeapon=w=>plasmaGunProfile(w?.standaloneModeId??w?.catalogModeId);
const cartridgeId=(p,hot=false)=>'olegurps:plasma-cartridge:'+p.modeId+(hot?':hot':':standard');
export const PLASMA_CARTRIDGES=Object.freeze(Object.fromEntries(Object.values(PLASMA_GUN_PROFILES).flatMap(p=>[false,...(p.hotAllowed?[true]:[])].map(hot=>{
 const id=cartridgeId(p,hot);return [id,Object.freeze({id,name:(hot?'Hot Power Cartridge':'Plasma Power Cartridge')+' — '+p.name,
  category:'plasma-power-cartridge',plasmaGunModeId:p.modeId,hot,tl:p.tl,caliber_mm:null,cps_usd:null,wps_lb:null,
  source_ref:hot?'UT127,133':'UT127–128',linked_weapon_modes:[{equipment_id:p.equipmentId,weapon_mode_id:p.modeId}],linked_weapon_mode_count:1,
  provenance:{officialTableRow:false,identity:'module-model-bound-cartridge',interchangeability:'not-established',physicalCostWeight:'not-published'}})];
}))));
export function plasmaCartridge(modeId,type){
 const p=plasmaGunProfile(modeId),c=Object.hasOwn(PLASMA_CARTRIDGES,type?.ammoId??'')?PLASMA_CARTRIDGES[type.ammoId]:null;
 return p&&c&&c.plasmaGunModeId===modeId&&(!c.hot||p.hotAllowed)&&type.source==='catalog'&&type.book==='ut'&&type.kind==='ammo-family'&&!type.recipe?c:null;
}
export function projectPlasmaGuns(book,data){
 if(book==='ut'){
  const ammo_families=[...data.ammo_families,...Object.values(PLASMA_CARTRIDGES).filter(c=>!data.ammo_families.some(r=>r.id===c.id))];
  return {...data,ammo_families,indexes:{...data.indexes,ammo_family_ids:ammo_families.map(c=>c.id),ammo_family_ids_with_linked_weapons:ammo_families.filter(c=>c.linked_weapon_modes.length).map(c=>c.id)}};
 }
 if(book!=='weapons')return data;
 return {...data,equipment:data.equipment.map(e=>({...e,modes:e.modes.map(m=>{
  const p=plasmaGunProfile(m.weapon_mode_id);if(!p||p.equipmentId!==e.equipment_id)return m;
  const skill={name:p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty,modifier:0};
  return {...m,ut_plasma_gun_source:p,ut_source_data:{...m.ut_source_data,power_accounting_required:false,readiness:'physical-cartridges'},
   governing_skill:{status:'resolved',skill,candidates:[skill],basis:'UT128:table-skill-header'},governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},
   defaults:[{type:'skill',...skill},{type:'dx',modifier:-4},{type:'skill',name:skill.name,specialization:null,modifier:-4},...(['Pistol','Rifle'].includes(p.specialty)?[{type:'skill',name:'Guns',specialization:p.specialty,modifier:-4}]:[])],
   ammunition_profile:{status:'resolved',catalog_kind:'olegurps-ut-ammunition-catalog-v2',primary_ammo_family_id:cartridgeId(p),alternate_ammo_family_ids:p.hotAllowed?[cartridgeId(p,true)]:[],
    special_load_ids:[],default_warhead_id:null,suggested_warhead_ids:[],native_weapon_tl:p.tl,caliber_mm:null,platform_tags:['plasma-gun'],supports_exotic_warheads:false,link_basis:'UT127,133: model-bound physical cartridges'}};
 })}))};
}
export function plasmaGunDamage(raw,id,weapon,type){
 const p=plasmaGunProfile(id),c=plasmaCartridge(id,type);if(!p)return null;
 const clean=s=>String(s).replace(/\s/g,'').replaceAll('×','x');
 const range=String(raw.range??'').replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
 const m=/^(\d+)d([+-]\d+)?(?:x(\d+))?\(2\) burn ex$/.exec(p.damage);
 const valid=!!c&&!!range&&Number(range[1])>0&&Number(range[2])>=Number(range[1])&&clean(raw.damage)===clean(p.damage)&&(!weapon?.executionVariant||weapon.executionVariant==='ordinary')&&
  !weapon?.blasterHotshot&&!weapon?.omniBlaster&&[undefined,'normal'].includes(weapon?.blasterMode);
 const adds=Number(m[2]??0)+Number(m[1]);
 const formula=c?.hot?m[1]+'d+'+adds+(m[3]?'x'+m[3]:'')+'(2) burn ex':p.damage;
 const instructions=[...(c?.hot?['Hot Power Cartridge: +1 за исходный куб; Malf14, последствия отказа — вручную. UT133.']:[]),
  'Воздействие плазмы на Electrical — вручную. UT127.'];
 return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Нужен совместимый Plasma Power Cartridge и штатный профиль без ETC, LP или Hotshot.',
  rawFormula:raw.damage,formula,components:[{role:'kinetic',status:valid?'resolved':'unresolved',formula}],transformations:[],effectiveChanges:{damage:formula},
  rules:{plasmaGun:{family:'plasma-gun',modeId:id,cartridgeId:c?.id??null,hot:c?.hot??false,physicalUnitsPerShot:1,source:p.source},ammunitionSource:c?.hot?'UT127–128,133':p.source,
   ballisticRange:{halfDamage:range?Number(range[1]):null,maximum:range?Number(range[2]):null,minimum:null,source:'UT128; instance overrides preserved'}},support:{manual:instructions.map(text=>({id:'BeamCondition',text}))}};
}
