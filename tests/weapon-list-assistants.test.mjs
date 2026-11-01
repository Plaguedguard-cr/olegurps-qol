import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
globalThis.Element=class{};
globalThis.ui={notifications:{error:()=>{}}};
const {WeaponAssistantApp}=await import('../scripts/tools/weapon-assistant-app.js');
const {MeleeAssistantApp}=await import('../scripts/tools/melee-assistant-app.js');
const {WeaponListVisibility,meleeVisibilityEntries}=await import('../scripts/tools/weapon-list-visibility.js');
function fixture(){const flags={},user={id:'me',getFlag:(_s,k)=>flags[k],async setFlag(_s,k,v){const parts=k.split('.'),base=parts.shift();let o=flags[base]??={};while(parts.length>1)o=o[parts.shift()]??={};o[parts[0]]=structuredClone(v);}};globalThis.game={user};
 const rows=[1,2].map(n=>({key:'a'+n,name:'Knife',standaloneRef:{weaponId:'physical'+n}})),actor={uuid:'Actor.a',isOwner:true,system:{}},app=Object.assign(Object.create(MeleeAssistantApp.prototype),{actor,sourceAttacks:rows,selectedAttackKey:'a1',rendered:true,weaponVisibility:new WeaponListVisibility(actor)});
 let renders=0;app.render=async()=>{renders++;};app._selectAttack=async key=>{app.selectedAttackKey=key;};return {app,actor,rows,user,renders:()=>renders};}
test('hiding selected melee instance selects another visible instance without saving Actor selection',async()=>{const f=fixture();let received;f.app._selectAttack=async(key,options)=>{received=options;f.app.selectedAttackKey=key;};await f.app.weaponVisibility.change('hide','standalone:physical1',()=>meleeVisibilityEntries(f.actor,f.rows));await f.app._refreshVisibleWeapons();assert.deepEqual(received,{persistSelection:false});assert.equal(f.app.selectedAttackKey,'a2');assert.equal(f.renders(),1);assert.doesNotMatch(f.app._buildAttackOptions(),/value="a1"/);});
test('local selection executes the real selection method without state or preference writes',async()=>{
 const {TargetingService}=await import('../scripts/tools/targeting-service.js');const create=TargetingService.create;
 const state={version:5,selectedAttackKey:'old',attacks:{}},before=structuredClone(state),row={key:'new',name:'Punch',level:10,damage:'1d cr',data:{}};
 const app=Object.assign(Object.create(MeleeAssistantApp.prototype),{actor:{system:{},getFlag:()=>undefined},sourceAttacks:[row],selectedAttackKey:'old',_meleeState:state,fireState:{},_damagePreviewRevision:0,_attackSlotStates:[{}],_activeAttackSlot:0,element:null});
 for(const method of ['_captureFields','_normalizeAttackConfigurationLocations','_applyAttackConfiguration','_updateMeleePreview'])app[method]=()=>{};
 app._resolveGoverningSkill=v=>v;app._persistCurrentPreferences=app._persistState=async()=>assert.fail('personal filtering must never write Actor state');
 TargetingService.create=async()=>({bodyplan:'humanoid'});
 try{await app._selectAttack('new',{persistSelection:false});assert.equal(app.selectedAttackKey,'new');assert.deepEqual(state,before);}finally{TargetingService.create=create;}
});
test('empty melee list clears active selection and offers recovery without attack controls',async()=>{const f=fixture();for(const id of ['physical1','physical2'])await f.app.weaponVisibility.change('hide','standalone:'+id,()=>meleeVisibilityEntries(f.actor,f.rows));f.app._damagePreviewRevision=0;await f.app._refreshVisibleWeapons();assert.equal(f.app.selectedAttackKey,'');assert.equal(f.app._effectiveDamage,null);assert.throws(()=>f.app._createAttackSnapshots(),/скрыто/);const html=f.app._buildContent({});assert.match(html,/Показать скрытое/);assert.match(html,/restore-all-weapons/);assert.doesNotMatch(html,/data-melee-action="confirm"|name="meleeAttackMode"/);});
test('restoring a hidden weapon preserves the currently selected other weapon',async()=>{const f=fixture();await f.app.weaponVisibility.change('hide','standalone:physical1',()=>meleeVisibilityEntries(f.actor,f.rows));await f.app._refreshVisibleWeapons();await f.app.weaponVisibility.change('restore','standalone:physical1');await f.app._refreshVisibleWeapons();assert.equal(f.app.selectedAttackKey,'a2');assert.equal((f.app._buildAttackOptions().match(/<option/g)??[]).length,2);});
test('late melee completion after closing does not render a new window',async()=>{const f=fixture();f.app._visibilityClosed=true;await f.app._refreshVisibleWeapons();assert.equal(f.renders(),0);});
function manager(action='hide-weapon'){
 const app=Object.create(WeaponAssistantApp.prototype),button={dataset:{ammoAction:action,weaponId:'gun'},isConnected:true,disabled:false},target=new Element();target.closest=()=>button;
 const event={target,preventDefault(){},stopPropagation(){}};let calls=0,refreshes=0,release;app.handleAction=async()=>{calls++;await new Promise(r=>release=r);return {changed:true};};app.refreshContent=async()=>{refreshes++;};return {app,button,event,calls:()=>calls,refreshes:()=>refreshes,release:()=>release()};
}
test('repeated ranged clicks keep the original operation lock until its completion',async()=>{const f=manager(),first=f.app._onManagerClick(f.event);await f.app._onManagerClick(f.event);assert.equal(f.calls(),1);assert.equal(f.app._visibilityBusy,true);assert.equal(f.button.disabled,true);f.release();await first;assert.equal(f.app._visibilityBusy,false);assert.equal(f.refreshes(),1);});
test('late ranged completion after closing never calls render or refresh',async()=>{const f=manager(),first=f.app._onManagerClick(f.event);f.app._visibilityClosed=true;f.release();await first;assert.equal(f.refreshes(),0);});
test('ranged recovery passes its exact visibility identity and does not use a name',async()=>{const f=manager('restore-weapon');f.button.dataset.visibilityId='equipment:exact';let received;f.app.handleAction=async args=>{received=args;return {changed:false};};await f.app._onManagerClick(f.event);assert.equal(received.visibilityId,'equipment:exact');assert.equal(received.magazineIndex,undefined);assert.equal(received.weaponId,'gun');});
test('repeated + calls share one pending nonmodal library and allow reopening after close',async()=>{
 const {openStandaloneWeaponLibrary}=await import('../scripts/tools/standalone-weapon-configuration.js');let calls=0,release;const previous=foundry.applications.api.DialogV2;
 foundry.applications.api.DialogV2={wait:async options=>{assert.equal(options.modal,false);calls++;await new Promise(r=>release=r);}};
 const actor={uuid:'Actor.library',isOwner:true,system:{},getFlag:()=>undefined},catalogs={load:async()=>{},getCatalog:()=>null};
 try{const one=openStandaloneWeaponLibrary({actor,catalogs}),two=openStandaloneWeaponLibrary({actor,catalogs});assert.equal(one,two);await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();await one;const next=openStandaloneWeaponLibrary({actor,catalogs});await new Promise(r=>setImmediate(r));assert.equal(calls,2);release();await next;}finally{foundry.applications.api.DialogV2=previous;}
});
