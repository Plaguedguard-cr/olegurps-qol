import test from 'node:test';
import assert from 'node:assert/strict';
import {BS_UNARMED,GRIPBOOTS_EQUIPMENT_IDS,collectUnarmedAttacks,resolveUnarmedAttack,saveUnarmedSkill,unarmedSkills,unarmedParryHint} from '../scripts/tools/bs-unarmed.js';
import {basicStrengthDamage} from '../scripts/tools/gurps-strength-damage.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile,resolveMeleeCombatCalculation} from '../scripts/tools/melee-service.js';
import {collectMeleeAttacks as collectSourceMeleeAttacks,normalizeMeleeAssistantState,applyMeleeAttackOverride,setMeleeAttackOverride,setSelectedMeleeAttack} from '../scripts/tools/melee-assistant-state.js';
// These mechanics vectors explicitly request available candidates, not a user's list.
const collectMeleeAttacks=actor=>collectSourceMeleeAttacks(actor,{includeAvailable:true});
import {meleeCombatControls,saveMeleeCombatControl} from '../scripts/tools/melee-combat-controls.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {defensiveAttackContext,committedStrongEligible} from '../scripts/tools/melee-martial-rules.js';
import fs from 'node:fs/promises';
const sourceFixture=JSON.parse(await fs.readFile(new URL('./fixtures/bs-unarmed-m211.json',import.meta.url),'utf8'));
test('M2.11 independent Basic Set table contracts for all ordinary attacks',()=>{
 for(const row of sourceFixture.attacks){const actual=BS_UNARMED[row.id];assert.equal(actual.damage,row.damage);assert.equal(actual.reach,row.reach);assert.equal(actual.parry,row.parry);assert.equal(actual.penalty??0,row.penalty);assert.deepEqual(actual.skills,row.skills);assert.deepEqual(actual.pages,row.pages.map(n=>'B'+n));}
});

function actor(st=14,skills={},ads=[]){const flags={};return {id:'m211-test',isOwner:true,system:{attributes:{DX:{value:12},ST:{value:st,import:st}},thrust:basicStrengthDamage(st,'thrust'),swing:basicStrengthDamage(st,'swing'),skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,import:level,points:4}])),ads:Object.fromEntries(ads.map((name,i)=>[i,{name}]))},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),async setFlag(s,k,v){flags[s+'.'+k]=structuredClone(v);return v;}};}
const raw=(a,id)=>collectMeleeAttacks(a).find(x=>x.unarmedRef?.id===id);
async function prepare(a,attack,options={}){const m=/^(thr|sw)([+-]\d+)?\s+(\S+)$/.exec(attack.damage);return prepareEffectiveMeleeDamage({actor:a,attack:{...attack,sourceDamage:attack.damage,...(m?{damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2]??'',damagetype:m[3]}}:{damageAction:{type:'damage',formula:attack.damage.split(' ')[0],damagetype:attack.damage.split(' ')[1]}})},...options});}
for(const [id,p]of Object.entries(BS_UNARMED))for(const [name,relative,bonus]of [['DX',0,0],['Brawling',1,0],['Brawling',2,1],['Boxing',0,0],['Boxing',1,1],['Boxing',2,2],['Karate',-1,0],['Karate',0,1],['Karate',1,2]]){
 test('M2.11 '+id+' '+name+' DX'+relative,async()=>{
  const a=actor(14,{[name]:12+relative}),before=JSON.stringify(a.system),source=raw(a,id);
  if(!p.skills.includes(name)){await assert.rejects(saveUnarmedSkill(a,source,name));return;}
  const attack=await saveUnarmedSkill(a,source,name),d=await prepare(a,attack);
  assert.equal(attack.level,12+relative+(p.penalty??0));assert.equal(attack.reach,p.reach);assert.equal(attack.meleeProfile.unarmed.bonusPerDie,bonus);
  const base={punch:-1,kick:0,boots:1,bite:-1}[id]+bonus;
  assert.equal(d.formula,'1d'+(base>0?'+'+base:base<0?base:'')+' cr');assert.equal(JSON.stringify(a.system),before);
 });
}
for(const st of [1,10,14,19,27,40])test('M2.11 base thrust dice ST '+st,async()=>{
 const a=actor(st,{Karate:13}),attack=await saveUnarmedSkill(a,raw(a,'punch'),'Karate'),d=await prepare(a,attack),dice=Number(/^(\d+)d/.exec(a.system.thrust)[1]);
 assert.equal(attack.meleeProfile.unarmed.totalBonus,dice*2);assert.equal(d.action.olegurpsStrength.baseFormula,a.system.thrust);assert.equal(d.action.olegurpsUnarmed.baseThrustDice,dice);
});
for(const [trait,ids,type,perDie]of [['Blunt Claws',['blunt-claws-punch-cr','blunt-claws-kick-cr'],'cr',1],['Hooves',['hooves-kick-cr'],'cr',1],['Sharp Claws',['sharp-claws-punch-cut','sharp-claws-kick-cut'],'cut',0],['Talons',['talons-punch-cut','talons-punch-imp','talons-kick-cut','talons-kick-imp'],null,0],['Long Talons',['long-talons-punch-cut','long-talons-punch-imp','long-talons-kick-cut','long-talons-kick-imp'],null,1],['Sharp Teeth',['sharp-teeth'],'cut',0],['Fangs',['fangs'],'imp',0],['Sharp Beak',['sharp-beak'],'pi+',0],['Striker (Crushing)',['striker-cr'],'cr',1],['Striker (Piercing)',['striker-pi'],'pi',1],['Striker (Large Piercing)',['striker-pi+'],'pi+',1],['Striker (Cutting)',['striker-cut'],'cut',1],['Striker (Impaling)',['striker-imp'],'imp',1]])test('M2.11 natural source '+trait,async()=>{
 const a=actor(19,{Brawling:14,Karate:20,Boxing:20},[trait]),before=JSON.stringify(a.system);
 assert.deepEqual(collectMeleeAttacks(a).filter(x=>!Object.hasOwn(BS_UNARMED,x.unarmedRef.id)).map(x=>x.unarmedRef.id),ids);
 for(const id of ids){const source=raw(a,id),attack=await saveUnarmedSkill(a,source,'Brawling'),d=await prepare(a,attack);assert.equal(attack.meleeProfile.unarmed.naturalPerDie,perDie);assert.equal(attack.meleeProfile.unarmed.baseThrustDice,2);assert.equal(d.action.damagetype,type??id.split('-').at(-1));await assert.rejects(saveUnarmedSkill(a,source,'Karate'));await assert.rejects(saveUnarmedSkill(a,source,'Boxing'));}
 if(trait.startsWith('Striker')){const weak=actor(19,{Brawling:11},[trait]);assert.equal((await saveUnarmedSkill(weak,raw(weak,ids[0]),'Brawling')).parry,'9');}
 assert.equal(JSON.stringify(a.system),before);
});
test('M2.11 no unsupported organs or implants; DX remains available with no learned skill',async()=>{
 const a=actor(10,{},['Cyber-Claws','Ripsnake','Cyberhair','Stinger','Bomb Implant','Striker','Striker (Crushing, Long)']);assert.equal(collectMeleeAttacks(a).length,4);
 for(const attack of collectMeleeAttacks(a)){assert.equal(unarmedSkills(a,attack.unarmedRef.profile).filter(s=>s.resolved).length,1);assert.equal(resolveUnarmedAttack(a,attack).meleeProfile.unarmed.bonusPerDie,0);await assert.rejects(saveUnarmedSkill(a,attack,'Brawling'));}
});
test('M2.11 exact native GGA attack is reused and its bonus preserved until explicit selection',async()=>{
 const a=actor(19,{Brawling:14,Karate:13});a.system.melee={a:{name:'Punch',mode:'Punch',damage:'2d+3 cr',reach:'C',parry:'10',level:14}};
 const rows=collectMeleeAttacks(a),source=rows.find(x=>x.name==='Punch');assert.equal(rows.length,4);assert.equal(source.unarmedRef.native,true);
 let d=await prepare(a,resolveUnarmedAttack(a,source));assert.equal(d.formula,'2d+3 cr');assert.equal(resolveUnarmedAttack(a,source).meleeProfile.unarmed.alreadyIncluded,true);
 const selected=await saveUnarmedSkill(a,source,'Brawling');d=await prepare(a,selected);assert.equal(d.formula,'2d cr');assert.equal(selected.level,14);
 d=await prepare(a,await saveUnarmedSkill(a,source,'Karate'));assert.equal(d.formula,'2d+2 cr');
});
test('M2.11 boots do not inherit claws, Karate has encumbrance and baseline threshold',async()=>{
 const a=actor(19,{Karate:13},['Long Talons']);a.system.encumbrance={a:{current:true,level:3}};
 const boots=await saveUnarmedSkill(a,raw(a,'boots'),'Karate'),d=await prepare(a,boots);assert.equal(d.formula,'2d+4 cr');assert.equal(boots.level,8);assert.equal(boots.meleeProfile.unarmed.bonusPerDie,2);assert.equal(boots.meleeProfile.unarmed.naturalPerDie,0);
});
test('M2.11 fixed/manual and linked damage do not inherit per-die bonuses',async()=>{
 const a=actor(19,{Brawling:14}),attack=await saveUnarmedSkill(a,raw(a,'punch'),'Brawling');
 const fixed=await prepare(a,{...attack,damage:'3d burn'});assert.equal(fixed.formula,'3d burn');
 const source={...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:'thr',formula:'-1',damagetype:'cr',next:{type:'damage',formula:'1d',damagetype:'burn'}}};
 const d=await prepareEffectiveMeleeDamage({actor:a,attack:source});assert.equal(d.formula,'2d cr, 1d burn');assert.equal(d.action.next.olegurpsUnarmed,undefined);
 const state=normalizeMeleeAssistantState({});setMeleeAttackOverride(state,raw(a,'punch'),{skillLevel:14,damage:'2d+7 cr',reach:'C',parry:'10'});const manual=applyMeleeAttackOverride(raw(a,'punch'),state,a);assert.equal((await prepare(a,manual)).formula,'2d+7 cr');
});
test('M2.11 frozen skill, damage and source survive reload, ST and selection changes',async()=>{
 const a=actor(19,{Brawling:14,Karate:13}),source=raw(a,'punch'),attack=await saveUnarmedSkill(a,source,'Brawling'),preparedDamage=await prepare(a,attack),shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack,preparedDamage}),{attackId:'m211-history'}),saved=JSON.stringify(shot);
 await saveUnarmedSkill(a,source,'Karate');assert.equal(resolveUnarmedAttack(a,raw(a,'punch')).meleeProfile.unarmed.selectedSkill,'Karate');a.system.attributes.ST.value=40;
 assert.equal(JSON.stringify(shot),saved);assert.equal(JSON.parse(saved).profile.damage.formula,'2d cr');assert.equal(shot.profile.damage.rules.bsUnarmed.selectedSkill,'Brawling');assert.equal(shot.profile.damage.rules.meleeSnapshot.action.formula,'2d');
});
test('M2.11 common controls, no Weapon Bond, kick defense and maneuvers',async()=>{
 const a=actor(14,{Karate:13}),punch=raw(a,'punch');await saveMeleeCombatControl(a,punch,'skill','Karate');assert.equal(meleeCombatControls(a,punch).skill,'Karate');
 const state=normalizeMeleeAssistantState({});for(const mode of collectMeleeAttacks(a)){setSelectedMeleeAttack(state,mode);const restored=normalizeMeleeAssistantState(JSON.parse(JSON.stringify(state)));assert.equal(restored.selectedAttackKey,mode.key);assert.ok(collectMeleeAttacks(a).some(r=>r.key===restored.selectedAttackKey));}
 const attack=resolveUnarmedAttack(a,punch);assert.equal(resolveMeleeCombatCalculation({actor:a,attack,baseSkill:13,weaponBond:true}).effectiveSkill,13);assert.equal(committedStrongEligible(attack),true);
 assert.match(unarmedParryHint(BS_UNARMED.punch,{name:'Boxing'}),/−2.*−3/);assert.match(unarmedParryHint(BS_UNARMED.punch,{name:'Karate'}),/encumbrance/);
 assert.equal(defensiveAttackContext(resolveUnarmedAttack(a,raw(a,'kick'))).kind,'kick');assert.equal((await prepare(a,attack,{allOutStrong:true})).formula,'1d+3 cr');
 assert.equal((await prepare(a,attack,{dicePlusAdds:true})).formula,'1d+1 cr');
});
test('M2.11 ordinary weapon and native grappling actions stay native',()=>{
 const a=actor(),weapons=[{key:'sword',name:'Sword',damage:'sw+1 cut',level:14},{key:'judo',name:'Judo',mode:'Throw',damage:'',level:14},{key:'implant',name:'Cyber-Claws',mode:'Punch',damage:'thr imp',level:14}];
 assert.deepEqual(collectUnarmedAttacks(a,weapons).slice(0,3),weapons);for(const w of weapons)assert.equal(resolveUnarmedAttack(a,w),w);
});
test('M2.11 GCS natural Punch/Slash/Stab/Bite rows are reused without competing copies',async()=>{
 const a=actor(19,{Brawling:14},['Long Talons','Fangs']);a.system.melee={a:{name:'Long Talons',mode:'Slash',parentuuid:'gcs-talons',damage:'2d+4 cut',reach:'C,1',level:14},b:{name:'Long Talons',mode:'Stab',parentuuid:'gcs-talons',damage:'2d+4 imp',reach:'C,1',level:14},c:{name:'Fangs',mode:'Bite',damage:'2d imp',reach:'C',level:14}};
 const attacks=collectMeleeAttacks(a);assert.equal(attacks.filter(x=>x.unarmedRef.id==='long-talons-punch-cut').length,1);assert.equal(attacks.filter(x=>x.unarmedRef.id==='long-talons-punch-imp').length,1);assert.equal(attacks.filter(x=>x.unarmedRef.id==='fangs').length,1);
 const source=attacks.find(x=>x.key==='path:system.melee.a');assert.equal((await prepare(a,resolveUnarmedAttack(a,source))).formula,'2d+4 cut');assert.equal((await prepare(a,await saveUnarmedSkill(a,source,'Brawling'))).formula,'2d+2 cut');
});
test('M2.11 Gripboots require an equipped physical accessory; native GCS bonus is not repeated',async()=>{
 const a=actor(19,{Karate:13});a.system.equipment={carried:{a:{name:'Gripboots',count:1,equipped:true}}};assert.equal(raw(a,'gripboots'),undefined);a.system.equipment.carried.a.originaluuid=GRIPBOOTS_EQUIPMENT_IDS[0];a.system.equipment.carried.a.equipped=false;assert.equal(raw(a,'gripboots'),undefined);a.system.equipment.carried.a.equipped=true;
 for(const id of GRIPBOOTS_EQUIPMENT_IDS){a.system.equipment.carried.a.originaluuid=id;a.system.equipment.carried.a.name='Renamed boots';assert.ok(raw(a,'gripboots'));}a.system.equipment.carried.a.originaluuid=GRIPBOOTS_EQUIPMENT_IDS[0];
 const attack=await saveUnarmedSkill(a,raw(a,'gripboots'),'Karate'),d=await prepare(a,attack);assert.equal(d.formula,'2d+5 cr');assert.equal(attack.meleeProfile.unarmed.naturalPerDie,1);
 assert.equal(defensiveAttackContext(attack).kind,'kick');
 a.system.melee={a:{name:'Kick',mode:'Kick',damage:'2d+5 cr',level:11,reach:'C,1'}};assert.equal((await prepare(a,resolveUnarmedAttack(a,raw(a,'kick')))).formula,'2d+5 cr');
});
test('M2.11 owner manual skill and parry persist without changing learned damage threshold',async()=>{
 const a=actor(14,{Karate:13}),source=raw(a,'punch');await saveUnarmedSkill(a,source,'Karate');const state=normalizeMeleeAssistantState({});setMeleeAttackOverride(state,source,{skillLevel:8,damage:source.damage,reach:'C',parry:'6'});
 const attack=applyMeleeAttackOverride(source,state,a);assert.equal(attack.level,8);assert.equal(attack.parry,'6');assert.equal(attack.meleeProfile.unarmed.bonusPerDie,2);
});
test('M2.11 a generic native Bite reuses the actual teeth trait and never becomes a blunt duplicate',async()=>{
 const a=actor(19,{Brawling:14},['Fangs']);a.system.melee={a:{name:'Bite',mode:'Bite',damage:'2d imp',level:14,reach:'C'}};
 const rows=collectMeleeAttacks(a),teeth=rows.filter(r=>r.unarmedRef.profile.part==='teeth');assert.equal(teeth.length,1);assert.equal(teeth[0].unarmedRef.id,'fangs');assert.equal(teeth[0].unarmedRef.native,true);assert.equal(raw(a,'bite'),undefined);
 const attack=await saveUnarmedSkill(a,teeth[0],'Brawling');assert.equal((await prepare(a,attack)).formula,'2d imp');
});
test('M2.11 explicit native skill preserves armor divisor, minimum and independent linked damage',async()=>{
 const a=actor(19,{Brawling:14});a.system.melee={a:{name:'Punch',damage:'2d+3(2)! cr, 1d burn',level:14,reach:'C'}};
 const attack=await saveUnarmedSkill(a,raw(a,'punch'),'Brawling');assert.equal(attack.damage,'thr-1(2)! cr, 1d burn');
 const d=await prepareEffectiveMeleeDamage({actor:a,attack:{...attack,sourceDamage:attack.damage,damageAction:{type:'deriveddamage',derivedformula:'thr',formula:'-1(2)!',damagetype:'cr',next:{type:'damage',formula:'1d',damagetype:'burn'}}}});assert.equal(d.formula,'2d(2)! cr, 1d burn');
});
test('M2.11 a native Punch with an existing sharp-claw trait keeps its natural type and one source',async()=>{
 const a=actor(19,{Brawling:14,Karate:20},['Sharp Claws']);a.system.melee={a:{name:'Punch',mode:'Punch',damage:'2d cut',reach:'C',level:14}};
 const attacks=collectMeleeAttacks(a),source=attacks.find(r=>r.key==='path:system.melee.a');assert.equal(source.unarmedRef.id,'sharp-claws-punch-cut');assert.equal(attacks.filter(r=>r.name==='Punch').length,1);await assert.rejects(saveUnarmedSkill(a,source,'Karate'));assert.equal((await prepare(a,await saveUnarmedSkill(a,source,'Brawling'))).formula,'2d cut');
});
