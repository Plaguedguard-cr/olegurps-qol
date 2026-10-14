// Physical units, not projectile multipliers. IDs are existing source identities; no inventory migration.
const tubes = new Set([
  'ht_specific_hafla_dm34_35mm_wp','ht_specific_at4_84mm_heat','ht_specific_pf30_150mm_heat',
  'ht_specific_m72a2_66mm_heat','ht_specific_rpoa_93mm_thermobaric','ht_specific_armbrust_67mm_heat',
  'ht_specific_m72a4_66mm_heat','ht_specific_m72a6_66mm_hedp','ht_specific_rpoz_93mm_wp',
  'ht_specific_pzf3_110mm_heat','ht_specific_pzf3_110mm_tandem'
]);
export const SEALED_PLATFORM_UNITS = Object.freeze({
  WI9EWrbCRSJOCS_y4: {ammoId:'ht_37x122mmr',source:'HT144'},
  WL0SlLUJxX2V_3KVh: {ammoId:'ht_22_long_rifle_5_7x16mmr',source:'HT98'}
});
export function ammunitionResourceContract(type) {
  if(type?.source!=='catalog'||type.book!=='ht'||type.kind!=='ammo-item')return null;
  const platform=SEALED_PLATFORM_UNITS[type.sealedPlatformModeId];
  if(platform?.ammoId===type.ammoId&&!type.recipe)return {capacity:1,source:platform.source,kind:'sealed-device'};
  if(type.ammoId==='ht_hk_p11_7_62x36mm_underwater_dart')return {capacity:5,source:'HT92',kind:'sealed-barrel-cluster'};
  if(['ht_specific_ss11_heat','ht_specific_malyutka_m_heat','ht_specific_dragon_127_heat',
      'ht_specific_stinger_fim92a_heab','ht_specific_javelin_fgm148a_mseat'].includes(type.ammoId))
    return {capacity:1,source:'HT151-153',kind:'disposable-missile-tube'};
  return tubes.has(type.ammoId)?{capacity:1,source:'HT142,148-149',kind:'disposable-tube'}:null;
}
export function validateResourceShot(weapon, type, modeId) {
  const platform=SEALED_PLATFORM_UNITS[modeId];
  if(platform&&(type?.sealedPlatformModeId!==modeId||type.recipe||type.ammoId!==platform.ammoId))
    throw Error('SealedResourceReview');
  const rule=ammunitionResourceContract(type);if(!rule)return;
  const m=weapon.ammunitionInventory?.magazines.find(m=>m.id===weapon.ammunitionInventory.installedId);
  if(!m||m.capacity!==rule.capacity||m.rounds>rule.capacity||m.rounds<1)throw Error('SealedResourceReview');
}
