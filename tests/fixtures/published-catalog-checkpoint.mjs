import { createHash } from 'node:crypto';

const published = {
  weapons: ['21264dfa13f5ece23fdf9b77de6046eb7cf6522595e498da2badb466d21c177e', 'mass|massFeed'],
  ht: ['62aee58b31139082155544a42cb7f73b78f6872acc1666cc9f05c3b732594db8', 'mass|massFeed|massModifier'],
  lt: ['fb8261379a4cd5ad9f0ba2039ea03dbcf278dd1b456f45d39d20ee2cc17a0d40', 'mass|massModifier'],
  ut: ['f3d0ecb877b63595444c38966ac8c703d3185de9019f0475deda0d34e534c37f', 'massModifier']
};

// v0.2.3 added approved mass data to the published v0.2.2 catalogs. Reconstruct
// the exact historical bytes only from a recognized published input. Every
// historical byte hash and mutation assertion remains authoritative.
export function restorePublishedCatalogCheckpoint(raw, book) {
  const [hash, fields] = published[book] ?? [];
  raw = raw.toString('utf8').replaceAll('\r\n', '\n');
  if (!hash || createHash('sha256').update(raw).digest('hex') !== hash) return raw;

  const block = new RegExp('(,?)\\n( +)"(?:' + fields + ')": \\{\\n[\\s\\S]*?\\n\\2\\}(,?)', 'g');
  let previous;
  do {
    previous = raw;
    raw = raw.replace(block, (_match, leading, _indent, trailing) => trailing ? leading : '');
  } while (raw !== previous);

  if (book === 'ut') raw = raw.replace(
    '"source_status": "OleGURPS QOL approved project rule; 25mm absent from published UT 157 table"',
    '"source_status": "OleGURPS house rule (inferred; 25mm absent from published UT 157 table)"');
  return raw;
}
