import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {UT_ORDINARY_PROFILES as P,projectUTOrdinaryData} from '../scripts/ut-ordinary-melee-source.js';
import {StandaloneWeaponService,StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,listStandaloneAttacks} from '../scripts/tools/standalone-attack-service.js';
import {resolveMeleeProfile,MeleeProfileService,meleeProfileContext,readMeleeProfileSelection} from '../scripts/tools/melee-profile-service.js';
import {meleeProfileEditorHTML,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
import {meleeCombatControls} from '../scripts/tools/melee-combat-controls.js';
import {collectMeleeAttacks} from '../scripts/tools/melee-assistant-state.js';
import {prepareEffectiveMeleeDamage as nativePrepare,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {loadUTM29,buildUTM29} from '../tools/build-ut-m29-audit.mjs';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/ut-ordinary-m29.json',import.meta.url),'utf8')).modes;
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(skills={Shortsword:16,'Axe/Mace':16,Boxing:16,Brawling:16,Karate:16,'Force Sword':16,Staff:16}){
 const flags={};return {id:crypto.randomUUID(),isOwner:true,system:{ads:{},attributes:{ST:{value:12,import:12},DX:{value:12}},swing:'1d+2',thrust:'1d-1',skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,import:level,points:4}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);}};
}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(P[id].equipmentId);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
async function prepareEffectiveMeleeDamage({actor,attack}){const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(attack.damage);if(m)attack={...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}};return nativePrepare({actor,attack});}
async function preview(a,raw,selection={}){const attack=resolveMeleeProfile({actor:a,attack:raw,selection});assert.equal(attack.readinessReason??null,null);return {attack,damage:await prepareEffectiveMeleeDamage({actor:a,attack})};}
for(const [id,source,formula,reach,parry,st,hands,skill]of vectors)test('M2.9 source vector '+id,async()=>{
 const a=actor(),before=JSON.stringify(a.system),raw=await weapon(a,id),selection={weaponTL:12,...(P[id].requiresVariable?{blade:'variable-force-sword'}:{})},r=await preview(a,raw,selection);
 assert.equal(P[id].stats.damage,source);assert.equal(r.damage.formula,formula);assert.equal(r.attack.reach,reach);assert.equal(P[id].stats.parry,parry);assert.equal(r.attack.st,st);assert.equal(r.attack.meleeProfile.strength.hands,hands);
 assert.equal(r.attack.meleeProfile.skill.name,skill);assert.equal(r.attack.level,16);assert.equal(r.attack.meleeProfile.quality.mass,P[id].mass);assert.equal(JSON.stringify(a.system),before);
 assert.equal(meleeCombatControls(a,raw).profile.equipmentId,P[id].equipmentId);
});
test('M2.9 Force Sword defaults use DX-5 and all actual sword skills, with no invented Sword skill',async()=>{
 for(const name of ['Broadsword','Shortsword','Two-Handed Sword','Rapier','Saber','Smallsword','Jitte/Sai','Knife','Main-Gauche']){const a=actor({[name]:18}),r=await preview(a,await weapon(a,'wDySTsgiygu6nSRFu'));assert.equal(r.attack.level,15);assert.equal(r.attack.meleeProfile.skill.defaultPenalty,-3);}
 const a=actor({}),r=await preview(a,await weapon(a,'wKrl1D1iujaCX9ssm'));assert.equal(r.attack.level,7);assert.equal(r.damage.formula,'8d(5) burn');
});
test('M2.9 Karatand unarmed bonus is once per chosen learned skill and never stacks fist-load items',async()=>{
 const a=actor(),raw=await weapon(a,'wQn8_zVA--bjjKSQp');for(const [skill,formula]of [['Brawling','1d cr'],['Boxing','1d+1 cr'],['Karate','1d+1 cr'],['DX','1d-1 cr']])assert.equal((await preview(a,raw,{skill})).damage.formula,formula);
 a.system.equipment={carried:{other:{name:'Brass Knuckles',count:8}}};assert.equal((await preview(a,raw,{skill:'Brawling'})).damage.formula,'1d cr');
});
test('M2.9 Morph forms share one physical definition and consistent price/mass; Superfine is typed and individual TL only',async()=>{
 const a=actor(),raw=await weapon(a,'wg9K3Yi69WdSCaeKP'),s=new MeleeProfileService(a);for(const [id,formula]of [['wg9K3Yi69WdSCaeKP','1d+5(2) cut'],['wUTM29MorphImp','1d+5(2) imp'],['wUTM29MorphCr','1d+3 cr']]){const r=await preview(a,raw,{modeId:id,weaponTL:'10',blade:'superfine'});assert.equal(r.damage.formula,formula);const p=await s.save(raw,{modeId:id,weaponTL:'10',blade:'superfine'});assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:p})).formula,formula);assert.equal(p.meleeProfile.quality.price,3000);assert.equal(p.meleeProfile.quality.mass,2);}assert.equal(new StandaloneWeaponService(a,catalogs).list().length,1);await assert.rejects(s.save(raw,{weaponTL:8,blade:'superfine'}));
});
test('M2.9 Variable Force Sword is opt-in, costs +500 once, keeps same ID and hides unpaid variants',async()=>{
 const a=actor(),raw=await weapon(a,'wKrl1D1iujaCX9ssm'),s=new MeleeProfileService(a);assert.equal(listStandaloneAttacks(a,'melee').length,1);await assert.rejects(s.save(raw,{modeId:'wUTM29VariableForceC'}));
 let p=await s.save(raw,{blade:'variable-force-sword',modeId:'wUTM29VariableForceC',weaponTL:11});assert.equal(p.reach,'C');assert.equal(p.meleeProfile.quality.price,10500);assert.equal(listStandaloneAttacks(a,'melee').length,4);
 p=await s.save(raw,{modeId:'wUTM29VariableForce2'});assert.equal(p.reach,'2');assert.equal(p.meleeProfile.quality.price,10500);assert.equal(new StandaloneWeaponService(a,catalogs).list().length,1);
 const selection=selectMeleeEditorProfile(meleeProfileContext(a,raw),readMeleeProfileSelection(a,raw),'blade','',a,raw);assert.equal(selection.modeId,'wKrl1D1iujaCX9ssm');await s.save(raw,selection);assert.equal(listStandaloneAttacks(a,'melee').length,1);
});
test('M2.9 energy and device bodies reject Fine, Superfine and unsupported materials; fixed Damage ignores ST',async()=>{
 for(const id of ['wDySTsgiygu6nSRFu','wKrl1D1iujaCX9ssm','wKaBftlfcmfO4Q3ph']){const a=actor(),raw=await weapon(a,id),s=new MeleeProfileService(a);for(const selection of [{quality:'Fine'},{blade:'superfine',weaponTL:12},{material:'silver'},{blade:'nanothorn'}])await assert.rejects(s.save(raw,selection));a.system.attributes.ST.value=1;a.system.swing='1d-5';assert.equal((await preview(a,raw,{weaponTL:12})).damage.formula,P[id].stats.damage);}
});
test('ST-P1 UT ordinary shortage uses the shared resolver with published hands/readiness data',async()=>{
 const a=actor(),raw=await weapon(a,'wKaBftlfcmfO4Q3ph');a.system.attributes.ST.value=3;const p=(await preview(a,raw)).attack;assert.equal(p.level,12);assert.equal(p.meleeProfile.strength.minimumST,7);assert.equal(p.meleeProfile.strength.maximumST,21);assert.equal(p.meleeProfile.strength.minimumSTPenaltyDeferred,undefined);assert.equal(p.meleeProfile.weaponStrength.proposedDelta,-4);
});
test('M2.9 inactive Glaive switches skill, ST Damage and Parry while keeping one device',async()=>{
 const a=actor(),raw=await weapon(a,'wKaBftlfcmfO4Q3ph');const staff=await preview(a,raw,{modeId:'wUTM29GlaiveStaffSw'});assert.equal(staff.attack.parry,'13');assert.equal(staff.attack.meleeProfile.skill.name,'Staff');assert.equal(staff.damage.formula,'1d+4 cr');assert.equal(staff.damage.action.damagetype,'cr');assert.equal(staff.attack.meleeProfile.utOrdinary.unpowered,true);assert.equal(staff.attack.meleeProfile.quality.price,14000);
});
test('M2.9 electric mechanical Damage stays unchanged with the explicit M2.10 linked E30 contract',async()=>{
 const a=actor(),raw=await weapon(a,'w7bLtfJugrIOJS70U'),r=await preview(a,raw),p=freezeMeleeAttackProfile({actor:a,attack:r.attack,preparedDamage:r.damage});assert.equal(p.damage.formula,'1d+2 cr');assert.equal(p.damage.rules.resistanceEffect.modifier,-5);assert.equal(p.damage.rules.resistanceEffect.armorDivisor,0.5);assert.equal(p.damage.rules.utExotic.linked,true);assert.equal(p.damage.rules.meleeSnapshot.action.next,undefined);assert.match(meleeCombatControls(a,raw).hint,/HT-5/);assert.match(meleeCombatControls(a,raw).hint,/эррата E30/);assert.match(meleeCombatControls(a,raw).hint,/HT-5\(0.5\)/);assert.equal(catalogs.getMode('wlS0B4WAeFSbjpx1U').raw_calc.damage,'HT-5(0.5) aff');assert.equal(a.getFlag('world','gurpsAmmoManager'),undefined);
});
test('M2.9 exact native GGA identity and imported Karatand totals are preserved once',async()=>{
 const a=actor();a.system.equipment={carried:{a:{uuid:'physical-karatand',originaluuid:'ef55nM_NrfAgS_Cam',name:'Custom hand'}}};a.system.melee={a:{uuid:'wQn8_zVA--bjjKSQp',parentuuid:'physical-karatand',name:'Custom hand',mode:'Imported GGA punch',damage:'1d+1 cr',level:17,reach:'C',parry:'11',pageref:'UT163'}};const before=JSON.stringify(a.system),raw=collectMeleeAttacks(a)[0],r=await preview(a,raw);assert.equal(r.attack.level,17);assert.equal(r.damage.formula,'1d+1 cr');const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.attack,preparedDamage:r.damage}),{attackId:'a',messageId:'m'});assert.equal(shot.profile.mode.mode,'Imported GGA punch');assert.equal(shot.profile.damage.rules.meleeSnapshot.combatProfile.modeId,raw.catalogBinding.modeId);assert.equal(JSON.stringify(a.system),before);
});
test('M2.11 imported Karatand and Brass Knuckles rebuild only after an explicit permitted skill choice',async()=>{
 for(const [equipmentId,modeId]of [['ef55nM_NrfAgS_Cam','wQn8_zVA--bjjKSQp'],['eN_f8tX490hHeJC52','wFrA_h5gC4PZ1uxLj']]){
  const a=actor({Brawling:14,Boxing:14,Karate:13});a.system.equipment={carried:{a:{uuid:'physical-fist-load',originaluuid:equipmentId,name:'Custom accessory'}}};a.system.melee={a:{uuid:modeId,parentuuid:'physical-fist-load',name:'Custom accessory',mode:'GGA punch',damage:'1d+1 cr',level:14,reach:'C',parry:'10',pageref:equipmentId==='ef55nM_NrfAgS_Cam'?'UT163':'LT65'}};
  const before=JSON.stringify(a.system),raw=collectMeleeAttacks(a)[0];assert.equal((await preview(a,raw)).damage.formula,'1d+1 cr');
  const context=meleeProfileContext(a,raw,{sourceModeId:modeId});assert.ok(context.source.unarmedSkillBonus);
  for(const [skill,formula]of [['DX','1d-1 cr'],['Brawling','1d cr'],['Boxing','1d+1 cr'],['Karate','1d+1 cr']]){const attack=resolveMeleeProfile({actor:a,attack:raw,selection:{skill},context}),damage=await prepareEffectiveMeleeDamage({actor:a,attack});assert.equal(damage.formula,formula,equipmentId+' '+skill);assert.equal(attack.meleeProfile.damageSkill.alreadyIncluded,false);}
  assert.equal(JSON.stringify(a.system),before);
 }
});
test('M2.9 frozen Glaive history survives current configuration, ST and TL changes, with native AD and conditions',async()=>{
 const a=actor(),raw=await weapon(a,'wKaBftlfcmfO4Q3ph'),r=await preview(a,raw),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.attack,preparedDamage:r.damage}),{attackId:'a',messageId:'m'}),saved=JSON.stringify(shot);await new MeleeProfileService(a).save(raw,{modeId:'wUTM29GlaiveStaffThr',weaponTL:12});a.system.attributes.ST.value=50;assert.equal(JSON.stringify(shot),saved);assert.equal(shot.profile.damage.formula,'9d(5) burn');assert.match(shot.profile.damage.rules.utOrdinary.manualHints.join(' '),/Force Parry/);
});
test('M2.9 two instances persist separate variable configuration and reject stale/non-OWNER writes',async()=>{
 const a=actor(),one=await weapon(a,'wKrl1D1iujaCX9ssm'),two=await weapon(a,'wKrl1D1iujaCX9ssm'),s=new MeleeProfileService(a);await s.save(one,{modeId:'wUTM29VariableForceC',blade:'variable-force-sword',weaponTL:11});await s.save(two,{weaponTL:12});assert.equal(readMeleeProfileSelection(a,one).blade,'variable-force-sword');assert.equal(readMeleeProfileSelection(a,two).blade,'');await assert.rejects(s.save(one,{weaponTL:12},{expectedRevision:0}));a.isOwner=false;await assert.rejects(s.save(two,{weaponTL:11}));
});
test('M2.9 existing editor renders variable selection without new controls, and source (?) includes full conditions',async()=>{
 const a=actor(),raw=await weapon(a,'wKrl1D1iujaCX9ssm'),context=meleeProfileContext(a,raw),html=meleeProfileEditorHTML(context,{blade:'variable-force-sword',modeId:'wUTM29VariableForceC',weaponTL:11},String,a,raw);assert.match(html,/Variable Force Sword \(\+\$500\)/);assert.match(html,/10500/);assert.ok(meleeCombatControls(a,raw).hint.includes(P.wKrl1D1iujaCX9ssm.hints[0]));
});
test('M2.9 source projection is idempotent, preserves all LT/HT and does not create physical equipment',async()=>{
 const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8')),out=structuredClone(raw);projectUTOrdinaryData('weapons',out);assert.equal(out.equipment.length,raw.equipment.length);for(const e of raw.equipment.filter(e=>e.source!=='UT'))assert.deepEqual(out.equipment.find(x=>x.equipment_id===e.equipment_id),e);const once=structuredClone(out);projectUTOrdinaryData('weapons',out);assert.deepEqual(out,once);
});
const input=await loadUTM29(),audit=buildUTM29(input);
test('M2.9 legacy same-instance read-through adds variants without rewriting a saved custom snapshot',async()=>{
 const a=actor(),raw=await weapon(a,'wKrl1D1iujaCX9ssm'),state=a.getFlag('olegurps-qol','standaloneWeapons'),r=state.weapons[0];r.modes=r.modes.filter(m=>m.modeId==='wKrl1D1iujaCX9ssm');const snap=r.modes[0].snapshot;delete snap.ut_ordinary_contract;snap.raw_calc.damage='10d(5) burn';snap.stats.damage={base:'10d',armor_divisor:5,type:'burn'};snap.stats.reach='3';snap.usage='Custom saved';
 await a.setFlag('olegurps-qol','standaloneWeapons',state);const saved=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),loaded=new StandaloneWeaponService(a,catalogs).get(raw.standaloneRef.weaponId);assert.equal(loaded.modes.length,4);assert.equal(loaded.modes[0].snapshot.raw_calc.damage,'10d(5) burn');assert.equal(loaded.modes[0].snapshot.stats.reach,'3');assert.equal(loaded.modes[0].snapshot.usage,'Custom saved');assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),saved);assert.equal((await preview(a,readStandaloneAttack(a,loaded.id,'wKrl1D1iujaCX9ssm'))).damage.formula,'10d(5) burn');
});
const completeIds=new Set(['ut:heavy-flashlight','ut:karatand','ut:morph-axe','ut:force-blade','ut:force-sword','ut:force-glaive']);
const partialIds=new Set(['ut:electric-stun-wand','ut:neurolash-baton','ut:neurolash-whip']);
for(const row of audit.rows)test('M2.9 individual UT classification '+row.modelId,()=>{
 const source=input.models.find(m=>m.id===row.modelId);assert.equal(source.book,'UT');assert.equal(row.sourceName,source.sourceName);assert.equal(row.historicalScope,source.scope);assert.deepEqual(row.equipmentIds,source.equipmentIds);assert.ok(row.sourcePages.length&&row.transferReason);
 assert.equal(row.status,completeIds.has(row.modelId)?'NUMERIC_COMPLETE_M2_9':partialIds.has(row.modelId)?'PARTIAL_SPECIAL_M2_10':['ut:gripboots','ut:reactive-armor-robofac-nanomorph'].includes(row.modelId)?'DEFERRED_TO_M2_11':'DEFERRED_TO_M2_10');
 for(const id of row.implementedM29ModeIds)assert.equal(P[id].modelId,row.modelId);
 if(row.industrialCombatConfirmed)assert.match(row.transferReason,/combat melee/);
 if(row.modelId==='ut:monowire-switchblade'){assert.match(row.individualSourceNote.text,/\+R/);assert.match(row.individualSourceNote.text,/конфликт/);}
 if(row.modelId==='ut:force-whip')assert.match(row.individualSourceNote.text,/Force Sword/);
});
test('M2.9 full 42-identity reconciliation keeps UT open, all 18 numeric profiles and exact scope counts',()=>{
 assert.equal(audit.rows.length,42);assert.equal(new Set(audit.rows.map(r=>r.modelId)).size,42);assert.deepEqual(audit.summary.scopes,{melee:34,deferred:1,'conditional-contact':1,implant:4,'character-template':1,'worn-weapon':1});assert.equal(audit.summary.allUTComplete,false);assert.equal(audit.summary.mandatoryUnfinishedM29OrdinaryAttacks,0);assert.equal(Object.keys(audit.modeContracts).length,18);assert.equal(audit.unresolvedSourceConflicts.length,2);assert.equal(audit.approvedErrata[0].id,'E30');
});
