import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { basicDamageDice } from '../scripts/tools/basic-damage-dice.js';
import { basicStrengthDamage } from '../scripts/tools/gurps-strength-damage.js';
import { FALL_COLLISION_DEFAULTS as D, fallCollisionSettings, calculateFall, calculateCollision,
  freeFallVelocity, localTerminalVelocity, collisionDice, barrierLimit, limitBarrierDamage, overrunDamage } from '../scripts/tools/fall-collision-rules.js';
import { fallCollisionMessage } from '../scripts/tools/fall-collision-presentation.js';
import { openFallingDamage, fallingContent } from '../scripts/tools/falling.js';
import { launcherActions, runLauncherAction } from '../scripts/launcher-actions.js';
import { isLegacyFallingMacro, renameLegacyFallingMacros } from '../scripts/module-macros.js';

const fall = changes => calculateFall({ ...D, gravity: 1, ...changes });
const object = changes => calculateCollision('object', { ...D.object, ...changes });
test('New defaults preserve .138G, height, HP, presets; pressure alone changes to 1', () => {
  const s = fallCollisionSettings();
  assert.equal(s.gravity, .138); assert.equal(s.pressure, 1); assert.equal(s.height, 19);
  assert.equal(s.hp, 10); assert.equal(s.fallType, 'normal'); assert.equal(s.customTerminal, 120);
  assert.equal(s.hardSurface, true); assert.equal(s.acrobatics, false); assert.equal(s.breakable, false);
  assert.equal(calculateFall({ ...s, gravity: 1 }).pressure, 1);
});
for (const [saved, expected] of [
  [{ gravity: .138, pressure: 1.3 }, { gravity: .138, pressure: 1.3 }],
  [{ gravity: 0, pressure: 0, height: 0 }, { gravity: 0, pressure: 0, height: 0 }],
  [{ terminalEarth: 60 }, { fallType: 'prone', customTerminal: 60 }],
  [{ terminalEarth: 100 }, { fallType: 'streamlined' }],
  [{ terminalEarth: 93 }, { fallType: 'custom', customTerminal: 93 }],
  [{ terminalEarth: 200, fallType: 'custom', customTerminal: 127 }, { fallType: 'custom', customTerminal: 127 }],
  [{ hardSurface: 'false', acrobatics: 'on' }, { hardSurface: false, acrobatics: true }]
]) test('Legacy settings: '+JSON.stringify(saved), () => {
  const before = structuredClone(saved), s = fallCollisionSettings(saved);
  for (const [k, v] of Object.entries(expected)) assert.equal(s[k], v);
  assert.deepEqual(saved, before);
});
test('Two users and repeated normalization do not share nested mutable settings', () => {
  const a = fallCollisionSettings({ pressure: 1.3, customLegacy: { keep: true }, object: { hpA: 70 } }), b = fallCollisionSettings();
  a.object.hpA = 80;
  assert.equal(b.object.hpA, 10); assert.equal(D.object.hpA, 10);
  assert.deepEqual(fallCollisionSettings(a), a); assert.equal(a.customLegacy.keep, true);
});
// B431 anchors checked against the printed alternative formula (not generated expectations).
for (const [height, velocity] of [[1,5],[2,7],[3,8],[4,9],[5,10],[6,11],[8,13],[10,15],[12,16],[17,19],[19,20],[25,23],[50,33],[100,46]]) {
  // The alternative formula differs at 100 yd from table's 47; preserve formula as requested.
  test(`B431 formula: ${height} yd → ${velocity} yd/s`, () => assert.equal(freeFallVelocity(height, 1), velocity));
}
test('Book example: 17 yd, HP10, hard ground → 3.8d → 4d', () => {
  const r = fall({ height: 17 }); assert.equal(r.speed, 19); assert.equal(r.damage.rawDice, 3.8); assert.equal(r.damage.dice, '4d');
});
test('Rounding speed at .138G and a damage-changing boundary at 1G', () => {
  const r = calculateFall(D); assert.equal(r.freeSpeed, 7); assert.equal(r.damage.rawDice, 1.4); assert.equal(r.damage.dice, '1d');
  const boundary = fall({height:1,hp:15}); assert.equal(boundary.damage.dice,'2d');
  assert.equal(basicDamageDice(30*Math.sqrt(21.4)/100), '1d');
});
for (const [height, acrobatics, effective, speed] of [[0,false,0,0],[3,true,0,0],[5,true,0,0],[6,true,1,5],[22,true,17,19],[22,false,22,22]])
  test(`Acrobatics height ${height}, enabled ${acrobatics}`, () => {
    const r = fall({ height, acrobatics }); assert.equal(r.effectiveHeight, effective); assert.equal(r.speed, speed);
    if (speed === 0) assert.equal(r.damage.dice, '0'); assert.equal('overrun' in r, false);
  });
test('Zero gravity, including vacuum, gives zero damage', () => {
  for (const pressure of [0,1]) assert.equal(fall({ gravity:0, pressure, height: 9999 }).damage.dice, '0');
});
test('Vacuum is unlimited; Earth terminal and local terminal are distinct', () => {
  assert.equal(localTerminalVelocity(80,1,0), Infinity);
  assert.equal(fall({ height:10000, pressure:0 }).speed, 463);
  const r = fall({ height:10000 }); assert.equal(r.freeSpeed,463); assert.equal(r.speed,80); assert.equal(r.limited,true);
});
test('Local terminal cap follows rounded free fall; terminal itself is not rounded', () => {
  const r = fall({ gravity:.138, pressure:1.3, height:10000 });
  assert.equal(r.terminalSpeed,80*Math.sqrt(.138)/Math.sqrt(1.3)); assert.equal(r.speed,r.terminalSpeed);
  const custom = fall({ gravity:1, pressure:1, height:1, fallType:'custom', customTerminal:4.8 });
  assert.equal(custom.freeSpeed,5); assert.equal(custom.speed,4.8);
});
test('Hard surface doubles HP exactly once; soft is ordinary HP', () => {
  assert.equal(fall({height:17,hardSurface:false}).damage.rawDice,1.9);
  const f=fall({height:17}), c=calculateCollision('obstacle',{hp:10,speed:19,hardSurface:true});
  assert.deepEqual(f.damage,c.damage); assert.equal(c.effectiveHp,20);
});
for (const [v, d] of [[0,'0'],[.0001,'1d-3'],[.25,'1d-3'],[.25001,'1d-2'],[.5,'1d-2'],[.50001,'1d-1'],[.999,'1d-1'],[1,'1d'],[1.49999,'1d'],[1.5,'2d']])
  test(`Shared basicDamageDice band ${v}`, () => assert.equal(collisionDice(100,v).dice,d));
test('Breakable cap affects points in both directions, never dice', () => {
  const a=fall({height:100,breakable:false,barrierHp:'',barrierDr:-1}),b=fall({height:100,breakable:true,barrierHp:3,barrierDr:2});
  assert.equal(a.cap,null);assert.equal(b.cap,5);assert.deepEqual(a.damage,b.damage);
  assert.equal(limitBarrierDamage(18,b.cap),5);assert.equal(limitBarrierDamage(3,b.cap),3);
  assert.equal(limitBarrierDamage(0,b.cap),0);assert.equal(limitBarrierDamage(18,null),18);
  const c=calculateCollision('obstacle',{hp:10,speed:b.speed,hardSurface:true,breakable:true,barrierHp:3,barrierDr:2});
  assert.equal(c.cap,b.cap);assert.deepEqual(c.toMover,b.damage);assert.deepEqual(c.toObstacle,b.damage);
  assert.equal(barrierLimit(true,.01,0),.01);
});
for (const [name, input, speed, toB, toA, limits] of [
  ['equal head-on',{hpA:10,hpB:20,speedA:5,speedB:5},10,'1d','2d',[]],
  ['slower A capped',{hpA:100,hpB:10,speedA:5,speedB:10},15,'2d','2d',['A']],
  ['slower B capped',{hpA:10,hpB:100,speedA:10,speedB:5},15,'2d','2d',['B']],
  ['book rear-end',{hpA:60,hpB:10,speedA:25,speedB:5,angle:'rearEnd'},20,'12d','2d',[]],
  ['rear response cap',{hpA:10,hpB:100,speedA:25,speedB:5,angle:'rearEnd'},20,'2d','2d',['B']],
  ['cannot catch',{speedA:4,speedB:5,angle:'rearEnd'},0,'0','0',[]],
  ['side-on ignores B speed',{hpA:10,hpB:100,speedA:10,speedB:99,angle:'sideOn'},10,'1d','1d',['B']],
  ['stationary target',{hpA:10,hpB:100,speedA:10,speedB:0},10,'1d','1d',['B']],
  ['stationary striker side-on',{speedA:0,speedB:30,angle:'sideOn'},0,'0','0',[]]
]) test(name,()=>{const r=object(input);assert.equal(r.speed,speed);assert.equal(r.toB.dice,toB);assert.equal(r.toA.dice,toA);assert.deepEqual(r.limits,limits);});
for (const [smA,smB,eligible]of [[1,0,false],[2,0,true],[5,0,true],[-1,-3,true]])
  test(`Overrun SM ${smA} / ${smB}`,()=>{const r=overrunDamage({hpA:60,smA,smB},20);assert.equal(r.eligible,eligible);assert.equal(r.dice,eligible?'3d':null);});
test('Overrun ST takes precedence; half rounds down; table shared',()=>{
  const r=calculateCollision('overrun',{...D.overrun,st:25});assert.equal(r.overrun.source,'ST');assert.equal(r.overrun.effectiveST,12);assert.equal(r.overrun.dice,'1d-1');
  assert.equal(r.overrun.dice,basicStrengthDamage(12,'thrust'));assert.equal(r.toB.dice,'12d');assert.equal(r.toA.dice,'2d');
});
test('No overrun at zero contact speed; below ST1 is explicitly unsupported',()=>{
  assert.equal(calculateCollision('overrun',{...D.overrun,speedA:0,speedB:0}).overrun.dice,null);
  const r=overrunDamage({hpA:1,smA:2,smB:0},1);assert.equal(r.eligible,true);assert.equal(r.dice,null);assert.match(r.reason,/вручную/);
});
for (const [name, fn]of [
  ['blank height',()=>fall({height:''})],['negative gravity',()=>fall({gravity:-1})],['NaN pressure',()=>fall({pressure:NaN})],
  ['zero HP',()=>fall({hp:0})],['infinite HP',()=>fall({hp:Infinity})],['invalid preset',()=>fall({fallType:'constructor'})],
  ['invalid custom',()=>fall({fallType:'custom',customTerminal:0})],['barrier HP0',()=>fall({breakable:true,barrierHp:0,barrierDr:0})],
  ['barrier negative DR',()=>fall({breakable:true,barrierHp:10,barrierDr:-1})],['negative speed',()=>object({speedB:-1})],
  ['invalid angle',()=>object({angle:'bad'})],['overflow',()=>object({hpA:1e308,speedA:1e308})],
  ['fractional SM',()=>calculateCollision('overrun',{...D.overrun,smA:2.5})],['ST0',()=>calculateCollision('overrun',{...D.overrun,st:0})]
])test('Reject invalid '+name,()=>assert.throws(fn));
test('Summary preserves visible result and closed calculation details',()=>{
  const html=fallCollisionMessage(fall({height:22,acrobatics:true,breakable:true,barrierHp:3,barrierDr:2}));
  const visible=html.split('<details')[0];assert.match(visible,/4к дробящего/);assert.match(visible,/−5 ярдов/);assert.match(visible,/не более 5/);
  assert.match(html,/Исходная высота/);assert.match(html,/Эффективная высота/);assert.doesNotMatch(html,/<details[^>]*\sopen/);
  assert.match(fallCollisionMessage(calculateCollision('overrun',D.overrun)),/Дополнительно A → B/);
});
test('Legacy API/launcher and macro command remain single and token-free',async()=>{
  const actions=launcherActions().filter(a=>a.id==='falling');assert.equal(actions.length,1);assert.equal(actions[0].tokenRequired,false);
  let called=0;await runLauncherAction('falling',{game:{olegurpsQOL:{falling:{open:()=>called++}}}});assert.equal(called,1);
  const macros=JSON.parse(fs.readFileSync(new URL('./fixtures/module-macro-contract.json',import.meta.url)));assert.equal(macros.find(m=>m._id==='OQfalling0000001').command,'game.olegurpsQOL.falling.open();');
});
test('RU/EN names and always-Russian form; values are escaped',()=>{
  for(const [lang,title]of [['ru','Падения и столкновения'],['en','Falls and Collisions']]){
    const dict=JSON.parse(fs.readFileSync(new URL(`../lang/${lang}.json`,import.meta.url)));assert.equal(dict['OleGURPS.Macro.OQfalling0000001'],title);
  }
  const html=fallingContent(fallCollisionSettings({height:'"><script>bad</script>'}));assert.match(html,/Столкновения/);assert.doesNotMatch(html,/<script>/);
});
test('Cancel/close does not persist flags, create messages, roll, or touch Actor',async()=>{
  const old={foundry:globalThis.foundry,game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  let writes=0,messages=0;
  globalThis.game={user:{getFlag:()=>({pressure:1.3}),setFlag:()=>writes++}};
  globalThis.ChatMessage={create:()=>messages++};
  globalThis.foundry={applications:{api:{DialogV2:{wait:async options=>{assert.equal(options.modal,false);assert.equal(options.rejectClose,false);return options.buttons.find(b=>b.action==='cancel').callback();}}}}};
  try{await openFallingDamage();assert.equal(writes,0);assert.equal(messages,0);}finally{Object.assign(globalThis,old);}
});
test('Only module-owned legacy default world macro names are migrated',()=>{
  const m={name:'Falling Damage',command:'game.olegurpsQOL.falling.open();',getFlag:()=> 'falling'};
  assert.equal(isLegacyFallingMacro(m),true);
  assert.equal(isLegacyFallingMacro({...m,name:'OleGURPS QOL '+String.fromCodePoint(0x2014)+' Урон от падения'}),true);
  assert.equal(isLegacyFallingMacro({...m,name:'My custom falling macro'}),false);
  assert.equal(isLegacyFallingMacro({...m,getFlag:()=>undefined}),false);
  assert.equal(isLegacyFallingMacro({...m,command:'different();'}),false);
});
test('Macro name migration changes only name, retains command/ID, and is idempotent',async()=>{
  const updates=[],m={id:'old-id',name:'Урон от падения',command:'game.olegurpsQOL.falling.open();',getFlag:()=> 'falling',update:async patch=>{updates.push(patch);Object.assign(m,patch);}};
  const r={game:{user:{isGM:true},macros:[m]}};
  assert.deepEqual(await renameLegacyFallingMacros(r),['old-id']);assert.deepEqual(updates,[{name:'Падения и столкновения'}]);
  assert.deepEqual(await renameLegacyFallingMacros(r),[]);assert.equal(m.command,'game.olegurpsQOL.falling.open();');
});
test('Player does not write macro names',async()=>{
  const r={game:{user:{isGM:false},macros:[{getFlag:()=>{throw Error('must not access');}}]}};
  assert.deepEqual(await renameLegacyFallingMacros(r),[]);
});
