import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { assertWeaponPreservation, restoreApprovedErrata, restoreHaflaErrata, sha256 } from "./fixtures/ht-preservation-contract.mjs";

const proof = readAuditFixture('ht-v1-3-preservation');
const raw = await fs.readFile(new URL("../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json", import.meta.url), "utf8");
const catalog = JSON.parse(raw);
const historical = restoreApprovedErrata(raw, proof);
const mode = data => data.equipment.flatMap(item => item.modes).find(item => item.weapon_mode_id === "WRziobjV56cvaJtG2");

test("old byte baseline remains valid with both historical HT pointer hashes", () => {
  assertWeaponPreservation(historical, proof, { historical: true });
  assert.equal(mode(JSON.parse(historical)).stats.range, "1,600");
});

test("new byte baseline admits exactly the FN BAR Magnum revision 1 correction", () => {
  const previous = restoreHaflaErrata(raw, proof);
  assertWeaponPreservation(previous, proof, { errataRevision: 1 });
  assert.equal(mode(catalog).stats.range, "1,600/6,600");
  const expected = JSON.parse(historical);
  mode(expected).stats.range = "1,600/6,600";
  expected.catalog_errata_v1 = proof.approvedWeaponErrata.metadata;
  assert.deepEqual(JSON.parse(previous), expected);
});

test("revision 2 admits only HAFLA Acc zero in addition to the approved revision 1", () => {
  assertWeaponPreservation(raw, proof);
  const expected = JSON.parse(restoreHaflaErrata(raw, proof));
  const hafla = expected.equipment.flatMap(e => e.modes).find(m => m.weapon_mode_id === "Wr3VDL3Z6SR3KCz3K");
  assert.equal(hafla.stats.accuracy, null);
  hafla.stats.accuracy = "0";
  expected.catalog_errata_v1 = proof.approvedHaflaErrata.metadata;
  assert.deepEqual(catalog, expected);
  assert.throws(() => assertWeaponPreservation(raw, proof, { errataRevision: 1 }));
  assert.throws(() => assertWeaponPreservation(restoreHaflaErrata(raw, proof), proof));
});

test("old baseline rejects errata bytes and new baseline rejects uncorrected bytes", () => {
  assert.throws(() => assertWeaponPreservation(raw, proof, { historical: true }));
  assert.throws(() => assertWeaponPreservation(historical, proof));
});

const mutations = {
  "another original stat": data => { data.equipment[0].modes[0].stats.accuracy = "999"; },
  "approved mode other stat": data => { mode(data).stats.damage.base = "999d"; },
  "unapproved Range": data => { mode(data).stats.range = "1,600/6,601"; },
  "equipment ID": data => { data.equipment[0].equipment_id += "changed"; },
  "mode ID": data => { mode(data).weapon_mode_id += "changed"; },
  "deleted record": data => { data.equipment.pop(); },
  "source GCS hash": data => { data.sources[0].sha256 = "changed"; },
  "HT filename": data => { data.ht_ammunition_catalog_link.catalog_filename = "unknown.json"; },
  "HT revision": data => { data.ht_ammunition_catalog_link.catalog_revision = "1.4"; },
  "HT join key": data => { data.ht_ammunition_catalog_link.join_key = "other"; },
  "errata revision": data => { data.catalog_errata_v1 ??= structuredClone(proof.approvedWeaponErrata.metadata); data.catalog_errata_v1.revision = 3; },
  "HAFLA unapproved Acc": data => { data.equipment.flatMap(e => e.modes).find(m => m.weapon_mode_id === "Wr3VDL3Z6SR3KCz3K").stats.accuracy = "1"; },
  "extra errata permission": data => { data.catalog_errata_v1 ??= structuredClone(proof.approvedWeaponErrata.metadata); data.catalog_errata_v1.mode_stat_corrections.other = { field: "damage" }; }
};
for (const [name, mutate] of Object.entries(mutations)) test("both contracts reject undeclared " + name, () => {
  for (const [baseline, isHistorical] of [[raw, false], [historical, true]]) {
    const changed = JSON.parse(baseline);
    mutate(changed);
    const bytes = JSON.stringify(changed, null, 2) + "\n";
    assert.notEqual(bytes, baseline, "mutation must actually modify the catalog");
    assert.throws(() => assertWeaponPreservation(bytes, proof, { historical: isHistorical }));
  }
});

test("frozen HT audit files retain their original byte hashes", async () => {
  for (const [file, expected] of Object.entries(proof.auditHashes)) {
    assertHistoricalAudit(file, expected);
  }
});
