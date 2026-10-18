import test from 'node:test';
import assert from 'node:assert/strict';
import {resistanceVisionDefaults,visionResistanceModifier,withoutResistanceConfirmation,rollResistance} from '../scripts/tools/resistance-roll.js';
import {htLaserEffect} from '../scripts/ht-laser-source.js';
const scope='olegurps-qol',effect=htLaserEffect('WALzMQGej7znsQIsa');
const actorWith=(...ads)=>({system:{ads:Object.fromEntries(ads.map((a,i)=>[i,a]))}});
for(const [name,entry,expected]of [
  ['Protected Vision',{name:'Protected Vision'},true],
  ['Protected Sense (Vision)',{name:'Protected Sense (Vision)'},true],
  ['structured specialization',{name:'Protected Sense',specialization:'Vision'},true],
  ['Hearing',{name:'Protected Sense (Hearing)'},false],
  ['partial name',{name:'Improved Protected Vision notes'},false],
  ['disabled',{name:'Protected Vision',disabled:true},false],
  ['inactive',{name:'Protected Vision',active:false},false]
])test('current GGA advantage: '+name,()=>{
  assert.equal(resistanceVisionDefaults(actorWith(entry)).protectedVision,expected?'yes':'no');
});
for(const level of [0,1,4])test('Nictitating Membrane actual level '+level,()=>{
  const defaults=resistanceVisionDefaults(actorWith({name:'Nictitating Membrane'+(level?' '+level:''),level:String(level)}));
  assert.equal(defaults.membrane,level);assert.equal(defaults.distance,'within');
  assert.equal(visionResistanceModifier(effect,defaults).modifier,-5+level);
});
test('nested/collapsed traits are read, inactive containers and equipment are excluded',()=>{
  const actor=actorWith({name:'Traits',contains:{a:{name:'Protected Vision'}},collapsed:{b:{name:'Nictitating Membrane',level:4}}},
    {name:'Inactive',enabled:false,contains:{a:{name:'Nictitating Membrane',level:9}}});
  actor.system.equipment={carried:{x:{name:'Nictitating Membrane',level:99}}};
  assert.deepEqual(resistanceVisionDefaults(actor),{distance:'within',protectedVision:'yes',membrane:4});
});
test('missing or ambiguous membrane is safely zero, never guessed or summed',()=>{
  for(const ads of [[],[{name:'Nictitating Membrane'}],[{name:'Nictitating Membrane',level:'unknown'}],
    [{name:'Nictitating Membrane',level:1},{name:'Nictitating Membrane',level:4}],
    [{name:'Nictitating Membrane 4',level:1}],[{name:'Nictitating Membrane',level:-1}]])
    assert.equal(resistanceVisionDefaults(actorWith(...ads)).membrane,0);
});
test('empty/missing membrane is zero; manual protection and distance change the modifier',()=>{
  for(const membrane of ['',undefined,null,0])assert.equal(visionResistanceModifier(effect,{distance:'within',protectedVision:'no',membrane}).modifier,-5);
  assert.equal(visionResistanceModifier(effect,{distance:'beyond',protectedVision:'yes',membrane:4}).modifier,7);
  for(const membrane of [-1,0.5,'x',Infinity])assert.throws(()=>visionResistanceModifier(effect,{distance:'within',protectedVision:'no',membrane}));
});
function runtime(){
  const actor={...actorWith({name:'Protected Vision'},{name:'Nictitating Membrane',level:4}),id:'bound',name:'Защитник',isOwner:true};
  actor.system.attributes={HT:{value:12}};
  const token={id:'token',actor,isOwner:true};
  const rt={game:{user:{id:'owner',isGM:false},actors:new Map([[actor.id,actor]]),i18n:{localize:()=> 'Roll Confirmation'}},
    canvas:{tokens:{controlled:[token]}},__olegurpsNativeResistanceLoader:async()=>({doRoll:async()=>false}),
    GURPS:{lastTargetedRoll:{},parselink:()=>({action:{type:'attribute'}})},Hooks:{on:()=>1,off(){}}};
  return {actor,token,rt,message:{flags:{[scope]:{resistanceEffect:effect}}}};
}
test('nonmodal conditions prefill traits; removed questions absent; live preview and empty input work',async()=>{
  const h=runtime(),before=structuredClone(h.actor.system);let read;
  h.rt.foundry={applications:{api:{DialogV2:{wait:async options=>{
    assert.equal(options.modal,false);assert.match(options.content,/value="within" selected/);
    assert.match(options.content,/value="yes" selected/);assert.match(options.content,/name="membrane"[^>]*value="4"/);
    assert.doesNotMatch(options.content,/looking|HT71|Персонаж смотрит|required|autofocus/);
    const events={},preview={},form={elements:{distance:{value:'within'},protectedVision:{value:'yes'},membrane:{value:'4'}},addEventListener:(n,fn)=>{events[n]=fn;}};
    options.render(null,{element:{querySelector:s=>s==='form'?form:preview}});
    assert.match(preview.textContent,/\+4/);form.elements.membrane.value='';events.input();assert.match(preview.textContent,/\+0/);
    form.elements.distance.value='beyond';events.change();assert.match(preview.textContent,/\+3/);
    read=options.buttons.find(b=>b.action==='roll').callback(null,{form});return read;
  }}}}};
  await rollResistance(h.message,h.rt);assert.deepEqual(read,{distance:'beyond',protectedVision:'yes',membrane:0});assert.deepEqual(h.actor.system,before);
});
test('conditions cancel and X/close do not invoke native GGA',async()=>{
  for(const answer of [false,null]){const h=runtime();let calls=0;h.rt.__olegurpsNativeResistanceLoader=async()=>{calls++;};
    h.rt.foundry={applications:{api:{DialogV2:{wait:async()=>answer}}}};
    assert.equal(await rollResistance(h.message,h.rt),null);assert.equal(calls,0);}
});
test('Actor removed or ownership lost while nonmodal conditions are open stops before GGA',async()=>{
  for(const change of ['removed','rights','token']){const h=runtime();
    h.rt.__olegurpsResistanceConditions=async()=>{if(change==='removed')h.rt.game.actors.delete(h.actor.id);
      if(change==='rights')h.actor.isOwner=false;if(change==='token')h.token.document={id:'deleted',parent:{tokens:new Map()}};
      return {distance:'within',protectedVision:'no',membrane:0};};
    await assert.rejects(()=>rollResistance(h.message,h.rt),/недоступен|Нет прав/);}
});
test('GGA callback bypass: native roll once, unrelated dialogs intact, original wait restored',async()=>{
  let native=0,delegated=0,checked=0;const original=async()=>{delegated++;return 'dialog';};
  const DialogV2={wait:original},rt={game:{i18n:{localize:()=> 'Native confirmation'}},foundry:{applications:{api:{DialogV2}}}};
  const options={window:{title:'Native confirmation'},buttons:[{action:'roll',default:true,callback:()=>{native++;return 42;}},{action:'cancel'}]};
  const result=await withoutResistanceConfirmation(async()=>{
    assert.equal(await DialogV2.wait({window:{title:'Other'}}),'dialog');
    assert.equal(await DialogV2.wait(options),42);assert.equal(await DialogV2.wait(options),'dialog');return 'native-result';
  },rt,()=>{checked++;});
  assert.equal(result,'native-result');assert.equal(native,1);assert.equal(delegated,2);assert.equal(checked,1);assert.equal(DialogV2.wait,original);
});
test('native failure or final permission validation failure always restores DialogV2',async()=>{
  for(const lostRights of [false,true]){const original=async()=>null,DialogV2={wait:original},rt={foundry:{applications:{api:{DialogV2}}}};
    const options={window:{title:'Roll Confirmation'},buttons:[{action:'roll',default:true,callback:()=>{throw Error('native');}},{action:'cancel'}]};
    await assert.rejects(()=>withoutResistanceConfirmation(()=>DialogV2.wait(options),rt,()=>{if(lostRights)throw Error('rights');}),/native|rights/);
    assert.equal(DialogV2.wait,original);}
});
