import { generateId } from "../random-id.js";
import { weaponBondCheckbox } from './weapon-bond-service.js';
import {AmmoService} from './ammo-service.js';
import {confirmBatteryReplacement} from './battery-replacement-dialog.js';
import {LT_MATERIALS} from '../lt-melee-quality-data.js';
import { inferMeleeDamageModel, meleeDamageModelFromInputs, formatMeleeDamageModel,
  getMeleeNativeDamageParser, parseCompleteMeleeDamage } from './melee-damage-model.js';
import { prepareEffectiveMeleeDamage,executeUTMeleeContact } from './melee-service.js';
import {utMeleeResourceContext} from './ut-melee-resources.js';
import { sameStrengthActor } from './strength-service.js';
import { installViewportBounds } from './application-viewport.js';
import { editorMeleeContext, meleeProfileEditorHTML, selectMeleeEditorProfile } from './melee-profile-editor.js';
import { resolveMeleeProfile } from './melee-profile-service.js';
import {meleeQualityOptions} from './melee-profile-service.js';

const text=value=>String(value??'').trim();
export function validateMeleeAttackOverride(values, parser=null,{requireReach=true}={}) {
  const skillLevel=Number(text(values.skillLevel).replace(',','.'));
  const damageModel=values.damageMode?meleeDamageModelFromInputs(values):null;
  const damage=values.damageMode?formatMeleeDamageModel(damageModel):text(values.damage);
  const reach=text(values.reach)||(!requireReach?'-':''),parry=text(values.parry),errors=[];
  if(!Number.isInteger(skillLevel)||skillLevel<0||skillLevel>999)errors.push('Навык должен быть целым числом от 0 до 999');
  if(!damage)errors.push('Укажите корректную формулу урона и целую прибавку оружия');
  else if(parser&&!parseCompleteMeleeDamage(damage,parser))errors.push('Формула урона не распознана GGA');
  if(!reach)errors.push('Укажите Reach');
  return {valid:!errors.length,errors,value:errors.length?null:{skillLevel,damage,reach,parry,
    ...(damageModel?{damageModel}:{}),
    ...(values.damageMode||Object.hasOwn(values,'applyArmST')?{applyArmST:values.applyArmST===true||values.applyArmST==='on'}:{})}};
}

export async function openMeleeAttackEditor({DialogV2,actor,attack,manualAttack=attack,escapeHTML:esc,weaponBond=false}) {
  const model=manualAttack.damageModel??inferMeleeDamageModel(manualAttack.damage);
  const parser=await getMeleeNativeDamageParser();
  const profileContext=editorMeleeContext(actor,manualAttack);
  let selection={...profileContext?.saved},manualChanged=false;
  if(profileContext&&selection.grip==='tip')selection=selectMeleeEditorProfile(profileContext,selection,'grip','tip',actor,manualAttack);
  const profileRevision=actor?.getFlag?.('olegurps-qol','meleeProfiles')?.revision??0;
  let hook=null,revision=0;
  try {
    const result=await DialogV2.wait({
      window:{title:'Параметры: '+attack.label,resizable:true},position:{width:540},
      content:`<div class="standard-form gam-attack-editor gam-melee-editor">
        <div data-melee-profile-editor>${meleeProfileEditorHTML(profileContext,selection,esc,actor,manualAttack)}</div>
        ${profileContext?`<details class="gam-melee-manual-fields"><summary>Ручные параметры исходной атаки${manualAttack.meleeManualOverride?' – изменены':''}${attack.applyArmST?' · Arm ST':''}</summary>`:''}
        <label class="gam-attack-editor-row"><span>Ручной итог навыка</span><input type="number" name="skillLevel" value="${esc(manualAttack.level)}" min="0" max="999" step="1" required></label>
        <label class="gam-attack-editor-row"><span>Основа урона</span><select name="damageMode">
          <option value="swing" ${model.mode==='swing'?'selected':''}>Swing – замах</option>
          <option value="thrust" ${model.mode==='thrust'?'selected':''}>Thrust – выпад</option>
          <option value="fixed" ${model.mode==='fixed'?'selected':''}>Fixed / Custom – полная формула</option></select></label>
        <div data-damage-structured>
          <label class="gam-attack-editor-row"><span>Дополнительные кубики</span><input type="number" name="damageExtraDice" step="1" value="${esc(model.extraDice??0)}"></label>
          <label class="gam-attack-editor-row"><span>Прибавка урона оружия</span><input type="number" name="damageBonus" step="1" value="${esc(model.bonus??0)}"></label>
          <label class="gam-attack-editor-row"><span>Тип урона</span><input type="text" name="damageType" value="${esc(model.damageType??'cut')}" list="gam-melee-damage-types"></label>
          <datalist id="gam-melee-damage-types">${['cr','cut','imp','pi-','pi','pi+','pi++','burn','cor','tox','fat'].map(t=>`<option value="${t}"></option>`).join('')}</datalist>
          <label class="gam-attack-editor-row"><span>Делитель брони</span><input type="text" name="damageDivisor" value="${esc(model.armorDivisor??'')}" placeholder="Без делителя"></label>
          <label class="gam-melee-editor-check"><input type="checkbox" name="damageMinimum" ${model.minimum?'checked':''}> Минимум 1 (!)</label>
          <label class="gam-attack-editor-row"><span>Дополнительные свойства</span><input type="text" name="damageExtension" value="${esc(model.extension??'')}" placeholder="Например, ex"></label>
        </div>
        <label class="gam-attack-editor-row" data-damage-fixed><span>Полная формула GGA</span><input type="text" name="damage" value="${esc(manualAttack.damage)}" placeholder="2d+2 imp"></label>
        <label class="gam-attack-editor-row"><span>Reach</span><input type="text" name="reach" value="${esc(manualAttack.reach)}" ${profileContext?.source.ltConstruction?'':'required'}></label>
        <label class="gam-attack-editor-row"><span>Parry</span><input type="text" name="parry" value="${esc(manualAttack.parry)}"></label>
        <label class="gam-melee-editor-check"><input type="checkbox" name="applyArmST" ${attack.applyArmST===true?'checked':''}> Применять Arm ST к этой атаке</label>
        <p class="hint">Прибавка оружия изменяет урон, а не ST. Arm ST выбирает владелец для этой атаки.</p>
        ${profileContext?'</details>':''}
        <p data-damage-preview role="status"></p>
        ${attack.unarmedRef?'':weaponBondCheckbox({available:true,checked:weaponBond})}
        <p class="notes">Изменения сохраняются в OleGURPS QOL. При сбросе возвращаются параметры исходной атаки.</p>
      </div>`,
      render:(_event,dialog)=>{
        installViewportBounds(dialog);
        const root=dialog.element;
        root.addEventListener('click',async event=>{
          const button=event.target.closest('[data-ut-melee-resource]');if(!button)return;
          button.disabled=true;
          try{
            const modeId=selection.modeId||profileContext.source.modeId,service=new AmmoService(actor);
            if(button.dataset.utMeleeResource==='contact')await executeUTMeleeContact({actor,attack:resolveMeleeProfile({actor,attack:manualAttack,selection,context:profileContext}),confirmed:root.querySelector('[data-ut-contact-confirm]')?.checked===true});
            else if(button.dataset.utMeleeResource==='settle'){
              const c=utMeleeResourceContext(actor,manualAttack,modeId),expectedResource=structuredClone(c.saved);
              const answer=await DialogV2.wait({window:{title:'Проверить результат действия'},modal:false,rejectClose:false,content:'<p>Проверьте чат и фактическое действие. Завершённое действие сохраняет расход; незавершённое возвращает резерв. Повторного броска нет.</p>',buttons:[{action:'completed',label:'Действие завершено',callback:()=>({completed:true})},{action:'cancelled',label:'Действие не состоялось',callback:()=>({completed:false})},{action:'cancel',label:'Отмена',callback:()=>false}]});
              if(answer&&typeof answer==='object')await service.settleMeleeResource(manualAttack,{modeId,expectedResource,completed:answer.completed});
            }else if(button.dataset.utMeleeResource==='spend'){
              const answer=await DialogV2.wait({window:{title:'Списать фактическую работу ресурса'},modal:false,rejectClose:false,content:'<label>Количество применений / секунд работы<input name="amount" type="number" min="1" step="1" value="1"></label>',buttons:[{action:'spend',label:'Списать',callback:(_e,b)=>({amount:Number(b.form.elements.amount.value)})},{action:'cancel',label:'Отмена',callback:()=>false}]});
              if(answer&&typeof answer==='object')await service.executeMeleeResource({attack:manualAttack,modeId,attackId:generateId(),amount:answer.amount,execute:async()=>({rolled:true,manualSpend:true})});
            }else if(button.dataset.utMeleeResource==='payload'){
              const c=utMeleeResourceContext(actor,manualAttack,modeId),expectedResource=structuredClone(c.saved),requestId=generateId();
              const payload=await DialogV2.wait({window:{title:'Установить одну внешнюю дозу'},modal:false,rejectClose:false,content:'<label>Фактически установленное содержимое<input name="payload" type="text" maxlength="2000"></label><p>Предыдущую дозу сначала используйте. Препарат не создаётся. Замена требует времени по источнику.</p>',buttons:[{action:'install',label:'Установить',callback:(_e,b)=>({payload:b.form.elements.payload.value})},{action:'cancel',label:'Отмена',callback:()=>false}]});
              if(payload&&typeof payload==='object')await service.setMeleePayload(manualAttack,{modeId,requestId,expectedResource,payload:payload.payload});
            }else await confirmBatteryReplacement({actor,meleeAttack:manualAttack,modeId,ammoService:service,DialogV2});renderProfile();void update();}
          catch(error){globalThis.ui?.notifications?.warn?.(error.message);}finally{button.disabled=false;}
        });
        root.classList.add('gam-melee-editor-window');
        const renderProfile=()=>{
          const expanded=[...root.querySelectorAll('[data-melee-profile-editor] details[open]')].map(e=>e.className);
          root.querySelector('[data-melee-profile-editor]').innerHTML=meleeProfileEditorHTML(profileContext,selection,esc,actor,manualAttack);
          for(const details of root.querySelectorAll('[data-melee-profile-editor] details'))if(expanded.includes(details.className))details.open=true;
        };
        const update=async()=>{
          const current=++revision,values=Object.fromEntries(new FormData(root.querySelector('form')).entries());
          const save=root.querySelector('[data-action=save]');
          if(save)save.disabled=true;
          const structured=values.damageMode!=='fixed';
          root.querySelector('[data-damage-structured]').hidden=!structured;
          root.querySelector('[data-damage-fixed]').hidden=structured;
          const instruction=profileContext?.profiles.find(p=>p.modeId===(selection.modeId||profileContext.source.modeId))?.instructionOnly===true;
          const out=root.querySelector('[data-damage-preview]'),validation=profileContext&&!manualChanged?{valid:true,value:manualAttack}:validateMeleeAttackOverride(values,parser,{requireReach:!profileContext?.source.ltConstruction});
          if(!validation.valid){out.textContent=validation.errors.join('; ');return;}
          try{
            const base=manualChanged?{...manualAttack,...validation.value,hasMeleeDamageOverride:validation.value.damage!==manualAttack.damage,
              meleeManualOverride:{skillLevel:validation.value.skillLevel,parry:validation.value.parry}}:manualAttack;
            const projected=profileContext?resolveMeleeProfile({actor,attack:base,selection,context:profileContext}):base;
            const prepared=await prepareEffectiveMeleeDamage({actor,attack:projected});
            if(current===revision)out.textContent=prepared?'Урон сейчас: '+prepared.formula:instruction?'Специальное воздействие без обычного Damage':'Урон не определён';
            if(current===revision&&projected.readinessReason)out.textContent+=' · '+projected.readinessReason;
            if(current===revision&&save)save.disabled=!!profileContext&&(!prepared&&!instruction||!!projected.readinessReason);
          }catch(error){if(current===revision)out.textContent=error.message;}
        };
        const changed=event=>{
          const key=event.target.dataset?.meleeProfile;
          if(key){
            try{selection=selectMeleeEditorProfile(profileContext,selection,key,key==='neuralSettings'?[...event.target.selectedOptions].map(o=>o.value):event.target.value,actor,manualAttack);}
            catch(error){globalThis.ui?.notifications?.warn?.(error.message);renderProfile();return;}
            if(key==='material'&&LT_MATERIALS[event.target.value]?.fixedQuality)selection.quality=LT_MATERIALS[event.target.value].fixedQuality;
            if(key==='material'&&selection.quality){const profile=profileContext.profiles.find(p=>p.modeId===(selection.modeId||profileContext.source.modeId));
              if(!meleeQualityOptions(actor,profile,profileContext.saved,selection).some(q=>q.level===selection.quality))selection.quality='Good';}
            if(key==='material'&&(!LT_MATERIALS[event.target.value]?.metal||event.target.value==='silver'))selection.coating='';
            renderProfile();
            if(key==='weaponTL')root.querySelector('[data-melee-profile=weaponTL]')?.focus();
          }else if(profileContext&&event.target.name==='applyArmST')selection.applyArmST=event.target.checked;
          else if(event.target.name&&event.target.name!=='weaponBond')manualChanged=true;
          void update();
        };
        root.addEventListener('input',changed);root.addEventListener('change',changed);void update();
        if(actor&&hook===null)hook=Hooks.on('updateActor',updated=>{if(sameStrengthActor(updated,actor)){
          if(profileContext)renderProfile();
          void update();
        }});
      },
      buttons:[
        {action:'save',label:'Сохранить',icon:'fa-solid fa-floppy-disk',default:true,callback:(_event,button)=>{
          const values=Object.fromEntries(new FormData(button.form).entries()),instruction=profileContext?.profiles.find(p=>p.modeId===(selection.modeId||profileContext.source.modeId))?.instructionOnly===true,validation=profileContext&&!manualChanged?{valid:true,value:manualAttack}:validateMeleeAttackOverride(values,parser,{requireReach:!profileContext?.source.ltConstruction});
          if(!validation.valid)throw Error(validation.errors.join('; '));
          if(profileContext){
            const base=manualChanged?{...manualAttack,...validation.value,hasMeleeDamageOverride:validation.value.damage!==manualAttack.damage,
              meleeManualOverride:{skillLevel:validation.value.skillLevel,parry:validation.value.parry}}:manualAttack;
            const projected=resolveMeleeProfile({actor,attack:base,selection,context:profileContext});
            if(projected.readinessReason)throw Error(projected.readinessReason);
          }
          return {action:'save',value:validation.value,manualChanged,
            ...(profileContext?{profileSelection:selection,profileContext,profileRevision}:{}),
            weaponBond:values.weaponBond==='on'};
        }},
        {action:'reset',label:'Сбросить изменения',icon:'fa-solid fa-arrow-rotate-left',callback:()=>({action:'reset',profileRevision,profileContext})},
        {action:'cancel',label:'Отмена',callback:()=>null}
      ],rejectClose:false,modal:false
    });
    if(result?.action==='save'&&result.values){
      const validation=validateMeleeAttackOverride(result.values,parser,{requireReach:!profileContext?.source.ltConstruction});
      if(!validation.valid){globalThis.ui?.notifications?.error?.(validation.errors.join('; '));return null;}
      return {action:'save',value:validation.value,weaponBond:result.values.weaponBond==='on'};
    }
    return result;
  }finally{revision++;if(hook!==null)Hooks.off('updateActor',hook);}
}
