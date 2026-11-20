import test from 'node:test';
import assert from 'node:assert/strict';
import { captureQaStructure, compareQaStructures, structuralValueDiff } from '../tools/foundry-qa-structural.mjs';
function data() {
 const source={ST:{value:8}},system={ST:{value:8}},flags={module:{nested:{value:1},ordered:['a','b']}};
 return { actors:[{id:'a',system,flags:{own:{ready:true}},toObject(sourceOnly){assert.equal(sourceOnly,true);return {system:source};}}],
   users:[{id:'u1',flags},{id:'u2',flags:{other:true}}],source };
}
const capture = d => captureQaStructure(d);
test('different object-key order compares by structural values',()=>assert.deepEqual(structuralValueDiff({a:1,b:{x:2,y:3}},{b:{y:3,x:2},a:1}),[]));
test('users match by ID, independent of collection enumeration',()=>{const d=data(),b=capture(d);d.users.reverse();assert.equal(compareQaStructures(b,capture(d)).equal,true);});
test('deep-cloned frozen baseline preserves nested before values and exact flag path',()=>{const d=data(),b=capture(d);d.users[0].flags.module.nested.value=2;const r=compareQaStructures(b,capture(d),{operation:'native Attack',at:'check-time'});assert.equal(b.users[0].flags.module.nested.value,1);assert.deepEqual(r.permanentUserFlagsDiff,[{objectType:'User',objectId:'u1',operation:'native Attack',at:'check-time',path:'flags.module.nested.value',beforeExists:true,afterExists:true,before:1,after:2}]);});
test('addition, deletion and null/undefined are distinct flag changes',()=>{const d=data(),b=capture(d);delete d.users[0].flags.module.nested;d.users[0].flags.added=null;const r=compareQaStructures(b,capture(d));assert.deepEqual(r.permanentUserFlagsDiff.map(d=>[d.path,d.beforeExists,d.afterExists]),[['flags.added',false,true],['flags.module.nested',true,false]]);assert.equal(JSON.parse(JSON.stringify(r)).permanentUserFlagsDiff[0].before.qaType,'undefined');});
test('Actor.system, source system and Actor.flags are independently compared',()=>{const d=data(),b=capture(d);d.actors[0].system.ST.value=9;d.source.ST.value=10;d.actors[0].flags.own.ready=false;const r=compareQaStructures(b,capture(d));assert.equal(r.actorSystemDiff[0].path,'system.ST.value');assert.equal(r.actorSystemDiff[0].after,9);assert.equal(r.actorSourceSystemDiff[0].path,'sourceSystem.ST.value');assert.equal(r.actorSourceSystemDiff[0].after,10);assert.equal(r.actorFlagsDiff[0].path,'flags.own.ready');assert.equal(r.permanentUserFlagsDiff.length,0);});
test('semantic array order and sparse lengths are preserved',()=>{const d=data(),b=capture(d);d.users[0].flags.module.ordered.reverse();const r=compareQaStructures(b,capture(d));assert.deepEqual(r.permanentUserFlagsDiff.map(d=>d.path),['flags.module.ordered[0]','flags.module.ordered[1]']);assert.equal(structuralValueDiff(Array(1),Array(2),'list')[0].path,'list.length');});
test('missing objects and duplicate IDs cannot silently pass',()=>{const d=data(),b=capture(d);d.users.pop();assert.equal(compareQaStructures(b,capture(d)).permanentUserFlagsDiff[0].objectId,'u2');d.users.push(d.users[0]);assert.throws(()=>capture(d),/duplicate/);});
test('independent identical captures produce all four required empty diffs',()=>{const d=data(),r=compareQaStructures(capture(d),capture(d));assert.equal(r.equal,true);for(const field of ['actorSystemDiff','actorSourceSystemDiff','actorFlagsDiff','permanentUserFlagsDiff'])assert.deepEqual(r[field],[]);});
