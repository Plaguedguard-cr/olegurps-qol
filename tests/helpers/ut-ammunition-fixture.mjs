import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CatalogService,CATALOG_DEFINITIONS} from '../../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../../scripts/ammunition-compatibility-service.js';
import {UT_CONVENTIONAL_MODES,UT_CONVENTIONAL_DEFERRED,UT_CONVENTIONAL_RULES,utConventionalFeed} from '../../scripts/tools/ut-conventional-ammunition.js';
import {AutomaticAmmunitionProfileService} from '../../scripts/tools/automatic-ammunition-profiles.js';
import {AttackProfileResolver,createShotSnapshot} from '../../scripts/tools/attack-profile-resolver.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../../scripts/tools/standalone-attack-service.js';
import {withRuntimeAmmoStats} from '../../scripts/tools/attack-profile-runtime.js';
import {AmmoService} from '../../scripts/tools/ammo-service.js';
import {executePreparedGgaRoll} from '../../scripts/tools/prepared-gga-roll.js';
import {resolveAmmunitionEffects} from '../../scripts/tools/ammunition-effects.js';
import {parseRateOfFire,resolveMultipleProjectileFire} from '../../scripts/tools/fire-service.js';
import {moduleText} from '../../scripts/localization.js';
import {setAttackOverride,applyAttackOverride,parseAccuracyComponents} from '../../scripts/tools/weapon-attack-overrides.js';
import {choiceGroupsHTML} from '../../scripts/tools/ammunition-choices.js';
import {ammoText} from '../../scripts/tools/ammo-management-localization.js';

globalThis.foundry={utils:{deepClone:structuredClone,randomID:()=>crypto.randomUUID()},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'gm',isGM:true},i18n:{lang:'ru',localize:k=>k},settings:{get:()=>null},messages:{contents:[]}};
const {ammunitionCandidates,availableAmmoTypes,displayedAmmoTypes,AmmoManagementApp,ammoManagementHTML}=await import('../../scripts/tools/ammo-management-app.js');
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs);
const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
const resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic};
const api=globalThis.OleGURPSQOL;

async function fixture(modeId,{host=true}={}) {
  const flags={},writes=[];
  const actor={id:crypto.randomUUID(),isOwner:true,system:{attributes:{DX:{value:13}},ranged:{},skills:{}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),
    setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);writes.push([s,k]);},
    update:async changes=>{for(const [path,v] of Object.entries(changes)){assert.ok(path.startsWith('flags.'));const [,s,k]=path.split('.');flags[s]??={};if(k.startsWith('-='))delete flags[s][k.slice(2)];else flags[s][k]=structuredClone(v);}}};
  const before=structuredClone(actor.system),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);
  if(host&&modeId==='WkudgdqO3lymAYks5'){draft.setOverride(modeId,'bulk','-5');draft.setOverride(modeId,'st','10');draft.setOverride(modeId,'acc','2+0');}
  const record=await new StandaloneWeaponService(actor,catalogs).save(draft);
  const carrier=standaloneAmmoCarrier(record);
  await actor.setFlag('world','gurpsAmmoManager',{version:10,weapons:[carrier],governingSkills:{},attackOverrides:{}});
  const service=new AmmoService(actor),state=()=>actor.getFlag('world','gurpsAmmoManager');
  const weapon=()=>state().weapons[0],attack=()=>readStandaloneAttack(actor,record.id,modeId);
  const candidates=()=>ammunitionCandidates(actor,weapon(),api);
  const transaction=(op,args)=>service.inventoryTransaction(carrier.id,op,args,{allowedTypes:w=>ammunitionCandidates(actor,w,api)});
  const profile=(context={})=>resolver.resolve({context,actorId:actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,state:state(),
    binding:standaloneCatalogBinding(attack(),catalogs),ammunition:service.readAttackAmmunition(carrier.id),profilePolicy:'permissive'});
  return {actor,before,writes,record,carrier,service,state,weapon,attack,candidates,transaction,profile};
}
async function load(fx,type,rounds=8) {
  await fx.transaction('add-stock',{ammoKey:type.key,amount:rounds});const id=fx.weapon().ammunitionInventory.installedId;
  await fx.transaction('load',{magazineId:id,ammoKey:type.key,amount:Math.min(rounds,fx.weapon().ammunitionInventory.magazines[0].capacity)});return id;
}
function nativeRuntime(actor){
  const messages=[];return {messages,runtime:{game:{user:game.user,settings:{get:()=>null}},
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},canvas:{tokens:{placeables:[]}},
    Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(_p,data)=>data.followon,
    ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async data=>{const m={...data,id:crypto.randomUUID(),
      async setFlag(s,k,v){this.flags??={};this.flags[s]??={};this.flags[s][k]=structuredClone(v);},getFlag(s,k){return this.flags?.[s]?.[k];}};messages.push(m);return m;}}}};
}
function shoot(fx,amount=1,{cancel=false,attackId=crypto.randomUUID(),effectiveSkill=13,context={}}={}){
  const {runtime}=nativeRuntime(fx.actor);
  return fx.service.executeShot({weaponId:fx.carrier.id,attackId,prepare:()=>({amount,profile:fx.profile(context)}),
    execute:cancel?async()=>({rolled:false}):({profile})=>executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,
      shotSnapshot:createShotSnapshot(profile,{attackId,resourceTiming:'after-attack'}),effectiveSkill,physicalShots:amount,
      effectiveRoF:amount*(profile.damage.rules.projectiles?.count??1),rcl:Number(profile.effective.rcl),consumeAction:false,runtime})});
}


import {UT_SPECIAL_MODES,UT_SPECIAL_RULES,reviewUTSpecial,utPayloadEditorHTML,utPayloadChatHTML} from '../../scripts/tools/ut-special-ammunition.js';
import {ammoTypeKey} from '../../scripts/tools/ammo-inventory.js';
import {utPayloadParameters} from '../../scripts/tools/ut-special-ammunition.js';
const escapePayload=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


export {fixture,load,shoot,catalogs,compatibility,automatic,resolver,api,escapePayload};
