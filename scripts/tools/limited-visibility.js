export const VISIBILITY_MODES = Object.freeze({
  partial: "partial", unseen: "unseen", known: "known", blind: "blind"
});

export function visibilityRules(state) {
  const mode = state?.mode;
  if (!Object.values(VISIBILITY_MODES).includes(mode)) return null;
  const partial = Number(state?.partialPenalty);
  const penalty = mode === "partial"
    ? (Number.isInteger(partial) && partial <= -1 && partial >= -9 ? partial : -1)
    : mode === "unseen" ? state?.location === "exact" ? -4 : -6
      : mode === "known" ? -4 : state?.accustomed ? -6 : -10;
  return { penalty, blind: mode === "blind", random: mode !== "partial", aimAllowed: mode === "partial" };
}

export function meleeVisibilityRules(state, blindFightingSuccess = false) {
  const rules = visibilityRules(state);
  if (!rules) return null;
  if (blindFightingSuccess) return { penalty: 0, cap: false, random: false, precisionPenalty: -2 };
  return {
    penalty: rules.random ? Math.min(-5, rules.penalty) : rules.penalty,
    cap: rules.random,
    random: rules.random,
    precisionPenalty: 0
  };
}

export async function checkHearingMinusTwo(actor, manualLevel = null) {
  const actorLevel = Number(actor?.system?.hearing);
  const level = Number.isInteger(actorLevel) && actorLevel > 0 ? actorLevel : manualLevel;
  if (!Number.isInteger(level) || level <= 0) {
    globalThis.ui?.notifications?.warn?.("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 Hearing \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e.");
    return null;
  }
  const otf = Number.isInteger(actorLevel) && actorLevel > 0 ? "[Hearing -2]" : `[Hearing${level} -2]`;
  return !!(await globalThis.GURPS.executeOTF(otf, false, null, actor));
}

export function normalizeVisibility(state) {
  if (!visibilityRules(state)) return null;
  return {
    mode: state.mode,
    partialPenalty: visibilityRules(state).penalty,
    accustomed: state.accustomed === true,
    hearing: ["success", "failure"].includes(state.hearing) ? state.hearing : null,
    knownLocation: state.knownLocation === true,
    location: ["approximate", "exact", "hex"].includes(state.location) ? state.location : "unknown",
    locationMethod: ["hearing", "other", "blind-fire"].includes(state.locationMethod)
      ? state.locationMethod : null,
    targetTokenId: typeof state.targetTokenId === "string" && state.targetTokenId ? state.targetTokenId : null,
    blindFireHex: state.blindFireHex && Number.isInteger(state.blindFireHex.i) && Number.isInteger(state.blindFireHex.j)
      ? { i: state.blindFireHex.i, j: state.blindFireHex.j } : null,
    hex: state.hex && Number.isInteger(state.hex.i) && Number.isInteger(state.hex.j)
      ? { i: state.hex.i, j: state.hex.j } : null
  };
}
