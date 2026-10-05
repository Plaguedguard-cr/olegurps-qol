import test from "node:test";
import assert from "node:assert/strict";
import { getFireSkillPreview, get3d6SuccessProbability, getProbabilityColor, skillProbabilityColor } from "../scripts/tools/fire-skill-preview.js";
import { addRollConfirmationProbability, registerRollConfirmationProbability, ROLL_CONFIRMATION_PROBABILITY_SETTING } from "../scripts/tools/roll-confirmation-probability.js";

function confirmation(originalValue, effectiveValue, rollType = "Skill") {
  const original = { textContent: String(originalValue) };
  const total = { textContent: String(effectiveValue), style: { color: "rgb(74, 190, 105)" } };
  let probability = null;
  const type = {
    textContent: rollType,
    style: { color: "original" },
    insertAdjacentElement(position, node) {
      assert.equal(position, "afterend");
      probability = node;
    }
  };
  const section = {
    querySelector(selector) {
      if (selector === "#cr-target") return original;
      if (selector === "#cr-total") return total;
      if (selector === ".cr-result-type") return type;
      if (selector === ".gam-roll-probability") return probability;
      return null;
    }
  };
  const classes = new Set();
  const root = {
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name)
    },
    ownerDocument: {
      defaultView: { getComputedStyle: node => ({ color: node.style.color }) },
      createElement: () => ({
        style: {},
        remove() { probability = null; }
      })
    },
    querySelector: selector => selector === ".cr-container .cr-result-section" ? section : null
  };
  return { root, original, total, type, get probability() { return probability; } };
}

test("shared 3d6 probability has automatic 3/4 success and 17/18 failure", () => {
  const expected = new Map([
    [6, "9,3"], [9, "37,5"], [10, "50,0"], [12, "74,1"],
    [13, "83,8"], [15, "95,4"], [16, "98,1"], [20, "98,1"]
  ]);
  for (const [target, chance] of expected) {
    assert.equal(getFireSkillPreview(target).chance, chance, String(target));
    assert.equal(get3d6SuccessProbability(target).toFixed(1).replace(".", ","), chance);
  }
  assert.equal(getFireSkillPreview(3).chance, "1,9");
  assert.equal(getFireSkillPreview(4).chance, "1,9");
});

test("all native success-roll labels show the effective target probability", () => {
  for (const type of ["Skill", "Strength", "Dexterity", "Intelligence",
    "Health", "Will", "Perception", "Control Roll"]) {
    const dialog = confirmation(13, 9, type);
    addRollConfirmationProbability(null, dialog.root);
    assert.equal(dialog.probability?.textContent, "37,5%", type);
    assert.equal(dialog.type.textContent, type);
  }
});

test("modifier changes recalculate from the center total, including zero modifier", () => {
  const skill = confirmation(13, 9, "Skill");
  addRollConfirmationProbability(null, skill.root);
  assert.equal(skill.probability.textContent, "37,5%");
  assert.equal(skill.probability.style.color, skill.total.style.color);
  assert.equal(skill.total.style.color, "rgb(74, 190, 105)");
  assert.equal(skill.type.style.color, "original");
  skill.total.textContent = "10";
  skill.total.style.color = "rgb(204, 102, 0)";
  addRollConfirmationProbability(null, skill.root);
  assert.equal(skill.probability.textContent, "50,0%");
  assert.equal(skill.probability.style.color, skill.total.style.color);

  const strength = confirmation(10, 10, "Strength");
  addRollConfirmationProbability(null, strength.root);
  assert.equal(strength.probability?.textContent, "50,0%");
});

test("non-targeted and invalid center values have no probability line", () => {
  for (const [original, effective] of [[-1, 9], [0, 9], [10, "NaN"],
    [10, "undefined"], [10, "9d6"], [10, ""]]) {
    const dialog = confirmation(original, effective);
    addRollConfirmationProbability(null, dialog.root);
    assert.equal(dialog.probability, null);
  }
  const damage = { querySelector: () => null };
  assert.doesNotThrow(() => addRollConfirmationProbability(null, damage));
});


test("shared probability color changes smoothly through muted red, amber, and green", () => {
  const expected = new Map([
    [5, "rgb(154, 60, 52)"],
    [25, "rgb(180, 102, 46)"],
    [50, "rgb(212, 154, 38)"],
    [75, "rgb(126, 136, 54)"],
    [95, "rgb(57, 122, 67)"]
  ]);
  for (const [percent, color] of expected) {
    assert.equal(getProbabilityColor(percent), color);
    assert.equal(skillProbabilityColor(percent), color);
  }
  assert.equal(getProbabilityColor(0), "rgb(148, 50, 54)");
  assert.equal(getProbabilityColor(100), "rgb(40, 118, 70)");
  assert.equal(getProbabilityColor(Number.NaN), "inherit");
});

test("module setting is visible and scoped to each Foundry client", () => {
  const oldGame = globalThis.game;
  const oldHooks = globalThis.Hooks;
  let registered = null;
  let hook = null;
  try {
    globalThis.game = { settings: {
      register: (module, key, config) => { registered = { module, key, config }; }
    } };
    globalThis.Hooks = { on: (name, callback) => { hook = { name, callback }; } };
    registerRollConfirmationProbability();
    assert.equal(registered.module, "olegurps-qol");
    assert.equal(registered.key, ROLL_CONFIRMATION_PROBABILITY_SETTING);
    assert.equal(registered.config.scope, "client");
    assert.equal(registered.config.config, true);
    assert.equal(registered.config.type, Boolean);
    assert.equal(registered.config.default, true);
    assert.match(registered.config.name, /Roll Confirmation/);
    assert.match(registered.config.hint, /3d6/);
    assert.equal(hook.name, "renderDialogV2");
    assert.equal(hook.callback, addRollConfirmationProbability);
  } finally {
    globalThis.game = oldGame;
    globalThis.Hooks = oldHooks;
  }
});

test("one client's OFF choice hides the line without changing another client's ON choice", () => {
  const oldGame = globalThis.game;
  const preferences = { A: true, B: false };
  let currentClient = "A";
  try {
    globalThis.game = { settings: {
      get: (module, key) => {
        assert.equal(module, "olegurps-qol");
        assert.equal(key, ROLL_CONFIRMATION_PROBABILITY_SETTING);
        return preferences[currentClient];
      }
    } };
    const clientA = confirmation(13, 9);
    addRollConfirmationProbability(null, clientA.root);
    assert.equal(clientA.probability?.textContent, "37,5%");
    assert.equal(clientA.root.classList.contains("gam-roll-confirmation"), true);

    currentClient = "B";
    const clientB = confirmation(13, 9);
    addRollConfirmationProbability(null, clientB.root);
    assert.equal(clientB.probability, null);
    assert.equal(clientB.root.classList.contains("gam-roll-confirmation"), false);

    currentClient = "A";
    const nextA = confirmation(10, 10, "Strength");
    addRollConfirmationProbability(null, nextA.root);
    assert.equal(nextA.probability?.textContent, "50,0%");

    currentClient = "B";
    preferences.B = true;
    const nextB = confirmation(10, 10, "Strength");
    addRollConfirmationProbability(null, nextB.root);
    assert.equal(nextB.probability?.textContent, "50,0%");
  } finally {
    globalThis.game = oldGame;
  }
});


test("percentage copies each native result color without recoloring the result or type", () => {
  for (const [effective, color] of [
    [6, "rgb(179, 0, 0)"],
    [10, "rgb(204, 102, 0)"],
    [14, "rgb(92, 189, 88)"]
  ]) {
    const dialog = confirmation(14, effective);
    dialog.total.style.color = color;
    addRollConfirmationProbability(null, dialog.root);
    assert.equal(dialog.probability?.style.color, color);
    assert.equal(dialog.total.style.color, color);
    assert.equal(dialog.type.style.color, "original");
  }
});
