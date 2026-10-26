import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogs} from './helpers/lt-p7-context.mjs';
import {LT_ARTILLERY_PROFILES} from '../scripts/lt-artillery-source.js';
for(const p of Object.values(LT_ARTILLERY_PROFILES).filter(p=>['W5TNQWnLaM0EvaZwK','WUGC7s4EJ_mYffi3H','WHm2NbM8FdpkrepQR','WKpzIbv50y67GMjMq'].includes(p.modeId)))test('F25 LT81 mechanical lead unit price '+p.modeId,()=>{
 const a=p.ammunition.find(a=>a.kind==='lead'),r=catalogs.getAmmoItem('lt',a.id);
 assert.equal(r.price_per_lb_usd,1.6);assert.equal(r.price_usd,Number((a.mass*1.6).toPrecision(12)));assert.equal(r.weight_lb,a.mass);assert.equal(r.source_ref_price,'LT81');assert.doesNotMatch(r.price_formula,/20 USD|100 USD/);
});
for(const [id,rate]of [['lt_p5_bundle_one_lb_stone',1],['lt_p5_bundle_one_lb_lead',1.6]])test('LT81 bundle unit is one physical one-pound projectile, not a whole heavy stone: '+id,()=>{
 const r=catalogs.getAmmoItem('lt',id);assert.equal(r.price_per_lb_usd,rate);assert.equal(r.weight_lb,1);assert.equal(r.price_usd,rate);
});
