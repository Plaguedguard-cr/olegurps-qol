// Compatibility API routed through the single combat rule registry.
import {resolveCombatTechnique, findCombatTechnique} from "./combat-technique-registry.js";
export {getCloseQuartersBattleRange} from "./close-quarters-battle-resolver.js";
export function resolveCloseQuartersBattle(options={}) { return resolveCombatTechnique("closeQuartersBattle",options); }
