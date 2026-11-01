import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {UT_EXOTIC_PROFILES as P,utExoticEffect,utContactEffect,projectUTExoticData} from '../scripts/ut-exotic-melee-source.js';
import {StandaloneWeaponService,StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,resolveMeleeProfile,meleeProfileContext} from '../scripts/tools/melee-profile-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {utMeleeResourceContext,utMeleeResourceReason} from '../scripts/tools/ut-melee-resources.js';
import {utContactConditions,utContactConsequence} from '../scripts/tools/ut-contact-resistance.js';
import {resistanceEffect} from '../scripts/tools/resistance-roll.js';
import {freezeMeleeAttackProfile,prepareEffectiveMeleeDamage as prepare,applyMartialArtsDamage} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
import {meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/ut-exotic-m210.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(skills={Shortsword:16,'Axe/Mace':16,Boxing:16,Brawling:16,Karate:16,'Force Sword':16,'Force Whip':16,'Monowire Whip':16,Whip:16,'Beam Weapons/TL12 (Projector)':16,'Liquid Projector/TL9 (Sprayer)':16,Knife:16}){const flags={};return {id:crypto.randomUUID(),isOwner:true,system:{attributes:{ST:{value:12},DX:{value:12}},swing:'1d+2',thrust:'1d-1',skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,points:4}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);}};}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(P[id].equipmentId);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
async function equip(a,raw,id=raw.standaloneRef.modeId,nr=false){return new AmmoService(a).replaceMeleeResource(raw,{modeId:id,requestId:crypto.randomUUID(),expectedResource:utMeleeResourceContext(a,raw,id).saved,nonRechargeable:nr});}
async function damage(a,attack){const m=/^(sw|thr)(.*?)\s+(.+)$/.exec(attack.damage);if(m)attack={...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}};return prepare({actor:a,attack});}
for(const row of fixture.rows)test('M2.10 individual source and full mode contracts '+row.modelId,async()=>{
 const ps=Object.values(P).filter(p=>p.modelId===row.modelId);
 if(['ut:cyber-claws','ut:ripsnake','ut:cyberhair'].includes(row.modelId)){assert.equal(ps.length,0);assert.match(row.sourcePages.join(','),/UT21/);return;}
 assert.ok(ps.length,row.modelId);
 const a=actor(),before=JSON.stringify(a.system),raw=await weapon(a,ps[0].modeId);
 for(const p of ps){
  const expected=row.modes.find(m=>m.modeId===p.modeId),catalog=catalogs.getMode(p.modeId);
  assert.equal(catalogs.getEquipmentForMode(p.modeId).equipment_id,p.equipmentId);
  if(expected&&!/switchblade/.test(row.modelId)&&!p.instructionOnly)assert.equal(p.stats.damage,expected.damage);
  if(expected&&!/switchblade/.test(row.modelId)){assert.equal(p.stats.reach,expected.reach);if(row.modelId!=='ut:limpet-mine-dispenser')assert.equal(p.stats.st,expected.st);}
  assert.equal(catalog.raw_calc.damage,p.stats.damage);assert.equal(catalog.stats.parry,p.stats.parry);
  assert.ok(p.hints.length);assert.equal(p.martialGrips.length,0);
  const attack=resolveMeleeProfile({actor:a,attack:raw,selection:{modeId:p.modeId,weaponTL:12,...(p.neural?{neuralSetting:'agony'}:{})}});
  assert.ok(attack.meleeProfile,attack.readinessReason);assert.equal(attack.meleeProfile.strength.penalty,0);assert.equal(attack.meleeProfile.modeId,p.modeId);
  if(p.resistanceEffect)assert.ok(resistanceEffect(attack.meleeProfile.utExotic.resistanceEffect));
  if(!p.instructionOnly){const d=await damage(a,attack);assert.ok(d,p.modeId+' '+p.stats.damage);assert.ok(!d.formula.includes('R'));}
 }
 assert.equal(JSON.stringify(a.system),before);
 if(row.modelId==='ut:monowire-switchblade'){
  const saved=a.getFlag('olegurps-qol','standaloneWeapons'),record=saved.weapons[0],mode=record.modes.find(m=>m.modeId==='wAtyEWpMeFPCyRNj8');mode.snapshot.raw_calc.damage=row.modes[0].gcs.calc.damage;await a.setFlag('olegurps-qol','standaloneWeapons',saved);const flagsBefore=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),loaded=new StandaloneWeaponService(a,catalogs).get(record.id);assert.equal(loaded.modes.find(m=>m.modeId===mode.modeId).snapshot.raw_calc.damage,'sw+1d(10) cut');assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),flagsBefore);
 }
});
test('M2.10 exact GCS conflict decisions use matching physical IDs and matching modes',()=>{
 const mono=fixture.rows.find(r=>r.modelId==='ut:monowire-switchblade'),m=mono.modes.find(m=>m.modeId==='woh9pKqeZecuJZ_6a');assert.equal(m.gcs.reach,'1-7*');assert.equal(P[m.modeId].stats.reach,m.gcs.reach);
 const zap=fixture.rows.find(r=>r.modelId==='ut:zap-glove').modes.find(m=>m.modeId==='w8xpTbHH1oVDkHOYb');assert.equal(zap.gcs.damage.type,'HT-6(2) aff');assert.equal(P[zap.modeId].resistanceEffect.modifier,-6);assert.equal(P[zap.modeId].resistanceEffect.armorDivisor,2);
 assert.equal(P.w7bLtfJugrIOJS70U.resistanceEffect.modifier,-5);assert.equal(P.w7bLtfJugrIOJS70U.resistanceEffect.armorDivisor,0.5);
});
test('M2.10 Force Whip directed defaults and persistence do not use Force Sword',async()=>{
 for(const [skills,expected]of [[{'Force Whip':18},18],[{Whip:18},15],[{Kusari:18},15],[{'Monowire Whip':18},15],[{'Force Sword':18},7]]){
  const a=actor(skills),raw=await weapon(a,'woO7urPHntECbjiW_'),r=await new MeleeProfileService(a).save(raw,{skill:'Force Whip',weaponTL:12});assert.equal(r.level,expected);assert.equal(resolveMeleeProfile({actor:a,attack:readStandaloneAttack(a,raw.standaloneRef.weaponId,raw.standaloneRef.modeId)}).level,expected);
 }
});
test('M2.10 Water Knife applies learned Axe/Mace-4 or DX-5 exactly once',async()=>{
 for(const [skills,expected]of [[{'Axe/Mace':18},14],[{},7]]){const a=actor(skills),raw=await weapon(a,'wqXMjnfC2NJTOfVSc');assert.equal(resolveMeleeProfile({actor:a,attack:raw}).level,expected);}
});
test('M2.10 all rigid reaches use sw+1d+R while flexible modes remain different',async()=>{
 for(const [id,max]of [['wAtyEWpMeFPCyRNj8',5],['w17DvILEf9UF-N1G2',30]]){const a=actor(),raw=await weapon(a,id);for(const r of [0,1,max]){const p=P[id+(r?'R'+r:'')],attack=resolveMeleeProfile({actor:a,attack:raw,selection:{modeId:p.modeId}}),d=await damage(a,attack);assert.equal(d.formula,'2d+'+(2+r)+'(10) cut');assert.equal(attack.reach,String(r||'C'));}}
 assert.equal(P.woh9pKqeZecuJZ_6a.stats.damage,'sw+1d-2(10) cut');assert.equal(P.wXIUigU9a9ScSXIFY.stats.damage,'sw+1d-1(10) cut');
});
test('M2.10 fixed Force damage ignores ST and Committed Strong, F77 retained',async()=>{
 const a=actor(),raw=await weapon(a,'woO7urPHntECbjiW_');for(const st of [6,12,40]){a.system.attributes.ST.value=st;const attack=resolveMeleeProfile({actor:a,attack:raw});assert.equal((await damage(a,attack)).formula,'4d(5) burn');assert.equal(applyMartialArtsDamage('4d(5) burn',{committedStrong:true,strengthBased:false}),'4d(5) burn');}
});
for(const [id,capacity,cost]of [['w8xpTbHH1oVDkHOYb',10,1],['wYzmoafHusruaKOBV',10,2],['w7bLtfJugrIOJS70U',20,1],['woO7urPHntECbjiW_',100,1],['wqTQ5eckqDQIKszMe',180,1],['wZa4lUipo5uQSO9_4',900,1]])test('M2.10 exact resource, cancellation and immutable receipt '+id,async()=>{
 const a=actor(),raw=await weapon(a,id),s=new AmmoService(a);assert.match(utMeleeResourceReason(a,raw),/ресурс/);await equip(a,raw);assert.equal(utMeleeResourceContext(a,raw).remaining,capacity);
 const before=JSON.stringify(a.getFlag('olegurps-qol','utMeleeResources'));await s.executeMeleeResource({attack:raw,attackId:'cancel',execute:async()=>({rolled:false})});assert.equal(JSON.stringify(a.getFlag('olegurps-qol','utMeleeResources')),before);
 let receipt;await s.executeMeleeResource({attack:raw,attackId:'shot',execute:async e=>{receipt=structuredClone(e);return {rolled:true};}});assert.equal(utMeleeResourceContext(a,raw).remaining,capacity-cost);assert.equal(receipt.spent,cost);
 await assert.rejects(s.executeMeleeResource({attack:raw,attackId:'shot',execute:async()=>({rolled:true})}));assert.equal(receipt.before,capacity);
});
test('M2.10 replacement is explicit, idempotent, stale-safe and OWNER-only; NR is exact',async()=>{
 const a=actor(),one=await weapon(a,'wYzmoafHusruaKOBV'),two=await weapon(a,'wYzmoafHusruaKOBV'),s=new AmmoService(a),opts={requestId:'new',expectedResource:null,nonRechargeable:true};await s.replaceMeleeResource(one,opts);await s.replaceMeleeResource(one,opts);assert.equal(utMeleeResourceContext(a,one).remaining,20);assert.equal(utMeleeResourceContext(a,two).saved,null);await assert.rejects(s.replaceMeleeResource(one,{...opts,requestId:'stale'}));a.isOwner=false;await assert.rejects(s.replaceMeleeResource(two,opts));
});
test('M2.10 serialized last charge executes once and no fictitious magazines exist',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb');await equip(a,raw);const all=a.getFlag('olegurps-qol','utMeleeResources');Object.values(all)[0].charge=1;await a.setFlag('olegurps-qol','utMeleeResources',all);let rolls=0;const s=new AmmoService(a),r=await Promise.allSettled([1,2].map(n=>s.executeMeleeResource({attack:raw,attackId:'race'+n,execute:async()=>{rolls++;return {rolled:true};}})));assert.equal(r.filter(r=>r.status==='fulfilled').length,1);assert.equal(rolls,1);assert.match(utMeleeResourceReason(a,raw),/исчерпан/);assert.equal(a.getFlag('world','gurpsAmmoManager'),undefined);
});
test('M2.10 linked effect is frozen once, independently of current mode and Actor',async()=>{
 const a=actor(),raw=await weapon(a,'w7bLtfJugrIOJS70U'),attack=resolveMeleeProfile({actor:a,attack:raw}),preparedDamage=await damage(a,attack),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack,preparedDamage}),{attackId:'old'}),before=JSON.stringify(shot);assert.equal(shot.profile.damage.rules.resistanceEffect.modifier,-5);assert.equal(shot.profile.damage.formula,'1d+2 cr');await new MeleeProfileService(a).save(raw,{modeId:'wmZbVhgow5v78qhsX'});a.system.attributes.ST.value=40;assert.equal(JSON.stringify(shot),before);
});
test('M2.10 contact afflictions apply exact DR, recovery, injury and duration rules',()=>{
 const choices={applicable:true,dr:4,metal:false,recovery:false,injury:7,nervousSystem:true};
 assert.equal(utContactConditions(utContactEffect('emd',-5,0.5,'Wand'),choices).modifier,3);assert.equal(utContactConditions(utContactEffect('emd',-6,2,'Zap'),choices).modifier,-4);assert.equal(utContactConditions(utContactEffect('emd',-5,0.5,'Wand'),{...choices,recovery:true}).modifier,-5);assert.equal(utContactConditions(utContactEffect('lethal',0,1,'Zap'),choices).modifier,-3);
 assert.equal(utContactConditions(utContactEffect('neural',-5,2,'Baton'),{...choices,nervousSystem:false}).applies,false);assert.match(utContactConsequence(utContactEffect('extinguisher',-3,1,'Foam'),{margin:-4},choices,false),/4 с/);
});
test('M2.10 Neural versions, tunable cost and TL are instance selections',async()=>{
 const a=actor(),raw=await weapon(a,'wXy4HmlMqnU_K2mMI');for(const setting of ['agony','ecstasy','stun','paralysis','seizure','death']){const r=resolveMeleeProfile({actor:a,attack:raw,selection:{weaponTL:11,neuralSetting:setting}});assert.equal(r.meleeProfile.utExotic.resistanceEffect.setting,setting);}
 const r=await new MeleeProfileService(a).save(raw,{weaponTL:11,neuralSetting:'agony',neuralSettings:['agony','death']});assert.equal(r.meleeProfile.quality.price,780);assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{weaponTL:10,neuralSetting:'death'}}).readinessReason);
});
test('M2.10 battery dialog cancellation writes nothing and NR starts unchecked',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb');let options;const DialogV2={wait:async o=>{options=o;return false;}};await confirmBatteryReplacement({actor:a,meleeAttack:raw,ammoService:new AmmoService(a),DialogV2});assert.equal(a.getFlag('olegurps-qol','utMeleeResources'),undefined);assert.ok(!/name="nonRechargeable"[^>]*checked/.test(options.content));assert.equal(options.modal,false);
});
test('M2.10 doses are explicit and loading one does not restore Pneumohypo air',async()=>{
 const a=actor(),raw=await weapon(a,'wUBUyZIpRJ52lW_v4'),s=new AmmoService(a);await equip(a,raw);let c=utMeleeResourceContext(a,raw);await s.setMeleePayload(raw,{requestId:'dose1',expectedResource:c.saved,payload:'External user dose'});const miss=await s.executeMeleeResource({attack:raw,attackId:'miss',execute:async()=>({rolled:true,rollData:{failure:true}})});assert.equal(miss.utMeleeResourceEvidence.spent,0);assert.equal(utMeleeResourceContext(a,raw).remaining,100);assert.equal(utMeleeResourceContext(a,raw).saved.payload,'External user dose');await s.executeMeleeResource({attack:raw,attackId:'inject1',execute:async()=>({rolled:true})});c=utMeleeResourceContext(a,raw);assert.equal(c.remaining,99);assert.equal(c.saved.payload,null);await s.setMeleePayload(raw,{requestId:'dose2',expectedResource:c.saved,payload:'Second external dose'});assert.equal(utMeleeResourceContext(a,raw).remaining,99);
});
test('M2.10 projection preserves other books and is idempotent',async()=>{
 const raw=JSON.parse(await fs.readFile(new URL('../data/catalogs/olegurps_weapon_reference_catalog_v5_6.json',import.meta.url),'utf8')),out=structuredClone(raw);projectUTExoticData('weapons',out);for(const e of raw.equipment.filter(e=>e.source!=='UT'))assert.deepEqual(out.equipment.find(x=>x.equipment_id===e.equipment_id),e);const once=structuredClone(out);projectUTExoticData('weapons',out);assert.deepEqual(out,once);
});
test('M2.10 Foundry recursive flag merges clear reservations explicitly and repeated attacks stay usable',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb'),set=a.setFlag.bind(a),merge=(old,next)=>Object.fromEntries(Object.entries({...old,...next}).map(([k,v])=>[k,next?.[k]&&typeof next[k]==='object'&&!Array.isArray(next[k])?merge(old?.[k],next[k]):v]));
 a.setFlag=(s,k,v)=>set(s,k,k==='utMeleeResources'?merge(a.getFlag(s,k),v):v);await equip(a,raw);const service=new AmmoService(a);
 for(const attackId of ['one','two'])await service.executeMeleeResource({attack:raw,attackId,execute:async()=>({rolled:true})});const c=utMeleeResourceContext(a,raw);assert.equal(c.remaining,8);assert.equal(c.saved.pending,null);assert.equal(c.saved.reservation,null);assert.equal(utMeleeResourceReason(a,raw),null);
 const imported=actor();imported.system.equipment={carried:{x:{uuid:'physical-wand',originaluuid:P.w7bLtfJugrIOJS70U.equipmentId}}};
 const sw={key:'sw',uuid:'w7bLtfJugrIOJS70U',data:{parentuuid:'physical-wand'}},thr={key:'thr',uuid:'wmZbVhgow5v78qhsX',data:{parentuuid:'physical-wand'}};
 const nativeService=new AmmoService(imported);await nativeService.replaceMeleeResource(sw,{modeId:sw.uuid,requestId:'native',expectedResource:null});await nativeService.executeMeleeResource({attack:sw,modeId:sw.uuid,attackId:'native-one',execute:async()=>({rolled:true})});assert.equal(utMeleeResourceContext(imported,thr,thr.uuid).remaining,19);assert.equal(utMeleeResourceContext(imported,sw,sw.uuid).key,utMeleeResourceContext(imported,thr,thr.uuid).key);delete imported.system.equipment;await assert.rejects(nativeService.replaceMeleeResource(thr,{modeId:thr.uuid,requestId:'unbound',expectedResource:null}));
});
test('M2.10 uncertain native outcome reserves once and explicit stale-safe resolution never rolls again',async()=>{
 const a=actor(),raw=await weapon(a,'woO7urPHntECbjiW_');await equip(a,raw);const s=new AmmoService(a);await assert.rejects(s.executeMeleeResource({attack:raw,attackId:'error',execute:async()=>{throw Error('native outcome uncertain');}}));let c=utMeleeResourceContext(a,raw);assert.equal(c.remaining,99);assert.match(utMeleeResourceReason(a,raw),/проверки/);await s.settleMeleeResource(raw,{expectedResource:c.saved,completed:false});c=utMeleeResourceContext(a,raw);assert.equal(c.remaining,100);assert.equal(c.saved.pending,null);await assert.rejects(s.settleMeleeResource(raw,{expectedResource:c.saved,completed:false}));
});
test('M2.10 Nanothorn is a typed same-instance upgrade of the two published monowire constructions',async()=>{
 for(const id of ['w9NE7eo1a5TicfmpW','wAtyEWpMeFPCyRNj8']){const a=actor(),raw=await weapon(a,id),r=resolveMeleeProfile({actor:a,attack:raw,selection:{blade:'nanothorn',weaponTL:11}});assert.ok(!r.readinessReason,r.readinessReason);assert.match((await damage(a,r)).formula,/\(10\) cor$/);assert.equal(r.meleeProfile.quality.price,P[id].cost*4);}
 const a=actor(),raw=await weapon(a,'w17DvILEf9UF-N1G2');assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{blade:'nanothorn',weaponTL:12}}).readinessReason);assert.equal(P['w17DvILEf9UF-N1G2'].power,null);assert.equal(P['w17DvILEf9UF-N1G2'].powerUnspecified,true);
});
test('M2.10 glove punches have one physical profile and a frozen explicit linked kill, no second Attack',async()=>{
 const a=actor(),raw=await weapon(a,'wYzmoafHusruaKOBVPunch'),r=resolveMeleeProfile({actor:a,attack:raw,selection:{skill:'Karate'}}),d=await damage(a,r),p=freezeMeleeAttackProfile({actor:a,attack:r,preparedDamage:d});assert.equal(d.formula,'1d cr');assert.equal(p.damage.components.length,2);assert.equal(p.damage.components[1].formula,'2d burn');assert.equal(p.damage.rules.utExotic.manualLinkedAction.formula,'2d');
});
test('M2.10 contact and sole-mode controls are Russian in either locale, with no invented governing skill',async()=>{
 const a=actor(),raw=await weapon(a,'wYAiwn5_8ozYs2iaT'),context=meleeProfileContext(a,raw);for(const lang of ['ru','en']){globalThis.game={i18n:{lang}};const html=meleeProfileEditorHTML(context,{},String,a,raw);assert.match(html,/Применить контакт/);assert.match(html,/Подтверждены/);assert.ok(!html.includes('select data-melee-profile="modeId"'));assert.equal(P.wYAiwn5_8ozYs2iaT.primarySkills.length,0);}delete globalThis.game;
});
test('M2.10 Zap resistance uses GCS -6 while recovery separately retains printed HT-5',()=>{
 const c={applicable:true,dr:0,metal:false,recovery:true,injury:0,nervousSystem:true};assert.equal(utContactConditions(utContactEffect('emd',-6,2,'Zap'),c).modifier,-5);
});
