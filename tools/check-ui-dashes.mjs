import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(fs.readFileSync(new URL('./ui-dash-exceptions.json', import.meta.url), 'utf8'));
// Also check escapes and HTML entities so encoding a new UI dash cannot evade this gate.
const emDash = /\u2014|\\u(?:2014|\{2014\})|&#(?:8212|x2014);|&mdash;/giu;
export function unapprovedUIDash(file, text) {
  emDash.lastIndex = 0;
  const present = emDash.test(text);
  emDash.lastIndex = 0;
  return present && !registry.some(entry => entry.file === file && entry.text === text && entry.reason);
}
export function checkUIDashes(directory = root) {
  const errors = [];
  for (const folder of ['scripts', 'lang', 'templates', 'styles']) {
    for (const relative of fs.readdirSync(path.join(directory, folder), { recursive: true })) {
      if (!/\.(?:js|mjs|json|hbs|html|css)$/i.test(relative)) continue;
      const file = folder + '/' + relative.replaceAll('\\', '/');
      const lines = fs.readFileSync(path.join(directory, file), 'utf8').split(/\r?\n/);
      lines.forEach((text, index) => {
        if (unapprovedUIDash(file, text))
          errors.push({ file, line: index + 1, text });
      });
    }
  }
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkUIDashes();
  if (errors.length) { console.error(JSON.stringify(errors, null, 2)); process.exitCode = 1; }
  else console.log('UI dash check passed (scripts, lang, templates, styles; exact classified exceptions).');
}
