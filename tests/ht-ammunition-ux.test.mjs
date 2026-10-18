import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs,compatibility,resolver,api,context} from './fixtures/ht-special-context.mjs';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {availableAmmoTypes,displayedAmmoTypes,ammoManagementHTML,AmmoManagementApp} from '../scripts/tools/ammo-management-app.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {ammunitionChoiceGroup} from '../scripts/tools/ammunition-choices.js';
import {validateLoadBallistics,ballisticsKey} from '../scripts/tools/ammunition-ballistics.js';
import {ammunitionResourceContract} from '../scripts/tools/ammunition-resource-contract.js';
import fs from 'node:fs/promises';

function actorFixture(){const flags={};return {id:'ux-test',isOwner:true,system:{attributes:{DX:{value:16},IQ:{value:16}},skills:{}},
 getFlag:(s,k)=>flags[s]?.[k],setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};}
async function weaponFixture(modeId){const actor=actorFixture(),m=catalogs.getMode(modeId),e=catalogs.getEquipmentForMode(modeId),skill=m.governing_skill.skill;
 actor.system.skills.one={name:skill.name+'/TL'+e.tech_level+' ('+skill.specialization+')',level:16,points:1};
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(e.equipment_id);draft.modeIds=new Set([modeId]);
 const record=await new StandaloneWeaponService(actor,catalogs).save(draft),service=new AmmoService(actor),state=await service.loadState();
 return {actor,record,service,state,weapon:state.weapons.find(w=>w.standaloneModeId===modeId),modeId};}
// The prior 61 rows are the addressed scope, not a re-run of the full compatibility matrix.
const audit=readAuditFixture('ht-final-511-runtime-audit');
import {alternateLoadNeedsBallistics} from '../scripts/ht-published-loads.js';
const substitutions=audit.additionalUIChoices.filter(r=>alternateLoadNeedsBallistics(catalogs,r.modeId,r.ammoId,
 compatibility.checkCompatibility(r.modeId,r.ammoId,{book:'ht',kind:r.kind})));
test('scope retains exactly the 61 addressed HT178 substitutions',()=>assert.equal(substitutions.length,61));
for(const row of substitutions)test('manual HT178 exact pair '+row.modeId+' / '+row.ammoId,async()=>{
 const f=await weaponFixture(row.modeId),before=JSON.stringify(f.actor.system);
 const types=availableAmmoTypes(f.actor,f.weapon,api),type=types.find(t=>t.ammoId===row.ammoId&&!t.recipe);
 assert.ok(type);assert.equal(type.substitution,true);assert.equal(type.unavailable,true);assert.equal(ammunitionChoiceGroup(type),'conditional');assert.equal(type.ballistics,null);
 const make=state=>resolver.resolve({actorId:f.actor.id,weaponId:f.weapon.id,rawAttack:readStandaloneAttack(f.actor,f.record.id,row.modeId).data,
 state,binding:{status:'confirmed',binding:{confirmed:true,modeId:row.modeId}},ammunition:{type,ammoKey:type.key}});
 assert.equal(make(f.state).damage.reason,'AlternateLoadBallisticsRequired');
 await f.service.saveLoadBallistics(f.weapon.id,row.modeId,type,{damage:'1d pi',range:'50/500'},api);
 const state=await f.service.loadState(),profile=make(state);
 assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.effective.damage,'1d pi');assert.equal(profile.effective.range,'50/500');
 assert.equal(profile.damage.rules.alternateLoad.approvedByBook,false);
 const reload=new AmmoService(f.actor);assert.equal((await reload.loadState()).ammunitionBallistics[ballisticsKey(f.weapon.id,row.modeId,type.key)].damage,'1d pi');
 const ready=availableAmmoTypes(f.actor,state.weapons.find(w=>w.id===f.weapon.id),api).find(t=>t.key===type.key);
 assert.equal(ready.unavailable,false);assert.equal(ready.substitution,true);
 const html=ammoManagementHTML(state.weapons.find(w=>w.id===f.weapon.id),{ammoKey:ready.key},[ready]);assert.match(html,/gam-substitution/);assert.match(html,/Заменяющий/);
 assert.equal(JSON.stringify(f.actor.system),before);
 assert.equal(make({...state,ammunitionBallistics:{}}).damage.nativeSafe,false);
});
test('invalid numerical inputs cannot prepare a load',()=>{for(const v of [{damage:'0d pi',range:'1/2'},{damage:'1d pi',range:'0/10'},{damage:'1d pi',range:'10/5'},{damage:'NaN',range:'1/2'},{damage:'1d pi',range:''},{damage:'1d pi',range:'-1/20'}])assert.throws(()=>validateLoadBallistics(v));});
test('manual input cannot open unproven or reverse physical pairs',async()=>{const f=await weaponFixture('W27s4Lm8QlkKVKUPn'),type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:'ht_22_short_5_7x11mmr'};type.key=ammoTypeKey(type);const old=JSON.stringify(f.actor.getFlag('world','gurpsAmmoManager'));await assert.rejects(f.service.saveLoadBallistics(f.weapon.id,f.modeId,type,{damage:'1d pi',range:'50/500'},api));assert.equal(JSON.stringify(f.actor.getFlag('world','gurpsAmmoManager')),old);});
test('forbidden constructs disappear, original cartridge remains Base, no invented legacy',async()=>{const f=await weaponFixture('W27s4Lm8QlkKVKUPn');const types=displayedAmmoTypes(f.actor,f.weapon,api);assert.ok(types.find(t=>!t.recipe&&/Базовый/.test(t.label)));assert.ok(!types.some(t=>['ht_smoke','ht_illumination','ht_poison_gas'].includes(t.recipe?.variantId)));assert.ok(!types.some(t=>t.historical));});
test('legacy strict policy admits complete owner-defined designs without admitting unknown constructs',async()=>{
 const f=await weaponFixture('W27s4Lm8QlkKVKUPn'),get=game.settings.get;
 game.settings.get=(s,k)=>k==='preparedAmmoPolicy'?'strict':k==='ammunitionApprovals'?{}:get(s,k);
 try{const types=availableAmmoTypes(f.actor,f.weapon,api),apex=types.find(t=>t.recipe?.variantId==='ht_apex');
  assert.ok(apex);assert.equal(apex.unavailable,false);assert.equal(ammunitionChoiceGroup(apex),'available');
  assert.equal(apex.preparation.rulesStatus,'undetermined');assert.ok(!types.some(t=>t.recipe?.variantId==='ht_smoke'));
 }finally{game.settings.get=get;}
});
test('historic stock keeps its name once and cannot admit new rounds',async()=>{const f=await weaponFixture('W27s4Lm8QlkKVKUPn');await f.service.inventoryTransaction(f.weapon.id,'initialize');const state=await f.service.loadState(),w=state.weapons.find(w=>w.id===f.weapon.id);w.ammunitionInventory.stocks.push({key:'old',type:{key:'old',source:'test',name:'Прежний патрон'},rounds:5});await f.actor.setFlag('world','gurpsAmmoManager',state);const rows=displayedAmmoTypes(f.actor,w,api).filter(t=>t.key==='old');assert.equal(rows.length,1);assert.match(rows[0].label,/Прежний патрон/);assert.equal(rows[0].unavailable,true);assert.equal(rows[0].historical,true);});
for(const [id,ammo]of Object.entries({W82oDY970UdeqLXTF:'ht_223_remington',Wkvf5salwlKpkRx_c:'ht_223_remington',WGJgRQusTscOtoLC9:'ht_223_remington',Wlk1hvahF3JF9aBB8:'ht_5_56x45mm_nato',WOAL2ladqiRbTuvRU:'ht_specific_mas_an_xiii_17_1_flintlock'}))test('reviewed source permits only verified load '+id,async()=>{const f=await weaponFixture(id);assert.ok(catalogs.getModeLinks(id).ammoItemIds.includes(ammo));assert.equal(compatibility.checkCompatibility(id,ammo,{book:'ht',kind:'ammo-item'}).status,'compatible');assert.ok(availableAmmoTypes(f.actor,f.weapon,api).some(t=>t.ammoId===ammo&&!t.recipe&&!t.unavailable));});
test('Zip-Gun has printed Acc 0 and project-approved .22 LR without free ammunition',async()=>{const f=await weaponFixture('WwlfY-FYthqkLvByK');assert.equal(catalogs.getMode(f.modeId).stats.accuracy,'0');assert.equal(f.weapon.totalAmmo,0);assert.ok(availableAmmoTypes(f.actor,f.weapon,api).some(t=>t.ammoId==='ht_22_long_rifle_5_7x16mmr'&&!t.recipe&&!t.unavailable));});
for(const id of ['WLtxCaJ16zBNXOM6B','WYtq-OBcCaZp7ShJJ','WmG_jTzAKmvFs5myW','WeXQmnN9negUgW4dp','WfQbQ4kVYxR2_9Ji1','WQymu6IvqV_kTwiqz','WCjHOf4oONWBafSAa','W0nH5aEN5CsOLWS2t'])test('missile uses native profile with manual guidance '+id,async()=>{const f=await weaponFixture(id),c=context(id),p=resolver.resolve({actorId:f.actor.id,weaponId:f.weapon.id,attack:readStandaloneAttack(f.actor,f.record.id,id),rawAttack:c.raw,binding:c.binding,ammunition:{type:c.base,ammoKey:ammoTypeKey(c.base)},context:{manualGuidanceConfirmed:true}});assert.equal(p.damage.nativeSafe,true);assert.equal(p.effective.rof,'1');assert.equal(p.damage.rules.ballisticRange.halfDamage,null);assert.equal(p.damage.rules.ballisticRange.minimum,catalogs.getAmmoItem('ht',c.base.ammoId).rocket_contract.min_range_yards??null);assert.equal(p.damage.rules.manualGuidance.automaticGuidance,false);assert.equal(p.damage.rules.manualGuidance.confirmed,true);assert.equal(p.damage.formula,c.raw.damage.replace(/\s*\[[^\]]*\]/g,''));});
test('Hydra laser package uses independently sourced HE, Acc4 and min300',()=>{const c=context('WjD-b9M0j2HJAcxyy'),a=catalogs.getAmmoItem('ht','ht_specific_hydra_laser_guided_70mm'),type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:a.id,name:a.name};const p=resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,ammunition:{type,ammoKey:ammoTypeKey(type)}});assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,'7dx3 cr ex');assert.equal(p.effective.acc,4);assert.equal(p.damage.rules.ballisticRange.minimum,300);assert.equal(p.damage.rules.guidancePackage.warheadAmmoId,'ht_specific_hydra_mk66_he');});

test('missile execution requires owner confirmation, commits one unit once and preserves disposable tube',async()=>{
  const f=await weaponFixture('WCjHOf4oONWBafSAa'),c=context(f.modeId),type={...c.base,key:ammoTypeKey(c.base)};
  await f.service.inventoryTransaction(f.weapon.id,'initialize');
  await f.service.inventoryTransaction(f.weapon.id,'add-stock',{ammoKey:type.key,amount:3},{allowedTypes:[type]});
  await f.service.inventoryTransaction(f.weapon.id,'add-magazines',{capacity:1,amount:1});
  const mag=(await f.service.loadState()).weapons.find(w=>w.id===f.weapon.id).ammunitionInventory.magazines[0];
  await f.service.inventoryTransaction(f.weapon.id,'load',{magazineId:mag.id,ammoKey:type.key,amount:1},{allowedTypes:[type]});
  let confirmed=false, executions=0;
  const prepare=({state,ammunition})=>({amount:1,profile:resolver.resolve({actorId:f.actor.id,weaponId:f.weapon.id,
    rawAttack:c.raw,binding:c.binding,state,ammunition,context:{manualGuidanceConfirmed:confirmed,shotgun:{physicalDistance:300}}})});
  const execute=async()=>{executions++;return {rolled:true};};
  await assert.rejects(f.service.executeShot({weaponId:f.weapon.id,attackId:'unapproved',prepare,execute}),/подтверд/i);
  assert.equal(executions,0);confirmed=true;game.user.isGM=false;
  try{const player=await f.service.executeShot({weaponId:f.weapon.id,attackId:'approved',prepare,execute});assert.equal(player.spent,1);}finally{game.user.isGM=true;}
  const result=await f.service.executeShot({weaponId:f.weapon.id,attackId:'approved',prepare,execute});
  assert.equal(result.duplicate,true);assert.equal(executions,1);
  await f.service.executeShot({weaponId:f.weapon.id,attackId:'approved',prepare,execute});assert.equal(executions,1);
  const state=await f.service.loadState(),w=state.weapons.find(w=>w.id===f.weapon.id);assert.equal(w.totalAmmo,2);
  assert.equal(w.ammunitionInventory.magazines[0].sealedUsed,true);assert.ok(ammunitionResourceContract(type));
  await assert.rejects(f.service.inventoryTransaction(w.id,'load',{magazineId:mag.id,ammoKey:type.key,amount:1},{allowedTypes:[type]}),/SealedResourceSpent/);
});
test('reference cache preserves options, frozen results and loading failure boundaries',()=>{
 const a=compatibility.checkCompatibility('W27s4Lm8QlkKVKUPn','ht_he',{book:'ht',kind:'projectile-option',ammoItemId:'ht_7_62x39mm',availabilityTL:4});
 const b=compatibility.checkCompatibility('W27s4Lm8QlkKVKUPn','ht_he',{book:'ht',kind:'projectile-option',ammoItemId:'ht_7_62x39mm',availabilityTL:9});
 assert.notStrictEqual(a,b);assert.ok(Object.isFrozen(a));assert.throws(()=>a.status='compatible');
 assert.strictEqual(compatibility.checkCompatibility('W27s4Lm8QlkKVKUPn','ht_he',{book:'ht',kind:'projectile-option',ammoItemId:'ht_7_62x39mm',availabilityTL:4}),a);
});
test('current unresolved magazine selects its named historical state on opening',async()=>{
 const f=await weaponFixture('W27s4Lm8QlkKVKUPn');await f.service.inventoryTransaction(f.weapon.id,'initialize');
 const state=await f.service.loadState(),w=state.weapons.find(w=>w.id===f.weapon.id);
 await f.service.inventoryTransaction(w.id,'add-magazines',{capacity:30,amount:1});
 const current=await f.service.loadState(),weapon=current.weapons.find(entry=>entry.id===w.id),mag=weapon.ammunitionInventory.magazines[0];
 weapon.ammunitionInventory.stocks.push({key:'historic',type:{key:'historic',source:'test',name:'Прежнее имя'},rounds:3});
 Object.assign(mag,{ammoKey:'historic',rounds:2});weapon.ammunitionInventory.installedId=mag.id;
 await f.actor.setFlag('world','gurpsAmmoManager',current);
 const original=globalThis.OleGURPSQOL;globalThis.OleGURPSQOL=api;
 try {const app=Object.create(AmmoManagementApp.prototype);Object.assign(app,{actor:f.actor,service:f.service,weaponId:w.id,ui:{}});
  const context=await app._prepareContext();assert.equal(app.ui.ammoKey,'historic');assert.match(context.types.find(t=>t.key==='historic').label,/Прежнее имя/);
 }finally{globalThis.OleGURPSQOL=original;}
});
test('changing Hydra from laser HE to ordinary HE clears only the live guidance overlay',async()=>{
 const f=await weaponFixture('WjD-b9M0j2HJAcxyy'),original=globalThis.OleGURPSQOL;globalThis.OleGURPSQOL=api;
 try {
  await f.service.inventoryTransaction(f.weapon.id,'initialize');
  await f.service.inventoryTransaction(f.weapon.id,'add-magazines',{capacity:1,amount:2});
  const state=await f.service.loadState(),w=state.weapons.find(w=>w.id===f.weapon.id),mags=w.ammunitionInventory.magazines;
  const ids=['ht_specific_hydra_laser_guided_70mm','ht_specific_hydra_mk66_he'];
  for(const [i,id]of ids.entries()){const type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:id,name:catalogs.getAmmoItem('ht',id).name};type.key=ammoTypeKey(type);
   await f.service.inventoryTransaction(w.id,'add-stock',{ammoKey:type.key,amount:1},{allowedTypes:[type]});
   await f.service.inventoryTransaction(w.id,'load',{magazineId:mags[i].id,ammoKey:type.key,amount:1},{allowedTypes:[type]});}
  await f.service.inventoryTransaction(w.id,'install',{magazineId:mags[0].id});
  const attack=readStandaloneAttack(f.actor,f.record.id,f.modeId),laser=withRuntimeAmmoStats(attack,f.actor);
  assert.equal(laser.platformRules.manualGuidance,true);assert.equal(laser.rof,'1');assert.equal(laser.acc,4);
  await f.service.inventoryTransaction(w.id,'install',{magazineId:mags[1].id});
  const ordinary=withRuntimeAmmoStats(laser,f.actor);
  assert.equal(ordinary.platformRules,undefined);assert.equal(ordinary.rof,'7');assert.equal(ordinary.acc,2);assert.equal(ordinary.data.range,'70/10,500');
  assert.equal(laser.platformRules.manualGuidance,true);
 }finally{globalThis.OleGURPSQOL=original;}
});

test('replacement ballistics disclosure opens missing fields and closes saved fields in ru and en',async()=>{
 const row=substitutions[0],f=await weaponFixture(row.modeId);
 const type=availableAmmoTypes(f.actor,f.weapon,api).find(t=>t.ammoId===row.ammoId&&!t.recipe);
 for(const language of ['ru','en']){
  const html=ammoManagementHTML(f.weapon,{ammoKey:type.key,language},[type]);
  assert.match(html,/<details data-load-ballistics open>/);
  assert.match(html,/<summary>\u0425\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438/);
 }
 await f.service.saveLoadBallistics(f.weapon.id,row.modeId,type,{damage:'1d pi',range:'50/500'},api);
 const weapon=(await f.service.loadState()).weapons.find(w=>w.id===f.weapon.id),ready=availableAmmoTypes(f.actor,weapon,api).find(t=>t.key===type.key);
 for(const language of ['ru','en']){
  const html=ammoManagementHTML(weapon,{ammoKey:ready.key,language},[ready]);
  assert.match(html,/<details data-load-ballistics >/);assert.doesNotMatch(html,/<details data-load-ballistics open>/);
  assert.match(html,/name="load-damage" value="1d pi"/);assert.match(html,/name="load-range" value="50\/500"/);
  assert.ok(html.indexOf('data-ammo-origin')<html.indexOf('<details data-load-ballistics'));
  assert.match(ammoManagementHTML(weapon,{ammoKey:ready.key,language,ballisticsOpen:true},[ready]),/<details data-load-ballistics open>/);
 }
 assert.doesNotMatch(ammoManagementHTML(f.weapon,{ammoKey:type.key,ballisticsOpen:false},[type]),/<details data-load-ballistics open>/);
});
test('replacement ballistics disclosure captures toggle and draft across refresh',()=>{
 const ui={},panel={open:false},root={querySelector:s=>s==='[data-load-ballistics]'?panel:s==='[name="load-damage"]'?{value:'1d pi'}:s==='[name="load-range"]'?{value:'50/500'}:null,querySelectorAll:()=>[]};
 AmmoManagementApp.prototype._captureInputs.call({element:root,ui});
 assert.equal(ui.ballisticsOpen,false);assert.deepEqual(ui.ballisticsDraft,{damage:'1d pi',range:'50/500'});
 panel.open=true;AmmoManagementApp.prototype._captureInputs.call({element:root,ui});assert.equal(ui.ballisticsOpen,true);
});
