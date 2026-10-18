import { readWeaponBattery, WEAPON_POWER_PROFILES, weaponPowerReason, weaponPowerEvidence,
  validateWeaponShotPower, weaponBatteryHTML } from './weapon-power.js';

export const PAINT_CARBINE_MODE = 'Wg_f0E5hqv6o1C0Uj';
export const PAINT_CELL_CAPACITY = WEAPON_POWER_PROFILES[PAINT_CARBINE_MODE].capacity;
export const isPaintCarbine = (weapon, modeId = null) =>
  (modeId ?? weapon?.standaloneModeId ?? weapon?.catalogModeId) === PAINT_CARBINE_MODE;
export const newPaintBattery = () => ({type:'B',capacity:PAINT_CELL_CAPACITY,charge:PAINT_CELL_CAPACITY});
export const paintBattery = weapon => readWeaponBattery(weapon);
export const paintPowerReason = (weapon,amount=1,modeId=null) =>
  isPaintCarbine(weapon,modeId) ? weaponPowerReason(weapon,amount,modeId) : null;
export const paintPowerEvidence = (weapon,amount,spent=amount) => weaponPowerEvidence(weapon,amount,spent);
export const validatePaintShotPower = (actor,profile,amount=1,attack=null) => validateWeaponShotPower(actor,profile,amount,attack);
export const paintBatteryHTML = (weapon,selected,escape) => isPaintCarbine(weapon) ? weaponBatteryHTML(weapon,selected,escape) : '';
export const PAINT_BATTERY_CSS = `
  .gam-battery { display:flex !important; flex:0 0 auto !important; align-items:center; align-self:center; gap:6px; width:auto !important; height:auto !important; min-height:0 !important; margin:0 !important; padding:2px 0 2px 4px !important; border:1px solid transparent; background:transparent; }
  .gam-battery.selected { outline:2px solid var(--color-border-highlight,#da6); outline-offset:1px; }
  .gam-battery-text { display:grid; gap:1px; text-align:right; white-space:nowrap; font-size:.78em; line-height:1.15; }
  .gam-battery-icon { position:relative; display:flex; flex-direction:column; gap:1px; width:14px; height:32px; padding:2px; border:2px solid currentColor; border-radius:2px; }
  .gam-battery-icon::before { content:""; position:absolute; width:6px; height:3px; top:-5px; left:2px; background:currentColor; }
  .gam-battery-segment { flex:1; background:rgba(128,128,128,.2); }
  .gam-battery-segment.filled { background:hsl(var(--gam-mag-hue, 0) 78% 43%); }
`;
