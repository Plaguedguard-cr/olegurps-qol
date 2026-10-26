import test from 'node:test';
import assert from 'node:assert/strict';
import {applyLTQuality,normalizeLTQuality,ltQualityHTML} from '../scripts/tools/lt-quality.js';
import fs from 'node:fs/promises';
import {CatalogService} from '../scripts/catalog-service.js';
import {ltBowDamage} from '../scripts/tools/lt-bow.js';
globalThis.game={settings:{get:()=>null},user:{id:'owner',getFlag:()=>undefined}};
const catalogs=new CatalogService({logger:null,fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../data/catalogs/'+url.split('/').at(-1),import.meta.url),'utf8'))})});
await catalogs.load();
test('quality choices use Russian labels while retaining persisted quality IDs',()=>{
 const html=ltQualityHTML({},'p7',s=>s);
 assert.match(html,/value="fine"[^>]*>Хорошее</);
 assert.match(html,/value="very-fine"[^>]*>Отличное</);
});
test('source LT59 reaches existing bow resolver, rather than silently ignoring selected weapon and projectile quality',()=>{
 const d=ltBowDamage({modeId:'WqUeIOkvQIgCeKWou',configuration:{ratedST:14,quality:{quality:'fine',balance:'balanced'}},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_regular_arrow',recipe:{version:1,variantId:'regular',parameters:{quality:{quality:'fine',balance:'balanced'}}}},catalogs});
 assert.equal(d.formula,'1d+3 imp');assert.equal(d.effectiveChanges.range,'252/336');assert.equal(d.effectiveChanges.acc,4);assert.equal(d.rules.attackBonus,1);
});
const damage=(type='imp')=>({nativeSafe:true,formula:'1d+2 '+type,components:[{relation:'primary',formula:'1d+2 '+type},{relation:'linked',formula:'1 burn'}],rules:{attackBonus:-1,ballisticRange:{halfDamage:140,maximum:210}},effectiveChanges:{damage:'1d+2 '+type,range:'140/210',acc:3},transformations:[]});
test('LT59 fine missile range and balanced Acc are distinct from fine/balanced physical projectile damage and skill',()=>{
 const d=applyLTQuality(damage(),{missile:true,weapon:{quality:'fine',balance:'balanced'},projectile:{quality:'fine',balance:'balanced'}});
 assert.equal(d.formula,'1d+3 imp');assert.equal(d.effectiveChanges.range,'168/252');assert.equal(d.effectiveChanges.acc,4);assert.equal(d.rules.attackBonus,0);assert.equal(d.components[1].formula,'1 burn');assert.equal(d.rules.ballisticRange.maximum,252);
});
test('LT59 thrown very fine cutting damage/balance; crushing and piercing get no invented quality damage',()=>{
 const d=applyLTQuality(damage('cut'),{weapon:{quality:'very-fine',balance:'poor'}});assert.equal(d.formula,'1d+4 cut');assert.equal(d.rules.attackBonus,-2);assert.equal(d.effectiveChanges.acc,3);assert.equal(d.effectiveChanges.range,'140/210');
 for(const type of ['cr','pi','pi-','burn'])assert.equal(applyLTQuality(damage(type),{weapon:{quality:'fine'}}).formula,'1d+2 '+type);
});
test('LT59 invalid missile Very Fine, mutually exclusive quality and balance for improvised sticks',()=>{
 assert.throws(()=>normalizeLTQuality({quality:'very-fine'},{missile:true}));assert.throws(()=>normalizeLTQuality({balance:'balanced'},{balanceAllowed:false}));assert.throws(()=>normalizeLTQuality({quality:'fine+silver'}));
});
test('LT59 silver records manual target/material consequences, no automatic HP; default leaves historical numeric profile unchanged',()=>{
 const before=damage(),copy=structuredClone(before);assert.deepEqual(applyLTQuality(before),copy);
 const d=applyLTQuality(damage(),{weapon:{quality:'silver'}});assert.equal(d.formula,'1d+2 imp');assert.equal(d.rules.ltQuality.breakage.weapon,2);assert.equal(d.rules.ltQuality.effectsManual,true);
});
test('LT75 opt-in reduced Acc rounds down after balance; cheap weapon malfunction stays separate and off by default',()=>{
 const d=applyLTQuality(damage(),{missile:true,weapon:{quality:'cheap',balance:'balanced',reducedAcc:true,cheapMalfunctions:true},cheapMalf:15});
 assert.equal(d.effectiveChanges.acc,2);assert.equal(d.rules.ltQuality.weaponReliability.malf,15);
 const ordinary=applyLTQuality(damage(),{missile:true,weapon:{quality:'cheap'},cheapMalf:15});assert.equal(ordinary.rules.ltQuality.weaponReliability,undefined);
 const bow=applyLTQuality(damage(),{missile:true,weapon:{quality:'cheap',cheapMalfunctions:true},cheapMalf:16});assert.equal(bow.rules.ltQuality.weaponReliability.malf,16);
});
test('Fine launcher updates Flight boundary together with final range, preserving final /2 rolled damage within new half-range',()=>{
 const d=ltBowDamage({modeId:'WqUeIOkvQIgCeKWou',configuration:{ratedST:14,quality:{quality:'fine'}},type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId:'lt_flight_arrow_lt73'},catalogs,context:{physicalDistance:450}});
 assert.equal(d.effectiveChanges.range,'504/672');assert.equal(d.rules.ltBow.flightDamage,'half');assert.equal(d.rules.ltBow.halfDamage,504);
});
