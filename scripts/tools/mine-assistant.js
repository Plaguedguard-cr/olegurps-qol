import {HT_MINES,LIMPET_BODIES,minePayloads,resolveMine} from './mine-catalog.js';
import {readMines,requestMineOperation,canManageMine,mineResultHTML,MINE_SCOPE} from './mine-service.js';
import {mt as t,mineEscape as esc} from './mine-localization.js';
import {utGrenadeChoices,utPayloadLabel} from './grenade-ut.js';
import {utChemicalName,utSwarmName} from './ut-nomenclature.js';
import {grenadeProtection,grenadeHasCheck} from './grenade-effect-chat.js';

export async function mountMineAssistant(root,{dialog,runtime=globalThis}={}){
  const panel=root.querySelector('[data-mine-panel]');if(!panel)return null;
  const rt=runtime,game=rt.game,user=game.user,catalogs=rt.OleGURPSQOL?.catalogs;await catalogs?.load();
  let draft={id:'tmi35',theatre:true,actorId:'',bodyId:'hand64',payloadId:'he',tl:9,facing:0,place:'',heightFeet:'',groundElevationFeet:0,...user.getFlag(MINE_SCOPE,'minePreferences')};
  let selected=null,targets=[],busy=false,closed=false,picker=null,atmosphere='normal',layoutPending=false;const expanded=new Set();
  function fitWindow(){
    if(layoutPending)return;layoutPending=true;
    rt.requestAnimationFrame(()=>{layoutPending=false;if(closed)return;const element=dialog.element;if(!element?.getBoundingClientRect)return;
      const r=element.getBoundingClientRect(),height=rt.innerHeight;
      if(r.bottom>height-10||r.top<10)dialog.setPosition({top:Math.max(10,Math.min(r.top,height-r.height-15))});
    });
  }
  const opt=(v,label,value)=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(label)}</option>`;
  const field=(key,label,value,type='number',attributes='')=>`<label>${esc(t(label))}<input data-mine-field="${key}" type="${type}" value="${esc(value??'')}" ${attributes}></label>`;
  const check=(key,label,value=false)=>`<label class="og-grenade-check"><span>${esc(t(label))}</span><input data-mine-field="${key}" type="checkbox" ${value?'checked':''}></label>`;
  const button=(action,label,extra='')=>`<button type="button" data-mine-action="${action}" ${busy?'disabled':''} ${extra}>${esc(t(label))}</button>`;
  const selection=()=>draft.id==='ut'?{...draft,tl:Number(draft.tl)}:{id:draft.id};
  const profile=()=>{try{return resolveMine(selection(),catalogs);}catch{return null;}};
  const events=()=>readMines(rt).events.filter(e=>canManageMine(e,user,rt));
  const active=()=>events().find(e=>e.id===selected);
  const actorOptions=value=>opt('',t('None'),value)+game.actors.filter(a=>a.isOwner).map(a=>opt(a.id,a.name,value)).join('');
  function capture(){
    for(const input of panel.querySelectorAll('[data-mine-field]'))draft[input.dataset.mineField]=input.type==='checkbox'?input.checked:input.value;
    for(const element of panel.querySelectorAll('[data-mine-target]')){
      const target=targets[Number(element.dataset.mineTarget)];if(!target)continue;
      for(const input of element.querySelectorAll('[data-target-field]')){
        const key=input.dataset.targetField,value=input.type==='checkbox'?input.checked:input.type==='number'?(input.value===''?'':Number(input.value)):input.value;
        if(key.startsWith('effect.'))(target.effect??={})[key.slice(7)]=value;else target[key]=value;
      }
    }
    atmosphere=panel.querySelector('[data-mine-atmosphere]')?.value??atmosphere;
    for(const details of panel.querySelectorAll('details[data-mine-details]'))details.open?expanded.add(details.dataset.mineDetails):expanded.delete(details.dataset.mineDetails);
  }
  const targetField=(key,label,value,type='number')=>`<label>${esc(t(label))}<input data-target-field="${key}" type="${type}" value="${esc(value??'')}" ${type==='number'?'step="any"':''}></label>`;
  const targetCheck=(key,label,value=false)=>`<label class="og-grenade-check"><span>${esc(t(label))}</span><input data-target-field="${key}" type="checkbox" ${value?'checked':''}></label>`;
  function effectHTML(p,target){
    const e=p.payloadEffect;if(!e)return '';const actor=game.actors.get(target.actorId);
    const defaults=grenadeHasCheck(p)&&actor?grenadeProtection(p,actor).choices:{};
    const v=target.effect={...defaults,...target.effect};
    let html=targetCheck('effect.exposed','Exposed',v.exposed!==false)+targetCheck('effect.protected','Protected',v.protected)+targetCheck('effect.immune','Immune',v.immune);
    if(e.chemical?.checks?.length)html+=`<p>${e.chemical.checks.map(c=>esc(c.label)).join(' · ')}</p>`;
    if(['strobe','warbler','flare'].includes(e.family))html+=targetCheck('effect.protectedSense','ProtectedSense',v.protectedSense);
    if(e.family==='strobe')html+=targetCheck('effect.epilepsy','Epilepsy',v.epilepsy);
    if(e.family==='warbler')html+=targetField('effect.elapsedSeconds','Elapsed',v.elapsedSeconds??0);
    if(e.family==='flare')html+=targetCheck('effect.darkness','Dark',v.darkness)+targetCheck('effect.contact','DirectContact',v.contact);
    if(e.family==='emp')html+=targetCheck('effect.electrical','Electrical',v.electrical)+targetField('effect.dr','DR',v.dr??0);
    if(['psi_bomb','message_psi_bomb','terror_psi_bomb'].includes(e.family))html+=targetField('effect.mindShield','MindShield',v.mindShield??0)+targetCheck('effect.digitalMind','Digital',v.digitalMind);
    if(e.family==='terror_psi_bomb')html+=targetField('effect.fearValue','Fear',v.fearValue??'');
    if(e.family==='vortex')html+=targetCheck('effect.gravity','Gravity',v.gravity)+targetField('effect.objectExtent','Extent',v.objectExtent??'');
    if(e.family==='tangler')html+=targetField('effect.layers','Layers',v.layers??1)+targetField('effect.strandDamage','StrandDamage',v.strandDamage??0);
    if(e.components.some(c=>c.radiation))html+=targetField('effect.radiationFactor','RadiationFactor',v.radiationFactor??1);
    if(e.chemical?.id==='disassembler')html+=targetField('effect.sealedDR','SealedDR',v.sealedDR??0);
    if(['procedure','swarm'].includes(e.kind)||e.kind==='chemical'&&!e.chemical.checks.length)html+=targetCheck('effect.confirmed','ConfirmEffect',v.confirmed)+targetField('effect.note','Note',v.note??'','text');
    html+=targetField('effect.modifier','Modifier',v.modifier??0);
    return `<details><summary>${esc(t('Effect'))}</summary><div class="og-mine-grid">${html}</div><p>${esc(e.rules.join(' '))}</p></details>`;
  }
  function targetHTML(target,index,p){
    return `<section data-mine-target="${index}" class="og-mine-target"><div class="og-mine-grid">${targetField('name','Name',target.name,'text')}${targetField('distance','Distance',target.distance)}</div>
      <details data-mine-details="target-${index}" ${expanded.has('target-'+index)?'open':''}><summary>${esc(t('Details'))}</summary><div class="og-mine-grid">
      <label>${esc(t('Actor'))}<select data-target-field="actorId">${actorOptions(target.actorId)}</select></label>
      ${targetField('elevationFeet','Elevation',target.elevationFeet??'')}${targetField('sm','SM',target.sm??0)}
      <label>Bodyplan<select data-target-field="bodyplan">${['humanoid','quadruped','winged-quadruped','hexapod','winged-hexapod','centaur','avian'].map(b=>opt(b,b,target.bodyplan??'humanoid')).join('')}</select></label>
      <label>${esc(t('Posture'))}<select data-target-field="postureModifier">${[[0,'Standing'],[-2,'Prone']].map(([v,k])=>opt(v,t(k),target.postureModifier??0)).join('')}</select></label>
      ${targetField('blastCoverDR','BlastDR',target.blastCoverDR??0)}${targetField('projectileCoverDR','CoverDR',target.projectileCoverDR??0)}${targetField('coveredLocations','CoverHits',Array.isArray(target.coveredLocations)?target.coveredLocations.join(', '):target.coveredLocations??'','text')}${targetField('partialCoveredLocations','HalfCover',Array.isArray(target.partialCoveredLocations)?target.partialCoveredLocations.join(', '):target.partialCoveredLocations??'','text')}
      ${p.directed?targetCheck('inSector','Sector',target.inSector)+targetField('modifier','Modifier',target.modifier??0)+targetCheck('immobile','Immobile',target.immobile):''}
      ${p.dropAvoidsFragments?targetCheck('dropImmediately','Drop',target.dropImmediately):''}
      ${p.directed?targetField('dodged','Dodge',target.dodged??0):''}
      ${p.requiresContact?targetCheck('contact','DirectContact',target.contact):''}</div>${effectHTML(p,target)}
      <p>${esc(t('Geometry'))}</p>${targetCheck('coverChecked','Cover',target.coverChecked)}</details>${button('remove-target','Remove',`data-index="${index}"`)}</section>`;
  }
  function render(){
    if(closed)return;const p=profile(),e=active(),hidden=new Set(user.getFlag(MINE_SCOPE,'mineHiddenHistory')??[]),history=events().filter(e=>e.state==='done'&&!hidden.has(e.id));
    const payloads=minePayloads(catalogs,draft.bodyId,Number(draft.tl));
    panel.innerHTML=`<div class="og-mine-grid"><label>${esc(t('Model'))}<select data-mine-field="id">${HT_MINES.map(p=>opt(p.id,p.name,draft.id)).join('')}${opt('ut','Limpet Mine (UT147)',draft.id)}</select></label>
      <label>${esc(t('Actor'))}<select data-mine-field="actorId">${actorOptions(draft.actorId)}</select></label></div>
      ${draft.id==='ut'?`<div class="og-mine-grid"><label>${esc(t('Size'))}<select data-mine-field="bodyId">${LIMPET_BODIES.map(b=>opt(b.id,b.name,draft.bodyId)).join('')}</select></label>
      <label>${esc(t('TL'))}<select data-mine-field="tl">${[9,10,11,12].map(n=>opt(n,n,draft.tl)).join('')}</select></label>
      <label>${esc(t('Payload'))}<select data-mine-field="payloadId">${opt('', '–',draft.payloadId)}${payloads.map(v=>opt(v.id,utPayloadLabel(v),draft.payloadId)).join('')}</select></label>
      ${['biochemical_aerosol','biochemical_liquid','swarm'].includes(draft.payloadId)?`<label>${esc(t('Substance'))}<select data-mine-field="${draft.payloadId==='swarm'?'swarmType':'chemicalId'}">${opt('','–','')}${utGrenadeChoices(draft.payloadId,draft.tl).map(c=>opt(c.id,(draft.payloadId==='swarm'?utSwarmName(c.id):utChemicalName(c.id))??c.name,draft[draft.payloadId==='swarm'?'swarmType':'chemicalId'])).join('')}</select></label>`:''}
      ${['mininuke','micro_antimatter'].includes(draft.payloadId)?`<label>${esc(t('Setting'))}<select data-mine-field="setting">${opt('','–',draft.setting)}${Object.keys(payloads.find(v=>v.id===draft.payloadId)?.damage_table??{}).map(s=>opt(s,s,draft.setting)).join('')}</select></label>`:''}
      ${draft.payloadId==='message_psi_bomb'?field('message','Message',draft.message,'text'):''}${draft.payloadId==='stasis'?field('durationValue','Duration',draft.durationValue)+ '<input type="hidden" data-mine-field="durationUnit" value="minutes">':''}
      ${['biochemical_aerosol','biochemical_liquid','swarm'].includes(draft.payloadId)?field('payloadNote','Note',draft.payloadNote,'text'):''}</div>`:''}
      ${p?`<p>${esc(p.source)} · ${esc(p.blast?.formula??p.primary??p.direct?.formula??'')} ${esc(p.blast?.type??'')}${p.fragments?' ['+esc(p.fragments.formula)+']':''}${p.directed?' · '+p.directed.sector+'° · '+p.directed.maxRange+' yd · '+p.directed.pellets+' × '+p.directed.formula+'('+p.directed.divisor+') '+p.directed.type:''}</p>`:''}
      <div class="og-mine-grid">${check('theatre','Theatre',draft.theatre)}${field('place','ManualPlace',draft.place,'text')}${p?.burstHeightFeet===null?field('heightFeet','Height',draft.heightFeet):p?'<p>'+esc(t('Height'))+': '+p.burstHeightFeet+'</p>':''}
      ${p?.directed?field('facing','Facing',draft.facing):''}${!draft.theatre?field('groundElevationFeet','GroundElevation',draft.groundElevationFeet):''}</div>
      ${p?.burstHeightFeet===null?'<p>'+esc(t('HeightUnknown'))+'</p>':''}
      ${button(draft.theatre?'place':'pick',draft.theatre?'Place':'Pick',p?'':'disabled')}
      <h4>${esc(t('Devices'))}</h4>${events().filter(e=>e.state!=='done').map(e=>`<div class="og-mine-device"><span>${esc(e.profile.name)} · ${esc(e.place||(!e.theatre?(game.scenes.get(e.map?.sceneId)?.name??t('Map')):t('Theatre')))}${e.profile.directed?' · '+e.facing+'°':''}</span>${button('select',e.state==='placed'?'Detonate':'Resume',`data-id="${esc(e.id)}"`)}</div>`).join('')||'<p>'+esc(t('Empty'))+'</p>'}
      ${e?`<section class="og-mine-resolution"><h4>${esc(e.profile.name)}</h4>${e.state==='placed'?`<label>${esc(t('Atmosphere'))}<select data-mine-atmosphere>${(e.profile.payloadEffect?['normal','very-thin','trace','vacuum']:['normal','trace','vacuum','water']).map(v=>opt(v,t({normal:'Normal','very-thin':'Thin',trace:'Trace',vacuum:'Vacuum',water:'Water'}[v]),atmosphere)).join('')}</select></label>
      ${targets.map((target,i)=>targetHTML(target,i,e.profile)).join('')}<div class="og-mine-grid">${button('add-target','Add')}${!e.theatre?button('scan','Scan'):''}</div>${button('confirm','Confirm')}`:
      `<p>${esc(t('Recovery'))}</p>${e.result?mineResultHTML(e):''}${button('resume','Resume')}${user.isGM?`<label>${esc(t('RecoveryNote'))}<input data-recovery-note></label>${[...(e.state==='calculating'?[{key:'calculation',state:'resolving'}]:e.receipts)].filter(r=>r.state==='resolving').map(r=>`<div>${esc(r.key)}${button('recover','Retry',`data-key="${esc(r.key)}" data-decision="retry"`)}${r.key!=='calculation'?button('recover','Done',`data-key="${esc(r.key)}" data-decision="done"`):''}</div>`).join('')}`:''}`}${button('cancel','Cancel')}</section>`:''}
      <details data-mine-details="history" ${expanded.has('history')?'open':''}><summary>${esc(t('History'))} (${history.length})</summary>${button('clear','Clear')}${history.map(e=>`<details><summary>${esc(e.profile.name)} – ${esc(e.initiatorName)} · ${esc(e.result.targets.map(t=>t.target.name).join(', '))}</summary>${mineResultHTML(e)}</details>`).join('')}</details>`;
    fitWindow();
  }
  async function run(action,element={dataset:{}}){
    capture();if(busy)return;busy=true;
    try{
      if(['place','pick'].includes(action)){
        let map=null;
        if(action==='pick'){
          const m=await import('./grenade-map.js');picker=new AbortController();map=await m.pickGrenadePoint({runtime:rt,signal:picker.signal});picker=null;if(!map)return;
          map.groundElevationFeet=Number(draft.groundElevationFeet);
        }
        if(profile().burstHeightFeet===null&&draft.heightFeet==='')throw Error(t('HeightUnknown'));
        await requestMineOperation('place',null,{selection:selection(),actorId:draft.actorId||null,theatre:action==='place',map,place:draft.place,facing:Number(draft.facing),heightFeet:profile().burstHeightFeet??Number(draft.heightFeet)},rt);
        await user.setFlag(MINE_SCOPE,'minePreferences',structuredClone(draft));
      }
      if(action==='select'){selected=element.dataset.id;targets=[];}
      if(action==='add-target')targets.push({id:String(targets.reduce((n,t)=>Math.max(n,Number(t.id)||0),0)+1),name:'',distance:'',elevationFeet:'',coverChecked:false,inSector:false});
      if(action==='remove-target')targets.splice(Number(element.dataset.index),1);
      if(action==='scan'){const m=await import('./mine-map.js');targets=m.mineMapTargets(active(),rt);}
      if(action==='confirm'){await requestMineOperation('detonate',selected,{targets,atmosphere},rt);selected=null;targets=[];}
      if(action==='resume'){await requestMineOperation('resume',selected,{},rt);selected=null;targets=[];}
      if(action==='recover'){await requestMineOperation('recover',selected,{key:element.dataset.key,decision:element.dataset.decision,note:panel.querySelector('[data-recovery-note]')?.value??''},rt);}
      if(action==='cancel'){selected=null;targets=[];}
      if(action==='clear')await user.setFlag(MINE_SCOPE,'mineHiddenHistory',[...new Set([...(user.getFlag(MINE_SCOPE,'mineHiddenHistory')??[]),...events().filter(e=>e.state==='done').map(e=>e.id)])]);
    }finally{busy=false;render();}
  }
  panel.addEventListener('click',async click=>{const b=click.target.closest('[data-mine-action]');if(!b)return;click.preventDefault();click.stopPropagation();try{await run(b.dataset.mineAction,b);}catch(error){rt.ui.notifications.error(error.message);}});
  panel.addEventListener('change',event=>{capture();if(['id','bodyId','tl','payloadId','theatre','chemicalId','swarmType','setting'].includes(event.target.dataset.mineField))render();});
  const hooks=[['updateSetting',rt.Hooks.on('updateSetting',setting=>{if(setting.key===MINE_SCOPE+'.placedMines'){capture();render();}})]];
  const originalClose=dialog.close.bind(dialog);dialog.close=async function(...args){closed=true;picker?.abort();for(const [name,id]of hooks)rt.Hooks.off(name,id);return originalClose(...args);};
  const controller={run,refresh:render,get draft(){return structuredClone(draft);},select(value){capture();Object.assign(draft,value);render();},get targets(){return structuredClone(targets);},setTargets(value){targets=structuredClone(value);render();},get selected(){return selected;}};
  dialog.mines=controller;render();return controller;
}
