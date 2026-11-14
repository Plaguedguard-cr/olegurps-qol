import { FALL_PRESETS, ANGLES, COLLISION_MODES, asBool,
  fallCollisionSettings, calculateFall, calculateCollision } from './fall-collision-rules.js';
import { fallCollisionMessage } from './fall-collision-presentation.js';

export const FALL_FLAG_SCOPE = 'world', FALL_FLAG_KEY = 'gurpsFallDamageMacro';
const TITLE = 'Падения и столкновения';
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const field = (name, label, value, { min = 0, step = 'any', optional = false } = {}) =>
  `<div class="oq-fall-row"><label for="oq-fc-${name}">${label}</label><input id="oq-fc-${name}" type="number" name="${name}" value="${escape(value)}" min="${min}" step="${step}" ${optional ? '' : 'required'}></div>`;
const check = (name, label, value) => `<div class="oq-fall-row oq-fall-check"><label for="oq-fc-${name}">${label}</label><input id="oq-fc-${name}" type="checkbox" name="${name}" ${asBool(value) ? 'checked' : ''}></div>`;
const select = (name, label, value, options) => `<div class="oq-fall-row"><label for="oq-fc-${name}">${label}</label><select id="oq-fc-${name}" name="${name}">${Object.entries(options).map(([key, text]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${text}</option>`).join('')}</select></div>`;
const surface = (name, value) => select(name, 'Поверхность', String(asBool(value)), { true: 'Твёрдая', false: 'Мягкая' });
const barrier = (prefix, v) => `${check(prefix + 'breakable', 'Разрушаемая преграда', v.breakable)}<div data-barrier="${prefix}">
  ${field(prefix + 'barrierHp', 'HP преграды', v.barrierHp, { min: '.000001' })}${field(prefix + 'barrierDr', 'DR преграды', v.barrierDr)}
  <p class="oq-fall-hint">После броска: не более HP + DR преграды в обе стороны (B431).</p></div>`;
const participants = (prefix, v) => `${field(prefix + 'hpA', 'HP объекта A (ударяющего)', v.hpA, { min: '.000001' })}
  ${field(prefix + 'hpB', 'HP объекта B (цели)', v.hpB, { min: '.000001' })}
  ${field(prefix + 'speedA', 'Скорость A, ярдов/с', v.speedA)}${field(prefix + 'speedB', 'Скорость B, ярдов/с', v.speedB)}
  ${select(prefix + 'angle', 'Характер столкновения', v.angle, ANGLES)}
  <p class="oq-fall-hint">Сзади: A догоняет B. Сбоку: A ударяет B; скорость B не влияет на скорость столкновения. Вводите полные HP, а не текущий остаток.</p>`;

export function fallingContent(v) {
  return `<div class="oq-fall">
  <div class="oq-fall-tabs" role="tablist" aria-label="Раздел помощника">
    <button type="button" role="tab" data-fc-tab="fall" id="oq-fc-tab-fall" aria-controls="oq-fc-panel-fall">Падения</button>
    <button type="button" role="tab" data-fc-tab="collision" id="oq-fc-tab-collision" aria-controls="oq-fc-panel-collision">Столкновения</button>
  </div>
  <input type="hidden" name="tab" value="${v.tab}">
  <section data-fc-panel="fall" id="oq-fc-panel-fall" role="tabpanel" aria-labelledby="oq-fc-tab-fall">
    ${field('height', 'Высота падения, ярды', v.height)}${field('hp', 'HP падающего объекта', v.hp, { min: '.000001' })}
    ${field('gravity', 'Гравитация, G', v.gravity)}${field('pressure', 'Атмосферное давление, атм.', v.pressure)}
    <p class="oq-fall-hint">0 атм. – вакуум: конечная скорость не ограничена. Вводите полные HP объекта.</p>
    ${select('fallType', 'Положение тела / форма', v.fallType, { ...Object.fromEntries(Object.entries(FALL_PRESETS).map(([k, p]) => [k, p.optionLabel])), custom: 'Своё значение' })}
    <div data-custom-terminal>${field('customTerminal', 'Своя земная конечная скорость, ярдов/с', v.customTerminal, { min: '.000001' })}</div>
    <p class="oq-fall-hint" data-terminal-preview></p>
    ${surface('hardSurface', v.hardSurface)}${check('acrobatics', 'Успешная акробатика (−5 ярдов)', v.acrobatics)}
    <p class="oq-fall-hint">Галочка означает уже выполненный успешный бросок Acrobatics.</p>
    ${barrier('', v)}
  </section>
  <section data-fc-panel="collision" id="oq-fc-panel-collision" role="tabpanel" aria-labelledby="oq-fc-tab-collision">
    ${select('collisionMode', 'Вид столкновения', v.collisionMode, COLLISION_MODES)}
    <div data-fc-mode="object">${participants('object.', v.object)}</div>
    <div data-fc-mode="obstacle">${field('obstacle.hp', 'HP движущегося объекта', v.obstacle.hp, { min: '.000001' })}
      ${field('obstacle.speed', 'Скорость удара, ярдов/с', v.obstacle.speed)}${surface('obstacle.hardSurface', v.obstacle.hardSurface)}${barrier('obstacle.', v.obstacle)}</div>
    <div data-fc-mode="overrun">${participants('overrun.', v.overrun)}
      ${field('overrun.smA', 'SM объекта A', v.overrun.smA, { min: '-1000000', step: 1 })}${field('overrun.smB', 'SM цели B', v.overrun.smB, { min: '-1000000', step: 1 })}
      ${field('overrun.st', 'ST объекта A (если есть)', v.overrun.st, { min: '.000001', optional: true })}
      <p class="oq-fall-hint">Для дополнительного thrust используется половина ST; если ST нет – половина HP. Разница SM должна быть не меньше 2 (B432).</p></div>
  </section></div>`;
}

// Keep every input mounted: tab/mode switching only changes visibility and validation.
export function mountFallingDialog(root, previous) {
  const get = name => root.querySelector(`[name="${name}"]`);
  const update = () => {
    const tab = get('tab').value, mode = get('collisionMode').value;
    for (const b of root.querySelectorAll('[data-fc-tab]')) b.setAttribute('aria-selected', String(b.dataset.fcTab === tab));
    for (const el of root.querySelectorAll('[data-fc-panel]')) el.hidden = el.dataset.fcPanel !== tab;
    for (const el of root.querySelectorAll('[data-fc-mode]')) el.hidden = el.dataset.fcMode !== mode;
    for (const el of root.querySelectorAll('[data-barrier]')) el.hidden = !get(el.dataset.barrier + 'breakable').checked;
    root.querySelector('[data-custom-terminal]').hidden = get('fallType').value !== 'custom';
    root.querySelector('[data-terminal-preview]').textContent = get('fallType').value === 'custom' ?
      'Задайте конечную скорость для 1G и 1 атм.; местные условия учитываются автоматически.' :
      `Земная конечная скорость: ${FALL_PRESETS[get('fallType').value]?.terminal ?? '–'} ярдов/с (1G, 1 атм.).`;
    for (const el of root.querySelectorAll('input:not([type=hidden]),select')) el.disabled = Boolean(el.closest('[hidden]'));
  };
  for (const b of root.querySelectorAll('[data-fc-tab]')) b.addEventListener('click', () => { get('tab').value = b.dataset.fcTab; update(); });
  root.addEventListener('change', update);
  update();
  return () => {
    const state = { ...previous, object: { ...previous.object }, obstacle: { ...previous.obstacle }, overrun: { ...previous.overrun } };
    for (const el of root.querySelectorAll('input[name],select[name]')) {
      const [group, key] = el.name.split('.'), value = el.type === 'checkbox' ? el.checked : el.value;
      if (key) state[group][key] = value; else state[group] = value;
    }
    state.hardSurface = asBool(state.hardSurface); state.obstacle.hardSurface = asBool(state.obstacle.hardSurface);
    return state;
  };
}

export async function openFallingDamage() {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2) return ui.notifications.error('Этот инструмент требует DialogV2.');
  const user = game.user, saved = user.getFlag(FALL_FLAG_SCOPE, FALL_FLAG_KEY) ?? {};
  const previous = fallCollisionSettings(saved);
  let read;
  const answer = await DialogV2.wait({
    window: { title: TITLE }, position: { width: 610 }, modal: false, rejectClose: false,
    content: fallingContent(previous),
    render: (_event, dialog) => { read = mountFallingDialog(dialog.element, previous); },
    buttons: [
      { action: 'calculate', label: 'Рассчитать', icon: 'fa-solid fa-calculator', default: true, callback: () => {
        try {
          const state = read();
          const result = state.tab === 'fall' ? calculateFall(state) : calculateCollision(state.collisionMode, state[state.collisionMode]);
          return { state, result };
        } catch (error) { ui.notifications.error(`Ошибка ввода: ${error.message}`); return false; }
      } },
      { action: 'cancel', label: 'Отмена', callback: () => false }
    ]
  });
  if (!answer?.state) return;
  const { state, result } = answer;
  // Keep the old key/shape and unknown legacy properties. Cancel/open never write flags.
  const terminalEarth = state.fallType === 'custom' ? state.customTerminal : FALL_PRESETS[state.fallType]?.terminal;
  try { await user.setFlag(FALL_FLAG_SCOPE, FALL_FLAG_KEY, { ...state, terminalEarth }); }
  catch (error) { console.warn('OleGURPS QOL: fall/collision preferences', error); ui.notifications.warn('Не удалось сохранить настройки помощника.'); }
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ alias: TITLE }), content: fallCollisionMessage(result) });
}
