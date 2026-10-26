import { AmmunitionCompatibilityService } from '../ammunition-compatibility-service.js';
import { ltBowProfile,readLTBowConfiguration } from '../lt-bow-source.js';
import {ltPersonalProfile} from '../lt-personal-source.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import { LT_PHYSICAL_LOAD_RESTRICTIONS } from '../lt-physical-ammunition-evidence.js';
import {ltDeferredExecutionReason} from '../lt-ranged-execution-policy.js';

// Physical units, not projectile multipliers. IDs are existing source identities; no inventory migration.
const tubes = new Set([
  'ht_specific_hafla_dm34_35mm_wp','ht_specific_at4_84mm_heat','ht_specific_pf30_150mm_heat',
  'ht_specific_m72a2_66mm_heat','ht_specific_rpoa_93mm_thermobaric','ht_specific_armbrust_67mm_heat',
  'ht_specific_m72a4_66mm_heat','ht_specific_m72a6_66mm_hedp','ht_specific_rpoz_93mm_wp',
  'ht_specific_pzf3_110mm_heat','ht_specific_pzf3_110mm_tandem'
]);
// Shared irreversible marker for disposable tubes and integral one-shot devices.
export function useSealedResource(entry) {
  if(entry.sealedUsed)throw Error('SealedResourceSpent');
  entry.sealedUsed=true;
}
export const SEALED_PLATFORM_UNITS = Object.freeze({
  W073XWePe7F0ZsLMX: {ammoId:'olegurps_ht_flame_W073XWePe7F0ZsLMX',source:'HT179-180'},
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
const ltReferenceServices = new WeakMap();
/** Revalidate an actual LT stock through the one shared compatibility service. Never writes or grants approvals. */
export function ltPhysicalAmmunitionCheck(modeId, type, api = globalThis.OleGURPSQOL,configuration=null) {
  const catalogs = api?.catalogs;
  const source = catalogs?.getEquipmentForMode?.(modeId)?.source;
  if (source !== 'LT' && type?.book !== 'lt') return null;
  const links = catalogs?.getModeLinks?.(modeId);
  const guarded = !!ltEarlyProfile(modeId)||!!ltBowProfile(modeId)||!!ltPersonalProfile(modeId)||LT_PHYSICAL_LOAD_RESTRICTIONS.some(r => r.modeId === modeId) ||
    links?.ammoItemIds.some(id => { const r = catalogs.getAmmoItem('lt', id); return r?.requires_accessory || /^GM_/.test(r?.status ?? ''); });
  const known = type?.ammoId && (catalogs?.getAmmoItem?.('lt', type.ammoId) || catalogs?.getAmmoFamily?.('lt', type.ammoId));
  // Unrelated owner-defined projectiles do not acquire or lose a source modifier here.
  if (!guarded && type?.source !== 'catalog' && !known) return null;
  let service = api?.ammunitionCompatibility;
  if (!service && catalogs) {
    if (!ltReferenceServices.has(catalogs)) ltReferenceServices.set(catalogs, new AmmunitionCompatibilityService(catalogs));
    service = ltReferenceServices.get(catalogs);
  }
  if (!service || !type?.ammoId || !['ammo-item', 'ammo-family'].includes(type.kind)) return {
    status: 'undetermined', reasons: [{ code: 'LT_PHYSICAL_IDENTITY_REQUIRED',
      message: 'Физический заряд LT не подтверждён. Выберите конкретный совместимый снаряд; прежние остатки сохраняются.' }] };
  return service.checkCompatibility(modeId, type.ammoId, { book: type.book ?? 'lt', kind: type.kind,...(configuration?{ltBow:configuration}:{}),...(ltEarlyProfile(modeId)?{ltEarlyFit:type.recipe?.parameters?.fit}:{}) });
}

export function validateLTPhysicalAmmunition(modeId, type, api,configuration=null) {
  const result = ltPhysicalAmmunitionCheck(modeId, type, api,configuration);
  if (result && result.status !== 'compatible') throw Object.assign(
    new Error(result.reasons?.[0]?.message ?? 'Допустимость физического заряда LT не подтверждена.'),
    { code: result.reasons?.[0]?.code ?? 'LT_PHYSICAL_LOAD_UNPROVEN', compatibility: result.status });
}

/** The current carrier/party is authoritative, never the profile supplied by a caller. */
export function validateLTWeaponAmmunition(actor, weapon, api = globalThis.OleGURPSQOL) {
  if (!weapon) return;
  const modeId = weapon.standaloneModeId ?? (ltEarlyProfile(weapon.catalogModeId)?weapon.catalogModeId:api?.weaponCatalogBindings?.analyzeMode(actor, weapon.attackRef?.path)?.binding?.modeId);
  const deferred=ltDeferredExecutionReason(modeId??weapon.catalogModeId);if(deferred)throw Error(deferred);
  const inventory = weapon.ammunitionInventory;
  const magazine = inventory?.magazines.find(m => m.id === inventory.installedId);
  const type = ltEarlyProfile(modeId)?magazine?.ltEarlyCharges?.[0]?.type??inventory?.stocks.find(s => s.key === magazine?.ammoKey)?.type:inventory?.stocks.find(s => s.key === magazine?.ammoKey)?.type;
  validateLTPhysicalAmmunition(modeId, type, api,readLTBowConfiguration(actor,weapon));
}
