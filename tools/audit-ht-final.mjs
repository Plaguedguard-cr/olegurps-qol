import { readArchivedJSON, archiveOutputPath } from './local-document-archive.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { catalogs, compatibility, automatic, resolver } from '../tests/fixtures/ht-special-context.mjs';
import { availableAmmoTypes } from '../scripts/tools/ammo-management-app.js';
import { applyInventoryOperation, inventoryTotal } from '../scripts/tools/ammo-inventory.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { resolveDamageShotLink } from '../scripts/tools/damage-shot-link.js';
import { currentHTPairAmmo } from '../scripts/ht-physical-ammunition-evidence.js';
import { ammunitionResourceContract } from '../scripts/tools/ammunition-resource-contract.js';

// Node integration evidence: native rolls and browser layout are deliberately NOT simulated as live evidence.
const source = await readArchivedJSON('docs/olegurps-ht-511-source-audit.json');
const ht = catalogs.getCatalog('ht');
const variants = ['cartridge_upgrades','projectile_options','projectile_upgrades','case_construction_options'].flatMap(k => ht[k]);
const special = Object.fromEntries(variants.map(v => [v.id, {id:v.id, name:v.name, offered:[], blocked:[], mechanics:'NOT_RUN'}]));
// Optional exact mode for a focused rerun after a source-specific correction.
const modeFilter = process.argv[3] ?? null;
const sourceRows = source.direct_links.filter(row => !modeFilter || row.weapon_mode_id === modeFilter);
assert(sourceRows.length, 'requested source mode absent');
const results = [], cache = new Map(), checkedTypes = new Set(), additional = [];
function fixture(modeId) {
  const m=catalogs.getMode(modeId), raw={name:catalogs.getEquipmentForMode(modeId).name, damage:m.raw_calc.damage,
    acc:m.stats.accuracy,range:m.stats.range,rof:m.stats.rate_of_fire,rcl:m.stats.recoil,st:m.stats.strength};
  const binding={status:'confirmed',binding:{confirmed:true,modeId}};
  let state={weapons:[{id:'audit-weapon',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}}]};
  const actor={id:'audit-actor',isOwner:true,system:{ranged:{mode:raw}},getFlag:(s,k)=>s==='world'&&k==='gurpsAmmoManager'?state:undefined,
    setFlag:async(s,k,v)=>{if(s==='world'&&k==='gurpsAmmoManager')state=structuredClone(v);}};
  const api={catalogs,ammunitionCompatibility:compatibility,automaticAmmunitionProfiles:automatic,weaponCatalogBindings:{analyzeMode:()=>binding}};
  return {raw,binding,actor,api,state:()=>state,weapon:()=>state.weapons[0],service:new AmmoService(actor)};
}
async function exercise(modeId,type) {
  checkedTypes.add(modeId+'|'+type.key);
  const f=fixture(modeId), w=f.weapon(), sys=JSON.stringify(f.actor.system), opts={allowedTypes:[type]};let n=0;opts.makeId=()=>`audit-mag-${++n}`;
  const checks={selection:'PASS',load:'NOT_RUN',profile:'NOT_RUN',spend:'NOT_RUN',switch:'NOT_RUN',repeatDamage:'NOT_RUN',serialization:'NOT_RUN',nativeHit:'NOT_RUN',nativeDamage:'NOT_RUN',liveFoundry:'NOT_RUN'};
  try {
    const capacity=ammunitionResourceContract(type)?.capacity??5;
    applyInventoryOperation(w,'add-stock',{ammoKey:type.key,amount:10},opts);
    applyInventoryOperation(w,'add-magazines',{capacity,amount:2},opts);
    applyInventoryOperation(w,'load',{ammoKey:type.key,magazineId:'audit-mag-1',amount:capacity},opts);
    applyInventoryOperation(w,'install',{magazineId:'audit-mag-1'}); checks.load='PASS';
    const prepare=({ammunition})=>({amount:1,profile:resolver.resolve({actorId:f.actor.id,weaponId:w.id,rawAttack:f.raw,binding:f.binding,ammunition,profilePolicy:'permissive'})});
    const result=await f.service.executeShot({weaponId:w.id,attackId:'audit-shot',prepare,execute:async ({profile})=>{
      assert.equal(profile.damage.nativeSafe,true,'UI permits a profile which is not native-safe');checks.profile='PASS';
      return {rolled:true,message:{id:'audit-message'}};
    }});
    assert.equal(result.spent,1);assert.equal(inventoryTotal(f.weapon().ammunitionInventory),9);checks.spend='PASS';
    const historical=JSON.stringify(result.snapshot);
    await f.service.inventoryTransaction(w.id,'install',{magazineId:'audit-mag-2'});
    assert.equal(inventoryTotal(f.weapon().ammunitionInventory),9);checks.switch='PASS';
    const duplicate=await new AmmoService(f.actor).executeShot({weaponId:w.id,attackId:'audit-shot',prepare:()=>{throw Error('duplicate recalculation');}});
    assert.equal(duplicate.duplicate,true);
    const source={id:'audit-message',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:JSON.parse(historical)}}};
    const damage={visible:true,isContentVisible:true,flags:{'olegurps-qol':{damageLink:{status:'linked',originatingAttackMessageId:'audit-message',attackId:'audit-shot'}}}};
    const runtime={game:{messages:new Map([[source.id,source]])}};
    for(let i=0;i<2;i++)assert.equal(resolveDamageShotLink(damage,runtime).shotSnapshot.damage.formula,result.profile.damage.formula);
    assert.equal(inventoryTotal(f.weapon().ammunitionInventory),9);checks.repeatDamage='PASS';
    assert.equal(JSON.stringify(result.snapshot),historical);assert.equal(JSON.stringify(f.actor.system),sys);checks.serialization='PASS';
    return {checks,formula:result.profile.damage.formula,effective:result.profile.effective,variant:result.profile.damage.variantId??null,status:'PASS'};
  } catch(e) {return {checks,status:'FAIL',error:e.message};}
}
for (const row of sourceRows) {
  const id=row.weapon_mode_id, current=currentHTPairAmmo(catalogs,id,row.ammo_item_id);
  if(!cache.has(id)) {const f=fixture(id);cache.set(id,availableAmmoTypes(f.actor,f.weapon(),f.api));}
  const types=cache.get(id), candidates=types.filter(t=>t.ammoId===current?.id);
  const base=candidates.find(t=>!t.recipe), compat=compatibility.checkCompatibility(id,current?.id??row.ammo_item_id,{book:'ht',kind:'ammo-item'});
  const direct={ordinal:row.ordinal,modeId:id,sourceAmmoId:row.ammo_item_id,effectiveAmmoId:current?.id??null,name:row.weapon_name,
    sourceStatus:row.status,pages:row.pages,conditions:row.conditions,sourceRecheck:'PENDING',runtimeCompatibility:compat.status,
    runtimeReasons:compat.reasons,selectable:!!base&&!base.unavailable,integration:base&&!base.unavailable?await exercise(id,base):{status:'BLOCKED',reason:base?.reason??'not offered'},liveFoundry:'NOT_RUN'};
  results.push(direct);
  for(const t of candidates.filter(t=>t.recipe)) {
    const v=special[t.recipe.variantId];if(!v)continue;
    const r={modeId:id,ammoId:t.ammoId,sourceOrdinal:row.ordinal,compatibility:t.status??t.preparation?.rulesStatus??null};
    if(t.unavailable)v.blocked.push({...r,reason:t.reason??null});
    else v.offered.push({...r,origin:t.recipe.autoProfile?.origin??null,integration:await exercise(id,t)});
  }
}
// Explicit HT178 choices and family aliases are real UI entries too. Exercise each once,
// separately from the protected list of exactly 511 native source links.
for(const [modeId,types]of cache)for(const type of types.filter(t=>!t.unavailable)) {
  if(checkedTypes.has(modeId+'|'+type.key))continue;
  const result={modeId,ammoId:type.ammoId,kind:type.kind,variant:type.recipe?.variantId??null,integration:await exercise(modeId,type)};
  additional.push(result);
}
assert.equal(results.length,sourceRows.length);assert.equal(new Set(results.map(r=>r.modeId+'|'+r.sourceAmmoId)).size,sourceRows.length);assert.equal(Object.keys(special).length,64);
if(!modeFilter)assert.equal(results.length,511);
const out=process.argv[2]??(await archiveOutputPath('ht-final-test-results.json')).replace(/[^\\/]+$/, '');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/ht-final-511-runtime-audit.json',JSON.stringify({schemaVersion:1,evidence:'node-integration; native rolls and Foundry NOT_RUN',rows:results,additionalUIChoices:additional},null,2)+'\n');
await fs.writeFile(out+'/ht-final-special-ammunition-audit.json',JSON.stringify({schemaVersion:1,evidence:'actual UI candidates; no synthetic Cartesian product',types:Object.values(special)},null,2)+'\n');
console.log(JSON.stringify({direct:results.length,additional:additional.length,additionalFailures:additional.filter(r=>r.integration.status==='FAIL'),directIntegrationFailures:results.filter(r=>r.integration.status==='FAIL').map(r=>[r.ordinal,r.integration.error]),
  sourceUnknownAllowed:results.filter(r=>r.sourceStatus===String.fromCodePoint(1053,1077,32,1091,1089,1090,1072,1085,1086,1074,1083,1077,1085,1086)&&r.selectable).map(r=>r.ordinal),
  special:Object.values(special).map(v=>({id:v.id,offered:v.offered.length,failed:v.offered.filter(r=>r.integration.status==='FAIL').length,blocked:v.blocked.length}))}));
if(results.some(r=>r.integration.status==='FAIL') || additional.some(r=>r.integration.status==='FAIL') ||
   Object.values(special).some(v=>v.offered.some(r=>r.integration.status==='FAIL'))) process.exitCode=1;
