import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {weaponResourcePresentation as display,weaponResourceStatLines,shotResourceLines} from '../scripts/tools/weapon-resource-presentation.js';
import {newWeaponBattery,weaponPowerProfile,weaponPowerReason} from '../scripts/tools/weapon-power.js';
import {LP_PROFILES,newLPFuel} from '../scripts/tools/ut-liquid-propellant.js';
import {HT_PRE_GAUSS_PROFILES} from '../scripts/ht-pre-gauss-profiles.js';
import {GAUSS_PROFILES} from '../scripts/ut-gauss-source.js';
import {createFireControlContext,weaponStrengthPenalty} from '../scripts/tools/fire-control-context.js';
import {FireService} from '../scripts/tools/fire-service.js';
import {migrateAmmoInventory} from '../scripts/tools/ammo-inventory.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'qa',targets:new Set()},i18n:{lang:'ru',localize:k=>k},settings:{get:()=>null}};
globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
const {ammoManagementHTML}=await import('../scripts/tools/ammo-management-app.js');
const {FirePreparationApp}=await import('../scripts/tools/fire-preparation-app.js');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const ammoSource=fs.readFileSync(new URL('../scripts/tools/ammo.js',import.meta.url),'utf8');
const chatBody=ammoSource.match(/  function buildFireChatBody\(state, payload\) \{[\s\S]*?\n  \}/)[0];
const renderChat=new Function('shotResourceLines','escapeHTML','shouldReportField','buildFireSkillBreakdownHtml',chatBody+';return buildFireChatBody;')(shotResourceLines,escape,()=>true,()=>null);
function energy(mode,remaining=null){const w={id:mode,name:'QA resource',standaloneModeId:mode,capacity:72,magazines:[0],loadedIndex:0,totalAmmo:0},p=weaponPowerProfile(w);w[p.stateKey]=newWeaponBattery(p);if(remaining!==null)w[p.stateKey].charge=remaining;return w;}
const cases=[
 ['electrolaser legacy phantom feed',()=>energy('WX_LmRHi1yv6wEKcu',67),'power-only',false],
 ['laser battery',()=>energy('Wc8n7l5aGm-_aywZc',10),'power-only',false],
 ['zero battery',()=>energy('Wc8n7l5aGm-_aywZc',0),'power-only',false],
 ['chemical fuel only',()=>energy('WdE418jjnR9LT9qHl',20),'fuel-only',false],
 ['empty real physical magazine',()=>({id:'real',name:'QA pistol',standaloneModeId:'WNyWKWygpNZeB7CMQ',magazines:[0],loadedIndex:0,capacity:5,totalAmmo:0}),'cartridges',true],
 ['loaded real physical magazine',()=>({id:'real',name:'QA pistol',magazines:[3],loadedIndex:0,capacity:5,totalAmmo:8}),'cartridges',true],
 ['paint hybrid',()=>({...energy('Wg_f0E5hqv6o1C0Uj',37),capacity:50,magazines:[3],loadedIndex:0,totalAmmo:8}),'hybrid',true],
 ['paint hybrid empty feed',()=>({...energy('Wg_f0E5hqv6o1C0Uj',0),capacity:50,magazines:[0],loadedIndex:0,totalAmmo:0}),'hybrid',true],
 ['unmanaged manual attack',()=>({id:'manual',magazines:[],loadedIndex:-1,capacity:0,totalAmmo:0,ammoUnconfigured:true}),'cartridges',true]
];
for(const [label,make,kind,physical]of cases){
 test('review resource identity: '+label,()=>{const w=make(),before=JSON.stringify(w),d=display(w);assert.equal(d.kind,kind);assert.equal(d.physicalCartridges,physical);assert.equal(d.showMagazines,!['power-only','fuel-only'].includes(kind));assert.equal(JSON.stringify(w),before);});
 test('review actual chat resource renderer: '+label,()=>{const w=make(),html=renderChat({}, {resourceDisplay:display(w),fired:1,hits:1,margin:3,rcl:1});if(physical&&!w.ammoUnconfigured){assert.match(html,/Установленный магазин/);assert.match(html,/Общий боезапас/);}else{assert.doesNotMatch(html,/Установленный магазин|Общий боезапас/);}if(kind==='power-only')assert.match(html,/cell|заряд/);if(kind==='fuel-only'){assert.match(html,/Химический ранец/);assert.match(html,/выстр\./);}if(kind==='hybrid')assert.match(html,/B cell/);});
 test('review real Fire stats formatter: '+label,()=>{const w=make(),app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:{getFlag:()=>({weapons:[w]})},weapon:w,attack:{data:{bulk:'-2'},ammunitionDisplay:{damageText:'Damage QA'},rcl:1},fireState:{},_getDisplayedAcc:()=>0});const text=app._getAttackStatsText(1,0);if(kind==='power-only'||kind==='fuel-only')assert.doesNotMatch(text,/магазин/);if(kind==='hybrid')assert.match(text,/B cell.*магазин/);if(w.magazines?.length&&!kind.endsWith('-only'))assert.ok(text.includes('0/'+w.capacity)||text.includes('3/'+w.capacity));});
}
for(const id of ['WX_LmRHi1yv6wEKcu','Wc8n7l5aGm-_aywZc','WdE418jjnR9LT9qHl'])test('review ammunition window has resource info without phantom inventory: '+id,()=>{
 const w=energy(id),before=JSON.stringify(w),html=ammoManagementHTML(w,{language:'ru'},[]);assert.match(html,/data-resource-summary/);assert.doesNotMatch(html,/data-inventory-action|name="inventoryMagazine"|Установленный магазин|Общий боезапас/);assert.equal(JSON.stringify(w),before);
});
test('review empty physical magazine remains in ammunition window',()=>{const w=cases[4][1]();migrateAmmoInventory(w,()=> 'mag-1');const html=ammoManagementHTML(w,{language:'ru',magazineId:'mag-1',canEdit:true},[]);assert.match(html,/name="inventoryMagazine"/);assert.match(html,/data-inventory-action/);});
test('review LP preserves both fuel and physical projectiles',()=>{const p=Object.values(LP_PROFILES)[0],w={id:'lp',standaloneModeId:p.modeId,executionVariant:'lp',lpFuel:newLPFuel(p),magazines:[0],loadedIndex:0,capacity:p.nominalCapacity,totalAmmo:0},d=display(w);assert.equal(d.kind,'hybrid');assert.equal(d.source.kind,'fuel');assert.equal(d.source.unit,'номинальных зарядов');assert.equal(d.feed.remaining,0);assert.match(shotResourceLines(d).join(' '),/Баллон LP.*Установленный магазин.*Общий боезапас/);});
for(const p of Object.entries(HT_PRE_GAUSS_PROFILES).map(([modeId,p])=>({...p,modeId})).filter(p=>['flame','squirt'].includes(p.kind)))test('review HT reservoir uses published inventory unit: '+p.modeId,()=>{const d=display({standaloneModeId:p.modeId,magazines:[0],loadedIndex:0,capacity:10,totalAmmo:0});assert.equal(d.physicalCartridges,false);assert.equal(d.feed.label,'Резервуар');assert.ok(d.feed.unit);assert.doesNotMatch(shotResourceLines(d).join(' '),/магазин|боезапас/);});
test('review zero battery block and resource state are unchanged by presentation',()=>{const w=energy('WX_LmRHi1yv6wEKcu',0),before=JSON.stringify(w);assert.ok(weaponPowerReason(w));display(w);weaponResourceStatLines(w);shotResourceLines(display(w));assert.equal(JSON.stringify(w),before);assert.ok(weaponPowerReason(w));});
test('review unknown manual weapon is not classified by a name or a zero',()=>{const d=display({name:'Laser Fuel Cell',battery:{charge:0},magazines:[0],loadedIndex:0,capacity:8,totalAmmo:0});assert.equal(d.kind,'cartridges');assert.equal(d.feed.remaining,0);});
test('review EM battery display follows existing standard-shot units instead of raw quarter-units',()=>{const p=Object.values(GAUSS_PROFILES).find(p=>!p.external),w=energy(p.modeId),d=display(w);assert.equal(d.source.capacity,p.shots);assert.equal(d.source.remaining,p.shots);assert.equal(weaponResourceStatLines(w,{includeSource:false}).some(s=>s.includes('cell')),false);});
function fire(){const actor={id:'qa',system:{attributes:{ST:{value:14}},skills:{}}},token={actor},attack={name:'Colt Walker',level:16,acc:2,rof:'1',rcl:'2',data:{bulk:'-4',range:'110/1200'}},context=createFireControlContext({token,fireService:new FireService({actor,token})}),bands=[{index:0,max:2,penalty:0,label:'2 yards'}],target={getSelection:()=>({penalty:0,label:'torso'})};return {actor,attack,context,bands,target};}
for(const aimSeconds of [0,1,3])test('review obsolete saved sensor flag has no channel or bonus, Aim '+aimSeconds,()=>{
 const f=fire(),base={shots:1,rangeIndex:0,manualRangeSelected:true,aimSeconds,hitLocationId:'torso'},a=f.context.calculateEffectiveFireSkillDetails(f.attack,{...base,sensorTargetingConfirmed:true},f.bands,f.target),b=f.context.calculateEffectiveFireSkillDetails(f.attack,{...base,sensorTargetingConfirmed:false},f.bands,f.target);assert.equal(a.effectiveSkill,b.effectiveSkill);assert.ok(!a.combatCalculation.channels.some(c=>c.id==='sensorTargeting'));
});
test('review sensor UI/serialization/calculation are absent from production, genuine sensor code retained',()=>{for(const file of ['fire-preparation-app.js','fire-control-context.js'])assert.doesNotMatch(fs.readFileSync(new URL('../scripts/tools/'+file,import.meta.url),'utf8'),/sensorTargetingConfirmed|sensorTargetingBonus|sensorTargeting/);assert.match(fs.readFileSync(new URL('../scripts/ut-next-eleven-source.js',import.meta.url),'utf8'),/LADARS/);});
test('review ST audit preserves existing behavior and demonstrates conditional double-count risk',()=>{
 const f=fire();f.actor.system.attributes.ST.value=9;f.attack.ammunitionRequiredStrength={value:10,application:'existing-fire-skill-channels'};f.attack.level=15;const values={shots:1,rangeIndex:0,manualRangeSelected:true},r=f.context.calculateEffectiveFireSkillDetails(f.attack,values,f.bands,f.target);assert.equal(weaponStrengthPenalty(f.attack,f.actor),-1);assert.equal(r.effectiveSkill,14);f.attack.level=14;assert.equal(f.context.calculateEffectiveFireSkillDetails(f.attack,values,f.bands,f.target).effectiveSkill,13);assert.equal(weaponStrengthPenalty({...f.attack,ammunitionRequiredStrength:{value:10,application:'manual-GM-existing-support-rules'}},f.actor),0);
});
