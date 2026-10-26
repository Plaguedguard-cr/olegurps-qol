import { weaponText, weaponCatalogSearchState,
  weaponComparisonHTML, escapeWeaponHTML } from "./weapon-configuration.js";
import { parseWeaponBulk } from "./weapon-bulk.js";
import { recoilNotApplicable } from './weapon-recoil.js';
import {ltFlameProfile} from '../lt-flame-source.js';
const flameAccuracyNA=attack=>{const id=attack?.catalogModeId??attack?.standaloneRef?.modeId;return id?!!ltFlameProfile(id):attack?.platformRules?.kind==='lt-flame';};

const text = value => String(value ?? "").trim();
const integer = value => {
  if(!text(value))return null;
  const number = Number(text(value).replace(",", "."));
  return Number.isInteger(number) ? number : null;
};

export function validateWeaponAttackOverride(values, parseRateOfFire, attack = null) {
  const skillLevel = integer(values.skillLevel);
  const rof = text(values.rof);
  const noAccuracy=flameAccuracyNA(attack),acc = noAccuracy?null:integer(values.acc);
  const scopeBonus = noAccuracy?0:integer(values.scopeBonus);
  const bulkMetadata = parseWeaponBulk(values.bulk);
  const bulk = bulkMetadata?.numericBulk ?? null;
  const noRecoil=recoilNotApplicable(attack);
  const rcl = noRecoil?null:text(values.rcl);
  const errors = [];

  if (skillLevel === null || skillLevel < 0 || skillLevel > 999) {
    errors.push(weaponText("SkillInvalid"));
  }
  const rofProfile = typeof parseRateOfFire === "function" ? parseRateOfFire(rof) : null;
  if (!rof || !rofProfile?.valid) {
    errors.push(weaponText("RofInvalid"));
  }
  if (!noAccuracy&&(acc === null || acc < 0 || acc > 999)) {
    errors.push(weaponText("AccInvalid"));
  }
  if (scopeBonus === null || scopeBonus < 0 || scopeBonus > 999) {
    errors.push(weaponText("ScopeInvalid"));
  }
  if (bulk === null || bulk < -999 || bulk > 999) {
    errors.push(weaponText("BulkInvalid"));
  }
  if (!noRecoil&&(!/^\d+(?:\s*\/\s*\d+)?$/u.test(rcl) || rcl.split("/").some(part => Number(part.trim()) < 1))) {
    errors.push(weaponText("RclInvalid"));
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? { skillLevel, rof, acc, scopeBonus, bulk, rcl,
      ...(bulkMetadata.hasFoldingStock ? { bulkMetadata } : {}) } : null
  };
}

export async function openWeaponAttackEditor({ DialogV2, attack, escapeHTML = escapeWeaponHTML, parseRateOfFire, configuration = null }) {
  const noRecoil=recoilNotApplicable(attack);
  const noAccuracy=flameAccuracyNA({...attack,catalogModeId:configuration?.target?.modeId??attack?.catalogModeId});
  const draft = configuration ? structuredClone({ target: configuration.target,
    catalogChanged: false }) : null;
  const catalogs = configuration?.catalogs;
  const editorFields = draft ? `
    <label>${escapeHTML(weaponText("Search"))}<input type="search" name="catalogSearch" autocomplete="off" placeholder="${escapeHTML(weaponText("SearchHint"))}" title="${escapeHTML(weaponText("SearchTooltip"))}"></label>
    <p class="hint gam-catalog-search-status" data-search-count role="status" aria-live="polite"></p>
    <label>${escapeHTML(weaponText("Catalog"))}<select name="editorCatalogMode" aria-label="${escapeHTML(weaponText("Catalog"))}"></select></label>
    <div class="gam-catalog-comparison" data-editor-comparison></div>
    <h4>${escapeHTML(weaponText("Parameters"))}</h4>` : "";
  const result = await DialogV2.wait({
    window: { title: `${weaponText("Edit")}: ${attack.label}` },
    position: { width: 520 },
    content: `
      <div class="standard-form gam-attack-editor">
        ${editorFields}
        <input type="hidden" name="skillLevel" value="${escapeHTML(attack.level)}">
        <label class="gam-attack-editor-row">
          <span>RoF</span>
          <input type="text" name="rof" value="${escapeHTML(attack.rof)}" placeholder="3 / 15! / 2\u00d79" required>
        </label>
        <div class="gam-attack-editor-accuracy">
          <label>
            <span>Acc</span>
            <input type="${noAccuracy?'text':'number'}" name="acc" value="${noAccuracy?'Не применяется':escapeHTML(attack.acc ?? '')}" min="0" max="999" step="1" ${noAccuracy?'disabled':'required'}>
          </label>
          <strong aria-hidden="true">+</strong>
          <label>
            <span>${escapeHTML(weaponText("Scope"))}</span>
            <input type="number" name="scopeBonus" value="${escapeHTML(attack.scopeBonus ?? 0)}" min="0" max="999" step="1" ${noAccuracy?'disabled':'required'}>
          </label>
        </div>
        <label class="gam-attack-editor-row">
          <span>Bulk</span>
          <input type="text" name="bulk" value="${escapeHTML(attack.bulkMetadata?.sourceValues?attack.bulk:attack.bulkMetadata?.rawBulk ?? attack.data?.bulk ?? attack.bulk ?? "")}" ${attack.bulkMetadata?.sourceValues&&!attack.bulkMetadata.manual?'readonly':''} required>
        </label>
        <label class="gam-attack-editor-row">
          <span>Rcl</span>
          <input type="text" name="rcl" value="${noRecoil?'Не применяется':escapeHTML(attack.rcl)}" placeholder="2 / 2/1" ${noRecoil?'disabled':'required'}>
        </label>
      </div>
    `,
    buttons: [
      {
        action: "save",
        label: weaponText("Save"),
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => ({
          action: "save",
          values: Object.fromEntries(new FormData(button.form).entries())
        })
      },
      {
        action: "reset",
        label: weaponText("Reset"),
        icon: "fa-solid fa-arrow-rotate-left",
        callback: () => ({ action: "reset" })
      }
    ],
    render: (_event, dialog) => {
      if (!draft) return;
      const root = dialog.element;
      const select = root.querySelector('[name="editorCatalogMode"]');
      const comparison = root.querySelector("[data-editor-comparison]");
      const updateComparison = () => {
        comparison.innerHTML = weaponComparisonHTML(attack, catalogs?.getMode(draft.target?.modeId));
        select.title = select.selectedOptions?.[0]?.textContent ?? "";
        const na=flameAccuracyNA({...attack,catalogModeId:draft.target?.modeId}),acc=root.querySelector('[name="acc"]'),scope=root.querySelector('[name="scopeBonus"]');
        if(acc){acc.disabled=na;acc.required=!na;acc.type=na?'text':'number';if(na)acc.value='Не применяется';else if(!acc.value||acc.value==='Не применяется')acc.value=String(attack.acc??'');}
        if(scope){scope.disabled=na;scope.required=!na;}
      };
      const search = () => {
        const state = weaponCatalogSearchState(catalogs, root.querySelector('[name="catalogSearch"]').value,
          draft.target, configuration.candidates);
        select.innerHTML = `<option value="">${escapeHTML(weaponText("NoBinding"))}</option>` + state.options.map(target =>
          `<option value="${escapeHTML(target.modeId)}" title="${escapeHTML(target.label)}" ${draft.target?.modeId === target.modeId ? "selected" : ""}>${escapeHTML(target.label)}</option>`).join("");
        root.querySelector("[data-search-count]").textContent = state.status;
        updateComparison();
      };
      root.querySelector('[name="catalogSearch"]').addEventListener("input", search);
      select.addEventListener("change", () => {
        const equipment = catalogs?.getEquipmentForMode(select.value);
        draft.target = equipment ? { equipmentId: equipment.equipment_id, modeId: select.value } : null;
        draft.catalogChanged = true;
        updateComparison();
      });
      search();
    },
    rejectClose: false,
    modal: false
  });

  if (!result || result.action === "reset") return result;
  const validation = validateWeaponAttackOverride(result.values, parseRateOfFire, {...attack,catalogModeId:draft?.target?.modeId??attack?.catalogModeId});
  if (!validation.valid) {
    ui.notifications.error(`${weaponText("Invalid")}: ${validation.errors.join("; ")}.`);
    return null;
  }
  if(attack.bulkMetadata?.sourceValues&&validation.value.bulk===attack.bulk)validation.value.bulkMetadata=structuredClone(attack.bulkMetadata);
  const originalBulk = attack.bulkMetadata?.sourceValues?attack.bulkMetadata:parseWeaponBulk(attack.bulkMetadata?.rawBulk ?? attack.data?.bulk ?? attack.bulk);
  const original = { skillLevel: attack.level, rof: text(attack.rof), acc: attack.acc ?? null,
    scopeBonus: attack.scopeBonus ?? 0, bulk: originalBulk?.numericBulk ?? null, rcl: noRecoil?null:text(attack.rcl),
    ...(originalBulk?.hasFoldingStock||originalBulk?.sourceValues ? { bulkMetadata: originalBulk } : {}) };
  const changed = JSON.stringify(validation.value) !== JSON.stringify(original);
  return { action: draft && !changed ? "configuration" : "save", value: validation.value, ...(draft ? { configuration: draft } : {}) };
}
