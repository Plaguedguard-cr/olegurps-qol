import { FALL_PRESETS, ANGLES, COLLISION_MODES } from './fall-collision-rules.js';
const fmt = n => Number.isFinite(n) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(n) : 'не ограничена';
const dice = v => v.replace('d', 'к').replace('-', '−');
const damage = d => `${dice(d.dice)} дробящего`;
const row = (label, value) => `<tr><th style="text-align:left;padding:3px 5px">${label}</th><td style="padding:3px 5px">${value}</td></tr>`;

export function fallCollisionMessage(r) {
  const rows = [], brief = [], special = [];
  let title;
  if (r.kind === 'fall') {
    title = `Падение с ${fmt(r.height)} ярдов`;
    rows.push(['Исходная высота', `${fmt(r.height)} ярдов`], ['Эффективная высота', `${fmt(r.effectiveHeight)} ярдов`],
      ['Гравитация / давление', `${fmt(r.gravity)}G / ${fmt(r.pressure)} атм.`],
      ['Положение тела / форма', r.fallType === 'custom' ? 'Своё значение' : FALL_PRESETS[r.fallType].label],
      ['Земная конечная скорость', `${fmt(r.terminalEarth)} ярдов/с`],
      ['Свободное падение (B431)', `округление √(21.4 × ${fmt(r.gravity)} × ${fmt(r.effectiveHeight)}) = ${fmt(r.freeSpeed)} ярдов/с`],
      ['Местная конечная скорость', r.pressure === 0 ? 'Вакуум – не ограничена' : `${fmt(r.terminalEarth)} × √${fmt(r.gravity)} / √${fmt(r.pressure)} = ${fmt(r.terminalSpeed)} ярдов/с`],
      ['Ограничение конечной скоростью', r.limited ? 'Применено после округления скорости свободного падения' : 'Не достигнута'],
      ['Скорость столкновения', `${fmt(r.speed)} ярдов/с`]);
    if (r.acrobatics) special.push('Успешная акробатика: −5 ярдов');
  } else {
    title = `Столкновение – ${COLLISION_MODES[r.kind]}${r.angle ? ': ' + ANGLES[r.angle] : ''}`;
    brief.push(`Скорость столкновения: ${fmt(r.speed)} ярдов/с.`);
  }
  if (r.kind === 'fall' || r.kind === 'obstacle') {
    brief.push(`${r.kind === 'fall' ? 'Урон' : 'Объекту и препятствию'}: <strong>${damage(r.damage)}</strong>.`);
    rows.push(['HP движущегося объекта', fmt(r.hp)], ['Поверхность', r.hardSurface ? 'Твёрдая – HP × 2' : 'Мягкая – обычные HP'],
      ['HP для расчёта', fmt(r.effectiveHp)], ['Кубики (B430–431)', `${fmt(r.effectiveHp)} × ${fmt(r.speed)} / 100 = ${fmt(r.damage.rawDice)}к → ${dice(r.damage.dice)}`]);
    if (r.cap !== null) {
      special.push(`Разрушаемая преграда: не более ${fmt(r.cap)} повреждений в обе стороны`);
      rows.push(['Предел HP + DR (B431)', `${fmt(r.barrierHp)} + ${fmt(r.barrierDr)} = ${fmt(r.cap)}. К выпавшим повреждениям объекта и преграды применить min(результат, ${fmt(r.cap)}); это предел в пунктах, а не кубиках.`]);
    }
  } else {
    brief.push(`A → B: <strong>${damage(r.toB)}</strong>; B → A: <strong>${damage(r.toA)}</strong>.`);
    rows.push(['Характер столкновения', ANGLES[r.angle]], ['HP A / HP B', `${fmt(r.hpA)} / ${fmt(r.hpB)}`],
      ['Скорость A / скорость B', `${fmt(r.speedA)} / ${fmt(r.speedB)} ярдов/с`],
      ['Скорость столкновения (B432)', `${r.angle === 'headOn' ? 'vA + vB' : r.angle === 'rearEnd' ? 'max(0, vA − vB)' : 'vA'} = ${fmt(r.speed)} ярдов/с`],
      ['A → B до ограничения', `${fmt(r.hpA)} × ${fmt(r.speed)} / 100 = ${fmt(r.originalA.rawDice)}к`],
      ['B → A до ограничения', `${fmt(r.hpB)} × ${fmt(r.speed)} / 100 = ${fmt(r.originalB.rawDice)}к`],
      ['Ограничения B432', r.limits.length ? r.limits.map(side => `${side}: кубики ограничены уроном другого участника (${r.angle === 'headOn' ? 'более медленный участник' : 'ответный урон цели B'})`).join('; ') : 'Дополнительное ограничение кубиков не потребовалось'],
      ['После ограничения и округления', `A → B: ${fmt(r.toB.rawDice)}к → ${dice(r.toB.dice)}; B → A: ${fmt(r.toA.rawDice)}к → ${dice(r.toA.dice)}`]);
    if (r.overrun) {
      const o = r.overrun;
      brief.push(o.dice ? `Дополнительно A → B (Overrun): <strong>${dice(o.dice)} дробящего</strong>.` : 'Дополнительный урон Overrun не рассчитан.');
      brief.push(o.reason);
      rows.push(['SM A / SM B', `${o.smA} / ${o.smB}`], ['Overrun (B432; B9; B16)', `⌊${fmt(o.basis)} ${o.source} / 2⌋ = ST ${fmt(o.effectiveST)}${o.dice ? `; thrust = ${dice(o.dice)}` : ''}. ${o.reason}`]);
    }
  }
  return `<div class="olegurps-fall-collision" style="font-size:.88em;line-height:1.3"><h3>Падения и столкновения</h3><p><strong>${title}</strong></p>
    ${brief.map(p => `<p>${p}</p>`).join('')}${special.map(p => `<p>${p}.</p>`).join('')}
    <details class="olegurps-chat-details olegurps-falling-calculation"><summary>Расчёт</summary><table style="width:100%;border-collapse:collapse"><tbody>${rows.map(([a, b]) => row(a, b)).join('')}</tbody></table></details></div>`;
}
