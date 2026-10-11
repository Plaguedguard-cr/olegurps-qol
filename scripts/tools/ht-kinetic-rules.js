// Shared source-backed transformations; input remains the immutable actual GGA attack.
import { isMultishotVariant } from "./multishot-ammunition.js";
import { isEnvironmentVariant } from "./environment-ammunition.js";
import { isFuzeTracerVariant } from "./fuze-tracer-ammunition.js";
import { isCaseVariant } from "./case-technology.js";
export const HT_AUTOMATIC_KINETIC_RULES = Object.freeze({
  ht_apds: Object.freeze({ factor: 1.3, divisor: 2, shift: -1, caliberThreshold: 30, rangeFactor: 1.5, costFactor: 3, source: "HT 167", label: "APDS" }),
  ht_apfsds: Object.freeze({ factor: 1.5, divisor: 2, shift: -2, caliberThreshold: 40, rangeFactor: 2, costFactor: 4, source: "HT 167", label: "APFSDS" }),
  ht_sapfsds: Object.freeze({ factor: 1, divisor: 2, damageType: "pi-", shift: 0, rangeFactor: 1.5, costFactor: 2, source: "HT 168", label: "SAPFSDS" }),
  ht_apdu: Object.freeze({ factor: 1.2, divisor: 2, shift: -1, caliberThreshold: 20, costFactor: 3, source: "HT 169", label: "APDU", depletedUranium: true }),
  ht_apdsdu: Object.freeze({ factor: 1.5, divisor: 2, shift: -1, caliberThreshold: 30, rangeFactor: 1.5, costFactor: 4, source: "HT 169", label: "APDSDU", depletedUranium: true }),
  ht_apfsdsdu: Object.freeze({ factor: 1.7, divisor: 2, shift: 0, caliberThreshold: 40, piercingMap: Object.freeze({ "pi++": "pi+", "pi+": "pi" }), rangeFactor: 2, costFactor: 5, source: "HT 169", label: "APFSDSDU", depletedUranium: true })
});
export const isDUVariant = id => HT_AUTOMATIC_KINETIC_RULES[id]?.depletedUranium === true;
export const isAutomaticKineticRecipe = type => !!HT_AUTOMATIC_KINETIC_RULES[type?.recipe?.variantId];
export const HT_AUTOMATIC_SPECIAL_RULES = Object.freeze({
  ht_match_grade: Object.freeze({ accuracyFactor: 1.25, accuracyBonusCap: 1, costFactor: 2, source: "HT 165", label: "Match", kind: "cartridge-upgrade" }),
  ht_match_handloaded: Object.freeze({ accuracyFactor: 1.5, accuracyBonusCap: 2, costFactor: 1, source: "HT 174", label: "Handloaded Match", kind: "cartridge-upgrade" }),
  ht_silent: Object.freeze({ hearingTableDistanceYards: 16, costFactor: 10, source: "HT 165", label: "Silent", kind: "cartridge-upgrade" }),
  ht_subsonic_pistol: Object.freeze({ factor: 1, rangeFactor: 0.8, hearing: -1, costFactor: 1.3, source: "HT 165", label: "Subsonic", kind: "cartridge-upgrade" }),
  ht_subsonic_rifle: Object.freeze({ factor: 0.6, rangeFactor: 0.6, hearing: -2, costFactor: 1.3, source: "HT 165", label: "Subsonic", kind: "cartridge-upgrade" }),
  ht_frangible: Object.freeze({ factor: 1, divisor: 0.5, shift: 1, rangeFactor: 0.9, costFactor: 1.5, source: "HT 167; B408", label: "Frangible", kind: "projectile-option" }),
  ht_plus_p: Object.freeze({ factor: 1.1, rangeFactor: 1.1, strengthFactor: 1.1, costFactor: 1.5, source: "HT 165", label: "+P", kind: "cartridge-upgrade" })
});
export const isAutomaticReferenceRecipe = type => isCaseVariant(type?.recipe?.variantId) || isAutomaticKineticRecipe(type) || !!HT_AUTOMATIC_SPECIAL_RULES[type?.recipe?.variantId] || isMultishotVariant(type?.recipe?.variantId) || isEnvironmentVariant(type?.recipe?.variantId) || isFuzeTracerVariant(type?.recipe?.variantId) || !!type?.recipe?.autoProfile?.definition?.components;
export const htVariantKind = id => isCaseVariant(id) ? "case-option" : isFuzeTracerVariant(id) ? "projectile-upgrade" : HT_AUTOMATIC_SPECIAL_RULES[id]?.kind ?? "projectile-option";
