import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {automatic} from './helpers/gauss-context.mjs';
import {DISPLACERS,LADARS,AESA,ROBOTS,nextElevenProfile,ladarRange} from '../scripts/ut-next-eleven-source.js';
import {readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft,searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome} from '../scripts/tools/resistance-roll.js';
import {robotAmmunitionAllowed} from '../scripts/tools/ut-robot-ammunition.js';
import {campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {sensorTargetingBonus} from '../scripts/tools/fire-control-context.js';
globalThis.canvas={scene:{id:'unit-scene'}};
const area={areaPoint:{x:150,y:150,sceneId:'unit-scene'},physicalDistance:10};
test('eleven distinct source identities are searchable in the real model selector',()=>{
 const all=[...Object.values(DISPLACERS),...Object.values(LADARS),AESA,...Object.values(ROBOTS)];
 assert.equal(all.length,11);assert.equal(new Set(all.map(p=>p.modeId)).size,11);
 for(const p of all){assert.ok(nextElevenProfile(p.modeId));assert.equal(catalogs.getEquipmentForMode(p.modeId).equipment_id,p.equipmentId);assert.ok(searchStandaloneModels(catalogs,'ranged',p.name).some(e=>e.equipment_id===p.equipmentId));}
 assert.notEqual(ROBOTS.shuriken.modeId,'Sonic Shuriken');
});
for(const p of Object.values(DISPLACERS)){
 test(p.name+': exact table, physical cell set, native no-HP profile, one consumption and snapshot',async()=>{
  const f=await gaussFixture(p.modeId,{profileContext:area}),m=catalogs.getMode(p.modeId);
  assert.equal(m.stats.accuracy,'18');assert.equal(m.stats.range,p.radius===2?'200':'1,000');assert.equal(m.stats.shots,'8(5)');assert.equal(m.stats.recoil,'1');
  assert.equal(f.profile().damage.formula,null);assert.deepEqual(f.profile().damage.components,[]);assert.equal(f.profile().damage.rules.nextEleven.radius,p.radius);
  assert.equal(readWeaponBattery(f.weapon()).charge,8);assert.equal(readWeaponBattery(f.weapon()).cells,p.cells);assert.equal(f.attack().readinessReason,null);
  const stale=f.state(),r=await f.shoot();assert.equal(r.receipt.spent,0);assert.equal(r.receipt.power.spent,1);assert.equal(r.rollData.followon,'');assert.equal(r.message.rolls.length,1);
  assert.equal(messageResistanceEffect(r.message).condition,'reality-stabilizer');assert.deepEqual(r.snapshot.profile.context.areaPoint,area.areaPoint);
  const historical=JSON.stringify(r.snapshot);await f.service.saveState(stale);await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,7);assert.equal(JSON.stringify(r.snapshot),historical);
  await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));assert.equal(readWeaponBattery(f.weapon()).charge,7);
  const brief=ammunitionChatData(r.profile);assert.equal(brief.lines.length,3);assert.match(brief.lines.join(' '),/наименьшее|Наименьшее/);
 });
 test(p.name+': no point, wrong scene, two shots, empty, duplicate and stale replacement rejected',async()=>{
  const f=await gaussFixture(p.modeId,{profileContext:area}),bad=await gaussFixture(p.modeId);
  await assert.rejects(()=>bad.shoot(),/точку/);await assert.rejects(()=>f.shoot(2));
  const id=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId:id}),f.shoot(1,{attackId:id})]);assert.equal(readWeaponBattery(f.weapon()).charge,7);
  const before=batteryExpectation(f.weapon());await f.service.spendWeaponCharge(f.weapon().id,7);await assert.rejects(()=>f.shoot(),/энергии|заряд/);
  await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{requestId:crypto.randomUUID(),expectedBattery:before,nonRechargeable:false}),/измен|устар|Stale/);
  await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).charge,16);
  f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
 });
}
for(const p of Object.values(LADARS)){
 test(p.name+': individual range and common Vision resistance, no cost per pulse',async()=>{
  const f=await gaussFixture(p.modeId);
  if(p.size==='Smartskin'){
   assert.ok(f.attack().readinessReason);const d=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]});d.setOverride(p.modeId,'installation','nightwing-ut230');await f.definitions.save(d);
  }
  const range=ladarRange(p,p.size==='Smartskin'?{installation:'nightwing-ut230'}:{});
  assert.equal(f.profile().effective.range,range.half+'/'+range.maximum);assert.equal(f.attack().readinessReason,null);
  const before=f.state(),r=await f.shoot(),effect=messageResistanceEffect(r.message);
  assert.equal(effect.modifier,-10);assert.equal(effect.outcome,'crippling-blindness');assert.equal(r.rollData.followon,'');assert.equal(f.profile().damage.formula,null);
  assert.equal(r.receipt.power?.spent??0,0);assert.deepEqual(f.state().weapons,before.weapons);
  assert.equal(visionResistanceModifier(effect,{distance:'beyond',protectedVision:'yes',membrane:2}).modifier,0);
  if(p.cellSize){assert.equal(readWeaponBattery(f.weapon()).charge,480);await f.service.spendWeaponCharge(f.weapon().id,480);await assert.rejects(()=>f.shoot());await f.battery();assert.equal(readWeaponBattery(f.weapon()).charge,480);}
  else assert.equal(f.power(),null);
 });
 if(p.cellSize)test(p.name+': published TL9/10/11/12 multipliers',()=>{
  for(const[tl,mult]of [[9,1],[10,2],[11,5],[12,10]]){const r=ladarRange(p,{sensorTL:tl});assert.equal(r.half,p.miles*mult*176);assert.equal(r.maximum,p.miles*mult*528);}
  assert.equal(ladarRange(p,{sensorTL:13}),null);
 });
}
test('Reality Stabilizer uses its own HT and has no fictitious victim-HT modifier',()=>{
 const e={version:1,id:'displacer',name:'Displacer',attribute:'HT',modifier:0,condition:'reality-stabilizer',halfRange:null,outcome:'displacement',source:'UT131'};
 assert.equal(visionResistanceModifier(e,{ht:12}).modifier,0);assert.throws(()=>visionResistanceModifier(e,{ht:null}));
 assert.match(resistanceOutcome(e,{finaltarget:12,rtotal:13,margin:-1,failure:true,isCritSuccess:false,isCritFailure:false},{ht:12}).consequence,/вручную/);
});
for(const [robotId,modeId] of [['hunter','WInB0nYjRLMJm5Ha-'],['hunter','WuZRkhqwMzX3gyVWL'],['striker','WpvG7-bGWCtwNOPFf'],['striker','WNK4gk21iQ4le2Lxr']]){
 test(robotId+' / '+modeId+': separate stock, selected warhead, launch without shooter Roll, frozen Damage',async()=>{
  const f=await gaussFixture(modeId),types=f.candidates(),t=types.find(t=>t.robot?.id===robotId&&t.robot.tl===9&&t.recipe?.variantId==='ut_he');assert.ok(t);
  assert.ok(robotAmmunitionAllowed(modeId,t));assert.equal(robotAmmunitionAllowed(robotId==='hunter'?'WpvG7-bGWCtwNOPFf':'WInB0nYjRLMJm5Ha-',t),false);
  await f.load(t,1);const r=await f.shoot();assert.equal(r.spent,1);assert.equal(r.message.rolls,undefined);assert.equal(r.rollData.robotLaunch,true);assert.equal(r.profile.damage.rules.robot.id,robotId);
  assert.equal(r.profile.damage.rules.robot.warhead.recipe.variantId,'ut_he');assert.ok(r.profile.damage.formula.endsWith(' cr ex'));assert.equal(r.profile.damage.components.some(c=>c.role==='kinetic'||c.role==='backblast'),false);
  const frozen=JSON.stringify(r.snapshot);await f.service.loadState();assert.equal(JSON.stringify(r.snapshot),frozen);assert.equal(f.weapon().totalAmmo,0);
  const brief=ammunitionChatData(r.profile);assert.ok(brief.lines.length<=3);assert.ok(brief.lines.join(' ').length<420);assert.deepEqual(r.message.whisper,[]);
  assert.equal(campaignAmmunitionAdmission({...t,robot:{id:robotId,tl:10}},catalogs,9,modeId).allowed,false);
 });
}
test('robot payload matrix covers every ready warhead and excludes duplicated guidance and invented Floater binding',async()=>{
 for(const modeId of ['WInB0nYjRLMJm5Ha-','WpvG7-bGWCtwNOPFf']){
  const f=await gaussFixture(modeId),all=f.candidates(),robots=all.filter(t=>t.robot);
  for(const t of robots){assert.ok(!['ut_homing','ut_reactionless'].includes(t.recipe?.variantId));assert.equal(robotAmmunitionAllowed(modeId,{...t,robot:{id:'floater',tl:10}}),false);}
  const warheads=new Set(all.filter(t=>!t.unavailable&&!t.robot&&!['ut_homing','ut_reactionless'].includes(t.recipe?.variantId)&&!t.recipe?.parameters?.reactionless).map(t=>t.recipe?.variantId??'solid'));
  assert.deepEqual(new Set(robots.map(t=>t.recipe?.variantId??'solid')),warheads);
 }
 assert.deepEqual(ROBOTS.floater.launcherModeIds,[]);assert.deepEqual(ROBOTS.shuriken.launcherModeIds,[]);
 assert.equal(ROBOTS.hunter.radarYards,2000);assert.equal(ROBOTS.striker.radarYards,4000);assert.equal(ROBOTS.floater.rangeMiles,320);
});
test('Smart Shuriken: thrown physical unit, no imaginary collision Damage, manual return and C cell',async()=>{
 const f=await gaussFixture(ROBOTS.shuriken.modeId);assert.equal(f.attack().readinessReason,null);await f.load(f.candidates()[0],1);
 const r=await f.shoot();assert.equal(r.spent,1);assert.equal(r.message.rolls,undefined);assert.equal(r.profile.damage.formula,null);assert.equal(r.profile.damage.rules.robot.collision.damageMultiplier,0.5);assert.equal(r.profile.damage.rules.robot.collision.damageType,'cut');assert.equal(r.profile.damage.rules.robot.cellSize,'C');assert.equal(r.profile.damage.rules.robot.minutes,10);
 assert.equal(f.weapon().totalAmmo,0);await assert.rejects(()=>f.shoot());assert.equal(f.power(),null);assert.ok(ammunitionChatData(r.profile).lines.length<=3);
});
test('independent warhead Damage survives; baseline rocket and derived Monochain damage are never copied',async()=>{
 const expected={ut_hemp:'6dx8(10) cr inc',ut_shaped_charge:'6dx7(10) cr inc',ut_plasma:'6dx4 burn ex sur',ut_force:'8dx2 cr dkb ex',ut_sefop:'6dx7(3) cr inc',ut_monochain:null};
 for(const [variant,formula]of Object.entries(expected)){
  const f=await gaussFixture('WInB0nYjRLMJm5Ha-'),t=f.candidates().find(t=>t.robot?.id==='hunter'&&t.robot.tl===9&&t.recipe?.variantId===variant&&t.recipe.parameters.availabilityTL===({ut_hemp:10,ut_plasma:10,ut_force:10}[variant]??9));
  assert.ok(t,variant);await f.load(t,1);const r=await f.shoot();assert.equal(r.profile.damage.formula,formula);assert.equal(r.message.rolls,undefined);assert.equal(r.spent,1);assert.equal(r.profile.damage.rules.robot.kineticImpact.hp,6);
 }
});
test('every offered robot warhead resolves through the common resolver with its selected TL and payload',async()=>{
 for(const id of ['WInB0nYjRLMJm5Ha-','WpvG7-bGWCtwNOPFf']){
  const f=await gaussFixture(id),types=f.candidates().filter(t=>t.robot&&!t.unavailable);
  for(const type of types){
   const p=f.profile({ammunition:{kind:'physical-magazine',magazineId:'matrix',type,available:1,total:1,ammoKey:type.key}});
   assert.equal(p.damage.nativeSafe,true,type.name+': '+p.damage.reason);assert.equal(p.damage.rules.robot.selectedTL,type.robot.tl);
   assert.equal(p.damage.rules.robot.warhead.recipe?.variantId,type.recipe?.variantId);
   assert.equal(p.damage.components.some(c=>c.role==='backblast'),false);
   if(p.damage.rules.robot.warheadFuze)assert.equal(p.damage.rules.robot.warheadFuze.minimumYards,40);
  }
 }
});
test('AESA has host facts without copied Tactical Disruptor stats',()=>{
 const m=catalogs.getMode(AESA.modeId);for(const key of ['accuracy','range','shots','recoil'])assert.equal(m.stats[key],null);
 assert.equal(AESA.host.detectionMiles,10);assert.match(AESA.blockedReason,/полные/);
 assert.equal(createShotSnapshot({damage:{formula:null},resource:{}},{attackId:'legacy'}).attackId,'legacy');
});
test('editing a robot payload preserves its physical identity, batch key and ownership',async()=>{
 const f=await gaussFixture('WInB0nYjRLMJm5Ha-'),original=f.candidates().find(t=>t.robot?.id==='hunter'&&t.recipe?.variantId==='ut_he');
 const p=automatic.prepare({modeId:'WInB0nYjRLMJm5Ha-',base:original,variantId:'ut_he',parameters:{...original.recipe.parameters,note:'own robot lot',batchId:'distinct'}});
 assert.equal(p.state,'complete');assert.deepEqual(p.type.robot,original.robot);assert.notEqual(p.type.key,original.key);assert.ok(p.type.key.endsWith(':robot:hunter:tl:9'));
 assert.equal(automatic.prepare({modeId:'WInB0nYjRLMJm5Ha-',base:p.type,variantId:'ut_he',savedType:p.type}).state,'complete');
 assert.equal(automatic.prepare({modeId:'WInB0nYjRLMJm5Ha-',base:p.type,variantId:'ut_homing'}).state,'incomplete');
 await f.tx('add-stock',{ammoKey:original.key,amount:1});await f.tx('save-recipe',{type:p.type});assert.equal(f.state().weapons[0].ammunitionInventory.stocks.length,2);
});
test('old missing power is preserved until an explicit replacement; no settings or catalog migration refills it',async()=>{
 for(const id of ['WNboKomyNHyWF3Mcn','WUTMilitaryLadarSmall']){
  const f=await gaussFixture(id,{profileContext:area}),state=f.state(),key=f.power().stateKey;delete state.weapons[0][key];await f.actor.setFlag('world','gurpsAmmoManager',state);
  await f.service.loadState();assert.equal(f.weapon()[key],undefined);await assert.rejects(()=>f.shoot());await f.battery();assert.equal(readWeaponBattery(f.weapon()).charge,f.power().capacity);
 }
});
test('one shared sensor targeting bonus requires explicit conditions and a real Aim',()=>{
 assert.equal(sensorTargetingBonus({sensorTargetingConfirmed:true,aimSeconds:1}),3);
 for(const values of [{},{sensorTargetingConfirmed:false,aimSeconds:4},{sensorTargetingConfirmed:true,aimSeconds:0},{sensorTargetingConfirmed:true,aimSeconds:1.5}])assert.equal(sensorTargetingBonus(values),0);
});
test('selected sensor TL reaches the common skill resolver and campaign admission without changing old high-TL instances',async()=>{
 const f=await gaussFixture('WUTMilitaryLadarSmall'),draft=()=>new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]});
 await f.actor.setFlag('olegurps-qol','campaignTL',9);let d=draft();d.setOverride('WUTMilitaryLadarSmall','sensorTL','12');await assert.rejects(()=>f.definitions.save(d),/ТУ кампании/);
 await f.actor.setFlag('olegurps-qol','campaignTL',12);await f.definitions.save(d);assert.equal(f.profile().effective.range,'17600/52800');assert.equal(f.attack().standaloneRef.governingSkill.tl,12);
 await f.actor.setFlag('olegurps-qol','campaignTL',9);await f.definitions.save(draft());assert.equal(f.profile().effective.range,'17600/52800');
});
test('backend rejects a forged robot warhead before execution or resource writes',async()=>{
 const f=await gaussFixture('WInB0nYjRLMJm5Ha-'),type=f.candidates().find(t=>t.robot&&t.recipe?.variantId==='ut_he');await f.load(type,1);
 const before=f.state(),profile=structuredClone(f.profile());profile.damage.rules.robot.warhead.recipe.variantId='ut_mininuke';
 await assert.rejects(()=>f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile}),execute:()=>{throw Error('EXECUTED');}}),/Профиль робота изменился/);assert.deepEqual(f.state(),before);
});
