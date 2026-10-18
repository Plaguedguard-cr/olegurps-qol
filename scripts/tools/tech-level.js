import { moduleText } from '../localization.js';

export function parseCampaignTL(value) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : /^\d+$/.test(String(value).trim()) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 0) throw Error(moduleText('OleGURPS.Weapon.CampaignTLInvalid'));
  return number;
}
export function publishedTL(value) {
  if (Number.isSafeInteger(value) && value >= 0) return value;
  const match = typeof value === 'string' && value.trim().match(/^(?:TL)?(\d+)\^?$/i);
  return match ? Number(match[1]) : null;
}
