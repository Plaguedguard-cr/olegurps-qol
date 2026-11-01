import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CatalogService } from '../scripts/catalog-service.js';
import { StandaloneWeaponDraft, StandaloneWeaponService } from '../scripts/tools/standalone-weapon-service.js';
import { readStandaloneAttack } from '../scripts/tools/standalone-attack-service.js';
import { meleeCombatControls, meleeCombatControlsHTML, saveMeleeCombatControl, selectMeleeCombatMode } from '../scripts/tools/melee-combat-controls.js';
import { MeleeProfileService, meleeProfileContext, resolveMeleeProfile } from '../scripts/tools/melee-profile-service.js';
import { normalizeMeleeAssistantState, setMeleeVisibility, getMeleeAttackSettings, setMeleeRapidStrikeMastery } from '../scripts/tools/melee-assistant-state.js';
import { resolveMeleeCombatCalculation } from '../scripts/tools/melee-service.js';
import { checkUIDashes, unapprovedUIDash } from '../tools/check-ui-dashes.mjs';

const catalogs = new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load(); globalThis.OleGURPSQOL={catalogs};
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function actor(skills={'Axe/Mace':16,Broadsword:16,'Two-Handed Sword':16,Knife:16},st=20){
 const flags={};return {id:'common',isOwner:true,system:{attributes:{ST:{import:st,value:st},DX:{value:12}},swing:'3d+2',thrust:'2d-1',ads:{},
 skills:Object.fromEntries(Object.entries(skills).map(([name,level],i)=>[i,{name,level,points:1}]))},
 getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};
}
async function weapon(a,eid,modeId){const draft=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});draft.selectModel(eid);
 const record=await new StandaloneWeaponService(a,catalogs).save(draft);return readStandaloneAttack(a,record.id,modeId??record.modes[0].modeId);}

test('common row keeps all controls for standalone and GGA; Axe offers sourced Defensive Grip without a sibling alias',async()=>{
 const a=actor(),raw=await weapon(a,'eVXaW9Nwr6YM5IlMJ');
 const imported={key:'uuid:imported',name:'Axe',mode:'Swing',level:17,damage:'sw+2 cut',st:'11',reach:'1',parry:'11U',data:{pageref:'LT54'}};
 await new MeleeProfileService(a).save(imported,{skill:''},{context:meleeProfileContext(a,imported,{sourceModeId:raw.standaloneRef.modeId})});
 for(const attack of [raw,imported]){
  const c=meleeCombatControls(a,attack),html=meleeCombatControlsHTML(c,{mastery:true,visibility:true},esc);
  assert.deepEqual(c.grips.map(g=>g.value),['published','defensive']);assert.deepEqual(c.skills.filter(s=>s.value).map(s=>s.value),['Axe/Mace']);
  for(const name of ['meleePrimarySkill','rapidStrikeMastery','meleeVisibility'])assert.ok(html.includes('name="'+name+'"'));
  assert.ok(html.includes('name="meleeGrip"'));assert.ok(html.includes('Defensive Grip'));assert.ok(!html.includes('mode:weiWzhbVzaUanz_k_'));
  assert.ok(html.indexOf('Хват:')<html.indexOf('WM / TBaM'));assert.ok(!html.replace(/ title="[^"]*"/g,'').includes('изучен'));
 }
 assert.equal(resolveMeleeProfile({actor:a,attack:imported}).level,17);
 await saveMeleeCombatControl(a,imported,'skill','Axe/Mace');assert.equal(resolveMeleeProfile({actor:a,attack:imported}).level,16);
 await assert.rejects(saveMeleeCombatControl(a,raw,'grip','mode:weiWzhbVzaUanz_k_'));
});
test('panel and editor share one per-instance profile, preserving quality, material, blade, and untouched second weapon',async()=>{
 const a=actor(),raw=await weapon(a,'e140WNiazx7pJ3WTT'),other=await weapon(a,'e140WNiazx7pJ3WTT'),before=JSON.stringify(a.system);
 await new MeleeProfileService(a).save(raw,{quality:'Fine',balance:'Balanced',material:'steel',weaponTL:9,blade:'superfine',modeId:raw.standaloneRef.modeId});
 const old=structuredClone(meleeProfileContext(a,raw).saved);
 await saveMeleeCombatControl(a,raw,'grip','defensive');await saveMeleeCombatControl(a,raw,'skill','Broadsword');
 const c=meleeCombatControls(a,raw),p=resolveMeleeProfile({actor:a,attack:raw});
 for(const key of ['quality','balance','material','weaponTL','blade','modeId'])assert.equal(c.context.saved[key],old[key]);
 assert.equal(c.grip,'defensive');assert.equal(c.skill,'Broadsword');assert.equal(p.level,17); // Existing Longsword defensive policy; Balanced +1.
 assert.equal(meleeCombatControls(a,other).grip,'published');assert.equal(JSON.stringify(a.system),before);
 const calc=resolveMeleeCombatCalculation({actor:a,attack:p,baseSkill:p.level,weaponBond:true,rapidStrike:true,rapidStrikeMastery:true});
 assert.equal(calc.rollModifiers.filter(m=>m.channel==='weaponBond').length,1);
 a.isOwner=false;await assert.rejects(saveMeleeCombatControl(a,raw,'grip','published'),/прав/);
});
test('confirmed defaults use the existing resolver and retain the required weapon skill, not the source skill',async()=>{
 const a=actor({Flail:16}),raw=await weapon(a,'eVXaW9Nwr6YM5IlMJ');
 const c=meleeCombatControls(a,raw);assert.equal(c.skills[0].value,'Axe/Mace');assert.equal(c.skills[0].label,'Axe/Mace (Flail-4)');
 await saveMeleeCombatControl(a,raw,'skill','Axe/Mace');assert.equal(resolveMeleeProfile({actor:a,attack:raw}).level,12);
 await assert.rejects(saveMeleeCombatControl(a,raw,'skill','Flail'));
 const untrained=actor({}),sword=await weapon(untrained,'e140WNiazx7pJ3WTT','w0djXNfWD-9ebEkWu');
 assert.equal(meleeCombatControls(untrained,sword).skills[0].label,'Broadsword (DX-5)');
 const haladie=await weapon(untrained,'eLTM21Haladie','wLTM21HaladieSwing');
 assert.equal(meleeCombatControls(untrained,haladie).skills[0].label,'Knife (DX-4)');
 assert.equal(resolveMeleeProfile({actor:untrained,attack:haladie}).level,7);
});
test('B270 grips require the published hand symbol and sufficient ST; saved unavailable selection remains visible',async()=>{
 const a=actor(),raw=await weapon(a,'e140WNiazx7pJ3WTT','wSyyMVFZwpR_0-Gfi');
 assert.ok(meleeCombatControls(a,raw).grips.some(g=>g.value==='one-handed'));
 await saveMeleeCombatControl(a,raw,'grip','one-handed');a.system.attributes.ST.value=5;a.system.attributes.ST.import=5;
 const c=meleeCombatControls(a,raw);assert.equal(c.grip,'one-handed');assert.equal(c.grips.find(g=>g.value==='one-handed').disabled,true);
});
test('visibility persists explicitly off/on with mode and existing semantics, independently of other attacks',()=>{
 let state=normalizeMeleeAssistantState(null);const one={uuid:'one'},two={uuid:'two'};
 setMeleeVisibility(state,one,{mode:'blind',accustomed:true,knownLocation:true});setMeleeRapidStrikeMastery(state,one,true);
 state=normalizeMeleeAssistantState(JSON.parse(JSON.stringify(state)));
 assert.equal(getMeleeAttackSettings(state,one).visibility.accustomed,true);assert.equal(getMeleeAttackSettings(state,one).visibility.mode,'blind');
 assert.equal(getMeleeAttackSettings(state,two).visibility,undefined);setMeleeVisibility(state,one,null);
 state=normalizeMeleeAssistantState(state);assert.equal(getMeleeAttackSettings(state,one).visibility,null);
 assert.equal(getMeleeAttackSettings(state,one).rapidStrikeMastery,true);
});
test('deliberately selecting another mode refreshes skills and grips without changing physical identity or quality',async()=>{
 const a=actor(),raw=await weapon(a,'e140WNiazx7pJ3WTT','w0djXNfWD-9ebEkWu');
 await new MeleeProfileService(a).save(raw,{quality:'Fine',skill:'Broadsword',grip:'defensive'});
 const next=readStandaloneAttack(a,raw.standaloneRef.weaponId,'wSyyMVFZwpR_0-Gfi');
 await selectMeleeCombatMode(a,next);const c=meleeCombatControls(a,next);
 assert.equal(c.profile.modeId,'wSyyMVFZwpR_0-Gfi');assert.equal(c.context.saved.quality,'Fine');
 assert.equal(c.context.record.id,raw.standaloneRef.weaponId);assert.ok(c.grips.some(g=>g.value==='one-handed'));
 assert.deepEqual(c.skills.map(s=>s.value),['Two-Handed Sword']);
});
test('source-only melee offers the catalog alternatives through the same row and existing skill resolver',async()=>{
 const a=actor({Knife:15,Shortsword:17}),raw=await weapon(a,'eUmoObBLpgPBL9Pef'),system=JSON.stringify(a.system);
 const c=meleeCombatControls(a,raw);assert.deepEqual(c.skills.map(s=>s.value),['Shortsword','Knife']);
 await saveMeleeCombatControl(a,raw,'skill','Knife');
 const live=readStandaloneAttack(a,raw.standaloneRef.weaponId,raw.standaloneRef.modeId);
 assert.equal(resolveMeleeProfile({actor:a,attack:live}).level,15);assert.equal(meleeCombatControls(a,live).skill,'Knife');assert.equal(JSON.stringify(a.system),system);
});
test('new literal, escaped or entity em dashes fail the repository gate; classified source/matcher exceptions remain intact',()=>{
 assert.deepEqual(checkUIDashes(),[]);
 for(const dash of ['\u2014','\\u2014','\\u{2014}','&#8212;','&#x2014;','&mdash;'])assert.equal(unapprovedUIDash('scripts/new-ui.js','label = "'+dash+'"'),true);
 assert.equal(unapprovedUIDash('scripts/new-ui.js','label = "–"'),false);
});
test('GGA restores the original actor-skill selector without a catalog requirement or an imported-total placeholder',()=>{
 const a=actor(),raw={path:'system.melee.00000',name:'Unbound imported Axe',mode:'Swing',level:19,st:'11',damage:'sw+2 cut'};
 const c=meleeCombatControls(a,raw);assert.equal(c.context,null);
 const governingSkills=[{value:'name:axe',label:'Axe/Mace'},{value:'name:sword',label:'Broadsword'}];
 const html=meleeCombatControlsHTML(c,{governingSkills,governingSpecialty:'name:sword',mastery:true},esc);
 const selector=html.match(/<select name="governingSpecialty"[\s\S]*?<\/select>/)?.[0];
 assert.ok(selector);assert.doesNotMatch(selector,/disabled|Итог GGA/);
 assert.match(selector,/Выберите навык/);assert.match(selector,/Axe\/Mace/);assert.match(selector,/Broadsword/);
 assert.match(selector,/value="name:sword" selected/);assert.match(html,/Хват:/);assert.match(html,/WM \/ TBaM/);
});
