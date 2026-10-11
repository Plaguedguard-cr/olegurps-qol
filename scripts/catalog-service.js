import { LEMAT, LEMAT_SHOT_CHARGE, correctHTMode, correctHTAmmo } from "./ht-physical-ammunition-evidence.js";
// Reference data only: no Actor, Item, settings, attack or damage writes.
export const CATALOG_DEFINITIONS = Object.freeze({
  weapons: Object.freeze({ filename: "olegurps_weapon_reference_catalog_v5_6.json",
    kind: "olegurps-weapon-reference-catalog-v5", schema: 5, revision: "5.6" }),
  lt: Object.freeze({ filename: "olegurps_lt_ammunition_catalog_v1_2.json",
    kind: "olegurps-lt-ammunition-catalog-v1", schema: 1, revision: "1.2" }),
  ht: Object.freeze({ filename: "olegurps_ht_ammunition_catalog_v1_3.json",
    kind: "olegurps-ht-ammunition-catalog-v1", schema: 1, revision: "1.3" }),
  ut: Object.freeze({ filename: "olegurps_ut_ammunition_catalog_v2_7.json",
    kind: "olegurps-ut-ammunition-catalog-v2", schema: 2, revision: "2.7" })
});

const VARIANT_COLLECTIONS = Object.freeze({
  lt: ["projectile_options"],
  ht: ["cartridge_upgrades", "projectile_options", "projectile_upgrades", "case_construction_options"],
  ut: ["special_loads", "warheads"]
});
const EMPTY = Object.freeze([]);

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function requireValue(condition, code, path, message) {
  if (!condition) throw Object.assign(new Error(message), { code, path });
}
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const isId = value => typeof value === "string" && value.trim().length > 0;
function array(value, path) {
  requireValue(Array.isArray(value), "INVALID_ARRAY", path, "Expected an array.");
  return value;
}
function ids(value, path) {
  const result = array(value, path);
  requireValue(result.every(isId), "INVALID_ID", path, "Expected nonempty string IDs.");
  requireValue(new Set(result).size === result.length, "DUPLICATE_REFERENCE", path, "Duplicate ID in references.");
  return result;
}
function record(value, path, fields = []) {
  requireValue(isObject(value), "INVALID_RECORD", path, "Expected a record.");
  for (const field of fields) requireValue(isId(value[field]), "MISSING_FIELD", path + "." + field, "Expected a nonempty string.");
}
function reference(index, id, path) {
  requireValue(index.has(id), "MISSING_REFERENCE", path, "Unknown referenced ID: " + id);
  return index.get(id);
}
function sameIds(actual, expected, path) {
  requireValue(actual.length === expected.size && actual.every(id => expected.has(id)),
    "INCONSISTENT_REFERENCE", path, "Forward and reverse references differ.");
}
function indexRecords(records, key, path) {
  const index = new Map();
  for (const [i, value] of array(records, path).entries()) {
    record(value, path + "[" + i + "]", [key]);
    requireValue(!index.has(value[key]), "DUPLICATE_ID", path + "[" + i + "]." + key, "Duplicate ID: " + value[key]);
    index.set(value[key], value);
  }
  return index;
}
function catalogPointer(value, target, path, historicalLT = false) {
  record(value, path, ["catalog_kind", "catalog_filename"]);
  const historical = /^olegurps_weapon_reference_catalog_v5_([0-9]+)[.]json$/.exec(value.catalog_filename);
  const current = /^olegurps_weapon_reference_catalog_v5_([0-9]+)[.]json$/.exec(target.filename);
  requireValue(value.catalog_kind === target.kind && (value.catalog_filename === target.filename ||
    (historicalLT && historical && current && Number(historical[1]) < Number(current[1]) && value.join_key === "weapon_mode_id")),
    "CATALOG_POINTER_MISMATCH", path, "Catalog pointer does not match this supported catalog set.");
}

function buildIndexes(book, data) {
  const definition = CATALOG_DEFINITIONS[book];
  record(data, "$", ["catalog_kind"]);
  requireValue(data.catalog_kind === definition.kind, "UNSUPPORTED_KIND", "$.catalog_kind", "Unsupported catalog kind.");
  requireValue(data.schema_version === definition.schema, "UNSUPPORTED_SCHEMA", "$.schema_version", "Unsupported schema version.");
  if (book === "weapons") {
    requireValue(isObject(data.rules_audit_v5_6), "UNSUPPORTED_REVISION", "$.rules_audit_v5_6",
      "Weapon revision 5.6 requires its separate audit marker; schema 5 alone is insufficient.");
    requireValue(data.revision === undefined || data.revision === definition.revision,
      "UNSUPPORTED_REVISION", "$.revision", "Unsupported weapon revision.");
  } else {
    requireValue(data.revision === definition.revision, "UNSUPPORTED_REVISION", "$.revision", "Unsupported catalog revision.");
    catalogPointer(data.weapon_catalog_link, CATALOG_DEFINITIONS.weapons, "$.weapon_catalog_link", book === "lt");
  }

  const indexes = new Map();
  const parents = new Map();
  const checks = { itemFamily: 0, familyItem: 0, familyMode: 0, variant: 0, companion: 0 };
  const add = (collection, key = "id") => {
    const result = indexRecords(data[collection], key, "$." + collection);
    indexes.set(collection, result);
    return result;
  };
  if (book === "weapons") {
    const sources = indexRecords(data.sources, "code", "$.sources");
    const equipment = add("equipment", "equipment_id");
    const modes = new Map();
    indexes.set("modes", modes);
    for (const item of equipment.values()) {
      record(item, item.equipment_id, ["name", "source"]);
      reference(sources, item.source, item.equipment_id + ".source");
      for (const mode of array(item.modes, item.equipment_id + ".modes")) {
        record(mode, item.equipment_id + ".modes", ["weapon_mode_id", "combat_type", "role"]);
        requireValue(!modes.has(mode.weapon_mode_id), "DUPLICATE_ID", mode.weapon_mode_id, "Duplicate weapon mode ID.");
        requireValue(["ranged", "melee", "effect"].includes(mode.combat_type),
          "INVALID_COMBAT_TYPE", mode.weapon_mode_id, "Unknown combat type.");
        requireValue(isObject(mode.stats) && isObject(mode.raw_calc), "MISSING_FIELD",
          mode.weapon_mode_id, "Mode requires stats and raw_calc records.");
        modes.set(mode.weapon_mode_id, mode);
        parents.set(mode.weapon_mode_id, item);
        for (const key of ["lt_ammo_item_ids", "ht_ammo_item_ids"])
          if (mode[key] !== undefined) ids(mode[key], mode.weapon_mode_id + "." + key);
        if (mode.ammunition_profile !== undefined) {
          const p = mode.ammunition_profile;
          record(p, mode.weapon_mode_id + ".ammunition_profile", ["status", "catalog_kind", "primary_ammo_family_id"]);
          for (const key of ["alternate_ammo_family_ids", "special_load_ids", "suggested_warhead_ids"])
            ids(p[key], mode.weapon_mode_id + "." + key);
          requireValue(p.default_warhead_id === null || isId(p.default_warhead_id),
            "INVALID_ID", mode.weapon_mode_id + ".default_warhead_id", "Expected a warhead ID or null.");
        }
      }
    }
    catalogPointer(data.lt_ammunition_catalog_link, CATALOG_DEFINITIONS.lt, "$.lt_ammunition_catalog_link");
    catalogPointer(data.ht_ammunition_catalog_link, CATALOG_DEFINITIONS.ht, "$.ht_ammunition_catalog_link");
    catalogPointer(data.ammunition_catalog_link, CATALOG_DEFINITIONS.ut, "$.ammunition_catalog_link");
    return { indexes, parents, checks };
  }

  const families = add("ammo_families");
  for (const family of families.values()) record(family, family.id, ["name"]);
  const variants = new Map();
  for (const collection of VARIANT_COLLECTIONS[book]) {
    for (const value of add(collection).values()) {
      record(value, collection + "." + value.id, ["name"]);
      requireValue(!variants.has(value.id), "DUPLICATE_ID", collection + "." + value.id, "Duplicate variant ID across variant collections.");
      variants.set(value.id, value);
    }
  }
  indexes.set("variants", variants);
  // Reference-only records have their own namespaces, never ammunition indexes.
  for (const collection of book === "lt" ? ["other_referenced_options"] :
    book === "ht" ? ["shot_sizes", "feed_devices_reference_only"] : []) {
    if (data[collection] !== undefined) add(collection);
  }
  if (book === "ut") {
    for (const family of families.values()) {
      const links = array(family.linked_weapon_modes, family.id + ".linked_weapon_modes");
      const seen = new Set();
      for (const link of links) {
        record(link, family.id + ".linked_weapon_modes", ["equipment_id", "weapon_mode_id"]);
        requireValue(!seen.has(link.weapon_mode_id), "DUPLICATE_REFERENCE", family.id, "Duplicate linked mode.");
        seen.add(link.weapon_mode_id);
      }
    }
    for (const load of indexes.get("special_loads").values()) {
      if (load.warhead_ref !== undefined) {
        reference(indexes.get("warheads"), load.warhead_ref, load.id + ".warhead_ref");
        checks.variant++;
      }
    }
    if (data.indexes !== undefined) {
      record(data.indexes, "$.indexes");
      for (const key of ["ammo_family_ids", "ammo_family_ids_with_linked_weapons"]) {
        const expected = new Set([...families.values()]
          .filter(f => key === "ammo_family_ids" || f.linked_weapon_modes.length).map(f => f.id));
        sameIds(ids(data.indexes[key], "$.indexes." + key), expected, "$.indexes." + key);
      }
      for (const id of ids(data.indexes.warhead_ids_requiring_notes, "$.indexes.warhead_ids_requiring_notes"))
        reference(indexes.get("warheads"), id, "$.indexes.warhead_ids_requiring_notes");
      record(data.indexes.warhead_ids_by_min_tl, "$.indexes.warhead_ids_by_min_tl");
      for (const list of Object.values(data.indexes.warhead_ids_by_min_tl))
        for (const id of ids(list, "$.indexes.warhead_ids_by_min_tl"))
          reference(indexes.get("warheads"), id, "$.indexes.warhead_ids_by_min_tl");
    }
  } else {
    const items = add("ammo_items");
    for (const family of families.values()) {
      ids(family.ammo_item_ids, family.id + ".ammo_item_ids");
      ids(family.compatible_weapon_mode_ids, family.id + ".compatible_weapon_mode_ids");
    }
    for (const item of items.values()) {
      record(item, item.id, ["name", "ammo_family_id"]);
      ids(item.weapon_mode_ids, item.id + ".weapon_mode_ids");
      const family = reference(families, item.ammo_family_id, item.id + ".ammo_family_id");
      requireValue(family.ammo_item_ids.includes(item.id), "INCONSISTENT_REFERENCE", item.id, "Family lacks reverse item link.");
      checks.itemFamily++;
      if (item.variant_id != null) {
        reference(variants, item.variant_id, item.id + ".variant_id");
        checks.variant++;
      }
      if (item.native_linked_mode_ids !== undefined) ids(item.native_linked_mode_ids, item.id + ".native_linked_mode_ids");
    }
    for (const family of families.values()) {
      const modes = new Set();
      for (const id of family.ammo_item_ids) {
        const item = reference(items, id, family.id + ".ammo_item_ids");
        requireValue(item.ammo_family_id === family.id, "INCONSISTENT_REFERENCE", family.id, "Item points to a different family.");
        for (const modeId of item.weapon_mode_ids) modes.add(modeId);
        checks.familyItem++;
      }
      sameIds(family.compatible_weapon_mode_ids, modes, family.id + ".compatible_weapon_mode_ids");
      checks.familyMode += modes.size;
    }
  }
  for (const option of variants.values()) {
    if (option.excludes !== undefined) {
      for (const id of ids(option.excludes, option.id + ".excludes")) {
        reference(variants, id, option.id + ".excludes");
        checks.variant++;
      }
    }
  }
  if (book === "ht") {
    validateHT178(data, indexes, checks);
    checks.eligibilityOptions = 0;
    for (const collection of VARIANT_COLLECTIONS.ht) for (const option of indexes.get(collection).values()) {
      const e = option.eligibility_v1, path = option.id + ".eligibility_v1";
      record(e, path, ["contract", "authority", "source_ref", "rule_category", "candidate_policy"]);
      requireValue(e.contract === "ht-option-eligibility-v1" && e.rule_category === collection && e.on_missing_evidence === "undetermined" && e.never_allow_by_caliber_name_or_tl_alone === true,
        "INVALID_ELIGIBILITY_POLICY", path, "Unsupported eligibility contract or permissive missing-evidence policy.");
      requireValue(isObject(e.conditions), "INVALID_RECORD", path + ".conditions", "Expected condition record.");
      ids(e.explicit_evidence_required, path + ".explicit_evidence_required");
      requireValue(typeof e.do_not_reapply_native_effects === "boolean" && (e.overlap_guard === null || isId(e.overlap_guard)), "INVALID_ELIGIBILITY_POLICY", path, "Invalid native-effect guard.");
      for (const [key, value] of Object.entries(e.conditions)) {
        if (key.endsWith("_any") || key === "forbidden_classes") ids(value, path + ".conditions." + key);
        if (["minimum_caliber_mm", "maximum_caliber_mm", "minimum_availability_tl"].includes(key)) requireValue(typeof value === "number" && Number.isFinite(value) && value >= 0, "INVALID_ELIGIBILITY_CONDITION", path, "Expected nonnegative numeric bound.");
        if (key === "requires_base_variant_id") reference(indexes.get("variants"), value, path);
      }
      if (e.conditions.minimum_caliber_mm !== undefined && e.conditions.maximum_caliber_mm !== undefined) requireValue(e.conditions.minimum_caliber_mm <= e.conditions.maximum_caliber_mm, "INVALID_ELIGIBILITY_CONDITION", path, "Reversed caliber bounds.");
      checks.eligibilityOptions++;
    }
  }
  return { indexes, parents, checks };
}

function validateHT178(data, indexes, checks) {
  checks.ht178Pairs = 0;
  const items = indexes.get("ammo_items");
  for (const [i, rule] of (data.interchangeability_rules ?? []).entries()) {
    const direction = rule.explicit_direction_v1;
    if (!direction) continue;
    const path = "$.interchangeability_rules[" + i + "].explicit_direction_v1";
    record(direction, path, ["basis_page", "source_rule"]);
    requireValue(direction.directed_only === true && direction.transitive_permission === false &&
      direction.requires_native_exact_source_chambering === true && direction.manual_chamber_or_cycling_override_without_source === false,
      "INVALID_DIRECTION_POLICY", path, "Explicit directions must preserve native exact chambering and forbid reverse/transitive/manual overrides.");
    for (const key of ["source_ammo_item_ids", "target_ammo_item_ids", "excluded_ambiguous_target_or_source_ids"]) {
      for (const id of ids(direction[key] ?? (key.startsWith("excluded") ? [] : null), path + "." + key)) reference(items, id, path + "." + key);
    }
    requireValue(direction.source_ammo_item_ids.length && direction.target_ammo_item_ids.length, "MISSING_FIELD", path, "Direction requires explicit source and target IDs.");
    if (direction.known_platform_action_requirement !== null) ids(direction.known_platform_action_requirement, path + ".known_platform_action_requirement");
    const excluded = direction.excluded_ambiguous_target_or_source_ids ?? [];
    const pairs = new Set();
    for (const pair of array(direction.mode_pair_assessments, path + ".mode_pair_assessments")) {
      record(pair, path, ["mode_id", "equipment_id", "source_ammo_item_id", "target_ammo_item_id", "source_mode_action", "status", "reason"]);
      reference(items, pair.source_ammo_item_id, path); reference(items, pair.target_ammo_item_id, path);
      requireValue(["confirmed_to_fire", "undetermined"].includes(pair.status), "INVALID_PAIR_STATUS", path, "Unknown explicit assessment status.");
      requireValue(Array.isArray(pair.warnings) && pair.warnings.every(isId), "INVALID_ARRAY", path + ".warnings", "Warnings must be strings.");
      const key = [pair.mode_id, pair.source_ammo_item_id, pair.target_ammo_item_id].join("/");
      requireValue(!pairs.has(key), "DUPLICATE_REFERENCE", path, "Duplicate explicit mode pair."); pairs.add(key);
      requireValue((direction.source_ammo_item_ids.includes(pair.source_ammo_item_id) || excluded.includes(pair.source_ammo_item_id)) &&
        (direction.target_ammo_item_ids.includes(pair.target_ammo_item_id) || excluded.includes(pair.target_ammo_item_id)),
        "INCONSISTENT_REFERENCE", path, "Assessment must use directed IDs or explicitly excluded IDs.");
      requireValue(pair.status !== "confirmed_to_fire" || (!excluded.includes(pair.source_ammo_item_id) && !excluded.includes(pair.target_ammo_item_id)),
        "INVALID_PAIR_STATUS", path, "Excluded heavy load cannot be confirmed.");
      checks.ht178Pairs++;
    }
  }
}

function validateWeaponLinks(book, entry, weapons) {
  const modes = weapons.indexes.get("modes");
  const families = entry.indexes.get("ammo_families");
  const items = entry.indexes.get("ammo_items");
  const links = new Map();
  let forward = 0;
  let reverse = 0;
  const modeTargets = mode => book === "ut"
    ? mode.ammunition_profile ? [mode.ammunition_profile.primary_ammo_family_id,
      ...mode.ammunition_profile.alternate_ammo_family_ids] : []
    : mode[book + "_ammo_item_ids"] ?? [];
  const checkMode = (modeId, path) => {
    const mode = reference(modes, modeId, path);
    requireValue(weapons.parents.get(modeId).source.toLowerCase() === book,
      "SOURCE_MISMATCH", path, "Mode belongs to a different source book.");
    return mode;
  };

  for (const [modeId, mode] of modes) {
    const targetIds = modeTargets(mode);
    if (!targetIds.length) continue;
    checkMode(modeId, modeId);
    ids(targetIds, modeId + ".ammunition");
    const equipmentId = weapons.parents.get(modeId).equipment_id;
    for (const id of targetIds) {
      const target = reference(book === "ut" ? families : items, id, modeId + ".ammunition");
      const reverseIds = book === "ut" ? target.linked_weapon_modes.map(link => link.weapon_mode_id) : target.weapon_mode_ids;
      requireValue(reverseIds.includes(modeId), "INCONSISTENT_REFERENCE", modeId, "Ammunition lacks reverse mode link: " + id);
      forward++;
    }
    const profile = book === "ut" ? mode.ammunition_profile : null;
    if (profile) {
      requireValue(profile.catalog_kind === CATALOG_DEFINITIONS.ut.kind,
        "CATALOG_POINTER_MISMATCH", modeId + ".ammunition_profile", "Unknown ammunition profile kind.");
      for (const id of profile.special_load_ids) {
        reference(entry.indexes.get("special_loads"), id, modeId + ".special_load_ids");
        entry.checks.variant++;
      }
      for (const id of [...profile.suggested_warhead_ids, ...(profile.default_warhead_id ? [profile.default_warhead_id] : [])]) {
        reference(entry.indexes.get("warheads"), id, modeId + ".warheads");
        entry.checks.variant++;
      }
    }
    links.set(modeId, freeze({
      book, modeId, equipmentId,
      ammoItemIds: book === "ut" ? [] : [...targetIds],
      ammoFamilyIds: book === "ut" ? [...targetIds] : [...new Set(targetIds.map(id => items.get(id).ammo_family_id))],
      specialLoadIds: [...(profile?.special_load_ids ?? [])],
      defaultWarheadId: profile?.default_warhead_id ?? null,
      suggestedWarheadIds: [...(profile?.suggested_warhead_ids ?? [])]
    }));
  }
  for (const target of (book === "ut" ? families : items).values()) {
    const references = book === "ut" ? target.linked_weapon_modes :
      target.weapon_mode_ids.map(weapon_mode_id => ({ weapon_mode_id }));
    for (const link of references) {
      const mode = checkMode(link.weapon_mode_id, target.id + ".weapon_mode_ids");
      requireValue(modeTargets(mode).includes(target.id), "INCONSISTENT_REFERENCE", target.id,
        "Weapon mode lacks forward ammunition link: " + link.weapon_mode_id);
      if (book === "ut") requireValue(weapons.parents.get(link.weapon_mode_id).equipment_id === link.equipment_id,
        "EQUIPMENT_MISMATCH", target.id, "Reverse mode link names the wrong equipment.");
      reverse++;
    }
    for (const companionId of target.native_linked_mode_ids ?? []) {
      checkMode(companionId, target.id + ".native_linked_mode_ids");
      entry.checks.companion++;
    }
  }
  if (book === "ht") for (const rule of entry.data.interchangeability_rules ?? []) {
    const direction = rule.explicit_direction_v1;
    if (!direction) continue;
    for (const pair of direction.mode_pair_assessments) {
      const mode = checkMode(pair.mode_id, "explicit_direction_v1.mode_pair_assessments");
      requireValue(weapons.parents.get(pair.mode_id).equipment_id === pair.equipment_id, "EQUIPMENT_MISMATCH", pair.mode_id, "Explicit pair names wrong equipment.");
      requireValue(mode.ht_ammo_item_ids?.includes(pair.source_ammo_item_id), "INCONSISTENT_REFERENCE", pair.mode_id, "Explicit pair lacks native source ammunition link.");
      requireValue(mode.mechanism?.action_system === pair.source_mode_action, "INCONSISTENT_REFERENCE", pair.mode_id, "Explicit action assessment differs from native mechanism.");
      if (pair.status === "confirmed_to_fire") {
        requireValue(mode.ht_ammo_resolution?.status === "exact_chambering", "INCONSISTENT_REFERENCE", pair.mode_id, "Confirmed pair requires native exact chambering.");
        const actions = direction.known_platform_action_requirement;
        requireValue(actions === null || (actions.includes(mode.mechanism.action_system) && mode.mechanism.confidence === "high"),
          "INCONSISTENT_REFERENCE", pair.mode_id, "Confirmed pair lacks required high-confidence platform action.");
      }
    }
  }
  return { links, relationshipChecks: { status: "passed", forward, reverse, linkedModes: links.size } };
}

function collectWarnings(book, data, indexes) {
  const warnings = [];
  if (book === "lt" && data.weapon_catalog_link.catalog_filename !== CATALOG_DEFINITIONS.weapons.filename) warnings.push({ code: "HISTORICAL_SOURCE_POINTER", path: "$.weapon_catalog_link.catalog_filename", message: "Unchanged LT provenance names an earlier schema-5 file; loading uses only the current weapon catalog and all links are validated against it." });
  if (book !== "weapons") {
    warnings.push({ code: "RULES_NOT_EVALUATED", path: "$", message:
      "Reference links are validated, but game-rule completeness and conditional compatibility are not evaluated. No ammunition effects are applied." });
    const external = [...indexes.get("variants").values()].filter(value => value.requires_external_rule);
    if (external.length) warnings.push({ code: "EXTERNAL_RULE_REQUIRED", path: "$.projectile_options",
      message: "Some variants require external rules.", ids: external.map(value => value.id) });
    if (Array.isArray(data.interchangeability_rules) && data.interchangeability_rules.length) {
      warnings.push({ code: "TEXTUAL_COMPATIBILITY", path: "$.interchangeability_rules",
        message: "Legacy textual directions are retained; structured directions are validated separately.", count: data.interchangeability_rules.filter(rule => !rule.explicit_direction_v1).length });
      const structured = data.interchangeability_rules.filter(rule => rule.explicit_direction_v1);
      if (structured.length) warnings.push({ code: "STRUCTURED_HT178_REFERENCE", path: "$.interchangeability_rules[].explicit_direction_v1", count: structured.length, message: "Explicit firing assessments do not guarantee feeding or cycling." });
    }
  } else if (isObject(data.stats?.governing_skill_status_counts)) {
    const actual = {};
    for (const mode of indexes.get("modes").values()) {
      const status = mode.governing_skill?.status ?? "missing";
      actual[status] = (actual[status] ?? 0) + 1;
    }
    const declared = data.stats.governing_skill_status_counts;
    if (Object.keys({ ...declared, ...actual }).some(key => (declared[key] ?? 0) !== (actual[key] ?? 0)))
      warnings.push({ code: "STALE_DERIVED_COUNTS", path: "$.stats.governing_skill_status_counts",
        message: "Stored summary differs from records; service indexes use the records.", declared, actual });
  }
  return warnings;
}

/**
 * One asynchronous load per instance (including failures). Query methods are
 * synchronous and return deeply frozen records/arrays, or null/[] if unavailable.
 * Cross-catalog failures disable the affected ammunition catalog, not the other
 * books. Without weapons, ammunition remains readable with unchecked links.
 */
export class CatalogService {
  #entries = new Map();
  #promise = null;
  #fetcher;
  #baseUrl;
  #logger;
  #timeoutMs;

  constructor({ fetcher = (...args) => globalThis.fetch(...args),
    baseUrl = "modules/olegurps-qol/data/catalogs/", logger = console, timeoutMs = 15000 } = {}) {
    this.#fetcher = fetcher;
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    this.#logger = logger;
    this.#timeoutMs = timeoutMs;
    for (const [book, definition] of Object.entries(CATALOG_DEFINITIONS)) {
      this.#entries.set(book, { status: "idle", definition, version: null, data: null,
        indexes: new Map(), parents: new Map(), links: new Map(), checks: {},
        relationshipChecks: { status: "not_checked", forward: 0, reverse: 0, linkedModes: 0 },
        counts: {}, warnings: [], errors: [] });
    }
    Object.freeze(this);
  }

  load() {
    if (!this.#promise) {
      for (const entry of this.#entries.values()) entry.status = "loading";
      this.#promise = this.#loadAll();
    }
    return this.#promise;
  }

  #unavailable(entry, error, fallback = "LOAD_ERROR") {
    entry.status = "unavailable";
    entry.errors.push({ code: error?.code ?? fallback, path: error?.path ?? "$",
      message: String(error?.message ?? error) });
    entry.data = null;
    entry.indexes.clear();
    entry.parents.clear();
    entry.links.clear();
  }

  async #loadOne(book, entry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetcher(this.#baseUrl + entry.definition.filename, { signal: controller.signal });
      requireValue(response?.ok, "HTTP_ERROR", entry.definition.filename, "HTTP " + (response?.status ?? "unavailable"));
      let data;
      try { data = await response.json(); }
      catch (error) { throw Object.assign(new Error("Invalid JSON: " + error.message), { code: "INVALID_JSON" }); }
      // Detach even an injected loader's objects before freezing the cache.
      data = structuredClone(data);
      entry.version = { catalogKind: data?.catalog_kind ?? null, schemaVersion: data?.schema_version ?? null,
        revision: book === "weapons" ? isObject(data?.rules_audit_v5_6) ? "5.6" : null : data?.revision ?? null,
        revisionSource: book === "weapons" ? "rules_audit_v5_6" : "revision" };
      const built = buildIndexes(book, data);
      Object.assign(entry, built, { data });
      entry.counts = Object.fromEntries([...entry.indexes].map(([name, index]) => [name, index.size]));
      entry.warnings = collectWarnings(book, data, entry.indexes);
    } catch (error) {
      this.#unavailable(entry, controller.signal.aborted ?
        Object.assign(new Error("Catalog load timed out."), { code: "LOAD_TIMEOUT" }) : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async #loadAll() {
    await Promise.all([...this.#entries].map(([book, entry]) => this.#loadOne(book, entry)));
    const weapons = this.#entries.get("weapons");
    for (const book of ["lt", "ht", "ut"]) {
      const entry = this.#entries.get(book);
      if (!entry.data) continue;
      if (!weapons.data) {
        entry.relationshipChecks.status = "skipped";
        entry.warnings.push({ code: "WEAPON_LINKS_UNCHECKED", path: "$.weapon_catalog_link",
          message: "Weapon catalog is unavailable; cross-catalog references could not be checked." });
        continue;
      }
      try { Object.assign(entry, validateWeaponLinks(book, entry, weapons)); }
      catch (error) {
        entry.relationshipChecks.status = "failed";
        this.#unavailable(entry, error, "LINK_VALIDATION_ERROR");
      }
    }
    if (weapons.data) {
      const checks = ["lt", "ht", "ut"].map(book => this.#entries.get(book).relationshipChecks);
      weapons.relationshipChecks = {
        status: checks.every(check => check.status === "passed") ? "passed" : "partial",
        forward: checks.reduce((sum, check) => sum + check.forward, 0),
        reverse: checks.reduce((sum, check) => sum + check.reverse, 0),
        linkedModes: checks.reduce((sum, check) => sum + check.linkedModes, 0)
      };
    }
    for (const entry of this.#entries.values()) {
      if (entry.data) {
        freeze(entry.data);
        entry.status = "ready";
      }
    }
    const diagnostics = this.getDiagnostics();
    // A console implementation supplied by another module must not break loading.
    try {
      const method = diagnostics.state === "ready" ? "info" : "warn";
      this.#logger?.[method]?.("OleGURPS QOL | CatalogService", diagnostics);
    } catch (_error) { /* Diagnostics remain accessible through the API. */ }
    return diagnostics;
  }

  #ready(book) {
    const entry = this.#entries.get(book);
    return entry?.status === "ready" ? entry : null;
  }

  getDiagnostics() {
    const catalogs = {};
    for (const [book, entry] of this.#entries) {
      catalogs[book] = {
        status: entry.status, filename: entry.definition.filename,
        expected: { catalogKind: entry.definition.kind, schemaVersion: entry.definition.schema, revision: entry.definition.revision },
        version: entry.version, counts: entry.counts,
        indexes: entry.status === "ready" ? {
          ...Object.fromEntries([...entry.indexes].map(([name, index]) => [name, index.size])),
          ...(book === "weapons" ? { modeEquipment: entry.parents.size } : { modeLinks: entry.links.size })
        } : {},
        relationships: { ...entry.relationshipChecks, internal: entry.checks },
        errors: entry.errors, warnings: entry.warnings,
        unavailableReason: entry.errors[0]?.message ?? null
      };
    }
    const states = [...this.#entries.values()].map(entry => entry.status);
    const ready = states.filter(state => state === "ready").length;
    const state = states.includes("loading") ? "loading" : states.every(s => s === "idle") ? "idle" :
      ready === states.length ? "ready" : ready ? "partial" : "unavailable";
    return freeze(structuredClone({ state, catalogs }));
  }

  getStatus(book) { return this.#entries.has(book) ? this.getDiagnostics().catalogs[book] : null; }
  getCatalog(book) { return this.#ready(book)?.data ?? null; }
  getRecord(book, collection, id) { return this.#ready(book)?.indexes.get(collection)?.get(id) ?? null; }
  getEquipment(id) {
    const equipment = this.getRecord("weapons", "equipment", id);
    return equipment?.equipment_id === LEMAT.equipmentId ? freeze({ ...equipment,
      modes: equipment.modes.map(mode => correctHTMode(mode, equipment)) }) : equipment;
  }
  getMode(id) {
    return freeze(correctHTMode(this.getRecord("weapons", "modes", id), this.#ready("weapons")?.parents.get(id)));
  }
  getEquipmentForMode(id) { return this.getEquipment(this.#ready("weapons")?.parents.get(id)?.equipment_id); }
  getModesForEquipment(id) { return this.getEquipment(id)?.modes ?? EMPTY; }
  getAmmoItem(book, id) {
    if (book === "ht" && id === LEMAT.shotAmmoId && this.#ready(book)?.relationshipChecks.status === "passed" &&
        this.getMode(LEMAT.shotModeId)?.ht_ammo_item_ids.includes(id)) return LEMAT_SHOT_CHARGE;
    const record = this.getRecord(book, "ammo_items", id);
    return book === "ht" ? freeze(correctHTAmmo(record)) : record;
  }
  getAmmoFamily(book, id) {
    const charge = book === "ht" && id === LEMAT_SHOT_CHARGE.ammo_family_id ? this.getAmmoItem(book, LEMAT.shotAmmoId) : null;
    return charge ? freeze({ id, name: charge.name, ammo_item_ids: [charge.id], compatible_weapon_mode_ids: [LEMAT.shotModeId],
      provenance: charge.provenance }) : this.getRecord(book, "ammo_families", id);
  }
  getVariant(book, id) { return this.getRecord(book, "variants", id); }
  getModeLinks(id) {
    const book = this.getEquipmentForMode(id)?.source.toLowerCase();
    const links = this.#ready(book)?.links.get(id) ?? null;
    return links && id === LEMAT.shotModeId && this.getAmmoItem("ht", LEMAT.shotAmmoId)
      ? freeze({ ...links, ammoItemIds: [LEMAT.shotAmmoId], ammoFamilyIds: [] }) : links;
  }
  getModesForAmmoItem(book, id) {
    const entry = this.#ready(book);
    if (entry?.relationshipChecks.status !== "passed") return EMPTY;
    return freeze((this.getAmmoItem(book, id)?.weapon_mode_ids ?? []).map(modeId => this.getMode(modeId)));
  }
  getModesForAmmoFamily(book, id) {
    const entry = this.#ready(book);
    if (entry?.relationshipChecks.status !== "passed") return EMPTY;
    const family = this.getAmmoFamily(book, id);
    const modeIds = book === "ut" ? family?.linked_weapon_modes.map(link => link.weapon_mode_id) :
      family?.compatible_weapon_mode_ids;
    return freeze((modeIds ?? []).map(modeId => this.getMode(modeId)));
  }
}
