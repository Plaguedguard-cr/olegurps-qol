import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Keep the packaging allowlist in sync with release.yml. Every tracked runtime
// file must ship, including newly added imports and source-data modules.
// scripts/audits is development-only and export-ignored by .gitattributes.
const roots = ['module.json', 'scripts', 'templates', 'styles', 'data', 'assets', 'lang', 'packs', 'README.md'];
const expected = execFileSync('git', ['ls-files', '-z', '--', ...roots], {encoding: 'utf8'})
  .split('\0').filter(file => file && !file.startsWith('scripts/audits/'));
const entries = new Set(readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean));
const files = [...entries].filter(entry => !entry.endsWith('/'));
const missing = expected.filter(file => !entries.has(file));
const unexpected = files.filter(file => !expected.includes(file));
assert.equal(missing.length, 0, `Runtime files missing from archive: ${missing.join(', ')}`);
assert.equal(unexpected.length, 0, `Unexpected files in archive: ${unexpected.join(', ')}`);
assert.ok(files.includes('module.json') && files.includes('scripts/main.js'));
console.log(`Validated archive coverage: ${files.length} tracked runtime files.`);
