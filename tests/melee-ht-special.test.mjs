import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {HT_SPECIAL_PROFILES as P,HT_WORK_PROCEDURES,HT_CONTACT_EFFECT,htSprayEffect,htCombinedEquipment,projectHTSpecialData} from '../scripts/ht-special-melee-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,standaloneAmmoCarriers,searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,listStandaloneAttacks} from '../scripts/tools/standalone-attack-service.js';
import {resolveMeleeProfile,meleeProfileContext,MeleeProfileService} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {collectMeleeAttacksWithBodyContract as collectMeleeAttacks} from './helpers/melee-body-collection.mjs';
import {resistanceEffect,resistanceOutcome,visionResistanceModifier} from '../scripts/tools/resistance-roll.js';
import {shotDamageComponents} from '../scripts/tools/damage-shot-link.js';
import {meleeCombatControls} from '../scripts/tools/melee-combat-controls.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {loadHTM28,buildHTM28} from '../tools/build-ht-m28-audit.mjs';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/ht-special-m28.json',import.meta.url),'utf8')).modes;
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();globalThis.OleGURPSQOL={catalogs};
const names=[...new Set(Object.values(P).flatMap(p=>p.primarySkills).concat(['Liquid Projector/TL7 (Sprayer)','Liquid Projector/TL8 (Sprayer)','Guns/TL5 (Pistol)','Guns/TL8 (Pistol)']))].filter(n=>n!=='DX');
function actor(levels=null){const flags={};return {id:crypto.randomUUID(),isOwner:true,writes:0,system:{ads:{},attributes:{ST:{value:12,import:12},DX:{value:12},HT:{value:12}},swing:'1d+2',thrust:'1d-1',skills:Object.fromEntries(Object.entries(levels??Object.fromEntries(names.map(n=>[n,16]))).map(([name,level],i)=>[i,{name,level,points:4}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);this.writes++;}};}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
async function preview(a,raw,selection={weaponTL:6}){const p=resolveMeleeProfile({actor:a,attack:raw,selection});assert.equal(p.readinessReason??null,null,p.readinessReason);if(p.meleeProfile.htSpecial.instructionOnly)return {p,prepared:null};const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(p.damage);if(m){p.sourceDamage=p.damage;p.damageAction={type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]};}const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:p});assert.ok(prepared,p.damage);return {p,prepared};}
for(const row of vectors)test('M2.8 printed numeric/procedure contract '+row.modeId,async()=>{
 const p=P[row.modeId],v=row.expected,a=actor(),raw=await weapon(a,row.modeId),before=JSON.stringify(a.system),writes=a.writes;
 assert.deepEqual(p.stats,{damage:v.damage,reach:v.reach,parry:v.parry,st:v.st});assert.deepEqual(p.primarySkills,v.skills);assert.equal(p.hands,v.hands);
 const r=await preview(a,raw);assert.equal(r.prepared?.formula??null,v.formulaST12);assert.equal(r.p.level,v.levelST12);assert.equal(r.p.meleeProfile.strength.hands,v.hands);
 const profile=freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared});assert.equal(profile.damage.formula,v.formulaST12??'spec.');assert.equal(profile.damage.rules.instructionOnly===true,!v.formulaST12);
 assert.ok(profile.damage.rules.htSpecial.manualHints.length);if(p.resistanceEffect){assert.ok(resistanceEffect(profile.damage.rules.resistanceEffect));assert.equal(profile.context.resistanceApplicable,true);}
 assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.system),before);
});
const input=await loadHTM28(),matrix=buildHTM28(input);
for(const row of matrix.rows)test('M2.8 individual source conclusion '+row.modelId,()=>{
 assert.ok(['NUMERIC_COMPLETE','ASSISTED_MANUAL','MANUAL_SOURCE_ONLY'].includes(row.status));assert.ok(row.reason&&row.sourcePages.length);assert.equal(row.mandatoryUnfinishedConfirmedRules.length,0);
 if(row.workingProcedure){assert.equal(row.status,'MANUAL_SOURCE_ONLY');assert.equal(row.modeIds.length,0);for(const id of row.workingProcedure.modeIds){const m=catalogs.getMode(id);assert.equal(m.hidden,true);assert.equal(m.ht_work_only,true);assert.ok(m.ht_tool_manual);assert.equal(P[id],undefined);}}
 else {assert.ok(row.modeIds.length);for(const id of row.modeIds)assert.ok(P[id]);}
});
for(const row of matrix.additional)test('M2.8 additional classification '+row.modelId,()=>{assert.equal(row.status,'MANUAL_SOURCE_ONLY');assert.equal(row.implemented,false);assert.ok(row.numericSource&&row.reason&&row.sourcePages.length);assert.ok(!Object.values(P).some(p=>p.modelId===row.modelId));});
test('M2.8 23 exact deferred IDs and all 105 historical HT IDs are reconciled once',()=>{
 const ids=input.m27.rows.filter(r=>r.status==='DEFERRED_TO_M2_8').map(r=>r.modelId);assert.equal(ids.length,23);assert.deepEqual(new Set(matrix.rows.map(r=>r.modelId)),new Set(ids));assert.equal(matrix.highTechCloseout.length,105);assert.equal(new Set(matrix.highTechCloseout.map(r=>r.modelId)).size,105);assert.equal(matrix.summary.fullHTProcedureAutomation,false);
});
test('M2.8 all exact source modes have one independent fixture and books are not runtime dependencies',()=>{assert.equal(vectors.length,29);assert.deepEqual(new Set(vectors.map(v=>v.modeId)),new Set(Object.keys(P)));assert.ok(Object.isFrozen(P));assert.equal(Object.values(P).filter(p=>!p.instructionOnly).length,23);for(const p of Object.values(P))assert.ok(catalogs.getMode(p.modeId));});
test('M2.8 four Chainsaws keep exact physical IDs, source ST, running-state conditions and hard-target AD',()=>{
 const rows=Object.values(P).filter(p=>p.modelId==='ht:chainsaw');assert.equal(rows.length,8);assert.equal(new Set(rows.map(p=>p.equipmentId)).size,4);for(const p of rows){assert.match(p.hints.join(' '),/перезапуска|запуска/);assert.match(p.hints.join(' '),/1d/);assert.ok(['11‡','10‡'].includes(p.stats.st));assert.equal(p.stats.parry,'0U');}
 assert.ok(matrix.chainsawBrokenResolution.formulaOnlyM0WasInsufficient);assert.ok(matrix.chainsawBrokenResolution.eliminated.length>=4);
});
test('M2.8 Chainsaw native formula, conditional AD and manual Bond freeze without repeat damage cycles',async()=>{
 const a=actor(),raw=await weapon(a,'wCqDJeFrsa89Srp2B'),r=await preview(a,raw,{modeId:'wHTM28HardwCqDJeFrsa89Srp2B',weaponTL:7});const calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:r.p.level,weaponBond:true,rapidStrikePenalty:-3});assert.equal(calc.effectiveSkill,14);
 const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m28-chain',messageId:'chain-message'}),before=JSON.stringify(shot);await new MeleeProfileService(a).save(raw,{modeId:'wCqDJeFrsa89Srp2B'});a.system.attributes.ST.value=20;assert.equal(JSON.stringify(shot),before);assert.equal(shot.profile.damage.formula,'2d+2(0.5) cut');assert.equal(shot.profile.damage.rules.meleeSnapshot.action.next,undefined);assert.equal(Object.keys(a.system.ads).length,0);
});
test('M2.8 powered chain, stun body and glove never inherit blade Fine or Superfine',async()=>{
 for(const id of ['wCqDJeFrsa89Srp2B','w1zkFGwJ7YaiXlcH-','wHTM28SedgleyPunch']){const a=actor(),raw=await weapon(a,id);assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{quality:'Fine',weaponTL:9}}).readinessReason);assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{blade:'superfine',weaponTL:9}}).readinessReason);}
});
test('M2.8 electrical contact is separate from burn/crushing, carries AD0.5, duration and no automatic statuses',async()=>{
 const effect=resistanceEffect(HT_CONTACT_EFFECT);assert.equal(effect.attribute,'HT');assert.equal(effect.modifier,-3);assert.equal(effect.armorDivisor,0.5);assert.equal(visionResistanceModifier(effect,{}).modifier,-3);assert.match(effect.brief,/заземлении.*\+2/);
 const native={finaltarget:9,origtarget:12,rtotal:12,margin:-3,isCritSuccess:false,isCritFailure:false,failure:true};const r=resistanceOutcome(effect,native);assert.match(r.consequence,/20−HT/);assert.match(r.consequence,/вручную/);
 for(const id of ['wj_F3_STE7-LTGd0Z','w1zkFGwJ7YaiXlcH-']){const a=actor(),raw=await weapon(a,id),p=await preview(a,raw);assert.ok(!p.prepared.action.next);assert.equal(p.p.meleeProfile.htSpecial.resistanceEffect.modifier,-3);assert.ok(meleeCombatControls(a,raw).hint.includes(HT_CONTACT_EFFECT.brief),'Existing (?) exposes source conditions, not just source page');}
});
test('M2.8 Stun Gun has a real contact Attack but no fabricated physical Damage',async()=>{const a=actor(),r=await preview(a,await weapon(a,'wWTX_8slOTBzVDG7f'));assert.equal(r.prepared,null);const p=freezeMeleeAttackProfile({actor:a,attack:r.p});assert.equal(p.damage.formula,'spec.');assert.equal(p.damage.rules.meleeSnapshot.action,null);assert.equal(p.damage.components.length,0);assert.equal(catalogs.getEquipment('eW-zph_pMipl-ErCS').tech_level,'8');});
test('M2.8 sprays use two explicit resistance checks and published duration, not burn/tox or cloud substitution',()=>{
 const t=htSprayEffect(false),p=htSprayEffect(true);assert.deepEqual(t.chemical.checks.map(c=>c.modifier),[-2,-2]);assert.deepEqual(p.chemical.checks.map(c=>c.modifier),[-4,-4]);assert.match(t.brief,/MoF/);assert.match(p.brief,/удаления/);assert.match(p.chemical.protection,/−3 DX/);assert.match(p.chemical.protection,/−6 combat/);assert.ok(resistanceEffect(t));assert.ok(resistanceEffect(p));
});
test('M2.8 HT180 face -5 and wide jet +2 are applied once without range penalties or duplicate defaults',async()=>{
 const a=actor(),r=await preview(a,await weapon(a,'wphfSIVv80OHomve0'));assert.equal(r.p.level,16);const c=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:16,hitLocationPenalty:-5});assert.equal(c.effectiveSkill,13);assert.equal(c.channels.find(c=>c.id==='ammunitionConstruction').resolvedValue,2);
 const b=actor({});const d=await preview(b,await weapon(b,'wphfSIVv80OHomve0'));assert.equal(d.p.level,8);assert.equal(d.p.meleeProfile.skill.defaultPenalty,-4);assert.ok(!d.p.skillDescription.includes('undefined'));
});
test('M2.8 a combined definition appears in both lists with one ID, unchanged source and one carrier',async()=>{
 for(const id of ['wk0vCihcCMUm3nBat','wi2aw3XWqi2XEckOq','wMAtvC24PXfeg5608','wHTM28CondorTonfaSwing']){const a=actor(),raw=await weapon(a,id),svc=new StandaloneWeaponService(a,catalogs),record=svc.get(raw.standaloneRef.weaponId);assert.equal(svc.list().length,1);assert.equal(record.type,'ranged');assert.ok(htCombinedEquipment(record.source.equipmentId));const melee=listStandaloneAttacks(a,'melee'),ranged=listStandaloneAttacks(a,'ranged');assert.ok(melee.length>=2&&ranged.length===1);assert.ok(melee.every(r=>r.standaloneRef.combatType==='melee'));assert.equal(ranged[0].standaloneRef.combatType,'ranged');const carriers=standaloneAmmoCarriers(record);assert.equal(carriers.length,1);assert.equal(carriers[0].standaloneWeaponId,record.id);assert.equal(carriers[0].ammunitionInventory.magazines[0].capacity,1);assert.equal(carriers[0].ammunitionInventory.magazines[0].rounds,0);assert.equal(carriers[0].standaloneModeId,ranged[0].standaloneRef.modeId);}
});
test('M2.8 legacy melee-only combined records gain same-instance ranged modes read-only',async()=>{
 const a=actor(),raw=await weapon(a,'wi2aw3XWqi2XEckOq'),state=a.getFlag('olegurps-qol','standaloneWeapons');state.weapons[0].type='melee';state.weapons[0].modes=state.weapons[0].modes.filter(m=>m.snapshot.combat_type==='melee');state.weapons[0].resourceLinks={};await a.setFlag('olegurps-qol','standaloneWeapons',state);const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),writes=a.writes;assert.equal(new StandaloneWeaponService(a,catalogs).get(raw.standaloneRef.weaponId).modes.filter(m=>m.snapshot.combat_type==='ranged').length,1);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);assert.equal(a.writes,writes);
});
test('M2.8 NRS-2 keeps printed Acc0 and exact firing identity; blade flags do not alter the gun',async()=>{
 const a=actor(),raw=await weapon(a,'wi2aw3XWqi2XEckOq'),range=listStandaloneAttacks(a,'ranged')[0],before=JSON.stringify(range.data);assert.equal(range.acc,0);assert.equal(range.damage,'2d+1 pi-');await new MeleeProfileService(a).save(raw,{weaponTL:8,quality:'Fine',grip:'reversed'});assert.equal(JSON.stringify(listStandaloneAttacks(a,'ranged')[0].data),before);assert.match(P.wi2aw3XWqi2XEckOq.hints.join(' '),/предохранитель/);
});
test('M2.8 AM-402T inherits only exact published AM-402 cartridge links and actual Tonfa parameters',()=>{
 const a=new AmmunitionCompatibilityService(catalogs),id='WHTM28CondorTonfaFired';assert.deepEqual(catalogs.getModeLinks(id).ammoItemIds,catalogs.getModeLinks('Wx10NaVSr1cp1bwKv').ammoItemIds);for(const ammo of catalogs.getModeLinks(id).ammoItemIds)assert.equal(a.checkCompatibility(id,ammo,{book:'ht',kind:'ammo-item'}).status,'compatible');assert.equal(a.checkCompatibility(id,'ht_7_62x42mm',{book:'ht',kind:'ammo-item'}).status,'incompatible');assert.equal(catalogs.getEquipmentForMode(id).equipment_id,'eHTM28CondorAM402T');assert.equal(P.wHTM28CondorTonfaSwing.stats.st,'7');
});
test('M2.8 Condor gas is a shared-device explicit procedure, never a projectile Damage or automatic spend',async()=>{
 const a=actor(),raw=await weapon(a,'wMAtvC24PXfeg5608'),before=JSON.stringify(a.getFlag('world','gurpsAmmoManager')),r=await preview(a,raw,{modeId:'wHTM28CondorGaseYVTJmA7RUE6xrlls'});assert.equal(r.prepared,null);assert.equal(r.p.level,16);const p=freezeMeleeAttackProfile({actor:a,attack:r.p});assert.equal(p.damage.rules.instructionOnly,true);assert.match(p.damage.rules.htSpecial.manualHints.join(' '),/Списать/);assert.equal(JSON.stringify(a.getFlag('world','gurpsAmmoManager')),before);
});
test('M2.8 combined blade upgrades do not multiply the whole firearm price or affect gun-body Damage',async()=>{
 const a=actor(),raw=await weapon(a,'wi2aw3XWqi2XEckOq'),r=await preview(a,raw,{weaponTL:8,quality:'Fine'});assert.equal(r.prepared.formula,'1d imp');assert.equal(r.p.meleeProfile.quality.price,null);assert.equal(listStandaloneAttacks(a,'ranged')[0].damage,'2d+1 pi-');
});
test('M2.8 Sedgley has one Attack and two explicit frozen Damage components without an automatic linked action',async()=>{
 const a=actor(),r=await preview(a,await weapon(a,'wHTM28SedgleyPunch')),profile=freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),shot=createShotSnapshot(profile,{attackId:'sedgley',messageId:'sedgley-message'}),message={id:'sedgley-message',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:shot}}};
 assert.equal(profile.damage.rules.meleeSnapshot.action.next,undefined);assert.equal(profile.damage.rules.htSpecial.manualLinkedAction.formula,'2d-1');assert.deepEqual(profile.damage.components.map(c=>[c.role,c.formula]),[['kinetic','1d-1 cr'],['linked','2d-1 pi']]);assert.equal(shotDamageComponents(message,{}).find(c=>c.role==='linked').formula,'2d-1 pi');assert.match(profile.damage.rules.htSpecial.manualHints.join(' '),/dodged/);assert.match(profile.damage.rules.htSpecial.manualHints.join(' '),/parried/);
});
test('M2.8 linked bullet and punch snapshots survive ST, mode, TL and skill changes',async()=>{
 const a=actor(),raw=await weapon(a,'wHTM28SedgleyPunch'),r=await preview(a,raw),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'frozen',messageId:'frozen-message'}),before=JSON.stringify(shot);a.system.attributes.ST.value=20;await new MeleeProfileService(a).save(raw,{weaponTL:8,skill:'Karate'});assert.equal(JSON.stringify(shot),before);assert.equal(shot.profile.damage.components[1].formula,'2d-1 pi');
});
test('M2.8 physical GGA source identity, imported final skill and selected part remain separate',async()=>{
 const a=actor();a.system.equipment={carried:{x:{uuid:'physical-nrs',originaluuid:'eF9wvH1Tq9TV2nh8V',name:'Custom name'}}};a.system.melee={x:{uuid:'wFo4UA8LwlZXWjQda',parentuuid:'physical-nrs',name:'Custom name',mode:'Original GGA',damage:'sw-2 cut',reach:'C,1',parry:'10',st:'6',level:16,pageref:'HT199'}};const before=JSON.stringify(a.system),raw=collectMeleeAttacks(a)[0],r=await preview(a,raw,{modeId:'wi2aw3XWqi2XEckOq'});assert.equal(r.p.level,16);const p=freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared});assert.equal(p.mode.mode,'Original GGA');assert.equal(p.damage.rules.meleeSnapshot.combatProfile.modeId,'wi2aw3XWqi2XEckOq');assert.equal(JSON.stringify(a.system),before);
});
test('M2.8 names alone never bind a device and GGA work rows remain explicitly manual',()=>{
 const a=actor();a.system.equipment={carried:{x:{uuid:'unknown',name:'Chainsaw'}}};assert.equal(collectMeleeAttacks(a).length,0);a.system.melee={x:{uuid:'wflnXSn-N842a_IQ6',name:'Drill',mode:'Work',damage:'6d(2) pi++',level:16}};const row=collectMeleeAttacks(a)[0];assert.match(row.readinessReason,/Рабочая операция/);assert.ok(row.manualSourceHint);
});
test('M2.8 two copies persist distinct hard/soft settings and reject stale/non-owner changes',async()=>{
 const a=actor(),one=await weapon(a,'wCqDJeFrsa89Srp2B'),two=await weapon(a,'wCqDJeFrsa89Srp2B'),svc=new MeleeProfileService(a);await svc.save(one,{modeId:'wHTM28HardwCqDJeFrsa89Srp2B',weaponTL:7});await svc.save(two,{modeId:'wCqDJeFrsa89Srp2B',weaponTL:8});assert.notEqual(meleeProfileContext(a,one).key,meleeProfileContext(a,two).key);assert.equal(meleeProfileContext(a,one).saved.weaponTL,7);assert.equal(meleeProfileContext(a,two).saved.weaponTL,8);await assert.rejects(svc.save(one,{weaponTL:6},{expectedRevision:0}));a.isOwner=false;await assert.rejects(svc.save(one,{weaponTL:6}));
});
test('M2.8 source overlay changes no LT/UT record or pre-existing ammunition pair and remains idempotent',async()=>{
 const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8')),out=structuredClone(raw);projectHTSpecialData('weapons',out);for(const e of raw.equipment.filter(e=>e.source!=='HT'))assert.deepEqual(out.equipment.find(x=>x.equipment_id===e.equipment_id),e);const once=structuredClone(out);projectHTSpecialData('weapons',out);assert.deepEqual(out,once);
 const ammo=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_ht_ammunition_catalog_v1_3.json',import.meta.url),'utf8')),copy=structuredClone(ammo);projectHTSpecialData('ht',copy);for(const item of ammo.ammo_items){const actual=copy.ammo_items.find(x=>x.id===item.id);assert.deepEqual(actual.weapon_mode_ids.filter(id=>id!=='WHTM28CondorTonfaFired'),item.weapon_mode_ids);}assert.equal(catalogs.getStatus('ht').status,'ready');
});
