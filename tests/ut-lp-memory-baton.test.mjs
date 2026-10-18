import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,load,shoot,catalogs,automatic,resolver} from './helpers/ut-ammunition-fixture.mjs';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {LP_PROFILES,lpAdmission} from '../scripts/tools/ut-liquid-propellant.js';
import {parseKineticDamage} from '../scripts/tools/kinetic-damage-math.js';
import {normalizeDamageDiceAdds} from '../scripts/tools/damage-dice-adds.js';
import {lpBallistics} from '../scripts/tools/ut-liquid-propellant.js';
import {ammunitionChatData} from '../scripts/tools/ammunition-chat-summary.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';

const magnum='WIAo1otMCstnbi4Dv';
const configure=async(fx,variant)=>{const s=fx.state();s.weapons[0].executionRequest={variant,modeId:fx.carrier.standaloneModeId};await fx.service.saveState(s);};
const policy=async(enabled,run)=>{const user=game.user;game.user={...user,getFlag:()=>enabled};try{return await run();}finally{game.user=user;}};
async function ready(id=magnum,variant='lp',mode='boosted',recipe='ut_memory_baton',parameters={}){
  const fx=await fixture(id);
  if(variant!=='ordinary')await configure(fx,variant);
  if(variant==='lp')await fx.service.setLPFireMode(fx.carrier.id,mode);
  const base=fx.candidates().find(t=>!t.recipe),prepared=recipe?automatic.prepare({modeId:id,base,variantId:recipe,parameters}):null;
  if(prepared){assert.equal(prepared.state,'complete',prepared.reasons);await fx.transaction('save-recipe',{type:prepared.type});}
  await load(fx,prepared?.type??base);
  return fx;
}

// UT137-139/154: all five existing LP carriers of the three admitted families.
const models=[
  [magnum,'15mmCLP','4d+1','6d+2','2d',['47/520','70.6/780','61.2/676','23.6/260']],
  ['WlstnlxI_Mm-2UJf0','15mmCL','15d','6dx4','7d+2',['400/1800','600/2700','520/2340','200/900']],
  ['W6bX3WBkGZdZfoeMu','15mmCL','15d','6dx4','7d+2',['400/1800','600/2700','520/2340','200/900']],
  ['WdUnAFzFvv59Smhhk','25mmCL','10d','6dx3','5d',['140/1700','210/2550','182/2210','70/850']],
  ['WgqAB3QGTUZrgtdES','25mmCL','10d','6dx3','5d',['140/1700','210/2550','182/2210','70/850']]
];
for(const [id,family,base,etc,low,ranges]of models)
for(const [variant,mode,dice,range,units]of [
  ['ordinary','standard',base,ranges[0],0],['etc','standard',etc,ranges[1],0],
  ['lp','standard',base,ranges[0],4],['lp','boosted',base,ranges[2],6],['lp','low-velocity',low,ranges[3],1]
])for(const enabled of [true,false])test(`${id} ${family} ${variant}/${mode} Memory Baton B269=${enabled}`,()=>policy(enabled,async()=>{
  const fx=await ready(id,variant,mode),formula=dice+'(0.25) cr dkb',p=fx.profile(),before=fx.weapon();
  assert.equal(p.damage.nativeSafe,true);assert.equal(p.damage.formula,formula);assert.equal(p.effective.damage,formula);
  assert.equal(p.effective.range,range);assert.equal(p.diceAdds.enabled,enabled);assert.equal(p.diceAdds.eligible,false);assert.equal(p.diceAdds.applied,false);
  assert.equal(p.damage.components.find(c=>c.role==='kinetic').formula,formula);
  const attack=withRuntimeAmmoStats(fx.attack(),fx.actor);assert.equal(attack.data.damage,formula);assert.equal(attack.data.range,range);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack,mode:'weapon',fireState:{}});
  assert.ok(app._getAttackStatsText(p.effective.rof).includes(formula));assert.ok(ammunitionChatData(p).lines.length<=3);
  for(let i=0;i<3;i++)assert.equal(withRuntimeAmmoStats(attack,fx.actor).data.damage,formula);
  const result=await shoot(fx);assert.equal(result.spent,1);assert.equal(result.snapshot.profile.damage.formula,formula);
  assert.equal(result.snapshot.profile.effective.range,range);assert.equal(fx.weapon().totalAmmo,before.totalAmmo-1);
  if(units){assert.equal(result.receipt.fuel.spentUnits,units);assert.equal(fx.weapon().lpFuel.remainingUnits,before.lpFuel.remainingUnits-units);}
  else assert.equal(result.receipt.fuel,undefined);
  if(variant==='etc'){assert.equal(result.receipt.power.spent,1);assert.equal(fx.weapon().etcBattery.charge,before.etcBattery.charge-1);}
  const saved=JSON.stringify(result.snapshot),resources=JSON.stringify(fx.state());
  await shoot(fx,1,{attackId:result.snapshot.attackId});assert.equal(JSON.stringify(fx.state()),resources);assert.equal(JSON.stringify(result.snapshot),saved);
}));

for(const enabled of [true,false])test('LP Boosted retains ordinary piercing bonus before B269 '+enabled,()=>policy(enabled,async()=>{
  const fx=await ready(magnum,'lp','boosted',null),p=fx.profile();
  assert.equal(p.damage.formula,enabled?'5d+1 pi++':'4d+5 pi++');assert.equal(p.effective.range,'306/3380');
  const result=await shoot(fx,2);assert.equal(result.spent,2);assert.equal(result.receipt.fuel.spentUnits,12);
}));

for(const enabled of [true,false])test('LP Boosted APDS keeps both per-original-die bonuses '+enabled,()=>policy(enabled,async()=>{
  const fx=await ready(magnum,'lp','boosted','ut_apds');
  assert.equal(fx.profile().damage.formula,enabled?'6d+2(2) pi+':'4d+9(2) pi+');
  assert.equal(fx.profile().effective.range,'459/5070');
}));

for(const enabled of [true,false])test('Homing Memory Baton also rejects the LP piercing bonus '+enabled,()=>policy(enabled,async()=>{
  const fx=await ready(magnum,'lp','boosted','ut_homing',{availabilityTL:9,homingGuidance:'infrared',warheadVariant:'ut_memory_baton'}),p=fx.profile();
  assert.equal(p.damage.formula,'4d+1(0.25) cr dkb');assert.equal(p.effective.range,'61.2/676');assert.ok(p.damage.rules.manualHoming);
  const result=await shoot(fx,1,{context:{manualGuidanceConfirmed:true}});assert.equal(result.receipt.fuel.spentUnits,6);
}));

test('switching recipe, magazine, mode and execution keeps resources and historical Baton profiles',async()=>{
  const fx=await ready(),old=await shoot(fx),historical=JSON.stringify(old.snapshot),fuel=fx.weapon().lpFuel.remainingUnits;
  await fx.transaction('add-magazines',{amount:1,capacity:14});const first=fx.weapon().ammunitionInventory.installedId;
  const second=fx.weapon().ammunitionInventory.magazines.find(m=>m.id!==first).id;
  const base=fx.candidates().find(t=>!t.recipe);await fx.transaction('add-stock',{ammoKey:base.key,amount:3});await fx.transaction('load',{magazineId:second,ammoKey:base.key,amount:3});
  await fx.transaction('install',{magazineId:second});assert.equal(fx.profile().damage.formula,'5d+1 pi++');
  await fx.transaction('install',{magazineId:first});assert.equal(fx.profile().damage.formula,'4d+1(0.25) cr dkb');assert.equal(fx.weapon().lpFuel.remainingUnits,fuel);
  for(const mode of ['standard','low-velocity','boosted'])await fx.service.setLPFireMode(fx.carrier.id,mode);
  await configure(fx,'etc');assert.equal(fx.profile().damage.formula,'6d+2(0.25) cr dkb');await configure(fx,'lp');
  assert.equal(fx.profile().damage.formula,'4d+1(0.25) cr dkb');assert.equal(fx.weapon().lpFuel.remainingUnits,fuel);
  assert.equal(JSON.stringify(old.snapshot),historical);const saved=JSON.stringify(fx.state());await shoot(fx,1,{attackId:old.snapshot.attackId});assert.equal(JSON.stringify(fx.state()),saved);
});

test('every available non-piercing UT replacement keeps its own full payload under LP Boosted',async()=>{
  const matrix=buildUTMatrix(catalogs,await loadUTSourceContract());let count=0,nestedCount=0;const categories=new Set();
  for(const id of Object.keys(LP_PROFILES)){
    const fx=await fixture(id),base=fx.candidates().find(t=>!t.recipe);await configure(fx,'lp');await fx.service.setLPFireMode(fx.carrier.id,'boosted');
    for(const row of matrix.rows.filter(r=>r.configurationId===id&&r.implementation==='available'&&!['etc','liquid_propellant'].includes(r.candidateId))){
      const prepared=row.recipeVariant?automatic.prepare({modeId:id,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters}}):null;
      if(prepared)assert.equal(prepared.state,'complete');const type=prepared?.type??base;
      const args={actorId:fx.actor.id,weaponId:fx.carrier.id,attack:fx.attack(),rawAttack:fx.attack().data,binding:{status:'confirmed',binding:{confirmed:true,modeId:id}},
        ammunition:{kind:'physical-magazine',type,ammoKey:type.key,available:1,total:1},profilePolicy:'permissive'};
      const ordinary=resolver.resolve({...args,state:{weapons:[]}});if(parseKineticDamage(ordinary.damage.formula))continue;
      const boosted=resolver.resolve({...args,state:fx.state()});assert.equal(boosted.damage.nativeSafe,true,id+':'+row.candidateId);
      assert.equal(boosted.damage.formula,ordinary.damage.formula,id+':'+row.candidateId);assert.deepEqual(boosted.damage.components,ordinary.damage.components,id+':'+row.candidateId);
      assert.equal(boosted.diceAdds.eligible,false);assert.equal(boosted.weaponConfiguration.unitsPerShot,6);categories.add(row.candidateId);count++;
      if(row.recipeVariant&&!['ut_sefop','ut_shotshell'].includes(row.recipeVariant)){
        const nested=automatic.prepare({modeId:id,base,variantId:'ut_homing',parameters:{availabilityTL:prepared.facts.availabilityTL,
          homingGuidance:'infrared',warheadVariant:row.recipeVariant,...row.recipeParameters}});
        if(nested.state==='complete'){
          const ammunition={...args.ammunition,type:nested.type,ammoKey:nested.type.key};
          const original=resolver.resolve({...args,ammunition,state:{weapons:[]}}),converted=resolver.resolve({...args,ammunition,state:fx.state()});
          assert.equal(converted.damage.nativeSafe,true);assert.equal(converted.damage.formula,original.damage.formula,id+':Homing:'+row.candidateId);
          assert.deepEqual(converted.damage.components,original.damage.components);nestedCount++;
        }
      }
    }
  }
  assert.equal(count,114);assert.equal(nestedCount,91);assert.equal(categories.size,21);assert.ok(categories.has('memory_baton'));assert.ok(categories.has('plasma'));assert.ok(categories.has('hemp'));
});

for(const enabled of [true,false])test('all 18 Monochain cut replacements omit Boosted bonus while piercing retains it '+enabled,()=>policy(enabled,async()=>{
  for(const id of Object.keys(LP_PROFILES)){
    const fx=await ready(id,'lp','boosted','ut_monochain'),p=fx.profile(),base=parseKineticDamage(p.raw.damage);
    const cut=base.diceText+'(10) cut',boosted=lpBallistics(p.raw,id,'boosted').damage;
    assert.equal(p.diceAdds.eligible,catalogs.getMode(id).weapon_family==='firearm');
    assert.equal(p.damage.formula,enabled&&p.diceAdds.eligible?normalizeDamageDiceAdds(boosted):boosted,id);
    assert.equal(p.damage.components.find(c=>c.role==='main-charge').formula,cut,id);
    assert.equal(p.damage.components.find(c=>c.role==='main-charge').relation,'alternative');
    assert.deepEqual(p.damage.rules.resultDivisors,{kinetic:2,'main-charge':2});assert.equal(p.damage.rules.attackBonus,1);
    const range=lpBallistics(p.raw,id,'boosted').range.split('/').map(Number);assert.equal(p.effective.range,range[0]/2+'/'+range[1]/2);
    const shot=await shoot(fx);assert.equal(shot.receipt.fuel.spentUnits,6);assert.equal(shot.spent,1);
    assert.equal(shot.snapshot.profile.damage.components.find(c=>c.role==='main-charge').formula,cut);
  }
}));

for(const enabled of [true,false])test('Homing Monochain preserves the split between piercing and replacement cut '+enabled,()=>policy(enabled,async()=>{
  const fx=await ready(magnum,'lp','boosted','ut_homing',{availabilityTL:9,homingGuidance:'infrared',warheadVariant:'ut_monochain'}),p=fx.profile();
  assert.equal(p.damage.formula,enabled?'5d+1 pi++':'4d+5 pi++');assert.equal(p.damage.components.find(c=>c.role==='main-charge').formula,'4d+1(10) cut');
  assert.equal(p.effective.range,'153/1690');const shot=await shoot(fx,1,{context:{manualGuidanceConfirmed:true}});assert.equal(shot.receipt.fuel.spentUnits,6);
}));

test('ordinary, ETC, LP Standard and Low Velocity Monochain keep their previous cut and primary dice',async()=>{
  for(const [variant,mode,dice,range]of [['ordinary','standard','4d+1','117.5/1300'],['etc','standard','6d+2','176.5/1950'],['lp','standard','4d+1','117.5/1300'],['lp','low-velocity','2d','59/650']]){
    const fx=await ready(magnum,variant,mode,'ut_monochain'),p=fx.profile();assert.equal(p.damage.formula,dice+' pi++');
    assert.equal(p.damage.components.find(c=>c.role==='main-charge').formula,dice+'(10) cut');assert.equal(p.effective.range,range);
    assert.deepEqual(p.damage.rules.resultDivisors,{kinetic:2,'main-charge':2});assert.equal(p.damage.rules.attackBonus,1);
  }
});

test('the fix does not admit smaller Baton calibers or excluded LP carriers',async()=>{
  const fx=await fixture('W9chB7ydzOWTAxQP0'),base=fx.candidates().find(t=>!t.recipe);
  assert.notEqual(automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_memory_baton'}).state,'complete');
  for(const id of ['WOMuCBSS_c_nIstvm','W5_HQQYf_zjoG9A7J','WRvS5pz3LMCzqQyiZ'])assert.equal(lpAdmission(id,catalogs,12).allowed,false);
});
