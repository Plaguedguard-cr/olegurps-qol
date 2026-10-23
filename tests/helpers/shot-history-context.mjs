import {gaussFixture} from './gauss-context.mjs';
import {createShotSnapshot} from '../../scripts/tools/attack-profile-resolver.js';
import {executePreparedGgaRoll} from '../../scripts/tools/prepared-gga-roll.js';

export function applyDocumentPatch(target,changes){
 for(const [path,value]of Object.entries(changes)){
  const keys=path.split('.');let node=target;
  for(const key of keys.slice(0,-1))node=node[key]??={};
  const key=keys.at(-1);if(key.startsWith('-='))delete node[key.slice(2)];else node[key]=structuredClone(value);
 }
}
export function hookBus(){
 let id=0;const events=new Map();return {on(name,fn){const key=++id;events.set(key,{name,fn});return key;},off(_n,key){events.delete(key);},
  callAll(name,...args){for(const e of events.values())if(e.name===name)e.fn(...args);},get size(){return events.size;}};
}
export async function historyFixture({modeId='WIAo1otMCstnbi4Dv',chemicalId=null,document=true,profileContext={}}={}){
 const f=await gaussFixture(modeId,{profileContext:{physicalDistance:1,manualGuidanceConfirmed:true,...profileContext}}),bus=hookBus();
 const metrics={track:false,copiedBytes:0,wireBytes:0,contentsReads:0,flagReads:0};
 const messages=new class extends Map{get contents(){metrics.contentsReads++;return [...this.values()];}};
 globalThis.Hooks=bus;globalThis.game.messages=messages;
 f.actor.getFlag=(s,k)=>f.flags[s]?.[k];
 if(document){f.actor.documentName='Actor';f.actor.update=async changes=>{
   if(!f.actor.isOwner&&!game.user.isGM)throw Error('Permission');
   const wire=JSON.stringify(changes);if(metrics.track)metrics.wireBytes+=Buffer.byteLength(wire);
   applyDocumentPatch({flags:f.flags},JSON.parse(wire));bus.callAll('updateActor',f.actor,changes);return f.actor;
  };}
 f.actor.setFlag=async(s,k,value)=>{
  if(!f.actor.isOwner&&!game.user.isGM)throw Error('Permission');
  const wire=JSON.stringify(value);if(metrics.track)metrics.wireBytes+=Buffer.byteLength(wire);
  (f.flags[s]??={})[k]=JSON.parse(wire);bus.callAll('updateActor',f.actor,{flags:{[s]:{[k]:value}}});return f.actor;
 };
 let choice=f.candidates().find(t=>!t.recipe);
 if(chemicalId)choice=f.candidates().find(t=>t.recipe?.parameters?.chemicalId===chemicalId||t.ammoId===chemicalId);
 await f.load(choice,Math.min(8,f.weapon().capacity));
 if(f.power()&&!f.power().externalPower)await f.battery();
 const profile=f.profile();
 const message=data=>{
  const m={...data,flags:structuredClone(data.flags??{}),id:data.id??crypto.randomUUID(),visible:true,isContentVisible:true,
   getFlag(s,k){metrics.flagReads++;return this.flags?.[s]?.[k];},
   async setFlag(s,k,v){(this.flags??={})[s]??={};this.flags[s][k]=structuredClone(v);bus.callAll('updateChatMessage',this,{flags:{[s]:{[k]:v}}});},
   async update(changes){applyDocumentPatch(this,changes);bus.callAll('updateChatMessage',this,changes);return this;}};
  messages.set(m.id,m);bus.callAll('createChatMessage',m);return m;
 };
 const runtime={game,Hooks:bus,canvas:{tokens:{placeables:[]}},GURPS:{ModifierBucket:{modifierStack:{},applyMods:async()=>[]},setLastTargetedRoll(){}},
  Roll:{create:formula=>({formula,total:10,dice:[{results:[3,3,4].map(result=>({result}))}],async evaluate(){return this;}})},
  renderTemplate:async(_p,data)=>data.followon,
  ChatMessage:{getSpeaker:()=>({actor:f.actor.id}),applyRollMode:(data,mode)=>{if(mode!=='publicroll'){data.whisper=['gm'];data.blind=mode==='blindroll';}},create:async data=>message(data)}};
 const shoot=(attackId=crypto.randomUUID(),{amount=1,execute=null}={})=>f.service.executeShot({weaponId:f.weapon().id,attackId,
  prepare:()=>({amount,profile}),execute:execute??(({profile:p})=>executePreparedGgaRoll({actor:f.actor,attack:f.attack(),attackProfile:p,
   shotSnapshot:createShotSnapshot(p,{attackId,resourceTiming:'after-attack'}),effectiveSkill:14,physicalShots:amount,effectiveRoF:amount,rcl:2,consumeAction:false,runtime}))});
 return {...f,metrics,messages,bus,message,runtime,shoot,profile:()=>profile};
}
