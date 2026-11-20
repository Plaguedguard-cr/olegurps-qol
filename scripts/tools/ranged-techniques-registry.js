// Legacy panel view of the primary registry. No separate rule definitions.
import {COMBAT_RULES, getCombatRule} from "./combat-technique-registry.js";
export const RANGED_TECHNIQUES=Object.freeze(COMBAT_RULES.filter(rule=>rule.rangedPanel));

export function getRangedTechnique(id) {
  return RANGED_TECHNIQUES.includes(getCombatRule(id)) ? getCombatRule(id) : null;
}

export function getRangedTechniqueRows(context) {
  return RANGED_TECHNIQUES.map(entry => {
    const availability = entry.availability(context);
    return {
      id: entry.id,
      name: entry.name,
      available: availability.available,
      reason: availability.reason ?? "",
      active: Boolean(context.fireState?.[entry.id]) && availability.available,
      status: entry.status(context),
      help: entry.help
    };
  });
}

