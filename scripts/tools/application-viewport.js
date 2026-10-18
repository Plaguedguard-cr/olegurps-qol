// Bounds belong to the ApplicationV2 shell; only its content should scroll.
const installations = new WeakMap();
export const VIEWPORT_WINDOW_CSS = `
  .gam-viewport-window { max-height:calc(100dvh - 16px); max-width:calc(100dvw - 16px); min-height:0; min-width:0; }
  .gam-viewport-window > .window-header { flex:0 0 auto; }
  .gam-viewport-window > .window-content { display:flex; flex-direction:column; min-height:0; overflow:hidden; }
  .gam-viewport-window > .window-content > .dialog-form { flex:1 1 auto; min-height:0; overflow:hidden; }
  .gam-viewport-window .dialog-content { flex:1 1 auto; min-height:0; overflow:auto; }
  .gam-viewport-window .gam-weapon-config { max-height:none; overflow:visible; }
  .gam-viewport-window .form-footer { flex:0 0 auto; }
`;

export function viewportPosition(rect, position, width, height) {
  const availableWidth = Math.max(1, width - 16), availableHeight = Math.max(1, height - 16);
  const boundedWidth = Math.min(rect.width, availableWidth), boundedHeight = Math.min(rect.height, availableHeight);
  const result = {};
  const left = Math.max(8, Math.min(rect.left, width - 8 - boundedWidth));
  const top = Math.max(8, Math.min(rect.top, height - 8 - boundedHeight));
  if (Math.abs(left - rect.left) > .5) result.left = left;
  if (Math.abs(top - rect.top) > .5) result.top = top;
  if (typeof position.width === 'number' && position.width > availableWidth) result.width = availableWidth;
  if (typeof position.height === 'number' && position.height > availableHeight) result.height = availableHeight;
  return result;
}

export function releaseViewportBounds(app) {
  installations.get(app)?.();
}

export function installViewportBounds(app) {
  const root = app.element;
  if (!root || installations.has(app)) return;
  root.classList.add('gam-viewport-window');
  const style = document.createElement('style');
  style.textContent = VIEWPORT_WINDOW_CSS;
  root.prepend(style);
  const view = root.ownerDocument?.defaultView ?? globalThis;
  const constrain = () => {
    if (!root.isConnected || app.rendered === false || app.minimized ||
        !Number.isFinite(app.position.left) || !Number.isFinite(app.position.top)) return;
    const change = viewportPosition(root.getBoundingClientRect(), app.position, view.innerWidth, view.innerHeight);
    if (Object.keys(change).length) app.setPosition(change);
  };
  const observer = new ResizeObserver(constrain);
  // Model selection can grow a dialog between animation frames (including a
  // throttled client). Clamp after DOM changes as well as viewport/size changes.
  const mutations = new MutationObserver(constrain);
  const dispose = () => {
    observer.disconnect();
    mutations.disconnect();
    view.removeEventListener('resize', constrain);
    app.removeEventListener?.('close', dispose);
    installations.delete(app);
  };
  installations.set(app, dispose);
  observer.observe(root);
  mutations.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
  view.addEventListener('resize', constrain);
  app.addEventListener?.('close', dispose, {once:true});
}
