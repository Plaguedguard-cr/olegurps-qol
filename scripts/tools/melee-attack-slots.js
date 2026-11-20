export function getMeleeAttackSlots(options = {}) {
  const slots = baseAttackSlots(options);
  return slots.concat((options.extraAttacks ?? []).map((rank, i) => ({
    type: "ea" + (i + 1), label: "EA " + (i + 1), rapidStrike: false, extraAttack: rank
  })));
}

function baseAttackSlots({ allOutAttack = false, allOutAttackMode = "determined", rapidStrike = false,
  rapidCount = 2, techniqueSequence = null, combinationLength = 2, manualGrappleFirstAttack = false } = {}) {
  const double = allOutAttack && allOutAttackMode === "double";
  if(double&&manualGrappleFirstAttack&&!techniqueSequence&&!rapidStrike)return [{type:'aoa2',label:'Удар после захвата',rapidStrike:false}];
  if(techniqueSequence==='dualWeaponAttack'||techniqueSequence==='combination'){
    const slots=techniqueSequence==='dualWeaponAttack'?
      [{type:'dwaMain',label:'DWA 1',hand:'main',handLabel:'Основная рука',rapidStrike:false},{type:'dwaOff',label:'DWA 2',hand:'off',handLabel:'Другая рука',rapidStrike:false}]:
      Array.from({length:combinationLength===3?3:2},(_,i)=>({type:'combo'+(i+1),label:'C '+(i+1),handLabel:'Combination – шаг '+(i+1),rapidStrike:false}));
    return double?[{type:'aoa',label:'AoA',rapidStrike:false},...slots]:slots;
  }
  if (rapidStrike) {
    const strikes = Array.from({ length: rapidCount }, (_, i) =>
      ({ type: "rs" + (i + 1), label: "RS " + (i + 1), rapidStrike: true }));
    return double ? [{ type: "aoa", label: "AoA", rapidStrike: false }, ...strikes] : strikes;
  }
  if (double) return [
    { type: "aoa1", label: "AoA 1", rapidStrike: false },
    { type: "aoa2", label: "AoA 2", rapidStrike: false }
  ];
  return [{ type: "attack", label: "\u0410\u0442\u0430\u043a\u0430", rapidStrike: false }];
}
