// Deterministic inputs shared by the before/after audit and architecture tests.
export function techniqueCoreScenarios() {
  const rows = [];
  const skill = (name, level, extra = {}) => ({ name, level, points: 4, ...extra });
  for (const variant of ['learned', 'absent', 'no-base', 'other-specialty', 'other-weapon', 'duplicates', 'base-changed']) {
    const level = variant === 'base-changed' ? 15 : 13;
    const specialty = variant === 'other-specialty' ? 'Pistol' : 'Rifle';
    const entries = [
      ...(variant === 'no-base' ? [] : [skill('Guns/TL9 (Rifle)', level), skill('Brawling', level)]),
      ...(variant === 'absent' ? [] : [
        skill('Quick-Shot (' + specialty + ')', 11),
        skill('Close-Quarters Battle (' + specialty + ')', 17),
        skill('Close-Hip Shooting (' + specialty + ')', 16),
        skill('Targeted Attack (Guns (' + specialty + ')/Face)', 11, { prerequisite: 'Guns/TL9 (' + specialty + ')' }),
        skill('Targeted Attack (' + (variant === 'other-weapon' ? 'Axe' : 'Club') + ' Swing/Face)', 11, { governingSkill: 'Brawling' }),
        skill('Hammer Fist (' + (variant === 'other-specialty' ? 'Karate' : 'Brawling') + ')', 13),
        skill('Kicking (' + (variant === 'other-specialty' ? 'Karate' : 'Brawling') + ')', 13)
      ])
    ];
    if (variant === 'duplicates') entries.push(...entries.slice(2).map(e => ({ ...e, level: e.level - 2 })));
    const actor = { system: { attributes: { DX: { value: 12 }, PER: { value: 10 }, ST: { value: 12 } },
      skills: Object.fromEntries(entries.map((e, i) => [i, e])) } };
    const governingSkill = variant === 'no-base' ? { family: 'guns', specialty: 'rifle', resolved: false, learned: false }
      : { family: 'guns', specialty: 'rifle', level, learned: true, resolved: true, name: 'Guns/TL9 (Rifle)', tl: 9 };
    rows.push({ variant, actor, governingSkill,
      attack: { name: 'Rifle', level: 13, rof: '3', acc: '4', skill: 'Guns/TL9 (Rifle)', data: { bulk: -5 } },
      melee: { name: 'Club', mode: 'Swing', level: 13, skill: 'Brawling' } });
  }
  return rows;
}

export async function captureTechniqueCore(load) {
  const [ta, quick, cqb, chs, lt, bs] = await Promise.all([
    load('tools/targeted-attack-service.js'), load('tools/ranged-rapid-strike-service.js'),
    load('tools/close-quarters-battle-service.js'), load('tools/close-hip-shooting-service.js'),
    load('lt-improvised-source.js'), load('tools/bs-unarmed.js')
  ]);
  const results = [];
  for (const row of techniqueCoreScenarios()) {
    const { actor, attack, governingSkill, melee, variant } = row;
    const ranged = ta.createTargetedAttackContext({ actor, attack, governingSkill });
    const meleeContext = ta.createMeleeTargetedAttackContext({ actor, attack: melee });
    const specialty = meleeContext.specialtyOptions.find(s => s.label === 'Brawling')?.value;
    const common = { actor, attack, governingSkill };
    const output = {
      rangedTargetedAttack: ranged.resolve({ governingSkill, target: 'face', basePenalty: -5 }),
      meleeTargetedAttack: meleeContext.resolve({ specialty, target: 'face', basePenalty: -5 }),
      quickShot: quick.resolveRangedRapidStrike(common),
      closeQuartersBattle: cqb.resolveCloseQuartersBattle({ ...common, moveAndAttack: true, movePenalty: -5, physicalDistance: 8 }),
      closeHipShooting: chs.resolveCloseHipShooting({ ...common, enabled: true }),
      hammerFist: lt.resolveImprovisedTechnique(actor, Object.values(lt.LT_IMPROVISED_PROFILES).find(p => p.technique === 'Hammer Fist')),
      kicking: lt.resolveImprovisedTechnique(actor, Object.values(lt.LT_IMPROVISED_PROFILES).find(p => p.technique === 'Kicking')),
      bsKick: bs.resolveUnarmedAttack(actor, { name: 'Kick', level: 12, damage: 'thr cr', data: {},
        unarmedRef: { native: false, profile: { id: 'kick', ...bs.BS_UNARMED.kick } } }, { skill: 'Brawling' })
    };
    results.push({ variant, output });
  }
  return JSON.parse(JSON.stringify(results));
}
