import {ltFlameProfile,ltFlameAdmission,ltFlameConfiguration,LT_FLAME_FUEL_REFERENCE} from '../lt-flame-source.js';
import {ammoTypeKey} from './ammo-inventory.js';
import {readActorStrength} from './strength-service.js';

const copy=v=>structuredClone(v),positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const slot=w=>w?.ammunitionInventory?.magazines.find(m=>m.id===w.ammunitionInventory.installedId&&!m.ltEarlyLegacy);
export const ltFlameCharge=w=>slot(w)?.ltEarlyCharges?.[0]??null;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function ltFlameTypeAssessment({modeId,type,catalogs,weapon,place=null}){
 const p=ltFlameProfile(modeId);if(!p)return null;
 const r=type?.recipe,q=r?.parameters??{},fit=q.fit,base=ltFlameAdmission(modeId,type?.ammoId,type?.kind);
 const linked=catalogs?.getMode(modeId)?.lt_ammo_item_ids?.includes(type?.ammoId)&&catalogs?.getAmmoItem('lt',type?.ammoId)?.weapon_mode_ids?.includes(modeId);
 const fitted=fit?.equipmentId===p.equipmentId&&typeof fit.weaponId==='string'&&fit.weaponId.length>0&&same(fit.barrels,[0])&&(!weapon||fit.weaponId===weapon.id)&&(place===null||place===0);
 const composition=p.system==='liquid'?positive(q.volumePints):p.system==='blowpipe'?positive(q.resinLb):positive(q.powderLb)&&(!p.linked||positive(q.fragmentsLb)&&['metal','pottery'].includes(q.fragmentsMaterial))&&(p.system!=='disposable'||['paper','bamboo'].includes(q.bodyMaterial));
 const valid=r?.version===1&&r.variantId==='lt_flame_load'&&(!r.variantIds||same(r.variantIds,['lt_flame_load']))&&['components','prepared'].includes(q.accounting)&&p.fuels.includes(q.fuel)&&composition&&
  (q.recovered!==true||p.system==='liquid'&&q.accounting==='prepared')&&
  (q.remainingSeconds===undefined||p.system==='liquid'&&q.recovered===true&&Number.isSafeInteger(q.remainingSeconds)&&q.remainingSeconds>0&&q.remainingSeconds<=p.seconds&&typeof q.sourceChargeId==='string');
 const allowed=type?.source==='catalog'&&type?.book==='lt'&&type?.kind==='ammo-item'&&base.status==='compatible'&&linked&&valid&&fitted;
 return {base,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:r?'user-defined':'reference',facts:{modeId,ammoId:type?.ammoId,source:p.source},
  reason:!fitted?'Партия должна относиться к этому экземпляру.':!valid?'Нужны отдельная партия, подходящий состав и измеренное владельцем количество компонентов.':base.reasons[0]?.message};
}
export function ltFlameRequirements(p,q){
 // The stock unit already IS the measured fuel/powder/resin portion. Only independent
 // auxiliaries live in the existing component ledger; never require a second fuel unit.
 return [{kind:'igniter',amount:1},...(p.system==='disposable'?[{kind:'body',amount:1,material:q.bodyMaterial}]:[])].map(r=>({...r,key:JSON.stringify(['lt-flame',p.equipmentId,q.fit?.weaponId,q.fuel,r.kind,r.material??null])}));
}
export function ltFlameFuelComponent(p,q){
 return {kind:'fuel',quantity:1,origin:'physical-stock',fuel:q.fuel,...(p.system==='liquid'?{volumePints:q.volumePints,measurementOrigin:'owner-entered',publishedUnit:copy(LT_FLAME_FUEL_REFERENCE[q.fuel])}:p.system==='blowpipe'?{resinLb:q.resinLb}:{powderLb:q.powderLb,...(p.linked?{fragmentsLb:q.fragmentsLb,fragmentsMaterial:q.fragmentsMaterial}:{})})};
}
export function ltFlameStrength(actor,weapon){
 const s=readActorStrength(actor),c=ltFlameConfiguration(weapon),arm=c.applyArmST?s.advantages.levels.arm+s.modifiers.arm:0;
 return {base:s.kinds.st.effective,arm,striking:0,lifting:0,applyArmST:c.applyArmST,effective:s.kinds.st.effective===null?null:s.kinds.st.effective+arm,revision:s.revision};
}
export function ltFlameReadiness(weapon){
 const p=ltFlameProfile(weapon),c=ltFlameCharge(weapon);if(!p)return null;
 if(!c?.flame||c.parameters?.fit?.weaponId!==weapon.id||c.ammoId!==p.ammoId)return 'Нет подготовленного физического заряда этой огнемётной системы.';
 if(!Number.isSafeInteger(c.flame.remaining)||c.flame.remaining<1||c.flame.remaining>p.seconds||!Number.isSafeInteger(c.flame.elapsed)||c.flame.elapsed<0||c.flame.nominal!==p.seconds)return 'Топливо / горящий заряд израсходованы или их состояние не подтверждено.';
 if(c.flame.stage!=='ready')return 'Выполните подготовку и поджигание в окне «Патроны».';
 return null;
}
export function ltFlameAmmunition(weapon){
 const m=slot(weapon),c=ltFlameCharge(weapon);
 return {kind:'physical-magazine',magazineId:m?.id??null,available:c?.flame?.remaining>0?1:0,total:weapon.totalAmmo??0,ammoKey:m?.ammoKey??null,type:copy(c?.type??weapon.ammunitionInventory?.stocks.find(s=>s.key===m?.ammoKey)?.type??null),
  ltFlame:c?.flame?copy(c.flame):null};
}
export function ltFlameShotPlan(weapon){
 const m=slot(weapon),c=ltFlameCharge(weapon),p=ltFlameProfile(weapon);
 return m?[{magazineId:m.id,place:0,ammoKey:m.ammoKey,spent:c?.flame?.remaining===1?1:0,secondsSpent:p?.jet?1:0,charge:copy(c)}]:[];
}
export function consumeLTFlameShot(weapon,plan){
 if(!same(ltFlameShotPlan(weapon),plan))throw Error('Состояние огнемётного заряда изменилось во время атаки.');
 const p=ltFlameProfile(weapon),c=ltFlameCharge(weapon),m=slot(weapon);if(ltFlameReadiness(weapon))throw Error(ltFlameReadiness(weapon));
 c.flame.remaining--;c.flame.elapsed++;c.flame.used=true;c.flame.revision++;
 if(p.system==='liquid')c.flame.flowing=true;
 if(!c.flame.remaining){m.rounds=0;m.ammoKey=null;m.ltEarlyCharges=[];weapon.ltEarly.flameUsed=true;}
}
/** Runs inside AmmoService's existing Actor queue. Component portions have an explicit measured composition. */
export async function applyLTFlameOperation(weapon,operation,args,{catalogs,actor,makeId=()=>crypto.randomUUID(),runCheck}={}){
 const p=ltFlameProfile(weapon);if(!p)return false;
 const e=weapon.ltEarly,i=weapon.ammunitionInventory,m=slot(weapon),c=ltFlameCharge(weapon),f=c?.flame;
 const assertCurrent=()=>{if(!c||!f||args.chargeId!==c.id||args.revision!==f.revision)throw Error('Заряд уже изменился. Откройте его состояние заново.');};
 if(operation==='lt-early-configure'){e.settings=ltFlameConfiguration({...weapon,ltEarly:{settings:args.settings}});return true;}
 if(operation==='lt-early-component'){
  if(!Number.isSafeInteger(args.amount)||!args.amount||!ltFlameTypeAssessment({modeId:p.modeId,type:args.type,catalogs,weapon}).applicationAllowed)throw Error('Выберите подготовленную партию и целое число мерных порций.');
  const r=ltFlameRequirements(p,args.type.recipe.parameters).find(r=>r.kind===args.kind);if(!r)throw Error('Чужой компонент.');
  let s=e.components.find(s=>s.key===r.key);if(!s){s={...r,rounds:0};e.components.push(s);}if(!Number.isSafeInteger(s.rounds+args.amount)||s.rounds+args.amount<0)throw Error('Недостаточно компонентов.');s.rounds+=args.amount;return true;
 }
 if(operation==='install'){
  const target=i.magazines.find(m=>m.id===args.magazineId);
  if(!target||target.ltEarlyLegacy||target.ltEarlyPlace!==0||target.capacity!==1||target.rounds&&(!target.ltEarlyCharges?.[0]?.flame||!ltFlameTypeAssessment({modeId:p.modeId,type:target.ltEarlyCharges[0].type,catalogs,weapon}).applicationAllowed))throw Error('Выберите штатное зарядное место огнемётной системы. Прежний контейнер допускает только разгрузку.');
  i.installedId=target.id;return true;
 }
 if(operation==='load'||operation==='lt-flame-replace'){
  const stock=i.stocks.find(s=>s.key===args.ammoKey),q=stock?.type?.recipe?.parameters;
  if(!m||m.id!==args.magazineId||m.ltEarlyLegacy||m.rounds||args.amount!==1||!stock||stock.rounds<1||!ltFlameTypeAssessment({modeId:p.modeId,type:stock.type,catalogs,weapon}).applicationAllowed)throw Error('Нужна одна физическая единица подходящей партии и пустое штатное зарядное место.');
  if(p.system==='disposable'&&e.flameUsed&&operation!=='lt-flame-replace')throw Error('Fire-Lance использован. Явно замените целое одноразовое устройство новой физической единицей.');
  if(p.rechargeSeconds&&e.flameUsed&&!e.flameRecharge)throw Error('Сначала завершите перезарядку и проверку Explosives (Fireworks).');
  const requirements=ltFlameRequirements(p,q),debit=requirements.filter(r=>q.accounting==='components'||q.recovered&&r.kind==='igniter');
  for(const r of debit)if((e.components.find(s=>s.key===r.key)?.rounds??0)<1)throw Error('Нет отдельного компонента: '+(r.kind==='body'?'новый одноразовый корпус':'запал / фитиль'));
  for(const r of debit)e.components.find(s=>s.key===r.key).rounds--;
  stock.rounds--;m.rounds=1;m.ammoKey=stock.key;m.ltEarlyCharges=[{version:2,id:makeId(),place:0,type:copy(stock.type),ammoId:p.ammoId,ammoKey:stock.key,parameters:copy(q),stockUnits:1,stockKind:q.accounting==='components'?'measured-fuel-portion':'prepared-assembly',accounting:q.accounting,debitedAt:'load',components:[ltFlameFuelComponent(p,q),...copy(requirements)],componentDebits:copy(debit),source:p.source,
   flame:{remaining:q.remainingSeconds??p.seconds,nominal:p.seconds,elapsed:0,stage:'loaded',ignited:false,used:false,revision:0,checks:[],deviceId:makeId()}}];
  e.flameUsed=false;e.flameRecharge=null;return true;
 }
 if(operation==='lt-flame-recharge'){
  if(!p.rechargeSeconds||m?.rounds||!e.flameUsed||e.flameRecharge||args.confirmed!==true||args.expectedRevision!==(e.flameRechargeRevision??0)||args.seconds!==p.rechargeSeconds)throw Error('Подтвердите новую выполненную перезарядку: '+p.rechargeSeconds+' секунд; прежняя форма повторно не применяется.');
  const check=await runCheck?.({kind:'fireworks',manual:args.manualCheck});if(!check?.rolled)return {cancelled:true};
  e.flameRecharge=check.success?copy(check):null;e.flameRechargeAttempt=copy(check);e.flameRechargeRevision=(e.flameRechargeRevision??0)+1;return true;
 }
 if(operation==='lt-flame-ready'){
  assertCurrent();if(args.confirmed!==true||f.remaining<1)throw Error('Подтвердите выполненное действие подготовки.');
  if(p.system==='liquid'){
   if(f.stage!=='loaded'||args.seconds!==10)throw Error('Подготовка занимает 10 секунд; повторная подготовка активной подачи не нужна.');
   if(p.name==='Fire-Siphon'){
    if(!positive(args.crewST)||args.crew!==2)throw Error('Нужны два оператора и численное ST второго оператора.');
    const strength=ltFlameStrength(actor,weapon);if(!positive(strength.effective))throw Error('ST первого оператора не определена.');
    const check=await runCheck?.({kind:'pump',averageST:Math.floor((strength.effective+args.crewST)/2),crewST:[strength.effective,args.crewST]});
    if(!check?.rolled)return {cancelled:true};f.checks.push(copy(check));if(!check.success){f.revision++;return true;}
   }
   f.stage='ready';f.ignited=true;f.flowing=false;
  }else if(p.system==='blowpipe'){
   if(f.stage!=='loaded'||args.seconds!==20||args.twoHands!==true)throw Error('Заряд и фитиль: 20 секунд подготовки двумя руками.');f.stage='ready';f.ignited=true;
  }else if(p.name==='Eruptor'){
   if(f.stage!=='loaded'||args.seconds!==1)throw Error('Поджигание Eruptor: один Ready.');f.stage='ready';f.ignited=true;e.flameUsed=true;
  }else{
   if(args.seconds!==1)throw Error('Каждый шаг требует отдельного Ready.');
   if(f.stage==='loaded')f.stage='held';else if(f.stage==='held'){f.stage='lit';f.ignited=true;e.flameUsed=true;}else if(f.stage==='lit'){f.stage='ready';f.remaining--;f.elapsed++;}else throw Error('Подготовка уже завершена.');
  }
  f.revision++;return true;
 }
 if(operation==='lt-flame-advance'){
  assertCurrent();if(!p.irreversible||!f.ignited||!Number.isSafeInteger(args.seconds)||args.seconds<1||args.seconds>f.remaining)throw Error('Укажите фактически прошедшие секунды горения.');
  f.remaining-=args.seconds;f.elapsed+=args.seconds;f.used=true;f.revision++;
  if(!f.remaining){m.rounds=0;m.ammoKey=null;m.ltEarlyCharges=[];e.flameUsed=true;}return true;
 }
 if(operation==='lt-flame-stop'){
  assertCurrent();if(args.confirmed!==true)throw Error('Подтвердите прекращение подачи / гашение.');
  if(p.system==='liquid'){f.stage='loaded';f.flowing=false;f.revision++;}
  else if(p.irreversible&&f.ignited){m.rounds=0;m.ammoKey=null;m.ltEarlyCharges=[];e.flameUsed=true;}
  else throw Error('Нет активного непрерывного горения.');return true;
 }
 if(operation==='unload'&&i.magazines.find(m=>m.id===args.magazineId)?.ltEarlyLegacy)return false;
 if(operation==='unload'&&c){
  assertCurrent();if(args.amount!==1)throw Error('Разгружается одна физическая единица.');
  if(p.irreversible&&f.ignited)throw Error('Горящий пиротехнический заряд не возвращается в запас. Используйте гашение.');
  const partial=f.remaining<(c.parameters.remainingSeconds??p.seconds)||f.ignited;
  if(partial&&p.system!=='liquid')throw Error('Подготовленный горящий заряд не возвращается как новый.');
  if(partial){
   if(!positive(args.remainingVolumePints)||args.remainingVolumePints>c.parameters.volumePints)throw Error('Измерьте фактический остаток жидкости; автоматического перевода секунд в пинты нет.');
   const type=copy(c.type);Object.assign(type.recipe.parameters,{accounting:'prepared',volumePints:args.remainingVolumePints,remainingSeconds:f.remaining,recovered:true,sourceChargeId:c.id});type.recipe.customId='lt-residual-'+c.id;type.name+=' — измеренный остаток';type.key=ammoTypeKey(type);i.stocks.push({key:type.key,type,rounds:1});
  }else{
   for(const r of c.componentDebits??(c.accounting==='components'?c.components:[])){let s=e.components.find(s=>s.key===r.key);if(!s){s={...r,rounds:0};e.components.push(s);}s.rounds++;}
   let stock=i.stocks.find(s=>s.key===c.ammoKey&&same(s.type,c.type));if(!stock){const type=copy(c.type);type.recipe.customId='lt-unloaded-'+c.id;type.key=ammoTypeKey(type);stock={key:type.key,type,rounds:0};i.stocks.push(stock);}stock.rounds++;
  }
  m.rounds=0;m.ammoKey=null;m.ltEarlyCharges=[];return true;
 }
 if(['consume','add-magazines','delete-magazine','install','lt-early-configure','lt-early-flip'].includes(operation))throw Error('У этой системы одно штатное зарядное место; ресурс расходуется её процедурой.');
 return false;
}
export function ltFlameDamage({modeId,actor,raw={},attack={},weapon,type,catalogs,context={}}={}){
 const p=ltFlameProfile(modeId);if(!p)return null;
 const fail=reason=>({status:'unresolved',nativeSafe:false,formula:null,rawFormula:raw.damage,reason,components:[],effectiveChanges:{},transformations:[],support:{manual:[]},rules:{ltEarly:{modeId,kind:'flame',reason}}});
 const assessment=ltFlameTypeAssessment({modeId,type,catalogs,weapon});if(!assessment.applicationAllowed)return fail(assessment.reason);
 const c=ltFlameCharge(weapon),strength=ltFlameStrength(actor,weapon),configuration=ltFlameConfiguration(weapon),overrides={...(!attack.standaloneRef?{...(/^\d+d(?:[+-]\d+)? burn$/.test(raw.damage)?{damage:raw.damage}:{}),...(raw.range&&!p.stats.range.startsWith('x')?{range:raw.range}:{})}:{}),...attack.ltEarlyOverrides};
 const rangeText=String(overrides.range??p.stats.range).replace(/[×¥]/g,'x').toLowerCase(),numbers=rangeText.match(/(?:\d*\.)?\d+/g)?.map(Number);let minimum=0,halfDamage=null,maximum;
 if(rangeText.startsWith('x')){if(!positive(strength.effective))return fail('Не определена общая ST для дальности.');maximum=Number((numbers.at(-1)*strength.effective).toFixed(6));if(numbers.length>1)halfDamage=Number((numbers[0]*strength.effective).toFixed(6));}
 else if(rangeText.includes('-')){[minimum,maximum]=numbers;}else{maximum=numbers?.at(-1);if(numbers?.length>1)halfDamage=numbers[0];}
 if(!positive(maximum))return fail('Не определена дальность огнемётной системы.');
 const formula=overrides.damage??p.stats.damage;if(!/^\d+d(?:[+-]\d+)? burn$/.test(formula))return fail('Нужна численная формула burn.');
 const components=[{role:'kinetic',relation:'primary',status:'resolved',formula},...(p.linked?[{role:'linked',relation:'linked',status:'resolved',formula:'1 pi-',label:'Частицы: 1 pi-'}]:[])];
 const brief=p.system==='blowpipe'?['Конус: ширина у края '+maximum+' ярд.; цели определяются вручную. LT86.']:
  p.ongoingDice?['После попадания: 1d burn/с в течение '+p.ongoingDice+' с; либо пятно на воде радиусом 2 ярда. LT86.',...(type.recipe.parameters.fuel==='greek-fire'?['Греческий огонь: вода не гасит. LT84.']:['Нафта: легко воспламеняется. LT84.'])]:['Непрерывное горение одного заряда; '+p.seconds+' с. LT86.'];
 const facts={version:1,kind:'flame',modeId,equipmentId:p.equipmentId,ammoId:p.ammoId,system:p.system,configuration,strength,range:{minimum,halfDamage,maximum,source:rangeText},composition:copy(type.recipe.parameters),
  chargeId:c?.id??null,deviceId:c?.flame?.deviceId??null,stateBefore:copy(c?.flame??null),secondsSpent:p.jet?1:0,physicalUnitsSpent:c?.flame?.remaining===1?1:0,source:p.source,brief,fuelComponent:ltFlameFuelComponent(p,type.recipe.parameters),fuelEffects:type.recipe.parameters.fuel==='greek-fire'?{burnsOnWater:true,waterDoesNotExtinguish:true,source:'LT84'}:type.recipe.parameters.fuel==='naphtha'?{highlyFlammable:true,source:'LT84'}:null,
  ...(p.ongoingDice?{ongoing:{formula:'1d burn',durationDice:p.ongoingDice,waterRadius:2,procedure:'manual-confirmed-impact'}}:{}),
  ...(p.system==='blowpipe'?{cone:{length:maximum,terminalWidth:maximum,targets:'manual',readyHands:2,attackHands:1,chargeCost:0.5}}:{}),...(p.name==='Eruptor'?{mount:configuration.staticMount?{cost:270,weightLb:13.5}:null}:{})};
 return {status:'resolved',nativeSafe:true,formula,rawFormula:raw.damage,reason:null,components,effectiveChanges:{damage:formula,range:halfDamage===null?minimum?minimum+'-'+maximum:String(maximum):halfDamage+'/'+maximum,rof:p.jet?'Jet':'1',acc:null,rcl:null,st:overrides.st??p.stats.strength,bulk:overrides.bulk??p.stats.bulk},
  transformations:[],support:{manual:brief.map((text,n)=>({id:'lt-flame-'+n,text}))},rules:{ltEarly:facts,ltFlame:facts,ammunitionSource:p.source,...(p.linked?{componentOrder:true}:{}),ballisticRange:{minimum,halfDamage,maximum},projectiles:{b409Eligible:false,physicalShotsMax:1,projectilesPerShot:1}}};
}
