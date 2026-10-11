export const f2Messages = {
  ru: {
    rolekinetic: "Основной", rolelinked: "Linked", "rolefollow-up": "Follow-Up", "rolemain-charge": "Основной заряд", rolefragmentation: "Осколки",
    LinkedExtra: "Если опубликованный основной компонент уже является внешним взрывом, не добавляйте второй такой взрыв. Повторный Damage не означает новое поражение.",
    NameElements: "Многоснарядные попадания", NameAllocation: "Buck-and-Ball: распределение", NameLinked: "Linked: внешний компонент", NameInternal: "Follow-Up: проникновение", NameFragments: "Попадания осколков", NameTandem: "Тандем и ERA", NameSpall: "HESH: заброневое поражение", NameFalloff: "Thermobaric: ослабление", NameReliability: "SAPLE: надёжность взрывателя", NameFlight: "Self-Destruct: путь снаряда",
    Local: "Расчёт ведущего (только в этом клиенте)",
    LocalHint: "Ввод и результат не сохраняются в сообщении или снимке. После повторного отображения введите условия заново. Это вспомогательный расчёт; применение, цели, зоны и защита остаются ведущему.",
    Facts: "Сохранённые сведения: физических патронов — {physical}; выпущенных элементов — {elements}; фактических попаданий — {hits}.",
    Unknown: "не подтверждено", Components: "Сохранённые компоненты", Calculate: "Рассчитать", Clear: "Очистить",
    Result: "Результат по условиям ведущего: {result}. Автоматически не применён.",
    Missing: "Расчёт не подтверждён: нужны {fields}.",
    Elements: "Для каждого фактического попадания отдельно разрешите цель, зону, Damage и DR в GGA. Не умножайте урон на число элементов и не списывайте патрон за каждый элемент. Нового Hit не требуется. Резиновая дробь также может причинить тяжёлую травму.",
    Allocation: "Один физический Buck-and-Ball: первое фактическое попадание — шар, остальные — дробины. Для нескольких зарядов порядок распределения источником не установлен. Штатная D-кнопка остаётся уроном шара; дробины разрешает ведущий.",
    Linked: "Linked — отдельный внешний компонент с собственной защитой и условиями поражения. Используйте сохранённые штатные компоненты; опубликованный основной взрыв повторно не добавляйте. AD носителя на Linked не переносится.",
    Internal: "Внутренний Follow-Up требует подтверждённых попадания носителя и проникновения. При непробитии внутренний взрыв не подтверждён: разрешите исходное правило Follow-Up с защитой в GGA. Кнопка Damage и её повторное нажатие не подтверждают новый взрыв.",
    Fragments: "Damage осколка — урон одного попадания, а не Hit. Выберите конкретную цель, расстояние от центра, положение, SM и укрытие. Введите результат уже выполненного штатного 3d6 GGA; этот раздел не бросает кубики и не создаёт сообщений. Зоны и DR разрешите отдельно.",
    Tandem: "ERA отсутствует: допускается накопление стадий. ERA есть: разрешайте стадии последовательно. ERA неизвестно: итог не подтверждён. Не применяйте одновременно сумму и обе стадии; Linked остаётся отдельно.",
    Spall: "HESH: только при подтверждённом непробитии и неламинированной броне — 10% максимального взрывного урона против ceil(DR/100). Дробный результат предварительный: правило округления не подтверждено. Готового HESH в каталоге нет.",
    Falloff: "Thermobaric при r>0: floor(исходный Damage/(2×r)). Не делите повторно и не включайте GGA Explosion /3r для уже ослабленного значения. При r=0 или неизвестной дистанции нужен отдельный разбор. Результат здесь не применяется.",
    Reliability: "SAPLE TL5–6: используйте подтверждённый результат штатного 1d, срабатывание при результате ≤ TL−2. TL7+: этой проверки нет. Пока результат неизвестен, взрыв не утверждается; основной удар сохраняется. Повторный Damage не требует нового 1d.",
    Flight: "Self-Destruct: нужны конкретный взрыватель, подтверждённая дистанция самоподрыва и фактический путь. ½D не заменяет эти данные. Достижение дистанции не создаёт дополнительного взрыва или расхода.",
    distance: "Расстояние от центра, ярды", target: "Конкретная цель (ввод ведущего)", sm: "SM цели", posture: "Положение цели", cover: "Подтверждённый штраф укрытия", total: "Подтверждённый результат 3d6 GGA",
    standing: "Стоя", crouching: "Пригнувшись", kneeling: "На коленях", crawling: "Ползком", sitting: "Сидя", lying: "Лёжа",
    carrierHit: "Попадание носителя подтверждено", penetration: "Пробитие подтверждено", guaranteed: "Допустимый Follow-Up для этой цели подтверждён",
    era: "Реактивная броня ERA", precursor: "Исходный урон предварительного заряда", main: "Исходный урон основного заряда", rawConfirmed: "Это исходные результаты нужных компонентов GGA, до ослабления",
    nonpenetration: "Непробитие подтверждено", laminated: "Ламинированная броня", dr: "Исходный DR", damage: "Исходный результат Damage этого компонента", tl: "Подтверждённый TL SAPLE", die: "Подтверждённый результат 1d GGA", path: "Фактический путь снаряда, ярды",
    yes: "Да", no: "Нет", AllocationResult: "шар: {ball}; дробины: {pellets}; урон дробины: {formula}",
    HitResult: "попаданий: {hits}; эффективный навык осколков: {skill}; опасный радиус: {radius} ярд.",
    InternalReady: "условия внутреннего Follow-Up подтверждены ведущим; проверьте взрыватель и разрешите компонент в GGA",
    ExternalOnly: "внутренний взрыв не подтверждён; исходное правило Follow-Up и защита остаются ведущему",
    ERAStages: "ERA: сначала {precursor}, затем {main}; защита и результат остаются ведущему",
    TandemResult: "накопленный урон {damage}, AD(10); Linked отдельно; сумму и стадии одновременно не применять",
    SpallResult: "предварительный урон {damage} против DR {dr}; округление дробного урона решает ведущий",
    Laminated: "заброневое поражение HESH исключено для ламинированной брони",
    DamageResult: "вспомогательный урон {damage}, делитель {divisor}; защита и применение остаются ведущему",
    FuzeResult: "1d={die}, порог ≤{threshold}: {state}; основной удар сохраняется", triggered: "срабатывание подтверждено ведущим", failed: "взрыватель не сработал", NoFuzeRoll: "TL7+: дополнительная проверка надёжности не нужна; проникновение разрешается отдельно",
    FlightResult: "дистанция взрывателя {distance} ярд.: {state}; это сравнение, не применение взрыва", reached: "путь достиг дистанции", unreached: "путь не достиг дистанции"
  },
  en: {
    rolekinetic: "Primary", rolelinked: "Linked", "rolefollow-up": "Follow-Up", "rolemain-charge": "Main charge", rolefragmentation: "Fragments",
    LinkedExtra: "If the published primary component is already the external blast, do not add another copy. Repeated Damage is not a new hit.",
    NameElements: "Multiple-projectile hits", NameAllocation: "Buck-and-Ball allocation", NameLinked: "Linked external component", NameInternal: "Follow-Up penetration", NameFragments: "Fragment hits", NameTandem: "Tandem and ERA", NameSpall: "HESH spall", NameFalloff: "Thermobaric falloff", NameReliability: "SAPLE fuze reliability", NameFlight: "Self-Destruct flight",
    Local: "GM calculation (this client only)", LocalHint: "Inputs and results are not saved in the message or snapshot. Re-enter them after rendering. This is an aid; application, targets, locations and defenses remain GM decisions.",
    Facts: "Saved facts: physical cartridges — {physical}; fired elements — {elements}; actual hits — {hits}.", Unknown: "unconfirmed", Components: "Saved components", Calculate: "Calculate", Clear: "Clear",
    Result: "Result from GM conditions: {result}. Not applied automatically.", Missing: "Calculation unconfirmed: requires {fields}.",
    Elements: "Resolve each actual hit with its own target, location, Damage and DR in GGA. Do not multiply damage by element count or spend a cartridge per element. Do not repeat Hit. Rubber shot can also cause serious injury.",
    Allocation: "One physical Buck-and-Ball charge: first actual hit is the ball, later hits are pellets. The source does not establish allocation across multiple charges. Native D remains ball damage; the GM resolves pellets.",
    Linked: "Linked is a separate external component with its own defenses and hit conditions. Use saved native components; do not duplicate a published primary blast. Do not transfer carrier AD to Linked.",
    Internal: "Internal Follow-Up requires confirmed carrier hit and penetration. Without penetration, an internal explosion is unconfirmed: resolve the original Follow-Up rule and defenses in GGA. Damage and repeated clicks do not confirm another explosion.",
    Fragments: "Fragment Damage is one hit's damage, not Hit. Select a target, distance from center, posture, SM and cover. Enter an already completed native GGA 3d6 result; this section does not roll or create messages. Resolve locations and DR separately.",
    Tandem: "No ERA: stages can accumulate. With ERA: resolve stages in order. Unknown ERA: no confirmed total. Do not apply both the sum and the stages; Linked remains separate.",
    Spall: "HESH requires confirmed nonpenetration and nonlaminated armor: 10% of maximum blast damage against ceil(DR/100). Fractional damage is provisional: rounding is unconfirmed. There is no ready HESH charge in the catalog.",
    Falloff: "Thermobaric at r>0: floor(original Damage/(2×r)). Do not reduce twice or apply GGA Explosion /3r to the reduced value. Contact r=0 and unknown distances require separate adjudication. This result is not applied.",
    Reliability: "SAPLE TL5–6: use a confirmed native 1d result, functioning on ≤ TL−2. TL7+ has no such check. Unknown results do not confirm an explosion; preserve the carrier strike. Repeated Damage does not require another 1d.",
    Flight: "Self-Destruct requires a specific fuse, sourced destruct distance and actual path. Do not substitute ½D. Reaching the distance creates no extra explosion or resource expense.",
    distance: "Distance from center, yards", target: "Specific target (GM input)", sm: "Target SM", posture: "Target posture", cover: "Confirmed cover penalty", total: "Confirmed GGA 3d6 total",
    standing: "Standing", crouching: "Crouching", kneeling: "Kneeling", crawling: "Crawling", sitting: "Sitting", lying: "Lying",
    carrierHit: "Carrier hit confirmed", penetration: "Penetration confirmed", guaranteed: "Eligible Follow-Up confirmed for this target", era: "Reactive armor ERA", precursor: "Original precursor damage", main: "Original main-charge damage", rawConfirmed: "Original results of the correct GGA components, before reduction",
    nonpenetration: "Nonpenetration confirmed", laminated: "Laminated armor", dr: "Original DR", damage: "Original Damage result for this component", tl: "Confirmed SAPLE TL", die: "Confirmed GGA 1d total", path: "Actual projectile path, yards",
    yes: "Yes", no: "No", AllocationResult: "ball: {ball}; pellets: {pellets}; pellet damage: {formula}", HitResult: "hits: {hits}; effective fragment skill: {skill}; danger radius: {radius} yards",
    InternalReady: "GM confirmed internal Follow-Up conditions; check the fuse and resolve the component in GGA", ExternalOnly: "internal blast unconfirmed; original Follow-Up rule and defenses remain GM decisions",
    ERAStages: "ERA: first {precursor}, then {main}; defenses and outcome remain GM decisions", TandemResult: "cumulative damage {damage}, AD(10); Linked separate; do not also apply the stages",
    SpallResult: "provisional damage {damage} against DR {dr}; fractional rounding remains a GM decision", Laminated: "HESH spall excluded by laminated armor", DamageResult: "auxiliary damage {damage}, divisor {divisor}; defenses and application remain GM decisions",
    FuzeResult: "1d={die}, threshold ≤{threshold}: {state}; carrier strike preserved", triggered: "functioning confirmed by GM", failed: "fuze failed", NoFuzeRoll: "TL7+: no additional reliability check; resolve penetration separately",
    FlightResult: "fuze distance {distance} yards: {state}; comparison only, not blast application", reached: "path reached distance", unreached: "path did not reach distance"
  }
};
export function f2Text(key, runtime = globalThis, values = {}) {
  const language = String(runtime.game?.i18n?.lang ?? "ru").startsWith("ru") ? "ru" : "en";
  const full = "OleGURPS.AutomaticAmmo.F2" + key;
  const localized = runtime.game?.i18n?.localize?.(full);
  let text = localized && localized !== full ? localized : f2Messages[language][key] ?? key;
  for (const [name, value] of Object.entries(values)) text = text.replaceAll("{" + name + "}", String(value));
  return text;
}
