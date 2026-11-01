import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {LT_BLADE_PROFILES,ltBladeGripPolicy,projectLTBladeSourceData} from '../scripts/lt-blade-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,meleeProfileContext,resolveMeleeProfile,meleeMartialGrips} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
import {ltMeleeQualityProfile} from '../scripts/lt-melee-quality-data.js';
import {resolveMeleeQuality} from '../scripts/tools/melee-profile-service.js';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/lt-blades-m21.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();assert.equal(catalogs.getStatus('weapons').status,'ready');globalThis.OleGURPSQOL={catalogs};
const skillNames=['Broadsword','Shortsword','Two-Handed Sword','Knife','Main-Gauche','Rapier','Saber','Smallsword','Axe/Mace','Brawling','Flail'];
function actor(skills=Object.fromEntries(skillNames.map(n=>[n,16]))){const flags={};return {id:'m21',isOwner:true,system:{ads:{},swing:'1d+2',thrust:'1d-1',attributes:{ST:{value:12,import:12},DX:{value:12}},
 skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,points:4}]))},
 getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};}
async function weapon(a,modeId){const eid=catalogs.getEquipmentForMode(modeId).equipment_id,d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(eid);
 const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,modeId);}
function parse(attack){const m=/^(sw|thr)([+-]\d+)?(?:\(([\d.]+)\))?\s+(\w+)$/u.exec(attack.damage);assert.ok(m,attack.damage);
 return {...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:(m[2]??'')+(m[3]?'('+m[3]+')':''),damagetype:m[4]}};}
async function preview(a,attack,selection={}){const p=resolveMeleeProfile({actor:a,attack,selection});assert.equal(p.readinessReason,null,p.readinessReason);
 return {p,prepared:await prepareEffectiveMeleeDamage({actor:a,attack:parse(p)})};}

for(const row of vectors.modes)test('M2.1 '+row.modelId+' '+row.modeId+' '+row.expectedDamageST12,async()=>{
 const a=actor(),attack=await weapon(a,row.modeId),r=await preview(a,attack);
 assert.equal(r.prepared.formula,row.expectedDamageST12);assert.equal(r.p.level,row.expectedLevel);
 assert.equal(r.p.meleeProfile.modeId,row.modeId);assert.equal(r.p.meleeProfile.equipmentId,row.equipmentId);
 assert.ok(r.p.meleeProfile.sourcePages.length);assert.ok(row.primarySkills.includes(r.p.meleeProfile.skill.name));
 assert.equal(JSON.stringify(a.system.ads),'{}');
});

test('M2.1 source layer is exact, idempotent, preserves protected source and foreign books',()=>{
 const original=catalogs.getSourceCatalog('weapons'),before=JSON.stringify(original),copy=structuredClone(original);
 projectLTBladeSourceData('weapons',copy);const once=JSON.stringify(copy);projectLTBladeSourceData('weapons',copy);
 assert.equal(JSON.stringify(copy),once);assert.equal(JSON.stringify(original),before);
 for(const e of original.equipment.filter(e=>e.source!=='LT'))assert.deepEqual(copy.equipment.find(x=>x.equipment_id===e.equipment_id),e);
 const scopedEquipment=new Set(Object.values(LT_BLADE_PROFILES).map(p=>p.equipmentId));
 for(const e of original.equipment.filter(e=>e.source==='LT'&&!scopedEquipment.has(e.equipment_id)))
  assert.deepEqual(copy.equipment.find(x=>x.equipment_id===e.equipment_id),e);
 const added=copy.equipment.filter(e=>!original.equipment.some(x=>x.equipment_id===e.equipment_id));assert.deepEqual(added.map(e=>e.equipment_id),['eLTM21Haladie']);
 const oldModes=new Set(original.equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id)));
 assert.deepEqual(copy.equipment.flatMap(e=>e.modes).filter(m=>!oldModes.has(m.weapon_mode_id)).map(m=>m.weapon_mode_id).sort(),
  ['wLTM21HaladieSwing','wLTM21HaladieThrust','wLTM21FalchionBlunt','wLTM21LargeFalchionBlunt','wLTM21SmallFalchionBlunt'].sort());
 assert.equal(new Set(Object.values(LT_BLADE_PROFILES).map(p=>p.modelId)).size,45);
});

test('M2.1 selected Khopesh skill uses only its own published defaults; Cutlass Tonfa is -3',async()=>{
 const a=actor({Flail:16,Broadsword:8});
 for(const id of ['wKPtQScfJKNLG7P4d','wDarLLleugEGfrLUQ']){
  const raw=await weapon(a,id),axe=await preview(a,raw,{skill:'Axe/Mace'}),sword=await preview(a,raw,{skill:'Broadsword'});
  assert.equal(axe.p.level,12);assert.equal(axe.p.meleeProfile.skill.sourceName,'Flail');assert.equal(sword.p.level,8);
 }
 const b=actor({Tonfa:16}),cutlass=await weapon(b,'wR5bu7VYWnjvWmbvA');assert.equal((await preview(b,cutlass)).p.level,13);
 const unlearned=actor({});assert.equal((await preview(unlearned,await weapon(unlearned,'wQujs7XdsAnMYkKNf'))).p.level,7);
});

test('M2.1 Defensive Grip distinguishes one-handed and hand-and-half weapons; tip is Thrust only',async()=>{
 const a=actor();
 for(const [id,grip,formula,level,reach]of [
  ['wQujs7XdsAnMYkKNf','defensive','1d+4 cut',14,'1'],
  ['w0djXNfWD-9ebEkWu','defensive','1d+1 cut',16,'1'],
  ['wQujs7XdsAnMYkKNf','tip','1d-1 cr',14,'C'],
  ['wFPg5nfFuttYPOx2m','tip','1d-1 imp',14,'C'],
  ['wCvhT_0eM2yPePvW4','tip','1d-1 cr',16,'C'],
  ['wX7eODgqipAOT5M25','reversed','1d-2 cut',16,'C'],
  ['wRnPDzwFZGMjBjyV9','reversed','1d+1 cr',16,'1']]){
  const r=await preview(a,await weapon(a,id),{grip});assert.equal(r.prepared.formula,formula);assert.equal(r.p.level,level);assert.equal(r.p.reach,reach);
  if(grip==='tip'){assert.equal(r.p.meleeProfile.motion,'thrust');assert.ok(r.p.meleeProfile.gripEffects.conditions.some(s=>s.includes('Swing невозможен')));}
 }
 const hand=await preview(a,await weapon(a,'wLTM21HaladieThrust'),{grip:'reversed'});assert.equal(hand.prepared.formula,'1d imp');assert.equal(hand.p.level,15);
 assert.ok(hand.p.meleeProfile.gripEffects.conditions[0].includes('без Ready'));
 for(const id of ['wGi1SKSvh2Fd0lFFF','wQTzxzVCkGBlSZwU2'])assert.ok(!meleeMartialGrips(LT_BLADE_PROFILES[id]).includes('reversed'));
 assert.deepEqual(ltBladeGripPolicy(LT_BLADE_PROFILES['wXzMRSEvTL-CfNg90']).grips,[]);
 assert.ok(!meleeMartialGrips(LT_BLADE_PROFILES.wKPtQScfJKNLG7P4d).includes('tip'));
 const strong=actor();strong.system.attributes.ST.value=20;strong.system.attributes.ST.import=20;strong.system.swing='3d+2';strong.system.thrust='2d-1';
 const capped=await preview(strong,await weapon(strong,'wbJlLT2OmOHM-e7m4'));
 assert.equal(capped.p.meleeProfile.strength.maximumST,15);assert.equal(capped.prepared.formula,'1d imp');
});

test('M2.1 every eligible grip is numerical and does not change physical identity or actor data',async()=>{
 const a=actor(),system=JSON.stringify(a.system);let checked=0;
 for(const row of vectors.modes){const raw=await weapon(a,row.modeId);
  for(const grip of meleeMartialGrips(meleeProfileContext(a,raw).source)){
   const r=await preview(a,raw,{grip});assert.ok(r.prepared?.formula);assert.equal(r.p.standaloneRef.weaponId,raw.standaloneRef.weaponId);checked++;
  }
 }
 assert.ok(checked>200);assert.equal(JSON.stringify(a.system),system);
});

test('M2.1 Fine/Balanced/Superfine and material apply to the blade, not hilt; Brawling is once',async()=>{
 const a=actor(),hilt=await weapon(a,'wXzMRSEvTL-CfNg90'),blade=await weapon(a,'whQGQCp1NY8G3zsGk');
 const bare=ltMeleeQualityProfile('wXzMRSEvTL-CfNg90',catalogs);assert.equal(bare.damagePart,'hilt');
 assert.equal(resolveMeleeQuality(bare,{quality:'Fine',material:'bone'}).damageBonus,0);
 for(const selection of [{quality:'Fine',balance:'Balanced',material:'bone',weaponTL:3},
  {quality:'Fine',material:'steel',blade:'superfine',weaponTL:9}]){
  const r=await preview(a,hilt,selection);assert.equal(r.prepared.formula,'1d cr');assert.equal(r.p.meleeProfile.quality.damageBonus,0);
 }
 assert.equal((await preview(a,blade,{quality:'Fine',weaponTL:3})).prepared.formula,'1d+4 cut');
 assert.equal((await preview(a,blade,{quality:'Fine',weaponTL:9,blade:'superfine'})).prepared.formula,'1d+5(2) cut');
 const d=actor({});assert.equal((await preview(d,await weapon(d,'wXzMRSEvTL-CfNg90'))).prepared.formula,'1d-1 cr');
 const imported={...hilt,key:'imported-hilt',standaloneRef:undefined,catalogBinding:{modeId:'wXzMRSEvTL-CfNg90'},level:16,damage:'thr+1 cr'};
 assert.equal((await preview(a,imported,{baselineQuality:'Fine',baselineMaterial:'steel'})).prepared.formula,'1d cr');
});

test('M2.1 legacy records gain source-only variants read-only, overrides and frozen history survive',async()=>{
 const a=actor(),raw=await weapon(a,'wNHtL77GGOTUrERFY'),flags=a.getFlag('olegurps-qol','standaloneWeapons');
 const record=flags.weapons.find(r=>r.id===raw.standaloneRef.weaponId);record.modes=record.modes.filter(m=>m.modeId!=='wLTM21FalchionBlunt');
 record.modes[0].overrides.extraOwnerData='preserve';await a.setFlag('olegurps-qol','standaloneWeapons',flags);
 const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons'));
 const projected=new StandaloneWeaponService(a,catalogs).get(record.id);assert.ok(projected.modes.some(m=>m.modeId==='wLTM21FalchionBlunt'));
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);
 const s=new MeleeProfileService(a),original=await preview(a,raw,{quality:'Fine',weaponTL:3});
 const shot=freezeMeleeAttackProfile({actor:a,attack:original.p,preparedDamage:original.prepared}),snapshot=JSON.stringify(shot);
 await s.save(raw,{modeId:'wLTM21FalchionBlunt',quality:'Fine',weaponTL:9,material:'steel',grip:'published'});
 const rebuilt=readStandaloneAttack(a,record.id,raw.standaloneRef.modeId),after=await preview(a,rebuilt,null);
 assert.equal(after.prepared.formula,'1d-3 cr');assert.equal(after.p.meleeProfile.modeId,'wLTM21FalchionBlunt');assert.equal(after.p.meleeProfile.quality.weaponTL,9);
 assert.equal(JSON.stringify(shot),snapshot);assert.equal(shot.damage.formula,'1d+4 cut');
 assert.equal(new StandaloneWeaponService(a,catalogs).get(record.id).modes[0].overrides.extraOwnerData,'preserve');
 const blank=resolveMeleeProfile({actor:a,attack:{...rebuilt,reach:'',parry:'No'},selection:{grip:'published'}});assert.equal(blank.readinessReason,null);
 assert.equal(resolveMeleeCombatCalculation({actor:a,baseSkill:16,weaponBond:true}).effectiveSkill,17);
});

test('M2.1 compact mode/grip labels and source help are Russian; no duplicated learned-skill line',async()=>{
 const a=actor(),main=await weapon(a,'w4u4u0o25at0Ju-Am'),html=meleeProfileEditorHTML(meleeProfileContext(a,main),{},String,a,main);
 assert.match(html,/Swing.*Main-Gauche/);assert.match(html,/Swing.*Knife/);assert.match(html,/Хват \/ Ready/);assert.match(html,/Reach.*Parry/);
 assert.doesNotMatch(html,/<p[^>]*>Для смены хвата требуется Ready/);
 const hilt=await weapon(a,'wXzMRSEvTL-CfNg90');assert.ok(meleeProfileEditorHTML(meleeProfileContext(a,hilt),{},String,a,hilt).includes('Гарда (Thrust)'));
});
