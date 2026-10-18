import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,api,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {parseCampaignTL,readCampaignTL,saveCampaignTL,publishedTL,requiredAmmunitionTL,campaignAmmunitionAdmission} from '../scripts/tools/ammunition-tech-level.js';
import {ammunitionCandidates,availableAmmoTypes} from '../scripts/tools/ammo-management-app.js';
import {utPayloadEditorHTML} from '../scripts/tools/ut-special-ammunition.js';
import {WeaponConfigurationDraft,weaponConfigurationHTML} from '../scripts/tools/weapon-configuration.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {UT_MANUAL_MOTOR_POWER} from '../scripts/tools/ut-conventional-ammunition.js';
const base=(ammoId,book='ut',kind='ammo-family')=>({source:'catalog',book,kind,ammoId});
test('one owner Actor flag accepts integer TL or unset; unrelated state and reload serialization survive',async()=>{
  const fx=await fixture('WYYJ_58OEKOTk38wi'),before=JSON.stringify(fx.state());
  assert.equal(readCampaignTL(fx.actor),null);
  for(const value of [-1,1.5,'9^','9abc',NaN,Infinity])assert.throws(()=>parseCampaignTL(value));
  game.user.isGM=false;
  try{
    await saveCampaignTL(fx.actor,'10');assert.equal(readCampaignTL(fx.actor),10);
    const flags=JSON.parse(JSON.stringify({'campaignTL':fx.actor.getFlag('olegurps-qol','campaignTL')}));
    assert.equal(readCampaignTL({getFlag:(_s,k)=>flags[k]}),10);
    const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],catalogs});
    assert.equal(draft.campaignTL,10);
    assert.match(weaponConfigurationHTML(draft),/name="campaignTL"[^>]*value="10"/);
    await saveCampaignTL(fx.actor,'');assert.equal(readCampaignTL(fx.actor),null);
    assert.equal(JSON.stringify(fx.state()),before);
  }finally{game.user.isGM=true;}
});
test('unknown, missing and absent catalog TL always pass every campaign level for all books without copying weapon TL',()=>{
  for(const book of ['ht','ut','lt','future'])for(const campaignTL of [0,1,3,8,9,10,12,50,null]){
    const type=base('missing',book,'ammo-item');
    assert.equal(campaignAmmunitionAdmission(type,catalogs,campaignTL).allowed,true);
    assert.equal(requiredAmmunitionTL(type,catalogs),null);
  }
  const ht=base('ht_22_long_rifle_5_7x16mmr','ht','ammo-item');
  assert.equal(requiredAmmunitionTL(ht,catalogs),null);
  for(const tl of [0,3,9,12])assert.equal(campaignAmmunitionAdmission(ht,catalogs,tl).allowed,true);
  assert.equal(publishedTL('10^'),10);assert.equal(publishedTL('TL10^'),10);
  for(const value of ['9-12','9/10','unknown',null,''])assert.equal(publishedTL(value),null);
});
test('known HT constructions and LT records filter separately from unknown cartridge and weapon TL',()=>{
  const ht=base('ht_22_long_rifle_5_7x16mmr','ht','ammo-item');
  const option=catalogs.getVariant('ht','ht_rifled_slug');assert.equal(option.min_tl,6);
  const recipe={...ht,recipe:{variantId:'ht_rifled_slug'}};
  assert.equal(campaignAmmunitionAdmission(recipe,catalogs,5).allowed,false);
  assert.equal(campaignAmmunitionAdmission(recipe,catalogs,6).allowed,true);
  const lt=base('lt_arbalest_bolt_lt81','lt','ammo-item');
  assert.equal(requiredAmmunitionTL(lt,catalogs),3);
  assert.equal(campaignAmmunitionAdmission(lt,catalogs,2).allowed,false);
  assert.equal(campaignAmmunitionAdmission(lt,catalogs,3).allowed,true);
  assert.equal(campaignAmmunitionAdmission({...recipe,recipe:{...recipe.recipe,parameters:{source:{kind:'user'}}}},catalogs,0).allowed,true);
});
test('real unknown-TL HT base stays selectable and stock creation passes service at campaign 0/3/9/12',async()=>{
  const fx=await fixture('W09RarXVw2-ZAi-dC');
  const original=availableAmmoTypes(fx.actor,fx.weapon(),api).filter(t=>!t.recipe);
  assert.ok(original.length);
  for(const tl of [0,3,9,12]){
    await saveCampaignTL(fx.actor,tl);
    const types=availableAmmoTypes(fx.actor,fx.weapon(),api);
    for(const type of original){assert.ok(types.some(t=>t.key===type.key));assert.equal(requiredAmmunitionTL(type,catalogs),null);}
    await fx.transaction('add-stock',{ammoKey:original[0].key,amount:1});
  }
  assert.equal(fx.weapon().totalAmmo,4);
});
test('all four motor catalogs and SEFOP use Actor campaign 9/10; exact editions persist and null restores every candidate',async()=>{
  for(const modeId of [...Object.keys(UT_MANUAL_MOTOR_POWER),'WdUnAFzFvv59Smhhk']){
    const fx=await fixture(modeId),original=fx.candidates().map(t=>t.key);
    for(const tl of [9,10]){
      await saveCampaignTL(fx.actor,tl);
      const types=availableAmmoTypes(fx.actor,fx.weapon(),api);
      assert.ok(types.some(t=>!t.recipe));
      assert.ok(types.every(t=>(requiredAmmunitionTL(t,catalogs)??0)<=tl));
      const aphex=types.filter(t=>t.recipe?.variantId==='ut_aphex'&&!t.unavailable);
      if(catalogs.getAmmoFamily('ut',types.find(t=>!t.recipe).ammoId)?.caliber_mm>=15)
        assert.deepEqual(aphex.map(t=>t.recipe.parameters.availabilityTL),[9,...tl===10?[10]:[]]);
    }
    await saveCampaignTL(fx.actor,null);assert.deepEqual(fx.candidates().map(t=>t.key),original);
  }
});
test('service blocks direct new published high-TL recipe and stock writes while retaining old load, fields and frozen shots',async()=>{
  const fx=await fixture('WdUnAFzFvv59Smhhk'),b=fx.candidates().find(t=>!t.recipe);
  const p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_sefop',parameters:{availabilityTL:10,note:'Preserved'}});
  await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
  const result=await shoot(fx),oldShot=JSON.stringify(result.snapshot),oldInventory=JSON.stringify(fx.weapon().ammunitionInventory);
  await saveCampaignTL(fx.actor,9);
  assert.equal(JSON.stringify(fx.weapon().ammunitionInventory),oldInventory);assert.equal(JSON.stringify(result.snapshot),oldShot);
  const saved=fx.candidates().find(t=>t.key===p.type.key);assert.equal(saved.inventoryOnly,true);assert.equal(saved.unavailable,false);
  assert.equal(automatic.admission(p,{actor:fx.actor}).allowed,false);
  await assert.rejects(fx.service.inventoryTransaction(fx.carrier.id,'save-recipe',{type:automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_sefop',parameters:{availabilityTL:11}}).type}),/CampaignTLUnavailable/);
  await assert.rejects(fx.transaction('add-stock',{ammoKey:p.type.key,amount:1}),/CampaignTLUnavailable/);
  await fx.transaction('unload',{magazineId:fx.weapon().ammunitionInventory.installedId,amount:fx.weapon().ammunitionInventory.magazines[0].rounds});
  await fx.transaction('load',{magazineId:fx.weapon().ammunitionInventory.installedId,ammoKey:p.type.key,amount:1});
  const edit=automatic.prepare({modeId:fx.carrier.standaloneModeId,base:b,variantId:'ut_sefop',parameters:{...p.type.recipe.parameters,note:''}});
  await fx.transaction('edit-recipe',{ammoKey:p.type.key,type:edit.type});
  assert.equal(JSON.stringify(result.snapshot),oldShot);
});
test('Mininuke/Micro-Antimatter variants keep exact source TL size, selected yield, component damage, cost and editor options',async()=>{
  for(const [modeId,caliber]of [['WOMuCBSS_c_nIstvm',100],['WgqAB3QGTUZrgtdES',25],['WmyROTLk0gs7lrYCE',10]]){
    const fx=await fixture(modeId),b=fx.candidates().find(t=>!t.recipe);
    for(const [variantId,limits,setting,formulas,cost]of [
      ['ut_mininuke',{9:100,10:64,11:40,12:25},'0.1kt',['6dx600 cr ex','6dx400 burn ex rad sur'],1000],
      ['ut_micro_antimatter',{10:100,11:40,12:10},'1ug',['6dx12 burn ex sur','6dx100000 tox rad'],10]]){
      for(const tl of [9,10,11,12]){
        const p=automatic.prepare({modeId,base:b,variantId,parameters:{availabilityTL:tl,setting}});
        const valid=limits[tl]!=null&&caliber>=limits[tl];assert.equal(p.state==='complete',valid);
        if(!valid)continue;
        const e=resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(modeId)),variantId,baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
        assert.equal(e.nativeSafe,true);assert.deepEqual(e.components.map(c=>c.formula),formulas);assert.equal(e.rules.costMultiplier,cost);
        assert.equal(p.type.recipe.parameters.availabilityTL,tl);assert.equal(p.type.recipe.parameters.setting,setting);
        assert.equal(automatic.admission(p,{campaignTL:tl-1}).allowed,false);assert.equal(automatic.admission(p,{campaignTL:tl}).allowed,true);
        const html=utPayloadEditorHTML(p.type,p.type.recipe.parameters,escapePayload,{campaignTL:tl});
        const select=html.match(/name="ut-availabilityTL">(.*?)<\/select>/s)[1];
        const offered=[...select.matchAll(/value="(\d+)"/g)].map(m=>Number(m[1]));
        assert.deepEqual(offered,Object.keys(limits).map(Number).filter(level=>level<=tl&&caliber>=limits[level]));
      }
    }
  }
});
test('shared chat detail class preserves native disclosure and short description; UI remains Russian under ru/en',async()=>{
  for(const path of ['scripts/tools/prepared-gga-roll.js','scripts/tools/ammunition-chat-summary.js']){
    const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
    for(const match of source.matchAll(/<details class="([^"]+)"/g))assert.match(match[1],/olegurps-chat-details/);
    assert.doesNotMatch(source,/<details class="[^"]*olegurps-chat-details[^>]*\sopen/);
  }
  const css=await readFile(new URL('../styles/olegurps-qol.css',import.meta.url),'utf8');
  assert.match(css,/\.olegurps-chat-details > summary\s*\{/);assert.match(css,/list-style-type: disclosure-open/);
  const fx=await fixture('WYYJ_58OEKOTk38wi');
  for(const lang of ['ru','en']){game.i18n.lang=lang;const draft=new WeaponConfigurationDraft({actor:fx.actor,state:fx.state(),attacks:[],catalogs});assert.match(weaponConfigurationHTML(draft),/ТУ кампании/);}
});
