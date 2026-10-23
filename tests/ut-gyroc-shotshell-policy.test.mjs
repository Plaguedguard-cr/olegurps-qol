import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture,automatic} from './helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES} from '../scripts/ut-physical-ranged-source.js';
for(const p of Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='gyroc'))test(p.modeId+': Micromissile Shotshell excluded at direct admission and runtime, normal Shotshell/Homing retained',async()=>{
 const f=await gaussFixture(p.modeId,{profileContext:{physicalDistance:11}});
 assert.ok(f.candidates().some(t=>!t.unavailable&&t.ammoId==='15mm_gyroc'&&t.recipe?.variantId==='ut_shotshell'));
 assert.ok(f.candidates().some(t=>!t.unavailable&&t.ammoId==='15mm_micromissile'&&t.recipe?.variantId==='ut_homing'));
 const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_micromissile'};
 assert.notEqual(automatic.prepare({modeId:p.modeId,base,variantId:'ut_shotshell'}).state,'complete');
 const bad={...base,key:'forged',recipe:{version:1,variantId:'ut_shotshell'}};
 await assert.rejects(()=>f.tx('add-stock',{type:bad,ammoKey:'forged',amount:1}));
 const t=f.candidates().find(t=>!t.unavailable&&t.ammoId===base.ammoId&&t.recipe?.variantId==='ut_homing');await f.load(t,1);
 const state=f.state(),w=state.weapons.find(w=>w.id===f.weapon().id),stock=w.ammunitionInventory.stocks.find(s=>s.key===t.key);stock.type.recipe.parameters.warheadVariant='ut_shotshell';await f.actor.setFlag('world','gurpsAmmoManager',state);
 await assert.rejects(()=>f.shoot());assert.equal(f.weapon().totalAmmo,1);await f.tx('unload',{magazineId:w.ammunitionInventory.installedId,amount:1});assert.equal(f.weapon().totalAmmo,1);
});
