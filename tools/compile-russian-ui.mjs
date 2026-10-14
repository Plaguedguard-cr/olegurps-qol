import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const dictionary = JSON.parse(readFileSync(new URL("lang/ru.json", root), "utf8"));
writeFileSync(new URL("scripts/russian-ui.js", root),
  "// Generated from lang/ru.json by tools/compile-russian-ui.mjs.\n" +
  "export const russianUI = Object.freeze(" + JSON.stringify(dictionary, null, 2) + ");\n", "utf8");
