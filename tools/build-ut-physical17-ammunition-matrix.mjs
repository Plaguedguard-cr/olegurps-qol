// Read-only source/implementation coverage for the 17 selected modes, not a new compatibility service.
import {writeFile} from 'node:fs/promises';
import {gaussFixture,catalogs,compatibility,automatic} from '../tests/helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES,physicalRangedFamilies} from '../scripts/ut-physical-ranged-source.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
const rows=[];
for(const p of Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group!=='grav')){
 const f=await gaussFixture(p.modeId,{profileContext:{physicalDistance:11}}),candidates=f.candidates(),charges=catalogs.getCatalog('ut').warheads;
 const entries=[];
 for(const family of physicalRangedFamilies(p))for(const charge of charges)for(const tl of [9,10,11,12]){
  const source=compatibility.checkCompatibility(p.modeId,charge.id,{book:'ut',kind:'warhead',availabilityTL:tl});
  const variant=charge.id==='standard_inert'?null:'ut_'+charge.id;
  const matches=candidates.filter(t=>t.ammoId===family&&(variant?t.recipe?.variantId===variant&&(t.recipe.parameters?.availabilityTL==null||t.recipe.parameters.availabilityTL===tl):!t.recipe));
  const available=matches.filter(t=>!t.unavailable);
  let guided=null;
  if(p.group==='gyroc'&&family==='15mm_micromissile'){
   const base={source:'catalog',book:'ut',kind:'ammo-family',ammoId:family};
   const prepared=automatic.prepare({modeId:p.modeId,base,variantId:'ut_homing',parameters:{availabilityTL:tl,homingGuidance:'infrared',warheadVariant:variant}});
   if(prepared.state==='complete'){
    const effect=resolveAmmunitionEffects({raw:f.attack().data,variantId:'ut_homing',baseStatus:prepared.baseStatus,constructionStatus:prepared.rulesStatus,facts:prepared.facts});
    if(effect.nativeSafe)guided={sensor:'infrared',formula:effect.formula,componentRoles:effect.components.map(c=>c.role)};
   }
  }
  const sensorFitUndetermined=family==='15mm_micromissile'&&charge.id==='shotshell';
  const deferred=p.group==='plb'&&p.modeId!=='WIijXG9uGZ52T0eW2'&&matches.some(t=>t.unavailable&&t.reason?.includes('отложена'));
  const status=sensorFitUndetermined?'project-excluded':source.status==='incompatible'?'incompatible':available.length||guided?'available':deferred?'deferred-grenade':source.status==='undetermined'||sensorFitUndetermined?'source-undetermined':'technical-blocker';
  entries.push({family,warhead:charge.id,tl,sourceStatus:source.status,status,...(sensorFitUndetermined?{reason:'User project decision 2026-10-23: Micromissile + Shotshell excluded, not an official UT rule'}:{}),...(source.reasons?.length?{sourceReasons:source.reasons.map(r=>r.code)}:{}),...(status==='technical-blocker'||status==='deferred-grenade'?{reason:matches.find(t=>t.reason)?.reason??'No executable shared recipe for this source option'}:{}),...(guided?{viaHoming:guided}:{})});
 }
 rows.push({modeId:p.modeId,equipmentId:p.equipmentId,name:catalogs.getEquipment(p.equipmentId).name,group:p.group,physicalFamilies:physicalRangedFamilies(p),entries,
  sensors:candidates.filter(t=>!t.unavailable&&t.recipe?.variantId==='ut_homing').map(t=>({family:t.ammoId,sensor:t.recipe.parameters.homingGuidance,tl:t.recipe.parameters.availabilityTL,reactionless:!!t.recipe.parameters.reactionless})),
  reactionless:candidates.filter(t=>!t.unavailable&&t.recipe?.variantId==='ut_reactionless').map(t=>({tl:t.recipe.parameters.availabilityTL,projectileTL:t.projectileTL}))});
}
const counts={};for(const row of rows)for(const e of row.entries)counts[e.status]=(counts[e.status]??0)+1;
await writeFile(new URL('../data/ut-physical-ranged-17-ammunition-matrix.json',import.meta.url),JSON.stringify({date:'2026-10-23',authority:'Existing UT compatibility contract and existing shared recipe/effect resolver; UT136-146,152-159',rows,counts},null,2)+'\n','utf8');
console.log(JSON.stringify({models:rows.length,counts,blockers:rows.flatMap(r=>r.entries.filter(e=>e.status==='technical-blocker').map(e=>({modeId:r.modeId,...e})))}));
