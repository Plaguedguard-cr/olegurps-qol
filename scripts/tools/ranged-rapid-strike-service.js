// Compatibility API routed through the single combat rule registry.
import {resolveCombatTechnique, findCombatTechnique} from "./combat-technique-registry.js";
export {getRangedRapidStrikeSpecialties, validateRangedRapidStrikeSplit} from "./ranged-rapid-strike-resolver.js";
export function resolveRangedRapidStrike(options={}) { return resolveCombatTechnique("quickShot",options); }
