import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { magazineFill, migrateAmmoInventory, applyInventoryOperation } from "../scripts/tools/ammo-inventory.js";
import { ammoWindowText, ammoDisplayName } from "../scripts/tools/ammo-management-localization.js";
import { escapeWeaponHTML } from "../scripts/tools/weapon-configuration.js";
import { bindingForGoverningSkill, listRangedGoverningSkills } from "../scripts/tools/ranged-governing-skill-service.js";

globalThis.foundry = { utils: { deepClone: structuredClone }, applications: { api: { ApplicationV2: class {} } } };
globalThis.game = { i18n: { lang: "ru", localize: key => key } };
const { FirePreparationApp } = await import("../scripts/tools/fire-preparation-app.js");
const { ammoManagementHTML } = await import("../scripts/tools/ammo-management-app.js");

// Exercise the manager's actual nested renderer without opening an Application in Node.
const source = readFileSync(new URL("../scripts/tools/ammo.js", import.meta.url), "utf8");
const body = source.match(/  function renderMagazineBadges\(weapon\) \{[\s\S]*?\n  \}/)[0];
const renderBadges = new Function("escapeHTML", "ammoWindowText", "magazineFill", "ammoDisplayName", body + "; return renderMagazineBadges;")(
  escapeWeaponHTML, ammoWindowText, magazineFill, ammoDisplayName);

test("each selectable magazine reflects its own rounds, capacity, smooth fill and ammunition tooltip", () => {
  const weapon = { id: "weapon", magazines: [30, 15, 1, 0, 20], loadedIndex: 2, capacity: 30, ammoType: "fallback",
    ammunitionInventory: { magazines: [30, 30, 30, 30, 40].map(capacity => ({ capacity, ammoKey: "a" })),
      stocks: [{ key: "a", type: { source: "catalog", name: '7.62 "A"' } }] } };
  const before = structuredClone(weapon);
  const html = renderBadges(weapon);
  const buttons = [...html.matchAll(/<button[\s\S]*?<\/button>/g)].map(match => match[0]);
  assert.equal(buttons.length, 5);
  for (const [index, rounds] of weapon.magazines.entries()) {
    const capacity = weapon.ammunitionInventory.magazines[index].capacity;
    const fill = magazineFill(rounds, capacity);
    assert.ok(buttons[index].includes(`--gam-mag-fill:${fill.percent}%;--gam-mag-hue:${fill.hue}`));
    assert.ok(buttons[index].includes(`${index + 1}: ${rounds}/${capacity}`));
    assert.ok(buttons[index].includes(`data-magazine-index="${index}"`));
    assert.ok(buttons[index].includes(`aria-pressed="${index === 2}"`));
    assert.ok(buttons[index].includes('data-ammo-action="select-magazine"'));
    assert.ok(buttons[index].includes(`title="${rounds ? '7.62 &quot;A&quot;' : ammoWindowText("Empty")}"`));
  }
  assert.ok(buttons[3].includes('--gam-mag-fill:0%'));
  assert.deepEqual(weapon, before);
  assert.equal(renderBadges({ ...weapon, magazines: [] }), "");
});

test("Fire Control hides retired labels while retaining magazine selection and saved contents", () => {
  const weapon = { id: "weapon", magazines: [20], loadedIndex: 0, capacity: 30,
    ammunitionInventory: { magazines: [{ capacity: 30, ammoKey: "archived" }],
      stocks: [{ key: "archived", type: { source: "test", name: "Test Cartridge (Temporary)" }, rounds: 7 }] } };
  const before = structuredClone(weapon), html = renderBadges(weapon);
  assert.ok(html.includes(`title="${ammoWindowText("Stored")}"`));
  assert.doesNotMatch(html, /Test Cartridge|Тестовый патрон/);
  assert.ok(html.includes('data-ammo-action="select-magazine"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes("1: 20/30"));
  assert.deepEqual(weapon, before);
});

test("skill summary follows actual selected mode and leaves effective skill and probability intact", () => {
  const actor = { system: { skills: {
    rifle: { name: "Guns/TL9 (Rifle)", uuid: "rifle", level: 13 },
    pistol: { name: "Guns/TL9 (Pistol)", uuid: "pistol", level: 14 }
  } } };
  const app = Object.create(FirePreparationApp.prototype);
  const skills = listRangedGoverningSkills(actor);
  Object.assign(app, { mode: "weapon", actor, attack: { level: 13, governingSkillBinding: bindingForGoverningSkill(skills[0]) },
    calculateEffectiveSkill: () => 13, getShotOptions: () => ({}), targetingService: {} });
  const preview = app._getSkillPreview();
  for (const language of ["ru", "en"]) {
    game.i18n.lang = language;
    const prefix = language === "ru" ? "\u041d\u0430\u0432\u044b\u043a" : "Skill";
    assert.equal(app._getSourceSkillText(language), prefix + ": Guns/TL9 (Rifle) \u2014 13");
    app.attack.governingSkillBinding = bindingForGoverningSkill(skills[1]);
    assert.equal(app._getSourceSkillText(language), prefix + ": Guns/TL9 (Pistol) \u2014 14");
    assert.deepEqual(app._getSkillPreview(), preview);
    app.attack.governingSkillBinding = bindingForGoverningSkill(skills[0]);
  }
  assert.equal(preview.level, "13");
  assert.equal(preview.chance, "83,8");
});

test("RU/EN magazine details separate parameters from controls for empty and full magazines", () => {
  const weapon = { id: "weapon", name: "Long weapon name ".repeat(12), ammoUnconfigured: true, magazines: [], capacity: 0, totalAmmo: 0, loadedIndex: -1 };
  let sequence = 0;
  const context = { makeId: () => String(++sequence), allowedTypes: [{ key: "a", source: "legacy", name: "Long ammunition name ".repeat(8) }] };
  migrateAmmoInventory(weapon, context.makeId);
  applyInventoryOperation(weapon, "add-stock", { ammoKey: "a", amount: 30 }, context);
  applyInventoryOperation(weapon, "add-magazines", { capacity: 30, amount: 2 }, context);
  const fullId = weapon.ammunitionInventory.magazines[1].id;
  applyInventoryOperation(weapon, "load", { magazineId: fullId, ammoKey: "a", amount: 30 }, context);
  const [empty, full] = weapon.ammunitionInventory.magazines;
  const before = structuredClone(weapon);
  for (const language of ["ru", "en"]) for (const magazine of [empty, full]) {
    const html = ammoManagementHTML(weapon, { language, magazineId: magazine.id }, []);
    const parameters = html.match(/<div class="gam-inventory-parameters">([\s\S]*?)<\/div>/)[1];
    assert.ok(parameters.includes(ammoWindowText("Capacity", language) + ": 30"));
    assert.ok(parameters.includes(ammoWindowText("Ammo", language)));
    assert.doesNotMatch(parameters, /data-inventory-action|magazineQuantity/);
    assert.match(html, /class="gam-inventory-controls"/);
    assert.ok(html.includes(`aria-valuenow="${magazine.rounds}"`));
    assert.doesNotMatch(html, /data-inventory-action="(?:install|eject)"|inventoryTestMode/);
  }
  assert.deepEqual(weapon, before);
});
