import {ltArtilleryProfile,ltArtilleryAmmo,ltArtilleryAdmission,ltArtilleryConfiguration,LT_OVERWEIGHT_RANGE} from '../lt-artillery-source.js';
import {htDamageDice,parseDamageRange} from './kinetic-damage-math.js';
import {parseAccuracyComponents} from './weapon-attack-overrides.js';
import {readActorStrength} from './strength-service.js';
import {resolveStandaloneSkill} from './standalone-skill-service.js';

export function ltArtillerySkill(actor,weapon){
 const p=ltArtilleryProfile(weapon);if(!p)return null;
 const indirect=p.indirectDefault||ltArtilleryConfiguration(weapon).indirect;
 const skill={name:p.personal?'Crossbow':indirect?'Artillery':'Gunner',specialization:p.personal?null:p.mechanical?'Catapult':'Cannon',modifier:0};
 const defaults=[{type:'skill',...skill},{type:indirect?'iq':'dx',modifier:indirect?-5:-4},...(!p.personal&&!indirect?[{type:'skill',name:'Gunner',specialization:null,modifier:-4}]:[])];
 return resolveStandaloneSkill({actor,record:{id:weapon.id,equipmentSnapshot:{tech_level:String(p.tl)}},mode:{modeId:p.modeId,overrides:{},snapshot:{governing_skill:{status:'resolved',skill},defaults}}});
}

export function ltArtilleryTypeAssessment({modeId,type,catalogs,weapon,place=null}){
 const p=ltArtilleryProfile(modeId);if(!p)return null;
 const a=ltArtilleryAmmo(p,type?.ammoId),r=type?.recipe,q=r?.parameters??{},fit=q.fit;
 const base=ltArtilleryAdmission(modeId,type?.ammoId,type?.kind);
 const linked=catalogs?.getMode(modeId)?.lt_ammo_item_ids?.includes(type?.ammoId)&&catalogs?.getAmmoItem('lt',type?.ammoId)?.weapon_mode_ids?.includes(modeId);
 const valid=!r||r.version===1&&r.variantId==='lt_artillery_load'&&(!r.variantIds||r.variantIds.length===1&&r.variantIds[0]===r.variantId)&&
  ['components','prepared'].includes(q.accounting)&&q.powder===p.powder&&['normal','substandard'].includes(q.powderQuality??'normal')&&
  (p.mechanical?q.loading==='mechanical':['loose','measured','paper','cloth'].includes(q.loading))&&
  !q.boosted&&!q.careful&&(a?.kind!=='heated'||q.loading==='cloth')&&
  (a?.kind==='overweight'?Object.hasOwn(LT_OVERWEIGHT_RANGE,String(q.massFactor))&&q.massFactor>1:q.massFactor===undefined||q.massFactor===1)&&
  (a?.kind==='grape'||a?.mass!=null||Number.isFinite(q.projectileMass)&&q.projectileMass>0&&q.projectileMass<p.roundMass)&&
  (a?.kind!=='flaming'||q.flamingReady===true)&&(a?.kind!=='heated'||q.heatedReady===true);
 const fitted=!r||fit?.equipmentId===p.equipmentId&&typeof fit.weaponId==='string'&&!!fit.weaponId&&Array.isArray(fit.barrels)&&fit.barrels.length===1&&fit.barrels[0]===0&&(!weapon||fit.weaponId===weapon.id)&&(place===null||place===0);
 const allowed=type?.source==='catalog'&&type?.book==='lt'&&type?.kind==='ammo-item'&&base.status==='compatible'&&linked&&valid&&fitted;
 return {base,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:r?'user-defined':'reference',facts:{modeId,ammoId:type?.ammoId,source:p.source},
  reason:!fitted?'Партия не подогнана к этому экземпляру.':!valid?'Проверьте состав партии, массу снаряда и подготовку; масса полного пушечного заряда не равна массе ядра.':base.reasons[0]?.message};
}
export function ltArtilleryRequirements(p,q,ammoId){
 if(p.mechanical)return [];
 const heated=ltArtilleryAmmo(p,ammoId)?.kind==='heated',grape=ltArtilleryAmmo(p,ammoId)?.kind==='grape';
 const parts=[{kind:'propellant',powder:p.powder,powderQuality:q.powderQuality??'normal',form:q.loading,amount:1},
  {kind:'priming',powder:p.powder,amount:1},{kind:q.loading==='cloth'?'cloth':q.loading==='paper'?'paper':'wadding',amount:heated?2:1},
  ...(heated?[{kind:'clay',amount:1}]:[]),...(grape?[{kind:'canvas',amount:1}]:[])];
 const a=ltArtilleryAmmo(p,ammoId),fit={weaponId:q.fit?.weaponId??null,equipmentId:p.equipmentId,projectileMass:a?.mass??q.projectileMass??null,massFactor:q.massFactor??1};
 return parts.map(r=>({...r,ammoId,fit,key:JSON.stringify([r.kind,r.powder??null,ammoId,r.powderQuality??null,null,r.form??null,fit])}));
}
export function ltArtilleryCocking(weapon,actor){
 const p=ltArtilleryProfile(weapon);if(!p?.personal)return null;
 const c=ltArtilleryConfiguration(weapon),s=readActorStrength(actor),arm=c.applyArmST?s.advantages.levels.arm+s.modifiers.arm:0;
 const effective=s.kinds.lifting.effective==null?null:s.kinds.lifting.effective+arm;
 return {ratedST:p.ratedST,method:c.cocking,requiredST:c.cocking==='crank'?Math.min(10,p.ratedST):p.ratedST,effectiveST:effective,applyArmST:c.applyArmST,source:'LT83; B15'};
}
export function ltArtilleryLoadError(weapon,actor){
 const s=ltArtilleryCocking(weapon,actor);return s&&(s.effectiveST===null||s.effectiveST<s.requiredST)?'Для взвода требуется ST '+s.requiredST+'; сейчас '+(s.effectiveST??'не определена')+'. Используется Lifting ST и явно выбранная Arm ST, без изменения Damage.':null;
}
export function ltArtilleryReadiness(weapon){
 const p=ltArtilleryProfile(weapon);if(!p)return null;
 const c=ltArtilleryConfiguration(weapon),slot=weapon.ammunitionInventory?.magazines.find(m=>m.id===weapon.ammunitionInventory.installedId),charge=slot?.ltEarlyCharges?.[0];
 const heated=ltArtilleryAmmo(p,charge?.ammoId)?.kind==='heated';
 if(p.mountRequired&&(!c.mountReady||!c.setupReady))return 'Подтвердите установку, направление и штатную опору орудия.';
 if(c.crew<1+p.additionalCrew+(heated?2:0))return 'Недостаточный расчёт: нужно '+(1+p.additionalCrew+(heated?2:0))+' человек, включая наводчика.';
 if((p.indirectDefault||c.indirect)&&!c.procedureReady)return 'Подтвердите ручную процедуру непрямого огня; автоматического попадания и scatter нет.';
 if(p.narrowVision&&!c.standAside&&!c.visionReady)return 'Узкое поле зрения: перед Aim нужен 1 с и Vision; либо стойте рядом без бонуса Aim (LT79–80).';
 return null;
}
export function ltArtilleryManifest(p,q,ammoId){
 const a=ltArtilleryAmmo(p,ammoId),factor=a.kind==='overweight'?q.massFactor:1;
 const count=a.kind==='grape'?Math.floor(40*p.roundMass):p.pellets,mass=(a.mass??q.projectileMass)*factor;
 return {stockUnits:p.stockUnits,projectiles:count,projectileMass:mass,totalProjectileMass:mass*p.pellets,material:a.material,
  construction:a.kind,massFactor:factor,rangeFactor:LT_OVERWEIGHT_RANGE[String(factor)],massAuthority:a.mass==null?'user-defined':'LT',
  ...(a.kind==='grape'?{projectileMass:null,totalProjectileMass:null,diameterInches:0.5,container:'canvas',countBasis:{fullRoundMass:p.roundMass,multiplier:40,rounding:'B9-floor'}}:{}),
  ...(a.kind==='chain'?{composition:'two-subcaliber-balls-and-1-2-yard-chain'}:{}),
  ...(a.kind==='heated'?{preparation:'red-hot-iron; cloth powder bag; empty cloth bag; clay layer'}:{})};
}
export function ltArtilleryDamage({modeId,raw={},attack={},weapon,type,catalogs,context={}}={}){
 const p=ltArtilleryProfile(modeId);if(!p)return null;
 const fail=reason=>({status:'unresolved',nativeSafe:false,formula:null,rawFormula:raw.damage,reason,components:[],effectiveChanges:{},transformations:[],support:{manual:[]},rules:{ltEarly:{modeId,reason},ltArtillery:{modeId,reason}}});
 const assessment=ltArtilleryTypeAssessment({modeId,type,catalogs,weapon});if(!assessment.applicationAllowed||!type.recipe)return fail(assessment.reason??'Создайте подогнанную артиллерийскую партию.');
 const q=type.recipe.parameters,a=ltArtilleryAmmo(p,type.ammoId),configuration=ltArtilleryConfiguration(weapon),manifest=ltArtilleryManifest(p,q,type.ammoId);
 const source={...Object.fromEntries(Object.entries({damage:raw.damage,range:raw.range,acc:raw.acc,rcl:raw.rcl,bulk:raw.bulk,st:raw.st}).filter(([,v])=>v!==undefined)),...attack.ltEarlyOverrides};
 let formula=source.damage??p.stats.damage,range=parseDamageRange(source.range??p.stats.range),acc=parseAccuracyComponents(source.acc??p.stats.accuracy).acc;
 const m=/^(\d+)d(?:6)?([+-]\d+)?(?:[x×*](\d+))?\s*(?:\(([^)]+)\))?\s+(cr|imp|pi\+\+|pi\+|pi-|pi|cut)$/.exec(formula);
 if(!m||!range)return fail('Не определён численный артиллерийский Damage / Range.');
 const leadSubstitution=p.personal&&a.kind==='lead'||p.bundle&&a.kind==='bundle-lead';
 const quality=!p.mechanical&&q.powderQuality==='substandard',adds=Number(m[2]??0)-(quality?Number(m[1]):0)+(leadSubstitution?1:0);
 const dice=m[1]+'d'+(adds?(adds>0?'+':'')+adds:'')+(m[3]?'x'+m[3]:'');
 const leadType=p.personal&&p.projectileMass<0.1?'pi+':'pi++';
 formula=dice+(m[4]?'('+m[4]+')':'')+' '+(leadSubstitution?leadType:m[5]);
 let reloadSeconds=p.reloadSeconds,rcl=p.personal?null:source.rcl??p.stats.recoil,costMultiplier=1,malfDelta=quality?-2:0,attackBonus=0;
 const brief=[],components=[];
 if(a.kind==='overweight'){range={halfDamage:range.halfDamage*manifest.rangeFactor,maximum:range.maximum*manifest.rangeFactor};brief.push('Камень '+manifest.projectileMass+' lb; дальность ×'+manifest.rangeFactor+', Damage по таблице. LT83.');}
 if(leadSubstitution)brief.push('Свинец: +1 к Damage, '+leadType+'. '+(p.personal?'LT84.':'LT81.'));
 if(p.bundle)brief.push('Связка: '+p.pellets+' отдельных снарядов по 1 lb. LT80–81.');
 if(a.kind==='chain'){formula=dice+'(0.5) cut';range={halfDamage:range.halfDamage/2,maximum:range.maximum/2};reloadSeconds*=1.2;costMultiplier=2;brief.push('Два подкалиберных ядра на цепи; Range /2, снаряжение ×1,2, цена ×2. LT88.');}
 if(a.kind==='grape'){formula=htDamageDice(Number(m[1]),adds,Number(m[3]??1),1/Math.sqrt(manifest.projectiles))+' pi+';range={halfDamage:60,maximum:600};rcl=1;brief.push('Картечь: '+manifest.projectiles+' железных шариков 0,5″ в холщовом мешке; Damage /√'+manifest.projectiles+'. LT88.');}
 if(a.kind==='heated'){reloadSeconds*=1.5;malfDelta--;components.push({role:'linked',relation:'linked',status:'resolved',formula:'3d burn'});brief.push('Раскалённое ядро: Malf−1, снаряжение ×1,5, +2 заряжающих; 3d burn/с до 30 с вручную. LT88.');}
 if(a.kind==='flaming'){attackBonus=-2;components.push({role:'linked',relation:'linked',status:'resolved',formula:'1 burn'});brief.push('Горящий болт: подготовка 10 с, использовать за 3 с; −2 к атаке, +1 burn; критическая неудача обжигает машину. LT83; B410.');}
 if(quality)brief.push('Некачественный порох: −1 за исходный куб, Malf−2. LT85.');
 if(configuration.standAside&&p.narrowVision)acc=0;
 const indirect=p.indirectDefault||configuration.indirect;
 if(indirect&&!p.indirectAvailable)return fail('Этот персональный режим не поддерживает непрямой огонь.');
 const minimum=p.oneArmed?range.maximum*0.25:0;
 const distance=Number.isFinite(context.physicalDistance)?context.physicalDistance:null;
 if(distance!==null&&(distance<minimum||distance>range.maximum))return fail('Дистанция вне источникового диапазона: '+minimum+'–'+range.maximum+' ярдов.');
 if(brief.length>3)return fail('Описание артиллерийского заряда превышает краткий формат.');
 const facts={version:1,modeId,kind:'artillery',configuration,feed:{selectedId:weapon?.ammunitionInventory?.installedId??null},
  source:p.source,loading:q.loading,accounting:q.accounting,powder:p.powder,powderQuality:q.powderQuality??'normal',physicalUnits:1,
  pellets:manifest.projectiles,manifest,reloadSeconds,betweenShotsReady:p.betweenShotsReady,crew:1+p.additionalCrew+(a.kind==='heated'?2:0),
  costMultiplier,malfDelta,malfManual:true,physicalDistance:distance,brief,indirect,minimumRange:minimum,equipmentId:p.equipmentId,ammoId:a.id,
  procedure:indirect?'manual-area-registration':'direct-fire',noAim:p.narrowVision&&configuration.standAside,burnDurationSeconds:a.kind==='heated'?30:null};
 return {status:'resolved',nativeSafe:true,formula,rawFormula:raw.damage,reason:null,components:[{role:'kinetic',relation:'primary',status:'resolved',formula},...components],
  effectiveChanges:{damage:formula,range:range.halfDamage+'/'+range.maximum,acc,rof:manifest.projectiles>1?'1x'+manifest.projectiles:'1',rcl,st:source.st??p.stats.strength,bulk:source.bulk??p.stats.bulk},
  transformations:[],support:{manual:brief.map((text,n)=>({id:'lt-artillery-'+n,text}))},rules:{ltEarly:facts,ltArtillery:facts,ammunitionSource:p.source,attackBonus,
   ...(components.length?{componentOrder:true}:{}),...(indirect?{manualArtillery:{manual:true,projectileHit:'manual',source:p.source}}:{}),
   ballisticRange:{minimum,...range},projectiles:{b409Eligible:a.kind==='grape'||p.bundle,physicalShotsMax:1,projectilesPerShot:manifest.projectiles}}};
}
