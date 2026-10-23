// UT160-161 and the three approved HT/Basic additions. Unknown prices stay unknown.
const rows=[
 ['riot','Riot Gas',9,2,'gas','respiratory',-4,'Каждую секунду HT−4: тошнота; провал ≥5 — рвота, затем тошнота MoF минут.'],
 ['musk','Musk',9,2,'aerosol','contact',null,'Bad Smell на 2 недели; час мытья сокращает срок на день. Sealed защищает тело, но не костюм.'],
 ['nerve','Lethal Nerve Gas',9,10,'aerosol','contact',-6,'HT−6 (остаточное загрязнение −3): 1d tox, 6 циклов по минуте; неврологические последствия по потере HP.'],
 ['sleep','Sleep Gas',9,0.5,'aerosol','contact',-6,'HT−6: без сознания MoF минут, затем обычный сон.'],
 ['paralysis','Paralysis Gas',10,10,'aerosol','contact',-6,'Каждый ход HT−6: провал 1–2 — падение и неподвижность на ход; ≥3 — паралич MoF минут; критпровал — 1d и кома.'],
 ['pheromone','Pheromone Spray',10,20,'gas','respiratory',-2,'HT−2: Lecherousness (9) в облаке + MoF минут; обычно только тот же вид.'],
 ['mask','Mask',10,30,'aerosol','traces',null,'Forensics по следам и выслеживание по запаху −6; сам Mask легко обнаруживается.'],
 ['antitangler','Anti-Tangler Aerosol',10,1,'aerosol','tangler',null,'Растворяет связи Tangler за 1 секунду.'],
 ['smoke','Smoke',9,null,'gas','obscurant',null,'Визуальные атаки и наблюдение −10; блокирует ladar. Облако 1–4 минуты.'],
 ['colored','Colored Smoke',9,0.1,'gas','obscurant',null,'Визуальные атаки и наблюдение −7. Облако 1–4 минуты.'],
 ['hot','Hot Smoke',9,0.15,'gas','obscurant',null,'Smoke; также мешает Infravision, Hyperspectral Vision и Night Vision.'],
 ['prism','Prism Smoke',9,0.2,'gas','obscurant',null,'Hot Smoke; блокирует лазеры, кроме X-ray и gamma-ray.'],
 ['electromagnetic','Electromagnetic Smoke',9,0.3,'gas','obscurant',null,'Hot Smoke; также мешает Radar и Imaging Radar.'],
 ['radiant','Radiant Prism',10,3,'gas','obscurant',null,'Prism + electromagnetic; срок /2, IR/radar −5; без фильтра 1 HP/с при вдыхании.'],
 ['firefoam','Firefoam',9,1,'foam','fire',null,'Тушит огонь до (TL−8)d; больший ослабляет на 3d секунд.'],
 ['mea','Metal Embrittlement Agent',10,5,'liquid','metal',null,'Заданный сплав: 3d cor/час, 12 часов или до очистки; полностью охваченный SM≥+2 умножает урон на SM.'],
 ['disassembler','Disassembler Nanoglop',11,null,'slime','material',null,'Радиус /2 (ниже 1 ярда — только прямое попадание); 15 секунд, удвоенный урон disassembler: 2×(1d−2)(10) cor/с; только Sealed DR. UT161,169.'],
 ['replicator','Replicator Nanoglop',12,null,'slime','material',null,'Replicating disassemblers: превращение материи и распространение вручную по UT161,169.'],
 ['tear','Tear Gas',6,10,'gas','respiratory/vision',-2,'HT−2 отдельно: кашель/слепота в облаке + MoF минут; Vision −1…−3 на ярд. B439.'],
 ['tear_vomit','Tear Gas + Vomiting Agent',6,null,'gas','respiratory/vision',-2,'Два HT−2: кашель/слепота в облаке + MoF минут; третий HT−2: рвота в облаке + 5×MoF минут. HT171.'],
 ['mustard','Mustard Gas',6,10,'aerosol','contact/respiratory',null,'Контакт: HT−4, 1 tox ×24/8 ч; вдыхание: задержка 2 ч, HT−1, 1d tox ×6/час. B439.']
];
const BASE_CHEMICALS=Object.freeze(Object.fromEntries(rows.map(([id,name,tl,cost,phase,route,modifier,brief])=>[id,Object.freeze({id,name,tl,cost,phase,route,modifier,brief,source:['tear','tear_vomit','mustard'].includes(id)?id==='tear_vomit'?'HT171':'B439':id==='disassembler'||id==='replicator'?'UT161,169':'UT160'})])));
const extra=[
 {id:'nerve_poison',name:'Nerve Poison',tl:9,cost:10,phase:'injection',route:'injection',modifier:-7,brief:'HT−7: 1d tox, 6 циклов по минуте; неврологические последствия по утрате HP.',source:'UT161',cycles:{count:6,intervalSeconds:60}},
 {id:'sleep_poison',name:'Sleep Poison',tl:9,cost:0.5,phase:'injection',route:'injection',modifier:-6,brief:'HT−6: сонливость; провал ≥5 — без сознания MoF минут.',source:'UT161'},
 {id:'nerve_contact',name:'Nerve Poison — Contact',tl:9,cost:100,phase:'gel',route:'contact',modifier:-5,brief:'Контактная версия: HT−5; 1d tox, 6 циклов по минуте.',source:'UT161',deliveries:['contact-application']},
 {id:'sleep_contact',name:'Sleep Poison — Contact',tl:9,cost:5,phase:'gel',route:'contact',modifier:-4,brief:'Контактная версия: HT−4; сонливость, при провале ≥5 — без сознания MoF минут.',source:'UT161',deliveries:['contact-application']},
 {id:'splatter',name:'Splatter Nano',tl:11,cost:100,phase:'injection',route:'injection',modifier:null,brief:'Только follow-up. После ≥1 минуты: 1d tox за минуту циркуляции, максимум 30d на дозу; запуск по таймеру/сигналу вручную.',source:'UT162'},
 {id:'parasite_seed',name:'Parasite Seed',tl:12,cost:10000,phase:'capsule',route:'capsule',modifier:-4,brief:'Капсула размером с яблочное семя: каждый час HT−4; успех уничтожает её, провал −3 HT до превращения при HT0. Вручную.',source:'UT162',deliveries:['capsule']},
 {id:'parasite_seed_mind',name:'Parasite Seed — Mind Trapping',tl:12,cost:100000,phase:'capsule',route:'capsule',modifier:-4,brief:'Parasite Seed с захватом сознания; капсула требует подходящего устройства. Последствия вручную.',source:'UT162',deliveries:['capsule']}
];
const nanos=[
 ['nanoburn','Nanoburn',10,5,-6,'HT−6: паралич 3×MoF минут; 1d−1 tox каждые 3 минуты следующие 30 минут. Только углеродная жизнь.'],
 ['nanotracers','Nanotracers',10,100,null,'Через минуту: сигнал/запах не менее суток, +5 к подходящему выслеживанию при известном и обнаруживаемом сигнале.'],
 ['shrike','Shrike Nano',11,500,null,'Каждую минуту состязание с Aegis: уничтожение проигравшего агента; ничья продолжает борьбу. Уровни и усиление дозой — вручную.'],
 ['dominator','Dominator Nano',12,null,-6,'Задержка 6 часов, HT−6: запрограммированный допустимый ментальный недостаток, постоянный эффект. Программа и последствия вручную.'],
 ['dominator_fast','Dominator Nano (TL12^)',12,null,-6,'Задержка 1 минута, HT−6: запрограммированный допустимый ментальный недостаток. Цена ×2; последствия вручную.']
];
for(const [baseId,name,tl,cost,modifier,brief]of nanos)for(const [suffix,phase,route,multiplier]of [
 ['injection','injection','injection',1],['blood','liquid','blood',2],['contact_mist','aerosol','contact',1],
 ['contact_gas','gas','contact',10],['contact_gel','gel','contact',2],['respiratory','aerosol','respiratory',5]
])extra.push({id:baseId+'_'+suffix,name:name+' — '+({injection:'инъекция',blood:'слизистые',contact_mist:'контактный туман',contact_gas:'контактный газ',contact_gel:'контактный гель',respiratory:'вдыхание'}[suffix]),baseId,tl,cost:cost==null?null:cost*multiplier,phase,route,modifier,brief,source:tl===10?'UT161':'UT161–162',metabolic:true,superscience:baseId==='dominator_fast',...(phase==='gel'?{deliveries:['contact-application']}:{}),costBasis:baseId.startsWith('dominator')?'$100 × стоимость недостатков; ×2 TL12^; ×2 обратимое исполнение; затем множитель доставки':null});
function timing(f){
 if(['nerve','nerve_poison','nerve_contact'].includes(f.id))return {duration:{manual:true},repeats:{count:6,intervalSeconds:60},outcomes:{failureDamage:'1d tox',hpThresholds:[{lostFraction:1/3,effect:'coughing, mild neurological disorder'},{lostFraction:1/2,effect:'nausea, severe neurological disorder'},{lostFraction:2/3,effect:'crippling neurological disorder'}]}};
 if(['sleep','sleep_poison','sleep_contact'].includes(f.id))return {duration:{unconsciousMinutesPerMoF:1,...(f.id==='sleep'?{then:'ordinary sleep'}:{unconsciousFailureThreshold:5,otherwise:'drowsy'})},repeats:{none:true}};
 if(f.id==='riot')return {duration:{whileExposed:true,afterExposureMinutesPerMoF:1,afterExposureThreshold:5},repeats:{intervalSeconds:1,whileExposed:true},outcomes:{failure:'nausea',failureBy5:'retching'}};
 if(f.id==='paralysis')return {duration:{minorFailureSeconds:1,paralysisMinutesPerMoF:1,paralysisFailureThreshold:3},repeats:{intervalSeconds:1,whileExposed:true},outcomes:{failureBy1or2:'fall and immobility',criticalFailure:'1d damage and coma'}};
 if(f.id==='pheromone')return {duration:{whileExposed:true,afterExposureMinutesPerMoF:1},repeats:{manual:true},outcomes:{failure:'Lecherousness (9)',restriction:'same species'}};
 if(['tear','tear_vomit'].includes(f.id))return {duration:{whileExposed:true,coughBlindMinutesPerMoF:1,...(f.id==='tear_vomit'?{retchingMinutesPerMoF:5}:{})},repeats:{manual:true}};
 if(f.id==='mustard')return {duration:{manual:true},repeats:{contact:{delaySeconds:0,intervalSeconds:28800,count:24,damage:'1 tox'},respiratory:{delaySeconds:7200,intervalSeconds:3600,count:6,damage:'1d tox'}}};
 if(f.baseId==='nanoburn')return {duration:{paralysisMinutesPerMoF:3},repeats:{intervalSeconds:180,durationSeconds:1800,damage:'1d-1 tox',requiresParalysis:true},outcomes:{restriction:'carbon-based life'}};
 if(f.baseId==='nanotracers')return {duration:{delaySeconds:60,minimumSeconds:86400},repeats:{none:true},outcomes:{trackingBonus:5,requiresKnownDetectableSignal:true}};
 if(f.baseId==='shrike')return {duration:{untilContestResolved:true},repeats:{intervalSeconds:60,contest:'Aegis vs Shrike; source skills by TL'}};
 if(f.baseId?.startsWith('dominator'))return {duration:{delaySeconds:f.superscience?60:21600,permanent:true},repeats:{none:true},outcomes:{programmedDisadvantage:true,automaticActorChange:false}};
 if(f.id==='splatter')return {duration:{minimumDelaySeconds:60},repeats:{manualTrigger:true},outcomes:{dicePerMinute:1,maxDice:30,multiplyByDoses:true}};
 if(f.phase==='capsule')return {duration:{manual:true},repeats:{intervalSeconds:3600},outcomes:{success:'seed destroyed',failureHTLoss:3,atHTZero:'death and nanomorph transformation; manual'}};
 return {};
}
function enrich(f){
 const checks=Number.isInteger(f.modifier)?[{id:'initial',modifier:f.modifier,label:'Основное воздействие'}]:[];
 if(f.id==='nerve')checks.push({id:'residue',modifier:-3,label:'Остаточное загрязнение'});
 if(['tear','tear_vomit'].includes(f.id))checks.splice(0,checks.length,{id:'breathing',modifier:-2,label:'Кашель — дыхание'},{id:'eyes',modifier:-2,label:'Слепота — глаза'},...(f.id==='tear_vomit'?[{id:'vomit',modifier:-2,label:'Рвота — дыхание'}]:[]));
 if(f.id==='mustard')checks.push({id:'contact',modifier:-4,label:'Контакт — без задержки'},{id:'respiratory',modifier:-1,label:'Вдыхание — задержка 2 часа'});
 const deliveries=f.deliveries??(f.phase==='injection'?['injection']:['gas','aerosol'].includes(f.phase)?['aerosol','spray','vortex']:['liquid','foam','slime'].includes(f.phase)?['liquid','spray']:[]);
 return Object.freeze({...f,checks:Object.freeze(checks),deliveries:Object.freeze(deliveries),protection:f.route==='injection'?'Проникновение учитывается вручную; подтверждение DR не требуется.':f.route==='blood'?'Требуется попадание на слизистую или в открытую рану.':f.route.includes('respiratory')?'Защита дыхания блокирует соответствующее воздействие; глаза проверяются отдельно.':f.route==='contact'?'Нужен контакт; применимая герметичная защита блокирует воздействие.':'Защита зависит от действия состава.',immunities:f.metabolic?['Immunity to Metabolic Hazards']:['injection','contact','respiratory'].includes(f.route)?['применимый иммунитет к веществу']:[],duration:f.id==='musk'?{seconds:1209600}:f.id==='mea'?{seconds:43200}:f.id==='disassembler'?{seconds:15}:['smoke','colored','hot','prism','electromagnetic'].includes(f.id)?{minimum:60,maximum:240}:f.id==='radiant'?{minimum:30,maximum:120}:{manual:true},repeats:f.cycles??(['riot','paralysis'].includes(f.id)?{intervalSeconds:1}:f.id==='nerve'?{count:6,intervalSeconds:60}:f.baseId==='nanoburn'?{intervalSeconds:180,durationSeconds:1800}:{manual:true}),...timing(f)});
}
function freezeMetadata(value){
 if(value&&typeof value==='object'){for(const child of Object.values(value))freezeMetadata(child);Object.freeze(value);}return value;
}
export const CHEMICAL_SUBSTANCES=freezeMetadata(Object.fromEntries([...Object.values(BASE_CHEMICALS),...extra].map(f=>[f.id,enrich(f)])));
export const chemicalAllowed=(f,delivery)=>Array.isArray(f?.deliveries)&&f.deliveries.includes(delivery);
export function chemicalProfile(f,{delivery,radius=null,doses=1}={}){
 if(!f)return {};
 const chemical={version:1,id:f.id,name:f.name,delivery,route:f.route,checks:f.checks,protection:f.protection,immunities:f.immunities,duration:f.duration,repeats:f.repeats,outcomes:f.outcomes??{},brief:f.brief,source:f.source,doses,radius,...(f.phase==='slime'&&Number.isFinite(radius)?{directHitOnly:radius<1}:{}),costPerDose:f.cost,manualConsequences:true,penetrationConfirmationRequired:false};
 return {chemical,...(f.checks.length?{resistanceEffect:{version:1,id:'chemical-'+f.id,name:f.name,attribute:'HT',modifier:f.checks[0].modifier,condition:'fluid',halfRange:0,outcome:'fluid-exposure',source:f.source,brief:f.brief,chemical}}:{})};
}
