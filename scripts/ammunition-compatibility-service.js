import { CATALOG_DEFINITIONS } from "./catalog-service.js";
import { ltBowPhysicalAdmission } from './lt-bow-source.js';
import {isLTProcedureMode} from './lt-personal-source.js';
import {ltEarlyPhysicalAdmission,ltEarlyProfile} from './lt-early-firearms-source.js';
import {ltFlameProfile} from './lt-flame-source.js';
import {ltArtilleryProfile,ltArtilleryFutureLoad} from './lt-artillery-source.js';
import { LT_PHYSICAL_LOAD_RESTRICTIONS, LT_LEAD_BUNDLE_MODES, LT_OVERWEIGHT_MODES } from './lt-physical-ammunition-evidence.js';
import { utCompatibilityDecision } from './ut-compatibility-policy.js';
import { correctHTAmmo } from "./ht-physical-ammunition-evidence.js";
import { htIdentityNeedsReview } from "./ht-source-corrections.js";
import { moduleText } from "./localization.js";
import { HT_PRE_GAUSS_AMMO, htPreGaussProfile } from './ht-pre-gauss-profiles.js';
import { gaussProfile, GAUSS_PROJECT_POLICY } from './ut-gauss-source.js';
import { evaluateHTOptionEligibility, resolveHTCatalogFacts } from "./ht-option-eligibility.js";

const BOOKS = ["lt", "ht", "ut"];
const COLLECTIONS = {
  lt: { ammo_items: "ammo-item", ammo_families: "ammo-family", projectile_options: "projectile-option", other_referenced_options: "reference-option" },
  ht: { ammo_items: "ammo-item", ammo_families: "ammo-family", cartridge_upgrades: "cartridge-upgrade", projectile_options: "projectile-option", projectile_upgrades: "projectile-upgrade", case_construction_options: "case-option", feed_devices_reference_only: "feed-device" },
  ut: { ammo_families: "ammo-family", special_loads: "special-load", warheads: "warhead" }
};
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
const snapshot = value => freeze(structuredClone(value));
const reason = (code, message) => ({ code, message });
const numeric = value => typeof value === "number" && Number.isFinite(value);

/** Pure reference queries. No Roll, Actor, inventory or Foundry hooks. */
export class AmmunitionCompatibilityService {
  #catalogs;
  #indexed = new Map();
  #memo = new Map();
  #memoCatalogs = [];
  constructor(catalogs) {
    if (!catalogs?.getModeLinks) throw new TypeError("A CatalogService is required.");
    this.#catalogs = catalogs;
  }
  load() { return this.#catalogs.load(); }
  #query(key, evaluate) {
    // Only immutable reference queries are cached. Actor balances, approvals and write permissions are never cached here.
    const data=['weapons',...BOOKS].map(book=>this.#catalogs.getCatalog(book));
    if(data.some((value,i)=>value!==this.#memoCatalogs[i])){this.#memo.clear();this.#memoCatalogs=data;}
    if(data.some(value=>!value))return evaluate();
    if(this.#memo.has(key))return this.#memo.get(key);
    const value=evaluate();
    if(this.#memo.size>=2000)this.#memo.clear();
    this.#memo.set(key,value);return value;
  }

  #index(book) {
    const data = this.#catalogs.getCatalog(book);
    if (!data) return null;
    if (this.#indexed.get(book)?.data === data) return this.#indexed.get(book);
    const records = new Map();
    const labels = new Map();
    for (const [collection, kind] of Object.entries(COLLECTIONS[book])) {
      for (const original of data[collection] ?? []) {
        const record = book === "ht" && kind === "ammo-item" ? correctHTAmmo(original) : original;
        const entries = records.get(record.id) ?? [];
        entries.push({ book, collection, kind, record }); records.set(record.id, entries);
        // Resolve names ONLY inside explicitly named HT178 rules. Never a weapon matching heuristic.
        if (book === "ht" && collection === "ammo_items") {
          const label = record.name.split(" (")[0];
          labels.set(label, [...(labels.get(label) ?? []), record.id]);
        }
      }
    }
    const corrected = this.#catalogs.getAmmoItem("ht", "olegurps_lemat_18g_shot_charge");
    if(book==='ht')for(const item of HT_PRE_GAUSS_AMMO) {
      const record=this.#catalogs.getAmmoItem(book,item.id);
      if(record)records.set(record.id,[{book,collection:'runtime_evidence',kind:'ammo-item',record}]);
    }
    if (book === "ht" && corrected) records.set(corrected.id, [{ book, collection: "runtime_evidence", kind: "ammo-item", record: corrected }]);
    const rules = (data.interchangeability_rules ?? []).map((rule, index) => ({ rule, index,
      from: rule.explicit_direction_v1 ? [...rule.explicit_direction_v1.source_ammo_item_ids, ...(rule.explicit_direction_v1.excluded_ambiguous_target_or_source_ids ?? [])] : labels.get(rule.from) ?? [],
      targets: rule.explicit_direction_v1 ? [...new Set([...rule.explicit_direction_v1.target_ammo_item_ids, ...rule.explicit_direction_v1.mode_pair_assessments.map(pair => pair.target_ammo_item_id)])].map(id => ({ label: id, ids: [id] })) : rule.to.map(label => ({ label, ids: labels.get(label) ?? [] })) }));
    const indexed = { data, records, rules }; this.#indexed.set(book, indexed); return indexed;
  }

  #context(modeId) {
    const mode = this.#catalogs.getMode(modeId);
    const equipment = this.#catalogs.getEquipmentForMode(modeId);
    const book = equipment?.source?.toLowerCase();
    const links = this.#catalogs.getModeLinks(modeId);
    if (!mode) return { error: reason("MODE_UNAVAILABLE", "Unknown mode ID or unavailable weapon catalog.") };
    if (!BOOKS.includes(book)) return { mode, equipment, book, error: reason("UNSUPPORTED_SOURCE", "Mode has no supported ammunition source.") };
    if (!links || !this.#index(book)) return { mode, equipment, book, error: reason("CATALOG_UNAVAILABLE", this.#catalogs.getStatus(book)?.unavailableReason ?? "Ammunition links are not available yet.") };
    if (mode.role !== "attack" || mode.hidden || mode.combat_type !== "ranged"&&!isLTProcedureMode(mode)) return { mode, equipment, book, links,
      error: reason("UNSUPPORTED_MODE", "Only primary visible ranged attack modes can select ammunition; secondary effects are not ammunition.") };
    if (!(links.ammoItemIds.length || links.ammoFamilyIds.length)) return { mode, equipment, book, links,
      error: reason("NO_AMMUNITION_DATA", "No explicit ammunition link exists for this mode.") };
    return { mode, equipment, book, links };
  }

  #result(ctx, entry, status, reasons = [], relation = null, warnings = []) {
    return { status, modeId: ctx.mode?.weapon_mode_id ?? null, book: entry?.book ?? ctx.book ?? null,
      ammoId: entry?.record.id ?? null, kind: entry?.kind ?? null,
      resourceKind: entry?.record.status === "SINGLE_USE_WHOLE_WEAPON" ? "single-use-whole-weapon" : entry?.kind ?? null,
      deliveryType: entry ? entry.record.rocket_contract?.delivery_type ?? entry.record.ammunition_class ?? entry.record.ammo_type ?? entry.kind : null,
      record: entry?.record ?? null, relation: relation ? { type: relation.type, ...relation,
        catalog: CATALOG_DEFINITIONS[entry.book].filename } : null,
      reasons, warnings, restrictions: entry ? this.#restrictions(entry.record) : {} };
  }
  #restrictions(record) {
    const fields = ["applies_to", "specific_model_only", "ammo_type", "projectile_classes", "ammunition_class", "ammunition_construction", "rocket_contract", "alternate_model_not_selectable_as_base_ammunition", "compatibility", "platform_tags_any", "min_tl", "minimum_tech_level", "status", "requires_accessory", "weapon_requires_accessory", "requires_external_rule", "notes_required", "payload_policy", "source_specific_payload", "load_variant", "eligibility_v1"];
    return Object.fromEntries(fields.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
  }

  /** book/kind disambiguate IDs. ammoItemId binds an LT option to a linked projectile. */
  checkCompatibility(modeId, ammoId, options = {}) {
    return this.#query(JSON.stringify(['pair',modeId,ammoId,options]),()=>this.#checkCompatibility(modeId,ammoId,options));
  }
  #checkCompatibility(modeId, ammoId, options) {
    const ctx = this.#context(modeId);
    const book = options.book ?? ctx.book;
    const entries = this.#index(book)?.records.get(ammoId) ?? [];
    const selected = options.kind ? entries.filter(entry => entry.kind === options.kind) :
      entries.some(entry => entry.kind === "ammo-item") ? entries.filter(entry => entry.kind === "ammo-item") : entries;
    if (ctx.error) return snapshot({ ...this.#result(ctx, selected[0], "undetermined", [ctx.error]), modeId, ammoId });
    const decision=book==='ut'&&ctx.book==='ut'?utCompatibilityDecision(modeId,ammoId,{caliberMm:ctx.mode.ammunition_profile?.caliber_mm}):null;
    if(decision?.status==='incompatible')return snapshot({...this.#result(ctx,selected[0]??null, 'incompatible',
      [reason('UT_COMPATIBILITY_DECISION',decision.reason)]),relation:{type:decision.basis,revision:decision.revision},modeId,ammoId});
    if (selected.length !== 1) return snapshot({ ...this.#result(ctx, null, "undetermined", [reason(selected.length ? "AMBIGUOUS_ID" : "RECORD_UNAVAILABLE", "Record is missing, ambiguous or its catalog is unavailable.")]), modeId, ammoId });
    const entry = selected[0];
    if (book !== ctx.book) return snapshot(this.#result(ctx, entry, "incompatible", [reason("SOURCE_MISMATCH", "No explicit cross-source compatibility is defined.")]));
    return snapshot(this.#check(ctx, entry, options));
  }

  #check(ctx, entry, options) {
    const { record: r, kind } = entry;
    const fail = (code, message, status = "incompatible") => this.#result(ctx, entry, status, [reason(code, message)]);
    if(ctx.book==='lt'&&ltFlameProfile(ctx.mode.weapon_mode_id)&&kind==='ammo-family')return fail('LT_FLAME_PHYSICAL_IDENTITY_REQUIRED','Нужна конкретная физическая партия огнемётного заряда; familyId не задаёт её состав.');
    if (ctx.book === "ut" && ctx.mode.ut_source_data?.source_conflict &&
        !['WbvkCgoaLuWViWyKK','WJstukbcBFPxQFtJE'].includes(ctx.mode.weapon_mode_id))
      return fail("UT_SOURCE_CONFLICT", moduleText("OleGURPS.UTData.SourceConflict"), "undetermined");
    if (ctx.book === "ut" && ctx.mode.ut_source_data?.special_variants_pending && !["ammo-item", "ammo-family"].includes(kind))
      return fail("UT_VARIANT_NOT_IMPLEMENTED", moduleText("OleGURPS.UTData.VariantsPending"), "undetermined");
    if (ctx.book === "ht" && ["ammo-item", "ammo-family"].includes(kind) && htIdentityNeedsReview(ctx.mode.weapon_mode_id, r.id))
      return fail("HT_IDENTITY_UNVERIFIED", htIdentityNeedsReview(ctx.mode.weapon_mode_id, r.id), "undetermined");
    if (ctx.mode.weapon_mode_id === "WdzSSShGT_yv4ctOi" && kind === "ammo-family")
      return fail("PHYSICAL_IDENTITY_REQUIRED", "The central barrel requires its separate source-backed 18G charge identity.");
    if (kind === "feed-device" || kind === "reference-option") return fail("NOT_AMMUNITION", "Reference equipment is not selectable ammunition.");
    if (r.alternate_model_not_selectable_as_base_ammunition) return fail("ALTERNATE_PLATFORM", "This generation requires another launcher/platform variant and is not selectable for the base installation.");
    if (r.is_selectable === false) return fail("NOT_SELECTABLE", "Catalog explicitly marks this record as non-selectable.");
    if (kind === "ammo-item" || kind === "ammo-family") {
      const ids = kind === "ammo-item" ? ctx.links.ammoItemIds : ctx.links.ammoFamilyIds;
      const reverse = kind === "ammo-item" ? this.#catalogs.getModesForAmmoItem(ctx.book, r.id) : this.#catalogs.getModesForAmmoFamily(ctx.book, r.id);
      if (ids.includes(r.id)) {
        if (!reverse.some(mode => mode?.weapon_mode_id === ctx.mode.weapon_mode_id)) return fail("BROKEN_REVERSE_LINK", "Forward link lacks a validated reverse link.", "undetermined");
        if (r.rocket_contract?.compatible_equipment_ids && !r.rocket_contract.compatible_equipment_ids.includes(ctx.equipment.equipment_id)) return fail("PLATFORM_RESTRICTION", "Rocket contract excludes this equipment ID.");
        if (ctx.book === 'lt') {
          if (kind === 'ammo-family') return this.#ltFamily(ctx, entry, options);
            const early=ltEarlyPhysicalAdmission(ctx.mode.weapon_mode_id,r.id,kind,options.ltEarlyFit);
            if(early)return this.#result(ctx,entry,early.status,early.reasons,{type:'lt-p4-physical-profile',source:'LT84-95'});
          const bow=ltBowPhysicalAdmission(ctx.mode.weapon_mode_id,r.id,kind,options.ltBow);
          if(bow&&(options.ltBow||!['lt_arrow_guide_dart','bow_arrow_guide_dart'].includes(r.id)))
            return this.#result(ctx,entry,bow.status,bow.reasons,{type:'lt-p2-physical-profile',source:'LT74-78'});
          const restriction = LT_PHYSICAL_LOAD_RESTRICTIONS.find(p => p.modeId === ctx.mode.weapon_mode_id &&
            p.equipmentId === ctx.equipment.equipment_id && p.ammoId === r.id);
          if (restriction) return this.#result(ctx, entry, restriction.status,
            [reason(restriction.code, restriction.code === 'LT_BUNDLE_REQUIRES_SEPARATE_STONES' ?
              'LT80–82: для этого режима нужна связка отдельных однофунтовых камней. Одиночный тяжёлый камень не подходит.' :
              restriction.code === 'LT_BOMBARD_METAL_UNPROVEN' ?
                'LT87–88: допустимость металлического ядра для этой каменной бомбарды не установлена. Новое снаряжение и выстрел закрыты.' :
                'Подходящий состав, размер, количество или подготовка этого заряда ещё не подтверждаются состоянием оружия. Новое снаряжение и выстрел закрыты.')],
            { type: 'source-physical-load-restriction', source: restriction.source });
          if (r.requires_accessory || /^GM_/.test(r.status ?? '')) return fail('LT_CONDITIONAL_AMMUNITION',
            r.requires_accessory ? 'LT78: для этого снаряда требуется подтверждённая направляющая Navak; наличие аксессуара пока не проверяется.' :
              'Для этого заряда не подтверждены индивидуальная подгонка, конструкция или наполнитель. Семейство не заменяет физическую проверку.', 'undetermined');
        }
        if (ctx.book === "ut") {
          const tl = this.#utFamilyTL(ctx, r);
          if (tl) return fail(tl.code, tl.message, "undetermined");
        }
        return this.#result(ctx, entry, "compatible", [], { type: r.provenance?.officialTableRow === false ?
          "source-backed-runtime-correction" : "explicit-bidirectional-link",
          path: kind === "ammo-item" ? ctx.book + "_ammo_item_ids" : "ammo_families", modeId: ctx.mode.weapon_mode_id,
          ...(r.provenance ? { provenance: r.provenance } : {}) });
      }
      if (ctx.book === "ht" && kind === "ammo-item") return this.#htRule(ctx, entry);
      return fail("NO_EXPLICIT_LINK", "Known record has no explicit compatible link to this mode.");
    }
    if (ctx.book === "lt") return this.#ltOption(ctx, entry, options);
    if (ctx.book === "ht") return this.#htOption(ctx, entry, options);
    return this.#utOption(ctx, entry, options);
  }

  #ltFamily(ctx, entry, options) {
    const children = (entry.record.ammo_item_ids ?? []).filter(id => ctx.links.ammoItemIds.includes(id));
    const selected = options.ammoItemId;
    if (selected && !children.includes(selected)) return this.#result(ctx, entry, 'incompatible',
      [reason('LT_FAMILY_ITEM_MISMATCH', 'Выбранный физический снаряд не принадлежит этому семейству или режиму.')]);
    const results = (selected ? [selected] : children).map(id => {
      const record = this.#catalogs.getAmmoItem('lt', id);
      return record && this.#check(ctx, { book: 'lt', kind: 'ammo-item', record }, options);
    }).filter(Boolean);
    if (results.length === 1) {
      const child = results[0];
      return this.#result(ctx, entry, child.status, child.reasons,
        { type: 'physical-family-member', ammoItemId: child.ammoId, source: child.relation?.source }, child.warnings);
    }
    if (results.length && results.every(r => r.status === 'incompatible')) return this.#result(ctx, entry, 'incompatible', results[0].reasons);
    return this.#result(ctx, entry, 'undetermined', [reason('LT_PHYSICAL_ITEM_REQUIRED',
      'Выберите конкретный физический снаряд: семейство не определяет его размер, состав и условия применения.')]);
  }

  #htOption(ctx, entry, options) {
    if(htPreGaussProfile(ctx.mode.weapon_mode_id))return this.#result(ctx,entry,'incompatible',
      [reason('SOURCE_SPECIFIC_PROFILE','This reviewed tool/liquid/special platform admits only its explicitly implemented physical loads; generic firearm upgrades do not establish another supported construction.')]);
    const ids = ctx.links.ammoItemIds;
    const id = options.ammoItemId ?? (ids.length === 1 ? ids[0] : null);
    if (id) {
      const ammo = this.#catalogs.getAmmoItem("ht", id);
      if (!ammo) return this.#result(ctx, entry, "undetermined", [reason("RECORD_UNAVAILABLE", "Selected ammunition context is unavailable.")]);
      if (!ids.includes(id) || htIdentityNeedsReview(ctx.mode.weapon_mode_id, id)) {
        const compatibility = this.#check(ctx, { book: "ht", collection: "ammo_items", kind: "ammo-item", record: ammo }, {});
        if (compatibility.status !== "compatible") return this.#result(ctx, entry, compatibility.status, compatibility.reasons, compatibility.relation);
      }
    }
    const selectedIds = [...new Set([entry.record.id, ...(options.selectedVariantIds ?? []), ...(options.baseVariantId ? [options.baseVariantId] : [])])];
    const facts = resolveHTCatalogFacts({ mode: ctx.mode, ammo: id ? this.#catalogs.getAmmoItem("ht", id) : null, catalogs: this.#catalogs,
      availabilityTL: options.availabilityTL, baseVariantId: options.baseVariantId,
      selectedVariants: selectedIds.map(id => this.#catalogs.getVariant("ht", id)) });
    const evaluated = evaluateHTOptionEligibility(entry.record, facts);
    return { ...this.#result(ctx, entry, evaluated.status, evaluated.reasons, { type: "structured-ht-eligibility", path: entry.collection + ".eligibility_v1", ammoItemId: id }, evaluated.warnings),
      eligibility: { checks: evaluated.checks, facts, applicationAllowed: evaluated.applicationAllowed } };
  }

  #htRule(ctx, entry) {
    const candidates = this.#index("ht").rules.filter(binding =>
      (binding.rule.explicit_direction_v1 ?
        binding.rule.explicit_direction_v1.source_ammo_item_ids.some(id => ctx.links.ammoItemIds.includes(id)) ||
        binding.rule.explicit_direction_v1.mode_pair_assessments.some(pair => pair.mode_id === ctx.mode.weapon_mode_id && pair.target_ammo_item_id === entry.record.id && ctx.links.ammoItemIds.includes(pair.source_ammo_item_id)) :
        binding.from.some(id => ctx.links.ammoItemIds.includes(id))) && binding.targets.some(target => target.ids.includes(entry.record.id)));
    if (!candidates.length) return this.#result(ctx, entry, "incompatible", [reason("NO_EXPLICIT_LINK", "No native link or directed HT178 exception permits this pair.")]);
    const pending = [];
    let pendingRelation = null;
    for (const binding of candidates) {
      const { rule } = binding;
      if (rule.explicit_direction_v1) return this.#htExplicit(ctx, entry, binding);
      const target = binding.targets.find(t => t.ids.includes(entry.record.id));
      const relation = { type: "directed-ht178", path: "interchangeability_rules[" + binding.index + "]", from: rule.from, to: target.label, requires: rule.requires };
      pendingRelation = relation;
      if (binding.from.length !== 1 || target.ids.length !== 1) { pending.push(reason("AMBIGUOUS_RULE_REFERENCE", "Named HT178 rule does not resolve to a unique cartridge.")); continue; }
      if (rule.requires === "true interchangeable, HT178") return this.#result(ctx, entry, "compatible", [], relation);
      const confirmedRevolver = ["revolver chambered for .357 Magnum", "revolver chambered for .44 Magnum", "compatible .454 Casull revolver", "compatible revolver"].includes(rule.requires);
      const mechanism = ctx.mode.mechanism;
      if (confirmedRevolver && mechanism?.confidence === "high") {
        if (mechanism.action_system === "revolver") return this.#result(ctx, entry, "compatible", [], relation);
        return this.#result(ctx, entry, "incompatible", [reason("ACTION_RESTRICTION", "HT178 exception requires a revolver; the catalog confirms another action.")], relation);
      }
      pending.push(reason("UNVERIFIED_HT178_CONDITION", rule.requires));
    }
    return this.#result(ctx, entry, "undetermined", pending, pendingRelation);
  }

  #htExplicit(ctx, entry, binding) {
    const d = binding.rule.explicit_direction_v1;
    const pairs = d.mode_pair_assessments.filter(pair => pair.mode_id === ctx.mode.weapon_mode_id &&
      pair.target_ammo_item_id === entry.record.id && ctx.links.ammoItemIds.includes(pair.source_ammo_item_id));
    const relation = { type: "directed-ht178", metadata: "explicit_direction_v1", path: "interchangeability_rules[" + binding.index + "].explicit_direction_v1",
      source: d.basis_page, directedOnly: true, transitivePermission: false,
      sourceAmmoItemIds: d.source_ammo_item_ids, targetAmmoItemId: entry.record.id, conditions: {
        knownPlatformActionRequirement: d.known_platform_action_requirement, requiresNativeExactSourceChambering: true,
        excludedIds: d.excluded_ambiguous_target_or_source_ids ?? [] } };
    const unresolved = message => this.#result(ctx, entry, "undetermined", [reason("UNVERIFIED_HT178_CONDITION", message)], relation);
    if (publishedShortShellCompatibility(ctx.mode, entry.record.id)) return {
      ...this.#result(ctx, entry, "compatible", [], { ...relation, source:"HT106 Benelli Super 90 published 2.75/3 inch operation" }),
      capabilities:{firing:"confirmed",feedingAndCycling:"confirmed"}
    };
    if (pairs.length !== 1) return unresolved("No unique explicit assessment exists for this concrete mode/source/target pair.");
    const pair = pairs[0];
    const warnings = pair.warnings.map(message => reason("HT178_WARNING", message));
    if (pair.status !== "confirmed_to_fire") return this.#result(ctx, entry, "undetermined", [reason("UNVERIFIED_HT178_CONDITION", pair.reason)], relation, warnings);
    const excluded = d.excluded_ambiguous_target_or_source_ids ?? [];
    const mechanism = ctx.mode.mechanism;
    if (!d.source_ammo_item_ids.includes(pair.source_ammo_item_id) || !d.target_ammo_item_ids.includes(pair.target_ammo_item_id) ||
      excluded.includes(pair.source_ammo_item_id) || excluded.includes(pair.target_ammo_item_id) ||
      pair.equipment_id !== ctx.equipment.equipment_id || ctx.mode.ht_ammo_resolution?.status !== "exact_chambering" ||
      mechanism?.action_system !== pair.source_mode_action ||
      (d.known_platform_action_requirement !== null && (!d.known_platform_action_requirement.includes(mechanism?.action_system) || mechanism?.confidence !== "high"))) {
      return unresolved("Explicit assessment does not satisfy the current native platform/chamber conditions.");
    }
    if (mechanism.action_system === "self-loading" && !warnings.some(warning => warning.message === "feeding-and-cycling-not-proven-by-HT178"))
      warnings.push(reason("HT178_WARNING", "feeding-and-cycling-not-proven-by-HT178"));
    return { ...this.#result(ctx, entry, "compatible", [], relation, warnings), capabilities: { firing: "confirmed", feedingAndCycling: "not-confirmed" } };
  }

  #ltOption(ctx, entry, options) {
    const r = entry.record;
    const early=ltEarlyProfile(ctx.mode.weapon_mode_id),artilleryMode=ltArtilleryProfile(ctx.mode.weapon_mode_id);
    if(early&&['serpentine_powder','corned_powder'].includes(r.id)&&early.powder!==r.id.replace('_powder',''))
      return this.#result(ctx,entry,'undetermined',[reason('LT_POWDER_INDIVIDUAL_SOURCE_REQUIRED','Сорт пороха и его баллистика должны быть подтверждены для этой модели LT; общий класс боеприпаса не задаёт замену навески.')]);
    if(early&&!artilleryMode&&['chain_shot','grapeshot','heated_shot'].includes(r.id))
      return this.#result(ctx,entry,'undetermined',[reason('LT_CANNON_OPTION_MODEL_UNPROVEN','LT88–89: у этого режима нет подтверждённого индивидуального профиля Chain/Grape/Heated; общий класс снаряда его не разрешает.')]);
    const items = ctx.links.ammoItemIds.map(id => this.#catalogs.getAmmoItem("lt", id)).filter(item => !options.ammoItemId || item.id === options.ammoItemId);
    if (!items.length) return this.#result(ctx, entry, "incompatible", [reason("UNLINKED_PROJECTILE", "Selected projectile is not linked to this mode.")]);
    if (!Array.isArray(r.applies_to)) return this.#result(ctx, entry, "undetermined", [reason("MISSING_APPLICABILITY", "Option has no structured projectile applicability.")]);
    const matching = items.filter(item => r.applies_to.some(type => (item.projectile_classes ?? [item.ammo_type]).includes(type)));
    if (!matching.length) return this.#result(ctx, entry, "incompatible", [reason("PROJECTILE_CLASS", "Option does not apply to any linked projectile class.")]);
    if (r.id === 'artillery_lead' && !LT_LEAD_BUNDLE_MODES.includes(ctx.mode.weapon_mode_id))
      return this.#result(ctx, entry, 'incompatible', [reason('LT_LEAD_BUNDLE_CONSTRUCTION',
        'LT81: это правило только для подходящих баллист со связками однофунтовых свинцовых пуль; не для всех метательных машин.')]);
    if (r.id === 'catapult_overweight' && !LT_OVERWEIGHT_MODES.includes(ctx.mode.weapon_mode_id))
      return this.#result(ctx, entry, 'incompatible', [reason('LT_OVERWEIGHT_ONE_ARM_ONLY',
        'LT83: эта таблица массы и дальности относится к однорычажным машинам. Другие пользовательские снаряды этим не запрещаются.')]);
    if (options.ammoItemId) {
      const physical = this.#check(ctx, { book: 'lt', kind: 'ammo-item', record: matching[0] }, {});
      if (physical.status !== 'compatible') return this.#result(ctx, entry, physical.status, physical.reasons);
    }
    const artillery=ltArtilleryProfile(ctx.mode.weapon_mode_id),future=ltArtilleryFutureLoad(ctx.mode.weapon_mode_id,r.id);
    if(future)return this.#result(ctx,entry,'undetermined',[reason(future.status==='BLOCKED'?'LT_ARTILLERY_DELIVERY_FUTURE':'LT_ARTILLERY_DEVICE_FIT_UNDETERMINED',future.reason)]);
    if(artillery&&['artillery_lead','catapult_overweight','large_flaming_artillery_bolt','chain_shot','grapeshot','heated_shot'].includes(r.id))
      return this.#result(ctx,entry,'undetermined',[reason('LT_ARTILLERY_PHYSICAL_LOAD_REQUIRED',
        'Выберите отдельный подтверждённый физический заряд и подогнанную партию LT-P5. Общий модификатор не является готовым выстрелом.')]);
    if (r.id === 'artillery_lead') return this.#result(ctx, entry, 'undetermined',
      [reason('LT_PHYSICAL_LOAD_UNPROVEN', 'LT81: конструкция баллисты подходит, но отдельный физический заряд из однофунтовых свинцовых пуль пока не реализован.')]);
    const conditions = ["requires_accessory", "weapon_requires_accessory", "requires_skill", "requires_powder_cloth_bag"].filter(key => r[key]);
    if (r.status || conditions.length) return this.#result(ctx, entry, "undetermined", [reason("LT_CONDITIONAL_OPTION", r.status==='SOURCE_CONFIGURATION_REQUIRED'?r.notes_ru:r.status ?? conditions.join(", "))]);
    if (numeric(options.availabilityTL) && numeric(r.min_tl) && options.availabilityTL < r.min_tl) return this.#result(ctx, entry, "incompatible", [reason("AVAILABILITY_TL", "Option exceeds the supplied ammunition availability TL.")]);
    return this.#result(ctx, entry, "compatible", [], { type: "explicit-projectile-class", path: "projectile_options.applies_to", ammoItemIds: matching.map(item => item.id) },
      [...(r.requires_external_rule ? [reason("EXTERNAL_RULE", "Compatibility is confirmed; full game rules are external to the catalog.")] : []),
        ...(numeric(r.min_tl) && !numeric(options.availabilityTL) ? [reason("AVAILABILITY_UNCHECKED", "Physical compatibility only; availability TL was not supplied.")] : [])]);
  }

  #utFamilyTL(ctx, family) {
    // This existing, scoped project exception requires explicit selection/loading
    // of 7mm EM. Physical admission never changes campaign availability or Guns TL.
    const exception=ctx.mode.ammunition_profile.user_authorized_ammo_tl_exception;
    if(ctx.mode.weapon_mode_id==='WkhAN9tcmB9eEkmY6'&&family.id==='7mm_em'&&
      exception?.ammo_family_id===family.id&&exception.opt_in_required===true)return null;
    const nativeTL = Number(ctx.mode.ammunition_profile.native_weapon_tl);
    if (!Number.isFinite(nativeTL) || !numeric(family.tl)) return reason("MISSING_FAMILY_TL", "Native weapon or family TL is missing.");
    if (family.tl > nativeTL) return reason("FAMILY_TL_EXCEPTION", "Family exceeds native weapon TL; optional authorization is not assumed.");
    return null;
  }

  #utOption(ctx, entry, options) {
    const r = entry.record, p = ctx.mode.ammunition_profile;
    if(ctx.mode.weapon_mode_id==='W__0RKAth-4yvVBSl'&&r.id==='apds')return this.#result(ctx,entry,'undetermined',
      [reason('UT_EM_TECHNOLOGY_UNKNOWN','UT141: тип ускорителя Electromag Mortar не уточнён; разрешение APDS для coilgun не определяет эту пару.')],
      {type:'source-undetermined-em-technology',source:'UT141,152'});
    const reasons = [], warnings = [];
    let status = "compatible";
    const uncertain = (code, message) => { if (status !== "incompatible") status = "undetermined"; reasons.push(reason(code, message)); };
    const deny = (code, message) => { status = "incompatible"; reasons.push(reason(code, message)); };
    const tags = p.platform_tags;
    if (r.id === "apds" && tags?.includes("gauss") && !tags.includes("railgun") &&
        !(gaussProfile(ctx.mode.weapon_mode_id)?.coilgun && GAUSS_PROJECT_POLICY.coilgunAPDS))
      uncertain("UT_APDS_GAUSS_CONFLICT", moduleText("OleGURPS.UTData.APDSGaussConflict"));
    if(r.id==='apds'&&gaussProfile(ctx.mode.weapon_mode_id)?.coilgun)
      warnings.push(reason('USER_APPROVED_COILGUN_APDS','APDS coilgun: утверждённая политика проекта 18.10.2026; не официальная эррата.'));
    if (r.id === "expendable_jammer" && p.warhead_class === "25mm")
      uncertain("UT_JAMMER_RADIUS_MISSING", moduleText("OleGURPS.UTData.JammerRadiusMissing"));
    if (numeric(r.min_tl) && !numeric(options.availabilityTL)) warnings.push(reason("AVAILABILITY_UNCHECKED", "Physical compatibility only; ammunition availability TL was not supplied."));
    const platform = (required, excluded = []) => {
      if (!Array.isArray(tags)) uncertain("MISSING_PLATFORM_TAGS", "Platform tags are missing.");
      else {
        if (required?.length && !required.some(tag => tags.includes(tag))) deny("PLATFORM_RESTRICTION", "Required platform tags are absent.");
        if (excluded.some(tag => tags.includes(tag))) deny("EXCLUDED_PLATFORM", "An excluded platform tag is present.");
      }
    };
    for (const familyId of ctx.links.ammoFamilyIds) {
      const family = this.#catalogs.getAmmoFamily("ut", familyId);
      if (!family) uncertain("BROKEN_FAMILY_LINK", "Linked family is unavailable.");
      else { const problem = this.#utFamilyTL(ctx, family); if (problem) uncertain(problem.code, problem.message); }
    }
    if (numeric(options.availabilityTL) && numeric(r.min_tl) && options.availabilityTL < r.min_tl) deny("AVAILABILITY_TL", "Variant exceeds the supplied ammunition availability TL.");
    if (entry.kind === "special-load") {
      if (!ctx.links.specialLoadIds.includes(r.id)) deny("NO_SPECIAL_LOAD_LINK", "Special load is not explicitly linked to this mode.");
      if (!Array.isArray(r.platform_tags_any)) uncertain("MISSING_APPLICABILITY", "Special load has no structured platform predicate.");
      else if (ctx.links.specialLoadIds.includes(r.id) && Array.isArray(tags) && !r.platform_tags_any.some(tag => tags.includes(tag))) uncertain("CONFLICTING_SPECIAL_LOAD_TAGS", "Explicit special-load link conflicts with its required platform tags.");
      else platform(r.platform_tags_any);
      if (r.warhead_ref) {
        const warhead = this.#catalogs.getRecord("ut", "warheads", r.warhead_ref);
        if (!warhead) uncertain("BROKEN_WARHEAD_REFERENCE", "Referenced warhead is unavailable.");
        else {
          const payload = this.#utOption(ctx, { book: "ut", collection: "warheads", kind: "warhead", record: warhead }, options);
          if (payload.status === "incompatible") payload.reasons.forEach(item => deny(item.code, item.message));
          if (payload.status === "undetermined") payload.reasons.forEach(item => uncertain(item.code, item.message));
          warnings.push(reason("WARHEAD_PAYLOAD_REFERENCE", "Payload refers to " + r.warhead_ref + "; it is not a separate cartridge."));
        }
      }
    } else {
      const c = r.compatibility;
      if (!c) return this.#result(ctx, entry, "undetermined", [reason("MISSING_APPLICABILITY", "Warhead has no compatibility predicates.")]);
      const supportedPredicates = ["source_required", "weapon_min_tl", "min_size_mm", "max_size_exclusive_mm", "allowed_warhead_classes", "platform_any", "exclude_platforms", "requires_homing", "base_damage_types_any", "min_size_mm_by_tl"];
      for (const key of Object.keys(c)) if (!supportedPredicates.includes(key)) uncertain("UNSUPPORTED_PREDICATE", "Unknown compatibility predicate: " + key);
      for (const key of supportedPredicates.slice(0, 8)) if (!(key in c)) uncertain("MISSING_PREDICATE", "Missing compatibility predicate: " + key);
      if (p.supports_exotic_warheads === false) deny("WARHEADS_NOT_SUPPORTED", "Profile explicitly disallows exotic warheads.");
      else if (p.supports_exotic_warheads !== true) uncertain("MISSING_WARHEAD_SUPPORT", "Warhead support is not specified.");
      if (c.source_required !== "Ultra-Tech") uncertain("UNSUPPORTED_SOURCE_PREDICATE", "Unsupported or missing warhead source predicate.");
      const nativeTL = Number(p.native_weapon_tl);
      if (!Number.isFinite(nativeTL)) uncertain("MISSING_WEAPON_TL", "Native weapon TL is missing.");
      else if (numeric(c.weapon_min_tl) && nativeTL < c.weapon_min_tl) deny("WEAPON_TL", "Native weapon TL fails the explicit minimum.");
      platform(c.platform_any, c.exclude_platforms);
      if (c.allowed_warhead_classes?.length && !c.allowed_warhead_classes.includes(p.warhead_class)) deny("WARHEAD_CLASS", "Warhead class is not allowed.");
      let minimum = c.min_size_mm;
      if (c.min_size_mm_by_tl) {
        if (!numeric(options.availabilityTL)) uncertain("AVAILABILITY_TL_REQUIRED", "This warhead requires an explicit ammunition availability TL.");
        else {
          const thresholds = Object.keys(c.min_size_mm_by_tl).map(Number).filter(tl => tl <= options.availabilityTL).sort((a,b) => b-a);
          minimum = c.min_size_mm_by_tl[thresholds[0]];
          if (!numeric(minimum)) deny("AVAILABILITY_TL", "No warhead size threshold exists at this availability TL.");
        }
      }
      // Size is a necessary restriction after an explicit family link, never a compatibility join.
      const classMatch = /^([0-9]+(?:\.[0-9]+)?)mm$/.exec(p.warhead_class ?? "");
      const size = c.min_size_mm_by_tl ? (classMatch ? Number(classMatch[1]) : gaussProfile(ctx.mode.weapon_mode_id)?p.caliber_mm:null) : p.caliber_mm;
      if (numeric(minimum) || numeric(c.max_size_exclusive_mm)) {
        if (!numeric(size)) uncertain("MISSING_SIZE", "Required explicit size/warhead class is unavailable.");
        else if ((numeric(minimum) && size < minimum) || (numeric(c.max_size_exclusive_mm) && size >= c.max_size_exclusive_mm)) deny("SIZE_RESTRICTION", "Projectile fails explicit warhead size limits.");
      }
      if (c.requires_homing) {
        if (p.homing_projectile_support === "none") deny("HOMING_REQUIRED", "Profile explicitly lacks homing support.");
        else uncertain("HOMING_UNCONFIRMED", "Conditional homing capability does not confirm this concrete guided variant.");
      }
      if (c.base_damage_types_any?.length) {
        const type = ctx.mode.stats?.damage?.type;
        if (!type) uncertain("MISSING_DAMAGE_TYPE", "Native damage type is unavailable.");
        else if (!c.base_damage_types_any.includes(type)) deny("DAMAGE_TYPE_RESTRICTION", "Native damage type is excluded by the predicate.");
      }
    }
    if (r.notes_required) warnings.push(reason("PAYLOAD_DETAILS_REQUIRED", "Drug, filler or other payload details must be supplied before gameplay use."));
    return this.#result(ctx, entry, status, reasons, { type: entry.kind === "special-load" ? "explicit-special-load" : "linked-family-warhead-predicates", path: entry.collection, ammoFamilyIds: ctx.links.ammoFamilyIds }, warnings);
  }

  getCompatibleAmmunition(modeId, options = {}) {
    return this.#query(JSON.stringify(['choices',modeId,options]),()=>this.#getCompatibleAmmunition(modeId,options));
  }
  #getCompatibleAmmunition(modeId, options) {
    const ctx = this.#context(modeId);
    if (ctx.error) return snapshot({ modeId, book: ctx.book ?? null, status: "undetermined", ammunition: [], variants: [], undetermined: [], reasons: [ctx.error] });
    const results = [...this.#index(ctx.book).records.values()].flat().filter(entry => !["feed-device", "reference-option"].includes(entry.kind)).map(entry => this.#check(ctx, entry, options));
    return snapshot({ modeId, book: ctx.book, status: "ready", ammunition: results.filter(r => r.status === "compatible" && ["ammo-item", "ammo-family"].includes(r.kind)),
      variants: results.filter(r => r.status === "compatible" && !["ammo-item", "ammo-family"].includes(r.kind)),
      undetermined: results.filter(r => r.status === "undetermined"), reasons: [] });
  }

  getDiagnostics() {
    const unsupported = [];
    for (const book of BOOKS) {
      const index = this.#index(book); if (!index) continue;
      for (const entry of [...index.records.values()].flat()) {
        if (book === "ht" && entry.record.eligibility_v1) unsupported.push({ book, id: entry.record.id, code: "ELIGIBILITY_REQUIRES_PLATFORM_EVIDENCE",
          fields: { [entry.collection + ".eligibility_v1"]: entry.record.eligibility_v1 }, reason: "Required construction/platform/payload evidence is not mapped to concrete catalog modes.",
          recommendation: "Confirm each explicit evidence requirement for this exact mode/ammunition before allowing application; no caliber/name/TL shortcut." });
        if (entry.record.alternate_model_not_selectable_as_base_ammunition) unsupported.push({ book, id: entry.record.id, code: "ALTERNATE_PLATFORM" });
        if (book === "lt" && (entry.record.status || entry.record.requires_accessory || entry.record.weapon_requires_accessory)) unsupported.push({ book, id: entry.record.id, code: "LT_CONDITIONAL_OPTION" });
      }
      for (const binding of index.rules) {
        if (binding.rule.explicit_direction_v1) continue;
        const ambiguous = binding.from.length !== 1 || binding.targets.some(t => t.ids.length !== 1);
        if (ambiguous || !["true interchangeable, HT178", "revolver chambered for .357 Magnum", "revolver chambered for .44 Magnum", "compatible .454 Casull revolver", "compatible revolver", "no forward substitution; HT178"].includes(binding.rule.requires)) unsupported.push({ book, rule: binding.index, code: ambiguous ? "AMBIGUOUS_RULE_REFERENCE" : "UNVERIFIED_HT178_CONDITION",
          ids: { from: binding.from, targets: binding.targets, modeIds: [...new Set(binding.from.flatMap(id => this.#catalogs.getAmmoItem("ht", id)?.weapon_mode_ids ?? []))] }, fields: { ["interchangeability_rules[" + binding.index + "]"]: binding.rule },
          reason: ambiguous ? "Named cartridge reference is not unique." : "Chamber length, action or shorter-shell permission is not fully encoded for a concrete platform.",
          recommendation: "Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions." });
      }
    }
    const htIndex = this.#index("ht");
    for (const binding of htIndex?.rules ?? []) {
      if (binding.rule.explicit_direction_v1) {
        for (const pair of binding.rule.explicit_direction_v1.mode_pair_assessments) {
          const result = this.checkCompatibility(pair.mode_id, pair.target_ammo_item_id, { book: "ht", kind: "ammo-item" });
          if (result.status === "undetermined") unsupported.push({ book: "ht", code: "UNVERIFIED_HT178_PAIR", rule: binding.index, modeId: pair.mode_id, id: pair.target_ammo_item_id, sourceAmmoItemId: pair.source_ammo_item_id,
            fields: { explicit_direction_v1: binding.rule.explicit_direction_v1, assessment: pair }, reasons: result.reasons, recommendation: "Confirm this exact platform/chamber/feeding condition from the source before changing its assessment." });
        }
        continue;
      }
      const modeIds = [...new Set(binding.from.flatMap(id => this.#catalogs.getAmmoItem("ht", id)?.weapon_mode_ids ?? []))];
      for (const modeId of modeIds) for (const target of binding.targets) for (const ammoId of target.ids) {
        const result = this.checkCompatibility(modeId, ammoId, { book: "ht", kind: "ammo-item" });
        if (result.status === "undetermined") unsupported.push({ book: "ht", code: "UNVERIFIED_HT178_PAIR", rule: binding.index, modeId, id: ammoId,
          fields: { ["interchangeability_rules[" + binding.index + "]"]: binding.rule, "mode.mechanism": this.#catalogs.getMode(modeId)?.mechanism },
          reasons: result.reasons, recommendation: "Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission." });
      }
    }
    const ut = this.#catalogs.getCatalog("ut");
    for (const load of ut?.special_loads ?? []) {
      for (const equipment of this.#catalogs.getCatalog("weapons")?.equipment ?? []) for (const mode of equipment.modes) {
        const p = mode.ammunition_profile;
        if (p?.special_load_ids?.includes(load.id) && !load.platform_tags_any?.some(tag => p.platform_tags?.includes(tag))) unsupported.push({ book: "ut", id: load.id, modeId: mode.weapon_mode_id, code: "CONFLICTING_SPECIAL_LOAD_TAGS",
          equipmentId: equipment.equipment_id, fields: { "ammunition_profile.special_load_ids": p.special_load_ids, "ammunition_profile.platform_tags": p.platform_tags, "special_loads.platform_tags_any": load.platform_tags_any },
          reason: "The positive special-load link and mandatory platform tag predicate cannot both pass; no tag hierarchy is declared.",
          recommendation: "Verify UT139 and the intended tag vocabulary. Then explicitly add the confirmed concrete platform tags or broaden the load predicate to paint_gun with source evidence. Do not infer aliases from names." });
      }
    }
    return snapshot({ catalogs: this.#catalogs.getDiagnostics(), unsupported, policy: "Explicit links and predicates only; unknown conditions remain undetermined. No gameplay integration." });
  }
}
import { publishedShortShellCompatibility } from "./ht-published-loads.js";
