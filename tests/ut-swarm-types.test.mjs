import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,load,shoot,catalogs,automatic,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {UT_SWARM_TYPES} from '../scripts/ut-swarm-source.js';
import {utPayloadEditorHTML} from '../scripts/tools/ut-special-ammunition.js';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {AmmoManagementApp} from '../scripts/tools/ammo-management-app.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';

const carriers=[['WdV0VzMAch5j8pxdy',40,1],['WInB0nYjRLMJm5Ha-',64,4],['WOMuCBSS_c_nIstvm',100,16]];
const prepare=(fx,parameters={},savedType)=>automatic.prepare({modeId:fx.carrier.standaloneModeId,
  base:fx.candidates().find(t=>!t.recipe&&!t.unavailable),variantId:'ut_swarm',parameters,savedType});

for(const [id,caliber,capacity]of carriers)for(const swarm of Object.values(UT_SWARM_TYPES))
test(`${caliber}mm Swarm / ${swarm.name}: physical lot, optional Note, manual profile, concise chat and frozen history`,async()=>{
  const fx=await fixture(id),system=JSON.stringify(fx.actor.system),parameters={availabilityTL:12,swarmType:swarm.id,
    note:swarm.id==='sentry'?'':'Личная партия <'+swarm.id+'>',batchId:'batch-'+swarm.id};
  const prepared=prepare(fx,parameters);assert.equal(prepared.state,'complete',prepared.reasons);
  assert.equal(prepared.type.recipe.parameters.swarmType,swarm.id);assert.equal(prepared.type.recipe.parameters.note,parameters.note);
  assert.equal(parseInt(prepared.facts.row.capacity),capacity);assert.match(prepared.type.name,new RegExp(swarm.name));
  await fx.transaction('save-recipe',{type:prepared.type});await load(fx,prepared.type,2);
  const before=fx.weapon().totalAmmo,result=await shoot(fx),snapshot=result.snapshot,profile=snapshot.profile;
  assert.equal(result.rolled,true);assert.equal(result.spent,1);assert.equal(fx.weapon().totalAmmo,before-1);
  assert.equal(profile.damage.formula,null);assert.deepEqual(profile.damage.components.filter(c=>c.role!=='backblast'),[]);assert.equal(profile.damage.rules.instructionOnly,true);
  if(caliber===64)assert.deepEqual(profile.damage.components.map(c=>[c.role,c.formula]),[['backblast','2d burn']]);
  assert.equal(profile.ammunition.recipe.parameters.swarmType,swarm.id);assert.equal(profile.damage.rules.payload.swarmType,swarm.id);
  const data=ammunitionChatData(profile),html=ammunitionChatHTML(profile,escapePayload);
  assert.ok(data.lines.length<=3);assert.ok(data.lines.join(' ').length<400);assert.match(html,new RegExp(swarm.name));
  assert.match(html,/Воздействие — вручную/);assert.match(html,new RegExp(swarm.source));assert.match(html,/UT156/);
  assert.doesNotMatch(html,/B461|Swarm Controller|батаре|реализ|<script|<details[^>]*\bopen/);
  if(parameters.note)assert.match(html,new RegExp(escapePayload(parameters.note)));
  else assert.ok(!data.fields.some(f=>f.label==='Note'));
  assert.equal(JSON.stringify(fx.actor.system),system);
  const frozen=JSON.stringify(snapshot),other=prepare(fx,{availabilityTL:12,swarmType:'stinger',note:'Другая партия',batchId:'other'});
  await fx.transaction('save-recipe',{type:other.type});assert.notEqual(prepared.type.key,other.type.key);
  const saved=fx.weapon().ammunitionInventory.stocks.find(s=>s.key===prepared.type.key).type;
  assert.equal(saved.recipe.parameters.note,parameters.note);assert.equal(saved.recipe.parameters.swarmType,swarm.id);
  assert.equal(JSON.stringify(snapshot),frozen);
  const unchanged=JSON.stringify(fx.state());await shoot(fx,1,{attackId:snapshot.attackId});assert.equal(JSON.stringify(fx.state()),unchanged);
});

test('legacy Swarm has no subtype migration or new recipe identity; empty choice stays optional',async()=>{
  const fx=await fixture(carriers[1][0]),legacy=prepare(fx,{note:'Старый Swarm'});
  assert.equal(legacy.state,'complete');assert.ok(!Object.hasOwn(legacy.type.recipe.parameters,'swarmType'));
  const saved=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:legacy.type,variantId:'ut_swarm',savedType:legacy.type});
  assert.equal(saved.state,'complete');assert.deepEqual(saved.type,legacy.type);
  assert.deepEqual(prepare(fx,{note:'Старый Swarm',swarmType:''}).type,legacy.type);
  await fx.transaction('save-recipe',{type:legacy.type});await load(fx,legacy.type,1);
  const result=await shoot(fx);assert.equal(result.spent,1);assert.equal(result.snapshot.profile.damage.formula,null);
  assert.ok(!Object.hasOwn(result.snapshot.profile.damage.rules.payload,'swarmType'));
});

test('Swarm selection retains 40mm minimum, exact capacities and individual subtype TL',async()=>{
  assert.equal(Object.keys(UT_SWARM_TYPES).length,9);
  const fx=await fixture(carriers[1][0]);
  for(const invalid of ['unknown','__proto__',7,{},false,['devourer'],'Devourer Swarm'])assert.notEqual(prepare(fx,{availabilityTL:12,swarmType:invalid}).state,'complete');
  for(const [id,tl]of [['cannibal',12],['disassembler',11],['defoliator',10],['pesticide',10]]){
    assert.notEqual(prepare(fx,{availabilityTL:tl-1,swarmType:id}).state,'complete');
    assert.equal(prepare(fx,{availabilityTL:tl,swarmType:id}).state,'complete');
  }
  const small=await fixture('WSv_Zh3pW3Tl-tCf5');
  for(const swarmType of [undefined,...Object.keys(UT_SWARM_TYPES)])assert.notEqual(prepare(small,{availabilityTL:12,swarmType}).state,'complete');
  const source=prepare(fx,{availabilityTL:12,swarmType:'devourer'}),facts=structuredClone(source.facts);
  facts.payload.swarmType='unknown';
  assert.equal(resolveAmmunitionEffects({raw:fx.attack().data,variantId:'ut_swarm',baseStatus:'compatible',constructionStatus:'compatible',facts}).nativeSafe,false);
});
test('UT87 ecobots retain individual source, TL10/11, manual targets and pricing discrepancy',()=>{
 const d=UT_SWARM_TYPES.defoliator,p=UT_SWARM_TYPES.pesticide;
 for(const s of [d,p]){assert.equal(s.source,'UT87');assert.deepEqual(s.versions,[10,11]);assert.equal(s.lc,3);assert.equal(s.costPerSquareYard,1000);assert.equal(s.priceSource,'UT37');}
 assert.match(d.brief,/1 yd²\/10 с/);assert.match(d.brief,/1 yd²\/мин/);assert.equal(d.proseCostPerSquareYard,1500);assert.ok(d.priceConflict);
 assert.match(p.brief,/реальные рои насекомых: 1d cor/);assert.match(p.brief,/Без вреда людям/);assert.match(p.brief,/не применяется к машинам и microbot/);
});

test('existing payload editor captures subtype beside independent Note; ru/en remain Russian',async()=>{
  const fx=await fixture(carriers[1][0]),prepared=prepare(fx,{availabilityTL:12,swarmType:'devourer',note:'Личная Note'});
  for(const language of ['ru','en']){
    game.i18n.lang=language;const html=utPayloadEditorHTML(prepared.type,null,escapePayload);
    assert.match(html,/Тип роя/);assert.match(html,/name="ut-swarmType"/);assert.match(html,/name="ut-note"/);
    for(const s of Object.values(UT_SWARM_TYPES))assert.match(html,new RegExp('value="'+s.id+'"'));
    assert.match(html,/value="devourer" selected/);assert.match(html,/value="Личная Note"/);
  }
  const app=Object.create(AmmoManagementApp.prototype),root={querySelector:selector=>({
    '[data-ut-payload]':{dataset:{ammoKey:prepared.type.key},open:true},'[name="ut-swarmType"]':{value:'stinger'},
    '[name="ut-note"]':{value:'Партия B'},'[name="ut-availabilityTL"]':{value:'12'}
  })[selector]??null};
  Object.defineProperty(app,'element',{value:root});app.ui={ammoKey:prepared.type.key};app._displayedTypes=new Map([[prepared.type.key,prepared.type]]);
  app._captureInputs();assert.equal(app.ui.utPayloadDraft.swarmType,'stinger');assert.equal(app.ui.utPayloadDraft.note,'Партия B');
  assert.equal(prepared.type.recipe.parameters.note,'Личная Note');assert.equal(prepared.type.recipe.parameters.swarmType,'devourer');
});

test('Homing with existing Swarm warhead preserves subtype and Note without adding swarm damage',async()=>{
  const fx=await fixture(carriers[2][0]),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
  const p=automatic.prepare({modeId:carriers[2][0],base,variantId:'ut_homing',parameters:{availabilityTL:12,homingGuidance:'infrared',warheadVariant:'ut_swarm',swarmType:'cannibal',note:'Роботы'}});
  assert.equal(p.state,'complete',p.reasons);assert.equal(p.type.recipe.parameters.swarmType,'cannibal');
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type,1);
  assert.equal(fx.profile().damage.formula,null);assert.deepEqual(fx.profile().damage.components,[]);
  assert.equal(fx.profile().damage.rules.payload.swarmType,'cannibal');assert.match(ammunitionChatHTML(fx.profile(),escapePayload),/Cannibal Swarm/);
});
