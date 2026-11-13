import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { weaponStrengthExplanation } from '../scripts/tools/weapon-strength-display.js';
import { rangedStrengthExplanation } from '../scripts/tools/ranged-weapon-strength.js';
import { buildAttackModifierBreakdownHtml } from '../scripts/tools/prepared-gga-roll.js';
const base={source:{publishedST:'10'},applicableST:8,effectiveRequiredST:10,desiredPenalty:-2,proposedDelta:-2,transmittedDelta:null,baseLevel:16,provenanceStatus:'CLEAN',externalComponents:[],support:{}};
test('CLEAN shows original requirement, actual ST, total and single additional correction',()=>{
 const text=weaponStrengthExplanation(base);for(const part of ['Опубликованная ST: 10','ST персонажа: 8','требуется ST: 10','общий штраф ST: -2','база навыка: 16','ST-поправка GGA: -2'])assert.ok(text.includes(part),text);
});
test('KNOWN_INCLUDED distinguishes total -2 from additional -1 on base15',()=>{
 const e={...base,provenanceStatus:'KNOWN_INCLUDED',knownIncludedPenalty:-1,baseLevel:15,proposedDelta:-1};
 const text=weaponStrengthExplanation(e);assert.match(text,/общий штраф ST: -2/);assert.match(text,/базе уже учтено: -1/);assert.match(text,/ST-поправка GGA: -1/);assert.match(text,/база навыка: 15/);
});
test('UNKNOWN never claims zero penalty or a proven clean skill',()=>{
 const text=weaponStrengthExplanation({...base,baseLevel:15,provenanceStatus:'UNKNOWN',proposedDelta:null,transmittedDelta:0});
 assert.match(text,/общий штраф ST: -2/);assert.match(text,/неизвестен/);assert.match(text,/не применён/);assert.doesNotMatch(text,/ST-поправка GGA: 0/);
});
test('published mounted21M is preserved and handling ignored, without ST0',()=>{
 const text=weaponStrengthExplanation({...base,source:{publishedST:'21M'},requirementIgnored:true,effectiveRequiredST:null,desiredPenalty:0,proposedDelta:0,support:{confirmedType:'mounted'}});
 assert.match(text,/21M/);assert.match(text,/требование игнорируется/);assert.doesNotMatch(text,/требуется ST: 0/);
});
test('external proven ST component is reconciled in preview; frozen transmitted value wins',()=>{
 const e={...base,externalComponents:[{scope:'external-channel',value:-1}]};assert.match(weaponStrengthExplanation(e),/ST-поправка GGA: -1/);
 assert.match(weaponStrengthExplanation({...e,transmittedDelta:2}),/ST-поправка GGA: \+2/);
});
test('artillery keeps handling, drawing and rating distinct; no current Actor read',()=>{
 const e={...base,scope:'personal-artillery',source:{rawST:'7†[8]',publishedST:'7†[8]'},ratedST:8,operation:{drawing:{value:6,method:'crank'}},support:{}};
 const before=JSON.stringify(e),text=rangedStrengthExplanation(e);assert.match(text,/ST для обращения: 7†/);assert.match(text,/ST взведения: 6/);assert.match(text,/Rated ST механизма: 8/);assert.equal(JSON.stringify(e),before);
});
test('same formatter works with melee snapshot evidence and closed escaped modifier details',()=>{
 const e={...base,source:{publishedST:'10†'},selection:{grip:'one-handed'}};const html=buildAttackModifierBreakdownHtml([{label:'Недостаточная ST',value:-2}],weaponStrengthExplanation(e));
 assert.match(html,/Одноручное удержание/);assert.doesNotMatch(html,/<details[^>]* open/);assert.equal((html.match(/Недостаточная ST \(-2\)/g)??[]).length,1);
});
test('new ru/en keys have parity and Russian compiled resources match',async()=>{
 const {russianUI}=await import('../scripts/russian-ui.js');const dicts=await Promise.all(['ru','en'].map(locale=>fs.readFile(new URL('../lang/'+locale+'.json',import.meta.url),'utf8').then(JSON.parse)));
 for(const suffix of ['Calculation','BaseLevel','BaseLabel','Included','Additional','HandlingIgnored','OneHanded','Drawing','SupportApplied','SupportPosture']){const key='OleGURPS.Strength.'+suffix;assert.ok(dicts[0][key]);assert.ok(dicts[1][key]);assert.equal(russianUI[key],dicts[0][key]);assert.doesNotMatch(dicts[0][key],/\u2014/);}
});
