import test from 'node:test';
import assert from 'node:assert/strict';
import {performActionWithoutGgaConfirmation as bypass} from '../scripts/tools/gga-roll-confirmation.js';

const gate = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };
function fixture() {
  const shown=[],rolled=[],modifiers=[];
  const original=function(options,...args){shown.push({id:options.id,receiver:this,args});return Promise.resolve('shown:'+options.id);};
  const dialog={wait:original},runtime={foundry:{applications:{api:{DialogV2:dialog}}},game:{i18n:{localize:()=> 'Confirm'}}};
  const options=(id,actor=id)=>({id,window:{title:'Confirm'},buttons:[{action:'roll',callback:()=>{rolled.push({id,actor});modifiers.push({id,bucket:2,tagged:-1,action:3,total:4});return 'rolled:'+id;}}]});
  return {shown,rolled,modifiers,original,dialog,runtime,options};
}
function restored(f, ids) {
  assert.equal(f.dialog.wait,f.original);
  assert.deepEqual(f.rolled.map(r=>r.id).sort(),[...ids].sort());
  assert.deepEqual(f.modifiers.map(r=>r.id).sort(),[...ids].sort());
  assert.ok(f.modifiers.every(r=>r.bucket===2&&r.tagged===-1&&r.action===3&&r.total===4));
}
for(const order of [['A','B'],['B','A']]) for(const rejected of [null,'A','B']) {
  test(`overlap: finish ${order.join(' then ')}; rejection ${rejected??'none'}`,async()=>{
    const f=fixture(),g={A:gate(),B:gate()},out={};
    for(const id of ['A','B']) {
      const pending=bypass(async()=>{await f.dialog.wait(f.options(id,'Actor-'+id));return g[id].promise;},f.runtime);
      out[id]=pending.then(value=>({value}),error=>({error:error.message}));
      if(id==='A')f.wrapper=f.dialog.wait;else assert.equal(f.dialog.wait,f.wrapper,'one wrapper for both calls');
    }
    assert.equal(await f.dialog.wait({id:'other',window:{title:'Other'}}),'shown:other');
    for(const [i,id] of order.entries()) {
      id===rejected?g[id].reject(Error('failure '+id)):g[id].resolve(id);
      assert.deepEqual(await out[id],id===rejected?{error:'failure '+id}:{value:id});
      assert.equal(f.dialog.wait,i===0?f.wrapper:f.original);
    }
    restored(f,['A','B']);assert.deepEqual(f.shown.map(r=>r.id),['other']);
    assert.deepEqual(f.rolled.map(r=>r.actor),['Actor-A','Actor-B']);
    await bypass(()=>f.dialog.wait(f.options('retry')),f.runtime);restored(f,['A','B','retry']);
  });
}
test('cancel one overlapping call before its dialog; surviving call keeps its permit',async()=>{
  const f=fixture(),cancel=gate(),finish=gate();
  const a=bypass(()=>cancel.promise,f.runtime),wrapper=f.dialog.wait;
  const b=bypass(async()=>{await finish.promise;return f.dialog.wait(f.options('B'));},f.runtime);
  cancel.resolve(false);assert.equal(await a,false);assert.equal(f.dialog.wait,wrapper);
  finish.resolve();assert.equal(await b,'rolled:B');restored(f,['B']);assert.equal(f.shown.length,0);
});
test('sequential calls and retry after synchronous throw and rejected roll callback',async()=>{
  const f=fixture();
  for(const id of ['A','B']) {assert.equal(await bypass(()=>f.dialog.wait(f.options(id)),f.runtime),'rolled:'+id);restored(f,id==='A'?['A']:['A','B']);}
  await assert.rejects(bypass(()=>{throw Error('sync');},f.runtime),/sync/);restored(f,['A','B']);
  for(const mode of ['throw','reject']) {
    const options=f.options(mode);options.buttons[0].callback=()=>{if(mode==='throw')throw Error(mode);return Promise.reject(Error(mode));};
    await assert.rejects(bypass(()=>f.dialog.wait(options),f.runtime),new RegExp(mode));restored(f,['A','B']);
  }
  await bypass(()=>f.dialog.wait(f.options('retry')),f.runtime);restored(f,['A','B','retry']);
});
test('one permit per call; unrelated dialogs preserve receiver and arguments during and after roll',async()=>{
  const f=fixture(),receiver={foreign:true},extra={render:true};
  await bypass(async()=>{
    assert.equal(await f.dialog.wait.call(receiver,{id:'different',window:{title:'Other'}},extra),'shown:different');
    await f.dialog.wait(f.options('owned'));
    assert.equal(await f.dialog.wait(f.options('second')),'shown:second');
  },f.runtime);
  assert.equal(await f.dialog.wait(f.options('after')),'shown:after');
  restored(f,['owned']);assert.deepEqual(f.shown.map(r=>r.id),['different','second','after']);
  assert.equal(f.shown[0].receiver,receiver);assert.deepEqual(f.shown[0].args,[extra]);
});
test('KNOWN LIMITATION B: concurrent foreign identical-title dialog can steal the permit; no isolation claim',async()=>{
  const f=fixture(),ready=gate();
  const a=bypass(async()=>{await ready.promise;return f.dialog.wait(f.options('owned'));},f.runtime);
  assert.equal(await f.dialog.wait(f.options('foreign','Foreign Actor')),'rolled:foreign');
  ready.resolve();assert.equal(await a,'shown:owned');restored(f,['foreign']);
  assert.deepEqual(f.shown.map(r=>r.id),['owned']);
});
for (const order of [['A','B'],['B','A']]) {
  test(`KNOWN CORRELATION LIMITATION: delayed own dialogs arrive ${order.join(' then ')}; restoration still exact`,async()=>{
    const f=fixture(),g={A:gate(),B:gate()},pending={};
    for(const id of ['A','B'])pending[id]=bypass(async()=>{await g[id].promise;return f.dialog.wait(f.options(id));},f.runtime);
    const wrapper=f.dialog.wait;
    for(const [index,id] of order.entries()) {
      g[id].resolve();await pending[id];
      assert.equal(f.dialog.wait,index===0?wrapper:f.original);
    }
    const expectedRolled=order[0]==='A'?['A']:['A','B'];
    restored(f,expectedRolled);
    assert.deepEqual(f.shown.map(r=>r.id),order[0]==='A'?['B']:[]);
  });
}
test('separate client DialogV2 objects do not share permits or restoration state',async()=>{
  const gm=fixture(),owner=fixture(),finish=gate();
  const a=bypass(async()=>{await gm.dialog.wait(gm.options('GM'));await finish.promise;},gm.runtime);
  await bypass(()=>owner.dialog.wait(owner.options('OWNER')),owner.runtime);
  restored(owner,['OWNER']);assert.notEqual(gm.dialog.wait,gm.original);
  finish.resolve();await a;restored(gm,['GM']);
});
test('synchronously nested entry does not install another wrapper',async()=>{
  const f=fixture();await bypass(async()=>{
    const wrapper=f.dialog.wait;
    await bypass(()=>{assert.equal(f.dialog.wait,wrapper);return f.dialog.wait(f.options('inner'));},f.runtime);
    assert.equal(f.dialog.wait,wrapper);await f.dialog.wait(f.options('outer'));
  },f.runtime);restored(f,['inner','outer']);
});
test('later third-party replacement is preserved; retained inactive dispatcher delegates without permits',async()=>{
  const f=fixture();let retained;
  const replacement=async()=> 'third-party';
  await bypass(()=>{retained=f.dialog.wait;f.dialog.wait=replacement;},f.runtime);
  assert.equal(f.dialog.wait,replacement);
  assert.equal(await retained(f.options('late')),'shown:late');assert.equal(f.rolled.length,0);
  assert.equal(await bypass(()=>f.dialog.wait(f.options('next')),f.runtime),'rolled:next');
  assert.equal(f.dialog.wait,replacement);
});
test('missing DialogV2 delegates; localization failure leaves no installed interception',async()=>{
  assert.equal(await bypass(()=>42,{}),42);
  const f=fixture();f.runtime.game.i18n.localize=()=>{throw Error('localization');};
  await assert.rejects(bypass(()=>assert.fail('must not execute'),f.runtime),/localization/);restored(f,[]);
});
