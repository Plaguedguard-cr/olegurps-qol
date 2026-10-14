import fs from "node:fs";
import path from "node:path";
import { russianUI } from "../scripts/russian-ui.js";

// Only module-authored display surfaces, not API IDs, catalogs or GGA templates.
export function auditRussianUI() {
  const findings = [];
  const sentence = text => /\b(?:the|requires?|unavailable|choose|select|will|must|cannot|failed|invalid|confirmed|only|updated|available|expires?|between|within|for each)\b/i.test(text)
    && /\b[A-Za-z]+\s+[A-Za-z]+\b/.test(text);
  for (const [key, value] of Object.entries(russianUI)) {
    if (!/[\u0400-\u04ff]/.test(value) && sentence(value)) findings.push({file:"scripts/russian-ui.js",key,text:value});
  }
  const untranslatedLabels = /^(?:Governing Skill|Random Hit Location|High Ground|Low Ground|GGA target|Dice \+ Adds|Eff\. mod:|Skill details)$/i;
  for (const filename of fs.readdirSync("scripts/tools").filter(name => name.endsWith(".js") && !name.endsWith("-localization.js"))) {
    const file = path.posix.join("scripts/tools",filename), source=fs.readFileSync(file,"utf8");
    const displays = [...source.matchAll(/(?:\.textContent|\.title|\.innerHTML)\s*=\s*(["'`])([^\n]*?)\1|ui\.notifications\.(?:warn|error|info)\(\s*(["'`])([^\n]*?)\3|>([^<>\n]+)</g)];
    for (const match of displays) {
      const text = (match[2] ?? match[4] ?? match[5]).replace(/\$\{[^}]*\}?/g, "");
      if (/\{[^}]*:[^}]*\}/.test(text)) continue; // Inline CSS is not displayed prose.
      if (!/[\u0400-\u04ff]/.test(text) && (sentence(text) || untranslatedLabels.test(text.trim()))) findings.push({file,line:source.slice(0,match.index).split("\n").length,text});
    }
  }
  return findings;
}
if (process.argv[1]?.endsWith("audit-russian-ui.mjs")) {
  const findings=auditRussianUI();console.log(JSON.stringify({findings},null,2));process.exitCode=findings.length?1:0;
}
