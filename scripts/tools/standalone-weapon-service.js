import { CATALOG_DEFINITIONS } from "../catalog-service.js";
import { validateInventory, migrateAmmoInventory, initializeInstalledMagazine, projectAmmoInventory } from "./ammo-inventory.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { actorResourceWrites as queues, withActorResourceWrite } from "./actor-resource-writes.js";
import { removeOwnedAmmunitionApprovals } from "./ammunition-approval-service.js";
import { moduleText } from "../localization.js";
import { AmmunitionCompatibilityService } from "../ammunition-compatibility-service.js";

export const STANDALONE_WEAPON_FLAG = "standaloneWeapons";
const scope = "olegurps-qol";
const clone = value => structuredClone(value);
const text = value => String(value ?? "").trim();
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
// Foundry merges object-valued flags recursively; omitted keys are not deletions.
const flagPatch = (before, after) => {
  if (!after || typeof after !== "object" || Array.isArray(after)) return clone(after);
  const patch = clone(after);
  for (const key of Object.keys(before ?? {})) {
    if (!Object.hasOwn(after, key)) patch["-=" + key] = null;
    else if (before[key] && typeof before[key] === "object" && !Array.isArray(before[key])) patch[key] = flagPatch(before[key], after[key]);
  }
  return patch;
};
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
  ConfirmDelete: "Удалить этот экземпляр автономного оружия, все его магазины и весь свободный и снаряжённый боезапас? Другое оружие, лист персонажа и старые сообщения атак сохранятся.",
  AmbiguousResources: "Связи боезапаса неоднозначны или повреждены. Удаление отменено; данные сохранены.",
  DeleteRollback: "Не удалось завершить или подтвердить отмену удаления. Проверьте сохранённое оружие и боезапас перед следующей операцией.",
  NoGga: "В листе нет атак ближнего боя. Здесь можно подготовить автономное оружие из каталога.",
  ChooseFirst: "Введите название и выберите конкретную модель. Результаты ограничены первыми 100 совпадениями."
});
export const standaloneText = key => moduleText("OleGURPS.Standalone." + key, {}, standaloneMessages[key]);

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
      if(!old && equipment.source==='HT' && draft.type==='ranged') {
        const compatibility=new AmmunitionCompatibilityService(this.catalogs);
        for(const mode of modes)if(!(mode.ht_ammo_item_ids??[]).some(id=>
          compatibility.checkCompatibility(mode.weapon_mode_id,id,{book:'ht',kind:'ammo-item'}).status==='compatible'))
          throw Error(mode.weapon_mode_id==='WwlfY-FYthqkLvByK' ? 'Не подтверждён физический патрон Zip-Gun: HT92 указывает .22, но не устанавливает именно .22 LR. Добавление оружия закрыто; старые экземпляры сохраняются.' : 'Не удалось подтвердить физический патрон для этого режима. Добавление оружия закрыто; существующие экземпляры сохраняются.');
      }
      const changed = old && (equipment.equipment_id !== old.source.equipmentId ||
        JSON.stringify(modes.map(m => m.weapon_mode_id)) !== JSON.stringify(old.modes.map(m => m.modeId)));
      if (changed && standaloneHasResources(this.actor, old.id)) throw new Error(standaloneText("Resources"));
      const id = old?.id ?? "ow-" + (globalThis.foundry?.utils?.randomID?.(16) ?? crypto.randomUUID());
      const definition = CATALOG_DEFINITIONS.weapons;
      const record = { ...(old ?? {}), id, type: draft.type, revision: (old?.revision ?? 0) + 1,
        name: draft.refreshing && old?.name!==old?.equipmentSnapshot?.name ? old.name : equipment.name, source: old && !draft.modelChanged ? clone(old.source) : {
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
    return withActorResourceWrite(this.actor, async () => {
      if (!this.actor.isOwner && !globalThis.game?.user?.isGM) throw Error(standaloneText("Owner"));
      const definitions = this.load(), record = definitions.weapons.find(w => w.id === id);
      const originalAmmo = this.actor.getFlag("world", "gurpsAmmoManager");
      const ammo = clone(originalAmmo ?? { version: 10, weapons: [] });
      if (!record && !ammo.weapons?.some(w => w.standaloneWeaponId === id)) return null;
      const fail = () => { throw Error(standaloneText("AmbiguousResources")); };
      if (!record || !Array.isArray(ammo.weapons)) fail();
      const owned = ammo.weapons.filter(w => w.standaloneWeaponId === id);
      const ids = owned.map(w => w.id), modes = record.modes.map(m => m.modeId);
      for (const carrier of owned.filter(w => !w.ammunitionInventory)) {
        const probe = clone(carrier);
        initializeInstalledMagazine(probe);
        if (!migrateAmmoInventory(probe).valid) fail();
      }
      if (new Set(ids).size !== ids.length || owned.some(w => !w.id || w.ammunitionReview ||
          w.standaloneModeId && !modes.includes(w.standaloneModeId) ||
          w.ammunitionInventory && !validateInventory(w.ammunitionInventory, w.id)) ||
          ammo.weapons.some(w => ids.includes(w.id) && w.standaloneWeaponId !== id) ||
          definitions.weapons.some(w => w.id !== id && ids.includes(w.resourceLinks?.ammoWeaponId)) ||
          record.type === "ranged" && (!record.resourceLinks?.ammoWeaponId || owned.length && !ids.includes(record.resourceLinks.ammoWeaponId) ||
            ammo.weapons.some(w => w.id === record.resourceLinks.ammoWeaponId && w.standaloneWeaponId !== id))) fail();
      const magazines = owned.flatMap(w => w.ammunitionInventory?.magazines.map(m => m.id) ?? []);
      if (new Set(magazines).size !== magazines.length || ammo.weapons.some(w => w.standaloneWeaponId !== id &&
          w.ammunitionInventory?.magazines.some(m => magazines.includes(m.id)))) fail();
      // Token/Region suppression sessions have their own lifecycle. Do not orphan them
      // or attempt a partial multi-document deletion while that lifecycle is active.
      const weaponKeys = new Set([...ids, ...modes.map(mode => `olegurps:${id}:${mode}`)]);
      for (const scene of globalThis.game?.scenes?.contents ?? []) {
        const sessions = (scene.tokens?.contents ?? []).flatMap(token =>
          Object.values(token.getFlag?.(scope, "suppressionFireSessions") ?? {}));
        const regions = (scene.regions?.contents ?? []).map(region =>
          region.getFlag?.(scope, "suppressionFire") ?? region.flags?.[scope]);
        if ([...sessions, ...regions].some(link => link?.actorId === this.actor.id && weaponKeys.has(link.weaponKey)))
          throw Error(standaloneText("ActiveSuppression"));
      }
      const nextDefinitions = clone(definitions);
      nextDefinitions.weapons = nextDefinitions.weapons.filter(w => w.id !== id);
      ammo.weapons = ammo.weapons.filter(w => w.standaloneWeaponId !== id);
      const attackKeys = modes.map(mode => `uuid:olegurps:${id}:${mode}`);
      for (const field of ["attackOverrides", "governingSkills"]) for (const [key, binding] of Object.entries(ammo[field] ?? {})) {
        if (attackKeys.includes(key) || binding?.kind === "standalone" && binding.weaponId === id) delete ammo[field][key];
      }
      for (const [key, session] of Object.entries(ammo.sprayingFireSessions ?? {})) {
        if (!ids.includes(session.weaponKey)) continue;
        if (session.actorId !== this.actor.id) fail();
        delete ammo.sprayingFireSessions[key];
      }
      const definitionPath = `flags.${scope}.${STANDALONE_WEAPON_FLAG}`, ammoPath = "flags.world.gurpsAmmoManager";
      const meleePath = "flags.world.olegurpsMeleeAssistant";
      const originalMelee = this.actor.getFlag("world", "olegurpsMeleeAssistant"), melee = originalMelee ? clone(originalMelee) : null;
      if (melee) {
        if (attackKeys.includes(melee.selectedAttackKey)) melee.selectedAttackKey = "";
        for (const key of attackKeys) delete melee.attacks?.["key:" + encodeURIComponent(key).replaceAll(".", "%2E")];
      }
      const meleeChanged = JSON.stringify(originalMelee) !== JSON.stringify(melee ?? originalMelee);
      return removeOwnedAmmunitionApprovals({ actorId: this.actor.id,
        weaponIds: [...new Set([...ids, record.resourceLinks?.ammoWeaponId].filter(Boolean))], modeIds: modes }, async approvals => {
        const unchanged = (actual, expected) => JSON.stringify(ordered(actual)) === JSON.stringify(ordered(expected));
        try {
          await this.actor.update({ [definitionPath]: flagPatch(definitions, nextDefinitions), [ammoPath]: flagPatch(originalAmmo, ammo),
            ...(meleeChanged ? { [meleePath]: flagPatch(originalMelee, melee) } : {}) });
          if (!unchanged(this.load(), nextDefinitions) || !unchanged(this.actor.getFlag("world", "gurpsAmmoManager"), ammo))
            throw Error(standaloneText("DeleteRollback"));
          if (meleeChanged && !unchanged(this.actor.getFlag("world", "olegurpsMeleeAssistant"), melee)) throw Error(standaloneText("DeleteRollback"));
          await approvals.commit();
          return clone(record);
        } catch (error) {
          try {
            let approvalRollbackFailed = false;
            try { await approvals.rollback(); } catch { approvalRollbackFailed = true; }
            const currentDefinitions = this.load(), currentAmmo = this.actor.getFlag("world", "gurpsAmmoManager");
            const currentMelee = this.actor.getFlag("world", "olegurpsMeleeAssistant");
            if ((!unchanged(currentDefinitions, definitions) && !unchanged(currentDefinitions, nextDefinitions)) ||
                (!unchanged(currentAmmo, originalAmmo) && !unchanged(currentAmmo, ammo)) ||
                meleeChanged && !unchanged(currentMelee, originalMelee) && !unchanged(currentMelee, melee)) throw Error();
            if (!unchanged(currentDefinitions, definitions) || !unchanged(currentAmmo, originalAmmo) || meleeChanged && !unchanged(currentMelee, originalMelee)) {
              await this.actor.update({ [definitionPath]: flagPatch(currentDefinitions, definitions), ...(originalAmmo === undefined ?
                { "flags.world.-=gurpsAmmoManager": null } : { [ammoPath]: flagPatch(currentAmmo, originalAmmo) }),
                ...(meleeChanged ? { [meleePath]: flagPatch(currentMelee, originalMelee) } : {}) });
            }
            if (!unchanged(this.load(), definitions) || !unchanged(this.actor.getFlag("world", "gurpsAmmoManager"), originalAmmo) ||
                meleeChanged && !unchanged(this.actor.getFlag("world", "olegurpsMeleeAssistant"), originalMelee)) throw Error();
            if (approvalRollbackFailed) throw Error();
          } catch { throw Error(standaloneText("DeleteRollback")); }
          throw error;
        }
      });
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
  get selectedModes() {
    if(this.refreshing)return [...this.modeIds].map(id=>this.availableModes.find(m=>m.weapon_mode_id===id)).filter(Boolean);
    return this.availableModes.filter(m => this.modeIds.has(m.weapon_mode_id));
  }
  refreshCatalogData() {
    if(!this.existing||!this.catalogs?.getEquipment(this.modelId))return false;
    const sourceHash=this.catalogs.getCatalog('weapons')?.sources.find(s=>s.code===this.existing.source.source)?.sha256;
    if(!sourceHash||sourceHash!==this.existing.source.sourceHash)return false;
    const raw=this.catalogs.getCatalog('weapons').equipment.find(e=>e.equipment_id===this.modelId);
    if(!raw||[...this.modeIds].some(id=>!raw.modes.some(m=>m.weapon_mode_id===id)))return false;
    // Preserve older direct customizations too; a catalog correction never overwrites user values.
    for(const saved of this.existing.modes){
      const original=standaloneModeStats(raw.modes.find(m=>m.weapon_mode_id===saved.modeId));
      const current=standaloneModeStats(this.catalogs.getMode(saved.modeId));
      for(const [key,value]of Object.entries(standaloneModeStats(saved.snapshot)))if(value!==null &&
        String(value)!==String(original[key])&&String(value)!==String(current[key])&&!Object.hasOwn(this.overrides[saved.modeId],key))
        this.overrides[saved.modeId][key]=String(value);
    }
    this.modelChanged=true;this.refreshing=true;return true;
  }
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
    if ((!Object.hasOwn(fields, key) && !['installation','hostBulk'].includes(key)) || !this.availableModes.some(m => m.weapon_mode_id === modeId)) return;
    this.overrides[modeId] ??= {};
    const clean = text(value);
    if (clean) this.overrides[modeId][key] = clean;
    else delete this.overrides[modeId][key];
  }
}

export function standaloneAmmoCarrier(record, existing = null) {
  const carrier = { ...(existing ?? { id: record.resourceLinks.ammoWeaponId, totalAmmo: 0, capacity: 0,
    magazines: [], loadedIndex: -1, ammoUnconfigured: true, weaponBond: false }),
    name: record.name, standaloneWeaponId: record.id,
    standaloneModeId: record.modes.some(m => m.modeId === existing?.standaloneModeId)
      ? existing.standaloneModeId : record.modes[0]?.modeId, attackRef: {} };
  if (!existing && record.source.equipmentId !== LEMAT.equipmentId) {
    const mode=record.modes.find(m=>m.modeId===carrier.standaloneModeId);
    const shots=String(mode?.overrides?.shots??mode?.snapshot?.stats?.shots??'');
    const capacity=Number(/^(\d{1,3}(?:,\d{3})+|\d+)(?=$|[+(\s])/.exec(shots)?.[1]?.replaceAll(',',''));
    initializeEmptyCarrier(carrier,capacity);
  }
  return carrier;
}

function initializeEmptyCarrier(carrier,capacity) {
  if (!Number.isSafeInteger(capacity)||capacity<1||capacity>100000)return;
  const id=globalThis.crypto.randomUUID();
  carrier.ammunitionInventory={version:1,stocks:[],installedId:id,
    magazines:[{id,weaponId:carrier.id,capacity,rounds:0,ammoKey:null}]};
  projectAmmoInventory(carrier);
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
      initializeEmptyCarrier(carrier,barrel.capacity);
      result.push(carrier);
    }
    Object.assign(carrier, { standaloneModeId: mode.modeId, physicalResource: barrel });
  }
  return result;
}
