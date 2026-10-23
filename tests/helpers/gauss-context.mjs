import { readFile } from 'node:fs/promises';
import { CatalogService } from '../../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../../scripts/ammunition-compatibility-service.js';
import { AutomaticAmmunitionProfileService } from '../../scripts/tools/automatic-ammunition-profiles.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack, standaloneCatalogBinding } from '../../scripts/tools/standalone-attack-service.js';
import { AttackProfileResolver, createShotSnapshot } from '../../scripts/tools/attack-profile-resolver.js';
import { AmmoService } from '../../scripts/tools/ammo-service.js';
import { executePreparedGgaRoll } from '../../scripts/tools/prepared-gga-roll.js';
import { batteryExpectation, weaponPowerProfile } from '../../scripts/tools/weapon-power.js';

globalThis.foundry={utils:{deepClone:structuredClone,randomID:()=>crypto.randomUUID()},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'player-owner',isGM:false},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k},messages:{contents:[]}};
const { ammunitionCandidates }=await import('../../scripts/tools/ammo-management-app.js');
export const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
export const compatibility=new AmmunitionCompatibilityService(catalogs);
export const automatic=new AutomaticAmmunitionProfileService({catalogs,compatibility});
export const api={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic};
globalThis.OleGURPSQOL=api;
export async function gaussFixture(modeId,{host=true,profileContext={},type='ranged'}={}) {
  const flags={},writes=[];
  const actor={id:crypto.randomUUID(),isOwner:true,system:{attributes:{DX:{value:18},IQ:{value:18}},skills:{},ads:{}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),setFlag:async(s,k,v)=>{if(!actor.isOwner)throw Error('OWNER');(flags[s]??={})[k]=structuredClone(v);writes.push([s,k]);}};
  const service=new AmmoService(actor),definitions=new StandaloneWeaponService(actor,catalogs),draft=new StandaloneWeaponDraft({catalogs,type,actor});
  draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);
  if(host&&['Wq7SXzV-qosc5iY1q','WX57fdTm6ELTN3VdA','W5BEH4zTOtg2ds7is','WATP5TU7jVQnEpqB0'].includes(modeId))for(const [k,v]of Object.entries({hostBulk:'-5',st:'10',acc:'7+2'}))draft.setOverride(modeId,k,v);
  const record=await definitions.save(draft);await service.loadState();
  const state=()=>actor.getFlag('world','gurpsAmmoManager'),weapon=()=>state().weapons.find(w=>w.standaloneWeaponId===record.id);
  const attack=()=>readStandaloneAttack(actor,record.id,modeId);
  const candidates=()=>ammunitionCandidates(actor,weapon(),api);
  const tx=(op,args)=>service.inventoryTransaction(weapon().id,op,args,{allowedTypes:w=>ammunitionCandidates(actor,w,api)});
  const load=async(type=candidates().find(t=>!t.recipe),amount=5)=>{
    await tx('add-stock',{ammoKey:type.key,amount});
    await tx('load',{magazineId:weapon().ammunitionInventory.installedId,ammoKey:type.key,amount:Math.min(amount,weapon().capacity)});
  };
  const battery=async(nonRechargeable=false)=>service.replaceBattery(weapon().id,{requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(weapon()),nonRechargeable});
  const profile=(options={})=>new AttackProfileResolver({catalogs,compatibility}).resolve({actorId:actor.id,weaponId:weapon().id,
    attack:attack(),rawAttack:attack().data,state:state(),binding:standaloneCatalogBinding(attack(),catalogs),
    ammunition:service.readAttackAmmunition(weapon().id),profilePolicy:'permissive',context:profileContext,...options});
  const runtime={game,canvas:{tokens:{placeables:[]}},GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
    Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(_p,data)=>data.followon,
    ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async d=>({whisper:[],blind:false,...d,id:crypto.randomUUID(),
      async setFlag(s,k,v){this.flags??={};(this.flags[s]??={})[k]=structuredClone(v);},getFlag(s,k){return this.flags?.[s]?.[k];}})}};
  const shoot=(amount=1,{attackId=crypto.randomUUID(),execute=null,cancel=false}={})=>service.executeShot({weaponId:weapon().id,attackId,
    prepare:()=>({amount,profile:profile()}),execute:execute??(cancel?async()=>({rolled:false}):({profile:p})=>executePreparedGgaRoll({
      actor,attack:attack(),attackProfile:p,shotSnapshot:createShotSnapshot(p,{attackId}),effectiveSkill:14,physicalShots:amount,
      effectiveRoF:amount*(p.damage.rules.projectiles?.count??1),rcl:Number(p.effective.rcl),consumeAction:false,runtime}))});
  return {actor,flags,writes,service,definitions,record,draft,state,weapon,attack,candidates,tx,load,battery,profile,shoot,
    power:()=>weaponPowerProfile(weapon())};
}
