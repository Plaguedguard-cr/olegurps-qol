import { AmmoService } from "./ammo-service.js";
import { baseAmmunition, escapeWeaponHTML as escape } from "./weapon-configuration.js";
import { ammoTypeKey, isArchivedAmmoType, magazineFill, validateInventory } from "./ammo-inventory.js";
import { ammoText as t, ammoWindowText, ammoDisplayName } from "./ammo-management-localization.js";
import { FIRST_STAGE_VARIANTS, assessAmmunitionRecipe, variantAbbreviation } from "./ammunition-recipes.js";
import { readAmmunitionApproval, setAmmunitionApproval } from "./ammunition-approval-service.js";
import { AutomaticAmmunitionProfileService, isExplosiveRecipe, missingExplosiveInputs } from "./automatic-ammunition-profiles.js";
import { automaticAmmoPolicy, automaticAmmoText } from "./automatic-ammunition-localization.js";
import { calculateExplosiveRecipe } from "./explosive-ammunition-model.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { recipeEditorHTML, recipePreviewHTML, captureRecipeInputs } from "./ammunition-recipe-editor.js";
import { handloadEditorHTML, createRegisteredHandload } from "./handload-registration.js";
import { ammunitionResourceContract, SEALED_PLATFORM_UNITS } from "./ammunition-resource-contract.js";
import { f4Text } from "./ammunition-f4-localization.js";
import { isAutomaticReferenceRecipe, HT_AUTOMATIC_SPECIAL_RULES } from "./ht-kinetic-rules.js";
import { resolveAmmunitionEffects } from "./ammunition-effects.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "./standalone-attack-service.js";
import { ammoEffectText } from "./gga-damage-compatibility.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { isDUVariant } from "./ht-kinetic-rules.js";
import { isMultishotVariant, bindMultishotDefinition, sourceMultishotVariant } from "./multishot-ammunition.js";
import { isExplosiveVariant, sourceExplosiveVariant } from "./explosive-attack-profiles.js";
import { isEnvironmentVariant, sourceEnvironmentVariant } from "./environment-ammunition.js";
import { isFuzeTracerVariant } from "./fuze-tracer-ammunition.js";
import { isCaseVariant, sourceCaseVariant, inventoryPhysicalTotals } from "./case-technology.js";
import { publishedLoadBaseline,alternateLoadNeedsBallistics } from "../ht-published-loads.js";
import { selectedLoadBallistics } from "./ammunition-ballistics.js";
import { ammunitionChoiceGroup, choiceGroupsHTML } from "./ammunition-choices.js";

const windows = new Map();
export function ammunitionCandidates(actor, weapon, api = globalThis.OleGURPSQOL, language = globalThis.game?.i18n?.lang ?? "en") {
  const t = name => ammoWindowText(name, language);
  const inventory = weapon.ammunitionInventory;
  const standalone = weapon.standaloneWeaponId ? readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId) : null;
  const analysis = standalone ? standaloneCatalogBinding(standalone, api?.catalogs) : api?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
  const modeId = analysis?.status === "confirmed" ? analysis.binding?.modeId : null;
  const rawAttack = standalone?.data ?? weapon.attackRef?.path?.split(".").reduce((value, key) => value?.[key], actor);
  const rawFor = (type, variantId) => isCaseVariant(variantId) ? rawAttack :
    publishedLoadBaseline(modeId, type.ammoId, rawAttack, variantId)?.raw ?? rawAttack;
  const automatic = api?.automaticAmmunitionProfiles ?? new AutomaticAmmunitionProfileService({ catalogs: api?.catalogs, compatibility: api?.ammunitionCompatibility });
  const types = baseAmmunition(api?.ammunitionCompatibility, modeId, api?.catalogs, weapon.ammunitionBinding)
    .map(entry => {
      const type = { key: ammoTypeKey(entry), source: "catalog", name: entry.record.name,
        book: entry.book, kind: entry.kind, ammoId: entry.ammoId };
      type.name = ammoDisplayName(type, language);
      type.label = type.name + " — Базовый";
      if (SEALED_PLATFORM_UNITS[modeId]?.ammoId === type.ammoId && type.kind === "ammo-item") {
        type.sealedPlatformModeId = modeId;
        type.key = ammoTypeKey(type);
      }
      if (entry.record.book_cost_weight_verified) type.physical = { weightPerShotLb: entry.record.weight_per_shot_lb, costPerShot: entry.record.cost_per_shot_usd };
      const nativeCase = type.book === "ht" && sourceCaseVariant(api?.catalogs, modeId, entry.record);
      if (nativeCase) {
        const prepared = automatic.prepare({ modeId, base: type, variantId: nativeCase });
        type.unavailable = prepared.state !== "complete";
        type.reason = automaticAmmoText(prepared.reasons?.[0] ?? "Ready", language);
      }
      const nativeVariant = type.book === "ht" && (sourceExplosiveVariant(entry.record) ?? sourceEnvironmentVariant(entry.record) ?? sourceMultishotVariant(entry.record));
      if (nativeVariant) {
        const prepared = automatic.prepare({ modeId, base: type, variantId: nativeVariant });
        type.unavailable = prepared.state !== "complete";
        type.reason = explosiveText(prepared.reasons?.[0] ?? "P4Conditions", {}, language);
      }
      return type;
    });
  for (const base of [...types]) if (base.book === "ht" && base.kind === "ammo-item") {
    const relation=api?.ammunitionCompatibility?.checkCompatibility?.(modeId,base.ammoId,{book:base.book,kind:base.kind});
    base.substitution = relation?.relation?.type === 'directed-ht178' && !api?.catalogs?.getMode?.(modeId)?.ht_ammo_item_ids?.includes(base.ammoId);
    if (base.substitution) base.label=base.name+' — Заменяющий';
    if(alternateLoadNeedsBallistics(api?.catalogs,modeId,base.ammoId,relation)){
      base.ballisticsRequired=true;
      base.ballistics=selectedLoadBallistics({state:actor.getFlag?.('world','gurpsAmmoManager'),weaponId:weapon.id,modeId,type:base,catalogs:api?.catalogs,compatibility:relation});
      base.unavailable=!base.ballistics;base.reason=base.ballistics?'Характеристики введены владельцем; книга их не подтверждает.':'Введите Damage и Range заменяющего патрона для этого оружия.';continue;
    }
    for (const variantId of FIRST_STAGE_VARIANTS) {
      const variant = api?.catalogs?.getVariant?.("ht", variantId);
      if (!variant?.is_selectable) continue;
      let type = { ...base, recipe: { version: 1, variantId },
        name: base.name + " " + variantAbbreviation(variantId) };
      if (isExplosiveRecipe(type) || isAutomaticReferenceRecipe(type)) {
        let prepared = automatic.prepare({ modeId, base, variantId });
        if (prepared.type) type = { ...type, ...structuredClone(prepared.type) };
        const approval = readAmmunitionApproval({ actorId: actor.id, weaponId: weapon.id, modeId, type });
        if (isDUVariant(variantId) || isMultishotVariant(variantId)) prepared = automatic.prepare({ modeId, base, variantId, savedType: type, approval });
        const admission = automatic.admission(prepared, { policy: automaticAmmoPolicy(), approval });
        type.preparation = { ...structuredClone(prepared), type: undefined, admission };
        type.unavailable = !admission.allowed; type.key = ammoTypeKey(type); type.status = prepared.rulesStatus;
        const effect = rawAttack && isAutomaticReferenceRecipe(type) ? resolveAmmunitionEffects({ raw: rawFor(type, variantId), variantId,
          baseStatus: prepared.baseStatus, constructionStatus: admission.allowed ? admission.authority === "reference" ? prepared.referenceConfirmed ? "compatible" : prepared.rulesStatus : admission.authority : prepared.rulesStatus,
          facts: { ...prepared.facts, ...(approval?.active ? { plusPDecision: approval.plusPDecision } : {}) },
          context: { actorId: actor.id, weaponId: weapon.id, modeId, ammoId: base.ammoId } }) : null;
        if (effect && !effect.nativeSafe) type.unavailable = true;
        if (effect?.nativeSafe) type.physical = { weightPerShotLb: effect.rules.weightPerShotLb ?? base.physical?.weightPerShotLb,
          costPerShot: effect.rules.costPerShot ?? base.physical?.costPerShot };
        else delete type.physical;
        if (HT_AUTOMATIC_SPECIAL_RULES[variantId]) {
          type.support = effect?.support?.status ?? (type.unavailable ? "UNDETERMINED" : "AUTOMATED");
          if (type.unavailable && ["AUTOMATED", "GM-MEDIATED"].includes(type.support)) type.support = "UNDETERMINED";
          type.plusPDecision = approval?.plusPDecision ?? null;
        }
        type.label = type.name;
        type.reason = automaticAmmoText(prepared.reasons?.includes("plus-p-case-construction-unverified") ? "plus-p-case-construction-unverified" : HT_AUTOMATIC_SPECIAL_RULES[variantId] && type.unavailable ?
          variantId === "ht_plus_p" ? prepared.state === "complete" ? "ApprovalRequired" : "SpecialEvidenceRequired" : "SpecialEvidenceRequired" : prepared.state === "complete" ?
          admission.allowed ? admission.authority === "world-policy" ? "PolicyAllowed" : "Ready" : admission.authority === "revoked" ? "Revoked" : "ApprovalRequired" : "Incomplete", language);
        if (variantId === "ht_plus_p" && effect?.reason) type.reason = ammoEffectText(effect.reason, {}, { game: { i18n: { lang: language } } });
        if (variantId === "ht_plus_p" && prepared.facts?.nativeChargeBaseline?.construction === "underwater_dart" &&
            admission.authority === "approval-required") type.reason = automaticAmmoText("plus-p-individual-dart-required", language);
        if (variantId === "ht_plus_p" && prepared.reasons?.[0]?.startsWith("plus-p-") && prepared.state !== "complete")
          type.reason = automaticAmmoText(prepared.reasons[0], language);
        if (variantId === "ht_plus_p" && admission.authority === "pressure-proof-required")
          type.reason = automaticAmmoText("P1PressureProofRequired", language);
        if (isDUVariant(variantId)) {
          type.duDecision = approval?.duDecision ?? null;
          type.reason = (approval?.active === false ? ["Revoked"] : prepared.reasons?.length ? prepared.reasons : ["DUIncendiaryGM"])
            .map(key => automaticAmmoText(key, language)).join(" ");
        }
        if (isMultishotVariant(variantId)) {
          type.multishotDecision = approval?.multishotDecision ?? null; type.reviewRaw = structuredClone(rawAttack ?? {});
          type.reason = effect?.reason ? ammoEffectText(effect.reason, {}, { game: { i18n: { lang: language } } }) :
            automaticAmmoText(prepared.reasons?.[0] ?? (admission.authority === "revoked" ? "Revoked" : "Ready"), language);
          type.label = base.name+" "+automaticAmmoText("P3"+variantId,language);
        }
        if (isExplosiveVariant(variantId) && !["ht_apex","ht_aphex"].includes(variantId)) {
          type.reason=explosiveText(effect?.reason??prepared.reasons?.[0]??"P4Conditions",{},language);
        }
        if (isEnvironmentVariant(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P5" + variantId, language);
          type.reason = automaticAmmoText(effect?.reason ?? prepared.reasons?.[0] ?? "Ready", language);
        }
        if (isFuzeTracerVariant(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P6" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : effect?.reason ?? prepared.reasons?.[0] ?? "P6Manual" + variantId, language);
        }
        if (["ht_match_handloaded", "ht_silent"].includes(variantId)) {
          type.label = base.name + " " + automaticAmmoText("P1" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? effect?.reason ?? "Ready", language);
        }
        if (isCaseVariant(variantId)) {
          type.label = variantId === "ht_light_case" && prepared.nativePreserved ? base.name : base.name + " " + automaticAmmoText("P7" + variantId, language);
          type.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? effect?.reason ?? "Ready", language);
        }
        types.push(type); continue;
      }
      const assessment = assessAmmunitionRecipe(api?.ammunitionCompatibility, modeId, type);
      type.key = ammoTypeKey(type);
      type.unavailable = assessment.base?.status !== "compatible" || assessment.construction?.status !== "compatible";
      if (rawAttack && !type.unavailable && !resolveAmmunitionEffects({ raw: rawFor(type, variantId), variantId,
          baseStatus: assessment.base.status, constructionStatus: assessment.construction.status, facts: assessment.facts }).nativeSafe) type.unavailable = true;
      type.status = assessment.construction?.status ?? "undetermined";
      const explanation = t(type.status === "incompatible" ? "ConstructionIncompatible" : "ConstructionUnconfirmed");
      type.label = type.name;
      type.reason = type.unavailable ? explanation : "";
      types.push(type);
    }
  }
  for (const stock of inventory?.stocks ?? []) if (stock.type.recipe?.customId && stock.type.source === "catalog") {
    const approval = readAmmunitionApproval({ actorId: actor.id, weaponId: weapon.id, modeId, type: stock.type });
    if (stock.type.recipe.autoProfile) {
      const prepared = automatic.prepare({ modeId, base: { ...stock.type, name: api?.catalogs?.getAmmoItem(stock.type.book, stock.type.ammoId)?.name },
        variantId: stock.type.recipe.variantId, savedType: stock.type, approval });
      const admission = automatic.admission(prepared, { policy: automaticAmmoPolicy(), approval });
      const result = { ...stock.type, unavailable: !admission.allowed,
        preparation: { ...structuredClone(prepared), type: undefined, admission },
        label: stock.type.name,
        reason: automaticAmmoText(prepared.state === "complete" ? admission.allowed ? "Ready" : admission.authority === "revoked" ? "Revoked" : "ApprovalRequired" : "Incomplete", language) };
      const savedEffect = rawAttack && isAutomaticReferenceRecipe(stock.type) ? resolveAmmunitionEffects({ raw: rawFor(stock.type, stock.type.recipe.variantId), variantId: stock.type.recipe.variantId,
          baseStatus: prepared.baseStatus, constructionStatus: admission.allowed ? admission.authority === "reference" ? prepared.referenceConfirmed ? "compatible" : prepared.rulesStatus : admission.authority : prepared.rulesStatus,
          facts: { ...prepared.facts, ...(approval?.active ? { plusPDecision: approval.plusPDecision } : {}) },
          context: { actorId: actor.id, weaponId: weapon.id, modeId, ammoId: stock.type.ammoId } }) : null;
      if (savedEffect && !savedEffect.nativeSafe) result.unavailable = true;
      const savedRecord = api?.catalogs?.getAmmoItem(stock.type.book, stock.type.ammoId);
      if (savedEffect?.nativeSafe) result.physical = { weightPerShotLb: savedEffect.rules.weightPerShotLb ?? (savedRecord?.book_cost_weight_verified ? savedRecord.weight_per_shot_lb : null),
        costPerShot: savedEffect.rules.costPerShot ?? (savedRecord?.book_cost_weight_verified ? savedRecord.cost_per_shot_usd : null) };
      else delete result.physical;
      if (isCaseVariant(stock.type.recipe.variantId)) {
        result.label = stock.type.recipe.variantId === "ht_light_case" && prepared.nativePreserved ? ammoDisplayName({ source: "catalog", book: "ht", kind: "ammo-item", ammoId: stock.type.ammoId, name: savedRecord?.name ?? stock.type.name }, language) :
          (savedRecord?.name ?? stock.type.name) + " " + automaticAmmoText("P7" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? savedEffect?.reason ?? "Ready", language);
      }
      result.plusPDecision = approval?.plusPDecision ?? null;
      if (stock.type.recipe.variantId === "ht_plus_p" && admission.authority === "pressure-proof-required")
        result.reason = automaticAmmoText("P1PressureProofRequired", language);
      if (["ht_match_handloaded", "ht_silent"].includes(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P1" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(admission.authority === "revoked" ? "Revoked" : prepared.reasons?.[0] ?? savedEffect?.reason ?? "Ready", language);
      }
      if (isEnvironmentVariant(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P5" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(savedEffect?.reason ?? prepared.reasons?.[0] ?? "Ready", language);
      }
      if (isFuzeTracerVariant(stock.type.recipe.variantId)) {
        result.label = (api?.catalogs?.getAmmoItem("ht", stock.type.ammoId)?.name ?? stock.type.name) + " " + automaticAmmoText("P6" + stock.type.recipe.variantId, language);
        result.reason = automaticAmmoText(savedEffect?.reason ?? prepared.reasons?.[0] ?? "P6Manual" + stock.type.recipe.variantId, language);
      }
      if (isExplosiveVariant(stock.type.recipe.variantId) && !["ht_apex","ht_aphex"].includes(stock.type.recipe.variantId)) {
        result.reason=explosiveText(savedEffect?.reason??prepared.reasons?.[0]??"P4Conditions",{},language);
      }
      if (isMultishotVariant(stock.type.recipe.variantId)) {
        result.multishotDecision = approval?.multishotDecision ?? stock.type.recipe.parameters?.multishotDefinition;
        result.reviewRaw = structuredClone(rawAttack ?? {});
        result.reason = savedEffect?.reason ? ammoEffectText(savedEffect.reason, {}, { game: { i18n: { lang: language } } }) :
          automaticAmmoText(prepared.reasons?.[0] ?? (admission.authority === "revoked" ? "Revoked" : "Ready"), language);
        result.label = (api?.catalogs?.getAmmoItem("ht",stock.type.ammoId)?.name ?? stock.type.name)+" "+automaticAmmoText("P3"+stock.type.recipe.variantId,language);
      }
      if (isDUVariant(stock.type.recipe.variantId)) {
        result.duDecision = approval?.duDecision ?? null;
        result.reason = (approval?.active === false ? ["Revoked"] : prepared.reasons?.length ? prepared.reasons : ["DUIncendiaryGM"])
          .map(key => automaticAmmoText(key, language)).join(" ");
      }
      const index = types.findIndex(t=>t.key === stock.key);
      if (index >= 0) types[index] = result; else types.push(result);
      continue;
    }
    const assessment = assessAmmunitionRecipe(api?.ammunitionCompatibility, modeId, stock.type, approval);
    const authority = assessment.authority === "gm-approved" ? "GMApproved" : assessment.authority === "reference" ? "ReferenceConfirmed" :
      assessment.construction?.status === "incompatible" || assessment.base?.status === "incompatible" ? "Incompatible" : "Unknown";
    const model = isExplosiveRecipe(stock.type) ? calculateExplosiveRecipe(stock.type.recipe.variantId, stock.type.recipe.parameters ?? {}) : null;
    types.push({ ...stock.type, unavailable: assessment.base?.status !== "compatible" || !assessment.applicationAllowed || model?.status === "unresolved",
      ...(model ? { preparation: { state: model.status === "resolved" ? "complete" : "incomplete", origin: "gm", model,
        missing: missingExplosiveInputs(stock.type.recipe.parameters ?? {}), reasons: model.reasons,
        admission: { allowed: assessment.applicationAllowed, authority: assessment.authority } } } : {}),
      label: stock.type.name, reason: explosiveText(authority, {}, language), authority: assessment.authority });
  }
  // Keep legacy labels as legacy identities; never infer a catalog cartridge from free text.
  for (const stock of inventory?.stocks ?? []) if (stock.type.source === "legacy" &&
      (stock.rounds || inventory.magazines.some(m=>m.rounds && m.ammoKey===stock.key)))
    types.push({ ...stock.type, historical:true, unavailable:true,
      label: (stock.type.name || "Неизвестное прежнее название") + " — сохранённые остатки",
      reason:"У этого сохранённого типа нет подтверждённой каталожной идентичности. Остатки можно разрядить и удалить из свободного запаса." });
  // A saved family/item identity may be hidden by presentation dedup. Keep it when the service still confirms it.
  const compatible = api?.ammunitionCompatibility?.getCompatibleAmmunition(modeId)?.ammunition ?? [];
  for (const stock of inventory?.stocks ?? []) if (stock.type.source === "catalog" && !types.some(type => type.key === stock.key) &&
      compatible.some(entry => entry.status === "compatible" && ammoTypeKey(entry) === stock.key))
    types.push({ ...stock.type, label: stock.type.name });
  for (const type of types) {
    if(type.source==='catalog') {
      const relation=api?.ammunitionCompatibility?.checkCompatibility?.(modeId,type.ammoId,{book:type.book,kind:type.kind});
      if(relation?.status==='compatible' && relation.relation?.type==='directed-ht178' &&
          !api?.catalogs?.getMode?.(modeId)?.ht_ammo_item_ids?.includes(type.ammoId)) {
        type.substitution=true;
        if(!type.recipe)type.label=type.name+' — Заменяющий';
        if(alternateLoadNeedsBallistics(api?.catalogs,modeId,type.ammoId,relation)) {
          type.ballisticsRequired=true;
          type.ballistics=selectedLoadBallistics({state:actor.getFlag?.('world','gurpsAmmoManager'),weaponId:weapon.id,modeId,type,catalogs:api?.catalogs,compatibility:relation});
          if(!type.ballistics){type.unavailable=true;type.reason='Введите Damage и Range заменяющего патрона для этого оружия.';}
        }
      }
    }
    if (SEALED_PLATFORM_UNITS[modeId] && (type.recipe || type.sealedPlatformModeId !== modeId ||
        type.ammoId !== SEALED_PLATFORM_UNITS[modeId].ammoId)) {
      type.unavailable = true; type.reason = t("SealedResourceReview");
    }
    if (modeId === LEMAT.shotModeId && (type.source !== "catalog" || type.ammoId !== LEMAT.shotAmmoId)) {
      type.unavailable = true; type.reason = automaticAmmoText("LeMatIdentityReview", language);
    }
    const display = ammoDisplayName(type, language);
    if (display !== type.name && !isCaseVariant(type.recipe?.variantId)) type.label = display + (!type.recipe ? " — " + (type.substitution ? "Заменяющий" : "Базовый") : "");
  }
  return types;
}

export function availableAmmoTypes(...args) {
  return ammunitionCandidates(...args).filter(type => ammunitionChoiceGroup(type) !== 'hidden');
}

export function displayedAmmoTypes(actor, weapon, api, language = globalThis.game?.i18n?.lang ?? "en") {
  const t = name => ammoWindowText(name, language);
  const types = availableAmmoTypes(actor, weapon, api, language);
  for (const stock of weapon.ammunitionInventory?.stocks ?? []) if (!types.some(type => type.key === stock.key) &&
      (stock.rounds > 0 || weapon.ammunitionInventory.magazines.some(m=>m.rounds > 0 && m.ammoKey === stock.key))) {
    types.push({ ...stock.type, label: (stock.type.name || "Неизвестное прежнее название") + " — сохранённые остатки",
      historical:true, unavailable:true, reason:"Идентичность или конструкция этого сохранённого типа больше не подтверждается. Можно разрядить магазин и удалить остатки из свободного запаса; новое снаряжение закрыто." });
  }
  const standalone = weapon.standaloneWeaponId ? readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId) : null;
  const analysis = standalone ? standaloneCatalogBinding(standalone, api?.catalogs ?? globalThis.OleGURPSQOL?.catalogs) :
    (api ?? globalThis.OleGURPSQOL)?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path);
  if (analysis?.binding?.modeId === LEMAT.shotModeId) for (const type of types)
    if (type.source !== "catalog" || type.ammoId !== LEMAT.shotAmmoId) {
      type.unavailable = true; type.reason = automaticAmmoText("LeMatIdentityReview", language);
    }
  return [...new Map(types.map(type=>[type.key,type])).values()];
}

export function plusPApprovalHTML(option, language) {
  if (option?.recipe?.variantId !== "ht_plus_p") return "";
  const t = name => automaticAmmoText(name, language), decision = option.plusPDecision ?? {};
  return `<details data-plus-p-approval><summary>${escape(t("PlusPDecision"))}</summary><p>${escape(t("PlusPReliabilityGM"))}</p>` +
    (globalThis.game?.user?.isGM && option.preparation?.state === "complete" ?
      `<label>${escape(t("PlusPMalf"))}<input name="plusP-malf" type="number" step="1" max="0" value="${escape(decision.malfModifier ?? "")}"></label>
      <label>${escape(t("PlusPRoF"))}<input name="plusP-rof" type="number" step="1" min="1" value="${escape(decision.rof ?? "")}"></label>
      <label><input name="plusP-loading" type="checkbox" ${decision.loadingCheckPassed ? "checked" : ""}>${escape(t("PlusPLoading"))}</label>
      <div class="gam-inventory-actions"><button type="button" data-inventory-action="approve-recipe">${escape(t("PlusPAllow"))}</button>
      <button type="button" data-inventory-action="revoke-recipe">${escape(t("PlusPRevoke"))}</button></div>` : `<p>${escape(option.reason ?? "")}</p>`) + `</details>`;
}
export function duApprovalHTML(option, language) {
  const id = option?.recipe?.variantId;
  if (!isDUVariant(id)) return "";
  const t = name => automaticAmmoText(name, language), decision = option.duDecision ?? {}, facts = option.preparation?.facts ?? {};
  const platforms = id === "ht_apfsdsdu" ? ["tank_gun", "autocannon"] : ["autocannon", "source_verified_other_platform"];
  const platform = decision.platform ?? facts.weaponPlatforms?.values?.find(p => platforms.includes(p)) ?? "";
  return `<details data-du-approval><summary>${escape(t("DUDecision"))}</summary><p>${escape(t("DUIncendiaryGM"))}</p>` +
    (globalThis.game?.user?.isGM && option.recipe.autoProfile ?
      `<div class="gam-inventory-du-fields"><label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="du-design" type="checkbox" ${decision.designConfirmed ? "checked" : ""}>${escape(t("DUDesign"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUPlatform"))}<select name="du-platform"><option value="">${escape(t("DUPlatformChoose"))}</option>${platforms.map(p => `<option value="${p}" ${p === platform ? "selected" : ""}>${escape(t({ tank_gun: "DUTankGun", autocannon: "DUAutocannon", source_verified_other_platform: "DUOtherPlatform" }[p]))}</option>`).join("")}</select></label>
      <label>${escape(t("DUCaliber"))}<input name="du-caliber" type="number" min="0.01" step="any" value="${escape(facts.caliberMm ?? decision.caliberMm ?? "")}" ${Number.isFinite(facts.caliberMm) ? "readonly" : ""}></label>
      <label>${escape(t("DUAvailabilityTL"))}<input name="du-tl" type="number" min="8" step="1" value="${escape(facts.availabilityTL ?? decision.availabilityTL ?? "")}" ${Number.isInteger(facts.availabilityTL) ? "readonly" : ""}></label>
      <label class="gam-inventory-du-wide">${escape(t("DUSource"))}<input name="du-source" type="text" value="${escape(decision.source ?? "")}"></label>
      <div class="gam-inventory-actions gam-inventory-du-wide"><button type="button" data-inventory-action="approve-recipe">${escape(t("DUAllow"))}</button><button type="button" data-inventory-action="revoke-recipe">${escape(t("DURevoke"))}</button></div></div>` : `<p>${escape(option.reason ?? "")}</p>`) + `</details>`;
}
export function multishotApprovalHTML(option, language) {
  const id=option?.recipe?.variantId;
  if (!isMultishotVariant(id)) return "";
  const t=name=>automaticAmmoText(name,language), f=option.preparation?.facts ?? {}, d=option.multishotDecision ?? {}, o=f.multishotOption;
  if (!o) return `<p class="hint">${escape(option.reason ?? t("MultishotEvidenceRequired"))}</p>`;
  const number=(name,key,value,readonly=false)=>`<label>${escape(t(key))}<input name="p3-${name}" type="number" step="any" value="${escape(value ?? "")}" ${readonly?"readonly":""}></label>`;
  const many=["ht_shotshell","ht_canister","ht_multi_flechette","ht_rubber_shot","ht_buck_and_ball"].includes(id);
  const slug=["ht_rifled_slug","ht_baton","ht_beanbag"].includes(id);
  const special=["ht_shrapnel","ht_beehive","ht_abf"].includes(id);
  return `<details data-multishot-approval><summary>${escape(t("MultishotDecision"))}</summary><p>${escape(t("MultishotEvidenceRequired"))}</p>`+
    (globalThis.game?.user?.isGM ? `<div class="gam-inventory-du-fields">
      <label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-design" type="checkbox" ${d.designConfirmed?"checked":""}>${escape(t("MultishotDesign"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUPlatform"))}<select name="p3-platform"><option value="">${escape(t("DUPlatformChoose"))}</option>${(o.eligibility_v1.conditions.weapon_platforms_any ?? []).map(p=>`<option value="${p}" ${d.platform===p?"selected":""}>${escape(t("P3Platform"+p))}</option>`).join("")}</select></label>
      ${number("caliber","DUCaliber",f.caliberMm ?? d.caliberMm,Number.isFinite(f.caliberMm))}${number("tl","MultishotTL",f.availabilityTL ?? d.availabilityTL,Number.isInteger(f.availabilityTL))}
      ${many?number("count","MultishotCount",d.count)+ (id!=="ht_buck_and_ball"?number("diameter","MultishotDiameter",d.elementMm):""):""}
      ${id==="ht_shotshell"?`<label>${escape(t("MultishotShotSize"))}<select name="p3-size">${["buckshot","birdshot","smallshot"].map(s=>`<option value="${s}" ${d.shotSize===s?"selected":""}>${escape(t("P3Size"+s))}</option>`).join("")}</select></label>`:""}
      ${id==="ht_canister"?`<label>${escape(t("MultishotElementType"))}<select name="p3-type"><option value="pi+">pi+</option><option value="pi++" ${d.elementType==="pi++"?"selected":""}>pi++</option></select></label>`:""}
      ${slug?`<label>${escape(t("MultishotBaseline"))}<select name="p3-baseline"><option value="buckshot">${escape(t("P3Sizebuckshot"))}</option><option value="slug" ${d.baselineKind==="slug"?"selected":""}>${escape(t("P3ht_rifled_slug"))}</option>${id!=="ht_rifled_slug"?`<option value="solid" ${d.baselineKind==="solid"?"selected":""}>${escape(t("MultishotSolidBaseline"))}</option>`:""}</select></label>${number("rcl","MultishotSlugRcl",d.slugRcl)}`:""}
      ${special?number("burst","MultishotBurstDistance",d.burstDistance):""}
      ${many&&id!=="ht_buck_and_ball"&&id!=="ht_shotshell"?`<label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-b409" type="checkbox" ${d.b409Applicable?"checked":""}>${escape(t("MultishotB409"))}</label>`:""}
      <label class="gam-inventory-du-confirmation gam-inventory-du-wide"><input name="p3-native" type="checkbox" ${d.nativeVariant===id?"checked":""}>${escape(t("MultishotNative"))}</label>
      <label class="gam-inventory-du-wide">${escape(t("DUSource"))}<input name="p3-source" type="text" value="${escape(d.source ?? "")}"></label>
      <div class="gam-inventory-actions gam-inventory-du-wide"><button type="button" data-inventory-action="approve-recipe">${escape(t("DUAllow"))}</button><button type="button" data-inventory-action="revoke-recipe">${escape(t("DURevoke"))}</button></div></div>` : `<p>${escape(option.reason ?? "")}</p>`)+`</details>`;
}
export function ammoManagementHTML(weapon, ui, types) {
  const t = name => ammoWindowText(name, ui.language ?? globalThis.game?.i18n?.lang ?? "en");
  if (!weapon) return `<p role="status">${escape(t("WeaponMissing"))}</p>`;
  const inventory = weapon.ammunitionInventory;
  if (weapon.ammunitionReview || !validateInventory(inventory, weapon.id))
    return `<div class="gam-ammo-inventory"><h3>${escape(weapon.name)}</h3><p role="status">${escape(t("Review"))}</p></div>`;
  const magazine = inventory.magazines.find(entry => entry.id === ui.magazineId);
  const stock = inventory.stocks.find(entry => entry.key === ui.ammoKey);
  const option = types.find(entry => entry.key === ui.ammoKey);
  const resource = ammunitionResourceContract(option);
  const physical = inventoryPhysicalTotals(inventory, types).find(row => row.key === ui.ammoKey);
  const economics = physical && (physical.weightLb != null || physical.costUsd != null) ? `<div class="gam-inventory-line" data-ammo-physical><span>${escape(automaticAmmoText("P7AmmunitionMass", ui.language))}: ${physical.weightLb == null ? "—" : Number(physical.weightLb.toFixed(6)) + " lb"}</span><span>${escape(automaticAmmoText("P7AmmunitionCost", ui.language))}: ${physical.costUsd == null ? "—" : "$" + Number(physical.costUsd.toFixed(6))}</span></div>` : "";
  const fill = magazineFill(magazine?.rounds ?? 0, magazine?.capacity ?? 0);
  const ammunition = inventory.stocks.find(entry => entry.key === magazine?.ammoKey)?.type;
  const name = ammoDisplayName(ammunition, ui.language ?? globalThis.game?.i18n?.lang ?? "en");
  const installed = magazine?.id === inventory.installedId;
  const button = (action, text, disabled = false) => `<button type="button" data-inventory-action="${action}" ${disabled ? "disabled" : ""}>${escape(t(text))}</button>`;
  const detail = magazine ? `<div class="gam-inventory-detail" data-magazine-detail>
    <div class="gam-inventory-parameters">
      <strong>${escape(t("Magazine"))} №${inventory.magazines.indexOf(magazine) + 1}</strong>
      <span>${escape(t("Capacity"))}: ${magazine.capacity}</span>
      <p>${escape(t("Ammo"))}: ${escape(name || t("Empty"))}</p>
    </div>
    <div class="gam-inventory-controls">
    <div class="gam-inventory-line"><span>${installed ? escape(t("Installed")) : ""}</span><strong>${magazine.rounds}/${magazine.capacity}</strong></div>
    <div class="gam-inventory-bar" role="progressbar" aria-label="${escape(t("Magazine"))}" aria-valuemin="0" aria-valuemax="${magazine.capacity}" aria-valuenow="${magazine.rounds}"><span style="width:${fill.percent}%;background:hsl(${fill.hue} 78% 43%)"></span></div>
    <label>${escape(t("Quantity"))}<input type="number" name="magazineQuantity" min="1" step="1" value="${ui.magazineQuantity ?? resource?.capacity ?? Math.max(1, Math.min(magazine.capacity - magazine.rounds, stock?.rounds ?? 0))}"></label>
    <div class="gam-inventory-actions">${button("load", "Load", !option || option.unavailable || magazine.sealedUsed || magazine.rounds >= magazine.capacity)}${button("unload", "Unload", !magazine.rounds)}${button("unload-all", "UnloadAll", !magazine.rounds)}${button("delete-magazine", "Delete")}</div>
    </div>
  </div>` : `<p class="hint">${escape(t("NoMagazine"))}</p>`;
  return `<div class="standard-form gam-ammo-inventory">
    <h3 title="${escape(weapon.name)}">${escape(weapon.name)}</h3>
    <label>${escape(t("Ammo"))}<select name="inventoryAmmo"><option value="">${escape(t("NoAmmo"))}</option>${choiceGroupsHTML(types,ui.ammoKey,escape)}</select></label>
    ${option?.substitution ? '<strong class="gam-substitution" data-ammo-origin>Заменяющий</strong>' : ''}
    ${option?.ballisticsRequired ? `<details data-load-ballistics ${(ui.ballisticsOpen ?? !option.ballistics) ? 'open' : ''}><summary>Характеристики заменяющего патрона</summary><fieldset><p class="hint">Введите значения для этого оружия. Они сохраняются как решение владельца, а не данные книги. Если характеристики определяет ведущий, согласуйте их с ним.</p>${['damage','range'].map(field=>{const value=ui.ballisticsDraft?.[field]??option.ballistics?.[field]??'';return `<label>${field==='damage'?'Damage':'Range'}<input name="load-${field}" value="${escape(value)}" required aria-invalid="${!value}" class="${!value?'gam-required-missing':''}" placeholder="Требуется ввод"></label>`;}).join('')}<button type="button" data-inventory-action="save-load-ballistics">Сохранить характеристики</button></fieldset></details>` : ''}
    <div class="gam-inventory-line"><strong>${escape(t("Loose"))}: ${stock?.rounds ?? 0}</strong><span>${escape(t("Total"))}: ${weapon.totalAmmo}</span></div>
    ${economics}
    ${resource ? `<p class="hint" data-ammo-resource>${escape(t(resource.capacity === 5 ? "SealedClusterHint" : "DisposableTubeHint"))}</p>` : ""}
    <p class="hint">${escape(t("Scope"))}</p>
    ${option?.reason && option.unavailable ? `<p class="hint" data-ammo-identity-review>${escape(option.reason)}</p>` : ""}
    ${types.some(type => type.ammoId === LEMAT.shotAmmoId) ? `<p class="hint" data-charge-economics>${escape(automaticAmmoText("LeMatEconomicsUnknown", ui.language))}</p>` : ""}
    <label>${escape(t("Quantity"))}<div class="gam-inventory-stock"><input type="number" name="stockQuantity" min="1" step="1" value="${ui.stockQuantity ?? resource?.capacity ?? 1}">${button("add-stock", "Add", !option || option.unavailable)}${button("remove-stock", "Remove", !stock?.rounds)}</div></label>
    ${recipeEditorHTML(ui, option, ui.language ?? "ru")}
    ${handloadEditorHTML(option)}
    ${plusPApprovalHTML(option, ui.language ?? "ru")}
    ${duApprovalHTML(option, ui.language ?? "ru")}
    ${multishotApprovalHTML(option, ui.language ?? "ru")}
    <hr>
    <label><span class="gam-inventory-line"><strong>${escape(t("Magazines"))}</strong><span>${escape(t("Total"))}: ${inventory.magazines.length}</span></span>
      <select name="inventoryMagazine">${inventory.magazines.length ? inventory.magazines.map((entry, index) => `<option value="${escape(entry.id)}" ${entry.id === ui.magazineId ? "selected" : ""}>№${index + 1} · ${entry.capacity} · ${entry.rounds}/${entry.capacity}${entry.id === inventory.installedId ? " · " + escape(t("Installed")) : ""}</option>`).join("") : `<option value="">${escape(t("NoMagazine"))}</option>`}</select></label>
    ${detail}
    <details ${ui.addOpen ? "open" : ""} data-add-magazines><summary>${escape(t("AddMagazines"))}</summary><div class="gam-inventory-add">
      <label>${escape(t("Capacity"))}<input type="number" name="newCapacity" min="1" max="${ui.capacityLimit ?? lematBarrel(weapon.standaloneModeId)?.capacity ?? 100000}" step="1" value="${ui.newCapacity ?? resource?.capacity ?? ui.capacityLimit ?? lematBarrel(weapon.standaloneModeId)?.capacity ?? 30}"></label>
      <label>${escape(t("MagazineCount"))}<input type="number" name="newCount" min="1" max="100" step="1" value="${ui.newCount ?? 1}"></label>${button("add-magazines", "Add")}
    </div></details>
    <p class="hint" data-inventory-status role="status">${escape(ui.message ?? "")}</p>
  </div>`;
}

export class AmmoManagementApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { classes: ["olegurps-qol"], tag: "section",
    position: { width: 720, height: "auto" }, window: { resizable: false } };
  constructor({ actor, weaponId, onUpdate, language = "ru" }, options = {}) {
    super({ ...options, id: `olegurps-ammo-inventory-${actor.id}-${weaponId}`, window: { title: ammoWindowText("Title", language), ...options.window } });
    this.actor = actor; this.weaponId = weaponId; this.service = new AmmoService(actor); this.onUpdate = onUpdate;
    this.ui = { language }; this.busy = false; this._hook = null; this._closed = false;
    this._change = event => this._onChange(event);
    this._click = event => this._onClick(event);
    this._input = event => {
      if(['load-damage','load-range'].includes(event.target.name)){
        event.target.classList.toggle('gam-required-missing',!event.target.value.trim());
        event.target.setAttribute('aria-invalid',String(!event.target.value.trim()));return;
      }
      if (!event.target.matches("[data-recipe-field]")) return;
      this._captureInputs();
      const target = this.element.querySelector("[data-recipe-preview]");
      if (target) target.outerHTML = recipePreviewHTML(this.ui.recipe.variantId, this.ui.recipe.parameters, this.ui.language);
    };
  }
  async _prepareContext() {
    const state = await this.service.loadState();
    this.weapon = state.weapons.find(entry => entry.id === this.weaponId);
    const modeId = this.weapon?.standaloneModeId ?? globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor, this.weapon?.attackRef?.path)?.binding?.modeId;
    this.ui.capacityLimit = lematBarrel(modeId)?.capacity;
    const inventory = this.weapon?.ammunitionInventory;
    const types = this.weapon ? displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language) : [];
    if (!types.some(type => type.key === this.ui.ammoKey)) {
      const current=inventory?.magazines.find(m=>m.id===inventory.installedId)?.ammoKey;
      this.ui.ammoKey=types.find(type=>type.key===current)?.key??types[0]?.key??"";
    }
    if (!inventory?.magazines.some(entry => entry.id === this.ui.magazineId))
      this.ui.magazineId = inventory?.installedId ?? inventory?.magazines[0]?.id ?? "";
    return { weapon: this.weapon, types };
  }
  async _renderHTML(context) { return ammoManagementHTML(context.weapon, this.ui, context.types); }
  _replaceHTML(html, content) { content.innerHTML = html; }
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.element.dataset.inventoryListeners) {
      this.element.addEventListener("change", this._change);
      this.element.addEventListener("click", this._click);
      this.element.addEventListener("input", this._input);
      this.element.dataset.inventoryListeners = "true";
    }
    if (this._hook === null) this._hook = Hooks.on("updateActor", actor => {
      if (actor.id !== this.actor.id || this._closed) return;
      if (this.busy) this._pendingUpdate = true;
      else this.refresh().catch(error => console.error("OleGURPS ammunition refresh", error));
    });
    if (this._approvalHook == null) this._approvalHook = Hooks.on("updateSetting", setting => {
      if (!["olegurps-qol.ammunitionApprovals", "olegurps-qol.preparedAmmoPolicy"].includes(setting.key) || this._closed) return;
      if (this.busy) this._pendingUpdate = true;
      else this.refresh().catch(error => console.error("OleGURPS approval refresh", error));
    });
  }
  async refresh({ capture = true } = {}) {
    if (this._closed) return;
    if (capture) this._captureInputs();
    const context = await this._prepareContext();
    if (this._closed) return;
    const root = this.element?.querySelector(".window-content");
    if (root) this._replaceHTML(await this._renderHTML(context), root);
  }
  _captureInputs() {
    const root = this.element;
    captureRecipeInputs(root, this.ui);
    const ballistics = root?.querySelector('[data-load-ballistics]');
    if (ballistics) {
      this.ui.ballisticsDraft=Object.fromEntries(['damage','range'].map(field=>[field,root.querySelector(`[name="load-${field}"]`)?.value??'']));
      this.ui.ballisticsOpen = ballistics.open;
    }
    for (const [name, key] of [["stockQuantity", "stockQuantity"], ["magazineQuantity", "magazineQuantity"], ["newCapacity", "newCapacity"], ["newCount", "newCount"]]) {
      const input = root?.querySelector(`[name="${name}"]`);
      if (input) this.ui[key] = input.value === "" ? "" : Number(input.value);
    }
    this.ui.addOpen = root?.querySelector("[data-add-magazines]")?.open ?? this.ui.addOpen;
  }
  async _onChange(event) {
    this._captureInputs();
    if (event.target.name === "inventoryAmmo") {
      this.ui.ammoKey = event.target.value; this.ui.magazineQuantity = undefined;
      this.ui.ballisticsDraft = null;
      this.ui.ballisticsOpen = undefined;
      const selected = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
      this.ui.recipe = structuredClone(selected?.recipe ?? null);
      this.ui.recipeOpen = false;
      await this.refresh({ capture: false });
    }
    else if (event.target.name === "inventoryMagazine") { this.ui.magazineId = event.target.value; this.ui.magazineQuantity = undefined; await this.refreshMagazine(); }
  }
  async refreshMagazine() {
    const context = await this._prepareContext();
    if (this._closed) return;
    const template = document.createElement("template");
    template.innerHTML = await this._renderHTML(context);
    const current = this.element?.querySelector("[data-magazine-detail]");
    const next = template.content.querySelector("[data-magazine-detail]");
    if (current && next) current.replaceWith(next);
    else await this.refresh({ capture: false });
  }
  async _onClick(event) {
    const button = event.target.closest("[data-inventory-action]");
    if (!button) return;
    event.preventDefault(); this._captureInputs();
    const operation = button.dataset.inventoryAction;
    if (operation === 'save-load-ballistics') {
      if (this.busy) return;
      this.busy=true;
      try {
        const option=displayedAmmoTypes(this.actor,this.weapon,undefined,this.ui.language).find(t=>t.key===this.ui.ammoKey);
        const modeId=this.weapon.standaloneModeId??globalThis.OleGURPSQOL?.weaponCatalogBindings?.analyzeMode(this.actor,this.weapon.attackRef?.path)?.binding?.modeId;
        const state=await this.service.saveLoadBallistics(this.weaponId,modeId,option,this.ui.ballisticsDraft);
        this.ui.ballisticsOpen=false;
        this.ui.message='Характеристики сохранены.';await this.onUpdate?.(state);
      } catch(error) {this.ui.message=ammoWindowText(error.message,this.ui.language);ui.notifications.error(this.ui.message);}
      finally {this.busy=false;await this.refresh({capture:false});}
      return;
    }
    if (operation === "register-handload") {
      if (this.busy || !game.user?.isGM) return;
      this.busy = true;
      try {
        const api = globalThis.OleGURPSQOL;
        const option = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
        const standalone = this.weapon.standaloneWeaponId ? readStandaloneAttack(this.actor, this.weapon.standaloneWeaponId, this.weapon.standaloneModeId) : null;
        const binding = standalone ? standaloneCatalogBinding(standalone, api.catalogs) : api.weaponCatalogBindings.analyzeMode(this.actor, this.weapon.attackRef?.path);
        if (binding?.status !== "confirmed") throw Error(f4Text("BatchBlocked"));
        const modeId = binding.binding.modeId, variant = api.catalogs.getVariant("ht", "ht_match_handloaded");
        const base = api.ammunitionCompatibility.checkCompatibility(modeId, option?.ammoId, {book:"ht",kind:"ammo-item"});
        if (base?.status !== "compatible") throw Error(f4Text("BatchBlocked"));
        const review = api.ammunitionCompatibility.checkCompatibility(modeId, "ht_match_handloaded", {book:"ht",kind:"cartridge-upgrade",ammoItemId:option.ammoId});
        const input = Object.fromEntries(["batch","source","armoury","iqGuns"].map(k=>[k,this.element.querySelector(`[name="handload-${k}"]`)?.value??""]));
        input.confirmed = this.element.querySelector('[name="handload-confirmed"]')?.checked === true;
        const type = createRegisteredHandload({actor:this.actor,weapon:this.weapon,type:option,modeId,facts:review.eligibility?.facts,option:variant,input});
        // Save a new zero-round recipe first. If approval fails it stays unavailable, never a partial ready load.
        await this.service.inventoryTransaction(this.weaponId, "save-recipe", {type});
        await setAmmunitionApproval({actor:this.actor,weapon:this.weapon,type,active:true});
        this.ui.ammoKey = type.key;this.ui.message = f4Text("SavedBatch");
        await this.onUpdate?.(await this.service.loadState());
      } catch (error) { this.ui.message = f4Text("BatchBlocked"); ui.notifications.error(this.ui.message); }
      finally { this.busy = false;await this.refresh({capture:false}); }
      return;
    }
    if (["save-custom-recipe", "approve-recipe", "revoke-recipe"].includes(operation)) {
      if (this.busy || !game.user?.isGM) return;
      this.busy = true;
      let type;
      try {
        const option = displayedAmmoTypes(this.actor, this.weapon, undefined, this.ui.language).find(t=>t.key === this.ui.ammoKey);
        type = option;
        if (operation === "save-custom-recipe") {
          if (option?.book !== "ht" || option.kind !== "ammo-item") throw Error("ApprovalScopeRequired");
          const base = globalThis.OleGURPSQOL.catalogs.getAmmoItem("ht", option.ammoId), draft = this.ui.recipe;
          type = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: option.ammoId,
            name: base.name + " " + variantAbbreviation(draft.variantId) + (draft.label ? " · " + draft.label : ""),
            recipe: { version: 1, variantId: draft.variantId, customId: crypto.randomUUID(),
              label: draft.label, parameters: structuredClone(draft.parameters) } };
          type.key = ammoTypeKey(type);
        }
        const numericDecision = name => { const value = this.element.querySelector(`[name="plusP-${name}"]`)?.value.trim();
          return value ? Number(value) : null; };
        let multishotDecision=null;
        if (isMultishotVariant(type?.recipe?.variantId) && operation!=="revoke-recipe") {
          const val=name=>this.element.querySelector(`[name="p3-${name}"]`)?.value;
          const num=name=>val(name)?.trim() ? Number(val(name)) : undefined;
          const raw=option.reviewRaw ?? {}, id=type.recipe.variantId;
          multishotDecision={ designConfirmed:this.element.querySelector('[name="p3-design"]')?.checked===true,
            platform:val("platform"),source:val("source"),caliberMm:num("caliber"),availabilityTL:num("tl"),
            ...(num("count")!=null?{count:num("count")}:{}),...(num("diameter")!=null?{elementMm:num("diameter")}:{}),
            ...(val("size")?{shotSize:val("size")}:{}),...(val("type")?{elementType:val("type")}:{}),
            ...(val("baseline")?{baselineKind:val("baseline"),slugRcl:num("rcl")}:{}),
            ...(num("burst")!=null?{burstDistance:num("burst")}:{}),
            ...(this.element.querySelector('[name="p3-b409"]')?.checked?{b409Applicable:true}:{}),
            ...(this.element.querySelector('[name="p3-native"]')?.checked?{nativeVariant:id,nativeDamage:raw.damage,nativeRange:raw.range,nativeRoF:raw.rof,nativeRcl:raw.rcl}:{}) };
          type=bindMultishotDefinition(type,multishotDecision);
        }
        await setAmmunitionApproval({ actor: this.actor, weapon: this.weapon, type, active: operation !== "revoke-recipe",
          ...(multishotDecision?{multishotDecision}:{}),
          ...(isDUVariant(type.recipe?.variantId) ? { duDecision: {
            designConfirmed: this.element.querySelector('[name="du-design"]')?.checked === true,
            platform: this.element.querySelector('[name="du-platform"]')?.value,
            source: this.element.querySelector('[name="du-source"]')?.value,
            caliberMm: Number(this.element.querySelector('[name="du-caliber"]')?.value),
            availabilityTL: Number(this.element.querySelector('[name="du-tl"]')?.value) } } : {}),
          ...(type.recipe?.variantId === "ht_plus_p" ? { plusPDecision: { malfModifier: numericDecision("malf"),
            rof: numericDecision("rof"), loadingCheckPassed: this.element.querySelector('[name="plusP-loading"]')?.checked === true } } : {}) });
        if (operation === "save-custom-recipe" || multishotDecision && !this.weapon.ammunitionInventory.stocks.some(s=>s.key===type.key))
          await this.service.inventoryTransaction(this.weaponId, "save-recipe", { type });
        this.ui.ammoKey = type.key; this.ui.message = "";
        await this.onUpdate?.(await this.service.loadState());
      } catch (error) {
        this.ui.message = (isDUVariant(type?.recipe?.variantId) && error.message.startsWith("DU") || error.message.startsWith("Multishot")) ? automaticAmmoText(error.message, this.ui.language) : explosiveText(error.message, {}, this.ui.language);
        ui.notifications.error(this.ui.message);
      } finally { this.busy = false; await this.refresh({ capture: false }); }
      return;
    }
    const entry = this.weapon?.ammunitionInventory?.magazines.find(item => item.id === this.ui.magazineId);
    await this._operate(operation === "unload-all" ? "unload" : operation, {
      magazineId: this.ui.magazineId, ammoKey: this.ui.ammoKey,
      amount: operation === "add-magazines" ? this.ui.newCount ?? 1 :
        operation.endsWith("stock") ? this.ui.stockQuantity ?? 1 : operation === "unload-all" ? entry?.rounds : this.ui.magazineQuantity,
      capacity: this.ui.newCapacity ?? this.ui.capacityLimit ?? 30 });
  }
  async _operate(operation, args) {
    if (this.busy || this._closed) return;
    this.busy = true;
    this.element?.setAttribute?.('aria-busy','true');
    const busyButtons=[...this.element?.querySelectorAll?.('[data-inventory-action]')??[]];
    const disabled=busyButtons.map(b=>b.disabled);busyButtons.forEach(b=>b.disabled=true);
    const status=this.element?.querySelector('[data-inventory-status]');
    if(status)status.textContent=ammoWindowText(operation==='load'?'Loading':operation==='unload'?'Unloading':'Saving',this.ui.language);
    try {
      const state = await this.service.inventoryTransaction(this.weaponId, operation, args,
        { allowedTypes: weapon => availableAmmoTypes(this.actor, weapon, undefined, this.ui.language) });
      if (operation === "add-magazines") this.ui.magazineId = state.weapons.find(entry => entry.id === this.weaponId).ammunitionInventory.magazines.at(-args.amount).id;
      this.ui.message = "";
      await this.onUpdate?.(state);
    } catch (error) { this.ui.message = ammoWindowText(error.message, this.ui.language); ui.notifications.error(this.ui.message); }
    finally { this.busy = false; this._pendingUpdate = false; this.element?.removeAttribute?.('aria-busy');
      busyButtons.forEach((b,i)=>{if(b.isConnected)b.disabled=disabled[i];});
      this.ui.magazineQuantity = undefined; await this.refresh({ capture: false }); }
  }
  async close(options = {}) {
    this._closed = true;
    if (this._hook !== null) { Hooks.off("updateActor", this._hook); this._hook = null; }
    if (this._approvalHook != null) { Hooks.off("updateSetting", this._approvalHook); this._approvalHook = null; }
    this.element?.removeEventListener("change", this._change);
    this.element?.removeEventListener("click", this._click);
    this.element?.removeEventListener("input", this._input);
    windows.delete(`${this.actor.id}:${this.weaponId}`);
    return super.close(options);
  }
}

export async function openAmmoManagement({ actor, weaponId, onUpdate, language = "ru" }) {
  const key = `${actor.id}:${weaponId}`;
  const existing = windows.get(key);
  if (existing?.rendered) { existing.bringToFront(); return existing; }
  if (actor.isOwner === false && !globalThis.game?.user?.isGM) throw new Error(t("Permission"));
  const service = new AmmoService(actor);
  const state = await service.inventoryTransaction(weaponId, "initialize");
  await onUpdate?.(state);
  const app = new AmmoManagementApp({ actor, weaponId, onUpdate, language });
  windows.set(key, app);
  try { await app.render({ force: true }); return app; }
  catch (error) { await app.close(); throw error; }
}
