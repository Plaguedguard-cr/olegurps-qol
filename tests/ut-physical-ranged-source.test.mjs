import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs} from './helpers/gauss-context.mjs';
import {UT_PHYSICAL_RANGED_PROFILES} from '../scripts/ut-physical-ranged-source.js';
test('UT physical ranged: 23 exact existing equipment/mode identities, without duplicate models',()=>{
 const profiles=Object.values(UT_PHYSICAL_RANGED_PROFILES);assert.equal(profiles.length,23);
 assert.equal(new Set(profiles.map(p=>p.equipmentId)).size,23);
 for(const p of profiles){const m=catalogs.getMode(p.modeId),e=catalogs.getEquipmentForMode(p.modeId);
  assert.equal(e.equipment_id,p.equipmentId);assert.equal(e.source,'UT');assert.equal(m.ammunition_profile.primary_ammo_family_id,p.familyId);
  assert.equal(Number(m.stats.shots.match(/^\d+/)[0]),p.shots);assert.equal(m.stats.recoil,p.modeId==='W5BEH4zTOtg2ds7is'?'3':'1');
  assert.equal(m.ut_physical_ranged_source.modeId,p.modeId);
 }
 for(const[group,count]of [['gyroc',6],['grav',6],['missile',6],['plb',5]])assert.equal(profiles.filter(p=>p.group===group).length,count);
});
test('UT144-146/138 source transcription corrections and table skill headers',()=>{
 assert.equal(catalogs.getMode('WBP_BamKPzdsBHOnI').stats.shots,'6(3)');assert.equal(catalogs.getMode('WC9xrdk8qWqC3tsHh').stats.accuracy,'0');
 assert.equal(catalogs.getMode('WYpXdcsWIyhNVC6x3').stats.range,'360/3,000');
 for(const id of ['WHv4EWlz3Tg6-cvQn','W7v0_whpuR9MtD4tH'])assert.equal(catalogs.getMode(id).stats.shots,'6(5)');
 for(const p of Object.values(UT_PHYSICAL_RANGED_PROFILES).filter(p=>p.group==='missile')){
  const m=catalogs.getMode(p.modeId);assert.equal(m.governing_skill.skill.name,'Artillery');assert.equal(m.governing_skill.skill.specialization,'Guided Missile');
  assert.ok(m.defaults.some(d=>d.type==='iq'&&d.modifier===-5));assert.equal(m.defaults.at(-1).modifier,-4);
 }
 const skill=id=>catalogs.getMode(id).governing_skill.skill;
 assert.equal(skill('WIijXG9uGZ52T0eW2').specialization,'Light Anti-armor Weapon');assert.equal(catalogs.getMode('WIijXG9uGZ52T0eW2').defaults.at(-1).modifier,-4);assert.equal(skill('W5BEH4zTOtg2ds7is').specialization,'Grenade Launcher');
 assert.equal(skill('W_eUqH082RrEoTPPP').name,'Artillery');assert.equal(skill('WYpXdcsWIyhNVC6x3').specialization,'Cannon');
});
