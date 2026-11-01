import {utOrdinaryAllowed} from '../ut-ordinary-melee-source.js';
import {UT_NEURAL_SETTINGS,normalizeUTExoticSelection} from '../ut-exotic-melee-source.js';
import {utMeleeResourceContext} from './ut-melee-resources.js';
import {shieldModeAllowed,shieldFittingOptions} from '../lt-shield-tool-source.js';
import { meleeProfileContext, resolveMeleeProfile, resolveMeleeHands, meleeMartialGrips, meleeQualityOptions,meleeMaterialOptions,meleeNanothornAllowed } from './melee-profile-service.js';
import {LT_MATERIALS,ltMaterialChoices,ltMaterialEffect,meleeWeaponTL,ltSuperfineAllowed} from '../lt-melee-quality-data.js';
import { WeaponCatalogBindingService } from '../weapon-catalog-binding-service.js';
import { readActorStrength } from './strength-service.js';

export function editorMeleeContext(actor,attack) {
  const context=meleeProfileContext(actor,attack);
  if(context||attack?.standaloneRef)return context;
  const catalogs=globalThis.OleGURPSQOL?.catalogs;
  if(!catalogs||!attack?.path)return null;
  try {
    const result=new WeaponCatalogBindingService(catalogs).analyzeMode(actor,attack.path);
    const id=result.binding?.modeId??result.automatic?.suggestion?.modeId;
    return id?meleeProfileContext(actor,attack,{sourceModeId:id}):null;
  }catch{return null;}
}
export const meleeMotionLabel=damage=>/^sw/i.test(damage)?'Амплитудный (Swing)':/^thr/i.test(damage)?'Прямой (Thrust)':'Фиксированный (Fixed)';

const physicalProfiles=(context,selection=context.saved)=>context.profiles.filter(p=>p.equipmentId===context.source.equipmentId&&utOrdinaryAllowed(p,selection)&&shieldModeAllowed(p,selection));
export const meleeEditorProfiles=physicalProfiles;
export function meleeMaterialSelectOptions(profile,ids,selection={},imported=false){
  const label=id=>LT_MATERIALS[id]?.label??id,baseline=profile.baselineMaterial;
  const original=[selection.material===baseline?baseline:'',label(baseline)];
  return imported?[['','Материал импорта: без изменений'],...ids.map(id=>[id,label(id)])]:[original,...ids.filter(id=>id!==baseline).map(id=>[id,label(id)])];
}
const profileMotion=profile=>profile.motion??(/^sw/i.test(profile.stats.damage)?'swing':/^thr/i.test(profile.stats.damage)?'thrust':'fixed');
const gripLabel=(hands,grip,profile=null)=>grip==='published'?(profile?.publishedGripLabel||(hands===2?'Двуручный':hands===1?'Одноручный':'Штатный')):
  grip==='one-handed'?'Одноручный (B270)':grip==='defensive'?'Defensive Grip':grip==='reversed'?'Reversed Grip':'Tip Grip (Thrust)';
function tipMode(context,profile){
  if(profileMotion(profile)==='thrust')return profile;
  return physicalProfiles(context).filter(p=>profileMotion(p)==='thrust'&&p.damagePart===profile.damagePart)
    .sort((a,b)=>Number(b.stats.st===profile.stats.st)-Number(a.stats.st===profile.stats.st)||
      Number(b.primarySkills.join('/')===profile.primarySkills.join('/'))-Number(a.primarySkills.join('/')===profile.primarySkills.join('/')))[0];
}
function profileST(context,profile,attack){
  return profile.modeId===context.source.modeId?attack?.st??profile.stats.st:
    context.record?.modes.find(m=>m.modeId===profile.modeId)?.overrides?.st??profile.stats.st;
}
function profileGrips(profile,actor,context,attack){
  const strength=readActorStrength(actor).kinds.st.effective;
  const st=profileST(context,profile,attack);
  return ['published',...(resolveMeleeHands(st).symbol&&
    !resolveMeleeHands(st,'one-handed',strength,profile.hands,profile.requiresTwoHands).reason?['one-handed']:[]),...meleeMartialGrips(profile)];
}

/** Editor-only compatibility matrix. Published physical modes and existing combat effects stay authoritative. */
export function meleeEditorCompatibility(context,selection={},actor,attack){
  if(!context)return [];
  const rows=[];
  for(const profile of physicalProfiles(context,selection))for(const grip of profileGrips(profile,actor,context,attack)){
    const target=grip==='tip'?tipMode(context,profile):profile;
    if(!target)continue;
    const skill=target.primarySkills.includes(selection.skill)?selection.skill:'';
    const resolved=resolveMeleeProfile({actor,attack,context,selection:{...selection,modeId:target.modeId,grip,skill}}).meleeProfile;
    const hands=resolved?.strength?.hands??(grip==='defensive'||grip==='tip'?2:resolveMeleeHands(profileST(context,target,attack),grip,readActorStrength(actor).kinds.st.effective,target.hands,target.requiresTwoHands).hands);
    rows.push({equipmentId:target.equipmentId,sourceModeId:profile.modeId,modeId:target.modeId,
      grip,hands,motion:grip==='tip'?'thrust':profileMotion(target),label:gripLabel(hands,grip,target),profile:target});
  }
  return rows;
}

export function selectMeleeEditorProfile(context,selection,key,value,actor,attack){
  if(!context)return selection;
  const next={...selection,[key]:value},profiles=physicalProfiles(context,{...selection,[key]:value});
  if(key==='waterConnected')next.waterConnected=value==='yes';
  let profile=profiles.find(p=>p.modeId===(next.modeId||context.source.modeId));
  if(!profile&&key==='blade'&&context.source.utOrdinary){profile=profiles[0];next.modeId=profile?.modeId;}
  if(!profile)throw Error('Режим не принадлежит текущему экземпляру оружия.');
  if(key==='grip'){
    if(!profileGrips(profile,actor,context,attack).includes(value))throw Error('Этот хват не подтверждён для выбранного режима и ST.');
    if(value==='tip'){
      profile=tipMode(context,profile);if(!profile)throw Error('Для Tip Grip нужен подтверждённый Thrust этого оружия.');
      next.modeId=profile.modeId;
    }
  }
  if(key==='modeId'&&(!profileGrips(profile,actor,context,attack).includes(next.grip||'published')||next.grip==='tip'&&profileMotion(profile)!=='thrust'))next.grip='published';
  if((key==='modeId'||key==='grip')&&next.skill&&!profile.primarySkills.includes(next.skill))next.skill='';
  return next;
}

export function meleeProfileEditorHTML(context,selection,esc,actor,attack) {
  if(!context)return '';
  const current=context.profiles.find(p=>p.modeId===(selection.modeId||context.source.modeId))??context.source;
  selection=normalizeUTExoticSelection(current,selection);
  const projected=resolveMeleeProfile({actor,attack,selection,context});
  const options=(rows,value)=>rows.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
  const matrix=meleeEditorCompatibility(context,selection,actor,attack);
  const attempt=(fn,fallback)=>{try{return fn();}catch{return fallback;}};
  const quality=attempt(()=>meleeQualityOptions(actor,current,context.saved,selection),[]);
  if(selection.quality&&!quality.some(o=>o.level===selection.quality))quality.push({level:selection.quality,unavailable:true});
  const baselineGrades=current.ltConstruction?meleeQualityOptions(actor,current,context.saved,
    {...selection,weaponTL:null,material:selection.baselineMaterial||current.baselineMaterial}):quality;
  const materialIds=attempt(()=>meleeMaterialOptions(actor,current,context.saved,selection),[]),lt=current.ltConstruction;
  const materialLabel=id=>LT_MATERIALS[id]?.label??id;
  const currentMaterial=selection.material||selection.baselineMaterial||current.baselineMaterial;
  const materialKnown=!context.imported||!!selection.baselineMaterial||!!selection.material||current.modeId!==context.source.modeId;
  const metal=lt&&!current.utOrdinary&&materialKnown&&ltMaterialChoices(current).includes(currentMaterial)&&ltMaterialEffect(current,currentMaterial).metal;
  const superfineAvailable=lt&&attempt(()=>meleeWeaponTL(selection)>=9&&ltSuperfineAllowed(current,currentMaterial),false);
  const highTL=lt&&attempt(()=>meleeWeaponTL(selection)>=7,false);
  const bladeOptions=current.utOrdinary?[['','Штатная конфигурация'],...(meleeNanothornAllowed(actor,current,context.saved)?[['nanothorn','Nanothorn (ТУ11+)']]:[]),...(current.morph?[['superfine','Superfine Blade (ТУ9+)']]:[]),...(current.variableCapable?[['variable-force-sword','Variable Force Sword (+$500)']]:[])]:current.shield?[...shieldFittingOptions]:[['',context.imported?'Кромка импорта: без изменений':'Исходная'],['standard','Обычная']];
  if(!current.utOrdinary&&!current.shield&&(superfineAvailable||selection.blade==='superfine'||!selection.blade&&selection.baselineBlade==='superfine'))
    bladeOptions.push(['superfine',superfineAvailable?'Superfine Blade (ТУ9+)':'Superfine Blade – недоступно при этом ТУ/материале']);
  const hint=(label,content)=>`<span tabindex="0" data-tooltip="${esc(content)}" aria-label="${esc(content)}">${label} (?)</span>`;
  const price=projected.meleeProfile?.quality;
  const modeBase=p=>{
    const compatible=matrix.find(r=>r.sourceModeId===p.modeId&&r.modeId===p.modeId&&r.grip===(selection.grip||'published'))??matrix.find(r=>r.sourceModeId===p.modeId&&r.grip==='published');
    const motion=p.shield||p.displayUsage?p.usage:p.damagePart==='hilt'?'Гарда (Thrust)':profileMotion(p)==='swing'?'Swing':profileMotion(p)==='thrust'?'Thrust':'Fixed';
    return motion+(p.point==='blunt'?' – тупой конец':'')+' · '+(compatible?.hands===2?'2 руки':compatible?.hands===1?'1 рука':'штатный хват');
  };
  const profiles=physicalProfiles(context,selection);
  const resource=current.utExotic?utMeleeResourceContext(actor,attack,current.modeId):null;
  const modes=profiles.map(p=>[p.modeId,modeBase(p)+(profiles.filter(q=>modeBase(q)===modeBase(p)).length>1?' · '+p.primarySkills.join('/'):'')]);
  const hands=projected.meleeProfile?.strength;
  const grips=matrix.filter(r=>r.sourceModeId===current.modeId).map(r=>[r.grip,r.label]);
  if(selection.grip&&!grips.some(([g])=>g===selection.grip))grips.push([selection.grip,'Выбранный хват – неприменим к этому режиму']);
  const manualHints=projected.meleeProfile?.manualHints??[];
  const importedSummary=[selection.baselineQuality,selection.baselineMaterial?materialLabel(selection.baselineMaterial):'',
    selection.baselineBalance&&selection.baselineBalance!=='Normal'?selection.baselineBalance:''].filter(Boolean).join(', ');
  const active=[...(selection.blade==='superfine'||!selection.blade&&selection.baselineBlade==='superfine'?['Superfine Blade']:[]),
    ...(selection.coating==='silver'?['Серебряное покрытие']:[]),...(context.imported?[importedSummary?'Импорт: '+importedSummary:'Свойства импорта']:[])];
  return `<fieldset class="gam-melee-profile"><legend>Боевой профиль</legend>
    <div class="gam-melee-profile-group"><h4>Основное</h4>
    ${resource?`<div class="gam-attack-editor-row"><span>${esc(resource.p.power?resource.profile.cellSize+' cell':'Ресурс')}: ${esc(resource.remaining??0)}/${esc(resource.value?.capacity??resource.profile.capacity)} ${esc(resource.profile.unit)}</span><button type="button" data-ut-melee-resource="replace">${resource.p.power?'Заменить батарею':'Установить ресурс'}</button></div>`:''}
    ${resource?'<button type="button" data-ut-melee-resource="spend">Списать ресурс вручную</button>':''}
    ${resource?.saved?.pending?'<button type="button" data-ut-melee-resource="settle">Проверить незавершённый резерв</button>':''}
    ${current.payload?`<div class="gam-attack-editor-row"><span>Доза: ${esc(resource?.saved?.payload||'не установлена')}</span><button type="button" data-ut-melee-resource="payload">Установить внешнюю дозу</button></div>`:''}
    ${current.contactProcedure?'<label class="gam-ut-contact-confirm"><span>Подтверждены фактический контакт и условия источника</span><input type="checkbox" data-ut-contact-confirm></label><button type="button" data-ut-melee-resource="contact">Применить контакт</button>':''}
    ${current.neural?`<label class="gam-attack-editor-row"><span>Установленная версия Neural</span><select data-melee-profile="neuralSetting">${options([['','Выберите версию'],...Object.entries(UT_NEURAL_SETTINGS)],selection.neuralSetting||'')}</select></label><label class="gam-attack-editor-row"><span>Настройки Tunable (ТУ11+)</span><select multiple data-melee-profile="neuralSettings">${Object.entries(UT_NEURAL_SETTINGS).map(([v,l])=>'<option value="'+v+'" '+(selection.neuralSettings?.includes(v)?'selected':'')+'>'+l+'</option>').join('')}</select></label><p class="hint">Без списка Tunable установлена только выбранная версия. Смена – Ready; дополнительные настройки +50% базовой цены каждая. UT165.</p>`:''}
    ${current.water?`<label class="gam-attack-editor-row"><span>Подключён реальный запас воды</span><select data-melee-profile="waterConnected">${options([['','Нет'],['yes','Да']],selection.waterConnected?'yes':'')}</select></label>`:''}
    ${lt?`<label class="gam-attack-editor-row"><span>${hint('ТУ оружия','ТУ изготовления этого экземпляра. Не зависит от ТУ кампании или Actor. Если не задан, опубликованный профиль сохраняется. С ТУ7 стандарт Fine: Good ×0.4, Cheap ×0.2; Very Fine – по типу и конструкции. B274; HT196–198; MA216.')}</span><input type="number" min="0" step="1" data-melee-profile="weaponTL" value="${esc(selection.weaponTL??'')}" placeholder="Не задан"></label>`:''}
    <label class="gam-attack-editor-row"><span>Качество</span><select data-melee-profile="quality" ${quality.length?'':'disabled'}>${options([['',context.imported?'Качество импорта: без изменений':'Исходное качество'],...quality.map(o=>[o.level,o.level+(o.unavailable?' – недоступно при этом ТУ/материале':Number.isInteger(o.tl)?' (TL'+o.tl+(o.superscience?'^':'')+')':'')])],selection.quality||'')}</select></label>
    ${current.balanceOptions?.length?`<label class="gam-attack-editor-row"><span>Балансировка</span><select data-melee-profile="balance">${options([['','Исходная'],...current.balanceOptions.map(o=>[o.level,o.label??o.level])],selection.balance||'')}</select></label>`:''}
    ${lt?`<label class="gam-attack-editor-row gam-melee-material-row"><span>Материал</span><select data-melee-profile="material">${options(meleeMaterialSelectOptions(current,materialIds,selection,context.imported),selection.material||'')}</select></label>
      `:''}
    </div>
    <div class="gam-melee-profile-group"><h4>Боевые свойства</h4>
      <label class="gam-attack-editor-row"><span>Тип удара</span>${modes.length>1?`<select data-melee-profile="modeId">${options(modes,current.modeId)}</select>`:`<span>${esc(modes[0]?.[1]??current.usage)}</span>`}</label>
      <label class="gam-attack-editor-row"><span>Хват</span>${grips.length>1?`<select data-melee-profile="grip">${options(grips,selection.grip||'published')}</select>`:`<span>${esc(grips[0]?.[1]??'Штатный')}</span>`}</label>
    </div>
    <details class="gam-melee-additional"><summary>Дополнительно${active.length?' – '+esc(active.join(', ')):''}</summary><div class="gam-melee-profile-group">
    ${lt?`<label class="gam-attack-editor-row"><span>${hint(current.variableCapable?'Конфигурация':'Кромка',current.utOrdinary?current.hints.join(' '):current.shield?'Выберите только фактически установленный ударный элемент. Обычный щит не получает шип или кромку автоматически. LT68; LT114; B287.':'Superfine Blade: ТУ9+, цена ×6 нормальной. Итоговые +2 cut/imp и AD(2), без дополнительного +1 от Fine: консервативное решение модуля, UT163 не разъясняет сложение. Выбирается вручную.')}</span><select data-melee-profile="blade">${options(bladeOptions,selection.blade||'')}</select></label>
      ${metal&&currentMaterial!=='silver'?`<label class="gam-attack-editor-row"><span>Серебряное покрытие</span><select data-melee-profile="coating">${options([['','Без покрытия'],['silver',highTL?'Серебрение (+200%; MA216)':'Серебрение (+2 CF)']],selection.coating||'')}</select></label>`:''}`:''}
    ${context.imported&&baselineGrades.length?`<label class="gam-attack-editor-row"><span>Уже включённое качество</span><select data-melee-profile="baselineQuality">${options([['','Не определено'],...baselineGrades.map(o=>[o.level,o.level])],selection.baselineQuality||'')}</select></label>`:''}
    ${context.imported&&lt?`<details class="gam-melee-import-baseline"><summary>Уже включённые свойства импорта</summary>
      <label class="gam-attack-editor-row gam-melee-material-row"><span>Исходный материал</span><select data-melee-profile="baselineMaterial">${options([['','Не определено'],...ltMaterialChoices(current).map(id=>[id,materialLabel(id)])],selection.baselineMaterial||'')}</select></label>
      <label class="gam-attack-editor-row"><span>Исходная кромка</span><select data-melee-profile="baselineBlade">${options([['','Не определено'],['standard','Обычная'],['superfine','Superfine Blade']],selection.baselineBlade||'')}</select></label>
      <label class="gam-attack-editor-row"><span>Исходная балансировка</span><select data-melee-profile="baselineBalance">${options([['','Не определено'],...current.balanceOptions.map(o=>[o.level,o.label??o.level])],selection.baselineBalance||'')}</select></label></details>`:''}
    </div></details>
    <p class="hint">${esc(current.sourcePages.join(', '))} · ST ${esc(current.stats.st??'–')}${hands?.maximumST?' · максимум ST урона '+hands.maximumST:''} · ${manualHints.length?hint('Reach '+esc(projected.reach)+' · Parry '+esc(projected.parry),manualHints.slice(0,2).join(' ')):'Reach '+esc(projected.reach)+' · Parry '+esc(projected.parry)}</p>
    <p class="hint">${manualHints.length?hint('Хват / Ready',[hands?.ready,...(projected.meleeProfile?.gripEffects?.conditions??[]),...manualHints.slice(2)].filter(Boolean).join(' ')):esc(hands?.ready??'')} ${price?.price!=null?`<span data-melee-price>${lt?hint('Цена: $'+esc(price.price),current.utOrdinary||current.shield||current.book==='HT'?(price.hints??[]).join(' '):price.cost.regime==='high-tl-percentages'?'База $'+price.cost.publishedBase+'; база материала $'+price.cost.materialBase+'; кромка ×'+price.cost.bladeMultiplier+'; сумма процентов '+(price.cost.sumAdjustment*100)+'%. Качество, баланс и серебро после остальных модификаций; минимум ×0.2. B274; B275; MA216; UT163.':'База $'+price.cost.publishedBase+'; база материала $'+price.cost.materialBase+'; сумма CF '+price.cost.sumCF+'. Минимальный множитель 0.2. LT14; LT59; LT71.'): 'Цена: $'+esc(price.price)}</span>`:lt?'<span data-melee-price>Цена не определена</span>':''}
      ${lt&&price?.mass!=null?' · Масса: '+esc(price.mass)+' lb':''}</p>
    ${lt?`<p class="hint" data-melee-material-hint>${hint('Ограничения материала',price?.hints?.join(' ')||'Износ, поломка, Ready и ситуационные условия применяются вручную. Reach и Parry не блокируют Attack. LT59; LT71; B275.')}</p>`:''}
    ${manualHints.length?'':(projected.meleeProfile?.gripEffects?.conditions??[]).map(c=>`<p class="hint">${esc(c)}</p>`).join('')}
    ${projected.readinessReason?`<p role="alert">${esc(projected.readinessReason)}</p>`:''}
  </fieldset>`;
}
