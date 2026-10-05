import test from "node:test";
import assert from "node:assert/strict";
import { selectBlindFireHex } from "../scripts/tools/blind-fire-hex-selection.js";

class TrackedEvents extends EventTarget {
  counts = new Map();
  addEventListener(type, callback, options) {
    super.addEventListener(type, callback, options);
    this.counts.set(type, (this.counts.get(type) ?? 0) + 1);
  }
  removeEventListener(type, callback, options) {
    super.removeEventListener(type, callback, options);
    this.counts.set(type, (this.counts.get(type) ?? 0) - 1);
  }
  count(type) { return this.counts.get(type) ?? 0; }
}

function mouse(type, x, y, button = 0) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    button: { value: button }, clientX: { value: x }, clientY: { value: y }
  });
  return event;
}
function key(value) {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "key", { value });
  return event;
}

function fixture({ appMinimized = false, menuMinimized = true, managerMinimized = false } = {}) {
  const view = new TrackedEvents();
  const events = new TrackedEvents();
  const graphics = new Set();
  const gridCalls = [];
  let hintCount = 0;
  const stage = {
    addChild(graphic) { graphics.add(graphic); graphic.parent = this; },
    removeChild(graphic) { graphics.delete(graphic); graphic.parent = null; }
  };
  class Graphics {
    poly() { return this; }
    fill(options) { this.color = options.color; return this; }
    stroke() { return this; }
    destroy() { graphics.delete(this); }
  }
  const window = (id, minimized) => ({
    id, rendered: true, minimized, minimizeCount: 0, maximizeCount: 0,
    async minimize() { this.minimized = true; this.minimizeCount++; },
    async maximize() { this.minimized = false; this.maximizeCount++; }
  });
  const app = window("fire-control", appMinimized);
  app.token = { id: "source-token" };
  const menu = window("olegurps-special-fire-menu-source-token-weapon", menuMinimized);
  const manager = window("olegurps-shooting-assistant-source-token", managerMinimized);
  app.placementApps = [manager];
  const hint = {
    textContent: "",
    attached: false,
    remove() { if (this.attached) { hintCount--; this.attached = false; } }
  };
  const hooks = new Map();
  const runtime = {
    canvas: {
      app: { canvas: view }, stage,
      canvasCoordinatesFromClient: ({ x, y }) => ({ x, y }),
      grid: {
        getOffset(point) { gridCalls.push([point.x, point.y]); return { i: Math.floor(point.x / 10), j: Math.floor(point.y / 10) }; },
        getCenterPoint: ({ i, j }) => ({ x: i * 10 + 5, y: j * 10 + 5 }),
        getVertices: ({ i, j }) => [
          { x: i * 10, y: j * 10 }, { x: i * 10 + 10, y: j * 10 },
          { x: i * 10 + 10, y: j * 10 + 10 }, { x: i * 10, y: j * 10 + 10 }
        ]
      },
      get tokens() { throw Error("Token read"); }
    },
    ui: { windows: { menu } },
    foundry: { applications: { instances: new Map([[manager.id, manager], [menu.id, menu]]) } },
    PIXI: { Graphics },
    Hooks: {
      on(name, handler) { hooks.set(name, handler); return 1; },
      off(name) { hooks.delete(name); }
    },
    document: {
      createElement: () => hint,
      body: { append() { hintCount++; hint.attached = true; } }
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events)
  };
  return { runtime, app, menu, manager, view, events, graphics, gridCalls, hooks,
    hint, get hintCount() { return hintCount; } };
}

async function started(f) {
  const pending = selectBlindFireHex(f.app, f.runtime);
  await new Promise(resolve => setImmediate(resolve));
  return { pending };
}

function clean(f) {
  assert.equal(f.view.count("mousemove"), 0);
  assert.equal(f.view.count("click"), 0);
  assert.equal(f.events.count("keydown"), 0);
  assert.equal(f.events.count("pagehide"), 0);
  assert.equal(f.hooks.size, 0);
  assert.equal(f.graphics.size, 0);
  assert.equal(f.hintCount, 0);
}

test("hover and selection use one Grid cell, persist separately, and clean up on Enter", async () => {
  const f = fixture();
  const { pending } = await started(f);
  assert.equal(f.app.minimized, true);
  assert.equal(f.menu.minimized, true);
  assert.equal(f.manager.minimized, true);
  assert.equal(f.manager.minimizeCount, 1);
  assert.equal(f.hint.textContent.startsWith("\u0421\u0442\u0440\u0435\u043b\u044c\u0431\u0430 \u043d\u0430\u0443\u0433\u0430\u0434"), true);
  f.view.dispatchEvent(mouse("mousemove", 5, 5));
  assert.equal(f.graphics.size, 1);
  assert.deepEqual([...f.graphics].map(graphic => graphic.color), [0xa884df]);
  f.view.dispatchEvent(mouse("mousemove", 15, 5));
  assert.equal(f.graphics.size, 1);
  f.view.dispatchEvent(mouse("click", 15, 5));
  assert.deepEqual([...f.graphics].map(graphic => graphic.color), [0x8734bd]);
  const rightClick = mouse("click", 25, 5, 2);
  f.view.dispatchEvent(rightClick);
  assert.equal(rightClick.defaultPrevented, false);
  f.view.dispatchEvent(mouse("mousemove", 25, 5));
  assert.deepEqual(new Set([...f.graphics].map(graphic => graphic.color)),
    new Set([0x8734bd, 0xa884df]));
  f.events.dispatchEvent(key("Enter"));
  assert.deepEqual((await pending).offset, { i: 1, j: 0 });
  assert.equal(f.app.minimized, false);
  assert.equal(f.app.maximizeCount, 1);
  assert.equal(f.menu.minimized, true);
  assert.equal(f.menu.maximizeCount, 0);
  assert.equal(f.manager.minimized, false);
  assert.equal(f.manager.maximizeCount, 1);
  assert.deepEqual(f.gridCalls, [[5, 5], [15, 5], [15, 5], [25, 5]]);
  clean(f);
});

test("Esc, repeated picks and abort preserve minimized windows and leave no listeners", async () => {
  const f = fixture({ appMinimized: true, menuMinimized: false, managerMinimized: true });
  for (let index = 0; index < 2; index++) {
    const { pending } = await started(f);
    f.view.dispatchEvent(mouse("mousemove", 5, 5));
    f.view.dispatchEvent(mouse("click", 5, 5));
    f.events.dispatchEvent(key("Escape"));
    assert.equal(await pending, null);
    assert.equal(f.app.minimized, true);
    assert.equal(f.app.maximizeCount, 0);
    assert.equal(f.menu.minimized, false);
    assert.equal(f.manager.minimized, true);
    assert.equal(f.manager.maximizeCount, 0);
    clean(f);
  }
  const controller = new AbortController();
  const pending = selectBlindFireHex(f.app, f.runtime, controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  assert.equal(await pending, null);
  clean(f);
});


test("closing the app aborts a pending minimize before any Canvas listeners are installed", async () => {
  const f = fixture();
  f.app.minimize = () => {
    f.app.minimized = true;
    return new Promise(() => {});
  };
  const controller = new AbortController();
  const pending = selectBlindFireHex(f.app, f.runtime, controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  f.app.rendered = false;
  controller.abort();
  assert.equal(await pending, null);
  clean(f);
});


test("scene teardown cancels an active picker and restores its window", async () => {
  const f = fixture();
  const { pending } = await started(f);
  f.view.dispatchEvent(mouse("mousemove", 5, 5));
  f.hooks.get("canvasTearDown")();
  assert.equal(await pending, null);
  assert.equal(f.app.minimized, false);
  clean(f);
});

test("ApplicationV2 registry finds the Ammo Manager when Fire Control has no saved reference", async () => {
  const f = fixture();
  f.app.placementApps = [];
  const unrelated = {
    id: "olegurps-shooting-assistant-other-token", rendered: true, minimized: false,
    async minimize() { this.minimized = true; }
  };
  f.runtime.foundry.applications.instances.set(unrelated.id, unrelated);
  const { pending } = await started(f);
  assert.equal(f.app.minimized, true);
  assert.equal(f.manager.minimized, true);
  assert.equal(f.menu.minimized, true);
  assert.equal(unrelated.minimized, false);
  f.events.dispatchEvent(key("Escape"));
  assert.equal(await pending, null);
  assert.equal(f.manager.minimized, false);
  assert.equal(f.manager.maximizeCount, 1);
  assert.equal(f.menu.minimized, true);
  assert.equal(f.menu.maximizeCount, 0);
  clean(f);
});
