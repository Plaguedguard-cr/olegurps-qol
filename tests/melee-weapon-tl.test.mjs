import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {StandaloneWeaponService,StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {resolveMeleeProfile,meleeProfileContext,MeleeProfileService} from '../scripts/tools/melee-profile-service.js';
import {prepareEffectiveMeleeDamage,freezeMeleeAttackProfile} from '../scripts/tools/melee-service.js';
import {meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(){const flags={};return {id:'m2-tl',isOwner:true,system:{ads:{},swing:'1d+2',thrust:'1d-1',attributes:{ST:{value:12,import:12},DX:{value:12}},
 skills:Object.fromEntries(['Broadsword','Knife','Axe/Mace','Two-Handed Sword'].map((name,i)=>[i,{name,level:16,points:4}]))},
 getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};}
async function weapon(a,eid='eVXaW9Nwr6YM5IlMJ'){
 const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(eid);const r=await new StandaloneWeaponService(a,catalogs).save(d);
 const attack=readStandaloneAttack(a,r.id,r.modes[0].modeId),m=/^(sw|thr)(.*?)\s+(\S+)$/.exec(attack.damage);
 return {...attack,damageAction:{type:'deriveddamage',derivedformula:m[1],formula:m[2],damagetype:m[3]}};
}
async function preview(a,raw,selection){const p=resolveMeleeProfile({actor:a,attack:raw,selection});return {p,
 prepared:p.readinessReason?null:await prepareEffectiveMeleeDamage({actor:a,attack:p})};}

test('TL3 and TL9 axes coexist; manufacture TL never follows actor or campaign TL',async()=>{
 const a=actor(),low=await weapon(a),high=await weapon(a),system=JSON.stringify(a.system),s=new MeleeProfileService(a);
 await s.save(low,{weaponTL:3,quality:'Fine'});await s.save(high,{weaponTL:9,quality:'Fine'});
 for(const campaign of [0,3,12,null]){
  await a.setFlag('olegurps-qol','campaignTL',campaign);a.system.traits={techlevel:campaign};
  const l=await preview(a,low,null),h=await preview(a,high,null);
  assert.equal(l.p.meleeProfile.quality.price,500);assert.equal(h.p.meleeProfile.quality.price,50);
  assert.equal(l.prepared.formula,h.prepared.formula);assert.equal(h.prepared.formula,'1d+5 cut');
  assert.equal(l.p.level,16);assert.equal(h.p.level,16);
 }
 delete a.system.traits;assert.equal(JSON.stringify(a.system),system);
 const rebuilt=readStandaloneAttack(a,high.standaloneRef.weaponId,high.standaloneRef.modeId);
 assert.equal(resolveMeleeProfile({actor:a,attack:rebuilt}).meleeProfile.quality.weaponTL,9);
 await s.save(high,{balance:'Balanced'});assert.equal(resolveMeleeProfile({actor:a,attack:high}).meleeProfile.quality.weaponTL,9);
 await s.reset(high);assert.equal(resolveMeleeProfile({actor:a,attack:high}).meleeProfile.quality.weaponTL,null);
 assert.equal(resolveMeleeProfile({actor:a,attack:low}).meleeProfile.quality.weaponTL,3);
});

test('B274 price boundaries and no automatic grade upgrade or Superfine',async()=>{
 const a=actor(),raw=await weapon(a);
 for(const tl of [0,3,6,7,8,9,12])for(const [q,low,high]of [['Cheap',20,10],['Good',50,20],['Fine',500,50]]){
  const r=await preview(a,raw,{weaponTL:tl,quality:q});assert.equal(r.p.meleeProfile.quality.price,tl<7?low:high);
  assert.equal(r.p.meleeProfile.quality.level,q);assert.equal(r.p.meleeProfile.quality.blade,'standard');
 }
 const untouched=await preview(a,raw,{weaponTL:9});assert.equal(untouched.p.meleeProfile.quality.level,'Good');assert.equal(untouched.p.meleeProfile.quality.price,20);
 const legacy=await preview(a,raw,{});assert.equal(legacy.p.meleeProfile.quality.weaponTL,null);assert.equal(legacy.p.meleeProfile.quality.price,50);
});

test('High TL uses MA216 percentages after material/edge modifications, not LT quality CF',async()=>{
 const a=actor(),raw=await weapon(a),sword=await weapon(a,'e140WNiazx7pJ3WTT');
 for(const [selection,price]of [[{quality:'Fine',balance:'Balanced'},250],[{quality:'Good',balance:'Balanced'},220],
  [{quality:'Cheap',balance:'Poorly Balanced'},10],[{quality:'Good',material:'plastic'},40],
  [{quality:'Fine',coating:'silver'},150],[{quality:'Good',material:'silver'},1000]]){
  const r=await preview(a,raw,{weaponTL:9,...selection});assert.equal(r.p.meleeProfile.quality.price,price);
  assert.equal(r.p.meleeProfile.quality.cost.regime,'high-tl-percentages');assert.equal(r.p.meleeProfile.quality.cost.sumCF,undefined);
 }
 assert.equal((await preview(a,sword,{weaponTL:7,quality:'Very Fine'})).p.meleeProfile.quality.price,2800);
 const mainGauche=await weapon(a,'ectaYaLbAkCo8RdZ-');
 assert.equal((await preview(a,mainGauche,{weaponTL:7,quality:'Very Fine'})).p.meleeProfile.quality.price,200);
 assert.equal((await preview(a,raw,{weaponTL:3,quality:'Very Fine'})).p.meleeProfile.quality.price,2500);
 for(const item of [raw,await weapon(a,'e4Cqh4R-bWl7CS7dQ')])assert.ok((await preview(a,item,{weaponTL:9,quality:'Very Fine'})).p.readinessReason);
 const html=meleeProfileEditorHTML(meleeProfileContext(a,raw),{weaponTL:9,quality:'Very Fine'},String,a,raw);
 assert.match(html,/value="Very Fine" selected/);assert.match(html,/Very Fine – недоступно/);
});

test('Fine + Superfine has total +2 cut/imp and AD2 at normal cost x6, never +3',async()=>{
 const a=actor(),axe=await weapon(a),sword=await weapon(a,'e140WNiazx7pJ3WTT');
 for(const q of ['Fine','Good','Cheap']){
  const r=await preview(a,axe,{weaponTL:9,quality:q,blade:'superfine'});
  assert.equal(r.prepared.formula,'1d+6(2) cut');assert.equal(r.p.meleeProfile.quality.damageBonus,2);
  assert.equal(r.p.meleeProfile.quality.price,{Fine:300,Good:120,Cheap:60}[q]);
 }
 const thrust={...sword,standaloneRef:{...sword.standaloneRef,modeId:'wkePG9X2bhubKRddv'},damage:'thr+2 imp',sourceDamage:'thr+2 imp',damageAction:{type:'deriveddamage',derivedformula:'thr',formula:'+2',damagetype:'imp'}};
 const thrustResult=await preview(a,thrust,{weaponTL:9,quality:'Fine',blade:'superfine'});
 assert.ok(thrustResult.prepared,thrustResult.p.readinessReason??JSON.stringify(thrustResult.p));
 assert.equal(thrustResult.prepared.formula,'1d+3(2) imp');
 const linked={...axe,damageAction:{...axe.damageAction,next:{type:'damage',formula:'1d',damagetype:'burn'}}};
 assert.equal((await preview(a,linked,{weaponTL:9,quality:'Fine',blade:'superfine'})).prepared.formula,'1d+6(2) cut, 1d burn');
 for(const selection of [{weaponTL:8,blade:'superfine'},{weaponTL:9,blade:'superfine',material:'bone'},
  {weaponTL:9,blade:'superfine',quality:'Very Fine'},{weaponTL:9,blade:'superfine',coating:'silver'}]){
  const r=await preview(a,sword,selection);assert.ok(r.p.readinessReason);
  const before=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles'));
  await assert.rejects(new MeleeProfileService(a).save(sword,selection));assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);
 }
});

test('GGA already includes Fine/Superfine: explicit original blade removes exactly its old effect',async()=>{
 const a=actor(),raw=await weapon(a),context=meleeProfileContext(a,raw);
 const imported={...raw,standaloneRef:undefined,key:'imported',catalogBinding:{modeId:context.source.modeId},damage:'sw+3 cut',sourceDamage:'sw+3 cut',
  damageAction:{type:'deriveddamage',derivedformula:'sw',formula:'+3',damagetype:'cut'}};
 const baseline={weaponTL:9,baselineQuality:'Fine',baselineMaterial:'steel',baselineBalance:'Normal',baselineBlade:'standard',quality:'Fine',material:'steel'};
 const plain=await preview(a,imported,baseline);assert.ok(plain.prepared,plain.p.readinessReason??JSON.stringify(plain.p));assert.equal(plain.prepared.formula,'1d+5 cut');assert.equal(plain.p.meleeProfile.quality.price,50);
 const sf=await preview(a,imported,{...baseline,blade:'superfine'});assert.equal(sf.prepared.formula,'1d+6(2) cut');
 const already={...imported,damage:'sw+4(2) cut',sourceDamage:'sw+4(2) cut',damageAction:{type:'deriveddamage',derivedformula:'sw',formula:'+4(2)',damagetype:'cut'}};
 const included={...baseline,baselineBlade:'superfine'};
 assert.equal((await preview(a,already,included)).prepared.formula,'1d+6(2) cut');
 assert.equal((await preview(a,already,{...included,blade:'standard'})).prepared.formula,'1d+5 cut');
 assert.ok((await preview(a,imported,{weaponTL:9,blade:'superfine'})).p.readinessReason);
 assert.equal((await preview(a,imported,{weaponTL:9})).p.meleeProfile.quality.price,null);
});

test('TL validation, draft read only, saved unknown fields, manual Damage and immutable snapshot',async()=>{
 const a=actor(),raw=await weapon(a),s=new MeleeProfileService(a),before=JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles'));
 for(const tl of [-1,2.5,'foo','3e1']){assert.ok((await preview(a,raw,{weaponTL:tl})).p.readinessReason);await assert.rejects(s.save(raw,{weaponTL:tl}));}
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);
 const original=await preview(a,raw,{weaponTL:3,quality:'Fine'}),frozen=freezeMeleeAttackProfile({actor:a,attack:original.p,preparedDamage:original.prepared}),snapshot=JSON.stringify(frozen);
 const html=meleeProfileEditorHTML(meleeProfileContext(a,raw),{weaponTL:9,quality:'Fine',blade:'superfine'},String,a,raw);
 assert.match(html,/ТУ оружия/);assert.match(html,/Цена: \$300/);assert.match(html,/консервативное решение/);
 assert.match(html,/Серебрение \(\+200%; MA216\)/);
 const lowHTML=meleeProfileEditorHTML(meleeProfileContext(a,raw),{weaponTL:3,quality:'Fine'},String,a,raw);
 assert.doesNotMatch(lowHTML,/value="superfine"/);
 const oldGame=globalThis.game,localized=[];
 try{for(const lang of ['ru','en']){
  globalThis.game={...oldGame,i18n:{lang}};
  localized.push(meleeProfileEditorHTML(meleeProfileContext(a,raw),{weaponTL:9,quality:'Fine',blade:'superfine'},String,a,raw));
 }}finally{if(oldGame===undefined)delete globalThis.game;else globalThis.game=oldGame;}
 assert.equal(localized[0],localized[1]);assert.match(localized[0],/ТУ оружия/);
 assert.equal(JSON.stringify(a.getFlag('olegurps-qol','meleeProfiles')),before);
 assert.doesNotThrow(()=>meleeProfileEditorHTML(meleeProfileContext(a,raw),{weaponTL:-1},String,a,raw));
 await s.save(raw,{weaponTL:9,quality:'Fine',blade:'superfine'});assert.equal(JSON.stringify(frozen),snapshot);
 assert.equal(frozen.damage.formula,'1d+5 cut');
 const manual={...raw,damage:'1d burn',hasMeleeDamageOverride:true,damageAction:{type:'damage',formula:'1d',damagetype:'burn'}};
 assert.equal((await preview(a,manual,{weaponTL:9})).prepared.formula,'1d burn');
 assert.ok((await preview(a,manual,{weaponTL:9,blade:'superfine'})).p.readinessReason);
 const foreign={...raw,damage:'1d burn',sourceDamage:'1d burn',damageAction:{type:'damage',formula:'1d',damagetype:'burn'}};
 assert.match((await preview(a,foreign,{weaponTL:9,blade:'superfine'})).p.readinessReason,/тип Damage/);
 a.isOwner=false;await assert.rejects(s.save(raw,{weaponTL:3}),/прав/);
});
