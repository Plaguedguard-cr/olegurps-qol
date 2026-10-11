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
    const skill = mode.governing_skill?.status === "resolved" ? mode.governing_skill.skill : null;
    const skillName = skill ? skill.name + (skill.specialization ? " (" + skill.specialization + ")" : "") : standaloneText("Unknown");
    return `<fieldset class="gam-standalone-mode"><legend><label><input type="checkbox" data-standalone-mode="${escape(id)}" ${selected ? "checked" : ""}>${escape(mode.usage || draft.equipment.name)}</label></legend>` +
      (skill ? `<p>${escape(standaloneText("Skill"))}: <strong>${escape(skillName)}</strong></p>` :
        selected ? `<label>${escape(standaloneText("Skill"))}<input type="text" data-standalone-stat="governingSkill" data-mode-id="${escape(id)}" value="${escape(draft.overrides[id]?.governingSkill ?? "")}" placeholder="${escape(standaloneText("MissingInput"))}" title="${escape(standaloneText("Missing"))}"></label>` :
          `<p>${escape(standaloneText("Skill"))}: ${escape(skillName)}</p>`) +
      (selected ? `<div class="gam-standalone-stats">${keys.map(key => {
        const value = draft.overrides[id]?.[key] ?? stats[key] ?? "";
        return `<label>${labels[key]}<input type="text" data-standalone-stat="${key}" data-mode-id="${escape(id)}" value="${escape(value)}" placeholder="${escape(standaloneText("MissingInput"))}" title="${escape(stats[key] == null ? standaloneText("Missing") : standaloneText("Override"))}"></label>`;
      }).join("")}</div>` : "") +
      `<p class="hint">${escape([draft.equipment.local_notes, mode.usage_notes].filter(Boolean).join(" "))}</p></fieldset>`;
  }).join("");
}

export function standaloneConfigurationHTML(draft) {
  return `<div class="gam-standalone-config"><p class="hint">${escape(standaloneText("Pending"))}</p>
    <label>${escape(standaloneText("Source"))}<select name="standaloneSource"><option value="">${escape(standaloneText("All"))}</option>${["LT", "HT", "UT"].map(source => `<option ${source === draft.source ? "selected" : ""}>${source}</option>`).join("")}</select></label>
    <label>${escape(standaloneText("Search"))}<input type="search" name="standaloneQuery" value="${escape(draft.query)}"></label>
    <p class="hint">${escape(standaloneText("ChooseFirst"))}</p>
    <label>${escape(standaloneText("Model"))}<select name="standaloneModel">${standaloneModelOptions(draft)}</select></label>
    <div data-standalone-modes>${standaloneModeFields(draft)}</div></div>`;
}

export function bindStandaloneConfiguration(root, draft) {
  const models = root.querySelector('[name="standaloneModel"]'), modes = root.querySelector('[data-standalone-modes]');
  const options = () => { models.innerHTML = standaloneModelOptions(draft); };
  root.querySelector('[name="standaloneQuery"]').addEventListener("input", event => { draft.query = event.target.value; options(); });
  root.querySelector('[name="standaloneSource"]').addEventListener("change", event => { draft.source = event.target.value; options(); });
  models.addEventListener("change", event => { draft.selectModel(event.target.value); modes.innerHTML = standaloneModeFields(draft); });
  modes.addEventListener("change", event => {
    const field = event.target;
    if (field.dataset.standaloneMode) {
      if (field.checked) draft.modeIds.add(field.dataset.standaloneMode); else draft.modeIds.delete(field.dataset.standaloneMode);
      modes.innerHTML = standaloneModeFields(draft);
    }
  });
  // Keep the draft current even when Save immediately follows typing in a field.
  modes.addEventListener("input", event => {
    const field = event.target;
    if (!field.dataset.standaloneStat) return;
    const mode = draft.availableModes.find(m => m.weapon_mode_id === field.dataset.modeId);
    const base = String(standaloneModeStats(mode)[field.dataset.standaloneStat] ?? "");
    draft.setOverride(field.dataset.modeId, field.dataset.standaloneStat, field.value.trim() === base ? "" : field.value);
  });
}

/** Preparation library reached from Melee Assistant, including actors with no GGA attacks. */
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
            const yes = await DialogV2.confirm({ window: { title: standaloneText("Delete") }, content: `<p>${escape(standaloneText("ConfirmDelete"))}</p>`,
              yes: { label: standaloneText("Delete") }, no: { label: standaloneText("Cancel") }, rejectClose: false });
            if (yes) await service.remove(button.dataset.standaloneRemove);
          } else {
            const existing = service.get(button.dataset.standaloneEdit);
            const draft = new StandaloneWeaponDraft({ catalogs, type, existing });
            const result = await DialogV2.input({ window: { title: standaloneText(existing ? "Edit" : "Add") },
              content: `<div class="standard-form"><label><input type="checkbox" checked disabled>${escape(standaloneText("Absent"))}</label>${standaloneConfigurationHTML(draft)}</div>`,
              position: { width: 720 }, modal: false, rejectClose: false, ok: { label: standaloneText("Save") },
              render: (_event, editor) => bindStandaloneConfiguration(editor.element, draft) });
            if (result) await service.save(draft);
          }
          const current = root.querySelector('.gam-standalone-library');
          if (current) current.outerHTML = content();
        } catch (error) { ui.notifications.error(error.message); }
        finally { if (button.isConnected) button.disabled = false; }
      });
    }
  });
}
