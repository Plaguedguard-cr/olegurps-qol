import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixture,load,shoot,catalogs,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {HE_PROXIMITY,proximityRangeReason,validateProximityShot} from '../scripts/tools/ut-he-proximity.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {utPayloadEditorHTML} from '../scripts/tools/ut-special-ammunition.js';
import {campaignAmmunitionAdmission,saveCampaignTL} from '../scripts/tools/ammunition-tech-level.js';
import {availableAmmoTypes} from '../scripts/tools/ammo-management-app.js';
globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
const rows=matrix.rows.filter(r=>r.candidateId==='he_proximity');
const base=row=>({source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId});
const prepare=(row,parameters={})=>automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_he',parameters:{availabilityTL:9,fuze:'proximity',...parameters}});
const effects=p=>resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(p.facts.modeId)),variantId:p.type.recipe.variantId,
  baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
const context=distance=>({shotgun:{physicalDistance:distance}});
const row=rows.find(r=>r.modeId==='WdUnAFzFvv59Smhhk');

test('all 36 fuze pairs retain source status; 22 are usable after UAW and accounted Paint power',()=>{
  assert.equal(createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(matrix.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'),contract.sourceStatusDigestBeforeHEProximity);
  assert.equal(rows.length,36);assert.equal(rows.filter(r=>r.implementation==='available').length,22);
  for(const r of rows){
    const p=prepare(r);
    if(r.implementation==='available'){
      assert.equal(r.status,'conditional');assert.equal(p.state,'complete',r.modeId);
      assert.equal(effects(p).nativeSafe,true);assert.deepEqual(effects(p).rules.heProximity,HE_PROXIMITY);
      assert.equal(r.recipeVariant,'ut_he');assert.equal(r.recipeParameters.fuze,'proximity');
    }else if(r.implementation==='blocked')assert.match(r.blocker,/UAW|питания/);
    else assert.notEqual(p.state,'complete',r.modeId);
  }
  for(const candidate of ['etc','liquid_propellant'])assert.ok(matrix.rows.filter(r=>r.candidateId===candidate&&r.implementation==='blocked').length);
});

test('every available platform uses exact published fragments at TL9-12; Impact keeps its original complete components',()=>{
  const expected={10:'1d-2 cut',15:'1d-1 cut',18.5:'1d cut',25:'1d+1 cut',40:'2d cut',64:'3d cut',100:'5d cut'};
  for(const r of rows.filter(r=>r.implementation==='available'))for(const availabilityTL of [9,10,11,12]){
    const p=prepare(r,{availabilityTL}),e=effects(p),impact=prepare(r,{availabilityTL,fuze:'impact'}),i=effects(impact);
    assert.equal(e.formula,expected[p.facts.caliberMm]);
    assert.deepEqual(e.components.map(c=>[c.role,c.formula]),[['fragmentation',expected[p.facts.caliberMm]]]);
    assert.equal(e.rules.attackBonus,4);assert.equal(e.rules.primaryDamageRole,'fragmentation');
    assert.equal(i.components.length,3);assert.deepEqual(i.components.map(c=>c.role),['kinetic','follow-up','fragmentation']);
    assert.equal(i.components[2].formula,e.formula);assert.equal(i.rules.heProximity,undefined);
    assert.equal(impact.type.recipe.parameters.fuze,undefined);
    assert.deepEqual(automatic.prepare({modeId:r.modeId,base:base(r),variantId:'ut_he',parameters:{availabilityTL}}).type.recipe,impact.type.recipe);
    for(const k of ['range','rof','rcl','acc','bulk','weightPerShotLb','costPerShot'])assert.deepEqual(e.effectiveChanges[k]??e.rules[k],i.effectiveChanges[k]??i.rules[k]);
    assert.notEqual(p.type.key,impact.type.key);
  }
  assert.equal(prepare(row,{fuze:'invented'}).state,'incomplete');
  assert.equal(prepare(row,{availabilityTL:8}).state,'incomplete');
});

test('39 and unspecified distances fail before execution and writes; 40/41 pass, spend once, snapshot manual area hit state',async()=>{
  game.user.isGM=false;
  try{for(const r of rows.filter(r=>r.implementation==='available'&&r.configurationId===r.modeId)){
    const fx=await fixture(r.modeId),p=prepare(r,{note:'Owner note',description:'Full description',savingThrow:'Owner HT'});
    await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type,6);
    for(const distance of [null,undefined,'',39]){
      const before=JSON.stringify(fx.state());let executed=false;
      await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),
        prepare:()=>({amount:1,profile:fx.profile(context(distance))}),execute:async()=>{executed=true;return {rolled:true};}}),/40/);
      assert.equal(executed,false);assert.equal(JSON.stringify(fx.state()),before);
      const service=new FireService({actor:fx.actor,token:{actor:fx.actor}});
      await assert.rejects(service.executeRangedAttack(fx.attack(),{attackProfile:fx.profile(context(distance))}),/40/);
    }
    for(const distance of [40,41]){
      if(!fx.service.readAttackAmmunition(fx.carrier.id)?.available)await fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:p.type.key,amount:1});
      assert.equal(fx.profile(context(distance)).damage.nativeSafe,true,r.modeId+':'+fx.profile(context(distance)).damage.reason);
      const total=fx.weapon().totalAmmo,result=await shoot(fx,1,{effectiveSkill:3,context:context(distance)}),s=result.snapshot;
      assert.equal(result.spent,1);assert.equal(fx.weapon().totalAmmo,total-1);
      assert.equal(result.rollData.failure,true);assert.equal(result.rollData.projectileHit,'manual');assert.equal(result.rollData.rofrcl,null);
      assert.match(result.message.content,/D:"/);assert.equal(s.profile.context.shotgun.physicalDistance,distance);
      assert.equal(s.ammunition.recipe.parameters.fuze,'proximity');assert.equal(s.profile.damage.rules.heProximity.automaticHit,false);
      const saved=JSON.stringify(s);await shoot(fx,1,{attackId:s.attackId,context:context(39)});
      assert.equal(fx.weapon().totalAmmo,total-1);assert.equal(JSON.stringify(s),saved);
    }
  }}finally{game.user.isGM=true;}
});

function fireApp(attack,fx){
  const ranges=[{index:0,max:30,label:'30',penalty:-7},{index:1,max:50,label:'50',penalty:-8}];
  const service=new FireService({actor:fx.actor,token:{actor:fx.actor}}),control=createFireControlContext({token:{actor:fx.actor},fireService:service});
  const app=Object.create(FirePreparationApp.prototype),button={disabled:false},hint={textContent:''};
  Object.assign(app,{attack,actor:fx.actor,mode:'weapon',weapon:fx.weapon(),rangeBands:ranges,visibility:null,
    fireState:{shots:'1',selectedRangeIndex:null,manualRangeSelected:false,hitLocation:{zoneId:'eye',regionId:null}},
    element:{querySelector:s=>s==='[data-fire-action="confirm"]'?button:s==='[data-proximity-reason]'?hint:null,querySelectorAll:()=>[]},
    calculateRapidFireBonus:()=>0,_getShotsValue:()=>1,calculateFireMode:values=>control.getFireModeState(app.attack,values,ranges),
    _updateElevationPreview(){},_updateRrsRangeMarkers(){},_updateSkillPreview(){}});
  return {app,button,hint,control,service,ranges};
}
test('Fire Control rejects short range selection, supports exact 40/41, rechecks Impact -> Proximity and missing distance',async()=>{
  const fx=await fixture(row.modeId);await load(fx,prepare(row).type);
  const attack=withRuntimeAmmoStats(fx.attack(),fx.actor),{app,button,hint}=fireApp(attack,fx);
  app._updateProximityPreview();assert.equal(button.disabled,true);assert.match(hint.textContent,/40/);
  app._selectRange(0);assert.equal(app.fireState.selectedRangeIndex,null);
  app.fireState.proximityDistance='39';app._updateProximityPreview();assert.equal(button.disabled,true);
  for(const value of ['40','41']){
    app.fireState.proximityDistance=value;app._updateProximityPreview();assert.equal(button.disabled,false);
    assert.equal(app.getShotOptions().targetDistanceOverride,Number(value));assert.equal(app.getShotOptions().rangeIndex,1);
    assert.equal(app.getShotOptions().hitLocationId,'silhouette');assert.equal(app.getShotOptions().suppressTargetedAttack,true);
  }
  app.attack={...attack,ammunitionHEProximity:null};app.fireState.proximityDistance='';app._selectRange(0);
  assert.equal(app.fireState.selectedRangeIndex,0);assert.equal(app._proximityReason(),null);
  app.attack=attack;app._updateProximityPreview();assert.equal(button.disabled,true);assert.match(hint.textContent,/40/);
  app._selectRange(1);app._updateProximityPreview();assert.equal(button.disabled,false);
  assert.match(app._buildProximityContent(),/min="40"/);
});

test('shared calculation applies +4 once for the area and suppresses targeted-location techniques',async()=>{
  const fx=await fixture(row.modeId);await load(fx,prepare(row).type);
  const {app,control,ranges}=fireApp(withRuntimeAmmoStats(fx.attack(),fx.actor),fx);app.fireState.proximityDistance='40';
  const targeting={getSelection:id=>({zoneId:id,penalty:id==='eye'?-9:0,label:id})};
  const calculated=control.calculateEffectiveFireSkillDetails(app.attack,app.getShotOptions(),ranges,targeting);
  assert.equal(calculated.combatCalculation.channels.find(c=>c.id==='ammunitionConstruction').resolvedValue,4);
  assert.equal(calculated.combatCalculation.channels.find(c=>c.id==='hitLocation').resolvedValue,0);
});

test('campaign TL applies only to new variants, unknown TL stays allowed, owner rights and separate lots persist',async()=>{
  const fx=await fixture(row.modeId),p=prepare(row),impact=prepare(row,{fuze:'impact'});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);const original=await shoot(fx,1,{context:context(40)}),saved=JSON.stringify(original.snapshot);
  for(const tl of [0,8,9,10,12]){
    await saveCampaignTL(fx.actor,tl);
    const types=availableAmmoTypes(fx.actor,fx.weapon(),api);
    const newVariant=prepare(row,{availabilityTL:10});
    assert.equal(campaignAmmunitionAdmission(newVariant.type,catalogs,tl).allowed,tl>=10);
    assert.equal(types.some(t=>t.key===impact.type.key),tl>=9);
    assert.equal(campaignAmmunitionAdmission({source:'catalog',book:'ut',kind:'ammo-family',ammoId:'missing'},catalogs,tl).allowed,true);
    if(tl<10)await assert.rejects(fx.transaction('save-recipe',{type:newVariant.type}));
  }
  await saveCampaignTL(fx.actor,12);await fx.transaction('save-recipe',{type:impact.type});await fx.transaction('add-stock',{ammoKey:impact.type.key,amount:2});
  await assert.rejects(fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:impact.type.key,amount:1}),/MixedTypes/);
  fx.actor.isOwner=false;game.user.isGM=false;
  try{await assert.rejects(shoot(fx,1,{context:context(40)}),/Permission/);}finally{game.user.isGM=true;fx.actor.isOwner=true;}
  assert.equal(JSON.stringify(original.snapshot),saved);
});

test('HE Proximity remains compact and closed under ru/en, preserving user text and nested Homing fuze',async()=>{
  const fx=await fixture(row.modeId),p=prepare(row,{note:'Note <full>',savingThrow:'HT <full>',description:'Description <full>'});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);const profile=fx.profile(context(40));
  for(const lang of ['ru','en']){
    game.i18n.lang=lang;const data=ammunitionChatData(profile),html=ammunitionChatHTML(profile,escapePayload);
    assert.equal(data.lines.length,2);assert.ok(data.lines.join(' ').length<160);assert.equal(data.source,'UT153–154');
    assert.doesNotMatch(html,/<details[^>]*\bopen|B4\d\d|cr ex/);
    assert.ok(data.fields.some(f=>f.value==='Note <full>'));assert.ok(data.fields.some(f=>f.value==='HT <full>'));
    assert.ok(data.fields.some(f=>f.value==='Description <full>'));
    assert.match(utPayloadEditorHTML(p.type,null,escapePayload),/name="ut-fuze"[^]*value="impact"[^]*value="proximity"[^]*selected/);
  }
  game.i18n.lang='ru';
  const guided=automatic.prepare({modeId:row.modeId,base:base(row),variantId:'ut_homing',parameters:{availabilityTL:10,homingGuidance:'infrared',warheadVariant:'ut_he',fuze:'proximity'}});
  assert.equal(guided.state,'complete');assert.equal(guided.type.recipe.parameters.fuze,'proximity');
  assert.equal(effects(guided).rules.heProximity.minimumYards,40);assert.equal(effects(guided).formula,'1d+1 cut');
  assert.throws(()=>validateProximityShot({damage:effects(guided),context:context(39)}),/40/);
});
