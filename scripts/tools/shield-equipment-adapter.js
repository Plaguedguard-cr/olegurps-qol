// Read-only bridge from exact GCS/GGA equipment identities to the common melee pipeline.
import {LT_SHIELD_TOOL_PROFILES} from '../lt-shield-tool-source.js';
import {LT_IMPROVISED_PROFILES} from '../lt-improvised-source.js';
import {assertImprovisedEquipmentReference,readGgaImprovisedAttack} from './lt-improvised-equipment-adapter.js';
import {resolveStandaloneSkill,standaloneSkillDescription} from './standalone-skill-service.js';
const scope='olegurps-qol',text=v=>String(v??'').trim();
const oldProfileKey=a=>'attack:'+encodeURIComponent(a.key).replaceAll('.','%2E');
function equipmentRows(actor){
 const rows=[];const walk=(tree,path)=>{for(const [key,row]of Object.entries(tree??{})){if(!row||typeof row!=='object')continue;const current=path+'.'+key;rows.push({row,path:current});walk(row.contains,current+'.contains');walk(row.collapsed,current+'.collapsed');}};
 walk(actor?.system?.equipment?.carried,'system.equipment.carried');walk(actor?.system?.equipment?.other,'system.equipment.other');return rows;
}
const bases=()=>Object.values({...LT_SHIELD_TOOL_PROFILES,...LT_IMPROVISED_PROFILES}).filter(p=>p.shield&&!p.requiredFitting);
export function assertShieldEquipmentReference(actor,ref){
 if(ref?.kind==='lt-m26')return assertImprovisedEquipmentReference(actor,ref);
 const matches=equipmentRows(actor).filter(e=>text(e.row.uuid)===ref?.instanceId);
 if(matches.length!==1)throw Error('Физический щит удалён или его идентификатор неоднозначен.');
 if(!bases().some(p=>p.equipmentId===ref.equipmentId&&p.modeId===ref.modeId))throw Error('Источниковая связь щита не подтверждена.');
 return matches[0];
}
export function adaptGgaShieldAttacks(actor,attacks,{catalogs=globalThis.OleGURPSQOL?.catalogs}={}){
 if(!catalogs)return attacks;
 const rows=equipmentRows(actor),result=attacks.map(a=>{const hint=catalogs.getMode(a.uuid)?.lt_tool_manual??catalogs.getMode(a.uuid)?.ht_tool_manual;return hint?{...a,manualSourceHint:hint,...(catalogs.getMode(a.uuid)?.ht_work_only?{readinessReason:'Рабочая операция: обычный боевой профиль не опубликован. '+hint}:{})}:a;}),bindings=actor?.getFlag?.(scope,'meleeEquipmentBindings')??{},savedProfiles=actor?.getFlag?.(scope,'meleeProfiles')?.profiles??{};
 for(const e of rows){
  const instanceId=text(e.row.uuid);if(!instanceId||rows.filter(r=>text(r.row.uuid)===instanceId).length!==1)continue;
  const linked=attacks.filter(a=>text(a.data?.eqtkey).replace(/^system\./,'')===e.path.replace(/^system\./,'')||text(a.data?.parentuuid)===instanceId);
  // Exact catalog IDs, an existing GCS weapon ID, or an explicit owner mapping only. Never names.
  const exact=bases().filter(p=>p.equipmentId===instanceId||p.equipmentId===text(e.row.originaluuid)||p.equipmentId===bindings[instanceId]?.equipmentId||linked.some(a=>a.uuid===p.modeId||a.catalogBinding?.modeId===p.modeId||savedProfiles[oldProfileKey(a)]?.sourceModeId===p.modeId));
  if(exact.length!==1)continue;const p=exact[0];
  const matching=linked.filter(a=>a.uuid===p.modeId||/shield bash/i.test(a.mode));
  if(matching.length>1)continue;
  const equipmentRef={instanceId,equipmentId:p.equipmentId,modeId:p.modeId,virtual:matching.length===0,
   ...(matching.length?{nativeMode:matching[0].mode,legacyProfileKey:oldProfileKey(matching[0])}:{})};
  if(matching.length){const index=result.indexOf(matching[0]);result[index]={...matching[0],equipmentRef,catalogBinding:{modeId:p.modeId,equipmentId:p.equipmentId,source:'exact-gga-equipment'}};continue;}
  const mode=catalogs.getMode(p.modeId);if(!mode)continue;
  const skill=resolveStandaloneSkill({actor,record:{id:'equipment:'+instanceId},mode:{modeId:p.modeId,snapshot:mode,overrides:{}}});
  const uuid='olegurps:gga-equipment:'+instanceId,data={name:e.row.name||p.name,mode:p.usage,damage:p.stats.damage,reach:p.stats.reach,parry:'No',st:p.stats.st,level:skill.level,pageref:p.sourcePages[0]};
  result.push({uuid,key:'uuid:'+uuid,path:e.path,name:data.name,mode:data.mode,label:data.name+' – '+data.mode,level:skill.level,
   damage:data.damage,sourceDamage:data.damage,reach:data.reach,parry:'No',st:data.st,data,equipmentRef:{...equipmentRef,governingSkill:skill},
   catalogBinding:{modeId:p.modeId,equipmentId:p.equipmentId,source:'exact-gga-equipment'},skillDescription:standaloneSkillDescription(skill),readinessReason:skill.resolved?null:skill.reason});
 }
 return result;
}
export function readGgaShieldAttack(actor,attack){
 if(attack?.equipmentRef?.kind==='lt-m26')return readGgaImprovisedAttack(actor,attack);
 assertShieldEquipmentReference(actor,attack.equipmentRef);
 if(!attack.equipmentRef.virtual)return attack;
 return adaptGgaShieldAttacks(actor,[]).find(a=>a.equipmentRef?.instanceId===attack.equipmentRef.instanceId)??null;
}
