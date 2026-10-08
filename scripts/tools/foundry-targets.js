export const TARGET_NAME_FALLBACK = "\u0426\u0435\u043b\u044c";

export function getSafeTargetName(token, runtime = globalThis) {
  const document = token?.document ?? token;
  const modes = runtime.CONST?.TOKEN_DISPLAY_MODES;
  const displayName = document?.displayName;
  const visibleToEveryone = displayName === modes?.HOVER || displayName === modes?.ALWAYS;
  if (document?.hidden === true || !visibleToEveryone) return TARGET_NAME_FALLBACK;
  const name = String(document?.name ?? token?.name ?? "").trim();
  return name || TARGET_NAME_FALLBACK;
}

export function replaceFoundryTargets(ids, runtime = globalThis) {
  const layer = runtime.canvas?.tokens;
  if (typeof layer?.setTargets === "function") {
    return layer.setTargets(ids, { mode: "replace" });
  }
  const user = runtime.game?.user;
  if (typeof user?.updateTokenTargets === "function") {
    return user.updateTokenTargets(ids);
  }
  throw new Error("Foundry target API is unavailable.");
}

export async function withFoundryTargets(ids, operation, runtime = globalThis) {
  const previous = [...(runtime.game?.user?.targets ?? [])].map(token => token?.document?.id ?? token?.id);
  if (previous.some(id => !id)) throw new Error("Cannot restore a Foundry target without its ID.");
  const desired = ids.filter(Boolean);
  if (previous.length === desired.length && previous.every((id, index) => id === desired[index])) return operation();
  try {
    await replaceFoundryTargets(desired, runtime);
    return await operation();
  } finally {
    await replaceFoundryTargets(previous, runtime);
  }
}
export async function clearFoundryTargets(runtime = globalThis) {
  if ((runtime.game?.user?.targets?.size ?? 0) > 0) await replaceFoundryTargets([], runtime);
}

export async function withClearedFoundryTargets(roll, runtime = globalThis) {
  const targets = [...(runtime.game?.user?.targets ?? [])];
  if (!targets.length) return roll();
  const previous = targets.map(token => token?.document?.id ?? token?.id);
  if (previous.some(id => id === null || id === undefined || id === "")) {
    throw new Error("Cannot restore a Foundry target without its ID.");
  }
  try {
    await replaceFoundryTargets([], runtime);
    return await roll();
  } finally {
    await replaceFoundryTargets(previous, runtime);
  }
}
