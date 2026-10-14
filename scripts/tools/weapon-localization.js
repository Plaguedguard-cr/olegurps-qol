import { russianUI } from "../russian-ui.js";
// Fallback for a running Foundry server that cached the module language manifest before these labels existed.
const fallback = {
  "en": {
    "OleGURPS.Weapon.Add": "Add weapon",
    "OleGURPS.Weapon.Configure": "Configure weapon",
    "OleGURPS.Weapon.Attack": "GGA ranged attack",
    "OleGURPS.Weapon.Catalog": "Catalog match",
    "OleGURPS.Weapon.Suggested": "Automatically suggested; saving confirms this model",
    "OleGURPS.Weapon.Confirmed": "Confirmed catalog match",
    "OleGURPS.Weapon.Manual": "Manual choice; saving confirms this model",
    "OleGURPS.Weapon.Review": "Review required",
    "OleGURPS.Weapon.Unmatched": "No match found",
    "OleGURPS.Weapon.Unavailable": "Catalog unavailable; GGA configuration remains available",
    "OleGURPS.Weapon.NoBinding": "Without a catalog binding",
    "OleGURPS.Weapon.Edit": "Edit weapon",
    "OleGURPS.Weapon.Ammo": "Ammunition type",
    "OleGURPS.Weapon.NoAmmo": "No confirmed base ammunition",
    "OleGURPS.Weapon.Base": "base",
    "OleGURPS.Weapon.Stored": "saved type",
    "OleGURPS.Weapon.Skill": "Governing Skill",
    "OleGURPS.Weapon.SkillSummary": "Skill",
    "OleGURPS.Weapon.SelectSkill": "Select skill",
    "OleGURPS.Weapon.SelectAttack": "Select a GGA ranged attack",
    "OleGURPS.Weapon.Level": "skill",
    "OleGURPS.Weapon.BondRequired": "Weapon Bond perk required",
    "OleGURPS.Weapon.Match": "Matches",
    "OleGURPS.Weapon.Difference": "GGA value differs; catalog base in parentheses",
    "OleGURPS.Weapon.Search": "Search the full catalog",
    "OleGURPS.Weapon.SearchHint": "Name, caliber or ID",
    "OleGURPS.Weapon.SearchTooltip": "Search by weapon name, caliber, source, attack mode, equipment_id or weapon_mode_id",
    "OleGURPS.Weapon.SearchMinimum": "Enter at least 2 characters",
    "OleGURPS.Weapon.SearchNone": "No matches found",
    "OleGURPS.Weapon.SearchCount": "{total} matches found",
    "OleGURPS.Weapon.SearchLimited": "Showing {shown} of {total} matches",
    "OleGURPS.Weapon.Cartridge": "cartridge",
    "OleGURPS.Weapon.AmmoFamily": "family",
    "OleGURPS.Weapon.Parameters": "Attack parameters",
    "OleGURPS.Weapon.Scope": "Scope",
    "OleGURPS.Weapon.Save": "Save",
    "OleGURPS.Weapon.Reset": "Reset attack parameters",
    "OleGURPS.Weapon.Invalid": "Invalid attack parameters",
    "OleGURPS.Weapon.SkillInvalid": "Skill must be an integer from 0 to 999",
    "OleGURPS.Weapon.RofInvalid": "RoF is not recognized by Fire Control",
    "OleGURPS.Weapon.AccInvalid": "Acc must be an integer from 0 to 999",
    "OleGURPS.Weapon.ScopeInvalid": "Scope must be a non-negative integer",
    "OleGURPS.Weapon.BulkInvalid": "Bulk must be an integer",
    "OleGURPS.Weapon.RclInvalid": "Rcl must have the form 2 or 2/1",
    "OleGURPS.Weapon.NoAttacks": "No ranged attacks found on the selected actor",
    "OleGURPS.Weapon.NoMagazines": "This weapon has no configured magazines"
  },
  "ru": Object.fromEntries(Object.entries(russianUI).filter(([key]) => key.startsWith("OleGURPS.Weapon.")).map(([key, value]) => [key, value]))
};

import { moduleText } from "../localization.js";
export function weaponText(name, runtime = globalThis) {
  const key = "OleGURPS.Weapon." + name;
  return moduleText(key, {}, fallback.ru[key]);
}
