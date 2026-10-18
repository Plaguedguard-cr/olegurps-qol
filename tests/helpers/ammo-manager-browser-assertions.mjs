// Runs against real ApplicationV2 elements in a connected browser; no Node APIs.
export function verifyAmmoManagerViewport(root, {width, height, expectOverflow = true} = {}) {
  const view = root.ownerDocument?.defaultView ?? globalThis;
  width ??= view.innerWidth; height ??= view.innerHeight;
  const checks = [], window = root.getBoundingClientRect();
  const assert = (name, condition) => {if (!condition) throw Error(name); checks.push(name);};
  assert('window inside viewport',window.left>=-1&&window.top>=-1&&window.right<=width+1&&window.bottom<=height+1);
  for (const selector of ['.window-header','[data-action="close"]','.gam-toolbar','.form-footer']) {
    const element = root.querySelector(selector);if (!element) continue;
    const rect = element.getBoundingClientRect();
    assert(selector+' inside window',rect.left>=window.left-1&&rect.top>=window.top-1&&rect.right<=window.right+1&&rect.bottom<=window.bottom+1);
  }
  const scroll = root.querySelector('.gam-weapon-list') ?? root.querySelector('.dialog-content');
  assert('scroll container available',!!scroll&&scroll.clientHeight>20);
  if (expectOverflow) assert('content scrolls internally',scroll.scrollHeight>scroll.clientHeight+10);
  return checks;
}
