import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {HT_LASER_PROFILES,htLaserEffect} from '../scripts/ht-laser-source.js';
import {readWeaponBattery,weaponPowerProfile,newWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {resistanceEffect,messageResistanceEffect,resistanceLabel,selectedResistanceToken,resistanceAttribute,
  visionResistanceModifier,resistanceOutcome,rollResistance,installResistanceRoll} from '../scripts/tools/resistance-roll.js';
const q='WALzMQGej7znsQIsa',z='W46_tIuztoKnpftYj',scope='olegurps-qol';
const choices={looking:'yes',distance:'within',protectedVision:'no',membrane:0};
const msg=(id=q)=>({id:'attack',visible:true,isContentVisible:true,flags:{[scope]:{resistanceEffect:htLaserEffect(id)}},whisper:['owner']});
for(const [id,expected]of [[q,{name:'NORINCO QXJ04',tl:'8',cell:'M',n:100,damage:'HT-5 aff',acc:'6+1',range:'1,500/4,500',rof:'1',bulk:'-4',rcl:'1',skill:'Beam Weapons',specialty:'Projector'}],
  [z,{name:'NORINCO ZM87',tl:'8',cell:'VL',n:1000,damage:'HT-10 aff',acc:'18',range:'3,600/11,000',rof:'5',bulk:'-8',rcl:'1',skill:'Gunner',specialty:'Beams'}]]){
  test(expected.name+': individually verified HT181 model, characteristics and energy-only acquisition',async()=>{
    const f=await gaussFixture(id),m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id);
    assert.equal(e.name,expected.name);assert.equal(e.tech_level,expected.tl);assert.equal(m.raw_calc.damage,expected.damage);
    assert.equal(m.stats.accuracy,expected.acc);assert.equal(m.stats.range,expected.range);assert.equal(m.stats.rate_of_fire,expected.rof);
    assert.equal(m.stats.bulk,expected.bulk);assert.equal(m.stats.recoil,expected.rcl);assert.equal(m.stats.shots,expected.n+(id===q?'(3)':'(5)'));
    assert.equal(m.governing_skill.skill.name,expected.skill);assert.equal(m.governing_skill.skill.specialization,expected.specialty);
    assert.equal(m.ht_laser_source.cellSize,expected.cell);assert.equal(m.ht_laser_source.shots,expected.n);
    assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.weapon().totalAmmo,0);
    assert.deepEqual(f.weapon().htLaserBattery,{type:expected.cell,standard:'HT13',capacity:expected.n,charge:expected.n});
    assert.equal(f.attack().readinessReason,null);
    assert.equal(f.profile().damage.formula,null);assert.equal(f.profile().effective.damage,expected.damage);
    assert.equal(f.attack().platformRules.hitLocationNotApplicable,true);assert.equal(f.attack().data.isBeamWeapon,true);
    if(id===q)assert.equal(m.attack_resolution.geometry.width_yards_at_max_range,3);
  });
  test(expected.name+': native prepared hit, saved effect button contract, no numeric Damage or repeat energy',async()=>{
    const f=await gaussFixture(id);const amount=id===q?1:3,r=await f.shoot(amount);
    assert.equal(r.rolled,true);assert.equal(r.rollData.followon,'');assert.equal(r.profile.damage.rules.instructionOnly,true);
    assert.deepEqual(r.message.whisper,[]);assert.equal(r.message.blind,false);
    assert.equal(r.profile.damage.formula,null);assert.deepEqual(r.profile.damage.components,[]);
    assert.equal(r.receipt.power.type,expected.cell);assert.equal(r.receipt.power.spent,amount);assert.equal(r.receipt.magazineId,null);
    assert.equal(readWeaponBattery(f.weapon()).charge,expected.n-amount);
    const effect=messageResistanceEffect(r.message);assert.equal(effect.modifier,id===q?-5:-10);assert.equal(effect.attribute,'HT');
    assert.equal(effect.name,expected.name);assert.doesNotMatch(JSON.stringify(effect),/actorId|tokenId|targetId/);
    assert.equal(r.snapshot.profile.damage.rules.resistanceEffect.modifier,effect.modifier);
    const before=f.state();messageResistanceEffect(r.message);messageResistanceEffect(r.message);assert.deepEqual(f.state(),before);
    assert.equal(withRuntimeAmmoStats(f.attack(),f.actor,f.state()).data.damage,expected.damage);
    const data=ammunitionChatData(f.profile());assert.equal(data.lines.length,2);assert.ok(data.lines.join(' ').length<500);
  });
  test(expected.name+': cancellation, empty source, stale save, reload and source-specific battery',async()=>{
    const f=await gaussFixture(id),old=f.state();delete old.weapons[0].htLaserBattery;await f.actor.setFlag('world','gurpsAmmoManager',old);
    await assert.rejects(()=>f.shoot(),/батарею HT/);await f.battery();const stale=f.state();
    assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async opts=>{
      assert.doesNotMatch(opts.content,/Non-Rechargeable/);return false;}}}),null);
    const before=f.state();await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
    await f.shoot();await f.service.saveState(stale);await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,expected.n-1);
    assert.throws(()=>newWeaponBattery(weaponPowerProfile(f.weapon()),true),/UT/);
    const invalid=f.weapon();invalid.htLaserBattery.type=id===q?'C':'F';assert.equal(readWeaponBattery(invalid),null);
    await f.service.spendWeaponCharge(f.weapon().id,expected.n-1);await assert.rejects(()=>f.shoot(),/Недостаточно/);
  });
  test(expected.name+': concurrent duplicate execution spends once; unrelated physical ammunition stays prohibited',async()=>{
    const f=await gaussFixture(id);await f.battery();const idempotency=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId:idempotency}),f.shoot(1,{attackId:idempotency})]);assert.equal(readWeaponBattery(f.weapon()).charge,expected.n-1);
    await assert.rejects(()=>f.tx('add-magazines',{capacity:5,amount:1}),/магазин/);
    const st=f.state();st.weapons[0].executionVariant='etc';await f.actor.setFlag('world','gurpsAmmoManager',st);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
  });
  test(expected.name+': editing and reopening cannot recharge an existing weapon',async()=>{
    const f=await gaussFixture(id);await f.shoot();
    await f.definitions.save(new (f.draft.constructor)({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.list()[0]}));
    await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,expected.n-1);
    await f.service.spendWeaponCharge(f.weapon().id,expected.n-1);await new AmmoService(f.actor).loadState();
    assert.equal(readWeaponBattery(f.weapon()).charge,0);assert.equal(f.weapon().ammunitionInventory,undefined);
  });
}
test('HT and UT battery semantics remain separate; duplicate HT replacement cannot refill spent charge',async()=>{
  const f=await gaussFixture(q),requestId=crypto.randomUUID(),expectedBattery=batteryExpectation(f.weapon());
  await f.service.replaceBattery(f.weapon().id,{requestId,expectedBattery});await f.shoot();await f.service.replaceBattery(f.weapon().id,{requestId,expectedBattery});
  assert.equal(readWeaponBattery(f.weapon()).charge,99);assert.equal(Object.hasOwn(f.weapon().htLaserBattery,'nonRechargeable'),false);
  await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{requestId:crypto.randomUUID(),expectedBattery}),/измен/);
});
test('no resource state is created by reading an existing NORINCO',async()=>{
  const f=await gaussFixture(q),old=f.state();delete old.weapons[0].htLaserBattery;await f.actor.setFlag('world','gurpsAmmoManager',old);
  const before=f.state();await f.service.loadState();f.attack();f.profile();assert.deepEqual(f.state(),before);
});
const cases=[
  [q,choices,-5],[z,choices,-10],
  [q,{...choices,distance:'beyond'},-2],[z,{...choices,distance:'beyond'},-7],
  [q,{...choices,protectedVision:'yes',membrane:4},4],[z,{...choices,protectedVision:'yes',membrane:4},-1],
  [q,{...choices,distance:'beyond',protectedVision:'yes',membrane:4},7],[z,{...choices,distance:'beyond',protectedVision:'yes',membrane:4},2]
];
for(const [i,[id,c,expected]]of cases.entries())test('HT181 explicit resistance conditions '+(i+1),()=>assert.equal(visionResistanceModifier(htLaserEffect(id),c).modifier,expected));
test('invalid conditions are rejected; empty membrane is zero and removed gaze field has no effect',()=>{
  for(const c of [null,{}, {...choices,distance:''},{...choices,protectedVision:''},{...choices,membrane:NaN},{...choices,membrane:-1}])assert.throws(()=>visionResistanceModifier(htLaserEffect(q),c));
  assert.equal(visionResistanceModifier(htLaserEffect(q),{...choices,membrane:''}).modifier,-5);
  assert.equal(visionResistanceModifier(htLaserEffect(q),{...choices,looking:'no'}).applies,true);
});
test('current selected Actor only, exact selection and OWNER permission, never Target',()=>{
  const actor={isOwner:true,system:{attributes:{HT:{value:13,import:40},WILL:{value:12},DX:{value:11}}}},token={actor,isOwner:true};
  const rt={game:{user:{isGM:false,get targets(){throw Error('must never read Target');}}},canvas:{tokens:{controlled:[token]}}};
  assert.equal(selectedResistanceToken(rt),token);assert.equal(resistanceAttribute(actor,'HT'),13);assert.equal(resistanceAttribute(actor,'Will'),12);
  actor.system.attributes.HT.value=14;assert.equal(resistanceAttribute(actor,'HT'),14);
  for(const selected of [[],[token,token]]){rt.canvas.tokens.controlled=selected;assert.throws(()=>selectedResistanceToken(rt),/ровно один/);}
  rt.canvas.tokens.controlled=[token];actor.isOwner=false;assert.throws(()=>selectedResistanceToken(rt),/прав/);rt.game.user.isGM=true;assert.equal(selectedResistanceToken(rt),token);
  for(const value of [undefined,0,-1,NaN,'10'])assert.throws(()=>resistanceAttribute({system:{attributes:{HT:{value}}}},'HT'));
  assert.throws(()=>resistanceAttribute(actor,'__proto__'));
});
for(const [name,native,success,critFail]of [
  ['success',{rtotal:9,finaltarget:12,margin:3,failure:false,isCritSuccess:false,isCritFailure:false},true,false],
  ['failure',{rtotal:12,finaltarget:5,margin:-7,failure:true,isCritSuccess:false,isCritFailure:false},false,false],
  ['critical success',{rtotal:5,finaltarget:15,margin:10,failure:false,isCritSuccess:true,isCritFailure:false},true,false],
  ['critical failure by ten',{rtotal:15,finaltarget:5,margin:-10,failure:true,isCritSuccess:false,isCritFailure:true},false,true],
  ['17 at effective 16',{rtotal:17,finaltarget:16,margin:-1,failure:true,isCritSuccess:false,isCritFailure:false},false,false],
  ['18 at effective 20',{rtotal:18,finaltarget:20,margin:2,failure:true,isCritSuccess:false,isCritFailure:true},false,true],
  ['automatic critical success below target 3',{rtotal:4,finaltarget:0,margin:-4,failure:true,isCritSuccess:true,isCritFailure:false},true,false],
  ['GGA missing failure by ten at effective zero',{rtotal:12,finaltarget:0,margin:-12,failure:true,isCritSuccess:false,isCritFailure:false},false,true],
  ['GGA missing failure by ten below zero',{rtotal:9,finaltarget:-1,margin:-10,failure:true,isCritSuccess:false,isCritFailure:false},false,true]
])test('GGA critical flags and outcome: '+name,()=>{
  const r=resistanceOutcome(htLaserEffect(q),native);assert.equal(r.success,success);assert.equal(r.criticalFailure,critFail);
  if(!success&&native.margin<0)assert.match(r.consequence,new RegExp((-native.margin)+' мин'));
  if(!success&&native.margin>=0)assert.match(r.consequence,/вручную/);
});
test('ZM87 failure describes crippling blindness and separate B422 duration, not invented numeric injury',()=>{
  const n={rtotal:12,finaltarget:5,margin:-7,failure:true,isCritSuccess:false,isCritFailure:false};
  const r=resistanceOutcome(htLaserEffect(z),n);assert.match(r.consequence,/Калечащая слепота/);assert.match(r.consequence,/отдельным HT по B422/);assert.doesNotMatch(r.consequence,/7 мин|HP|Damage/);
});
test('structured saved effects survive without current weapons; ordinary Damage and missed attacks have no button',()=>{
  const m=msg();assert.equal(resistanceLabel(messageResistanceEffect(m)),'Бросок HT−5');assert.equal(messageResistanceEffect({flags:{gurps:{transfer:{payload:[{damage:31}]}}}}),null);
  m.flags[scope].resistanceEffect.eligible=false;assert.equal(messageResistanceEffect(m),null);
  const old={flags:{[scope]:{shotSnapshot:{profile:{context:{resistanceApplicable:true},damage:{rules:{resistanceEffect:htLaserEffect(z)}}}}}}};assert.equal(messageResistanceEffect(old).modifier,-10);
  old.flags[scope].shotSnapshot.profile.context={};assert.equal(messageResistanceEffect(old),null);
  assert.equal(resistanceEffect({...htLaserEffect(q),attribute:'constructor'}),null);
  assert.equal(resistanceLabel({...htLaserEffect(q),attribute:'DX',modifier:2}),'Бросок DX+2');
});
function nativeRuntime({total=12,final=5,critSuccess=false,critFailure=false,failed=true,whisper=[],blind=false}={}){
  const hooks=new Map();let next=0;const created=[],calls=[];
  const actor={id:'defender',name:'Защитник',isOwner:true,system:{attributes:{HT:{value:10}}},update:()=>{throw Error('Actor write');}};
  const token={id:'controlled',actor,isOwner:true,update:()=>{throw Error('Token write');}};
  const rt={game:{user:{id:'owner',isGM:false,get targets(){throw Error('Target used');}}},canvas:{tokens:{controlled:[token]}},
    Hooks:{on:(name,fn)=>{const id=++next;hooks.set(id,{name,fn});return id;},off:(_name,id)=>hooks.delete(id)},
    GURPS:{lastTargetedRoll:{},parselink:()=>({action:{type:'attribute'}})},Roll:{create:()=>{throw Error('own dice implementation');}},
    __olegurpsResistanceConditions:async()=>choices,__olegurpsNativeResistanceLoader:async()=>({doRoll:async args=>{
      calls.push(args);rt.GURPS.lastTargetedRoll={thing:args.thing,fromUser:rt.game.user.id,actorid:actor.id,origtarget:args.origtarget,rtotal:total,finaltarget:final,
        margin:final-total,isCritSuccess:critSuccess,isCritFailure:critFailure,failure:failed};
      const message={id:'native-'+created.length,author:{id:'owner'},speaker:{actor:actor.id},whisper:[...whisper],blind,rolls:[{total}],flags:{},content:'<native-gga>',
        updateSource(patch){for(const[k,v]of Object.entries(patch)){if(k.startsWith('flags.'))(this.flags[scope]??={})[k.split('.').at(-1)]=v;else this[k]=v;}}};
      for(const h of [...hooks.values()].filter(h=>h.name==='preCreateChatMessage'))h.fn(message);
      created.push(message);for(const h of [...hooks.values()].filter(h=>h.name==='createChatMessage'))h.fn(message);return !failed;
    }})};
  return {rt,actor,token,hooks,created,calls};
}
test('native GGA loader handles roll once, modifier once, author v14, descriptive native message, no resources',async()=>{
  const h=nativeRuntime(),before=structuredClone(h.actor.system);const r=await rollResistance(msg(),h.rt);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].actor,h.actor);assert.equal(h.calls[0].origtarget,10);assert.equal(h.calls[0].targetmods.length,1);assert.equal(h.calls[0].targetmods[0].modint,-5);
  assert.equal(h.calls[0].optionalArgs.obj.consumeAction,false);assert.equal(r.total,12);assert.equal(h.created.length,1);assert.match(r.message.content,/Временная слепота на 7 мин/);assert.match(r.message.content,/Условия сопротивления/);
  assert.doesNotMatch(r.message.content,/<details[^>]*\sopen/);assert.deepEqual(r.message.whisper,[]);assert.equal(r.message.blind,false);assert.deepEqual(h.actor.system,before);assert.equal(h.hooks.size,0);
  await rollResistance(msg(),h.rt);assert.equal(h.calls.length,2);assert.equal(h.created.length,2);
  assert.doesNotMatch(JSON.stringify(h.created[0].flags),/actorId|tokenId|targetId/);
});
test('resistance preserves native GGA privacy from a private blind source; new ammo messages default to all, saved privacy is preserved',async()=>{
  const h=nativeRuntime({whisper:['owner'],blind:true}),source={...msg(),blind:true};const r=await rollResistance(source,h.rt);
  assert.deepEqual(r.message.whisper,['owner']);assert.equal(r.message.blind,true);
  const service=new AmmoService(h.actor);assert.equal(service.defaultChatSettings().mode,'all');
  assert.equal(service.normalizeChatSettings({}).mode,'all');assert.equal(service.normalizeChatSettings({mode:'self'}).mode,'self');
  assert.equal(source.blind,true);assert.deepEqual(source.whisper,['owner']);
});
test('native result already includes Bucket; module does not add it again',async()=>{
  const h=nativeRuntime({total:9,final:7});const r=await rollResistance(msg(),h.rt);assert.equal(r.finalTarget,7);assert.equal(r.bucketModifier,2);assert.equal(h.calls[0].targetmods[0].modint,-5);
});
test('GGA autoAdd cancellation removes only the temporary effect modifier from Bucket',async()=>{
  const h=nativeRuntime(),manual={modint:2,mod:'+2',desc:'Ручной бонус'},stack={modifierList:[manual],removeIndex(i){this.modifierList.splice(i,1);}};
  h.rt.GURPS.ModifierBucket={modifierStack:stack,refresh(){}};
  h.rt.__olegurpsNativeResistanceLoader=async()=>({doRoll:async args=>{stack.modifierList.push({...args.targetmods[0]});return false;}});
  assert.equal(await rollResistance(msg(),h.rt),null);assert.deepEqual(stack.modifierList,[manual]);assert.equal(h.created.length,0);
});
test('condition/native cancel and lost OWNER have no result; later selection keeps the original Actor',async()=>{
  for(const action of ['condition-cancel','native-cancel','selection-change','lost-owner']){
    const h=nativeRuntime();
    if(action==='condition-cancel')h.rt.__olegurpsResistanceConditions=async()=>null;
    if(action==='native-cancel')h.rt.__olegurpsNativeResistanceLoader=async()=>({doRoll:async()=>false});
    if(action==='selection-change')h.rt.__olegurpsResistanceConditions=async()=>{h.rt.canvas.tokens.controlled=[];return choices;};
    if(action==='lost-owner')h.rt.__olegurpsResistanceConditions=async()=>{h.actor.isOwner=false;return choices;};
    if(action==='lost-owner')await assert.rejects(()=>rollResistance(msg(),h.rt));
    else if(action==='selection-change'){assert.ok(await rollResistance(msg(),h.rt));assert.equal(h.calls[0].actor,h.actor);}
    else assert.equal(await rollResistance(msg(),h.rt),null);
    assert.equal(h.created.length,action==='selection-change'?1:0);assert.equal(h.hooks.size,0);
  }
});
test('render adds one Russian button beside intact native content; saved/reopened messages and uninstall',()=>{
  const h=nativeRuntime();let button;h.rt.document={querySelectorAll:()=>[],createElement:()=>({dataset:{},addEventListener(){},remove(){button=null;}})};
  const root={querySelector:s=>s==='[data-olegurps-resistance]'?button:null,append:b=>{button=b;}};
  const i=installResistanceRoll(h.rt);assert.equal(installResistanceRoll(h.rt),i);const render=[...h.hooks.values()].find(h=>h.name==='renderChatMessageHTML').fn;
  for(const language of ['en','ru']){h.rt.game.i18n={lang:language};render(msg(),root);const first=button;render(msg(),root);assert.equal(button,first);assert.equal(button.textContent,'Бросок HT−5');}
  render({flags:{}},root);assert.equal(button,null);render(structuredClone(msg(z)),root);assert.equal(button.textContent,'Бросок HT−10');i.uninstall();assert.equal(h.hooks.size,0);
});
test('resistance implementation has no own dice, Target access, Actor/Token writes or PF2e dependency',async()=>{
  const code=await readFile(new URL('../scripts/tools/resistance-roll.js',import.meta.url),'utf8');
  assert.doesNotMatch(code,/Roll\.create|\.targets|\.update\(|setFlag\(|ActiveEffect|pf2e/i);assert.match(code,/systems\/gurps\/module\/dierolls\/dieroll\.js/);
});
test('no/duplicate selection and foreign PLAYER token stop before the native loader',async()=>{
  for(const mode of ['none','many','foreign']){const h=nativeRuntime();if(mode==='none')h.rt.canvas.tokens.controlled=[];
    if(mode==='many')h.rt.canvas.tokens.controlled=[h.token,h.token];if(mode==='foreign')h.actor.isOwner=false;
    await assert.rejects(()=>rollResistance(msg(),h.rt));assert.equal(h.calls.length,0);assert.equal(h.created.length,0);assert.equal(h.hooks.size,0);}
});
test('concurrent resistance clicks cannot accidentally create two native checks',async()=>{
  const h=nativeRuntime();let finish;h.rt.__olegurpsResistanceConditions=()=>new Promise(r=>{finish=r;});
  const first=rollResistance(msg(),h.rt);await assert.rejects(()=>rollResistance(msg(),h.rt),/Дождитесь/);finish(choices);await first;assert.equal(h.calls.length,1);
});
test('GGA loader failure removes hooks and does not lock later explicit requests',async()=>{
  const h=nativeRuntime();h.rt.__olegurpsNativeResistanceLoader=async()=>{throw Error('GGA unavailable');};
  await assert.rejects(()=>rollResistance(msg(),h.rt),/unavailable/);assert.equal(h.hooks.size,0);assert.equal(h.created.length,0);
  await assert.rejects(()=>rollResistance(msg(),h.rt),/unavailable/);
});
