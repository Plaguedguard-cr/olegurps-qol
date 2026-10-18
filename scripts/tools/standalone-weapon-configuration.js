import { moduleMessage, moduleText } from "../localization.js";
import {specializedPlatform} from '../ht-specialized-platforms.js';
import {weaponBondCheckbox} from './weapon-bond-service.js';
import {weaponText} from './weapon-localization.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { StandaloneWeaponDraft, StandaloneWeaponService, searchStandaloneModels,
  standaloneModeStats, standaloneText } from "./standalone-weapon-service.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const caption = equipment => [equipment.name, equipment.source, equipment.reference].filter(Boolean).join(" — ");

export function standaloneModelOptions(draft) {
  const results = draft.query.trim() ? searchStandaloneModels(draft.catalogs, draft.type, draft.query, draft.source).slice(0, 100) : [];
  const pinned = draft.equipment;
  if (pinned && !results.some(e => e.equipment_id === pinned.equipment_id)) results.unshift(pinned);
  return `<option value="">${escape(standaloneText(results.length || !draft.query ? "Select" : "NoResults"))}</option>` +
    results.map(e => `<option value="${escape(e.equipment_id)}"${e.equipment_id === draft.modelId ? " selected" : ""} title="${escape(caption(e))}">${escape(caption(e))}</option>`).join("");
}

export function standaloneModeFields(draft) {
  const keys = draft.type === "ranged" ? ["damage", "acc", "range", "rof", "shots", "rcl", "bulk", "st"] : ["damage", "reach", "parry", "st", "block"];
  const labels = { damage: "Damage", acc: "Acc", range: "Range", rof: "RoF", shots: "Shots", rcl: "Rcl", bulk: "Bulk", st: "ST", reach: "Reach", parry: "Parry", block: "Block" };
  return draft.availableModes.map(mode => {
    const id = mode.weapon_mode_id, stats = standaloneModeStats(mode), selected = draft.modeIds.has(id);
    const preview=draft.statPreview?.(id);
    const platform=specializedPlatform(mode,draft.equipment.source);
    const skill = mode.governing_skill?.status === "resolved" ? mode.governing_skill.skill : null;
    const skillName = skill ? skill.name + (skill.specialization ? " (" + skill.specialization + ")" : "") : standaloneText("Unknown");
    return `<fieldset class="gam-standalone-mode"><legend><label><input type="checkbox" data-standalone-mode="${escape(id)}" ${selected ? "checked" : ""}>${escape(mode.usage || draft.equipment.name)}</label></legend>` +
      (skill ? `<p>${escape(standaloneText("Skill"))}: <strong>${escape(skillName)}</strong></p>` :
        selected ? `<label>${escape(standaloneText("Skill"))}<input type="text" data-standalone-stat="governingSkill" data-mode-id="${escape(id)}" value="${escape(draft.overrides[id]?.governingSkill ?? "")}" placeholder="${escape(standaloneText("MissingInput"))}" title="${escape(standaloneText("Missing"))}"></label>` :
          `<p>${escape(standaloneText("Skill"))}: ${escape(skillName)}</p>`) +
      (selected && platform?.kind==='host-dependent' ?
        (platform.stockConfiguration?`<label>Исполнение FN 303<select data-standalone-stat="installation" data-mode-id="${escape(id)}"><option value="">Выберите исполнение</option><option value="stock"${draft.overrides[id]?.installation==='stock'?' selected':''}>С прикладом — Bulk −4</option><option value="host"${draft.overrides[id]?.installation==='host'?' selected':''}>Подствольное</option></select></label>`:'')+
        `<label>Bulk оружия-носителя<input data-standalone-stat="hostBulk" data-mode-id="${escape(id)}" value="${escape(draft.overrides[id]?.hostBulk??'')}" placeholder="Например, −5"></label><p class="hint">${platform.source}: к Bulk носителя прибавляется ${platform.hostBulkAdjustment}. Собственный носитель не изменяется.</p>`:'')+
      (selected && platform?.instruction?`<p class="hint">${escape(platform.instruction)}</p>`:'')+
      (selected && htPreGaussProfile(id)?.continuousUnits?`<label>Струя Beattie M2-2<select data-standalone-stat="jetMode" data-mode-id="${escape(id)}"><option value="short" ${draft.overrides[id]?.jetMode!=='continuous'?'selected':''}>2 с — один подготовленный заряд</option><option value="continuous" ${draft.overrides[id]?.jetMode==='continuous'?'selected':''}>10 с — пять подготовленных зарядов</option></select></label>`:'')+
      (selected && platform?.blockedReason?`<p class="hint">${escape(platform.blockedReason)}</p>`:'')+
      (selected && platform?.terminalInstruction?`<p class="hint">${escape(platform.terminalInstruction)}</p>`:'')+
      (selected ? `<div class="gam-standalone-stats">${keys.map(key => {
        const value = preview?.stats[key] ?? draft.overrides[id]?.[key] ?? stats[key] ?? "";
        const derived=preview?.derivedFields.includes(key);
        if(key==='rcl'&&platform?.rclNotApplicable||key==='bulk'&&platform?.bulkNotApplicable||key==='acc'&&platform?.accNotApplicable)return `<label>${labels[key]}<input disabled value="Не применяется"></label>`;
        return `<label>${labels[key]}<input type="text" ${derived?'readonly ':''}data-standalone-stat="${key}" data-mode-id="${escape(id)}" value="${escape(value)}" placeholder="${escape(standaloneText("MissingInput"))}" title="${escape(derived?weaponText('DerivedExecution'):stats[key] == null ? standaloneText("Missing") : standaloneText("Override"))}"></label>`;
      }).join("")}</div>` : "") +
      `<p class="hint" data-standalone-profile="${escape(id)}" ${!preview?.resolvedDamage||preview.resolvedDamage===preview.stats.damage?'hidden':''}>${escape(moduleText('OleGURPS.Weapon.ResolvedProfile',{damage:preview?.resolvedDamage??''}))}</p>`+
      `<p class="hint">${escape([draft.equipment.local_notes, mode.usage_notes].filter(Boolean).join(" "))}</p></fieldset>`;
  }).join("");
}

export function updateStandaloneResolvedDamage(root,draft,id,preview=draft.statPreview?.(id)){
  const line=root.querySelector(`[data-standalone-profile="${id}"]`);if(!line)return;
  line.hidden=!preview?.resolvedDamage||preview.resolvedDamage===preview.stats.damage;
  line.textContent=moduleText('OleGURPS.Weapon.ResolvedProfile',{damage:preview?.resolvedDamage??''});
}

export function standaloneConfigurationHTML(draft) {
  return `<div class="gam-standalone-config"><p class="hint">${escape(standaloneText("Pending"))}</p>
    ${draft.existing?'<button type="button" data-standalone-refresh>Обновить данные из каталога</button><p class="hint">Обновляются исходные параметры. Пользовательские значения, боезапас и старые атаки сохраняются.</p>':''}
    <label>${escape(standaloneText("Source"))}<select name="standaloneSource"><option value="">${escape(standaloneText("All"))}</option>${["LT", "HT", "UT"].map(source => `<option ${source === draft.source ? "selected" : ""}>${source}</option>`).join("")}</select></label>
    <label>${escape(standaloneText("Search"))}<input type="search" name="standaloneQuery" value="${escape(draft.query)}"></label>
    <p class="hint">${escape(standaloneText("ChooseFirst"))}</p>
    <label>${escape(standaloneText("Model"))}<select name="standaloneModel">${standaloneModelOptions(draft)}</select></label>
    <div data-standalone-modes>${standaloneModeFields(draft)}</div>
    ${weaponBondCheckbox({available:draft.weaponBondAvailable,checked:draft.weaponBond,name:'standaloneWeaponBond'})}</div>`;
}

export function bindStandaloneConfiguration(root, draft) {
  root.querySelector('[name="standaloneWeaponBond"]')?.addEventListener('change',event=>{
    draft.weaponBond=event.target.checked;draft.weaponBondChanged=true;
  });
  const models = root.querySelector('[name="standaloneModel"]'), modes = root.querySelector('[data-standalone-modes]');
  const options = () => { models.innerHTML = standaloneModelOptions(draft); };
  root.querySelector('[name="standaloneQuery"]').addEventListener("input", event => { draft.query = event.target.value; options(); });
  root.querySelector('[name="standaloneSource"]').addEventListener("change", event => { draft.source = event.target.value; options(); });
  root.querySelector('[data-standalone-refresh]')?.addEventListener('click',()=>{
    if(draft.refreshCatalogData()){options();modes.innerHTML=standaloneModeFields(draft);}
    else globalThis.ui?.notifications?.warn?.('Не удалось подтвердить исходную версию этой модели. Сохранённое оружие не изменено.');
  });
  models.addEventListener("change", event => { draft.selectModel(event.target.value); modes.innerHTML = standaloneModeFields(draft); });
  modes.addEventListener("change", event => {
    const field = event.target;
    if(field.dataset.standaloneStat==='jetMode'){draft.setOverride(field.dataset.modeId,'jetMode',field.value);return;}
    if(field.dataset.standaloneStat==='installation') {draft.setOverride(field.dataset.modeId,'installation',field.value);modes.innerHTML=standaloneModeFields(draft);return;}
    if (field.dataset.standaloneMode) {
      if (field.checked) draft.modeIds.add(field.dataset.standaloneMode); else draft.modeIds.delete(field.dataset.standaloneMode);
      modes.innerHTML = standaloneModeFields(draft);
    }
  });
  // Keep the draft current even when Save immediately follows typing in a field.
  modes.addEventListener("input", event => {
    const field = event.target;
    if (!field.dataset.standaloneStat || field.readOnly) return;
    const mode = draft.availableModes.find(m => m.weapon_mode_id === field.dataset.modeId);
    const base = String(standaloneModeStats(mode)[field.dataset.standaloneStat] ?? "");
    draft.setOverride(field.dataset.modeId, field.dataset.standaloneStat, field.value.trim() === base ? "" : field.value);
    updateStandaloneResolvedDamage(root,draft,field.dataset.modeId);
  });
}

/** Preparation library reached from Помощник ближнего боя, including actors with no GGA attacks. */
export async function openStandaloneWeaponLibrary({ actor, type = "melee", catalogs = globalThis.OleGURPSQOL?.catalogs }) {
  if (!actor.isOwner) throw new Error(standaloneText("Owner"));
  try { await catalogs?.load(); } catch (error) { console.warn("OleGURPS catalog", error); }
  const DialogV2 = foundry.applications.api.DialogV2;
  const service = new StandaloneWeaponService(actor, catalogs);
  const content = () => {
    const rows = service.list(type);
    return `<div class="standard-form gam-standalone-library"><p class="hint">${escape(standaloneText("Pending"))}</p>` +
      (rows.length ? rows.map(w => `<section class="gam-standalone-mode"><h3>${escape(w.name)}</h3><p>${escape(w.source.source)} · ${escape(w.modes.map(m => m.snapshot.usage || m.modeId).join("; "))}</p>
        <div class="gam-standalone-actions">${type === "melee" ? `<button type="button" data-standalone-use="${escape(w.id)}">Выбрать для атаки</button>` : ""}<button type="button" data-standalone-edit="${escape(w.id)}">${escape(standaloneText("Edit"))}</button><button type="button" data-standalone-remove="${escape(w.id)}">${escape(standaloneText("Delete"))}</button></div></section>`).join("") : `<p>${escape(standaloneText("Empty"))}</p>`) +
      `<button type="button" data-standalone-add>${escape(standaloneText("Add"))}</button></div>`;
  };
  return DialogV2.wait({ window: { title: standaloneText("Library") + " — " + actor.name }, position: { width: 680 },
    content: content(), buttons: [{ action: "close", label: standaloneText("Cancel") }], rejectClose: false, modal: false,
    render: (_event, dialog) => {
      const root = dialog.element;
      root.addEventListener("click", async event => {
        const button = event.target.closest("[data-standalone-add], [data-standalone-edit], [data-standalone-remove], [data-standalone-use]");
        if (!button || button.disabled) return;
        event.preventDefault(); button.disabled = true;
        try {
          if (button.dataset.standaloneUse) {
            if (globalThis.canvas?.tokens?.controlled?.length !== 1 || globalThis.canvas.tokens.controlled[0].actor?.id !== actor.id)
              throw new Error("Выберите токен этого персонажа, чтобы открыть помощник атаки.");
            const { MeleeAssistantStateService, setSelectedMeleeAttack } = await import("./melee-assistant-state.js");
            const { readStandaloneAttack } = await import("./standalone-attack-service.js");
            const attack = readStandaloneAttack(actor, button.dataset.standaloneUse);
            if (!attack) throw new Error(standaloneText("Stale"));
            const preferences = new MeleeAssistantStateService(actor), state = await preferences.load();
            setSelectedMeleeAttack(state, attack); await preferences.save(state);
            await dialog.close();
            const { openMeleeAssistant } = await import("./melee-assistant.js");
            return await openMeleeAssistant();
          }
          if (button.dataset.standaloneRemove) {
            const yes = await DialogV2.confirm({ window: { title: standaloneText("Delete") }, content: `<p>${escape(service.get(button.dataset.standaloneRemove)?.name ?? "")}</p><p>${escape(standaloneText("ConfirmDelete"))}</p>`,
              yes: { label: standaloneText("Delete") }, no: { label: standaloneText("Cancel") }, rejectClose: false });
            if (yes) await service.remove(button.dataset.standaloneRemove);
          } else {
            const existing = service.get(button.dataset.standaloneEdit);
            let legacyBond=null;
            if(existing&&type==='melee') {
              const {getMeleeAttackSettings}=await import('./melee-assistant-state.js');
              const {readStandaloneAttack}=await import('./standalone-attack-service.js');
              legacyBond=getMeleeAttackSettings(actor.getFlag('world','olegurpsMeleeAssistant'),
                readStandaloneAttack(actor,existing.id,existing.modes[0]?.modeId)).weaponBond;
            }
            const draft = new StandaloneWeaponDraft({ catalogs, type, existing, actor, weaponBond:legacyBond });
            const result = await DialogV2.input({ window: { title: standaloneText(existing ? "Edit" : "Add") },
              content: `<div class="standard-form"><label><input type="checkbox" checked disabled>${escape(standaloneText("Absent"))}</label>${standaloneConfigurationHTML(draft)}</div>`,
              position: { width: 720 }, modal: false, rejectClose: false, ok: { label: standaloneText("Save") },
              render: (_event, editor) => bindStandaloneConfiguration(editor.element, draft) });
            if (result) await service.save(draft);
          }
          const current = root.querySelector('.gam-standalone-library');
          if (current) current.outerHTML = content();
        } catch (error) { ui.notifications.error(moduleMessage(error.message)); }
        finally { if (button.isConnected) button.disabled = false; }
      });
    }
  });
}
