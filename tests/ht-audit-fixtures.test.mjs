import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAuditFixture, assertHistoricalAudit, validateAuditFixtureBundle } from './fixtures/ht-audit-contracts.mjs';

test('compact fixture retains exact historical pair identities and blocker boundaries', () => {
  const blockers = readAuditFixture('ht-plus-p-blockers');
  assert.equal(blockers.rows.length, 227);
  assert.ok(blockers.rows.some(r => r.GM.loadingCheckRequired === true));
  assert.equal(new Set(blockers.rows.map(r => r.modeId + '/' + r.ammoItemId)).size, 227);
  assert.deepEqual(Object.fromEntries(Object.entries(blockers.categories).map(([k,v]) => [k,v.count])),
    { A:0, B:106, C:0, D:0, E:12, F:98, G:11 });
  const old = readAuditFixture('ht-plus-p-category-b');
  assert.equal(old.rows.length, 21);
  assert.ok(old.rows.every(r => r.reason === 'plus-p-heavy-load-baseline-unresolved'));
  assert.equal(readAuditFixture('olegurps_ht178_68_mode_pairs_v1').pairs.length, 68);
  assert.equal(readAuditFixture('ht-final-511-runtime-audit').additionalUIChoices.length, 101);
  assert.equal(readAuditFixture('ht-12g-case-correction').loadingChecks, 27);
});

test('source hash checkpoints stay exact, including the separately approved one-newline cleanup', () => {
  const proof = readAuditFixture('ht-v1-3-preservation');
  for (const [name, expected] of Object.entries(proof.auditHashes)) assertHistoricalAudit(name, expected);
  const name = 'docs/audit/olegurps_ht64_source_review_v1.md';
  const old = readAuditFixture('ht64-case-technology-before')[name];
  assertHistoricalAudit(name, old, { historicalWhitespace:true });
  assert.throws(() => assertHistoricalAudit(name, old));
  assert.throws(() => assertHistoricalAudit(name, '0'.repeat(64), { historicalWhitespace:true }));
});

test('any altered expected value, ID, recipe boundary or provenance fails the immutable fixture checkpoint', () => {
  const bytes = readFileSync(new URL('./fixtures/ht-audit-contracts.json', import.meta.url));
  for (const mutate of [
    b => { b.sources['ht-plus-p-blockers'].data.rows[0][0] = 'other-mode'; },
    b => { b.sources['ht-plus-p-blockers'].data.rows.pop(); },
    b => { b.sources['ht64-complex-effects-decision-matrix'].data.effects[0].effect_id = 'other-effect'; },
    b => { b.sources['ht-v1-3-preservation'].sourceSha256 = '0'.repeat(64); }
  ]) {
    const changed = JSON.parse(bytes); mutate(changed);
    assert.throws(() => validateAuditFixtureBundle(Buffer.from(JSON.stringify(changed) + '\n')));
  }
});

test('fixture callers cannot overwrite the expectations used by another test', () => {
  const first = readAuditFixture('ht-plus-p-blockers');
  first.rows[0].modeId = 'changed'; first.categories.E.count = 0;
  const second = readAuditFixture('ht-plus-p-blockers');
  assert.notEqual(second.rows[0].modeId, 'changed');
  assert.equal(second.categories.E.count, 12);
  assert.throws(() => readAuditFixture('unknown'));
});
