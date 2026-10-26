import { moduleText } from './localization.js';
import { launcherActions, runLauncherAction } from './launcher-actions.js';
import { LAUNCHER_MODULE, LAUNCHER_POSITIONS, LAUNCHER_SETTINGS, LAUNCHER_SIZE, readLauncherPreferences,
  saveLauncherPreferences, resetLauncherPosition } from './launcher-preferences.js';

const text = key => moduleText(`OleGURPS.Launcher.${key}`);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ApplicationV2 = foundry.applications.api.ApplicationV2;

export class UnifiedLauncher extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'olegurps-unified-launcher', classes: ['olegurps-qol', 'olegurps-launcher'], tag: 'section',
    window: { title: 'OleGURPS QOL', resizable: true }, position: { width: 460, height: 'auto' },
    actions: {
      launch: async function(_event, button) {
        if (button.disabled) return;
        button.disabled = true;
        try { await runLauncherAction(button.dataset.tool); }
        catch (error) { console.error('OleGURPS QOL | Launcher:', error); ui.notifications.error(text('Unavailable')); }
        finally { button.disabled = false; }
      }
    }
  };
  async _prepareContext() {
    return { sections: ['Combat', 'Checks', 'Tools'].map(section => ({
      title: text(section), actions: launcherActions().filter(action => action.section === section)
    })).filter(section => section.actions.length) };
  }
  async _renderHTML({ sections }) {
    return `<div class="olegurps-launcher-list">${sections.map(section => `<section><h3>${escape(section.title)}</h3><div class="olegurps-launcher-grid">${section.actions.map(action => {
      const label = escape(moduleText(action.labelKey));
      const icon = action.image ? `<img src="${escape(action.image)}" alt="" width="40" height="40">` : `<i class="${escape(action.icon)}" aria-hidden="true"></i>`;
      return `<button type="button" data-action="launch" data-tool="${action.id}" title="${label}">${icon}<span>${label}</span></button>`;
    }).join('')}</div></section>`).join('')}</div>`;
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

export class LauncherSettingsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'olegurps-launcher-settings', classes: ['olegurps-qol', 'olegurps-settings', 'olegurps-launcher-settings'], tag: 'form',
    window: { title: text('Settings'), resizable: false }, position: { width: 460, height: 'auto' },
    actions: { reset: async function() {
      await resetLauncherPosition();
      await this.render({ force: true });
    } },
    form: { closeOnSubmit: true, handler: async function(_event, _form, formData) {
      await saveLauncherPreferences({ visible: formData.object.visible === true, position: formData.object.position, size: Number(formData.object.size) });
    } }
  };
  async _prepareContext() { return readLauncherPreferences(); }
  async _renderHTML(value) {
    return `<div class="standard-form">
      <div class="form-group"><label for="oq-launcher-visible">${escape(text('Visible'))}</label><div class="form-fields"><input id="oq-launcher-visible" type="checkbox" name="visible" ${value.visible ? 'checked' : ''}></div></div>
      <div class="form-group"><label for="oq-launcher-position">${escape(text('Position'))}</label><div class="form-fields"><select id="oq-launcher-position" name="position">${LAUNCHER_POSITIONS.map(position => `<option value="${position}" ${value.position === position ? 'selected' : ''}>${escape(text(`Position_${position}`))}</option>`).join('')}</select></div></div>
      <div class="form-group"><label for="oq-launcher-size">${escape(text('Size'))}</label><div class="form-fields"><range-picker id="oq-launcher-size" name="size" value="${value.size}" min="${LAUNCHER_SIZE.min}" max="${LAUNCHER_SIZE.max}" step="${LAUNCHER_SIZE.step}"></range-picker></div><p class="hint">${escape(text('SizeHint'))}</p></div>
      <p class="hint">${escape(text('PersonalHint'))}</p><footer class="form-footer"><button type="button" data-action="reset">${escape(text('Reset'))}</button><button type="submit"><i class="fas fa-save" aria-hidden="true"></i>${escape(text('Save'))}</button></footer></div>`;
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

let launcher, opening;
export async function openUnifiedLauncher() {
  if (opening) return opening;
  launcher ??= new UnifiedLauncher();
  if (launcher.rendered) {
    if (launcher.minimized) await launcher.maximize();
    launcher.bringToFront();
    return launcher;
  }
  opening = (async () => { await launcher.render({ force: true }); return launcher; })();
  try { return await opening; } finally { opening = null; }
}

export function registerLauncherSettings(onChange, runtime = globalThis) {
  for (const [key, type, defaultValue, config] of [
    ['visible', Boolean, true, false], ['position', String, 'bucket', false], ['custom', Object, null, false]
  ]) runtime.game.settings.register(LAUNCHER_MODULE, LAUNCHER_SETTINGS[key], {
    name: text(key === 'visible' ? 'Visible' : 'Position'), scope: 'user', config, type, default: defaultValue,
    ...(key === 'position' ? { choices: Object.fromEntries(LAUNCHER_POSITIONS.map(p => [p, text(`Position_${p}`)])) } : {}),
    onChange
  });
  runtime.game.settings.register(LAUNCHER_MODULE, LAUNCHER_SETTINGS.size, {
    name: text('Size'), hint: text('SizeHint'), scope: 'user', config: false,
    type: Number, default: LAUNCHER_SIZE.default,
    range: { min: LAUNCHER_SIZE.min, max: LAUNCHER_SIZE.max, step: LAUNCHER_SIZE.step }, onChange
  });
  runtime.game.settings.registerMenu(LAUNCHER_MODULE, 'launcher-settings', {
    name: text('Settings'), label: text('Configure'), hint: text('PersonalHint'),
    icon: 'fas fa-grip', type: LauncherSettingsApp, restricted: false
  });
}
