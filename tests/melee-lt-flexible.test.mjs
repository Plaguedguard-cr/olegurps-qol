import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {projectMeleeSourceData} from '../scripts/melee-source-data.js';
import {LT_FLEXIBLE_PROFILES,LT_FLEXIBLE_MANUAL,applyLTFlexibleSourceMode,projectLTFlexibleSourceData} from '../scripts/lt-flexible-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,meleeProfileContext,resolveMeleeProfile,meleeMartialGrips,resolveMeleeHands} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {meleeCombatControls,selectMeleeCombatMode} from '../scripts/tools/melee-combat-controls.js';
import {meleeEditorCompatibility,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/lt-flexible-exotic-m24.json',import.meta.url),'utf8'));
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(levels=null,st=12){
 const flags={},names=[...new Set(vectors.modes.flatMap(r=>r.expected.skills))];
 return {id:crypto.randomUUID(),isOwner:true,writes:0,system:{ads:{},swing:st===20?'3d+2':'1d+2',thrust:st===20?'2d-1':'1d-1',attributes:{ST:{value:st,import:st},DX:{value:12}},skills:Object.fromEntries(Object.entries(levels??Object.fromEntries(names.map(n=>[n,16]))).map(([name,level],i)=>[i,{name,level,points:4}]))},
  getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);this.writes++;}};
}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
async function preview(a,raw,selection={}){
 const p=resolveMeleeProfile({actor:a,attack:raw,selection});assert.equal(p.readinessReason,null,p.readinessReason);
 const m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(p.damage);assert.ok(m,p.damage);
 const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:{...p,sourceDamage:p.damage,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}}});
 assert.ok(prepared);return {p,prepared};
}
// One parameterized suite, including independently transcribed ALREADY_CORRECT rows.
for(const row of vectors.modes)test('M2.4 source '+row.modelId+'/'+row.modeId,async()=>{
 const a=actor(),system=JSON.stringify(a.system),raw=await weapon(a,row.modeId),{p,prepared}=await preview(a,raw);
 const source=meleeProfileContext(a,raw).source,m=catalogs.getMode(row.modeId);
 assert.equal(catalogs.getEquipmentForMode(row.modeId).equipment_id,row.equipmentId);
 for(const key of ['damage','reach','parry','st'])assert.equal(source.stats[key],row.expected[key]);
 assert.equal(m.raw_calc.damage,row.expected.damage);assert.equal(m.stats.strength,row.expected.st);
 assert.equal(m.stats.reach,row.expected.reach);assert.equal(m.stats.parry,row.expected.parry);
 assert.deepEqual(source.primarySkills,row.expected.skills);
 for(const option of source.sourceOptions)assert.deepEqual(option.defaults.map(d=>[d.from,d.modifier]),row.expected.defaults[option.unmodifiedSkills[0]]);
 assert.equal(source.attackModifier,row.expected.directPenalty);assert.equal(source.attackOnlyModifier??0,row.expected.attackOnlyModifier);
 assert.deepEqual(meleeMartialGrips(source),row.expected.grips);
 assert.equal(p.meleeProfile.strength.hands,row.expected.hands);assert.equal(source.occupiedHands??source.hands,row.expected.occupiedHands);
 assert.equal(p.level,row.levelST12);assert.equal(prepared.formula,row.formulaST12);
 const defenseLevel=row.levelST12-row.expected.attackOnlyModifier;
 assert.equal(p.parry,String(3+Math.floor(defenseLevel/2)+Number.parseInt(row.expected.parry))+(row.expected.parry.match(/[UF]/g)?.join('')??''));
 const fine=await preview(a,raw,{quality:'Fine',weaponTL:3});
 const bonus=/ (cut|imp)$/.test(row.expected.damage)?1:0;
 const original=/^(\d+)d([+-]\d+)?(\([\d.]+\))? (\S+)$/.exec(row.formulaST12),adds=Number(original[2]??0)+bonus;
 assert.equal(fine.prepared.formula,original[1]+'d'+(adds>0?'+'+adds:adds<0?String(adds):'')+(original[3]??'')+' '+original[4]);
 assert.equal(JSON.stringify(a.system),system);
});

test('M2.4 Crack is attack-only -4: Parry, defaults, GGA and OWNER totals never double it',async()=>{
 const id='wLTM24Crackw1AltMJIpSr4nl0bG',a=actor(),raw=await weapon(a,id),r=await preview(a,raw);
 assert.equal(r.p.level,12);assert.equal(r.p.parry,'9U');assert.equal(r.prepared.formula,'1d+2(0.5) cr');
 const d=actor({}),draw=await weapon(d,id),dr=await preview(d,draw);
 assert.equal(dr.p.level,3);assert.equal(dr.p.parry,'4U');assert.equal(dr.p.meleeProfile.skill.defaultPenalty,-5);
 const imported={name:'Whip Crack',key:'crack-import',path:'system.melee.00000',level:12,damage:'sw(0.5) cr',reach:'1*',parry:'9U',st:'6',readinessReason:null,data:{pageref:'B406'},catalogBinding:{modeId:id}};
 assert.equal((await preview(a,imported)).p.level,12);assert.equal((await preview(a,imported)).p.parry,'9U');
 const owner={...raw,meleeManualOverride:{skillLevel:13,parry:'10U'}};
 assert.equal((await preview(a,owner)).p.level,13);assert.equal((await preview(a,owner)).p.parry,'10U');
 const specials=Object.values(LT_FLEXIBLE_PROFILES).filter(p=>p.attackOnlyModifier);
 assert.equal(specials.length,14);assert.ok(specials.every(p=>['lt:whip','lt:light-whip'].includes(p.modelId)));
});

test('M2.4 composite chain requires two functioning hands at high ST; kama and jutte stay separate',async()=>{
 const a=actor(null,20);
 for(const id of ['w4pZRqUWQMcym0hgH','wbxy8LKFbCdKlZ9bg','wS8EiOZDmhktPWrOL','w0FLKtHz-pmk-8heX']){
  const raw=await weapon(a,id),context=meleeProfileContext(a,raw);
  assert.match(resolveMeleeProfile({actor:a,attack:raw,selection:{grip:'one-handed'}}).readinessReason,/две работающие руки/);
  assert.ok(!meleeCombatControls(a,raw).grips.some(g=>g.value==='one-handed'));
  assert.ok(!meleeEditorCompatibility(context,{},a,raw).some(r=>r.sourceModeId===id&&r.grip==='one-handed'));
 }
 assert.equal(resolveMeleeHands('10†','one-handed',20).hands,1);
 assert.equal(resolveMeleeHands('5','published',20,2,true).hands,2);
 const kama=await weapon(a,'wLTM24KusarigamaKamaSwing'),kp=await preview(a,kama);
 assert.equal(kp.p.meleeProfile.strength.hands,1);assert.equal(kp.p.meleeProfile.occupiedHands,2);
 assert.deepEqual(meleeCombatControls(a,kama).skills.map(s=>s.value),['Axe/Mace']);
 const jutte=await weapon(a,'wLTM24KusarijutteJutteThrust');
 assert.equal((await preview(a,jutte,{skill:'Main-Gauche'})).p.parry,'11F');
 assert.equal((await preview(a,jutte,{skill:'Jitte/Sai'})).p.parry,'11');
 assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,jutte).source),[]);
});

test('M2.4 quality stays on the attacking part; native AD0.5 and fixed materials survive',async()=>{
 const a=actor(),kama=await weapon(a,'wLTM24KusarigamaKamaSwing');
 assert.equal((await preview(a,kama,{quality:'Fine',weaponTL:3})).prepared.formula,'1d+3 cut');
 const chain=readStandaloneAttack(a,kama.standaloneRef.weaponId,'w4pZRqUWQMcym0hgH');
 assert.equal((await preview(a,chain,{quality:'Fine',weaponTL:3})).prepared.formula,'1d+4 cr');
 const body=await weapon(a,'wi-HH-1c3UiO_J_12');assert.equal((await preview(a,body,{quality:'Fine',weaponTL:3})).prepared.formula,'1d+3 cr');
 const guard=readStandaloneAttack(a,body.standaloneRef.weaponId,'wlZZOVljTOJxxVkBh');assert.equal((await preview(a,guard,{quality:'Fine',weaponTL:3})).prepared.formula,'1d cut');
 for(const id of ['wo_KNv17YIJJ_jfHC','w0rw-3n-eFBBDnKHM','wLTM24BeltSwordBlade']){
  const raw=await weapon(a,id),r=await preview(a,raw,{quality:'Fine',weaponTL:9});assert.match(r.prepared.formula,/\(0.5\)/);
  assert.match(resolveMeleeProfile({actor:a,attack:raw,selection:{quality:'Fine',weaponTL:9,blade:'superfine'}}).readinessReason,/Superfine/);
 }
 assert.match(resolveMeleeProfile({actor:a,attack:chain,selection:{material:'bone'}}).readinessReason,/Материал/);
});

test('M2.4 Brawling/Karate bonuses come from the learned skill once, never a default or imported total',async()=>{
 const a=actor(),raw=await weapon(a,'ws77JJHocfeTR0xvB');
 assert.equal((await preview(a,raw,{skill:'Brawling'})).prepared.formula,'1d+1 cut');
 assert.equal((await preview(a,raw,{skill:'Karate'})).prepared.formula,'1d+2 cut');
 assert.equal((await preview(a,raw,{skill:'DX'})).prepared.formula,'1d cut');
 const d=actor({}),dr=await weapon(d,'ws77JJHocfeTR0xvB');assert.equal((await preview(d,dr)).prepared.formula,'1d cut');
 const imported={name:'Bladed Hand',key:'hand-import',path:'system.melee.00000',level:16,damage:'sw cut',reach:'C',parry:'11',st:'6',readinessReason:null,data:{pageref:'LT65'},catalogBinding:{modeId:'ws77JJHocfeTR0xvB'}};
 assert.equal((await preview(a,imported,{skill:'Karate'})).prepared.formula,'1d+2 cut');
 const held=await weapon(a,'wLTM24ThongedClubHandheld');assert.equal((await preview(a,held)).prepared.formula,'1d cr');
});

test('M2.4 Three-Part Staff -1 and Defensive Grip: no extra DWA, correct swing reduction',async()=>{
 const a=actor(),raw=await weapon(a,'wr8V0VeSgguFhEqnr'),r=await preview(a,raw,{grip:'defensive'});
 assert.equal(r.p.level,15);assert.equal(r.p.parry,'11U');assert.equal(r.prepared.formula,'1d+3 cr');assert.equal(r.p.meleeProfile.strength.hands,2);
 const d=actor({Flail:16}),dr=await weapon(d,'wr8V0VeSgguFhEqnr');assert.equal((await preview(d,dr)).p.level,12);
 assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,raw).source),['defensive']);
 assert.ok(!meleeCombatControls(a,raw).hint.includes('Направление защиты учитывается вручную'));
});

test('M2.4 Tip Slash uses max reach and swing effects, no automatic thrust for swing-only weapons',async()=>{
 const a=actor(),raw=await weapon(a,'wLTM24Tipw0rw-3n-eFBBDnKHM'),r=await preview(a,raw,{grip:'reversed'});
 assert.equal(r.p.meleeProfile.motion,'swing');assert.equal(r.prepared.formula,'1d-3(0.5) cut');
 assert.equal(Object.values(LT_FLEXIBLE_PROFILES).filter(p=>p.motion==='swing'&&p.stats.damage.startsWith('thr')).length,9);
 for(const name of ['lt:whip','lt:light-whip','lt:chain-whip','lt:flail','lt:nunchaku','lt:belt-sword'])assert.ok(!Object.values(LT_FLEXIBLE_PROFILES).some(p=>p.modelId===name&&p.stats.damage.startsWith('thr')));
});

test('M2.4 spec-only modes stay manual, with no invented Damage or ordinary profile',async()=>{
 const a=actor();for(const p of Object.values(LT_FLEXIBLE_MANUAL)){
  const raw=await weapon(a,p.modeId);assert.equal(meleeProfileContext(a,raw),null);
  assert.match(raw.readinessReason,/вручную/);assert.equal(raw.damage,p.stats.damage);
  assert.ok(meleeCombatControls(a,raw).hint.includes(p.manualHint));
 }
 const scarf=await weapon(a,'wM0_2Mzxj7FWoM6sG');assert.ok(meleeProfileContext(a,scarf).profiles.every(p=>!p.manualOnly));
});

test('M2.4 Ready and defense hints match exact types, lengths and parts',async()=>{
 const a=actor();for(const row of vectors.modes.filter(r=>r.modelId==='lt:whip'&&r.sourceBefore)){
  const raw=await weapon(a,row.modeId),hint=meleeCombatControls(a,raw).hint;
  assert.equal(hint.includes('Требуется Ready после атаки.'),LT_FLEXIBLE_PROFILES[row.modeId].lengthYards>=2);
  assert.ok(!hint.includes('Без дополнительного Ready')&&!hint.includes('Направление защиты учитывается вручную'));
 }
 const kama=await weapon(a,'wLTM24KusarigamaKamaSwing');assert.ok(!meleeCombatControls(a,kama).hint.includes('Parry −4'));
 const chain=readStandaloneAttack(a,kama.standaloneRef.weaponId,'w4pZRqUWQMcym0hgH');assert.ok(meleeCombatControls(a,chain).hint.includes('Parry −4'));
});

test('M2.4 exact projection preserves raw source, ranged modes, unrelated records and cardinality; idempotent',async()=>{
 const raw=catalogs.getSourceCatalog('weapons'),rawHash=JSON.stringify(raw),before=structuredClone(raw);
 // Isolate M2.4 overlay against the original input, including its added Belt Sword.
 const copy=structuredClone(before),ids=new Set(vectors.modes.map(r=>r.equipmentId));
 const project=()=>{projectLTFlexibleSourceData('weapons',copy);for(const e of copy.equipment)for(const m of e.modes)applyLTFlexibleSourceMode(m,e);};
 project();const once=JSON.stringify(copy);project();assert.equal(JSON.stringify(copy),once);assert.equal(JSON.stringify(raw),rawHash);
 assert.deepEqual(copy.equipment.filter(e=>!before.equipment.some(o=>o.equipment_id===e.equipment_id)).map(e=>e.equipment_id),['eLTM24BeltSword']);
 const old=new Set(before.equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id)));
 assert.deepEqual(copy.equipment.flatMap(e=>e.modes).filter(m=>!old.has(m.weapon_mode_id)).map(m=>m.weapon_mode_id).sort(),vectors.modes.filter(r=>!r.sourceBefore).map(r=>r.modeId).sort());
 for(const e of before.equipment){const after=copy.equipment.find(n=>n.equipment_id===e.equipment_id);if(!ids.has(e.equipment_id)&&!Object.values(LT_FLEXIBLE_MANUAL).some(p=>p.equipmentId===e.equipment_id))assert.deepEqual(after,e);else for(const m of e.modes.filter(m=>m.combat_type!=='melee'))assert.deepEqual(after.modes.find(n=>n.weapon_mode_id===m.weapon_mode_id),m);}
 assert.equal(catalogs.getEquipment('e_cCkf4diFiNi3Zli').tech_level,'3');
 const foreign=structuredClone(catalogs.getMode('wo_KNv17YIJJ_jfHC')),hash=JSON.stringify(foreign);applyLTFlexibleSourceMode(foreign,{source:'LT',equipment_id:'foreign'});assert.equal(JSON.stringify(foreign),hash);
});

test('M2.4 read-through adds modes to the same specimen, preserving manual overrides without writes',async()=>{
 const a=actor(),raw=await weapon(a,'w4pZRqUWQMcym0hgH'),stored=a.getFlag('olegurps-qol','standaloneWeapons');
 stored.weapons[0].modes=stored.weapons[0].modes.filter(m=>!m.modeId.startsWith('wLTM24'));stored.weapons[0].modes[0].overrides.damage='sw+10 cr';await a.setFlag('olegurps-qol','standaloneWeapons',stored);
 const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),writes=a.writes,r=new StandaloneWeaponService(a,catalogs).get(raw.standaloneRef.weaponId);
 assert.equal(r.modes.length,6);assert.equal(r.modes[0].overrides.damage,'sw+10 cr');assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);
 const m=structuredClone(catalogs.getMode('w1AltMJIpSr4nl0bG'));m.stats.strength='42';m.raw_calc.damage='sw+99 cr';applyLTFlexibleSourceMode(m,{source:'LT',equipment_id:catalogs.getEquipmentForMode(m.weapon_mode_id).equipment_id},{snapshot:true});assert.equal(m.stats.strength,'42');assert.equal(m.raw_calc.damage,'sw+99 cr');
});

test('M2.4 separate TL/ST/Bond, historical snapshots and OWNER boundaries survive mode changes',async()=>{
 const a=actor(),system=JSON.stringify(a.system),first=await weapon(a,'wLTM24KusarigamaKamaSwing'),second=await weapon(a,'wLTM24KusarigamaKamaSwing'),service=new MeleeProfileService(a),defs=new StandaloneWeaponService(a,catalogs);
 const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:defs.get(first.standaloneRef.weaponId)});draft.setOverride(first.standaloneRef.modeId,'st','5');draft.weaponBond=true;draft.weaponBondChanged=true;await defs.save(draft);
 await service.save(first,{quality:'Fine',weaponTL:3});await service.save(second,{quality:'Good',weaponTL:9});
 const fresh=readStandaloneAttack(a,first.standaloneRef.weaponId,first.standaloneRef.modeId),r=await preview(a,fresh,meleeProfileContext(a,fresh).saved);
 const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m24-history'}),old=JSON.stringify(shot);
 const calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:r.p.level,weaponBond:true});assert.equal(calc.effectiveSkill,17);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
 await service.save(first,{quality:'Fine',weaponTL:3,modeId:'w4pZRqUWQMcym0hgH'});
 assert.equal((await preview(a,readStandaloneAttack(a,first.standaloneRef.weaponId,'w4pZRqUWQMcym0hgH'),meleeProfileContext(a,first).saved)).prepared.formula,'1d+4 cr');
 assert.equal(meleeProfileContext(a,second).saved.weaponTL,9);assert.equal(JSON.stringify(shot),old);assert.ok(Object.isFrozen(shot.profile.damage));assert.equal(JSON.stringify(a.system),system);
 assert.equal(defs.get(first.standaloneRef.weaponId).settings.weaponBond,true);assert.ok(defs.get(second.standaloneRef.weaponId).settings.weaponBond!==true);
 a.isOwner=false;await assert.rejects(service.save(first,{quality:'Fine'}),/прав/);
});

test('M2.4 Combat Fan has both published rows already supplied by M2.2, with no duplicate source overlay',()=>{
 const equipment=catalogs.getCatalog('weapons').equipment.filter(e=>e.source==='LT'&&e.name==='Combat Fan');assert.equal(equipment.length,1);
 const rows=equipment[0].modes.filter(m=>m.combat_type==='melee');assert.equal(rows.length,2);
 assert.deepEqual(rows.map(m=>[m.raw_calc.damage,m.stats.reach,m.stats.parry,m.stats.strength]),[['thr cr','C','0','7'],['thr-2 cut','C','0','6']]);
 assert.ok(rows.every(m=>!LT_FLEXIBLE_PROFILES[m.weapon_mode_id]));
});
