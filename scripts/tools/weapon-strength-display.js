import { moduleText } from '../localization.js';

const number = value => Number.isFinite(value) ? String(value) : '?';
const signed = value => Number.isFinite(value) ? (value > 0 ? '+' : '') + value : '?';

// Presentation only: never resolve today's Actor or alter a frozen calculation.
export function weaponStrengthExplanation(evidence, { baseLevel = evidence?.baseLevel, transmittedDelta = evidence?.transmittedDelta } = {}) {
  if (!evidence || evidence.applicabilityStatus === 'NOT_APPLICABLE' && !evidence.support?.confirmedType) return '';
  const e = evidence;
  const published = e.source?.publishedST ?? e.publishedRequiredST;
  const lines = [moduleText('OleGURPS.Strength.Calculation', {
    published: published ?? '?', st: number(e.applicableST),
    required: e.requirementIgnored ? moduleText('OleGURPS.Strength.HandlingIgnored') : number(e.effectiveRequiredST),
    penalty: signed(e.desiredPenalty)
  })];
  if (Number.isFinite(baseLevel)) lines.push(moduleText('OleGURPS.Strength.BaseLevel', { level: baseLevel }));
  if (e.provenanceStatus === 'UNKNOWN') lines.push(moduleText('OleGURPS.Strength.UnknownBase'));
  else {
    if (e.provenanceStatus === 'KNOWN_INCLUDED') lines.push(moduleText('OleGURPS.Strength.Included', { penalty: signed(e.knownIncludedPenalty) }));
    const external = (e.externalComponents ?? []).filter(c => c.scope === 'external-channel').reduce((sum, c) => sum + c.value, 0);
    const delta = Number.isFinite(transmittedDelta) ? transmittedDelta : e.proposedDelta == null ? null : e.proposedDelta - external;
    lines.push(moduleText('OleGURPS.Strength.Additional', { delta: signed(delta) }));
  }
  if (e.selection?.grip === 'one-handed') lines.push(moduleText('OleGURPS.Strength.OneHanded'));
  const drawing = e.operation?.drawing;
  if (drawing) lines.push(moduleText('OleGURPS.Strength.Drawing', { st: number(drawing.value), required: number(drawing.requiredST), method: drawing.method ?? '?' }));
  if (e.reason && e.provenanceStatus !== 'UNKNOWN') lines.push(e.reason);
  return lines.join(' ');
}
