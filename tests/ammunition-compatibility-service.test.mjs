import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { WeaponCatalogBindingService } from "../scripts/weapon-catalog-binding-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
const originals = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([book, d]) => [book, JSON.parse(await fs.readFile(new URL("../data/catalogs/" + d.filename, import.meta.url), "utf8"))])));
const modes = { lt: "W4gnbkfxzHAYre3kO", ht: "W1FMPB_-58qp_bH-M", ut: "WlstnlxI_Mm-2UJf0", needler: "WfcQvWVcsBWPUShFm", carbine: "Wg_f0E5hqv6o1C0Uj", pistol: "W5Xb6neoqVfdlbqiS" };
async function loaded({ mutate = () => {}, unavailable = [] } = {}) {
  const data = structuredClone(originals); mutate(data); const calls = [];
  const catalogs = new CatalogService({ logger: null, fetcher: async url => {
    const book = Object.keys(CATALOG_DEFINITIONS).find(key => url.endsWith(CATALOG_DEFINITIONS[key].filename)); calls.push(book);
    if (unavailable.includes(book)) throw Error("Missing test catalog");
    return { ok: true, json: async () => data[book] };
  } });
  const service = new AmmunitionCompatibilityService(catalogs); await service.load(); return { service, catalogs, calls, data };
}
const { service, catalogs } = await loaded();
const check = (m, id, opts) => service.checkCompatibility(m, id, opts);
function mode(data, id) { return data.weapons.equipment.flatMap(e => e.modes).find(m => m.weapon_mode_id === id); }

test("all catalogs load through CatalogService and compatibility exposes real native records", () => {
  assert.equal(service.getDiagnostics().catalogs.state, "ready");
  for (const [m, id] of [[modes.lt, "lt_arbalest_bolt_lt81"], [modes.ht, "ht_357_magnum_9x33mmr"], [modes.ut, "15mm_cl"]]) {
    const r = check(m, id); assert.equal(r.status, "compatible"); assert.equal(r.relation.type, "explicit-bidirectional-link"); assert.ok(r.relation.catalog);
  }
});
test("item/family shared HT IDs default to cartridge and permit explicit family lookup", () => {
  assert.equal(check(modes.ht, "ht_357_magnum_9x33mmr").kind, "ammo-item");
  assert.equal(check(modes.ht, "ht_357_magnum_9x33mmr", { kind: "ammo-family" }).kind, "ammo-family");
});
test("HT178 confirms .357 revolver to .38 Special with source and direction", () => {
  const r = check(modes.ht, "ht_38_special_9x29mmr"); assert.equal(r.status, "compatible"); assert.equal(r.relation.type, "directed-ht178"); assert.equal(r.relation.from, ".357 Magnum");
});
test("HT178 does not reverse .357 to .38 permission", () => {
  assert.equal(check("WGzlhKJ9A_d-LrvCX", "ht_357_magnum_9x33mmr").status, "incompatible");
});
test("HT178 rejects .44 derringer despite matching chambered cartridge", () => {
  const r = check("WTadZ47v0MD21lmVk", "ht_44_special_10_9x29mmr"); assert.equal(r.status, "incompatible"); assert.equal(r.reasons[0].code, "ACTION_RESTRICTION");
});
test("HT178 unknown mechanism does not confirm revolver exception", async () => {
  const { service: s } = await loaded({ mutate: d => { mode(d, modes.ht).mechanism.confidence = "unknown"; } });
  assert.equal(s.checkCompatibility(modes.ht, "ht_38_special_9x29mmr").status, "undetermined");
});
test("HT178 has no automatic transitive closure", () => {
  const item = originals.ht.ammo_items.find(x => x.id === "ht_454_casull_11_43x35mmr");
  assert.ok(item.weapon_mode_ids.length); assert.equal(check(item.weapon_mode_ids[0], "ht_44_american_11x23mmr").status, "incompatible");
});
test("HT structured shorter cartridge directions resolve former named rule ambiguity", () => {
  const item = originals.ht.ammo_items.find(x => x.id === "ht_22_long_rifle_5_7x16mmr");
  assert.equal(check(item.weapon_mode_ids[0], "ht_22_short_5_6x11mmr").status, "compatible");
  const diagnostics = service.getDiagnostics().unsupported;
  assert.equal(diagnostics.some(x => x.rule === 13 && x.code === "AMBIGUOUS_RULE_REFERENCE"), false);
  assert.equal(diagnostics.some(x => x.rule === 14 && x.code === "AMBIGUOUS_RULE_REFERENCE"), false);
});
test("LT projectile-class option does not make giant artillery bolts hand-crossbow ammunition", () => {
  assert.equal(check(modes.lt, "large_flaming_artillery_bolt").status, "compatible");
  assert.equal(check(modes.lt, "crossbow_bodkin").status, "incompatible");
  assert.equal(check(modes.lt, "lt_arquebus_bullet_lt93").status, "incompatible");
});
test("LT external rules are warnings distinct from compatibility errors", () => {
  const r = check(modes.lt, "large_flaming_artillery_bolt"); assert.equal(r.status, "compatible"); assert.equal(r.warnings[0].code, "EXTERNAL_RULE");
});
test("LT GM/accessory restrictions are not silently approved", () => {
  const arrow = originals.lt.ammo_items.find(x => x.projectile_classes?.includes("bow_arrow")); assert.ok(arrow);
  const m = arrow.weapon_mode_ids[0];
  assert.equal(check(m, "barbed").status, "compatible");
  assert.equal(check(m, "panjagan_5").status, "undetermined"); assert.equal(check(m, "panjagan_10").status, "undetermined");
});
test("LT options may be bound only to linked projectile IDs", () => {
  assert.equal(check(modes.lt, "large_flaming_artillery_bolt", { ammoItemId: "lt_arquebus_bullet_lt93" }).status, "incompatible");
});
test("HT native rocket special payload is explicit ammo, not a generic HEAT modifier", () => {
  const r = check("WYtq-OBcCaZp7ShJJ", "ht_specific_milan_103_heat"); assert.equal(r.status, "compatible"); assert.equal(r.deliveryType, "guided_missile");
  assert.equal(check("WYtq-OBcCaZp7ShJJ", "ht_heat").status, "incompatible");
  assert.ok(check("WYtq-OBcCaZp7ShJJ", "ht_heat").eligibility.checks.some(c => c.field === "overlap_guard" && c.status === "incompatible"));
});
test("all nonselectable HT rocket generations are excluded from base charge lists", () => {
  for (const item of originals.ht.ammo_items.filter(x => x.alternate_model_not_selectable_as_base_ammunition)) {
    const e = catalogs.getEquipment(item.rocket_contract.model_template_for_equipment_id); const m = e.modes.find(m => m.role === "attack" && m.combat_type === "ranged"); assert.ok(m);
    assert.equal(check(m.weapon_mode_id, item.id).status, "incompatible", item.id);
    assert.equal(service.getCompatibleAmmunition(m.weapon_mode_id).ammunition.some(r => r.ammoId === item.id), false);
  }
});
test("secondary linked modes are not ammunition selection targets", () => {
  assert.equal(check("WUR2Zq1_npih8lajb", "ht_specific_milan_103_heat").status, "undetermined");
  assert.equal(service.getCompatibleAmmunition("WUR2Zq1_npih8lajb").ammunition.length, 0);
});
test("feed device is not a cartridge", () => {
  const id = originals.ht.feed_devices_reference_only[0].id; assert.equal(check(modes.ht, id).reasons[0].code, "NOT_AMMUNITION");
});
test("UT concrete HE warhead and Needler drugged dart are confirmed with typed relationships", () => {
  assert.equal(check(modes.ut, "he").status, "compatible"); assert.equal(check(modes.ut, "he").kind, "warhead");
  const r = check(modes.needler, "drugged_dart"); assert.equal(r.status, "compatible"); assert.equal(r.kind, "special-load"); assert.ok(r.warnings.some(w => w.code === "PAYLOAD_DETAILS_REQUIRED"));
});
test("UT same 15mm caliber does not authorize Paint Gun-only special loads", () => {
  assert.equal(catalogs.getMode(modes.ut).ammunition_profile.caliber_mm, catalogs.getMode(modes.carbine).ammunition_profile.caliber_mm);
  assert.equal(check(modes.ut, "paint_pellet").status, "incompatible");
});
for (const m of [modes.carbine, modes.pistol]) for (const id of ["paint_pellet", "biochemical_liquid_pellet"]) test("Paint explicit platform tags confirm " + m + " / " + id, () => {
  const r = check(m, id); assert.equal(r.status, "compatible"); assert.equal(r.reasons.length, 0);
  const p = catalogs.getMode(m).ammunition_profile; const load = catalogs.getVariant("ut", id);
  assert.ok(p.special_load_ids.includes(id)); assert.ok(p.platform_tags.includes(m === modes.carbine ? "paint_carbine" : "paint_pistol"));
  assert.deepEqual(load.platform_tags_any, ["paint_pistol", "paint_carbine"]);
  const d = service.getDiagnostics().unsupported.find(x => x.id === id && x.modeId === m); assert.equal(d, undefined);
});
test("missing concrete tags in TEST DATA preserve Paint fail-closed behavior", async () => {
  const { service: s } = await loaded({ mutate: d => { mode(d, modes.carbine).ammunition_profile.platform_tags = mode(d, modes.carbine).ammunition_profile.platform_tags.filter(tag => tag !== "paint_carbine"); } });
  assert.equal(s.checkCompatibility(modes.carbine, "paint_pellet").status, "undetermined"); assert.equal(s.checkCompatibility(modes.carbine, "biochemical_liquid_pellet").status, "undetermined");
});
test("UT homing is not inferred from conditional capability", () => {
  assert.equal(check(modes.ut, "sefop").status, "undetermined"); assert.equal(check(modes.needler, "sefop").status, "incompatible");
});
test("UT explicit size gate is necessary but not a caliber-based link", () => {
  assert.equal(check(modes.ut, "shaped_charge").status, "incompatible");
  assert.equal(check("WgqAB3QGTUZrgtdES", "shaped_charge").status, "compatible");
});
test("UT size-by-TL requires availability and explicit warhead class", () => {
  const m = "WgqAB3QGTUZrgtdES";
  assert.equal(check(m, "mininuke").status, "undetermined");
  assert.equal(check(m, "mininuke", { availabilityTL: 9 }).status, "incompatible");
  assert.equal(check(m, "mininuke", { availabilityTL: 12 }).status, "compatible");
  assert.equal(check(m, "plasma", { availabilityTL: 9 }).status, "incompatible");
});
test("UT Sniper Railgun explicitly selected 7mm EM uses the approved scoped TL exception", () => {
  const m = "WkhAN9tcmB9eEkmY6";
  assert.equal(catalogs.getMode(m).ammunition_profile.native_weapon_tl, "9");
  assert.equal(catalogs.getAmmoFamily("ut", "7mm_em").tl, 10);
  assert.equal(check(m, "7mm_em").status, "compatible");
  assert.notEqual(check(m, "4mm_em").status, "compatible");
});
test("UT Sniper Railgun family TL exception requires its explicit catalog authorization", async () => {
  const m = "WkhAN9tcmB9eEkmY6";
  const { service: s } = await loaded({ mutate: d => {
    delete mode(d, m).ammunition_profile.user_authorized_ammo_tl_exception;
  } });
  const result = s.checkCompatibility(m, "7mm_em");
  assert.equal(result.status, "undetermined");
  assert.ok(result.reasons.some(r => r.code === "FAMILY_TL_EXCEPTION"));
});
for (const book of ["lt", "ht", "ut", "weapons"]) test("partial catalog availability: " + book, async () => {
  const { service: s } = await loaded({ unavailable: [book] });
  assert.equal(s.getDiagnostics().catalogs.state, "partial");
  for (const b of ["lt", "ht", "ut"]) {
    const id = { lt: "lt_arbalest_bolt_lt81", ht: "ht_357_magnum_9x33mmr", ut: "15mm_cl" }[b];
    assert.equal(s.checkCompatibility(modes[b], id).status, b === book || book === "weapons" ? "undetermined" : "compatible");
  }
});
test("broken mode reference disables only affected catalog and is diagnosed", async () => {
  const { service: s } = await loaded({ mutate: d => { d.lt.ammo_items[0].weapon_mode_ids.push("missing-mode"); } });
  assert.equal(s.checkCompatibility(modes.lt, "lt_arbalest_bolt_lt81").status, "undetermined");
  assert.equal(s.checkCompatibility(modes.ut, "15mm_cl").status, "compatible"); assert.ok(s.getDiagnostics().catalogs.catalogs.lt.errors.length);
});
test("damaged file shape has no false compatible pairs", async () => {
  const { service: s } = await loaded({ mutate: d => { d.ht.ammo_items = null; } });
  assert.equal(s.checkCompatibility(modes.ht, "ht_357_magnum_9x33mmr").status, "undetermined"); assert.equal(s.checkCompatibility(modes.ut, "15mm_cl").status, "compatible");
});
test("unknown IDs and missing mode data differ from known excluded pairs", () => {
  assert.equal(check(modes.lt, "missing-ammo").status, "undetermined"); assert.equal(check("missing-mode", "he").status, "undetermined");
  assert.equal(check(modes.lt, "lt_arquebus_bullet_lt93").status, "incompatible");
});
test("cross-source pairs need explicit permission, not names or TL", () => {
  assert.equal(check(modes.lt, "15mm_cl", { book: "ut" }).status, "incompatible");
});
test("every HT option exposes its exact structured predicates and missing evidence", () => {
  for (const collection of ["cartridge_upgrades", "projectile_options", "projectile_upgrades", "case_construction_options"]) for (const r of originals.ht[collection]) {
    const result = check(modes.ht, r.id);
    const proven = { ht_hollow_point: "expanding_bullet_suitable_for_this_cartridge", ht_ap: "hardened_ap_construction_available", ht_aphc: "hardcore_penetrator_construction_available" };
    if (proven[r.id]) {
      assert.equal(modes.ht, "W1FMPB_-58qp_bH-M");
      assert.equal(result.status, "compatible");
      assert.ok(result.eligibility.checks.every(c => c.status === "confirmed"));
      assert.equal(result.eligibility.facts.evidence[proven[r.id]].value, true);
      assert.ok(result.eligibility.facts.evidence[proven[r.id]].source);
    } else assert.notEqual(result.status, "compatible", r.id);
    const d = service.getDiagnostics().unsupported.find(x => x.id === r.id && x.book === "ht"); assert.ok(d, r.id);
    assert.deepEqual(d.fields[collection + ".eligibility_v1"], r.eligibility_v1); assert.ok(d.reason); assert.ok(d.recommendation);
  }
});
test("unknown future UT predicate is not ignored", async () => {
  const { service: s } = await loaded({ mutate: d => { d.ut.warheads.find(x => x.id === "he").compatibility.future_requirement = true; } });
  assert.equal(s.checkCompatibility(modes.ut, "he").status, "undetermined");
});
test("repeat load, protected returns and catalogs are isolated from callers", async () => {
  const { service: s, catalogs: c, calls } = await loaded(); const p = s.load(); assert.equal(p, s.load()); await p; assert.equal(calls.length, 4);
  const r = s.checkCompatibility(modes.ut, "he"); assert.throws(() => { r.record.compatibility.min_size_mm = 0; }, TypeError);
  const listing = s.getCompatibleAmmunition(modes.ht); assert.throws(() => listing.ammunition.push({}), TypeError);
  assert.throws(() => { s.getDiagnostics().unsupported[0].id = "changed"; }, TypeError);
  assert.equal(c.getVariant("ut", "he").compatibility.min_size_mm, 10); assert.equal(s.checkCompatibility(modes.ut, "he").status, "compatible");
});
test("current catalog byte hashes match the verified upgrade checkpoint", async () => {
  const hashes = { weapons: "165dfdce9fe4cccf9ca0a638deec5fce13711d8de0d22e53aee3adb52e060020", lt: "2e520c12f437ca917ab87cf6322128ce2e4776f7abd7e1a547503681a0914cdd", ht: "435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385", ut: "888dd25f46b43c8d51d7e81b529d616d84e1cde6591ffc0da5a5b9613d527ccc" };
  const { assertWeaponPreservation } = await import("./fixtures/ht-preservation-contract.mjs");
  const proof = readAuditFixture('ht-v1-3-preservation');
  for (const [b, d] of Object.entries(CATALOG_DEFINITIONS)) {
    const bytes = await fs.readFile(new URL("../data/catalogs/" + d.filename, import.meta.url));
    if (b === "weapons") assertWeaponPreservation(bytes.toString("utf8"), proof);
    else assert.equal(createHash("sha256").update(bytes).digest("hex"), hashes[b]);
  }
});
test("main exposes the same reference service on all existing module API aliases", async () => {
  const source = await fs.readFile(new URL("../scripts/main.js", import.meta.url), "utf8"); const dependencies = {}, hooks = new Map();
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from/g)) for (const name of match[1].split(",").map(s => s.trim())) dependencies[name] = function() {};
  for (const name of Object.keys(dependencies)) if (/^(load|ensure)|^registerCustomStatusEffects$/.test(name)) dependencies[name] = async function() {};
  dependencies.WeaponCatalogBindingService = WeaponCatalogBindingService;
  dependencies.CatalogService = function() { return catalogs; }; dependencies.AmmunitionCompatibilityService = AmmunitionCompatibilityService;
  const module = {}, sandbox = { ...dependencies, Hooks: { once: (n, f) => hooks.set(n, f) }, document: { querySelectorAll: () => [{ href: "/modules/olegurps-qol/styles/olegurps-qol.css" }] }, game: { modules: new Map([["olegurps-qol", module]]) }, setTimeout() {}, console };
  runInNewContext(source.replace(/^import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];\r?\n/gm, ""), sandbox);
  hooks.get("init")(); await hooks.get("ready")();
  assert.ok(module.api.weaponCatalogBindings instanceof WeaponCatalogBindingService); assert.equal(module.api.weaponCatalogBindings, sandbox.OleGURPSQOL.weaponCatalogBindings); assert.equal(module.api.weaponCatalogBindings, sandbox.game.olegurpsQOL.weaponCatalogBindings);
  assert.ok(module.api.ammunitionCompatibility instanceof AmmunitionCompatibilityService); assert.equal(module.api.ammunitionCompatibility, sandbox.OleGURPSQOL.ammunitionCompatibility); assert.equal(module.api.ammunitionCompatibility, sandbox.game.olegurpsQOL.ammunitionCompatibility);
});

test("every unresolved concrete HT178 pair has IDs and exact condition fields", () => {
  const pairs = service.getDiagnostics().unsupported.filter(x => x.code === "UNVERIFIED_HT178_PAIR"); assert.ok(pairs.length);
  for (const pair of pairs) { assert.equal(check(pair.modeId, pair.id).status, "undetermined"); assert.ok(pair.fields["interchangeability_rules[" + pair.rule + "]"] || pair.fields.explicit_direction_v1); assert.ok(pair.recommendation); }
});
