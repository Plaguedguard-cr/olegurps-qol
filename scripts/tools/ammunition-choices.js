import { moduleText } from "../localization.js";
// Presentation never grants admission. AmmoService rechecks the live type before a write.
export function ammunitionChoiceGroup(type) {
  if (type.inventoryOnly) return type.unavailable ? 'historical' : 'existing';
  if (type.historical) return "historical";
  if (type.platformBlocked) return "hidden";
  if (!type.unavailable) return type.book === 'ut' ? type.recipe ? 'ut-special' : 'ut-base' : "available";
  const prepared=type.preparation;
  if(prepared?.baseStatus==='compatible'&&prepared.state!=='incompatible'&&
      ['ht_apex','ht_aphex','ht_apdu','ht_apdsdu','ht_apfsdsdu','ht_match_handloaded'].includes(type.recipe?.variantId))return 'conditional';
  if(prepared?.baseStatus==='compatible'&&prepared.state!=='incompatible'&&prepared.facts?.multishotOption)return 'conditional';
  // Keep incomplete legacy library designs visible for parameter review. Presentation grants no admission.
  const calculatedDesign=prepared?.state==='complete' && prepared.origin==='calculated' && prepared.model?.status==='resolved' &&
    type.recipe?.autoProfile?.source?.kind==='gm' && prepared.rulesStatus!=='incompatible';
  if (type.ballisticsRequired && !type.recipe || type.preparation?.baseStatus === "compatible" &&
      (type.preparation?.referenceConfirmed || type.preparation?.rulesStatus === "compatible" || calculatedDesign) &&
      type.preparation?.state !== "incompatible") return "conditional";
  return "hidden";
}
export function choiceGroupsHTML(types, selected, escape) {
  const labels = {existing:moduleText('OleGURPS.Ammo.CampaignTLExisting'), available:moduleText("OleGURPS.AmmoUX.Choices1"), 'ut-base':moduleText('OleGURPS.AttackProfile.UTBaseChoices'),
    'ut-special':moduleText('OleGURPS.AttackProfile.UTSpecialChoices'), conditional:moduleText("OleGURPS.AmmoUX.Choices2"), historical:moduleText("OleGURPS.AmmoUX.Choices3")};
  return Object.entries(labels).map(([group,label]) => {
    const rows = types.filter(t => ammunitionChoiceGroup(t) === group);
    return rows.length ? `<optgroup label="${label}">${rows.map(t =>
      `<option value="${escape(t.key)}" ${t.key === selected ? "selected" : ""} title="${escape(t.reason || t.label || t.name)}" ${t.substitution ? 'class="gam-substitution"' : ''}>${escape(t.label ?? t.name)}${group === "conditional" ? moduleText("OleGURPS.AmmoUX.Choices4") : ""}</option>`).join("")}</optgroup>` : "";
  }).join("");
}
