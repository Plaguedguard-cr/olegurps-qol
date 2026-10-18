import assert from 'node:assert/strict';
import { assertPlusPReadyIdentities as historicalBoundary } from '../fixtures/ht-plus-p-ready-identities.mjs';

// Historical fixtures stay byte-identical. The only current project delta is Zip-Gun.
export function assertPlusPReadyIdentities(rows) {
  const zip=rows.filter(r=>r.modeId==='WwlfY-FYthqkLvByK');
  assert.equal(zip.length,1);assert.equal(zip[0].ammoId??zip[0].ammoItemId,'ht_22_long_rifle_5_7x16mmr');
  assert.equal(zip[0].ready,true);
  historicalBoundary(rows.map(r=>r===zip[0]?{...r,ready:false}:r));
  assert.equal(rows.filter(r=>r.ready).length,369);
}
