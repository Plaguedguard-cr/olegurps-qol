import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs} from './helpers/ut-ammunition-fixture.mjs';
import {HT_PRE_GAUSS_PROFILES,htPreGaussProfile} from '../scripts/ht-pre-gauss-profiles.js';
import {htSupplyProfiles} from '../scripts/tools/weapon-resources.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,listStandaloneAttacks} from '../scripts/tools/standalone-attack-service.js';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {parseRateOfFire,FireService} from '../scripts/tools/fire-service.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {shotAmmunitionConditions} from '../scripts/tools/damage-shot-link.js';
const currentUT=JSON.parse(await readFile(new URL('../data/ut-weapon-ammunition-matrix.json',import.meta.url),'utf8'));

async function supplies(fx) {
  for(const p of htSupplyProfiles(fx.weapon()))await fx.service.replaceHTSupply(fx.weapon().id,
    {resourceId:p.id,requestId:crypto.randomUUID(),expected:null});
}
async function ready(id) {
  const fx=await fixture(id);fx.actor.system.attributes.DX.value=20;
  await supplies(fx);const t=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
  assert.ok(t,id);await load(fx,t,fx.weapon().capacity);return fx;
}
for(const [id,p] of Object.entries(HT_PRE_GAUSS_PROFILES))test(id+' source-specific '+p.kind+' loads, prepares, rolls and freezes without duplicate expenditure',async()=>{
  const fx=await ready(id),before=fx.weapon().totalAmmo,profile=fx.profile();
  assert.equal(fx.attack().readinessReason,null);assert.equal(profile.damage.nativeSafe,true);
  assert.equal(profile.compatibility.status,'compatible');assert.equal(fx.weapon().capacity,p.capacity);
  assert.notEqual(profile.resource.kind,'unmanaged');
  const cancelled=await shoot(fx,1,{cancel:true});assert.equal(cancelled.rolled,false);assert.equal(fx.weapon().totalAmmo,before);
  const attackId=crypto.randomUUID(),shot=await shoot(fx,1,{attackId}),frozen=JSON.stringify(shot.snapshot);
  assert.equal(shot.rolled,true);assert.equal(fx.weapon().totalAmmo,before-1);
  if(['net','signal','squirt'].includes(p.kind)){
    assert.equal(shot.profile.damage.formula,null);assert.deepEqual(shot.profile.damage.components,[]);
    assert.equal(shot.rollData.followon,'');assert.doesNotMatch(shot.message.content,/D:|0d6|1d6/);
  }else assert.ok(shot.rollData.followon.includes('D:'));
  for(const e of shot.receipt.htSupplies){assert.equal(fx.weapon().htSupplies[e.id].remaining,e.after);assert.equal(e.spent,e.manualEquipment?0:1);}
  const after=JSON.stringify(fx.state());assert.equal((await shoot(fx,1,{attackId})).duplicate,true);assert.equal(JSON.stringify(fx.state()),after);
  await fx.service.loadState();assert.equal(JSON.stringify(shot.snapshot),frozen);
  const restored=structuredClone(fx.state());await fx.actor.setFlag('world','gurpsAmmoManager',restored);
  assert.equal(JSON.stringify(fx.state()),after);
  const brief=ammunitionChatData(shot.profile);assert.ok(brief.lines.length<=3);
});

test('mixed incomplete/ambiguous/malformed skill records retain the valid UT attack and explicit player choice',async()=>{
  const fx=await fixture('WIAo1otMCstnbi4Dv');fx.actor.system.attributes.DX.value=20;
  const service=new StandaloneWeaponService(fx.actor,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(catalogs.getEquipmentForMode('WQiw6nornpsdGHCov').equipment_id);
  const bola=await service.save(draft),original=JSON.stringify(catalogs.getMode('WQiw6nornpsdGHCov'));
  let attacks=listStandaloneAttacks(fx.actor,'ranged');assert.equal(attacks.length,2);
  const bolaAttack=attacks.find(a=>a.standaloneRef.weaponId===bola.id);
  assert.equal(bolaAttack.readinessReason,null);assert.equal(bolaAttack.level,14);
  assert.equal(bolaAttack.standaloneRef.governingSkill.family,'sling');assert.equal(bolaAttack.standaloneRef.governingSkill.source,'attribute-default');
  assert.equal(attacks.find(a=>a.standaloneRef.weaponId===fx.record.id).governingSkillBinding.weaponId,fx.record.id);
  assert.equal(attacks.find(a=>a.standaloneRef.weaponId===fx.record.id).readinessReason,null);
  fx.actor.system.skills={s:{name:'Sling',level:17,points:1}};
  const chosen=structuredClone(bola.modes[0]);chosen.overrides.governingSkill='Sling';
  assert.equal(resolveStandaloneSkill({actor:fx.actor,record:bola,mode:chosen}).level,17);
  assert.equal(JSON.stringify(catalogs.getMode('WQiw6nornpsdGHCov')),original);
  const absent=structuredClone(chosen);absent.overrides={};absent.snapshot.governing_skill={status:'resolved',skill:null};
  absent.snapshot.governing_skill_selection={strategy:'fixed',candidates:[]};
  assert.match(resolveStandaloneSkill({actor:fx.actor,record:bola,mode:absent}).reason,/не определён/);
  const flag=fx.actor.getFlag('olegurps-qol','standaloneWeapons');
  const bad=flag.weapons.find(w=>w.id===bola.id);bad.modes[0].snapshot.governing_skill={status:'resolved',skill:{name:'Bolas'}};bad.modes[0].snapshot.defaults={invalid:true};
  await fx.actor.setFlag('olegurps-qol','standaloneWeapons',flag);
  // Confirmed old LT source metadata is repaired in the detached P3 source view.
  // The persisted malformed snapshot remains untouched; unknown revisions still diagnose.
  attacks=listStandaloneAttacks(fx.actor,'ranged');assert.equal(attacks.find(a=>a.standaloneRef.weaponId===bola.id).level,17);
  assert.deepEqual(fx.actor.getFlag('olegurps-qol','standaloneWeapons').weapons.find(w=>w.id===bola.id).modes[0].snapshot.defaults,{invalid:true});
  bad.source.sourceHash='unknown-original-revision';bad.modes[0].snapshot.governing_skill_selection={strategy:'fixed',candidates:[]};
  await fx.actor.setFlag('olegurps-qol','standaloneWeapons',flag);
  const savedConsole=console.error,logs=[];console.error=(...v)=>logs.push(v);
  try{attacks=listStandaloneAttacks(fx.actor,'ranged');}finally{console.error=savedConsole;}
  assert.ok(logs.length);assert.equal(attacks.length,2);assert.equal(attacks.find(a=>a.standaloneRef.weaponId===bola.id).diagnosticCode,'StandaloneRecordInvalid');
  assert.equal(attacks.find(a=>a.standaloneRef.weaponId===fx.record.id).readinessReason,null);
});

test('nail guns require independent supplies and use HT28 Guns(Pistol)-4, never refill on opening',async()=>{
  for(const id of ['Wb-nkbkql8XJJvgiI','WyhfUd4p19uPxyebR','WScYMOOBTYb_ixODI']){
    const fx=await fixture(id),t=fx.candidates().find(t=>!t.unavailable);await load(fx,t,50);
    await assert.rejects(()=>shoot(fx),/ресурс|питани/);
    await supplies(fx);const tl=catalogs.getEquipmentForMode(id).tech_level;
    fx.actor.system.skills={p:{name:'Guns/TL'+tl+' (Pistol)',level:18,points:1}};
    assert.equal(fx.attack().level,14);assert.equal(fx.attack().acc,0);
    const shot=await shoot(fx);for(const e of shot.receipt.htSupplies)assert.equal(e.spent,e.manualEquipment?0:1);
    const frozen=JSON.stringify(fx.weapon().htSupplies);await fx.service.loadState();assert.equal(JSON.stringify(fx.weapon().htSupplies),frozen);
    if(id==='Wb-nkbkql8XJJvgiI')assert.deepEqual(Object.values(fx.weapon().htSupplies).map(p=>p.remaining),[999,3999]);
    if(id==='WyhfUd4p19uPxyebR')assert.equal(fx.weapon().htSupplies.blanks.remaining,9);
  }
});

test('resource replacement uses owner queue, expected state and idempotent request; depleted or changed resource prevents expenditure',async()=>{
  const fx=await ready('Wb-nkbkql8XJJvgiI'),weaponId=fx.weapon().id;
  const expected=structuredClone(fx.weapon().htSupplies.fuel),requestId=crypto.randomUUID();
  await fx.service.replaceHTSupply(weaponId,{resourceId:'fuel',expected,requestId});
  await shoot(fx);assert.equal(fx.weapon().htSupplies.fuel.remaining,999);
  await fx.service.replaceHTSupply(weaponId,{resourceId:'fuel',expected,requestId});assert.equal(fx.weapon().htSupplies.fuel.remaining,999);
  await assert.rejects(()=>fx.service.replaceHTSupply(weaponId,{resourceId:'fuel',expected,requestId:crypto.randomUUID()}),/изменён/);
  const state=fx.state();state.weapons[0].htSupplies.ignition.remaining=0;await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const before=JSON.stringify(fx.state());await assert.rejects(()=>shoot(fx),/ресурс/);assert.equal(JSON.stringify(fx.state()),before);
  fx.actor.isOwner=false;await assert.rejects(()=>fx.service.replaceHTSupply(weaponId,{resourceId:'fuel',expected:null,requestId:'denied'}),/Permission/);
});

test('Beattie continuous stream commits five prepared two-second charges atomically; flame native damage remains per-second',async()=>{
  const fx=await ready('WQ2MI3nooPOkJk6-C'),state=fx.state();state.weapons[0].htJetMode='continuous';
  await fx.actor.setFlag('world','gurpsAmmoManager',state);const p=fx.profile();assert.equal(p.damage.rules.liquidJet.seconds,10);assert.equal(p.damage.formula,'3d burn');
  const shot=await shoot(fx);assert.equal(shot.spent,5);assert.equal(fx.weapon().totalAmmo,0);
  const short=await ready('WQ2MI3nooPOkJk6-C'),type=short.candidates().find(t=>t.ammoId.endsWith('_unthickened'));
  await short.transaction('unload',{magazineId:short.weapon().ammunitionInventory.installedId,amount:short.weapon().magazines[0]});await load(short,type,1);
  assert.equal(short.profile().effective.range,'12.5/20');assert.equal(short.profile().damage.formula,'3d burn');
  assert.equal(parseRateOfFire('Jet').type,'jet');assert.equal(short.attack().acc,null);assert.equal(short.attack().platformRules.rclNotApplicable,true);
});

test('both Slingshot source modes select stone/lead/steel; repeated resolution never multiplies metal damage or range again',async()=>{
  for(const id of ['WXGTBHA2uYykWT3zr','WEEouaNXXdn8XU129'])for(const suffix of ['stone','lead','steel']){
    const fx=await fixture(id),type=fx.candidates().find(t=>t.ammoId==='olegurps_ht_sling_'+suffix);assert.ok(type);
    await load(fx,type,1);for(let i=0;i<3;i++){assert.equal(fx.profile().damage.formula,suffix==='stone'?'1d-1 cr':'1d cr');assert.equal(fx.profile().effective.range,suffix==='stone'?'60/100':'120/200');}
  }
});

test('Squirt owner content supports empty Note, independent batches, edit and frozen history without creating liquid',async()=>{
  const fx=await ready('WsyoKGgbZuPilRXla'),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
  await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.installedId,amount:fx.weapon().magazines[0]});
  const type={...base,name:'Жидкость владельца',recipe:{version:1,variantId:'ht_squirt_liquid',customId:crypto.randomUUID(),parameters:{note:'',savingThrow:'HT',description:'Owner <content>'}}};type.key=ammoTypeKey(type);
  const before=fx.weapon().totalAmmo;await fx.transaction('save-recipe',{type});assert.equal(fx.weapon().totalAmmo,before);
  await assert.rejects(()=>fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:type.key,amount:1}),/InsufficientStock/);
  await load(fx,type,2);const shot=await shoot(fx),old=JSON.stringify(shot.snapshot);
  assert.equal(shot.profile.damage.formula,null);assert.equal(shot.profile.damage.rules.payload.note,'');assert.match(shot.message.content,/Owner &lt;content&gt;/);
  const changed=structuredClone(type);changed.recipe.parameters.note='Other';await fx.transaction('edit-recipe',{ammoKey:type.key,type:changed});
  assert.equal(JSON.stringify(shot.snapshot),old);assert.equal(fx.profile().damage.rules.payload.note,'Other');
  const html=ammoManagementHTML(fx.weapon(),{ammoKey:type.key,magazineId:fx.weapon().ammunitionInventory.installedId},fx.candidates());assert.match(html,/Содержимое жидкости/);
});

test('Zip-Gun follows approved .22 LR policy; NORINCO uses finite HT resistance profiles and historical source data are not edited',async()=>{
  const zip=await fixture('WwlfY-FYthqkLvByK');assert.equal(zip.weapon().totalAmmo,0);assert.equal(zip.attack().readinessReason,null);
  for(const [id,capacity,modifier] of [['WALzMQGej7znsQIsa',100,-5],['W46_tIuztoKnpftYj',1000,-10]]){
    const fx=await fixture(id);assert.equal(fx.attack().readinessReason,null);
    assert.equal(fx.weapon().htLaserBattery.charge,capacity);assert.deepEqual(fx.weapon().magazines,[]);
    const shot=await shoot(fx);assert.equal(shot.rolled,true);assert.equal(shot.receipt.power.spent,1);
    assert.equal(fx.weapon().htLaserBattery.charge,capacity-1);assert.equal(shot.profile.damage.formula,null);
    const effect=shot.snapshot.profile.damage.rules.resistanceEffect;
    assert.equal(effect.attribute,'HT');assert.equal(effect.modifier,modifier);
    assert.equal(shot.profile.damage.rules.instructionOnly,true);
  }
  const historical=JSON.parse(await readFile(new URL('./fixtures/ht-pre-gauss-history.json',import.meta.url),'utf8'));
  assert.equal(historical.gaussTransition.criticalSharedBlockerCount,1);assert.equal(historical.records.filter(r=>r.book==='LT'&&r.status==='BROKEN').length,71);
  assert.equal(htPreGaussProfile('WqUeIOkvQIgCeKWou'),null);
});

for(const mode of currentUT.modes)test('UT regression '+mode.modeId+' keeps its prepared native shot, finite resource and frozen history',async()=>{
  const fx=await ready(mode.modeId),old=fx.weapon().totalAmmo;
  const shot=await shoot(fx,1,{context:{manualGuidanceConfirmed:true,shotgun:{physicalDistance:10}}});
  assert.equal(shot.rolled,true);assert.equal(shot.spent,1);assert.equal(fx.weapon().totalAmmo,old-1);
  assert.equal(shot.profile.damage.nativeSafe,true);assert.equal(shot.profile.damage.rules.htSourceProfile,undefined);
});

test('supplies cannot race a real execution or create oversize fixed feeds',async()=>{
  const fx=await ready('Wb-nkbkql8XJJvgiI'),before=fx.weapon().totalAmmo;
  await assert.rejects(()=>fx.transaction('add-magazines',{capacity:100,amount:1}),/FixedFeedLimit/);
  await assert.rejects(()=>fx.service.executeShot({weaponId:fx.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:fx.profile()}),execute:async()=>{
    const state=fx.state();state.weapons[0].htSupplies.fuel.remaining-=1;await fx.actor.setFlag('world','gurpsAmmoManager',state);return {rolled:true};
  }}),/изменился/);
  assert.equal(fx.weapon().totalAmmo,before);assert.equal(fx.weapon().htSupplies.ignition.remaining,4000);
});

test('source UI stays Russian for ru/en without modifying global language; Spec guard is scoped to the reviewed HT modes',async()=>{
  const fx=await ready('WsyoKGgbZuPilRXla');for(const language of ['ru','en']){
    const html=ammoManagementHTML(fx.weapon(),{language,ammoKey:fx.candidates()[0].key,magazineId:fx.weapon().ammunitionInventory.installedId},fx.candidates());
    assert.match(html,/Резервуар|Ёмкость, пинт/);assert.match(html,/Содержимое жидкости/);
  }
  const prior=globalThis.GURPS;globalThis.GURPS={parselink:s=>({action:/^[0-9]/.test(s)?{type:'damage'}:null})};
  try {const net=await ready('WI9EWrbCRSJOCS_y4');assert.equal(net.attack().readinessReason,null);assert.equal(net.profile().damage.formula,null);}
  finally{if(prior===undefined)delete globalThis.GURPS;else globalThis.GURPS=prior;}
});

test('DWM FmW46 is a spent disposable unit, never a refillable one-shot tank',async()=>{
  const fx=await ready('W073XWePe7F0ZsLMX'),type=fx.candidates().find(t=>!t.unavailable);
  await shoot(fx);assert.equal(fx.weapon().ammunitionInventory.magazines[0].sealedUsed,true);
  await fx.transaction('add-stock',{ammoKey:type.key,amount:1});
  await assert.rejects(()=>fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:type.key,amount:1}),/SealedResourceSpent/);
  assert.equal(fx.weapon().magazines[0],0);assert.equal(fx.weapon().totalAmmo,1);
});

test('Jet preview preserves source null Acc/Rcl and ignores range and Aim; concise instructions have one chat location',async()=>{
  const fx=await ready('WsyoKGgbZuPilRXla'),attack=withRuntimeAmmoStats(fx.attack(),fx.actor,fx.state());
  assert.equal(attack.acc,null);assert.equal(attack.ammunitionRange,null);
  assert.equal(attack.ammunitionConditions.length,1);
  const token={id:'jet-token',actor:fx.actor},context=createFireControlContext({token,fireService:new FireService({actor:fx.actor,token})});
  const details=context.calculateEffectiveFireSkillDetails(attack,{shots:'1',rangeIndex:1,configuredPreview:true,aimSeconds:4,braced:true},
    [{index:0,max:2,penalty:0,label:'2'},{index:1,max:10,penalty:-4,label:'10'}],{getSelection:()=>({zoneId:'torso',penalty:0,label:'Torso'})});
  for(const id of ['range','aim','braced'])assert.equal(details.combatCalculation.channels.find(c=>c.id===id).resolvedValue,0);
  const shot=await shoot(fx);assert.deepEqual(shotAmmunitionConditions(shot.message),[]);
  assert.equal(ammunitionChatData(shot.profile).lines.length,1);
});

test('an OWNER without GM role manages independent supplies',async()=>{
  const previous=game.user.isGM;game.user.isGM=false;
  try{const fx=await ready('Wb-nkbkql8XJJvgiI');assert.equal((await shoot(fx)).spent,1);assert.equal(fx.weapon().htSupplies.fuel.remaining,999);}
  finally{game.user.isGM=previous;}
});
