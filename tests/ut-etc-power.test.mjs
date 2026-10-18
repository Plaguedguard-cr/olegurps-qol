import {beforeUT16SourceRows} from './helpers/ut16-source-statuses.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {ETC_PROFILES,etcAdmission,etcBallistics,executionConfigurationHTML} from '../scripts/tools/ut-etc.js';
import {weaponPowerProfile,readWeaponBattery,weaponBatteryHTML,batteryExpectation,validateWeaponShotPower} from '../scripts/tools/weapon-power.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {WeaponConfigurationDraft,weaponConfigurationHTML,bindWeaponConfiguration} from '../scripts/tools/weapon-configuration.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {AttackProfileResolver} from '../scripts/tools/attack-profile-resolver.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {utPayloadChatHTML} from '../scripts/tools/ut-special-ammunition.js';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {createHash} from 'node:crypto';

const rifle='WFc8O-LgWxenUseNy',pistol='W9chB7ydzOWTAxQP0',heavy='WgqAB3QGTUZrgtdES';
const configure=async(fx,variant='etc',modeId=fx.carrier.standaloneModeId)=>{
  const state=fx.state();state.weapons[0].executionRequest={variant,modeId};await fx.service.saveState(state);return fx.weapon();
};
const ready=async(id=rifle)=>{const fx=await fixture(id);await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));return fx;};
const setCharge=async(fx,charge)=>{const state=fx.state();state.weapons[0].etcBattery.charge=charge;await fx.actor.setFlag('world','gurpsAmmoManager',state);};
const replace=(fx,nonRechargeable=false,extra={})=>fx.service.replaceBattery(fx.carrier.id,{
  nonRechargeable,expectedBattery:batteryExpectation(fx.weapon()),requestId:crypto.randomUUID(),...extra});
const contract=await loadUTSourceContract(),matrix=buildUTMatrix(catalogs,contract);
// Independent UT137-138 expectations: cell, nominal N, printed weapon price.
const published=[
 ['WngbnzWRwLntvaRbR','A',18,240],['WlqvLkGz-INk0A-_o','A',30,450],
 [pistol,'A',20,540],['WIAo1otMCstnbi4Dv','A',9,870],
 ['W5_0Tkbdr1S4b4Hlv','B',30,750],['WoLIvHFqsiusWgmXF','B',100,1000],
 [rifle,'B',50,1600],['W30vD5BH3t_VdkWUZ','B',50,1800],
 ['W3Ggl5bTeg_44b_rU','B',12,2700],['WeFF7cHxefAAGmowq','B',10,800],
 ['WlstnlxI_Mm-2UJf0','B',10,8000],['WdUnAFzFvv59Smhhk','B',8,8000],
 ['W5_HQQYf_zjoG9A7J','C',200,3000],[heavy,'C',34,17000],
 ['WYYJ_58OEKOTk38wi','B',200,2400],['W6-C_sQqk0Ak_c-8_','C',400,14000],['W6bX3WBkGZdZfoeMu','C',50,34000]
];
for(const [modeId,cell,n,price]of published)test('UT137-139 individual ETC class, nominal feed, price and frozen configuration: '+modeId,async()=>{
  const fx=await fixture(modeId);await load(fx,fx.candidates().find(t=>!t.recipe));const ordinary=fx.profile();
  await configure(fx);const p=fx.profile(),b=readWeaponBattery(fx.weapon());
  assert.equal(etcAdmission(modeId,catalogs,9).allowed,true);assert.equal(b.type,cell);assert.equal(b.capacity,n*10);
  assert.equal(p.weaponConfiguration.weaponPrice,price*2);assert.equal(p.weaponConfiguration.basePrice,price);
  assert.equal(p.weaponConfiguration.nominalCapacity,n);assert.equal(p.weaponConfiguration.variant,'etc');
  assert.equal(p.damage.nativeSafe,true,p.damage.reason);assert.equal(p.raw.damage,fx.attack().data.damage);
  for(const key of ['acc','scopeBonus','rof','rcl','shots','bulk','st'])assert.equal(p.effective[key],ordinary.effective[key],key);
  assert.equal(fx.candidates().some(t=>t.recipe?.variantId==='ut_etc'),false);
  const result=await shoot(fx);assert.equal(result.snapshot.profile.resource.power.spent,1);
  assert.equal(result.snapshot.profile.weaponConfiguration.variant,'etc');assert.equal(fx.weapon().etcBattery.charge,n*10-1);
  assert.deepEqual(fx.actor.system,fx.before);
});

for(const [id,reason]of [
 ['W8mzf5YoC9fFjAhO2',/пластиковой/],['WwK7xKN4sLQXIuQ64',/пластиковой/],
 ['Wap9nUEQPwuDkUEUp',/пластиковой/],['WkudgdqO3lymAYks5',/схема питания/],
 ['WtM51JNSpOUIy3Eo1',/двух стволов/],['WRvS5pz3LMCzqQyiZ',/двух стволов/],
 ['WmyROTLk0gs7lrYCE',/100.*30.*60/],['WOMuCBSS_c_nIstvm',/автозаряжания и профиль ETC-питания не подтверждены/],
 ['Wg_f0E5hqv6o1C0Uj',/не подтверждён/],['WRsVDXjeX3ABpRPVp',/не подтверждён/]
])test('each formerly ambiguous ETC construction follows the current approved decision: '+id,async()=>{
  const fx=await fixture(id),before=JSON.stringify(fx.state());
  if(etcAdmission(id,catalogs,12).allowed){await configure(fx);assert.equal(fx.profile().weaponConfiguration.variant,'etc');}
  else{await assert.rejects(configure(fx),reason);assert.equal(JSON.stringify(fx.state()),before);assert.equal(etcAdmission(id,catalogs,12).allowed,false);}
});

test('all 27 formerly blocked rows (25 modes + two alternative feeds) have individual evidenced outcomes',()=>{
  const rows=matrix.rows.filter(r=>r.candidateId==='etc'&&r.status==='conditional');
  assert.equal(rows.length,27);assert.equal(new Set(rows.map(r=>r.modeId)).size,25);
  assert.equal(rows.filter(r=>r.implementation==='available').length,26);assert.equal(rows.filter(r=>r.implementation==='blocked').length,1);
  assert.deepEqual(Object.keys(ETC_PROFILES).sort(),[...published.map(p=>p[0]),'W8mzf5YoC9fFjAhO2','WwK7xKN4sLQXIuQ64','Wap9nUEQPwuDkUEUp','WtM51JNSpOUIy3Eo1','WRvS5pz3LMCzqQyiZ','WmyROTLk0gs7lrYCE','WOMuCBSS_c_nIstvm'].sort());
  assert.equal(matrix.summary.available,821);assert.equal(matrix.summary.blocked,5);
  const digest=createHash('sha256').update(JSON.stringify(beforeUT16SourceRows(matrix.rows).map(r=>[r.configurationId,r.candidateId,r.status]))).digest('hex');
  assert.equal(digest,contract.sourceStatusDigestBeforeMotorSEFOP);
  for(const r of rows){assert.equal(r.application,'weapon-configuration-not-ammunition');
    if(r.implementation==='available'){assert.equal(r.recipeVariant,null);if(r.modeId==='WOMuCBSS_c_nIstvm'){assert.equal(r.weaponConfiguration.capacity,null);assert.equal(r.weaponConfiguration.cellSize,null);}else assert.equal(r.weaponConfiguration.capacity,r.weaponConfiguration.nominalCapacity*10);}
    else assert.ok(r.blocker.length>40,r.configurationId);
  }
});

test('ETC configuration survives reload; stale ordinary settings cannot disable ETC or restore energy',async()=>{
  const fx=await fixture(rifle),stale=fx.state(),defs=fx.actor.getFlag('olegurps-qol','standaloneWeapons');
  await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));await shoot(fx,3);
  await new AmmoService(fx.actor).loadState();await fx.service.saveState(stale);
  assert.equal(fx.weapon().executionVariant,'etc');assert.equal(fx.weapon().etcBattery.charge,497);
  assert.deepEqual(fx.actor.getFlag('olegurps-qol','standaloneWeapons'),defs);
  assert.equal(fx.weapon().totalAmmo,5);
});

test('ordinary remains ordinary; explicit switching restores stats, preserves battery and cannot recharge by toggling',async()=>{
  const fx=await fixture(rifle);await load(fx,fx.candidates().find(t=>!t.recipe));const original=fx.profile();
  assert.equal(weaponPowerProfile(fx.weapon()),null);assert.equal(original.weaponConfiguration,undefined);
  await configure(fx);await shoot(fx,2);const battery=structuredClone(fx.weapon().etcBattery),inventory=fx.weapon().ammunitionInventory;
  await configure(fx,'ordinary');assert.equal(weaponPowerProfile(fx.weapon()),null);assert.equal(weaponBatteryHTML(fx.weapon(),false,escapePayload),'');
  assert.deepEqual(fx.profile().effective,original.effective);await configure(fx);
  assert.deepEqual(fx.weapon().etcBattery,battery);assert.deepEqual(fx.weapon().ammunitionInventory,inventory);
});

test('existing ETC without valid cell is never initialized by reload, settings save or off/on; replacement alone repairs it',async()=>{
  const fx=await ready(),state=fx.state();delete state.weapons[0].etcBattery;await fx.actor.setFlag('world','gurpsAmmoManager',state);
  await fx.service.loadState();await fx.service.saveState(fx.state());await configure(fx,'ordinary');await configure(fx);
  assert.equal(fx.weapon().etcBattery,undefined);await assert.rejects(shoot(fx),/сохранённое состояние/);
  await replace(fx);assert.equal(fx.weapon().etcBattery.charge,500);
});

test('ETC numeric examples reuse the existing fractional dice bands and range rounding exactly once',async()=>{
  for(const [id,damage,range]of [[rifle,'9d pi','1050/6000'],[pistol,'4d+2 pi+','270/3000'],
    ['WIAo1otMCstnbi4Dv','6d+2 pi++','353/3900'],['WlstnlxI_Mm-2UJf0','6dx4 pi+','3000/13500']]){
    const fx=await ready(id),p=fx.profile();assert.equal(p.effective.damage,damage);assert.equal(p.effective.range,range);
    const preview=withRuntimeAmmoStats(fx.attack(),fx.actor),again=withRuntimeAmmoStats(preview,fx.actor);
    assert.equal(preview.data.damage,damage);assert.equal(again.data.damage,damage);assert.equal(again.data.range,range);
  }
  assert.equal(etcBallistics({damage:'3d(2) pi+',range:'180/2000'},pistol).damage,'4d+2(2) pi+');
});

test('APHC / APDS / APEP use converted weapon first and never change physical cartridge prices',async()=>{
  for(const [variantId,damage,range]of [['ut_aphc','9d(2) pi-','1050/6000'],['ut_apds','11d+2(2) pi-','1575/9000'],['ut_apep','9d(3) pi-','2100/12000']]){
    const fx=await fixture(rifle),base=fx.candidates().find(t=>!t.recipe),p=automatic.prepare({modeId:rifle,base,variantId});
    await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);const before=fx.profile();await configure(fx);const result=fx.profile();
    assert.equal(result.damage.formula,damage);assert.equal(result.effective.range,range);
    assert.equal(result.damage.rules.costPerShot,before.damage.rules.costPerShot);
    assert.deepEqual(result.ammunition,before.ammunition);
  }
});

test('every available ammunition profile on every admitted ETC mode resolves without scaling independent payloads',async()=>{
  let checked=0;
  for(const [id]of published){
    const fx=await fixture(id),base=fx.candidates().find(t=>!t.recipe);await configure(fx);
    for(const row of matrix.rows.filter(r=>r.configurationId===id&&r.implementation==='available'&&r.candidateId!=='etc')){
      const p=row.recipeVariant?automatic.prepare({modeId:id,base,variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL,...row.recipeParameters}}):null;
      if(p)assert.equal(p.state,'complete',id+':'+row.candidateId);
      const type=p?.type??base;
      const {resolver,compatibility}=await import('./helpers/ut-ammunition-fixture.mjs');
      const args={actorId:fx.actor.id,weaponId:fx.carrier.id,attack:fx.attack(),rawAttack:fx.attack().data,
        binding:{status:'confirmed',binding:{confirmed:true,modeId:id}},ammunition:{kind:'physical-magazine',type,ammoKey:type.key,available:1,total:1},profilePolicy:'permissive'};
      const effect=resolver.resolve({...args,state:fx.state()});assert.equal(effect.damage.nativeSafe,true,id+':'+row.candidateId+':'+effect.damage.reason);
      const ordinary=resolver.resolve({...args,state:{weapons:[]}});
      for(const component of ordinary.damage.components.filter(c=>['linked','follow-up','fragmentation'].includes(c.role)))
        assert.equal(effect.damage.components.find(c=>c.role===component.role)?.formula,component.formula,id+':'+row.candidateId+':'+component.role);
      if(['shaped_charge','hemp','sefop','thermobaric','plasma','emp','force','flare'].includes(row.candidateId))
        assert.equal(effect.damage.formula,ordinary.damage.formula,id+':'+row.candidateId);
      checked++;
    }
  }
  assert.ok(checked>300,checked);
});

test('single and burst use one atomic Actor resource write, frozen receipt and no duplicate execution',async()=>{
  const fx=await ready(),before=fx.writes.length,r=await shoot(fx,3),snapshot=JSON.stringify(r.snapshot);
  assert.equal(fx.writes.length,before+1);assert.equal(fx.weapon().totalAmmo,5);assert.equal(fx.weapon().etcBattery.charge,497);
  assert.equal(r.receipt.power.spent,3);assert.equal(r.profile.resource.power.physicalShots,3);assert.equal(r.snapshot.spent,3);
  await shoot(fx,3,{attackId:r.snapshot.attackId});assert.equal(fx.writes.length,before+1);
  const fresh=new AmmoService(fx.actor);assert.equal((await fresh.executeShot({weaponId:fx.carrier.id,attackId:r.snapshot.attackId,
    prepare:()=>assert.fail('duplicate prepare'),execute:()=>assert.fail('duplicate roll')})).duplicate,true);
  assert.equal(r.snapshot.profile.damage.formula,'9d pi');
  assert.equal(JSON.stringify(r.snapshot),snapshot);assert.equal(fx.weapon().etcBattery.charge,497);
});

for(const charge of [0,1])test('insufficient ETC energy blocks before native roll and preserves both resources: '+charge,async()=>{
  const fx=await ready();await setCharge(fx,charge);const before=JSON.stringify(fx.state());let called=false;
  await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),prepare:()=>({profile:fx.profile(),amount:2}),
    execute:()=>{called=true;return {rolled:true};}}),/Батарея|Недостаточно/);
  assert.equal(called,false);assert.equal(JSON.stringify(fx.state()),before);
});
test('insufficient physical ammunition, cancellation and GGA exception preserve ammo and energy',async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state());await assert.rejects(shoot(fx,9),/InsufficientRounds/);
  await shoot(fx,1,{cancel:true});await assert.rejects(fx.service.executeShot({weaponId:fx.carrier.id,attackId:crypto.randomUUID(),
    prepare:()=>({profile:fx.profile(),amount:1}),execute:()=>{throw Error('GGA exception');}}),/GGA exception/);
  assert.equal(JSON.stringify(fx.state()),before);
});

test('concurrent attacks and duplicate confirmations cannot overspend either resource',async()=>{
  const fx=await ready();await setCharge(fx,1);const id=crypto.randomUUID();
  const results=await Promise.allSettled([shoot(fx,1,{attackId:id}),shoot(fx,1,{attackId:id}),shoot(fx)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);assert.equal(fx.weapon().etcBattery.charge,0);assert.equal(fx.weapon().totalAmmo,7);
  assert.equal(Object.keys(fx.state().shotReceipts).length,1);
});

test('replacement shares the resource queue, preserves inventory and doubles NR capacity; stale confirmations cannot recharge',async()=>{
  const fx=await ready(),inventory=fx.weapon().ammunitionInventory;await replace(fx,true);
  assert.equal(fx.weapon().etcBattery.capacity,1000);assert.equal(fx.weapon().etcBattery.charge,1000);assert.deepEqual(fx.weapon().ammunitionInventory,inventory);
  const expectedBattery=batteryExpectation(fx.weapon());const results=await Promise.allSettled([shoot(fx),replace(fx,false,{expectedBattery})]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(fx.weapon().etcBattery.charge,999);
  const options={expectedBattery:batteryExpectation(fx.weapon()),requestId:'same-confirmation',nonRechargeable:false};
  await Promise.all([fx.service.replaceBattery(fx.carrier.id,options),fx.service.replaceBattery(fx.carrier.id,options)]);
  await shoot(fx);await fx.service.replaceBattery(fx.carrier.id,options);assert.equal(fx.weapon().etcBattery.charge,499);
});

test('missing and malformed ETC cell never authorizes firing',async()=>{
  const fx=await ready();for(const b of [null,{type:'C',capacity:500,charge:500},{type:'B',capacity:501,charge:501},
    {type:'B',capacity:500,charge:501},{type:'B',capacity:1000,charge:1000,nonRechargeable:'true'}]){
    const s=fx.state();if(b)s.weapons[0].etcBattery=b;else delete s.weapons[0].etcBattery;await fx.actor.setFlag('world','gurpsAmmoManager',s);
    const before=JSON.stringify(fx.state());await assert.rejects(shoot(fx),/сохранённое состояние/);assert.equal(JSON.stringify(fx.state()),before);
  }
});

test('PLAYER OWNER configures, fires and replaces without GM/world settings; foreign Actor remains protected',async()=>{
  const fx=await fixture(rifle);game.user.isGM=false;const oldSet=game.settings.set;game.settings.set=()=>assert.fail('GM-only world setting');
  try{await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));await shoot(fx);await replace(fx,true);
    fx.actor.isOwner=false;const before=JSON.stringify(fx.state());await assert.rejects(configure(fx,'ordinary'),/Permission/);
    await assert.rejects(shoot(fx),/Permission/);await assert.rejects(replace(fx),/Permission/);assert.equal(JSON.stringify(fx.state()),before);
  }finally{game.user.isGM=true;game.settings.set=oldSet;}
});

test('campaign TL filters new ETC; unknown unrelated ammunition TL never substitutes weapon TL or authorizes unsupported ETC',async()=>{
  const fx=await fixture(rifle);await fx.actor.setFlag('olegurps-qol','campaignTL',8);await assert.rejects(configure(fx),/ТУ 9/);
  assert.doesNotMatch(executionConfigurationHTML(rifle,'ordinary',catalogs,8,escapePayload),/value="etc"/);
  for(const tl of [9,10,12,null])assert.equal(etcAdmission(rifle,catalogs,tl).allowed,true);
  await fx.actor.setFlag('olegurps-qol','campaignTL',9);await configure(fx);await load(fx,fx.candidates().find(t=>!t.recipe));
  await fx.actor.setFlag('olegurps-qol','campaignTL',0);await shoot(fx);assert.equal(fx.weapon().etcBattery.charge,499);
  const unknown={getEquipmentForMode:id=>catalogs.getEquipmentForMode(id),getMode:id=>{const m=structuredClone(catalogs.getMode(id));delete m.ammunition_profile.native_weapon_tl;return m;}};
  assert.equal(etcAdmission(rifle,unknown,9).allowed,true);assert.equal(etcAdmission(rifle,unknown,8).allowed,false); // ETC itself is known TL9.
  assert.equal(etcAdmission('not-in-catalog',catalogs,null).allowed,false);
  for(const id of ['constructor','__proto__','toString']){
    assert.equal(etcAdmission(id,catalogs,null).allowed,false);
    assert.equal(weaponPowerProfile({executionVariant:'etc',catalogModeId:id}),null);
    assert.throws(()=>etcBallistics({damage:'6d pi',range:'700/4000'},id));
  }
});

test('new configuration UI uses the existing draft and Russian labels under ru/en; cancel does not persist',async()=>{
  const fx=await fixture(rifle);
  for(const lang of ['ru','en']){game.i18n.lang=lang;
    const before=JSON.stringify(fx.state());
    const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],existing:fx.weapon(),catalogs});
    const html=weaponConfigurationHTML(draft);assert.match(html,/name="weaponExecution"/);assert.match(html,/Обычное исполнение/);assert.match(html,/\$1600/);
    draft.executionVariant='etc';draft.executionChanged=true;assert.match(weaponConfigurationHTML(draft),/\$3200/);
    assert.equal(JSON.stringify(fx.state()),before);const result=await draft.commit({id:'unused'});await fx.service.saveState(result.state);
    assert.equal(fx.weapon().executionVariant,'etc');assert.equal(game.i18n.lang,lang);await configure(fx,'ordinary');
  }game.i18n.lang='ru';
});

test('the existing configuration form stages an ETC change through its root change listener before Save',async()=>{
  const fx=await fixture(rifle),before=JSON.stringify(fx.state());
  const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],existing:fx.weapon(),catalogs});
  const events={},fields={innerHTML:'',addEventListener:(name,fn)=>{events['fields:'+name]=fn;}},execution={innerHTML:''};
  const root={addEventListener:(name,fn)=>{events['root:'+name]=fn;},querySelectorAll:()=>[],querySelector:selector=>
    selector==='[data-standalone-configuration]'?null:selector==='[data-weapon-mode-fields]'?fields:
    selector==='[data-weapon-execution]'?execution:{addEventListener(){}}};
  bindWeaponConfiguration(root,draft,()=>assert.fail('no parameter editor'));
  assert.match(execution.innerHTML,/\$1600/);events['root:change']({target:{name:'weaponExecution',value:'etc'}});
  assert.equal(draft.executionChanged,true);assert.equal(draft.executionVariant,'etc');assert.match(execution.innerHTML,/\$3200/);
  assert.equal(JSON.stringify(fx.state()),before);const saved=await draft.commit({id:'unused'});await fx.service.saveState(saved.state);
  assert.equal(fx.weapon().executionVariant,'etc');assert.equal(fx.weapon().etcBattery.charge,500);
});

test('battery ten-segment UI is proportional for different capacities and remains above magazine divider',async()=>{
  const fx=await ready(pistol);await replace(fx,true);await setCharge(fx,200);
  const html=weaponBatteryHTML(fx.weapon(),true,escapePayload);assert.match(html,/A cell/);assert.match(html,/200\/400/);
  assert.equal((html.match(/gam-battery-segment /g)??[]).length,10);assert.equal((html.match(/segment filled/g)??[]).length,5);
  const source=await readFile(new URL('../scripts/tools/ammo.js',import.meta.url),'utf8');
  const resource=source.indexOf('${weaponResourceHTML(weapon,batterySelected,escapeHTML)}');
  assert.ok(resource>=0&&resource<source.indexOf('class="${uawGroup(weapon)?'));
});

test('compact closed ETC chat keeps all manual fields and does not expose battery details under ru/en',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),base=fx.candidates().find(t=>!t.recipe);
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId:'ut_biochemical_liquid',parameters:{note:'Full note '.repeat(30),savingThrow:'Custom HT',description:'Full description '.repeat(30),radius:{yards:33,units:'yards',origin:'manual'}}});
  assert.equal(p.state,'complete');await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);await configure(fx);
  for(const lang of ['ru','en']){game.i18n.lang=lang;const html=utPayloadChatHTML(fx.profile(),escapePayload);
    assert.match(html,/ETC — UT139/);assert.match(html,/<details/);assert.doesNotMatch(html,/<details[^>]*\bopen|capacity|module-10x|Батарея|Basic Set/);
    assert.ok(html.includes(p.type.recipe.parameters.note));assert.ok(html.includes(p.type.recipe.parameters.description));assert.match(html,/Custom HT/);assert.match(html,/33/);
  }game.i18n.lang='ru';
});

test('Fire Control and direct execution both recheck live energy and reject stale configuration profiles',async()=>{
  const fx=await ready(),profile=fx.profile();await setCharge(fx,0);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:fx.attack(),fireState:{shots:1},_getRapidFireState:()=>({})});
  assert.match(app._proximityReason(),/разряжена/);assert.throws(()=>validateWeaponShotPower(fx.actor,profile,1,fx.attack()),/разряжена/);
  await configure(fx,'ordinary');assert.throws(()=>validateWeaponShotPower(fx.actor,profile,1,fx.attack()),/изменилось/);
});

test('deferred Spraying Fire commits the whole physical burst and ETC energy exactly once',async()=>{
  const fx=await ready(),state=fx.state();state.sprayingFireSessions={test:{ammoConsumed:false}};await fx.actor.setFlag('world','gurpsAmmoManager',state);
  const result=await fx.service.executeShot({weaponId:fx.carrier.id,attackId:'etc-burst',deferConsumption:true,sessionKey:'test',
    prepare:()=>({amount:3,profile:fx.profile({physicalShots:1})}),execute:async()=>({rolled:true,message:{id:'etc-spray'}})});
  assert.equal(result.spent,0);assert.equal(result.profile.resource.power.spent,0);assert.equal(fx.weapon().etcBattery.charge,500);
  const current=fx.state(),writes=fx.writes.length;
  assert.equal(await fx.service.consumeLoadedRounds(current,current.weapons[0],3,{sessionKey:'test',expectedResource:result.profile.resource}),3);
  assert.equal(fx.writes.length,writes+1);assert.equal(fx.weapon().etcBattery.charge,497);assert.equal(fx.weapon().totalAmmo,5);
  assert.equal(fx.state().sprayingFireSessions.test.powerReceipt.spent,3);
  await assert.rejects(fx.transaction('consume',{amount:3,magazineId:fx.weapon().ammunitionInventory.installedId,sessionKey:'test'}),/InsufficientRounds/);
  assert.equal(fx.weapon().etcBattery.charge,497);
});

for(const intervention of ['depleted','ordinary'])test('deferred ETC completion cannot bypass changed energy or weapon configuration: '+intervention,async()=>{
  const fx=await ready(),state=fx.state();state.sprayingFireSessions={test:{ammoConsumed:false,ammunitionProfile:fx.profile()}};
  await fx.actor.setFlag('world','gurpsAmmoManager',state);
  if(intervention==='ordinary')await configure(fx,'ordinary');else await setCharge(fx,0);
  const before=JSON.stringify(fx.state());await assert.rejects(fx.transaction('consume',{amount:3,magazineId:fx.weapon().ammunitionInventory.installedId,sessionKey:'test'}),/разряжена|изменилось/);
  assert.equal(JSON.stringify(fx.state()),before);
});

test('magazine changes, top-up and alternate LSW feeds never reset the fixed nominal battery equivalent',async()=>{
  const fx=await ready('W5_HQQYf_zjoG9A7J');assert.equal(fx.weapon().etcBattery.capacity,2000);await shoot(fx,3);
  await fx.transaction('add-magazines',{amount:1,capacity:50});const other=fx.weapon().ammunitionInventory.magazines.at(-1);
  await fx.transaction('install',{magazineId:other.id});assert.equal(fx.weapon().etcBattery.charge,1997);
  await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.magazines[0].id,amount:5});
  const base=fx.candidates().find(t=>!t.recipe);await fx.transaction('load',{magazineId:other.id,ammoKey:base.key,amount:5});
  await shoot(fx,2);assert.equal(fx.weapon().etcBattery.charge,1995);assert.equal(fx.weapon().etcBattery.capacity,2000);
  await fx.transaction('add-magazines',{amount:8,capacity:50});assert.equal(fx.weapon().ammunitionInventory.magazines.length,10);
  assert.equal(fx.weapon().etcBattery.charge,1995);
});

test('separate weapon instances and their magazines never share an ETC cell',async()=>{
  const fx=await ready(),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(catalogs.getEquipmentForMode(rifle).equipment_id);
  const other=await new StandaloneWeaponService(fx.actor,catalogs).save(draft);await fx.service.loadState();const state=fx.state();
  state.weapons.find(w=>w.standaloneWeaponId===other.id).executionRequest={variant:'etc',modeId:rifle};await fx.service.saveState(state);
  const saved=structuredClone(fx.state().weapons.find(w=>w.standaloneWeaponId===other.id));await shoot(fx,2);await replace(fx,true);
  assert.deepEqual(fx.state().weapons.find(w=>w.standaloneWeaponId===other.id),saved);
  assert.equal(saved.etcBattery.charge,500);assert.equal(fx.weapon().etcBattery.charge,1000);
});

test('ordinary historical snapshots remain identical after conversion, battery replacement and mode changes',async()=>{
  const fx=await fixture(rifle);await load(fx,fx.candidates().find(t=>!t.recipe));const old=await shoot(fx),saved=JSON.stringify(old.snapshot),message=JSON.stringify(old.message.flags);
  await configure(fx);await shoot(fx);await replace(fx,true);await configure(fx,'ordinary');await fx.service.loadState();
  assert.equal(JSON.stringify(old.snapshot),saved);assert.equal(JSON.stringify(old.message.flags),message);assert.equal(old.snapshot.profile.damage.formula,'6d pi');
});

test('an ETC cell cannot replace a missing physical magazine',async()=>{
  const fx=await ready();await fx.transaction('eject',{magazineId:fx.weapon().ammunitionInventory.installedId});const before=JSON.stringify(fx.state());
  await assert.rejects(shoot(fx),/MagazineNotInstalled/);assert.equal(JSON.stringify(fx.state()),before);
});

test('live services reject depleted ETC before a native callback even when passed an older valid preview',async()=>{
  const fx=await ready(),profile=fx.profile();await setCharge(fx,0);let called=false;
  const {FireService}=await import('../scripts/tools/fire-service.js');
  const {executePreparedGgaRoll}=await import('../scripts/tools/prepared-gga-roll.js');
  const fire=new FireService({actor:fx.actor,preparedRollExecutor:()=>{called=true;}});
  await assert.rejects(fire.executeRangedAttack(fx.attack(),{attackProfile:profile,physicalShots:1}),/разряжена/);
  await assert.rejects(executePreparedGgaRoll({actor:fx.actor,attack:fx.attack(),attackProfile:profile,physicalShots:1}),/разряжена/);
  assert.equal(called,false);
});

test('a queued replacement before a shot supplies power; missing state cannot be revived by a stale configuration',async()=>{
  const fx=await ready(),stale=fx.state();await setCharge(fx,0);const result=await Promise.all([replace(fx,true),shoot(fx)]);
  assert.equal(result[1].spent,1);assert.equal(fx.weapon().etcBattery.charge,999);
  const state=fx.state();delete state.weapons[0].etcBattery;await fx.actor.setFlag('world','gurpsAmmoManager',state);
  await fx.service.saveState(stale);assert.equal(fx.weapon().etcBattery,undefined);
});

test('a bound GGA attack uses the same ETC configuration without changing Actor.system or the source model',async()=>{
  const fx=await fixture(rifle);await load(fx,fx.candidates().find(t=>!t.recipe));const data=structuredClone(fx.attack().data);
  fx.actor.system.ranged={gun:data};const original=structuredClone(fx.actor.system),state=fx.state(),weapon=state.weapons[0];
  delete weapon.standaloneWeaponId;delete weapon.standaloneModeId;weapon.attackRef={path:'system.ranged.gun'};
  weapon.executionRequest={variant:'etc',modeId:rifle};await fx.service.saveState(state);
  const attack={...data,path:'system.ranged.gun',data},binding={status:'confirmed',binding:{confirmed:true,modeId:rifle}};
  const p=new AttackProfileResolver({catalogs,compatibility:OleGURPSQOL.ammunitionCompatibility}).resolve({
    actorId:fx.actor.id,weaponId:weapon.id,attack,rawAttack:data,state:fx.state(),binding,
    ammunition:fx.service.readAttackAmmunition(weapon.id)});
  assert.equal(p.damage.formula,'9d pi');assert.equal(p.effective.range,'1050/6000');
  assert.deepEqual(fx.actor.system,original);assert.equal(weaponPowerProfile(fx.weapon()).cellSize,'B');
  const stale=fx.state();delete stale.weapons[0].catalogModeId;await fx.service.saveState(stale);
  assert.equal(fx.weapon().catalogModeId,rifle);
});
