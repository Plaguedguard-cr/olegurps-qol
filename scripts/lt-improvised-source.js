import {LT_CLOSEOUT_PROFILES} from './lt-improvised-closeout-data.js';
import {ltBladeSource,ltBladeGripPolicy} from './lt-blade-source.js';
import {ltImpactSource,ltImpactGripPolicy} from './lt-impact-source.js';
import {ltPolearmSource,ltPolearmGripPolicy} from './lt-polearm-source.js';
import {ltFlexibleSource,ltFlexibleGripPolicy} from './lt-flexible-source.js';
// M2.6. Printed LT63 and the individually cited LT narratives; module overlays only.
// Base rows below are transcribed from LT65-70. A host's ranged ST/Reach is never reused.
const defaults={
 'Axe/Mace':[['DX',-5],['Flail',-4],['Two-Handed Axe/Mace',-3]],
 'Two-Handed Axe/Mace':[['DX',-5],['Axe/Mace',-3],['Polearm',-4],['Two-Handed Flail',-4]],
 Flail:[['DX',-6],['Axe/Mace',-4],['Two-Handed Flail',-3]],
 Kusari:[['DX',-6],['Monowire Whip',-3],['Two-Handed Flail',-4],['Whip',-3]],
 Whip:[['DX',-5],['Kusari',-3],['Monowire Whip',-3]],
 Knife:[['DX',-4],['Force Sword',-3],['Main-Gauche',-3],['Shortsword',-3]],
 Shortsword:[['DX',-5],['Broadsword',-2],['Force Sword',-4],['Jitte/Sai',-3],['Knife',-4],['Saber',-4],['Smallsword',-4],['Tonfa',-3]],
 Broadsword:[['DX',-5],['Force Sword',-4],['Rapier',-4],['Saber',-4],['Shortsword',-2],['Two-Handed Sword',-4]],
 Smallsword:[['DX',-5],['Main-Gauche',-3],['Rapier',-3],['Saber',-3],['Shortsword',-4]],
 Rapier:[['DX',-5],['Main-Gauche',-3],['Saber',-3],['Smallsword',-3],['Broadsword',-4]],
 Spear:[['DX',-5],['Polearm',-4],['Staff',-2]],
 Staff:[['DX',-5],['Polearm',-4],['Spear',-2]],
 Polearm:[['DX',-5],['Spear',-4],['Staff',-4],['Two-Handed Axe/Mace',-4]],
 'Two-Handed Sword':[['DX',-5],['Broadsword',-4],['Force Sword',-4]],
 Brawling:[],Karate:[],Boxing:[],DX:[['DX',0]],
 'Hammer Fist':[['Brawling',-1],['Karate',-1]],
 Kicking:[['DX',-2],['Brawling',-2],['Karate',-2]]
};
const option=skill=>({sourceHeader:skill,unmodifiedSkills:[skill],defaults:defaults[skill].map(([from,modifier])=>({from,modifier,type:from==='DX'?'attribute':'skill',recursive:false}))});
const profiles={...LT_CLOSEOUT_PROFILES},equipment=[];
const slug=s=>s.replace(/[^a-zA-Z0-9]/g,'');
function item(modelId,name,{id='eLTM26'+slug(modelId),tl=null,cost=null,mass=null,improvised=true,construction='fixed',qualityClass='crushing',pages=['LT63']}={}){
 const e={modelId:'lt:'+modelId,equipmentId:id,name,techLevel:tl,cost,mass,improvised,construction,qualityClass,sourcePages:pages};equipment.push(e);return e;
}
function mode(e,key,damage,reach,parry,st,skills,penalty=0,extra={}){
 const id=extra.modeId??'wLTM26'+slug(e.modelId)+slug(key);
 const p={...e,book:'LT',modeId:id,usage:key,stats:{damage,reach,parry,st},primarySkills:skills,sourceOptions:skills.map(option),attackModifier:penalty,
  hands:/[†‡]/.test(st??'')?2:1,martialGrips:[],displayUsage:true,damagePart:'striking-part',baselineQuality:e.improvised?'Cheap':'Good',baselineMaterial:'published',balanceOptions:[],
  qualityOptions:e.improvised?[{level:'Cheap',damageBonus:0,breakage:2}]:[],...extra};
 profiles[id]=p;return p;
}
const punch=(e,key,damage='thr-1 cr',skills=['Brawling'],penalty=0,extra={})=>mode(e,key,damage,'C','0',null,skills,penalty,{unarmedSkillBonus:true,...extra});
const hammer=e=>punch(e,'Hammer Fist','thr-1 cr',['Hammer Fist'],e.improvised?-1:0,{technique:'Hammer Fist',sourcePages:[...e.sourcePages,'LT64','MA73','B182','B203'],damagePart:'fist-load'});
let e=item('abacus','Abacus');punch(e,'Punch','thr cr',['Brawling'],-2,{stats:{damage:'thr cr',reach:'C',parry:'No',st:null}});
e=item('arrow-or-bolt','Arrow or Bolt');mode(e,'Thrust','thr-1 imp','C','No','5',['Knife'],0,{damageCap:'1d-4',sourcePages:['LT63','LT67'],hints:['Обычный наконечник. Барбы и иной тип наконечника выбираются вручную по LT73; предел Damage 1d−4. Поломка на 1–3 после успешного удара/парирования – вручную.']});
e=item('belt','Belt');mode(e,'Buckle','sw-2 cr','1','No','5',['Flail'],-1);mode(e,'Whip','sw-3(0.5) cr','1','No','6',['Whip'],-2,{motion:'swing',hints:['Одноярдовый ремень как Whip; Crack и опутывание – отдельные ручные действия.']});
e=item('book-or-codex','Book or Codex');punch(e,'Punch','thr-2 cr',['Brawling'],-2,{stats:{damage:'thr-2 cr',reach:'C',parry:'No',st:'7'}});
e=item('boots-shoes-or-sandals','Boots, Shoes, or Sandals');punch(e,'In hand','thr-1 cr',['Brawling'],-2,{stats:{damage:'thr-1 cr',reach:'C',parry:'0',st:'7'}});mode(e,'By laces','sw-2 cr','1','No','5',['Flail'],-2);
e=item('bottle-broken','Bottle, Broken');mode(e,'Swing','sw-3(0.5) cut','C,1','No','5',['Knife'],-2);mode(e,'Thrust','thr-1(0.5) imp','C','No','5',['Knife'],-2);
e=item('bottle-intact','Bottle, Intact');mode(e,'Swing','sw-1 cr','1','0','8',['Axe/Mace'],-2);
e=item('caltrop','Caltrop');punch(e,'Punch','thr-2 imp',['Brawling'],-2,{damagePart:'point'});
e=item('chain-unweighted','Chain, Unweighted');mode(e,'Swing','sw+1 cr','1-4*','No','11',['Kusari'],-1);mode(e,'Thrust','thr+1 cr','1-4*','No','11',['Kusari'],-1);
e=item('chair-or-stool','Chair or Stool');mode(e,'Swing','sw+4 cr','1,2*','0U','13‡',['Two-Handed Axe/Mace'],-2);
e=item('chair-or-stool','Chair or Stool (collapsible)',{id:'eLTM26ChairCollapsible'});mode(e,'Collapsible','sw+3 cr','1,2*','0U','13‡',['Two-Handed Axe/Mace'],-2);
for(const [id,name]of [['chopstick','Chopstick'],['comb-or-brush','Comb or Brush'],['key-skeleton','Key, Skeleton'],['rim-of-bottle-cup-or-glass','Rim of Bottle, Cup, or Glass']])hammer(item(id,name));
e=item('mug-or-stein','Mug or Stein');mode(e,'Swing','sw cr','1','No','8',['Axe/Mace'],-2);
e=item('mug-or-stein','Mug or Stein (large)',{id:'eLTM26MugLarge'});mode(e,'Large mug','sw+1 cr','1','No','10',['Axe/Mace'],-2);
e=item('pan-iron','Pan, Iron');mode(e,'Swing','sw+1 cr','1','No','12',['Axe/Mace'],-2,{breakageQuality:'Good'});
e=item('pen-or-stylus','Pen or Stylus');mode(e,'Thrust','thr-3 imp','C','No','5',['Knife'],-1);
e=item('pen-or-stylus','Pen or Stylus (huge)',{id:'eLTM26PenHuge'});mode(e,'Huge pen','thr-2 imp','C','No','5',['Knife'],-1);
e=item('pitchfork','Pitchfork');mode(e,'One hand','thr+2(0.5) imp','1*','0U','11',['Spear'],-2);mode(e,'Two hands','thr+3(0.5) imp','1,2*','0','10†',['Spear'],-2);
e=item('purse-coin-filled','Purse, Coin (Filled)');punch(e,'Punch','thr cr',['Brawling'],-1,{stats:{damage:'thr cr',reach:'C',parry:'0',st:'7'}});
e=item('rake','Rake');mode(e,'Swing','sw+3(0.5) imp','1,2*','0U','12‡',['Two-Handed Axe/Mace'],-2);
e=item('rings-heavy','Rings, Heavy');punch(e,'Punch','thr cr',['Boxing','Brawling','Karate','DX'],0,{damagePart:'fist-load',hints:['Надетые тяжёлые кольца: +1 к обычному Punch уже учтён. Не складывать с Brass Knuckles или gauntlets. LT63.']});
e=item('scarf','Scarf');mode(e,'Weighted end','sw cr','1','No','6',['Flail'],-1,{hints:['Только если тяжёлый предмет уже завязан в конец. Обычный шарф сам по себе не даёт этот удар. Удушение и подготовка – вручную. LT63.']});
e=item('scroll-rolled','Scroll, Rolled');mode(e,'Swing','sw-1 cr','1','0','6',['Shortsword'],-2);mode(e,'Thrust','thr-1 cr','1','0','6',['Shortsword'],-2);
e=item('shovel','Shovel');mode(e,'Swing','sw+4 cr','1,2*','0U','13‡',['Two-Handed Axe/Mace'],-2);
e=item('spindle-spike-or-spit','Spit (small)');mode(e,'Small spit','thr-3 imp','C','-1','5',['Knife'],-2);
e=item('spindle-spike-or-spit','Spindle, Spike, or Spit (dagger size)',{id:'eLTM26SpindleDagger'});mode(e,'Spike','thr-2 imp','C','-1','5',['Knife'],-2);
e=item('spindle-spike-or-spit','Spindle or Spit (long)',{id:'eLTM26SpindleLong'});mode(e,'Long spit swing','sw-3 cut','C,1','-1','6',['Knife'],-2);mode(e,'Long spit thrust','thr-1 imp','C','-1','6',['Knife'],-2);
e=item('strigil','Strigil');hammer(e);
// Source-only physical items. Alternatives are named uses of the same item, never imports.
e=item('cane','Cane',{improvised:false,cost:5,mass:3,pages:['LT55','LT65'],construction:'wood'});mode(e,'Swing','sw+1 cr','1','0','10',['Broadsword']);mode(e,'Thrust','thr+1 cr','1','0','10',['Broadsword']);
e=item('cane','Cane (light)',{id:'eLTM26CaneLight',improvised:false,cost:20,mass:1,pages:['LT55','LT69'],construction:'wood'});mode(e,'Light swing','sw cr','1','0F','6',['Rapier','Smallsword']);mode(e,'Light thrust','thr cr','1','0F','6',['Rapier','Smallsword']);
e=item('yawara','Yawara',{improvised:false,cost:10,mass:0.25,pages:['LT64','LT65'],construction:'fixed'});hammer(e);
e=item('rigid-scabbard','Rigid Scabbard',{pages:['LT57','LT69']});mode(e,'Swing','sw cr','1','0','6',['Shortsword'],0,{hints:['Только жёсткие ножны массой не менее 1 lb. Цена/масса зависят от конкретного меча; Cheap относится к поломке полых ножен. LT57.']});mode(e,'Thrust','thr cr','1','0','6',['Shortsword']);
e=item('wooden-leg','Wooden Leg',{tl:2,cost:250,mass:10,improvised:false,pages:['LT149','B271','B231','MA75']});mode(e,'Kick','thr+1 cr','C,1','No',null,['Kicking'],0,{hands:0,technique:'Kicking',unarmedSkillBonus:true,motion:'thrust',hints:['Удар установленным деревянным протезом. Падение после промаха и Lame – вручную; это не удар снятой ногой. LT149; B271.']});
e=item('adze','Adze',{tl:0,cost:40,mass:2,improvised:false,construction:'blade',qualityClass:'cutting',pages:['LT28','LT65']});mode(e,'Swing','sw cut','1','0','8',['Axe/Mace'],-2);
e=item('fishing-spear','Fishing Spear',{tl:0,improvised:false,cost:30,mass:2,construction:'blade',qualityClass:'impaling',pages:['LT29','LT69']});mode(e,'Thrust','thr+1 imp','1','0','6',['Spear'],0,{hints:['Штраф −2 LT29 относится только к метанию; обычный melee Thrust его не получает.']});
e=item('bayonet','Bayonet (detached)',{tl:4,improvised:false,cost:40,mass:1,construction:'blade',qualityClass:'cutting',pages:['LT54','LT55','LT67']});mode(e,'Swing','sw-2 cut','C,1','-1','6',['Knife']);mode(e,'Thrust','thr imp','C','-1','6',['Knife']);
e=item('climbing-pole','Climbing Pole',{tl:1,cost:80,mass:5,improvised:false,construction:'wood',pages:['LT125','LT69']});mode(e,'Swing','sw+2 cr','2,3','+2','10†',['Staff'],-2);mode(e,'Thrust','thr+2 cr','2,3','+2','10†',['Staff'],-2);
e=item('piton','Piton',{tl:2,cost:4,mass:0.75,improvised:false,construction:'blade',qualityClass:'impaling',pages:['LT125','LT67']});mode(e,'Thrust','thr-1 imp','C','-1','5',['Knife'],-2);
e=item('pry-bar','Pry-Bar (30 inches)',{id:'eLTM26PryBar30',tl:2,cost:80,mass:5,improvised:false,construction:'metal-head',pages:['LT126','LT65']});mode(e,'Swing','sw+2 cr','1','0U','10',['Axe/Mace']);
e=item('pry-bar','Pry-Bar (20 inches)',{id:'eLTM26PryBar20',tl:2,cost:60,mass:2,improvised:false,construction:'metal-head',pages:['LT126','LT65']});mode(e,'Small swing','sw+1 cr','1','0','10',['Broadsword']);mode(e,'Small thrust','thr+1 cr','1','0','10',['Broadsword']);
// Existing ranged Boomerang retains its physical GCS ID and every ranged field.
e=item('boomerang','Boomerang',{id:'eKPBObWzRN5w7bnh1',improvised:false,pages:['LT72','LT69'],construction:'wood'});mode(e,'Club swing','sw cr','1','0','6',['Shortsword']);mode(e,'Club thrust','thr cr','1','0','6',['Shortsword']);

export const LT_IMPROVISED_PROFILES=profiles;
export const LT_IMPROVISED_EQUIPMENT=equipment;
export const ltImprovisedSource=id=>profiles[id]??null;
export function ltImprovisedGripPolicy(p){
 if(!ltImprovisedSource(p?.modeId))return null;
 const id=p.gripTemplateModeId??p.tipOf,base=ltBladeSource(id)??ltImpactSource(id)??ltPolearmSource(id)??ltFlexibleSource(id);
 const policy=base&&(ltBladeGripPolicy(base)??ltImpactGripPolicy(base)??ltPolearmGripPolicy(base)??ltFlexibleGripPolicy(base));
 return policy?{...policy,grips:policy.grips.filter(g=>g!=='tip')}:{grips:p.martialGrips??[],twoHanded:p.hands===2};
}
function skillRows(actor){
 const out=[];const walk=t=>{for(const r of Object.values(t??{}))if(r&&typeof r==='object'){out.push(r);walk(r.contains);walk(r.collapsed);}};walk(actor?.system?.skills);return out;
}
// Only these published techniques. No recursive defaults and no generic technique-as-skill rule.
export function resolveImprovisedTechnique(actor,p){
 if(!p?.technique)return null;
 const rows=skillRows(actor),learned=r=>(Number(r.points)>0||r.learned===true)&&Number.isFinite(Number(r.level??r.import));
 const bases=rows.filter(r=>['Brawling','Karate'].includes(r.name)&&learned(r)).map(r=>({name:r.name,level:Number(r.level??r.import)}));
 const candidates=[];
 for(const b of bases)candidates.push({level:b.level+(p.technique==='Kicking'?-2:-1),source:'skill-default',sourceName:b.name,sourceLevel:b.level,defaultPenalty:p.technique==='Kicking'?-2:-1,baseSkill:b.name});
 if(p.technique==='Kicking'&&Number.isFinite(Number(actor?.system?.attributes?.DX?.value)))candidates.push({level:Number(actor.system.attributes.DX.value)-2,source:'attribute-default',sourceName:'DX',sourceLevel:Number(actor.system.attributes.DX.value),defaultPenalty:-2,baseSkill:'DX'});
 for(const r of rows.filter(learned)){
  const m=/^(Hammer Fist|Kicking)(?:\s*\((Brawling|Karate)\))?$/i.exec(String(r.name));if(!m||m[1].toLowerCase()!==p.technique.toLowerCase())continue;
  const base=bases.filter(b=>!m[2]||b.name.toLowerCase()===m[2].toLowerCase()).sort((a,b)=>b.level-a.level)[0];
  if(!base)continue;
  candidates.push({level:Math.min(Number(r.level??r.import),base.level),source:'learned-technique',sourceName:r.name,sourceLevel:Number(r.level??r.import),defaultPenalty:0,baseSkill:base.name});
 }
 candidates.sort((a,b)=>b.level-a.level);
 const best=candidates[0];return best?{...best,name:p.technique,resolved:true,learned:best.source==='learned-technique',level:best.level+p.attackModifier,directWeaponPenalty:p.attackModifier,penalty:best.defaultPenalty+p.attackModifier,candidates:[]}:
 {name:p.technique,resolved:false,level:null,candidates:[],reason:'Нет изученного базового Brawling/Karate для Hammer Fist (LT64; MA73).'};
}
export function techniqueDamageBonus(p,skill,actor){
 const name=skill.baseSkill,base=skillRows(actor).filter(r=>r.name===name&&(Number(r.points)>0||r.learned===true)).sort((a,b)=>Number(b.level??b.import)-Number(a.level??a.import))[0];
 const relative=Number(base?.level??base?.import)-Number(actor?.system?.attributes?.DX?.value);
 return {name:name??p.technique,source:p.technique==='Kicking'?'B231; MA75':'LT64; MA73',bonusPerDie:name==='Brawling'&&relative>=2?1:name==='Karate'&&relative>=1?2:name==='Karate'&&relative>=0?1:0};
}
export function publishedHandParry(p,name,skill,actor){
 if(!p.handParry)return null;
 name=p.technique?skill.baseSkill:name;
 const entry=skillRows(actor).filter(r=>r.name===name&&(Number(r.points)>0||r.learned===true)).sort((a,b)=>Number(b.level??b.import)-Number(a.level??a.import))[0];
 const level=name==='DX'||!entry&&skill.sourceName==='DX'?Number(actor?.system?.attributes?.DX?.value):Number(entry?.level??entry?.import);
 return Number.isFinite(level)?String(3+Math.floor(level/2)):null;
}
export function ltImprovisedHints(p){return [
 ...(p.improvised?['Опубликованная ударная часть: Cheap; Fine, Superfine и материал соседнего оружия не назначаются. '+p.sourcePages[0]+'.']:[]),
 ...(p.improvised&&p.sourcePages.includes('LT63')?['Improvised Weapons для нужного навыка снимает его импровизированный штраф, но не штраф Damage. Если перк ещё не учтён итогом GGA, поправка задаётся вручную. LT9; LT63.']:[]),
 ...(p.breakageQuality==='Good'?['Железная сковорода ломается как Good; это не бонус Damage. LT63.']:[]),
 ...(p.damageCap?['Предел Damage '+p.damageCap+' применяется к итоговому профилю. LT63.']:[]),
 ...(p.stats.parry==='No'?['Этим способом предмет не парирует. Проверка защиты – вручную. '+p.sourcePages[0]+'.']:[]),
 ...(p.shield?['Тот же физический щит. DB, Block, DR/HP и защиты GGA не меняются. Установленный шип/кромка относится только к выбранному экземпляру; качество усиливает только его cut/imp часть. LT68; LT113–116.']:[]),
 ...(p.technique?['Бонус Damage берётся из базового изученного Brawling/Karate, не из уровня техники. LT64; MA73; MA75.']:[]),
 ...(p.hints??[]),'Reach, Ready, поломка, захваты, удушение, щитовые применения и специальные действия проверяются вручную; Attack ими не блокируется. '+p.sourcePages.join('; ')+'.'];}
export function resolveImprovisedQuality(p,s={}){
 const grade=p.baselineQuality;
 if(s.quality&&s.quality!==grade||s.baselineQuality&&s.baselineQuality!==grade||s.balance&&s.balance!=='Normal'||s.material&&s.material!=='published'||s.coating||s.blade&&s.blade!=='standard'||s.baselineBlade&&s.baselineBlade!=='standard')throw Error('Этот предмет использует опубликованную ударную часть; замена качества, материала и Superfine не подтверждены ('+p.sourcePages[0]+').');
 return {level:grade,baseline:grade,damageBonus:0,damageTypes:[],skillBonus:0,material:'published',balance:'published',price:p.cost,mass:p.mass,weaponTL:s.weaponTL==null||s.weaponTL===''?null:Number(s.weaponTL),hints:ltImprovisedHints(p),sourcePages:p.sourcePages};
}
export function applyLTImprovisedSourceMode(m,e,{snapshot=false}={}){
 const p=profiles[m?.weapon_mode_id];if(!p||e.source!=='LT'||e.equipment_id!==p.equipmentId)return m;
 const before=p.sourceFieldsBefore;
 if(!snapshot||before&&[before.damage,p.stats.damage].includes(m.raw_calc?.damage)){const d=/^(sw|thr)([+-]\d+)?(?:\(([\d.]+)\))? (\S+)$/.exec(p.stats.damage);
  m.stats={...m.stats,damage:{st:d[1],...(d[2]?{base:String(Number(d[2]))}:{}),...(d[3]?{armor_divisor:Number(d[3])}:{}),type:d[4]}};m.raw_calc={...m.raw_calc,damage:p.stats.damage};}
 for(const [key,field]of [['reach','reach'],['parry','parry'],['strength','st']])if(!snapshot||before&&[before[field],p.stats[field]].includes(m.stats[key]))m.stats[key]=p.stats[field];
 if(!snapshot||before&&[before.usage,p.usage].includes(m.usage))m.usage=p.usage;
 m.lt_improvised_contract={modelId:p.modelId,sourcePages:p.sourcePages,damagePart:p.damagePart};return m;
}
export function projectLTImprovisedSourceData(book,data){
 if(book!=='weapons')return data;
 for(const spec of equipment){let e=data.equipment.find(e=>e.equipment_id===spec.equipmentId);
  if(!e){e={source:'LT',book:'Low-Tech',equipment_id:spec.equipmentId,name:spec.name,reference:spec.sourcePages[0],tech_level:spec.techLevel==null?null:String(spec.techLevel),tags:['Melee Weapon'],local_notes:null,modes:[],lt_improvised_origin:'module-printed-source-overlay'};data.equipment.push(e);}
 }
 for(const e of data.equipment.filter(e=>e.source==='LT'))for(const p of Object.values(profiles).filter(p=>p.equipmentId===e.equipment_id))if(!e.modes.some(m=>m.weapon_mode_id===p.modeId)){
  const m={weapon_mode_id:p.modeId,index:e.modes.length,usage:p.usage,usage_notes:null,hidden:false,combat_type:'melee',role:'attack',stats:{},raw_calc:{},defaults:[],weapon_family:'melee',hand_use:{value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'},action_hints:[],resolution_flags:[]};
  applyLTImprovisedSourceMode(m,e);e.modes.push(m);
 }
 return data;
}
const usageLabels={'Butt thrust':'Удар торцом приклада','Barrel swing':'Амплитудный удар за ствол','Pistol butt':'Удар прикладом пистолета','Pistol punch':'Punch с малым пистолетом','Bayonet - fitted and mounted':'Thrust – подогнанный установленный штык','Bayonet Tip Slash - fitted and mounted':'Tip Slash – подогнанный установленный штык','In hand':'В руке','By laces':'За шнурки','Buckle':'Пряжкой','Collapsible':'Складной стул','Large mug':'Большая кружка','Huge pen':'Большое перо','One hand':'Thrust – 1 рука','Two hands':'Thrust – 2 руки','Weighted end':'Утяжелённым концом','Small spit':'Малый вертел','Spike':'Шип / средний вертел','Long spit swing':'Swing – длинный вертел','Long spit thrust':'Thrust – длинный вертел','Light swing':'Swing – лёгкая трость','Light thrust':'Thrust – лёгкая трость','Small swing':'Swing – 20 дюймов','Small thrust':'Thrust – 20 дюймов','Club swing':'Swing как Baton','Club thrust':'Thrust как Baton'};
// Exact non-weapon equipment records read in the LT GCS library; no name-based binding.
const gcsEquipment={
 'eLTM26abacus':['eEx7Fz5YMg-h8Fo81'],
 'eLTM26comborbrush':['eLWMZ6dTw31OpQnEN','e9rmOLEEYolk6erof'],
 'eLTM26strigil':['etTZAQxgFoowrU0L-'],
 'eLTM26piton':['e6YK0oUOZX5gV5u95'],
 'eLTM26PryBar30':['e53kylcrw4kKHsjVs'],
 'eLTM26PryBar20':['evUVMwqUlj01zb1iz'],
 'eLTM26penorstylus':['e02vbPYPQv9_gP57n']
};
const gripTemplates={
 'eLTM26cane':'wrdwSAqzcb2G6SYD-',eLTM26CaneLight:'wyxvV6sALMObn8IJA',
 eLTM26rigidscabbard:'wZOAYw4rp9DEQ56j7',eLTM26adze:'w5_RDw9gTBE_eXbu1',
 eLTM26fishingspear:'wxQwFPWfIo1mgb8bU',eLTM26bayonet:'wHh4b6lYKhc7xjiCp',
 eLTM26climbingpole:'wk4ty2OdpeeoKr0i0',eLTM26PryBar20:'wrdwSAqzcb2G6SYD-'
};
export const LT_IMPROVISED_MANUAL={
 'lt:bootlaces':'Только удушение как верёвочной гарротой: Garrote−2 и −1 Damage. Обычной числовой атаки нет. LT63; B405.',
 'lt:belt':'Удушение: Garrote−1 и −1 Damage верёвочной гарроты. Опутывание как одноярдовым Whip при Whip−2 – вручную. LT63; B405.',
 'lt:book-or-codex':'В двух руках может служить малым щитом при Shield−1; защита и экипировка не автоматизируются. LT63.',
 'lt:boots-shoes-or-sandals':'Метание за шнурки как Bola Perdida при Sling−2, −1 Damage и половинной дальности – отдельное ranged-применение. Шнурки: Garrote−2 и −1 Damage при удушении. LT63.',
 'lt:chain-unweighted':'Опутывание как Kusari при Kusari−4 – вручную. Цепь Cheap: $6 и 2 lb за ярд; без подтверждённой длины общая цена/масса не вычисляются. LT63.',
 'lt:chair-or-stool':'В одной руке может служить средним щитом при Shield−1; обычный удар требует двух рук. LT63.',
 'lt:pan-iron':'В одной руке может служить железным малым щитом при Shield−1; защита и экипировка не автоматизируются. LT63.',
 'lt:scarf':'Удушение как верёвочной гарротой при Garrote−1, без штрафа Damage. Обычный Flail-удар требует уже завязанного тяжёлого предмета. LT63; B405.',
 'lt:strigil':'Hook при Knife−1 и применение Pressure Secrets – ручные процедуры. Режущий край меняет тип именно специальной Pressure Secrets атаки; обычный Hammer Fist остаётся cr. LT63.',
 'lt:chopstick':'Pressure Secrets вместо Hammer Fist: обычный штраф −2 этой процедуры и +1 к последующему Pressure Secrets; обычный Damage предмета не заменяется. LT63.',
 'lt:comb-or-brush':'Pressure Secrets применяется вручную; +1 к последующей проверке не является бонусом обычной атаки. LT63.',
 'lt:key-skeleton':'Pressure Secrets применяется вручную; +1 к последующей проверке не является бонусом обычной атаки. LT63.',
 'lt:rim-of-bottle-cup-or-glass':'Pressure Secrets применяется вручную; +1 к последующей проверке не является бонусом обычной атаки. LT63.',
 'lt:bottle-intact':'Стекло ломается на 1–3 на 1d при ударе/парировании; при 1 наносит thr cut руке. Переход к разбитой бутылке и последствия – вручную. LT63.',
 'lt:bottle-broken':'Стекло ломается на 1–3 на 1d при ударе/парировании; при 1 наносит thr cut руке. Последствия – вручную. LT63.',
 'lt:cane':'Трость с крюком допускает Hook; добавление крюка не меняет опубликованные цену и массу. Процедура зацепа остаётся ручной. LT55; LT54.',
 'lt:yawara':'Hammer Fist: +1 от Yawara компенсирует −1 Damage техники. Hurting Yourself использует 1/10 вместо 1/5; +1 к последующим Judo holds/locks – вручную. LT64; MA73.',
 'lt:purse-coin-filled':'При поломке содержимое рассыпается; монеты и инвентарь автоматически не меняются. LT63.'
};
for(const p of Object.values(profiles)){
 p.handParry=p.unarmedSkillBonus===true&&p.stats.parry==='0';
 if(gripTemplates[p.equipmentId])p.gripTemplateModeId=gripTemplates[p.equipmentId];
 if(LT_IMPROVISED_MANUAL[p.modelId])p.hints=[...(p.hints??[]),LT_IMPROVISED_MANUAL[p.modelId]];
 if(gcsEquipment[p.equipmentId])p.gcsEquipmentIds=gcsEquipment[p.equipmentId];
 p.usage=usageLabels[p.usage]??p.usage;
 if(p.damageCap&&p.tipOf)p.damageCap='1d-6';
 if(p.hostRule)p.hints=[p.hostRule==='LT54-custom-fit-bayonet'?
  'Только уже установленный и индивидуально подогнанный под этот экземпляр штык. Совместимость не назначается автоматически. Familiarity, ограничения plug/socket и Ready – вручную. Индивидуальные melee ST/Reach/Parry не подтверждены.':
  'Тот же физический экземпляр оружия, выбран только способ melee. Стрельба и боеприпасы сохраняются. Melee ST и индивидуальный Reach не опубликованы; ranged ST не подставляется.'];
 if(p.hostRule==='LT54-custom-fit-bayonet')Object.assign(p,{improvised:false,construction:'blade',qualityClass:'cutting',baselineQuality:'Good'});
 if(p.modelId==='lt:oar')Object.assign(p,{cost:40,mass:8,construction:'wood',qualityClass:'crushing',sourcePages:['LT60','LT68'],baselineQuality:'Good',sourceOptions:[option('Polearm')]});
 if(p.modelId==='lt:wooden-stake'&&p.tipOf){p.stats={...p.stats,damage:'thr-2 cr'};p.damagePart='wooden-point';p.sourcePages=[...new Set([...p.sourcePages,'LT71'])];p.hints=['Tip Slash деревянным остриём: cutting заменяется на crushing по LT71; AD колющего деревянного острия не переносится на cr.'];}
 if(p.modelId==='lt:wooden-leg'){p.fixedPublishedQuality=true;p.qualityOptions=[{level:'Good',damageBonus:0}];p.hints=[...(p.hints??[]),'Удар твёрдой деревянной поверхностью. Оружейное Fine/Superfine и CF не переносятся на весь протез; опубликованные $250 и 10 lb сохраняются. LT149.'];}
 if(['lt:spike-shuriken','lt:star-shuriken'].includes(p.modelId))Object.assign(p,{primarySkills:['Brawling','Karate','DX'],sourceOptions:['Brawling','Karate','DX'].map(skill=>({...option(skill),defaults:[{from:'DX',modifier:0,type:'attribute',recursive:false}]}))});
}
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profiles);freeze(equipment);
