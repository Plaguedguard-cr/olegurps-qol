import { moduleText } from './localization.js';
import { readLauncherPreferences, saveLauncherPreferences, normalizeLauncherSize } from './launcher-preferences.js';
import { clampLauncherPosition, launcherPosition } from './launcher-position.js';
import { openUnifiedLauncher } from './unified-launcher.js';

const SELECTORS = { bucket: '#bucket-container', hotbar: '#hotbar', controls: '#scene-controls',
  navigation: '#scene-navigation', sidebar: '#sidebar', players: '#players', chat: '#chat-notifications' };
const rect = element => {
  const r = element?.getBoundingClientRect();
  return r?.width && r?.height ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
};

export class LauncherButton {
  constructor(runtime = globalThis) {
    this.runtime = runtime;
    this.schedule = () => {
      if (!this.frame) this.frame = runtime.requestAnimationFrame(() => { this.frame = null; this.layout(); });
    };
  }
  start() {
    if (this.started) { this.refresh(); return; }
    this.started = true;
    const r = this.runtime;
    this.abort = new r.AbortController();
    r.addEventListener('resize', this.schedule, { signal: this.abort.signal });
    r.visualViewport?.addEventListener('resize', this.schedule, { signal: this.abort.signal });
    r.visualViewport?.addEventListener('scroll', this.schedule, { signal: this.abort.signal });
    this.hooks = ['renderHotbar', 'renderSceneControls', 'renderSceneNavigation', 'renderModifierBucket', 'collapseSidebar', 'canvasReady']
      .map(event => [event, r.Hooks.on(event, this.schedule)]);
    this.hooks.push(['renderLauncherSettingsApp', r.Hooks.on('renderLauncherSettingsApp', app => this.bindSizePreview(app))],
      ['closeLauncherSettingsApp', r.Hooks.on('closeLauncherSettingsApp', app => this.clearSizePreview(app))]);
    this.resize = new r.ResizeObserver(this.schedule);
    this.observed = new Set();
    // Only module-independent UI anchors, never the canvas or open applications.
    this.mutations = new r.MutationObserver(records => {
      if (records.some(change => change.type === 'childList' || change.target.id !== 'olegurps-launcher-button')) this.schedule();
    });
    const bottom = r.document.querySelector('#ui-bottom');
    if (bottom) this.mutations.observe(bottom, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    this.refresh();
  }
  refresh() {
    if (!this.started) return;
    const r = this.runtime, preferences = readLauncherPreferences(r);
    if (!preferences.visible) { this.button?.remove(); this.button = null; this.drag = null; return; }
    if (!this.button) {
      const button = r.document.createElement('button');
      button.id = 'olegurps-launcher-button'; button.type = 'button';
      button.className = 'ui-control olegurps-launcher-button';
      button.title = 'OleGURPS QOL'; button.setAttribute('aria-label', 'OleGURPS QOL');
      button.dataset.tooltip = 'OleGURPS QOL';
      // Recognizable module monogram, no replacement of any macro artwork.
      const label = r.document.createElement('span'); label.textContent = 'OG'; label.setAttribute('aria-hidden', 'true'); button.append(label);
      button.addEventListener('click', event => {
        if (this.suppressClick) { this.suppressClick = false; event.preventDefault(); return; }
        void openUnifiedLauncher().catch(error => this.report(error));
      });
      button.addEventListener('pointerdown', event => this.pointerDown(event));
      button.addEventListener('pointermove', event => this.pointerMove(event));
      button.addEventListener('pointerup', event => this.pointerEnd(event));
      button.addEventListener('pointercancel', event => this.pointerEnd(event, true));
      button.addEventListener('lostpointercapture', event => this.pointerEnd(event, true));
      r.document.body.append(button); this.button = button;
    }
    this.button.style.setProperty('--olegurps-launcher-size', `${this.previewSize ?? preferences.size}px`);
    this.button.classList.toggle('is-draggable', preferences.position === 'custom');
    this.schedule();
  }
  bindSizePreview(app) {
    const picker = app.element?.querySelector('#oq-launcher-size');
    if (!picker) return;
    this.sizePreviewAbort?.abort();
    this.previewApp = app;
    this.sizePreviewAbort = new this.runtime.AbortController();
    const preview = event => {
      const value = event.target.value;
      if (value === '' || !Number.isFinite(Number(value))) return;
      this.previewSize = normalizeLauncherSize(Number(value));
      this.refresh();
    };
    for (const event of ['input', 'change']) picker.addEventListener(event, preview, { signal: this.sizePreviewAbort.signal });
    this.previewSize = picker.value === '' ? null : normalizeLauncherSize(Number(picker.value));
    this.refresh();
  }
  clearSizePreview(app) {
    if (app !== this.previewApp) return;
    this.sizePreviewAbort?.abort(); this.sizePreviewAbort = null;
    this.previewApp = null; this.previewSize = null;
    this.refresh();
  }
  report(error) {
    console.error('OleGURPS QOL | Launcher:', error);
    this.runtime.ui.notifications.error(moduleText('OleGURPS.Launcher.SaveFailed'));
  }
  measurements() {
    const r = this.runtime;
    return { viewport: { width: r.visualViewport?.width ?? r.document.documentElement.clientWidth,
      height: r.visualViewport?.height ?? r.document.documentElement.clientHeight,
      left: r.visualViewport?.offsetLeft ?? 0, top: r.visualViewport?.offsetTop ?? 0 },
      size: { width: this.button.offsetWidth, height: this.button.offsetHeight } };
  }
  layout() {
    if (!this.button?.isConnected || this.drag?.moved) return;
    const r = this.runtime, anchors = {};
    for (const [key, selector] of Object.entries(SELECTORS)) {
      const element = r.document.querySelector(selector);
      if (key === 'navigation') {
        // The navigation wrapper stretches to the viewport bottom in v14.
        // Only its actual scene tabs occupy space beside the scene controls.
        const tabs = [...r.document.querySelectorAll('#scene-navigation .scene')].map(rect).filter(Boolean);
        anchors[key] = tabs.length ? { left: Math.min(...tabs.map(t => t.left)), top: Math.min(...tabs.map(t => t.top)),
          right: Math.max(...tabs.map(t => t.right)), bottom: Math.max(...tabs.map(t => t.bottom)) } : null;
      } else anchors[key] = rect(element);
      if (element && !this.observed.has(element)) { this.resize.observe(element); this.observed.add(element); }
    }
    for (const element of this.observed) if (!element.isConnected) { this.resize.unobserve(element); this.observed.delete(element); }
    const { viewport, size } = this.measurements();
    this.place(launcherPosition(readLauncherPreferences(r), anchors, viewport, size));
  }
  place(point) { this.button.style.left = `${point.x}px`; this.button.style.top = `${point.y}px`; }
  pointerDown(event) {
    if (event.button !== 0 || readLauncherPreferences(this.runtime).position !== 'custom') return;
    this.suppressClick = false;
    const bounds = this.button.getBoundingClientRect();
    this.drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: bounds.left, y: bounds.top, moved: false };
    this.button.setPointerCapture(event.pointerId);
  }
  pointerMove(event) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const { viewport, size } = this.measurements();
    drag.point = clampLauncherPosition({ x: drag.x + dx, y: drag.y + dy }, viewport, size);
    this.place(drag.point);
  }
  pointerEnd(event, cancelled = false) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    this.suppressClick = drag.moved;
    if (this.button?.hasPointerCapture(event.pointerId)) this.button.releasePointerCapture(event.pointerId);
    if (drag.moved && !cancelled) {
      void saveLauncherPreferences({ custom: drag.point }, this.runtime).catch(error => { this.report(error); this.schedule(); });
    } else this.schedule();
  }
  stop() {
    if (!this.started) return;
    this.started = false;
    this.clearSizePreview(this.previewApp);
    this.abort.abort(); this.resize.disconnect(); this.mutations.disconnect();
    for (const [event, id] of this.hooks) this.runtime.Hooks.off(event, id);
    if (this.frame) this.runtime.cancelAnimationFrame(this.frame);
    this.frame = null; this.button?.remove(); this.button = null; this.drag = null;
  }
}

export const launcherButton = new LauncherButton();
