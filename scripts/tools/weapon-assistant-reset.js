import {generateId} from '../random-id.js';
import {WEAPON_BINDING_FLAG} from '../weapon-catalog-binding-service.js';
import {AmmoService} from './ammo-service.js';
import {STANDALONE_WEAPON_FLAG, flagPatch} from './standalone-weapon-service.js';
import {withActorResourceWrite} from './actor-resource-writes.js';

/** Explicitly destructive reset of one owned Actor's assistant, never the character sheet. */
export function resetWeaponAssistant(actor, {confirmed = false, expectedResetId = null} = {}) {
  if (!confirmed) return Promise.resolve(false);
  return withActorResourceWrite(actor, async () => {
    if (!actor?.isOwner) throw Error('Нет прав владельца выбранного персонажа.');
    const previous = actor.getFlag('world', 'gurpsAmmoManager') ?? {};
    if ((previous.assistantResetId ?? null) !== expectedResetId) throw Error('Помощник уже сброшен. Откройте настройки заново.');
    if (Object.values(previous.shotReceipts ?? {}).some(receipt => receipt.status === 'pending'))
      throw Error('Сначала завершите текущую атаку.');
    const activeSuppression = Object.values(actor.getFlag('olegurps-qol', 'suppressionFireSessions') ?? {});
    for (const scene of globalThis.game?.scenes?.contents ?? []) {
      for (const token of scene.tokens?.contents ?? []) activeSuppression.push(...Object.values(token.getFlag?.('olegurps-qol', 'suppressionFireSessions') ?? {}));
      for (const region of scene.regions?.contents ?? []) activeSuppression.push(region.getFlag?.('olegurps-qol', 'suppressionFire') ?? {});
    }
    if (activeSuppression.some(session => session.actorId === actor.id && !['ended', 'cancelled'].includes(session.status)))
      throw Error('Сначала завершите подавляющий огонь этого персонажа.');
    const definitions = actor.getFlag('olegurps-qol', STANDALONE_WEAPON_FLAG);
    const next = {...new AmmoService(actor).defaultState(), assistantResetId: generateId(), rebuildFromCharacter: true,
      ...(previous.shotReceipts ? {shotReceipts: structuredClone(previous.shotReceipts)} : {})};
    const updates = {'flags.world.gurpsAmmoManager': flagPatch(previous, next)};
    if (definitions) updates[`flags.olegurps-qol.${STANDALONE_WEAPON_FLAG}`] = flagPatch(definitions,
      {...structuredClone(definitions), weapons: (definitions.weapons ?? []).filter(weapon => weapon.type !== 'ranged')});
    const bindings = actor.getFlag('olegurps-qol', WEAPON_BINDING_FLAG);
    if (bindings) updates[`flags.olegurps-qol.${WEAPON_BINDING_FLAG}`] = flagPatch(bindings,
      {...structuredClone(bindings), entries: (bindings.entries ?? []).filter(entry => entry.anchor?.type !== 'ranged')});
    await actor.update(updates);
    return true;
  });
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);

export class WeaponAssistantResetApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'olegurps-weapon-assistant-reset', classes: ['olegurps-qol', 'olegurps-settings'], tag: 'section',
    window: {title: 'Сброс оружейного помощника', resizable: false}, position: {width: 520, height: 'auto'},
    actions: {
      requestReset: async function() {
        if (this.busy) return;
        this.actorId = this.element.querySelector('[name=actorId]')?.value;
        const actor = game.actors.get(this.actorId);
        if (!actor?.isOwner) return;
        this.expectedResetId = actor.getFlag('world', 'gurpsAmmoManager')?.assistantResetId ?? null;
        this.confirming = true; this.result = ''; await this.render({force: true});
      },
      cancelReset: async function() { if (!this.busy) { this.confirming = false; await this.render({force: true}); } },
      confirmReset: async function(_event, button) {
        if (!this.confirming || this.busy) return;
        this.busy = true; button.disabled = true;
        try {
          const actor = game.actors.get(this.actorId);
          if (!actor?.isOwner) throw Error('Нет прав владельца выбранного персонажа.');
          for (const app of [...foundry.applications.instances.values()]) {
            if (app !== this && (app.actor?.uuid === actor.uuid || app.token?.actor?.uuid === actor.uuid) &&
                (app.options?.classes?.includes('olegurps-qol') || app.id?.startsWith('olegurps-'))) await app.close();
          }
          await resetWeaponAssistant(actor, {confirmed: true, expectedResetId: this.expectedResetId});
          this.result = 'Сброшено. При открытии помощник заново прочитает дистанционные атаки из чарника. Запасы будут пустыми.';
          this.confirming = false;
        } catch (error) { ui.notifications.error(error.message); }
        finally { this.busy = false; await this.render({force: true}); }
      }
    }
  };
  async _prepareContext() {
    const actors = game.actors.filter(actor => actor.isOwner);
    this.actorId ??= canvas?.tokens?.controlled?.length === 1 ? canvas.tokens.controlled[0].actor?.id : game.user.character?.id;
    if (!actors.some(actor => actor.id === this.actorId)) this.actorId = actors[0]?.id;
    return {actors, actor: actors.find(actor => actor.id === this.actorId)};
  }
  async _renderHTML({actors, actor}) {
    return `<div class="standard-form"><p>Сброс удалит настройки, патроны, магазины и добавленное дистанционное оружие помощника выбранного персонажа.</p>
      <p>Чарник, оружие ближнего боя и история атак сохранятся. Другие персонажи не изменятся. Если у персонажа несколько владельцев, сброс общий для них.</p>
      <div class="form-group"><label for="oq-reset-actor">Персонаж</label><div class="form-fields"><select name="actorId" id="oq-reset-actor" ${this.confirming ? 'disabled' : ''}>${actors.map(row => `<option value="${escape(row.id)}" ${row.id === this.actorId ? 'selected' : ''}>${escape(row.name)}</option>`).join('')}</select></div></div>
      ${this.result ? `<p role="status">${escape(this.result)}</p>` : ''}
      ${this.confirming ? `<p><strong>Удалить данные помощника персонажа «${escape(actor?.name)}»? Отменить удаление после подтверждения нельзя.</strong></p><footer class="form-footer"><button type="button" data-action="confirmReset">Да, сбросить</button><button type="button" data-action="cancelReset">Отмена</button></footer>` : `<footer class="form-footer"><button type="button" data-action="requestReset" ${actor ? '' : 'disabled'}><i class="fas fa-arrow-rotate-left" aria-hidden="true"></i>Сбросить помощник</button></footer>`}</div>`;
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

export function registerWeaponAssistantReset(runtime = globalThis) {
  runtime.game.settings.registerMenu('olegurps-qol', 'weapon-assistant-reset', {
    name: 'Сброс оружейного помощника', label: 'Сбросить помощник',
    hint: 'Удаление данных помощника только для выбранного персонажа, которым вы владеете.',
    icon: 'fas fa-arrow-rotate-left', type: WeaponAssistantResetApp, restricted: false
  });
}
