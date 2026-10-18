import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,compatibility,automatic} from './helpers/ut-ammunition-fixture.mjs';
import {normalizeDamageDiceAdds,readDamageDiceAddsPolicy,saveDamageDiceAddsPreference,applyDamageDiceAdds,DAMAGE_DICE_ADDS_FLAG} from '../scripts/tools/damage-dice-adds.js';
import {AttackProfileResolver,createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {withRuntimeAmmoStats,resolveRuntimeAttackProfile} from '../scripts/tools/attack-profile-runtime.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
import {WeaponSkillSettingsApp,registerWeaponSkillSettings} from '../scripts/tools/weapon-skill-settings-app.js';
import {lpBallistics} from '../scripts/tools/ut-liquid-propellant.js';
import {htDamageDice} from '../scripts/tools/kinetic-damage-math.js';

const magnum='WIAo1otMCstnbi4Dv',rifle='WFc8O-LgWxenUseNy',amr='WlstnlxI_Mm-2UJf0';
const user=(id,flags={})=>({id,isGM:false,getFlag:(s,k)=>flags[s]?.[k],async setFlag(s,k,v){flags[s]??={};flags[s][k]=v;}});
const ready=async(id=magnum,variant='lp')=>{const fx=await fixture(id);if(variant!=='ordinary'){const s=fx.state();s.weapons[0].executionRequest={variant,modeId:id};await fx.service.saveState(s);}await load(fx,fx.candidates().find(t=>!t.recipe&&!t.unavailable));if(variant==='lp')await fx.service.setLPFireMode(fx.carrier.id,'boosted');return fx;};
for(const [adds,want]of [[3,'4d+3'],[4,'5d'],[5,'5d+1'],[7,'6d'],[8,'6d+1'],[11,'7d']])
test('B269 +'+adds+' becomes '+want,()=>{assert.equal(normalizeDamageDiceAdds('4d+'+adds+' pi++'),want+' pi++');});
test('B269 worked 2d+5 example and multiplier/divisor/minimum/inc suffix survive',()=>{
  assert.equal(normalizeDamageDiceAdds('2d+5 pi'),'3d+1 pi');
  assert.equal(normalizeDamageDiceAdds('4d+8x3(2)! pi+ inc'),'6d+1x3(2)! pi+ inc');
  for(const f of ['4d-1 pi','4d+3 pi','4d+5 burn','4d+5 cr ex','4d+5 tox','sw+5 cut','4d+5 pi + 2d burn'])assert.equal(normalizeDamageDiceAdds(f),f);
  assert.equal(normalizeDamageDiceAdds(normalizeDamageDiceAdds('4d+11 pi')),'7d pi');
});
test('User flag defaults true, survives reconstruction and isolates two userIds without GM or settings writes',async()=>{
  const flagsA={},flagsB={},a=user('one',flagsA),b=user('two',flagsB);
  assert.equal(readDamageDiceAddsPolicy(a).enabled,true);assert.equal(readDamageDiceAddsPolicy().enabled,true);
  await saveDamageDiceAddsPreference(false,{game:{user:a}});
  assert.equal(readDamageDiceAddsPolicy(user('one',flagsA)).enabled,false);assert.equal(readDamageDiceAddsPolicy(b).enabled,true);
  await saveDamageDiceAddsPreference(true,{game:{user:b}});
  assert.equal(readDamageDiceAddsPolicy(a).enabled,false);assert.equal(readDamageDiceAddsPolicy(b).userId,'two');
  assert.deepEqual(flagsA,{'olegurps-qol':{[DAMAGE_DICE_ADDS_FLAG]:false}});
});
test('existing unrestricted ApplicationV2 menu renders default true and saves the owning User',async()=>{
  const old=game.user;game.user=user('owner');try{
    for(const lang of ['ru','en']){game.i18n.lang=lang;const app=new WeaponSkillSettingsApp(),ctx=await app._prepareContext();
      const html=await app._renderHTML(ctx);assert.match(html,/Преобразовывать прибавки к урону в кубы \(B269\)/);assert.match(html,/name="convertDamageAddsToDice" type="checkbox" checked/);}
    await WeaponSkillSettingsApp.DEFAULT_OPTIONS.form.handler(null,null,{object:{ignoreWeaponSkillTLDifferences:false,convertDamageAddsToDice:false}});
    assert.equal((await new WeaponSkillSettingsApp()._prepareContext()).diceAdds.enabled,false);
    const [ru,en]=await Promise.all(['ru','en'].map(l=>readFile(new URL('../lang/'+l+'.json',import.meta.url),'utf8').then(JSON.parse)));
    assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
  }finally{game.user=old;game.i18n.lang='ru';}
});
test('user update refreshes the current users native and standalone previews, never another user',()=>{
  const callbacks=[],apps=new Map(),current=user('one');let refreshes=0;
  apps.set('native',{actor:{id:'actor'},attack:{path:'system.ranged.x'},_onActorUpdate(){refreshes++;}});
  apps.set('manager',{managerState:{weapons:[{}]},refreshContent(){refreshes++;}});
  registerWeaponSkillSettings({game:{user:current,settings:{registerMenu(_s,_k,v){assert.equal(v.restricted,false);}}},Hooks:{on:(_n,f)=>callbacks.push(f)},foundry:{applications:{instances:apps}}});
  callbacks[0](user('two'),{flags:{}});assert.equal(refreshes,0);callbacks[0](current,{flags:{}});assert.equal(refreshes,2);
});
for(const book of ['HT','UT','LT'])test(book+' confirmed ranged firearm normalizes only after the existing resolver',()=>{
  const modeId={HT:'Wxm8TWSvu5UFTAaDn',UT:magnum,LT:'WeCQz_2guzg8JWBca'}[book];
  assert.equal(catalogs.getEquipmentForMode(modeId).source,book);
  const resolver=new AttackProfileResolver({catalogs,compatibility});
  const ammunition=book==='UT'?{kind:'physical-magazine',available:1,total:1,
    type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:'15mm_clp'}}:null;
  const p=resolver.resolve({attack:{data:{damage:'4d+5 pi'}},ammunition,binding:{status:'confirmed',binding:{confirmed:true,modeId}}});
  assert.equal(p.damage.formula,'5d+1 pi');assert.equal(p.effective.damage,'5d+1 pi');assert.equal(p.damage.components[0].formula,'5d+1 pi');
  assert.equal(p.diceAdds.enabled,true);assert.equal(p.diceAdds.applied,true);
});
for(const [book,family,type,combat]of [['HT','firearm','pi','melee'],['UT','beam','burn','ranged'],['LT','bow','imp','ranged'],['OTHER','firearm','pi','ranged']])
test([book,family,type,combat].join(' ')+' stays unchanged',()=>{
  const p=new AttackProfileResolver({catalogs:{getMode:()=>({combat_type:combat,weapon_family:family}),getEquipmentForMode:()=>({source:book})}})
    .resolve({attack:{data:{damage:'4d+5 '+type}},binding:{status:'confirmed',binding:{confirmed:true,modeId:'mode'}}});
  assert.equal(p.damage.formula,'4d+5 '+type);assert.equal(p.diceAdds.eligible,false);
});
test('LP Magnum preview, Fire Control, prepared profile and snapshot agree; off restores original adds',async()=>{
  const old=game.user;game.user=user('shooter');try{
    const fx=await ready(),before=JSON.stringify(fx.actor.system);let overlay=fx.attack();
    for(let i=0;i<4;i++){overlay=withRuntimeAmmoStats(overlay,fx.actor);assert.equal(overlay.data.damage,'5d+1 pi++');assert.match(overlay.ammunitionDisplay.damageText,/5d\+1 pi\+\+/);}
    const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{attack:overlay,actor:fx.actor,weapon:fx.weapon(),mode:'weapon',fireState:{}});assert.match(app._getAttackStatsText('0'),/5d\+1 pi\+\+/);
    const result=await shoot(fx),snapshot=result.snapshot,saved=JSON.stringify(snapshot);assert.equal(snapshot.profile.damage.formula,'5d+1 pi++');assert.deepEqual(snapshot.profile.diceAdds,{version:1,source:'B269',userId:'shooter',enabled:true,eligible:true,applied:true});assert.ok(Object.isFrozen(snapshot.profile.damage.components));
    await saveDamageDiceAddsPreference(false);assert.equal(withRuntimeAmmoStats(overlay,fx.actor).data.damage,'4d+5 pi++');assert.equal(fx.profile().damage.formula,'4d+5 pi++');
    assert.equal(JSON.stringify(snapshot),saved);assert.equal(JSON.stringify(fx.actor.system),before);
    const other=user('other');assert.equal(resolveRuntimeAttackProfile({actor:fx.actor,attack:fx.attack(),runtime:{...globalThis,game:{user:other},OleGURPSQOL}}).damage.formula,'5d+1 pi++');assert.equal(fx.profile().damage.formula,'4d+5 pi++');
  }finally{game.user=old;}
});
test('per-die Boosted bonus uses six original dice before B269, while ETC AMR retains HT166 6dx4',async()=>{
  const fx=await ready(rifle);assert.equal(lpBallistics(fx.attack().data,rifle,'boosted').damage,'6d+6 pi');
  for(let i=0;i<4;i++){const p=fx.profile();assert.equal(p.damage.formula,'7d+2 pi');assert.equal(p.weaponConfiguration.converted.damage,'6d+6 pi');assert.equal(p.damage.transformations.filter(t=>t.source==='B269').length,1);}
  const etc=await ready(amr,'etc');for(let i=0;i<4;i++){assert.equal(etc.profile().damage.formula,'6dx4 pi+');assert.equal(etc.profile().diceAdds.applied,false);}
  assert.equal(htDamageDice(15,0,1,1.5),'6dx4');assert.equal(htDamageDice(4,5),'5d+2');
});
test('independent follow-up, fragmentation, electric, chemical and main-charge components are untouched',()=>{
  const types={kinetic:'pi','follow-up':'pi',fragmentation:'cut',electric:'burn',chemical:'tox','main-charge':'cr ex'};
  const components=Object.entries(types).map(([role,type])=>({role,status:'resolved',formula:role==='kinetic'?'4d+5 pi':'2d+8 '+type}));
  const damage={formula:'4d+5 pi',components,nativeSafe:true,rules:{},transformations:[]},secondary=JSON.stringify(components.slice(1));
  applyDamageDiceAdds(damage,{policy:readDamageDiceAddsPolicy(user('one')),mode:{combat_type:'ranged',weapon_family:'firearm'},book:'UT'});
  assert.equal(damage.formula,'5d+1 pi');assert.equal(components[0].formula,'5d+1 pi');assert.equal(JSON.stringify(components.slice(1)),secondary);
});
test('real APHC is applied after LP before B269; APHEX payload retains its independent formula',async()=>{
  for(const variantId of ['ut_aphc','ut_aphex']){const id=variantId==='ut_aphex'?magnum:rifle,fx=await ready(id);const base=fx.candidates().find(t=>!t.recipe),prepared=automatic.prepare({modeId:id,base,variantId}),type=prepared.type;assert.ok(type,variantId);
    const current=fx.weapon().ammunitionInventory.installedId;await fx.transaction('unload',{magazineId:current,amount:fx.weapon().magazines[0]});await fx.transaction('save-recipe',{type});await load(fx,type);
    const p=fx.profile();if(variantId==='ut_aphc')assert.equal(p.damage.formula,'7d+2(2) pi-');
    const off=new AttackProfileResolver({catalogs,compatibility}).resolve({actorId:fx.actor.id,weaponId:fx.carrier.id,attack:fx.attack(),rawAttack:fx.attack().data,state:fx.state(),binding:p.binding.status==='confirmed'?{status:'confirmed',binding:p.binding.confirmed}:null,ammunition:fx.service.readAttackAmmunition(fx.carrier.id),diceAddsPolicy:{...p.diceAdds,enabled:false}});
    assert.deepEqual(p.damage.components.filter(c=>c.role!=='kinetic'),off.damage.components.filter(c=>c.role!=='kinetic'));
  }
});
test('legacy snapshot serialization remains exact after reading a new users enabled preference',()=>{
  const p=new AttackProfileResolver().resolve({attack:{data:{damage:'4d+5 pi'}}}),legacy=structuredClone(createShotSnapshot(p,{attackId:'legacy'}));delete legacy.profile.diceAdds;
  const saved=JSON.stringify(legacy);readDamageDiceAddsPolicy(user('viewer'));assert.equal(JSON.stringify(legacy),saved);assert.equal(legacy.profile.damage.formula,'4d+5 pi');assert.equal(Object.hasOwn(legacy.profile,'diceAdds'),false);
});
