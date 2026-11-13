import { readActorStrength } from './strength-service.js';
import { scaleRequiredStrength } from './ammunition-effects.js';

// Shared pure resolver; ST-P1 adapts melee through melee-weapon-strength.js.
// Rules verified in ST-AUDIT: B270/B364/B412, LT83, HT84/160/165-166. UT151 remains manual.
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const integer = value => typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
const stNumber = value => integer(value) !== null && value >= 0 ? value : null;
const kinds = new Set(['melee', 'firearm', 'pistol', 'thrown', 'personal-artillery', 'mechanical-artillery',
  'bow', 'crossbow', 'natural', 'special-ut']);
const rangedKinds = new Set(['firearm', 'pistol', 'personal-artillery', 'mechanical-artillery']);

/** Strict published grammar, including the actual catalog combinations R/B/M + dagger.
 * Missing, malformed, or M-only input never supplies a fabricated numerical zero. */
export function parseWeaponStrength(value) {
  const rawST = typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) ? value : null;
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);
  const unknown = reason => ({ status: 'UNKNOWN', rawST, handlingST: null, ratedST: null,
    dagger: false, doubleDagger: false, rest: false, bipod: false, mounted: false, suffixes: [], reason });
  if (!raw) return unknown(value === null || value === undefined || typeof value === 'string' && !value.trim() ? 'missing-ST' : 'unsupported-ST-notation');
  if (raw === 'M') return { ...unknown('mounted-ST-without-number'), mounted: true, suffixes: ['M'] };
  const match = /^(0|[1-9]\d*)([RBM]?)([\u2020\u2021]?)(?:\[([1-9]\d*)\])?$/.exec(raw);
  if (!match) return unknown('unsupported-ST-notation');
  const handlingST = Number(match[1]), ratedST = match[4] === undefined ? null : Number(match[4]);
  if (!Number.isSafeInteger(handlingST) || ratedST !== null && !Number.isSafeInteger(ratedST))
    return unknown('unsafe-ST-number');
  // Only combinations actually admitted by the source grammar, not arbitrary suffix bags.
  if (match[2] && match[3] === '\u2021' || ratedST !== null && (match[2] || match[3] !== '\u2020'))
    return unknown('unsupported-ST-combination');
  return { status: 'KNOWN', rawST, handlingST, ratedST, dagger: match[3] === '\u2020',
    doubleDagger: match[3] === '\u2021', rest: match[2].includes('R'), bipod: match[2].includes('B'),
    mounted: match[2].includes('M'), suffixes: [...match[2], ...match[3]], reason: null };
}

// Whitelist public evidence fields. Never copy Actor/Item objects, notes, arbitrary metadata, or functions.
function evidence(value) {
  return Object.fromEntries(['source', 'ruleId', 'componentId', 'actorId', 'instanceId', 'modeId', 'scope']
    .flatMap(key => text(value?.[key]) ? [[key, text(value[key])]] : []));
}
function boundEvidence(value, identity) {
  const e = evidence(value);
  return !!e.source && !!identity.modeId && !!identity.instanceId && !!identity.actorId &&
    e.modeId === identity.modeId && e.instanceId === identity.instanceId && e.actorId === identity.actorId;
}
const sameST = (a, b) => {
  const left = parseWeaponStrength(a), right = parseWeaponStrength(b);
  return left.status === 'KNOWN' && right.status === 'KNOWN' && left.handlingST === right.handlingST &&
    left.ratedST === right.ratedST && left.suffixes.join('') === right.suffixes.join('');
};

function strengthProfile(profile, kind) {
  const value = profile?.ready === false ? null : stNumber(kind === 'damage' ? profile?.effectiveST : profile?.strength ?? profile?.effectiveST);
  return { status: value === null ? 'UNKNOWN' : 'KNOWN', value,
    kind: text(kind === 'damage' ? profile?.strengthKind : profile?.method),
    source: text(profile?.source), baseFormula: kind === 'damage' ? text(profile?.baseFormula) : null,
    maximumST: kind === 'damage' ? stNumber(profile?.maximumST) : null,
    ratedST: kind === 'drawing' ? stNumber(profile?.ratedST) : null,
    requiredST: kind === 'drawing' ? stNumber(profile?.requiredST) : null,
    reason: value === null ? 'existing-' + kind + '-strength-not-established' : null };
}

function provenanceResult(input, identity) {
  const e = evidence(input?.evidence), components = [], ids = new Set();
  let reason = null;
  if (input?.externalComponents !== undefined && !Array.isArray(input.externalComponents)) reason = 'external-ST-components-invalid';
  for (const entry of Array.isArray(input?.externalComponents) ? input.externalComponents : []) {
    const value = integer(entry?.value), id = text(entry?.id);
    if (!id || ids.has(id) || value === null || value > 0 || entry.confirmed !== true ||
      !['base-level', 'external-channel'].includes(entry.scope) || !boundEvidence(entry.evidence, identity)) {
      reason = 'external-ST-component-not-proven'; break;
    }
    ids.add(id); components.push({ id, value, scope: entry.scope, evidence: evidence(entry.evidence) });
  }
  const status = input?.status;
  if (!['CLEAN', 'KNOWN_INCLUDED'].includes(status) || !boundEvidence(input?.evidence, identity) || e.scope !== 'base-level')
    reason ??= 'base-ST-provenance-unknown';
  const included = status === 'CLEAN' ? 0 : integer(input?.knownIncludedPenalty);
  if (status === 'CLEAN' && input.knownIncludedPenalty !== undefined && input.knownIncludedPenalty !== 0 ||
    status === 'KNOWN_INCLUDED' && (included === null || included > 0)) reason ??= 'invalid-included-ST-penalty';
  const baseComponents = components.filter(c => c.scope === 'base-level');
  if (baseComponents.length && baseComponents.reduce((sum, c) => sum + c.value, 0) !== included)
    reason ??= 'base-ST-components-disagree';
  return { status: reason ? 'UNKNOWN' : status, knownIncluded: reason ? null : included, evidence: e,
    externalComponents: components, externalReconciliationRequired: components.some(c => c.scope === 'external-channel'), reason };
}

function resolveSupport(input, identity, category, parsed) {
  const result = { braced: input?.braced === true, confirmedType: null, evidence: evidence(input?.evidence),
    requestedType: text(input?.confirmedType),
    observed: Object.fromEntries(['installed', 'inUse', 'ready', 'fanning', 'thumbing'].flatMap(key =>
      typeof input?.[key] === 'boolean' ? [[key, input[key]]] : [])),
    status: 'UNSPECIFIED', requiredST: parsed.handlingST, ignored: false, conditions: [], reason: null };
  if (text(input?.posture)) result.observed.posture = text(input.posture);
  if (integer(input?.hands) !== null) result.observed.hands = input.hands;
  const type = text(input?.confirmedType);
  if (input?.confirmedType != null && !type)
    return { ...result, status: 'MANUAL', requiredST: null, reason: 'conflicting-or-invalid-support-types' };
  if (!type) return result; // braced alone is B364, not proof of a reduced ST requirement.
  // Missing proof leaves the ordinary requirement in force. An unresolved rule cannot supply a number.
  const manual = (reason, unresolved = false) => ({ ...result, status: 'MANUAL',
    requiredST: unresolved ? null : parsed.handlingST, reason });
  const confirmed = fields => ({ ...result, confirmedType: type, status: 'CONFIRMED', ...fields });
  if (input.confirmed !== true || !boundEvidence(input.evidence, identity)) return manual('support-not-proven');
  if (!rangedKinds.has(category)) return manual('support-not-applicable-to-weapon-kind');
  if (type === 'ordinary') return confirmed({ conditions: ['B364: no ST reduction'] });
  if (type === 'ut-harness') return manual('UT151-harness-coefficient-unresolved', true);
  if (!['bipod', 'mounted', 'pistol-two-handed', 'stock-attached', 'stock-folded'].includes(type))
    return manual('unsupported-support-type', true);
  if (type === 'mounted') {
    if (input.installed !== true || input.inUse !== true || input.ready !== true) return manual('mount-use-not-proven');
    return confirmed({ requiredST: null, ignored: true, conditions: ['B270; B412: mounted requirement ignored'] });
  }
  if (parsed.status !== 'KNOWN') return manual('support-requires-numeric-source-ST');
  if (type === 'bipod') {
    if (input.installed !== true || input.inUse !== true || input.posture !== 'prone') return manual('bipod-prone-use-not-proven');
    return confirmed({ requiredST: Math.ceil(parsed.handlingST * 2 / 3), conditions: ['B270; B412; HT160'] });
  }
  if (type === 'pistol-two-handed') {
    if (category !== 'pistol' || input.hands !== 2 || input.fanning === true || input.thumbing === true)
      return manual('HT84-pistol-grip-not-proven');
    return confirmed({ requiredST: Math.ceil(parsed.handlingST * 0.8), conditions: ['HT84'] });
  }
  if (type === 'stock-attached' && category !== 'pistol') return manual('HT160-pistol-stock-not-applicable');
  if (input.installed !== true || input.inUse !== true) return manual('stock-configuration-not-proven');
  return confirmed({ requiredST: Math.ceil(parsed.handlingST * (type === 'stock-attached' ? 0.8 : 1.2)),
    conditions: ['HT160'] });
}

/** Input adapter: pass a selected raw catalog mode or an existing standalone instance + its selected modeId.
 * category is an explicit source-backed classification, never inferred from a name.
 * damageProfile/drawingProfile are outputs of existing services; they are described, not recomputed.
 * CLEAN/KNOWN_INCLUDED require mode/instance-bound evidence with scope:'base-level'.
 * delta is relative to the declared base level only. Separate external-channel evidence is retained
 * for future transport reconciliation and is never silently treated as part of that base.
 */
export class WeaponStrengthResolver {
  constructor({ catalogs = null } = {}) { this.catalogs = catalogs; }

  resolve({ actor = null, actorStrength = null, weaponIdentity = {}, instance = null, mode = null, profile = null,
    category = null, source = {}, selection = {}, override = null, support = {}, provenance = {}, ammunition = {},
    damageProfile = null, drawingProfile = null, currentMeleeStrength = null, conditions = {} } = {}) {
    const modeId = text(selection.modeId) ?? text(weaponIdentity.modeId) ?? text(profile?.modeId) ?? text(mode?.weapon_mode_id);
    const entry = Array.isArray(instance?.modes) ? instance.modes.find(m => m.modeId === modeId) : null;
    const catalogMode = this.catalogs?.getMode(modeId), equipment = this.catalogs?.getEquipmentForMode(modeId);
    const selected = catalogMode ?? entry?.snapshot ?? mode;
    const identity = { actorId: text(actor?.id) ?? text(actorStrength?.actorId) ?? text(weaponIdentity.actorId),
      instanceId: text(weaponIdentity.instanceId) ?? text(instance?.id),
      equipmentId: text(weaponIdentity.equipmentId) ?? text(instance?.source?.equipmentId) ?? text(equipment?.equipment_id) ?? text(profile?.equipmentId),
      modelId: text(weaponIdentity.modelId) ?? text(profile?.modelId), modeId };
    let problem = null;
    if (category !== 'natural' && (!modeId || !identity.equipmentId || !selected)) problem = 'exact-weapon-mode-required';
    if (selected && selected.weapon_mode_id !== modeId || mode && mode.weapon_mode_id !== modeId ||
      profile && profile.modeId !== modeId) problem = 'selected-mode-mismatch';
    if (equipment && equipment.equipment_id !== identity.equipmentId ||
      instance && (instance.source?.equipmentId !== identity.equipmentId || instance.id !== identity.instanceId || !entry) ||
      profile?.equipmentId && profile.equipmentId !== identity.equipmentId ||
      actor?.id && weaponIdentity.actorId && actor.id !== weaponIdentity.actorId ||
      actorStrength?.actorId && identity.actorId !== actorStrength.actorId) problem = 'weapon-identity-mismatch';
    if (selected && (category === 'melee' && selected.combat_type !== 'melee' ||
      rangedKinds.has(category) && selected.combat_type !== 'ranged' ||
      ['bow', 'crossbow', 'thrown'].includes(category) && selected.combat_type !== 'ranged')) problem = 'combat-type-mismatch';
    if (profile?.manualOnly || selected?.ht_work_only || mode?.ht_work_only) problem = 'work-only-or-manual-profile';
    if (catalogMode && mode && !sameST(catalogMode.stats?.strength, mode.stats?.strength)) problem = 'raw-mode-ST-mismatch';
    const published = profile?.stats?.st ?? selected?.stats?.strength ?? null;
    const book = text(source.book) ?? text(profile?.book) ?? text(equipment?.book);
    const page = integer(source.page) ?? text(source.page) ??
      (Array.isArray(profile?.sourcePages) ? text(profile.sourcePages.filter(p => typeof p === 'string').join('; ')) : null) ?? text(equipment?.reference);
    if (category !== 'natural' && (!book || page === null)) problem ??= 'source-rule-context-required';
    if (profile && selected?.stats?.strength != null && !sameST(published, selected.stats.strength)) problem = 'source-profile-ST-mismatch';
    const instanceOverride = entry?.overrides;
    const hasOverride = override && Object.hasOwn(override, 'st') || instanceOverride && Object.hasOwn(instanceOverride, 'st');
    if (override && (override.modeId !== modeId || override.instanceId !== identity.instanceId)) problem = 'ST-override-identity-mismatch';
    const rawST = override && Object.hasOwn(override, 'st') ? override.st : hasOverride ? instanceOverride.st : published;
    const parsed = parseWeaponStrength(rawST);
    let transformed = parsed, transformation = null;
    if (ammunition.variantId && !['ordinary', 'ht_plus_p'].includes(ammunition.variantId)) problem = 'ammunition-ST-rule-not-established';
    if (ammunition.variantId === 'ht_plus_p') {
      const after = scaleRequiredStrength(rawST), supplied = ammunition.requiredStrength;
      const effectiveST = supplied ? String(supplied.value) + (text(supplied.suffix) ?? '') : ammunition.effectiveST;
      if (!rangedKinds.has(category) || !after || effectiveST !== undefined && !sameST(after, effectiveST))
        problem = 'plus-P-raw-effective-ST-mismatch';
      transformed = parseWeaponStrength(effectiveST ?? after);
      transformation = { id: 'ht_plus_p:required-ST', source: 'HT165; HT166', before: parsed.rawST,
        after: transformed.rawST, suppliedEffective: effectiveST !== undefined, passes: 1 };
    } else if (ammunition.requiredStrength || ammunition.effectiveST !== undefined) problem = 'unidentified-ST-transformation';
    const strength = actorStrength ?? (actor ? readActorStrength(actor) : null);
    const handlingValue = strength?.kinds?.st?.supported === true ? stNumber(strength.kinds.st.effective) : null;
    const handling = { status: handlingValue === null ? 'UNKNOWN' : 'KNOWN',
      value: handlingValue, kind: 'st', evidence: { source: 'readActorStrength.kinds.st.effective' },
      revision: integer(strength?.revision), reason: null };
    if (conditions.handlingKind && conditions.handlingKind !== 'st') {
      handling.status = 'MANUAL'; handling.value = null; handling.reason = 'handling-subtype-binding-not-established';
    } else if (handling.value === null) handling.reason = 'applicable-actor-ST-unknown';
    const supportState = resolveSupport(support, identity, category, transformed);
    const provenanceState = provenanceResult(provenance, identity);
    const grip = text(selection.grip) ?? 'published';
    const minimumOneHandedST = transformed.status !== 'KNOWN' || !transformed.dagger && !transformed.doubleDagger ? null :
      Math.ceil(transformed.handlingST * (transformed.dagger ? 1.5 : 3));
    let requiredST = supportState.requiredST, ready = null, applicabilityStatus = 'CONFIRMED';
    let reason = problem ?? parsed.reason;
    if (!kinds.has(category)) reason ??= 'weapon-kind-not-established';
    if (conditions.specialRule) reason ??= 'special-handling-rule-requires-manual-resolution';
    if (!['published', 'one-handed', 'defensive', 'reversed', 'tip'].includes(grip)) reason ??= 'grip-not-established';
    if (grip !== 'published' && (!boundEvidence(selection.evidence, identity) || selection.confirmed !== true)) reason ??= 'grip-not-proven';
    if (grip === 'one-handed' && (profile?.requiresTwoHands || conditions.requiresTwoHands)) reason ??= 'second-operating-hand-required';
    if (grip === 'one-handed' && (transformed.dagger || transformed.doubleDagger)) {
      if (profile?.requiresTwoHands || conditions.requiresTwoHands) reason ??= 'second-operating-hand-required';
      else if (handling.value === null || handling.value < minimumOneHandedST) reason ??= 'one-handed-threshold-not-met';
      else if (transformed.dagger && handling.value < 2 * transformed.handlingST) ready = '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f Ready \u043f\u043e\u0441\u043b\u0435 \u0430\u0442\u0430\u043a\u0438. B270.';
    } else if (transformed.doubleDagger && handling.value !== null && handling.value < Math.ceil(1.5 * transformed.handlingST))
      ready = '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f Ready \u043f\u043e\u0441\u043b\u0435 \u0430\u0442\u0430\u043a\u0438. B270.';
    if (transformed.ratedST !== null && category !== 'personal-artillery') reason ??= 'rated-ST-format-requires-personal-artillery-rule';
    if (category === 'mechanical-artillery' && !supportState.ignored &&
      (conditions.personalUseConfirmed !== true || conditions.basicLiftSufficient !== true || !boundEvidence(conditions.evidence, identity)))
      reason ??= 'artillery-personal-use-and-basic-lift-not-proven';
    if (supportState.status === 'MANUAL' && supportState.requiredST === null) { reason ??= supportState.reason; applicabilityStatus = 'MANUAL'; }
    if (handling.status === 'MANUAL') { reason ??= handling.reason; applicabilityStatus = 'MANUAL'; }
    if (['bow', 'crossbow'].includes(category)) { applicabilityStatus = 'OUT_OF_SCOPE'; reason = 'bow-crossbow-automation-excluded'; }
    else if (category === 'special-ut') { applicabilityStatus = 'MANUAL'; reason ??= 'special-UT-rule-not-established'; }
    else if (category === 'natural' && !problem) { requiredST = null; reason = null; applicabilityStatus = 'NOT_APPLICABLE'; }
    else if (supportState.ignored && !problem && (!reason || reason === 'mounted-ST-without-number') && rangedKinds.has(category) &&
      (transformed.status === 'KNOWN' || transformed.reason === 'mounted-ST-without-number')) {
      reason = null; applicabilityStatus = 'NOT_APPLICABLE';
    }
    else if (reason || handling.value === null || requiredST === null) {
      reason ??= handling.reason ?? 'numeric-weapon-ST-unknown';
      if (applicabilityStatus === 'CONFIRMED') applicabilityStatus = 'UNKNOWN';
    }
    const absent = applicabilityStatus === 'NOT_APPLICABLE';
    const shortage = absent ? 0 : applicabilityStatus === 'CONFIRMED' ? Math.max(0, requiredST - handling.value) : null;
    const desired = shortage === null ? null : shortage ? -shortage : 0;
    const delta = desired === null || provenanceState.status === 'UNKNOWN' ? null :
      desired - provenanceState.knownIncluded;
    const damage = strengthProfile(damageProfile, 'damage'), drawing = strengthProfile(drawingProfile, 'drawing');
    if (category === 'natural') damage.maximumST = null;
    if (conditions.damageKind === 'fixed-energy') Object.assign(damage, { status: 'NOT_APPLICABLE',
      value: null, kind: 'fixed-energy', baseFormula: null, maximumST: null, reason: 'fixed-energy-does-not-use-ST-damage' });
    const supportPages = { ordinary: ['B364'], bipod: ['B270', 'B412', 'HT160'], mounted: ['B270', 'B412'],
      'pistol-two-handed': ['HT84'], 'stock-attached': ['HT160'], 'stock-folded': ['HT160'] };
    const ruleReferences = [...new Set(['B270', ...(category === 'personal-artillery' ? ['LT83'] : []),
      ...(transformation ? ['HT165', 'HT166'] : []), ...(supportPages[supportState.confirmedType] ?? []),
      ...(support.confirmedType === 'ut-harness' ? ['UT151'] : [])])];
    return { version: 1, weaponIdentity: identity,
      source: { book, page, ruleReferences,
        rawST: parsed.rawST, publishedST: parseWeaponStrength(published).rawST,
        sourceRevision: text(source.sourceRevision) ?? integer(source.sourceRevision) ?? text(instance?.source?.sourceHash), overrideApplied: !!hasOverride },
      selection: { grip, motion: text(selection.motion) ?? text(profile?.motion), skill: text(selection.skill) },
      strengthForHandling: handling, strengthForDamage: damage, strengthForDrawing: drawing,
      requirement: { published: parseWeaponStrength(published).handlingST, base: parsed.handlingST,
        effective: requiredST, numeric: requiredST !== null,
        ignored: absent, suffixes: [...transformed.suffixes], ratedST: transformed.ratedST ?? drawing.ratedST, parsed,
        conditions: [...supportState.conditions], transformation },
      handedness: { minimumOneHandedST, requiresOperatingHand: profile?.requiresTwoHands === true || conditions.requiresTwoHands === true },
      support: { braced: supportState.braced, confirmedType: supportState.confirmedType, status: supportState.status,
        requestedType: supportState.requestedType, observed: supportState.observed,
        conditions: [...supportState.conditions], evidence: supportState.evidence, reason: supportState.reason },
      penalty: { shortage, desired, provenanceStatus: provenanceState.status, knownIncluded: provenanceState.knownIncluded,
        delta, applicabilityStatus, externalReconciliationRequired: provenanceState.externalReconciliationRequired },
      provenance: provenanceState,
      legacy: { penalty: integer(currentMeleeStrength?.penalty),
        minimumSTPenaltyDeferred: currentMeleeStrength?.minimumSTPenaltyDeferred === true,
        penaltyAlreadyIncludedFlag: currentMeleeStrength?.penaltyAlreadyIncluded === true },
      hints: { ready, fatigue: shortage > 0 ? '\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f 1 FP \u043f\u043e\u0441\u043b\u0435 \u0431\u043e\u044f, \u0432\u044b\u0437\u044b\u0432\u0430\u044e\u0449\u0435\u0433\u043e \u0443\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c; \u0432\u0440\u0443\u0447\u043d\u0443\u044e. B270; B426.' : null,
        manualReason: reason ?? provenanceState.reason ?? (provenanceState.externalReconciliationRequired ? 'external-ST-channel-requires-reconciliation' : null) } };
  }
}

/** Proposed evidence only. The execution bridge supplies the actually transmitted delta. */
export function createWeaponStrengthEvidence(result) {
  return { version: 1, weaponIdentity: { ...result.weaponIdentity }, source: { ...result.source, ruleReferences: [...result.source.ruleReferences] },
    selection: { ...result.selection }, publishedRequiredST: result.requirement.published, baseRequiredST: result.requirement.base,
    effectiveRequiredST: result.requirement.effective, requirementIgnored: result.requirement.ignored,
    suffixes: [...result.requirement.suffixes], ratedST: result.requirement.ratedST,
    applicableST: result.strengthForHandling.value, strengthKind: result.strengthForHandling.kind,
    strengthRevision: result.strengthForHandling.revision,
    support: { ...result.support, observed: { ...result.support.observed }, conditions: [...result.support.conditions], evidence: { ...result.support.evidence } },
    desiredPenalty: result.penalty.desired, knownIncludedPenalty: result.penalty.knownIncluded,
    proposedDelta: result.penalty.delta, transmittedDelta: null,
    provenanceEvidence: { ...result.provenance.evidence },
    externalComponents: result.provenance.externalComponents.map(c => ({ ...c, evidence: { ...c.evidence } })),
    provenanceStatus: result.penalty.provenanceStatus, applicabilityStatus: result.penalty.applicabilityStatus };
}
