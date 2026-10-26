import {ltEarlyProfile,ltEarlyFitValid,ltEarlyPhysicalAdmission,ltEarlyImprovisedId,ltEarlyConfiguration,LT_TEN_EYED_MODES} from '../lt-early-firearms-source.js';
import {ammoTypeKey,validateInventory,projectAmmoInventory,applyInventoryOperation,installedMagazine} from './ammo-inventory.js';
import {htDamageDice,parseDamageRange} from './kinetic-damage-math.js';
import {parseAccuracyComponents} from './weapon-attack-overrides.js';
import {ltArtilleryTypeAssessment,ltArtilleryRequirements,ltArtilleryReadiness,ltArtilleryLoadError,ltArtilleryCocking,ltArtilleryManifest,ltArtilleryDamage} from './lt-artillery.js';
import {ltFlameTypeAssessment,ltFlameRequirements,ltFlameReadiness,ltFlameAmmunition,ltFlameShotPlan,consumeLTFlameShot,applyLTFlameOperation,ltFlameDamage} from './lt-flame.js';

const clone=value=>structuredClone(value);
const positive=n=>Number.isSafeInteger(n)&&n>0;
const setEarlyMode=(weapon,id)=>{if(weapon.standaloneWeaponId)weapon.standaloneModeId=id;else weapon.catalogModeId=id;};
export function initializeLTEarlyCarrier(weapon,{newCarrier=false}={}){
 const p=ltEarlyProfile(weapon);if(!p)return weapon;
 if(!weapon.ammunitionInventory)weapon.ammunitionInventory={version:1,stocks:[],magazines:[],installedId:null};
 const i=weapon.ammunitionInventory;if(!validateInventory(i,weapon.id))return weapon;
 for(const m of i.magazines)if(m.ltEarlyPlace===undefined)m.ltEarlyLegacy=true;
 weapon.ltEarly??={version:1,settings:{},components:[],face:0,progress:[0,0]};
 weapon.ammunitionFeed={kind:p.kind==='puckle'?'detachable':'fixed',source:p.source};
 if(!weapon.ltEarly.geometryInitialized&&!i.magazines.some(m=>m.ltEarlyPlace!==undefined)){
  // Old unproven loads remain unloadable. They never become prepared shots by opening a window.
  for(const m of i.magazines)m.ltEarlyLegacy=true;
  if(newCarrier&&i.magazines.every(m=>m.rounds===0))i.magazines=[];
  const count=p.kind==='puckle'&&i.magazines.length?0:p.kind==='puckle'?1:p.places;
  if(p.kind==='puckle'&&i.magazines.length)for(const [n,m]of i.magazines.entries()){m.ltEarlyPlace=n;m.ltEarlyCharges=[];}
  for(let n=0;n<count;n++){let id=weapon.id+'-lt-p4-'+n;while(i.magazines.some(m=>m.id===id))id+='-new';i.magazines.push({id,weaponId:weapon.id,capacity:p.containerCapacity??(p.kind==='puckle'?9:1),rounds:0,ammoKey:null,ltEarlyPlace:n,ltEarlyCharges:[]});}
  if(!i.installedId||newCarrier)i.installedId=i.magazines.find(m=>m.ltEarlyPlace===0)?.id??null;
 }
 weapon.ltEarly.geometryInitialized=true;
 if(p.kind==='ten-eyed')setEarlyMode(weapon,LT_TEN_EYED_MODES[Math.min(4,weapon.ltEarly.progress[weapon.ltEarly.face]??0)]);
 projectAmmoInventory(weapon);return weapon;
}
export function ltEarlySlots(weapon){return (weapon?.ammunitionInventory?.magazines??[]).filter(m=>Number.isSafeInteger(m.ltEarlyPlace)&&!m.ltEarlyLegacy).sort((a,b)=>a.ltEarlyPlace-b.ltEarlyPlace);}
export function ltEarlyActiveSlot(weapon){
 const p=ltEarlyProfile(weapon);if(!p)return null;
 if(p.kind==='ten-eyed'){const phase=weapon.ltEarly?.progress?.[weapon.ltEarly?.face??0]??0;return phase>=5?null:ltEarlySlots(weapon).find(m=>m.ltEarlyPlace===(weapon.ltEarly?.face??0)*5+phase)??null;}
 if(p.kind==='facing')return ltEarlySlots(weapon).find(m=>m.ltEarlyPlace===(weapon.ltEarly?.face??0))??null;
 return installedMagazine(weapon);
}
export function ltEarlyTypeAssessment({modeId,type,catalogs,weapon=null,place=null}){
 const p=ltEarlyProfile(modeId);if(!p||type?.book!=='lt')return null;
 if(p.kind==='artillery')return ltArtilleryTypeAssessment({modeId,type,catalogs,weapon,place});
 if(p.kind==='flame')return ltFlameTypeAssessment({modeId,type,catalogs,weapon,place});
 const id=type.ammoId,r=type.recipe,parameters=r?.parameters??{},fit=parameters.fit;
 const source=ltEarlyPhysicalAdmission(modeId,id,type.kind,fit);
 const linked=catalogs?.getMode(modeId)?.lt_ammo_item_ids?.includes(id)&&catalogs?.getAmmoItem('lt',id)?.weapon_mode_ids?.includes(modeId);
 const validRecipe=!r||r.version===1&&r.variantId==='lt_early_load'&&(!r.variantIds||r.variantIds.length===1&&r.variantIds[0]===r.variantId)&&
  ['components','prepared'].includes(parameters.accounting)&&['loose','measured','paper','cloth'].includes(parameters.loading)&&(parameters.loading!=='cloth'||p.source==='LT88')&&
  parameters.powder===p.powder&&['normal','substandard'].includes(parameters.powderQuality??'normal')&&
  ['boosted','careful'].every(k=>parameters[k]===undefined||typeof parameters[k]==='boolean')&&
  (!parameters.boosted||['checked','exceeded'].includes(parameters.safety))&&(!parameters.careful||p.muzzleloading&&['Musket','Rifle'].includes(p.governing_skill.skill.specialization));
 const actualFit=!weapon||!r||fit?.weaponId===weapon.id&&ltEarlyFitValid(p,fit)&&(place===null||fit.barrels.includes(place));
 const allowed=type.source==='catalog'&&type.kind==='ammo-item'&&linked&&source?.status==='compatible'&&validRecipe&&actualFit;
 return {base:source,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:r?'user-defined':'reference',facts:{modeId,ammoId:id,source:p.source},reason:!actualFit?'Партия подогнана к другому экземпляру или стволу.':!validRecipe?'Параметры подготовленной партии LT недопустимы.':source?.reasons?.[0]?.message};
}
export function ltEarlyPowderRequirements(p,parameters,ammoId){
 if(p.kind==='artillery')return ltArtilleryRequirements(p,parameters,ammoId);
 if(p.kind==='flame')return ltFlameRequirements(p,parameters);
 const loading=parameters.loading??'loose';
 return [{kind:'propellant',powder:p.powder,ammoId,powderQuality:parameters.powderQuality??'normal',boosted:parameters.boosted===true,form:loading,amount:1},
  {kind:'priming',powder:p.powder,ammoId,amount:1},{kind:loading==='paper'?'paper':loading==='cloth'?'cloth':'wadding',ammoId,amount:1}].map(r=>({...r,key:JSON.stringify([r.kind,r.powder??null,r.ammoId,r.powderQuality??null,r.boosted??null,r.form??null])}));
}
export function ltEarlyReadiness(weapon,modeId=weapon?.standaloneModeId??weapon?.catalogModeId){
 const p=ltEarlyProfile(modeId);if(!p)return null;
 if(p.kind==='flame')return ltFlameReadiness(weapon);
 if(p.kind==='artillery'){const reason=ltArtilleryReadiness(weapon);if(reason)return reason;}
 const slot=ltEarlyActiveSlot(weapon);
 if(!ltEarlyConfiguration(weapon).ignitionReady)return 'Подготовьте запал / механизм и явно отметьте готовность в «Патронах».';
 if(p.kind==='ten-eyed'){
  const phase=weapon.ltEarly?.progress?.[weapon.ltEarly?.face??0]??0;
  if(phase>=5)return 'Пять зарядов этой стороны использованы. Разверните оружие за один Ready.';
  if(modeId!==LT_TEN_EYED_MODES[phase])return 'Профиль Ten-Eyed определяется текущим зарядным местом, а не свободным выбором режима.';
 }
 if(!slot||slot.ltEarlyLegacy)return 'Старый заряд не подтверждён как полный. Его можно разрядить; снарядите проверенную партию LT.';
 const slots=p.kind==='duck'?ltEarlySlots(weapon):[slot];
 if(slots.length!==(p.kind==='duck'?4:1)||slots.some(m=>m.rounds<1||m.ltEarlyCharges?.length!==m.rounds))return p.kind==='duck'?'Для залпа Duck’s Foot нужны четыре полностью подготовленных ствола.':'В выбранном зарядном месте нет полного подготовленного выстрела.';
 if(slots.some(m=>m.ltEarlyCharges.some(c=>c.parameters?.fit?.weaponId!==weapon.id||!ltEarlyFitValid(p,c.parameters.fit)||!c.parameters.fit.barrels.includes(p.kind==='puckle'?c.chamber:m.ltEarlyPlace))))return 'Подгонка подготовленного заряда не соответствует этому экземпляру / зарядному месту.';
 if(p.kind==='duck'&&new Set(slots.map(m=>JSON.stringify(m.ltEarlyCharges[0]?.type))).size!==1)return 'Четыре ствола Duck’s Foot должны иметь одну подтверждённую партию для общего профиля залпа.';
 return null;
}
export function ltEarlyAmmunition(weapon){
 const p=ltEarlyProfile(weapon);if(!p)return null;
 if(p.kind==='flame')return ltFlameAmmunition(weapon);
 const i=weapon.ammunitionInventory,slot=ltEarlyActiveSlot(weapon);if(!i||!slot){
  const old=i?.magazines.find(m=>m.id===i.installedId&&(m.ltEarlyLegacy||m.ltEarlyPlace===undefined));
  return {kind:'physical-magazine',magazineId:old?.id??null,available:0,total:weapon.totalAmmo??0,ammoKey:old?.ammoKey??null,type:clone(i?.stocks.find(s=>s.key===old?.ammoKey)?.type??null)};
 }
 const physical=p.kind==='duck'?ltEarlySlots(weapon).filter(m=>m.rounds&&m.ammoKey===slot.ammoKey).length:slot.rounds;
 return {kind:'physical-magazine',magazineId:slot.id,available:physical,total:weapon.totalAmmo,ammoKey:slot.ammoKey,type:clone(slot.ltEarlyCharges?.[0]?.type??i.stocks.find(s=>s.key===slot.ammoKey)?.type??null)};
}
export function ltEarlyShotPlan(weapon){
 const p=ltEarlyProfile(weapon);if(!p)return null;
 if(p.kind==='flame')return ltFlameShotPlan(weapon);
 const ids=p.kind==='duck'?ltEarlySlots(weapon):[ltEarlyActiveSlot(weapon)];
 return ids.filter(Boolean).map(m=>({magazineId:m.id,place:m.ltEarlyPlace,ammoKey:m.ammoKey,spent:1,charge:clone(m.ltEarlyCharges?.[0]??null)}));
}
export function consumeLTEarlyShot(weapon,plan){
 if(ltEarlyProfile(weapon)?.kind==='flame')return consumeLTFlameShot(weapon,plan);
 const p=ltEarlyProfile(weapon);if(JSON.stringify(ltEarlyShotPlan(weapon))!==JSON.stringify(plan))throw Error('Подготовленные заряды LT изменились во время атаки.');
 for(const row of plan){const m=weapon.ammunitionInventory.magazines.find(m=>m.id===row.magazineId);m.rounds--;m.ltEarlyCharges.shift();if(!m.rounds)m.ammoKey=null;}
 if(p.kind==='artillery'){weapon.ltEarly.settings.ignitionReady=false;weapon.ltEarly.settings.visionReady=false;weapon.ltEarly.settings.procedureReady=false;}
 if(p.kind==='ten-eyed'){
  weapon.ltEarly.progress[weapon.ltEarly.face]++;
  const phase=weapon.ltEarly.progress[weapon.ltEarly.face];
  if(phase<5)setEarlyMode(weapon,LT_TEN_EYED_MODES[phase]);
  const next=ltEarlyActiveSlot(weapon);if(next)weapon.ammunitionInventory.installedId=next.id;
 }
 projectAmmoInventory(weapon);
}
export function applyLTEarlyOperation(weapon,operation,args,{catalogs,actor,makeId=()=>crypto.randomUUID(),runCheck}={}){
 const p=ltEarlyProfile(weapon);if(!p)return false;
 initializeLTEarlyCarrier(weapon);const e=weapon.ltEarly,i=weapon.ammunitionInventory;
 if(p.kind==='flame')return applyLTFlameOperation(weapon,operation,args,{catalogs,actor,makeId,runCheck});
 if(operation==='lt-early-configure'){
  const input=args.settings??{};e.settings=ltEarlyConfiguration({...weapon,ltEarly:{settings:input}});return true;
 }
 if(operation==='lt-early-component'){
  const {kind,amount,type}=args;if(!Number.isSafeInteger(amount)||amount===0||!ltEarlyTypeAssessment({modeId:p.modeId,type,catalogs,weapon})?.applicationAllowed)throw Error('Выберите проверенную партию и целое количество компонентов.');
  const requirement=ltEarlyPowderRequirements(p,type.recipe?.parameters??{},type.ammoId).find(r=>r.kind===kind);if(!requirement)throw Error('Компонент не относится к выбранному заряду.');
  let s=e.components.find(s=>s.key===requirement.key);
  if(!s){s={...requirement,rounds:0};e.components.push(s);}if(!Number.isSafeInteger(s.rounds+amount)||s.rounds+amount<0)throw Error('Недостаточно компонентов или количество выходит за допустимый целый диапазон.');s.rounds+=amount;return true;
 }
 if(operation==='lt-early-flip'){
  if(!['ten-eyed','facing'].includes(p.kind)||args.readyConfirmed!==true)throw Error('Подтвердите выполненный Ready для разворота.');
  if(p.kind==='ten-eyed'&&(e.progress[e.face]??0)<5&&ltEarlySlots(weapon).some(m=>Math.floor(m.ltEarlyPlace/5)===e.face&&m.rounds))throw Error('Сначала используйте / разрядите заряды текущей стороны Ten-Eyed.');
  e.face=1-(e.face??0);const phase=e.progress[e.face]??0;if(p.kind==='ten-eyed')setEarlyMode(weapon,LT_TEN_EYED_MODES[Math.min(4,phase)]);
  const m=ltEarlyActiveSlot(weapon);if(m)i.installedId=m.id;return true;
 }
 if(operation==='add-magazines'&&p.kind==='puckle'){
  if(args.capacity!==9||!positive(args.amount)||i.magazines.length+args.amount>10)throw Error('Puckle: цилиндр имеет девять камор; не более десяти цилиндров.');
  const max=Math.max(-1,...ltEarlySlots(weapon).map(m=>m.ltEarlyPlace));for(let n=1;n<=args.amount;n++)i.magazines.push({id:makeId(),weaponId:weapon.id,capacity:9,rounds:0,ammoKey:null,ltEarlyPlace:max+n,ltEarlyCharges:[]});return true;
 }
 const m=i.magazines.find(m=>m.id===args.magazineId);
 if(operation==='lt-early-adapt-cylinder'){
  if(p.kind!=='puckle'||!m?.ltEarlyLegacy||m.rounds||m.capacity!==9)throw Error('Подтвердить можно только прежний пустой цилиндр на девять камор.');
  delete m.ltEarlyLegacy;m.ltEarlyCharges=[];return true;
 }
 if(operation==='install'){
  if(!m)throw Error('Не найден ствол / цилиндр.');
  if(p.kind==='artillery'&&m.rounds){const type=m.ltEarlyCharges?.[0]?.type??i.stocks.find(s=>s.key===m.ammoKey)?.type;
   const assessment=ltEarlyTypeAssessment({modeId:p.modeId,type,catalogs,weapon});
   if(m.ltEarlyLegacy||!m.ltEarlyCharges?.length||!assessment?.applicationAllowed){const reason=assessment?.base?.reasons?.[0];const error=Error(reason?.message??'Прежний заряд не подтверждён: разрешена разгрузка.');error.code=reason?.code??'LT_ARTILLERY_PREPARATION_REQUIRED';throw error;}}
  if(p.kind==='puckle'&&args.readyConfirmed!==true)throw Error('Замена цилиндра Puckle требует подтверждения выполненных 15 Ready.');
  if(['ten-eyed','facing'].includes(p.kind)&&m.id!==ltEarlyActiveSlot(weapon)?.id)throw Error('Эта конструкция выбирает зарядное место по стороне и порядку; используйте разворот.');
  i.installedId=m.id;delete i.selectionEjected;return true;
 }
 if(operation==='load'){
  if(!m||m.ltEarlyLegacy||m.ltEarlyPlace===undefined)throw Error('Старый контейнер можно только разрядить; выберите штатное зарядное место.');
  const s=i.stocks.find(s=>s.key===args.ammoKey),n=args.amount,units=p.stockUnits??1;if(!s||!positive(n)||!Number.isSafeInteger(n*units)||s.rounds<n*units||m.rounds+n>m.capacity)throw Error('Недостаточно снарядов или свободных зарядных мест.');
  if(p.kind==='artillery'){const reason=ltArtilleryLoadError(weapon,actor);if(reason)throw Error(reason);}
  if(m.rounds&&m.ammoKey!==s.key)throw Error('Не смешивайте партии в одном цилиндре.');
  if(m.rounds&&m.ltEarlyCharges.some(c=>JSON.stringify(c.type?.recipe)!==JSON.stringify(s.type.recipe)))throw Error('В цилиндре осталась прежняя версия партии. Сначала разрядите её.');
  const assessment=ltEarlyTypeAssessment({modeId:p.modeId,type:s.type,catalogs,weapon,place:p.kind==='puckle'?0:m.ltEarlyPlace});
  if(!assessment?.applicationAllowed||!s.type.recipe)throw Error(assessment?.reason??'Нужна подготовленная партия с физическими компонентами и подгонкой.');
  const parameters=s.type.recipe.parameters;
  if(p.kind==='ten-eyed'){
   const face=Math.floor(m.ltEarlyPlace/5),progress=e.progress[face];
   if(progress>0&&progress<5&&ltEarlySlots(weapon).some(s=>Math.floor(s.ltEarlyPlace/5)===face&&s.rounds))throw Error('Сначала используйте или разрядите остаток этой стороны Ten-Eyed.');
   if(progress>0)e.progress[face]=0;
  }
  const chambers=p.kind==='puckle'?Array.from({length:9},(_,k)=>k).filter(k=>!m.ltEarlyCharges.some(c=>c.chamber===k)&&parameters.fit.barrels.includes(k)):[];
  if(p.kind==='puckle'&&chambers.length<n)throw Error('Для этих свободных камор подгонка партии не подтверждена.');
  const debit=parameters.accounting==='components'?ltEarlyPowderRequirements(p,parameters,s.type.ammoId):[];
  for(const r of debit){const component=e.components.find(s=>s.key===r.key);if(!component||component.rounds<n*r.amount)throw Error('Не хватает компонента: '+({propellant:'мерная навеска',priming:'затравка',wadding:'пыж',paper:'бумага',cloth:'тканевый пакет',clay:'прослойка глины',canvas:'холщовый мешок'}[r.kind]));}
  for(const r of debit)e.components.find(s=>s.key===r.key).rounds-=n*r.amount;
  s.rounds-=n*units;m.ammoKey=s.key;m.rounds+=n;m.ltEarlyCharges??=[];
  const artillery=p.kind==='artillery'?ltArtilleryManifest(p,parameters,s.type.ammoId):null;
  for(let k=0;k<n;k++)m.ltEarlyCharges.push({version:1,id:makeId(),place:m.ltEarlyPlace,...(p.kind==='puckle'?{chamber:chambers[k]}:{}),type:clone(s.type),ammoId:s.type.ammoId,ammoKey:s.key,parameters:clone(parameters),stockUnits:units,...(artillery?{artillery,cocking:ltArtilleryCocking(weapon,actor)}:{}),projectiles:artillery?.projectiles??p.pellets,components:[{kind:'projectile',quantity:units,physicalProjectiles:artillery?.projectiles??p.pellets},...ltEarlyPowderRequirements(p,parameters,s.type.ammoId).map(r=>({...r,quantity:r.amount}))],accounting:parameters.accounting,debitedAt:'load',source:p.source});
  if(p.kind==='ten-eyed'&&e.progress[Math.floor(m.ltEarlyPlace/5)]>=5)e.progress[Math.floor(m.ltEarlyPlace/5)]=0;
  const active=ltEarlyActiveSlot(weapon);if(['ten-eyed','facing'].includes(p.kind)&&active)i.installedId=active.id;
  return true;
 }
 if(operation==='unload'&&m&&!m.ltEarlyLegacy){
  const n=args.amount;if(!positive(n)||n>m.rounds)throw Error('Недостаточно подготовленных выстрелов.');
  const stock=i.stocks.find(s=>s.key===m.ammoKey);if(!stock)throw Error('Не найдена исходная партия.');
  const charges=m.ltEarlyCharges.splice(0,n);
  if(charges.length!==n)throw Error('Старый заряд не имеет полного состава. Используйте разгрузку сохранённого контейнера.');
  for(const c of charges){
   if(c.accounting==='components')for(const r of c.components?.filter(r=>r.kind!=='projectile')??ltEarlyPowderRequirements(p,c.parameters,c.ammoId)){
    let component=e.components.find(s=>s.key===r.key);if(!component){component={...r,rounds:0};e.components.push(component);}component.rounds+=r.quantity??r.amount;
   }
   if(JSON.stringify(stock.type.recipe)===JSON.stringify(c.type.recipe))stock.rounds+=c.stockUnits??1;
   else{const type=clone(c.type);type.recipe.customId='lt-unloaded-'+c.id;type.key=ammoTypeKey(type);i.stocks.push({key:type.key,type,rounds:c.stockUnits??1});}
  }
  m.rounds-=n;if(!m.rounds)m.ammoKey=null;return true;
 }
 if(operation==='consume')throw Error('Подготовленный заряд LT списывается только общей операцией выстрела.');
 if(operation==='delete-magazine'&&m&&!m.ltEarlyLegacy&&(p.kind!=='puckle'||m.rounds))throw Error(p.kind==='puckle'?'Сначала полностью разрядите цилиндр.':'Фиксированные стволы не являются съёмными магазинами.');
 if(operation==='add-magazines'&&p.kind!=='puckle')throw Error('У этой конструкции фиксированное число зарядных мест.');
 return false;
}

export function ltEarlyDamage({modeId,actor,raw={},attack={},weapon,type,catalogs,context={}}={}){
 const p=ltEarlyProfile(modeId);if(!p)return null;
 if(p.kind==='artillery')return ltArtilleryDamage({modeId,raw,attack,weapon,type,catalogs,context});
 if(p.kind==='flame')return ltFlameDamage({modeId,actor,raw,attack,weapon,type,catalogs,context});
 const fail=reason=>({status:'unresolved',nativeSafe:false,formula:null,rawFormula:raw.damage,reason,components:[],effectiveChanges:{},transformations:[],support:{manual:[]},rules:{ltEarly:{modeId,reason}}});
 const assessment=ltEarlyTypeAssessment({modeId,type,catalogs,weapon});if(!assessment?.applicationAllowed)return fail(assessment?.reason??'Нужен конкретный физический снаряд LT.');
 const params=type?.recipe?.parameters??{},configuration=ltEarlyConfiguration(weapon),source={...(!attack.standaloneRef&&p.kind!=='ten-eyed'?{damage:raw.damage,range:raw.range,acc:raw.acc,rcl:raw.rcl,bulk:raw.bulk,st:raw.st}:{}),...attack.ltEarlyOverrides};
 let formula=source.damage??p.stats.damage,range=parseDamageRange(source.range??p.stats.range),acc=parseAccuracyComponents(source.acc??p.stats.accuracy).acc,rcl=Number(source.rcl??p.stats.recoil),st=source.st??p.stats.strength,bulk=source.bulk??p.stats.bulk;
 if(!Number.isFinite(rcl))rcl=source.rcl;
 const m=/^(\d+)d(?:6)?([+-]\d+)?(?:\(([^)]+)\))?\s+(pi\+\+|pi\+|pi-|pi|imp)$/.exec(formula);
 if(!m||!range)return fail('Нет подтверждённого численного Damage / Range LT.');
 const improvised=type.ammoId===ltEarlyImprovisedId(p),boosted=params.boosted===true,factor=(improvised?0.5:1)*(boosted?1.1:1),quality=params.powderQuality==='substandard';
 let dice=Number(m[1]),adds=Number(m[2]??0)-(quality?dice:0);
 formula=(factor!==1?htDamageDice(dice,adds,1,factor):dice+'d'+(adds?(adds>0?'+':'')+adds:''))+(m[3]?'('+m[3]+')':'')+' '+m[4];
 range={halfDamage:Number((range.halfDamage*factor).toPrecision(12)),maximum:Number((range.maximum*factor).toPrecision(12))};
 if(params.careful)acc+=1;if(improvised)acc-=1;
 if(modeId==='WMqVwH46upN0TpmQE'&&configuration.stockCollapsed){acc=2+(params.careful?1:0)-(improvised?1:0);st='10';bulk='-3';rcl=5;}
 if(boosted)st=String(Math.ceil(Number(String(st).match(/^\d+/)?.[0])*1.1))+String(st).replace(/^\d+/,'');
 const gonne=p.source==='LT91',attackBonus=gonne&&configuration.crew===1?-2:0;
 if(attackBonus)acc=0;
 const rawDistance=context.physicalDistance??context.shotgun?.physicalDistance,distance=Number.isFinite(rawDistance)?rawDistance:null;
 const farDuck=p.kind==='duck'&&distance!==null&&distance>2;
 const brief=[],chargeEffects=[{serpentine:'Serpentine',corned:'Corned','source-black-powder':'Чёрный порох, сорт в таблице не указан'}[p.powder],{loose:'раздельное снаряжение',measured:'мерная навеска',paper:'бумажный патрон',cloth:'тканевый пакет'}[params.loading??'loose']];
 if(gonne)brief.push(configuration.crew===1?'Один стрелок: без бонуса Acc за Aim, −2 за внимание к запалу. LT91.':'Два стрелка: помощник поджигает заряд проверкой DX или Guns; задержка / потеря запала — вручную. LT91.');
 if(p.kind==='puckle')brief.push('Смена подготовленного цилиндра — 15 Ready; между выстрелами совместить следующую камору рукояткой. LT92–93.');
 if(p.kind==='ten-eyed')brief.push('Порядок пяти зарядов каждой стороны; затем разворот за 1 Ready. Внутренние заряды снаряжаются по 60 с. LT91.');
 if(p.kind==='facing')brief.push('Второй ствол доступен после разворота за 1 Ready. LT91.');
 if(p.kind==='duck')brief.push(farDuck?'Отдельный выстрел по выбранной цели; остальные в дуге 30° — B389 по порядку, максимум четыре поражённые цели. LT93.':'До 2 ярдов: залп четырёх стволов по одной цели, попадания по RoF1×4/Rcl1. LT93.');
 if(improvised)chargeEffects.push('подручный снаряд: −1 Acc, Damage/Range ×0,5, Malf−2');
 if(boosted)chargeEffects.push('усиление: Damage/Range/ST ×1,1'+(params.safety==='checked'?' (безопасность проверена владельцем)':' (предел превышен: Malf−2, вызванный им отказ — взрыв)'));
 if(quality)chargeEffects.push('некачественный порох: −1 за исходный куб, Malf−2');
 if(params.careful)chargeEffects.push('Careful Loading: Acc+1, время ×2');
 brief.unshift(chargeEffects.filter(Boolean).join('; ')+'. LT85,94–95.');
 const malformed=(improvised?2:0)+(boosted&&params.safety==='exceeded'?2:0)+(quality?2:0);
 const reloadBase=p.kind==='ten-eyed'&&(ltEarlyActiveSlot(weapon)?.ltEarlyPlace??0)%5>0?60:p.reloadSeconds;
 const facts={version:1,modeId,kind:p.kind,configuration,feed:{face:weapon?.ltEarly?.face??0,progress:clone(weapon?.ltEarly?.progress??[0,0]),selectedId:ltEarlyActiveSlot(weapon)?.id??null},loading:params.loading??null,accounting:params.accounting??null,boosted,improvised,powderQuality:params.powderQuality??'normal',powder:p.powder,malfDelta:-malformed,costMultiplier:boosted?1.5:1,
  reloadSeconds:params.loading==='paper'?Math.ceil(reloadBase/2)*(params.careful?2:1):reloadBase*(params.careful?2:1)-(params.loading==='measured'?5:0),careful:params.careful===true,pellets:p.pellets,physicalUnits:p.kind==='duck'?4:1,duckFar:farDuck,physicalDistance:distance,brief,source:p.source,malf:(p.source==='LT91'?12:14)-malformed,malfManual:true};
 return {status:'resolved',nativeSafe:true,formula,rawFormula:raw.damage,reason:null,components:[{role:'kinetic',relation:'primary',status:'resolved',formula}],transformations:[],support:{manual:brief.map((text,n)=>({id:'lt-early-'+n,text}))},
  effectiveChanges:{damage:formula,range:range.halfDamage+'/'+range.maximum,acc,rof:p.kind==='duck'?farDuck?'1':'1x4':p.pellets>1?'1x'+p.pellets:'1',rcl,st,bulk},
  rules:{ltEarly:facts,ammunitionSource:'LT84–95',attackBonus,ballisticRange:{minimum:0,...range},projectiles:{b409Eligible:p.kind!=='duck'&&p.pellets>1,physicalShotsMax:1,projectilesPerShot:farDuck?1:p.kind==='duck'?4:p.pellets},
   ...(p.kind==='duck'?{duckFoot:{far:farDuck,maximumHits:farDuck?1:4}}:{})}};
}
