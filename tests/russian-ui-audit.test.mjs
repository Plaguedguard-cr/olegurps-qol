import test from "node:test";
import assert from "node:assert/strict";
import { auditRussianUI } from "../tools/audit-russian-ui.mjs";
import { localizeOwnChat } from "../scripts/tools/chat-ui-localization.js";
import fs from "node:fs";
import { macroLabels } from "../scripts/macro-labels.js";
import { getGgaDamageTypes } from "../scripts/tools/damage.js";

test("module-authored Russian dictionary and direct display surfaces have no obvious English sentences", () => {
  assert.deepEqual(auditRussianUI(), []);
});
test("own damage selector localizes tooltips without altering native damage types or i18n",()=>{
  const oldGurps=globalThis.GURPS,oldGame=globalThis.game;
  const tables={woundModifiers:{cr:{label:"Crushing"},pi:{label:"Piercing"}},translate:type=>type};
  const native={lang:"en",localize:()=>"Native English"};
  globalThis.GURPS={DamageTables:tables};globalThis.game={i18n:native};
  try {
    assert.deepEqual(getGgaDamageTypes().map(t=>({type:t.type,label:t.label})),[{type:"cr",label:"cr — дробящий"},{type:"pi",label:"pi — пробивающий"}]);
    assert.equal(tables.woundModifiers.cr.label,"Crushing");assert.equal(game.i18n,native);assert.equal(native.lang,"en");
  }finally{globalThis.GURPS=oldGurps;globalThis.game=oldGame;}
});
test("all ten exported macros translate only their names and preserve IDs, commands and permissions",()=>{
  const before=JSON.parse(fs.readFileSync("tests/fixtures/module-macro-contract.json","utf8"));
  const after=JSON.parse(fs.readFileSync("data/macros/olegurps-macros.json","utf8"));
  assert.equal(after.length,10);assert.equal(Object.keys(macroLabels).length,10);
  for(let i=0;i<before.length;i++){
    const {name,...data}=after[i];
    assert.deepEqual(data,before[i]);assert.equal(name,macroLabels[data._id]);assert.match(name,/[\u0400-\u04ff]/);
  }
});
test("legacy chat localization visits only owned sections and preserves native GGA nodes", () => {
  const nodes=[{nodeValue:"Skill details"},{nodeValue:"Ranged Weapon Level: 13"},{nodeValue:"Guns/TL9 (Rifle): 13"}],native={nodeValue:"Rolling 6d\u00d79 cr ex damage"};
  const root={querySelectorAll(selector){assert.equal(selector.includes(".roll-message"),false);return [nodes];}};
  localizeOwnChat(root,{document:{createTreeWalker(section,type){assert.equal(type,4);let index=0;return {nextNode:()=>section[index++]??null};}}});
  assert.equal(nodes[0].nodeValue,"Расчёт навыка");assert.equal(nodes[1].nodeValue,"Базовый навык оружия: 13");
  assert.equal(nodes[2].nodeValue,"Guns/TL9 (Rifle): 13");assert.equal(native.nodeValue,"Rolling 6d\u00d79 cr ex damage");
});
