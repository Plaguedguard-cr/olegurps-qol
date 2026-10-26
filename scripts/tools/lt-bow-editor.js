import {ltBowProfile} from '../lt-bow-source.js';
import {resolveLTBowBase,LT_HEAD_VARIANTS,ltBowRecipeAssessment} from './lt-bow.js';
import {ltQualityHTML} from './lt-quality.js';

export function ltBowEditorHTML(configuration,modeId,actor,esc){
 const p=ltBowProfile(modeId);if(!p)return '';
 const c=configuration??{},option=(value,label)=>p.kind==='repeating'&&value!=='hand'?'':`<option value="${value}" ${c.drawMethod===value||!c.drawMethod&&value===(p.kind==='steel'?'cranequin':p.kind==='belly'?'belly':'hand')?'selected':''}>${p.kind==='repeating'?'Одноручный рычаг':label}</option>`;
 return `<fieldset class="gam-lt-bow-settings"><legend>Rated ST экземпляра — LT74–78</legend>
  <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
  <label>Rated ST <input type="number" data-lt-bow-field="ratedST" name="ltBow-ratedST" step="1" min="${p.minRatedST}" value="${esc(c.ratedST??'')}" placeholder="Не задана" style="width:6em"></label>
  <small>Минимум ${p.minRatedST} (LT75–76); верхний конструкционный предел не опубликован.</small></div>
  ${p.modeId==='WFAwJH7XlIK-bIy0Q'?`<label>Снаряжение Slurbow<select data-lt-bow-field="shotMode" name="ltBow-shotMode"><option value="ordinary" ${c.shotMode!=='single-small'?'selected':''}>Пять малых дротиков</option><option value="single-small" ${c.shotMode==='single-small'?'selected':''}>Один малый дротик — LT74</option></select></label>`:''}
  ${p.kind==='bow'?`<label>Режим <select data-lt-bow-field="shotMode" name="ltBow-shotMode">${[['ordinary','Обычная стрела'],['navak','Navak — короткий дротик'],['panjagan5','Panjagan — пять стрел'],['panjagan10','Panjagan — десять стрел (кинематографично)']].map(([v,t])=>`<option value="${v}" ${(c.shotMode??'ordinary')===v?'selected':''}>${t}</option>`).join('')}</select></label>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-lt-bow-field="arrowGuideInstalled" name="ltBow-arrowGuideInstalled" ${c.arrowGuideInstalled?'checked':''}> Установлена физическая направляющая Navak ($50; 0,5 lb)</label>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-lt-bow-field="panjaganInstalled" name="ltBow-panjaganInstalled" ${c.panjaganInstalled?'checked':''}> Имеется крепёж Panjagan ($10; вес пренебрежим)</label>`:''}
  <label>Натяжение / взвод <select data-lt-bow-field="drawMethod" name="ltBow-drawMethod">${option('hand','Руками')}${option('one-leg','С упором одной ногой')}${option('two-legs','С упором двумя ногами')}${p.kind==='bow'?'':option('goats-foot','Козья нога')}${p.cranequin?option('cranequin','Штатный кранекин ×'+p.cranequin):''}${p.kind==='belly'?option('belly','Брюшной упор Gastraphetes'):''}</select></label>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-lt-bow-field="applyArmST" name="ltBow-applyArmST" ${c.applyArmST?'checked':''}> При ручном натяжении применять Arm ST</label>
  <details><summary>Качество оружия — LT59</summary>${ltQualityHTML(c.quality,'lt-bow-quality',esc,{missile:true})}</details>
  <p data-lt-bow-summary role="status">${esc(ltBowEditorSummary(c,modeId,actor))}</p></fieldset>`;
}
export function ltBowEditorSummary(configuration,modeId,actor){
 const p=ltBowProfile(modeId),b=resolveLTBowBase({modeId,configuration,actor});if(!p)return '';
 if(!b.ready)return b.reason;
 return 'Rated ST '+b.ratedST+(p.kind==='steel'?' → Damage ST '+b.effectiveDamageST+'; Range ST '+b.rangeST:'')+
  ' · Исходные Damage '+b.dice+' '+b.type+' · Range '+b.range.join('/')+' ярд. · ST натяжения '+(b.drawing?.strength??'не определена')+'. '+
  b.drawing.ready+' '+b.drawing.note;
}
export function bindLTBowEditor(root,{getModeId,getConfiguration,setField,onChange}){
 const update=()=>{const line=root.querySelector('[data-lt-bow-summary]');if(line)line.textContent=ltBowEditorSummary(getConfiguration(),getModeId(),root._ltBowActor);};
 root.addEventListener('input',event=>{const quality=event.target.closest?.('[data-lt-quality]');if(quality&&quality.name.startsWith('lt-bow-quality-')){setField('quality',{...getConfiguration().quality,[quality.dataset.ltQuality]:quality.type==='checkbox'?quality.checked:quality.value});update();onChange?.();return;}
  const field=event.target.closest?.('[data-lt-bow-field]');if(!field)return;
  setField(field.dataset.ltBowField,field.type==='checkbox'?field.checked:field.value);update();onChange?.();});
 return update;
}
export function ltProjectileRecipeHTML(modeId,type,draft,api,esc){
 if(type?.book!=='lt'||type.kind!=='ammo-item'||!ltBowProfile(modeId))return '';
 const ids=LT_HEAD_VARIANTS.filter(variantId=>ltBowRecipeAssessment({modeId,type:{...type,recipe:{version:1,variantId}},compatibility:api?.ammunitionCompatibility})?.applicationAllowed);
 if(!ids.length)return '';
 const c=draft??{variantId:type.recipe?.variantId??ids[0],...type.recipe?.parameters};
 const labels={regular:'Обычный',bodkin:'Bodkin',barbed:'Зазубренный',blunt:'Тупой',cutting:'Режущий',bowel_raker:'Bowel-raker',fire_arrow:'Fire Arrow',fire_cage:'Fire-Cage',flight:'Flight',humming_bulb:'Humming Bulb',flaming:'Горящая стрела',flaming_humming:'Горящий Humming Bulb',crossbow_regular:'Обычный болт',crossbow_bodkin:'Bodkin Bolt'};
 return `<details data-lt-projectile-editor><summary>Отдельная партия снарядов LT</summary><label>Наконечник<select name="lt-projectile-variant">${ids.map(id=>`<option value="${id}" ${id===c.variantId?'selected':''}>${esc(labels[id])}</option>`).join('')}</select></label>`+
  ltQualityHTML(c.quality,'lt-projectile-quality',esc)+['note','savingThrow','description'].map((k,i)=>`<label>${['Note','Спасбросок','Краткое описание'][i]}<textarea name="lt-projectile-${k}" rows="2">${esc(c[k]??'')}</textarea></label>`).join('')+
  '<button type="button" data-inventory-action="save-lt-projectile">Сохранить отдельную партию</button></details>';
}
