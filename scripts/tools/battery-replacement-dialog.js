import { batteryText, batteryExpectation, weaponPowerProfile } from './weapon-power.js';
import { uawPowerOwner } from './ut-uaw.js';

export async function confirmBatteryReplacement({actor, weaponId, ammoService,
  DialogV2 = globalThis.foundry?.applications?.api?.DialogV2}) {
  if (actor.isOwner !== true && !globalThis.game?.user?.isGM) throw Error('Permission');
  const state=actor.getFlag('world','gurpsAmmoManager');
  const weapon = uawPowerOwner(state,state?.weapons?.find(w=>w.id===weaponId));
  const profile=weaponPowerProfile(weapon);
  if (!profile) throw Error(batteryText('NoProfile'));
  if(profile.oneShot)return null;
  const question=profile.chemical?`Установить новый полный ${profile.label.toLowerCase()}?`:profile.cells>1?
    `Заменить весь комплект из ${profile.cells} ${profile.cellSize} cell?`:batteryText('Question');
  const expectedBattery = batteryExpectation(weapon), requestId = crypto.randomUUID();
  const answer = await DialogV2.wait({
    window:{title:question},position:{width:350},modal:false,rejectClose:false,
    content:`<p>${question}</p>`+(profile.chemical||profile.standard==='HT13'?'':`<label><input type="checkbox" name="nonRechargeable"> Non-Rechargeable</label>`),
    buttons:[
      {action:'yes',label:batteryText('Yes'),callback:(_event,button)=>({
        nonRechargeable:profile.chemical||profile.standard==='HT13'?false:button.form.elements.nonRechargeable.checked})},
      {action:'no',label:batteryText('No'),default:true,callback:()=>false}
    ]
  });
  // DialogV2.wait may return the action name when a callback returns null.
  // Only the explicit typed Yes payload is a confirmed replacement.
  if (!answer || typeof answer !== 'object' || typeof answer.nonRechargeable !== 'boolean') return null;
  return ammoService.replaceBattery(weaponId,{requestId,expectedBattery,
    nonRechargeable:answer.nonRechargeable});
}
