import test from 'node:test';
import assert from 'node:assert/strict';
import {LT_BOW_IDS,LT_ARROW_IDS,ltBowUnits} from '../scripts/lt-bow-source.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {p7Fixture,catalogs} from './helpers/lt-p7-context.mjs';
for(const modeId of LT_BOW_IDS)for(const ammoId of Object.keys(LT_ARROW_IDS))test('LT78 cinematic Panjagan10 physical path '+modeId+'/'+ammoId,async()=>{
 const f=await p7Fixture(modeId,{bow:{ratedST:14,shotMode:'panjagan10',panjaganInstalled:true}}),t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:ammoId};t.key=ammoTypeKey(t);
 await f.tx('add-stock',{ammoKey:t.key,amount:20},t);await f.tx('load',{magazineId:f.current().ammunitionInventory.installedId,ammoKey:t.key,amount:10},t);
 const d=f.profile();assert.equal(d.damage.nativeSafe,true);assert.equal(d.damage.rules.ltBow.physicalUnits,10);assert.equal(d.effective.rof,'1x10');assert.equal(d.damage.rules.ltBow.cinematic,true);assert.equal(d.damage.rules.ltBow.manualSpreadHits,true);
 assert.equal(d.damage.rules.attackBonus,-4-(['fire_cage','flaming','flaming_humming'].includes(LT_ARROW_IDS[ammoId])?2:0));
 const result=await f.shoot('pan10');assert.equal(result.spent,10);assert.equal(f.current().totalAmmo,10);const original=JSON.stringify(result.snapshot);f.actor.system.attributes.ST.value=1;assert.equal(JSON.stringify(result.snapshot),original);
});
test('LT74 single small Slurbow uses the existing physical small dart, published per-dart Damage/Range, one Ready load unit and one physical debit',async()=>{
 const modeId='WFAwJH7XlIK-bIy0Q',ammoId='lt_slurbow_small_dart_lt76',f=await p7Fixture(modeId,{bow:{ratedST:14,shotMode:'single-small'}}),t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:ammoId};t.key=ammoTypeKey(t);
 await f.tx('add-stock',{ammoKey:t.key,amount:2},t);await f.tx('load',{magazineId:f.current().ammunitionInventory.installedId,ammoKey:t.key,amount:1},t);
 const p=f.profile();assert.equal(p.damage.formula,'1d+2 imp');assert.equal(p.effective.range,'210/280');assert.equal(p.effective.rof,'1');assert.equal(p.effective.shots,'1(2)');assert.equal(p.damage.rules.ltBow.manualSpreadHits,undefined);assert.equal(ltBowUnits(modeId,f.current().ltBow),1);assert.equal((await f.shoot()).spent,1);assert.equal(f.current().totalAmmo,1);
});
