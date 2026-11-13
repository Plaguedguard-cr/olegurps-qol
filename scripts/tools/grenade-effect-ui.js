import {sendGrenadeEffect,grenadeCheckHistory,grenadeCheckSummary,clearGrenadeCheckHistory} from './grenade-effect-chat.js';
import {grenText as t,escapeGrenade as esc} from './grenade-localization.js';

export function mountGrenadeEffectCalculator(root,{onResolved=()=>{}}={}){
  const panel=root.querySelector('[data-grenade-effects]');if(!panel)return null;
  let event=null,busy=false,revision=0;
  const current=()=>game.actors.get(event?.actorId)?.getFlag('olegurps-qol','handGrenades')?.events?.find(e=>e.id===event.id)??event;
  function historyHTML(){
    const rows=grenadeCheckHistory(current());
    return `<summary>${esc(t('CheckHistory'))} (${rows.length}) <button type="button" class="og-grenade-clear-history" data-grenade-clear-checks title="${esc(t('ClearCheckHistory'))}" aria-label="${esc(t('ClearCheckHistory'))}" ${rows.length?'':'disabled'}><i class="fa-solid fa-trash"></i></button></summary><div>${rows.map(row=>`<p data-grenade-check-result="${esc(row.id)}">${esc(grenadeCheckSummary(row))}</p>`).join('')}</div>`;
  }
  async function refreshArea(){
    const version=++revision,button=panel.querySelector('[data-grenade-area]');if(!button||!event||event.theatre)return;
    const map=await import('./grenade-map.js');if(version!==revision||!event||event.theatre)return;
    const state=map.grenadeAreaControl(current());button.hidden=!state.available;button.textContent=t(state.visible?'RemoveEffectArea':'AddEffectArea');button.dataset.visible=String(state.visible);
  }
  function refresh(){
    const history=panel.querySelector('[data-grenade-check-history]');if(history)history.innerHTML=historyHTML();
    refreshArea().catch(error=>console.warn('OleGURPS | Grenade area',error));
  }
  function transfer(next){
    event=next?structuredClone(next):null;panel.hidden=!event?.detonation?.profile?.payloadEffect;
    if(panel.hidden){panel.innerHTML='';revision++;return;}
    const e=event.detonation.profile.payloadEffect;
    panel.innerHTML=`<button type="button" data-grenade-send>${esc(t('SendEffectToChat'))}</button>${!event.theatre?`<button type="button" data-grenade-area hidden></button>`:''}<details class="olegurps-chat-details" data-grenade-check-history>${historyHTML()}</details><details class="olegurps-chat-details"><summary>${esc(t('Properties'))}</summary>${e.rules.map(rule=>'<p>'+esc(rule)+'</p>').join('')}<p>${esc(event.detonation.profile.source)}</p></details>`;
    refreshArea().catch(error=>console.warn('OleGURPS | Grenade area',error));
  }
  async function resolve(){
    if(!event||busy)return;busy=true;
    try{const message=await sendGrenadeEffect(current());onResolved(message);return message;}finally{busy=false;}
  }
  panel.addEventListener('click',async click=>{
    const button=click.target.closest('[data-grenade-send],[data-grenade-clear-checks],[data-grenade-area]');if(!button)return;
    click.preventDefault();click.stopPropagation();if(button.disabled||busy)return;button.disabled=true;
    try{
      if(button.hasAttribute('data-grenade-send'))await resolve();
      if(button.hasAttribute('data-grenade-clear-checks')){await clearGrenadeCheckHistory(current());refresh();}
      if(button.hasAttribute('data-grenade-area')){const map=await import('./grenade-map.js');await map.setGrenadeEffectArea(current(),button.dataset.visible!=='true');await refreshArea();}
    }catch(error){ui.notifications.error(error.message);}finally{if(button.isConnected)button.disabled=false;}
  });
  const hooks=['createChatMessage','updateChatMessage','deleteChatMessage','updateActor','updateUser','createDrawing','updateDrawing','deleteDrawing'].map(name=>[name,Hooks.on(name,refresh)]);
  return {transfer,resolve,destroy(){revision++;for(const[name,id]of hooks)Hooks.off(name,id);},get event(){return event?structuredClone(event):null;}};
}
