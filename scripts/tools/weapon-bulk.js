/** The star describes stock capability, never the current position of the stock. */
export function parseWeaponBulk(value) {
  const rawBulk = String(value ?? "").trim();
  const match = rawBulk.match(/^([+-]?\d+)\s*(\*)?$/u);
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
  return { rawBulk, numericBulk: Number(match[1]), hasFoldingStock: !!match[2] };
}
