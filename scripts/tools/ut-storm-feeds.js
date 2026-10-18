// UT136 permits the alternate feed; approved table priority uses UT138 and UT137.
// Feed metadata only. Energy still belongs to the existing weapon-power ledger.
export const STORM_MODE='WmyROTLk0gs7lrYCE';
export const STORM_FEEDS=Object.freeze({
  belt:Object.freeze({feed:'primary-belt',source:'UT138',sourceShots:'60(5)',magazineCapacity:60,chamberCapacity:0,loadedCapacity:60,reloadSeconds:5}),
  magazine:Object.freeze({feed:'storm-rifle-magazine',source:'UT136;UT137',sourceShots:'12+1(3)',magazineCapacity:12,chamberCapacity:1,loadedCapacity:13,reloadSeconds:3})
});
export const isStorm=weapon=>(weapon?.standaloneModeId??weapon?.catalogModeId)===STORM_MODE;
export function stormFeed(weapon,magazine){
  if(!isStorm(weapon)||!magazine)return null;
  const feed=magazine.sourceFeed?.feed;
  if(feed==='storm-rifle-magazine'||[13,30,31].includes(magazine.capacity)&&!magazine.lpFeedAdapted)return STORM_FEEDS.magazine;
  if(feed==='primary-belt'||[60,90].includes(magazine.capacity))return STORM_FEEDS.belt;
  return null;
}
export function stormMagazineOptions(weapon){
  return !isStorm(weapon)?null:weapon.executionVariant==='lp'?
    [{capacity:90,label:'StormLPBelt'}]:[{capacity:60,label:'StormBelt'},{capacity:13,label:'StormMagazine'}];
}
// Versioned, idempotent read/transaction adapter. Preserve every round and lot.
// A formerly 30-round alternate may remain overfull until used or unloaded.
export function adaptStormFeeds(weapon){
  if(!isStorm(weapon))return;
  for(const magazine of weapon.ammunitionInventory?.magazines??[]){
    const feed=stormFeed(weapon,magazine);if(!feed)continue;
    if(weapon.executionVariant==='lp'&&feed===STORM_FEEDS.belt)continue;
    const previous=magazine.capacity;
    magazine.capacity=Math.max(feed.loadedCapacity,magazine.rounds);
    magazine.sourceFeed={...magazine.sourceFeed,...feed,individualReload:false,
      accounting:'loaded-rounds-including-chamber',reloadTiming:'manual-existing-Ready-actions',revision:'ut-storm-tables-v1',
      ...([30,31].includes(previous)&&!magazine.sourceFeed?.revision?{previousCapacity:previous}:{})};
  }
}
