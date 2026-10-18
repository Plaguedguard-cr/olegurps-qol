import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import {normalizeDamageDiceAdds} from '../scripts/tools/damage-dice-adds.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {UT_HOMING_GUIDANCE,UT_HOMING_CANDIDATES,UT_SEFOP_GUIDANCE,reviewHoming} from '../scripts/tools/ut-sefop.js';
import {UT_EXTENDED_RULES} from '../scripts/tools/ut-extended-ammunition.js';
import {UT_CONVENTIONAL_RULES} from '../scripts/tools/ut-conventional-ammunition.js';
import {UT_SPECIAL_RULES,utPayloadEditorHTML} from '../scripts/tools/ut-special-ammunition.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {calculateHitsFromMargin} from '../scripts/tools/prepared-gga-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {saveCampaignTL,campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
import {availableAmmoTypes} from '../scripts/tools/ammo-management-app.js';
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
const rows=matrix.rows.filter(r=>Object.hasOwn(UT_HOMING_CANDIDATES,r.candidateId));
const base=row=>({source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId});
const effects=p=>resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(p.facts.modeId)),variantId:p.type.recipe.variantId,
  baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
test('all source statuses stay pinned; every Homing matrix row is independently prepared with its actual sensor',()=>{
  const digest=createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(matrix.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex');
  assert.equal(digest,contract.sourceStatusDigestBeforeGenericHoming);
  assert.equal(UT_HOMING_GUIDANCE,UT_SEFOP_GUIDANCE);
  for(const row of rows){
    const p=automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters:row.recipeParameters});
    if(row.implementation==='available'){
      assert.equal(p.state,'complete',row.modeId+':'+row.candidateId);assert.equal(effects(p).nativeSafe,true);
      assert.equal(p.facts.homing.guidance,UT_HOMING_CANDIDATES[row.candidateId]??'infrared');
      assert.equal(p.facts.availabilityTL,row.recipeParameters.availabilityTL);
    }else if(row.status==='incompatible'||row.status==='undetermined')assert.notEqual(p.state,'complete');
    else assert.ok(row.blocker);
  }
  assert.ok(rows.some(r=>r.implementation==='available'));assert.equal(rows.filter(r=>r.implementation==='blocked').length,0);
});
test('all sensor variants retain source size/TL, attack mode, skill, superscience and cost across the full published table',()=>{
  for(const variant of contract.guidanceVariants){
    const id=UT_HOMING_CANDIDATES[variant.id],sensor=UT_HOMING_GUIDANCE[id];
    assert.deepEqual(sensor.minSizeByTL,variant.minSizeByTL);assert.equal(!!sensor.superscience,variant.superscience);
    for(const tl of [9,10,11,12])for(const size of [1,3,5.7,7,7.5,10,15,18.5,25,40,64,100]){
      const h=reviewHoming({caliberMm:size,availabilityTL:tl,guidance:id}),valid=sensor.minSizeByTL[tl]!=null&&size>=sensor.minSizeByTL[tl];
      assert.equal(!!h,valid,id+':'+size+':'+tl);
      if(h){assert.equal(h.projectileSkill,sensor.skill+tl-sensor.introductionTL);assert.equal(h.attack,sensor.attack);assert.equal(h.automaticGuidance,false);assert.equal(h.guidanceSurcharge,sensor.surcharge);}
    }
  }
  assert.equal(reviewHoming({caliberMm:25,availabilityTL:10,guidance:'invented'}),null);
  for(const guidance of ['constructor','__proto__'])assert.equal(reviewHoming({caliberMm:100,availabilityTL:12,guidance}),null);
  for(const availabilityTL of ['12','constructor',NaN,13])assert.equal(reviewHoming({caliberMm:100,availabilityTL,guidance:'infrared'}),null);
});
test('owner executes every available Homing row through stock, loading, failed registration and one physical spend',async()=>{
  game.user.isGM=false;
  try{for(const row of rows.filter(r=>r.implementation==='available')){
    const fx=await fixture(row.modeId),p=automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters:{...row.recipeParameters,note:'Owner lot',batchId:'lot'}});
    if(row.configurationId!==row.modeId){
      const capacity=row.configurationId.endsWith(':storm-rifle-magazine')?13:50;
      await fx.transaction('add-magazines',{amount:1,capacity});
      const magazine=fx.weapon().ammunitionInventory.magazines.at(-1);
      await fx.transaction('install',{magazineId:magazine.id});
      assert.equal(fx.weapon().capacity,capacity);
    }
    await saveCampaignTL(fx.actor,p.facts.availabilityTL);await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
    const before=fx.weapon().totalAmmo,result=await shoot(fx,1,{effectiveSkill:3}),old=JSON.stringify(result.snapshot);
    assert.equal(result.spent,1);assert.equal(fx.weapon().totalAmmo,before-1);assert.equal(result.rollData.failure,true);
    assert.equal(result.rollData.manualProjectileHit,true);assert.equal(result.rollData.rofrcl,null);assert.equal(calculateHitsFromMargin(10,2,5,result.rollData),null);
    assert.match(result.message.content,/регистрация выстрела Homing|Выстрел Homing зарегистрирован/);
    assert.match(result.message.content,/olegurps-sefop-manual-damage[^>]*>[^<]*\[.*D:/);
    assert.doesNotMatch(result.message.content,/<details[^>]*\bopen|B413|B414|B435|автоматически успешно/);
    assert.equal(result.snapshot.profile.damage.formula,normalizeDamageDiceAdds(fx.attack().data.damage));
    assert.deepEqual(result.snapshot.profile.damage.rules.manualHoming.guidance,p.facts.homing.guidance);
    const chat=ammunitionChatData(result.snapshot.profile);assert.equal(chat.lines.length,2);assert.equal(chat.source,'UT146');
    await shoot(fx,1,{attackId:result.snapshot.attackId});assert.equal(fx.weapon().totalAmmo,before-1);assert.equal(JSON.stringify(result.snapshot),old);
    assert.deepEqual(fx.actor.system,fx.before);
  }}finally{game.user.isGM=true;}
});
test('every supported payload keeps its existing Damage, components, physical transformations and special numeric rules under Homing',()=>{
  const variants=[...Object.keys(UT_EXTENDED_RULES),...Object.keys(UT_SPECIAL_RULES),...Object.keys(UT_CONVENTIONAL_RULES)]
    .filter(id=>!['ut_homing','ut_sefop','ut_shotshell'].includes(id));let checked=0;
  for(const row of rows.filter(r=>r.configurationId===r.modeId&&r.candidateId==='homing'&&r.implementation==='available'))
    for(const availabilityTL of [9,10,11,12])for(const warheadVariant of variants){
      const parameters={availabilityTL,homingGuidance:'infrared',warheadVariant,note:'Owner',savingThrow:'Owner resistance',description:'Full description\nSecond line'};
      const plain=automatic.prepare({modeId:row.modeId,base:base(row),variantId:warheadVariant,parameters});
      const guided=automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters});
      if(!reviewHoming({caliberMm:catalogs.getAmmoFamily('ut',row.ammoFamilyId).caliber_mm,availabilityTL,guidance:'infrared'})||plain.state!=='complete'){
        assert.notEqual(guided.state,'complete');continue;
      }
      assert.equal(guided.state,'complete',row.modeId+':'+warheadVariant+':'+availabilityTL);
      const a=effects(plain),b=effects(guided);assert.equal(b.nativeSafe,a.nativeSafe);
      assert.equal(b.formula,a.formula);assert.deepEqual(b.components,a.components);assert.deepEqual(b.effectiveChanges,a.effectiveChanges);
      assert.equal(b.rules.weightPerShotLb,a.rules.weightPerShotLb??plain.facts.weightPerShotLb);
      for(const field of ['resultDivisors','instructionOnly','radius','componentOrder','fillerCost'])if(a.rules[field]!==undefined)assert.deepEqual(b.rules[field],a.rules[field]);
      assert.equal(automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',savedType:guided.type}).state,'complete');checked++;
    }
  assert.ok(checked>1000);
});
test('independent platform blocks and source uncertainties survive; recursive, SEFOP and unknown pellet designs are refused',async()=>{
  for(const id of ['Wg_f0E5hqv6o1C0Uj']){
    const fx=await fixture(id),b=fx.candidates().find(t=>!t.recipe);
    const p=automatic.prepare({modeId:id,base:b,variantId:'ut_homing',parameters:{availabilityTL:12}});
    assert.equal(p.state,'complete');await fx.transaction('save-recipe',{type:p.type});
    assert.ok(availableAmmoTypes(fx.actor,fx.weapon(),api).some(t=>!t.unavailable));
    await load(fx,p.type);const state=fx.state();state.weapons[0].paintBattery.charge=0;await fx.actor.setFlag('world','gurpsAmmoManager',state);
    await assert.rejects(shoot(fx),/Батарея разряжена/);
  }
  const fx=await fixture('WdUnAFzFvv59Smhhk'),b=fx.candidates().find(t=>!t.recipe);
  for(const warheadVariant of ['ut_homing','ut_sefop','ut_shotshell','ut_etc','ut_liquid_propellant','ut_he_proximity','invented','constructor','__proto__',0])
    assert.notEqual(automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{availabilityTL:12,warheadVariant}}).state,'complete');
  for(const ammoId of ['10mm_cl','invented'])assert.notEqual(automatic.prepare({modeId:fx.carrier.standaloneModeId,base:{...b,ammoId},variantId:'ut_homing',parameters:{availabilityTL:12}}).state,'complete');
  for(const row of rows.filter(r=>r.status==='undetermined'))for(const availabilityTL of [9,10,11,12])
    assert.notEqual(automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters:{availabilityTL}}).state,'complete');
});
test('campaign TL filters actual sensor editions and service writes, while saved stock and unknown TL stay intact',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),b=fx.candidates().find(t=>!t.recipe);
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{availabilityTL:11,homingGuidance:'multiscanner'}});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);const saved=JSON.stringify(fx.weapon().ammunitionInventory),result=await shoot(fx),snapshot=JSON.stringify(result.snapshot);
  const afterShot=JSON.stringify(fx.weapon().ammunitionInventory);await saveCampaignTL(fx.actor,9);
  assert.equal(JSON.stringify(fx.weapon().ammunitionInventory),afterShot);assert.notEqual(saved,afterShot);
  assert.equal(automatic.admission(p,{actor:fx.actor}).allowed,false);
  for(const type of availableAmmoTypes(fx.actor,fx.weapon(),api).filter(t=>t.recipe?.variantId==='ut_homing'&&!t.inventoryOnly))assert.ok(type.recipe.parameters.availabilityTL<=9);
  await assert.rejects(fx.transaction('add-stock',{ammoKey:p.type.key,amount:1}),/CampaignTLUnavailable/);
  const fresh=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{availabilityTL:10,homingGuidance:'multispectralActive'}});
  await assert.rejects(fx.service.inventoryTransaction(fx.carrier.id,'save-recipe',{type:fresh.type}),/CampaignTLUnavailable/);
  await saveCampaignTL(fx.actor,10);assert.equal(automatic.admission(fresh,{actor:fx.actor}).allowed,true);
  assert.ok(availableAmmoTypes(fx.actor,fx.weapon(),api).some(t=>t.recipe?.parameters?.homingGuidance==='multispectralActive'&&t.recipe.parameters.availabilityTL===10));
  await saveCampaignTL(fx.actor,null);assert.equal(automatic.admission(p,{actor:fx.actor}).allowed,true);
  assert.equal(JSON.stringify(result.snapshot),snapshot);
  for(const tl of [0,3,9,12])for(const book of ['ht','ut','lt'])assert.equal(campaignAmmunitionAdmission({source:'catalog',book,kind:'ammo-item',ammoId:'unknown'},catalogs,tl).allowed,true);
});
test('sensor batches, freely edited fields, radius and historical profiles remain independent without GM approval',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),b=fx.candidates().find(t=>!t.recipe),params={availabilityTL:10,warheadVariant:'ut_biochemical_aerosol',note:'Owner <content>',savingThrow:'Any HT',description:'Full\nDescription'};
  const a=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{...params,homingGuidance:'infrared',batchId:'a'}});
  const c=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{...params,homingGuidance:'multispectralActive',batchId:'b'}});
  assert.notEqual(a.type.key,c.type.key);for(const p of [a,c])await fx.transaction('save-recipe',{type:p.type});
  await load(fx,a.type);await fx.transaction('add-stock',{ammoKey:c.type.key,amount:1});
  await assert.rejects(fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:c.type.key,amount:1}),/MixedTypes/);
  const result=await shoot(fx),old=JSON.stringify(result.snapshot),chat=ammunitionChatData(result.snapshot.profile);
  assert.equal(result.profile.damage.formula,null);assert.doesNotMatch(result.message.content,/D:"/);
  for(const field of ['note','savingThrow','description'])assert.equal(result.snapshot.profile.damage.rules.payload[field],params[field]);
  assert.ok(chat.fields.some(f=>f.value===params.description));assert.equal(chat.source,'UT146; UT153');
  const edit=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_homing',parameters:{...a.type.recipe.parameters,note:'',radius:{...a.type.recipe.parameters.radius,origin:'manual',yards:7}}});
  await fx.transaction('edit-recipe',{ammoKey:a.type.key,type:edit.type});assert.equal(JSON.stringify(result.snapshot),old);
  assert.equal(fx.weapon().ammunitionInventory.stocks.length,2);
});
test('Homing editor and short instructions stay Russian under ru/en and preserve native closed details',async()=>{
  const row=rows.find(r=>r.implementation==='available'&&r.candidateId==='homing_multiscanner'),p=automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters:row.recipeParameters});
  for(const lang of ['ru','en']){game.i18n.lang=lang;const html=utPayloadEditorHTML(p.type,p.type.recipe.parameters,escapePayload,{campaignTL:11});
    assert.match(html,/Сенсор Homing/);assert.match(html,/Заряд Homing/);assert.match(html,/name="ut-homingGuidance"/);
    assert.doesNotMatch(html,/<details[^>]*\bopen|GM|battery/);assert.match(html,/\^/);
  }
  const ru=JSON.parse(await readFile(new URL('../lang/ru.json',import.meta.url))),en=JSON.parse(await readFile(new URL('../lang/en.json',import.meta.url)));
  assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
});
