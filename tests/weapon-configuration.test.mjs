import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CatalogService, CATALOG_DEFINITIONS } from "../scripts/catalog-service.js";
import { WeaponCatalogBindingService } from "../scripts/weapon-catalog-binding-service.js";
import { AmmunitionCompatibilityService } from "../scripts/ammunition-compatibility-service.js";
import { WeaponConfigurationDraft, baseAmmunition, compareWeaponStats, weaponComparisonHTML,
  searchWeaponCatalog, weaponCatalogSearchState, ammunitionChoiceKey, weaponConfigurationHTML, suggestWeaponSkill,
  skillOptionsHTML, bindWeaponConfiguration } from "../scripts/tools/weapon-configuration.js";
import { openWeaponAttackEditor } from "../scripts/tools/weapon-attack-editor.js";
import { getAttackOverrideKey } from "../scripts/tools/weapon-attack-overrides.js";
import { getRangedGoverningAttackKey } from "../scripts/tools/ranged-governing-skill-service.js";
import { AmmoService } from "../scripts/tools/ammo-service.js";
import { weaponText } from "../scripts/tools/weapon-localization.js";

const data = Object.fromEntries(await Promise.all(Object.entries(CATALOG_DEFINITIONS).map(async ([book, definition]) =>
  [book, JSON.parse(await fs.readFile(new URL("../data/catalogs/" + definition.filename, import.meta.url), "utf8"))])));
const catalogs = new CatalogService({ logger: null, fetcher: async url => ({ ok: true,
  json: async () => structuredClone(data[Object.keys(CATALOG_DEFINITIONS).find(book => url.endsWith(CATALOG_DEFINITIONS[book].filename))]) }) });
await catalogs.load();
const bindings = new WeaponCatalogBindingService(catalogs);
const ammunition = new AmmunitionCompatibilityService(catalogs);
const ak = { equipmentId: "eT448e6j7QT5yBB9-", modeId: "W27s4Lm8QlkKVKUPn" };
const pistol = { equipmentId: "eREHV1yF231q03bVq", modeId: "W1FMPB_-58qp_bH-M" };
globalThis.foundry = { utils: { deepClone: structuredClone } };
const english = JSON.parse(await fs.readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
globalThis.game = { i18n: { localize: key => /\.Search|\.Cartridge$|\.AmmoFamily$/.test(key) ? english[key] : key.split(".").at(-1) }, user: { isGM: true } };
const path = "system.ranged.00000";
function row(target = ak, extra = {}) {
  const equipment = catalogs.getEquipment(target.equipmentId), mode = catalogs.getMode(target.modeId);
  return { name: equipment.name, mode: mode.usage ?? "", pageref: equipment.reference, level: 13,
    damage: mode.raw_calc.damage, acc: mode.stats.accuracy, rof: mode.stats.rate_of_fire,
    rcl: mode.stats.recoil, bulk: mode.stats.bulk, range: mode.stats.range, shots: mode.stats.shots,
    st: mode.stats.strength, uuid: "", ...extra };
}
function fixture(rows = [row()], existing = null) {
  const flags = {}, writes = [];
  const actor = { isOwner: true, items: new Map(), system: { ranged: Object.fromEntries(rows.map((entry, index) =>
    [String(index).padStart(5, "0"), entry])), skills: {
    rifle: { name: "Guns/TL5 (Rifle)", uuid: "rifle", level: 12 },
    pistol: { name: "Guns/TL9 (Pistol)", uuid: "pistol", level: 15 }
  }, ads: { bond: { name: "Weapon Bond" } } },
    getFlag: (scope, key) => structuredClone(flags[scope]?.[key]),
    setFlag: async (scope, key, value) => { flags[scope] ??= {}; flags[scope][key] = structuredClone(value); writes.push({ scope, key }); } };
  const attacks = rows.map((entry, index) => ({ ...entry, path: "system.ranged." + String(index).padStart(5, "0"),
    label: entry.name, acc: Number(entry.acc), scopeBonus: 0, data: entry }));
  const state = { weapons: existing ? [existing] : [], attackOverrides: {}, governingSkills: {} };
  const makeDraft = (options = {}) => new WeaponConfigurationDraft({ actor, state, attacks, existing, catalogs, bindings, ammunition, ...options });
  return { actor, attacks, state, writes, flags, makeDraft };
}
function oldWeapon() {
  return { id: "old", name: row().name, attackRef: { path, uuid: "", name: row().name, mode: "" },
    ammoType: "Old custom rounds", totalAmmo: 90, capacity: 30, magazines: [17, 25, 30], loadedIndex: 1,
    weaponBond: true, governingSpecialty: "rifle" };
}
const editorValues = { skillLevel: "13", rof: "10", acc: "4", scopeBonus: "0", bulk: "-5", rcl: "2" };
const parser = value => ({ valid: /^\d+/.test(value) });

test("Sniper TL9 configuration exposes explicit 7mm EM selection without automatically choosing it", () => {
  const modeId = "WkhAN9tcmB9eEkmY6", equipmentId = catalogs.getEquipmentForMode(modeId).equipment_id;
  const f = fixture([row({modeId, equipmentId})]);
  f.flags["olegurps-qol"] = {campaignTL:9};
  const draft = f.makeDraft();
  assert.equal(draft.current.target.modeId, modeId);
  assert.equal(draft.current.ammo, null);
  assert.match(weaponConfigurationHTML(draft), /7mm_em/);
  draft.selectAmmo("7mm_em");
  assert.equal(draft.current.ammo.ammoId, "7mm_em");
  assert.equal(f.actor.getFlag("olegurps-qol", "campaignTL"), 9);
  assert.equal(f.writes.length, 0);
});

test("convincing automatic model remains a proposal until Save explicitly confirms it", async () => {
  const f = fixture(), draft = f.makeDraft();
  assert.equal(draft.current.target.modeId, ak.modeId);
  assert.equal(draft.current.target.confirmed, false);
  assert.equal(f.writes.length, 0);
  await draft.commit({ id: "new" });
  assert.equal(bindings.analyzeMode(f.actor, path).status, "confirmed");
  assert.equal(f.state.weapons.length, 0);
});

test("ambiguous candidates stay unbound when saved without explicit choice", async () => {
  const f = fixture([{ name: row().name, level: 13 }]), draft = f.makeDraft();
  assert.equal(draft.current.analysis.status, "candidates");
  assert.ok(draft.current.analysis.automatic.candidates.length);
  assert.equal(draft.current.target, null);
  const result = await draft.commit({ id: "new" });
  assert.equal(f.writes.length, 0);
  assert.equal(result.weapon.ammunitionBinding, undefined);
});

test("unmatched GGA attacks save without catalog or ammunition links", async () => {
  const f = fixture([row(ak, { name: "Unlisted energy widget", pageref: "" })]), draft = f.makeDraft();
  assert.equal(draft.current.analysis.status, "unmatched");
  const result = await draft.commit({ id: "new" });
  assert.equal(result.weapon.attackRef.path, path);
  assert.equal(f.writes.length, 0);
});

test("manual catalog choice is independent of the GGA attack and its characteristics", async () => {
  const f = fixture(), original = structuredClone(f.actor.system), draft = f.makeDraft();
  draft.selectCatalog(pistol);
  assert.equal(draft.path, path);
  await draft.commit({ id: "new" });
  assert.equal(bindings.analyzeMode(f.actor, path).binding.modeId, pistol.modeId);
  assert.deepEqual(f.actor.system, original);
});

test("confirmed manual binding takes precedence over a different automatic proposal", async () => {
  const f = fixture();
  await bindings.confirm(f.actor, path, pistol);
  const draft = f.makeDraft(), writes = f.writes.length;
  assert.equal(draft.current.target.modeId, pistol.modeId);
  await draft.commit({ id: "new" });
  assert.equal(f.writes.length, writes);
});

test("stat differences show actual and catalog values in red; matches have green summary", () => {
  const attack = fixture([row(ak, { acc: "5" })]).attacks[0];
  const comparisons = compareWeaponStats(attack, catalogs.getMode(ak.modeId));
  assert.deepEqual(comparisons[0], { field: "acc", label: "Acc", gga: "5", catalog: "4", equal: false });
  const html = weaponComparisonHTML(attack, catalogs.getMode(ak.modeId));
  assert.match(html, /gam-catalog-difference[^>]*>\u2260 Acc 5 \(4\)/);
  assert.match(html, /gam-catalog-match/);
  assert.equal(compareWeaponStats({ data: {} }, {}).length, 0);
});

test("different characteristics never prevent catalog confirmation or change GGA values", async () => {
  const f = fixture([row(ak, { acc: "99", rof: "99", damage: "99d" })]), before = structuredClone(f.actor.system);
  await f.makeDraft().commit({ id: "new" });
  assert.equal(bindings.analyzeMode(f.actor, path).status, "confirmed");
  assert.deepEqual(f.actor.system, before);
});

test("full search finds models outside automatic candidates, including exact mode IDs", () => {
  const draft = fixture().makeDraft();
  assert.ok(!draft.current.analysis.automatic.candidates.some(entry => entry.modeId === pistol.modeId));
  assert.equal(searchWeaponCatalog(catalogs, pistol.modeId)[0].equipmentId, pistol.equipmentId);
  assert.ok(searchWeaponCatalog(catalogs, "Colt HT").length > 0);
  assert.equal(searchWeaponCatalog(catalogs, "not-a-real-model-id").length, 0);
});

test("editor close without Save applies no values or configuration", async () => {
  const f = fixture(), draft = f.makeDraft(), before = structuredClone(draft.current);
  const result = await openWeaponAttackEditor({ DialogV2: { wait: async () => null }, attack: f.attacks[0], parseRateOfFire: parser,
    configuration: { catalogs, actor: f.actor, ...draft.current } });
  assert.equal(result, null);
  assert.deepEqual(draft.current, before);
  assert.equal(f.writes.length, 0);
});

test("catalog-only editor Save is distinct from a parameter override", async () => {
  const f = fixture(), draft = f.makeDraft();
  const result = await openWeaponAttackEditor({ DialogV2: { wait: async () => ({ action: "save", values: editorValues }) },
    attack: f.attacks[0], parseRateOfFire: parser, configuration: { catalogs, actor: f.actor, ...draft.current } });
  assert.equal(result.action, "configuration");
  assert.deepEqual(result.configuration.target, draft.current.target);
});

test("a canceled enclosing form leaves staged overrides, skills and bond out of Actor flags", () => {
  const f = fixture(), before = structuredClone(f.state), draft = f.makeDraft();
  draft.current.override = { action: "save", value: { skillLevel: 13, rof: "3", acc: 5, scopeBonus: 1, bulk: -4, rcl: "2" } };
  draft.selectSkill("id:pistol"); draft.current.weaponBond = true;
  assert.deepEqual(f.state, before);
  assert.equal(f.writes.length, 0);
});

test("a second catalog-only editor Save retains the first staged numerical override", async () => {
  const f = fixture(), draft = f.makeDraft(), events = {};
  const fields = { innerHTML: "", addEventListener: (name, handler) => { events[name] = handler; } };
  const root = { addEventListener: (name, handler) => { events["root:" + name] = handler; },
    querySelector: selector => selector === "[data-weapon-mode-fields]" ? fields : { addEventListener() {} },
    querySelectorAll: () => [] };
  const value = { skillLevel: 13, rof: "10", acc: 9, scopeBonus: 0, bulk: -5, rcl: "2" };
  const results = [{ action: "save", value }, { action: "configuration", configuration: {
    target: pistol, catalogChanged: true, skillBinding: draft.current.skillBinding,
    skillChanged: false, weaponBond: false } }];
  bindWeaponConfiguration(root, draft, async () => results.shift());
  const event = { target: { closest: () => ({ disabled: false }) }, preventDefault() {} };
  await events.click(event);
  await events.click(event);
  const result = await draft.commit({ id: "new" });
  assert.equal(result.state.attackOverrides[getAttackOverrideKey(f.attacks[0])].acc, 9);
  assert.equal(bindings.analyzeMode(f.actor, path).binding.modeId, pistol.modeId);
  assert.deepEqual(f.state.attackOverrides, {});
});

test("base ammunition only includes confirmed compatibility, never variants or undetermined", () => {
  const entries = baseAmmunition(ammunition, ak.modeId, catalogs);
  assert.ok(entries.length);
  assert.equal(entries[0].ammoId, "ht_7_62x39mm");
  assert.ok(entries.every(entry => entry.status === "compatible" && ["ammo-item", "ammo-family"].includes(entry.kind)));
  const fake = { getCompatibleAmmunition: () => ({ ammunition: [{ status: "undetermined", kind: "ammo-item" },
    { status: "compatible", kind: "cartridge-upgrade" }], variants: [{ status: "compatible" }] }) };
  assert.deepEqual(baseAmmunition(fake, ak.modeId, catalogs), []);
});

test("single native base round is proposed and confirmed on Save", async () => {
  const draft = fixture().makeDraft();
  assert.equal(draft.current.ammo.ammoId, "ht_7_62x39mm");
  const result = await draft.commit({ id: "new" });
  assert.equal(result.weapon.ammunitionBinding.confirmed, true);
  assert.equal(result.weapon.ammunitionBinding.modeId, ak.modeId);
});

test("an explicit neutral ammunition choice stays neutral on reopening", async () => {
  const f = fixture(), draft = f.makeDraft();
  draft.selectAmmo("");
  const result = await draft.commit({ id: "new" });
  assert.equal(result.weapon.ammunitionBinding, null);
  const reopened = fixture([row()], result.weapon).makeDraft();
  assert.equal(reopened.current.ammo, null);
  assert.equal(reopened.current.ammoType, "");
});

test("saved custom ammunition and inventory survive reopening and catalog changes", async () => {
  const existing = oldWeapon(), f = fixture([row()], existing), draft = f.makeDraft();
  draft.selectCatalog(pistol);
  const result = await draft.commit({ id: "unused" });
  assert.equal(result.weapon.ammoType, existing.ammoType);
  for (const field of ["totalAmmo", "capacity", "magazines", "loadedIndex"]) assert.deepEqual(result.weapon[field], existing[field]);
});

test("previously confirmed ammunition never gets silently replaced by the new catalog default", async () => {
  const existing = oldWeapon();
  existing.ammunitionBinding = { ammoId: "ht_7_62x39mm", name: "Saved cartridge", kind: "ammo-item", book: "ht", modeId: ak.modeId, confirmed: true };
  const draft = fixture([row()], existing).makeDraft();
  draft.selectCatalog(pistol);
  const result = await draft.commit({ id: "unused" });
  assert.deepEqual(result.weapon.ammunitionBinding, existing.ammunitionBinding);
  assert.equal(result.weapon.ammoType, existing.ammoType);
  assert.match(weaponConfigurationHTML(draft), /Требуется проверка/);
});

test("governing skill follows actual specialty and GGA level without forcing catalog TL", () => {
  const f = fixture();
  const skill = suggestWeaponSkill(f.actor, f.attacks[0], catalogs.getMode(ak.modeId));
  assert.equal(skill.name, "Guns/TL5 (Rifle)"); assert.equal(skill.level, 12);
  assert.equal(f.makeDraft().current.skillBinding.key, "id:rifle");
});

test("saved skill binding and numerical overrides survive automatic matching and Save", async () => {
  const f = fixture([row()], oldWeapon()), key = getRangedGoverningAttackKey(f.attacks[0]);
  f.state.governingSkills[key] = { key: "id:pistol", name: "Guns/TL9 (Pistol)" };
  f.state.attackOverrides[getAttackOverrideKey(f.attacks[0])] = { skillLevel: 17, rof: "3", acc: 8, scopeBonus: 2, bulk: -3, rcl: "1" };
  const draft = f.makeDraft();
  assert.equal(draft.current.skillBinding.key, "id:pistol");
  const result = await draft.commit({ id: "unused" });
  assert.deepEqual(result.state.governingSkills, f.state.governingSkills);
  assert.deepEqual(result.state.attackOverrides, f.state.attackOverrides);
});

test("unresolved old skill identity stays visible and is preserved until explicit replacement", async () => {
  const f = fixture(), key = getRangedGoverningAttackKey(f.attacks[0]);
  f.state.governingSkills[key] = { key: "id:missing", name: "Guns/TL4 (Rifle)" };
  const draft = f.makeDraft();
  assert.match(skillOptionsHTML(f.actor, draft.current.skillBinding), /value="stored" selected/);
  const result = await draft.commit({ id: "new" });
  assert.deepEqual(result.state.governingSkills[key], f.state.governingSkills[key]);
});

test("mode switching restores drafts and saves explicit skills independently per mode", async () => {
  const f = fixture([row(), row(pistol)]), draft = f.makeDraft();
  draft.selectSkill("id:pistol"); draft.current.weaponBond = true;
  draft.selectAttack(f.attacks[1].path); draft.selectSkill("id:rifle");
  draft.selectAttack(path);
  assert.equal(draft.current.skillBinding.key, "id:pistol"); assert.equal(draft.current.weaponBond, true);
  const result = await draft.commit({ id: "new" });
  assert.equal(result.state.governingSkills[getRangedGoverningAttackKey(f.attacks[1])].key, "id:rifle");
});

test("Weapon Bond reuses the existing toggle and is preserved when the perk disappears", async () => {
  const f = fixture([row()], oldWeapon()), draft = f.makeDraft();
  assert.equal(draft.current.weaponBond, true);
  delete f.actor.system.ads.bond;
  const result = await draft.commit({ id: "unused" });
  assert.equal(result.weapon.weaponBond, true);
  assert.equal(result.weapon.weaponBondBonus, undefined);
});

test("new weapons round-trip through AmmoService without fictional magazines or ammunition", async () => {
  const f = fixture(), result = await f.makeDraft().commit({ id: "new" });
  const service = new AmmoService(f.actor);
  await service.saveState(result.state);
  const reopened = await service.loadState(), weapon = reopened.weapons[0];
  assert.deepEqual([weapon.totalAmmo, weapon.capacity, weapon.magazines, weapon.loadedIndex], [0, 0, [], -1]);
  assert.equal(await service.consumeLoadedRounds(reopened, weapon, 1), false);
  assert.deepEqual(weapon.magazines, []);
});

test("form has the requested field order and no ammunition quantity controls", () => {
  const html = weaponConfigurationHTML(fixture().makeDraft());
  const names = ["attackPath", "catalogMode", "ammunition", "governingSkillKey", "weaponBond"];
  assert.deepEqual(names.map(name => html.indexOf(`name="${name}"`)), names.map(name => html.indexOf(`name="${name}"`)).sort((a, b) => a - b));
  assert.doesNotMatch(html, /name="(?:totalAmmo|capacity|magazineCount|fillAvailable|ammoType)"/);
  assert.match(html, /fa-pencil/);
});

test("catalog failure preserves GGA functionality and old ammunition", async () => {
  const f = fixture([row()], oldWeapon()), unavailable = new CatalogService({ logger: null });
  const draft = f.makeDraft({ catalogs: unavailable, bindings: new WeaponCatalogBindingService(unavailable) });
  assert.match(weaponConfigurationHTML(draft), /недоступен/);
  const result = await draft.commit({ id: "unused" });
  assert.equal(result.weapon.ammoType, "Old custom rounds"); assert.equal(f.writes.length, 0);
});

test("reused GGA path with a changed model requires explicit attack choice", () => {
  const f = fixture([row(pistol)], oldWeapon()), draft = f.makeDraft();
  assert.equal(draft.path, ""); assert.equal(draft.current, null);
});

test("legacy references containing only a path still reopen the selected GGA attack", () => {
  const existing = oldWeapon();
  existing.attackRef = { path };
  assert.equal(fixture([row()], existing).makeDraft().path, path);
});

test("changed GCS identity displays the service review status without confirming an automatic replacement", async () => {
  const f = fixture([row(ak, { uuid: "old" })]);
  await bindings.confirm(f.actor, path, ak);
  f.actor.system.ranged["00000"].uuid = "new";
  for (const field of ["damage", "acc", "rof", "rcl", "bulk", "range", "shots", "st"]) f.actor.system.ranged["00000"][field] = "changed";
  const draft = f.makeDraft();
  assert.equal(draft.current.analysis.status, "needs_review"); assert.equal(draft.current.target, null);
  const count = f.writes.length;
  await draft.commit({ id: "new" }); assert.equal(f.writes.length, count);
});

test("RU and EN provide identical keys for every new UI label", async () => {
  const locales = await Promise.all(["en", "ru"].map(async language => JSON.parse(await fs.readFile(new URL("../lang/" + language + ".json", import.meta.url), "utf8"))));
  const keys = locale => Object.keys(locale).filter(key => key.startsWith("OleGURPS.Weapon.")).sort();
  assert.deepEqual(keys(locales[0]), keys(locales[1]));
  assert.ok(keys(locales[0]).length > 30);
});

test("every weapon label has a RU/EN fallback when Foundry cached the old language manifest", async () => {
  for (const lang of ["en", "ru"]) {
    const locale = JSON.parse(await fs.readFile(new URL("../lang/ru.json", import.meta.url), "utf8"));
    for (const [key, value] of Object.entries(locale).filter(([key]) => key.startsWith("OleGURPS.Weapon.")))
      assert.equal(weaponText(key.split(".").at(-1), { game: { i18n: { lang, localize: key => key } } }), value);
  }
});

test("empty editor search shows only ranked candidates and the pinned current model", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => ({ equipmentId: "candidate-" + index, modeId: "candidate-mode-" + index }));
  const result = weaponCatalogSearchState(catalogs, "", pistol, candidates);
  assert.equal(result.options.length, 9);
  assert.equal(result.options[0].modeId, pistol.modeId);
  assert.deepEqual(result.options.slice(1).map(entry => entry.modeId), candidates.slice(0, 8).map(entry => entry.modeId));
  assert.equal(result.total, 0); assert.equal(result.status, ""); assert.equal(result.searching, false);
  assert.deepEqual(weaponCatalogSearchState(catalogs, "", null).options, []);
});

test("full search starts only after two meaningful characters", () => {
  for (const query of ["A", "A!", " .. "]) {
    const result = weaponCatalogSearchState(catalogs, query, ak);
    assert.equal(result.searching, false);
    assert.equal(result.options[0].modeId, ak.modeId);
    assert.equal(result.status, "Введите минимум 2 символа");
  }
  assert.equal(weaponCatalogSearchState(catalogs, "AK", ak).searching, true);
});

test("search filters the entire catalog before the cap and counts actual matches excluding the pinned model", () => {
  const equipment = Array.from({ length: 130 }, (_, index) => ({ equipment_id: "eq" + index, name: "Fixture rifle " + index,
    source: "HT", modes: [{ weapon_mode_id: "mode" + index, role: "attack", combat_type: "ranged" }] }));
  const fake = { getCatalog: () => ({ equipment }), getEquipment: id => equipment.find(entry => entry.equipment_id === id),
    getMode: id => equipment.flatMap(entry => entry.modes).find(entry => entry.weapon_mode_id === id) };
  const result = weaponCatalogSearchState(fake, "fixture", { equipmentId: "eq129", modeId: "mode129" });
  assert.equal(result.total, 130); assert.equal(result.shown, 100);
  assert.equal(result.options.length, 101); assert.equal(result.options[0].modeId, "mode129");
  assert.equal(result.status, "Показано 100 из 130 совпадений");
  const exact = weaponCatalogSearchState(fake, "mode129", null);
  assert.equal(exact.total, 1); assert.equal(exact.options[0].modeId, "mode129");
  assert.equal(exact.status, "Найдено совпадений: 1");
});

test("clearing, replacing and failing a search retain the selected model without altering its binding", () => {
  const target = structuredClone(pistol), original = structuredClone(target);
  for (const query of ["AK-47", "No such fixture model", ""]) {
    const result = weaponCatalogSearchState(catalogs, query, target);
    assert.ok(result.options.some(entry => entry.modeId === target.modeId));
    assert.deepEqual(target, original);
  }
  assert.equal(weaponCatalogSearchState(catalogs, "No such fixture model", target).status, "Совпадений не найдено");
});

test("full search supports case-insensitive explicit caliber, source, usage and equipment ID", () => {
  const fake = { getCatalog: () => ({ equipment: [{ equipment_id: "equipment-AbC", name: "Neutral model", source: "HT",
    modes: [{ weapon_mode_id: "Mode-XYZ", role: "attack", combat_type: "ranged", caliber_hint: "7.62x39mm", usage: "Burst" }] }] }) };
  for (const query of ["NEUTRAL", "7.62\u00d739", "ht", "BURST", "equipment-abc", "mode-xyz"])
    assert.equal(searchWeaponCatalog(fake, query)[0].modeId, "Mode-XYZ");
});

test("editor places the short hint and search status above the selector and contains no Weapon Bond", async () => {
  const f = fixture(); let options;
  const result = await openWeaponAttackEditor({ DialogV2: { wait: async value => { options = value; return { action: "save", values: editorValues }; } },
    attack: f.attacks[0], parseRateOfFire: parser, configuration: { catalogs, actor: f.actor, target: ak,
      weaponBond: false, bondAvailable: true, candidates: [ak] } });
  assert.ok(options.content.indexOf('name="catalogSearch"') < options.content.indexOf("data-search-count"));
  assert.ok(options.content.indexOf("data-search-count") < options.content.indexOf('name="editorCatalogMode"'));
  assert.match(options.content, /placeholder="Название, калибр или ID"/);
  assert.match(options.content, /title="Поиск по названию оружия, калибру, источнику, режиму атаки, equipment_id или weapon_mode_id"/);
  assert.doesNotMatch(options.content, /Weapon Bond|editorBond|weaponBond/);
  assert.equal(Object.hasOwn(result.configuration, "weaponBond"), false);
});

test("Governing Skill is editable only in the main form and absent from the editor result", async () => {
  const f = fixture(), draft = f.makeDraft(); let options;
  const result = await openWeaponAttackEditor({ DialogV2: { wait: async value => {
    options = value; return { action: "save", values: editorValues };
  } }, attack: f.attacks[0], parseRateOfFire: parser,
    configuration: { catalogs, actor: f.actor, ...draft.current } });
  assert.match(weaponConfigurationHTML(draft), /name="governingSkillKey"/);
  assert.doesNotMatch(options.content, /editorSkill|governingSkillKey|<label>Skill/);
  assert.equal(Object.hasOwn(result.configuration, "skillBinding"), false);
  assert.equal(Object.hasOwn(result.configuration, "skillChanged"), false);
});

test("editor catalog Save preserves the main skill choice, including clearing and saved overrides", async () => {
  for (const key of ["id:pistol", ""]) {
    const f = fixture([row()], oldWeapon()), draft = f.makeDraft(), events = {};
    const originalSystem = structuredClone(f.actor.system);
    const attackKey = getRangedGoverningAttackKey(f.attacks[0]);
    f.state.governingSkills[attackKey] = { key: "id:rifle", name: "Guns/TL5 (Rifle)" };
    const override = { skillLevel: 13, rof: "10", acc: 9, scopeBonus: 1, bulk: -5, rcl: "2" };
    f.state.attackOverrides[getAttackOverrideKey(f.attacks[0])] = override;
    const staleBinding = structuredClone(draft.current.skillBinding);
    const fields = { innerHTML: "", addEventListener: (name, handler) => { events[name] = handler; } };
    const root = { addEventListener: (name, handler) => { events["root:" + name] = handler; },
    querySelector: selector => selector === "[data-weapon-mode-fields]" ? fields : { addEventListener() {} },
      querySelectorAll: () => [] };
    bindWeaponConfiguration(root, draft, async () => {
      events.change({ target: { name: "governingSkillKey", value: key, tagName: "SELECT" } });
      return { action: "configuration", configuration: { target: pistol, catalogChanged: true,
        skillBinding: staleBinding, skillChanged: false } };
    });
    await events.click({ target: { closest: () => ({ disabled: false }) }, preventDefault() {} });
    assert.equal(draft.current.skillBinding?.key ?? "", key);
    assert.equal(draft.current.skillChanged, true);
    const result = await draft.commit({ id: "unused" });
    assert.equal(result.state.governingSkills[attackKey]?.key ?? "", key);
    assert.deepEqual(result.state.attackOverrides[getAttackOverrideKey(f.attacks[0])], override);
    assert.deepEqual(f.actor.system, originalSystem);
  }
});

test("editor catalog change leaves the initial main skill suggestion intact", async () => {
  const f = fixture(), draft = f.makeDraft(), events = {};
  const before = structuredClone(draft.current.skillBinding);
  assert.equal(before.key, "id:rifle");
  const fields = { innerHTML: "", addEventListener: (name, handler) => { events[name] = handler; } };
  const root = { addEventListener: (name, handler) => { events["root:" + name] = handler; },
    querySelector: selector => selector === "[data-weapon-mode-fields]" ? fields : { addEventListener() {} },
    querySelectorAll: () => [] };
  bindWeaponConfiguration(root, draft, async () => ({ action: "configuration",
    configuration: { target: pistol, catalogChanged: true } }));
  await events.click({ target: { closest: () => ({ disabled: false }) }, preventDefault() {} });
  assert.equal(draft.current.target.modeId, pistol.modeId);
  assert.deepEqual(draft.current.skillBinding, before);
  assert.equal(draft.current.skillChanged, false);
});

test("an editor Save cannot overwrite a newer Weapon Bond choice in the main form", async () => {
  const f = fixture(), draft = f.makeDraft(), events = {};
  const fields = { innerHTML: "", addEventListener: (name, handler) => { events[name] = handler; } };
  const root = { addEventListener: (name, handler) => { events["root:" + name] = handler; },
    querySelector: selector => selector === "[data-weapon-mode-fields]" ? fields : { addEventListener() {} }, querySelectorAll: () => [] };
  bindWeaponConfiguration(root, draft, async () => {
    draft.current.weaponBond = true;
    return { action: "configuration", configuration: { target: ak, catalogChanged: false,
      skillBinding: draft.current.skillBinding, skillChanged: false, weaponBond: false } };
  });
  await events.click({ target: { closest: () => ({ disabled: false }) }, preventDefault() {} });
  assert.equal(draft.current.weaponBond, true);
  assert.equal((await draft.commit({ id: "new" })).weapon.weaponBond, true);
});

test("the real 7.62x39 cartridge/family pair yields one concrete base option", () => {
  const raw = ammunition.getCompatibleAmmunition(ak.modeId).ammunition;
  assert.deepEqual(raw.map(entry => [entry.ammoId, entry.kind]), [["ht_7_62x39mm", "ammo-item"], ["ht_7_62x39mm", "ammo-family"]]);
  const result = baseAmmunition(ammunition, ak.modeId, catalogs);
  assert.equal(result.length, 1); assert.equal(result[0].kind, "ammo-item");
  assert.equal(result[0].ammoId, "ht_7_62x39mm");
});

test("dedup prefers and preserves a saved family binding without converting it to the cartridge", async () => {
  const existing = oldWeapon();
  existing.ammunitionBinding = { ammoId: "ht_7_62x39mm", kind: "ammo-family", book: "ht", name: "Saved family", modeId: ak.modeId, confirmed: true };
  const draft = fixture([row()], existing).makeDraft(), html = weaponConfigurationHTML(draft);
  const choices = baseAmmunition(ammunition, ak.modeId, catalogs, existing.ammunitionBinding);
  assert.equal(choices.length, 1); assert.equal(choices[0].kind, "ammo-family");
  assert.match(html, /value="ht:ammo-family:ht_7_62x39mm"[^>]*selected/);
  const result = await draft.commit({ id: "unused" });
  assert.deepEqual(result.weapon.ammunitionBinding, existing.ammunitionBinding);
  assert.equal(result.weapon.ammoType, existing.ammoType);
});

const mockAmmunition = entries => ({ getCompatibleAmmunition: () => ({ ammunition: entries, variants: [], undetermined: [] }) });
const ammoEntry = (id, fields = {}, kind = "ammo-item") => ({ ammoId: id, kind, book: "ht", status: "compatible",
  record: { id, name: "Same cartridge", ...fields } });

test("identical semantic cartridge records with different internal/source IDs collapse, preferring a saved ID", () => {
  const first = ammoEntry("first", { ammunition_class: "small_arms_cartridge", ammunition_construction: "fixed_cased", source_equipment_id: "source-one" });
  const second = ammoEntry("second", { ammunition_class: "small_arms_cartridge", ammunition_construction: "fixed_cased", source_equipment_id: "source-two" });
  const preferred = { ammoId: "second", kind: "ammo-item", book: "ht" };
  const result = baseAmmunition(mockAmmunition([first, second]), ak.modeId, catalogs, preferred);
  assert.equal(result.length, 1); assert.equal(result[0].ammoId, "second");
  assert.equal(result[0].record.source_equipment_id, "source-two");
});

test("same-name cartridges with different construction remain distinct with informative labels", () => {
  const result = baseAmmunition(mockAmmunition([ammoEntry("fixed", { ammunition_construction: "fixed_cased" }),
    ammoEntry("caseless", { ammunition_construction: "caseless" })]), ak.modeId, catalogs);
  assert.equal(result.length, 2);
  assert.match(result[0].label, /fixed_cased/); assert.match(result[1].label, /caseless/);
  assert.notEqual(result[0].choiceKey, result[1].choiceKey);
  const families = baseAmmunition(mockAmmunition([ammoEntry("family-one", { ammunition_construction: "fixed_cased", ammo_family_id: "family-a" }),
    ammoEntry("family-two", { ammunition_construction: "fixed_cased", ammo_family_id: "family-b" })]), ak.modeId, catalogs);
  assert.equal(families.length, 2);
  assert.match(families[0].label, /family-a/); assert.match(families[1].label, /family-b/);
});

test("same-name records without equivalence evidence stay distinct and display their IDs", () => {
  const result = baseAmmunition(mockAmmunition([ammoEntry("unknown-one"), ammoEntry("unknown-two")]), ak.modeId, catalogs);
  assert.equal(result.length, 2);
  assert.ok(result.every(entry => entry.label.includes(entry.ammoId)));
});

test("a family with multiple members is not collapsed into one compatible cartridge", () => {
  const family = ammoEntry("family", { ammo_item_ids: ["round", "unconfirmed-round"] }, "ammo-family");
  const round = ammoEntry("round", { ammo_family_id: "family" });
  const unavailable = { ...ammoEntry("unconfirmed-round"), status: "undetermined" };
  const result = baseAmmunition(mockAmmunition([family, round, unavailable]), ak.modeId, catalogs);
  assert.equal(result.length, 2);
  assert.ok(result.some(entry => entry.kind === "ammo-family"));
  assert.ok(!result.some(entry => entry.ammoId === "unconfirmed-round"));
  assert.notEqual(result[0].label, result[1].label);
});

test("composite ammunition choice selects the exact kind/book and retains its persisted ID", () => {
  const f = fixture(), family = ammoEntry("shared", { ammo_item_ids: ["shared", "other"] }, "ammo-family");
  const round = ammoEntry("shared", { ammo_family_id: "shared", ammunition_construction: "fixed_cased" });
  const draft = f.makeDraft({ ammunition: mockAmmunition([round, family]) });
  draft.selectAmmo(ammunitionChoiceKey(family));
  assert.equal(draft.current.ammo.kind, "ammo-family"); assert.equal(draft.current.ammo.ammoId, "shared");
});
