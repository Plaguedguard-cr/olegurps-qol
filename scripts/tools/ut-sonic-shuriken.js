import {sonicShuriken} from '../ut-sonic-shuriken-source.js';
import {CHEMICAL_SUBSTANCES,chemicalAllowed} from './biochemical-catalog.js';

export const sonicChemicalOptions=()=>Object.values(CHEMICAL_SUBSTANCES).filter(f=>chemicalAllowed(f,'injection'));
export function sonicPayloadValid(payload){
  return !!payload&&payload.doses===2&&typeof payload.note==='string'&&typeof payload.loadId==='string'&&
    (payload.chemicalId==='custom'||chemicalAllowed(CHEMICAL_SUBSTANCES[payload.chemicalId],'injection'));
}
export function sonicShurikenDamage(raw,weapon){
  const payload=weapon?.sonicPayload??null;
  const range=String(raw.range??'').split('/').map(Number);
  const valid=sonicShuriken(weapon)&&/^\d+d(?:6)?(?:[+-]\d+)?\(3\) cut$/.test(raw.damage)&&
    range.length===2&&range.every(n=>Number.isFinite(n)&&n>0)&&range[0]*2===range[1]&&
    (!payload||weapon.sonicChemical==='enabled'&&sonicPayloadValid(payload));
  const chemical=payload&&CHEMICAL_SUBSTANCES[payload.chemicalId];
  return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Нужны текущие ST/thr персонажа и корректная начинка Sonic Shuriken.',
    rawFormula:raw.damage,formula:valid?raw.damage:null,components:valid?[{role:'kinetic',status:'resolved',formula:raw.damage}]:[],transformations:[],
    effectiveChanges:{damage:raw.damage,range:raw.range,rcl:null,rof:'1'},
    rules:{sonicShuriken:{modeId:'WBZHReQ7xAJVZ8Bzc',source:'UT166',constructionCost:weapon?.sonicChemical==='enabled'?450:400,payload:payload?structuredClone(payload):null},
      ballisticRange:valid?{minimum:null,halfDamage:range[0],maximum:range[1],source:'UT166'}:null,
      ...(payload?{sonicFollowUp:{name:chemical?.name??'Пользовательский состав',note:payload.note,doses:2,brief:chemical?.brief??'',source:chemical?.source??'пользовательский',requiresPenetration:true,automaticDamage:false}}:{})},support:{manual:[]}};
}
export function sonicManagementHTML(weapon,escape,{campaignTL=null,message=''}={}){
  const away=!!weapon.sonicThrownId,p=weapon.sonicPayload;
  return `<div class="gam-ammo-inventory"><h3>${escape(weapon.name)}</h3><p>${away?'Предмет брошен; подтвердите ручной подбор.':'Предмет в наличии.'}</p>`+
    `<button type="button" data-inventory-action="sonic-return" ${away?'':'disabled'}>Вернуть подобранный сюрикен</button>`+
    (weapon.sonicChemical==='enabled'?`<p>Начинка: ${p?'2 дозы — '+escape(CHEMICAL_SUBSTANCES[p.chemicalId]?.name??'Пользовательский состав'):'не снаряжена'}</p><label>Состав<select name="sonic-chemical"><option value="custom">Пользовательский яд / препарат / вирус</option>${sonicChemicalOptions().filter(f=>campaignTL==null||f.tl<=campaignTL||p?.chemicalId===f.id).map(f=>`<option value="${f.id}"${p?.chemicalId===f.id?' selected':''}>${escape(f.name)}</option>`).join('')}</select></label><label>Note<textarea name="sonic-note">${escape(p?.note??'')}</textarea></label><button type="button" data-inventory-action="sonic-payload" ${away||p?'disabled':''}>Снарядить имеющиеся две дозы</button><p class="hint">Используйте две имеющиеся дозы выбранного вещества. Follow-up — вручную после пробития. UT166.</p>`:'')+
    `<p role="status" data-inventory-status>${escape(message)}</p></div>`;
}
