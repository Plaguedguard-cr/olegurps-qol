import { moduleText } from "./localization.js";
// Fixed module document IDs, display names only. Commands and permissions stay native.
export const macroLabels = Object.freeze(Object.fromEntries([
  "OQDamageMacro001","OQLuckMacro00001","OQMeleeAssist001","OQcritical000001","OQexplosion00001",
  "OQfalling0000001","OQfirecontrol001","OQfright00000001","OQreaction000001","OQshooting000001"
].map(id=>[id,moduleText("OleGURPS.Macro."+id)])));
