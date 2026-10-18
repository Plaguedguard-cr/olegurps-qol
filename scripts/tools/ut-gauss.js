import { gaussProfile } from '../ut-gauss-source.js';
import { parseKineticDamage, parseDamageRange, htDamageDice } from './kinetic-damage-math.js';

// UT141 refers to UT139's complete variable-velocity rule, including 1.5/0.25
// shots drained. Four integer units represent one standard electrical shot.
export const GAUSS_SPEEDS = Object.freeze({
  standard:Object.freeze({units:4,rangeFactor:1,label:'Стандартная скорость'}),
  boosted:Object.freeze({units:6,rangeFactor:1.3,label:'Повышенная скорость'}),
  'low-velocity':Object.freeze({units:1,rangeFactor:0.5,label:'Пониженная скорость',hearingModifier:-3})
});
export const gaussSpeed = weapon => weapon?.gaussSpeed ?? 'standard';
export const gaussUnits = weapon => GAUSS_SPEEDS[gaussSpeed(weapon)]?.units ?? null;
export function gaussBallistics(raw,modeId,speed='standard',{boostPiercingDamage=true}={}) {
  const profile=gaussProfile(modeId),setting=Object.hasOwn(GAUSS_SPEEDS,speed??'')?GAUSS_SPEEDS[speed]:null,p=parseKineticDamage(raw?.damage),range=parseDamageRange(raw?.range);
  if(!profile||!setting||!p||!range||raw.linked||raw.followup||raw.followUp||raw.components?.length)
    throw Error('Нельзя рассчитать скорость EM: проверьте исходный профиль.');
  let dice=p.diceText;
  if(speed==='boosted'&&boostPiercingDamage) {
    const adds=p.adds+p.dice;
    dice=p.dice*p.multiplier>12?htDamageDice(p.dice,adds,p.multiplier):
      p.dice+'d'+(adds>0?'+'+adds:adds||'')+(p.multiplier!==1?'x'+p.multiplier:'');
  } else if(speed==='low-velocity')dice=htDamageDice(p.dice,p.adds,p.multiplier,0.5);
  return {...raw,damage:dice+(p.divisor!==1?'('+p.divisor+')':'')+p.minimum+' '+p.type+p.suffix,
    // B9 rounds combat results down; the short UT82 nail ranges expose the fraction.
    range:speed==='standard'?raw.range:Math.floor(range.halfDamage*setting.rangeFactor)+'/'+Math.floor(range.maximum*setting.rangeFactor),
    halfd:Math.floor(range.halfDamage*setting.rangeFactor)};
}
export function gaussSpeedHTML(weapon,escape,{name='gaussSpeed'}={}) {
  const p=gaussProfile(weapon?.standaloneModeId??weapon?.catalogModeId);if(!p)return '';
  const speed=gaussSpeed(weapon),setting=GAUSS_SPEEDS[speed];
  return `<div class="gam-fire-lp-controls"><label>Скорость EM<select name="${name}">${Object.entries(GAUSS_SPEEDS).map(([id,s])=>
    `<option value="${id}"${speed===id?' selected':''}>${escape(s.label)}</option>`).join('')}</select></label><small>`+
    escape(p.external?'Внешнее питание; физическая подача без изменений.':
      `Энергия: ${(setting?.units??4)/4} штатного выстрела на снаряд. ${p.cells===2?'Две B cell заменяются одним комплектом.':''}`)+
    '</small></div>';
}
export function gaussManualConditions(modeId) {
  const p=gaussProfile(modeId);if(!p)return [];
  if(p.nail)return [{id:'gauss-nail-safety',text:'UT82–83: блокировка по живой плоти; отключение — Electronics Operation (Security), 1 минута на попытку. DR 3+ скрывает плоть. Условия и бросок учитываются вручную.'}];
  if(['W__0RKAth-4yvVBSl','WdV0VzMAch5j8pxdy','WbvkCgoaLuWViWyKK','WJstukbcBFPxQFtJE','WdI9_2mws5U3wSQl-'].includes(modeId))
    return [{id:'gauss-platform',text:'UT141–143: установка, наведение, перезарядка и рассеивание при непрямом огне учитываются вручную.'}];
  return [];
}
