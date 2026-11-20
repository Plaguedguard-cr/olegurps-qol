import {getMeleeTechniqueRows} from './combat-technique-registry.js';
import {normalizeMeleeTechniques,learnedMeleeSkills,meleeTechniqueRuntimeContext,isCleanTechniqueAttack,
 findTechniqueLevel,learnedCarvingLetters,readMeleePosture,techniqueGroups,techniqueLearned,techniqueIdentity} from './melee-penalty-techniques.js';
import {readCombatTechniqueSkills} from './combat-technique-data.js';
import {initialCarvingProgress,meleeTechniqueReadiness} from './melee-technique-procedures.js';
import {meleeActorTurnKey} from './melee-technique-sequences.js';
import {strikeTechniqueFields} from './melee-strike-techniques.js';
import {meleeSpecialHints,meleeSpecialHint} from './melee-special-hints.js';
import {meleeSpecialRollPreviews} from './melee-service.js';
const yesNo=[['','Не указано'],['yes','Да'],['no','Нет']];
const postureIds=['groundFighting','lowFighting','fightingWhileSeated'];
const titles={attackFromAbove:'Атака сверху',backKick:'Удар ногой назад',backStrike:'Удар оружием назад',
 cavalryTraining:'Верховой бой',closeCombat:'Бой вплотную',groundFighting:'Бой лёжа',lowFighting:'Бой с колен',
 fightingWhileSeated:'Бой сидя',crack:'Щелчок кнутом',hammerFist:'Удар ребром кулака',kicking:'Удар ногой',
 pressurePointStrike:'Удар по болевой точке',reverseGrip:'Быстрая смена хвата',dualWeaponAttack:'Атака двумя руками',
 initialCarving:'Вырезать букву',combination:'Комбинация'};
const sequenceIds=['dualWeaponAttack','combination'];
const normalize=techniqueIdentity;

export function meleeTechniqueChoices(options,rows=getMeleeTechniqueRows(options)){
 const {actor,attack,governingSkill}=options;
 const skill=governingSkill&&{...governingSkill,weaponId:attack?.standaloneRef?.weaponId??attack?.equipmentRef?.instanceId};
 const learned=[];
 const all=rows.filter(({rule,result})=>!rule.specialProfile||result.available).map(({rule,result})=>{
  const hint=rule.specialProfile&&meleeSpecialHint(rule.specialProfile.ref);
  return {id:rule.id,name:rule.name,title:hint?.title??rule.title??titles[rule.id]??'',hint,
   detail:result.available&&Number.isFinite(result.level)?(rule.specialProfile?.action?'Навык ':result.learned?'Изучено ':'Default ')+result.level:null};
 });
 for(const {rule,result} of rows){
  const choice=all.find(c=>c.id===rule.id);
  if(rule.specialProfile){
   if(choice&&!rule.specialProfile.action)for(const option of result.special.choices.filter(s=>s.learned)){
    learned.push({...choice,name:choice.name+' ('+option.key.replace(':',' / ')+')',
     specialSkill:option.key,detail:'Изучено '+option.level});
   }
  }else if(rule.id==='initialCarving'){
   for(const letter of learnedCarvingLetters({actor,rule,skill}))learned.push({...choice,letter,name:rule.name+' ('+letter+')',detail:null});
  }else if(rule.id==='combination'){
   const names=new Map();
   for(const entry of readCombatTechniqueSkills(actor)){
    const name=[entry.name,entry.originalName].find(n=>/^Combination\s*\(/i.test(n??''));
    const count=name&&techniqueGroups(name)[0]?.split(/\s+\+\s+/).length;
    if([2,3].includes(count)&&techniqueLearned(entry)&&Number(entry.points)>=count+2)names.set(normalize(name),{name,count});
   }
   for(const {name,count} of names.values())learned.push({...choice,name,recipe:name,count,detail:null});
  }else if(rule.strikeProfile){
   for(const option of result.strikeSkills?.filter(s=>s.learned)??[]){
    learned.push({...choice,name:choice.name+' ('+option.name+')',skill:option.name});
   }
  }else if(skill?.learned!==false&&findTechniqueLevel({actor,rule,skill,maximum:0})){
   learned.push({...choice,detail:result.learned?choice.detail:null});
  }
 }
 return {all,learned};
}

function techniquePicker(options,rows,escape,handField=''){
 const {mode}=options.picker??{};
 const catalog=mode?meleeTechniqueChoices(options,rows)[mode]:[];
 const hints=mode==='all'?meleeSpecialHints(options).filter(hint=>!rows.some(({rule})=>rule.specialProfile?.ref===hint.id)):[];
 const query=normalize(options.picker?.query);
 const searchText=({name,title})=>name+' '+title;
 const matches=entry=>normalize(searchText(entry)).includes(query);
 return `<div class="gam-technique-tabs">
  <button type="button" data-technique-picker="all" aria-expanded="${mode==='all'}">Техники</button>
  <button type="button" data-technique-picker="learned" aria-expanded="${mode==='learned'}">Изученные техники</button>
  ${handField}
 </div>${mode?`<div class="gam-technique-picker">
  ${mode==='all'?'<input type="search" name="meleeTechniqueSearch" placeholder="Поиск техники" aria-label="Поиск техники" value="'+escape(options.picker.query??'')+'">':''}
  <div class="gam-technique-results">${catalog.map(c=>{
    return `<button type="button" data-melee-technique-add="${c.id}" data-technique-search="${escape(searchText(c))}" ${c.specialSkill?'data-special-skill="'+escape(c.specialSkill)+'"':''} ${c.skill?'data-strike-skill="'+escape(c.skill)+'"':''} ${c.letter?'data-technique-letter="'+escape(c.letter)+'"':''} ${c.recipe?'data-technique-recipe="'+escape(c.recipe)+'" data-technique-count="'+c.count+'"':''} ${matches(c)?'':'hidden'}>
      <span>${escape(c.name)}</span>${c.detail?'<small>'+escape(c.detail)+'</small>':''}
    </button>`;
   }).join('')}${hints.map(hint=>{
    const text=hint.text+' '+hint.sources+'.';
    return `<button type="button" class="gam-technique-reference" data-melee-special-hint="${hint.id}" data-technique-search="${escape(searchText(hint))}"
      data-tooltip="${escape(text)}" data-tooltip-class="gam-melee-special-hint" aria-description="${escape(text)}" ${matches(hint)?'':'hidden'}>
      <span>${escape(hint.title)}</span><small aria-hidden="true">(?)</small>
    </button>`;
   }).join('')}</div>
  <p data-technique-empty ${catalog.some(matches)||hints.some(matches)?'hidden':''}>${mode==='learned'?'Нет изученных техник для текущего навыка.':'Ничего не найдено.'}</p>
 </div>`:''}`;
}

export function filterMeleeTechniquePicker(input){
 const panel=input.closest('.gam-technique-picker');
 if(!panel)return;
 let visible=false;
 for(const row of panel.querySelectorAll('[data-technique-search]')){
  row.hidden=!normalize(row.dataset.techniqueSearch).includes(normalize(input.value));
  visible||=!row.hidden;
 }
 panel.querySelector('[data-technique-empty]').hidden=visible;
}

export function meleeTechniqueControls(options,escape){
 const selected=normalizeMeleeTechniques(options.selection);
 const context=meleeTechniqueRuntimeContext(options.actor,selected.context);
 if(context.whipKind===undefined&&context.ordinaryWhip)context.whipKind='ordinary';
 const rows=getMeleeTechniqueRows({...options,context});
 const ids=selected.ids,active=rows.filter(r=>ids.includes(r.rule.id));
 const field=(name,label,values)=>`<label class="gam-technique-field"><span>${escape(label)}</span><select data-melee-technique-context="${name}">${values.map(([v,l])=>`<option value="${escape(v)}" ${String(typeof context[name]==='boolean'?(context[name]?'yes':'no'):context[name]??'')==v?'selected':''}>${escape(l)}</option>`).join('')}</select></label>`;
 const input=(name,label,type='text',min='')=>`<label class="gam-technique-field"><span>${escape(label)}</span><input data-melee-technique-context="${name}" type="${type}" value="${escape(context[name]??'')}" ${min!==''?`min="${min}"`:''}></label>`;
 const bool=(name,label)=>field(name,label,yesNo);
 const check=(name,label)=>`<label class="gam-technique-check"><input type="checkbox" data-melee-technique-context="${name}" ${context[name]?'checked':''}> ${escape(label)}</label>`;
 const button=(action,label)=>`<button type="button" data-melee-technique-action="${action}">${label}</button>`;
 const controls=[],actions=[];
 for(const {rule,result} of active.filter(({rule})=>rule.specialProfile)){
  const special=result.special;
  if(special.choices.length>1){
   const name='specialSkill:'+rule.id;
   context[name]=special.selectedSkill;
   controls.push(field(name,'Навык или защита',special.choices.map(({key,level})=>[key,key.replace(':',' / ')+' '+level])));
  }
  if(special.confirm){
   const name='specialConfirm:'+rule.specialProfile.ref;
   context[name]=context.specialConfirmed?.[rule.specialProfile.ref];
   controls.push(check(name,special.confirm));
  }
  for(const config of special.fields??[]){
   controls.push(config.type==='check'?check(config.name,config.label):config.type==='number'?input(config.name,config.label,'number','0'):field(config.name,config.label,config.choices));
  }
  if(special.kind==='attack')continue;
  for(const roll of meleeSpecialRollPreviews(options,special)){
   const enabled=!special.error&&Number.isFinite(roll.effectiveLevel)&&!(options.errors??[]).length;
   actions.push(`<button type="button" data-melee-technique-action="special-roll" data-special-id="${escape(rule.id)}" data-special-roll="${escape(roll.id)}" ${enabled?'':'disabled'}>
    ${escape(roll.label)}${Number.isFinite(roll.effectiveLevel)?' · '+roll.effectiveLevel:''}</button>`);
  }
 }
 const activeStrikes=active.filter(({rule})=>rule.strikeProfile);
 for(const config of strikeTechniqueFields(activeStrikes.map(({rule})=>rule),{...options,context})){
  const {name,label,type,choices}=config;
  if(name==='posture'&&ids.some(id=>postureIds.includes(id)))continue;
  controls.push(type==='check'?check(name,label):type==='select'?field(name,label,choices):input(name,label,type));
 }
 for(const {rule,result} of activeStrikes){
  if(result.strikeSkills?.length>1){
   const name='strikeSkill:'+rule.id;
   context[name]=context.strikeSkills?.[rule.id]??result.strikeSkill;
   controls.push(field(name,rule.name+' – навык',result.strikeSkills.map(s=>[s.name,s.name])));
  }
 }
 const nativePosture=readMeleePosture(options.actor);
 if(ids.some(id=>postureIds.includes(id))&&(nativePosture.source!=='gga-posture'||nativePosture.value==='sitting'&&ids.includes('fightingWhileSeated'))){
  const posture=ids.includes('groundFighting')?[['prone','Лёжа лицом вниз'],['supine','Лёжа лицом вверх'],['crawling','Ползком']]:
   ids.includes('lowFighting')?[['kneeling','На коленях'],['crouching','На корточках']]:[['seated','На стуле / опоре']];
  controls.push(field('posture','Положение',[['','Выберите положение'],...posture]));
 }
 if(ids.some(id=>['backKick','backStrike'].includes(id)))controls.push(check('rearAttackConfirmed','Цель сзади, ноги свободны'));
 const clean=isCleanTechniqueAttack(options.attack);
 if(ids.includes('backStrike')&&!clean&&active.find(r=>r.rule.id==='backStrike')?.result.damageReduction)controls.push(bool('swingReductionIncluded','Штраф swing Damage уже учтён'));
 if(ids.includes('cavalryTraining')){
  const riding=learnedMeleeSkills(options.actor).filter(s=>/^Riding(?:\s*\(|$)/i.test(s.name));
  if(riding.length>1)controls.push(field('ridingSkill','Навык Riding', [['','Выберите'],...riding.map(s=>[s.name,s.name])]));
  if(context.mountedStyle==='couched-lance')actions.push(button('ordinary-mounted','Обычная верховая атака'));
  controls.push(check('mountAttacked','Скакун атаковал'),check('fastMount','Скорость относительно цели ≥7'));
 }
 if(ids.includes('crack')&&!options.knownWhip)controls.push(field('whipKind','Предмет для Crack',[['','Выберите'],['ordinary','Обычный кнут'],...(context.cinematicDefaults?[['cinematic-like','Whip-подобный предмет']]:[])]));
 const hasTarget=options.hasTarget===true;
 const sequences=ids.some(id=>sequenceIds.includes(id));
 if(ids.includes('pressurePointStrike')){
  if(options.pressureOptions?.length>1)controls.push(field('pressureSkill','Особый навык',[['','Выберите'],...options.pressureOptions.map(s=>[s,s])]));
  if(!hasTarget&&options.pressureOptions?.length&&!/^Pressure Secrets/i.test(context.pressureSkill??''))controls.push(field('pressureTargetActorId','Цель',[['','Выберите цель'],...(globalThis.game?.actors?.contents??[]).filter(a=>a.visible!==false).map(a=>[a.id,a.name])]));
 }
 if(sequences&&!options.knownHands)controls.push(field('weaponHands','Текущий хват',[['','Выберите'],['1','Одна рука'],['2','Две руки']]));
 if(sequences&&!hasTarget)controls.push(input('manualTarget','Цель без токена'));
 if(sequences&&options.needsAdjacency)controls.push(check('adjacentTargets','Цели смежные'));
 const ordinaryHand=!sequences&&context.weaponHands===1&&!options.attack?.unarmedRef&&clean&&
   !active.some(({rule})=>rule.specialProfile&&rule.specialProfile.kind!=='attack');
 if(sequences&&context.hand==='off'&&!clean&&!options.attack?.unarmedRef)controls.push(input('offHandIncluded','Уже учтённый штраф другой руки','number'));
 if(ids.includes('combination')&&(context.weaponHands??1)===1)controls.push(field('hand','Рука этого шага',[['main','Основная'],['off','Другая']]));
 if(ids.includes('combination')&&!globalThis.game?.combat?.started&&options.hasEncounter)actions.push(button('new-encounter','Новый бой'));
 const turnKey=meleeActorTurnKey(options.actor),readiness=meleeTechniqueReadiness(options.actor,options.attack);
 const endedTurn=Object.values(options.actor?.getFlag?.('olegurps-qol','meleeTechniqueReadiness')??{}).some(s=>s.turnEnded&&s.turnKey===turnKey);
 if(ids.includes('reverseGrip'))actions.push(button('reverse-grip','Бросок смены хвата'));
 if(readiness?.dropped&&readiness.turnKey!==turnKey)actions.push(button('pickup-ready','Оружие подобрано'));
 if(!globalThis.game?.combat?.started&&(endedTurn||ids.includes('reverseGrip')&&readiness?.turnKey===turnKey))actions.push(button('advance-turn','Новый ход'));
 let carving='';
 if(ids.includes('initialCarving')){
  const progress=initialCarvingProgress(options.actor,context);
  controls.push(input('letter','Буква (необязательно)'));
  if(!progress.entry)controls.push(input('strokeCount','Штрихов','number','1'));
  if(context.carvingTipSlash&&!options.knownTipReach)controls.push(input('tipSlashReach','Максимальная Reach хвата'));
  carving=`<p class="gam-carving-progress">${progress.finished&&!context.retryCarving?'Броски за все штрихи выполнены':'Штрих '+context.stroke+' из '+context.strokeCount}</p>`;
  if(progress.entry)actions.push(button('new-carving','Начать заново'));
  if(progress.completed>1&&progress.entry?.parts.some(p=>p.stroke===progress.completed&&p.misaligned&&p.mark!==false))actions.push(button('retry-carving','Поправить последний штрих'));
 }
 const hasActive=active.length>0||!!options.sequenceSetup;
 const handText=(name,fallback)=>globalThis.game?.i18n?.localize('OleGURPS.CombatPerk.'+name)??fallback;
 const handField=ordinaryHand?`<div class="gam-melee-standard-hand">${field('hand',handText('Hand','Рука'),
   [['main',handText('MainHand','Основная')],['off',handText('OffHand','Неосновная')]])}</div>`:'';
 return `<div class="gam-melee-techniques">${techniquePicker(options,rows,escape,handField)}
  ${hasActive?`<details class="gam-active-techniques" data-melee-active-techniques ${options.activeOpen?'open':''}>
  <summary>Активные техники${active.length?' ('+active.length+')':''}</summary>
  <div class="gam-melee-technique-body">
  ${active.map(({rule,result})=>{
   const hint=rule.specialProfile&&meleeSpecialHint(rule.specialProfile.ref);
   const help=hint?hint.text+' '+hint.sources+'.':'';
   return `<div class="gam-melee-technique-row"><span><strong>${escape(rule.name)}</strong>${rule.operation==='SEQUENCE'?'':result.available?' · '+(rule.specialProfile?.action?'Навык':result.learned?'Изучено':'Default')+' '+result.level:''}
   ${help?` <span tabindex="0" class="gam-melee-martial-help" data-tooltip="${escape(help)}" data-tooltip-class="gam-melee-special-hint" aria-label="${escape(help)}">(?)</span>`:''}
   ${result.strike?.fixedLocation?' · '+escape({eye:'Глаз',face:'Верхняя часть лица',ear:'Ухо'}[result.strike.fixedLocation]):''}
   ${result.strike&&result.notes.length?`<small>${escape(result.notes.join(' '))}</small>`:''}
   ${!rule.specialProfile&&!rule.strikeProfile&&!clean&&rule.operation!=='CONTEXT'&&rule.operation!=='SEQUENCE'&&result.available&&result.originalModifier!==0?`<details><summary>Поправки из GGA</summary><label>Уже учтённый штраф <input type="number" data-melee-technique-included="${escape(rule.id)}" value="${escape(context.includedModifiers?.[rule.id]??'')}" placeholder="Неизвестно"></label></details>`:''}
   ${!clean&&result.available&&result.damageFlat?`<details><summary>Damage из GGA</summary><label>Уже учтённая поправка <input type="number" data-melee-technique-damage-included="${escape(rule.id)}" value="${escape(context.includedDamage?.[rule.id]??'')}" placeholder="Неизвестно"></label></details>`:''}
   </span><button type="button" data-melee-technique-remove="${escape(rule.id)}" aria-label="Убрать ${escape(rule.name)}">×</button></div>`;
  }).join('')}
  ${carving}${controls.length?`<div class="gam-melee-technique-context">${controls.join('')}</div>`:''}
  ${actions.length?`<div class="gam-technique-tabs">${actions.join('')}</div>`:''}
  ${options.sequenceSetup??''}</div></details>`:
  actions.length?`<div class="gam-technique-tabs">${actions.join('')}</div>`:''}
  <div data-melee-technique-errors>${escape((options.errors??[]).join(' '))}</div></div>`;
}
export function readTechniqueContextField(element){
 const name=element.dataset.meleeTechniqueContext,value=element.value;
 if(element.type==='checkbox')return [name,element.checked];
 if(element.type==='number'&&name.startsWith('strike'))return [name,value===''?null:Number(value)];
 if(['weaponHands','strokeCount','offHandIncluded'].includes(name))return [name,value===''?null:Number(value)];
 if(['fromAbove','behindKnown','legsFree','mounted','mountAttacked','fastMount','closeCombat','ordinaryWhip','reversibleWeapon','canThrust','adjacentTargets','swingReductionIncluded','carvingTipSlash'].includes(name))return [name,value===''?null:value==='yes'];
 return [name,value];
}
export function meleeTechniqueExplanation(plan,escape){
 if(!plan)return '';
 return '<details class="olegurps-chat-details"><summary>Техники</summary><div>'+plan.results.map(r=>
  '<p>'+escape(r.name)+': '+escape(r.governingSkill)+' '+r.governingSkillLevel+'; '+(r.learned?'изучено':'Default')+' '+r.level+
  '; '+r.originalModifier+' → '+r.modifier+'. '+escape(r.sources.join('; '))+'</p>'+r.notes.map(n=>'<p>'+escape(n)+'</p>').join('')).join('')+'</div></details>';
}

export const MELEE_TECHNIQUE_CSS=`
.gam-melee-techniques{display:grid;gap:6px;margin:6px 0}
.gam-technique-tabs{display:flex;flex-wrap:wrap;gap:5px}
.gam-technique-tabs>button{flex:0 1 auto;padding-inline:10px}
.gam-technique-tabs>button[aria-expanded="true"]{border-color:var(--color-border-highlight)}
.gam-melee-standard-hand>.gam-technique-field{display:flex;align-items:center;gap:6px}
.gam-melee-standard-hand>.gam-technique-field select{width:120px;flex:0 1 120px}
.gam-technique-picker,.gam-active-techniques{border:1px solid var(--color-border-light-primary)}
.gam-technique-picker,.gam-melee-technique-body{display:grid;gap:5px;padding:7px;min-width:0}
.gam-active-techniques>summary{cursor:pointer;padding:5px 7px;font-weight:600}
.gam-active-techniques[open]>summary{border-bottom:1px solid var(--color-border-light-primary)}
.gam-active-techniques:not([open])>.gam-melee-technique-body{display:none}
.gam-technique-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:4px;max-height:180px;overflow:auto}
.gam-technique-results>button{display:flex;justify-content:space-between;gap:4px;text-align:left;min-width:0;height:auto;padding:4px 8px}
.gam-technique-results small{white-space:nowrap}
.gam-technique-results>button[hidden],.gam-technique-picker>[hidden]{display:none}
.gam-technique-picker p,.gam-carving-progress{margin:0}
.gam-melee-technique-row{display:flex;align-items:start;gap:5px}
.gam-melee-technique-row>span{flex:1;min-width:0}
.gam-melee-technique-row>button{flex:0 0 25px;width:25px;min-height:24px;padding:0}
.gam-melee-technique-context{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:5px}
.gam-melee-technique-context>.gam-technique-field{display:flex;flex-direction:column;gap:2px;min-width:0}
.gam-technique-field>span{flex:1}
.gam-technique-field select,.gam-technique-field input{width:100%;min-width:0;height:32px;flex:0 0 32px;box-sizing:border-box;margin:0}
.gam-melee-technique-context>.gam-technique-check{display:flex;align-items:center;gap:4px}
[data-melee-technique-errors]{color:var(--color-level-error)}
[data-melee-technique-errors]:empty{display:none}
`;
