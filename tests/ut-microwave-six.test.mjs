import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {MICROWAVE_PROFILES,microwaveDamage} from '../scripts/ut-microwave-source.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome,rollResistance} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
import {executePreparedGgaRoll} from '../scripts/tools/prepared-gga-roll.js';
import {createShotSnapshot} from '../scripts/tools/attack-profile-resolver.js';
const scope='olegurps-qol';
// Independent transcription of the two UT120-121 tables; no book needed at runtime.
const expected=[
  ['WYuhqGbMCGs-u4MlH','Portable MAD','mad','D',1,83,-3,1,'12','400/800','10†','-5',20,10000,3,5,'Projector'],
  ['WEKwzFJTvp1riLTv9','Tactical MAD','mad','D',1,100,-4,3,'18','600/1,200','18M','-8',70,70000,3,5,'Beams'],
  ['Wtjsq4TCLXUc8kbwp','EMP Gun','disruptor','C',1,33,-3,1,'6','90/270','4','-2',1.8,650,2,3,'Projector'],
  ['WnzDswlD1C_zON4Ss','Pulse Carbine','disruptor','C',2,28,-4,1,'12','160/480','5†','-3',5,2000,2,3,'Projector'],
  ['W12AWwnmv4e0gsr3i','Scrambler','disruptor','B',1,11,-2,1,'3','40/120','3','-1',0.3,120,2,3,'Projector'],
  ['W9JO2V_oiKVqnyb_F','Tactical Disruptor','disruptor','D',1,50,-8,3,'18','600/1,200','18M','-8',70,32000,1,5,'Beams']
];
const effectFor=id=>microwaveDamage({damage:catalogs.getMode(id).raw_calc.damage,range:catalogs.getMode(id).stats.range},id).rules.resistanceEffect;
const source=id=>({id:'source',visible:true,flags:{[scope]:{resistanceEffect:effectFor(id)}}});
const disruptorChoices={ht:'12',sm:'',dr:8,distance:'within',sealed:false,exposed:false};
for(const[id,name,family,cell,cells,n,penalty,width,acc,range,st,bulk,weight,cost,lc,reload,specialty]of expected){
  test(name+': individual published characteristics, skill/defaults and complete battery set',async()=>{
    const f=await gaussFixture(id),m=catalogs.getMode(id),p=MICROWAVE_PROFILES[id],e=catalogs.getEquipmentForMode(id);
    assert.equal(e.name,name);assert.equal(e.tech_level,'9');assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);
    assert.equal(m.stats.strength,st);assert.equal(m.stats.bulk,bulk);assert.equal(m.stats.rate_of_fire,'1');assert.equal(m.stats.recoil,'1');
    assert.equal(m.stats.shots,n+'('+reload+')');assert.equal(m.raw_calc.damage,`HT${penalty} aff (${width} yd)`);
    assert.equal(p.family,family);assert.equal(p.weightLb,weight);assert.equal(p.cost,cost);assert.equal(p.lc,lc);
    assert.equal(m.governing_skill.skill.name,specialty==='Beams'?'Gunner':'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,specialty);
    assert.deepEqual(m.defaults.slice(1),[{type:'skill',name:specialty==='Beams'?'Gunner':'Beam Weapons',specialization:null,modifier:-4},{type:'dx',modifier:-4}]);
    assert.equal(m.attack_resolution.geometry.width_yards_at_max_range,width);assert.equal(f.attack().data.isBeamWeapon,true);
    assert.equal(f.attack().platformRules.hitLocationNotApplicable,true);assert.equal(f.attack().readinessReason,null);
    assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.weapon().totalAmmo,0);
    assert.deepEqual(readWeaponBattery(f.weapon()),{type:cell,cells,nonRechargeable:false,capacity:n,charge:n});
    assert.equal(f.profile().effective.damage,`HT${penalty} aff (${width} yd)`);assert.equal(f.profile().damage.formula,null);
  });
  test(name+': one native cone, one impulse, saved resistance, no HP Damage and concise chat',async()=>{
    const f=await gaussFixture(id),r=await f.shoot(),effect=messageResistanceEffect(r.message);
    assert.equal(r.rolled,true);assert.equal(r.receipt.power.spent,1);assert.equal(r.receipt.magazineId,null);assert.equal(r.rollData.followon,'');
    assert.equal(readWeaponBattery(f.weapon()).charge,n-1);assert.equal(r.profile.damage.rules.instructionOnly,true);
    assert.deepEqual(r.profile.damage.components,[]);assert.equal(r.profile.damage.formula,null);assert.equal(effect.modifier,penalty);
    assert.equal(effect.condition,'microwave-'+family);assert.equal(effect.outcome,family==='mad'?'agony':'shutdown');
    const saved=JSON.stringify(r.snapshot),state=f.state();messageResistanceEffect(r.message);messageResistanceEffect(r.message);
    assert.equal(JSON.stringify(r.snapshot),saved);assert.deepEqual(f.state(),state);
    assert.deepEqual(r.message.whisper,[]);assert.equal(r.message.blind,false);
    const chat=ammunitionChatData(r.profile);assert.ok(chat.lines.length<=3);assert.ok(chat.lines.join(' ').length<500);
    assert.doesNotMatch(chat.lines.join(' '),/Basic Set|батаре|патрон|реализац|не реализован/i);
  });
  test(name+': NR doubles complete published set, save/reload never restores energy',async()=>{
    const f=await gaussFixture(id);await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).charge,2*n);
    await f.shoot();await f.definitions.save(new StandaloneWeaponDraft({actor:f.actor,catalogs,type:'ranged',existing:f.definitions.list()[0]}));
    await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,2*n-1);
    assert.equal(f.weapon().ammunitionInventory,undefined);
  });
  test(name+': zero, missing, invalid and insufficient power; cancel, RoF and ownership validation',async()=>{
    const f=await gaussFixture(id),before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
    await assert.rejects(()=>f.shoot(2));assert.deepEqual(f.state(),before);
    await f.service.spendWeaponCharge(f.weapon().id,n);assert.equal(readWeaponBattery(f.weapon()).charge,0);await assert.rejects(()=>f.shoot());
    for(const battery of [undefined,{...before.weapons[0].microwaveBattery,cells:7}]){
      const state=f.state();state.weapons[0].microwaveBattery=battery;await f.actor.setFlag('world','gurpsAmmoManager',state);
      const broken=f.state();await f.service.loadState();assert.equal(readWeaponBattery(f.weapon()),null);await assert.rejects(()=>f.shoot());assert.deepEqual(f.state(),broken);
    }
    await f.battery();f.actor.isOwner=false;await assert.rejects(()=>f.shoot());
  });
  test(name+': concurrent shot and battery idempotence, stale replacement cannot refill',async()=>{
    const f=await gaussFixture(id),attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);
    assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
    const args={requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(f.weapon())};await f.service.replaceBattery(f.weapon().id,args);
    await f.shoot();await f.service.replaceBattery(f.weapon().id,args);assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
    await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{...args,requestId:crypto.randomUUID()}));
  });
  test(name+': physical magazines and ETC/LP bypasses remain prohibited',async()=>{
    const f=await gaussFixture(id);await assert.rejects(()=>f.tx('add-magazines',{amount:1,capacity:5}));
    for(const executionVariant of ['etc','lp']){const state=f.state();state.weapons[0].executionVariant=executionVariant;
      await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());}
  });
  test(name+': source-specific resistance and duration',()=>{
    const effect=effectFor(id),choices=family==='mad'?{dr:8}:disruptorChoices;
    assert.equal(visionResistanceModifier(effect,choices).modifier,penalty+(family==='mad'?8:0));
    const native={finaltarget:8,rtotal:12,margin:-4,failure:true,isCritFailure:false,isCritSuccess:false};
    const r=resistanceOutcome(effect,native);assert.equal(r.success,false);assert.match(r.consequence,family==='mad'?/Agony.*1 секунду/:/4 мин/);
    assert.doesNotMatch(r.consequence,/слепота|ожог|оглушен|HP|Damage/);
    assert.match(resistanceOutcome(effect,{...native,rtotal:7,margin:1,failure:false}).consequence,/отражено/);
  });
}
for(const row of expected.filter(r=>r[2]==='disruptor'))test(row[1]+': SM, range, Sealed and unshielded connections independently',()=>{
  const effect=effectFor(row[0]),penalty=row[6];
  for(const sm of ['',-4,3])for(const distance of ['within','beyond'])for(const sealed of [false,true])for(const exposed of [false,true]){
    const c={...disruptorChoices,sm,distance,sealed,exposed};
    assert.equal(visionResistanceModifier(effect,c).modifier,penalty+Number(sm)+(distance==='beyond'?3:0)+(sealed&&!exposed?8:0));
  }
  for(const ht of ['',0,-1,'x',1.5])assert.throws(()=>visionResistanceModifier(effect,{...disruptorChoices,ht}));
  for(const sm of ['x',1.5])assert.throws(()=>visionResistanceModifier(effect,{...disruptorChoices,sm}));
});

function nativeHarness({actorless=false,unknownHT=false,role='owner',conditions=null,dialog=null,total=12}={}){
  let next=0;const hooks=new Map(),calls=[],messages=[];
  const actor={id:'defender',name:'Защитник',isOwner:true,system:{attributes:{HT:{value:unknownHT?undefined:11}},hitlocations:{torso:{where:'Torso',dr:6}}}};
  const token={actor,isOwner:true},rt={game:{user:{id:role,isGM:role==='gm',get targets(){throw Error('Target read');}}},canvas:{tokens:{controlled:actorless?[]:[token]}},
    Hooks:{on:(name,fn)=>{const id=++next;hooks.set(id,{name,fn});return id;},off:(_name,id)=>hooks.delete(id)},
    GURPS:{lastTargetedRoll:{},parselink:()=>({action:{type:'attribute'}})}};
  if(conditions)rt.__olegurpsResistanceConditions=async()=>conditions;
  if(dialog)rt.foundry={applications:{api:{DialogV2:{wait:dialog}}}};
  rt.__olegurpsNativeResistanceLoader=async()=>({doRoll:async args=>{
    calls.push(args);const final=args.origtarget+args.targetmods[0].modint;
    rt.GURPS.lastTargetedRoll={thing:args.thing,fromUser:role,actorid:args.actor?.id,origtarget:args.origtarget,
      rtotal:total,finaltarget:final,margin:final-total,failure:total>final,isCritSuccess:total<=4,isCritFailure:total===18};
    const message={id:'native-'+messages.length,author:{id:role},speaker:{actor:args.actor?.id},rolls:[{total}],flags:{},content:'<native-gga>',
      updateSource(patch){for(const[k,v]of Object.entries(patch)){if(k.startsWith('flags.'))(this.flags[scope]??={})[k.split('.').at(-1)]=v;else this[k]=v;}}};
    for(const h of [...hooks.values()].filter(h=>h.name==='preCreateChatMessage'))h.fn(message);
    messages.push(message);for(const h of [...hooks.values()].filter(h=>h.name==='createChatMessage'))h.fn(message);
  }});
  return {rt,actor,token,hooks,calls,messages};
}
for(const role of ['owner','gm'])for(const actorless of [true,false])test(role+': native Disruptor '+(actorless?'without Actor':'Actor HT can be corrected')+', repeated resistance preserves shot and resources',async()=>{
  const f=await gaussFixture(expected[2][0]),shot=await f.shoot(),saved=JSON.stringify(shot.snapshot),state=f.state();
  const h=nativeHarness({role,actorless,conditions:{...disruptorChoices,ht:15,sm:-2,sealed:true}}),actorBefore=structuredClone(h.actor);
  for(let i=0;i<3;i++){
    const r=await rollResistance(shot.message,h.rt);assert.equal(r.base,15);assert.equal(r.modifier,3);assert.equal(r.finalTarget,18);
    assert.equal(h.calls[i].actor,actorless?undefined:h.actor);assert.equal(h.calls[i].action,actorless?null:h.calls[i].action);
    assert.equal(h.calls[i].optionalArgs.obj.consumeAction,false);assert.equal(r.message.flags[scope].resistanceResult.sm,-2);
  }
  assert.equal(h.messages.length,3);assert.equal(h.hooks.size,0);assert.deepEqual(h.actor,actorBefore);
  assert.deepEqual(f.state(),state);assert.equal(JSON.stringify(shot.snapshot),saved);
});
for(const row of expected)test(row[1]+': correct dialog fields and defaults, Russian ru/en, nonmodal cancellation',async()=>{
  for(const lang of ['ru','en']){
    const disruptor=row[2]==='disruptor';let seen=0;
    const h=nativeHarness({dialog:async options=>{seen++;assert.equal(options.modal,false);
      assert.match(options.content,/Применимый DR/);assert.doesNotMatch(options.content,/Target|GM approval/);
      if(disruptor){assert.match(options.content,/name="ht"[^>]*value="11"/);assert.match(options.content,/name="sm"/);assert.match(options.content,/name="distance"/);}
      else{assert.doesNotMatch(options.content,/name="(?:ht|sm|distance)"/);assert.match(options.content,/Полный применимый DR/);}
      return false;}});h.rt.game.i18n={lang};assert.equal(await rollResistance(source(row[0]),h.rt),null);assert.equal(seen,1);assert.equal(h.calls.length,0);
  }
});
test('Disruptor blank HT disables roll, missing Actor/unknown HT stays blank, blank SM equals zero',async()=>{
  for(const actorless of [true,false]){
    let form,update,button={disabled:false};
    const h=nativeHarness({actorless,unknownHT:true,dialog:async options=>{
      assert.match(options.content,/name="ht"[^>]*value=""/);
      form={elements:Object.fromEntries(['ht','sm','distance','sealed','exposed','dr','localDR'].map(k=>[k,{value:k==='distance'?'within':k==='dr'?'0':'',checked:false}])),
        addEventListener:(_event,fn)=>{update=fn;}};
      options.render(null,{element:{querySelector:s=>s==='form'?form:s==='[data-action="roll"]'?button:{textContent:''}}});
      assert.equal(button.disabled,true);form.elements.ht.value='12';update({target:{name:'ht'}});assert.equal(button.disabled,false);
      form.elements.sm.value='-2';update({target:{name:'sm'}});assert.equal(button.disabled,false);
      form.elements.ht.value='';update({target:{name:'ht'}});assert.equal(button.disabled,true);return false;
    }});assert.equal(await rollResistance(source(expected[2][0]),h.rt),null);
  }
});
test('MAD requires controlled Actor and rejects unknown HT; never gains manual HT/SM or distance bonus',async()=>{
  for(const id of expected.slice(0,2).map(r=>r[0])){
    const m=source(id);await assert.rejects(()=>rollResistance(m,nativeHarness({actorless:true,conditions:{dr:4}}).rt));
    await assert.rejects(()=>rollResistance(m,nativeHarness({unknownHT:true,conditions:{dr:4}}).rt));
    const h=nativeHarness({conditions:{dr:6,ht:100,sm:100,distance:'beyond'}}),r=await rollResistance(m,h.rt);
    assert.equal(r.base,11);assert.equal(r.modifier,effectFor(id).modifier+6);assert.equal(r.message.flags[scope].resistanceResult.dr,6);
  }
});
test('Disruptor cannot read foreign Actor; multiple selection rejected, native hooks cleaned',async()=>{
  const m=source(expected[2][0]),h=nativeHarness({conditions:disruptorChoices});h.actor.isOwner=false;
  await assert.rejects(()=>rollResistance(m,h.rt),/прав/);h.actor.isOwner=true;h.rt.canvas.tokens.controlled.push(h.token);
  await assert.rejects(()=>rollResistance(m,h.rt),/одного/);assert.equal(h.hooks.size,0);
});
test('battery replacement uses existing nonmodal dialog, 2C NR unchecked each opening, Cancel changes nothing',async()=>{
  const f=await gaussFixture(expected[3][0]),before=f.state();
  for(let i=0;i<2;i++)assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,
    DialogV2:{wait:async options=>{assert.equal(options.modal,false);assert.match(options.content,/2 C cell/);assert.doesNotMatch(options.content,/checked/);return false;}}}),null);
  assert.deepEqual(f.state(),before);
});
test('missed cone still offers resistance, one native message and saved profile remain authoritative',async()=>{
  const f=await gaussFixture(expected[2][0]),messages=[],profile=f.profile();
  const runtime={game,canvas:{tokens:{placeables:[]}},GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
    Roll:{create:formula=>({formula,total:18,dice:[{results:[6,6,6].map(result=>({result}))}],async evaluate(){return this;}})},
    renderTemplate:async(_path,data)=>data.followon,
    ChatMessage:{getSpeaker:()=>({actor:f.actor.id}),create:async data=>{const m={...data,id:'missed-cone'};messages.push(m);return m;}}};
  const r=await executePreparedGgaRoll({actor:f.actor,attack:f.attack(),attackProfile:profile,shotSnapshot:createShotSnapshot(profile,{attackId:crypto.randomUUID()}),
    effectiveSkill:14,physicalShots:1,effectiveRoF:1,rcl:1,consumeAction:false,runtime});
  assert.equal(r.rollData.failure,true);assert.equal(messages.length,1);assert.equal(messageResistanceEffect(r.message).modifier,-3);
  assert.equal(r.rollData.followon,'');assert.match(r.message.content,/в том числе при промахе/);
  const old=JSON.stringify(r.message.flags[scope].shotSnapshot),state=f.state();state.weapons[0].name='Renamed after shot';
  await f.actor.setFlag('world','gurpsAmmoManager',state);assert.equal(messageResistanceEffect(r.message).name,'EMP Gun');
  assert.equal(JSON.stringify(r.message.flags[scope].shotSnapshot),old);
});
