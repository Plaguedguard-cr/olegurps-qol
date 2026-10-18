// Approved user-supplied errata over UT2007. No PDF/GCS/Actor or historical shot writes.
export const UT_ERRATA_REVISION = 'ut2007-approved-2026-10-18';
export const UT_APHEX_COST_MULTIPLIER = 4;
export const UT_LIQUID_DOSES = Object.freeze({64:65,100:250});
// These errata-touched beam definitions have no implemented energy ledger.
export const UT_ERRATA_DEFINITION_ONLY = Object.freeze([
  'WAg2AcFXMlFlVMhp9','Wkj-hXVqccdySMffW','WX_LmRHi1yv6wEKcu',
  'WdwCPV31W4KiCkUU4','WtuI6BNF1hhgDXR_Q','WWZwHBgeAlfdvGZb7'
]);

const damage = (from,to,base,type,extra={}) => [
  ['raw_calc.damage',from,to], ['attack_resolution.raw',from,to],
  ['stats.damage',null,{base,type,...extra}]
];
// Exact source identities only. Other published columns remain intact.
export const UT_ERRATA_MODES = Object.freeze({
  W5_0Tkbdr1S4b4Hlv:{page:137,fields:[['stats.rate_of_fire','3','10']]},
  WRvS5pz3LMCzqQyiZ:{page:137,fields:damage('1d+1 pi','4d+4 pi++','4d+4','pi++')},
  W3Ggl5bTeg_44b_rU:{page:137,fields:[['stats.accuracy','4','5']]},
  WngbnzWRwLntvaRbR:{page:137,fields:damage('2d pi','2d pi-','2d','pi-')},
  'WlqvLkGz-INk0A-_o':{page:137,fields:damage('2d+2 pi','2d+2 pi-','2d+2','pi-')},
  W9chB7ydzOWTAxQP0:{page:137,fields:[['stats.bulk','-3','-2']]},
  W30vD5BH3t_VdkWUZ:{page:137,fields:damage('7d pi++','7d pi+','7d','pi+')},
  WOMuCBSS_c_nIstvm:{page:138,fields:damage('6dx25','6dx25 pi++','6dx25','pi++')},
  WmyROTLk0gs7lrYCE:{page:138,fields:damage('9d pi++','9d pi+','9d','pi+')},
  'WPP4GGv21sVx2-CHg':{page:140,fields:damage('1d-1 (0.25) pi-','1d-1(0.2) pi-','1d-1','pi-',{armor_divisor:0.2})},
  WAg2AcFXMlFlVMhp9:{page:118,fields:[['stats.accuracy','24','18']]},
  'Wkj-hXVqccdySMffW':{page:118,fields:[['stats.accuracy','24','18']]},
  WdZSw5CqcSq_d3eSV:{page:142,fields:[['stats.accuracy','4','7'],['caliber_hint','10mmG','10mm']]},
  WdV0VzMAch5j8pxdy:{page:142,fields:damage('6dx25(3) pi','6dx25(3) pi++','6dx25','pi++',{armor_divisor:3})},
  'WegCPnwG-HS41cU29':{page:142,fields:damage('6d+2(3) pi','6d+2(3) pi-','6d+2','pi-',{armor_divisor:3})}
});
const at=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function set(o,path,value){const keys=path.split('.');let target=o;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=structuredClone(value);}

export function applyUTErrataMode(mode,{snapshot=false}={}) {
  const rule=UT_ERRATA_MODES[mode?.weapon_mode_id];if(!rule)return mode;
  let applied=false;
  for(const [path,previous,corrected] of rule.fields){
    const old=at(mode,path);
    // Saved definitions may contain owner-entered values. Only the known source baseline is overlaid.
    if(snapshot && previous!==null && !same(old,previous) && !same(old,corrected))continue;
    if(snapshot && path==='stats.damage'){
      const before=rule.fields.find(f=>f[0]==='raw_calc.damage')?.[1];
      const raw=at(mode,'raw_calc.damage');
      if(raw!==before && raw!==rule.fields.find(f=>f[0]==='raw_calc.damage')?.[2])continue;
    }
    if(!same(old,corrected)){set(mode,path,corrected);applied=true;}
  }
  if(applied){mode.ut_source_data??={};mode.ut_source_data.errata={revision:UT_ERRATA_REVISION,source:'UT'+rule.page+' errata (user supplied)'};}
  return mode;
}

export function applyUTErrataCatalog(book,data){
  if(book==='weapons'&&!data.sources?.some(s=>s.code==='UT'&&s.sha256==='21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1'))return data;
  if(book==='ut'&&data.compatibility_pointer_source_sha256!=='cc4d4286bce5eba3936081da60d77a62dee781630c0803cb73fa982fc7723933')return data;
  if(book==='weapons')for(const item of data.equipment??[]){
    if(item.source!=='UT')continue;
    for(const mode of item.modes)applyUTErrataMode(mode);
  }
  if(book==='ut'){
    const family=data.ammo_families?.find(f=>f.id==='5_7mm_cl');
    if(family)Object.assign(family,{wps_lb:0.009,cps_usd:0.18});
    const rail=data.ammo_families?.find(f=>f.id==='10mm_g');
    if(rail)rail.name='10mm'; // Exact same EM identity and links, never a chemical cartridge alias.
    const aphex=data.warheads?.find(w=>w.id==='aphex');
    if(aphex)aphex.economics.cost_multiplier=UT_APHEX_COST_MULTIPLIER;
    const liquid=data.warheads?.find(w=>w.id==='biochemical_liquid');
    for(const [size,doses] of Object.entries(UT_LIQUID_DOSES))if(liquid?.damage_table?.[size+'mm'])liquid.damage_table[size+'mm'].doses=doses;
  }
  if(['weapons','ut'].includes(book))data.ut_errata={revision:UT_ERRATA_REVISION,source:'approved user errata; docs/audit/ultra-tech-2007-errata.md'};
  return data;
}

// Source-only read adapter for old automatic lots. Never migrate inventory or user payloads.
export function approvedLegacyUTRecipe(saved,expected,canonical){
  if(!saved?.autoProfile||saved.autoProfile.source?.edition!=='Ultra-Tech 2007'||
    saved.customId!=='auto:'+canonical(saved.autoProfile))return false;
  const revised=structuredClone(saved);
  const correctFacts=(f,variant=saved.variantId)=>{
    if(!f||f.sourceEdition!=='Ultra-Tech 2007')return;
    if(f.ammoId==='5_7mm_cl'){
      if(f.baseCostPerShot===0.26)f.baseCostPerShot=0.18;
      if(f.weightPerShotLb===0.013)f.weightPerShotLb=0.009;
    }
    if((variant==='ut_biochemical_liquid'||f.warheadVariant==='ut_biochemical_liquid')&&
      ((f.caliberMm===64&&f.doses===8)||(f.caliberMm===100&&f.doses===16)))f.doses=UT_LIQUID_DOSES[f.caliberMm];
    if(f.warhead?.facts)correctFacts(f.warhead.facts,f.warhead.variantId);
  };
  correctFacts(revised.autoProfile.facts);
  revised.customId='auto:'+canonical(revised.autoProfile);
  return canonical(revised)===canonical(expected);
}
