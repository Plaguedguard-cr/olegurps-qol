import { generateId } from '../random-id.js';
import { withActorResourceWrite } from './actor-resource-writes.js';
import { grenadeSkills, grenadeRange, grenadeCheck, grenadeScatter, grenadeLanding,grenadeDirectionLabel } from './grenade-rules.js';
import { HAND_GRENADES, resolveHandGrenade } from './grenade-catalog.js';
import { applyInventoryOperation, validateInventory } from './ammo-inventory.js';
import {canonicalizeGrenadeChat} from './ut-nomenclature.js';

export const GRENADE_FLAG='handGrenades';
export const grenadeActualPoint=event=>event.correction?event.correction.landing:event.defense?event.defense.landing:event.landing??null;
export const grenadeActualPlace=event=>event.correction?.place??event.defense?.place??event.place??'';
const scope='olegurps-qol',copy=value=>structuredClone(value);
const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id);
const owner=actor=>{if(!actor?.isOwner)throw Error('Нужны права владельца персонажа.');};
const context=runtime=>({world:Number(runtime.game?.time?.worldTime??0),combat:runtime.game?.combat?.started?runtime.game.combat.id:null,round:runtime.game?.combat?.started?Number(runtime.game.combat.round??0):0});
export function readGrenades(actor) { return copy(actor?.getFlag(scope,GRENADE_FLAG)??{version:1,clock:{elapsed:0,...context(globalThis)},events:[]}); }
const timedFuse=f=>['time','smart-time'].includes(f.mode)||f.mode==='anti-tamper'&&f.tamperMode==='smart-time';
function fuseParameters(profile,{fuseMode='time',delay=null,smart=false,tamperMode='command'}={}) {
  if(!profile.fuse.modes.includes(fuseMode))throw Error('Этот взрыватель не предусмотрен для гранаты.');
  if(smart&&profile.book!=='UT'||profile.book==='UT'&&fuseMode!=='time'&&!smart)throw Error('Для программируемого режима нужна явно выбранная Smart Grenade.');
  if(fuseMode==='anti-tamper'&&!['command','smart-time'].includes(tamperMode))throw Error('Выберите команду или таймер для защиты от вмешательства.');
  const timed=timedFuse({mode:fuseMode,tamperMode}),seconds=timed?(delay===null?profile.fuse.delays[0]??null:Number(delay)):null;
  if(fuseMode==='time'&&!profile.fuse.delays.includes(seconds)||timed&&fuseMode!=='time'&&(!Number.isInteger(seconds)||seconds<0||seconds>profile.fuse.maxDelay))throw Error('Недопустимая штатная задержка.');
  return {mode:fuseMode,delay:seconds,...(fuseMode==='anti-tamper'?{tamperMode}:{})};
}
const sameProgram=(a,b)=>!!a&&JSON.stringify(a)===JSON.stringify(b);
export function grenadeReadyStep(event){
  if((event.configurationReadyDone??0)<(event.profile.configurationReady??0))return {kind:'payload-ready',done:event.configurationReadyDone??0,total:event.profile.configurationReady};
  if(event.programming){
    if(!event.preparation?.drawn)return {kind:'draw-ready',done:0,total:1};
    if(event.fuse.mode==='time'&&!event.preparation?.pinPulled)return {kind:'pin-ready',done:0,total:1};
    if(event.fuse.mode!=='time'&&!event.preparation?.activated)return {kind:'activation-ready',done:0,total:1};
    if(event.programming.needsReprogramming)return {kind:'program-ready',done:event.programming.readyDone,total:3};
    return null;
  }
  return {kind:'arming-ready',done:event.armingReady??0,total:event.fuse.ready};
}
function clockSync(state,runtime) {
  const next=context(runtime),old=state.clock;
  // GURPS rounds last one second. Changes of combatant within a round add nothing.
  const elapsed=next.combat ? next.combat===old.combat?Math.max(0,next.round-old.round):0 : old.combat?0:Math.max(0,next.world-old.world);
  state.clock={elapsed:old.elapsed+elapsed,...next,
    world:next.combat===old.combat?Math.max(old.world,next.world):next.world,
    round:next.combat&&next.combat===old.combat?Math.max(old.round,next.round):next.round};
}
function setDetonation(event,state,reason) {
  if(event.detonation)return false;
  if(!['armed','waiting'].includes(event.state))throw Error('Сначала взведите и примените гранату.');
  const held=event.state==='armed';
  event.state='detonated';event.history.push({state:'detonated',at:state.clock.elapsed,reason});
  event.detonation={at:state.clock.elapsed,reason,profile:copy(event.profile),landing:held?null:copy(grenadeActualPoint(event)),
    place:held?'В руке персонажа':grenadeActualPlace(event)||'Место не установлено'};
  return true;
}
function due(state) { for(const event of state.events)if(['armed','waiting'].includes(event.state)&&Number.isFinite(event.dueAt)&&event.dueAt<=state.clock.elapsed)setDetonation(event,state,'time'); }
export function grenadeInventory(actor) {
  const resources=actor?.getFlag('world','gurpsAmmoManager');
  return (resources?.weapons??[]).flatMap(weapon=>{
    const profile=HAND_GRENADES.find(p=>p.modeId&&(weapon.standaloneModeId??weapon.catalogModeId)===p.modeId);
    if(!profile)return [];
    if(readGrenades(actor).events.some(e=>e.inventory?.weaponId===weapon.id&&(e.resourcePending||e.state==='resolving')))return [];
    if(weapon.ammunitionReview)return [];
    const inventory=weapon.ammunitionInventory;
    if(inventory){if(!validateInventory(inventory,weapon.id))return [];
      return inventory.stocks.filter(s=>s.rounds>0).map(s=>({weaponId:weapon.id,stockKey:s.key,profileId:profile.id,quantity:s.rounds,name:weapon.name??profile.name}));}
    const loose=Number(weapon.totalAmmo)-(weapon.magazines??[]).reduce((n,v)=>n+Number(v),0);
    return Number.isSafeInteger(loose)&&loose>0?[{weaponId:weapon.id,stockKey:null,profileId:profile.id,quantity:loose,name:weapon.name??profile.name}]:[];
  });
}
export class GrenadeService {
  constructor(actor,{catalogs=globalThis.OleGURPSQOL?.catalogs,runtime=globalThis}={}){this.actor=actor;this.catalogs=catalogs;this.runtime=runtime;}
  async change(operation){owner(this.actor);return withActorResourceWrite(this.actor,async()=>{owner(this.actor);const state=readGrenades(this.actor);clockSync(state,this.runtime);due(state);const result=await operation(state);await this.actor.setFlag(scope,GRENADE_FLAG,state);return copy(result??state);});}
  prepare({selection,theatre=true,inventory=null,fuseMode='time',delay=null,place='',map=null,smart=false,programming='now',tamperMode='command'}={}) {
    return this.change(state=>{
      const profile=resolveHandGrenade(selection,this.catalogs);
      const limit=this.actor.getFlag(scope,'campaignTL');
      if(limit!==undefined&&limit!==null&&limit!==''&&Number.isFinite(Number(limit))&&profile.tl!==null&&profile.tl>Number(limit))throw Error('ТУ гранаты выше ТУ кампании персонажа.');
      const parameters=fuseParameters(profile,{fuseMode,delay,smart,tamperMode});
      if(!['now','prior'].includes(programming))throw Error('Выберите способ программирования.');
      if(inventory&&!grenadeInventory(this.actor).some(i=>i.weaponId===inventory.weaponId&&i.stockKey===inventory.stockKey&&i.profileId===profile.id))throw Error('Инвентарная граната отсутствует или изменилась.');
      const id=generateId(this.runtime,{preferFoundry:true});if(!safeId(id))throw Error('Некорректный идентификатор гранаты.');
      const event={id,actorId:this.actor.id,userId:this.runtime.game.user.id,profile:copy(profile),selection:copy(selection),theatre:!!theatre,
        inventory:inventory?copy(inventory):null,fuse:{...parameters,smart,ready:profile.ready},
        state:'prepared',dueAt:null,spent:0,place:String(place),map:theatre?null:copy(map),history:[{state:'prepared',at:state.clock.elapsed}],adjudications:[]};
      if(smart){const needed=fuseMode!=='time',completed=needed&&programming==='prior';
        event.programming={version:1,origin:programming,completed,parameters:completed?copy(parameters):null,requested:copy(parameters),readyDone:completed?3:0,needsReprogramming:needed&&!completed,
          delayMemory:{smartDelay:fuseMode==='smart-time'?parameters.delay:2,tamperDelay:fuseMode==='anti-tamper'&&tamperMode==='smart-time'?parameters.delay:2}};
        event.preparation={drawn:false,activated:false,pinPulled:false};
      }
      state.events.push(event);return event;
    });
  }
  arm(id){return this.change(state=>{const event=state.events.find(e=>e.id===id);if(!event)throw Error('Граната не найдена.');if(event.state==='armed')return event;if(event.state!=='prepared')throw Error('Это состояние уже нельзя взвести.');
    if(event.programming){const step=grenadeReadyStep(event);if(!step)throw Error('Подготовка уже завершена.');
      if(step.kind==='payload-ready')event.configurationReadyDone=(event.configurationReadyDone??0)+1;
      if(step.kind==='draw-ready')event.preparation.drawn=true;
      if(step.kind==='pin-ready')event.preparation.pinPulled=true;
      if(step.kind==='activation-ready')event.preparation.activated=true;
      if(step.kind==='program-ready'){
        event.programming.readyDone++;
        if(event.programming.readyDone===3){event.programming.completed=true;event.programming.parameters=copy(event.programming.requested);event.programming.needsReprogramming=false;}
      }
      event.history.push({state:'prepared',kind:step.kind,ready:step.done+1,at:state.clock.elapsed});
      if(!grenadeReadyStep(event)){event.state='armed';event.history.push({state:'armed',at:state.clock.elapsed});}
      return event;
    }
    if((event.configurationReadyDone??0)<(event.profile.configurationReady??0)){event.configurationReadyDone=(event.configurationReadyDone??0)+1;event.history.push({state:'prepared',kind:'payload-ready',ready:event.configurationReadyDone,at:state.clock.elapsed});return event;}
    event.armingReady=(event.armingReady??0)+1;
    if(event.armingReady<event.fuse.ready){event.history.push({state:'prepared',kind:'arming-ready',ready:event.armingReady,at:state.clock.elapsed});return event;}
    event.state='armed';event.history.push({state:'armed',at:state.clock.elapsed});
    if(event.profile.fuse.start==='arm'&&event.fuse.mode==='time')event.dueAt=state.clock.elapsed+event.fuse.delay;return event;});}
  reconfigure(id,{fuseMode,delay=null,tamperMode='command',codeAccess=false}={}){return this.change(state=>{
    const e=state.events.find(e=>e.id===id);
    if(!e?.programming||!['prepared','armed'].includes(e.state)||e.outcome||e.detonation)throw Error('Можно менять только новую Smart Grenade до броска.');
    const p=e.programming,memoryKey=fuseMode==='anti-tamper'?'tamperDelay':'smartDelay';
    if(e.preparation.pinPulled&&fuseMode!=='time')throw Error('После извлечения обычной чеки возврат к Smart-взрывателю не автоматизирован: порядок не установлен в UT147.');
    const requested=fuseParameters(e.profile,{fuseMode,delay:delay??(fuseMode!=='time'?p.delayMemory?.[memoryKey]??null:null),tamperMode,smart:true});
    if(sameProgram(requested,p.requested))return e;
    const needs=fuseMode!=='time'&&!sameProgram(requested,p.parameters);
    if(needs&&p.completed&&codeAccess!==true)throw Error('Для перепрограммирования подтвердите доступ к коду и отсутствие блокировки команд (UT147).');
    if(timedFuse(requested)&&fuseMode!=='time'){p.delayMemory??={};p.delayMemory[memoryKey]=requested.delay;}
    p.requested=copy(requested);p.needsReprogramming=needs;p.readyDone=needs?0:p.completed?3:0;
    e.fuse={...requested,smart:true,ready:e.profile.ready};
    e.state=grenadeReadyStep(e)?'prepared':'armed';
    e.history.push({state:e.state,kind:'fuse-change',parameters:copy(requested),at:state.clock.elapsed});return e;
  });}
  cancel(id){return this.change(state=>{const e=state.events.find(e=>e.id===id);
    if(!e||!['prepared','armed'].includes(e.state)||e.state==='armed'&&!e.programming||e.outcome||e.dueAt!==null)throw Error('Нельзя отменить действующий взрыватель.');
    // Pausing the interface cannot undo a physical arming action or hide a live device.
    if(e.programming&&(e.preparation.activated||e.preparation.pinPulled)){e.paused=true;e.history.push({state:e.state,kind:'preparation-paused',at:state.clock.elapsed});}
    else {e.state='cancelled';e.history.push({state:'cancelled',at:state.clock.elapsed});}return e;
  });}
  resume(id){return this.change(state=>{const e=state.events.find(e=>e.id===id);
    if(!e?.programming||e.state!=='cancelled'&&!e.paused||e.outcome||e.detonation)throw Error('Этот экземпляр нельзя продолжить.');
    e.paused=false;e.state=grenadeReadyStep(e)?'prepared':'armed';e.history.push({state:e.state,kind:'resume',at:state.clock.elapsed});return e;
  });}
  release(id,input,{roll}={}) {
    owner(this.actor);
    return withActorResourceWrite(this.actor,async()=>{
      owner(this.actor);const state=readGrenades(this.actor);clockSync(state,this.runtime);due(state);
      const event=state.events.find(e=>e.id===id);if(!event)throw Error('Граната не найдена.');
      if(event.outcome)return copy(event);
      if(event.state!=='armed')throw Error(event.state==='resolving'?'Незавершённая операция: проверьте журнал с ведущим; автоматический повтор запрещён.':'Граната должна быть взведена и ещё не сработать.');
      const skills=grenadeSkills(this.actor,input.target);
      const st= input.st===undefined ? skills.st : Number(input.st),rangeBonus=input.rangeBonus===undefined?skills.rangeBonus:Number(input.rangeBonus);
      const range=grenadeRange({st,rangeBonus,weight:event.profile.weight,saucer:event.profile.saucer,basicLift:input.basicLift??null});
      const check=grenadeCheck({base:Number(input.base??skills.base),distance:Number(input.distance),target:input.target,modifier:Number(input.modifier??0),unfamiliar:event.profile.unfamiliar&&!input.familiar,bounce:event.profile.saucer&&input.bounce,
        handlingPenalty:event.profile.requiredST?Math.min(0,st-event.profile.requiredST):0});
      if(Number(input.distance)>range.max)throw Error('Дистанция превышает максимальную дальность метания: '+range.max+' ярд.');
      if(check.effective<3)throw Error('Эффективный навык ниже 3; бросок невозможен.');
      if(input.dodgeMargin!=null&&input.target!=='individual')throw Error('Dodge применим только к конкретной цели.');
      // Check the selected physical resource before rolling; a catalog throw never spends.
      let resources=null;
      if(event.inventory){
        const current=grenadeInventory(this.actor).find(i=>i.weaponId===event.inventory.weaponId&&i.stockKey===event.inventory.stockKey&&i.profileId===event.profile.id);
        if(!current)throw Error('Граната закончилась или инвентарь изменился.');
        resources=copy(this.actor.getFlag('world','gurpsAmmoManager'));
        const weapon=resources.weapons.find(w=>w.id===current.weaponId);
        if(current.stockKey)applyInventoryOperation(weapon,'remove-stock',{ammoKey:current.stockKey,amount:1});
        else weapon.totalAmmo-=1;
      }
      const throwerId=this.runtime.game.user.id;
      const armed=copy(event);event.state='resolving';event.check=check;
      await this.actor.setFlag(scope,GRENADE_FLAG,state); // durable intent, no blind reroll after crash
      try {
        const result=await roll(check,this.actor);
        if(result?.cancelled){Object.assign(event,armed);await this.actor.setFlag(scope,GRENADE_FLAG,state);return {cancelled:true};}
        const scatter=grenadeScatter({total:Number(result.total),skill:check.effective,distance:Number(input.distance),direction:result.direction??1,
          special:input.special===true,dodgeMargin:input.dodgeMargin==null?null:Number(input.dodgeMargin)});
        if(event.profile.molotov&&(input.target==='individual'||Number(result.total)>=12)){
          scatter.needsReview=true;scatter.yards=null;scatter.direction=null;
          scatter.reason=Number(result.total)>=12?'Malf12 B411':'Контакт Molotov B411';
        }
        event.outcome={check,scatter,range,userId:throwerId,messageId:result.messageId??null,skillLabel:String(input.skillLabel??skills.label),target:input.target,distance:Number(input.distance),facing:Number(input.facing??0)};
        event.landing=grenadeLanding({intended:input.intended??null,facing:Number(input.facing??0),scatter});
        event.place=String(input.place??event.place??'')|| (scatter.needsReview?'Место определяется ведущим':scatter.yards?`От намеченной точки: ${scatter.yards} ярд., ${grenadeDirectionLabel(scatter.direction)}`:'Намеченная точка');
        const uncertainRelease=scatter.criticalFailure||event.profile.molotov&&Number(result.total)>=12;
        event.state=scatter.needsReview?'needs-review':'waiting';event.spent=event.inventory&&!uncertainRelease?1:0;
        event.resourcePending=!!event.inventory&&uncertainRelease;
        event.history.push({state:'thrown',at:state.clock.elapsed},{state:event.state,at:state.clock.elapsed});
        if(!uncertainRelease&&event.profile.fuse.start==='release'&&timedFuse(event.fuse))event.dueAt=state.clock.elapsed+event.fuse.delay;
        if(event.fuse.mode==='impact'&&input.hardImpact&&!scatter.needsReview)setDetonation(event,state,'impact');
        due(state);
        // One Actor update persists both the immutable outcome and the one-unit debit.
        const updates={['flags.'+scope+'.'+GRENADE_FLAG]:state};
        if(resources&&!uncertainRelease)updates['flags.world.gurpsAmmoManager.weapons']=resources.weapons;
        await this.actor.update(updates);
        return copy(event);
      }catch(error){
        // Keep durable intent on uncertain outcomes, including failed persistence.
        throw error;
      }
    });
  }
  advance(seconds=0){if(!Number.isFinite(seconds)||seconds<0)throw Error('Укажите неотрицательные игровые секунды.');
    if(seconds&&this.runtime.game?.combat?.started)throw Error('В Combat время идёт по раундам; ручное продвижение доступно вне Combat.');
    return this.change(state=>{state.clock.elapsed+=seconds;due(state);});}
  trigger(id,reason='manual'){return this.change(state=>{const event=state.events.find(e=>e.id===id);if(!event)throw Error('Граната не найдена.');if(event.detonation)return event;
    if(reason==='manual'&&!this.runtime.game.user.isGM&&!['manual','command','impact','anti-tamper'].includes(event.fuse.mode))throw Error('Досрочное срабатывание подтверждает ведущий.');
    setDetonation(event,state,reason);return event;});}
  applyDodge(id,margin,{directionRoll=async()=>Number((await this.runtime.Roll.create('1d6').evaluate()).total)}={}) {
    if(!Number.isInteger(margin)||margin<0)throw Error('Укажите неотрицательный целый запас успешного Dodge.');
    return this.change(async state=>{
      const event=state.events.find(e=>e.id===id);if(!event)throw Error('Граната не найдена.');
      if(event.defense){if(event.defense.margin===margin)return event;throw Error('Dodge уже зафиксирован. Дальнейшую коррекцию оформляет ведущий.');}
      const outcome=event.outcome;
      if(event.state!=='waiting'||event.detonation||!outcome||outcome.check.area!==0||!outcome.scatter.success||outcome.scatter.criticalSuccess||event.profile.molotov||event.correction)throw Error('Для этого события нельзя автоматически применить Dodge.');
      const direction=await directionRoll();
      const scatter=grenadeScatter({total:outcome.scatter.total,skill:outcome.check.effective,distance:outcome.distance,direction,dodgeMargin:margin});
      event.defense={kind:'Dodge',source:'B414',margin,scatter,at:state.clock.elapsed,userId:this.runtime.game.user.id,
        landing:grenadeLanding({intended:event.landing,facing:outcome.facing,scatter}),
        place:grenadeActualPlace(event)+`; после Dodge: ${scatter.yards} ярд., ${grenadeDirectionLabel(scatter.direction)}`};
      event.history.push({state:'waiting',kind:'Dodge',at:state.clock.elapsed});return event;
    });
  }
  correctPosition(id,{landing=null,place=''}={}){return this.change(state=>{
    const event=state.events.find(e=>e.id===id);if(!event||event.detonation)throw Error('Можно уточнить место ещё не сработавшей гранаты.');
    if(landing&&![landing.x,landing.y].every(Number.isFinite))throw Error('Некорректные координаты.');
    if(!landing&&!String(place).trim())throw Error('Укажите место падения.');
    event.correction={landing:copy(landing),place:String(place)};
    event.adjudications.push({kind:'position',userId:this.runtime.game.user.id,...copy(event.correction),at:state.clock.elapsed});return event;
  });}
  correctExplosionPosition(id,{landing=null,place=''}={}){return this.change(state=>{
    const event=state.events.find(e=>e.id===id);if(!event?.detonation)throw Error('Место взрыва ещё не зафиксировано.');
    if(landing&&![landing.x,landing.y].every(Number.isFinite))throw Error('Некорректные координаты.');
    if(!landing&&!String(place).trim())throw Error('Укажите место взрыва.');
    // Later rulings are separate from the historical throw and detonation snapshot.
    event.calculationLocation={landing:copy(landing),place:String(place),userId:this.runtime.game.user.id,at:state.clock.elapsed};
    event.adjudications.push({kind:'explosion-position',...copy(event.calculationLocation)});return event;
  });}
  adjudicate(id,{note,landing=null,place='',released=null,resourceConfirmed=false}={}) {if(!this.runtime.game.user.isGM)throw Error('Решение подтверждает ведущий.');
    if(!String(note??'').trim())throw Error('Укажите решение ведущего.');
    return this.change(state=>{const event=state.events.find(e=>e.id===id);if(!event)throw Error('Граната не найдена.');if(event.detonation)throw Error('Историческая детонация уже зафиксирована.');
      event.adjudications.push({userId:this.runtime.game.user.id,note:String(note),landing:copy(landing),place:String(place),at:state.clock.elapsed,released});
      event.correction={landing:copy(landing),place:String(place)};
      // Uncertain resource commits require inspection; never debit automatically here.
      if(event.resourcePending||event.state==='resolving'){
        if(typeof released!=='boolean'||!resourceConfirmed)throw Error('Сверьте GGA-сообщение и фактический расход в общем инвентаре, затем подтвердите сверку. Автоматическое повторное списание запрещено.');
        event.resourcePending=false;event.spent=event.inventory&&released?1:0;
        event.state=released?'waiting':'armed';
        if(released&&event.profile.fuse.start==='release'&&['time','smart-time'].includes(event.fuse.mode))event.dueAt=(event.history.find(h=>h.state==='thrown')?.at??state.clock.elapsed)+event.fuse.delay;
      }else if(event.state==='needs-review')event.state='waiting';
      due(state);return event;});}
}
let installed=false;
export function installGrenadeHooks(runtime=globalThis) {
  if(installed)return;installed=true;
  import('./grenade-effect-chat.js').then(m=>m.installGrenadeEffectChat(runtime));
  const markerRequests=actor=>{
    if(!runtime.game.user.isGM||runtime.game.user.getFlag(scope,'grenadePreferences')?.theatre!==false)return;
    if(!Object.values(actor.getFlag(scope,'grenadeMarkerRequests')??{}).some(r=>r.state==='pending')&&!actor.getFlag(scope,GRENADE_FLAG)?.events?.some(e=>!e.theatre&&e.detonation?.profile?.payloadEffect?.radius>0))return;
    import('./grenade-map.js').then(m=>m.processGrenadeMarkerRequests(actor,runtime)).catch(e=>console.error('OleGURPS | Grenade marker',e));
  };
  runtime.Hooks.on('updateActor',markerRequests);
  runtime.Hooks.on('updateUser',()=>{for(const actor of runtime.game.actors??[])markerRequests(actor);});
  for(const actor of runtime.game.actors??[])markerRequests(actor);
  const reconcile=()=>{
    const users=[...(runtime.game.users??[])].filter(u=>u.active),gm=users.filter(u=>u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
    for(const actor of runtime.game.actors??[]){
      const state=actor.getFlag(scope,GRENADE_FLAG);if(!state?.events?.some(e=>['armed','waiting'].includes(e.state))||!actor.isOwner)continue;
      const authority=gm??users.filter(u=>actor.testUserPermission(u,'OWNER')).sort((a,b)=>a.id.localeCompare(b.id))[0];
      if(authority?.id!==runtime.game.user.id)continue;
      new GrenadeService(actor,{runtime}).advance().catch(e=>console.error('OleGURPS | Grenade reconciliation',e));
    }
  };
  for(const hook of ['updateWorldTime','updateCombat','deleteCombat','updateUser'])runtime.Hooks.on(hook,reconcile);
  const boundDamageButtons=new WeakSet();
  const bindGrenadeDamage=(message,html)=>{
    const root=html?.querySelectorAll?html:html?.[0];if(!root)return;
    canonicalizeGrenadeChat(message,root,runtime);
    const effect=message.getFlag(scope,'grenadeEffectResult');
    if(effect?.state==='done')for(const button of root.querySelectorAll?.('[data-grenade-component]')??[]){
      if(boundDamageButtons.has(button))continue;boundDamageButtons.add(button);
      button.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();if(button.disabled)return;button.disabled=true;
        try{const {applyGrenadeNativeDamage}=await import('./grenade-effects.js');await applyGrenadeNativeDamage(effect,Number(button.dataset.grenadeComponent),runtime);}catch(error){runtime.ui.notifications.error(error.message);}finally{button.disabled=false;}
      });
    }
    const damage=message.getFlag(scope,'grenadeDamage');if(!damage)return;
    const native=root.querySelector?.('[data-grenade-native]');if(!native||boundDamageButtons.has(native))return;boundDamageButtons.add(native);
    native.addEventListener('click',async event=>{
      event.preventDefault();event.stopPropagation();const button=event.currentTarget;if(button.disabled)return;button.disabled=true;
      try{
        const actor=damage.actorId?runtime.game.actors.get(damage.actorId):null;
        if(actor&&!actor.isOwner)throw Error('Нужны права владельца персонажа.');
        if(damage.actorId&&!actor)throw Error('Персонаж больше не доступен.');
        const source=actor??runtime.game.user;
        const {createGgaDamageWithEasterEgg}=await import('./damage-result-easter-egg.js');
        await createGgaDamageWithEasterEgg({DamageChat:runtime.GURPS.DamageChat,actor:source,
          args:[source,damage.formula+(damage.divisor!==1?'('+damage.divisor+')':''),damage.type,{shiftKey:false,ctrlKey:false,data:{}},null,[]]});
      }catch(error){runtime.ui.notifications.error(error.message);}finally{button.disabled=false;}
    });
  };
  // GGA's legacy render pass may rebuild message content after the HTML hook.
  for(const hook of ['renderChatMessageHTML','renderChatMessage'])runtime.Hooks.on(hook,bindGrenadeDamage);
  reconcile();
}
