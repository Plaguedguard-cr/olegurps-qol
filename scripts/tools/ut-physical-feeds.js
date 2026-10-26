import {HT_TEAR_SPRAY_MODE} from './biochemical-integration.js';
import {UT_FLUID_PROFILES} from '../ut-fluid-source.js';
// Source-declared compartments in the existing ammunitionInventory, never another ledger.
const kineticVariants=new Set(['ut_aphc','ut_apds','ut_apep','ut_shotshell','ut_aphd','ut_memory_baton','ut_monochain','ut_burrow_darts','ut_biochemical_aerosol','ut_biochemical_liquid']);
export function plbRecipeAllowed(modeId,type){
 if(modeId==='WIijXG9uGZ52T0eW2'||!type?.recipe)return true;
 if(type.recipe.variantId==='ut_homing')return !type.recipe.parameters?.warheadVariant||kineticVariants.has(type.recipe.parameters.warheadVariant);
 return kineticVariants.has(type.recipe.variantId);
}
export const UT_FIXED_FEEDS=Object.freeze({
 WUTSmartShuriken:Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Робот',source:'UT169'}),
 [HT_TEAR_SPRAY_MODE]:Object.freeze({count:1,capacity:20,selectionOnly:true,label:"\u0411\u0430\u043b\u043b\u043e\u043d",source:"HT180"}),
 ...Object.fromEntries(Object.values(UT_FLUID_PROFILES).map(p=>[p.modeId,Object.freeze({count:1,capacity:p.capacity,selectionOnly:true,label:"\u0420\u0435\u0437\u0435\u0440\u0432\u0443\u0430\u0440",source:"UT134"})])),
 WC9xrdk8qWqC3tsHh:Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Камора',source:'UT145'}),
 W7iIk_4lnXIP5JOOu:Object.freeze({count:4,capacity:1,selectionOnly:true,label:'Камора',source:'UT144-145'}),
 'WInB0nYjRLMJm5Ha-':Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 WuZRkhqwMzX3gyVWL:Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 'WHv4EWlz3Tg6-cvQn':Object.freeze({count:6,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 W7v0_whpuR9MtD4tH:Object.freeze({count:6,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 'WpvG7-bGWCtwNOPFf':Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 WNK4gk21iQ4le2Lxr:Object.freeze({count:1,capacity:1,selectionOnly:true,label:'Труба',source:'UT145-146'}),
 W5BEH4zTOtg2ds7is:Object.freeze({count:1,capacity:3,label:'Трубка',source:'UT136-138'}),
 WIijXG9uGZ52T0eW2:Object.freeze({count:6,capacity:5,label:'Ствол',source:'UT136-138'}),
 WATP5TU7jVQnEpqB0:Object.freeze({count:1,capacity:5,label:'Ствол',source:'UT136-138'}),
 W_eUqH082RrEoTPPP:Object.freeze({count:4,capacity:4,label:'Ствол',source:'UT136-138'}),
 WYpXdcsWIyhNVC6x3:Object.freeze({count:6,capacity:5,label:'Ствол',source:'UT136-138'})
});
export const utFixedFeed=weapon=>UT_FIXED_FEEDS[typeof weapon==='string'?weapon:weapon?.standaloneModeId??weapon?.catalogModeId]??null;
export function fixedFeedAvailable(weapon){
 const p=utFixedFeed(weapon),i=weapon?.ammunitionInventory;if(!p||!i)return null;
 const selected=i.magazines.find(m=>m.id===i.installedId);
 if(!selected?.rounds)return 0;
 if(p.selectionOnly)return selected.rounds;
 return i.magazines.filter(m=>m.ammoKey===selected.ammoKey).reduce((n,m)=>n+m.rounds,0);
}
export function fixedFeedPlan(weapon,amount){
 const p=utFixedFeed(weapon);if(!p)return null;
 const i=weapon.ammunitionInventory,selected=i?.magazines.find(m=>m.id===i.installedId);
 if(!i||i.magazines.length!==p.count||i.magazines.some((m,n)=>m.capacity!==p.capacity||m.fixedIndex!==n))throw Error('Проверьте устройство камор/стволов: сохранённая подача не соответствует источнику.');
 if(!Number.isSafeInteger(amount)||amount<1||amount>fixedFeedAvailable(weapon))throw Error('InsufficientRounds');
 const order=[selected,...i.magazines.filter(m=>m!==selected)],plan=[];let remaining=amount;
 for(const m of order){if(!remaining)break;if(m.ammoKey!==selected.ammoKey)continue;const spent=Math.min(remaining,m.rounds);if(spent){plan.push({magazineId:m.id,index:m.fixedIndex,ammoKey:m.ammoKey,before:m.rounds,spent,after:m.rounds-spent});remaining-=spent;}if(p.selectionOnly)break;}
 if(remaining)throw Error('InsufficientRounds');return plan;
}
