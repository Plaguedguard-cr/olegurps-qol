import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gaussFixture as fixture,catalogs,compatibility} from './helpers/gauss-context.mjs';
import {PLASMA_GUN_PROFILES,PLASMA_CARTRIDGES,plasmaCartridge} from '../scripts/ut-plasma-gun-source.js';
import {weaponPowerProfile} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
const inventory=JSON.parse(await readFile(new URL('../docs/audit/ut-weapons-inventory.json',import.meta.url),'utf8'));
const normal=f=>f.candidates().find(t=>!PLASMA_CARTRIDGES[t.ammoId]?.hot);
const hot=f=>f.candidates().find(t=>PLASMA_CARTRIDGES[t.ammoId]?.hot);
for(const p of Object.values(PLASMA_GUN_PROFILES)){
 test(p.name+': UT128 individual fields, skills/defaults, finite empty physical feed and no battery',async()=>{
  const f=await fixture(p.modeId),m=catalogs.getMode(p.modeId),r=inventory.records.find(r=>r.equipmentId===p.equipmentId),fields=r.source.tableRows[0].fields;
  assert.equal(r.modeIds[0],p.modeId);assert.equal(catalogs.getEquipmentForMode(p.modeId).tech_level,p.tl+'^');
  for(const [key,field] of Object.entries({accuracy:'Acc',range:'Range',rate_of_fire:'RoF',shots:'Shots',strength:'ST',bulk:'Bulk',recoil:'Rcl'}))assert.equal(m.stats[key],fields[field]);
  assert.equal(fields.Damage.replaceAll('¥','x').replace(/\s/g,''),p.damage.replace(/\s/g,''));
  assert.equal(Number(fields.Cost.replace(/[$,]/g,'')),p.cost);assert.equal(Number(fields.Weight.split('/')[0].replaceAll(',','')),p.weightLb);assert.equal(Number(fields.LC),p.lc);
  assert.equal(m.governing_skill.skill.name,p.specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,p.specialty);assert.equal(f.attack().level,14);
  assert.ok(m.defaults.some(d=>d.type==='dx'&&d.modifier===-4));assert.equal(m.stats.recoil,'2');
  assert.equal(f.weapon().capacity,p.shots);assert.equal(f.weapon().totalAmmo,0);assert.equal(f.weapon().ammunitionInventory.magazines[0].sourceFeed.reloadSeconds,p.reload);
  assert.equal(weaponPowerProfile(f.weapon()),null);assert.equal(f.candidates().length,p.hotAllowed?2:1);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
  for(const c of f.candidates()){const record=catalogs.getAmmoFamily('ut',c.ammoId);assert.equal(record.caliber_mm,null);assert.equal(record.cps_usd,null);assert.equal(record.wps_lb,null);}
 });
 test(p.name+': standard native burst spends one cartridge per shot, cancel and immutable history',async()=>{
  const f=await fixture(p.modeId);await f.load(normal(f),p.shots);const original=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),original);
  const shot=await f.shoot(p.rof);assert.equal(shot.receipt.spent,p.rof);assert.equal(shot.receipt.power,undefined);assert.equal(shot.profile.damage.formula,p.damage);assert.equal(shot.profile.effective.rcl,'2');assert.equal(shot.rollData.rofrcl,Math.min(p.rof,3));
  assert.equal(f.weapon().totalAmmo,p.shots-p.rof);assert.equal(shot.profile.damage.components.length,1);assert.match(shot.rollData.followon,/D:/);
  const snapshot=JSON.stringify(shot.snapshot),charge=f.weapon().totalAmmo;await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));await new AmmoService(f.actor).loadState();
  assert.equal(f.weapon().totalAmmo,charge);assert.equal(JSON.stringify(shot.snapshot),snapshot);assert.equal(shot.snapshot.profile.ammunition.ammoId,normal(f).ammoId);
  const chat=ammunitionChatData(shot.profile);assert.ok(chat.lines.length<=2);assert.doesNotMatch(chat.lines.join(' '),/батаре|патрон|Basic Set|реализац|расход/);
 });
 test(p.name+': Hot cartridges are distinct stock; Gatling denial cannot be bypassed by IDs',async()=>{
  const f=await fixture(p.modeId),choice=hot(f);assert.equal(!!choice,p.hotAllowed);
  if(choice){
   await f.load(choice,2);const shot=await f.shoot(1);assert.equal(shot.receipt.spent,1);assert.equal(f.weapon().totalAmmo,1);assert.equal(shot.profile.weaponReliability.malf,14);
   const m=p.damage.match(/^(\d+)d([+-]\d+)?(?:x(\d+))?/);assert.equal(shot.profile.damage.formula,m[1]+'d+'+(Number(m[1])+Number(m[2]??0))+(m[3]?'x'+m[3]:'')+'(2) burn ex');
   assert.equal(shot.profile.damage.rules.plasmaGun.hot,true);assert.equal(shot.snapshot.profile.ammunition.ammoId,choice.ammoId);assert.equal(shot.profile.damage.rules.plasmaParticle,undefined);
  }else{
   const type={...normal(f),ammoId:'olegurps:plasma-cartridge:'+p.modeId+':hot'};assert.equal(plasmaCartridge(p.modeId,type),null);await assert.rejects(()=>f.tx('add-stock',{type,ammoKey:type.key,amount:1}));
  }
 });
 test(p.name+': magazines, loose stock, active selection, exact capacity and limit ten',async()=>{
  const f=await fixture(p.modeId),type=normal(f);await f.tx('add-stock',{ammoKey:type.key,amount:2*p.shots});await f.tx('add-magazines',{amount:9,capacity:p.shots});
  assert.equal(f.weapon().ammunitionInventory.magazines.length,10);await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:p.shots}));await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:p.shots+1}));
  const ids=f.weapon().ammunitionInventory.magazines.map(m=>m.id);await f.tx('load',{magazineId:ids[0],ammoKey:type.key,amount:p.shots});await f.tx('load',{magazineId:ids[1],ammoKey:type.key,amount:2});
  const otherDraft=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged'});otherDraft.selectModel(p.equipmentId);const other=await f.definitions.save(otherDraft);await f.service.loadState();const otherWeapon=f.state().weapons.find(w=>w.standaloneWeaponId===other.id);
  await assert.rejects(()=>f.service.transferMagazine(otherWeapon.id,f.weapon().id,otherWeapon.ammunitionInventory.magazines[0].id));
  await f.tx('install',{magazineId:ids[1]});await f.shoot();assert.equal(f.weapon().ammunitionInventory.magazines[1].rounds,1);assert.equal(f.weapon().ammunitionInventory.magazines[0].rounds,p.shots);
  await f.tx('unload',{magazineId:ids[1],amount:1});assert.equal(f.weapon().ammunitionInventory.magazines[1].rounds,0);await assert.rejects(()=>f.shoot());await f.tx('install',{magazineId:ids[0]});assert.equal(f.weapon().capacity,p.shots);
 });
 test(p.name+': duplicate/concurrent attacks, stale Save, last round, insufficient burst and OWNER',async()=>{
  const f=await fixture(p.modeId);await f.load(normal(f),2);const stale=f.state(),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(f.weapon().totalAmmo,1);
  await f.service.saveState(stale);assert.equal(f.weapon().totalAmmo,1);if(p.rof>1)await assert.rejects(()=>f.shoot(2));await f.shoot();assert.equal(f.weapon().totalAmmo,0);await assert.rejects(()=>f.shoot());await assert.rejects(()=>f.shoot(p.rof+1));
  f.actor.isOwner=false;await assert.rejects(()=>f.tx('add-stock',{ammoKey:normal(f).key,amount:1}));await assert.rejects(()=>f.shoot());
 });
 test(p.name+': reject foreign/recipe/forged cartridges, batteries, ETC/LP and ordinary Hotshot flags',async()=>{
  const f=await fixture(p.modeId),type=normal(f),other=Object.values(PLASMA_CARTRIDGES).find(c=>c.plasmaGunModeId!==p.modeId);assert.equal(compatibility.checkCompatibility(p.modeId,other.id,{book:'ut',kind:'ammo-family'}).status,'incompatible');
  for(const bad of [{...type,ammoId:other.id},{...type,source:'user'},{...type,recipe:{variantId:'ut_he'}}])await assert.rejects(()=>f.tx('add-stock',{type:bad,ammoKey:bad.key,amount:1}));
  await f.load(type,2);for(const change of [{executionVariant:'etc'},{executionVariant:'lp'},{blasterHotshot:true},{omniBlaster:true}]){const state=f.state();Object.assign(state.weapons[0],change);await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
  assert.equal(Object.keys(f.weapon()).some(k=>/heat|cooling/i.test(k)),false);
 });
}
test('Hot cartridge Malf14 uses the original native attack; ordinary cartridges retain their ordinary result',async()=>{
 const f=await fixture('W42mmtM2Oihtfy08e');await f.load(hot(f),3);let chatdata;
 const runtime={game,canvas:{tokens:{placeables:[]}},GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
  Roll:{create:formula=>({formula,total:14,dice:[{results:[6,5,3].map(result=>({result}))}],async evaluate(){return this;}})},
  renderTemplate:async(_path,data)=>{chatdata=data;return JSON.stringify(data);},ChatMessage:{getSpeaker:()=>({actor:f.actor.id}),create:async d=>({...d,id:crypto.randomUUID()})}};
 await executePreparedGgaRoll({actor:f.actor,attack:f.attack(),attackProfile:f.profile(),effectiveSkill:24,physicalShots:1,effectiveRoF:1,rcl:2,consumeAction:false,runtime});
 assert.equal(chatdata.failure,true);assert.equal(chatdata.rofrcl,0);
 await f.tx('unload',{magazineId:f.weapon().ammunitionInventory.installedId,amount:3});await f.load(normal(f),2);
 await executePreparedGgaRoll({actor:f.actor,attack:f.attack(),attackProfile:f.profile(),effectiveSkill:24,physicalShots:1,effectiveRoF:1,rcl:2,consumeAction:false,runtime});
 assert.equal(chatdata.failure,false);assert.equal(chatdata.rofrcl,1);
});
