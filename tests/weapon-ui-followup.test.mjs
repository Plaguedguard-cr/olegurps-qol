import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,load,shoot,catalogs,compatibility,automatic,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {WeaponConfigurationDraft,weaponConfigurationHTML,bindWeaponConfiguration} from '../scripts/tools/weapon-configuration.js';
import {standaloneConfigurationHTML} from '../scripts/tools/standalone-weapon-configuration.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {attackProfilePresentation,executionAmmoCaption} from '../scripts/tools/weapon-profile-presentation.js';
import {ammoCaption} from '../scripts/tools/ammo-caption.js';
import {getMeleeAttackSettings,setMeleeWeaponBond} from '../scripts/tools/melee-assistant-state.js';
import {resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {WeaponAssistantApp} from '../scripts/tools/weapon-assistant-app.js';
import {openAmmoManager} from '../scripts/tools/ammo.js';

const magnum='WIAo1otMCstnbi4Dv',rifle='WFc8O-LgWxenUseNy';
const configure=async(fx,variant='etc')=>{const s=fx.state();s.weapons[0].executionRequest={variant,modeId:fx.carrier.standaloneModeId};await fx.service.saveState(s);};
const model=fx=>new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],existing:fx.weapon(),catalogs,ammunition:compatibility});
function form(draft){
  const events={},inputs=['damage','range'].map(key=>({dataset:{standaloneStat:key,modeId:draft.executionModeId},value:'',readOnly:false}));
  const execution={innerHTML:''},fields={innerHTML:'',addEventListener(){}};
  const root={addEventListener:(name,fn)=>events[name]=fn,querySelectorAll:selector=>selector==='[data-standalone-stat]'?inputs:[],
    querySelector:selector=>selector==='[data-standalone-configuration]'?null:selector==='[data-weapon-execution]'?execution:
      selector==='[data-weapon-mode-fields]'?fields:{addEventListener(){}}};
  bindWeaponConfiguration(root,draft,()=>assert.fail('no editor'));
  const select=variant=>events.change({target:{name:'weaponExecution',value:variant}});
  return {inputs,select,execution};
}
test('Magnum ETC changes the visible fields before Save, restores ordinary, and never writes Actor',async()=>{
  const fx=await fixture(magnum),draft=model(fx),root=form(draft),writes=fx.writes.length,before=JSON.stringify(fx.state());
  for(let i=0;i<3;i++){
    root.select('etc');assert.deepEqual(root.inputs.map(e=>e.value),['6d+2 pi++','353/3900']);assert.ok(root.inputs.every(e=>e.readOnly));
    assert.match(root.execution.innerHTML,/\$1740/);assert.match(weaponConfigurationHTML(draft),/value="6d\+2 pi\+\+"/);
    root.select('ordinary');assert.deepEqual(root.inputs.map(e=>e.value),['4d+1 pi++','235/2,600']);assert.ok(root.inputs.every(e=>!e.readOnly));
    assert.match(root.execution.innerHTML,/\$870/);
  }
  assert.equal(fx.writes.length,writes);assert.equal(JSON.stringify(fx.state()),before);assert.deepEqual(draft.standaloneDraft.overrides[magnum],{});
});
test('ETC preview retains manual baseline values and agrees with the saved resolver without multiplying twice',async()=>{
  const fx=await fixture(magnum);await load(fx,fx.candidates().find(t=>!t.recipe));const draft=model(fx);
  draft.standaloneDraft.setOverride(magnum,'damage','5d pi++');draft.standaloneDraft.setOverride(magnum,'range','300/3000');
  draft.standaloneDraft.setOverride(magnum,'acc','3');const root=form(draft);root.select('etc');
  const preview=draft.previewStats().stats;assert.equal(preview.damage,'7d+2 pi++');assert.equal(preview.range,'450/4500');
  root.select('ordinary');assert.deepEqual(root.inputs.map(e=>e.value),['5d pi++','300/3000']);root.select('etc');
  const saved=await draft.commit({id:'unused'});await fx.service.saveState(saved.state);const p=fx.profile();
  assert.equal(p.effective.damage,preview.damage);assert.equal(p.effective.range,preview.range);assert.equal(p.effective.acc,3);
  const reopened=model(fx);assert.equal(reopened.previewStats().stats.damage,preview.damage);
  assert.equal(reopened.standaloneDraft.overrides[magnum].damage,'5d pi++');
  for(const key of ['rof','rcl','shots','st','bulk'])assert.equal(String(p.effective[key]),String(preview[key]));
});

const representatives=[['UT','ranged',magnum],['HT','ranged','Wxm8TWSvu5UFTAaDn'],['LT','ranged','W4gnbkfxzHAYre3kO'],
 ['UT','melee','w7bLtfJugrIOJS70U'],['HT','melee','wFmnElv38Dl7vCHz8'],['LT','melee','wseA0_41AcVRwc1Lf']];
for(const [book,type,id]of representatives)test('one common Weapon Bond setting is available and persists for '+book+' '+type,async()=>{
  const fx=await fixture(magnum);fx.actor.system.ads={bond:{name:'Weapon Bond'}};const source=structuredClone(fx.actor.system);
  const draft=new StandaloneWeaponDraft({catalogs,type,actor:fx.actor});draft.selectModel(catalogs.getEquipmentForMode(id).equipment_id);
  const html=standaloneConfigurationHTML(draft);assert.match(html,/name="standaloneWeaponBond"/);
  assert.doesNotMatch(html.match(/<input[^>]*name="standaloneWeaponBond"[^>]*>/)[0],/disabled/);
  const service=new StandaloneWeaponService(fx.actor,catalogs);draft.weaponBond=true;draft.weaponBondChanged=true;const record=await service.save(draft);
  assert.equal(record.settings.weaponBond,true);assert.equal(readStandaloneAttack(fx.actor,record.id,id).weaponBondSetting,true);
  const reopened=new StandaloneWeaponDraft({catalogs,type,actor:fx.actor,existing:service.get(record.id)});
  assert.equal(reopened.weaponBond,true);assert.match(standaloneConfigurationHTML(reopened),/name="standaloneWeaponBond"[^>]*checked/);
  const other=new StandaloneWeaponDraft({catalogs,type,actor:fx.actor});other.selectModel(draft.modelId);const second=await service.save(other);
  assert.equal(second.settings.weaponBond,undefined);assert.deepEqual(fx.actor.system,source);
  delete fx.actor.system.ads;const old=service.get(record.id),unrelated=new StandaloneWeaponDraft({catalogs,type,actor:fx.actor,existing:old});
  await service.save(unrelated);assert.equal(service.get(record.id).settings.weaponBond,true); // no destructive reset when perk disappears
});
test('Weapon Bond OWNER uses no GM/world approval and foreign Actor stays protected',async()=>{
  const fx=await fixture(magnum);fx.actor.system.ads={bond:{name:'Weapon Bond'}};const service=new StandaloneWeaponService(fx.actor,catalogs);
  const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:fx.actor,existing:service.get(fx.record.id)});draft.weaponBond=true;draft.weaponBondChanged=true;
  game.user.isGM=false;const set=game.settings.set;game.settings.set=()=>assert.fail('world setting');
  try{await service.save(draft);assert.equal(service.get(fx.record.id).settings.weaponBond,true);fx.actor.isOwner=false;
    const before=JSON.stringify(fx.actor.getFlag('olegurps-qol','standaloneWeapons'));await assert.rejects(service.save(draft),/прав/);
    assert.equal(JSON.stringify(fx.actor.getFlag('olegurps-qol','standaloneWeapons')),before);
  }finally{game.user.isGM=true;game.settings.set=set;}
});
test('legacy Bond choices survive without migration; an explicit instance setting controls the existing melee bonus once',async()=>{
  const fx=await fixture(magnum);fx.actor.system.ads={bond:{name:'Weapon Bond'}};
  const service=new StandaloneWeaponService(fx.actor,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'melee',actor:fx.actor});
  draft.selectModel(catalogs.getEquipmentForMode('wseA0_41AcVRwc1Lf').equipment_id);const record=await service.save(draft);
  const attack=readStandaloneAttack(fx.actor,record.id),state={attacks:{}};setMeleeWeaponBond(state,attack,true);
  assert.equal(getMeleeAttackSettings(state,attack).weaponBond,true);
  const edited=new StandaloneWeaponDraft({catalogs,type:'melee',actor:fx.actor,existing:record});edited.weaponBond=true;edited.weaponBondChanged=true;await service.save(edited);
  const fresh=readStandaloneAttack(fx.actor,record.id),enabled=getMeleeAttackSettings(state,fresh).weaponBond;
  const calc=resolveMeleeCombatCalculation({actor:fx.actor,attack:fresh,baseSkill:13,weaponBond:enabled});
  assert.equal(calc.effectiveSkill,14);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
  const off=new StandaloneWeaponDraft({catalogs,type:'melee',actor:fx.actor,existing:service.get(record.id)});off.weaponBond=false;off.weaponBondChanged=true;await service.save(off);
  assert.equal(getMeleeAttackSettings(state,readStandaloneAttack(fx.actor,record.id)).weaponBond,false);
});
test('the existing ranged channel receives the saved Bond setting exactly once',async()=>{
  const fx=await fixture(rifle);fx.actor.system.ads={bond:{name:'Weapon Bond'}};
  const service=new StandaloneWeaponService(fx.actor,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:fx.actor,existing:service.get(fx.record.id)});
  draft.weaponBond=true;draft.weaponBondChanged=true;await service.save(draft);await fx.service.loadState();
  const fresh=fx.attack();assert.equal(fresh.weaponBondSetting,true);
  const attack={...fresh,weaponBond:fresh.weaponBondSetting??fx.weapon().weaponBond};
  const prior=globalThis.GURPS;globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
  try {
  const fire=new FireService({actor:fx.actor,token:{actor:fx.actor}}),context=createFireControlContext({token:{actor:fx.actor},fireService:fire});
  const details=context.calculateEffectiveFireSkillDetails(attack,{rangeIndex:0,manualRangeSelected:true,shots:1,hitLocationId:'torso'},
    [{index:0,max:2,penalty:0,label:'2'}],{getSelection:()=>({zoneId:'torso',canonicalKeys:['torso'],penalty:0})});
  assert.equal(details.effectiveSkill,attack.level+1);assert.equal(details.combatCalculation.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
  } finally {globalThis.GURPS=prior;}
});

for(const [variantId,damage]of [['ut_aphc','9d(2) pi-'],['ut_apds','11d+2(2) pi-'],['ut_apep','9d(3) pi-']])
test('selected '+variantId+' and ETC share one resolved Damage in manager and Fire Control',async()=>{
  const fx=await fixture(rifle);const base=fx.candidates().find(t=>!t.recipe),p=automatic.prepare({modeId:rifle,base,variantId});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);await configure(fx);
  const attack=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.match(attack.ammunitionDisplay.damageText,new RegExp(damage.replace(/[()+]/g,'\\$&')));
  assert.equal(attack.data.damage,damage);assert.equal(executionAmmoCaption(ammoCaption(fx.actor,fx.weapon()),attack.ammunitionDisplay).endsWith(' - ETC'),true);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack,mode:'weapon',fireState:{}});
  const text=app._getAttackStatsText('15');assert.ok(text.includes(damage));assert.doesNotMatch(text,/ - ETC/);assert.match(app._getAttackTitle(),/ - ETC$/);
  const state=JSON.stringify(fx.state());for(let i=0;i<3;i++)assert.equal(withRuntimeAmmoStats(attack,fx.actor).data.damage,damage);
  assert.equal(JSON.stringify(fx.state()),state);const result=await shoot(fx);assert.equal(result.snapshot.profile.damage.formula,damage);
});
test('component presentation distinguishes follow-up, fragmentation and manual-only payloads without raw fallback',()=>{
  const p={damage:{nativeSafe:true,formula:'9d(2) pi+',components:[{role:'kinetic',status:'resolved',formula:'9d(2) pi+'},
    {role:'follow-up',status:'resolved',formula:'1d cr ex'},{role:'fragmentation',status:'resolved',formula:'1d-2 cut'}]}};
  const text=attackProfilePresentation(p).damageText;assert.match(text,/Урон 9d\(2\) pi\+/);assert.match(text,/Последействие 1d cr ex/);assert.match(text,/Осколки 1d-2 cut/);
  assert.equal(attackProfilePresentation({damage:{nativeSafe:false,formula:'99d pi'}}).damageText,'Урон — уточните профиль');
  assert.equal(attackProfilePresentation({damage:{nativeSafe:true,rules:{instructionOnly:true}}}).damageText,'Эффект вручную');
  assert.equal(executionAmmoCaption('15mmCLP',attackProfilePresentation(p)),'15mmCLP');
});

async function managerFixture(fx){
  const render=WeaponAssistantApp.prototype.render;let app;WeaponAssistantApp.prototype.render=async function(){app=this;this.element={addEventListener(){}};return this;};
  foundry.applications.api.DialogV2={};globalThis.GURPS={executeOTF(){},ModifierBucket:{modifierStack:{modifierList:[]}}};
  globalThis.Hooks={on:()=>1,off(){}};globalThis.canvas={scene:{id:crypto.randomUUID()},tokens:{controlled:[{id:crypto.randomUUID(),actor:fx.actor}]}};
  try{await openAmmoManager();}finally{WeaponAssistantApp.prototype.render=render;}return app;
}
test('manager actual renderer shows current Damage and changes only the requested card when a magazine changes',async()=>{
  const fx=await fixture(rifle),base=fx.candidates().find(t=>!t.recipe);await load(fx,base);await configure(fx);const app=await managerFixture(fx);
  const before=JSON.stringify(fx.state()),writes=fx.writes.length,html=app.buildWeaponCards(fx.state(),[fx.carrier.id]);
  assert.match(html,/data-current-weapon-stats/);assert.match(html,/Урон 9d pi/);assert.match(html,/ - ETC/);assert.equal((html.match(/data-weapon-card=/g)??[]).length,1);
  assert.equal(fx.writes.length,writes);assert.equal(JSON.stringify(fx.state()),before);
  const p=automatic.prepare({modeId:rifle,base,variantId:'ut_apds'});await fx.transaction('save-recipe',{type:p.type});
  await fx.transaction('add-stock',{ammoKey:p.type.key,amount:3});await fx.transaction('add-magazines',{amount:1,capacity:51});const other=fx.weapon().ammunitionInventory.magazines.at(-1);
  await fx.transaction('load',{magazineId:other.id,ammoKey:p.type.key,amount:3});await fx.transaction('install',{magazineId:other.id});
  const changed=app.buildWeaponCards(fx.state(),[fx.carrier.id]);assert.match(changed,/Урон 11d\+2\(2\) pi-/);
  await configure(fx,'ordinary');const ordinary=app.buildWeaponCards(fx.state(),[fx.carrier.id]);assert.doesNotMatch(ordinary,/ - ETC/);assert.match(ordinary,/Урон 7d\+2\(2\) pi-/);
});

test('Fire Control reads the current magazine caption and count even before the manager update hook refreshes an old card',async()=>{
  const fx=await fixture(rifle),base=fx.candidates().find(t=>!t.recipe);await load(fx,base);await configure(fx);const stale=fx.weapon();
  const p=automatic.prepare({modeId:rifle,base,variantId:'ut_apep'});await fx.transaction('save-recipe',{type:p.type});
  await fx.transaction('add-stock',{ammoKey:p.type.key,amount:3});await fx.transaction('add-magazines',{amount:1,capacity:51});
  const other=fx.weapon().ammunitionInventory.magazines.at(-1);await fx.transaction('load',{magazineId:other.id,ammoKey:p.type.key,amount:3});
  await fx.transaction('install',{magazineId:other.id});const attack=withRuntimeAmmoStats(fx.attack(),fx.actor),app=Object.create(FirePreparationApp.prototype);
  Object.assign(app,{actor:fx.actor,weapon:stale,attack,mode:'weapon',fireState:{}});const stats=app._getAttackStatsText('15');
  assert.doesNotMatch(stats,/APEP| - ETC/);assert.match(app._getAttackTitle(),/7mmCL - ETC$/);assert.match(stats,/магазин 3\/51/);assert.match(stats,/Урон 9d\(3\) pi-/);
});
test('the manager follows the active UAW carrier for Damage and never applies ETC to either barrel',async()=>{
  const fx=await fixture('WtM51JNSpOUIy3Eo1');await fx.service.loadState();
  const app=await managerFixture(fx),state=fx.state(),main=state.weapons.find(w=>w.standaloneModeId==='WtM51JNSpOUIy3Eo1'),shot=state.weapons.find(w=>w.standaloneModeId==='WRvS5pz3LMCzqQyiZ');
  // Catalog base identity is required for a current damage; keep each barrel's own ledger.
  const {ammunitionCandidates}=await import('../scripts/tools/ammo-management-app.js');
  for(const w of [main,shot]){const base=ammunitionCandidates(fx.actor,w,OleGURPSQOL).find(t=>!t.recipe);const options={allowedTypes:ammunitionCandidates(fx.actor,w,OleGURPSQOL)};
    await fx.service.inventoryTransaction(w.id,'add-stock',{ammoKey:base.key,amount:2},options);await fx.service.inventoryTransaction(w.id,'load',{magazineId:w.ammunitionInventory.installedId,ammoKey:base.key,amount:2},options);}
  await fx.service.inventoryTransaction(main.id,'install',{magazineId:main.ammunitionInventory.installedId});assert.match(app.buildWeaponCards(fx.state()),/Урон 3d pi\+/);
  await fx.service.inventoryTransaction(shot.id,'install',{magazineId:shot.ammunitionInventory.installedId});const html=app.buildWeaponCards(fx.state());assert.match(html,/Урон 5d pi\+\+/);assert.doesNotMatch(html,/ - ETC/);
});
test('ru/en use Russian module Damage labels and unsupported profiles never get an ETC suffix',async()=>{
  const fx=await fixture('Wg_f0E5hqv6o1C0Uj');await load(fx,fx.candidates().find(t=>!t.recipe));
  for(const lang of ['ru','en']){game.i18n.lang=lang;const attack=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.match(attack.ammunitionDisplay.damageText,/Урон/);
    assert.equal(attack.ammunitionDisplay.etc,false);assert.doesNotMatch(executionAmmoCaption('15mm Air Gun',attack.ammunitionDisplay),/ETC/);assert.equal(game.i18n.lang,lang);
  }game.i18n.lang='ru';
});

for(const [book,id,damage]of [['HT','Wxm8TWSvu5UFTAaDn','7d pi'],['LT','W4gnbkfxzHAYre3kO','3d-1 imp']])
test(book+' card shows its selected ordinary Damage without ETC conversion',async()=>{
  const fx=await fixture(id);await load(fx,fx.candidates().find(t=>!t.recipe));const app=await managerFixture(fx),before=JSON.stringify(fx.state());
  const html=app.buildWeaponCards(fx.state(),[fx.carrier.id]);assert.ok(html.includes('Урон '+damage));assert.doesNotMatch(html,/ - ETC/);
  const attack=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.equal(attack.data.damage,damage);assert.equal(attack.ammunitionDisplay.etc,false);
  assert.equal(JSON.stringify(fx.state()),before);
});
