import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture,catalogs} from './helpers/gauss-context.mjs';
import {SONIC_SHURIKEN as S} from '../scripts/ut-sonic-shuriken-source.js';
import {readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {sonicManagementHTML} from '../scripts/tools/ut-sonic-shuriken.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {standaloneModelOptions} from '../scripts/tools/standalone-weapon-configuration.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
const fixture=async()=>{const f=await gaussFixture(S.modeId);f.actor.system.attributes.ST={value:12};f.actor.system.thrust='1d-1';return f;};
const op=(f,operation,extra={})=>f.service.sonicResourceOperation(f.weapon().id,{operation,requestId:crypto.randomUUID(),expectedThrownId:f.weapon().sonicThrownId??null,expectedPayload:f.weapon().sonicPayload??null,...extra});
test('UT166 exact source mode, skill/defaults, no Rcl, current ST/thr and divisor frozen at attack',async()=>{
 const m=catalogs.getMode(S.modeId),f=await fixture();
 assert.equal(m.raw_calc.damage,'thr(3) cut');assert.equal(m.stats.shots,'T(1)');assert.equal(m.stats.recoil,null);
 assert.equal(m.stats.accuracy,'1');assert.equal(m.stats.bulk,'0');assert.equal(m.stats.strength,'5');
 assert.deepEqual(m.defaults.map(d=>[d.type,d.name,d.modifier]),[['skill','Thrown Weapon',0],['dx',undefined,-4],['skill','Throwing',-2]]);
 assert.equal(f.attack().level,14);assert.equal(f.attack().readinessReason,null);assert.equal(f.attack().data.rcl,null);
 assert.equal(f.profile().damage.formula,'1d-1(3) cut');assert.equal(f.profile().effective.range,'6/12');
 assert.equal(f.profile().damage.rules.ballisticRange.minimum,null);assert.equal(f.profile().damage.rules.ballisticRange.halfDamage,6);
 const display=withRuntimeAmmoStats(f.attack(),f.actor,f.state());assert.equal(display.data.range,'6/12');assert.equal(display.ammunitionRange,null);
 const r=await f.shoot();assert.equal(r.receipt.power.spent,1);assert.equal(readWeaponBattery(f.weapon()).charge,0);assert.ok(f.weapon().sonicThrownId);
 assert.equal(r.message.rolls.length,1);const frozen=JSON.stringify(r.snapshot);
 f.actor.system.thrust='2d';f.actor.system.attributes.ST.value=20;assert.equal(f.profile().damage.formula,'2d(3) cut');assert.equal(JSON.stringify(r.snapshot),frozen);
 assert.equal(r.snapshot.profile.damage.formula,'1d-1(3) cut');
});
test('physical return and battery replacement are independent; F5/settings/stale saves never refill',async()=>{
 const f=await fixture(),stale=f.state(),r=await f.shoot(),before=JSON.stringify(f.state());
 await assert.rejects(()=>f.shoot());await f.shoot(1,{attackId:r.snapshot.attackId});assert.equal(JSON.stringify(f.state()),before);
 await f.service.saveState(stale);await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()).charge,0);assert.ok(f.weapon().sonicThrownId);
 await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).charge,2);await assert.rejects(()=>f.shoot());
 await op(f,'return');assert.equal(readWeaponBattery(f.weapon()).charge,2);
 const nr=await f.shoot();assert.equal(nr.receipt.power.spent,2);assert.equal(readWeaponBattery(f.weapon()).charge,0);
 await op(f,'return');await assert.rejects(()=>f.shoot());await f.battery();await f.shoot();
});
test('two simultaneous throws, cancellation, missing/corrupt battery, owner and stale return are guarded',async()=>{
 const f=await fixture();await f.shoot(1,{cancel:true});assert.equal(readWeaponBattery(f.weapon()).charge,1);assert.ok(!f.weapon().sonicThrownId);
 const results=await Promise.allSettled([f.shoot(),f.shoot()]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const thrown=f.weapon().sonicThrownId;await op(f,'return');await f.battery();await f.shoot();
 await assert.rejects(()=>op(f,'return',{expectedThrownId:thrown}));
 f.actor.isOwner=false;await assert.rejects(()=>op(f,'return'));await assert.rejects(()=>f.battery());f.actor.isOwner=true;
 await op(f,'return');const state=f.state();delete state.weapons[0].sonicShurikenBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);
 await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());await f.battery();assert.equal(readWeaponBattery(f.weapon()).charge,1);
});
test('chemical construction explicitly loads exactly two existing doses and snapshots manual follow-up',async()=>{
 const f=await fixture();await assert.rejects(()=>op(f,'payload',{chemicalId:'custom'}));
 const draft=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]});draft.setOverride(S.modeId,'sonicChemical','enabled');await f.definitions.save(draft);await f.service.loadState();
 assert.equal(f.weapon().sonicChemical,'enabled');
 await assert.rejects(()=>op(f,'payload',{chemicalId:'smoke'}));
 await op(f,'payload',{chemicalId:'sleep_poison',note:'Две дозы <личное>'});assert.equal(f.weapon().sonicPayload.doses,2);
 assert.match(sonicManagementHTML(f.weapon(),String),/value="sleep_poison" selected/);
 const disable=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]});disable.setOverride(S.modeId,'sonicChemical','');
 const stored=JSON.stringify(f.definitions.list());await assert.rejects(()=>f.definitions.save(disable));assert.equal(JSON.stringify(f.definitions.list()),stored);
 await assert.rejects(()=>op(f,'payload',{chemicalId:'custom'}));
 const r=await f.shoot();assert.equal(r.snapshot.profile.damage.rules.sonicShuriken.payload.doses,2);assert.equal(f.weapon().sonicPayload,null);
 assert.equal(r.snapshot.profile.damage.rules.sonicFollowUp.requiresPenetration,true);assert.equal(r.snapshot.profile.damage.rules.resistanceEffect,undefined);
 assert.equal(r.profile.damage.components.length,1);assert.equal(r.profile.damage.rules.sonicShuriken.constructionCost,450);
 const data=ammunitionChatData(r.profile);assert.ok(data.lines.length<=3);assert.equal(data.fields[0].value,'Две дозы <личное>');
 for(const lang of ['ru','en']){game.i18n.lang=lang;assert.match(sonicManagementHTML(f.weapon(),String),/Вернуть подобранный сюрикен/);}
});
test('TL10 construction is filtered and service-guarded; old inventory survives lower TL',async()=>{
 const f=await fixture();await f.actor.setFlag('olegurps-qol','campaignTL',9);
 const d=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged'});d.query='Sonic Shuriken';assert.ok(!standaloneModelOptions(d).includes(S.equipmentId));
 d.selectModel(S.equipmentId);await assert.rejects(()=>new StandaloneWeaponService(f.actor,catalogs).save(d),/TL10/);
 const existing=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]});assert.ok(standaloneModelOptions(existing).includes(S.equipmentId));
 await f.definitions.save(existing);await f.service.loadState();assert.equal(f.weapon().sonicShurikenBattery.charge,1);
 await f.actor.setFlag('olegurps-qol','campaignTL',10);await f.definitions.save(d);
});
test('missing basic thrust blocks UI and service; wrong formulas and ranges cannot reach execution',async()=>{
 const f=await fixture();delete f.actor.system.thrust;assert.ok(f.attack().readinessReason);await assert.rejects(()=>f.shoot());
 f.actor.system.thrust='1d-1';const p=structuredClone(f.profile());p.damage.formula='3d cut';let executed=false;
 await assert.rejects(()=>f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:p}),execute:async()=>{executed=true;return {rolled:true};}}));assert.equal(executed,false);
 assert.equal(readWeaponBattery(f.weapon()).charge,1);
});
