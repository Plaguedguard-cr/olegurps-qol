import { getSuppressionHexAtCanvasPoint } from "./suppression-fire-region-service.js";

const sameHex = (left, right) => left?.offset?.i === right?.offset?.i &&
  left?.offset?.j === right?.offset?.j;

function drawHex(hex, kind, canvas, runtime) {
  const Graphics = runtime.PIXI?.Graphics;
  if (!hex?.vertices?.length || !Graphics || !canvas.stage?.addChild) return null;
  const marker = new Graphics();
  const points = hex.vertices.flatMap(vertex => [vertex.x, vertex.y]);
  const selected = kind === "selected";
  try {
    if (typeof marker.poly === "function") {
      marker.poly(points)
        .fill({ color: selected ? 0x8734bd : 0xa884df, alpha: selected ? 0.4 : 0.2 })
        .stroke({ color: selected ? 0xffffff : 0xc5a0ee, width: selected ? 3 : 2 });
    } else {
      marker.lineStyle?.(selected ? 3 : 2, selected ? 0xffffff : 0xc5a0ee);
      marker.beginFill?.(selected ? 0x8734bd : 0xa884df, selected ? 0.4 : 0.2);
      marker.drawPolygon?.(points);
      marker.endFill?.();
    }
    canvas.stage.addChild(marker);
    return marker;
  } catch (error) {
    marker.destroy?.();
    console.warn("OleGURPS QOL | Unable to highlight selected hex:", error);
    return null;
  }
}

function removeGraphic(graphic) {
  if (!graphic) return;
  try {
    graphic.parent?.removeChild?.(graphic);
    graphic.destroy?.();
  } catch (error) {
    console.warn("OleGURPS QOL | Unable to clear hex highlight:", error);
  }
}

export async function selectBlindFireHex(app, runtime = globalThis, signal = null) {
  if (signal?.aborted) return null;
  const canvas = runtime.canvas;
  const view = canvas?.app?.canvas ?? canvas?.app?.view;
  if (!view?.addEventListener || !canvas?.canvasCoordinatesFromClient ||
      !canvas?.grid?.getOffset || !canvas?.grid?.getCenterPoint) {
    throw new Error("Grid selection is unavailable.");
  }
  const instances = runtime.foundry?.applications?.instances;
  const openApplications = instances instanceof Map ? [...instances.values()] : Object.values(instances ?? {});
  const tokenId = app?.token?.id;
  const related = [...Object.values(runtime.ui?.windows ?? {}), ...openApplications].filter(window =>
    tokenId && (window?.id === "olegurps-shooting-assistant-" + tokenId ||
      window?.id?.startsWith("olegurps-special-fire-menu-" + tokenId + "-")));
  const windows = [...new Set([app, ...(app?.placementApps ?? []), ...related])].filter(window => window?.rendered);
  const restore = [];
  const hint = runtime.document?.createElement?.("div");
  let selected = null;
  let hovered = null;
  let selectedGraphic = null;
  let hoverGraphic = null;
  const atEvent = event => {
    const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
    return getSuppressionHexAtCanvasPoint(point, canvas.grid);
  };
  let move, click, key, hook;
  let cancelSelection = null;
  let canceled = false;
  let resolveAbort;
  const aborted = new Promise(resolve => { resolveAbort = resolve; });
  const abort = () => {
    canceled = true;
    resolveAbort();
    cancelSelection?.(null);
  };
  runtime.addEventListener?.("pagehide", abort);
  signal?.addEventListener?.("abort", abort, { once: true });
  hook = runtime.Hooks?.on?.("canvasTearDown", abort);
  if (signal?.aborted) abort();
  try {
    for (const window of windows) {
      if (window.minimized) continue;
      const transition = Promise.resolve().then(() => window.minimize())
        .then(() => ({ done: true }), error => ({ error }));
      restore.push({ window, transition });
      const result = await Promise.race([transition, aborted.then(() => ({ aborted: true }))]);
      if (result.aborted) return null;
      if (result.error) throw result.error;
    }
    if (canceled) return null;
    if (hint) {
      hint.className = "olegurps-spraying-hint";
      hint.textContent = "\u0421\u0442\u0440\u0435\u043b\u044c\u0431\u0430 \u043d\u0430\u0443\u0433\u0430\u0434: \u041b\u041a\u041c \u2014 \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u0433\u0435\u043a\u0441. Enter \u2014 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c. Esc \u2014 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c. \u041f\u041a\u041c \u2014 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435 \u043a\u0430\u043c\u0435\u0440\u044b.";
      runtime.document.body.append(hint);
    }
    return await new Promise(resolve => {
      let finished = false;
      const finish = value => {
        if (finished) return;
        finished = true;
        view.removeEventListener("mousemove", move, { capture: true });
        view.removeEventListener("click", click, { capture: true });
        runtime.removeEventListener?.("keydown", key, { capture: true });
        cancelSelection = null;
        resolve(value);
      };
      move = event => {
        const hex = atEvent(event);
        if (sameHex(hex, hovered)) return;
        removeGraphic(hoverGraphic);
        hoverGraphic = null;
        hovered = hex;
        if (hex && !sameHex(hex, selected))
          hoverGraphic = drawHex(hex, "hover", canvas, runtime);
      };
      click = event => {
        if (event.button !== 0) return;
        const hex = atEvent(event);
        if (!hex) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        selected = hex;
        removeGraphic(selectedGraphic);
        selectedGraphic = drawHex(hex, "selected", canvas, runtime);
        if (sameHex(hovered, selected)) {
          removeGraphic(hoverGraphic);
          hoverGraphic = null;
        }
      };
      key = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          finish(null);
        } else if (event.key === "Enter" && selected) {
          event.preventDefault();
          event.stopImmediatePropagation();
          finish(selected);
        }
      };
      cancelSelection = finish;
      view.addEventListener("mousemove", move, { capture: true });
      view.addEventListener("click", click, { capture: true });
      runtime.addEventListener?.("keydown", key, { capture: true });
      if (canceled) finish(null);
    });
  } finally {
    runtime.removeEventListener?.("pagehide", abort);
    signal?.removeEventListener?.("abort", abort);
    if (hook !== undefined) runtime.Hooks?.off?.("canvasTearDown", hook);
    removeGraphic(hoverGraphic);
    removeGraphic(selectedGraphic);
    hint?.remove();
    for (const { window, transition } of restore.reverse()) {
      if (signal?.aborted && window === app) continue;
      if (canceled) {
        void transition.then(() => {
          if (window.rendered && window.minimized) return window.maximize();
        }).catch(error => console.warn("OleGURPS QOL | Unable to restore selection window:", error));
      } else if (window.rendered && window.minimized) await window.maximize();
    }
  }
}
