import { readArchivedJSON, archiveOutputPath } from './local-document-archive.mjs';
import fs from 'node:fs/promises';
import {catalogs} from '../tests/fixtures/ht-special-context.mjs';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';

// Actual definition/readiness path; synthetic exact learned skill isolates catalog fields.
// No GGA parser, browser, attack roll or player skill claim is made here.
const source=await readArchivedJSON('docs/olegurps-ht-511-source-audit.json');
const rows=[];
for(const row of source.direct_links.filter(r=>!process.argv[3]||r.weapon_mode_id===process.argv[3])) {
  const id=row.weapon_mode_id,m=catalogs.getMode(id),equipment=catalogs.getEquipmentForMode(id);
  const skill=m.governing_skill?.skill;
  const name=skill?.name+(skill?.name&&['Guns','Gunner','Artillery','Beam Weapons','Liquid Projector'].includes(skill.name)?'/TL'+equipment.tech_level:'')+
    (skill?.specialization?' ('+skill.specialization+')':'');
  const flags={};
  const actor={id:'audit',isOwner:true,system:{attributes:{DX:{value:12},IQ:{value:12}},skills:skill?{one:{name,level:16,points:1,type:'SKILL'}}:{}},
    getFlag:(s,k)=>flags[s]?.[k],setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};
  const before=JSON.stringify(actor.system),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(equipment.equipment_id);draft.modeIds=new Set([id]);
  const record=await new StandaloneWeaponService(actor,catalogs).save(draft);
  const attack=readStandaloneAttack(actor,record.id,id),carrier=standaloneAmmoCarrier(record);
  if(JSON.stringify(actor.system)!==before)throw Error('Actor.system changed');
  rows.push({ordinal:row.ordinal,modeId:id,name:equipment.name,status:attack.readinessReason?'BLOCKED':'FIELDS_READY',
    reason:attack.readinessReason,missingFields:['accuracy','recoil','bulk','rate_of_fire'].filter(f=>m.stats[f]==null),
    skillSource:attack.standaloneRef.governingSkill.source??null,emptyCapacity:carrier.ammunitionInventory?.magazines[0]?.capacity??null,
    statisticsCorrection:m.sourceStatisticsCorrection??null,defaultsCorrection:m.sourceDefaultsCorrection??null});
}
const out={scope:'Node standalone definition and field/skill readiness; synthetic learned skill; native GGA parsing and firing NOT_RUN',
  rows,summary:{total:rows.length,fieldsReady:rows.filter(r=>r.status==='FIELDS_READY').length,blocked:rows.filter(r=>r.status==='BLOCKED').length}};
await fs.writeFile(process.argv[2]??await archiveOutputPath('audit-ht-standalone-readiness.json'),JSON.stringify(out,null,2)+'\n','utf8');
console.log(JSON.stringify({summary:out.summary,blocked:rows.filter(r=>r.status==='BLOCKED').map(r=>({modeId:r.modeId,name:r.name,missing:r.missingFields,reason:r.reason}))}));
