import { withActorResourceWrite } from './actor-resource-writes.js';
import { UT_EXTENDED_SOURCE } from './ut-extended-source.js';
import { UT_HOMING_SOURCE, UT_HOMING_GUIDANCE } from './ut-sefop.js';

// Campaign availability is separate from source/physical compatibility and historical ownership.
import { parseCampaignTL, publishedTL } from './tech-level.js';
export { parseCampaignTL, publishedTL } from './tech-level.js';
export const readCampaignTL = actor => parseCampaignTL(actor?.getFlag?.('olegurps-qol', 'campaignTL'));
export function saveCampaignTL(actor, value) {
  const tl = parseCampaignTL(value);
  return withActorResourceWrite(actor, async () => {
    if (actor.isOwner === false) throw Error('Permission');
    await actor.setFlag('olegurps-qol', 'campaignTL', tl);
    return tl;
  });
}
const recordTL = record => publishedTL(record?.minimum_tech_level ?? record?.tl ?? record?.min_tl ?? record?.tech_level_raw);
export function isUserAmmunition(type) {
  return type?.source === 'user' || type?.source === 'custom' ||
    ['user', 'gm'].includes(type?.recipe?.parameters?.source?.kind) || type?.recipe?.autoProfile?.origin === 'user';
}
export function requiredAmmunitionTL(type, catalogs) {
  if (!type || type.source !== 'catalog') return null;
  const base = type.kind === 'ammo-family' ? catalogs?.getAmmoFamily(type.book, type.ammoId) : catalogs?.getAmmoItem(type.book, type.ammoId);
  let baseTL = recordTL(base);
  // Family TL is known only when every actual catalog member has a known TL.
  if (baseTL == null && type.kind === 'ammo-family' && base?.ammo_item_ids?.length) {
    const levels = base.ammo_item_ids.map(id => recordTL(catalogs?.getAmmoItem(type.book, id)));
    if (levels.every(tl => tl != null)) baseTL = Math.min(...levels);
  }
  const id = type.recipe?.variantId;
  if (!id) return baseTL;
  const source = UT_EXTENDED_SOURCE[id]??(id==='ut_homing'?UT_HOMING_SOURCE:null);
  const aliases = {ut_drugged_ice:'drugged_ice_sliver',ut_paint:'paint_pellet',ut_solid_slug:'solid_slug_25mm_tangler_gun'};
  const construction = source ?? catalogs?.getVariant(type.book, aliases[id] ?? (type.book === 'ut' ? id.replace(/^ut_/, '') : id));
  const minimum = recordTL(construction);
  const selected = source ? publishedTL(type.recipe?.parameters?.availabilityTL) : minimum;
  const sensor=id==='ut_homing'&&Object.hasOwn(UT_HOMING_GUIDANCE,type.recipe.parameters?.homingGuidance??'')?
    UT_HOMING_GUIDANCE[type.recipe.parameters.homingGuidance]:null;
  const sensorTL=sensor?Math.min(...Object.keys(sensor.minSizeByTL).map(Number)):null;
  const warheadTL=id==='ut_homing'&&type.recipe.parameters?.warheadVariant&&type.recipe.parameters.warheadVariant!==id?requiredAmmunitionTL(
    {...type,recipe:{...type.recipe,variantId:type.recipe.parameters.warheadVariant}},catalogs):null;
  const known = [baseTL, minimum, selected, sensorTL, warheadTL].filter(tl => tl != null);
  return known.length ? Math.max(...known) : null;
}
export function campaignAmmunitionAdmission(type, catalogs, campaignTL) {
  const limit = parseCampaignTL(campaignTL);
  if (limit == null || isUserAmmunition(type)) return {allowed:true, requiredTL:null};
  const requiredTL = requiredAmmunitionTL(type, catalogs);
  return {allowed:requiredTL == null || requiredTL <= limit, requiredTL};
}
