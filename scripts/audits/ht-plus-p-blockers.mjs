import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../catalog-service.js";
import { AmmunitionCompatibilityService } from "../ammunition-compatibility-service.js";
import { AutomaticAmmunitionProfileService } from "../tools/automatic-ammunition-profiles.js";
import { AttackProfileResolver } from "../tools/attack-profile-resolver.js";
import { parseKineticDamage, parseDamageRange, scaleRequiredStrength, htDamageDice,
  resolveAmmunitionEffects } from "../tools/ammunition-effects.js";
import { HT_KINETIC_FAMILY_FACTS } from "../ht-kinetic-family-data.js";
import { parseWeaponBulk } from "../tools/weapon-bulk.js";

export const categories = {
  A: "Ошибка каталога или парсера",
  B: "Избыточный вход в ветку подтверждения +P",
  C: "Численно готово, осталось решение GM",
  D: "Отсутствует обязательный компонент исходного профиля",
  E: "Подтверждённо иной принцип действия, несовместимый с усиленным пороховым зарядом",
  F: "Применимость к платформе не установлена",
  G: "Существующий движок не поддерживает исходный тип или происхождение эффекта"
};

/** Audit only: no permissions, catalog changes, saved flags, Actor writes or general coverage scan. */
export function auditPlusPBlockers({ catalogs, compatibility }) {
  const automatic = new AutomaticAmmunitionProfileService({ catalogs, compatibility });
  const resolver = new AttackProfileResolver({ catalogs, compatibility, automaticProfiles: automatic });
  const rows = [], all = [], counts = Object.fromEntries(Object.keys(categories).map(k => [k, 0]));
  for (const ammo of catalogs.getCatalog("ht").ammo_items) for (const modeId of ammo.weapon_mode_ids) {
    const mode = catalogs.getMode(modeId), equipment = catalogs.getEquipmentForMode(modeId);
    const base = { source: "catalog", book: "ht", kind: "ammo-item", ammoId: ammo.id, name: ammo.name };
    const raw = { name: equipment.name, damage: mode.raw_calc.damage, range: mode.stats.range,
      st: mode.stats.strength, acc: mode.stats.accuracy, rof: mode.stats.rate_of_fire, rcl: mode.stats.recoil, bulk: mode.stats.bulk };
    const baseline = compatibility.checkCompatibility(modeId, ammo.id, { book: "ht", kind: "ammo-item" });
    const rules = compatibility.checkCompatibility(modeId, "ht_plus_p", { book: "ht", kind: "cartridge-upgrade", ammoItemId: ammo.id });
    const prepared = automatic.prepare({ modeId, base, variantId: "ht_plus_p" });
    const profile = resolver.resolve({ actorId: "read-only-audit", rawAttack: raw,
      binding: { status: "confirmed", binding: { confirmed: true, modeId } },
      ammunition: { type: prepared.type ?? { ...base, recipe: { version: 1, variantId: "ht_plus_p" } } }, profilePolicy: "permissive" });
    all.push({ modeId, ammoItemId: ammo.id, ready: profile.damage.nativeSafe, reason: profile.damage.reason ?? null });
    // This is exactly the previous 227 unconfirmed-context rows, not the separate FN range defect.
    if (profile.damage.reason !== "unconfirmed-compatibility") continue;
    const facts = rules.eligibility?.facts ?? {}, kinetic = parseKineticDamage(raw.damage), range = parseDamageRange(raw.range);
    const scaledST = scaleRequiredStrength(raw.st), st = scaledST === null ? null : {
      minimum: Number.parseInt(String(raw.st)), suffix: String(raw.st).replace(/^\d+/, ""), scaled: scaledST };
    const missingParameters = [], restrictions = [];
    const require = (parameter, reason, scope) => missingParameters.push({ parameter, reason, scope });
    if (!raw.damage) require("Damage", "Без исходной формулы нельзя применить HT165 ×1.1.", "numeric");
    if (!range) require("Range.halfDamage/maximum", "Для HT165 ×1.1 нужны обе исходные дальности; единственная дальность не определяет вторую.", "numeric");
    if (!st) require("Minimum ST", "Для HT165 ×1.1 нужен исходный минимальный ST с сохранением суффикса.", "numeric");
    const failedChecks = (rules.eligibility?.checks ?? []).filter(c => c.status !== "confirmed");
    for (const check of failedChecks) {
      const pressure = check.field === "explicit_evidence_required.weapon_pressure_rating_verified";
      const tl = check.field === "min_tl";
      require(pressure ? "source-backed platform approval" : tl ? "ammunition availabilityTL" : check.field,
        pressure ? "Это подтверждение безопасности платформы, не численное давление и не вход Damage/Range/ST; GM/world-policy уже допускает неизвестную безопасность полного профиля." :
        tl ? "Нужен только допуск доступности варианта; общий +P min_tl=4 уже хранится в HT1.3, но факты availabilityTL заполняются лишь через ветку кинетических семейств." : check.detail,
        pressure ? "GM-admission" : "eligibility");
      restrictions.push({ code: check.field, status: check.status, detail: check.detail });
    }
    // Explain every short-circuit of the existing shared evidence gate independently.
    const evidenceGate = {
      reviewedFamily: !!HT_KINETIC_FAMILY_FACTS[ammo.id],
      smallArms: ammo.ammunition_class === "small_arms_cartridge",
      fixedCase: ammo.ammunition_construction === "fixed_cased",
      visibleRangedAttack: mode.role === "attack" && !mode.hidden && mode.combat_type === "ranged",
      firearmFamily: mode.weapon_family === "firearm",
      exactChambering: mode.ht_ammo_resolution?.status === "exact_chambering",
      nativeLink: ammo.weapon_mode_ids.includes(modeId),
      noLinkedModes: !ammo.native_linked_mode_ids?.length,
      noResolutionFlags: !mode.resolution_flags?.length,
      neutralPiercingFormula: /^\d+(?:\.\d+)?d(?:[+-]\d+){0,2}(?:x\d+)? (pi-|pi|pi\+|pi\+\+)$/.test(raw.damage ?? "")
    };
    for (const [field, passed] of Object.entries(evidenceGate)) if (!passed)
      restrictions.push({ code: "applyHTClassEvidence." + field, status: "evidence-gate-failed",
        detail: "Ранний выход общей ветки также не заполняет availabilityTL для +P; это не отдельный запрет HT165." });
    if (!kinetic && raw.damage) restrictions.push({ code: "unsupported-or-compound-native-damage", status: "engine-block",
      detail: "Исходный Damage существует, но текущий преобразователь +P распознаёт одну piercing-формулу; это не отсутствие Damage." });
    if (kinetic?.divisor !== undefined && kinetic.divisor !== 1) restrictions.push({ code: "native-armor-divisor-needs-explicit-provenance", status: "engine-block",
      detail: "Бронеделитель уже присутствует в исходной формуле. Движок требует происхождение, а не повторное применение конструкции." });
    if (ammo.native_linked_mode_ids?.length || mode.resolution_flags?.length)
      restrictions.push({ code: "native-components-or-effects", status: "scope-review",
        detail: "Нужно определить исходную составляющую, которую изменяет усиленный заряд; не изменять взрыв/Follow-Up автоматически.",
        linkedModeIds: ammo.native_linked_mode_ids ?? [], flags: mode.resolution_flags ?? [] });
    const loading = ammo.ammunition_construction === "powder_and_shot" || ammo.ammunition_class === "separate_powder_and_shot";
    if (loading) restrictions.push({ code: "plus-p-loading-check-required", status: "GM-condition",
      detail: "До снаряжения GM подтверждает Armoury (Small Arms) или IQ-based Guns−2; это не штраф стрелка и не недостающий численный вход." });
    const standaloneReadinessRestrictions = [];
    if (raw.acc === null || !Number.isFinite(Number(String(raw.acc).split("+")[0]))) standaloneReadinessRestrictions.push("Acc");
    if (!/^\d+$/.test(String(raw.rcl)) || Number(raw.rcl) < 1) standaloneReadinessRestrictions.push("Rcl");
    if (!/\d/.test(String(raw.rof ?? ""))) standaloneReadinessRestrictions.push("RoF");
    if (!parseWeaponBulk(raw.bulk)) standaloneReadinessRestrictions.push("Bulk");
    for (const field of standaloneReadinessRestrictions) restrictions.push({ code: "standalone-readiness." + field, status: "downstream-UI-block",
      detail: "Текущий readStandaloneAttack требует это поле в поддерживаемом формате. К численному преобразованию +P это требование не относится; native GGA может иметь иной путь." });
    const knownSmallArm = ["firearm", "gunner"].includes(mode.weapon_family) &&
      ["small_arms_cartridge", "shotgun_shell", "separate_powder_and_shot"].includes(ammo.ammunition_class) &&
      ["fixed_cased", "powder_and_shot"].includes(ammo.ammunition_construction);
    const nonPowder = ammo.ammunition_construction === "pneumatic" || ammo.ammunition_class === "proprietary_electrical_cartridge";
    let scaledDice = null;
    if (kinetic) try { scaledDice = htDamageDice(kinetic.dice, kinetic.adds, kinetic.multiplier, 1.1); }
    catch { restrictions.push({ code: "HT166-dice-conversion-domain", status: "engine-block",
      detail: "Формула разобрана, но текущая HT166-конверсия не обрабатывает неположительное эквивалентное число кубиков. Это ограничение алгоритма, не отсутствие Damage." }); }
    const numericPossible = !!scaledDice && !!range && !!st;
    const engineInputsReady = numericPossible && kinetic.divisor === 1 && !ammo.native_linked_mode_ids?.length && !mode.resolution_flags?.length;
    const conditionallyComputed = engineInputsReady ? resolveAmmunitionEffects({ raw, variantId: "ht_plus_p", baseStatus: "compatible",
      constructionStatus: "gm-approved", facts: { ...facts,
        munitionClasses: { values: loading ? ["powder_and_shot"] : ["fixed_round"] }, plusPDecision: { loadingCheckPassed: true } } }) : null;
    const category = nonPowder ? "E" : !knownSmallArm ? "F" :
      !raw.damage || !range || !st ? "D" : !engineInputsReady ? "G" :
      failedChecks.some(c => c.field !== "explicit_evidence_required.weapon_pressure_rating_verified") ? "B" : "C";
    const actualReason = category === "E" ? "Каталог явно указывает пневматический или электрический принцип: усиленный пороховой заряд +P неприменим. Runtime-статус undetermined не менялся." :
      category === "F" ? "Нет достаточного подтверждения применения HT165 к этой платформе/конструкции. Полный набор чисел не доказывает применимость." :
      category === "G" ? "Кроме допуска, текущий движок не поддерживает тип/составляющую Damage или происхождение уже имеющегося бронеделителя." :
      category === "D" ? "У применимой по классу платформы отсутствует обязательный исходный численный компонент." :
      category === "B" ? "Численные входы и общий класс допуска подтверждены, но заполнение availabilityTL заблокировано более узким кинетическим gate. Калибр, таблица семейств и численное давление не нужны для HT165 ×1.1; допуск GM остаётся отдельным." :
      "Численный профиль готов, требуется отдельное решение GM о допуске платформы.";
    counts[category]++;
    rows.push({ modeId, equipmentId: equipment.equipment_id, equipmentName: equipment.name,
      ammoItemId: ammo.id, ammoFamilyId: ammo.ammo_family_id, variantId: "ht_plus_p", raw,
      rawSource: "Weapon Reference native GCS source statistics; not a read of any existing Actor.system",
      parsed: { damage: kinetic, range, st, catalogDamage: mode.stats.damage,
        damageStatus: !raw.damage ? "missing" : kinetic ? "parsed" : "present-but-not-supported-by-plus-p-parser" },
      compatibility: { base: baseline.status, variant: rules.status, reasons: rules.reasons },
      eligibilityRestrictions: failedChecks, evidenceGate, missingParameters,
      numericalCalculation: { possible: numericPossible, currentEngineInputsReady: engineInputsReady,
        applicabilityProven: knownSmallArm && !nonPowder, physicalPressureRequired: false, malfAndRoFRequired: false,
        hypothetical: numericPossible ? { damage: scaledDice +
          (kinetic.divisor !== 1 ? "(" + kinetic.divisor + ")" : "") + kinetic.minimum + " " + kinetic.type + kinetic.suffix,
          range: Math.round(range.halfDamage * 1.1) + "/" + Math.round(range.maximum * 1.1), st: scaledST, costMultiplier: 1.5,
          diagnosticOnly: true, admissionOrEffectImplementationImplied: false } : null,
        sharedEngineConditional: conditionallyComputed ? { nativeSafe: conditionallyComputed.nativeSafe,
          formula: conditionallyComputed.formula, effectiveChanges: conditionallyComputed.effectiveChanges } : null },
      GM: { requiredForPlayablePlusP: !nonPowder, platformSafety: "unconfirmed; a world policy/GM decision is not official compatibility",
        loadingCheckRequired: loading, malf: "manual; unknown quality is not Cheap", rof: "manual; missing individual decision preserves original RoF",
        approvalCurrentlyCanResolve: prepared.state === "complete" },
      preparedState: prepared.state, runtimeReason: profile.damage.reason, primaryCategory: category,
      downstreamStandaloneReadiness: { restrictions: standaloneReadinessRestrictions, governingSkill: "Actor-dependent; not inspected by this catalog-only audit" },
      primaryReason: actualReason, secondaryRestrictions: restrictions,
      source: { numericalRules: "HT165/166; user-confirmed task requirements", eligibility: "HT1.3 eligibility_v1",
        platform: equipment.reference, evidenceGate: "scripts/ht-ammunition-evidence.js:applyHTClassEvidence" } });
  }
  return { version: 1, scope: "511 native +P pairs only; previous 227 unconfirmed-context refusals",
    noGeneral32704Audit: true, catalogsMutated: false, eligibilityPolicyChanged: false,
    examined: all.length, ready: all.filter(r => r.ready).length, rows: rows.sort((a,b) => a.modeId.localeCompare(b.modeId)),
    categories: Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, { name: categories[id], count }])),
    summary: { refusals: rows.length, numericComplete: rows.filter(r => r.numericalCalculation.possible).length,
      supportedArithmeticAfterEvidenceReview: rows.filter(r => ["B", "C"].includes(r.primaryCategory) && r.numericalCalculation.sharedEngineConditional?.nativeSafe).length,
      arithmeticCandidatesWithAdditionalStandaloneUIBlocks: rows.filter(r => ["B", "C"].includes(r.primaryCategory) && r.downstreamStandaloneReadiness.restrictions.length).length,
      immediatelyResolvedByGMApprovalAlone: rows.filter(r => r.GM.approvalCurrentlyCanResolve).length,
      provenNonPowderIncompatible: counts.E, genuinelyMissingNumericInputsForApplicableClass: counts.D,
      unsupportedInputFormulaOrProvenance: counts.G, platformReviewNeeded: counts.F,
      missingRangeRegardlessOfApplicability: rows.filter(r => !r.parsed.range).length,
      missingDamageRegardlessOfApplicability: rows.filter(r => !r.raw.damage).length,
      missingSTRegardlessOfApplicability: rows.filter(r => !r.parsed.st).length },
    pressureGate: { physicalPressureRequired: false, unknownPressureAloneAlreadyAcceptedForCompleteProfiles: true,
      verifiedPressureIsOfficialSafetyEvidence: true, GMAdmissionIsNotOfficialCompatibility: true,
      reasonFor227: "availabilityTL and/or class context blocked earlier; the pressure evidence requirement alone is already exempted in prepareSpecial", policyChanged: false },
    otherNonreadyPairs: all.filter(r => !r.ready && !rows.some(row => row.modeId === r.modeId && row.ammoItemId === r.ammoItemId)) };
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/").split("/").at(-1))) {
  const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([b, d]) => [b,
    JSON.parse(await fs.readFile(new URL("../../data/catalogs/" + d.filename, import.meta.url), "utf8"))])));
  const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
    json: async () => data[Object.keys(CATALOG_DEFINITIONS).find(b => url.endsWith(CATALOG_DEFINITIONS[b].filename))] }) });
  await catalogs.load();
  const report = auditPlusPBlockers({ catalogs, compatibility: new AmmunitionCompatibilityService(catalogs) });
  const previous = JSON.parse(await fs.readFile(new URL("../../docs/audit/ht-special-ammunition-after.json", import.meta.url), "utf8"));
  report.previousAggregate = previous.variants.ht_plus_p;
  if (report.rows.length !== 227 || report.examined !== 511 || report.ready !== 284 || report.otherNonreadyPairs.length)
    throw Error("PlusPAuditScopeOrBaselineChanged");
  await fs.writeFile(new URL("../../docs/audit/ht-plus-p-blockers.json", import.meta.url), JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ examined: report.examined, ready: report.ready, summary: report.summary, categories: report.categories }));
}
