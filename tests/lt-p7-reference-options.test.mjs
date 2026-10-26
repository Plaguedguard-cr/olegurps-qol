import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibility} from './helpers/lt-p7-context.mjs';
const check=(mode,id)=>compatibility.checkCompatibility(mode,id,{book:'lt',kind:'projectile-option'});
test('LT88-89 Chinese shot modes do not inherit Chain/Grape/Heated eligibility from a broad cannon projectile class',()=>{
 for(const mode of ['WXLhR6qAupk40x1vV','WFiGuhETQ5MGheGwO'])for(const id of ['chain_shot','grapeshot','heated_shot'])assert.notEqual(check(mode,id).status,'compatible');
});
test('LT90-95 reference powder selection retains each individual published powder; unknown or replacement powder has no invented ballistic permission',()=>{
 assert.equal(check('WeCQz_2guzg8JWBca','serpentine_powder').status,'compatible');
 assert.equal(check('WeCQz_2guzg8JWBca','corned_powder').status,'undetermined');
 for(const id of ['corned_powder','serpentine_powder'])assert.equal(check('WXLhR6qAupk40x1vV',id).status,'undetermined');
});
test('legacy LT labels never ask for GM approval; uncertain alternate crossbow heads stay uncertain for source reasons',()=>{
 for(const [mode,id] of [['WxBwICnOg7tP-Gqfq','crossbow_alternate_tip'],['WqUeIOkvQIgCeKWou','panjagan_10'],['Wt63kR2Ebkr9chL4b','sling_harsh_realism']]){
  const r=check(mode,id);assert.equal(r.status,'undetermined');assert.doesNotMatch(r.record.status??'',/GM/);assert.doesNotMatch(r.record.notes_ru??'',/GM/);assert.ok(r.reasons.every(s=>!/GM/.test(s.message)));
 }
});
