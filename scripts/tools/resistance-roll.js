import {applyMessageMode} from './chat-message-mode.js';
// Attribute -> modifier -> explicit conditions -> native GGA -> descriptive outcome.
// Buttons never contain a target, Actor or Token binding.
const SCOPE='olegurps-qol',installations=new WeakMap(),busy=new WeakSet();
const afflictionOutcomes={'sonic-nauseator':'nausea','sonic-stunner':'sonic-incapacitation',neural:'neural-affliction',psionic:'psionic-affliction',mindripper:'mindripper-affliction',fluid:'fluid-exposure'};
const neuralSettings=['agony','ecstasy','stun','paralysis','seizure','death'];
const attributes={ST:'ST',DX:'DX',IQ:'IQ',HT:'HT',Will:'WILL',WILL:'WILL',Per:'PER',PER:'PER',QN:'QN'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readable=message=>!!message&&message.visible!==false&&message.isContentVisible!==false;
function validChemical(value){
  return value&&value.version===1&&value.manualConsequences===true&&value.penetrationConfirmationRequired===false&&
    ['id','name','delivery','route','source','brief','protection'].every(k=>typeof value[k]==='string'&&value[k].length>0&&value[k].length<=2000)&&
    Array.isArray(value.checks)&&value.checks.length>0&&value.checks.length<=4&&
    new Set(value.checks.map(c=>c?.id)).size===value.checks.length&&
    value.checks.every(c=>c&&typeof c.id==='string'&&c.id.length>0&&c.id.length<=100&&
      typeof c.label==='string'&&c.label.length<=200&&Number.isSafeInteger(c.modifier)&&Math.abs(c.modifier)<=1000);
}
export function resistanceEffect(value){
  if(!value||value.version!==1||value.eligible===false||!Object.hasOwn(attributes,value.attribute)||
    !Number.isSafeInteger(value.modifier)||Math.abs(value.modifier)>1000||
    !['none','reality-stabilizer','vision-laser','electrolaser','microwave-mad','microwave-disruptor','omni-blaster',...Object.keys(afflictionOutcomes)].includes(value.condition)||!['displacement','temporary-blindness','crippling-blindness','electrical-stun','agony','shutdown','unconsciousness',...Object.values(afflictionOutcomes)].includes(value.outcome)||
    (value.condition==='reality-stabilizer')!==(value.outcome==='displacement')||value.condition==='reality-stabilizer'&&(value.attribute!=='HT'||value.modifier!==0)||
    Object.hasOwn(afflictionOutcomes,value.condition)&&(value.attribute!==(value.condition==='psionic'?'Will':'HT')||value.outcome!==afflictionOutcomes[value.condition]||!Number.isFinite(value.halfRange)||value.halfRange<0)||
    Object.values(afflictionOutcomes).includes(value.outcome)&&afflictionOutcomes[value.condition]!==value.outcome||
    value.condition==='neural'&&!neuralSettings.includes(value.setting)||
    value.condition==='psionic'&&!['eraser','death','insanity','neutralizer'].includes(value.setting)||
    value.condition==='sonic-stunner'&&value.hitLocation!==undefined&&(typeof value.hitLocation!=='string'||value.hitLocation.length>200)||
    !['id','name','source'].every(k=>typeof value[k]==='string'&&value[k].trim()&&value[k].length<=200)||
    ['vision-laser','electrolaser','microwave-mad','microwave-disruptor'].includes(value.condition)&&(!Number.isFinite(value.halfRange)||value.halfRange<=0)||
    (value.condition==='microwave-mad')!==(value.outcome==='agony')||
    (value.condition==='microwave-disruptor')!==(value.outcome==='shutdown')||
    (value.condition==='omni-blaster')!==(value.outcome==='unconsciousness')||value.condition==='omni-blaster'&&value.attribute!=='HT'||
    value.condition.startsWith('microwave-')&&value.attribute!=='HT'||
    value.condition==='electrolaser'&&(value.outcome!=='electrical-stun'||!['standard','kill'].includes(value.mode)||value.armorDivisor!==2||
      value.hits!==undefined&&(!Number.isSafeInteger(value.hits)||value.hits<1)||value.hitLocation!==undefined&&(typeof value.hitLocation!=='string'||value.hitLocation.length>200))||
    value.outcome==='electrical-stun'&&value.condition!=='electrolaser'||
    value.condition==='fluid'&&value.chemical!==undefined&&!validChemical(value.chemical))return null;
  return Object.fromEntries(['version','id','name','attribute','modifier','condition','halfRange','outcome','source',
    ...(value.condition==='fluid'?['brief','chemical']:[]),
    ...(value.condition==='electrolaser'?['mode','armorDivisor','hitLocation','hits']:[]),
    ...(['neural','psionic'].includes(value.condition)?['setting']:[]),...(value.condition==='sonic-stunner'?['hitLocation']:[])].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
}
export function messageResistanceEffect(message){
  if(!readable(message))return null;
  const flags=message.flags?.[SCOPE]??{};
  if(Object.hasOwn(flags,'resistanceEffect'))return resistanceEffect(flags.resistanceEffect);
  // Supported saved structured contracts, never HTML, names or a current catalog lookup.
  const profile=flags.shotSnapshot?.profile??flags.attackProfile;
  return profile?.context?.resistanceApplicable===true?resistanceEffect(profile.damage?.rules?.resistanceEffect):null;
}
export const resistanceLabel=effect=>'Бросок '+effect.attribute+(effect.modifier<0?'−'+Math.abs(effect.modifier):effect.modifier>0?'+'+effect.modifier:'');
export function selectedResistanceToken(runtime=globalThis){
  const controlled=runtime.canvas?.tokens?.controlled??[];
  if(controlled.length!==1)throw Error('Выделите ровно один токен на сцене для броска сопротивления.');
  const token=controlled[0],actor=token?.actor;
  if(!actor)throw Error('У выделенного токена нет доступного Actor.');
  if(!runtime.game?.user?.isGM&&(actor.isOwner!==true||token.isOwner===false))throw Error('Нет прав управлять выделенным токеном.');
  return token;
}
export function resistanceAttribute(actor,attribute){
  const key=Object.hasOwn(attributes,attribute)?attributes[attribute]:null;
  const value=key&&actor?.system?.attributes?.[key]?.value;
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw Error('У выделенного персонажа нет корректного действующего значения '+attribute+'.');
  return value;
}
function boundActor(token,actor,runtime){
  const doc=token?.document,tokens=doc?.parent?.tokens;
  if(!actor||token.actor!==actor||tokens&&tokens.get(doc.id)!==doc||
    runtime.game?.actors?.get&&!actor.isToken&&runtime.game.actors.get(actor.id)!==actor)
    throw Error('Выбранный для сопротивления персонаж или токен больше недоступен.');
  if(!runtime.game?.user?.isGM&&(actor.isOwner!==true||token.isOwner===false))throw Error('Нет прав управлять выбранным для сопротивления персонажем.');
  return actor;
}
const normalizeName=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const nonnegativeLevel=value=>value===undefined||value===null||String(value).trim()===''?0:
  typeof value==='number'?value:/^\d+$/.test(String(value).trim())?Number(value):NaN;
export function resistanceVisionDefaults(actor){
  let protectedVision=false;const levels=[],seen=new Set();
  const visit=tree=>{if(!tree||typeof tree!=='object'||seen.has(tree))return;seen.add(tree);
    for(const entry of Object.values(tree)){
      if(!entry||typeof entry!=='object'||entry.disabled===true||entry.inactive===true||entry.active===false||entry.enabled===false||entry.suppressed===true)continue;
      const name=normalizeName(entry.name),specialty=normalizeName(entry.specialization??entry.specialty);
      if(name==='protected vision'||/^protected sense\s*\(\s*vision\s*\)$/.test(name)||name==='protected sense'&&specialty==='vision')protectedVision=true;
      const membrane=/^nictitating membrane(?:\s+(\d+))?$/.exec(name);
      if(membrane){const level=nonnegativeLevel(entry.level??membrane[1]);
        levels.push(Number.isSafeInteger(level)&&level>=0&&(!membrane[1]||Number(membrane[1])===level)?level:NaN);}
      visit(entry.contains);visit(entry.collapsed);
    }};
  // GGA's current advantage tree, including contained traits; equipment is not inspected.
  visit(actor?.system?.ads);
  return {distance:'within',protectedVision:protectedVision?'yes':'no',membrane:levels.length&&levels.every(n=>n===levels[0])&&Number.isSafeInteger(levels[0])?levels[0]:0};
}
export function visionResistanceModifier(effect,choices){
  if(effect.condition==='reality-stabilizer'){
    if(!Number.isSafeInteger(choices?.ht)||choices.ht<1||choices.ht>100000)throw Error('Укажите собственный HT Reality Stabilizer.');
    return {applies:true,modifier:0,lines:['Собственный HT Reality Stabilizer: '+choices.ht+'; HT жертвы и обычная DR не используются. UT131.']};
  }
  if(effect.condition==='fluid'){
    if(effect.chemical){
      const c=effect.chemical,check=c.checks.find(v=>v.id===(choices?.checkId??c.checks[0].id));
      if(!check||!Number.isSafeInteger(check.modifier))throw Error('ChemicalCheckRequired');
      return {applies:true,modifier:check.modifier,lines:[check.label,c.protection]};
    }
    if(!choices||typeof choices.exposed!=='boolean'||typeof choices.protected!=='boolean'||typeof choices.immune!=='boolean')throw Error('Укажите воздействие, применимую защиту и иммунитет.');
    return {applies:choices.exposed&&!choices.protected&&!choices.immune,modifier:effect.modifier,lines:['Воздействие, защита дыхания/контакта/глаз и иммунитет определены вручную для данного вещества.']};
  }
  if(Object.hasOwn(afflictionOutcomes,effect.condition)){
    if(!choices||!['within','beyond'].includes(choices.distance))throw Error('Укажите дистанцию сопротивления.');
    const distance=choices.distance==='beyond'?3:0,lines=['Дистанция: '+(distance?'за ½D (+3)':'до ½D (+0)')];
    let bonus=0,immunity=null;
    if(['psionic','mindripper'].includes(effect.condition)){
      const shield=nonnegativeLevel(choices.mindShield);
      if(!Number.isSafeInteger(shield)||shield<0||shield>1000||typeof choices.iqZero!=='boolean'||typeof choices.digitalMind!=='boolean'||effect.setting==='death'&&(typeof choices.noVitals!=='boolean'||typeof choices.doesntBreathe!=='boolean'))throw Error('Укажите Mind Shield и иммунитеты Psionic.');
      bonus=shield;if(choices.iqZero||choices.digitalMind)immunity='IQ 0 и Digital Mind: Psionic не действует. UT132.';
      if(effect.condition==='mindripper'){
        if(typeof choices.nervousSystem!=='boolean')throw Error('Укажите наличие функционирующей нервной системы.');
        if(!choices.nervousSystem)immunity='Без функционирующей нервной системы Mindripper не действует. UT121; проект 21.10.2026.';
      }
      lines.push('Mind Shield: +'+shield+'; обычный DR игнорируется.');
    }else if(effect.condition==='sonic-nauseator'){
      if(typeof choices.canHear!=='boolean'||typeof choices.protectedHearing!=='boolean')throw Error('Укажите слух и Protected Hearing.');
      if(!choices.canHear)immunity='Цель не слышит: Nauseator не действует. UT125.';
      bonus=choices.protectedHearing?5:0;lines.push('Protected Hearing: +'+bonus+'; DR игнорируется.');
    }else if(effect.condition==='sonic-stunner'){
      const dr=nonnegativeLevel(choices.dr);
      if(!Number.isSafeInteger(dr)||dr<0||dr>100000||typeof choices.limb!=='boolean')throw Error('Укажите DR места попадания и поражённую локацию.');
      bonus=Math.floor(dr/5);lines.push(`DR места попадания: ${dr}; полные 5 DR: +${bonus} HT.`,choices.limb?'Поражена конечность / extremity.':'Поражена остальная часть тела.');
    }else{
      if(typeof choices.sealed!=='boolean'||typeof choices.nervousSystem!=='boolean')throw Error('Укажите Sealed и наличие функционирующей нервной системы.');
      if(choices.sealed)immunity='Sealed полностью защищает от Neural. UT122.';
      else if(!choices.nervousSystem)immunity='Без функционирующей нервной системы Neural не действует. UT121.';
      else if(effect.setting==='ecstasy'&&choices.killjoy===true)immunity='Killjoy защищает от Ecstasy. B428.';
      else if(effect.setting==='death'&&choices.noVitals===true)immunity='Injury Tolerance (No Vitals) защищает от Heart Attack. B429.';
      lines.push('Обычный DR игнорируется.');
    }
    return {applies:!immunity,immunity,modifier:effect.modifier+distance+bonus,lines};
  }
  if(effect.condition==='omni-blaster'){
    const dr=nonnegativeLevel(choices?.dr);if(!Number.isSafeInteger(dr)||dr<0||dr>100000)throw Error('Укажите целый неотрицательный применимый DR.');
    return {applies:true,modifier:effect.modifier+Math.floor(dr/3),lines:[`Применимый DR: ${dr}; треть DR: +${Math.floor(dr/3)} к HT.`]};
  }
  if(effect.condition==='microwave-mad'||effect.condition==='microwave-disruptor'){
    const dr=nonnegativeLevel(choices?.dr),mad=effect.condition==='microwave-mad';
    if(!choices||!Number.isSafeInteger(dr)||dr<0||dr>100000)throw Error('Укажите целый неотрицательный применимый DR.');
    if(mad)return {applies:true,modifier:effect.modifier+dr,lines:[`Полный применимый DR: +${dr} к HT.`]};
    const ht=Number(choices.ht),sm=choices.sm===undefined||String(choices.sm).trim()===''?0:Number(choices.sm);
    if(!Number.isSafeInteger(ht)||ht<=0||ht>100000||!Number.isSafeInteger(sm)||Math.abs(sm)>1000||
      !['within','beyond'].includes(choices.distance)||typeof choices.sealed!=='boolean'||typeof choices.exposed!=='boolean')
      throw Error('Укажите положительный целый HT, целый SM и условия защиты. Пустой SM равен 0.');
    const armor=choices.sealed&&!choices.exposed?dr:0,distance=choices.distance==='beyond'?3:0;
    return {applies:true,modifier:effect.modifier+sm+distance+armor,
      lines:[`SM: ${sm}; дистанция: ${distance?'за ½D (+3)':'до ½D (+0)'}.`,
        'Sealed: '+(choices.sealed?'да':'нет')+'; неэкранированные соединения: '+(choices.exposed?'да':'нет')+'.',
        `Применимый DR: ${dr}; защита к HT: +${armor}.`]};
  }
  if(effect.condition==='electrolaser'){
    const dr=nonnegativeLevel(choices?.dr);
    if(!choices||!['within','beyond'].includes(choices.distance)||!Number.isSafeInteger(dr)||dr<0||dr>100000||typeof choices.electrical!=='boolean')
      throw Error('Укажите дистанцию, целый неотрицательный DR поражённой локации и тип цели Electrical.');
    const distance=choices.distance==='beyond'?3:0,armor=Math.floor(dr/2);
    return {applies:true,modifier:effect.modifier+distance+armor,
      lines:['Дистанция: '+(distance?'за ½D (+3)':'до ½D (+0)'),`DR поражённой локации: ${dr}; делитель (2): +${armor} к HT.`,
        'Electrical: '+(choices.electrical?'да':'нет')]};
  }
  if(effect.condition==='none')return {applies:true,modifier:effect.modifier,lines:[]};
  const membrane=nonnegativeLevel(choices?.membrane);
  if(!choices||!['within','beyond'].includes(choices.distance)||
    !['yes','no'].includes(choices.protectedVision)||!Number.isSafeInteger(membrane)||membrane<0)
    throw Error('Укажите дистанцию и защиту зрения. Уровень Nictitating Membrane должен быть целым неотрицательным числом.');
  const distance=choices.distance==='beyond'?3:0,pv=choices.protectedVision==='yes'?5:0;
  return {applies:true,modifier:effect.modifier+distance+pv+membrane,
    lines:['Дистанция: '+(distance?'за ½D (+3)':'до ½D (+0)'),
      'Protected Vision: '+(pv?'+5':'нет (+0)'), 'Nictitating Membrane: +'+membrane]};
}
async function askConditions(effect,runtime,actor){
  if(effect.condition==='reality-stabilizer')return runtime.foundry.applications.api.DialogV2.wait({window:{title:'Сопротивление Reality Stabilizer'},position:{width:420},modal:false,rejectClose:false,
    content:'<p>Бросок только при наличии Reality Stabilizer или стабилизированного force screen. Используйте HT самого устройства (обычно 12), не HT жертвы. UT131.</p><label>HT стабилизатора<input name="ht" type="number" min="1" max="100000" step="1" value="12"></label>',
    buttons:[{action:'roll',label:'Бросить',callback:(_event,button)=>({ht:Number(button.form.elements.ht.value)})},{action:'cancel',label:'Отмена',callback:()=>false}]});
  if(effect.condition==='fluid'){
    const checks=effect.chemical?.checks;
    if(!checks||checks.length===1)return checks?{checkId:checks[0].id}:{exposed:true,protected:false,immune:false};
    return runtime.foundry.applications.api.DialogV2.wait({window:{title:'\u0411\u0440\u043e\u0441\u043e\u043a \u0441\u043e\u043f\u0440\u043e\u0442\u0438\u0432\u043b\u0435\u043d\u0438\u044f \u2014 '+effect.name},position:{width:440},modal:false,rejectClose:false,
      content:`<label>\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430<select name="chemicalCheck">${checks.map(c=>`<option value="${escape(c.id)}">${escape(c.label)}: HT${c.modifier}</option>`).join('')}</select></label>`,
      buttons:[{action:'roll',label:'\u0411\u0440\u043e\u0441\u0438\u0442\u044c',callback:(_event,button)=>({checkId:button.form.elements.chemicalCheck.value})},{action:'cancel',label:'\u041e\u0442\u043c\u0435\u043d\u0430',callback:()=>false}]});
  }
  if(effect.condition==='none')return {};
  if(Object.hasOwn(afflictionOutcomes,effect.condition))return askProfileAfflictionConditions(effect,runtime,actor);
  if(['microwave-mad','microwave-disruptor','omni-blaster'].includes(effect.condition))return askArmorAfflictionConditions(effect,runtime,actor);
  if(effect.condition==='electrolaser')return askElectricalConditions(effect,runtime,actor);
  const defaults=resistanceVisionDefaults(actor);
  const select=(name,label,options)=>`<label>${label}<select name="${name}">${options.map(([value,label])=>`<option value="${value}"${defaults[name]===value?' selected':''}>${label}</option>`).join('')}</select></label>`;
  const read=form=>({distance:form.elements.distance.value,protectedVision:form.elements.protectedVision.value,membrane:nonnegativeLevel(form.elements.membrane.value)});
  const answer=await runtime.foundry.applications.api.DialogV2.wait({window:{title:'Условия сопротивления — '+effect.name},
    position:{width:440},modal:false,rejectClose:false,
    content:`<p><strong>${escape(actor.name)}</strong></p><p>${escape(effect.source)}: Protected Vision даёт +5, Nictitating Membrane — +1/уровень; DR не влияет.</p>`+
      select('distance','Дистанция',[['within','В пределах 1/2D ('+effect.halfRange+' ярдов)'],['beyond','Дальше 1/2D (+3)']])+
      select('protectedVision','Protected Vision',[['yes','Да (+5)'],['no','Нет']])+
      `<label>Nictitating Membrane: уровень<input name="membrane" type="number" min="0" step="1" value="${defaults.membrane}"></label>`+
      `<p data-resistance-preview aria-live="polite"></p>`,
    render:(_event,dialog)=>{const form=dialog.element.querySelector('form'),preview=dialog.element.querySelector('[data-resistance-preview]');
      const update=()=>{try{const value=visionResistanceModifier(effect,read(form)).modifier;preview.textContent='Поправка сопротивления: '+(value>=0?'+':'')+value+'.';}
        catch(e){preview.textContent=e.message;}};
      form.addEventListener('input',update);form.addEventListener('change',update);update();},
    buttons:[{action:'roll',label:'Бросить',default:true,callback:(_event,button)=>{
      const value=read(button.form);
      try{visionResistanceModifier(effect,value);return value;}catch(e){runtime.ui?.notifications?.warn?.(e.message);return false;}
    }},{action:'cancel',label:'Отмена',callback:()=>false}]
  });
  return answer&&typeof answer==='object'?answer:null;
}
export function electricalResistanceLocations(actor){
  // Only GGA's explicit location entries; never Actor's aggregate DR.
  return Object.values(actor?.system?.hitlocations??{}).filter(v=>v&&typeof v.where==='string').map(v=>({name:v.where,
    dr:/^\d+$/.test(String(v.dr??'').trim())?Number(v.dr):null}));
}
export function afflictionTraitDefaults(actor){
  const names=[],shields=[],seen=new Set();
  const visit=tree=>{if(!tree||typeof tree!=='object'||seen.has(tree))return;seen.add(tree);
    for(const e of Object.values(tree))if(e&&typeof e==='object'&&![e.disabled,e.inactive,e.suppressed].includes(true)&&e.active!==false&&e.enabled!==false){
      const name=normalizeName(e.name)+(e.specialization?' ('+normalizeName(e.specialization)+')':'');names.push(name);
      const shield=/^mind shield(?:\s+(\d+))?$/.exec(name);
      if(shield){const level=nonnegativeLevel(e.level??shield[1]);shields.push(Number.isSafeInteger(level)&&level>=0&&(!shield[1]||Number(shield[1])===level)?level:NaN);}
      const tolerance=/^injury tolerance\s*\(([^)]+)\)$/.exec(name);if(tolerance)names.push(...tolerance[1].split(/[,;]/).map(s=>s.trim()));
      visit(e.contains);visit(e.collapsed);
    }};
  visit(actor?.system?.ads);
  const has=re=>names.some(n=>re.test(n));
  return {mindShield:shields.length&&shields.every(n=>n===shields[0])&&Number.isSafeInteger(shields[0])?shields[0]:0,iqZero:actor?.system?.attributes?.IQ?.value===0,digitalMind:has(/^digital mind$/),doesntBreathe:has(/^(?:doesn't|does not|doesn’t) breathe$/),canHear:!has(/^deafness$/),protectedHearing:has(/^(?:protected hearing|protected sense\s*\(hearing\))$/),
    sealed:has(/^sealed$/),killjoy:has(/^killjoy$/),noVitals:has(/^(?:injury tolerance\s*\()?no vitals\)?$/),
    nervousSystem:!has(/^(?:machine(?: meta-trait)?|(?:injury tolerance\s*\()?\s*(?:diffuse|no brain|homogen(?:e)?ous|unliving)\)?)$/)};
}
async function askProfileAfflictionConditions(effect,runtime,actor){
  const defaults=afflictionTraitDefaults(actor),locations=electricalResistanceLocations(actor),stunner=effect.condition==='sonic-stunner',nausea=effect.condition==='sonic-nauseator',psionic=['psionic','mindripper'].includes(effect.condition),mindripper=effect.condition==='mindripper';
  const selected=locations.findIndex(l=>normalizeName(l.name)===normalizeName(effect.hitLocation));
  const isLimb=name=>/\b(?:arm|leg|hand|foot|wing|tentacle|foreleg|hindleg)\b|рук|ног|кист|ступн|крыл|щупальц/i.test(name??'');
  const check=(name,label,value)=>`<label><input type="checkbox" name="${name}"${value?' checked':''}>${label}</label>`;
  const read=form=>({distance:form.elements.distance.value,...(psionic?{mindShield:nonnegativeLevel(form.elements.mindShield.value),iqZero:form.elements.iqZero.checked,digitalMind:form.elements.digitalMind.checked,...(mindripper?{nervousSystem:form.elements.nervousSystem.checked}:{}),...(effect.setting==='death'?{noVitals:form.elements.noVitals.checked,doesntBreathe:form.elements.doesntBreathe.checked}:{})}:nausea?{canHear:form.elements.canHear.checked,protectedHearing:form.elements.protectedHearing.checked}:
    stunner?{dr:nonnegativeLevel(form.elements.dr.value),limb:form.elements.limb.checked,hitLocation:locations[Number(form.elements.localDR.value)]?.name??effect.hitLocation??''}:
      {sealed:form.elements.sealed.checked,nervousSystem:form.elements.nervousSystem.checked,
        ...(form.elements.killjoy?{killjoy:form.elements.killjoy.checked}:{}),...(form.elements.noVitals?{noVitals:form.elements.noVitals.checked}:{})})});
  const answer=await runtime.foundry.applications.api.DialogV2.wait({window:{title:'Условия сопротивления — '+effect.name},position:{width:460},modal:false,rejectClose:false,
    content:`<p><strong>${escape(actor.name)}</strong></p><label>Дистанция<select name="distance"><option value="within">В пределах 1/2D (${effect.halfRange} ярдов)</option><option value="beyond">Дальше 1/2D (+3)</option></select></label>`+
      (psionic?`<label>Mind Shield: уровень<input type="number" name="mindShield" min="0" max="1000" step="1" value="${defaults.mindShield}"></label>`+
        check('iqZero','IQ 0 (иммунитет)',defaults.iqZero)+check('digitalMind','Digital Mind (иммунитет)',defaults.digitalMind)+
        (mindripper?check('nervousSystem','Функционирующая нервная система',defaults.nervousSystem)+'<p>Diffuse, No Brain, Homogenous, Unliving и Machine невосприимчивы. Одна цель; Sealed не защищает. UT122; проект 21.10.2026.</p>':'')+
        (effect.setting==='death'?check('noVitals','No Vitals (защита от Heart Attack)',defaults.noVitals)+check('doesntBreathe',"Doesn't Breathe (защита от Choking)",defaults.doesntBreathe):'')+'<p>Обычный DR не защищает. UT132.</p>':nausea?check('canHear','Цель способна слышать',defaults.canHear)+check('protectedHearing','Protected Hearing (+5 HT)',defaults.protectedHearing)+'<p>DR игнорируется. UT125.</p>':
      stunner?`<label>Поражённая локация<select name="localDR"><option value="-1">Указать DR вручную</option>${locations.map((l,i)=>`<option value="${i}"${i===selected?' selected':''}>${escape(l.name)}</option>`).join('')}</select></label>`+
        `<label>DR места попадания<input type="number" name="dr" min="0" max="100000" step="1" value="${locations[selected]?.dr??0}"></label>`+
        check('limb','Конечность / extremity (недееспособность вместо Unconsciousness)',isLimb(effect.hitLocation))+'<p>Каждые полные 5 DR дают +1 HT. Слух не влияет. UT125.</p>':
        check('sealed','Sealed (полная защита)',defaults.sealed)+check('nervousSystem','Функционирующая нервная система',defaults.nervousSystem)+
        (effect.setting==='ecstasy'?check('killjoy','Killjoy (защита от Ecstasy, B428)',defaults.killjoy):'')+
        (['agony','ecstasy','death'].includes(effect.setting)?check('noVitals','Injury Tolerance (No Vitals): защита от Heart Attack, B429',defaults.noVitals):'')+
        '<p>Diffuse, No Brain, Homogenous, Unliving и Machine невосприимчивы. Необычная биология и инопланетные исключения — по решению ведущего. UT121–122.</p>')+
      '<p data-resistance-preview aria-live="polite"></p>',
    render:(_event,dialog)=>{const form=dialog.element.querySelector('form'),preview=dialog.element.querySelector('[data-resistance-preview]');
      const update=()=>{try{const c=visionResistanceModifier(effect,read(form));preview.textContent=c.immunity??'Поправка сопротивления: '+c.modifier+'.';}catch(e){preview.textContent=e.message;}};
      form.addEventListener('change',event=>{if(stunner&&event.target.name==='localDR'){
        const l=locations[Number(event.target.value)];form.elements.dr.value=String(l?.dr??0);form.elements.limb.checked=isLimb(l?.name);
      }update();});form.addEventListener('input',update);update();},
    buttons:[{action:'roll',label:'Бросить',default:true,callback:(_event,button)=>{const c=read(button.form);try{visionResistanceModifier(effect,c);return c;}catch(e){runtime.ui?.notifications?.warn?.(e.message);return false;}}},
      {action:'cancel',label:'Отмена',callback:()=>false}]});
  return answer&&typeof answer==='object'?answer:null;
}
async function askArmorAfflictionConditions(effect,runtime,actor){
  const disruptor=effect.condition==='microwave-disruptor',locations=electricalResistanceLocations(actor);
  let ht='';if(disruptor){try{ht=resistanceAttribute(actor,'HT');}catch{}}
  const read=form=>({dr:nonnegativeLevel(form.elements.dr.value),...(disruptor?{ht:form.elements.ht.value,sm:form.elements.sm.value,
    distance:form.elements.distance.value,sealed:form.elements.sealed.checked,exposed:form.elements.exposed.checked}:{})});
  const answer=await runtime.foundry.applications.api.DialogV2.wait({window:{title:'Условия сопротивления — '+effect.name},position:{width:460},modal:false,rejectClose:false,
    content:`<p><strong>${escape(actor?.name??'Электрическая система без Actor')}</strong></p>`+
      (disruptor?`<label>HT<input name="ht" type="number" min="1" max="100000" step="1" value="${ht}" required></label>`+
        `<label>SM (пустое = 0)<input name="sm" type="number" min="-1000" max="1000" step="1" value=""></label>`+
        `<label>Дистанция<select name="distance"><option value="within">В пределах 1/2D (${effect.halfRange} ярдов)</option><option value="beyond">Дальше 1/2D (+3)</option></select></label>`+
        `<label><input name="sealed" type="checkbox">Sealed</label><label><input name="exposed" type="checkbox">Неэкранированные антенны, кабели или силовые линии</label>`+
        `<p>Только электрические системы и Electrical. Обычный DR игнорируется; у Sealed без открытых соединений добавляется применимый DR. UT121.</p>`:
        effect.condition==='omni-blaster'?'<p>Треть применимого DR добавляется к HT с округлением вниз. При провале — Unconsciousness на минуты по степени провала. UT124.</p>':
        `<p>Полный применимый DR добавляется к HT. При провале — Agony в луче и ещё 1 секунду. UT120.</p>`)+
      `<label>Защита<select name="localDR"><option value="-1">Указать DR вручную</option>${locations.map((v,i)=>`<option value="${i}">${escape(v.name)}${v.dr===null?' — DR неоднозначен':' (DR '+v.dr+')'}</option>`).join('')}</select></label>`+
      `<label>Применимый DR<input name="dr" type="number" min="0" max="100000" step="1" value="0"></label><p data-resistance-preview aria-live="polite"></p>`,
    render:(_event,dialog)=>{const form=dialog.element.querySelector('form'),preview=dialog.element.querySelector('[data-resistance-preview]'),button=dialog.element.querySelector('[data-action="roll"]');
      const update=()=>{try{const c=read(form),value=visionResistanceModifier(effect,c).modifier;
        preview.textContent=disruptor?'Итог HT до Modifier Bucket: '+(Number(c.ht)+value)+'.':'Поправка сопротивления: '+value+'.';if(button)button.disabled=false;
      }catch(e){preview.textContent=e.message;if(button)button.disabled=true;}};
      form.addEventListener('change',event=>{if(event.target.name==='localDR')form.elements.dr.value=String(locations[Number(event.target.value)]?.dr??0);update();});
      form.addEventListener('input',update);update();},
    buttons:[{action:'roll',label:'Бросить',default:true,callback:(_event,button)=>{const value=read(button.form);
      try{visionResistanceModifier(effect,value);return value;}catch(e){runtime.ui?.notifications?.warn?.(e.message);return false;}}},
      {action:'cancel',label:'Отмена',callback:()=>false}]});
  return answer&&typeof answer==='object'?answer:null;
}
async function askElectricalConditions(effect,runtime,actor){
  const locations=electricalResistanceLocations(actor),matches=locations.map((v,i)=>normalizeName(v.name)===normalizeName(effect.hitLocation)?i:-1).filter(i=>i>=0);
  const selected=matches.length===1?matches[0]:-1,initial=locations[selected]?.dr??0;
  const read=form=>({distance:form.elements.distance.value,dr:nonnegativeLevel(form.elements.dr.value),electrical:form.elements.electrical.checked});
  const answer=await runtime.foundry.applications.api.DialogV2.wait({window:{title:'Условия сопротивления — '+effect.name},position:{width:460},modal:false,rejectClose:false,
    content:`<p><strong>${escape(actor.name)}</strong></p><p>Для одного фактического попадания; ожог не обязан пробить DR. UT119.</p>`+
      `<label>Поражённая локация<select name="localDR"><option value="-1">Указать DR вручную</option>${locations.map((v,i)=>`<option value="${i}"${selected===i?' selected':''}>${escape(v.name)}${v.dr===null?' — DR неоднозначен':' (DR '+v.dr+')'}</option>`).join('')}</select></label>`+
      `<label>DR поражённой локации<input name="dr" type="number" min="0" max="100000" step="1" value="${initial}"></label>`+
      `<p>Каждые 2 DR дают +1 к HT. Проверьте DR именно места попадания; общий DR персонажа не используется.</p>`+
      `<label>Дистанция<select name="distance"><option value="within">В пределах 1/2D (${effect.halfRange} ярдов)</option><option value="beyond">Дальше 1/2D (+3)</option></select></label>`+
      `<label><input name="electrical" type="checkbox">Цель имеет Electrical</label><p data-resistance-preview aria-live="polite"></p>`,
    render:(_event,dialog)=>{const form=dialog.element.querySelector('form'),preview=dialog.element.querySelector('[data-resistance-preview]');
      const update=()=>{try{preview.textContent='Поправка сопротивления: '+visionResistanceModifier(effect,read(form)).modifier+'.';}catch(e){preview.textContent=e.message;}};
      form.addEventListener('change',event=>{if(event.target.name==='localDR')form.elements.dr.value=String(locations[Number(event.target.value)]?.dr??0);update();});
      form.addEventListener('input',update);update();},
    buttons:[{action:'roll',label:'Бросить',default:true,callback:(_event,button)=>{const value=read(button.form);
      try{visionResistanceModifier(effect,value);return value;}catch(e){runtime.ui?.notifications?.warn?.(e.message);return false;}}},
      {action:'cancel',label:'Отмена',callback:()=>false}]});
  return answer&&typeof answer==='object'?answer:null;
}
export async function withoutResistanceConfirmation(callback,runtime=globalThis,validate=()=>{}){
  const DialogV2=runtime.foundry?.applications?.api?.DialogV2;
  if(typeof DialogV2?.wait!=='function')return callback();
  const original=DialogV2.wait,title=runtime.game?.i18n?.localize?.('GURPS.confirmRoll')??'Roll Confirmation';
  let used=false;
  // GGA 0.18.23 has no per-roll fast-forward argument. Use its own supplied
  // _doRoll callback before constructing a confirmation window (existing module pattern).
  const direct=function(options,...args){
    const roll=options?.buttons?.find(b=>b.action==='roll'),cancel=options?.buttons?.find(b=>b.action==='cancel');
    if(!used&&options?.window?.title===title&&roll?.default===true&&typeof roll.callback==='function'&&cancel){
      used=true;validate();return Promise.resolve(roll.callback(null,roll,null));
    }
    return original.call(this,options,...args);
  };
  DialogV2.wait=direct;
  try{return await callback();}finally{if(DialogV2.wait===direct)DialogV2.wait=original;}
}
function profileAfflictionConsequence(effect,native,choices,success){
  if(effect.condition==='fluid'&&effect.chemical){
    const c=effect.chemical,id=c.id,mof=native.margin<0?-native.margin:null;
    if(success)return 'Сопротивление успешно; последствия этого воздействия не наступают.';
    const duration=mof==null?'длительность по автоматическому провалу определите вручную':mof+' минут';
    if(id==='sleep_poison'||id==='sleep_contact')return (mof!=null&&mof>=5?'Без сознания: '+duration:'Сонливость')+'. Последствия применяются вручную. '+c.source;
    if(id==='sleep')return 'Без сознания: '+duration+', затем обычный сон. Применяется вручную. UT160.';
    if(id==='riot')return (mof!=null&&mof>=5?'Рвота в облаке; после выхода тошнота '+duration:'Тошнота в облаке')+'. Применяется вручную. UT160.';
    if(id==='paralysis')return native.isCritFailure?'1d повреждений и кома; применяются вручную (UT160).':(mof!=null&&mof<=2?'Падение и неподвижность на этот ход.':'Падение и паралич: '+duration)+ ' Применяется вручную (UT160).';
    return c.brief+' '+(mof==null?'Автоматический провал; MoF-условия определите вручную.':'Степень провала: '+mof+'.')+' Последствия и повторные циклы применяются вручную. '+c.source;
  }
  if(effect.condition==='fluid')return success?'Сопротивление успешно.':`${effect.brief} Степень провала: ${Math.max(0,-native.margin)}. Последствия и повторные циклы применяются вручную.`;
  if(success)return 'Воздействие отражено.';
  const duration=native.margin<0?-native.margin+' мин':'длительность автоматического провала определите вручную';
  if(effect.condition==='mindripper')return 'Coma; '+(native.margin<=-5?'Total Amnesia после восстановления; high-resolution emulation.':native.margin<0?'low-resolution fragment (провал 1–4).':'разрешите степень автоматического провала и качество копии вручную.')+' Копия сознания — только описание. UT122; проект 21.10.2026.';
  if(effect.condition==='psionic'){
    const severe=native.margin<=-5;
    if(effect.setting==='eraser')return (severe?'Unconsciousness; после восстановления Daze: ':'Daze (встряска или ранение выводит из Daze): ')+duration+'. Потеря памяти: секунда выстрела и предыдущая секунда. UT132.';
    if(effect.setting==='death')return severe?(choices.noVitals?'Heart Attack не действует: No Vitals. UT132; B429.':'Heart Attack. UT132; B429.'):
      choices.doesntBreathe?"Choking не действует: Doesn't Breathe. UT132; B428.":'Choking: '+(native.margin<0?-native.margin*2+' с':'длительность определите вручную')+'. UT132.';
    if(effect.setting==='insanity')return severe?'Coma; при выживании Nightmares (12) на 1d недель (срок бросьте отдельно). UT132.':'Hallucinations: '+duration+'. UT132.';
    return 'Пси-способности подавлены: '+duration+'. UT132.';
  }
  if(effect.condition==='sonic-nauseator')return native.margin<=-5?
    `Deafness и retching; потеря контроля сфинктеров — Bad Smell до очищения. Deafness защищает от следующих Nauseator. Длительность Deafness/retching: ${duration}. UT125.`:
    `Hard of Hearing и Moderate Pain: ${duration}. UT125.`;
  if(effect.condition==='sonic-stunner')return (choices.limb?'Недееспособность поражённой конечности / extremity':'Unconsciousness')+': '+duration+'. UT125.';
  if(effect.setting==='death')return 'Heart Attack. UT122; B429.';
  if(['agony','ecstasy'].includes(effect.setting))return (effect.setting==='agony'?'Agony':'Ecstasy')+': '+duration+'; затем '+
    (effect.setting==='agony'?'Moderate Pain':'Euphoria')+' на такой же срок.'+(native.margin<=-5?(choices.noVitals?' Heart Attack не действует: No Vitals (B429).':' Heart Attack.'):'')+' UT122.';
  return ({stun:'Unconsciousness',paralysis:'Paralysis',seizure:'Seizure'}[effect.setting])+': '+duration+'. UT122.';
}
export function resistanceOutcome(effect,native,choices={}){
  if(!native||!Number.isFinite(native.finaltarget)||!Number.isFinite(native.rtotal)||!Number.isFinite(native.margin)||
    !['isCritSuccess','isCritFailure','failure'].every(k=>typeof native[k]==='boolean'))throw Error('GGA не вернул структурированный результат сопротивления.');
  // GGA supplies critical flags; 3/4 still succeed below HT 3 (B347).
  // GGA 0.18.23 omits failure by 10 when finaltarget <= 0; supplement B348 only there.
  const criticalSuccess=native.isCritSuccess,criticalFailure=!criticalSuccess&&
    (native.isCritFailure||native.finaltarget<=0&&native.margin<=-10);
  const success=criticalSuccess||!criticalFailure&&!native.failure;
  const label=criticalSuccess?'Критический успех':criticalFailure?'Критический провал':success?'Успех':'Провал';
  const marginText=success&&native.margin>=0?'Степень успеха: '+native.margin:
    !success&&native.margin<0?'Степень провала: '+(-native.margin):
      label+' независимо от сравнения с итоговой характеристикой; разность характеристики и броска: '+native.margin;
  const recovery=`Каждый ход: HT${effect.modifier} для восстановления от оглушения, без бонуса DR. UT119; применяется вручную.`;
  const consequence=effect.condition==='reality-stabilizer'?(success?'Reality Stabilizer защитил от переноса.':'Защита Reality Stabilizer не сработала. Габариты, область и назначение переноса разрешаются вручную. UT131.'):Object.hasOwn(afflictionOutcomes,effect.condition)?profileAfflictionConsequence(effect,native,choices,success):effect.condition==='omni-blaster'?(success?'Воздействие Stun отражено.':
    'Unconsciousness: '+(native.margin<0?-native.margin+' мин.':'длительность по степени автоматического провала определите вручную.')+' Применяется вручную. UT124.'):
    effect.condition==='microwave-mad'?(success?'Воздействие MAD отражено.':
    'Agony: пока цель находится в луче и ещё 1 секунду после выхода. Применяется вручную. UT120; B428.'):
    effect.condition==='microwave-disruptor'?(success?'Воздействие отражено.':
      'Электрическая система отключается; цель с Electrical теряет сознание. '+(native.margin<0?
        'Длительность: '+(-native.margin)+' мин.':'Автоматический провал; длительность по степени провала определите вручную.')+' Применяется вручную. UT121.'):
    effect.condition==='electrolaser'?(success?'Электрический эффект отражён. Ожог разрешается отдельно.':
    'Цель оглушена. '+(effect.mode==='kill'&&native.margin<=-5?(choices.electrical?
      'Электрические системы вышли из строя до ремонта (UT119). ':'Heart Attack (B428–429); применяется вручную. '):'')+recovery):
    success?'Эффект лазера отражён; слепота от этого воздействия не наступает.':
    effect.outcome==='temporary-blindness'?(native.margin<0?'Временная слепота на '+(-native.margin)+' мин. Применяется вручную ('+effect.source+').':
      'Временная слепота при автоматическом провале; длительность по степени провала определите вручную ('+effect.source+', B348).'):
      'Калечащая слепота. Длительность определите отдельным HT по B422 в конце боя: успех — временная, провал — длительная, критический провал — постоянная. Срок длительной слепоты и лечение — вручную.';
  return {success,criticalSuccess,criticalFailure,label,marginText,consequence};
}
export async function rollResistance(message,runtime=globalThis){
  const effect=messageResistanceEffect(message);if(!effect)return null;
  if(busy.has(runtime))throw Error('Дождитесь завершения текущего броска сопротивления.');
  busy.add(runtime);
  let preHook,createHook,timer,cleanupModifier;
  try{
    const manual=['microwave-disruptor','reality-stabilizer'].includes(effect.condition),controlled=runtime.canvas?.tokens?.controlled??[];
    if(manual&&controlled.length>1)throw Error('Выделите не более одного токена для сопротивления.');
    const token=manual?(controlled[0]?.actor?selectedResistanceToken(runtime):null):selectedResistanceToken(runtime),actor=token?.actor;
    const validate=()=>{if(actor)boundActor(token,actor,runtime);};
    if(!manual)resistanceAttribute(actor,effect.attribute);
    const choices=await (runtime.__olegurpsResistanceConditions??askConditions)(effect,runtime,actor);
    if(!choices)return null;
    validate();
    const conditions=visionResistanceModifier(effect,choices);
    if(!conditions.applies){
      const immunityMessage=await runtime.ChatMessage.create(applyMessageMode(runtime.ChatMessage,{speaker:runtime.ChatMessage.getSpeaker({actor,token}),
        content:`<p>${escape(conditions.immunity)}</p>`,flags:{[SCOPE]:{resistanceImmunity:{version:1,effectId:effect.id,sourceMessageId:message.id,conditions:structuredClone(choices)}}}},runtime.game));
      return {message:immunityMessage,immune:true};
    }
    const loader=runtime.__olegurpsNativeResistanceLoader??(()=>import('/systems/gurps/module/dierolls/dieroll.js'));
    const {doRoll}=await loader();
    if(typeof doRoll!=='function')throw Error('Нативный механизм сопротивления GGA недоступен.');
    if(!readable(message))throw Error('Сообщение сопротивления больше недоступно.');
    validate();
    const base=manual?Number(choices.ht):resistanceAttribute(actor,effect.attribute),G=runtime.GURPS;
    const thing='Сопротивление: '+effect.name+' ('+effect.attribute+')',previous=G.lastTargetedRoll;
    let matchedId=null,captured=null,resolveMessage;
    const created=new Promise(resolve=>{resolveMessage=resolve;});
    preHook=runtime.Hooks.on('preCreateChatMessage',nativeMessage=>{
      if(captured)return;
      const r=G.lastTargetedRoll,roll=nativeMessage.rolls?.[0];
      if((nativeMessage.speaker?.actor??null)!==(actor?.id??null)||(nativeMessage.author?.id??nativeMessage.user?.id)!==runtime.game.user.id||
        r===previous||r?.thing!==thing||r.fromUser!==runtime.game.user.id||(r.actorid??null)!==(actor?.id??null)||r.rtotal!==roll?.total||r.origtarget!==base)return;
      validate();
      const result=resistanceOutcome(effect,r,choices),bucket=r.finaltarget-base-conditions.modifier;
      captured={...result,base,modifier:conditions.modifier,bucketModifier:bucket,finalTarget:r.finaltarget,total:r.rtotal,margin:r.margin};
      matchedId=nativeMessage.id;
      const details=`<details class="olegurps-chat-details"><summary>Условия сопротивления</summary><p>${escape(effect.name)}; ${escape(effect.attribute)} ${base}, поправка эффекта и условий ${conditions.modifier}, Modifier Bucket и GGA ${bucket}, итог ${r.finaltarget}.</p><p>3d6: ${r.rtotal}. ${escape(result.marginText)}.</p>${conditions.lines.map(line=>'<p>'+escape(line)+'</p>').join('')}<p>${escape(effect.source)}</p></details>`;
      nativeMessage.updateSource({content:nativeMessage.content+`<div class="olegurps-resistance-result"><strong>${escape(result.label)}</strong><p>${escape(result.consequence)}</p>${details}</div>`,
        [`flags.${SCOPE}.resistanceResult`]:{version:1,effectId:effect.id,attribute:effect.attribute,base,modifier:conditions.modifier,
          ...(effect.chemical?{sourceMessageId:message.id}:{}),
          bucketModifier:bucket,finalTarget:r.finaltarget,total:r.rtotal,margin:r.margin,success:result.success,
          criticalSuccess:result.criticalSuccess,criticalFailure:result.criticalFailure,source:effect.source,
          ...(effect.condition==='electrolaser'?{mode:effect.mode,electrical:choices.electrical,dr:choices.dr,distance:choices.distance}: {}),
          ...(Object.hasOwn(afflictionOutcomes,effect.condition)?{conditions:structuredClone(choices),...(['neural','psionic'].includes(effect.condition)?{setting:effect.setting}:{})}:{}),
          ...(['microwave-mad','omni-blaster'].includes(effect.condition)?{dr:choices.dr}:{}),
          ...(manual?{ht:base,sm:Number(choices.sm??0),dr:choices.dr,distance:choices.distance,sealed:choices.sealed,exposed:choices.exposed}: {})}});
    });
    createHook=runtime.Hooks.on('createChatMessage',m=>{
      const r=m.flags?.[SCOPE]?.resistanceResult;
      if((m.author?.id??m.user?.id)!==runtime.game.user.id)return;
      if(m.id===matchedId||!matchedId&&captured&&(m.speaker?.actor??null)===(actor?.id??null)&&r?.effectId===effect.id&&r.total===captured.total)resolveMessage(m);
    });
    const action=actor?G.parselink(effect.attribute)?.action:null;
    if(actor&&action?.type!=='attribute')throw Error('GGA не распознал характеристику сопротивления.');
    const desc='Сопротивление '+effect.name,bucket=G.ModifierBucket,stack=bucket?.modifierStack;
    const existing=stack?.modifierList?.find(m=>m.desc===desc),previousMod=existing?.modint??0;
    // With autoAdd, GGA puts targetmods in the Bucket before confirmation. Its
    // Cancel only clears tagged entries, so remove our own surviving modifier.
    cleanupModifier=()=>{
      const index=stack?.modifierList?.findIndex(m=>m.desc===desc)??-1;if(index<0)return;
      const entry=stack.modifierList[index];if(entry.modint!==previousMod+conditions.modifier)return;
      if(existing&&entry===existing)bucket.addModifier?.(-conditions.modifier,desc);
      else if(!existing){stack.removeIndex(index);bucket.refresh?.();}
    };
    await withoutResistanceConfirmation(()=>doRoll({actor,formula:'3d6',targetmods:[{modint:conditions.modifier,mod:conditions.modifier,desc}],
      prefix:'',thing,chatthing:effect.attribute,origtarget:base,fromUser:runtime.game.user,action,
      optionalArgs:{action,obj:{consumeAction:false},event:{shiftKey:false,ctrlKey:false,altKey:false}}}),runtime,validate);
    if(!captured&&(G.lastTargetedRoll===previous||G.lastTargetedRoll?.thing!==thing))return null;
    const nativeMessage=await Promise.race([created,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('GGA не подтвердил создание сообщения сопротивления.')),5000);})]);
    return {message:nativeMessage,...captured};
  }finally{
    try{cleanupModifier?.();}finally{
      if(preHook!==undefined)runtime.Hooks.off('preCreateChatMessage',preHook);
      if(createHook!==undefined)runtime.Hooks.off('createChatMessage',createHook);
      clearTimeout(timer);busy.delete(runtime);
    }
  }
}
export function installResistanceRoll(runtime=globalThis){
  if(installations.has(runtime.Hooks))return installations.get(runtime.Hooks);
  const render=(message,html)=>{
    const root=html?.querySelector?html:html?.[0],effect=messageResistanceEffect(message),old=root?.querySelector('[data-olegurps-resistance]');
    if(!effect){old?.remove();return;}
    if(!root)return;
    if(old){old.textContent=resistanceLabel(effect);return;}
    const button=runtime.document.createElement('button');button.type='button';button.dataset.olegurpsResistance='true';button.textContent=resistanceLabel(effect);
    button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();if(button.disabled)return;button.disabled=true;
      try{await rollResistance(message,runtime);}catch(e){runtime.ui?.notifications?.warn?.(e.message);runtime.console?.error?.('OleGURPS resistance:',e);}finally{button.disabled=false;}});
    (root.querySelector('.message-content')??root).append(button);
  };
  const hooks=['renderChatMessageHTML','renderChatMessage'].map(name=>[name,runtime.Hooks.on(name,render)]);
  for(const root of runtime.document?.querySelectorAll('[data-message-id]')??[]){const message=runtime.game?.messages?.get(root.dataset.messageId);if(message)render(message,root);}
  const installed={uninstall(){for(const[name,id]of hooks)runtime.Hooks.off(name,id);installations.delete(runtime.Hooks);}};
  installations.set(runtime.Hooks,installed);return installed;
}
