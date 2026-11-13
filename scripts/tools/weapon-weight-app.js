import {weaponWeightPresentation,formatWeaponWeight,setManualWeaponMass} from './weapon-weight.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const explanation=a=>/[А-Яа-яЁё]/u.test(a.reason??'')?a.reason:a.automaticUnitLb===null?'Масса компонента не подтверждена.':a.source?.massIncomplete?'Подтверждена только часть массы компонента.':'';
export function weaponWeightControls(actor,id,{actionAttribute='data-ammo-action',weaponId=null}={}){
 const g=weaponWeightPresentation(actor,id),attr=weaponId?`data-weapon-id="${esc(weaponId)}"`:`data-visibility-id="${esc(id)}"`;
 const title=(g.backpack?'Учитывать в нагрузке':'Исключено из нагрузки')+(g.complete?'':' · Есть неподтверждённые компоненты')+(g.atoms.some(a=>a.provenance==='USER_DEFINED')?' · Есть ручная масса':'');
 return `<span class="gam-weapon-weight"><button type="button" class="gam-melee-icon-button gam-weight-backpack ${g.backpack?'active':''}" ${actionAttribute}="weight-backpack" ${attr} aria-pressed="${g.backpack}" aria-label="Учитывать вес" title="${esc(title)}" ${id?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2a3 3 0 0 0-3 3v1a5 5 0 0 0-2 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a5 5 0 0 0-2-4V5a3 3 0 0 0-3-3H9zm0 2h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zm-2 9h10v6H7v-6zm2 2v2h6v-2H9z"/></svg></button><button type="button" class="gam-weight-value" ${actionAttribute}="weight-edit" ${attr} title="Указать массу компонентов" ${id?'':'disabled'}>${esc(formatWeaponWeight(g))}</button></span>`;
}
export class WeaponWeightApp extends foundry.applications.api.ApplicationV2{
 static DEFAULT_OPTIONS={classes:['olegurps-qol','gam-weight-editor'],window:{title:'Вес оружия и боезапаса',resizable:true},position:{width:660,height:'auto'}};
 constructor(actor,id,options={}){super(options);this.actor=actor;this.identity=id;}
 async _renderHTML(){
  const g=weaponWeightPresentation(this.actor,this.identity),rows=[...new Map(g.atoms.map(a=>[a.key,a])).values()];
  this.initial=new Map(rows.map(a=>[a.key,structuredClone(a.manual)]));
  return `<div class="standard-form"><h3>${esc(g.name)}</h3><p>Масса одной физической единицы в lb. Ручные значения сохраняются отдельно для этого экземпляра.</p>${rows.map((a,i)=>`<div class="gam-weight-component" data-weight-key="${esc(a.key)}"><label for="weight-mode-${this.id}-${i}">${esc(a.label)}</label><small>${a.automaticUnitLb===null?'Источник: масса не подтверждена':`Источник: ${esc(a.automaticUnitLb)} lb`}${a.source?.book?' · '+esc(a.source.book)+' '+esc(a.source.pages?.join(', ')):''}</small><div class="form-fields"><select id="weight-mode-${this.id}-${i}" data-weight-mode>${[['auto','По источнику'],['replace','Заменить массу компонента'],['add','Добавить недостающую массу']].map(([v,t])=>`<option value="${v}" ${a.manual.mode===v?'selected':''}>${t}</option>`).join('')}</select><input type="number" min="0" step="any" data-weight-value value="${esc(a.manual.value)}" aria-label="Ручная масса одной единицы, lb"></div><small>${esc(explanation(a))}</small></div>`).join('')}<footer class="form-footer"><button type="button" data-weight-save>Сохранить</button></footer></div>`;
 }
 _replaceHTML(result,content){content.innerHTML=result;}
 _onRender(context,options){super._onRender(context,options);this.element.querySelector('[data-weight-save]')?.addEventListener('click',async event=>{
  event.currentTarget.disabled=true;
  try{const changes=[...this.element.querySelectorAll('[data-weight-key]')].map(row=>({key:row.dataset.weightKey,mode:row.querySelector('[data-weight-mode]').value,value:Number(row.querySelector('[data-weight-value]').value)}));
   if(changes.some(c=>!Number.isFinite(c.value)||c.value<0))throw Error('Укажите неотрицательную массу в lb.');
   for(const c of changes){const expected=this.initial.get(c.key);if(c.mode===expected.mode&&c.value===expected.value)continue;await setManualWeaponMass(this.actor,this.identity,c.key,{...c,expected});}await this.close();
  }catch(error){ui.notifications.error(error.message);event.currentTarget.disabled=false;}
 });}
}
export function openWeaponWeightEditor(actor,id){return new WeaponWeightApp(actor,id).render({force:true});}
