// Published loads for exact catalog identities. No Actor names, migrations or source-catalog edits.
const benelli = new Set(['WcLG_XsJVbZ6CIT4p','WT-PUA77JBHLiLTPo','WmeBcFEjqKNri5FAm',
  'W6LVJ8YGACnNB5h-S','WLp8euYFMi9Oikpjp','WH-pkGPARCbK4CP4h','W9LBQ9LeKd3uB9nSZ']);
const pmm = new Set(['W5-46vK8kU8reRK3R','WlIHeqw2f-west5fN']);
const condor = new Set(['Wx10NaVSr1cp1bwKv','WkzlenFdgtlwesK-q']);
const shortShells = new Set(['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load']);
export function alternateLoadNeedsBallistics(catalogs,modeId,ammoId,compatibility) {
  if(compatibility?.status!=='compatible'||compatibility.relation?.type!=='directed-ht178')return false;
  const mode=catalogs?.getMode?.(modeId);
  if(!mode)return true;
  if(mode.ht_ammo_item_ids?.includes(ammoId)||compatibility.relation.requires==='true interchangeable, HT178')return false;
  return !publishedLoadBaseline(modeId,ammoId,{damage:mode.raw_calc?.damage},null);
}
export function publishedShortShellCompatibility(mode, ammoId) {
  return benelli.has(mode?.weapon_mode_id) && shortShells.has(ammoId) &&
    mode.ht_ammo_item_ids?.includes('ht_12_gauge_3_18_5x76mmr') &&
    ['1d+1 pi','1d+2 pi'].includes(mode.raw_calc?.damage);
}
export function publishedLoadBaseline(modeId, ammoId, raw, variantId) {
  let changes=null,source=null,publishedDamage=null;
  if(benelli.has(modeId)&&['1d+1 pi','1d+2 pi'].includes(raw?.damage)) {
    if(ammoId==='ht_12_gauge_3_18_5x76mmr') changes={damage:'1d+2 pi',rof:'3x12',ammunitionProjectileKind:'shot',
      ...(['WT-PUA77JBHLiLTPo','WmeBcFEjqKNri5FAm'].includes(modeId)?{shots:'6+1(3)'}:{})};
    else if(shortShells.has(ammoId)) changes={damage:'1d+1 pi',rof:'3x9',ammunitionProjectileKind:'shot'};
    source='HT104/106';
  }
  if(pmm.has(modeId)&&ammoId==='ht_9x18mm_makarov'&&['2d pi','2d+2 pi'].includes(raw?.damage)) {
    changes={damage:'2d pi'};source='HT100';
    if(variantId==='ht_plus_p')publishedDamage='2d+2 pi';
  }
  // The stock is shotshell. A slug is an explicit recipe, not the name of the weapon mode.
  if(condor.has(modeId)&&shortShells.has(ammoId)&&(!variantId||variantId==='ht_light_case')&&['1d pi','4d pi+'].includes(raw?.damage)) {
    changes={damage:'1d pi',acc:'1',range:'35/700',rof:'1x9',rcl:'1',ammunitionProjectileKind:'shot'};source='HT91/199';
  }
  return changes?{raw:{...raw,...changes},changes,source,publishedDamage}:null;
}
