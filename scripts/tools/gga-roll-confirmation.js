// GGA 0.18.23 has no per-roll preconfirmed API. Title matching is a known
// limitation: a foreign same-title dialog can still consume an active permit.
// This helper fixes restoration only; it does not establish dialog ownership.
const activeInterceptions = new WeakMap();

export async function performActionWithoutGgaConfirmation(callback, runtime = globalThis) {
  const DialogV2 = runtime.foundry?.applications?.api?.DialogV2;
  if (typeof DialogV2?.wait !== "function") return callback();
  const title = runtime.game?.i18n?.localize?.("GURPS.confirmRoll") ?? "Roll Confirmation";

  let state = activeInterceptions.get(DialogV2);
  if (!state) {
    state = { originalWait: DialogV2.wait, permits: new Set(), wait: null };
    state.wait = function(options, ...args) {
      // Newest outstanding permit first, as in the former nested wrappers.
      const permit = [...state.permits].reverse().find(entry =>
        !entry.bypassed && options?.window?.title === entry.title);
      if (permit) {
        permit.bypassed = true;
        const rollButton = options?.buttons?.find(button => button?.action === "roll")
          ?? options?.buttons?.find(button => button?.default === true);
        return typeof rollButton?.callback === "function"
          ? Promise.resolve(rollButton.callback(null, rollButton, null))
          : Promise.resolve(false);
      }
      return state.originalWait.call(this, options, ...args);
    };
    DialogV2.wait = state.wait;
    activeInterceptions.set(DialogV2, state);
  }

  const permit = {
    title,
    bypassed: false
  };
  state.permits.add(permit);
  try {
    return await callback();
  } finally {
    state.permits.delete(permit);
    if (state.permits.size === 0) {
      // Do not overwrite a later replacement installed by another caller.
      if (DialogV2.wait === state.wait) DialogV2.wait = state.originalWait;
      activeInterceptions.delete(DialogV2);
    }
  }
}
