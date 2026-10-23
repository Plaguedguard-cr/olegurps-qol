// Read-only consistency check for the UT source/implementation inventory.
// No Foundry connection, Actor writes, rolls, or dependency on PDFs by default.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CatalogService} from '../scripts/catalog-service.js';
import {BEAM_PROFILES} from '../scripts/ut-beam-source.js';
import {laserModificationAdmission} from '../scripts/ut-laser-modifications.js';
import {MICROWAVE_PROFILES} from '../scripts/ut-microwave-source.js';
import {SONIC_NEURAL_PROFILES} from '../scripts/ut-sonic-neural-source.js';
import {EXOTIC_BEAM_PROFILES} from '../scripts/ut-exotic-beam-source.js';
import {PPB_PROFILES} from '../scripts/ut-plasma-particle-source.js';
import {plasmaGunProfile} from '../scripts/ut-plasma-gun-source.js';
import {physicalRangedProfile} from '../scripts/ut-physical-ranged-source.js';

const root=new URL('../',import.meta.url);
const decode=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const read=async path=>decode(await fs.readFile(new URL(path,root)));
const data=JSON.parse(await read('docs/audit/ut-weapons-inventory.json'));
const report=await read('docs/ut-remaining-weapons-inventory.md');
const previous=await read(data.extends.implementationRegistry).then(JSON.parse).catch(error=>{
  if(error.code==='ENOENT')return null;throw error;
});
const module=JSON.parse(await read('module.json'));
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,
  json:async()=>JSON.parse(await read('data/catalogs/'+url.split('/').at(-1)))})});
await catalogs.load();
const equipment=catalogs.getCatalog('weapons').equipment.filter(e=>e.source==='UT');
const statuses=Object.keys(data.statusDefinitions),counts=Object.fromEntries(statuses.map(s=>[s,0]));
const ids=new Set(),equipmentIds=new Set(),modeIds=new Set(),parserCounts={};
const clean=value=>typeof value==='string'?value.replaceAll('\uFFFD',' [неразобранный знак старого извлечения]'):
  Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)])):value;

assert.equal(module.version,data.moduleVersion);
for(const record of data.records){
  assert.ok(!ids.has(record.id),'Duplicate inventory identity: '+record.id);ids.add(record.id);
  assert.ok(statuses.includes(record.status));counts[record.status]++;
  assert.ok(record.source.pages.length&&record.source.pages.every(p=>Number.isInteger(p)&&p>=5&&p<=240));
  for(const field of ['utName','tl','family','implementationGroup','statusEvidence','nextAction'])assert.ok(record[field],record.id+': '+field);
  assert.ok(record.limitations.length&&record.specialMechanics&&record.attack&&record.resources&&record.ui);
  const microwave=Object.values(MICROWAVE_PROFILES).find(p=>record.modeIds.includes(p.modeId));
  const ppb=Object.values(PPB_PROFILES).find(p=>record.modeIds.includes(p.modeId));
  const sonicNeural=Object.values(SONIC_NEURAL_PROFILES).find(p=>record.modeIds.includes(p.modeId));
  const exotic=Object.values(EXOTIC_BEAM_PROFILES).find(p=>record.modeIds.includes(p.modeId));
  const plasma=record.modeIds.map(plasmaGunProfile).find(Boolean);
  const grav=record.modeIds.map(physicalRangedProfile).find(p=>p?.group==='grav');
  const physical17=record.modeIds.map(physicalRangedProfile).find(p=>p&&p.group!=='grav');
  assert.equal(record.attack.liveThisAudit,!!(microwave||ppb||sonicNeural||exotic||plasma||grav||physical17));
  if(physical17){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-physical-ranged-17-completion-report.md'));
    assert.deepEqual(record.resources.powerProfiles,[]);
    assert.equal(record.resources.physicalFamilies.length,physical17.group==='gyroc'?2:1);
    assert.equal(record.ui.modeDefinitionProbe[0].nativeSafe,true);
    if(physical17.group==='plb'&&physical17.modeId!=='WIijXG9uGZ52T0eW2')assert.equal(record.deferredCoverage,'feature-only');
  }
  if(grav){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-physical-ranged-23-report.md'));
    assert.deepEqual(record.resources.physicalFamilies,[grav.familyId]);
    assert.equal(record.resources.powerProfiles.length,grav.cellSize?1:0);
    if(grav.cellSize){assert.equal(record.resources.powerProfiles[0].profile.capacity,grav.shots);assert.equal(record.resources.powerProfiles[0].profile.cells,grav.cells);}
    assert.equal(record.ui.modeDefinitionProbe[0].nativeSafe,true);
  }
  if(plasma){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-plasma-fusion-eleven-report.md'));
    assert.deepEqual(record.resources.powerProfiles,[]);assert.equal(record.resources.physicalFamilies.length,plasma.hotAllowed?2:1);
    assert.equal(record.ui.modeDefinitionProbe[0].nativeSafe,true);
  }
  if(exotic){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes(exotic.cosmic?'docs/ut-disintegrator-conversion-reality-18-report.md':'docs/ut-psionic-gravity-ghost-20-report.md'));
    assert.equal(record.resources.powerProfiles[0].profile.capacity,exotic.shots);
    assert.equal(record.resources.powerProfiles[0].profile.cells,exotic.cells);
    assert.equal(record.resources.powerProfiles[0].profile.cellSize,exotic.cellSize);
    assert.equal(record.ui.modeDefinitionProbe[0].nativeSafe,true);
  }
  if(sonicNeural){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-sonic-neural-18-report.md'));
    assert.equal(record.resources.powerProfiles[0].profile.capacity,sonicNeural.shots);
    assert.equal(record.resources.powerProfiles[0].profile.cells,sonicNeural.cells);
    assert.equal(record.resources.powerProfiles[0].profile.cellSize,sonicNeural.cellSize);
    assert.equal(record.ui.modeDefinitionProbe[0].nativeSafe,true);
  }
  if(ppb){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-flamer-blaster-pulsar-22-report.md'));
    assert.equal(record.resources.powerProfiles[0].profile.capacity,ppb.shots);
    assert.equal(record.resources.powerProfiles[0].profile.cells,ppb.cells);
    assert.equal(record.resources.powerProfiles[0].profile.cellSize,ppb.cellSize);
    assert.equal(record.ui.modeDefinitionProbe.find(p=>p.modeId===ppb.modeId).nativeSafe,true);
  }
  if(microwave){
    assert.equal(record.status,'ГОТОВО');assert.equal(record.ui.individualLiveThisAudit,true);
    assert.ok(record.evidence.includes('docs/ut-microwave-six-report.md'));
    assert.ok(record.tests.includes('tests/ut-microwave-six.test.mjs'));
    assert.equal(record.resources.powerProfiles[0].profile.capacity,microwave.shots);
    assert.equal(record.resources.powerProfiles[0].profile.cells,microwave.cells);
  }
  for(const file of [...record.evidence,...record.tests])await fs.access(new URL(file,root));
  for(const link of record.historicalModeEvidence){
    assert.ok(record.modeIds.includes(link.modeId));
    if(previous)assert.ok(previous.records.some(r=>r.book==='UT'&&r.modeId===link.modeId),link.modeId);
  }
  if(record.catalog.active){
    for(const id of [record.equipmentId,...record.relatedEquipmentIds]){
      assert.ok(equipment.some(e=>e.equipment_id===id));assert.ok(!equipmentIds.has(id),id);equipmentIds.add(id);
    }
    assert.deepEqual(new Set([...record.modeIds,...record.linkedEffectModeIds]),new Set(record.catalog.currentStats.map(m=>m.modeId)));
    for(const saved of record.catalog.currentStats){
      assert.ok(!modeIds.has(saved.modeId),saved.modeId);modeIds.add(saved.modeId);
      const mode=catalogs.getMode(saved.modeId),owner=catalogs.getEquipmentForMode(saved.modeId);
      assert.ok(mode&&[record.equipmentId,...record.relatedEquipmentIds].includes(owner.equipment_id));
      assert.deepEqual(saved.stats,clean(mode.stats),saved.modeId+': stale projected statistics');
      assert.equal(saved.rawDamage,mode.raw_calc?.damage);
      const parser=saved.installedGGARawParser.type??'none';parserCounts[parser]=(parserCounts[parser]??0)+1;
    }
  }else if(record.catalog.referenceOnly){
    const excluded=catalogs.getCatalog('weapons').excluded_weapon_profiles.find(e=>e.equipment_id===record.equipmentId);
    assert.ok(excluded&&excluded.source==='UT');assert.deepEqual(record.catalog.excludedModeIds,excluded.weapon_mode_ids);
  }else{assert.equal(record.equipmentId,null);assert.deepEqual(record.modeIds,[]);}
}
assert.deepEqual(counts,data.summary.statuses);
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),data.summary.total);
assert.equal(ids.size,data.summary.total);
assert.equal(equipmentIds.size,equipment.length);
assert.equal(modeIds.size,equipment.flatMap(e=>e.modes).length);
assert.equal(data.records.filter(r=>r.deferredByPlan).length,data.summary.deferredByPlan);
assert.equal(data.records.filter(r=>r.deferredCoverage==='all-remaining-work').length,data.summary.deferredAllRemainingWork);
assert.equal(data.records.filter(r=>r.deferredCoverage==='feature-only').length,data.summary.deferredFeatureOnly);
assert.equal(data.records.filter(r=>r.catalog.active).length,data.summary.activeCatalogPhysicalModels);
assert.equal(data.records.filter(r=>r.catalog.referenceOnly).length,data.summary.excludedReferenceOnlyModels);
assert.deepEqual(parserCounts,{damage:225,attribute:43,none:22,deriveddamage:9,derivedroll:7,roll:1});
assert.equal(data.families.reduce((n,f)=>n+f.total,0),data.summary.total);
for(const family of data.families){
  const rows=data.records.filter(r=>r.family===family.family);
  assert.equal(rows.length,family.total);assert.ok(family.nextPackageEligibility);
  for(const status of statuses)assert.equal(rows.filter(r=>r.status===status).length,family.statuses[status]);
  assert.equal(family.remaining,family.total-family.ready);
  assert.ok(report.includes(`| ${family.family} | ${family.total} | ${family.ready} | ${family.remaining} |`),'Report family mismatch: '+family.family);
}
for(const [status,count]of Object.entries(counts))assert.ok(report.includes(`| ${status} | ${count} |`));
assert.ok(report.includes(`**${data.summary.total} уникальных моделей`));
assert.ok(report.includes(`ПО ПЛАНУ: ${data.summary.deferredByPlan}`));
assert.equal(data.nextPackage.count,data.nextPackage.models.length);
if(data.nextPackage.modelIds){
  assert.equal(data.nextPackage.modelIds.length,data.nextPackage.count);
  assert.equal(new Set(data.nextPackage.modelIds).size,data.nextPackage.count);
  for(const [i,id]of data.nextPackage.modelIds.entries()){
    const rows=data.records.filter(r=>r.id===id);assert.equal(rows.length,1,id);
    assert.equal(rows[0].utName,data.nextPackage.models[i]);
  }
}else for(const name of data.nextPackage.models)assert.equal(data.records.filter(r=>r.utName===name).length,1,name);
const matrix=JSON.parse(await read('data/ut-laser-modifications-matrix.json'));
assert.equal(matrix.rows.length,45);
let prohibited=0;
for(const row of matrix.rows){
  const profile=BEAM_PROFILES[row.modeId],admission=laserModificationAdmission(row.modeId);
  assert.equal(profile.baseRoF,Number(catalogs.getMode(row.modeId).stats.rate_of_fire));
  assert.equal(row.baseRoF,profile.baseRoF);
  if(admission.blueGreenReason){assert.equal(row.blueGreen,'incompatible-user-base-rof-one');prohibited++;}
  if(admission.blueGreen)assert.equal(row.blueGreen,'available');
}
assert.equal(prohibited,5);
for(const path of ['docs/audit/ut-weapons-inventory.json','docs/ut-remaining-weapons-inventory.md'])assert.ok(!(await read(path)).includes('\uFFFD'),path);
if(process.argv.includes('--verify-sources')){
  for(const [path,expected]of [[data.source.file,data.source.sha256],[data.extends.sourceRegistry,data.extends.sourceRegistrySHA256]])
    assert.equal(createHash('sha256').update(await fs.readFile(path)).digest('hex'),expected,path);
  const original=JSON.parse(decode(await fs.readFile(data.extends.sourceRegistry)));
  for(const model of original.weapons){
    const match=model.catalog_equipment_id?
      data.records.filter(r=>[r.equipmentId,...r.relatedEquipmentIds].includes(model.catalog_equipment_id)):
      data.records.filter(r=>r.utName===model.name);
    assert.equal(match.length,1,'Source model omitted/duplicated: '+model.name);
  }
  assert.equal(original.weapons.length,data.sourceCoverage.legacyFixedModels);
  assert.equal(original.weapons.flatMap(w=>w.modes).length,data.sourceCoverage.legacyFixedRows);
}
console.log(JSON.stringify({result:'PASS',models:ids.size,statuses:counts,deferred:data.summary.deferredByPlan,
  equipment:equipmentIds.size,modes:modeIds.size,parserCounts,blueGreenProhibited:prohibited,
  historicalRegistry:previous?'checked':'not available; current mode links checked',worldWrites:0,rolls:0},null,2));
