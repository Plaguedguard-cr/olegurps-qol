import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExplosionPreferences, readExplosionPreferences, saveExplosionPreferences,
  readExplosionFormPreferences, openExplosionFragmentation } from '../scripts/tools/explosion-fragmentation.js';

function user(initial) {
  let saved = initial;
  const writes = [];
  return { writes, getFlag(scope,key) { assert.equal(scope,'olegurps-qol');assert.equal(key,'explosionFragmentation');return structuredClone(saved); },
    async setFlag(scope,key,value) { assert.equal(scope,'olegurps-qol');assert.equal(key,'explosionFragmentation');writes.push(structuredClone(value));saved=structuredClone(value); } };
}

test('explosion preferences default safely and retain raw inputs, empty fields and all switches', () => {
  assert.deepEqual(normalizeExplosionPreferences(null), {explosionDamage:'6d',fragmentDamage:'2d',distance:'1',sm:'0',posture:'standing',followUp:false,autoLocations:false});
  assert.deepEqual(normalizeExplosionPreferences({explosionDamage:'3к+2',fragmentDamage:'',distance:'12.5',sm:'-3',posture:'lying',followUp:true,autoLocations:true}),
    {explosionDamage:'3к+2',fragmentDamage:'',distance:'12.5',sm:'-3',posture:'lying',followUp:true,autoLocations:true});
  assert.equal(normalizeExplosionPreferences({posture:'foreign',distance:NaN}).posture,'standing');
  assert.equal(normalizeExplosionPreferences({distance:NaN}).distance,'1');
});

test('queued input snapshots stay personal and recover after a failed write', async () => {
  const a=user(),b=user();
  await Promise.all([saveExplosionPreferences({explosionDamage:'7d'},a),saveExplosionPreferences({explosionDamage:'8d',followUp:true},a),saveExplosionPreferences({explosionDamage:'4d'},b)]);
  assert.equal(readExplosionPreferences(a).explosionDamage,'8d');assert.equal(readExplosionPreferences(b).explosionDamage,'4d');
  assert.equal(readExplosionPreferences(a).followUp,true);assert.equal(readExplosionPreferences(b).followUp,false);
  const set=a.setFlag;a.setFlag=async()=>{throw Error('write failed')};
  await assert.rejects(saveExplosionPreferences({distance:'9'},a),/write failed/);
  a.setFlag=set;await saveExplosionPreferences({distance:'10'},a);assert.equal(readExplosionPreferences(a).distance,'10');
});

test('dialog restores escaped preferences and remembers edits without a roll or confirmation', async () => {
  const owner=user({explosionDamage:'9d',fragmentDamage:'2d+1',distance:'14.5',sm:'-2',posture:'kneeling',followUp:true,autoLocations:true});
  const fields=Object.fromEntries(Object.entries(readExplosionPreferences(owner)).map(([key,value])=>[key,typeof value==='boolean'?{checked:value}:{value}]));
  class HTMLElement { constructor(){this.listeners=new Map()} querySelector(selector){return fields[/name="(.*?)"/.exec(selector)?.[1]]} addEventListener(name,callback){this.listeners.set(name,callback)} }
  let dialog;
  class DialogV2 { constructor(options){this.options=options;this.element=new HTMLElement();dialog=this}async render(){return this} }
  globalThis.HTMLElement=HTMLElement;globalThis.foundry={applications:{api:{DialogV2}}};globalThis.game={user:owner};
  globalThis.Roll=class{constructor(){throw Error('Unexpected roll')}};
  await openExplosionFragmentation();assert.equal(owner.writes.length,0);
  assert.match(dialog.options.content,/name="explosionDamage" value="9d"/);
  assert.match(dialog.options.content,/value="kneeling" selected/);
  assert.match(dialog.options.content,/name="followUp" checked/);
  fields.explosionDamage.value='12d';fields.distance.value='';fields.followUp.checked=false;
  await dialog.element.listeners.get('input')();
  assert.deepEqual(readExplosionPreferences(owner),readExplosionFormPreferences(dialog.element));
  await openExplosionFragmentation();assert.match(dialog.options.content,/name="explosionDamage" value="12d"/);
  assert.match(dialog.options.content,/name="distance" value=""/);
  fields.fragmentDamage.value='" autofocus onfocus="x';await dialog.element.listeners.get('change')();
  await openExplosionFragmentation();assert.ok(dialog.options.content.includes('value="&quot; autofocus onfocus=&quot;x"'));
});
