import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {LT_IMPACT_PROFILES,ltImpactGripPolicy,applyLTImpactSourceMode,projectLTImpactSourceData} from '../scripts/lt-impact-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,meleeProfileContext,resolveMeleeProfile,meleeMartialGrips} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation,getRapidStrikePenalty} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {meleeCombatControls,saveMeleeCombatControl,selectMeleeCombatMode} from '../scripts/tools/melee-combat-controls.js';
import {meleeEditorCompatibility,selectMeleeEditorProfile,meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/lt-impact-m22.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(levels=null,st=12){const flags={},names=[...new Set(vectors.modes.flatMap(r=>r.expected.skills)), 'Flail'];return {id:crypto.randomUUID(),isOwner:true,writes:0,system:{ads:{},swing:st===20?'3d+2':'1d+2',thrust:st===20?'2d-1':'1d-1',attributes:{ST:{value:st,import:st},DX:{value:12}},skills:Object.fromEntries(Object.entries(levels??Object.fromEntries(names.map(n=>[n,16]))).filter(([n])=>n!=='DX').map(([name,level],i)=>[i,{name,level,points:4}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);this.writes++;}};}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
function parse(attack){const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(attack.damage);assert.ok(m,attack.damage);return {...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}};}
async function preview(a,raw,selection={}){const p=resolveMeleeProfile({actor:a,attack:raw,selection});assert.equal(p.readinessReason,null,p.readinessReason);const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:parse(p)});assert.ok(prepared);return {p,prepared};}
for(const row of vectors.modes)test('M2.2 '+row.modelId+'/'+row.modeId+' = '+row.expectedDamageST12,async()=>{
 const a=actor(),system=JSON.stringify(a.system),raw=await weapon(a,row.modeId),r=await preview(a,raw);
 assert.equal(r.prepared.formula,row.expectedDamageST12);assert.equal(r.p.level,row.expectedLevelST12);
 assert.equal(r.p.meleeProfile.equipmentId,row.equipmentId);assert.equal(r.p.meleeProfile.modeId,row.modeId);assert.equal(r.p.meleeProfile.strength.hands,row.expected.hands);
 assert.equal(r.p.damage,row.expected.damage);assert.equal(r.p.st,row.expected.st);assert.equal(JSON.stringify(a.system),system);
 assert.ok(r.p.meleeProfile.sourcePages.length);assert.equal(new Set(catalogs.getEquipment(row.equipmentId).modes.map(m=>m.weapon_mode_id)).size,catalogs.getEquipment(row.equipmentId).modes.length);
});
test('M2.2 projection adds only the exact Round Mace mode and preserves every ranged mode, source and foreign equipment',()=>{
 const original=catalogs.getSourceCatalog('weapons'),before=JSON.stringify(original),copy=structuredClone(original);projectLTImpactSourceData('weapons',copy);
 for(const equipment of copy.equipment)for(const mode of equipment.modes)applyLTImpactSourceMode(mode,equipment);
 const once=JSON.stringify(copy);projectLTImpactSourceData('weapons',copy);for(const equipment of copy.equipment)for(const mode of equipment.modes)applyLTImpactSourceMode(mode,equipment);assert.equal(JSON.stringify(copy),once);assert.equal(JSON.stringify(original),before);
 assert.deepEqual(copy.equipment.map(e=>e.equipment_id),original.equipment.map(e=>e.equipment_id));
 const ids=new Set(original.equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id)));assert.deepEqual(copy.equipment.flatMap(e=>e.modes).filter(m=>!ids.has(m.weapon_mode_id)).map(m=>m.weapon_mode_id),['wLTM22RoundMaceTwoHanded']);
 const scoped=new Set(vectors.models.map(m=>m.equipmentId));for(const e of original.equipment){const next=copy.equipment.find(x=>x.equipment_id===e.equipment_id);if(!scoped.has(e.equipment_id))assert.deepEqual(next,e);else for(const m of e.modes.filter(m=>m.combat_type!=='melee'))assert.deepEqual(next.modes.find(x=>x.weapon_mode_id===m.weapon_mode_id),m);}
});
test('M2.2 old Round Mace definitions gain the source mode on read without writes, custom Damage loss or extra physical copies',async()=>{
 const a=actor(),raw=await weapon(a,'wUghzcAAhlP05GEYz'),data=a.getFlag('olegurps-qol','standaloneWeapons');data.weapons[0].modes=data.weapons[0].modes.filter(m=>m.modeId!=='wLTM22RoundMaceTwoHanded');data.weapons[0].modes[0].overrides.damage='sw+10 cr';await a.setFlag('olegurps-qol','standaloneWeapons',data);
 const old=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),writes=a.writes,r=new StandaloneWeaponService(a,catalogs).get(raw.standaloneRef.weaponId);
 assert.equal(r.modes.length,2);assert.equal(r.modes[0].overrides.damage,'sw+10 cr');assert.equal(r.modes[1].modeId,'wLTM22RoundMaceTwoHanded');assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),old);
 const custom=structuredClone(catalogs.getMode('wpErUadpuBiPHnjsv'));custom.raw_calc.damage='thr+10 cr';custom.stats.damage.base='10';applyLTImpactSourceMode(custom,{source:'LT',equipment_id:'etp2byFFRfqZTt7r-'},{snapshot:true});assert.equal(custom.raw_calc.damage,'thr+10 cr');
});
test('M2.2 Axe and mace use exact published one/two-handed modes, with separate Defensive Grip and no invented Thrust',async()=>{
 const a=actor(null,20),raw=await weapon(a,'wseA0_41AcVRwc1Lf'),c=meleeProfileContext(a,raw),matrix=meleeEditorCompatibility(c,{},a,raw);
 assert.deepEqual(matrix.filter(r=>r.grip==='published').map(r=>[r.modeId,r.hands]),[['wseA0_41AcVRwc1Lf',1],['weiWzhbVzaUanz_k_',2]]);assert.ok(!matrix.some(r=>r.motion==='thrust'||r.grip==='reversed'||r.grip==='tip'));
 const next=selectMeleeEditorProfile(c,{grip:'published',skill:'Axe/Mace'},'modeId','weiWzhbVzaUanz_k_',a,raw);assert.equal(next.modeId,'weiWzhbVzaUanz_k_');assert.equal(next.grip,'published');
 const r=await preview(a,raw,{...next});assert.equal(r.p.meleeProfile.strength.hands,2);assert.equal(r.prepared.formula,'3d+5 cut');
 const defensive=await preview(a,raw,{grip:'defensive'});assert.equal(defensive.p.meleeProfile.strength.hands,2);assert.equal(defensive.prepared.formula,'3d+1 cut');
});
test('M2.2 skill alternatives retain their own defaults and Jutte Parry type; no cross-route zero default',async()=>{
 const a=actor({'Shortsword':16,'Main-Gauche':16}),baton=await weapon(a,'wvVgsh0M0tX0RSFAa');
 const knife=await preview(a,baton,{skill:'Knife'});assert.equal(knife.p.level,13);assert.equal(knife.p.meleeProfile.skill.defaultPenalty,-3);
 const ja=actor({'Main-Gauche':16}),jutte=await weapon(ja,'wNUoip8faip2p8ZWq'),fence=await preview(ja,jutte,{skill:'Main-Gauche'}),jitte=await preview(ja,jutte,{skill:'Jitte/Sai'});
 assert.equal(fence.p.parry,'11F');assert.equal(jitte.p.parry,'9');assert.equal(jitte.p.meleeProfile.skill.defaultPenalty,-4);assert.equal(fence.p.level,16);assert.equal(jitte.p.level,12);
});
test('M2.2 Jo/Quarterstaff preserve distinct Staff/Two-Handed Sword rows; long staff cannot reverse',async()=>{
 const a=actor(),jo=await weapon(a,'wpErUadpuBiPHnjsv');assert.equal((await preview(a,jo)).prepared.formula,'1d cr');assert.equal(jo.damage,'thr+1 cr');
 for(const [id,parry,damage]of [['wDlS-2lWtNFw_hedE','13','1d+4 cr'],['wAYus3-957M-3WGv0','11','1d+4 cr'],['wXyCJ18_keVRhEiNT','13','1d+1 cr'],['weF9Ne-wWV4oRtItv','11','1d cr']]){const r=await preview(a,await weapon(a,id));assert.equal(r.p.parry,parry);assert.equal(r.prepared.formula,damage);}
 const staff=await weapon(a,'wk4ty2OdpeeoKr0i0');assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,staff).source),['defensive']);
});
test('M2.2 Tonfa has three source attacks, intrinsic butt grip, trained punch bonuses and optional better unarmed Parry',async()=>{
 const a=actor({'Tonfa':14,'Brawling':16,'Karate':17}),raw=await weapon(a,'w_bOTXsao1U_Dvy9O');
 assert.equal(meleeCombatControls(a,raw).grips[0].label,'Reversed Grip');assert.equal(meleeCombatControls(a,raw).grips.length,1);
 const b=await preview(a,raw,{skill:'Brawling'}),k=await preview(a,raw,{skill:'Karate'}),dx=await preview(a,raw,{skill:'DX'});
 assert.equal(b.prepared.formula,'1d cr');assert.equal(k.prepared.formula,'1d+1 cr');assert.equal(dx.prepared.formula,'1d-1 cr');
 const reversed=await preview(a,await weapon(a,'wj6pE50-5KRpVquln'),{grip:'reversed'});assert.equal(reversed.prepared.formula,'1d cr');assert.equal(reversed.p.parry,'11');
});
test('M2.2 fist-load bonuses follow exact Boxing/Brawling/Karate thresholds and imported final Damage is not enhanced twice',async()=>{
 for(const [skill,level,expected]of [['Boxing',12,'1d-1 cr'],['Boxing',13,'1d cr'],['Boxing',14,'1d+1 cr'],['Brawling',13,'1d-1 cr'],['Brawling',14,'1d cr'],['Karate',12,'1d cr'],['Karate',13,'1d+1 cr']]){
  const a=actor({[skill]:level}),raw=await weapon(a,'wFrA_h5gC4PZ1uxLj');assert.equal((await preview(a,raw,{skill})).prepared.formula,expected);
 }
 const a=actor(),raw={name:'Imported Tonfa',key:'import',path:'system.melee.00000',level:16,damage:'thr+1 cr',reach:'C',parry:'11',st:null,readinessReason:null,data:{pageref:'LT65'},catalogBinding:{modeId:'w_bOTXsao1U_Dvy9O'}};
 const r=await preview(a,raw);assert.equal(r.prepared.formula,'1d cr');assert.equal(r.p.meleeProfile.damageSkill.bonusPerDie,0);
});
test('M2.2 edge quality never enhances crushing bodies; weapon TL, materials and Superfine retain source limits',async()=>{
 const a=actor(),axe=await weapon(a,'wseA0_41AcVRwc1Lf'),maul=await weapon(a,'w58mAioCCxiLCg3XJ');
 for(const [tl,cost]of [[3,500],[9,50]]){const r=await preview(a,axe,{quality:'Fine',weaponTL:tl});assert.equal(r.prepared.formula,'1d+5 cut');assert.equal(r.p.meleeProfile.quality.price,cost);}
 const sf=await preview(a,axe,{quality:'Fine',weaponTL:9,blade:'superfine'});assert.equal(sf.prepared.formula,'1d+6(2) cut');
 const blunt=await preview(a,maul,{quality:'Very Fine',weaponTL:3});assert.equal(blunt.prepared.formula,'1d+7 cr');assert.equal(blunt.p.meleeProfile.quality.price,1200);
 assert.match(resolveMeleeProfile({actor:a,attack:maul,selection:{weaponTL:9,blade:'superfine'}}).readinessReason,/Superfine/);
 const plastic=await preview(a,axe,{weaponTL:9,quality:'Good',material:'plastic'});assert.equal(plastic.p.meleeProfile.quality.price,40);assert.equal(plastic.p.meleeProfile.quality.mass,2);
 const wood=await preview(a,await weapon(a,'wZOAYw4rp9DEQ56j7'),{quality:'Fine',material:'bone',weaponTL:3});assert.equal(wood.prepared.formula,'1d+1 cr');assert.equal(wood.p.meleeProfile.quality.mass,1);
 const warhammer=await preview(a,await weapon(a,'wLrG7BtaQ4ofJ9yZP'),{quality:'Fine',weaponTL:3});assert.equal(warhammer.prepared.formula,'1d+7 imp');assert.equal(warhammer.p.meleeProfile.quality.price,300);
});
test('M2.2 instance flags, overrides, OWNER rights and frozen Damage survive independent selection changes',async()=>{
 const a=actor(),system=JSON.stringify(a.system),first=await weapon(a,'wseA0_41AcVRwc1Lf'),second=await weapon(a,'wseA0_41AcVRwc1Lf'),service=new MeleeProfileService(a);
 await service.save(first,{weaponTL:3,quality:'Fine',material:'steel',skill:'Axe/Mace'});await service.save(second,{weaponTL:9,quality:'Good',material:'plastic'});
 const r=await preview(a,first,meleeProfileContext(a,first).saved),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m22-frozen'}),old=JSON.stringify(shot);
 assert.equal(shot.profile.damage.formula,'1d+5 cut');assert.ok(Object.isFrozen(shot.profile.damage));assert.equal(shot.profile.damage.rules.meleeSnapshot.combatProfile.quality.weaponTL,3);
 await saveMeleeCombatControl(a,first,'grip','defensive');assert.equal(meleeProfileContext(a,second).saved.weaponTL,9);assert.equal(meleeProfileContext(a,first).saved.weaponTL,3);assert.equal(JSON.stringify(shot),old);assert.equal(JSON.stringify(a.system),system);
 const reopened=readStandaloneAttack(a,first.standaloneRef.weaponId,first.standaloneRef.modeId);assert.equal(meleeProfileContext(a,reopened).saved.grip,'defensive');
 a.isOwner=false;const saved=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles'));await assert.rejects(service.save(reopened,{quality:'Good'}),/прав/);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),saved);
 const calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:16,weaponBond:true});assert.equal(calc.effectiveSkill,17);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
});
test('M2.2 per-mode minimum ST override caps Damage independently and manual mastery changes only its existing channel',async()=>{
 const a=actor(null,20),first=await weapon(a,'wseA0_41AcVRwc1Lf'),second=await weapon(a,'wseA0_41AcVRwc1Lf'),defs=new StandaloneWeaponService(a,catalogs),before=JSON.stringify(a.system);
 const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:defs.get(first.standaloneRef.weaponId)});draft.setOverride(first.standaloneRef.modeId,'st','5');await defs.save(draft);
 const changed=await preview(a,readStandaloneAttack(a,first.standaloneRef.weaponId,first.standaloneRef.modeId));
 assert.equal(changed.p.meleeProfile.strength.maximumST,15);assert.equal(changed.prepared.formula,'2d+3 cut');assert.equal((await preview(a,second)).prepared.formula,'3d+4 cut');assert.equal(JSON.stringify(a.system),before);
 for(const [mastery,expected]of [[true,14],[false,11]]){const calc=resolveMeleeCombatCalculation({actor:a,attack:changed.p,baseSkill:16,weaponBond:true,rapidStrikePenalty:getRapidStrikePenalty(mastery)});assert.equal(calc.effectiveSkill,expected);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);}
});
