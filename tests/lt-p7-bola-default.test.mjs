import test from 'node:test';
import assert from 'node:assert/strict';
import {p7Fixture} from './helpers/lt-p7-context.mjs';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';
test('LT76 Bola Perdida uses Sling DX-6 when no alternative is learned; Bolas never acquires the Sling default',async()=>{
 const f=await p7Fixture('WQiw6nornpsdGHCov');f.actor.system.skills={};
 const mode=f.record.modes[0],resolve=governingSkill=>resolveStandaloneSkill({actor:f.actor,record:f.record,mode:{...mode,overrides:governingSkill?{governingSkill}:{}}});
 let s=resolve();assert.equal(s.resolved,true);assert.equal(s.family,'sling');assert.equal(s.level,14);assert.equal(s.source,'attribute-default');
 assert.equal(resolve('Bolas').resolved,false);assert.equal(resolve('Sling').level,14);
 f.actor.system.skills={b:{name:'Bolas',level:12,points:1}};assert.equal(resolve().family,'sling');assert.equal(resolve('Bolas').level,12);
 f.actor.system.skills.b.level=20;s=resolve();assert.equal(s.family,'bolas');assert.equal(s.level,20);
 f.actor.system.skills.s={name:'Sling',level:22,points:1};assert.equal(resolve().level,22);assert.equal(resolve('Bolas').level,20);
 assert.equal(resolve('Bow').resolved,false);
});
