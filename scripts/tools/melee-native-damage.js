import { applyMessageMode } from './chat-message-mode.js';

// GGA 0.18.23 addBucketToDamage moves ! ahead of (divisor), then _getDiceData loses the divisor.
// A per-call marker carries our already materialized formula through native DamageChat unchanged.
// Native permissions, confirmation, dice, modifiers, draggable payload and chat creation remain native.
const marker=Symbol('olegurpsNumericMeleeDamage'),installations=new WeakMap();
export function numericMeleeDamageEvent(event,action){
  const source=event??{shiftKey:false,ctrlKey:false,data:{}};
  const strike=action.olegurpsMeleeTechniques?.primaryStrike;
  return new Proxy(source,{get(object,key){
    if(key===marker)return {formula:action.formula,multiplier:strike?.damageMultiplier??1,knockbackOnly:strike?.procedure==='push'};
    const value=Reflect.get(object,key,object);return typeof value==='function'?value.bind(object):value;
  }});
}
export function installMeleeNativeDamage(runtime=globalThis){
  const g=runtime.GURPS,DamageChat=g?.DamageChat,p=DamageChat?.prototype;
  if(!p||typeof DamageChat.create!=='function'||typeof p._getDiceData!=='function')return null;
  if(installations.has(g))return installations.get(g);
  const originalCreate=DamageChat.create,originalDice=p._getDiceData;
  const create=function(actor,dice,type,event,override,targets,ext,location){
    const numeric=event?.[marker];
    if(!numeric)return originalCreate.call(this,actor,dice,type,event,override,targets,ext,location);
    const tagged=runtime.game?.settings?.get?.('gurps','use-tagged-modifiers');
    const label=new String(numeric.formula);
    label[marker]={...numeric,modifier:tagged?.autoAdd?Number(g.ModifierBucket?.currentSum?.()??0):0};
    return originalCreate.call(this,actor,numeric.formula,type,event,label,targets,ext,location);
  };
  const dice=function(formula,type,mods,override,ext){
    const numeric=override?.[marker];
    if(!numeric)return originalDice.call(this,formula,type,mods,override,ext);
    const result=originalDice.call(this,numeric.formula,type,
      numeric.modifier?[...(mods??[]),{modint:numeric.modifier,desc:''}]:mods,null,ext);
    if(numeric.knockbackOnly&&result){result.multiplier*=numeric.multiplier;result.min=0;}
    return result;
  };
  DamageChat.create=create;p._getDiceData=dice;
  const installed={uninstall(){if(DamageChat.create===create)DamageChat.create=originalCreate;
    if(p._getDiceData===dice)p._getDiceData=originalDice;installations.delete(g);}};
  installations.set(g,installed);return installed;
}

export function basicDamageOnly(action){
 return action?.olegurpsKnockbackOnly===true||
  action?.olegurpsMeleeTechniques?.strikes?.some(s=>['eyePoke','eyePluck','eyeRake'].includes(s.procedure))===true;
}

export async function rollBasicDamage(actor,action,title='Базовый Damage техники',link=null){
 if(!actor?.isOwner&&!globalThis.game?.user?.isGM)throw Error('Нужны права владельца атакующего.');
 const match=/^(\d+)d(?:6)?([+-]\d+)?(?:!?\([-\d.]+\))?(!?)$/.exec(action.formula);
 if(!match)throw Error('Не удалось прочитать формулу базового Damage.');
 // These rules use the rolled value as input to an effect, not a draggable injury.
 const roll=await globalThis.Roll.create(match[1]+'d6'+(match[2]??'')).evaluate();
 const total=Math.max(match[3]?1:0,Number(roll.total));
 const knockback=action.olegurpsKnockbackOnly;
 const knockbackText=/^ru\b/i.test(globalThis.game?.i18n?.lang??'en')?
   'Только отбрасывание (MA112, B378): '+total+' × 2 = '+2*total+'.':
   'Knockback only (MA112, B378): '+total+' × 2 = '+2*total+'.';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return globalThis.ChatMessage.create(applyMessageMode(globalThis.ChatMessage,{
  speaker:globalThis.ChatMessage.getSpeaker({actor}),rolls:[roll],
  content:knockback?'<p><strong>'+escape(knockbackText)+'</strong></p>':
    '<p><strong>'+escape(title)+'</strong></p><p>'+escape(action.formula)+' = '+total+'. Используйте это значение в правилах эффекта.</p>',
  ...(link?{flags:{'olegurps-qol':{meleeStrikeDamageSource:link}}}:{})
 },globalThis.game));
}
