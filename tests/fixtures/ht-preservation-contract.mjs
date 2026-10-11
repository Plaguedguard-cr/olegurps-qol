import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const sha256 = value => createHash("sha256").update(value).digest("hex");

function replaceExactlyOnce(raw, before, after) {
  assert.equal(raw.split(before).length - 1, 1, "expected exactly one authorized byte block");
  return raw.replace(before, after);
}

const approvalFor = (proof, revision) => revision === 1 ? proof.approvedWeaponErrata : proof.approvedHaflaErrata ?? proof.approvedWeaponErrata;

export function restoreApprovedErrata(raw, proof, { errataRevision } = {}) {
  const catalog = JSON.parse(raw);
  const approval = approvalFor(proof, errataRevision);
  assert.deepEqual(catalog.catalog_errata_v1, approval.metadata, "only approved errata revision and metadata are allowed");
  const modeBytes = value => JSON.stringify(value, null, 2).replaceAll("\n", "\n        ");
  for (const [modeId, correction] of Object.entries(approval.metadata.mode_stat_corrections)) {
    const modes = catalog.equipment.flatMap(item => item.modes).filter(mode => mode.weapon_mode_id === modeId);
    assert.equal(modes.length, 1, "approved mode must remain unique");
    const mode = modes[0];
    assert.equal(mode.stats[correction.field], correction.corrected);
    const original = structuredClone(mode);
    original.stats[correction.field] = correction.previous;
    raw = replaceExactlyOnce(raw, modeBytes(mode), modeBytes(original));
  }
  const metadataBytes = '  "catalog_errata_v1": ' + JSON.stringify(approval.metadata, null, 2).replaceAll("\n", "\n  ") + ",\n";
  return replaceExactlyOnce(raw, metadataBytes, "");
}

export function restoreHaflaErrata(raw, proof) {
  const catalog = JSON.parse(raw), approval = proof.approvedHaflaErrata;
  assert.deepEqual(catalog.catalog_errata_v1, approval.metadata);
  const modes = catalog.equipment.flatMap(e => e.modes).filter(m => m.weapon_mode_id === approval.modeId);
  assert.equal(modes.length, 1);
  const mode = modes[0], correction = approval.metadata.mode_stat_corrections[approval.modeId];
  assert.equal(mode.stats[correction.field], correction.corrected);
  const original = structuredClone(mode); original.stats[correction.field] = correction.previous;
  const modeBytes = value => JSON.stringify(value, null, 2).replaceAll("\n", "\n        ");
  const metadataBytes = value => '  "catalog_errata_v1": ' + JSON.stringify(value, null, 2).replaceAll("\n", "\n  ") + ",\n";
  return replaceExactlyOnce(replaceExactlyOnce(raw, modeBytes(mode), modeBytes(original)), metadataBytes(approval.metadata), metadataBytes(proof.approvedWeaponErrata.metadata));
}

export function restoreHTPointer(raw) {
  const pointer = JSON.parse(raw).ht_ammunition_catalog_link;
  assert.deepEqual(pointer, {
    catalog_kind: "olegurps-ht-ammunition-catalog-v1",
    catalog_filename: "olegurps_ht_ammunition_catalog_v1_3.json",
    join_key: "mode.ht_ammo_item_ids -> ammo_items[].id",
    source_gate: "HT only",
    catalog_revision: "1.3"
  }, "HT pointer must retain its exact approved identity");
  const previous = { ...pointer, catalog_filename: "olegurps_ht_ammunition_catalog_v1_2.json", catalog_revision: "1.2" };
  const bytes = value => '  "ht_ammunition_catalog_link": ' + JSON.stringify(value, null, 2).replaceAll("\n", "\n  ") + ",\n";
  return replaceExactlyOnce(raw, bytes(pointer), bytes(previous));
}

export function assertWeaponPreservation(raw, proof, { historical = false, errataRevision } = {}) {
  if (historical) {
    assert.equal(JSON.parse(raw).catalog_errata_v1, undefined);
    assert.equal(sha256(raw), proof.weaponCurrentSha256, "historical HT 1.3 baseline");
    assert.equal(sha256(restoreHTPointer(raw)), proof.weaponPreviousSha256, "historical HT 1.2 baseline");
    return;
  }
  const approval = approvalFor(proof, errataRevision);
  assert.equal(sha256(raw), approval.weaponCurrentSha256, "approved errata baseline");
  assert.equal(sha256(restoreHTPointer(raw)), approval.weaponPreviousSha256, "approved errata with historical HT pointer");
  // Keep the original byte hashes authoritative: undo only the approved change.
  if (approval === proof.approvedHaflaErrata) assertWeaponPreservation(restoreHaflaErrata(raw, proof), proof, { errataRevision: 1 });
  assertWeaponPreservation(restoreApprovedErrata(raw, proof, { errataRevision }), proof, { historical: true });
}
