import {resolveStandaloneSkill} from './standalone-skill-service.js';
import {executePreparedGgaRoll} from './prepared-gga-roll.js';

const skill=(actor,name,specialization,defaults=[])=>resolveStandaloneSkill({actor,record:{id:'lt-flame-preparation',equipmentSnapshot:{tech_level:'3'}},mode:{modeId:'preparation',overrides:{},snapshot:{governing_skill:{status:'resolved',skill:{name,specialization}},defaults}}});
export async function runLTFlameCheck(actor,request){
 let target,label,basis;
 if(request.kind==='pump'){
  const lp=skill(actor,'Liquid Projector','Flamethrower',[{type:'dx',modifier:-4},{type:'skill',name:'Liquid Projector',specialization:'Flamethrower',modifier:0},{type:'skill',name:'Liquid Projector',specialization:null,modifier:-4}]);
  const dx=Number(actor.system?.attributes?.DX?.value),stBased=lp.resolved&&Number.isFinite(dx)?request.averageST+lp.level-dx:null;
  target=Math.max(request.averageST,stBased??request.averageST);label='Подготовка помпы Fire-Siphon';basis={...request,stBasedLiquidProjector:stBased};
 }else{
  const fireworks=skill(actor,'Explosives/TL3','Fireworks',[{type:'iq',modifier:-5},{type:'skill',name:'Chemistry',specialization:null,modifier:-3},{type:'skill',name:'Explosives/TL3',specialization:'Fireworks',modifier:0},{type:'skill',name:'Explosives/TL3',specialization:null,modifier:-4}]);
  if(!fireworks.resolved){
   if(!['success','failure'].includes(request.manual))throw Error('Не удалось определить Explosives (Fireworks). Укажите результат отдельной ручной проверки.');
   return {rolled:true,success:request.manual==='success',manual:true,reason:fireworks.reason,source:'LT86; B194'};
  }
  target=fireworks.level;label='Перезарядка: Explosives (Fireworks)';basis={skill:fireworks.name,source:fireworks.source};
 }
 const result=await executePreparedGgaRoll({actor,token:actor.getActiveTokens?.()[0],attack:{name:label,level:target,data:{name:label,level:target}},attackProfile:{damage:{rules:{instructionOnly:true}}},
  baseSkill:target,effectiveSkill:target,baseSkillName:label,physicalShots:1,effectiveRoF:1,combatType:'skill',consumeAction:false,contextLabel:'LT86'});
 return {rolled:result.rolled===true,success:result.rollData?.failure===false,target,basis,messageId:result.message?.id??null,outcome:result.rollData??null,source:'LT86; B194'};
}
