import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,catalogs,automatic} from './helpers/ut-ammunition-fixture.mjs';
import {CatalogService} from '../scripts/catalog-service.js';
import {correctHTMode} from '../scripts/ht-physical-ammunition-evidence.js';
import {correctedHTLabel} from '../scripts/ht-source-corrections.js';
import {searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {AmmoManagementApp,displayedAmmoTypes} from '../scripts/tools/ammo-management-app.js';
import {isAmmunitionHistoryOnlyUpdate} from '../scripts/tools/weapon-assistant-app.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {MeleeAssistantApp} from '../scripts/tools/melee-assistant-app.js';
import {standaloneValueRecorder} from '../scripts/tools/fire-control.js';

test('all effective equipment and mode views preserve corrections and reuse immutable values',()=>{
  for(const original of catalogs.getCatalog('weapons').equipment){
    const equipment=correctedHTLabel(original,'weapon');
    const expected={...equipment,modes:equipment.modes.map(m=>correctHTMode(m,equipment))};
    const actual=catalogs.getEquipment(original.equipment_id);
    assert.deepEqual(actual,expected,original.equipment_id);
    assert.equal(catalogs.getEquipment(original.equipment_id),actual);
    assert.ok(Object.isFrozen(actual));assert.ok(Object.isFrozen(actual.modes));
    for(const m of actual.modes){
      assert.equal(catalogs.getMode(m.weapon_mode_id),m);
      assert.ok(Object.isFrozen(m));
      const links=catalogs.getModeLinks(m.weapon_mode_id);
      if(links)assert.equal(catalogs.getModeLinks(m.weapon_mode_id),links);
    }
  }
  for(let i=0;i<10000;i++){
    assert.equal(catalogs.getEquipment('unknown-'+i),null);
    assert.equal(catalogs.getMode('unknown-'+i),null);
    assert.equal(catalogs.getModeLinks('unknown-'+i),null);
  }
});

test('indexed searches preserve IDs and order for every source, type, Unicode and empty queries',()=>{
  const normalize=v=>String(v??'').trim().normalize('NFKC').toLowerCase().replace(/\u00d7/g,'x');
  for(const type of ['ranged','melee','effect','missing'])for(const source of ['','HT','UT','LT','missing'])
    for(const q of ['', '  ', 'rifle', 'Ｃｏｌｔ', 'LASER', '12G', '2\u00d79', 'gauss rifle','not-a-model']){
      const terms=normalize(q).split(/\s+/).filter(Boolean);
      const expected=catalogs.getCatalog('weapons').equipment.filter(e=>(!source||e.source===source)&&
        e.modes.some(m=>m.combat_type===type&&m.role==='attack'&&!m.hidden)&&
        terms.every(t=>normalize([e.name,e.source,e.reference].join(' ')).includes(t)));
      assert.deepEqual(searchStandaloneModels(catalogs,type,q,source),expected);
    }
  const first=searchStandaloneModels(catalogs,'ranged');first.length=0;
  assert.ok(searchStandaloneModels(catalogs,'ranged').length>0);
});

test('replacement and mutable catalog searches stay fresh; unavailable data is not cached',()=>{
  assert.deepEqual(searchStandaloneModels(new CatalogService({logger:null}),'ranged'),[]);
  let catalog=null;const api={getCatalog:()=>catalog};
  assert.deepEqual(searchStandaloneModels(api,'ranged'),[]);
  catalog={equipment:[{name:'first',modes:[{combat_type:'ranged',role:'attack'}]}]};
  assert.equal(searchStandaloneModels(api,'ranged','first').length,1);
  catalog.equipment[0].name='second';assert.equal(searchStandaloneModels(api,'ranged','second').length,1);
  catalog=Object.freeze({equipment:[{name:'third',modes:[{combat_type:'ranged',role:'attack'}]}]});
  assert.equal(searchStandaloneModels(api,'ranged','second').length,0);
  assert.equal(searchStandaloneModels(api,'ranged','third').length,1);
  // A third-party loader can freeze only its outer wrapper. Its nested data
  // remains mutable and must not be mistaken for CatalogService's deep freeze.
  catalog.equipment[0].name='fourth';
  assert.equal(searchStandaloneModels(api,'ranged','fourth').length,1);
});

const receipt={_id:'actor',_stats:{modifiedTime:2},flags:{world:{gurpsAmmoManager:{shotReceipts:{a:{amount:1}}}}}};
test('history filter skips only receipt leaves, preserving every gameplay and permission invalidation',()=>{
  assert.equal(isAmmunitionHistoryOnlyUpdate(receipt),true);
  assert.equal(isAmmunitionHistoryOnlyUpdate({flags:{world:{gurpsAmmoManager:{'-=shotReceipts':null}}}}),true);
  for(const changes of [null,{}, {flags:{world:{gurpsAmmoManager:{}}}},
    {...receipt,ownership:{default:0}}, {...receipt,system:{skills:{}}},
    {flags:{world:{gurpsAmmoManager:{weapons:[],shotReceipts:{}}}}},
    {flags:{world:{gurpsAmmoManager:{campaignTL:9}}}},
    {flags:{world:{'-=gurpsAmmoManager':null}}},
    {flags:{'olegurps-qol':{standaloneWeapons:{}}}},
    {'flags.world.gurpsAmmoManager.shotReceipts':{}}])assert.equal(isAmmunitionHistoryOnlyUpdate(changes),false);
  for(const Class of [FirePreparationApp,MeleeAssistantApp]){
    const app={actor:{id:'actor'},_captureFields:()=>assert.fail('Receipt captured fields'),render:()=>assert.fail('Receipt rendered')};
    Class.prototype._onActorUpdate.call(app,{id:'actor'},receipt);
  }
});

test('payload capture reuses displayed defaults, preserves manual fields and refreshes after Actor changes',async()=>{
  const f=await fixture('W9chB7ydzOWTAxQP0');
  const app=new AmmoManagementApp({actor:f.actor,weaponId:f.carrier.id});
  await app._prepareContext();
  const type=displayedAmmoTypes(f.actor,f.weapon()).find(t=>t.recipe?.variantId==='ut_biochemical_aerosol'&&!t.unavailable);
  assert.ok(type);app.ui.ammoKey=type.key;
  app.ui.utPayloadDraft={...type.recipe.parameters,radius:{yards:1,origin:'reference',source:'UT153'}};
  const values={'ut-note':'owner note','ut-saving-throw':'HT-2','ut-description':'owner description','ut-radius':'2'};
  app.element={querySelector:selector=>selector==='[data-ut-payload]'?{dataset:{ammoKey:type.key},open:true}:
    selector.startsWith('[name="')&&Object.hasOwn(values,selector.slice(7,-2))?{value:values[selector.slice(7,-2)]}:null};
  const original=automatic.prepare;let calls=0;
  automatic.prepare=function(...args){calls++;return original.apply(this,args);};
  try{
    for(let i=0;i<100;i++)app._captureInputs();
    assert.equal(calls,0);assert.equal(app.ui.utPayloadDraft.note,'owner note');
    assert.equal(app.ui.utPayloadDraft.savingThrow,'HT-2');assert.equal(app.ui.utPayloadDraft.description,'owner description');
    assert.equal(app.ui.utPayloadDraft.radius.yards,2);
    const previous=app._displayedTypes;await app._prepareContext();
    assert.notEqual(app._displayedTypes,previous);assert.ok(calls>0);
  }finally{automatic.prepare=original;}
});

test('Fire Control captures and unchanged close never save; real edits and reverting a value still flush',()=>{
  const writes=[],remember=standaloneValueRecorder(null,(values,options)=>writes.push({values,options}));
  for(let i=0;i<100;i++)remember({skillLevel:'',shotgun:false});
  remember({skillLevel:''},{immediate:true});assert.equal(writes.length,0);
  remember({skillLevel:'13'});remember({skillLevel:'13'});assert.equal(writes.length,1);
  remember({skillLevel:''});assert.equal(writes.length,2);
  remember({skillLevel:''},{immediate:true});assert.equal(writes.length,3);assert.equal(writes.at(-1).options.immediate,true);
  const reopened=standaloneValueRecorder({skillLevel:'14'},()=>assert.fail('unchanged preferences saved'));
  reopened({skillLevel:'14'});reopened({skillLevel:'14'},{immediate:true});
});
