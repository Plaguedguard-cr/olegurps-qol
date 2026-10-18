import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fixture,load,shoot,catalogs,automatic,compatibility,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {UT_ERRATA_MODES,UT_ERRATA_REVISION,UT_ERRATA_DEFINITION_ONLY,applyUTErrataMode,approvedLegacyUTRecipe} from '../scripts/ut-errata.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {StandaloneWeaponService,StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {WeaponConfigurationDraft} from '../scripts/tools/weapon-configuration.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {magazinePolicy} from '../scripts/tools/magazine-policy.js';
import {requiresUTPowerAccounting} from '../scripts/ut-source-data.js';
import {readCampaignTL} from '../scripts/tools/ammunition-tech-level.js';
import {buildUTMatrix,loadUTSourceContract,matrixURL} from '../tools/audit-ut-ammunition-completeness.mjs';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {ammoManagementHTML} from '../scripts/tools/ammo-management-app.js';
const shotgun='WRvS5pz3LMCzqQyiZ',main='WtM51JNSpOUIy3Eo1',machine='W5_0Tkbdr1S4b4Hlv',storm='W30vD5BH3t_VdkWUZ',chain='WmyROTLk0gs7lrYCE';
const stable=o=>o&&typeof o==='object'?Array.isArray(o)?o.map(stable):Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])])):o;
const canonical=o=>JSON.stringify(stable(o));
async function policy(enabled,fn){const old=game.user;game.user={...old,getFlag:(s,k)=>k==='convertDamageAddsToDice'?enabled:old.getFlag?.(s,k)};try{return await fn();}finally{game.user=old;}}
async function ready(id=shotgun,variant=null,parameters={}){
  const fx=await fixture(id),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
  const p=variant?automatic.prepare({modeId:id,base,variantId:variant,parameters}):null;
  if(p)assert.equal(p.state,'complete',variant+':'+p.reasons);
  const type=p?.type??base;if(p)await fx.transaction('save-recipe',{type});await load(fx,type,12);
  if(id===shotgun||id===main)await fx.transaction('install',{magazineId:fx.weapon().ammunitionInventory.installedId});
  return fx;
}
const corrected=[
 [machine,'stats.rate_of_fire','10'],['W3Ggl5bTeg_44b_rU','stats.accuracy','5'],
 ['WngbnzWRwLntvaRbR','raw_calc.damage','2d pi-'],['WlqvLkGz-INk0A-_o','raw_calc.damage','2d+2 pi-'],
 ['W9chB7ydzOWTAxQP0','stats.bulk','-2'],[storm,'raw_calc.damage','7d pi+'],
 ['WOMuCBSS_c_nIstvm','raw_calc.damage','6dx25 pi++'],[chain,'raw_calc.damage','9d pi+'],
 ['WPP4GGv21sVx2-CHg','raw_calc.damage','1d-1(0.2) pi-'],
 ['WAg2AcFXMlFlVMhp9','stats.accuracy','18'],['Wkj-hXVqccdySMffW','stats.accuracy','18'],
 ['WdZSw5CqcSq_d3eSV','stats.accuracy','7'],['WdZSw5CqcSq_d3eSV','caliber_hint','10mm'],
 ['WdV0VzMAch5j8pxdy','raw_calc.damage','6dx25(3) pi++'],['WegCPnwG-HS41cU29','raw_calc.damage','6d+2(3) pi-']
];
for(const [id,path,expected]of corrected)test('approved UT errata '+id+'/'+path,()=>{
  assert.equal(path.split('.').reduce((v,k)=>v[k],catalogs.getMode(id)),expected);
});
test('already-correct UT117 rifle TL, Electrolaser and Stun Wand definitions remain correct',()=>{
  for(const name of ['Rainbow Laser Rifle','Rainbow Laser Carbine','Rainbow Survival Laser'])assert.equal(catalogs.getCatalog('weapons').equipment.find(e=>e.name===name).tech_level,'11');
  assert.equal(catalogs.getMode('WX_LmRHi1yv6wEKcu').raw_calc.damage,'HT-4 (2) aff');
  assert.equal(catalogs.getMode('wlS0B4WAeFSbjpx1U').raw_calc.damage,'HT-5(0.5) aff');
});
test('source UAW row retains its own Acc, Range, RoF, Rcl and Shots; no Underbarrel substitution',async()=>{
  const fx=await fixture(shotgun),raw=fx.attack().data;assert.equal(raw.damage,'4d+4 pi++');
  assert.deepEqual([raw.acc,raw.range,raw.rof,raw.rcl,raw.shots],['2','100/500','2','1','5+1(3i)']);assert.equal(magazinePolicy(fx.weapon()).limit,5);
  assert.equal(catalogs.getMode('WkudgdqO3lymAYks5').stats.recoil,'4');
});
for(const enabled of [false,true])test('UAW base and Shotshell use source before B269 '+enabled,async()=>policy(enabled,async()=>{
  const fx=await ready(),expected=enabled?'5d pi++':'4d+4 pi++';assert.equal(fx.profile().damage.formula,expected);
  const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),existing:fx.weapon(),catalogs,attacks:[]});assert.equal(draft.previewStats(shotgun).stats.damage,'4d+4 pi++');assert.equal(draft.previewStats(shotgun).resolvedDamage,expected);
  const result=await shoot(fx);assert.equal(result.snapshot.profile.damage.formula,expected);const saved=JSON.stringify(result.snapshot);
  const id=fx.weapon().ammunitionInventory.installedId;await fx.transaction('unload',{magazineId:id,amount:fx.weapon().magazines[0]});
  const p=automatic.prepare({modeId:shotgun,base:fx.candidates().find(t=>!t.recipe),variantId:'ut_shotshell'});await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
  let overlay=fx.attack();for(let i=0;i<4;i++){overlay=withRuntimeAmmoStats(overlay,fx.actor);assert.equal(overlay.data.damage,'1d+1 pi');assert.equal(overlay.rof,'2x9');}
  const profile=fx.profile();assert.deepEqual([profile.damage.formula,profile.effective.range,profile.effective.rof,profile.effective.rcl,profile.effective.shots],['1d+1 pi','50/250','2x9',1,'5+1(3i)']);
  assert.equal(profile.raw.damage,'4d+4 pi++');assert.equal(profile.damage.rules.projectiles.count,9);
  const shots=await shoot(fx,2);assert.equal(shots.spent,2);assert.equal(shots.snapshot.spent,2);assert.equal(shots.rollData.rof,'18');assert.equal(shots.snapshot.profile.damage.formula,'1d+1 pi');assert.equal(JSON.stringify(result.snapshot),saved);
  const after=JSON.stringify(fx.state());await shoot(fx,2,{attackId:shots.snapshot.attackId});assert.equal(JSON.stringify(fx.state()),after);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:overlay,mode:'weapon',fireState:{}});assert.match(app._getAttackStatsText('2x9'),/1d\+1 pi/);
}));
test('invalid custom UAW Shotshell still requires original divisible piercing profile',async()=>{
  const fx=await ready(shotgun,'ut_shotshell'),p=fx.profile();
  const bad=resolveAmmunitionEffects({raw:{...p.raw,damage:'5d pi++'},variantId:'ut_shotshell',baseStatus:'compatible',constructionStatus:'compatible',facts:fx.candidates().find(t=>t.recipe?.variantId==='ut_shotshell').recipe.autoProfile.facts});
  assert.equal(bad.nativeSafe,false);assert.equal(bad.reason,'UTShotshellOriginalRequired');
});
for(const [variant,off,on,range,secondary]of [
 ['ut_aphc','4d+4(2) pi+','5d(2) pi+','100/500',[]],
 ['ut_apds','4d+8(2) pi+','6d+1(2) pi+','150/750',[]],
 ['ut_apep','4d+4(3) pi+','5d(3) pi+','200/1000',[]],
 ['ut_aphex','4d+4(2) pi++','5d(2) pi++','100/500',['1d-1 cr ex','1d cut']],
 ['ut_he','4d+4(0.5) pi++','5d(0.5) pi++','100/500',['2d+2 cr ex','1d cut']],
 ['ut_hec','4d+4(0.5) pi++','5d(0.5) pi++','100/500',['2d+2 cr ex']]
])test('UAW '+variant+' derives all components from corrected source with physical stock/history',async()=>{
  const fx=await ready(shotgun,variant,{availabilityTL:9,note:'Custom lot'});
  await policy(false,async()=>{const p=fx.profile();assert.equal(p.damage.formula,off);assert.equal(p.effective.range,range);assert.deepEqual(p.damage.components.filter(c=>c.role!=='kinetic').map(c=>c.formula),secondary);});
  await policy(true,async()=>{const p=fx.profile();assert.equal(p.damage.formula,on);assert.deepEqual(p.damage.components.filter(c=>c.role!=='kinetic').map(c=>c.formula),secondary);
    const result=await shoot(fx),html=result.message.content;assert.equal(result.spent,1);assert.equal(result.snapshot.profile.damage.formula,on);if(fx.profile().ammunition.recipe.parameters.note)assert.match(html,/Custom lot/);assert.doesNotMatch(html,/B269|errata|Basic Set|<details[^>]*\bopen/);assert.ok(ammunitionChatData(p).lines.length<=3);});
});
test('Machine Pistol native burst spends ten physical rounds and freezes RoF10',async()=>{
  const fx=await ready(machine),before=fx.weapon().totalAmmo,result=await shoot(fx,10);assert.equal(result.spent,10);assert.equal(fx.weapon().totalAmmo,before-10);assert.equal(result.snapshot.profile.effective.rof,'10');
});
test('Storm Rifle Acc5, Heavy Pistol Bulk-2 and Ice divisor survive preview/Fire Control and prepared profile',async()=>{
  for(const [id,key,value]of [['W3Ggl5bTeg_44b_rU','acc','5'],['W9chB7ydzOWTAxQP0','bulk',-2],['WPP4GGv21sVx2-CHg','damage','1d-1(0.2) pi-']]){
    const fx=await ready(id),p=fx.profile(),a=withRuntimeAmmoStats(fx.attack(),fx.actor);if(key==='damage')assert.equal(p.damage.formula,value);else assert.equal(String(a[key]),String(value));
    const result=await shoot(fx);assert.equal(result.profile.damage.formula,p.damage.formula);
  }
});
test('7.5mm corrections feed HP/APHC/APDS type shifts without changing dice or prices',async()=>{
  for(const id of ['WngbnzWRwLntvaRbR','WlqvLkGz-INk0A-_o'])for(const [variant,type]of [['ut_hp','pi'],['ut_aphc','pi-'],['ut_apds','pi-']]){
    const fx=await ready(id,variant);assert.ok(fx.profile().damage.formula.endsWith(' '+type));assert.ok(fx.attack().data.damage.endsWith(' pi-'));
  }
});
for(const [id,variant]of [[storm,'etc'],[storm,'lp'],[chain,'lp']])test('corrected Storm type precedes '+variant+' '+id,async()=>{
  const fx=await ready(id),s=fx.state();s.weapons[0].executionRequest={variant,modeId:id};await fx.service.saveState(s);if(variant==='lp')await fx.service.setLPFireMode(fx.carrier.id,'boosted');
  const p=fx.profile();assert.ok(p.damage.formula.endsWith(' pi+'));assert.ok(p.weaponConfiguration.baseline.damage.endsWith(' pi+'));assert.equal(p.effective.shots,id===chain?'90(5)':variant==='lp'?'75+1(3)':'50+1(3)');
});
test('ETC AMR stays 6dx4, Tank/LSW/18.5mm LP and ambiguous ETC remain excluded',async()=>{
  const fx=await ready('WlstnlxI_Mm-2UJf0'),s=fx.state();s.weapons[0].executionRequest={variant:'etc',modeId:fx.carrier.standaloneModeId};await fx.service.saveState(s);assert.equal(fx.profile().damage.formula,'6dx4 pi+');
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract());for(const id of ['WOMuCBSS_c_nIstvm','W5_HQQYf_zjoG9A7J'])assert.ok(matrix.rows.filter(r=>r.modeId===id&&r.candidateId==='liquid_propellant').every(r=>r.implementation==='blocked'));
  assert.ok(matrix.rows.filter(r=>r.ammoFamilyId==='18_5mm_pc'&&r.candidateId==='liquid_propellant').every(r=>r.implementation==='excluded'&&r.implementationExcluded&&r.status==='undetermined'));
});
test('APHEX x4 cost is a separate source field; no changes to purchased lots or damage from price',async()=>{
  const fx=await ready(shotgun,'ut_aphex'),before=JSON.stringify(fx.state()),p=fx.profile();assert.equal(catalogs.getAmmoFamily('ut','18_5mm_pc').cps_usd,1.8);
  assert.equal(catalogs.getCatalog('ut').warheads.find(w=>w.id==='aphex').economics.cost_multiplier,4);assert.equal(p.damage.rules.costMultiplier,4);assert.equal(p.damage.rules.costPerShot,7.2);assert.equal(p.damage.formula,'5d(2) pi++');assert.equal(JSON.stringify(fx.state()),before);
  const types=fx.candidates(),selected=types.find(t=>t.key===fx.weapon().ammunitionInventory.magazines[0].ammoKey);assert.equal(selected.physical.costPerShot,7.2);
  const html=ammoManagementHTML(fx.weapon(),{ammoKey:selected.key,magazineId:fx.weapon().ammunitionInventory.installedId,language:'en'},types);assert.match(html,/data-ammo-physical/);assert.match(html,/\$86\.4/);assert.equal(JSON.stringify(fx.state()),before);
});
test('5.7mmCL source WPS/CPS and inventory price display use errata without a resource write',async()=>{
  const fx=await ready('WoLIvHFqsiusWgmXF'),record=catalogs.getAmmoFamily('ut','5_7mm_cl'),types=fx.candidates(),base=types.find(t=>!t.recipe&&!t.unavailable);assert.equal(record.wps_lb,0.009);assert.equal(record.cps_usd,0.18);
  assert.equal(base.physical.weightPerShotLb,0.009);assert.equal(base.physical.costPerShot,0.18);const before=JSON.stringify(fx.state());
  const html=ammoManagementHTML(fx.weapon(),{ammoKey:base.key,magazineId:fx.weapon().ammunitionInventory.installedId,language:'ru'},types);assert.match(html,/\$2\.16/);assert.match(html,/0\.108 lb/);assert.equal(JSON.stringify(fx.state()),before);
});
test('Biochemical Liquid 64mm catalog is 65 doses without inventing a supported 64mm carrier',()=>{
  assert.equal(catalogs.getCatalog('ut').warheads.find(w=>w.id==='biochemical_liquid').damage_table['64mm'].doses,65);
  const p=automatic.prepare({modeId:'WYpXdcsWIyhNVC6x3',base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'64mm_plb'},variantId:'ut_biochemical_liquid'});
  assert.notEqual(p.state,'complete');
});
for(const [id,doses]of [['WOMuCBSS_c_nIstvm',250]])test('Biochemical Liquid '+doses+' doses in catalog, recipe, concise chat and snapshot',async()=>{
  const fx=await ready(id,'ut_biochemical_liquid',{note:'Custom substance',description:'Own description',radius:{yards:17,origin:'manual',units:'yards'}}),p=fx.profile();
  assert.equal(p.damage.rules.doses,doses);const row=catalogs.getCatalog('ut').warheads.find(w=>w.id==='biochemical_liquid').damage_table[doses===65?'64mm':'100mm'];assert.equal(row.doses,doses);
  assert.match(ammunitionChatHTML(p,escapePayload),/Custom substance/);assert.ok(ammunitionChatData(p).lines.length<=3);const r=await shoot(fx);assert.equal(r.snapshot.profile.damage.rules.doses,doses);
});
test('legacy 5.7mm and biochemical auto lots retain exact keys, Note, amounts and receipts after errata',async()=>{
  for(const [id,variant,parameters={}]of [['WoLIvHFqsiusWgmXF','ut_apds'],['WOMuCBSS_c_nIstvm','ut_biochemical_liquid'],
    ['WOMuCBSS_c_nIstvm','ut_homing',{availabilityTL:9,homingGuidance:'infrared',warheadVariant:'ut_biochemical_liquid'}],
    ['WoLIvHFqsiusWgmXF','ut_homing',{availabilityTL:12,homingGuidance:'infrared',warheadVariant:'ut_apds'}]]){
    const fx=await fixture(id),base=fx.candidates().find(t=>!t.recipe),current=automatic.prepare({modeId:id,base,variantId:variant,parameters:{note:'Legacy <lot>',...parameters}});assert.equal(current.state,'complete',current.reasons);
    const old=structuredClone(current.type),facts=old.recipe.autoProfile.facts;
    if(facts.ammoId==='5_7mm_cl')Object.assign(facts,{baseCostPerShot:0.26,weightPerShotLb:0.013});else facts.doses=facts.caliberMm===64?8:16;
    if(facts.warhead?.facts){if(facts.ammoId==='5_7mm_cl')Object.assign(facts.warhead.facts,{baseCostPerShot:0.26,weightPerShotLb:0.013});else facts.warhead.facts.doses=16;}
    old.recipe.customId='auto:'+canonical(old.recipe.autoProfile);old.key=ammoTypeKey(old);
    const saved=JSON.stringify(old),prepared=automatic.prepare({modeId:id,base,variantId:variant,savedType:old});assert.equal(prepared.state,'complete',prepared.reasons);assert.equal(JSON.stringify(prepared.type),saved);
    await fx.transaction('save-recipe',{type:old});await load(fx,old);const before=JSON.stringify(fx.weapon().ammunitionInventory),profile=fx.profile();assert.equal(profile.damage.nativeSafe,true);assert.equal(JSON.stringify(fx.weapon().ammunitionInventory),before);assert.equal(profile.ammunition.ammoKey,old.key);
    const r=await shoot(fx);assert.equal(r.spent,1);assert.equal(r.snapshot.ammunition.ammoKey,old.key);assert.equal(JSON.stringify(old),saved);
    const bad=structuredClone(old.recipe);bad.autoProfile.model.rule.damageFactor=99;bad.customId='auto:'+canonical(bad.autoProfile);assert.equal(approvedLegacyUTRecipe(bad,current.type.recipe,canonical),false);
  }
});
test('saved module source copies read errata without writes and explicit overrides stay authoritative',async()=>{
  const fx=await fixture(machine),flags=fx.actor.getFlag('olegurps-qol','standaloneWeapons');const saved=flags.weapons.find(w=>w.id===fx.record.id).modes[0];saved.snapshot.stats.rate_of_fire='3';saved.overrides.rof='7';await fx.actor.setFlag('olegurps-qol','standaloneWeapons',flags);
  const before=JSON.stringify(fx.actor.getFlag('olegurps-qol','standaloneWeapons'));assert.equal(readStandaloneAttack(fx.actor,fx.record.id,machine).rof,'7');
  assert.equal(new StandaloneWeaponService(fx.actor,catalogs).get(fx.record.id).modes[0].snapshot.stats.rate_of_fire,'10');assert.equal(JSON.stringify(fx.actor.getFlag('olegurps-qol','standaloneWeapons')),before);
  const custom={weapon_mode_id:shotgun,raw_calc:{damage:'99d pi++'},stats:{damage:{base:'99d',type:'pi++'}},attack_resolution:{raw:'99d pi++'}};applyUTErrataMode(custom,{snapshot:true});assert.equal(custom.raw_calc.damage,'99d pi++');
});
test('implemented lasers and Gauss require their own resources; other Beam remains deferred',async()=>{
  const {beamProfile}=await import('../scripts/ut-beam-source.js');
  for(const id of UT_ERRATA_DEFINITION_ONLY.filter(id=>!['WdZSw5CqcSq_d3eSV','WdV0VzMAch5j8pxdy','WegCPnwG-HS41cU29'].includes(id))){assert.equal(requiresUTPowerAccounting(id),!beamProfile(id));const fx=await fixture(id);assert.ok(fx.attack().readinessReason);if(beamProfile(id))assert.match(fx.attack().readinessReason,/батар/);}
  assert.equal(requiresUTPowerAccounting('WX_LmRHi1yv6wEKcu'),true);
  for(const id of ['WdZSw5CqcSq_d3eSV','WegCPnwG-HS41cU29']){assert.equal(requiresUTPowerAccounting(id),false);const fx=await fixture(id);assert.match(fx.attack().readinessReason,/батарею/);}
  assert.equal(requiresUTPowerAccounting('WdV0VzMAch5j8pxdy'),false);
  assert.equal(catalogs.getMode('WdZSw5CqcSq_d3eSV').ammunition_profile.primary_ammo_family_id,'10mm_g');assert.equal(catalogs.getAmmoFamily('ut','10mm_g').name,'10mm');assert.notEqual(compatibility.checkCompatibility('WdZSw5CqcSq_d3eSV','10mm_clp',{book:'ut',kind:'ammo-family'}).status,'compatible');
});
test('TL policy and owner rights survive errata and do not authorize another Actor',async()=>{
  const fx=await fixture(shotgun);await fx.actor.setFlag('olegurps-qol','campaignTL',8);assert.equal(readCampaignTL(fx.actor),8);assert.ok(fx.candidates().filter(t=>!t.inventoryOnly).every(t=>t.unavailable||t.source==='test'));
  const saved=JSON.stringify(fx.state());fx.actor.isOwner=false;await assert.rejects(fx.transaction('add-magazines',{amount:1}));assert.equal(JSON.stringify(fx.state()),saved);
});
test('all 2484 source pairs reproduce with precisely the proven UAW Shotshell availability delta',async()=>{
  const contract=await loadUTSourceContract(),m=buildUTMatrix(catalogs,contract);assert.equal(m.summary.pairs,2484);assert.equal(m.summary.available,821);assert.equal(m.summary.blocked,5);assert.equal(m.summary.undetermined,5);
  assert.equal(m.source.errata,UT_ERRATA_REVISION);assert.equal(createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(m.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex'),contract.sourceStatusDigestBeforeUAW);
  assert.equal(m.rows.find(r=>r.modeId===shotgun&&r.candidateId==='shotshell').implementation,'available');assert.deepEqual(JSON.parse(await readFile(matrixURL,'utf8')),m);
  // Reconstruct only the former mechanical 1d+1 override, without changing source admission.
  const formerView=new Proxy(catalogs,{get(target,key){if(key==='getMode')return id=>{const mode=target.getMode(id);return id===shotgun?{...mode,raw_calc:{...mode.raw_calc,damage:'1d+1 pi'}}:mode;};const v=target[key];return typeof v==='function'?v.bind(target):v;}});
  const former=buildUTMatrix(formerView,contract),delta=m.rows.flatMap((row,i)=>row.implementation===former.rows[i].implementation?[]:[{configuration:row.configurationId,candidate:row.candidateId,before:former.rows[i].implementation,after:row.implementation}]);
  assert.deepEqual(delta,[{configuration:shotgun,candidate:'shotshell',before:'blocked',after:'available'}]);
});
test('registry includes 34 unique errata, explicit future entries, status and source provenance',async()=>{
  const text=await readFile(new URL('../docs/audit/ultra-tech-2007-errata.md',import.meta.url),'utf8'),rows=text.split('\n').filter(l=>/^\| E\d\d \|/.test(l));assert.equal(rows.length,34);assert.equal(new Set(rows.map(r=>r.split('|')[1].trim())).size,34);
  assert.equal(rows.filter(r=>r.includes('**not implemented**')).length,12);assert.ok(rows.every(r=>/fixed|already correct|not implemented|unresolved/.test(r)));assert.ok(rows.filter(r=>r.includes('not implemented')).every(r=>r.includes('future')));
  const agents=await readFile(new URL('../AGENTS.md',import.meta.url),'utf8');assert.ok(agents.includes('docs/audit/ultra-tech-2007-errata.md'));assert.ok(text.includes('HTTP 403'));assert.ok(text.includes('average racial IQ'));
});
