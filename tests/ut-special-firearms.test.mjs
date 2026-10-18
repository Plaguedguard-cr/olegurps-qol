import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CatalogService,CATALOG_DEFINITIONS} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {UT_CONVENTIONAL_MODES,UT_CONVENTIONAL_DEFERRED,UT_CONVENTIONAL_RULES,utConventionalFeed} from '../scripts/tools/ut-conventional-ammunition.js';
import {AutomaticAmmunitionProfileService} from '../scripts/tools/automatic-ammunition-profiles.js';
import {AttackProfileResolver,createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {parseRateOfFire,resolveMultipleProjectileFire} from '../scripts/tools/fire-service.js';
import {moduleText} from '../scripts/localization.js';
import {setAttackOverride,applyAttackOverride,parseAccuracyComponents} from '../scripts/tools/weapon-attack-overrides.js';
import {choiceGroupsHTML} from '../scripts/tools/ammunition-choices.js';
import {ammoText} from '../scripts/tools/ammo-management-localization.js';

globalThis.foundry={utils:{deepClone:structuredClone,randomID:()=>crypto.randomUUID()},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'gm',isGM:true},i18n:{lang:'ru',localize:k=>k},settings:{get:()=>null},messages:{contents:[]}};
const {ammunitionCandidates,availableAmmoTypes,displayedAmmoTypes,AmmoManagementApp,ammoManagementHTML}=await import('../scripts/tools/ammo-management-app.js');
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs);
const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
const resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic};
const api=globalThis.OleGURPSQOL;

async function fixture(modeId,{host=true}={}) {
  const flags={},writes=[];
  const actor={id:crypto.randomUUID(),isOwner:true,system:{attributes:{DX:{value:13}},ranged:{},skills:{}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),
    setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);writes.push([s,k]);},
    update:async changes=>{for(const [path,v] of Object.entries(changes)){assert.ok(path.startsWith('flags.'));const [,s,k]=path.split('.');flags[s]??={};if(k.startsWith('-='))delete flags[s][k.slice(2)];else flags[s][k]=structuredClone(v);}}};
  const before=structuredClone(actor.system),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);
  if(host&&modeId==='WkudgdqO3lymAYks5'){draft.setOverride(modeId,'bulk','-5');draft.setOverride(modeId,'st','10');draft.setOverride(modeId,'acc','2+0');}
  const record=await new StandaloneWeaponService(actor,catalogs).save(draft);
  const carrier=standaloneAmmoCarrier(record);
  await actor.setFlag('world','gurpsAmmoManager',{version:10,weapons:[carrier],governingSkills:{},attackOverrides:{}});
  const service=new AmmoService(actor),state=()=>actor.getFlag('world','gurpsAmmoManager');
  const weapon=()=>state().weapons[0],attack=()=>readStandaloneAttack(actor,record.id,modeId);
  const candidates=()=>ammunitionCandidates(actor,weapon(),api);
  const transaction=(op,args)=>service.inventoryTransaction(carrier.id,op,args,{allowedTypes:w=>ammunitionCandidates(actor,w,api)});
  const profile=()=>resolver.resolve({actorId:actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,state:state(),
    binding:standaloneCatalogBinding(attack(),catalogs),ammunition:service.readAttackAmmunition(carrier.id),profilePolicy:'permissive'});
  return {actor,before,writes,record,carrier,service,state,weapon,attack,candidates,transaction,profile};
}
async function load(fx,type,rounds=8) {
  await fx.transaction('add-stock',{ammoKey:type.key,amount:rounds});const id=fx.weapon().ammunitionInventory.installedId;
  await fx.transaction('load',{magazineId:id,ammoKey:type.key,amount:Math.min(rounds,fx.weapon().ammunitionInventory.magazines[0].capacity)});return id;
}
function nativeRuntime(actor){
  const messages=[];return {messages,runtime:{game:{user:game.user,settings:{get:()=>null}},
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},canvas:{tokens:{placeables:[]}},
    Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(_p,data)=>data.followon,
    ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async data=>{const m={...data,id:crypto.randomUUID(),
      async setFlag(s,k,v){this.flags??={};this.flags[s]??={};this.flags[s][k]=structuredClone(v);},getFlag(s,k){return this.flags?.[s]?.[k];}};messages.push(m);return m;}}}};
}
function shoot(fx,amount=1,{cancel=false,attackId=crypto.randomUUID()}={}){
  const {runtime}=nativeRuntime(fx.actor);
  return fx.service.executeShot({weaponId:fx.carrier.id,attackId,prepare:()=>({amount,profile:fx.profile()}),
    execute:cancel?async()=>({rolled:false}):({profile})=>executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,
      shotSnapshot:createShotSnapshot(profile,{attackId,resourceTiming:'after-attack'}),effectiveSkill:13,physicalShots:amount,
      effectiveRoF:amount*(profile.damage.rules.projectiles?.count??1),rcl:Number(profile.effective.rcl),consumeAction:false,runtime})});
}


import {UT_SPECIAL_MODES,UT_SPECIAL_RULES,reviewUTSpecial,utPayloadEditorHTML,utPayloadChatHTML} from '../scripts/tools/ut-special-ammunition.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {utPayloadParameters} from '../scripts/tools/ut-special-ammunition.js';
const escapePayload=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

test('batch editor is collapsed, compact and escaped under ru/en; optional fields have no provenance controls',()=>{
  const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_clp'};
  const p=automatic.prepare({modeId:'WIAo1otMCstnbi4Dv',base,variantId:'ut_biochemical_liquid',parameters:{savingThrow:'HT-2',description:'Line one\n</textarea><script>bad()</script>'}});
  for(const language of ['ru','en']){
    game.i18n.lang=language;const html=utPayloadEditorHTML(p.type,null,escapePayload);
    assert.match(html,/<details data-ut-payload[^>]*><summary>Содержимое партии<\/summary>/);assert.doesNotMatch(html,/<details[^>]*\bopen/);
    assert.match(html,/gam-payload-short-fields/);assert.match(html,/Спасбросок/);assert.match(html,/Краткое описание/);
    assert.match(html,/&lt;\/textarea&gt;&lt;script&gt;/);assert.doesNotMatch(html,/<script>|ut-radius-origin|Происхождение радиуса|Из книги|Вручную|Свободное описание|Эффекты вещества применяются вручную/);
    assert.match(utPayloadEditorHTML(p.type,null,escapePayload,{open:true}),/<details[^>]*\bopen/);
  }
  game.i18n.lang='ru';
});
test('OWNER batch text/radius edits, independent lots, reload, old snapshots and duplicate attack preserve resources',async()=>{
  const fx=await fixture('WIAo1otMCstnbi4Dv'),base=fx.candidates().find(t=>!t.recipe),modeId=fx.carrier.standaloneModeId;
  const prepare=parameters=>automatic.prepare({modeId,base,variantId:'ut_biochemical_liquid',parameters});
  game.user.isGM=false;
  try{
    const a=prepare({batchId:'text-A',note:'Filler A',savingThrow:'HT-4 <script>bad()</script>',description:'First line\nSecond <img onerror="bad()">',radius:{yards:7,units:'yards',origin:'reference'}});
    assert.equal(a.state,'complete');assert.equal(a.type.recipe.parameters.radius.origin,'manual');await fx.transaction('save-recipe',{type:a.type});await load(fx,a.type);
    const shot=await shoot(fx),old=JSON.stringify(shot.snapshot),total=fx.weapon().totalAmmo;
    assert.equal(shot.snapshot.profile.damage.rules.payload.savingThrow,a.type.recipe.parameters.savingThrow);
    assert.equal(shot.snapshot.profile.damage.rules.payload.description,a.type.recipe.parameters.description);
    assert.match(shot.message.content,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.match(shot.message.content,/First line\nSecond &lt;img/);
    assert.doesNotMatch(shot.message.content,/<script>|<img onerror|Происхождение радиуса|Из книги|Введён вручную/);
    const edit=prepare({batchId:'text-A',note:'Edited A',savingThrow:'',description:'',radius:{yards:null,units:'yards',origin:'manual'}});
    await fx.transaction('edit-recipe',{ammoKey:a.type.key,type:edit.type});assert.equal(fx.weapon().totalAmmo,total);assert.equal(fx.weapon().ammunitionInventory.stocks.length,1);
    const b=prepare({batchId:'text-B',note:'Filler B',savingThrow:'Quick Contest',description:'Other lot'});await fx.transaction('save-recipe',{type:b.type});await fx.transaction('add-stock',{ammoKey:b.type.key,amount:2});
    const mag=fx.weapon().ammunitionInventory.magazines[0];await assert.rejects(fx.transaction('load',{magazineId:mag.id,ammoKey:b.type.key,amount:1}),/MixedTypes/);
    await fx.actor.setFlag('world','gurpsAmmoManager',JSON.parse(JSON.stringify(fx.state())));
    const stocks=(await new AmmoService(fx.actor).loadState()).weapons[0].ammunitionInventory.stocks;
    assert.equal(stocks.find(s=>s.key===b.type.key).type.recipe.parameters.savingThrow,'Quick Contest');
    assert.equal(fx.profile().damage.rules.payload.radius.yards,null);assert.equal(fx.profile().damage.rules.payload.savingThrow,undefined);
    assert.doesNotMatch(utPayloadChatHTML(fx.profile(),escapePayload),/Спасбросок|Краткое описание/);
    await shoot(fx,1,{attackId:shot.snapshot.attackId});assert.equal(fx.weapon().totalAmmo,total+2);assert.equal(JSON.stringify(shot.snapshot),old);
    assert.deepEqual(fx.actor.system,fx.before);
  }finally{game.user.isGM=true;}
});
test('legacy batch identity remains valid; absent source radius stays absent; text is never executable data',()=>{
  for(const [modeId,ammoId]of [['WIAo1otMCstnbi4Dv','15mm_clp'],['W9chB7ydzOWTAxQP0','10mm_clp']]){
    const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId},variantId='ut_biochemical_aerosol';
    const old=automatic.prepare({modeId,base,variantId});assert.equal(old.state,'complete');
    assert.equal(automatic.prepare({modeId,base,variantId,savedType:JSON.parse(JSON.stringify(old.type))}).state,'complete');
    assert.equal(old.type.recipe.parameters.savingThrow,undefined);assert.equal(old.type.recipe.parameters.description,undefined);
    const review=reviewUTSpecial(catalogs,compatibility,modeId,base,variantId);
    for(const savingThrow of ['HT-2','HT','HT-4 против яда','Will-3','Quick Contest',''])assert.doesNotThrow(()=>utPayloadParameters(review,{savingThrow}));
    assert.throws(()=>utPayloadParameters(review,{description:{html:'no'}}),/UTPayloadInvalid/);
    if(ammoId==='10mm_clp'){assert.equal(review.facts.radius,null);assert.doesNotMatch(utPayloadEditorHTML(old.type,null,escapePayload),/name="ut-radius"/);}
  }
});
test('batch drafts and expansion survive refresh and switching; a late keystroke is captured before replacement',async()=>{
  const fx=await fixture('WIAo1otMCstnbi4Dv'),base=fx.candidates().find(t=>!t.recipe),modeId=fx.carrier.standaloneModeId;
  const a=automatic.prepare({modeId,base,variantId:'ut_biochemical_liquid',parameters:{batchId:'draft-A'}}).type;
  const b=automatic.prepare({modeId,base,variantId:'ut_biochemical_liquid',parameters:{batchId:'draft-B',note:'Saved B'}}).type;
  await fx.transaction('save-recipe',{type:a});await fx.transaction('save-recipe',{type:b});
  const app=Object.create(AmmoManagementApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),ui:{language:'ru',ammoKey:a.key},_closed:false});
  let values={note:'Unsaved A',savingThrow:'HT-2',description:'Line one\nLine two',radius:'7'},payload={dataset:{ammoKey:a.key},open:true},html;
  const content={};app.element={querySelector(selector){if(selector==='[data-ut-payload]')return payload;if(selector==='.window-content')return content;const name=selector.match(/name="ut-([^"]+)/)?.[1];const key=name==='saving-throw'?'savingThrow':name;return key in values?{value:values[key]}:null;}};
  app._prepareContext=async()=>({weapon:fx.weapon(),types:fx.candidates()});app._replaceHTML=s=>{html=s;};
  const render=app.refresh();values.description+=' latest';await render;assert.match(html,/Line two latest/);assert.match(html,/<details data-ut-payload[^>]*\bopen/);
  await app._onChange({target:{name:'inventoryAmmo',value:b.key}});assert.equal(app.ui.utPayloadDraft,null);assert.equal(app.ui.utPayloadOpen,false);
  payload={dataset:{ammoKey:b.key},open:true};values={note:'Unsaved B',savingThrow:'Will-3',description:'Other lot',radius:'2'};
  await app._onChange({target:{name:'inventoryAmmo',value:a.key}});assert.equal(app.ui.utPayloadDraft.note,'Unsaved A');assert.equal(app.ui.utPayloadDraft.description,'Line one\nLine two latest');assert.equal(app.ui.utPayloadDraft.radius.yards,7);assert.equal(app.ui.utPayloadOpen,true);
  payload={dataset:{ammoKey:a.key},open:false};values={note:'Unsaved A',savingThrow:'HT-2',description:'Line one\nLine two latest',radius:'7'};
  app._captureInputs();await app._onChange({target:{name:'inventoryAmmo',value:b.key}});assert.equal(app.ui.utPayloadDraft.note,'Unsaved B');assert.equal(app.ui.utPayloadDraft.savingThrow,'Will-3');
  // The outgoing DOM can still exist when an earlier async refresh completes.
  app._captureInputs();assert.equal(app.ui.utPayloadDraft.note,'Unsaved B');assert.equal(app.ui.utPayloadDraft.radius.yards,2);
  assert.equal(app._utPayloadDrafts.get(a.key).parameters.note,'Unsaved A');
});
for(const [modeId,family] of Object.entries(UT_SPECIAL_MODES)) {
  test('UT-2 physical platform '+modeId,async()=>{
    const fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe&&t.ammoId===family);
    assert.ok(base);
    assert.equal(base.unavailable,undefined);
    await load(fx,base);const result=await shoot(fx);
    assert.equal(result.spent,1);assert.equal(result.snapshot.profile.effective.damage,fx.attack().data.damage);
    assert.equal(result.snapshot.ammunition.sourceEdition,'Ultra-Tech 2007');
    assert.deepEqual(fx.actor.system,fx.before);
    if(modeId==='WGRshSOWjRXli8vBQ')assert.doesNotMatch(result.message.content,/familiarity|B cell/);
    if(modeId==='WTVT6tvGqOqE1N6e6')assert.doesNotMatch(result.message.content,/140 игл|солнечной|бесплатного пополнения/);
    if(family==='3mm_n')assert.notEqual(compatibility.checkCompatibility(modeId,'3mm_em',{book:'ut',kind:'ammo-family'}).status,'compatible');
  });
}
for(const modeId of [...Object.keys(UT_SPECIAL_MODES),...Object.keys(UT_CONVENTIONAL_MODES)])for(const variantId of Object.keys(UT_SPECIAL_RULES)) {
  const family=UT_SPECIAL_MODES[modeId]??UT_CONVENTIONAL_MODES[modeId];
  const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:family};
  const review=reviewUTSpecial(catalogs,compatibility,modeId,base,variantId);
  if(review.status!=='compatible')continue;
  test('UT-2 confirmed charge '+modeId+' '+variantId,async()=>{
    const fx=await fixture(modeId),p=automatic.prepare({modeId,base,variantId,parameters:{note:'Custom filler <A>'}});
    assert.equal(p.state,'complete');assert.ok(p.type);assert.equal(automatic.admission(p,{policy:'strict'}).allowed,true);
    await fx.transaction('save-recipe',{type:p.type});const type=fx.candidates().find(t=>t.key===p.type.key);
    assert.equal(type.unavailable,false);await load(fx,type);
    const result=await shoot(fx);assert.equal(result.spent,1);
    const profile=result.snapshot.profile;
    assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.damage.rules.payload.note,'Custom filler <A>');
    const html=result.message.content;assert.ok(html.includes('Custom filler &lt;A&gt;'));assert.ok(!/<details[^>]*\bopen/.test(html));
    if(UT_SPECIAL_RULES[variantId].instructionOnly){assert.equal(profile.effective.damage,null);assert.equal(profile.damage.formula,null);assert.ok(!html.includes('D:"'));}
    else assert.equal(profile.effective.damage,fx.attack().data.damage);
    const before=fx.weapon().totalAmmo;
    const duplicate=await shoot(fx,1,{attackId:result.snapshot.attackId});assert.ok(duplicate.duplicate);assert.equal(fx.weapon().totalAmmo,before);
    const serial=JSON.parse(JSON.stringify(result.snapshot));assert.deepEqual(serial.profile.damage,result.snapshot.profile.damage);
    assert.deepEqual(serial.profile.ammunition.recipe.parameters,p.type.recipe.parameters);
    if(variantId==='ut_biochemical_aerosol'&&review.facts.caliberMm===10){assert.equal(profile.damage.rules.faceOnly,true);assert.equal(profile.damage.rules.payload.radius,null);assert.ok(!html.includes('Радиус (ярды)'));}
    if(review.facts.radius)assert.deepEqual(profile.damage.rules.payload.radius,review.facts.radius);
    assert.deepEqual(fx.actor.system,fx.before);
  });
}
test('UT-2 owner: arbitrary/empty Note, radius override/removal, edit without duplicate or lost rounds; old snapshot immutable',async()=>{
  const fx=await fixture('WIAo1otMCstnbi4Dv'),base=fx.candidates().find(t=>!t.recipe),variantId='ut_biochemical_liquid';
  const prepare=parameters=>automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId,parameters});
  game.user.isGM=false;
  try {
    const a=prepare({note:'Unknown substance',batchId:'batch-A',radius:{yards:7,origin:'manual',units:'yards'}});
    assert.equal(a.state,'complete');await fx.transaction('save-recipe',{type:a.type});await load(fx,a.type);
    const result=await shoot(fx),old=JSON.stringify(result.snapshot),count=fx.weapon().ammunitionInventory.stocks.length,total=fx.weapon().totalAmmo;
    const b=prepare({note:'',batchId:'batch-A',radius:{yards:null,origin:'manual',units:'yards'}});
    assert.equal(b.state,'complete');await fx.transaction('edit-recipe',{ammoKey:a.type.key,type:b.type});
    assert.equal(fx.weapon().ammunitionInventory.stocks.length,count);assert.equal(fx.weapon().totalAmmo,total);
    assert.equal(fx.profile().damage.rules.payload.radius.yards,null);assert.equal(fx.profile().damage.rules.payload.note,'');
    assert.equal(JSON.stringify(result.snapshot),old);assert.equal(JSON.stringify(result.message.getFlag('olegurps-qol','shotSnapshot')),old);
    const c=prepare({note:'Other filler',batchId:'batch-B'});await fx.transaction('save-recipe',{type:c.type});await fx.transaction('add-stock',{ammoKey:c.type.key,amount:4});
    const installed=fx.weapon().ammunitionInventory.installedId;
    await assert.rejects(fx.transaction('load',{magazineId:installed,ammoKey:c.type.key,amount:1}),/MixedTypes/);
    const stockBefore=fx.weapon().ammunitionInventory.stocks.find(s=>s.key===b.type.key).rounds,rounds=fx.weapon().ammunitionInventory.magazines.find(m=>m.id===installed).rounds;
    await fx.transaction('unload',{magazineId:installed,amount:rounds});assert.equal(fx.weapon().ammunitionInventory.stocks.find(s=>s.key===b.type.key).rounds,stockBefore+rounds);
    await load(fx,c.type);assert.equal(fx.profile().damage.rules.payload.note,'Other filler');assert.equal(JSON.stringify(result.snapshot),old);
  } finally {game.user.isGM=true;}
});
test('UT-2 unsupported carrier/variant/radius cannot bypass physical compatibility',async()=>{
  const fx=await fixture('W9chB7ydzOWTAxQP0'),base=fx.candidates().find(t=>!t.recipe);
  assert.equal(automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_biochemical_liquid',parameters:{note:'Whatever'}}).type,null);
  assert.equal(automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_biochemical_aerosol',parameters:{radius:{yards:3,origin:'manual',units:'yards'}}}).type,null);
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_biochemical_aerosol'});
  const forged=structuredClone(p.type);forged.recipe.variantId='ut_biochemical_liquid';forged.key=ammoTypeKey(forged);
  await assert.rejects(fx.transaction('save-recipe',{type:forged}),/UTPayloadRequired/);
});
test('UT-2 RU UI under ru/en, no content approval controls or GCS Notes',()=>{
  const p=automatic.prepare({modeId:'WIAo1otMCstnbi4Dv',base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_clp'},variantId:'ut_biochemical_liquid'});
  for(const language of ['ru','en']) {
    game.i18n.lang=language;const html=utPayloadEditorHTML(p.type,null,v=>String(v).replaceAll('<','&lt;'));
    assert.ok(html.includes('Вещество (Note)'));assert.ok(html.includes('Радиус (ярды)'));assert.ok(!html.includes('approve-recipe'));assert.ok(!html.includes('GM'));assert.ok(!html.includes('???'));
  }
  game.i18n.lang='ru';
});
