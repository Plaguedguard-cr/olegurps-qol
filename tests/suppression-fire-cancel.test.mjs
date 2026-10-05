import test from "node:test";
import assert from "node:assert/strict";
import { SuppressionFireSessionService } from "../scripts/tools/suppression-fire-session-service.js";

function fixture() {
  let nextId = 0;
  let sessions;
  const ammo = { loaded: 40, total: 40 };
  const document = {
    id: "source",
    getFlag: (_scope, key) => key === "suppressionFireSessions" ? structuredClone(sessions) : null,
    async setFlag(_scope, key, value) {
      if (key === "suppressionFireSessions") sessions = structuredClone(value);
    },
    async unsetFlag(_scope, key) {
      if (key === "suppressionFireSessions") sessions = undefined;
    }
  };
  const scene = {
    id: "scene",
    regions: { contents: [] },
    async deleteEmbeddedDocuments(type, ids) {
      assert.equal(type, "Region");
      this.regions.contents = this.regions.contents.filter(region => !ids.includes(region.id));
    },
    async updateEmbeddedDocuments() {}
  };
  const runtime = {
    canvas: { scene }, game: { user: { id: "user" } },
    foundry: { utils: { randomID: () => `session-${++nextId}` } }
  };
  const token = { id: "source", document };
  const actor = { id: "actor" };
  const weapon = { id: "weapon" };
  const attack = { name: "Gun" };
  const makeService = () => new SuppressionFireSessionService({
    token, actor, weapon, attack, runtime
  });
  const addPair = (service, zoneIndex = 0) => {
    for (const role of ["target", "corridor"]) {
      scene.regions.contents.push({
        id: `${role}-${zoneIndex}-${service.session.sessionId}`,
        flags: { "olegurps-qol": {
          type: "suppressionFire", sessionId: service.session.sessionId,
          sourceTokenId: "source", actorId: "actor", weaponKey: "weapon",
          regionRole: role, zoneIndex, state: "draft"
        } }
      });
    }
  };
  return { ammo, document, scene, runtime, makeService, addPair, get sessions() { return sessions; } };
}

test("Cancel removes an unfired Zones session and both Region roles without spending ammo", async () => {
  const fx = fixture();
  const service = fx.makeService();
  await service.ensureSession();
  await service.resizeDraftZones(2);
  fx.addPair(service, 0);
  fx.addPair(service, 1);
  fx.scene.regions.contents.push({ id: "unrelated", flags: { "olegurps-qol": {
    type: "suppressionFire", sessionId: "other", sourceTokenId: "other"
  } } });
  assert.equal(service.canCancelUnfired, true);
  assert.equal(await service.cancelUnfired(), true);
  assert.equal(service.session, null);
  assert.equal(fx.sessions, undefined);
  assert.deepEqual(fx.scene.regions.contents.map(region => region.id), ["unrelated"]);
  assert.deepEqual(fx.ammo, { loaded: 40, total: 40 });
  const reopened = fx.makeService();
  assert.equal(reopened.findExisting(), null);
  const fresh = await reopened.ensureSession();
  assert.equal(fresh.sessionId, "session-2");
  assert.equal(fresh.zoneCount, 1);
});

test("Cancel stays unavailable after ammo was spent and manual mode ended", async () => {
  const fx = fixture();
  const service = fx.makeService();
  await service.ensureSession();
  fx.addPair(service);
  await service.activateManual({ zoneShots: [5] });
  fx.ammo.loaded -= 5;
  fx.ammo.total -= 5;
  await service.markAmmoConsumed();
  assert.equal(service.canCancelUnfired, false);
  assert.equal(await service.cancelUnfired(), false);
  await service.finishManual();
  assert.equal(service.session.state, "draft");
  assert.equal(service.session.ammoEverSpent, true);
  assert.equal(service.canCancelUnfired, false);
  assert.equal(await service.cancelUnfired(), false);
  assert.deepEqual(fx.ammo, { loaded: 35, total: 35 });
  assert.equal(fx.scene.regions.contents.length, 2);
  assert.ok(fx.sessions[service.session.sessionId]);
  const reopened = fx.makeService();
  await reopened.loadExisting();
  assert.equal(reopened.canCancelUnfired, false);
});
test("Automatic activation blocks cancellation before and after ammo is spent", async () => {
  const fx = fixture();
  fx.runtime.game.combat = { id: "combat", sceneId: "scene", round: 1, turn: 0,
    combatants: [{ id: "combatant", tokenId: "source" }] };
  const service = fx.makeService();
  await service.ensureSession();
  await service.activateAutomatic({ zoneShots: [5] });
  assert.equal(service.canCancelUnfired, false);
  assert.equal(await service.cancelUnfired(), false);
  assert.deepEqual(fx.ammo, { loaded: 40, total: 40 });
  fx.ammo.loaded -= 5;
  fx.ammo.total -= 5;
  await service.markAmmoConsumed();
  assert.equal(await service.cancelUnfired(), false);
  assert.deepEqual(fx.ammo, { loaded: 35, total: 35 });
});

test("Cancel button clears selection and closes without recreating a draft", async () => {
  globalThis.foundry = { applications: { api: { ApplicationV2: class {
    async close() { this.baseClosed = true; }
  } } } };
  const { SuppressionFireApp } = await import("../scripts/tools/suppression-fire-app.js");
  const fx = fixture();
  const service = fx.makeService();
  await service.ensureSession();
  fx.addPair(service);
  let selected = ["target"];
  globalThis.canvas = { tokens: { setTargets(ids) { selected = ids; } } };
  globalThis.game = { user: { id: "user", targets: new Set() } };
  globalThis.ui = { notifications: { warn() {}, error() {} } };
  const fake = {
    _submitting: false, _targetsInitialized: true, _skipCloseTargetSave: false,
    _switchingTargets: false, rendered: false,
    sessionService: service,
    regionService: { clearPlacementHighlights() {} },
    _updatePreview() {},
    _isAutomaticActive: () => false,
    _saveCurrentZoneTarget: () => { throw new Error("draft recreated on close"); },
    close() { return SuppressionFireApp.prototype.close.call(this); }
  };
  await SuppressionFireApp.prototype._cancelUnfired.call(fake, { isConnected: false });
  assert.equal(fake.baseClosed, true);
  assert.deepEqual(selected, []);
  assert.equal(service.session, null);
  assert.equal(fx.sessions, undefined);
  await SuppressionFireApp.prototype._onTargetChange.call(fake, { id: "user" }, { id: "target" }, true);
  assert.equal(fx.sessions, undefined);
  assert.equal(fx.scene.regions.contents.length, 0);
  assert.deepEqual(fx.ammo, { loaded: 40, total: 40 });
});