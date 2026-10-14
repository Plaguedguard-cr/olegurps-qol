import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Extracted from originals verified against the external archive manifest.
// Changing this checkpoint requires reviewing the source extraction, not a test rebaseline.
const EXPECTED_SHA256 = 'eceaff7a002bf50d02473a4c30282a657a5b64f6537182bfc349cbbbed74d541';
const hash = value => createHash('sha256').update(value).digest('hex');

export function validateAuditFixtureBundle(bytes) {
  assert.equal(hash(bytes), EXPECTED_SHA256, 'immutable extracted audit contracts');
  const bundle = JSON.parse(bytes);
  assert.equal(bundle.schema, 1);
  for (const source of Object.values(bundle.sources)) {
    if (source.encoding === 'blocker-contracts-v1') {
      source.data.rows = source.data.rows.map(([modeId, equipmentId, ammoItemId, ammoFamilyId, primaryCategory, contract]) => {
        assert.ok(Number.isInteger(contract) && source.contracts[contract]);
        return { modeId, equipmentId, ammoItemId, ammoFamilyId, primaryCategory, ...structuredClone(source.contracts[contract]) };
      });
    }
    assert.equal(hash(JSON.stringify(source.data)), source.dataSha256, source.sourcePath);
    assert.match(source.sourceSha256, /^[a-f0-9]{64}$/);
  }
  return bundle;
}

const bundle = validateAuditFixtureBundle(readFileSync(new URL('./ht-audit-contracts.json', import.meta.url)));

export function readAuditFixture(name) {
  assert.ok(Object.hasOwn(bundle.sources, name), 'known extracted fixture: ' + name);
  return structuredClone(bundle.sources[name].data);
}

/** Original byte checkpoints stay fixed; physical copies are checked by the archive verifier. */
export function assertHistoricalAudit(file, expected, { historicalWhitespace = false } = {}) {
  const key = file.startsWith('docs/') ? file : 'docs/audit/' + file;
  assert.equal((historicalWhitespace ? bundle.approvedWhitespaceHashes : bundle.archiveHashes)[key], expected, 'original archive byte contract: ' + key);
}
