import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {LT_BLADE_PROFILES} from '../scripts/lt-blade-source.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack} from '../scripts/tools/standalone-attack-service.js';
import {meleeProfileContext,resolveMeleeProfile,MeleeProfileService} from '../scripts/tools/melee-profile-service.js';
import {meleeProfileEditorHTML,meleeEditorCompatibility,selectMeleeEditorProfile} from '../scripts/tools/melee-profile-editor.js';
import {meleeCombatControls} from '../scripts/tools/melee-combat-controls.js';
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();globalThis.OleGURPSQOL={catalogs};
function actor(){const flags={};const names=[...new Set(Object.values(LT_BLADE_PROFILES).flatMap(p=>p.primarySkills)), 'Axe/Mace','Two-Handed Axe/Mace'];
 return {id:'compact',isOwner:true,system:{swing:'3d+2',thrust:'2d-1',ads:{},attributes:{ST:{value:20,import:20},DX:{value:12}},skills:Object.fromEntries(names.map((name,i)=>[i,{name,level:16,points:4}]))},
 getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};}
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;');

test('compact editor removes only the primary-skill selector and preserves the panel choice and advanced modifiers',async()=>{
 const a=actor(),raw=await weapon(a,'w0djXNfWD-9ebEkWu');
 await new MeleeProfileService(a).save(raw,{skill:'Broadsword',quality:'Fine',weaponTL:9,blade:'superfine',material:'steel'});
 const c=meleeProfileContext(a,raw),before=JSON.stringify(a.system),html=meleeProfileEditorHTML(c,c.saved,esc,a,raw);
 assert.doesNotMatch(html,/data-melee-profile="skill"/);
 for(const field of ['weaponTL','quality','balance','material','blade','coating','modeId','grip'])assert.ok(html.includes('data-melee-profile="'+field+'"'));
 assert.match(html,/<summary>Дополнительно – Superfine Blade<\/summary>/);
 const changed=selectMeleeEditorProfile(c,c.saved,'quality','Good',a,raw);
 assert.equal(changed.skill,'Broadsword');assert.equal(c.saved.skill,'Broadsword');assert.equal(meleeCombatControls(a,raw).skill,'Broadsword');
 assert.equal(JSON.stringify(a.system),before);
});
test('Axe uses its two actual LT65/LT70 rows and updates grip on explicit mode changes, with no cross-mode grip aliases',async()=>{
 const a=actor(),raw=await weapon(a,'wseA0_41AcVRwc1Lf'),c=meleeProfileContext(a,raw),matrix=meleeEditorCompatibility(c,{},a,raw);
 assert.deepEqual(matrix.filter(r=>r.grip==='published').map(r=>[r.modeId,r.hands,r.motion]),[['wseA0_41AcVRwc1Lf',1,'swing'],['weiWzhbVzaUanz_k_',2,'swing']]);
 assert.ok(!matrix.some(r=>r.sourceModeId===raw.standaloneRef.modeId&&r.grip==='one-handed'));
 const next=selectMeleeEditorProfile(c,{grip:'published',skill:'Axe/Mace',quality:'Fine',material:'steel',weaponTL:3},'modeId','weiWzhbVzaUanz_k_',a,raw);
 const p=resolveMeleeProfile({actor:a,attack:raw,selection:next,context:c});
 assert.equal(p.meleeProfile.strength.hands,2);assert.equal(next.grip,'published');assert.equal(next.quality,'Fine');assert.equal(next.weaponTL,3);
 const html=meleeProfileEditorHTML(c,next,esc,a,raw);assert.doesNotMatch(html,/<option value="mode:/);
 assert.match(html,/value="published" selected[^>]*>Двуручный/);
 assert.equal(matrix.filter(r=>r.grip==='published').length,2);
});
test('Bastard Sword and Longsword retain real one/two-handed Swing/Thrust modes; Tip Grip selects an existing Thrust',async()=>{
 for(const id of ['w7YvW6FWgvgetiStj','w0djXNfWD-9ebEkWu']){
  const a=actor(),raw=await weapon(a,id),c=meleeProfileContext(a,raw),rows=meleeEditorCompatibility(c,{},a,raw);
  for(const hands of [1,2])for(const motion of ['swing','thrust'])assert.ok(rows.some(r=>r.grip==='published'&&r.hands===hands&&r.motion===motion));
  const tip=selectMeleeEditorProfile(c,{skill:'Broadsword',quality:'Fine'},'grip','tip',a,raw),target=c.profiles.find(p=>p.modeId===tip.modeId);
  assert.match(target.stats.damage,/^thr/);assert.equal(tip.grip,'tip');assert.equal(tip.skill,'Broadsword');assert.equal(tip.quality,'Fine');
  const swing=selectMeleeEditorProfile(c,tip,'modeId',id,a,raw);assert.equal(swing.grip,'published');
  assert.equal(resolveMeleeProfile({actor:a,attack:raw,selection:tip,context:c}).meleeProfile.motion,'thrust');
 }
});
test('all M2.1 matrix states use exact physical source modes and the existing numeric resolver',async()=>{
 let states=0;
 for(const source of Object.values(LT_BLADE_PROFILES)){
  const a=actor(),raw=await weapon(a,source.modeId),c=meleeProfileContext(a,raw),before=JSON.stringify(a.system);
  for(const row of meleeEditorCompatibility(c,{},a,raw)){
   assert.equal(row.equipmentId,source.equipmentId);assert.ok(c.profiles.some(p=>p.modeId===row.modeId));
   const selected=selectMeleeEditorProfile(c,{modeId:row.sourceModeId},'grip',row.grip,a,raw);
   assert.equal(selected.modeId||row.sourceModeId,row.modeId);
   const p=resolveMeleeProfile({actor:a,attack:raw,selection:selected,context:c});
   assert.equal(p.readinessReason,null);assert.equal(p.meleeProfile.motion,row.motion);assert.equal(p.meleeProfile.strength.hands,row.hands);
   if(row.grip==='tip')assert.match(c.profiles.find(p=>p.modeId===row.modeId).stats.damage,/^thr/);
   states++;
  }
  assert.equal(JSON.stringify(a.system),before);
 }
 assert.ok(states>300);
});
test('B270 availability follows the actual instance ST override and never creates a hand counterpart',async()=>{
 const a=actor();a.system.attributes.ST.value=14;a.system.attributes.ST.import=14;
 const raw=await weapon(a,'wSyyMVFZwpR_0-Gfi'),service=new StandaloneWeaponService(a,catalogs);
 const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee',existing:service.get(raw.standaloneRef.weaponId)});
 draft.setOverride(raw.standaloneRef.modeId,'st','12\u2020');await service.save(draft);
 const current=readStandaloneAttack(a,raw.standaloneRef.weaponId,raw.standaloneRef.modeId),c=meleeProfileContext(a,current);
 const rows=meleeEditorCompatibility(c,{},a,current).filter(r=>r.sourceModeId===current.standaloneRef.modeId);
 assert.ok(!rows.some(r=>r.grip==='one-handed'));assert.throws(()=>selectMeleeEditorProfile(c,{},'grip','one-handed',a,current));
 assert.ok(rows.some(r=>r.grip==='published'&&r.hands===2));
});
