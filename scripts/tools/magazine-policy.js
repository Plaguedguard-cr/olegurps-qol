import {physicalRangedProfile} from '../ut-physical-ranged-source.js';
import {ltBowProfile,ltBowCapacity} from '../lt-bow-source.js';
import {ltPersonalProfile} from '../lt-personal-source.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import {utFixedFeed} from './ut-physical-feeds.js';
import {plasmaGunProfile} from '../ut-plasma-gun-source.js';
import { uawFeed } from './ut-uaw.js';
import { LEMAT } from '../ht-physical-ammunition-evidence.js';
import { LP_PROFILES } from './ut-liquid-propellant.js';
import { isStorm } from './ut-storm-feeds.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { gaussProfile } from '../ut-gauss-source.js';
// Count every object, including installed and empty containers. Legacy excess
// is valid inventory; only additions/transfers are constrained.
export function magazinePolicy(weapon){
  const compartments=utFixedFeed(weapon);
  if(compartments)return {limit:compartments.count,fixed:true,capacity:compartments.capacity};
  const modeId=weapon?.standaloneModeId??weapon?.catalogModeId;
  const early=ltEarlyProfile(modeId);if(early)return {limit:early.kind==='puckle'?10:early.places,fixed:early.kind!=='puckle',capacity:early.containerCapacity??(early.kind==='puckle'?9:1)};
  if(ltBowProfile(modeId))return {limit:1,fixed:true,capacity:ltBowCapacity(modeId,weapon.ltBow)};
  if(ltPersonalProfile(modeId))return {limit:1,fixed:true,capacity:1};
  const uaw=uawFeed(modeId);
  const fixed=modeId===LEMAT.shotModeId||weapon?.physicalResource?.detachable===false||weapon?.ammunitionFeed?.kind==='fixed';
  const lp=LP_PROFILES[modeId];
  const converted=lp&&(weapon.lpConfigured||weapon.executionVariant==='lp');
  return {limit:fixed?1:uaw||gaussProfile(modeId)?5:10,fixed,capacity:physicalRangedProfile(modeId)?.shots??plasmaGunProfile(modeId)?.shots??gaussProfile(modeId)?.feedCapacity??htPreGaussProfile(modeId)?.capacity??(isStorm(weapon)&&weapon.executionVariant!=='lp'?null:converted?
    (weapon.executionVariant==='lp'?lp.nominalCapacity:lp.baseNominal)+lp.chamber:uaw?.capacity??null)};
}
export function assertMagazineAddition(weapon,amount){
  const policy=magazinePolicy(weapon),count=weapon.ammunitionInventory?.magazines?.length??weapon.magazines?.length??0;
  if(!Number.isSafeInteger(amount)||amount<1||count+amount>policy.limit)
    throw Error(policy.fixed?'FixedFeedLimit':'MagazineLimit');
}
