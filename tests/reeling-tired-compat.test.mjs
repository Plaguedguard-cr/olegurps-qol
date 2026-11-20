import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectiveReelingTiredState,
  installReelingTiredCompatibility,
  registerReelingTiredSetting
} from "../scripts/tools/reeling-tired-compat.js";
import { readActorStrength, resolveStrengthDamage } from "../scripts/tools/strength-service.js";
import { prepareEffectiveMeleeDamage } from "../scripts/tools/melee-service.js";

let enabled = true;
let registered;
globalThis.game = {
  system: { id: "gurps" },
  settings: {
    register: (_module, _key, data) => { registered = data; },
    get: () => enabled
  },
  actors: { contents: [] }
};
globalThis.canvas = { tokens: { placeables: [] } };

class FakeEffect {
  static applyChange(actor, change) {
    if (change.key === "system.attributes.ST.import" && change.type === "multiply") {
      actor.system.attributes.ST.import *= Number(change.value);
      if (actor.roundEffectImport) actor.system.attributes.ST.import = Math.floor(actor.system.attributes.ST.import);
    }
    if (change.key === "system.attributes.ST.import" && change.type === "add") {
      actor.system.attributes.ST.import += Number(change.value);
    }
    if (change.key === "system.conditions.reeling") actor.system.conditions.reeling = true;
    if (change.key === "system.conditions.exhausted") actor.system.conditions.exhausted = true;
    return {};
  }
}

class FakeGgaActor {
  constructor() {
    this._source = {
      system: {
        HP: { value: 11, max: 11 },
        FP: { value: 10, max: 10 },
        attributes: { ST: { import: 11 } }
      }
    };
    this.effects = [];
    this.calls = 0;
    this.includeEffectRef = true;
    this.prepareData();
  }

  get appliedEffects() { return this.effects; }

  prepareData() {
    this.system = structuredClone(this._source.system);
    this.system.conditions = { reeling: false, exhausted: false };
    this.system.encumbrance = {
      "00000": { level: 0, current: true },
      "00001": { level: 1, current: false }
    };
    for (const effect of this.effects) {
      for (const change of effect.changes) {
        CONFIG.ActiveEffect.documentClass.applyChange(this, {
          ...change, ...(this.includeEffectRef ? { effect } : {})
        });
      }
    }
    this.calculateDerivedValues();
  }

  calculateDerivedValues() {
    this.calls++;
    const data = this.system;
    data.attributes.ST.value = Math.trunc(data.attributes.ST.import) + (this.itemStrengthBonus ?? 0);
    data.basiclift = data.attributes.ST.value ** 2 / 5;
    data.damage = data.attributes.ST.value;
    let move = 5;
    let dodge = 8;
    if (data.conditions.reeling) {
      move = Math.ceil(move / 2);
      dodge = Math.ceil(dodge / 2);
    }
    if (data.conditions.exhausted) {
      move = Math.ceil(move / 2);
      dodge = Math.ceil(dodge / 2);
    }
    for (const enc of Object.values(data.encumbrance)) {
      enc.currentmove = Math.max(1, Math.floor(move * (1 - enc.level * 0.2)));
      enc.currentdodge = Math.max(1, dodge - enc.level);
      if (enc.current) {
        data.currentmove = enc.currentmove;
        data.currentdodge = enc.currentdodge;
      }
    }
  }

  render() {}
}

globalThis.CONFIG = {
  Actor: { documentClass: FakeGgaActor },
  ActiveEffect: { documentClass: FakeEffect }
};

const status = id => ({
  statuses: new Set([id]),
  disabled: false,
  active: true,
  changes: id === "reeling"
    ? [{ key: "system.conditions.reeling", type: "override", value: true }]
    : [
      { key: "system.conditions.exhausted", type: "override", value: true },
      { key: "system.attributes.ST.import", type: "multiply", value: 0.5 }
    ]
});
const values = actor => ({
  move: actor.system.currentmove,
  dodge: actor.system.currentdodge,
  ST: actor.system.attributes.ST.value
});

registerReelingTiredSetting();
installReelingTiredCompatibility();

test("client setting is enabled by default", () => {
  assert.equal(registered.scope, "client");
  assert.equal(registered.type, Boolean);
  assert.equal(registered.default, true);
});

test("resource thresholds use GGA's single derived calculation", () => {
  const actor = new FakeGgaActor();
  assert.deepEqual(values(actor), { move: 5, dodge: 8, ST: 11 });
  assert.equal(actor.calls, 1);

  actor._source.system.HP.value = 3;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 11 });
  assert.equal(actor.system.encumbrance["00001"].currentmove, 2);
  assert.equal(actor.system.encumbrance["00001"].currentdodge, 3);
  assert.equal(actor.effects.length, 0);

  actor._source.system.HP.value = 11;
  actor._source.system.FP.value = 3;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 6 });
  assert.equal(actor.system.basiclift, 121 / 5);
  assert.equal(actor.system.damage, 11);
  assert.equal(actor.system.attributes.ST.import, 11);

  actor._source.system.HP.value = 3;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 2, dodge: 2, ST: 6 });
  assert.equal(actor.system.encumbrance["00001"].currentmove, 1);
  assert.equal(actor.system.encumbrance["00001"].currentdodge, 1);

  actor._source.system.HP.value = 11;
  actor._source.system.FP.value = 10;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 5, dodge: 8, ST: 11 });
  assert.equal(actor._source.system.attributes.ST.import, 11);
  assert.equal(actor.calls, 5);
});

test("manual GGA statuses work independently and never stack twice with thresholds", () => {
  const actor = new FakeGgaActor();
  actor.effects = [status("reeling")];
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 11 });

  actor.effects = [status("exhausted")];
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 6 });
  assert.equal(actor.system.attributes.ST.import, 11);
  assert.equal(actor.system.basiclift, 121 / 5);

  actor.effects = [status("reeling"), status("exhausted")];
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 2, dodge: 2, ST: 6 });
  actor._source.system.HP.value = 3;
  actor._source.system.FP.value = 3;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 2, dodge: 2, ST: 6 });
  assert.deepEqual(getEffectiveReelingTiredState(actor), {
    reeling: true, tired: true, tiredStatus: true
  });

  actor.effects = [];
  actor._source.system.HP.value = 11;
  actor._source.system.FP.value = 10;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 5, dodge: 8, ST: 11 });
});

test("fallback removes pre-applied GGA ST multiplier and repeat installation is idempotent", () => {
  const actor = new FakeGgaActor();
  actor.includeEffectRef = false;
  actor.effects = [status("exhausted")];
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 6 });
  assert.equal(actor.system.attributes.ST.import, 11);
  installReelingTiredCompatibility();
  const before = actor.calls;
  actor.prepareData();
  assert.equal(actor.calls, before + 1);
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 6 });

  actor.roundEffectImport = true;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 3, dodge: 4, ST: 6 });
  assert.equal(actor.system.attributes.ST.import, 11);
});

test("OFF delegates without changing GGA state or effects", () => {
  const actor = new FakeGgaActor();
  actor._source.system.HP.value = 3;
  enabled = false;
  actor.prepareData();
  assert.deepEqual(values(actor), { move: 5, dodge: 8, ST: 11 });
  assert.equal(actor.system.conditions.reeling, false);
  actor.effects = [status("exhausted")];
  actor.prepareData();
  assert.equal(actor.system.attributes.ST.import, 5.5);
  assert.equal(actor.effects.length, 1);
  enabled = true;
});

for (const [st, thrust, swing] of [[12, "1d-1", "1d+2"], [13, "1d", "2d-1"]]) {
  test(`B426 preserves exact ST ${st} damage at the threshold, exhaustion and recovery`, () => {
    const actor = new FakeGgaActor();
    Object.assign(actor._source.system, { FP: { value: 12, max: 12 }, thrust, swing });
    actor._source.system.attributes.ST.import = st;
    for (const fp of [12, 4, 3, 0, -1, 12]) {
      actor._source.system.FP.value = fp;
      actor.effects = fp < 4 ? [status("exhausted")] : [];
      actor.prepareData();
      const source = structuredClone(actor._source);
      const state = readActorStrength(actor);
      assert.equal(state.kinds.st.effective, fp < 4 ? Math.ceil(st / 2) : st);
      assert.equal(state.derivedST.effective, st);
      assert.equal(resolveStrengthDamage(actor, "thrust").baseFormula, thrust);
      assert.equal(resolveStrengthDamage(actor, "swing").baseFormula, swing);
      assert.deepEqual(actor._source, source);
    }
  });
}

test("B426 retains live ST changes, other active effects and distinct local/advantage modifiers", () => {
  const actor = new FakeGgaActor();
  const effect = { ...status("other"), changes: [{ key: "system.attributes.ST.import", type: "add", value: 3 }] };
  actor.effects = [effect, status("exhausted")];
  Object.assign(actor._source.system, { FP: { value: 3, max: 12 }, thrust: "1d", swing: "2d-1", ads: {
    striking: { name: "Striking ST", level: 2, itemid: "striking" },
    lifting: { name: "Lifting ST", level: 4 },
    arm: { name: "Arm ST", level: 1 }
  }});
  actor._source.system.attributes.ST.import = 13;
  actor.itemStrengthBonus = 2;
  actor.items = { contents: [{ id: "striking", type: "advantage", system: { bonuses: "[ST+2]" } }] };
  actor.getFlag = () => ({ modifiers: { st: -1, striking: 1, lifting: 3, arm: 2 } });
  actor.prepareData();
  assert.equal(values(actor).ST, 9);
  assert.equal(actor.system.attributes.ST.import, 16);
  assert.equal(readActorStrength(actor).derivedST.lifting, 22);
  assert.equal(resolveStrengthDamage(actor, "thrust").effectiveST, 18);
  assert.equal(resolveStrengthDamage(actor, "swing", { applyArmST: true }).effectiveST, 21);
  assert.equal(resolveStrengthDamage(actor, "swing", { applyArmST: true, maximumST: 20 }).effectiveST, 20);

  Object.assign(actor._source.system, { thrust: "1d+1", swing: "2d+1" });
  actor._source.system.attributes.ST.import = 15;
  actor.effects.reverse();
  actor.prepareData();
  assert.equal(values(actor).ST, 10);
  assert.equal(resolveStrengthDamage(actor, "thrust").effectiveST, 20);
  assert.equal(resolveStrengthDamage(actor, "swing", { applyArmST: true }).effectiveST, 23);
});

test("B426 imported alternative thrust and fixed weapon damage survive exhaustion", async () => {
  const actor = new FakeGgaActor();
  Object.assign(actor._source.system, { FP: { value: 3, max: 12 }, thrust: "2d", swing: "2d+2" });
  actor._source.system.attributes.ST.import = 13;
  actor.effects = [status("exhausted")];
  actor.prepareData();
  assert.equal(resolveStrengthDamage(actor, "thrust").baseFormula, "2d");
  assert.equal(resolveStrengthDamage(actor, "thrust").strengthKind, "gga-imported-damage");

  const attack = { name: "Fixed", damage: "2d+3 cr", damageAction: { type: "damage", formula: "2d+3", damagetype: "cr" } };
  const damage = await prepareEffectiveMeleeDamage({ actor, attack });
  assert.equal(damage.formula, "2d+3 cr");
});
