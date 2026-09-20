const MINIMUM_DAMAGE_TEXT = "Ты же знаешь, что критические успехи на урон не распространяются?";

function rollDiceResults(roll) {
  return (roll?.dice ?? []).flatMap(die =>
    (die?.results ?? [])
      .filter(result => result?.active !== false && result?.discarded !== true)
      .map(result => Number(result?.result))
      .filter(Number.isFinite)
  );
}

export function isMinimumDamageRoll(roll) {
  const results = rollDiceResults(roll);
  return results.length >= 3 && results.every(result => result === 1);
}

export function messageHasMinimumDamageRoll(message) {
  const rolls = [
    ...(message?.rolls ?? []),
    ...((message?.flags?.gurps?.transfer?.payload ?? []).map(entry => entry?.roll))
  ].filter(Boolean);
  return rolls.some(isMinimumDamageRoll);
}

function isGgaDamageMessage(message, actor) {
  const transfer = message?.flags?.gurps?.transfer;
  if (!transfer || String(transfer.type ?? "").toLowerCase() !== "damageitem") return false;
  if (actor?.id && message?.speaker?.actor && message.speaker.actor !== actor.id) return false;
  const userId = message?.user?.id ?? message?.user;
  return !globalThis.game?.user?.id || !userId || userId === globalThis.game.user.id;
}

async function appendMinimumDamageText(message) {
  if (!messageHasMinimumDamageRoll(message)) return;
  const content = String(message?.content ?? message?._source?.content ?? "");
  if (!content || content.includes(MINIMUM_DAMAGE_TEXT)) return;
  await message.update?.({
    content: `${content}<p class="olegurps-damage-easter-egg"><em>${MINIMUM_DAMAGE_TEXT}</em></p>`
  });
}

function captureNextDamageMessage(actor, timeoutMs = 1500) {
  const hooks = globalThis.Hooks;
  if (!hooks?.on || !hooks?.off) return { promise: Promise.resolve(), cancel() {} };
  let hookId = null;
  let timer = null;
  let settled = false;
  let finish;
  const promise = new Promise(resolve => {
    finish = async message => {
      if (settled) return;
      settled = true;
      if (hookId !== null) hooks.off("createChatMessage", hookId);
      if (timer !== null) globalThis.clearTimeout(timer);
      try {
        if (message) await appendMinimumDamageText(message);
      } catch (error) {
        console.error("OleGURPS QOL: не удалось добавить damage-пасхалку.", error);
      } finally {
        resolve();
      }
    };
    hookId = hooks.on("createChatMessage", message => {
      if (isGgaDamageMessage(message, actor)) void finish(message);
    });
    timer = globalThis.setTimeout(() => void finish(null), timeoutMs);
  });
  return { promise, cancel: () => void finish?.(null) };
}

export async function createGgaDamageWithEasterEgg({ DamageChat, actor, args }) {
  const capture = captureNextDamageMessage(actor);
  try {
    const result = await DamageChat.create(...args);
    await capture.promise;
    return result;
  } catch (error) {
    capture.cancel();
    throw error;
  }
}