import { calculateExplosiveRecipe } from "./explosive-ammunition-model.js";
import { ammoTypeKey } from "./ammo-inventory.js";
import { PREPARED_AMMUNITION_PROFILES } from "./prepared-ammunition-profiles.js";
import { HT_AUTOMATIC_KINETIC_RULES, HT_AUTOMATIC_SPECIAL_RULES, htVariantKind } from "./ht-kinetic-rules.js";
import { HT_NATIVE_PLUS_P_RESTRICTIONS } from "../ht-native-charge-profiles.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { reviewDUConstruction } from "./du-ammunition.js";
import { recipeFingerprint } from "./ammunition-approval-service.js";
import { isMultishotVariant, MULTISHOT_LABELS, reviewMultishotConstruction, bindMultishotDefinition, multishotDefinitionKey } from "./multishot-ammunition.js";
import { isExplosiveVariant, EXPLOSIVE_VARIANTS, sourceExplosiveDefinition, reviewExplosiveDefinition } from "./explosive-attack-profiles.js";
import { ENVIRONMENT_VARIANTS, isEnvironmentVariant, sourceEnvironmentDefinition, reviewEnvironmentDefinition } from "./environment-ammunition.js";
import { FUZE_TRACER_VARIANTS, isFuzeTracerVariant, sourceFuzeTracerDefinition, reviewFuzeTracerDefinition, nativeAirburstAlreadyIncluded } from "./fuze-tracer-ammunition.js";
import { handloadCondition, silentCondition } from "./cartridge-load-conditions.js";
import { hasLegacyPlusPAdmission } from "./legacy-plus-p-admission.js";
import { CASE_VARIANTS, isCaseVariant, sourceCaseDefinition, reviewCaseDefinition } from "./case-technology.js";

export const isExplosiveRecipe = type => isExplosiveVariant(type?.recipe?.variantId);
const stable = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(stable) :
  Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const canonical = value => JSON.stringify(stable(value));
const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
const freeze = value => { if (value && typeof value === "object") {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const snapshot = value => freeze(structuredClone(value));
export function missingExplosiveInputs(parameters = {}) {
  const fields = ["projectileMassG", "explosiveMassG", "ref", "fragmentMassG", "referenceMassG", "referenceDice"];
  const missing = fields.filter(field => !positive(parameters[field]));
  if (!parameters.referenceSource?.trim?.()) missing.push("referenceSource");
  if (!["reference", "gm"].includes(parameters.source?.kind) || !parameters.source?.note?.trim?.()) missing.push("source");
  if (parameters.q != null && !positive(parameters.q)) missing.push("q");
  return missing;
}

function publishedModel(entry, variantId) {
  const p = entry.parameters ?? {}, reasons = [];
  if (!/^[1-9]\d*d(?:[+-]\d+)?(?:x\d+)? cr ex$/.test(entry.explosion ?? "") ||
      !/^[1-9]\d*d(?:[+-]\d+)?(?:x\d+)? cut$/.test(entry.fragmentation ?? "")) reasons.push("PublishedComponentsMissing");
  if (variantId === "ht_apex" && (!positive(p.projectileMassG) || !positive(p.explosiveMassG) ||
      p.explosiveMassG >= p.projectileMassG * 0.05)) reasons.push("apex-charge-must-be-less-than-five-percent");
  const status = reasons.length ? "unresolved" : "resolved";
  return { version: 1, kind: "published-components", parameters: structuredClone(p), source: structuredClone(entry.source),
    explosion: { status, formula: status === "resolved" ? entry.explosion : null, rawDice: null, source: entry.source.note },
    fragmentation: { status, formula: status === "resolved" ? entry.fragmentation : null, rawDice: null,
      version: "published-components-v1", source: entry.source.note }, reasons, warnings: [], status };
}

/** Read-only, synchronous preparation. Never materializes stocks, approvals or Actor data. */
export class AutomaticAmmunitionProfileService {
  constructor({ catalogs, compatibility, library = PREPARED_AMMUNITION_PROFILES } = {}) {
    this.catalogs = catalogs; this.compatibility = compatibility; this.library = snapshot(library);
  }
  candidates(modeId, base, variantId) {
    const record = this.catalogs?.getAmmoItem(base.book, base.ammoId);
    // Explicit structured per-cartridge data only. Round weight, caliber and generic UT tables are not inputs.
    const direct = record?.explosive_profiles?.[variantId];
    const prepared = this.library.filter(entry => entry.book === base.book && entry.ammoId === base.ammoId &&
      entry.variantId === variantId && (!entry.modeIds || entry.modeIds.includes(modeId))).sort((a,b)=>b.revision-a.revision);
    const inputs = record?.explosive_parameters?.[variantId];
    return [direct && { ...direct, origin: "reference" }, ...prepared,
      inputs && { id: base.book + ":" + base.ammoId + ":" + variantId + ":inputs", revision: 1,
        method: "calculated", origin: "calculated", verified: true, source: inputs.source, parameters: inputs }].filter(Boolean);
  }
  prepare({ modeId, base, variantId, savedType = null, approval = null }) {
    if (isCaseVariant(variantId)) return this.prepareCase({ modeId, base, variantId, savedType });
    if (isFuzeTracerVariant(variantId)) return this.prepareFuzeTracer({ modeId, base, variantId, savedType });
    if (isEnvironmentVariant(variantId)) return this.prepareEnvironment({ modeId, base, variantId, savedType });
    if (isExplosiveVariant(variantId) && !["ht_apex","ht_aphex"].includes(variantId)) return this.prepareCompositeExplosive({ modeId, base, variantId, savedType });
    if (isMultishotVariant(variantId)) return this.prepareMultishot({ modeId, base, variantId, savedType, approval });
    if (HT_AUTOMATIC_KINETIC_RULES[variantId]) return this.prepareKinetic({ modeId, base, variantId, savedType, approval });
    if (HT_AUTOMATIC_SPECIAL_RULES[variantId]) return this.prepareSpecial({ modeId, base, variantId, savedType });
    const baseResult = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId,
      { book: base.book, kind: "projectile-option", ammoItemId: base.ammoId });
    const fallback = { state: "incomplete", origin: "incomplete", rulesStatus: rules?.status ?? "undetermined",
      baseStatus: baseResult?.status ?? "undetermined", model: null, type: null,
      missing: missingExplosiveInputs(), reasons: ["AutomaticInputsMissing"] };
    if (base.book !== "ht" || base.kind !== "ammo-item" || !["ht_apex", "ht_aphex"].includes(variantId))
      return snapshot({ ...fallback, reasons: ["UnsupportedProfileRules"] });
    if (baseResult?.status !== "compatible" || rules?.status === "incompatible")
      return snapshot({ ...fallback, state: rules?.status === "incompatible" || baseResult?.status === "incompatible" ? "incompatible" : "incomplete",
        reasons: ["ProfileCompatibilityRequired"] });
    let failed = fallback;
    for (const entry of this.candidates(modeId, base, variantId)) {
      if (entry.verified !== true || !entry.id || !Number.isSafeInteger(entry.revision) || entry.revision < 1 ||
          !entry.source?.note || !["reference", "calculated"].includes(entry.origin)) continue;
      const model = entry.method === "published" ? publishedModel(entry, variantId) :
        calculateExplosiveRecipe(variantId, entry.parameters ?? {});
      const facts = { caliberMm: rules.eligibility?.facts?.caliberMm ?? entry.facts?.caliberMm ?? null };
      const autoProfile = { version: 1, id: entry.id, revision: entry.revision, origin: entry.origin,
        source: structuredClone(entry.source), facts, model };
      // Canonical content in the identity avoids merging revisions or relying on a collision-prone short hash.
      const customId = "auto:" + canonical(autoProfile);
      const type = { source: "catalog", book: base.book, kind: base.kind, ammoId: base.ammoId,
        name: base.name + " " + (variantId === "ht_apex" ? "APEX" : "APHEX"),
        recipe: { version: 1, variantId, customId, parameters: structuredClone(entry.parameters ?? {}), autoProfile } };
      type.key = ammoTypeKey(type);
      if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) continue;
      if (model.status === "resolved" && positive(facts.caliberMm)) return snapshot({ state: "complete", origin: entry.origin, model, type, facts,
        referenceConfirmed: entry.origin === "reference" && entry.method === "published" && entry.modeIds?.includes(modeId) && entry.source.kind === "reference",
        rulesStatus: rules.status, baseStatus: baseResult.status, missing: [], reasons: [] });
      failed = { ...fallback, model, missing: [...(entry.method === "published" ? [] : missingExplosiveInputs(entry.parameters ?? {})),
        ...(!positive(facts.caliberMm) ? ["caliberMm"] : [])], reasons: model.reasons };
    }
    return snapshot(savedType ? { ...fallback, reasons: ["SavedProfileUnavailable"] } : failed);
  }
  prepareCase({ modeId, base, variantId, savedType }) {
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: "ht", kind: "case-option", ammoItemId: base.ammoId });
    const fallback = { state: baseline?.status === "incompatible" || rules?.status === "incompatible" ? "incompatible" : "incomplete",
      origin: "incomplete", type: null, model: null, baseStatus: baseline?.status ?? "undetermined", rulesStatus: rules?.status ?? "undetermined", missing: [], reasons: ["P7ConstructionMissing"] };
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible" || rules?.status === "incompatible") return snapshot(fallback);
    const ammo = this.catalogs.getAmmoItem("ht", base.ammoId), option = this.catalogs.getVariant("ht", variantId);
    const definition = sourceCaseDefinition(this.catalogs, modeId, ammo, variantId);
    const review = reviewCaseDefinition(option, rules?.eligibility?.facts, definition, ammo);
    if (review.status !== "resolved") return snapshot({ ...fallback, reasons: [review.reason] });
    const autoProfile = { version: 1, id: ammo.id + ":" + variantId + ":case", revision: 1, origin: "reference", modeId, ammoId: base.ammoId, definition };
    const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId, name: base.name + " " + CASE_VARIANTS[variantId],
      recipe: { version: 1, variantId, customId: "auto:" + canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) return snapshot({ ...fallback, reasons: ["SavedProfileUnavailable"] });
    return snapshot({ ...fallback, state: "complete", origin: "reference", referenceConfirmed: true,
      nativePreserved: !!definition.nativePreserved, type, facts: review.facts, reasons: [],
      model: { version: 1, kind: "case-technology", status: "resolved", source: definition.source } });
  }
  prepareFuzeTracer({ modeId, base, variantId, savedType }) {
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: "ht", kind: "projectile-upgrade", ammoItemId: base.ammoId });
    const fallback = { state: baseline?.status === "incompatible" || rules?.status === "incompatible" ? "incompatible" : "incomplete",
      origin: "incomplete", type: null, model: null, baseStatus: baseline?.status ?? "undetermined", rulesStatus: rules?.status ?? "undetermined",
      missing: [], reasons: ["P6ConstructionMissing"] };
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible" || rules?.status === "incompatible") return snapshot(fallback);
    const ammo = this.catalogs.getAmmoItem("ht", base.ammoId), option = this.catalogs.getVariant("ht", variantId);
    if (variantId === "ht_airburst" && nativeAirburstAlreadyIncluded(ammo))
      return snapshot({ ...fallback, state: "incompatible", reasons: ["P6NativeAirburstAlready"] });
    const definition = sourceFuzeTracerDefinition(this.catalogs, modeId, ammo, variantId);
    const review = reviewFuzeTracerDefinition(option, rules?.eligibility?.facts, definition);
    if (review.status !== "resolved") return snapshot({ ...fallback, reasons: [review.reason] });
    const autoProfile = { version: 1, id: ammo.id + ":" + variantId + ":fuze-tracer", revision: 1, origin: "reference", modeId, ammoId: base.ammoId, definition };
    const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId,
      name: base.name + " " + FUZE_TRACER_VARIANTS[variantId], recipe: { version: 1, variantId, customId: "auto:" + canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) return snapshot({ ...fallback, reasons: ["SavedProfileUnavailable"] });
    return snapshot({ ...fallback, state: "complete", origin: "reference", referenceConfirmed: true,
      nativePreserved: !!definition.nativePreserved, type, facts: review.facts,
      model: { version: 1, kind: "fuze-tracer", status: "resolved", source: definition.source }, reasons: [] });
  }
  prepareEnvironment({ modeId, base, variantId, savedType }) {
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: "ht", kind: "projectile-option", ammoItemId: base.ammoId });
    const fallback = { state: baseline?.status === "incompatible" || rules?.status === "incompatible" ? "incompatible" : "incomplete", origin: "incomplete",
      type: null, model: null, baseStatus: baseline?.status ?? "undetermined", rulesStatus: rules?.status ?? "undetermined", missing: [], reasons: ["P5ConstructionMissing"] };
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible") return snapshot(fallback);
    const ammo = this.catalogs.getAmmoItem("ht", base.ammoId), option = this.catalogs.getVariant("ht", variantId);
    const definition = sourceEnvironmentDefinition(this.catalogs, modeId, ammo, variantId);
    const review = reviewEnvironmentDefinition(option, rules.eligibility?.facts, definition);
    if (review.status !== "resolved") return snapshot({ ...fallback, reasons: [review.reason] });
    const model = { version: 1, kind: "environment-payload", status: "resolved", components: definition.components ?? [], source: definition.source };
    const autoProfile = { version: 1, id: ammo.id + ":" + variantId + ":environment", revision: 1, origin: "reference", modeId, ammoId: base.ammoId, definition };
    const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId, name: base.name + " " + ENVIRONMENT_VARIANTS[variantId],
      recipe: { version: 1, variantId, customId: "auto:" + canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) return snapshot({ ...fallback, reasons: ["SavedProfileUnavailable"] });
    return snapshot({ ...fallback, state: "complete", origin: "reference", referenceConfirmed: true, nativePreserved: !!definition.nativePreserved, model, type, facts: review.facts, reasons: [] });
  }
  prepareCompositeExplosive({modeId,base,variantId,savedType}) {
    const baseline=this.compatibility?.checkCompatibility(modeId,base.ammoId,{book:base.book,kind:base.kind});
    const rules=this.compatibility?.checkCompatibility(modeId,variantId,{book:"ht",kind:"projectile-option",ammoItemId:base.ammoId});
    const fallback={state:"incomplete",origin:"incomplete",type:null,model:null,baseStatus:baseline?.status??"undetermined",rulesStatus:rules?.status??"undetermined",missing:[],reasons:["P4ConstructionMissing"]};
    if(base.book!=="ht"||base.kind!=="ammo-item"||baseline?.status!=="compatible")return snapshot({...fallback,state:baseline?.status==="incompatible"?"incompatible":"incomplete"});
    const ammo=this.catalogs.getAmmoItem("ht",base.ammoId),option=this.catalogs.getVariant("ht",variantId);
    const definition=sourceExplosiveDefinition(this.catalogs,modeId,ammo,variantId);
    if(!definition)return snapshot({...fallback,reasons:[ammo.warhead_type===EXPLOSIVE_VARIANTS[variantId]?"P4PayloadMissing":"P4ConstructionMissing"]});
    const review=reviewExplosiveDefinition(option,rules.eligibility?.facts,definition);
    if(review.status!=="resolved")return snapshot({...fallback,reasons:[review.reason]});
    const model={version:1,kind:"published-composite",status:"resolved",components:structuredClone(definition.components),source:structuredClone(definition.source)};
    const autoProfile={version:1,id:ammo.id+":"+variantId+":published-composite",revision:1,origin:"reference",modeId,ammoId:base.ammoId,definition};
    const type={source:"catalog",book:"ht",kind:"ammo-item",ammoId:base.ammoId,name:base.name+" "+EXPLOSIVE_VARIANTS[variantId],recipe:{version:1,variantId,customId:"auto:"+canonical(autoProfile),parameters:{},autoProfile}};
    type.key=ammoTypeKey(type);
    if(savedType&&canonical(savedType.recipe)!==canonical(type.recipe))return snapshot({...fallback,reasons:["SavedProfileUnavailable"]});
    return snapshot({...fallback,state:"complete",origin:"reference",referenceConfirmed:true,nativePreserved:true,model,type,facts:review.facts,reasons:[]});
  }
  prepareKinetic({ modeId, base, variantId, savedType, approval }) {
    const rule = HT_AUTOMATIC_KINETIC_RULES[variantId];
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: base.book, kind: "projectile-option", ammoItemId: base.ammoId });
    const fallback = { state: baseline?.status === "incompatible" || rules?.status === "incompatible" ? "incompatible" : "incomplete",
      origin: "incomplete", type: null, model: null, baseStatus: baseline?.status ?? "undetermined",
      rulesStatus: rules?.status ?? "undetermined", missing: [], reasons: ["ProfileCompatibilityRequired"] };
    const du = isDUVariant(variantId);
    if (du && baseline?.status === "compatible" && rules?.status === "incompatible") {
      const reasons = (rules.eligibility?.checks ?? []).filter(c => c.status === "incompatible").map(c =>
        c.field === "minimum_caliber_mm" ? "DUMinimumCaliber" : ["min_tl", "minimum_availability_tl"].includes(c.field) ? "DUAvailabilityRequired"
          : c.field === "weapon_platforms_any" ? "DUPlatformProhibited" : "DUEvidenceProhibited");
      return snapshot({ ...fallback, facts: rules.eligibility?.facts,
        reasons: [...new Set(reasons.length ? reasons : ["DUEvidenceProhibited"])] });
    }
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible" ||
        !(rules?.status === "compatible" || du && rules?.status === "undetermined")) return snapshot(fallback);
    const facts = structuredClone(rules.eligibility.facts), model = { version: 1, kind: "kinetic-rule", status: "resolved", rule: { ...rule } };
    // Preserve the v1 identity of existing APDS/APFSDS/SAPFSDS recipes and their approvals.
    if (!du) delete model.rule.costFactor;
    const autoProfile = { version: 1, id: variantId + ":ht-kinetic-rule", revision: 1, origin: "reference",
      source: { kind: "reference", note: rule.source + (du ? "; numeric rule only; specific DU design needs source evidence or scoped GM confirmation" : "; reviewed-ht-kinetic-families-v1"), url: "https://gametable.pbworks.com/f/GURPS%2B-%2B4th%2BEdition%2B-%2BHigh-Tech.pdf" },
      facts: { caliberMm: facts.caliberMm }, model };
    const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId, name: base.name + " " + rule.label,
      recipe: { version: 1, variantId, customId: "auto:" + canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) return snapshot({ ...fallback, reasons: ["SavedProfileUnavailable"] });
    if (du) {
      const authorized = approval?.active === true && approval.modeId === modeId && approval.ammoId === base.ammoId &&
        approval.variantId === variantId && approval.recipeId === type.recipe.customId && approval.fingerprint === recipeFingerprint(type);
      const review = reviewDUConstruction(this.catalogs.getVariant("ht", variantId), facts, authorized ? approval.duDecision : null);
      if (review.status !== "compatible" || review.reason) return snapshot({ ...fallback, type, facts: review.facts, reasons: [review.reason ?? "DUConfirmationRequired"] });
      return snapshot({ state: "complete", origin: authorized ? "gm" : "reference", type, model, facts: review.facts,
        baseStatus: baseline.status, rulesStatus: rules.status, missing: [], reasons: [] });
    }
    return snapshot({ state: "complete", origin: "reference", type, model, facts, baseStatus: baseline.status, rulesStatus: rules.status, missing: [], reasons: [] });
  }
  prepareSpecial({ modeId, base, variantId, savedType }) {
    const rule = HT_AUTOMATIC_SPECIAL_RULES[variantId];
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: base.book, kind: htVariantKind(variantId), ammoItemId: base.ammoId });
    const fallback = { state: baseline?.status === "incompatible" || rules?.status === "incompatible" ? "incompatible" : "incomplete",
      origin: "incomplete", type: null, model: null, baseStatus: baseline?.status ?? "undetermined",
      rulesStatus: rules?.status ?? "undetermined", missing: [], reasons: ["SpecialEvidenceRequired"] };
    const plusP = variantId === "ht_plus_p";
    if (variantId === "ht_match_handloaded" || variantId === "ht_silent") {
      const facts = rules?.eligibility?.facts;
      const reason = variantId === "ht_match_handloaded" ? handloadCondition(facts) : silentCondition(facts);
      if (reason) return snapshot({ ...fallback, reasons: [reason] });
    }
    if (plusP && HT_NATIVE_PLUS_P_RESTRICTIONS[modeId]) return snapshot({ ...fallback,
      reasons: [HT_NATIVE_PLUS_P_RESTRICTIONS[modeId]] });
    // HT165 needs no physical pressure input. Unknown platform safety remains an admission decision.
    const calculablePlusP = plusP && rules?.status === "undetermined" && rules.eligibility?.checks?.every(check =>
      check.status === "confirmed" || check.field === "explicit_evidence_required.weapon_pressure_rating_verified");
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible" ||
        !(rules?.status === "compatible" || calculablePlusP)) return snapshot(fallback);
    const facts = structuredClone(rules.eligibility.facts);
    const ammo = this.catalogs?.getAmmoItem(base.book, base.ammoId);
    if (plusP) facts.legacyPlusPAdmission = hasLegacyPlusPAdmission(this.catalogs, modeId, base.ammoId);
    if (plusP && facts.plusPBaselineUnresolved) return snapshot({ ...fallback,
      reasons: ["plus-p-case-construction-unverified"] });
    if (ammo?.book_cost_weight_verified && Number.isFinite(ammo.cost_per_shot_usd)) facts.baseCostPerShot = ammo.cost_per_shot_usd;
    const model = { version: 1, kind: "special-rule", status: "resolved", rule: { ...rule } };
    const autoProfile = { version: 1, id: variantId + ":ht-special-rule", revision: 1, origin: "reference",
      source: { kind: "reference", note: rule.source + "; reviewed-ht-special-families-v1",
        references: structuredClone(facts.provenance), url: "https://gametable.pbworks.com/f/GURPS%2B-%2B4th%2BEdition%2B-%2BHigh-Tech.pdf" },
      facts: { caliberMm: facts.caliberMm, cartridgeClass: facts.cartridgeClass ?? null, originalLoadSpeed: facts.originalLoadSpeed ?? null,
        baseCostPerShot: facts.baseCostPerShot ?? null }, model };
    // The new personal recipe identity must include the individual gun, batch and confirmed checks.
    // Existing factory Match/Subsonic/+P recipe identities remain byte-for-byte unchanged.
    if (variantId === "ht_match_handloaded") autoProfile.handloadDefinition = structuredClone(facts.handloadDefinition);
    if (variantId === "ht_silent") autoProfile.silentDefinition = structuredClone(facts.silentDefinition);
    const type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId, name: base.name + " " + rule.label,
      recipe: { version: 1, variantId, customId: "auto:" + canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    if (savedType && canonical(savedType.recipe) !== canonical(type.recipe)) return snapshot({ ...fallback, reasons: ["SavedProfileUnavailable"] });
    return snapshot({ state: "complete", origin: "reference", type, model, facts, baseStatus: baseline.status, rulesStatus: rules.status, missing: [], reasons: [] });
  }
  prepareMultishot({ modeId, base, variantId, savedType, approval }) {
    const baseline = this.compatibility?.checkCompatibility(modeId, base.ammoId, { book: base.book, kind: base.kind });
    const rules = this.compatibility?.checkCompatibility(modeId, variantId, { book: base.book, kind: "projectile-option", ammoItemId: base.ammoId });
    const fallback = { state: "incomplete", origin: "incomplete", type: null, model: null, baseStatus: baseline?.status ?? "undetermined",
      rulesStatus: rules?.status ?? "undetermined", missing: [], reasons: ["MultishotEvidenceRequired"] };
    if (base.book !== "ht" || base.kind !== "ammo-item" || baseline?.status !== "compatible") return snapshot(fallback);
    const option = this.catalogs.getVariant("ht", variantId), original = structuredClone(rules.eligibility?.facts ?? {});
    const autoProfile = { version: 1, id: variantId+":ht-multishot-rule", revision: 1, origin: "reference",
      source: { kind: "reference", note: option.source_ref+"; exact design needs source evidence or scoped GM contract" },
      modeId, ammoId: base.ammoId, mechanics: structuredClone(option.mechanics),
      ...(original.multishotDefinition ? { definition: structuredClone(original.multishotDefinition) } : {}) };
    let type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: base.ammoId, name: base.name+" "+MULTISHOT_LABELS[variantId],
      recipe: { version: 1, variantId, customId: "auto:"+canonical(autoProfile), parameters: {}, autoProfile } };
    type.key = ammoTypeKey(type);
    const definition = savedType?.recipe?.parameters?.multishotDefinition;
    if (definition) type = bindMultishotDefinition(type, definition);
    if (savedType && canonical(savedType.recipe)!==canonical(type.recipe)) return snapshot({...fallback,reasons:["SavedProfileUnavailable"]});
    const authorized = approval?.active===true && approval.modeId===modeId && approval.ammoId===base.ammoId &&
      approval.variantId===variantId && approval.recipeId===type.recipe.customId && approval.fingerprint===recipeFingerprint(type) &&
      definition && multishotDefinitionKey(definition)===multishotDefinitionKey(approval.multishotDecision);
    const review = reviewMultishotConstruction(option, original, authorized ? approval.multishotDecision : null);
    if (review.facts.multishotDefinition) review.facts.multishotDefinition.shotSizes = structuredClone(this.catalogs.getCatalog("ht").shot_sizes);
    if (review.status!=="compatible") return snapshot({...fallback,state:review.status==="incompatible"?"incompatible":"incomplete",type,facts:review.facts,reasons:[review.reason]});
    return snapshot({...fallback,state:"complete",origin:authorized?"gm":"reference",type,facts:review.facts,
      nativePreserved:review.nativePreserved,model:{version:1,kind:"multishot-rule",status:"resolved"},reasons:[]});
  }
  admission(profile, { policy = "strict", approval = null } = {}) {
    if (profile.state !== "complete" || profile.baseStatus !== "compatible" || profile.rulesStatus === "incompatible" && !profile.nativePreserved)
      return { allowed: false, authority: "undetermined" };
    if (approval?.active === false) return { allowed: false, authority: "revoked" };
    if (profile.type?.recipe?.variantId === "ht_plus_p" && !profile.facts?.legacyPlusPAdmission &&
        !(profile.facts?.evidence?.weapon_pressure_rating_verified?.value === true &&
          profile.facts.evidence.weapon_pressure_rating_verified.source))
      return { allowed: false, authority: "pressure-proof-required" };
    if (profile.rulesStatus === "compatible" || profile.referenceConfirmed === true) return { allowed: true, authority: "reference" };
    if (approval?.active === true) return { allowed: true, authority: "gm-approved" };
    if (profile.facts?.nativeChargeBaseline?.individualGMRequired) return { allowed: false, authority: "approval-required" };
    return { allowed: policy === "permissive", authority: policy === "permissive" ? "world-policy" : "approval-required" };
  }
  audit() {
    const report = { catalogs: {}, ht: { combinations: 0, complete: 0, incomplete: 0, incompatible: 0, rules: {} } };
    for (const book of ["weapons", "lt", "ht", "ut"]) {
      const data = this.catalogs?.getCatalog(book);
      report.catalogs[book] = { available: !!data, equipment: data?.equipment?.length ?? 0,
        items: data?.ammo_items?.length ?? 0, families: data?.ammo_families?.length ?? 0,
        candidates: data?.ammunition_candidates?.length ?? 0, payloadTemplates: data?.reference_payload_templates?.length ?? 0,
        projectileOptions: data?.projectile_options?.length ?? 0, warheads: data?.warheads?.length ?? 0,
        structuredProfiles: (data?.ammo_items ?? []).filter(item => item.explosive_profiles || item.explosive_parameters).length };
    }
    report.catalogs.ut.aphexTableRows = Object.keys(this.catalogs?.getVariant("ut", "aphex")?.damage_table ?? {}).length;
    report.catalogs.ut.scope = "UT tables retain their own TL, size and kinetic rules; never used for HT";
    report.ut = { combinations: 0, compatible: 0, undetermined: 0, incompatible: 0,
      sourceRowsMatched: 0, automaticProfiles: 0, reasons: {} };
    const utTable = this.catalogs?.getVariant("ut", "aphex")?.damage_table ?? {};
    for (const family of this.catalogs?.getCatalog("ut")?.ammo_families ?? [])
      for (const mode of family.linked_weapon_modes ?? []) {
        const result = this.compatibility?.checkCompatibility(mode.weapon_mode_id, "aphex", { book: "ut", kind: "warhead" });
        report.ut.combinations++; report.ut[result?.status ?? "undetermined"]++;
        if (result?.status === "compatible" && utTable[family.caliber_mm + "mm"]) report.ut.sourceRowsMatched++;
        for (const reason of result?.reasons ?? []) report.ut.reasons[reason.code] = (report.ut.reasons[reason.code] ?? 0) + 1;
      }
    for (const base of this.catalogs?.getCatalog("ht")?.ammo_items ?? []) for (const modeId of base.weapon_mode_ids)
      for (const variantId of ["ht_apex", "ht_aphex"]) {
        const result = this.prepare({ modeId, base: { ...base, ammoId: base.id, book: "ht", kind: "ammo-item" }, variantId });
        report.ht.combinations++; report.ht[result.state]++;
        report.ht.rules[result.rulesStatus] = (report.ht.rules[result.rulesStatus] ?? 0) + 1;
      }
    return snapshot(report);
  }
}
