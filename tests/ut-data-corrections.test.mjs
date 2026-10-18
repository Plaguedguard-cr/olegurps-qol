import {UT_ERRATA_MODES,applyUTErrataCatalog} from '../scripts/ut-errata.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CatalogService, CATALOG_DEFINITIONS } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { AttackProfileResolver, createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { executePreparedGgaRoll } from '../scripts/tools/prepared-gga-roll.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { moduleText } from '../scripts/localization.js';
import { requiresUTPowerAccounting } from '../scripts/ut-source-data.js';
globalThis.foundry = { utils: { deepClone: structuredClone, randomID: () => crypto.randomUUID() } };
globalThis.game = { user: { isGM: true }, i18n: { lang: 'ru' } };

const fixture = JSON.parse(await readFile(new URL('./fixtures/ut-2007-data-contract.json', import.meta.url), 'utf8'));
const raw = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([book, d]) =>
  [book, JSON.parse(await readFile(new URL('../data/catalogs/' + d.filename, import.meta.url), 'utf8'))])));
const load = async (data = raw) => {
  const c = new CatalogService({logger:null,fetcher:async url => ({ok:true,json:async () =>
    data[Object.keys(CATALOG_DEFINITIONS).find(b => url.endsWith(CATALOG_DEFINITIONS[b].filename))]})});
  await c.load(); return c;
};
const catalogs = await load(), compatibility = new AmmunitionCompatibilityService(catalogs);
const value = (object, path) => path.split('.').reduce((v,k) => v?.[k], object);
const modes = raw.weapons.equipment.flatMap(e => e.modes);

for (const [i, p] of fixture.patches.entries()) test('UT2007 source field ' + i + ': ' + p.mode_id + '/' + p.path, () => {
  const original = p.path === 'tech_level' ? raw.weapons.equipment.find(e => e.equipment_id === p.equipment_id) : modes.find(m => m.weapon_mode_id === p.mode_id);
  const current = p.path === 'tech_level' ? catalogs.getEquipment(p.equipment_id) : catalogs.getMode(p.mode_id);
  assert.deepEqual(value(original,p.path),p.previous);
  const approved=UT_ERRATA_MODES[p.mode_id]?.fields.find(f=>f[0]===p.path);
  assert.deepEqual(value(current,p.path),approved?approved[2]:p.corrected,p.source+' plus approved errata');
  assert.ok(catalogs.getMode(p.mode_id).ut_source_data.corrections.some(c => c.source === p.source));
});

test('all 122 audit entries reviewed; WT2014 replaces only incomplete Damage', () => {
  assert.equal(fixture.review.length,122);
  assert.deepEqual(fixture.review.reduce((n,r) => ({...n,[r.category]:(n[r.category]??0)+1}),{}),{B:25,D:4,C:26,A:67});
  assert.equal(catalogs.getMode('WkudgdqO3lymAYks5').raw_calc.damage,'4d+4 pi++');
  assert.equal(catalogs.getMode('Wjehd13gUuNCUaJCG').raw_calc.damage,'4d(10) burn, sur');
  assert.equal(catalogs.getMode('Wjehd13gUuNCUaJCG').stats.shots,'28(3)');
  assert.equal(catalogs.getMode('W4Cgkpefx8fSmFgmB').stats.shots,'50(5)');
  assert.equal(catalogs.getMode('Wkj-hXVqccdySMffW').stats.accuracy,'18');
  assert.equal(catalogs.getMode('Wc8n7l5aGm-_aywZc').stats.shots,'33(3)');
  assert.equal(catalogs.getMode('WOMuCBSS_c_nIstvm').ut_source_data.published_damage_supplement.source,'Weapon Tables11:pi++');
  assert.deepEqual(catalogs.getMode('WkudgdqO3lymAYks5').ut_source_data.host_inheritance.fields,['bulk','strength','sighting_bonuses']);
});

test('protected source bytes, IDs, GCS hashes, unrelated modes and HT/LT retained', async () => {
  const hashes={weapons:'f98687171a69b27ff46d89ab12d24b457375972de293fe482e881aceb63b5460',ut:'888dd25f46b43c8d51d7e81b529d616d84e1cde6591ffc0da5a5b9613d527ccc',ht:'435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385',lt:'2e520c12f437ca917ab87cf6322128ce2e4776f7abd7e1a547503681a0914cdd'};
  for(const [b,d]of Object.entries(CATALOG_DEFINITIONS)) {
    const bytes=await readFile(new URL('../data/catalogs/'+d.filename,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hashes[b]);
    assert.deepEqual(catalogs.getSourceCatalog(b),raw[b]);
  }
  assert.deepEqual(catalogs.getCatalog('weapons').sources,raw.weapons.sources);
  for(const e of raw.weapons.equipment) {
    const projected=catalogs.getRecord('weapons','equipment',e.equipment_id);
    assert.ok(projected);assert.deepEqual(projected.modes.map(m=>m.weapon_mode_id),e.modes.map(m=>m.weapon_mode_id));
    if(e.source!=='UT')assert.deepEqual(projected,e);
  }
  const projectedWarheads=structuredClone(catalogs.getCatalog('ut').warheads),swarm=projectedWarheads.find(w=>w.id==='swarm');
  assert.deepEqual(swarm.compatibility_decision,{revision:'ut-16-final-2026-10-18',sourceConflict:['UT152:25mm','UT156:40mm'],priority:'UT156',officialErratum:false});
  delete swarm.compatibility_decision;
  assert.deepEqual(projectedWarheads,applyUTErrataCatalog('ut',structuredClone(raw.ut)).warheads);
  assert.deepEqual(catalogs.getCatalog('ut').special_loads,raw.ut.special_loads);
  assert.deepEqual(catalogs.getCatalog('ht'),raw.ht);assert.deepEqual(catalogs.getCatalog('lt'),raw.lt);
  assert.throws(()=>{catalogs.getMode('WUT2007GaussPDW4mm').stats.shots='0';},TypeError);
});

test('two source identities and exactly two reverse links; implemented Gauss warheads retain individual gates', () => {
  for(const [mid,name,family,shots,cell,count]of [
    ['WUT2007GaussNeedler3mm','Gauss Needler, 3mm','3mm_em','100(3)','B',2],
    ['WUT2007GaussPDW4mm','Gauss PDW, 4mm','4mm_em','80(3)','C',1]]) {
    const m=catalogs.getMode(mid),e=catalogs.getEquipmentForMode(mid);
    assert.equal(e.name,name);assert.equal(e.tech_level,'10');assert.equal(m.stats.shots,shots);
    assert.equal(m.governing_skill.skill.specialization,'Submachine Gun');
    assert.equal(m.ut_source_data.power_requirement.cell_class,cell);assert.equal(m.ut_source_data.power_requirement.cells,count);
    assert.equal(compatibility.checkCompatibility(mid,family,{book:'ut',kind:'ammo-family'}).status,'compatible');
    assert.equal(compatibility.checkCompatibility(mid,family==='3mm_em'?'3mm_n':'10mm_clp',{book:'ut',kind:'ammo-family'}).status,'incompatible');
    assert.equal(compatibility.checkCompatibility(mid,'aphd',{book:'ut',availabilityTL:12}).status,'compatible');
  }
  assert.equal(catalogs.getStatus('ut').relationships.forward,87);
  assert.equal(catalogs.getStatus('ut').relationships.linkedModes,81);
  for(const family of raw.ut.ammo_families)for(const link of family.linked_weapon_modes)
    assert.ok(catalogs.getAmmoFamily('ut',family.id).linked_weapon_modes.some(l=>l.equipment_id===link.equipment_id&&l.weapon_mode_id===link.weapon_mode_id));
});

test('approved HMG/Minigun and coilgun APDS decisions retain contradictions and other source gates', () => {
  assert.equal(compatibility.checkCompatibility('WbvkCgoaLuWViWyKK','7mm_em',{book:'ut',kind:'ammo-family'}).status,'compatible');
  assert.equal(compatibility.checkCompatibility('WbvkCgoaLuWViWyKK','4mm_em',{book:'ut',kind:'ammo-family'}).status,'incompatible');
  assert.equal(compatibility.checkCompatibility('WJstukbcBFPxQFtJE','4mm_em',{book:'ut',kind:'ammo-family'}).status,'compatible');
  assert.equal(compatibility.checkCompatibility('WegCPnwG-HS41cU29','apds',{book:'ut',availabilityTL:12}).status,'compatible');
  assert.match(catalogs.getMode('WbvkCgoaLuWViWyKK').ut_gauss.conflict,/4mm\/4000/);
  assert.match(catalogs.getMode('WJstukbcBFPxQFtJE').ut_gauss.conflict,/TL9/);
  assert.equal(compatibility.checkCompatibility('WgqAB3QGTUZrgtdES','expendable_jammer',{book:'ut',availabilityTL:12}).status,'undetermined');
  assert.equal(compatibility.checkCompatibility('WgqAB3QGTUZrgtdES','swarm',{book:'ut',availabilityTL:12}).status,'incompatible');
  assert.equal(catalogs.getEquipment('eFE5ZegbEyhGzw3uq').tech_level,'11');
});

function actorFixture() {
  const flags={world:{gurpsAmmoManager:{version:10,weapons:[],shotReceipts:{past:{damage:'old'}}}}};
  const actor={id:'temporary-test',isOwner:true,system:{ranged:{'00000':{name:'custom GCS',damage:'8d pi+',rof:'3',acc:'9',range:'1/2',shots:'100'}},skills:{},equipment:{}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};
  return {actor,flags};
}
test('existing definitions/overrides/stock/snapshots preserved; explicit upgrade changes only baseline', async () => {
  const {actor,flags}=actorFixture(),service=new StandaloneWeaponService(actor,catalogs);
  const oldEquipment=raw.weapons.equipment.find(e=>e.equipment_id==='eCOQaE4DsVSKPPPGQ');
  const oldCatalogs={...catalogs,getCatalog:()=>raw.weapons,getEquipment:()=>oldEquipment};
  const draft=new StandaloneWeaponDraft({catalogs:oldCatalogs,type:'ranged'});draft.selectModel(oldEquipment.equipment_id);
  draft.setOverride('WmiUP8hzgsvbFNy4_','acc','15');const saved=await service.save(draft);
  flags.world.gurpsAmmoManager.weapons.push({id:saved.id,standaloneWeaponId:saved.id,standaloneModeId:'WmiUP8hzgsvbFNy4_',
    magazines:[60],loadedIndex:0,totalAmmo:77,capacity:100,
    ammunitionInventory:{version:1,installedId:'old-mag',stocks:[{key:'old',type:{source:'legacy',name:'preserved'},rounds:17}],
      magazines:[{id:'old-mag',weaponId:saved.id,capacity:100,rounds:60,ammoKey:'old'}]}});
  const system=structuredClone(actor.system),originalAmmo=structuredClone(flags.world);
  const reopen=new StandaloneWeaponDraft({catalogs,type:'ranged',existing:saved});const unchanged=await service.save(reopen);
  assert.deepEqual(unchanged.modes,saved.modes);assert.equal(unchanged.modes[0].snapshot.stats.shots,'100(3)');
  const snapshot=createShotSnapshot({version:1,raw:{damage:'3d(3) pi-'},effective:{shots:'100(3)'},ammunition:{},resource:{magazineId:'historical-mag'}},{attackId:'old'});
  const frozen=structuredClone(snapshot);
  const upgrade=new StandaloneWeaponDraft({catalogs,type:'ranged',existing:unchanged});assert.equal(upgrade.refreshCatalogData(),true);
  const next=await service.save(upgrade);assert.equal(next.modes[0].snapshot.stats.shots,'40(3)');assert.equal(next.modes[0].overrides.acc,'15');
  assert.deepEqual(actor.system,system);assert.deepEqual(flags.world,originalAmmo);assert.deepEqual(snapshot,frozen);
  assert.match(readStandaloneAttack(actor,next.id).readinessReason,/батарею/);
});

test('power requirement blocks native roll before callbacks or ammunition writes, even with saved rounds/approval', async () => {
  const {actor,flags}=actorFixture();flags.world.gurpsAmmoManager.weapons.push({id:'weapon',capacity:100,magazines:[40],loadedIndex:0,totalAmmo:40,ammoType:'saved'});
  const state=structuredClone(flags),system=structuredClone(actor.system),ammo=new AmmoService(actor);
  const resolver=new AttackProfileResolver({catalogs,compatibility});
  const binding={status:'confirmed',binding:{confirmed:true,modeId:'WUT2007GaussNeedler3mm',equipmentId:'eUT2007GaussNeedler3mm'}};
  const rawAttack={damage:'8d pi+',rof:'12',acc:'9',shots:'100',range:'1/2'};
  const profile=resolver.resolve({actorId:actor.id,weaponId:'weapon',rawAttack,binding,state:flags.world.gurpsAmmoManager,
    context:{powerReady:true,energyAccountingImplemented:true},approval:{active:true},profilePolicy:'permissive',
    ammunition:{kind:'legacy',legacyIndex:0,available:40,total:40,ammoKey:'saved',type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'3mm_em'}}});
  assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.weaponConfiguration.variant,'gauss');
  assert.equal(profile.raw.damage,'8d pi+');assert.equal(profile.effective.shots,'100');
  let nativeCalls=0;
  await assert.rejects(ammo.executeShot({weaponId:'weapon',attackId:'power-block',prepare:()=>({amount:1,profile}),
    execute:prepared=>executePreparedGgaRoll({actor,attackProfile:prepared.profile,runtime:{Roll:{create:()=>{nativeCalls++;}}}})}),/физического снаряда/);
  assert.equal(nativeCalls,0);assert.deepEqual(flags,state);assert.deepEqual(actor.system,system);
  assert.equal(requiresUTPowerAccounting('W27s4Lm8QlkKVKUPn'),false);
  assert.equal(requiresUTPowerAccounting('WngbnzWRwLntvaRbR'),false);
});

for(const lang of ['ru','en'])test('Russian power-readiness message with Foundry '+lang,async()=>{
  globalThis.game={user:{isGM:true},i18n:{lang,localize:key=>key}};
  assert.match(moduleText('OleGURPS.AttackProfile.UTPowerAccountingRequired'),/снаряды и питание/);
  const dictionary=JSON.parse(await readFile(new URL('../lang/'+lang+'.json',import.meta.url),'utf8'));
  assert.ok(dictionary['OleGURPS.AttackProfile.UTPowerAccountingRequired']);
  for(const key of ['SourceConflict','VariantsPending','APDSGaussConflict','JammerRadiusMissing']) {
    assert.ok(dictionary['OleGURPS.UTData.'+key]);
    assert.match(moduleText('OleGURPS.UTData.'+key),/[\u0400-\u04ff]/u);
  }
});
