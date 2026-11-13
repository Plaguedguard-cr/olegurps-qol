import { HAND_GRENADES, UT_GRENADE_BODIES, resolveHandGrenade, utGrenadePayloads } from './grenade-catalog.js';
import { GrenadeService, readGrenades, grenadeInventory, GRENADE_FLAG,grenadeActualPoint,grenadeActualPlace,grenadeReadyStep } from './grenade-service.js';
import { grenadeSkills, grenadeCheck, grenadeRange } from './grenade-rules.js';
import { grenText as t, escapeGrenade as esc } from './grenade-localization.js';
import { executePreparedSkillRoll } from './prepared-gga-roll.js';
import {utBodyLabel,utPayloadLabel,utGrenadeChoices,normalizeUTGrenadeSelection} from './grenade-ut.js';
import {grenadeDisplayName,grenadeDisplayProfile,utChemicalName,utSwarmName} from './ut-nomenclature.js';

const scalar=c=>c?`${c.formula}${c.divisor!==1?'('+c.divisor+')':''} ${c.type}${c.modifiers?' '+c.modifiers:''}`:'';
const fuseNames={time:'Time','smart-time':'SmartTime',command:'Command',impact:'Impact','anti-tamper':'Tamper',manual:'Manual'};
const stateNames={prepared:'Prepared',armed:'Armed',waiting:'Waiting',detonated:'Detonated','needs-review':'Review',resolving:'Resolving',cancelled:'Cancel'};
const directions=['Forward','ForwardRight','BackRight','Back','BackLeft','ForwardLeft'];
const facingNames=['North','NorthEast','SouthEast','South','SouthWest','NorthWest'];
const parameters={radius_yards:'Радиус, ярды',illumination_radius_yards:'Радиус освещения, ярды',resist:'Сопротивление',layer_bonus:'Дополнительный слой',doses:'Дозы'};
const seconds=n=>`${Number(n)} с`;
export function grenadeDelayText(profile){const f=profile.fuse;return f.delays.length?f.delays.map(seconds).join(' или '):t(f.modes.includes('impact')?'Impact':'ManualRuling');}
export function grenadeProfileHTML(profile) {
  if(!profile)return '';
  profile=grenadeDisplayProfile(profile);
  const e=profile.payloadEffect;
  const extra=e?`${e.chemical?'<p>'+esc(t('Doses'))+': '+e.chemical.doses+'; '+esc(e.chemical.brief)+'</p>':''}${e.swarm?'<p>'+esc(t('SwarmType'))+': '+esc(utSwarmName(e.swarm.id))+'; '+e.swarm.count+' × 1 '+esc(t('SquareYard'))+'. '+esc(t('StandardPower'))+': '+e.swarm.standardPowerHours+' '+esc(t('hours'))+'. '+esc(e.swarm.note)+'</p>':''}${e.setting?'<p>'+esc(t(profile.payloadId==='mininuke'?'Yield':'AntimatterMass'))+': '+esc(e.setting)+'</p>':''}${e.duration?'<p>'+esc(t('DurationValue'))+': '+e.duration.value+' '+esc(t(e.duration.unit))+'</p>':''}${e.chemical?.payloadNote?'<p>'+esc(t('PayloadNote'))+': '+esc(e.chemical.payloadNote)+'</p>':''}<p>${esc(t('Cost'))}: ${profile.cost==null?esc(t('EffectCostUnknown')):'$'+profile.cost}${profile.lc!=null?' · LC'+profile.lc:''}</p>${profile.configurationReady?'<p>'+esc(t('ConfigureYield'))+': '+profile.configurationReady+' Ready.</p>':''}`:'';
  return `<div>${esc(t('Source'))}: ${esc(profile.source)}; ${esc(profile.weight)} lb. ${esc(profile.fuse.start==='arm'?t('FuseStartArm'):t('FuseStartRelease'))}.</div>
    ${extra}
    ${profile.effects.map(e=>`<p>${esc(e)}</p>`).join('')}
    ${profile.parameters?`<dl>${Object.entries(profile.parameters).filter(([k])=>parameters[k]&&!['radius_yards','illumination_radius_yards'].includes(k)).map(([k,v])=>`<dt>${esc(parameters[k])}</dt><dd>${esc(typeof v==='object'?Object.values(v).join('; '):String(v).replace('per additional layer','за дополнительный слой'))}</dd>`).join('')}</dl>`:''}`;
}
export function grenadeResultHTML(event){
  if(!event?.outcome)return '';
  const s=event.outcome.scatter,actual=event.defense?.scatter??s;
  const settled=s.needsReview&&event.adjudications?.some(a=>a.note);
  const result=settled?t('DecisionSaved'):s.needsReview?t('Review'):s.criticalSuccess?'Критическое попадание':s.success?t('Hit'):t('Miss');
  const label=event.outcome.skillLabel??'Throwing';
  return `<strong>${esc(grenadeDisplayName(event.profile))} – ${esc(result)}</strong>
    <div>${esc(label)}: ${s.total} против ${s.skill}${!s.success&&!s.needsReview?' – промах на '+s.margin:''}</div>
    ${actual.yards?`<div>${esc(t('Scatter'))}: ${actual.yards} ярд., ${esc(t(directions[(actual.direction??1)-1]))}${event.defense?' (Dodge)':''}</div>`:''}
    <div>${esc(t('Landing'))}: ${esc(grenadeActualPlace(event))}</div>
    ${event.calculationLocation?`<div>Место взрыва: ${esc(event.calculationLocation.place)}</div>`:''}
    ${s.needsReview&&!settled?'<p>'+esc(t('ReviewHint'))+'</p>':''}`;
}

export async function mountGrenadeAssistant(root,{dialog,showCalculator,token=null}) {
  const user=game.user,catalogs=globalThis.OleGURPSQOL?.catalogs;await catalogs?.load();
  const saved=user.getFlag('olegurps-qol','grenadePreferences')??{},actors=()=>game.actors.filter(a=>a.isOwner);
  let draft={programming:'now',tamperMode:'command',smartDelay:2,codeAccess:false,theatre:saved.theatre!==false,actorId:actors()[0]?.id??'',id:'',bodyId:'hand64',payloadId:'',tl:9,target:'ground',distance:1,modifier:0,
    base:'',st:'',rangeBonus:'',fuseMode:'time',delay:2,place:'',facing:0,seconds:1,smart:false,hardImpact:false,familiar:false,bounce:false,special:false,dodgeMargin:'',chemicalId:'',swarmType:'',setting:'',message:'',durationValue:'',durationUnit:'minutes',payloadNote:'',...saved.draft};
  draft.theatre=saved.theatre!==false;
  if(draft.id==='ut')draft=normalizeUTGrenadeSelection(draft,catalogs);
  let recent=Array.isArray(saved.recent)?saved.recent.slice(0,5):[],currentId=saved.currentId??null,resultId=saved.resultId??null;
  let origin=!draft.theatre?saved.aim?.origin??null:null,targetPoint=!draft.theatre?saved.aim?.target??null:null,mapPicker=null,clearTarget=()=>{},busy=false,closed=false,picking=false,skillLabel='Throwing';
  let suspendMap=()=>{};
  if(!draft.theatre&&saved.aim){draft.distance=saved.aim.distance??1;draft.facing=saved.aim.facing??0;draft.place=saved.aim.place??'';}
  const panel=root.querySelector('[data-grenade-panel]');if(!panel)return;
  const expanded=new Set(),actor=()=>game.actors.get(draft.actorId),service=()=>new GrenadeService(actor(),{catalogs});
  const extraSelection=()=>({chemicalId:draft.chemicalId,swarmType:draft.swarmType,setting:draft.setting,message:draft.message,durationValue:draft.durationValue,durationUnit:draft.durationUnit,payloadNote:draft.payloadNote});
  const selection=()=>draft.id==='ut'?{bodyId:draft.bodyId,payloadId:draft.payloadId,tl:Number(draft.tl),...extraSelection()}:{id:draft.id};
  const profile=()=>{try{return resolveHandGrenade(selection(),catalogs);}catch{return null;}};
  const events=()=>actor()?readGrenades(actor()):{clock:{elapsed:0},events:[]};
  const find=id=>events().events.find(e=>e.id===id),current=()=>find(currentId);
  if(!['prepared','armed','resolving'].includes(current()?.state))currentId=null;
  if(currentId)resultId=null;
  else if(!Object.hasOwn(saved,'resultId'))resultId=events().events.filter(e=>e.outcome).at(-1)?.id??null;
  const val=key=>draft[key]??'';
  const input=(key,label,type='number',extra='')=>`<label>${esc(t(label))}<input data-gren-field="${key}" type="${type}" value="${esc(val(key))}" ${extra}></label>`;
  const check=(key,label)=>`<label class="og-grenade-check"><span>${esc(t(label))}</span><input data-gren-field="${key}" type="checkbox" ${draft[key]?'checked':''}></label>`;
  const option=(value,label,selected)=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`;
  const button=(action,label,disabled=false,extra='')=>`<button type="button" data-gren-action="${action}" ${disabled?'disabled':''} ${extra}>${esc(t(label))}</button>`;
  const actionButton=(action,label,event)=>button(action,label,false,`data-gren-id="${esc(event.id)}"`);
  const section=(key,label,content)=>`<details data-gren-section="${key}" ${expanded.has(key)?'open':''}><summary>${esc(t(label))}</summary>${content}</details>`;
  const recordResult=(event,group)=>event.outcome?section('event-'+group+'-'+event.id,'Result',grenadeResultHTML(event)):'';
  let writes=Promise.resolve();
  const remember=()=>{const value={theatre:draft.theatre,recent:structuredClone(recent),currentId,resultId,aim:draft.theatre?null:{origin:structuredClone(origin),target:structuredClone(targetPoint),distance:Number(draft.distance),facing:Number(draft.facing),place:draft.place},draft:{actorId:draft.actorId,id:draft.id,bodyId:draft.bodyId,payloadId:draft.payloadId,tl:Number(draft.tl),smart:draft.smart,programming:draft.programming,fuseMode:draft.fuseMode,delay:draft.delay,smartDelay:draft.smartDelay,tamperMode:draft.tamperMode,...extraSelection()}};
    writes=writes.catch(()=>{}).then(()=>user.setFlag('olegurps-qol','grenadePreferences',value));return writes;};
  function read(){for(const e of panel.querySelectorAll('[data-gren-field]'))draft[e.dataset.grenField]=e.type==='checkbox'?e.checked:e.value;}
  function skillDefaults(){const s=grenadeSkills(actor(),draft.target);draft.base=Number.isFinite(s.base)?s.base:'';draft.st=Number.isFinite(s.st)?s.st:'';draft.rangeBonus=s.rangeBonus;skillLabel=s.label;}
  function checkData(){const p=current()?.profile??profile();return grenadeCheck({base:Number(draft.base),distance:Number(draft.distance),target:draft.target,modifier:Number(draft.modifier),unfamiliar:p?.unfamiliar&&!draft.familiar,bounce:p?.saucer&&draft.bounce,handlingPenalty:p?.requiredST?Math.min(0,Number(draft.st)-p.requiredST):0});}
  function summary(){try{if(!actor())return t('NoActor');if(draft.base===''||draft.st==='')return 'Укажите навык и ST для расчёта.';if(!profile())return t('Choose');
    const c=checkData(),delta=c.effective-c.base;return `${t('Effective')}: ${c.effective} (${delta>=0?'+':''}${delta}) · область ${c.area>=0?'+':''}${c.area}, дальность ${c.range}${c.modifier?', условия '+c.modifier:''}`;
  }catch{return t('NoActor');}}
  async function tokenContext(explicit=token){
    if(draft.theatre)return;
    const map=await import('./grenade-map.js');
    if(draft.theatre||closed)return;
    map.installGrenadeMapHooks(globalThis);
    suspendMap=map.setGrenadeMapSuspended;suspendMap(false);
    const source=explicit??globalThis.canvas?.tokens?.controlled?.[0];
    const position=map.grenadeTokenOrigin(source);
    if(position&&game.actors.get(position.actorId)?.isOwner){
      if(position.actorId!==draft.actorId){currentId=null;resultId=null;targetPoint=null;draft.inventory=null;clearTarget();clearTarget=()=>{};}
      if(targetPoint&&targetPoint.sceneId!==position.sceneId){targetPoint=null;clearTarget();clearTarget=()=>{};}
      origin=position;draft.actorId=position.actorId;draft.facing=position.facing;skillDefaults();
      if(targetPoint)draft.distance=map.measureGrenadeDistance(origin,targetPoint);
    }
  }
  function selectorHTML(p){
    const filter=String(draft.search??'').toLowerCase(),matches=name=>name.toLowerCase().includes(filter),limit=actor()?.getFlag('olegurps-qol','campaignTL');
    const allowed=p=>limit==null||limit===''||p.tl==null||p.tl<=Number(limit);
    const item=(value,name)=>`<button type="button" data-gren-action="choose" data-gren-value="${esc(value)}">${esc(name)}</button>`;
    const group=(label,rows)=>rows.length?`<strong>${esc(t(label))}</strong>${rows.join('')}`:'';
    const last=recent.flatMap((s,i)=>{try{const p=resolveHandGrenade(s,catalogs);return allowed(p)&&matches(p.name)?[item('recent:'+i,p.name)]:[];}catch{return [];}});
    const inv=grenadeInventory(actor()).filter(i=>matches(i.name)).map(i=>item('inventory:'+encodeURIComponent(JSON.stringify([i.weaponId,i.stockKey])),`${i.name} (${i.quantity})`));
    const fixed=HAND_GRENADES.filter(p=>allowed(p)&&matches(p.name)).map(p=>item(p.id,p.name));
    if(filter){
      const preferred=Number.isInteger(Number(draft.tl))?Number(draft.tl):9,seen=new Set();
      for(const tl of [preferred,...[9,10,11,12].filter(n=>n!==preferred)])for(const body of UT_GRENADE_BODIES){
        if(limit!=null&&limit!==''&&tl>Number(limit))continue;
        for(const payload of utGrenadePayloads(catalogs,body.id,tl)){
          const key=body.id+':'+payload.id;if(seen.has(key))continue;seen.add(key);
          const name=utBodyLabel(body)+' / '+utPayloadLabel(payload)+' (TL'+tl+')';if(matches(name)||matches(body.name+' '+payload.name))fixed.push(item('ut-choice:'+encodeURIComponent(JSON.stringify({bodyId:body.id,payloadId:payload.id,tl})),name));
        }
      }
    }
    if(matches('UT ручные гранаты'))fixed.push(item('ut','UT – корпус и начинка'));
    return `<details class="og-grenade-selector" data-gren-section="selector" ${expanded.has('selector')?'open':''}><summary>${esc(p?.name??t('Choose'))}</summary>
      ${currentId?'Сначала завершите подготовку или отмените её.':`${input('search','Search','search')}<div class="og-grenade-options">${group('Recent',last)}${group('Inventory',inv)}${group('Catalog',fixed)}</div>`}</details>`;
  }
  function extraHTML(){
    const id=draft.payloadId,choices=utGrenadeChoices(id,Number(draft.tl));
    let html='';
    if(['biochemical_aerosol','biochemical_liquid'].includes(id))html=`<label>${esc(t('Substance'))}<select data-gren-field="chemicalId">${option('',t('None'),draft.chemicalId)}${choices.map(f=>option(f.id,utChemicalName(f.id)+' (TL'+f.tl+(f.superscience?'^':'')+')',draft.chemicalId)).join('')}</select></label>`;
    if(id==='swarm')html=`<label>${esc(t('SwarmType'))}<select data-gren-field="swarmType">${option('',t('None'),draft.swarmType)}${choices.map(s=>option(s.id,utSwarmName(s.id)+' (TL'+s.tl+')',draft.swarmType)).join('')}</select></label>`;
    if(['mininuke','micro_antimatter'].includes(id)){const p=utGrenadePayloads(catalogs,draft.bodyId,Number(draft.tl)).find(p=>p.id===id);html=`<label>${esc(t(id==='mininuke'?'Yield':'AntimatterMass'))}<select data-gren-field="setting">${option('',t('None'),draft.setting)}${Object.keys(p?.damage_table??{}).map(s=>option(s,s.replace('kt',' '+t('Kiloton')).replace('ug',' '+t('Micrograms')),draft.setting)).join('')}</select></label>`;}
    if(id==='message_psi_bomb')html=input('message','Message','text','maxlength="2000"');
    if(id==='stasis')html=`<div class="og-grenade-row">${input('durationValue','DurationValue','number','min="1" step="1"')}<label>${esc(t('DurationUnit'))}<select data-gren-field="durationUnit">${['minutes','hours','days','years'].map(unit=>option(unit,t(unit),draft.durationUnit)).join('')}</select></label></div>`;
    const chemical=choices.find(f=>f.id===draft.chemicalId);
    if(id==='swarm'||chemical?.id==='mea'||chemical?.baseId?.startsWith('dominator'))html+=input('payloadNote','PayloadNote','text','maxlength="2000"');
    return html?`<div class="og-grenade-extra">${html}</div>`:'';
  }
  function fuseHTML(p,event){if(!p)return '';
    const f=event?.fuse??{mode:draft.fuseMode,delay:Number(draft.delay),tamperMode:draft.tamperMode},locked=!!event&&!event.programming;
    if(p.book==='UT'){
      const smart=event?.fuse.smart??draft.smart;
      const choice=`<label class="og-grenade-fuse-choice"><span>${esc(t('Fuse'))}</span><select data-gren-field="fuseMode" ${locked?'disabled':''}>${p.fuse.modes.filter(m=>m==='time'||smart).map(m=>option(m,t(fuseNames[m]),f.mode)).join('')}</select></label>`;
      const toggle=`<label class="og-grenade-check og-grenade-smart" title="UT146–147"><span>Smart Grenade</span><input data-gren-field="smart" type="checkbox" ${smart?'checked':''} ${event?'disabled':''}></label>`;
      const timed=f.mode==='time'||f.mode==='smart-time'||f.mode==='anti-tamper'&&f.tamperMode==='smart-time';
      const delay=f.mode==='time'?`<strong>${esc(seconds(p.fuse.delays[0]))}</strong>`:`<input data-gren-field="delay" type="number" value="${esc(f.delay)}" min="0" max="${p.fuse.maxDelay}" step="1" title="${esc(t('DelayBounds'))}" ${locked?'disabled':''}>`;
      const program=smart&&(!event||event.programming)&&f.mode!=='time'?`<div class="og-grenade-programming">${event?`<span>${esc(t(event.programming?.needsReprogramming?'ProgrammingPending':'ProgrammingSaved'))}${event.programming?.needsReprogramming?' '+event.programming.readyDone+'/3':''}</span>${event.programming?.completed?check('codeAccess','ProgramAccess'):''}`:`<label>${esc(t('Programming'))}<select data-gren-field="programming">${option('now',t('ProgramNow'),draft.programming)}${option('prior',t('ProgramPrior'),draft.programming)}</select></label>`}</div>`:'';
      const tamper=f.mode==='anti-tamper'?`<label class="og-grenade-tamper"><span>${esc(t('TamperBase'))}</span><select data-gren-field="tamperMode" ${locked?'disabled':''}>${option('command',t('Command'),f.tamperMode)}${option('smart-time',t('SmartTime'),f.tamperMode)}</select></label>`:'';
      return `<div class="og-grenade-fuse og-grenade-ut-fuse">${choice}${toggle}${tamper}${timed?`<label class="og-grenade-fuse-delay"><span>${esc(t('Delay')).split(',')[0]}</span><span class="og-grenade-fuse-control">${delay}</span></label>`:''}${program}</div>`;
    }
    return `<div class="og-grenade-fuse">${p.book==='UT'?`<label>${esc(t('Fuse'))}<select data-gren-field="fuseMode" ${locked?'disabled':''}>${p.fuse.modes.filter(m=>m==='time'||draft.smart||event?.fuse.smart).map(m=>option(m,t(fuseNames[m]),f.mode)).join('')}</select></label>${!locked?check('smart','Smart'):''}`:`<span>${esc(t('Fuse'))}: ${esc(t(fuseNames[f.mode]))}</span>`}
      ${f.mode==='time'?p.fuse.delays.length>1?`<div class="og-grenade-delay" role="group" aria-label="${esc(t('Fuse'))}">${p.fuse.delays.map(n=>`<label><input data-gren-delay type="radio" name="grenade-delay" value="${n}" ${n===Number(f.delay)?'checked':''} ${locked?'disabled':''}><span>${seconds(n)}</span></label>`).join('')}</div>`:`<strong>${esc(seconds(p.fuse.delays[0]))}</strong>`:
      f.mode==='smart-time'?input('delay','DelayBounds','number',`min="0" max="${p.fuse.maxDelay}" step="1" ${locked?'disabled':''}`)+`<small>0–${p.fuse.maxDelay} с; программирование: 3 Ready.</small>`:''}</div>`;
  }
  function remaining(event,clock){return event.detonation?t('Detonated'):Number.isFinite(event.dueAt)?`${t('Remaining')}: ${Math.max(0,event.dueAt-clock.elapsed)} с`:t(stateNames[event.state]??'Review');}
  function eventActions(e){const map=!draft.theatre&&!e.theatre;
    const point=e.calculationLocation?.landing??e.detonation?.landing??grenadeActualPoint(e);
    return `<div class="og-grenade-actions">${map?(point?actionButton('mark','ShowMap',e):'')+actionButton(e.detonation?'explosion-position':'position',e.detonation?'ExplosionPlace':'MoveMarker',e)+actionButton('remove-mark','RemoveMarker',e):!e.detonation?actionButton('position','ResultPlace',e):''}
      ${e.detonation?actionButton('calculate-event','Calculate',e)+(!map?actionButton('explosion-position','ExplosionPlace',e):''):''}
      ${['manual','command','impact','anti-tamper'].includes(e.fuse.mode)&&['armed','waiting'].includes(e.state)?actionButton('trigger','Trigger',e):''}
      ${e.state==='waiting'&&e.outcome?.check.area===0&&e.outcome.scatter.success&&!e.outcome.scatter.criticalSuccess&&!e.profile.molotov&&!e.defense?actionButton('dodge','ApplyDodge',e):''}</div>`;
  }
  function reviewHTML(event){if(!user.isGM||!['needs-review','resolving'].includes(event.state))return '';
    return section('review-'+event.id,'Recovered',`<div class="og-grenade-fields">${input('note','Note','text')}${input('reviewPlace','Place','text')}${event.resourcePending||event.state==='resolving'?check('released','Released')+check('resourceConfirmed','ResourceConfirmed'):''}${actionButton('correct','Correct',event)}</div>`);
  }
  function render(){if(closed)return;
    for(const d of panel.querySelectorAll('[data-gren-section]'))d.open?expanded.add(d.dataset.grenSection):expanded.delete(d.dataset.grenSection);
    if(!current()){
      const p=profile();if(p){if(p.book!=='UT')draft.smart=false;if(!p.fuse.modes.includes(draft.fuseMode))draft.fuseMode=p.fuse.modes[0];
        if(draft.fuseMode==='time'&&!p.fuse.delays.includes(Number(draft.delay)))draft.delay=p.fuse.delays[0];}
    }
    const state=events(),event=current(),p=grenadeDisplayProfile(event?.profile??profile()),result=find(resultId);
    const pending=state.events.filter(e=>!['detonated','cancelled'].includes(e.state)),history=state.events.filter(e=>e.outcome||['detonated','cancelled'].includes(e.state));
    const primary=event?.state==='prepared'?'arm':event?.state==='armed'?'throw':event?.state==='resolving'?null:'prepare';
    const configure=primary==='arm'&&(event.profile.configurationReady??0)>(event.configurationReadyDone??0);
    const step=event?.programming&&primary==='arm'?grenadeReadyStep(event):null;
    const primaryLabel=step?t({'payload-ready':'ConfigureYield','draw-ready':'DrawGrenade','pin-ready':'PullSmartPin','activation-ready':'ActivateSmart','program-ready':'ProgramReady'}[step.kind])+(step.total>1?' '+(step.done+1)+'/'+step.total:''):configure?t('ConfigureYield'):primary==='arm'?`${t('Arm')}${event.fuse.ready>1?' '+((event.armingReady??0)+1)+'/'+event.fuse.ready:''}`:t(primary==='throw'?'Throw':draft.smart?'PrepareSmart':'Prepare');
    panel.innerHTML=`${check('theatre','Theatre')}
      <label>${esc(t('Actor'))}<select data-gren-field="actorId" ${event?'disabled':''}>${option('',t('NoActor'),draft.actorId)}${actors().map(a=>option(a.id,a.name,draft.actorId)).join('')}</select></label>
      ${selectorHTML(p)}
      ${draft.id==='ut'&&!event?`<div class="og-grenade-ut"><label>${esc(t('UTBody'))}<select data-gren-field="bodyId">${UT_GRENADE_BODIES.map(b=>option(b.id,utBodyLabel(b),draft.bodyId)).join('')}</select></label>${input('tl','TL','number','min="9" max="12" step="1" title="'+esc(t('TLHint'))+'"')}<label class="og-grenade-ut-payload">${esc(t('Payload'))}<select data-gren-field="payloadId">${option('',t('None'),draft.payloadId)}${utGrenadePayloads(catalogs,draft.bodyId,Number(draft.tl)).map(p=>option(p.id,utPayloadLabel(p),draft.payloadId)).join('')}</select></label></div>${extraHTML()}`:''}
      ${p?`<div class="og-grenade-profile"><div>${esc(p.primary??(p.blast?scalar(p.blast)+' ex':'Особый эффект'))}${p.fragments?' | Осколки: '+esc(scalar(p.fragments)):''}${p.radius!=null?' | Радиус: '+p.radius+' ярд.':''}</div>
        <div>${esc(t('FuzeReady'))}: ${event?.fuse.ready??p.ready} Ready · ${esc(t('Fuse'))}: ${esc(grenadeDelayText(p))}</div>
        ${section('profile','Properties',grenadeProfileHTML(p))}</div>`:''}
      ${draft.theatre?`<div class="og-grenade-row">${input('distance','Distance','number','min="0" step="0.1"')}${input('place','Place','text')}</div>`:
        `<div class="og-grenade-map"><div class="og-grenade-row">${button('map','ChoosePoint')}${!origin?.tokenId?button('map-origin','ChooseOrigin'):''}</div>
          <small>${esc(origin?.tokenId?t('OriginToken'):origin?t('DirectionManual'):t('NoOrigin'))}</small>
          ${targetPoint?'<div>'+esc(t('PointChosen'))+' · '+Number(draft.distance)+' ярд.</div>':''}${picking?'<strong role="status">'+esc(t('PickHint'))+'</strong>':''}</div>`}
      <div class="og-grenade-row"><label>${esc(skillLabel)}<input data-gren-field="base" type="number" step="1" value="${esc(draft.base)}"></label>
        <label>${esc(t('Target'))}<select data-gren-field="target">${option('ground',t('Ground'),draft.target)}${option('individual',t('Individual'),draft.target)}</select></label></div>
      <output data-gren-effective>${esc(summary())}</output>
      ${fuseHTML(p,event)}
      ${section('conditions','Additional',`<div class="og-grenade-fields"><div class="og-grenade-row">${input('st','ST')}${input('rangeBonus','RangeBonus')}${input('modifier','Modifier','number','step="1"')}</div>
        ${!draft.theatre&&origin?.tokenId?button('map-origin','ChooseOrigin'):''}
        ${draft.theatre||!origin?.tokenId?`<fieldset class="og-grenade-facing"><legend>${esc(t('FacingChoice'))}</legend>${facingNames.map((name,i)=>`<button type="button" data-gren-action="facing" data-gren-value="${i*60}" aria-pressed="${Number(draft.facing)===i*60}" title="${esc(t(name))}"><span style="transform:rotate(${i*60}deg)">↑</span><small>${esc(t(name))}</small></button>`).join('')}</fieldset>`:''}
        ${check('special','Special')}${input('dodgeMargin','Dodge','number','min="0" step="1"')}${p?.unfamiliar?check('familiar','Familiar'):''}${p?.saucer?check('bounce','Bounce'):''}${draft.fuseMode==='impact'?check('hardImpact','Hard'):''}</div>`)}
      ${primary?`<button class="og-grenade-primary" type="button" data-gren-action="${primary}" ${!actor()||!p?'disabled':''}>${esc(primaryLabel)}</button>`:''}
      ${event?.state==='prepared'||event?.programming&&event.state==='armed'?button('cancel',event?.programming?'PausePreparation':'Cancel'):''}${event?.state==='resolving'?reviewHTML(event):''}
      ${result?.outcome?`<article class="og-grenade-result" data-gren-result>${grenadeResultHTML(result)}<small>${esc(remaining(result,state.clock))}</small>${eventActions(result)}${reviewHTML(result)}</article>`:''}
      <strong>${esc(t('ActiveOnly'))} (${pending.length})</strong><div class="og-grenade-history">${pending.slice().reverse().map(e=>`<article><strong>${esc(grenadeDisplayName(e.profile))}</strong><div>${esc(remaining(e,state.clock))}</div>${['prepared','armed','resolving'].includes(e.state)?actionButton('select','Continue',e):''}${e.id!==resultId?recordResult(e,'active')+eventActions(e)+reviewHTML(e):''}</article>`).join('')||esc(t('Empty'))}</div>
      ${section('clock','Clock',`<div class="og-grenade-row">${input('seconds','Seconds','number','min="0" step="1"')}${button('advance','Advance',!!game.combat?.started)}</div>`)}
      ${section('history','History',`<div class="og-grenade-history">${history.slice().reverse().map(e=>`<article><strong>${esc(grenadeDisplayName(e.profile))} · ${esc(t(stateNames[e.state]))}</strong>${e.state==='cancelled'&&e.programming?actionButton('resume','Continue',e):''}${recordResult(e,'history')}${eventActions(e)}</article>`).join('')||esc(t('Empty'))}</div>`)}`;
    if(busy)for(const b of panel.querySelectorAll('button'))b.disabled=true;
    const rect=dialog.element?.getBoundingClientRect();if(rect&&rect.bottom>innerHeight-10)dialog.setPosition({width:rect.width,top:Math.max(10,innerHeight-rect.height-10)});
  }
  function choose(value){if(currentId)throw Error('Завершите текущую подготовку.');resultId=null;draft.inventory=null;Object.assign(draft,{chemicalId:'',swarmType:'',setting:'',message:'',durationValue:'',durationUnit:'minutes',payloadNote:''});
    if(value.startsWith('ut-choice:'))draft={...draft,...JSON.parse(decodeURIComponent(value.slice(10))),id:'ut'};
    else if(value.startsWith('recent:')){const s=recent[Number(value.split(':')[1])];if(s)draft={...draft,...s,id:s.bodyId?'ut':s.id};}
    else if(value.startsWith('inventory:')){const [weaponId,stockKey]=JSON.parse(decodeURIComponent(value.slice(10))),i=grenadeInventory(actor()).find(i=>i.weaponId===weaponId&&i.stockKey===stockKey);if(!i)throw Error('Инвентарь изменился. Выберите гранату заново.');draft.id=i.profileId;draft.inventory=i;}
    else draft.id=value;
    const p=profile();if(p){if(p.book!=='UT')draft.smart=false;draft.fuseMode=p.fuse.modes[0];draft.delay=p.fuse.delays[0]??0;}const chooser=panel.querySelector('[data-gren-section="selector"]');if(chooser)chooser.open=false;expanded.delete('selector');
  }
  async function pick(action,event){if(draft.theatre)return;mapPicker?.abort();mapPicker=new AbortController();picking=true;render();
    try{const m=await import('./grenade-map.js');if(event&&!await m.ensureGrenadeScene(event,{active:()=>!draft.theatre&&!closed}))return;const point=await m.pickGrenadePoint({signal:mapPicker.signal});if(!point)return;
      if(action==='map-origin'){origin={...point,facing:Number(draft.facing)};}
      else if(action==='map'){targetPoint=point;clearTarget();clearTarget=m.highlightGrenadePoint(point,{name:'olegurps-grenade-target-'+user.id});draft.place='Выбранная точка на карте';}
      else {const args={landing:{x:point.x,y:point.y},place:'Уточнённая точка на карте'};
        if(point.sceneId!==event.map?.sceneId)throw Error('Сначала откройте исходную сцену гранаты.');
        if(action==='explosion-position')await service().correctExplosionPosition(event.id,args);else await service().correctPosition(event.id,args);
        if(!draft.theatre)await m.markGrenade(find(event.id));return;}
      if(origin&&targetPoint)draft.distance=m.measureGrenadeDistance(origin,targetPoint);
      await remember();
    }finally{picking=false;render();}
  }
  async function manualPlace(event,explosion=false){
    const d=new foundry.applications.api.DialogV2({window:{title:t(explosion?'ExplosionPlace':'ResultPlace')},content:`<label>${esc(t('Place'))}<input name="place" type="text" value="${esc(grenadeActualPlace(event))}"></label>`,buttons:[{action:'save',label:'Сохранить',callback:async(e,b,d)=>{const place=d.element.querySelector('[name="place"]').value;await service()[explosion?'correctExplosionPosition':'correctPosition'](event.id,{place});render();}}]},{modal:false});await d.render({force:true});
  }
  async function handoff(event){if(!event?.detonation)throw Error('Сначала зафиксируйте срабатывание гранаты.');showCalculator(event);}
  async function run(action,id,value){read();
    if(action==='select'&&find(id)?.paused)await service().resume(id);
    if(action==='resume'){await service().resume(id);action='select';}
    if(action==='choose'){choose(value);render();await remember();return;}
    if(action==='facing'){draft.facing=Number(value);if(origin&&!origin.tokenId)origin.facing=draft.facing;render();return;}
    if(action==='select'){const e=find(id);if(['prepared','armed','resolving'].includes(e?.state)){currentId=id;resultId=null;draft={...draft,...e.selection,id:e.profile.book==='UT'?'ut':e.profile.id,fuseMode:e.fuse.mode,delay:e.fuse.delay??draft.smartDelay,smart:e.fuse.smart,tamperMode:e.fuse.tamperMode??'command',codeAccess:false};}else{for(const group of ['active','history']){const key='event-'+group+'-'+id;expanded.add(key);for(const section of panel.querySelectorAll('[data-gren-section]'))if(section.dataset.grenSection===key)section.open=true;}}render();await remember();return;}
    const event=find(id??currentId??resultId);
    if(action==='map'||action==='map-origin')return pick(action);
    if(['position','explosion-position'].includes(action)){
      if(!event)throw Error('Выберите событие гранаты.');
      if(action==='position'&&event.detonation)action='explosion-position';
      return draft.theatre||event.theatre?manualPlace(event,action==='explosion-position'):pick(action,event);
    }
    if(['mark','remove-mark'].includes(action)){
      if(draft.theatre||event?.theatre)return;busy=true;render();
      try{const m=await import('./grenade-map.js');if(draft.theatre)return;
        if(!await m.ensureGrenadeScene(event,{active:()=>!draft.theatre&&!closed}))return;
        if(action==='mark'){if(!await m.markGrenade(event))ui.notifications.warn(t('PermissionMark'));else if(!draft.theatre)await m.focusGrenade(event);}
        else if(!await m.removeGrenadeMarker(event))ui.notifications.warn(t('MarkerAbsent'));
      }finally{busy=false;render();}return;
    }
    if(action==='calculate-event'||action==='calculate')return handoff(event);
    if(!actor())throw Error(t('NoActor'));if(action==='prepare')resultId=null;busy=true;render();
    try{
      if(action==='prepare'){
        const e=await service().prepare({selection:selection(),theatre:draft.theatre,inventory:draft.inventory??null,fuseMode:draft.fuseMode,delay:Number(draft.delay),smart:draft.smart,programming:draft.programming,tamperMode:draft.tamperMode,place:draft.place,
          map:draft.theatre?null:origin?{...origin,origin:structuredClone(origin)}:targetPoint});
        currentId=e.id;recent=[selection(),...recent.filter(s=>JSON.stringify(s)!==JSON.stringify(selection()))].slice(0,5);await remember();
      }
      if(action==='arm')await service().arm(currentId);
      if(action==='cancel'){await service().cancel(currentId);currentId=null;await remember();}
      if(action==='throw'){
        if(draft.base===''||draft.st==='')throw Error('Укажите достоверные навык и ST для броска.');
        if(!draft.theatre&&(!origin||!targetPoint||origin.sceneId!==targetPoint.sceneId))throw Error(t('NoMapPoint'));
        if(!draft.theatre&&origin.sceneId!==current()?.map?.sceneId)throw Error('Место подготовки изменилось. Продолжите на исходной сцене.');
        const e=await service().release(currentId,{base:Number(draft.base),st:Number(draft.st),rangeBonus:Number(draft.rangeBonus),distance:Number(draft.distance),target:draft.target,modifier:Number(draft.modifier),skillLabel,
          special:draft.special,dodgeMargin:draft.dodgeMargin===''?null:Number(draft.dodgeMargin),facing:Number(draft.facing),place:draft.place,
          intended:draft.theatre?null:{x:targetPoint.x,y:targetPoint.y},familiar:draft.familiar,bounce:draft.bounce,hardImpact:draft.hardImpact},
          {roll:async(c,a)=>{
            const messages=Object.create(ChatMessage);messages.create=ChatMessage.create.bind(ChatMessage);messages.getSpeaker=()=>({actor:a.id,alias:a.name});
            if(ChatMessage.applyMode)messages.applyMode=ChatMessage.applyMode.bind(ChatMessage);if(ChatMessage.applyRollMode)messages.applyRollMode=ChatMessage.applyRollMode.bind(ChatMessage);
            const result=await executePreparedSkillRoll({actor:a,baseSkill:c.base,effectiveSkill:c.effective,skillLabel,marginLink:true,modifierDetails:[{label:'Область B414',value:c.area},{label:'Дистанция B550',value:c.range},{label:'Условия броска',value:c.modifier+c.unfamiliar+c.bounce+c.handlingPenalty}],runtime:{Roll,game,ChatMessage:messages,renderTemplate,CONFIG,ui}});
            return {total:result.roll.total,direction:result.roll.total>=17||result.roll.total>c.effective||draft.dodgeMargin!==''?(await Roll.create('1d6').evaluate()).total:1,messageId:result.message?.id};
          }});
        if(e.cancelled)return;
        if(!draft.theatre){clearTarget();clearTarget=()=>{};targetPoint=null;}
        resultId=e.id;currentId=null;await remember();
        if(!draft.theatre&&!e.theatre&&e.landing){try{const m=await import('./grenade-map.js');if(!draft.theatre)await m.markGrenade(e);}catch{ui.notifications.warn(t('PermissionMark'));}}
        if(e.outcome)await ChatMessage.create({speaker:{actor:actor().id,alias:actor().name},content:grenadeResultHTML(e),flags:{'olegurps-qol':{grenadeEventId:e.id,grenadeActorId:actor().id}}});
      }
      if(action==='advance')await service().advance(Number(draft.seconds));
      if(action==='trigger')await service().trigger(event.id);
      if(action==='correct')await service().adjudicate(event.id,{note:draft.note,place:draft.reviewPlace||grenadeActualPlace(find(event.id)),landing:draft.theatre||event.theatre?null:grenadeActualPoint(find(event.id)),released:draft.released,resourceConfirmed:draft.resourceConfirmed});
      if(action==='dodge'){if(draft.dodgeMargin===''){const section=panel.querySelector('[data-gren-section="conditions"]');if(section)section.open=true;expanded.add('conditions');throw Error('Введите запас успешного Dodge в дополнительных условиях.');}const e=await service().applyDodge(event.id,Number(draft.dodgeMargin));if(!draft.theatre&&!e.theatre){const m=await import('./grenade-map.js');if(!draft.theatre)await m.markGrenade(e);}}
    }finally{busy=false;render();}
  }
  panel.addEventListener('input',e=>{const key=e.target.dataset.grenField;if(!key||key==='theatre')return;read();if(key==='search'){const start=e.target.selectionStart;expanded.add('selector');render();const f=panel.querySelector('[data-gren-field="search"]');f?.focus();f?.setSelectionRange(start,start);}else{const out=panel.querySelector('[data-gren-effective]');if(out)out.textContent=summary();}});
  panel.addEventListener('change',async e=>{try{
    if(e.target.hasAttribute('data-gren-delay')){draft.delay=Number(e.target.value);return;}
    const key=e.target.dataset.grenField;if(!key)return;
    if(key==='theatre'){if(e.target.checked)suspendMap(true);mapPicker?.abort();clearTarget();clearTarget=()=>{};origin=null;targetPoint=null;}
    read();
    if(key==='delay')draft.smartDelay=Number(draft.delay);
    if(['fuseMode','tamperMode'].includes(key)&&(draft.fuseMode==='smart-time'||draft.fuseMode==='anti-tamper'&&draft.tamperMode==='smart-time'))draft.delay=draft.smartDelay;
    if(current()?.programming&&['fuseMode','delay','tamperMode'].includes(key)){
      try{await service().reconfigure(currentId,{fuseMode:draft.fuseMode,delay:key==='delay'?draft.delay:null,tamperMode:draft.tamperMode,codeAccess:draft.codeAccess});}
      catch(error){const e=current();draft.fuseMode=e.fuse.mode;draft.delay=e.fuse.delay??draft.smartDelay;draft.tamperMode=e.fuse.tamperMode??'command';render();throw error;}
    }
    if(key==='actorId'){currentId=null;resultId=null;draft.inventory=null;origin=null;targetPoint=null;clearTarget();skillDefaults();}
    if(key==='target')skillDefaults();
    if(key==='theatre'&&!draft.theatre)await tokenContext();
    if(['bodyId','tl','payloadId','chemicalId','swarmType'].includes(key)){
      if(key==='payloadId')Object.assign(draft,{chemicalId:'',swarmType:'',setting:'',message:'',durationValue:'',durationUnit:'minutes',payloadNote:'',fuseMode:'time',delay:2});
      if(['chemicalId','swarmType'].includes(key))draft.payloadNote='';
      draft=normalizeUTGrenadeSelection(draft,catalogs);
    }
    if(key==='smart'&&!draft.smart){draft.fuseMode='time';draft.delay=2;}
    render();await remember();
  }catch(e){ui.notifications.error(e.message);}});
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-gren-action]');if(!b)return;e.preventDefault();e.stopPropagation();if(busy)return;run(b.dataset.grenAction,b.dataset.grenId,b.dataset.grenValue).catch(e=>{console.error('OleGURPS | Grenades',e);ui.notifications.error(e.message);});});
  const hook=Hooks.on('updateActor',(a,c)=>{if(a.id===draft.actorId&&foundry.utils.hasProperty(c,'flags.olegurps-qol.'+GRENADE_FLAG))render();});
  const close=dialog.close.bind(dialog);dialog.close=async function(...args){closed=true;mapPicker?.abort();clearTarget();Hooks.off('updateActor',hook);await writes.catch(()=>{});return close(...args);};
  skillDefaults();await tokenContext();render();
  const controller={get draft(){return structuredClone(draft);},get origin(){return structuredClone(origin);},get target(){return structuredClone(targetPoint);},get current(){return current();},get result(){return find(resultId);},run,select(value){choose(value);render();},async setToken(next){await tokenContext(next);render();await remember();},refresh:render};dialog.grenades=controller;return controller;
}
