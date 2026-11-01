// Pure UT contact conditions. Uses the existing shared HT resistance runner.
const kinds=['emd','neural','lethal','extinguisher','inhibitor'];
export function validUTContactEffect(e){
 return e?.condition==='ut-contact'&&e.outcome==='ut-contact'&&e.version===1&&e.attribute==='HT'&&kinds.includes(e.kind)&&Number.isSafeInteger(e.modifier)&&Math.abs(e.modifier)<=1000&&Number.isFinite(e.armorDivisor)&&e.armorDivisor>0&&['agony','ecstasy','stun','paralysis','seizure','death'].includes(e.setting)&&['id','name','source'].every(k=>typeof e[k]==='string'&&e[k].length>0&&e[k].length<=200);
}
export function utContactConditions(e,c){
 const integer=(v,max=100000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 if(!c||typeof c.applicable!=='boolean'||!integer(c.dr)||typeof c.metal!=='boolean'||typeof c.recovery!=='boolean'||!integer(c.injury)||typeof c.nervousSystem!=='boolean')throw Error('Укажите применимость контакта, DR и условия сопротивления.');
 if(!c.applicable||['neural','inhibitor'].includes(e.kind)&&!c.nervousSystem)return {applies:false,immunity:'Контакт / применимость эффекта не подтверждены.',modifier:e.modifier,lines:[]};
 if(e.kind==='lethal')return {applies:c.injury>0,immunity:c.injury>0?null:'Без травмы проверка B432 не требуется.',modifier:-Math.floor(c.injury/2),lines:['Фактическая травма: '+c.injury+'; −1 HT за полные 2 HP травмы. B432.']};
 const bonus=c.recovery||['extinguisher','inhibitor'].includes(e.kind)?0:e.kind==='emd'&&c.metal?0:Math.floor(c.dr/e.armorDivisor);
 return {applies:true,modifier:(c.recovery&&e.kind==='emd'?-5:e.modifier)+bonus,lines:[c.recovery?'Восстановление: HT−5 без DR, UT165.':'Применимый DR '+c.dr+', AD('+e.armorDivisor+'): +'+bonus+' HT.','Контакт, защита и последствия определяются вручную; отдельный физический Damage не отменяется. '+e.source]};
}
export async function askUTContactConditions(e,runtime,actor){
 const DialogV2=runtime.foundry.applications.api.DialogV2;
 return DialogV2.wait({window:{title:'Условия сопротивления – '+e.name},position:{width:440},modal:false,rejectClose:false,
  content:`<p>${String(e.source).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p><label><input name="applicable" type="checkbox"> Подтверждены контакт, попадание и применимость воздействия</label>`+
   (e.kind==='lethal'?'<label>Фактическая травма HP<input name="injury" type="number" min="0" step="1" value="0"></label>':['extinguisher','inhibitor'].includes(e.kind)?'':'<label>Применимый DR<input name="dr" type="number" min="0" step="1" value="0"></label>')+
   (e.kind==='emd'?'<label><input name="metal" type="checkbox"> Металлическая броня</label><label><input name="recovery" type="checkbox"> Восстановление без DR (контакт снят)</label>':'')+
   (['neural','inhibitor'].includes(e.kind)?'<label><input name="nervousSystem" type="checkbox"> Подходящая функционирующая нервная система</label>':'')+
   '<p data-ut-contact-preview></p>',
  render:(_event,dialog)=>{const form=dialog.element.querySelector('form'),out=dialog.element.querySelector('[data-ut-contact-preview]');const update=()=>{try{const c=utContactConditions(e,read(form));out.textContent=c.immunity??'Поправка HT: '+c.modifier;}catch(error){out.textContent=error.message;}};form.addEventListener('input',update);form.addEventListener('change',update);update();},
  buttons:[{action:'roll',label:'Бросить',callback:(_event,button)=>read(button.form)},{action:'cancel',label:'Отмена',callback:()=>false}]});
 function read(f){const n=k=>Number(f.elements[k]?.value??0),b=k=>f.elements[k]?.checked===true;return {applicable:b('applicable'),dr:n('dr'),metal:b('metal'),recovery:b('recovery'),injury:n('injury'),nervousSystem:!['neural','inhibitor'].includes(e.kind)||b('nervousSystem')};}
}
export function utContactConsequence(e,n,c,success){
 if(success)return 'Воздействие отражено; отдельный физический Damage сохраняется.';
 const margin=n.margin<0?-n.margin:null,duration=margin===null?'длительность автоматического провала определяется вручную':margin+' мин.';
 if(e.kind==='emd')return 'Knockdown и Paralysis. HT−5 каждую секунду для восстановления без DR. Поддержание контакта Concentrate запрещает восстановление; ещё заряд/секунду вручную. UT165.';
 if(e.kind==='lethal')return (n.margin<=-5||n.isCritFailure?'Heart Attack. ':'Unconsciousness при токе и ещё max(1,20−HT) минут; затем −2 DX столько же времени. ')+'Фактическая травма и состояния вручную. B432.';
 if(e.kind==='extinguisher')return 'Stun и Blindness: '+(margin===null?'длительность по автоматическому провалу вручную':margin+' с')+'. UT87.';
 if(e.kind==='inhibitor')return 'Forearm: паралич руки и отсутствие боли; шея: паралич ниже шеи; череп: Unconsciousness до снятия. Новая HT−6 каждую секунду контакта вручную. UT201.';
 if(e.setting==='death')return 'Heart Attack. UT165; UT122; B429.';
 return ({agony:'Agony',ecstasy:'Ecstasy',stun:'Unconsciousness',paralysis:'Paralysis',seizure:'Seizure'}[e.setting])+': '+duration+'. '+(['agony','ecstasy'].includes(e.setting)?(e.setting==='agony'?'Затем Moderate Pain':'Затем Euphoria')+' на столько же времени. '+(n.margin<=-5?'Heart Attack (проверить No Vitals вручную). ':''):'')+'Последствия вручную. UT121-122; UT165.';
}
