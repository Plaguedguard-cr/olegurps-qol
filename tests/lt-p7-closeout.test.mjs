import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {catalogs} from './helpers/lt-p7-context.mjs';
const historical=JSON.parse(fs.readFileSync(new URL('./fixtures/lt-p7-historical-contract.json',import.meta.url),'utf8'));
const output=join(tmpdir(),'lt-p7-contract-'+crypto.randomUUID()+'.json');
let current;
try{execFileSync(process.execPath,['tools/lt-p7-closeout-probe.mjs',output],{cwd:new URL('..',import.meta.url),stdio:'pipe'});current=JSON.parse(fs.readFileSync(output,'utf8'));}finally{fs.rmSync(output,{force:true});}
const byMode=new Map(current.modes.map(r=>[r.modeId,r]));
const norm=value=>value==null?null:String(value).replace(/\s|,/g,'').replace(/[\u00a5\u00d7]/g,'x').replace(/\u2212/g,'-');
const fields={acc:'accuracy',st:'strength',bulk:'bulk',rof:'rate_of_fire',shots:'shots',rcl:'recoil',range:'range'};
test('historical coverage is 180 distinct modes / 165 equipment, 217 physical relations, 600 reference queries, 38 options, 32 findings, 28 source gaps and 91 field differences',()=>{
 assert.equal(byMode.size,180);assert.equal(new Set(historical.modes.map(r=>r.equipmentId)).size,165);assert.equal(current.relations.length,217);assert.equal(current.queries.length,600);assert.equal(historical.variants.length,38);assert.equal(historical.findings.length,32);assert.equal(historical.sourceGaps.length,28);assert.equal(historical.modes.reduce((n,r)=>n+r.differences.length,0),91);
 assert.equal(new Set(current.catalogPhysicalLinks.map(r=>r.modeId+'/'+r.ammoId)).size,current.catalogPhysicalLinks.length);
});
for(const row of historical.modes)test('individual source/editor identity '+row.modeId+' '+row.name,()=>{
 const m=byMode.get(row.modeId);assert.ok(m);assert.equal(m.error,undefined);assert.equal(m.equipmentId,row.equipmentId);assert.ok(m.editor.modes.some(r=>r.modeId===row.modeId));
 for(const [field,key]of Object.entries(fields)){
  if(row.modeId==='WNE2rB6BVUwchQrnf'&&['rof','shots'].includes(field)){assert.equal(m.stats.rate_of_fire,'1x4');assert.equal(m.stats.shots,'4(20i)');continue;}
  assert.equal(norm(m.stats[key]),norm(row.source.sourceStats[field]),row.modeId+'/'+field);
 }
 if(row.modeId==='WAd5_TDslv9AXFyLs')assert.match(m.attack.readinessReason,/LT87|отложен/);
 else assert.equal(m.attack.readinessReason,null,row.modeId);
});
for(const row of current.relations)test('individual historical physical verdict '+row.modeId+'/'+row.ammoId,()=>{
 let expected=row.sourceVerdict==='INCOMPATIBLE'?'incompatible':row.sourceVerdict==='UNDETERMINED'?'undetermined':'compatible';
 if(row.ammoId==='lt_puckle_gun_bullet_lt93')expected='incompatible';
 else if(['lt_arrow_guide_dart','lt_multi_gonne_ball','lt_slurbow_dart_lt76'].includes(row.ammoId))expected='undetermined';
 assert.equal(row.current.status,expected);
 if(expected!=='compatible')assert.ok(row.current.reasons.length);
 if(row.sourceVerdict==='INCOMPATIBLE')assert.equal(row.family.status,'incompatible');
});
for(const option of historical.variants)test('all historical reference queries retain source boundaries for '+option.optionId,()=>{
 const rows=current.queries.filter(r=>r.optionId===option.optionId);assert.ok(rows.length);
 for(const r of rows){
  assert.ok(['compatible','incompatible','undetermined'].includes(r.current.status));
  if(r.sourceVerdict==='INCOMPATIBLE')assert.equal(r.current.status,'incompatible',r.modeId);
  if(['crossbow_alternate_tip','panjagan_10','incendiary_catapult_pot','incendiary_sphere','paper_bomb','iron_bomb'].includes(option.optionId))assert.notEqual(r.current.status,'compatible',r.modeId);
  if(r.current.status==='compatible')assert.ok(r.current.record&&r.current.relation||['corned_powder','serpentine_powder'].includes(option.optionId));
 }
});
test('source aliases find existing equipment instead of manufacturing extra numerical attacks',()=>{
 for(const name of ['Dai-kyu','Chukonu','Zhuge Nu','Fustibal','Mongwanga','Jarid','Plumbata','Bola Loca','Fukiya','Quoit','Flying Dart','Amirre','Mirru']){
  const rows=searchStandaloneModels(catalogs,'ranged',name,'LT');assert.ok(rows.length,name);assert.ok(rows.every(e=>!e.equipment_id.startsWith('alias')));
 }
});
