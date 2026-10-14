import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService } from "../scripts/catalog-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { resolveStandaloneSkill, parseStandaloneSkill } from "../scripts/tools/standalone-skill-service.js";
import { readStandaloneAttack, standaloneCatalogBinding, standaloneAvailableRounds } from "../scripts/tools/standalone-attack-service.js";
import { StandaloneWeaponDraft, StandaloneWeaponService, standaloneAmmoCarrier } from "../scripts/tools/standalone-weapon-service.js";
import { resolveRangedGoverningSkill } from "../scripts/tools/ranged-governing-skill-service.js";
import { resolveCombatCalculation } from "../scripts/tools/combat-calculation-engine.js";
import { getCombatRules } from "../scripts/tools/combat-technique-registry.js";
import { createTargetedAttackContext, createMeleeTargetedAttackContext } from "../scripts/tools/targeted-attack-service.js";
import { resolveRangedRapidStrike } from "../scripts/tools/ranged-rapid-strike-service.js";
import { findCloseHipShooting } from "../scripts/tools/close-hip-shooting-service.js";
import { resolveRuntimeAttackProfile, withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { collectMeleeAttacks } from "../scripts/tools/melee-assistant-state.js";
import { executePreparedGgaRoll } from "../scripts/tools/prepared-gga-roll.js";

const catalogs = new CatalogService({ logger:null, fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))}) });
await catalogs.load();
globalThis.foundry = { utils:{deepClone:structuredClone} };
const learned = (name, level, points=1) => ({ name, level, points, type:'SKILL' });
function fixture(skills=[],dx=10) {
  const flags={};
  const actor={ id:'actor',isOwner:true,system:{ranged:{},melee:{},skills:Object.fromEntries(skills.map((s,i)=>[i,s])),attributes:{DX:{value:dx},IQ:{value:10}}},
    getFlag:(s,k)=>structuredClone(flags[s]?.[k]),setFlag:async(s,k,v)=>{flags[s]??={};flags[s][k]=structuredClone(v);},
    update:async changes=>{for(const [path,value] of Object.entries(changes)){
      const [,s,k]=path.split('.');flags[s]??={};if(k.startsWith('-='))delete flags[s][k.slice(2)];else flags[s][k]=structuredClone(value);
    }} };
  return {actor,service:new StandaloneWeaponService(actor,catalogs)};
}
async function weapon(f,type='ranged',name='Izhmash AK-47') {
  const draft=new StandaloneWeaponDraft({catalogs,type});
  draft.selectModel(catalogs.getCatalog('weapons').equipment.find(e=>e.name.startsWith(name)&&e.modes.some(m=>m.combat_type===type)).equipment_id);
  return f.service.save(draft);
}
test('precise skill parsing preserves family, specialization, TL and LAW alias',()=>{
  assert.equal(parseStandaloneSkill('Guns/TL8 (LAW)').specialty,'light anti-armor weapon');
  assert.equal(parseStandaloneSkill('Two-Handed Axe/Mace').family,'two-handed axe/mace');
});

test('HT98 cigarette pistol uses DX-4 rather than inherited Guns defaults and keeps the roll snapshot',async()=>{
  const f=fixture([learned('Guns/TL7 (Pistol)',30)],12);
  const d=new StandaloneWeaponDraft({catalogs,type:'ranged'});
  d.selectModel(catalogs.getEquipmentForMode('WL0SlLUJxX2V_3KVh').equipment_id);
  const before=JSON.stringify(f.actor.system),record=await f.service.save(d);
  const attack=readStandaloneAttack(f.actor,record.id);
  assert.equal(attack.level,8);assert.equal(attack.readinessReason,null);
  assert.equal(attack.standaloneRef.governingSkill.source,'attribute-roll');
  assert.equal(attack.skillDescription,'DX-4: 8');assert.equal(JSON.stringify(f.actor.system),before);
  const snapshot=JSON.parse(JSON.stringify(attack.standaloneRef));
  f.actor.system.attributes.DX.value=25;
  assert.equal(readStandaloneAttack(f.actor,record.id).level,21);
  assert.equal(snapshot.governingSkill.level,8);
  delete f.actor.system.attributes.DX;
  assert.equal(readStandaloneAttack(f.actor,record.id).standaloneRef.governingSkill.resolved,false);
});

test('HT98 Wrist Gun retains Pistol -2 and other Guns -4 without changing learned levels',async()=>{
  for(const [specialty,expected]of [['Pistol',12],['Rifle',10],['Shotgun',10],['Wrist Gun',14]]) {
    const f=fixture([learned('Guns/TL6 ('+specialty+')',14)],10);
    const d=new StandaloneWeaponDraft({catalogs,type:'ranged'});d.selectModel(catalogs.getEquipmentForMode('WaIDKb3cN40p-9pJu').equipment_id);
    const record=await f.service.save(d),before=JSON.stringify(f.actor.system);
    // HT98 classifies this construction as TL6; isolate specialty from TL.
    assert.equal(readStandaloneAttack(f.actor,record.id).level,expected,specialty);
    assert.equal(JSON.stringify(f.actor.system),before);
  }
});
test('exact learned catalog skill wins; imported skill level is refreshed on every read',async()=>{
  const f=fixture([learned('Guns/TL7 (Rifle)',14),learned('Guns/TL7 (Pistol)',25)]),record=await weapon(f);
  let attack=readStandaloneAttack(f.actor,record.id);
  assert.equal(attack.level,14);assert.equal(attack.standaloneRef.governingSkill.learned,true);
  f.actor.system.skills[0].level=17;
  assert.equal(readStandaloneAttack(f.actor,record.id).level,17);
  assert.equal(resolveRangedGoverningSkill({actor:f.actor,binding:attack.governingSkillBinding}).level,17);
});
test('Rifle/TL8 14 defaults to LAW/TL8 10 using the exact LAW mode, not Artillery',async()=>{
  const f=fixture([learned('Guns/TL8 (Rifle)',14)]),record=await weapon(f,'ranged','FFV AT4');
  const skill=readStandaloneAttack(f.actor,record.id).standaloneRef.governingSkill;
  assert.equal(skill.level,10);assert.equal(skill.penalty,-4);assert.equal(skill.learned,false);
  assert.equal(skill.sourceName,'Guns/TL8 (Rifle)');
});
test('best of all directed learned defaults and attribute default is selected without capping learned skill at 20',async()=>{
  const f=fixture([learned('Guns/TL7 (Pistol)',28),learned('Guns/TL7 (Shotgun)',21)],30),record=await weapon(f);
  const skill=readStandaloneAttack(f.actor,record.id).standaloneRef.governingSkill;
  assert.equal(skill.level,26);assert.ok(skill.candidates.some(c=>c.source==='attribute-default'&&c.level===16));
});
test('attribute defaults obey Rule of 20 and never fabricate an absent attribute',async()=>{
  const f=fixture([],30),record=await weapon(f);
  assert.equal(readStandaloneAttack(f.actor,record.id).level,16);
  delete f.actor.system.attributes.DX;
  assert.equal(readStandaloneAttack(f.actor,record.id).level,null);
});
test('zero-point skills and default chains are not learned default sources',async()=>{
  const f=fixture([learned('Guns/TL7 (Pistol)',30,0)]),record=await weapon(f);
  assert.equal(readStandaloneAttack(f.actor,record.id).level,6);
  f.actor.system.skills[0].points=1;
  assert.equal(readStandaloneAttack(f.actor,record.id).level,28);
});
test('different families and unknown TL do not produce guessed transitions',async()=>{
  const f=fixture([learned('Gunner/TL7 (Rifle)',30),learned('Artillery/TL7 (Rifle)',30),learned('Guns (Rifle)',30)]),record=await weapon(f);
  assert.equal(readStandaloneAttack(f.actor,record.id).level,6);
});
test('cross-TL DX defaults use B168 penalty; no skill or weapon is blocked by TL',async()=>{
  const f=fixture([learned('Guns/TL8 (Rifle)',14)]),record=await weapon(f);
  const attack=readStandaloneAttack(f.actor,record.id);
  assert.equal(attack.level,13);assert.equal(attack.standaloneRef.governingSkill.penalty,-1);assert.equal(attack.readinessReason,null);
});
test('directed IQ-based Artillery defaults retain distinct higher and lower TL penalties',()=>{
  const record={id:'artillery',equipmentSnapshot:{tech_level:'8'}};
  const mode={modeId:'cannon',snapshot:{governing_skill:{status:'resolved',skill:{name:'Artillery',specialization:'Cannon'}},
    defaults:[{type:'skill',name:'Artillery',specialization:'Cannon',modifier:0}]}};
  for(const [tl,expected] of [[7,15],[10,17]]){
    const f=fixture([learned('Artillery/TL'+tl+' (Cannon)',20)]);
    const skill=resolveStandaloneSkill({actor:f.actor,record,mode});
    assert.equal(skill.level,expected);assert.equal(skill.penalty,expected-20);assert.equal(skill.learned,false);
  }
});
test('manual unknown skill can use only exact learned identity; unknown defaults remain unresolved',()=>{
  const f=fixture([learned('Custom Skill',12)]), record={id:'w',equipmentSnapshot:{}},mode={modeId:'m',snapshot:{defaults:[{type:'dx',modifier:-4}]},overrides:{governingSkill:'Custom Skill'}};
  assert.equal(resolveStandaloneSkill({actor:f.actor,record,mode}).level,12);
  f.actor.system.skills={};assert.equal(resolveStandaloneSkill({actor:f.actor,record,mode}).level,null);
});
test('melee modes use their own governing skill and directed defaults; no magazines are involved',async()=>{
  const f=fixture([learned('Axe/Mace',14)]),record=await weapon(f,'melee','Axe');
  const attacks=collectMeleeAttacks(f.actor);
  assert.equal(attacks.length,2);assert.equal(attacks[0].level,14);assert.equal(attacks[1].level,11);
  assert.equal(attacks[0].parry,'10U');assert.equal(attacks[1].parry,'8U');
  assert.equal(attacks[1].standaloneRef.governingSkill.penalty,-3);
  assert.equal(createMeleeTargetedAttackContext({actor:f.actor,attack:attacks[1]}).automaticSpecialty,attacks[1].standaloneRef.governingSkill.key);
});
test('learned technique improvements are rejected centrally but default combat actions remain',()=>{
  const calculation=resolveCombatCalculation({combatType:'ranged',baseAttackLevel:10,governingSkill:{learned:false},
    channels:[{id:'rangedRapidStrike',value:-6},{id:'hitLocation',value:-5}],rules:getCombatRules('ranged'),
    context:{rapidStrike:{quickShotEntry:{},penalty:0},targetedAttack:{effectivePenalty:-2}}});
  assert.equal(calculation.effectiveSkill,-1);assert.equal(calculation.activeRules.length,0);
});
test('Quick-Shot, Close-Hip and Targeted Attack do not transfer to unlearned target skill',()=>{
  const f=fixture([{name:'Quick-Shot (Rifle)',level:20,relativelevel:'0',type:'TECHNIQUE'},
    {name:'Close-Hip Shooting (Rifle)',level:20,relativelevel:'+3',type:'TECHNIQUE'},learned('Guns/TL8 (Rifle)',14)]);
  const governingSkill={family:'guns',specialty:'rifle',level:10,learned:false};
  assert.equal(resolveRangedRapidStrike({actor:f.actor,governingSkill}).penalty,-6);
  assert.equal(findCloseHipShooting({actor:f.actor,governingSkill}),null);
  assert.equal(createTargetedAttackContext({actor:f.actor}).resolve({governingSkill,target:'face',basePenalty:-5}),null);
});
test('module-owned profiles are immutable and native Damage does not need Actor ranged/melee entries',async()=>{
  const f=fixture([learned('Guns/TL7 (Rifle)',14)]),record=await weapon(f),attack=readStandaloneAttack(f.actor,record.id);
  const before=structuredClone(f.actor.system),runtime={OleGURPSQOL:{catalogs}};
  const profile=resolveRuntimeAttackProfile({actor:f.actor,attack,ammunition:null,runtime});
  assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.damage.formula,'5d+1 pi');
  assert.equal(profile.binding.status,'confirmed');assert.equal(profile.mode.standaloneRef.modeId,record.modes[0].modeId);
  assert.equal(profile.sources.raw,'flags.olegurps-qol.standaloneWeapons');assert.deepEqual(f.actor.system,before);
  const shot=createShotSnapshot(profile,{attackId:'attack',messageId:'message'});
  await f.service.remove(record.id);
  assert.equal(shot.profile.damage.formula,'5d+1 pi');assert.ok(Object.isFrozen(shot.profile));
});
test('catalog binding verifies model/mode relation; absent catalogs are not falsely confirmed',async()=>{
  const f=fixture(),record=await weapon(f),attack=readStandaloneAttack(f.actor,record.id);
  assert.equal(standaloneCatalogBinding(attack,catalogs).status,'confirmed');
  assert.equal(standaloneCatalogBinding(attack,null).status,'unavailable');
  const savedHash=attack.standaloneRef.source.sourceHash;attack.standaloneRef.source.sourceHash='old-revision';
  assert.equal(standaloneCatalogBinding(attack,catalogs).status,'unavailable');attack.standaloneRef.source.sourceHash=savedHash;
  attack.standaloneRef.source.equipmentId='wrong';assert.equal(standaloneCatalogBinding(attack,catalogs).status,'unavailable');
});
test('unmanaged real attacks produce receipts and completed snapshots without inventing or consuming rounds',async()=>{
  const f=fixture(),record=await weapon(f),carrier=standaloneAmmoCarrier(record),service=new AmmoService(f.actor);
  // Existing definition-only weapons remain unmanaged; new weapons now start with an empty feed.
  delete carrier.ammunitionInventory;Object.assign(carrier,{magazines:[],loadedIndex:-1,capacity:0,ammoUnconfigured:true});
  await f.actor.setFlag('world','gurpsAmmoManager',{weapons:[carrier]});
  assert.equal(standaloneAvailableRounds(carrier),Infinity);
  const before=structuredClone(f.actor.system),attack=readStandaloneAttack(f.actor,record.id);
  const profile=resolveRuntimeAttackProfile({actor:f.actor,attack,weaponId:carrier.id,ammunition:null,runtime:{OleGURPSQOL:{catalogs}}});
  let saved;
  const result=await service.executeShot({weaponId:carrier.id,attackId:'shot',prepare:()=>({profile,amount:3}),
    execute:()=>({rolled:true,message:{id:'message',setFlag:async(_s,_k,value)=>{saved=value;}}})});
  assert.equal(result.spent,0);assert.equal(saved.correlation.attackMessageId,'message');
  assert.equal(result.weapon.magazines.length,0);assert.equal(result.weapon.totalAmmo,0);assert.deepEqual(f.actor.system,before);
});

test('native damage readiness accepts one supported formula and blocks unresolved or compound damage',async()=>{
  const f=fixture([learned('Guns/TL7 (Rifle)',14)]),record=await weapon(f),original=globalThis.GURPS;
  try {
    for (const [action,ready] of [[{type:'damage'},true],[{type:'deriveddamage'},true],[undefined,false],
      [{type:'skill-spell'},false],[{type:'damage',next:{type:'damage'}},false]]) {
      globalThis.GURPS={parselink:()=>({action})};
      assert.equal(readStandaloneAttack(f.actor,record.id).readinessReason===null,ready);
    }
  } finally { if (original===undefined) delete globalThis.GURPS;else globalThis.GURPS=original; }
});

test('shared melee prepared adapter keeps native template, bucket modifiers, telegraphic critical limit and privacy',async()=>{
  const actor={id:'actor',canRoll:async action=>{assert.equal(action.isMelee,true);assert.equal(action.deceptiveDefensePenalty,-1);return {canRoll:true};}}, messages=[];
  let chatdata;
  const runtime={game:{user:{id:'gm'},settings:{get:(_s,k)=>k==='rollMode'?'blindroll':null}},
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[{modint:1,desc:'bucket'}]}},
    Roll:{create:()=>({total:5,dice:[{results:[{result:1},{result:2},{result:2}]}],evaluate:async function(){return this;}})},
    renderTemplate:async(path,data)=>{assert.equal(path,'systems/gurps/templates/die-roll-chat-message.hbs');chatdata=data;return 'native';},
    ChatMessage:{getSpeaker:()=>({actor:'actor'}),applyRollMode:(data,mode)=>{assert.equal(mode,'blindroll');data.blind=true;data.whisper=['gm'];},
      create:async data=>{messages.push(data);return {id:'native-message'};}}};
  const result=await executePreparedGgaRoll({actor,combatType:'melee',attack:{name:'Axe',mode:'Swing',level:10,standaloneRef:{governingSkill:{name:'Axe/Mace',level:10,learned:false}}},
    baseSkill:10,effectiveSkill:14,telegraphicCriticalBonus:4,deceptiveDefensePenalty:-1,attackContextHtml:'Deceptive Attack: -1 defense',physicalShots:1,effectiveRoF:1,rcl:1,consumeAction:false,runtime});
  assert.equal(result.rolled,true);assert.equal(chatdata.finaltarget,15);assert.equal(chatdata.isCritSuccess,false);
  assert.equal(chatdata.rof,null);assert.equal(chatdata.rofrcl,null);assert.equal(chatdata.chatthing,'Axe (Swing)');
  assert.ok(chatdata.followon.includes('D:'));assert.equal(messages[0].blind,true);assert.deepEqual(messages[0].whisper,['gm']);
  assert.ok(messages[0].content.includes('<details class="olegurps-attack-context">'));
  assert.ok(messages[0].content.includes('Deceptive Attack: -1 defense'));assert.ok(!messages[0].content.includes('<details open'));
  const capped=await executePreparedGgaRoll({actor,combatType:'melee',attack:{name:'Axe',level:14},effectiveSkill:9,skillCap:9,deceptiveDefensePenalty:-1,physicalShots:1,effectiveRoF:1,rcl:1,consumeAction:false,runtime});
  assert.equal(capped.rollData.finaltarget,9);
});

test('standalone physical shot spends once; switching AP magazines preserves totals and immutable baseline damage',async()=>{
  const f=fixture([learned('Guns/TL7 (Rifle)',14)]),record=await weapon(f),carrier=standaloneAmmoCarrier(record),service=new AmmoService(f.actor);
  await f.actor.setFlag('world','gurpsAmmoManager',{weapons:[carrier]});
  const base={key:'ht:ammo-item:ht_7_62x39mm',source:'catalog',book:'ht',kind:'ammo-item',ammoId:'ht_7_62x39mm',name:'7.62x39mm'};
  const ap={...base,key:base.key+':recipe-v1:ht_ap',name:base.name+' AP',recipe:{version:1,variantId:'ht_ap'}};
  await service.inventoryTransaction(carrier.id,'initialize');
  for(const t of [base,ap])await service.inventoryTransaction(carrier.id,'add-stock',{ammoKey:t.key,amount:5},{allowedTypes:[base,ap]});
  let state=await service.inventoryTransaction(carrier.id,'add-magazines',{capacity:30,amount:1});
  const mags=state.weapons[0].ammunitionInventory.magazines;
  for(const [i,t]of [base,ap].entries())await service.inventoryTransaction(carrier.id,'load',{magazineId:mags[i].id,ammoKey:t.key,amount:5},{allowedTypes:[base,ap]});
  await service.inventoryTransaction(carrier.id,'install',{magazineId:mags[0].id});
  const runtime={OleGURPSQOL:{catalogs,ammunitionCompatibility:new AmmunitionCompatibilityService(catalogs)}};
  const attack=readStandaloneAttack(f.actor,record.id);let rolls=0;
  const options={weaponId:carrier.id,attackId:'physical',prepare:({state,ammunition})=>({amount:3,profile:resolveRuntimeAttackProfile({actor:f.actor,attack,weaponId:carrier.id,state,ammunition,runtime})}),
    execute:()=>{rolls++;return {rolled:true,message:{id:'message',setFlag:async()=>{}}};}};
  const shot=await service.executeShot(options);assert.equal(shot.spent,3);assert.equal(rolls,1);
  const replay=await service.executeShot(options);assert.equal(replay.duplicate,true);assert.equal(rolls,1);
  state=await service.inventoryTransaction(carrier.id,'install',{magazineId:mags[1].id});
  assert.equal(state.weapons[0].totalAmmo,7);assert.deepEqual(state.weapons[0].magazines,[2,5]);
  const apProfile=resolveRuntimeAttackProfile({actor:f.actor,attack,weaponId:carrier.id,ammunition:service.readAttackAmmunition(carrier.id),runtime});
  assert.equal(apProfile.damage.formula,'4d-1(2) pi-');assert.equal(shot.snapshot.profile.damage.formula,'5d+1 pi');
  await service.inventoryTransaction(carrier.id,'delete-magazine',{magazineId:mags[0].id});
  assert.equal(service.readAttackAmmunition(carrier.id).total,7);
  assert.deepEqual(f.actor.system.ranged,{});
});
