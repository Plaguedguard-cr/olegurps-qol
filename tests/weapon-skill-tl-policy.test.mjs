import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readWeaponSkillTLPolicy, saveWeaponSkillTLPreference, loadWeaponSkillTLTranslations, WEAPON_SKILL_TL_FLAG } from '../scripts/tools/weapon-skill-tl-policy.js';
import { resolveStandaloneSkill } from '../scripts/tools/standalone-skill-service.js';
import { AttackProfileResolver, createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';

const catalog=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8'));
const equipment=catalog.equipment.find(e=>e.name.startsWith('Izhmash AK-47'));
const savedMode=equipment.modes.find(m=>m.combat_type==='ranged'&&m.role==='attack');
const dictionaries=Object.fromEntries(await Promise.all(['ru','en'].map(async language=>[language,JSON.parse(await fs.readFile(new URL('../lang/'+language+'.json',import.meta.url),'utf8'))])));
const user=(id,flags={})=>({id,getFlag:(scope,key)=>flags[scope]?.[key],setFlag:async(scope,key,value)=>{flags[scope]??={};flags[scope][key]=value;}});
const actor=(name='Guns/TL9 (Rifle)',level=13,points=1)=>({system:{skills:{0:{name,level,points}},attributes:{DX:{value:10}}}});
function resolve(currentUser,sourceActor=actor(),tl=7,snapshot=savedMode) {
  return resolveStandaloneSkill({user:currentUser,actor:sourceActor,record:{id:'weapon',equipmentSnapshot:{tech_level:String(tl)}},mode:{modeId:snapshot.weapon_mode_id,snapshot}});
}
const enabledUser=id=>user(id,{'olegurps-qol':{[WEAPON_SKILL_TL_FLAG]:true}});

test('User flags default off, persist across reconstructed users, and are independent of browsers and other users',async()=>{
  const flags={},one=user('one',flags),two=enabledUser('two');
  assert.equal(readWeaponSkillTLPolicy(one).ignoreWeaponSkillTLDifferences,false);
  await saveWeaponSkillTLPreference(true,{game:{user:one}});
  assert.equal(readWeaponSkillTLPolicy(user('one',flags)).ignoreWeaponSkillTLDifferences,true);
  await saveWeaponSkillTLPreference(false,{game:{user:one}});
  assert.equal(readWeaponSkillTLPolicy(one).ignoreWeaponSkillTLDifferences,false);
  assert.equal(readWeaponSkillTLPolicy(two).ignoreWeaponSkillTLDifferences,true);
  assert.deepEqual(Object.keys(flags),['olegurps-qol']);
});
test('TL7 from learned TL9 is 11 then 13; disabling restores normal rules without editing Actor',async()=>{
  const current=user('player'),source=actor(),original=structuredClone(source);
  const off=resolve(current,source);assert.equal(off.level,11);assert.equal(off.tlPenalty,-2);
  await saveWeaponSkillTLPreference(true,{game:{user:current}});
  const on=resolve(current,source);assert.equal(on.level,13);assert.equal(on.tlPenalty,0);assert.equal(on.standardTLPenalty,-2);
  assert.equal(on.learned,false);assert.equal(on.tlPolicy.userId,'player');
  await saveWeaponSkillTLPreference(false,{game:{user:current}});
  assert.equal(resolve(current,source).level,11);assert.deepEqual(source,original);
});
test('reverse allowed TL7 to TL9 transition also removes only TL penalty',()=>{
  assert.equal(resolve(user('off'),actor('Guns/TL7 (Rifle)'),9).level,11);
  assert.equal(resolve(enabledUser('on'),actor('Guns/TL7 (Rifle)'),9).level,13);
});
test('different specialization retains its catalog default penalty and other attack modifiers remain',()=>{
  const source=actor('Guns/TL9 (Pistol)');
  assert.equal(resolve(user('off'),source).level,9);
  const on=resolve(enabledUser('on'),source);
  assert.equal(on.level,11);assert.equal(on.defaultPenalty,-2);assert.equal(on.penalty,-2);assert.equal(on.level-3,8);
});
test('preference does not invent defaults, accept unknown TL, zero-point sources or chains',()=>{
  const on=enabledUser('on');
  for(const source of [actor('Gunner/TL9 (Rifle)'),actor('Guns (Rifle)'),actor('Guns/TL9 (Rifle)',30,0)])assert.equal(resolve(on,source).level,6);
  const mode={...savedMode,defaults:[]};assert.equal(resolve(on,actor(),7,mode).resolved,false);
  const source=actor();source.system.attributes.DX.value=30;source.system.skills={};assert.equal(resolve(on,source).level,16);
});
test('explicit legal cross-family defaults retain their TL penalty',()=>{
  const mode={...savedMode,governing_skill:{status:'resolved',skill:{name:'Beam Weapons',specialization:'Rifle'}},
    defaults:[{type:'skill',name:'Guns',specialization:'Rifle',modifier:-4}]};
  assert.equal(resolve(enabledUser('on'),actor(),7,mode).level,7);
});
test('exact learned skill stays exact and does not transfer learned techniques to a different TL',()=>{
  const skill=resolve(enabledUser('on'),actor('Guns/TL7 (Rifle)'));
  assert.equal(skill.level,13);assert.equal(skill.learned,true);assert.equal(skill.penalty,0);
  assert.equal(resolve(enabledUser('on'),actor()).learned,false);
});
test('shotSnapshot pins rolling GM policy and calculated skill across user changes, reload and Damage',()=>{
  const gm=enabledUser('gm'),player=user('player'),skill=resolve(gm);
  const attack={name:equipment.name,data:{damage:'5d+1 pi',level:skill.level},standaloneRef:{weaponId:'weapon',modeId:savedMode.weapon_mode_id,governingSkill:skill}};
  const profile=new AttackProfileResolver().resolve({actorId:'actor',weaponId:'weapon',attack,rawAttack:attack.data,ammunition:null,state:{}});
  const shot=createShotSnapshot(profile,{attackId:'shot',messageId:'message'}),original=JSON.stringify(shot);
  const reloaded=JSON.parse(original);
  assert.equal(resolve(player).level,11);assert.equal(reloaded.mode.standaloneRef.governingSkill.level,13);
  assert.deepEqual(reloaded.mode.standaloneRef.governingSkill.tlPolicy,{version:1,userId:'gm',ignoreWeaponSkillTLDifferences:true});
  gm.getFlag=()=>false;assert.equal(resolve(gm).level,11);
  assert.equal(JSON.stringify(shot),original);assert.equal(reloaded.profile.damage.formula,'5d+1 pi');assert.ok(Object.isFrozen(shot));
});

globalThis.foundry={applications:{api:{ApplicationV2:class {}},instances:new Map()},utils:{setProperty:(object,path,value)=>{
  const keys=path.split('.');for(const key of keys.slice(0,-1))object=object[key]??={};object[keys.at(-1)]=value;
}}};
const {WeaponSkillSettingsApp,registerWeaponSkillSettings}=await import('../scripts/tools/weapon-skill-settings-app.js');
test('settings menu is ApplicationV2, available to players, and checkbox saves only the current User flag',async()=>{
  let menu;const hooks=[];const current=user('current');
  globalThis.game={user:current,i18n:{localize:key=>dictionaries.ru[key]??key}};
  registerWeaponSkillSettings({game:{user:current,settings:{registerMenu:(scope,key,data)=>{assert.equal(scope,'olegurps-qol');menu=data;}}},Hooks:{on:(name,callback)=>hooks.push({name,callback})},foundry:globalThis.foundry});
  assert.equal(menu.restricted,false);assert.equal(menu.type,WeaponSkillSettingsApp);
  assert.ok(new WeaponSkillSettingsApp() instanceof foundry.applications.api.ApplicationV2);
  const app=new WeaponSkillSettingsApp();assert.equal((await app._prepareContext()).ignoreWeaponSkillTLDifferences,false);
  await WeaponSkillSettingsApp.DEFAULT_OPTIONS.form.handler(null,null,{object:{ignoreWeaponSkillTLDifferences:true}});
  assert.equal((await app._prepareContext()).ignoreWeaponSkillTLDifferences,true);
  let updates=0;const live={actor:{id:'actor'},attack:{standaloneRef:{}},_onActorUpdate:()=>updates++};foundry.applications.instances.set('live',live);
  hooks[0].callback(user('viewer'),{flags:{}});assert.equal(updates,0);
  hooks[0].callback(current,{flags:{'olegurps-qol':{[WEAPON_SKILL_TL_FLAG]:true}}});assert.equal(updates,1);
  foundry.applications.instances.clear();delete globalThis.game;
});
test('RU/EN keys actually load into cached Foundry dictionaries and render the localized checkbox',async()=>{
  const keys=Object.keys(dictionaries.ru).filter(key=>key.startsWith('OleGURPS.WeaponSkillTL.'));
  assert.deepEqual(keys,Object.keys(dictionaries.en).filter(key=>key.startsWith('OleGURPS.WeaponSkillTL.')));
  for(const language of ['ru','en']){
    const i18n={lang:language,translations:{},localize:key=>key.split('.').reduce((value,name)=>value?.[name],i18n.translations)??key};
    const runtime={game:{i18n},location:{},foundry:globalThis.foundry,fetch:async path=>{assert.ok(path.endsWith('/'+language+'.json'));return{ok:true,json:async()=>dictionaries[language]};}};
    await loadWeaponSkillTLTranslations(runtime);globalThis.game={i18n,user:user('player')};
    assert.equal(i18n.lang,language);
    const html=await new WeaponSkillSettingsApp()._renderHTML({ignoreWeaponSkillTLDifferences:false});
    assert.ok(html.includes(dictionaries.ru['OleGURPS.WeaponSkillTL.Label']));assert.doesNotMatch(html.match(/<input[^>]*name="ignoreWeaponSkillTLDifferences"[^>]*>/)[0],/checked/);
    assert.deepEqual(i18n.translations,{});
    assert.ok(!html.includes('OleGURPS.WeaponSkillTL.Label'));
  }
  delete globalThis.game;
});
