import { beamProfile, beamWeapon } from '../ut-beam-source.js';
import {applyLaserModifications} from '../ut-laser-modifications.js';

export function beamRange(value) {
  const m=String(value??'').replaceAll(',','').match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(\s+mi\.?)?$/);
  if(!m)return null;
  const unit=m[3]?1760:1,halfDamage=Number(m[1])*unit,maximum=Number(m[2])*unit;
  return halfDamage>0&&maximum>=halfDamage?{halfDamage,maximum,minimum:null,unit:'yards',sourceUnit:m[3]?'mile':'yard'}:null;
}
export function beamConditions(id) {
  const p=beamProfile(id);if(!p)return [];
  const lines=p.family==='xray'?[
    'В обычной атмосфере Range 7/20 ярдов; делить на относительное давление. Под водой не действует. Field-jacketed — отдельно, вручную. UT117–118.',
    'Surge против Electrical: особое действие по B134 — вручную; тип цели автоматически не определяется.'
  ]:p.family==='graser'?[
    'В обычной атмосфере Range 70/200 ярдов; делить на относительное давление. Под водой не действует. Field-jacketed — отдельно, вручную. UT118.',
    'Surge против Electrical: особое действие по B134 — вручную; тип цели автоматически не определяется.'
  ]:p.family==='rainbow'?[
    'В вакууме/следовой атмосфере Range /10 и без Armor Divisor; под водой до 2 ярдов. Условия применяются вручную. UT116.'
  ]:['Инфракрасный лазер: под водой Range 0/1 ярд; влияние дыма и погоды — вручную. UT114.'];
  if(p.chemical){
    lines.push('Химический выхлоп: 1 HP tox/с в пределах 1 ярда. UT114.');
    lines.push(id==='WY4jJpxSq5uG4KNl2'?
      'Отдельный бак: SM−2, DR10, HP12; при выводе из строя 2d cor в радиусе 2 ярдов, вручную. UT115.':
      'Ранец: SM−4, DR10, HP7; при выводе из строя 1d cor в радиусе 1 ярда, вручную. UT115.');
  }
  return lines.map(text=>({id:'BeamCondition',text}));
}
export function beamDamage(raw,id,weapon) {
  const p=beamProfile(id);if(!p)return null;
  const formula=String(raw.damage??'').replace(/burn\s*,\s*sur\s*$/,'burn sur');
  const nativeSafe=/^\d+d(?:[+-]\d+)?(?:[x×]\d+)?\((?:2|3|5|10)\) burn(?: sur)?$/.test(formula)&&!!beamRange(raw.range);
  const damage={status:nativeSafe?'resolved':'unresolved',nativeSafe,reason:nativeSafe?null:'Нужны числовой лазерный Damage и корректный Range.',
    rawFormula:raw.damage,formula,variantId:null,components:[{role:'kinetic',status:nativeSafe?'resolved':'unresolved',formula}],
    transformations:formula===raw.damage?[]:[{source:p.source,effectId:'gga-surge-syntax',from:raw.damage,to:formula,applied:true,order:1}],
    effectiveChanges:{damage:formula},support:{manual:beamConditions(id)},rules:{beam:{modeId:id,family:p.family,source:p.source,
      tightBeam:true,surge:['xray','graser'].includes(p.family),automaticEnvironment:false},
      ballisticRange:beamRange(raw.range),ammunitionSource:p.source}};
  return applyLaserModifications(damage,raw,id,weapon);
}
export function beamResourceLabel(weapon) {
  const p=beamWeapon(weapon);if(!p)return null;
  const b=weapon[p.oneShot?'beamCrystal':p.chemical?'beamChemical':'beamBattery'];
  return (p.oneShot?'Встроенный заряд':p.chemical?(p.modeId==='WY4jJpxSq5uG4KNl2'?'Химический бак':'Химический ранец'):(p.cells>1?p.cells+'×':'')+p.cellSize+' cell')+
    ': '+(b?.charge??0)+'/'+(b?.capacity??p.shots);
}
