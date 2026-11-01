import {utExoticSource} from '../ut-exotic-melee-source.js';
import {newWeaponBattery,readWeaponBattery,sameBattery} from './weapon-power.js';
// Shared AmmoService Actor queue owns every mutation; this module is pure reads/plans.
export const UT_MELEE_RESOURCE_FLAG='utMeleeResources';
export const utMeleeKey=attack=>attack?.equipmentRef?'equipment:'+encodeURIComponent(attack.equipmentRef.instanceId):attack?.standaloneRef?'weapon:'+attack.standaloneRef.weaponId:attack?.key?'attack:'+encodeURIComponent(attack.key).replaceAll('.','%2E'):null;
function physicalKey(actor,attack,p,selection){
 if(attack.standaloneRef||attack.equipmentRef)return {key:utMeleeKey(attack)};
 const rows=[];const walk=(tree,path)=>{for(const [id,row]of Object.entries(tree??{})){if(!row||typeof row!=='object')continue;const at=path+'.'+id;rows.push({row,path:at});walk(row.contains,at+'.contains');walk(row.collapsed,at+'.collapsed');}};walk(actor?.system?.equipment?.carried,'equipment.carried');walk(actor?.system?.equipment?.other,'equipment.other');
 const path=String(attack.data?.eqtkey??'').replace(/^system\./,''),parent=attack.data?.parentuuid;
 const matches=rows.filter(e=>parent&&e.row.uuid===parent||path&&e.path===path),unique=[...new Set(matches.map(e=>e.row))];
 const row=unique.length===1?unique[0]:null,exact=[attack.uuid,attack.catalogBinding?.modeId,selection.sourceModeId].some(id=>utExoticSource(id)?.equipmentId===p.equipmentId);
 if(!row?.uuid||rows.filter(e=>e.row.uuid===row.uuid).length!==1||row.originaluuid&&row.originaluuid!==p.equipmentId||!exact&&row.originaluuid!==p.equipmentId)return {key:utMeleeKey(attack),bindingError:'Для питания нужна точная связь атаки с физическим экземпляром GCS/GGA (UUID), без подбора по имени.'};
 return {key:'equipment:'+encodeURIComponent(row.uuid)};
}
export function utMeleeResourceContext(actor,attack,modeId=null){
 const profileKey=utMeleeKey(attack),selection=actor?.getFlag?.('olegurps-qol','meleeProfiles')?.profiles?.[profileKey]??{};
 const p=utExoticSource(modeId??attack?.meleeProfile?.modeId??selection.modeId??attack?.standaloneRef?.modeId??attack?.catalogBinding?.modeId);
 if(!profileKey||!p)return null;
 if(attack?.standaloneRef){const record=actor.getFlag('olegurps-qol','standaloneWeapons')?.weapons?.find(w=>w.id===attack.standaloneRef.weaponId);if(!record||record.source.equipmentId!==p.equipmentId)throw Error('Экземпляр оружия изменён или удалён.');}
 const resource=p.power??p.resource;if(!resource)return null;
 const {key,bindingError}=physicalKey(actor,attack,p,selection);
 const saved=actor?.getFlag?.('olegurps-qol',UT_MELEE_RESOURCE_FLAG)?.[key]??null;
 const tl=selection.weaponTL??Number.parseInt(p.techLevel),multiplier=p.resource?.tlDuration?({10:1.5,11:2,12:3}[tl]??1):1;
 const profile={...resource,capacity:resource.capacity*multiplier};
 const value=p.power?readWeaponBattery({utMeleeBattery:saved},profile):saved?.capacity===profile.capacity&&Number.isSafeInteger(saved.remaining)&&saved.remaining>=0&&saved.remaining<=profile.capacity?saved:null;
 return {key,p,selection,profile,saved,value,bindingError,remaining:p.power?value?.charge:value?.remaining,cost:p.power?profile.chargePerPhysicalShot:profile.cost??1};
}
export function utMeleeResourceReason(actor,attack,modeId=null){
 const c=utMeleeResourceContext(actor,attack,modeId);if(!c)return null;
 if(c.bindingError)return c.bindingError;
 if(c.saved?.pending&&!c.saved.receipts?.includes(c.saved.pending))return 'Предыдущее действие требует проверки: расход зарезервирован, результат не подтверждён.';
 if(!c.value)return 'Установите ресурс экземпляра в редакторе оружия.';
 if(c.remaining<c.cost)return 'Ресурс экземпляра исчерпан.';
 if(c.p.payload&&!c.saved.payload)return 'Установите одну настоящую дозу в редакторе экземпляра.';
 return null;
}
export function utMeleeResourceLabel(actor,attack){
 const c=utMeleeResourceContext(actor,attack);if(!c)return null;
 const unit=c.profile.unit,capacity=c.value?.capacity??c.profile.capacity,remaining=c.value&&!c.bindingError?c.remaining:'–';
 return (unit==='зарядов'?'Заряды ':'Ресурс ')+remaining+'/'+capacity+(unit&&unit!=='зарядов'?' '+unit:'');
}
export function newUTMeleeResource(c,nonRechargeable=false){
 return c.p.power?newWeaponBattery(c.profile,nonRechargeable):{capacity:c.profile.capacity,remaining:c.profile.capacity};
}
export function utMeleeResourcePlan(c,amount=1){
 if(!Number.isSafeInteger(amount)||amount<1)throw Error('Некорректный расход ресурса.');
 const spent=c.cost*amount;if(!c.value||c.remaining<spent||c.saved.pending&&!c.saved.receipts?.includes(c.saved.pending))throw Error('Недостаточно ресурса экземпляра.');
 const after=structuredClone(c.saved);if(c.p.power)after.charge-=spent;else after.remaining-=spent;
 if(c.p.payload)after.payload=null;
 return {after,evidence:{modelId:c.p.modelId,equipmentId:c.p.equipmentId,modeId:c.p.modeId,key:c.key,capacity:c.value.capacity,before:c.remaining,after:c.remaining-spent,spent,unit:c.profile.unit,source:c.profile.source??c.p.sourcePages.join('; '),replacementId:c.saved.replacementId,payload:c.saved.payload??null}};
}
export const utMeleeSameResource=sameBattery;
