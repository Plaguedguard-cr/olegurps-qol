import {resolveUTGrenade,utGrenadePayloads} from './grenade-ut.js';
import {mt} from './mine-localization.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const component=(formula,type='cr',divisor=1,modifiers='ex')=>({formula,type,divisor,modifiers});
export const HT_MINES=freeze([
  {id:'tmi35',name:'TMi35',tl:6,blast:component('5dx8'),burstHeightFeet:0},
  {id:'ozm3',name:'OZM-3',tl:7,blast:component('5d'),fragments:component('4d','cut',1,''),burstHeightFeet:5,bounding:true,dropAvoidsFragments:true},
  {id:'smi35',name:'SMi35',tl:6,blast:component('4dx2'),fragments:component('4d','cut',1,''),burstHeightFeet:null,bounding:true},
  {id:'m16',name:'M16',tl:7,blast:component('6dx2'),fragments:component('4d','cut',1,''),burstHeightFeet:null,bounding:true},
  {id:'m86',name:'M86 PDM',tl:8,blast:component('8d'),fragments:component('2d','cut',1,''),burstHeightFeet:6,bounding:true},
  {id:'claymore',name:'M18A1 Claymore',tl:7,blast:component('6dx3'),burstHeightFeet:0,
    directed:{...component('2d','pi-',.5,''),pellets:700,sector:60,halfDamage:55,maxRange:270,baseSkill:9,rofBonus:9,rcl:1}},
  {id:'stingmore',name:'M5 Stingmore',tl:8,blast:component('2d+1'),burstHeightFeet:0,
    directed:{...component('1d-2','cr',.2,''),pellets:600,sector:60,halfDamage:15,maxRange:75,baseSkill:9,rofBonus:9,rcl:1}},
].map(p=>({...p,book:'HT',source:'High-Tech p.189; B373/377/408–409/414–415'})));
export const LIMPET_BODIES=freeze([
  {id:'thimble25',name:'Limpet Mine (25 mm)',size:25},
  {id:'mini40',name:'Limpet Mine (40 mm)',size:40},
  {id:'hand64',name:'Limpet Mine (64 mm)',size:64},
]);
export function minePayloads(catalogs,bodyId,tl){
  if(!LIMPET_BODIES.some(b=>b.id===bodyId))return [];
  // MINES-M1 accepts book-confirmed rows only. The approved grenade-only 25 mm
  // Jammer radius is deliberately not extended to a new mine construction.
  const body=LIMPET_BODIES.find(b=>b.id===bodyId);
  const rows=utGrenadePayloads(catalogs,bodyId,tl).filter(p=>p.damage_table?.[body.size+'mm']?.official_radius!==false);
  for(const id of ['shaped_charge','hemp']){
    const p=catalogs?.getVariant('ut',id),body=LIMPET_BODIES.find(b=>b.id===bodyId);
    if(p&&Number.isInteger(tl)&&tl>=p.min_tl&&tl<=12&&p.damage_table?.[body.size+'mm'])rows.push(p);
  }
  return rows;
}
function scalar(text){
  const m=/^(\d+d(?:[+-]\d+)?(?:[x×]\d+)?)(?:\((\d+(?:\.\d+)?)\))?\s+(cr|burn|cut|imp)(.*)$/.exec(String(text).replaceAll(',',''));
  if(!m)throw Error(mt('Invalid'));return component(m[1].replace('×','x'),m[3],Number(m[2]??1),m[4].trim());
}
export function resolveMine(selection,catalogs){
  const base=HT_MINES.find(p=>p.id===selection?.id);
  if(base)return structuredClone(base);
  const body=LIMPET_BODIES.find(b=>b.id===selection?.bodyId),tl=Number(selection?.tl);
  const warhead=minePayloads(catalogs,body?.id,tl).find(p=>p.id===selection.payloadId);
  if(!body||!warhead)throw Error(mt('Invalid'));
  if(['shaped_charge','hemp'].includes(warhead.id)){
    const data=warhead.damage_table[body.size+'mm'],direct=scalar(data.primary??data.damage),blast=scalar(data.linked??data.explosion);
    if(tl>=(warhead.id==='hemp'?11:10)){
      const m=/^(\d+)d([+-]\d+)?(.*)$/.exec(direct.formula);const adds=Number(m[1])+Number(m[2]??0);
      direct.formula=m[1]+'d'+(adds>=0?'+':'')+adds+m[3];
    }
    return {id:'limpet:'+body.id+':'+warhead.id+':'+tl,name:body.name+' / '+(warhead.id==='hemp'?'High Explosive Multi-Purpose (HEMP)':'Shaped Charge'),book:'UT',tl,
      bodyId:body.id,payloadId:warhead.id,diameter:body.size,burstHeightFeet:0,source:'UT146–147/152/'+(warhead.id==='hemp'?'155':'154'),
      direct,blast,fragments:data.fragmentation?scalar(data.fragmentation):null,requiresContact:true};
  }
  const profile=resolveUTGrenade({...selection,tl},catalogs);
  return {...profile,id:'limpet:'+profile.id,name:profile.name.replace(/^[^/]+/,body.name+' '),source:'UT147; '+profile.source,
    burstHeightFeet:0,bodyId:body.id};
}
