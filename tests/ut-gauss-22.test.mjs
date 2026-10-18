import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gaussFixture, catalogs, compatibility, automatic } from './helpers/gauss-context.mjs';
import { GAUSS_PROFILES, GAUSS_PROJECT_POLICY, projectGaussCatalog } from '../scripts/ut-gauss-source.js';
import { GAUSS_SPEEDS, gaussBallistics, gaussSpeedHTML } from '../scripts/tools/ut-gauss.js';
import { readWeaponBattery, batteryExpectation, weaponBatteryHTML, weaponPowerReason } from '../scripts/tools/weapon-power.js';
import { magazinePolicy } from '../scripts/tools/magazine-policy.js';
import { withRuntimeAmmoStats } from '../scripts/tools/attack-profile-runtime.js';
import { resolveAmmunitionEffects } from '../scripts/tools/ammunition-effects.js';
import { standaloneModeStats } from '../scripts/tools/standalone-weapon-service.js';
import { normalizeDamageDiceAdds } from '../scripts/tools/damage-dice-adds.js';
import { confirmBatteryReplacement } from '../scripts/tools/battery-replacement-dialog.js';
import { WeaponConfigurationDraft } from '../scripts/tools/weapon-configuration.js';
import { utBriefInstructions } from '../scripts/tools/ammunition-chat-summary.js';

for(const p of Object.values(GAUSS_PROFILES)) {
  test('Gauss physical stock/power/native GGA/reload: '+p.modeId,async()=>{
    const f=await gaussFixture(p.modeId),base=f.candidates().find(t=>!t.recipe&&!t.unavailable);
    assert.ok(base,p.modeId);assert.equal(base.ammoId,p.familyId);assert.equal(f.weapon().totalAmmo,0);
    assert.equal(f.weapon().capacity,p.feedCapacity);assert.equal(magazinePolicy(f.weapon()).limit,5);
    assert.equal(f.weapon().gaussBattery,undefined);assert.equal(f.weapon().lpFuel,undefined);
    if(!p.external){assert.match(f.attack().readinessReason,/батарею/);await f.battery();assert.equal(readWeaponBattery(f.weapon()).charge,p.shots*4);}
    else assert.equal(f.power(),null);
    assert.equal(f.attack().readinessReason,null);
    const system=structuredClone(f.actor.system);await f.load(base,Math.max(3,Math.min(p.feedCapacity,20)));
    const before=f.weapon().totalAmmo,shot=await f.shoot();assert.equal(shot.rolled,true);assert.equal(shot.spent,1);
    assert.equal(f.weapon().totalAmmo,before-1);assert.equal(shot.profile.damage.nativeSafe,true);
    assert.equal(shot.profile.damage.formula,normalizeDamageDiceAdds(f.attack().data.damage));
    if(!p.external){assert.equal(shot.receipt.power.spent,4);assert.equal(readWeaponBattery(f.weapon()).charge,(p.shots-1)*4);}
    else {assert.equal(shot.receipt.power,undefined);assert.equal(f.weapon().gaussBattery,undefined);}
    const state=JSON.stringify(f.state());await f.service.loadState();assert.equal(JSON.stringify(f.state()),state);
    assert.deepEqual(shot.message.getFlag('olegurps-qol','shotSnapshot'),shot.snapshot);assert.deepEqual(f.actor.system,system);
    assert.equal(shot.profile.weaponConfiguration.variant,'gauss');
  });
  test('Gauss speed modes freeze Damage and spend integer energy: '+p.modeId,async()=>{
    const f=await gaussFixture(p.modeId);if(!p.external)await f.battery();await f.load(undefined,p.feedCapacity);
    const capacity=f.weapon().capacity;
    for(const speed of ['boosted','low-velocity']){
      await f.service.setGaussSpeed(f.weapon().id,speed);const raw=f.attack().data,expected=gaussBallistics(raw,p.modeId,speed),preview=withRuntimeAmmoStats(f.attack(),f.actor);
      assert.equal(preview.data.damage,catalogs.getMode(p.modeId).weapon_family==='firearm'?normalizeDamageDiceAdds(expected.damage):expected.damage);assert.equal(preview.data.range,expected.range);
      const before=readWeaponBattery(f.weapon())?.charge,shot=await f.shoot();assert.equal(shot.rolled,true);
      if(!p.external)assert.equal(before-readWeaponBattery(f.weapon()).charge,GAUSS_SPEEDS[speed].units);
      const frozen=JSON.stringify(shot.snapshot);await f.service.setGaussSpeed(f.weapon().id,'standard');assert.equal(JSON.stringify(shot.snapshot),frozen);
      assert.equal(f.weapon().capacity,capacity);assert.equal(f.weapon().lpFuel,undefined);
    }
  });
  test('Gauss exact family and every displayed special recipe: '+p.modeId,async()=>{
    const f=await gaussFixture(p.modeId);const candidates=f.candidates();
    assert.ok(candidates.every(t=>t.ammoId===p.familyId));
    for(const id of ['3mm_n','3mm_ice','10mm_cl','18_5mm_pc','25mm_pc',...Object.values(GAUSS_PROFILES).map(p=>p.familyId)])
      if(id!==p.familyId)assert.notEqual(compatibility.checkCompatibility(p.modeId,id,{book:'ut',kind:'ammo-family'}).status,'compatible');
    for(const t of candidates.filter(t=>t.recipe&&!t.unavailable)){
      const prepared=automatic.prepare({modeId:p.modeId,base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:p.familyId},
        variantId:t.recipe.variantId,parameters:t.recipe.parameters});
      assert.equal(prepared.state,'complete',t.name);
      const d=resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(p.modeId)),variantId:t.recipe.variantId,
        baseStatus:prepared.baseStatus,constructionStatus:prepared.rulesStatus,facts:prepared.facts});assert.equal(d.nativeSafe,true,t.name);
      await f.tx('add-stock',{ammoKey:t.key,amount:1});
    }
    assert.equal(candidates.some(t=>t.recipe?.variantId==='ut_aphc'&&!t.unavailable),false);
    assert.equal(candidates.some(t=>t.recipe?.variantId==='ut_apep'&&!t.unavailable),false);
    if(p.nail)assert.equal(candidates.filter(t=>!t.unavailable).length,1);
    else if(p.coilgun)assert.ok(candidates.some(t=>t.recipe?.variantId==='ut_apds'&&!t.unavailable));
    else assert.equal(candidates.some(t=>t.recipe?.variantId==='ut_apds'&&!t.unavailable),false);
    if(p.railgun)assert.equal(candidates.some(t=>t.recipe?.variantId==='ut_apds'&&!t.unavailable),false);
  });
}

test('exact UT power cells/sets, approved conflicts and tool autonomy',()=>{
  const g=GAUSS_PROFILES;assert.equal(Object.keys(g).length,22);
  assert.deepEqual(['WQgMjnVvLnZiHzMnk','WmiUP8hzgsvbFNy4_','WUT2007GaussNeedler3mm','WkhAN9tcmB9eEkmY6','W__0RKAth-4yvVBSl']
    .map(id=>[g[id].cellSize,g[id].cells,g[id].shots]),[['B',1,25],['B',2,40],['B',2,100],['D',1,30],['D',1,4]]);
  assert.deepEqual(['WWkrDTQ7VS2Qucb0-','W0SxgGEVdQ84ypsCw','W7FIiW8jX03PnOzxz'].map(id=>g[id].shots),[300,1000,3000]);
  const hmg=catalogs.getMode('WbvkCgoaLuWViWyKK');assert.equal(hmg.stats.shots,'200(5)');assert.equal(hmg.ammunition_profile.primary_ammo_family_id,'7mm_em');assert.match(hmg.ut_gauss.conflict,/4000/);
  assert.equal(catalogs.getEquipmentForMode('WJstukbcBFPxQFtJE').tech_level,'10');assert.equal(GAUSS_PROJECT_POLICY.coilgunAPDS,true);
});

test('empty energy, full burst, cancel/error, duplicate and competing OWNER attacks',async()=>{
  const f=await gaussFixture('WmiUP8hzgsvbFNy4_');await f.battery();await f.load(undefined,40);
  const before=JSON.stringify(f.state());assert.equal((await f.shoot(1,{cancel:true})).rolled,false);
  await assert.rejects(f.shoot(1,{execute:async()=>{throw Error('executor');}}),/executor/);assert.equal(JSON.stringify(f.state()),before);
  const attackId=crypto.randomUUID();const shots=await Promise.all([f.shoot(20,{attackId}),f.shoot(20,{attackId})]);
  assert.equal(f.weapon().totalAmmo,20);assert.equal(readWeaponBattery(f.weapon()).charge,80);assert.equal(shots.filter(s=>s.receipt?.attackId===attackId).length,2);
  await f.service.setGaussSpeed(f.weapon().id,'boosted');await assert.rejects(f.shoot(20),/энергии/);
  await f.service.setGaussSpeed(f.weapon().id,'standard');const results=await Promise.allSettled([f.shoot(20),f.shoot(20)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(readWeaponBattery(f.weapon()).charge,0);
  await f.load(undefined,1);await assert.rejects(f.shoot(),/разряжена/);
});

test('EMGL requires explicit host Bulk/ST/sights; no inherited host energy',async()=>{
  const f=await gaussFixture('Wq7SXzV-qosc5iY1q',{host:false});await f.battery();assert.match(f.attack().readinessReason,/носителя/);
  const d=new (await import('../scripts/tools/standalone-weapon-service.js')).StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.get(f.record.id)});
  for(const[k,v]of Object.entries({hostBulk:'-4',st:'9',acc:'6+1'}))d.setOverride('Wq7SXzV-qosc5iY1q',k,v);
  await f.definitions.save(d);assert.equal(f.attack().readinessReason,null);assert.equal(f.attack().bulk,-4);assert.equal(f.attack().acc,6);assert.equal(f.attack().scopeBonus,1);
  assert.equal(readWeaponBattery(f.weapon()).type,'C');
});

test('replacement is explicit, stale-safe, repeat-safe, full 2B set, and Non-Rechargeable doubles only energy',async()=>{
  const f=await gaussFixture('WmiUP8hzgsvbFNy4_');const before=JSON.stringify(f.state());
  assert.equal(await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async()=>false}}),null);
  assert.equal(JSON.stringify(f.state()),before);const options={requestId:'pair',expectedBattery:null,nonRechargeable:true};
  await f.service.replaceBattery(f.weapon().id,options);await f.service.replaceBattery(f.weapon().id,options);
  assert.equal(readWeaponBattery(f.weapon()).capacity,320);assert.equal(readWeaponBattery(f.weapon()).cells,2);assert.equal(f.weapon().capacity,40);
  await assert.rejects(f.service.replaceBattery(f.weapon().id,{...options,requestId:'stale'}),/./);
  assert.match(weaponBatteryHTML(f.weapon(),false,String),/2×B/);assert.match(gaussSpeedHTML(f.weapon(),String),/Скорость EM/);
  f.actor.isOwner=false;await assert.rejects(f.battery(),/Permission/);await assert.rejects(f.service.setGaussSpeed(f.weapon().id,'boosted'),/Permission/);
});

test('100-round Minigun and stale unrelated saves preserve energy/speed; historical matrix untouched',async()=>{
  const f=await gaussFixture('WJstukbcBFPxQFtJE');await f.battery();await f.load(undefined,200);
  const stale=f.state();await f.service.setGaussSpeed(f.weapon().id,'boosted');await f.shoot(100);
  await f.service.saveState(stale);assert.equal(readWeaponBattery(f.weapon()).charge,3400);assert.equal(f.weapon().gaussSpeed,'boosted');assert.equal(f.weapon().totalAmmo,100);
  const matrix=JSON.parse(await readFile(new URL('../data/ut-weapon-ammunition-matrix.json',import.meta.url),'utf8'));
  assert.equal(matrix.rows.length,2484);
});

test('APDS then B269 is applied once after the EM per-source-die bonus; users and history stay separate',async()=>{
  const f=await gaussFixture('WegCPnwG-HS41cU29');await f.battery();const type=f.candidates().find(t=>t.recipe?.variantId==='ut_apds');await f.load(type,3);
  await f.service.setGaussSpeed(f.weapon().id,'boosted');
  const on=f.profile({diceAddsPolicy:{version:1,userId:'A',enabled:true}}),off=f.profile({diceAddsPolicy:{version:1,userId:'B',enabled:false}});
  assert.equal(on.damage.formula,'10d(2) pi-');assert.equal(off.damage.formula,'6d+14(2) pi-');assert.equal(on.effective.range,'2340/9360');
  const shot=await f.shoot(),frozen=JSON.stringify(shot.snapshot);await f.service.setGaussSpeed(f.weapon().id,'low-velocity');
  assert.equal(JSON.stringify(shot.snapshot),frozen);assert.equal(shot.receipt.power.spent,6);
});

test('Gauss Shotshell spends physical shells once; Memory Baton and independent HEC retain their own damage rules',async()=>{
  const f=await gaussFixture('WD2iXlhuCPJV64Nt7');await f.battery();
  const shot=f.candidates().find(t=>t.recipe?.variantId==='ut_shotshell');await f.load(shot,6);
  const p=f.profile();assert.equal(p.damage.formula,'2d pi');assert.equal(p.effective.rof,'15x9');assert.equal(p.effective.rcl,1);assert.equal(p.effective.range,'100/500');
  const s=await f.shoot(3);assert.equal(s.spent,3);assert.equal(s.receipt.power.spent,12);
  await f.tx('unload',{magazineId:f.weapon().ammunitionInventory.installedId,amount:3});
  const baton=f.candidates().find(t=>t.recipe?.variantId==='ut_memory_baton');await f.load(baton,2);await f.service.setGaussSpeed(f.weapon().id,'boosted');
  assert.equal(f.profile().damage.formula,'8d(0.25) cr dkb');assert.equal(f.profile().effective.range,'52/260');
  const rail=await gaussFixture('WdV0VzMAch5j8pxdy');const hec=rail.candidates().find(t=>t.recipe?.variantId==='ut_hec'&&t.recipe.parameters.availabilityTL===10);await rail.load(hec,2);
  const rp=rail.profile();assert.equal(rp.damage.formula,'6dx25 pi++');assert.equal(rp.damage.components.find(c=>c.role==='linked').formula,'8d+8 cr ex');
});

test('service rejects wrong physical Gauss family and fabricated warhead even with permissive UI candidates',async()=>{
  const f=await gaussFixture('Wd5PTxwpIa1Irq42i'),before=JSON.stringify(f.state());
  const wrong={source:'catalog',book:'ut',kind:'ammo-family',ammoId:'3mm_n',key:'ut:ammo-family:3mm_n',name:'wrong'};
  await assert.rejects(f.service.inventoryTransaction(f.weapon().id,'add-stock',{ammoKey:wrong.key,type:wrong,amount:1},{allowedTypes:[wrong]}),/TypeUnavailable/);
  const fake={...f.candidates().find(t=>!t.recipe),recipe:{version:1,variantId:'ut_aphc'}};
  await assert.rejects(f.service.inventoryTransaction(f.weapon().id,'add-stock',{ammoKey:fake.key,type:fake,amount:1},{allowedTypes:[fake]}),/TypeUnavailable/);
  assert.equal(JSON.stringify(f.state()),before);
});

test('Gauss magazine limits include empty/installed objects and preserve their exact capacity',async()=>{
  const f=await gaussFixture('Wd5PTxwpIa1Irq42i');await f.tx('add-magazines',{amount:4,capacity:40});
  const before=JSON.stringify(f.state());await assert.rejects(f.tx('add-magazines',{amount:1,capacity:40}),/MagazineLimit/);
  assert.equal(JSON.stringify(f.state()),before);await assert.rejects((await gaussFixture('Wcll8hDIppP48GXcD')).tx('add-magazines',{amount:1,capacity:40}),/CapacityExceeded/);
});

test('generated Gauss matrix covers every source candidate at each TL without duplicates or admissible omissions',async()=>{
  const {buildGaussMatrix}=await import('../tools/build-ut-gauss-matrix.mjs');const matrix=buildGaussMatrix(catalogs);
  assert.equal(matrix.summary.models,22);assert.equal(matrix.summary.blocked,0);assert.equal(new Set(matrix.rows.map(r=>r.id)).size,matrix.rows.length);
  assert.deepEqual(buildGaussMatrix(catalogs),matrix);
  assert.deepEqual(JSON.parse(await readFile(new URL('../data/ut-gauss-ammunition-matrix.json',import.meta.url),'utf8')),matrix);
  for(const p of Object.values(GAUSS_PROFILES))for(const candidate of [...catalogs.getCatalog('ut').warheads,...catalogs.getCatalog('ut').special_loads])
    assert.ok(matrix.rows.some(r=>r.modeId===p.modeId&&r.candidateId===candidate.id),p.modeId+'/'+candidate.id);
});

test('Gauss configuration preview and cancel write nothing; saved speed preserves battery and magazines',async()=>{
  const f=await gaussFixture('WegCPnwG-HS41cU29');await f.battery();await f.load();
  const model=new WeaponConfigurationDraft({actor:f.actor,state:f.state(),attacks:[],existing:f.weapon(),catalogs,ammunition:compatibility});
  const before=JSON.stringify(f.flags);model.gaussSpeed='boosted';model.gaussSpeedChanged=true;
  const preview=model.previewStats();assert.equal(preview.stats.damage,'8d+1(3) pi-');assert.equal(preview.stats.range,'1560/6240');assert.equal(preview.stats.shots,'60(3)');
  assert.equal(JSON.stringify(f.flags),before);
  const result=await model.commit({id:f.weapon().id});await f.service.saveState(result.state);
  assert.equal(f.weapon().gaussSpeed,'boosted');assert.equal(readWeaponBattery(f.weapon()).charge,240);assert.equal(f.weapon().totalAmmo,5);
});

test('Gauss campaign TL respects each physical recipe and Sniper optional family TL without changing the weapon',async()=>{
  const f=await gaussFixture('WkhAN9tcmB9eEkmY6');await f.actor.setFlag('olegurps-qol','campaignTL',9);
  const types=f.candidates();assert.equal(types.some(t=>!t.unavailable),false);
  await f.actor.setFlag('olegurps-qol','campaignTL',10);assert.ok(f.candidates().some(t=>!t.recipe&&!t.unavailable));
  assert.equal(catalogs.getEquipmentForMode('WkhAN9tcmB9eEkmY6').tech_level,'9');
  assert.equal(f.candidates().some(t=>t.recipe?.variantId==='ut_aphd'&&!t.unavailable),false);
});

test('new Tangler40/64 use their exact ST, DR and layers; legacy100 prose remains unchanged',()=>{
  const a=utBriefInstructions('ut_tangler',{caliberMm:40}),b=utBriefInstructions('ut_tangler',{caliberMm:64}),old=utBriefInstructions('ut_tangler',{caliberMm:100});
  assert.match(a.join(' '),/ST24, DR8; \+2 ST/);assert.match(b.join(' '),/ST36, DR12; \+2 ST/);assert.match(b.join(' '),/радиус 1 ярд/);
  assert.match(old.join(' '),/ST60, DR20; \+3 ST/);
});

test('damaged EM speed or incomplete 2B set never authorizes a zero-cost shot',async()=>{
  const f=await gaussFixture('WmiUP8hzgsvbFNy4_');await f.battery();await f.load();
  const state=f.state(),w=state.weapons[0];w.gaussSpeed='invalid';assert.match(weaponPowerReason(w),/энергии/);
  assert.throws(()=>gaussBallistics(f.attack().data,'WmiUP8hzgsvbFNy4_','__proto__'),/профиль/);
  await f.actor.setFlag('world','gurpsAmmoManager',state);await assert.rejects(f.shoot(),/профиля/);
  w.gaussSpeed='standard';w.gaussBattery.cells=1;assert.equal(readWeaponBattery(w),null);
});

test('UT82 nail velocity ranges follow B9 downward rounding without changing LP',()=>{
  const raw=standaloneModeStats(catalogs.getMode('WWkrDTQ7VS2Qucb0-'));
  assert.equal(gaussBallistics(raw,'WWkrDTQ7VS2Qucb0-','boosted').range,'6/32');
  assert.equal(gaussBallistics(raw,'WWkrDTQ7VS2Qucb0-','low-velocity').range,'2/12');
});

test('Gauss source projection leaves imported objects unchanged and refuses unknown source hashes',()=>{
  const source=structuredClone(catalogs.getSourceCatalog('weapons')),before=structuredClone(source);
  const result=projectGaussCatalog('weapons',source);assert.deepEqual(source,before);assert.notEqual(result,source);
  source.sources.find(s=>s.code==='UT').sha256='unknown';assert.equal(projectGaussCatalog('weapons',source),source);
});

test('Mortar APDS stays source-undetermined rather than inheriting the coilgun policy',()=>{
  const c=compatibility.checkCompatibility('W__0RKAth-4yvVBSl','apds',{book:'ut',kind:'warhead',availabilityTL:10});
  assert.equal(c.status,'undetermined');assert.equal(c.reasons[0].code,'UT_EM_TECHNOLOGY_UNKNOWN');
});

test('Gauss controls, 2B replacement and missing-energy reason stay Russian with ru and en clients',async()=>{
  const f=await gaussFixture('WmiUP8hzgsvbFNy4_'),before=JSON.stringify(f.flags),original=game.i18n.lang;
  const views=[];
  try{for(const lang of ['ru','en']){
    game.i18n.lang=lang;let dialog;
    await confirmBatteryReplacement({actor:f.actor,weaponId:f.weapon().id,ammoService:f.service,DialogV2:{wait:async d=>{dialog=d;return false;}}});
    const controls=gaussSpeedHTML(f.weapon(),String),reason=weaponPowerReason(f.weapon());
    assert.match(controls,/Стандартная скорость/);assert.match(controls,/Повышенная скорость/);assert.match(controls,/Пониженная скорость/);
    assert.match(dialog.window.title,/Заменить весь комплект/);assert.match(reason,/Установите штатную батарею EM/);
    views.push({controls,reason,title:dialog.window.title});
  }}finally{game.i18n.lang=original;}
  assert.deepEqual(views[0],views[1]);assert.equal(JSON.stringify(f.flags),before);
});
