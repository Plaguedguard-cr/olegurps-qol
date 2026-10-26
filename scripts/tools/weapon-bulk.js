/** The star describes stock capability, never the current position of the stock. */
export function parseWeaponBulk(value) {
  const rawBulk = String(value ?? "").trim();
  const match = rawBulk.match(/^([+-]?\d+)\s*(\*)?$/u);
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
  return { rawBulk, numericBulk: Number(match[1]), hasFoldingStock: !!match[2] };
}

/** LT81: explicit owner choice; no strength lookup, restrictions or inferred wielding state. */
export function sourceWeaponHandling(mode, bulkState = 'mounted', manualBulk = null) {
  const contract = mode?.lt_ranged_contract;
  if (!contract) return null;
  const values = contract.bulkValues;
  const state = bulkState === 'giant' ? 'giant' : 'mounted';
  const legacyManual=values&&String(mode.stats.bulk)!==values.join('/')?parseWeaponBulk(mode.stats.bulk):null;
  const manual = manualBulk === null ? legacyManual : parseWeaponBulk(manualBulk);
  const bulkMetadata = values ? { rawBulk: values.join('/'), sourceValues: [...values], bulkState: state,
    numericBulk: manual?.numericBulk ?? values[state === 'giant' ? 1 : 0], hasFoldingStock: false,
    ...(manual ? { manual: true } : {}), source: contract.bulkSource } : null;
  return { rclNotApplicable: contract.rclNotApplicable, source: contract.source,
    ...(bulkMetadata ? { bulkMetadata } : {}), ...(contract.jetDeferred ? { jetDeferred: true } : {}) };
}

export function sourceBulkChoiceHTML(mode, state, escape, attributes = 'name="ltBulkState"') {
  const values = mode?.lt_ranged_contract?.bulkValues;
  if (!values) return '';
  return `<label>Использование машины — Bulk ${escape(values.join('/'))}<select ${attributes}>` +
    `<option value="mounted"${state !== 'giant' ? ' selected' : ''}>Обычная установка — Bulk ${values[0]}</option>` +
    `<option value="giant"${state === 'giant' ? ' selected' : ''}>Гигант держит как оружие — Bulk ${values[1]}</option></select></label>`;
}
