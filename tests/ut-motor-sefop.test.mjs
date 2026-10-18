import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import { LP_PROFILES } from '../scripts/tools/ut-liquid-propellant.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fixture,load,shoot,catalogs,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {UT_MANUAL_MOTOR_POWER,UT_CONVENTIONAL_DEFERRED} from '../scripts/tools/ut-conventional-ammunition.js';
import {ETC_PROFILES} from '../scripts/tools/ut-etc.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {utPayloadEditorHTML,utPayloadChatHTML} from '../scripts/tools/ut-special-ammunition.js';
import {calculateHitsFromMargin} from '../scripts/tools/prepared-gga-roll.js';
import {UT_SEFOP_GUIDANCE} from '../scripts/tools/ut-sefop.js';
import {ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
const sourceDigest=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex');
const effect=p=>resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(p.facts.modeId)),variantId:p.type.recipe.variantId,baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
test('source statuses remain pinned; every manually powered motor and exact physical family is explicitly authorized',()=>{
  assert.equal(sourceDigest(beforeUT16SourceRows(matrix.rows)),contract.sourceStatusDigestBeforeMotorSEFOP);
  assert.deepEqual(Object.keys(UT_MANUAL_MOTOR_POWER).sort(),contract.userDecisions.find(d=>d.id==='motor_power_manual').modeIds.toSorted());
  for(const id of Object.keys(UT_MANUAL_MOTOR_POWER))assert.equal(UT_CONVENTIONAL_DEFERRED[id],undefined);
  for(const id of ['WtM51JNSpOUIy3Eo1','WRvS5pz3LMCzqQyiZ'])assert.equal(UT_CONVENTIONAL_DEFERRED[id],undefined);
});
test('every available motor round executes the owner stock -> load -> GGA check -> physical spend pipeline without energy',async()=>{
  game.user.isGM=false;let exercised=0;
  try{for(const row of matrix.rows.filter(r=>UT_MANUAL_MOTOR_POWER[r.modeId]&&r.configurationId===r.modeId&&r.implementation==='available'&&!['etc','liquid_propellant'].includes(r.candidateId))){
    const fx=await fixture(row.modeId),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
    assert.equal(base.ammoId,row.ammoFamilyId);assert.equal(fx.attack().readinessReason,null);
    const window=ammoManagementHTML(fx.weapon(),{language:'en',ammoKey:base.key,magazineId:fx.weapon().ammunitionInventory.installedId},fx.candidates());
    assert.doesNotMatch(window,/B cell|C cell|батаре|питани.*мотор/i);
    const p=row.recipeVariant?automatic.prepare({modeId:row.modeId,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters,note:'Owner lot'}}):null;
    const type=p?.type??base;if(p){assert.equal(p.state,'complete');await fx.transaction('save-recipe',{type});}
    await load(fx,type);const expected=fx.profile(),before=fx.weapon().totalAmmo,result=await shoot(fx,1,{context:row.candidateId==='he_proximity'?{shotgun:{physicalDistance:40}}:{}});
    assert.equal(result.spent,1);assert.equal(fx.weapon().totalAmmo,before-1);assert.deepEqual(result.snapshot.profile.damage,expected.damage);
    assert.doesNotMatch(result.message.content.replaceAll(fx.actor.id,''),/cell|батаре|электрическ|питани|B414|B435|Осколки \(B|collateral/i);
    assert.equal(result.snapshot.ammunition.ammoId,row.ammoFamilyId);assert.deepEqual(fx.actor.system,fx.before);exercised++;
  }}finally{game.user.isGM=true;}
  assert.equal(exercised,matrix.rows.filter(r=>UT_MANUAL_MOTOR_POWER[r.modeId]&&r.configurationId===r.modeId&&r.implementation==='available'&&!['etc','liquid_propellant'].includes(r.candidateId)).length);
  assert.ok(exercised>50);
});
test('motor exemption leaves ETC/liquid independent; Paint Carbine requires its own accounted B cell',async()=>{
  for(const id of Object.keys(UT_MANUAL_MOTOR_POWER)){
    for(const candidate of ['etc','liquid_propellant']){
      const row=matrix.rows.find(r=>r.configurationId===id&&r.candidateId===candidate);
      const poweredETC=candidate==='etc'&&!!ETC_PROFILES[id],fuelledLP=candidate==='liquid_propellant'&&!!LP_PROFILES[id];
      assert.equal(row.implementation,poweredETC||fuelledLP?'available':'blocked',id+':'+candidate);
      if(poweredETC){assert.equal(row.application,'weapon-configuration-not-ammunition');assert.equal(row.weaponConfiguration.stateKey,'etcBattery');}
      else if(fuelledLP){assert.equal(row.application,'weapon-configuration-not-ammunition');assert.equal(row.weaponConfiguration.stateKey,'lpFuel');}
      else assert.ok(row.blocker);
    }
    const proximity=matrix.rows.find(r=>r.configurationId===id&&r.candidateId==='he_proximity');
    assert.equal(proximity.implementation,catalogs.getAmmoFamily('ut',proximity.ammoFamilyId).caliber_mm>=10?'available':'not-admitted');
  }
  for(const id of ['Wg_f0E5hqv6o1C0Uj']){
    const fx=await fixture(id);assert.ok(fx.candidates().some(t=>!t.unavailable));
    const state=fx.state();state.weapons[0].paintBattery.charge=0;await fx.actor.setFlag('world','gurpsAmmoManager',state);
    await assert.rejects(shoot(fx),/Батарея разряжена/);
  }
});
test('Storm Rifle 12+1 magazine and native cassette retain separate batches, exact CLR family and immutable shot',async()=>{
  const fx=await fixture('WmyROTLk0gs7lrYCE'),base=fx.candidates().find(t=>!t.recipe),a=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_aphex',parameters:{note:'A',batchId:'A'}}),b=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_aphex',parameters:{note:'B',batchId:'B'}});
  for(const p of [a,b])await fx.transaction('save-recipe',{type:p.type});
  const cassette=await load(fx,a.type,9);assert.equal(fx.weapon().ammunitionInventory.magazines[0].capacity,60);
  await fx.transaction('add-magazines',{amount:1,capacity:13});const magazine=fx.weapon().ammunitionInventory.magazines.at(-1);
  await fx.transaction('add-stock',{ammoKey:b.type.key,amount:8});await fx.transaction('load',{magazineId:magazine.id,ammoKey:b.type.key,amount:8});
  await assert.rejects(fx.transaction('load',{magazineId:magazine.id,ammoKey:a.type.key,amount:1}),/MixedTypes/);
  await fx.transaction('install',{magazineId:magazine.id});const before=fx.weapon().totalAmmo,result=await shoot(fx,3),saved=JSON.stringify(result.snapshot);
  assert.equal(result.spent,3);assert.equal(fx.weapon().totalAmmo,before-3);assert.equal(result.snapshot.profile.damage.rules.payload.note,'B');
  await fx.transaction('install',{magazineId:cassette});assert.equal(fx.service.readAttackAmmunition(fx.carrier.id).type.key,a.type.key);assert.equal(JSON.stringify(result.snapshot),saved);
  assert.equal(automatic.prepare({modeId:fx.carrier.standaloneModeId,base:{...base,ammoId:'10mm_cl'},variantId:'ut_aphex'}).state,'incomplete');
});
test('all SEFOP carriers and settings validate actual sensor size/TL, exact warhead table, pre-shot APHEX and source prices',()=>{
  for(const row of matrix.rows.filter(r=>r.configurationId===r.modeId&&r.candidateId==='sefop'&&r.implementation==='available')){
    const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId};
    for(const availabilityTL of [9,10,11,12])for(const [sefopGuidance,sensor]of Object.entries(UT_SEFOP_GUIDANCE)){
      const p=automatic.prepare({modeId:row.modeId,base,variantId:'ut_sefop',parameters:{availabilityTL,sefopGuidance}}),size=catalogs.getAmmoFamily('ut',row.ammoFamilyId).caliber_mm;
      const valid=sensor.minSizeByTL[availabilityTL]!=null&&size>=sensor.minSizeByTL[availabilityTL];
      assert.equal(p.state==='complete',valid,row.modeId+':'+sefopGuidance+':'+availabilityTL);
      if(!valid)continue;
      const e=effect(p);assert.equal(e.nativeSafe,true);assert.equal(e.rules.manualSEFOP.automaticGuidance,false);assert.equal(e.rules.manualSEFOP.projectileSkill,sensor.skill+availabilityTL-sensor.introductionTL);
      assert.equal(e.rules.costMultiplier,5);assert.equal(e.rules.guidanceCostFactor,1+sensor.surcharge);assert.equal(e.rules.costPerShot,null);
      assert.equal(automatic.prepare({modeId:row.modeId,base,variantId:'ut_sefop',savedType:p.type}).state,'complete');
    }
  }
  const modeId='WdUnAFzFvv59Smhhk',base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'25mm_cl'};
  const p=automatic.prepare({modeId,base,variantId:'ut_sefop',parameters:{availabilityTL:10}});assert.equal(effect(p).formula,'5d+5x3(3) cr inc');
  const aphex=automatic.prepare({modeId,base,variantId:'ut_sefop',parameters:{availabilityTL:10,sefopMode:'aphex'}});assert.equal(effect(aphex).formula,'10d(2) pi++');assert.deepEqual(effect(aphex).components.map(c=>c.formula),['10d(2) pi++','1d+1 cr ex','1d+1 cut']);
  for(const extra of [{availabilityTL:9,sefopMode:'aphex'},{sefopGuidance:'unknown'},{sefopAspect:'unknown'}])assert.equal(automatic.prepare({modeId,base,variantId:'ut_sefop',parameters:extra}).state,'incomplete');
  for(const row of matrix.rows.filter(r=>r.configurationId===r.modeId&&r.candidateId==='sefop'&&r.status==='incompatible'))assert.notEqual(automatic.prepare({modeId:row.modeId,base:{...base,ammoId:row.ammoFamilyId},variantId:'ut_sefop'}).state,'complete');
});
test('SEFOP stock, fields and registered shot are distinct from manual impact; native Damage link stays frozen',async()=>{
  game.user.isGM=false;
  try{const fx=await fixture('WdUnAFzFvv59Smhhk'),base=fx.candidates().find(t=>!t.recipe),p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_sefop',parameters:{availabilityTL:10,note:'Free content',description:'User description\nSecond line',savingThrow:'User resistance',sefopAspect:'side'}});
    await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);const result=await shoot(fx);
    assert.equal(result.spent,1);assert.equal(result.rollData.manualProjectileHit,true);assert.equal(result.rollData.rofrcl,null);assert.equal(calculateHitsFromMargin(10,2,10,result.rollData),null);
    const failedRegistration=await shoot(fx,1,{effectiveSkill:3});
    assert.equal(failedRegistration.rollData.failure,true);assert.equal(failedRegistration.rollData.rofrcl,null);
    assert.match(failedRegistration.message.content,/olegurps-sefop-manual-damage[^>]*>[^<]*\[.*D:/);
    assert.match(result.message.content,/Выстрел зарегистрирован/);assert.match(result.message.content,/попадание SEFOP — вручную/);assert.match(result.message.content,/D:"/);assert.doesNotMatch(result.message.content,/<details[^>]*\bopen|B413|B414|автоматически успешно/);
    const old=JSON.stringify(result.snapshot),next=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_sefop',parameters:{...p.type.recipe.parameters,note:'',description:'',sefopMode:'aphex'}});
    await fx.transaction('edit-recipe',{ammoKey:p.type.key,type:next.type});assert.equal(JSON.stringify(result.snapshot),old);assert.equal(result.snapshot.profile.damage.formula,'5d+5x3(3) cr inc');
  }finally{game.user.isGM=true;}
});
test('SEFOP editor, brief instructions and outcome labels remain Russian in actual ru/en dictionaries without battery UI',async()=>{
  const modeId='WdUnAFzFvv59Smhhk',base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'25mm_cl'},p=automatic.prepare({modeId,base,variantId:'ut_sefop'});
  const tl9Editor=utPayloadEditorHTML(p.type,p.type.recipe.parameters,escapePayload,{campaignTL:9});
  assert.doesNotMatch(tl9Editor,/value="multiscanner"|value="aphex"|value="multispectralPassive"/);
  const later=automatic.prepare({modeId,base,variantId:'ut_sefop',parameters:{availabilityTL:11}});
  assert.match(utPayloadEditorHTML(later.type,later.type.recipe.parameters,escapePayload,{campaignTL:11}),/value="multiscanner"/);
  for(const lang of ['ru','en']){game.i18n.lang=lang;const html=utPayloadEditorHTML(p.type,p.type.recipe.parameters,escapePayload);assert.match(html,/Наведение SEFOP/);assert.match(html,/Режим заряда/);assert.match(html,/Направление атаки/);assert.doesNotMatch(html,/GM|cell|батаре/);assert.doesNotMatch(utPayloadChatHTML({ammunition:p.type,damage:effect(p)},escapePayload),/<details[^>]*\bopen|B413|B414|cell/);}
  const ru=JSON.parse(await readFile(new URL('../lang/ru.json',import.meta.url))),en=JSON.parse(await readFile(new URL('../lang/en.json',import.meta.url)));assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
});
