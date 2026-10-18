// UT137 plus approved user errata: shotgun base 4d+4 pi++; all other own-row
// columns (including Rcl 1) remain authoritative. Never substitute Underbarrel Rcl.
import { moduleText } from '../localization.js';
export const UAW_FEEDS=Object.freeze({
  WtM51JNSpOUIy3Eo1:Object.freeze({id:'main',familyId:'10mm_clp',shots:'40+1(3)',capacity:41,label:'UAWMain'}),
  WRvS5pz3LMCzqQyiZ:Object.freeze({id:'shotgun',familyId:'18_5mm_pc',shots:'5+1(3i)',capacity:6,label:'UAWShotgun'})
});
export const uawFeed=modeId=>UAW_FEEDS[modeId]??null;
export const uawGroup=weapon=>uawFeed(weapon?.standaloneModeId)?weapon?.standaloneWeaponId??null:null;
export function uawExecutionOwner(state,weapon){
  const group=uawGroup(weapon);
  return group?state?.weapons?.find(w=>uawGroup(w)===group&&uawFeed(w.standaloneModeId)?.id==='main')??weapon:weapon;
}
// Read-only projection: the secondary feed never stores a second execution or cell.
export function uawWeaponView(state,weapon){
  const owner=uawExecutionOwner(state,weapon);
  if(!weapon||owner?.id===weapon.id||weapon.executionVariant==='lp')return weapon;
  return {...weapon,executionVariant:owner?.executionVariant==='etc'?'etc':'ordinary',
    etcConfigured:owner?.etcConfigured,
    etcBattery:owner?.executionVariant==='etc'?owner.etcBattery:undefined};
}
export const uawPowerOwner=(state,weapon)=>uawExecutionOwner(state,weapon)?.executionVariant==='etc'?
  uawExecutionOwner(state,weapon):weapon;
export function activeUAWCarrier(state,weapon){
  const group=uawGroup(weapon);if(!group)return weapon;
  const carriers=state.weapons.filter(w=>uawGroup(w)===group);
  const saved=carriers.find(w=>w.id===state.uawActiveFeeds?.[group]&&w.ammunitionInventory?.installedId);
  return saved??carriers.find(w=>w.ammunitionInventory?.installedId)??carriers[0]??weapon;
}
export function uawManagerWeapons(state){
  const seen=new Set();return state.weapons.flatMap(w=>{
    const group=uawGroup(w);if(!group)return [w];
    if(seen.has(group))return [];seen.add(group);return [uawWeaponView(state,activeUAWCarrier(state,w))];
  });
}
export const uawFeedLabel=modeId=>moduleText('OleGURPS.Ammo.'+(uawFeed(modeId)?.label??'UAWMain'));
export function renderUAWMagazineGroups(state,weapon,render,escape){
  const group=uawGroup(weapon);if(!group)return null;
  const active=activeUAWCarrier(state,weapon);
  return Object.keys(UAW_FEEDS).map(modeId=>{
    const carriers=state.weapons.filter(w=>uawGroup(w)===group&&w.standaloneModeId===modeId);
    return `<div class="gam-uaw-feed" data-uaw-feed="${UAW_FEEDS[modeId].id}"><strong>${escape(uawFeedLabel(modeId))}</strong><div class="gam-magazines">${carriers.map(w=>render(w,{active:w.id===active?.id})).join('')}</div></div>`;
  }).join('');
}
export function uawBarrelFacts(modeId){
  const feed=uawFeed(modeId);
  return feed?{kind:'uaw',id:feed.id,modeId,ammoFamilyId:feed.familyId,source:'UT137',sourceShots:feed.shots}:null;
}
