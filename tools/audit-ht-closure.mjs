import { readArchivedJSON, archiveOutputPath } from './local-document-archive.mjs';
import fs from 'node:fs/promises';
import {catalogs,compatibility} from '../tests/fixtures/ht-special-context.mjs';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {alternateLoadNeedsBallistics} from '../scripts/ht-published-loads.js';

// Only the 24 outstanding links and previously identified 101 additional UI choices.
// This neither reruns the 511 source audit nor rolls native GGA dice.
const earlier=await readArchivedJSON('docs/audit/ht-final-511-runtime-audit.json');
const rows=[];
for(const row of earlier.rows.filter(r=>r.standaloneReadiness?.status==='BLOCKED')){
 const id=row.modeId,m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id),skill=m.governing_skill.skill;
 const name=skill.name+(['Guns','Gunner','Artillery'].includes(skill.name)?'/TL'+e.tech_level:'')+(skill.specialization?' ('+skill.specialization+')':'');
 const flags={},actor={id:'audit',isOwner:true,system:{attributes:{DX:{value:12},IQ:{value:12}},skills:{one:{name,level:16,points:1}}},
   getFlag:(s,k)=>flags[s]?.[k],setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(e.equipment_id);draft.modeIds=new Set([id]);
 const overrides=id==='WGZlqJxbZOxd6FR4h'?{installation:'stock'}:['W9ki0p3eZ0dV761l1','WBg7hpnW95SX83X-c','WJQk1KpyOURTwDD-N','WHlBefAVM5F3s_Fhx','WV56lTDugarCzOy27'].includes(id)?{hostBulk:'-5'}:{};
 for(const [key,value]of Object.entries(overrides))draft.setOverride(id,key,value);
 const before=JSON.stringify(actor.system),record=await new StandaloneWeaponService(actor,catalogs).save(draft),attack=readStandaloneAttack(actor,record.id,id);
 if(JSON.stringify(actor.system)!==before)throw Error('Actor.system changed');
 rows.push({ordinal:row.ordinal,modeId:id,name:e.name,ammoId:row.effectiveAmmoId,source:e.reference,
  configuration:overrides,readiness:attack.readinessReason?'RESTRICTED':'READY_WITH_RECORDED_CONDITIONS',reason:attack.readinessReason,
  fields:{acc:attack.acc,bulk:attack.bulk,rcl:attack.rcl},platform:attack.platformRules??null,
  minimumMaximum:attack.ammunitionRange??null,scope:'Node definition/readiness only; synthetic exact learned skill; native GGA NOT_RUN'});
}
const substitutions=earlier.additionalUIChoices.map(r=>{
 const result=compatibility.checkCompatibility(r.modeId,r.ammoId,{book:'ht',kind:r.kind});
 return {modeId:r.modeId,ammoId:r.ammoId,kind:r.kind,variant:r.variant,physicalCompatibility:result.status,
  relation:result.relation?.type??null,automaticBallistics:alternateLoadNeedsBallistics(catalogs,r.modeId,r.ammoId,result)?'UNRESOLVED_AUTOMATIC_FIRE_BLOCKED':'UNCHANGED_OR_PUBLISHED',
  manualCycling:result.capabilities?.feedingAndCycling==='not-confirmed'};
});
const out={rows,summary:{links:rows.length,uniqueModes:new Set(rows.map(r=>r.modeId)).size,
 readyLinks:rows.filter(r=>!r.reason).length,restrictedLinks:rows.filter(r=>r.reason).length},
 substitutions,substitutionSummary:{checked:substitutions.length,blockedBallistics:substitutions.filter(r=>r.automaticBallistics==='UNRESOLVED_AUTOMATIC_FIRE_BLOCKED').length,
  note:'Compatibility and previously known additional UI choices only; no full 511/64/1347 matrix.'}};
await fs.writeFile(process.argv[2]??await archiveOutputPath('audit-ht-closure.json'),JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify({platforms:out.summary,substitutions:out.substitutionSummary}));
