// Reproducible compact reconciliation. Historical audits and catalogs are read only.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {CatalogService} from '../scripts/catalog-service.js';
import {meleeSource} from '../scripts/melee-source-data.js';
import {ltMeleeQualityProfile} from '../scripts/lt-melee-quality-data.js';
import {LT_IMPROVISED_PROFILES as delta,LT_IMPROVISED_EQUIPMENT,LT_IMPROVISED_MANUAL} from '../scripts/lt-improvised-source.js';
export const previousAudits=[
 ['M2.1','docs/reports/2026-10-27_19-12-08_melee-m2-1-lt-blades/audit.json'],
 ['M2.2','docs/reports/2026-10-27_23-11-35_melee-m2-2-lt-impact/audit.json'],
 ['M2.3','docs/reports/2026-10-28_21-12-23_melee-m2-3-lt-polearms/audit.json'],
 ['M2.4','docs/reports/2026-10-28_21-39-38_M2.4_LT-flexible-exotic/2026-10-28_21-39-38_M2.4_LT-flexible-exotic_audit.json'],
 ['M2.5','docs/reports/2026-10-29_18-12-45_M2.5_LT-shields-tools/2026-10-29_18-12-45_M2.5_LT-shields-tools_audit.json']
];
export async function loadLTInputs(){
 const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
 const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:()=>read('data/catalogs/'+u.split('/').at(-1))})});await catalogs.load();
 const inputs=await read('tests/fixtures/melee-reconciliation-inputs.json');
 const historical=inputs.historical,prior=inputs.ltPrior;
 return {catalogs,historical,prior};
}
const manual={
 'lt:bootlaces':['M2.6','LT63: только процедура удушения; обычный числовой Damage отсутствует.'],
 'lt:garrote':['M2.4','LT66; B405: удушение – специальная процедура, не обычный Attack.'],
 'lt:kakute':['M2.4','LT57/67: удержания и освобождение; обычная числовая атака не опубликована.'],
 'lt:net':['M2.4','LT59; B411: Melee Net опутывает; Large Net – ranged. Числовой ordinary melee Damage отсутствует.'],
 'lt:mycenaean-shield':['M2.5','LT113–114: guige-only исполнение не выполняет Shield Bash/Rush; исходная запись GGA сохранена.'],
 'lt:metalworking-chisel':['M2.5','LT28: рабочая операция не устанавливает отдельную обычную боевую атаку с навыком.'],
 'lt:smithing-pliers':['M2.5','LT30: рабочая операция не устанавливает отдельную обычную боевую атаку с навыком.']
};
const unresolved={
 'lt:smithing-hammer':'LT30 описывает рабочий инструмент; одна сохранённая GCS combat-экстраполяция не подтверждена как обычная атака.',
 'lt:smithing-shears':'LT30: thr+1(2) cut относится к резанию размягчённого металла. Одна GCS combat-экстраполяция не подтверждена.',
 'lt:smithing-tongs':'LT30: рабочий инструмент; два сохранённых GCS combat-режима не подтверждены как обычные атаки.'
};
const alias={
 'lt:ahlspiess':['M2.3','eyvtiiimEqgyXYWaU','LT54 прямо отсылает к Spear; исключение метания и DR6 при поломке остаются ручными. Новая физическая модель не создаётся.'],
 'lt:iklwa':['M2.3','ecKNdB9BdSK-c_FDO','LT57 прямо отсылает к Short Spear, включая его опубликованный Tip Slash; throwing исключён.'],
 'lt:partisan':['M2.3','eyvtiiimEqgyXYWaU','LT60 прямо отсылает к Spear; ears и запрет продвижения по древку – вручную, throwing исключён.']
};
export function buildLTMatrix({catalogs,historical,prior}){
 const equipment=catalogs.getCatalog('weapons').equipment,all=equipment.flatMap(e=>e.modes.map(m=>({e,m}))),source=new Map(all.map(({e,m})=>[m.weapon_mode_id,ltMeleeQualityProfile(m.weapon_mode_id,catalogs,meleeSource(m.weapon_mode_id))]));
 const priorModels=new Map(),questions=new Map();
 for(const {stage,path,data}of prior){for(const p of data.models??[]){const id=p.modelId;if(!priorModels.has(id))priorModels.set(id,[]);priorModels.get(id).push({stage,path,model:p});}
  for(const q of data.residual??[])if(q.modelId){if(!questions.has(q.modelId))questions.set(q.modelId,[]);questions.get(q.modelId).push({reason:q.reason,sourcePages:q.sourcePages,evidence:path});}
 }
 const isOrdinary=({m})=>m.combat_type==='melee'&&m.role==='attack'&&/^(sw|thr)(?:[+-]\d+)?(?:\([\d.]+\))?\s+(?:cr|cut|imp)$/.test(m.raw_calc?.damage??'')&&!source.get(m.weapon_mode_id)?.manualOnly;
 const rows=historical.models.filter(m=>m.book==='LT').map(model=>{
  const priorRows=priorModels.get(model.id)??[],eids=new Set(model.equipmentIds),stages=new Set(priorRows.map(r=>r.stage));
  for(const r of priorRows){if(r.model.equipmentId)eids.add(r.model.equipmentId);for(const id of r.model.equipmentIds??[])eids.add(id);}
  for(const p of Object.values(delta).filter(p=>p.modelId===model.id))eids.add(p.equipmentId);
  if(alias[model.id]){eids.add(alias[model.id][1]);stages.add(alias[model.id][0]);}
  const numeric=manual[model.id]||unresolved[model.id]?[]:all.filter(({e})=>eids.has(e.equipment_id)).filter(isOrdinary).filter(({m})=>!['lt:bayonet','lt:musket-or-rifle','lt:pistol'].includes(model.id)||source.get(m.weapon_mode_id)?.modelId===model.id);
  const ordinary=numeric.filter(({m})=>source.get(m.weapon_mode_id)?.primarySkills.length),missing=numeric.filter(({m})=>!source.get(m.weapon_mode_id)?.primarySkills.length).map(({m})=>m.weapon_mode_id);
  const changes=Object.values(delta).filter(p=>p.modelId===model.id);if(changes.length||manual[model.id]?.[0]==='M2.6')stages.add('M2.6');
  let status=manual[model.id]?'MANUAL_ONLY':unresolved[model.id]?'SOURCE_UNDETERMINED':changes.some(p=>!model.catalogModeIds.includes(p.modeId))?'ADDED':changes.some(p=>['lt:crowbar-large','lt:spike-shuriken','lt:star-shuriken','lt:roman-scutum-large','lt:roman-scutum-medium'].includes(p.modelId))?'REPAIRED':'COMPLETE_EXISTING';
  if(!stages.size)stages.add(ordinary.length?'M0/M1 – подтверждено при M2.6':'M2.6');
  const remaining=(questions.get(model.id)??[]).map(q=>q.reason);
  if(LT_IMPROVISED_MANUAL[model.id])remaining.push(LT_IMPROVISED_MANUAL[model.id]);
  if(model.id==='lt:musket-or-rifle')remaining.push('Индивидуальные melee ST/Reach не опубликованы. Даны только числовые host-атаки по точным LT4 equipmentId; ranged поля сохранены.');
  if(model.id==='lt:pistol')remaining.push('Семь нестандартных pistol/handgun записей сохраняют неопределённость категории; она не назначается по Bulk. Дополнительно: LT92 позволяет стрелять из Flintlock Carbine со сложенным прикладом как из handgun, но не подтверждает отдельное melee-применение как smaller-pistol fist load. Оно не назначается по одному Bulk/Guns. Подтверждённые large/small ветви реализованы.');
  if(model.id==='lt:bayonet')remaining.push('Mounted Thrust/Tip Slash – только для уже установленного индивидуально подогнанного штыка. Совместимость, Ready, plug/socket и индивидуальные ST/Reach/Parry – вручную или не опубликованы.');
  if(['lt:pilum','lt:angon'].includes(model.id))remaining.push('M2.3: применение погнутого Pilum/Angon как Staff разрешено описанием, но точные Staff ST/Reach/Parry не опубликованы; отдельный числовой профиль не выдуман.');
  if(model.id==='lt:tepoztopilli')remaining.push('M2.3: сочетание качества, материалов и цены смешанной головки не подтверждено; износ остаётся ручным.');
  if(ordinary.some(({m})=>source.get(m.weapon_mode_id)?.shield))remaining.push('M2.5: LT68 не задаёт универсальные цену/массу длинного шипа или кромки; качество установленной части не умножает цену/массу всего щита. Частные B287/LT114 сохраняются.');
  const reason=manual[model.id]?.[1]??unresolved[model.id]??alias[model.id]?.[2]??null;
  if(!ordinary.length&&!manual[model.id]&&!unresolved[model.id])missing.push(model.id+':no-confirmed-numeric-profile');
  return {modelId:model.id,sourceName:model.sourceName,scope:model.scope,sourcePages:[...new Set([...model.sourcePages,...ordinary.flatMap(({m})=>source.get(m.weapon_mode_id).sourcePages??[])])],status,implementationStage:[...stages].sort().join(' + '),ordinarySourceModeIds:[...new Set(ordinary.map(({m})=>m.weapon_mode_id))],equipmentIds:[...eids].filter(id=>catalogs.getEquipment(id)),allPublishedOrdinaryAttacksChecked:missing.length===0,reason,remainingQuestions:remaining,mandatoryOrdinaryAttackGaps:missing,priorEvidence:priorRows.map(r=>r.path),...(alias[model.id]?{canonicalSourceReference:{equipmentId:alias[model.id][1],evidence:previousAudits[2][1]}}:{})};
 });
 const modes=new Set(rows.flatMap(r=>r.ordinarySourceModeIds)),gaps=rows.flatMap(r=>r.mandatoryOrdinaryAttackGaps.map(modeId=>({modelId:r.modelId,modeId}))),statusCounts=rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{});
 const known=new Set(rows.map(r=>r.modelId)),supplementalModels=[];
 for(const id of ['lt:angon','lt:crescent-headed-spear']){const ids=all.filter(isOrdinary).filter(({m})=>source.get(m.weapon_mode_id)?.modelId===id).map(({m})=>m.weapon_mode_id);if(ids.length&&!known.has(id))supplementalModels.push({modelId:id,status:'COMPLETE_EXISTING',implementationStage:'M2.3',ordinarySourceModeIds:ids,evidence:previousAudits[2][1]});}
 const inclusive=new Set([...modes,...supplementalModels.flatMap(m=>m.ordinarySourceModeIds)]);
 const thrusts=all.filter(({e})=>e.source==='LT').filter(isOrdinary).filter(({m})=>/^thr.* imp$/.test(source.get(m.weapon_mode_id)?.stats.damage??'')&&!unresolved[source.get(m.weapon_mode_id)?.modelId]);
 const tipSlashGaps=thrusts.filter(({e,m})=>{const p=source.get(m.weapon_mode_id);return !all.filter(q=>q.e.equipment_id===e.equipment_id).some(({m:q})=>{const s=source.get(q.weapon_mode_id);return s&&(s.tipOf===p.modeId||s.motion==='swing'&&/tip slash/i.test(s.usage??'')&&s.primarySkills.join('/')===p.primarySkills.join('/')&&s.stats.st===p.stats.st&&(s.requiredFitting??null)===(p.requiredFitting??null));});}).map(({m})=>({modelId:source.get(m.weapon_mode_id).modelId,modeId:m.weapon_mode_id,missing:'LT62 Tip Slash'}));
 gaps.push(...tipSlashGaps);
 return {rows,supplementalModels,sourceRuleCoverage:{rule:'LT62 Tip Slash; published LT69 exceptions and LT71 material changes retained',thrustImpalingModesChecked:thrusts.length,missing:tipSlashGaps},summary:{totalLTModels:rows.length,scopeCounts:rows.reduce((a,r)=>(a[r.scope]=(a[r.scope]??0)+1,a),{}),modelsWithOrdinaryAttacks:rows.filter(r=>r.ordinarySourceModeIds.length).length,implementedOrdinaryModes:modes.size,implementedOrdinaryModesIncludingPriorSupplemental:inclusive.size,statusCounts,manualOnlyModels:rows.filter(r=>r.status==='MANUAL_ONLY').length,sourceUndeterminedModels:rows.filter(r=>r.status==='SOURCE_UNDETERMINED').length,preservedUnconfirmedGcsCombatModes:4,mandatoryOrdinaryAttackGaps:gaps.length},gaps};
}
export async function buildAudit(){const input=await loadLTInputs(),matrix=buildLTMatrix(input);return {schema:'olegurps-melee-m26-lt-closeout-v1',stage:'M2.6',version:'0.2.1b',timezone:'Europe/Moscow',auditScope:'All 215 historical LT model IDs; ordinary attacks only. Historical LT/HT/UT audit is unchanged.',matrixReconciliationComplete:matrix.rows.length===215,auditComplete:matrix.rows.length===215&&matrix.gaps.length===0,ordinaryImplementationComplete:matrix.gaps.length===0,allSourceQuestionsResolved:false,summary:matrix.summary,models:matrix.rows,supplementalModels:matrix.supplementalModels,sourceRuleCoverage:matrix.sourceRuleCoverage,mandatoryOrdinaryAttackGaps:matrix.gaps,priorAudits:previousAudits.map(([stage,path])=>({stage,path})),deltaModeIds:Object.keys(delta),catalogDefinitionsDeclaredByM26:LT_IMPROVISED_EQUIPMENT.map(e=>e.equipmentId),historicalAudit:'docs/audit/melee-lt-ht-ut-audit.json'};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await buildAudit();if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result.summary));if(result.mandatoryOrdinaryAttackGaps.length)console.log(JSON.stringify(result.mandatoryOrdinaryAttackGaps));}
