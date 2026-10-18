import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CatalogService,CATALOG_DEFINITIONS} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {UT_CONVENTIONAL_MODES,UT_CONVENTIONAL_DEFERRED,UT_CONVENTIONAL_RULES,utConventionalFeed} from '../scripts/tools/ut-conventional-ammunition.js';
import {AutomaticAmmunitionProfileService} from '../scripts/tools/automatic-ammunition-profiles.js';
import {AttackProfileResolver,createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {parseRateOfFire,resolveMultipleProjectileFire} from '../scripts/tools/fire-service.js';
import {moduleText} from '../scripts/localization.js';
import {setAttackOverride,applyAttackOverride,parseAccuracyComponents} from '../scripts/tools/weapon-attack-overrides.js';
import {choiceGroupsHTML} from '../scripts/tools/ammunition-choices.js';
import {ammoText} from '../scripts/tools/ammo-management-localization.js';

globalThis.foundry={utils:{deepClone:structuredClone,randomID:()=>crypto.randomUUID()},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'player',isGM:false},i18n:{lang:'ru',localize:k=>k},settings:{get:()=>null,set:async()=>{throw Error('WorldSettingWriteForbidden');}},messages:{contents:[]}};
const {ammunitionCandidates,availableAmmoTypes,displayedAmmoTypes}=await import('../scripts/tools/ammo-management-app.js');
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs);
const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
const resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic};
const api=globalThis.OleGURPSQOL;game.actors=new Map();

async function fixture(modeId,{host=true}={}) {
  const flags={},writes=[];
  const actor={id:crypto.randomUUID(),isOwner:true,system:{attributes:{DX:{value:13}},ranged:{},skills:{}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),
    setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);writes.push([s,k]);},
    update:async changes=>{for(const [path,v] of Object.entries(changes)){assert.ok(path.startsWith('flags.'));const [,s,k]=path.split('.');flags[s]??={};if(k.startsWith('-='))delete flags[s][k.slice(2)];else flags[s][k]=structuredClone(v);}}};
  game.actors.set(actor.id,actor);const before=structuredClone(actor.system),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);
  if(host&&modeId==='WkudgdqO3lymAYks5'){draft.setOverride(modeId,'bulk','-5');draft.setOverride(modeId,'st','10');draft.setOverride(modeId,'acc','2+0');}
  const record=await new StandaloneWeaponService(actor,catalogs).save(draft);
  const carrier=standaloneAmmoCarrier(record);
  await actor.setFlag('world','gurpsAmmoManager',{version:10,weapons:[carrier],governingSkills:{},attackOverrides:{}});
  const service=new AmmoService(actor),state=()=>actor.getFlag('world','gurpsAmmoManager');
  const weapon=()=>state().weapons[0],attack=()=>readStandaloneAttack(actor,record.id,modeId);
  const candidates=()=>ammunitionCandidates(actor,weapon(),api);
  const transaction=(op,args)=>service.inventoryTransaction(carrier.id,op,args,{allowedTypes:w=>ammunitionCandidates(actor,w,api)});
  const profile=()=>resolver.resolve({actorId:actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,state:state(),
    binding:standaloneCatalogBinding(attack(),catalogs),ammunition:service.readAttackAmmunition(carrier.id),profilePolicy:'strict',approval:readAmmunitionApproval({actor,actorId:actor.id,weaponId:carrier.id,modeId,type:service.readAttackAmmunition(carrier.id)?.type})});
  return {actor,before,writes,record,carrier,service,state,weapon,attack,candidates,transaction,profile};
}
async function load(fx,type,rounds=8) {
  await fx.transaction('add-stock',{ammoKey:type.key,amount:rounds});const id=fx.weapon().ammunitionInventory.installedId;
  await fx.transaction('load',{magazineId:id,ammoKey:type.key,amount:Math.min(rounds,fx.weapon().ammunitionInventory.magazines[0].capacity)});return id;
}
function nativeRuntime(actor){
  const messages=[];return {messages,runtime:{game:{user:game.user,settings:{get:()=>null,set:async()=>{throw Error('WorldSettingWriteForbidden');}}},
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},canvas:{tokens:{placeables:[]}},
    Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(_p,data)=>data.followon,
    ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async data=>{const m={...data,id:crypto.randomUUID(),
      async setFlag(s,k,v){this.flags??={};this.flags[s]??={};this.flags[s][k]=structuredClone(v);},getFlag(s,k){return this.flags?.[s]?.[k];}};messages.push(m);return m;}}}};
}
function shoot(fx,amount=1,{cancel=false,attackId=crypto.randomUUID()}={}){
  const {runtime}=nativeRuntime(fx.actor);
  return fx.service.executeShot({weaponId:fx.carrier.id,attackId,prepare:()=>({amount,profile:fx.profile()}),
    execute:cancel?async()=>({rolled:false}):({profile})=>executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,
      shotSnapshot:createShotSnapshot(profile,{attackId,resourceTiming:'after-attack'}),effectiveSkill:13,physicalShots:amount,
      effectiveRoF:amount*(profile.damage.rules.projectiles?.count??1),rcl:Number(profile.effective.rcl),consumeAction:false,runtime})});
}


import {UT_SPECIAL_MODES,UT_SPECIAL_RULES,reviewUTSpecial,utPayloadEditorHTML,utPayloadChatHTML} from '../scripts/tools/ut-special-ammunition.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';

import {setAmmunitionApproval,readAmmunitionApproval,approvalKey,actorDecisionKey,recipeFingerprint,canManageAmmunitionShot,removeOwnedAmmunitionApprovals} from '../scripts/tools/ammunition-approval-service.js';
import {bindDUDecision} from '../scripts/tools/du-ammunition.js';
import {bindMultishotDefinition} from '../scripts/tools/multishot-ammunition.js';
import {createRegisteredHandload} from '../scripts/tools/handload-registration.js';
import {recipeEditorHTML} from '../scripts/tools/ammunition-recipe-editor.js';
import {calculateExplosiveRecipe} from '../scripts/tools/explosive-ammunition-model.js';
import {calculateF4,captureF4Combat,confirmTracer,tracerBonus} from '../scripts/tools/ammunition-f4.js';
import {calculateF2} from '../scripts/tools/ammunition-f2.js';
import {calculateF3} from '../scripts/tools/ammunition-f3.js';
const ak='W27s4Lm8QlkKVKUPn';
const parameters=()=>({projectileMassG:7.9,explosiveMassG:.316,ref:1.4,fragmentMassG:2,referenceMassG:146,referenceDice:2,
  referenceSource:'User calibration',q:1,source:{kind:'user',note:'User construction'}});
function custom(base,variantId,id=crypto.randomUUID()) {
  const type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:base.ammoId,name:base.name+' custom '+variantId,
    recipe:{version:1,variantId,customId:id,parameters:parameters()}};type.key=ammoTypeKey(type);return type;
}
for(const variant of ['ht_apex','ht_aphex'])test('OWNER '+variant+' creation/edit/use/delete; no GM or world write',async()=>{
  const fx=await fixture(ak),base=fx.candidates().find(t=>!t.recipe),type=custom(base,variant);
  await fx.transaction('save-recipe',{type});await load(fx,type);
  const p=fx.profile();assert.equal(p.damage.nativeSafe,true);assert.equal(p.construction.authority,'user-defined');
  const shot=await shoot(fx),old=JSON.stringify(shot.snapshot),total=fx.weapon().totalAmmo;
  const edited=structuredClone(type);edited.recipe.parameters.ref=4;edited.name+=' edited';
  await fx.transaction('edit-recipe',{ammoKey:type.key,type:edited});assert.equal(fx.weapon().totalAmmo,total);
  assert.equal(fx.weapon().ammunitionInventory.stocks.length,1);assert.equal(fx.profile().damage.nativeSafe,true);
  assert.notEqual(fx.profile().damage.components.find(c=>c.role==='follow-up').formula,p.damage.components.find(c=>c.role==='follow-up').formula);
  assert.equal(JSON.stringify(shot.snapshot),old);
  await assert.rejects(fx.transaction('delete-recipe',{ammoKey:type.key}),/RecipeInUse/);
  const mag=fx.weapon().ammunitionInventory.magazines[0];await fx.transaction('unload',{magazineId:mag.id,amount:mag.rounds});
  const stock=fx.weapon().ammunitionInventory.stocks[0];await fx.transaction('remove-stock',{ammoKey:stock.key,amount:stock.rounds});
  await fx.transaction('delete-recipe',{ammoKey:stock.key});assert.equal(fx.weapon().ammunitionInventory.stocks.length,0);
  assert.equal(JSON.stringify(shot.snapshot),old);assert.deepEqual(fx.actor.system,fx.before);
  const html=recipeEditorHTML({canEdit:true},type,'en');assert.ok(html.includes('save-custom-recipe'));assert.ok(!html.includes('approve-recipe'));
});
test('OWNER +P choices saved in Actor flags; immutable shot; published safety not fabricated',async()=>{
  const fx=await fixture(ak),type=fx.candidates().find(t=>t.recipe?.variantId==='ht_plus_p');assert.ok(type);
  await setAmmunitionApproval({actor:fx.actor,weapon:fx.weapon(),type,active:true,plusPDecision:{malfModifier:-1,rof:2,loadingCheckPassed:true,pressureSuitable:true}});
  const record=readAmmunitionApproval({actor:fx.actor,actorId:fx.actor.id,weaponId:fx.carrier.id,modeId:ak,type});assert.equal(record.origin,'user');assert.equal(record.plusPDecision.rof,2);
  await load(fx,type);const shot=await shoot(fx);assert.equal(shot.snapshot.profile.damage.rules.pressure.decision.origin,'user');
  assert.equal(shot.snapshot.profile.damage.rules.pressure.ratingVerified,false);const old=JSON.stringify(shot.snapshot);
  await setAmmunitionApproval({actor:fx.actor,weapon:fx.weapon(),type,active:true,plusPDecision:{malfModifier:0,rof:3,loadingCheckPassed:true}});
  assert.equal(JSON.stringify(shot.snapshot),old);assert.equal(fx.profile().effective.rof,'3');
  const reload=JSON.parse(JSON.stringify(fx.actor.getFlag('olegurps-qol','ammunitionDecisions')));assert.ok(Object.keys(reload).length);
  await assert.rejects(setAmmunitionApproval({actor:fx.actor,weapon:fx.weapon(),type,active:true,plusPDecision:{rof:-1}}),/Scope/);
});
test('new +P pressure assumption is user data, never published proof and never overrides a known prohibition',()=>{
  const base=catalogs.getAmmoItem('ht','ht_7_62x39mm');
  const p=structuredClone(automatic.prepare({modeId:ak,base:{source:'catalog',book:'ht',kind:'ammo-item',ammoId:base.id,name:base.name},variantId:'ht_plus_p'}));
  assert.equal(p.state,'complete');p.facts.legacyPlusPAdmission=false;
  delete p.facts.evidence.weapon_pressure_rating_verified;
  assert.equal(automatic.admission(p,{policy:'permissive'}).allowed,false);
  const own={origin:'user',plusPDecision:{origin:'user',pressureSuitable:true}};
  assert.equal(automatic.admission(p,{policy:'strict',approval:own}).allowed,true);
  assert.equal(p.facts.evidence.weapon_pressure_rating_verified,undefined);
  p.facts.evidence.weapon_pressure_rating_verified={value:false,source:'Confirmed physical restriction'};
  assert.equal(automatic.admission(p,{approval:own}).allowed,false);
});
test('OWNER DU complete user design does not depend on approvals',async()=>{
  const fx=await fixture(ak),base=fx.candidates().find(t=>!t.recipe),pending=automatic.prepare({modeId:ak,base,variantId:'ht_apdu'});
  const d={designConfirmed:true,platform:'source_verified_other_platform',caliberMm:7.62,availabilityTL:8,source:'User design'};
  const type=bindDUDecision(pending.type,d),p=automatic.prepare({modeId:ak,base,variantId:'ht_apdu',savedType:type});assert.equal(p.state,'complete');assert.equal(p.origin,'user');
  await fx.transaction('save-recipe',{type});await load(fx,type);const shot=await shoot(fx);assert.equal(shot.snapshot.profile.damage.nativeSafe,true);
  assert.equal(compatibility.checkCompatibility(ak,'ht_apdu',{book:'ht',kind:'projectile-option',ammoItemId:base.ammoId}).status,'undetermined');
  const wrong=bindDUDecision(pending.type,{...d,caliberMm:20});assert.notEqual(automatic.prepare({modeId:ak,base,variantId:'ht_apdu',savedType:wrong}).state,'complete');
});
test('OWNER Multishot embedded parameters work with no approval; physical expense once',async()=>{
  const fx=await fixture(ak),base=fx.candidates().find(t=>!t.recipe),p=automatic.prepare({modeId:ak,base,variantId:'ht_duplex'});
  const type=bindMultishotDefinition(p.type,{designConfirmed:true,source:'User design',platform:'automatic_rifle',caliberMm:7.62,availabilityTL:8});
  assert.equal(automatic.prepare({modeId:ak,base,variantId:'ht_duplex',savedType:type}).state,'complete');
  await fx.transaction('save-recipe',{type});await load(fx,type);const total=fx.weapon().totalAmmo,shot=await shoot(fx);
  assert.equal(shot.spent,1);assert.equal(fx.weapon().totalAmmo,total-1);assert.equal(shot.snapshot.profile.damage.rules.projectiles.count,2);
  await shoot(fx,1,{attackId:shot.snapshot.attackId});assert.equal(fx.weapon().totalAmmo,total-1);
});
test('OWNER Handloaded Match uses accessible own checks, retains IQ/Armoury and scope checks',async()=>{
  const fx=await fixture('Wxm8TWSvu5UFTAaDn'),base=fx.candidates().find(t=>!t.recipe),type={...base,recipe:{variantId:'ht_match_handloaded'}};
  const facts=compatibility.checkCompatibility(fx.carrier.standaloneModeId,'ht_match_handloaded',{book:'ht',kind:'cartridge-upgrade',ammoItemId:base.ammoId}).eligibility.facts;
  const messages=new Map(['Armoury','Guns'].map((skill,i)=>['check'+i,{id:'check'+i,visible:true,isContentVisible:true,speaker:{actor:fx.actor.id},whisper:['player'],blind:false,rolls:[{total:9}],content:JSON.stringify({skill,margin:4})}]));
  class Parser {parseFromString(s){const v=JSON.parse(s);return {querySelector:()=>({textContent:v.skill,querySelector:k=>k==='.success'?{}:null,querySelectorAll:()=>[{getAttribute:()=>v.margin+' margin for '+v.skill}]})};}}
  const runtime={...globalThis,game:{...game,messages},DOMParser:Parser,crypto};
  const args={actor:fx.actor,weapon:fx.weapon(),type,modeId:fx.carrier.standaloneModeId,facts,option:catalogs.getVariant('ht','ht_match_handloaded'),input:{batch:'Owner batch',source:'Own checks',availabilityTL:8,confirmed:true,armoury:'check0',iqGuns:'check1'}};
  const registered=createRegisteredHandload(args,runtime);assert.equal(registered.recipe.autoProfile.handloadDefinition.registeredByGM,undefined);
  for(const availabilityTL of [-1,NaN,1.5])assert.throws(()=>createRegisteredHandload({...args,input:{...args.input,availabilityTL}},runtime));
  await fx.transaction('save-recipe',{type:registered});await load(fx,registered);assert.equal(fx.profile().damage.nativeSafe,true);assert.equal(fx.profile().construction.profileOrigin,'user');
  const count=fx.weapon().totalAmmo,oldShot=JSON.stringify((await shoot(fx)).snapshot);
  const edited=createRegisteredHandload({...args,type:registered,input:{...args.input,batch:'Edited batch'}},runtime);
  assert.equal(edited.recipe.customId,registered.recipe.customId);
  await fx.transaction('edit-recipe',{ammoKey:registered.key,type:edited});
  assert.equal(fx.weapon().totalAmmo,count-1);assert.equal(fx.weapon().ammunitionInventory.stocks.length,1);
  assert.equal(fx.profile().damage.nativeSafe,true);assert.equal(JSON.parse(oldShot).ammunition.recipe.autoProfile.handloadDefinition.batchId,'Owner batch');
  messages.get('check0').speaker.actor='other';assert.throws(()=>createRegisteredHandload(args,runtime));
});
test('Actor decision keys survive dotted recipe IDs and reload without expanded update paths',async()=>{
  const fx=await fixture(ak),type=fx.candidates().find(t=>t.recipe?.variantId==='ht_plus_p');
  type.recipe.customId+='v1.2';const scope={actor:fx.actor,actorId:fx.actor.id,weaponId:fx.carrier.id,modeId:ak,type};
  await setAmmunitionApproval({actor:fx.actor,weapon:fx.weapon(),type,active:true,plusPDecision:{rof:2,pressureSuitable:true}});
  const stored=JSON.parse(JSON.stringify(fx.actor.getFlag('olegurps-qol','ammunitionDecisions')));
  assert.ok(!actorDecisionKey(scope).includes('.'));assert.equal(stored[actorDecisionKey(scope)].plusPDecision.rof,2);
  assert.equal(readAmmunitionApproval({...scope,actor:{getFlag:()=>stored}}).plusPDecision.rof,2);
});
test('OWNER weapon decision cleanup supports Foundry merge/deletion keys, preserves legacy and rollback',async()=>{
  const scope={actorId:'own',weaponId:'w',modeId:'m',type:{book:'ht',ammoId:'7.62',recipe:{customId:'1.2'}}};
  const key=actorDecisionKey(scope),entry={actorId:'own',weaponId:'w',modeId:'m',ammoId:'7.62',recipeId:'1.2'};
  let local={[key]:entry,unrelated:{actorId:'own',weaponId:'other',modeId:'other'}};
  const legacy={[approvalKey(scope)]:entry},legacyBefore=JSON.stringify(legacy);
  const actor={isOwner:true,getFlag:()=>structuredClone(local),async setFlag(_s,_k,patch){for(const [k,v]of Object.entries(patch)){if(k.startsWith('-='))delete local[k.slice(2)];else local[k]=structuredClone(v);}}};
  const runtime={game:{user:{isGM:false},settings:{get:()=>legacy,set:async()=>{throw Error('WorldSettingWriteForbidden');}}}};
  const args={actor,actorId:'own',weaponIds:['w'],modeIds:['m']};
  await assert.rejects(removeOwnedAmmunitionApprovals(args,async tx=>{await tx.commit();assert.equal(local[key],undefined);await tx.rollback();throw Error('Synthetic rollback');},runtime),/Synthetic rollback/);
  assert.deepEqual(local[key],entry);
  await removeOwnedAmmunitionApprovals(args,async tx=>tx.commit(),runtime);
  assert.equal(local[key],undefined);assert.equal(local.unrelated.weaponId,'other');assert.equal(JSON.stringify(legacy),legacyBefore);
});
function ownShot(variant){
  const shot={version:1,actorId:'own',attackId:'attack',correlation:{attackMessageId:'message'},profile:{actorId:'own',context:{tokenId:'token'},damage:{nativeSafe:true,variantId:variant,rules:{}}}};
  const source={id:'message',visible:true,isContentVisible:true,blind:false,whisper:[],flags:{'olegurps-qol':{shotSnapshot:shot}}};
  const actor={isOwner:true,flags:{},getFlag(_s,k){return this.flags[k];},async setFlag(_s,k,v){this.flags[k]=structuredClone(v);}};
  const runtime={game:{user:{id:'player',isGM:false},actors:new Map([['own',actor]])}};
  return {shot,source,actor,runtime,resolved:{shot,source,messageId:'message'}};
}
test('OWNER local F2/F3/F4 calculations need no GM, never read foreign hearing, require exact visible shot',()=>{
  const f=ownShot('ht_duplex');assert.equal(calculateF2(f.resolved,'ht_duplex:elements',{},f.runtime).status,'manual');
  f.shot.profile.damage.variantId='ht_illumination';f.shot.profile.damage.rules.environment={source:{kind:'user',note:'Own design'}};
  assert.equal(calculateF3(f.resolved,'ht_illumination:vision',{areaConfirmed:true,activeConfirmed:true,penalty:-4},f.runtime).status,'resolved');
  f.shot.profile.damage.variantId='ht_subsonic_rifle';f.runtime.game.actors.set('listener',{isOwner:false,get system(){throw Error('Hidden hearing');}});
  assert.equal(calculateF4(f.resolved,'ht_subsonic_rifle:hearing',{listener:'listener',distance:10},f.runtime).status,'unresolved');
  f.runtime.game.actors.set('listener',{isOwner:true,system:{hearing:13}});
  assert.equal(calculateF4(f.resolved,'ht_subsonic_rifle:hearing',{listener:'listener',distance:10,distanceModifier:0,otherModifier:0,suppressor:0,included:false},f.runtime).values.target,11);
  const copy=structuredClone(f.shot);copy.attackId='forged';assert.equal(canManageAmmunitionShot({...f.resolved,shot:copy},f.runtime),false);
  f.actor.isOwner=false;assert.equal(canManageAmmunitionShot(f.resolved,f.runtime),false);
  f.source.isContentVisible=false;assert.equal(canManageAmmunitionShot({source:f.source,get shot(){throw Error('Hidden snapshot');}},f.runtime),false);
});
test('OWNER tracer stores in own Actor, does not require Combatant writes, stale marker cannot hide a valid GM marker',async()=>{
  const f=ownShot('ht_tracer');let gmMarker;
  const combatant={id:'combatant',actorId:'own',tokenId:'token',getFlag:()=>gmMarker,setFlag:async()=>{throw Error('CombatantWriteForbidden');}};
  f.runtime.game.combat={id:'combat',started:true,round:3,turn:0,turns:[combatant]};
  f.shot.profile.context.f4={combat:captureF4Combat('own','token',f.runtime)};
  assert.equal(await confirmTracer(f.resolved,true,f.runtime),true);assert.equal(await confirmTracer(f.resolved,true,f.runtime),false);
  f.runtime.game.combat.round=4;assert.equal(tracerBonus('own','token',f.runtime),1);
  gmMarker={...structuredClone(f.actor.flags.tracerNextTurn),round:5,originRound:4};f.runtime.game.combat.round=5;
  assert.equal(tracerBonus('own','token',f.runtime),1);f.runtime.game.combat.round=6;assert.equal(tracerBonus('own','token',f.runtime),0);
});
test('OWNER manual guided launch keeps confirmation and one physical rocket',async()=>{
  const fx=await fixture('WLtxCaJ16zBNXOM6B'),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);assert.ok(base);
  await load(fx,base,1);const original=fx.profile();assert.equal(original.damage.nativeSafe,true);assert.equal(original.damage.rules.manualGuidance.required,true);
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:'missing-guide',prepare:()=>({profile:original,amount:1}),execute:async()=>({rolled:true})}),/навед/);
  const profile=structuredClone(original);profile.context.manualGuidanceConfirmed=true;const total=fx.weapon().totalAmmo;
  const done=await fx.service.executeShot({weaponId:fx.carrier.id,attackId:'owner-guide',prepare:()=>({profile,amount:1}),execute:async()=>({rolled:true,message:{id:'owner-missile',setFlag:async()=>{}}})});
  assert.equal(done.spent,1);assert.equal(fx.weapon().totalAmmo,total-1);
});
test('foreign Actor forbidden, invalid numbers/caliber and second energy resource remain blocked',async()=>{
  const fx=await fixture(ak),base=fx.candidates().find(t=>!t.recipe),type=custom(base,'ht_apex');fx.actor.isOwner=false;
  await assert.rejects(fx.transaction('save-recipe',{type}),/Permission/);await assert.rejects(setAmmunitionApproval({actor:fx.actor,weapon:fx.weapon(),type,active:true}),/Permission/);
  assert.equal(calculateExplosiveRecipe('ht_apex',{...parameters(),explosiveMassG:9}).status,'unresolved');
  const paint=await fixture('Wg_f0E5hqv6o1C0Uj');await assert.rejects(paint.transaction('add-stock',{ammoKey:'x',amount:1}),/TypeUnavailable/);
  const state=paint.state();state.weapons[0].paintBattery.charge=0;await paint.actor.setFlag('world','gurpsAmmoManager',state);
  await assert.rejects(paint.service.executeShot({weaponId:paint.carrier.id,attackId:'zero-power',prepare:()=>({amount:1,profile:paint.profile()}),execute:()=>assert.fail('must not execute')}),/Батарея разряжена/);
});
test('legacy decisions read without writes; old policy/revocation does not gate a complete profile',async()=>{
  const fx=await fixture(ak),base=fx.candidates().find(t=>!t.recipe),type=custom(base,'ht_apex'),scope={actor:fx.actor,actorId:fx.actor.id,weaponId:fx.carrier.id,modeId:ak,type};
  const legacy={[approvalKey(scope)]:{active:false,actorId:fx.actor.id,weaponId:fx.carrier.id,modeId:ak,ammoId:type.ammoId,variantId:'ht_apex',recipeId:type.recipe.customId,fingerprint:recipeFingerprint(type)}};
  const runtime={game:{settings:{get:()=>legacy},actors:game.actors}};assert.equal(readAmmunitionApproval(scope,runtime).active,false);
  const p=automatic.prepare({modeId:ak,base,variantId:'ht_apex'});assert.equal(p.state,'complete');assert.equal(automatic.admission(p,{policy:'strict',approval:legacy[approvalKey(scope)]}).allowed,true);
  assert.equal(fx.actor.getFlag('olegurps-qol','ammunitionDecisions'),undefined);
});
