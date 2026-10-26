// LT84–86: exact physical constructions. Published seconds are not a volume conversion.
const rows = [
 ['Wf9D7K1uIf9a1YFcF','eAXVk_AXSV6SGXds2','Cheirosiphon','lt_cheirosiphon_fuel','liquid',12,'3d burn','x0.5/x1','12†',-6,['greek-fire','naphtha'],10,'1d'],
 ['WWH0OQJ-rgb1mROw-','ei-7pEkzpbZ6rVdVz','Eruptor','lt_eruptor_reload','pyrotechnic',300,'1d+1 burn','1-6','16M†',-8,['powder-fragments'],1,null],
 ['WmWAtzBOn5-B5IvhJ','e-uKG55FIFbCnAky_','Fire-Lance','lt_fire_lance_one_use','disposable',60,'1d-1 burn','2-4','9†',-6,['powder'],3,null],
 ['WOtCDhbkzhdvewbDK','enkB2mLPJ3zmnmYrQ','Fire-Siphon','lt_fire_siphon_fuel','liquid',60,'3d burn','15/25','29M†',-14,['greek-fire'],10,'10d'],
 ['WMe-qDJxblDc4UUnm','ebeuop2z_udyu1OGo','Incendiary Blowpipe','lt_incendiary_blowpipe_charge_lt86','blowpipe',1,'1d-1 burn','x0.2','2',-6,['pine-resin'],20,null],
 ['W4PRplvj0ypVOdY6s','ei0N-icgR3T51RL0k','Iron Fire-Lance','lt_iron_fire_lance_charge','pyrotechnic',120,'1d burn','2-4','11†',-6,['powder-fragments'],3,null]
];
const reference={Cheirosiphon:{weightLb:20,cost:1000},Eruptor:{weightLb:50,cost:500},'Fire-Lance':{weightLb:5,cost:50},'Fire-Siphon':{weightLb:550,cost:2750},'Incendiary Blowpipe':{weightLb:1,chargeWeightLb:0.05,cost:35,chargeCost:0.5},'Iron Fire-Lance':{weightLb:10,cost:150}};
const notes={Cheirosiphon:'Подготовка 10 с; затем непрерывная подача. Дальность от ST. После попадания: 1d burn/с в течение 1d с; на воде радиус 2 ярда. LT86.',Eruptor:'Поджечь за 1 Ready. Перезарядка: 20 мин и Explosives (Fireworks). Статичная опора — отдельная опция: $270, 13.5 lb. LT86.',
 'Fire-Lance':'По одному Ready: взять, поджечь, сменить хват. Одноразовое устройство; использованное сохраняется как израсходованное. LT86.',
 'Fire-Siphon':'Два оператора. Каждые 10 с: среднее ST или ST-based Liquid Projector (Flamethrower), если выше. После попадания: 1d burn/с в течение 10d с; на воде радиус 2 ярда. LT86.',
 'Incendiary Blowpipe':'Подготовка двумя руками, атака одной. Дальность ST×0.2; ширина конуса у края равна дальности. Заряд $0.50. LT86.',
 'Iron Fire-Lance':'По одному Ready: взять, поджечь, сменить хват. Перезарядка: 10 мин и Explosives (Fireworks). Частицы металла или керамики: linked 1 pi-. LT86.'};
export const LT_FLAME_FUELS=Object.freeze({'greek-fire':'Греческий огонь',naphtha:'Нафта','pine-resin':'Сосновая смола',powder:'Пиротехнический заряд','powder-fragments':'Порох и металлические / керамические частицы'});
export const LT_FLAME_FUEL_REFERENCE=Object.freeze({'greek-fire':{costPerPint:10,weightLbPerPint:1,source:'LT84'},naphtha:{costPerPint:2,weightLbPerPint:1,source:'LT84'}});
export const LT_FLAME_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,ammoId,system,seconds,damage,range,st,bulk,fuels,readySeconds,ongoingDice])=>[modeId,Object.freeze({
 modeId,equipmentId,name,ammoId,ammoIds:[ammoId],kind:'flame',system,seconds,fuels,readySeconds,ongoingDice,source:'LT84–86',notes:notes[name],tl:3,reference:reference[name],places:1,containerCapacity:1,stockUnits:1,pellets:1,
 jet:system!=='blowpipe',irreversible:['disposable','pyrotechnic'].includes(system),linked:fuels.includes('powder-fragments'),
 rechargeSeconds:name==='Iron Fire-Lance'?600:name==='Eruptor'?1200:0,
 stats:{damage,range,strength:st,bulk:String(bulk),accuracy:null,recoil:null,rate_of_fire:system==='blowpipe'?'1':'Jet',shots:system==='blowpipe'?'1(20)':system==='liquid'?seconds+'x1s':'1x'+seconds+'s'}
})])));
export const ltFlameProfile=value=>LT_FLAME_PROFILES[typeof value==='string'?value:value?.standaloneModeId??value?.catalogModeId]??null;
export function ltFlameAdmission(modeId,ammoId,kind){
 const p=ltFlameProfile(modeId);if(!p)return null;
 const allowed=kind==='ammo-item'&&ammoId===p.ammoId;
 return {status:allowed?'compatible':'incompatible',reasons:allowed?[]:[{code:'LT_FLAME_PHYSICAL_MISMATCH',message:'LT84–86: топливо / заряд не относится к этой конструкции.'}]};
}
export function ltFlameConfiguration(weapon){
 const s=weapon?.ltEarly?.settings??{};
 return {applyArmST:s.applyArmST===true,staticMount:s.staticMount===true};
}
export function projectLTFlameSource(book,data){
 if(book==='weapons')for(const e of data.equipment??[])if(e.source==='LT')for(const m of e.modes??[]){
  const p=ltFlameProfile(m.weapon_mode_id);if(!p||p.equipmentId!==e.equipment_id)continue;
  e.local_notes=p.notes;
  const {damage,...stats}=p.stats;Object.assign(m.stats,stats);const [base,type]=damage.split(' ');m.stats.damage={base,type};m.raw_calc={...m.raw_calc,damage};
  m.lt_flame_contract=structuredClone(p);m.lt_ammo_item_ids=[p.ammoId];
  m.lt_ranged_contract={source:p.source,rclNotApplicable:true,accNotApplicable:true};
 }
 if(book==='lt')for(const p of Object.values(LT_FLAME_PROFILES)){
  const r=data.ammo_items.find(a=>a.id===p.ammoId);if(!r)throw Error('Missing LT flame source: '+p.ammoId);
  Object.assign(r,{source_equipment_id:p.equipmentId,weapon_mode_ids:[p.modeId],tech_level_raw:'3',lt_flame_physical:true,status:'OWNER_PREPARED_PHYSICAL_CHARGE',source_ref_raw:p.source});
 }
 return data;
}
