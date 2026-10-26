import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogs,compatibility,automatic,resolver,context,api} from './fixtures/ht-special-context.mjs';
import {HT_SOURCE_REVIEW,HT_AMMO_LABELS} from '../scripts/ht-source-corrections.js';
import {correctedHTModeStatistics} from '../scripts/ht-source-corrections.js';
import {printedAccuracyZero,expectedPrintedFields} from './fixtures/ht-printed-statistics.mjs';

test('printed zero accuracy survives effective catalog and standalone selection; overrides and raw records preserved',()=>{
  for(const [id,source]of Object.entries(printedAccuracyZero)) {
    const equipment=catalogs.getEquipmentForMode(id),raw=catalogs.getCatalog('weapons').equipment.flatMap(e=>e.modes).find(m=>m.weapon_mode_id===id);
    const before=JSON.stringify(raw), effective=catalogs.getMode(id);
    for(const [field,value]of Object.entries(expectedPrintedFields(id))) {
      assert.equal(raw.stats[field],null,id+': '+field);assert.equal(effective.stats[field],value,id+': '+source);
      assert.equal(catalogs.getEquipment(equipment.equipment_id).modes.find(m=>m.weapon_mode_id===id).stats[field],value);
    }
    const override={...raw,stats:{...raw.stats,accuracy:'3',recoil:'2',bulk:'-2'}};
    assert.strictEqual(correctedHTModeStatistics(override,equipment),override);
    assert.strictEqual(correctedHTModeStatistics(raw,{...equipment,source:'UT'}),raw);
    const changed={...raw,raw_calc:{...raw.raw_calc,damage:'2d pi'}};
    assert.strictEqual(correctedHTModeStatistics(changed,equipment),changed);
    assert.equal(JSON.stringify(raw),before);
  }
});
import {availableAmmoTypes,ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
import {applyInventoryOperation,inventoryTotal,ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionResourceContract,SEALED_PLATFORM_UNITS,validateResourceShot} from '../scripts/tools/ammunition-resource-contract.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {heshSpall,sourceExplosiveDefinition,reviewExplosiveDefinition} from '../scripts/tools/explosive-attack-profiles.js';
import {moduleText} from '../scripts/localization.js';

function selected(modeId,ammoId,variantId) {
  const c=context(modeId),base={...c.base,ammoId,name:catalogs.getAmmoItem('ht',ammoId).name};
  const prepared=variantId?automatic.prepare({modeId,base,variantId}):null;
  const type=prepared?.type??base;
  const p=resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,binding:c.binding,
    ammunition:{type,ammoKey:ammoTypeKey(type)},profilePolicy:'permissive'});
  assert.equal(p.damage.nativeSafe,true,JSON.stringify(p.damage));
  assert.deepEqual(p.raw,c.raw);assert(Object.isFrozen(p));return p;
}
test('HT150 named TL5 Hale HE load is preserved without granting generic early HE',()=>{
  const modeId='Wx13jpOUxRC_YeDo6',ammoId='ht_specific_hale_9pr_he',c=context(modeId);
  assert.equal(catalogs.getRecord('weapons','modes',modeId).stats.accuracy,null);
  assert.equal(catalogs.getMode(modeId).stats.accuracy,'0');
  assert.equal(catalogs.getEquipmentForMode(modeId).modes.find(m=>m.weapon_mode_id===modeId).stats.accuracy,'0');
  const rules=compatibility.checkCompatibility(modeId,'ht_he',{book:'ht',kind:'projectile-option',ammoItemId:ammoId});
  assert.equal(rules.status,'undetermined');
  const d=sourceExplosiveDefinition(catalogs,modeId,catalogs.getAmmoItem('ht',ammoId),'ht_he');
  const option=catalogs.getVariant('ht','ht_he');
  assert.equal(reviewExplosiveDefinition(option,rules.eligibility.facts,d).status,'resolved');
  for(const changed of [{ammoId:'other'},{modeId:'other'},{sourceRawDamage:'7d cr ex'},{nativePreserved:false}])
    assert.equal(reviewExplosiveDefinition(option,rules.eligibility.facts,{...d,...changed}).status,'unresolved');
  const p=selected(modeId,ammoId);
  assert.deepEqual(p.damage.components.map(x=>x.formula),['6dx2 cr ex','3d cut']);
  assert.equal(p.damage.rules.costPerShot,55);
  assert.deepEqual(p.damage.rules.ballisticRange,{minimum:200,maximum:3400,halfDamage:null,source:'HT 150-151'});
  const types=availableAmmoTypes({binding:c.binding,system:{ranged:{mode:c.raw}}},{attackRef:{path:'system.ranged.mode'}},api);
  assert(types.some(t=>t.ammoId===ammoId&&!t.unavailable));
});

test('HT100 PMM base and published +P use their own damage, never a second pressure increase',()=>{
  for(const mode of ['W5-46vK8kU8reRK3R','WlIHeqw2f-west5fN']) {
    assert.equal(selected(mode,'ht_9x18mm_makarov').damage.formula,'2d pi');
    const p=selected(mode,'ht_9x18mm_makarov','ht_plus_p');
    assert.equal(p.damage.formula,'2d+2 pi');assert.equal(p.effective.range,'121/1320');
    assert.equal(p.damage.components[0].formula,'2d+2 pi');
  }
});
test('HT104/106 Benelli 2.75 and 3 inch are separate published charges in all seven modes',()=>{
  for(const mode of ['WcLG_XsJVbZ6CIT4p','WT-PUA77JBHLiLTPo','WmeBcFEjqKNri5FAm','W6LVJ8YGACnNB5h-S','WLp8euYFMi9Oikpjp','WH-pkGPARCbK4CP4h','W9LBQ9LeKd3uB9nSZ']){
    const a=selected(mode,'ht_12_gauge_2_75_18_5x70mmr'),b=selected(mode,'ht_12_gauge_3_18_5x76mmr');
    assert.equal(a.effective.damage,'1d+1 pi');assert.equal(a.effective.rof,'3x9');
    assert.equal(b.effective.damage,'1d+2 pi');assert.equal(b.effective.rof,'3x12');
    assert.equal(b.effective.ammunitionProjectileKind,'shot');
    assert.equal(JSON.parse(JSON.stringify(a)).effective.damage,'1d+1 pi');
  }
});
test('HT91/199 Condor stock identity distinguishes shot from explicitly selected slug in both modes',()=>{
  for(const mode of ['Wx10NaVSr1cp1bwKv','WkzlenFdgtlwesK-q']){
    const a=selected(mode,'ht_12_gauge_2_75_18_5x70mmr'),b=selected(mode,'ht_12_gauge_2_75_18_5x70mmr','ht_rifled_slug');
    assert.equal(a.effective.damage,'1d pi');assert.equal(a.effective.rof,'1x9');assert.equal(a.effective.range,'35/700');
    assert.equal(a.effective.ammunitionProjectileKind,'shot');
    assert.equal(b.effective.damage,'4d pi+');assert.equal(b.effective.rof,'1');assert.equal(String(b.effective.rcl),'10');
    const light=selected(mode,'ht_12_gauge_2_75_18_5x70mmr','ht_light_case');assert.equal(light.effective.damage,'1d pi');
  }
});
test('HT150/172 Hydra WP retains its own burning fragments, range and source cloud, not HE',()=>{
  const p=selected('WjD-b9M0j2HJAcxyy','ht_specific_hydra_70mm_wp');
  assert.deepEqual(p.damage.components.map(c=>c.formula),['5d burn ex','1d(0.2) burn']);
  assert.equal(p.effective.range,'70/3,300');
  assert.deepEqual(p.damage.rules.environment.sourceCloud,{radiusYards:19,durationSeconds:300});
  assert.equal(p.damage.rules.ballisticRange.minimum,70);
});
test('HT150/173 Hydra Beehive keeps 1179 elements per rocket and no invented burst point or B409',()=>{
  const p=selected('WjD-b9M0j2HJAcxyy','ht_specific_hydra_70mm_beehive');
  assert.equal(p.damage.formula,'2d+2 cut');assert.equal(p.effective.range,'450/7000');
  assert.equal(p.effective.rof,'7x1179');assert.equal(p.effective.ammunitionB409Eligible,false);
  assert.equal(p.damage.rules.burst.distance,null);assert.equal(p.damage.rules.burst.range.minimum,450);
  assert.deepEqual(p.damage.components.map(c=>c.formula),['2d+2 cut']);
});
test('HT178 permits one short-cartridge shot but does not promise automatic cycling',async()=>{
  const mid='W09RarXVw2-ZAi-dC',c=context(mid),{type,w,run}=unit('ht_22_short_5_6x11mmr');
  const profile=resolver.resolve({actorId:'a',weaponId:'w',rawAttack:c.raw,binding:c.binding,ammunition:{type}});
  assert.equal(profile.compatibility.status,'compatible');assert.equal(profile.damage.rules.manualCyclingRequired,true);
  run('add-stock',{ammoKey:type.key,amount:5});run('add-magazines',{capacity:5,amount:1});run('load',{ammoKey:type.key,magazineId:'m',amount:5});
  let state={weapons:[w]};const before=JSON.stringify(state),actor={id:'a',isOwner:true,getFlag:()=>state,setFlag:async(_s,_k,v)=>state=v};
  let rolled=false;await assert.rejects(new AmmoService(actor).executeShot({weaponId:'w',attackId:'two-shots',
    prepare:()=>({amount:2,profile}),execute:()=>{rolled=true;return{rolled:true};}}),/AmmunitionCyclingUnconfirmed/);
  assert.equal(rolled,false);assert.equal(JSON.stringify(state),before);
  assert.equal(selected('WT-PUA77JBHLiLTPo','ht_12_gauge_2_75_18_5x70mmr').damage.rules.manualCyclingRequired,undefined);
});

test('HT145 HAFLA minimum is not half damage; out-of-range attempt is atomic',async()=>{
  const {type,w,run}=unit('ht_specific_hafla_dm34_35mm_wp');
  run('add-stock',{ammoKey:type.key,amount:1});run('add-magazines',{capacity:1,amount:1});
  run('load',{magazineId:'m',ammoKey:type.key,amount:1});
  let state={weapons:[w]};const actor={id:'actor',isOwner:true,getFlag:()=>state,setFlag:async(_s,_k,v)=>state=v};
  const f={state:()=>state,service:new AmmoService(actor)};
  for(const distance of [2,91]) {
    const before=JSON.stringify(f.state());let rolled=false;
    await assert.rejects(f.service.executeShot({weaponId:'w',attackId:'range-'+distance,
      prepare:({ammunition})=>{const c=context('Wr3VDL3Z6SR3KCz3K');const profile=resolver.resolve({actorId:'actor',weaponId:'weapon',rawAttack:c.raw,
        binding:c.binding,ammunition,context:{shotgun:{physicalDistance:distance}}});
        assert.deepEqual(profile.damage.rules.ballisticRange,{minimum:10,maximum:90,halfDamage:null,source:catalogs.getAmmoItem('ht',c.base.ammoId).table_ref});
        return{profile,amount:1};},execute:()=>{rolled=true;return{rolled:true};}}),/OutsideAmmunitionRange/);
    assert.equal(rolled,false);assert.equal(JSON.stringify(f.state()),before);
  }
});

for(const [mid,[aid]] of Object.entries(HT_SOURCE_REVIEW))test('unresolved source identity '+mid+' blocks UI, variants and new execution without erasing stock',async()=>{
  const c=context(mid),actor={id:'source-review',isOwner:true,binding:c.binding,system:{ranged:{mode:c.raw}}};
  const w={id:'w',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
  assert.equal(compatibility.checkCompatibility(mid,aid,{book:'ht',kind:'ammo-item'}).status,'undetermined');
  const choices=availableAmmoTypes(actor,w,api);assert(!choices.some(t=>t.ammoId===aid&&!t.unavailable));
  assert.equal(compatibility.checkCompatibility(mid,'ht_ap',{book:'ht',kind:'projectile-option',ammoItemId:aid}).status,'undetermined');
  // Keep testing the historical, rejected identity after the effective source link is corrected.
  const historical={...c.base,ammoId:aid,name:catalogs.getAmmoItem('ht',aid).name};
  const type={...historical,key:ammoTypeKey(historical)};let state={weapons:[w]};
  // A pre-existing loaded stock, not a bypass in the real UI.
  applyInventoryOperation(w,'add-stock',{ammoKey:type.key,amount:2},{allowedTypes:[type]});
  applyInventoryOperation(w,'add-magazines',{capacity:2,amount:1},{makeId:()=> 'old'});
  applyInventoryOperation(w,'load',{ammoKey:type.key,magazineId:'old',amount:2},{allowedTypes:[type]});
  actor.getFlag=()=>state;actor.setFlag=async(_s,_k,v)=>state=v;const before=JSON.stringify(state);let rolled=false;
  await assert.rejects(new AmmoService(actor).executeShot({weaponId:'w',attackId:mid,prepare:({ammunition})=>({amount:1,
    profile:resolver.resolve({actorId:actor.id,weaponId:'w',rawAttack:c.raw,binding:c.binding,ammunition})}),
    execute:async()=>{rolled=true;return{rolled:true};}}),/HTIdentityUnverified/);
  assert.equal(rolled,false);assert.equal(JSON.stringify(state),before);
});
test('HT177 labels correct effective names only, keeping original records and IDs',()=>{
  for(const[id,[name]]of Object.entries(HT_AMMO_LABELS)){
    const raw=catalogs.getCatalog('ht').ammo_items.find(a=>a.id===id),corrected=catalogs.getAmmoItem('ht',id);
    assert.equal(corrected.id,id);assert.equal(corrected.name,name);assert.equal(corrected.sourceLabelCorrection.original,raw.name);
    assert.notEqual(raw.name,name);assert.equal(corrected.weight_per_shot_lb,raw.weight_per_shot_lb);
  }
  assert.equal(catalogs.getEquipment('eQ4obQuHBibDtmkbr').name,'Colt M1860 Army, .44 Caplock');
  assert.equal(catalogs.getEquipment('evF3-TuMJAg4Zbb26').name,'Kolomna 9M14M Malyutka-M, 125mm');
  assert.equal(catalogs.getEquipment('eUdNUMGliwRPJX_8G').name,'Universal Model 3000 Enforcer, .30 M1');
});
function unit(aid){const type={source:'catalog',book:'ht',kind:'ammo-item',ammoId:aid};type.key=ammoTypeKey(type);
  const w={id:'w',ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}},options={allowedTypes:[type],makeId:()=> 'm'};
  return {type,w,run:(op,args)=>applyInventoryOperation(w,op,args,options)};}
for(const aid of ['ht_specific_hafla_dm34_35mm_wp','ht_specific_m72a2_66mm_heat','ht_specific_at4_84mm_heat','ht_specific_armbrust_67mm_heat','ht_specific_rpoa_93mm_thermobaric','ht_specific_pzf3_110mm_heat'])test('one disposable unit cannot reload its spent carrier: '+aid,()=>{
  const {type,w,run}=unit(aid);run('add-stock',{ammoKey:type.key,amount:2});run('add-magazines',{capacity:1,amount:1});
  run('load',{ammoKey:type.key,magazineId:'m',amount:1});run('consume',{magazineId:'m',amount:1});
  const saved=JSON.stringify(w);assert.throws(()=>run('load',{ammoKey:type.key,magazineId:'m',amount:1}),/SealedResourceSpent/);
  assert.equal(JSON.stringify(w),saved);assert.equal(inventoryTotal(w.ammunitionInventory),1);assert.equal(w.id,'w');
  run('delete-magazine',{magazineId:'m'});assert.equal(inventoryTotal(w.ammunitionInventory),1);
});
test('HT92 P11 uses sealed five-shot clusters; partial refill/unload/delete rejected atomically',()=>{
  const {type,w,run}=unit('ht_hk_p11_7_62x36mm_underwater_dart');
  assert.throws(()=>run('add-stock',{ammoKey:type.key,amount:1}),/SealedResourceQuantity/);
  run('add-stock',{ammoKey:type.key,amount:10});run('add-magazines',{capacity:5,amount:1});
  assert.throws(()=>run('load',{ammoKey:type.key,magazineId:'m',amount:1}),/SealedResourceQuantity/);
  run('load',{ammoKey:type.key,magazineId:'m',amount:5});run('consume',{magazineId:'m',amount:1});
  for(const [op,args]of [['load',{ammoKey:type.key,magazineId:'m',amount:1}],['unload',{magazineId:'m',amount:4}],['delete-magazine',{magazineId:'m'}]]){
    const before=JSON.stringify(w);assert.throws(()=>run(op,args),/SealedResource/);assert.equal(JSON.stringify(w),before);
  }
  for(let i=0;i<4;i++){
    run('consume',{magazineId:'m',amount:1});
    assert.equal(w.ammunitionInventory.magazines[0].rounds,3-i);
    assert.equal(w.ammunitionInventory.magazines[0].sealedUsed,true);
  }
  assert.equal(inventoryTotal(w.ammunitionInventory),5);
  const spent=JSON.stringify(w);
  assert.throws(()=>run('load',{ammoKey:type.key,magazineId:'m',amount:5}),/SealedResourceSpent/);
  assert.throws(()=>run('consume',{magazineId:'m',amount:1}),/InsufficientRounds/);
  assert.equal(JSON.stringify(w),spent);
  run('delete-magazine',{magazineId:'m'});assert.equal(inventoryTotal(w.ammunitionInventory),5);
  run('add-magazines',{capacity:5,amount:1});run('load',{ammoKey:type.key,magazineId:'m',amount:5});
  assert.equal(w.ammunitionInventory.magazines[0].sealedUsed,undefined);
  assert.equal(w.ammunitionInventory.magazines[0].rounds,5);
  assert.equal(w.ammunitionInventory.stocks[0].rounds,0);
});
test('ordinary magazines still return rounds safely; labels never create a resource contract',()=>{
  const {type,w,run}=unit('ht_7_62x39mm');type.name='P11 AT4 HAFLA';assert.equal(ammunitionResourceContract(type),null);
  run('add-stock',{ammoKey:type.key,amount:3});run('add-magazines',{capacity:3,amount:1});run('load',{ammoKey:type.key,magazineId:'m',amount:2});run('delete-magazine',{magazineId:'m'});
  assert.equal(w.ammunitionInventory.stocks[0].rounds,3);
});

for(const[mid,rule]of Object.entries(SEALED_PLATFORM_UNITS))test('factory device identity, not loose ammunition: '+mid,()=>{
  const c=context(mid),actor={id:'sealed',binding:c.binding,system:{ranged:{mode:c.raw}}};
  const w={id:'w',attackRef:{path:'system.ranged.mode'},ammunitionInventory:{version:1,stocks:[],magazines:[],installedId:null}};
  const choices=availableAmmoTypes(actor,w,api),allowed=choices.filter(t=>!t.unavailable);
  assert.equal(allowed.length,1);const type=allowed[0];
  assert.equal(type.sealedPlatformModeId,mid);assert.equal(type.ammoId,rule.ammoId);assert.equal(type.key,ammoTypeKey(type));
  assert.equal(ammunitionResourceContract(type).capacity,1);
  const opts={allowedTypes:choices,makeId:()=> 'sealed'};
  applyInventoryOperation(w,'add-stock',{ammoKey:type.key,amount:2},opts);
  applyInventoryOperation(w,'add-magazines',{capacity:1,amount:1},opts);
  applyInventoryOperation(w,'load',{ammoKey:type.key,magazineId:'sealed',amount:1},opts);
  validateResourceShot(w,type,mid);
  const legacy={...type};delete legacy.sealedPlatformModeId;
  assert.throws(()=>validateResourceShot(w,legacy,mid),/SealedResourceReview/);
  assert.throws(()=>validateResourceShot(w,{...type,recipe:{variantId:'ht_ap'}},mid),/SealedResourceReview/);
  applyInventoryOperation(w,'consume',{magazineId:'sealed',amount:1},opts);
  assert.throws(()=>applyInventoryOperation(w,'load',{ammoKey:type.key,magazineId:'sealed',amount:1},opts),/SealedResourceSpent/);
  assert.equal(inventoryTotal(w.ammunitionInventory),1);
});
test('HT170 both spall and DR round upward, with book M40 example and fractional regression',()=>{
  assert.equal(heshSpall({maximumBlast:240,dr:560,laminated:false}).damage,24);
  assert.equal(heshSpall({maximumBlast:240,dr:560,laminated:false}).effectiveDR,6);
  assert.equal(heshSpall({maximumBlast:72,dr:151,laminated:false}).damage,8);
  assert.equal(heshSpall({maximumBlast:72,dr:151,laminated:true}).damage,0);
});
test('new Russian resource guidance in both Foundry locales; dictionary parity and no internal policy text',()=>{
  const ru=JSON.parse(fs.readFileSync('lang/ru.json','utf8')),en=JSON.parse(fs.readFileSync('lang/en.json','utf8'));
  for(const key of ['SealedClusterHint','DisposableTubeHint','SealedResourceSpent','HTIdentityUnverified']){
    assert(ru['OleGURPS.Ammo.'+key]);assert(en['OleGURPS.Ammo.'+key]);
  }
  const {w,type}=unit('ht_hk_p11_7_62x36mm_underwater_dart');type.label='P11';
  for(const language of ['ru','en'])assert(ammoManagementHTML(w,{language,ammoKey:type.key},[type]).includes(ru['OleGURPS.Ammo.SealedClusterHint']));
  assert.doesNotMatch(moduleText('OleGURPS.AutomaticAmmo.PlusPReliabilityGM'),/legacy|prepared|GM|policy/i);
});
