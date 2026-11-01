import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {generateId} from '../scripts/random-id.js';
import {migrateAmmoInventory, applyInventoryOperation, inventoryTotal, ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {reserveShotId, writeAmmoResources} from '../scripts/tools/shot-history-storage.js';
import {CatalogService} from '../scripts/catalog-service.js';
import {StandaloneWeaponDraft, StandaloneWeaponService, standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {SprayingFireSessionService} from '../scripts/tools/spraying-fire-session-service.js';

const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();

// Foundry 14.364's actual randomID algorithm, inspected in the running world.
// Its dependency on crypto.getRandomValues is essential to these regressions.
const foundrySource = `function randomID(length=16) {
 const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 const cutoff = 0x100000000 - (0x100000000 % chars.length);
 const random = new Uint32Array(length);
 do { crypto.getRandomValues(random); } while (random.some(x => x >= cutoff));
 let id = ''; for (let i=0;i<length;i++) id += chars[random[i] % chars.length];
 return id;
}`;
const oldId='550e8400-e29b-41d4-a716-446655440000';
function environment(kind) {
 const crypto=kind==='A'?webcrypto:kind==='B'?{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}:undefined;
 const context=vm.createContext({crypto,Uint32Array});
 return {crypto,foundry:{utils:{randomID:vm.runInContext('('+foundrySource+')',context)}}};
}
for(const kind of ['A','B','C']) {
 test(`real Foundry dependency ${kind}: unique compatible IDs without changing globals`,()=>{
  const runtime=environment(kind),before=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  const ids=Array.from({length:2048},()=>generateId(runtime));
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.every(id=>kind==='A'?/^[a-f0-9-]{36}$/.test(id):/^[A-Za-z0-9]{16}$/.test(id)));
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,'crypto'),before);
 });
 test(`mixed UUID/Foundry IDs ${kind}: magazines, recipes, reload and failed operation preserve links`,t=>{
  const runtime=environment(kind),descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),foundry=globalThis.foundry;
  Object.defineProperty(globalThis,'crypto',{value:runtime.crypto,configurable:true});globalThis.foundry=runtime.foundry;
  t.after(()=>{globalThis.foundry=foundry;descriptor?Object.defineProperty(globalThis,'crypto',descriptor):delete globalThis.crypto;});
  const weapon={id:oldId,capacity:10,magazines:[4],loadedIndex:0,totalAmmo:20};
  migrateAmmoInventory(weapon,()=>oldId);const original=structuredClone(weapon.ammunitionInventory.magazines[0]);
  const type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:'physical-round',recipe:{version:1,variantId:'owner',customId:generateId(runtime)}};type.key=ammoTypeKey(type);
  applyInventoryOperation(weapon,'save-recipe',{type});
  applyInventoryOperation(weapon,'add-magazines',{amount:1,capacity:10});
  assert.deepEqual(weapon.ammunitionInventory.magazines[0],original);
  assert.equal(weapon.ammunitionInventory.installedId,oldId);
  const nextId=weapon.ammunitionInventory.magazines[1].id;assert.notEqual(nextId,oldId);
  applyInventoryOperation(weapon,'install',{magazineId:nextId});
  const reloaded=JSON.parse(JSON.stringify(weapon));assert.equal(reloaded.ammunitionInventory.installedId,nextId);
  assert.equal(reloaded.ammunitionInventory.stocks.at(-1).key,type.key);assert.equal(inventoryTotal(reloaded.ammunitionInventory),20);
  const before=JSON.stringify(reloaded);assert.throws(()=>applyInventoryOperation(reloaded,'load',{magazineId:nextId,ammoKey:type.key,amount:99},{allowedTypes:[type]}));
  assert.equal(JSON.stringify(reloaded),before);
 });
 test(`mixed receipts ${kind}: Foundry update paths retain old history and new reservation identity`,async()=>{
  const id=generateId(environment(kind)),updates=[];
  const old={attackId:oldId,status:'completed',spent:1},state={version:10,weapons:[],shotReceipts:{[oldId]:old}};
  const actor={documentName:'Actor',getFlag:()=>structuredClone(state),update:async value=>updates.push(structuredClone(value))};
  assert.equal(await reserveShotId(actor,id,'weapon'),true);
  await writeAmmoResources(actor,{version:10,weapons:[]},{receipt:{attackId:id,status:'completed',spent:2}});
  assert.equal(updates[0]['flags.world.gurpsAmmoManager.shotReceipts.'+id].attackId,id);
  assert.equal(updates[1]['flags.world.gurpsAmmoManager.shotReceipts.'+id].spent,2);
  assert.deepEqual(state.shotReceipts[oldId],old);assert.ok(!Object.hasOwn(updates[1],'flags.world.gurpsAmmoManager.shotReceipts'));
 });
}
test('generation before Foundry utilities become available produces a compatible local identity',()=>{
 const previous=globalThis.foundry;try{delete globalThis.foundry;assert.match(generateId({crypto:undefined}),/^[A-Za-z0-9]{16}$/);}finally{globalThis.foundry=previous;}
});
test('a Foundry failure with working Web Crypto is propagated',()=>{
 const failure=Error('unrelated failure');assert.throws(()=>generateId({crypto:{getRandomValues(){}},foundry:{utils:{randomID(){throw failure;}}}}),e=>e===failure);
});
test('Foundry-first wrappers preserve their 16/20-character contracts in all environments',()=>{
 for(const kind of ['A','B','C'])for(const length of [16,20]){
  assert.match(generateId(environment(kind),{preferFoundry:true,length}),new RegExp('^[A-Za-z0-9]{'+length+'}$'));
 }
});
for(const kind of ['A','B','C'])test(`real service wrappers ${kind}: physical creation, editing, magazines and persisted spray IDs`,async t=>{
 const runtime=environment(kind),descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),previousFoundry=globalThis.foundry,previousGame=globalThis.game;
 Object.defineProperty(globalThis,'crypto',{value:runtime.crypto,configurable:true});globalThis.foundry=runtime.foundry;globalThis.game={user:{id:'owner',isGM:false},messages:{contents:[]}};
 t.after(()=>{globalThis.foundry=previousFoundry;globalThis.game=previousGame;descriptor?Object.defineProperty(globalThis,'crypto',descriptor):delete globalThis.crypto;});
 const flags={},actor={id:'actor-'+kind,isOwner:true,system:{ranged:{},melee:{},skills:{}},getFlag:(s,k)=>structuredClone(flags[s]?.[k]),setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);}};
 const service=new StandaloneWeaponService(actor,catalogs),draft=new StandaloneWeaponDraft({actor,catalogs,type:'ranged'}),modeId='WFc8O-LgWxenUseNy';
 draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);const record=await service.save(draft);
 assert.match(record.id,/^ow-[A-Za-z0-9]{16}$/);const carrier=standaloneAmmoCarrier(record),magazineId=carrier.ammunitionInventory.installedId;
 assert.equal(carrier.ammunitionInventory.magazines[0].id,magazineId);assert.equal(carrier.ammunitionInventory.magazines[0].weaponId,carrier.id);
 assert.match(magazineId,kind==='A'?/^[a-f0-9-]{36}$/:/^[A-Za-z0-9]{16}$/);
 const edit=new StandaloneWeaponDraft({actor,catalogs,type:'ranged',existing:record});assert.equal((await service.save(edit)).id,record.id);
 const weapon={id:oldId,name:'Saved gun',capacity:20,magazines:[10],loadedIndex:0,totalAmmo:10};
 await actor.setFlag('world','gurpsAmmoManager',{version:9,weapons:[weapon],shotReceipts:{[oldId]:{attackId:oldId,spent:1}}});
 const sessionRuntime={...runtime,game:globalThis.game,canvas:{scene:{id:'scene',regions:{contents:[]}}}},token={id:'token',document:{id:'token',getFlag:()=>null},scene:{id:'scene'}};
 const spraying=new SprayingFireSessionService({actor,weapon,token,attack:{name:'Saved gun',rof:'10'},runtime:sessionRuntime});
 const session=await spraying.createPlanned({targets:[{tokenId:'a'},{tokenId:'b'}],plannedAmmo:2});assert.match(session.sessionId,/^[A-Za-z0-9]{20}$/);
 const recreated=new SprayingFireSessionService({actor,weapon,token,attack:{name:'Saved gun',rof:'10'},runtime:sessionRuntime});assert.equal(recreated.findExisting().sessionId,session.sessionId);
 assert.equal(actor.getFlag('world','gurpsAmmoManager').weapons[0].totalAmmo,10);assert.equal(actor.getFlag('world','gurpsAmmoManager').shotReceipts[oldId].spent,1);
});
