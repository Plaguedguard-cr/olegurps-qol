import { angularOrder } from "./spraying-fire-service.js";
import { setSuppressionTargets } from "./suppression-fire-presentation.js";

export async function selectSprayingTargets(source, apps = [], runtime = globalThis, signal = null) {
  if (signal?.aborted) return null;
  const canvas = runtime.canvas;
  const view = canvas?.app?.canvas ?? canvas?.app?.view;
  if (!view?.addEventListener || !canvas?.canvasCoordinatesFromClient) {
    throw new Error("Canvas selection is unavailable.");
  }
  const previousTargets = Array.from(runtime.game?.user?.targets ?? []).map(token => token.id);
  const selected = new Map();
  const hiddenApps = [];
  for (const app of [...new Set(apps)].filter(app => app?.rendered)) {
    const element = app.element;
    if (!element?.style) continue;
    hiddenApps.push([element, element.style.visibility]);
    element.style.visibility = "hidden";
  }
  const hint = runtime.document?.createElement?.("div");
  if (hint) {
    hint.className = "olegurps-spraying-hint";
    hint.textContent = "Spraying Fire: \u041b\u041a\u041c \u2014 \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u0438\u043b\u0438 \u0441\u043d\u044f\u0442\u044c \u0446\u0435\u043b\u044c. Enter \u2014 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c. Esc \u2014 \u043e\u0442\u043c\u0435\u043d\u0430. \u041f\u041a\u041c \u2014 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435 \u043a\u0430\u043c\u0435\u0440\u044b.";
    runtime.document.body.append(hint);
  }
  const update = () => setSuppressionTargets([...selected.keys()], runtime);
  let onClick;
  let onKey;
  let onAbort;
  let canvasHookId;
  try {
    return await new Promise(resolve => {
      const finish = result => {
        view.removeEventListener("click", onClick, true);
        runtime.removeEventListener?.("keydown", onKey, true);
        runtime.removeEventListener?.("pagehide", onAbort);
        signal?.removeEventListener?.("abort", onAbort);
        if (canvasHookId !== undefined) runtime.Hooks?.off?.("canvasTearDown", canvasHookId);
        resolve(result);
      };
      onClick = event => {
        if (event.button !== 0) return;
        const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
        const token = [...(canvas.tokens?.placeables ?? [])].reverse().find(entry => {
          const document = entry.document;
          if (!entry.visible || document?.hidden || entry.id === source.id) return false;
          const x = Number(document?.x), y = Number(document?.y);
          return point.x >= x && point.x <= x + entry.w && point.y >= y && point.y <= y + entry.h;
        });
        if (!token) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (selected.has(token.id)) selected.delete(token.id);
        else {
          const candidates = [...selected.values(), token];
          if (candidates.length >= 2 && !angularOrder(source, candidates).valid) {
            runtime.ui?.notifications?.warn?.("\u0426\u0435\u043b\u044c \u0432\u043d\u0435 \u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u043e\u0433\u043e \u0441\u0435\u043a\u0442\u043e\u0440\u0430 30\u00b0");
            return;
          }
          selected.set(token.id, token);
        }
        update();
      };
      onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          finish(null);
        } else if (event.key === "Enter") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (selected.size < 2) {
            runtime.ui?.notifications?.warn?.("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u0435 \u043c\u0435\u043d\u0435\u0435 \u0434\u0432\u0443\u0445 \u0446\u0435\u043b\u0435\u0439");
            return;
          }
          finish([...selected.values()]);
        }
      };
      onAbort = () => finish(null);
      view.addEventListener("click", onClick, true);
      runtime.addEventListener?.("keydown", onKey, true);
      runtime.addEventListener?.("pagehide", onAbort);
      signal?.addEventListener?.("abort", onAbort, { once: true });
      canvasHookId = runtime.Hooks?.on?.("canvasTearDown", onAbort);
      if (signal?.aborted) finish(null);
    });
  } finally {
    hint?.remove();
    setSuppressionTargets(previousTargets, runtime);
    for (const [element, visibility] of hiddenApps.reverse()) element.style.visibility = visibility;
  }
}