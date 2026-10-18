import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,escapePayload,catalogs} from './helpers/ut-ammunition-fixture.mjs';
import {magazineFill} from '../scripts/tools/ammo-inventory.js';
import {paintBatteryHTML,PAINT_BATTERY_CSS,PAINT_CARBINE_MODE} from '../scripts/tools/ut-paint-power.js';
import {StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {viewportPosition,installViewportBounds,releaseViewportBounds} from '../scripts/tools/application-viewport.js';
import {WeaponAssistantApp,changedAmmunitionCards} from '../scripts/tools/weapon-assistant-app.js';
import {openAmmoManager} from '../scripts/tools/ammo.js';
import {verifyAmmoManagerViewport} from './helpers/ammo-manager-browser-assertions.mjs';

for (const [capacity,charge,segments] of [[500,500,10],[500,250,5],[500,50,1],[500,1,1],[500,0,0],
  [1000,1000,10],[1000,500,5],[1000,50,1],[1000,0,0]]) {
  test(`battery ${charge}/${capacity} shares the magazine scale, ten segments and exact accessible value`,()=>{
    const weapon={id:'paint',standaloneModeId:PAINT_CARBINE_MODE,
      paintBattery:{type:'B',capacity,charge,...(capacity===1000?{nonRechargeable:true}:{})}};
    const before=structuredClone(weapon),html=paintBatteryHTML(weapon,true,escapePayload);
    assert.ok(html.includes(`--gam-mag-hue:${magazineFill(charge,capacity).hue}`));
    assert.equal((html.match(/segment filled/g)??[]).length,segments);
    assert.equal((html.match(/gam-battery-segment /g)??[]).length,10);
    assert.ok(html.includes(`${charge}/${capacity}`));assert.match(html,/aria-pressed="true"/);
    assert.match(html,/data-ammo-action="select-battery"/);assert.deepEqual(weapon,before);
    assert.match(PAINT_BATTERY_CSS,/hsl\(var\(--gam-mag-hue, 0\) 78% 43%\)/);
    assert.match(PAINT_BATTERY_CSS,/width:14px; height:32px/);
  });
}

for (const height of [600,768,900]) test(`viewport ${height} bounds old offscreen positions and oversized manual windows`,()=>{
  const next=viewportPosition({left:1800,top:1200,width:900,height:1100},{width:900,height:1100},800,height);
  assert.deepEqual(next,{left:8,top:8,width:784,height:height-16});
  assert.deepEqual(viewportPosition({left:-400,top:-200,width:500,height:300},{width:500,height:300},800,height),{left:8,top:8});
  assert.deepEqual(viewportPosition({left:90,top:80,width:500,height:300},{width:500,height:300},800,height),{});
  const auto=viewportPosition({left:90,top:height-100,width:500,height:height-16},{width:500,height:'auto'},800,height);
  assert.deepEqual(auto,{top:8}); // Keep automatic height; do not freeze it to a number.
});

test('viewport observers and resize/close listeners install once and are released on close',()=>{
  const previous={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver,MutationObserver:globalThis.MutationObserver,
    add:globalThis.addEventListener,remove:globalThis.removeEventListener,width:globalThis.innerWidth,height:globalThis.innerHeight};
  let observers=0,disconnects=0,resizeListeners=0,callback;
  globalThis.document={createElement:()=>({})};globalThis.innerWidth=800;globalThis.innerHeight=600;
  globalThis.ResizeObserver=class {constructor(fn){observers++;callback=fn;}observe(){}disconnect(){disconnects++;}};
  globalThis.MutationObserver=class {observe(){}disconnect(){disconnects++;}};
  globalThis.addEventListener=()=>{resizeListeners++;};globalThis.removeEventListener=()=>{resizeListeners--;};
  const app=new EventTarget();Object.assign(app,{rendered:true,position:{left:90,top:80,width:500,height:300},
    element:{isConnected:true,classList:{add(){}},prepend(){},getBoundingClientRect:()=>({left:90,top:80,width:500,height:300})},
    setPosition:()=>assert.fail('valid position must stay unchanged')});
  try {
    installViewportBounds(app);installViewportBounds(app);callback();assert.equal(observers,1);assert.equal(resizeListeners,1);
    app.rendered=false;callback(); // Closing transitions cannot trigger repositioning.
    app.dispatchEvent(new Event('close'));releaseViewportBounds(app);assert.equal(resizeListeners,0);assert.equal(disconnects,2);
  } finally {Object.assign(globalThis,{document:previous.document,ResizeObserver:previous.ResizeObserver,MutationObserver:previous.MutationObserver,
    addEventListener:previous.add,removeEventListener:previous.remove,innerWidth:previous.width,innerHeight:previous.height});}
});

test('browser geometry checks detect a clipped footer even when the outer window fits',()=>{
  const rectangle=(left,top,right,bottom)=>({left,top,right,bottom});
  let footer=rectangle(40,500,740,550);
  const root={getBoundingClientRect:()=>rectangle(20,20,760,580),querySelector:selector=>
    selector==='.form-footer'?{getBoundingClientRect:()=>footer}:
    selector==='.dialog-content'?{clientHeight:400,scrollHeight:1200}:null};
  assert.ok(verifyAmmoManagerViewport(root,{width:800,height:600}).length>=3);
  footer=rectangle(40,900,740,950);
  assert.throws(()=>verifyAmmoManagerViewport(root,{width:800,height:600}),/form-footer inside window/);
});

test('single definition lookup copies only its record, stays fresh and never exposes mutable Actor flags',()=>{
  let unrelatedReads=0,reads=0;
  const own={id:'own',name:'original',modes:[]};
  const others=Array.from({length:23},(_,i)=>({id:'other-'+i,get modes(){unrelatedReads++;return [];}}));
  const flags={version:1,weapons:[own,...others]},actor={getFlag:()=>{reads++;return flags;}};
  const service=new StandaloneWeaponService(actor,catalogs),first=service.get('own');
  assert.equal(first.name,'original');assert.equal(unrelatedReads,0);assert.equal(reads,1);
  first.name='local';assert.equal(own.name,'original');own.name='updated';assert.equal(service.get('own').name,'updated');
  assert.equal(service.get('absent'),null);assert.equal(unrelatedReads,0);assert.equal(service.list().length,24);
});

test('ammunition-only Actor updates identify changed cards; skills, definitions, TL and structure invalidate the full model',()=>{
  const before={weapons:[{id:'a',magazines:[8,0]},{id:'b',magazines:[3]}],chatSettings:{mode:'self'}};
  const next=structuredClone(before);next.weapons[0].magazines=[7,0];
  const changes={_id:'actor',_stats:{modifiedTime:2},flags:{world:{gurpsAmmoManager:{weapons:next.weapons}}}};
  assert.deepEqual(changedAmmunitionCards(before,next,changes),['a']);assert.deepEqual(changedAmmunitionCards(next,next,changes),[]);
  assert.equal(changedAmmunitionCards(before,next,{}),null);
  for(const other of [{system:{skills:{}}},{flags:{'olegurps-qol':{standaloneWeapons:{}}}},
    {ownership:{default:0}},{flags:{world:{campaignTL:9}}}])assert.equal(changedAmmunitionCards(before,next,other),null);
  assert.equal(changedAmmunitionCards(before,{...next,weapons:next.weapons.toReversed()},changes),null);
  assert.equal(changedAmmunitionCards(before,{...next,chatSettings:{mode:'all'}},changes),null);
});

test('manager battery selection is read-only, repeated selection is a no-op, and a card build targets its own definition',async()=>{
  const fx=await fixture(PAINT_CARBINE_MODE),original=WeaponAssistantApp.prototype.render;
  let app;WeaponAssistantApp.prototype.render=async function(){app=this;this.element={addEventListener(){}};return this;};
  foundry.applications.api.DialogV2={};
  globalThis.GURPS={executeOTF(){},ModifierBucket:{modifierStack:{modifierList:[]}}};globalThis.Hooks={on:()=>1,off(){}};
  globalThis.canvas={scene:{id:crypto.randomUUID()},tokens:{controlled:[{id:crypto.randomUUID(),actor:fx.actor}]}};
  try {
    await openAmmoManager();const before=JSON.stringify(fx.state()),writes=fx.writes.length;
    const first=await app.handleAction({action:'select-battery',weaponId:fx.carrier.id,app});
    assert.equal(first.changed,true);assert.deepEqual(first.weaponIds,[fx.carrier.id]);
    assert.equal((await app.handleAction({action:'select-battery',weaponId:fx.carrier.id,app})).changed,false);
    const get=StandaloneWeaponService.prototype.get,ids=[];
    StandaloneWeaponService.prototype.get=function(id){ids.push(id);return get.call(this,id);};
    let html;try {html=app.buildWeaponCards(app.managerState,[fx.carrier.id]);} finally {StandaloneWeaponService.prototype.get=get;}
    assert.equal((html.match(/data-weapon-card=/g)??[]).length,1);assert.ok(ids.length>0);assert.ok(ids.every(id=>id===fx.record.id));
    assert.ok(html.indexOf('gam-battery-icon')<html.indexOf('class="gam-magazines"'));
    assert.equal(JSON.stringify(fx.state()),before);assert.equal(fx.writes.length,writes);
  } finally {WeaponAssistantApp.prototype.render=original;}
});
