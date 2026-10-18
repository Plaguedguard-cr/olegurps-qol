import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {UT_DAZZLER_PROFILES,utDazzlerDamage,utDazzlerFormula} from '../scripts/ut-dazzler-source.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {readWeaponBattery,weaponPowerProfile} from '../scripts/tools/weapon-power.js';
import {messageResistanceEffect,visionResistanceModifier,resistanceOutcome} from '../scripts/tools/resistance-roll.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
const expected=[
  ['W9PL689j-etAufLkh','Dazzler Carbine','C',1,9000,-5,3,'6','1,500/4,500','6†','-2',5,500],
  ['WE8bcsOxMnp0L-0n-','Laser Penlight','A',1,900,-4,1,'6','100/300','1','-1',0.1,3],
  ['WAXaXg-71SL4XsOTO','Mini Laser Flashlight','B',1,3600,-5,1,'6','170/500','1','-1',0.25,10],
  ['Wf5ajcSr9CWjMNSaV','Heavy Laser Flashlight','B',2,3600,-5,1,'6','330/1,000','1','-2',1,20],
  ['Wu_zAmOj-FoD0a38F','Laser Searchlight','C',1,1800,-5,2,'12','7,000/20,000','1','-5',10,500]
];
for(const[id,name,cell,cells,n,penalty,width,acc,range,st,bulk,weight,cost]of expected){
  test(name+': exact UT113 model, skill, full source set and no cartridges',async()=>{
    const f=await gaussFixture(id),p=UT_DAZZLER_PROFILES[id],m=catalogs.getMode(id),e=catalogs.getEquipmentForMode(id);
    assert.equal(e.name,name);assert.equal(e.tech_level,'9');assert.equal(m.governing_skill.skill.name,'Beam Weapons');assert.equal(m.governing_skill.skill.specialization,'Projector');
    assert.equal(m.stats.accuracy,acc);assert.equal(m.stats.range,range);assert.equal(m.stats.rate_of_fire,'1');assert.equal(m.stats.recoil,'1');
    assert.equal(m.stats.strength,st);assert.equal(m.stats.bulk,bulk);assert.equal(m.stats.shots,n+'(3)');assert.equal(m.raw_calc.damage,`HT${penalty} aff (${width} yd)`);
    assert.equal(p.weightLb,weight);assert.equal(p.cost,cost);assert.equal(m.attack_resolution.geometry.width_yards_at_max_range,width);
    assert.equal(p.cellSize,cell);assert.equal(p.cells,cells);assert.equal(p.shots,n);
    assert.deepEqual(f.weapon().dazzlerBattery,{type:cell,cells,nonRechargeable:false,capacity:n,charge:n});
    assert.equal(f.weapon().ammunitionInventory,undefined);assert.deepEqual(f.weapon().magazines,[]);assert.equal(f.weapon().totalAmmo,0);
    assert.equal(f.attack().readinessReason,null);assert.equal(f.attack().platformRules.hitLocationNotApplicable,true);
    assert.equal(f.profile().damage.formula,null);assert.deepEqual(f.profile().damage.components,[]);assert.equal(f.profile().effective.damage,utDazzlerFormula(p));
  });
  test(name+': native prepared shot, immutable history, public shared HT button and compact chat',async()=>{
    const f=await gaussFixture(id),r=await f.shoot(),effect=messageResistanceEffect(r.message);
    assert.equal(r.rolled,true);assert.equal(r.rollData.followon,'');assert.equal(r.receipt.power.spent,1);assert.equal(r.receipt.magazineId,null);
    assert.equal(f.weapon().dazzlerBattery.charge,n-1);assert.deepEqual(r.message.whisper,[]);assert.equal(r.message.blind,false);
    assert.equal(effect.modifier,penalty);assert.equal(effect.source,'UT113');assert.equal(effect.halfRange,Number(range.split('/')[0].replaceAll(',','')));
    assert.equal(effect.outcome,'temporary-blindness');assert.doesNotMatch(JSON.stringify(effect),/actorId|tokenId|targetId/);
    const before=f.state();for(let i=0;i<3;i++){
      const chosen=messageResistanceEffect({flags:structuredClone(r.message.flags)});
      const result=resistanceOutcome(chosen,{finaltarget:10+penalty,rtotal:12,margin:10+penalty-12,failure:true,isCritSuccess:false,isCritFailure:false});
      assert.match(result.consequence,/UT113/);assert.match(result.consequence,new RegExp((12-10-penalty)+' мин'));
    }assert.deepEqual(f.state(),before);
    assert.equal(withRuntimeAmmoStats(f.attack(),f.actor,f.state()).data.damage,utDazzlerFormula(UT_DAZZLER_PROFILES[id]));
    const brief=ammunitionChatData(r.profile);assert.equal(brief.lines.length,2);assert.ok(brief.lines.join(' ').length<360);
  });
  test(name+': RoF one, cancellation and duplicate requests are safe',async()=>{
    const f=await gaussFixture(id),before=f.state();await assert.rejects(()=>f.shoot(2),/RoF/);assert.deepEqual(f.state(),before);
    await f.shoot(1,{cancel:true});assert.deepEqual(f.state(),before);
    const attackId=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId}),f.shoot(1,{attackId})]);assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
    await assert.rejects(()=>f.tx('add-magazines',{capacity:10,amount:1}),/магазин/);
  });
  test(name+': empty cell, NR whole set, stale forms, reload and editing',async()=>{
    const f=await gaussFixture(id),stale=f.state();await f.shoot();await f.service.saveState(stale);await new AmmoService(f.actor).loadState();
    assert.equal(readWeaponBattery(f.weapon()).charge,n-1);
    await f.definitions.save(new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.list()[0]}));await f.service.loadState();
    assert.equal(readWeaponBattery(f.weapon()).charge,n-1);await f.service.spendWeaponCharge(f.weapon().id,n-1);await assert.rejects(()=>f.shoot(),/Недостаточно/);
    await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).capacity,n*2);assert.equal(readWeaponBattery(f.weapon()).charge,n*2);
    assert.equal(readWeaponBattery(f.weapon()).cells,cells);await f.shoot();assert.equal(readWeaponBattery(f.weapon()).charge,n*2-1);
  });
  test(name+': ETC/LP rejection, valid source profile and ordinary-only execution',async()=>{
    const f=await gaussFixture(id),original=f.state();for(const executionVariant of ['etc','lp','gauss']){
      const state=structuredClone(original);state.weapons[0].executionVariant=executionVariant;await f.actor.setFlag('world','gurpsAmmoManager',state);
      assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());assert.deepEqual(f.state(),state);
    }
    assert.equal(utDazzlerDamage({damage:'1d burn',range},id).nativeSafe,false);
    assert.equal(weaponPowerProfile(original.weapons[0]).capacity,n);
  });
  test(name+': individual modifiers and B347-348 outcomes from shared resistance',()=>{
    const effect=utDazzlerDamage({damage:utDazzlerFormula(UT_DAZZLER_PROFILES[id]),range},id).rules.resistanceEffect;
    assert.equal(visionResistanceModifier(effect,{distance:'within',protectedVision:'no',membrane:0}).modifier,penalty);
    assert.equal(visionResistanceModifier(effect,{distance:'beyond',protectedVision:'yes',membrane:4}).modifier,penalty+12);
    for(const[total,target,cs,cf,success]of [[9,12,false,false,true],[12,5,false,false,false],[4,0,true,false,true],[12,0,false,false,false],[18,20,false,true,false]]){
      const r=resistanceOutcome(effect,{finaltarget:target,rtotal:total,margin:target-total,failure:total>=17||total>target,isCritSuccess:cs,isCritFailure:cf});
      assert.equal(r.success,success);if(total===12&&target===0)assert.equal(r.criticalFailure,true);
      assert.doesNotMatch(r.consequence,/калеч|постоянн/i);
    }
  });
}
test('Dazzler battery dialog is nonmodal; cancel has no effects and NR starts unchecked',async()=>{
  const f=await gaussFixture(expected[3][0]),before=f.state();const result=await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,
    DialogV2:{wait:async options=>{assert.equal(options.modal,false);assert.match(options.content,/2 B cell/);assert.doesNotMatch(options.content,/checked/);return false;}}});
  assert.equal(result,null);assert.deepEqual(f.state(),before);
});
test('old missing power is not refilled by opening',async()=>{
  const f=await gaussFixture(expected[0][0]),state=f.state();delete state.weapons[0].dazzlerBattery;await f.actor.setFlag('world','gurpsAmmoManager',state);
  await f.service.loadState();assert.equal(f.weapon().dazzlerBattery,undefined);await assert.rejects(()=>f.shoot());
});
