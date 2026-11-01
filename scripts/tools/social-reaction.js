import {applyMessageMode} from './chat-message-mode.js';
import {installViewportBounds} from './application-viewport.js';

// Basic Set 4e: B187, B195, B202, B218-219, B223, B345, B347-348, B359.
// These are explanations for the GM, never an NPC or contest resolver.
export const SOCIAL_SKILLS = Object.freeze({
  diplomacy: {
    name: 'Diplomacy', aliases: ['Дипломатия'], source: 'B187',
    success: 'Успешная проверка помогает оценить последствия переговоров или выбрать подход. При влиянии ведущий разрешает состязание и сравнивает обычную реакцию с результатом Diplomacy, выбирая лучшую (B187, B359).',
    failure: 'Провал личной проверки не определяет реакцию НИП. Для Diplomacy ведущий использует лучшую из обычной реакции и результата влияния: неудачная попытка не ухудшает обычную реакцию (B187, B359).',
    criticalFailure: 'Критический провал Diplomacy: неблагоприятное осложнение определяет ведущий (B348). Правило выбора лучшей реакции сохраняется; отдельный фиксированный штраф реакции за критический провал не задан (B187, B359).',
    criticalSuccess: 'Критический успех Diplomacy: особую пользу определяет ведущий (B347). Итог влияния разрешается вручную с сохранением правила лучшей реакции; автоматическая реакция «Отличная» не назначается (B187, B359).'
  },
  fastTalk: {
    name: 'Fast-Talk', aliases: ['Заговаривание'], source: 'B195',
    success: 'Fast-Talk склоняет к быстрому решению вопреки здравому смыслу. Если ведущий установит победу в состязании влияния, реакция будет «Хорошая»; один успех личного броска ещё не определяет победителя (B195, B359).',
    failure: 'Если ведущий установит ничью или поражение в состязании Fast-Talk, неуклюжая манипуляция вызывает «Плохую» реакцию. Это не автоматическое следствие одного проваленного личного броска (B195, B348, B359).',
    criticalFailure: 'Критический провал Fast-Talk: особенно неблагоприятное последствие обмана определяет ведущий (B348). Дополнительная фиксированная категория реакции или обязательное наказание не установлены (B195, B359).',
    criticalSuccess: 'Критический успех Fast-Talk: особенно удачный результат убеждения определяет ведущий (B347). Навык рассчитан на быстрое решение, а не длительное притворство; критический результат не подменяет ручное разрешение влияния (B195, B359).'
  },
  intimidation: {
    name: 'Intimidation', aliases: ['Запугивание'], source: 'B202',
    success: 'При победе в состязании Intimidation даёт «Хорошую» реакцию, но конкретное поведение определяет ведущий: согласие не обязательно означает страх или преданность. Unfazeable делает запугивание невозможным (B202, B359).',
    failure: 'Ничья или поражение во влиянии обычно дают «Плохую» реакцию. При притворном запугивании провал или ничья предварительного состязания Fast-Talk автоматически срывают попытку и дают «Очень плохую» реакцию; эту отдельную процедуру разрешает ведущий (B202, B359).',
    criticalFailure: 'Критический провал Intimidation: особенно неблагоприятное последствие угроз определяет ведущий (B348). Он сам по себе не назначает «Очень плохую» реакцию: специальное правило притворного запугивания связано с предварительным Fast-Talk (B202, B359).',
    criticalSuccess: 'Критический успех Intimidation требует от запугиваемого проверки страха в дополнение к остальным результатам влияния. То же требуется при критическом провале его Will. Проверку страха и последствия разрешает ведущий вручную; макрос её не бросает (B202).'
  },
  savoirFaire: {
    name: 'Savoir-Faire', aliases: ['Этикет'], source: 'B218',
    success: 'В подходящей субкультуре успех Savoir-Faire позволяет вести себя без неловкости и распознавать притворяющихся высокопоставленными. При использовании для влияния победа в состязании даёт «Хорошую» реакцию; разрешается вручную, один бросок на встречу (B218, B359).',
    failure: 'Успех в соблюдении этикета не достигнут; последствия нарушения принятого кода зависят от субкультуры и ведущего. Если это влияние, ничья или поражение в состязании дают «Плохую» реакцию (B218, B359).',
    criticalFailure: 'Критический провал Savoir-Faire: особенно неблагоприятное социальное осложнение определяет ведущий с учётом специализации и норм группы. Фиксированное наказание, потеря статуса или особая категория реакции не назначаются (B218, B348).',
    criticalSuccess: 'Критический успех Savoir-Faire: особенно благоприятный результат соблюдения норм выбранной субкультуры определяет ведущий. Автоматического повышения статуса или ранга нет; исход влияния остаётся за ведущим (B218, B347, B359).'
  },
  sexAppeal: {
    name: 'Sex Appeal', aliases: ['Сексапильность', 'Сексуальная привлекательность'], source: 'B219',
    success: 'Sex Appeal применим к тому, кого привлекают представители вашего пола. Победа во влиянии даёт «Очень хорошую» реакцию вместо «Хорошей»; это не автоматический результат одного успеха проверки (B219, B359).',
    failure: 'При ничьей или поражении в состязании Sex Appeal неудачная манипуляция даёт «Плохую» реакцию. Обычно разрешена одна попытка на человека; новую спустя несколько недель может разрешить ведущий (B219, B359).',
    criticalFailure: 'Критический провал Sex Appeal: особенно неблагоприятное последствие неудачного соблазнения определяет ведущий. Фиксированное принуждение, изменение влечения или дополнительная категория реакции не заданы; ограничение повторных попыток сохраняется (B219, B348).',
    criticalSuccess: 'Критический успех Sex Appeal: особую пользу определяет ведущий. При победе во влиянии действует «Очень хорошая» реакция; автоматическая влюблённость, согласие на любые действия или изменение влечения не назначаются (B219, B347, B359).'
  },
  streetwise: {
    name: 'Streetwise', aliases: ['Знание улиц', 'Уличное чутьё'], source: 'B223',
    success: 'Streetwise помогает найти незаконные занятия, продажных чиновников и контакты преступного мира. В подходящей среде победа в состязании влияния даёт «Хорошую» реакцию; сведения и контакты описывает ведущий (B223, B359).',
    failure: 'Нужные сведения или новые связи не получены. Если Streetwise использован для влияния в преступной среде или опасном районе, ничья или поражение в состязании дают «Плохую» реакцию (B223, B359).',
    criticalFailure: 'Критический провал Streetwise: особенно неблагоприятное осложнение при поиске связей или общении в преступной среде определяет ведущий. Автоматическое нападение, арест или иной фиксированный эффект не задан (B223, B348).',
    criticalSuccess: 'Критический успех Streetwise: особенно полезный результат поиска сведений или новых связей определяет ведущий. Постоянное преимущество Contact автоматически не появляется; влияние разрешается ведущим (B223, B347, B359).'
  }
});

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/[\u2010-\u2015]/g, '-').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const signed = value => value >= 0 ? `+${value}` : String(value);
export const SOCIAL_MODIFIERS = Object.freeze({reaction: 'Личные модификаторы реакции', skill: 'Поправки выбранного навыка', situation: 'Ситуационные поправки'});

function skillFamily(entry) {
  if (normalize(entry.type) === 'technique') return null;
  for (const value of [entry.originalName, entry.name]) {
    const base = normalize(value).replace(/\s*\([^()]*\)\s*$/, '').replace(/^savoir faire$/, 'savoir-faire');
    for (const [key, skill] of Object.entries(SOCIAL_SKILLS))
      if ([skill.name, ...skill.aliases].some(name => normalize(name) === base)) return key;
  }
  return null;
}

export function listSocialSkills(actor) {
  const result = [], seen = new WeakSet();
  const visit = (tree, parent) => {
    if (!tree || typeof tree !== 'object' || seen.has(tree)) return;
    seen.add(tree);
    for (const [index, entry] of Object.entries(tree)) {
      if (!entry || typeof entry !== 'object') continue;
      const path = `${parent}.${index}`, family = skillFamily(entry);
      const raw = entry.level?.value ?? entry.level, level = typeof raw === 'string' && !raw.trim() ? NaN : Number(raw);
      if (family && Number.isSafeInteger(level) && level > 0) result.push({path, family, level,
        name: String(entry.name || entry.originalName), uuid: String(entry.uuid ?? entry.id ?? '')});
      visit(entry.contains, path + '.contains'); visit(entry.collapsed, path + '.collapsed');
    }
  };
  visit(actor?.system?.skills, 'system.skills');
  return result;
}

export function classifySocialRoll(total, effectiveSkill) {
  if (!Number.isInteger(total) || total < 3 || total > 18 || !Number.isSafeInteger(effectiveSkill) || effectiveSkill < 3)
    throw Error('Некорректный бросок или итоговый уровень навыка (B345).');
  const margin = effectiveSkill - total;
  const criticalSuccess = total <= 4 || total === 5 && effectiveSkill >= 15 || total === 6 && effectiveSkill >= 16;
  const criticalFailure = !criticalSuccess && (total === 18 || total === 17 && effectiveSkill <= 15 || total - effectiveSkill >= 10);
  const success = criticalSuccess || !criticalFailure && total < 17 && margin >= 0;
  const outcome = criticalSuccess ? 'criticalSuccess' : criticalFailure ? 'criticalFailure' : success ? 'success' : 'failure';
  const label = {success: 'Успех', failure: 'Провал', criticalFailure: 'Критический провал', criticalSuccess: 'Критический успех'}[outcome];
  const degree = success && margin >= 0 ? `Степень успеха: ${margin}` : !success && margin <= 0 ? `Степень провала: ${-margin}` :
    `Автоматический ${success ? 'успех' : 'провал'} по B347–348. Разность уровня и броска: ${signed(margin)}.`;
  return {total, effectiveSkill, margin, criticalSuccess, criticalFailure, success, outcome, label, degree};
}

export function socialOutcomeHTML(family) {
  const skill = SOCIAL_SKILLS[family];
  return `<div class="oq-social-outcomes">${[['success', 'Успех'], ['failure', 'Провал'], ['criticalFailure', 'Критический провал'], ['criticalSuccess', 'Критический успех']]
    .map(([key, title]) => `<details class="olegurps-chat-details" data-social-outcome="${key}"><summary>${title}</summary><p>${escape(skill[key])}</p></details>`).join('')}</div>`;
}

export async function rollSocialSkill({actor, skillPath, expectedSkill, modifiers = {}, note = ''}, runtime = globalThis) {
  if (!actor?.isOwner) throw Error('Выберите своего персонажа: нужны права владельца.');
  const skill = listSocialSkills(actor).find(entry => entry.path === skillPath);
  if (!skill || expectedSkill && (skill.uuid !== expectedSkill.uuid || skill.name !== expectedSkill.name || skill.family !== expectedSkill.family))
    throw Error('Выбранный навык изменился или недоступен. Откройте окно заново.');
  const values = Object.fromEntries(Object.keys(SOCIAL_MODIFIERS).map(key => {
    const raw = String(modifiers[key] ?? '').trim(), value = raw ? Number(raw.replace(',', '.')) : 0;
    if (!Number.isSafeInteger(value)) throw Error('Модификаторы должны быть целыми числами.');
    return [key, value];
  }));
  const modifier = Object.values(values).reduce((sum, value) => sum + value, 0), effectiveSkill = skill.level + modifier;
  if (!Number.isSafeInteger(effectiveSkill) || effectiveSkill < 3) throw Error('При итоговом уровне ниже 3 проверка навыка не допускается (B345).');
  const snapshot = {version: 1, actorId: actor.id, actorName: actor.name, skill: structuredClone(skill),
    modifiers: values, modifier, effectiveSkill, note: String(note)};
  const roll = await new runtime.Roll('3d6').evaluate();
  Object.assign(snapshot, classifySocialRoll(Number(roll.total), effectiveSkill));
  const content = `<div class="oq-social-reaction"><h3>Социальный навык</h3><p><strong>${escape(snapshot.actorName)}</strong> · ${escape(skill.name)}</p>
    <p>Итоговый уровень: <strong>${effectiveSkill}</strong></p>
    <details class="olegurps-chat-details"><summary>Модификаторы: ${signed(modifier)}</summary><p>Уровень из чарника: ${skill.level}</p>${Object.entries(values).map(([key, value]) => `<p>${SOCIAL_MODIFIERS[key]}: ${signed(value)}</p>`).join('')}${snapshot.note ? `<p>${escape(snapshot.note)}</p>` : ''}</details>
    ${await roll.render()}<p><strong>Фактический исход проверки: ${snapshot.label}</strong></p><p>${snapshot.degree}</p>
    ${socialOutcomeHTML(skill.family)}</div>`;
  const data = {user: runtime.game.user.id, speaker: runtime.ChatMessage.getSpeaker({actor}), rolls: [roll], content,
    sound: runtime.CONFIG?.sounds?.dice, flags: {'olegurps-qol': {socialSkillRoll: snapshot}}};
  applyMessageMode(runtime.ChatMessage, data, runtime.game);
  return runtime.ChatMessage.create(data);
}

export async function openSocialReaction(runtime = globalThis) {
  const controlled = runtime.canvas?.tokens?.controlled ?? [];
  if (controlled.length > 1) return runtime.ui.notifications.error('Выделите только своего персонажа.');
  const actor = controlled[0]?.actor ?? runtime.game.user.character;
  if (!actor?.isOwner) return runtime.ui.notifications.error('Выберите своего персонажа: нужны права владельца.');
  const skills = listSocialSkills(actor);
  if (!skills.length) return runtime.ui.notifications.warn('В чарнике нет доступных социальных навыков с числовым уровнем.');
  const content = `<div class="standard-form oq-social-form"><p>Персонаж: <strong>${escape(actor.name)}</strong></p>
    <div class="form-group"><label for="oq-social-skill">Навык из чарника</label><div class="form-fields"><select id="oq-social-skill" name="skillPath">${skills.map(skill => `<option value="${escape(skill.path)}">${escape(skill.name)} – ${skill.level}</option>`).join('')}</select></div></div>
    ${Object.entries(SOCIAL_MODIFIERS).map(([key, label]) => `<div class="form-group"><label for="oq-social-${key}">${label}</label><div class="form-fields"><input id="oq-social-${key}" type="number" name="${key}" value="0" step="1"></div></div>`).join('')}
    <div class="form-group"><label for="oq-social-note">Комментарий к поправкам</label><div class="form-fields"><input id="oq-social-note" type="text" name="note"></div></div>
    </div>`;
  const data = await runtime.foundry.applications.api.DialogV2.input({window: {title: 'Социальный навык'}, position: {width: 580}, content,
    ok: {label: 'Бросить 3к6', icon: 'fa-solid fa-dice'}, rejectClose: false, modal: false,
    render: (_event, dialog) => {
      installViewportBounds(dialog);
    }});
  if (!data) return;
  const values = data.object ?? data;
  try {return await rollSocialSkill({actor, skillPath: values.skillPath, expectedSkill: skills.find(skill => skill.path === values.skillPath),
    modifiers: values, note: values.note ?? ''}, runtime);}
  catch (error) {runtime.ui.notifications.error(error.message);}
}
