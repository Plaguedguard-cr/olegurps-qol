import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { WeaponCatalogBindingService } from "../scripts/weapon-catalog-binding-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";

const books = Object.keys(CATALOG_DEFINITIONS);
const pointer = book => ({ catalog_kind: CATALOG_DEFINITIONS[book].kind,
  catalog_filename: CATALOG_DEFINITIONS[book].filename });
const mode = (book, extra) => ({ weapon_mode_id: book + "-mode", combat_type: "ranged",
  role: "attack", stats: { damage: { base: "2d", type: "pi" } }, raw_calc: { damage: "2d pi" }, ...extra });
function fixture() {
  const data = Object.fromEntries(books.map(book => [book, {
    schema_version: CATALOG_DEFINITIONS[book].schema, catalog_kind: CATALOG_DEFINITIONS[book].kind,
    ...(book === "weapons" ? {} : { revision: CATALOG_DEFINITIONS[book].revision, weapon_catalog_link: pointer("weapons") })
  }]));
  Object.assign(data.weapons, {
    rules_audit_v5_6: {}, sources: ["LT", "HT", "UT"].map(code => ({ code })),
    lt_ammunition_catalog_link: pointer("lt"), ht_ammunition_catalog_link: pointer("ht"),
    ammunition_catalog_link: pointer("ut"),
    equipment: ["lt", "ht", "ut"].map(book => ({ equipment_id: book + "-equipment",
      name: "Same name, different platform", source: book.toUpperCase(),
      modes: [mode(book, book === "ut" ? { ammunition_profile: {
        status: "linked", catalog_kind: CATALOG_DEFINITIONS.ut.kind,
        primary_ammo_family_id: "ut-family", alternate_ammo_family_ids: [],
        special_load_ids: ["ut-load"], default_warhead_id: "ut-warhead", suggested_warhead_ids: ["ut-warhead"]
      } } : { [book + "_ammo_item_ids"]: [book + "-round"] })] }))
  });
  for (const book of ["lt", "ht"]) Object.assign(data[book], {
    ammo_families: [{ id: book + "-family", name: "Family", ammo_item_ids: [book + "-round"],
      compatible_weapon_mode_ids: [book + "-mode"] }],
    ammo_items: [{ id: book + "-round", name: "Round", ammo_family_id: book + "-family",
      weapon_mode_ids: [book + "-mode"], ...(book === "lt" ? { variant_id: "lt-option" } : {}) }],
    projectile_options: [{ id: book + "-option", name: "Option", mechanics: { multiplier: 1 } }]
  });
  Object.assign(data.ht, { cartridge_upgrades: [], projectile_upgrades: [], case_construction_options: [] });
  Object.assign(data.ut, {
    ammo_families: [{ id: "ut-family", name: "UT family",
      linked_weapon_modes: [{ equipment_id: "ut-equipment", weapon_mode_id: "ut-mode" }] }],
    special_loads: [{ id: "ut-load", name: "Load", warhead_ref: "ut-warhead" }],
    warheads: [{ id: "ut-warhead", name: "Warhead" }]
  });
  for (const option of data.ht.projectile_options) option.eligibility_v1 = { contract: "ht-option-eligibility-v1", authority: "Test catalog", source_ref: "HT 166", rule_category: "projectile_options", conditions: {}, explicit_evidence_required: [], candidate_policy: "requires-platform-proof", on_missing_evidence: "undetermined", never_allow_by_caliber_name_or_tl_alone: true, do_not_reapply_native_effects: false, overlap_guard: null };
  return data;
}
function loader(data = fixture(), overrides = {}) {
  const calls = [];
  return { calls, fetcher: async (url, options) => {
    const book = books.find(key => url.endsWith(CATALOG_DEFINITIONS[key].filename));
    assert.ok(book, "known catalog URL");
    calls.push(book);
    if (overrides[book]) return overrides[book](url, options);
    return { ok: true, status: 200, json: async () => data[book] };
  } };
}
async function loaded(data = fixture(), overrides = {}) {
  const io = loader(data, overrides);
  const service = new CatalogService({ fetcher: io.fetcher, logger: null });
  const diagnostics = await service.load();
  return { service, diagnostics, calls: io.calls };
}

test("all four real catalogs load with record-derived counts and symmetric links", async () => {
  const originals = {};
  for (const book of books) originals[book] = JSON.parse(await fs.readFile(
    new URL("../data/catalogs/" + CATALOG_DEFINITIONS[book].filename, import.meta.url), "utf8"));
  const { service, diagnostics } = await loaded(originals);
  assert.equal(diagnostics.state, "ready");
  const weaponModes = originals.weapons.equipment.flatMap(e => e.modes);
  assert.equal(diagnostics.catalogs.weapons.counts.equipment, originals.weapons.equipment.length);
  assert.equal(diagnostics.catalogs.weapons.counts.modes, weaponModes.length);
  for (const book of books) {
    const status = diagnostics.catalogs[book];
    assert.equal(status.status, "ready");
    assert.deepEqual(status.errors, []);
    assert.equal(status.version.schemaVersion, CATALOG_DEFINITIONS[book].schema);
    assert.equal(status.version.revision, CATALOG_DEFINITIONS[book].revision);
  }
  for (const book of ["lt", "ht", "ut"]) {
    const status = diagnostics.catalogs[book];
    const edges = book === "ut" ? originals.ut.ammo_families.flatMap(f => f.linked_weapon_modes.map(m => m.weapon_mode_id)) :
      originals[book].ammo_items.flatMap(i => i.weapon_mode_ids);
    assert.equal(status.relationships.forward, edges.length);
    assert.equal(status.relationships.reverse, edges.length);
    assert.equal(status.relationships.linkedModes, new Set(edges).size);
    assert.equal(status.counts.ammo_families, originals[book].ammo_families.length);
    if (book !== "ut") assert.equal(status.counts.ammo_items, originals[book].ammo_items.length);
    assert.equal(status.relationships.status, "passed");
  }
  assert.equal(diagnostics.catalogs.weapons.version.revisionSource, "rules_audit_v5_6");
  assert.equal(service.getAmmoItem("ut", "7_5mm_clp"), null);
  assert.ok(service.getAmmoFamily("ut", "7_5mm_clp"));
  assert.ok(service.getVariant("ut", "drugged_dart"));
  assert.ok(service.getVariant("ut", "stingray"));
  assert.ok(service.getVariant("lt", "bodkin"));
  assert.ok(service.getVariant("ht", "ht_plus_p"));
  assert.ok(diagnostics.catalogs.weapons.warnings.some(w => w.code === "STALE_DERIVED_COUNTS"));
  assert.ok(diagnostics.catalogs.lt.warnings.some(w => w.code === "EXTERNAL_RULE_REQUIRED"));
  assert.ok(diagnostics.catalogs.ht.warnings.some(w => w.code === "TEXTUAL_COMPATIBILITY"));
  // No source object supplied by the loader was frozen or altered.
  assert.equal(Object.isFrozen(originals.weapons), false);
});

test("lookups retain original IDs, scoped namespaces, and exact declared relationships", async () => {
  const { service } = await loaded();
  for (const book of ["lt", "ht", "ut"]) {
    assert.equal(service.getEquipment(book + "-equipment").source, book.toUpperCase());
    const mode = service.getMode(book + "-mode");
    assert.equal(service.getEquipmentForMode(mode.weapon_mode_id), service.getEquipment(book + "-equipment"));
    assert.deepEqual(service.getModesForEquipment(book + "-equipment"), [mode]);
    assert.equal(service.getAmmoFamily(book, book + "-family").id, book + "-family");
    assert.deepEqual(service.getModesForAmmoFamily(book, book + "-family"), [mode]);
    assert.deepEqual(service.getModeLinks(book + "-mode").ammoFamilyIds, [book + "-family"]);
    if (book !== "ut") {
      assert.deepEqual(service.getModeLinks(book + "-mode").ammoItemIds, [book + "-round"]);
      assert.deepEqual(service.getModesForAmmoItem(book, book + "-round"), [mode]);
      assert.equal(service.getAmmoItem(book, book + "-round"), service.getCatalog(book).ammo_items[0]);
    }
  }
  assert.equal(service.getAmmoItem("lt", "ht-round"), null);
  assert.equal(service.getEquipment("Same name, different platform"), null);
  assert.equal(service.getVariant("lt", "lt-option").id, "lt-option");
  assert.equal(service.getRecord("ut", "warheads", "ut-warhead").id, "ut-warhead");
  assert.deepEqual(service.getModeLinks("ut-mode").specialLoadIds, ["ut-load"]);
  assert.equal(service.getModeLinks("ut-mode").defaultWarheadId, "ut-warhead");
  assert.equal(service.getMode("missing"), null);
  assert.equal(service.getModeLinks("missing"), null);
  assert.deepEqual(service.getModesForAmmoItem("unknown", "missing"), []);
  assert.equal(service.getStatus("__proto__"), null);
});

test("concurrent/repeated loads share one promise and fetch each file once", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const data = fixture();
  const io = loader(data);
  const service = new CatalogService({ logger: null, baseUrl: "/prefix/modules/olegurps-qol/data/catalogs",
    fetcher: async (url, options) => { assert.ok(url.startsWith("/prefix/modules/")); await gate; return io.fetcher(url, options); } });
  assert.equal(service.getDiagnostics().state, "idle");
  const first = service.load();
  assert.equal(service.load(), first);
  assert.equal(service.getDiagnostics().state, "loading");
  assert.equal(service.getEquipment("lt-equipment"), null);
  release();
  await first;
  assert.equal(service.load(), first);
  await service.load();
  assert.deepEqual(io.calls.sort(), [...books].sort());
});

test("all public records, arrays, links, and diagnostics protect the detached cache", async () => {
  const original = fixture();
  const { service, diagnostics } = await loaded(original);
  const equipment = service.getEquipment("lt-equipment");
  assert.throws(() => { equipment.name = "changed"; }, TypeError);
  assert.throws(() => { equipment.modes[0].stats.damage.base = "100d"; }, TypeError);
  assert.throws(() => service.getModesForEquipment("lt-equipment").push({}), TypeError);
  assert.throws(() => service.getCatalog("lt").ammo_items.splice(0, 1), TypeError);
  assert.throws(() => service.getModeLinks("lt-mode").ammoItemIds.push("fake"), TypeError);
  assert.throws(() => service.getModesForAmmoFamily("lt", "lt-family").pop(), TypeError);
  assert.throws(() => { service.getVariant("lt", "lt-option").mechanics.multiplier = 9; }, TypeError);
  assert.throws(() => { diagnostics.catalogs.lt.status = "unavailable"; }, TypeError);
  assert.throws(() => { service.getStatus("lt").counts.ammo_items = 0; }, TypeError);
  original.weapons.equipment[0].name = "loader changed";
  original.lt.ammo_items[0].name = "loader changed";
  assert.notEqual(service.getEquipment("lt-equipment").name, "loader changed");
  assert.notEqual(service.getAmmoItem("lt", "lt-round").name, "loader changed");
  assert.equal(service.getEquipment("lt-equipment"), equipment);
});

for (const book of books) {
  test(book + ": unsupported schema is isolated", async () => {
    const data = fixture();
    data[book].schema_version = 999;
    const { service, diagnostics } = await loaded(data);
    assert.equal(diagnostics.state, "partial");
    assert.equal(service.getStatus(book).errors[0].code, "UNSUPPORTED_SCHEMA");
    assert.equal(service.getCatalog(book), null);
    for (const other of books.filter(b => b !== book)) assert.equal(service.getStatus(other).status, "ready");
  });
  test(book + ": missing HTTP file is isolated and its failure is cached", async () => {
    const { service, calls } = await loaded(fixture(), { [book]: async () => ({ ok: false, status: 404 }) });
    assert.equal(service.getStatus(book).errors[0].code, "HTTP_ERROR");
    assert.match(service.getStatus(book).unavailableReason, /404/);
    for (const other of books.filter(b => b !== book)) assert.equal(service.getStatus(other).status, "ready");
    await service.load();
    assert.equal(calls.length, 4);
  });
}

test("schema 5 alone is not evidence of Weapon Reference revision 5.6", async () => {
  const data = fixture();
  delete data.weapons.rules_audit_v5_6;
  const { service } = await loaded(data);
  assert.equal(service.getStatus("weapons").errors[0].code, "UNSUPPORTED_REVISION");
  for (const book of ["lt", "ht", "ut"]) {
    assert.equal(service.getStatus(book).status, "ready");
    assert.equal(service.getStatus(book).relationships.status, "skipped");
    assert.ok(service.getStatus(book).warnings.some(w => w.code === "WEAPON_LINKS_UNCHECKED"));
    assert.deepEqual(service.getModesForAmmoFamily(book, book + "-family"), []);
  }
});

for (const book of ["lt", "ht", "ut"]) test(book + ": wrong revision is rejected", async () => {
  const data = fixture();
  data[book].revision = "999";
  const { service } = await loaded(data);
  assert.equal(service.getStatus(book).errors[0].code, "UNSUPPORTED_REVISION");
});

test("damaged JSON, rejected fetch, and all-files-unavailable produce diagnostics", async () => {
  const { service } = await loaded(fixture(), {
    lt: async () => ({ ok: true, json: async () => { throw new SyntaxError("truncated"); } }),
    ht: async () => { throw new Error("offline"); }
  });
  assert.equal(service.getStatus("lt").errors[0].code, "INVALID_JSON");
  assert.equal(service.getStatus("ht").errors[0].code, "LOAD_ERROR");
  assert.equal(service.getStatus("ut").status, "ready");
  const empty = await loaded(fixture(), Object.fromEntries(books.map(book => [book, async () => ({ ok: false, status: 404 })])));
  assert.equal(empty.diagnostics.state, "unavailable");
});

test("a stalled file times out without preventing other catalogs from loading", async () => {
  const io = loader(fixture(), { ht: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }) });
  const service = new CatalogService({ fetcher: io.fetcher, timeoutMs: 20, logger: null });
  await service.load();
  assert.equal(service.getStatus("ht").errors[0].code, "LOAD_TIMEOUT");
  for (const book of ["weapons", "lt", "ut"]) assert.equal(service.getStatus(book).status, "ready");
});

const invalidCases = [
  ["wrong kind", "ht", d => { d.ht.catalog_kind = "different-catalog"; }, "UNSUPPORTED_KIND"],
  ["missing equipment name", "weapons", d => { delete d.weapons.equipment[0].name; }, "MISSING_FIELD"],
  ["invalid mode ID", "weapons", d => { d.weapons.equipment[0].modes[0].weapon_mode_id = 123; }, "MISSING_FIELD"],
  ["duplicate equipment ID", "weapons", d => { d.weapons.equipment.push(structuredClone(d.weapons.equipment[0])); }, "DUPLICATE_ID"],
  ["duplicate mode ID", "weapons", d => { d.weapons.equipment[1].modes.push(structuredClone(d.weapons.equipment[0].modes[0])); }, "DUPLICATE_ID"],
  ["duplicate item ID", "lt", d => { d.lt.ammo_items.push(structuredClone(d.lt.ammo_items[0])); }, "DUPLICATE_ID"],
  ["duplicate family ID", "ht", d => { d.ht.ammo_families.push(structuredClone(d.ht.ammo_families[0])); }, "DUPLICATE_ID"],
  ["duplicate variant ID across collections", "ht", d => { d.ht.cartridge_upgrades.push(structuredClone(d.ht.projectile_options[0])); }, "DUPLICATE_ID"],
  ["duplicate UT special load ID", "ut", d => { d.ut.special_loads.push(structuredClone(d.ut.special_loads[0])); }, "DUPLICATE_ID"],
  ["duplicate UT warhead ID", "ut", d => { d.ut.warheads.push(structuredClone(d.ut.warheads[0])); }, "DUPLICATE_ID"],
  ["invalid required array", "lt", d => { d.lt.ammo_items[0].weapon_mode_ids = null; }, "INVALID_ARRAY"],
  ["duplicate reverse reference", "ut", d => { d.ut.ammo_families[0].linked_weapon_modes.push(structuredClone(d.ut.ammo_families[0].linked_weapon_modes[0])); }, "DUPLICATE_REFERENCE"],
  ["unknown family", "lt", d => { d.lt.ammo_items[0].ammo_family_id = "missing"; }, "MISSING_REFERENCE"],
  ["missing family reverse item link", "ht", d => { d.ht.ammo_families[0].ammo_item_ids = []; }, "INCONSISTENT_REFERENCE"],
  ["inconsistent family mode union", "lt", d => { d.lt.ammo_families[0].compatible_weapon_mode_ids = []; }, "INCONSISTENT_REFERENCE"],
  ["unknown projectile variant", "lt", d => { d.lt.ammo_items[0].variant_id = "missing"; }, "MISSING_REFERENCE"],
  ["unknown load warhead", "ut", d => { d.ut.special_loads[0].warhead_ref = "missing"; }, "MISSING_REFERENCE"],
  ["unknown weapon forward item", "ht", d => { d.weapons.equipment[1].modes[0].ht_ammo_item_ids = ["missing"]; }, "MISSING_REFERENCE"],
  ["missing weapon forward link", "lt", d => { d.weapons.equipment[0].modes[0].lt_ammo_item_ids = []; }, "INCONSISTENT_REFERENCE"],
  ["missing item reverse mode link", "lt", d => { d.lt.ammo_items[0].weapon_mode_ids = []; d.lt.ammo_families[0].compatible_weapon_mode_ids = []; }, "INCONSISTENT_REFERENCE"],
  ["cross-book link", "ht", d => { d.weapons.equipment[0].modes[0].ht_ammo_item_ids = ["ht-round"]; }, "SOURCE_MISMATCH"],
  ["UT unknown primary family", "ut", d => { d.weapons.equipment[2].modes[0].ammunition_profile.primary_ammo_family_id = "missing"; }, "MISSING_REFERENCE"],
  ["UT unknown special load", "ut", d => { d.weapons.equipment[2].modes[0].ammunition_profile.special_load_ids = ["missing"]; }, "MISSING_REFERENCE"],
  ["UT unknown suggested warhead", "ut", d => { d.weapons.equipment[2].modes[0].ammunition_profile.suggested_warhead_ids = ["missing"]; }, "MISSING_REFERENCE"],
  ["UT wrong equipment backlink", "ut", d => { d.ut.ammo_families[0].linked_weapon_modes[0].equipment_id = "ht-equipment"; }, "EQUIPMENT_MISMATCH"],
  ["wrong catalog pointer", "ht", d => { d.ht.weapon_catalog_link.catalog_filename = "wrong.json"; }, "CATALOG_POINTER_MISMATCH"]
];
for (const [name, book, mutate, code] of invalidCases) test("validation: " + name, async () => {
  const data = fixture();
  mutate(data);
  const { service } = await loaded(data);
  const status = service.getStatus(book);
  assert.equal(status.status, "unavailable");
  assert.equal(status.errors[0].code, code);
  assert.equal(service.getCatalog(book), null);
  assert.deepEqual(status.indexes, {});
  assert.ok(status.unavailableReason);
  for (const other of books.filter(b => b !== book)) assert.equal(service.getStatus(other).status, "ready");
});

test("HT item and family IDs may legitimately match in different namespaces", async () => {
  const data = fixture();
  data.ht.ammo_families[0].id = "ht-round";
  data.ht.ammo_items[0].ammo_family_id = "ht-round";
  const { service } = await loaded(data);
  assert.equal(service.getStatus("ht").status, "ready");
  assert.notEqual(service.getAmmoItem("ht", "ht-round"), service.getAmmoFamily("ht", "ht-round"));
});

test("incomplete rules are warnings, and textual compatibility never creates links", async () => {
  const data = fixture();
  data.lt.projectile_options[0].requires_external_rule = "External source";
  data.ht.interchangeability_rules = [{ from: "Family", to: ["Other"], requires: "GM verification" }];
  const { service } = await loaded(data);
  assert.equal(service.getStatus("lt").status, "ready");
  assert.equal(service.getStatus("ht").status, "ready");
  assert.ok(service.getStatus("lt").warnings.some(w => w.code === "EXTERNAL_RULE_REQUIRED"));
  assert.ok(service.getStatus("ht").warnings.some(w => w.code === "TEXTUAL_COMPATIBILITY"));
  assert.deepEqual(service.getModeLinks("ht-mode").ammoItemIds, ["ht-round"]);
  assert.equal(service.getAmmoItem("ht", "Other"), null);
});

test("console failures cannot break successful catalog initialization", async () => {
  const io = loader();
  const service = new CatalogService({ fetcher: io.fetcher, logger: { info() { throw new Error("console failed"); } } });
  assert.equal((await service.load()).state, "ready");
});

test("main init starts loading without blocking ready or changing existing tool APIs", async () => {
  const source = await fs.readFile(new URL("../scripts/main.js", import.meta.url), "utf8");
  const hooks = new Map();
  const calls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const io = loader();
  const module = {};
  const dependencies = {};
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
    for (const name of match[1].split(",").map(s => s.trim()))
      dependencies[name] = /^(load|ensure)|^registerCustomStatusEffects$/.test(name)
        ? async function() { calls.push(name); } : function() { calls.push(name); };
  }
  dependencies.AmmunitionCompatibilityService = AmmunitionCompatibilityService;
  dependencies.WeaponCatalogBindingService = WeaponCatalogBindingService;
  dependencies.CatalogService = function() {
    return new CatalogService({ logger: null, fetcher: async (...args) => { await gate; return io.fetcher(...args); } });
  };
  const sandbox = {
    ...dependencies, Hooks: { once: (name, callback) => hooks.set(name, callback) },
    document: { querySelectorAll: () => [{ href: "/modules/olegurps-qol/styles/olegurps-qol.css" }] },
    game: { modules: new Map([["olegurps-qol", module]]) },
    setTimeout() {}, console: { error: (...args) => assert.fail(args.join(" ")) }
  };
  runInNewContext(source.replace(/^import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];\r?\n/gm, ""), sandbox);
  assert.equal(hooks.get("init")(), undefined);
  const service = sandbox.OleGURPSQOL.catalogs;
  assert.equal(service.getDiagnostics().state, "loading");
  await hooks.get("ready")();
  assert.equal(module.api.catalogs, service);
  assert.equal(sandbox.game.olegurpsQOL.catalogs, service);
  assert.equal(module.api.ammo.open, dependencies.openAmmoManager);
  assert.equal(module.api.fireControl.open, dependencies.openFireControl);
  assert.equal(module.api.melee.open, dependencies.openMeleeAssistant);
  assert.equal(calls.some(name => name.startsWith("open")), false);
  assert.ok(calls.includes("ensureModuleMacros"));
  release();
  assert.equal((await service.load()).state, "ready");
  assert.equal(io.calls.length, 4);
});

const sourceHashes = {
  weapons: "165dfdce9fe4cccf9ca0a638deec5fce13711d8de0d22e53aee3adb52e060020",
  lt: "2e520c12f437ca917ab87cf6322128ce2e4776f7abd7e1a547503681a0914cdd",
  ht: "435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385",
  ut: "888dd25f46b43c8d51d7e81b529d616d84e1cde6591ffc0da5a5b9613d527ccc"
};
test("current catalog bytes match the verified SHA-256 values", async () => {
  for (const book of books) {
    const filename = CATALOG_DEFINITIONS[book].filename;
    const data = await fs.readFile(new URL("../data/catalogs/" + filename, import.meta.url));
    if (book === "weapons") {
      const { assertWeaponPreservation } = await import("./fixtures/ht-preservation-contract.mjs");
      const proof = JSON.parse(await fs.readFile(new URL("../docs/audit/ht-v1-3-preservation.json", import.meta.url), "utf8"));
      assertWeaponPreservation(data.toString("utf8"), proof);
    } else assert.equal(createHash("sha256").update(data).digest("hex"), sourceHashes[book], filename);
    assert.doesNotThrow(() => new TextDecoder("utf-8", { fatal: true }).decode(data));
    await assert.rejects(fs.access(new URL("../" + filename, import.meta.url)), { code: "ENOENT" });
  }
});
