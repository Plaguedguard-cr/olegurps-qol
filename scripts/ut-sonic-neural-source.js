// Source profiles: Ultra-Tech 2007, printed UT121-122,124-126.
// Shots apply to the complete published cell set. Mindripper uses the explicitly
// approved project policy below, not an assertion of official errata.
const rows=[
 ['W-_cDjyLwIO0mQQq9','exNNy_Zo7cZ1tzIH-','Nausea Pistol','nauseator','9','C',1,66,-3,1,3,9,27,1,'4','-2',1.8,650,4,3,'Projector'],
 ['Wcl_Cjy5XU3JXJ3dp','eE9Os6SbwP_UC8qzs','Nausea Carbine','nauseator','9','C',2,56,-4,1,6,17,50,1,'5†','-3',5,2000,4,3,'Projector'],
 ['WjucTM1YNuFQh5Qix','eRB6ELvpP_RWUkpf5','Tactical Nauseator','nauseator','9','D',1,100,-8,3,9,70,200,10,'18M','-8',70,35000,2,5,'Beams'],
 ['W3C00tf23nOXmrNyF','efl6LN388FFmlP9ez','Screamer Pistol','screamer','9^','C',1,66,3,1,3,18,54,1,'4','-2',1.8,1300,4,3,'Projector'],
 ['Wzk74B_1EXUjuxzA7','e-V_tGiVRsjqNGudX','Screamer Carbine','screamer','9^','C',2,56,4,1,6,33,100,1,'5†','-3',5,4000,4,3,'Projector'],
 ['W3KOwjjpG9lL6GNQj','efMOZeAfM7krJAOes','Tactical Screamer','screamer','9','D',1,100,8,3,9,130,400,10,'18M','-8',70,70000,2,5,'Beams'],
 ['WPLKersc7PxMqDCWi','eqJdVEFMICLuX_qAP','Sonic Stinger','stunner','10','A',1,18,-1,0,1,2,6,1,'1','0',0.02,15,4,3,'Pistol'],
 ['WwviuCZ-mXk31TkK-','edu8yOl6SBMJRMTz7','Sonic Stunner','stunner','10','B',1,22,-2,0,1,10,30,1,'3','-1',0.3,120,4,3,'Pistol'],
 ['WQ7YiOiM0eRtAcXjw','eENl4HPolO3bLMUUM','Sonic Stun Pistol','stunner','10','C',1,66,-3,0,3,30,100,1,'4','-2',1.8,650,4,3,'Pistol'],
 ['WJw3HJ5oW_yH5rmT5','ek9nc_0BqB2pruCnI','Sonic Stun Rifle','stunner','10','C',2,56,-4,0,6,60,180,1,'5†','-3',5,2000,4,3,'Rifle'],
 ['WBAK5ez1wgsCn-MNl','evg7XV4HyXMGUSTSZ','Dinosaur Stunner','stunner','10','D',1,83,-6,0,6,130,400,1,'10†','-5',20,10000,3,3,'Rifle'],
 ['WZTCZw_ytxYRxZU1c','eIKB3iBmZzMcOavO0','Sonic Stun Cannon','stunner','10','D',1,100,-8,0,9,230,700,10,'18M','-8',70,32000,2,5,'Beams'],
 ['WHpARyY40tap9KlXu','eXoT3ZyslGuOaDRX9','Holdout Nerve Disruptor','neural','11^','B',1,22,-2,1,3,10,30,1,'3','-1',0.3,500,4,3,'Projector'],
 ['WLl_MaLTZuEsWMFbQ','eBjy1W6jvrAnY0h8f','Nerve Pistol','neural','11^','C',1,66,-3,1,6,23,70,1,'4','-2',1.8,2600,4,3,'Projector'],
 ['WkyLKbdnXW3drkAd_','ecDhIsLw8v12zxka1','Nerve Rifle','neural','11^','C',2,56,-4,1,12,40,120,1,'5†','-3',5,8000,4,3,'Projector'],
 ['WoHR2oLglPVAZetpb','e1dH7X47pLRdMXJkz','Tactical Neural Disruptor','neural','11^','D',1,100,-8,3,18,160,480,10,'18M','-8',70,130000,1,5,'Beams'],
 ['W6Ym32Kqu83Ll2QEQ','eWRKiBdNRRasfoHA6','Short-Range Mindripper','mindripper','12^','C',2,56,-2,1,6,4,12,1,'7','-3',5,40000,1,3,'Projector'],
 ['W3JTDeFHeu59yRTF-','eqORhSIIsOaa8qjb0','Long-Range Mindripper','mindripper','12^','D',1,100,-4,1,18,70,200,10,'18M','-8',70,700000,1,5,'Beams']
];
export const SONIC_NEURAL_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,family,tl,cellSize,cells,shots,modifier,coneWidth,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,reload,specialty])=>
 [modeId,Object.freeze({modeId,equipmentId,name,family,tl,cellSize,cells,shots,modifier,coneWidth,acc,halfRange,maximum,rof,st,bulk,weightLb,cost,lc,reload,specialty,source:['neural','mindripper'].includes(family)?'UT121–122':'UT124–126'})])));
export const sonicNeuralProfile=id=>Object.hasOwn(SONIC_NEURAL_PROFILES,id??'')?SONIC_NEURAL_PROFILES[id]:null;
export const sonicNeuralWeapon=w=>sonicNeuralProfile(w?.standaloneModeId??w?.catalogModeId);
export const isSonic=p=>p&&['nauseator','screamer','stunner'].includes(p.family);
export const sonicNeuralFormula=p=>p.family==='screamer'?`${p.modifier}d cor (${p.coneWidth} yd)`:
 p.family==='stunner'?`HT${p.modifier}(5) aff`:`HT${p.modifier} aff (${p.coneWidth} yd)`;
export const NEURAL_SETTINGS=Object.freeze({agony:'Agony',ecstasy:'Ecstasy',stun:'Neural Stun',paralysis:'Paralysis',seizure:'Seizure',death:'Death Beam'});
export const MINDRIPPER_BLOCKER='Mindripper: не разрешено противоречие HT (таблица UT122) / Will (ссылка UT122 на UT132); защитные свойства и условия поражения требуют подтверждения.';
// Historical blocker retained for old audit tooling; current execution uses this policy.
export const MINDRIPPER_PROJECT_POLICY=Object.freeze({id:'mindripper-ht-single-target-2026-10-21',approved:true,date:'2026-10-21',
 attribute:'HT',mindShield:true,beyondHalfRange:3,ordinaryDR:false,sealed:false,singleTarget:true,
 immunity:'UT121 nervous system; UT132 IQ0/Digital Mind',source:'UT122; проект 21.10.2026'});
export function neuralDesign(weapon){
 const settings=weapon?.neuralSettings??[];
 if(!Array.isArray(settings)||settings.length>6||new Set(settings).size!==settings.length||settings.some(s=>!Object.hasOwn(NEURAL_SETTINGS,s)))throw Error('Выберите допустимые установленные настройки Neural.');
 const p=sonicNeuralWeapon(weapon),tl=11+(settings.includes('death')?1:0),costMultiplier=1+Math.max(0,settings.length-1)*0.5;
 return {settings:[...settings],mode:weapon?.neuralMode??(settings.length===1?settings[0]:null),tl,costMultiplier,cost:p?.cost*costMultiplier};
}
export function sonicNeuralConfiguration(w){
 const p=sonicNeuralWeapon(w);
 if(p?.family==='mindripper')return {projectPolicy:MINDRIPPER_PROJECT_POLICY.id};
 if(p?.family==='neural')return neuralDesign(w);
 return {environment:w?.sonicEnvironment??'air',pressure:w?.sonicPressure??1,underwater:w?.sonicUnderwater??false,physicalContact:w?.sonicPhysicalContact??false};
}
export function sonicNeuralReason(w){
 const p=sonicNeuralWeapon(w);if(!p)return null;
 if(p.family==='mindripper')return null;
 let c;try{c=sonicNeuralConfiguration(w);}catch(e){return e.message;}
 if(p.family==='neural')return c.settings.length&&c.settings.includes(c.mode)?null:'Установите настройку Neural в «Настроить»; исходный эффект книгой не определён.';
 if(!['air','vacuum','water'].includes(c.environment)||typeof c.pressure!=='number'||!Number.isFinite(c.pressure)||c.pressure<0||c.pressure>1000||typeof c.underwater!=='boolean'||typeof c.physicalContact!=='boolean')return 'Проверьте среду, давление и конструкцию Sonic.';
 if(p.family==='nauseator'&&(c.environment!=='air'||c.pressure<=0.01))return 'Nauseator не действует в вакууме, следовой атмосфере и под водой. UT125.';
 if(c.environment==='water'&&!c.underwater)return 'Под водой требуется специально предназначенная для этой среды конструкция Sonic. UT125.';
 if((c.environment==='vacuum'||c.environment==='air'&&c.pressure<=0.01)&&!c.physicalContact)return 'Для Sonic в вакууме / следовой атмосфере подтвердите физический контакт с целью. UT124.';
 return null;
}
export function projectSonicNeuralCatalog(book,data){
 if(book!=='weapons')return data;
 return {...data,equipment:data.equipment.map(e=>{
  const p=Object.values(SONIC_NEURAL_PROFILES).find(p=>p.equipmentId===e.equipment_id);if(e.source!=='UT'||!p)return e;
  const skill={name:p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty,modifier:0};
  const defaults=[{type:'skill',...skill},{type:'skill',name:skill.name,specialization:null,modifier:-4},{type:'dx',modifier:-4}];
  if(['Pistol','Rifle'].includes(p.specialty))defaults.push({type:'skill',name:'Guns',specialization:p.specialty,modifier:-4});
  return {...e,modes:e.modes.map(m=>m.weapon_mode_id!==p.modeId?m:{...m,ut_sonic_neural_source:{...p},
   governing_skill:{status:'resolved',skill,candidates:[skill],basis:p.source+':table-skill-header'},
   governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},defaults,
   attack_resolution:{...m.attack_resolution,...(p.family==='mindripper'?{geometry:{type:'single-target',source:MINDRIPPER_PROJECT_POLICY.source},project_policy:{...MINDRIPPER_PROJECT_POLICY}}:p.coneWidth?{geometry:{type:'cone',width_yards_at_max_range:p.coneWidth,source:p.source}}:{})}})};
 })};
}
export function sonicNeuralDamage(raw,id,w,context={}){
 const p=sonicNeuralProfile(id);if(!p)return null;
 let c;try{c=sonicNeuralConfiguration(w);}catch{c={};}
 const parsed=String(raw.range??'').replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
 const reason=sonicNeuralReason(w)||((String(raw.damage).replace(/\s/g,'')!==sonicNeuralFormula(p).replace(/\s/g,'')||!parsed||Number(parsed[1])<=0||Number(parsed[2])<Number(parsed[1]))?'Нужны штатный Sonic/Neural Damage и корректная дальность.':null);
 const contact=isSonic(p)&&(c.environment==='vacuum'||c.environment==='air'&&c.pressure<=0.01);
 const scale=isSonic(p)?c.environment==='water'?2:contact?0:Math.min(2,c.pressure):1;
 const half=parsed?Number(parsed[1])*scale:p.halfRange*scale,max=parsed?Number(parsed[2])*scale:p.maximum*scale;
 const range=contact?'C':`${half}/${max}`,formula=p.family==='screamer'?`${p.modifier}d cor`:null;
 const resistance=['neural','mindripper','stunner','nauseator'].includes(p.family)?{
  version:1,id,name:p.name,attribute:'HT',modifier:p.modifier,condition:['neural','mindripper'].includes(p.family)?p.family:'sonic-'+p.family,
  halfRange:half,outcome:p.family==='mindripper'?'mindripper-affliction':p.family==='neural'?'neural-affliction':p.family==='stunner'?'sonic-incapacitation':'nausea',source:p.family==='mindripper'?MINDRIPPER_PROJECT_POLICY.source:p.source,
  ...(p.family==='neural'?{setting:c.mode}:{}),...(p.family==='stunner'&&typeof context.hitLocation==='string'?{hitLocation:context.hitLocation}:{})}:null;
 const lines=p.family==='screamer'?['Живые цели: injury >½ HP — Hard of Hearing; >⅔ HP — Deafness до заживления вызвавшей её травмы. UT125.']:
  p.family==='nauseator'?['Слух; Protected Hearing +5 HT. Провал: Hard of Hearing и Moderate Pain на MoF минут; 5+ — Deafness, retching и Bad Smell до очищения. UT125.']:
  p.family==='stunner'?['DR места попадания: +1 HT за полные 5 DR; за ½D +3. Провал: Unconsciousness либо недееспособность поражённой конечности на MoF минут. UT125.']:
  p.family==='neural'?[`${NEURAL_SETTINGS[c.mode]??'Выберите настройку'}; Sealed и отсутствие функционирующей нервной системы защищают полностью; за ½D +3 HT. UT121–122.`]:
  ['Одна цель на импульс; Mind Shield к HT, за ½D +3; DR и Sealed не защищают. UT122; проект 21.10.2026.',
   'Провал: Coma; 5+ — Total Amnesia после восстановления. Копия сознания описывается вручную: фрагмент при 1–4, полная эмуляция при 5+. UT122.'];
 if(p.coneWidth&&p.family!=='mindripper')lines.push(`Конус ${p.coneWidth} ярд. на максимальной дальности; охват — вручную. ${p.source}.`);
 if(contact)lines.push('Вакуум / следовая атмосфера: только физический контакт, Range C. UT124.');
 return {status:reason?'unresolved':'resolved',nativeSafe:!reason,reason,rawFormula:raw.damage,formula,
  components:formula?[{role:'kinetic',status:reason?'unresolved':'resolved',formula}]:[],transformations:[],
  effectiveChanges:{range,damage:p.family==='mindripper'?`HT${p.modifier} aff`:formula??raw.damage},rules:{...(!formula?{instructionOnly:true}:{}),
   sonicNeural:{modeId:id,family:p.family,...c,contact,coneWidth:p.family==='mindripper'?0:p.coneWidth,source:p.source},ammunitionSource:p.source,
   ...(p.family==='mindripper'?{projectDecision:{...MINDRIPPER_PROJECT_POLICY}}:{}),
   ...(resistance?{resistanceEffect:resistance}:{}),...(p.family==='screamer'?{sonicScreamer:true}:{}),
   ballisticRange:{halfDamage:half,maximum:max,minimum:null,source:p.source}},support:{manual:lines.map(text=>({id:'SpecializedPlatform',text}))}};
}
export function sonicNeuralControlsHTML(w,escape){
 const p=sonicNeuralWeapon(w);if(!p||p.family==='mindripper')return '';
 const c=sonicNeuralConfiguration(w);
 if(p.family==='neural')return `<div data-sonic-neural-controls>${c.settings.length>1?`<label>Настройка Neural<select name="neuralMode">${c.settings.map(s=>`<option value="${s}"${c.mode===s?' selected':''}>${NEURAL_SETTINGS[s]}</option>`).join('')}</select></label><small>Смена настройки — Ready. UT122.</small>`:c.settings.length?`<small>${NEURAL_SETTINGS[c.mode]}</small>`:'<small>Установите настройку Neural в «Настроить».</small>'}</div>`;
 return `<div class="gam-fire-electrolaser-controls" data-sonic-neural-controls><div class="gam-fire-electrolaser-fields"><label>Среда<select name="sonicEnvironment">${[['air','Атмосфера'],['vacuum','Вакуум / следовая'],['water','Под водой']].map(([v,l])=>`<option value="${v}"${c.environment===v?' selected':''}>${l}</option>`).join('')}</select></label><label>Давление, атм<input name="sonicPressure" aria-label="Давление, атм" type="number" min="0" max="1000" step="0.01" value="${escape(c.pressure)}" style="width:5em"></label>${c.environment==='vacuum'||c.pressure<=0.01?`<label><input name="sonicPhysicalContact" type="checkbox"${c.physicalContact?' checked':''}>Физический контакт с целью</label>`:''}</div></div>`;
}
export function sonicNeuralHardwareHTML(id,w,escape){
 const p=sonicNeuralProfile(id);if(!p||p.family==='mindripper')return '';
 if(isSonic(p))return p.family==='nauseator'?'':`<label><input name="sonicUnderwater" type="checkbox"${w?.sonicUnderwater?' checked':''}>Конструкция Sonic для подводной среды (UT125)</label>`;
 const c=neuralDesign({...w,catalogModeId:id});
 return `<fieldset><legend>Установленные настройки Neural</legend>${Object.entries(NEURAL_SETTINGS).map(([v,l])=>`<label><input name="neuralSetting" value="${v}" type="checkbox"${c.settings.includes(v)?' checked':''}>${l}</label>`).join('')}<small>Выберите хотя бы одну настройку. Смена — Ready; дополнительная настройка +50% базовой цены. Death Beam: TL12^. UT122.</small><p data-neural-price>Цена: $${c.cost}; ×${c.costMultiplier}; TL${c.tl}^.</p></fieldset>`;
}
// Compare actual injury, never nominal weapon dice. No status or Actor mutation.
export function screamerHearingResult(injury,hp){
 if(!Number.isFinite(injury)||injury<0||!Number.isFinite(hp)||hp<=0)return null;
 return injury>2*hp/3?'Deafness':injury>hp/2?'Hard of Hearing':null;
}
export function screamerDamageLines(payload,hp=null){
 const amounts=(Array.isArray(payload)?payload:[]).map(d=>d.damage).filter(Number.isFinite);
 return amounts.length?[`Бросок Damage: ${amounts.join(', ')} cor. Для живой цели сравните фактическое injury после DR${Number.isFinite(hp)&&hp>0?` с ½ HP (${hp/2}) и ⅔ HP (${2*hp/3})`: ' с ½ HP и ⅔ HP'}: превышение даёт Hard of Hearing / Deafness до заживления травмы. UT125.`]:[];
}
