import { calculateExplosiveRecipe } from "./explosive-ammunition-model.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import { escapeWeaponHTML as escape } from "./weapon-configuration.js";
import { isExplosiveRecipe } from "./automatic-ammunition-profiles.js";
import { automaticAmmoText } from "./automatic-ammunition-localization.js";

export function recipePreviewHTML(variantId, parameters, language) {
  const t = name => explosiveText(name, {}, language), model = calculateExplosiveRecipe(variantId, parameters);
  return `<div data-recipe-preview role="status"><strong>${escape(t(model.status === "resolved" ? "Resolved" : "Unresolved"))}</strong>` +
    `<div>${escape(t("Explosion"))}: ${escape(model.explosion.formula ?? t("Unresolved"))} · ${escape(t("Fragmentation"))}: ${escape(model.fragmentation.formula ?? t("Unresolved"))}</div>` +
    model.reasons.map(reason=>`<div>${escape(t(reason))}</div>`).join("") +
    model.warnings.map(reason=>`<div role="alert">${escape(t(reason))}</div>`).join("") + `</div>`;
}
export function recipeEditorHTML(ui, selectedType, language) {
  const t = name => explosiveText(name, {}, language), gm = globalThis.game?.user?.isGM;
  if (!isExplosiveRecipe(selectedType)) return "";
  if (!["ht_apex","ht_aphex"].includes(selectedType.recipe.variantId)) {
    const profile=selectedType.preparation;
    const components=profile?.model?.components??[];
    return `<details data-published-explosive><summary>${escape(t("P4Components"))}</summary><p>${escape(t(profile?.state==="complete"?"P4LinkedFollowUp":profile?.reasons?.[0]??"P4ConstructionMissing"))}</p>`+
      components.map(c=>`<div>${escape(t({kinetic:selectedType.recipe.variantId==="ht_ms_heat"?"P4Precursor":"P4Primary",linked:"P4Linked","main-charge":"P4MainCharge","follow-up":"Explosion",fragmentation:"Fragmentation"}[c.role]))}: ${escape(c.formula)}</div>`).join("")+`<p>${escape(t("P4Conditions"))}</p></details>`;
  }
  const at = (name, values) => automaticAmmoText(name, language, values), profile = selectedType.preparation;
  const variant = selectedType.recipe.variantId === "ht_apex" ? "APEX" : "APHEX";
  const summary = profile ? `<div data-explosive-profile role="status"><strong>${escape(profile.origin === "incomplete" ? variant : at(profile.origin === "reference" ? "Reference" : profile.origin === "calculated" ? "Calculated" : "GM"))}</strong>
    <div>${escape(at(profile.state === "complete" ? "Ready" : "Incomplete"))}${profile.state === "complete" && !profile.admission?.allowed ? " · " + escape(at(profile.admission?.authority === "revoked" ? "Revoked" : "ApprovalRequired")) : ""}</div>
    ${profile.state === "complete" ? `<div>${escape(t("Explosion"))}: ${escape(profile.model.explosion.formula)} · ${escape(t("Fragmentation"))}: ${escape(profile.model.fragmentation.formula)}</div>` :
      `<p class="hint">${escape(profile.missing?.length ? at("Missing", { fields: profile.missing.map(field=>at(field)).join(", ") }) :
        profile.reasons?.map(reason=>at(reason) === reason ? t(reason) : at(reason)).join("; ") ?? at("AutomaticInputsMissing"))}</p>`}
    ${gm && profile.state !== "complete" ? `<p class="hint">${escape(at("GMSetup"))}</p>` : ""}</div>` : "";
  if (!gm) return summary;
  const recipe = ui.recipe?.variantId === selectedType.recipe.variantId ? ui.recipe : selectedType.recipe, p = recipe.parameters ?? {};
  const fields = [["projectileMassG","ProjectileMass"],["explosiveMassG","ExplosiveMass"],["ref","REF"],["fragmentMassG","FragmentMass"],
    ["referenceMassG","ReferenceMass"],["referenceDice","ReferenceDice"],["q","Q"]];
  const inputs = fields.map(([name,label])=>`<label>${escape(t(label))}<input data-recipe-field type="number" name="recipe-${name}" step="any" min="0" value="${escape(p[name] ?? (name === "q" ? 1 : ""))}" ${gm ? "" : "disabled"}></label>`).join("");
  return summary + `<details data-recipe-editor ${ui.recipeOpen ? "open" : ""}><summary>${escape(at("Settings", { variant }))}</summary>
    <div class="gam-inventory-add">
      <input type="hidden" name="recipe-variant" value="${selectedType.recipe.variantId}"><strong>${escape(t("Variant"))}: ${variant}</strong>
      <label>${escape(t("Name"))}<input data-recipe-field name="recipe-name" value="${escape(recipe.label ?? "")}" ${gm ? "" : "disabled"}></label>
      ${inputs}
      <label>${escape(t("SourceKind"))}<select data-recipe-field name="recipe-source-kind" ${gm ? "" : "disabled"}><option value="gm">GM</option><option value="reference" ${p.source?.kind === "reference" ? "selected" : ""}>${escape(t("Reference"))}</option></select></label>
      <label>${escape(t("Source"))}<input data-recipe-field name="recipe-source" value="${escape(p.source?.note ?? "")}" ${gm ? "" : "disabled"}></label>
      <label>${escape(t("ReferenceSource"))}<input data-recipe-field name="recipe-referenceSource" value="${escape(p.referenceSource ?? "")}" ${gm ? "" : "disabled"}></label>
    </div><p class="hint">${escape(t("NeutralQ"))}</p><p class="hint">${escape(t("ModelNotice"))}</p>
    ${recipePreviewHTML(recipe.variantId, p, language)}
    ${gm ? `<p class="hint">${escape(t("RevisionNotice"))}</p><button type="button" data-inventory-action="save-custom-recipe">${escape(t("Save"))}</button>` : ""}
    ${gm && selectedType?.recipe?.customId ? `<div class="gam-inventory-actions"><button type="button" data-inventory-action="approve-recipe">${escape(t("Approve"))}</button><button type="button" data-inventory-action="revoke-recipe">${escape(t("Revoke"))}</button></div>` : ""}
  </details>`;
}
export function captureRecipeInputs(root, ui) {
  if (!root?.querySelector('[name="recipe-variant"]')) return;
  const value = name => root.querySelector('[name="recipe-' + name + '"]')?.value ?? "";
  const parameters = {};
  for (const field of ["projectileMassG","explosiveMassG","ref","fragmentMassG","referenceMassG","referenceDice","q"])
    parameters[field] = value(field).trim() === "" ? null : Number(value(field));
  parameters.referenceSource = value("referenceSource");
  parameters.source = { kind: value("source-kind"), note: value("source") };
  ui.recipe = { variantId: value("variant"), label: value("name"), parameters };
  ui.recipeOpen = root.querySelector("[data-recipe-editor]")?.open ?? false;
}
