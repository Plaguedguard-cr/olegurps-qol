import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFamilyTests} from './helpers/exotic-beam-tests.mjs';
import {configureExoticDamageApplication,updateExoticScreen} from '../scripts/tools/exotic-beam-damage.js';
sourceFamilyTests('graviton');
test('Graviton: native ignore-DR sentinel, source screen /100 independent of ordinary DR/hardened',()=>{
 const calc={_calculators:[{}],effectiveVulnerabilityMultiple:1,pointsToApply:7,DR:99999,isHardenedDR:true},app={actor:{isOwner:true},_calculator:calc,submitDirectApply(){},resolveInjury(){}};
 configureExoticDamageApplication(app,{family:'graviton',component:'kinetic'},{game:{user:{isGM:false}}});assert.equal(calc.effectiveDR,0);
 assert.equal(updateExoticScreen(app,{screenDR:2000}),20);calc.DR=999999;calc.useArmorDivisor=false;assert.equal(calc.effectiveDR,20);assert.throws(()=>updateExoticScreen(app,{screenDR:-1}));assert.equal(calc.effectiveDR,20);
 assert.equal(updateExoticScreen(app,{screenDR:101}),1);
});
