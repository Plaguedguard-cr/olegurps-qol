import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {projectMeleeSourceData} from '../scripts/melee-source-data.js';
import {adaptGgaShieldAttacks,assertShieldEquipmentReference} from '../scripts/tools/shield-equipment-adapter.js';
import {collectMeleeAttacksWithBodyContract as collectMeleeAttacks} from './helpers/melee-body-collection.mjs';
import {LT_SHIELD_TOOL_PROFILES,LT_SHIELD_TOOL_MANUAL,applyLTShieldToolSourceMode,projectLTShieldToolSourceData} from '../scripts/lt-shield-tool-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {MeleeProfileService,meleeProfileContext,resolveMeleeProfile,meleeMartialGrips,resolveMeleeHands} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation,executeNativeMeleeAttack} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {meleeCombatControls,selectMeleeCombatMode} from '../scripts/tools/melee-combat-controls.js';
import {meleeEditorCompatibility,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
const vectors=JSON.parse(await fs.readFile(new URL('./fixtures/lt-shields-tools-m25.json',import.meta.url),'utf8'));
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
for(const row of vectors.modes)test('M2.5 source '+row.modelId+'/'+row.modeId,async()=>{
 const a=actor(),system=JSON.stringify(a.system),raw=await weapon(a,row.modeId),selection={weaponTL:3,...(row.expected.fitting?{blade:row.expected.fitting}:{})},r=await preview(a,raw,selection),p=meleeProfileContext(a,raw).source,m=catalogs.getMode(row.modeId);
 assert.equal(r.prepared.formula,row.formulaST12);assert.equal(r.p.level,row.levelST12);
 assert.equal(catalogs.getEquipmentForMode(row.modeId).equipment_id,row.equipmentId);
 assert.deepEqual(p.stats,Object.fromEntries(['damage','reach','parry','st'].map(k=>[k,row.expected[k]])));
 assert.equal(m.raw_calc.damage,row.expected.damage);assert.equal(m.stats.strength,row.expected.st);assert.equal(m.stats.parry,row.expected.parry);assert.equal(m.stats.reach,row.expected.reach);
 assert.deepEqual(p.primarySkills,row.expected.skills);for(const o of p.sourceOptions)assert.deepEqual(o.defaults.map(d=>[d.from,d.modifier]),row.expected.defaults[o.unmodifiedSkills[0]]);
 assert.equal(p.attackModifier,row.expected.directPenalty);assert.equal(r.p.meleeProfile.strength.hands,row.expected.hands);assert.deepEqual(meleeMartialGrips(p),row.expected.grips);
 const quality=p.shield&&!['shield-point','shield-edge'].includes(p.damagePart)?'Good':'Fine',fine=await preview(a,raw,{...selection,quality});
 const extra=quality==='Fine'&&/ (cut|imp)$/.test(row.expected.damage)?1:0,match=/^(\d+)d([+-]\d+)?(\([\d.]+\))? (\S+)$/.exec(row.formulaST12),adds=Number(match[2]??0)+extra;
 assert.equal(fine.prepared.formula,match[1]+'d'+(adds>0?'+'+adds:adds<0?String(adds):'')+(match[3]??'')+' '+match[4]);
 assert.equal(JSON.stringify(a.system),system);
});

test('M2.5 one GGA physical shield keeps its native melee path, DB/Block/Parry/equipment and identity',()=>{
 const a=actor(),e='en0UBIZvVnpiXFMq3',id='w_ba5IqxUJHkeuwxy';a.system.equipment={carried:{'00000':{name:'Small Shield, Heavy',uuid:e,equipped:true,carried:true,cost:40,weight:6,db:1,dr:4,hp:15}}};
 a.system.melee={'00000':{uuid:id,parentuuid:e,eqtkey:'equipment.carried.00000',name:'Small Shield, Heavy',mode:'Shield Bash',damage:'thr cr',level:16,parry:'14',block:'12',reach:'1',pageref:'LT116'}};
 const before=JSON.stringify(a.system),attacks=collectMeleeAttacks(a);assert.equal(attacks.length,1);const raw=attacks[0];
 assert.equal(raw.path,'system.melee.00000');assert.equal(raw.uuid,id);assert.equal(raw.equipmentRef.instanceId,e);assert.equal(raw.equipmentRef.virtual,false);assert.equal(meleeProfileContext(a,raw).key,'equipment:'+e);
 const p=resolveMeleeProfile({actor:a,attack:raw});assert.equal(p.level,16);assert.equal(p.parry,'14');assert.equal(raw.block,'12');assert.equal(JSON.stringify(a.system),before);assert.ok(!a.getFlag('olegurps-qol','standaloneWeapons'));
});

test('M2.5 equipment-only fallback reads exact identity without insertion, never name-only, and rejects ambiguous IDs',async()=>{
 const a=actor(),e='eZQSoCM_oYThNMId6';a.system.equipment={carried:{'00000':{uuid:e,name:'Small Shield, Light',equipped:false,count:1,block:77,db:99}}};const before=JSON.stringify(a.system),rows=collectMeleeAttacks(a);assert.equal(rows.length,1);assert.equal(rows[0].equipmentRef.virtual,true);
 const r=await preview(a,rows[0],{weaponTL:3});assert.equal(r.p.level,16);assert.equal(r.prepared.formula,'1d-1 cr');assert.equal(JSON.stringify(a.system),before);assert.equal(a.writes,0);
 a.system.equipment.carried['00001']={uuid:'unrelated',name:'Small Shield, Light'};assert.equal(collectMeleeAttacks(a).length,1);
 a.system.equipment.carried['00002']={uuid:e,name:'Ambiguous duplicate ID'};assert.equal(collectMeleeAttacks(a).length,0);assert.throws(()=>assertShieldEquipmentReference(a,rows[0].equipmentRef),/неоднозначен/);
 delete a.system.equipment.carried['00000'];delete a.system.equipment.carried['00002'];assert.throws(()=>assertShieldEquipmentReference(a,rows[0].equipmentRef),/удалён/);
});

test('M2.5 two imported copies use exact separate physical bindings; reordering equipment retains profile identity',async()=>{
 const a=actor(),eid='eyIESVGXulfaCqV2n';a.system.equipment={carried:{a:{uuid:'copy-a',name:'Same'},b:{uuid:'copy-b',name:'Same'}}};await a.setFlag('olegurps-qol','meleeEquipmentBindings',{'copy-a':{equipmentId:eid},'copy-b':{equipmentId:eid}});
 const rows=collectMeleeAttacks(a);assert.equal(rows.length,2);const [one,two]=rows,s=new MeleeProfileService(a);await s.save(one,{weaponTL:3});await s.save(two,{weaponTL:9});
 assert.notEqual(meleeProfileContext(a,one).key,meleeProfileContext(a,two).key);assert.equal(meleeProfileContext(a,one).saved.weaponTL,3);assert.equal(meleeProfileContext(a,two).saved.weaponTL,9);
 const moved=a.system.equipment.carried.a;delete a.system.equipment.carried.a;a.system.equipment.carried.z=moved;assert.equal(meleeProfileContext(a,collectMeleeAttacks(a).find(r=>r.equipmentRef.instanceId==='copy-a')).saved.weaponTL,3);
 a.isOwner=false;await assert.rejects(s.save(one,{weaponTL:4}),/прав/);
});

test('M2.5 an existing explicit GGA profile binding supplies exact physical identity without a silent flag migration',async()=>{
 const a=actor();a.system.equipment={carried:{a:{uuid:'physical-original',name:'Shield'}}};a.system.melee={a:{uuid:'native-original',parentuuid:'physical-original',name:'Shield',mode:'Shield Bash',level:16,damage:'thr cr',reach:'1',pageref:'LT116'}};
 const legacy='attack:'+encodeURIComponent('uuid:native-original');await a.setFlag('olegurps-qol','meleeProfiles',{version:1,revision:1,profiles:{[legacy]:{sourceModeId:'w_ba5IqxUJHkeuwxy',weaponTL:3,blade:'shield-spike',modeId:'wLTM25Spikew_ba5IqxUJHkeuwxy'}}});
 const flags=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),writes=a.writes,raw=collectMeleeAttacks(a)[0];assert.equal(raw.equipmentRef.instanceId,'physical-original');assert.equal(meleeProfileContext(a,raw).saved.weaponTL,3);assert.equal(meleeProfileContext(a,raw).saved.blade,'shield-spike');assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),flags);
});

test('M2.5 fittings require explicit installation and remain the same physical shield; quality is part-specific',async()=>{
 const a=actor(),raw=await weapon(a,'w_ba5IqxUJHkeuwxy'),id='wLTM25LongSpikew_ba5IqxUJHkeuwxy';
 assert.ok(resolveMeleeProfile({actor:a,attack:raw,selection:{modeId:id}}).readinessReason);
 const context=meleeProfileContext(a,raw);assert.ok(meleeEditorCompatibility(context,{},a,raw).every(r=>!r.profile.requiredFitting));
 const r=await preview(a,raw,{modeId:id,blade:'shield-long-spike',quality:'Fine',weaponTL:3});assert.equal(r.prepared.formula,'1d+1 imp');
 const body=await preview(a,raw,{blade:'shield-long-spike',quality:'Fine',weaponTL:3});assert.equal(body.prepared.formula,'1d-1 cr');
 assert.equal(r.p.meleeProfile.quality.price,null);assert.equal(body.p.meleeProfile.quality.price,null);assert.equal(new StandaloneWeaponService(a,catalogs).list('melee').length,1);
 const block=resolveMeleeProfile({actor:a,attack:raw,selection:{blade:'superfine',weaponTL:9}});assert.ok(block.readinessReason);
 const spike=await preview(a,raw,{blade:'shield-spike',modeId:'wLTM25Spikew_ba5IqxUJHkeuwxy',weaponTL:3});assert.equal(spike.p.meleeProfile.quality.price,60);assert.equal(spike.p.meleeProfile.quality.mass,11);
 const low=await preview(a,raw,{blade:'shield-spike',modeId:'wLTM25Spikew_ba5IqxUJHkeuwxy',weaponTL:1});assert.equal(low.p.meleeProfile.quality.price,null);
});

test('M2.5 Parrying Buckler metal points use their exact +1 CF; other long spikes have no invented price/mass',async()=>{
 const a=actor(),raw=await weapon(a,'wkKZcc55t55qJtIBV'),r=await preview(a,raw,{modeId:'wLTM25LongSpikewkKZcc55t55qJtIBV',blade:'shield-long-spike',weaponTL:1});assert.equal(r.prepared.formula,'1d imp');assert.equal(r.p.meleeProfile.quality.price,100);assert.equal(r.p.meleeProfile.quality.mass,null);
 const normal=await weapon(a,'wK1PvIUHo-IHo2_xx'),n=await preview(a,normal,{modeId:'wLTM25LongSpikewK1PvIUHo-IHo2_xx',blade:'shield-long-spike',weaponTL:9});assert.equal(n.p.meleeProfile.quality.price,null);
});

test('M2.5 Dueling Long Shield uses Shield-2 or Staff-4 once, including defaults and imported totals',async()=>{
 const a=actor(),raw=await weapon(a,'wbr_iBGO9QK06x2dG');assert.equal((await preview(a,raw,{skill:'Shield'})).p.level,14);assert.equal((await preview(a,raw,{skill:'Staff'})).p.level,12);
 const d=actor({Spear:16}),r=await preview(d,await weapon(d,'wbr_iBGO9QK06x2dG'),{skill:'Staff'});assert.equal(r.p.level,10);assert.equal(r.p.meleeProfile.skill.defaultPenalty,-2);assert.equal(r.p.meleeProfile.skill.directWeaponPenalty,-4);
 const imported={name:'Dueling Long Shield',key:'native-duel',path:'system.melee.00000',level:14,damage:'thr cr',reach:'1',parry:'No',st:'',readinessReason:null,data:{pageref:'LT116'},catalogBinding:{modeId:'wbr_iBGO9QK06x2dG'}};assert.equal((await preview(a,imported)).p.level,14);
});

test('M2.5 official GCS Shield (Shield) and Shield (Force Shield) spellings retain learned levels and exact defaults',async()=>{
 const a=actor({'Shield (Shield)':16}),raw=await weapon(a,'w_ba5IqxUJHkeuwxy');assert.equal((await preview(a,raw)).p.level,16);
 const buckler=await weapon(a,'wkKZcc55t55qJtIBV');assert.equal((await preview(a,buckler)).p.level,14);
 const b=actor({'Shield (Force Shield)':18}),other=await weapon(b,'w_ba5IqxUJHkeuwxy');assert.equal((await preview(b,other)).p.level,16);
 const d=actor({}),defaultRaw=await weapon(d,'w_ba5IqxUJHkeuwxy');assert.equal((await preview(d,defaultRaw,{skill:'Shield (Shield)'})).p.level,8);
});

test('M2.5 Scythe Hook is dagger ST, swings double dagger; Sickle has three existing modes, no fabricated thrust',async()=>{
 const a=actor(),hook=await weapon(a,'ws-FCtrIpXXzHBHZs');assert.equal(hook.st,'11†');assert.equal((await preview(a,hook)).p.meleeProfile.strength.ready,null);
 const swing=readStandaloneAttack(a,hook.standaloneRef.weaponId,'wGH3OK_UW8P6SwaW7');assert.equal((await preview(a,swing)).p.meleeProfile.strength.ready,'Требуется Ready после атаки.');
 assert.equal(catalogs.getEquipment('elh_eFb_-3ca-rEdE').modes.length,3);assert.equal(catalogs.getEquipment('e_lS2hphKAPenuN1w').modes.length,3);
});

test('M2.5 individual rigid Reach1 tools use the published one-handed Defensive Grip without a fabricated mode',async()=>{
 const a=actor(),raw=await weapon(a,'wzarqh4Rg6dL1ijIO'),r=await preview(a,raw,{grip:'defensive',weaponTL:3});assert.equal(r.p.level,14);assert.equal(r.prepared.formula,'1d+4 imp');assert.equal(r.p.meleeProfile.strength.hands,2);assert.equal(r.p.parry,'11U');
 const sickle=await weapon(a,'wcl8R5Iq8gg5a3LM_');assert.equal((await preview(a,sickle,{grip:'defensive'})).prepared.formula,'1d+3 cut');assert.equal(catalogs.getEquipment('elh_eFb_-3ca-rEdE').modes.length,3);
 assert.deepEqual(meleeMartialGrips(meleeProfileContext(a,await weapon(a,'wLTM25MiningHammerLarge')).source),[]);
});

test('M2.5 working tools have no invented governing skill or new numerical modes; existing GCS data survives',()=>{
 for(const m of Object.values(LT_SHIELD_TOOL_MANUAL))assert.ok(!Object.values(LT_SHIELD_TOOL_PROFILES).some(p=>p.modelId===m.modelId));
 assert.equal(catalogs.getEquipment('eNhVaVkLQvYVHlYMj').modes.length,2);assert.equal(catalogs.getMode('wQxdsxj9DvlzzQiZY').governing_skill.status,'none');
 assert.equal(catalogs.getEquipment('eLTM25SmithingPliers'),null);assert.equal(catalogs.getEquipment('eLTM25MetalworkingChisel'),null);
 assert.ok(!Object.values(LT_SHIELD_TOOL_PROFILES).some(p=>/pitchfork|rake|shovel|chair|stool/i.test(p.name)));
});

test('M2.5 exact source projection preserves all ranged/foreign records, raw source and old reports, idempotently',()=>{
 const raw=catalogs.getSourceCatalog('weapons'),hash=JSON.stringify(raw),copy=structuredClone(raw),ids=new Set(vectors.modes.map(r=>r.equipmentId)),manual=new Set(vectors.manual.flatMap(m=>m.equipmentIds));
 const project=()=>{projectLTShieldToolSourceData('weapons',copy);for(const e of copy.equipment)for(const m of e.modes)applyLTShieldToolSourceMode(m,e);};project();const once=JSON.stringify(copy);project();assert.equal(JSON.stringify(copy),once);assert.equal(JSON.stringify(raw),hash);
 assert.deepEqual(copy.equipment.filter(e=>!raw.equipment.some(o=>o.equipment_id===e.equipment_id)).map(e=>e.equipment_id),['eLTM25MiningHammerLarge']);
 const old=new Set(raw.equipment.flatMap(e=>e.modes.map(m=>m.weapon_mode_id)));assert.deepEqual(copy.equipment.flatMap(e=>e.modes).filter(m=>!old.has(m.weapon_mode_id)).map(m=>m.weapon_mode_id).sort(),vectors.modes.filter(r=>!r.sourceBefore).map(r=>r.modeId).sort());
 for(const e of raw.equipment){const after=copy.equipment.find(n=>n.equipment_id===e.equipment_id);if(!ids.has(e.equipment_id)&&!manual.has(e.equipment_id))assert.deepEqual(after,e);else for(const m of e.modes.filter(m=>m.combat_type!=='melee'))assert.deepEqual(after.modes.find(n=>n.weapon_mode_id===m.weapon_mode_id),m);}
});

test('M2.5 instance TL/quality/Bond and WM/TBaM stay independent; old snapshot cannot change with the fitting',async()=>{
 const a=actor(),raw=await weapon(a,'wkKZcc55t55qJtIBV'),other=await weapon(a,'wkKZcc55t55qJtIBV'),s=new MeleeProfileService(a),defs=new StandaloneWeaponService(a,catalogs),d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:defs.get(raw.standaloneRef.weaponId)});d.weaponBond=true;d.weaponBondChanged=true;await defs.save(d);
 const selected={blade:'shield-long-spike',quality:'Fine',weaponTL:3,modeId:'wLTM25LongSpikewkKZcc55t55qJtIBV'};await s.save(raw,selected);await s.save(other,{weaponTL:9});
 const r=await preview(a,raw,selected),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m25-history'}),old=JSON.stringify(shot);
 const calc=resolveMeleeCombatCalculation({actor:a,attack:r.p,baseSkill:r.p.level,weaponBond:true});assert.equal(calc.effectiveSkill,17);assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
 await s.save(raw,{blade:'standard',quality:'',modeId:'wkKZcc55t55qJtIBV'});assert.equal(JSON.stringify(shot),old);assert.equal(meleeProfileContext(a,other).saved.weaponTL,9);assert.ok(defs.get(other.standaloneRef.weaponId).settings.weaponBond!==true);
});

test('M2.5 stale fitted attack is rejected by the native service before any roll, without touching old snapshots',async()=>{
 const a=actor(),raw=await weapon(a,'wkKZcc55t55qJtIBV'),s=new MeleeProfileService(a),selection={blade:'shield-long-spike',weaponTL:3,modeId:'wLTM25LongSpikewkKZcc55t55qJtIBV'};
 await s.save(raw,selection);const old=resolveMeleeProfile({actor:a,attack:raw});await s.save(raw,{blade:'standard',modeId:'wkKZcc55t55qJtIBV'});
 const flags=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles'));await assert.rejects(executeNativeMeleeAttack({actor:a,sourceAttack:raw,effectiveSkill:16,damageOptions:{attack:old}}),/больше не установлен/);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),flags);
});

test('M2.5 a fitted native shield freezes the original GGA action identity and the selected numeric part separately',async()=>{
 const a=actor(),eid='e2hF_R9vE532_PYrY';a.system.equipment={carried:{a:{uuid:eid,name:'Shield',db:1,block:77}}};a.system.melee={a:{uuid:'wkKZcc55t55qJtIBV',parentuuid:eid,name:'Shield',mode:'Shield Bash',level:16,damage:'thr cr',reach:'1',parry:'77',pageref:'LT114'}};
 const before=JSON.stringify(a.system),raw=collectMeleeAttacks(a)[0],r=await preview(a,raw,{modeId:'wLTM25LongSpikewkKZcc55t55qJtIBV',blade:'shield-long-spike',quality:'Fine',baselineQuality:'Good',weaponTL:3});
 const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:r.p,preparedDamage:r.prepared}),{attackId:'m25-native'});
 assert.equal(shot.mode.mode,'Shield Bash');assert.equal(shot.profile.damage.formula,'1d+1 imp');assert.equal(shot.profile.damage.rules.meleeSnapshot.combatProfile.modeId,'wLTM25LongSpikewkKZcc55t55qJtIBV');assert.equal(JSON.stringify(a.system),before);
});

test('M2.5 old shield definitions gain only exact same-instance modes on read, keeping overrides and no writes',async()=>{
 const a=actor(),raw=await weapon(a,'wkKZcc55t55qJtIBV'),defs=new StandaloneWeaponService(a,catalogs),stored=a.getFlag('olegurps-qol','standaloneWeapons');stored.weapons[0].modes=stored.weapons[0].modes.filter(m=>!m.modeId.startsWith('wLTM25')&&!m.modeId.startsWith('wLTM26'));stored.weapons[0].modes[0].overrides.damage='thr+99 cr';await a.setFlag('olegurps-qol','standaloneWeapons',stored);
 const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),writes=a.writes,r=defs.get(raw.standaloneRef.weaponId);
 // M2.6 adds the LT62 Tip Slash of the explicitly fitted long point, on this same shield.
 assert.deepEqual(new Set(r.modes.map(m=>m.modeId)),new Set(['wkKZcc55t55qJtIBV','wLTM25SpikewkKZcc55t55qJtIBV','wLTM25LongSpikewkKZcc55t55qJtIBV','wLTM25EdgewkKZcc55t55qJtIBV','wLTM26TipwLTM25LongSpikewkKZcc55t55qJtIBV']));assert.equal(r.modes[0].overrides.damage,'thr+99 cr');assert.equal(a.writes,writes);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);
 const changed=structuredClone(catalogs.getMode('ws-FCtrIpXXzHBHZs'));changed.stats.strength='42';applyLTShieldToolSourceMode(changed,{source:'LT',equipment_id:'e_lS2hphKAPenuN1w'},{snapshot:true});assert.equal(changed.stats.strength,'42');
});
