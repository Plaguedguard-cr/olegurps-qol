import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {PAINT_CARBINE_MODE as modeId,paintBattery,paintBatteryHTML,paintPowerReason,newPaintBattery} from '../scripts/tools/ut-paint-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {WeaponAssistantApp} from '../scripts/tools/weapon-assistant-app.js';
import {openAmmoManager} from '../scripts/tools/ammo.js';
import {utPayloadEditorHTML} from '../scripts/tools/ut-special-ammunition.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {RangedTechniquesApp} from '../scripts/tools/ranged-techniques-app.js';
import {getRangedTechniqueRows} from '../scripts/tools/ranged-techniques-registry.js';
import {resolveCloseHipShooting} from '../scripts/tools/close-hip-shooting-service.js';

const ready=async()=>{const fx=await fixture(modeId);await load(fx,fx.candidates().find(t=>!t.recipe));return fx;};
const charge=async(fx,value)=>{const state=fx.state();state.weapons[0].paintBattery.charge=value;await fx.actor.setFlag('world','gurpsAmmoManager',state);};

test('new Paint Carbine has installed B cell 500/500 and a separate 51-round physical feed',async()=>{
  const fx=await fixture(modeId);assert.deepEqual(fx.weapon().paintBattery,newPaintBattery());
  assert.equal(fx.weapon().capacity,51);assert.equal(fx.weapon().totalAmmo,0);assert.equal(fx.weapon().magazines.length,1);
});
for(const value of [0,1,49,50,499])test('saved B cell survives load/open and stale configuration: '+value,async()=>{
  const fx=await fixture(modeId),stale=fx.state();await charge(fx,value);
  assert.equal((await new AmmoService(fx.actor).loadState()).weapons[0].paintBattery.charge,value);
  await fx.service.saveState(stale);assert.equal(fx.weapon().paintBattery.charge,value);
  await fx.transaction('initialize',{});assert.equal(fx.weapon().paintBattery.charge,value);
});
test('an old carrier without saved battery is preserved and cannot receive free power by opening',async()=>{
  const fx=await fixture(modeId),s=fx.state();delete s.weapons[0].paintBattery;await fx.actor.setFlag('world','gurpsAmmoManager',s);
  await fx.service.loadState();assert.equal(fx.weapon().paintBattery,undefined);assert.match(fx.attack().readinessReason,/сохранённое состояние/);
});
test('successful physical shots atomically spend both resources and freeze numeric energy evidence',async()=>{
  const fx=await ready(),result=await shoot(fx,3);
  assert.equal(result.spent,3);assert.equal(fx.weapon().totalAmmo,5);assert.equal(fx.weapon().paintBattery.charge,497);
  assert.deepEqual(result.snapshot.profile.resource.power,{type:'B',capacity:500,before:500,after:497,spent:3,physicalShots:3,source:'UT139-140',accounting:'module-10x50'});
  const saved=JSON.stringify(result.snapshot);await charge(fx,0);await fx.service.loadState();assert.equal(JSON.stringify(result.snapshot),saved);
  assert.doesNotMatch(result.message.content,/B cell|батаре|питани/i);
});
test('same attack receipt is idempotent, including after a new service instance',async()=>{
  const fx=await ready(),r=await shoot(fx);await shoot(fx,1,{attackId:r.snapshot.attackId});
  const duplicate=await new AmmoService(fx.actor).executeShot({weaponId:fx.carrier.id,attackId:r.snapshot.attackId,prepare:()=>assert.fail('must not prepare'),execute:()=>assert.fail('must not roll')});
  assert.equal(duplicate.duplicate,true);assert.equal(fx.weapon().paintBattery.charge,499);assert.equal(fx.weapon().totalAmmo,7);
});
for(const value of [0,1])test('insufficient battery rejects before callback without either resource changing: '+value,async()=>{
  const fx=await ready();await charge(fx,value);const before=JSON.stringify(fx.state());let called=false;
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({amount:2,profile:fx.profile()}),execute:()=>{called=true;}}),/Батарея|Недостаточно заряда/);
  assert.equal(called,false);assert.equal(JSON.stringify(fx.state()),before);
});
test('insufficient ammunition does not spend B cell',async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());await assert.rejects(shoot(fx,9),/InsufficientRounds/);assert.equal(JSON.stringify(fx.state()),before);
});
test('cancelled and failed native executions spend neither resource',async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());await shoot(fx,1,{cancel:true});
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:fx.profile()}),execute:()=>{throw Error('native failure');}}),/native failure/);
  assert.equal(JSON.stringify(fx.state()),before);
});
test('two queued shots cannot overdraw the last B cell unit',async()=>{
  const fx=await ready();await charge(fx,1);const r=await Promise.allSettled([shoot(fx),shoot(fx)]);
  assert.equal(r.filter(v=>v.status==='fulfilled').length,1);assert.equal(fx.weapon().paintBattery.charge,0);assert.equal(fx.weapon().totalAmmo,7);
});
test('deferred burst consumes its whole physical allocation and B cell once at completion',async()=>{
  const fx=await ready(),state=fx.state();state.sprayingFireSessions={test:{ammoConsumed:false}};await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const result=await fx.service.executeShot({weaponId:fx.carrier.id,attackId:'deferred-paint',deferConsumption:true,sessionKey:'test',prepare:()=>({amount:3,profile:fx.profile({physicalShots:1})}),execute:async()=>({rolled:true,message:{id:'burst'}})});
  assert.equal(result.spent,0);assert.equal(fx.weapon().paintBattery.charge,500);assert.equal(fx.weapon().totalAmmo,8);
  const current=fx.state();assert.equal(await fx.service.consumeLoadedRounds(current,current.weapons[0],3,{sessionKey:'test',expectedResource:result.profile.resource}),3);
  assert.equal(fx.weapon().paintBattery.charge,497);assert.equal(fx.weapon().totalAmmo,5);assert.equal(fx.state().sprayingFireSessions.test.powerReceipt.spent,3);
  await assert.rejects(fx.transaction('consume',{amount:3,magazineId:fx.weapon().ammunitionInventory.installedId,sessionKey:'test'}),/InsufficientRounds/);
  assert.equal(fx.weapon().paintBattery.charge,497);
});
test('a depleted cell rejects deferred completion atomically while loading and unloading remain available',async()=>{
  const fx=await ready();await charge(fx,0);const state=fx.state();state.sprayingFireSessions={test:{ammoConsumed:false}};await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const before=JSON.stringify(fx.state());await assert.rejects(fx.transaction('consume',{amount:1,magazineId:fx.weapon().ammunitionInventory.installedId,sessionKey:'test'}),/Батарея разряжена/);assert.equal(JSON.stringify(fx.state()),before);
  const id=fx.weapon().ammunitionInventory.installedId,key=fx.weapon().ammunitionInventory.magazines[0].ammoKey;
  await fx.transaction('unload',{magazineId:id,amount:2});await fx.transaction('load',{magazineId:id,ammoKey:key,amount:2});assert.equal(fx.weapon().totalAmmo,8);assert.equal(fx.weapon().paintBattery.charge,0);
});
test('manual battery spend validates numbers and cannot create energy',async()=>{
  const fx=await fixture(modeId),before=JSON.stringify(fx.state());
  for(const value of [-1,0,0.5,501,Infinity,NaN])await assert.rejects(fx.service.spendPaintCharge(fx.carrier.id,value));
  assert.equal(JSON.stringify(fx.state()),before);
});
test('FireService and the prepared native roll reject depleted power before execution',async()=>{
  const fx=await ready(),profile=fx.profile();await charge(fx,0);let calls=0;
  const fire=new FireService({actor:fx.actor,preparedRollExecutor:()=>{calls++;}});
  await assert.rejects(fire.executeRangedAttack(fx.attack(),{attackProfile:profile,physicalShots:1}),/Батарея разряжена/);
  const {executePreparedGgaRoll}=await import('../scripts/tools/prepared-gga-roll.js');
  await assert.rejects(executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,physicalShots:1}),/Батарея разряжена/);
  assert.equal(calls,0);assert.equal(fx.weapon().totalAmmo,8);
});
test('Fire Control detects live depletion even with an old preview and enables again only for real saved charge',async()=>{
  const fx=await ready(),app=Object.create(FirePreparationApp.prototype);
  Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:fx.attack(),fireState:{shots:'1'},_getRapidFireState:()=>({})});
  assert.equal(app._proximityReason(),null);await charge(fx,0);assert.match(app._proximityReason(),/Батарея разряжена/);
  const button={};app.element={querySelector:s=>s.includes('confirm')?button:null};app._updateProximityPreview();assert.equal(button.disabled,true);assert.match(button.title,/Батарея разряжена/);
});
test('PLAYER/OWNER can spend and shoot without world settings or GM approval; foreign Actor remains protected',async()=>{
  const fx=await ready();game.user.isGM=false;
  try {await fx.service.spendPaintCharge(fx.carrier.id,2);await shoot(fx);assert.equal(fx.weapon().paintBattery.charge,497);
    fx.actor.isOwner=false;const before=JSON.stringify(fx.state());await assert.rejects(shoot(fx),/Permission/);await assert.rejects(fx.service.spendPaintCharge(fx.carrier.id,1),/Permission/);assert.equal(JSON.stringify(fx.state()),before);
  } finally {game.user.isGM=true;}
});
test('ten magazine objects and 500 charge are independent resources',async()=>{
  const fx=await fixture(modeId);await fx.transaction('add-magazines',{amount:9,capacity:51});assert.equal(fx.weapon().magazines.length,10);
  await assert.rejects(fx.transaction('add-magazines',{amount:1,capacity:51}),/MagazineLimit/);
  assert.equal(fx.weapon().paintBattery.charge,500);await fx.service.spendPaintCharge(fx.carrier.id,50);assert.equal(fx.weapon().magazines.length,10);
});
test('two Paint Carbines retain separate cells on one Actor',async()=>{
  const fx=await fixture(modeId),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);
  const other=await new StandaloneWeaponService(fx.actor,catalogs).save(draft);await fx.service.loadState();await fx.service.spendPaintCharge(fx.carrier.id,7);
  assert.equal(fx.state().weapons.find(w=>w.standaloneWeaponId===other.id).paintBattery.charge,500);assert.equal(fx.weapon().paintBattery.charge,493);
});
for(const [value,blocks] of [[0,0],[1,1],[49,1],[50,1],[51,2],[450,9],[499,10],[500,10]])test('vertical battery segments and exact label: '+value,()=>{
  const w={id:'paint',standaloneModeId:modeId,paintBattery:{...newPaintBattery(),charge:value}},html=paintBatteryHTML(w,true,escapePayload);
  assert.equal((html.match(/gam-battery-segment /g)??[]).length,10);assert.equal((html.match(/segment filled/g)??[]).length,blocks);
  assert.ok(html.indexOf('gam-battery-text')<html.indexOf('gam-battery-icon'));assert.match(html,new RegExp(value+'/500'));assert.doesNotMatch(html,/class="gam-mag\b/);
});
test('non-Paint and manually powered motor guns have no battery UI or synthetic cell',async()=>{
  for(const id of ['WIAo1otMCstnbi4Dv','WYYJ_58OEKOTk38wi']){const fx=await fixture(id);assert.equal(fx.weapon().paintBattery,undefined);assert.equal(paintBatteryHTML(fx.weapon(),false,escapePayload),'');}
});
test('real manager callbacks select battery independently and show replacement in the existing load button slot',async()=>{
  const fx=await ready();let app;const render=WeaponAssistantApp.prototype.render;
  WeaponAssistantApp.prototype.render=async function(){app=this;this.element={addEventListener(){}};return this;};
  globalThis.foundry.applications.api.DialogV2={input:async()=>({charge:2})};
  globalThis.GURPS={executeOTF(){},ModifierBucket:{modifierStack:{modifierList:[]}}};
  globalThis.canvas={scene:{id:crypto.randomUUID()},tokens:{controlled:[{id:crypto.randomUUID(),actor:fx.actor}]}};
  globalThis.Hooks={on:()=>1,off(){}};
  try {await openAmmoManager();const html=()=>app.buildContent(app.managerState);
    assert.ok(html().indexOf('gam-card-head')<html().indexOf('gam-battery-icon'));
    assert.ok(html().indexOf('gam-battery-icon')<html().indexOf('class="gam-magazines"'));
    assert.doesNotMatch(html(),/gam-card-resources/);
    assert.equal((html().match(/class="gam-mag /g)??[]).length,1);
    let r=await app.handleAction({action:'select-battery',weaponId:fx.carrier.id,app});app.managerState=r.managerState;
    assert.match(html(),/data-ammo-action="replace-battery"/);assert.doesNotMatch(html(),/data-ammo-action="replace-battery"[^>]*disabled/);
    assert.match(html(),/Заменить батарею/);assert.match(html(),/gam-battery selected/);
    await app.handleAction({action:'spend',weaponId:fx.carrier.id,app});assert.equal(fx.weapon().paintBattery.charge,498);assert.equal(fx.weapon().totalAmmo,8);
    r=await app.handleAction({action:'select-magazine',weaponId:fx.carrier.id,magazineIndex:'0',app});assert.equal(r.changed,true);
    assert.doesNotMatch(html(),/Заменить батарею|gam-battery selected/);
    await charge(fx,0);app.managerState=fx.state();assert.match(html(),/data-ammo-action="fire-roll"[^>]*disabled/);assert.match(html(),/Батарея разряжена/);
    assert.doesNotMatch(html(),/data-ammo-action="manage-load"[^>]*disabled/);
  }finally{WeaponAssistantApp.prototype.render=render;}
});
test('all 30 admitted Paint combinations execute with matching published mechanics and one energy debit',async()=>{
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract()),rows=matrix.rows.filter(r=>r.modeId===modeId&&r.implementation==='available');assert.equal(rows.length,30);
  for(const row of rows){const fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe),p=row.recipeVariant?automatic.prepare({modeId,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters,note:'Full owner Note',savingThrow:'HT-2',description:'Owner description'}}):null;
    if(p){assert.equal(p.state,'complete',row.candidateId);await fx.transaction('save-recipe',{type:p.type});}
    await load(fx,p?.type??base);const context=row.candidateId==='he_proximity'?{shotgun:{physicalDistance:40}}:{},expected=fx.profile(context),r=await shoot(fx,1,{context});
    assert.deepEqual(r.snapshot.profile.damage,expected.damage,row.candidateId);assert.equal(fx.weapon().paintBattery.charge,499);assert.equal(fx.weapon().totalAmmo,7);
    assert.doesNotMatch(r.message.content,/<details[^>]*\bopen|B cell|батаре|B4\d\d/);
  }
});
test('Note label distinguishes jammer and named chemical fillers under ru/en, preserving values',()=>{
  for(const language of ['ru','en']){game.i18n.lang=language;for(const variantId of ['ut_expendable_jammer','ut_biochemical_aerosol','ut_biochemical_liquid']){
    const p=automatic.prepare({modeId:'WIAo1otMCstnbi4Dv',base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_clp'},variantId,parameters:{note:'Unchanged <text>'}});
    assert.equal(p.state,'complete');const html=utPayloadEditorHTML(p.type,null,escapePayload);
    assert.match(html,variantId==='ut_expendable_jammer'?/<label>Note<input/:/<label>Вещество \(Note\)<input/);assert.match(html,/Unchanged &lt;text&gt;/);
  }}game.i18n.lang='ru';
});
test('Aim field is explicitly duration and uses one grid cell without changing weapon Acc',async()=>{
  const code=await readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');
  assert.match(code,/gam-fire-aim \{[^}]*grid-column: auto/);assert.match(code,/gam-melee-fields > \.gam-melee-evaluate \{ grid-column: 1 \/ -1/);
  assert.match(code,/PaintBattery.AimSeconds/);assert.doesNotMatch(code,/<span>Прицеливание:<\/span>/);
  const fx=await fixture(modeId);assert.equal(fx.attack().acc,2);
});
test('CHS selector has checkbox/help and normal wrapping with no derived result, while calculation stays 11',async()=>{
  const actor={system:{skills:{r:{name:'Guns/TL9 (Rifle)',level:13},chs:{name:'Close-Hip Shooting (Rifle)',level:16,type:'TECHNIQUE'}}}};
  const governingSkill={name:'Guns/TL9 (Rifle)',level:13,specialty:'rifle',family:'guns'},context={actor,governingSkill,fireState:{closeHipShooting:true},closeHipApplied:{closeHipBase:11}};
  const rows=getRangedTechniqueRows(context),app=new RangedTechniquesApp({getContext:()=>context}),html=await app._renderHTML({rows});
  assert.match(html,/data-technique-id='closeHipShooting'/);assert.match(html,/data-technique-help='closeHipShooting'/);assert.doesNotMatch(html,/Результат стрельбы от бедра/);
  assert.match(html,/overflow-wrap:normal; word-break:normal/);
  const result=resolveCloseHipShooting({actor,attack:{level:13,bulk:-5,data:{bulk:'-5'}},governingSkill,enabled:true});assert.equal(result.closeHipBase,11);
});
