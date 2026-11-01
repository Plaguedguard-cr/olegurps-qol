import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {UT_ORDINARY_PROFILES as P} from '../scripts/ut-ordinary-melee-source.js';
export const HISTORICAL='docs/audit/melee-lt-ht-ut-audit.json';
const complete=['ut:heavy-flashlight','ut:karatand','ut:morph-axe','ut:force-blade','ut:force-sword','ut:force-glaive'];
const laterBS=['ut:gripboots','ut:reactive-armor-robofac-nanomorph'];
const future={
 'ut:force-whip':['UT166','Force Whip, DX−5/Kusari−3/Monowire Whip−3/Whip−3. Исправить прежнюю привязку Force Sword; 4d(5) burn, Reach1–8*, Parry−2U, B/100 секунд. Гибкая атака и защита требуют собственного контракта M2.10.'],
 'ut:monowire-whip':['UT163','sw+1d−2(10) cut; изменяемый Reach1–7* и Ready; натяжение thr+1d(10) cut каждый ход, самоповреждение/критический промах. Не считать обычный Swing завершением всех правил.'],
 'ut:monowire-switchblade':['UT163–164','Жёсткий sw+1d+R(10) cut, R=Reach (C=0), без Thrust. Требуются реальная длина, место для Swing и питание B/10 часов. Гибкий Reach: текст1–5, таблица1–7* – конфликт сохранён, не разрешён незаметно. R не заменять константой.'],
 'ut:stasis-switchblade':['UT164','sw+1d+R(10) cut жёстко, гибкий sw+1d−1(10) cut, Reach до30. Неразрушимость и возможность парировать force/energy – обязательная отдельная часть. Нужен динамический R и собственная конфигурация.'],
 'ut:zap-glove':['UT165','Текст stun как Electric Stun Wand HT−5, таблица HT−6(2) aff: конфликт. Kill2d burn и B432; два режима/Ready, B/10 zaps, kill расходует2. Одновременный unarmed удар или grapple-контакт; DR5 перчатки. Не переносить HT−3 из M2.8.'],
 'ut:neuroglove':['UT165','HT−6(2) neural affliction; разные эффекты neural disruptor, B/20, DR2 и риск поломки при проникновении. Контакт не сводится к обычному Damage.'],
 'ut:neural-inhibitor':['UT201','Контакт голой кожи живого существа с подходящей нервной системой; HT−6 каждую секунду контакта. Эффект зависит от forearm/шея/черепа; A/10 часов. Нет источникового обычного удара или навыка, не изобретать его.'],
 'ut:neurolash-baton':['UT165–166','Обычные sw/thr cr присутствуют в старом каталоге. Обязателен linked HT−5(2), neural effect, B/20 strikes; генератор несовместим с force/sonic/vibro/monowire. M2.9 эти специальные эффекты не реализует.'],
 'ut:neurolash-whip':['UT165–166','Каталог содержит sw−2(0.5) cr, Reach1–3*, Parry−2U. Linked HT−5(2), гибкая механика, neural effect и B/20 остаются обязательными для M2.10.'],
 'ut:pneumohypo':['UT199','Knife или DX−4, Reach C; проникает DR1/обычную одежду, вводит одну настоящую дозу. Воздух100 применений, замена3 секунды. Не выдумывать числовой burn/tox и не создавать препарат автоматически.'],
 'ut:disposable-hypo':['UT197','Одноразовая уже заправленная доза drug/poison/nanoagent; combat skill/обычный Damage в этой записи не опубликован. Отдельная условная доставка и реальный ресурс M2.10.'],
 'ut:limpet-mine-dispenser':['UT163','Brawling/DX попадание прикрепляет мину без немедленного Damage. Магазин10×25mm, задержка0–100 секунд, снятие Ready+ST с поправкой DR, 1HP при отрыве от плоти. Не подменять обычной melee-взрывной атакой.'],
 'ut:fire-extinguisher-tube':['UT87','Liquid Projector (Sprayer), melee jet. Лицо: HT−3 Contact Agent, Stun и Blindness на MoF секунд. Дальность2 ярда, ресурс4 секунды; TL10/11/12 ×1.5/2/3. Это подтверждённая специальная атака, а не обычный числовой удар.'],
 'ut:small-fire-extinguisher':['UT87','Liquid Projector (Sprayer), melee jet. Лицо HT−3 Contact Agent, Stun/Blindness MoF секунд; 3 ярда, 10 секунд расхода, TL-множители1.5/2/3. Не превращать в придуманную дубинку.'],
 'ut:large-fire-extinguisher':['UT87','Liquid Projector (Sprayer), melee jet. Лицо HT−3 Contact Agent, Stun/Blindness MoF секунд; ранцевый3 ярда/30 секунд. Нужен ресурс и специальная процедура, не обычный удар.'],
 'ut:cyber-claws':['UT211','Retractable Sharp Claws (Switchable): имплант, не независимая запись оружия. Нужны естественная атака и подтверждённая интеграция Actor; пересечение M2.11. В M2.9 не изменять преимущества или Actor.system.'],
 'ut:stinger':['UT211','Имплант держит один внешний Disposable Hypo, не производит вещество; смена10 секунд. Доставка/право на настоящий расходный ресурс передаются M2.10, без создания фиктивного ножа.'],
 'ut:ripsnake':['UT214','Impaling Striker с Cannot Parry/Long и ограниченным Extra Attack; особое автоматическое попадание внутрь при конкретном контакте. Имплант/естественная атака с пересечением M2.11; не обычный самостоятельный предмет.'],
 'ut:cyberhair':['UT212','Extra Arm, Extra-Flexible/Short/Weak, 1/4 ST у shoulder-length варианта. Манипулятор и возможные естественные атаки зависят от Actor, не подтверждён обычный числовой меч. Передать M2.10 с пересечением M2.11.']
};
export async function loadUTM29(){return JSON.parse(await fs.readFile(new URL('../tests/fixtures/melee-reconciliation-inputs.json',import.meta.url),'utf8')).historical;}
export function buildUTM29(historical){
 const old=historical.models.filter(m=>m.book==='UT');if(old.length!==42)throw Error('Historical UT matrix must contain 42 identities');
 const rows=old.map(m=>{
  const ps=Object.values(P).filter(p=>p.modelId===m.id),industrial=/torch|industrial-water-knife/.test(m.id);
  const special=['ut:electric-stun-wand','ut:neurolash-baton','ut:neurolash-whip'].includes(m.id);
  const status=complete.includes(m.id)?'NUMERIC_COMPLETE_M2_9':special?'PARTIAL_SPECIAL_M2_10':laterBS.includes(m.id)?'DEFERRED_TO_M2_11':'DEFERRED_TO_M2_10';
  const reason=complete.includes(m.id)?'Подтверждённая обычная числовая часть M2.9 завершена; Ready, защита, физическое состояние и питание остаются явными ручными условиями.':
   m.id==='ut:electric-stun-wand'?'Реализованы только два механических удара. HT−5, knockdown/paralysis, поддержание контакта, recovery и B/20 не завершены. AD0.5 подтверждён утверждённой эрратой E30, исправляющей исходную таблицу2. HT M2.8 инфраструктура пригодна как маршрут явного GGA HT, но эффект и поправки UT другие.':
   laterBS.includes(m.id)?m.id==='ut:gripboots'?'UT75 даёт +1/die к Kick; обувь и профиль атаки тела, передать M2.11 без фиктивного холодного оружия.':'UT111 Nanomorph: Long Talons, Striking ST и трансформация тела принадлежат шаблону персонажа. M2.11, без создания фиктивной записи оборудования.':
   industrial?'Источник прямо подтверждает combat melee применение или таблицу. Числовой Damage не означает завершённый ресурс/beam-особенности; индивидуально передать M2.10. Рабочие действия не создают дополнительных выдуманных боевых режимов.':
   future[m.id]?.[1];
  if(!reason)throw Error('Unclassified UT model '+m.id);
  return {modelId:m.id,sourceName:m.sourceName,historicalScope:m.scope,status,sourcePages:[...new Set([...m.sourcePages,...ps.flatMap(p=>p.sourcePages)])],equipmentIds:m.equipmentIds,
   publishedOrdinaryModeIds:ps.length?ps.map(p=>p.modeId):m.modes.filter(r=>/^(sw|thr|\d+d)/.test(r.fields.damage.source)&&!/\+R/.test(r.fields.damage.source)).map(r=>r.modeId),
   implementedM29ModeIds:ps.map(p=>p.modeId),existingCatalogModeIds:m.catalogModeIds,
   publishedNumericalModes:m.modes.map(r=>({modeId:r.modeId,damage:r.fields.damage.source,reach:r.fields.reach.source,parry:r.fields.parry.source,st:r.fields.st.source,sourceRows:r.sourceRows,priorStatus:r.status})),
   currentLegacyModeEvidence:ps.length?'M2.9 parameterized contracts and live selection.':'Catalog presence retained; prior statuses are not treated as current implementation proof.',
   residualSpecialRules:complete.includes(m.id)?ps.flatMap(p=>p.hints).filter((v,i,a)=>a.indexOf(v)===i):[reason],
   transferReason:reason,ordinaryCombatSkillPublished:m.scope!=='implant'&&!['ut:neural-inhibitor','ut:disposable-hypo',...laterBS].includes(m.id),
   industrialCombatConfirmed:industrial,mandatoryM29OrdinaryGaps:[],
   futureStage:status==='NUMERIC_COMPLETE_M2_9'?null:status==='DEFERRED_TO_M2_11'?'M2.11':'M2.10',
   ...(industrial?{futureConditions:{sourcePages:m.sourcePages,publishedCombatUse:true,powerAndConsumables:'Use exact printed cells/duration, not universal ranged battery model.',beam:'UT80/85 tight-beam burn; only force blade can parry torch jet; rad/sur where printed. Industrial Water Knife UT81 uses real water source and C/10hr.'}}:{}),
   ...(future[m.id]?{individualSourceNote:{source:future[m.id][0],text:future[m.id][1]}}:{})};
 });
 const statusCounts=Object.fromEntries(['NUMERIC_COMPLETE_M2_9','PARTIAL_SPECIAL_M2_10','DEFERRED_TO_M2_10','DEFERRED_TO_M2_11','MANUAL_SOURCE_ONLY','SOURCE_UNDETERMINED','OUT_OF_SCOPE'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 const modes=Object.values(P).map(p=>({modeId:p.modeId,equipmentId:p.equipmentId,modelId:p.modelId,sourcePages:p.sourcePages,sourceTL:p.techLevel,damage:p.stats.damage,reach:p.stats.reach,parry:p.stats.parry,st:p.stats.st,hands:p.hands,skills:p.primarySkills,defaults:p.sourceOptions,
  quality:'Published configuration only; explicit typed Superfine permitted solely for Morph Axe cut/imp. No Fine/Superfine on force field.',
  materials:{implemented:p.morph?['published','Superfine (+2 cut/imp, AD2, ×6)']:['published'],
   inapplicable:p.energy?['Fine','Superfine','Monowire','Vibro','Hyperdense','Nanothorn','Rocket Striker']:[],
   manualOnly:p.energy?[]:['Monowire','Vibro','Hyperdense','Nanothorn','Rocket Striker','unconfirmed combinations'],
   reason:p.energy?'Energy field has no ordinary blade material.':p.morph?'Memory-metal base retains printed sw+1 and mass/cost per form.':'Exact published device body; no material analogies.'},
  grips:{publishedHands:p.hands,martialGrips:p.martialGrips,ready:'manual; no turn tracking',minimumSTPenaltyDeferred:true},conditions:p.hints,requiresVariable:p.requiresVariable===true,energy:p.energy===true,unpowered:p.unpowered===true,partialSpecial:p.partialSpecial===true}));
 return {schema:1,stage:'M2.9',moduleVersion:'0.2.1b',historicalSource:HISTORICAL,requestedHistoricalFilename:'melee-lt-ht-ut-audit(1).json',historicalFilenameResolution:'No separate (1) attachment/workspace copy found; canonical repository historical audit used. Exact 42 UT identities and scope counts match the request.',rows,modeContracts:Object.fromEntries(modes.map(m=>[m.modeId,m])),
  summary:{historicalModels:42,scopes:Object.fromEntries([...new Set(rows.map(r=>r.historicalScope))].map(s=>[s,rows.filter(r=>r.historicalScope===s).length])),statuses:statusCounts,ordinaryM29Models:7,numericCompleteModels:6,partialSpecialModels:3,m29NumericMeleeModes:18,newModes:9,repairedExistingModes:4,alreadyCorrectNumericModes:5,passedToM210:rows.filter(r=>r.futureStage==='M2.10').length,passedToM211:2,mandatoryUnfinishedM29OrdinaryAttacks:0,allUTComplete:false},
  modeCounting:{new:['wUTM29MorphImp','wUTM29MorphCr','wUTM29VariableForceC','wUTM29VariableForce1','wUTM29VariableForce2','wUTM29GlaiveBatonSw','wUTM29GlaiveBatonThr','wUTM29GlaiveStaffSw','wUTM29GlaiveStaffThr'],
   repairedExisting:['wg9K3Yi69WdSCaeKP','wDySTsgiygu6nSRFu','wKrl1D1iujaCX9ssm','wKaBftlfcmfO4Q3ph'],alreadyCorrectNumeric:['w3vSCNftOrywWou49','wI0oYbRdlvRyfiyHY','wQn8_zVA--bjjKSQp','w7bLtfJugrIOJS70U','wmZbVhgow5v78qhsX'],
   explanation:'Repaired includes source/skill/default/configuration contracts, not necessarily changed printed Damage. The five already-correct numeric modes receive verified source/instance integration; no claim that their formulas were previously broken.'},
  approvedErrata:[{id:'E30',modelId:'ut:electric-stun-wand',source:'UT165',previousTable:'linked HT-5(2) aff',corrected:'linked HT-5(0.5) aff',registry:'docs/audit/ultra-tech-2007-errata.md',sourcePDFUnchanged:true,linkedCatalogAlreadyCorrect:true,implementationStage:'M2.10'}],
  unresolvedSourceConflicts:[{modelId:'ut:zap-glove',source:'UT165',text:'stun as Wand HT-5',table:'HT-6(2) aff',stage:'M2.10'},{modelId:'ut:monowire-switchblade',source:'UT163-164',text:'flexible Reach1-5',table:'Reach1-7*',stage:'M2.10'}],
  bounds:{noNewPhysicalEquipment:true,actorSystemWrites:false,automaticPower:false,automaticReady:false,automaticTargetEffects:false,newSTPenaltySystem:false,m210ImplementationStarted:false,m211ImplementationStarted:false,m212ImplementationStarted:false,oldAuditsRewritten:false,ltHtExpanded:false}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const a=buildUTM29(await loadUTM29());if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(a,null,2)+'\n');console.log(JSON.stringify(a.summary));}
