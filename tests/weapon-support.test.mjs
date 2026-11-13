import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { WeaponStrengthResolver, createWeaponStrengthEvidence } from '../scripts/tools/weapon-strength-resolver.js';
import { rangedStrengthChannel } from '../scripts/tools/ranged-weapon-strength.js';
import { createShotSnapshot } from '../scripts/tools/attack-profile-resolver.js';
import { buildAttackModifierBreakdownHtml } from '../scripts/tools/prepared-gga-roll.js';

const catalogs = new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(
  await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
const resolver = new WeaponStrengthResolver({catalogs});
const ids={m60:'WhQTP2P4KY4yewyBD',m2:'WR0KjQaYwU2kPV2uB',pistol:'W1doZcasYO-1Xw3Lf',ak:'W27s4Lm8QlkKVKUPn'};
function fixture(kind='m60',extra={}) {
  const modeId=ids[kind], identity={actorId:'a',instanceId:'physical-one',modeId,equipmentId:catalogs.getEquipmentForMode(modeId).equipment_id};
  const proof={...identity,source:'explicit-programmatic-support-fixture; not a live state producer'};
  return {weaponIdentity:identity,actorStrength:{actorId:'a',kinds:{st:{supported:true,effective:8}}},category:kind==='pistol'?'pistol':'firearm',
    source:{book:'HT',page:kind==='m60'?135:137},provenance:{status:'CLEAN',evidence:{...proof,scope:'base-level'}},...extra};
}
function support(i,type,extra={}) {return {confirmed:true,confirmedType:type,evidence:{...i.weaponIdentity,source:'explicit-test-support'},
  installed:true,inUse:true,ready:true,posture:'prone',...extra};}
const run=i=>resolver.resolve(i);
for(const [name,kind,type,patch,required,desired,status] of [
  ['M60: ordinary rest','m60',null,{braced:true},12,-4,'UNSPECIFIED'],
  ['M60: bipod in use while prone','m60','bipod',{},8,0,'CONFIRMED'],
  ['M60: bipod only present','m60','bipod',{inUse:false},12,-4,'MANUAL'],
  ['M60: no posture proof','m60','bipod',{posture:null},12,-4,'MANUAL'],
  ['M60: no installation proof','m60','bipod',{installed:false},12,-4,'MANUAL'],
  ['M60: standing bipod does not prove ST reduction','m60','bipod',{posture:'standing'},12,-4,'MANUAL'],
  ['M2: M suffix alone','m2',null,{},21,-13,'UNSPECIFIED'],
  ['M2: working mount','m2','mounted',{},null,0,'CONFIRMED'],
  ['M2: detached mount','m2','mounted',{installed:false},21,-13,'MANUAL'],
  ['M2: mount not ready','m2','mounted',{ready:false},21,-13,'MANUAL'],
  ['pistol two hands','pistol','pistol-two-handed',{hands:2},7,0,'CONFIRMED'],
  ['rifle is not a pistol grip','ak','pistol-two-handed',{hands:2},9,-1,'MANUAL'],
  ['fanning excludes pistol grip','pistol','pistol-two-handed',{hands:2,fanning:true},8,0,'MANUAL'],
  ['thumbing excludes pistol grip','pistol','pistol-two-handed',{hands:2,thumbing:true},8,0,'MANUAL'],
  ['attached pistol stock','pistol','stock-attached',{},7,0,'CONFIRMED'],
  ['attached pistol stock rule is not generic rifle reduction','ak','stock-attached',{},9,-1,'MANUAL'],
  ['folded rifle stock','ak','stock-folded',{},11,-3,'CONFIRMED']
]) test(name,()=>{const i=fixture(kind);i.support=type?support(i,type,patch):patch;const r=run(i);
  assert.equal(r.requirement.effective,required);assert.equal(r.penalty.desired,desired);assert.equal(r.support.status,status);
  assert.equal(r.requirement.ignored,type==='mounted'&&status==='CONFIRMED');
  assert.equal(r.support.confirmedType,status==='CONFIRMED'?type:null);
});
test('+P precedes bipod once: published12 ->13 ->9; braced does not stack',()=>{
  const i=fixture();i.ammunition={variantId:'ht_plus_p'};i.support=support(i,'bipod',{braced:true});const r=run(i);
  assert.equal(r.requirement.published,12);assert.equal(r.requirement.transformation.after,'13B\u2020');
  assert.equal(r.requirement.transformation.passes,1);assert.equal(r.requirement.effective,9);assert.equal(r.penalty.delta,-1);
});
test('+P on working mount preserves published and transformed values without ST0',()=>{
  const i=fixture('m2');i.ammunition={variantId:'ht_plus_p'};i.support=support(i,'mounted');const r=run(i);
  assert.equal(r.requirement.published,21);assert.equal(r.requirement.transformation.after,'23M');
  assert.equal(r.requirement.effective,null);assert.equal(r.requirement.ignored,true);assert.equal(r.penalty.delta,0);
});
test('KNOWN_INCLUDED -2 on mount requires positive delta +2; UNKNOWN cannot refund it',()=>{
  const i=fixture('m2');i.support=support(i,'mounted');i.provenance={...i.provenance,status:'KNOWN_INCLUDED',knownIncludedPenalty:-2};
  const e=createWeaponStrengthEvidence(run(i));assert.equal(e.desiredPenalty,0);assert.equal(e.proposedDelta,2);assert.equal(rangedStrengthChannel(e).value,2);
  i.provenance={status:'UNKNOWN'};const u=createWeaponStrengthEvidence(run(i));assert.equal(u.proposedDelta,null);assert.equal(rangedStrengthChannel(u).value,0);
});
test('support evidence cannot cross actor, instance or selected mode',()=>{
  for(const field of ['actorId','instanceId','modeId']){const i=fixture();i.support=support(i,'bipod');i.support.evidence[field]='other';
    const r=run(i);assert.equal(r.requirement.effective,12);assert.equal(r.penalty.delta,-4);assert.equal(r.support.confirmedType,null);}
});
test('conflicting support selections never multiply coefficients',()=>{
  const i=fixture('pistol');i.support=support(i,['pistol-two-handed','stock-attached']);const r=run(i);
  assert.equal(r.support.status,'MANUAL');assert.equal(r.requirement.effective,null);assert.equal(r.penalty.delta,null);
});
test('R retains its own requirement; M-only remains nonnumeric',()=>{
  const i=fixture();for(const raw of ['9R','M']){i.override={modeId:i.weaponIdentity.modeId,instanceId:i.weaponIdentity.instanceId,st:raw};
    const r=run(i);assert.equal(r.requirement.effective,raw==='M'?null:9);assert.equal(r.requirement.ignored,false);
    assert.equal(r.penalty.delta,raw==='M'?null:-1);}
});
test('detached support evidence freezes conditions and contains no Foundry references',()=>{
  const i=fixture();i.support=support(i,'bipod');const encoded=JSON.stringify(i);
  const freeze=v=>{if(v&&typeof v==='object'){Object.freeze(v);Object.values(v).forEach(freeze);}return v;};freeze(i);
  const r=run(i),e=createWeaponStrengthEvidence(r),snapshot=createShotSnapshot({actorId:'a',weaponStrength:e,resource:{},ammunition:{},damage:{formula:'7d pi'}},{attackId:'support-history'});
  const saved=JSON.stringify(snapshot);r.support.observed.posture='standing';r.support.conditions.push('later');
  assert.equal(e.support.observed.posture,'prone');assert.equal(e.support.conditions.length,1);
  assert.equal(JSON.stringify(snapshot),saved);assert.equal(JSON.stringify(i),encoded);
});
test('support explanations stay inside the existing closed modifier details and are escaped',()=>{
  const html=buildAttackModifierBreakdownHtml([{label:'ST',value:-4}],'support <unconfirmed>');
  assert.match(html,/<details class="olegurps-attack-modifiers olegurps-chat-details">/);
  assert.match(html,/<p>support &lt;unconfirmed&gt;<\/p><\/div><\/details>$/);
  assert.doesNotMatch(html,/<details[^>]+\sopen(?:\s|>)/);
  assert.equal((html.match(/ST \(-4\)/g)??[]).length,1);
});
