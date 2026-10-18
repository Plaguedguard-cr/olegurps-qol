import { readAuditFixture, assertHistoricalAudit } from './fixtures/ht-audit-contracts.mjs';
import { HT_SOURCE_REVIEW } from "../scripts/ht-source-corrections.js";
import { assertPlusPReadyIdentities } from './helpers/current-ht-plus-p-boundary.mjs';
import { moduleText as russianText } from "../scripts/localization.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { catalogs, compatibility, automatic, context, modes, resolver, inventoryFixture } from "./fixtures/ht-special-context.mjs";
import { parseWeaponBulk } from "../scripts/tools/weapon-bulk.js";
import { normalizeBulk, calculateMoveAttackPenalty, calculateAimBonus } from "../scripts/tools/fire-service.js";
import { normalizeAttackOverride, applyAttackOverride, getAttackOverrideKey } from "../scripts/tools/weapon-attack-overrides.js";
import { validateWeaponAttackOverride } from "../scripts/tools/weapon-attack-editor.js";
import { StandaloneWeaponDraft, StandaloneWeaponService } from "../scripts/tools/standalone-weapon-service.js";
import { readStandaloneAttack, standaloneCatalogBinding } from "../scripts/tools/standalone-attack-service.js";
import { parseDamageRange } from "../scripts/tools/ammunition-effects.js";
import { createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { withRuntimeAmmoStats } from "../scripts/tools/attack-profile-runtime.js";
import { projectAmmoInventory } from "../scripts/tools/ammo-inventory.js";
import { ammoEffectText, loadAmmoEffectTranslations } from "../scripts/tools/gga-damage-compatibility.js";
import { auditPlusPBlockers } from "../scripts/audits/ht-plus-p-blockers.mjs";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { AutomaticAmmunitionProfileService } from "../scripts/tools/automatic-ammunition-profiles.js";

test("shared Bulk parser preserves stock capability without inventing stock position or zero", () => {
  assert.deepEqual(parseWeaponBulk("-3*"), { rawBulk: "-3*", numericBulk: -3, hasFoldingStock: true });
  for (const value of [-2, "-3", "-4", 0, "-10", "+2"]) {
    assert.equal(parseWeaponBulk(value).numericBulk, Number(value));
    assert.equal(parseWeaponBulk(value).hasFoldingStock, false);
  }
  for (const value of [null, undefined, "", "?", "-3oops", "-3**", "-3.5", "NaN", Infinity]) {
    assert.equal(parseWeaponBulk(value), null); assert.equal(normalizeBulk(value), null);
  }
  assert.equal(calculateMoveAttackPenalty("-3*", true), -3);
  assert.equal(calculateMoveAttackPenalty("-3", true), -3);
  assert.equal(calculateMoveAttackPenalty("-3*", false), 0);
});

test("every actual catalog stock-marked Bulk parses without changing the catalog", () => {
  const original = JSON.stringify(catalogs.getCatalog("weapons"));
  const marked = catalogs.getCatalog("weapons").equipment.flatMap(e => e.modes).filter(m => String(m.stats.bulk).includes("*"));
  assert.ok(marked.length > 20);
  for (const mode of marked) {
    const b = parseWeaponBulk(mode.stats.bulk);
    assert.ok(b, mode.weapon_mode_id); assert.equal(b.hasFoldingStock, true);
    assert.equal(normalizeBulk(mode.stats.bulk), Number(mode.stats.bulk.replace("*", "")));
    assert.equal(calculateMoveAttackPenalty(mode.stats.bulk, true), calculateMoveAttackPenalty(b.numericBulk, true));
  }
  assert.equal(JSON.stringify(catalogs.getCatalog("weapons")), original);
});

test("editor and persisted mode overrides accept stock notation and reject an empty Bulk", () => {
  const values = { skillLevel: "13", rof: "10", acc: "4", scopeBonus: "0", bulk: "-3*", rcl: "2" };
  const valid = validateWeaponAttackOverride(values, () => ({ valid: true }));
  assert.equal(valid.valid, true); assert.equal(valid.value.bulk, -3);
  assert.deepEqual(normalizeAttackOverride(JSON.parse(JSON.stringify(valid.value))), valid.value);
  assert.equal(normalizeAttackOverride({ ...values, bulk: "" }), null);
  assert.equal(validateWeaponAttackOverride({ ...values, bulk: "" }, () => ({ valid: true })).valid, false);
  const attack = { path: "system.ranged.mode", bulk: -3, data: { bulk: "-3*" } };
  const applied = applyAttackOverride(attack, { attackOverrides: { [getAttackOverrideKey(attack)]: { ...valid.value, bulk: -4 } } });
  assert.equal(applied.bulk, -4); assert.equal(applied.bulkMetadata.numericBulk, -4);
  assert.equal(applied.sourceBulkMetadata.hasFoldingStock, true);
});

test("actual MP7 standalone attack is ready, preserves raw Bulk and adds no folded-stock modifiers", async () => {
  const flags = {}, system = { attributes: { DX: { value: 12 } }, skills: { skill: { name: "Guns/TL8 (Submachine Gun)", level: 15, points: 4 } }, ranged: {} };
  const actor = { id: "bulk-fixture", isOwner: true, system,
    getFlag: (scope, key) => flags[scope]?.[key], setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); } };
  const original = JSON.stringify(system), d = new StandaloneWeaponDraft({ catalogs, type: "ranged" });
  d.selectModel(catalogs.getEquipmentForMode(modes.mp7).equipment_id);
  const record = await new StandaloneWeaponService(actor, catalogs).save(d), attack = readStandaloneAttack(actor, record.id, modes.mp7);
  assert.equal(attack.readinessReason, null); assert.equal(attack.bulk, -3); assert.equal(attack.data.bulk, "-3*");
  assert.equal(attack.bulkMetadata.hasFoldingStock, true); assert.equal(attack.acc, 4); assert.equal(attack.rcl, "2");
  assert.equal(calculateAimBonus(attack.acc, 1), 4);
  assert.equal(standaloneCatalogBinding(attack, catalogs).status, "confirmed");
  assert.equal(JSON.stringify(system), original);
  const c = context(modes.mp7), type = automatic.prepare({ modeId: modes.mp7, base: c.base, variantId: "ht_subsonic_rifle" }).type;
  const profile = resolver.resolve({ actorId: actor.id, attack, binding: c.binding, ammunition: { type }, profilePolicy: "permissive" });
  assert.equal(profile.damage.nativeSafe, true); assert.equal(profile.damage.formula, "2d+2 pi-");
  assert.equal(profile.effective.acc, 4); assert.equal(profile.effective.rcl, "2");
  assert.equal(profile.bulkMetadata.source.rawBulk, "-3*"); assert.equal(profile.bulkMetadata.capability.hasFoldingStock, true);
  assert.equal(Object.hasOwn(profile.bulkMetadata.capability, "stockFolded"), false);
  const shot = createShotSnapshot(profile, { attackId: "immutable-MP7" }), saved = JSON.stringify(shot);
  assert.ok(Object.isFrozen(shot.profile.bulkMetadata.source));
  actor.system.skills.skill.level = 16;
  assert.equal(JSON.stringify(shot), saved); assert.equal(JSON.parse(saved).profile.bulkMetadata.source.hasFoldingStock, true);
});

test("FN BAR exact HT120 correction scales both ranges once and never substitutes incomplete GGA data", () => {
  const id = "WRziobjV56cvaJtG2", c = context(id), type = automatic.prepare({ modeId: id, base: c.base, variantId: "ht_plus_p" }).type;
  assert.equal(c.raw.range, "1,600/6,600"); assert.deepEqual(parseDamageRange(c.raw.range), { halfDamage: 1600, maximum: 6600 });
  const ammunition = { type }, p = resolver.resolve({ actorId: "actor", rawAttack: c.raw, binding: c.binding, ammunition, profilePolicy: "permissive" });
  assert.equal(p.effective.range, "1760/7260"); assert.equal(p.damage.nativeSafe, true);
  assert.equal(automatic.prepare({ modeId: id, base: c.base, variantId: "ht_plus_p", savedType: type }).state, "complete");
  const old = createShotSnapshot(p, { attackId: "old-FN" }), saved = JSON.stringify(old);
  const raw = { ...c.raw, range: "1600" }, before = JSON.stringify(raw);
  const blocked = resolver.resolve({ actorId: "actor", rawAttack: raw, binding: c.binding, ammunition, profilePolicy: "permissive" });
  assert.equal(blocked.damage.nativeSafe, false); assert.equal(blocked.damage.reason, "native-range-components-missing");
  assert.equal(blocked.effective.range, "1600"); assert.equal(JSON.stringify(raw), before); assert.equal(JSON.stringify(old), saved);
  const f = inventoryFixture(id, "ht_plus_p"), state = f.state(), actor = f.actor;
  const original = JSON.stringify(actor.system), api = globalThis.OleGURPSQOL;
  globalThis.OleGURPSQOL = { catalogs, ammunitionCompatibility: compatibility, weaponCatalogBindings: { analyzeMode: () => c.binding } };
  try { const once = withRuntimeAmmoStats({ ...c.raw, path: "system.ranged.mode", data: c.raw }, actor, state);
    assert.equal(once.data.range, "1760/7260"); assert.equal(withRuntimeAmmoStats(once, actor, state).data.range, "1760/7260");
  } finally { globalThis.OleGURPSQOL = api; }
  assert.equal(JSON.stringify(actor.system), original);
});

test("incomplete GGA Range diagnostics really load in RU and EN, including a cached prior translation", async () => {
  for (const language of ["ru", "en"]) {
    const data = JSON.parse(await fs.readFile(new URL("../lang/" + language + ".json", import.meta.url), "utf8")), translations = { "OleGURPS.AmmoEffects.plus-p-loading-check-required": "cached prior translation" };
    const runtime = { location: {}, fetch: async () => ({ ok: true, json: async () => data }), game: { i18n: { lang: language, translations,
      localize: key => translations[key] ?? key } }, foundry: { utils: { setProperty: (o,k,v) => o[k] = v } } };
    await loadAmmoEffectTranslations(runtime);
    assert.equal(ammoEffectText("native-range-components-missing", {}, runtime), russianText("OleGURPS.AmmoEffects.native-range-components-missing"));
    assert.match(ammoEffectText("native-range-components-missing", {}, runtime), true ? /исправьте Range самой атаки/ : /correct Range in the attack itself/);
  }
});

test("FN range factors restore exactly +P, APDS and SAPFSDS from the corrected source", () => {
  const id = "WRziobjV56cvaJtG2", c = context(id);
  for (const [variantId, expectedRange] of [["ht_plus_p", "1760/7260"], ["ht_apds", "2400/9900"], ["ht_sapfsds", "2400/9900"]]) {
    const type = automatic.prepare({ modeId: id, base: c.base, variantId }).type;
    assert.ok(type, variantId);
    const resolve = rawAttack => resolver.resolve({ actorId: "FN-range", rawAttack, binding: c.binding,
      ammunition: { type }, profilePolicy: "permissive" });
    const old = resolve({ ...c.raw, range: "1,600" }), fixed = resolve(c.raw);
    assert.equal(old.damage.nativeSafe, false, variantId);
    assert.equal(old.damage.reason, "native-range-components-missing");
    assert.equal(fixed.damage.nativeSafe, true, variantId); assert.equal(fixed.effective.range, expectedRange);
  }
});

test("HT120 erratum preserves previously saved definitions, recipe identity and old shot data", async () => {
  const id = "WRziobjV56cvaJtG2", originalEquipment = catalogs.getEquipmentForMode(id), oldMode = structuredClone(catalogs.getMode(id));
  oldMode.stats.range = "1,600";
  const oldEquipment = { ...structuredClone(originalEquipment), modes: [oldMode] };
  const oldCatalogs = new Proxy(catalogs, { get(target, key) {
    if (key === "getMode") return modeId => modeId === id ? oldMode : target.getMode(modeId);
    if (key === "getEquipment") return equipmentId => equipmentId === oldEquipment.equipment_id ? oldEquipment : target.getEquipment(equipmentId);
    if (key === "getEquipmentForMode") return modeId => modeId === id ? oldEquipment : target.getEquipmentForMode(modeId);
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  } });
  const oldAutomatic = new AutomaticAmmunitionProfileService({ catalogs: oldCatalogs, compatibility: new AmmunitionCompatibilityService(oldCatalogs) });
  const c = context(id), savedType = oldAutomatic.prepare({ modeId: id, base: c.base, variantId: "ht_plus_p" }).type;
  assert.ok(savedType); assert.deepEqual(automatic.prepare({ modeId: id, base: c.base, variantId: "ht_plus_p", savedType }).type, savedType);
  const flags = {}, actor = { id: "saved-FN", isOwner: true, system: { ranged: {} },
    getFlag: (s,k) => flags[s]?.[k], setFlag: async (s,k,v) => { flags[s] ??= {}; flags[s][k] = structuredClone(v); } };
  const draft = new StandaloneWeaponDraft({ catalogs: oldCatalogs, type: "ranged" }); draft.selectModel(oldEquipment.equipment_id);
  const saved = await new StandaloneWeaponService(actor, oldCatalogs).save(draft);
  const updated = await new StandaloneWeaponService(actor, catalogs).save(new StandaloneWeaponDraft({ catalogs, type: "ranged", existing: saved }));
  assert.equal(updated.modes[0].snapshot.stats.range, "1,600"); assert.equal(updated.source.sourceHash, saved.source.sourceHash);
  assert.deepEqual(actor.system, { ranged: {} });
  const oldShot = createShotSnapshot(resolver.resolve({ actorId: actor.id, rawAttack: { ...c.raw, range: "1,600" } }), { attackId: "historical-base-FN" });
  const persisted = JSON.stringify(oldShot);
  resolver.resolve({ actorId: actor.id, rawAttack: c.raw, binding: c.binding, ammunition: { type: savedType }, profilePolicy: "permissive" });
  assert.equal(JSON.stringify(oldShot), persisted); assert.equal(JSON.parse(persisted).profile.raw.range, "1,600");
});

test("historical 227 +P restrictions stay intact; current B review preserves every E/F/G blocker", async () => {
  const before = JSON.stringify(catalogs.getCatalog("ht"));
  const report = readAuditFixture('ht-plus-p-blockers');
  const current = auditPlusPBlockers({ catalogs, compatibility });
  assert.equal(report.examined, 511); assert.equal(report.ready, 284); assert.equal(report.rows.length, 227);
  assert.deepEqual(Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,v.count])), { A:0, B:106, C:0, D:0, E:12, F:98, G:11 });
  assert.equal(new Set(report.rows.map(r=>r.modeId+"/"+r.ammoItemId)).size, 227);
  for (const r of report.rows) {
    assert.ok(r.equipmentId && r.ammoFamilyId); assert.ok(r.eligibilityRestrictions.length >= 2);
    assert.equal(r.compatibility.variant, "undetermined"); assert.equal(r.numericalCalculation.physicalPressureRequired, false);
    assert.equal(r.numericalCalculation.malfAndRoFRequired, false);
    assert.equal(r.GM.approvalCurrentlyCanResolve, false);
    for (const check of r.eligibilityRestrictions) assert.ok(r.secondaryRestrictions.some(s=>s.code===check.field));
    assert.ok(r.missingParameters.every(p=>p.parameter&&p.reason&&p.scope));
  }
  assert.equal(report.summary.numericComplete, 153); assert.equal(report.summary.supportedArithmeticAfterEvidenceReview, 106);
  assert.equal(report.summary.missingRangeRegardlessOfApplicability, 6);
  assert.equal(report.summary.missingDamageRegardlessOfApplicability, 0); assert.equal(report.summary.missingSTRegardlessOfApplicability, 0);
  assert.equal(report.summary.arithmeticCandidatesWithAdditionalStandaloneUIBlocks, 61);
  assert.equal(report.rows.find(r=>r.modeId==="Wd25u9Begix9h_smN").primaryCategory,"E");
  assert.equal(report.rows.find(r=>r.modeId==="WhGAE0Z1tyyGl34FX").primaryCategory,"F");
  assert.equal(report.rows.find(r=>r.modeId==="W10jqOZ0kjeSuoY3C").parsed.damageStatus,"present-but-not-supported-by-plus-p-parser");
  assert.equal(JSON.stringify(catalogs.getCatalog("ht")),before);
  assert.equal(report.previousAggregate.ready,283);
  assert.equal(current.examined,511); assert.equal(current.ready,369);
  // P6 pressure gate changes diagnostic classification, never opens historical E/F.
  const closed=new Set([...current.rows,...current.otherNonreadyPairs].map(r=>r.modeId+'/'+r.ammoItemId));
  const pairs=catalogs.getCatalog('ht').ammo_items.flatMap(ammo=>ammo.weapon_mode_ids.map(modeId=>({
    modeId,ammoItemId:ammo.id,ready:!closed.has(modeId+'/'+ammo.id)})));
  assertPlusPReadyIdentities(pairs);
  assert.equal(pairs.filter(r=>r.ready).length,current.ready);
  for(const r of report.rows.filter(r=>['E','F'].includes(r.primaryCategory)))assert(closed.has(r.modeId+'/'+r.ammoItemId),r.modeId);
  for(const [mid,[aid]]of Object.entries(HT_SOURCE_REVIEW))assert(closed.has(mid+'/'+aid),mid);
  assert.deepEqual(current.rows.filter(r=>r.primaryCategory==='G').map(r=>r.modeId),[]);
  for(const [modeId,ammoId] of [['W10jqOZ0kjeSuoY3C','ht_5_66x39mm'],['WK6cr08HEjTSsvYNS','ht_14_5x114mm']]){
    assert(!closed.has(modeId+'/'+ammoId));
    assert.equal(compatibility.checkCompatibility(modeId,ammoId,{book:'ht',kind:'ammo-item'}).status,'compatible');
  }
  // P6 requires pressure evidence for new .410 and corrected LeMat pairs.
  // They left the arithmetic bucket, but must remain unavailable.
  for(const mid of ['W7i4ZauQl8q2o5nTt','WdzSSShGT_yv4ctOi']) {
    assert(current.otherNonreadyPairs.some(r=>r.modeId===mid));
    assert(compatibility.checkCompatibility(mid,'ht_plus_p').reasons.some(r=>
      r.code==='ELIGIBILITY_EVIDENCE_MISSING'&&r.message.includes('weapon_pressure_rating_verified')));
  }
});
