// The permanent ledger is never pruned. Resource work does not need a copy of it.
export function copyAmmoResources(state,copy=structuredClone){
 if(!state)return state;
 const {shotReceipts,...resources}=state;return copy(resources);
}
const safeReceiptKey=id=>/^[A-Za-z0-9_:-]+$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export async function writeAmmoResources(actor,state,{receipt=null,copy=structuredClone}={}){
 const persisted=actor.getFlag('world','gurpsAmmoManager');
 // Non-Document integrations keep the original setFlag contract. Unsafe dotted
 // legacy IDs also keep the old representation instead of becoming update paths.
 if(actor.documentName!=='Actor'||typeof actor.update!=='function'||receipt&&!safeReceiptKey(receipt.attackId)){
  const value={...state};
  if(persisted?.shotReceipts||state.shotReceipts||receipt)value.shotReceipts={...persisted?.shotReceipts,...state.shotReceipts,...(receipt?{[receipt.attackId]:receipt}:{})};
  await actor.setFlag('world','gurpsAmmoManager',copy(value));return;
 }
 const root='flags.world.gurpsAmmoManager',updates={};
 for(const [key,value]of Object.entries(state))if(key!=='shotReceipts')updates[root+'.'+key]=value;
 if(receipt)updates[root+'.shotReceipts.'+receipt.attackId]=receipt;
 // One persisted update commits the resource state and this one receipt together.
 await actor.update(updates);
}

export async function reserveShotId(actor,attackId,weaponId){
 if(actor.documentName!=='Actor'||typeof actor.update!=='function'||!safeReceiptKey(attackId))return false;
 // A durable intent closes the crash-before-message gap. It never spends resources
 // and remains blocked after F5 even if the eventual message was removed.
 await actor.update({['flags.world.gurpsAmmoManager.shotReceipts.'+attackId]:{attackId,weaponId,status:'pending',spent:0}});
 return true;
}
export async function cancelShotId(actor,attackId){
 await actor.update({['flags.world.gurpsAmmoManager.shotReceipts.-='+attackId]:null});
}

export const SHOT_STORAGE_VERSION=2;
export async function persistShotSnapshot(message,snapshot,additionalFlags={}){
 if(message.flags?.['olegurps-qol']?.shotStorageVersion===SHOT_STORAGE_VERSION&&typeof message.update==='function'){
  await message.update({'flags.olegurps-qol.shotSnapshot':snapshot,
   'flags.olegurps-qol.-=pendingShotSnapshot':null,'flags.olegurps-qol.-=attackProfile':null,
   ...Object.fromEntries(Object.entries(additionalFlags).map(([key,value])=>['flags.olegurps-qol.'+key,value]))});
 }else{
  // Old messages are finalized normally, never compacted or migrated for size.
  await message.setFlag('olegurps-qol','shotSnapshot',snapshot);
  for(const [key,value]of Object.entries(additionalFlags))await message.setFlag('olegurps-qol',key,value);
 }
}

const pendingIndexes=new WeakMap(),activePendingIndexes=new WeakMap();
export function findPendingShot(actorId,attackId,runtime=globalThis){
 const messages=runtime.game?.messages;if(!messages)return null;
 // Plain collection adapters without document lifecycle hooks must scan freshly.
 if(!runtime.Hooks?.on||!runtime.Hooks?.off||typeof messages.get!=='function')return messages.contents?.find(m=>{
  const p=m.getFlag?.('olegurps-qol','pendingShotSnapshot')??m.flags?.['olegurps-qol']?.pendingShotSnapshot;
  return p?.actorId===actorId&&p.attackId===attackId;
 })??null;
 let index=pendingIndexes.get(messages);
 if(!index){
  const active=activePendingIndexes.get(runtime.Hooks);
  if(active&&active.messages!==messages){for(const [name,id]of active.index.hooks)runtime.Hooks.off(name,id);pendingIndexes.delete(active.messages);}
  const byActor=new Map(),entries=new Map();
  const remove=id=>{const old=entries.get(id);if(!old)return;const actors=byActor.get(old.actorId),ids=actors?.get(old.attackId);ids?.delete(id);if(!ids?.size)actors?.delete(old.attackId);if(!actors?.size)byActor.delete(old.actorId);entries.delete(id);};
  const update=message=>{remove(message.id);const p=message.flags?.['olegurps-qol']?.pendingShotSnapshot;if(!p?.actorId||!p.attackId)return;
   if(!byActor.has(p.actorId))byActor.set(p.actorId,new Map());const attacks=byActor.get(p.actorId);if(!attacks.has(p.attackId))attacks.set(p.attackId,new Set());attacks.get(p.attackId).add(message.id);entries.set(message.id,{actorId:p.actorId,attackId:p.attackId});};
  for(const message of typeof messages.values==='function'?messages.values():messages.contents??[])update(message);
  const hooks=[['createChatMessage',runtime.Hooks.on('createChatMessage',update)],['updateChatMessage',runtime.Hooks.on('updateChatMessage',update)],['deleteChatMessage',runtime.Hooks.on('deleteChatMessage',m=>remove(m.id))]];
  index={byActor,entries,hooks};pendingIndexes.set(messages,index);activePendingIndexes.set(runtime.Hooks,{messages,index});
 }
 const ids=index.byActor.get(actorId)?.get(attackId);
 for(const id of ids??[]){const m=messages.get(id),p=m?.flags?.['olegurps-qol']?.pendingShotSnapshot;
  if(p?.actorId===actorId&&p.attackId===attackId)return m;
 }
 return null;
}
