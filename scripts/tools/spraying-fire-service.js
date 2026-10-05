import { measureTokenDistanceYards } from "./fire-control-context.js";

const TAU = Math.PI * 2;
const radians = degrees => degrees * Math.PI / 180;

export function tokenCenter(token) {
  const document = token?.document ?? token;
  if (!document) return null;
  const width = Number(token?.w ?? document.width * (globalThis.canvas?.grid?.size ?? 0));
  const height = Number(token?.h ?? document.height * (globalThis.canvas?.grid?.size ?? 0));
  const x = Number(document.x);
  const y = Number(document.y);
  return [x, y, width, height].every(Number.isFinite)
    ? { x: x + width / 2, y: y + height / 2 } : null;
}

export function angularOrder(source, targets, direction = "left-to-right") {
  const origin = tokenCenter(source);
  if (!origin) return { valid: false, ordered: [], span: Infinity };
  const entries = targets.map(target => {
    const center = tokenCenter(target);
    if (!center) return null;
    const angle = (Math.atan2(center.y - origin.y, center.x - origin.x) + TAU) % TAU;
    return { target, angle };
  });
  if (entries.some(entry => !entry)) return { valid: false, ordered: [], span: Infinity };
  if (entries.length < 2) return { valid: true, ordered: [...targets], span: 0 };
  entries.sort((a, b) => a.angle - b.angle);
  let largestGap = -1;
  let gapIndex = 0;
  for (let index = 0; index < entries.length; index++) {
    const next = entries[(index + 1) % entries.length].angle + (index === entries.length - 1 ? TAU : 0);
    const gap = next - entries[index].angle;
    if (gap > largestGap) { largestGap = gap; gapIndex = index; }
  }
  const span = TAU - largestGap;
  const ordered = [...entries.slice(gapIndex + 1), ...entries.slice(0, gapIndex + 1)].map(entry => entry.target);
  if (direction === "right-to-left") ordered.reverse();
  return { valid: span <= radians(30) + 1e-9, ordered, span: span * 180 / Math.PI };
}

export function sprayingCapacity(profile, loaded, totalAmmo) {
  const available = Math.max(0, Math.min(Math.trunc(Number(loaded) || 0), Math.trunc(Number(totalAmmo) || 0)));
  const modes = profile?.type === "full-auto" ? profile.modes
    : [{ index: 0, fullRoF: profile?.baseRoF ?? 0, minRoF: 1, label: profile?.display ?? "" }];
  const eligibleModes = modes.filter(mode => mode.fullRoF >= 5);
  const usableModes = eligibleModes.filter(mode => available >= Math.max(2, mode.minRoF));
  const reason = !profile?.valid ? "\u041d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u043e \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0435\u0435 \u043e\u0440\u0443\u0436\u0438\u0435"
    : !eligibleModes.length ? "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u044b\u0439 RoF: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f 5+"
      : !usableModes.length ? "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0431\u043e\u0435\u043f\u0440\u0438\u043f\u0430\u0441\u043e\u0432" : null;
  return { available, modes: eligibleModes, usableModes, eligible: !reason, reason };
}

export function planSprayingFire({ source, targets, direction, fullRoF, minRoF, preserveOrder = false, measure = measureTokenDistanceYards } = {}) {
  const ordered = angularOrder(source, targets, direction);
  if (!ordered.valid || ordered.ordered.length < 2) return { valid: false, reason: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u0435 \u043c\u0435\u043d\u0435\u0435 \u0434\u0432\u0443\u0445 \u0446\u0435\u043b\u0435\u0439 \u0432 \u0441\u0435\u043a\u0442\u043e\u0440\u0435 30\u00b0" };
  const wastePerYard = fullRoF > 16 ? 2 : 1;
  const sequence = preserveOrder ? targets : ordered.ordered;
  const rows = sequence.map((target, index) => {
    const previous = sequence[index - 1];
    const traverseDistance = previous ? measure(previous, target) : 0;
    const wastedShots = previous && Number.isFinite(traverseDistance)
      ? Math.ceil(traverseDistance) * wastePerYard : 0;
    return { target, traverseDistance, wastedShots, effectiveRclOffset: index };
  });
  if (rows.some(row => !Number.isFinite(row.traverseDistance))) {
    return { valid: false, reason: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u0440\u0438\u0442\u044c \u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044e \u043f\u0435\u0440\u0435\u043d\u043e\u0441\u0430" };
  }
  const waste = rows.reduce((sum, row) => sum + row.wastedShots, 0);
  const minimum = Math.max(Number(minRoF) || 1, rows.length + waste);
  return { valid: minimum <= fullRoF, reason: minimum <= fullRoF ? null : "\u0426\u0435\u043b\u0438 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0434\u0430\u043b\u0435\u043a\u043e \u0434\u0440\u0443\u0433 \u043e\u0442 \u0434\u0440\u0443\u0433\u0430 \u0434\u043b\u044f RoF", rows, waste, minimum, fullRoF };
}