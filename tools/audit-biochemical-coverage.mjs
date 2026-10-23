import {HT_TEAR_SPRAY_MODE} from '../scripts/tools/biochemical-integration.js';
import {catalogs,compatibility,automatic} from '../tests/helpers/gauss-context.mjs';
import {baseAmmunition} from '../scripts/tools/weapon-configuration.js';
import {CHEMICAL_SUBSTANCES,chemicalAllowed} from '../scripts/tools/biochemical-catalog.js';
import {fluidProfile} from '../scripts/ut-fluid-source.js';
import {fluidCompatibility} from '../scripts/tools/ut-fluid.js';
import {ETC_PROFILES} from '../scripts/tools/ut-etc.js';
import {LP_PROFILES} from '../scripts/tools/ut-liquid-propellant.js';
import {physicalRangedProfile} from '../scripts/ut-physical-ranged-source.js';
const variants={aerosol:'ut_biochemical_aerosol',liquid:'ut_biochemical_liquid',injection:'ut_drugged_dart',ice:'ut_drugged_ice'};
export function biochemicalCoverage(){
 const rows=[],scanned=[];
 for(const e of catalogs.getCatalog('weapons').equipment.filter(e=>['UT','HT'].includes(e.source)))for(const m of e.modes.filter(m=>m.role==='attack')){
  const modeId=m.weapon_mode_id;scanned.push({name:e.name,modeId,source:e.source});
  if(fluidProfile(modeId)){
   const p=fluidProfile(modeId),delivery=p.vortex?'vortex':'spray';
   rows.push({weapon:e.name,modeId,source:e.source,physicalAmmo:'fluid-filler',delivery,execution:['ordinary'],substances:Object.values(CHEMICAL_SUBSTANCES).map(f=>({id:f.id,tl:f.tl,status:fluidCompatibility(modeId,f.id).allowed?'available':'incompatible',reason:fluidCompatibility(modeId,f.id).reason}))});continue;
  }
  if(modeId===HT_TEAR_SPRAY_MODE){rows.push({weapon:e.name,modeId,source:e.source,physicalAmmo:'ht:chemical-dose:tear',delivery:'spray',execution:['ordinary'],substances:Object.values(CHEMICAL_SUBSTANCES).map(f=>({id:f.id,tl:Math.max(7,f.tl),status:f.id==='tear'?'available':'incompatible',reason:f.id==='tear'?'HT180: existing melee spray, Reach1-2, 20 prepared charges; two native HT-2 checks':'HT180 does not establish an interchangeable UT filler in this sealed spray.'}))});continue;}
  const bases=baseAmmunition(compatibility,modeId,catalogs).filter(t=>t.kind===(e.source==='UT'?'ammo-family':'ammo-item'));
  for(const base of bases)for(const [delivery,v]of Object.entries(variants)){
   const type={source:'catalog',book:base.book,kind:base.kind,ammoId:base.ammoId,name:base.record.name},variant=e.source==='HT'?({aerosol:'ht_poison_gas',liquid:'ht_liquid',injection:'ht_poison',ice:null})[delivery]:v;
   if(!variant)continue;
   const source=compatibility.checkCompatibility(modeId,variant.replace(/^ut_/,''),{book:base.book,kind:base.book==='ut'?variant==='ut_drugged_dart'||variant==='ut_drugged_ice'?'special-load':'warhead':'projectile-option',ammoItemId:base.ammoId});
   const prepared=automatic.prepare({modeId,base:type,variantId:variant});
   const physical=physicalRangedProfile(modeId),micro=type.ammoId==='15mm_micromissile',deliveryKey=delivery==='ice'?'injection':delivery;
   const status=source.status==='incompatible'?'incompatible':prepared.state==='complete'?'available':source.status==='compatible'?'deferred':'source-undetermined';
   rows.push({weapon:e.name,modeId,source:e.source,physicalAmmo:base.ammoId,variant,delivery:deliveryKey,...(delivery==='ice'?{ice:true}:{}),execution:['ordinary',...(ETC_PROFILES[modeId]?['etc']:[]),...(LP_PROFILES[modeId]?['lp']:[])],substances:Object.values(CHEMICAL_SUBSTANCES).map(f=>{
    const fit=chemicalAllowed(f,deliveryKey);let result=fit?status:f.phase==='capsule'?'source-undetermined':'incompatible',reason=fit?(source.reasons?.map(r=>r.code).join(', ')||prepared.reasons?.join(', ')||'Exact source link and shared recipe'):f.phase==='capsule'?'UT162 requires an apple-seed-sized capsule; no verified capsule-size match for this physical ammunition.':'Substance does not support this delivery';
    if(fit&&prepared.state==='complete'){
     const p=automatic.prepare({modeId,base:type,variantId:micro?'ut_homing':variant,parameters:{chemicalId:f.id,...(micro?{availabilityTL:Math.max(9,f.tl),homingGuidance:'infrared',warheadVariant:variant}:{})}});
     if(p.state!=='complete'){result='deferred';reason=p.reasons.join(', ');}
    }
    if(micro&&result==='available')reason='Available through Homing + biochemical warhead in the shared recipe editor; direct unguided micromissile remains prohibited.';
    return {id:f.id,tl:f.tl,status:result,reason};
   })});
  }
 }
 return {scanned,rows};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/audit-biochemical-coverage.mjs')){
 const result=biochemicalCoverage(),counts={};for(const r of result.rows)for(const s of r.substances)counts[s.status]=(counts[s.status]??0)+1;
 console.log(JSON.stringify({scanned:result.scanned.length,carrierRows:result.rows.length,availableCarriers:result.rows.filter(r=>r.substances.some(s=>s.status==='available')).length,counts}));
}
