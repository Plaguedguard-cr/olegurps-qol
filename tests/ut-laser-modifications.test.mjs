import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussFixture,catalogs} from './helpers/gauss-context.mjs';
import {BEAM_PROFILES} from '../scripts/ut-beam-source.js';
import {DEFAULT_LASER_MODIFICATIONS as DEFAULT,laserModificationAdmission,laserAvailableModes,laserModificationsHTML,
  laserFireControlsHTML,validateLaserModifications,laserModificationCost,laserAvailableShots} from '../scripts/ut-laser-modifications.js';
import {readWeaponBattery,weaponPowerReason,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {WeaponConfigurationDraft} from '../scripts/tools/weapon-configuration.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
const PISTOL='Wc8n7l5aGm-_aywZc';
async function configure(f,changes){const state=f.state();state.weapons.find(w=>w.id===f.weapon().id).laserModificationRequest={...DEFAULT,...changes};await f.service.saveState(state);}
async function source(f,charge){const state=f.state(),w=state.weapons.find(w=>w.id===f.weapon().id);w[f.power().stateKey].charge=charge;await f.actor.setFlag('world','gurpsAmmoManager',state);}
for(const p of Object.values(BEAM_PROFILES)){
 test(p.name+': original model, per-model admission, every admitted construction and pulse history',async()=>{
  const f=await gaussFixture(p.modeId),a=laserModificationAdmission(p.modeId),original=f.profile(),raw=structuredClone(original.raw);
  assert.equal(original.damage.rules.laserModifications,undefined);assert.equal(laserFireControlsHTML(f.weapon(),x=>x),'');
  assert.equal(a.pulse,!p.chemical&&p.family!=='rainbow');assert.equal(a.dazzle,p.family==='laser'&&!p.oneShot);
  assert.equal(p.baseRoF,Number(raw.rof));
  assert.equal(a.blueGreen,p.family==='laser'&&!p.chemical&&!p.oneShot&&p.baseRoF>1);
  const baseline=JSON.stringify(catalogs.getMode(p.modeId));
  for(const construction of ['standard','blueGreen','ultraviolet','pulse']){
   if(construction!=='standard'&&!a[construction]){assert.throws(()=>validateLaserModifications(p.modeId,{...DEFAULT,construction}));continue;}
   await configure(f,{construction});const profile=f.profile();
   assert.equal(profile.damage.nativeSafe,true,profile.damage.reason);
   if(construction==='pulse'){
    assert.match(profile.damage.formula,/cr ex$/);assert.doesNotMatch(profile.damage.formula,/burn|sur/);
    const divisor=({laser:1,xray:3,graser:5})[p.family];
    if(divisor===1)assert.doesNotMatch(profile.damage.formula,/\(/);else assert.ok(profile.damage.formula.includes('('+divisor+')'));
    assert.equal(profile.damage.rules.ballisticRange.maximum,original.damage.rules.ballisticRange.maximum*2);
    assert.equal(laserFireControlsHTML(f.weapon(),x=>x),'');
   }
  }
  assert.equal(JSON.stringify(catalogs.getMode(p.modeId)),baseline);
 });
 if(laserModificationAdmission(p.modeId).dazzle)test(p.name+': Dazzle/Blinding installation and one-mode selector policy',async()=>{
  const f=await gaussFixture(p.modeId);await configure(f,{dazzle:true,blinding:true});
  assert.deepEqual(laserAvailableModes(f.weapon()),['beam','dazzle','blinding']);
  assert.match(laserFireControlsHTML(f.weapon(),x=>x),/name="laserMode"/);
  await f.battery();const state=structuredClone(f.state());
  for(const[mode,modifier,outcome]of [['dazzle',-5,'temporary-blindness'],['blinding',-10,'crippling-blindness']]){
   await f.service.setLaserConfiguration(f.weapon().id,{laserMode:mode});const profile=f.profile(),d=profile.damage;
   assert.equal(d.formula,null);assert.deepEqual(d.components,[]);assert.equal(d.rules.resistanceEffect.modifier,modifier);
   assert.equal(d.rules.resistanceEffect.outcome,outcome);assert.equal(profile.effective.damage,`HT${modifier} aff`);
   assert.equal(profile.effective.rof,f.attack().data.rof);assert.ok(attackProfilePresentation(profile).damageText.includes('HT'+modifier));
   if(mode==='blinding'){const expected=f.attack().data.shots.replace(/^(\d+)/,n=>String(Number(n)*10));assert.equal(profile.effective.shots,expected);assert.equal(withRuntimeAmmoStats(f.attack(),f.actor).data.shots,expected);}
   const brief=ammunitionChatData(profile);assert.ok(brief.lines.length<=5);assert.ok(brief.lines.join(' ').length<650);
  }
  assert.deepEqual(readWeaponBattery(f.weapon()),readWeaponBattery(state.weapons[0]));
 });
}
test('exact tenth-charge accounting, burst, duplicate, cancellation, last tenth and empty source',async()=>{
 const f=await gaussFixture(PISTOL);await configure(f,{blinding:true,dazzle:true});await f.battery();
 await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'blinding'});const full=readWeaponBattery(f.weapon()).charge;
 const canceled=await f.shoot(2,{cancel:true});assert.equal(canceled.rolled,false);assert.equal(readWeaponBattery(f.weapon()).charge,full);
 for(let i=0;i<10;i++){const shot=await f.shoot(3);assert.equal(shot.receipt.power.spent,0.3);assert.equal(shot.receipt.power.spentUnits,3);assert.equal(shot.receipt.power.after,readWeaponBattery(f.weapon()).charge);}
 assert.equal(readWeaponBattery(f.weapon()).charge,full-3);
 const id=crypto.randomUUID();await f.shoot(1,{attackId:id});const before=readWeaponBattery(f.weapon()).charge;await f.shoot(1,{attackId:id});assert.equal(readWeaponBattery(f.weapon()).charge,before);
 await source(f,0.1);assert.equal(laserAvailableShots(f.weapon(),0.1),1);assert.equal(weaponPowerReason(f.weapon()),null);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,0);
 await assert.rejects(f.shoot());await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'dazzle'});await assert.rejects(f.shoot());
 await source(f,0.1);const dazzled=await f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:f.profile({context:{hitLocation:'Face'}})}),execute:async()=>({rolled:true})});
 assert.equal(dazzled.receipt.power.spent,0);assert.equal(readWeaponBattery(f.weapon()).charge,0.1);
 await assert.rejects(f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:f.profile({context:{hitLocation:'Torso'}})}),execute:async()=>({rolled:true})}),/Dazzle/);
 const missing=f.state();delete missing.weapons[0].beamBattery;await f.actor.setFlag('world','gurpsAmmoManager',missing);assert.ok(weaponPowerReason(f.weapon()));
});
test('NR, stale editor save, instance independence, reload and frozen mode profile',async()=>{
 const f=await gaussFixture(PISTOL),other=await gaussFixture(PISTOL);await configure(f,{beamPulse:true,blinding:true});await f.battery(true);
 assert.equal(readWeaponBattery(f.weapon()).capacity,66);const stale=f.state();
 await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'pulse'});const shot=await f.shoot(),saved=structuredClone(shot.snapshot);
 await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'beam'});await f.service.saveState(stale);
 assert.equal(f.weapon().laserMode,'beam');assert.equal(readWeaponBattery(f.weapon()).charge,65);assert.deepEqual(shot.snapshot,saved);
 assert.match(saved.profile.damage.formula,/cr ex/);await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()).charge,65);
 await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'blinding'});const burst=await f.shoot(10);assert.equal(burst.receipt.power.spentUnits,10);assert.equal(readWeaponBattery(f.weapon()).charge,64);assert.equal(burst.receipt.power.nonRechargeable,true);
 assert.equal(other.weapon().laserModifications,undefined);assert.equal(laserAvailableModes(other.weapon()).length,1);
 f.actor.isOwner=false;await assert.rejects(f.service.setLaserConfiguration(f.weapon().id,{laserMode:'blinding'}),/Permission/);
});
test('Blue-Green doubles Range and energy, halves RoF with B9, water caps and no repeated factors',async()=>{
 const f=await gaussFixture(PISTOL);await configure(f,{construction:'blueGreen'});await f.battery();
 const p=f.profile();assert.equal(p.effective.range,'400/1200');assert.equal(p.effective.rof,'5');assert.equal(p.damage.formula,'3d(2) burn');
 assert.equal(p.effective.shots,'16(3)');
 const shot=await f.shoot(3);assert.equal(shot.receipt.power.spent,6);
 for(const[water,max]of [['clear',150],['average',60],['murky',15]]){await f.service.setLaserConfiguration(f.weapon().id,{laserEnvironment:{water,pressure:1}});assert.equal(f.profile().damage.rules.ballisticRange.maximum,max);}
 const overlay=withRuntimeAmmoStats(f.attack(),f.actor);assert.equal(withRuntimeAmmoStats(overlay,f.actor).data.range,overlay.data.range);
 await f.service.setLaserConfiguration(f.weapon().id,{laserEnvironment:{water:'air',pressure:1}});assert.equal(f.profile().effective.range,'400/1200');
 await configure(f,{construction:'blueGreen',beamPulse:true});await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'pulse'});assert.equal(f.profile().effective.range,'800/2400');assert.equal(f.profile().effective.rof,'5');assert.equal(f.profile().damage.formula,'3d cr ex');assert.equal((await f.shoot()).receipt.power.spent,2);
});
test('UV uses UT half-die rule, atmosphere cap and vacuum; UV Beam/Pulse compounds once',async()=>{
 const f=await gaussFixture('WOe0AiejW3FSlE-nO');await configure(f,{construction:'ultraviolet',beamPulse:true});
 assert.equal(f.profile().damage.formula,'2d+2(2) burn');assert.equal(f.profile().effective.range,'500/500');
 await f.service.setLaserConfiguration(f.weapon().id,{laserEnvironment:{water:'air',pressure:0}});assert.equal(f.profile().effective.range,'1500/4500');
 await f.service.setLaserConfiguration(f.weapon().id,{laserMode:'pulse'});assert.equal(f.profile().damage.formula,'2d+2 cr ex');assert.equal(f.profile().effective.range,'3000/9000');
});
test('all allowed additional-mode combinations, user-approved additive costs and invalid flags',async()=>{
 const f=await gaussFixture(PISTOL);
 for(let mask=0;mask<8;mask++){
  const c={...DEFAULT,dazzle:!!(mask&1),blinding:!!(mask&2),beamPulse:!!(mask&4)};await configure(f,c);
  const expected=1+(c.dazzle?1:0)+(c.blinding?1:0)+(c.beamPulse?1:0);assert.equal(laserAvailableModes(f.weapon()).length,expected);
  const price=laserModificationCost(PISTOL,c);assert.equal(price.total,1100*(100+(c.dazzle?10:0)+(c.blinding?10:0)+(c.beamPulse?100:0))/100);
  assert.equal(laserFireControlsHTML(f.weapon(),x=>x).includes('name="laserMode"'),expected>1);
 }
 assert.throws(()=>validateLaserModifications(PISTOL,{...DEFAULT,construction:'pulse',beamPulse:true}));
 assert.throws(()=>validateLaserModifications(PISTOL,{...DEFAULT,construction:'blueGreen',dazzle:true}));
 assert.throws(()=>validateLaserModifications(PISTOL,{...DEFAULT,unknown:true}));
 assert.match(laserModificationsHTML(PISTOL,{...DEFAULT,dazzle:true,blinding:true},x=>x),/1320/);
 await assert.rejects(f.service.setLaserConfiguration(f.weapon().id,{laserMode:'missing'}));
});

test('undetermined emitters and sealed crystals remain unavailable in UI, service and legacy execution',async()=>{
 for(const p of Object.values(BEAM_PROFILES).filter(p=>p.family!=='laser'||p.oneShot||p.chemical)){
  const f=await gaussFixture(p.modeId),a=laserModificationAdmission(p.modeId),before=f.state();
  for(const key of ['dazzle','blinding','beamPulse','blueGreen','ultraviolet','pulse']){
   if(a[key])continue;
   const changes=['blueGreen','ultraviolet','pulse'].includes(key)?{construction:key}:{[key]:true};
   await assert.rejects(configure(f,changes));assert.deepEqual(f.state(),before);
   const legacy={...f.weapon(),laserModifications:{...DEFAULT,...changes}};
   assert.match(laserModificationsHTML(p.modeId,legacy.laserModifications,x=>x),/role="status"/);
   const state=f.state();state.weapons[0]=legacy;await f.actor.setFlag('world','gurpsAmmoManager',state);
   assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(f.shoot());
   await f.actor.setFlag('world','gurpsAmmoManager',before);
  }
 }
});
test('existing weapon editor previews mods without writes and stores requests only on Save',async()=>{
 const f=await gaussFixture(PISTOL),before=f.state();
 const draft=new WeaponConfigurationDraft({actor:f.actor,state:f.state(),attacks:[],existing:f.weapon(),catalogs});
 draft.laserDraft().value={...DEFAULT,construction:'pulse'};draft.laserDraft().changed=true;
 const preview=draft.previewStats();assert.match(preview.stats.damage,/cr ex/);assert.deepEqual(f.state(),before);
 const result=await draft.commit({id:f.weapon().id});await f.service.saveState(result.state);assert.equal(f.weapon().laserModifications.construction,'pulse');assert.equal(f.attack().data.damage,'3d(2) burn');
});
test('legacy forbidden Blue-Green stays visible and cannot execute before correction',async()=>{
 const f=await gaussFixture('WTY4stfOc8dsLHbj6');await f.battery();
 const state=f.state();state.weapons[0].laserModifications={...DEFAULT,construction:'blueGreen'};
 await f.actor.setFlag('world','gurpsAmmoManager',state);
 const attack=withRuntimeAmmoStats(f.attack(),f.actor);assert.match(attack.ammunitionReadinessReason,/RoF/);
 const app=Object.assign(Object.create(FirePreparationApp.prototype),{actor:f.actor,weapon:f.weapon(),attack});assert.match(app._proximityReason(),/RoF/);await assert.rejects(f.shoot());
});

const ROF_ONE=['Area Defense Laser','Dinosaur Laser','Laser Cannon','Point Defense Laser','Strike Laser'];
for(const name of ROF_ONE)for(const isGM of [false,true])for(const lang of ['ru','en'])
 test(`${name}: Blue-Green denied at source RoF 1, ${isGM?'GM':'PLAYER/OWNER'}, ${lang}`,async()=>{
  const previous={user:game.user,lang:game.i18n.lang};game.user={id:isGM?'gm':'player-owner',isGM};game.i18n.lang=lang;
  try{
   const p=Object.values(BEAM_PROFILES).find(p=>p.name===name),f=await gaussFixture(p.modeId);await f.battery();
   const original=f.state(),baseline=f.profile();
   assert.equal(laserModificationAdmission(p.modeId).blueGreen,false);
   const html=laserModificationsHTML(p.modeId,DEFAULT,x=>x);
   assert.match(html,/<option value="blueGreen" disabled>/);assert.match(html,/Blue-Green.*RoF 1/);
   await assert.rejects(configure(f,{construction:'blueGreen'}),/RoF 1/);assert.deepEqual(f.state(),original);
   // A hand-edited Actor name and inflated runtime RoF never authorize a source-RoF1 model.
   const legacy=f.state();legacy.weapons[0].name='Laser Pistol';legacy.weapons[0].laserModifications={...DEFAULT,construction:'blueGreen'};
   legacy.shotReceipts={historical:{profile:structuredClone(baseline)}};
   await f.actor.setFlag('world','gurpsAmmoManager',legacy);const before=f.state();
   const draft=new WeaponConfigurationDraft({actor:f.actor,state:f.state(),attacks:[],existing:f.weapon(),catalogs});
   assert.doesNotThrow(()=>draft.previewStats());assert.deepEqual(f.state(),before);
   assert.match(laserModificationsHTML(p.modeId,draft.laserDraft().value,x=>x),/<option value="blueGreen" selected disabled>/);
   const flagsBefore=structuredClone(f.flags);await assert.rejects(draft.commit({id:f.weapon().id}),/RoF 1/);
   assert.deepEqual(f.flags,flagsBefore);draft.laserDraft().changed=true;
   const profile=f.profile({rawAttack:{...f.attack().data,rof:'10'}});assert.equal(profile.damage.nativeSafe,false);assert.match(profile.damage.reason,/RoF 1/);
   await assert.rejects(f.shoot());
   await assert.rejects(f.service.setLaserConfiguration(f.weapon().id,{laserMode:'beam'}),/RoF 1/);
   // Even a formerly prepared valid profile cannot bypass validation against current persisted flags.
   let executed=false;
   await assert.rejects(f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),prepare:()=>({amount:1,profile:baseline}),execute:async()=>{executed=true;return {rolled:true};}}),/RoF 1/);
   assert.equal(executed,false);assert.deepEqual(f.state(),before);
   draft.laserDraft().value={...DEFAULT,construction:'standard'};
   const corrected=await draft.commit({id:f.weapon().id});await f.service.saveState(corrected.state);
   assert.deepEqual(readWeaponBattery(f.weapon()),readWeaponBattery(before.weapons[0]));
   assert.deepEqual(f.state().shotReceipts,before.shotReceipts);assert.equal(f.profile().damage.nativeSafe,true);
   const shot=await f.shoot();assert.equal(shot.receipt.power.spent,1);assert.deepEqual(f.state().shotReceipts.historical,before.shotReceipts.historical);
   const brief=ammunitionChatData(f.profile());assert.ok(brief.lines.join(' ').length<650);
  }finally{game.user=previous.user;game.i18n.lang=previous.lang;}
 });
test('two copies on one Actor retain distinct installed hardware, modes and energy',async()=>{
 const f=await gaussFixture(PISTOL);await f.battery();const d=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged'});d.selectModel(catalogs.getEquipmentForMode(PISTOL).equipment_id);d.modeIds=new Set([PISTOL]);
 const record=await new StandaloneWeaponService(f.actor,catalogs).save(d);await f.service.loadState();const state=f.state(),second=state.weapons.find(w=>w.standaloneWeaponId===record.id);second.laserModificationRequest={...DEFAULT,beamPulse:true};await f.service.saveState(state);
 await f.service.replaceBattery(second.id,{requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(f.state().weapons.find(w=>w.id===second.id)),nonRechargeable:false});await f.service.setLaserConfiguration(second.id,{laserMode:'pulse'});
 assert.equal(f.weapon().laserModifications,undefined);assert.equal(laserAvailableModes(f.weapon()).length,1);assert.equal(readWeaponBattery(f.weapon()).charge,33);assert.equal(f.state().weapons.find(w=>w.id===second.id).laserMode,'pulse');
});
