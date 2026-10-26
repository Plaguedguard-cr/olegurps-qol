// Read-only catalogue/service probe. No Foundry connection or document writes.
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';
import {LT_BOW_PROFILES} from '../scripts/lt-bow-source.js';
import {LT_PERSONAL_PROFILES} from '../scripts/lt-personal-source.js';
import {LT_EARLY_PROFILES} from '../scripts/lt-early-firearms-source.js';
import {LT_ARTILLERY_PROFILES} from '../scripts/lt-artillery-source.js';
import {LT_FLAME_PROFILES} from '../scripts/lt-flame-source.js';
import {LT_CROSSBOW_UTILITY_PROFILES} from '../scripts/lt-crossbow-utility-source.js';

globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'p7-owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
const compatibility=new AmmunitionCompatibilityService(catalogs);
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
const historical=JSON.parse(await fs.readFile(new URL('../tests/fixtures/lt-p7-historical-contract.json',import.meta.url),'utf8'));
const output={modes:[],newModes:[],relations:[],queries:[],catalogPhysicalLinks:[],catalogAmmoItems:[]};
for(const row of historical.modes){
 const mode=catalogs.getMode(row.modeId),equipment=catalogs.getEquipmentForMode(row.modeId);
 const actor={id:'p7-'+row.modeId,isOwner:true,flags:{},system:{attributes:{DX:{value:20},IQ:{value:20},ST:{value:14}},skills:{}},
  getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};
 for(const skill of [...(mode.defaults??[]).filter(s=>s.type==='skill'),mode.governing_skill?.skill].filter(Boolean))actor.system.skills[skill.name+(skill.specialization??'')]={name:skill.name+(/^(Guns|Gunner|Artillery|Liquid Projector)$/.test(skill.name)?'/TL'+equipment.tech_level:'')+(skill.specialization?' ('+skill.specialization+')':''),level:20,points:4};
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor});draft.selectModel(row.equipmentId);draft.modeIds=new Set([row.modeId]);
 if(LT_BOW_PROFILES[row.modeId])draft.ltBow={ratedST:LT_BOW_PROFILES[row.modeId].kind==='steel'?24:14};
 try{
  const record=await new StandaloneWeaponService(actor,catalogs).save(draft),weapon=standaloneAmmoCarrier(record),attack=readStandaloneAttack(actor,record.id,row.modeId);
  const attributeDefault=resolveStandaloneSkill({actor:{...actor,system:{...actor.system,skills:{}}},record,mode:record.modes.find(m=>m.modeId===row.modeId)});
  output.modes.push({modeId:row.modeId,equipmentId:equipment.equipment_id,name:equipment.name,usage:mode.usage,stats:mode.stats,skill:mode.governing_skill,defaults:mode.defaults,attributeDefault,contracts:{ranged:mode.lt_ranged_contract,bow:mode.lt_bow_contract,personal:mode.lt_personal_contract,early:mode.lt_early_contract,artillery:mode.lt_artillery_contract,flame:mode.lt_flame_contract},editor:record,attack,capacity:weapon.capacity,stage:LT_BOW_PROFILES[row.modeId]?'P2':LT_PERSONAL_PROFILES[row.modeId]?'P3':LT_ARTILLERY_PROFILES[row.modeId]?'P5':LT_FLAME_PROFILES[row.modeId]?'P6':LT_EARLY_PROFILES[row.modeId]?'P4':'DEFERRED'});
 }catch(error){output.modes.push({modeId:row.modeId,stats:mode.stats,error:error.message});}
}
for(const row of historical.physicalRelations)output.relations.push({...row,current:compatibility.checkCompatibility(row.modeId,row.ammoId,{book:'lt',kind:'ammo-item'}),family:compatibility.checkCompatibility(row.modeId,row.familyId,{book:'lt',kind:'ammo-family'})});
for(const row of historical.queries)output.queries.push({...row,current:compatibility.checkCompatibility(row.modeId,row.optionId,{book:'lt',kind:'projectile-option'})});
const originalIds=new Set(historical.modes.map(r=>r.modeId));
for(const p of [...Object.values(LT_PERSONAL_PROFILES),...Object.values(LT_CROSSBOW_UTILITY_PROFILES)])if(!originalIds.has(p.modeId)){
 const mode=catalogs.getMode(p.modeId),equipment=catalogs.getEquipmentForMode(p.modeId);
 output.newModes.push({modeId:p.modeId,equipmentId:equipment.equipment_id,name:p.name,source:p.source,parentModeId:p.parentModeId??p.template??null,stats:mode.stats,skill:mode.governing_skill,defaults:mode.defaults,contract:p,ammoIds:mode.lt_ammo_item_ids,stage:p.modeId.startsWith('WLTP7')?'P7':'P3'});
}
for(const item of catalogs.getCatalog('lt').ammo_items)output.catalogAmmoItems.push({id:item.id,name:item.name,familyId:item.ammo_family_id,modeIds:item.weapon_mode_ids,variantId:item.variant_id??null,classes:item.projectile_classes,source:item.source_ref_raw??item.source_ref,tl:item.tech_level_raw??null,mass:item.weight_lb??null,price:item.price_usd??null,pricePerLb:item.price_per_lb_usd??null,priceSource:item.source_ref_price??null});
for(const item of catalogs.getCatalog('lt').ammo_items)for(const modeId of item.weapon_mode_ids??[])output.catalogPhysicalLinks.push({modeId,ammoId:item.id,familyId:item.ammo_family_id,current:compatibility.checkCompatibility(modeId,item.id,{book:'lt',kind:'ammo-item'})});
await fs.writeFile(process.argv[2],JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({modes:output.modes.length,errors:output.modes.filter(m=>m.error),relations:output.relations.length,queries:output.queries.length,catalogLinks:output.catalogPhysicalLinks.length}));
