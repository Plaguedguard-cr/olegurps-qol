import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openCriticalTables } from "../scripts/tools/critical.js";
import { criticalTableSelectionHTML } from "../scripts/tools/critical-table-selection.js";

const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const locales = Object.fromEntries(["ru", "en"].map(language => [language,
  JSON.parse(readFileSync(new URL(`../lang/${language}.json`, import.meta.url), "utf8"))]));
const styles = readFileSync(new URL("../styles/olegurps-qol.css", import.meta.url), "utf8");
for (const language of ["ru", "en"]) test(`${language} provides exactly four exclusive choices with unchanged table values`, () => {
  const runtime = { game: { i18n: { lang: language, localize: key => locales[language][key] ?? key } } };
  const html = criticalTableSelectionHTML(escapeHTML, runtime);
  assert.deepEqual([...html.matchAll(/type="radio" name="table" value="([^"]+)"/g)].map(m => m[1]), ["hit", "head", "miss", "unarmed"]);
  assert.doesNotMatch(html, /<select|onclick/);
  assert.equal([...html.matchAll(/\bchecked\b/g)].length,1);
  assert.match(html, /value="hit" checked autofocus/);
  for (const key of ["hit", "head", "miss", "unarmed"]) {
    const label=locales.ru["OleGURPS.Critical." + key];
    assert.ok(html.includes(`title="${escapeHTML(label)}"`));
    assert.ok(html.includes(`<span>${escapeHTML(label)}</span>`));
  }
  assert.ok(html.includes(`<legend>${locales.ru["OleGURPS.Critical.Table"]}</legend>`));
  assert.match(styles, /\.oq-crit-grid[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.oq-crit[^}]*:has\(input:checked\)/);
  assert.match(styles, /\.oq-crit-choice span[^}]*white-space: normal/);
});

function runtime() {
  const messages = [], errors = [];
  let dialogOptions, finish, rolls = 0;
  globalThis.foundry = { utils: { escapeHTML }, applications: { api: { DialogV2: {
    input: options => { dialogOptions = options; return new Promise(resolve => { finish = resolve; }); }
  } } } };
  globalThis.ui = { notifications: { error: message => errors.push(message) } };
  globalThis.game = { i18n: { lang: "ru", localize: key => locales.ru[key] ?? key } };
  globalThis.Roll = class {
    constructor(formula) { assert.equal(formula, "3d6"); }
    async evaluate() { rolls++; this.total = 10; return this; }
  };
  globalThis.ChatMessage = { getSpeaker: () => ({ alias: "original speaker" }), create: async message => messages.push(message) };
  return { messages, errors, finish: data => finish(data), get rolls() { return rolls; }, get options() { return dialogOptions; } };
}
for (const [key, result] of [
  ["hit", "Только обычный вред."], ["head", "Только обычный вред от удара по голове."],
  ["miss", "Вы роняете оружие; дешёвое оружие может сломаться."],
  ["unarmed", "Вы теряете равновесие: ничего больше не делаете до следующего хода, активные защиты получают -2."]
]) test(`${key} rolls only after confirmation and posts the original table result`, async () => {
  const rt = runtime(), pending = openCriticalTables();
  assert.equal(rt.rolls, 0); assert.equal(rt.messages.length, 0);
  assert.equal(rt.options.ok.label, "Бросить"); assert.equal(rt.options.modal, true);
  rt.finish({ object: { table: key } }); await pending;
  assert.equal(rt.rolls, 1); assert.equal(rt.messages.length, 1); assert.deepEqual(rt.errors, []);
  const originalName=key==="unarmed" ? "Критические провалы в рукопашном бою" : locales.ru["OleGURPS.Critical." + key];
  assert.ok(rt.messages[0].content.includes(originalName));
  assert.ok(rt.messages[0].content.includes(result));
  assert.equal(rt.messages[0].rolls[0].total, 10);
  assert.deepEqual(rt.messages[0].speaker, { alias: "original speaker" });
});
test("cancel and missing selection preserve the existing no-roll behavior", async () => {
  for (const data of [null, { object: {} }]) {
    const rt = runtime(), pending = openCriticalTables(); rt.finish(data); await pending;
    assert.equal(rt.rolls, 0); assert.equal(rt.messages.length, 0);
    assert.equal(rt.errors.length, data ? 1 : 0);
  }
});
