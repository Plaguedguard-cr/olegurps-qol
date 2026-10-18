import { lpProfile, lpText } from './ut-liquid-propellant.js';

export async function confirmLPFuelReplacement({actor,weaponId,ammoService,
  DialogV2=globalThis.foundry?.applications?.api?.DialogV2}) {
  if(actor.isOwner!==true&&!globalThis.game?.user?.isGM)throw Error('Permission');
  const weapon=actor.getFlag('world','gurpsAmmoManager')?.weapons?.find(w=>w.id===weaponId);
  if(!lpProfile(weapon))throw Error(lpText('Unsupported'));
  const expectedFuel=structuredClone(weapon.lpFuel??null),requestId=crypto.randomUUID();
  const answer=await DialogV2.wait({window:{title:lpText('Question')},position:{width:350},modal:true,rejectClose:false,
    content:`<p>${lpText('Question')}</p>`,buttons:[
      {action:'yes',label:lpText('Yes'),callback:()=>({confirmed:true})},
      {action:'no',label:lpText('No'),default:true,callback:()=>false}
    ]});
  if(!answer||typeof answer!=='object'||answer.confirmed!==true)return null;
  return ammoService.replaceLPFuel(weaponId,{expectedFuel,requestId});
}
