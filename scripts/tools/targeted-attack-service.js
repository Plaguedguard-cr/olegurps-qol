// Compatibility API; all technique contexts are created by the shared registry.
import {createCombatTechniqueContext} from "./combat-technique-registry.js";
export {normalizeTargetedAttackLocation, normalizeGunsSpecialty, specialtyFromPrerequisite, parseTargetedAttackName, collectGunsSkills, explicitAttackSpecialties, clampTargetedAttackModifier, parseMeleeTargetedAttackName} from "./combat-technique-targeted.js";
export {flattenEntries, finiteLevel, relativeLevel} from "./combat-technique-data.js";
export function createTargetedAttackContext(options={}) { return createCombatTechniqueContext("rangedTargetedAttack",options); }
export function createMeleeTargetedAttackContext(options={}) { return createCombatTechniqueContext("meleeTargetedAttack",options); }
