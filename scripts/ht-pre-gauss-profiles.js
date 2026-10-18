// Reviewed HT28,142-145,178-180,201 identities. Runtime projection only; no imported data writes.
export const HT_PRE_GAUSS_PROFILES = Object.freeze({
  'WQ2MI3nooPOkJk6-C': {source:'HT178-179',kind:'flame',capacity:5,seconds:2,continuousUnits:5,fuel:'4.75 gal, thickened',ignition:'5 ignition blanks'},
  W073XWePe7F0ZsLMX: {source:'HT179-180',kind:'flame',capacity:1,seconds:1,fuel:'single-use',ignition:'single-use'},
  W4BiP2tlnGAJKo8W5: {source:'HT179',kind:'flame',capacity:1,seconds:20,fuel:'4.2 gal, unthickened',ignition:'one cap'},
  WjKzQQPbrfR6qChS8: {source:'HT179-180',kind:'flame',capacity:3,seconds:3,fuel:'2.6 gal',ignition:'3 ignition cartridges; 4 S batteries, manual equipment'},
  W74KTEdJzXYUl7_nu: {source:'HT179',kind:'flame',capacity:10,seconds:1,fuel:'2.6 gal',ignition:'10 separate 7.62x25mm blanks'},
  WsyoKGgbZuPilRXla: {source:'HT180',kind:'squirt',capacity:2,pressurizeSeconds:5},
  'W6VX-F3yZIRKI6edi': {source:'HT180',kind:'squirt',capacity:15,pressurizeSeconds:10},
  'Wb-nkbkql8XJJvgiI': {source:'HT28',kind:'nail',capacity:50,supplies:[
    {id:'fuel',label:'Топливный баллон',capacity:1000},
    {id:'ignition',label:'Аккумулятор зажигания',capacity:4000}]},
  WScYMOOBTYb_ixODI: {source:'HT28',kind:'nail',capacity:50,externalPower:true},
  WyhfUd4p19uPxyebR: {source:'HT28',kind:'nail',capacity:50,supplies:[
    {id:'blanks',label:'Лента холостых зарядов',capacity:10}]},
  WXGTBHA2uYykWT3zr: {source:'HT201',kind:'slingshot',capacity:1,projectiles:['stone']},
  WEEouaNXXdn8XU129: {source:'HT201',kind:'slingshot',capacity:1,projectiles:['lead','steel']},
  Wz9SRFE2djqDGbj2Y: {source:'HT201',kind:'speargun',capacity:1},
  WI9EWrbCRSJOCS_y4: {source:'HT143-145',kind:'net',capacity:1},
  'WhcXEtCOb-yikzW5Z': {source:'HT142,145',kind:'signal',capacity:1}
});
export const htPreGaussProfile = id => HT_PRE_GAUSS_PROFILES[id] ?? null;
const idsByKind = kind => Object.entries(HT_PRE_GAUSS_PROFILES).filter(([,p])=>p?.kind===kind).map(([id])=>id);
const ammunition = (id,name,modes,source,extra={}) => ({id,name,weapon_mode_ids:modes,
  ammo_family_id:id,ammunition_class:'source_specific',ammunition_construction:'weapon_specific',
  source_ref_raw:source,table_ref:source,weight_per_shot_lb:null,cost_per_shot_usd:null,
  book_cost_weight_verified:false,minimum_tech_level:null,
  provenance:{kind:'source-backed-HT-runtime-profile',officialTableRow:false,source},...extra});
export const HT_PRE_GAUSS_AMMO = Object.freeze([
  ammunition('olegurps_ht_nails','Гвозди для Nail Gun',idsByKind('nail'),'HT28'),
  ammunition('olegurps_ht_sling_stone','Камень для Slingshot',idsByKind('slingshot'),'HT201',{minimum_tech_level:0,cost_per_shot_usd:0,weight_per_shot_lb:0.05,book_cost_weight_verified:true}),
  ammunition('olegurps_ht_sling_lead','Свинцовый снаряд Slingshot',idsByKind('slingshot'),'HT201',{minimum_tech_level:2,cost_per_shot_usd:0.1,weight_per_shot_lb:0.05,book_cost_weight_verified:true}),
  ammunition('olegurps_ht_sling_steel','Стальной шар Slingshot',idsByKind('slingshot'),'HT201',{minimum_tech_level:5,cost_per_shot_usd:0.1,weight_per_shot_lb:0.05,book_cost_weight_verified:true}),
  ammunition('olegurps_ht_speargun_spear','Гарпун Speargun',idsByKind('speargun'),'HT201',{cost_per_shot_usd:10,weight_per_shot_lb:0.4,book_cost_weight_verified:true}),
  ammunition('olegurps_ht_squirt_liquid','Жидкость Squirt Carbine — 1 пинта',idsByKind('squirt'),'HT180'),
  ...idsByKind('flame').map(id=>ammunition('olegurps_ht_flame_'+id,
    (id==='W073XWePe7F0ZsLMX'?'Одноразовый DWM FmW46 — ':'Подготовленный струйный заряд — ')+HT_PRE_GAUSS_PROFILES[id].seconds+' с', [id],HT_PRE_GAUSS_PROFILES[id].source)),
  ...idsByKind('flame').filter(id=>!['W4BiP2tlnGAJKo8W5','W073XWePe7F0ZsLMX'].includes(id)).map(id=>ammunition('olegurps_ht_flame_'+id+'_unthickened',
    'Незагущённое топливо — подготовленная струя '+HT_PRE_GAUSS_PROFILES[id].seconds+' с',[id],'HT178-180',{fuelStyle:'unthickened'}))
]);
export function htPreGaussAmmoIds(modeId) {
  return HT_PRE_GAUSS_AMMO.filter(a=>a.weapon_mode_ids.includes(modeId)).map(a=>a.id);
}
export function projectHTPreGaussMode(mode,equipment) {
  const p=equipment?.source==='HT'&&htPreGaussProfile(mode?.weapon_mode_id);
  if(!p)return mode;
  const ammo=htPreGaussAmmoIds(mode.weapon_mode_id);
  return {...mode,...(ammo.length?{ht_ammo_item_ids:ammo,ht_ammo_family_ids:[]}:{}),
    ...(p.kind==='nail'?{stats:{...mode.stats,accuracy:mode.stats.accuracy??'0'},
      governing_skill:{...mode.governing_skill,attack_modifier:-4}}:{}),
    htPreGaussSource:p.source};
}
export const htLiquidRecipe = type => type?.recipe?.variantId==='ht_squirt_liquid';
export function validHTLiquidRecipe(type) {
  const r=type?.recipe,p=r?.parameters;
  return htLiquidRecipe(type)&&type.source==='catalog'&&type.book==='ht'&&type.kind==='ammo-item'&&
    type.ammoId==='olegurps_ht_squirt_liquid'&&r.version===1&&typeof r.customId==='string'&&!!r.customId&&
    (!r.variantIds||Array.isArray(r.variantIds)&&r.variantIds.length===1&&r.variantIds[0]===r.variantId)&&
    !r.autoProfile&&p&&['note','savingThrow','description'].every(k=>typeof p[k]==='string');
}
export function htPreGaussInstructions(modeId,weapon=null) {
  const p=htPreGaussProfile(modeId);if(!p)return [];
  if(p.kind==='flame')return [
    `Струя ${p.seconds*(weapon?.htJetMode==='continuous'?p.continuousUnits??1:1)} с; 3d burn/с. Два Ready; последующие проверки попадания — вручную.`,
    `Горение 2d×5 с (за ½D: 1d×5 с), 1d burn/с; негерметичный DR /5.`,
    `AOA Jet: полоса до 3 ярдов; урон и время / ширина, отдельные проверки целей — вручную. ${p.source}`];
  if(p.kind==='squirt')return [`Содержимое действует вручную; едкие жидкости непригодны. Заправка 10 с или замена резервуара два Ready, затем накачка ${p.pressurizeSeconds} с. HT180`];
  if(p.kind==='speargun')return ['Под водой Range10/15; длина штатного линя обычно не более 10 ярдов. Среду и линь учитывайте вручную. HT201'];
  if(p.kind==='net')return ['Сеть 10×10 футов, цель до SM0; захват и оглушение — вручную. При дистанции менее 5 футов применяется отдельный удар снарядом. HT143–145'];
  if(p.kind==='signal')return ['Сигнал или освещение: радиус 100 ярдов, 30 с. Эффект выбранного сигнала и контакт с горящей ракетой — вручную. HT142,145'];
  if(p.kind==='nail')return [p.externalPower?'Нужны компрессор, шланг и внешнее питание; наличие и соединение проверяются владельцем. HT28':
    p.supplies.length===2?'Гвозди, топливный баллон и аккумулятор зажигания расходуются отдельно. HT28':
    'Один гвоздь и один холостой заряд на выстрел; десять зарядов в ленте. HT28',
    'Для стрельбы нужно обойти контактный предохранитель; удержание второй рукой или подготовка блокировки — вручную. HT28'];
  return [];
}
export function htPreGaussPlatform(modeId) {
  const p=htPreGaussProfile(modeId);if(!p)return null;
  const jet=['flame','squirt'].includes(p.kind);
  return {kind:'ht-source-specific',source:p.source,rclNotApplicable:jet||['slingshot','speargun'].includes(p.kind),
    rofJet:jet,accNotApplicable:jet,instruction:htPreGaussInstructions(modeId).join('\n')};
}
export function htSourceDamage({modeId,type,compatible,raw,weapon}) {
  const p=htPreGaussProfile(modeId);if(!p)return null;
  const valid=compatible&&type?.source==='catalog'&&type.book==='ht'&&type.kind==='ammo-item'&&
    (htPreGaussAmmoIds(modeId).length?htPreGaussAmmoIds(modeId).includes(type.ammoId):
      type.ammoId===(p.kind==='net'?'ht_37x122mmr':'ht_26_5x103mmr'))&&
    (!type.recipe||p.kind==='squirt'&&validHTLiquidRecipe(type));
  const instructionOnly=['squirt','net','signal'].includes(p.kind);
  const sourceStats=p.kind==='slingshot'?{damage:type?.ammoId==='olegurps_ht_sling_stone'?'1d-1 cr':'1d cr',range:type?.ammoId==='olegurps_ht_sling_stone'?'60/100':'120/200'}:{};
  if(p.kind==='flame'&&type?.ammoId?.endsWith('_unthickened'))sourceStats.range=String(raw.range).split('/').map(n=>Number(n)/2).join('/');
  const ranges=String(sourceStats.range??raw.range).replaceAll(',','').split('/').map(Number);
  return {status:valid?'resolved':'unresolved',nativeSafe:!!valid,reason:valid?null:'HTSourceResourceRequired',
    rawFormula:raw.damage,formula:instructionOnly?null:sourceStats.damage??raw.damage,components:[],transformations:[],effectiveChanges:sourceStats,
    rules:{instructionOnly,htSourceProfile:modeId,source:p.source,
      ...(p.kind==='flame'?{liquidJet:{seconds:p.seconds*(weapon?.htJetMode==='continuous'?p.continuousUnits??1:1),damagePerSecond:'3d burn',fuel:p.fuel,ignition:p.ignition,unit:'prepared-fuel-and-ignition-burst'},physicalUnitsPerAttack:weapon?.htJetMode==='continuous'?p.continuousUnits??1:1}:{}),
      ...(p.kind==='squirt'?{payload:type?.recipe?.parameters??{note:'Вода',savingThrow:'',description:''},attackBonus:2}:{}),
      ballisticRange:{minimum:null,maximum:ranges.at(-1),halfDamage:ranges.length===2?ranges[0]:null,source:p.source},
      instructions:htPreGaussInstructions(modeId,weapon)},
    support:{manual:htPreGaussInstructions(modeId,weapon).map(text=>({id:'SpecializedPlatform',text}))}};
}
