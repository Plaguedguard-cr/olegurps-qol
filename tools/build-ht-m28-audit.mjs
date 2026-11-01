// M2.8 reconciliation. M2.7 supplies the exact 23 historical IDs; old audits are read only.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {CatalogService} from '../scripts/catalog-service.js';
import {HT_SPECIAL_PROFILES as P,HT_WORK_PROCEDURES} from '../scripts/ht-special-melee-source.js';
export const M27_AUDIT='docs/reports/2026-10-30_20-56-19_M2.7_HT-ordinary-melee/2026-10-30_20-56-19_M2.7_HT-ordinary-melee_audit.json';
export const M26_AUDIT='docs/reports/2026-10-30_17-52-15_M2.6_LT-improvised-closeout/2026-10-30_17-52-15_M2.6_LT-improvised-closeout_audit.json';
export const HT_M28_ADDITIONAL=[
 {modelId:'ht:pocketknife-pistol',name:'Pocketknife Pistol',status:'MANUAL_SOURCE_ONLY',sourcePages:['HT98','HT31'],
  numericSource:{example:'American Novelty Co. Defender, .22 LR',damage:'1d pi-',acc:0,range:'70/800',rof:'1',shots:'1(10)',st:'5',bulk:-1,rcl:2,cost:40,weight:'0.2/0.0077'},
  implemented:false,reason:'Вне исходных 23. HT98 подтверждает встроенный однозарядный пистолет и складные клинки, но не задаёт однозначный melee-профиль каждого клинка. Не создаётся отдельная копия Pocketknife и частично COMPLETE устройство.'},
 {modelId:'ht:tp-82-machete-stock',name:'TP-82 / detachable machete-stock',status:'MANUAL_SOURCE_ONLY',sourcePages:['HT108','HT197'],
  numericSource:{shotgun:'Twin 32G: 1d-2(0.5) pi-, Acc2, 15/300, RoF2×76, Shots2(3i), ST9†, Rcl1/3',rifle:'5.45×39mm: 4d pi, Acc3, 390/2700, RoF1, Shots1(3i), ST8†, Rcl2',stock:'1.8 lb = 1.4 lb machete + 0.4 lb sheath'},
  implemented:false,reason:'Вне исходных 23. Три ствола, две физические подачи и отделяемый machete-stock требуют отдельной подтверждённой конфигурации. Нельзя считать штатную M2.7 Machete вторым независимым предметом этого устройства. Новая система подачи/состояний не вводится.'}
];
export async function loadHTM28(){
 const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
 const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:()=>read('data/catalogs/'+u.split('/').at(-1))})});await catalogs.load();
 const inputs=await read('tests/fixtures/melee-reconciliation-inputs.json');
 return {catalogs,m27:inputs.htM27,m26:inputs.ltM26,historical:inputs.historical};
}
export function buildHTM28({catalogs,m27,m26,historical}){
 const prior=m27.rows.filter(r=>r.status==='DEFERRED_TO_M2_8');if(prior.length!==23)throw Error('M2.7 deferred identity matrix changed');
 const modeContracts=Object.fromEntries(Object.values(P).map(p=>[p.modeId,{modeId:p.modeId,equipmentId:p.equipmentId,modelId:p.modelId,usage:p.usage,sourcePages:p.sourcePages,
  damage:p.stats.damage,reach:p.stats.reach,parry:p.stats.parry,st:p.stats.st,hands:p.hands,skills:p.primarySkills,defaults:p.sourceOptions,attackModifier:p.attackModifier,
  instructionOnly:p.instructionOnly===true,quality:{baseline:p.baselineQuality,fixed:p.fixedPublishedQuality,part:p.damagePart,material:p.construction},grips:p.martialGrips,
  resistanceEffect:p.resistanceEffect??null,manualLinkedAction:p.manualLinkedAction??null,manualHints:p.hints??[],nativeNumericDamage:!p.instructionOnly,actorSystemWrites:false}]));
 const rows=prior.map(old=>{
  const work=HT_WORK_PROCEDURES.find(p=>p.modelId===old.modelId),modes=Object.values(P).filter(p=>p.modelId===old.modelId);
  const numericComplete=['ht:elgin-cutlass-pistol-54-caplock','ht:tsniitochmash-nrs-2-7-62x42mm'].includes(old.modelId);
  const status=work?'MANUAL_SOURCE_ONLY':numericComplete?'NUMERIC_COMPLETE':'ASSISTED_MANUAL';
  if(!work&&!modes.length)throw Error('Unreconciled M2.8 model '+old.modelId);
  return {modelId:old.modelId,name:old.name,historicalScope:old.historicalScope,status,sourcePages:[...new Set([...old.sourcePages,...(work?.sourcePages??[]),...modes.flatMap(p=>p.sourcePages)])],
   equipmentIds:[...new Set([...old.equipmentIds,...modes.map(p=>p.equipmentId)])],modeIds:modes.map(p=>p.modeId),
   reason:work?'Опубликована рабочая процедура по материалу/объекту; обычный боевой профиль не установлен. Это не ошибка отсутствующей атаки.':
    old.modelId==='ht:chainsaw'?'Четыре точных физических записи: working-chain sw+1d, отдельный hard-material AD(0.5), правильные ST/Parry/руки и frozen Damage. Запуск, состояние, непроникновение/поломка и TL7 отскок – явные ручные процедуры.':
    old.modelId==='ht:sedgley-glove-pistol-mk-2'?'Один native Attack кулаком; punch и замороженная linked-пуля 2d−1 pi бросаются отдельно и явно от одного попадания. Dodge/parry, локация, факт срабатывания и единственный патрон решаются вручную; второго Attack и скрытого Damage нет.':
    numericComplete?'Клинок через общий MeleeProfileService, стрельба существующим ranged/GGA с одной физической записью/подачей. Хват, ориентация, предохранитель и Ready – вручную.':
    old.modelId.includes('condor')?'Корпус/Tonfa, ranged-патрон и отдельная газовая процедура принадлежат одной физической записи. Газ как HT180 без пулевого Damage; расход одной каморы явно штатной операцией Списать.':
    old.modelId.includes('spray')?'Химическая melee-струя Reach1,2 и два явных GGA HT-сопротивления. Нет вымышленного числового Damage или автоматических состояний.':
    'Физический Damage, если опубликован, отделён от контактного HT−3(0.5). Штатный GGA resistance вызывается только явно, питание и последствия вручную.',
   workingProcedure:work??null,
   unspecifiedBySource:work?['Обычные combat skill/Parry и применимость рабочего Damage к живой цели не опубликованы.']:
    old.modelId==='ht:chainsaw'?['Точное число Ready запуска/перезапуска в HT27 не задано. Остановленная цепь не получает выдуманную числовую атаку.']:
    ['ht:cattle-prod','ht:stun-baton','ht:stun-gun'].includes(old.modelId)?['Точное число разрядов не задано: только тысячи применений. Учёт питания ручной.']:[],
   mandatoryUnfinishedConfirmedRules:[],automation:'assistance only; no target-state or Actor.system updates'};
 });
 const closeout=historical.models.filter(m=>m.book==='HT').map(m=>{const r=rows.find(r=>r.modelId===m.id),old=m27.rows.find(r=>r.modelId===m.id);if(!old)throw Error('Missing historical identity');return {modelId:m.id,name:m.sourceName,historicalScope:m.scope,stage:r?'M2.8':'M2.7',status:r?.status??old.status,modeIds:r?.modeIds??old.ordinaryModeIds,sourcePages:r?.sourcePages??old.sourcePages,reference:r?'M2.8 modeContracts / workingProcedure':M27_AUDIT};});
 const counts=Object.fromEntries(['NUMERIC_COMPLETE','ASSISTED_MANUAL','MANUAL_SOURCE_ONLY','SOURCE_UNDETERMINED','BLOCKED'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 return {schema:1,stage:'M2.8',moduleVersion:'0.2.1b',historicalHTModels:105,m27DeferredIdentitySource:M27_AUDIT,priorLTCloseout:{path:M26_AUDIT,summary:m26.summary},rows,modeContracts,additional:HT_M28_ADDITIONAL,highTechCloseout:closeout,
  summary:{historicalModels:105,m27Models:82,m28Models:23,additionalModels:2,statuses:counts,physicalDeviceDefinitions:new Set(Object.values(P).map(p=>p.equipmentId)).size,
   numericMeleeModes:Object.values(P).filter(p=>!p.instructionOnly).length,instructionOnlyModes:Object.values(P).filter(p=>p.instructionOnly).length,workingModels:HT_WORK_PROCEDURES.length,
   newMeleeModes:11,newRangedModes:1,rangedCorrections:[{modeId:'Wr_7MnorYDlPSb2qW',field:'accuracy',previous:null,value:'0',source:'HT91'}],
   ordinaryHTAttackDamageComplete:true,specialHTNumericAssistanceComplete:true,fullHTProcedureAutomation:false,mandatoryUnfinishedConfirmedRules:0,technicalBlockers:0},
  chainsawBrokenResolution:{historical:'BROKEN',formulaOnlyM0WasInsufficient:true,physicalRecords:4,eliminated:['Sw+1d and numeric GGA materialization','Hard target AD(0.5) source mode','Exact ST11‡/10‡, Reach1/Parry0U/two hands','Running-chain and malfunction/TL7 rebound conditions frozen per attack','No automatic starts, repeat Damage or resource expenditure'],remainingManual:['Running/stopped state and startup Ready','Hardness and DR penetration','1d malfunction / repair / restart','TL7 1d cut rebound when chain snaps','Fuel and adjudication'],closedAs:'ASSISTED_MANUAL'},
  inferredCompatibility:{modeId:'WHTM28CondorTonfaFired',equipmentId:'eHTM28CondorAM402T',source:'HT199 explicitly identifies similar AM-402T, differing Tonfa shape and 1.6 lb weight; exact 12G 2.75 physical links copied from AM-402, no family/name matching'},
  policy:{actorSystemWrites:false,newStateSystem:false,newAmmunitionSystem:false,automaticTargetEffects:false,automaticResistance:false,automaticLinkedDamage:false,oldAuditsRewritten:false,utStarted:false,bsStageStarted:false}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const a=buildHTM28(await loadHTM28());if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(a,null,1)+'\n');console.log(JSON.stringify(a.summary));}
