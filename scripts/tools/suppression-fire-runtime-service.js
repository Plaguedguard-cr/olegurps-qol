import { isSuppressionFireAuthority } from "./suppression-fire-session-service.js";
import { getSafeSuppressionTargetName, SUPPRESSION_TARGET_FALLBACK } from "./suppression-fire-presentation.js";

const contexts = new Map();
const occupancy = new Map();
const pending = new Set();
const queue = [];
let processing = false;
let currentDialog = null;
let currentDialogSessionId = null;
let hooksRegistered = false;

const valuesOf = collection => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  try { return Array.from(collection.values?.() ?? collection); }
  catch (_error) { return []; }
};

const integer = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

const escapeHTML = value => globalThis.foundry?.utils?.escapeHTML
  ? globalThis.foundry.utils.escapeHTML(String(value ?? ""))
  : String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

const pairKey = (sessionId, zoneIndex, tokenId) =>
  String(sessionId) + ":" + integer(zoneIndex) + ":" + String(tokenId);

function currentSession(context) {
  return context?.sessionService?.session ?? null;
}

function liveToken(document, runtime = globalThis) {
  const tokenDocument = document?.document ?? document;
  if (tokenDocument?.documentName === "Token" || typeof tokenDocument?.testInsideRegion === "function") {
    return tokenDocument;
  }
  const id = tokenDocument?.id;
  return runtime.canvas?.tokens?.get?.(id) ?? document?.object ?? document;
}

function tokenInsideRegion(token, region) {
  if (!token || !region) return false;
  const document = token.document ?? token;
  try {
    if (typeof document.testInsideRegion === "function") return !!document.testInsideRegion(region);
  } catch (_error) {
    // Fall through to the Region token collection.
  }
  return valuesOf(region.tokens).some(entry =>
    String(entry?.id ?? entry?.document?.id ?? "") === String(document.id ?? "")
  );
}

function tokenInsidePair(token, pair) {
  return tokenInsideRegion(token, pair?.target) || tokenInsideRegion(token, pair?.corridor);
}

function isLiveActiveContext(context) {
  const session = currentSession(context);
  return !!session?.active && session?.state === "active" && session?.mode === "automatic" &&
    isSuppressionFireAuthority(session, context.runtime ?? globalThis);
}

function findPair(context, zoneIndex) {
  const session = currentSession(context);
  return context.regionService?.getZonePairs?.(session?.zoneCount ?? 0)?.get?.(integer(zoneIndex)) ?? null;
}

async function showConfirmation(request, runtime = globalThis) {
  const DialogV2 = runtime.foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.wait) throw new Error("Foundry DialogV2 is unavailable.");
  const sign = value => Number(value) >= 0 ? "+" + Number(value) : String(Number(value));
  const heightText = Number(request.height) > 0
    ? Number(request.height) + " ярдов" +
      (request.highGround ? " (стрелок выше)" : "")
    : "0";
  const targetName = getSafeSuppressionTargetName(request.target, runtime);
  const targetLine = targetName === SUPPRESSION_TARGET_FALLBACK
    ? '<p><strong>' + escapeHTML(targetName) + '</strong></p>'
    : '<p><strong>Цель:</strong> ' + escapeHTML(targetName) + '</p>';
  return DialogV2.wait({
    window: {
      title: "Подавляющий огонь — Зона " + (request.zoneIndex + 1)
    },
    position: { width: 430 },
    content: '<div class="standard-form">' +
      targetLine +
      '<p><strong>Расстояние:</strong> ' + escapeHTML(request.distance) + ' ярдов</p>' +
      '<p><strong>Высота:</strong> ' + escapeHTML(heightText) + '</p>' +
      '<p><strong>RF:</strong> ' + escapeHTML(sign(request.rapidFireBonus)) + '</p>' +
      '<p><strong>Расчётное умение:</strong> ' + escapeHTML(request.uncappedSkill) + '</p>' +
      '<p><strong>Cap:</strong> ' + escapeHTML(request.cap) + '</p>' +
      '<p><strong>Эффективное умение:</strong> ' + escapeHTML(request.effectiveSkill) + '</p>' +
      '<p><strong>Осталось попаданий:</strong> ' + escapeHTML(request.hitsRemaining) + '</p>' +
      '</div>',
    buttons: [
      {
        action: "attack",
        label: "Атаковать",
        icon: "fa-solid fa-crosshairs",
        default: true,
        callback: () => "attack"
      },
      {
        action: "skip",
        label: "Пропустить",
        icon: "fa-solid fa-forward",
        callback: () => "skip"
      }
    ],
    render: (_event, dialog) => { currentDialog = dialog; },
    close: () => { currentDialog = null; },
    rejectClose: false,
    modal: false
  });
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const entry = queue.shift();
      const { context, request, key } = entry;
      try {
        if (!isLiveActiveContext(context)) continue;
        const live = currentSession(context);
        const zone = live?.zones?.[request.zoneIndex];
        if (!zone || zone.depleted || zone.hitsRemaining <= 0) continue;
        request.hitsRemaining = zone.hitsRemaining;
        currentDialogSessionId = request.sessionId;
        const decision = await showConfirmation(request, context.runtime ?? globalThis);
        currentDialog = null;
        currentDialogSessionId = null;
        if (decision !== "attack" || !isLiveActiveContext(context)) continue;
        const currentZone = currentSession(context)?.zones?.[request.zoneIndex];
        if (!currentZone || currentZone.depleted) continue;
        await context.executeRequest?.(request);
        await context.onSessionChange?.(currentSession(context));
      } catch (error) {
        console.error("OleGURPS QOL | Suppression Fire confirmation:", error);
        (context.runtime ?? globalThis).ui?.notifications?.error?.(error?.message ?? String(error));
      } finally {
        pending.delete(key);
      }
    }
  } finally {
    processing = false;
  }
}

async function enqueuePotentialAttack(context, zoneIndex, token, event = {}) {
  if (!isLiveActiveContext(context)) return false;
  const session = currentSession(context);
  const zone = session?.zones?.[zoneIndex];
  const tokenId = String(token?.document?.id ?? token?.id ?? "");
  if (!tokenId || tokenId === String(session.sourceTokenId ?? "") || !zone || zone.depleted) return false;
  const key = pairKey(session.sessionId, zoneIndex, tokenId);
  if (pending.has(key)) return false;
  pending.add(key);
  try {
    const request = await context.buildRequest?.(zoneIndex, token, {
      movementId: event.movementId ?? null,
      position: {
        x: Number((token.document ?? token)?.x ?? 0),
        y: Number((token.document ?? token)?.y ?? 0),
        elevation: Number((token.document ?? token)?.elevation ?? 0)
      }
    });
    if (!request) {
      pending.delete(key);
      return false;
    }
    queue.push({ context, request: { ...request, sessionId: session.sessionId, zoneIndex, tokenId }, key });
    void processQueue();
    return true;
  } catch (error) {
    pending.delete(key);
    throw error;
  }
}

export function registerSuppressionFireRuntimeContext(sessionId, context) {
  const id = String(sessionId ?? "");
  if (!id) throw new Error("Suppression Fire session id is required.");
  contexts.set(id, { ...context, runtime: context.runtime ?? globalThis });
  return () => {
    if (contexts.get(id)?.sessionService === context.sessionService) contexts.delete(id);
  };
}

export async function activateSuppressionFireRuntime(sessionId) {
  const id = String(sessionId ?? "");
  const context = contexts.get(id);
  if (!context || !isLiveActiveContext(context)) return false;
  const session = currentSession(context);
  const pairs = context.regionService.getZonePairs(session.zoneCount);
  for (const token of context.runtime.canvas?.tokens?.placeables ?? []) {
    const tokenId = String(token?.document?.id ?? token?.id ?? "");
    if (!tokenId || tokenId === String(session.sourceTokenId ?? "")) continue;
    for (const zone of session.zones) {
      if (zone.depleted) continue;
      const key = pairKey(id, zone.zoneIndex, tokenId);
      const wasInside = occupancy.get(key) === true;
      const inside = tokenInsidePair(token, pairs.get(zone.zoneIndex));
      occupancy.set(key, inside);
      if (inside && !wasInside) {
        await enqueuePotentialAttack(context, zone.zoneIndex, token, { movementId: "activation" });
      }
    }
  }
  return true;
}

export function stopSuppressionFireRuntime(sessionIds) {
  const ids = new Set((Array.isArray(sessionIds) ? sessionIds : [sessionIds]).map(String));
  for (const id of ids) {
    const context = contexts.get(id);
    void context?.onEnded?.();
    contexts.delete(id);
  }
  for (const key of [...occupancy.keys()]) {
    if (ids.has(key.split(":")[0])) occupancy.delete(key);
  }
  for (const key of [...pending]) {
    if (ids.has(key.split(":")[0])) pending.delete(key);
  }
  for (let index = queue.length - 1; index >= 0; index--) {
    if (ids.has(String(queue[index]?.request?.sessionId ?? ""))) queue.splice(index, 1);
  }
  if (currentDialogSessionId && ids.has(String(currentDialogSessionId))) {
    void currentDialog?.close?.();
    currentDialog = null;
    currentDialogSessionId = null;
  }
}

async function onTokenUpdate(document, changes, options, _userId, runtime) {
  if (!["x", "y", "elevation"].some(key => Object.hasOwn(changes ?? {}, key))) return;
  const token = liveToken(document, runtime);
  const tokenId = String(document?.id ?? token?.id ?? "");
  if (!tokenId) return;
  for (const [sessionId, context] of contexts) {
    const session = currentSession(context);
    if (!isLiveActiveContext(context) ||
        String(session?.sceneId ?? "") !== String(document?.parent?.id ?? runtime.canvas?.scene?.id ?? "") ||
        tokenId === String(session?.sourceTokenId ?? "")) continue;
    const pairs = context.regionService.getZonePairs(session.zoneCount);
    for (const zone of session.zones) {
      if (zone.depleted) continue;
      const key = pairKey(sessionId, zone.zoneIndex, tokenId);
      const before = occupancy.get(key) === true;
      const inside = tokenInsidePair(token, pairs.get(zone.zoneIndex));
      occupancy.set(key, inside);
      if (!before && inside) {
        await enqueuePotentialAttack(context, zone.zoneIndex, token, {
          movementId: options?._id ?? options?.movementId ?? null
        });
      }
    }
  }
}

export function registerSuppressionFireRuntimeHooks(runtime = globalThis) {
  if (hooksRegistered || !runtime.Hooks?.on) return;
  hooksRegistered = true;
  runtime.Hooks.on("updateToken", (document, changes, options, userId) => {
    void onTokenUpdate(document, changes, options, userId, runtime).catch(error => {
      console.error("OleGURPS QOL | Suppression Fire movement:", error);
    });
  });
  runtime.Hooks.on("olegurpsQolSuppressionFireEnded", sessionIds => {
    stopSuppressionFireRuntime(sessionIds);
  });
}
