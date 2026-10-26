import test from 'node:test';
import assert from 'node:assert/strict';
import {p7Fixture} from './helpers/lt-p7-context.mjs';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {validateLTWeaponAmmunition} from '../scripts/tools/ammunition-resource-contract.js';
test('LT87 Rocket stays deferred after source Acc0 repair: blocked before prepare/native roll, stocks and historical snapshots preserved',async()=>{
 const f=await p7Fixture('WAd5_TDslv9AXFyLs'),t={source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_rocket_complete',name:'Rocket'};t.key=ammoTypeKey(t);
 await f.tx('add-stock',{ammoKey:t.key,amount:2},t);await f.tx('load',{magazineId:f.current().ammunitionInventory.installedId,ammoKey:t.key,amount:1},t);
 const before=JSON.stringify(f.actor.flags);let called=0;
 await assert.rejects(f.service.executeShot({weaponId:f.weapon.id,attackId:'deferred',prepare:()=>{called++;return {profile:f.profile(),amount:1};},execute:async()=>{called++;return {rolled:true};}}),/LT87|отложен/);
 assert.equal(called,0);assert.equal(JSON.stringify(f.actor.flags),before);assert.ok(f.attack().readinessReason);assert.equal(f.profile().damage.nativeSafe,false);
 const forged=structuredClone(f.profile());forged.damage.nativeSafe=true;assert.throws(()=>validateWeaponExecution(f.current(),forged),/LT87|отложен/);
 const oldCarrier={...f.current(),standaloneModeId:undefined,catalogModeId:'WAd5_TDslv9AXFyLs'};assert.throws(()=>validateLTWeaponAmmunition(f.actor,oldCarrier),/LT87|отложен/);
 await f.tx('unload',{magazineId:f.current().ammunitionInventory.installedId,amount:1},t);assert.equal(f.current().totalAmmo,2);
});
