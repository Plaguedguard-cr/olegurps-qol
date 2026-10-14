import { russianUI } from "../russian-ui.js";
// Readable fallback while Foundry is still using cached package language metadata.
const fallback = {
  "ru": Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.Developer.")).map(([key, value]) => [key, value]))
};

import { moduleText } from "../localization.js";
export function developerText(name, runtime = globalThis) {
  const key = "OleGURPS.Developer." + name;
  return moduleText(key, {}, fallback.ru[key]);
}
