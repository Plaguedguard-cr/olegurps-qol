import { readFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { archiveSnapshot } from './local-document-archive.mjs';

const snapshot = resolve(process.argv[2] || archiveSnapshot());
const manifest = JSON.parse(await readFile(join(snapshot, 'manifest.json'), 'utf8'));
const paths = new Set();
for (const entry of manifest.entries) {
  if (paths.has(entry.originalPath)) throw Error('DuplicateArchiveEntry');
  paths.add(entry.originalPath);
  const destination = resolve(snapshot, entry.originalPath);
  if (!destination.startsWith(snapshot + sep)) throw Error('ArchivePathOutsideSnapshot');
  const bytes = await readFile(destination);
  if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
    throw Error('ArchiveChecksumMismatch: ' + entry.originalPath);
}
if (manifest.copied !== paths.size) throw Error('IncompleteArchiveManifest');
console.log(JSON.stringify({ files: paths.size, verified: true }));
