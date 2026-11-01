// Reconcile the 105 immutable historical HT model IDs with the current ordinary overlay.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {CatalogService} from '../scripts/catalog-service.js';
import {HT_ORDINARY_PROFILES as P} from '../scripts/ht-ordinary-melee-source.js';
import {HT_M27_HOSTS} from '../scripts/ht-ordinary-host-data.js';
const deferred={
 'chainsaw':'Обязательный M2.8, исторически BROKEN: sw+1d из M0 не закрывает контакт движущейся цепи, остановку/запуск, питание и особые последствия.',
 'cattle-prod':'Контактный burn и связанная HT-affliction, питание и длительность контакта требуют M2.8.',
 'stun-baton':'Механический удар связан с электрической affliction и контактным состоянием; устройство целиком M2.8.',
 'stun-gun':'Электрическая affliction, контакт, питание и восстановление – M2.8.',
 'pepper-spray':'Аэрозоль, сопротивление и состояния поражения – M2.8.',
 'tear-gas-spray':'Аэрозоль, сопротивление и состояния поражения – M2.8.',
 'rescue-spreader-cutter':'Механизированные челюсти, цикл открытия/закрытия и разрушение объекта – M2.8; технический Damage не обычная атака.',
 'condor-am-402-12g-2-75':'Устройство целиком M2.8: выбор патрона/ствола, газовый заряд и боевой Baton должны использовать один носитель и состояние.',
 'condor-am-402t':'Устройство целиком M2.8: Tonfa и 12G-заряд требуют единого носителя, состояния и выбора режима.',
 'elgin-cutlass-pistol-54-caplock':'Устройство целиком M2.8: Large Knife −1 и капсюльный пистолет требуют единой физической записи и совместной конфигурации.',
 'tsniitochmash-nrs-2-7-62x42mm':'Устройство целиком M2.8: Large Knife и выстрел из рукояти требуют разворота, предохранителя и общего ресурса.',
 'sedgley-glove-pistol-mk-2':'Устройство целиком M2.8: linked punch + bullet, промах/парирование и расход патрона требуют специального общего механизма.'
};
const manualWork=new Set(['bit-and-brace','bolt-cutters-heavy','bolt-cutters-light','crosscut-saw','hacksaw','saw','wire-cutters']);
export async function loadHTM27(){
 const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8'));
 const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:()=>read('data/catalogs/'+u.split('/').at(-1))})});await catalogs.load();
 return {catalogs,historical:(await read('tests/fixtures/melee-reconciliation-inputs.json')).historical,raw:await read('data/catalogs/olegurps_weapon_reference_catalog_v5_6.json')};
}
export function buildHTM27({catalogs,historical,raw}){
 const rows=historical.models.filter(m=>m.book==='HT').map(m=>{
  const key=m.id.slice(3),source=Object.values(P).filter(p=>p.modelId===m.id||m.id==='ht:bayonet'&&p.hostBayonet||m.id==='ht:rifle-butt'&&p.hostRule==='HT198'&&!p.hostBayonet||m.id==='ht:pistol-whipping'&&p.hostRule==='HT93');
  const host=HT_M27_HOSTS.find(h=>h.modelId===m.id),work=m.scope==='work-operation';let status,reason;
  if(deferred[key]){status='DEFERRED_TO_M2_8';reason=deferred[key];}
  else if(work){status=manualWork.has(key)?'MANUAL_HINT_ONLY':'DEFERRED_TO_M2_8';reason=manualWork.has(key)?'Опубликован только технический Damage рабочей операции по материалу, без отдельного обычного боевого профиля. Работа и разрушение выполняются вручную.':'Специализированный привод/горелка/механизм и техническое разрушение объекта требуют M2.8. Обычный melee-профиль не опубликован.';}
  else if(key==='wire-saw'){status='MANUAL_HINT_ONLY';reason='HT25: рабочее пиление и Wire Garrote без штрафа. Удушение B405 – ручная процедура; обычная числовая атака не опубликована.';}
  else if(source.length){status=source.some(p=>!m.catalogModeIds.includes(p.modeId))?'ADDED':'REPAIRED';reason=status==='ADDED'?'Добавлены отсутствовавшие опубликованные способы удара в общей записи физического экземпляра.':'Проверенные числовые профили сохранены/исправлены; добавлены точные навыки/defaults, качество по ТУ экземпляра и ограничения ударной части.';}
  else {status='SOURCE_UNDETERMINED';reason='Не найден подтверждённый обычный профиль; требуется разбор источника.';}
  return {modelId:m.id,name:m.sourceName,historicalScope:m.scope,status,reason,sourcePages:[...new Set([...m.sourcePages,...source.flatMap(p=>p.sourcePages)])],
   equipmentIds:[...new Set([...(m.equipmentIds??[]),...source.map(p=>p.equipmentId)])],historicalCatalogModeIds:m.catalogModeIds,
   ordinaryModes:source.map(p=>{const old=raw.equipment.flatMap(e=>e.modes).find(x=>x.weapon_mode_id===p.modeId),current=catalogs.getMode(p.modeId);
    return {modeId:p.modeId,equipmentId:p.equipmentId,usage:p.usage,status:old?'REPAIRED':'ADDED',sourcePages:p.sourcePages,
     damage:p.stats.damage,damageType:p.stats.damage.split(' ').at(-1),st:p.stats.st,reach:p.stats.reach,parry:p.stats.parry,hands:p.hands,
     skills:p.primarySkills,defaults:p.sourceOptions,attackModifier:p.attackModifier,
     quality:{baseline:p.baselineQuality,allowed:p.qualityOptions.map(q=>q.level),construction:p.construction,damagePart:p.damagePart,baseCost:p.cost,mass:p.mass,weaponTL:'individual; never campaign TL',import:'preserve included GGA total; explicit baseline required'},
     grip:{publishedHands:p.hands,martialGrips:p.martialGrips,ready:'manual; no Attack block'},motion:/^sw/.test(p.stats.damage)?'Swing':'Thrust',conditions:p.hints??[],
     changes:old?['damage','reach','parry','strength'].filter(k=>JSON.stringify(k==='damage'?old.raw_calc?.damage:old.stats[k])!==JSON.stringify(k==='damage'?current.raw_calc?.damage:current.stats[k])):['new exact mode on same physical equipment']};}),
   host:host?{samePhysicalEquipmentId:host.equipmentId,exactBindingRequired:true,bayonet:host.bayonet,buttReach:host.buttReach,barrelSafe:host.barrelSafe,stockAndFitting:'manual',meleeST:null,meleeParry:null}:null,
   workOperation:work?{confirmedOrdinaryCombatProfile:false,technicalDamageNotReused:true}:null,
   manualSourceFields:source.filter(p=>p.stats.st==null||p.stats.parry==null||p.stats.reach==null).map(p=>({modeId:p.modeId,fields:['st','parry','reach'].filter(k=>p.stats[k]==null),reason:'Not published for this host; no ranged substitution or Attack block.'})),
   openQuestions:status==='SOURCE_UNDETERMINED'?[reason]:key==='sword-cane'?['Optional Sword Cane + Stainless before TL7: two quality downgrades would pass below Cheap. No invented price/breakage; manual decision, ordinary printed Damage retained.']:[],mandatoryM27Gap:status==='SOURCE_UNDETERMINED'};
 });
 const unique=Object.values(P),counts=Object.fromEntries(['ALREADY_CORRECT','REPAIRED','ADDED','MANUAL_HINT_ONLY','SOURCE_UNDETERMINED','DEFERRED_TO_M2_8'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 return {schema:1,stage:'M2.7',moduleVersion:'0.2.1b',historicalAuditRewritten:false,rows,
  summary:{historicalModels:rows.length,historicalScopes:Object.fromEntries([...new Set(rows.map(r=>r.historicalScope))].map(s=>[s,rows.filter(r=>r.historicalScope===s).length])),statuses:counts,
   ordinaryHistoricalModels:rows.filter(r=>r.ordinaryModes.length).length,uniqueOrdinaryModes:unique.length,physicalDefinitions:new Set(unique.map(p=>p.equipmentId)).size,
   historicalHosts:rows.filter(r=>r.historicalScope==='melee-host').length,workOperations:rows.filter(r=>r.workOperation).length,
   newPhysicalDefinitions:14,addedModesSinceM0:124,rawCatalogExistingModes:44,previousM0KatanaThrustRetained:true,
   mandatoryGaps:rows.filter(r=>r.mandatoryM27Gap).length,allHighTechMeleeComplete:false},
  supplementalModels:[...new Set(unique.map(p=>p.modelId))].filter(id=>!rows.some(r=>r.modelId===id)).map(id=>({modelId:id,modes:unique.filter(p=>p.modelId===id).map(p=>p.modeId)})),
  deferredToM28:rows.filter(r=>r.status==='DEFERRED_TO_M2_8').map(r=>({modelId:r.modelId,reason:r.reason,mandatoryM28:r.modelId==='ht:chainsaw'})),
  gaps:rows.filter(r=>r.mandatoryM27Gap).map(r=>({modelId:r.modelId,reason:r.reason}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=buildHTM27(await loadHTM27());if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.summary));}
