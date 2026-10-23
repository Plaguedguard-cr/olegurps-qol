import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture as fixture,catalogs} from './helpers/gauss-context.mjs';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {parseRateOfFire} from '../scripts/tools/fire-service.js';
const rows=[['WIijXG9uGZ52T0eW2','3d+2 pi++',6,5,30,0.27,7],['W5BEH4zTOtg2ds7is','4d pi++',1,3,1,0.22,4.4],['WATP5TU7jVQnEpqB0','1d pi++',1,5,3,0.4,10],['W_eUqH082RrEoTPPP','1d pi++',4,4,16,0.4,10],['WYpXdcsWIyhNVC6x3','6dx2 pi++',6,5,30,2,40]];
const normal=f=>f.candidates().find(t=>!t.unavailable&&!t.recipe);
const fill=async(f,type=normal(f))=>{const mags=f.weapon().ammunitionInventory.magazines;await f.tx('add-stock',{ammoKey:type.key,amount:mags.reduce((n,m)=>n+m.capacity,0)});for(const m of mags)await f.tx('load',{magazineId:m.id,ammoKey:type.key,amount:m.capacity});};
for(const[id,damage,count,capacity,rof,weight,cost]of rows){
 test(id+': source profile, independent empty barrels and exact physical ammunition',async()=>{
  const f=await fixture(id),m=catalogs.getMode(id),type=normal(f);assert.equal(m.raw_calc.damage,damage);assert.equal(f.attack().rof,String(rof));assert.equal(f.weapon().totalAmmo,0);assert.equal(f.power(),null);assert.equal(f.weapon().ammunitionInventory.magazines.length,count);assert.ok(f.weapon().ammunitionInventory.magazines.every(m=>m.capacity===capacity));assert.equal(type.physical.weightPerShotLb,weight);assert.equal(type.physical.costPerShot,cost);await assert.rejects(()=>f.shoot());
  assert.equal(parseRateOfFire(f.attack().rof).projectileMultiplier,1);if(id!=='WIijXG9uGZ52T0eW2')assert.ok(f.candidates().filter(t=>t.recipe?.variantId==='ut_he').every(t=>t.unavailable));
 });
 test(id+': physical salvo, capacity bound, immutable snapshot, no free ammunition after Save/reload',async()=>{
  const f=await fixture(id);await fill(f);const before=f.state();await f.shoot(rof,{cancel:true});assert.deepEqual(f.state(),before);await assert.rejects(()=>f.shoot(rof+1));
  const shot=await f.shoot(rof);assert.equal(shot.receipt.spent,rof);assert.equal(shot.profile.damage.formula,damage);assert.equal(shot.profile.damage.rules.projectiles,undefined);assert.equal(shot.profile.damage.rules.plb.barrels,count);
  if(id==='W_eUqH082RrEoTPPP')assert.equal(shot.profile.damage.rules.physicalRanged.sourceRoF,'4x4');if(id==='WYpXdcsWIyhNVC6x3')assert.equal(shot.profile.damage.rules.physicalRanged.sourceRoF,'6x5');
  const frozen=JSON.stringify(shot.snapshot),state=f.state();await f.service.loadState();assert.deepEqual(f.state(),state);assert.equal(JSON.stringify(shot.snapshot),frozen);assert.ok(ammunitionChatData(shot.profile).lines.length<=3);
 });
 test(id+': partial load, last projectile, service rejects foreign rounds and OWNER denial',async()=>{
  const f=await fixture(id);if(id==='WIijXG9uGZ52T0eW2')await f.tx('splat-salvo',{amount:1,expectedSalvo:30,readyConfirmed:true});await f.load(normal(f),1);const bad={...normal(f),ammoId:'15mm_gyroc'};await assert.rejects(()=>f.tx('add-stock',{type:bad,ammoKey:bad.key,amount:1}));await f.shoot();assert.equal(f.weapon().totalAmmo,0);await assert.rejects(()=>f.shoot());f.actor.isOwner=false;await assert.rejects(()=>f.tx('add-stock',{ammoKey:normal(f).key,amount:1}));
 });
}
test('Splat: changing salvo requires explicit Ready; cancel/no Ready/stale request cannot change state',async()=>{
 const f=await fixture('WIijXG9uGZ52T0eW2');await fill(f);const state=f.state();await assert.rejects(()=>f.tx('splat-salvo',{amount:3,expectedSalvo:30}));assert.deepEqual(f.state(),state);
 await f.tx('splat-salvo',{amount:3,expectedSalvo:30,readyConfirmed:true});assert.equal(f.attack().rof,'3');await assert.rejects(()=>f.shoot(2));await assert.rejects(()=>f.tx('splat-salvo',{amount:4,expectedSalvo:30,readyConfirmed:true}));
 const shot=await f.shoot(3);assert.equal(shot.receipt.feedPlan[0].spent,3);assert.equal(f.weapon().ammunitionInventory.magazines[0].rounds,2);assert.ok(f.weapon().ammunitionInventory.magazines.slice(1).every(m=>m.rounds===5));assert.equal(shot.snapshot.profile.damage.rules.plb.selectedSalvo,3);
});
test('Mortar Box: mixed independent barrel loads, selected ammo only, reduced salvo and no extra containers',async()=>{
 const f=await fixture('W_eUqH082RrEoTPPP'),base=normal(f),ap=f.candidates().find(t=>!t.unavailable&&t.recipe?.variantId==='ut_aphc'),ids=f.weapon().ammunitionInventory.magazines.map(m=>m.id);
 for(let n=0;n<4;n++){const t=n%2?ap:base;await f.tx('add-stock',{ammoKey:t.key,amount:4});await f.tx('load',{magazineId:ids[n],ammoKey:t.key,amount:4});}
 await f.tx('install',{magazineId:ids[1]});const attackId=crypto.randomUUID();await Promise.all([f.shoot(5,{attackId}),f.shoot(5,{attackId})]);assert.deepEqual(f.weapon().ammunitionInventory.magazines.map(m=>m.rounds),[4,0,4,3]);await assert.rejects(()=>f.tx('add-magazines',{capacity:4,amount:1}));await assert.rejects(()=>f.tx('delete-magazine',{magazineId:ids[2]}));
});
test('Both UGL: independent host parameters are mandatory, without changing another weapon',async()=>{
 for(const id of ['W5BEH4zTOtg2ds7is','WATP5TU7jVQnEpqB0']){const f=await fixture(id,{host:false});await f.load(normal(f),1);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
});
