import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,catalogs,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
import {resolveCombatCalculation} from '../scripts/tools/combat-calculation-engine.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {fireControlWeaponTitle} from '../scripts/tools/weapon-profile-presentation.js';
import {verifyLPFireControlLayout} from './helpers/lp-fire-ui-browser-assertions.mjs';
import {createFireControlContext} from '../scripts/tools/fire-control-context.js';
import {FireService} from '../scripts/tools/fire-service.js';
const {buildFireSkillBreakdownHtml}=await import('../scripts/tools/ammo.js');
const amr='WlstnlxI_Mm-2UJf0',magnum='WIAo1otMCstnbi4Dv',main='WtM51JNSpOUIy3Eo1',shotgun='WRvS5pz3LMCzqQyiZ';
const ht=catalogs.getCatalog('weapons').equipment.find(e=>e.source==='HT'&&e.name==='AI AW, 7.62x51mm').modes.find(m=>m.combat_type==='ranged').weapon_mode_id;
const lt='W4gnbkfxzHAYre3kO';
const configure=async(fx,variant)=>{const s=fx.state();s.weapons[0].executionRequest={variant,modeId:fx.carrier.standaloneModeId};await fx.service.saveState(s);};
const ready=async(id=amr,variant='ordinary')=>{const fx=await fixture(id);if(variant!=='ordinary')await configure(fx,variant);await load(fx,fx.candidates().find(t=>!t.recipe&&!t.unavailable));return fx;};
function appFor(fx){const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:withRuntimeAmmoStats(fx.attack(),fx.actor),mode:'weapon',fireState:{}});return app;}
function runtime(actor){const messages=[];let native;
  return {messages,get native(){return native;},value:{game:{user:game.user,settings:{get:()=>null}},canvas:{tokens:{placeables:[]}},
    GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
    Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(path,data)=>{assert.equal(path,'systems/gurps/templates/die-roll-chat-message.hbs');native=data;return `<div class="native-result">3d6: ${data.rtotal}; skill ${data.finaltarget}; margin ${data.margin}; ${data.followon}</div>`;},
    ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async data=>{const m={...data,id:crypto.randomUUID(),async setFlag(s,k,v){this.flags??={};this.flags[s]??={};this.flags[s][k]=structuredClone(v);}};messages.push(m);return m;}}}};
}

for(const [name,id,variant]of [['UT ordinary',magnum,'ordinary'],['ETC AMR',amr,'etc'],['LP AMR',amr,'lp'],['HT',ht,'ordinary'],['LT',lt,'ordinary']])
test(name+' actual prepared hit message retains the roll and Damage link without either duplicated skill section',async()=>{
  const fx=await ready(id,variant);if(variant==='lp')await fx.service.setLPFireMode(fx.carrier.id,'boosted');
  const calculation=resolveCombatCalculation({combatType:'ranged',baseAttackLevel:13,channels:[{id:'weaponBond',label:'Weapon Bond',value:1},{id:'range',label:'Range',value:-2}]});
  const r=runtime(fx.actor),attackId=crypto.randomUUID(),initial=JSON.stringify(fx.profile());
  const result=await fx.service.executeShot({weaponId:fx.carrier.id,attackId,prepare:()=>({amount:1,profile:fx.profile()}),execute:({profile})=>executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),
    attackProfile:profile,shotSnapshot:createShotSnapshot(profile,{attackId,resourceTiming:'after-attack'}),combatCalculation:calculation,baseSkill:13,effectiveSkill:calculation.effectiveSkill,
    physicalShots:1,effectiveRoF:1,rcl:1,consumeAction:false,runtime:r.value})});
  const html=result.message.content;
  assert.doesNotMatch(html,/Расчёт навыка|Навык автономной атаки|olegurps-combat-channel-breakdown|olegurps-standalone-skill/);
  assert.match(html,/native-result/);assert.match(html,/3d6: 10; skill 12; margin 2/);assert.match(html,/D:/);
  assert.equal(result.rollData.origtarget,13);assert.equal(result.rollData.finaltarget,12);assert.equal(result.rollData.rtotal,10);assert.equal(result.rollData.failure,false);
  assert.deepEqual(result.rollData,r.native);assert.match(html,/Weapon Bond/);assert.match(html,/Range/);
  assert.deepEqual(result.snapshot.profile.damage,result.profile.damage);assert.equal(result.snapshot.profile.damage.formula,JSON.parse(initial).damage.formula);
  assert.equal(result.spent,1);assert.equal(result.snapshot.attackId,attackId);assert.deepEqual(fx.actor.system,fx.before);
  const privateCard=buildFireSkillBreakdownHtml({baseSkillName:'Guns/TL9 (Rifle)',baseSkill:13,combatCalculation:calculation},escapePayload);
  assert.match(privateCard,/Расчёт навыка/);assert.match(privateCard,/Guns\/TL9 \(Rifle\)/);assert.match(privateCard,/Weapon Bond/);assert.doesNotMatch(privateCard,/<details[^>]*\bopen/);
});

test('Weapon Bond is still a single +1 through the shared Fire Control calculation',async()=>{
  const previous=globalThis.GURPS;globalThis.GURPS={ModifierBucket:{modifierStack:{modifierList:[]}}};
  try {
  const fx=await ready();fx.actor.system.ads={bond:{name:'Weapon Bond'}};const app=appFor(fx),attack={...app.attack,weaponBond:true};
  const context=createFireControlContext({token:{actor:fx.actor},fireService:new FireService({actor:fx.actor})});
  const options={shots:1,hitLocationId:'torso',rangeIndex:0,visibility:{mode:'normal'}};
  const targeting={getSelection:()=>({zoneId:'torso',penalty:0})},bands=[{label:'2 yards',penalty:0,distance:2}];
  const withBond=context.calculateEffectiveFireSkillDetails(attack,options,bands,targeting),without=context.calculateEffectiveFireSkillDetails({...attack,weaponBond:false},options,bands,targeting);
  assert.equal(withBond.effectiveSkill,without.effectiveSkill+1);
  assert.equal(withBond.combatCalculation.modifiers.filter(m=>m.channel==='weaponBond'&&m.value===1).length,1);
  } finally {globalThis.GURPS=previous;}
});

for(const [variant,damage,range,suffix]of [['ordinary','15d pi+','2,000/9,000',''],['etc','6dx4 pi+','3000/13500',' - ETC'],['lp','6dx3 pi+','2600/11700',' - LP']])
test(variant+' title owns caliber/execution while stats keep exact Damage and Range',async()=>{
  const fx=await ready(amr,variant);if(variant==='lp')await fx.service.setLPFireMode(fx.carrier.id,'boosted');const app=appFor(fx),name=fx.weapon().name,before=JSON.stringify(fx.state());
  const title='Anti-Materiel Rifle, 15mmCL'+suffix;for(let i=0;i<4;i++){assert.equal(app._getAttackTitle(),title);assert.equal(app.title,'Огонь — '+title);app.attack=withRuntimeAmmoStats(app.attack,fx.actor);}
  const stats=app._getAttackStatsText('3');assert.ok(stats.includes(damage));assert.ok(stats.includes('Range '+range));assert.match(stats,/магазин/);assert.match(stats,/RoF 3/);assert.match(stats,/Acc 6/);assert.match(stats,/Прицел 3/);assert.match(stats,/Bulk -6/);assert.match(stats,/Rcl 4/);
  assert.doesNotMatch(stats,/15mmCL| - ETC| - LP/);assert.equal(JSON.stringify(fx.state()),before);assert.equal(fx.weapon().name,name);
});
test('title suffix cannot double and unsupported or ordinary profiles do not acquire an execution',()=>{
  assert.equal(fireControlWeaponTitle('Rifle, 15mmCL - LP - LP',{lp:true,physicalFamily:'15mmCL'}),'Rifle, 15mmCL - LP');
  assert.equal(fireControlWeaponTitle('Rifle, 15mmCL - ETC',{physicalFamily:'15mmCL'}),'Rifle, 15mmCL');
  assert.equal(fireControlWeaponTitle('Rifle, 7.62x51mm',{physicalFamily:'7.62\u00d751mm'}),'Rifle, 7.62x51mm');
  assert.equal(fireControlWeaponTitle('Arbalest',{physicalFamily:'Bolt'}),'Arbalest');
});
test('UAW main/shotgun titles follow the selected physical barrel and only main has LP controls',async()=>{
  const fx=await ready(main,'lp');await fx.service.loadState();const state=fx.state(),second=state.weapons.find(w=>w.standaloneModeId===shotgun);
  const {readStandaloneAttack}=await import('../scripts/tools/standalone-attack-service.js');const primary=appFor(fx);
  assert.equal(primary._getAttackTitle(),'Urban Assault Weapon, 10mmCLP - LP');assert.match(primary._buildLPContent(),/lpFireMode/);
  const other=Object.create(FirePreparationApp.prototype);Object.assign(other,{actor:fx.actor,weapon:second,attack:withRuntimeAmmoStats(readStandaloneAttack(fx.actor,fx.record.id,shotgun),fx.actor),mode:'weapon'});
  assert.equal(other._getAttackTitle(),'Urban Assault Weapon, 18.5mmPC');assert.equal(other._buildLPContent(),'');assert.equal(other.attack.data.damage,'4d+4 pi++');
});
for(const [mode,damage,range,units]of [['standard','4d+1 pi++','235/2,600',4],['boosted','5d+1 pi++','306/3380',6],['low-velocity','2d pi++','118/1300',1]])
test('compact '+mode+' selector updates profile and fuel requirement without spending',async()=>{
  const fx=await ready(magnum,'lp'),app=appFor(fx),fuel=fx.weapon().lpFuel,ammo=fx.weapon().ammunitionInventory;
  Object.assign(app,{_onActorUpdate(){this.updated=true;},render:async()=>{}});
  await app._onInput({type:'change',target:{name:'lpFireMode',value:mode}});
  assert.equal(app.attack.data.damage,damage);assert.equal(app.attack.data.range,range);assert.equal(fx.profile().weaponConfiguration.unitsPerShot,units);
  const html=app._buildLPContent();assert.match(html,/gam-fire-lp-controls/);assert.match(html,new RegExp('value="'+mode+'" selected'));
  assert.match(html,/Standard/);assert.match(html,/Boosted/);assert.match(html,/Low Velocity/);
  assert.deepEqual(fx.weapon().lpFuel,fuel);assert.deepEqual(fx.weapon().ammunitionInventory,ammo);
});
for(const variant of ['ordinary','etc'])test(variant+' omits LP controls',async()=>{const fx=await ready(amr,variant);assert.equal(appFor(fx)._buildLPContent(),'');});

test('LP markup sits between the modifier row and range section; new controls leave Aim markup intact',async()=>{
  const source=await readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');
  const start=source.indexOf('  _buildContent(fireState)'),body=source.slice(start),lp=body.indexOf('${this._buildLPContent()}');
  assert.ok(lp>body.indexOf('data-rof-container'));assert.ok(lp<body.indexOf('gam-fire-range-heading'));assert.equal((body.match(/\$\{this\._buildLPContent\(\)\}/g)??[]).length,1);
  assert.match(source,/\.gam-fire-lp-controls select \{[^}]*width:auto/);assert.match(source,/\.gam-fire-lp-controls > label \{[^}]*flex-wrap:wrap/);
  const narrow=source.slice(source.indexOf('@container olegurps-fire (max-width: 560px)'));
  assert.match(narrow,/\.gam-fire-summary \{[^}]*flex-direction:column/);
  assert.match(narrow,/\.gam-standalone-attack \.gam-fire-summary > \.gam-fire-summary-main,\s*\.gam-standalone-attack \.gam-fire-summary > \.gam-fire-skill \{ flex:0 0 auto; \}/);
  assert.match(body,/class="gam-fire-aim"/);assert.match(body,/name="aimSeconds"/);assert.match(body,/data-aim-preview/);
});
function geometry(width){
  const element=(left,top,w,h)=>({getBoundingClientRect:()=>({left,top,right:left+w,bottom:top+h,width:w,height:h}),clientWidth:w,scrollWidth:w});
  const root=element(0,0,width,800),controls=element(20,200,width-40,70),modifier=element(20,150,width-40,40),distance=element(20,280,width-40,50),label=element(20,206,76,22),select=element(104,200,160,34);
  controls.querySelector=s=>s==='label > span'?label:select;root.querySelector=s=>({'.gam-fire-lp-controls':controls,'[data-total-modifier]':{closest:()=>modifier},'.gam-fire-range-heading':distance})[s];
  return {root,controls,select,distance,element};
}
for(const width of [900,620,460])test('shared browser geometry contract at '+width+' px',()=>{assert.ok(verifyLPFireControlLayout(geometry(width).root).select.width<width/2);});
test('geometry contract detects the old full-width selector and wrong vertical placement',()=>{
  const fx=geometry(620);fx.select.getBoundingClientRect=fx.element(20,200,580,34).getBoundingClientRect;assert.throws(()=>verifyLPFireControlLayout(fx.root),/compact/);
  const moved=geometry(620);moved.distance.getBoundingClientRect=moved.element(20,180,580,50).getBoundingClientRect;assert.throws(()=>verifyLPFireControlLayout(moved.root),/precedes distance/);
});
test('Russian UI survives Foundry ru/en and existing dictionaries retain parity',async()=>{
  const fx=await ready(magnum,'lp'),app=appFor(fx);for(const lang of ['ru','en']){game.i18n.lang=lang;assert.match(app._buildLPContent(),/Режим LP/);assert.match(app._getAttackStatsText('3'),/Урон/);assert.equal(app._getAttackTitle(),'Magnum Pistol, 15mmCLP - LP');}
  game.i18n.lang='ru';const [ru,en]=await Promise.all(['ru','en'].map(l=>readFile(new URL('../lang/'+l+'.json',import.meta.url),'utf8').then(JSON.parse)));assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
});
