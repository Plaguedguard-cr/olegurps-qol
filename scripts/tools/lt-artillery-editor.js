import {ltArtilleryProfile,ltArtilleryAmmo,ltArtilleryConfiguration,LT_OVERWEIGHT_RANGE} from '../lt-artillery-source.js';
import {ltArtilleryRequirements,ltArtilleryCocking,ltArtilleryDamage} from './lt-artillery.js';

export function captureLTArtilleryInputs(root,ui){
 if(!root?.querySelector('[data-lt-artillery]'))return false;
 const value=n=>root.querySelector('[name="ltEarly-'+n+'"]')?.value??'',check=n=>root.querySelector('[name="ltEarly-'+n+'"]')?.checked===true;
 ui.ltEarlyDrafts??={};ui.ltEarlyDrafts[ui.ammoKey]={accounting:value('accounting'),loading:value('loading'),powderQuality:value('quality'),
  massFactor:Number(value('mass-factor')||1),projectileMass:Number(value('projectile-mass')),flamingReady:check('flaming-ready'),heatedReady:check('heated-ready'),barrels:check('fit')?[0]:[],
  ...Object.fromEntries(['note','savingThrow','description'].map(n=>[n,value(n)]))};
 ui.ltEarlySettings={crew:Number(value('crew')),cocking:value('cocking'),applyArmST:check('arm'),ignitionReady:check('ignition'),setupReady:check('setup'),mountReady:check('mount'),
  visionReady:check('vision'),standAside:check('aside'),procedureReady:check('procedure'),indirect:check('indirect')};
 ui.ltEarlyQuantity=Number(value('quantity'));return true;
}
export function ltArtilleryManagementHTML(weapon,ui,types,escape,actor){
 const p=ltArtilleryProfile(weapon),selected=types.find(t=>t.key===ui.ammoKey)??types[0],a=ltArtilleryAmmo(p,selected?.ammoId),d={accounting:'components',loading:p.mechanical?'mechanical':a?.kind==='heated'?'cloth':'loose',powderQuality:'normal',massFactor:a?.kind==='overweight'?1.5:1,
  ...(ui.ltEarlyDrafts?.[ui.ammoKey]??selected?.recipe?.parameters??{})},c=ui.ltEarlySettings??ltArtilleryConfiguration(weapon);
 const stock=weapon.ammunitionInventory.stocks.find(s=>s.key===selected?.key),loaded=weapon.ammunitionInventory.magazines.reduce((n,m)=>n+m.rounds,0);
 const options=(rows,current)=>rows.map(([id,label])=>`<option value="${id}" ${String(id)===String(current)?'selected':''}>${escape(label)}</option>`).join('');
 const check=(name,label,value)=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="ltEarly-${name}" ${value?'checked':''}>${escape(label)}</label>`;
 const button=(action,label,attrs='')=>`<button type="button" data-inventory-action="lt-early-${action}" ${attrs}>${escape(label)}</button>`;
 const componentLabels={propellant:'Мерная навеска',priming:'Затравка',wadding:'Пыж',paper:'Бумажная оболочка',cloth:'Тканевый пакет',clay:'Прослойка глины',canvas:'Холщовый мешок'};
 const parts=ltArtilleryRequirements(p,d,selected?.ammoId).map(r=>`<div class="gam-inventory-line"><span>${componentLabels[r.kind]}: ${weapon.ltEarly.components.find(x=>x.key===r.key)?.rounds??0}; на заряд ${r.amount}</span>${button('component-add','Добавить',`data-component="${r.kind}" ${!selected?.recipe?'disabled':''}`)}${button('component-remove','Списать',`data-component="${r.kind}" ${!selected?.recipe?'disabled':''}`)}</div>`).join('');
 const cocking=ltArtilleryCocking(weapon,actor);
 const preview=selected?.recipe?ltArtilleryDamage({modeId:p.modeId,weapon,type:selected,catalogs:globalThis.OleGURPSQOL?.catalogs}):null;
 return `<div class="gam-ammo-inventory" data-lt-artillery style="grid-auto-rows:max-content;align-content:start"><h3>${escape(weapon.name)}</h3>`+
  `<p>Готовых выстрелов: ${loaded}. Свободный запас выбранной партии: ${stock?.rounds??0}. ${p.stockUnits>1?'На выстрел нужно '+p.stockUnits+' отдельных снарядов.':'Одна единица запаса — один снаряд / специальный заряд.'}</p>`+
  (preview?.nativeSafe?`<p>Сохранённая партия: Damage ${escape(preview.formula)}; дальность ${escape(preview.effectiveChanges.range)} ярд.${p.oneArmed?' Минимум '+preview.rules.ballisticRange.minimum+' ярд.':''}</p>`:'')+
  `<label>Снаряд / партия<select name="inventoryAmmo">${types.map(t=>`<option value="${escape(t.key)}" ${t.key===ui.ammoKey?'selected':''}>${escape(t.label??t.name)}</option>`).join('')}</select></label>`+
  `<label>Количество для операции<input type="number" name="ltEarly-quantity" min="1" step="1" value="${escape(ui.ltEarlyQuantity??1)}"></label>`+
  `<div class="gam-inventory-actions">${button('stock-add','Пополнить выбранную партию')}${button('stock-remove','Списать свободный запас')}</div>`+
  `<details><summary>Подгонка и состав отдельной партии</summary><label>Учёт<select name="ltEarly-accounting">${options([['components','Отдельные снаряды и компоненты'],['prepared','Полные готовые комплекты']],d.accounting)}</select></label>`+
  `<p>Табличная масса полного заряда: ${p.roundMass} lb. ${p.mechanical?'':'Она включает порох и не определяет массу ядра.'}</p>`+
  (a?.mass==null&&a?.kind!=='grape'?`<label>Фактическая масса снаряда без пороха, lb (пользовательская)<input type="number" name="ltEarly-projectile-mass" min="0.001" step="any" value="${escape(d.projectileMass??'')}"></label>`:`<p>${a?.kind==='grape'?'Картечь: '+Math.floor(40*p.roundMass)+' шариков 0,5″ по полной массе заряда ×40 (LT88; B9).':'Масса одного снаряда: '+a?.mass+' lb.'}</p>`)+
  (a?.kind==='overweight'?`<label>Множитель массы<select name="ltEarly-mass-factor">${options(Object.keys(LT_OVERWEIGHT_RANGE).filter(k=>Number(k)>1).map(k=>[k,k+'; дальность ×'+LT_OVERWEIGHT_RANGE[k]]),d.massFactor)}</select></label>`:'')+
  `<label>Способ снаряжения<select name="ltEarly-loading">${options(p.mechanical?[['mechanical','Механический взвод / укладка снаряда']]:a?.kind==='heated'?[['cloth','Тканевый пакет + пустой пакет + глина']]:[['loose','Раздельно'],['measured','Мерные порции'],['paper','Бумажный пакет'],['cloth','Тканевый пакет']],d.loading)}</select></label>`+
  (!p.mechanical?`<p>Порох: ${escape({serpentine:'Serpentine',corned:'Corned','source-black-powder':'чёрный; сорт для модели не указан'}[p.powder])}. Навеска подогнана владельцем; её масса не вычисляется.</p><label>Качество пороха<select name="ltEarly-quality">${options([['normal','Обычное'],['substandard','Некачественный: −1 за куб, Malf−2 (LT85)']],d.powderQuality)}</select></label>`:'<input type="hidden" name="ltEarly-quality" value="normal">')+
  check('fit','Снаряд и состав подогнаны к этому экземпляру и зарядному месту',(d.barrels??d.fit?.barrels??[]).includes(0))+
  (a?.kind==='flaming'?check('flaming-ready','Болт подготовлен 10 с и будет использован в течение 3 с',d.flamingReady):'')+
  (a?.kind==='heated'?check('heated-ready','Железное ядро раскалено; тканевые пакеты и прослойка глины подготовлены',d.heatedReady):'')+
  ['note','savingThrow','description'].map((n,k)=>`<label style="display:flex;flex-direction:column;gap:4px">${['Note / содержимое','Спасбросок / ручные условия','Краткое описание'][k]}<textarea style="width:100%" rows="2" name="ltEarly-${n}">${escape(d[n]??'')}</textarea></label>`).join('')+
  button('save-batch','Сохранить новую отдельную партию')+'<p>Новая партия создаётся с запасом 0; готовые комплекты уже содержат все компоненты.</p></details>'+
  (parts?`<details><summary>Отдельные компоненты партии</summary>${parts}</details>`:'')+
  `<details><summary>Установка, расчёт и готовность</summary><label>Расчёт, включая наводчика<input type="number" name="ltEarly-crew" min="1" step="1" value="${c.crew}"></label><p>Дополнительных заряжающих по модели: ${p.additionalCrew}${a?.kind==='heated'?' +2 для раскалённого ядра':''}. Снаряжение: ${preview?.rules.ltArtillery.reloadSeconds??p.reloadSeconds} с${p.betweenShotsReady?'; между выстрелами 5 Ready':''}.</p>`+
  (p.personal?`<label>Взвод<select name="ltEarly-cocking">${options([['crank','Рукояткой: Rated ST не выше 10'],['hand','Вручную: полная Rated ST']],c.cocking)}</select></label>${check('arm','Применять Arm ST при взводе этой атаки',c.applyArmST)}<p>Rated ST ${p.ratedST}; доступная Lifting ST ${cocking?.effectiveST??'не определена'}. Damage остаётся табличным.</p>`:'')+
  (p.mountRequired?check('mount','Штатная опора / тренога / колёсный станок установлен',c.mountReady)+check('setup','Установка и линия огня подготовлены; проверки и время выполнены',c.setupReady):'')+
  (p.narrowVision?check('vision','Перед Aim выполнены 1 с и успешная Vision (+10, SM и дальность)',c.visionReady)+check('aside','Стою рядом с машиной: без бонуса Aim',c.standAside):'')+
  (p.indirectAvailable?check('indirect','Непрямой огонь (для табличного Artillery обязателен)',p.indirectDefault||c.indirect)+check('procedure','Дистанция, наблюдение и процедура непрямого огня согласованы вручную',c.procedureReady):'')+
  check('ignition',p.mechanical?'Взвод и подготовка к следующему выстрелу выполнены':'Запал и заряд подготовлены к выстрелу',c.ignitionReady)+
  `<div style="margin-top:8px">${button('configure','Сохранить готовность')}</div></details>`+
  `<details><summary>Источниковые условия — ${p.source}; LT79–84,87–89</summary><p>${p.oneArmed?'Минимальная дальность — четверть максимальной. ':''}${p.mountType?'Опора: '+escape(p.mountType)+'. ':''}Для фиксированной установки смена линии: Engineer (Combat) или Artillery−2; базово 5 часов, ускорение до −9 / 30 минут; −1 за полную тонну. Для перемещения нужно не более 15 суммарных BL расчёта (LT80). Подвижные станки сохраняют собственный способ наведения.</p>`+
  '<p>Фиксированная линия: массу камня изменяют только по LT83; scatter B414 вручную, нечётный результат — недолёт, чётный — перелёт. Навеска бомбарды здесь не меняется; при ручном изменении навески уменьшение даёт остановку при отказе, увеличение — взрыв (LT80).</p>'+
  '<p>Непрямой огонь использует Artillery соответствующей специализации, IQ−5; прямой — Gunner, DX−4 или другой Gunner−4. Персональные машины — Crossbow, DX−4. Точка падения и scatter определяются вручную; выбор Token не подтверждает попадание. Изменённые навески и неподтверждённые взрывные снаряды не исполняются.</p></details>'+
  button('open-places','Зарядные места')+`<p role="status">${escape(ui.message??'')}</p></div>`;
}
