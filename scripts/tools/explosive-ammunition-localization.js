import { ammoEffectText } from "./gga-damage-compatibility.js";
export const explosiveMessages = {
  ru: {
    P4ConstructionMissing:"Конкретная конструкция заряда, патронник или источник не подтверждены; обычный патрон не становится взрывным.",
    P4PayloadMissing:"Нет полного опубликованного урона всех обязательных компонентов. Мощность взрыва и осколки не назначаются автоматически.",
    P4SourceConflict:"Профиль не совпадает с исходным режимом или подтверждёнными параметрами заряда.",
    P4TLRequired:"TL подтверждённой конструкции ниже минимума этого варианта High-Tech.",
    P4PlatformRequired:"Подтверждённая платформа не подходит для этой конструкции.",
    P4ArmorMissing:"Нужны точные DR и сведения о ламинированной или реактивной броне; отсутствие данных не означает отсутствие защиты.",
    P4DistanceMissing:"Нужна подтверждённая положительная дистанция от взрыва в ярдах.",
    P4ERARequired:"Реактивную броню и взаимодействие двух зарядов определяет GM; автоматического обхода защиты нет.",
    P4Components:"Компоненты взрывного заряда",P4Primary:"Основной заряд",P4Precursor:"Предварительный заряд",P4Linked:"Связанный взрыв",P4MainCharge:"Основной заряд второй ступени",
    P4Conditions:"Формулы готовы; условия попадания компонентов, броню и дополнительные эффекты проверяет GM в штатном Apply Damage.",
    P4LinkedFollowUp:"Linked — отдельный внешний взрыв со своим DR. Follow-Up применяется после основного попадания; внутренний взрыв допустим только после подтверждённого проникновения. Делитель основного заряда не переносится на взрыв или осколки. GM выбирает соответствующие условия в Apply Damage.",
    P4Fragmentation:"Кнопка осколков бросает урон одного осколочного попадания. Число попаданий, дистанцию и защиту определяет GM; осколочный Hit автоматически не выполняется.",
    P4SAPLEReliability:"SAPLE TL{tl}: перед подрывом GM выполняет 1d6; взрыв срабатывает при {threshold} или меньше. Выбор компонента не означает успешный подрыв.",
    P4HESH:"HESH: заброневое поражение — 10% максимального взрывного урона против DR/100 с округлением DR вверх; ламинированная броня исключает это действие. Нужны подтверждённые свойства брони; применение остаётся GM.",
    P4Tandem:"Ступени тандемного HEAT сохранены раздельно. Без реактивной брони их урон суммируется; при реактивной броне взаимодействие зарядов и защиту проверяет GM. Не применяйте оба заряда как независимые внутренние взрывы.",
    P4Thermobaric:"Термобарический взрыв: урон делится на 2 × расстояние в ярдах. Штатный Explosion GGA использует 3 × расстояние и не заменяется автоматически; GM должен применить правильный делитель. Контактная дистанция требует отдельного решения.",
    P4ht_le:"LE",P4ht_saple:"SAPLE",P4ht_apex:"APEX",P4ht_he:"HE",P4ht_saphe:"SAPHE",P4ht_saphec:"SAPHEC",P4ht_aphex:"APHEX",P4ht_efp:"EFP",P4ht_heat:"HEAT",P4ht_hedp:"HEDP",P4ht_hesh:"HESH",P4ht_ms_heat:"MS-HEAT",P4ht_thermobaric:"Термобарический",
    Effects: "Дополнительные эффекты", "unconfirmed-compatibility": "совместимость конструкции не подтверждена",
    Editor: "Пользовательский APEX / APHEX", Variant: "Конструкция", Name: "Название рецепта",
    ProjectileMass: "Масса снаряда, г", ExplosiveMass: "Масса ВВ, г", REF: "REF",
    FragmentMass: "Масса материала фрагментации, г", ReferenceMass: "Опорная масса, г", ReferenceDice: "Опорный урон, d6",
    ReferenceSource: "Источник калибровки", Source: "Источник параметров", SourceKind: "Происхождение значений",
    GM: "GM", Reference: "Справочник", Q: "Q", NeutralQ: "Q = 1 — нейтральное допущение домашней модели OleGURPS.",
    ModelNotice: "Модель осколков — домашняя модель OleGURPS, не официальная формула GURPS. Массы задаются явно; масса M406 146 г не является измеренной массой осколков.",
    Save: "Сохранить новый рецепт и разрешить для этого оружия", Approve: "Разрешить рецепт для этого оружия", Revoke: "Отменить разрешение GM",
    RevisionNotice: "Изменённые параметры сохраняются новым рецептом. Старые запасы, магазины и снимки выстрелов сохраняются.",
    ReferenceConfirmed: "Подтверждено справочником", GMApproved: "Пользовательское разрешение GM", Unknown: "Совместимость неизвестна", Incompatible: "Достоверно несовместимо",
    Resolved: "Расчёт полный", Unresolved: "Расчёт не завершён", Explosion: "Взрыв", Fragmentation: "Осколки",
    Incendiary: "APHEX: incendiary — условия воспламенения определяет GM; отдельный урон огнём не назначается.",
    ManualConditions: "GM определяет условия Follow-Up. В Apply Damage вручную выберите Explosion, внутренний взрыв и учёт DR; они не включаются автоматически.",
    FollowUp: "Follow-up", FollowUpHint: "GM подтверждает условия Follow-Up: одно гарантированное попадание, остальные — по обычному броску. Проникновение и внутренний взрыв автоматически не определяются.",
    Guaranteed: "Одно гарантированное осколочное попадание Follow-Up", Unavailable: "Компонент недоступен: {reason}",
    "projectile-mass-required": "нужна положительная масса снаряда",
    "parameter-source-required": "нужно указать источник параметров",
    "explosive-mass-and-ref-required": "нужны положительные масса ВВ и REF",
    "invalid-explosive-mass": "масса ВВ должна быть меньше массы снаряда",
    "apex-charge-must-be-less-than-five-percent": "для APEX масса ВВ должна быть строго меньше 5% массы снаряда",
    "fragment-calibration-required": "нужны масса материала, опорная масса, опорный урон, источник и положительный Q",
    "invalid-fragment-mass": "масса материала и ВВ превышает массу снаряда",
    "nonfinite-model-result": "расчёт не даёт конечного положительного результата",
    "unusual-model-parameters": "Необычно большие параметры или результат: проверьте единицы и калибровку.",
    ApprovalScopeRequired: "Нужны подтверждённое оружие, семейство и отдельная идентичность рецепта.",
    ApprovalCannotOverrideProhibition: "Разрешение GM не может обойти достоверный запрет.",
    InvalidRecipe: "Некорректная или уже существующая идентичность рецепта.",
    IncompleteShot: "Сначала завершите параметры и подтвердите рецепт GM; выстрел отменён."
  },
  en: {
    P4ConstructionMissing:"The exact load design, chamber or source is unconfirmed; an ordinary cartridge is not an explosive round.",
    P4PayloadMissing:"Complete published damage for the required components is missing. Blast and fragmentation yields are not invented.",
    P4SourceConflict:"The profile does not match the original mode or confirmed load data.",P4TLRequired:"The confirmed design's TL is below this High-Tech variant's minimum.",
    P4PlatformRequired:"The confirmed platform does not support this design.",P4ArmorMissing:"Exact DR and laminated or reactive armor data are required; missing data does not mean no protection.",
    P4DistanceMissing:"A confirmed positive distance from the blast in yards is required.",P4ERARequired:"The GM resolves reactive armor and stage interactions; armor is not bypassed automatically.",
    P4Components:"Explosive load components",P4Primary:"Primary charge",P4Precursor:"Precursor charge",P4Linked:"Linked blast",P4MainCharge:"Second-stage main charge",
    P4Conditions:"Formulas are ready; the GM verifies component hits, armor and additional effects in native Apply Damage.",
    P4LinkedFollowUp:"Linked is a separate external blast with its own DR. Follow-Up follows the carrier hit; an internal explosion requires confirmed penetration. The carrier divisor is not copied to blast or fragments. The GM selects the appropriate Apply Damage conditions.",
    P4Fragmentation:"The fragment button rolls damage for one fragment hit. The GM resolves hit count, distance and protection; no automatic fragment Hit is rolled.",
    P4SAPLEReliability:"SAPLE TL{tl}: the GM rolls 1d6 before detonation; explosion succeeds on {threshold} or less. Selecting a component does not prove detonation.",
    P4HESH:"HESH spall: 10% of maximum blast damage against DR/100, rounding DR up; laminated armor excludes it. Confirmed armor data is required; application remains with the GM.",
    P4Tandem:"Tandem HEAT stages remain separate. Damage is cumulative without reactive armor; the GM resolves stage interactions and protection with reactive armor. Do not treat both stages as independent internal explosions.",
    P4Thermobaric:"Thermobaric blast damage is divided by 2 x distance in yards. Native GGA Explosion uses 3 x distance and is not changed automatically; the GM must apply the correct divisor. Contact distance needs a separate ruling.",
    P4ht_le:"LE",P4ht_saple:"SAPLE",P4ht_apex:"APEX",P4ht_he:"HE",P4ht_saphe:"SAPHE",P4ht_saphec:"SAPHEC",P4ht_aphex:"APHEX",P4ht_efp:"EFP",P4ht_heat:"HEAT",P4ht_hedp:"HEDP",P4ht_hesh:"HESH",P4ht_ms_heat:"MS-HEAT",P4ht_thermobaric:"Thermobaric",
    Effects: "Additional effects", "unconfirmed-compatibility": "construction compatibility is not confirmed",
    Editor: "Custom APEX / APHEX", Variant: "Construction", Name: "Recipe name",
    ProjectileMass: "Projectile mass, g", ExplosiveMass: "Explosive mass, g", REF: "REF",
    FragmentMass: "Fragment material mass, g", ReferenceMass: "Reference mass, g", ReferenceDice: "Reference damage, d6",
    ReferenceSource: "Calibration source", Source: "Parameter source", SourceKind: "Value provenance",
    GM: "GM", Reference: "Reference", Q: "Q", NeutralQ: "Q = 1 is the neutral assumption of the OleGURPS house model.",
    ModelNotice: "Fragmentation uses the OleGURPS house model, not an official GURPS formula. Explicit masses are required; the 146 g M406 estimate is not measured fragment mass.",
    Save: "Save a new recipe and approve for this weapon", Approve: "Approve recipe for this weapon", Revoke: "Revoke GM approval",
    RevisionNotice: "Changed parameters become a new recipe. Existing stocks, magazines and shot snapshots are preserved.",
    ReferenceConfirmed: "Reference confirmed", GMApproved: "Custom GM approval", Unknown: "Compatibility unknown", Incompatible: "Confirmed incompatible",
    Resolved: "Calculation complete", Unresolved: "Calculation incomplete", Explosion: "Explosion", Fragmentation: "Fragments",
    Incendiary: "APHEX: incendiary — the GM determines ignition conditions; no separate fire damage is assigned.",
    ManualConditions: "The GM determines Follow-Up conditions. Select Explosion, internal explosion and DR handling manually in Apply Damage; these are not enabled automatically.",
    FollowUp: "Follow-up", FollowUpHint: "The GM confirms Follow-Up conditions: one guaranteed hit, others use the normal roll. Penetration and internal explosions are not determined automatically.",
    Guaranteed: "One guaranteed Follow-Up fragment hit", Unavailable: "Component unavailable: {reason}",
    "projectile-mass-required": "positive projectile mass is required",
    "parameter-source-required": "a parameter source is required",
    "explosive-mass-and-ref-required": "positive explosive mass and REF are required",
    "invalid-explosive-mass": "explosive mass must be less than projectile mass",
    "apex-charge-must-be-less-than-five-percent": "APEX explosive mass must be strictly below 5% of projectile mass",
    "fragment-calibration-required": "fragment mass, reference mass, reference damage, source and positive Q are required",
    "invalid-fragment-mass": "fragment material and explosive masses exceed projectile mass",
    "nonfinite-model-result": "calculation does not produce a finite positive result",
    "unusual-model-parameters": "Unusually large parameters or result: check units and calibration.",
    ApprovalScopeRequired: "A confirmed weapon, family and distinct recipe identity are required.",
    ApprovalCannotOverrideProhibition: "GM approval cannot bypass a confirmed prohibition.",
    InvalidRecipe: "Invalid or existing recipe identity.",
    IncompleteShot: "Complete the parameters and obtain GM approval before firing; shot cancelled."
  }
};
export function explosiveText(name, runtime = globalThis, language = runtime.game?.i18n?.lang ?? "ru", values = {}) {
  const lang = String(language).startsWith("ru") ? "ru" : "en", key = "OleGURPS.ExplosiveAmmo." + name;
  const loaded = runtime.game?.i18n?.lang === language ? runtime.game?.i18n?.localize?.(key) : null;
  let text = loaded && loaded !== key ? loaded : explosiveMessages[lang][name] ??
    ammoEffectText(name, {}, { game: { i18n: { lang } } });
  for (const [key, value] of Object.entries(values)) text = text.replaceAll("{" + key + "}", String(value));
  return text;
}
export async function loadExplosiveTranslations(runtime = globalThis) {
  const i18n = runtime.game?.i18n;
  if (!runtime.fetch || !runtime.location || !i18n) return;
  const key = "OleGURPS.ExplosiveAmmo.Editor";
  if (i18n.localize(key) !== key && i18n.localize("OleGURPS.ExplosiveAmmo.P4Components") !== "OleGURPS.ExplosiveAmmo.P4Components" &&
      i18n.localize("OleGURPS.ExplosiveAmmo.P4Precursor") !== "OleGURPS.ExplosiveAmmo.P4Precursor") return;
  const lang = String(i18n.lang).startsWith("ru") ? "ru" : "en";
  const response = await runtime.fetch("/modules/olegurps-qol/lang/" + lang + ".json");
  if (!response.ok) throw Error("ExplosiveTranslationsUnavailable");
  for (const [key,value] of Object.entries(await response.json())) if (key.startsWith("OleGURPS.ExplosiveAmmo."))
    runtime.foundry.utils.setProperty(i18n.translations,key,value);
}
