import { standaloneModeStats, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { resolveStandaloneSkill, standaloneSkillDescription } from "./standalone-skill-service.js";
import { parseWeaponBulk } from "./weapon-bulk.js";
import {specializedPlatform,configuredPlatform,platformRange} from '../ht-specialized-platforms.js';

/** A module-owned attack value, not an Actor attack, Item or GGA lookup path. Read fresh for each calculation. */
export function readStandaloneAttack(actor, weaponId, modeId = null) {
  const record = new StandaloneWeaponService(actor).get(weaponId);
  const mode = modeId ? record?.modes.find(m => m.modeId === modeId) : record?.modes[0];
  if (!record || !mode) return null;
  const stats = { ...standaloneModeStats(mode.snapshot), ...mode.overrides };
  const configured=configuredPlatform(specializedPlatform(mode.snapshot,record.source.source),mode.overrides);
  if(configured.bulk!==undefined)stats.bulk=configured.bulk;
  const platformRules=configured.platform;
  const ammunitionRange=platformRange(platformRules,stats.range);
  if(platformRules?.manualGuidance){stats.rof='1';stats.range=String(ammunitionRange?.maximum??stats.range);}
  const bulkMetadata = parseWeaponBulk(stats.bulk);
  const skill = resolveStandaloneSkill({ actor, record, mode });
  const data = { ...stats, name: record.name, mode: mode.snapshot.usage ?? "", level: skill.level };
  // Catalog defense values are modifiers, GGA attack values are complete defense levels.
  if (record.type === "melee" && skill.resolved) for (const field of ["parry", "block"]) {
    const match = String(stats[field] ?? "").match(/^([+-]?\d+)([A-Za-z]*)$/);
    if (match) data[field] = String(3 + Math.floor(skill.level / 2) + Number(match[1])) + match[2];
  }
  const uuid = "olegurps:" + record.id + ":" + mode.modeId;
  const reference = { weaponId: record.id, modeId: mode.modeId, revision: record.revision, combatType: record.type,
    source: structuredClone(record.source), governingSkill: skill };
  let unsupportedDamage = false;
  if (stats.damage && typeof globalThis.GURPS?.parselink === "function") {
    try { const action = globalThis.GURPS.parselink(stats.damage)?.action;
      unsupportedDamage = !["damage", "deriveddamage"].includes(action?.type) || !!action?.next;
    } catch { unsupportedDamage = true; }
  }
  const reason = configured.reason ?? platformRules?.blockedReason ?? (!skill.resolved ? skill.reason : skill.level < 3 ? "Уровень навыка ниже 3: атака недоступна." : !stats.damage ? "В режиме не указан Damage." :
    unsupportedDamage ? "Этот Damage не поддерживается штатным адаптером. Укажите одну распознаваемую GGA формулу урона." :
    record.type === "ranged" && (!/\d/.test(String(stats.rof ?? "")) || !platformRules?.rclNotApplicable && !/^[1-9]\d*(?:\s*\/\s*[1-9]\d*)?$/.test(String(stats.rcl ?? "")) ||
      stats.acc === null || !Number.isFinite(Number(String(stats.acc).split("+")[0])) || !platformRules?.bulkNotApplicable && !bulkMetadata) ?
      "В режиме не хватает RoF, Rcl, Acc или Bulk. Заполните отсутствующие параметры в настройках." :
    record.type === "melee" && !stats.reach ? "В режиме не указан Reach." : null);
  return { ...data, path: "", uuid, key: "uuid:" + uuid, label: data.mode ? record.name + " — " + data.mode : record.name,
    acc: stats.acc === null ? null : Number(String(stats.acc).split("+")[0]),
    scopeBonus: Number(String(stats.acc ?? "").split("+")[1]) || 0,
    bulk: bulkMetadata?.numericBulk ?? null, bulkMetadata, data, sourceDamage: stats.damage,
    standaloneRef: reference, governingSkillBinding: { kind: "standalone", weaponId: record.id, modeId: mode.modeId },
    ...(platformRules?{platformRules,ammunitionRange,
      ammunitionConditions:platformRules.instruction?[{id:'SpecializedPlatform',text:platformRules.instruction}]:[]}:{}),
    skillDescription: standaloneSkillDescription(skill), readinessReason: reason };
}
export function listStandaloneAttacks(actor, type) {
  return new StandaloneWeaponService(actor).list(type).flatMap(record => record.modes.map(mode =>
    readStandaloneAttack(actor, record.id, mode.modeId)));
}
export function standaloneCatalogBinding(attack, catalogs) {
  const ref = attack?.standaloneRef;
  if (!ref) return null;
  const mode = catalogs?.getMode(ref.modeId);
  const equipment = catalogs?.getEquipment(ref.source?.equipmentId);
  const hash = catalogs?.getCatalog("weapons")?.sources?.find(s => s.code === ref.source?.source)?.sha256;
  return hash === ref.source?.sourceHash && equipment?.modes?.some(m => m.weapon_mode_id === mode?.weapon_mode_id) ?
    { status: "confirmed", binding: { confirmed: true, modeId: ref.modeId,
      equipmentId: ref.source.equipmentId, source: "standalone-catalog-identity" } } : { status: "unavailable" };
}
export function standaloneAvailableRounds(weapon) {
  return weapon?.standaloneWeaponId && weapon.ammoUnconfigured && !weapon.ammunitionInventory && !weapon.magazines?.length
    ? Infinity : weapon?.magazines?.[weapon.loadedIndex] ?? 0;
}
