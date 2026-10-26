import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {catalogs} from './helpers/lt-p7-context.mjs';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';
const historical=JSON.parse(await fs.readFile(new URL('./fixtures/lt-p7-historical-contract.json',import.meta.url),'utf8'));
const actor={system:{attributes:{DX:{value:20},IQ:{value:20},ST:{value:14}},skills:{}}};
for(const row of historical.modes)test('individual printed attribute default '+row.modeId+' '+row.source.sourceStats.governingSkillAndDefaults,()=>{
 const mode=catalogs.getMode(row.modeId),equipment=catalogs.getEquipmentForMode(row.modeId),result=resolveStandaloneSkill({actor,record:{id:'default-contract',equipmentSnapshot:equipment},mode:{modeId:row.modeId,snapshot:mode,overrides:{}}});
 const source=row.source.sourceStats.governingSkillAndDefaults,matches=[...source.matchAll(/\b(DX|IQ|ST|HT|Per|Will)\s*-\s*(\d+)/g)];
 if(matches.length){const expected=Math.max(...matches.map(([,attribute,penalty])=>actor.system.attributes[attribute.toUpperCase()].value-Number(penalty)));assert.equal(result.resolved,true);assert.equal(result.level,expected);assert.equal(result.learned,false);}
 else{assert.equal(result.resolved,false);if(source==='NET (Cloak-5)'){
  const learned={...actor,system:{...actor.system,skills:{c:{name:'Cloak',level:17,points:1}}}},bySkill=resolveStandaloneSkill({actor:learned,record:{id:'net-default',equipmentSnapshot:equipment},mode:{modeId:row.modeId,snapshot:mode,overrides:{}}});assert.equal(bySkill.level,12);assert.equal(bySkill.source,'skill-default');
 }else assert.match(source,/No default/i);}
});
