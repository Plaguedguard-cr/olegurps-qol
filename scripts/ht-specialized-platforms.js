// Explicit source identities extend the common preparation path; null is never a guessed statistic.
const mortars = new Set(['WXjyIkZ69TeMij1fF','W08-SWxWsChhEpODr','WK3vp0aO9wJv3YMCH',
  'WG8bjQC68EroOADcT','W9aaejQdnPrtlwB0n','W2jyNQVffyd763wOP','WyLYbojvuqJNxuHPr']);
const guided = new Set(['WLtxCaJ16zBNXOM6B','WYtq-OBcCaZp7ShJJ','WmG_jTzAKmvFs5myW','WeXQmnN9negUgW4dp','WfQbQ4kVYxR2_9Ji1']);
const homing = new Set(['WQymu6IvqV_kTwiqz','WCjHOf4oONWBafSAa','W0nH5aEN5CsOLWS2t']);
export function selectedGuidancePlatform(ammo,modeId) {
  return modeId==='WjD-b9M0j2HJAcxyy' && ammo?.guidancePackage?.manualGuidance ? {
    kind:'semi-active-homing',source:'HT150; B412',manualGuidance:true,rangeSemantics:'minimum-maximum',
    instruction:'Лазерный комплект Hydra выбран с боевой частью HE. Ведущий вручную учитывает подсветку, наведение и полёт и разрешает проверку; Damage используют после подтверждённого попадания.'}:null;
}
export const HOST_BULK_ADJUSTMENTS = Object.freeze({
  W9ki0p3eZ0dV761l1:-1,'WBg7hpnW95SX83X-c':-1,'WJQk1KpyOURTwDD-N':-1,
  WHlBefAVM5F3s_Fhx:-1,WV56lTDugarCzOy27:-1,WGZlqJxbZOxd6FR4h:-2
});
export function specializedPlatform(mode, source) {
  if(source!=='HT')return null;
  const id=mode?.weapon_mode_id;
  if(mortars.has(id) && mode.governing_skill?.skill?.name==='Artillery' && mode.stats?.rate_of_fire==='1')
    return {kind:'mortar',source:'HT146',rclNotApplicable:true,bulkNotApplicable:true,rangeSemantics:'minimum-maximum',
      instruction:'Миномёт: выберите точку и примените условия Artillery. Ведущий определяет рассеивание и попадание; затем использует Damage и осколки. Перемещение установки учитывается вручную.'};
  if(guided.has(id)||homing.has(id))return {kind:guided.has(id)?'guided-missile':'homing-missile',source:'HT152; B412-413',
    rclNotApplicable:true,bulkNotApplicable:true,rangeSemantics:'speed-maximum',
    ...(id==='WQymu6IvqV_kTwiqz'?{terminalProjectileRecoil:1,terminalSource:'HT152 note 6; HT174',
      terminalInstruction:'У Sidewinder Rcl 1 относится к конечной атаке ABF с 194 элементами, а не к пуску.'}:{}),
    manualGuidance:true,
    instruction:'Ведущий учитывает наведение, условия и время полёта вручную и подтверждает допустимость проверки. Успешный бросок не наносит урон автоматически: Damage используют после подтверждённого попадания.'};
  if(Object.hasOwn(HOST_BULK_ADJUSTMENTS,id))return {kind:'host-dependent',source:id==='WGZlqJxbZOxd6FR4h'?'HT88–89':
    ['W9ki0p3eZ0dV761l1','WHlBefAVM5F3s_Fhx'].includes(id)?'HT104':'HT145',
    hostBulkAdjustment:HOST_BULK_ADJUSTMENTS[id],stockConfiguration:id==='WGZlqJxbZOxd6FR4h'};
  return null;
}
export function configuredPlatform(platform, overrides={}) {
  if(platform?.kind!=='host-dependent')return {platform};
  if(overrides.bulk!=null && /^-?\d+\*?$/.test(String(overrides.bulk)))return {platform:{...platform,installation:'explicit-bulk'}};
  if(platform.stockConfiguration && overrides.installation==='stock')return {platform:{...platform,installation:'stock',weightLb:5.1},bulk:'-4'};
  const host=String(overrides.hostBulk??'').trim().replaceAll('\u2212','-');
  if(/^-[1-9]\d*$/.test(host))return {platform:{...platform,installation:'host',hostBulk:Number(host)},bulk:String(Number(host)+platform.hostBulkAdjustment)};
  return {platform,reason:platform.stockConfiguration?'Выберите FN 303 с прикладом либо укажите Bulk оружия-носителя.':'Укажите Bulk оружия-носителя в настройках этого режима.'};
}
export function platformRange(platform, range) {
  if(!['minimum-maximum','speed-maximum'].includes(platform?.rangeSemantics))return null;
  const m=String(range??'').replaceAll(',','').match(/^(\d+)\/(\d+)$/);
  return m?{minimum:platform.rangeSemantics==='speed-maximum'?null:Number(m[1]),maximum:Number(m[2]),halfDamage:null,source:platform.source,
    ...(platform.rangeSemantics==='speed-maximum'?{speedYardsPerSecond:Number(m[1])}:{})}:null;
}
export function platformMotionError(attack,values={}) {
  return attack?.platformRules?.bulkNotApplicable && (values.moveAndAttack||values.closeCombat||values.closeHipShooting)
    ?'Для этой установки подготовка атаки доступна без движения и ближнего боя; нужный для них Bulk не указан в источнике.':null;
}
