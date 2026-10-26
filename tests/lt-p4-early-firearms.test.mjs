import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {AmmunitionCompatibilityService} from '../scripts/ammunition-compatibility-service.js';
import {LT_EARLY_PROFILES,LT_TEN_EYED_MODES,ltEarlyImprovisedId} from '../scripts/lt-early-firearms-source.js';
import {ltEarlySlots,ltEarlyActiveSlot,ltEarlyPowderRequirements,ltEarlyReadiness,ltEarlyTypeAssessment,initializeLTEarlyCarrier,ltEarlyDamage} from '../scripts/tools/lt-early-firearms.js';
import {duckArcCandidates,duckFootContextError,resolveDuckFootChecks} from '../scripts/tools/lt-duck-foot.js';
import {ltEarlyManagementHTML,ltEarlyPlacesHTML,captureLTEarlyInputs} from '../scripts/tools/lt-early-firearms-editor.js';
import {resolveRuntimeAttackProfile} from '../scripts/tools/attack-profile-runtime.js';
import {validateWeaponExecution} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponService,StandaloneWeaponDraft,standaloneAmmoCarrier} from '../scripts/tools/standalone-weapon-service.js';
import {readStandaloneAttack,standaloneCatalogBinding} from '../scripts/tools/standalone-attack-service.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {AmmoService,readAttackAmmunition} from '../scripts/tools/ammo-service.js';
import {ammoTypeKey} from '../scripts/tools/ammo-inventory.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';

globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'owner',isGM:false,getFlag:()=>undefined},settings:{get:()=>null},i18n:{lang:'en',localize:k=>k}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();const compatibility=new AmmunitionCompatibilityService(catalogs),resolver=new AttackProfileResolver({catalogs,compatibility});
globalThis.OleGURPSQOL={catalogs,ammunitionCompatibility:compatibility};
function actor(){return {id:crypto.randomUUID(),isOwner:true,flags:{},system:{attributes:{DX:{value:20},IQ:{value:20},ST:{import:14,value:14}},skills:{}},getFlag(s,k){return structuredClone(this.flags[s]?.[k]);},async setFlag(s,k,v){this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};}
async function fixture(id){
 const p=LT_EARLY_PROFILES[id],a=actor(),m=catalogs.getMode(id);
 for(const skill of [...(m.defaults??[]).filter(s=>s.type==='skill'),m.governing_skill?.skill].filter(Boolean))a.system.skills[skill.name+(skill.specialization??'')]={name:skill.name+(skill.specialization?' ('+skill.specialization+')':''),level:20,points:4};
 const definitions=new StandaloneWeaponService(a,catalogs),draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:a});draft.selectModel(p.equipmentId);draft.modeIds=new Set([id]);
 const record=await definitions.save(draft),weapon=standaloneAmmoCarrier(record);weapon.ltEarly.settings.ignitionReady=true;
 await a.setFlag('world','gurpsAmmoManager',{weapons:[weapon],attackOverrides:{},shotReceipts:{}});const service=new AmmoService(a);
 const current=()=>a.flags.world.gurpsAmmoManager.weapons[0],attack=()=>readStandaloneAttack(a,record.id,current().standaloneModeId);
 const type=(parameters={},ammoId=p.ammoIds[0])=>{const t={source:'catalog',book:'lt',kind:'ammo-item',ammoId,name:catalogs.getAmmoItem('lt',ammoId)?.name,recipe:{version:1,variantId:'lt_early_load',customId:crypto.randomUUID(),parameters:{accounting:'components',loading:'loose',powder:p.powder,powderQuality:'normal',fit:{equipmentId:p.equipmentId,weaponId:weapon.id,barrels:Array.from({length:p.places},(_,i)=>i)},...parameters}}};t.key=ammoTypeKey(t);return t;};
 const tx=(op,args,t)=>service.inventoryTransaction(weapon.id,op,args,{allowedTypes:()=>[t]});
 const stock=async(t,count=20)=>{await tx('save-recipe',{type:t},t);await tx('add-stock',{ammoKey:t.key,amount:count},t);return t;};
 const components=async(t,count=20)=>{for(const r of ltEarlyPowderRequirements(p,t.recipe.parameters,t.ammoId))await tx('lt-early-component',{type:t,kind:r.kind,amount:count},t);};
 const load=async(t,slots=ltEarlySlots(current()))=>{for(const slot of slots)await tx('load',{magazineId:slot.id,ammoKey:t.key,amount:slot.capacity},t);};
 const profile=(state=a.getFlag('world','gurpsAmmoManager'),ammunition=readAttackAmmunition(state.weapons[0]),distance=1)=>resolver.resolve({actor:a,actorId:a.id,weaponId:weapon.id,attack:attack(),state,ammunition,binding:standaloneCatalogBinding(attack(),catalogs),context:{physicalDistance:distance,physicalShots:1,...(p.kind==='duck'&&distance>2?{duckArc:{version:1,widthDegrees:30,offset:0,order:'left-to-right',confirmed:true,primaryTokenId:'test-primary',otherTargets:[]}}:{})}});
 const shoot=(attackId=crypto.randomUUID(),distance=1,execute=async()=>({rolled:true,rollData:{failure:false,rtotal:10,finaltarget:20,margin:10},messageId:'native-'+attackId}))=>service.executeShot({weaponId:weapon.id,attackId,prepare:({state,ammunition})=>({profile:profile(state,ammunition,distance),amount:1}),execute});
 return {p,actor:a,weapon,record,definitions,service,current,attack,type,tx,stock,components,load,profile,shoot};
}

test('P4 scope contains 39 modes and 34 equipment; published Chinese Rcl1 and physical Puckle separation are projected',()=>{
 assert.equal(Object.keys(LT_EARLY_PROFILES).length,39);assert.equal(new Set(Object.values(LT_EARLY_PROFILES).map(p=>p.equipmentId)).size,34);
 assert.equal(catalogs.getMode('WXLhR6qAupk40x1vV').stats.recoil,'1');assert.equal(catalogs.getMode('WFiGuhETQ5MGheGwO').stats.recoil,'1');
 assert.equal(compatibility.checkCompatibility('WRLeJSlkTELYgEN_u','lt_puckle_gun_bullet_lt93',{book:'lt',kind:'ammo-item'}).status,'incompatible');
 assert.equal(compatibility.checkCompatibility('WRLeJSlkTELYgEN_u','lt_puckle_square_bullet_lt93',{book:'lt',kind:'ammo-item'}).status,'undetermined');
});
for(const p of Object.values(LT_EARLY_PROFILES))test(p.modeId+' / '+p.name+': source load -> components -> native boundary -> debit -> snapshot',async()=>{
 const f=await fixture(p.modeId),type=f.type();await f.stock(type);await f.components(type);await f.load(type);
 assert.equal(f.attack().readinessReason,null,p.name+' readiness');
 if(p.kind==='ten-eyed')for(let n=0;n<LT_TEN_EYED_MODES.indexOf(p.modeId);n++)await f.shoot();
 const before=structuredClone(f.current()),profile=f.profile();assert.equal(profile.damage.nativeSafe,true,profile.damage.reason);assert.equal(profile.effective.damage,profile.damage.formula);
 assert.equal(ltEarlyReadiness(f.current()),null);assert.equal(profile.damage.rules.ltEarly.physicalUnits,p.kind==='duck'?4:1);
 const r=await f.shoot();assert.equal(r.spent,p.kind==='duck'?4:1);assert.equal(before.totalAmmo-f.current().totalAmmo,r.spent);
 assert.deepEqual(before.ltEarly.components,f.current().ltEarly.components,'powder must not be debited twice');assert.equal(r.snapshot.profile.damage.formula,profile.damage.formula);
 assert.equal(r.receipt.ltEarlyCharges.length,p.kind==='duck'?4:1);assert.equal(r.receipt.ltEarlyCharges[0].charge.components.length,4);
 const summary=ammunitionChatData(r.snapshot.profile);assert.ok(summary);assert.ok(summary.lines.length<=3,p.name+' generated description too long');
});

test('missing powder, primer or wadding blocks component loading atomically; prepared kits debit no loose components',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),type=f.type();await f.stock(type);const before=JSON.stringify(f.actor.flags);await assert.rejects(f.load(type),/компонента/);assert.equal(JSON.stringify(f.actor.flags),before);
 for(const req of ltEarlyPowderRequirements(f.p,type.recipe.parameters,type.ammoId)){
  await assert.rejects(f.load(type));await f.tx('lt-early-component',{type,kind:req.kind,amount:2},type);
 }await f.load(type);const c=f.current().ltEarly.components.map(s=>s.rounds);assert.deepEqual(c,[1,1,1]);
 const g=await fixture('WeCQz_2guzg8JWBca'),kit=g.type({accounting:'prepared',loading:'paper'});await g.stock(kit);await g.load(kit);assert.deepEqual(g.current().ltEarly.components,[]);await g.shoot();assert.deepEqual(g.current().ltEarly.components,[]);
});

test('Ten-Eyed always has five source modes, ten physical places, two sequences and an explicit Ready flip',async()=>{
 const f=await fixture(LT_TEN_EYED_MODES[3]);assert.equal(f.record.modes.length,5);assert.equal(ltEarlySlots(f.current()).length,10);assert.equal(f.current().capacity,1);
 const t=f.type();await f.stock(t);await f.components(t);await f.load(t);const rows=[];
 for(let n=0;n<5;n++){assert.equal(f.current().standaloneModeId,LT_TEN_EYED_MODES[n]);rows.push((await f.shoot()).snapshot.profile.damage.formula);}
 await assert.rejects(f.shoot());await assert.rejects(f.tx('lt-early-flip',{}));await f.tx('lt-early-flip',{readyConfirmed:true});
 for(let n=0;n<5;n++){assert.equal(f.current().standaloneModeId,LT_TEN_EYED_MODES[n]);assert.equal((await f.shoot()).snapshot.profile.damage.formula,rows[n]);}
 assert.equal(ltEarlySlots(f.current()).reduce((s,m)=>s+m.rounds,0),0);assert.equal(f.current().ltEarly.face,1);
});

test('Duck Foot consumes four complete charges at both 2 and 3 yards; partial loads never become a one-bullet shot',async()=>{
 for(const distance of [2,3]){const f=await fixture('WNE2rB6BVUwchQrnf'),t=f.type({accounting:'prepared'});await f.stock(t);await f.load(t,ltEarlySlots(f.current()).slice(0,3));await assert.rejects(f.shoot());await f.load(t,ltEarlySlots(f.current()).slice(3));const r=await f.shoot(crypto.randomUUID(),distance);assert.equal(r.spent,4);assert.equal(r.snapshot.profile.context.physicalDistance,distance);assert.equal(r.snapshot.profile.damage.rules.duckFoot.maximumHits,distance===2?4:1);}
});

test('cancel and repeated attack IDs preserve all resources; foreign owners cannot change components',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),t=f.type();await f.stock(t);await f.components(t);await f.load(t);const before=JSON.stringify(f.actor.flags);await f.shoot('cancel',1,async()=>({rolled:false}));assert.equal(JSON.stringify(f.actor.flags),before);
 await f.shoot('once');await f.shoot('once',1,async()=>{throw Error('Rolled twice');});f.actor.isOwner=false;await assert.rejects(f.tx('lt-early-configure',{settings:{ignitionReady:true}}),/Permission/);
});

for(const p of Object.values(LT_EARLY_PROFILES))test(p.modeId+': every admitted physical projectile and charge option crosses the resource and history boundary',async()=>{
 const options=[{boosted:true,safety:'checked'},{boosted:true,safety:'exceeded'},{powderQuality:'substandard'},
  {loading:'measured'},{loading:'paper'},{loading:'paper',accounting:'prepared'}];
 if(p.muzzleloading&&['Musket','Rifle'].includes(p.governing_skill.skill.specialization))options.push({careful:true},{careful:true,loading:'measured'});
 if(p.source==='LT88')options.push({loading:'cloth',accounting:'prepared'});
 const projectiles=[...p.ammoIds,...(p.usage==='Shoot Bolt'?[]:[ltEarlyImprovisedId(p)])];
 for(const ammoId of projectiles)for(const parameters of [{},...options]){
  const f=await fixture(p.modeId),t=f.type(parameters,ammoId);await f.stock(t);await f.components(t);await f.load(t);
  if(p.kind==='ten-eyed')for(let n=0;n<LT_TEN_EYED_MODES.indexOf(p.modeId);n++)await f.shoot();
  const before=structuredClone(f.current()),profile=f.profile(),r=await f.shoot();
  assert.equal(profile.damage.nativeSafe,true,ammoId+JSON.stringify(parameters));assert.equal(r.spent,p.kind==='duck'?4:1);
  assert.equal(r.snapshot.profile.ammunition.ammoId,ammoId);assert.equal(r.snapshot.profile.damage.formula,profile.damage.formula);
  assert.deepEqual(before.ltEarly.components,f.current().ltEarly.components);
  assert.ok(ammunitionChatData(r.snapshot.profile).lines.length<=3);
  const saved=JSON.stringify(r.snapshot);t.recipe.parameters.powderQuality='substandard';t.name='Edited after firing';
  await f.actor.setFlag('world','gurpsAmmoManager',{...f.actor.flags.world.gurpsAmmoManager,weapons:[]});
  assert.equal(JSON.stringify(r.snapshot),saved);assert.equal(JSON.parse(saved).profile.damage.formula,profile.damage.formula);
 }
});

test('fitted parties, powder sort, cloth, future options and family IDs cannot bypass the actual carrier',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca');
 for(const params of [{powder:'corned'},{loading:'cloth'},{boosted:true},{boosted:'true',safety:'checked'},{careful:'false'},{fit:{equipmentId:f.p.equipmentId,weaponId:'other',barrels:[0]}}]){
  const t=f.type(params);assert.equal(ltEarlyTypeAssessment({modeId:f.p.modeId,type:t,catalogs,weapon:f.current()}).applicationAllowed,false);
  await assert.rejects(f.stock(t));
 }
 const family={...f.type(),kind:'ammo-family'};assert.equal(ltEarlyTypeAssessment({modeId:f.p.modeId,type:family,catalogs,weapon:f.current()}).applicationAllowed,false);
 const foreign=f.type({},'lt_teppo_bullet_lt93');await assert.rejects(f.stock(foreign));
 const variant=f.type();variant.recipe.variantIds=['lt_early_load','lt_chain_shot'];await assert.rejects(f.stock(variant));
});

test('specific handling: careful measured loading, Gonne crew, collapsed stock and charge arithmetic',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),t=f.type({careful:true,loading:'measured',boosted:true,safety:'checked'});await f.stock(t);await f.components(t);await f.load(t);
 const p=f.profile();assert.equal(p.effective.range,'71.5/726');assert.equal(p.effective.st,'10†');assert.equal(p.effective.acc,3);assert.equal(p.damage.rules.ltEarly.reloadSeconds,115);
 const g=await fixture(LT_TEN_EYED_MODES[0]),gt=g.type();await g.stock(gt);await g.components(gt);await g.load(gt);
 assert.equal(g.profile().effective.acc,0);assert.equal(g.profile().damage.rules.attackBonus,-2);
 await g.tx('lt-early-configure',{settings:{ignitionReady:true,crew:2}});assert.equal(g.profile().effective.acc,Number(g.p.stats.accuracy));assert.equal(g.profile().damage.rules.attackBonus,0);
 const c=await fixture('WMqVwH46upN0TpmQE'),ct=c.type();await c.stock(ct);await c.components(ct);await c.load(ct);await c.tx('lt-early-configure',{settings:{ignitionReady:true,stockCollapsed:true}});
 assert.equal(c.profile().effective.acc,2);assert.equal(c.profile().effective.st,'10');assert.equal(c.profile().effective.rcl,5);assert.equal(c.profile().effective.bulk,'-3');
});

test('Puckle cylinders are reusable empty devices; swapping, chamber fitting and limits do not mint ammunition',async()=>{
 const f=await fixture('WRLeJSlkTELYgEN_u'),t=f.type();await f.stock(t);await f.components(t);await f.load(t);await f.shoot();
 await f.tx('add-magazines',{capacity:9,amount:1});let slots=ltEarlySlots(f.current());assert.deepEqual(slots.map(s=>s.rounds),[8,0]);
 await assert.rejects(f.tx('install',{magazineId:slots[1].id}));await f.tx('install',{magazineId:slots[1].id,readyConfirmed:true});await assert.rejects(f.shoot());
 await f.load(t,[slots[1]]);await f.shoot();slots=ltEarlySlots(f.current());await f.tx('load',{magazineId:slots[1].id,ammoKey:t.key,amount:1},t);
 assert.equal(new Set(ltEarlySlots(f.current())[1].ltEarlyCharges.map(c=>c.chamber)).size,9);
 await f.tx('add-magazines',{capacity:9,amount:8});await assert.rejects(f.tx('add-magazines',{capacity:9,amount:1}));assert.equal(ltEarlySlots(f.current()).length,10);
 const before=JSON.stringify(f.current());await assert.rejects(f.tx('delete-magazine',{magazineId:slots[0].id}));assert.equal(JSON.stringify(f.current()),before);
});

test('legacy loads remain unloadable and never become complete shots merely by opening a projection',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),w=structuredClone(f.current());delete w.ltEarly;w.ammunitionInventory.magazines=[{id:'old',weaponId:w.id,capacity:1,rounds:1,ammoKey:'old-stock'}];w.ammunitionInventory.installedId='old';w.ammunitionInventory.stocks=[{key:'old-stock',type:{source:'legacy',key:'old-stock',name:'Old Note'},rounds:0}];
 initializeLTEarlyCarrier(w);assert.equal(w.ammunitionInventory.magazines.find(m=>m.id==='old').rounds,1);assert.equal(ltEarlySlots(w)[0].rounds,0);assert.ok(ltEarlyReadiness(w));
 const before=structuredClone(w);initializeLTEarlyCarrier(w);assert.deepEqual(w,before);
});

test('Duck Foot B389 follows the selected arc order, caps intentional chances at 9, and stops at four successes',async()=>{
 const origin={id:'o',x:0,y:0},primary={id:'p',x:10,y:0},tokens=[primary,...[-20,-10,0,10,20].map((v,n)=>({id:'t'+n,name:'T'+n,x:10,y:10*Math.tan(v*Math.PI/180)}))];
 const arc=duckArcCandidates(origin,primary,tokens);assert.deepEqual(arc.targets.map(t=>t.tokenId),['t1','t2','t3']);
 const targets=Array.from({length:8},(_,n)=>({tokenId:'target'+n,angle:n,purposeSkill:n===0?5:20}));
 const profile={damage:{rules:{ltEarly:{duckFar:true}}},context:{duckArc:{version:1,widthDegrees:30,offset:0,order:'left-to-right',confirmed:true,primaryTokenId:'p',otherTargets:targets}}};
 assert.equal(duckFootContextError(profile.context),null);let evaluated=0;
 const result=await resolveDuckFootChecks(profile,{failure:false},async()=>({roll:{total:++evaluated===1?6:8}}));
 assert.equal(result.checks[0].success,false);assert.equal(result.checks[0].chance,5);assert.equal(result.checks[1].chance,9);assert.equal(result.potentialHits,4);assert.equal(evaluated,4);
 const saved=JSON.stringify(result);profile.context.duckArc.otherTargets.reverse();assert.equal(JSON.stringify(result),saved);
});

test('P4 Russian UI identifies physical stock, debit and manual conditions without creating state',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),t=f.type(),before=JSON.stringify(f.actor.flags);
 const html=ltEarlyManagementHTML(f.current(),{ammoKey:t.key},[t],s=>String(s));assert.match(html,/Выстрел использует один подготовленный заряд/);assert.match(html,/Чистка: 2 минуты/);assert.match(html,/Malf−4/);assert.match(html,/Новая партия имеет запас 0/);assert.doesNotMatch(html,/\ufffd/);assert.equal(JSON.stringify(f.actor.flags),before);
});

test('charge places use a separate view without replacing recipe drafts or creating ammunition',async()=>{
 const f=await fixture(LT_TEN_EYED_MODES[0]),t=f.type(),before=JSON.stringify(f.actor.flags),ui={ammoKey:t.key,ltEarlyDrafts:{saved:{note:'preserve'}},ltEarlySettings:{crew:2}};
 const main=ltEarlyManagementHTML(f.current(),ui,[t],String),places=ltEarlyPlacesHTML(f.current(),ui,[t],String);
 assert.match(main,/data-inventory-action="lt-early-open-places"/);assert.doesNotMatch(main,/data-lt-place=/);assert.equal((places.match(/data-lt-place=/g)??[]).length,10);
 const root={querySelector:s=>s==='[data-lt-early-places]'?{}:s==='[name="ltEarly-quantity"]'?{value:'2'}:s==='[name="ltEarly-ready"]'?{checked:true}:null};captureLTEarlyInputs(root,ui);
 assert.equal(ui.ltEarlyQuantity,2);assert.equal(ui.ltEarlyReady,true);assert.deepEqual(ui.ltEarlySettings,{crew:2});assert.deepEqual(ui.ltEarlyDrafts,{saved:{note:'preserve'}});assert.equal(JSON.stringify(f.actor.flags),before);
});

test('saved per-mode overrides and native Acc plus scope survive the P4 source overlay',async()=>{
 const f=await fixture('WeCQz_2guzg8JWBca'),draft=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.get(f.record.id)});
 draft.overrides[f.p.modeId]={damage:'4d+1 pi+',range:'100/900',acc:5,bulk:-4,rcl:3,st:'12†'};await f.definitions.save(draft);
 const t=f.type();await f.stock(t);await f.components(t);await f.load(t);const p=f.profile();assert.equal(p.damage.formula,'4d+1 pi+');assert.equal(p.effective.range,'100/900');assert.equal(p.effective.acc,5);
 const r=await f.shoot();assert.equal(r.snapshot.profile.effective.bulk,-4);assert.equal(r.snapshot.profile.effective.rcl,3);
 const before=JSON.stringify(f.actor.flags),native=ltEarlyDamage({modeId:f.p.modeId,raw:{damage:'5d+1 pi+',range:'200/1000',acc:'5+2',rcl:'2/3'},attack:{path:'system.ranged.native'},weapon:f.current(),type:t,catalogs});
 assert.equal(native.formula,'5d+1 pi+');assert.equal(native.effectiveChanges.acc,5);assert.equal(native.effectiveChanges.rcl,'2/3');assert.equal(JSON.stringify(f.actor.flags),before);
});

test('Duck Foot B389 keeps the minimum chance and natural critical rules',async()=>{
 const profile={damage:{rules:{ltEarly:{duckFar:true}}},context:{duckArc:{version:1,widthDegrees:30,offset:0,order:'left-to-right',confirmed:true,primaryTokenId:'p',otherTargets:[{tokenId:'none',angle:0,purposeSkill:2},{tokenId:'crit',angle:1,purposeSkill:3}]}}};let calls=0;
 const r=await resolveDuckFootChecks(profile,{failure:true},async()=>{calls++;return {roll:{total:4}};});
 assert.equal(calls,1);assert.equal(r.checks[0].total,null);assert.equal(r.checks[1].criticalSuccess,true);assert.equal(r.potentialHits,1);
});

test('only empty Puckle devices transfer between fitted instances; parts and rounds stay at their owner',async()=>{
 const f=await fixture('WRLeJSlkTELYgEN_u'),t=f.type();await f.stock(t);await f.components(t);await f.load(t);
 const draft=new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged'});draft.selectModel(f.p.equipmentId);draft.modeIds=new Set([f.p.modeId]);await f.definitions.save(draft);await f.service.loadState();
 const target=f.actor.flags.world.gurpsAmmoManager.weapons[1],sourceId=f.current().id,magazineId=ltEarlySlots(f.current())[0].id;
 await assert.rejects(f.service.transferMagazine(sourceId,target.id,magazineId),/разрядите/);
 await f.tx('unload',{magazineId,amount:9});const parts=structuredClone(f.current().ltEarly.components);await f.service.transferMagazine(sourceId,target.id,magazineId);
 assert.deepEqual(f.current().ltEarly.components,parts);assert.equal(ltEarlySlots(f.current()).length,0);assert.equal(target.ammunitionInventory.magazines.length,1);
 const after=f.actor.flags.world.gurpsAmmoManager.weapons[1];assert.equal(after.ammunitionInventory.magazines.length,2);assert.equal(after.totalAmmo,0);
});

test('native bound Ten-Eyed follows the physical sequence and survives a serialized reload without separate carriers',async()=>{
 const f=await fixture(LT_TEN_EYED_MODES[4]),t=f.type();await f.stock(t);await f.components(t);await f.load(t);
 const w=f.current();delete w.standaloneWeaponId;delete w.standaloneModeId;w.catalogModeId=LT_TEN_EYED_MODES[0];w.attackRef={path:'system.ranged.p4',uuid:'native-p4'};
 f.actor.system.ranged={p4:{name:'Native Ten-Eyed',mode:'1st Shot',uuid:'native-p4',damage:'2d pi++',range:'40/400',rof:'1',rcl:'3',acc:1,bulk:-7,st:'11†',level:20}};
 const raw=f.actor.system.ranged.p4,attack={...raw,path:'system.ranged.p4',data:raw};
 const old=globalThis.OleGURPSQOL.weaponCatalogBindings;globalThis.OleGURPSQOL.weaponCatalogBindings={analyzeMode:()=>({status:'confirmed',binding:{confirmed:true,modeId:LT_TEN_EYED_MODES[0],equipmentId:f.p.equipmentId}})};
 try{for(let n=0;n<10;n++){
  if(n===5){await f.tx('lt-early-flip',{readyConfirmed:true});f.actor.flags=JSON.parse(JSON.stringify(f.actor.flags));}
  const r=await f.service.executeShot({weaponId:w.id,attackId:crypto.randomUUID(),prepare:({state,ammunition})=>({amount:1,profile:resolveRuntimeAttackProfile({actor:f.actor,attack,state,weaponId:w.id,ammunition,context:{physicalDistance:1,physicalShots:1}})}),execute:async({profile})=>{validateWeaponExecution(f.current(),profile);return {rolled:true,messageId:'native-'+n};}});
  assert.equal(r.spent,1);assert.equal(r.snapshot.profile.binding.confirmed.modeId,LT_TEN_EYED_MODES[n%5]);assert.equal(r.receipt.ltEarlyCharges[0].place,n);
 }assert.equal(f.actor.flags.world.gurpsAmmoManager.weapons.length,1);assert.equal(ltEarlySlots(f.current()).reduce((n,m)=>n+m.rounds,0),0);
 }finally{if(old)globalThis.OleGURPSQOL.weaponCatalogBindings=old;else delete globalThis.OleGURPSQOL.weaponCatalogBindings;}
});
