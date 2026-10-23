// Ultra-Tech 2007, UT120-121. Shots cover the complete source set, including 2C.
const rows=[
  ['WYuhqGbMCGs-u4MlH','eZAEc5sku2F1VmRw9','Portable MAD','mad','D',1,83,-3,1,12,400,800,'10†','-5',20,10000,3,5,'Projector'],
  ['WEKwzFJTvp1riLTv9','eYmaJC5Lwu14SZJkm','Tactical MAD','mad','D',1,100,-4,3,18,600,1200,'18M','-8',70,70000,3,5,'Beams'],
  ['Wtjsq4TCLXUc8kbwp','esNtb0lQ-Aoxv2kyo','EMP Gun','disruptor','C',1,33,-3,1,6,90,270,'4','-2',1.8,650,2,3,'Projector'],
  ['WnzDswlD1C_zON4Ss','eYJ7nGzM3OUDAHDUW','Pulse Carbine','disruptor','C',2,28,-4,1,12,160,480,'5†','-3',5,2000,2,3,'Projector'],
  ['W12AWwnmv4e0gsr3i','enp8gqY7LzcSf16vA','Scrambler','disruptor','B',1,11,-2,1,3,40,120,'3','-1',0.3,120,2,3,'Projector'],
  ['W9JO2V_oiKVqnyb_F','earqVED4LhM61kuZJ','Tactical Disruptor','disruptor','D',1,50,-8,3,18,600,1200,'18M','-8',70,32000,1,5,'Beams']
];
export const MICROWAVE_PROFILES=Object.freeze(Object.fromEntries(rows.map(([modeId,equipmentId,name,family,cellSize,cells,shots,modifier,coneWidth,acc,halfRange,maximum,st,bulk,weightLb,cost,lc,reload,specialty])=>
  [modeId,Object.freeze({modeId,equipmentId,name,family,cellSize,cells,shots,modifier,coneWidth,acc,halfRange,maximum,st,bulk,weightLb,cost,lc,reload,specialty,source:family==='mad'?'UT120':'UT121'})])));
export const microwaveProfile=id=>Object.hasOwn(MICROWAVE_PROFILES,id??'')?MICROWAVE_PROFILES[id]:null;
export const microwaveWeapon=w=>microwaveProfile(w?.standaloneModeId??w?.catalogModeId);
export const microwaveFormula=p=>`HT${p.modifier} aff (${p.coneWidth} yd)`;
export function projectMicrowaveCatalog(book,data){
  if(book!=='weapons')return data;
  return {...data,equipment:data.equipment.map(e=>{
    const p=Object.values(MICROWAVE_PROFILES).find(p=>p.equipmentId===e.equipment_id);if(e.source!=='UT'||!p)return e;
    const skill={name:p.specialty==='Beams'?'Gunner':'Beam Weapons',specialization:p.specialty,modifier:0};
    return {...e,modes:e.modes.map(m=>m.weapon_mode_id!==p.modeId?m:{...m,ut_microwave_source:{...p},
      governing_skill:{status:'resolved',skill,candidates:[skill],basis:p.source+':table-skill-header'},
      governing_skill_selection:{strategy:'fixed',candidates:[skill],fallback_attribute:null},
      defaults:[{type:'skill',...skill},{type:'skill',name:skill.name,specialization:null,modifier:-4},{type:'dx',modifier:-4}],
      attack_resolution:{...m.attack_resolution,geometry:{type:'cone',width_yards_at_max_range:p.coneWidth,source:p.source}}})};
  })};
}
export function microwaveDamage(raw,id){
  const p=microwaveProfile(id);if(!p)return null;
  const range=String(raw.range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
  const valid=raw.damage===microwaveFormula(p)&&!!range&&Number(range[1])>0&&Number(range[2])>=Number(range[1]);
  return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Нужны штатный Microwave HT-профиль и корректная дальность.',
    rawFormula:raw.damage,formula:null,components:[],transformations:[],effectiveChanges:{},
    rules:{instructionOnly:true,utMicrowave:id,ammunitionSource:p.source,
      resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier:p.modifier,condition:'microwave-'+p.family,
        halfRange:range?Number(range[1]):p.halfRange,outcome:p.family==='mad'?'agony':'shutdown',source:p.source},
      ballisticRange:range?{halfDamage:Number(range[1]),maximum:Number(range[2]),minimum:null,source:p.source}:null},
    support:{manual:[{id:'SpecializedPlatform',text:`Конус ${p.coneWidth} ярд. на максимальной дальности; охват определяют вручную. ${p.source}.`},
      {id:'SpecializedPlatform',text:p.family==='mad'?'Провал HT: Agony в луче и ещё 1 секунду; полный DR добавляется к HT. UT120.':
        'Только электрические системы / Electrical: провал HT отключает на минуты по степени провала. UT121.'}]}};
}
