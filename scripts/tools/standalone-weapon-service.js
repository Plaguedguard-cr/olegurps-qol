import { CATALOG_DEFINITIONS } from "../catalog-service.js";
import { validateInventory } from "./ammo-inventory.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";

export const STANDALONE_WEAPON_FLAG = "standaloneWeapons";
const scope = "olegurps-qol";
const queues = new WeakMap();
const clone = value => structuredClone(value);
const text = value => String(value ?? "").trim();
const fields = { damage: "damage", acc: "accuracy", range: "range", rof: "rate_of_fire",
  shots: "shots", rcl: "recoil", bulk: "bulk", st: "strength", reach: "reach", parry: "parry", block: "block",
  governingSkill: "governingSkill" };

export const standaloneMessages = Object.freeze({
  Absent: "Нет в листе персонажа", Search: "Поиск по названию оружия", Source: "Источник",
  All: "Все источники", Model: "Модель оружия", Select: "Выберите модель", Modes: "Режимы атаки",
  Pending: "Выберите режим и проверьте требуемый навык перед атакой.",
  Library: "Автономное оружие", Add: "Добавить оружие", Edit: "Настроить", Delete: "Удалить",
  Save: "Сохранить", Cancel: "Отмена", Empty: "Автономное оружие ещё не добавлено.",
  Missing: "Нет в источнике — можно заполнить вручную", MissingInput: "Не указано", Override: "Переопределение OleGURPS",
  Skill: "Требуемый навык", Unknown: "Не указан в источнике", NoResults: "Модели не найдены",
  SelectModes: "Выберите модель и хотя бы один режим атаки.", Owner: "Нет прав на изменение оружия персонажа.",
  Resources: "Сначала разрядите и удалите связанные магазины и уберите свободный запас через «Снарядить / Разрядить». Боеприпасы сохранены; удаление отменено.",
  Stale: "Эта запись уже изменена в другом окне. Откройте её заново.",
  ConfirmDelete: "Удалить автономную запись? Лист персонажа и старые сообщения атак сохранятся.",
  NoGga: "В листе нет атак ближнего боя. Здесь можно подготовить автономное оружие из каталога.",
  ChooseFirst: "Введите название и выберите конкретную модель. Результаты ограничены первыми 100 совпадениями."
});
export const standaloneText = key => standaloneMessages[key] ?? key;

export function searchStandaloneModels(catalogs, type, query = "", source = "") {
  const normalize = value => text(value).normalize("NFKC").toLowerCase().replace(/\u00d7/g, "x");
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return (catalogs?.getCatalog("weapons")?.equipment ?? []).filter(e => (!source || e.source === source) &&
    e.modes.some(m => m.combat_type === type && m.role === "attack" && !m.hidden) &&
    terms.every(term => normalize([e.name, e.source, e.reference].join(" ")).includes(term)));
}

export function standaloneModeStats(mode) {
  return Object.fromEntries(Object.entries(fields).map(([key, stat]) => [key,
    key === "damage" ? mode?.raw_calc?.damage ?? null : mode?.stats?.[stat] ?? null]));
}

export function standaloneHasResources(actor, id) {
  const weapons = actor.getFlag("world", "gurpsAmmoManager")?.weapons ?? [];
  return weapons.filter(w => w.standaloneWeaponId === id).some(w => w.ammunitionReview ||
    w.ammunitionInventory && !validateInventory(w.ammunitionInventory, w.id) ||
    Number(w.totalAmmo) > 0 || (w.magazines?.length ?? 0) > 0 ||
    (w.ammunitionInventory?.magazines?.length ?? 0) > 0 ||
    w.ammunitionInventory?.stocks?.some(s => Number(s.rounds) > 0));
}

/** Flags only. Records are definitions, never synthetic GGA attacks or inventory Items. */
export class StandaloneWeaponService {
  constructor(actor, catalogs) { Object.assign(this, { actor, catalogs }); }
  load() {
    const data = this.actor?.getFlag?.(scope, STANDALONE_WEAPON_FLAG);
    return clone(data && Array.isArray(data.weapons) ? data : { version: 1, weapons: [] });
  }
  list(type) { return this.load().weapons.filter(w => !type || w.type === type); }
  get(id) { return this.load().weapons.find(w => w.id === id) ?? null; }
  async write(operation) {
    const previous = queues.get(this.actor) ?? Promise.resolve();
    const run = previous.catch(() => {}).then(async () => {
      if (!this.actor.isOwner) throw new Error(standaloneText("Owner"));
      const state = this.load(), result = operation(state);
      await this.actor.setFlag(scope, STANDALONE_WEAPON_FLAG, state);
      return clone(result);
    });
    queues.set(this.actor, run);
    try { return await run; } finally { if (queues.get(this.actor) === run) queues.delete(this.actor); }
  }
  async save(draft) {
    return this.write(state => {
      const old = draft.existing ? state.weapons.find(w => w.id === draft.existing.id) : null;
      if (draft.existing && (!old || old.revision !== draft.existing.revision)) throw new Error(standaloneText("Stale"));
      const equipment = draft.equipment;
      const modes = draft.selectedModes;
      if (!equipment || !modes.length || !["ranged", "melee"].includes(draft.type) ||
          modes.some(m => m.combat_type !== draft.type || m.role !== "attack" || m.hidden))
        throw new Error(standaloneText("SelectModes"));
      const changed = old && (equipment.equipment_id !== old.source.equipmentId ||
        JSON.stringify(modes.map(m => m.weapon_mode_id)) !== JSON.stringify(old.modes.map(m => m.modeId)));
      if (changed && standaloneHasResources(this.actor, old.id)) throw new Error(standaloneText("Resources"));
      const id = old?.id ?? "ow-" + (globalThis.foundry?.utils?.randomID?.(16) ?? crypto.randomUUID());
      const definition = CATALOG_DEFINITIONS.weapons;
      const record = { ...(old ?? {}), id, type: draft.type, revision: (old?.revision ?? 0) + 1,
        name: equipment.name, source: old && !draft.modelChanged ? clone(old.source) : {
          catalog: "weapons", catalogKind: definition.kind, filename: definition.filename,
          schema: definition.schema, revision: definition.revision, source: equipment.source,
          equipmentId: equipment.equipment_id, reference: equipment.reference ?? null,
          sourceHash: this.catalogs.getCatalog("weapons")?.sources.find(s => s.code === equipment.source)?.sha256 ?? null
        },
        equipmentSnapshot: old && !draft.modelChanged ? clone(old.equipmentSnapshot) :
          clone(Object.fromEntries(Object.entries(equipment).filter(([key]) => key !== "modes"))),
        modes: modes.map(mode => ({ modeId: mode.weapon_mode_id,
          snapshot: clone(old && !draft.modelChanged ? old.modes.find(m => m.modeId === mode.weapon_mode_id)?.snapshot ?? mode : mode),
          overrides: clone(draft.overrides[mode.weapon_mode_id] ?? {}) })),
        settings: clone(old?.settings ?? {}), resourceLinks: clone(old?.resourceLinks ??
          (draft.type === "ranged" ? { ammoWeaponId: id } : {})), readiness: "definition-only" };
      if (old) state.weapons[state.weapons.indexOf(old)] = record;
      else state.weapons.push(record);
      return record;
    });
  }
  async remove(id) {
    return this.write(state => {
      if (standaloneHasResources(this.actor, id)) throw new Error(standaloneText("Resources"));
      const index = state.weapons.findIndex(w => w.id === id);
      if (index < 0) throw new Error(standaloneText("Stale"));
      return state.weapons.splice(index, 1)[0];
    });
  }
}

export class StandaloneWeaponDraft {
  constructor({ catalogs, type, existing = null }) {
    Object.assign(this, { catalogs, type, existing });
    this.modelId = existing?.source.equipmentId ?? "";
    this.query = existing?.name ?? "";
    this.source = existing?.source.source ?? "";
    this.modeIds = new Set(existing?.modes.map(m => m.modeId) ?? []);
    this.overrides = Object.fromEntries(existing?.modes.map(m => [m.modeId, clone(m.overrides ?? {})]) ?? []);
    this.modelChanged = false;
  }
  get equipment() {
    // Retain saved source data across catalog revisions and unavailable catalogs.
    if (this.existing && !this.modelChanged) {
      const saved = this.existing.modes.map(m => m.snapshot);
      const sourceHash = this.catalogs?.getCatalog("weapons")?.sources.find(s => s.code === this.existing.source.source)?.sha256;
      const current = this.existing.source.filename === CATALOG_DEFINITIONS.weapons.filename &&
        sourceHash === this.existing.source.sourceHash ?
        this.catalogs?.getEquipment(this.modelId)?.modes ?? [] : [];
      return { ...this.existing.equipmentSnapshot,
        modes: [...saved, ...current.filter(m => !saved.some(s => s.weapon_mode_id === m.weapon_mode_id))] };
    }
    return this.catalogs?.getEquipment(this.modelId) ?? null;
  }
  get availableModes() { return (this.equipment?.modes ?? []).filter(m => m.combat_type === this.type && m.role === "attack" && !m.hidden); }
  get selectedModes() { return this.availableModes.filter(m => this.modeIds.has(m.weapon_mode_id)); }
  selectModel(id) {
    if (id === this.modelId) return;
    const equipment = this.catalogs?.getEquipment(id);
    if (equipment && !equipment.modes.some(m => m.combat_type === this.type && m.role === "attack" && !m.hidden)) return;
    this.modelId = equipment?.equipment_id ?? "";
    this.modelChanged = true;
    this.modeIds = new Set((equipment?.modes ?? []).filter(m => m.combat_type === this.type && m.role === "attack" && !m.hidden).map(m => m.weapon_mode_id));
    this.overrides = {};
  }
  setOverride(modeId, key, value) {
    if (!Object.hasOwn(fields, key) || !this.availableModes.some(m => m.weapon_mode_id === modeId)) return;
    this.overrides[modeId] ??= {};
    const clean = text(value);
    if (clean) this.overrides[modeId][key] = clean;
    else delete this.overrides[modeId][key];
  }
}

export function standaloneAmmoCarrier(record, existing = null) {
  return { ...(existing ?? { id: record.resourceLinks.ammoWeaponId, totalAmmo: 0, capacity: 0,
    magazines: [], loadedIndex: -1, ammoUnconfigured: true, weaponBond: false }),
    name: record.name, standaloneWeaponId: record.id,
    standaloneModeId: record.modes.some(m => m.modeId === existing?.standaloneModeId)
      ? existing.standaloneModeId : record.modes[0]?.modeId, attackRef: {} };
}

/** Separate physical feeds declared by reviewed source identity, preserving every existing carrier. */
export function standaloneAmmoCarriers(record, existing = []) {
  if (record.source.equipmentId !== LEMAT.equipmentId)
    return [standaloneAmmoCarrier(record, existing[0] ?? null)];
  const result = existing.map(carrier => ({ ...carrier }));
  for (const mode of record.modes) {
    const barrel = lematBarrel(mode.modeId);
    if (!barrel) continue;
    let carrier = result.find(w => w.standaloneModeId === mode.modeId);
    if (!carrier && result.length === 1 && !result[0].standaloneModeId) carrier = result[0];
    if (!carrier) {
      const first = result.length === 0;
      carrier = standaloneAmmoCarrier(record);
      carrier.id = first ? record.resourceLinks.ammoWeaponId : record.resourceLinks.ammoWeaponId + ":" + mode.modeId;
      result.push(carrier);
    }
    Object.assign(carrier, { standaloneModeId: mode.modeId, physicalResource: barrel });
  }
  return result;
}
