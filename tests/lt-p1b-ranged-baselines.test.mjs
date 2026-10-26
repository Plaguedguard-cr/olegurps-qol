import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { AmmunitionCompatibilityService } from '../scripts/ammunition-compatibility-service.js';
import { projectLTSourceData } from '../scripts/lt-source-data.js';
import { StandaloneWeaponService, StandaloneWeaponDraft, standaloneAmmoCarrier } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack, listStandaloneAttacks, standaloneCatalogBinding } from '../scripts/tools/standalone-attack-service.js';
import { resolveStandaloneSkill } from '../scripts/tools/standalone-skill-service.js';
import { AttackProfileResolver, createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { parseWeaponBulk } from '../scripts/tools/weapon-bulk.js';
import { parseRecoil, recoilNotApplicable, validateAttackRecoil } from '../scripts/tools/weapon-recoil.js';
import { FireService } from '../scripts/tools/fire-service.js';
import { calculateHitsFromMargin } from '../scripts/tools/prepared-gga-roll.js';
import { listRangedGoverningSkills } from '../scripts/tools/ranged-governing-skill-service.js';
import { AmmoService } from '../scripts/tools/ammo-service.js';
import { withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import {ltEarlyReadiness} from '../scripts/tools/lt-early-firearms.js';
import { createFireControlContext } from '../scripts/tools/fire-control-context.js';
import { normalizeAttackOverride, applyAttackOverride } from '../scripts/tools/weapon-attack-overrides.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class {}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const { standaloneModeFields }=await import('../scripts/tools/standalone-weapon-configuration.js');
const { ammunitionCandidates }=await import('../scripts/tools/ammo-management-app.js');
const { WeaponConfigurationDraft, weaponModeFieldsHTML }=await import('../scripts/tools/weapon-configuration.js');
const { validateWeaponAttackOverride, openWeaponAttackEditor }=await import('../scripts/tools/weapon-attack-editor.js');
const expected=JSON.parse(await fs.readFile(new URL('./fixtures/lt-p1b-baselines.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
const modeId=name=>catalogs.getCatalog('weapons').equipment.find(e=>e.name===name&&e.source==='LT').modes.find(m=>m.combat_type==='ranged').weapon_mode_id;
function actor(){const flags={};return {id:crypto.randomUUID(),isOwner:true,flags,system:{attributes:{DX:{value:20},IQ:{value:20},ST:{value:20}},skills:{}},
 getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
async function fixture(id,existingActor=null){const a=existingActor??actor(),m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id),skill=m.governing_skill.skill;
 if(skill)a.system.skills[id]={name:skill.name+(/^(Guns|Gunner|Artillery|Beam Weapons|Liquid Projector)$/.test(skill.name)?'/TL'+e.tech_level:'')+(skill.specialization?' ('+skill.specialization+')':''),level:18,points:1};
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(e.equipment_id);draft.modeIds=new Set([id]);
 const service=new StandaloneWeaponService(a,catalogs),record=await service.save(draft),weapon=standaloneAmmoCarrier(record);
 const state=a.getFlag('world','gurpsAmmoManager')??{weapons:[],attackOverrides:{},shotReceipts:{}};state.weapons.push(weapon);await a.setFlag('world','gurpsAmmoManager',state);
 const attack=()=>readStandaloneAttack(a,record.id,id),profile=()=>resolver.resolve({actorId:a.id,weaponId:weapon.id,attack:attack(),state:a.getFlag('world','gurpsAmmoManager'),binding:standaloneCatalogBinding(attack(),catalogs)});
 return {actor:a,record,weapon,attack,profile,service,draft};}

test('exact LT source patches and all source identities; projection is idempotent and leaves HT/UT unchanged',()=>{
 for(const p of expected.policies){const m=catalogs.getMode(p.modeId);assert.equal(catalogs.getEquipmentForMode(p.modeId).equipment_id,p.equipmentId);
  for(const [k,v]of Object.entries(p.stats))assert.deepEqual(m.stats[k],v,p.modeId+':'+k);
  for(const [k,v]of Object.entries(p.skillFields??{}))assert.deepEqual(m[k],v,p.modeId+':'+k);
  if(p.rclNotApplicable)assert.equal(m.stats.recoil,null,p.modeId);}
 const raw=catalogs.getSourceCatalog('weapons'),copy=structuredClone(raw),view=projectLTSourceData('weapons',copy),once=JSON.stringify(view);
 assert.equal(JSON.stringify(projectLTSourceData('weapons',view)),once);
 for(let i=0;i<raw.equipment.length;i++)if(raw.equipment[i].source!=='LT')assert.deepEqual(view.equipment[i],raw.equipment[i]);
 assert.equal(raw.equipment.find(e=>e.equipment_id==='ej-C1vqAdSnwD4nQg').modes.find(m=>m.weapon_mode_id==='WQiw6nornpsdGHCov').stats.accuracy,null);
});

test('all 53 F01 modes have nullable recoil through read, profile, service and configuration; no invented Rcl',async()=>{
 assert.equal(expected.findings.F01.length,53);
 for(const id of expected.findings.F01){const f=await fixture(id),attack=f.attack(),profile=f.profile();
  assert.equal(recoilNotApplicable(attack,profile),true,id);assert.equal(attack.rcl,null,id);assert.equal(attack.data.rcl,null,id);assert.equal(profile.effective.rcl,null,id);
  assert.equal(new FireService({actor:f.actor}).parseAttackRcl(attack),null);assert.equal(validateAttackRecoil(attack,profile,99),null);
  assert.ok(!/Rcl/.test(attack.readinessReason??''),id+':'+attack.readinessReason);
  assert.match(standaloneModeFields(f.draft),/Не применяется/);}
});

test('five LT flame modes use P6 Jet contract but still require a prepared physical charge',async()=>{
 for(const id of expected.flameModes){const f=await fixture(id),a=f.attack();assert.equal(a.rcl,null);assert.equal(a.weaponHandling.rclNotApplicable,true);assert.equal(a.platformRules.rofJet,true);assert.equal(a.weaponHandling.jetDeferred,undefined);assert.match(ltEarlyReadiness(f.weapon),/физического заряда/);}
});

test('absent recoil cannot manufacture extra hits; real firearm and composite recoil contracts remain strict',()=>{
 assert.equal(calculateHitsFromMargin(1,null,8),1);assert.equal(calculateHitsFromMargin(20,null,8),null);assert.equal(calculateHitsFromMargin(20,undefined,8),null);
 assert.equal(calculateHitsFromMargin(0,null,8),0);
 assert.equal(calculateHitsFromMargin(20,2,8),5);assert.equal(calculateHitsFromMargin(20,null,8,{failure:true}),0);
 assert.equal(parseRecoil('1/5',{projectileKind:'shot'}),1);assert.equal(parseRecoil('1/5',{projectileKind:'slug'}),5);assert.equal(parseRecoil('1/5'),null);
 assert.throws(()=>validateAttackRecoil({rcl:null,standaloneRef:{}}),e=>e.code==='ProjectileRclRequired');
 assert.throws(()=>validateAttackRecoil({rcl:null},{binding:{status:'confirmed',confirmed:{modeId:'W9chB7ydzOWTAxQP0'}},effective:{rcl:null},weaponHandling:{rclNotApplicable:true}}),e=>e.code==='ProjectileRclRequired');
 assert.equal(validateAttackRecoil({rcl:'3'}),3);assert.equal(validateAttackRecoil({rcl:'3'},null,2),2);assert.equal(parseWeaponBulk('-4*').numericBulk,-4);assert.equal(parseWeaponBulk('-12/-15'),null);
});

test('14 published zero cases survive Save, runtime, Fire Control inputs and new snapshot',async()=>{
 assert.equal(expected.findings.F02.length,14);
 for(const id of expected.findings.F02){const f=await fixture(id),p=expected.policies.find(p=>p.modeId===id),a=f.attack(),profile=f.profile();
  for(const [field,key]of [['accuracy','acc'],['bulk','bulk']])if(p.stats[field]==='0'){assert.notEqual(a[key],null);assert.notEqual(profile.effective[key],null);assert.notEqual(profile.raw[key],null);assert.equal(Number(a[key]),0,id+':'+key);assert.equal(Number(profile.effective[key]),0);assert.equal(Number(profile.raw[key]),0);}
  const saved=JSON.stringify(f.actor.flags);f.actor.flags=JSON.parse(saved);assert.equal(f.attack().acc,a.acc);
  const snap=createShotSnapshot(profile,{attackId:'zero'});assert.equal(snap.profile.effective.acc,profile.effective.acc);assert.equal(JSON.stringify(f.actor.flags),saved);
  assert.ok(!/Acc или Bulk/.test(a.readinessReason??''),id+':'+a.readinessReason);assert.match(standaloneModeFields(f.draft),/value="0"/);}
});

test('all 12 dual Bulk modes default to mounted, persist explicit giant choice and keep immutable earlier snapshots without ST gating',async()=>{
 for(const id of expected.findings.F03){const f=await fixture(id),values=catalogs.getMode(id).lt_ranged_contract.bulkValues;
  assert.equal(f.attack().bulk,values[0]);assert.equal(f.attack().data.bulk,String(values[0]));
  const before=f.profile(),snap=createShotSnapshot(before,{attackId:'mounted'}),saved=JSON.stringify(f.actor.flags);
  const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.service.get(f.record.id)});draft.setOverride(id,'bulkState','giant');
  assert.equal(JSON.stringify(f.actor.flags),saved);await f.service.save(draft);assert.equal(f.attack().bulk,values[1]);assert.equal(f.profile().effective.bulk,values[1]);
  assert.deepEqual(f.profile().weaponHandling.bulkMetadata.sourceValues,values);assert.equal(snap.profile.effective.bulk,values[0]);
  assert.match(standaloneModeFields(draft),/Гигант держит как оружие/);assert.match(standaloneModeFields(draft),new RegExp('value="'+values[1]+'"'));
  f.actor.system.attributes.ST.value=1;assert.equal(f.attack().bulk,values[1]);assert.equal(f.attack().level,18);assert.equal(f.attack().readinessReason,null);
  const again=new StandaloneWeaponService(f.actor,catalogs).get(f.record.id);assert.equal(again.modes[0].overrides.bulkState,'giant');
 }
});

test('Bola uses the best available source skill/default, preserves explicit choice and never invents a Bolas default; mixed list survives',async()=>{
 const a=actor();a.system.skills={bolas:{name:'Bolas',level:12,points:1},sling:{name:'Sling',level:17,points:1}};
 const f=await fixture('WQiw6nornpsdGHCov',a);assert.equal(f.attack().level,17);assert.equal(f.attack().standaloneRef.governingSkill.name,'Sling');assert.equal(f.attack().readinessReason,null);
 const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a,existing:f.service.get(f.record.id)});draft.setOverride('WQiw6nornpsdGHCov','governingSkill','Bolas');await f.service.save(draft);assert.equal(f.attack().level,12);
 assert.equal(listRangedGoverningSkills(a).length,2);assert.match(standaloneModeFields(draft),/value="Bolas" selected/);
 delete a.system.skills.bolas;assert.equal(f.attack().level,null);draft.existing=f.service.get(f.record.id);draft.setOverride('WQiw6nornpsdGHCov','governingSkill','');await f.service.save(draft);assert.equal(f.attack().level,17);
 a.system.skills={};assert.equal(f.attack().level,14);assert.equal(f.attack().standaloneRef.governingSkill.source,'attribute-default');assert.equal(f.attack().standaloneRef.governingSkill.sourceName,'DX');assert.equal(f.attack().standaloneRef.governingSkill.penalty,-6);assert.equal(f.attack().readinessReason,null);
 await fixture(modeId('Arquebus'),a);const ut=catalogs.getCatalog('weapons').equipment.find(e=>e.source==='UT'&&e.modes.some(m=>m.combat_type==='ranged'&&m.stats.recoil));await fixture(ut.modes.find(m=>m.combat_type==='ranged').weapon_mode_id,a);
 assert.equal(listStandaloneAttacks(a,'ranged').length,3);assert.ok(!listStandaloneAttacks(a,'ranged').some(x=>x.diagnosticCode==='StandaloneRecordInvalid'));
});

test('F08 continuation fields remain restored; P5 admits Double Gastraphetes only through prepared physical loads',async()=>{
 for(const id of expected.findings.F08){const f=await fixture(id),p=expected.policies.find(p=>p.modeId===id);for(const [k,v]of Object.entries(p.stats))assert.equal(catalogs.getMode(id).stats[k],v);
  const ammo=catalogs.getModeLinks(id).ammoItemIds[0],status=compatibility.checkCompatibility(id,ammo,{book:'lt',kind:'ammo-item'}).status;
  assert.equal(status,id==='WS7SJUj_6I5AIBmpi'?'compatible':'incompatible');assert.ok(!ammunitionCandidates(f.actor,f.weapon).some(t=>t.ammoId===ammo&&!t.unavailable));}
});

test('F09 uses published Gunner (Catapult), DX-4 and other Gunner-4',async()=>{
 const f=await fixture('WDgJJrXmNb2ltlJ8G');assert.equal(f.attack().level,18);assert.match(f.attack().skillDescription,/Gunner.*Catapult/);
 f.actor.system.skills={};assert.equal(f.attack().level,16);
 f.actor.system.skills.other={name:'Gunner/TL2 (Machine Gun)',level:24,points:1};assert.equal(f.attack().level,20);assert.equal(f.attack().standaloneRef.governingSkill.source,'skill-default');
});

test('F10-F13 exact source values and F16 shot recoil reach profiles; no ST-related level change',async()=>{
 for(const [id,key,value]of [['W666IAfB0ft-hoH3z','range','x1.5/x2.5'],['WPn4rW6HE64VST_pm','bulk',-8],['WqrX0vMt5n6kLV5mq','st','6'],['Wo3FP4KhrHj4Ovw39','bulk',-2]]){
  const f=await fixture(id);assert.equal(f.attack()[key],value);f.actor.system.attributes.ST.value=1;assert.equal(f.attack().level,18);assert.equal(f.attack().readinessReason,null);}
 for(const id of expected.findings.F16){const f=await fixture(id);assert.equal(f.attack().rcl,'1');assert.equal(f.profile().effective.rcl,'1');assert.equal(validateAttackRecoil(f.attack(),f.profile()),1);
  const raw=catalogs.getSourceCatalog('weapons').equipment.find(e=>e.equipment_id===f.record.source.equipmentId).modes.find(m=>m.weapon_mode_id===id);assert.match(raw.stats.recoil,/1\/[45]/);}
 for(const id of expected.findings.F16){const equipment=catalogs.getEquipmentForMode(id),original=catalogs.getSourceCatalog('weapons').equipment.find(e=>e.equipment_id===equipment.equipment_id);
  for(const sibling of original.modes)if(!expected.findings.F16.includes(sibling.weapon_mode_id))assert.equal(catalogs.getMode(sibling.weapon_mode_id).stats.recoil,sibling.stats.recoil);}
});

test('read-through projection preserves owner overrides and saved bytes; new attack settings require ownership',async()=>{
 const f=await fixture('WPn4rW6HE64VST_pm');const d=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.service.get(f.record.id)});d.setOverride(d.selectedModes[0].weapon_mode_id,'bulk','-3');await f.service.save(d);
 assert.equal(f.attack().bulk,-3);const bytes=JSON.stringify(f.actor.flags);f.service.load();assert.equal(JSON.stringify(f.actor.flags),bytes);
 f.actor.isOwner=false;await assert.rejects(f.service.save(d),/прав/);assert.equal(JSON.stringify(f.actor.flags),bytes);
});

test('native bound siege configuration stores per-instance Bulk and the shared resolver keeps both source values',async()=>{
 const a=actor(),id='WYkHC34-KuQjgMNb-',mode=catalogs.getMode(id),raw={name:'Beam Sling',mode:'Shoot',level:18,acc:2,rof:'1',rcl:'3',bulk:'-12/-15',damage:'7d cr',range:'50/60'};
 const attack={...raw,data:raw,path:'system.ranged.main',uuid:'native'},weapon={id:'native-weapon',attackRef:{path:attack.path,uuid:attack.uuid,name:attack.name,mode:attack.mode},totalAmmo:0,magazines:[],capacity:0,loadedIndex:-1,ammoUnconfigured:true};
 const state={weapons:[weapon],attackOverrides:{}},binding={confirmed:true,modeId:id,equipmentId:catalogs.getEquipmentForMode(id).equipment_id};
 const draft=new WeaponConfigurationDraft({actor:a,state,attacks:[attack],existing:weapon,catalogs,bindings:{analyzeActor:()=>({modes:[{attack,status:'confirmed',binding}]})},ammunition:compatibility});
 assert.match(weaponModeFieldsHTML(draft),/name="ltBulkState"/);draft.ltBulkState='giant';draft.requestExecution(weapon);assert.equal(weapon.ltBulkState,'giant');
 assert.equal(draft.previewStats().stats.bulk,-15);assert.match(weaponModeFieldsHTML(draft),/Bulk -15 \(-12\/-15\)/);
 const p=resolver.resolve({actorId:a.id,weaponId:weapon.id,attack,rawAttack:raw,state,binding:{status:'confirmed',binding}});
 assert.equal(p.effective.bulk,-15);assert.deepEqual(p.weaponHandling.bulkMetadata.sourceValues,[-12,-15]);assert.equal(raw.bulk,'-12/-15');assert.equal(a.getFlag('world','gurpsAmmoManager'),undefined);
 assert.equal(p.sources.catalogStatisticsApplied,true);
 const zero=resolver.resolve({actorId:a.id,attack:{acc:null,data:{acc:null,bulk:'-2',damage:'sw cr',rcl:null}},state:{weapons:[]},binding:{status:'confirmed',binding:{confirmed:true,modeId:'WQiw6nornpsdGHCov'}}});
 assert.equal(zero.effective.acc,'0');assert.equal(zero.effective.rcl,null);
});

test('the shared attack editor and persisted overrides accept null Rcl only through source-aware validation',async()=>{
 const f=await fixture('WQiw6nornpsdGHCov');f.actor.system.skills.bola={name:'Bolas',level:18,points:1};const attack=f.attack();
 const values={skillLevel:18,rof:'1',acc:0,scopeBonus:0,bulk:-2,rcl:''};
 assert.equal(validateWeaponAttackOverride({...values,acc:''},()=>({valid:true}),attack).valid,false);
 assert.equal(validateWeaponAttackOverride(values,()=>({valid:true})).valid,false);
 const result=validateWeaponAttackOverride(values,()=>({valid:true}),attack);assert.equal(result.valid,true);assert.equal(result.value.rcl,null);
 assert.deepEqual(normalizeAttackOverride(JSON.parse(JSON.stringify(result.value))),result.value);
 const state={attackOverrides:{[attack.key]:result.value}};assert.equal(applyAttackOverride(attack,state).rcl,null);
 let content;const edited=await openWeaponAttackEditor({attack,parseRateOfFire:()=>({valid:true}),DialogV2:{wait:async data=>{content=data.content;return{action:'save',values:{...values,acc:1}};}}});
 const input=content.match(/<input[^>]+name="rcl"[^>]*>/)[0];assert.match(input,/disabled/);assert.doesNotMatch(input,/required/);assert.match(input,/Не применяется/);assert.equal(edited.value.rcl,null);
});

test('native Chinese shot overlays replace only their imported composite recoil and leave Actor source data unchanged',async()=>{
 const prior=globalThis.OleGURPSQOL.weaponCatalogBindings;
 try{for(const id of expected.findings.F16){const a=actor(),raw={name:'Chinese shot',mode:'Shoot',level:18,acc:1,rof:'1x9',rcl:expected.policies.find(p=>p.modeId===id).previous.recoil,bulk:'-4',damage:'2d pi+',range:'20/100'};a.system.ranged={shot:raw};
  const attack={...raw,data:raw,path:'system.ranged.shot',uuid:'shot'};
  globalThis.OleGURPSQOL.weaponCatalogBindings={analyzeMode:()=>({status:'confirmed',binding:{confirmed:true,modeId:id,equipmentId:catalogs.getEquipmentForMode(id).equipment_id}})};
  const overlay=withRuntimeAmmoStats(attack,a,{weapons:[]});assert.equal(overlay.rcl,'1');assert.equal(overlay.data.rcl,'1');assert.equal(new FireService({actor:a}).parseAttackRcl(overlay),1);assert.equal(raw.rcl,expected.policies.find(p=>p.modeId===id).previous.recoil);
 }}finally{globalThis.OleGURPSQOL.weaponCatalogBindings=prior;}
});

test('editing other parameters preserves source Bulk metadata so a later mounting choice remains active',async()=>{
 const f=await fixture('WYkHC34-KuQjgMNb-'),attack=f.attack();
 const edited=await openWeaponAttackEditor({attack,parseRateOfFire:()=>({valid:true}),DialogV2:{wait:async()=>({action:'save',values:{skillLevel:18,rof:'1',acc:3,scopeBonus:0,bulk:-12,rcl:'3'}})}});
 const override=normalizeAttackOverride(edited.value);assert.deepEqual(override.bulkMetadata.sourceValues,[-12,-15]);
 const native={...attack,standaloneRef:undefined,path:'native',key:undefined,uuid:'native',data:{...attack.data,bulk:'-12/-15'}},state={weapons:[{id:'native',ltBulkState:'giant'}],attackOverrides:{'uuid:native':override}};
 const profile=resolver.resolve({actorId:f.actor.id,weaponId:'native',attack:applyAttackOverride(native,state),state,binding:{status:'confirmed',binding:{confirmed:true,modeId:'WYkHC34-KuQjgMNb-'}}});
 assert.equal(profile.effective.bulk,-15);assert.equal(profile.weaponHandling.bulkMetadata.bulkState,'giant');assert.equal(profile.effective.acc,3);
});

test('legacy direct custom Bulk stays manual while both published Bulk values remain available',async()=>{
 const f=await fixture('WYkHC34-KuQjgMNb-');
 f.actor.flags['olegurps-qol'].standaloneWeapons.weapons[0].modes[0].snapshot.stats.bulk='-3';
 const before=JSON.stringify(f.actor.flags);assert.equal(f.attack().bulk,-3);assert.equal(f.attack().weaponHandling.bulkMetadata.manual,true);
 assert.deepEqual(f.attack().weaponHandling.bulkMetadata.sourceValues,[-12,-15]);assert.equal(f.profile().effective.bulk,-3);assert.equal(JSON.stringify(f.actor.flags),before);
});

test('changing ordinary LT minimum ST or actor ST cannot change Fire Control skill, aim or movement penalties',async()=>{
 globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
 const f=await fixture('WqrX0vMt5n6kLV5mq'),token={actor:f.actor},fire=createFireControlContext({token,fireService:new FireService({actor:f.actor,token})});
 const bands=[{index:0,max:20,penalty:0,label:'20'}],targeting={getSelection:id=>({zoneId:id,label:id,canonicalKeys:[id],penalty:0})};
 const values={rangeIndex:0,shots:1,targetDistanceOverride:8,aimSeconds:2,braced:false,moveAndAttack:false,hitLocationId:'torso',visibility:{mode:'normal'}};
 const before=fire.calculateEffectiveFireSkillDetails(f.attack(),values,bands,targeting);assert.ok(before);
 f.actor.system.attributes.ST.value=1;const after=fire.calculateEffectiveFireSkillDetails({...f.attack(),st:'999',data:{...f.attack().data,st:'999'}},values,bands,targeting);
 assert.equal(after.effectiveSkill,before.effectiveSkill);assert.equal(after.moveAttackPenalty,before.moveAttackPenalty);assert.deepEqual(after.modifiers,before.modifiers);
});
