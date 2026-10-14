export const GYROJET_MODE='WhGAE0Z1tyyGl34FX';
export const GYROJET_AMMO='ht_13x36mm_gyrojet';
export function gyrojetRangeRule(modeId,ammoId,rawDamage,distance) {
  if(modeId!==GYROJET_MODE||ammoId!==GYROJET_AMMO||rawDamage!=='3d pi+')return null;
  if(distance===null||distance===undefined||distance===''||!Number.isFinite(Number(distance))||Number(distance)<0)
    return {source:'HT101, note 3',status:'distance-required',damageDivisor:null,halfDamage:null};
  const yards=Number(distance);
  if(yards<1)return {source:'HT101, note 3',status:'below-published-range',distanceYards:yards,damageDivisor:null,halfDamage:null};
  // Physical distances can be fractional: apply the containing seven/21-yard range, not SSRT band rounding.
  return {source:'HT101, note 3',status:'resolved',distanceYards:yards,damageDivisor:yards<=7?3:yards<=21?2:1,
    halfDamage:null,rounding:'floor',application:'native-GGA-damage-result'};
}
/** Process GGA's already rolled payload only; no dice, resources or current Actor lookup. */
export function applyGyrojetDamageResult(payload,rule,role='kinetic') {
  if(role!=='kinetic'||rule?.status!=='resolved'||![2,3].includes(rule.damageDivisor))return payload;
  if(payload.olegurpsGyrojetDivision)return payload;
  if(!Number.isFinite(payload.damage))throw Error('Урон GGA не содержит численного результата.');
  const damage=Math.floor(payload.damage/rule.damageDivisor);
  return {...payload,damage,olegurpsGyrojetDivision:{source:rule.source,divisor:rule.damageDivisor,original:payload.damage},
    explainLineTwo:`Урон на ${rule.distanceYards} ярдах: ${payload.damage} ÷ ${rule.damageDivisor} = ${damage}.`,hasExplanation:true};
}
