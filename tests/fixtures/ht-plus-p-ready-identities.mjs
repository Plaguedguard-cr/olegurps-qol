import assert from "node:assert/strict";
import { readAuditFixture } from "./ht-audit-contracts.mjs";

// HT91/101/120/124: previously completed G profiles, not new pressure approvals.
const completedG = [
  ["WHsI3V0zdU2TUI6w7", "ht_476_enfield_12_05x22mmr"],
  ["WApJkhMAYa4wlXViK", "ht_5_7x28mm_fabrique_nationale"],
  ["WTrwxX4jwWz6xKiPz", "ht_5_7x28mm_fabrique_nationale"],
  ["WYmXQkUoq1luUajT-", "ht_9x21mm_gyurza"],
  ["WecVKS0hiwdjXu_uS", "ht_9x21mm_gyurza"],
  ["WgOt4XUnNzTOpdiAO", "ht_9x39mm"],
  ["W5biN11nvUhQ00ewl", "ht_13x92mmsr_mauser"]
];
// HT117/120: APS cavitation-stabilized dart; HT134/137: KPV APHCI-T.
// HT165 permits individually handloaded +P; OWNER decisions replace the old GM gate.
export const ownerManualG = [
  ["W10jqOZ0kjeSuoY3C", "ht_5_66x39mm"],
  ["WK6cr08HEjTSsvYNS", "ht_14_5x114mm"]
];
// HT92/117/119: unproven old cartridge identities. MAS Pistolet Mle 1777 was already
// outside the 363 world-ready pairs because it required a loading confirmation.
const closed = [
  ["WwlfY-FYthqkLvByK", "ht_22_long_rifle_5_7x16mmr"],
  ["W82oDY970UdeqLXTF", "ht_5_56x45mm_nato"],
  ["Wkvf5salwlKpkRx_c", "ht_5_56x45mm_nato"],
  ["WGJgRQusTscOtoLC9", "ht_5_56x45mm_nato"]
];
const key = row => row.modeId + "/" + (row.ammoId ?? row.ammoItemId);

// HT199 and HT91: the same AM-402 12G firing action in the AM-402T Tonfa.
// The physical links do not imply a pressure rating or a new +P approval.
export const condorTonfaPairs=['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load']
 .map(ammoId=>['WHTM28CondorTonfaFired',ammoId]);
export function assertCurrentHTNativePairs(catalogs){
 const pairs=book=>catalogs[book==='source'?'getSourceCatalog':'getCatalog']('ht').ammo_items.flatMap(a=>a.weapon_mode_ids.map(id=>id+'/'+a.id));
 const original=pairs('source'),actual=pairs('effective');assert.equal(original.length,511);
 assert.deepEqual(actual.toSorted(),[...original,...condorTonfaPairs.map(([m,a])=>m+'/'+a)].toSorted());
 assert.equal(new Set(actual).size,513);return actual;
}

export function assertPlusPReadyIdentities(rows) {
  const later=rows.filter(row=>row.modeId==='WHTM28CondorTonfaFired');
  assert.deepEqual(later.map(row=>[row.modeId,row.ammoId??row.ammoItemId]).sort(),condorTonfaPairs.toSorted());
  assert.ok(later.every(row=>row.ready===false),'new physical links grant no +P readiness');
  rows=rows.filter(row=>row.modeId!=='WHTM28CondorTonfaFired');
  const historical = readAuditFixture("ht-12g-case-correction").all.filter(row => row.ready);
  const expected = new Set(historical.map(key));
  assert.equal(expected.size, 363);
  for (const [modeId, ammoId] of [...completedG, ...ownerManualG]) {
    assert(!expected.has(modeId + "/" + ammoId));
    expected.add(modeId + "/" + ammoId);
  }
  for (const [modeId, ammoId] of closed) assert(expected.delete(modeId + "/" + ammoId));
  assert(!expected.has("WOAL2ladqiRbTuvRU/ht_17_5mm_flintlock_mle_1777"));
  const actual = rows.filter(row => row.ready).map(key);
  assert.equal(new Set(rows.map(key)).size, 511, "unique native pair identities");
  assert.equal(new Set(actual).size, actual.length, "no duplicate ready pair");
  assert.deepEqual(actual.sort(), [...expected].sort(), "exact reviewed +P readiness boundary");
  assert.equal(actual.length, 368); // 363 + 7 + APS + KPV - 4; loading checks remain separate.
}
