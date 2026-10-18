import { uawFeed } from './ut-uaw.js';
import { LEMAT } from '../ht-physical-ammunition-evidence.js';
import { LP_PROFILES } from './ut-liquid-propellant.js';
import { isStorm } from './ut-storm-feeds.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { gaussProfile } from '../ut-gauss-source.js';
// Count every object, including installed and empty containers. Legacy excess
// is valid inventory; only additions/transfers are constrained.
export function magazinePolicy(weapon){
  const modeId=weapon?.standaloneModeId??weapon?.catalogModeId;
  const uaw=uawFeed(modeId);
  const fixed=modeId===LEMAT.shotModeId||weapon?.physicalResource?.detachable===false||weapon?.ammunitionFeed?.kind==='fixed';
  const lp=LP_PROFILES[modeId];
  const converted=lp&&(weapon.lpConfigured||weapon.executionVariant==='lp');
  return {limit:fixed?1:uaw||gaussProfile(modeId)?5:10,fixed,capacity:gaussProfile(modeId)?.feedCapacity??htPreGaussProfile(modeId)?.capacity??(isStorm(weapon)&&weapon.executionVariant!=='lp'?null:converted?
    (weapon.executionVariant==='lp'?lp.nominalCapacity:lp.baseNominal)+lp.chamber:uaw?.capacity??null)};
}
export function assertMagazineAddition(weapon,amount){
  const policy=magazinePolicy(weapon),count=weapon.ammunitionInventory?.magazines?.length??weapon.magazines?.length??0;
  if(!Number.isSafeInteger(amount)||amount<1||count+amount>policy.limit)
    throw Error(policy.fixed?'FixedFeedLimit':'MagazineLimit');
}
