// Only this physical instance/configuration is frozen; remaining charges may
// legitimately change between prepared slots. No Actor.system writes.
import {moduleMessage} from '../localization.js';
import {getAttackOverrideKey} from './weapon-attack-overrides.js';
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function captureMeleeExecutionState(actor,attack) {
 const ref=attack?.standaloneRef,eq=attack?.equipmentRef;
 const key=eq?'equipment:'+encodeURIComponent(eq.instanceId):ref?'weapon:'+ref.weaponId:attack?.key?'attack:'+encodeURIComponent(attack.key).replaceAll('.','%2E'):null;
 const record=ref?actor?.getFlag?.('olegurps-qol','standaloneWeapons')?.weapons?.find(w=>w.id===ref.weaponId):null;
 const selection=actor?.getFlag?.('olegurps-qol','meleeProfiles')?.profiles?.[key]??null;
 const state=actor?.getFlag?.('world','olegurpsMeleeAssistant');
 const settings=state?.attacks?.['key:'+encodeURIComponent(getAttackOverrideKey(attack)??'').replaceAll('.','%2E')]??null;
 const path=String(attack?.path??'').replace(/^system\./,'').split('.').filter(Boolean);
 const native=!ref&&!eq&&path.length?path.reduce((v,k)=>v?.[k],actor?.system):null;
 const resourceKey=eq?key:ref?key:attack?.data?.parentuuid?'equipment:'+encodeURIComponent(attack.data.parentuuid):key;
 const resource=actor?.getFlag?.('olegurps-qol','utMeleeResources')?.[resourceKey];
 return canonical({record:record??null,selection,settings,native:native??null,
   resource:resource?{replacementId:resource.replacementId,capacity:resource.capacity,type:resource.type,nonRechargeable:resource.nonRechargeable}:null});
}
export function assertMeleeExecutionState(actor,attack,expected) {
 if(expected!=null&&captureMeleeExecutionState(actor,attack)!==expected)
  throw Error('\u041e\u0440\u0443\u0436\u0438\u0435 \u0438\u043b\u0438 \u0435\u0433\u043e \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u0438\u0441\u044c. \u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u044c\u0442\u0435 \u0430\u0442\u0430\u043a\u0443 \u0437\u0430\u043d\u043e\u0432\u043e.');
}
const reported=new WeakSet();
export function notifyMeleeExecutionError(error) {
 if(error&&typeof error==='object'){if(reported.has(error))return;reported.add(error);}
 globalThis.ui?.notifications?.error?.(moduleMessage(error));
}
