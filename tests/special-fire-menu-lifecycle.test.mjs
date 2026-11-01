import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../scripts/tools/ammo.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('  async function openSpecialFireMenu('),source.indexOf('  function buildManagerCards('));
function fixture({delay=false,fail=false}={}){
 const instances=[],menus=new Map();let release;
 class App{
  constructor(config,options){Object.assign(this,{config,options,rendered:false,focus:0,renders:0});instances.push(this);}
  async render(){this.renders++;if(delay)await new Promise(resolve=>{release=resolve;});if(fail)throw Error('render failed');this.rendered=true;return this;}
  bringToFront(){assert.equal(this.rendered,true);this.focus++;}
  async close(){this.rendered=false;this.config.onClose();}
 }
 const context={OPEN_SPECIAL_FIRE_MENUS:menus,SPECIAL_FIRE_MENU_RENDERS:new WeakMap(),SpecialFireMenuApp:App,
  SprayingFireSessionService:class{async discardUnconfirmed(){}},specialFireRegistry:()=>[],canvas:{scene:{id:'scene'}},token:{id:'token'},actor:{}};
 const open=runInNewContext('('+body.trim()+')',context),state={weapons:[{id:'weapon'}]};
 return {instances,menus,open:()=>open(state,'weapon',{}),release:()=>release()};
}
test('ApplicationV2 menu first open, repeat, Cancel return, X and fresh reopen reuse one live window',async()=>{
 const f=fixture(),first=await f.open();assert.equal(first.renders,1);
 assert.equal(await f.open(),first);assert.equal(first.focus,1);assert.equal(first.renders,1);
 // Cancel in the child returns to the same still-open menu.
 assert.equal(await f.open(),first);assert.equal(f.instances.length,1);
 await first.close();assert.equal(f.menus.size,0);
 const next=await f.open();assert.notEqual(next,first);assert.equal(f.instances.length,2);
});
test('two commands during initial render share the instance and focus only after render completes',async()=>{
 const f=fixture({delay:true}),a=f.open();await new Promise(r=>setImmediate(r));const b=f.open();await new Promise(r=>setImmediate(r));
 assert.equal(f.instances.length,1);assert.equal(f.instances[0].focus,0);f.release();assert.equal(await a,await b);assert.equal(f.instances[0].renders,1);
});
test('failed render clears only its own entry and a new attempt is possible',async()=>{
 const f=fixture({fail:true});await assert.rejects(f.open(),/render failed/);assert.equal(f.menus.size,0);
 await assert.rejects(f.open(),/render failed/);assert.equal(f.instances.length,2);
});
test('reopening during the X close animation replaces the closing instance; its delayed callback preserves the new entry',async()=>{
 const f=fixture(),closing=await f.open();closing.rendered=false;
 const next=await f.open();assert.notEqual(next,closing);assert.equal(next.rendered,true);
 closing.config.onClose();assert.equal(f.menus.size,1);assert.equal(await f.open(),next);
});
test('replacement waits for core close to unregister the old id before rendering a new window',async()=>{
 const f=fixture(),closing=await f.open();let finish;
 closing.rendered=false;closing._specialFireClosePromise=new Promise(resolve=>{finish=()=>{closing.config.onClose();resolve();};});
 const pending=f.open();await new Promise(r=>setImmediate(r));assert.equal(f.instances.length,1);
 finish();const next=await pending;assert.notEqual(next,closing);assert.equal(next.rendered,true);assert.equal(f.menus.size,1);
});
test('all three special-fire ApplicationV2 focus branches use the supported v14 method',()=>{
 assert.doesNotMatch(source,/\.bringToTop\(/);assert.match(body,/open\.bringToFront\(\)/);
 for(const map of ['OPEN_SUPPRESSION_FIRE','OPEN_SPRAYING_FIRE'])assert.match(source.slice(source.indexOf('= '+map+'.get'),source.indexOf('= '+map+'.get')+220),/bringToFront\(\)/);
});
