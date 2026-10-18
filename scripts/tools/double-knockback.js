const SCOPE = 'olegurps-qol';
const installations = new WeakMap();
const readable = message => message?.visible === true && message?.isContentVisible === true;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const positive = value => value !== null && value !== undefined && String(value).trim() !== '' &&
  Number.isFinite(Number(value)) && Number(value) > 0;

/** GGA's damageItem payload stores basic damage, including damage multipliers,
 * before DR/injury. Each entry is one hit/component, never the Apply All sum. */
export function knockbackHits(message) {
  const transfer = message?.flags?.gurps?.transfer;
  if (transfer?.type !== 'damageItem' || !Array.isArray(transfer.payload)) return [];
  return transfer.payload.flatMap((hit, index) => {
    if (!['cr', 'cut'].includes(hit?.damageType) || !/\bdkb\b/i.test(hit.damageModifier ?? '') ||
        typeof hit.damage !== 'number' || !Number.isFinite(hit.damage) || hit.damage < 0) return [];
    return [{ index, damage: hit.damage, type: hit.damageType }];
  });
}

/** Basic Set Characters B104; Campaigns B378. Round ordinary distance first. */
export function calculateDoubleKnockback(damage, strength, type = 'cr', cuttingStopped = null) {
  if (!Number.isFinite(damage) || damage < 0 || !positive(strength)) throw Error('Некорректный урон или ST цели.');
  if (!['cr', 'cut'].includes(type)) throw Error('Этот тип урона не вызывает отбрасывание по B378.');
  if (type === 'cut' && typeof cuttingStopped !== 'boolean') throw Error('Укажите, пробил ли cutting-урон DR.');
  const ordinary = type === 'cut' && !cuttingStopped ? 0 :
    Math.floor(damage / (Number(strength) <= 3 ? 1 : Number(strength) - 2));
  const yards = ordinary * 2;
  return { ordinary, yards, balancePenalty: yards > 0 ? -(yards - 1) : 0 };
}

export function captureKnockbackTargets(runtime = globalThis) {
  return { sceneId: runtime.canvas?.scene?.id ?? null,
    tokenIds: [...(runtime.game?.user?.targets ?? [])].map(t => t.document?.id ?? t.id) };
}

function targetActor(target, runtime) {
  const actor = target?.actor;
  // Read the prepared (modified) value, never the import/base ST or the speaker.
  if (!actor || actor.testUserPermission?.(runtime.game.user, 'OBSERVER') === false) return null;
  return positive(actor.system?.attributes?.ST?.value) ? actor : null;
}

export function knockbackTargetContext(message, runtime = globalThis) {
  const saved = message?.flags?.[SCOPE]?.knockbackTargets;
  let targets;
  if (saved?.tokenIds?.length) {
    const scene = runtime.game?.scenes?.get(saved.sceneId);
    targets = saved.tokenIds.map(id => scene?.tokens?.get(id));
  } else if (!saved && message?.flags?.gurps?.transfer?.userTarget) {
    // Legacy native GGA has only this explicit target ID. Never search by name.
    targets = [runtime.canvas?.tokens?.get(message.flags.gurps.transfer.userTarget)];
  } else targets = [...(runtime.game?.user?.targets ?? [])];
  const actor = targets.length === 1 ? targetActor(targets[0], runtime) : null;
  return { strength: actor ? Number(actor.system.attributes.ST.value) : null,
    targets: targets.filter(t => targetActor(t, runtime)) };
}

async function askInputs(hit, context, runtime) {
  if (context.strength !== null && hit.type === 'cr') return { strength: context.strength, cuttingStopped: null };
  const targets = context.targets;
  const options = targets.map((t, i) => `<option value="${i}">${escapeHTML(t.name)}</option>`).join('');
  const answer = await runtime.foundry.applications.api.DialogV2.wait({
    window: { title: 'ST цели' }, position: { width: 390 }, modal: false, rejectClose: false,
    content: `${options ? `<label>Цель<select name="target"><option value="">Ввести ST вручную</option>${options}</select></label>` : ''}
      <label>ST цели<input name="strength" type="number" min="0.000001" step="any" required value="${context.strength ?? ''}"></label>
      ${hit.type === 'cut' ? '<label>Cutting: урон пробил DR?<select name="penetrated" required><option value="">Выберите условие</option><option value="no">Нет, DR остановила урон</option><option value="yes">Да, урон пробил DR</option></select></label>' : ''}`,
    render: (_event, dialog) => {
      const form = dialog.element.querySelector('form');
      form?.elements.target?.addEventListener('change', event => {
        const target = targets[Number(event.target.value)];
        const actor = event.target.value !== '' ? targetActor(target, runtime) : null;
        form.elements.strength.value = actor?.system.attributes.ST.value ?? '';
      });
    },
    buttons: [
      { action: 'calculate', label: 'Рассчитать', default: true, callback: (_event, button) => {
        const fields = button.form.elements;
        const strength = Number(fields.strength.value);
        const condition = fields.penetrated?.value;
        if (!positive(strength) || hit.type === 'cut' && !['yes', 'no'].includes(condition)) return false;
        return { strength, cuttingStopped: condition ? condition === 'no' : null };
      } },
      { action: 'cancel', label: 'Отмена', callback: () => false }
    ]
  });
  return answer && typeof answer === 'object' && positive(answer.strength) ? answer : null;
}

export async function reportDoubleKnockback(message, runtime = globalThis) {
  if (!readable(message)) return null;
  const hits = knockbackHits(message);
  if (!hits.length) return null;
  let hit = hits[0];
  if (hits.length > 1) {
    const answer = await runtime.foundry.applications.api.DialogV2.wait({
      window: { title: 'Выберите попадание с dkb' }, modal: false, rejectClose: false,
      content: `<label>Отдельное попадание / компонент<select name="hit" required><option value="">Выберите результат</option>${hits.map(h =>
        `<option value="${h.index}">№ ${h.index + 1}: ${h.damage} ${h.type} dkb</option>`).join('')}</select></label>`,
      buttons: [{ action: 'select', label: 'Выбрать', default: true,
        callback: (_event, button) => ({ index: button.form.elements.hit.value }) },
      { action: 'cancel', label: 'Отмена', callback: () => false }]
    });
    if (!answer || typeof answer !== 'object' || answer.index === '') return null;
    hit = hits.find(h => h.index === Number(answer.index));
    if (!hit) return null;
  }
  const inputs = await askInputs(hit, knockbackTargetContext(message, runtime), runtime);
  if (!inputs || !readable(message)) return null;
  const result = calculateDoubleKnockback(hit.damage, inputs.strength, hit.type, inputs.cuttingStopped);
  const outcome = result.yards ? `Результат: ${result.yards} ярдов (${result.yards} гексов).` : 'Цель не отброшена.';
  const balance = result.yards ? `<p>Проверка по наибольшему из DX, Acrobatics или Judo: ${result.balancePenalty || 'без штрафа'}. Perfect Balance: +4. При провале — падение (B378).</p>` : '';
  return runtime.ChatMessage.create({
    speaker: message.speaker, whisper: [...(message.whisper ?? [])], blind: !!message.blind,
    content: `<div class="olegurps-knockback"><strong>Отбрасывание:</strong><br>Базовый урон: ${hit.damage}<br>Double Knockback: ×2<br><strong>${outcome}</strong>${balance}<details class="olegurps-chat-details"><summary>Расчёт отбрасывания</summary>ST цели: ${inputs.strength}. Обычное отбрасывание: ${result.ordinary} ярдов.${hit.type === 'cut' ? (inputs.cuttingStopped ? ' Cutting не пробил DR.' : ' Cutting пробил DR: отбрасывания нет.') : ''} B104, B378.</details></div>`,
    flags: { [SCOPE]: { knockbackResult: { sourceMessageId: message.id, hitIndex: hit.index,
      basicDamage: hit.damage, strength: inputs.strength, cuttingStopped: inputs.cuttingStopped, ...result } } }
  });
}

export function installDoubleKnockback(runtime = globalThis) {
  if (installations.has(runtime.Hooks)) return installations.get(runtime.Hooks);
  const mark = (message, html) => {
    const root = html?.querySelector ? html : html?.[0];
    const existing = root?.querySelector('[data-olegurps-dkb]');
    if (!readable(message) || !knockbackHits(message).length) { existing?.remove(); return; }
    if (!root || existing) return;
    const button = runtime.document.createElement('button');
    button.type = 'button'; button.dataset.olegurpsDkb = 'true'; button.textContent = 'Рассчитать dkb';
    button.addEventListener('click', async event => {
      event.preventDefault(); event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      try { await reportDoubleKnockback(message, runtime); }
      catch (error) { runtime.console?.error?.('OleGURPS dkb:', error); runtime.ui?.notifications?.error?.('Не удалось рассчитать отбрасывание.'); }
      finally { button.disabled = false; }
    });
    // Append our own control, leaving every GGA result and Apply button intact.
    (root.querySelector('.message-content') ?? root).append(button);
  };
  const capture = message => {
    if (!knockbackHits(message).length) return;
    const sourceId = message.flags?.[SCOPE]?.damageLink?.originatingAttackMessageId;
    const source = sourceId && runtime.game.messages.get(sourceId);
    const attackTargets = source?.flags?.[SCOPE]?.knockbackTargets;
    const targets = attackTargets?.tokenIds?.length ? attackTargets : captureKnockbackTargets(runtime);
    message.updateSource({ [`flags.${SCOPE}.knockbackTargets`]: targets });
  };
  const hooks = [['preCreateChatMessage', runtime.Hooks.on('preCreateChatMessage', capture)],
    ['renderChatMessageHTML', runtime.Hooks.on('renderChatMessageHTML', mark)],
    ['renderChatMessage', runtime.Hooks.on('renderChatMessage', mark)]];
  for (const root of runtime.document?.querySelectorAll('[data-message-id]') ?? []) {
    const message = runtime.game?.messages?.get(root.dataset.messageId);
    if (message) mark(message, root);
  }
  const installation = { uninstall() { for (const [name, id] of hooks) runtime.Hooks.off(name, id); installations.delete(runtime.Hooks); } };
  installations.set(runtime.Hooks, installation);
  return installation;
}
