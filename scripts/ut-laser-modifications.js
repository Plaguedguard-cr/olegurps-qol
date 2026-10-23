import {BEAM_PROFILES,beamProfile,beamWeapon} from './ut-beam-source.js';

// UT2007 pp.113-119. Conservative scope: changing an X-ray/Graser/Rainbow
// emitter into a different wavelength is not treated as upgrading that model.
export const LASER_CONSTRUCTIONS=Object.freeze({standard:'Стандартный луч',blueGreen:'Blue-Green',ultraviolet:'Ultraviolet',pulse:'Pulse (фиксированный)'});
export const LASER_MODES=Object.freeze({beam:'Beam',pulse:'Pulse',dazzle:'Dazzle',blinding:'Blinding'});
export const DEFAULT_LASER_MODIFICATIONS=Object.freeze({version:1,construction:'standard',dazzle:false,blinding:false,beamPulse:false});
// Published weapon prices UT115-119. These names belong to the reviewed ID
// registry; arbitrary Actor names never authorize a model or a modification.
const PRICES=Object.freeze({'Area Defense Laser':2000000,'Assault Laser':10000,'Dinosaur Laser':19000,'Gatling Laser':70000,
  'Heavy Laser Pistol':2400,'Holdout Laser':300,'Laser Cannon':4000000,'Laser Carbine':4600,'Laser Crystal':100,
  'Laser Pistol':1100,'Laser Rifle':8000,'Laser Sniper Rifle':20000,'Point Defense Laser':250000,'Semi-Portable Laser':32000,'Strike Laser':500000,'Survival Laser':2400,
  'Heavy X-Ray Laser Pistol':4800,'Holdout X-Ray Laser':600,'X-Ray Laser Pistol':2200,'X-Ray Dino Laser':38000,
  'X-Ray Laser Carbine':9000,'X-Ray Laser Rifle':16000,'Semi-Portable X-Ray Laser':130000,'X-Ray Laser Cannon':8000000,'X-Ray Strike Laser':1000000,
  'Graser Pistol':3300,'Heavy Graser Pistol':7200,'Holdout Graser':900,'Dinosaur Graser':28000,'Graser Carbine':13000,'Graser Rifle':24000,
  'Graser Cannon':12000000,'Semi-Portable Graser':190000,'Strike Graser':1500000});
export function laserModificationCost(id,c,base=PRICES[beamProfile(id)?.name]??null){
  const percent=(c.dazzle?10:0)+(c.blinding?10:0)+(c.beamPulse?100:0);
  return {base,percent,multiplier:(100+percent)/100,total:base===null?null:base*(100+percent)/100,
    source:'UT113–114,119',combinationPolicy:'user-approved-additive-base-cost-2026-10-20'};
}
export function laserModificationAdmission(id){
  const p=beamProfile(id);if(!p)return null;
  const ordinary=p.family==='laser',variable=ordinary&&!p.oneShot;
  return {modeId:id,source:'UT113–119',dazzle:variable,blinding:variable,
    blueGreen:ordinary&&!p.chemical&&!p.oneShot&&p.baseRoF>1,ultraviolet:ordinary&&!p.chemical&&!p.oneShot,
    blueGreenReason:ordinary&&!p.chemical&&!p.oneShot&&p.baseRoF===1?'Blue-Green запрещён: исходный RoF 1.':null,
    pulse:!p.chemical&&p.family!=='rainbow',beamPulse:!p.chemical&&p.family!=='rainbow'&&!p.oneShot,
    restrictions:p.oneShot?'Одноразовая конструкция: дополнительные переключаемые режимы не подтверждены; Blue-Green требует два штатных заряда.':
      !ordinary?'Другие длины волн и режимы Vision для этого излучателя не подтверждены отдельно.':p.chemical?'Химический IR: Blue-Green и Pulse исключены; UV химического излучателя не подтверждён.':null};
}
export const LASER_MODIFICATION_MATRIX=Object.freeze(Object.fromEntries(Object.keys(BEAM_PROFILES).map(id=>[id,Object.freeze(laserModificationAdmission(id))])));
export const laserModifications=w=>w?.laserModifications??DEFAULT_LASER_MODIFICATIONS;
export function validateLaserModifications(id,value){
  const a=laserModificationAdmission(id);
  if(!a||!value||value.version!==1||!Object.hasOwn(LASER_CONSTRUCTIONS,value.construction)||
    ['dazzle','blinding','beamPulse'].some(k=>typeof value[k]!=='boolean')||Object.keys(value).some(k=>!Object.hasOwn(DEFAULT_LASER_MODIFICATIONS,k)))throw Error('Некорректные лазерные модификации.');
  for(const k of ['dazzle','blinding','beamPulse'])if(value[k]&&!a[k])throw Error('Модификация '+k+' не подтверждена для этой модели.');
  if(value.construction!=='standard'&&!a[value.construction])throw Error(value.construction==='blueGreen'&&a.blueGreenReason||'Конструкция не подтверждена для этой модели.');
  if(value.construction==='pulse'&&value.beamPulse)throw Error('Фиксированный Pulse несовместим с Beam/Pulse.');
  if(value.construction!=='standard'&&(value.dazzle||value.blinding))throw Error('Режимы ослепления с выбранной конструкцией не подтверждены источником.');
  return structuredClone(value);
}
export function laserAvailableModes(w){
  if(!beamWeapon(w))return [];
  const c=laserModifications(w),m=[c.construction==='pulse'?'pulse':'beam'];
  if(c.beamPulse)m.push('pulse');if(c.dazzle)m.push('dazzle');if(c.blinding)m.push('blinding');return m;
}
export const laserMode=w=>w?.laserMode??laserAvailableModes(w)[0]??'beam';
export const laserShotUnits=w=>laserMode(w)==='dazzle'?0:laserMode(w)==='blinding'?1:laserModifications(w).construction==='blueGreen'?20:10;
export const laserAvailableShots=(w,charge)=>charge>0?(laserShotUnits(w)===0?Infinity:Math.floor(Math.round(charge*10)/laserShotUnits(w))):0;
export function laserConfiguration(w){
  const modifications=validateLaserModifications(w?.standaloneModeId??w?.catalogModeId,laserModifications(w)),mode=laserMode(w);
  if(!laserAvailableModes(w).includes(mode))throw Error('Выбранный лазерный режим не установлен.');
  const environment=w.laserEnvironment??{water:'air',pressure:1};
  if(!environment||!['air','clear','average','murky'].includes(environment.water)||typeof environment.pressure!=='number'||!Number.isFinite(environment.pressure)||environment.pressure<0||environment.pressure>1000||Object.keys(environment).some(k=>!['water','pressure'].includes(k)))throw Error('Некорректные условия лазерного выстрела.');
  return {modifications,mode,environment,unitsPerShot:laserShotUnits(w)};
}
export const laserFaceOrEyes=value=>/^(?:лицо|глаз(?:а)?|face|eyes?)(?:\s|$|\s*\/)/i.test(String(value??''));
const range=value=>{const m=String(value??'').replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(\s+mi\.?)?$/);return m?{halfDamage:Number(m[1])*(m[3]?1760:1),maximum:Number(m[2])*(m[3]?1760:1),minimum:null,unit:'yards'}:null;};
export function applyLaserModifications(base,raw,id,w){
  if(!w?.laserModifications&&!w?.laserMode&&!w?.laserEnvironment)return base;
  try{
    const c=laserConfiguration(w),p=beamProfile(id),r=range(raw.range),m=String(base.formula).match(/^(\d+)d([+-]\d+)?(?:[x×](\d+))?\((\d+)\) burn(?: sur)?$/);
    if(!base.nativeSafe||!m||!r)throw Error('Нужен подтверждённый исходный профиль лазера.');
    let dice=Number(m[1]),adds=Number(m[2]??0),multiplier=Number(m[3]??1),divisor=Number(m[4]),rof=Number(raw.rof),factor=1;
    const lines=[];if(c.modifications.construction==='blueGreen'){factor=2;rof=Math.floor(rof/2);divisor=2;}
    if(c.modifications.construction==='ultraviolet'){
      factor=3;const total=dice*multiplier;dice=Math.floor(total/2);adds=Math.floor(adds*multiplier/2)+(total%2?2:0);multiplier=1;
    }
    const pulse=c.mode==='pulse',aff=['dazzle','blinding'].includes(c.mode);
    if(pulse){factor*=2;divisor=({2:1,5:3,10:5})[divisor];if(!divisor)throw Error('Ступень бронеделителя Pulse не подтверждена.');}
    r.halfDamage*=factor;r.maximum*=factor;
    if(c.modifications.construction==='blueGreen'&&c.environment.water!=='air')r.maximum=Math.min(r.maximum,{clear:150,average:60,murky:15}[c.environment.water]);
    if(c.modifications.construction==='ultraviolet'&&c.environment.pressure>0)r.maximum=Math.min(r.maximum,500/c.environment.pressure);
    r.halfDamage=Math.min(r.halfDamage,r.maximum);
    if(!Number.isSafeInteger(rof)||rof<1)throw Error('Blue-Green: RoF /2 меньше 1; порядок стрельбы такой конструкции не определён. UT114; B9.');
    const modifier=c.mode==='dazzle'?-5:-10,formula=aff?null:`${dice}d${adds?(adds>0?'+':'')+adds:''}${multiplier!==1?'x'+multiplier:''}${divisor>1?'('+divisor+')':''} ${pulse?'cr ex':'burn'+(['xray','graser'].includes(p.family)&&c.modifications.construction==='standard'?' sur':'')}`;
    if(c.mode==='dazzle')lines.push('Только лицо или глаза; цель смотрит на луч. Временное ослепление; энергия пренебрежимо мала. UT113.');
    if(c.mode==='blinding')lines.push('Цель смотрит на луч; калечащее ослепление. 1/10 штатного заряда за выстрел. UT113–114.');
    if(pulse)lines.push('Импульсный взрывной удар. UT118–119.');
    if(!aff&&['xray','graser'].includes(p.family))lines.push((p.family==='xray'?'В атмосфере Range 7/20':'В атмосфере Range 70/200')+' ярдов / давление; под водой не действует. UT117–118; предел и Field-jacketed — вручную.');
    if(p.chemical)lines.push(...base.support.manual.filter(v=>/Химический|Ранец|Отдельный/.test(v.text)).map(v=>v.text));
    if(c.modifications.construction==='blueGreen')lines.push('Blue-Green: подводный предел 150/60/15 ярдов для прозрачной/обычной/мутной воды. UT114–115.');
    if(c.modifications.construction==='ultraviolet')lines.push('Ultraviolet: предел атмосферы 500 ярдов / относительное давление; в вакууме предела нет. UT115.');
    if(laserAvailableModes(w).length>1)lines.push('Смена режима — Ready.');
    const rules={...base.rules,beam:{...base.rules.beam,tightBeam:!aff&&!pulse,surge:!aff&&!pulse&&['xray','graser'].includes(p.family)},
      ballisticRange:r,laserModifications:c,...(aff?{instructionOnly:true,resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier,
        condition:'vision-laser',halfRange:r.halfDamage,outcome:c.mode==='dazzle'?'temporary-blindness':'crippling-blindness',source:'UT113–114'}}:{})};
    const shots=String(raw.shots??'').replaceAll(',','').match(/^(\d+)(.*)$/),shotFactor=c.mode==='blinding'?10:c.modifications.construction==='blueGreen'?0.5:1;
    return {...base,formula,components:aff?[]:[{role:'kinetic',status:'resolved',formula}],rules,
      effectiveChanges:{damage:aff?`HT${modifier} aff`:formula,range:r.halfDamage+'/'+r.maximum,rof:String(rof),
        ...(shots&&shotFactor!==1?{shots:Math.floor(Number(shots[1])*shotFactor)+shots[2]}:{})},
      support:{manual:lines.map(text=>({id:'LaserModification',text}))},
      transformations:[...base.transformations,{source:'UT113–119',effectId:'laser-modifications',from:raw.damage,to:formula,applied:true,order:base.transformations.length+1}]};
  }catch(e){return {...base,nativeSafe:false,status:'unresolved',reason:e.message};}
}

export function laserModificationsHTML(id,c,escape){
  const a=laserModificationAdmission(id);if(!a)return '';
  let invalid='';try{validateLaserModifications(id,c);}catch(error){invalid=error.message;}
  return '<fieldset data-laser-modifications><legend>Лазерные модификации</legend><label>Конструкция<select name="laserConstruction">'+
    Object.entries(LASER_CONSTRUCTIONS).filter(([k])=>k==='standard'||a[k]||k===c.construction||k==='blueGreen'&&a.blueGreenReason).map(([k,v])=>`<option value="${k}"${c.construction===k?' selected':''}${k!=='standard'&&!a[k]?' disabled':''}>${escape(v)}</option>`).join('')+'</select></label>'+
    (invalid||a.blueGreenReason?`<small role="status">${escape(invalid||a.blueGreenReason)}</small>`:'')+'<div style="display:flex;flex-wrap:wrap;gap:6px 14px">'+
    [['dazzle','Dazzle Mode'],['blinding','Blinding Mode'],['beamPulse','Beam/Pulse']].filter(([k])=>a[k]).map(([k,v])=>`<label style="display:inline-flex;align-items:center;gap:4px"><input type="checkbox" name="laserModification-${k}"${c[k]?' checked':''}${(c.construction!=='standard'&&k!=='beamPulse'||c.construction==='pulse')?' disabled':''}>${v}</label>`).join('')+'</div>'+costHTML(id,c)+'</fieldset>';
}
function costHTML(id,c){const price=laserModificationCost(id,c);return `<small data-laser-cost>Цена ×${price.multiplier}${price.total===null?'':` — $${price.total}`}; надбавки к базовой цене: +${price.percent}%.</small>`;}
export function laserFireControlsHTML(w,escape){
  if(!beamWeapon(w))return '';
  const c=laserModifications(w),modes=laserAvailableModes(w),e=w.laserEnvironment??{water:'air',pressure:1};
  if(modes.length<2&&!['blueGreen','ultraviolet'].includes(c.construction))return '';
  return '<div class="gam-fire-electrolaser-controls" data-laser-fire-controls><div class="gam-fire-electrolaser-fields">'+
    (modes.length>1?'<label>Режим<select name="laserMode" style="width:10em;flex-shrink:0">'+modes.map(m=>`<option value="${m}"${laserMode(w)===m?' selected':''}>${LASER_MODES[m]}</option>`).join('')+'</select></label>':'')+
    (c.construction==='blueGreen'?'<label>Среда<select name="laserWater" style="width:16em">'+[['air','Воздух'],['clear','Прозрачная вода'],['average','Обычная вода'],['murky','Мутная вода']].map(([k,v])=>`<option value="${k}"${e.water===k?' selected':''}>${v}</option>`).join('')+'</select></label>':'')+
    (c.construction==='ultraviolet'?`<label>Давление, атм<input name="laserPressure" type="number" min="0" max="1000" step="any" value="${escape(e.pressure)}" style="width:5em" title="Относительное давление; 0 — вакуум"></label>`:'')+
    '</div>'+(modes.length>1?'<small>Смена режима — Ready</small>':'')+'</div>';
}
