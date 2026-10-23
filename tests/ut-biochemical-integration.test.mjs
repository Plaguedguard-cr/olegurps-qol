import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture,catalogs,automatic} from './helpers/gauss-context.mjs';
import {CHEMICAL_SUBSTANCES,chemicalAllowed,chemicalProfile} from '../scripts/tools/biochemical-catalog.js';
import {biochemicalCoverage} from '../tools/audit-biochemical-coverage.mjs';
import {fluidProfile} from '../scripts/ut-fluid-source.js';
import {physicalRangedProfile} from '../scripts/ut-physical-ranged-source.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {resistanceEffect,visionResistanceModifier,resistanceOutcome} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {weaponPowerProfile} from '../scripts/tools/weapon-power.js';
import {requiredAmmunitionTL,campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
const coverage=biochemicalCoverage();
async function fixture(id,context={physicalDistance:1,manualGuidanceConfirmed:true}){
 const f=await gaussFixture(id,{profileContext:context,type:catalogs.getMode(id).combat_type});
 if(fluidProfile(id)?.underbarrel||id==='WkudgdqO3lymAYks5'){const d=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.record});for(const[k,v]of Object.entries({hostBulk:'-5',bulk:'-5',st:'10',acc:'2+2'}))d.setOverride(id,k,v);await f.definitions.save(d);await f.service.loadState();}
 if(id==='WIijXG9uGZ52T0eW2')await f.tx('splat-salvo',{amount:1,expectedSalvo:30,readyConfirmed:true});
 const power=weaponPowerProfile(f.weapon());if(power&&!power.externalPower)await f.battery();
 return f;
}
for(const substance of Object.values(CHEMICAL_SUBSTANCES))test(substance.id+': structured source, all resistance branches, no DR gate or Actor writes',()=>{
 assert.ok(substance.source);assert.ok(substance.deliveries.length);assert.ok(substance.protection);assert.ok(substance.duration);assert.ok(substance.repeats);
 const rules=chemicalProfile(substance,{delivery:substance.deliveries[0]});
 assert.equal(rules.chemical.penetrationConfirmationRequired,false);
 if(!substance.checks.length){assert.equal(rules.resistanceEffect,undefined);return;}
 const e=resistanceEffect(rules.resistanceEffect);assert.ok(e);assert.deepEqual(e.chemical.checks,substance.checks);
 for(const c of substance.checks){const conditions=visionResistanceModifier(e,{checkId:c.id,dr:100000,exposed:false,protected:true,immune:true});assert.equal(conditions.applies,true);assert.equal(conditions.modifier,c.modifier);}
 const base={finaltarget:8,rtotal:12,margin:-4,isCritSuccess:false,isCritFailure:false,failure:true};
 assert.equal(resistanceOutcome(e,base,{}).success,false);assert.equal(resistanceOutcome(e,{...base,isCritSuccess:true},{}).success,true);assert.equal(resistanceOutcome(e,{...base,rtotal:18,isCritFailure:true},{}).criticalFailure,true);
});
for(const row of coverage.rows.filter(r=>r.substances.some(s=>s.status==='available')))test(row.modeId+' / '+row.physicalAmmo+' / '+row.delivery+': stock, shot, resource, frozen effect',async()=>{
 const id=row.substances.find(s=>s.status==='available').id,f=await fixture(row.modeId),fluid=fluidProfile(row.modeId);
 let t;
 if(row.physicalAmmo==='ht:chemical-dose:tear')t=f.candidates()[0];
 else if(fluid)t=f.candidates().find(t=>t.ammoId===id);
 else{
  const micro=row.physicalAmmo==='15mm_micromissile',p=automatic.prepare({modeId:row.modeId,base:{source:'catalog',book:row.source.toLowerCase(),kind:row.source==='UT'?'ammo-family':'ammo-item',ammoId:row.physicalAmmo},variantId:micro?'ut_homing':row.variant,parameters:{chemicalId:id,...(micro?{availabilityTL:9,homingGuidance:'infrared',warheadVariant:row.variant}:{})}});
  assert.equal(p.state,'complete');t=p.type;await f.tx('save-recipe',{type:t});t=f.candidates().find(c=>c.key===t.key);
 }
 assert.ok(t);await f.load(t,1);const shot=await f.shoot();assert.equal(shot.spent,1);assert.equal(shot.profile.damage.rules.chemical.id,id);assert.equal(shot.profile.damage.rules.chemical.penetrationConfirmationRequired,false);assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
 if(Number.isFinite(t.physical?.costPerShot))assert.equal(shot.profile.damage.rules.costPerShot,t.physical.costPerShot);
 if(shot.profile.damage.rules.instructionOnly)assert.ok(attackProfilePresentation(shot.profile).damageText.startsWith('Химический эффект'));
 const history=JSON.stringify(shot.snapshot);await f.service.loadState();assert.equal(JSON.stringify(shot.snapshot),history);assert.equal(f.weapon().totalAmmo,0);
});
test('every substance has explicit available/incompatible/undetermined coverage; no HT caliber join',()=>{
 assert.ok(coverage.scanned.length>800);const statuses=new Set(['available','incompatible','deferred','source-undetermined']);
 for(const r of coverage.rows){assert.equal(r.substances.length,Object.keys(CHEMICAL_SUBSTANCES).length);for(const s of r.substances){assert.ok(statuses.has(s.status));assert.ok(s.reason);if(s.status==='available')assert.ok(chemicalAllowed(CHEMICAL_SUBSTANCES[s.id],r.delivery)||r.delivery==='vortex'&&s.id==='firefoam');}}
 assert.equal(coverage.rows.some(r=>r.source==='HT'&&r.variant?.startsWith('ut_')),false);
});
test('10mm face-only aerosol, UT153 dose/price, injection no HT for nonresisting nanomachines',async()=>{
 const f=await fixture('W9chB7ydzOWTAxQP0'),t=f.candidates().find(t=>t.recipe?.variantId==='ut_biochemical_aerosol'&&t.recipe.parameters.chemicalId==='nerve');assert.ok(t);await f.load(t,1);const shot=await f.shoot();assert.equal(shot.profile.damage.rules.faceOnly,true);assert.equal(shot.profile.damage.rules.chemical.radius,null);assert.equal(shot.profile.damage.rules.chemical.doses,1);assert.equal(shot.profile.damage.rules.fillerCost,10);
 const g=await fixture('WRsVDXjeX3ABpRPVp'),nano=g.candidates().find(t=>t.recipe?.parameters?.chemicalId==='splatter');await g.load(nano,1);const n=await g.shoot();assert.equal(n.profile.damage.rules.resistanceEffect,undefined);
});
test('wrong route/unknown filler rejected; historical manual text never becomes executable substance',async()=>{
 const f=await fixture('WRsVDXjeX3ABpRPVp'),base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'3mm_n'};
 for(const chemicalId of ['sleep','parasite_seed','unknown'])assert.notEqual(automatic.prepare({modeId:'WRsVDXjeX3ABpRPVp',base,variantId:'ut_drugged_dart',parameters:{chemicalId}}).state,'complete');
 const p=automatic.prepare({modeId:'WRsVDXjeX3ABpRPVp',base,variantId:'ut_drugged_dart',parameters:{note:'Nerve Poison'}});assert.equal(p.state,'complete');await f.tx('save-recipe',{type:p.type});await f.load(f.candidates().find(t=>t.key===p.type.key),1);assert.equal((await f.shoot()).profile.damage.rules.chemical,undefined);
});
test('malformed saved chemical contracts are rejected without current catalog migration',()=>{
 const effect=chemicalProfile(CHEMICAL_SUBSTANCES.nerve_poison,{delivery:'injection'}).resistanceEffect;
 for(const checks of [[],[{id:'bad',modifier:'-7',label:'Bad'}],[null]])assert.equal(resistanceEffect({...effect,chemical:{...effect.chemical,checks}}),null);
 assert.throws(()=>{CHEMICAL_SUBSTANCES.nerve_poison.checks[0].modifier=0;},TypeError);
});
test('HT Tear Spray keeps its fixed twenty-charge feed and source-specific HT180 duration',async()=>{
 const f=await fixture('w6R_sr11lEsrygm0K');assert.equal(f.weapon().capacity,20);assert.equal(f.candidates().length,1);
 await f.load(f.candidates()[0],2);const shot=await f.shoot();assert.equal(shot.spent,1);assert.equal(shot.profile.damage.rules.chemical.source,'HT180');
 assert.deepEqual(shot.profile.damage.rules.chemical.duration,{minutesPerMoF:1});assert.deepEqual(shot.profile.damage.rules.chemical.checks.map(c=>c.modifier),[-2,-2]);
 await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:20}));
});
test('Nanoglop source radius is halved and manual Note survives compact chemical and Homing cards',async()=>{
 const f=await fixture('WIAo1otMCstnbi4Dv'),base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_clp'};
 const p=automatic.prepare({modeId:'WIAo1otMCstnbi4Dv',base,variantId:'ut_biochemical_liquid',parameters:{chemicalId:'disassembler',note:'Player Note '.repeat(20),savingThrow:'Manual save',description:'Player description'}});
 assert.equal(p.state,'complete');await f.tx('save-recipe',{type:p.type});await f.load(f.candidates().find(t=>t.key===p.type.key),1);const shot=await f.shoot();assert.equal(shot.profile.damage.rules.chemical.radius,0.5);assert.equal(shot.profile.damage.rules.chemical.directHitOnly,true);
 const card=ammunitionChatData(shot.profile);assert.equal(card.fields.find(f=>f.label==='Note').value,p.type.recipe.parameters.note);assert.ok(card.fields.some(f=>f.value==='Manual save'));assert.ok(card.fields.some(f=>f.value==='Player description'));
 const guided=ammunitionChatData({...shot.profile,damage:{...shot.profile.damage,rules:{...shot.profile.damage.rules,manualHoming:{attack:'IR',projectileSkill:13}}}});assert.ok(guided.lines.some(s=>s.includes('Artillery (Guided Missile)')));assert.ok(guided.lines.length<=3);
});
test('Sleep, Riot and Paralysis consequences use their source failure thresholds and critical result',()=>{
 for(const [id,mof,critical,expected]of [['sleep_poison',4,false,'Сонливость'],['sleep_poison',5,false,'Без сознания'],['riot',4,false,'Тошнота'],['riot',5,false,'Рвота'],['paralysis',2,false,'неподвижность'],['paralysis',3,false,'паралич'],['paralysis',3,true,'кома']]){
  const effect=chemicalProfile(CHEMICAL_SUBSTANCES[id],{delivery:CHEMICAL_SUBSTANCES[id].deliveries[0]}).resistanceEffect;
  const r=resistanceOutcome(effect,{finaltarget:12,rtotal:12+mof,margin:-mof,isCritSuccess:false,isCritFailure:critical,failure:true});assert.ok(r.consequence.includes(expected),id+': '+r.consequence);
 }
});
test('chemical TL is combined with carrier TL and higher fillers require campaign availability',async()=>{
 const f=await fixture('WIAo1otMCstnbi4Dv'),type=f.candidates().find(t=>t.recipe?.parameters?.chemicalId==='dominator_injection');assert.equal(type,undefined);
 const t=f.candidates().find(t=>t.recipe?.parameters?.chemicalId==='dominator_contact_mist');assert.equal(requiredAmmunitionTL(t,catalogs),12);assert.equal(campaignAmmunitionAdmission(t,catalogs,11).allowed,false);assert.equal(campaignAmmunitionAdmission(t,catalogs,12).allowed,true);
});
for(const chemicalId of ['tear','tear_vomit'])for(const [modeId,ammoId]of [['W9chB7ydzOWTAxQP0','10mm_clp'],['WnaTVcm1lDzdUBdwA','15mm_gyroc'],['WATP5TU7jVQnEpqB0','40mm_plb'],['WInB0nYjRLMJm5Ha-','64mm_missile']])test(chemicalId+' fills UT aerosol '+ammoId+' as a separate physical batch',async()=>{
 const f=await fixture(modeId),t=f.candidates().find(t=>t.ammoId===ammoId&&t.recipe?.variantId==='ut_biochemical_aerosol'&&t.recipe.parameters.chemicalId===chemicalId);assert.ok(t);await f.tx('save-recipe',{type:t});await f.load(t,1);const s=await f.shoot();assert.equal(s.spent,1);assert.equal(s.profile.damage.rules.chemical.id,chemicalId);assert.deepEqual(s.profile.damage.rules.chemical.checks.map(c=>c.modifier),chemicalId==='tear'?[-2,-2]:[-2,-2,-2]);assert.ok(s.profile.damage.rules.costPerShot>=0||s.profile.damage.rules.fillerCostUnknown);assert.ok(ammunitionChatData(s.profile).lines.length<=3);
});
