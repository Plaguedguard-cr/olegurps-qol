import test from 'node:test';
import assert from 'node:assert/strict';
import {basicStrengthDamage,BASIC_ST_DAMAGE} from '../scripts/tools/gurps-strength-damage.js';
import {StrengthService,resolveStrengthDamage} from '../scripts/tools/strength-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile} from '../scripts/tools/melee-service.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';

// Independent checked GCS BasicSet examples; printed B16 rows and B15 >100 policy are retained.
const cases=[
 [39,'4d+1','7d-1'],[40,'4d+1','7d-1'],[41,'4d+2','7d'],[42,'4d+2','7d'],
 [44,'5d-1','7d+1'],[45,'5d','7d+1'],[46,'5d','7d+2'],[49,'5d+2','8d-1'],
 [50,'5d+2','8d-1'],[74,'8d+2','10d+2'],[75,'8d+2','10d+2'],[96,'11d-1','12d+2'],
 [99,'11d','13d'],[100,'11d','13d'],[101,'11d','13d']
];
for(const [st,thr,sw]of cases)test('ST '+st+' exact thrust and swing',()=>{
 assert.equal(basicStrengthDamage(st,'thrust'),thr);assert.equal(basicStrengthDamage(st,'swing'),sw);
});
test('all published B16 rows and the existing >100 rule stay unchanged',()=>{
 for(const[st,pair]of Object.entries(BASIC_ST_DAMAGE))for(const[kind,i]of [['thrust',0],['swing',1]])assert.equal(basicStrengthDamage(Number(st),kind),pair[i]);
 assert.equal(basicStrengthDamage(109,'thrust'),'11d');assert.equal(basicStrengthDamage(110,'swing'),'14d');
});
test('shared temporary ST, Striking and explicit Arm cross the old gap; Lifting never does',async()=>{
 let flag;const a={id:'st',isOwner:true,system:{attributes:{ST:{import:39,value:39}},thrust:'4d+1',swing:'7d-1',ads:{s:{originalName:'Striking ST',level:0},a:{originalName:'Arm ST',level:4}}},
 getFlag:()=>flag,setFlag:async(s,k,v)=>{flag=structuredClone(v);}};
 await new StrengthService(a).save({st:1,striking:1,lifting:50});
 assert.equal(resolveStrengthDamage(a,'swing').effectiveST,41);assert.equal(resolveStrengthDamage(a,'swing').baseFormula,'7d');
 assert.equal(resolveStrengthDamage(a,'thrust',{applyArmST:true}).effectiveST,45);
 const attack={name:'Sword',damage:'sw+3 cut',damageAction:{type:'deriveddamage',derivedformula:'sw',formula:'+3',damagetype:'cut'}};
 const prepared=await prepareEffectiveMeleeDamage({actor:a,attack});assert.equal(prepared.formula,'7d+3 cut');
 const shot=createShotSnapshot(freezeMeleeAttackProfile({actor:a,attack,preparedDamage:prepared}),{attackId:'A',messageId:'M'}),saved=JSON.stringify(shot);
 await new StrengthService(a).save({st:5,striking:1});assert.equal(resolveStrengthDamage(a,'swing').effectiveST,45);
 assert.equal(JSON.stringify(shot),saved);assert.equal(shot.profile.damage.rules.meleeSnapshot.evidence.strength.effectiveST,41);
});
