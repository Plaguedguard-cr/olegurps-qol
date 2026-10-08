import { createStandaloneAttack, getTokenFireRangeContext, measureCanvasPointDistanceYards, measureTokenDistanceYards } from "./fire-control-context.js";
import { normalizeVisibility, visibilityRules } from "./limited-visibility.js";
import { selectBlindFireHex } from "./blind-fire-hex-selection.js";
import { getSafeTargetName, clearFoundryTargets, replaceFoundryTargets } from "./foundry-targets.js";
import { getFireSkillPreview, skillProbabilityColor } from "./fire-skill-preview.js";
import { calculateEffectiveDistance, findRangeBandForDistance, resolveElevationRange } from "./fire-range-service.js";
import { TargetingService } from "./targeting-service.js";
import { createTargetedAttackContext } from "./targeted-attack-service.js";
import { listRangedGoverningSkills, resolveRangedGoverningSkill,
  bindingForGoverningSkill } from "./ranged-governing-skill-service.js";
import { getAimStatusSeconds } from "./aim-status-effects.js";
import { getRangedRapidStrikeSpecialties, resolveRangedRapidStrike, validateRangedRapidStrikeSplit } from "./ranged-rapid-strike-service.js";
import { findCloseHipShooting, resolveCloseHipShooting } from "./close-hip-shooting-service.js";
import { RangedTechniquesApp } from "./ranged-techniques-app.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

const FIRE_PREPARATION_CSS = `
  .gam-visibility { display: grid; gap: 4px; padding: 6px 8px; border: 1px solid rgba(153, 102, 255, .5); border-radius: 5px; }
  .gam-visibility-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .gam-visibility-header h4 { margin: 0; }
  .gam-visibility-header button { width: auto; min-height: 24px; padding: 2px 7px; }
  .gam-visibility-fields { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  .gam-visibility-fields label, .gam-visibility-location label { display: inline-flex; align-items: center; gap: 4px; margin: 0; }
  .gam-visibility-fields select { width: auto; min-height: 24px; margin: 0; }
  .gam-visibility-fields input[type="number"], .gam-visibility-location input[type="number"] { width: 62px; margin: 0; }
  .gam-visibility-location { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 5px; }
  .gam-visibility-location strong { margin-right: 3px; }
  .gam-visibility-location button { width: auto; min-height: 24px; margin: 0; padding: 2px 7px; line-height: 1.2; }
  .gam-visibility-location button.is-selected { background: rgba(119, 69, 180, .56); border-color: #c7a3ef; box-shadow: inset 0 2px 5px rgba(0, 0, 0, .55); transform: translateY(1px); }
  .gam-visibility-location-status { flex: 1 1 180px; min-width: 0; }
  .gam-visibility-breakdown { display: flex; flex-wrap: wrap; gap: 3px 10px; }
  .gam-visibility p { margin: 0; line-height: 1.2; }
  .gam-fire-rof-container { min-width: 0; }
  .gam-fire-rof-row {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .gam-fire-rof-row.has-rrs-slots { grid-template-columns: minmax(0, 1fr) max-content; }
  .gam-fire-rof-row .gam-fire-rof-full-auto,
  .gam-fire-rof-row .gam-fire-rof-multiple { grid-column: auto; }
  .gam-fire-rof-row .gam-fire-rof-full-auto { flex-wrap: wrap; }
  .gam-fire-manual-stats { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px; }
  .gam-fire-manual-stats label { display: inline-flex; align-items: center; gap: 5px; }
  .gam-fire-manual-stats input { width: 68px; margin: 0; }
  .gam-fire-shotgun { display: inline-flex; align-items: center; gap: 5px; }
  .gam-fire-shotgun input[type="checkbox"] { width: auto; margin: 0; }
  .gam-fire-shotgun input[name="projectileMultiplier"] { width: 56px; margin: 0; }
  .gam-fire-shotgun input[name="projectileMultiplier"]:disabled { opacity: 0.45; }
  .gam-fire-source-skill input { width: 68px; margin: 0; }
  .gam-fire-missing-stats { display: block; color: #e5bd73; min-height: 1em; }

  .gam-fire-preparation {
    display: grid;
    gap: 12px;
    width: 100%;
    max-height: 82vh;
    overflow-y: auto;
    padding: 2px 8px 2px 2px;
    box-sizing: border-box;
    font-size: 0.92em;
  }

  .gam-fire-preparation,
  .gam-fire-preparation * { box-sizing: border-box; }

  .gam-fire-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 9px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.32);
  }

  .gam-fire-summary-main { min-width: 0; }
  .gam-fire-governing-skill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    margin-top: 5px;
    font-size: 0.86em;
    color: rgba(230, 224, 216, 0.82);
  }
  .gam-fire-governing-skill select {
    width: auto;
    min-width: 120px;
    max-width: 220px;
    height: 26px;
    margin: 0;
  }
  .gam-fire-summary h3 { margin: 0 0 4px; }
  .gam-fire-summary p { margin: 0; opacity: 0.82; }
  .gam-fire-attack-stats {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gam-fire-skill {
    display: grid;
    flex: 0 0 auto;
    justify-items: end;
    gap: 2px;
    text-align: right;
    white-space: nowrap;
  }

  .gam-fire-skill-label,
  .gam-fire-source-skill { font-size: 0.82em; opacity: 0.72; }
  .gam-fire-skill-value { font-size: 1.22em; }

  .gam-fire-layout {
    display: grid;
    grid-template-columns: minmax(400px, 1fr) minmax(430px, 1fr);
    align-items: start;
    gap: 16px;
  }

  .gam-fire-left,
  .gam-fire-targeting { display: grid; gap: 11px; min-width: 0; }

  .gam-fire-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }

  .gam-fire-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(90px, 130px);
    align-items: center;
    gap: 8px;
  }

  .gam-fire-field input { width: 100%; margin: 0; }
  .gam-fire-field input::placeholder,
  .gam-fire-aim input::placeholder { color: currentColor; opacity: 0.45; }
  .gam-fire-field-checkbox {
    align-self: start;
    min-height: 34px;
  }
  .gam-fire-field-checkbox input { width: auto; justify-self: start; }

  .gam-fire-aim,
  .gam-fire-braced {
    display: grid;
    grid-template-columns: 46px 60px auto auto auto;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .gam-fire-aim { min-height: 34px; }

  .gam-fire-aim input {
    width: 60px;
    margin: 0;
  }

  .gam-fire-aim-effective,
  .gam-fire-aim-bonus { white-space: nowrap; }

  .gam-fire-braced input {
    grid-column: 2;
    justify-self: start;
    width: auto;
    margin: 0;
  }


  .gam-fire-rof {
    padding: 8px 10px;
    border: 1px solid rgba(128, 128, 128, 0.32);
    border-radius: 5px;
    text-align: center;
  }
  .gam-fire-rof-full-auto {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    text-align: left;
  }

  .gam-fire-rof-mode {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .gam-fire-rof-mode select {
    width: auto;
    min-width: 82px;
    margin: 0;
  }

  .gam-rrs-toggle {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 6px;
    width: max-content;
    max-width: 100%;
    min-height: 34px;
    white-space: nowrap;
  }
  .gam-rrs-toggle input { width: auto; margin: 0; }
  .gam-techniques-button { width: max-content; min-height: 28px; padding: 3px 10px; margin: 0; }
  .gam-rrs-slots { align-items: center; flex-wrap: nowrap; white-space: nowrap; }
  .gam-rrs-slots [data-rrs-split] { min-width: 82px; font-variant-numeric: tabular-nums; }
  .gam-rrs-slots [data-invalid="true"] { color: #e5bd73; }


  .gam-fire-rof-multiple {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
    gap: 6px 14px;
    text-align: left;
  }

  .gam-fire-rof-multiple span {
    min-width: 0;
    white-space: normal;
  }

  .gam-fire-range-heading,
  .gam-hit-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 5px;
  }

  .gam-fire-range-heading h4,
  .gam-fire-range-heading p,
  .gam-hit-heading h4,
  .gam-hit-heading p { margin: 0; }
  .gam-fire-range-heading p,
  .gam-hit-heading p { opacity: 0.72; font-size: 0.82em; }

  .gam-hit-heading-controls {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    min-width: 0;
  }

  .gam-hit-heading-controls select {
    width: auto;
    min-width: 118px;
    height: 28px;
    margin: 0;
    padding-block: 1px;
  }

  .gam-fire-elevation-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin-left: auto;
  }

  .gam-fire-height-field,
  .gam-fire-high-ground {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .gam-fire-height-field input {
    width: 72px;
    height: 26px;
    margin: 0;
  }

  .gam-fire-height-unit { opacity: 0.72; font-size: 0.82em; }
  .gam-fire-elevation-separator { opacity: 0.5; }
  .gam-fire-high-ground input { margin: 0; }

  .gam-fire-effective-distance {
    margin: 0 0 6px;
    padding: 5px 8px;
    border-left: 3px solid #b84646;
    border-radius: 3px;
    background: rgba(155, 38, 38, 0.12);
    color: inherit;
  }

  .gam-fire-effective-distance[hidden] { display: none; }

  .gam-fire-range-list {
    display: grid;
    gap: 3px;
    max-height: 440px;
    overflow-y: auto;
    padding: 2px;
  }

  .gam-fire-range-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(128px, auto);
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 29px;
    margin: 0;
    padding: 4px 8px;
    border: 1px solid rgba(128, 128, 128, 0.34);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.025);
    color: inherit;
    text-align: left;
  }

  .gam-fire-range-row.recommended {
    outline: 1px dashed #5aa6d8;
    outline-offset: -3px;
    background: rgba(40, 110, 160, 0.16);
  }

  .gam-fire-range-row.selected {
    border-color: #e79027;
    box-shadow: inset 4px 0 0 #e79027;
    background: rgba(190, 105, 25, 0.18);
  }

  .gam-fire-range-row.selected.recommended {
    background: linear-gradient(90deg, rgba(190, 105, 25, 0.2), rgba(40, 110, 160, 0.18));
  }

  .gam-fire-range-row.elevation-recommended {
    border-color: #b84646;
    box-shadow: inset -4px 0 0 #b84646;
    background: rgba(155, 38, 38, 0.14);
  }

  .gam-fire-range-row.selected.elevation-recommended {
    border-color: #e79027;
    box-shadow: inset 4px 0 0 #e79027, inset -4px 0 0 #b84646;
    background: linear-gradient(90deg, rgba(190, 105, 25, 0.2), rgba(155, 38, 38, 0.17));
  }

  .gam-fire-range-row.recommended.elevation-recommended {
    background: linear-gradient(90deg, rgba(40, 110, 160, 0.18), rgba(155, 38, 38, 0.17));
  }

  .gam-fire-range-row.selected.recommended.elevation-recommended {
    box-shadow: inset 4px 0 0 #e79027, inset -4px 0 0 #b84646;
    background: linear-gradient(
      90deg,
      rgba(190, 105, 25, 0.2) 0%,
      rgba(40, 110, 160, 0.18) 50%,
      rgba(155, 38, 38, 0.17) 100%
    );
  }

  .gam-fire-range-row.gam-rrs-range-1 {
    border-color: var(--gam-rapid-attack-1, #39a9ff) !important;
    box-shadow: inset 4px 0 var(--gam-rapid-attack-1, #39a9ff) !important;
    background: rgba(57, 169, 255, 0.18) !important;
  }
  .gam-fire-range-row.gam-rrs-range-2 {
    border-color: var(--gam-rapid-attack-2, #ff5aa5) !important;
    box-shadow: inset 4px 0 var(--gam-rapid-attack-2, #ff5aa5) !important;
    background: rgba(255, 90, 165, 0.18) !important;
  }
  .gam-fire-range-row.gam-rrs-range-1.gam-rrs-range-2 {
    box-shadow: inset 4px 0 var(--gam-rapid-attack-1, #39a9ff),
      inset -4px 0 var(--gam-rapid-attack-2, #ff5aa5) !important;
    background: linear-gradient(90deg, rgba(57, 169, 255, 0.18), rgba(255, 90, 165, 0.18)) !important;
  }

  .gam-fire-range-penalty { min-width: 34px; text-align: right; }

  .gam-fire-range-markers {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    font-size: 0.78em;
  }

  .gam-fire-range-marker {
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
  }

  .gam-fire-range-marker-selected { background: rgba(210, 120, 30, 0.28); }
  .gam-fire-range-marker-recommended { background: rgba(55, 135, 190, 0.28); }
  .gam-fire-range-marker-elevation { background: rgba(175, 48, 48, 0.3); }

  .gam-hit-panel {
    display: grid;
    grid-template-columns: minmax(220px, 1.08fr) minmax(185px, 0.92fr);
    align-items: start;
    gap: 10px;
  }

  .gam-hit-map {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 941 / 1672;
    overflow: hidden;
    border: 1px solid rgba(128, 128, 128, 0.38);
    border-radius: 7px;
    background: #000;
  }

  .gam-hit-stage {
    position: relative;
    width: 100%;
    aspect-ratio: var(--gam-hit-aspect, 941 / 1672);
    max-height: 100%;
  }

  .gam-hit-stage img,
  .gam-hit-overlay {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .gam-hit-stage img { object-fit: fill; pointer-events: none; }
  .gam-hit-overlay { overflow: hidden; pointer-events: none; }
  .gam-hit-region { pointer-events: all; cursor: pointer; outline: none; }
  .gam-hit-region[aria-disabled="true"] { pointer-events: none; cursor: not-allowed; }

  .gam-hit-region-shape {
    fill: var(--zone-color);
    fill-opacity: 0;
    stroke: transparent;
    stroke-width: 2px;
    vector-effect: non-scaling-stroke;
    transition: fill-opacity 100ms ease, stroke 100ms ease, filter 100ms ease;
  }

  .gam-hit-region.has-base-fill .gam-hit-region-shape {
    fill-opacity: 0.82;
    stroke: #fff;
    stroke-width: 1.25px;
  }

  .gam-hit-region-shape.has-base-fill {
    fill-opacity: 0.82;
  }

  .gam-hit-region.is-hovered .gam-hit-region-shape {
    fill-opacity: 0.35;
    stroke: var(--zone-color);
    filter: drop-shadow(0 0 4px var(--zone-color));
  }

  .gam-hit-region.is-selected .gam-hit-region-shape {
    fill-opacity: 0.5;
    stroke: #fff;
    filter: drop-shadow(0 0 5px var(--zone-color));
  }

  .gam-hit-region.has-base-fill.is-hovered .gam-hit-region-shape,
  .gam-hit-region.has-base-fill.is-selected .gam-hit-region-shape,
  .gam-hit-region.is-hovered .gam-hit-region-shape.has-base-fill,
  .gam-hit-region.is-selected .gam-hit-region-shape.has-base-fill {
    fill-opacity: 0.82;
  }

  .gam-hit-region.has-base-outline .gam-hit-region-shape {
    stroke: #fff;
    stroke-width: 1.25px;
  }

  .gam-hit-region.has-base-outline.is-selected .gam-hit-region-shape { stroke-width: 2px; }
  .gam-hit-region.has-base-outline.is-hovered:not(.is-selected) .gam-hit-region-shape {
    stroke: var(--zone-color);
    stroke-width: 2px;
  }

  .gam-hit-region-marker { pointer-events: none; }
  .gam-hit-region-marker .gam-hit-region-shape {
    fill-opacity: 0 !important;
    stroke-width: 2.5px;
    vector-effect: non-scaling-stroke;
  }
  .gam-hit-region-marker.gam-rapid-attack-1 .gam-hit-region-shape {
    stroke: var(--gam-rapid-attack-1, #39a9ff);
    filter: drop-shadow(0 0 2px var(--gam-rapid-attack-1, #39a9ff));
  }
  .gam-hit-region-marker.gam-rapid-attack-2 .gam-hit-region-shape {
    stroke: var(--gam-rapid-attack-2, #ff5aa5);
    stroke-dasharray: 7 4;
    filter: drop-shadow(0 0 2px var(--gam-rapid-attack-2, #ff5aa5));
  }
  .gam-hit-region-marker.gam-rapid-attack-3 .gam-hit-region-shape {
    stroke: var(--gam-rapid-attack-3, #f2ba53);
    stroke-dasharray: 3 3;
    filter: drop-shadow(0 0 2px var(--gam-rapid-attack-3, #f2ba53));
  }
  .gam-hit-region-marker.is-active .gam-hit-region-shape { stroke-width: 4px; }

  .gam-hit-list {
    display: grid;
    min-width: 0;
    gap: 3px;
    max-height: none;
    overflow: visible;
    padding: 1px;
  }

  .gam-hit-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: auto;
    min-height: 34px;
    overflow: hidden;
    margin: 0;
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--zone-color) 48%, transparent);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.025);
    color: inherit;
    text-align: left;
    white-space: normal;
  }

  .gam-hit-row-color {
    width: 8px;
    height: 19px;
    border-radius: 3px;
    background: var(--zone-color);
  }

  .gam-hit-row-label {
    display: block;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.08;
    white-space: normal;
  }

  .gam-hit-selection-markers {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-width: 0;
  }
  .gam-hit-selection-marker {
    width: 9px;
    height: 9px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    opacity: 0.72;
  }
  .gam-hit-selection-marker.gam-rapid-attack-1 { background: var(--gam-rapid-attack-1, #39a9ff); color: var(--gam-rapid-attack-1, #39a9ff); }
  .gam-hit-selection-marker.gam-rapid-attack-2 { background: var(--gam-rapid-attack-2, #ff5aa5); color: var(--gam-rapid-attack-2, #ff5aa5); }
  .gam-hit-selection-marker.gam-rapid-attack-3 { background: var(--gam-rapid-attack-3, #f2ba53); color: var(--gam-rapid-attack-3, #f2ba53); }
  .gam-hit-selection-marker.is-active {
    opacity: 1;
    box-shadow: 0 0 5px currentColor;
    transform: scale(1.22);
  }

  .gam-hit-row-penalty {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    min-width: 26px;
    text-align: right;
    white-space: nowrap;
  }
  .gam-hit-row-penalty-base.has-ta { color: #e45b64; }
  .gam-hit-row-penalty-arrow { opacity: 0.72; }
  .gam-hit-row-penalty-effective { color: #67c985; }
  .gam-hit-row-ta { font-size: 0.72em; color: #67c985; }

  .gam-hit-row.is-hovered {
    background: color-mix(in srgb, var(--zone-color) 28%, transparent);
    box-shadow: inset 3px 0 0 var(--zone-color);
  }

  .gam-hit-row.is-selected {
    border-color: var(--zone-color);
    background: color-mix(in srgb, var(--zone-color) 42%, transparent);
    box-shadow: inset 4px 0 0 var(--zone-color), 0 0 5px color-mix(in srgb, var(--zone-color) 55%, transparent);
  }

  .gam-hit-row:disabled { opacity: 0.38; cursor: not-allowed; }

  .gam-fire-actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid rgba(128, 128, 128, 0.32);
    background: rgba(12, 12, 20, 0.96);
    box-shadow: 0 -6px 12px rgba(0, 0, 0, 0.28);
  }

  .gam-fire-actions button { width: 100%; min-height: 36px; margin: 0; }

  @media (max-width: 900px) {
    .gam-fire-layout { grid-template-columns: 1fr; }
    .gam-hit-panel { grid-template-columns: minmax(220px, 0.8fr) minmax(200px, 1.2fr); }
  }

  @media (max-width: 560px) {
    .gam-fire-rof-row.has-rrs-slots { grid-template-columns: minmax(0, 1fr); }
    .gam-rrs-slots { flex-wrap: wrap; }
    .gam-fire-summary { align-items: flex-start; }
    .gam-fire-fields,
    .gam-fire-actions,
    .gam-hit-panel { grid-template-columns: 1fr; }
    .gam-fire-range-row { grid-template-columns: minmax(0, 1fr) auto; }
    .gam-fire-range-markers { grid-column: 1 / -1; justify-content: flex-start; }
    .gam-hit-map { max-width: 270px; justify-self: center; }
  }
`;

const escapeHTML = value => {
  const text = String(value ?? "");
  if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const svgCoordinate = value => (Number(value) * 1000).toFixed(1);
const formatDistance = value => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3
}).format(Number(value));

const formatAttackStat = value => String(value ?? "").trim() || "—";

export class FirePreparationApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "olegurps-fire-preparation",
    classes: ["olegurps-qol", "fire-preparation"],
    tag: "section",
    window: { title: "Подготовка выстрела", resizable: true },
    position: { width: 1120, height: "auto" }
  };

  constructor({ mode = "weapon", parseRateOfFire, token, actor = null, weapon, attack, rangeBands, recommendation, getTargetRangeRecommendation, beamWeapon = false, targetingService, targetedAttackContext = null, initialGoverningSpecialty = "", initialStandaloneValues = null, maximumShots, rateOfFireProfile, calculateShotLimits, calculateRapidFireBonus, calculateAimBonus, calculateBracingBonus, calculateLaserBonus, calculateFireMode, calculateEffectiveSkill, onTargetingServiceChange, onGoverningSpecialtyChange, onStandaloneValuesChange, onConfirm, onClose, initialVisibility = null, onHearingCheck = null, placementApps = [] }, options = {}) {
    super({
      ...options,
      id: options.id ?? (mode === "standalone" ? "olegurps-fire-control-standalone" : `olegurps-fire-preparation-${token.id}-${weapon.id}`),
      window: { title: mode === "standalone" ? "Огонь — Fire Control" : `Огонь — ${weapon.name}`, resizable: true, ...(options.window ?? {}) }
    });
    this.mode = mode;
    this.parseRateOfFire = parseRateOfFire;
    this.token = token;
    this.actor = actor ?? token?.actor ?? null;
    this._aimManuallyEdited = false;
    this._lastAimStatusSeconds = mode === "melee" ? 0 : getAimStatusSeconds(token?.actor ?? actor);
    this.weapon = weapon;
    this.attack = attack;
    this.rangeBands = rangeBands;
    this.targetRangeRecommendationProvider = getTargetRangeRecommendation;
    this.visibility = normalizeVisibility(initialVisibility);
    this.placementApps = placementApps;
    this.recommendation = this._readTargetRangeRecommendation(recommendation);
    this.beamWeapon = beamWeapon;
    this.targetingService = targetingService;
    this._targetingServices = new Map([[targetingService.bodyplan, targetingService]]);
    this._bodyplanRequestId = 0;
    this.targetedAttackContext = targetedAttackContext;
    this.maximumShots = maximumShots;
    this.rateOfFireProfile = rateOfFireProfile;
    this.calculateShotLimits = calculateShotLimits;
    this.calculateRapidFireBonus = calculateRapidFireBonus;
    this.calculateAimBonus = calculateAimBonus;
    this.calculateBracingBonus = calculateBracingBonus;
    this.calculateLaserBonus = calculateLaserBonus;
    this.calculateFireMode = calculateFireMode;
    this.calculateEffectiveSkill = calculateEffectiveSkill;
    this.targetingServiceChangeCallback = onTargetingServiceChange;
    this.governingSpecialtyChangeCallback = onGoverningSpecialtyChange;
    this.standaloneValuesChangeCallback = onStandaloneValuesChange;
    this.confirmCallback = onConfirm;
    this.closeCallback = onClose;
    this.hearingCheckCallback = onHearingCheck;
    const defaultHitLocation = targetingService.getDefaultSelection();
    const initialRofMode = rateOfFireProfile?.type === "full-auto" ? "0" : null;
    const savedGoverningSpecialty = String(initialGoverningSpecialty ?? "").trim();
    const selectedSkill = resolveRangedGoverningSkill({ actor: this.actor,
      binding: attack?.governingSkillBinding });
    const governingSpecialty = selectedSkill?.specialty ?? targetedAttackContext?.automaticSpecialty ??
      (targetedAttackContext?.specialtyOptions.some(option => option.value === savedGoverningSpecialty)
        ? savedGoverningSpecialty
        : "");
    this.fireState = {
      skillLevel: "", acc: "", bulk: "", rcl: "", halfd: "",
      shotgun: false,
      projectileMultiplier: "",
      shots: "",
      rangedRapidStrike: false,
      closeHipShooting: false,
      governingSpecialty,
      governingSkillKey: selectedSkill?.key ?? "",
      rofMode: initialRofMode,
      manualModifier: "",
      aimSeconds: this._lastAimStatusSeconds ? String(this._lastAimStatusSeconds) : "",
      braced: false,
      laserSight: false,
      moveAndAttack: false,
      allOutAttack: false,
      height: "",
      elevationDirection: "level",
      selectedRangeIndex: null,
      manualRangeSelected: false,
      elevationSourceRangeIndex: null,
      bodyplanId: targetingService.bodyplan,
      hitLocation: { ...defaultHitLocation }
    };
    if (this.mode === "standalone" && initialStandaloneValues && typeof initialStandaloneValues === "object") {
      for (const name of ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier"]) {
        this.fireState[name] = String(initialStandaloneValues[name] ?? "");
      }
      this.fireState.shotgun = initialStandaloneValues.shotgun === true;
    }
    if (this.mode === "standalone") this._refreshStandaloneAttack();
    this._syncTargetElevation();
    this.recommendation = this._readTargetRangeRecommendation(recommendation);
    this._rrsSlots = null;
    this._techniqueApp = null;
    this._activeRrsSlot = 0;
    this._switchingRrsTarget = false;
    this._submitting = false;
    this._hexSelectionController = null;
    this._closeNotified = false;
    this._skillPreviewTimer = null;
    this._rangeLayoutObserver = null;
    this._targetHookId = null;
    this._tokenHookId = null;
    this._actorHookId = null;
    this._targetRefreshTimer = null;
    this._boundClick = this._onClick.bind(this);
    this._boundInput = this._onInput.bind(this);
    this._boundPointerOver = this._onPointerOver.bind(this);
    this._boundPointerOut = this._onPointerOut.bind(this);
    this._boundKeydown = this._onKeydown.bind(this);
    this._boundTargetToken = this._onTargetToken.bind(this);
    this._boundTokenUpdate = this._onTokenUpdate.bind(this);
    this._boundActorUpdate = this._onActorUpdate.bind(this);
  }

  async _prepareContext(_options) {
    return { fireState: this.fireState };
  }

  async _renderHTML(context, _options) {
    return this._buildContent(context.fireState);
  }

  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._registerTargetHook();
    if (this._actorHookId === null && globalThis.Hooks?.on)
      this._actorHookId = globalThis.Hooks.on("updateActor", this._boundActorUpdate);
    if (!this._skillPreviewTimer) {
      this._skillPreviewTimer = globalThis.setInterval(() => {
        this._syncAimStatusEffect();
        this._syncEvaluateStatusEffect?.();
        this._updateRapidFirePreview();
        this._updateSkillPreview();
      }, 300);
    }
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    if (!this._rangeLayoutObserver && globalThis.ResizeObserver) {
      this._rangeLayoutObserver = new globalThis.ResizeObserver(() => this._syncRangeListHeight());
      this._rangeLayoutObserver.observe(root);
    }
    if (!root.querySelector("style[data-gam-fire-style]")) {
      const style = document.createElement("style");
      style.dataset.gamFireStyle = "true";
      style.textContent = FIRE_PREPARATION_CSS;
      root.prepend(style);
    }
    if (root.dataset.gamFireListeners === "true") {
      this._updateTargetRecommendation();
      globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
      return;
    }
    root.addEventListener("click", this._boundClick);
    root.addEventListener("input", this._boundInput);
    root.addEventListener("change", this._boundInput);
    root.addEventListener("pointerover", this._boundPointerOver);
    root.addEventListener("pointerout", this._boundPointerOut);
    root.addEventListener("keydown", this._boundKeydown);
    root.dataset.gamFireListeners = "true";
    this._updateTargetRecommendation();
    globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
  }

  async updateWeaponAttack(attack, { rateOfFireProfile = null, maximumShots = null } = {}) {
    if (this.mode !== "weapon" || !attack) return;
    this._captureFields();
    this.attack = attack;
    this.targetedAttackContext = createTargetedAttackContext({ actor: this.actor, attack });
    this.rateOfFireProfile = rateOfFireProfile ?? this.parseRateOfFire?.(attack.rof) ?? this.rateOfFireProfile;
    this.maximumShots = maximumShots ?? this.maximumShots;

    if (this.rateOfFireProfile?.type === "full-auto") {
      const mode = Math.trunc(Number(this.fireState.rofMode));
      this.fireState.rofMode = String(this.rateOfFireProfile.modes?.[mode]?.index ?? 0);
    } else {
      this.fireState.rofMode = null;
    }

    const limits = this._getShotLimits(this.fireState);
    const currentShots = Math.trunc(Number(this.fireState.shots));
    if (!Number.isFinite(currentShots)) this.fireState.shots = String(limits.minShots);
    else this.fireState.shots = String(Math.min(limits.maxShots, Math.max(limits.minShots, currentShots)));
    if (this.fireState.rangedRapidStrike && !this._rrsAllowed()) {
      this.fireState.rangedRapidStrike = false;
      this._rrsSlots = null;
    }
    await this.render({ force: true });
  }
  async close(options = {}) {
    this._hexSelectionController?.abort();
    if (this._techniqueApp) await this._techniqueApp.close();
    if (this._skillPreviewTimer) {
      globalThis.clearInterval(this._skillPreviewTimer);
      this._skillPreviewTimer = null;
    }
    this._rangeLayoutObserver?.disconnect();
    this._rangeLayoutObserver = null;
    if (this._targetRefreshTimer) globalThis.clearTimeout(this._targetRefreshTimer);
    this._targetRefreshTimer = null;
    if (this._targetHookId !== null) globalThis.Hooks?.off?.("targetToken", this._targetHookId);
    if (this._tokenHookId !== null) globalThis.Hooks?.off?.("updateToken", this._tokenHookId);
    if (this._actorHookId !== null) globalThis.Hooks?.off?.("updateActor", this._actorHookId);
    this._targetHookId = null;
    this._tokenHookId = null;
    this._actorHookId = null;
    const result = await super.close(options);
    if (!this._closeNotified) {
      this._closeNotified = true;
      this.closeCallback?.(this);
    }
    return result;
  }

  async _pickBlindFireHex() {
    if (this._hexSelectionController) return null;
    const controller = new AbortController();
    this._hexSelectionController = controller;
    try {
      return await selectBlindFireHex(this, globalThis, controller.signal);
    } finally {
      if (this._hexSelectionController === controller) this._hexSelectionController = null;
    }
  }

  async activateVisibility(state = { mode: "partial", partialPenalty: -1 }) {
    this._captureFields();
    this.visibility = normalizeVisibility(state);
    if (this.visibility?.mode === "unseen") await clearFoundryTargets();
    if (!this.visibility) this.manualHearingLevel = "";
    this.recommendation = this._readTargetRangeRecommendation();
    await this.render({ force: true });
    this.bringToTop?.();
  }

  _syncTargetElevation() {
    if (this.visibility?.mode === "unseen" || this.visibility?.mode === "blind" && !this.visibility.knownLocation) return;
    const targets = [...(globalThis.game?.user?.targets ?? [])];
    const target = targets.length === 1 ? targets[0] : null;
    const context = target ? getTokenFireRangeContext({
      sourceToken: this.token, targetToken: target, rangeBands: this.rangeBands
    }) : null;
    if (context) {
      this.fireState.height = String(context.height);
      this.fireState.elevationDirection = context.elevationDirection;
      if (!this.fireState.manualRangeSelected) this.fireState.selectedRangeIndex = context.rangeIndex;
    } else if (!target && !this.fireState.manualRangeSelected) {
      this.fireState.selectedRangeIndex = null;
      this.fireState.height = "";
      this.fireState.elevationDirection = "level";
    }
  }

  _readTargetRangeRecommendation(fallback = null) {
    try {
      if (this.visibility?.mode === "unseen") {
        const hex = this.visibility.blindFireHex;
        const target = this._hasUnseenDirection() && this.visibility.targetTokenId
          ? globalThis.canvas?.tokens?.get?.(this.visibility.targetTokenId) : null;
        const distance = hex
          ? measureCanvasPointDistanceYards(this.token, globalThis.canvas?.grid?.getCenterPoint?.(hex))
          : target ? measureTokenDistanceYards(this.token, target) : null;
        if (!Number.isFinite(distance)) return null;
        const range = findRangeBandForDistance(this.rangeBands, distance);
        return range ? { rangeIndex: range.index, penalty: range.penalty, distance,
          source: hex ? "blind-fire-hex" : "known-token" } : null;
      }
      if (this.visibility?.mode === "blind" && !this.visibility.knownLocation) {
        if (!this.visibility.hex) return null;
        const center = globalThis.canvas?.grid?.getCenterPoint?.(this.visibility.hex);
        const distance = measureCanvasPointDistanceYards(this.token, center);
        const range = findRangeBandForDistance(this.rangeBands, distance);
        return range ? { rangeIndex: range.index, penalty: range.penalty, distance, source: "blind-fire-hex" } : null;
      }
      const targets = [...(globalThis.game?.user?.targets ?? [])];
      const target = targets.length === 1 ? targets[0] : null;
      const context = target ? getTokenFireRangeContext({
        sourceToken: this.token, targetToken: target, rangeBands: this.rangeBands
      }) : null;
      if (context) {
        const effectiveDistance = calculateEffectiveDistance(context.distance,
          this.fireState?.height ?? context.height, {
            elevationDirection: this.fireState?.elevationDirection ?? context.elevationDirection,
            beamWeapon: this.beamWeapon
          });
        const range = findRangeBandForDistance(this.rangeBands, effectiveDistance);
        return range ? { rangeIndex: range.index, penalty: range.penalty,
          distance: context.distance, effectiveDistance, source: "physical-target-distance" } : null;
      }
      if (this.fireState?.rangedRapidStrike) return null;
      if (typeof this.targetRangeRecommendationProvider === "function") {
        return this.targetRangeRecommendationProvider() ?? null;
      }
      return fallback ?? null;
    } catch (error) {
      console.warn("Не удалось обновить рекомендацию дистанции до target:", error);
      return null;
    }
  }

  _formatTargetRecommendation(recommendation = this.recommendation) {
    const label = this.visibility?.mode === "unseen"
      ? this.visibility.blindFireHex ? "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0433\u0435\u043a\u0441" : "\u0426\u0435\u043b\u044c"
      : this.visibility?.mode === "blind" && !this.visibility.knownLocation
        ? "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0433\u0435\u043a\u0441" : "GGA target";
    const penalty = recommendation ? Number(recommendation.penalty) : Number.NaN;
    if (!Number.isFinite(penalty)) return `${label}: \u043d\u0435\u0442 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438`;
    const distance = Number(recommendation?.distance);
    const distanceText = Number.isFinite(distance) ? `${formatDistance(distance)} \u044f\u0440\u0434\u043e\u0432 \u00b7 ` : "";
    return `${label}: ${distanceText}${penalty >= 0 ? "+" : ""}${penalty}`;
  }

  _registerTargetHook() {
    if (this._targetHookId !== null || !globalThis.Hooks?.on) return;
    this._targetHookId = globalThis.Hooks.on("targetToken", this._boundTargetToken);
    if (this._tokenHookId === null)
      this._tokenHookId = globalThis.Hooks.on("updateToken", this._boundTokenUpdate);
  }

  _onTokenUpdate(document, change) {
    if (!["x", "y", "elevation"].some(key => Object.hasOwn(change ?? {}, key))) return;
    const targets = [...(globalThis.game?.user?.targets ?? [])];
    const targetId = targets.length === 1 ? targets[0]?.id : null;
    if (document?.id !== this.token?.id && document?.id !== targetId &&
        document?.id !== this.visibility?.targetTokenId) return;
    this._onTargetToken(globalThis.game?.user);
  }

  _onActorUpdate(updated) {
    if (updated?.id !== this.actor?.id) return;
    this._captureFields();
    this.targetedAttackContext = createTargetedAttackContext({ actor: this.actor, attack: this.attack });
    this.render({ force: true });
  }

  _onTargetToken(user) {
    if (user && globalThis.game?.user && user !== globalThis.game.user) return;
    if (this._switchingRrsTarget) return;
    this._syncTargetElevation();
    if (this.fireState.rangedRapidStrike && this._rrsSlots) {
      const targets = [...(globalThis.game?.user?.targets ?? [])];
      this._rrsSlots[this._activeRrsSlot].targetId = targets.length === 1 ? targets[0].id : null;
    }
    if (this.visibility?.mode === "unseen" && this.visibility.targetTokenId &&
        ![...(globalThis.game?.user?.targets ?? [])].some(target => target.id === this.visibility.targetTokenId)) {
      this.visibility.targetTokenId = null;
    }
    if (this.visibility?.mode === "unseen" &&
        (!["approximate", "exact"].includes(this.visibility.location) ||
         this.visibility.blindFireHex)) {
      clearFoundryTargets().catch(error => console.warn("Unable to clear unseen target:", error));
    }
    if (this._targetRefreshTimer) globalThis.clearTimeout(this._targetRefreshTimer);
    this._targetRefreshTimer = globalThis.setTimeout(() => {
      this._targetRefreshTimer = null;
      this._updateTargetRecommendation();
      this._saveActiveRrsSlot();
      if (this.rendered) this.render({ force: true });
    }, 40);
  }

  _updateTargetRecommendation() {
    this.recommendation = this._readTargetRangeRecommendation();
    const confirm = this.element?.querySelector('button[data-fire-action="confirm"]');
    if (confirm && this.visibility?.mode === "unseen") confirm.disabled = !this._hasUnseenDirection();
    const recommendedIndex = Number.isInteger(this.recommendation?.rangeIndex)
      ? this.recommendation.rangeIndex
      : null;
    const summary = this.element?.querySelector("[data-target-recommendation]");
    if (summary) summary.textContent = this._formatTargetRecommendation();
    this._updateRrsRangeMarkers();
    for (const row of this.element?.querySelectorAll("[data-range-index]") ?? []) {
      const recommended = recommendedIndex === Number(row.dataset.rangeIndex);
      row.classList.toggle("recommended", recommended);
      const marker = row.querySelector("[data-target-marker]");
      if (marker) marker.hidden = !recommended;
    }
    this._updateRapidFirePreview();
    this._updateSkillPreview();
  }

  getStandaloneValues() {
    if (this.mode !== "standalone") return null;
    return {
      skillLevel: String(this.fireState.skillLevel ?? ""),
      acc: String(this.fireState.acc ?? ""),
      bulk: String(this.fireState.bulk ?? ""),
      rcl: String(this.fireState.rcl ?? ""),
      halfd: String(this.fireState.halfd ?? ""),
      shotgun: this.fireState.shotgun === true,
      projectileMultiplier: String(this.fireState.projectileMultiplier ?? "")
    };
  }

  _notifyStandaloneValuesChange() {
    const values = this.getStandaloneValues();
    if (!values || !this.standaloneValuesChangeCallback) return;
    try {
      const pending = this.standaloneValuesChangeCallback(values);
      pending?.catch?.(error => console.error("Не удалось сохранить параметры standalone Fire Control:", error));
    } catch (error) {
      console.error("Не удалось сохранить параметры standalone Fire Control:", error);
    }
  }

  _captureFields() {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    this.fireState.shots = root.querySelector('[name="shots"]')?.value ?? "";
    const rrsField = root.querySelector('[name="rangedRapidStrike"]');
    if (rrsField) this.fireState.rangedRapidStrike = !!rrsField.checked;
    this.fireState.rofMode = root.querySelector('[name="rofMode"]')?.value ?? this.fireState.rofMode;
    this.fireState.governingSkillKey = root.querySelector('[name="governingSkillKey"]')?.value ??
      this.fireState.governingSkillKey;
    this.fireState.manualModifier = root.querySelector('[name="manualModifier"]')?.value ?? "";
    const hearingField = root.querySelector('[name="manualHearing"]');
    if (hearingField) this.manualHearingLevel = hearingField.value;
    this.fireState.aimSeconds = root.querySelector('[name="aimSeconds"]')?.value ?? "";
    this.fireState.braced = !!root.querySelector('[name="braced"]')?.checked;
    this.fireState.laserSight = !!root.querySelector('[name="laserSight"]')?.checked;
    this.fireState.moveAndAttack = !!root.querySelector('[name="moveAndAttack"]')?.checked;
    this.fireState.allOutAttack = !!root.querySelector('[name="allOutAttack"]')?.checked;
    if (this.fireState.moveAndAttack && this.fireState.allOutAttack) this.fireState.allOutAttack = false;
    this.fireState.height = root.querySelector('[name="height"]')?.value ?? "";
    this.fireState.elevationDirection = root.querySelector('[name="highGround"]')?.checked ? "high"
      : root.querySelector('[name="lowGround"]')?.checked ? "low" : "level";
    if (this.mode === "standalone") {
      for (const name of ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier"]) {
        this.fireState[name] = root.querySelector(`[name="${name}"]`)?.value ?? this.fireState[name];
      }
      this.fireState.shotgun = !!root.querySelector('[name="shotgun"]')?.checked;
      this._refreshStandaloneAttack();
      this._notifyStandaloneValuesChange();
    }
  }

  _refreshStandaloneAttack() {
    if (this.mode !== "standalone") return;
    this.attack = createStandaloneAttack(this.fireState);
    this.rateOfFireProfile = this.parseRateOfFire?.(this.attack.rof) ?? this.rateOfFireProfile;
    this.fireState.rofMode = null;
  }

  _getShotsValue(fireState = this.fireState) {
    if (String(fireState.shots ?? "").trim() !== "") return fireState.shots;
    if (this.mode === "standalone" || this.rateOfFireProfile?.type === "full-auto") {
      return String(this._getShotLimits(fireState).minShots);
    }
    return fireState.shots;
  }

  getShotOptions() {
    const visibility = this.visibility
      ? { ...normalizeVisibility(this.visibility), partialPenalty: this.visibility.partialPenalty } : null;
    const rules = visibilityRules(visibility);
    const hex = visibility?.mode === "unseen" ? visibility.blindFireHex
      : visibility?.mode === "blind" && !visibility.knownLocation ? visibility.hex : null;
    const center = hex ? globalThis.canvas?.grid?.getCenterPoint?.(hex) : null;
    const selectedToken = visibility?.mode === "unseen" && this._hasUnseenDirection() && visibility.targetTokenId
      ? globalThis.canvas?.tokens?.get?.(visibility.targetTokenId) : null;
    const targetDistance = center ? measureCanvasPointDistanceYards(this.token, center)
      : selectedToken ? measureTokenDistanceYards(this.token, selectedToken) : null;
    return {
      shots: this._getShotsValue(),
      rangedRapidStrike: this.fireState.rangedRapidStrike,
      closeHipShooting: this.fireState.closeHipShooting,
      rangedRapidStrikePart: this.fireState.rangedRapidStrike,
      rofMode: this.fireState.rofMode,
      governingSpecialty: this.fireState.governingSpecialty,
      shotgun: this.fireState.shotgun,
      projectileMultiplier: this.fireState.projectileMultiplier,
      manualModifier: this.fireState.manualModifier,
      aimSeconds: rules && !rules.aimAllowed ? 0 : this.fireState.aimSeconds,
      braced: rules && !rules.aimAllowed ? false : this.fireState.braced,
      laserSight: rules?.random ? false : this.fireState.laserSight,
      visibility,
      targetDistanceOverride: targetDistance,
      moveAndAttack: this.fireState.moveAndAttack,
      allOutAttack: this.fireState.allOutAttack,
      height: this.fireState.height,
      elevationDirection: this.fireState.elevationDirection,
      rangeIndex: this.fireState.selectedRangeIndex,
      manualRangeSelected: this.fireState.manualRangeSelected,
      bodyplanId: this.fireState.bodyplanId,
      hitLocationId: rules?.random ? "silhouette" : this.fireState.hitLocation.zoneId,
      hitRegionId: rules?.random ? null : this.fireState.hitLocation.regionId
    };
  }

  _getTechniqueContext() {
    const governingSkill = this._getGoverningSkill();
    const rrs = resolveRangedRapidStrike({ actor: this.actor, attack: this.attack,
      governingSkill, governingSpecialty: governingSkill?.specialty ?? this.fireState.governingSpecialty });
    const closeHipApplied = this.fireState.closeHipShooting
      ? resolveCloseHipShooting({ actor: this.actor, attack: this.attack,
        governingSkill, enabled: true }) : null;
    return { actor: this.actor, attack: this.attack, governingSkill,
      fireState: this.fireState, rrsAvailable: this._rrsAllowed(), rrsPenalty: rrs.penalty,
      closeHipApplied };
  }

  async _openTechniques() {
    if (this.mode !== "weapon") return;
    if (!this._techniqueApp) this._techniqueApp = new RangedTechniquesApp({
      getContext: () => this._getTechniqueContext(),
      onToggle: (id, checked) => this._setTechniqueActive(id, checked),
      onClose: () => { this._techniqueApp = null; }
    });
    await this._techniqueApp.render({ force: true });
    this._techniqueApp.bringToFront();
  }

  async _setTechniqueActive(id, checked) {
    this._captureFields();
    if (id === "rangedRapidStrike") {
      if (checked && this._rrsAllowed()) this._enableRrs();
      else { this.fireState.rangedRapidStrike = false; this._rrsSlots = null; }
    } else if (id === "closeHipShooting") {
      const available = findCloseHipShooting({ actor: this.actor,
        governingSkill: this._getGoverningSkill() });
      this.fireState.closeHipShooting = Boolean(checked && available);
    } else return;
    await this.render({ force: true });
    this._techniqueApp?.syncRows();
    this._techniqueApp?.bringToFront();
  }

  _availableRrsRoF() {
    const limits = this.calculateShotLimits?.(this.fireState.rofMode);
    return Math.max(0, Math.trunc(Number(limits?.maxShots ?? this.maximumShots) || 0));
  }

  _rrsAllowed() { return this.mode === "weapon" && this._availableRrsRoF() >= 2; }

  _snapshotRrsSlot() {
    const targets = [...(globalThis.game?.user?.targets ?? [])];
    return {
      shots: String(this.fireState.shots || "1"),
      hitLocation: { ...this.fireState.hitLocation },
      selectedRangeIndex: this.fireState.selectedRangeIndex,
      manualRangeSelected: this.fireState.manualRangeSelected,
      height: this.fireState.height,
      elevationDirection: this.fireState.elevationDirection,
      targetId: targets.length === 1 ? targets[0].id : null,
      distance: this.recommendation?.distance ?? null,
      visibility: this.visibility ? { ...this.visibility } : null
    };
  }

  _saveActiveRrsSlot() {
    if (this.fireState.rangedRapidStrike && this._rrsSlots)
      this._rrsSlots[this._activeRrsSlot] = this._snapshotRrsSlot();
  }

  _getRrsRangeMarkers(rangeIndex) {
    if (!this.fireState.rangedRapidStrike || !this._rrsSlots) return [];
    return this._rrsSlots.flatMap((slot, index) => {
      const selectedIndex = index === this._activeRrsSlot
        ? this.fireState.selectedRangeIndex : slot.selectedRangeIndex;
      return selectedIndex === rangeIndex ? [index + 1] : [];
    });
  }

  _buildRrsRangeMarkers(markers) {
    return markers.map(index => `<span class="gam-hit-selection-marker gam-rapid-attack-${index} ${index === this._activeRrsSlot + 1 ? "is-active" : ""}"
      title="Attack ${index}" aria-label="Attack ${index}"></span>`).join("");
  }

  _updateRrsRangeMarkers() {
    for (const row of this.element?.querySelectorAll(".gam-fire-range-row[data-range-index]") ?? []) {
      const markers = this._getRrsRangeMarkers(Number(row.dataset.rangeIndex));
      row.classList.toggle("gam-rrs-range-1", markers.includes(1));
      row.classList.toggle("gam-rrs-range-2", markers.includes(2));
      const container = row.querySelector("[data-rrs-range-markers]");
      if (container) container.innerHTML = this._buildRrsRangeMarkers(markers);
    }
  }

  _applyRrsSlot(slot) {
    this.fireState.shots = slot.shots;
    this.fireState.hitLocation = { ...slot.hitLocation };
    this.fireState.selectedRangeIndex = slot.selectedRangeIndex;
    this.fireState.manualRangeSelected = slot.manualRangeSelected;
    this.fireState.height = slot.height;
    this.fireState.elevationDirection = slot.elevationDirection;
    this.visibility = slot.visibility ? { ...slot.visibility } : null;
  }

  async _switchRrsSlot(index) {
    if (!this._rrsSlots || index === this._activeRrsSlot || ![0, 1].includes(index)) return;
    this._captureFields();
    this._saveActiveRrsSlot();
    this._activeRrsSlot = index;
    const slot = this._rrsSlots[index];
    this._applyRrsSlot(slot);
    this._switchingRrsTarget = true;
    try { await replaceFoundryTargets(slot.targetId ? [slot.targetId] : []); }
    finally { this._switchingRrsTarget = false; }
    this.recommendation = this._readTargetRangeRecommendation();
    await this.render({ force: true });
  }

  _enableRrs() {
    const total = Math.max(2, Math.min(this._availableRrsRoF(), Math.trunc(Number(this.fireState.shots) || 2)));
    const first = Math.max(1, Math.ceil(total / 2));
    const current = this._snapshotRrsSlot();
    this._rrsSlots = [
      { ...current, shots: String(first) },
      { ...current, shots: String(total - first), targetId: null, distance: null,
        selectedRangeIndex: null, manualRangeSelected: false, height: "", elevationDirection: "level",
        hitLocation: { ...current.hitLocation }, visibility: current.visibility ? { ...current.visibility, targetTokenId: null } : null }
    ];
    this._activeRrsSlot = 0;
    this.fireState.shots = String(first);
    this.fireState.rangedRapidStrike = true;
  }

  getRrsShotOptions() {
    this._saveActiveRrsSlot();
    const shared = this.getShotOptions();
    return this._rrsSlots?.map((slot, index) => ({
      ...shared, shots: slot.shots, hitLocationId: slot.hitLocation.zoneId,
      hitRegionId: slot.hitLocation.regionId, rangeIndex: slot.selectedRangeIndex,
      manualRangeSelected: slot.manualRangeSelected, height: slot.height,
      elevationDirection: slot.elevationDirection, targetDistanceOverride: slot.distance,
      visibility: slot.visibility, targetTokenId: slot.targetId,
      rangedRapidStrike: true, rangedRapidStrikePart: true,
      contextLabel: "Attack " + (index + 1)
    })) ?? [];
  }
  _getShotLimits(fireState = this.fireState) {
    const calculated = this.calculateShotLimits?.(fireState.rofMode);
    const fallbackMax = Math.max(1, Math.trunc(Number(this.maximumShots) || 1));
    const minShots = fireState.rangedRapidStrike ? 1 : Math.max(1, Math.trunc(Number(calculated?.minShots) || 1));
    const unlimited = this.mode === "standalone" && calculated?.maxShots == null;
    const maxShots = unlimited
      ? null
      : Math.max(minShots, Math.trunc(Number(calculated?.maxShots) || fallbackMax));
    return { ...calculated, minShots, maxShots: fireState.rangedRapidStrike ? Math.max(1, maxShots - 1) : maxShots };
  }

  _syncShotLimits({ clamp = false } = {}) {
    const limits = this._getShotLimits();
    const input = this.element?.querySelector('[name="shots"]');
    const label = this.element?.querySelector('[data-shots-label]');
    if (input) {
      input.min = String(limits.minShots);
      if (Number.isFinite(limits.maxShots)) input.max = String(limits.maxShots);
      else input.removeAttribute("max");
      input.placeholder = String(limits.minShots);
    }
    if (label) {
      if (this.mode === "standalone") label.textContent = "Выстрелы";
      else {
        const range = limits.minShots === limits.maxShots
          ? String(limits.maxShots)
          : `${limits.minShots}-${limits.maxShots}`;
        label.textContent = `Выстрелы (${range})`;
      }
    }
    if (!clamp || (this.mode !== "standalone" && this.rateOfFireProfile?.type !== "full-auto")) return limits;

    const rawShots = String(this.fireState.shots ?? "").trim();
    if (rawShots === "") {
      if (input) input.value = "";
      return limits;
    }
    const current = Number(rawShots);
    const shots = Number.isInteger(current)
      ? Math.max(limits.minShots, Number.isFinite(limits.maxShots) ? Math.min(limits.maxShots, current) : current)
      : limits.minShots;
    this.fireState.shots = String(shots);
    if (this.mode === "standalone") this._refreshStandaloneAttack();
    if (input) input.value = this.fireState.shots;
    return limits;
  }

  _getSkillPreview() {
    return getFireSkillPreview(this.calculateEffectiveSkill?.(
      this.getShotOptions(), this.targetingService
    ));
  }
  _getModifierTotalText() {
    const base = Number(this.attack?.level);
    const effective = this.calculateEffectiveSkill?.(this.getShotOptions(), this.targetingService);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(effective)) return "\u2014";
    const total = Math.trunc(effective - base);
    return total > 0 ? `+${total}` : String(total);
  }
  _getAimBonus(fireState = this.fireState) {
    if (visibilityRules(this.visibility)?.aimAllowed === false) return 0;
    const value = Number(this.calculateAimBonus?.(
      fireState.aimSeconds,
      fireState.moveAndAttack,
      fireState.braced,
      fireState.laserSight
    ));
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }

  _syncAimStatusEffect() {
    if (this.mode === "melee") return;
    const seconds = getAimStatusSeconds(this.token?.actor ?? this.actor);
    if (seconds === this._lastAimStatusSeconds) return;
    this._lastAimStatusSeconds = seconds;
    if (this._aimManuallyEdited) return;
    const value = seconds ? String(seconds) : "";
    this.fireState.aimSeconds = value;
    const input = this.element?.querySelector('[name="aimSeconds"]');
    if (input) input.value = value;
    this._updateAimPreview();
    this._updateSkillPreview();
  }

  _updateAimPreview() {
    const aimPreview = this.element?.querySelector("[data-aim-preview]");
    const laserPreview = this.element?.querySelector("[data-laser-preview]");
    const effectiveModifier = visibilityRules(this.visibility)?.aimAllowed === false
      ? 0 : this._getAimBonus() + this._getBracingBonus();
    if (aimPreview) aimPreview.textContent = `+${effectiveModifier}`;
    if (laserPreview) laserPreview.textContent = `+${visibilityRules(this._visibilityForTargeting())?.random ? 0 : this.fireState.laserSight ? this._getLaserBonus() : 1}`;
    this._updateAttackStats();
  }

  _getBracingBonus(fireState = this.fireState) {
    if (visibilityRules(this.visibility)?.aimAllowed === false) return 0;
    const value = Number(this.calculateBracingBonus?.(
      fireState.braced,
      fireState.aimSeconds,
      fireState.moveAndAttack,
      fireState.laserSight
    ));
    return value === 1 ? 1 : 0;
  }

  _getLaserBonus(fireState = this.fireState) {
    if (visibilityRules(this._visibilityForTargeting())?.random) return 0;
    const value = Number(this.calculateLaserBonus?.(
      fireState.laserSight,
      fireState.aimSeconds,
      fireState.braced,
      fireState.moveAndAttack
    ));
    return value === 1 ? 1 : 0;
  }


  _getDisplayedRoF(fireMode) {
    if (this.rateOfFireProfile?.type === "multiple-projectile" && fireMode?.extremelyClose) {
      return String(Math.max(1, Math.trunc(Number(this.rateOfFireProfile.baseRoF) || 1)));
    }
    return formatAttackStat(this.rateOfFireProfile?.display || this.attack?.rof);
  }

  _getDisplayedAcc(fireState = this.fireState) {
    if (this.mode === "standalone" && this.attack?.acc === null) return "—";
    const baseAcc = Number(this.attack?.acc);
    if (!Number.isFinite(baseAcc)) return "—";
    return String(Math.trunc(baseAcc) + (fireState.braced && !fireState.moveAndAttack ? 1 : 0));
  }

  _getAttackStatsText(displayedRoF, displayedAcc = this._getDisplayedAcc()) {
    return [
      this.weapon.ammoType,
      `магазин ${this.weapon.magazines[this.weapon.loadedIndex]}/${this.weapon.capacity}`,
      `RoF ${displayedRoF}`,
      `Acc ${displayedAcc}`,
      `\u041f\u0440\u0438\u0446\u0435\u043b ${Math.max(0, Math.trunc(Number(this.attack?.scopeBonus) || 0))}`,
      `Bulk ${formatAttackStat(this.attack?.data?.bulk ?? this.attack?.bulk)}`,
      `Rcl ${formatAttackStat(this.attack?.rcl ?? this.attack?.data?.rcl)}`
    ].join(" · ");
  }

  _getRapidFireState(fireState = this.fireState) {
    const calculated = this.calculateFireMode?.({
      ...this.getShotOptions(),
      shots: this._getShotsValue(fireState),
      rangeIndex: fireState.selectedRangeIndex
    });
    const effectiveRoF = Math.max(1, Math.trunc(Number(calculated?.effectiveRoF) || Number(fireState.shots) || 1));
    return {
      ...calculated,
      effectiveRoF,
      rapidFireBonus: this.calculateRapidFireBonus(effectiveRoF)
    };
  }

  _updateAttackStats(fireMode = this._getRapidFireState()) {
    if (this.mode === "standalone") {
      this._updateStandaloneHints();
      return;
    }
    const attackStats = this.element?.querySelector("[data-attack-stats]");
    if (!attackStats) return;
    const text = this._getAttackStatsText(this._getDisplayedRoF(fireMode));
    attackStats.textContent = text;
    attackStats.title = text;
  }

  _updateRapidFirePreview() {
    const fireMode = this._getRapidFireState();
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const rof = this.element?.querySelector("[data-rof-preview]");
    const effective = this.element?.querySelector("[data-effective-rof]");
    if (rof) rof.textContent = displayedRoF;
    if (effective) effective.textContent = String(fireMode.effectiveRoF);
    this._updateAttackStats(fireMode);
  }

  _updateSkillPreview() {
    if (this._submitting) return;
    const preview = this.element?.querySelector("[data-skill-preview]");
    if (!preview) return;
    const { level, chance, probability } = this._getSkillPreview();
    preview.textContent = `${level} (${chance}%)`;
    preview.style.color = skillProbabilityColor(probability);
    const total = this.element?.querySelector("[data-total-modifier]");
    if (total) total.textContent = this._getModifierTotalText();
    this._updateRrsPreview();
    const breakdown = this.element?.querySelector("[data-visibility-breakdown]");
    if (breakdown && this.visibility) breakdown.innerHTML = this._buildVisibilityBreakdown();
  }

  _updateRrsPreview() {
    const checkbox = this.element?.querySelector('[name="rangedRapidStrike"]');
    if (checkbox) {
      checkbox.disabled = !this._rrsAllowed();
      checkbox.title = checkbox.disabled ? "Ranged Rapid Strike requires RoF 2+ and two available shots." : "";
    }
    const label = this.element?.querySelector("[data-rrs-penalty]");
    if (label) label.textContent = String(resolveRangedRapidStrike({ actor: this.actor,
      attack: this.attack, governingSkill: this._getGoverningSkill(),
      governingSpecialty: this._getGoverningSkill()?.specialty ?? this.fireState.governingSpecialty }).penalty);
    this._techniqueApp?.syncRows();
    const split = this.element?.querySelector("[data-rrs-split]");
    if (split && this._rrsSlots) {
      const shots = this._rrsSlots.map((slot, index) =>
        index === this._activeRrsSlot ? Number(this.fireState.shots) : Number(slot.shots));
      split.textContent = shots.join(" + ") + " / " + this._availableRrsRoF();
      split.dataset.invalid = String(!validateRangedRapidStrikeSplit(shots[0], shots[1], this._availableRrsRoF()));
    }
  }
  _getElevationCalculation(fireState = this.fireState) {
    return resolveElevationRange({
      rangeBands: this.rangeBands,
      rangeIndex: fireState.selectedRangeIndex ?? fireState.elevationSourceRangeIndex,
      distance: fireState.manualRangeSelected ? null : this.recommendation?.distance,
      height: fireState.height,
      elevationDirection: fireState.elevationDirection,
      beamWeapon: this.beamWeapon
    });
  }

  _updateElevationPreview() {
    const calculation = this._getElevationCalculation();
    for (const row of this.element?.querySelectorAll("[data-range-index]") ?? []) {
      const elevationRecommended = calculation?.rangeIndex === Number(row.dataset.rangeIndex);
      row.classList.toggle("elevation-recommended", elevationRecommended);
      const marker = row.querySelector("[data-elevation-marker]");
      if (marker) marker.hidden = !elevationRecommended;
    }

    const summary = this.element?.querySelector("[data-effective-distance]");
    if (!summary) return;
    summary.hidden = !calculation;
    const value = summary.querySelector("[data-effective-distance-value]");
    if (value && calculation) value.textContent = formatDistance(calculation.effectiveDistance);
    globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
  }

  _syncRangeListHeight() {
    const rangeList = this.element?.querySelector(".gam-fire-range-list");
    const hitList = this.element?.querySelector(".gam-hit-list");
    if (!rangeList || !hitList) return;

    const rangeRect = rangeList.getBoundingClientRect();
    const hitRect = hitList.getBoundingClientRect();
    const sideBySide = hitRect.left >= rangeRect.right - 4;
    if (!sideBySide) {
      rangeList.style.removeProperty("max-height");
      return;
    }

    const visibleRows = [...rangeList.querySelectorAll(".gam-fire-range-row")].slice(0, 7);
    if (!visibleRows.length) return;

    const styles = globalThis.getComputedStyle?.(rangeList);
    const gap = Number.parseFloat(styles?.rowGap || styles?.gap || "0") || 0;
    const paddingTop = Number.parseFloat(styles?.paddingTop || "0") || 0;
    const paddingBottom = Number.parseFloat(styles?.paddingBottom || "0") || 0;
    const rowsHeight = visibleRows.reduce(
      (total, row) => total + row.getBoundingClientRect().height,
      0
    );
    const height = Math.ceil(rowsHeight + gap * Math.max(0, visibleRows.length - 1) + paddingTop + paddingBottom);
    if (height > 120) rangeList.style.maxHeight = `${height}px`;
  }

  _selectRange(index) {
    const nextIndex = this.fireState.selectedRangeIndex === index ? null : index;
    this.fireState.selectedRangeIndex = nextIndex;
    this.fireState.manualRangeSelected = nextIndex !== null;
    if (nextIndex !== null) this.fireState.elevationSourceRangeIndex = nextIndex;
    for (const row of this.element?.querySelectorAll("[data-range-index]") ?? []) {
      const selected = Number(row.dataset.rangeIndex) === nextIndex;
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-pressed", String(selected));
      const marker = row.querySelector("[data-selected-marker]");
      if (marker) marker.hidden = !selected;
    }
    this._updateElevationPreview();
    this._updateRrsRangeMarkers();
    this._updateRapidFirePreview();
    this._updateSkillPreview();
  }

  _visibilityForTargeting() { return this.visibility; }

  _selectHitLocation(zoneId, regionId = null) {
    if (visibilityRules(this._visibilityForTargeting())?.random && zoneId !== "silhouette") return;
    const selection = this.targetingService.getSelection(zoneId, regionId);
    if (!selection) return;
    this.fireState.hitLocation = { zoneId: selection.zoneId, regionId: selection.regionId };

    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      const selected = row.dataset.hitZoneId === selection.zoneId;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-pressed", String(selected));
    }
    for (const region of this.element?.querySelectorAll(".gam-hit-region[data-hit-region-id]") ?? []) {
      const selected = region.dataset.hitZoneId === selection.zoneId &&
        (!selection.regionId || region.dataset.hitRegionId === selection.regionId);
      region.classList.toggle("is-selected", selected);
      region.setAttribute("aria-pressed", String(selected));
    }
    this._updateRrsHitLocationMarkers();
    this._updateTargetedAttackPreview();
    this._updateSkillPreview();
  }


  async _switchBodyplan(bodyplanId) {
    const requestedId = String(bodyplanId ?? "");
    if (requestedId === this.targetingService.bodyplan) return;

    const requestId = ++this._bodyplanRequestId;
    const selector = this.element?.querySelector('[name="bodyplanId"]');
    if (selector) selector.disabled = true;

    try {
      let service = this._targetingServices.get(requestedId);
      if (!service) {
        service = await TargetingService.create({ attack: this.attack, bodyplan: requestedId });
        this._targetingServices.set(service.bodyplan, service);
      }
      if (requestId !== this._bodyplanRequestId) return;

      this.targetingServiceChangeCallback?.(service);
      this.targetingService = service;
      this.fireState.bodyplanId = service.bodyplan;
      this.fireState.hitLocation = { ...service.getDefaultSelection() };
      if (this.fireState.rangedRapidStrike && this._rrsSlots) {
        for (const slot of this._rrsSlots) slot.hitLocation = { ...this.fireState.hitLocation };
      }

      const targeting = this.element?.querySelector(".gam-fire-targeting");
      if (targeting) targeting.outerHTML = this._buildHitLocationContent(this.fireState);
      this._updateSkillPreview();
      globalThis.requestAnimationFrame?.(() => this._syncRangeListHeight());
    } catch (error) {
      console.error("Не удалось переключить bodyplan:", error);
      ui.notifications.error(error?.message ?? "Не удалось переключить bodyplan.");
      const currentSelector = this.element?.querySelector('[name="bodyplanId"]');
      if (currentSelector) currentSelector.value = this.targetingService.bodyplan;
    } finally {
      const currentSelector = this.element?.querySelector('[name="bodyplanId"]');
      if (currentSelector) currentSelector.disabled = false;
    }
  }

  _setHoveredHitLocation(zoneId = null, regionId = null) {
    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      row.classList.toggle("is-hovered", !!zoneId && row.dataset.hitZoneId === zoneId);
    }
    for (const region of this.element?.querySelectorAll(".gam-hit-region[data-hit-region-id]") ?? []) {
      const hovered = !!zoneId && region.dataset.hitZoneId === zoneId &&
        (!regionId || region.dataset.hitRegionId === regionId);
      region.classList.toggle("is-hovered", hovered);
    }
  }

  _getHitControl(target) {
    return target instanceof Element ? target.closest("[data-hit-zone-id]") : null;
  }

  _onPointerOver(event) {
    const control = this._getHitControl(event.target);
    if (!control || control.dataset.hitDisabled === "true") return;
    const previous = this._getHitControl(event.relatedTarget);
    if (previous === control) return;
    this._setHoveredHitLocation(control.dataset.hitZoneId, control.dataset.hitRegionId ?? null);
  }

  _onPointerOut(event) {
    const control = this._getHitControl(event.target);
    if (!control) return;
    const next = this._getHitControl(event.relatedTarget);
    if (next === control) return;
    if (next && next.dataset.hitDisabled !== "true") {
      this._setHoveredHitLocation(next.dataset.hitZoneId, next.dataset.hitRegionId ?? null);
    } else {
      this._setHoveredHitLocation();
    }
  }

  _onKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const control = this._getHitControl(event.target);
    if (!control || control.dataset.hitDisabled === "true") return;
    event.preventDefault();
    this._selectHitLocation(control.dataset.hitZoneId, control.dataset.hitRegionId ?? null);
  }

  _persistGoverningSpecialty(value) {
    try {
      const pending = this.governingSpecialtyChangeCallback?.(value);
      pending?.catch?.(error => {
        console.error("Не удалось сохранить governing Guns specialty:", error);
        ui.notifications.error("Не удалось сохранить выбранный governing Guns specialty.");
      });
    } catch (error) {
      console.error("Не удалось сохранить governing Guns specialty:", error);
      ui.notifications.error("Не удалось сохранить выбранный governing Guns specialty.");
    }
  }

  async _onInput(event) {
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ? event.target : null;
    if (!field) return;
    if (field.name === "rangedRapidStrike") {
      if (event.type !== "change") return;
      this._captureFields();
      if (field.checked && this._rrsAllowed()) this._enableRrs();
      else { this.fireState.rangedRapidStrike = false; this._rrsSlots = null; }
      await this.render({ force: true });
      return;
    }
    if (field.name === "visibilityMode") {
      this._captureFields();
      this.visibility = normalizeVisibility({ mode: field.value, partialPenalty: -1, accustomed: false });
      if (field.value === "unseen") await clearFoundryTargets();
      this.recommendation = this._readTargetRangeRecommendation();
      await this.render({ force: true });
      return;
    }
    if (field.name === "partialPenalty") {
      const value = Number(field.value);
      if (event.type === "change") field.value = String(Number.isInteger(value) ? Math.max(-9, Math.min(-1, value)) : -1);
      this.visibility.partialPenalty = Number(field.value);
      this._updateSkillPreview();
      return;
    }
    if (field.name === "accustomed") {
      this.visibility.accustomed = field.checked;
      this._updateSkillPreview();
      return;
    }
    if (field.name === "manualHearing") {
      this.manualHearingLevel = field.value;
      return;
    }
    if (field.name === "bodyplanId") {
      await this._switchBodyplan(field.value);
      return;
    }
    if (this.mode === "standalone" &&
      ["skillLevel", "acc", "bulk", "rcl", "halfd", "projectileMultiplier", "shotgun"].includes(field.name)) {
      if (field.name === "shotgun") this.fireState.shotgun = field.checked;
      else this.fireState[field.name] = field.value;
      this._refreshStandaloneAttack();
      this._notifyStandaloneValuesChange();
      if (field.name === "shotgun") {
        const multiplier = this.element?.querySelector('[name="projectileMultiplier"]');
        if (multiplier) multiplier.disabled = !field.checked;
      }
      if (field.name === "shotgun" || field.name === "projectileMultiplier") {
        const rofBlock = this.element?.querySelector("[data-rof-container]");
        if (rofBlock) rofBlock.innerHTML = this._buildRofContent(this.fireState);
      }
      this._updateAimPreview();
      this._updateRapidFirePreview();
      this._updateSkillPreview();
      return;
    }
    if (field.name === "shots") {
      this.fireState.shots = field.value;
      if (this.mode === "standalone") {
        this._refreshStandaloneAttack();
        const rofBlock = this.element?.querySelector("[data-rof-container]");
        if (rofBlock) rofBlock.innerHTML = this._buildRofContent(this.fireState);
      }
    }
    else if (field.name === "rofMode") this.fireState.rofMode = field.value;
    else if (field.name === "governingSkillKey") {
      const changed = this.fireState.governingSkillKey !== field.value;
      const skill = listRangedGoverningSkills(this.actor).find(entry => entry.key === field.value);
      this.fireState.governingSkillKey = skill?.key ?? "";
      this.fireState.governingSpecialty = skill?.specialty ?? "";
      this.attack.governingSkillBinding = bindingForGoverningSkill(skill);
      if (this.fireState.closeHipShooting && !findCloseHipShooting({ actor: this.actor, governingSkill: skill }))
        this.fireState.closeHipShooting = false;
      const source = this.element?.querySelector("[data-source-skill]");
      if (source) source.textContent = "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0443\u043c\u0435\u043d\u0438\u044f: Ranged Weapon Level " + (this.attack?.level ?? "");
      this._updateTargetedAttackPreview();
      if (changed) this._persistGoverningSpecialty(field.value);
    }
    else if (field.name === "manualModifier") this.fireState.manualModifier = field.value;
    else if (field.name === "aimSeconds") {
      const seconds = Number(String(field.value).replace(",", "."));
      if (field.value !== "" && (!Number.isInteger(seconds) || seconds < 0)) field.value = "0";
      this.fireState.aimSeconds = field.value;
      this._aimManuallyEdited = true;
    } else if (field.name === "braced") this.fireState.braced = field.checked;
    else if (field.name === "laserSight") this.fireState.laserSight = field.checked;
    else if (field.name === "moveAndAttack") {
      this.fireState.moveAndAttack = field.checked;
      if (field.checked) {
        this.fireState.allOutAttack = false;
        const allOutAttack = this.element?.querySelector('[name="allOutAttack"]');
        if (allOutAttack) allOutAttack.checked = false;
      }
    } else if (field.name === "allOutAttack") {
      this.fireState.allOutAttack = field.checked;
      if (field.checked) {
        this.fireState.moveAndAttack = false;
        const moveAndAttack = this.element?.querySelector('[name="moveAndAttack"]');
        if (moveAndAttack) moveAndAttack.checked = false;
      }
    }
    else if (field.name === "height") {
      const numericHeight = Number(String(field.value).replace(",", "."));
      if (field.value !== "" && Number.isFinite(numericHeight) && numericHeight < 0) field.value = "0";
      this.fireState.height = field.value;
    } else if (field.name === "highGround" || field.name === "lowGround") {
      if (field.checked) {
        const other = this.element?.querySelector(field.name === "highGround" ? '[name="lowGround"]' : '[name="highGround"]');
        if (other) other.checked = false;
      }
      this.fireState.elevationDirection = field.checked ? field.name === "highGround" ? "high" : "low" : "level";
    }
    if (field.name === "shots" || field.name === "rofMode") {
      if (field.name === "rofMode" && this.fireState.rangedRapidStrike && !this._rrsAllowed()) {
        this.fireState.rangedRapidStrike = false; this._rrsSlots = null;
      }
      this._syncShotLimits({ clamp: field.name === "rofMode" || event.type === "change" });
      this._updateRapidFirePreview();
      this._updateRrsPreview();
    }
    if (field.name === "aimSeconds" || field.name === "braced" || field.name === "laserSight" || field.name === "moveAndAttack" || field.name === "allOutAttack") this._updateAimPreview();
    if (field.name === "height" || field.name === "highGround" || field.name === "lowGround") {
      this._updateElevationPreview();
      this._updateTargetRecommendation();
    }
    this._updateSkillPreview();
  }

  async _onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const rrsSlot = target?.closest("[data-rrs-slot]");
    if (rrsSlot) { event.preventDefault(); await this._switchRrsSlot(Number(rrsSlot.dataset.rrsSlot)); return; }
    const hitControl = this._getHitControl(target);
    if (hitControl) {
      event.preventDefault();
      if (hitControl.dataset.hitDisabled !== "true") {
        this._captureFields();
        this._selectHitLocation(hitControl.dataset.hitZoneId, hitControl.dataset.hitRegionId ?? null);
      }
      return;
    }

    const range = target?.closest("[data-range-index]");
    if (range) {
      event.preventDefault();
      this._captureFields();
      this._selectRange(Number(range.dataset.rangeIndex));
      return;
    }

    const button = target?.closest("button[data-fire-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.fireAction === "cancel") {
      await this.close();
      return;
    }
    if (button.dataset.fireAction === "techniques") {
      await this._openTechniques();
      return;
    }
    if (button.dataset.fireAction === "exit-visibility") {
      await this.activateVisibility(null);
      return;
    }
    if (this.visibility?.mode === "unseen") {
      const action = button.dataset.fireAction;
      if (action === "known-location") {
        this._knownMethodOpen = true;
        await this.render({ force: true });
        return;
      }
      if (action === "known-approx" || action === "known-exact") {
        this._captureFields();
        this.visibility.location = action === "known-exact" ? "exact" : "approximate";
        this.visibility.locationMethod = "other";
        this.visibility.hearing = null;
        this.visibility.targetTokenId = null;
        this.visibility.blindFireHex = null;
        await clearFoundryTargets();
        this.recommendation = null;
        await this.render({ force: true });
        return;
      }
      if (action === "choose-token") {
        const targets = [...(globalThis.game?.user?.targets ?? [])];
        if (targets.length !== 1 || !targets[0]?.id) {
          globalThis.ui?.notifications?.warn?.("Select exactly one Token on the canvas.");
          return;
        }
        this._captureFields();
        this.visibility.targetTokenId = targets[0].id;
        this.visibility.blindFireHex = null;
        this.recommendation = this._readTargetRangeRecommendation();
        if (!this.fireState.manualRangeSelected)
          this.fireState.selectedRangeIndex = this.recommendation?.rangeIndex ?? null;
        await this.render({ force: true });
        return;
      }
      if (action === "choose-hex" || action === "blind-fire") {
        this._captureFields();
        const previousLocation = this.visibility.location;
        const previousMethod = this.visibility.locationMethod;
        const hex = await this._pickBlindFireHex();
        if (!this.rendered) return;
        if (hex) {
          this.visibility.targetTokenId = null;
          this.visibility.blindFireHex = hex.offset;
          this.visibility.location = action === "blind-fire" ? "hex"
            : ["approximate", "exact"].includes(previousLocation) ? previousLocation : "hex";
          this.visibility.locationMethod = action === "blind-fire" ? "blind-fire" : previousMethod;
          await clearFoundryTargets();
          this.recommendation = this._readTargetRangeRecommendation();
          if (!this.fireState.manualRangeSelected)
            this.fireState.selectedRangeIndex = this.recommendation?.rangeIndex ?? null;
        }
        await this.render({ force: true });
        return;
      }
    }
    if (button.dataset.fireAction === "known-location") {
      this.visibility.knownLocation = true;
      this.visibility.hearing = null;
      this.visibility.hex = null;
      this._captureFields();
      this.recommendation = this._readTargetRangeRecommendation();
      await this.render({ force: true });
      return;
    }
    if (button.dataset.fireAction === "choose-hex") {
      const hex = await this._pickBlindFireHex();
      if (hex) {
        this.visibility.hex = hex.offset;
        this.visibility.knownLocation = false;
        this.recommendation = this._readTargetRangeRecommendation();
        if (!this.fireState.manualRangeSelected) this.fireState.selectedRangeIndex = this.recommendation?.rangeIndex ?? null;
        await this.render({ force: true });
      }
      return;
    }
    if (button.dataset.fireAction === "hearing-check") {
      this._captureFields();
      const manual = this.manualHearingLevel === undefined || this.manualHearingLevel === ""
        ? null : Number(this.manualHearingLevel);
      const success = await this.hearingCheckCallback?.(manual);
      if (typeof success !== "boolean") return;
      if (this.visibility.mode === "unseen") {
        const hex = success ? null : await this._pickBlindFireHex();
        if (!this.rendered) return;
        if (!success && !hex) return;
        this.visibility.hearing = success ? "success" : "failure";
        this.visibility.location = success ? "approximate" : "hex";
        this.visibility.locationMethod = "hearing";
        this.visibility.targetTokenId = null;
        this.visibility.blindFireHex = hex?.offset ?? null;
        await clearFoundryTargets();
        this.recommendation = this._readTargetRangeRecommendation();
        if (!this.fireState.manualRangeSelected)
          this.fireState.selectedRangeIndex = this.recommendation?.rangeIndex ?? null;
        await this.render({ force: true });
        return;
      }
      this.visibility.hearing = success ? "success" : "failure";
      this.visibility.knownLocation = success;
      this.visibility.hex = null;
      if (!success) {
        const hex = await this._pickBlindFireHex();
        if (hex) this.visibility.hex = hex.offset;
      }
      this.recommendation = this._readTargetRangeRecommendation();
      if (this.visibility.hex && !this.fireState.manualRangeSelected) this.fireState.selectedRangeIndex = this.recommendation?.rangeIndex ?? null;
      await this.render({ force: true });
      return;
    }
    if (button.dataset.fireAction !== "confirm" || this._submitting) return;

    this._captureFields();
    if (this.visibility?.mode === "unseen" && !this._hasUnseenDirection()) {
      globalThis.ui?.notifications?.warn?.("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u0435\u043a\u0441 \u0434\u043b\u044f \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
      return;
    }
    if (this.visibility?.mode === "blind" && !this.visibility.knownLocation && !this.visibility.hex) {
      ui.notifications.warn("Выберите предполагаемый гекс.");
      return;
    }
    this._submitting = true;
    button.disabled = true;
    try {
      const options = this.fireState.rangedRapidStrike ? this.getRrsShotOptions() : this.getShotOptions();
      if (Array.isArray(options) && !validateRangedRapidStrikeSplit(
        Number(options[0]?.shots), Number(options[1]?.shots), this._availableRrsRoF())) {
        globalThis.ui?.notifications?.warn?.("Ranged Rapid Strike: split available RoF between both attacks.");
        return;
      }
      this._switchingRrsTarget = Array.isArray(options);
      const completed = await this.confirmCallback?.(options, this.targetingService);
      if (completed) await this.close();
    } catch (error) {
      console.error("GURPS Fire Preparation:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      this._submitting = false;
      this._switchingRrsTarget = false;
      if (button.isConnected) button.disabled = false;
    }
  }

  _renderSvgGeometry(geometry) {
    const shapeClass = ["gam-hit-region-shape", geometry.baseFill ? "has-base-fill" : ""].filter(Boolean).join(" ");
    if (geometry.type === "ellipse") {
      return `<ellipse class="${shapeClass}" cx="${svgCoordinate(geometry.cx)}" cy="${svgCoordinate(geometry.cy)}" rx="${svgCoordinate(geometry.rx)}" ry="${svgCoordinate(geometry.ry)}"></ellipse>`;
    }
    if (geometry.type === "path") {
      const path = (geometry.rings ?? [])
        .map(points => `M ${points.map(([x, y]) => `${svgCoordinate(x)} ${svgCoordinate(y)}`).join(" L ")} Z`)
        .join(" ");
      return `<path class="${shapeClass}" fill-rule="${geometry.fillRule ?? "nonzero"}" d="${path}"></path>`;
    }
    const points = (geometry.points ?? [])
      .map(([x, y]) => `${svgCoordinate(x)},${svgCoordinate(y)}`)
      .join(" ");
    return `<polygon class="${shapeClass}" points="${points}"></polygon>`;
  }

  _formatModifier(value) {
    const number = Math.trunc(Number(value) || 0);
    return number >= 0 ? `+${number}` : String(number);
  }

  _getGoverningSkill() {
    return this.mode === "weapon" ? resolveRangedGoverningSkill({
      actor: this.actor, binding: this.attack?.governingSkillBinding }) : null;
  }

  _getTargetedAttack(zone, fireState = this.fireState) {
    if (visibilityRules(this._visibilityForTargeting())?.random) return null;
    return this.targetedAttackContext?.resolve({
      governingSkill: this._getGoverningSkill(),
      specialty: this._getGoverningSkill()?.specialty ?? fireState.governingSpecialty,
      target: [zone?.canonicalKey ?? zone?.id, ...(zone?.taAliases ?? [])],
      basePenalty: zone?.penalty
    }) ?? null;
  }

  _buildHitLocationPenalty(zone, fireState = this.fireState) {
    const base = this._formatModifier(zone?.penalty);
    const targetedAttack = this._getTargetedAttack(zone, fireState);
    if (!targetedAttack) return `<span class="gam-hit-row-penalty-base">${base}</span>`;
    return `
      <span class="gam-hit-row-penalty-base has-ta">${base}</span>
      <span class="gam-hit-row-penalty-arrow" aria-hidden="true">→</span>
      <span class="gam-hit-row-penalty-effective">${this._formatModifier(targetedAttack.effectivePenalty)}</span>
      <span class="gam-hit-row-ta">TA</span>
    `;
  }

  _updateTargetedAttackPreview() {
    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      const zone = this.targetingService.getZone(row.dataset.hitZoneId);
      const penalty = row.querySelector("[data-hit-penalty]");
      if (zone && penalty) penalty.innerHTML = this._buildHitLocationPenalty(zone);
    }
  }

  _buildGoverningSkillSelector(fireState) {
    if (this.mode !== "weapon") return "";
    const options = listRangedGoverningSkills(this.actor).map(skill =>
      '<option value="' + escapeHTML(skill.key) + '"' +
      (fireState.governingSkillKey === skill.key ? ' selected' : '') + '>' +
      escapeHTML(skill.name) + ': ' + skill.level + '</option>'
    ).join("");
    return '<label class="gam-fire-governing-skill"><span>Governing skill (techniques):</span>' +
      '<select name="governingSkillKey" aria-label="Governing Skill">' +
      '<option value="">Select Skill</option>' + options + '</select></label>';
  }

  _getHitLocationMarkers(zoneId, regionId = null, _fireState = this.fireState) {
    if (!this.fireState.rangedRapidStrike || !this._rrsSlots) return [];
    return this._rrsSlots.flatMap((slot, index) => {
      const hit = slot.hitLocation;
      if (hit?.zoneId !== zoneId || regionId && hit.regionId && hit.regionId !== regionId) return [];
      return [{ className: "gam-rapid-attack-" + (index + 1) + (index === this._activeRrsSlot ? " is-active" : ""),
        label: "Attack " + (index + 1) }];
    });
  }

  _updateRrsHitLocationMarkers() {
    if (!this.fireState.rangedRapidStrike || !this._rrsSlots) return;
    this._rrsSlots[this._activeRrsSlot].hitLocation = { ...this.fireState.hitLocation };
    for (const row of this.element?.querySelectorAll(".gam-hit-row[data-hit-zone-id]") ?? []) {
      const container = row.querySelector(".gam-hit-selection-markers");
      if (!container) continue;
      container.innerHTML = this._getHitLocationMarkers(row.dataset.hitZoneId).map(marker =>
        `<span class="gam-hit-selection-marker ${escapeHTML(marker.className)}" title="${escapeHTML(marker.label)}" aria-label="${escapeHTML(marker.label)}"></span>`
      ).join("");
    }
    for (const region of this.element?.querySelectorAll(".gam-hit-region[data-hit-region-id]") ?? []) {
      let next = region.nextElementSibling;
      while (next?.classList.contains("gam-hit-region-marker")) {
        const marker = next;
        next = next.nextElementSibling;
        marker.remove();
      }
      const definition = this.targetingService.regions.find(entry => entry.id === region.dataset.hitRegionId);
      if (!definition) continue;
      const shapes = definition.geometry.map(geometry => this._renderSvgGeometry(geometry)).join("");
      const markers = this._getHitLocationMarkers(region.dataset.hitZoneId, region.dataset.hitRegionId);
      region.insertAdjacentHTML("afterend", markers.map(marker =>
        `<g class="gam-hit-region-marker ${escapeHTML(marker.className)}" aria-hidden="true">${shapes}</g>`
      ).join(""));
    }
  }

  _buildHitLocationContent(fireState) {
    const selection = visibilityRules(this._visibilityForTargeting())?.random
      ? this.targetingService.getDefaultSelection() : fireState.hitLocation;
    const bodyplanOptions = TargetingService.getBodyplanOptions().map(option =>
      `<option value="${escapeHTML(option.id)}" ${this.targetingService.bodyplan === option.id ? "selected" : ""}>${escapeHTML(option.label)}</option>`
    ).join("");
    const rows = this.targetingService.zones.map(zone => {
      const selected = selection.zoneId === zone.id;
      const disabled = !zone.available || (visibilityRules(this._visibilityForTargeting())?.random && zone.id !== "silhouette");
      const markers = this._getHitLocationMarkers(zone.id, null, fireState);
      const markerHtml = markers.map(marker =>
        `<span class="gam-hit-selection-marker ${escapeHTML(marker.className)}" title="${escapeHTML(marker.label)}" aria-label="${escapeHTML(marker.label)}"></span>`
      ).join("");
      return `
        <button
          type="button"
          class="gam-hit-row ${selected ? "is-selected" : ""}"
          data-hit-zone-id="${zone.id}"
          data-hit-disabled="${disabled}"
          aria-pressed="${selected}"
          style="--zone-color:${zone.color}"
          title="${escapeHTML(zone.unavailableReason)}"
          ${disabled ? "disabled" : ""}
        >
          <span class="gam-hit-row-color" aria-hidden="true"></span>
          <span class="gam-hit-row-label">
            ${escapeHTML(zone.label)}
            <span class="gam-hit-selection-markers">${markerHtml}</span>
          </span>
          <strong class="gam-hit-row-penalty" data-hit-penalty>${this._buildHitLocationPenalty(zone, fireState)}</strong>
        </button>
      `;
    }).join("");

    const regions = this.targetingService.regions.map(region => {
      const zone = this.targetingService.getZone(region.zoneId);
      const selected = selection.zoneId === region.zoneId && (!selection.regionId || selection.regionId === region.id);
      const disabled = !zone?.available || (visibilityRules(this._visibilityForTargeting())?.random && region.zoneId !== "silhouette");
      const shapes = region.geometry.map(geometry => this._renderSvgGeometry(geometry)).join("");
      const markers = this._getHitLocationMarkers(region.zoneId, region.id, fireState);
      const markerShapes = markers.map(marker =>
        `<g class="gam-hit-region-marker ${escapeHTML(marker.className)}" aria-hidden="true">${shapes}</g>`
      ).join("");
      return `
        <g
          class="gam-hit-region ${region.baseOutline ? "has-base-outline" : ""} ${region.baseFill ? "has-base-fill" : ""} ${selected ? "is-selected" : ""}"
          data-hit-zone-id="${region.zoneId}"
          data-hit-region-id="${region.id}"
          data-hit-disabled="${disabled}"
          role="button"
          tabindex="${disabled ? -1 : 0}"
          aria-label="${escapeHTML(region.label ?? zone?.label)}"
          aria-pressed="${selected}"
          aria-disabled="${disabled}"
          style="--zone-color:${zone?.color ?? "#888"}"
        >${shapes}</g>${markerShapes}
      `;
    }).join("");

    return `
      <aside class="gam-fire-targeting gam-bodyplan-${escapeHTML(this.targetingService.bodyplan)}">
        <section>
          <div class="gam-hit-heading">
            <h4>Hit Location</h4>
            <div class="gam-hit-heading-controls">
              <select name="bodyplanId" aria-label="Bodyplan">${bodyplanOptions}</select>
              <p>${escapeHTML(this.targetingService.label)} · ${this.targetingService.tableSource === "gga" ? "GGA" : "fallback"}</p>
            </div>
          </div>
          <div class="gam-hit-panel">
            <div class="gam-hit-map">
              <div class="gam-hit-stage" style="--gam-hit-aspect:${escapeHTML(this.targetingService.aspectRatio)}">
                <img src="${escapeHTML(this.targetingService.image)}" alt="${escapeHTML(this.targetingService.label)} hit locations">
                <svg class="gam-hit-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Интерактивная схема зон попадания">${regions}</svg>
              </div>
            </div>
            <div class="gam-hit-list" role="listbox" aria-label="Зоны попадания">${rows}</div>
          </div>
        </section>
      </aside>
    `;
  }


  _buildStandaloneStats(fireState) {
    const fields = [["acc", "Acc"], ["bulk", "Bulk"], ["rcl", "Rcl"], ["halfd", "½D, yd"]];
    const stats = fields.map(([name, label]) =>
      `<label>${label} <input type="text" name="${name}" value="${escapeHTML(fireState[name])}" placeholder="—" aria-label="${label}" title="${name === "halfd" ? "Необязательно: ½D для определения Extremely Close" : "Необязательная характеристика"}"></label>`
    ).join("");
    const shotgun = `<div class="gam-fire-shotgun">
      <span>Дробовик</span>
      <input type="checkbox" name="shotgun" aria-label="Дробовик" ${fireState.shotgun ? "checked" : ""}>
      <span aria-hidden="true">×</span>
      <input type="number" name="projectileMultiplier" value="${escapeHTML(fireState.projectileMultiplier)}" placeholder="—" min="2" step="1" inputmode="numeric" aria-label="Число снарядов после ×" ${fireState.shotgun ? "" : "disabled"}>
    </div>`;
    return `<div class="gam-fire-manual-stats">${stats}${shotgun}</div><small class="gam-fire-missing-stats" data-missing-stats></small>`;
  }

  _updateStandaloneHints() {
    const hints = this.element?.querySelector("[data-missing-stats]");
    if (!hints) return;
    const missing = [];
    if (Number(this.fireState.aimSeconds) > 0 && this.attack.acc === null) missing.push("Aim: нужен Acc");
    if (this.fireState.moveAndAttack && this.attack.data.bulk === null) missing.push("Движение и атака: нужен Bulk");
    if (this.fireState.shotgun && !(Number.isInteger(Number(this.fireState.projectileMultiplier)) && Number(this.fireState.projectileMultiplier) > 1)) {
      missing.push("Дробовик: нужен целый множитель после ×");
    }
    if (this.rateOfFireProfile.type === "multiple-projectile" && !this.fireState.halfd) missing.push("Для Extremely Close нужен ½D");
    hints.textContent = missing.join(" · ");
  }

  _buildRofContent(fireState) {
    const fireMode = this._getRapidFireState(fireState);
    const modifierTotal = this._getModifierTotalText();
    const multipleProjectile = this.rateOfFireProfile?.type === "multiple-projectile";
    const fullAuto = this.rateOfFireProfile?.type === "full-auto";
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const rofModeOptions = fullAuto
      ? this.rateOfFireProfile.modes.map(mode => `
          <option value="${mode.index}" ${String(fireState.rofMode ?? "0") === String(mode.index) ? "selected" : ""}>${escapeHTML(mode.label)}</option>
        `).join("")
      : "";
    const rofContent = multipleProjectile
      ? `<div class="gam-fire-rof gam-fire-rof-multiple">
          <span>RoF: <strong data-rof-preview>${escapeHTML(displayedRoF)}</strong></span>
          <span>Эффективный RoF: <strong data-effective-rof>${fireMode.effectiveRoF}</strong></span>
          <span>\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: <strong data-total-modifier>${modifierTotal}</strong></span>
        </div>`
      : fullAuto && this.rateOfFireProfile.modes.length > 1
        ? `<div class="gam-fire-rof gam-fire-rof-full-auto">
            <label class="gam-fire-rof-mode">
              <span>Режим RoF:</span>
              <select name="rofMode" aria-label="Режим скорострельности">${rofModeOptions}</select>
            </label>
            <span>\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: <strong data-total-modifier>${modifierTotal}</strong></span>
          </div>`
        : `<div class="gam-fire-rof">\u041c\u043e\u0434\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440\u044b: <strong data-total-modifier>${modifierTotal}</strong></div>`;
    return rofContent;
  }

  _buildVisibilityBreakdown() {
    const rules = visibilityRules(this.visibility);
    if (!rules) return "";
    const options = this.getShotOptions();
    const safeUnseen = this.visibility?.mode === "unseen";
    const skill = this.calculateEffectiveSkill?.(
      { ...options, visibility: safeUnseen ? options.visibility : null,
        suppressTargetedAttack: rules.random }, this.targetingService);
    const base = Number.isFinite(skill) ? skill - (safeUnseen ? rules.penalty : 0) : null;
    const calculated = Number.isFinite(base) ? base + rules.penalty : null;
    const final = calculated === null ? null : rules.blind ? Math.min(calculated, 9) : calculated;
    return `<span>\u0420\u0430\u0441\u0447\u0451\u0442: ${base ?? "\u2014"}</span>
      <span>\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c: ${rules.penalty}</span>
      ${rules.blind ? "<span>Cap Shooting Blind: 9</span>" : ""}
      <strong>\u0418\u0442\u043e\u0433: ${final ?? "\u2014"}</strong>`;
  }

  _hasUnseenDirection() {
    const state = this.visibility;
    if (state?.mode !== "unseen") return true;
    if (state.blindFireHex) return !state.targetTokenId;
    if (!["approximate", "exact"].includes(state.location) || !state.targetTokenId) return false;
    const targets = [...(globalThis.game?.user?.targets ?? [])];
    return targets.length === 1 && targets[0]?.id === state.targetTokenId;
  }

  _buildUnseenLocationContent(state) {
    const hex = state.blindFireHex;
    const status = hex ? (this.mode === "melee" ? "\u0410\u0442\u0430\u043a\u0430 \u0432 \u0433\u0435\u043a\u0441: " : "\u0421\u0442\u0440\u0435\u043b\u044c\u0431\u0430 \u0432 \u0433\u0435\u043a\u0441: ") + hex.i + ", " + hex.j
      : state.location === "exact" ? "\u041c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435: \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e \u0442\u043e\u0447\u043d\u043e"
      : state.hearing === "success" ? "\u041c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435: \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e \u043f\u043e \u0441\u043b\u0443\u0445\u0443"
      : state.location === "approximate" ? "\u041c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435: \u043f\u0440\u0438\u0431\u043b\u0438\u0437\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e"
      : "\u041c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435: \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e";
    const hearing = Number(this.token?.actor?.system?.hearing);
    const manual = !Number.isFinite(hearing) || hearing <= 0;
    const canChoose = ["approximate", "exact"].includes(state.location);
    const method = state.locationMethod ??
      (state.hearing ? "hearing" : state.location === "hex" ? "blind-fire"
        : canChoose ? "other" : null);
    const button = (action, label, selected) =>
      '<button type="button" data-fire-action="' + action + '" class="' +
      (selected ? 'is-selected' : '') + '" aria-pressed="' + (selected ? 'true' : 'false') +
      '">' + label + '</button>';
    return '<div class="gam-visibility-location"><strong>\u041c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438</strong>'
      + (manual ? '<label>Hearing <input type="number" name="manualHearing" min="1" step="1" value="' + escapeHTML(this.manualHearingLevel ?? "") + '"></label>' : "")
      + button("hearing-check", "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u043b\u0443\u0445\u0430 (Hearing-2)", method === "hearing")
      + button("known-location", "\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e \u0434\u0440\u0443\u0433\u0438\u043c \u0441\u043f\u043e\u0441\u043e\u0431\u043e\u043c", method === "other")
      + button("blind-fire", this.mode === "melee" ? "\u0410\u0442\u0430\u043a\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0443\u0433\u0430\u0434" : "\u0421\u0442\u0440\u0435\u043b\u044f\u0442\u044c \u043d\u0430\u0443\u0433\u0430\u0434", method === "blind-fire")
      + (this._knownMethodOpen || method === "other"
        ? button("known-approx", "\u041f\u0440\u0438\u0431\u043b\u0438\u0437\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e (-6)", method === "other" && state.location === "approximate")
          + button("known-exact", "\u0422\u043e\u0447\u043d\u043e \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e \u0432 \u043f\u0440\u0435\u0434\u0435\u043b\u0430\u0445 1 \u044f\u0440\u0434\u0430 (" + (this.mode === "melee" ? "-5" : "-4") + ")", method === "other" && state.location === "exact")
        : "")
      + (canChoose
        ? button("choose-token", "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 Token", !!state.targetTokenId)
          + button("choose-hex", "\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0433\u0435\u043a\u0441", !!hex)
        : "")
      + '<span class="gam-visibility-location-status">' + status + '</span></div>';
  }

  _buildVisibilityRuleHint(rules) {
    return !rules.aimAllowed ? "<p>Aim \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d; Hit Location: Random; \u043b\u0430\u0437\u0435\u0440 \u043d\u0435 \u0434\u0430\u0451\u0442 \u0431\u043e\u043d\u0443\u0441.</p>" : "";
  }

  _buildVisibilityContent() {
    const state = this.visibility;
    if (!state) return "";
    const rules = visibilityRules(state);
    const opts = [
      ["partial", "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u0430\u044f \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c"],
      ["unseen", "\u0426\u0435\u043b\u044c \u043d\u0435 \u0432\u0438\u0434\u043d\u0430"],
      ["known", "\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e"],
      ["blind", "\u041f\u043e\u043b\u043d\u0430\u044f \u0442\u0435\u043c\u043d\u043e\u0442\u0430 / \u043e\u0441\u043b\u0435\u043f\u043b\u0451\u043d"]
    ].map(([id, label]) => `<option value="${id}" ${state.mode === id ? "selected" : ""}>${label}</option>`).join("");
    const hearing = Number(this.token?.actor?.system?.hearing);
    const manual = !Number.isFinite(hearing) || hearing <= 0;
    const target = state.knownLocation ? [...(globalThis.game?.user?.targets ?? [])][0] : null;
    const safeName = target && target.visible !== false ? getSafeTargetName(target) : "\u0426\u0435\u043b\u044c";
    return `<section class="gam-visibility">
      <div class="gam-visibility-header"><h4>\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c</h4>${this.mode === "melee" ? "" : '<button type="button" data-fire-action="exit-visibility">\u041e\u0431\u044b\u0447\u043d\u0430\u044f \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c</button>'}</div>
      <div class="gam-visibility-fields"><label>\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 <select name="visibilityMode">${opts}</select></label>
      ${state.mode === "partial" ? `<label>\u0428\u0442\u0440\u0430\u0444 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u0438 <input type="number" name="partialPenalty" min="-9" max="-1" step="1" value="${state.partialPenalty}"></label>` : ""}
      ${state.mode === "blind" ? `<label><input type="checkbox" name="accustomed" ${state.accustomed ? "checked" : ""}> \u041f\u0440\u0438\u0432\u044b\u043a \u043a \u0441\u043b\u0435\u043f\u043e\u0442\u0435</label>` : ""}</div>
      ${state.mode === "unseen" ? this._buildUnseenLocationContent(state) : ""}
      ${state.mode === "blind" ? `<div class="gam-visibility-location"><strong>\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044f</strong>
        ${manual ? `<label>Hearing (\u0432\u0440\u0443\u0447\u043d\u0443\u044e) <input type="number" name="manualHearing" min="1" step="1" value="${escapeHTML(this.manualHearingLevel ?? "")}"></label>` : ""}
        <button type="button" data-fire-action="hearing-check">\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u043b\u0443\u0445\u0430 (Hearing-2)</button>
        <button type="button" data-fire-action="known-location">\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e \u0434\u0440\u0443\u0433\u0438\u043c \u0441\u043f\u043e\u0441\u043e\u0431\u043e\u043c</button>
        <span>${state.knownLocation ? "\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e: " + escapeHTML(safeName) : state.hearing === "success" && state.hex ? "\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u043e: \u0433\u0435\u043a\u0441" : "\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e"}</span>
        <button type="button" data-fire-action="choose-hex">\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0433\u0435\u043a\u0441</button><span>${state.hex ? `\u0413\u0435\u043a\u0441: ${state.hex.i}, ${state.hex.j}` : ""}</span></div>` : ""}
      ${this._buildVisibilityRuleHint(rules)}
      <div class="gam-visibility-breakdown" data-visibility-breakdown>${this._buildVisibilityBreakdown()}</div>
    </section>`;
  }

  _buildContent(fireState) {
    const fireMode = this._getRapidFireState(fireState);
    const aimBonus = this._getAimBonus(fireState);
    const bracingBonus = this._getBracingBonus(fireState);
    const laserBonus = this._getLaserBonus(fireState);
    const aimedFireModifier = aimBonus + bracingBonus;
    const displayedAcc = this._getDisplayedAcc(fireState);
    const displayedRoF = this._getDisplayedRoF(fireMode);
    const shotLimits = this._getShotLimits(fireState);
    const shotsRange = shotLimits.minShots === shotLimits.maxShots
      ? String(shotLimits.maxShots)
      : `${shotLimits.minShots}-${shotLimits.maxShots}`;
    const shotsLabel = this.mode === "standalone" ? "Выстрелы" : `Выстрелы (${shotsRange})`;
    const shotsMax = Number.isFinite(shotLimits.maxShots) ? ` max="${shotLimits.maxShots}"` : "";
    const rofContent = this._buildRofContent(fireState);
    const skillPreview = this._getSkillPreview();
    const sourceSkill = Number(this.attack?.level);
    const sourceSkillText = "Ranged Weapon Level " + (Number.isFinite(sourceSkill) ? Math.trunc(sourceSkill) : "?");
    const attackStats = this.mode === "standalone" ? "" : this._getAttackStatsText(displayedRoF, displayedAcc);
    const elevation = this._getElevationCalculation(fireState);
    const recommendationText = this._formatTargetRecommendation();
    const rrs = resolveRangedRapidStrike({ actor: this.actor, attack: this.attack,
      governingSkill: this._getGoverningSkill(),
      governingSpecialty: this._getGoverningSkill()?.specialty ?? fireState.governingSpecialty });
    const rrsAvailable = this._rrsAllowed();

    const rows = this.rangeBands.map(range => {
      const selected = fireState.selectedRangeIndex === range.index;
      const recommended = this.recommendation?.rangeIndex === range.index;
      const elevationRecommended = elevation?.rangeIndex === range.index;
      const rrsMarkers = this._getRrsRangeMarkers(range.index);
      const penalty = range.penalty >= 0 ? `+${range.penalty}` : String(range.penalty);
      return `
        <button type="button" class="gam-fire-range-row ${selected ? "selected" : ""} ${recommended ? "recommended" : ""} ${elevationRecommended ? "elevation-recommended" : ""} ${rrsMarkers.map(index => `gam-rrs-range-${index}`).join(" ")}" data-range-index="${range.index}" aria-pressed="${selected}">
          <span>${escapeHTML(range.label)}</span>
          <strong class="gam-fire-range-penalty">${penalty}</strong>
          <span class="gam-fire-range-markers">
            ${fireState.rangedRapidStrike && this._rrsSlots
              ? `<span class="gam-hit-selection-markers" data-rrs-range-markers>${this._buildRrsRangeMarkers(rrsMarkers)}</span>`
              : `<span class="gam-fire-range-marker gam-fire-range-marker-selected" data-selected-marker ${selected ? "" : "hidden"}>\u0412\u044b\u0431\u0440\u0430\u043d\u043e</span>`}
            <span class="gam-fire-range-marker gam-fire-range-marker-recommended" data-target-marker ${recommended ? "" : "hidden"}>${this.visibility?.mode === "unseen" && this.visibility.blindFireHex ||
              this.visibility?.mode === "blind" && !this.visibility.knownLocation ? "\u0413\u0435\u043a\u0441" : "GGA target"}</span>
            <span class="gam-fire-range-marker gam-fire-range-marker-elevation" data-elevation-marker ${elevationRecommended ? "" : "hidden"}>Высота</span>
          </span>
        </button>
      `;
    }).join("");

    return `
      <div class="gam-fire-preparation">
        <div class="gam-fire-summary">
          <div class="gam-fire-summary-main">
            <h3>${escapeHTML(this.mode === "standalone" ? "Fire Control" : this.weapon.name)}</h3>
            ${this.mode === "standalone" ? this._buildStandaloneStats(fireState) : `<p class="gam-fire-attack-stats" data-attack-stats title="${escapeHTML(attackStats)}">${escapeHTML(attackStats)}</p>`}
            ${this._buildGoverningSkillSelector(fireState)}
          </div>
          <div class="gam-fire-skill" aria-live="polite">
            <span class="gam-fire-skill-label">Эффективное умение</span>
            <strong class="gam-fire-skill-value" data-skill-preview style="color: ${skillProbabilityColor(skillPreview.probability)}">${skillPreview.level} (${skillPreview.chance}%)</strong>
            ${this.mode === "standalone" ? `<label class="gam-fire-source-skill">Значение умения: <input type="number" name="skillLevel" value="${escapeHTML(fireState.skillLevel)}" placeholder="0" min="1" step="1" required autofocus></label>` : `<span class="gam-fire-source-skill" data-source-skill>Значение умения: ${escapeHTML(sourceSkillText)}</span>`}
          </div>
        </div>
        ${this._buildVisibilityContent()}
        <div class="gam-fire-layout">
          <div class="gam-fire-left">
            <div class="gam-fire-fields">
              <label class="gam-fire-field">
                <span data-shots-label>${shotsLabel}</span>
                <input type="number" name="shots" value="${escapeHTML(fireState.shots)}" placeholder="${shotLimits.minShots}" min="${shotLimits.minShots}"${shotsMax} step="1" ${this.mode === "weapon" ? "autofocus" : ""}>
              </label>
              <label class="gam-fire-field">
                <span>Бонусы/штрафы</span>
                <input type="number" name="manualModifier" value="${escapeHTML(fireState.manualModifier)}" placeholder="0" step="1">
              </label>
              <div class="gam-fire-field gam-fire-field-checkbox">
                  <span>Лазер <strong data-laser-preview>+${fireState.laserSight ? laserBonus : 1}</strong></span>
                  <input type="checkbox" name="laserSight" ${visibilityRules(this._visibilityForTargeting())?.random ? "disabled" : ""} aria-label="Лазерный прицел" ${fireState.laserSight ? "checked" : ""}>
                </div>
              <label class="gam-fire-aim">
                  <span>Aim:</span>
                  <input type="number" name="aimSeconds" ${visibilityRules(this.visibility)?.aimAllowed === false ? "disabled" : ""} value="${escapeHTML(fireState.aimSeconds)}" placeholder="0" min="0" step="1" inputmode="numeric" aria-label="Aim в секундах">
                  <span>сек.</span>
                  <span class="gam-fire-aim-effective">Eff. mod:</span>
                  <strong class="gam-fire-aim-bonus" data-aim-preview>+${aimedFireModifier}</strong>
                </label>
              <div class="gam-fire-field gam-fire-field-checkbox">
                  <span>Движение и атака</span>
                  <input type="checkbox" name="moveAndAttack" aria-label="Движение и атака" ${fireState.moveAndAttack ? "checked" : ""}>
                </div>
              <div class="gam-fire-braced" title="Бонус применяется только при Aim">
                  <span>Упор</span>
                  <input type="checkbox" name="braced" ${visibilityRules(this.visibility)?.aimAllowed === false ? "disabled" : ""} aria-label="Упор" ${fireState.braced ? "checked" : ""}>
                </div>
              <div class="gam-fire-field gam-fire-field-checkbox">
                  <span>\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430 <strong>+1</strong></span>
                  <input type="checkbox" name="allOutAttack" aria-label="\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430" ${fireState.allOutAttack ? "checked" : ""}>
                </div>
              ${this.mode === "weapon" ? `<button type="button" class="gam-techniques-button" data-fire-action="techniques">\u0422\u0435\u0445\u043d\u0438\u043a\u0438</button>` : ""}
              <div class="gam-fire-rof-row ${fireState.rangedRapidStrike && this._rrsSlots ? "has-rrs-slots" : ""}">
                <div class="gam-fire-rof-container" data-rof-container>${rofContent}</div>
                ${fireState.rangedRapidStrike && this._rrsSlots ? `<div class="gam-attack-slots gam-rrs-slots">
                  ${this._rrsSlots.map((_slot, index) => `<button type="button" data-rrs-slot="${index}"
                    class="gam-attack-slot gam-rapid-attack-${index + 1} ${index === this._activeRrsSlot ? "is-active" : ""}"
                    aria-pressed="${index === this._activeRrsSlot}">Attack ${index + 1}</button>`).join("")}
                  <span data-rrs-split></span></div>` : ""}
              </div>
            </div>
            <section>
              <div class="gam-fire-range-heading">
                <h4>Расстояние</h4>
                <div class="gam-fire-elevation-controls">
                  <label class="gam-fire-height-field">
                    <span>Высота</span>
                    <input type="number" name="height" value="${escapeHTML(fireState.height)}" min="0" step="any" inputmode="decimal" aria-label="Высота в ярдах">
                    <span class="gam-fire-height-unit">ярды</span>
                  </label>
                  <span class="gam-fire-elevation-separator" aria-hidden="true">|</span>
                  <label class="gam-fire-high-ground">
                    <span>High Ground</span>
                    <input type="checkbox" name="highGround" ${fireState.elevationDirection === "high" ? "checked" : ""}>
                  </label>
                  <label class="gam-fire-high-ground">
                    <span>Low Ground</span>
                    <input type="checkbox" name="lowGround" ${fireState.elevationDirection === "low" ? "checked" : ""}>
                  </label>
                </div>
                <p data-target-recommendation>${escapeHTML(recommendationText)}</p>
              </div>
              <div
                class="gam-fire-effective-distance"
                data-effective-distance
                aria-live="polite"
                ${elevation ? "" : "hidden"}
              >
                Реальная дистанция: <strong data-effective-distance-value>${elevation ? formatDistance(elevation.effectiveDistance) : ""}</strong> ярдов
              </div>
              <div class="gam-fire-range-list" role="listbox" aria-label="Диапазоны расстояния">${rows}</div>
            </section>
          </div>
          ${this._buildHitLocationContent(fireState)}
        </div>
        <div class="gam-fire-actions">
          <button type="button" data-fire-action="confirm" ${this.visibility?.mode === "unseen" && !this._hasUnseenDirection() ? "disabled" : ""} title="${this.visibility?.mode === "unseen" && !this._hasUnseenDirection() ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u0435\u043a\u0441 \u0434\u043b\u044f \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b" : ""}"><i class="fa-solid fa-crosshairs"></i> Выполнить выстрел</button>
          <button type="button" data-fire-action="cancel"><i class="fa-solid fa-xmark"></i> Отмена</button>
        </div>
      </div>
    `;
  }
}