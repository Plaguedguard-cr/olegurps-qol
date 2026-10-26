import {ltPersonalProfile,ltPersonalConfiguration} from '../lt-personal-source.js';
import {readActorStrength,resolveStrengthDamage} from './strength-service.js';
import {inferMeleeDamageModel} from './melee-damage-model.js';
import {applyLTQuality,validLTQuality,ltPersonalQualityOptions} from './lt-quality.js';
import {ltBowProfile} from '../lt-bow-source.js';

const numeric=value=>value==null||String(value).trim()===''?null:Number.isFinite(Number(value))?Number(value):null;
const addDice=(formula,bonus)=>{const m=/^(\d+)d(?:6)?([+-]\d+)?$/.exec(formula??'');if(!m)return null;const n=Number(m[2]??0)+bonus;return m[1]+'d'+(n?(n>0?'+':'')+n:'');};
export function readLTPersonalPolicy(runtime=globalThis){
 let slingCrushing=false;try{slingCrushing=runtime.game?.settings?.get?.('olegurps-qol','ltSlingCrushingDamage')===true;}catch{}
 return {slingCrushing};
}
export function ltPersonalIdentity(modeId,type,catalogs){
 if(type?.source!=='catalog'||type.book!=='lt'||!['ammo-item','ammo-family'].includes(type.kind))return null;
 let id=type.ammoId;if(type.kind==='ammo-family'){const children=catalogs?.getAmmoFamily('lt',id)?.ammo_item_ids??[];if(children.length!==1)return null;id=children[0];}
 const mode=catalogs?.getMode(modeId),record=catalogs?.getAmmoItem('lt',id);
 return mode?.lt_ammo_item_ids?.includes(id)&&record?.weapon_mode_ids?.includes(modeId)?{id,record}:null;
}
export function ltPersonalRecipeAssessment({modeId,type,catalogs,compatibility,weapon=null}){
 if(type?.book!=='lt'||!ltPersonalProfile(modeId)||!type.recipe)return null;
 const r=type.recipe,identity=ltPersonalIdentity(modeId,type,catalogs),id=r.variantId;
 const valid=r.version===1&&(!r.variantIds||Array.isArray(r.variantIds)&&r.variantIds.length===1&&r.variantIds[0]===id)&&
  (id==='lt_personal_load'||identity?.record.variant_id===id&&['sling_lead','sling_stone_shaped','sling_stone_unshaped'].includes(id));
 const base=compatibility?.checkCompatibility(modeId,type.ammoId,{book:'lt',kind:type.kind});
 const utility=ltPersonalProfile(modeId)?.kind.startsWith('crossbow-'),v=r.parameters??{};
 const utilityReady=!utility||v.utilityPrepared===true&&v.utilityModeId===modeId&&typeof v.utilityWeaponId==='string'&&(!weapon||v.utilityWeaponId===weapon.id)&&Number.isFinite(v.cordLengthYards)&&v.cordLengthYards>0;
 const allowed=!!identity&&valid&&utilityReady&&validLTQuality(r.parameters?.quality)&&base?.status==='compatible';
 return {base,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:id==='lt_personal_load'?'user-defined':'reference',facts:{modeId,ammoId:type.ammoId,source:ltPersonalProfile(modeId).source}};
}
const throwDistanceTable=[[0.05,3.5],[0.1,2.5],[0.15,2],[0.2,1.5],[0.25,1.2],[0.3,1.1],[0.4,1],[0.5,0.8],[0.75,0.7],[1,0.6],[1.5,0.4],[2,0.3],[2.5,0.25],[3,0.2],[4,0.15],[5,0.12],[6,0.1],[7,0.09],[8,0.08]];
function throwingDistance(actor,st,weight){
 const basicLift=st>=10?Math.round(st*st/5):st*st/5,ratio=weight/basicLift,entry=throwDistanceTable.find(([maximum])=>ratio<=maximum);
 const dx=numeric(actor?.system?.attributes?.DX?.value);let level=null;
 const walk=tree=>{for(const row of Object.values(tree??{})){if(!row||typeof row!=='object')continue;
  if(/^Throwing$/i.test(row.originalName||row.name||'')&&Number(row.points)>0)level=Math.max(level??0,Number(row.level??row.import)||0);
  walk(row.contains);walk(row.collapsed);}};walk(actor?.system?.skills);
 const skillBonus=dx!==null&&level!==null?level>=dx+2?2:level>=dx+1?1:0:0;
 return {maximum:entry?Number(((st+skillBonus)*entry[1]).toPrecision(12)):null,basicLift,weight,ratio,modifier:entry?.[1]??null,skillBonus,source:'B355; B226'};
}
export function resolveLTPersonalRange({actor,profile,configuration={},skillLevel=0,sourceRange=null}={}){
 const state=readActorStrength(actor),arm=configuration.applyArmST?state.advantages.levels.arm+state.modifiers.arm:0;
 const st=state.kinds.st.effective===null?null:state.kinds.st.effective+arm,p=profile;
 if(p.kind.startsWith('crossbow-')){
  const parent=ltBowProfile(p.parentModeId),ratedST=numeric(configuration.utilityRatedST),orientation=configuration.utilityOrientation??'horizontal';
  if(!parent||!Number.isSafeInteger(ratedST)||ratedST<parent.minRatedST||!['horizontal','vertical'].includes(orientation))return {ready:false,reason:'Укажите Rated ST этого арбалета и направление доставки по LT125.'};
  const rangeST=Math.floor(ratedST/(parent.kind==='steel'?2:1)),factor=p.kind==='crossbow-rope'?orientation==='vertical'?0.25:0.5:orientation==='vertical'?0.05:0.1;
  const ownerMaximum=sourceRange==null?null:numeric(sourceRange);
  if(sourceRange!=null&&(!(ownerMaximum>0)||String(sourceRange).includes('/')))return {ready:false,reason:'Ручная дальность доставки должна быть одним положительным числом ярдов. Исходное значение сохранено.'};
  return {ready:true,halfDamage:null,maximum:ownerMaximum??Number((rangeST*parent.max*factor).toPrecision(12)),ratedST,rangeST,orientation,factor,...(ownerMaximum!==null?{ownerMaximum,source:'Пользовательская дальность; LT125'}:{source:'LT125; LT74–76'})};
 }
 const strengthRequired=p.kind.startsWith('net-')||p.kind.startsWith('grapnel')||/x|×|¥/.test(sourceRange??p.range);
 if(strengthRequired&&(st===null||st<=0))return {ready:false,reason:'Не определена положительная ST персонажа для дальности LT.'};
 if(p.kind==='lariat'){
  const rope=numeric(configuration.ropeLengthYards);return rope!==null&&rope>0?{ready:true,halfDamage:null,maximum:rope,st,ropeLengthYards:rope,readyAfterMiss:Math.ceil(rope/5),source:'B411'}:
   {ready:false,reason:'Укажите фактическую длину лассо в «Патронах» (B411).'};
 }
 if(p.kind==='net-large'||p.kind==='net-small'){
  const skill=numeric(skillLevel);return skill!==null&&skill>=3?{ready:true,halfDamage:null,maximum:Number((st/(p.kind==='net-large'?2:1)+skill/5).toPrecision(12)),st,skill,source:'LT78 n8'}:
   {ready:false,reason:'Не определён навык Net для расчёта дальности.'};
 }
 if(p.kind.startsWith('grapnel')){
  const range=throwingDistance(actor,st,p.kind==='grapnel-padded'?3:2);
  return {...range,st,ready:range.maximum!==null,halfDamage:null,reason:range.maximum===null?'Масса крюка превышает 8 Basic Lift: ручной бросок по B355 недоступен.':null};
 }
 const text=String(sourceRange??p.range).trim().replaceAll('×','x').replaceAll('¥','x'),parts=text.split('/');
 const values=parts.map(part=>/^x/i.test(part)?Number(part.slice(1))*st:Number(part));
 if(values.some(v=>!Number.isFinite(v)||v<0)||values.length>2)return {ready:false,reason:'Нет подтверждённой формулы дальности LT для этого режима.'};
 return {ready:true,halfDamage:values.length===2?Number(values[0].toPrecision(12)):null,maximum:Number(values.at(-1).toPrecision(12)),st,arm,striking:0,lifting:0,source:p.source};
}
const manual={
 bolas:['Обвивание и освобождение — вручную после защиты цели; Bolas против ST для выбивания удерживаемого предмета. B410.'],
 harpoon:['Зазубрины и освобождение — вручную; длина привязи ограничивает движение, натяжение — состязание ST. B411.'],
 pilum:['После попадания согнут: выпрямление — 3 Ready и ST. Застрявший в щите: −1; при массе ≥½/полной массы щита — −2/−4. LT73.'],
 hungamunga:['Мягкое железо TL2: после броска 1d, 1–3 — согнут; 10 с и Armoury+3 для исправления. Сталь TL3+ не гнётся по этому правилу. LT72.'],
 cloak:['Набрасывание плаща: защиту и фейнт/захват по Cloak разрешите вручную; автоматического ослепления нет. B404.'],
 'net-large':['После неудачной защиты цель опутана. Освобождение: три успешных DX−4, по Ready; три последовательных провала — нужна помощь/разрезание. B411.'],
 'net-small':['При броске — сеть: DX−4 с +3 за малую сеть; в контакте применяется отдельная процедура лассо/bolas. B411.'],
 lariat:['После захвата поддерживайте натяжение каждым Ready; состязание ST, для шеи у цели −5; нога — DX, при беге −4. B411.'],
 powder:['Порошок: ближняя атака Blowpipe +2, до 1 ярда; ветер снаружи даёт −2 и хуже. Действие вещества — вручную по способу доставки. B180.'],
 metsubushi:['Metsubushi: один заранее снаряжённый заряд, Ready 1 с; снаряжение устройства в бою непрактично. Ближняя атака Blowpipe +2 до 1 ярда. LT72; B180.'],
 grapnel:['Крюк брошен: закрепление и удержание верёвки проверяются вручную. Звук о твёрдую поверхность — 4 ярда. LT125.'],
 'grapnel-padded':['Мягкая обмотка: звук удара о твёрдую поверхность — 2 ярда. Закрепление крюка и удержание верёвки — вручную. LT125.']
};
export function ltPersonalDamage({actor,attack={},raw={},modeId,weapon=null,type,catalogs,compatibility,context={},policy=readLTPersonalPolicy()}={}){
 const p=ltPersonalProfile(modeId);if(!p)return null;
 const configuration=ltPersonalConfiguration(weapon),identity=ltPersonalIdentity(modeId,type,catalogs),parameters=type?.recipe?.parameters??{};
 const fail=reason=>({status:'unresolved',nativeSafe:false,formula:null,rawFormula:raw.damage,components:[],effectiveChanges:{},transformations:[],reason,support:{manual:[]},rules:{ltPersonal:{modeId,reason}}});
 if(!identity)return fail('Выберите конкретный физический предмет или снаряд LT этого режима.');
 if((type.recipe||p.kind.startsWith('crossbow-'))&&!ltPersonalRecipeAssessment({modeId,type,catalogs,compatibility,weapon})?.applicationAllowed)return fail('Подготовленная партия, крепление верёвки или экземпляр оружия не соответствуют этому режиму LT.');
 if(configuration.ropeLengthYards!==null&&(!Number.isFinite(configuration.ropeLengthYards)||configuration.ropeLengthYards<=0))return fail('Длина верёвки должна быть положительным числом.');
 const overrides=attack.ltPersonalOverrides??{},range=resolveLTPersonalRange({actor,profile:p,configuration,skillLevel:attack.level,sourceRange:overrides.range});
 if(!range.ready)return fail(range.reason);
 if(p.kind.startsWith('crossbow-'))range.maximum=Math.min(range.maximum,parameters.cordLengthYards);
 const expression=overrides.damage??p.damage,model=inferMeleeDamageModel(expression);let formula=null,strength=null;
 if(!p.noDamage){
  if(model.mode!=='fixed'){
   strength=resolveStrengthDamage(actor,model.mode,{applyArmST:configuration.applyArmST});if(!strength.ready)return fail(strength.reason);
   const dice=addDice(strength.baseFormula,model.bonus);if(!dice)return fail('Не удалось вычислить численный Damage LT.');
   formula=dice+(model.armorDivisor?'('+model.armorDivisor+')':'')+(model.minimum?'!':'')+' '+model.damageType+(model.extension?' '+model.extension:'');
  }else if(/^\d+d(?:6)?(?:[+-]\d+)?(?:\([\d.]+\))?!?\s+[\w+-]+$/.test(expression))formula=expression;
  else return fail('Исходный Damage не является поддерживаемой численной формулой LT.');
 }
 let attackBonus=p.hitBonus+(p.procedure==='melee-powder'?2:0),halfDamage=range.halfDamage,maximum=range.maximum;
 const variant=identity.record.variant_id;
 if(variant==='sling_lead'){
  formula=formula.replace(/^(\d+d(?:[+-]\d+)?)/,s=>addDice(s,1));if(halfDamage!==null)halfDamage*=2;maximum*=2;
 }
 if(variant==='sling_stone_unshaped')attackBonus-=1;
 if(policy.slingCrushing&&['sling','staff-sling','heavy-sling'].includes(p.kind)&&formula)formula=formula.replace(/\bpi(?:\+\+|\+|-)?(?=\s|$)/,'cr');
 const brief=[...(manual[p.kind]??[])];
 if(p.kind.startsWith('crossbow-'))brief.push('Доставка '+(p.kind==='crossbow-rope'?'верёвки с грузом':'крюка с верёвкой')+': подходящее крепление и подготовка — вручную. Успех броска не подтверждает закрепление или допустимую нагрузку. LT125.');
 const delivery=parameters.delivery??null;
 if(delivery==='penetration')brief.push('Нанесённое вещество применяется вручную только после проникновения; эффект определяется конкретным составом. LT128–130.');
 else if(delivery)brief.push('Способ доставки: '+({contact:'контактный',respiratory:'дыхательный',blood:'через кровь/глаза',digestive:'пищевой',manual:'по ручным условиям'}[delivery]??delivery)+'; действие вещества — вручную.');
 const displayRange=halfDamage===null?String(maximum):halfDamage+'/'+maximum;
 const facts={version:1,modeId,kind:p.kind,procedure:p.procedure,physicalAmmoId:identity.id,physicalUnits:1,recoverable:p.recoverable,
  configuration,policy:{slingCrushing:policy.slingCrushing===true},strength,range:{...range,halfDamage,maximum},brief,source:p.source,delivery};
 const result=p.noDamage?{version:1,kind:p.kind,procedure:p.procedure,source:p.source,label:({'crossbow-rope':'Доставка верёвки арбалетом','crossbow-hook':'Доставка крюка арбалетом',cloak:'Набрасывание плаща','net-large':'Бросок большой сети','net-small':'Бросок малой сети',lariat:'Захват лассо',powder:'Порошковая атака',metsubushi:'Порошковая атака Metsubushi',grapnel:'Бросок крюка','grapnel-padded':'Бросок крюка с обмоткой'})[p.kind],defensesManual:p.procedure==='utility'?false:true,effectsManual:true}:null;
 const resultDamage={status:p.noDamage?'not-applicable':'resolved',nativeSafe:true,formula,rawFormula:raw.damage,reason:null,
  components:p.noDamage?[]:[{role:'kinetic',status:'resolved',formula,relation:'primary'}],support:{manual:brief.map((text,i)=>({id:'lt-personal-'+i,text}))},
  effectiveChanges:{damage:formula,range:displayRange,acc:p.procedure==='ranged'?Number(raw.acc):null,rof:'1',rcl:null,ammunitionB409Eligible:false},
  transformations:[{source:p.source,effectId:'lt-personal-source-profile',field:'damage',from:raw.damage,to:formula,applied:true,order:0}],
  rules:{ltPersonal:facts,attackBonus,ammunitionSource:p.source,ballisticRange:{minimum:null,halfDamage,maximum,source:p.source},projectiles:{b409Eligible:false,physicalShotsMax:1,projectilesPerShot:1},
   ...(result?{instructionOnly:true,attackResult:result}:{})}};
 if(p.noDamage&&!p.kind.startsWith('crossbow-'))return resultDamage;
 const {missile,balanceAllowed}=ltPersonalQualityOptions(p);
 const qualified=applyLTQuality(resultDamage,{missile,weapon:missile?configuration.quality:parameters.quality??configuration.quality,projectile:p.noDamage?undefined:parameters.quality,cheapMalf:p.kind.startsWith('crossbow-')?15:['sling','staff-sling','heavy-sling','dart-sling'].includes(p.kind)?16:null,balanceAllowed});
 if(p.kind.startsWith('crossbow-')){const maximum=Math.min(Number(qualified.effectiveChanges.range),parameters.cordLengthYards);qualified.effectiveChanges.range=String(maximum);qualified.rules.ballisticRange.maximum=maximum;}
 return qualified;
}
