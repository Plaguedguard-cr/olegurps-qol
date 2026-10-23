import {readFile} from 'node:fs/promises';
import {gaussFixture,catalogs} from './gauss-context.mjs';
export {catalogs};
export const inventory=JSON.parse(await readFile(new URL('../../docs/audit/ut-weapons-inventory.json',import.meta.url),'utf8'));
export const sourceRows=inventory.records.filter(r=>['sonic','neural'].includes(r.implementationGroup));
export async function fixture(id,{settings=['stun']}={}){
 const f=await gaussFixture(id);
 f.hardware=async changes=>{const state=f.state();state.weapons[0].sonicNeuralHardwareRequest=changes;await f.service.saveState(state);};
 if(catalogs.getMode(id).ut_sonic_neural_source.family==='neural'&&settings)await f.hardware({neuralSettings:settings});
 return f;
}
export function nativeHarness({conditions,dialog,role='owner',total=12,actorless=false}={}){
 let sequence=0;const hooks=new Map(),calls=[],messages=[];
 const actor={id:'defender',name:'Защитник',isOwner:true,system:{attributes:{HT:{value:11}},ads:{},hitlocations:{arm:{where:'Right Arm',dr:'9'}}}},token={actor,isOwner:true};
 const rt={game:{user:{id:role,isGM:role==='gm'}},canvas:{tokens:{controlled:actorless?[]:[token]}},
  Hooks:{on:(name,fn)=>{const id=++sequence;hooks.set(id,{name,fn});return id;},off:(_name,id)=>hooks.delete(id)},
  GURPS:{lastTargetedRoll:{},parselink:()=>({action:{type:'attribute'}})},ChatMessage:{getSpeaker:()=>({actor:actor.id}),create:async data=>{messages.push(data);return data;}}};
 if(conditions)rt.__olegurpsResistanceConditions=async()=>conditions;
 if(dialog)rt.foundry={applications:{api:{DialogV2:{wait:dialog}}}};
 rt.__olegurpsNativeResistanceLoader=async()=>({doRoll:async args=>{
  calls.push(args);const final=args.origtarget+args.targetmods[0].modint;
  rt.GURPS.lastTargetedRoll={thing:args.thing,fromUser:role,actorid:actor.id,origtarget:args.origtarget,rtotal:total,finaltarget:final,margin:final-total,failure:total>final,isCritSuccess:total<=4,isCritFailure:total===18};
  const m={id:'native-'+messages.length,author:{id:role},speaker:{actor:actor.id},rolls:[{total}],flags:{},content:'<native-gga>',
   updateSource(patch){for(const[k,v]of Object.entries(patch))if(k.startsWith('flags.'))(this.flags['olegurps-qol']??={})[k.split('.').at(-1)]=v;else this[k]=v;}};
  for(const h of hooks.values())if(h.name==='preCreateChatMessage')h.fn(m);messages.push(m);
  for(const h of hooks.values())if(h.name==='createChatMessage')h.fn(m);
 }});
 return {rt,actor,token,hooks,calls,messages};
}
