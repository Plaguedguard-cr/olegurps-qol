// UT145-146: the missile body, warhead and sensor are distinct price terms.
export const UT_REACTIONLESS_SOURCE=Object.freeze({id:'reactionless',name:'Reactionless',min_tl:11,source_ref:'UT145',compatibility:{},superscience:true});
export function withMissileTraits(effect,facts,raw){
 const e=facts.missileEconomics;if(!e||!effect.nativeSafe)return effect;
 const rules={...effect.rules,missileEconomics:{...e}};
 const warhead=Object.hasOwn(rules,'missileWarheadCost')?rules.missileWarheadCost:rules.fillerCostUnknown?null:facts.warheadVariant?null:
  rules.costMultiplier!=null?e.warhead*rules.costMultiplier+(rules.fillerCost??0):effect.variantId==='ut_tangler'?e.warhead*2:e.warhead;
 rules.missileWarheadCost=warhead;
 const reactionless=facts.payload?.reactionless===true||!!rules.reactionless;
 rules.costPerShot=warhead==null?null:e.body*(1+(rules.manualHoming?.guidanceSurcharge??rules.manualSEFOP?.guidanceSurcharge??0))*(reactionless?2:1)+warhead;
 rules.costSource='UT145-146: missile body + sensor surcharge + separate warhead';
 const result={...effect,rules};
 if(reactionless&&!rules.reactionless){
  const range=String(effect.effectiveChanges?.range??raw.range).replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if(!range)return {...result,nativeSafe:false,status:'unresolved',reason:'Reactionless: требуется исходная дальность ½D/Max.'};
  result.effectiveChanges={...effect.effectiveChanges,range:range[1]+'/'+Number(range[2])*5};
  rules.reactionless={requiredTL:11,superscience:true,maximumMultiplier:5,halfDamageUnchanged:true,speedUnchanged:true,noBackblast:true,source:'UT145'};
 }
 return result;
}
