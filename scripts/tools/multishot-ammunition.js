import { evaluateHTOptionEligibility } from "../ht-option-eligibility.js";
import { ammoTypeKey } from "./ammo-inventory.js";

export const MULTISHOT_LABELS = Object.freeze({ ht_rifled_slug: "Rifled Slug", ht_baton: "Baton", ht_beanbag: "Beanbag",
  ht_canister: "Canister", ht_shotshell: "Shotshell", ht_buck_and_ball: "Buck-and-ball", ht_shrapnel: "Shrapnel",
  ht_duplex: "Duplex", ht_triplex: "Triplex", ht_beehive: "Beehive", ht_multi_flechette: "MF", ht_rubber_shot: "Rubber Shot", ht_abf: "ABF" });
export const MULTISHOT_IDS = Object.freeze(Object.keys(MULTISHOT_LABELS));
export const isMultishotVariant = id => MULTISHOT_IDS.includes(id);
const sized = ["ht_shotshell", "ht_canister", "ht_multi_flechette", "ht_rubber_shot"];
const burst = ["ht_shrapnel", "ht_beehive", "ht_abf"];
const positive = n => typeof n === "number" && Number.isFinite(n) && n > 0;
const source = value => typeof value === "string" && value.trim().length > 0;
const integer = n => Number.isSafeInteger(n) && n > 0;
const copy = value => structuredClone(value ?? {});
const stable = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(stable) :
  Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])) : value;
export const multishotDefinitionKey = value => JSON.stringify(stable(value));
export function bindMultishotDefinition(type, definition) {
  const bound = copy({ source:type.source, book:type.book, kind:type.kind, ammoId:type.ammoId, name:type.name, recipe:type.recipe });
  bound.recipe.parameters = { multishotDefinition: copy(definition) };
  bound.recipe.customId = "auto:"+multishotDefinitionKey(bound.recipe.autoProfile)+":load:"+multishotDefinitionKey(definition);
  bound.key = ammoTypeKey(bound);
  return bound;
}

/** Individual source/GM evidence is scoped by the existing approval service, never by world policy. */
export function reviewMultishotConstruction(option, originalFacts, decision = null) {
  const facts = copy(originalFacts), id = option?.id;
  facts.evidence ??= {}; facts.provenance ??= []; facts.nativeEffects ??= {};
  const fail = reason => ({ status: "undetermined", reason, facts, nativePreserved: false });
  if (!isMultishotVariant(id)) return fail("MultishotEvidenceRequired");
  facts.multishotOption = copy(option);
  if (decision) {
    if (decision.designConfirmed !== true || !source(decision.source)) return fail("MultishotEvidenceRequired");
    for (const key of ["caliberMm", "availabilityTL"]) {
      if (facts[key] != null && decision[key] != null && facts[key] !== decision[key]) return fail("MultishotSourceConflict");
      if (facts[key] == null) facts[key] = decision[key];
    }
    const platforms = option.eligibility_v1.conditions.weapon_platforms_any ?? [];
    if (!platforms.includes(decision.platform)) return fail("MultishotPlatformRequired");
    const known = facts.weaponPlatforms?.values ?? [], actions = facts.weaponActions?.values ?? [];
    const related = { source_verified_revolver: ["revolver"], low_power_shotgun: ["shotgun"],
      low_power_grenade_launcher: ["grenade_launcher"], source_verified_grenade_launcher: ["grenade_launcher"],
      source_verified_riot_launcher: ["riot_launcher", "grenade_launcher"], source_verified_handgun: ["pistol", "revolver"],
      source_verified_smoothbore: ["smoothbore_musket"], bolt_action_rifle: ["rifle"], automatic_rifle: ["rifle"] };
    if (facts.weaponPlatforms?.complete && !known.includes(decision.platform) &&
        !(related[decision.platform] ?? []).some(v => known.includes(v))) return fail("MultishotPlatformRequired");
    if (decision.platform === "bolt_action_rifle" && facts.weaponActions?.complete && !actions.includes("bolt_action") ||
        decision.platform === "automatic_rifle" && facts.weaponActions?.complete && !actions.includes("automatic")) return fail("MultishotPlatformRequired");
    facts.weaponPlatforms = { values: [...new Set([...known, decision.platform])], complete: true };
    facts.munitionClasses = { values: [...new Set([...(facts.munitionClasses?.values ?? []),
      ...(option.eligibility_v1.conditions.munition_classes_any ?? [])])], complete: true };
    for (const required of option.eligibility_v1.explicit_evidence_required) {
      if (facts.evidence[required]?.value === false && facts.evidence[required].source) return fail("MultishotSourceConflict");
      facts.evidence[required] = { value: true, source: decision.source };
    }
    facts.multishotDefinition = copy(decision);
    facts.provenance.push({ kind: "individual-GM-source-contract", variantId: id, source: decision.source });
  }
  const definition = facts.multishotDefinition;
  if (!source(definition?.source) || !positive(facts.caliberMm) || !Number.isInteger(facts.availabilityTL)) return fail("MultishotEvidenceRequired");
  if (["ht_duplex", "ht_triplex"].includes(id) &&
      facts.weaponPlatforms?.values?.some(v => ["automatic_rifle", "machine_gun"].includes(v)) && facts.availabilityTL < 7)
    return { ...fail("MultishotTLRequired"), status: "incompatible" };
  const nativePreserved = definition.nativeVariant === id && source(definition.nativeDamage);
  const evaluation = evaluateHTOptionEligibility(option, facts);
  const prohibitions = evaluation.checks.filter(c => c.status !== "confirmed" &&
    !(nativePreserved && c.field === "overlap_guard"));
  if (prohibitions.length) return { ...fail("MultishotEvidenceRequired"), status: prohibitions.some(c=>c.status==="incompatible") ? "incompatible" : "undetermined", checks: evaluation.checks };
  if (sized.includes(id) && (!integer(definition.count) || !positive(definition.elementMm))) return fail("MultishotElementsRequired");
  if (id === "ht_buck_and_ball" && !integer(definition.count)) return fail("MultishotElementsRequired");
  if (id === "ht_canister" && !["pi+", "pi++"].includes(definition.elementType)) return fail("MultishotElementsRequired");
  if (burst.includes(id) && (!nativePreserved || !positive(definition.burstDistance))) return fail("MultishotPublishedRequired");
  facts.multishotOption = copy(option);
  return { status: "compatible", reason: null, facts, nativePreserved, checks: evaluation.checks };
}

/** Same HT166 converter as kinetic ammunition; no Rolls, Actor writes or resource spending. */
export function resolveMultishotEffects({ raw, variantId, facts, previousTransformations = [], baseStatus, constructionStatus }, { htDamageDice, parseKineticDamage, parseDamageRange }) {
  const formula = String(raw?.damage ?? ""), transformations = [], components = [];
  const result = { status: "resolved", nativeSafe: true, rawFormula: formula, formula, variantId, transformations, components,
    reason: null, rules: {}, effectiveChanges: {}, support: { status: "AUTOMATED", automatic: [], manual: [], missing: [] } };
  const fail = reason => ({ ...result, status: "unresolved", nativeSafe: false, formula, reason,
    support: { ...result.support, status: "UNDETERMINED", missing: [reason] } });
  const journal = (effectId, from, to, applied = true) => transformations.push({ source: facts.multishotOption?.source_ref,
    effectId, from, to, order: transformations.length + 1, applied, reason: applied ? "HT166-from-immutable-source" : "native-source-preserved" });
  if (baseStatus !== "compatible" || !["compatible", "gm-approved", "world-policy"].includes(constructionStatus)) return fail("MultishotEvidenceRequired");
  if (previousTransformations.some(e=>e.effectId===variantId && e.applied)) return fail("already-applied-use-original-profile");
  const review = reviewMultishotConstruction(facts.multishotOption, facts);
  if (review.status !== "compatible") return fail(review.reason);
  const d = facts.multishotDefinition, m = facts.multishotOption.mechanics, range = parseDamageRange(raw.range);
  const rof = String(raw.rof ?? "").match(/^(\d+)(?:[xX\u00d7*](\d+))?([!#])?$/u);
  if (!rof || !integer(Number(rof[1]))) return fail("MultishotPhysicalRoFRequired");
  const shots = Number(rof[1]), rawNP = Number(rof[2] ?? 1);
  const native = review.nativePreserved;
  if (native) {
    if (!/^\d+(?:\.\d+)?d(?:6)?(?:[+-]\d+){0,2}(?:[x\u00d7*]\d+(?:\.\d+)?)?(?:\(\d+(?:\.\d+)?\))?\s+(?:pi\+\+|pi\+|pi-|pi|cr(?: ex| dkb)?|cut|imp|burn)$/u.test(formula)) return fail("unsupported-or-compound-native-damage");
    if (formula !== d.nativeDamage || d.nativeRange != null && raw.range !== d.nativeRange ||
        d.nativeRoF != null && raw.rof !== d.nativeRoF || d.nativeRcl != null && String(raw.rcl) !== String(d.nativeRcl)) return fail("MultishotSourceConflict");
    if (variantId === "ht_rifled_slug" && (rawNP !== 1 || !integer(Number(raw.rcl)))) return fail("MultishotSlugRclRequired");
    if (sized.includes(variantId) && rawNP !== d.count) return fail("MultishotSourceConflict");
    if (variantId === "ht_beehive" && !/ cut$/.test(formula)) return fail("MultishotPublishedRequired");
    const parsed = parseKineticDamage(formula) ?? (/ cr(?: dkb)?$/.test(formula) ? parseKineticDamage(formula.replace(/ cr(?: dkb)?$/," pi")) : null);
    if (["ht_baton","ht_beanbag"].includes(variantId) && (!/ cr(?: dkb)?$/.test(formula) || parsed?.divisor!==m.armor_divisor ||
        variantId==="ht_beanbag" && Number(raw.acc)!==0)) return fail("MultishotSourceConflict");
    if (["ht_duplex","ht_triplex"].includes(variantId) && (rawNP!==m.rof_multiplier || Number(raw.rcl)!==1)) return fail("MultishotSourceConflict");
    if (sized.includes(variantId)) {
      const size=d.shotSizes?.find(s=>s.id===d.shotSize), expectedType=variantId==="ht_shotshell"?size?.damage_type:
        variantId==="ht_canister"?d.elementType:variantId==="ht_multi_flechette"?"pi-":"cr";
      const expectedDivisor=variantId==="ht_shotshell"?size?.armor_divisor:variantId==="ht_rubber_shot"?0.2:1;
      if (!parsed || !formula.endsWith(" "+expectedType) || parsed.divisor!==expectedDivisor || Number(raw.rcl)!==1 ||
          variantId==="ht_shotshell" && (!size || d.elementMm<size.size_mm_range[0] || d.elementMm>size.size_mm_range[1])) return fail("MultishotSourceConflict");
    }
    if (variantId==="ht_buck_and_ball" && (rawNP!==1+d.count || Number(raw.rcl)!==1)) return fail("MultishotSourceConflict");
    journal(variantId, formula, formula, false);
  } else {
    if (raw.linked || raw.followUp || raw.followup || raw.components?.length || raw.ammunitionEffects?.length ||
        Object.values(facts.nativeEffects ?? {}).some(v=>v===true)) return fail("native-components-or-effects-already-present");
    let p = parseKineticDamage(formula);
    if (!p && ["ht_baton","ht_beanbag"].includes(variantId) && d.baselineKind==="solid" && / cr$/.test(formula)) {
      p=parseKineticDamage(formula.replace(/ cr$/," pi"));if(p)p.type="cr";
    }
    if (!p || p.divisor !== 1 || p.suffix || p.minimum) return fail("unsupported-or-compound-native-damage");
    if (!range) return fail("native-range-components-missing");
    const accuracy = String(raw.acc ?? "").match(/^(\d+)(?:\+(\d+))?$/);
    let half = range.halfDamage, max = range.maximum, acc = accuracy ? Number(accuracy[1]) : NaN, factor = 1, type = p.type, divisor = 1, count = 1;
    const shotgun = facts.weaponPlatforms.values.some(v=>["shotgun", "low_power_shotgun"].includes(v));
    const slugBase = variantId === "ht_rifled_slug" || shotgun && ["ht_baton", "ht_beanbag"].includes(variantId);
    if (slugBase) {
      if (d.baselineKind === "buckshot") {
        if (rawNP <= 1 || p.type !== "pi") return fail("MultishotBaselineRequired");
        const slugDice = htDamageDice(p.dice,p.adds,p.multiplier,4);
        p = parseKineticDamage(slugDice + " " + (facts.caliberMm >= 20 ? "pi++" : "pi+"));
        half *= 2.5; max *= 1.5; acc += 1;
        journal(variantId + ":slug-baseline", formula, slugDice + " " + p.type);
      } else if (d.baselineKind !== "slug" || rawNP !== 1) return fail("MultishotBaselineRequired");
      if (!integer(d.slugRcl)) return fail("MultishotSlugRclRequired");
      result.effectiveChanges.rcl = String(d.slugRcl); type = p.type;
    } else if (rawNP !== 1) return fail("MultishotBaselineRequired");
    if (variantId === "ht_rifled_slug") { type = facts.caliberMm >= 20 ? "pi++" : "pi+"; }
    else if (["ht_baton", "ht_beanbag"].includes(variantId)) {
      factor = m.damage_multiplier; divisor = m.armor_divisor; type = "cr";
      half *= m.range_multiplier; max *= m.range_multiplier;
      acc = variantId === "ht_beanbag" ? 0 : acc - 1;
      if (!slugBase && !integer(Number(raw.rcl))) return fail("MultishotSlugRclRequired");
    } else if (["ht_duplex", "ht_triplex"].includes(variantId)) {
      factor = m.damage_multiplier; count = m.rof_multiplier;
      const rangeFactor = variantId === "ht_triplex" ? 1/3 : m.range_multiplier;
      half *= rangeFactor; max *= rangeFactor; result.effectiveChanges.rcl = "1";
    } else if (sized.includes(variantId)) {
      count = d.count; factor = 1/Math.sqrt(count); result.effectiveChanges.rcl = "1";
      if (variantId === "ht_shotshell") {
        const size = d.shotSizes?.find(s=>s.id===d.shotSize);
        if (!size || d.elementMm < size.size_mm_range[0] || d.elementMm > size.size_mm_range[1]) return fail("MultishotElementsRequired");
        type = size.damage_type; divisor = size.armor_divisor; half = d.elementMm*5; max = d.elementMm*100;
      } else if (variantId === "ht_canister") { type = d.elementType; half=d.elementMm*5; max=d.elementMm*50; }
      else if (variantId === "ht_multi_flechette") { type="pi-"; half=d.elementMm*50; max=d.elementMm*600; }
      else { type="cr"; divisor=0.2; half=d.elementMm*2; max=d.elementMm*10; }
    } else if (variantId === "ht_buck_and_ball") {
      count = 1+d.count; half *= 0.9; max *= 0.9; result.effectiveChanges.rcl="1";
      result.rules.hitAllocation = { first: "ball", later: "pellets", ball: formula, pellet: "1d+1 pi", pelletCount: d.count, automatic: false };
      components.push({ role: "buckshot", status: "manual-GM", formula: "1d+1 pi", count: d.count });
      result.support.status="GM-MEDIATED"; result.support.manual.push({id:"BuckAndBall",application:"manual-GM-hit-allocation"});
    } else return fail("MultishotPublishedRequired");
    if (!Number.isFinite(acc) || acc < 0) return fail("native-accuracy-unresolved");
    // Preserve exact fractional ranges: B409 uses this current half-D, not a rounded display band.
    const clean = n => Number(n.toPrecision(14));
    result.effectiveChanges.range = clean(half)+"/"+clean(max);
    if (raw.halfd != null && raw.halfd !== "" && Number(String(raw.halfd).replaceAll(",","")) !== range.halfDamage) return fail("native-range-unresolved");
    result.effectiveChanges.halfd=clean(half); result.effectiveChanges.acc=acc; result.effectiveChanges.scopeBonus=Number(raw.scopeBonus ?? accuracy?.[2] ?? 0);
    result.effectiveChanges.rof = String(shots)+(count>1 ? "x"+count : rof[3] ?? "");
    const dice = factor === 1 ? p.diceText : htDamageDice(p.dice,p.adds,p.multiplier,factor);
    result.formula = variantId === "ht_buck_and_ball" ? formula : dice+(divisor!==1?"("+divisor+")":"")+" "+type;
    journal(variantId,formula,result.formula);
  }
  const count = Number(String(result.effectiveChanges.rof ?? raw.rof).match(/[xX\u00d7*](\d+)/u)?.[1] ?? 1);
  const shot = sized.includes(variantId);
  const b409Eligible=shot && (variantId==="ht_shotshell" || d.b409Applicable===true);
  result.rules.projectiles = { physicalShotsMax: shots, count, kind: shot ? "shot" : variantId === "ht_buck_and_ball" ? "mixed" : burst.includes(variantId) ? "burst" : "bullet",
    b409Eligible, nativePreserved: native, source: d.source, variantId };
  result.effectiveChanges.ammunitionProjectileKind = result.rules.projectiles.kind === "bullet" && count===1 ? "slug" : result.rules.projectiles.kind;
  result.effectiveChanges.ammunitionB409Eligible = b409Eligible;
  if (m.cost_multiplier) { result.rules.costMultiplier=m.cost_multiplier;
    if (native) result.rules.costApplication="included-in-source-cartridge-price";
    if (Number.isFinite(facts.baseCostPerShot)) result.rules.costPerShot=facts.baseCostPerShot*(native?1:m.cost_multiplier); }
  else if (Number.isFinite(facts.baseCostPerShot)) result.rules.costPerShot=facts.baseCostPerShot;
  if (variantId==="ht_buck_and_ball" && native) {
    result.rules.hitAllocation={first:"ball",later:"pellets",ball:formula,pellet:"1d+1 pi",pelletCount:d.count,automatic:false};
    components.push({role:"buckshot",status:"manual-GM",formula:"1d+1 pi",count:d.count});
    result.support.status="GM-MEDIATED";result.support.manual.push({id:"BuckAndBall",application:"manual-GM-hit-allocation"});
  }
  if (["ht_baton","ht_beanbag"].includes(variantId)) {
    const doubled = variantId === "ht_baton" ? facts.caliberMm>35 : facts.caliberMm>=15;
    if (!doubled && / dkb$/.test(result.formula)) return fail("MultishotSourceConflict");
    if (doubled && !/ dkb$/.test(result.formula)) { const prior=result.formula;result.formula+=" dkb";journal(variantId+":knockback",prior,result.formula); }
    result.rules.knockback={multiplier:doubled?2:1,application:"native-GGA-damageModifier",modifier:doubled?"dkb":null};
    result.support.manual.push({id:doubled?"DoubleKnockbackNative":"NonlethalRisk",application:"informational-risk-not-second-application"});
  }
  if (burst.includes(variantId)) {
    result.rules.burst={distance:d.burstDistance,source:d.source,application:"manual-GM",geometryAutomatic:false,nativeEffectsPreserved:true};
    if (variantId!=="ht_abf") result.rules.burst.range={halfDamage:null,maximum:d.burstDistance,application:"manual-GM-burst-distance"};
    result.support.status="GM-MEDIATED";result.support.manual.push({id:"PublishedBurst",application:"manual-GM"});
  }
  result.support.automatic=["source-damage","accuracy","range","projectile-RoF","physical-resource-count"];
  components.unshift({role:"kinetic",status:"resolved",formula:result.formula});
  return result;
}
