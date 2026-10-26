import {ltEarlyProfile,ltEarlyImprovisedId,ltEarlyConfiguration} from '../lt-early-firearms-source.js';
import {ltEarlyTypeAssessment,ltEarlySlots,ltEarlyPowderRequirements,ltEarlyActiveSlot} from './lt-early-firearms.js';
import {ammoTypeKey} from './ammo-inventory.js';
import {campaignAmmunitionAdmission,readCampaignTL} from './ammunition-tech-level.js';
import {captureLTArtilleryInputs,ltArtilleryManagementHTML} from './lt-artillery-editor.js';
import {captureLTFlameInputs,ltFlameManagementHTML,handleLTFlameAction} from './lt-flame-editor.js';

const componentLabel={propellant:'Мерная порция метательного пороха',priming:'Отдельная порция затравки',wadding:'Пыж',paper:'Бумажная оболочка / пыж',cloth:'Тканевый пакет'};
export function ltEarlyCandidates(actor,weapon,api=globalThis.OleGURPSQOL){
 const p=ltEarlyProfile(weapon);if(!p)return null;
 const ids=[...p.ammoIds,...(['artillery','flame'].includes(p.kind)||p.usage==='Shoot Bolt'?[]:[ltEarlyImprovisedId(p)]),...(p.kind==='puckle'?['lt_puckle_square_bullet_lt93']:[])];
 const types=ids.map(ammoId=>{const r=api.catalogs.getAmmoItem('lt',ammoId),t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:r.name};t.key=ammoTypeKey(t);const fitRequired=['artillery','flame','ten-eyed','facing'].includes(p.kind);return {...t,label:r.name+' — снаряд / основа партии',requiresPreparation:fitRequired&&!r.lt_early_source_undetermined,unavailable:r.lt_early_source_undetermined===true||fitRequired,reason:r.lt_early_source_undetermined?'LT93 не определяет отдельный боевой профиль квадратной конструкции.':fitRequired?'Создайте отдельную партию с подгонкой к этому экземпляру и зарядным местам.':''};});
 for(const type of types)if(type.requiresPreparation&&weapon.ammunitionInventory?.stocks.some(s=>s.key===type.key&&(s.rounds||weapon.ammunitionInventory.magazines.some(m=>m.rounds&&m.ammoKey===s.key)))){
  type.historical=true;type.label+=' — прежний неподтверждённый запас';
 }
 for(const stock of weapon.ammunitionInventory?.stocks??[]){const t=stock.type;if(types.some(x=>x.key===t.key))continue;
  const assessment=ltEarlyTypeAssessment({modeId:p.modeId,type:t,catalogs:api.catalogs,weapon});
  types.push({...structuredClone(t),label:(t.name??'Прежняя партия')+(assessment?.applicationAllowed?'':' — только сохранение / разгрузка'),unavailable:!assessment?.applicationAllowed,reason:assessment?.reason??'Состав этой старой партии не подтверждён.'});
 }
 return types.filter(t=>campaignAmmunitionAdmission(t,api.catalogs,readCampaignTL(actor),p.modeId).allowed||weapon.ammunitionInventory?.stocks.some(s=>s.key===t.key&&(s.rounds||weapon.ammunitionInventory.magazines.some(m=>m.rounds&&m.ammoKey===t.key))));
}
export function captureLTEarlyInputs(root,ui){
 if(captureLTFlameInputs(root,ui))return;
 if(captureLTArtilleryInputs(root,ui))return;
 if(root?.querySelector('[data-lt-early-places]')){
  ui.ltEarlyQuantity=Number(root.querySelector('[name="ltEarly-quantity"]')?.value??1);
  ui.ltEarlyReady=root.querySelector('[name="ltEarly-ready"]')?.checked===true;return;
 }
 if(!root?.querySelector('[data-lt-early]'))return;
 const value=n=>root.querySelector('[name="ltEarly-'+n+'"]')?.value??'',checked=n=>root.querySelector('[name="ltEarly-'+n+'"]')?.checked===true;
 ui.ltEarlyDrafts??={};ui.ltEarlyDrafts[ui.ammoKey]={accounting:value('accounting'),loading:value('loading'),boosted:checked('boosted'),safety:value('safety'),powderQuality:value('quality'),careful:checked('careful'),
  barrels:[...root.querySelectorAll('[data-lt-fit-place]:checked')].map(x=>Number(x.dataset.ltFitPlace)),...Object.fromEntries(['note','savingThrow','description'].map(n=>[n,value(n)]))};
 ui.ltEarlySettings={crew:Number(value('crew')),ignitionReady:checked('ignition'),stockCollapsed:checked('stock')};
 ui.ltEarlyQuantity=Number(value('quantity'));ui.ltEarlyReady=checked('ready');
}
export function ltEarlyPlacesHTML(weapon,ui,types,escape){
 const p=ltEarlyProfile(weapon);if(!p)return '<p>Оружие не найдено.</p>';
 const active=ltEarlyActiveSlot(weapon),selected=types.find(t=>t.key===ui.ammoKey),select=!['ten-eyed','facing'].includes(p.kind);
 const button=(action,label,attrs='')=>`<button type="button" data-inventory-action="lt-early-${action}" ${attrs}>${escape(label)}</button>`;
 const slots=weapon.ammunitionInventory.magazines.map(m=>{
  const label=m.ltEarlyLegacy?'Прежний контейнер':p.kind==='artillery'?(p.containerCapacity===20?'Несъёмный бункер на 20 болтов':'Зарядное место'):p.kind==='puckle'?'Цилиндр №'+(m.ltEarlyPlace+1):p.kind==='ten-eyed'?'Сторона '+(m.ltEarlyPlace<5?'A':'B')+' · заряд '+(m.ltEarlyPlace%5+1):'Ствол №'+(m.ltEarlyPlace+1);
  const id=`data-magazine-id="${escape(m.id)}"`,extra=(p.kind==='puckle'&&m.ltEarlyLegacy?button('adapt-cylinder','Использовать прежний пустой цилиндр',`${id} ${m.rounds?'disabled':''}`):'')+
   (p.kind==='puckle'||m.ltEarlyLegacy?button('delete-cylinder','Удалить пустой',`${id} ${m.rounds?'disabled':''}`):'');
  return `<div data-lt-place="${escape(m.id)}" style="display:grid;grid-template-columns:minmax(140px,1fr) 70px 55px 94px 94px${select?' 80px':''};gap:8px;align-items:center"><strong>${escape(label)}</strong>`+
   `<span data-lt-place-active style="text-align:center">${active?.id===m.id?'активен':''}</span><span data-lt-place-count style="text-align:center;white-space:nowrap">${m.rounds}/${m.capacity}</span>`+
   button('load','Снарядить',`${id} ${m.ltEarlyLegacy||m.rounds===m.capacity||!selected?.recipe||selected.unavailable?'disabled':''}`)+button('unload','Разрядить',`${id} ${m.rounds?'':'disabled'}`)+
   (select?button('install','Выбрать',id):'')+(extra?`<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap">${extra}</div>`:'')+'</div>';
 }).join('');
 return `<div class="gam-ammo-inventory" data-lt-early-places style="grid-auto-rows:max-content;align-content:start"><h3>${escape(weapon.name)}</h3>`+
  `<p>Снаряжено ${ltEarlySlots(weapon).reduce((n,m)=>n+m.rounds,0)}. Выбранная партия: ${weapon.ammunitionInventory.stocks.find(s=>s.key===ui.ammoKey)?.rounds??0}.</p>`+
  `<label>Партия для снаряжения<select name="inventoryAmmo">${types.map(t=>`<option value="${escape(t.key)}" ${t.key===ui.ammoKey?'selected':''}>${escape(t.label??t.name)}</option>`).join('')}</select></label>`+
  `<label>Количество для операции<input type="number" name="ltEarly-quantity" min="1" step="1" value="${escape(ui.ltEarlyQuantity??1)}"></label>${slots}`+
  (['puckle','ten-eyed','facing'].includes(p.kind)?`<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" name="ltEarly-ready" ${ui.ltEarlyReady?'checked':''}>${p.kind==='puckle'?'Выполнены 15 Ready для смены цилиндра':'Выполнен 1 Ready для разворота'}</label>`:'')+
  (['ten-eyed','facing'].includes(p.kind)?button('flip','Развернуть оружие'):'')+
  (p.kind==='puckle'?button('add-cylinder','Добавить пустой цилиндр на 9 камор')+'<p>Запасной пустой цилиндр: $200, 10lb; LT93. Боеприпасы приобретаются отдельно.</p>':'')+
  `<p role="status">${escape(ui.message??'')}</p></div>`;
}
export function ltEarlyManagementHTML(weapon,ui,types,escape,actor=null){
 const p=ltEarlyProfile(weapon);if(!p)return '';
 if(p.kind==='flame')return ltFlameManagementHTML(weapon,ui,types,escape);
 if(p.kind==='artillery')return ltArtilleryManagementHTML(weapon,ui,types,escape,actor);
 const i=weapon.ammunitionInventory,selected=types.find(t=>t.key===ui.ammoKey)??types[0],parameters=ui.ltEarlyDrafts?.[ui.ammoKey]??selected?.recipe?.parameters??{},c=ui.ltEarlySettings??ltEarlyConfiguration(weapon),active=ltEarlyActiveSlot(weapon);
 const d={accounting:'components',loading:'loose',powderQuality:'normal',...parameters},fit=d.barrels??d.fit?.barrels??[];
 const options=(rows,value)=>rows.map(([id,label])=>`<option value="${id}" ${id===value?'selected':''}>${escape(label)}</option>`).join('');
 const check=(name,label,value)=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="ltEarly-${name}" ${value?'checked':''}>${escape(label)}</label>`;
 const button=(action,label,attrs='')=>`<button type="button" data-inventory-action="lt-early-${action}" ${attrs}>${escape(label)}</button>`;
 const stock=i.stocks.find(s=>s.key===selected?.key),requirements=ltEarlyPowderRequirements(p,{...d,powder:p.powder},selected?.ammoId);
 const parts=requirements.map(r=>`<div class="gam-inventory-line"><span>${escape(componentLabel[r.kind])}: ${weapon.ltEarly?.components.find(s=>s.key===r.key)?.rounds??0}</span>${button('component-add','Добавить',`data-component="${r.kind}" ${!selected?.recipe?'disabled':''}`)}${button('component-remove','Списать',`data-component="${r.kind}" ${!selected?.recipe?'disabled':''}`)}</div>`).join('');
 const reload=p.kind==='ten-eyed'&&((active?.ltEarlyPlace??0)%5)>0?60:p.reloadSeconds;
 const loadingTime=d.loading==='paper'?Math.ceil(reload/2)*(d.careful?2:1):reload*(d.careful?2:1)-(d.loading==='measured'?5:0);
 const fastDraw=['LT91','LT88'].includes(p.source)?null:({60:50,40:30,45:36,20:16,90:80,10:8})[reload];
 const weather=p.lock==='cannonlock'||p.lock==='matchlock'?'Malf−4 / −8 / −12':p.lock==='wheellock'?'Malf−2 / −4 / −6':'Malf−1 / −2 / −3 с закрытой затравкой; без крышки −2 / −4 / −6';
 return `<div class="gam-ammo-inventory" data-lt-early style="grid-auto-rows:max-content;align-content:start"><h3>${escape(weapon.name)}</h3><p>Снаряжено ${ltEarlySlots(weapon).reduce((n,m)=>n+m.rounds,0)}; выбранная партия: ${stock?.rounds??0}. ${p.pellets>1?'Одна единица снаряда — комплект из '+p.pellets+' дробин.':''}</p>`+
  `<p>Выстрел использует ${p.kind==='duck'?'четыре подготовленных заряда, по одному из каждого ствола':'один подготовленный заряд выбранного ствола / каморы'}. Компоненты учтены при снаряжении; повторного списания пороха нет.</p>`+
  `<label>Снаряд / партия<select name="inventoryAmmo">${types.map(t=>`<option value="${escape(t.key)}" ${t.key===ui.ammoKey?'selected':''}>${escape(t.label??t.name)}</option>`).join('')}</select></label>`+
  `<label>Количество для операции<input type="number" name="ltEarly-quantity" min="1" step="1" value="${escape(ui.ltEarlyQuantity??1)}"></label>`+
  `<div class="gam-inventory-actions">${button('stock-add','Пополнить выбранную партию')}${button('stock-remove','Списать свободный запас')}</div>`+
  `<details><summary>Подгонка и состав отдельной партии</summary><label>Учёт<select name="ltEarly-accounting">${options([['components','Отдельные снаряды и компоненты'],['prepared','Полные готовые комплекты']],d.accounting)}</select></label>`+
  '<p>Готовый комплект уже содержит снаряд, навеску, затравку и пыж / оболочку. Отдельный запас компонентов при его использовании не списывается.</p>'+
  `<label>Способ снаряжения<select name="ltEarly-loading">${options([['loose','Раздельно, россыпью'],['measured','Мерные порции, многоразовая пороховница'],['paper','Бумажный патрон'],...(p.source==='LT88'?[['cloth','Тканевый пакет']]:[])],d.loading)}</select></label>`+
  `<p>Порох: ${escape({serpentine:'Serpentine (LT85,91)',corned:'Corned (LT85,91)','source-black-powder':'чёрный порох; конкретный сорт в таблице не указан'}[p.powder])}. Порции измерены для этого заряда; масса навески книгой не задана и автоматически не вычисляется.</p>`+
  `<label>Качество пороха<select name="ltEarly-quality">${options([['normal','Обычное'],['substandard','Некачественный: −1 за куб, Malf−2 (LT85)']],d.powderQuality)}</select></label>`+
  check('boosted','Усиленная навеска: Damage / Range / ST ×1,1 (LT95)',d.boosted)+
  `<label>Проверка усиленной навески<select name="ltEarly-safety">${options([['','Не отмечена'],['checked','Armoury (Small Arms) / IQ-based Guns−2 выполнена успешно'],['exceeded','Превышен безопасный предел: Malf−2']],d.safety??'')}</select></label>`+
  (p.muzzleloading&&['Musket','Rifle'].includes(p.governing_skill.skill.specialization)?check('careful','Careful Loading: удвоенное время, Acc+1 (LT95)',d.careful):'')+
  '<p>Подогнано к этому экземпляру и указанным зарядным местам:</p><div style="display:flex;flex-wrap:wrap;gap:8px">'+Array.from({length:p.places},(_,n)=>`<label><input type="checkbox" data-lt-fit-place="${n}" ${fit.includes(n)?'checked':''}>${p.kind==='ten-eyed'?(n<5?'A':'B')+(n%5+1):n+1}</label>`).join('')+'</div>'+
  ['note','savingThrow','description'].map((n,k)=>`<label>${['Note / содержимое','Спасбросок / ручные условия','Краткое описание'][k]}<textarea rows="2" name="ltEarly-${n}">${escape(d[n]??'')}</textarea></label>`).join('')+
  button('save-batch','Сохранить новую отдельную партию')+'<p>Новая партия имеет запас 0. Старые партии и уже подготовленные заряды сохраняются.</p></details>'+
  `<details><summary>Отдельные компоненты выбранной партии</summary>${parts}<p>Навеска и затравка — отдельные порции; многоразовая пороховница не является пулей и при выстреле не исчезает.</p></details>`+
  `<details><summary>Готовность оружия</summary>${check('ignition','Запал / механизм подготовлен к выстрелу',c.ignitionReady)}`+
  (p.source==='LT91'?`<label>Расчёт<select name="ltEarly-crew">${options([['1','Один стрелок: без бонуса Acc за Aim, −2'],['2','Два стрелка: поджиг помощником по DX / Guns']],String(c.crew))}</select></label>`:'')+
  (p.modeId==='WMqVwH46upN0TpmQE'?check('stock','Телескопический приклад сложен: Acc2 / ST10 / Bulk−3 / Rcl5',c.stockCollapsed):'')+
  `<div style="margin-top:8px">${button('configure','Сохранить готовность')}</div></details>`+
  `<details><summary>Подготовка и ручные условия — LT90,94–95</summary><p>Выбранный способ: ${loadingTime} с на ствол / камору. ${p.kind==='ten-eyed'?'Внутренние четыре заряда каждой стороны: базово 60 с; крайний — 30 с. ':''}${fastDraw?'Fast-Draw (Ammo): при успешном броске базовое раздельное снаряжение '+fastDraw+' с; сочетания с другими условиями разрешайте по LT94–95. ':p.source==='LT91'?'Fast-Draw (Ammo) не сокращает заряжание gonne. ':''}${p.muzzleloading&&['Musket','Rifle','Shotgun'].includes(p.governing_skill.skill.specialization)?'Дульнозарядное плечевое оружие: не стоя — базовое время ×1,5 вверх. ':''}Верхом — меньший из Guns−3 / Riding−3; движущаяся платформа — Guns−2.</p>`+
  `<p>Дождь / сильный дождь и брызги / шторм: ${weather}. Если дождевой штраф вызвал отказ, это осечка. Россыпной порох, намоченный при заряжании, срабатывает только при критическом успехе; бумага и ткань защищают навеску.</p>`+
  `<p>${p.lock==='wheellock'?'Колесцовый замок: завести пружину ключом и опустить курок. ':p.lock==='flintlock'?'Кремнёвый замок: взвести курок; смена незнакомого типа замка −2 до ознакомления. ':'Нужны горящий фитиль / горячая проволока; подготовка и поджиг выполняются вручную. '}${p.lock==='matchlock'?'Горящий фитиль: Holdout−4, свет заметен ночью. ':''}${p.source==='LT88'?'Установка, расчёт и подготовка китайского орудия — вручную по LT87–88; здесь доступен только подтверждённый дробовой режим. ':''}${p.modeId==='WdgjNzGS4n0xMiSi4'?'Winged Tiger: три ствола стреляют отдельно; перезаряжать верхом нельзя (LT92). ':''}</p>`+
  '<p>Чистка: 2 минуты каждые 5 выстрелов. За каждые 5 без чистки — время снаряжения +10% вверх и Malf−1; за каждые 10 — Acc−1. Эти накопления и необязательный Malf по B407 учитываются вручную; поле готовности не выполняет чистку и не исправляет осечку.</p></details>'+
  button('open-places','Зарядные места')+
  `<p role="status">${escape(ui.message??'')}</p><p>${escape(p.source)}; подготовку, погоду, Malf и чистку разрешайте по кратким условиям оружия; автоматического таймера нет.</p></div>`;
}
export async function handleLTEarlyAction(app,operation,button){
 if(await handleLTFlameAction(app,operation,button))return true;
 if(!operation.startsWith('lt-early-'))return false;if(app.busy)return true;app.busy=true;
 try{
  const weapon=app.weapon,p=ltEarlyProfile(weapon),types=ltEarlyCandidates(app.actor,weapon),type=types.find(t=>t.key===app.ui.ammoKey),quantity=app.ui.ltEarlyQuantity;
  const tx=(op,args)=>app.service.inventoryTransaction(app.weaponId,op,args,{allowedTypes:()=>types});
  const action=operation.slice('lt-early-'.length),magazineId=button.dataset.magazineId;
  if(action==='save-batch'){
   if(!type||type.unavailable&&!type.requiresPreparation)throw Error('Выберите подтверждённый физический снаряд.');
   const input=app.ui.ltEarlyDrafts?.[app.ui.ammoKey]??{},parameters={...input,powder:p.powder,fit:{weaponId:weapon.id,equipmentId:p.equipmentId,barrels:input.barrels??[]}};delete parameters.barrels;
   const next={source:'catalog',book:'lt',kind:'ammo-item',ammoId:type.ammoId,name:globalThis.OleGURPSQOL.catalogs.getAmmoItem('lt',type.ammoId).name+' — отдельная партия',recipe:{version:1,variantId:p.kind==='artillery'?'lt_artillery_load':'lt_early_load',customId:crypto.randomUUID(),parameters}};next.key=ammoTypeKey(next);
   if(!ltEarlyTypeAssessment({modeId:p.modeId,type:next,catalogs:globalThis.OleGURPSQOL.catalogs,weapon})?.applicationAllowed)throw Error('Укажите подгонку, состав и результат проверки усиленной навески.');
   await tx('save-recipe',{type:next});app.ui.ammoKey=next.key;
  }else if(action==='stock-add'||action==='stock-remove')await tx(action==='stock-add'?'add-stock':'remove-stock',{ammoKey:type?.key,amount:quantity});
  else if(action==='component-add'||action==='component-remove')await tx('lt-early-component',{type,kind:button.dataset.component,amount:action==='component-add'?quantity:-quantity});
  else if(action==='configure')await tx('lt-early-configure',{settings:app.ui.ltEarlySettings});
  else if(action==='flip')await tx('lt-early-flip',{readyConfirmed:app.ui.ltEarlyReady===true});
  else if(action==='add-cylinder')await tx('add-magazines',{capacity:9,amount:quantity});
  else if(action==='delete-cylinder')await tx('delete-magazine',{magazineId});
  else if(action==='adapt-cylinder')await tx('lt-early-adapt-cylinder',{magazineId});
  else if(action==='load'||action==='unload')await tx(action,{magazineId,ammoKey:type?.key,amount:quantity});
  else if(action==='install')await tx('install',{magazineId,readyConfirmed:app.ui.ltEarlyReady===true});
  else throw Error('Неизвестная операция с ранним огнестрелом.');
  app.ui.message='';app.ui.ltEarlyReady=false;await app.onUpdate?.(await app.service.loadState());
 }catch(error){app.ui.message=error.message;globalThis.ui?.notifications?.error?.(error.message);}
 finally{app.busy=false;await app.refresh({capture:false});}return true;
}
