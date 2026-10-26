import {ltPersonalProfile,ltPersonalConfiguration} from '../lt-personal-source.js';
import {resolveLTPersonalRange} from './lt-personal.js';
import {AmmoService} from './ammo-service.js';
import {readStandaloneAttack} from './standalone-attack-service.js';
import {resolveRuntimeAttackProfile,newAttackId,pendingShotSnapshot} from './attack-profile-runtime.js';
import {FireService} from './fire-service.js';
import {createFireControlContext} from './fire-control-context.js';
import {findRangeBandForDistance} from './fire-range-service.js';
import {resolveCombatCalculation} from './combat-calculation-engine.js';
import {isWeaponBondActive} from './weapon-bond-service.js';
import {installViewportBounds} from './application-viewport.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class LTPersonalProcedureApp extends foundry.applications.api.ApplicationV2{
 static DEFAULT_OPTIONS={classes:['olegurps-qol','gam-viewport-window'],window:{title:'Применение личного средства LT',resizable:true},position:{width:530,height:'auto'}};
 constructor({actor,token,weaponId,onUpdate=null}={}){super({id:'olegurps-lt-procedure-'+actor.id+'-'+weaponId});Object.assign(this,{actor,token,weaponId,onUpdate});this.service=new AmmoService(actor);this.fireService=new FireService({actor,token});this.attackId=newAttackId();this.busy=false;}
 current(){const state=this.actor.getFlag('world','gurpsAmmoManager'),weapon=state?.weapons?.find(w=>w.id===this.weaponId),p=ltPersonalProfile(weapon);
  if(!p||p.procedure==='ranged')throw Error('Процедура LT больше не доступна.');
  const attack=readStandaloneAttack(this.actor,weapon.standaloneWeaponId,p.modeId);if(!attack)throw Error('Не найдена автономная процедура LT.');
  return {state,weapon,p,attack};}
 async _prepareContext(){const c=this.current(),range=resolveLTPersonalRange({actor:this.actor,profile:c.p,configuration:ltPersonalConfiguration(c.weapon),skillLevel:c.attack.level});return {...c,range};}
 async _renderHTML({weapon,p,attack,range}){
  return `<div class="standard-form"><h3>${escape(weapon.name)}</h3><p>${p.procedure==='melee-powder'?'Ближняя атака Blowpipe +2 по B180; без Aim и штрафа дистанционной стрельбы.':'Бросок снаряжения: Throwing либо DX−3 по LT125; дальность по массе и ST, B355.'}</p>`+
   `<p>Исходное умение: ${escape(attack.level??'не определено')}; предел дистанции: ${escape(range.ready?range.maximum:'не определён')} ярд.</p>`+
   '<label>Фактическая дистанция, ярды<input type="number" name="lt-procedure-distance" min="0" step="any" value="1"></label>'+
   `<label>${p.procedure==='melee-powder'?'Модификатор условий; ветер снаружи −2 и хуже (B180)':'Модификатор условий и размера цели'}<input type="number" name="lt-procedure-modifier" step="1" value="0"></label>`+
   '<p role="status" data-lt-procedure-message></p></div><footer class="form-footer"><button type="button" data-lt-procedure-action="apply">Выполнить проверку и применить предмет</button><button type="button" data-lt-procedure-action="cancel">Отмена</button></footer>';
 }
 _replaceHTML(html,content){content.innerHTML=html;}
 _onRender(context,options){super._onRender?.(context,options);installViewportBounds(this);
  if(this.element.dataset.ltProcedureBound)return;this.element.dataset.ltProcedureBound='true';
  this.element.addEventListener('click',event=>{const b=event.target.closest('[data-lt-procedure-action]');if(!b)return;event.preventDefault();if(b.dataset.ltProcedureAction==='cancel')void this.close();else void this.apply();});}
 async apply(){
  if(this.busy)return;this.busy=true;const button=this.element.querySelector('[data-lt-procedure-action=apply]');button.disabled=true;
  try{
   const distance=Number(this.element.querySelector('[name=lt-procedure-distance]').value),manual=Number(this.element.querySelector('[name=lt-procedure-modifier]').value);
   if(!Number.isFinite(distance)||distance<0||!Number.isSafeInteger(manual))throw Error('Укажите корректную дистанцию и целый модификатор.');
   // Correctable form errors must not claim an execution ID in AmmoService.
   // The queued preparation below repeats this check against the current Actor.
   const initial=this.current(),initialRange=resolveLTPersonalRange({actor:this.actor,profile:initial.p,configuration:ltPersonalConfiguration(initial.weapon),skillLevel:initial.attack.level});
   if(!initialRange.ready)throw Error(initialRange.reason);
   if(distance>initialRange.maximum)throw Error('Дистанция превышает источниковый предел применения.');
   const result=await this.service.executeShot({weaponId:this.weaponId,attackId:this.attackId,
    prepare:({state,weapon,ammunition})=>{
     const {p,attack}=this.current();if(attack.readinessReason)throw Error(attack.readinessReason);
     const range=resolveLTPersonalRange({actor:this.actor,profile:p,configuration:ltPersonalConfiguration(weapon),skillLevel:attack.level});
     if(!range.ready)throw Error(range.reason);if(distance>range.maximum)throw Error('Дистанция превышает источниковый предел применения.');
     const combatType=p.procedure==='melee-powder'?'melee':'skill';
     const rangePenalty=p.procedure==='utility'?findRangeBandForDistance(createFireControlContext({token:this.token,fireService:this.fireService}).getRangeBands(),distance)?.penalty??0:0;
     const bond=isWeaponBondActive(this.actor,attack.weaponBondSetting??weapon.weaponBond,attack.weaponBondPerkConfirmed??weapon.weaponBondPerkConfirmed);
     const calculation=resolveCombatCalculation({combatType,actor:this.actor,attack,baseAttackLevel:attack.level,channels:[
      {id:'weaponBond',value:bond?1:0,label:'Weapon Bond',kind:'perk'},
      {id:'ammunitionConstruction',value:p.procedure==='melee-powder'?2:0,label:p.procedure==='melee-powder'?'Порошковая атака B180':'Применение снаряжения',kind:'source'},
      {id:'range',value:rangePenalty,label:'Дистанция B355',kind:'penalty'},
      {id:'manual',value:manual,label:'Условия применения',kind:'manual'},
      {id:'modifierBucket',value:this.fireService.getPreviewModifierTotal(),label:'Пул модификаторов',roll:false}
     ]});
     const profile=resolveRuntimeAttackProfile({actor:this.actor,attack,weaponId:weapon.id,state,ammunition,context:{kind:p.procedure,combatType,physicalDistance:distance,physicalShots:1,effectiveRoF:1,rcl:null,effectiveSkill:calculation.effectiveSkill,tokenId:this.token?.id??null}});
     if(!profile.damage.nativeSafe)throw Error(profile.damage.reason);
     return {profile,amount:1,attack,calculation,combatType};
    },execute:async({profile,attack,calculation,combatType})=>this.fireService.executeRangedAttack(attack,{attackProfile:profile,shotSnapshot:pendingShotSnapshot(profile,this.attackId,{resourceTiming:'after-attack'}),attackId:this.attackId,
      baseSkill:calculation.baseSkill,baseSkillName:attack.standaloneRef?.governingSkill?.name,combatCalculation:calculation,
      // Non-ranged GGA checks add the actual native bucket once, including these shared channels.
      effectiveSkill:calculation.baseSkill,combatType,physicalShots:1,effectiveRoF:1,rcl:null,rangePenalty:0,manualModifier:0,hitLocationPenalty:0,contextLabel:combatType==='melee'?'Порошковая ближняя атака, B180':'Бросок снаряжения, LT125/B355'})});
   if(result.rolled||result.duplicate){await this.onUpdate?.(result.state);await this.close();}
  }catch(error){this.element.querySelector('[data-lt-procedure-message]').textContent=error.message;globalThis.ui?.notifications?.error?.(error.message);}
  finally{this.busy=false;if(button.isConnected)button.disabled=false;}
 }
}
export async function openLTPersonalProcedure(options){
 const id='olegurps-lt-procedure-'+options.actor.id+'-'+options.weaponId,existing=foundry.applications.instances.get(id);if(existing?.rendered){existing.bringToFront();return existing;}
 const app=new LTPersonalProcedureApp(options);await app.render({force:true});return app;
}
