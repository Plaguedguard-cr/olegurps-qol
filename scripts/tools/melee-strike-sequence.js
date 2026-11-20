import { measureTokenDistanceYards } from './fire-control-context.js';
import { techniqueIdentity } from './melee-penalty-techniques.js';
import { TargetingService } from './targeting-service.js';
import { resolveMeleeCombatCalculation } from './melee-service.js';
import { buildRandomHitLocationsHtml } from './hit-location-result.js';
import { generateId } from '../random-id.js';

const point=token=>token?.document?.getCenterPoint?.()??token?.center;
const reference=token=>({name:token.name,tokenId:token.id,actorId:token.actor.id,sceneId:token.document.parent.id,
 bodyplan:token.actor.system?.additionalresources?.bodyplan});

export function orderedWhirlwindTargets({actor,tokens=[],direction,confirmed=false,theaterNames,actors=[],runtime=globalThis}){
 if(!confirmed||!['cw','ccw'].includes(direction))throw Error('Задайте направление Whirlwind и подтвердите всех соседних противников.');
 if(!tokens.length){
  const names=String(theaterNames??'').split(';').map(s=>s.trim()).filter(Boolean);
  if(!names.length)throw Error('Укажите всех соседних противников в порядке обхода.');
  const ordered=names.map(name=>actors.filter(a=>a.visible!==false&&techniqueIdentity(a.name)===techniqueIdentity(name)));
  if(ordered.some(matching=>matching.length!==1))throw Error('Каждое имя в списке должно однозначно указывать на видимого персонажа.');
  const foes=ordered.map(([a])=>({name:a.name,actorId:a.id,tokenId:null,sceneId:null,bodyplan:a.system?.additionalresources?.bodyplan}));
  if(foes.some(foe=>foe.actorId===actor.id)||new Set(foes.map(foe=>foe.actorId)).size!==foes.length)throw Error('Противники должны быть разными, без атакующего.');
  return foes;
 }
 const controlled=runtime.canvas?.tokens?.controlled?.filter(token=>token.actor?.id===actor.id)??[];
 const available=actor.getActiveTokens?.()??[];
 const shooter=controlled.length===1?controlled[0]:available.length===1?available[0]:null;
 if(!shooter||!point(shooter))throw Error('Выберите токен атакующего для обхода по карте.');
 if(new Set(tokens.map(t=>t.id)).size!==tokens.length)throw Error('Один противник может участвовать только один раз.');
 const origin=point(shooter);
 const rotating=tokens.map(token=>{
  const distance=measureTokenDistanceYards(shooter,token,runtime),center=point(token);
  if(distance===null||distance>1||!center||!token.actor||token.id===shooter.id)throw Error('Для Whirlwind все выбранные цели должны находиться в одном ярде.');
  const angle=Math.atan2(center.y-origin.y,center.x-origin.x);
  return {target:reference(token),distance,angle};
 });
 const start=rotating[0].angle,sign=direction==='cw'?1:-1,turn=Math.PI*2;
 const inward=angle=>((sign*(angle-start))%turn+turn)%turn;
 return rotating.sort((a,b)=>inward(a.angle)-inward(b.angle)||a.distance-b.distance).map(({target,distance})=>({...target,distance}));
}

export async function buildWhirlwindSlots(snapshot,targets,direction){
 const attack=snapshot.selectedAttack;
 const stuck=attack.data?.stuck===true||(attack.meleeProfile?.motion==='swing'||/^sw/i.test(attack.sourceDamage??attack.damage))&&/\bimp\b/.test(attack.damage);
 const id=generateId();
 return Promise.all(targets.map(async (target,index)=>{
  const sequence={version:1,kind:'whirlwind',id,index,length:targets.length,name:'Whirlwind Attack',targetId:target.tokenId??target.actorId,
   target,defenseModifier:0,stuck,direction,sources:['MA89','B556–557'],definition:structuredClone(targets)};
  return {...snapshot,label:(index+1)+'. '+target.name,sequence,damageOptions:{...snapshot.damageOptions,sequence},
   targetIds:target.tokenId?[target.tokenId]:[],techniqueTargets:[target],
   targetingService:await TargetingService.create({attack,bodyplan:target.bodyplan??snapshot.targetingService.bodyplan}),
   randomLocation:false,overrideText:snapshot.overrideText,clearTargets:false,whirlwindPick:null};
 }));
}

export async function prepareWhirlwindStrike(snapshot){
 if(snapshot.sequence?.kind!=='whirlwind')return;
 if(!snapshot.whirlwindPick){
  const service=snapshot.targetingService;
  const pick=await service.resolveRandomHitLocation();
  const penalty=Number(service.table?.[pick.ggaKey]?.penalty??service.getZone(pick.zoneId)?.penalty);
  if(!Number.isFinite(penalty))throw Error('Не удалось определить штраф случайной зоны для Whirlwind.');
  snapshot.whirlwindPick={label:pick.label,penalty,zone:pick.canonicalKey,tableKey:pick.ggaKey,total:pick.total,
   html:buildRandomHitLocationsHtml([pick],{escapeHtml:globalThis.foundry.utils.escapeHTML})};
 }
 const pick=snapshot.whirlwindPick;
 const options={...snapshot.calculationOptions,targetedAttack:null,hitLocationPenalty:pick.penalty,
  hitLocationBasePenalty:pick.penalty,hitLocationLabel:'Зона попадания: '+pick.label,precisionPenalty:0,
  meleeTechniques:{...snapshot.calculationOptions.meleeTechniques,context:{...snapshot.calculationOptions.meleeTechniques.context,
    strikeTarget:snapshot.sequence.target,targetLocationKeys:[pick.zone]}}};
 const calculation=resolveMeleeCombatCalculation(options);
 if(!calculation?.metadata?.meleeTechniques?.available)throw Error(calculation?.metadata?.meleeTechniques?.errors.join(' ')??'Whirlwind недоступен.');
 snapshot.combatCalculation=calculation;
 snapshot.effectiveSkill=calculation.effectiveSkill;
 snapshot.damageOptions={...snapshot.damageOptions,techniquePlan:calculation.metadata.meleeTechniques,
  sequence:{...snapshot.sequence,location:{key:pick.tableKey,label:pick.label,total:pick.total,penalty:pick.penalty}}};
 snapshot.sequence=snapshot.damageOptions.sequence;
 snapshot.modifierDetails=calculation.modifiers.filter(m=>m.value).map(m=>({label:m.label,value:m.value}));
 snapshot.overrideText+=pick.html;
 snapshot.hitLocationLabel=pick.label;
}
