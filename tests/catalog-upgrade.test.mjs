import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
const proof = readAuditFixture('catalog-upgrade-preservation');
// Historical v1.2 collection proofs are retained; only the current byte checkpoints advance.
proof.catalogs.ht.currentFilename = "olegurps_ht_ammunition_catalog_v1_3.json";
proof.catalogs.ht.currentSha256 = "435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385";
// Approved HAFLA Acc errata (HT145), revision 2; independently verified against the original byte contract.
proof.catalogs.weapons.currentSha256 = "f98687171a69b27ff46d89ab12d24b457375972de293fe482e881aceb63b5460";
const audit = readAuditFixture('olegurps_ht178_68_mode_pairs_v1');
const originals = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([b, d]) => [b, JSON.parse(await fs.readFile(new URL("../data/catalogs/" + d.filename, import.meta.url), "utf8"))])));
const hash = data => createHash("sha256").update(JSON.stringify(data)).digest("hex");
async function loaded(mutate = () => {}) { const data = structuredClone(originals); mutate(data); const calls = []; const catalogs = new CatalogService({ logger: null, fetcher: async url => { const b = Object.keys(CATALOG_DEFINITIONS).find(key => url.endsWith(CATALOG_DEFINITIONS[key].filename)); assert.ok(b); calls.push(b); return { ok: true, json: async () => data[b] }; } }); const service = new AmmunitionCompatibilityService(catalogs); await service.load(); return { service, catalogs, calls }; }
const { service, catalogs, calls } = await loaded();
const nativeMode = (d, id) => d.weapons.equipment.flatMap(e => e.modes).find(m => m.weapon_mode_id === id);
// HT106 explicitly confirms both normal 2.75-inch and 3-inch loads for these Super 90 variants.
// The historical 68-pair audit itself is preserved byte-for-byte below.
const benelliModes = new Set(['WcLG_XsJVbZ6CIT4p','WT-PUA77JBHLiLTPo','WmeBcFEjqKNri5FAm',
  'W6LVJ8YGACnNB5h-S','WLp8euYFMi9Oikpjp','WH-pkGPARCbK4CP4h','W9LBQ9LeKd3uB9nSZ']);
const publishedBenelliPair = p => benelliModes.has(p.mode_id) &&
  ['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load'].includes(p.target_ammo_item_id);

for (const pair of audit.pairs) test("HT178 explicit " + pair.mode_id + " / " + pair.target_ammo_item_id, () => {
  const r = service.checkCompatibility(pair.mode_id, pair.target_ammo_item_id);
  assert.equal(r.status, publishedBenelliPair(pair) || pair.status === "confirmed_to_fire" ? "compatible" : "undetermined");
  assert.equal(r.relation.metadata, "explicit_direction_v1"); assert.equal(r.relation.directedOnly, true); assert.equal(r.relation.transitivePermission, false);
  if (publishedBenelliPair(pair)) { assert.match(r.relation.source,/HT106/);assert.equal(r.capabilities.feedingAndCycling,'confirmed'); }
  else for (const warning of pair.warnings) assert.ok(r.warnings.some(w => w.message === warning), warning);
  if (pair.status === "confirmed_to_fire") { assert.equal(r.capabilities.firing, "confirmed"); assert.equal(r.capabilities.feedingAndCycling, "not-confirmed"); }
});

 test("68 historical pairs remain intact; HT106 resolves exactly 14 formerly uncertain Super 90 pairs", () => {
  assert.equal(audit.pairs.length, 68);assert.equal(audit.pairs.filter(p=>p.status==='confirmed_to_fire').length,33);
  assert.equal(audit.pairs.filter(publishedBenelliPair).length,14);
  const counts = { compatible: 0, undetermined: 0 }; for (const pair of audit.pairs) counts[service.checkCompatibility(pair.mode_id, pair.target_ammo_item_id).status]++; assert.deepEqual(counts, { compatible: 47, undetermined: 21 });
  const embedded = originals.ht.interchangeability_rules.flatMap((r, i) => (r.explicit_direction_v1?.mode_pair_assessments ?? []).map(pair => ({ rule_index: i, ...pair }))); assert.deepEqual(embedded, audit.pairs);
});
 test("current catalog revisions ready; audit is never a fifth runtime catalog", () => {
  assert.deepEqual(calls.sort(), ["ht", "lt", "ut", "weapons"]); assert.deepEqual(Object.keys(CATALOG_DEFINITIONS).sort(), calls);
  for (const [b, revision] of Object.entries({ weapons: "5.6", lt: "1.2", ht: "1.3", ut: "2.7" })) { assert.equal(catalogs.getStatus(b).status, "ready"); assert.equal(catalogs.getStatus(b).version.revision, revision); }
  assert.equal(catalogs.getStatus("ht").relationships.internal.ht178Pairs, 68); assert.ok(catalogs.getStatus("lt").warnings.some(w => w.code === "HISTORICAL_SOURCE_POINTER"));
});
 test("all prior equipment IDs, modes and attack data preserved except declared tags and exact HT120 range / HT145 HAFLA Acc errata", () => {
  const correction = originals.weapons.catalog_errata_v1.mode_stat_corrections.WRziobjV56cvaJtG2;
  assert.deepEqual(correction, { field: "range", previous: "1,600", corrected: "1,600/6,600" });
  assert.equal(originals.weapons.catalog_errata_v1.revision, 2);
  assert.deepEqual(Object.keys(originals.weapons.catalog_errata_v1.mode_stat_corrections), ["WRziobjV56cvaJtG2", "Wr3VDL3Z6SR3KCz3K"]);
  const haflaCorrection = originals.weapons.catalog_errata_v1.mode_stat_corrections.Wr3VDL3Z6SR3KCz3K;
  assert.deepEqual(haflaCorrection, { field: "accuracy", previous: null, corrected: "0" });
  assert.equal(nativeMode(originals, "Wr3VDL3Z6SR3KCz3K").stats.accuracy, haflaCorrection.corrected);
  assert.equal(nativeMode(originals, "WRziobjV56cvaJtG2").stats.range, correction.corrected);
  const equipment = structuredClone(originals.weapons.equipment); for (const e of equipment) for (const m of e.modes) {
    const tag = originals.weapons.rules_audit_v5_6.ut_mode_tag_additions[m.weapon_mode_id];
    if (tag) m.ammunition_profile.platform_tags = m.ammunition_profile.platform_tags.filter(t => t !== tag);
    if (m.weapon_mode_id === "WRziobjV56cvaJtG2") m.stats.range = correction.previous;
    if (m.weapon_mode_id === "Wr3VDL3Z6SR3KCz3K") m.stats.accuracy = haflaCorrection.previous;
  } assert.equal(hash(equipment), proof.weaponEquipmentHash);
  for (const [b, collections] of Object.entries(proof.preservedCollections)) for (const [collection, expected] of Object.entries(collections)) { const records = structuredClone(originals[b][collection]); if (b === "ht") for (const record of records) delete record.eligibility_v1; assert.equal(hash(records), expected, b + "/" + collection); }
  const rules = structuredClone(originals.ht.interchangeability_rules); for (const r of rules) delete r.explicit_direction_v1; assert.equal(hash(rules), proof.legacyHTRulesHash);
});
 test("LT unchanged and new catalog bytes match verified hashes", async () => {
  for (const [b, d] of Object.entries(CATALOG_DEFINITIONS)) { const bytes = await fs.readFile(new URL("../data/catalogs/" + d.filename, import.meta.url)); assert.equal(createHash("sha256").update(bytes).digest("hex"), b === "lt" ? proof.ltSha256 : proof.catalogs[b].currentSha256); }
});
 test("conventional 12G case gains only the seven HT106 permissions, never general higher-pressure admission", () => {
  const pairs = audit.pairs.filter(p => p.source_ammo_item_id.includes("heavy_load") || p.target_ammo_item_id.includes("heavy_load")); assert.ok(pairs.length);
  assert.equal(pairs.filter(publishedBenelliPair).length,7);
  for (const pair of pairs) assert.equal(service.checkCompatibility(pair.mode_id, pair.target_ammo_item_id).status, publishedBenelliPair(pair)?"compatible":"undetermined");
});
 test("structured direction never generates reverse or transitive permission", () => {
  const russian = originals.ht.ammo_items.find(x => x.id === "ht_44_russian_11x25mmr"); assert.equal(service.checkCompatibility(russian.weapon_mode_ids[0], "ht_44_special_10_9x29mmr").status, "incompatible");
  const casull = originals.ht.ammo_items.find(x => x.id === "ht_454_casull_11_43x35mmr"); assert.equal(service.checkCompatibility(casull.weapon_mode_ids[0], "ht_44_american_11x23mmr").status, "incompatible");
});
 test("removing explicit assessment never falls back to text approval", async () => {
  const pair = audit.pairs[0]; const { service: s } = await loaded(d => { const meta = d.ht.interchangeability_rules[pair.rule_index].explicit_direction_v1; meta.mode_pair_assessments = meta.mode_pair_assessments.filter(p => !(p.mode_id === pair.mode_id && p.target_ammo_item_id === pair.target_ammo_item_id)); }); assert.equal(s.checkCompatibility(pair.mode_id, pair.target_ammo_item_id).status, "undetermined");
});
for (const mutation of ["missing-ammo-id", "missing-mode-id", "wrong-equipment", "invalid-direction", "wrong-action", "not-exact", "duplicate-pair", "unknown-status"]) test("damaged structured rule is isolated: " + mutation, async () => {
  const { service: s, catalogs: c } = await loaded(d => { const meta = d.ht.interchangeability_rules[2].explicit_direction_v1; const pair = meta.mode_pair_assessments[0]; if (mutation === "missing-ammo-id") meta.target_ammo_item_ids.push("missing"); if (mutation === "missing-mode-id") pair.mode_id = "missing"; if (mutation === "wrong-equipment") pair.equipment_id = "wrong"; if (mutation === "invalid-direction") meta.transitive_permission = true; if (mutation === "wrong-action") nativeMode(d, pair.mode_id).mechanism.action_system = "self-loading"; if (mutation === "not-exact") nativeMode(d, pair.mode_id).ht_ammo_resolution.status = "unresolved"; if (mutation === "duplicate-pair") meta.mode_pair_assessments.push(structuredClone(pair)); if (mutation === "unknown-status") pair.status = "guessed"; });
  assert.equal(c.getStatus("ht").status, "unavailable"); assert.ok(c.getStatus("ht").errors.length); assert.equal(s.checkCompatibility("W1FMPB_-58qp_bH-M", "ht_38_special_9x29mmr").status, "undetermined"); assert.equal(s.checkCompatibility("WlstnlxI_Mm-2UJf0", "he").status, "compatible");
});
 test("runtime loader paths never refer to removed files", () => { for (const [b, def] of Object.entries(CATALOG_DEFINITIONS)) assert.equal(def.filename, b === "lt" ? "olegurps_lt_ammunition_catalog_v1_2.json" : proof.catalogs[b].currentFilename); });

test("catalog directory contains exactly the four current runtime JSON files", async () => {
  assert.deepEqual((await fs.readdir(new URL("../data/catalogs/", import.meta.url))).sort(), Object.values(CATALOG_DEFINITIONS).map(d => d.filename).sort());
});
test("audit moved unchanged; active code/docs contain no obsolete JSON paths", async () => {
  assertHistoricalAudit('olegurps_ht178_68_mode_pairs_v1.json', proof.auditSha256);
  for (const path of ["scripts/catalog-service.js", "scripts/ammunition-compatibility-service.js", "docs/catalog-service.md", "docs/ammunition-compatibility-service.md", "docs/high-tech.md"]) { const source = await fs.readFile(new URL("../" + path, import.meta.url), "utf8"); assert.doesNotMatch(source, /olegurps_(?:weapon_reference_catalog_v5_5|ht_ammunition_catalog_v1_1|ut_ammunition_catalog_v2_6)[.]json/); }
});
