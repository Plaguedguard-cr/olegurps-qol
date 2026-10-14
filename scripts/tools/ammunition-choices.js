import { moduleText } from "../localization.js";
// Presentation never grants admission. AmmoService rechecks the live type before a write.
export function ammunitionChoiceGroup(type) {
  if (type.historical) return "historical";
  if (!type.unavailable) return "available";
  const prepared=type.preparation;
  // A complete, previously approved OleGURPS library design still needs an actionable GM approval under strict policy.
  const calculatedDesign=prepared?.state==='complete' && prepared.origin==='calculated' && prepared.model?.status==='resolved' &&
    type.recipe?.autoProfile?.source?.kind==='gm' && prepared.rulesStatus!=='incompatible';
  if (type.ballisticsRequired && !type.recipe || type.preparation?.baseStatus === "compatible" &&
      (type.preparation?.referenceConfirmed || type.preparation?.rulesStatus === "compatible" || calculatedDesign) &&
      type.preparation?.state !== "incompatible") return "conditional";
  return "hidden";
}
export function choiceGroupsHTML(types, selected, escape) {
  const labels = {available:moduleText("OleGURPS.AmmoUX.Choices1"), conditional:moduleText("OleGURPS.AmmoUX.Choices2"), historical:moduleText("OleGURPS.AmmoUX.Choices3")};
  return Object.entries(labels).map(([group,label]) => {
    const rows = types.filter(t => ammunitionChoiceGroup(t) === group);
    return rows.length ? `<optgroup label="${label}">${rows.map(t =>
      `<option value="${escape(t.key)}" ${t.key === selected ? "selected" : ""} title="${escape(t.reason || t.label || t.name)}" ${t.substitution ? 'class="gam-substitution"' : ''}>${escape(t.label ?? t.name)}${group === "conditional" ? moduleText("OleGURPS.AmmoUX.Choices4") : ""}</option>`).join("")}</optgroup>` : "";
  }).join("");
}
