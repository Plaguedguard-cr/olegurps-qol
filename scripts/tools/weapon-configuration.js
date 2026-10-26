import { sourceWeaponHandling, sourceBulkChoiceHTML } from './weapon-bulk.js';
import {ltBowProfile,ltBowAmmoRule,normalizeLTBowConfiguration} from '../lt-bow-source.js';
import {ltBowEditorHTML,bindLTBowEditor} from './lt-bow-editor.js';
import {ltEarlyProfile} from '../lt-early-firearms-source.js';
import { exoticBeamProfile, exoticBeamConfiguration, exoticBeamHardwareHTML } from '../ut-exotic-beam-source.js';
import {ladarProfile,ladarRange} from '../ut-next-eleven-source.js';
import { LP_PROFILES, lpAdmission } from './ut-liquid-propellant.js';
import {beamProfile} from '../ut-beam-source.js';
import {laserModifications,laserModificationsHTML,validateLaserModifications,laserAvailableModes} from '../ut-laser-modifications.js';
import {ppbProfile,ppbOmniHTML} from '../ut-plasma-particle-source.js';
import {sonicNeuralProfile,sonicNeuralHardwareHTML,neuralDesign} from '../ut-sonic-neural-source.js';
import { gaussProfile } from '../ut-gauss-source.js';
import { listRangedGoverningSkills, resolveRangedGoverningSkill, bindingForGoverningSkill,
  getRangedGoverningAttackKey } from "./ranged-governing-skill-service.js";
import { setAttackOverride, clearAttackOverride } from "./weapon-attack-overrides.js";
import { hasWeaponBondPerk,weaponBondCheckbox } from "./weapon-bond-service.js";
import { weaponText } from "./weapon-localization.js";
import { StandaloneWeaponDraft, StandaloneWeaponService, standaloneAmmoCarriers, standaloneText } from "./standalone-weapon-service.js";
import { standaloneConfigurationHTML, bindStandaloneConfiguration, updateStandaloneResolvedDamage } from "./standalone-weapon-configuration.js";
import { readAttackAmmunition } from './ammo-service.js';
import { readCampaignTL, parseCampaignTL, saveCampaignTL, campaignAmmunitionAdmission } from './ammunition-tech-level.js';
import { etcAdmission, executionConfigurationHTML } from './ut-etc.js';
import { ETC_PROFILES } from './ut-etc.js';
import { AttackProfileResolver } from './attack-profile-resolver.js';
import { standaloneModeStats } from './standalone-weapon-service.js';
export { weaponText } from "./weapon-localization.js";

export const escapeWeaponHTML = value => String(value ?? "").replace(/[&<>"']/g,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const statFields = { damage: "damage", acc: "accuracy", rof: "rate_of_fire", rcl: "recoil",
  bulk: "bulk", range: "range", shots: "shots", st: "strength" };
const statLabels = { damage: "Damage", acc: "Acc", rof: "RoF", rcl: "Rcl", bulk: "Bulk",
  range: "Range", shots: "Shots", st: "ST" };
const normalized = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

export function compareWeaponStats(attack, mode) {
  return Object.entries(statFields).flatMap(([field, catalogField]) => {
    const gga = attack?.data?.[field] ?? attack?.[field];
    const base = catalogField === "damage" ? mode?.raw_calc?.damage ??
      (mode?.stats?.damage?.base ? mode.stats.damage.base + " " + (mode.stats.damage.type ?? "") : null)
      : mode?.stats?.[catalogField];
    if (gga == null || base == null || normalized(gga) === "" || normalized(base) === "") return [];
    return [{ field, label: statLabels[field], gga: String(gga), catalog: String(base),
      equal: normalized(gga) === normalized(base) }];
  }).sort((a, b) => Number(a.equal) - Number(b.equal));
}

export function weaponComparisonHTML(attack, mode) {
  const entries = compareWeaponStats(attack, mode);
  // All differences, followed by a short match summary. Text also distinguishes the colors.
  const visible = [...entries.filter(entry => !entry.equal), ...entries.filter(entry => entry.equal).slice(0, 3)];
  return visible.map(entry => `<span class="gam-catalog-${entry.equal ? "match" : "difference"}" ` +
    `title="${escapeWeaponHTML(weaponText(entry.equal ? "Match" : "Difference"))}">` +
    `${entry.equal ? "=" : "\u2260"} ${entry.label} ${escapeWeaponHTML(entry.gga)}` +
    `${entry.equal ? "" : ` (${escapeWeaponHTML(entry.catalog)})`}</span>`).join(" ");
}

export function catalogTargetLabel(catalogs, target) {
  const equipment = catalogs?.getEquipment(target?.equipmentId);
  const mode = catalogs?.getMode(target?.modeId);
  return equipment ? [equipment.name, equipment.source, mode?.usage].filter(Boolean).join(" \u2014 ") : "";
}

export function searchWeaponCatalog(catalogs, query = "") {
  const searchText = value => normalized(value).replace(/\u00d7/g, "x");
  const terms = searchText(query).split(" ").filter(Boolean);
  return (catalogs?.getCatalog("weapons")?.equipment ?? []).flatMap(equipment =>
    equipment.modes.filter(mode => mode.role === "attack" && !mode.hidden && mode.combat_type === "ranged")
      .map(mode => ({ equipmentId: equipment.equipment_id, modeId: mode.weapon_mode_id,
        caliber: mode.caliber_hint ?? equipment.caliber ?? "",
        label: [equipment.name, equipment.source, mode.usage].filter(Boolean).join(" \u2014 ") })))
    .filter(target => terms.every(term => searchText(target.label + " " + target.caliber + " " + target.equipmentId + " " + target.modeId).includes(term)));
}

export function weaponCatalogSearchState(catalogs, query, target, candidates = []) {
  const value = String(query ?? "").trim();
  const significantLength = (value.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const searching = significantLength >= 2;
  const results = searching ? searchWeaponCatalog(catalogs, value) : [];
  const shown = searching ? results.slice(0, 100) : candidates.slice(0, 8).map(candidate => ({
    ...candidate, label: catalogTargetLabel(catalogs, candidate) }));
  // A pinned current model is not an additional search match, and never changes the binding.
  const options = target && !shown.some(entry => entry.modeId === target.modeId) ?
    [{ ...target, label: catalogTargetLabel(catalogs, target) }, ...shown] : shown;
  const status = !value ? "" : !searching ? weaponText("SearchMinimum") : !results.length ? weaponText("SearchNone") :
    results.length > 100 ? weaponText("SearchLimited").replace("{shown}", "100").replace("{total}", String(results.length)) :
      weaponText("SearchCount").replace("{total}", String(results.length));
  return { options, status, total: results.length, shown: shown.length, searching };
}

export const ammunitionChoiceKey = entry => [entry.book, entry.kind, encodeURIComponent(entry.ammoId)].join(":");
const sameAmmoBinding = (entry, binding) => entry.ammoId === binding?.ammoId &&
  entry.kind === binding?.kind && entry.book === binding?.book;
const ammoMetadata = new Set(["id", "source_equipment_id", "source_ref_raw", "table_ref", "gcs_index",
  "weapon_mode_ids", "compatible_weapon_mode_ids", "source_family", "source_reference", "reference", "linked_weapon_mode_count"]);
const stableRecord = value => Array.isArray(value) ? value.map(stableRecord) : value && typeof value === "object" ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key, stableRecord(value[key])])) : value;

function equivalentAmmo(a, b) {
  if (a.book === b.book && a.kind === b.kind && a.ammoId === b.ammoId) return true;
  // Collapse a family only when its explicit, entire membership is this one confirmed cartridge.
  if (a.kind !== b.kind) {
    const family = a.kind === "ammo-family" ? a : b, item = a.kind === "ammo-item" ? a : b;
    return family.book === item.book && family.record.ammo_item_ids?.length === 1 &&
      family.record.ammo_item_ids[0] === item.ammoId && item.record.ammo_family_id === family.ammoId;
  }
  if (a.kind !== "ammo-item" || normalized(a.record.name) !== normalized(b.record.name)) return false;
  const semantic = entry => Object.fromEntries(Object.entries(entry.record).filter(([key]) => !ammoMetadata.has(key)));
  const left = semantic(a), right = semantic(b);
  // A shared name alone does not prove two cartridges equivalent. Keep unknown records distinct.
  return Object.keys(left).some(key => key !== "name") &&
    JSON.stringify(stableRecord(left)) === JSON.stringify(stableRecord(right));
}

export function baseAmmunition(ammunition, modeId, catalogs, preferred = null, options = {}) {
  if (!modeId || !ammunition) return [];
  const links = catalogs?.getModeLinks(modeId);
  const entries = [...(ammunition.getCompatibleAmmunition(modeId,options)?.ammunition ?? [])]
    .filter(entry => entry.status === "compatible" && ["ammo-item", "ammo-family"].includes(entry.kind))
    .sort((a, b) => {
      const rank = entry => entry.kind === "ammo-item" && links?.ammoItemIds?.includes(entry.ammoId) ? 0 :
        entry.kind === "ammo-family" && links?.ammoFamilyIds?.[0] === entry.ammoId ? 1 : 2;
      return rank(a) - rank(b) || String(a.record.name).localeCompare(String(b.record.name));
    });
  const groups = [];
  for (const entry of entries) {
    const group = groups.find(group => group.some(member => equivalentAmmo(member, entry)));
    if (group) group.push(entry);
    else groups.push([entry]);
  }
  const choices = groups.map(group => group.find(entry => sameAmmoBinding(entry, preferred)) ?? group[0]);
  return choices.map(entry => {
    const collisions = choices.filter(other => normalized(other.record.name) === normalized(entry.record.name));
    let qualifier = "";
    if (collisions.length > 1) {
      const detailFields = ["ammo_type", "ammunition_class", "ammunition_construction", "caliber_mm", "status", "weight_per_shot_lb", "cost_per_shot_usd", "ammo_family_id"];
      const field = detailFields.find(key => new Set(collisions.map(other => JSON.stringify(other.record[key]))).size > 1);
      const detail = field ? entry.record[field] : null;
      qualifier = [entry.book?.toUpperCase(), weaponText(entry.kind === "ammo-item" ? "Cartridge" : "AmmoFamily"),
        detail == null ? null : field === "ammo_family_id" ? catalogs?.getAmmoFamily(entry.book, detail)?.name ?? detail :
          field === "weight_per_shot_lb" ? `${detail} lb` : field === "cost_per_shot_usd" ? `$${detail}` : String(detail)].filter(Boolean).join(" \u00b7 ");
      const sameQualifier = collisions.filter(other => other.book === entry.book && other.kind === entry.kind &&
        JSON.stringify(other.record[field]) === JSON.stringify(detail));
      if (sameQualifier.length > 1 || !field) qualifier += " \u00b7 " + entry.ammoId;
    }
    return { ...entry, choiceKey: ammunitionChoiceKey(entry),
      label: entry.record.name + " \u2014 " + weaponText("Base") + (qualifier ? " \u00b7 " + qualifier : "") };
  });
}

export function suggestWeaponSkill(actor, attack, mode) {
  const skills = listRangedGoverningSkills(actor);
  const catalogSkill = mode?.governing_skill?.status === "resolved" ? mode.governing_skill.skill : null;
  const explicit = String(attack?.data?.skill ?? attack?.data?.checkotf ?? "");
  const withoutTL = value => normalized(value).replace(/\s*\/\s*tl\s*\d+/g, "");
  const direct = skills.filter(skill => explicit && withoutTL(explicit).includes(withoutTL(skill.name)));
  const matching = direct.length ? direct : catalogSkill ? skills.filter(skill =>
    skill.family === normalized(catalogSkill.name) && (!catalogSkill.specialization ||
      withoutTL(skill.name).endsWith("(" + normalized(catalogSkill.specialization) + ")"))) : [];
  // TL never ranks or penalizes skills; the level comes exclusively from GGA.
  return (matching.length ? matching : skills.length === 1 ? skills : []).sort((a, b) => b.level - a.level)[0] ?? null;
}

/** A per-window draft. Reading, changing modes, searching and canceling never write Actor flags. */
export class WeaponConfigurationDraft {
  constructor({ actor, state, attacks, existing = null, catalogs, bindings, ammunition }) {
    Object.assign(this, { actor, state, attacks, existing, catalogs, bindings, ammunition });
    this.campaignTL = readCampaignTL(actor);
    this.originalCampaignTL = this.campaignTL;
    const executionOwner=existing?.standaloneModeId==='WRvS5pz3LMCzqQyiZ'?
      state.weapons?.find(w=>w.standaloneWeaponId===existing.standaloneWeaponId&&w.standaloneModeId==='WtM51JNSpOUIy3Eo1'):existing;
    this.executionVariant=executionOwner?.executionVariant??'ordinary';
    this.lpFireMode=executionOwner?.lpFireMode??'standard';
    this.ltBulkState=existing?.ltBulkState==='giant'?'giant':'mounted';
    this.gaussSpeed=executionOwner?.gaussSpeed??'standard';
    this.gaussSpeedChanged=false;
    this.executionChanged=false;
    this.laserDrafts=new Map();
    this.exoticBeamDrafts=new Map();
    this.sonicNeuralDrafts=new Map();
    this.omniBlaster=existing?.omniBlaster===true;this.omniChanged=false;
    this.standaloneService = new StandaloneWeaponService(actor, catalogs);
    this.standalone = Boolean(existing?.standaloneWeaponId);
    this.standaloneDraft = new StandaloneWeaponDraft({ catalogs, type: "ranged", actor,
      weaponBond:existing?.weaponBond,
      existing: this.standaloneService.get(existing?.standaloneWeaponId) });
    this.standaloneDraft.statPreview=modeId=>this.previewStats(modeId);
    this.ltBow=structuredClone(existing?.ltBow??{});
    this.modes = new Map();
    this.analysis = new Map((bindings?.analyzeActor(actor)?.modes ?? []).map(entry => [entry.attack.path, entry]));
    const reference = existing?.attackRef;
    const sameMode = attack => (!reference?.name || attack.name === reference.name) &&
      (!Object.hasOwn(reference ?? {}, "mode") || attack.mode === String(reference.mode ?? ""));
    this.path = existing ? attacks.find(attack => attack.uuid && attack.uuid === existing.attackRef?.uuid && sameMode(attack))?.path ??
      attacks.find(attack => attack.path === existing.attackRef?.path && sameMode(attack))?.path : null;
    // A missing old reference requires an explicit selection; never silently assign its settings to attacks[0].
    this.path ??= existing ? "" : attacks[0]?.path ?? "";
  }

  selectAttack(path) { this.path = this.attacks.some(attack => attack.path === path) ? path : ""; return this.current; }
  get executionModeId() {
    if(this.standalone&&this.standaloneDraft.selectedModes.some(m=>m.weapon_mode_id==='WtM51JNSpOUIy3Eo1'))return 'WtM51JNSpOUIy3Eo1';
    return this.standalone ? this.standaloneDraft.selectedModes.find(m=>m.weapon_mode_id===this.existing?.standaloneModeId)?.weapon_mode_id ??
      this.standaloneDraft.selectedModes[0]?.weapon_mode_id : this.current?.target?.modeId;
  }
  requestExecution(weapon) {
    if(!this.standalone&&ltEarlyProfile(this.executionModeId))weapon.catalogModeId=this.executionModeId;
    if(!this.standalone&&ltBowProfile(this.executionModeId)){
      weapon.catalogModeId=this.executionModeId;weapon.ltBow=normalizeLTBowConfiguration(this.ltBow,this.executionModeId);
    }
    if(!this.standalone&&this.catalogs?.getMode(this.executionModeId)?.lt_ranged_contract?.bulkValues)weapon.ltBulkState=this.ltBulkState;
    const exotic=this.exoticBeamDrafts.get(this.executionModeId);
    if(exotic?.changed)weapon.exoticBeamHardwareRequest={psionicSettings:exotic.value.psionicSettings};
    const sn=this.sonicNeuralDrafts.get(this.executionModeId);
    if(sn?.changed)weapon.sonicNeuralHardwareRequest=sonicNeuralProfile(this.executionModeId)?.family==='neural'?{neuralSettings:sn.value.neuralSettings}:{sonicUnderwater:sn.value.sonicUnderwater};
    if(this.omniChanged&&ppbProfile(this.executionModeId)?.family==='blaster')weapon.omniBlasterRequest=this.omniBlaster;
    const laser=this.laserDrafts.get(this.executionModeId);
    if(laser?.changed){
      if(!weapon.standaloneModeId)weapon.catalogModeId=this.executionModeId;
      weapon.laserModificationRequest=validateLaserModifications(this.executionModeId,laser.value);
    }
    if(this.gaussSpeedChanged)weapon.gaussSpeedRequest=this.gaussSpeed;
    if(this.executionChanged)weapon.executionRequest={variant:this.executionVariant,modeId:this.executionModeId};
  }
  previewStats(modeId=this.executionModeId) {
    const mode=this.standaloneDraft.availableModes.find(m=>m.weapon_mode_id===modeId)??this.catalogs?.getMode(modeId);
    const raw=this.standalone ? {...standaloneModeStats(mode),...this.standaloneDraft.overrides[modeId]} :
      {...this.attack?.data,...(this.current?.override?.action==='save'?this.current.override.value:{})};
    const handling=sourceWeaponHandling(mode,this.standalone?this.standaloneDraft.overrides[modeId]?.bulkState:this.ltBulkState,
      this.standalone?this.standaloneDraft.overrides[modeId]?.bulk??null:this.current?.override?.value?.bulkMetadata?.sourceValues?null:this.current?.override?.value?.bulk??null);
    if(handling?.rclNotApplicable)raw.rcl=null;
    if(handling?.bulkMetadata)raw.bulk=handling.bulkMetadata.numericBulk;
    if(ltBowProfile(modeId)){
      const cfg=this.standalone?this.standaloneDraft.ltBow:this.ltBow;
      const saved=this.state.weapons?.find(w=>w.id===this.existing?.id),carrier={...saved,id:'configuration-preview',catalogModeId:modeId,ltBow:cfg};
      let ammunition=null;try{ammunition=readAttackAmmunition(saved);}catch{}
      if(!ammunition?.type){
        const ammoId=cfg.shotMode==='navak'?'lt_arrow_guide_dart':mode.lt_ammo_item_ids?.find(id=>ltBowAmmoRule(id)==='regular');
        ammunition={kind:'preview',type:{source:'catalog',book:'lt',kind:'ammo-item',ammoId}};
      }
      const profile=new AttackProfileResolver({catalogs:this.catalogs,compatibility:this.ammunition??globalThis.OleGURPSQOL?.ammunitionCompatibility}).resolve({
        actor:this.actor,actorId:this.actor.id,weaponId:carrier.id,state:{weapons:[carrier]},attack:{data:raw,ltBowOverrides:this.standalone?this.standaloneDraft.overrides[modeId]:null},
        ammunition,binding:{status:'confirmed',binding:{confirmed:true,modeId}}});
      return {stats:{...raw,...(profile.damage.nativeSafe?profile.damage.effectiveChanges:{damage:'—',range:'—'})},derivedFields:['damage','range'],resolvedDamage:profile.damage.nativeSafe?profile.damage.formula:null};
    }
    if(ladarProfile(modeId)){
      const range=ladarRange(ladarProfile(modeId),this.standaloneDraft.overrides[modeId]);
      return {stats:{...raw,range:range?`${range.half}/${range.maximum}`:'',damage:'HT-10 aff'},derivedFields:['range','damage'],resolvedDamage:'HT-10 aff'};
    }
    if(beamProfile(modeId)){
      const saved=this.state.weapons?.find(w=>w.id===this.existing?.id),value=this.laserDraft(modeId).value;
      const carrier={...saved,id:'configuration-preview',catalogModeId:modeId,laserModifications:value};
      if(!laserAvailableModes(carrier).includes(carrier.laserMode))carrier.laserMode=laserAvailableModes(carrier)[0];
      const p=new AttackProfileResolver({catalogs:this.catalogs}).resolve({actorId:this.actor.id,weaponId:carrier.id,attack:{data:raw},rawAttack:raw,
        state:{weapons:[carrier]},binding:{status:'confirmed',binding:{confirmed:true,modeId}}});
      const derived=value.construction!=='standard'||value.dazzle||value.blinding||value.beamPulse;
      return {stats:derived?{...raw,...p.damage.effectiveChanges}:raw,derivedFields:derived?['damage','range','rof',...(p.damage.effectiveChanges?.shots!==undefined?['shots']:[])]:[],resolvedDamage:p.damage.nativeSafe?p.effective.damage:null};
    }
    const sharedETC=this.executionVariant==='etc'&&this.executionModeId==='WtM51JNSpOUIy3Eo1'&&modeId==='WRvS5pz3LMCzqQyiZ';
    if(gaussProfile(modeId)) {
      const carrier={id:'configuration-preview',catalogModeId:modeId,gaussSpeed:this.gaussSpeed};
      const saved=this.state.weapons?.find(w=>w.id===this.existing?.id&&w.standaloneModeId===modeId);
      let ammunition=null;try{ammunition=readAttackAmmunition(saved);}catch{}
      ammunition??={kind:'preview',type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:gaussProfile(modeId).familyId}};
      const profile=new AttackProfileResolver({catalogs:this.catalogs,compatibility:this.ammunition??globalThis.OleGURPSQOL?.ammunitionCompatibility}).resolve({
        actorId:this.actor.id,weaponId:carrier.id,attack:{data:raw},rawAttack:raw,state:{weapons:[carrier]},ammunition,
        binding:{status:'confirmed',binding:{confirmed:true,modeId}}});
      return {stats:{...raw,damage:profile.effective.damage,range:profile.effective.range},derivedFields:['damage','range'],resolvedDamage:profile.damage.formula};
    }
    if(!['etc','lp'].includes(this.executionVariant)||modeId!==this.executionModeId&&!sharedETC){
      const carrier=this.state.weapons?.find(w=>w.id===this.existing?.id&&w.standaloneModeId===modeId);
      let ammunition=null;try{ammunition=readAttackAmmunition(carrier);}catch{/* Keep editable source fields on inventory review. */}
      const family=mode?.ammunition_profile?.primary_ammo_family_id;
      if(!ammunition?.type&&family)ammunition={kind:'preview',type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:family}};
      const profile=mode?new AttackProfileResolver({catalogs:this.catalogs,compatibility:this.ammunition??globalThis.OleGURPSQOL?.ammunitionCompatibility}).resolve({
        actor:this.actor,actorId:this.actor.id,weaponId:carrier?.id,state:{weapons:carrier?[carrier]:[]},attack:{data:raw,level:this.attack?.level,ltPersonalOverrides:this.standalone?this.standaloneDraft.overrides[modeId]:null},rawAttack:raw,ammunition,
        binding:{status:'confirmed',binding:{confirmed:true,modeId}}}):null;
      return {stats:raw,derivedFields:[],resolvedDamage:profile?.damage.nativeSafe?profile.damage.formula:null};
    }
    const profile=new AttackProfileResolver({catalogs:this.catalogs,compatibility:this.ammunition??globalThis.OleGURPSQOL?.ammunitionCompatibility}).resolve({
      actorId:this.actor.id,weaponId:'configuration-preview',attack:{data:raw},rawAttack:raw,
      state:{weapons:[{id:'configuration-preview',catalogModeId:modeId,executionVariant:this.executionVariant,lpFireMode:this.lpFireMode}]},
      binding:{status:'confirmed',binding:{confirmed:true,modeId}},
      ammunition:{kind:'preview',type:{source:'catalog',book:'ut',kind:'ammo-family',ammoId:(this.executionVariant==='lp'?LP_PROFILES:ETC_PROFILES)[modeId]?.familyId}}});
    return {stats:profile.damage.nativeSafe ? {...raw,damage:profile.effective.damage,range:profile.effective.range,...(this.executionVariant==='lp'?{shots:profile.effective.shots}:{})} :
      {...raw,damage:'—',range:'—'},derivedFields:this.executionVariant==='lp'?['damage','range','shots']:['damage','range']};
  }
  get attack() { return this.attacks.find(attack => attack.path === this.path) ?? null; }
  laserDraft(id=this.executionModeId){
    if(!this.laserDrafts.has(id))this.laserDrafts.set(id,{value:structuredClone(laserModifications(this.existing&&(this.existing.standaloneModeId??this.existing.catalogModeId)===id?this.existing:null)),changed:false});
    return this.laserDrafts.get(id);
  }
  exoticBeamDraft(id=this.executionModeId){
    if(!this.exoticBeamDrafts.has(id))this.exoticBeamDrafts.set(id,{value:structuredClone(this.existing&&(this.existing.standaloneModeId??this.existing.catalogModeId)===id?this.existing:{}),changed:false});
    return this.exoticBeamDrafts.get(id);
  }
  sonicNeuralDraft(id=this.executionModeId){
    if(!this.sonicNeuralDrafts.has(id))this.sonicNeuralDrafts.set(id,{value:structuredClone(this.existing&&(this.existing.standaloneModeId??this.existing.catalogModeId)===id?this.existing:{}),changed:false});
    return this.sonicNeuralDrafts.get(id);
  }
  get current() {
    if (!this.attack) return null;
    if (!this.modes.has(this.path)) {
      const analysis = this.analysis.get(this.path);
      const selected = analysis?.binding ?? (analysis?.status === "suggested" ? analysis.automatic.suggestion : null);
      const binding = this.state.governingSkills?.[getRangedGoverningAttackKey(this.attack)] ?? this.attack.governingSkillBinding;
      const legacy = this.existing?.attackRef?.path === this.path ? this.existing.governingSpecialty : null;
      const candidateModes = (analysis?.automatic?.candidates ?? []).map(target => this.catalogs?.getMode(target.modeId));
      const sameSkill = candidateModes.length && candidateModes.every(mode => mode?.governing_skill?.status === "resolved" &&
        JSON.stringify(mode.governing_skill.skill) === JSON.stringify(candidateModes[0]?.governing_skill?.skill));
      const skillMode = this.catalogs?.getMode(selected?.modeId) ?? (sameSkill ? candidateModes[0] : null);
      const skill = resolveRangedGoverningSkill({ actor: this.actor, binding, legacySpecialty: legacy }) ??
        (!binding && !legacy ? suggestWeaponSkill(this.actor, this.attack, skillMode) : null);
      const draft = { analysis, target: selected, catalogChanged: false, skillBinding: binding ?? bindingForGoverningSkill(skill),
        skillChanged: false, override: null, weaponBond: this.existing?.weaponBond === true,
        ammo: this.existing?.ammunitionBinding ?? null, ammoType: this.existing?.ammoType ?? "", ammoChanged: false };
      this.modes.set(this.path, draft);
      this.suggestAmmo(draft);
    }
    return this.modes.get(this.path);
  }

  suggestAmmo(draft = this.current) {
    if (!draft || draft.ammo || draft.ammoType || draft.ammoChanged ||
        this.existing && Object.hasOwn(this.existing, "ammunitionBinding")) return;
    const first = baseAmmunition(this.ammunition, draft.target?.modeId, this.catalogs).find(entry =>
      campaignAmmunitionAdmission({...entry, source:'catalog'}, this.catalogs, this.campaignTL).allowed);
    if (first) draft.ammo = this.ammoBinding(first, draft.target.modeId);
  }
  ammoBinding(entry, modeId) {
    return { ammoId: entry.ammoId, kind: entry.kind, book: entry.book, name: entry.record.name, modeId, confirmed: false };
  }
  selectCatalog(target, { preserveSkill = false } = {}) {
    const draft = this.current;
    if (!draft) return;
    draft.target = target;
    draft.catalogChanged = true;
    if (!draft.ammoChanged && !this.existing?.ammoType && !this.existing?.ammunitionBinding) draft.ammo = null;
    this.suggestAmmo(draft);
    if (!preserveSkill && !draft.skillChanged && !this.state.governingSkills?.[getRangedGoverningAttackKey(this.attack)] &&
        !this.attack.governingSkillBinding && !this.existing?.governingSpecialty)
      draft.skillBinding = bindingForGoverningSkill(suggestWeaponSkill(this.actor, this.attack, this.catalogs?.getMode(target?.modeId)));
  }
  selectAmmo(ammoId) {
    const draft = this.current;
    const entry = baseAmmunition(this.ammunition, draft?.target?.modeId, this.catalogs, draft?.ammo)
      .find(row => (row.choiceKey === ammoId || row.ammoId === ammoId) &&
        campaignAmmunitionAdmission({...row, source:'catalog'}, this.catalogs, this.campaignTL, draft?.target?.modeId).allowed);
    if (!draft) return;
    draft.ammoChanged = true;
    draft.ammo = entry ? this.ammoBinding(entry, draft.target.modeId) : ammoId === "stored" ? this.existing?.ammunitionBinding ?? null : null;
    draft.ammoType = entry ? entry.record.name : ammoId === "stored" ? this.existing?.ammoType ?? "" : "";
  }
  selectSkill(key) {
    const draft = this.current;
    if (!draft || key === "stored") return;
    draft.skillChanged = true;
    draft.skillBinding = bindingForGoverningSkill(listRangedGoverningSkills(this.actor).find(skill => skill.key === key));
  }

  async commit({ id }) {
    if(this.actor.isOwner===false)throw Error(standaloneText('Owner'));
    if(ltBowProfile(this.executionModeId))normalizeLTBowConfiguration(this.standalone?this.standaloneDraft.ltBow:this.ltBow,this.executionModeId);
    if(exoticBeamProfile(this.executionModeId)?.family==='psionic')exoticBeamConfiguration({...this.exoticBeamDraft().value,catalogModeId:this.executionModeId,psionicMode:this.exoticBeamDraft().value.psionicSettings?.[0]??'eraser'});
    if(sonicNeuralProfile(this.executionModeId)?.family==='neural'){
      const design=neuralDesign(this.sonicNeuralDraft().value);
      const newlyInstalled=design.settings.some(s=>!this.existing?.neuralSettings?.includes(s));
      if(!design.settings.length||newlyInstalled&&this.campaignTL!==null&&this.campaignTL!==undefined&&design.tl>this.campaignTL)throw Error('Выберите настройки Neural, доступные при ТУ кампании.');
    }
    // Reject invalid current/legacy laser hardware before writing a definition or Actor setting.
    if(beamProfile(this.executionModeId))validateLaserModifications(this.executionModeId,this.laserDraft().value);
    if(this.executionChanged&&['etc','lp'].includes(this.executionVariant)) {
      const admission=(this.executionVariant==='lp'?lpAdmission:etcAdmission)(this.executionModeId,this.catalogs,this.campaignTL);
      if(!admission.allowed)throw Error(admission.reason);
    }
    if (this.campaignTL !== this.originalCampaignTL) await saveCampaignTL(this.actor, this.campaignTL);
    if (this.standalone) {
      const record = await this.standaloneService.save(this.standaloneDraft);
      const next = structuredClone(this.state);
      const carriers = standaloneAmmoCarriers(record, next.weapons.filter(w => w.standaloneWeaponId === record.id));
      for (const carrier of carriers) {
        const old = next.weapons.find(w => w.id === carrier.id);
        if (old) next.weapons[next.weapons.indexOf(old)] = carrier; else next.weapons.push(carrier);
      }
      const weapon = carriers.find(w=>w.standaloneModeId===this.executionModeId)??carriers[0];
      this.requestExecution(weapon);
      return { state: next, weapon };
    }
    const attack = this.attack, draft = this.current;
    if (!attack || !draft) throw new Error(weaponText("SelectAttack"));
    // Only an unambiguous proposal or an explicit choice is confirmation. Review candidates stay unbound.
    if (draft.target && (draft.catalogChanged || draft.analysis?.status === "suggested"))
      await this.bindings.confirm(this.actor, attack.path, draft.target);
    else if (draft.catalogChanged && !draft.target && draft.analysis?.binding?.bindingId)
      await this.bindings.removeConfirmation(this.actor, draft.analysis.binding.bindingId);
    const next = structuredClone(this.state);
    let weapon = this.existing ? next.weapons.find(row => row.id === this.existing.id) : null;
    if (!weapon) {
      weapon = { id, totalAmmo: 0, capacity: 0, magazines: [], loadedIndex: -1, ammoUnconfigured: true };
      next.weapons.push(weapon);
    }
    Object.assign(weapon, { name: attack.label, attackRef: { path: attack.path, uuid: attack.uuid, name: attack.name, mode: attack.mode },
      weaponBond: hasWeaponBondPerk(this.actor)||this.catalogs?.getEquipmentForMode(draft.target?.modeId)?.source==='LT' ? draft.weaponBond : this.existing?.weaponBond === true,
      ammoType: !draft.ammoChanged && this.existing ? this.existing.ammoType : draft.ammo?.name ?? draft.ammoType ?? "" });
    if (draft.ammo) weapon.ammunitionBinding = { ...draft.ammo, confirmed: true };
    weapon.weaponBondPerkConfirmed=this.catalogs?.getEquipmentForMode(draft.target?.modeId)?.source==='LT'&&weapon.weaponBond===true;
    this.requestExecution(weapon);
    if (!this.existing && isPaintCarbine(weapon, draft.target?.modeId)) {
      weapon.catalogModeId = draft.target.modeId;
      weapon.paintBattery = newPaintBattery();
    }
    else if (draft.ammoChanged) weapon.ammunitionBinding = null;
    next.governingSkills ??= {};
    const key = getRangedGoverningAttackKey(attack);
    if (draft.skillBinding) next.governingSkills[key] = structuredClone(draft.skillBinding);
    else if (draft.skillChanged) delete next.governingSkills[key];
    const skill = resolveRangedGoverningSkill({ actor: this.actor, binding: draft.skillBinding });
    if (skill?.specialty) weapon.governingSpecialty = skill.specialty;
    else if (draft.skillChanged) delete weapon.governingSpecialty;
    // Editor changes for visited modes are held until the enclosing form is saved.
    for (const [path, mode] of this.modes) {
      const edited = this.attacks.find(entry => entry.path === path);
      const editedKey = getRangedGoverningAttackKey(edited);
      if (mode.skillChanged) {
        if (mode.skillBinding) next.governingSkills[editedKey] = structuredClone(mode.skillBinding);
        else delete next.governingSkills[editedKey];
      }
      if (mode.override?.action === "reset") clearAttackOverride(next, edited);
      else if (mode.override?.action === "save") setAttackOverride(next, edited, mode.override.value);
    }
    return { state: next, weapon };
  }
}

export function skillOptionsHTML(actor, binding) {
  const skills = listRangedGoverningSkills(actor);
  const current = resolveRangedGoverningSkill({ actor, binding });
  return `<option value="">${escapeWeaponHTML(weaponText("SelectSkill"))}</option>` +
    (binding && !current ? `<option value="stored" selected>${escapeWeaponHTML(binding.name || binding.key)} (${escapeWeaponHTML(weaponText("Review"))})</option>` : "") +
    skills.map(skill => `<option value="${escapeWeaponHTML(skill.key)}" title="${escapeWeaponHTML(skill.name)}"` +
      `${current?.key === skill.key ? " selected" : ""}>${escapeWeaponHTML(skill.name)} \u2014 ${skill.level}</option>`).join("");
}

export function weaponConfigurationHTML(model) {
  const draft = model.current;
  const attackOptions = model.attacks.map(attack => {
    const details = [attack.level > 0 ? `${weaponText("Level")} ${attack.level}` : "",
      ...["rof", "shots", "rcl"].filter(field => attack[field]).map(field => `${statLabels[field]} ${attack[field]}`)].filter(Boolean).join(", ");
    const label = attack.label + (details ? " \u2014 " + details : "");
    return `<option value="${escapeWeaponHTML(attack.path)}" title="${escapeWeaponHTML(label)}"` +
      `${attack.path === model.path ? " selected" : ""}>${escapeWeaponHTML(label)}</option>`;
  }).join("");
  return `<div class="standard-form gam-config gam-weapon-config">
    <label>${escapeWeaponHTML(weaponText('CampaignTL'))}<input name="campaignTL" type="number" min="0" step="1" placeholder="${escapeWeaponHTML(weaponText('CampaignTLUnset'))}" value="${model.campaignTL ?? ''}"></label>
    <label class="gam-config-checkbox"><input type="checkbox" name="standaloneWeapon" ${model.standalone ? "checked" : ""} ${model.existing ? "disabled" : ""}><span>${escapeWeaponHTML(standaloneText("Absent"))}</span></label>
    <div data-gga-configuration ${model.standalone ? "hidden" : ""}>
    <label>${escapeWeaponHTML(weaponText("Attack"))}<select name="attackPath">` +
    `${model.path ? "" : `<option value="">${escapeWeaponHTML(weaponText("SelectAttack"))}</option>`}${attackOptions}</select></label>
    <div data-weapon-mode-fields>${weaponModeFieldsHTML(model, draft)}</div></div>
    <div data-standalone-configuration ${model.standalone ? "" : "hidden"}>${standaloneConfigurationHTML(model.standaloneDraft)}</div>
    <div data-native-lt-bow ${model.standalone?'hidden':''}>${ltBowEditorHTML(model.ltBow,model.executionModeId,model.actor,escapeWeaponHTML)}</div>
    <div data-weapon-execution>${executionConfigurationHTML(model.executionModeId,model.executionVariant,model.catalogs,model.campaignTL,escapeWeaponHTML,model.gaussSpeed)}</div>
    <div data-weapon-laser>${laserModificationsHTML(model.executionModeId,model.laserDraft().value,escapeWeaponHTML)}${ppbOmniHTML(model.executionModeId,model.omniBlaster)}${sonicNeuralHardwareHTML(model.executionModeId,model.sonicNeuralDraft().value,escapeWeaponHTML)}${exoticBeamHardwareHTML(model.executionModeId,model.exoticBeamDraft().value,escapeWeaponHTML)}</div></div>`;
}

export function weaponModeFieldsHTML(model, draft = model.current) {
  if (!draft) return `<p class="hint">${escapeWeaponHTML(weaponText("SelectAttack"))}</p>`;
  const analysis = draft.analysis;
  const targets = [...(analysis?.automatic?.candidates ?? [])];
  if (draft.target && !targets.some(target => target.modeId === draft.target.modeId)) targets.unshift(draft.target);
  const status = draft.catalogChanged ? "Manual" : analysis?.status === "confirmed" ? "Confirmed" :
    analysis?.status === "suggested" ? "Suggested" : !analysis || analysis?.automatic?.status === "unavailable" ? "Unavailable" :
      analysis?.status === "needs_review" || analysis?.status === "candidates" ? "Review" : "Unmatched";
  const options = targets.map(target => {
    const label = catalogTargetLabel(model.catalogs, target);
    return `<option value="${escapeWeaponHTML(target.modeId)}" title="${escapeWeaponHTML(label)}"` +
      `${draft.target?.modeId === target.modeId ? " selected" : ""}>${escapeWeaponHTML(label)}</option>`;
  }).join("");
  const ammo = baseAmmunition(model.ammunition, draft.target?.modeId, model.catalogs, draft.ammo).filter(entry =>
    campaignAmmunitionAdmission({...entry, source:'catalog'}, model.catalogs, model.campaignTL, draft.target?.modeId).allowed);
  const stored = draft.ammo && (!ammo.some(entry => sameAmmoBinding(entry, draft.ammo)) || draft.ammo.modeId !== draft.target?.modeId);
  const ammoOptions = (stored ? `<option value="stored" selected>${escapeWeaponHTML(draft.ammo.name)} (${escapeWeaponHTML(weaponText("Review"))})</option>` :
    draft.ammoType && !draft.ammo ? `<option value="stored" selected>${escapeWeaponHTML(draft.ammoType)} (${escapeWeaponHTML(weaponText("Stored"))})</option>` : "") +
    ammo.filter(entry => !stored || !sameAmmoBinding(entry, draft.ammo)).map(entry => `<option value="${escapeWeaponHTML(entry.choiceKey)}" title="${escapeWeaponHTML(entry.label)}"` +
      `${sameAmmoBinding(entry, draft.ammo) ? " selected" : ""}>${escapeWeaponHTML(entry.label)}</option>`).join("");
  const available = hasWeaponBondPerk(model.actor);
  return `<div><label>${escapeWeaponHTML(weaponText("Catalog"))}</label>
    <div class="gam-catalog-select"><select name="catalogMode" aria-label="${escapeWeaponHTML(weaponText("Catalog"))}">
      <option value="">${escapeWeaponHTML(weaponText("NoBinding"))}</option>${options}</select>
      <button type="button" data-edit-attack-parameters title="${escapeWeaponHTML(weaponText("Edit"))}" aria-label="${escapeWeaponHTML(weaponText("Edit"))}"><i class="fa-solid fa-pencil" aria-hidden="true"></i></button></div>
    <p class="hint gam-catalog-status" role="status">${escapeWeaponHTML(weaponText(status))}</p>
    <div class="gam-catalog-comparison" data-catalog-comparison>${weaponComparisonHTML((['etc','lp'].includes(model.executionVariant)||model.catalogs?.getMode(model.executionModeId)?.lt_ranged_contract?.bulkValues)?{...model.attack,data:model.previewStats().stats}:model.attack, model.catalogs?.getMode(draft.target?.modeId))}</div></div>
    ${sourceBulkChoiceHTML(model.catalogs?.getMode(draft.target?.modeId),model.ltBulkState,escapeWeaponHTML)}
    <label>${escapeWeaponHTML(weaponText("Ammo"))}<select name="ammunition"><option value="">${escapeWeaponHTML(weaponText("NoAmmo"))}</option>${ammoOptions}</select></label>
    <label>${escapeWeaponHTML(weaponText("Skill"))}<select name="governingSkillKey">${skillOptionsHTML(model.actor, draft.skillBinding)}</select></label>
    ${weaponBondCheckbox({available,checked:draft.weaponBond,manualAllowed:model.catalogs?.getEquipmentForMode(draft.target?.modeId)?.source==='LT'})}`;
}

export function bindWeaponConfiguration(root, model, edit) {
  const bowRoot=root.querySelector('[data-native-lt-bow]');
  if(bowRoot){bowRoot._ltBowActor=model.actor;bindLTBowEditor(bowRoot,{getModeId:()=>model.executionModeId,getConfiguration:()=>model.ltBow,setField:(k,v)=>{model.ltBow[k]=v;}});}
  const refreshExecution=()=>{
    if(bowRoot){bowRoot.hidden=model.standalone;bowRoot.innerHTML=ltBowEditorHTML(model.ltBow,model.executionModeId,model.actor,escapeWeaponHTML);}
    const laser=root.querySelector('[data-weapon-laser]');if(laser)laser.innerHTML=laserModificationsHTML(model.executionModeId,model.laserDraft().value,escapeWeaponHTML)+ppbOmniHTML(model.executionModeId,model.omniBlaster)+sonicNeuralHardwareHTML(model.executionModeId,model.sonicNeuralDraft().value,escapeWeaponHTML)+exoticBeamHardwareHTML(model.executionModeId,model.exoticBeamDraft().value,escapeWeaponHTML);
    const section=root.querySelector('[data-weapon-execution]');
    if(section)section.innerHTML=executionConfigurationHTML(model.executionModeId,model.executionVariant,model.catalogs,model.campaignTL,escapeWeaponHTML,model.gaussSpeed);
    for(const input of root.querySelectorAll('[data-standalone-stat]')) {
      const field=input.dataset.standaloneStat;
      if(!['damage','range','shots','rof'].includes(field))continue;
      const preview=model.previewStats(input.dataset.modeId);
      input.value=preview.stats[field]??'';
      input.readOnly=preview.derivedFields.includes(field);
      input.title=input.readOnly?weaponText('DerivedExecution'):standaloneText(input.value===''?'Missing':'Override');
      updateStandaloneResolvedDamage(root,model.standaloneDraft,input.dataset.modeId,preview);
    }
    if(!model.standalone&&model.current){
      const comparison=root.querySelector('[data-catalog-comparison]');
      if(comparison)comparison.innerHTML=weaponComparisonHTML((['etc','lp'].includes(model.executionVariant)||model.catalogs?.getMode(model.executionModeId)?.lt_ranged_contract?.bulkValues)?{...model.attack,data:model.previewStats().stats}:model.attack,model.catalogs?.getMode(model.current.target?.modeId));
    }
  };
  root.addEventListener('change',event=>{
    if(event.target.name==='ltBulkState'){model.ltBulkState=event.target.value==='giant'?'giant':'mounted';refreshExecution();return;}
    if(event.target.name==='psionicSetting'){
      const draft=model.exoticBeamDraft();draft.changed=true;draft.value.psionicSettings=[...root.querySelectorAll('[name=psionicSetting]:checked')].map(el=>el.value);
      const price=root.querySelector('[data-psionic-price]'),p=exoticBeamProfile(model.executionModeId),multiplier=1+Math.max(0,draft.value.psionicSettings.length-1)*0.5;
      if(price)price.textContent=draft.value.psionicSettings.length?`Цена: $${p.cost*multiplier}; ×${multiplier}.`:'Выберите хотя бы одну установленную настройку.';
      return;
    }
    if(['neuralSetting','sonicUnderwater'].includes(event.target.name)){
      const draft=model.sonicNeuralDraft();draft.changed=true;
      if(event.target.name==='sonicUnderwater')draft.value.sonicUnderwater=event.target.checked;
      else draft.value.neuralSettings=[...root.querySelectorAll('[name=neuralSetting]:checked')].map(el=>el.value);
      const price=root.querySelector('[data-neural-price]');if(price){const c=neuralDesign({...draft.value,catalogModeId:model.executionModeId});price.textContent=`Цена: $${c.cost}; ×${c.costMultiplier}; TL${c.tl}^.`;}
      return;
    }
    if(event.target.name==='omniBlaster'){model.omniBlaster=event.target.checked;model.omniChanged=true;return;}
    if(event.target.name==='laserConstruction'||event.target.name?.startsWith('laserModification-')){
      const draft=model.laserDraft();draft.changed=true;
      if(event.target.name==='laserConstruction'){
        draft.value.construction=event.target.value;
        if(draft.value.construction!=='standard'){draft.value.dazzle=false;draft.value.blinding=false;}
        if(draft.value.construction==='pulse')draft.value.beamPulse=false;
      }else draft.value[event.target.name.slice('laserModification-'.length)]=event.target.checked;
    }
    if(event.target.name==='gaussSpeed') {model.gaussSpeed=event.target.value;model.gaussSpeedChanged=true;}
    if(event.target.name==='weaponExecution') {model.executionVariant=event.target.value;model.executionChanged=true;}
    refreshExecution();
  });
  root.querySelector('[name="campaignTL"]')?.addEventListener('change', event => {
    try { model.campaignTL = parseCampaignTL(event.target.value); event.target.setCustomValidity(''); refresh(); }
    catch (error) { event.target.setCustomValidity(error.message); event.target.reportValidity(); }
  });
  const standaloneRoot = root.querySelector('[data-standalone-configuration]');
  if (standaloneRoot?.querySelector) {
    bindStandaloneConfiguration(standaloneRoot, model.standaloneDraft);
    const saveButton = root.querySelector('button[data-action="ok"]');
    const saveLabel = saveButton?.querySelector("span") ?? saveButton;
    const title = root.querySelector(".window-title");
    const originalLabel = saveLabel?.textContent, originalTitle = title?.textContent;
    const updateLabels = () => {
      if (saveLabel) saveLabel.textContent = model.standalone ? standaloneText("Save") : originalLabel;
      if (title) title.textContent = model.standalone ? standaloneText(model.existing ? "Edit" : "Add") : originalTitle;
    };
    root.querySelector('[name="standaloneWeapon"]').addEventListener("change", event => {
      model.standalone = event.target.checked;
      root.querySelector('[data-gga-configuration]').hidden = model.standalone;
      standaloneRoot.hidden = !model.standalone;
      updateLabels();
    });
    updateLabels();
  }
  const fields = root.querySelector("[data-weapon-mode-fields]");
  const refresh = () => {
    fields.innerHTML = weaponModeFieldsHTML(model);
    refreshExecution();
    for (const select of root.querySelectorAll("select")) select.title = select.selectedOptions?.[0]?.textContent?.trim() ?? "";
  };
  root.querySelector('[name="attackPath"]').addEventListener("change", event => { model.selectAttack(event.target.value); refresh(); });
  fields.addEventListener("change", event => {
    const field = event.target;
    if (field.name === "catalogMode") {
      const equipment = model.catalogs?.getEquipmentForMode(field.value);
      model.selectCatalog(equipment ? { equipmentId: equipment.equipment_id, modeId: field.value } : null);
      refresh();
    } else if (field.name === "ammunition") model.selectAmmo(field.value);
    else if (field.name === "governingSkillKey") model.selectSkill(field.value);
    else if (field.name === "weaponBond") model.current.weaponBond = field.checked;
    if (field.tagName === "SELECT") field.title = field.selectedOptions?.[0]?.textContent?.trim() ?? "";
  });
  fields.addEventListener("click", async event => {
    const button = event.target.closest("[data-edit-attack-parameters]");
    if (!button || !model.attack) return;
    event.preventDefault();
    button.disabled = true;
    const path = model.path, draft = model.current;
    try {
      const result = await edit(model.attack, draft);
      if (!result) return;
      if (result.action === "save" || result.action === "reset") draft.override = result;
      if (result.configuration) {
        // selectCatalog addresses the captured mode even if another mode is selected while awaiting the editor.
        const currentPath = model.path;
        model.path = path;
        if (result.configuration.catalogChanged) model.selectCatalog(result.configuration.target, { preserveSkill: true });
        model.path = currentPath;
      }
    } finally { refresh(); }
  });
  refresh();
}
import { isPaintCarbine, newPaintBattery } from './ut-paint-power.js';
