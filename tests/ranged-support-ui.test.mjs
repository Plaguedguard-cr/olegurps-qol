import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogs } from './helpers/gauss-context.mjs';
import { FirePreparationApp } from '../scripts/tools/fire-preparation-app.js';
import { rangedSupportTypes } from '../scripts/tools/ranged-support.js';
function app(modeId='WhQTP2P4KY4yewyBD'){
 const value=Object.assign(Object.create(FirePreparationApp.prototype),{mode:'weapon',fireState:{supportChoice:'none',braced:false}});
 value.identity={actorId:'actor',instanceId:'instance',equipmentId:catalogs.getEquipmentForMode(modeId).equipment_id,modeId};
 value._supportDefinition=()=>({weaponIdentity:value.identity,support:{availableTypes:rangedSupportTypes(catalogs.getMode(value.identity.modeId))}});
 return value;
}
test('one accessible support select offers none and only applicable source modes',()=>{
 for(const [modeId,values]of [['WhQTP2P4KY4yewyBD',['none','bipod']],['WR0KjQaYwU2kPV2uB',['none','mounted']],['W1doZcasYO-1Xw3Lf',['none','pistol-two-handed']],['W27s4Lm8QlkKVKUPn',['none']]]){
  const a=app(modeId),html=a._buildSupportChoice();assert.deepEqual([...html.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]),values);
  assert.match(html,/aria-label="Поддержка"/);assert.equal((html.match(/<select/g)??[]).length,1);assert.match(html,/value="none" selected/);
 }
});
test('switching physical instance or actor resets support before constructing the next selection',()=>{
 for(const key of ['instanceId','actorId']){const a=app();a._supportSelection();a.fireState.supportChoice='bipod';assert.equal(a._supportSelection().value,'bipod');a.identity={...a.identity,[key]:'other'};assert.equal(a._supportSelection(),null);assert.equal(a.fireState.supportChoice,'none');}
});
test('changing mode resets bipod to none without changing ordinary braced checkbox',()=>{
 const a=app();a._supportSelection();a.fireState.supportChoice='bipod';a.fireState.braced=true;a._supportSelection();a.identity={...a.identity,modeId:'W27s4Lm8QlkKVKUPn'};
 assert.equal(a._supportSelection(),null);assert.equal(a.fireState.braced,true);assert.doesNotMatch(a._buildSupportChoice(),/value="bipod"/);
});
test('same exact identity retains its temporary choice and no Actor or User writes exist',()=>{
 const a=app(),writes=[];a.actor={id:'actor',setFlag:()=>writes.push('flag'),update:()=>writes.push('system')};a._supportSelection();a.fireState.supportChoice='bipod';
 const selected=a._supportSelection();assert.equal(selected.source,'ShootingAssistant.support');assert.equal(selected.instanceId,'instance');assert.equal(a._supportSelection().value,'bipod');assert.deepEqual(writes,[]);
});
test('unbound generic Fire Control has no support select',()=>{const a=app();a.mode='standalone';assert.equal(a._buildSupportChoice(),'');});
