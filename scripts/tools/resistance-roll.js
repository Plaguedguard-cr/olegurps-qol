// Attribute -> modifier -> explicit conditions -> native GGA -> descriptive outcome.
// Buttons never contain a target, Actor or Token binding.
const SCOPE='olegurps-qol',installations=new WeakMap(),busy=new WeakSet();
const attributes={ST:'ST',DX:'DX',IQ:'IQ',HT:'HT',Will:'WILL',WILL:'WILL',Per:'PER',PER:'PER',QN:'QN'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readable=message=>!!message&&message.visible!==false&&message.isContentVisible!==false;
export function resistanceEffect(value){
  if(!value||value.version!==1||value.eligible===false||!Object.hasOwn(attributes,value.attribute)||
    !Number.isSafeInteger(value.modifier)||Math.abs(value.modifier)>1000||
    !['none','vision-laser'].includes(value.condition)||!['temporary-blindness','crippling-blindness'].includes(value.outcome)||
    !['id','name','source'].every(k=>typeof value[k]==='string'&&value[k].trim()&&value[k].length<=200)||
    value.condition==='vision-laser'&&(!Number.isFinite(value.halfRange)||value.halfRange<=0))return null;
  return Object.fromEntries(['version','id','name','attribute','modifier','condition','halfRange','outcome','source'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
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
  if(effect.condition==='none')return {};
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
export function resistanceOutcome(effect,native){
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
  const consequence=success?'Эффект лазера отражён; слепота от этого воздействия не наступает.':
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
    const token=selectedResistanceToken(runtime),actor=token.actor;
    resistanceAttribute(actor,effect.attribute);
    const choices=await (runtime.__olegurpsResistanceConditions??askConditions)(effect,runtime,actor);
    if(!choices)return null;
    boundActor(token,actor,runtime);
    const conditions=visionResistanceModifier(effect,choices);
    const loader=runtime.__olegurpsNativeResistanceLoader??(()=>import('/systems/gurps/module/dierolls/dieroll.js'));
    const {doRoll}=await loader();
    if(typeof doRoll!=='function')throw Error('Нативный механизм сопротивления GGA недоступен.');
    if(!readable(message))throw Error('Сообщение сопротивления больше недоступно.');
    boundActor(token,actor,runtime);
    const base=resistanceAttribute(actor,effect.attribute),G=runtime.GURPS;
    const thing='Сопротивление: '+effect.name+' ('+effect.attribute+')',previous=G.lastTargetedRoll;
    let matchedId=null,captured=null,resolveMessage;
    const created=new Promise(resolve=>{resolveMessage=resolve;});
    preHook=runtime.Hooks.on('preCreateChatMessage',nativeMessage=>{
      if(captured)return;
      const r=G.lastTargetedRoll,roll=nativeMessage.rolls?.[0];
      if(nativeMessage.speaker?.actor!==actor.id||(nativeMessage.author?.id??nativeMessage.user?.id)!==runtime.game.user.id||
        r===previous||r?.thing!==thing||r.fromUser!==runtime.game.user.id||r.actorid!==actor.id||r.rtotal!==roll?.total||r.origtarget!==base)return;
      boundActor(token,actor,runtime);
      const result=resistanceOutcome(effect,r),bucket=r.finaltarget-base-conditions.modifier;
      captured={...result,base,modifier:conditions.modifier,bucketModifier:bucket,finalTarget:r.finaltarget,total:r.rtotal,margin:r.margin};
      matchedId=nativeMessage.id;
      const details=`<details class="olegurps-chat-details"><summary>Условия сопротивления</summary><p>${escape(effect.name)}; ${escape(effect.attribute)} ${base}, поправка эффекта и условий ${conditions.modifier}, Modifier Bucket и GGA ${bucket}, итог ${r.finaltarget}.</p><p>3d6: ${r.rtotal}. ${escape(result.marginText)}.</p>${conditions.lines.map(line=>'<p>'+escape(line)+'</p>').join('')}<p>${escape(effect.source)}</p></details>`;
      nativeMessage.updateSource({content:nativeMessage.content+`<div class="olegurps-resistance-result"><strong>${escape(result.label)}</strong><p>${escape(result.consequence)}</p>${details}</div>`,
        whisper:[],blind:false,
        [`flags.${SCOPE}.resistanceResult`]:{version:1,effectId:effect.id,attribute:effect.attribute,base,modifier:conditions.modifier,
          bucketModifier:bucket,finalTarget:r.finaltarget,total:r.rtotal,margin:r.margin,success:result.success,
          criticalSuccess:result.criticalSuccess,criticalFailure:result.criticalFailure,source:effect.source}});
    });
    createHook=runtime.Hooks.on('createChatMessage',m=>{
      const r=m.flags?.[SCOPE]?.resistanceResult;
      if((m.author?.id??m.user?.id)!==runtime.game.user.id)return;
      if(m.id===matchedId||!matchedId&&captured&&m.speaker?.actor===actor.id&&r?.effectId===effect.id&&r.total===captured.total)resolveMessage(m);
    });
    const action=G.parselink(effect.attribute)?.action;
    if(action?.type!=='attribute')throw Error('GGA не распознал характеристику сопротивления.');
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
      optionalArgs:{action,obj:{consumeAction:false},event:{shiftKey:false,ctrlKey:false,altKey:false}}}),runtime,()=>boundActor(token,actor,runtime));
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
