import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,listStandaloneAttacks} from '../scripts/tools/standalone-attack-service.js';
import {meleeCombatControls,meleeCombatControlsHTML,meleePhysicalAttackGroups,saveMeleeCombatControl,meleeOutcomeLabel} from '../scripts/tools/melee-combat-controls.js';
import {meleeMaterialSelectOptions,meleeProfileEditorHTML} from '../scripts/tools/melee-profile-editor.js';
import {meleeProfileContext,resolveMeleeProfile,MeleeProfileService} from '../scripts/tools/melee-profile-service.js';
import {freezeMeleeAttackProfile,prepareEffectiveMeleeDamage} from '../scripts/tools/melee-service.js';
import {utMeleeResourceLabel,utMeleeResourceContext,newUTMeleeResource} from '../scripts/tools/ut-melee-resources.js';
const catalogs=new CatalogService({logger:null,fetcher:async u=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+u.split('/').at(-1),import.meta.url),'utf8'))})});await catalogs.load();globalThis.OleGURPSQOL={catalogs};
const actor=()=>{const flags={};return {id:crypto.randomUUID(),isOwner:true,system:{attributes:{ST:{value:12},DX:{value:12}},swing:'1d+2',thrust:'1d-1',skills:{a:{name:'Shortsword',level:16,points:4},b:{name:'Force Sword',level:16,points:4}}},getFlag:(s,k)=>structuredClone(flags[s+'.'+k]),setFlag:async(s,k,v)=>{flags[s+'.'+k]=structuredClone(v);}};};
async function weapon(a,id){const d=new StandaloneWeaponDraft({actor:a,catalogs,type:'melee'});d.selectModel(catalogs.getEquipmentForMode(id).equipment_id);const r=await new StandaloneWeaponService(a,catalogs).save(d);return readStandaloneAttack(a,r.id,id);}
test('one weapon row per exact physical instance; all real modes remain selectable',async()=>{
 const a=actor(),one=await weapon(a,'w8xpTbHH1oVDkHOYb'),two=await weapon(a,'w8xpTbHH1oVDkHOYb'),rows=listStandaloneAttacks(a,'melee'),groups=meleePhysicalAttackGroups(rows,one.key);assert.equal(groups.length,2);assert.equal(groups[0].attacks.length,6);assert.equal(groups[0].attack.key,one.key);assert.notEqual(groups[0].key,groups[1].key);
 const c=meleeCombatControls(a,one,{attacks:rows});assert.equal(c.modes.length,6);assert.equal(new Set(c.modes.map(m=>m.label)).size,6);assert.ok(c.modes.every(m=>!m.label.includes('Zap Glove')));assert.equal(two.name,one.name);
});
test('native Swing/Thrust group only by an exact equipment link, never by the weapon name',()=>{
 const rows=[{key:'a',name:'Sword',mode:'Swing',data:{parentuuid:'physical-1'}},{key:'b',name:'Sword',mode:'Thrust',data:{parentuuid:'physical-1'}},{key:'c',name:'Sword',mode:'Swing',data:{parentuuid:'physical-2'}},{key:'d',name:'Sword',mode:'Swing',data:{}}];const groups=meleePhysicalAttackGroups(rows,'b');assert.equal(groups.length,3);assert.equal(groups[0].attack.key,'b');assert.equal(groups[0].attacks.length,2);
});
test('DX loses its self-default suffix while Boxing (DX) and real penalties stay visible',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb'),c=meleeCombatControls(a,raw);assert.equal(c.skills.find(s=>s.value==='DX').label,'DX');assert.equal(c.skills.find(s=>s.value==='Boxing').label,'Boxing (DX)');
 const html=meleeCombatControlsHTML(c,{governingSkills:[{value:'DX',label:'DX (DX)'}]},String);assert.ok(!html.includes('DX (DX)'));assert.ok(html.includes('name="governingSpecialty"'));
});
test('compact mode selector sits next to grip; one valid mode does not add a selector',async()=>{
 const a=actor(),raw=await weapon(a,'w7bLtfJugrIOJS70U'),c=meleeCombatControls(a,raw),html=meleeCombatControlsHTML(c,{},String);assert.equal(c.modes.length,2);assert.equal(c.modes[0].label,'Swing');assert.equal(c.modes[1].label,'Thrust');assert.ok(html.indexOf('Хват:')<html.indexOf('name="meleeAttackMode"'));assert.ok(html.indexOf('name="meleeAttackMode"')<html.indexOf('WM / TBaM'));
 const force=await weapon(a,'woO7urPHntECbjiW_');assert.ok(!meleeCombatControlsHTML(meleeCombatControls(a,force),{},String).includes('name="meleeAttackMode"'));
});
test('mode selection uses the shared profile and preserves construction, second instance and frozen Damage',async()=>{
 const a=actor(),one=await weapon(a,'w7bLtfJugrIOJS70U'),two=await weapon(a,'w7bLtfJugrIOJS70U'),system=JSON.stringify(a.system);await new MeleeProfileService(a).save(one,{weaponTL:9});let attack=resolveMeleeProfile({actor:a,attack:one});attack={...attack,damageAction:{type:'deriveddamage',derivedformula:'sw',formula:'',damagetype:'cr'}};const preparedDamage=await prepareEffectiveMeleeDamage({actor:a,attack}),profile=freezeMeleeAttackProfile({actor:a,attack,preparedDamage}),before=JSON.stringify(profile);await saveMeleeCombatControl(a,one,'modeId','wmZbVhgow5v78qhsX');assert.equal(meleeCombatControls(a,one).mode,'wmZbVhgow5v78qhsX');assert.equal(meleeProfileContext(a,one).saved.weaponTL,9);assert.equal(meleeCombatControls(a,two).mode,'w7bLtfJugrIOJS70U');assert.equal(JSON.stringify(profile),before);assert.equal(JSON.stringify(a.system),system);await assert.rejects(saveMeleeCombatControl(a,one,'modeId','woO7urPHntECbjiW_'));
});
test('published material default is one semantic option and an explicit saved baseline remains selected',async()=>{
 for(const material of ['', 'published']){const rows=meleeMaterialSelectOptions({baselineMaterial:'published'},['published'],{material},false);assert.equal(rows.length,1);assert.equal(rows[0][0],material);}
 assert.equal(meleeMaterialSelectOptions({baselineMaterial:'steel'},['steel','wood'],{},true).length,3);
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb'),html=meleeProfileEditorHTML(meleeProfileContext(a,raw),{},String,a,raw),select=html.match(/<select data-melee-profile="material">(.*?)<\/select>/s)[1];assert.equal((select.match(/<option /g)??[]).length,1);
});
test('contact resistance replaces missing Damage while Kill and punch keep real Damage',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb');
 for(const [mode,label]of [['w8xpTbHH1oVDkHOYb','Спасбросок HT-6'],['wYzmoafHusruaKOBV','Урон 2d burn'],['w8xpTbHH1oVDkHOYbPunch','Урон thr-1 cr']]){
  await saveMeleeCombatControl(a,raw,'modeId',mode);const attack=resolveMeleeProfile({actor:a,attack:raw});assert.equal(meleeOutcomeLabel(attack,attack.damage),label);
 }
 assert.equal(meleeOutcomeLabel({meleeProfile:{utExotic:{instructionOnly:true}}},'spec.'),'Специальное воздействие');
});
test('summary resource reads actual instance capacity, non-rechargeable state and remaining charge',async()=>{
 const a=actor(),raw=await weapon(a,'w8xpTbHH1oVDkHOYb'),c=utMeleeResourceContext(a,raw);assert.equal(utMeleeResourceLabel(a,raw),'Заряды –/10');
 const state=newUTMeleeResource(c,true);state.charge=17;await a.setFlag('olegurps-qol','utMeleeResources',{[c.key]:state});assert.equal(utMeleeResourceLabel(a,raw),'Заряды 17/20');state.charge=0;await a.setFlag('olegurps-qol','utMeleeResources',{[c.key]:state});assert.equal(utMeleeResourceLabel(a,raw),'Заряды 0/20');assert.equal(utMeleeResourceLabel(a,{key:'native'}),null);
});
