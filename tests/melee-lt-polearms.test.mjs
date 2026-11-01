import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {projectLTSourceData} from '../scripts/lt-source-data.js';
import {LT_POLEARM_PROFILES,applyLTPolearmSourceMode,projectLTPolearmSourceData} from '../scripts/lt-polearm-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,meleeProfileContext,resolveMeleeProfile,meleeMartialGrips} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {meleeCombatControls,selectMeleeCombatMode} from '../scripts/tools/melee-combat-controls.js';
import {meleeEditorCompatibility,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/lt-polearms-m23.json',import.meta.url),'utf8'));
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
for(const row of vectors.modes)test('M2.3 '+row.modelId+'/'+row.modeId,async()=>{
 const a=actor(),system=JSON.stringify(a.system),raw=await weapon(a,row.modeId),{p,prepared}=await preview(a,raw);
 assert.equal(prepared.formula,row.formulaST12);assert.equal(p.level,row.levelST12);
 assert.equal(p.damage,row.expected.damage);assert.equal(p.st,row.expected.st);assert.equal(p.reach,row.expected.reach);
 assert.equal(p.meleeProfile.strength.hands,row.expected.hands);assert.equal(p.meleeProfile.motion,row.expected.motion);
 assert.equal(p.meleeProfile.equipmentId,row.equipmentId);assert.equal(p.meleeProfile.modeId,row.modeId);
 const source=meleeProfileContext(a,raw).source;assert.deepEqual(source.primarySkills,row.expected.skills);
 for(const option of source.sourceOptions)assert.deepEqual(option.defaults.map(d=>[d.from,d.modifier]),row.expected.defaults[option.unmodifiedSkills[0]]);
 assert.equal(p.parry,row.expected.parry==='No'?'No':String(3+Math.floor(row.levelST12/2)+Number.parseInt(row.expected.parry))+(row.expected.parry.match(/[UF]/g)?.join('')??''));
 assert.equal(JSON.stringify(a.system),system);
 // Every touched row is checked with grade and material, including all added shaft/tip modes.
 const fine=await preview(a,raw,{quality:'Fine',weaponTL:3});
 const bonus=['cut','imp'].some(t=>row.expected.damage.endsWith(' '+t))&&source.damagePart!=='shaft'?1:0;
 const original=/^(\d+)d([+-]\d+)?(\([\d.]+\))? (\S+)$/.exec(row.formulaST12),adds=Number(original[2]??0)+bonus;
 const expectedFine=original[1]+'d'+(adds>0?'+'+adds:adds<0?String(adds):'')+(original[3]??'')+' '+original[4];
 assert.equal(fine.prepared.formula,expectedFine);
 const plastic=await preview(a,raw,{quality:'Good',weaponTL:9,material:'plastic'});
 assert.equal(plastic.prepared.formula,row.formulaST12);assert.equal(plastic.p.meleeProfile.quality.mass,source.mass*0.5);
 const context=meleeProfileContext(a,raw),valid=meleeEditorCompatibility(context,{},a,raw).filter(r=>r.sourceModeId===row.modeId);
 for(const cell of valid)for(const skill of row.expected.skills){
  const r=await preview(a,raw,{modeId:cell.modeId,grip:cell.grip,skill});
  assert.equal(r.p.meleeProfile.modeId,row.modeId);assert.equal(r.p.meleeProfile.strength.hands,cell.hands);
  assert.equal(r.p.meleeProfile.motion,row.expected.motion);
  assert.ok(!r.p.meleeProfile.conditions.some(s=>s.includes('Без дополнительного Ready')||s.includes('Направление защиты учитывается вручную')));
 }
 assert.equal(JSON.stringify(a.system),system);
});
test('M2.3 exact projection preserves source JSON, all ranged and all unrelated equipment; idempotent',()=>{
 const raw=catalogs.getSourceCatalog('weapons'),rawHash=JSON.stringify(raw),original=structuredClone(raw);projectLTSourceData('weapons',original);
 const hash=JSON.stringify(original),copy=structuredClone(original),scoped=new Set(vectors.modes.map(m=>m.equipmentId));
 const project=()=>{projectLTPolearmSourceData('weapons',copy);for(const e of copy.equipment)for(const m of e.modes)applyLTPolearmSourceMode(m,e);};
 project();const once=JSON.stringify(copy);project();assert.equal(JSON.stringify(copy),once);assert.equal(JSON.stringify(original),hash);assert.equal(JSON.stringify(raw),rawHash);
 assert.deepEqual(copy.equipment.filter(e=>!original.equipment.some(o=>o.equipment_id===e.equipment_id)).map(e=>e.equipment_id),['eLTM23Ankus','eLTM23Tuja','eLTM23Pike4Y','eLTM23Pike6Y','eLTM23CrescentSpear']);
 const oldIds=new Set(original.equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id)));
 assert.deepEqual(copy.equipment.flatMap(e=>e.modes).filter(m=>!oldIds.has(m.weapon_mode_id)).map(m=>m.weapon_mode_id).sort(),vectors.modes.filter(m=>!m.sourceBefore).map(m=>m.modeId).sort());
 for(const e of original.equipment){const after=copy.equipment.find(n=>n.equipment_id===e.equipment_id);if(!scoped.has(e.equipment_id))assert.deepEqual(after,e);else for(const m of e.modes.filter(m=>m.combat_type!=='melee'))assert.deepEqual(after.modes.find(n=>n.weapon_mode_id===m.weapon_mode_id),m);}
 const foreign=structuredClone(catalogs.getMode('w5G3HFfwCR2n7rypk')),before=JSON.stringify(foreign);applyLTPolearmSourceMode(foreign,{source:'LT',equipment_id:'foreign'});assert.equal(JSON.stringify(foreign),before);
});
test('M2.3 only six named hosts receive Staff, with their own ST, no generic +2 Parry or extra hands/skills',async()=>{
 const expected=new Map([['Dueling Bill',9],['Dueling Glaive',9],['Dueling Halberd',12],['Light Horse-Cutter',11],['Naginata',9],['Pollaxe',12]]);
 const staff=vectors.modes.filter(m=>LT_POLEARM_PROFILES[m.modeId].damagePart==='shaft');assert.equal(staff.length,12);
 for(const row of staff){const source=LT_POLEARM_PROFILES[row.modeId];assert.equal(Number.parseInt(row.expected.st),expected.get(source.name));assert.match(row.expected.st,/†/);assert.deepEqual(row.expected.skills,['Staff']);assert.ok(['0','0U'].includes(row.expected.parry));}
 for(const name of ['Spear','Long Spear','Pike','Halberd','Glaive','Poleaxe','Heavy Horse-Cutter','Lajatang'])assert.ok(!Object.values(LT_POLEARM_PROFILES).some(p=>p.name===name&&p.damagePart==='shaft'));
 const a=actor(),raw=await weapon(a,'wLTM23NaginataStaffThrust'),context=meleeProfileContext(a,raw),matrix=meleeEditorCompatibility(context,{},a,raw);
 assert.ok(matrix.filter(r=>r.profile.damagePart==='shaft').every(r=>r.profile.primarySkills.join()==='Staff'&&!['tip','reversed'].includes(r.grip)));
 const next=selectMeleeEditorProfile(context,{skill:'Polearm'},'modeId',raw.standaloneRef.modeId,a,raw);assert.equal(next.skill,'');
});
test('M2.3 Tip Slash is a swing on a thrust base: exact exceptions, maximum Reach, no reversed thrust bonus',async()=>{
 const a=actor(),raw=await weapon(a,'wLTM23TipwCpgORe2Si2QGIVZF'),r=await preview(a,raw);
 assert.equal(r.prepared.formula,'1d cut');assert.equal(r.p.meleeProfile.motion,'swing');assert.equal(r.p.reach,'2*');
 assert.equal((await preview(a,raw,{grip:'reversed'})).prepared.formula,'1d-2 cut');
 assert.equal((await preview(a,raw,{grip:'defensive'})).prepared.formula,'1d-2 cut');
 assert.equal((await preview(a,await weapon(a,'wmbwe9vfEb50cRVgG'))).prepared.formula,'1d-1 cut');
 assert.equal((await preview(a,await weapon(a,'w84XpgTqIWGVVc_86'))).p.reach,'3');
});
test('M2.3 Trident direct -2, skill default, balance and Bond apply once, including GGA final skill',async()=>{
 const a=actor({'Staff':16}),raw=await weapon(a,'w2AuBANQhig4Kq7IG'),r=await preview(a,raw,{skill:'Spear',balance:'Balanced'});
 assert.equal(r.p.level,13);assert.equal(r.p.meleeProfile.skill.defaultPenalty,-2);assert.equal(r.p.meleeProfile.skill.directWeaponPenalty,-2);
 const calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:r.p.level,weaponBond:true});assert.equal(calc.effectiveSkill,14);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
 const imported={name:'Trident',key:'import',path:'system.melee.00000',level:14,damage:'thr+4(0.5) imp',reach:'1-2*',parry:'10',st:'10†',readinessReason:null,data:{pageref:'LT69'},catalogBinding:{modeId:'wmiyMIKahFDNHoCMT'}};
 const r2=await preview(a,imported);assert.equal(r2.p.level,14);assert.equal(r2.prepared.formula,'1d+3(0.5) imp');assert.equal(r2.p.parry,'10');
 const included=await preview(a,{...imported,damage:'thr+5(0.5) imp'},{baselineQuality:'Fine',quality:'Fine',weaponTL:3,baselineMaterial:'steel',material:'steel',baselineBlade:'standard',blade:'standard'});
 assert.equal(included.prepared.formula,'1d+4(0.5) imp');assert.equal(included.p.meleeProfile.quality.damageBonus,0);
});
test('M2.3 exact grip eligibility follows physical length; no reversal of Pike/Long Spear/Halberd',async()=>{
 const a=actor();for(const id of ['wMEsHCEHg4xRT4-td','wfhY-R4mNeOArjxEe','w5G3HFfwCR2n7rypk']){const raw=await weapon(a,id);assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,raw).source),['defensive']);assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{grip:'reversed'}}).readinessReason);}
 const spear=await weapon(a,'wxMjDbyVMoR20JSB5');assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,spear).source),['defensive','reversed']);
 const r=await preview(a,spear,{grip:'defensive'});assert.equal(r.p.level,16);assert.equal(r.prepared.formula,'1d+1 imp');assert.equal(r.p.meleeProfile.strength.hands,2);
 const reverse=await preview(a,spear,{grip:'reversed'});assert.equal(reverse.prepared.formula,'1d+2 imp');assert.equal(reverse.p.reach,'C');assert.equal(reverse.p.parry,'9');
});
test('M2.3 Fine/material/Superfine belong to blade, never to the six hosts crushing shaft attacks',async()=>{
 const a=actor(),raw=await weapon(a,'wLTM23NaginataStaffSwing');
 for(const selection of [{quality:'Fine',weaponTL:3},{quality:'Fine',weaponTL:9,blade:'superfine'},{quality:'Fine',weaponTL:3,material:'bone'}])assert.equal((await preview(a,raw,selection)).prepared.formula,'1d+4 cr');
 const edge=await weapon(a,'wHP1x8pe8O0xdzZBC');assert.equal((await preview(a,edge,{quality:'Fine',weaponTL:3})).prepared.formula,'1d+5 cut');
 assert.equal((await preview(a,edge,{quality:'Fine',weaponTL:9,blade:'superfine'})).prepared.formula,'1d+6(2) cut');
 const trident=await weapon(a,'wmiyMIKahFDNHoCMT');assert.match(resolveMeleeProfile({actor:a,attack:trident,selection:{quality:'Fine',weaponTL:9,blade:'superfine'}}).readinessReason,/Superfine/);
 const tuja=await weapon(a,'wLTM23TujaThrust');assert.match(resolveMeleeProfile({actor:a,attack:tuja,selection:{weaponTL:9,blade:'superfine'}}).readinessReason,/Superfine/);
});
test('M2.3 Tuja has only Sai/Main-Gauche routes and native AD0.5; Ankus spike is not a new physical item',async()=>{
 const a=actor({'Main-Gauche':16}),raw=await weapon(a,'wLTM23TujaThrust');
 assert.equal((await preview(a,raw,{skill:'Main-Gauche'})).p.parry,'11F');assert.equal((await preview(a,raw,{skill:'Jitte/Sai'})).p.parry,'9');
 assert.deepEqual(meleeCombatControls(a,raw).skills.map(s=>s.value),['Jitte/Sai','Main-Gauche']);
 const ankus=await weapon(a,'wLTM23AnkusSpikeThrust');assert.equal((await preview(a,ankus)).prepared.formula,'1d-1 imp');
 assert.equal(catalogs.getEquipment('eLTM23Ankus').modes.length,4);assert.equal(catalogs.getEquipment('eLTM23Tuja').modes.length,3);
});
test('M2.3 old definitions get exact added modes on read, retaining overrides without writes or physical duplicates',async()=>{
 const a=actor(),raw=await weapon(a,'wHP1x8pe8O0xdzZBC'),saved=a.getFlag('olegurps-qol','standaloneWeapons');saved.weapons[0].modes=saved.weapons[0].modes.filter(m=>!m.modeId.startsWith('wLTM23'));saved.weapons[0].modes[0].overrides.damage='sw+10 cut';await a.setFlag('olegurps-qol','standaloneWeapons',saved);
 const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),writes=a.writes,r=new StandaloneWeaponService(a,catalogs).get(raw.standaloneRef.weaponId);
 assert.equal(r.modes.length,catalogs.getEquipment('egKG0gxFsV8-qjuFY').modes.length);assert.equal(r.modes[0].overrides.damage,'sw+10 cut');assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);
 const snapshot=structuredClone(catalogs.getMode('w5G3HFfwCR2n7rypk'));snapshot.stats.strength='5';applyLTPolearmSourceMode(snapshot,{source:'LT',equipment_id:'e82t4LhU-kGAvefT5'},{snapshot:true});assert.equal(snapshot.stats.strength,'5');
});
test('M2.3 Qian keeps the table Brawling/DX guard separate from Staff -1 and the both-ends source row',async()=>{
 const a=actor({'Staff':16,'Brawling':16}),guard=await weapon(a,'wMphv8HvAXX0Z_jH9');
 assert.equal((await preview(a,guard)).prepared.formula,'1d-1 cut');
 assert.equal((await preview(a,guard,{skill:'DX'})).prepared.formula,'1d-2 cut');
 assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,guard).source),[]);
 assert.equal((await preview(a,guard,{quality:'Fine',weaponTL:3})).prepared.formula,'1d cut');
 const both=await weapon(a,'wjf6imApz51wMim8w'),r=await preview(a,both);assert.equal(r.p.level,15);assert.equal(r.prepared.formula,'1d-1 cut');assert.equal(r.p.parry,'12');
 const defaults=actor({'Polearm':16}),thrust=await weapon(defaults,'wHO-fGThErRbNviKC'),d=await preview(defaults,thrust);assert.equal(d.p.level,11);assert.equal(d.p.meleeProfile.skill.defaultPenalty,-4);
 const imported={name:'Qian Kun Ri Yue Dao',key:'qian-import',path:'system.melee.00000',level:15,damage:'thr+1 imp',reach:'1',parry:'12',st:'7†',readinessReason:null,data:{pageref:'LT69'},catalogBinding:{modeId:'wHO-fGThErRbNviKC'}};
 assert.equal((await preview(a,imported)).p.level,15);
});
test('M2.3 separate specimens, mode selection and snapshots preserve TL/ST/Bond and OWNER boundaries',async()=>{
 const a=actor(),system=JSON.stringify(a.system),first=await weapon(a,'wxMjDbyVMoR20JSB5'),second=await weapon(a,'wxMjDbyVMoR20JSB5'),service=new MeleeProfileService(a),defs=new StandaloneWeaponService(a,catalogs);
 const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:defs.get(first.standaloneRef.weaponId)});draft.setOverride(first.standaloneRef.modeId,'st','5');draft.weaponBond=true;draft.weaponBondChanged=true;await defs.save(draft);
 await service.save(first,{quality:'Fine',weaponTL:3,grip:'reversed'});await service.save(second,{quality:'Good',weaponTL:9});
 const fresh=readStandaloneAttack(a,first.standaloneRef.weaponId,first.standaloneRef.modeId),r=await preview(a,fresh,meleeProfileContext(a,fresh).saved);
 const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m23-history'}),old=JSON.stringify(shot);
 assert.equal(shot.profile.damage.formula,'1d+3 imp');assert.ok(Object.isFrozen(shot.profile.damage));
 await service.save(first,{quality:'Good',weaponTL:9,grip:'published',modeId:'wCpgORe2Si2QGIVZF'});
 await selectMeleeCombatMode(a,readStandaloneAttack(a,first.standaloneRef.weaponId,'wxMjDbyVMoR20JSB5'));
 assert.equal(meleeProfileContext(a,second).saved.weaponTL,9);assert.equal(JSON.stringify(shot),old);assert.equal(JSON.stringify(a.system),system);assert.equal(defs.get(first.standaloneRef.weaponId).settings.weaponBond,true);
 a.isOwner=false;await assert.rejects(service.save(first,{quality:'Fine'}),/прав/);
});
