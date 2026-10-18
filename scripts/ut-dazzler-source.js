// Ultra-Tech 2007, UT19,74,113. The combat table controls the dazzle setting.
const rows=[
  ['W9PL689j-etAufLkh','eGyUXVlXkIqVKUcGo','Dazzler Carbine','C',1,9000,-5,1500,4500,3,5,500,3],
  ['WE8bcsOxMnp0L-0n-','eT5ONMhBakByfI_OF','Laser Penlight','A',1,900,-4,100,300,1,0.1,3,4],
  ['WAXaXg-71SL4XsOTO','eHFLCcGPQhrfg4viW','Mini Laser Flashlight','B',1,3600,-5,170,500,1,0.25,10,4],
  ['Wf5ajcSr9CWjMNSaV','efmhFYi3z7q_V6DWV','Heavy Laser Flashlight','B',2,3600,-5,330,1000,1,1,20,4],
  ['Wu_zAmOj-FoD0a38F','eLApXwIjR3n8R0US7','Laser Searchlight','C',1,1800,-5,7000,20000,2,10,500,4]
];
export const UT_DAZZLER_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,cellSize,cells,shots,modifier,halfRange,maximum,coneWidth,weightLb,cost,lc])=>
  [modeId,Object.freeze({modeId,equipmentId,name,cellSize,cells,shots,modifier,halfRange,maximum,coneWidth,weightLb,cost,lc,source:'UT113'})])));
export const utDazzlerProfile=id=>Object.hasOwn(UT_DAZZLER_PROFILES,id??'')?UT_DAZZLER_PROFILES[id]:null;
export const utDazzlerWeapon=w=>utDazzlerProfile(w?.standaloneModeId??w?.catalogModeId);
export const utDazzlerFormula=p=>`HT${p.modifier} aff (${p.coneWidth} yd)`;
export function projectDazzlerCatalog(book,data){
  if(book!=='weapons')return data;
  return {...data,equipment:data.equipment.map(e=>e.source!=='UT'?e:{...e,modes:e.modes.map(m=>{
    const p=utDazzlerProfile(m.weapon_mode_id);if(!p||p.equipmentId!==e.equipment_id)return m;
    return {...m,ut_dazzler_source:{...p,accounting:'published-shots-per-complete-source-set'},
      attack_resolution:{...m.attack_resolution,geometry:{type:'cone',width_yards_at_max_range:p.coneWidth,source:p.source}},
      governing_skill:{status:'resolved',skill:{name:'Beam Weapons',specialization:'Projector',modifier:0},
        candidates:[{name:'Beam Weapons',specialization:'Projector',modifier:0}],basis:'UT113:table-skill-header'}};
  })})};
}
export function utDazzlerDamage(raw,id){
  const p=utDazzlerProfile(id);if(!p)return null;
  const range=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
  const valid=raw.damage===utDazzlerFormula(p)&&!!range&&Number(range[1])>0&&Number(range[2])>=Number(range[1]);
  return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Для Dazzler нужен штатный профиль сопротивления и корректная дальность.',
    rawFormula:raw.damage,formula:null,components:[],transformations:[],effectiveChanges:{},
    rules:{instructionOnly:true,utDazzler:id,ammunitionSource:p.source,
      resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier:p.modifier,condition:'vision-laser',
        halfRange:range?Number(range[1]):p.halfRange,outcome:'temporary-blindness',source:p.source},
      ballisticRange:range?{halfDamage:Number(range[1]),maximum:Number(range[2]),minimum:null,source:p.source}:null},
    support:{manual:[{id:'SpecializedPlatform',text:`Конус ${p.coneWidth} ярд. на максимальной дальности; охват и направление взгляда определяют вручную. UT113.`},
      {id:'SpecializedPlatform',text:'При провале — слепота на минуты по степени провала; защита зрения учитывается в сопротивлении. UT113.'}]}};
}
