// Read-only M2.6 bridge: an exact physical UUID plus a reviewed catalog/GCS ID or explicit binding.
import {LT_IMPROVISED_PROFILES} from '../lt-improvised-source.js';
import {HT_ORDINARY_PROFILES} from '../ht-ordinary-melee-source.js';
import {UT_ORDINARY_PROFILES} from '../ut-ordinary-melee-source.js';
import {HT_SPECIAL_PROFILES} from '../ht-special-melee-source.js';
import {resolveStandaloneSkill,standaloneSkillDescription} from './standalone-skill-service.js';
const scope='olegurps-qol',text=v=>String(v??'').trim();
const sources=()=>Object.values({...LT_IMPROVISED_PROFILES,...HT_ORDINARY_PROFILES,...HT_SPECIAL_PROFILES,...UT_ORDINARY_PROFILES}).filter(p=>!p.shield);
function rows(actor){const out=[];const walk=(t,path)=>{for(const [k,row]of Object.entries(t??{}))if(row&&typeof row==='object'){const p=path+'.'+k;out.push({row,path:p});walk(row.contains,p+'.contains');walk(row.collapsed,p+'.collapsed');}};walk(actor?.system?.equipment?.carried,'system.equipment.carried');walk(actor?.system?.equipment?.other,'system.equipment.other');return out;}
export function assertImprovisedEquipmentReference(actor,ref){
 const found=rows(actor).filter(e=>text(e.row.uuid)===ref.instanceId);
 if(found.length!==1)throw Error('Физический предмет удалён или его идентификатор неоднозначен.');
 if(!sources().some(p=>p.equipmentId===ref.equipmentId&&p.modeId===ref.modeId))throw Error('Источниковая связь физического предмета не подтверждена.');
 const e=found[0],binding=actor?.getFlag?.(scope,'meleeEquipmentBindings')?.[ref.instanceId];
 const p=sources().find(p=>p.equipmentId===ref.equipmentId);
 if(![e.row.uuid,e.row.originaluuid,binding?.equipmentId].some(id=>id===p.equipmentId||p.gcsEquipmentIds?.includes(id)))throw Error('Источниковая связь физического предмета изменилась.');
 return e;
}
export function adaptGgaImprovisedAttacks(actor,attacks,{catalogs=globalThis.OleGURPSQOL?.catalogs}={}){
 if(!catalogs)return attacks;
 const equipment=rows(actor),result=[...attacks],bindings=actor?.getFlag?.(scope,'meleeEquipmentBindings')??{};
 for(const e of equipment){const instanceId=text(e.row.uuid);if(!instanceId||equipment.filter(q=>text(q.row.uuid)===instanceId).length!==1)continue;
  const identities=[instanceId,text(e.row.originaluuid),bindings[instanceId]?.equipmentId];
  const exact=sources().filter(p=>identities.some(id=>id===p.equipmentId||p.gcsEquipmentIds?.includes(id)));
  if(new Set(exact.map(p=>p.equipmentId)).size!==1)continue;
  const linked=attacks.filter(a=>a.data?.parentuuid===instanceId||text(a.data?.eqtkey).replace(/^system\./,'')===e.path.replace(/^system\./,''));
  const matching=linked.filter(a=>exact.some(p=>p.modeId===a.uuid||p.modeId===a.catalogBinding?.modeId||p.gcsModeIds?.includes(a.uuid)));
  if(matching.length){for(const a of matching){const p=exact.find(p=>p.modeId===(a.catalogBinding?.modeId??a.uuid)||p.gcsModeIds?.includes(a.uuid));const ref={kind:'lt-m26',instanceId,equipmentId:p.equipmentId,modeId:p.modeId,virtual:false,nativeMode:a.mode,legacyProfileKey:'attack:'+encodeURIComponent(a.key).replaceAll('.','%2E')};result[result.indexOf(a)]={...a,equipmentRef:ref,catalogBinding:{modeId:p.modeId,equipmentId:p.equipmentId,source:'exact-gga-equipment'}};}continue;}
  // A custom native attack is not silently rebound by name or formula.
  if(linked.length)continue;
  const p=exact[0],m=catalogs.getMode(p.modeId);if(!m)continue;
  const skill=resolveStandaloneSkill({actor,record:{id:'equipment:'+instanceId,equipmentSnapshot:catalogs.getEquipment(p.equipmentId)},mode:{modeId:p.modeId,snapshot:m,overrides:{}}});
  const uuid='olegurps:gga-equipment:'+instanceId,data={name:e.row.name||p.name,mode:p.usage,damage:p.stats.damage,reach:p.stats.reach,parry:p.stats.parry,st:p.stats.st,level:skill.level,pageref:p.sourcePages[0]};
  result.push({uuid,key:'uuid:'+uuid,path:e.path,name:data.name,mode:data.mode,label:data.name+' – '+data.mode,level:skill.level,damage:data.damage,sourceDamage:data.damage,reach:data.reach,parry:data.parry,st:data.st,data,
   equipmentRef:{kind:'lt-m26',instanceId,equipmentId:p.equipmentId,modeId:p.modeId,virtual:true,governingSkill:skill},catalogBinding:{modeId:p.modeId,equipmentId:p.equipmentId,source:'exact-gga-equipment'},skillDescription:standaloneSkillDescription(skill),readinessReason:skill.resolved?null:skill.reason});
 }
 return result;
}
export function readGgaImprovisedAttack(actor,attack){assertImprovisedEquipmentReference(actor,attack.equipmentRef);return attack.equipmentRef.virtual?adaptGgaImprovisedAttacks(actor,[]).find(a=>a.equipmentRef?.instanceId===attack.equipmentRef.instanceId)??null:attack;}
