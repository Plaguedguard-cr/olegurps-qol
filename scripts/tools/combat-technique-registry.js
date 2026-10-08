// Rule descriptors shared by both assistants. UI activation is kept in each assistant's state.
export const COMBAT_RULES = Object.freeze([
  {
    id: "weaponBond", combatType: "both", kind: "perk", activation: "weapon-setting",
    channel: "weaponBond", priority: 10, affectedChannels: ["weaponBond"],
    when: c => c.weaponBond === true,
    resolve: () => ({ value: 1, source: "weapon-bond", label: "Weapon Bond" })
  },
  {
    id: "rangedRapidStrike", combatType: "ranged", kind: "combat-option", activation: "manual",
    channel: "rangedRapidStrike", priority: 10, affectedChannels: ["rangedRapidStrike"],
    when: c => !!c.rapidStrike && !c.rapidStrike.quickShotEntry,
    resolve: () => ({ value: -6, source: "ranged-rapid-strike", label: "Ranged Rapid Strike" })
  },
  {
    id: "quickShot", combatType: "ranged", kind: "learned-technique", activation: "option-dependent",
    channel: "rangedRapidStrike", priority: 30, affectedChannels: ["rangedRapidStrike"],
    when: c => !!c.rapidStrike?.quickShotEntry,
    resolve: ({ context: c }) => ({ value: c.rapidStrike.penalty,
      source: "quick-shot", label: c.rapidStrike.quickShotLabel ?? "Quick-Shot",
      explanation: "Ranged Rapid Strike -6 -> Quick-Shot " + c.rapidStrike.penalty })
  },
  {
    id: "rangedTargetedAttack", combatType: "ranged", kind: "learned-technique",
    activation: "automatic", channel: "hitLocation", priority: 30,
    affectedChannels: ["hitLocation"], when: c => !!c.targetedAttack,
    resolve: ({ context: c }) => ({ value: c.targetedAttack.effectivePenalty,
      source: "targeted-attack", label: c.hitLocationLabel,
      explanation: "Hit Location " + c.hitLocationBase + " -> Targeted Attack " + c.targetedAttack.effectivePenalty })
  },
  {
    id: "closeQuartersBattle", combatType: "ranged", kind: "learned-technique",
    activation: "automatic", channel: "moveAndAttack", priority: 30,
    affectedChannels: ["moveAndAttack"], when: c => !!c.closeQuartersBattle,
    resolve: ({ context: c }) => ({ value: c.closeQuartersBattle.effectivePenalty,
      source: "close-quarters-battle", label: c.closeQuartersBattleLabel,
      explanation: "Move and Attack " + c.moveAttackBase + " -> CQB " + c.closeQuartersBattle.effectivePenalty })
  },
  {
    id: "closeHipShooting", combatType: "ranged", kind: "learned-technique",
    activation: "manual", channel: "closeCombatBulk", priority: 30,
    affectedChannels: ["closeCombatBulk"], when: c => !!c.closeHipShooting,
    resolve: ({ context: c }) => ({ value: c.closeHipShooting.effectivePenalty,
      source: "close-hip-shooting", label: c.closeHipLabel,
      explanation: "Close Combat Bulk " + c.closeCombatBulkBase + " -> Close-Hip Shooting " + c.closeHipShooting.effectivePenalty })
  },
  {
    id: "meleeTargetedAttack", combatType: "melee", kind: "learned-technique",
    activation: "automatic", channel: "hitLocation", priority: 30,
    affectedChannels: ["hitLocation"], when: c => !!c.targetedAttack,
    resolve: ({ context: c }) => ({ value: c.targetedAttack.effectivePenalty,
      source: "targeted-attack", label: c.hitLocationLabel,
      explanation: "Hit Location " + c.hitLocationBase + " -> Targeted Attack " + c.targetedAttack.effectivePenalty })
  },
  {
    id: "rapidStrike", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "rapidStrike", priority: 10, affectedChannels: ["rapidStrike"],
    when: c => !!c.rapidStrikePenalty,
    resolve: ({ context: c }) => ({ value: c.rapidStrikePenalty,
      label: c.rapidStrikePenalty === -3 ? "Rapid Strike (WM / TBaM)" : "Rapid Strike",
      metadata: { rapidStrikePenalty: c.rapidStrikePenalty } })
  },
  {
    id: "telegraphicAttack", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "telegraphicAttack", priority: 30, affectedChannels: ["telegraphicAttack"],
    incompatibilities: ["deceptiveAttack", "evaluate"], when: c => !!c.telegraphicAttack,
    resolve: () => ({ value: 4, label: "Telegraphic Attack",
      metadata: { defenseModifier: 2, excludesCriticalBonus: 4 } })
  },
  {
    id: "deceptiveAttack", combatType: "melee", kind: "combat-option", activation: "manual",
    channel: "deceptiveAttack", priority: 20, affectedChannels: ["deceptiveAttack"],
    incompatibilities: ["telegraphicAttack"], when: c => !!c.deceptivePenalty,
    resolve: ({ context: c }) => ({ value: c.deceptivePenalty,
      label: "Deceptive Attack", metadata: { defenseModifier: -Math.abs(c.deceptivePenalty) / 2 } })
  },
  {
    id: "evaluate", combatType: "melee", kind: "contextual", activation: "contextual",
    channel: "evaluate", priority: 10, affectedChannels: ["evaluate"],
    incompatibilities: ["telegraphicAttack"], when: c => !!c.evaluateBonus,
    resolve: ({ context: c }) => ({ value: c.evaluateBonus, label: "\u041e\u0446\u0435\u043d\u043a\u0430" })
  },
  {
    id: "moveAndAttack", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "moveAndAttack", priority: 10, affectedChannels: ["moveAndAttack"],
    when: c => !!c.moveAndAttack,
    resolve: () => ({ value: -4, label: "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0438 \u0430\u0442\u0430\u043a\u0430" })
  },
  {
    id: "allOutDetermined", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "maneuverAttackBonus", priority: 10, affectedChannels: ["maneuverAttackBonus"],
    when: c => !!c.allOutAttack && c.allOutAttackMode === "determined" && !c.moveAndAttack,
    resolve: () => ({ value: 4, label: "\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430 (\u0422\u043e\u0447\u043d\u0430\u044f)" })
  },
  {
    id: "committedDetermined", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "maneuverAttackBonus", priority: 10, affectedChannels: ["maneuverAttackBonus"],
    when: c => !!c.committedAttack && c.committedMode === "determined" && !c.allOutAttack && !c.moveAndAttack,
    resolve: () => ({ value: 2, label: "Committed Attack (Determined)" })
  },
  {
    id: "committedSteps", combatType: "melee", kind: "maneuver", activation: "maneuver-dependent",
    channel: "committedSteps", priority: 10, affectedChannels: ["committedSteps"],
    when: c => !!c.committedAttack && !!c.committedSteps && !c.allOutAttack && !c.moveAndAttack,
    resolve: () => ({ value: -2, label: "Committed Attack (2 steps)" })
  }
]);

export function getCombatRules(combatType) {
  return COMBAT_RULES.filter(rule => rule.combatType === combatType || rule.combatType === "both");
}
