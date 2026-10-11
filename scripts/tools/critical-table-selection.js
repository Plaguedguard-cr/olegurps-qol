const choices = [
  { key: "hit", icon: "fa-bullseye", ru: "Критические попадания", en: "Critical hits" },
  { key: "head", icon: "fa-head-side", ru: "Критические попадания в голову", en: "Critical head hits" },
  { key: "miss", icon: "fa-xmark", ru: "Критические промахи", en: "Critical misses" },
  { key: "unarmed", icon: "fa-swords", ru: "Критические провалы в ближнем бою", en: "Critical melee combat failures" }
];

export function criticalTableSelectionHTML(escapeHTML, runtime = globalThis) {
  const language = String(runtime.game?.i18n?.lang ?? "ru").startsWith("ru") ? "ru" : "en";
  const buttons = choices.map((choice, index) => {
    const key = "OleGURPS.Critical." + choice.key;
    const translated = runtime.game?.i18n?.localize?.(key);
    const label = translated && translated !== key ? translated : choice[language];
    return `<label class="oq-crit-choice" title="${escapeHTML(label)}"><input type="radio" name="table" value="${choice.key}" ${index === 0 ? "checked autofocus" : ""}><i class="fa-solid ${choice.icon}" aria-hidden="true"></i><span>${escapeHTML(label)}</span></label>`;
  }).join("");
  const tableKey = "OleGURPS.Critical.Table", translatedTable = runtime.game?.i18n?.localize?.(tableKey);
  const tableLabel = translatedTable && translatedTable !== tableKey ? translatedTable : language === "ru" ? "Таблица" : "Table";
  return `<div class="standard-form oq-crit"><fieldset class="oq-crit-row"><legend>${escapeHTML(tableLabel)}</legend><div class="oq-crit-grid">${buttons}</div></fieldset></div>`;
}
