import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixture,load,shoot,catalogs,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarriers} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {ammunitionCandidates,ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
import {applyInventoryOperation,projectAmmoInventory,validateInventory} from '../scripts/tools/ammo-inventory.js';
import {UAW_FEEDS,uawFeed,activeUAWCarrier,uawManagerWeapons,renderUAWMagazineGroups} from '../scripts/tools/ut-uaw.js';
import {magazinePolicy} from '../scripts/tools/magazine-policy.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
const main='WtM51JNSpOUIy3Eo1',shotgun='WRvS5pz3LMCzqQyiZ';
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);

async function dual(){
  const fx=await fixture(main),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(catalogs.getEquipmentForMode(main).equipment_id);
  const record=await new StandaloneWeaponService(fx.actor,catalogs).save(draft);
  const definitions=fx.actor.getFlag('olegurps-qol','standaloneWeapons');definitions.weapons=definitions.weapons.filter(w=>w.id===record.id);await fx.actor.setFlag('olegurps-qol','standaloneWeapons',definitions);
  const carriers=standaloneAmmoCarriers(record),s=fx.state();s.weapons=carriers;
  await fx.actor.setFlag('world','gurpsAmmoManager',s);
  const resolver=new AttackProfileResolver({catalogs,compatibility:api.ammunitionCompatibility});
  const views=carriers.map(carrier=>{
    const state=()=>fx.actor.getFlag('world','gurpsAmmoManager'),weapon=()=>state().weapons.find(w=>w.id===carrier.id),
      attack=()=>readStandaloneAttack(fx.actor,record.id,carrier.standaloneModeId),service=new AmmoService(fx.actor);
    return {actor:fx.actor,record,carrier,state,weapon,service,attack,candidates:()=>ammunitionCandidates(fx.actor,weapon(),api),
      transaction:(op,args)=>service.inventoryTransaction(carrier.id,op,args,{allowedTypes:w=>ammunitionCandidates(fx.actor,w,api)}),
      profile:(context={})=>resolver.resolve({context,actorId:fx.actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,
        state:state(),binding:standaloneCatalogBinding(attack(),catalogs),ammunition:service.readAttackAmmunition(carrier.id)})};
  });
  return {fx,views,record};
}
async function activate(view,index=0){return view.transaction('install',{magazineId:view.weapon().ammunitionInventory.magazines[index].id});}

test('UAW has two distinct physical carriers, source Shots including chamber, exact UT137 profile and stable recovery',async()=>{
  const {fx,views,record}=await dual();assert.equal(views.length,2);
  for(const v of views){
    const feed=uawFeed(v.carrier.standaloneModeId),m=v.weapon().ammunitionInventory.magazines[0],a=v.attack();
    assert.equal(m.capacity,feed.capacity);assert.equal(m.sourceFeed.sourceShots,feed.shots);assert.equal(m.rounds,0);
    assert.equal(a.data.shots,feed.shots);assert.equal(a.readinessReason,null);
    assert.equal(a.data.damage,feed.id==='main'?'3d pi+':'4d+4 pi++');assert.equal(a.rcl,feed.id==='main'?'3':'1');
    assert.equal(a.acc,feed.id==='main'?4:2);assert.equal(a.rof,feed.id==='main'?'10':'2');
    assert.deepEqual(standaloneAmmoCarriers(record,fx.state().weapons),fx.state().weapons);
  }
  assert.equal(catalogs.getMode(shotgun).raw_calc.damage,'4d+4 pi++','original catalog remains intact');
  const single=standaloneAmmoCarriers(record,[fx.state().weapons[1]]);
  assert.equal(single.length,2);assert.equal(single[0].standaloneModeId,shotgun);
  assert.equal(new Set(single.map(w=>w.id)).size,2);assert.deepEqual(single[0],fx.state().weapons[1]);
});

test('owner loads/switches/fires/unloads independently; snapshots freeze exact feed, magazine and lot across reload',async()=>{
  game.user.isGM=false;
  try{const {fx,views:[a,b]}=await dual();
    for(const v of [a,b])await load(v,v.candidates().find(t=>!t.recipe&&!t.unavailable),5);
    const untouched=JSON.stringify(a.weapon().ammunitionInventory);
    await activate(b);assert.equal(activeUAWCarrier(b.state(),a.weapon()).id,b.carrier.id);
    const first=await shoot(b,1),saved=JSON.stringify(first.snapshot);
    assert.equal(first.spent,1);assert.equal(first.snapshot.profile.damage.formula,'5d pi++');
    assert.equal(first.snapshot.profile.context.barrel.id,'shotgun');assert.equal(first.snapshot.magazineId,b.weapon().ammunitionInventory.installedId);
    assert.equal(first.snapshot.ammunition.ammoId,'18_5mm_pc');assert.equal(JSON.stringify(a.weapon().ammunitionInventory),untouched);
    await assert.rejects(shoot(a),/UAWInactiveFeed/);
    const other=JSON.stringify(b.weapon().ammunitionInventory);await activate(a);
    const second=await shoot(a,2);assert.equal(second.spent,2);assert.equal(second.snapshot.profile.damage.formula,'3d pi+');
    assert.equal(JSON.stringify(b.weapon().ammunitionInventory),other);
    const reloaded=await new AmmoService(fx.actor).loadState();assert.equal(activeUAWCarrier(reloaded,b.weapon()).id,a.carrier.id);
    await b.transaction('unload',{magazineId:b.weapon().ammunitionInventory.installedId,amount:1});
    assert.equal(activeUAWCarrier(b.state(),b.weapon()).id,a.carrier.id);
    assert.equal(JSON.stringify(first.snapshot),saved);assert.equal(first.snapshot.ammunition.ammoId,'18_5mm_pc');
    await shoot(b,1,{attackId:first.snapshot.attackId});assert.equal(JSON.stringify(first.snapshot),saved);
    assert.deepEqual(fx.actor.system,fx.before);
  }finally{game.user.isGM=true;}
});

test('old single-barrel UAW definitions gain the other source mode without rewriting the saved definition or retagging property',async()=>{
  const {fx,views:[a,b],record}=await dual();
  const definitions=fx.actor.getFlag('olegurps-qol','standaloneWeapons');definitions.weapons[0].modes=definitions.weapons[0].modes.filter(m=>m.modeId===shotgun);
  await fx.actor.setFlag('olegurps-qol','standaloneWeapons',definitions);
  const state=b.state();state.weapons=[b.weapon()];await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const before=JSON.stringify(definitions),carrier=JSON.stringify(b.weapon());
  const loaded=await b.service.loadState();assert.equal(loaded.weapons.length,2);
  assert.equal(JSON.stringify(loaded.weapons.find(w=>w.id===b.carrier.id)),carrier);
  assert.equal(JSON.stringify(fx.actor.getFlag('olegurps-qol','standaloneWeapons')),before);
  assert.equal(readStandaloneAttack(fx.actor,record.id,main).data.damage,'3d pi+');
});

test('5/5 limits are separate, installed and empty objects count, simultaneous requests cannot add a sixth',async()=>{
  const {views:[a,b]}=await dual();
  for(const v of [a,b])await v.transaction('add-magazines',{amount:3,capacity:uawFeed(v.carrier.standaloneModeId).capacity});
  const concurrent=await Promise.allSettled([a.transaction('add-magazines',{amount:1,capacity:41}),a.transaction('add-magazines',{amount:1,capacity:41})]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.filter(r=>r.status==='rejected').length,1);
  await assert.rejects(a.transaction('add-magazines',{amount:1,capacity:41}),/MagazineLimit/);
  assert.equal(b.weapon().ammunitionInventory.magazines.length,4);await b.transaction('add-magazines',{amount:1,capacity:6});
  assert.equal(a.weapon().ammunitionInventory.magazines.length,5);assert.equal(b.weapon().ammunitionInventory.magazines.length,5);
  await assert.rejects(b.transaction('add-magazines',{amount:1,capacity:6}),/MagazineLimit/);
  const before=JSON.stringify(a.state());await assert.rejects(a.service.transferMagazine(b.carrier.id,a.carrier.id,b.weapon().ammunitionInventory.magazines[0].id),/MagazineLimit/);
  assert.equal(JSON.stringify(a.state()),before);
  const html=ammoManagementHTML(a.weapon(),{language:'en',magazineId:a.weapon().ammunitionInventory.installedId},a.candidates());
  assert.match(html,/data-inventory-action="add-magazines" disabled/);assert.match(html,/5 \/ 5/);
});

test('ordinary weapon limit 10, transfer checks and concurrency share the resource queue, old excess is usable',async()=>{
  const a=await fixture('WdUnAFzFvv59Smhhk'),b=await fixture('W9chB7ydzOWTAxQP0');
  await a.transaction('add-magazines',{amount:8,capacity:9});
  const concurrent=await Promise.allSettled([a.transaction('add-magazines',{amount:1,capacity:9}),a.transaction('add-magazines',{amount:1,capacity:9})]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(a.weapon().ammunitionInventory.magazines.length,10);
  const state=a.state(),other={...b.weapon(),id:'other'};
  delete other.standaloneWeaponId;delete other.standaloneModeId;
  other.ammunitionInventory.magazines=other.ammunitionInventory.magazines.map(m=>({...m,weaponId:'other'}));state.weapons.push(other);
  await a.actor.setFlag('world','gurpsAmmoManager',state);
  const before=JSON.stringify(a.state());await assert.rejects(a.service.transferMagazine('other',a.carrier.id,other.ammunitionInventory.installedId),/MagazineLimit/);assert.equal(JSON.stringify(a.state()),before);
  const bypass=a.state(),existing=bypass.weapons[1].ammunitionInventory.magazines.pop();
  bypass.weapons[1].ammunitionInventory.installedId=null;
  bypass.weapons[0].ammunitionInventory.magazines.push({...existing,weaponId:a.carrier.id});
  await assert.rejects(a.service.saveState(bypass,{inventoryWrite:true}),/MagazineLimit/);assert.equal(JSON.stringify(a.state()),before);
  await a.transaction('delete-magazine',{magazineId:a.weapon().ammunitionInventory.magazines.at(-1).id});
  const moved=await a.service.transferMagazine('other',a.carrier.id,other.ammunitionInventory.installedId);
  assert.equal(moved.weapons[0].ammunitionInventory.magazines.length,10);assert.equal(moved.weapons[1].ammunitionInventory.magazines.length,0);
  const old=a.state();for(let i=0;i<2;i++)old.weapons[0].ammunitionInventory.magazines.push({id:crypto.randomUUID(),weaponId:a.carrier.id,capacity:9,rounds:0,ammoKey:null});
  projectAmmoInventory(old.weapons[0]);await a.actor.setFlag('world','gurpsAmmoManager',old);
  const count=old.weapons[0].ammunitionInventory.magazines.length;await a.service.loadState();assert.equal(a.weapon().ammunitionInventory.magazines.length,count);
  await assert.rejects(a.transaction('add-magazines',{amount:1,capacity:9}),/MagazineLimit/);
  const first=a.weapon().ammunitionInventory.magazines[0].id;await a.transaction('install',{magazineId:first});await a.transaction('eject',{magazineId:first});
  assert.equal(a.weapon().ammunitionInventory.installedId,null);await a.service.loadState();assert.equal(a.weapon().ammunitionInventory.installedId,null);
  await a.transaction('delete-magazine',{magazineId:a.weapon().ammunitionInventory.magazines.at(-1).id});assert.equal(a.weapon().ammunitionInventory.magazines.length,count-1);
});

test('legacy UAW excess and missing active magazine are preserved; no fake magazine is made',async()=>{
  const {views:[a,b]}=await dual(),state=a.state();
  for(let i=0;i<6;i++)state.weapons[0].ammunitionInventory.magazines.push({id:crypto.randomUUID(),weaponId:a.carrier.id,capacity:41,rounds:0,ammoKey:null});
  projectAmmoInventory(state.weapons[0]);await a.actor.setFlag('world','gurpsAmmoManager',state);
  await a.service.loadState();assert.equal(a.weapon().ammunitionInventory.magazines.length,7);
  await assert.rejects(a.transaction('add-magazines',{amount:1,capacity:41}),/MagazineLimit/);
  await activate(b);await b.transaction('delete-magazine',{magazineId:b.weapon().ammunitionInventory.installedId});
  const loaded=await a.service.loadState();assert.equal(b.weapon().ammunitionInventory.magazines.length,0);
  assert.equal(activeUAWCarrier(loaded,b.weapon()).id,a.carrier.id);
  assert.equal(loaded.weapons.length,2);assert.equal(validateInventory(b.weapon().ammunitionInventory,b.carrier.id),true);
});

test('UAW groups alone get two independent numbering sequences, exactly one active chip; other weapons keep their UI',async()=>{
  const {views:[a,b]}=await dual();await a.transaction('add-magazines',{amount:1,capacity:41});await b.transaction('add-magazines',{amount:1,capacity:6});await activate(b,1);
  const renderer=(w,{active})=>w.ammunitionInventory.magazines.map((m,i)=>`<button data-id="${m.id}" aria-pressed="${active&&m.id===w.ammunitionInventory.installedId}">${i+1}: ${m.rounds}/${m.capacity}</button>`).join('');
  for(const lang of ['ru','en']){game.i18n.lang=lang;const html=renderUAWMagazineGroups(a.state(),a.weapon(),renderer,escapePayload);
    assert.equal((html.match(/data-uaw-feed=/g)??[]).length,2);assert.equal((html.match(/>1:/g)??[]).length,2);
    assert.equal((html.match(/aria-pressed="true"/g)??[]).length,1);assert.match(html,/Основной ствол/);assert.match(html,/Дробовой ствол/);
  }game.i18n.lang='ru';
  assert.equal(uawManagerWeapons(a.state()).length,1);
  for(const mode of ['WmyROTLk0gs7lrYCE','W5_HQQYf_zjoG9A7J']){
    const fx=await fixture(mode);assert.equal(renderUAWMagazineGroups(fx.state(),fx.weapon(),renderer,escapePayload),null);assert.equal(magazinePolicy(fx.weapon()).limit,10);
  }
});

test('all 55 formerly blocked UAW pairs are reassessed without source status edits and pass stock -> attack',async()=>{
  assert.equal(createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(matrix.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'),contract.sourceStatusDigestBeforeUAW);
  const rows=matrix.rows.filter(r=>uawFeed(r.modeId)&&['confirmed','conditional'].includes(r.status));assert.equal(rows.length,55);
  assert.equal(rows.filter(r=>r.implementation==='available').length,55);assert.equal(rows.filter(r=>r.implementation==='blocked').length,0);
  let checked=0;game.user.isGM=false;
  try{for(const r of rows){
    if(r.implementation==='blocked'){assert.ok(['etc','liquid_propellant','shotshell'].includes(r.candidateId));assert.ok(r.blocker);continue;}
    const {views}=await dual(),v=views.find(w=>w.carrier.standaloneModeId===r.modeId),base=v.candidates().find(t=>!t.recipe&&!t.unavailable);
    if(['liquid_propellant','etc'].includes(r.candidateId)){
      const state=v.state();state.weapons.find(w=>w.id===v.carrier.id).executionRequest={variant:r.candidateId==='etc'?'etc':'lp',modeId:r.modeId};await v.service.saveState(state);
    }
    const p=r.recipeVariant?automatic.prepare({modeId:r.modeId,base,variantId:r.recipeVariant,parameters:{availabilityTL:r.availabilityTL,...r.recipeParameters,note:'Owner lot',savingThrow:'Owner HT',description:'Owner description'}}):null;
    if(p)assert.equal(p.state,'complete',r.candidateId);
    const type=p?.type??base;if(p)await v.transaction('save-recipe',{type});await load(v,type,3);await activate(v);
    const result=await shoot(v,1,{context:{shotgun:{physicalDistance:40}}}),saved=JSON.stringify(result.snapshot);
    assert.equal(result.spent,1);assert.equal(result.snapshot.ammunition.ammoId,uawFeed(r.modeId).familyId);
    assert.equal(result.snapshot.profile.context.barrel.modeId,r.modeId);assert.equal(result.snapshot.profile.damage.nativeSafe,true);
    assert.doesNotMatch(result.message.content,/<details[^>]*\bopen|B414|B435|GM approval|IndependentFeeds/);
    await shoot(v,1,{attackId:result.snapshot.attackId});assert.equal(JSON.stringify(result.snapshot),saved);checked++;
  }}finally{game.user.isGM=true;}
  assert.equal(checked,55);
});

test('UAW lots and families cannot mix; edited recipes and other magazines leave historical shots unchanged',async()=>{
  const {views:[a,b]}=await dual(),base=a.candidates().find(t=>!t.recipe&&!t.unavailable);
  const prepare=note=>automatic.prepare({modeId:main,base,variantId:'ut_he',parameters:{note,batchId:note}}).type;
  const lotA=prepare('A'),lotB=prepare('B');
  for(const type of [lotA,lotB]){await a.transaction('save-recipe',{type});await a.transaction('add-stock',{ammoKey:type.key,amount:4});}
  const magA=a.weapon().ammunitionInventory.installedId;
  await a.transaction('load',{magazineId:magA,ammoKey:lotA.key,amount:3});
  await assert.rejects(a.transaction('load',{magazineId:magA,ammoKey:lotB.key,amount:1}),/MixedTypes/);
  await assert.rejects(b.transaction('add-stock',{ammoKey:lotA.key,amount:1}),/TypeUnavailable/);
  await a.transaction('add-magazines',{amount:1,capacity:41});const magB=a.weapon().ammunitionInventory.magazines[1].id;
  await a.transaction('load',{magazineId:magB,ammoKey:lotB.key,amount:3});
  await activate(a);const result=await shoot(a),saved=JSON.stringify(result.snapshot),other=JSON.stringify(a.weapon().ammunitionInventory.magazines[1]);
  const edited=automatic.prepare({modeId:main,base,variantId:'ut_he',parameters:{...lotA.recipe.parameters,note:'Changed'}}).type;
  await a.transaction('edit-recipe',{ammoKey:lotA.key,type:edited});
  assert.equal(JSON.stringify(result.snapshot),saved);assert.equal(result.snapshot.ammunition.recipe.parameters.note,'A');
  assert.equal(JSON.stringify(a.weapon().ammunitionInventory.magazines[1]),other);
  assert.equal(b.weapon().totalAmmo,0);
});

test('fixed confirmed systems reject detachable additions and preserve existing data; unauthorized players cannot mutate magazines',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),state=fx.state();state.weapons[0].ammunitionFeed={kind:'fixed'};
  await fx.actor.setFlag('world','gurpsAmmoManager',state);
  await assert.rejects(fx.transaction('add-magazines',{amount:1,capacity:1}),/FixedFeedLimit/);
  assert.equal(fx.weapon().ammunitionInventory.magazines.length,1);
  fx.actor.isOwner=false;game.user.isGM=false;const before=JSON.stringify(fx.state());
  try{await assert.rejects(fx.transaction('add-magazines',{amount:1,capacity:1}),/Permission/);}finally{game.user.isGM=true;fx.actor.isOwner=true;}
  assert.equal(JSON.stringify(fx.state()),before);
});
