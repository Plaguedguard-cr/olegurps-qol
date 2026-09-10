import { buildTableNote } from "./table-reference.js";

export async function openFrightCheck() {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (!DialogV2) return ui.notifications.error("Этот инструмент требует DialogV2.");

  const escapeHTML = value => foundry?.utils?.escapeHTML ? foundry.utils.escapeHTML(String(value ?? "")) : String(value ?? "");
  const parseIntOr = (v, fallback=0) => { const t=String(v??"").trim().replace(",", "."); if(!t) return fallback; const n=Number(t); return Number.isInteger(n)?n:Number.NaN; };
  const bool = v => v===true || v==="true" || v==="on" || v===1 || v==="1";

  const TABLE = [
    [4,5,"4–5","Оглушение на 1 секунду; затем — автоматическое восстановление."],
    [6,7,"6–7","Оглушение на одну секунду. Затем каждый ход бросок немодифицированной Воли для восстановления."],
    [8,9,"8–9","Оглушение на одну секунду. Затем каждый ход бросок Воли с модификаторами, применёнными к данному броску Страха, для восстановления."],
    [10,10,"10","Оглушение на 1к секунд. Затем каждую секунду делается бросок Воли с модификаторами для восстановления."],
    [11,11,"11","Оглушение на 2к секунд. Затем каждую секунду делается бросок Воли с модификаторами для восстановления."],
    [12,12,"12","Спазмы желудка. Рвота в течение (25 − ЗД) секунд, затем — каждую секунду бросок против ЗД для восстановления."],
    [13,13,"13","Вы приобретаете новую ментальную причуду."],
    [14,15,"14–15","Вы теряете 1к ЕУ и оглушены на 1к секунд — как в пункте 10."],
    [16,16,"16","Вы оглушены на 1к секунд и приобретаете новую причуду."],
    [17,17,"17","Обморок на 1к минут, затем — бросок ЗД каждую минуту для восстановления."],
    [18,18,"18","Обморок, как выше, и бросок ЗД немедленно. При провале вы получаете 1 очко вреда, упав в обморок."],
    [19,19,"19","Серьёзный обморок на 2к минут. Бросок ЗД каждую минуту для восстановления. 1 ЕЖ вреда."],
    [20,20,"20","Обморок, граничащий с шоком — на 4к минут. Вы теряете 1к ЕУ."],
    [21,21,"21","Паника на 1к минут. Затем каждую минуту делается бросок немодифицированной Воли, чтобы отойти от эффекта."],
    [22,22,"22","Вы приобретаете Заблуждение на −10 очков."],
    [23,23,"23","Вы приобретаете Фобию на −10 очков или другой равноценный ментальный недостаток."],
    [24,24,"24","Заметный физический эффект на усмотрение Мастера; эквивалент −15 очков физических недостатков."],
    [25,25,"25","Связанный с событием ментальный недостаток ухудшает Самоконтроль на одну ступень; иначе новая фобия или другой недостаток на −10 очков."],
    [26,26,"26","Обморок на 1к минут, как в пункте 18, и новое Заблуждение на −10 очков."],
    [27,27,"27","Обморок на 1к минут, как в пункте 18, и новый ментальный недостаток на −10 очков."],
    [28,28,"28","Поверхностная кома. Бросок ЗД каждые 30 минут для восстановления. После пробуждения 6 часов все броски умений и атрибутов с −2."],
    [29,29,"29","Кома на 1к часов. Затем бросок ЗД; при провале кома продолжается ещё 1к часов и так далее."],
    [30,30,"30","Ступор на 1к дней; затем бросок ЗД. После пробуждения все броски умений и атрибутов с −2 столько дней, сколько длился ступор."],
    [31,31,"31","Судороги на 1к секунд, потеря 1к ЕУ. Бросок ЗД; при провале 1к повреждений, при критическом провале навсегда −1 ЕЖ."],
    [32,32,"32","Удар. Вы падаете, получая 2к повреждений из-за лёгкого сердечного приступа или инсульта."],
    [33,33,"33","Полная паника. Мастер определяет реакцию; затем броски Воли, пока страх не будет преодолён."],
    [34,34,"34","Вы приобретаете 15-очковое Заблуждение."],
    [35,35,"35","Вы приобретаете 15-очковую Фобию или другой ментальный недостаток на −15 очков."],
    [36,36,"36","Серьёзный физический эффект — как в пункте 24, но эквивалентен −20 очкам."],
    [37,37,"37","Серьёзный физический эффект — как в пункте 24, но эквивалентен −30 очкам."],
    [38,38,"38","Кома, как в пункте 29, и Заблуждение на −15 очков."],
    [39,39,"39","Кома, как в пункте 29, и Фобия или другой набор ментальных недостатков на −15 очков."],
    [40,Infinity,"40+","Как в пункте 39, но жертва также теряет 1 очко ИН навсегда; это снижает основанные на ИН умения и заклинания на 1."]
  ];
  const entryFor = total => total <= 5 ? TABLE[0] : (TABLE.find(e => total>=e[0] && total<=e[1]) ?? TABLE.at(-1));
  const tableNoteFor = entry => buildTableNote({entries:TABLE,entry,escapeHTML});
  const read = button => ({fearValue:button.form?.elements?.fearValue?.value??"", modifier:button.form?.elements?.modifier?.value??"", rule15:button.form?.elements?.rule15?.checked??false});

  const data = await DialogV2.wait({
    window:{title:"Проверка страха"}, position:{width:540},
    content:`<style>.oq-fr{font-size:.94em}.oq-fr-r{display:grid;grid-template-columns:1fr 150px;gap:10px 14px;align-items:center;padding:9px 2px;border-bottom:1px solid rgba(128,128,128,.28)}.oq-fr-r:first-child{border-top:1px solid rgba(128,128,128,.28)}.oq-fr-r input[type=number]{width:100%;margin:0}.oq-fr-rule{display:grid;grid-template-columns:1fr auto;align-items:center;padding:9px 2px;border-bottom:1px solid rgba(128,128,128,.28)}.oq-fr label,.oq-fr .lbl{font-weight:700}.oq-fr .hint{opacity:.78;font-size:.9em;margin:8px 2px 0}</style>
    <div class="standard-form oq-fr"><div class="oq-fr-r"><label>Значение проверки страха</label><input type="number" name="fearValue" value="" step="1" autofocus></div><div class="oq-fr-r"><label>Штрафы / бонусы</label><input type="number" name="modifier" value="" placeholder="+0" step="1"></div><label class="oq-fr-rule"><span class="lbl">Правило 15</span><input type="checkbox" name="rule15"></label><p class="hint">«Бросок по таблице» игнорирует первое поле и сразу бросает 3к6 с указанным модификатором.</p></div>`,
    buttons:[
      {action:"check",label:"Бросить",icon:"fa-solid fa-dice",default:true,callback:(_e,b)=>({mode:"check",...read(b)})},
      {action:"table",label:"Бросок по таблице",icon:"fa-solid fa-table-list",callback:(_e,b)=>({mode:"table",...read(b)})}
    ], rejectClose:false, modal:true
  });
  if(!data) return;
  const modifier=parseIntOr(data.modifier,0); if(!Number.isInteger(modifier)) return ui.notifications.error("Штрафы / бонусы должны быть целым числом.");
  const modText=modifier>=0?`+${modifier}`:String(modifier);
  const speaker=ChatMessage.getSpeaker();
  if(data.mode==="table"){
    const roll=await new Roll(`3d6${modifier>=0?"+":""}${modifier}`).evaluate(); const total=Number(roll.total); const e=entryFor(total);
    return ChatMessage.create({speaker,rolls:[roll],content:`<div style="font-size:.92em;line-height:1.35"><h3>Таблица страха</h3><div>Модификатор: <strong>${modText}</strong> · Итог: <strong>${total}</strong></div><div style="margin-top:8px;padding:8px 10px;border:1px solid rgba(128,128,128,.42);border-radius:6px"><strong>Результат ${escapeHTML(e[2])}</strong><div>${escapeHTML(e[3])}</div></div>${tableNoteFor(e)}</div>`});
  }
  const base=parseIntOr(data.fearValue,Number.NaN); if(!Number.isInteger(base)) return ui.notifications.error("Введите целое значение проверки страха.");
  const rule15=bool(data.rule15), limit=rule15?14:13, raw=base+modifier, target=Math.min(raw,limit);
  const check=await new Roll("3d6").evaluate(); const total=Number(check.total), success=total<=target;
  if(success) return ChatMessage.create({speaker,rolls:[check],content:`<div style="font-size:.92em"><h3>Проверка страха</h3><strong>Проверка пройдена</strong><br>3к6: ${total} против ${target}</div>`});
  const margin=Math.max(1,total-target); const tableRoll=await new Roll(`3d6 + ${margin}`).evaluate(); const tableTotal=Number(tableRoll.total), e=entryFor(tableTotal);
  return ChatMessage.create({speaker,rolls:[check,tableRoll],content:`<div style="font-size:.92em;line-height:1.35"><h3>Проверка страха</h3><div><strong>Провал на ${margin}</strong> · 3к6: ${total} против ${target}</div><div style="margin-top:8px">Бросок по таблице: <strong>3к6 + ${margin} = ${tableTotal}</strong></div><div style="margin-top:6px;padding:8px 10px;border:1px solid rgba(128,128,128,.42);border-radius:6px"><strong>Результат ${escapeHTML(e[2])}</strong><div>${escapeHTML(e[3])}</div></div>${tableNoteFor(e)}</div>`});
}
