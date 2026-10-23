// Isolated Node mechanics and JSON transport model; never a Foundry/network benchmark.
import {performance} from 'node:perf_hooks';
import {historyFixture} from '../tests/helpers/shot-history-context.mjs';
import {renderShotAmmunitionConditions} from '../scripts/tools/damage-shot-link.js';
const bytes=v=>Buffer.byteLength(JSON.stringify(v));
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*p)-1];
const measure=async(fn,count=21)=>{for(let i=0;i<3;i++)await fn();const times=[];for(let i=0;i<count;i++){const start=performance.now();await fn();times.push(performance.now()-start);}return {p50:percentile(times,.5),p95:percentile(times,.95),samples:count};};
const node=()=>({dataset:{},style:{},classList:{add(){}},append(){},remove(){}});
const output=[];
for(const scenario of ['ordinary','chemical'])for(const n of [100,1000,10000]){
 const f=await historyFixture(scenario==='chemical'?{modeId:'WRsVDXjeX3ABpRPVp',chemicalId:'nerve_poison'}:{}),sample=await f.shoot('sample-00000000000000000000000000000');
 const ledger={};const flags=structuredClone(sample.message.flags),baseSnapshot=flags['olegurps-qol'].shotSnapshot;
 const {status:receiptStatus,...legacyReceipt}=sample.receipt;
 f.messages.clear();
 for(let i=0;i<n;i++){
  const attackId='history-'+String(i).padStart(28,'0'),id='message-'+String(i).padStart(28,'0');
  ledger[attackId]={...legacyReceipt,attackId,messageId:id};
  const stored={...flags,'olegurps-qol':{...flags['olegurps-qol'],shotSnapshot:{...baseSnapshot,attackId,correlation:{...baseSnapshot.correlation,attackMessageId:id}},
   ...(flags['olegurps-qol'].pendingShotSnapshot?{pendingShotSnapshot:{...flags['olegurps-qol'].pendingShotSnapshot,attackId}}:{})}};
  // Identical immutable profile values share fixture memory, not persisted bytes.
  const m={id,flags:stored,visible:true,isContentVisible:true,speaker:{actor:f.actor.id},getFlag(s,k){f.metrics.flagReads++;return this.flags?.[s]?.[k];}};
  f.messages.set(id,m);
 }
 f.flags.world.gurpsAmmoManager.shotReceipts=ledger;
 const storedFlagsBytes=bytes(f.flags.world.gurpsAmmoManager),oneChatBytes=bytes(flags),chatFlagsBytes=[...f.messages.values()].reduce((sum,m)=>sum+bytes(m.flags),0);
 const reset=()=>{const w=f.weapon(),m=w.ammunitionInventory.magazines.find(m=>m.id===w.ammunitionInventory.installedId);m.rounds=8;w.magazines=[8];w.totalAmmo=8;};
 let serial=0;const shoot=()=>{reset();return f.shoot('benchmark-'+String(serial++).padStart(26,'0'));};
 const newShot=await measure(shoot);
 const resourceState=f.state();const saveResources=await measure(()=>f.service.saveState(resourceState,{inventoryWrite:true}));
 const coldStart=performance.now();const duplicate=await f.service.executeShot({weaponId:f.weapon().id,attackId:'history-'+String(n-1).padStart(28,'0'),prepare(){throw Error('Duplicate prepared');},execute(){throw Error('Duplicate rolled');}});
 if(!duplicate.duplicate)throw Error('Duplicate guard failed');const duplicateMs=performance.now()-coldStart;
 const runtime={...f.runtime,document:{createElement:node}},root={querySelector:()=>node(),querySelectorAll:()=>[]};
 const historical=[...f.messages.values()].slice(0,n);
 const historyRender=await measure(()=>{for(const m of historical)renderShotAmmunitionConditions(m,root,runtime);},7);
 const original=globalThis.structuredClone;f.metrics.track=true;f.metrics.wireBytes=0;f.metrics.contentsReads=0;f.metrics.flagReads=0;
 const track=v=>{f.metrics.copiedBytes+=bytes(v);return original(v);};
 globalThis.structuredClone=track;foundry.utils.deepClone=track;
 try{await shoot();}finally{globalThis.structuredClone=original;foundry.utils.deepClone=original;f.metrics.track=false;}
 const pendingSearch={contentsReads:f.metrics.contentsReads,flagReads:f.metrics.flagReads};
 const copiedBytesPerShot=f.metrics.copiedBytes,wireBytesPerShot=f.metrics.wireBytes;
 f.metrics.copiedBytes=0;f.metrics.wireBytes=0;f.metrics.track=true;globalThis.structuredClone=track;foundry.utils.deepClone=track;
 try{await f.service.saveState(resourceState,{inventoryWrite:true});}finally{globalThis.structuredClone=original;foundry.utils.deepClone=original;f.metrics.track=false;}
 const copiedBytesPerResourceSave=f.metrics.copiedBytes,wireBytesPerResourceSave=f.metrics.wireBytes;
 // Existing legacy messages are not rewritten: compare the same old pending
 // representation on both implementations, including a cold index after F5.
 const legacyMessages=new class extends Map{get contents(){return [...this.values()];}};
 for(let i=0;i<n;i++){const id='legacy-message-'+i,attackId='legacy-attack-'+i;legacyMessages.set(id,{id,flags:{'olegurps-qol':{attackProfile:f.profile(),shotSnapshot:baseSnapshot,pendingShotSnapshot:{...baseSnapshot,attackId,actorId:f.actor.id}}},getFlag(s,k){return this.flags[s]?.[k];}});}
 game.messages=legacyMessages;
 const lookup=()=>f.service.executeShot({weaponId:f.weapon().id,attackId:'lookup-'+serial++,prepare:()=>null,execute:()=>{throw Error('Lookup rolled');}});
 const legacyStart=performance.now();await lookup();const legacyLookupColdMs=performance.now()-legacyStart,legacyLookup=await measure(lookup);
 const row={scenario,history:n,actorFlagsBytes:storedFlagsBytes,oneChatFlagsBytes:oneChatBytes,allChatFlagsBytes:chatFlagsBytes,newShot,resourceSave:saveResources,historyRender,duplicateMs,copiedBytesPerShot,wireBytesPerShot,copiedBytesPerResourceSave,wireBytesPerResourceSave,pendingSearch,legacyLookupColdMs,legacyLookup};
 output.push(row);process.stderr.write(JSON.stringify({scenario,history:n,complete:true})+'\n');
}
console.log(JSON.stringify({kind:'Node isolated mechanics + JSON transport model',node:process.version,rows:output},null,2));
