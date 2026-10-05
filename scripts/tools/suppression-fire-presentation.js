import { getSafeTargetName, TARGET_NAME_FALLBACK } from "./foundry-targets.js";

const valuesOf = collection => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  try { return Array.from(collection.values?.() ?? collection); }
  catch (_error) { return []; }
};

export const SUPPRESSION_TARGET_FALLBACK = TARGET_NAME_FALLBACK;

export function suppressionTargetId(token) {
  const id = token?.document?.id ?? token?.id;
  return id === undefined || id === null || id === "" ? null : String(id);
}

export function setSuppressionTargets(targetIds = [], runtime = globalThis) {
  const ids = [...new Set(valuesOf(targetIds).map(String).filter(Boolean))];
  const tokenLayer = runtime.canvas?.tokens;
  if (typeof tokenLayer?.setTargets === "function") {
    tokenLayer.setTargets(ids, { mode: "replace" });
    return true;
  }
  const updateTokenTargets = runtime.game?.user?.updateTokenTargets;
  if (typeof updateTokenTargets === "function") {
    return updateTokenTargets.call(runtime.game.user, ids);
  }
  return false;
}

export const getSafeSuppressionTargetName = getSafeTargetName;

export function selectSuppressionManualTarget(targets, preferredToken = null) {
  const entries = valuesOf(targets).filter(token => suppressionTargetId(token));
  const preferredId = suppressionTargetId(preferredToken);
  if (preferredId) return preferredToken;
  return entries.at(-1) ?? null;
}
