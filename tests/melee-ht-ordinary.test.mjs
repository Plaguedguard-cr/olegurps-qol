import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {HT_ORDINARY_PROFILES as P,projectHTOrdinaryData,applyHTOrdinaryMode} from '../scripts/ht-ordinary-melee-source.js';
import {meleeSource} from '../scripts/melee-source-data.js';
import {resolveMeleeProfile,meleeProfileContext,MeleeProfileService,meleeQualityOptions,meleeMaterialOptions} from '../scripts/tools/melee-profile-service.js';
import {meleeProfileEditorHTML,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
import {StandaloneWeaponDraft,StandaloneWeaponService,searchStandaloneModels} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {collectMeleeAttacksWithBodyContract as collectMeleeAttacks} from './helpers/melee-body-collection.mjs';
import {assertImprovisedEquipmentReference} from '../scripts/tools/lt-improvised-equipment-adapter.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {loadHTM27,buildHTM27} from '../tools/build-ht-m27-audit.mjs';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/ht-ordinary-m27.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();globalThis.OleGURPSQOL={catalogs};
const names=[...new Set(fixture.modes.flatMap(r=>r.expected.skills).filter(n=>n!=='DX'))];
function actor(levels=null,st=12){const flags={};return {id:crypto.randomUUID(),isOwner:true,writes:0,system:{ads:{},attributes:{ST:{value:st,import:st},DX:{value:12}},swing:'1d+2',thrust:'1d-1',skills:Object.fromEntries(Object.entries(levels??Object.fromEntries(names.map(n=>[n,16]))).map(([name,level],i)=>[i,{name,level,points:4}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);this.writes++;}};}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
async function preview(a,raw,selection={}){const p=resolveMeleeProfile({actor:a,attack:raw,selection});assert.equal(p.readinessReason??null,null,p.readinessReason);const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(p.damage);assert.ok(m,p.damage);p.sourceDamage=p.damage;p.damageAction={type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]};const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:p});assert.ok(prepared,p.damage);return {p,prepared};}
for(const [eid,rows]of Map.groupBy(fixture.modes,r=>r.equipmentId))test('M2.7 printed physical profiles '+eid,async()=>{
 const a=actor(),raw=await weapon(a,rows[0].modeId),system=JSON.stringify(a.system),writes=a.writes;
 for(const r of rows){const p=P[r.modeId],v=r.expected,selection={modeId:r.modeId,weaponTL:5};
  assert.deepEqual(p.stats,{damage:v.damage,reach:v.reach,parry:v.parry,st:v.st},r.modeId);assert.deepEqual(p.primarySkills,v.skills);assert.equal(p.attackModifier,v.penalty);
  const m=catalogs.getMode(r.modeId);assert.equal(m.raw_calc.damage,v.damage);assert.equal(m.stats.strength,v.st);assert.equal(m.stats.reach,v.reach);assert.equal(m.stats.parry,v.parry);
  assert.equal(m.hand_use.value,v.hands===2?'two-handed':'one-handed');
  const result=await preview(a,raw,selection);assert.equal(result.prepared.formula,r.formulaST12,r.modeId);assert.equal(result.p.level,r.levelST12,r.modeId);assert.equal(result.p.meleeProfile.strength.hands,v.hands);
  assert.ok(result.p.meleeProfile.manualHints.length);assert.ok(meleeProfileContext(a,raw).profiles.some(q=>q.modeId===r.modeId));
  assert.equal(result.p.meleeProfile.directWeaponPenalty,v.penalty);
  assert.ok(p.sourcePages.some(s=>s.startsWith('HT')));
 }
 assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.system),system);
});
test('M2.7 independent fixture covers every exact ordinary mode and no deferred device',()=>{
 assert.equal(fixture.modes.length,169);assert.equal(new Set(fixture.modes.map(m=>m.modeId)).size,169);assert.deepEqual(new Set(fixture.modes.map(m=>m.modeId)),new Set(Object.keys(P)));
 assert.ok(!Object.values(P).some(p=>/chainsaw|stun-|cattle|condor|elgin|nrs-2|sedgley/.test(p.modelId)));
});
test('M2.7 105 historical IDs retain exact scopes and explicit M2.8 explanations',async()=>{
 const inputs=await loadHTM27(),a=buildHTM27(inputs);assert.equal(a.rows.length,105);assert.deepEqual(new Set(a.rows.map(r=>r.modelId)),new Set(inputs.historical.models.filter(m=>m.book==='HT').map(m=>m.id)));
 assert.deepEqual(a.summary.historicalScopes,{'work-operation':18,melee:53,deferred:1,'host-rule':3,'melee-host':30});assert.equal(a.gaps.length,0);assert.equal(a.summary.allHighTechMeleeComplete,false);
 assert.ok(a.deferredToM28.find(r=>r.modelId==='ht:chainsaw').mandatoryM28);assert.equal(a.rows.filter(r=>r.workOperation).length,18);assert.ok(a.rows.filter(r=>r.workOperation).every(r=>!r.workOperation.confirmedOrdinaryCombatProfile&&r.reason));
});
test('M2.7 overlay preserves every old ranged mode and all LT/UT equipment byte-for-byte',async()=>{
 const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8')),out=structuredClone(raw);projectHTOrdinaryData('weapons',out);
 for(const e of raw.equipment){const current=out.equipment.find(x=>x.equipment_id===e.equipment_id);if(e.source!=='HT')assert.deepEqual(current,e);else for(const m of e.modes.filter(m=>m.combat_type!=='melee'))assert.deepEqual(current.modes.find(x=>x.weapon_mode_id===m.weapon_mode_id),m);}
});
test('M2.7 source contracts are immutable, projection is idempotent and legacy manual fields survive',async()=>{
 assert.ok(Object.isFrozen(P));assert.ok(Object.isFrozen(P.wNvMhJZvddcEoaCeq.stats));const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8'));projectHTOrdinaryData('weapons',raw);const once=structuredClone(raw);projectHTOrdinaryData('weapons',raw);assert.deepEqual(raw,once);
 const manual=structuredClone(catalogs.getMode('wNvMhJZvddcEoaCeq'));manual.raw_calc.damage='sw+9 cut';manual.stats.strength='7';manual.stats.reach='C';manual.usage='Custom';applyHTOrdinaryMode(manual,{source:'HT',equipment_id:'e6t4Yw5hHaQR0vZoM'},{snapshot:true});assert.equal(manual.raw_calc.damage,'sw+9 cut');assert.equal(manual.stats.strength,'7');assert.equal(manual.stats.reach,'C');assert.equal(manual.usage,'Custom');
 assert.match(catalogs.getMode('w2uQGgZgiAttL8mUW').ht_tool_manual,/Damage/);
});
test('M2.7 native GGA totals and exact physical UUIDs remain authoritative',async()=>{
 const a=actor();a.system.equipment={carried:{x:{uuid:'native-spanner',originaluuid:'eajfEbEtM723JxHzZ',name:'Custom name'}}};a.system.melee={x:{uuid:'wrL7rskIEkSAtGcTC',parentuuid:'native-spanner',name:'Custom name',mode:'Native swing',damage:'sw+2 cr',st:'10',reach:'1',parry:'10U',level:13,pageref:'HT29'}};
 const before=JSON.stringify(a.system),raw=collectMeleeAttacks(a)[0],r=await preview(a,raw);assert.equal(r.p.level,13);assert.equal(r.p.parry,'10U');assert.equal((await preview(a,raw,{skill:'Axe/Mace'})).p.level,14);assert.equal(JSON.stringify(a.system),before);
});
test('M2.7 exact equipment-only GCS tools reuse one UUID and never create a weapon record',async()=>{
 const a=actor();a.system.equipment={carried:{x:{uuid:'existing-crowbar',originaluuid:'eG2bDoPwVQGHLmZRE',name:'Custom label'}}};const before=JSON.stringify(a.system),rows=collectMeleeAttacks(a);assert.equal(rows.length,1);assert.equal(rows[0].equipmentRef.instanceId,'existing-crowbar');assert.equal((await preview(a,rows[0])).p.level,15);assert.equal(a.writes,0);assert.equal(JSON.stringify(a.system),before);assert.equal(a.getFlag('olegurps-qol','standaloneWeapons'),undefined);
});
test('M2.7 split GCS Trench Knife/Tonfa identities bind to the complete physical definition',()=>{
 for(const [eid,mid,primary]of [['eqoNhm5MABJ3JUyJa','wVJHviRFdF9HsPock','ec-sdpLnIh2l6kLUW'],['ezjXW2X8ZHOOOn8cN','wUiL6pRkKH21K5hQ-','eiGKXpvF-EAqxnqr_']]){
  const a=actor();a.system.equipment={carried:{x:{uuid:'copy',originaluuid:eid,name:'Custom'}}};a.system.melee={x:{uuid:mid,parentuuid:'copy',name:'Custom',mode:'Punch',damage:'thr cr',reach:'C',parry:'11',level:16,pageref:'HT200'}};
  const row=collectMeleeAttacks(a)[0];assert.equal(row.catalogBinding.equipmentId,primary);assert.equal(meleeProfileContext(a,row).profiles.length,3);assert.ok(!searchStandaloneModels(catalogs,'melee','','HT').some(e=>e.equipment_id===eid));
 }
});
test('M2.7 name-only, duplicate and stale host bindings never grant compatibility',async()=>{
 const a=actor();a.system.equipment={carried:{x:{uuid:'unknown',name:'Izhmash AK-47, 7.62x39mm'}}};assert.equal(collectMeleeAttacks(a).length,0);
 await a.setFlag('olegurps-qol','meleeEquipmentBindings',{unknown:{equipmentId:'eT448e6j7QT5yBB9-'}});const raw=collectMeleeAttacks(a)[0];assert.ok(raw);a.system.equipment.carried.y={uuid:'unknown'};assert.equal(collectMeleeAttacks(a).length,0);assert.throws(()=>assertImprovisedEquipmentReference(a,raw.equipmentRef));delete a.system.equipment.carried.y;await a.setFlag('olegurps-qol','meleeEquipmentBindings',{});assert.throws(()=>assertImprovisedEquipmentReference(a,raw.equipmentRef));
});
test('M2.7 Rifle Butt and bayonet never inherit ranged ST, Parry or resources',()=>{
 const hosts=Object.values(P).filter(p=>p.hostRule==='HT198');assert.equal(new Set(hosts.map(p=>p.equipmentId)).size,30);for(const p of hosts){assert.equal(p.stats.st,null);assert.equal(p.stats.parry,null);assert.equal(p.hands,2);assert.equal(p.requiresTwoHands,true);}
 const aug=hosts.find(p=>p.modelId==='ht:steyr-aug-a1-5-56x45mm'&&p.hostBayonet);assert.equal(aug.attackModifier,-2);assert.match(aug.hints.join(' '),/export/);
});
test('M2.7 weapon TL and per-instance grades never use campaign TL',async()=>{
 const a=actor(),raw=await weapon(a,'wrQR9Rgjti7MzzuO9');await a.setFlag('olegurps-qol','campaignTL',12);
 assert.equal((await preview(a,raw)).prepared.formula,'1d-1 imp');assert.equal((await preview(a,raw,{weaponTL:7})).prepared.formula,'1d imp');
 assert.equal((await preview(a,raw,{weaponTL:5,quality:'Fine'})).prepared.formula,'1d imp');assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{weaponTL:7,quality:'Very Fine'}}).readinessReason);
 assert.equal((await preview(a,await weapon(a,'wM0HTKatanaThrust'),{weaponTL:7})).prepared.formula,'1d imp');
 const cane=await weapon(a,'w0pG2m0oUOrqTGZIq');assert.equal((await preview(a,cane,{weaponTL:5})).p.meleeProfile.quality.level,'Cheap');const modern=await preview(a,cane,{weaponTL:7});assert.equal(modern.p.meleeProfile.quality.level,'Good');assert.equal(modern.p.meleeProfile.quality.price,600);
 assert.equal((await preview(a,cane,{weaponTL:7,material:'stainless'})).p.meleeProfile.quality.level,'Cheap');assert.equal((await preview(a,cane,{weaponTL:6,material:'stainless'})).p.meleeProfile.quality.price,null);
 const hatchet=await weapon(a,'wHTM27SpikedTomahawkBlade');assert.equal((await preview(a,hatchet)).prepared.formula,'1d+3 cut');assert.equal((await preview(a,hatchet,{quality:'Fine'})).prepared.formula,'1d+3 cut');assert.equal((await preview(a,hatchet)).p.meleeProfile.quality.price,40);
});
test('M2.7 HT198 materials alter permitted blades only and stainless has no fabricated damage penalty',async()=>{
 const a=actor(),raw=await weapon(a,'wM0HTKatanaThrust');const stainless=await preview(a,raw,{weaponTL:6,material:'stainless',quality:'Good'});assert.equal(stainless.prepared.formula,'1d imp');assert.equal(stainless.p.meleeProfile.quality.price,4400);
 const ceramic=await preview(a,raw,{weaponTL:7,material:'ceramic',quality:'Fine'});assert.equal(ceramic.prepared.formula,'1d+1 imp');assert.equal(ceramic.p.meleeProfile.quality.breakageQuality,'Cheap');assert.equal(ceramic.p.meleeProfile.quality.mass,2.5);
 assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{weaponTL:5,material:'ceramic'}}).readinessReason);assert.deepEqual(meleeMaterialOptions(a,P.wHTM27TrenchPunch,{},{}),['published']);
 const axe=await preview(a,await weapon(a,'wHTM27RescuePick'),{weaponTL:6,material:'stainless',quality:'Good'});assert.equal(axe.prepared.formula,'1d+3 imp');
});
test('M2.7 blade quality and Superfine never enhance the hilt, light, stock or sheath',async()=>{
 const a=actor(),raw=await weapon(a,'wzamLAfFUhE_iRDHH');const blade=await preview(a,raw,{modeId:'wT-pH9Zmco_kJOcvk',quality:'Fine',weaponTL:6});assert.equal(blade.prepared.formula,'1d imp');
 const punch=await preview(a,raw,{modeId:'wHTM27TrenchPunch',weaponTL:9});assert.equal(punch.prepared.formula,'1d cr');assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{modeId:'wHTM27TrenchPunch',quality:'Fine',weaponTL:9}}).readinessReason);
 assert.equal((await preview(a,raw,{modeId:'wHTM27TrenchPunch',skill:'Karate',weaponTL:7})).prepared.formula,'1d+1 cr');
 const sf=await preview(a,raw,{modeId:'wT-pH9Zmco_kJOcvk',weaponTL:9,blade:'superfine'});assert.equal(sf.prepared.formula,'1d+1(2) imp');
 assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{modeId:'wHTM27TrenchPunch',weaponTL:9,blade:'superfine'}}).readinessReason);
});
test('M2.7 imported grade/material baseline is explicit and never stacked twice',async()=>{
 const a=actor(),raw={...await weapon(a,'wrQR9Rgjti7MzzuO9')};delete raw.standaloneRef;raw.catalogBinding={modeId:'wrQR9Rgjti7MzzuO9'};raw.damage='thr+1 imp';raw.level=16;raw.parry='10';raw.data.pageref='HT200';
 assert.equal((await preview(a,raw)).prepared.formula,'1d imp');assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{quality:'Fine'}}).readinessReason);
 assert.equal((await preview(a,raw,{quality:'Fine',baselineQuality:'Fine',baselineMaterial:'published'})).prepared.formula,'1d imp');assert.equal((await preview(a,raw,{quality:'Good',baselineQuality:'Fine',baselineMaterial:'published'})).prepared.formula,'1d-1 imp');
});
test('M2.7 coherent grips, default penalties and manual opening conditions use shared editor',async()=>{
 const a=actor(),raw=await weapon(a,'w1E5tlALr61HNzATz'),context=meleeProfileContext(a,raw),selection=selectMeleeEditorProfile(context,{},'grip','tip',a,raw);assert.equal(selection.modeId,'wM0HTKatanaThrust');assert.equal((await preview(a,raw,selection)).p.reach,'C');
 const reversed=await preview(a,raw,{modeId:'wM0HTKatanaThrust',grip:'reversed'});assert.equal(reversed.prepared.formula,'1d+1 imp');
 const b=actor({'Two-Handed Axe/Mace':16}),broad=await preview(b,await weapon(b,'wFmnElv38Dl7vCHz8'));assert.equal(broad.p.level,13);
 const d=actor({Flail:18}),defaulted=await preview(d,await weapon(d,'wrL7rskIEkSAtGcTC'));assert.equal(defaulted.p.level,12);
 for(const id of ['w8UxOYTiLBvz6mhoR','w--xkYEbbEK1Rrg0A','wljw_rn5aQiy2VN6y'])assert.match(P[id].hints.join(' '),/вручную|не раскрывает|состояние/);
 const html=meleeProfileEditorHTML(context,{weaponTL:7,material:'titanium',quality:'Fine'},v=>String(v),a,raw);assert.ok(!/undefined|NaN/.test(html));assert.match(html,/ТУ оружия/);
 const tonfa=await preview(a,await weapon(a,'w30EgsQ0EdR8Lhf04'),{grip:'reversed'});assert.equal(tonfa.prepared.formula,'1d cr');assert.equal(tonfa.p.reach,'C');
});
test('M2.7 two physical copies persist independently; non-owner and stale writes fail',async()=>{
 const a=actor(),one=await weapon(a,'wrQR9Rgjti7MzzuO9'),two=await weapon(a,'wrQR9Rgjti7MzzuO9'),svc=new MeleeProfileService(a);await svc.save(one,{weaponTL:5,quality:'Good'});await svc.save(two,{weaponTL:9,blade:'superfine'});
 assert.notEqual(meleeProfileContext(a,one).key,meleeProfileContext(a,two).key);assert.equal(meleeProfileContext(a,one).saved.weaponTL,5);assert.equal(meleeProfileContext(a,two).saved.weaponTL,9);await assert.rejects(svc.save(one,{weaponTL:2},{expectedRevision:0}));a.isOwner=false;await assert.rejects(svc.save(one,{weaponTL:2}));
});
test('M2.7 native action identity and frozen selected mode survive subsequent changes',async()=>{
 const a=actor(),raw=await weapon(a,'wNvMhJZvddcEoaCeq'),r=await preview(a,raw,{modeId:'wHTM27RescuePick',quality:'Fine',weaponTL:7}),calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:r.p.level,weaponBond:true,rapidStrikePenalty:-3});assert.equal(calc.effectiveSkill,r.p.level-2);
 const snapshot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared,context:{effectiveSkill:calc.effectiveSkill}}),{attackId:'m27-frozen'}),before=JSON.stringify(snapshot);await new MeleeProfileService(a).save(raw,{quality:'Cheap',weaponTL:5});a.system.attributes.ST.value=20;assert.equal(JSON.stringify(snapshot),before);assert.equal(snapshot.profile.damage.formula,'1d+4 imp');assert.equal(Object.keys(a.system.ads).length,0);
});
