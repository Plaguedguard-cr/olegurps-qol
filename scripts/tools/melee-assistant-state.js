import {adaptGgaShieldAttacks} from './shield-equipment-adapter.js';
import {collectUnarmedAttacks} from './bs-unarmed.js';
import {adaptGgaImprovisedAttacks} from './lt-improvised-equipment-adapter.js';
import { getAttackOverrideKey } from "./weapon-attack-overrides.js";
import { listStandaloneAttacks } from "./standalone-attack-service.js";
import { withActorResourceWrite } from "./actor-resource-writes.js";
import { StandaloneWeaponService } from "./standalone-weapon-service.js";
import { normalizeMeleeDamageModel } from './melee-damage-model.js';
import {createMeleeTargetedAttackContext} from './targeted-attack-service.js';
import {parseStandaloneSkill} from './standalone-skill-service.js';
import { resolveMeleeProfile, meleeProfileContext } from './melee-profile-service.js';
import { normalizeVisibility } from './limited-visibility.js';

const FLAG_SCOPE = "world";
const FLAG_KEY = "olegurpsMeleeAssistant";
const STATE_VERSION = 5;

const text = value => String(value ?? "").trim();
const integer = value => {
  const number = Number(text(value).replace(",", "."));
  return Number.isInteger(number) ? number : null;
};
const clone = value => globalThis.foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
const STORED_ATTACK_KEY_PREFIX = "key:";

function storedAttackKey(reference) {
  const key = getAttackOverrideKey(reference);
  if (!key) return "";
  return STORED_ATTACK_KEY_PREFIX + encodeURIComponent(key).replaceAll(".", "%2E");
}

function normalizeStoredAttackKey(key) {
  const source = text(key);
  if (!source) return "";
  return source.startsWith(STORED_ATTACK_KEY_PREFIX)
    ? source
    : STORED_ATTACK_KEY_PREFIX + encodeURIComponent(source).replaceAll(".", "%2E");
}

export function walkMeleeAttackTree(tree, callback, basePath = "system.melee", depth = 0) {
  if (!tree || typeof tree !== "object") return;
  for (const [key, entry] of Object.entries(tree)) {
    if (!entry || typeof entry !== "object") continue;
    const path = basePath + "." + key;
    callback(entry, path, key, depth);
    walkMeleeAttackTree(entry.contains, callback, path + ".contains", depth + 1);
    walkMeleeAttackTree(entry.collapsed, callback, path + ".collapsed", depth + 1);
  }
}

export function buildMeleeAttackReference(source, path) {
  const name = text(source?.name) || "Без названия";
  const mode = text(source?.mode);
  const level = integer(source?.level) ?? integer(source?.import) ?? 0;
  const reference = {
    path: text(path),
    uuid: text(source?.uuid),
    name,
    mode,
    label: mode ? name + " - " + mode : name,
    level: Math.max(0, level),
    damage: text(Array.isArray(source?.damage) ? source.damage.join(", ") : source?.damage),
    sourceDamage: source?.damage,
    reach: text(source?.reach),
    parry: text(source?.parry),
    block: text(source?.block),
    st: text(source?.st),
    data: source
  };
  reference.key = getAttackOverrideKey(reference);
  return reference;
}

export function collectMeleeAttacks(actor, options = {}) {
  const attacks = [];
  walkMeleeAttackTree(actor?.system?.melee, (source, path) => {
    const reference = buildMeleeAttackReference(source, path);
    if (reference.key) attacks.push(reference);
  });
  return collectUnarmedAttacks(actor,[...adaptGgaImprovisedAttacks(actor,adaptGgaShieldAttacks(actor,attacks)), ...listStandaloneAttacks(actor, "melee")],options);
}

export function normalizeMeleeAttackOverride(value) {
  if (!value || typeof value !== "object") return null;
  const skillLevel = integer(value.skillLevel);
  const damage = text(value.damage);
  const reach = text(value.reach);
  const parry = text(value.parry);
  if (skillLevel === null || skillLevel < 0 || skillLevel > 999 || !damage || !reach) return null;
  const damageModel=normalizeMeleeDamageModel(value.damageModel);
  return { skillLevel, damage, reach, parry,
    ...(damageModel?{damageModel}:{}),
    ...(Object.hasOwn(value,'applyArmST')?{applyArmST:value.applyArmST===true}:{}) };
}

export function normalizeMeleeAssistantState(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const attacks = {};
  for (const [key, raw] of Object.entries(source.attacks ?? {})) {
    if (!key || !raw || typeof raw !== "object") continue;
    const governingSkill = text(raw.governingSkill);
    const rapidStrikeMastery = raw.rapidStrikeMastery === true;
    const weaponBond = raw.weaponBond === true;
    const override = normalizeMeleeAttackOverride(raw.override);
    const hasVisibility = Object.hasOwn(raw, 'visibility');
    const safeKey = normalizeStoredAttackKey(key);
    if (safeKey && (governingSkill || rapidStrikeMastery || weaponBond || override || hasVisibility)) attacks[safeKey] = {
      ...(governingSkill ? { governingSkill } : {}),
      ...(rapidStrikeMastery ? { rapidStrikeMastery: true } : {}),
      ...(weaponBond ? { weaponBond: true } : {}),
      ...(hasVisibility ? { visibility: normalizeVisibility(raw.visibility) } : {}),
      ...(override ? { override } : {})
    };
  }
  const selectedAttackKey = text(source.selectedAttackKey);
  const dicePlusAdds = source.dicePlusAdds === true;
  return { version: STATE_VERSION, selectedAttackKey, dicePlusAdds, attacks };
}

export function setSelectedMeleeAttack(state, attack) {
  const key = getAttackOverrideKey(attack);
  if (!key) return false;
  state.selectedAttackKey = key;
  return true;
}

export function getMeleeAttackSettings(state, attack) {
  const key = storedAttackKey(attack);
  const settings=key ? state?.attacks?.[key] ?? {} : {};
  return typeof attack?.weaponBondSetting==='boolean'?{...settings,weaponBond:attack.weaponBondSetting}:settings;
}

function resolveSelectedMeleeProfile(actor,attack,settings) {
 const context=meleeProfileContext(actor,attack);
 const p=context?.profiles.find(p=>p.modeId===(context.saved.modeId||context.source.modeId));
 // The native GGA selector stores an exact skill key in assistant state.
 // Rebuild only source-confirmed physical strikes, after an explicit selection.
 if((p?.unarmedSkillBonus||p?.damagePart==='hilt'&&p.primarySkills.includes('Brawling'))&&!attack.standaloneRef&&!attack.unarmedRef&&settings.governingSkill) {
  const chosen=createMeleeTargetedAttackContext({actor,attack}).specialtyOptions.find(s=>s.value===settings.governingSkill);
  const identity=chosen&&parseStandaloneSkill(chosen.label);
  const skill=identity&&p.primarySkills.find(n=>parseStandaloneSkill(n)?.family===identity.family);
  if(skill)return resolveMeleeProfile({actor,attack,context,selection:{...context.saved,skill}});
 }
 return resolveMeleeProfile({actor,attack});
}
export function applyMeleeAttackOverride(attack, state, actor=null) {
  if (!attack) return null;
  const settings=getMeleeAttackSettings(state,attack);
  const override = normalizeMeleeAttackOverride(settings.override);
  if (!override) return actor?resolveSelectedMeleeProfile(actor,attack,settings):attack;
  const result = {
    ...attack,
    level: override.skillLevel,
    damage: override.damage,
    hasMeleeDamageOverride:override.damage!==attack.damage,
    meleeManualOverride:{skillLevel:override.skillLevel,parry:override.parry},
    reach: override.reach,
    parry: override.parry,
    ...(override.damageModel?{damageModel:override.damageModel}:{}),
    ...(Object.hasOwn(override,'applyArmST')?{applyArmST:override.applyArmST}:{}),
    data: {
      ...attack.data,
      level: override.skillLevel,
      import: override.skillLevel,
      damage: override.damage,
      reach: override.reach,
      parry: override.parry
    }
  };
  return actor?resolveSelectedMeleeProfile(actor,result,settings):result;
}

export function setMeleeDicePlusAdds(state, enabled) {
  state.dicePlusAdds = enabled === true;
  return true;
}

export function setMeleeGoverningSkill(state, attack, governingSkill) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  const current = { ...(state.attacks[key] ?? {}) };
  const normalized = text(governingSkill);
  if (normalized) current.governingSkill = normalized;
  else delete current.governingSkill;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export function setMeleeRapidStrikeMastery(state, attack, enabled) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  const current = { ...(state.attacks[key] ?? {}) };
  if (enabled === true) current.rapidStrikeMastery = true;
  else delete current.rapidStrikeMastery;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export function setMeleeVisibility(state, attack, visibility) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  state.attacks[key] = { ...(state.attacks[key] ?? {}), visibility: normalizeVisibility(visibility) };
  return true;
}

export function setMeleeWeaponBond(state, attack, enabled) {
  const key = storedAttackKey(attack);
  if (!key) return false;
  state.attacks ??= {};
  const current = { ...(state.attacks[key] ?? {}) };
  if (enabled === true) current.weaponBond = true;
  else delete current.weaponBond;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export function setMeleeAttackOverride(state, attack, value) {
  const key = storedAttackKey(attack);
  const override = normalizeMeleeAttackOverride(value);
  if (!key || !override) return false;
  state.attacks ??= {};
  state.attacks[key] = { ...(state.attacks[key] ?? {}), override };
  return true;
}

export function clearMeleeAttackOverride(state, attack) {
  const key = storedAttackKey(attack);
  if (!key || !state?.attacks?.[key]?.override) return false;
  const current = { ...state.attacks[key] };
  delete current.override;
  if (Object.keys(current).length) state.attacks[key] = current;
  else delete state.attacks[key];
  return true;
}

export class MeleeAssistantStateService {
  constructor(actor) {
    this.actor = actor;
  }

  async load() {
    return normalizeMeleeAssistantState(this.actor.getFlag(FLAG_SCOPE, FLAG_KEY));
  }

  async save(state) {
    return withActorResourceWrite(this.actor, async () => {
      const normalized = normalizeMeleeAssistantState(clone(state)), records = new StandaloneWeaponService(this.actor).list("melee");
      const deleted = key => {
        const match = decodeURIComponent(key).replace(/^key:/, "").match(/^uuid:olegurps:([^:]+):(.+)$/);
        return match && !records.some(r => r.id === match[1] && r.modes.some(m => m.modeId === match[2]));
      };
      if (deleted(normalized.selectedAttackKey)) normalized.selectedAttackKey = "";
      for (const key of Object.keys(normalized.attacks)) if (deleted(key)) delete normalized.attacks[key];
      await this.actor.setFlag(FLAG_SCOPE, FLAG_KEY, normalized);
      return normalized;
    });
  }
}
