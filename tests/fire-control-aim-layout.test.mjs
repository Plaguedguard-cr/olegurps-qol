import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFireControlAimLayout} from './helpers/fire-control-aim-browser-assertions.mjs';

function fixture(columns=2) {
  const element=(left,top,width,height)=>({clientWidth:width,scrollWidth:width,children:[],
    getBoundingClientRect:()=>({left,top,width,height,right:left+width,bottom:top+height})});
  const root=element(0,0,columns===2?620:460,800),fields=element(20,100,columns===2?580:420,300);
  const width=columns===2?280:420;
  const shots=element(20,100,width,34),modifier=element(columns===2?320:20,columns===2?100:142,width,34),
    laser=element(20,columns===2?142:184,width,34),aim=element(columns===2?320:20,columns===2?142:226,width,34);
  const ar=aim.getBoundingClientRect();
  aim.children=[element(ar.left,ar.top,65,34),element(ar.left+72,ar.top,52,34),element(ar.left+131,ar.top,40,34),element(ar.left+178,ar.top,20,34)];
  fields.children=[shots,modifier,laser,aim];
  const input=parent=>({closest:()=>parent});
  fields.querySelector=selector=>({'[name="shots"]':input(shots),'[name="manualModifier"]':input(modifier),
    '[name="laserSight"]':input(laser),'.gam-fire-aim':aim})[selector]??null;
  root.querySelector=selector=>selector==='.gam-fire-fields'?fields:null;
  root.ownerDocument={defaultView:{getComputedStyle:()=>({gridTemplateColumns:columns===2?'280px 280px':'420px'})}};
  return {root,fields,shots,modifier,laser,aim,element};
}

test('browser contract accepts Aim in row two right and preserves both first-row fields',()=>{
  const {root}=fixture(),result=verifyFireControlAimLayout(root,{expectedWidth:620,expectedColumns:2});
  assert.equal(result.columns,2);assert.ok(result.checks.includes('Aim second row opposite laser'));
});
test('browser contract accepts a narrow single-column layout without overlap',()=>{
  const {root}=fixture(1);assert.equal(verifyFireControlAimLayout(root,{expectedWidth:460,expectedColumns:1}).columns,1);
});
test('browser contract rejects the original third-row full-width Aim regression',()=>{
  const fx=fixture();fx.aim.getBoundingClientRect=fx.element(20,184,580,34).getBoundingClientRect;
  assert.throws(()=>verifyFireControlAimLayout(fx.root),/Aim second row opposite laser/);
});
test('browser contract rejects an Aim child clipped outside its field',()=>{
  const fx=fixture();fx.aim.children[3]=fx.element(610,142,40,34);
  assert.throws(()=>verifyFireControlAimLayout(fx.root),/Aim part 3 inside field/);
});
test('browser contract rejects moved first-row controls and horizontal overflow',()=>{
  const fx=fixture();fx.fields.children=[fx.modifier,fx.shots,fx.laser,fx.aim];
  assert.throws(()=>verifyFireControlAimLayout(fx.root),/original field order/);
  fx.fields.children=[fx.shots,fx.modifier,fx.laser,fx.aim];fx.fields.scrollWidth+=20;
  assert.throws(()=>verifyFireControlAimLayout(fx.root),/no horizontal overflow/);
});
