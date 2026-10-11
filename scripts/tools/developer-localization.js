// Readable fallback while Foundry is still using cached package language metadata.
const fallback = {
  "ru": {
    "OleGURPS.Developer.Title": "Режим разработчика",
    "OleGURPS.Developer.Open": "Открыть режим разработчика",
    "OleGURPS.Developer.Hint": "Только GM. Подмена следующей подготовленной проверки 3d6 OleGURPS в текущей сессии. Урон и штатные броски GGA не затрагиваются.",
    "OleGURPS.Developer.Result": "Результат 3d6",
    "OleGURPS.Developer.Apply": "Применить к следующему броску",
    "OleGURPS.Developer.Pending": "Ожидающий результат",
    "OleGURPS.Developer.None": "Нет",
    "OleGURPS.Developer.Cancel": "Отменить подмену",
    "OleGURPS.Developer.TestRoll": "Тестовый бросок"
  }
};

export function developerText(name, runtime = globalThis) {
  const key = "OleGURPS.Developer." + name;
  const i18n = runtime.game?.i18n;
  const translated = String(i18n?.lang ?? "ru").startsWith("ru") ? i18n?.localize?.(key) : null;
  if (translated && translated !== key) return translated;
  return fallback.ru[key] ?? name;
}
