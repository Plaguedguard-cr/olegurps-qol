const warned = new WeakSet();
const translationLoads = new Map();
export async function loadAmmoEffectTranslations(runtime = globalThis) {
  if (!runtime.location || !runtime.fetch || !runtime.game?.i18n) return;
  const i18n = runtime.game.i18n, key = "OleGURPS.AmmoEffects.native-range-components-missing";
  const duKey = "OleGURPS.AmmoEffects.DUConfirmationRequired";
  if (i18n.localize(key) !== key && i18n.localize(duKey) !== duKey && i18n.localize("OleGURPS.AmmoEffects.MultishotEvidenceRequired") !== "OleGURPS.AmmoEffects.MultishotEvidenceRequired") return;
  const language = String(i18n.lang ?? "ru").startsWith("ru") ? "ru" : "en";
  if (!translationLoads.has(language)) translationLoads.set(language, (async () => {
    const response = await runtime.fetch("/modules/olegurps-qol/lang/" + language + ".json");
    if (!response.ok) throw Error("AmmoEffectsTranslationsUnavailable");
    return response.json();
  })());
  try {
    const entries = await translationLoads.get(language);
    for (const [name, value] of Object.entries(entries)) if (name.startsWith("OleGURPS.AmmoEffects.") || name.startsWith("OleGURPS.Ammo.Construction"))
      runtime.foundry.utils.setProperty(i18n.translations, name, value);
  } catch (error) { translationLoads.delete(language); throw error; }
}
export const ammoEffectMessages = {
  ru: {
    "MultishotEvidenceRequired": "Нужен источник или отдельное подтверждение GM для конкретного заряда, патронника и конструкции.",
    "MultishotSourceConflict": "Данные заряда противоречат подтверждённому источнику или сохранённому рецепту.",
    "MultishotPlatformRequired": "Платформа и механизм оружия не подходят для этой конструкции.",
    "MultishotTLRequired": "Для многопульного заряда автоматической винтовки или пулемёта требуется TL7+.",
    "MultishotElementsRequired": "Подтвердите число и размер элементов именно этого заряда; данные другой дроби не используются.",
    "MultishotPublishedRequired": "Нужны опубликованные характеристики конкретного заряда и дистанция срабатывания. Универсального профиля нет.",
    "MultishotPhysicalRoFRequired": "Не подтверждено число физических выстрелов исходного режима.",
    "MultishotSlugRclRequired": "Для одиночной пули нужен подтверждённый Rcl; дробовой Rcl 1 не назначается автоматически.",
    "MultishotBaselineRequired": "Нужен правильный исходный профиль: дробь для перевода в slug, одиночная пуля для многопульного или дробового заряда.",
    DUConfirmationRequired: "конкретная DU-конструкция, платформа или доступность TL8+ не подтверждены",
    "plus-p-individual-dart-required": "APS +P: требуется индивидуальное подтверждение GM конструкции, изготовления и безопасности усиленной Underwater Dart.",
    "plus-p-individual-handload-required": "KPV +P: требуется индивидуальное решение GM об изготовлении и безопасности усиленного APHCI-T заряда.",
    "unsupported-construction": "конструкция боеприпаса не поддерживается",
    "already-applied-use-original-profile": "эффект уже применён; требуется исходный профиль",
    "numeric-caliber-unresolved": "точный калибр не подтверждён",
    "native-range-unresolved": "исходная дальность не подтверждена",
    "native-range-components-missing": "исходная атака GGA не содержит обеих дальностей (½D/Max); исправьте Range самой атаки — каталог её не подменяет",
    "native-accuracy-unresolved": "исходная Acc не подтверждена",
    "native-scope-unresolved": "бонус прицела не подтверждён",
    "subsonic-original-speed-or-cartridge-class-unresolved": "исходная скорость или класс патрона не подтверждены",
    "native-required-strength-unresolved": "требуемый ST оружия не подтверждён",
    "plus-p-loading-check-required": "для powder-and-shot GM должен подтвердить успешную проверку Armoury (Small Arms) или IQ-based Guns−2 перед снаряжением",
    ContractChanged: "контракт изменён после инициализации",
    AdapterUnavailable: "OleGURPS: патронные эффекты отключены — несовместимые точки GGA: {points}. Штатные броски GGA доступны.",
    Unresolved: "OleGURPS: патронный эффект не применён полностью ({reason}); используется штатный Damage GGA.",
    "published-explosion-and-fragmentation-missing": "неизвестны опубликованный урон взрыва и осколков",
    "native-follow-up-adapter-unavailable": "нет безопасной передачи условного Follow-Up в штатный Damage",
    "native-armor-divisor-needs-explicit-provenance": "исходный бронеделитель уже задан; происхождение эффекта не подтверждено",
    "HP-conditional-rule-requires-native-support": "условия раскрытия или Malf требуют отдельной поддержки GGA",
    "unconfirmed-compatibility": "совместимость конструкции не подтверждена",
    "unsupported-or-compound-native-damage": "сложная исходная формула требует отдельной поддержки",
    "native-components-or-effects-already-present": "исходные составляющие или патронные эффекты уже присутствуют",
    "snapshot-damage-unavailable": "в старом снимке нет формулы урона",
    "native-parser-contract-changed": "изменён контракт парсера Damage GGA"
  },
  en: {
    "MultishotEvidenceRequired": "A source or individual GM confirmation is required for this specific load, chamber and design.",
    "MultishotSourceConflict": "Load data conflicts with the verified source or stored recipe.",
    "MultishotPlatformRequired": "The weapon platform or action does not support this design.",
    "MultishotTLRequired": "Automatic rifle and machine gun multi-ball loads require TL7+.",
    "MultishotElementsRequired": "Verify the element count and size for this specific load; other shot data is not reused.",
    "MultishotPublishedRequired": "Published weapon-specific load data and burst distance are required; there is no universal profile.",
    "MultishotPhysicalRoFRequired": "The source mode's physical rate of fire is unresolved.",
    "MultishotSlugRclRequired": "A confirmed slug Rcl is required; shot Rcl 1 is not assigned automatically.",
    "MultishotBaselineRequired": "Use the correct baseline: shot for slug conversion, or a single projectile for multi-ball or shot conversion.",
    DUConfirmationRequired: "the specific DU design, platform or TL8+ availability is unconfirmed",
    "plus-p-individual-dart-required": "APS +P requires individual GM confirmation of construction, manufacturing and safety of the extra-powerful Underwater Dart.",
    "plus-p-individual-handload-required": "KPV +P requires an individual GM decision on manufacturing and safety of the extra-powerful APHCI-T charge.",
    "unsupported-construction": "ammunition construction is not supported",
    "already-applied-use-original-profile": "effect already applied; the original profile is required",
    "numeric-caliber-unresolved": "exact caliber is not confirmed",
    "native-range-unresolved": "source range is not confirmed",
    "native-range-components-missing": "the source GGA attack lacks both ranges (½D/Max); correct Range in the attack itself — the catalog does not replace it",
    "native-accuracy-unresolved": "source Acc is not confirmed",
    "native-scope-unresolved": "scope bonus is not confirmed",
    "subsonic-original-speed-or-cartridge-class-unresolved": "original velocity or cartridge class is unconfirmed",
    "native-required-strength-unresolved": "weapon minimum ST is unconfirmed",
    "plus-p-loading-check-required": "for powder-and-shot the GM must confirm a successful Armoury (Small Arms) or IQ-based Guns−2 check before loading",
    ContractChanged: "contract changed after initialization",
    AdapterUnavailable: "OleGURPS: ammunition effects disabled — incompatible GGA integration points: {points}. Native GGA rolls remain available.",
    Unresolved: "OleGURPS: ammunition effects could not be applied completely ({reason}); using native GGA Damage.",
    "published-explosion-and-fragmentation-missing": "published explosion and fragmentation damage are unknown",
    "native-follow-up-adapter-unavailable": "conditional Follow-Up cannot be safely transferred to native Damage",
    "native-armor-divisor-needs-explicit-provenance": "the source already has an armor divisor without confirmed effect provenance",
    "HP-conditional-rule-requires-native-support": "expansion or Malf conditions require native support",
    "unconfirmed-compatibility": "construction compatibility is not confirmed",
    "unsupported-or-compound-native-damage": "compound source formula requires separate support",
    "native-components-or-effects-already-present": "native components or ammunition effects already exist",
    "snapshot-damage-unavailable": "the older snapshot has no damage formula",
    "native-parser-contract-changed": "the native Damage parser contract has changed"
  }
};
export function ammoEffectText(name, values = {}, runtime = globalThis) {
  const key = "OleGURPS.AmmoEffects." + name, i18n = runtime.game?.i18n;
  const localized = i18n?.localize?.(key), language = String(i18n?.lang ?? "ru").startsWith("ru") ? "ru" : "en";
  let text = localized && localized !== key ? localized : ammoEffectMessages[language][name] ?? name;
  for (const [key, value] of Object.entries(values)) text = text.replaceAll("{" + key + "}", String(value));
  return text;
}

/** Pure contract probes. Parsing literals is safe; never execute a Roll/attack during startup. */
export function diagnoseGgaDamageAdapters(runtime = globalThis) {
  const g = runtime.GURPS, p = g?.DamageChat?.prototype, problems = [];
  const check = (name, fn, minimum) => { if (typeof fn !== "function" || fn.length < minimum) problems.push(name); };
  check("GURPS.performAction(action, actor, event)", g?.performAction, 2);
  check("GURPS.resolveDamageRoll(event, actor, otf)", g?.resolveDamageRoll, 3);
  check("DamageChat.create(actor, dice, type, event)", g?.DamageChat?.create, 4);
  check("DamageChat._createChatMessage(actor, dice, mods, payload, event)", p?._createChatMessage, 5);
  check("DamageChat._getDiceData(dice, type, mods)", p?._getDiceData, 3);
  const create = runtime.ChatMessage?.create;
  // Foundry14 has create(data={}, operation={}), hence Function.length is legitimately zero.
  if (typeof create !== "function" || (create.length < 1 && !/create\s*\(\s*data\s*=/.test(Function.prototype.toString.call(create))))
    problems.push("ChatMessage.create(data)");
  check("ChatMessage.getSpeakerActor(speaker)", runtime.ChatMessage?.getSpeakerActor, 1);
  check("Hooks.on(name, handler)", runtime.Hooks?.on, 2);
  check("Hooks.off(name, id)", runtime.Hooks?.off, 2);
  check("GURPS.actionFuncs.attackdamage(context)", g?.actionFuncs?.attackdamage, 1);
  check("GURPS.actionFuncs.damage(context)", g?.actionFuncs?.damage, 1);
  check("GURPS.parselink(text)", g?.parselink, 1);
  try {
    const action = g?.parselink?.("4d-1(2) pi-")?.action;
    if (action?.type !== "damage" || action.damagetype !== "pi-" || !/\(2\)/.test(action.formula) || action.next)
      problems.push("GURPS.parselink damage result");
  } catch { problems.push("GURPS.parselink damage result"); }
  return { compatible: problems.length === 0, problems, systemVersion: runtime.game?.system?.version ?? null };
}
export function warnGgaDamageCompatibility(diagnostic, runtime = globalThis) {
  if (diagnostic.compatible || !runtime.game?.user?.isGM || !runtime.GURPS || warned.has(runtime.GURPS)) return;
  warned.add(runtime.GURPS);
  runtime.ui?.notifications?.warn?.(ammoEffectText("AdapterUnavailable", { points: diagnostic.problems.join(", ") }, runtime));
}
