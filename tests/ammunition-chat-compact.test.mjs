import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,load,shoot,catalogs,automatic,escapePayload} from './helpers/ut-ammunition-fixture.mjs';
import {buildUTMatrix,loadUTSourceContract} from '../tools/audit-ut-ammunition-completeness.mjs';
import {ammunitionChatData,ammunitionChatHTML,compactAmmoSource} from '../scripts/tools/ammunition-chat-summary.js';
import {resolveAmmunitionEffects} from '../scripts/tools/ammunition-effects.js';
import {standaloneModeStats} from '../scripts/tools/standalone-weapon-service.js';
import {renderShotAmmunitionConditions,shotDamageComponents} from '../scripts/tools/damage-shot-link.js';

const forbidden=/B cell|B414|B432|B435|Basic Set|collateral|Доз наполнителя на физический|Облако указанного радиуса|Осколки \(B|патрон(?:ов|а) не|подсистем|не автоматизирован|устройств[оа] модуля/;
const matrix=buildUTMatrix(catalogs,await loadUTSourceContract());
test('every available UT recipe produces a brief sourced description, no common rulebook paragraphs or duplicate rows',()=>{
  let checked=0;
  for(const row of matrix.rows.filter(r=>r.implementation==='available'&&r.configurationId===r.modeId&&r.recipeVariant)){
    const p=automatic.prepare({modeId:row.modeId,base:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:row.ammoFamilyId},variantId:row.recipeVariant,parameters:{availabilityTL:row.availabilityTL}});
    assert.equal(p.state,'complete');
    const damage=resolveAmmunitionEffects({raw:standaloneModeStats(catalogs.getMode(row.modeId)),variantId:row.recipeVariant,baseStatus:p.baseStatus,constructionStatus:p.rulesStatus,facts:p.facts});
    const profile={ammunition:p.type,damage},before=JSON.stringify(profile),data=ammunitionChatData(profile),html=ammunitionChatHTML(profile,escapePayload);
    assert.ok(data.source.startsWith('UT'),row.candidateId);assert.equal(new Set(data.lines).size,data.lines.length);
    assert.ok(data.lines.length<=3,row.candidateId);assert.ok(data.lines.join(' ').length<=310,row.candidateId);
    assert.doesNotMatch(html,forbidden,row.candidateId);assert.doesNotMatch(JSON.stringify(damage.rules),forbidden,row.candidateId);
    assert.doesNotMatch(html,/<details[^>]*\bopen|<p>\s*<\/p>|<p[^>]*>\s*<details/);
    assert.equal(JSON.stringify(profile),before);checked++;
  }
  assert.ok(checked>350);
});
test('HT normal, AP, APEX, APHEX, +P, tracer, HE and manual effects retain charge-specific source and mechanics',async()=>{
  const samples=[
    [null,'HT176','',{}],['ht_ap','HT167','',{}],['ht_apex','HT169','follow-up',{}],['ht_aphex','HT170','incendiary',{}],
    ['ht_plus_p','HT165','Malf',{pressure:{possibleMalfPenalty:-1}}],['ht_tracer','HT175','+1',{}],
    ['ht_he','HT169','осколки',{}],['ht_white_phosphorus','HT172','10 секунд',{}],['ht_tear_gas','HT171','HT−2',{}]
  ];
  for(const [variant,source,unique,rules]of samples){
    const profile={ammunition:{book:'ht',name:'Тестовый заряд',recipe:{variantId:variant}},damage:{nativeSafe:true,variantId:variant,formula:'4d(2) pi',components:[{role:'kinetic',formula:'4d(2) pi',status:'resolved'}],rules:{...rules,ammunitionSource:source}}};
    const before=JSON.stringify(profile),html=ammunitionChatHTML(profile,escapePayload),data=ammunitionChatData(profile);
    assert.equal(data.source,source);if(unique)assert.ok(html.includes(unique));assert.doesNotMatch(html,forbidden);assert.equal(JSON.stringify(profile),before);
    assert.ok(data.lines.join(' ').length<240);
  }
  assert.equal(compactAmmoSource('Ultra-Tech 2007, pp. 153-154; B414–415'),'UT153–154');
  assert.equal(compactAmmoSource('HT 165; B408'),'HT165');
});
test('user Note, resistance and long multiline description survive exactly once; empty fields and removed radius stay absent',()=>{
  const note='Моё вещество <test>',description=('Авторская запись без сокращений.\n').repeat(80);
  for(const lang of ['ru','en']){
    game.i18n.lang=lang;
    const profile={ammunition:{book:'ut',name:'25mm HE — '+note,recipe:{variantId:'ut_he',autoProfile:{facts:{row:{},caliberMm:25}}}},damage:{variantId:'ut_he',rules:{payload:{note,savingThrow:'HT-2 <user>',description,radius:{applicable:true,yards:null,origin:'manual'}}},transformations:[{source:'UT 153-154'}]}};
    const old=JSON.stringify(profile),data=ammunitionChatData(profile),html=ammunitionChatHTML(profile,escapePayload);
    assert.equal(data.fields.find(f=>f.description).value,description);assert.equal(data.fields.find(f=>f.label.includes('Спасбросок')).value,'HT-2 <user>');
    assert.equal(html.split(escapePayload(note)).length-1,1);assert.ok(html.includes(escapePayload(description)));
    assert.doesNotMatch(html,/Радиус|не определён|Unknown|<user>|<test>/);assert.match(html,/Содержимое и применение заряда/);assert.equal(JSON.stringify(profile),old);
    profile.damage.rules.payload={};const empty=ammunitionChatHTML(profile,escapePayload);assert.doesNotMatch(empty,/Вещество|Спасбросок|Краткое описание|Радиус/);
  }
});
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.textContent='';}
  append(e){this.children.push(e);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(){}replaceChildren(){this.children=[];}remove(){this.removed=true;}
}
test('historical verbose HTML is replaced only in the displayed DOM; snapshot and native component buttons are preserved',()=>{
  const profile={actorId:'a',ammunition:{book:'ut',source:'catalog',status:'confirmed',name:'25mm HE',recipe:{variantId:'ut_he',autoProfile:{facts:{caliberMm:25,row:{}}}}},damage:{nativeSafe:true,variantId:'ut_he',formula:'10d(0.5) pi++',components:[{role:'kinetic',formula:'10d(0.5) pi++',status:'resolved'},{role:'follow-up',formula:'4d cr ex',status:'resolved'},{role:'fragmentation',formula:'1d cut',status:'resolved'}],rules:{instructions:['Осколки (B414–415): '+'длинный справочник '.repeat(200)],componentOrder:['kinetic','follow-up','fragmentation']},transformations:[{source:'UT 153-154'}]},context:{}};
  const shot={version:1,attackId:'shot',actorId:'a',ammunition:profile.ammunition,profile,mode:{name:'Weapon'},spent:1,correlation:{attackMessageId:'m'}};
  const message={id:'m',visible:true,isContentVisible:true,flags:{'olegurps-qol':{shotSnapshot:shot}},content:'Historical persisted prose'};
  const old=JSON.stringify(message),legacy=new Element('details'),card=new Element('div'),root={querySelector:s=>s.includes('gga-chat-message')?card:null,querySelectorAll:()=>[legacy]};
  const runtime={document:{createElement:t=>new Element(t)},game:{user:{id:'p',isGM:false},i18n:{lang:'en'},messages:new Map([['m',message]])}};
  const details=renderShotAmmunitionConditions(message,root,runtime);assert.ok(details);assert.equal(legacy.removed,true);assert.equal(details.attrs.open,undefined);
  assert.doesNotMatch(JSON.stringify(details),forbidden);assert.equal(JSON.stringify(message),old);
  assert.deepEqual(shotDamageComponents(message,runtime).map(c=>c.formula),['4d cr ex','1d cut']);
  message.isContentVisible=false;assert.equal(renderShotAmmunitionConditions(message,root,runtime),null);
});
test('real owner stock/load/attack path saves compact new snapshots, unchanged formulas, one spend and immutable old shots',async()=>{
  for(const variantId of ['ut_he','ut_hec','ut_aphex','ut_biochemical_aerosol','ut_emp','ut_tangler']){
    const fx=await fixture('WdUnAFzFvv59Smhhk'),base=fx.candidates().find(t=>!t.recipe&&!t.unavailable),p=automatic.prepare({modeId:fx.carrier.standaloneModeId,base,variantId,parameters:{note:'Owner text',description:'Моя запись'}});
    assert.equal(p.state,'complete');await fx.transaction('save-recipe',{type:p.type});await load(fx,p.type);
    const expected=fx.profile().damage,shot=await shoot(fx),before=JSON.stringify(shot.snapshot);
    assert.equal(shot.spent,1);assert.equal(shot.snapshot.profile.damage.formula,expected.formula);assert.deepEqual(shot.snapshot.profile.damage.components,expected.components);
    assert.doesNotMatch(JSON.stringify(shot.snapshot),forbidden);assert.doesNotMatch(shot.message.content,forbidden);assert.match(shot.message.content,/Моя запись/);
    if(shot.snapshot.profile.construction.record)assert.deepEqual(Object.keys(shot.snapshot.profile.construction.record).sort(),['id','source_ref']);
    await shoot(fx,1,{attackId:shot.snapshot.attackId});assert.equal(JSON.stringify(shot.snapshot),before);
  }
});
