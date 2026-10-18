import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,resolver,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {ammunitionCandidates,ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {ETC_PROFILES,etcAdmission,etcBallistics} from '../scripts/tools/ut-etc.js';
import {weaponPowerProfile,readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {weaponResourceReason,weaponResourceHTML} from '../scripts/tools/weapon-resources.js';
import {uawPowerOwner,uawWeaponView,uawManagerWeapons} from '../scripts/tools/ut-uaw.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {WeaponConfigurationDraft} from '../scripts/tools/weapon-configuration.js';
import {changedAmmunitionCards} from '../scripts/tools/weapon-assistant-app.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {STORM_MODE,stormFeed,adaptStormFeeds} from '../scripts/tools/ut-storm-feeds.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {LP_PROFILES} from '../scripts/tools/ut-liquid-propellant.js';

const main='WtM51JNSpOUIy3Eo1',shotgun='WRvS5pz3LMCzqQyiZ',tank='WOMuCBSS_c_nIstvm',underbarrel='WkudgdqO3lymAYks5';
const shotguns=[['W8mzf5YoC9fFjAhO2',50,450,'8d-1 pi++','2d pi'],['WwK7xKN4sLQXIuQ64',100,800,'8d-1 pi++','2d pi'],['Wap9nUEQPwuDkUEUp',50,330,'6d pi++','1d+2 pi']];
const configure=async(v,variant='etc')=>{const state=v.state();state.weapons.find(w=>w.id===v.carrier.id).executionRequest={variant,modeId:v.carrier.standaloneModeId};await v.service.saveState(state);};
const owner=v=>uawPowerOwner(v.state(),v.weapon());
const replace=(v,nr=false,args={})=>v.service.replaceBattery(v.carrier.id,{nonRechargeable:nr,expectedBattery:batteryExpectation(owner(v)),requestId:crypto.randomUUID(),...args});
const policy=async(enabled,run)=>{const old=game.user;game.user={...old,getFlag:()=>enabled};try{return await run();}finally{game.user=old;}};
function view(fx,modeId){
  const carrier=fx.state().weapons.find(w=>w.standaloneModeId===modeId),weapon=()=>fx.state().weapons.find(w=>w.id===carrier.id),attack=()=>readStandaloneAttack(fx.actor,fx.record.id,modeId);
  return {...fx,carrier,weapon,attack,candidates:()=>ammunitionCandidates(fx.actor,weapon(),api),
    transaction:(op,args)=>fx.service.inventoryTransaction(carrier.id,op,args,{allowedTypes:w=>ammunitionCandidates(fx.actor,w,api)}),
    profile:(context={})=>resolver.resolve({actorId:fx.actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,state:fx.state(),
      binding:standaloneCatalogBinding(attack(),catalogs),ammunition:fx.service.readAttackAmmunition(carrier.id),profilePolicy:'permissive',context})};
}
async function dual(){const fx=await fixture(main);await fx.service.loadState();return [view(fx,main),view(fx,shotgun)];}
async function select(v,variant=null,parameters={},rounds=8){
  const w=v.weapon(),mag=w.ammunitionInventory.magazines.find(m=>m.id===w.ammunitionInventory.installedId);
  if(mag?.rounds)await v.transaction('unload',{magazineId:mag.id,amount:mag.rounds});
  const base=v.candidates().find(t=>!t.recipe&&!t.unavailable),p=variant?automatic.prepare({modeId:v.carrier.standaloneModeId,base,variantId:variant,parameters}):null;
  if(p)assert.equal(p.state,'complete',p.reasons);const type=p?.type??base;
  if(p&&!v.weapon().ammunitionInventory.stocks.some(s=>s.key===type.key))await v.transaction('save-recipe',{type});
  await load(v,type,rounds);return type;
}
const activate=v=>v.transaction('install',{magazineId:v.weapon().ammunitionInventory.installedId??v.weapon().ammunitionInventory.magazines[0].id});

for(const [id,capacity,price,damage,shotDamage]of shotguns)for(const enabled of [true,false])
test('ETC PC shotgun B cell, unchanged source stats and source-first Shotshell '+id+' B269='+enabled,()=>policy(enabled,async()=>{
  const v=await fixture(id);await select(v);const ordinary=v.profile();await configure(v);const p=v.profile();
  assert.equal(readWeaponBattery(v.weapon()).type,'B');assert.equal(readWeaponBattery(v.weapon()).capacity,capacity);
  assert.equal(p.damage.formula,damage);assert.equal(p.effective.range,'150/750');assert.equal(p.weaponConfiguration.weaponPrice,price*2);
  for(const k of ['rof','rcl','acc','shots','bulk','st'])assert.equal(p.effective[k],ordinary.effective[k]);
  await select(v,'ut_shotshell');const s=v.profile();assert.equal(s.damage.formula,shotDamage);assert.equal(s.effective.range,'75/375');assert.equal(s.effective.rcl,1);
  const out=await shoot(v,2);assert.equal(out.spent,2);assert.equal(out.receipt.power.spent,2);assert.equal(out.rollData.rof,'18');assert.equal(out.snapshot.profile.damage.formula,shotDamage);
  await replace(v,true);assert.equal(v.weapon().etcBattery.capacity,capacity*2);await shoot(v);assert.equal(v.weapon().etcBattery.charge,capacity*2-1);
  assert.ok(ammunitionChatData(s).lines.length<=3);assert.deepEqual(v.actor.system,v.before);
}));

test('Underbarrel Shotgun ETC stays blocked; other PC shotgun decisions do not propagate from a host',async()=>{
  const v=await fixture(underbarrel),before=JSON.stringify(v.state());await assert.rejects(configure(v),/схема питания/);assert.equal(JSON.stringify(v.state()),before);assert.equal(etcAdmission(underbarrel,catalogs).allowed,false);
});

test('UAW one configuration, one B400 cell and 3 + 2 + 1 sequential physical shots',async()=>{
  const [a,b]=await dual();await select(a);await select(b);await configure(b);
  assert.equal(a.weapon().executionVariant,'etc');assert.equal(b.weapon().etcBattery,undefined);assert.equal(b.weapon().executionVariant,undefined);
  assert.equal(a.state().weapons.filter(w=>Object.hasOwn(w,'etcBattery')).length,1);
  assert.equal(a.profile().damage.formula,'4d+2 pi+');assert.equal(a.profile().effective.range,'300/3150');assert.equal(a.profile().weaponConfiguration.weaponPrice,4200);
  const savedB=JSON.stringify(b.weapon().ammunitionInventory);await activate(a);let r=await shoot(a,3);assert.equal(r.receipt.power.after,397);assert.equal(JSON.stringify(b.weapon().ammunitionInventory),savedB);
  await activate(b);r=await shoot(b,2);assert.equal(r.receipt.power.before,397);assert.equal(r.receipt.power.after,395);assert.equal(r.receipt.power.ownerWeaponId,a.carrier.id);
  await activate(a);r=await shoot(a);assert.equal(r.receipt.power.after,394);assert.equal(a.weapon().etcBattery.charge,394);
  assert.equal(a.weapon().capacity,41);assert.equal(b.weapon().capacity,6);
  await activate(b);const display=uawManagerWeapons(b.state());assert.equal(display.length,1);assert.equal((weaponResourceHTML(display[0],false,escapePayload).match(/gam-battery-icon/g)??[]).length,1);
  const draft=new WeaponConfigurationDraft({actor:a.actor,state:a.state(),attacks:[],existing:b.weapon(),catalogs});
  assert.equal(draft.executionModeId,main);assert.equal(draft.previewStats(shotgun).stats.damage,'8d-1 pi++');assert.equal(draft.previewStats(shotgun).stats.range,'150/750');
});

for(const enabled of [true,false])test('UAW ETC Shotshell uses HT166 after ETC and spends shells/cell once B269='+enabled,()=>policy(enabled,async()=>{
  const [a,b]=await dual();await configure(a);await select(b,'ut_shotshell');await activate(b);const p=b.profile();
  assert.equal(p.raw.damage,'4d+4 pi++');assert.equal(p.weaponConfiguration.converted.damage,'8d-1 pi++');assert.equal(p.damage.formula,'2d pi');
  assert.equal(p.effective.range,'75/375');assert.equal(p.effective.rof,'2x9');assert.equal(p.effective.rcl,1);assert.equal(p.effective.shots,'5+1(3i)');
  const overlay=withRuntimeAmmoStats(b.attack(),b.actor);assert.equal(overlay.data.damage,'2d pi');assert.equal(withRuntimeAmmoStats(overlay,b.actor).data.damage,'2d pi');
  const r=await shoot(b,2);assert.equal(r.spent,2);assert.equal(r.receipt.power.spent,2);assert.equal(a.weapon().etcBattery.charge,398);assert.equal(r.rollData.rof,'18');
  const saved=JSON.stringify(r.snapshot),state=JSON.stringify(b.state());await shoot(b,2,{attackId:r.snapshot.attackId});assert.equal(JSON.stringify(b.state()),state);assert.equal(JSON.stringify(r.snapshot),saved);
}));

test('UAW B800 replacement through either barrel, stale dialogs, reload and off/on never recharge',async()=>{
  const [a,b]=await dual();await select(a);await select(b);await configure(a);await activate(b);await shoot(b);
  const stale=b.state(),expect=batteryExpectation(owner(b));await replace(b,true);assert.equal(a.weapon().etcBattery.capacity,800);assert.equal(b.weapon().etcBattery,undefined);
  await assert.rejects(replace(a,false,{expectedBattery:expect}),/измен/);await shoot(b);await a.service.saveState(stale);await new AmmoService(a.actor).loadState();assert.equal(a.weapon().etcBattery.charge,799);
  await configure(b,'ordinary');assert.equal(a.weapon().executionVariant,'ordinary');assert.equal(b.profile().weaponConfiguration,undefined);
  await configure(b);assert.equal(a.weapon().etcBattery.charge,799);assert.equal(a.state().weapons.filter(w=>Object.hasOwn(w,'etcBattery')).length,1);
});

test('UAW shared zero or missing charge blocks both barrels before native execution; confirmed replacement repairs it',async()=>{
  const [a,b]=await dual();await select(a);await select(b);await configure(a);let state=a.state();state.weapons.find(w=>w.id===a.carrier.id).etcBattery.charge=0;await a.actor.setFlag('world','gurpsAmmoManager',state);
  for(const v of [a,b]){await activate(v);assert.ok(weaponResourceReason(uawWeaponView(v.state(),v.weapon())));const before=JSON.stringify(v.state());await assert.rejects(shoot(v));assert.equal(JSON.stringify(v.state()),before);assert.ok(v.attack().readinessReason);}
  state=a.state();delete state.weapons.find(w=>w.id===a.carrier.id).etcBattery;await a.actor.setFlag('world','gurpsAmmoManager',state);
  await configure(b,'ordinary');await configure(b);assert.equal(a.weapon().etcBattery,undefined);await replace(b);assert.equal(a.weapon().etcBattery.charge,400);
});

for(const [variant,off,on,range,secondary]of [
  ['ut_aphc','8d-1(2) pi+','8d-1(2) pi+','150/750',[]],
  ['ut_apds','8d+7(2) pi+','10d(2) pi+','225/1125',[]],
  ['ut_apep','8d-1(3) pi+','8d-1(3) pi+','300/1500',[]],
  ['ut_aphex','8d-1(2) pi++','8d-1(2) pi++','150/750',['1d-1 cr ex','1d cut']],
  ['ut_he','8d-1(0.5) pi++','8d-1(0.5) pi++','150/750',['2d+2 cr ex','1d cut']],
  ['ut_hec','8d-1(0.5) pi++','8d-1(0.5) pi++','150/750',['2d+2 cr ex']],
  ['ut_memory_baton','8d-1(0.25) cr dkb','8d-1(0.25) cr dkb','30/150',[]]
])for(const enabled of [true,false])test('UAW ETC '+variant+' source-first profile and independent components B269='+enabled,()=>policy(enabled,async()=>{
  const [a,b]=await dual();await configure(a);await select(b,variant,{availabilityTL:9});await activate(b);const p=b.profile();
  assert.equal(p.damage.formula,enabled?on:off);assert.equal(p.effective.range,range);assert.deepEqual(p.damage.components.filter(c=>c.role!=='kinetic').map(c=>c.formula),secondary);
  const r=await shoot(b);assert.equal(r.spent,1);assert.equal(r.receipt.power.spent,1);assert.equal(r.snapshot.profile.damage.formula,p.damage.formula);
}));

test('UAW concurrent bursts serialize shared energy; native-time battery changes cancel atomic expenditure',async()=>{
  const [a,b]=await dual();await select(b);await configure(a);await activate(b);let state=b.state();state.weapons.find(w=>w.id===a.carrier.id).etcBattery.charge=3;await a.actor.setFlag('world','gurpsAmmoManager',state);
  const outcomes=await Promise.allSettled([shoot(b,2),shoot(b,2)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(a.weapon().etcBattery.charge,1);
  await replace(a);const rounds=b.weapon().totalAmmo;
  await assert.rejects(b.service.executeShot({weaponId:b.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:b.profile()}),execute:async()=>{
    const current=b.state();current.weapons.find(w=>w.id===a.carrier.id).etcBattery.charge--;await b.actor.setFlag('world','gurpsAmmoManager',current);return {rolled:true};
  }}),/BatteryChangedDuringAttack/);assert.equal(b.weapon().totalAmmo,rounds);
});

test('UAW deferred physical burst spends the one owner cell exactly once',async()=>{
  const [a,b]=await dual();await select(b);await configure(a);await activate(b);let state=b.state();state.sprayingFireSessions={test:{ammoConsumed:false}};await b.actor.setFlag('world','gurpsAmmoManager',state);
  const r=await b.service.executeShot({weaponId:b.carrier.id,attackId:crypto.randomUUID(),deferConsumption:true,sessionKey:'test',prepare:()=>({amount:2,profile:b.profile()}),execute:()=>({rolled:true})});
  assert.equal(r.spent,0);assert.equal(a.weapon().etcBattery.charge,400);
  await b.transaction('consume',{sessionKey:'test',magazineId:b.weapon().ammunitionInventory.installedId,amount:2});assert.equal(a.weapon().etcBattery.charge,398);
  await assert.rejects(b.transaction('consume',{sessionKey:'test',magazineId:b.weapon().ammunitionInventory.installedId,amount:2}));assert.equal(a.weapon().etcBattery.charge,398);
});

test('UAW battery-only changes refresh the currently displayed other barrel card',async()=>{
  const [a,b]=await dual();await configure(a);await select(b);await activate(b);const before=b.state();await a.service.spendWeaponCharge(a.carrier.id,1);const after=b.state();
  assert.deepEqual(changedAmmunitionCards(before,after,{flags:{world:{gurpsAmmoManager:after}}}),[b.carrier.id]);
});

test('Storm both table feeds share C600/1200 independent of manual motor and later LP state',async()=>{
  const v=await fixture(STORM_MODE);await select(v);const belt=v.weapon().ammunitionInventory.installedId;await v.transaction('add-magazines',{amount:1,capacity:13});const alt=v.weapon().ammunitionInventory.magazines.at(-1);
  const base=v.candidates().find(t=>!t.recipe);await v.transaction('add-stock',{ammoKey:base.key,amount:8});await v.transaction('load',{magazineId:alt.id,ammoKey:base.key,amount:8});await configure(v);
  assert.equal(v.weapon().etcBattery.type,'C');assert.equal(v.weapon().etcBattery.capacity,600);assert.equal(v.profile().effective.shots,'60(5)');await shoot(v,3);
  assert.equal(v.profile().damage.formula,'6dx2 pi+');assert.equal(v.profile().effective.range,'1950/8700');assert.equal(v.profile().weaponConfiguration.weaponPrice,22000);
  await v.transaction('install',{magazineId:alt.id});assert.equal(v.profile().effective.shots,'12+1(3)');assert.equal(withRuntimeAmmoStats(v.attack(),v.actor).data.shots,'12+1(3)');const shot=await shoot(v,2);assert.equal(shot.receipt.power.after,595);assert.equal(shot.receipt.power.nominalCapacity,60);
  await replace(v,true);assert.equal(v.weapon().etcBattery.capacity,1200);await configure(v,'ordinary');assert.equal(weaponPowerProfile(v.weapon()),null);assert.equal(v.profile().effective.shots,'12+1(3)');
  await configure(v,'lp');assert.equal(v.weapon().lpFuel.capacityUnits,1080);await assert.rejects(shoot(v),/основную подачу/);
  await v.transaction('install',{magazineId:belt});assert.equal(v.profile().effective.shots,'90(5)');assert.equal(v.weapon().lpFuel.remainingUnits,1080);await shoot(v);assert.equal(v.weapon().lpFuel.remainingUnits,1076);
  await configure(v);await v.transaction('install',{magazineId:alt.id});assert.equal(v.weapon().etcBattery.charge,1200);assert.equal(v.profile().effective.shots,'12+1(3)');assert.equal(v.weapon().lpFuel.remainingUnits,1076);
  const html=ammoManagementHTML(v.weapon(),{language:'en'},v.candidates());assert.match(html,/name="newCapacity"/);assert.match(html,/value="13"/);assert.match(html,/value="60"/);assert.doesNotMatch(html,/value="30"/);
});

for(const rounds of [0,8,30])test('legacy Storm alternate30 preserves '+rounds+' rounds, lots and history while enforcing new13 nominal',async()=>{
  const v=await fixture(STORM_MODE);await select(v);const state=v.state(),w=state.weapons[0],base=v.candidates().find(t=>!t.recipe),old={id:'old-alt',weaponId:w.id,capacity:30,rounds,ammoKey:base.key};
  w.ammunitionInventory.magazines.push(old);w.ammunitionInventory.installedId=old.id;w.totalAmmo+=rounds;const original=JSON.stringify(state);await v.actor.setFlag('world','gurpsAmmoManager',state);
  const loaded=await v.service.loadState(),mag=loaded.weapons[0].ammunitionInventory.magazines.find(m=>m.id===old.id);assert.equal(mag.rounds,rounds);assert.equal(mag.capacity,Math.max(13,rounds));assert.equal(mag.ammoKey,base.key);assert.equal(mag.sourceFeed.loadedCapacity,13);
  assert.equal(JSON.stringify(v.state()),original);assert.equal(v.profile().effective.shots,'12+1(3)');
  if(rounds===30){await assert.rejects(v.transaction('load',{magazineId:old.id,ammoKey:base.key,amount:1}),/CapacityExceeded/);const r=await shoot(v);assert.equal(r.spent,1);assert.equal(v.weapon().ammunitionInventory.magazines.find(m=>m.id===old.id).rounds,29);}
  await assert.rejects(v.transaction('add-magazines',{amount:1,capacity:30}),/CapacityExceeded/);
  const read=v.weapon();adaptStormFeeds(read);const once=JSON.stringify(read);adaptStormFeeds(read);assert.equal(JSON.stringify(read),once);
});

test('Tank ETC uses HT166 6dx38, native physical100mm, price/range, no battery or power rejection',async()=>{
  const v=await fixture(tank);await select(v);const ordinary=v.profile();await configure(v);const p=v.profile();
  assert.equal(p.damage.formula,'6dx38 pi++');assert.equal(p.effective.range,'4500/15000');assert.equal(p.effective.shots,'1(4)');assert.equal(p.weaponConfiguration.weaponPrice,200000);
  assert.equal(v.weapon().etcBattery,undefined);assert.equal(weaponPowerProfile(v.weapon()),null);assert.equal(weaponResourceHTML(v.weapon(),false,escapePayload),'');assert.equal(v.attack().readinessReason,null);
  const r=await shoot(v);assert.equal(r.spent,1);assert.equal(r.receipt.power,undefined);assert.equal(r.snapshot.profile.resource.power,undefined);await assert.rejects(replace(v));
  const old=JSON.stringify(r.snapshot);await configure(v,'ordinary');assert.equal(v.profile().damage.formula,ordinary.damage.formula);assert.equal(v.profile().effective.range,ordinary.effective.range);await assert.rejects(configure(v,'lp'));assert.equal(JSON.stringify(r.snapshot),old);
});

test('all newly admitted modes and feeds cover every available ammunition with native preparation, expenditure and frozen components',async()=>{
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract());let checked=0;
  for(const configuration of [...shotguns.map(r=>r[0]),main,shotgun,STORM_MODE,STORM_MODE+':storm-rifle-magazine',tank]){
    const id=configuration.split(':')[0];
    let v;if([main,shotgun].includes(id)){const pair=await dual();v=pair[id===main?0:1];}else v=await fixture(id);
    await configure(v);
    if(configuration!==id){await v.transaction('add-magazines',{amount:1,capacity:13});await v.transaction('install',{magazineId:v.weapon().ammunitionInventory.magazines.at(-1).id});}
    for(const row of matrix.rows.filter(r=>r.configurationId===configuration&&r.implementation==='available'&&!['etc','liquid_propellant'].includes(r.candidateId))){
      await select(v,row.recipeVariant,{availabilityTL:row.availabilityTL,...row.recipeParameters,note:'Owner lot'},2);await activate(v);
      const p=v.profile({manualGuidanceConfirmed:true,shotgun:{physicalDistance:40}});assert.equal(p.damage.nativeSafe,true,id+':'+row.candidateId+':'+p.damage.reason);
      const type=v.service.readAttackAmmunition(v.carrier.id).type,args={actorId:v.actor.id,weaponId:v.carrier.id,attack:v.attack(),rawAttack:v.attack().data,binding:standaloneCatalogBinding(v.attack(),catalogs),ammunition:{kind:'physical-magazine',type,ammoKey:type.key,available:1,total:1},profilePolicy:'permissive'};
      const ordinary=resolver.resolve({...args,state:{weapons:[]}});
      for(const c of ordinary.damage.components.filter(c=>['linked','follow-up','fragmentation'].includes(c.role)))assert.equal(p.damage.components.find(n=>n.role===c.role)?.formula,c.formula);
      if(['shaped_charge','hemp','sefop','thermobaric','plasma','emp','force','flare'].includes(row.candidateId))assert.equal(p.damage.formula,ordinary.damage.formula);
      const r=await shoot(v,1,{context:{manualGuidanceConfirmed:true,shotgun:{physicalDistance:40}}});assert.equal(r.spent,1);assert.equal(r.snapshot.profile.damage.formula,p.damage.formula);
      if(id===tank)assert.equal(r.receipt.power,undefined);else assert.equal(r.receipt.power.spent,1);assert.ok(ammunitionChatData(p).lines.length<=3);checked++;
    }
  }
  assert.ok(checked>150,checked);
});

test('new ETC TL9 and owner authority keep foreign Actors protected, without GM approvals',async()=>{
  const v=await fixture(shotguns[0][0]),user=game.user;game.user={id:'owner',isGM:false};
  try{await v.actor.setFlag('olegurps-qol','campaignTL',8);await assert.rejects(configure(v));await v.actor.setFlag('olegurps-qol','campaignTL',9);await configure(v);await select(v);await shoot(v);
    v.actor.isOwner=false;const before=JSON.stringify(v.state());await assert.rejects(shoot(v));await assert.rejects(replace(v));await assert.rejects(configure(v,'ordinary'));assert.equal(JSON.stringify(v.state()),before);
  }finally{game.user=user;}
});

test('2484 rows preserve eight ETC decisions alongside the approved UT16 source changes',async()=>{
  const contract=await loadUTSourceContract(),m=buildUTMatrix(catalogs,contract),rows=m.rows.filter(r=>r.candidateId==='etc');
  assert.equal(m.rows.length,2484);assert.equal(m.summary.available,821);assert.equal(m.summary.blocked,5);assert.equal(m.summary.undetermined,5);
  assert.equal(createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(m.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'),contract.sourceStatusDigestBeforeUAW);
  assert.deepEqual(rows.filter(r=>r.implementation==='blocked').map(r=>r.modeId),[underbarrel]);assert.equal(m.rows.filter(r=>r.candidateId==='liquid_propellant'&&r.implementation==='blocked').length,4);
  const added=[...shotguns.map(r=>r[0]),main,shotgun,STORM_MODE,STORM_MODE+':storm-rifle-magazine',tank];assert.equal(rows.filter(r=>added.includes(r.configurationId)&&r.implementation==='available').length,8);
  assert.deepEqual(JSON.parse(await readFile(new URL('../data/ut-weapon-ammunition-matrix.json',import.meta.url),'utf8')),m);assert.equal(LP_PROFILES[tank],undefined);
  assert.ok(Array.isArray(m.userDecisions));assert.deepEqual(m.userDecisions.slice(0,contract.userDecisions.length),contract.userDecisions);
  assert.equal(m.userDecisions.at(-2).id,'etc_blocker_resolution');
});
