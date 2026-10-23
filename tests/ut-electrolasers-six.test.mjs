import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {ELECTROLASER_PROFILES,electrolaserControlsHTML,electrolaserDamage} from '../scripts/ut-electrolaser-source.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {readWeaponBattery,weaponPowerCost,validateWeaponExecution,weaponPreparationReason} from '../scripts/tools/weapon-power.js';
import {standaloneAvailableRounds} from '../scripts/tools/standalone-attack-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome,electricalResistanceLocations,rollResistance} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {resolveStandaloneSkill} from '../scripts/tools/standalone-skill-service.js';
const expected=[
  ['WoHuRCULuiv3fUH2l','C',1,36,-4,'1d-3 burn','4','40/80','3','4','-2',1800],
  ['W80F3RfUK8r_7cObU','B',1,22,-2,'1d-3 burn','2','10/20','1','3','-1',250],
  ['WX_LmRHi1yv6wEKcu','C',2,72,-4,'1d-3 burn','8','160/470','3','4†','-4',3900],
  ['WiFzne2T6efUmwoS_','D',1,83,-6,'1d-2 burn','8','400/1,100','1','10†','-5',20000],
  ['WjKmnjb1bE4ivcTYx','C',1,66,-3,'1d-3 burn','4','90/270','1','4',null,1300],
  ['Wukk0nDnRffBu-KpC','D',1,100,-8,'1d-1 burn','12','600/1,900','10','18M','-8',70000]
];
async function fixture(id,{host=true}={}){
  const f=await gaussFixture(id,{host:false});
  if(host&&ELECTROLASER_PROFILES[id].underbarrel){
    const d=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.list()[0]});
    for(const[k,v]of Object.entries({hostBulk:'-5',st:'10',acc:'7+2'}))d.setOverride(id,k,v);
    await f.definitions.save(d);await f.service.loadState();
  }
  f.configure=changes=>f.service.setElectrolaserConfiguration(f.weapon().id,changes);
  return f;
}
const native=(margin,{failure=margin<0,cs=false,cf=false}={})=>({finaltarget:12,rtotal:12-margin,margin,failure,isCritSuccess:cs,isCritFailure:cf});
for(const[id,cell,cells,n,penalty,burn,acc,range,rof,st,bulk,cost]of expected){
  const name=ELECTROLASER_PROFILES[id].name;
  test(name+': UT120 stats, source set, skills and no cartridges',async()=>{
    const f=await fixture(id),p=ELECTROLASER_PROFILES[id],m=catalogs.getMode(id);
    for(const[k,v]of Object.entries({accuracy:acc,range,rate_of_fire:rof,strength:st,bulk,recoil:'1',shots:n+'('+p.reload+')'}))assert.equal(m.stats[k],v,k);
    assert.equal(p.cost,cost);assert.equal(p.modifier,penalty);assert.equal(p.burn,burn);
    assert.equal(m.governing_skill.skill.name,p.specialty==='Beams'?'Gunner':'Beam Weapons');
    assert.equal(m.governing_skill.skill.specialization,p.specialty);assert.equal(catalogs.getEquipmentForMode(id).tech_level,'9');
    assert.deepEqual(readWeaponBattery(f.weapon()),{type:cell,cells,capacity:n,charge:n,nonRechargeable:false});
    assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.attack().readinessReason,null);
    assert.equal(f.profile().damage.nativeSafe,true);assert.equal(f.profile().damage.formula,burn);assert.equal(f.profile().diceAdds.applied,false);
  });
  test(name+': Standard linked burn, HT and historical GGA link',async()=>{
    const f=await fixture(id),r=await f.shoot(),e=messageResistanceEffect(r.message);
    assert.ok(r.rolled);assert.match(r.rollData.followon,/D:/);assert.equal(r.snapshot.profile.damage.formula,burn);
    assert.equal(e.modifier,penalty);assert.equal(e.armorDivisor,2);assert.equal(e.mode,'standard');assert.ok(e.hits>=1);
    assert.equal(r.receipt.power.spent,1);assert.equal(readWeaponBattery(f.weapon()).charge,n-1);assert.equal(r.receipt.magazineId,null);
    assert.equal(withRuntimeAmmoStats(f.attack(),f.actor).data.damage,burn);
    assert.deepEqual(r.message.whisper,[]);assert.doesNotMatch(JSON.stringify(e),/actorId|tokenId|targetId/);
    assert.match(r.message.content,/Режим: Standard/);assert.match(r.message.content,/Ready/);
    const history=structuredClone(r.snapshot);await f.configure({electrolaserMode:'kill',electrolaserEnvironment:'vacuum'});
    assert.deepEqual(r.snapshot,history);assert.equal(messageResistanceEffect(r.message).mode,'standard');
  });
  test(name+': Kill full burst, duplicate and cancellation',async()=>{
    const f=await fixture(id),before=f.state();await f.configure({electrolaserMode:'kill'});
    assert.equal(readWeaponBattery(f.weapon()).charge,n);assert.equal(weaponPowerCost(f.weapon(),Number(rof)),2*Number(rof));
    const ready=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),ready);
    const attackId=crypto.randomUUID(),results=await Promise.all([f.shoot(Number(rof),{attackId}),f.shoot(Number(rof),{attackId})]);
    const r=results.find(r=>r.rolled);assert.equal(r.receipt.power.spent,Number(rof)*2);assert.equal(r.receipt.power.physicalShots,Number(rof));
    assert.equal(readWeaponBattery(f.weapon()).charge,n-Number(rof)*2);assert.equal(results[0],results[1]);
    assert.equal((await f.shoot(Number(rof),{attackId})).duplicate,true);assert.equal(readWeaponBattery(f.weapon()).charge,n-Number(rof)*2);
    assert.match(r.message.content,/Режим: Kill/);assert.match(r.message.content,/Расход: 2/);assert.notDeepEqual(f.state(),before);
  });
  test(name+': odd remainder limits Kill, insufficient energy and over-RoF rejected',async()=>{
    const f=await fixture(id);await f.service.spendWeaponCharge(f.weapon().id,n-3);await f.configure({electrolaserMode:'kill'});
    assert.equal(standaloneAvailableRounds(f.weapon()),1);assert.equal(f.attack().readinessReason,null);
    const before=f.state();await assert.rejects(()=>f.shoot(2));assert.deepEqual(f.state(),before);
    await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,1);assert.equal(standaloneAvailableRounds(f.weapon()),0);
    await assert.rejects(()=>f.shoot(),/Недостаточно/);await f.configure({electrolaserMode:'standard'});await f.shoot();
    assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot(),/Недостаточно/);
  });
  test(name+': NR replacement, stale save, editing and reload preserve charge/mode',async()=>{
    const f=await fixture(id),stale=f.state();await f.configure({electrolaserMode:'kill'});await f.shoot();
    await f.service.saveState(stale);await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,n-2);assert.equal(f.weapon().electrolaserMode,'kill');
    const draft=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.list()[0]});await f.definitions.save(draft);await f.service.loadState();
    assert.equal(readWeaponBattery(f.weapon()).charge,n-2);assert.equal(f.weapon().electrolaserMode,'kill');
    await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).capacity,n*2);assert.equal(readWeaponBattery(f.weapon()).cells,cells);
    await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,n*2-2);
    const state=f.state();delete state.weapons[0].electrolaserBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);await f.service.loadState();
    assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());
  });
  test(name+': weather and vacuum change the saved profile, no HT in vacuum',async()=>{
    const f=await fixture(id);
    for(const[environment,mod]of [['air',0],['humid',-2],['rain',-6],['vacuum',0]]){
      await f.configure({electrolaserEnvironment:environment,electrolaserVisibilityDR:2});const p=f.profile();
      assert.equal(p.damage.rules.electrolaser.weatherPenalty,mod);assert.equal(p.damage.rules.electrolaser.visibilityDR,2);
      assert.equal(p.damage.formula,environment==='vacuum'?'1d-3 burn':burn);
      assert.equal(!!p.damage.rules.resistanceEffect,environment!=='vacuum');
    }
    const r=await f.shoot();assert.equal(messageResistanceEffect(r.message),null);assert.match(r.rollData.followon,/D:/);
  });
  test(name+': DR, distance, stun, recovery, Kill and Electrical',async()=>{
    const f=await fixture(id);await f.configure({electrolaserMode:'kill'});const e=f.profile().damage.rules.resistanceEffect;
    assert.equal(visionResistanceModifier(e,{distance:'within',dr:0,electrical:false}).modifier,penalty);
    assert.equal(visionResistanceModifier(e,{distance:'beyond',dr:5,electrical:false}).modifier,penalty+5);
    for(const margin of [-1,-4,-5,-8,0,3])for(const electrical of [false,true]){
      const o=resistanceOutcome(e,native(margin),{electrical});
      assert.equal(o.success,margin>=0);
      if(margin<0)assert.match(o.consequence,new RegExp('HT'+penalty+'.*без бонуса DR'));
      assert.equal(/Heart Attack/.test(o.consequence),margin<=-5&&!electrical);
      assert.equal(/до ремонта/.test(o.consequence),margin<=-5&&electrical);
    }
    assert.doesNotMatch(resistanceOutcome({...e,mode:'standard'},native(-8)).consequence,/Heart Attack/);
    assert.equal(resistanceOutcome(e,native(-5,{cs:true})).success,true);
  });
  test(name+': safe configuration boundary and compact Russian chat',async()=>{
    const f=await fixture(id),p=f.profile();
    await assert.rejects(()=>f.shoot(Number(rof)+1),/RoF/);
    for(const executionVariant of ['etc','lp','gauss']){
      const state=f.state();state.weapons[0].executionVariant=executionVariant;assert.equal(f.profile({state}).damage.nativeSafe,false);
    }
    await f.configure({electrolaserMode:'kill'});assert.throws(()=>validateWeaponExecution(f.weapon(),p),/изменилась/);
    for(const lang of ['ru','en']){game.i18n.lang=lang;const html=electrolaserControlsHTML(f.weapon(),x=>x),brief=ammunitionChatData(f.profile());
      assert.match(html,/Режим/);assert.match(html,/Ready/);assert.match(html,/LC2/);assert.ok(brief.lines.length<=3);assert.ok(brief.lines.join(' ').length<500);
      assert.doesNotMatch(ammunitionChatHTML(f.profile(),x=>x),/<details[^>]*\sopen/);
    }
    await assert.rejects(()=>f.tx('add-magazines',{capacity:10,amount:1}),/магазин/);
  });
}
test('Underbarrel requires host parameters and isolates its source from other weapons',async()=>{
  const f=await fixture(expected[4][0],{host:false});assert.match(f.attack().readinessReason,/носителя/);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
  const valid=await fixture(expected[4][0]);assert.equal(valid.attack().bulk,-5);assert.equal(valid.attack().acc,7);assert.equal(valid.attack().scopeBonus,2);assert.equal(valid.attack().data.st,'10');
});
test('service rejects foreign owners and invalid configuration without writes',async()=>{
  const f=await fixture(expected[0][0]),before=f.state();
  for(const changes of [{electrolaserMode:'bad'},{electrolaserEnvironment:'underwater'},{electrolaserVisibilityDR:0.5},{electrolaserVisibilityDR:-1},{electrolaserBattery:{}},{electrolaserMode:null}])await assert.rejects(()=>f.configure(changes));
  assert.deepEqual(f.state(),before);f.actor.isOwner=false;await assert.rejects(()=>f.configure({electrolaserMode:'kill'}));assert.deepEqual(f.state(),before);
});
test('local DR comes only from explicit locations, ambiguous DR remains manual',()=>{
  assert.deepEqual(electricalResistanceLocations({system:{DR:99,hitlocations:{a:{where:'Torso',dr:'4'},b:{where:'Arm',dr:'2|6'}}}}),[{name:'Torso',dr:4},{name:'Arm',dr:null}]);
  assert.deepEqual(electricalResistanceLocations({system:{DR:99}}),[]);
});
test('electrical condition validation rejects fractional/negative DR and wrong distance',()=>{
  const e={condition:'electrolaser',modifier:-4};for(const dr of [-1,0.5,'x'])assert.throws(()=>visionResistanceModifier(e,{dr,distance:'within',electrical:false}));
  assert.throws(()=>visionResistanceModifier(e,{dr:4,distance:'unknown',electrical:false}));
});
test('Fire Control updates in place and recalculates available shots',async()=>{
  const f=await fixture(expected[0][0]);await f.service.spendWeaponCharge(f.weapon().id,33);await f.configure({electrolaserMode:'kill'});
  const limits=FirePreparationApp.prototype._getShotLimits.call({weapon:f.weapon(),mode:'weapon',fireState:{},maximumShots:3,calculateShotLimits:()=>({maxShots:3,minShots:1})});
  assert.equal(limits.maxShots,1);
  const source=await readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');
  const branch=source.slice(source.indexOf("if(['electrolaserMode'"),source.indexOf("if(['lpFireMode'"));
  assert.doesNotMatch(branch,/\.render\(/);assert.match(branch,/setElectrolaserConfiguration/);
});
for(const p of Object.values(ELECTROLASER_PROFILES))test(p.name+': published governing skill alternatives',async()=>{
  const f=await fixture(p.modeId),record=f.definitions.list()[0],mode=record.modes[0];
  const actor=structuredClone(f.actor.system);delete actor.attributes;
  for(const[name,level,expectedLevel]of p.specialty==='Beams'?[['Gunner/TL9 (Beams)',18,18],['Gunner/TL9 (Cannon)',18,14]]:
    [[`Beam Weapons/TL9 (${p.specialty})`,18,18],[`Guns/TL9 (${p.specialty})`,18,14],['Beam Weapons/TL9 (Projector)',18,14]]){
    const selected=resolveStandaloneSkill({actor:{system:{...actor,attributes:{DX:{value:10}},skills:{a:{name,level,points:4}}}},record,mode});
    assert.equal(selected.level,expectedLevel,name);
  }
});
test('universal native electrical resistance: actor binding, DR once, no damage or state writes',async()=>{
  const f=await fixture(expected[0][0]);await f.configure({electrolaserMode:'kill'});const effect=f.profile().damage.rules.resistanceEffect;
  const hooks=new Map(),created=[],calls=[];let sequence=0;
  const actor={id:'defender',name:'Defender',isOwner:true,system:{attributes:{HT:{value:10}}}},token={actor,isOwner:true};
  const rt={game:{user:{id:'owner',isGM:false,get targets(){throw Error('Target accessed');}}},canvas:{tokens:{controlled:[token]}},
    Hooks:{on:(name,fn)=>{const id=++sequence;hooks.set(id,{name,fn});return id;},off:(_name,id)=>hooks.delete(id)},
    GURPS:{lastTargetedRoll:{},parselink:()=>({action:{type:'attribute'}})},
    __olegurpsResistanceConditions:async()=>({dr:4,distance:'beyond',electrical:true}),
    __olegurpsNativeResistanceLoader:async()=>({doRoll:async args=>{
      calls.push(args);rt.GURPS.lastTargetedRoll={thing:args.thing,fromUser:'owner',actorid:actor.id,origtarget:10,rtotal:16,finaltarget:11,margin:-5,failure:true,isCritSuccess:false,isCritFailure:false};
      const m={id:'native',author:{id:'owner'},speaker:{actor:actor.id},rolls:[{total:16}],flags:{},content:'<native-gga>',updateSource(patch){
        for(const[k,v]of Object.entries(patch))if(k.startsWith('flags.'))(this.flags['olegurps-qol']??={})[k.split('.').at(-1)]=v;else this[k]=v;}};
      for(const h of [...hooks.values()].filter(h=>h.name==='preCreateChatMessage'))h.fn(m);
      created.push(m);for(const h of [...hooks.values()].filter(h=>h.name==='createChatMessage'))h.fn(m);return true;
    }})};
  const before=structuredClone(actor),result=await rollResistance({flags:{'olegurps-qol':{resistanceEffect:effect}}},rt);
  assert.equal(calls.length,1);assert.equal(calls[0].targetmods[0].modint,1);assert.equal(result.bucketModifier,0);
  assert.equal(result.message.flags['olegurps-qol'].resistanceResult.electrical,true);assert.match(result.message.content,/до ремонта/);assert.doesNotMatch(result.message.content,/Heart Attack/);
  assert.deepEqual(actor,before);assert.equal(hooks.size,0);assert.equal(created.length,1);
});
test('electrical conditions use explicit local DR, remain nonmodal and cancel without native invocation',async()=>{
  const f=await fixture(expected[0][0]),effect={...f.profile().damage.rules.resistanceEffect,hitLocation:'Torso'};
  const actor={id:'defender',name:'Defender',isOwner:true,system:{attributes:{HT:{value:10}},DR:99,hitlocations:{a:{where:'Torso',dr:'4'}}}};
  let nativeCalls=0;const rt={game:{user:{isGM:false}},canvas:{tokens:{controlled:[{actor,isOwner:true}]}},
    __olegurpsNativeResistanceLoader:async()=>{nativeCalls++;},foundry:{applications:{api:{DialogV2:{wait:async options=>{
      assert.equal(options.modal,false);assert.match(options.content,/name="dr"[^>]*value="4"/);assert.doesNotMatch(options.content,/value="99"/);
      assert.match(options.content,/value="within"/);assert.doesNotMatch(options.content,/name="electrical"[^>]*checked/);return false;
    }}}}}};
  assert.equal(await rollResistance({flags:{'olegurps-qol':{resistanceEffect:effect}}},rt),null);assert.equal(nativeCalls,0);
});
test('last charge can reopen Fire Control in Kill, then fire in Standard; empty still blocked',async()=>{
  const f=await fixture(expected[0][0]);await f.service.spendWeaponCharge(f.weapon().id,35);await f.configure({electrolaserMode:'kill'});
  assert.match(f.attack().readinessReason,/Недостаточно/);assert.equal(weaponPreparationReason(f.weapon(),f.attack()),null);
  await assert.rejects(()=>f.shoot());await f.configure({electrolaserMode:'standard'});await f.shoot();assert.match(weaponPreparationReason(f.weapon(),f.attack()),/Недостаточно/);
  const underbarrel=await fixture(expected[4][0],{host:false});await underbarrel.service.spendWeaponCharge(underbarrel.weapon().id,65);await underbarrel.configure({electrolaserMode:'kill'});
  assert.match(weaponPreparationReason(underbarrel.weapon(),underbarrel.attack()),/носителя/);
});
