import { moduleText } from '../localization.js';

// UT153-154: the fuze is selected before firing. Geometry/scatter can later consume
// this saved area-attack contract without changing HE's published damage table.
export const HE_PROXIMITY = Object.freeze({fuze:'proximity',minimumYards:40,attackBonus:4,
  damageComponent:'fragmentation',burstPoint:'manual',fragmentHits:'manual',
  scatter:'manual-margin-squared',automaticHit:false,source:'UT153-154'});
export const proximityOf = profile => profile?.damage?.rules?.heProximity ?? null;
export function proximityRangeReason(proximity, distance) {
  if(!proximity)return null;
  if(distance===null||distance===undefined||distance===''||!Number.isFinite(Number(distance)))
    return moduleText('OleGURPS.UTPayload.ProximityDistanceRequired');
  return Number(distance)<40?moduleText('OleGURPS.UTPayload.ProximityMinimum'):null;
}
export function validateProximityShot(profile) {
  const reason=proximityRangeReason(proximityOf(profile),profile?.context?.shotgun?.physicalDistance);
  if(reason)throw Error(reason);
}
