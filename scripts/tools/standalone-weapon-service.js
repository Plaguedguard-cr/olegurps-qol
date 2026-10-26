import { applyLTSourceMode } from '../lt-source-data.js';
import {HT_TEAR_SPRAY_MODE} from './biochemical-integration.js';
import {ltBowProfile,ltBowCapacity,normalizeLTBowConfiguration} from '../lt-bow-source.js';
import {ltPersonalProfile,supportsStandaloneMode,isLTProcedureMode} from '../lt-personal-source.js';
import {ltEarlyProfile,LT_TEN_EYED_MODES} from '../lt-early-firearms-source.js';
import {initializeLTEarlyCarrier} from './lt-early-firearms.js';
import {sonicShuriken} from '../ut-sonic-shuriken-source.js';
import {nextElevenProfile,displacerProfile,ladarProfile,ladarRange} from '../ut-next-eleven-source.js';
import {parseCampaignTL} from './tech-level.js';
import {fluidProfile} from '../ut-fluid-source.js';
import {physicalRangedProfile} from '../ut-physical-ranged-source.js';
import {utFixedFeed} from './ut-physical-feeds.js';
import {plasmaGunProfile} from '../ut-plasma-gun-source.js';
import { exoticBeamProfile } from '../ut-exotic-beam-source.js';
import { CATALOG_DEFINITIONS, CatalogService } from "../catalog-service.js";
import { validateInventory, migrateAmmoInventory, initializeInstalledMagazine, projectAmmoInventory } from "./ammo-inventory.js";
import { LEMAT, lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { actorResourceWrites as queues, withActorResourceWrite } from "./actor-resource-writes.js";
import { removeOwnedAmmunitionApprovals } from "./ammunition-approval-service.js";
import { moduleText } from "../localization.js";
import { AmmunitionCompatibilityService } from "../ammunition-compatibility-service.js";
import { utConventionalFeed, parseUTSourceFeed } from "./ut-conventional-ammunition.js";
import { UT_SPECIAL_MODES } from './ut-special-ammunition.js';
import { uawFeed } from './ut-uaw.js';
import { isPaintCarbine, newPaintBattery } from './ut-paint-power.js';
import { hasWeaponBondPerk } from './weapon-bond-service.js';
import { applyUTErrataMode } from '../ut-errata.js';
import { htPreGaussProfile } from '../ht-pre-gauss-profiles.js';
import { HT_PROJECT_WEAPON_POLICIES, correctedHTModeStatistics } from '../ht-source-corrections.js';
import { beamProfile } from '../ut-beam-source.js';
import { htLaserProfile } from '../ht-laser-source.js';
import { utDazzlerProfile } from '../ut-dazzler-source.js';
import { electrolaserProfile } from '../ut-electrolaser-source.js';
import { microwaveProfile } from '../ut-microwave-source.js';
import { ppbProfile } from '../ut-plasma-particle-source.js';
import { sonicNeuralProfile } from '../ut-sonic-neural-source.js';
import { newWeaponBattery, weaponPowerProfile } from './weapon-power.js';

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

const standaloneSearchIndexes = new WeakMap();
const normalizeSearch = value => text(value).normalize("NFKC").toLowerCase().replace(/\u00d7/g, "x");
export function searchStandaloneModels(catalogs, type, query = "", source = "") {
  const catalog = catalogs?.getCatalog("weapons");
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  // Only CatalogService's frozen data can be reused. Mutable injected catalogs
  // retain fresh reads; a replacement catalog has a different WeakMap key.
  const indexed = !!catalog && catalogs instanceof CatalogService && Object.isFrozen(catalog);
  let rows = indexed && standaloneSearchIndexes.get(catalog);
  if (!rows) {
    rows = (catalog?.equipment ?? []).map(e => ({ equipment: e,
      types: new Set(e.modes.filter(m => m.role === "attack" && !m.hidden).map(m => isLTProcedureMode(m)?'ranged':m.combat_type)),
      text: normalizeSearch([e.name, e.source, e.reference,...(e.aliases??[])].join(" ")) }));
    if (indexed) standaloneSearchIndexes.set(catalog, rows);
  }
  return rows.filter(row => (!source || row.equipment.source === source) && row.types.has(type) &&
    terms.every(term => row.text.includes(term))).map(row => row.equipment);
}

export function standaloneModeStats(mode) {
  const result=Object.fromEntries(Object.entries(fields).map(([key, stat]) => [key,
    key === "damage" ? mode?.raw_calc?.damage ?? null : mode?.stats?.[stat] ?? null]));
  return result;
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
  load(weaponId = null) {
    const data = this.actor?.getFlag?.(scope, STANDALONE_WEAPON_FLAG);
    // A fresh lookup needs only its own definition. Do not copy every other
    // weapon (and all its mode snapshots) for each card or attack lookup.
    const source = data && Array.isArray(data.weapons) ? data : { version: 1, weapons: [] };
    const result=clone(weaponId === null ? source : {...source, weapons:source.weapons.filter(w=>w.id===weaponId)});
    const catalogs=this.catalogs??globalThis.OleGURPSQOL?.catalogs;
    const errataHash=catalogs?.getCatalog('weapons')?.sources?.find(s=>s.code==='UT')?.sha256;
    for(const record of result.weapons){
      if(record.source?.source==='LT'&&record.source.equipmentId==='enxEQxvu3l4PJ3rWB'&&record.source.sourceHash===catalogs?.getSourceCatalog?.('weapons')?.sources?.find(s=>s.code==='LT')?.sha256)
        for(const id of LT_TEN_EYED_MODES)if(!record.modes.some(m=>m.modeId===id))record.modes.push({modeId:id,snapshot:clone(catalogs.getMode(id)),overrides:{}});
      if(record.source?.source==='LT' && record.source.sourceHash===catalogs?.getSourceCatalog?.('weapons')?.sources?.find(s=>s.code==='LT')?.sha256)
        for(const mode of record.modes??[]){
          applyLTSourceMode(mode.snapshot,{source:'LT',equipment_id:record.source.equipmentId});
          const current=catalogs?.getMode(mode.modeId);
          if((current?.lt_artillery_contract||current?.lt_flame_contract)&&record.source.equipmentId===(current.lt_artillery_contract??current.lt_flame_contract).equipmentId){
            const originalEquipment=catalogs.getSourceCatalog('weapons').equipment.find(e=>e.equipment_id===record.source.equipmentId),original=originalEquipment?.modes.find(m=>m.weapon_mode_id===mode.modeId);
            if(current.lt_flame_contract&&record.equipmentSnapshot.local_notes===originalEquipment?.local_notes)record.equipmentSnapshot.local_notes=current.lt_flame_contract.notes;
            // Old source values may be projected; a direct legacy owner value remains manual.
            for(const [key,value]of Object.entries(current.stats))if(JSON.stringify(mode.snapshot.stats[key])===JSON.stringify(original?.stats?.[key])||JSON.stringify(mode.snapshot.stats[key])===JSON.stringify(value))mode.snapshot.stats[key]=clone(value);
            if(JSON.stringify(mode.snapshot.raw_calc)===JSON.stringify(original?.raw_calc)||JSON.stringify(mode.snapshot.raw_calc)===JSON.stringify(current.raw_calc))mode.snapshot.raw_calc=clone(current.raw_calc);
            for(const key of ['lt_artillery_contract','lt_flame_contract','lt_ranged_contract','lt_ammo_item_ids','governing_skill','governing_skill_selection','defaults','combat_type'])
              if(Object.hasOwn(current,key))mode.snapshot[key]=clone(current[key]);
            continue;
          }
          if((current?.lt_personal_contract||current?.lt_early_contract||current?.lt_artillery_contract)&&record.source.equipmentId===(current.lt_personal_contract??current.lt_early_contract??current.lt_artillery_contract).equipmentId)
            for(const key of ['stats','raw_calc','lt_personal_contract','lt_early_contract','lt_artillery_contract','lt_ranged_contract','lt_ammo_item_ids','governing_skill','governing_skill_selection','defaults','combat_type']){
              if(Object.hasOwn(current,key))mode.snapshot[key]=clone(current[key]);else delete mode.snapshot[key];
            }
        }
      if(record.source?.source==='HT')for(const mode of record.modes??[])
        if(HT_PROJECT_WEAPON_POLICIES[mode.modeId]&&record.source.equipmentId===catalogs?.getEquipmentForMode(mode.modeId)?.equipment_id)
          mode.snapshot=correctedHTModeStatistics(mode.snapshot,{source:'HT',equipment_id:record.source.equipmentId});
      if(errataHash && record.source?.source==='UT' && record.source.sourceHash===errataHash)
        for(const mode of record.modes??[]){
          applyUTErrataMode(mode.snapshot,{snapshot:true});
          const current=catalogs?.getMode(mode.modeId);
          if(fluidProfile(mode.modeId)&&record.source.equipmentId===fluidProfile(mode.modeId).equipmentId)mode.snapshot=clone(current);
          if(exoticBeamProfile(mode.modeId)&&current?.ut_exotic_beam_source&&record.source.equipmentId===exoticBeamProfile(mode.modeId).equipmentId)
            for(const field of ['governing_skill','governing_skill_selection','defaults'])mode.snapshot[field]=clone(current[field]);
          if(sonicNeuralProfile(mode.modeId)&&current?.ut_sonic_neural_source&&record.source.equipmentId===sonicNeuralProfile(mode.modeId).equipmentId)
            for(const field of ['governing_skill','governing_skill_selection','defaults','attack_resolution'])mode.snapshot[field]=clone(current[field]);
          if(ppbProfile(mode.modeId)&&current?.ut_plasma_particle_source&&record.source.equipmentId===ppbProfile(mode.modeId).equipmentId){
            for(const field of ['governing_skill','governing_skill_selection','defaults'])mode.snapshot[field]=clone(current[field]);
            mode.snapshot.stats.shots=current.stats.shots;
          }
          if(beamProfile(mode.modeId)&&current?.beam_source&&record.source.equipmentId===beamProfile(mode.modeId).equipmentId)
            mode.snapshot.governing_skill=clone(current.governing_skill);
        }
      if(!record.modes?.some(m=>uawFeed(m.modeId)))continue;
      const equipment=catalogs?.getEquipment(record.source.equipmentId);
      const hash=catalogs?.getCatalog('weapons')?.sources.find(s=>s.code==='UT')?.sha256;
      if(equipment?.source!=='UT'||!hash||hash!==record.source.sourceHash)continue;
      // Read-through completion of an old single-mode definition. Its saved record,
      // existing carrier, overrides and historical shots are never rewritten here.
      for(const mode of equipment.modes.filter(m=>uawFeed(m.weapon_mode_id)))
        if(!record.modes.some(m=>m.modeId===mode.weapon_mode_id))record.modes.push({modeId:mode.weapon_mode_id,snapshot:clone(mode),overrides:{}});
    }
    return result;
  }
  list(type) { return this.load().weapons.filter(w => !type || w.type === type); }
  get(id) { return this.load(id).weapons.find(w => w.id === id) ?? null; }
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
      const modes = draft.equipment?.equipment_id==='enxEQxvu3l4PJ3rWB'?LT_TEN_EYED_MODES.map(id=>this.catalogs.getMode(id)):draft.selectedModes;
      if(modes.some(m=>sonicShuriken(m.weapon_mode_id))){
        const limit=parseCampaignTL(this.actor.getFlag('olegurps-qol','campaignTL'));
        if(limit!==null&&limit<10&&!old?.modes.some(m=>sonicShuriken(m.modeId)))throw Error('Sonic Shuriken требует TL10^; ТУ кампании ниже 10.');
        const carrier=this.actor.getFlag('world','gurpsAmmoManager')?.weapons?.find(w=>w.standaloneWeaponId===old?.id&&sonicShuriken(w));
        if(carrier?.sonicPayload&&draft.overrides[carrier.standaloneModeId]?.sonicChemical!=='enabled')throw Error('Сначала используйте снаряжённую начинку Sonic Shuriken.');
      }
      for(const mode of modes){
        const p=ladarProfile(mode.weapon_mode_id);if(!p)continue;
        const selected=ladarRange(p,draft.overrides[mode.weapon_mode_id]),previous=old?.modes?.find(m=>m.modeId===mode.weapon_mode_id),limit=parseCampaignTL(this.actor.getFlag('olegurps-qol','campaignTL'));
        if(selected&&limit!==null&&selected.tl>limit&&(!previous||ladarRange(p,previous.overrides)?.tl!==selected.tl))throw Error('TL выбранного сенсора превышает ТУ кампании.');
      }
      if (!equipment || !modes.length || !["ranged", "melee"].includes(draft.type) ||
          modes.some(m => !supportsStandaloneMode(m,draft.type) || m.role !== "attack" || m.hidden))
        throw new Error(standaloneText("SelectModes"));
      if(!old && equipment.source==='HT' && draft.type==='ranged') {
        const compatibility=new AmmunitionCompatibilityService(this.catalogs);
        for(const mode of modes)if(htLaserProfile(mode.weapon_mode_id)?.equipmentId!==equipment.equipment_id&&!(mode.ht_ammo_item_ids??[]).some(id=>
          compatibility.checkCompatibility(mode.weapon_mode_id,id,{book:'ht',kind:'ammo-item'}).status==='compatible'))
          throw Error('Не удалось подтвердить физический патрон для этого режима. Добавление оружия закрыто; существующие экземпляры сохраняются.');
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
          (draft.type === "ranged"||modes.some(m=>m.weapon_mode_id===HT_TEAR_SPRAY_MODE) ? { ammoWeaponId: id } : {})), readiness: "definition-only" };
      const manualBond=draft.type==='ranged'&&equipment.source==='LT';
      if((draft.weaponBondChanged||manualBond)&&typeof draft.weaponBond==='boolean'&&(hasWeaponBondPerk(this.actor)||manualBond)){
        record.settings.weaponBond=draft.weaponBond;record.settings.weaponBondPerkConfirmed=manualBond&&draft.weaponBond;
      }
      if(!manualBond)delete record.settings.weaponBondPerkConfirmed;
      if(modes.some(m=>ltBowProfile(m.weapon_mode_id)))record.settings.ltBow=normalizeLTBowConfiguration(draft.ltBow,modes.find(m=>ltBowProfile(m.weapon_mode_id)).weapon_mode_id);
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
      return removeOwnedAmmunitionApprovals({ actor:this.actor, actorId: this.actor.id,
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
  constructor({ catalogs, type, existing = null, actor = null, weaponBond = null }) {
    Object.assign(this, { catalogs, type, existing, actor });
    this.modelId = existing?.source.equipmentId ?? "";
    this.query = existing?.name ?? "";
    this.source = existing?.source.source ?? "";
    this.modeIds = new Set(existing?.modes.map(m => m.modeId) ?? []);
    this.overrides = Object.fromEntries(existing?.modes.map(m => [m.modeId, clone(m.overrides ?? {})]) ?? []);
    this.modelChanged = false;
    this.weaponBondAvailable=hasWeaponBondPerk(actor);
    this.weaponBond=existing?.settings?.weaponBond ?? weaponBond ?? actor?.getFlag?.('world','gurpsAmmoManager')?.weapons?.find(w=>w.standaloneWeaponId===existing?.id)?.weaponBond ?? false;
    this.weaponBondChanged=false;
    this.ltBow=clone(existing?.settings?.ltBow??{});
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
  get availableModes() { return (this.equipment?.modes ?? []).filter(m => supportsStandaloneMode(m,this.type) && m.role === "attack" && !m.hidden); }
  get selectedModes() {
    if(this.refreshing)return [...this.modeIds].map(id=>this.availableModes.find(m=>m.weapon_mode_id===id)).filter(Boolean);
    return this.availableModes.filter(m => this.modeIds.has(m.weapon_mode_id));
  }
  refreshCatalogData() {
    if(!this.existing||!this.catalogs?.getEquipment(this.modelId))return false;
    const sourceHash=this.catalogs.getCatalog('weapons')?.sources.find(s=>s.code===this.existing.source.source)?.sha256;
    if(!sourceHash||sourceHash!==this.existing.source.sourceHash)return false;
    const raw=(this.catalogs.getSourceCatalog?.('weapons')??this.catalogs.getCatalog('weapons')).equipment.find(e=>e.equipment_id===this.modelId)
      ??this.catalogs.getCatalog('weapons').equipment.find(e=>e.equipment_id===this.modelId);
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
    if (equipment && !equipment.modes.some(m => supportsStandaloneMode(m,this.type) && m.role === "attack" && !m.hidden)) return;
    this.modelId = equipment?.equipment_id ?? "";
    this.modelChanged = true;
    this.modeIds = new Set((equipment?.modes ?? []).filter(m => supportsStandaloneMode(m,this.type) && m.role === "attack" && !m.hidden).map(m => m.weapon_mode_id));
    this.overrides = {};
    this.ltBow={};
  }
  setOverride(modeId, key, value) {
    if ((!Object.hasOwn(fields, key) && !['installation','hostBulk','jetMode','sensorTL','sonicChemical','bulkState'].includes(key)) || !this.availableModes.some(m => m.weapon_mode_id === modeId)) return;
    if(key==='bulkState'&&(!this.availableModes.find(m=>m.weapon_mode_id===modeId)?.lt_ranged_contract?.bulkValues||!['','mounted','giant'].includes(value)))return;
    if(key==='sonicChemical'&&(!sonicShuriken(modeId)||!['','enabled'].includes(value)))return;
    if(key==='jetMode'&&(!htPreGaussProfile(modeId)?.continuousUnits||!['','short','continuous'].includes(value)))return;
    this.overrides[modeId] ??= {};
    const clean = text(value);
    if (clean) this.overrides[modeId][key] = clean;
    else delete this.overrides[modeId][key];
  }
}

export function standaloneAmmoCarrier(record, existing = null) {
  if(record.modes.some(m=>m.modeId===HT_TEAR_SPRAY_MODE)&&!record.resourceLinks.ammoWeaponId)record={...record,resourceLinks:{...record.resourceLinks,ammoWeaponId:record.id}};
  const carrier = { ...(existing ?? { id: record.resourceLinks.ammoWeaponId, totalAmmo: 0, capacity: 0,
    magazines: [], loadedIndex: -1, ammoUnconfigured: true, weaponBond: false }),
    name: record.name, standaloneWeaponId: record.id,
    standaloneModeId: record.modes.some(m => m.modeId === existing?.standaloneModeId)
      ? existing.standaloneModeId : record.modes[0]?.modeId, attackRef: {} };
  if(typeof record.settings?.weaponBond==='boolean')carrier.weaponBond=record.settings.weaponBond;
  if(record.source?.source==='LT'&&record.type==='ranged'&&typeof record.settings?.weaponBondPerkConfirmed==='boolean')carrier.weaponBondPerkConfirmed=record.settings.weaponBondPerkConfirmed;
  else delete carrier.weaponBondPerkConfirmed;
  if(ltEarlyProfile(carrier))return initializeLTEarlyCarrier(carrier,{newCarrier:!existing});
  if(ltPersonalProfile(carrier)){
    carrier.ammunitionFeed={kind:'fixed',source:ltPersonalProfile(carrier).source};
    if(!existing)initializeEmptyCarrier(carrier,1);
    return carrier;
  }
  if(ltBowProfile(carrier)){
    carrier.ltBow=clone(record.settings?.ltBow??{});
    carrier.ammunitionFeed={kind:'fixed',source:'LT74-78'};
    if(!existing)initializeEmptyCarrier(carrier,ltBowCapacity(carrier.standaloneModeId,carrier.ltBow));
    return carrier;
  }
  if(sonicShuriken(carrier)){
    carrier.sonicChemical=record.modes.find(m=>sonicShuriken(m.modeId))?.overrides?.sonicChemical??'';
    if(existing?.sonicPayload)carrier.sonicChemical='enabled';
    if(!existing){const power=weaponPowerProfile(carrier);carrier[power.stateKey]=newWeaponBattery(power);}
    return carrier;
  }
  if(nextElevenProfile(carrier.standaloneModeId)){
    if(nextElevenProfile(carrier.standaloneModeId).id==='shuriken'){
      if(!existing){initializeEmptyCarrier(carrier,1);carrier.ammunitionInventory.magazines[0].fixedIndex=0;}
      return carrier;
    }
    const power=weaponPowerProfile(carrier);
    if(!existing&&power)carrier[power.stateKey]=newWeaponBattery(power);
    return carrier;
  }
  if (!existing && isPaintCarbine(carrier)) carrier.paintBattery = newPaintBattery();
  if (!existing && (exoticBeamProfile(carrier.standaloneModeId)||sonicNeuralProfile(carrier.standaloneModeId)||htLaserProfile(carrier.standaloneModeId)||utDazzlerProfile(carrier.standaloneModeId)||electrolaserProfile(carrier.standaloneModeId)||microwaveProfile(carrier.standaloneModeId)||ppbProfile(carrier.standaloneModeId))){
    const power=weaponPowerProfile(carrier);carrier[power.stateKey]=newWeaponBattery(power);
  }
  const beam=exoticBeamProfile(carrier.standaloneModeId)??sonicNeuralProfile(carrier.standaloneModeId)??beamProfile(carrier.standaloneModeId)??htLaserProfile(carrier.standaloneModeId)??utDazzlerProfile(carrier.standaloneModeId)??electrolaserProfile(carrier.standaloneModeId)??microwaveProfile(carrier.standaloneModeId)??ppbProfile(carrier.standaloneModeId);
  if(beam){
    // A newly acquired crystal is a complete sealed device. Never replenish an existing instance.
    if(!existing&&beam.oneShot)carrier.beamCrystal=newWeaponBattery(weaponPowerProfile(carrier));
    return carrier;
  }
  if(carrier.standaloneModeId===HT_TEAR_SPRAY_MODE){if(!existing){initializeEmptyCarrier(carrier,20);carrier.ammunitionInventory.magazines[0].fixedIndex=0;}return carrier;}
  const sourceMode=record.modes.find(m=>m.modeId===carrier.standaloneModeId);
  const htProfile=record.source.source==='HT'&&htPreGaussProfile(carrier.standaloneModeId);
  if(htProfile){
    carrier.htJetMode=sourceMode?.overrides?.jetMode==='continuous'?'continuous':'short';
    if(htProfile.kind!=='net')carrier.physicalResource={detachable:false,source:htProfile.source,kind:htProfile.kind};
  }
  if (!existing && record.source.equipmentId !== LEMAT.equipmentId) {
    const mode=record.modes.find(m=>m.modeId===carrier.standaloneModeId);
    const shots=String(mode?.overrides?.shots??mode?.snapshot?.stats?.shots??'');
    const capacity=Number(/^(\d{1,3}(?:,\d{3})+|\d+)(?=$|[+(\s])/.exec(shots)?.[1]?.replaceAll(',',''));
    const feed=(physicalRangedProfile(mode?.modeId)?parseUTSourceFeed(shots,physicalRangedProfile(mode.modeId).source):null)??(plasmaGunProfile(mode?.modeId)?parseUTSourceFeed(shots,'UT128'):null)??utConventionalFeed(mode?.modeId,shots)??(UT_SPECIAL_MODES[mode?.modeId]?parseUTSourceFeed(shots,'Ultra-Tech 2007, pp. 139-140'):null);
    initializeEmptyCarrier(carrier,htProfile?.capacity ?? feed?.loadedCapacity ?? capacity);
    if(feed)carrier.ammunitionInventory.magazines[0].sourceFeed=feed;
    const compartments=utFixedFeed(carrier);
    if(compartments){
      carrier.ammunitionInventory.magazines=Array.from({length:compartments.count},(_,fixedIndex)=>({id:crypto.randomUUID(),weaponId:carrier.id,capacity:compartments.capacity,rounds:0,ammoKey:null,fixedIndex}));
      carrier.ammunitionInventory.installedId=carrier.ammunitionInventory.magazines[0].id;
      projectAmmoInventory(carrier);
    }
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
  if(record.modes.some(m=>uawFeed(m.modeId))){
    const result=existing.map(w=>({...w}));
    for(const mode of record.modes){
      const feed=uawFeed(mode.modeId);if(!feed)continue;
      let carrier=result.find(w=>w.standaloneModeId===mode.modeId);
      if(!carrier){
        carrier=standaloneAmmoCarrier(record);
        carrier.id=result.length?record.resourceLinks.ammoWeaponId+':'+mode.modeId:record.resourceLinks.ammoWeaponId;
        carrier.standaloneModeId=mode.modeId;
        initializeEmptyCarrier(carrier,feed.capacity);
        carrier.ammunitionInventory.magazines[0].sourceFeed=parseUTSourceFeed(feed.shots,'UT137');
        result.push(carrier);
      }
    }
    return result;
  }
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
    Object.assign(carrier, { standaloneModeId: mode.modeId, physicalResource: {
      ...barrel,...(mode.modeId===LEMAT.shotModeId?{detachable:false}:{})} });
  }
  return result;
}
