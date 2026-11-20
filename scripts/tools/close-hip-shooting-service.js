// Compatibility API routed through the single combat rule registry.
import {resolveCombatTechnique, findCombatTechnique} from "./combat-technique-registry.js";
export function resolveCloseHipShooting(options={}) { return resolveCombatTechnique("closeHipShooting",options); }
export function findCloseHipShooting(options={}) { return findCombatTechnique("closeHipShooting",options); }
