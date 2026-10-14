import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional source-audit dependency only. Never imported by the Foundry entrypoint.
const repository = fileURLToPath(new URL('../', import.meta.url));
export function archiveRoot() {
  const root = resolve(process.env.OLEGURPS_ARCHIVE_ROOT || resolve(repository, '../../../olegurps-qol-archive'));
  if (root === resolve(repository) || root.startsWith(resolve(repository) + sep))
    throw Error('ExternalArchiveRequired');
  return root;
}
export function archiveSnapshot() {
  return resolve(process.env.OLEGURPS_ARCHIVE_SNAPSHOT || join(archiveRoot(), 'snapshots/2026-10-14-docs-reorganization'));
}
export async function readArchivedJSON(relativePath) {
  const snapshot = archiveSnapshot(), target = resolve(snapshot, relativePath);
  if (!target.startsWith(snapshot + sep)) throw Error('InvalidArchivePath');
  let manifest;
  try { manifest = JSON.parse(await readFile(join(snapshot, 'manifest.json'), 'utf8')); }
  catch { throw Error('Local source audit requires OLEGURPS_ARCHIVE_ROOT or OLEGURPS_ARCHIVE_SNAPSHOT; see AGENTS.md'); }
  const entry = manifest.entries.find(row => row.originalPath === relativePath);
  if (!entry) throw Error('ArchiveEntryMissing: ' + relativePath);
  const bytes = await readFile(target);
  if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
    throw Error('ArchiveChecksumMismatch: ' + relativePath);
  return JSON.parse(bytes);
}
export async function archiveOutputPath(name) {
  if (name !== name.split(/[\\/]/).at(-1)) throw Error('InvalidOutputName');
  const directory = join(archiveRoot(), 'generated');
  await mkdir(directory, { recursive: true });
  return join(directory, name);
}
