// GGA 0.18.23 addBucketToDamage moves ! ahead of (divisor), then _getDiceData loses the divisor.
// A per-call marker carries our already materialized formula through native DamageChat unchanged.
// Native permissions, confirmation, dice, modifiers, draggable payload and chat creation remain native.
const marker=Symbol('olegurpsNumericMeleeDamage'),installations=new WeakMap();
export function numericMeleeDamageEvent(event,action){
  const source=event??{shiftKey:false,ctrlKey:false,data:{}};
  return new Proxy(source,{get(object,key){
    if(key===marker)return {formula:action.formula};
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
    label[marker]={formula:numeric.formula,modifier:tagged?.autoAdd?Number(g.ModifierBucket?.currentSum?.()??0):0};
    return originalCreate.call(this,actor,numeric.formula,type,event,label,targets,ext,location);
  };
  const dice=function(formula,type,mods,override,ext){
    const numeric=override?.[marker];
    if(!numeric)return originalDice.call(this,formula,type,mods,override,ext);
    return originalDice.call(this,numeric.formula,type,
      numeric.modifier?[...(mods??[]),{modint:numeric.modifier,desc:''}]:mods,null,ext);
  };
  DamageChat.create=create;p._getDiceData=dice;
  const installed={uninstall(){if(DamageChat.create===create)DamageChat.create=originalCreate;
    if(p._getDiceData===dice)p._getDiceData=originalDice;installations.delete(g);}};
  installations.set(g,installed);return installed;
}
