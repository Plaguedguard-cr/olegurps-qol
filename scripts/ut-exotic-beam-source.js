import {DISINTEGRATOR_PROFILES,projectDisintegratorConstructions} from './ut-disintegrator-source.js';
// UT2007 printed 128–132. Shots are for the complete published cell set.
const rows=[
 ['WO9DrCzME3tLxITdy','eieVmrMbhg7X7VId7','Heavy Mind Disruptor','psionic','12^','D',1,83,'Will-6 aff',12,90,270,1,'10†','-5',20,100000,2,3,'Projector'],
 ['W3VUE0fwtXqwqZed2','eKnAIq2GlhjGyGE-B','Holdout Mind Disruptor','psionic','12^','B',1,22,'Will-2 aff',3,10,30,1,'3','-1',0.3,1200,2,3,'Projector'],
 ['WrpmEDLeorKIbU63V','eW0W6c7B6957gn_8n','Mind Disruptor Pistol','psionic','12^','C',1,66,'Will-3 aff',6,23,70,1,'4','-2',1.8,6500,2,3,'Projector'],
 ['WWCoyt_uVAViJSWk-','eASn8lB2aRzfQ0C57','Mind Disruptor Rifle','psionic','12^','C',2,56,'Will-4 aff',12,40,120,1,'5†','-3',5,20000,2,3,'Projector'],
 ['WuHw2140q87fIRDc5','elbnvBTRbXBl3NpDf','Tactical Mind Disruptor','psionic','12^','D',1,100,'Will-8 aff',18,160,480,10,'18M','-8',70,320000,1,5,'Beams'],
 ['WXYEtIzYfUK0fpCby','eZXbWjd3QghdkxHzF','Force Beamer','force','10^','B',1,22,'3d cr dkb',3,100,300,1,'3','-1',0.35,150,4,3,'Pistol'],
 ['WfascFVEkngONISMW','e1d8n4-gGfhAipQDV','Force Pistol','force','10^','C',2,56,'4d+2 cr dkb',6,300,900,1,'6','-2',3.3,1200,4,3,'Pistol'],
 ['WT-KsfB1Yq3ze-OSL','eP6fny-y8cpux2IAn','Force Rifle','force','10^','D',1,83,'8d cr dkb',12,700,2100,1,'7†','-4',8,4000,3,5,'Rifle'],
 ['WMWLivujtwUrMdYiP','evm0hor5ZDBMEv7Nw','Force Cannon','force','10^','F',1,66,'6dx10 cr dkb',18,18000,54000,1,'70M','-10',1000,500000,1,5,'Beams'],
 ['WhhJmcXvYHGAfWhCe','eP8uS2nD1w0OPXS3q','Heavy Force Cannon','force','10^','F',10,83,'6dx20 cr dkb',18,72000,220000,1,'200M','-10',8000,4000000,1,5,'Beams'],
 ['WV8CXSsGvfEhNKSmF','eKu1CPhVP4o3xTm20','Semi-Portable Force Beam','force','10^','E',1,100,'8dx2 cr dkb',18,2900,8700,1,'18M','-8',70,32000,1,5,'Beams'],
 ['WR8ML6-xfVf56Ynog','e9GHjRGPBxHYFCVEA','Graviton Beamer','graviton','11^','B',1,22,'1d(∞) cr nkb',1,100,300,1,'3','-1',0.35,600,3,3,'Pistol'],
 ['Wkdox45b3HYFGcCNu','epm75MfcI62G-PPLu','Graviton Pistol','graviton','11^','C',1,33,'1d+2(∞) cr nkb',6,200,600,1,'4','-2',1.5,2200,3,3,'Pistol'],
 ['W7Q5gY_183gqDH43U','eB8qoXfDsZUsuQMBX','Graviton Rifle','graviton','11^','D',1,83,'3d(∞) cr nkb',12,700,2100,1,'7†','-4',8,16000,2,5,'Rifle'],
 ['W4BIGYNul_J0XrRdO','eHeazkzIkVzYNq0mb','Graviton Cannon','graviton','11^','F',10,83,'6dx5(∞) cr nkb',18,72000,220000,1,'200M','-10',8000,1800000,1,5,'Beams'],
 ['WC6YLmtyp7E3t5ucg','eTREuOSMiOhHEUEeN','Semi-Portable Graviton Beam','graviton','11^','E',1,100,'6d(∞) cr nkb',18,2900,8700,1,'18M','-8',70,130000,1,5,'Beams'],
 ['Ws-cZZZh97ol2rCjy','egR7ZGoGlG4YLaznp','Ghost Particle Cannon','ghost','11^','F',1,66,'6dx10(∞) burn ex',15,18000,54000,10,'70M','-10',1000,1000000,1,5,'Beams'],
 ['WvPgyUYHlHInY18AI','ewlZFyF2z955yS_yt','Heavy Ghost Particle Cannon','ghost','12^','F',10,83,'6dx20(∞) burn ex',15,72000,220000,10,'200M','-10',8000,8000000,1,5,'Beams']
];
export const EXOTIC_BEAM_PROFILES=Object.freeze({...DISINTEGRATOR_PROFILES,...Object.fromEntries(rows.map(([modeId,equipmentId,name,family,tl,cellSize,cells,shots,damage,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,reload,specialty])=>[modeId,Object.freeze({modeId,equipmentId,name,family,tl,cellSize,cells,shots,damage,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,reload,specialty,source:family==='psionic'?'UT132':family==='ghost'?'UT131':family==='graviton'?'UT129':'UT128–129'})]))});
export const exoticBeamProfile=id=>Object.hasOwn(EXOTIC_BEAM_PROFILES,id??'')?EXOTIC_BEAM_PROFILES[id]:null;
export const exoticBeamWeapon=w=>exoticBeamProfile(w?.standaloneModeId??w?.catalogModeId);
export const PSIONIC_SETTINGS=Object.freeze({eraser:'Гипногогический луч / Eraser',death:'Луч смерти',insanity:'Луч безумия',neutralizer:'Подавление пси'});
export function exoticBeamConfiguration(w){
 const p=exoticBeamWeapon(w);
 if(p?.family==='force')return {kineticStun:w?.kineticStun??false};
 if(p?.family!=='psionic')return {};
 const settings=w?.psionicSettings??['eraser'],mode=w?.psionicMode??settings[0];
 if(!Array.isArray(settings)||!settings.length||settings.length>4||new Set(settings).size!==settings.length||settings.some(s=>!Object.hasOwn(PSIONIC_SETTINGS,s))||!settings.includes(mode))throw Error('Выберите установленную настройку Psionic.');
 return {settings:[...settings],mode};
}
export function exoticBeamReason(w){try{const c=exoticBeamConfiguration(w);return exoticBeamWeapon(w)?.family==='force'&&typeof c.kineticStun!=='boolean'?'Проверьте Kinetic Stun.':null;}catch(e){return e.message;}}
const normalize=s=>String(s).replace(/\s/g,'').replaceAll('×','x').replaceAll('−','-');
export function projectExoticBeamCatalog(book,data){
 if(book!=='weapons'||!Array.isArray(data?.equipment))return data;
 data=projectDisintegratorConstructions(data);
 return {...data,equipment:data.equipment.map(e=>{const p=Object.values(EXOTIC_BEAM_PROFILES).find(p=>p.equipmentId===e.equipment_id);if(!p)return e;
  const skill={name:p.family==='ghost'?'Artillery':p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty};
  const defaults=[{type:'skill',...skill,modifier:0},{type:p.family==='ghost'?'iq':'dx',modifier:p.family==='ghost'?-5:-4}];
  if(p.family!=='ghost')defaults.push({type:'skill',name:skill.name,specialization:null,modifier:-4});
  if(['Pistol','Rifle'].includes(p.specialty))defaults.push({type:'skill',name:'Guns',specialization:p.specialty,modifier:-4});
  return {...e,modes:e.modes.map(m=>m.weapon_mode_id!==p.modeId?m:{...m,ut_exotic_beam_source:{...p},
   governing_skill:{status:'resolved',skill,candidates:[skill],basis:p.source+':table-skill-header'},governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},defaults})};
 })};
}
export function exoticBeamDamage(raw,id,w){
 const p=exoticBeamProfile(id);if(!p)return null;
 let c={};try{c=exoticBeamConfiguration(w);}catch{}
 const ranges=String(raw.range??'').replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
 const reason=exoticBeamReason(w)??(normalize(raw.damage)!==normalize(p.damage)||!ranges||Number(ranges[2])<Number(ranges[1])?'Нужны источниковый Damage и корректная дальность.':null);
 const half=ranges?Number(ranges[1]):p.halfRange,max=ranges?Number(ranges[2]):p.maximum;
 const formula=p.family==='psionic'?null:p.damage.replace('(∞)','(-1)');
 const dis=!!DISINTEGRATOR_PROFILES[id];
 const lines=dis?(p.family==='conversion'?['Follow-Up: '+p.followUp+' rad sur; \u043f\u0440\u043e\u043d\u0438\u043a\u043d\u043e\u0432\u0435\u043d\u0438\u0435 \u2014 \u0432\u0440\u0443\u0447\u043d\u0443\u044e. UT131; B381.']:p.family==='reality'?['\u0422\u043e\u043b\u044c\u043a\u043e Reality-Stabilized DR; Stasis Web. Temporal Inertia \u2014 \u0443\u0441\u043b\u043e\u0432\u043d\u043e. UT131,193.','Selective Area: 1 \u044f\u0440\u0434; large-area injury; \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u0438\u0435: \u221210\u00d7HP. UT130.']:['\u041e\u0431\u044b\u0447\u043d\u044b\u0439 DR \u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044f; Force Screen DR/10; Stasis Web. UT130.','Selective Area: 1 \u044f\u0440\u0434; large-area injury; \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u0438\u0435: \u221210\u00d7HP. UT130.']):p.family==='psionic'?[`${PSIONIC_SETTINGS[c.mode]}; Mind Shield добавляется к Will, за ½D +3. IQ 0 и Digital Mind невосприимчивы. UT132.`]:
  p.family==='force'?[c.kineticStun?'Kinetic Stun: обычных ран нет; полный бросок для двойного отбрасывания, blunt trauma сохраняется. UT128.':'Двойное отбрасывание. UT128.']:
  p.family==='graviton'?['Обычный DR игнорируется; применимый Force Screen: DR/100. Отбрасывания нет. UT129.']:
  ['Прямое попадание: внутренний взрыв, обычный DR игнорируется, injury ×3; только Reality-Stabilized Force Screen: DR/5. UT131.',
   'Побочный взрыв: обычный DR, без ×3. Radiation, surge; непрямая наводка и точка взрыва — вручную. UT131.'];
 const resistance=p.family==='psionic'?{version:1,id,name:p.name,attribute:'Will',modifier:Number(p.damage.match(/Will(-\d+)/)[1]),condition:'psionic',halfRange:half,outcome:'psionic-affliction',source:p.source,setting:c.mode}:null;
 return {status:reason?'unresolved':'resolved',nativeSafe:!reason,reason,rawFormula:raw.damage,formula,transformations:[],
  components:formula?[{role:'kinetic',status:'resolved',formula},...(p.family==='conversion'?[{role:'follow-up',status:'resolved',formula:p.followUp}]:[]),...(p.family==='ghost'?[{role:'collateral',status:'resolved',formula:p.damage.replace('(∞)','')}]:[])]:[],
  effectiveChanges:{damage:p.damage,range:`${half}/${max}`},
  rules:{exoticBeam:{modeId:id,family:p.family,...c,...(dis?{selectiveArea:true,radius:1,largeAreaInjury:true,disintegrationThreshold:-10}:{}),source:p.source},ammunitionSource:p.source,
   ...(p.family==='conversion'?{primaryDamageRole:'kinetic',componentOrder:['kinetic','follow-up'],radiation:true,surge:true}:{}),
   ...(p.family==='ghost'?{primaryDamageRole:'kinetic',componentOrder:['kinetic','collateral'],internalExplosion:true,radiation:true,surge:true}:{}),
   ...(resistance?{instructionOnly:true,resistanceEffect:resistance}:{}),ballisticRange:{halfDamage:half,maximum:max,minimum:null,source:p.source}},
  support:{manual:lines.map(text=>({id:'SpecializedPlatform',text}))}};
}
export function exoticBeamControlsHTML(w,escape){
 const p=exoticBeamWeapon(w);if(!p)return '';const c=exoticBeamConfiguration(w);
 if(p.cosmic)return `<div data-exotic-beam-controls><small>${p.family==='conversion'?'Follow-Up: проникновение основного cor указывается для каждой цели в Apply Damage. UT131; B381.':p.family==='reality'?'Только Reality-Stabilized DR; Stasis Web. Temporal Inertia — условно. UT131,193.':'Обычный DR игнорируется; Force Screen DR/10; Stasis Web. UT130.'} Selective Area: 1 ярд; large-area injury — вручную.</small></div>`;
 if(p.family==='force')return `<div data-exotic-beam-controls><label><input type="checkbox" name="kineticStun"${c.kineticStun?' checked':''}>Kinetic Stun (UT128)</label></div>`;
 if(p.family!=='psionic')return '';
 return `<div data-exotic-beam-controls>${c.settings.length>1?`<label>Настройка Psionic<select name="psionicMode">${c.settings.map(s=>`<option value="${s}"${s===c.mode?' selected':''}>${escape(PSIONIC_SETTINGS[s])}</option>`).join('')}</select></label><small>Смена настройки — Ready. UT132.</small>`:`<small>${escape(PSIONIC_SETTINGS[c.mode])}</small>`}</div>`;
}
export function exoticBeamHardwareHTML(id,w,escape){
 const p=exoticBeamProfile(id);if(p?.family!=='psionic')return '';
 const c=exoticBeamConfiguration({...w,catalogModeId:id}),multiplier=1+(c.settings.length-1)*0.5;
 return `<fieldset><legend>Установленные настройки Psionic</legend>${Object.entries(PSIONIC_SETTINGS).map(([v,l])=>`<label><input name="psionicSetting" value="${v}" type="checkbox"${c.settings.includes(v)?' checked':''}>${escape(l)}</label>`).join('')}<small>Дополнительная настройка +50% базовой цены; смена — Ready. UT132.</small><p data-psionic-price>Цена: $${p.cost*multiplier}; ×${multiplier}.</p></fieldset>`;
}
