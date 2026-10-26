import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LAUNCHER_ACTIONS, launcherActions, runLauncherAction } from '../scripts/launcher-actions.js';
import { macroLabels } from '../scripts/macro-labels.js';
import { moduleText } from '../scripts/localization.js';
import { LAUNCHER_SETTINGS, readLauncherPreferences, saveLauncherPreferences, resetLauncherPosition,
  normalizeLauncherPreferences, normalizeLauncherSize } from '../scripts/launcher-preferences.js';
import { launcherPosition, clampLauncherPosition } from '../scripts/launcher-position.js';

const instances = new Map();
class ApplicationV2 {
  constructor() { this.options = this.constructor.DEFAULT_OPTIONS; this.id = this.options.id; this.renders = 0; }
  async render() { this.renders++; await Promise.resolve(); this.rendered = true; instances.set(this.id, this); return this; }
  bringToFront() { this.raised = true; }
  async close() { this.rendered = false; instances.delete(this.id); }
}
globalThis.foundry = { applications: { api: { ApplicationV2 }, instances } };
const { UnifiedLauncher, LauncherSettingsApp, openUnifiedLauncher, registerLauncherSettings } = await import('../scripts/unified-launcher.js');
const { LauncherButton } = await import('../scripts/launcher-button.js');

function runtime() {
  const records = new Map(), definitions = new Map(), menus = new Map(), writes = [];
  const r = { game: { user: { id: 'owner', isGM: false }, settings: {
    menus, register(_scope, key, value) { definitions.set(key, value); },
    registerMenu(scope, key, value) { menus.set(`${scope}.${key}`, value); },
    get(_scope, key) { return structuredClone(records.get(`${r.game.user.id}.${key}`) ?? definitions.get(key)?.default); },
    async set(scope, key, value) {
      assert.equal(scope, 'olegurps-qol');
      writes.push({ user: r.game.user.id, key, value }); records.set(`${r.game.user.id}.${key}`, structuredClone(value));
      definitions.get(key)?.onChange?.(value);
    }
  } }, foundry: globalThis.foundry, records, definitions, writes };
  registerLauncherSettings(() => {}, r);
  return r;
}

test('all shipped modern and legacy macros have exactly one launcher action with original artwork and command', () => {
  const macros = JSON.parse(fs.readFileSync('data/macros/olegurps-macros.json', 'utf8'));
  const actions = LAUNCHER_ACTIONS.filter(a => a.macroId);
  assert.equal(actions.length, macros.length);
  assert.deepEqual(actions.map(a => a.macroId).sort(), Object.keys(macroLabels).sort());
  for (const m of macros) {
    const a = actions.find(a => a.macroId === m._id);
    assert.equal(a.image, m.img);
    assert.equal(m.command, `game.olegurpsQOL.${a.handler}.${a.method}();`);
    assert.ok(fs.existsSync(a.image.replace('modules/olegurps-qol/', '')));
  }
});

test('launcher contains only the ten macros; settings are available only through native settings', async () => {
  assert.equal(LAUNCHER_ACTIONS.length, 10);
  assert.equal(launcherActions({ isGM: true }).length, 10);
  assert.equal(launcherActions({ isGM: false }).length, 10);
  const r = runtime(); let calls = 0;
  r.game.olegurpsQOL = { developer: { open() { calls++; } } };
  for (const id of ['weapon-settings','effect-visibility','developer','preferences']) await assert.rejects(runLauncherAction(id, r));
  assert.equal(calls, 0);
  await assert.rejects(runLauncherAction('world-macro-id', r));
  r.game.user.isGM = true; await assert.rejects(runLauncherAction('developer', r)); assert.equal(calls, 0);
});

test('macro actions delegate to the existing public API without token or mechanics writes', async () => {
  const r = runtime(), calls = [];
  r.game.olegurpsQOL = Object.fromEntries(LAUNCHER_ACTIONS.filter(a => a.handler).map(a => [a.handler, { open() { calls.push(a.id); return a.id; } }]));
  for (const a of LAUNCHER_ACTIONS.filter(a => a.macroId)) assert.equal(await runLauncherAction(a.id, r), a.id);
  assert.deepEqual(calls, LAUNCHER_ACTIONS.filter(a => a.macroId).map(a => a.id));
  assert.deepEqual(r.writes, []);
});

test('all four settings menus retain their native registration and shared formatting', () => {
  for (const path of ['scripts/tools/weapon-skill-settings-app.js','scripts/tools/status-effect-visibility.js',
    'scripts/tools/developer-mode-app.js','scripts/unified-launcher.js']) {
    const source = fs.readFileSync(path,'utf8');
    assert.ok(source.includes('registerMenu('),path); assert.ok(source.includes('"olegurps-settings"')||source.includes("'olegurps-settings'"),path);
  }
});

test('labels exist in RU and EN dictionaries while module UI stays Russian with either Foundry language', async () => {
  const ru = JSON.parse(fs.readFileSync('lang/ru.json', 'utf8')), en = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'));
  for (const key of Object.keys(ru).filter(k => k.startsWith('OleGURPS.Launcher.')).concat(LAUNCHER_ACTIONS.map(a => a.labelKey))) {
    assert.ok(ru[key], key); assert.ok(en[key], key); assert.equal(moduleText(key), ru[key]);
  }
  const app = new UnifiedLauncher();
  for (const lang of ['ru', 'en']) {
    globalThis.game = { user: { isGM: true }, i18n: { lang, localize: () => 'unused' } };
    const html = await app._renderHTML(await app._prepareContext());
    assert.equal((html.match(/data-action="launch"/g) ?? []).length, 10);
    assert.equal(html.includes('data-action="preferences"'), false);
    assert.equal(html.includes('data-tool="weapon-settings"'), false);
    for (const a of LAUNCHER_ACTIONS) { assert.ok(html.includes(moduleText(a.labelKey))); if (a.image) assert.ok(html.includes(a.image)); }
    assert.equal(game.i18n.lang, lang);
  }
});

test('singleton launcher handles concurrent opens, raises without rerender, and reopens after close', async () => {
  const [a, b, c] = await Promise.all([openUnifiedLauncher(), openUnifiedLauncher(), openUnifiedLauncher()]);
  assert.equal(a, b); assert.equal(b, c); assert.equal(a.renders, 1);
  assert.equal(await openUnifiedLauncher(), a); assert.equal(a.renders, 1); assert.ok(a.raised);
  await a.close(); assert.equal(await openUnifiedLauncher(), a); assert.equal(a.renders, 2);
});

test('standard settings are server-persisted per-user, editable by players, with correct defaults', () => {
  const r = runtime();
  assert.deepEqual(readLauncherPreferences(r), { visible: true, size: 40, position: 'bucket', custom: null });
  for (const definition of r.definitions.values()) assert.equal(definition.scope, 'user');
  assert.equal(r.definitions.get(LAUNCHER_SETTINGS.visible).type, Boolean);
  for (const setting of Object.values(LAUNCHER_SETTINGS)) assert.equal(r.definitions.get(setting).config, false);
  assert.equal(r.game.settings.menus.get('olegurps-qol.launcher-settings').restricted, false);
  assert.ok(LauncherSettingsApp.prototype instanceof ApplicationV2);
});

test('OWNER visibility and coordinates persist independently across reconstruction and do not change GM', async () => {
  const r = runtime();
  await saveLauncherPreferences({ visible: false, size: 56, position: 'custom', custom: { x: 200, y: 300 } }, r);
  const reconstructed = { game: { ...r.game, settings: r.game.settings } };
  assert.deepEqual(readLauncherPreferences(reconstructed), { visible: false, size: 56, position: 'custom', custom: { x: 200, y: 300 } });
  r.game.user = { id: 'gm', isGM: true };
  assert.deepEqual(readLauncherPreferences(r), { visible: true, size: 40, position: 'bucket', custom: null });
  r.game.user = { id: 'owner', isGM: false }; await resetLauncherPosition(r);
  assert.deepEqual(readLauncherPreferences(r), { visible: false, size: 56, position: 'bucket', custom: null });
});

test('queued preferences preserve independent fields and reset only placement', async () => {
  const r = runtime();
  await Promise.all([saveLauncherPreferences({ visible: false }, r), saveLauncherPreferences({ position: 'hotbar-right' }, r)]);
  assert.deepEqual(readLauncherPreferences(r), { visible: false, size: 40, position: 'hotbar-right', custom: null });
  assert.deepEqual(normalizeLauncherPreferences({ position: 'bad', custom: { x: Infinity, y: 2 } }), { visible: true, size: 40, position: 'bucket', custom: null });
});

test('OG size keeps user Number metadata and bounds while its control is in the submenu only', () => {
  const r = runtime(), setting = r.definitions.get('launcherSize');
  assert.equal(setting.type, Number); assert.equal(setting.scope, 'user'); assert.equal(setting.config, false);
  assert.equal(setting.default, 40); assert.deepEqual(setting.range, { min: 28, max: 72, step: 4 });
  assert.equal(typeof setting.onChange, 'function');
  for (const size of [28, 40, 56, 72]) assert.equal(normalizeLauncherSize(size), size);
  assert.equal(normalizeLauncherSize(12), 28); assert.equal(normalizeLauncherSize(100), 72);
  assert.equal(normalizeLauncherSize(41), 40); assert.equal(normalizeLauncherSize(43), 44);
  for (const invalid of [null, undefined, '72', false, NaN, Infinity]) assert.equal(normalizeLauncherSize(invalid), 40);
});

test('changing OG size refreshes its scale and schedules layout without overwriting custom coordinates', async () => {
  const r = runtime(); await saveLauncherPreferences({ position: 'custom', custom: { x: 490, y: 390 } }, r);
  const controller = new LauncherButton(r), properties = new Map(); let layouts = 0;
  controller.started = true; controller.button = { style: { setProperty: (key, value) => properties.set(key, value) }, classList: { toggle() {} } };
  controller.schedule = () => layouts++;
  r.definitions.get('launcherSize').onChange = () => controller.refresh();
  for (const size of [28, 40, 56, 72]) {
    await saveLauncherPreferences({ size }, r);
    assert.equal(properties.get('--olegurps-launcher-size'), `${size}px`);
    assert.deepEqual(readLauncherPreferences(r).custom, { x: 490, y: 390 });
  }
  assert.equal(layouts, 4);
  assert.ok(r.writes.filter(w => w.key === 'launcherSize').every(w => w.user === 'owner'));
});

test('all requested OG sizes use their real dimensions for anchor spacing and viewport clamping', () => {
  const viewport = { width: 1280, height: 720 }, bucket = { left: 400, right: 530, top: 630, bottom: 700 };
  const preferences = { position: 'custom', custom: { x: 1250, y: 690 } };
  for (const dimension of [28, 40, 56, 72]) {
    const size = { width: dimension, height: dimension };
    const dock = launcherPosition({ position: 'bucket' }, { bucket }, viewport, size);
    assert.equal(dock.x + dimension, bucket.left - 8); assert.equal(dock.y + dimension, bucket.bottom);
    const custom = launcherPosition(preferences, {}, viewport, size);
    assert.equal(custom.x, Math.min(preferences.custom.x, viewport.width - dimension));
    assert.equal(custom.y, Math.min(preferences.custom.y, viewport.height - dimension));
  }
  assert.deepEqual(preferences.custom, { x: 1250, y: 690 });
});

test('submenu slider previews immediately without writing settings, and closing restores the saved size', () => {
  const r = runtime(), properties = new Map(); r.AbortController = AbortController;
  const controller = new LauncherButton(r), picker = new EventTarget();
  picker.value = '72'; controller.started = true; controller.schedule = () => {};
  controller.button = { style: { setProperty: (k,v) => properties.set(k,v) }, classList: { toggle() {} } };
  const app = { element: { querySelector: () => picker } };
  controller.bindSizePreview(app); picker.dispatchEvent(new Event('input'));
  assert.equal(properties.get('--olegurps-launcher-size'), '72px');
  assert.equal(readLauncherPreferences(r).size, 40); assert.deepEqual(r.writes, []);
  controller.clearSizePreview(app);
  assert.equal(properties.get('--olegurps-launcher-size'), '40px');
  picker.value = '28'; picker.dispatchEvent(new Event('input'));
  assert.equal(properties.get('--olegurps-launcher-size'), '40px');
});

test('button submenu renders and saves visibility, position and size once, preserving coordinates', async () => {
  const r = runtime(); await saveLauncherPreferences({ visible: false, size: 56, position: 'custom', custom: { x: 330, y: 160 } }, r);
  const app = new LauncherSettingsApp(),html = await app._renderHTML(readLauncherPreferences(r));
  for (const name of ['visible','position','size']) assert.equal((html.match(new RegExp(`name="${name}"`, 'g')) ?? []).length, 1);
  assert.match(html, /<range-picker[^>]*name="size"[^>]*value="56"[^>]*min="28"[^>]*max="72"[^>]*step="4"/);
  assert.ok(html.includes('value="custom" selected'));
  const previousGame = globalThis.game; globalThis.game = r.game;
  try { await LauncherSettingsApp.DEFAULT_OPTIONS.form.handler(null, null, { object: { visible: true, position: 'hotbar-right', size: '72' } }); }
  finally { globalThis.game = previousGame; }
  assert.deepEqual(readLauncherPreferences(r), { visible: true, size: 72, position: 'hotbar-right', custom: { x: 330, y: 160 } });
});

test('anchor geometry places default to the left of the actual bucket without modifying its rect', () => {
  const anchors = { bucket: { left: 460, top: 790, right: 596, bottom: 863 }, hotbar: { left: 597, top: 728, right: 1052, bottom: 863 } };
  const before = structuredClone(anchors), size = { width: 40, height: 40 }, viewport = { width: 1676, height: 880 };
  assert.deepEqual(launcherPosition({ position: 'bucket' }, anchors, viewport, size), { x: 412, y: 823 });
  assert.deepEqual(anchors, before);
  const left = launcherPosition({ position: 'hotbar-left' }, anchors, viewport, size);
  assert.ok(left.x + size.width < anchors.hotbar.left); assert.ok(left.y + size.height < anchors.bucket.top);
  const right = launcherPosition({ position: 'hotbar-right' }, anchors, viewport, size);
  assert.ok(right.x > anchors.hotbar.right);
  const scene = { controls: { left: 16, top: 16, right: 88, bottom: 400 }, navigation: { left: 104, top: 16, right: 280, bottom: 92 } };
  const beside = launcherPosition({ position: 'controls' }, scene, viewport, size);
  assert.ok(beside.x > scene.controls.right); assert.ok(beside.y > scene.navigation.bottom);
});

test('custom position is clamped after resize, including tiny viewports and missing anchors', () => {
  const size = { width: 40, height: 40 };
  assert.deepEqual(launcherPosition({ position: 'custom', custom: { x: 900, y: 600 } }, {}, { width: 320, height: 200 }, size), { x: 280, y: 160 });
  assert.deepEqual(clampLauncherPosition({ x: -5, y: 400 }, { width: 20, height: 20 }, size), { x: 0, y: 0 });
  const fallback = launcherPosition({ position: 'bucket' }, {}, { width: 320, height: 200 }, size);
  assert.ok(fallback.x >= 0 && fallback.y >= 0);
  assert.deepEqual(clampLauncherPosition({ x: 900, y: 900 }, { width: 320, height: 200, left: 100, top: 50 }, size), { x: 380, y: 210 });
});

test('drag threshold distinguishes click from drag and saves only custom coordinates on release', async () => {
  const r = runtime(); await saveLauncherPreferences({ position: 'custom' }, r);
  const controller = new LauncherButton(r), capture = new Set();
  controller.button = { style: {}, getBoundingClientRect: () => ({ left: 100, top: 100 }),
    setPointerCapture: id => capture.add(id), hasPointerCapture: id => capture.has(id), releasePointerCapture: id => capture.delete(id) };
  controller.measurements = () => ({ viewport: { width: 500, height: 400 }, size: { width: 40, height: 40 } });
  const event = { button: 0, pointerId: 1, clientX: 110, clientY: 110 };
  controller.pointerDown(event); controller.pointerMove({ ...event, clientX: 112 });
  assert.equal(controller.drag.moved, false);
  controller.pointerMove({ ...event, clientX: 900, clientY: 900 });
  assert.equal(controller.drag.moved, true); assert.deepEqual(controller.button.style, { left: '460px', top: '360px' });
  controller.pointerEnd(event); await saveLauncherPreferences({}, r);
  assert.ok(controller.suppressClick); assert.deepEqual(readLauncherPreferences(r).custom, { x: 460, y: 360 });
});

test('hiding the launcher removes only its own button and retains API/settings', async () => {
  const r = runtime(), controller = new LauncherButton(r); let removed = false;
  controller.started = true; controller.button = { remove() { removed = true; } };
  await saveLauncherPreferences({ visible: false }, r); controller.refresh();
  assert.ok(removed); assert.equal(controller.button, null); assert.ok(r.game.settings.menus.size);
});
