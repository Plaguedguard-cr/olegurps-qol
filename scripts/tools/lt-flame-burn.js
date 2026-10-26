import {withActorResourceWrite} from './actor-resource-writes.js';
import {copyAmmoResources,writeAmmoResources,persistShotSnapshot,SHOT_STORAGE_VERSION} from './shot-history-storage.js';
import {createShotSnapshot} from './attack-profile-resolver.js';
import {applyMessageMode} from './chat-message-mode.js';

/** One immutable manual impact event per recorded attack. Damage never advances its duration. */
export function createLTFlameBurn(source,{water=false,runtime=globalThis}={}){
 const shot=source?.flags?.['olegurps-qol']?.shotSnapshot,actor=runtime.game?.actors?.get(shot?.actorId);
 if(!source?.visible||!source?.isContentVisible||!actor||(actor.isOwner!==true&&!runtime.game?.user?.isGM))throw Error('Нет доступа владельца к исходной атаке.');
 const ongoing=shot?.profile?.damage?.rules?.ltFlame?.ongoing;
 if(!ongoing||shot.correlation?.attackMessageId!==source.id)throw Error('Нет сохранённого профиля продолжающегося горения.');
 return withActorResourceWrite(actor,async()=>{
  const id='lt-burn-'+shot.attackId,previous=actor.getFlag('world','gurpsAmmoManager')?.shotReceipts?.[id];
  if(previous?.messageId&&runtime.game.messages.get(previous.messageId)){
   const message=runtime.game.messages.get(previous.messageId);
   if(!message.flags?.['olegurps-qol']?.shotSnapshot)await persistShotSnapshot(message,createShotSnapshot(previous.profile,{attackId:id,spent:0,resourceTiming:'manual-burn-event',resourceReceiptId:id,messageId:message.id,outcome:{manualImpact:true}}));
   return message;
  }
  if(previous?.status==='pending'&&!previous.profile)throw Error('Определение длительности уже начато; повторный бросок заблокирован.');
  let receipt=previous;
  if(!receipt){
   const state=copyAmmoResources(actor.getFlag('world','gurpsAmmoManager'));
   await writeAmmoResources(actor,state,{receipt:{attackId:id,status:'pending',weaponId:shot.profile.weaponId,spent:0}});
   const durationRoll=await runtime.Roll.create(ongoing.durationDice.replace(/d\b/g,'d6')).evaluate();
   const duration=Number(durationRoll.total);if(!Number.isSafeInteger(duration)||duration<1)throw Error('Не получена длительность горения.');
   const profile=structuredClone(shot.profile),facts=profile.damage.rules.ltFlame;
   const event={sourceAttackId:shot.attackId,sourceMessageId:source.id,userId:runtime.game.user.id,durationDice:ongoing.durationDice,durationSeconds:duration,water,waterRadius:water?2:null,impact:'owner-confirmed',formula:'1d burn'};
   facts.ongoingEvent=event;delete facts.ongoing;facts.brief=facts.fuelEffects?.waterDoesNotExtinguish?['Греческий огонь: вода не гасит. LT84.']:[];
   profile.damage={...profile.damage,formula:'1d burn',components:[{role:'kinetic',relation:'primary',status:'resolved',formula:'1d burn'}],rules:{ltEarly:facts,ltFlame:facts,ammunitionSource:'LT86'}};
   profile.effective={...profile.effective,damage:'1d burn'};profile.resource={kind:'manual-burn-event',ltFlameBurn:event};
   receipt={attackId:id,status:'duration-recorded',weaponId:profile.weaponId,spent:0,profile,event,durationRoll:durationRoll.toJSON()};
   await writeAmmoResources(actor,copyAmmoResources(actor.getFlag('world','gurpsAmmoManager')),{receipt});
  }
  const name=String(shot.mode.name)+(shot.mode.mode?' ('+shot.mode.mode+')':''),quoted=name.replaceAll('\\','\\\\').replaceAll('"','\\"');
  const link=runtime.GURPS.gurpslink('[@'+actor.id+'@D:"'+quoted+'"]');
  const data={user:runtime.game.user.id,speaker:runtime.ChatMessage.getSpeaker({actor}),content:`<p><strong>Продолжающееся горение</strong>: 1d burn/с, ${receipt.event.durationSeconds} с${receipt.event.water?'; на воде радиус 2 ярда':''}. LT86.</p><p>Попадание подтверждено владельцем. Время и применение урона учитываются вручную.</p><div class="roll-message gga-chat-message">${link}</div>`,
   rolls:[runtime.Roll.fromJSON(typeof receipt.durationRoll==='string'?receipt.durationRoll:JSON.stringify(receipt.durationRoll))],flags:{'olegurps-qol':{shotStorageVersion:SHOT_STORAGE_VERSION,
    pendingShotSnapshot:structuredClone(createShotSnapshot(receipt.profile,{attackId:id,spent:0,resourceTiming:'after-attack',resourceReceiptId:id}))}}};
  applyMessageMode(runtime.ChatMessage,data,runtime.game);
  const message=await runtime.ChatMessage.create(data),snapshot=createShotSnapshot(receipt.profile,{attackId:id,spent:0,resourceTiming:'manual-burn-event',resourceReceiptId:id,messageId:message.id,outcome:{manualImpact:true}});
  await writeAmmoResources(actor,copyAmmoResources(actor.getFlag('world','gurpsAmmoManager')),{receipt:{...receipt,status:'committed',messageId:message.id}});
  await persistShotSnapshot(message,snapshot);return message;
 });
}
export function renderLTFlameBurn(source,root,runtime=globalThis){
 const shot=source?.flags?.['olegurps-qol']?.shotSnapshot;
 if(!shot?.profile?.damage?.rules?.ltFlame?.ongoing||root?.querySelector('[data-lt-flame-burn]'))return;
 const actor=runtime.game?.actors?.get(shot.actorId);if(!actor||(actor.isOwner!==true&&!runtime.game?.user?.isGM))return;
 const row=runtime.document?.createElement('div');if(!row)return;row.dataset.ltFlameBurn='true';row.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 for(const [water,label]of [[false,'Горение после попадания'],[true,'Горение на воде (2 ярда)']]){
  const button=runtime.document.createElement('button');button.type='button';button.textContent=label;button.title='Подтвердить попадание вручную и один раз определить длительность';
  button.addEventListener('click',async event=>{event.preventDefault();button.disabled=true;try{await createLTFlameBurn(source,{water,runtime});}catch(error){runtime.ui?.notifications?.error?.(error.message);}finally{button.disabled=false;}});row.append(button);
 }
 root.append(row);
}
