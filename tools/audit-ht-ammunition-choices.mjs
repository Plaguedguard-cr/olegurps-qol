import { readArchivedJSON, archiveOutputPath } from './local-document-archive.mjs';
import fs from 'node:fs/promises';
import {catalogs,compatibility,api} from '../tests/fixtures/ht-special-context.mjs';
import {ammunitionCandidates,availableAmmoTypes} from '../scripts/tools/ammo-management-app.js';
import {ammunitionChoiceGroup} from '../scripts/tools/ammunition-choices.js';
import {alternateLoadNeedsBallistics} from '../scripts/ht-published-loads.js';
import {HT_REVIEWED_LOADS} from '../scripts/ht-source-corrections.js';

const earlier=await readArchivedJSON('docs/audit/ht-final-511-runtime-audit.json');
const substitutions=earlier.additionalUIChoices.map(row=>{
 const c=compatibility.checkCompatibility(row.modeId,row.ammoId,{book:'ht',kind:row.kind});
 const missing=alternateLoadNeedsBallistics(catalogs,row.modeId,row.ammoId,c);
 return {...row,physicalStatus:c.status,source:'HT178',relation:c.relation,
  decision:c.status!=='compatible'?'PHYSICAL_CONFIRMATION_REQUIRED':missing?'MANUAL_BALLISTICS_REQUIRED':'SOURCE_PROFILE_OR_INTERCHANGEABLE',
  inputFields:missing?['Damage','Range']:[],manualCycling:c.capabilities?.feedingAndCycling==='not-confirmed',
  evidenceScope:'Directed source query; numerical user inputs never declared book-verified',
  addressedPreviouslyBlocked:missing};
});
const representatives=[['HT rifle','W27s4Lm8QlkKVKUPn'],['HT pistol','W1doZcasYO-1Xw3Lf'],
 ['HT match rifle','Wxm8TWSvu5UFTAaDn'],['HT shotgun','WT-PUA77JBHLiLTPo'],
 ['HT mortar','W9aaejQdnPrtlwB0n'],['HT guided missile','WLtxCaJ16zBNXOM6B'],
 ['HT rocket variants','WjD-b9M0j2HJAcxyy'],['HT flintlock pistol','WOAL2ladqiRbTuvRU']];
for(const book of ['lt','ut']){
 const e=catalogs.getCatalog('weapons').equipment.find(e=>e.source===book.toUpperCase()&&e.modes.some(m=>m.role==='attack'&&m.combat_type==='ranged'&&!m.hidden&&(catalogs.getModeLinks(m.weapon_mode_id)?.ammoItemIds.length||catalogs.getModeLinks(m.weapon_mode_id)?.ammoFamilyIds.length)));
 if(e)representatives.push([book.toUpperCase()+' shared selection',e.modes.find(m=>m.role==='attack'&&m.combat_type==='ranged'&&!m.hidden).weapon_mode_id]);
}
const choices=representatives.map(([family,modeId])=>{
 const m=catalogs.getMode(modeId),e=catalogs.getEquipmentForMode(modeId),raw={damage:m.raw_calc.damage,rof:m.stats.rate_of_fire,rcl:m.stats.recoil,acc:m.stats.accuracy,range:m.stats.range,st:m.stats.strength};
 const weapon={id:'audit-weapon',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
 const actor={id:'audit-only',binding:{status:'confirmed',binding:{confirmed:true,modeId}},system:{ranged:{mode:raw}},getFlag:()=>({weapons:[weapon]})};
 const candidates=ammunitionCandidates(actor,weapon,api),visible=availableAmmoTypes(actor,weapon,api);
 return {family,modeId,name:e.name,scope:'Representative shared pipeline; not the full 511/64/1347 matrix',
  available:visible.filter(t=>ammunitionChoiceGroup(t)==='available').length,
  conditional:visible.filter(t=>ammunitionChoiceGroup(t)==='conditional').length,
  hidden:candidates.filter(t=>ammunitionChoiceGroup(t)==='hidden').length,
  rows:candidates.map(t=>({ammoId:t.ammoId,variant:t.recipe?.variantId??null,group:ammunitionChoiceGroup(t),
   substitution:!!t.substitution,admitted:!t.unavailable,reason:t.reason??null}))};
});
const reviewed=Object.entries(HT_REVIEWED_LOADS).map(([modeId,e])=>({modeId,name:catalogs.getEquipmentForMode(modeId).name,
 ammoId:e.ammoId,historicalAmmoId:e.original,source:e.source,decision:'CONFIRMED_EFFECTIVE_IDENTITY',
 physicalStatus:compatibility.checkCompatibility(modeId,e.ammoId,{book:'ht',kind:'ammo-item'}).status}));
reviewed.push({modeId:'Wlk1hvahF3JF9aBB8',name:catalogs.getEquipmentForMode('Wlk1hvahF3JF9aBB8').name,
 ammoId:'ht_5_56x45mm_nato',source:'HT119/121',decision:'CONFIRMED_M4A1_SOPMOD_VARIANT'});
reviewed.push({modeId:'WwlfY-FYthqkLvByK',name:catalogs.getEquipmentForMode('WwlfY-FYthqkLvByK').name,
 ammoId:null,source:'HT92',decision:'NEW_ADDITION_BLOCKED',reason:'Printed .22 does not uniquely establish .22 LR',acc:'0'});
reviewed.push({modeId:'WjD-b9M0j2HJAcxyy',ammoId:'ht_specific_hydra_laser_guided_70mm',source:'HT150',
 decision:'CONFIRMED_GUIDANCE_PACKAGE_WITH_HE',warheadAmmoId:'ht_specific_hydra_mk66_he',manualGuidance:true});
const result={schema:1,date:'2026-10-13',scope:'Only requested prior substitutions, seven source cases and representative selection branches; no full matrix',
 substitutions,substitutionSummary:{previousAdditionalChoices:substitutions.length,previouslyBlocked:substitutions.filter(r=>r.addressedPreviouslyBlocked).length,
   automatic:substitutions.filter(r=>r.decision==='SOURCE_PROFILE_OR_INTERCHANGEABLE').length,
   manualCyclingAmongPreviouslyBlocked:substitutions.filter(r=>r.addressedPreviouslyBlocked&&r.manualCycling).length},
 choices,reviewed,missingCartridges:{confirmedRequiredAbsent:[],unresolvedIdentity:[{weapon:'Zip-Gun',source:'HT92',publishedDesignation:'.22',
  reason:'No unique identity; do not invent a cartridge or reinterpret existing .22 LR'}]},
 historicalData:{automaticMigration:false,deletion:false,inferenceByNameOrCaliber:false}};
await fs.writeFile(process.argv[2]??await archiveOutputPath('ht-final-ammunition-choices-audit.json'),JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify({substitutions:result.substitutionSummary,representatives:choices.length,reviewed:reviewed.length}));
