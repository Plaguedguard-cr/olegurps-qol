import {calculateWeaponWeight,weightSettings} from './weapon-weight.js';
const scope='olegurps-qol',marker=Symbol.for('olegurps-qol.weapon-weight-adapter');
export function refreshWeaponWeightActors(){
 const actors=new Set(globalThis.game?.actors?.contents??[]);
 for(const token of globalThis.canvas?.tokens?.placeables??[])if(token.actor)actors.add(token.actor);
 for(const actor of actors)actor.prepareData();
 for(const app of globalThis.foundry?.applications?.instances?.values?.()??[])if(app.actor)app.render(false);
}
export function registerWeaponWeightSettings(){
 const settings=[['weaponWeightEnabled','Учитывать вес оружия и боеприпасов в GGA',false,'Добавляет выбранные части массы OleGURPS к штатной нагрузке персонажа.'],
 ['weaponWeightWeapon','Вес: оружие',true,'Само оружие и включённые в его источниковую массу компоненты.'],
 ['weaponWeightFeeds','Вес: магазины',true,'Пустые съёмные средства подачи.'],
 ['weaponWeightLoaded','Вес: заряженные патроны',true,'Фактические патроны в оружии и всех его магазинах.'],
 ['weaponWeightLoose','Вес: свободные патроны',true,'Свободные запасы и отдельные компоненты зарядов.']];
 for(const [key,name,initial,hint] of settings)game.settings.register(scope,key,{name,hint,scope:'world',config:true,type:Boolean,default:initial,onChange:refreshWeaponWeightActors});
 Hooks.on('renderSettingsConfig',(_app,html)=>{
  const root=html instanceof HTMLElement?html:html?.[0];if(!root)return;
  const main=root.querySelector('input[name="olegurps-qol.weaponWeightEnabled"]');
  const update=()=>{for(const [key] of settings.slice(1)){const input=root.querySelector(`input[name="${scope}.${key}"]`);if(input)input.disabled=!main?.checked;}};
  main?.addEventListener('change',update);update();
 });
}
export function installWeaponWeightAdapter(runtime=globalThis){
 const proto=runtime.CONFIG?.Actor?.documentClass?.prototype;
 if(runtime.game?.system?.id!=='gurps'||typeof proto?._calculateWeights!=='function')throw Error('GGA _calculateWeights недоступен.');
 if(proto[marker])return proto[marker];
 const original=proto._calculateWeights;
 function wrapped(...args){
  const active=runtime.game.modules?.get(scope)?.active!==false&&weightSettings().enabled;
  // GGA may share prepared rows with _source. Derived weight must never alter them.
  if(active&&this.system?.encumbrance)this.system.encumbrance=structuredClone(this.system.encumbrance);
  const result=original.apply(this,args);
  if(!active)return result;
  const subtotal=calculateWeaponWeight(this).knownLb,summary=this.system?.eqtsummary;
  if(summary&&Number.isFinite(summary.eqtlbs)&&Number.isFinite(subtotal)){
   summary.eqtlbs+=subtotal;
   if(runtime.game.settings.get('gurps','automatic-encumbrance')===true)this.checkEncumbance(summary.eqtlbs);
  }
  return result;
 }
 proto._calculateWeights=wrapped;
 const remove=()=>{if(proto._calculateWeights===wrapped)proto._calculateWeights=original;delete proto[marker];refreshWeaponWeightActors();};
 Object.defineProperty(proto,marker,{configurable:true,value:{remove,original,wrapped}});
 refreshWeaponWeightActors();return proto[marker];
}
