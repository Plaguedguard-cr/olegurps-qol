import { russianUI } from "../russian-ui.js";
const warned = new WeakSet();
const translationLoads = new Map();
// Kept for API compatibility: Russian resources are synchronously bundled.
export async function loadAmmoEffectTranslations() {}

export const ammoEffectMessages = {
  ru: Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.AmmoEffects.")).map(([key, value]) => [key.slice(21), value])),
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
import { moduleText, moduleMessage } from "../localization.js";
export function ammoEffectText(name, values = {}, runtime = globalThis) {
  return moduleText("OleGURPS.AmmoEffects." + name, values, ammoEffectMessages.ru[name] ?? moduleMessage(name));
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
