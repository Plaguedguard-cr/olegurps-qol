import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(fs.readFileSync(new URL('./ui-dash-exceptions.json', import.meta.url), 'utf8'));
// Include escaped signs and HTML entities as well as literal characters.
const nonUiSign = /[\u2014\u2212]|\\u(?:2014|2212|\{(?:2014|2212)\})|&#(?:0*(?:8212|8722)|x0*(?:2014|2212));|&(?:mdash|minus);/iu;
export function unapprovedUIDash(file, text) {
  return nonUiSign.test(text) && !registry.some(entry => entry.file === file && entry.text === text && entry.reason);
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
  else console.log('UI dash and minus check passed (scripts, lang, templates, styles; exact classified exceptions).');
}
