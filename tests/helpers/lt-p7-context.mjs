import fs from 'node:fs/promises';
import {CatalogService} from '../../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../../scripts/ammunition-compatibility-service.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../../scripts/tools/ammo-inventory.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
export const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
export const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
export async function p7Fixture(modeId,{bow=null,personal=null}={}){
 const actor={id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{ST:{value:14},DX:{value:20},IQ:{value:20}},skills:{bow:{name:'Bow',level:20,points:4},crossbow:{name:'Crossbow',level:20,points:4}}},getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};
 const definitions=new StandaloneWeaponService(actor,catalogs),draft=new StandaloneWeaponDraft({actor,catalogs,type:'ranged'});draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);draft.modeIds=new Set([modeId]);if(bow)draft.ltBow=bow;
 const record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);if(personal)weapon.ltPersonal=personal;
 await actor.setFlag('world','gurpsAmmoManager',{weapons:[weapon],attackOverrides:{},shotReceipts:{}});
 const service=new AmmoService(actor),state=()=>actor.getFlag('world','gurpsAmmoManager'),current=()=>state().weapons[0],attack=()=>readStandaloneAttack(actor,record.id,modeId);
 const type=(ammoId,parameters={})=>{const t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:catalogs.getAmmoItem('lt',ammoId).name,recipe:{version:1,variantId:'lt_personal_load',customId:crypto.randomUUID(),parameters}};t.key=ammoTypeKey(t);return t;};
 const tx=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>t?[t]:[]});
 const profile=(s=state(),ammunition=readAttackAmmunition(s.weapons[0]))=>resolver.resolve({actor,actorId:actor.id,weaponId:weapon.id,attack:attack(),state:s,ammunition,binding:standaloneCatalogBinding(attack(),catalogs),context:{physicalDistance:1,physicalShots:1}});
 const shoot=(id=crypto.randomUUID(),execute=async()=>({rolled:true,messageId:'contract-'+id,rollData:{rtotal:10,finaltarget:20,failure:false,margin:10}}))=>service.executeShot({weaponId:weapon.id,attackId:id,prepare:({state,ammunition})=>({profile:profile(state,ammunition),amount:1}),execute});
 return {actor,record,weapon,definitions,service,state,current,attack,type,tx,profile,shoot};
}
