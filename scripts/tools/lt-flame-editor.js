import {ltFlameProfile,ltFlameConfiguration,LT_FLAME_FUELS,LT_FLAME_FUEL_REFERENCE} from '../lt-flame-source.js';
import {ltFlameCharge,ltFlameRequirements,ltFlameTypeAssessment} from './lt-flame.js';
import {ammoTypeKey} from './ammo-inventory.js';

export function captureLTFlameInputs(root,ui){
 if(!root?.querySelector('[data-lt-flame]'))return false;
 const value=n=>root.querySelector('[name="ltFlame-'+n+'"]')?.value??'',checked=n=>root.querySelector('[name="ltFlame-'+n+'"]')?.checked===true;
 ui.ltFlameDrafts??={};ui.ltFlameDrafts[ui.ammoKey]={accounting:value('accounting'),fuel:value('fuel'),bodyMaterial:value('bodyMaterial'),fragmentsMaterial:value('fragmentsMaterial'),volumePints:Number(value('volumePints')),powderLb:Number(value('powderLb')),fragmentsLb:Number(value('fragmentsLb')),resinLb:Number(value('resinLb')),
  ...Object.fromEntries(['note','savingThrow','description'].map(n=>[n,value(n)]))};
 ui.ltFlameSettings={applyArmST:checked('arm'),staticMount:checked('mount')};
 ui.ltFlameOperation={quantity:Number(value('quantity')),seconds:Number(value('seconds')),confirmed:checked('confirm'),twoHands:checked('twoHands'),crew:2,crewST:Number(value('crewST')),remainingVolumePints:Number(value('remainingVolumePints')),manualCheck:value('manualCheck')};return true;
}
export function ltFlameManagementHTML(weapon,ui,types,escape){
 const p=ltFlameProfile(weapon),c=ltFlameCharge(weapon),f=c?.flame,s=ui.ltFlameSettings??ltFlameConfiguration(weapon),selected=types.find(t=>t.key===ui.ammoKey)??types[0],stock=weapon.ammunitionInventory.stocks.find(s=>s.key===selected?.key);
 const q={accounting:'components',fuel:p.fuels[0],...(selected?.recipe?.parameters??{}),...(ui.ltFlameDrafts?.[ui.ammoKey]??{})},o=ui.ltFlameOperation??{};
 const button=(action,label,disabled=false)=>`<button type="button" data-inventory-action="lt-flame-${action}" ${disabled?'disabled':''}>${escape(label)}</button>`;
 const input=(name,label,value='',attrs='')=>`<label>${escape(label)}<input name="ltFlame-${name}" value="${escape(value)}" ${attrs}></label>`;
 const check=(name,label,value=false)=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="ltFlame-${name}" ${value?'checked':''}>${escape(label)}</label>`;
 const labels={loaded:'снаряжён, подготовка не выполнена',held:'взят в руки',lit:'горит; смените хват',ready:p.system==='liquid'?f?.flowing?'идёт подача':'подача подготовлена':p.irreversible?'горит; готов к атаке':'готов к атаке'};
 const readySeconds=p.system==='liquid'?10:p.system==='blowpipe'?20:1;
 const parts=selected?.recipe?ltFlameRequirements(p,q).map(r=>`<div class="gam-inventory-line"><span>${r.kind==='body'?'Новый корпус ('+(r.material==='paper'?'бумага':'бамбук')+')':'Запал / фитиль'}: ${weapon.ltEarly.components.find(s=>s.key===r.key)?.rounds??0}</span><button type="button" data-inventory-action="lt-flame-component-add" data-component="${r.kind}">Добавить</button><button type="button" data-inventory-action="lt-flame-component-remove" data-component="${r.kind}">Списать</button></div>`).join(''):'';
 const place=weapon.ammunitionInventory.magazines.find(m=>!m.ltEarlyLegacy&&m.ltEarlyPlace===0),legacy=weapon.ammunitionInventory.magazines.filter(m=>m.ltEarlyLegacy);
 return `<div class="gam-ammo-inventory" data-lt-flame style="grid-auto-rows:max-content;align-content:start"><h3>${escape(weapon.name)}</h3>`+
  `<p data-lt-flame-state>${f?escape(labels[f.stage]??f.stage)+'; остаток '+f.remaining+(p.jet?' с':' заряд')+(p.irreversible?'; прошло '+f.elapsed+' с':''):weapon.ltEarly.flameUsed?(p.system==='disposable'?'Одноразовое устройство использовано.':'Заряд израсходован; нужна перезарядка.'):'Зарядное место пусто.'}</p>`+
  (place&&place.id!==weapon.ammunitionInventory.installedId?`<button type="button" data-inventory-action="lt-flame-select-place" data-magazine-id="${escape(place.id)}">Выбрать штатное зарядное место</button>`:'')+
  (legacy.length?`<details><summary>Прежние контейнеры: только сохранение и разгрузка</summary>${legacy.map(m=>`<div class="gam-inventory-line"><span>${escape(m.id)}: ${m.rounds}/${m.capacity}</span><button type="button" data-inventory-action="lt-flame-unload-legacy" data-magazine-id="${escape(m.id)}" ${m.rounds?'':'disabled'}>Разгрузить прежний контейнер</button></div>`).join('')}</details>`:'')+
  `<label>Физическая партия<select name="inventoryAmmo">${types.map(t=>`<option value="${escape(t.key)}" ${selected?.key===t.key?'selected':''}>${escape(t.label??t.name)}</option>`).join('')}</select></label>`+
  `<p>Запас выбранной партии: ${stock?.rounds??0} ${q.accounting==='components'?'мерных порций смеси':'готовых физических единиц'}. ${p.jet?'Табличный ресурс: '+(p.system==='liquid'?p.seconds+' порций подачи по 1 с':'один непрерывно горящий заряд на '+p.seconds+' с')+'.':''}</p>`+
  input('quantity','Количество физических единиц / мерных порций',o.quantity??1,'type="number" min="1" step="1"')+
  `<div class="gam-inventory-actions" style="gap:8px">${button('stock-add','Добавить в запас',!selected?.recipe)}${button('stock-remove','Списать запас',!selected?.recipe)}${button('load',p.system==='disposable'&&weapon.ltEarly.flameUsed?'Заменить целое устройство':'Снарядить одну единицу',!!c||!selected?.recipe)}${button('unload','Разгрузить остаток',!c||p.irreversible&&f?.ignited)}</div>`+
  (p.system==='liquid'?input('remainingVolumePints','Измеренный остаток для разгрузки, пинты',o.remainingVolumePints||'','type="number" min="0" step="any"'):'')+
  `<details class="lt-flame-batch"><summary>Отдельная физическая партия</summary><label>Состав<select name="ltFlame-fuel">${p.fuels.map(id=>`<option value="${id}" ${q.fuel===id?'selected':''}>${escape(LT_FLAME_FUELS[id])}</option>`).join('')}</select></label>`+
  `<label>Учёт<select name="ltFlame-accounting"><option value="components" ${q.accounting==='components'?'selected':''}>Отдельные компоненты</option><option value="prepared" ${q.accounting==='prepared'?'selected':''}>Готовая физическая единица</option></select></label>`+
  (p.system==='disposable'?'<label>Одноразовый корпус<select name="ltFlame-bodyMaterial"><option value="bamboo" '+(q.bodyMaterial!=='paper'?'selected':'')+'>Бамбук</option><option value="paper" '+(q.bodyMaterial==='paper'?'selected':'')+'>Бумага</option></select></label>':'')+
  (p.system==='liquid'?input('volumePints','Измеренный объём одной заправки, пинты',q.volumePints??'','type="number" min="0" step="any"'):
   p.system==='blowpipe'?input('resinLb','Измеренная масса смолы в заряде, lb',q.resinLb??'','type="number" min="0" step="any"'):
   input('powderLb','Измеренная масса пороха, lb',q.powderLb??'','type="number" min="0" step="any"')+(p.linked?'<label>Материал частиц<select name="ltFlame-fragmentsMaterial"><option value="metal" '+(q.fragmentsMaterial!=='pottery'?'selected':'')+'>Металл</option><option value="pottery" '+(q.fragmentsMaterial==='pottery'?'selected':'')+'>Керамика</option></select></label>'+input('fragmentsLb','Измеренная масса частиц, lb',q.fragmentsLb??'','type="number" min="0" step="any"'):''))+
  (p.system==='liquid'?`<p>Опубликовано на пинту: $${LT_FLAME_FUEL_REFERENCE[q.fuel]?.costPerPint??'—'}, 1 lb (LT84). Объём заправки — измерение владельца, без пересчёта в секунды.</p>`:'')+
  ['note','savingThrow','description'].map((n,k)=>`<label>${['Note / содержимое','Спасбросок / ручные условия','Краткое описание'][k]}<textarea rows="2" name="ltFlame-${n}">${escape(q[n]??'')}</textarea></label>`).join('')+
  button('save-batch','Сохранить новую партию с запасом 0')+'<p>Количество компонентов задаёт владелец; книга не устанавливает перевод пинт или массы в секунды подачи.</p></details>'+
  (selected?.recipe?.customId?`<button type="button" data-inventory-action="delete-recipe" ${(stock?.rounds??0)>0||weapon.ammunitionInventory.magazines.some(m=>m.rounds&&m.ammoKey===selected.key)?'disabled':''}>Удалить пустую партию</button>`:'')+
  `<details><summary>Компоненты выбранной партии</summary><p>Смесь учитывается один раз в запасе партии. При раздельном учёте отдельно нужны запал${p.system==='disposable'?' и новый корпус':''}; готовая сборка уже содержит их.</p>${parts}</details>`+
  `<details open><summary>Подготовка и работа</summary><p>${p.name==='Fire-Siphon'?'Два оператора: каждые 10 с проверка среднего ST или ST-based Liquid Projector, если выше.':p.system==='liquid'?'Подготовка 10 с; затем возможна непрерывная подача.':p.system==='blowpipe'?'20 с подготовки двумя руками; атака одной рукой.':p.name==='Eruptor'?'Один Ready для поджигания.':'По одному Ready: взять, поджечь, сменить хват.'}</p>`+
  check('confirm','Указанное действие / время фактически выполнены',o.confirmed)+
  (p.system==='blowpipe'?check('twoHands','Подготовка выполнена двумя руками',o.twoHands):'')+
  (p.name==='Fire-Siphon'?input('crewST','ST второго оператора',o.crewST||'','type="number" min="1" step="1"'):'')+
  input('seconds','Выполненные секунды (Ready / подготовка / горение / перезарядка)',o.seconds??readySeconds,'type="number" min="1" step="1"')+
  `<div class="gam-inventory-actions" style="gap:8px">${button('ready','Выполнить следующий шаг',!c)}${p.irreversible?button('advance','Учесть прошедшее горение',!f?.ignited):''}${button('stop',p.system==='liquid'?'Прекратить подачу':'Погасить без возврата заряда',!f?.ignited)}</div>`+
  (p.rechargeSeconds?`<p>Перезарядка: ${p.rechargeSeconds/60} мин и Explosives (Fireworks). Последняя проверка: ${weapon.ltEarly.flameRechargeAttempt?weapon.ltEarly.flameRechargeAttempt.success?'успех':'неудача':'не выполнялась'}.</p><label>Если навык не удалось определить автоматически<select name="ltFlame-manualCheck"><option value="">Результат не указан</option><option value="success">Ручная проверка успешна</option><option value="failure">Ручная проверка неудачна</option></select></label>${button('recharge','Проверить перезарядку',!!c)}`:'')+
  '<p>Промежутки горения учитываются вручную. Погашенный пиротехнический заряд повторно не поджигается.</p>'+(p.irreversible&&p.name!=='Eruptor'?'<p>Ready смены хвата после поджигания уже расходует одну секунду горения.</p>':'')+'</details>'+
  `<details><summary>Настройки экземпляра</summary>${check('arm','Применять Arm ST к этой атаке',s.applyArmST)}${p.name==='Eruptor'?check('mount','Статичная установка: $270, 13.5 lb',s.staticMount):''}${button('configure','Сохранить настройки')}</details>`+
  `<p role="status">${escape(ui.message??'')}</p><p>Оружие: $${p.reference.cost}, ${p.reference.weightLb} lb. LT84–86. ${p.ongoingDice?'После подтверждённого попадания длительность продолжающегося горения определяется отдельной кнопкой карточки атаки.':p.system==='blowpipe'?'Заряд: $0.50, 0.05 lb. Геометрия конуса и поражённые цели определяются вручную.':''}</p></div>`;
}
export async function handleLTFlameAction(app,operation,button){
 if(!operation.startsWith('lt-flame-'))return false;if(app.busy)return true;app.busy=true;
 try{
  const w=app.weapon,p=ltFlameProfile(w),action=operation.slice(9),o=app.ui.ltFlameOperation??{},type=app._displayedTypes?.get(app.ui.ammoKey)??w.ammunitionInventory.stocks.find(s=>s.key===app.ui.ammoKey)?.type??{source:'catalog',book:'lt',kind:'ammo-item',ammoId:p.ammoId},c=ltFlameCharge(w);
  const tx=(op,args)=>app.service.inventoryTransaction(app.weaponId,op,args,{allowedTypes:[type]});
  if(action==='save-batch'){
   const parameters={...(app.ui.ltFlameDrafts?.[app.ui.ammoKey]??{}),fit:{weaponId:w.id,equipmentId:p.equipmentId,barrels:[0]}};
   const next={source:'catalog',book:'lt',kind:'ammo-item',ammoId:p.ammoId,name:p.name+' — '+LT_FLAME_FUELS[parameters.fuel]+' (партия владельца)',recipe:{version:1,variantId:'lt_flame_load',customId:crypto.randomUUID(),parameters}};next.key=ammoTypeKey(next);
   if(!ltFlameTypeAssessment({modeId:p.modeId,type:next,catalogs:globalThis.OleGURPSQOL.catalogs,weapon:w}).applicationAllowed)throw Error('Укажите состав и положительное измеренное количество компонентов.');await tx('save-recipe',{type:next});app.ui.ammoKey=next.key;
  }else if(action==='stock-add'||action==='stock-remove')await tx(action==='stock-add'?'add-stock':'remove-stock',{ammoKey:app.ui.ammoKey,amount:o.quantity});
  else if(action==='component-add'||action==='component-remove')await tx('lt-early-component',{type,kind:button.dataset.component,amount:action==='component-add'?o.quantity:-o.quantity});
  else if(action==='configure')await tx('lt-early-configure',{settings:app.ui.ltFlameSettings});
  else if(action==='select-place')await tx('install',{magazineId:button.dataset.magazineId});
  else if(action==='unload-legacy')await tx('unload',{magazineId:button.dataset.magazineId,amount:w.ammunitionInventory.magazines.find(m=>m.id===button.dataset.magazineId)?.rounds});
  else if(action==='load')await tx(p.system==='disposable'&&w.ltEarly.flameUsed?'lt-flame-replace':'load',{magazineId:w.ammunitionInventory.installedId,ammoKey:app.ui.ammoKey,amount:1});
  else await tx(action==='unload'?'unload':'lt-flame-'+action,{...o,chargeId:c?.id,revision:c?.flame?.revision,expectedRevision:w.ltEarly.flameRechargeRevision??0,magazineId:w.ammunitionInventory.installedId,amount:1});
  app.ui.message='';if(app.ui.ltFlameOperation)app.ui.ltFlameOperation.confirmed=false;await app.onUpdate?.(await app.service.loadState());
 }catch(error){app.ui.message=error.message;globalThis.ui?.notifications?.error?.(error.message);}finally{app.busy=false;await app.refresh({capture:false});}return true;
}
