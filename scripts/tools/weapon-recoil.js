/** Source applicability is independent of a missing value or an arbitrary numeric fallback. */
export function recoilNotApplicable(attack, profile = null) {
  const id=profile?.binding?.confirmed?.modeId??attack?.standaloneRef?.modeId;
  const catalogs=globalThis.OleGURPSQOL?.catalogs,mode=catalogs?.getMode?.(id);
  if(mode&&catalogs.getEquipmentForMode?.(id)?.source==='LT')return mode.lt_ranged_contract?.rclNotApplicable===true;
  if(mode)return attack?.platformRules?.rclNotApplicable===true||profile?.context?.platform?.rclNotApplicable===true;
  return profile?.weaponHandling?.rclNotApplicable === true || attack?.weaponHandling?.rclNotApplicable === true ||
    attack?.platformRules?.rclNotApplicable === true;
}

export function parseRecoil(value, { projectileKind = null } = {}) {
  const match = String(value ?? '').trim().match(/^([1-9]\d*)(?:\s*\/\s*([1-9]\d*))?$/);
  if (!match) return null;
  if (!match[2]) return Number(match[1]);
  return projectileKind === 'shot' ? Number(match[1]) : projectileKind === 'slug' ? Number(match[2]) : null;
}

export function validateAttackRecoil(attack, profile = null, fallback = null) {
  if (recoilNotApplicable(attack, profile)) return null;
  const value = profile?.effective?.rcl ?? attack?.rcl ?? fallback;
  const recoil = parseRecoil(value, { projectileKind: profile?.effective?.ammunitionProjectileKind ?? attack?.ammunitionProjectileKind });
  if (recoil === null && (profile?.binding?.status === 'confirmed' || attack?.standaloneRef || String(value ?? '').includes('/')))
    throw Object.assign(Error('Для этого режима нужен подтверждённый Rcl и, при составном значении, тип снаряда.'), { code: 'ProjectileRclRequired' });
  // Preserve the already calculated recoil supplied by the existing HT/UT fire-mode pipeline.
  return parseRecoil(fallback) ?? recoil;
}
