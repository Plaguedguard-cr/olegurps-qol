import { recipeFingerprint } from "./ammunition-approval-service.js";
import { isUTConventionalVariant, UT_CONVENTIONAL_RULES, UT_KINETIC_MODES } from "./ut-conventional-ammunition.js";
import {ltBowRecipeAssessment} from './lt-bow.js';
import {ltPersonalRecipeAssessment} from './lt-personal.js';
import {ltEarlyTypeAssessment} from './lt-early-firearms.js';
import { isUTExtendedVariant, UT_EXTENDED_RULES } from './ut-extended-ammunition.js';
import { isUTSpecialVariant, UT_SPECIAL_RULES } from './ut-special-ammunition.js';
import { HT_AUTOMATIC_KINETIC_RULES, HT_AUTOMATIC_SPECIAL_RULES, htVariantKind } from "./ht-kinetic-rules.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { reviewDUConstruction, DU_OPTIONS } from "./du-ammunition.js";
import { MULTISHOT_IDS, MULTISHOT_LABELS, isMultishotVariant, reviewMultishotConstruction } from "./multishot-ammunition.js";
import { EXPLOSIVE_VARIANTS, reviewExplosiveDefinition } from "./explosive-attack-profiles.js";
import { ENVIRONMENT_VARIANTS, reviewEnvironmentDefinition } from "./environment-ammunition.js";
import { FUZE_TRACER_VARIANTS, reviewFuzeTracerDefinition } from "./fuze-tracer-ammunition.js";
import { CASE_VARIANTS, isCaseVariant } from "./case-technology.js";
import { htLiquidRecipe, validHTLiquidRecipe, htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
export const FIRST_STAGE_VARIANTS = Object.freeze(["ht_ap", "ht_aphc", "ht_hollow_point", ...Object.keys(EXPLOSIVE_VARIANTS), ...Object.keys(HT_AUTOMATIC_KINETIC_RULES), ...Object.keys(HT_AUTOMATIC_SPECIAL_RULES), ...MULTISHOT_IDS, ...Object.keys(ENVIRONMENT_VARIANTS), ...Object.keys(FUZE_TRACER_VARIANTS), ...Object.keys(CASE_VARIANTS)]);
export const variantAbbreviation = id => UT_CONVENTIONAL_RULES[id]?.label ?? ({ ht_ap: "AP", ht_aphc: "APHC", ht_hollow_point: "HP" })[id] ?? EXPLOSIVE_VARIANTS[id] ?? HT_AUTOMATIC_KINETIC_RULES[id]?.label ?? HT_AUTOMATIC_SPECIAL_RULES[id]?.label ?? MULTISHOT_LABELS[id] ?? ENVIRONMENT_VARIANTS[id] ?? FUZE_TRACER_VARIANTS[id] ?? CASE_VARIANTS[id];
export function assessAmmunitionRecipe(compatibility, modeId, type, approval = null, automatic = null, preparedFacts = null) {
  const base = compatibility?.checkCompatibility(modeId, type.ammoId, { book: type.book, kind: type.kind });
  const recipe = type.recipe;
  const personal=ltPersonalRecipeAssessment({modeId,type,catalogs:compatibility?.catalogs??globalThis.OleGURPSQOL?.catalogs,compatibility});if(personal)return personal;
  const early=ltEarlyTypeAssessment({modeId,type,catalogs:compatibility?.catalogs??globalThis.OleGURPSQOL?.catalogs});if(early)return early;
  if (!recipe) return { base, construction: { status: base?.status ?? "undetermined" }, facts: null };
  const lt=ltBowRecipeAssessment({modeId,type,compatibility});if(lt)return lt;
  if(htLiquidRecipe(type)){
    const allowed=validHTLiquidRecipe(type)&&htPreGaussProfile(modeId)?.kind==='squirt'&&base?.status==='compatible';
    return {base,construction:{status:allowed?'compatible':'incompatible'},applicationAllowed:allowed,authority:'user-defined',facts:{source:'HT180'}};
  }
  if(isUTExtendedVariant(recipe.variantId)) {
    const valid=recipe.version===1&&type.book==='ut'&&type.kind==='ammo-family'&&preparedFacts?.modeId===modeId&&preparedFacts?.ammoId===type.ammoId&&
      (!recipe.variantIds||Array.isArray(recipe.variantIds)&&recipe.variantIds.length===1&&recipe.variantIds[0]===recipe.variantId);
    const construction={status:valid&&automatic?.allowed===true?'compatible':'undetermined',relation:{type:'verified-UT2007-carrier-warhead',source:UT_EXTENDED_RULES[recipe.variantId].source}};
    return {base,construction,applicationAllowed:valid&&automatic?.allowed===true,authority:'reference',facts:preparedFacts};
  }
  if(isUTSpecialVariant(recipe.variantId)) {
    const valid=recipe.version===1&&type.book==='ut'&&type.kind==='ammo-family'&&preparedFacts?.modeId===modeId&&
      preparedFacts?.ammoId===type.ammoId&&(!recipe.variantIds||Array.isArray(recipe.variantIds)&&recipe.variantIds.length===1&&recipe.variantIds[0]===recipe.variantId);
    const rule=UT_SPECIAL_RULES[recipe.variantId];
    const construction=valid?compatibility?.checkCompatibility(modeId,rule.id,{book:'ut',kind:rule.kind,availabilityTL:preparedFacts.availabilityTL}):{status:'incompatible'};
    return {base,construction,applicationAllowed:valid&&automatic?.allowed===true,authority:automatic?.authority??'undetermined',facts:preparedFacts};
  }
  if (isUTConventionalVariant(recipe.variantId)) {
    const valid = recipe.version === 1 && type.book === 'ut' && type.kind === 'ammo-family' &&
      UT_KINETIC_MODES[modeId] === type.ammoId &&
      (!recipe.variantIds || Array.isArray(recipe.variantIds) && recipe.variantIds.length === 1 && recipe.variantIds[0] === recipe.variantId);
    const construction = valid ? compatibility?.checkCompatibility(modeId, UT_CONVENTIONAL_RULES[recipe.variantId].id,
      {book:'ut',kind:'warhead',availabilityTL:preparedFacts?.availabilityTL}) : {status:'incompatible',reasons:[{code:'INVALID_RECIPE'}]};
    return {base,construction,applicationAllowed:valid && automatic?.allowed === true,
      authority:construction?.status === 'compatible' ? 'reference' : construction?.status ?? 'undetermined',facts:preparedFacts};
  }
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
  const custom=!!recipe.customId&&!recipe.autoProfile;
  let authorized = base?.status === "compatible" && construction?.status !== "incompatible" && !!approval &&
    approval.modeId === modeId && approval.ammoId === type.ammoId && approval.variantId === recipe.variantId &&
    approval.recipeId === recipe.customId && !!recipe.customId && approval.fingerprint === recipeFingerprint(type);
  const review = isDUVariant(recipe.variantId) ? reviewDUConstruction(construction?.record ?? DU_OPTIONS[recipe.variantId],
    preparedFacts ?? construction?.eligibility?.facts, recipe.parameters?.duDecision ?? (authorized ? approval.duDecision : null)) : null;
  if (review && (review.status !== "compatible" || review.reason)) authorized = false;
  if (multishot && multishot.status !== "compatible") authorized = false;
  if (isCaseVariant(recipe.variantId)) authorized = false; // GM approval is not chamber/feed evidence.
  const automaticAllowed = base?.status === "compatible" && construction?.status !== "incompatible" && automatic?.allowed === true;
  return { base, construction, approval: authorized ? structuredClone(approval) : null,
    applicationAllowed: construction?.status === "compatible" || authorized || automaticAllowed || custom && base?.status==='compatible' && construction?.status!=='incompatible',
    authority: custom && base?.status==='compatible' && construction?.status!=='incompatible' ? 'user-defined' : authorized ? "user-defined" : construction?.status === "compatible" ? "reference" : automaticAllowed ? automatic.authority : construction?.status ?? "undetermined",
    facts: (isCaseVariant(recipe.variantId) || recipe.variantId === "ht_match_handloaded" ? preparedFacts : null) ?? fuze?.facts ?? environment?.facts ?? composite?.facts ?? multishot?.facts ?? review?.facts ?? construction?.eligibility?.facts ?? null };
}
