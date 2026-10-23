import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sourceRows} from './helpers/sonic-neural-context.mjs';
import {SONIC_NEURAL_PROFILES} from '../scripts/ut-sonic-neural-source.js';
for(const row of sourceRows)test(row.utName+': source TL including superscience resolves the exact learned skill',async()=>{
 const p=SONIC_NEURAL_PROFILES[row.modeIds[0]],f=await fixture(p.modeId);
 f.actor.system.skills={s:{name:(p.specialty==='Beams'?'Gunner':'Beam Weapons')+'/TL'+parseInt(p.tl)+' ('+p.specialty+')',points:8,level:24}};
 const skill=f.attack().standaloneRef.governingSkill;assert.equal(skill.tl,parseInt(p.tl));assert.equal(skill.learned,true);assert.equal(skill.level,24);
});
test('Death Beam raises the whole construction to TL12, keeps source TL11, honors skill TL preference and frozen history',async()=>{
 const f=await fixture('WLl_MaLTZuEsWMFbQ');f.actor.system.skills={s:{name:'Beam Weapons/TL11 (Projector)',points:8,level:24}};
 const shot=await f.shoot(),saved=JSON.stringify(shot.snapshot);await f.hardware({neuralSettings:['stun','death']});
 let skill=f.attack().standaloneRef.governingSkill;assert.equal(skill.tl,12);assert.equal(skill.level,23);assert.equal(skill.tlPenalty,-1);
 const user=game.user;game.user={...user,getFlag:(_s,k)=>k==='ignoreWeaponSkillTLDifferences'};
 try{skill=f.attack().standaloneRef.governingSkill;assert.equal(skill.level,24);assert.equal(skill.tlPenalty,0);}finally{game.user=user;}
 assert.equal(f.definitions.list()[0].equipmentSnapshot.tech_level,'11^');assert.equal(JSON.stringify(shot.snapshot),saved);
});
