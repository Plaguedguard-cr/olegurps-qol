import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,resolver,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {LP_PROFILES,LP_FIRE_MODES,lpAdmission,lpBallistics,readLPFuel,lpFuelReason,lpBlocker} from '../scripts/tools/ut-liquid-propellant.js';
import {weaponResourceHTML,validateWeaponShotResources} from '../scripts/tools/weapon-resources.js';
import {weaponPowerProfile} from '../scripts/tools/weapon-power.js';
import {executionConfigurationHTML} from '../scripts/tools/ut-etc.js';
import {WeaponConfigurationDraft,weaponConfigurationHTML,bindWeaponConfiguration} from '../scripts/tools/weapon-configuration.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {confirmLPFuelReplacement} from '../scripts/tools/lp-fuel-replacement-dialog.js';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {magazinePolicy} from '../scripts/tools/magazine-policy.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';

const rifle='WFc8O-LgWxenUseNy',magnum='WIAo1otMCstnbi4Dv',amr='WlstnlxI_Mm-2UJf0',storm='WmyROTLk0gs7lrYCE',uaw='WtM51JNSpOUIy3Eo1',shotgun='WRvS5pz3LMCzqQyiZ';
const configure=async(fx,variant='lp')=>{const state=fx.state();state.weapons[0].executionRequest={variant,modeId:fx.carrier.standaloneModeId};await fx.service.saveState(state);};
const setMode=(fx,mode)=>fx.service.setLPFireMode(fx.carrier.id,mode);
const replace=(fx,options={})=>fx.service.replaceLPFuel(fx.carrier.id,{requestId:crypto.randomUUID(),expectedFuel:fx.weapon().lpFuel??null,...options});
const setUnits=async(fx,units)=>{const s=fx.state();s.weapons[0].lpFuel.remainingUnits=units;await fx.actor.setFlag('world','gurpsAmmoManager',s);};
const ready=async(id=rifle)=>{const fx=await fixture(id);await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));return fx;};
const published=[
 ['WngbnzWRwLntvaRbR',18,27,81,1],['WlqvLkGz-INk0A-_o',30,45,135,1],['W9chB7ydzOWTAxQP0',20,30,90,1],
 [magnum,9,13,39,1],['W5_0Tkbdr1S4b4Hlv',30,45,135,1],['WoLIvHFqsiusWgmXF',100,150,450,1],
 [rifle,50,75,225,1],['W30vD5BH3t_VdkWUZ',50,75,225,1],['W3Ggl5bTeg_44b_rU',12,18,54,1],
 ['WeFF7cHxefAAGmowq',10,15,45,1],[amr,10,15,45,0],['WdUnAFzFvv59Smhhk',8,12,36,1],
 ['WgqAB3QGTUZrgtdES',34,51,153,0],['WYYJ_58OEKOTk38wi',200,300,900,0],['W6-C_sQqk0Ak_c-8_',400,600,1800,0],
 ['W6bX3WBkGZdZfoeMu',50,75,225,0],[storm,60,90,270,0],[uaw,40,60,180,1]
];
for(const [id,n,lp,bottle,chamber]of published)test('individual UT137-139 LP capacity, chamber, price and physical family: '+id,async()=>{
  const fx=await fixture(id),before=fx.profile(),base=fx.candidates().find(t=>!t.recipe);await load(fx,base);const total=fx.weapon().totalAmmo;
  await configure(fx);const p=fx.profile(),profile=LP_PROFILES[id];
  assert.equal(profile.baseNominal,n);assert.equal(profile.nominalCapacity,lp);assert.equal(profile.capacity,bottle);
  assert.equal(readLPFuel(fx.weapon()).remainingUnits,bottle*4);assert.equal(fx.weapon().capacity,lp+chamber);
  assert.equal(p.effective.shots,lp+(chamber?'+1':'')+'('+profile.reload+')');assert.equal(p.weaponConfiguration.weaponPrice,profile.basePrice*1.5);
  assert.equal(p.damage.formula,before.damage.formula);assert.equal(p.effective.range,before.effective.range);
  for(const k of ['acc','rof','rcl','st','bulk'])assert.equal(p.effective[k],before.effective[k]);
  assert.equal(fx.weapon().totalAmmo,total);assert.equal(fx.candidates().some(t=>t.recipe?.variantId==='ut_liquid_propellant'),false);
  assert.equal(weaponPowerProfile(fx.weapon()),null);assert.deepEqual(fx.actor.system,fx.before);
  const result=await shoot(fx);assert.equal(result.receipt.fuel.spentUnits,4);assert.equal(result.snapshot.profile.resource.fuel.physicalShots,1);
});

for(const id of ['WOMuCBSS_c_nIstvm','W5_HQQYf_zjoG9A7J','W8mzf5YoC9fFjAhO2','WwK7xKN4sLQXIuQ64','Wap9nUEQPwuDkUEUp','WkudgdqO3lymAYks5',shotgun])
test('user-excluded LP construction has no fuel, conversion or selectable option: '+id,async()=>{
  const fx=await fixture(id),before=JSON.stringify(fx.state());assert.equal(lpAdmission(id,catalogs,12).allowed,false);
  await assert.rejects(configure(fx));assert.equal(JSON.stringify(fx.state()),before);
  assert.doesNotMatch(executionConfigurationHTML(id,'ordinary',catalogs,12,escapePayload),/value="lp"/);
});

for(const [mode,units,damage,range]of [['standard',4,'6d pi','700/4,000'],['boosted',6,'7d+2 pi','910/5200'],['low-velocity',1,'3d pi','350/2000']])
test('mode '+mode+' drives resolver, range, frozen receipt and exact burst cost',async()=>{
  const fx=await ready();await setMode(fx,mode);const before=readLPFuel(fx.weapon()).remainingUnits,p=fx.profile();
  assert.equal(p.damage.formula,damage);assert.equal(p.effective.range,range);assert.equal(p.weaponConfiguration.fireMode,mode);
  const result=await shoot(fx,3);assert.equal(result.receipt.fuel.spentUnits,units*3);assert.equal(fx.weapon().lpFuel.remainingUnits,before-units*3);
  assert.equal(result.snapshot.profile.weaponConfiguration.fireMode,mode);assert.equal(result.profile.resource.fuel.afterUnits,before-units*3);
  assert.equal(result.receipt.power,undefined);assert.equal(result.profile.resource.fuel.unitsPerShot,units);
});

test('Magnum rounds 9 to 13 plus chamber; boosted adds exactly four; low velocity uses HT166',async()=>{
  const fx=await ready(magnum);await setMode(fx,'boosted');assert.equal(fx.profile().damage.formula,'5d+1 pi++');
  assert.equal(fx.profile().effective.range,'306/3380');await setMode(fx,'low-velocity');
  assert.equal(fx.profile().damage.formula,'2d pi++');assert.equal(fx.profile().effective.range,'118/1300');
  assert.equal(fx.weapon().capacity,14);assert.equal(fx.weapon().lpFuel.capacityUnits,156);
});

test('Anti-Materiel ETC stays 6dx4; LP is independent, with no stacked conversion or battery reset',async()=>{
  const fx=await ready(amr);await setMode(fx,'low-velocity');assert.equal(fx.profile().damage.formula,'7d+2 pi+');
  await configure(fx,'etc');assert.equal(fx.profile().damage.formula,'6dx4 pi+');await shoot(fx);
  const battery=fx.weapon().etcBattery;await configure(fx);await setMode(fx,'boosted');assert.equal(fx.profile().damage.formula,'6dx3 pi+');
  await shoot(fx);assert.deepEqual(fx.weapon().etcBattery,battery);await configure(fx,'ordinary');assert.equal(fx.profile().damage.formula,'15d pi+');
  assert.equal(fx.weapon().lpFuel.remainingUnits,174);await configure(fx,'etc');assert.deepEqual(fx.weapon().etcBattery,battery);
});

for(const units of [0,1,5,11])test('insufficient whole-burst fuel '+units+' rejects before native roll without receipts or physical loss',async()=>{
  const fx=await ready();await setMode(fx,'boosted');await setUnits(fx,units);const before=JSON.stringify(fx.state());let calls=0;
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({profile:fx.profile(),amount:2}),execute:()=>{calls++;return {rolled:true};}}));
  assert.equal(calls,0);assert.equal(JSON.stringify(fx.state()),before);
});

test('exact quarters persist and display .25, .5 and .75 without upward rounding',async()=>{
  const fx=await ready(magnum);await setMode(fx,'low-velocity');
  for(const [i,label]of [[1,'38.75'],[2,'38.5'],[3,'38.25']]){await shoot(fx);assert.equal(fx.weapon().lpFuel.remainingUnits,156-i);
    assert.match(weaponResourceHTML(fx.weapon(),false,escapePayload),new RegExp(label.replace('.','\\.')+'/39'));}
  await new AmmoService(fx.actor).loadState();assert.equal(fx.weapon().lpFuel.remainingUnits,153);
});

for(const amount of [-1,0,NaN,Infinity,'1','x',0.1,0.3,226])test('invalid manual fuel amount rejects atomically: '+String(amount),async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());await assert.rejects(fx.service.spendLPFuel(fx.carrier.id,amount));assert.equal(JSON.stringify(fx.state()),before);
});
test('manual .25, .5, .75 and 1 fuel spend never touches magazines or physical stock',async()=>{
  const fx=await ready(),inventory=fx.weapon().ammunitionInventory;
  for(const n of [.25,.5,.75,1])await fx.service.spendLPFuel(fx.carrier.id,n);
  assert.equal(fx.weapon().lpFuel.remainingUnits,890);assert.deepEqual(fx.weapon().ammunitionInventory,inventory);
});

test('insufficient ammunition, native cancellation and exception leave fuel and receipts unchanged',async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());await assert.rejects(shoot(fx,9),/InsufficientRounds/);await shoot(fx,1,{cancel:true});
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({profile:fx.profile(),amount:1}),execute:()=>{throw Error('native failed');}}),/native failed/);
  assert.equal(JSON.stringify(fx.state()),before);
});
test('concurrent last shots and duplicate IDs consume only one physical round and six units',async()=>{
  const fx=await ready();await setMode(fx,'boosted');await setUnits(fx,6);const id=crypto.randomUUID();
  const results=await Promise.allSettled([shoot(fx,1,{attackId:id}),shoot(fx,1,{attackId:id}),shoot(fx)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);assert.equal(fx.weapon().totalAmmo,7);assert.equal(fx.weapon().lpFuel.remainingUnits,0);
  assert.equal(Object.keys(fx.state().shotReceipts).length,1);
  const again=await new AmmoService(fx.actor).executeShot({weaponId:fx.carrier.id,attackId:id,prepare:()=>assert.fail(),execute:()=>assert.fail()});assert.equal(again.duplicate,true);
});
test('concurrent shot and stale bottle replacement serialize; duplicate confirmation cannot refill again',async()=>{
  const fx=await ready(),expectedFuel=fx.weapon().lpFuel;
  const result=await Promise.allSettled([shoot(fx),replace(fx,{expectedFuel})]);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');
  const options={expectedFuel:fx.weapon().lpFuel,requestId:'same-confirmation'};await replace(fx,options);await shoot(fx);await replace(fx,options);
  assert.equal(fx.weapon().lpFuel.remainingUnits,896);
});
test('replacement first supplies a full bottle to the queued shot without touching inventory',async()=>{
  const fx=await ready();await setUnits(fx,0);const inv=fx.weapon().ammunitionInventory;
  await Promise.all([replace(fx),shoot(fx)]);assert.equal(fx.weapon().lpFuel.remainingUnits,896);
  assert.equal(fx.weapon().ammunitionInventory.magazines[0].rounds,inv.magazines[0].rounds-1);
});

test('missing or corrupt old state never repairs itself by load, stale save or execution toggle',async()=>{
  const fx=await ready(),stale=fx.state();const state=fx.state();delete state.weapons[0].lpFuel;await fx.actor.setFlag('world','gurpsAmmoManager',state);
  await fx.service.loadState();await fx.service.saveState(stale);await configure(fx,'ordinary');await configure(fx);
  assert.equal(fx.weapon().lpFuel,undefined);await assert.rejects(shoot(fx));await replace(fx);assert.equal(fx.weapon().lpFuel.remainingUnits,900);
  for(const value of [{capacityUnits:901,remainingUnits:900},{capacityUnits:900,remainingUnits:-1},{capacityUnits:900,remainingUnits:.25},{capacityUnits:900,remainingUnits:901}]){
    const s=fx.state();s.weapons[0].lpFuel=value;await fx.actor.setFlag('world','gurpsAmmoManager',s);await assert.rejects(shoot(fx));
  }
});
test('mode switching, reload, magazine install/load and ordinary/ETC toggles never create fuel or rounds',async()=>{
  const fx=await ready();await shoot(fx,2);const fuel=fx.weapon().lpFuel,inventory=fx.weapon().ammunitionInventory;
  for(const mode of ['boosted','low-velocity','standard'])await setMode(fx,mode);
  await fx.service.loadState();await configure(fx,'etc');const battery=fx.weapon().etcBattery;await configure(fx,'ordinary');await configure(fx);
  assert.deepEqual(fx.weapon().lpFuel,fuel);assert.deepEqual(fx.weapon().etcBattery,battery);assert.equal(fx.weapon().totalAmmo,6);
  assert.equal(fx.weapon().ammunitionInventory.magazines[0].rounds,inventory.magazines[0].rounds);
  const base=fx.candidates().find(t=>!t.recipe);await fx.transaction('add-stock',{ammoKey:base.key,amount:2});
  await fx.transaction('load',{magazineId:inventory.installedId,ammoKey:base.key,amount:2});assert.deepEqual(fx.weapon().lpFuel,fuel);
});
test('overfilled magazines survive reverting to ordinary; new loads cannot exceed ordinary nominal',async()=>{
  const fx=await ready(magnum),base=fx.candidates().find(t=>!t.recipe),id=fx.weapon().ammunitionInventory.installedId;
  await fx.transaction('add-stock',{ammoKey:base.key,amount:6});await fx.transaction('load',{magazineId:id,ammoKey:base.key,amount:6});
  await configure(fx,'ordinary');assert.equal(fx.weapon().totalAmmo,14);assert.equal(fx.weapon().ammunitionInventory.magazines[0].rounds,14);
  await fx.transaction('add-stock',{ammoKey:base.key,amount:1});await assert.rejects(fx.transaction('load',{magazineId:id,ammoKey:base.key,amount:1}),/CapacityExceeded/);
  await shoot(fx);assert.equal(fx.weapon().totalAmmo,14);await configure(fx);assert.equal(fx.weapon().ammunitionInventory.magazines[0].rounds,13);
});

test('a Foundry getFlag reference preserves the previous execution while resizing and never discards overfilled rounds',async()=>{
  const fx=await ready(magnum);let live=fx.state();
  const read=fx.actor.getFlag.bind(fx.actor),write=fx.actor.setFlag.bind(fx.actor);
  fx.actor.getFlag=(scope,key)=>scope==='world'&&key==='gurpsAmmoManager'?live:read(scope,key);
  fx.actor.setFlag=async(scope,key,value)=>{if(scope==='world'&&key==='gurpsAmmoManager')live=structuredClone(value);return write(scope,key,value);};
  const state=fx.actor.getFlag('world','gurpsAmmoManager');state.weapons[0].executionRequest={variant:'ordinary',modeId:magnum};
  await fx.service.saveState(state);assert.equal(live.weapons[0].ammunitionInventory.magazines[0].capacity,10);
  assert.equal(live.weapons[0].totalAmmo,8);assert.equal(live.weapons[0].lpFuel.remainingUnits,156);
});

test('Storm primary accepts 90 and blocks alternate magazines only while LP is active',async()=>{
  const fx=await fixture(storm),base=fx.candidates().find(t=>!t.recipe);
  await fx.transaction('add-magazines',{amount:1,capacity:13});const alt=fx.weapon().ammunitionInventory.magazines.at(-1);
  await fx.transaction('add-stock',{ammoKey:base.key,amount:4});await fx.transaction('load',{magazineId:alt.id,ammoKey:base.key,amount:4});
  await fx.transaction('install',{magazineId:alt.id});await configure(fx);assert.equal(fx.weapon().lpFuel.capacityUnits,1080);
  await assert.rejects(shoot(fx),/основную подачу/);await assert.rejects(fx.transaction('install',{magazineId:alt.id}),/основную подачу/);
  await configure(fx,'ordinary');await shoot(fx);assert.equal(fx.weapon().lpFuel.remainingUnits,1080);
  await configure(fx);const primary=fx.weapon().ammunitionInventory.magazines[0];assert.equal(primary.capacity,90);
  await fx.transaction('install',{magazineId:primary.id});await fx.transaction('add-stock',{ammoKey:base.key,amount:3});await fx.transaction('load',{magazineId:primary.id,ammoKey:base.key,amount:3});
  await shoot(fx);assert.equal(fx.weapon().lpFuel.remainingUnits,1076);
});

test('UAW shotgun remains ordinary with independent magazines and no fuel or LP selector',async()=>{
  const fx=await ready(uaw);await fx.service.loadState();let state=fx.state();const second=state.weapons.find(w=>w.standaloneModeId===shotgun);
  assert.ok(second);const before=fx.weapon().lpFuel;
  const {ammunitionCandidates}=await import('../scripts/tools/ammo-management-app.js');const type=ammunitionCandidates(fx.actor,second,OleGURPSQOL).find(t=>!t.recipe);
  const opts={allowedTypes:[type]},id=second.ammunitionInventory.installedId;
  await fx.service.inventoryTransaction(second.id,'add-stock',{ammoKey:type.key,amount:2},opts);await fx.service.inventoryTransaction(second.id,'load',{magazineId:id,ammoKey:type.key,amount:2},opts);
  await fx.service.inventoryTransaction(second.id,'install',{magazineId:id});state=fx.state();
  const attack=readStandaloneAttack(fx.actor,fx.record.id,shotgun),profile=resolver.resolve({actorId:fx.actor.id,weaponId:second.id,attack,rawAttack:attack.data,state,
    binding:{status:'confirmed',binding:{confirmed:true,modeId:shotgun}},ammunition:fx.service.readAttackAmmunition(second.id)});
  assert.equal(profile.damage.formula,'5d pi++');assert.equal(profile.effective.range,'100/500');assert.equal(profile.weaponConfiguration,undefined);
  const result=await fx.service.executeShot({weaponId:second.id,attackId:crypto.randomUUID(),prepare:()=>({profile,amount:1}),execute:async()=>({rolled:true})});
  assert.equal(result.receipt.fuel,undefined);assert.deepEqual(fx.weapon().lpFuel,before);assert.equal(magazinePolicy(second).limit,5);
  const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),existing:second,attacks:[],catalogs});assert.equal(draft.executionModeId,uaw);assert.equal(draft.executionVariant,'lp');
});

test('OWNER configures, changes mode, spends, replaces and fires without GM; foreign Actor fails every write',async()=>{
  const fx=await fixture(rifle);game.user.isGM=false;const setter=game.settings.set;game.settings.set=()=>assert.fail('world write');
  try {
    await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));await setMode(fx,'boosted');await fx.service.spendLPFuel(fx.carrier.id,.25);await replace(fx);await shoot(fx);
    fx.actor.isOwner=false;const before=JSON.stringify(fx.state());
    for(const fn of [()=>configure(fx,'ordinary'),()=>setMode(fx,'standard'),()=>fx.service.spendLPFuel(fx.carrier.id,.25),()=>replace(fx),()=>shoot(fx)])await assert.rejects(fn(),/Permission/);
    assert.equal(JSON.stringify(fx.state()),before);
  } finally {game.user.isGM=true;game.settings.set=setter;}
});

test('TL9 gates new LP in selector and queued service; existing fuel and snapshots survive lower TL',async()=>{
  const fx=await fixture(rifle);await fx.actor.setFlag('olegurps-qol','campaignTL',8);
  assert.equal(lpAdmission(rifle,catalogs,8).allowed,false);assert.doesNotMatch(executionConfigurationHTML(rifle,'ordinary',catalogs,8,escapePayload),/value="lp"/);await assert.rejects(configure(fx));
  await fx.actor.setFlag('olegurps-qol','campaignTL',9);await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));
  const shot=await shoot(fx),old=JSON.stringify(shot.snapshot);await fx.actor.setFlag('olegurps-qol','campaignTL',0);await shoot(fx);
  assert.equal(JSON.stringify(shot.snapshot),old);assert.equal(fx.weapon().lpFuel.remainingUnits,892);
});

for(const answer of [false,null,undefined,'yes','no',{}, {confirmed:false}])test('No, Esc, X or malformed dialog answer writes nothing: '+JSON.stringify(answer),async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());const result=await confirmLPFuelReplacement({actor:fx.actor,weaponId:fx.carrier.id,ammoService:fx.service,DialogV2:{wait:async spec=>{
    assert.equal(spec.rejectClose,false);assert.deepEqual(spec.buttons.map(b=>b.action),['yes','no']);assert.equal(spec.buttons[1].callback(),false);assert.doesNotMatch(spec.content,/input|Non-Rechargeable/);return answer;}}});
  assert.equal(result,null);assert.equal(JSON.stringify(fx.state()),before);
});
test('explicit typed Yes installs full bottle and touches no ammunition',async()=>{
  const fx=await ready(),inventory=fx.weapon().ammunitionInventory;await setUnits(fx,1);
  await confirmLPFuelReplacement({actor:fx.actor,weaponId:fx.carrier.id,ammoService:fx.service,DialogV2:{wait:async spec=>spec.buttons[0].callback()}});
  assert.equal(fx.weapon().lpFuel.remainingUnits,900);assert.deepEqual(fx.weapon().ammunitionInventory,inventory);
});

test('configuration LP preview uses shared resolver immediately with no Actor write and preserves manual baseline',async()=>{
  const fx=await fixture(magnum),before=JSON.stringify(fx.state());
  const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],existing:fx.weapon(),catalogs});
  draft.standaloneDraft.setOverride(magnum,'damage','5d pi++');draft.executionVariant='lp';draft.executionChanged=true;
  assert.equal(draft.previewStats().stats.shots,'13+1(3)');assert.equal(draft.previewStats().stats.damage,'5d pi++');assert.match(weaponConfigurationHTML(draft),/\$1305/);
  draft.lpFireMode='boosted';assert.equal(draft.previewStats().stats.damage,'6d+1 pi++');assert.equal(JSON.stringify(fx.state()),before);
  draft.executionVariant='ordinary';assert.equal(draft.previewStats().stats.damage,'5d pi++');assert.equal(draft.previewStats().stats.shots,'9+1(3)');
});
test('Fire Control LP mode event saves only the mode and refreshes current Damage/Range before a shot',async()=>{
  const fx=await ready(),before=fx.weapon().lpFuel;const app=Object.create(FirePreparationApp.prototype);
  Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:fx.attack(),_onActorUpdate(){this.updated=true;},render:async()=>{app.rendered=true;}});
  assert.match(app._buildLPContent(),/Standard.*Boosted.*Low Velocity/);await app._onInput({type:'change',target:{name:'lpFireMode',value:'boosted'}});
  assert.equal(fx.weapon().lpFireMode,'boosted');assert.equal(app.attack.data.damage,'7d+2 pi');assert.equal(app.attack.data.range,'910/5200');
  assert.deepEqual(fx.weapon().lpFuel,before);assert.equal(app.updated,true);
});
test('empty fuel blocks Fire Control and native execution; stale modes cannot execute a previous profile',async()=>{
  const fx=await ready(),profile=fx.profile();await setUnits(fx,0);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:fx.attack(),fireState:{shots:1},_getRapidFireState:()=>({})});
  assert.match(app._proximityReason(),/пуст/);assert.throws(()=>validateWeaponShotResources(fx.actor,profile,1,fx.attack()),/пуст/);
  await replace(fx);await setMode(fx,'boosted');assert.throws(()=>validateWeaponShotResources(fx.actor,profile,1,fx.attack()),/изменились/);
});

test('fuel icon is a continuous liquid bottle with exact totals, shared fill colors and resource selection',async()=>{
  const fx=await ready(magnum);await setUnits(fx,155);const full=weaponResourceHTML(fx.weapon(),true,escapePayload);
  assert.match(full,/gam-fuel-bottle/);assert.match(full,/gam-fuel-liquid/);assert.match(full,/38\.75\/39/);assert.match(full,/aria-pressed="true"/);assert.doesNotMatch(full,/gam-magazine|battery-segment/);
  const colors=[];for(const units of [156,78,1,0]){await setUnits(fx,units);const html=weaponResourceHTML(fx.weapon(),false,escapePayload);colors.push(html.match(/hsl\((\d+)/)?.[1]);if(!units)assert.match(html,/height:0%/);}
  assert.notEqual(colors[0],colors[2]);assert.equal(colors[2],colors[3]);
  const source=await readFile(new URL('../scripts/tools/ammo.js',import.meta.url),'utf8'),resource=source.indexOf('${weaponResourceHTML(weapon,batterySelected,escapeHTML)}'),divider=source.indexOf('class="${uawGroup(weapon)?');
  assert.ok(resource>=0&&resource<divider);
});

test('deferred Spraying Fire preserves fuel until completion then spends planned shots once',async()=>{
  const fx=await ready();await setMode(fx,'boosted');const s=fx.state();s.sprayingFireSessions={test:{ammoConsumed:false}};await fx.actor.setFlag('world','gurpsAmmoManager',s);
  const result=await fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),deferConsumption:true,sessionKey:'test',prepare:()=>({profile:fx.profile({physicalShots:1}),amount:3}),execute:async()=>({rolled:true})});
  assert.equal(result.profile.resource.fuel.spentUnits,0);assert.equal(fx.weapon().lpFuel.remainingUnits,900);
  const current=fx.state();await fx.service.consumeLoadedRounds(current,current.weapons[0],3,{sessionKey:'test',expectedResource:result.profile.resource});
  assert.equal(fx.weapon().lpFuel.remainingUnits,882);assert.equal(fx.state().sprayingFireSessions.test.fuelReceipt.spentUnits,18);assert.equal(fx.weapon().totalAmmo,5);
  await assert.rejects(fx.transaction('consume',{sessionKey:'test',amount:3,magazineId:fx.weapon().ammunitionInventory.installedId}));assert.equal(fx.weapon().lpFuel.remainingUnits,882);
});
test('deferred completion rejects a changed LP mode without spending any resources',async()=>{
  const fx=await ready(),s=fx.state();s.sprayingFireSessions={test:{ammoConsumed:false,ammunitionProfile:fx.profile()}};await fx.actor.setFlag('world','gurpsAmmoManager',s);
  await setMode(fx,'boosted');const before=JSON.stringify(fx.state());await assert.rejects(fx.transaction('consume',{sessionKey:'test',amount:3,magazineId:fx.weapon().ammunitionInventory.installedId}),/изменились/);assert.equal(JSON.stringify(fx.state()),before);
});

test('all source-admitted ammunition pairs on every LP model resolve in all three modes; payloads and CPS are preserved',async()=>{
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract());let checked=0;
  for(const [id]of published){const fx=await fixture(id),base=fx.candidates().find(t=>!t.recipe);await configure(fx);
    for(const row of matrix.rows.filter(r=>r.configurationId===id&&r.implementation==='available'&&!['etc','liquid_propellant'].includes(r.candidateId))){
      const p=row.recipeVariant?automatic.prepare({modeId:id,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters}}):null;
      if(p)assert.equal(p.state,'complete',id+':'+row.candidateId);const type=p?.type??base;
      const args={actorId:fx.actor.id,weaponId:fx.carrier.id,attack:fx.attack(),rawAttack:fx.attack().data,
        binding:{status:'confirmed',binding:{confirmed:true,modeId:id}},ammunition:{kind:'physical-magazine',type,ammoKey:type.key,available:1,total:1},profilePolicy:'permissive'};
      const ordinary=resolver.resolve({...args,state:{weapons:[]}});
      if(p&&!fx.weapon().ammunitionInventory.stocks.some(s=>s.key===type.key))await fx.transaction('save-recipe',{type});
      if(fx.weapon().lpFuel.remainingUnits<11)await replace(fx);await load(fx,type,3);
      for(const mode of Object.keys(LP_FIRE_MODES)){await setMode(fx,mode);const effect=resolver.resolve({...args,state:fx.state()});
        assert.equal(effect.damage.nativeSafe,true,id+':'+row.candidateId+':'+mode+':'+effect.damage.reason);
        for(const c of ordinary.damage.components.filter(c=>['linked','follow-up','fragmentation'].includes(c.role)))assert.equal(effect.damage.components.find(e=>e.role===c.role)?.formula,c.formula,id+':'+row.candidateId+':'+c.role);
        if(['shaped_charge','hemp','sefop','thermobaric','plasma','emp','force','flare'].includes(row.candidateId))assert.equal(effect.damage.formula,ordinary.damage.formula,id+':'+row.candidateId);
        assert.deepEqual(effect.ammunition,ordinary.ammunition);assert.equal(effect.damage.rules.costPerShot,ordinary.damage.rules.costPerShot);
        const shot=await shoot(fx,1,{context:{manualGuidanceConfirmed:true,shotgun:{physicalDistance:40}}});
        assert.equal(shot.spent,1);assert.equal(shot.receipt.fuel.spentUnits,LP_FIRE_MODES[mode].units);
        assert.equal(shot.snapshot.profile.weaponConfiguration.fireMode,mode);checked++;
      }
    }
  }assert.ok(checked>1000,checked);
});
test('APHC, APDS, APEP and APHEX receive LP first; independent warheads remain distinct',async()=>{
  for(const [variant,damage,range]of [['ut_aphc','7d+2(2) pi-','910/5200'],['ut_apds','9d+1(2) pi-','1365/7800'],['ut_apep','7d+2(3) pi-','1820/10400']]){
    const fx=await ready(),base=fx.candidates().find(t=>!t.recipe),p=automatic.prepare({modeId:rifle,base,variantId:variant});
    const id=fx.weapon().ammunitionInventory.installedId;await fx.transaction('unload',{magazineId:id,amount:fx.weapon().magazines[0]});await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);await setMode(fx,'boosted');
    assert.equal(fx.profile().damage.formula,damage);assert.equal(fx.profile().effective.range,range);
  }
});

test('compact LP ChatMessage preserves Note, saving throw, radius and description; Low Velocity sound is one brief line',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),base=fx.candidates().find(t=>!t.recipe),parameters={note:'Custom <lot> '.repeat(20),savingThrow:'Custom HT',description:'User description '.repeat(20),radius:{yards:17,units:'yards',origin:'manual'}};
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_biochemical_liquid',parameters});await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);await configure(fx);await setMode(fx,'low-velocity');
  for(const lang of ['ru','en']){game.i18n.lang=lang;const profile=fx.profile(),data=ammunitionChatData(profile),html=ammunitionChatHTML(profile,escapePayload);
    assert.ok(data.lines.length<=3);assert.match(html,/Low Velocity/);assert.match(html,/−3/);assert.match(html,/UT139/);assert.match(html,/Custom HT/);assert.match(html,/17/);
    assert.ok(html.includes(escapePayload(p.type.recipe.parameters.note)));assert.ok(html.includes(p.type.recipe.parameters.description));assert.doesNotMatch(html,/<details[^>]*\bopen|Basic Set|Non-Rechargeable|capacityUnits/);
  }game.i18n.lang='ru';const result=await shoot(fx);assert.match(result.message.content,/Low Velocity/);
});

test('LP historical shots and attack IDs survive later mode/execution changes without repeated consumption',async()=>{
  const fx=await ready(),result=await shoot(fx),old=JSON.stringify(result.snapshot);await setMode(fx,'boosted');await configure(fx,'ordinary');await configure(fx,'etc');await configure(fx);
  const before=JSON.stringify(fx.state());
  assert.equal(JSON.stringify(result.snapshot),old);await shoot(fx,1,{attackId:result.snapshot.attackId});assert.equal(JSON.stringify(fx.state()),before);

});

test('all 2484 pairs and source statuses remain; precisely 18 LP configurations become available',async()=>{
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract()),rows=matrix.rows.filter(r=>r.candidateId==='liquid_propellant');
  assert.equal(matrix.rows.length,2484);assert.equal(rows.filter(r=>r.status==='conditional').length,22);
  assert.equal(rows.filter(r=>r.implementation==='available').length,18);assert.equal(matrix.summary.available,821);assert.equal(matrix.summary.blocked,5);
  assert.equal(matrix.rows.filter(r=>r.candidateId==='etc'&&r.implementation==='blocked').length,1);
  assert.equal(rows.find(r=>r.configurationId===storm+':storm-rifle-magazine').implementation,'blocked');
  assert.equal(rows.find(r=>r.configurationId===shotgun).status,'undetermined');assert.equal(Object.keys(LP_PROFILES).length,18);
});
test('malformed modes, inherited object keys and composite unverified baselines never produce invented ballistics',async()=>{
  for(const id of ['constructor','__proto__','toString','unknown'])assert.equal(lpAdmission(id,catalogs).allowed,false);
  for(const mode of ['constructor','__proto__','invalid'])assert.throws(()=>lpBallistics({damage:'6d pi',range:'700/4000'},rifle,mode));
  for(const raw of [{damage:'3d cr ex',range:'700/4000'},{damage:'6d pi',range:'unknown'},{damage:'6d pi',range:'700/4000',linked:'1d burn'}])assert.throws(()=>lpBallistics(raw,rifle));
});
