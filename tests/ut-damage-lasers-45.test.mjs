import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {BEAM_PROFILES,beamProfile} from '../scripts/ut-beam-source.js';
import {weaponPowerProfile,readWeaponBattery,batteryExpectation,newWeaponBattery} from '../scripts/tools/weapon-power.js';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {standaloneAvailableRounds} from '../scripts/tools/standalone-attack-service.js';
import {beamRange} from '../scripts/tools/ut-beam.js';
import {ammunitionChatData,ammunitionChatHTML} from '../scripts/tools/ammunition-chat-summary.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
const manifest=JSON.parse(await readFile(new URL('../data/ut-damage-lasers-45-manifest.json',import.meta.url),'utf8'));
const expectedSets='10F chemical D D D E 10F 2C C D 2C 2C 2C 2C B B B B 10F 2C integrated C D chemical F E 10F 2C integrated C D F 2C E chemical E F F 2C D 10F 2C C D F'.split(' ');
test('exact pre-change CatalogService inventory: 45 IDs, 18 surge; other burn systems excluded',()=>{
  assert.equal(manifest.length,45);assert.equal(new Set(manifest.map(r=>r.modeId)).size,45);
  assert.deepEqual(Object.keys(BEAM_PROFILES).sort(),manifest.map(r=>r.modeId).sort());
  assert.equal(manifest.filter(r=>r.raw.damage.includes('sur')).length,18);
  const live=catalogs.getCatalog('weapons').equipment.filter(e=>e.source==='UT'&&/^UT11[5-8]$/.test(e.reference)).flatMap(e=>e.modes.filter(m=>m.combat_type==='ranged'&&/^\d.*burn/.test(m.raw_calc?.damage??'')).map(m=>m.weapon_mode_id));
  assert.deepEqual(live.sort(),manifest.map(r=>r.modeId).sort());
  assert.equal(beamProfile('WaryGiX2EbvCktDl7'),null);
});
for(const [index,row]of manifest.entries()){
  test(row.name+': source stats, governing skill, source set, no cartridges, native preparation and one expenditure',async()=>{
    const f=await gaussFixture(row.modeId),p=BEAM_PROFILES[row.modeId],w=f.weapon(),mode=catalogs.getMode(row.modeId);
    assert.deepEqual(mode.stats,row.stats);assert.equal(mode.raw_calc.damage,row.raw.damage);
    assert.equal(w.totalAmmo,0);assert.deepEqual(w.magazines,[]);assert.equal(w.ammunitionInventory,undefined);
    assert.equal(f.service.readAttackAmmunition(w.id),null);
    assert.equal((p.cells>1?p.cells:'')+p.cellSize,expectedSets[index]);
    if(!p.oneShot){assert.ok(f.attack().readinessReason);await assert.rejects(()=>f.shoot(),/батар|топлив|источник/);await f.battery();}
    assert.equal(f.attack().readinessReason,null);
    assert.equal(f.attack().standaloneRef.governingSkill.family,p.skill.toLowerCase());
    assert.equal(f.attack().standaloneRef.governingSkill.specialty,p.specialization.toLowerCase());
    const profile=f.profile();assert.equal(profile.damage.nativeSafe,true);assert.equal(profile.effective.range,row.stats.range);
    assert.equal(profile.damage.formula,row.raw.damage.replace('burn, sur','burn sur'));
    assert.equal(profile.diceAdds.applied,false);
    const amount=Math.min(Number(row.stats.rate_of_fire),3),before=readWeaponBattery(f.weapon()).charge;
    const result=await f.shoot(amount);assert.equal(result.rolled,true);assert.equal(result.spent,0);
    assert.equal(result.receipt.power.spent,amount);assert.equal(result.receipt.power.cells,p.cells);
    assert.equal(readWeaponBattery(f.weapon()).charge,before-amount);
    assert.equal(result.snapshot.profile.damage.formula,profile.damage.formula);
    assert.equal(result.message.getFlag('olegurps-qol','shotSnapshot').profile.damage.formula,profile.damage.formula);
    assert.equal(result.receipt.magazineId,null);assert.equal(f.weapon().totalAmmo,0);
  });
  test(row.name+': cancellation, persistence and no refill on stale save/reload',async()=>{
    const f=await gaussFixture(row.modeId),p=BEAM_PROFILES[row.modeId];if(!p.oneShot)await f.battery();
    const before=structuredClone(f.state()),stale=structuredClone(before);
    const cancelled=await f.shoot(1,{cancel:true});assert.equal(cancelled.rolled,false);assert.deepEqual(f.state(),before);
    await f.shoot();const after=readWeaponBattery(f.weapon()).charge;
    await f.service.saveState(stale);assert.equal(readWeaponBattery(f.weapon()).charge,after);
    await new AmmoService(f.actor).loadState();assert.equal(readWeaponBattery(f.weapon()).charge,after);
    assert.equal(standaloneAvailableRounds(f.weapon()),after);
    if(p.oneShot){assert.equal(f.weapon().beamCrystal.sealedUsed,true);await assert.rejects(()=>f.battery(),/кристалл/);await assert.rejects(()=>f.shoot(),/Кристалл/);}
  });
}
test('all nine Rainbow skills follow printed table headers, not original Pistol import',()=>{
  for(const id of ['WQXf574e3MQgiqOjT','WdwCPV31W4KiCkUU4','WtuI6BNF1hhgDXR_Q','WWZwHBgeAlfdvGZb7'])assert.equal(catalogs.getMode(id).governing_skill.skill.specialization,'Rifle');
  for(const id of ['Wylv1NUHoY2bMMBFa','W50gKKdq3_8ZCqNA4','WLvTAej6RPNoyd8hQ'])assert.equal(catalogs.getMode(id).governing_skill.skill.name,'Gunner');
});
test('miles explicitly converted to yards without automatic atmospheric changes',()=>{
  assert.deepEqual(beamRange('5.5/17 mi'),{halfDamage:9680,maximum:29920,minimum:null,unit:'yards',sourceUnit:'mile'});
  assert.equal(beamRange('12,000/36,000 mi').maximum,63360000);
  assert.equal(beamRange('unknown'),null);
});
test('whole cell sets, NR twice shots, invalid partial sets; source capacity not inferred from cell letter',async()=>{
  const f=await gaussFixture('WOe0AiejW3FSlE-nO');await f.battery(true);assert.equal(readWeaponBattery(f.weapon()).capacity,56);
  const b=f.weapon();b.beamBattery.cells=1;assert.equal(readWeaponBattery(b),null);
  const ten=await gaussFixture('WIFpFU3L67kVgjIaA');await ten.battery();assert.equal(readWeaponBattery(ten.weapon()).cells,10);assert.equal(readWeaponBattery(ten.weapon()).capacity,83);
});
test('two concurrent unique attacks cannot overdraw last charge; duplicate request spends once',async()=>{
  const f=await gaussFixture('Wc8n7l5aGm-_aywZc');await f.battery();const s=f.state();s.weapons[0].beamBattery.charge=1;await f.actor.setFlag('world','gurpsAmmoManager',s);
  const result=await Promise.allSettled([f.shoot(),f.shoot()]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(readWeaponBattery(f.weapon()).charge,0);
  await f.battery();const id=crypto.randomUUID();await Promise.all([f.shoot(1,{attackId:id}),f.shoot(1,{attackId:id})]);assert.equal(readWeaponBattery(f.weapon()).charge,32);
});
test('crystals have exactly one sealed expenditure even with concurrent attacks',async()=>{
  for(const id of ['Wci8UZ1PotNMyGWgA','WQ2l-NQg-aohXfpJq']){const f=await gaussFixture(id);const r=await Promise.allSettled([f.shoot(),f.shoot()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.weapon().beamCrystal.charge,0);assert.equal(f.weapon().beamCrystal.sealedUsed,true);}
});
test('failure before completed native attack leaves energy and receipts unchanged',async()=>{
  const f=await gaussFixture('WK2APM9OSzUrmtcQb');await f.battery();const before=f.state();await assert.rejects(()=>f.shoot(1,{execute:async()=>{throw Error('GGA failure');}}),/GGA failure/);assert.deepEqual(f.state(),before);
});
test('stale and duplicate replacement, cancellation and missing legacy charge',async()=>{
  const f=await gaussFixture('Wc8n7l5aGm-_aywZc'),expected=batteryExpectation(f.weapon()),requestId=crypto.randomUUID();
  await f.service.replaceBattery(f.weapon().id,{expectedBattery:expected,requestId});await f.shoot();
  await f.service.replaceBattery(f.weapon().id,{expectedBattery:expected,requestId});assert.equal(readWeaponBattery(f.weapon()).charge,32);
  await assert.rejects(()=>f.service.replaceBattery(f.weapon().id,{expectedBattery:expected,requestId:crypto.randomUUID()}),/измен/);
  const before=f.state();assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async()=>false}}),null);assert.deepEqual(f.state(),before);
  const s=f.state();delete s.weapons[0].beamBattery;await f.actor.setFlag('world','gurpsAmmoManager',s);await f.service.loadState();assert.equal(f.weapon().beamBattery,undefined);
});
test('chemical packs have table shot counts, no LP or NR, and explicit replacement',async()=>{
  for(const [id,n]of [['WdE418jjnR9LT9qHl',40],['WpX009tH0GW_AT_qS',20],['WY4jJpxSq5uG4KNl2',100]]){const f=await gaussFixture(id);await f.battery();assert.equal(readWeaponBattery(f.weapon()).capacity,n);assert.equal(f.weapon().lpFuel,undefined);assert.throws(()=>newWeaponBattery(weaponPowerProfile(f.weapon()),true),/Non-Rechargeable/);}
});
test('beam rejects physical stocks, ETC/LP flags, excessive queue and unsafe deferred accounting',async()=>{
  const f=await gaussFixture('Wc8n7l5aGm-_aywZc');await f.battery();await assert.rejects(()=>f.tx('add-magazines',{capacity:5,amount:1}),/магазин/);
  await assert.rejects(()=>f.shoot(11),/лазера/);
  await assert.rejects(()=>f.service.executeShot({weaponId:f.weapon().id,attackId:crypto.randomUUID(),deferConsumption:true,prepare:()=>({amount:1,profile:f.profile()}),execute:async()=>{throw Error('must not reach');}}),/лазера/);
  const s=f.state();s.weapons[0].executionVariant='lp';await f.actor.setFlag('world','gurpsAmmoManager',s);assert.equal(f.profile().damage.nativeSafe,false);await assert.rejects(()=>f.shoot());
});
test('OWNER can use resources; non-owner cannot fire or replace',async()=>{
  const f=await gaussFixture('WK2APM9OSzUrmtcQb');await f.battery();await f.shoot();f.actor.isOwner=false;
  await assert.rejects(()=>f.shoot(),/Permission/);await assert.rejects(()=>f.battery(),/Permission/);
});
test('Beam chat notes stay short, Russian under en and ru and closed by default',async()=>{
  const f=await gaussFixture('WyjXKeL0uUgpH4lj-');await f.battery();
  for(const lang of ['en','ru']){game.i18n.lang=lang;const p=f.profile(),data=ammunitionChatData(p),html=ammunitionChatHTML(p,x=>x);assert.equal(data.lines.length,2);assert.ok(data.lines.join('').length<400);assert.match(html,/<details class=".*olegurps-chat-details/);assert.doesNotMatch(html,/<details[^>]*\sopen/);assert.match(html,/вручную/);assert.equal(p.effective.range,'5.5/17 mi');assert.equal(p.damage.rules.beam.automaticEnvironment,false);}
});
test('Semi-Portable chemical exception records user authority and unique UT115 tank properties',async()=>{
  const f=await gaussFixture('WY4jJpxSq5uG4KNl2'),p=catalogs.getMode('WY4jJpxSq5uG4KNl2').beam_source;
  assert.equal(p.chemical,true);assert.equal(p.cellSize,'chemical');assert.equal(p.shots,100);
  assert.equal(p.projectPolicy.authority,'user-approved-project-exception');
  assert.deepEqual(p.projectPolicy.tank,{sizeModifier:-2,dr:10,hp:12,splashDamage:'2d cor',splashRadiusYards:2,weightLb:null,cost:null});
  assert.match(p.projectPolicy.sourceConflict,/70\/Ep/);await f.battery();
  const data=ammunitionChatData(f.profile());assert.equal(data.lines.length,3);assert.match(data.lines.join(' '),/SM−2, DR10, HP12/);
});
test('old Semi-Portable E-cell does not authorize chemical fire or get silently converted',async()=>{
  const f=await gaussFixture('WY4jJpxSq5uG4KNl2'),s=f.state();s.weapons[0].beamBattery={type:'E',capacity:100,charge:73,cells:1,nonRechargeable:false};
  await f.actor.setFlag('world','gurpsAmmoManager',s);await f.service.loadState();await assert.rejects(()=>f.shoot(),/источник/);
  await f.battery();await f.shoot(10);assert.equal(f.weapon().beamChemical.charge,90);assert.equal(f.weapon().beamBattery.charge,73);
});
test('source Beam classification drives elevation and published Acc/Aim for all 45',async()=>{
  const {isBeamWeapon,calculateEffectiveDistance}=await import('../scripts/tools/fire-range-service.js');
  const {resolveAimedFireBonuses}=await import('../scripts/tools/fire-service.js');
  for(const row of manifest){const f=await gaussFixture(row.modeId),a=f.attack();assert.equal(isBeamWeapon(a),true);assert.equal(calculateEffectiveDistance(100,50,{beamWeapon:isBeamWeapon(a),elevationDirection:'high'}),100);
    const aim=resolveAimedFireBonuses({accuracy:a.acc,scopeBonus:a.scopeBonus,aimSeconds:3,braced:false,laserSight:false,moveAndAttack:false});assert.equal(aim.aimBonus,Number(row.stats.accuracy.split('+')[0])+2);}
});
test('exact registry cannot admit prototype keys or unrelated Beam families',()=>{
  for(const id of ['__proto__','constructor','toString','WaryGiX2EbvCktDl7','WX_LmRHi1yv6wEKcu'])assert.equal(beamProfile(id),null);
  assert.equal(Object.values(BEAM_PROFILES).filter(p=>p.chemical).length,3);
  assert.equal(Object.values(BEAM_PROFILES).filter(p=>!p.chemical&&!p.oneShot).length,40);
});
