import {normalizeDamageDiceAdds} from '../scripts/tools/damage-dice-adds.js';
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
globalThis.game={user:{id:'gm',isGM:true},i18n:{lang:'ru',localize:k=>k},settings:{get:()=>null},messages:{contents:[]}};
const {ammunitionCandidates,availableAmmoTypes,displayedAmmoTypes}=await import('../scripts/tools/ammo-management-app.js');
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
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
  const profile=()=>resolver.resolve({actorId:actor.id,weaponId:carrier.id,attack:attack(),rawAttack:attack().data,state:state(),
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
function shoot(fx,amount=1,{cancel=false,attackId=crypto.randomUUID()}={}){
  const {runtime}=nativeRuntime(fx.actor);
  return fx.service.executeShot({weaponId:fx.carrier.id,attackId,prepare:()=>({amount,profile:fx.profile()}),
    execute:cancel?async()=>({rolled:false}):({profile})=>executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,
      shotSnapshot:createShotSnapshot(profile,{attackId,resourceTiming:'after-attack'}),effectiveSkill:13,physicalShots:amount,
      effectiveRoF:amount*(profile.damage.rules.projectiles?.count??1),rcl:Number(profile.effective.rcl),consumeAction:false,runtime})});
}

for(const [modeId,family] of Object.entries(UT_CONVENTIONAL_MODES)) {
  test('UT base stock/load/native attack: '+modeId,async()=>{
    const fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
    assert.equal(base.ammoId,family);assert.equal(base.kind,'ammo-family');assert.equal(base.physical.costPerShot,catalogs.getAmmoFamily('ut',family).cps_usd);
    for(const wrong of Object.values(UT_CONVENTIONAL_MODES).filter(f=>f!==family))assert.notEqual(compatibility.checkCompatibility(modeId,wrong,{book:'ut',kind:'ammo-family'}).status,'compatible');
    await load(fx,base);const before=fx.weapon().totalAmmo,result=await shoot(fx);
    assert.equal(result.rolled,true);assert.equal(result.spent,1);assert.equal(fx.weapon().totalAmmo,before-1);
    assert.equal(result.snapshot.profile.effective.damage,normalizeDamageDiceAdds(fx.attack().data.damage));assert.deepEqual(fx.actor.system,fx.before);
    assert.deepEqual(result.message.getFlag('olegurps-qol','shotSnapshot'),result.snapshot);
    assert.equal(result.snapshot.correlation.attackMessageId,result.message.id);
    assert.equal(result.snapshot.spent,1);
    assert.equal(result.snapshot.ammunition.sourceEdition,'Ultra-Tech 2007');
    assert.equal(result.snapshot.profile.damage.rules.costPerShot,base.physical.costPerShot);
  });
  for(const variantId of ['ut_aphc','ut_apds','ut_apep','ut_hp','ut_shotshell'])test('UT '+variantId+' exact rules: '+modeId,async()=>{
    const fx=await fixture(modeId),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable);
    const rule=UT_CONVENTIONAL_RULES[variantId],expected=compatibility.checkCompatibility(modeId,rule.id,{book:'ut',kind:'warhead',availabilityTL:9});
    const type=fx.candidates().find(t=>t.recipe?.variantId===variantId&&!t.unavailable);
    if(expected.status!=='compatible'){assert.equal(type,undefined);return;}
    assert.ok(type);assert.equal(type.recipe.autoProfile.source.edition,'Ultra-Tech 2007');await load(fx,type);
    const profile=fx.profile(),raw=fx.attack().data;assert.equal(profile.damage.nativeSafe,true);
    assert.equal(profile.damage.rules.costPerShot,base.physical.costPerShot*rule.costFactor);
    assert.equal(profile.damage.rules.weightPerShotLb,base.physical.weightPerShotLb);
    assert.equal(profile.damage.rules.legalityClass,rule.lc);
    assert.ok(profile.transformations.filter(t=>t.applied).every(t=>!String(t.source).startsWith('HT')));
    if(variantId==='ut_apds'){
      const p=raw.damage.match(/^(\d+)d(?:([+-]\d+))?(?:x(\d+))?/),adds=Number(p[2]??0)+Number(p[1]);
      const beforeB269=profile.damage.transformations.find(t=>t.effectId==='damage-dice-adds')?.from??profile.effective.damage;
      assert.ok(beforeB269.startsWith(p[1]+'d+'+adds));assert.equal(profile.effective.damage,profile.diceAdds.eligible?normalizeDamageDiceAdds(beforeB269):beforeB269);
    }
    const result=await shoot(fx);assert.equal(result.spent,1);assert.equal(result.snapshot.profile.ammunition.recipe.variantId,variantId);
    assert.deepEqual(profile.raw,raw);assert.deepEqual(fx.actor.system,fx.before);
    const old=JSON.stringify(result.snapshot),after=fx.weapon().totalAmmo;
    if(fx.weapon().magazines[0])await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.installedId,amount:fx.weapon().magazines[0]});
    await load(fx,base,2);assert.equal(fx.profile().effective.damage,normalizeDamageDiceAdds(raw.damage));assert.equal(JSON.stringify(result.snapshot),old);
    assert.ok(after>=0);assert.equal(JSON.parse(JSON.stringify(result.snapshot)).profile.effective.damage,result.snapshot.profile.effective.damage);
  });
}
test('shotshell uses 9 pellets, B409 and physical shells for full/partial/cancelled/repeated shots',async()=>{
  const fx=await fixture('WwK7xKN4sLQXIuQ64'),type=fx.candidates().find(t=>t.recipe?.variantId==='ut_shotshell');await load(fx,type,12);
  const profile=fx.profile();assert.equal(profile.effective.damage,'1d+1 pi');assert.equal(profile.effective.range,'50/250');assert.equal(profile.effective.rof,'10x9');assert.equal(profile.effective.rcl,1);
  const overlay=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.equal(overlay.rof,'10x9');
  assert.equal(parseRateOfFire(overlay.rof).projectileMultiplier,9);
  const hits=resolveMultipleProjectileFire({rof:overlay.rof,physicalShots:2,physicalDistance:20,halfDamageRange:50});assert.equal(hits.effectiveRoF,18);
  const close=resolveMultipleProjectileFire({rof:overlay.rof,physicalShots:2,physicalDistance:4,halfDamageRange:50});
  assert.equal(close.effectiveRoF,2);assert.equal(close.closeDamageMultiplier,4);
  const edge=resolveMultipleProjectileFire({rof:overlay.rof,physicalShots:2,physicalDistance:5,halfDamageRange:50});assert.equal(edge.effectiveRoF,18);
  const cancelled=await shoot(fx,2,{cancel:true});assert.equal(cancelled.rolled,false);assert.equal(fx.weapon().totalAmmo,12);
  const id=crypto.randomUUID(),first=await shoot(fx,10,{attackId:id});assert.equal(first.spent,10);assert.equal(fx.weapon().totalAmmo,2);
  const duplicate=await shoot(fx,10,{attackId:id});assert.equal(duplicate.duplicate,true);assert.equal(fx.weapon().totalAmmo,2);
  const second=await shoot(fx,1);assert.equal(second.spent,1);assert.equal(fx.weapon().totalAmmo,1);
  assert.equal(first.snapshot.profile.context?.physicalShots??10,10);
});
for(const [id,reason] of Object.entries(UT_CONVENTIONAL_DEFERRED))test('deferred platform cannot load or attack even with existing stock: '+id,async()=>{
  const fx=await fixture(id);assert.equal(availableAmmoTypes(fx.actor,fx.weapon(),api).length,0);
  const before=fx.state();await assert.rejects(fx.transaction('add-stock',{type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'7mm_cl'},amount:10}),new RegExp(reason));
  assert.deepEqual(fx.state(),before);await assert.rejects(shoot(fx),new RegExp(reason));assert.deepEqual(fx.state(),before);
});
test('Underbarrel Shots 5+1(3i), explicit host and old storage preserved',async()=>{
  const fx=await fixture('WkudgdqO3lymAYks5',{host:false});assert.match(fx.attack().readinessReason,/Bulk/);
  assert.equal(fx.candidates().filter(t=>!t.unavailable).length,0);
  assert.equal(fx.carrier.ammunitionInventory.magazines[0].capacity,6);
  assert.deepEqual(utConventionalFeed('WkudgdqO3lymAYks5','5+1(3i)'),fx.carrier.ammunitionInventory.magazines[0].sourceFeed);
  assert.equal(fx.carrier.ammunitionInventory.magazines[0].sourceFeed.magazineCapacity,5);
  assert.equal(fx.carrier.ammunitionInventory.magazines[0].sourceFeed.individualReload,true);
  const good=await fixture('WkudgdqO3lymAYks5');assert.equal(good.attack().readinessReason,null);assert.equal(good.attack().data.shots,'5+1(3i)');
});
test('UT rejects HT recipe leakage, transformed sources and malformed custom shotshell; original retained',()=>{
  const raw={damage:'6d pi',range:'700/4000',rof:'15',rcl:'2'},facts={sourceEdition:'Ultra-Tech 2007',modeId:'WFc8O-LgWxenUseNy',ammoId:'7mm_cl',caliberMm:7};
  const resolve=(extra={})=>resolveAmmunitionEffects({raw,variantId:'ut_apds',facts,baseStatus:'compatible',constructionStatus:'compatible',...extra});
  assert.equal(resolve().formula,'6d+6(2) pi-');assert.equal(resolve().effectiveChanges.range,'1050/6000');
  assert.equal(resolve({previousTransformations:[{effectId:'ut_apds',applied:true}]}).nativeSafe,false);
  assert.equal(resolve({raw:{...raw,damage:'6d(2) pi-'}}).nativeSafe,false);
  assert.equal(resolve({facts:{...facts,sourceEdition:'High-Tech'}}).nativeSafe,false);
  assert.equal(resolve({variantId:'ut_shotshell',raw:{...raw,damage:'5d pi++'}}).nativeSafe,false);
  assert.equal(raw.damage,'6d pi');
});
test('magazine switch/reload/delete is one preserved ledger and historical unavailable stock is visible',async()=>{
  const fx=await fixture('WFc8O-LgWxenUseNy'),base=fx.candidates().find(t=>!t.recipe),ap=fx.candidates().find(t=>t.recipe?.variantId==='ut_apds');const a=await load(fx,base,20);
  await fx.transaction('add-magazines',{amount:1,capacity:12});const b=fx.weapon().ammunitionInventory.magazines[1].id;
  await fx.transaction('add-stock',{ammoKey:ap.key,amount:12});await fx.transaction('load',{magazineId:b,ammoKey:ap.key,amount:8});
  const count=fx.weapon().totalAmmo;await fx.transaction('install',{magazineId:b});assert.equal(fx.weapon().totalAmmo,count);assert.equal(fx.profile().effective.damage,'7d+2(2) pi-');
  const shot=await shoot(fx,3),saved=JSON.stringify(shot.snapshot);await fx.transaction('install',{magazineId:a});assert.equal(fx.profile().effective.damage,'6d pi');
  const reloaded=new AmmoService(fx.actor);assert.equal(reloaded.readAttackAmmunition(fx.carrier.id).type.key,base.key);assert.equal(JSON.stringify(shot.snapshot),saved);
  await fx.transaction('delete-magazine',{magazineId:b});assert.equal(fx.weapon().totalAmmo,count-3);assert.equal(fx.weapon().ammunitionInventory.stocks.find(s=>s.key===ap.key).rounds,9);
  const state=fx.state(),stock={key:'ut:ammo-family:3mm_n',type:{key:'ut:ammo-family:3mm_n',source:'catalog',book:'ut',kind:'ammo-family',ammoId:'3mm_n',name:'3mmN'},rounds:4};state.weapons[0].ammunitionInventory.stocks.push(stock);await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const historical=displayedAmmoTypes(fx.actor,fx.weapon(),api).find(t=>t.key===stock.key);assert.equal(historical.historical,true);assert.equal(historical.unavailable,true);
});
test('new UT reasons and labels are Russian at Foundry ru and en',async()=>{
  const fx=await fixture('WwK7xKN4sLQXIuQ64');
  for(const lang of ['ru','en']){game.i18n.lang=lang;assert.match(moduleText('OleGURPS.AttackProfile.UTMotorPowerRequired'),/[\u0400-\u04ff]/);assert.equal(ammoText('UTMotorPowerRequired'),moduleText('OleGURPS.AttackProfile.UTMotorPowerRequired'));assert.ok(fx.candidates().some(t=>t.name.endsWith('\u0414\u0440\u043e\u0431\u044c')));}
  const ru=JSON.parse(await readFile(new URL('../lang/ru.json',import.meta.url),'utf8')),en=JSON.parse(await readFile(new URL('../lang/en.json',import.meta.url),'utf8'));
  for(const k of Object.keys(ru).filter(k=>k.startsWith('OleGURPS.AttackProfile.UT')))assert.ok(en[k]);
  const html=choiceGroupsHTML(fx.candidates(),' ',s=>s);assert.match(html,/UT/);assert.equal((html.match(/<optgroup/g)??[]).length,2);
});
test('imported GCS shotgun overlays are cleared on magazine swap; native fields and overrides preserved',async()=>{
  const fx=await fixture('WwK7xKN4sLQXIuQ64'),source={uuid:'gga-ut-shotgun',name:'Custom UT shotgun',damage:'4d+4 pi++',rof:'10',rcl:'4',range:'100/500',acc:'3+2',bulk:'-5',st:'11',level:13};
  fx.actor.system.ranged={0:source};const system=structuredClone(fx.actor.system),s=fx.state();
  s.weapons[0].standaloneWeaponId=undefined;s.weapons[0].standaloneModeId=undefined;s.weapons[0].attackRef={path:'system.ranged.0',uuid:source.uuid};
  const initial={...source,path:'system.ranged.0',data:source,...parseAccuracyComponents(source.acc)};
  setAttackOverride(s,initial,{skillLevel:14,acc:4,scopeBonus:3,bulk:-6,rof:'8',rcl:'5'});
  await fx.actor.setFlag('world','gurpsAmmoManager',s);
  const previous=api.weaponCatalogBindings;api.weaponCatalogBindings={analyzeMode:()=>({status:'confirmed',binding:{confirmed:true,modeId:'WwK7xKN4sLQXIuQ64',equipmentId:fx.record.source.equipmentId}})};
  try{
    const types=ammunitionCandidates(fx.actor,fx.weapon(),api),shot=types.find(t=>t.recipe?.variantId==='ut_shotshell'),base=types.find(t=>!t.recipe);
    await load(fx,shot,10);const selected=withRuntimeAmmoStats(applyAttackOverride(initial,s),fx.actor);
    assert.equal(selected.rof,'8x9');assert.equal(selected.rcl,1);assert.equal(selected.acc,4);assert.equal(selected.scopeBonus,3);
    await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.installedId,amount:10});await load(fx,base,5);
    const restored=withRuntimeAmmoStats(selected,fx.actor);assert.equal(restored.rof,'8');assert.equal(restored.rcl,'5');assert.equal(restored.scopeBonus,3);assert.equal(restored.acc,4);assert.equal(restored.data.damage,normalizeDamageDiceAdds(source.damage));
    assert.deepEqual(fx.actor.system,system);assert.deepEqual(fx.state().attackOverrides,s.attackOverrides);
    const leaked={...shot,book:'ht'};assert.equal(automatic.prepare({modeId:'WwK7xKN4sLQXIuQ64',base:leaked,variantId:'ut_shotshell'}).state,'incomplete');
  }finally{api.weaponCatalogBindings=previous;}
});
test('obsolete saved UT recipe remains historical; it never permits new loading',async()=>{
  const fx=await fixture('WFc8O-LgWxenUseNy'),t=fx.candidates().find(t=>t.recipe?.variantId==='ut_apds');
  t.recipe.autoProfile.source.edition='Unverified old source';t.recipe.customId+=':old';
  const {ammoTypeKey}=await import('../scripts/tools/ammo-inventory.js');t.key=ammoTypeKey(t);const s=fx.state();
  s.weapons[0].ammunitionInventory.stocks.push({key:t.key,type:t,rounds:3});await fx.actor.setFlag('world','gurpsAmmoManager',s);
  const historical=displayedAmmoTypes(fx.actor,fx.weapon(),api).find(x=>x.key===t.key);assert.equal(historical.historical,true);assert.equal(historical.unavailable,true);
  await assert.rejects(fx.transaction('load',{ammoKey:t.key,magazineId:fx.weapon().ammunitionInventory.installedId,amount:1}),/TypeUnavailable/);
  await fx.transaction('remove-stock',{ammoKey:t.key,amount:3});assert.equal(fx.weapon().ammunitionInventory.stocks.find(x=>x.key===t.key).rounds,0);
});
test('physical compatibility does not invent source edition or missing CPS/WPS',()=>{
  const modeId='WFc8O-LgWxenUseNy',base={book:'ut',kind:'ammo-family',ammoId:'7mm_cl',name:'7mmCL'};
  for(const bad of ['source','price','weight']){
    const incomplete={getMode:id=>catalogs.getMode(id),getAmmoFamily:(b,f)=>({...catalogs.getAmmoFamily(b,f),...(bad==='price'?{cps_usd:null}:bad==='weight'?{wps_lb:null}:{})}),
      getCatalog:b=>bad==='source'&&b==='weapons'?{...catalogs.getCatalog(b),sources:[]}:catalogs.getCatalog(b)};
    const service=new AutomaticAmmunitionProfileService({catalogs:incomplete,compatibility}),prepared=service.prepare({modeId,base,variantId:'ut_apds'});
    assert.equal(prepared.state,'incomplete');assert.equal(service.admission(prepared,{policy:'permissive',approval:{active:true}}).allowed,false);
    assert.equal(compatibility.checkCompatibility(modeId,base.ammoId,{book:'ut',kind:'ammo-family'}).status,'compatible');
  }
});
