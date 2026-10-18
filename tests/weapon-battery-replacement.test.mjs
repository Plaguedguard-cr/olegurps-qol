import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,load,shoot,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {AmmoService} from '../scripts/tools/ammo-service.js';
import {weaponPowerProfile,newWeaponBattery,readWeaponBattery,batteryExpectation} from '../scripts/tools/weapon-power.js';
import {PAINT_CARBINE_MODE as modeId,paintBatteryHTML,paintPowerReason} from '../scripts/tools/ut-paint-power.js';
import {confirmBatteryReplacement} from '../scripts/tools/battery-replacement-dialog.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {WeaponAssistantApp} from '../scripts/tools/weapon-assistant-app.js';
import {openAmmoManager} from '../scripts/tools/ammo.js';
import {StandaloneWeaponDraft,StandaloneWeaponService} from '../scripts/tools/standalone-weapon-service.js';
import {catalogs} from './helpers/ut-ammunition-fixture.mjs';

const ready=async()=>{const fx=await fixture(modeId);await load(fx,fx.candidates().find(t=>!t.recipe));return fx;};
const replace=(fx,nonRechargeable=false,extra={})=>fx.service.replaceBattery(fx.carrier.id,{
  nonRechargeable,requestId:crypto.randomUUID(),expectedBattery:batteryExpectation(fx.weapon()),...extra});
const setBattery=async(fx,battery)=>{const s=fx.state();if(battery===null)delete s.weapons[0].paintBattery;else s.weapons[0].paintBattery=battery;await fx.actor.setFlag('world','gurpsAmmoManager',s);};
const dialog=(checked,action='yes',inspect=()=>{})=>({wait:async options=>{
  inspect(options);const result=options.buttons.find(b=>b.action===action).callback(null,{form:{elements:{nonRechargeable:{checked}}}});
  return result ?? action; // Foundry's nullish callback fallback is an action string.
}});
const openDialog=(fx,DialogV2)=>confirmBatteryReplacement({actor:fx.actor,weaponId:fx.carrier.id,ammoService:fx.service,DialogV2});

test('only reviewed automatic profiles authorize replacement; B cell never implies a universal capacity',()=>{
  const p=weaponPowerProfile({standaloneModeId:modeId});assert.equal(p.cellSize,'B');assert.equal(p.capacity,500);
  assert.equal(weaponPowerProfile({standaloneModeId:'unknown',paintBattery:{type:'B',capacity:500,charge:500}}),null);
  const future={...p,capacity:73};assert.equal(newWeaponBattery(future,true).capacity,146);
  for(const invalid of [null,{...p,capacity:0},{...p,capacity:-5},{...p,chargePerPhysicalShot:0},{...p,cellSize:'invented'}])assert.throws(()=>newWeaponBattery(invalid),/Некорректные/);
});
for(const [old,nonRechargeable,capacity] of [
  [{type:'B',capacity:500,charge:500},true,1000],
  [{type:'B',capacity:500,charge:150},false,500],
  [{type:'B',nonRechargeable:true,capacity:1000,charge:720},false,500],
  [{type:'B',nonRechargeable:true,capacity:1000,charge:0},true,1000]
])test('explicit replacement resets only the selected battery: '+old.charge+'/'+old.capacity+' -> '+capacity,async()=>{
  const fx=await ready();await setBattery(fx,old);const before=fx.state(),writes=fx.writes.length;
  const state=await replace(fx,nonRechargeable),b=readWeaponBattery(state.weapons[0]);
  assert.equal(b.type,'B');assert.equal(b.nonRechargeable,nonRechargeable);assert.equal(b.capacity,capacity);assert.equal(b.charge,capacity);assert.ok(b.replacementId);
  const expected=structuredClone(before);expected.weapons[0].paintBattery=structuredClone(b);assert.deepEqual(state,expected);assert.deepEqual(fx.state(),expected);assert.equal(fx.writes.length,writes+1);
});
test('dialog has exactly confirmation, one unchecked Non-Rechargeable box and Yes/No under ru/en',async()=>{
  const fx=await fixture(modeId);
  for(const lang of ['ru','en']){game.i18n.lang=lang;const before=JSON.stringify(fx.state()),writes=fx.writes.length;
    await openDialog(fx,dialog(false,'no',o=>{
      assert.equal(o.window.title,'Заменить батарею?');assert.deepEqual(o.buttons.map(b=>b.label),['Да','Нет']);
      assert.equal(o.buttons.find(b=>b.default)?.action,'no');
      assert.equal((o.content.match(/<input /g)??[]).length,1);assert.match(o.content,/type="checkbox" name="nonRechargeable"/);assert.doesNotMatch(o.content,/\bchecked\b|select|textarea|gm|стоимост|секунд/i);assert.match(o.content,/Non-Rechargeable/);assert.equal(o.modal,false);
    }));assert.equal(JSON.stringify(fx.state()),before);assert.equal(fx.writes.length,writes);
  }game.i18n.lang='ru';
});
test('confirmed checkbox controls the stored variant and every reopening starts unchecked',async()=>{
  const fx=await fixture(modeId);await openDialog(fx,dialog(true));assert.equal(fx.weapon().paintBattery.capacity,1000);
  await openDialog(fx,dialog(false,'no',o=>assert.doesNotMatch(o.content,/\bchecked\b/)));assert.equal(fx.weapon().paintBattery.capacity,1000);
  await openDialog(fx,dialog(false));assert.equal(fx.weapon().paintBattery.capacity,500);assert.equal(fx.weapon().paintBattery.nonRechargeable,false);
});
test('closing the confirmation without answering has no persistence or resource effects',async()=>{
  const fx=await ready(),before=JSON.stringify(fx.state()),writes=fx.writes.length;
  const answer=await openDialog(fx,{wait:async()=>null});assert.equal(answer,null);assert.equal(JSON.stringify(fx.state()),before);assert.equal(fx.writes.length,writes);
});
test('a DialogV2 action string is not a typed Yes confirmation and cannot replace a battery',async()=>{
  const fx=await ready();await replace(fx,true);const before=JSON.stringify(fx.state()),writes=fx.writes.length;
  for(const result of ['no','yes',false,null,{}, {nonRechargeable:'true'}])await openDialog(fx,{wait:async()=>result});
  assert.equal(JSON.stringify(fx.state()),before);assert.equal(fx.writes.length,writes);
});
test('Non-Rechargeable state survives read/reload/open and stale normal configuration saves',async()=>{
  const fx=await ready(),stale=fx.state();await replace(fx,true);await fx.service.spendPaintCharge(fx.carrier.id,280);
  await new AmmoService(fx.actor).loadState();await fx.service.saveState(stale);await fx.transaction('initialize',{});
  assert.equal(fx.weapon().paintBattery.capacity,1000);assert.equal(fx.weapon().paintBattery.charge,720);assert.equal(fx.weapon().paintBattery.nonRechargeable,true);
  await openDialog(fx,dialog(false,'no'));assert.equal(fx.weapon().paintBattery.charge,720);
});
test('new 1000-charge cell permits two-resource shots and freezes its own variant/capacity',async()=>{
  const fx=await ready();await replace(fx,true);const id=fx.weapon().paintBattery.replacementId,r=await shoot(fx,3),power=r.snapshot.profile.resource.power;
  assert.equal(power.capacity,1000);assert.equal(power.before,1000);assert.equal(power.after,997);assert.equal(power.spent,3);assert.equal(power.nonRechargeable,true);assert.equal(power.replacementId,id);assert.match(power.source,/UT19/);
  assert.equal(fx.weapon().paintBattery.charge,997);assert.equal(fx.weapon().totalAmmo,5);
  await shoot(fx,3,{attackId:r.snapshot.attackId});assert.equal(fx.weapon().paintBattery.charge,997);assert.equal(fx.weapon().totalAmmo,5);
});
test('replacement leaves all receipts, recipes, ammunition and historical snapshots intact',async()=>{
  const fx=await ready(),shot=await shoot(fx),historical=JSON.stringify(shot.snapshot),message=JSON.stringify(shot.message.flags),state=fx.state();
  await replace(fx,true);const actual=fx.state();delete actual.weapons[0].paintBattery;delete state.weapons[0].paintBattery;
  assert.deepEqual(actual,state);assert.equal(JSON.stringify(shot.snapshot),historical);assert.equal(JSON.stringify(shot.message.flags),message);
});
test('zero remains blocked until confirmed replacement, including an already open Fire Control',async()=>{
  const fx=await ready();await replace(fx,true);await fx.service.spendPaintCharge(fx.carrier.id,1000);
  const app=Object.create(FirePreparationApp.prototype);Object.assign(app,{actor:fx.actor,weapon:fx.weapon(),attack:fx.attack(),fireState:{shots:'1'},_getRapidFireState:()=>({})});
  assert.match(app._proximityReason(),/разряжена/);await assert.rejects(shoot(fx),/разряжена/);await openDialog(fx,dialog(false,'no'));assert.match(app._proximityReason(),/разряжена/);
  await openDialog(fx,dialog(false));assert.equal(app._proximityReason(),null);await shoot(fx);assert.equal(fx.weapon().paintBattery.charge,499);assert.equal(fx.weapon().totalAmmo,7);
});
test('old carrier without state exposes its selectable battery area and only explicit confirmation installs it',async()=>{
  const fx=await ready();await setBattery(fx,null);const before=JSON.stringify(fx.state());await fx.service.loadState();
  assert.equal(fx.weapon().paintBattery,undefined);assert.match(paintBatteryHTML(fx.weapon(),false,escapePayload),/data-ammo-action="select-battery"/);assert.match(paintPowerReason(fx.weapon()),/Не задано/);
  await openDialog(fx,dialog(true,'no'));assert.equal(JSON.stringify(fx.state()),before);
  await openDialog(fx,dialog(true));assert.equal(fx.weapon().paintBattery.charge,1000);await shoot(fx);assert.equal(fx.weapon().paintBattery.charge,999);
});
test('PLAYER/OWNER replaces without GM or world setting writes; foreign Actor is unchanged',async()=>{
  const fx=await fixture(modeId),set=game.settings.set;game.user.isGM=false;game.settings.set=()=>assert.fail('no world setting');
  try {await replace(fx,true);assert.equal(fx.weapon().paintBattery.charge,1000);fx.actor.isOwner=false;const before=JSON.stringify(fx.state());
    await assert.rejects(replace(fx),/Permission/);await assert.rejects(openDialog(fx,{wait:()=>assert.fail('foreign dialog')}),/Permission/);assert.equal(JSON.stringify(fx.state()),before);
  }finally{game.user.isGM=true;game.settings.set=set;}
});
test('two weapon instances do not share replacement, variety or energy',async()=>{
  const fx=await fixture(modeId),draft=new StandaloneWeaponDraft({catalogs,type:'ranged'});draft.selectModel(catalogs.getEquipmentForMode(modeId).equipment_id);
  const other=await new StandaloneWeaponService(fx.actor,catalogs).save(draft);await fx.service.loadState();const before=structuredClone(fx.state().weapons.find(w=>w.standaloneWeaponId===other.id));await replace(fx,true);
  assert.deepEqual(fx.state().weapons.find(w=>w.standaloneWeaponId===other.id),before);assert.equal(fx.weapon().paintBattery.charge,1000);
});
test('duplicate Yes requests persist once, including a new service and a later spent charge',async()=>{
  const fx=await ready(),options={requestId:'repeat',expectedBattery:batteryExpectation(fx.weapon()),nonRechargeable:true},writes=fx.writes.length;
  await Promise.all(Array.from({length:5},()=>fx.service.replaceBattery(fx.carrier.id,options)));assert.equal(fx.writes.length,writes+1);
  await shoot(fx);await new AmmoService(fx.actor).replaceBattery(fx.carrier.id,options);assert.equal(fx.weapon().paintBattery.charge,999);
  await assert.rejects(fx.service.replaceBattery(fx.carrier.id,{...options,nonRechargeable:false}),/Некорректные/);
});
test('independent concurrent confirmations from the same old state cannot overwrite each other',async()=>{
  const fx=await ready(),expectedBattery=batteryExpectation(fx.weapon()),writes=fx.writes.length;
  const r=await Promise.allSettled([replace(fx,true,{expectedBattery}),replace(fx,false,{expectedBattery})]);
  assert.equal(r.filter(v=>v.status==='fulfilled').length,1);assert.match(r.find(v=>v.status==='rejected').reason.message,/изменилось/);assert.equal(fx.writes.length,writes+1);assert.equal(fx.weapon().paintBattery.charge,1000);
});
test('replacement queued before a shot commits the new cell, then spends exactly one',async()=>{
  const fx=await ready();await fx.service.spendPaintCharge(fx.carrier.id,500);
  const r=await Promise.all([replace(fx,true),shoot(fx)]);assert.equal(r[1].spent,1);assert.equal(fx.weapon().paintBattery.charge,999);assert.equal(fx.weapon().totalAmmo,7);
});
test('shot queued before stale confirmation preserves the shot and rejects a silent recharge',async()=>{
  const fx=await ready(),expectedBattery=batteryExpectation(fx.weapon());
  const r=await Promise.allSettled([shoot(fx),replace(fx,true,{expectedBattery})]);assert.equal(r[0].status,'fulfilled');assert.equal(r[1].status,'rejected');assert.match(r[1].reason.message,/изменилось/);
  assert.equal(fx.weapon().paintBattery.charge,499);assert.equal(fx.weapon().totalAmmo,7);
});
test('malformed and unreviewed battery/profile data never permits free firing',async()=>{
  const fx=await ready();for(const b of [{type:'B',capacity:1000,charge:1000},{type:'B',capacity:500,charge:500,nonRechargeable:true},{type:'C',capacity:1000,charge:1000,nonRechargeable:true},{type:'B',capacity:1000,charge:1001,nonRechargeable:true},{type:'B',capacity:500,charge:500,nonRechargeable:'false'}]){
    await setBattery(fx,b);assert.equal(readWeaponBattery(fx.weapon()),null);const before=JSON.stringify(fx.state());await assert.rejects(shoot(fx),/Не задано/);assert.equal(JSON.stringify(fx.state()),before);
  }
  await replace(fx,false);assert.equal(fx.weapon().paintBattery.charge,500);
});
test('replacement requires a request identity, an expected old state and an actual boolean',async()=>{
  const fx=await fixture(modeId),before=JSON.stringify(fx.state());
  for(const o of [{},{requestId:'x'},{requestId:'x',expectedBattery:null,nonRechargeable:'true'},{requestId:'',expectedBattery:null}])await assert.rejects(fx.service.replaceBattery(fx.carrier.id,o),/Некорректные/);
  assert.equal(JSON.stringify(fx.state()),before);
});
for(const id of ['WYYJ_58OEKOTk38wi','W6-C_sQqk0Ak_c-8_','WmyROTLk0gs7lrYCE','W6bX3WBkGZdZfoeMu'])test('manual motor has no automatic battery UI or replacement profile: '+id,async()=>{
  const fx=await fixture(id),before=JSON.stringify(fx.state());assert.equal(weaponPowerProfile(fx.weapon()),null);assert.equal(paintBatteryHTML(fx.weapon(),false,escapePayload),'');
  await assert.rejects(fx.service.replaceBattery(fx.carrier.id,{requestId:'motor',expectedBattery:null}),/не подтверждён/);assert.equal(JSON.stringify(fx.state()),before);
});
for(const [value,segments] of [[1000,10],[999,10],[500,5],[1,1],[0,0]])test('Non-Rechargeable indicator uses its actual 1000 capacity: '+value,()=>{
  const w={id:'paint',standaloneModeId:modeId,paintBattery:{type:'B',capacity:1000,charge:value,nonRechargeable:true}},html=paintBatteryHTML(w,true,escapePayload);
  assert.equal((html.match(/segment filled/g)??[]).length,segments);assert.equal((html.match(/gam-battery-segment /g)??[]).length,10);assert.match(html,new RegExp(value+'/1000'));assert.match(html,/Non-Rechargeable/);assert.doesNotMatch(html,/class="gam-mag\b/);
});
test('manager offers one replacement action in the existing slot, leaves magazines normal and prevents duplicate dialogs',async()=>{
  const fx=await ready();let app,release,opened=0;const oldRender=WeaponAssistantApp.prototype.render;
  WeaponAssistantApp.prototype.render=async function(){app=this;this.element={addEventListener(){}};return this;};
  foundry.applications.api.DialogV2={wait:async()=>{opened++;return new Promise(r=>release=r);}};
  globalThis.GURPS={executeOTF(){},ModifierBucket:{modifierStack:{modifierList:[]}}};globalThis.Hooks={on:()=>1,off(){}};
  globalThis.canvas={scene:{id:crypto.randomUUID()},tokens:{controlled:[{id:crypto.randomUUID(),actor:fx.actor}]}};
  try{await openAmmoManager();const html=()=>app.buildContent(app.managerState),buttons=()=>[...html().matchAll(/data-ammo-action="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(buttons().includes('manage-load'));await app.handleAction({action:'select-battery',weaponId:fx.carrier.id,app});
    assert.equal(buttons().filter(a=>a==='replace-battery').length,1);assert.equal(buttons().includes('manage-load'),false);assert.match(html(),/Заменить батарею/);
    const before=JSON.stringify(fx.state()),first=app.handleAction({action:'replace-battery',weaponId:fx.carrier.id,app});
    const duplicate=await app.handleAction({action:'replace-battery',weaponId:fx.carrier.id,app});assert.equal(duplicate.changed,false);assert.equal(opened,1);release(null);assert.equal((await first).changed,false);assert.equal(JSON.stringify(fx.state()),before);
    await app.handleAction({action:'select-magazine',weaponId:fx.carrier.id,magazineIndex:'0',app});assert.ok(buttons().includes('manage-load'));assert.equal(buttons().includes('replace-battery'),false);
    assert.ok(html().indexOf('gam-battery-icon')<html().indexOf('class="gam-magazines"'));
    let fronted=0;app.rendered=true;app.bringToFront=()=>{fronted++;};await openAmmoManager();assert.equal(fronted,1);assert.equal(JSON.stringify(fx.state()),before);
  }finally{WeaponAssistantApp.prototype.render=oldRender;}
});
