import test from 'node:test';
import assert from 'node:assert/strict';
import {historyFixture} from './helpers/shot-history-context.mjs';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {copyAmmoResources,persistShotSnapshot,findPendingShot} from '../scripts/tools/shot-history-storage.js';
import {renderShotAmmunitionConditions} from '../scripts/tools/damage-shot-link.js';
import {messageResistanceEffect} from '../scripts/tools/resistance-roll.js';
const freshService=f=>new AmmoService({...f.actor}); // a new Document object models the F5 cache boundary
for(const role of ['gm','owner'])test(role+': 10000 permanent receipts survive resource save, deleted weapon/message and F5 retry',async()=>{
 const f=await historyFixture();game.user.isGM=role==='gm';const history=Object.fromEntries(Array.from({length:10000},(_,i)=>['old-'+i,{attackId:'old-'+i,spent:1,messageId:'removed'}]));
 f.flags.world.gurpsAmmoManager.shotReceipts=history;const saved=JSON.stringify(history),updates=[],original=f.actor.update;
 f.actor.update=async patch=>{updates.push(patch);return original(patch);};
 await f.service.saveState({...copyAmmoResources(f.state()),shotReceipts:{'old-0':{spent:999}}},{inventoryWrite:true});
 assert.equal(JSON.stringify(f.state().shotReceipts),saved);assert.ok(updates.every(p=>Object.keys(p).every(k=>!k.includes('shotReceipts'))));
 f.flags.world.gurpsAmmoManager.weapons=[];f.messages.clear();let calls=0;const result=await freshService(f).executeShot({weaponId:'removed',attackId:'old-0',prepare(){calls++;},execute(){calls++;}});
 assert.equal(result.duplicate,true);assert.equal(result.receipt.spent,1);assert.equal(calls,0);assert.equal(Object.keys(f.state().shotReceipts).length,10000);
 game.user.isGM=false;
});
test('new shot atomically commits one receipt with resources; new message has one unchanged full profile',async()=>{
 const f=await historyFixture(),updates=[],original=f.actor.update;f.actor.update=async p=>{updates.push(structuredClone(p));return original(p);};const before=f.weapon().totalAmmo;
 const shot=await f.shoot('atomic');const flags=shot.message.flags['olegurps-qol'];
 assert.equal(f.weapon().totalAmmo,before-1);assert.equal(f.state().shotReceipts.atomic.status,'committed');
 assert.equal(updates.length,2);assert.equal(updates[0]['flags.world.gurpsAmmoManager.shotReceipts.atomic'].status,'pending');
 assert.ok(updates[1]['flags.world.gurpsAmmoManager.weapons']);assert.equal(updates[1]['flags.world.gurpsAmmoManager.shotReceipts.atomic'].spent,1);
 assert.equal(flags.pendingShotSnapshot,undefined);assert.equal(flags.attackProfile,undefined);assert.equal(flags.shotStorageVersion,2);assert.deepEqual(flags.shotSnapshot,shot.snapshot);assert.deepEqual(flags.shotSnapshot.profile,shot.profile);
});
test('a stale resource form preserves unknown persisted fields and newer receipts',async()=>{
 const f=await historyFixture(),stale=copyAmmoResources(f.state());f.flags.world.gurpsAmmoManager.ownerExtension={value:'keep'};f.flags.world.gurpsAmmoManager.shotReceipts={newer:{spent:7}};
 await f.service.saveState(stale,{inventoryWrite:true});assert.deepEqual(f.state().ownerExtension,{value:'keep'});assert.equal(f.state().shotReceipts.newer.spent,7);
});
test('parallel requests and separate service objects consume/roll one time per attackId',async()=>{
 const f=await historyFixture();let calls=0;const execute=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {rolled:true};};const before=f.weapon().totalAmmo;
 const first=f.shoot('parallel',{execute}),second=f.shoot('parallel',{execute});await Promise.all([first,second]);
 const duplicate=await new AmmoService(f.actor).executeShot({weaponId:f.weapon().id,attackId:'parallel',prepare(){throw Error('prepared duplicate');},execute});
 assert.equal(duplicate.duplicate,true);assert.equal(calls,1);assert.equal(f.weapon().totalAmmo,before-1);
 await Promise.all([f.shoot('different-1'),f.shoot('different-2')]);assert.equal(f.weapon().totalAmmo,before-3);assert.equal(Object.keys(f.state().shotReceipts).length,3);
});
test('durable intent blocks F5 after interruption even when no message exists',async()=>{
 const f=await historyFixture(),before=f.weapon().totalAmmo;await assert.rejects(()=>f.shoot('interrupted',{execute:async()=>{throw Error('transport interrupted');}}),/interrupted/);
 assert.equal(f.state().shotReceipts.interrupted.status,'pending');assert.equal(f.messages.size,0);assert.equal(f.weapon().totalAmmo,before);
 await assert.rejects(()=>freshService(f).executeShot({weaponId:f.weapon().id,attackId:'interrupted',prepare(){throw Error('reroll');}}),/IncompleteShotAccounting/);
});
test('interruption after native message but before accounting, deleted source and F5 do not reroll',async()=>{
 const f=await historyFixture(),original=f.actor.update,before=f.weapon().totalAmmo;let writes=0;f.actor.update=async p=>{if(++writes===2)throw Error('persist failed');return original(p);};
 await assert.rejects(()=>f.shoot('after-roll'),/persist failed/);assert.equal(f.messages.size,1);const m=[...f.messages.values()][0];assert.ok(m.flags['olegurps-qol'].pendingShotSnapshot);assert.equal(f.weapon().totalAmmo,before);
 f.messages.delete(m.id);f.bus.callAll('deleteChatMessage',m);f.actor.update=original;
 await assert.rejects(()=>freshService(f).executeShot({weaponId:f.weapon().id,attackId:'after-roll',prepare(){throw Error('reroll');}}),/IncompleteShotAccounting/);
});
test('failure of final ChatMessage update keeps committed receipt and prevents a second spend after F5',async()=>{
 const f=await historyFixture(),create=f.runtime.ChatMessage.create;f.runtime.ChatMessage.create=async d=>{const m=await create(d);m.update=async()=>{throw Error('metadata update failed');};return m;};
 const old=console.error;console.error=()=>{};let shot;try{shot=await f.shoot('metadata-failure');}finally{console.error=old;}
 const before=f.weapon().totalAmmo;assert.equal(f.state().shotReceipts['metadata-failure'].status,'committed');assert.ok(shot.message.flags['olegurps-qol'].pendingShotSnapshot);
 assert.equal((await freshService(f).executeShot({weaponId:f.weapon().id,attackId:'metadata-failure'})).duplicate,true);assert.equal(f.weapon().totalAmmo,before);
});
test('explicit cancellation clears only the unused reservation and spends nothing',async()=>{
 const f=await historyFixture(),before=JSON.stringify(f.weapon());const result=await f.shoot('cancelled',{execute:async()=>({rolled:false})});
 assert.equal(result.spent,0);assert.equal(f.state().shotReceipts.cancelled,undefined);assert.equal(JSON.stringify(f.weapon()),before);assert.equal(f.messages.size,0);
 assert.equal((await f.shoot('cancelled')).spent,1);
});
test('pending index handles legacy data, updates, duplicate documents, deletion and a replaced collection',async()=>{
 const f=await historyFixture(),pending={attackId:'legacy',actorId:f.actor.id};
 const a=f.message({id:'A',flags:{'olegurps-qol':{pendingShotSnapshot:pending}}}),b=f.message({id:'B',flags:{'olegurps-qol':{pendingShotSnapshot:pending}}});
 assert.equal(findPendingShot(f.actor.id,'legacy'),a);assert.equal(findPendingShot('another-actor','legacy'),null);
 await a.update({'flags.olegurps-qol.-=pendingShotSnapshot':null});assert.equal(findPendingShot(f.actor.id,'legacy'),b);
 f.messages.delete(b.id);f.bus.callAll('deleteChatMessage',b);assert.equal(findPendingShot(f.actor.id,'legacy'),null);
 const hookCount=f.bus.size;game.messages=new Map([['A',{...a,flags:{'olegurps-qol':{pendingShotSnapshot:pending}}}]]);assert.ok(findPendingShot(f.actor.id,'legacy'));assert.equal(f.bus.size,hookCount);
});
test('old pending snapshots block before prepare and old messages are not compacted at finalization',async()=>{
 const f=await historyFixture(),source=f.message({id:'old',flags:{'olegurps-qol':{attackProfile:f.profile(),pendingShotSnapshot:{attackId:'old',actorId:f.actor.id,profile:f.profile()}}}});
 const saved=JSON.stringify(source.flags);await assert.rejects(()=>freshService(f).executeShot({weaponId:f.weapon().id,attackId:'old',prepare(){throw Error('reroll');}}),/IncompleteShotAccounting/);
 const s=await f.shoot('another');await persistShotSnapshot(source,s.snapshot);assert.ok(source.flags['olegurps-qol'].attackProfile);assert.ok(source.flags['olegurps-qol'].pendingShotSnapshot);
 assert.equal(JSON.stringify({...source.flags,'olegurps-qol':{...source.flags['olegurps-qol'],shotSnapshot:undefined}}),saved);
});
test('legacy dotted attack IDs keep their literal ledger key without path reinterpretation',async()=>{
 const f=await historyFixture();const s=await f.shoot('legacy.with.dots');assert.equal(f.state().shotReceipts['legacy.with.dots'].spent,1);
 assert.equal((await freshService(f).executeShot({weaponId:'removed',attackId:'legacy.with.dots'})).duplicate,true);assert.equal(s.spent,1);
});
test('queued burst, physical doses and battery spend remain independent of ledger size',async()=>{
 for(const options of [{},{modeId:'WpAt6DyOnZkKbNfJr',chemicalId:'paralysis',profileContext:{fluidDoses:3}},{modeId:'Wg_f0E5hqv6o1C0Uj'}]){
  const f=await historyFixture(options);f.flags.world.gurpsAmmoManager.shotReceipts={old:{spent:77}};const before=f.weapon().totalAmmo,power=f.weapon().paintBattery?.charge;
  const shot=await f.shoot('resource-'+(options.modeId??'burst'),{amount:options.modeId?1:3});assert.equal(shot.spent,options.modeId==='WpAt6DyOnZkKbNfJr'?3:options.modeId?1:3);assert.equal(f.weapon().totalAmmo,before-shot.spent);assert.equal(f.state().shotReceipts.old.spent,77);
  if(power)assert.equal(f.weapon().paintBattery.charge,power-1);
 }
});
test('UT chemistry reads the saved effect after filler change and compact message persistence',async()=>{
 const f=await historyFixture({modeId:'WRsVDXjeX3ABpRPVp',chemicalId:'nerve_poison'}),s=await f.shoot('chemical');
 assert.equal(messageResistanceEffect(s.message).modifier,-7);const saved=JSON.stringify(s.snapshot);f.flags.world.gurpsAmmoManager.weapons=[];
 assert.equal(messageResistanceEffect(s.message).chemical.id,'nerve_poison');assert.equal(JSON.stringify(s.snapshot),saved);
});
test('GM/blind/self message visibility is preserved by compact persistence',async()=>{
 for(const mode of ['gmroll','blindroll','selfroll']){const f=await historyFixture();const prior=game.settings.get;game.settings.get=()=>mode;
  try{const s=await f.shoot(mode);assert.deepEqual(s.message.whisper,['gm']);assert.equal(!!s.message.blind,mode==='blindroll');assert.equal(s.message.flags['olegurps-qol'].attackProfile,undefined);}finally{game.settings.get=prior;}}
});
test('OWNER cannot write or reserve someone else’s resources',async()=>{
 const f=await historyFixture();f.actor.isOwner=false;game.user.isGM=false;const before=JSON.stringify(f.state());await assert.rejects(()=>f.shoot('forbidden'),/Permission/);assert.equal(JSON.stringify(f.state()),before);
});
for(const chemical of [false,true])test('Foundry14 messageMode preserves GM/blind/self for '+(chemical?'chemical':'ordinary')+' attacks',async()=>{
 for(const mode of ['gm','blind','self']){const f=await historyFixture(chemical?{modeId:'WRsVDXjeX3ABpRPVp',chemicalId:'nerve_poison'}:{}),prior=game.settings.get;game.settings.get=(_scope,key)=>key==='messageMode'?mode:null;
  f.runtime.ChatMessage.applyMode=(data,actual)=>{assert.equal(actual,mode);data.whisper=mode==='self'?[game.user.id]:['gm'];data.blind=mode==='blind';};
  try{const s=await f.shoot('modern-'+mode);assert.deepEqual(s.message.whisper,mode==='self'?[game.user.id]:['gm']);assert.equal(s.message.blind,mode==='blind');}finally{game.settings.get=prior;}}
});
test('history render cache invalidates on updates and always rechecks visibility',async()=>{
 const f=await historyFixture({modeId:'WRsVDXjeX3ABpRPVp',chemicalId:'nerve_poison'}),s=await f.shoot('render'),m=s.message;
 const nodes=[];const node=()=>({style:{},dataset:{},classList:{add(){}},append(){},remove(){},set textContent(v){nodes.push(v);}}),runtime={...f.runtime,document:{createElement:node}},root={querySelector:()=>node(),querySelectorAll:()=>[]};
 renderShotAmmunitionConditions(m,root,runtime);assert.ok(nodes.some(v=>v.includes('HT−7')));nodes.length=0;
 m.flags['olegurps-qol'].shotSnapshot.profile.damage.rules.chemical.brief='Updated saved instruction';f.bus.callAll('updateChatMessage',m,{});
 renderShotAmmunitionConditions(m,root,runtime);assert.ok(nodes.includes('Updated saved instruction'));nodes.length=0;m.visible=false;
 assert.equal(renderShotAmmunitionConditions(m,root,runtime),null);assert.equal(nodes.length,0);
});
