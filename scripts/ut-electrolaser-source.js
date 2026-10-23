// Ultra-Tech 2007, UT19,119-120. Published shots cover the complete source set.
const rows = [
  ['WoHuRCULuiv3fUH2l','eIiVsCgQkpT6nPGME','Electrolaser Pistol','C',1,36,-4,'1d-3 burn',4,40,80,3,'4','-2',2.2,1800,4,'Pistol',3],
  ['W80F3RfUK8r_7cObU','ebxsHT1vb-hb36cZ-','Holdout Electrolaser','B',1,22,-2,'1d-3 burn',2,10,20,1,'3','-1',0.3,250,4,'Pistol',3],
  ['WX_LmRHi1yv6wEKcu','eXs4XWj1VbvCrBOYf','Electrolaser Carbine','C',2,72,-4,'1d-3 burn',8,160,470,3,'4†','-4',3.7,3900,3,'Rifle',3],
  ['WiFzne2T6efUmwoS_','eBOX9WN82HzT5Oyak','Heavy Electrolaser','D',1,83,-6,'1d-2 burn',8,400,1100,1,'10†','-5',20,20000,3,'Rifle',3],
  ['WjKmnjb1bE4ivcTYx','eBYTE66kJity5q9zy','Underbarrel Electrolaser','C',1,66,-3,'1d-3 burn',4,90,270,1,'4',null,1.8,1300,4,'Rifle',3],
  ['Wukk0nDnRffBu-KpC','e0jl4DoJDjZzKnKnD','Semi-Portable Electrolaser','D',1,100,-8,'1d-1 burn',12,600,1900,10,'18M','-8',70,70000,1,'Beams',5]
];
export const ELECTROLASER_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,cellSize,cells,shots,modifier,burn,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,specialty,reload])=>
  [modeId,Object.freeze({modeId,equipmentId,name,cellSize,cells,shots,modifier,burn,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,specialty,reload,
    backpack:cellSize==='D',underbarrel:bulk===null,source:'UT119–120'})])));
export const electrolaserProfile=id=>Object.hasOwn(ELECTROLASER_PROFILES,id??'')?ELECTROLASER_PROFILES[id]:null;
export const electrolaserWeapon=w=>electrolaserProfile(w?.standaloneModeId??w?.catalogModeId);
export const electrolaserMode=w=>w?.electrolaserMode??'standard';
export const electrolaserUnits=w=>({standard:1,kill:2})[electrolaserMode(w)]??NaN;
export const electrolaserEnvironment=w=>w?.electrolaserEnvironment??'air';
export const electrolaserWeatherPenalty=w=>({air:0,humid:-2,rain:-6,vacuum:0})[electrolaserEnvironment(w)]??NaN;
export function electrolaserConfiguration(w){
  const mode=electrolaserMode(w),environment=electrolaserEnvironment(w),visibilityDR=w?.electrolaserVisibilityDR??0;
  return {mode,environment,visibilityDR,unitsPerShot:electrolaserUnits(w)};
}
export function validElectrolaserConfiguration(w){
  const c=electrolaserConfiguration(w);
  return Number.isFinite(c.unitsPerShot)&&Number.isFinite(electrolaserWeatherPenalty(w))&&Number.isSafeInteger(c.visibilityDR)&&c.visibilityDR>=0&&c.visibilityDR<=10000;
}
export function projectElectrolaserCatalog(book,data){
  if(book!=='weapons')return data;
  return {...data,equipment:data.equipment.map(e=>{
    const p=Object.values(ELECTROLASER_PROFILES).find(p=>p.equipmentId===e.equipment_id);if(e.source!=='UT'||!p)return e;
    const skill={name:p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty,modifier:0};
    const defaults=p.specialty==='Beams'?[{type:'skill',...skill},{type:'skill',name:'Gunner',specialization:null,modifier:-4},{type:'dx',modifier:-4}]:null;
    return {...e,local_notes:(p.backpack?'Dp':p.cells>1?p.cells+'C':p.cellSize)+'/'+p.shots+' shots.',modes:e.modes.map(m=>m.weapon_mode_id!==p.modeId?m:{...m,
      stats:{...m.stats,strength:p.st},ut_electrolaser_source:{...p,electricalArmorDivisor:2,vacuumBurn:'1d-3 burn'},
      governing_skill:{status:'resolved',skill,candidates:[skill],basis:'UT120:table-skill-header'},
      governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},...(defaults?{defaults}:{})})};
  })};
}
export function electrolaserDamage(raw,id,weapon,context={}){
  const p=electrolaserProfile(id);if(!p)return null;
  const c=electrolaserConfiguration(weapon),range=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
  const valid=validElectrolaserConfiguration(weapon)&&[kAff(p),`HT${p.modifier} aff`].includes(raw.damage)&&!!range&&Number(range[1])>0&&Number(range[2])>=Number(range[1]);
  const vacuum=c.environment==='vacuum',formula=vacuum?'1d-3 burn':p.burn;
  const lines=vacuum?['Вакуум / следовая атмосфера: только лазерный ожог; электрического воздействия нет. UT119.']:
    [`Электрический эффект HT${p.modifier} (2): оглушение${c.mode==='kill'?'; провал на 5+ — Heart Attack (B428–429), у Electrical — отказ систем до ремонта':''}. UT119.`];
  if(c.environment==='humid'||c.environment==='rain')lines.push('Среда: '+(c.environment==='humid'?'влажность −2':'дождь / морось / сильный туман −6')+' к попаданию. UT119.');
  if(c.visibilityDR)lines.push('Добавочный DR лучу от видимости: '+c.visibilityDR+'; применяется вручную к ожогу. UT119.');
  return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Проверьте штатный профиль и условия электролазера.',rawFormula:raw.damage,
    formula,components:[{role:'kinetic',status:valid?'resolved':'unresolved',formula}],transformations:[],effectiveChanges:{damage:formula},
    rules:{electrolaser:{modeId:id,...c,weatherPenalty:electrolaserWeatherPenalty(weapon),source:p.source},ammunitionSource:p.source,
      ...(!vacuum?{resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier:p.modifier,condition:'electrolaser',
        halfRange:range?Number(range[1]):p.halfRange,outcome:'electrical-stun',mode:c.mode,armorDivisor:2,
        ...(typeof context.hitLocation==='string'?{hitLocation:context.hitLocation}:{}),source:p.source}}:{}),
      ballisticRange:range?{halfDamage:Number(range[1]),maximum:Number(range[2]),minimum:null,source:p.source}:null},
    support:{manual:lines.map(text=>({id:'ElectrolaserCondition',text}))}};
}
const kAff=p=>`HT${p.modifier} (2) aff`;
export function electrolaserControlsHTML(w,escape){
  if(!electrolaserWeapon(w))return '';
  const c=electrolaserConfiguration(w);
  const hint=c.environment==='vacuum'?'Вакуум / следовая атмосфера: только лазерный ожог, без электрического эффекта.':
    c.mode==='kill'?'Heart Attack при провале HT на 5+; для Electrical — отказ систем до ремонта. Kill: LC2.':'Провал HT: оглушение.';
  return `<div class="gam-fire-electrolaser-controls" data-electrolaser-controls><div class="gam-fire-electrolaser-fields">`+
    `<label>Режим<select name="electrolaserMode" title="${escape(hint)}">${[['standard','Standard'],['kill','Kill']].map(([v,l])=>`<option value="${v}"${c.mode===v?' selected':''}>${l}</option>`).join('')}</select></label>`+
    `<label>Среда<select name="electrolaserEnvironment" title="Влажность: −2 к попаданию; дождь, морось, сильный туман: −6. В вакууме электрический эффект не действует.">${[['air','Обычная'],['humid','Влажность −2'],['rain','Дождь/туман −6'],['vacuum','Вакуум']].map(([v,l])=>`<option value="${v}"${c.environment===v?' selected':''}>${l}</option>`).join('')}</select></label>`+
    `<label title="Добавочный DR лазерному лучу от штрафа видимости; применяется вручную к ожогу.">DR<input aria-label="Добавочный DR лучу от видимости" name="electrolaserVisibilityDR" type="number" min="0" max="10000" step="1" value="${escape(c.visibilityDR)}"></label></div>`+
    `<small title="${escape(hint)} UT119–120.">${c.mode==='kill'?'Kill: 2 заряда':'Standard: 1 заряд'}/выстрел; смена режима — Ready</small></div>`;
}
