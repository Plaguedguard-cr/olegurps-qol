import { StrengthService, STRENGTH_KINDS, readStrengthAdjustments, readActorStrength,
  sameStrengthActor, isStrengthUpdate } from './strength-service.js';
import { installViewportBounds, releaseViewportBounds } from './application-viewport.js';

const openEditors=new Map();
const key=actor=>actor.uuid??actor.id;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shown=value=>value===null?'Не определено':String(value);

export class StrengthEditorApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={classes:['olegurps-qol','strength-editor'],tag:'section',
    window:{title:'Временные поправки ST',resizable:true},position:{width:660,height:'auto'}};
  constructor({actor},options={}){
    super({...options,id:options.id??'olegurps-strength-'+key(actor),window:{title:'ST — '+actor.name,resizable:true}});
    this.actor=actor;this.service=new StrengthService(actor);this.saved=readStrengthAdjustments(actor);
    this.modifiers={...this.saved.modifiers};this.dirty=false;this.busy=false;this.actorHook=null;
    this.boundInput=this.onInput.bind(this);this.boundClick=this.onClick.bind(this);
  }
  async _prepareContext(){return {};}
  async _renderHTML(){
    const state=readActorStrength(this.actor,{...this.saved,modifiers:this.modifiers});
    return `<style>.strength-editor .gam-st-body{display:flex;flex-direction:column;min-height:0;gap:.6rem;overflow:auto}
      .strength-editor table{width:100%;margin:0}.strength-editor input{width:6rem;max-width:100%}
      .strength-editor footer{display:flex;flex-wrap:wrap;gap:.5rem;flex:0 0 auto}
      .strength-editor footer button{flex:1}.strength-editor .window-content{gap:.7rem;min-height:0}
      .strength-editor [data-st-error]{color:var(--color-level-error,#e57070)}</style>
      <div class="gam-st-body"><p>Исходная ST.import: <strong data-st-import>${esc(shown(state.kinds.st.imported))}</strong> · Сейчас ST.value GGA: <strong data-st-current>${esc(shown(state.kinds.st.current))}</strong></p>
      <table><thead><tr><th>Показатель</th><th>Считано</th><th>Временная поправка</th><th>ST с этой разновидностью</th></tr></thead><tbody>
      ${STRENGTH_KINDS.map(kind=>{const row=state.kinds[kind];return `<tr><th><label for="${esc(this.id+'-'+kind)}">${esc(row.label)}</label></th>
        <td data-st-source="${kind}">${esc(shown(kind==='st'?row.baseCurrent:row.current))}</td>
        <td><input id="${esc(this.id+'-'+kind)}" name="${kind}" data-st-adjustment="${kind}" type="number" step="1" value="${esc(this.modifiers[kind])}" ${!state.kinds.st.supported?'disabled':''} aria-label="Временная поправка ${esc(row.label)}"></td>
        <td><strong data-st-effective="${kind}">${esc(shown(row.effective))}</strong></td></tr>`;}).join('')}</tbody></table>
      <p class="hint">Striking/Lifting/Arm ST — уровни преимуществ; при отсутствии значение 0. Lifting ST не усиливает обычный удар. Arm ST применяется только по явному выбору для атаки.</p>
      <p>ST обычного удара: <strong data-st-strike-total>${esc(shown(state.kinds.striking.effective))}</strong> · С Arm ST: <strong data-st-arm-total>${esc(shown(state.kinds.striking.effective===null?null:state.kinds.striking.effective+state.kinds.arm.current+state.modifiers.arm))}</strong></p>
      <p class="hint">Сброс очищает поправки в этом окне. Нажмите «Сохранить», чтобы применить их.</p>
      <p data-st-error role="status"></p></div>
      <footer><button type="button" data-st-action="save">Сохранить</button><button type="button" data-st-action="reset">Сбросить поправки</button><button type="button" data-st-action="cancel">Отмена</button></footer>`;
  }
  _replaceHTML(result,content){content.innerHTML=result;}
  _onRender(context,options){
    super._onRender(context,options);installViewportBounds(this);
    this.element.removeEventListener('input',this.boundInput);this.element.addEventListener('input',this.boundInput);
    this.element.removeEventListener('click',this.boundClick);this.element.addEventListener('click',this.boundClick);
    if(this.actorHook===null)this.actorHook=Hooks.on('updateActor',(actor,change)=>{
      if(!sameStrengthActor(actor,this.actor))return;
      const fresh=readStrengthAdjustments(this.actor);
      if(isStrengthUpdate(change)&&fresh.revision!==this.saved.revision){
        if(this.dirty&&!this.busy)this.error('Поправки изменены в другом окне. Закройте редактор и откройте его заново.');
        else {this.saved=fresh;this.modifiers={...fresh.modifiers};this.syncInputs();}
      }
      this.updatePreview();
    });
  }
  error(message){const p=this.element?.querySelector('[data-st-error]');if(p)p.textContent=message;}
  syncInputs(){for(const input of this.element?.querySelectorAll('[data-st-adjustment]')??[])input.value=String(this.modifiers[input.dataset.stAdjustment]);}
  onInput(event){const input=event.target.closest?.('[data-st-adjustment]');if(!input)return;
    const value=input.value.trim()===''?0:Number(input.value);input.setCustomValidity(Number.isSafeInteger(value)?'':'Нужно целое число со знаком.');
    if(!Number.isSafeInteger(value))return;this.modifiers[input.dataset.stAdjustment]=value;this.dirty=true;this.updatePreview();
  }
  updatePreview(){const state=readActorStrength(this.actor,{...this.saved,modifiers:this.modifiers});
    for(const kind of STRENGTH_KINDS){const row=state.kinds[kind],source=this.element?.querySelector(`[data-st-source="${kind}"]`),effective=this.element?.querySelector(`[data-st-effective="${kind}"]`);
      if(source)source.textContent=shown(kind==='st'?row.baseCurrent:row.current);if(effective)effective.textContent=shown(row.effective);}
    const imported=this.element?.querySelector('[data-st-import]'),current=this.element?.querySelector('[data-st-current]');
    if(imported)imported.textContent=shown(state.kinds.st.imported);if(current)current.textContent=shown(state.kinds.st.current);
    const strike=this.element?.querySelector('[data-st-strike-total]'),arm=this.element?.querySelector('[data-st-arm-total]');
    if(strike)strike.textContent=shown(state.kinds.striking.effective);
    if(arm)arm.textContent=shown(state.kinds.striking.effective===null?null:state.kinds.striking.effective+state.kinds.arm.current+state.modifiers.arm);
  }
  async onClick(event){const button=event.target.closest?.('[data-st-action]');if(!button||this.busy)return;
    const action=button.dataset.stAction;if(action==='cancel')return this.close();
    if(action==='reset'){this.modifiers=Object.fromEntries(STRENGTH_KINDS.map(k=>[k,0]));this.dirty=true;this.syncInputs();this.error('');this.updatePreview();return;}
    if(action!=='save')return;
    for(const input of this.element.querySelectorAll('[data-st-adjustment]'))if(!input.reportValidity())return;
    this.busy=true;button.disabled=true;
    try{await this.service.save(this.modifiers,{expectedRevision:this.saved.revision});await this.close();}
    catch(error){this.error(error.message);}finally{this.busy=false;if(button.isConnected)button.disabled=false;}
  }
  async close(options){if(this.actorHook!==null){Hooks.off('updateActor',this.actorHook);this.actorHook=null;}
    this.element?.removeEventListener('input',this.boundInput);this.element?.removeEventListener('click',this.boundClick);
    releaseViewportBounds(this);if(openEditors.get(key(this.actor))===this)openEditors.delete(key(this.actor));return super.close(options);}
}

export async function openStrengthEditor(actor){
  if(actor?.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Нет прав на изменение ST этого персонажа.');
  const id=key(actor),existing=openEditors.get(id);
  if(existing){existing.bringToFront?.();return existing;}
  const app=new StrengthEditorApp({actor});openEditors.set(id,app);
  try{await app.render({force:true});return app;}catch(error){openEditors.delete(id);throw error;}
}
