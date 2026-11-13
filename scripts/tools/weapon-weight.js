import {readGgaWeaponModes,resolveWeaponIdentity} from '../weapon-catalog-binding-service.js';
import {weaponListIdentity,rangedVisibilityEntries,WeaponListVisibility,weaponStateKey} from './weapon-list-visibility.js';
import {weaponMassFact,feedMassFact,ammunitionMassFact,variantMassFact} from '../weapon-mass-source.js';
import {magazinePolicy} from './magazine-policy.js';
import {collectUnarmedAttacks} from './bs-unarmed.js';
import {weaponPowerProfile,readWeaponBattery} from './weapon-power.js';
import {resourceOnlyWeapon} from './weapon-resources.js';
import {ltArtilleryProfile,ltArtilleryAmmo,LT_OVERWEIGHT_RANGE} from '../lt-artillery-source.js';

export const WEAPON_WEIGHT_FLAG='weaponWeight';
const scope='olegurps-qol';
const validMass=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const quantity=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const get=(value,path)=>String(path??'').split('.').reduce((v,k)=>v?.[k],value);
const unique=rows=>[...new Set(rows.filter(Boolean))];
export const weightSettings=()=>{
 const read=(key,fallback)=>{try{return globalThis.game.settings.get(scope,key)??fallback;}catch{return fallback;}};
 return {enabled:read('weaponWeightEnabled',false),A:read('weaponWeightWeapon',true),B:read('weaponWeightFeeds',true),C:read('weaponWeightLoaded',true),D:read('weaponWeightLoose',true)};
};
export function readWeaponWeightState(actor,id){return actor?.getFlag?.(scope,WEAPON_WEIGHT_FLAG)?.instances?.[weaponStateKey(id)]??{};}
export async function setWeaponBackpack(actor,id,enabled){
 if(!actor?.isOwner||!id)throw Error('Нет прав на изменение оружия.');
 return actor.update({[`flags.${scope}.${WEAPON_WEIGHT_FLAG}.instances.${weaponStateKey(id)}.backpack`]:enabled===true});
}
export async function setManualWeaponMass(actor,id,atomKey,{mode,value,expected}){
 if(!actor?.isOwner||!id||!atomKey||!['auto','replace','add'].includes(mode)||!validMass(value))throw Error('Укажите неотрицательную массу в lb и способ учёта.');
 if(expected!==undefined&&JSON.stringify(readWeaponWeightState(actor,id).manual?.[weaponStateKey(atomKey)]??{mode:'auto',value:0})!==JSON.stringify(expected))throw Error('Масса уже изменена в другом окне. Откройте настройки заново.');
 const record={mode,value,provenance:'USER_DEFINED'};
 return actor.update({[`flags.${scope}.${WEAPON_WEIGHT_FLAG}.instances.${weaponStateKey(id)}.manual.${weaponStateKey(atomKey)}`]:record});
}
function collect(actor,catalogs){
 const resources=actor?.getFlag?.('world','gurpsAmmoManager')??{},definitions=actor?.getFlag?.(scope,'standaloneWeapons')?.weapons??[];
 const modes=readGgaWeaponModes(actor),bindings=actor?.getFlag?.(scope,'weaponCatalogBindings')?.entries??[],confirmed=new Map();
 for(const b of bindings){const r=resolveWeaponIdentity(b.anchor,modes);if(r.status==='resolved'&&catalogs?.getEquipmentForMode(b.modeId)?.equipment_id===b.equipmentId){
   const list=confirmed.get(r.mode.path)??[];list.push(b);confirmed.set(r.mode.path,list);
 }}
 const groups=new Map(),byMode=new Map();
 const add=(id,name,modelId,modeId,resource=null,proof=null)=>{
  if(!id)return;let g=groups.get(id);if(!g){g={id,name,modelIds:[],modeIds:[],resources:[],proof};groups.set(id,g);}
  if(modelId)g.modelIds.push(modelId);if(modeId)g.modeIds.push(modeId);if(resource)g.resources.push(resource);
 };
 const entries=rangedVisibilityEntries(actor,resources);
 for(const entry of entries){const w=entry.source,definition=definitions.find(d=>d.id===w.standaloneWeaponId),ref=w.attackRef;
  const candidates=ref?.uuid?modes.filter(m=>m.uuid===ref.uuid):modes.filter(m=>m.path===ref?.path);
  const binding=candidates.length===1&&confirmed.get(candidates[0].path)?.length===1?confirmed.get(candidates[0].path)[0]:null;
  const modeId=w.standaloneModeId??w.catalogModeId??binding?.modeId;
  const modelId=definition?.source?.equipmentId??binding?.equipmentId??catalogs?.getEquipmentForMode(modeId)?.equipment_id;
  add(entry.id,w.name,modelId,modeId,w);if(candidates.length===1)byMode.set(candidates[0].path,entry.id);
 }
 for(const d of definitions)add('standalone:'+d.id,d.name,d.source?.equipmentId,d.modes?.[0]?.modeId);
 const bodyPaths=new Set(collectUnarmedAttacks(actor,modes.filter(m=>m.type==='melee').map(m=>({...get(actor,m.path),path:m.path}))).filter(a=>a.unarmedRef&&a.unarmedRef.profile?.part!=='accessory').map(a=>a.path));
 for(const m of modes){
  if(m.type!=='melee')continue;
  if(bodyPaths.has(m.path))continue;
  const raw=get(actor,m.path),attack={...raw,path:m.path,data:raw};
  if(String(raw?.originalName??raw?.name).toLowerCase()==='natural attacks')continue;
  const id=weaponListIdentity(actor,attack),binding=confirmed.get(m.path)?.length===1?confirmed.get(m.path)[0]:null;
  add(id,m.name,binding?.equipmentId,binding?.modeId,null,id?.startsWith('legacy:')?null:undefined);
 }
 for(const g of groups.values()){g.modelIds=unique(g.modelIds);g.modeIds=unique(g.modeIds);}
 return [...groups.values()];
}
function ammoFact(type,modeId,weapon){
 if(type?.source!=='catalog')return {unitLb:null,reason:'Старая или внешняя партия без подтверждённой физической массы.'};
 let fact=ammunitionMassFact(type.book,type.ammoId),unitLb=fact?.unitLb??fact?.knownBaseLb??null,reason=fact?.reason??'Нет подтверждённой массы физической единицы.',massIncomplete=fact?.unitLb==null&&validMass(fact?.knownBaseLb),provenance='SOURCE';
 const artillery=type.book==='lt'&&type.recipe?.variantId==='lt_artillery_load'?ltArtilleryProfile(modeId):null;
 const physical=artillery&&ltArtilleryAmmo(artillery,type.ammoId),parameters=type.recipe?.parameters??{};
 if(physical&&physical.kind!=='grape'){
  const factor=physical.kind==='overweight'&&Object.hasOwn(LT_OVERWEIGHT_RANGE,String(parameters.massFactor))?parameters.massFactor:physical.kind==='overweight'?null:1;
  const fitted=physical.mass==null&&validMass(parameters.projectileMass)&&parameters.projectileMass>0&&parameters.projectileMass<artillery.roundMass;
  if(factor!==null&&(validMass(physical.mass)||fitted)){unitLb=(fitted?parameters.projectileMass:physical.mass)*factor;massIncomplete=physical.kind==='flaming';if(fitted)provenance='USER_DEFINED';reason=fitted?'Фактическая масса снаряда из сохранённой подогнанной партии. Порох и прочие компоненты учитываются отдельно.':physical.kind==='flaming'?'Подтверждена масса основы; недостающая масса горючего требует ручного добавления.':'Физический снаряд и выбранный коэффициент LT83; компоненты порохового заряда учитываются отдельно.';}
 }
 const prepared=type.book==='lt'&&type.recipe?.variantId==='lt_early_load'&&type.recipe?.parameters?.accounting==='prepared'&&type.recipe.parameters.boosted!==true&&validMass(fact?.fullShotLb);
 if(prepared&&type.recipe.parameters.boosted!==true&&!type.recipe.parameters.artillery){unitLb=fact.fullShotLb;reason='Готовый полный заряд: опубликованная масса включает порох; отдельные компоненты повторно не прибавляются.';}
 const variant=type.recipe?.variantId;
 if(variant){const rule=variantMassFact(type.book,variant);
  if(fact?.includedVariants?.includes(variant)){}
  else if(rule?.category==='B'&&validMass(rule.factor)&&validMass(unitLb))unitLb*=rule.factor;
  else if(rule?.category==='C'&&validMass(rule.absoluteLb))unitLb=rule.absoluteLb;
  else if(rule?.category!=='A'&&!prepared&&!physical){unitLb=null;reason=rule?.reason??'Изменение массы этого специального боеприпаса не подтверждено.';}
 }
 if(weapon?.executionVariant==='lp'){unitLb=null;massIncomplete=false;reason='LP разделяет снаряд и жидкий метательный заряд; масса штатного патрона не подтверждает массу каждой сохранённой единицы LP.';}
 return {...fact,unitLb,reason,massIncomplete,provenance};
}
function resolveGroup(actor,g,settings){
 const saved=readWeaponWeightState(actor,g.id),atoms=[],visibility=new WeaponListVisibility(actor);
 const atom=(category,key,label,count,unitLb,source,reason='')=>{
  if(count===0)return;
  const manual=saved.manual?.[weaponStateKey(key)],active=manual&&['replace','add'].includes(manual.mode)&&validMass(manual.value);
  const automatic=validMass(unitLb)?unitLb:null;
  const unit=active?(manual.mode==='replace'?manual.value:(automatic??0)+manual.value):automatic;
  const known=quantity(count)!==null&&validMass(unit),complete=known&&(!source?.massIncomplete||active);
  atoms.push({category,key,label,quantity:count,automaticUnitLb:automatic,unitLb:unit,knownLb:known?count*unit:0,complete,source,reason,
   provenance:active?'USER_DEFINED':source?.provenance??'SOURCE',manual:manual??{mode:'auto',value:0},enabled:settings[category]!==false});
 };
 const body=g.modelIds.length===1?weaponMassFact(g.modelIds[0]):null;
 const whole=body?.allocation==='WHOLE_AMMUNITION_OBJECT';
 const powerWeapon=g.resources.find(w=>weaponPowerProfile(w)),powerProfile=powerWeapon&&weaponPowerProfile(powerWeapon);
 const cellMasses={AA:.0005,A:.005,B:.05,C:.5,D:5,E:20,F:200};
 const internalPower=!whole&&!body?.externalPower&&body?.book==='UT'&&powerProfile&&!powerProfile.chemical&&!powerProfile.oneShot&&powerWeapon.executionVariant!=='etc'&&validMass(cellMasses[powerProfile.cellSize])?{profile:powerProfile,nominalLb:cellMasses[powerProfile.cellSize]*(powerProfile.cells??1)}:null;
 const baseLb=internalPower&&validMass(body?.baseLb)?(body.baseLb>=internalPower.nominalLb?body.baseLb-internalPower.nominalLb:null):body?.baseLb??null;
 if(!whole)atom('A','body','Оружие',1,baseLb,body,g.modelIds.length>1?'Несогласованные привязки режимов одного экземпляра.':body?.reason??'Модель оружия не привязана к источнику.');
 if(whole&&!g.resources.length)atom('A','body','Цельный предмет',1,body?.publishedLb??null,body,body?.reason);
 if(internalPower)atom('A','power:'+internalPower.profile.stateKey,'Штатный источник питания',1,readWeaponBattery(powerWeapon,internalPower.profile)?internalPower.nominalLb:null,{book:'UT',pages:[19,112,143]},'Заряд не меняет физическую массу. При отсутствии сохранённой установки масса ячейки остаётся неподтверждённой.');
 const powerSeen=new Set();
 for(const w of g.resources){
  const modeId=w.standaloneModeId??w.catalogModeId??g.modeIds[0],feed=feedMassFact(modeId),policy=magazinePolicy({...w,catalogModeId:modeId});
  const inventory=w.ammunitionInventory;
  if(body?.externalPower){const p=weaponPowerProfile(w),key=p?.stateKey??modeId;
   if(!powerSeen.has(key)){powerSeen.add(key);const installed=p&&readWeaponBattery(w,p),power=body.externalPower;
    atom('A','power:'+key,'Выносной источник питания',1,installed?power.cells*power.unitLb:null,power,installed?'Физическая масса сохраняется при нулевом заряде.':'Установка выносного источника питания не подтверждена сохранённым состоянием.');}
  }
  if(resourceOnlyWeapon(w))continue;
  if(!inventory||inventory.version!==1){atom('D','legacy:'+w.id,'Непроверенный старый боезапас',1,null,null,'Нужно открыть учёт боеприпасов и проверить сохранённые партии.');continue;}
  const stocks=inventory.stocks??[],magazines=inventory.magazines??[];
  const addAmmo=(category,type,count,suffix='')=>{const fact=ammoFact(type,modeId,w),sealed=type?.sealedPlatformModeId&&g.modeIds.includes(type.sealedPlatformModeId),unit=whole&&!type?.recipe?(sealed?body.publishedLb:fact.unitLb??body.publishedLb):fact.unitLb;atom(whole?'A':category,'ammo:'+String(type?.key??suffix),type?.name??'Боеприпасы',count,unit,fact,fact.reason);};
  for(const stock of stocks)addAmmo('D',stock.type,stock.rounds,stock.key);
  for(const mag of magazines){
   if(!whole&&!policy.fixed&&!feed?.fixed){const standard=feed&&[feed.nominalCapacity,feed.logicalCapacity].includes(mag.capacity);
    atom('B','feed:'+mag.id,'Пустое средство подачи',1,standard?feed.emptyLb:null,feed,standard?feed?.reason:'Эта ёмкость или конструкция не подтверждена источником.');}
   if(whole&&mag.sealedUsed)atom('A','spent:'+mag.id,'Использованный одноразовый корпус',1,null,body,'Списан заряд; отдельная масса оставшегося корпуса не опубликована.');
   if(Array.isArray(mag.ltEarlyCharges)&&mag.ltEarlyCharges.length===mag.rounds){
    for(const charge of mag.ltEarlyCharges){
     addAmmo('C',charge.type,charge.stockUnits??1,charge.ammoKey);
     if(!(charge.accounting==='prepared'&&charge.type?.recipe?.variantId==='lt_early_load'&&charge.parameters?.boosted!==true&&validMass(ammunitionMassFact(charge.type?.book,charge.type?.ammoId)?.fullShotLb)))for(const c of charge.components??[])if(c.kind!=='projectile')atom('C','lt-component:'+(c.key??c.kind),'Компонент заряда: '+c.kind,c.quantity??c.amount??1,null,null,'Отдельная масса компонента не опубликована.');
    }
   }else{const stock=stocks.find(s=>s.key===mag.ammoKey);addAmmo('C',stock?.type,mag.rounds,mag.ammoKey??mag.id);}
  }
  for(const c of w.ltEarly?.components??[])atom('D','lt-component:'+(c.key??c.kind),'Компонент заряда: '+c.kind,c.rounds,null,null,'Количество навесок не является массой в lb.');
  if(w.executionVariant==='etc'||w.executionVariant==='lp')atom('A','conversion:'+w.id,'Комплект '+w.executionVariant.toUpperCase(),1,null,null,'Масса установленной модификации и её питания требует отдельного значения.');
 }
 const active=atoms.filter(a=>a.enabled),knownLb=active.reduce((sum,a)=>sum+a.knownLb,0),complete=active.every(a=>a.complete);
 const hidden=visibility.isHidden(g.id,g.proof??undefined),backpack=saved.backpack!==false;
 return {...g,atoms,knownLb,complete,hidden,backpack,included:!hidden&&backpack,contributionLb:settings.enabled&&!hidden&&backpack?knownLb:0};
}
export function calculateWeaponWeight(actor,{catalogs=globalThis.OleGURPSQOL?.catalogs,settings=weightSettings()}={}){
 const groups=collect(actor,catalogs).map(g=>resolveGroup(actor,g,settings));
 return {unit:'lb',enabled:settings.enabled,knownLb:groups.reduce((sum,g)=>sum+g.contributionLb,0),complete:groups.filter(g=>g.included).every(g=>g.complete),groups};
}
export function weaponWeightPresentation(actor,id,options){return calculateWeaponWeight(actor,options).groups.find(g=>g.id===id)??{id,atoms:[],knownLb:0,complete:false,backpack:readWeaponWeightState(actor,id).backpack!==false};}
export const formatWeaponWeight=g=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:4}).format(g.knownLb)+(g.complete?'':'+')+' lb';
