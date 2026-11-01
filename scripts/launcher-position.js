const GAP = 8;
export function clampLauncherPosition(point, viewport, size) {
  const left = viewport.left ?? 0, top = viewport.top ?? 0;
  const maxX = left + Math.max(0, viewport.width - size.width);
  const maxY = top + Math.max(0, viewport.height - size.height);
  return { x: Math.min(maxX, Math.max(left, point.x)), y: Math.min(maxY, Math.max(top, point.y)) };
}
function overlaps(point, size, rect) {
  return point.x < rect.right + GAP && point.x + size.width > rect.left - GAP &&
    point.y < rect.bottom + GAP && point.y + size.height > rect.top - GAP;
}

export function customLauncherPosition(point, hotbar, viewport, size) {
  const clamped = clampLauncherPosition(point, viewport, size);
  if (!hotbar || !overlaps(clamped, size, hotbar)) return clamped;
  const candidates = [
    { x: hotbar.left - size.width - GAP, y: clamped.y },
    { x: hotbar.right + GAP, y: clamped.y },
    { x: clamped.x, y: hotbar.top - size.height - GAP },
    { x: clamped.x, y: hotbar.bottom + GAP }
  ].map(candidate => clampLauncherPosition(candidate, viewport, size))
    .filter(candidate => !overlaps(candidate, size, hotbar));
  const distance = candidate => (candidate.x - clamped.x) ** 2 + (candidate.y - clamped.y) ** 2;
  return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? clamped;
}

// Rectangles are measured in viewport CSS pixels; no GGA DOM is moved or modified.
export function launcherPosition(preferences, anchors, viewport, size) {
  const bottomLeft = { x: (viewport.left ?? 0) + 16, y: (viewport.top ?? 0) + viewport.height - size.height - 16 };
  if (preferences.position === 'custom' && preferences.custom) {
    return customLauncherPosition(preferences.custom, anchors.hotbar, viewport, size);
  }
  const anchor = preferences.position === 'controls' ? anchors.controls :
    preferences.position.startsWith('hotbar') ? anchors.hotbar : anchors.bucket ?? anchors.hotbar;
  let preferred = bottomLeft;
  if (anchor) {
    const right = ['hotbar-right', 'controls'].includes(preferences.position);
    preferred = { x: right ? anchor.right + GAP : anchor.left - size.width - GAP,
      y: preferences.position === 'controls' ? Math.max(anchor.top, (anchors.navigation?.bottom ?? anchor.top - GAP) + GAP) : anchor.bottom - size.height };
  }
  const candidates = [preferred];
  if (anchor) candidates.push(
    { x: preferred.x, y: anchor.top - size.height - GAP },
    { x: preferred.x, y: anchor.top },
    { x: anchor.left, y: anchor.top - size.height - GAP }
  );
  candidates.push(bottomLeft);
  const obstacles = Object.values(anchors).filter(Boolean);
  const positions = candidates.map(point => clampLauncherPosition(point, viewport, size));
  return positions.find(point => !obstacles.some(rect => overlaps(point, size, rect))) ?? positions[0];
}
