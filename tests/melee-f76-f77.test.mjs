import test from 'node:test';
import assert from 'node:assert/strict';
import {committedStrongEligible,defensiveAttackContext,meleeMartialMessages} from '../scripts/tools/melee-martial-rules.js';
import {prepareEffectiveMeleeDamage,executeNativeMeleeDamage,freezeMeleeAttackProfile,applyMartialArtsDamage} from '../scripts/tools/melee-service.js';
globalThis.foundry={utils:{deepClone:structuredClone},applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{id:'qa',targets:new Set()}};
const {MeleeAssistantApp}=await import('../scripts/tools/melee-assistant-app.js');
const {getMeleeAttackSlots}=await import('../scripts/tools/melee-attack-slots.js');
const actor={id:'qa-actor',system:{swing:'2d+1',thrust:'1d',attributes:{ST:{value:14}},ads:{}}};
const derived=(motion='sw',adds='+1',type='cut')=>({name:'Same weapon',mode:'Strike',level:16,parry:'11',damage:motion+adds+' '+type,
 damageAction:{type:'deriveddamage',derivedformula:motion,formula:adds,damagetype:type}});
const fixed=(dice='8d(5)',type='burn')=>({name:'Same weapon',mode:'Strike',level:16,parry:'11',damage:dice+' '+type,
 damageAction:{type:'damage',formula:dice,damagetype:type}});
function appFor(attack){
 const app=Object.create(MeleeAssistantApp.prototype);app.actor=actor;app.sourceAttack=attack;app.attack=structuredClone(attack);
 app.fireState={allOutAttack:false,allOutAttackMode:'determined',rapidStrike:false,rapidStrikeMastery:false,moveAndAttack:false,
 committedAttack:true,committedMode:'strong',committedSteps:false,defensiveAttack:false,telegraphicAttack:false,
 manualModifier:'0',deceptiveAttack:'0',evaluate:'0',governingSpecialty:'',dicePlusAdds:false,hitLocation:{zoneId:'torso',regionId:null}};
 app.targetingService={getDefaultSelection:()=>({zoneId:'torso',regionId:null}),getSelection:id=>({zoneId:id,regionId:null,label:'Torso',penalty:0,random:false}),getZone:()=>({})};
 app.targetedAttackContext={specialtyOptions:[],getSkillLevel:()=>16,resolve:()=>null};
 app._attackSlots=getMeleeAttackSlots(app.fireState);app._attackSlotStates=app._attackSlots.map(()=>({manualModifier:'0',deceptiveAttack:'0',telegraphicAttack:false,hitLocation:{zoneId:'torso',regionId:null},blindFighting:null}));
 app._attackConfigurationCache=new Map();app._activeAttackSlot=0;
 app._refreshStandaloneAttack=()=>{};app._refreshHitLocationContent=()=>{};app._updateAttackSlotControls=()=>{};app._updateMeleePreview=()=>{};
 return app;
}
const cases=[['sw ordinary',derived(),'2d+3 cut',true],['thr ordinary',derived('thr','','imp'),'1d+1 imp',true],
 ['Force Sword',fixed(),'8d(5) burn',false],['Force Blade',fixed('6d(5)'),'6d(5) burn',false],['Force Glaive',fixed('9d(5)'),'9d(5) burn',false],
 ['fixed crushing',fixed('3d','cr'),'3d cr',false],['fixed impaling',fixed('2d','imp'),'2d imp',false],['fixed electrical',fixed('1d-3','burn'),'1d-3 burn',false],
 ['unpowered Force Glaive',Object.assign(derived('sw','+2','cr'),{meleeProfile:{motion:'swing',utOrdinary:{unpowered:true}}}),'2d+4 cr',true]];
for(const [name,attack,expected,eligible] of cases){
 test('F77 source and all preparation routes: '+name,async()=>{
  const before=JSON.stringify({actor,attack});assert.equal(committedStrongEligible(attack),eligible);
  const app=appFor(attack),opts=app._getEffectiveDamageOptions();assert.equal(opts.committedStrong,eligible);
  const d=await prepareEffectiveMeleeDamage({...opts,committedStrong:true});assert.equal(d.formula,expected);
  assert.equal(d.evidence.martial.committedStrong,eligible);
  const slot=app._createAttackSnapshots()[0];assert.equal(slot.damageData.committedStrong,eligible);
  assert.equal(slot.martialSummary.includes('+1'),eligible);
  const frozen=freezeMeleeAttackProfile({actor,attack,preparedDamage:d});assert.equal(frozen.damage.formula,expected);
  const calls=[];globalThis.GURPS={SetLastActor(){},DamageChat:{create:async(...args)=>calls.push(args[1])}};
  await executeNativeMeleeDamage({actor,attack,committedStrong:true});assert.equal(calls[0],expected.split(' ')[0]);
  await executeNativeMeleeDamage({actor,preparedDamage:{action:frozen.damage.rules.meleeSnapshot.action},committedStrong:true});
  assert.equal(calls[1],calls[0]);assert.equal(JSON.stringify({actor,attack}),before);
 });
}
test('F77 linked fixed damage never gains Strong from its ST-based primary',async()=>{
 const a=derived();a.damageAction.next=fixed('2d','burn').damageAction;
 const d=await prepareEffectiveMeleeDamage({actor,attack:a,committedStrong:true});assert.equal(d.formula,'2d+3 cut, 2d burn');
});
test('F77 materialized/imported numeric damage and explicit fixed overrides cannot gain another bonus',async()=>{
 const a=derived(),d=await prepareEffectiveMeleeDamage({actor,attack:a,committedStrong:true});
 for(const input of [{...a,damage:d.formula,sourceDamage:a.damage,damageAction:d.action},
  {...a,damage:'2d+3 cut',damageAction:{type:'damage',formula:'2d+3',damagetype:'cut'},meleeProfile:{motion:'swing'}},
  {...a,damage:'4d imp',hasMeleeDamageOverride:true,damageAction:fixed('4d','imp').damageAction}]){
   assert.equal((await prepareEffectiveMeleeDamage({actor,attack:input,committedStrong:true})).formula,input.damage);
 }
 assert.equal(applyMartialArtsDamage('8d(5)',{committedStrong:true}),'8d(5)');
});
test('F77 fixed combat profile outranks a stale derived action',async()=>{
 const a={...derived(),meleeProfile:{motion:'fixed'}};
 assert.equal(committedStrongEligible(a),false);assert.equal((await prepareEffectiveMeleeDamage({actor,attack:a,committedStrong:true})).formula,'2d+2 cut');
});
test('F77 nested native derived action is authoritative, while opaque numeric imports are not',async()=>{
 const a=derived();a.damage='2d+2 cut';a.action={damage:a.damageAction};delete a.damageAction;
 assert.equal(committedStrongEligible(a),true);
 assert.equal((await prepareEffectiveMeleeDamage({actor,attack:a,committedStrong:true})).formula,'2d+3 cut');
});
test('F77 old frozen fixed Damage and legacy selected defense are replayed verbatim, never repaired or doubled',async()=>{
 const legacy={action:{type:'damage',formula:'8d+1(5)',damagetype:'burn'},evidence:{defensiveEffect:{kind:'balanced',option:'block',bonus:1}}},before=JSON.stringify(legacy),calls=[];
 globalThis.GURPS={SetLastActor(){},DamageChat:{create:async(...args)=>calls.push(args[1])}};
 for(let i=0;i<2;i++)await executeNativeMeleeDamage({actor,attack:derived(),preparedDamage:legacy,committedStrong:true});
 assert.deepEqual(calls,['8d+1(5)','8d+1(5)']);assert.equal(JSON.stringify(legacy),before);
});
for(const [name,attack,expected] of [['sw',derived(),'2d+4 cut'],['thr',derived('thr','','imp'),'1d+2 imp'],['force',Object.assign(fixed(),{meleeProfile:{motion:'fixed'}}),'8d(5) burn']]){
 test('F77 All-Out Strong unchanged: '+name,async()=>assert.equal((await prepareEffectiveMeleeDamage({actor,attack,allOutStrong:true})).formula,expected));
}
const defenseCases=[['balanced',{...derived(),parry:'11'},'balanced'],
 ['fencing',{...derived(),parry:'11F'},'balanced'],
 ['unbalanced',{...derived(),parry:'11U'},'unbalanced'],
 ['kick',{...derived('thr','+1','cr'),mode:'Kick',parry:'11'},'kick'],
 ['no Parry',{...derived(),parry:'No'},'noParry'],
 ['unknown',{...derived(),parry:''},'unknown']];
for(const [name,attack,kind] of defenseCases)test('F76 compact hint only; no selected defense in new snapshot: '+name,()=>{
 const app=appFor(attack);app.fireState.committedAttack=false;app.fireState.defensiveAttack=true;app.fireState.defensiveBonus='block';
 const context=app._getDefensiveContext();assert.equal(context.kind,kind);
 assert.deepEqual(Object.keys(context).sort(),['hint','kind']);assert.ok(context.hint.length<=110);assert.doesNotMatch(context.hint,/[\r\n]/);
 const html=app._buildMartialArtsOptions(),slot=app._createAttackSnapshots()[0];
 const row=html.split('name="defensiveAttack"')[1].split('</div>')[0];
 assert.doesNotMatch(row,/<select|<small|<p|data-defensive-detail|defensiveBonus/);assert.match(row,/data-tooltip=/);assert.match(row,/>\(\?\)<\/span>/);
 assert.equal(slot.martialSummary,'');assert.deepEqual(slot.maneuver,{type:'defensiveAttack'});
 for(const key of ['defensiveEffect','defensiveBonus']){assert.equal(Object.hasOwn(slot,key),false);assert.equal(Object.hasOwn(app.getShotOptions(),key),false);}
 if(['kick','noParry','unknown'].includes(kind))assert.doesNotMatch(context.hint,/\+1/);
 if(kind==='unbalanced')assert.match(context.hint,/другим оружием Parry\/Block \+1/);
});
test('F76 switching modes and grips recomputes the short hint without storing defense choices',()=>{
 const app=appFor(derived());app.fireState.defensiveAttack=true;app.fireState.committedAttack=false;app.fireState.defensiveBonus='block';
 for(const attack of defenseCases.map(c=>c[1])){
  app.attack=structuredClone(attack);assert.equal(app._getDefensiveContext().kind,defensiveAttackContext(attack).kind);
  const slot=app._createAttackSnapshots()[0];assert.equal(Object.hasOwn(slot,'defensiveBonus'),false);
 }
 app.attack={...derived(),meleeProfile:{modeId:'wKrl1D1iujaCX9ssm',parry:'No',grip:'test-no-parry'}};
 assert.equal(app._getDefensiveContext().kind,'noParry');
 const a=appFor(defenseCases[0][1]),b=appFor(defenseCases[2][1]);assert.equal(a._getDefensiveContext().kind,'balanced');assert.equal(b._getDefensiveContext().kind,'unbalanced');
});
test('F76 item names alone do not establish a kick or balanced weapon',()=>{
 assert.equal(defensiveAttackContext({name:'Kick'}).kind,'unknown');
 assert.equal(defensiveAttackContext({name:'Balanced Sword'}).kind,'unknown');
 assert.equal(defensiveAttackContext({...derived(),mode:'Kick',meleeProfile:{motion:'swing',parry:'11U',modeId:'unknown'}}).kind,'unbalanced');
});
test('F76 exact selected source mode outranks a numeric Parry override or another modes U marker',()=>{
 assert.equal(defensiveAttackContext({parry:'11',meleeProfile:{modeId:'wFmnElv38Dl7vCHz8',parry:'11'}}).kind,'unbalanced');
 assert.equal(defensiveAttackContext({parry:'11U',meleeProfile:{modeId:'wKrl1D1iujaCX9ssm',parry:'11U'}}).kind,'balanced');
});
test('F76/F77 RU and EN keys stay equal; module UI remains Russian under either Foundry language',()=>{
 assert.deepEqual(Object.keys(meleeMartialMessages.ru).sort(),Object.keys(meleeMartialMessages.en).sort());
 for(const lang of ['ru','en']){game.i18n={lang};assert.match(defensiveAttackContext(derived()).hint,/Урон:/);assert.match(appFor(derived())._buildMartialArtsOptions(),/data-defensive-help data-tooltip="Урон:/);}
});
