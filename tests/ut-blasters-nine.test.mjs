import test from 'node:test';import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {PPB_PROFILES,ppbConfiguration,ppbControlsHTML,ppbOmniHTML,ppbDamage} from '../scripts/ut-plasma-particle-source.js';
import {readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {visionResistanceModifier,resistanceOutcome} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
const rows=[
 ['WouV3E3GYwAURw6k4',3,1,'C',1,40,'5','300/900','4','-2','Pistol'],
 ['WaZ3ufvxhRu996YpD',4,1,'C',2,33,'5','500/1,500','6','-3','Pistol'],
 ['WyzhwKRV_rMXfwvUY',2,1,'B',1,13,'3','130/500','3','-1','Pistol'],
 ['WvmDTF1vIN5M4INV1',5,1,'C',2,17,'10+1','500/1,500','5†','-3','Rifle'],
 ['WvNCHvcEUSlr69mGK',6,1,'C',2,10,'10+2','700/2,100','7†','-4','Rifle'],
 ['Wt-FXBwAXE0qZVmQH',8,1,'D',1,20,'10+4','1,200/3,600','10†','-6','Rifle'],
 ['WhNFLOfS262mdQxu8',5,10,'F',10,20,'15','30,000/90,000','160M','-10','Beams'],
 ['Wzdr_Vlm2jNEHk_F_',5,20,'F',10,20,'15','120,000/360,000','160M','-10','Beams'],
 ['W4Cgkpefx8fSmFgmB',6,2,'E',1,50,'15','2,800/8,400','18M','-8','Beams']
];
const install=async f=>{const s=f.state();s.weapons[0].omniBlasterRequest=true;await f.service.saveState(s);};
for(const[id,dice,mult,cell,cells,n,acc,range,st,bulk,specialty]of rows){
 const p=PPB_PROFILES[id],formula=`${dice}d${mult>1?'x'+mult:''}(5) burn sur`;
 test(p.name+' TL'+p.tl+': source stats, exact full cell set, native burn (5) surge',async()=>{
  const f=await gaussFixture(id),m=catalogs.getMode(id);assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);assert.equal(m.stats.strength,st);assert.equal(m.stats.bulk,bulk);
  assert.equal(m.stats.shots,n+(['D','E','F'].includes(cell)?'(5)':'(3)'));assert.equal(m.governing_skill.skill.specialization,specialty);
  assert.equal(f.profile().damage.formula,formula);assert.equal(f.attack().readinessReason,null);assert.equal(f.weapon().ammunitionInventory,undefined);
  assert.deepEqual(readWeaponBattery(f.weapon()),{type:cell,cells,capacity:n,charge:n,nonRechargeable:false});
  assert.equal(catalogs.getMode(p.legacyStunId).hidden,true);assert.equal(catalogs.getMode(p.legacyStunId).stats.shots,m.stats.shots);assert.deepEqual([...f.draft.modeIds],[id]);
  assert.deepEqual(ppbConfiguration(f.weapon()),{omniBlaster:false,mode:'normal',environment:'air',hotshot:false});
 });
 test(p.name+' TL'+p.tl+': normal burst, NR complete set, last charge, no repeated consumption',async()=>{
  const f=await gaussFixture(id),amount=Number(catalogs.getMode(id).stats.rate_of_fire);const r=await f.shoot(amount);
  assert.equal(r.receipt.power.spent,amount);assert.equal(r.snapshot.profile.damage.formula,formula);
  await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).capacity,n*2);await f.service.spendWeaponCharge(f.weapon().id,n*2-1);
  const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
 });
 test(p.name+' TL'+p.tl+': explicit Omni install, Stun source dice including multipliers, DR/3 and duration',async()=>{
  const f=await gaussFixture(id);await assert.rejects(()=>f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'stun'}));
  assert.doesNotMatch(ppbControlsHTML(f.weapon(),String),/name="blasterMode"/);await install(f);
  assert.match(ppbControlsHTML(f.weapon(),String),/name="blasterMode"/);await f.service.setBlasterConfiguration(f.weapon().id,{blasterMode:'stun'});
  const profile=f.profile(),effect=profile.damage.rules.resistanceEffect;assert.equal(profile.damage.formula,null);assert.deepEqual(profile.damage.components,[]);
  assert.equal(effect.modifier,-Math.min(10,dice*mult));assert.equal(profile.damage.rules.plasmaParticle.costMultiplier,2);
  for(const dr of [0,1,2,3,8,9])assert.equal(visionResistanceModifier(effect,{dr}).modifier,effect.modifier+Math.floor(dr/3));
  const result=resistanceOutcome(effect,{finaltarget:8,rtotal:12,margin:-4,failure:true,isCritSuccess:false,isCritFailure:false});assert.match(result.consequence,/Unconsciousness: 4 мин/);
  const r=await f.shoot();assert.equal(r.rollData.followon,'');assert.equal(r.receipt.power.spent,1);
 });
 test(p.name+' TL'+p.tl+': Hotshot applies only +1 per source die and costs two nominal shots',async()=>{
  const f=await gaussFixture(id);await f.service.setBlasterConfiguration(f.weapon().id,{blasterHotshot:true});const r=await f.shoot();
  assert.equal(r.profile.damage.formula,`${dice}d+${dice}${mult>1?'*'+mult:''}(5) burn sur`);assert.equal(r.receipt.power.spent,2);assert.equal(readWeaponBattery(f.weapon()).charge,n-2);
  assert.equal(r.profile.damage.rules.plasmaParticle.sourceDice,dice*mult);assert.match(r.message.content,/Malf14/);
  await f.service.spendWeaponCharge(f.weapon().id,n-3);await assert.rejects(()=>f.shoot());await f.service.setBlasterConfiguration(f.weapon().id,{blasterHotshot:false});await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);
 });
 test(p.name+' TL'+p.tl+': vacuum changes Acc only, preserves scope, divides both ranges once',async()=>{
  const f=await gaussFixture(id);await f.service.setBlasterConfiguration(f.weapon().id,{blasterEnvironment:'vacuum'});const pr=f.profile(),limits=range.replaceAll(',','').split('/').map(Number);
  assert.equal(pr.effective.range,limits[0]/5+'/'+limits[1]/5);assert.equal(pr.damage.effectiveChanges.acc,Math.ceil(Number(acc.split('+')[0])/2));
  assert.equal(pr.damage.effectiveChanges.scopeBonus,Number(acc.split('+')[1]??0));assert.equal(pr.damage.formula,formula);
  const rendered=withRuntimeAmmoStats(f.attack(),f.actor,f.state());assert.equal(rendered.data.range,pr.effective.range);
  const before=f.state();f.profile();assert.deepEqual(f.state(),before);assert.equal(f.profile().effective.range,pr.effective.range);
 });
 test(p.name+' TL'+p.tl+': cancellation, stale save, replacement, OWNER, resources and compact history',async()=>{
  const f=await gaussFixture(id),old=f.state();await install(f);await f.service.setBlasterConfiguration(f.weapon().id,{blasterHotshot:true});await f.shoot();
  await f.service.saveState(old);assert.equal(f.weapon().omniBlaster,true);assert.equal(f.weapon().blasterHotshot,true);assert.equal(readWeaponBattery(f.weapon()).charge,n-2);
  const state=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),state);
  const lines=ammunitionChatData(f.profile()).lines;assert.ok(lines.length<=3);assert.ok(lines.join(' ').length<500);
  await assert.rejects(()=>f.tx('add-magazines',{capacity:1,amount:1}));f.actor.isOwner=false;await assert.rejects(()=>f.service.setBlasterConfiguration(f.weapon().id,{blasterHotshot:false}));
 });
}
test('Omni checkbox belongs only to Blaster; source-independent Gatling profiles never admitted here',()=>{
 assert.match(ppbOmniHTML(rows[0][0],false),/name="omniBlaster"/);assert.doesNotMatch(ppbOmniHTML(rows[0][0],false),/checked/);
 assert.equal(ppbOmniHTML('WaryGiX2EbvCktDl7',true),'');assert.equal(ppbControlsHTML({standaloneModeId:'WWD518NZwbUXKQkjv',blasterHotshot:true},String),'');
});
