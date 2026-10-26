import {ltBowProfile,ltBowUnits,ltBowCapacity,ltBowAmmoRule,ltBowPhysicalAdmission,normalizeLTBowConfiguration,LT_ARROW_IDS,LT_REPEATING_COCKING_POLICY} from '../lt-bow-source.js';
import {basicStrengthDamage} from './gurps-strength-damage.js';
import {readActorStrength} from './strength-service.js';
import {inferMeleeDamageModel} from './melee-damage-model.js';
import {applyLTQuality,validLTQuality} from './lt-quality.js';

export const LT_HEAD_VARIANTS=Object.freeze(['regular','bodkin','barbed','blunt','cutting','bowel_raker','fire_arrow','fire_cage','flight','humming_bulb','flaming','flaming_humming','crossbow_regular','crossbow_bodkin']);
const boltIds=['lt_standard_crossbow_bolt','lt_bodkin_crossbow_bolt','lt_gastraphetes_bolt_lt76','lt_bodkin_gastraphetes_bolt_lt76'];
function validHeadRecipe(modeId,ammoId,recipe){
 const rule=recipe?.variantId;
 return !!ltBowProfile(modeId)&&validLTQuality(recipe?.parameters?.quality)&&recipe?.version===1&&LT_HEAD_VARIANTS.includes(rule)&&
  (!recipe.variantIds||Array.isArray(recipe.variantIds)&&recipe.variantIds.length===1&&recipe.variantIds[0]===rule)&&
  (!!LT_ARROW_IDS[ammoId]&&!rule.startsWith('crossbow_')||boltIds.includes(ammoId)&&['crossbow_regular','crossbow_bodkin','regular','bodkin'].includes(rule));
}
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const addDice=(formula,bonus)=>{const m=/^(\d+)d([+-]\d+)?$/.exec(formula??'');if(!m)return null;
 const adds=Number(m[2]??0)+bonus;return m[1]+'d'+(adds?(adds>0?'+':'')+adds:'');};
const modeIdOf=attack=>attack?.standaloneRef?.modeId??attack?.ltBowModeId;
export function ltBowDrawing(actor,modeId,configuration){
 const p=ltBowProfile(modeId),state=readActorStrength(actor),base=state.kinds.lifting.effective,method=p.kind==='repeating'?'hand':configuration.drawMethod;
 const arm=method==='hand'&&configuration.applyArmST?state.advantages.levels.arm+state.modifiers.arm:0;
 const strength=base===null?null:base+arm;
 const ratio=method==='cranequin'?p.cranequin:method==='belly'?1.3:method==='goats-foot'?[1.3,1.4]:method==='one-leg'?[1.1,1.2]:method==='two-legs'?[1.2,1.3]:null;
 let ready=p.kind==='bow'?'Стрела: Ready 1 с; натянуть 1 с; выстрел 1 с.':p.kind==='repeating'?'Цикл рычага 1 с, выстрел 1 с; подача болта автоматическая.':
  p.kind==='slurbow'?'Взвести по LT74; размещение каждого дротика — 2 Ready.':'Взвод вручную 2 с, подготовка и размещение болта ещё 2 с.';
 if(method==='belly')ready='Брюшной упор: предел ST +30%; выдвинуть ползун 2 с, поднять 2 с, взвести 2 с, подготовить и вложить болт 2 с (LT79).';
 if(method==='cranequin')ready='Кранекин ×'+p.cranequin+'; опубликованное снаряжение '+({WVvwyyO4VoyeTryRo:8,WEG0MRykkKI4AzUzD:13,WPn4rW6HE64VST_pm:32,Wak71wpexyuS6wOgQ:50}[modeId])+' Ready (LT76/78).';
 else if(method==='one-leg'||method==='two-legs')ready='Натянуть ногами 3 с; ST '+(method==='one-leg'?'+10–20%':'+20–30%')+'. Приготовиться: стремя 2 с, одна стопа на луке 3 с, обе 4 с; последующие циклы с земли — 2 с. Снаряды отдельно (LT74).';
 else if(method==='goats-foot')ready='Козья нога: взвод 20 с; предел ST +30–40%; снаряд готовится отдельно (LT79).';
 else if(strength!==null&&p.kind!=='bow'&&p.kind!=='repeating'&&configuration.ratedST>strength){
  const deficit=configuration.ratedST-strength;
  ready=deficit<=2?'Взвод 6 с, подготовка/размещение болта ещё 2 с (B410).':deficit<=4?'Нужна козья нога: взвод 20 с плюс подготовка болта (B410).':'Для взвода требуется механическое приспособление или другой взводящий (B410).';
 }
 if(configuration.shotMode==='navak'&&method==='hand')ready='Дротик: взять 1 с, уложить в направляющую 1 с, натянуть 1 с; выстрел 1 с (LT78).';
 if(configuration.shotMode==='panjagan5')ready+=' Пять стрел: обычное время подготовки, Fast-Draw (Arrow) −3 (LT78).';
 if(configuration.shotMode==='panjagan10')ready+=' Кинематографический Panjagan: десять стрел, подготовка вручную (LT78); отдельного численного Fast-Draw для десяти книга не задаёт.';
 const selfCocking=p.kind==='repeating'?{...LT_REPEATING_COCKING_POLICY,maximumRatedST:strength,
  allowed:strength!==null&&number(configuration.ratedST)!==null&&Number(configuration.ratedST)>0&&configuration.ratedST<=strength,preparationOnly:true,automaticCocking:false}:null;
 return {strength,base:state.kinds.st.effective,lifting:state.advantages.levels.lifting+state.modifiers.lifting,arm,striking:0,method,ratio,ready,
  ...(selfCocking?{selfCocking,sourceDecision:LT_REPEATING_COCKING_POLICY}:{}),
  note:p.kind==='repeating'?'Предел самостоятельного взвода — 100% применимой ST ('+strength+'): '+(selfCocking.allowed?'взвод доступен.':'взвод недоступен.')+' Уже взведённым арбалетом можно стрелять. LT73; решение пользователя, не официальная эррата.':
   p.kind==='bow'?'Достаточность силы и подготовку проверяет владелец по LT74; новых ST-штрафов к попаданию нет.':'Натяжение учитывается вручную; уже взведённый арбалет может выстрелить у более слабого стрелка.'};
}
export function resolveLTBowBase({modeId,configuration,actor=null,sourceStats=null}={}){
 const p=ltBowProfile(modeId);if(!p)return null;
 let c;try{c=normalizeLTBowConfiguration(configuration,modeId);}catch(error){return {ready:false,reason:error.message};}
 if(c.ratedST===null)return {ready:false,configuration:c,reason:'Укажите Rated ST этого экземпляра в «Настроить»; минимальная ST не заменяет Rated ST.'};
 // B9 rounds character capabilities down; LT74 uses the same halved ST for range and damage.
 const rangeST=Math.floor(c.ratedST/(p.kind==='steel'?2:1)),damageST=rangeST;
 let mode='thrust',bonus=p.bonus,type=p.damageType,divisor='',minimum=false,extension='';
 if(sourceStats?.damage){const m=inferMeleeDamageModel(sourceStats.damage);
  if(m.mode==='fixed')return {ready:false,reason:'Ручная формула не является разделимым Swing/Thrust. Сохранённое значение не изменено; для этого Rated ST нужен подтверждённый профиль.'};
  ({mode,bonus,damageType:type,armorDivisor:divisor,minimum,extension}=m);
 }
 const base=basicStrengthDamage(damageST,mode);if(!base)return {ready:false,reason:'Не определён базовый урон для эффективной Rated ST '+damageST+'.'};
 let coefficients=[p.half,p.max];
 if(sourceStats?.range){const m=/^[x×*]?(\d+(?:\.\d+)?)\s*\/\s*[x×*]?(\d+(?:\.\d+)?)$/.exec(sourceStats.range.trim());
  if(!m)return {ready:false,reason:'Ручная Range не содержит подтверждённых коэффициентов Rated ST. Сохранённое значение не изменено.'};
  coefficients=[Number(m[1]),Number(m[2])];
 }
 const dice=addDice(base,bonus),range=coefficients.map(n=>n*rangeST);
 return {ready:true,configuration:c,modeId,ratedST:c.ratedST,effectiveDamageST:damageST,rangeST,baseFormula:base,weaponBonus:bonus,
  dice,type,divisor,minimum,extension,range,coefficients,acc:number(sourceStats?.acc)??p.acc,rof:p.units>1?'1x'+p.units:'1',shots:p.kind==='repeating'?'10(3i)':p.kind==='slurbow'?'1(2i)':null,
  drawing:actor?ltBowDrawing(actor,modeId,c):null,source:'LT74-78; B16'};
}
function physicalIdentity(modeId,type,catalogs,configuration){
 if(type?.source!=='catalog'||type.book!=='lt')return null;
 let id=type.ammoId;
 if(type.kind==='ammo-family'){
  const items=catalogs?.getAmmoFamily('lt',id)?.ammo_item_ids??[];
  if(items.length!==1)return null;id=items[0];
 }
 if(type.kind!=='ammo-family'&&type.kind!=='ammo-item')return null;
 const mode=catalogs?.getMode(modeId),record=catalogs?.getAmmoItem('lt',id);
 if(!record||!mode?.lt_ammo_item_ids?.includes(id)||!record.weapon_mode_ids?.includes(modeId))return null;
 const admission=ltBowPhysicalAdmission(modeId,id,'ammo-item',configuration);
 if(admission&&admission.status!=='compatible')return null;
 return {id,record};
}
export function ltBowDamage({raw={},modeId,configuration,actor=null,type=null,catalogs=null,context={},sourceStats=null}={}){
 const base=resolveLTBowBase({modeId,configuration,actor,sourceStats}),p=ltBowProfile(modeId);
 if(!p)return null;
 const fail=reason=>({nativeSafe:false,status:'unresolved',formula:null,rawFormula:raw.damage,components:[],transformations:[],effectiveChanges:{},
  reason,rules:{ltBow:{modeId,configuration:base?.configuration??configuration,reason}},support:{manual:[]}});
 if(!base.ready)return fail(base.reason);
 const identity=physicalIdentity(modeId,type,catalogs,base.configuration);if(!identity)return fail('Нужен конкретный совместимый физический снаряд LT и установленное оснащение.');
 let rule=type.recipe?.variantId??ltBowAmmoRule(identity.id);
 if(type.recipe&&!validHeadRecipe(modeId,identity.id,type.recipe))return fail('Модификация наконечника не подтверждена для этого физического снаряда.');
 if(rule==='crossbow_regular')rule='regular';if(rule==='crossbow_bodkin')rule='bodkin';
 if(!rule)return fail('Балистика этого физического снаряда LT не подтверждена.');
 const c=base.configuration,navak=c.shotMode==='navak',panjagan=['panjagan5','panjagan10'].includes(c.shotMode),panPenalty=c.shotMode==='panjagan10'?4:2;
 if(navak&&rule!=='arrow_guide'||rule==='arrow_guide'&&!navak)return fail('Режим Navak и его короткий дротик должны быть выбраны вместе.');
 if(navak&&!c.arrowGuideInstalled)return fail('Нужна установленная физическая направляющая Navak (LT78).');
 if(panjagan&&(!c.panjaganInstalled||!LT_ARROW_IDS[identity.id]))return fail('Panjagan требует физический крепёж и полный комплект подходящих стрел одной партии (LT78).');
 let bonus=base.weaponBonus-(navak?1:0)-(panjagan?panPenalty:0),damageType=base.type,divisor=base.divisor,acc=base.acc+(navak?1:0),multipliers=[...base.coefficients];
 const linked=[],brief=[],rules={attackBonus:panjagan?-panPenalty:0,projectiles:{b409Eligible:false,physicalShotsMax:1,projectilesPerShot:ltBowUnits(modeId,c)},
  ltBow:{version:1,modeId,kind:p.kind,ratedST:base.ratedST,effectiveDamageST:base.effectiveDamageST,rangeST:base.rangeST,
   baseFormula:base.baseFormula,weaponBonus:base.weaponBonus,configuration:c,projectile:identity.id,variant:rule,
   physicalUnits:ltBowUnits(modeId,c),drawing:base.drawing,source:'LT73-78; B277'},ammunitionSource:'LT73-78'};
 if(rule==='bodkin'){damageType='pi';divisor='2';rules.ammunitionSource='B277';}
 if(rule==='blunt')damageType='cr';
 if(['cutting','bowel_raker'].includes(rule))damageType='cut';
 if(['bowel_raker','fire_arrow','fire_cage','humming_bulb','flaming_humming'].includes(rule)){acc-=1;multipliers=multipliers.map(n=>n-5);}
 if(['humming_bulb','flaming_humming'].includes(rule)){damageType='cr';divisor='0.5';brief.push('Свистящий наконечник; сигнальный эффект — вручную.');}
 if(['barbed','bowel_raker'].includes(rule))brief.push('Выдёргивание наносит половину ранее причинённой раны.');
 if(rule==='fire_cage'){damageType='pi-';rules.attackBonus-=2;linked.push('1d-3 burn');brief.push('Поджечь вручную; linked burn применяется только при горящем наполнителе.');}
 if(rule==='fire_arrow'){linked.push('1d-1 cr ex');brief.push('Перед выстрелом: Ready и источник огня; сырость может испортить заряд. Взрыв — отдельный linked Damage.');}
 if(['flaming','flaming_humming'].includes(rule)){rules.attackBonus-=2;linked.push('1 burn');brief.push('Подготовка 10 с; использовать за 3 с. Linked burn — только для подожжённой стрелы.');rules.ammunitionSource='B410; LT73';}
 if(rule==='flight'){multipliers=multipliers.map(n=>n*2);rules.ltBow.flight=true;brief.push('Результат Damage /2 до ½D; далее урона нет.');}
 let range=multipliers.map(n=>n*base.rangeST*(panjagan?0.5:1));
 const dice=addDice(base.baseFormula,bonus),formula=dice+(divisor?'('+divisor+')':'')+(base.minimum?'!':'')+' '+damageType+(base.extension?' '+base.extension:'');
 const distance=number(context.physicalDistance??context.shotgun?.physicalDistance);
 if(rule==='flight'){rules.ltBow.flightDamage=distance!==null&&distance>range[0]?'zero':'half';rules.ltBow.distance=distance;rules.ltBow.halfDamage=range[0];}
 if(panjagan){rules.ltBow.cinematic=c.shotMode==='panjagan10';brief.push(c.shotMode==='panjagan10'?'Кинематографический Panjagan: десять стрел; подготовка и число попаданий — вручную. LT78.':'Panjagan: пять стрел; Fast-Draw (Arrow) −3, подготовка вручную.');}
 if(navak)brief.push('Дротик: взять, уложить в направляющую, натянуть — 3 Ready.');
 if(ltBowUnits(modeId,c)>1)rules.ltBow.manualSpreadHits=true;
 rules.ballisticRange={minimum:null,halfDamage:range[0],maximum:range[1],source:'LT74-78'};
 const components=[{role:'kinetic',formula,status:'resolved',relation:'primary',source:rules.ammunitionSource},
  ...linked.map(formula=>({role:'linked',formula,status:'resolved',relation:'linked',source:rules.ammunitionSource}))];
 if(linked.length)rules.componentOrder=['kinetic','linked'];
 rules.ltBow.brief=brief;
 return applyLTQuality({nativeSafe:true,status:'resolved',formula,rawFormula:raw.damage,reason:null,components,rules,
  support:{manual:brief.map((text,i)=>({id:'lt-bow-'+i,text}))},transformations:[{source:'LT74-78',effectId:'lt-rated-st',field:'damage',from:raw.damage,to:formula,applied:true,order:0}],
  effectiveChanges:{damage:formula,range:range.join('/'),acc:Math.max(0,acc),rcl:null,rof:rules.ltBow.physicalUnits>1?'1x'+rules.ltBow.physicalUnits:'1',
   ...(navak?{shots:'1(3)'}:c.shotMode==='single-small'?{shots:'1(2)'}:{}),ammunitionB409Eligible:false}}, {missile:true,weapon:c.quality,projectile:type.recipe?.parameters?.quality,cheapMalf:p.kind==='bow'?16:15});
}
export function applyLTBowDamageResult(payload,rules,role='kinetic'){
 const b=rules?.ltBow;if(!b?.flight||role!=='kinetic'||payload.olegurpsLTDivision)return payload;
 if(!Number.isFinite(payload.damage))throw Error('В результате GGA нет численного Damage.');
 const damage=b.flightDamage==='zero'?0:Math.floor(payload.damage/2);
 return {...payload,damage,olegurpsLTDivision:{original:payload.damage,divisor:b.flightDamage==='zero'?null:2,flightDamage:b.flightDamage},
  explainLineTwo:b.flightDamage==='zero'?'Flight: за ½D урон отсутствует.':'Flight: '+payload.damage+' / 2 = '+damage,hasExplanation:true};
}
export function ltBowReadiness(weapon,attack){
 const p=ltBowProfile(weapon);if(!p)return null;
 const reason=attack?.ammunitionReadinessReason??attack?.readinessReason;if(reason)return reason;
 const inventory=weapon.ammunitionInventory,m=inventory?.magazines.find(m=>m.id===inventory.installedId);
 const units=ltBowUnits(p.modeId,attack?.ammunitionLTBow?.configuration??attack?.ltBowConfiguration??weapon.ltBow);
 return m&&m.rounds>0&&m.rounds<units?'Для полного залпа нужны '+units+' физических снарядов одной партии.':null;
}
export function ltBowRecipeAssessment({modeId,type,compatibility,configuration={}}){
 const recipe=type?.recipe,rule=recipe?.variantId;
 if(type?.book!=='lt'||!ltBowProfile(modeId)||!LT_HEAD_VARIANTS.includes(rule))return null;
 const base=compatibility?.checkCompatibility(modeId,type.ammoId,{book:'lt',kind:type.kind,ltBow:configuration});
 const allowed=base?.status==='compatible'&&validHeadRecipe(modeId,type.ammoId,recipe);
 return {base,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:'user-defined',facts:{source:'LT73; B277'}};
}
