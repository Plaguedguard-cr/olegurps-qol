import {meleeProjectionVectors,extraMeleeProjectionIds,assertMeleeVector} from './helpers/melee-projection-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { MELEE_SOURCE_PROFILES, meleeSource, projectMeleeSourceData } from '../scripts/melee-source-data.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { resolveStandaloneSkill } from '../scripts/tools/standalone-skill-service.js';
import { applyMeleeAttackOverride, normalizeMeleeAssistantState, setMeleeAttackOverride,getMeleeAttackSettings } from '../scripts/tools/melee-assistant-state.js';
import { resolveDerivedDamageFormula,prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,executeNativeMeleeDamage,executeNativeMeleeAttack,resolveMeleeCombatCalculation } from '../scripts/tools/melee-service.js';
import { parseCompleteMeleeDamage,inferMeleeDamageModel,formatMeleeDamageModel } from '../scripts/tools/melee-damage-model.js';
import { MeleeProfileService,resolveMeleeProfile,meleeProfileContext,resolveMeleeHands,calculateMeleeCost,resolveMeleeQuality } from '../scripts/tools/melee-profile-service.js';
import { createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { meleeProfileEditorHTML } from '../scripts/tools/melee-profile-editor.js';

const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
assert.equal(catalogs.getStatus('weapons').status,'ready');
const audit=JSON.parse(await fs.readFile(new URL('./fixtures/melee-reconciliation-inputs.json',import.meta.url),'utf8')).historical;
globalThis.OleGURPSQOL={catalogs};
function actor(skills={}){
  const flags={};return {id:'test',isOwner:true,system:{attributes:{ST:{import:12,value:12},DX:{value:12}},swing:'1d+2',thrust:'1d-1',
    skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,points:1}]))},
    getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};
}
async function weapon(a,id){
  const service=new StandaloneWeaponService(a,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'melee',actor:a});
  draft.selectModel(catalogs.getEquipmentForMode(id).equipment_id);
  draft.modeIds=new Set([id]);const record=await service.save(draft);return {record,attack:readStandaloneAttack(a,record.id,id)};
}
const options=(a,attack)=>({actor:a,attack,context:meleeProfileContext(a,attack)});

test('M0 Weapon Bond is an explicit per-weapon choice without an Actor perk; toggles never accumulate',async()=>{
  const a=actor({Broadsword:16});a.system.ads={};
  const first=await weapon(a,'w0djXNfWD-9ebEkWu'),second=await weapon(a,'w0djXNfWD-9ebEkWu');
  const source=JSON.stringify(a.system),service=new StandaloneWeaponService(a,catalogs);
  assert.equal(first.record.settings.weaponBond,undefined);
  for(const enabled of [true,true,false,false,true,false]){
    const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:service.get(first.record.id)});
    assert.equal(draft.weaponBondAvailable,true);
    draft.weaponBond=enabled;draft.weaponBondChanged=true;await service.save(draft);
    const attack=readStandaloneAttack(a,first.record.id,first.attack.standaloneRef.modeId);
    const result=resolveMeleeCombatCalculation({actor:a,attack,baseSkill:attack.level,weaponBond:attack.weaponBondSetting});
    assert.equal(result.effectiveSkill,16+Number(enabled));assert.equal(attack.level,16);
    assert.equal(result.rollModifiers.filter(m=>m.channel==='weaponBond').length,Number(enabled));
    assert.equal(getMeleeAttackSettings({},attack).weaponBond,enabled);
    assert.equal(readStandaloneAttack(a,second.record.id,second.attack.standaloneRef.modeId).weaponBondSetting,undefined);
    assert.equal(JSON.stringify(a.system),source);
  }
});

test('M0 manual Weapon Bond is frozen with the native attack and survives later toggles and Damage replay',async()=>{
  const a=actor({Broadsword:16}),{attack}=await weapon(a,'w0djXNfWD-9ebEkWu');
  attack.damageAction={type:'deriveddamage',derivedformula:'sw',formula:'+1',damagetype:'cut'};
  const prior={GURPS:globalThis.GURPS,game:globalThis.game,canvas:globalThis.canvas,ChatMessage:globalThis.ChatMessage,Roll:globalThis.Roll,renderTemplate:globalThis.renderTemplate};
  const messages=[],damage=[];
  Object.assign(globalThis,{
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){},DamageChat:{create:async(...args)=>damage.push(args[1])}},
    game:{user:{id:'owner',targets:new Set()},settings:{get:()=>null}},canvas:{tokens:{placeables:[]}},
    ChatMessage:{getSpeaker:()=>({}),create:async data=>{const message={...data,id:'test-shot',setFlag:async(s,k,v)=>{message.flags??={};message.flags[s]??={};message.flags[s][k]=v;}};messages.push(message);return message;}},
    Roll:{create:()=>({total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},renderTemplate:async()=>'<p>GGA</p>'
  });
  try{
    const combatCalculation=resolveMeleeCombatCalculation({actor:a,attack,baseSkill:16,weaponBond:true});
    const result=await executeNativeMeleeAttack({actor:a,sourceAttack:attack,effectiveSkill:17,combatCalculation});
    assert.equal(result.rollData.origtarget,16);assert.equal(result.rollData.finaltarget,17);
    const shot=messages[0].flags['olegurps-qol'].shotSnapshot,encoded=JSON.stringify(shot);
    assert.equal(shot.profile.context.weaponBond,true);assert.equal(shot.profile.context.effectiveSkill,17);
    assert.equal(resolveMeleeCombatCalculation({actor:a,attack,baseSkill:16,weaponBond:false}).effectiveSkill,16);
    for(let i=0;i<2;i++)await executeNativeMeleeDamage({actor:a,preparedDamage:{action:shot.profile.damage.rules.meleeSnapshot.action}});
    assert.deepEqual(damage,['1d+3','1d+3']);assert.equal(JSON.stringify(shot),encoded);
  }finally{Object.assign(globalThis,prior);}
});

for(const review of audit.attackModifierReviews){
  test('M0 standalone and imported penalty once: '+review.modeId,async()=>{
    const p=meleeSource(review.modeId),a=actor({[p.primarySkills[0]]:16});
    a.system.attributes.ST.value=20;const before=JSON.stringify(a.system);
    const {attack}=await weapon(a,p.modeId),expected=16+review.directWeaponSkillPenalty;
    assert.equal(attack.level,expected);assert.equal(attack.standaloneRef.governingSkill.directWeaponPenalty,review.directWeaponSkillPenalty);
    const imported={...attack,key:'imported-'+p.modeId,standaloneRef:undefined,catalogBinding:{modeId:p.modeId},level:expected};
    assert.equal(resolveMeleeProfile({actor:a,attack:imported}).level,expected);
    assert.equal(resolveMeleeProfile({actor:a,attack:imported,selection:{skill:p.primarySkills[0]}}).level,expected);
    assert.equal(JSON.stringify(a.system),before);
  });
}
for(const id of ['wCqDJeFrsa89Srp2B','w290SmH6F4RcvB53D','w96LrgSujNkWxD4Fx','wnGzvaraC07stjOaT']){
  test('M0 Chainsaw extra die '+id,async()=>{
    const a=actor({'Two-Handed Axe/Mace':16}),{attack}=await weapon(a,id);
    const input={...attack,damageAction:{type:'deriveddamage',derivedformula:'sw',formula:'+1d',damagetype:'cut'}};
    assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:input})).formula,'2d+2 cut');
    assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:input,dicePlusAdds:true,allOutStrong:true})).formula,'3d cut');
  });
}
test('M0 arithmetic keeps dice, adds, divisor, minimum, negatives and independent components',()=>{
  for(const [modifier,want]of [['+1d','2d+2'],['-1d+3','0d+5'],['+2d-5(2)!','3d-3(2)!'],['-4','1d-2'],['+1d6+2-3','2d+1']])
    assert.equal(resolveDerivedDamageFormula('1d+2',modifier),want);
  assert.equal(resolveDerivedDamageFormula('1d','+2wat'),null);
  const parser=x=>{
    const m=/^(sw|thr)([+-]\d+)?(\([\d.]+\))?(!)?\s+(cut|imp|burn)$/.exec(x);
    if(m)return {action:{type:'deriveddamage',derivedformula:m[1],formula:(m[2]??'')+(m[3]??'')+(m[4]??''),damagetype:m[5]}};
    if(x==='1d burn')return {action:{type:'damage',formula:'1d',damagetype:'burn'}};
  };
  const action=parseCompleteMeleeDamage('sw+1d-2(2)! cut, 1d burn',parser);
  assert.equal(action.formula,'+1d-2(2)!');assert.equal(action.next.damagetype,'burn');
  assert.equal(formatMeleeDamageModel(inferMeleeDamageModel('sw+1d-2(2)! cut')),'sw+1d-2(2)! cut');
});
test('M0 Force Sword and rigid Monowire use directed learned Broadsword-3',async()=>{
  for(const id of ['wKrl1D1iujaCX9ssm','wAtyEWpMeFPCyRNj8']){
    const a=actor({Broadsword:16}),{record}=await weapon(a,id);
    const result=resolveStandaloneSkill({actor:a,record,mode:record.modes[0]});
    assert.equal(result.level,13);assert.equal(result.defaultPenalty,-3);assert.equal(result.sourceName,'Broadsword');
  }
});
test('M0 default transition and direct weapon penalty remain additive and nonrecursive',async()=>{
  const a=actor({'Axe/Mace':16}),{attack}=await weapon(a,'wFmnElv38Dl7vCHz8');
  assert.equal(attack.level,10);assert.equal(attack.standaloneRef.governingSkill.defaultPenalty,-3);
  assert.equal(attack.standaloneRef.governingSkill.directWeaponPenalty,-3);
});

test('M0 LT78 throwing-weapon Parry includes the skill penalty exactly once',async()=>{
  for(const p of Object.values(MELEE_SOURCE_PROFILES).filter(p=>p.parrySkillAlreadyIncluded===-1)){
    const a=actor({[p.primarySkills[0]]:16});a.system.attributes.ST.value=20;
    const {attack}=await weapon(a,p.modeId),expected=p.primarySkills[0]==='Knife'?'9':'10U';
    assert.equal(attack.parry,expected,p.modeId);
    assert.equal(resolveMeleeProfile({actor:a,attack}).parry,expected,p.modeId);
  }
});
test('M0 dagger/double dagger differ; no arbitrary grip; maximum ST is explicit',()=>{
  assert.equal(resolveMeleeHands('10†','one-handed',15).hands,1);
  assert.equal(resolveMeleeHands('10†','one-handed',15).ready,'Требуется Ready после атаки.');
  assert.equal(resolveMeleeHands('10†','one-handed',20).ready,null);
  assert.equal(resolveMeleeHands('10‡','published',14).ready,'Требуется Ready после атаки.');
  assert.equal(resolveMeleeHands('10‡','published',15).ready,null);
  assert.ok(resolveMeleeHands('10‡','one-handed',20).reason);
  assert.equal(resolveMeleeHands('10‡','one-handed',30).maximumST,30);
  assert.ok(resolveMeleeHands('10','one-handed',30).reason);
  assert.equal(resolveMeleeHands('10','published',8).penalty,-2);
});
test('M0 grip, motion, skill and quality save atomically for only one instance and survive reload',async()=>{
  const a=actor({Broadsword:16,'Two-Handed Sword':14}),{record,attack}=await weapon(a,'w0djXNfWD-9ebEkWu');
  const second=await weapon(a,'w0djXNfWD-9ebEkWu'),service=new MeleeProfileService(a);
  const before=JSON.stringify(a.system),o=options(a,attack);
  await service.save(attack,{modeId:'wSyyMVFZwpR_0-Gfi',quality:'Fine',balance:'Balanced',skill:'Two-Handed Sword'},o);
  const projected=applyMeleeAttackOverride(attack,normalizeMeleeAssistantState({}),a);
  assert.equal(projected.damage,'thr+3 imp');assert.equal(projected.level,15);assert.equal(projected.reach,'1-2');
  assert.equal(projected.meleeProfile.strength.hands,2);assert.equal(projected.meleeProfile.motion,'thrust');
  assert.equal(projected.meleeProfile.quality.price,5600);
  assert.equal(resolveMeleeProfile({actor:a,attack:second.attack}).meleeProfile.quality.level,'Good');
  assert.equal(JSON.stringify(a.system),before);
  await assert.rejects(service.save(attack,{modeId:'wKrl1D1iujaCX9ssm'},options(a,attack)),/не принадлежит/);
  await assert.rejects(service.save(attack,{}, {...options(a,attack),expectedRevision:0}),/уже изменены/);
  a.isOwner=false;await assert.rejects(service.save(attack,{},options(a,attack)),/прав/);
  assert.equal(record.revision,1);
});
test('M0 cost CF floor, HT multipliers, UT x10 and scoped quality avoid energy and duplicate baselines',()=>{
  assert.equal(calculateMeleeCost(600,'LT',[{costFactor:4},{costFactor:19},{costFactor:9}]),19800);
  assert.ok(Math.abs(calculateMeleeCost(400,'LT',[{costFactor:-0.6},{costFactor:-0.6}])-80)<1e-8);
  assert.equal(calculateMeleeCost(550,'HT',[{costMultiplier:4}]),2200);
  assert.equal(calculateMeleeCost(100,'UT',[{costMultiplier:10}]),1000);
  const p=meleeSource('w0djXNfWD-9ebEkWu');
  assert.equal(resolveMeleeQuality(p,{quality:'Fine',baselineQuality:'Fine'},{imported:true}).damageBonus,0);
  assert.throws(()=>resolveMeleeQuality(p,{quality:'Fine'},{imported:true}),/исходный/);
  assert.throws(()=>resolveMeleeQuality(p,{quality:'Fine'},{manualDamage:true}),/Ручной/);
  assert.throws(()=>resolveMeleeQuality(meleeSource('wKrl1D1iujaCX9ssm'),{quality:'Fine'}),/качество\/материал не подтверждены/);
});

test('M0 Nanothorn TL11^ respects campaign TL while preserving an existing upgrade',async()=>{
  const a=actor({'Monowire Whip':16}),{attack}=await weapon(a,'w9NE7eo1a5TicfmpW'),service=new MeleeProfileService(a);
  await a.setFlag('olegurps-qol','campaignTL',10);
  await assert.rejects(service.save(attack,{quality:'Nanothorn'},options(a,attack)),/ТУ кампании/);
  assert.doesNotMatch(meleeProfileEditorHTML(meleeProfileContext(a,attack),{},String,a,attack),/value="nanothorn"/);
  await a.setFlag('olegurps-qol','campaignTL',11);
  await service.save(attack,{quality:'Nanothorn'},options(a,attack));
  await a.setFlag('olegurps-qol','campaignTL',10);
  const current=resolveMeleeProfile({actor:a,attack});
  assert.equal(current.readinessReason,null);assert.equal(current.meleeProfile.quality.requiredTL,11);
  assert.equal(current.meleeProfile.quality.superscience,true);
});

test('Nanothorn typed blade enforces campaign and individual TL independently without writing a rejected choice',async()=>{
 const a=actor({'Monowire Whip':16}),{attack}=await weapon(a,'w9NE7eo1a5TicfmpW'),service=new MeleeProfileService(a);
 await a.setFlag('olegurps-qol','campaignTL',10);const before=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles'));
 await assert.rejects(service.save(attack,{blade:'nanothorn',weaponTL:11}),/ТУ кампании/);
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);
 await a.setFlag('olegurps-qol','campaignTL',11);
 await assert.rejects(service.save(attack,{blade:'nanothorn',weaponTL:10}),/ТУ11/);
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);
 const next=await service.save(attack,{blade:'nanothorn',weaponTL:11});
 assert.equal(next.meleeProfile.quality.price,3600);assert.equal(next.meleeProfile.quality.materialTransform.type,'cor');
 await a.setFlag('olegurps-qol','campaignTL',10);
 assert.match(meleeProfileEditorHTML(meleeProfileContext(a,attack),{blade:'nanothorn',weaponTL:11},String,a,attack),/value="nanothorn" selected/);
});

test('legacy saved Nanothorn resolves in memory at TL11 without migrating Actor flags or historical snapshots',async()=>{
 const a=actor({'Monowire Whip':16}),{attack}=await weapon(a,'w9NE7eo1a5TicfmpW');
 const key='weapon:'+attack.standaloneRef.weaponId;
 await a.setFlag('olegurps-qol','meleeProfiles',{version:1,revision:7,profiles:{[key]:{quality:'Nanothorn',modeId:'w9NE7eo1a5TicfmpW'}}});
 await a.setFlag('olegurps-qol','campaignTL',10);const before=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),system=JSON.stringify(a.system);
 const resolved=resolveMeleeProfile({actor:a,attack});assert.equal(resolved.readinessReason,null);
 assert.equal(resolved.meleeProfile.quality.weaponTL,11);assert.equal(resolved.meleeProfile.quality.blade,'nanothorn');
 resolved.damageAction={type:'deriveddamage',derivedformula:'sw',formula:'+1d-2(10)',damagetype:'cut'};
 assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:resolved})).formula,'2d(10) cor');
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);assert.equal(JSON.stringify(a.system),system);
});
test('M0 field corrections are exact; Katana keeps Swing and gains stable Thrust',()=>{
  for(const [id,field,want]of [['wo_KNv17YIJJ_jfHC','damage','sw-1(0.5) cut'],['wvKXs-4DyF0AGgvzI','damage','sw cr'],['wQxdsxj9DvlzzQiZY','damage','thr+1(2) cut'],['w17DvILEf9UF-N1G2','reach','C'],['wM0HTKatanaThrust','damage','thr+1 imp']]){
    const m=catalogs.getMode(id);assert.equal(field==='damage'?m.raw_calc.damage:m.stats[field],want);
  }
  assert.equal(catalogs.getMode('w1E5tlALr61HNzATz').raw_calc.damage,'sw+1 cut');
  assert.equal(catalogs.getMode('wo_KNv17YIJJ_jfHC').stats.damage.armor_divisor,0.5);
  assert.equal(catalogs.getMode('wQxdsxj9DvlzzQiZY').stats.damage.base,'1');
  assert.equal(catalogs.getMode('wvKXs-4DyF0AGgvzI').stats.damage.base,undefined);
  assert.equal(catalogs.getMode('wM0HTKatanaThrust').stats.damage.st,'thr');
  assert.equal(catalogs.getMode('wM0HTKatanaThrust').stats.damage.base,'1');
  assert.deepEqual(catalogs.getEquipment('eC6lytQUMuXS9guYX').modes.map(m=>m.weapon_mode_id),['w1E5tlALr61HNzATz','wM0HTKatanaThrust','wHTM27KatanaSheathSwing','wHTM27KatanaSheathThrust']);
});

test('M0/M2.2/M2.3/M2.4/M2.5 source projection changes only the exact requested stat fields and is idempotent',async()=>{
  const m23=JSON.parse(await fs.readFile(new URL('./fixtures/lt-polearms-m23.json',import.meta.url),'utf8')).modes;
  const m24=JSON.parse(await fs.readFile(new URL('./fixtures/lt-flexible-exotic-m24.json',import.meta.url),'utf8')).modes;
  const m25=JSON.parse(await fs.readFile(new URL('./fixtures/lt-shields-tools-m25.json',import.meta.url),'utf8')).modes;
  const source=catalogs.getSourceCatalog('weapons'),before=JSON.stringify(source),copy=structuredClone(source);
  const projected=projectMeleeSourceData('weapons',copy),changed=[];
  const originals=new Map(source.equipment.flatMap(e=>e.modes).map(m=>[m.weapon_mode_id,m]));
  for(const mode of projected.equipment.flatMap(e=>e.modes)){
    const original=originals.get(mode.weapon_mode_id),vector=meleeProjectionVectors.get(mode.weapon_mode_id);
    if(vector){assertMeleeVector(mode,vector);continue;}
    if(!original){
      const expected=[...m23,...m24,...m25].find(r=>!r.sourceBefore&&r.modeId===mode.weapon_mode_id);
      if(expected){assert.equal(mode.raw_calc.damage,expected.expected.damage);assert.equal(mode.stats.strength,expected.expected.st);assert.equal(mode.stats.reach,expected.expected.reach);assert.equal(mode.stats.parry,expected.expected.parry);}
      else assert.ok(extraMeleeProjectionIds.has(mode.weapon_mode_id),mode.weapon_mode_id);continue;
    }
    for(const key of new Set([...Object.keys(original.stats),...Object.keys(mode.stats)]))
      if(JSON.stringify(original.stats[key])!==JSON.stringify(mode.stats[key]))changed.push([mode.weapon_mode_id,key]);
  }
  assert.deepEqual(changed.sort(),[['wo_KNv17YIJJ_jfHC','damage'],['wvKXs-4DyF0AGgvzI','damage'],['wQxdsxj9DvlzzQiZY','damage'],['Wr_7MnorYDlPSb2qW','accuracy'],
    ['wLS55exDz8kXd-T1V','parry'],['wpErUadpuBiPHnjsv','damage'],['wNUoip8faip2p8ZWq','parry'],['wYQYMiGXgxny6m3qi','parry'],
    ['wYdv9U3LbMt3K083q','damage'],['wgqHEMbQiQw2Huosj','parry'],['w5G3HFfwCR2n7rypk','strength'],['w84XpgTqIWGVVc_86','reach'],['wgntlCLj80J2cQR-m','parry'],['wgacPo_7VEAePKhz-','parry'],['wjf6imApz51wMim8w','damage'],['w3x6M05zKMMbWWWMv','parry'],['wdtvAIdGu_rjnLnZc','parry'],['wijSwmH5aCwXhvYe2','parry'],...m24.filter(r=>r.modelId==='lt:whip'&&r.sourceBefore).map(r=>[r.modeId,'strength']),...m25.filter(r=>r.sourceBefore&&r.expected.parry==='No').map(r=>[r.modeId,'parry']),['ws-FCtrIpXXzHBHZs','strength'],['wzarqh4Rg6dL1ijIO','strength']].filter(([id])=>!meleeProjectionVectors.has(id)).sort());
  const once=JSON.stringify(projected);projectMeleeSourceData('weapons',projected);
  assert.equal(JSON.stringify(projected),once);assert.equal(JSON.stringify(source),before);
});
test('M0 immutable snapshot freezes complete quality/grip/motion/skill profile; repeat Damage uses it',async()=>{
  const a=actor({Broadsword:16}),{attack}=await weapon(a,'w0djXNfWD-9ebEkWu');
  const projected=resolveMeleeProfile({...options(a,attack),selection:{quality:'Fine'}});
  projected.damageAction={type:'deriveddamage',derivedformula:'sw',formula:'+1',damagetype:'cut',next:{type:'damage',formula:'1d',damagetype:'burn'}};
  const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:projected});
  assert.equal(prepared.formula,'1d+4 cut, 1d burn');
  const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack:projected,preparedDamage:prepared}),{attackId:'m0'});
  const encoded=JSON.stringify(shot),flags=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons'));
  await new MeleeProfileService(a).save(attack,{quality:'Very Fine'},options(a,attack));
  a.system.attributes.ST.value=100;prepared.action.formula='99d';
  const old=globalThis.GURPS,calls=[];globalThis.GURPS={DamageChat:{create:async(...args)=>calls.push(args[1])}};
  try{
    const frozen={action:JSON.parse(encoded).profile.damage.rules.meleeSnapshot.action};
    await executeNativeMeleeDamage({actor:a,preparedDamage:frozen});await executeNativeMeleeDamage({actor:a,preparedDamage:frozen});
    assert.deepEqual(calls,['1d+4','1d','1d+4','1d']);
    assert.equal(JSON.stringify(shot),encoded);assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),flags);
    assert.equal(shot.profile.damage.rules.meleeSnapshot.combatProfile.quality.level,'Fine');assert.equal(shot.spent,0);
  }finally{globalThis.GURPS=old;}
});
test('M0 compact profile editor exposes exact source motions, no assumed Thrust for Chainsaw',async()=>{
  const a=actor({'Two-Handed Axe/Mace':16}),{attack}=await weapon(a,'wCqDJeFrsa89Srp2B');
  const html=meleeProfileEditorHTML(meleeProfileContext(a,attack),{},String,a,attack);
  assert.match(html,/мягкий материал/);assert.match(html,/бетон \/ металл/);assert.doesNotMatch(html,/Thrust/);
  for(const label of ['Качество','Хват','Тип удара'])assert.match(html,new RegExp(label));
  assert.doesNotMatch(html,/data-melee-profile="skill"/);
});

test('M0 profile controls remain Russian under both ru and en without changing settings',async()=>{
  const a=actor({Broadsword:16}),{attack}=await weapon(a,'w0djXNfWD-9ebEkWu'),prior=globalThis.game,outputs=[];
  try{
    for(const lang of ['ru','en']){
      globalThis.game={i18n:{lang},settings:{set(){throw Error('Language writes forbidden');}}};
      const html=meleeProfileEditorHTML(meleeProfileContext(a,attack),{},String,a,attack);
      for(const label of ['Боевой профиль','Качество','Тип удара','Хват'])assert.ok(html.includes(label));
      assert.doesNotMatch(html,/data-melee-profile="skill"/);
      outputs.push(html);
    }
    assert.equal(outputs[0],outputs[1]);
  }finally{globalThis.game=prior;}
});

test('M0 B270 maximum ST caps numeric damage, and a shortage penalizes the selected skill once',async()=>{
  const a=actor({Knife:16}),{attack}=await weapon(a,'w3avhLUUsfJFo2rD_');
  a.system.attributes.ST={import:20,value:20};a.system.swing='3d+2';a.system.thrust='2d-1';
  const capped=resolveMeleeProfile({actor:a,attack});
  capped.damageAction={type:'deriveddamage',derivedformula:'sw',formula:'-2',damagetype:'cut'};
  const prepared=await prepareEffectiveMeleeDamage({actor:a,attack:capped});
  assert.equal(prepared.evidence.strength.effectiveST,18);assert.equal(prepared.formula,'3d-2 cut');
  a.system.attributes.ST={import:5,value:5};
  assert.equal(resolveMeleeProfile({actor:a,attack}).level,13);
});

test('M0 historical imported misses still receive a snapshot and are completed without claiming a hit',async()=>{
  const priorG=globalThis.GURPS,priorChat=globalThis.ChatMessage;
  const a=actor(),flags={},message={id:'native-miss',setFlag:async(s,k,v)=>{flags[k]=v;}};
  globalThis.ChatMessage={create:async()=>message};
  globalThis.GURPS={performAction:async()=>{await globalThis.ChatMessage.create({speaker:{actor:a.id},rolls:[{total:17}]});return false;}};
  try{
    const attack={name:'Imported',level:14,damage:'1d cut',damageAction:{type:'damage',formula:'1d',damagetype:'cut'}};
    const result=await executeNativeMeleeAttack({actor:a,sourceAttack:attack,effectiveSkill:14,captureMessage:true});
    assert.equal(result.success,true);assert.equal(result.hit,false);assert.equal(result.message,message);
    assert.equal(flags.shotSnapshot.profile.damage.formula,'1d cut');
  }finally{globalThis.GURPS=priorG;globalThis.ChatMessage=priorChat;}
});

test('M0 old owner source values are corrected read-only; manual overrides and unknown fields survive',async()=>{
  const a=actor({'Axe/Mace':16}),{record}=await weapon(a,'wvKXs-4DyF0AGgvzI');
  const data=a.getFlag('olegurps-qol','standaloneWeapons');
  data.weapons[0].modes[0].snapshot.raw_calc.damage='sw+2 cr';
  data.weapons[0].modes[0].overrides={damage:'sw+9 cr',reach:'C',customNote:'keep'};
  await a.setFlag('olegurps-qol','standaloneWeapons',data);
  const before=JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons'));
  const projected=new StandaloneWeaponService(a,catalogs).get(record.id);
  assert.equal(projected.modes[0].snapshot.raw_calc.damage,'sw cr');
  assert.deepEqual(projected.modes[0].overrides,data.weapons[0].modes[0].overrides);
  assert.equal(readStandaloneAttack(a,record.id).damage,'sw+9 cr');
  assert.equal(JSON.stringify(a.getFlag('olegurps-qol','standaloneWeapons')),before);
});

test('M0 legacy numeric skill and Parry overrides retain their complete values',async()=>{
  const a=actor({Broadsword:16}),{attack}=await weapon(a,'w0djXNfWD-9ebEkWu'),state=normalizeMeleeAssistantState({});
  setMeleeAttackOverride(state,attack,{skillLevel:11,damage:'sw+8 cut',reach:'C',parry:'17'});
  const resolved=applyMeleeAttackOverride(attack,state,a);
  assert.equal(resolved.level,11);assert.equal(resolved.parry,'17');assert.equal(resolved.damage,'sw+8 cut');assert.equal(resolved.reach,'C');
  assert.equal(resolved.meleeProfile.skill.source,'owner-override');
});

test('M0 profile reset restores source defaults and preserves other instances',async()=>{
  const a=actor({Broadsword:16}),one=await weapon(a,'w0djXNfWD-9ebEkWu'),two=await weapon(a,'w0djXNfWD-9ebEkWu');
  const service=new MeleeProfileService(a);
  await service.save(one.attack,{quality:'Fine'},options(a,one.attack));
  await service.save(two.attack,{quality:'Very Fine'},options(a,two.attack));
  await service.reset(one.attack);
  assert.equal(resolveMeleeProfile({actor:a,attack:one.attack}).meleeProfile.quality.level,'Good');
  assert.equal(resolveMeleeProfile({actor:a,attack:two.attack}).meleeProfile.quality.level,'Very Fine');
});

test('M0 confirmed Longsword MA grips change the same attack, other constructions reject them',async()=>{
  const a=actor({Broadsword:16,'Two-Handed Sword':16}),{attack}=await weapon(a,'w0djXNfWD-9ebEkWu');
  for(const [selection,formula,parry,reach]of [
    [{grip:'defensive'},'1d+1 cut','12','1'],
    [{modeId:'wkePG9X2bhubKRddv',grip:'reversed'},'1d+2 imp','9','C,1'],
    [{grip:'reversed'},'1d+1 cut','9','C']
  ]){
    const projected=resolveMeleeProfile({...options(a,attack),selection});
    projected.sourceDamage=projected.damage;
    projected.damageAction={type:'deriveddamage',derivedformula:/^sw/.test(projected.damage)?'sw':'thr',
      formula:/^sw/.test(projected.damage)?'+1':'+2',damagetype:/^sw/.test(projected.damage)?'cut':'imp'};
    assert.equal((await prepareEffectiveMeleeDamage({actor:a,attack:projected})).formula,formula);
    assert.equal(projected.parry,parry);assert.equal(projected.reach,reach);
    assert.ok(projected.meleeProfile.conditions.some(c=>c.includes('Ready')));
    assert.doesNotMatch(projected.meleeProfile.conditions.join(' '),/Без дополнительного Ready|Направление защиты учитывается вручную/);
  }
  const chainsaw=await weapon(a,'wCqDJeFrsa89Srp2B');
  assert.ok(resolveMeleeProfile({...options(a,chainsaw.attack),selection:{grip:'reversed'}}).readinessReason);
});
