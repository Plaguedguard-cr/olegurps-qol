import { WeaponStrengthResolver, createWeaponStrengthEvidence } from './weapon-strength-resolver.js';
import { resolveCombatCalculation } from './combat-calculation-engine.js';

// The profile is a preview of the same named channel used by the actual Attack.
// Its projected delta is removed before that channel is evaluated again.
export function meleeStrengthChannel(evidence, { reconcileExternal = false } = {}) {
  const external = reconcileExternal && evidence?.proposedDelta !== null
    ? (evidence?.externalComponents ?? []).filter(c => c.scope === 'external-channel').reduce((n, c) => n + c.value, 0) : 0;
  return { id: 'weaponStrength', value: (evidence?.proposedDelta ?? 0) - external,
    label: '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u0430\u044f ST', source: 'WeaponStrengthResolver',
    explanation: evidence?.reason ?? '' };
}

export function projectMeleeStrength(baseSkill, evidence) {
  if (!Number.isFinite(baseSkill)) return null;
  return resolveCombatCalculation({ combatType: 'melee', baseAttackLevel: baseSkill,
    channels: [meleeStrengthChannel(evidence)] }).effectiveSkill;
}

export function resolveProfileWeaponStrength({ actor, attack, profile, context, selection, skill,
  importedBaseline, ownerOverride, st, hands, martial, motion }) {
  const identity = { actorId: actor?.id, instanceId: attack.standaloneRef?.weaponId ?? attack.equipmentRef?.instanceId ?? attack.data?.parentuuid ?? context.key,
    equipmentId: profile.equipmentId, modelId: profile.modelId, modeId: profile.modeId };
  const proof = { ...identity, source: 'melee-profile:' + skill.source, scope: 'base-level' };
  const clean = skill.resolved && !importedBaseline && !ownerOverride && skill.source !== 'manual-contact';
  const provenance = attack.weaponStrengthProvenance ?? (clean ? { status: 'CLEAN', evidence: proof } : { status: 'UNKNOWN' });
  const result = new WeaponStrengthResolver({ catalogs: context.catalogs }).resolve({ actor,
    weaponIdentity: identity, profile, instance: context.record,
    category: profile.utExotic ? 'special-ut' : 'melee', provenance,
    override: { instanceId: identity.instanceId, modeId: identity.modeId, st },
    selection: { modeId: identity.modeId, grip: selection.grip || 'published', motion,
      skill: skill.name, confirmed: martial || !hands.reason, evidence: proof },
    currentMeleeStrength: hands,
    conditions: { ...(hands.reason ? { specialRule: 'existing-grip-restriction' } : {}),
      ...(!/^(?:thr|sw)/i.test(profile.stats.damage) && profile.energy ? { damageKind: 'fixed-energy' } : {}) } });
  return { ...createWeaponStrengthEvidence(result), reason: result.hints.manualReason
    ? (result.penalty.provenanceStatus === 'UNKNOWN' ? '\u0421\u043e\u0441\u0442\u0430\u0432 ST \u0432 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c \u0438\u0442\u043e\u0433\u0435 \u043d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043d; \u0438\u0442\u043e\u0433 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d.'
      : '\u0428\u0442\u0440\u0430\u0444 ST \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d: ' + result.hints.manualReason) : null };
}

export function naturalWeaponStrength(actor, attack) {
  const result = new WeaponStrengthResolver().resolve({ actor, category: 'natural',
    weaponIdentity: { instanceId: attack.key, modeId: 'natural:' + attack.unarmedRef.id } });
  return { ...createWeaponStrengthEvidence(result), reason: null };
}

export function unboundMeleeStrength(actor, attack) {
  const result = new WeaponStrengthResolver().resolve({ actor, category: 'melee',
    weaponIdentity: { instanceId: attack?.data?.parentuuid || attack?.key,
      modeId: attack?.catalogBinding?.modeId }, provenance: { status: 'UNKNOWN' } });
  return { ...createWeaponStrengthEvidence(result),
    reason: '\u0421\u043e\u0441\u0442\u0430\u0432 ST \u0432 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c \u0438\u0442\u043e\u0433\u0435 \u043d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043d; \u0442\u043e\u0447\u043d\u044b\u0439 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u043e\u0432\u044b\u0439 \u0440\u0435\u0436\u0438\u043c \u043d\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d.' };
}
