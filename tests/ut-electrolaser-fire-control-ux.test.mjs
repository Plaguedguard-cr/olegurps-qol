import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogs,gaussFixture} from './helpers/gauss-context.mjs';
import {ELECTROLASER_PROFILES,electrolaserControlsHTML} from '../scripts/ut-electrolaser-source.js';
import {StandaloneWeaponDraft} from '../scripts/tools/standalone-weapon-service.js';
import {withRuntimeAmmoStats} from '../scripts/tools/attack-profile-runtime.js';
import {FirePreparationApp} from '../scripts/tools/fire-preparation-app.js';
import {attackProfilePresentation} from '../scripts/tools/weapon-profile-presentation.js';
async function fixture(p){
  const f=await gaussFixture(p.modeId,{host:false});
  if(p.underbarrel){const d=new StandaloneWeaponDraft({catalogs,type:'ranged',actor:f.actor,existing:f.definitions.list()[0]});
    for(const[k,v]of Object.entries({hostBulk:'-5',st:'10',acc:'7+2'}))d.setOverride(p.modeId,k,v);await f.definitions.save(d);}
  f.app=()=>Object.assign(Object.create(FirePreparationApp.prototype),{actor:f.actor,weapon:f.weapon(),attack:withRuntimeAmmoStats(f.attack(),f.actor),mode:'weapon'});
  return f;
}
for(const p of Object.values(ELECTROLASER_PROFILES)){
  test(p.name+': dynamic Standard/Kill/vacuum heading and linked Damage stay consistent',async()=>{
    const f=await fixture(p);
    for(const[mode,environment,heading,hint]of [
      ['standard','air',`Оглушение: HT−${-p.modifier} (2)`,''],
      ['kill','air',`Смертельный разряд: HT−${-p.modifier} (2)`,'Heart Attack при провале на 5+'],
      ['kill','vacuum','1d-3 burn','']]){
      await f.service.setElectrolaserConfiguration(f.weapon().id,{electrolaserMode:mode,electrolaserEnvironment:environment,electrolaserVisibilityDR:3});
      const before=f.state(),app=f.app(),profile=f.profile(),display=attackProfilePresentation(profile);
      assert.equal(display.electrolaser.heading,heading);assert.equal(display.electrolaser.hint,hint);
      const stats=app._getAttackStatsText(p.rof,p.acc);assert.ok(stats.startsWith(heading));
      if(environment!=='vacuum')assert.doesNotMatch(stats,/burn|aff/);else assert.doesNotMatch(stats,/HT|Оглушение|Смертельный/);
      const details=app._ammunitionConditionsHTML();assert.match(details,/<details[^>]*data-electrolaser-impact/);assert.doesNotMatch(details,/<details[^>]*\sopen/);
      assert.ok(details.includes(environment==='vacuum'?'1d-3 burn':p.burn));
      if(environment!=='vacuum')assert.match(details,/Связанный ожог:.*Оба воздействия — одна атака/);
      assert.equal(app.attack.data.damage,environment==='vacuum'?'1d-3 burn':p.burn);assert.deepEqual(f.state(),before);
    }
    await f.service.setElectrolaserConfiguration(f.weapon().id,{electrolaserMode:'kill',electrolaserEnvironment:'air'});
    const r=await f.shoot();assert.equal(r.receipt.power.spent,2);assert.equal(r.snapshot.profile.damage.formula,p.burn);assert.match(r.rollData.followon,/D:/);
    assert.equal(r.snapshot.profile.damage.rules.electrolaser.visibilityDR,3);assert.equal(r.snapshot.profile.damage.rules.resistanceEffect.modifier,p.modifier);
  });
  test(p.name+': compact controls preserve field contracts and selected values',async()=>{
    const f=await fixture(p);await f.service.setElectrolaserConfiguration(f.weapon().id,{electrolaserMode:'kill',electrolaserEnvironment:'rain',electrolaserVisibilityDR:17});
    const before=f.state();for(const lang of ['ru','en']){game.i18n.lang=lang;const html=electrolaserControlsHTML(f.weapon(),x=>x);
      assert.match(html,/gam-fire-electrolaser-fields/);assert.match(html,/value="kill" selected/);assert.match(html,/value="rain" selected/);
      assert.match(html,/name="electrolaserVisibilityDR"[^>]*value="17"/);assert.match(html,/Kill: 2 заряда\/выстрел; смена режима — Ready/);
      assert.match(html,/title="[^"]*Heart Attack/);assert.doesNotMatch(html,/<p>|gam-fire-lp-controls/);
      assert.equal((html.match(/<select /g)??[]).length,2);assert.equal((html.match(/<input /g)??[]).length,1);
    }assert.deepEqual(f.state(),before);
  });
}
test('range list restores its original scrollbar and responsive seven-row limit',async()=>{
  const source=await readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');
  const css=source.match(/\.gam-fire-range-list \{([^}]+)\}/)[1];assert.match(css,/max-height: 440px/);assert.match(css,/overflow-y: auto/);
  assert.match(source,/_syncRangeListHeight/);assert.match(source,/slice\(0, 7\)/);assert.match(source,/_rangeLayoutObserver\?\.disconnect\(\)/);
  assert.match(source,/\.gam-fire-preparation \{[\s\S]*?overflow-y: auto/);assert.match(source,/\.gam-fire-actions \{\s*position: sticky/);
  assert.match(source,/\.gam-fire-electrolaser-fields \{[^}]*flex-wrap:wrap/);
  assert.match(source,/\.gam-fire-electrolaser-fields \[name="electrolaserVisibilityDR"\] \{ width:4em/);
});
test('mode/environment still use the in-place Actor update path',async()=>{
  const source=await readFile(new URL('../scripts/tools/fire-preparation-app.js',import.meta.url),'utf8');
  const branch=source.slice(source.indexOf("if(['electrolaserMode'"),source.indexOf("if(['lpFireMode'"));
  assert.match(branch,/setElectrolaserConfiguration/);assert.doesNotMatch(branch,/\.render\(/);
  assert.match(source,/effectHint\.textContent=this\.attack\?\.ammunitionDisplay\?\.electrolaser\?\.hint/);
  assert.match(source,/impact&&impactOpen\)impact\.open=true/);
});
