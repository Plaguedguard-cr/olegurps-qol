import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildUTMatrix,loadUTSourceContract,matrixURL} from '../tools/audit-ut-ammunition-completeness.mjs';
import {fixture,load,shoot,catalogs,compatibility,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {UT_EXTENDED_SOURCE} from '../scripts/tools/ut-extended-source.js';
import {applyUTDamageResult} from '../scripts/tools/ut-extended-ammunition.js';
import {utPayloadEditorHTML,utPayloadChatHTML} from '../scripts/tools/ut-special-ammunition.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {shotDamageComponents} from '../scripts/tools/damage-shot-link.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {FireService} from '../scripts/tools/fire-service.js';
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
const baseFor=row=>({source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId});
const effect=p=>resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(p.facts.modeId)),variantId:p.type.recipe.variantId,
  baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
test('complete source matrix is reproducible, rectangular, individual and covers every registry entry',async()=>{
  assert.deepEqual(JSON.parse(await readFile(matrixURL,'utf8')),matrix);
  assert.equal(matrix.modes.length,34);assert.equal(matrix.summary.mainModes,28);assert.equal(matrix.configurations.length,36);
  assert.equal(new Set(matrix.rows.map(r=>r.configurationId+':'+r.kind+':'+r.candidateId)).size,2484);
  assert.equal(matrix.rows.length,36*(37+6+20+5+1));
  for(const config of matrix.configurations){
    const rows=matrix.rows.filter(r=>r.configurationId===config.id);
    assert.deepEqual(rows.filter(r=>r.kind==='warhead').map(r=>r.candidateId).sort(),contract.warheadIds.toSorted());
    assert.deepEqual(rows.filter(r=>r.kind==='special-load').map(r=>r.candidateId).sort(),contract.specialLoadIds.toSorted());
    for(const r of rows){assert.ok(r.source.length>=2&&r.reason);if(r.implementation==='blocked')assert.ok(r.blocker.length>30);}
  }
  for(const [variant,s] of Object.entries(UT_EXTENDED_SOURCE)){
    const baseExpected=contract.warheads.find(w=>w.id===s.id);const expected=s.id==='aphex'?{...baseExpected,economics:{...baseExpected.economics,cost_multiplier:4}}:baseExpected;assert.ok(expected,variant);
    for(const k of ['compatibility','damage_table','economics','min_tl','superscience','source_ref'])assert.deepEqual(s[k],expected[k],variant+':'+k);
  }
});
test('every admissible unblocked pair has a resolved recipe; rejected pairs never create a loadable recipe',()=>{
  let checked=0;
  for(const row of matrix.rows.filter(r=>r.configurationId===r.modeId)){
    const base=baseFor(row);
    if(row.implementation==='available'){
      if(!row.recipeVariant){assert.equal(compatibility.checkCompatibility(row.modeId,base.ammoId,{book:'ut',kind:'ammo-family'}).status,'compatible');continue;}
      const p=automatic.prepare({modeId:row.modeId,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters}});
      assert.equal(p.state,'complete',row.modeId+':'+row.candidateId+':'+p.reasons);assert.equal(p.type.ammoId,row.ammoFamilyId);
      assert.equal(automatic.admission(p).allowed,true);const e=effect(p);
      assert.equal(e.nativeSafe,true,row.modeId+':'+row.candidateId+':'+e.reason);checked++;
      assert.equal(e.rules.physicalShotsPerAttack??1,1);
      if(e.rules.instructionOnly)assert.equal(e.formula,null);
      assert.equal(automatic.prepare({modeId:row.modeId,base,variantId:row.recipeVariant,savedType:structuredClone(p.type)}).state,'complete');
      const safeKeys=value=>{if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){assert.ok(!key.includes('.'),'Foundry expands dotted flag keys: '+key);safeKeys(child);}};
      safeKeys(p.type.recipe);
    }else if(row.recipeVariant&&row.status==='incompatible'&&!row.aliasOf){
      assert.notEqual(automatic.prepare({modeId:row.modeId,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters}}).state,'complete',row.modeId+':'+row.candidateId);
    }
  }
  assert.ok(checked>350,'machine verification must actually exercise the full set');
});
const cases=[
 ['W9chB7ydzOWTAxQP0','ut_aphex',9,'3d(2) pi+',{'follow-up':'1d-4 cr ex',fragmentation:'1d-2 cut'}],
 ['W9chB7ydzOWTAxQP0','ut_aphex',10,'3d(2) pi+',{'follow-up':'1d-3 cr ex',fragmentation:'1d-2 cut'}],
 ['WdUnAFzFvv59Smhhk','ut_he',10,'10d(0.5) pi++',{'follow-up':'4d+4 cr ex',fragmentation:'1d+1 cut'}],
 ['WdUnAFzFvv59Smhhk','ut_hec',9,'10d(0.5) pi++',{linked:'4d cr ex'}],
 ['WdUnAFzFvv59Smhhk','ut_shaped_charge',10,'5d+5x3(10) cr inc',{linked:'2d cr ex',fragmentation:'1d+1 cut'}],
 ['WIAo1otMCstnbi4Dv','ut_hemp',11,'5d+5x2(5) imp inc',{linked:'1d cr ex',fragmentation:'1d-1 cut'}],
 ['WFc8O-LgWxenUseNy','ut_aphd',11,'6d(5) pi-',{}],
 ['WSv_Zh3pW3Tl-tCf5','ut_memory_baton',9,'1d(0.25) cr dkb',{}],
 ['W8mzf5YoC9fFjAhO2','ut_stingray',10,'5d(0.25) pi++',{linked:'1d burn sur'}],
 ['WdUnAFzFvv59Smhhk','ut_emp',9,'1d-2 cr ex',{}],
 ['WdUnAFzFvv59Smhhk','ut_flare',9,'1d burn',{}],
 ['WdUnAFzFvv59Smhhk','ut_plasma',10,'6d burn ex sur',{}],
 ['WdUnAFzFvv59Smhhk','ut_force',10,'4d cr dkb ex',{}],
 ['WdUnAFzFvv59Smhhk','ut_strobe',9,null,{}],
 ['WdUnAFzFvv59Smhhk','ut_warbler',9,null,{}],
 ['WdUnAFzFvv59Smhhk','ut_message_psi_bomb',12,null,{}],
 ['WOMuCBSS_c_nIstvm','ut_stasis',12,null,{}],
 ['WOMuCBSS_c_nIstvm','ut_vortex',12,null,{}],
 ['WOMuCBSS_c_nIstvm','ut_swarm',10,null,{}],
 ['WOMuCBSS_c_nIstvm','ut_mininuke',9,'6dx200 cr ex',{linked:'4dx200 burn ex rad sur'}],
 ['WOMuCBSS_c_nIstvm','ut_micro_antimatter',10,'6dx4 burn ex sur',{linked:'6dx10000 tox rad'}],
 ['WOMuCBSS_c_nIstvm','ut_implosion',11,'6dx100 cr dkb ex',{linked:'6dx100 tox rad ex'}],
 ['WRsVDXjeX3ABpRPVp','ut_burrow_darts',10,'1d+2(0.5) pi-',{}],
 ['WIAo1otMCstnbi4Dv','ut_expendable_jammer',9,null,{}]
];
test('different UT mechanics complete owner stock -> load -> native check -> snapshot; exact formulas and no repeated spend',async()=>{
  game.user.isGM=false;
  try{for(const [modeId,variantId,availabilityTL,formula,secondary]of cases){
    const fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
    const p=automatic.prepare({modeId,base,variantId,parameters:{availabilityTL,note:'Custom <lot>',batchId:'A',savingThrow:'Custom HT',description:'Manual <effect>'}});
    assert.equal(p.state,'complete',variantId);await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
    const result=await shoot(fx),damage=result.snapshot.profile.damage;
    assert.equal(result.spent,1,variantId);assert.equal(damage.formula,formula,variantId);
    for(const [role,value]of Object.entries(secondary))assert.equal(damage.components.find(c=>c.role===role)?.formula,value,variantId+role);
    const old=JSON.stringify(result.snapshot),total=fx.weapon().totalAmmo;
    assert.deepEqual(damage.rules.payload,p.type.recipe.parameters);assert.deepEqual(fx.actor.system,fx.before);
    assert.match(result.message.content,/Custom &lt;lot&gt;/);assert.doesNotMatch(result.message.content,/<details[^>]*\bopen|<effect>/);
    if(formula===null)assert.doesNotMatch(result.message.content,/D:"/);
    await shoot(fx,1,{attackId:result.snapshot.attackId});assert.equal(fx.weapon().totalAmmo,total);
    const edited=automatic.prepare({modeId,base,variantId,parameters:{...p.type.recipe.parameters,note:'',savingThrow:'',description:'',...(p.facts.radius?{radius:{...p.facts.radius,origin:'manual',yards:null}}:{})}});
    await fx.transaction('edit-recipe',{ammoKey:p.type.key,type:edited.type});
    assert.equal(fx.weapon().totalAmmo,total);assert.equal(fx.weapon().ammunitionInventory.stocks.length,1);
    if(!fx.service.readAttackAmmunition(fx.carrier.id)?.type)await fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:edited.type.key,amount:1});
    const current=fx.profile();assert.equal(current.damage.nativeSafe,true,variantId+':'+current.damage.reason);
    assert.equal(JSON.stringify(result.snapshot),old);assert.equal(current.damage.rules.payload.note,'');
  }}finally{game.user.isGM=true;}
});
test('25mm Jammer uses the explicit user radius, preserves provenance, allows removal and distinct batches',async()=>{
  const modeId='WdUnAFzFvv59Smhhk',fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe);
  const prepare=parameters=>automatic.prepare({modeId,base,variantId:'ut_expendable_jammer',parameters});
  const a=prepare({batchId:'A'});assert.equal(a.facts.payload.radius.yards,25);assert.equal(a.facts.payload.radius.origin,'manual');
  assert.match(a.facts.payload.radius.source,/owner-entered/);assert.match(effect(a).rules.instructions.join(' '),/задан пользователем/);
  await fx.transaction('save-recipe',{type:a.type});await load(fx,a.type);const old=JSON.stringify((await shoot(fx)).snapshot);
  const b=prepare({batchId:'B',note:'Other',radius:{yards:null,units:'yards',origin:'manual'}});
  await fx.transaction('save-recipe',{type:b.type});await fx.transaction('add-stock',{ammoKey:b.type.key,amount:2});
  await assert.rejects(fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:b.type.key,amount:1}),/MixedTypes/);
  assert.equal(JSON.stringify(JSON.parse(old)),old);assert.equal(b.facts.payload.radius.yards,null);
});
test('exact fractional result division is component-specific and idempotent; atmosphere and selected yields are frozen',()=>{
  for(const [variantId,modeId,parameters,expected]of [
    ['ut_stingray','WIAo1otMCstnbi4Dv',{availabilityTL:10},2],
    ['ut_monochain','WIAo1otMCstnbi4Dv',{availabilityTL:9},2],
    ['ut_thermobaric','WdUnAFzFvv59Smhhk',{atmosphere:'trace'},4]]){
    const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:catalogs.getMode(modeId).ammunition_profile.primary_ammo_family_id};
    const p=automatic.prepare({modeId,base,variantId,parameters}),e=effect(p),native={damage:19,roll:{}};
    const out=applyUTDamageResult(native,e.rules);assert.equal(out.damage,Math.floor(19/expected));assert.equal(native.damage,19);
    assert.equal(applyUTDamageResult(out,e.rules),out);assert.equal(applyUTDamageResult(native,e.rules,'linked'),native);
  }
  const modeId='WOMuCBSS_c_nIstvm',base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'100mm_cl'};
  assert.equal(effect(automatic.prepare({modeId,base,variantId:'ut_mininuke',parameters:{setting:'1kt'}})).formula,'6dx2000 cr ex');
  assert.equal(automatic.prepare({modeId,base,variantId:'ut_mininuke',parameters:{setting:'2kt'}}).state,'incomplete');
  assert.equal(automatic.prepare({modeId,base,variantId:'ut_stasis',parameters:{durationSeconds:299}}).state,'incomplete');
  assert.equal(automatic.prepare({modeId,base,variantId:'ut_thermobaric',parameters:{atmosphere:'invented'}}).state,'incomplete');
});
test('extended editor and runtime dictionary remain Russian under ru/en without changing global language',async()=>{
  const fx=await fixture('WOMuCBSS_c_nIstvm'),base=fx.candidates().find(t=>!t.recipe);
  for(const lang of ['ru','en']){game.i18n.lang=lang;
    for(const variantId of ['ut_stasis','ut_mininuke','ut_thermobaric','ut_flare']){
      const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId});
      const html=utPayloadEditorHTML(p.type,null,escapePayload);assert.match(html,/TL конкретного заряда/);assert.doesNotMatch(html,/<details[^>]*\bopen|approve|GM/);
      const profile={ammunition:p.type,damage:effect(p)};assert.doesNotMatch(utPayloadChatHTML(profile,escapePayload),/<details[^>]*\bopen/);
    }
    assert.equal(game.i18n.lang,lang);
  }
});
test('new components reuse saved GGA Damage links; instruction-only charges expose no HP components',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),base=fx.candidates().find(t=>!t.recipe);
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_he'});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
  const shot=await shoot(fx),message={...shot.message,visible:true,isContentVisible:true,whisper:[]};
  const components=shotDamageComponents(message,{game:{i18n:game.i18n}});
  assert.deepEqual(components.map(c=>c.role),['follow-up','fragmentation']);assert.ok(components.every(c=>c.formula));
  const before=fx.weapon().totalAmmo;shotDamageComponents(message,{game:{i18n:game.i18n}});assert.equal(fx.weapon().totalAmmo,before);
});
test('Monochain bonus uses the common Fire Control channel and clears when switching magazines',async()=>{
  const fx=await fixture('WIAo1otMCstnbi4Dv'),modeId=fx.carrier.standaloneModeId,base=fx.candidates().find(t=>!t.recipe);
  const p=automatic.prepare({modeId,base,variantId:'ut_monochain'});await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
  const selected=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.equal(selected.ammunitionHitBonus,1);
  const prior=globalThis.GURPS;globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
  try{
    const token={actor:fx.actor},fire=createFireControlContext({token,fireService:new FireService({actor:fx.actor,token})});
    const bands=[{index:0,max:5,penalty:0,label:'5'}],targeting={getSelection:()=>({zoneId:'torso',label:'Torso',penalty:0})};
    const values={rangeIndex:0,manualRangeSelected:true,shots:1,hitLocationId:'torso',visibility:{mode:'normal'}};
    const details=fire.calculateEffectiveFireSkillDetails(selected,values,bands,targeting);
    assert.equal(details.combatCalculation.channels.find(c=>c.id==='ammunitionConstruction').resolvedValue,1);
    const ordinary=fire.calculateEffectiveFireSkillDetails({...selected,ammunitionHitBonus:0},values,bands,targeting);
    assert.equal(details.effectiveSkill,ordinary.effectiveSkill+1);
    await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.installedId,amount:fx.weapon().ammunitionInventory.magazines[0].rounds});
    await load(fx,base);const restored=withRuntimeAmmoStats(selected,fx.actor);
    assert.equal(restored.ammunitionHitBonus,0);assert.equal(restored.data.damage,fx.attack().data.damage);
  }finally{globalThis.GURPS=prior;}
});
test('new constructions reject wrong physical families, transformed sources and unsupported TL/preset values',()=>{
  const modeId='WdUnAFzFvv59Smhhk',base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'25mm_cl'};
  for(const variantId of Object.keys(UT_EXTENDED_SOURCE)){
    assert.equal(automatic.prepare({modeId,base:{...base,ammoId:'25mm_pc'},variantId}).state,'incomplete',variantId);
    const p=automatic.prepare({modeId,base,variantId});if(p.state!=='complete')continue;
    const raw=standaloneModeStats(catalogs.getMode(modeId));
    const e=resolveAmmunitionEffects({raw:{...raw,damage:'10d(2) pi++'},variantId,baseStatus:'compatible',constructionStatus:'compatible',facts:p.facts});
    assert.equal(e.nativeSafe,false,variantId);
    for(const availabilityTL of [-1,9.5,13,NaN])assert.equal(automatic.prepare({modeId,base,variantId,parameters:{availabilityTL}}).state,'incomplete');
  }
});
test('Micro-Antimatter price includes the published UT88 filler cost at the selected ammunition TL',()=>{
  const modeId='WOMuCBSS_c_nIstvm',base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'100mm_cl'};
  for(const [availabilityTL,perMicrogram]of [[10,2500],[11,25],[12,5]])for(const [setting,mass]of [['0.1ug',0.1],['1ug',1],['10ug',10]]){
    const p=automatic.prepare({modeId,base,variantId:'ut_micro_antimatter',parameters:{availabilityTL,setting}}),e=effect(p);
    assert.equal(e.rules.costPerShot,4000+mass*perMicrogram);assert.equal(e.rules.fillerCost,mass*perMicrogram);assert.match(e.rules.costSource,/88/);
    assert.match(e.rules.instructions.join(' '),/rad.*HP/);
  }
});
test('LSW alternate Assault Carbine magazine uses its own physical capacity and the same ammunition ledger',async()=>{
  const fx=await fixture('W5_HQQYf_zjoG9A7J'),type=fx.candidates().find(t=>t.recipe?.variantId==='ut_apds');
  await fx.transaction('add-stock',{ammoKey:type.key,amount:8});await fx.transaction('add-magazines',{amount:1,capacity:50});
  const magazine=fx.weapon().ammunitionInventory.magazines.at(-1);
  await fx.transaction('load',{magazineId:magazine.id,ammoKey:type.key,amount:8});await fx.transaction('install',{magazineId:magazine.id});
  assert.equal(fx.weapon().ammunitionInventory.magazines.at(-1).capacity,50);
  const result=await shoot(fx,3);assert.equal(result.spent,3);assert.equal(fx.weapon().totalAmmo,5);
  assert.equal(result.snapshot.profile.damage.formula,'7d+2(2) pi-');
  assert.equal(fx.weapon().ammunitionInventory.magazines[0].capacity,200);
});
