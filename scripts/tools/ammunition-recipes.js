import { recipeFingerprint } from "./ammunition-approval-service.js";
import { HT_AUTOMATIC_KINETIC_RULES, HT_AUTOMATIC_SPECIAL_RULES, htVariantKind } from "./ht-kinetic-rules.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { reviewDUConstruction, DU_OPTIONS } from "./du-ammunition.js";
import { MULTISHOT_IDS, MULTISHOT_LABELS, isMultishotVariant, reviewMultishotConstruction } from "./multishot-ammunition.js";
import { EXPLOSIVE_VARIANTS, reviewExplosiveDefinition } from "./explosive-attack-profiles.js";
import { ENVIRONMENT_VARIANTS, reviewEnvironmentDefinition } from "./environment-ammunition.js";
import { FUZE_TRACER_VARIANTS, reviewFuzeTracerDefinition } from "./fuze-tracer-ammunition.js";
import { CASE_VARIANTS, isCaseVariant } from "./case-technology.js";
export const FIRST_STAGE_VARIANTS = Object.freeze(["ht_ap", "ht_aphc", "ht_hollow_point", ...Object.keys(EXPLOSIVE_VARIANTS), ...Object.keys(HT_AUTOMATIC_KINETIC_RULES), ...Object.keys(HT_AUTOMATIC_SPECIAL_RULES), ...MULTISHOT_IDS, ...Object.keys(ENVIRONMENT_VARIANTS), ...Object.keys(FUZE_TRACER_VARIANTS), ...Object.keys(CASE_VARIANTS)]);
export const variantAbbreviation = id => ({ ht_ap: "AP", ht_aphc: "APHC", ht_hollow_point: "HP" })[id] ?? EXPLOSIVE_VARIANTS[id] ?? HT_AUTOMATIC_KINETIC_RULES[id]?.label ?? HT_AUTOMATIC_SPECIAL_RULES[id]?.label ?? MULTISHOT_LABELS[id] ?? ENVIRONMENT_VARIANTS[id] ?? FUZE_TRACER_VARIANTS[id] ?? CASE_VARIANTS[id];
export function assessAmmunitionRecipe(compatibility, modeId, type, approval = null, automatic = null, preparedFacts = null) {
  const base = compatibility?.checkCompatibility(modeId, type.ammoId, { book: type.book, kind: type.kind });
  const recipe = type.recipe;
  if (!recipe) return { base, construction: { status: base?.status ?? "undetermined" }, facts: null };
  if (recipe.version !== 1 || type.book !== "ht" || type.kind !== "ammo-item" ||
      !FIRST_STAGE_VARIANTS.includes(recipe.variantId) || (recipe.variantIds &&
        (!Array.isArray(recipe.variantIds) || recipe.variantIds.some(id => id !== recipe.variantId) || recipe.variantIds.length > 1)))
    return { base, construction: { status: "incompatible", reasons: [{ code: "INVALID_RECIPE" }] }, facts: null };
  let construction = compatibility?.checkCompatibility(modeId, recipe.variantId,
    { book: "ht", kind: htVariantKind(recipe.variantId), ammoItemId: type.ammoId });
  const multishot = isMultishotVariant(recipe.variantId) ? reviewMultishotConstruction(preparedFacts?.multishotOption, preparedFacts) : null;
  const composite = preparedFacts?.explosiveDefinition ? reviewExplosiveDefinition(preparedFacts.explosiveOption,preparedFacts,preparedFacts.explosiveDefinition) : null;
  const environment = preparedFacts?.environmentDefinition ? reviewEnvironmentDefinition(preparedFacts.environmentOption, preparedFacts, preparedFacts.environmentDefinition) : null;
  const fuze = preparedFacts?.fuzeTracerDefinition ? reviewFuzeTracerDefinition(preparedFacts.fuzeTracerOption, preparedFacts, preparedFacts.fuzeTracerDefinition) : null;
  const nativePreserved = multishot?.status === "compatible" && multishot.nativePreserved || composite?.status === "resolved" && preparedFacts.explosiveDefinition.nativePreserved || environment?.status === "resolved" && preparedFacts.environmentDefinition.nativePreserved;
  if (nativePreserved) construction = { ...construction, catalogueStatus: construction.status, status: "native-preserved" };
  let authorized = base?.status === "compatible" && construction?.status !== "incompatible" && approval?.active === true &&
    approval.modeId === modeId && approval.ammoId === type.ammoId && approval.variantId === recipe.variantId &&
    approval.recipeId === recipe.customId && !!recipe.customId && approval.fingerprint === recipeFingerprint(type);
  const review = isDUVariant(recipe.variantId) ? reviewDUConstruction(construction?.record ?? DU_OPTIONS[recipe.variantId],
    construction?.eligibility?.facts, authorized ? approval.duDecision : null) : null;
  if (review && (review.status !== "compatible" || review.reason)) authorized = false;
  if (multishot && multishot.status !== "compatible") authorized = false;
  if (isCaseVariant(recipe.variantId)) authorized = false; // GM approval is not chamber/feed evidence.
  const automaticAllowed = base?.status === "compatible" && construction?.status !== "incompatible" && automatic?.allowed === true;
  return { base, construction, approval: authorized ? structuredClone(approval) : null,
    applicationAllowed: construction?.status === "compatible" || authorized || automaticAllowed,
    authority: authorized ? "gm-approved" : construction?.status === "compatible" ? "reference" : automaticAllowed ? automatic.authority : construction?.status ?? "undetermined",
    facts: (isCaseVariant(recipe.variantId) ? preparedFacts : null) ?? fuze?.facts ?? environment?.facts ?? composite?.facts ?? multishot?.facts ?? review?.facts ?? construction?.eligibility?.facts ?? null };
}
