import {fluidProfile} from '../ut-fluid-source.js';
import {CHEMICAL_SUBSTANCES,chemicalAllowed,chemicalProfile} from './biochemical-catalog.js';
export const FLUID_FILLERS=CHEMICAL_SUBSTANCES;
export const fluidEffectiveRange=(p,bounces=0)=>p.range.split('/').map(n=>Number(n)*(1-0.1*bounces));
export function fluidCompatibility(modeId,id){
 const p=fluidProfile(modeId),f=FLUID_FILLERS[id];if(!p||!f)return {allowed:false,reason:'Неизвестная модель или наполнитель.'};
 const allowed=chemicalAllowed(f,p.vortex?'vortex':'spray')||id==='firefoam'&&modeId==='WUGCA3bH9obniRWDA';
 return {allowed,reason:allowed?(p.vortex?'Газ/аэрозоль UT134,160; Firefoam ранца прямо указан UT134.':'Liquid Projector: газы UT134,160, жидкости/пены UT160–161.'):'Vortex переносит газ; для этой жидкости/пены/вязкого состава допуск не установлен (UT134).'};
}
export function fluidTypeAllowed(modeId,type){return type?.source==='catalog'&&type.book==='ut'&&type.kind==='fluid-filler'&&!type.recipe&&fluidCompatibility(modeId,type.ammoId).allowed;}
export function fluidCandidates(modeId,campaignTL=null){return Object.values(FLUID_FILLERS).filter(f=>fluidCompatibility(modeId,f.id).allowed&&(campaignTL==null||f.tl<=campaignTL)).map(f=>({source:'catalog',book:'ut',kind:'fluid-filler',ammoId:f.id,key:'ut:fluid-filler:'+f.id,name:f.name,label:f.name,physical:{costPerShot:f.cost,weightPerShotLb:null}}));}
export function fluidDamage(raw,modeId,weapon,type,context={},attack=null){
 const p=fluidProfile(modeId),f=FLUID_FILLERS[type?.ammoId];if(!p)return null;
 const bounces=context.fluidBounces??0,doses=context.fluidDoses??1;
 const valid=fluidTypeAllowed(modeId,type)&&[undefined,'ordinary'].includes(weapon?.executionVariant)&&(!p.disposable||!weapon.fluidSpent)&&
  Number.isSafeInteger(bounces)&&bounces>=0&&bounces<=9&&(p.vortex||bounces===0)&&Number.isSafeInteger(doses)&&doses>=1&&doses<=p.maxDoses&&
  (!p.underbarrel||attack?.platformRules?.installation==='host');
 const range=fluidEffectiveRange(p,bounces);
 const formula='spec.';
 return {status:valid?'resolved':'unresolved',nativeSafe:valid,rawFormula:raw.damage,formula,reason:valid?null:'Нужны совместимый наполнитель, дозировка, рикошеты и параметры носителя; использованный Pocket Aerosol одноразовый.',variantId:null,transformations:[],
  components:p.vortex?[{role:'linked',status:'resolved',formula:'1d-3 cr dkb',relation:'linked'}]:[],
  effectiveChanges:{damage:formula,range:range.join('/'),rof:1,rcl:1,...(!p.vortex?{acc:0,scopeBonus:0}:p.underbarrel?{acc:2,scopeBonus:Number(String(raw.acc).split('+')[1])||0}:{})},support:{manual:f?[{id:'FluidFiller',text:f.brief}]:[]},
  rules:{costPerShot:f?.cost==null?null:f.cost*doses,fillerCostUnknown:f?.cost==null,instructionOnly:true,componentOrder:['linked'],primaryDamageRole:'chemical',...chemicalProfile(f,{delivery:p.vortex?'vortex':'spray',radius:f?.phase==='slime'?p.radius/2:p.radius,doses}),fluid:{modeId,fillerId:f?.id,doses,bounces,radius:f?.phase==='slime'?p.radius/2:p.radius,route:f?.route,modifier:f?.modifier,source:'UT134,160–161',...(p.underbarrel?{hostInstallation:attack?.platformRules?.installation==='host'}:{}),duration:modeId==='WpAt6DyOnZkKbNfJr'?10:['smoke','colored','hot','prism','electromagnetic'].includes(f?.id)?'60–240':f?.id==='radiant'?'30–120':'300 / wind mph (>=1)',manualExposure:true,manualProtection:true,...(modeId==='WXki2UKT5ScYY4QsY'?{tankDR:10,penetrationRelease:'100mm biochemical, UT153'}:{})},attackBonus:0,ammunitionSource:f?.source??'UT134',ballisticRange:{minimum:null,halfDamage:range.length===2?range[0]:null,maximum:range.at(-1)}}};
}
