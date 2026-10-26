import { weaponBondCheckbox } from './weapon-bond-service.js';
import { inferMeleeDamageModel, meleeDamageModelFromInputs, formatMeleeDamageModel,
  getMeleeNativeDamageParser, parseCompleteMeleeDamage } from './melee-damage-model.js';
import { prepareEffectiveMeleeDamage } from './melee-service.js';
import { sameStrengthActor } from './strength-service.js';
import { installViewportBounds } from './application-viewport.js';

const text=value=>String(value??'').trim();
export function validateMeleeAttackOverride(values, parser=null) {
  const skillLevel=Number(text(values.skillLevel).replace(',','.'));
  const damageModel=values.damageMode?meleeDamageModelFromInputs(values):null;
  const damage=values.damageMode?formatMeleeDamageModel(damageModel):text(values.damage);
  const reach=text(values.reach),parry=text(values.parry),errors=[];
  if(!Number.isInteger(skillLevel)||skillLevel<0||skillLevel>999)errors.push('Навык должен быть целым числом от 0 до 999');
  if(!damage)errors.push('Укажите корректную формулу урона и целую прибавку оружия');
  else if(parser&&!parseCompleteMeleeDamage(damage,parser))errors.push('Формула урона не распознана GGA');
  if(!reach)errors.push('Укажите Reach');
  return {valid:!errors.length,errors,value:errors.length?null:{skillLevel,damage,reach,parry,
    ...(damageModel?{damageModel}:{}),
    ...(values.damageMode||Object.hasOwn(values,'applyArmST')?{applyArmST:values.applyArmST===true||values.applyArmST==='on'}:{})}};
}

export async function openMeleeAttackEditor({DialogV2,actor,attack,escapeHTML:esc,weaponBondAvailable=false,weaponBond=false}) {
  const model=attack.damageModel??inferMeleeDamageModel(attack.damage);
  const parser=await getMeleeNativeDamageParser();
  let hook=null,revision=0;
  try {
    const result=await DialogV2.wait({
      window:{title:'Параметры: '+attack.label,resizable:true},position:{width:540},
      content:`<div class="standard-form gam-attack-editor gam-melee-editor">
        <label class="gam-attack-editor-row"><span>Навык</span><input type="number" name="skillLevel" value="${esc(attack.level)}" min="0" max="999" step="1" required autofocus></label>
        <label class="gam-attack-editor-row"><span>Основа урона</span><select name="damageMode">
          <option value="swing" ${model.mode==='swing'?'selected':''}>Swing — замах</option>
          <option value="thrust" ${model.mode==='thrust'?'selected':''}>Thrust — выпад</option>
          <option value="fixed" ${model.mode==='fixed'?'selected':''}>Fixed / Custom — полная формула</option></select></label>
        <div data-damage-structured>
          <label class="gam-attack-editor-row"><span>Прибавка урона оружия</span><input type="number" name="damageBonus" step="1" value="${esc(model.bonus??0)}"></label>
          <label class="gam-attack-editor-row"><span>Тип урона</span><input type="text" name="damageType" value="${esc(model.damageType??'cut')}" list="gam-melee-damage-types"></label>
          <datalist id="gam-melee-damage-types">${['cr','cut','imp','pi-','pi','pi+','pi++','burn','cor','tox','fat'].map(t=>`<option value="${t}"></option>`).join('')}</datalist>
          <label class="gam-attack-editor-row"><span>Делитель брони</span><input type="text" name="damageDivisor" value="${esc(model.armorDivisor??'')}" placeholder="Без делителя"></label>
          <label class="gam-melee-editor-check"><input type="checkbox" name="damageMinimum" ${model.minimum?'checked':''}> Минимум 1 (!)</label>
          <label class="gam-attack-editor-row"><span>Дополнительные свойства</span><input type="text" name="damageExtension" value="${esc(model.extension??'')}" placeholder="Например, ex"></label>
        </div>
        <label class="gam-attack-editor-row" data-damage-fixed><span>Полная формула GGA</span><input type="text" name="damage" value="${esc(attack.damage)}" placeholder="2d+2 imp"></label>
        <label class="gam-melee-editor-check"><input type="checkbox" name="applyArmST" ${attack.applyArmST===true?'checked':''}> Применять Arm ST к этой атаке</label>
        <p class="hint">Прибавка оружия изменяет урон, а не ST. Arm ST выбирает владелец для этой атаки.</p>
        <p data-damage-preview role="status"></p>
        <label class="gam-attack-editor-row"><span>Reach</span><input type="text" name="reach" value="${esc(attack.reach)}" required></label>
        <label class="gam-attack-editor-row"><span>Parry</span><input type="text" name="parry" value="${esc(attack.parry)}"></label>
        ${weaponBondCheckbox({available:weaponBondAvailable,checked:weaponBond})}
        <p class="notes">Изменения сохраняются в OleGURPS QOL. При сбросе возвращаются параметры исходной атаки.</p>
      </div>`,
      render:(_event,dialog)=>{
        installViewportBounds(dialog);
        const root=dialog.element;
        const update=async()=>{
          const current=++revision,values=Object.fromEntries(new FormData(root.querySelector('form')).entries());
          const structured=values.damageMode!=='fixed';
          root.querySelector('[data-damage-structured]').hidden=!structured;
          root.querySelector('[data-damage-fixed]').hidden=structured;
          const out=root.querySelector('[data-damage-preview]'),validation=validateMeleeAttackOverride(values,parser);
          if(!validation.valid){out.textContent=validation.errors.join('; ');return;}
          try{
            const prepared=await prepareEffectiveMeleeDamage({actor,attack:{...attack,...validation.value}});
            if(current===revision)out.textContent=prepared?'Урон сейчас: '+prepared.formula:'Урон не определён';
          }catch(error){if(current===revision)out.textContent=error.message;}
        };
        root.addEventListener('input',update);root.addEventListener('change',update);void update();
        if(actor&&hook===null)hook=Hooks.on('updateActor',updated=>{if(sameStrengthActor(updated,actor))void update();});
      },
      buttons:[
        {action:'save',label:'Сохранить',icon:'fa-solid fa-floppy-disk',default:true,callback:(_event,button)=>{
          const values=Object.fromEntries(new FormData(button.form).entries()),validation=validateMeleeAttackOverride(values,parser);
          if(!validation.valid)throw Error(validation.errors.join('; '));
          return {action:'save',value:validation.value,weaponBond:weaponBondAvailable&&values.weaponBond==='on'};
        }},
        {action:'reset',label:'Сбросить изменения',icon:'fa-solid fa-arrow-rotate-left',callback:()=>({action:'reset'})},
        {action:'cancel',label:'Отмена',callback:()=>null}
      ],rejectClose:false,modal:false
    });
    if(result?.action==='save'&&result.values){
      const validation=validateMeleeAttackOverride(result.values,parser);
      if(!validation.valid){globalThis.ui?.notifications?.error?.(validation.errors.join('; '));return null;}
      return {action:'save',value:validation.value,weaponBond:weaponBondAvailable&&result.values.weaponBond==='on'};
    }
    return result;
  }finally{revision++;if(hook!==null)Hooks.off('updateActor',hook);}
}
