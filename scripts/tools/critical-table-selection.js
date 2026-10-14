import { moduleText } from "../localization.js";
const choices = [
  { key: "hit", icon: "fa-bullseye", ru: "Критические попадания", en: "Critical hits" },
  { key: "head", icon: "fa-head-side", ru: "Критические попадания в голову", en: "Critical head hits" },
  { key: "miss", icon: "fa-xmark", ru: "Критические промахи", en: "Critical misses" },
  { key: "unarmed", icon: "fa-swords", ru: "Критические провалы в ближнем бою", en: "Critical melee combat failures" }
];

export function criticalTableSelectionHTML(escapeHTML, runtime = globalThis) {
  const buttons = choices.map((choice, index) => {
    const key = "OleGURPS.Critical." + choice.key;
    const label = moduleText(key, {}, choice.ru);
    return `<label class="oq-crit-choice" title="${escapeHTML(label)}"><input type="radio" name="table" value="${choice.key}" ${index === 0 ? "checked autofocus" : ""}><i class="fa-solid ${choice.icon}" aria-hidden="true"></i><span>${escapeHTML(label)}</span></label>`;
  }).join("");
  const tableLabel = moduleText("OleGURPS.Critical.Table", {}, "Таблица");
  return `<div class="standard-form oq-crit"><fieldset class="oq-crit-row"><legend>${escapeHTML(tableLabel)}</legend><div class="oq-crit-grid">${buttons}</div></fieldset></div>`;
}
