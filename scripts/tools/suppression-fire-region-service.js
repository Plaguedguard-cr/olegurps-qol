import { getSuppressionRegionFlag, getSuppressionWeaponKey } from "./suppression-fire-session-service.js";
import { getSafeSuppressionTargetName } from "./suppression-fire-presentation.js";

const MODULE_ID = "olegurps-qol";
const ZONE_WIDTH_YARDS = 2;
const ZONE_STYLES = [
  { target: "#dc3c3c", corridor: "#7f3030" },
  { target: "#e06f32", corridor: "#87502f" },
  { target: "#d6a62e", corridor: "#806b2d" },
  { target: "#b85cba", corridor: "#744477" },
  { target: "#3f8fc9", corridor: "#315f7c" }
];

const finite = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const valuesOf = collection => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  try { return Array.from(collection.values?.() ?? collection); }
  catch (_error) { return []; }
};

export function sceneUnitYards(units) {
  const value = String(units ?? "").trim().toLowerCase().replaceAll(".", "");
  if (["yd", "yds", "yard", "yards", "\u044f\u0440\u0434", "\u044f\u0440\u0434\u0430", "\u044f\u0440\u0434\u044b"].includes(value)) return 1;
  if (["ft", "foot", "feet", "\u0444\u0443\u0442", "\u0444\u0443\u0442\u0430", "\u0444\u0443\u0442\u044b"].includes(value)) return 1 / 3;
  if (["m", "meter", "meters", "metre", "metres", "\u043c\u0435\u0442\u0440", "\u043c\u0435\u0442\u0440\u0430", "\u043c\u0435\u0442\u0440\u044b"].includes(value)) {
    return 1.0936132983;
  }
  if (["cm", "centimeter", "centimeters", "centimetre", "centimetres", "\u0441\u043c"].includes(value)) {
    return 0.010936132983;
  }
  return null;
}

export function buildGridOffsets(cellsAcross, { hexagonal = false } = {}) {
  const count = Math.max(1, Math.trunc(Number(cellsAcross) || 1));
  if (hexagonal) return Array.from({ length: count }, (_entry, j) => ({ i: 0, j }));
  const offsets = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) offsets.push({ i, j });
  }
  return offsets;
}

export function resolveSuppressionZoneGeometry({
  isGridless = false,
  isHexagonal = false,
  gridDistance,
  gridSize,
  gridUnits,
  distancePixels
} = {}) {
  const yardsPerUnit = sceneUnitYards(gridUnits);
  if (!yardsPerUnit) {
    return { valid: false, error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0435\u0434\u0438\u043d\u0438\u0446\u044b \u0441\u0435\u0442\u043a\u0438 \u0441\u0446\u0435\u043d\u044b \u0432 \u044f\u0440\u0434\u0430\u0445." };
  }
  const pixelsPerUnit = finite(distancePixels) ?? (
    finite(gridSize) && finite(gridDistance) && Number(gridDistance) > 0
      ? Number(gridSize) / Number(gridDistance)
      : null
  );
  if (!pixelsPerUnit || pixelsPerUnit <= 0) {
    return { valid: false, error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043c\u0430\u0441\u0448\u0442\u0430\u0431 \u0441\u0435\u0442\u043a\u0438 \u0441\u0446\u0435\u043d\u044b \u0432 \u043f\u0438\u043a\u0441\u0435\u043b\u044f\u0445." };
  }
  const yardsPerGridSpace = finite(gridDistance) * yardsPerUnit;
  const twoHexMode = !isGridless && isHexagonal &&
    Number.isFinite(yardsPerGridSpace) && Math.abs(yardsPerGridSpace - 1) < 0.000001;
  const pixelsPerYard = pixelsPerUnit / yardsPerUnit;
  return {
    valid: true,
    mode: twoHexMode ? "two-hex" : "circle",
    isGridless,
    isHexagonal,
    twoHexMode,
    yardsPerGridSpace,
    gridBased: !isGridless,
    pixelsPerYard,
    targetRadiusPixels: pixelsPerYard,
    zonePixels: ZONE_WIDTH_YARDS * pixelsPerYard,
    scaleKey: `${isGridless ? "gridless" : isHexagonal ? "hex" : "square"}:${gridDistance}:${gridSize}:${gridUnits}`
  };
}

export function resolveSuppressionCorridorStrip({ shooter, target, pixelsPerYard, widthYards = 2 } = {}) {
  const sx = finite(shooter?.x);
  const sy = finite(shooter?.y);
  const tx = finite(target?.x);
  const ty = finite(target?.y);
  const scale = finite(pixelsPerYard);
  if ([sx, sy, tx, ty, scale].some(value => value === null) || scale <= 0) return null;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy);
  if (length <= 0.000001) return null;
  const halfWidth = Math.max(0, Number(widthYards) * scale / 2);
  const axisX = dx / length;
  const axisY = dy / length;
  const perpendicularX = -axisY;
  const perpendicularY = axisX;
  return {
    source: { x: sx, y: sy },
    target: { x: tx, y: ty },
    length,
    halfWidth,
    axis: { x: axisX, y: axisY },
    perpendicular: { x: perpendicularX, y: perpendicularY }
  };
}

function suppressionCorridorCoordinates(point, strip) {
  const x = finite(point?.x);
  const y = finite(point?.y);
  if (x === null || y === null || !strip) return null;
  const dx = x - strip.source.x;
  const dy = y - strip.source.y;
  return {
    along: (dx * strip.axis.x) + (dy * strip.axis.y),
    lateral: (dx * strip.perpendicular.x) + (dy * strip.perpendicular.y)
  };
}

export function isSuppressionHexCenterInsideStrip(point, strip) {
  const coordinates = suppressionCorridorCoordinates(point, strip);
  if (!coordinates) return false;
  const epsilon = Math.max(0.000001, strip.halfWidth * 0.000000001);
  return coordinates.along >= -epsilon && coordinates.along <= strip.length + epsilon &&
    Math.abs(coordinates.lateral) <= strip.halfWidth + epsilon;
}

function isSuppressionCorridorCandidate(point, strip, margin) {
  const coordinates = suppressionCorridorCoordinates(point, strip);
  if (!coordinates) return false;
  return coordinates.along >= -margin && coordinates.along <= strip.length + margin &&
    Math.abs(coordinates.lateral) <= strip.halfWidth + margin;
}

function pointInsideSceneRect(point, sceneRect) {
  if (!sceneRect) return true;
  if (typeof sceneRect.contains === "function") return sceneRect.contains(point.x, point.y);
  const x = finite(sceneRect.x);
  const y = finite(sceneRect.y);
  const width = finite(sceneRect.width);
  const height = finite(sceneRect.height);
  if ([x, y, width, height].some(value => value === null)) return true;
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

export function buildSuppressionCorridorGridCells({
  shooter, target, pixelsPerYard, widthYards = 2, grid, sceneRect = null
} = {}) {
  const strip = resolveSuppressionCorridorStrip({ shooter, target, pixelsPerYard, widthYards });
  if (!strip || typeof grid?.getOffset !== "function" ||
      typeof grid?.getCenterPoint !== "function" || typeof grid?.getAdjacentOffsets !== "function") {
    return [];
  }

  const gridSize = finite(grid?.size) ?? 0;
  const searchMargin = Math.max(gridSize, Number(pixelsPerYard) || 0, strip.halfWidth) * 2;
  const queued = new Set();
  const queue = [];
  const enqueue = offset => {
    const cell = normalizeSuppressionGridCell(offset);
    if (!cell) return;
    const key = cell.i + "," + cell.j;
    if (queued.has(key)) return;
    queued.add(key);
    queue.push(cell);
  };
  enqueue(grid.getOffset(strip.source));
  enqueue(grid.getOffset(strip.target));

  const accepted = [];
  const maximumCandidates = 100000;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (cursor >= maximumCandidates) {
      throw new Error("\u041a\u043e\u0440\u0438\u0434\u043e\u0440 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0432\u0435\u043b\u0438\u043a \u0434\u043b\u044f \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0433\u043e \u0440\u0430\u0441\u0447\u0451\u0442\u0430.");
    }
    const cell = queue[cursor];
    const center = grid.getCenterPoint(cell);
    if (!Number.isFinite(center?.x) || !Number.isFinite(center?.y) ||
        !isSuppressionCorridorCandidate(center, strip, searchMargin)) continue;
    if (pointInsideSceneRect(center, sceneRect) && isSuppressionHexCenterInsideStrip(center, strip)) {
      const coordinates = suppressionCorridorCoordinates(center, strip);
      accepted.push({ cell, ...coordinates });
    }
    for (const adjacent of valuesOf(grid.getAdjacentOffsets(cell))) enqueue(adjacent);
  }

  accepted.sort((left, right) => left.along - right.along || left.lateral - right.lateral ||
    left.cell.i - right.cell.i || left.cell.j - right.cell.j);
  return uniqueGridCells(accepted.map(entry => entry.cell));
}

export function buildSuppressionCorridorShape({ shooter, target, pixelsPerYard, widthYards = 2 } = {}) {
  const strip = resolveSuppressionCorridorStrip({ shooter, target, pixelsPerYard, widthYards });
  if (!strip) return null;
  const px = strip.perpendicular.x * strip.halfWidth;
  const py = strip.perpendicular.y * strip.halfWidth;
  return {
    type: "polygon",
    hole: false,
    points: [
      strip.source.x + px, strip.source.y + py,
      strip.target.x + px, strip.target.y + py,
      strip.target.x - px, strip.target.y - py,
      strip.source.x - px, strip.source.y - py
    ]
  };
}

const shapeSource = shape => shape?.toObject?.() ?? shape?.toJSON?.() ?? shape ?? null;
const firstShape = region => valuesOf(region?.shapes)[0] ?? null;

function shapeCenter(shape) {
  const directX = finite(shape?.center?.x);
  const directY = finite(shape?.center?.y);
  if (directX !== null && directY !== null) return { x: directX, y: directY };
  const source = shapeSource(shape);
  const bounds = shape?.bounds ?? source?.bounds;
  const x = finite(bounds?.x ?? source?.x);
  const y = finite(bounds?.y ?? source?.y);
  const width = finite(bounds?.width ?? source?.width);
  const height = finite(bounds?.height ?? source?.height);
  if ([x, y, width, height].some(value => value === null)) return null;
  return { x: x + width / 2, y: y + height / 2 };
}

function sameOffset(left, right) {
  return Number(left?.i) === Number(right?.i) && Number(left?.j) === Number(right?.j);
}

export function normalizeSuppressionGridCell(cell) {
  const i = finite(cell?.i);
  const j = finite(cell?.j);
  if (i === null || j === null || !Number.isInteger(i) || !Number.isInteger(j)) return null;
  return { i, j };
}

function suppressionHexFromOffset(offset, grid) {
  const normalized = normalizeSuppressionGridCell(offset);
  if (!normalized) return null;
  const center = grid?.getCenterPoint?.(normalized);
  const vertices = valuesOf(grid?.getVertices?.(normalized)).map(vertex => ({
    x: Number(vertex?.x),
    y: Number(vertex?.y)
  }));
  if (!Number.isFinite(center?.x) || !Number.isFinite(center?.y) || vertices.length < 3 ||
      vertices.some(vertex => !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y))) return null;
  return {
    offset: normalized,
    center: { x: Number(center.x), y: Number(center.y) },
    vertices
  };
}

export function getSuppressionHexAtCanvasPoint(point, grid) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || typeof grid?.getOffset !== "function") {
    return null;
  }
  return suppressionHexFromOffset(grid.getOffset(point), grid);
}

function uniqueGridCells(cells) {
  const unique = [];
  for (const value of cells ?? []) {
    const cell = normalizeSuppressionGridCell(value);
    if (cell && !unique.some(existing => sameOffset(existing, cell))) unique.push(cell);
  }
  return unique;
}

export function getSuppressionRegionGridCells(region) {
  const source = shapeSource(firstShape(region));
  return source?.type === "grid" ? uniqueGridCells(source.offsets) : [];
}

export function getSuppressionTargetCells(region) {
  return getSuppressionRegionGridCells(region);
}

export function areSuppressionGridCellsAdjacent(left, right, grid) {
  const a = normalizeSuppressionGridCell(left);
  const b = normalizeSuppressionGridCell(right);
  if (!a || !b || sameOffset(a, b)) return false;
  return valuesOf(grid?.getAdjacentOffsets?.(a)).some(offset => sameOffset(offset, b));
}

export function areSuppressionCellZonesAdjacent(leftCells, rightCells, grid) {
  const left = uniqueGridCells(leftCells);
  const right = uniqueGridCells(rightCells);
  return left.some(a => right.some(b => areSuppressionGridCellsAdjacent(a, b, grid)));
}

export function suppressionGridCellsCenter(cells, grid) {
  const centers = uniqueGridCells(cells).map(cell => grid?.getCenterPoint?.(cell)).filter(center =>
    Number.isFinite(center?.x) && Number.isFinite(center?.y)
  );
  if (!centers.length) return null;
  return {
    x: centers.reduce((sum, center) => sum + Number(center.x), 0) / centers.length,
    y: centers.reduce((sum, center) => sum + Number(center.y), 0) / centers.length
  };
}

function targetRegionCenter(region, grid) {
  const cells = getSuppressionTargetCells(region);
  return cells.length ? suppressionGridCellsCenter(cells, grid) : shapeCenter(firstShape(region));
}

export function buildSuppressionCorridorRegionShape({ geometry, shooter, target, grid, sceneRect = null } = {}) {
  if (geometry?.twoHexMode) {
    const gridCells = buildSuppressionCorridorGridCells({
      shooter,
      target,
      pixelsPerYard: geometry.pixelsPerYard,
      grid,
      sceneRect
    });
    if (!gridCells.length) return null;
    return {
      shape: { type: "grid", hole: false, offsets: gridCells },
      gridCells
    };
  }
  const shape = buildSuppressionCorridorShape({
    shooter,
    target,
    pixelsPerYard: geometry?.pixelsPerYard
  });
  return shape ? { shape, gridCells: [] } : null;
}

export function isSuppressionTargetShapeSized(region, geometry, grid = null) {
  const shape = firstShape(region);
  const source = shapeSource(shape);
  if (!shape || !source || !geometry?.valid) return false;
  if (geometry.twoHexMode) {
    const cells = getSuppressionTargetCells(region);
    return source.type === "grid" && cells.length === 2 &&
      areSuppressionGridCellsAdjacent(cells[0], cells[1], grid);
  }
  if (source.type !== "circle") return false;
  const tolerance = Math.max(0.5, geometry.targetRadiusPixels * 0.01);
  return Math.abs(Number(source.radius) - geometry.targetRadiusPixels) <= tolerance;
}

export function areSuppressionRegionsAdjacent(left, right, grid, pixelsPerYard = null) {
  const leftShape = firstShape(left);
  const rightShape = firstShape(right);
  if (!leftShape || !rightShape) return false;
  const leftCenter = shapeCenter(leftShape);
  const rightCenter = shapeCenter(rightShape);
  const leftSource = shapeSource(leftShape);
  const rightSource = shapeSource(rightShape);
  if (leftSource?.type === "grid" && rightSource?.type === "grid") {
    return areSuppressionCellZonesAdjacent(
      getSuppressionTargetCells(left), getSuppressionTargetCells(right), grid);
  }
  if (!leftCenter || !rightCenter) return false;
  const leftRadius = finite(leftSource?.radius) ?? finite(leftShape?.bounds?.width) / 2;
  const rightRadius = finite(rightSource?.radius) ?? finite(rightShape?.bounds?.width) / 2;
  if (!leftRadius || !rightRadius) return false;
  const distance = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y);
  const scale = finite(pixelsPerYard) ?? Math.min(leftRadius, rightRadius);
  const tolerance = Math.max(1, scale * 0.15);
  return distance > tolerance && distance <= leftRadius + rightRadius + tolerance;
}

function tokenCenter(token) {
  const document = token?.document ?? token;
  const point = document?.getCenterPoint?.();
  if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) return point;
  if (Number.isFinite(token?.center?.x) && Number.isFinite(token?.center?.y)) return token.center;
  return null;
}

export class SuppressionFireRegionService {
  constructor({ token, actor, weapon = null, attack, sessionId, runtime = globalThis } = {}) {
    this.runtime = runtime;
    this.token = token;
    this.actor = actor;
    this.weapon = weapon;
    this.attack = attack;
    this.sessionId = sessionId;
    this._placementHighlightLayers = new Set();
    this._cancelPlacement = null;
    this._placementHint = null;
    this._localVisibilityOverrides = [];
  }

  get scene() { return this.runtime.canvas?.scene ?? null; }
  get layer() { return this.runtime.canvas?.regions ?? null; }
  get user() { return this.runtime.game?.user ?? null; }
  get sourceTokenId() { return this.token?.document?.id ?? this.token?.id ?? null; }
  get weaponKey() { return getSuppressionWeaponKey(this.weapon, this.attack); }
  get attackId() {
    return String(this.attack?.uuid || this.attack?.path ||
      [this.attack?.name, this.attack?.mode].filter(Boolean).join("::") || "ranged-attack");
  }

  setSessionId(sessionId) { this.sessionId = sessionId; }

  hasCreatePermission() {
    return this.user?.isGM === true || this.user?.hasPermission?.("REGION_CREATE") === true;
  }

  getGeometry() {
    const grid = this.runtime.canvas?.grid;
    const sceneGrid = this.scene?.grid ?? {};
    return resolveSuppressionZoneGeometry({
      isGridless: grid?.isGridless === true || Number(sceneGrid.type) === 0,
      isHexagonal: grid?.isHexagonal === true,
      gridDistance: sceneGrid.distance ?? grid?.distance,
      gridSize: sceneGrid.size ?? grid?.size,
      gridUnits: sceneGrid.units ?? grid?.units,
      distancePixels: this.runtime.canvas?.dimensions?.distancePixels
    });
  }

  getSessionRegions() {
    const sceneId = String(this.scene?.id ?? "");
    return valuesOf(this.scene?.regions).filter(region => {
      const flag = getSuppressionRegionFlag(region);
      return flag?.type === "suppressionFire" &&
        String(flag.sessionId ?? "") === String(this.sessionId ?? "") &&
        String(flag.userId ?? "") === String(this.user?.id ?? "") &&
        String(flag.actorId ?? "") === String(this.actor?.id ?? "") &&
        String(flag.sourceTokenId ?? "") === String(this.sourceTokenId ?? "") &&
        String(flag.weaponKey ?? "") === String(this.weaponKey) &&
        String(flag.sceneId ?? "") === sceneId;
    });
  }

  getZonePairs(zoneCount = Number.MAX_SAFE_INTEGER) {
    const pairs = new Map();
    for (const region of this.getSessionRegions()) {
      const flag = getSuppressionRegionFlag(region);
      const index = Math.trunc(Number(flag?.zoneIndex));
      if (index < 0 || index >= zoneCount) continue;
      const pair = pairs.get(index) ?? { zoneIndex: index, target: null, corridor: null };
      if (flag.regionRole === "target") pair.target = region;
      else if (flag.regionRole === "corridor") pair.corridor = region;
      pairs.set(index, pair);
    }
    return pairs;
  }

  async pruneZones(zoneCount) {
    const count = Math.max(1, Math.trunc(Number(zoneCount) || 1));
    const extra = this.getSessionRegions().filter(region =>
      Math.trunc(Number(getSuppressionRegionFlag(region)?.zoneIndex)) >= count
    );
    await this._deleteDocuments(extra);
    return extra.length;
  }

  _baseFlag(zoneIndex, geometry, regionRole, gridCells = []) {
    return {
      type: "suppressionFire",
      sessionId: this.sessionId,
      sceneId: this.scene?.id ?? null,
      sourceTokenId: this.sourceTokenId,
      actorId: this.actor?.id ?? null,
      userId: this.user?.id ?? null,
      weaponKey: this.weaponKey,
      attackId: this.attackId,
      zoneIndex,
      regionRole,
      zoneWidthYards: ZONE_WIDTH_YARDS,
      corridorWidthYards: ZONE_WIDTH_YARDS,
      scaleKey: geometry.scaleKey,
      gridCells: uniqueGridCells(gridCells),
      targetRegionId: null,
      corridorRegionId: null,
      targetShapeId: null,
      corridorShapeId: null,
      manuallyEdited: false,
      state: "draft",
      active: false
    };
  }

  _targetShapeData(geometry, gridCells = []) {
    if (geometry.twoHexMode) {
      return {
        type: "grid",
        hole: false,
        offsets: uniqueGridCells(gridCells)
      };
    }
    return {
      type: "circle",
      hole: false,
      x: 0,
      y: 0,
      radius: geometry.targetRadiusPixels,
      gridBased: geometry.gridBased
    };
  }

  _visualData(zoneIndex, role, geometry = null) {
    const owner = this.runtime.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    const always = this.runtime.CONST?.REGION_VISIBILITY?.ALWAYS ?? 2;
    const style = ZONE_STYLES[zoneIndex % ZONE_STYLES.length];
    const levelId = this.runtime.canvas?.level?.id;
    return {
      color: style[role],
      locked: role === "corridor",
      restriction: { enabled: false },
      highlightMode: role === "target" || geometry?.twoHexMode ? "coverage" : "shapes",
      displayMeasurements: role === "target",
      visibility: always,
      ownership: { [this.user.id]: owner },
      ...(levelId ? { levels: [levelId] } : {})
    };
  }

  _targetRegionData(zoneIndex, geometry, gridCells = []) {
    return {
      name: `Suppression Fire - Zone ${zoneIndex + 1} - Target`,
      ...this._visualData(zoneIndex, "target", geometry),
      shapes: [this._targetShapeData(geometry, gridCells)],
      flags: { [MODULE_ID]: this._baseFlag(zoneIndex, geometry, "target", gridCells) }
    };
  }

  _corridorRegionData(zoneIndex, geometry, corridor, targetCells = [], corridorCells = []) {
    const flag = {
      ...this._baseFlag(zoneIndex, geometry, "corridor", targetCells),
      corridorGridCells: uniqueGridCells(corridorCells),
      manuallyEdited: false
    };
    return {
      name: `Suppression Fire - Zone ${zoneIndex + 1} - Corridor`,
      ...this._visualData(zoneIndex, "corridor", geometry),
      shapes: [corridor],
      flags: { [MODULE_ID]: flag }
    };
  }

  async _deleteDocuments(regions) {
    const ids = regions.map(region => region?.id).filter(Boolean);
    if (!ids.length) return [];
    return this.scene.deleteEmbeddedDocuments("Region", ids);
  }

  _addPlacementHighlightLayer(layerName) {
    const gridLayer = this.runtime.canvas?.interface?.grid;
    gridLayer?.destroyHighlightLayer?.(layerName);
    gridLayer?.addHighlightLayer?.(layerName);
    this._placementHighlightLayers.add(layerName);
  }

  _destroyPlacementHighlightLayer(layerName) {
    this.runtime.canvas?.interface?.grid?.destroyHighlightLayer?.(layerName);
    this._placementHighlightLayers.delete(layerName);
  }

  _removePlacementHint() {
    this._placementHint?.remove?.();
    this._placementHint = null;
  }

  _setPlacementHint(text) {
    if (this._placementHint) {
      this._placementHint.textContent = text;
      return this._placementHint;
    }
    const documentRef = this.runtime.document ?? globalThis.document;
    const parent = (this.runtime.canvas?.app?.canvas ?? this.runtime.canvas?.app?.view)?.parentElement;
    if (!documentRef?.createElement || !parent?.append) return null;
    const hint = documentRef.createElement("div");
    hint.className = "olegurps-qol-suppression-hint";
    hint.textContent = text;
    Object.assign(hint.style, {
      position: "absolute",
      top: "12px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "100",
      padding: "6px 10px",
      maxWidth: "min(760px, calc(100% - 24px))",
      color: "#fff",
      background: "rgba(0, 0, 0, 0.72)",
      border: "1px solid rgba(255, 255, 255, 0.35)",
      borderRadius: "4px",
      textAlign: "center",
      pointerEvents: "none"
    });
    parent.append(hint);
    this._placementHint = hint;
    return hint;
  }

  clearPlacementHighlights({ cancel = false } = {}) {
    if (cancel && this._cancelPlacement) {
      const cancelPlacement = this._cancelPlacement;
      this._cancelPlacement = null;
      cancelPlacement();
      return;
    }
    this._removePlacementHint();
    for (const layerName of [...this._placementHighlightLayers]) {
      this._destroyPlacementHighlightLayer(layerName);
    }
    this._restoreLocalRegionVisibility();
  }
  _highlightGridHex(layerName, hex, zoneIndex, state = "hover") {
    const grid = this.runtime.canvas?.grid;
    const highlight = this.runtime.canvas?.interface?.grid?.getHighlightLayer?.(layerName);
    if (!highlight || !hex?.vertices?.length) return;
    const style = ZONE_STYLES[zoneIndex % ZONE_STYLES.length];
    const appearance = state === "invalid" || state === "remove"
      ? { color: "#b3261e", border: "#ffb4ab", alpha: state === "remove" ? 0.68 : 0.5 }
      : state === "add"
        ? { color: "#2e7d32", border: "#b9f6ca", alpha: 0.62 }
        : state === "selected"
          ? { color: style.target, border: "#ffffff", alpha: 0.78 }
          : { color: style.target, border: "#ffffff", alpha: 0.42 };
    highlight.beginFill(appearance.color, appearance.alpha);
    highlight.lineStyle(
      Number.isFinite(grid?.thickness) ? grid.thickness : 1,
      appearance.border,
      Math.min(appearance.alpha * 1.5, 1)
    );
    highlight.drawPolygon(hex.vertices);
    highlight.endFill();
    highlight.positions?.add?.(hex.offset.i + "," + hex.offset.j);
  }
  _regionDocument(regionId) {
    return this.scene?.regions?.get?.(regionId) ??
      valuesOf(this.scene?.regions).find(region => String(region?.id ?? "") === String(regionId ?? "")) ?? null;
  }

  _regionPlaceable(regionOrId) {
    const document = typeof regionOrId === "string" ? this._regionDocument(regionOrId) : regionOrId;
    const id = document?.id ?? regionOrId;
    return document?.object ?? valuesOf(this.layer?.placeables).find(placeable =>
      String(placeable?.document?.id ?? placeable?.id ?? "") === String(id ?? "")
    ) ?? null;
  }

  _hideOtherSessionZones(zoneIndex) {
    this._restoreLocalRegionVisibility();
    for (const region of this.getSessionRegions()) {
      const flag = getSuppressionRegionFlag(region);
      if (Math.trunc(Number(flag?.zoneIndex)) === zoneIndex) continue;
      const placeable = this._regionPlaceable(region);
      if (!placeable || typeof placeable.visible !== "boolean") continue;
      this._localVisibilityOverrides.push({ regionId: region.id, visible: placeable.visible });
      placeable.visible = false;
    }
  }

  _reapplyLocalRegionVisibility() {
    for (const entry of this._localVisibilityOverrides) {
      const placeable = this._regionPlaceable(entry.regionId);
      if (placeable) placeable.visible = false;
    }
  }

  _restoreLocalRegionVisibility() {
    for (const entry of this._localVisibilityOverrides) {
      const placeable = this._regionPlaceable(entry.regionId);
      if (placeable && typeof entry.visible === "boolean") placeable.visible = entry.visible;
    }
    this._localVisibilityOverrides = [];
  }

  async _updateManualCorridorRegion(corridorRegionId, cells) {
    const corridorCells = uniqueGridCells(cells);
    const updated = await this.scene.updateEmbeddedDocuments("Region", [{
      _id: corridorRegionId,
      shapes: [{ type: "grid", hole: false, offsets: corridorCells }],
      [`flags.${MODULE_ID}.corridorGridCells`]: corridorCells,
      [`flags.${MODULE_ID}.manuallyEdited`]: true
    }]);
    this._reapplyLocalRegionVisibility();
    return updated?.[0] ?? this._regionDocument(corridorRegionId);
  }

  async editCorridor(zoneIndex, { onCellsChange = null } = {}) {
    this.clearPlacementHighlights({ cancel: true });
    const index = Math.trunc(Number(zoneIndex));
    const geometry = this.getGeometry();
    if (!geometry.valid) return { ok: false, error: geometry.error };
    if (!geometry.twoHexMode) {
      return {
        ok: false,
        error: "\u0420\u0443\u0447\u043d\u043e\u0435 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 corridor \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 hex grid \u0441 \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u043e\u043c 1 \u044f\u0440\u0434 \u043d\u0430 \u0433\u0435\u043a\u0441."
      };
    }
    const pair = this.getZonePairs(index + 1).get(index);
    if (!pair?.target || !pair?.corridor) {
      return { ok: false, error: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0440\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 target zone \u0438 corridor \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u0437\u043e\u043d\u044b." };
    }

    const canvas = this.runtime.canvas;
    const grid = canvas?.grid;
    const gridLayer = canvas?.interface?.grid;
    const view = canvas?.app?.canvas ?? canvas?.app?.view;
    if (!view?.addEventListener || !canvas?.canvasCoordinatesFromClient ||
        typeof grid?.getOffset !== "function" || typeof grid?.getCenterPoint !== "function" ||
        typeof grid?.getVertices !== "function" || !gridLayer?.addHighlightLayer ||
        !gridLayer?.getHighlightLayer || !gridLayer?.destroyHighlightLayer) {
      return { ok: false, error: "Grid API Foundry \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u0440\u0435\u0434\u0430\u043a\u0442\u043e\u0440\u0430 corridor." };
    }

    const targetCells = uniqueGridCells(getSuppressionTargetCells(pair.target));
    const protectedKeys = new Set(targetCells.map(cell => cell.i + "," + cell.j));
    let cells = uniqueGridCells([...getSuppressionRegionGridCells(pair.corridor), ...targetCells]);
    const hoverLayerName = MODULE_ID + "-suppression-edit-" + this.sessionId + "-" + index;
    const hint = "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u2013 \u0417\u043e\u043d\u0430 " + (index + 1) +
      ": \u041b\u041a\u041c \u0434\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u0442 \u0438\u043b\u0438 \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u0433\u0435\u043a\u0441. \u041f\u041a\u041c \u2013 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435 \u043a\u0430\u043c\u0435\u0440\u044b. Esc \u2013 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438 \u0432\u044b\u0439\u0442\u0438.";
    try {
      this._hideOtherSessionZones(index);
      this._addPlacementHighlightLayer(hoverLayerName);
      this._setPlacementHint(hint);
    } catch (error) {
      this.clearPlacementHighlights();
      return { ok: false, error: error?.message ?? String(error) };
    }

    return new Promise(resolve => {
      let finished = false;
      let updating = false;
      let pendingUpdate = Promise.resolve();
      const clearHover = () => gridLayer?.clearHighlightLayer?.(hoverLayerName);
      const eventHex = event => {
        const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
        return getSuppressionHexAtCanvasPoint(point, grid);
      };
      const consume = event => {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      };
      const cleanup = () => {
        this._cancelPlacement = null;
        view.removeEventListener("mousemove", onMouseMove, true);
        view.removeEventListener("mouseleave", onMouseLeave, true);
        view.removeEventListener("click", onClick, true);
        globalThis.removeEventListener?.("keydown", onKeyDown, true);
        this._removePlacementHint();
        this._destroyPlacementHighlightLayer(hoverLayerName);
        this._restoreLocalRegionVisibility();
      };
      const finish = result => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve({ ...result, cells: uniqueGridCells(cells) });
      };
      this._cancelPlacement = () => {
        void pendingUpdate.catch(() => null).finally(() => finish({ ok: false, cancelled: true }));
      };
      const onMouseMove = event => {
        clearHover();
        const hex = eventHex(event);
        if (!hex) return;
        const key = hex.offset.i + "," + hex.offset.j;
        const state = protectedKeys.has(key)
          ? "invalid"
          : cells.some(cell => sameOffset(cell, hex.offset)) ? "remove" : "add";
        this._highlightGridHex(hoverLayerName, hex, index, state);
      };
      const onMouseLeave = () => clearHover();
      const onClick = event => {
        if (event.button !== 0 || finished) return;
        consume(event);
        if (updating) return;
        const hex = eventHex(event);
        if (!hex) return;
        const key = hex.offset.i + "," + hex.offset.j;
        if (protectedKeys.has(key)) {
          this.runtime.ui?.notifications?.warn?.("\u041a\u043e\u043d\u0435\u0447\u043d\u044b\u0435 \u0433\u0435\u043a\u0441\u044b target zone \u043d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0438\u0437 corridor.");
          return;
        }
        const exists = cells.some(cell => sameOffset(cell, hex.offset));
        const next = exists ? cells.filter(cell => !sameOffset(cell, hex.offset)) : [...cells, hex.offset];
        updating = true;
        pendingUpdate = (async () => {
          await this._updateManualCorridorRegion(pair.corridor.id, next);
          cells = uniqueGridCells(next);
          await onCellsChange?.(cells);
          this._reapplyLocalRegionVisibility();
          clearHover();
        })();
        void pendingUpdate.then(() => {
          updating = false;
        }).catch(error => {
          updating = false;
          console.error("OleGURPS QOL | Suppression Fire corridor editor:", error);
          this.runtime.ui?.notifications?.error?.(error?.message ?? String(error));
          finish({ ok: false, error: error?.message ?? String(error) });
        });
      };
      const onKeyDown = event => {
        if (event.key !== "Escape" || finished) return;
        consume(event);
        void pendingUpdate.catch(() => null).finally(() => finish({ ok: true }));
      };
      try {
        view.addEventListener("mousemove", onMouseMove, true);
        view.addEventListener("mouseleave", onMouseLeave, true);
        view.addEventListener("click", onClick, true);
        globalThis.addEventListener?.("keydown", onKeyDown, true);
      } catch (error) {
        finish({ ok: false, error: error?.message ?? String(error) });
      }
    });
  }

  async _pickHexTargetCells(zoneIndex, previousCells = null) {
    const canvas = this.runtime.canvas;
    const grid = canvas?.grid;
    const gridLayer = canvas?.interface?.grid;
    const view = canvas?.app?.canvas ?? canvas?.app?.view;
    if (!grid?.isHexagonal || !view?.addEventListener || !canvas?.canvasCoordinatesFromClient ||
        typeof grid?.getOffset !== "function" || typeof grid?.getCenterPoint !== "function" ||
        typeof grid?.getVertices !== "function" || typeof grid?.getAdjacentOffsets !== "function" ||
        !gridLayer?.addHighlightLayer || !gridLayer?.getHighlightLayer ||
        !gridLayer?.destroyHighlightLayer) {
      throw new Error("\u0412\u044b\u0431\u043e\u0440 \u0433\u0435\u043a\u0441\u043e\u0432 \u0447\u0435\u0440\u0435\u0437 Grid API Foundry \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435.");
    }

    const selectedLayerName = MODULE_ID + "-suppression-" + this.sessionId + "-" + zoneIndex;
    const hoverLayerName = selectedLayerName + "-hover";
    const zoneLabel = "\u0417\u043e\u043d\u0430 " + (zoneIndex + 1);
    const firstHint = "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u2014 " + zoneLabel +
      ": \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0435\u0440\u0432\u044b\u0439 \u0433\u0435\u043a\u0441. \u041b\u041a\u041c \u2014 \u0432\u044b\u0431\u0440\u0430\u0442\u044c; Esc \u2014 \u043e\u0442\u043c\u0435\u043d\u0430.";
    const secondHint = "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u2014 " + zoneLabel +
      ": \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043e\u0441\u0435\u0434\u043d\u0438\u0439 \u0432\u0442\u043e\u0440\u043e\u0439 \u0433\u0435\u043a\u0441. \u041b\u041a\u041c \u2014 \u0432\u044b\u0431\u0440\u0430\u0442\u044c; Esc \u2014 \u043e\u0442\u043c\u0435\u043d\u0430.";
    this.clearPlacementHighlights({ cancel: true });
    this._addPlacementHighlightLayer(selectedLayerName);
    this._addPlacementHighlightLayer(hoverLayerName);
    this._setPlacementHint(firstHint);

    return new Promise(resolve => {
      let first = null;
      let finished = false;
      const clearSelected = () => gridLayer?.clearHighlightLayer?.(selectedLayerName);
      const clearHover = () => gridLayer?.clearHighlightLayer?.(hoverLayerName);
      const finish = cells => {
        if (finished) return;
        finished = true;
        this._cancelPlacement = null;
        view.removeEventListener("mousemove", onMouseMove, true);
        view.removeEventListener("mouseleave", onMouseLeave, true);
        view.removeEventListener("click", onClick, true);
        globalThis.removeEventListener?.("keydown", onKeyDown, true);
        this._removePlacementHint();
        this._destroyPlacementHighlightLayer(selectedLayerName);
        this._destroyPlacementHighlightLayer(hoverLayerName);
        resolve(cells);
      };
      this._cancelPlacement = () => finish(null);
      const eventHex = event => {
        const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
        return getSuppressionHexAtCanvasPoint(point, grid);
      };
      const consume = event => {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      };
      const isValidSecond = offset => areSuppressionGridCellsAdjacent(first, offset, grid) &&
        (!previousCells?.length || areSuppressionCellZonesAdjacent(previousCells, [first, offset], grid));
      const onMouseMove = event => {
        clearHover();
        const hex = eventHex(event);
        if (!hex || (first && sameOffset(first, hex.offset))) return;
        const state = first && !isValidSecond(hex.offset) ? "invalid" : "hover";
        this._highlightGridHex(hoverLayerName, hex, zoneIndex, state);
      };
      const onMouseLeave = () => clearHover();
      const onClick = event => {
        if (event.button !== 0) return;
        consume(event);
        const hex = eventHex(event);
        if (!hex) return;
        if (!first) {
          first = hex.offset;
          clearHover();
          clearSelected();
          this._highlightGridHex(selectedLayerName, hex, zoneIndex, "selected");
          this._setPlacementHint(secondHint);
          return;
        }
        if (!areSuppressionGridCellsAdjacent(first, hex.offset, grid)) {
          this.runtime.ui?.notifications?.warn?.(
            zoneLabel + ": \u0432\u0442\u043e\u0440\u043e\u0439 \u0433\u0435\u043a\u0441 \u0434\u043e\u043b\u0436\u0435\u043d \u0438\u043c\u0435\u0442\u044c \u043e\u0431\u0449\u0443\u044e \u0433\u0440\u0430\u043d\u044c \u0441 \u043f\u0435\u0440\u0432\u044b\u043c."
          );
          return;
        }
        const cells = [first, hex.offset];
        if (previousCells?.length && !areSuppressionCellZonesAdjacent(previousCells, cells, grid)) {
          this.runtime.ui?.notifications?.warn?.(
            zoneLabel + " \u0434\u043e\u043b\u0436\u043d\u0430 \u0441\u043e\u0441\u0435\u0434\u0441\u0442\u0432\u043e\u0432\u0430\u0442\u044c \u0441 \u0417\u043e\u043d\u043e\u0439 " + zoneIndex +
            ". \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 " + zoneLabel + " \u0437\u0430\u043d\u043e\u0432\u043e."
          );
          first = null;
          clearSelected();
          clearHover();
          this._setPlacementHint(firstHint);
          return;
        }
        finish(cells);
      };
      const onKeyDown = event => {
        if (event.key !== "Escape") return;
        consume(event);
        finish(null);
      };
      view.addEventListener("mousemove", onMouseMove, true);
      view.addEventListener("mouseleave", onMouseLeave, true);
      view.addEventListener("click", onClick, true);
      globalThis.addEventListener?.("keydown", onKeyDown, true);
    });
  }

  async placeZone(zoneIndex, zoneCount) {
    this.clearPlacementHighlights({ cancel: true });
    if (!this.hasCreatePermission()) {
      return { ok: false, error: "Недостаточно прав Foundry для создания Regions." };
    }
    if (!this.scene?.createEmbeddedDocuments) {
      return { ok: false, error: "Foundry v14 Regions недоступны на текущей сцене." };
    }
    const index = Math.trunc(Number(zoneIndex));
    const count = Math.max(index + 1, Math.trunc(Number(zoneCount) || 1));
    const geometry = this.getGeometry();
    if (!geometry.valid) return { ok: false, error: geometry.error };
    if (!geometry.twoHexMode && !this.layer?.placeRegion) {
      return { ok: false, error: "Режим размещения Foundry v14 недоступен." };
    }
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    const shooter = tokenCenter(liveToken);
    if (!liveToken || !shooter) {
      return { ok: false, error: "Токен стрелка больше нет на текущей сцене." };
    }

    const existingPairs = this.getZonePairs(count);
    const oldPair = existingPairs.get(index);
    const previousCells = index > 0 && existingPairs.get(index - 1)?.target
      ? getSuppressionTargetCells(existingPairs.get(index - 1).target)
      : null;
    const nextCells = existingPairs.get(index + 1)?.target
      ? getSuppressionTargetCells(existingPairs.get(index + 1).target)
      : null;
    let target = null;
    let corridor = null;
    try {
      let cells = [];
      if (geometry.twoHexMode) {
        cells = await this._pickHexTargetCells(index, previousCells);
        if (!cells) return { ok: false, cancelled: true, error: "Выбор зоны отменён." };
        if (nextCells?.length && !areSuppressionCellZonesAdjacent(cells, nextCells, this.runtime.canvas?.grid)) {
          return {
            ok: false,
            error: "Зона " + (index + 1) + " должна соседствовать с Зоной " + (index + 2) + "."
          };
        }
        const created = await this.scene.createEmbeddedDocuments(
          "Region", [this._targetRegionData(index, geometry, cells)]
        );
        target = created?.[0] ?? null;
      } else {
        target = await this.layer.placeRegion(
          this._targetRegionData(index, geometry),
          { allowRotation: false, create: true }
        );
      }
      if (!target) return { ok: false, cancelled: true, error: "Выбор зоны отменён." };

      const center = targetRegionCenter(target, this.runtime.canvas?.grid);
      const corridorResult = buildSuppressionCorridorRegionShape({
        geometry,
        shooter,
        target: center,
        grid: this.runtime.canvas?.grid,
        sceneRect: this.runtime.canvas?.dimensions?.sceneRect ?? this.runtime.canvas?.dimensions?.rect ?? null
      });
      if (!corridorResult) throw new Error("Не удалось построить corridor шириной 2 ярда.");
      const createdCorridors = await this.scene.createEmbeddedDocuments("Region", [
        this._corridorRegionData(index, geometry, corridorResult.shape, cells, corridorResult.gridCells)
      ]);
      corridor = createdCorridors?.[0] ?? null;
      if (!corridor) throw new Error("Foundry не создал corridor.");

      if (!geometry.twoHexMode) {
        const neighborTargets = [
          existingPairs.get(index - 1)?.target,
          target,
          existingPairs.get(index + 1)?.target
        ].filter(Boolean);
        const adjacency = this.validateAdjacency(neighborTargets);
        if (!adjacency.valid) throw new Error(adjacency.error);
      }

      const ref = {
        zoneIndex: index,
        targetRegionId: target.id,
        corridorRegionId: corridor.id,
        targetShapeId: target.id + ":0",
        corridorShapeId: corridor.id + ":0",
        gridCells: cells,
        corridorCells: corridorResult.gridCells,
        manuallyEdited: false
      };
      await this.scene.updateEmbeddedDocuments("Region", [target, corridor].map(region => ({
        _id: region.id,
        locked: true,
        [`flags.${MODULE_ID}.targetRegionId`]: ref.targetRegionId,
        [`flags.${MODULE_ID}.corridorRegionId`]: ref.corridorRegionId,
        [`flags.${MODULE_ID}.targetShapeId`]: ref.targetShapeId,
        [`flags.${MODULE_ID}.corridorShapeId`]: ref.corridorShapeId,
        [`flags.${MODULE_ID}.gridCells`]: ref.gridCells,
        [`flags.${MODULE_ID}.corridorGridCells`]: ref.corridorCells,
        [`flags.${MODULE_ID}.manuallyEdited`]: false
      })));
      await this._deleteDocuments([oldPair?.target, oldPair?.corridor].filter(Boolean));
      return { ok: true, ref, pair: { zoneIndex: index, target, corridor }, geometry };
    } catch (error) {
      await this._deleteDocuments([target, corridor].filter(Boolean));
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  async deleteZone(zoneIndex) {
    this.clearPlacementHighlights({ cancel: true });
    const index = Math.trunc(Number(zoneIndex));
    const pair = this.getZonePairs(index + 1).get(index);
    const regions = [pair?.target, pair?.corridor].filter(Boolean);
    await this._deleteDocuments(regions);
    return regions.length;
  }

  async placeZones(zoneCount) {
    this.clearPlacementHighlights({ cancel: true });
    if (!this.hasCreatePermission()) {
      return {
        ok: false,
        error: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 Foundry \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u043e\u0431\u043b\u0430\u0441\u0442\u0435\u0439. \u041c\u0430\u0441\u0442\u0435\u0440 \u0434\u043e\u043b\u0436\u0435\u043d \u0432\u044b\u0434\u0430\u0442\u044c \u0440\u043e\u043b\u0438 \u043f\u0440\u0430\u0432\u043e \u043d\u0430 \u0438\u0445 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435."
      };
    }
    if (!this.scene || !this.scene?.createEmbeddedDocuments) {
      return { ok: false, error: "\u041e\u0431\u043b\u0430\u0441\u0442\u0438 \u0441\u0446\u0435\u043d\u044b Foundry v14 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435." };
    }
    const geometry = this.getGeometry();
    if (!geometry.valid) return { ok: false, error: geometry.error };
    if (!geometry.twoHexMode && !this.layer?.placeRegion) {
      return { ok: false, error: "\u0420\u0435\u0436\u0438\u043c \u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u0438\u044f \u043e\u0431\u043b\u0430\u0441\u0442\u0435\u0439 Foundry v14 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435." };
    }
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    if (!liveToken) return { ok: false, error: "\u0422\u043e\u043a\u0435\u043d \u0441\u0442\u0440\u0435\u043b\u043a\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u0442 \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435." };
    const shooter = tokenCenter(liveToken);
    if (!shooter) return { ok: false, error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0446\u0435\u043d\u0442\u0440 \u0442\u043e\u043a\u0435\u043d\u0430 \u0441\u0442\u0440\u0435\u043b\u043a\u0430." };
    const count = Math.max(1, Math.trunc(Number(zoneCount) || 1));
    const previous = this.getSessionRegions();
    if (geometry.twoHexMode) {
      this.runtime.ui?.notifications?.info?.(
        "\u0414\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0439 \u0438\u0437 " + count + " \u0437\u043e\u043d \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e \u0434\u0432\u0430 \u0441\u043e\u0441\u0435\u0434\u043d\u0438\u0445 \u0433\u0435\u043a\u0441\u0430."
      );
    } else {
      if (geometry.isHexagonal) {
        this.runtime.ui?.notifications?.warn?.(
          "\u0420\u0435\u0436\u0438\u043c \u0434\u0432\u0443\u0445 \u0433\u0435\u043a\u0441\u043e\u0432 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0433\u0435\u043a\u0441\u0430\u0433\u043e\u043d\u0430\u043b\u044c\u043d\u0443\u044e \u0441\u0435\u0442\u043a\u0443 \u0441 \u0442\u043e\u0447\u043d\u044b\u043c \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u043e\u043c 1 \u044f\u0440\u0434 \u043d\u0430 \u0433\u0435\u043a\u0441; \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u044b\u0439 \u0440\u0435\u0436\u0438\u043c \u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u0438\u044f."
        );
      }
      this.runtime.ui?.notifications?.info?.(
        "\u041f\u043e \u043f\u043e\u0440\u044f\u0434\u043a\u0443 \u0440\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0446\u0435\u043d\u0442\u0440\u044b " + count + " \u0437\u043e\u043d \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f."
      );
    }

    const targets = [];
    const targetCells = [];
    let corridors = [];
    try {
      for (let index = 0; index < count; index++) {
        let cells = [];
        let target = null;
        if (geometry.twoHexMode) {
          cells = await this._pickHexTargetCells(index, targetCells[index - 1]);
          if (cells) {
            const created = await this.scene.createEmbeddedDocuments(
              "Region", [this._targetRegionData(index, geometry, cells)]
            );
            target = created?.[0] ?? null;
          }
        } else {
          target = await this.layer.placeRegion(
            this._targetRegionData(index, geometry),
            { allowRotation: false, create: true }
          );
        }
        if (!target) {
          await this._deleteDocuments(targets);
          return { ok: false, cancelled: true, error: "\u0412\u044b\u0431\u043e\u0440 \u0437\u043e\u043d \u043e\u0442\u043c\u0435\u043d\u0451\u043d; \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0435 \u043e\u0431\u043b\u0430\u0441\u0442\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b." };
        }
        targets.push(target);
        targetCells.push(cells);
      }

      const corridorCells = [];
      const sceneRect = this.runtime.canvas?.dimensions?.sceneRect ?? this.runtime.canvas?.dimensions?.rect ?? null;
      const corridorData = targets.map((target, index) => {
        const center = targetRegionCenter(target, this.runtime.canvas?.grid);
        const result = buildSuppressionCorridorRegionShape({
          geometry,
          shooter,
          target: center,
          grid: this.runtime.canvas?.grid,
          sceneRect
        });
        if (!result) throw new Error("\u0417\u043e\u043d\u0430 " + (index + 1) + ": \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0441\u0442\u0440\u043e\u0438\u0442\u044c \u043a\u043e\u0440\u0438\u0434\u043e\u0440 \u0448\u0438\u0440\u0438\u043d\u043e\u0439 2 \u044f\u0440\u0434\u0430.");
        corridorCells[index] = result.gridCells;
        return this._corridorRegionData(
          index, geometry, result.shape, targetCells[index], result.gridCells
        );
      });
      corridors = await this.scene.createEmbeddedDocuments("Region", corridorData);
      if (!Array.isArray(corridors) || corridors.length !== count) {
        throw new Error("Foundry \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043b \u0432\u0441\u0435 \u043a\u043e\u0440\u0438\u0434\u043e\u0440\u044b \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f.");
      }
      const updates = [];
      const refs = [];
      for (let index = 0; index < count; index++) {
        const target = targets[index];
        const corridor = corridors[index];
        const link = {
          targetRegionId: target.id,
          corridorRegionId: corridor.id,
          targetShapeId: `${target.id}:0`,
          corridorShapeId: `${corridor.id}:0`,
          gridCells: targetCells[index],
          corridorCells: corridorCells[index],
          manuallyEdited: false
        };
        refs[index] = { zoneIndex: index, ...link };
        for (const region of [target, corridor]) {
          updates.push({
            _id: region.id,
            locked: true,
            [`flags.${MODULE_ID}.targetRegionId`]: link.targetRegionId,
            [`flags.${MODULE_ID}.corridorRegionId`]: link.corridorRegionId,
            [`flags.${MODULE_ID}.targetShapeId`]: link.targetShapeId,
            [`flags.${MODULE_ID}.corridorShapeId`]: link.corridorShapeId,
            [`flags.${MODULE_ID}.gridCells`]: link.gridCells,
            [`flags.${MODULE_ID}.corridorGridCells`]: corridorCells[index],
            [`flags.${MODULE_ID}.manuallyEdited`]: false
          });
        }
      }
      await this.scene.updateEmbeddedDocuments("Region", updates);
      await this._deleteDocuments(previous.filter(region =>
        !targets.some(entry => entry.id === region.id) && !corridors.some(entry => entry.id === region.id)
      ));
      const pairs = this.getZonePairs(count);
      const orderedPairs = Array.from({ length: count }, (_entry, index) => pairs.get(index));
      const adjacency = this.validateAdjacency(orderedPairs.map(pair => pair?.target).filter(Boolean));
      return { ok: true, pairs: orderedPairs, refs, geometry, adjacency };
    } catch (error) {
      await this._deleteDocuments([...targets, ...corridors]);
      throw error;
    }
  }

  validateAdjacency(targets) {
    const geometry = this.getGeometry();
    for (let index = 1; index < targets.length; index++) {
      if (!areSuppressionRegionsAdjacent(
        targets[index - 1], targets[index], this.runtime.canvas?.grid, geometry.pixelsPerYard
      )) {
        return { valid: false, zoneIndex: index, error: "\u0417\u043e\u043d\u0430 " + (index + 1) + " \u043d\u0435 \u0441\u043e\u0441\u0435\u0434\u0441\u0442\u0432\u0443\u0435\u0442 \u0441 \u0417\u043e\u043d\u043e\u0439 " + index + "." };
      }
    }
    return { valid: true };
  }

  async refreshCorridors(zoneCount) {
    const geometry = this.getGeometry();
    if (!geometry.valid) return { valid: false, errors: [geometry.error] };
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    const shooter = tokenCenter(liveToken);
    if (!liveToken || !shooter) return { valid: false, errors: ["\u0422\u043e\u043a\u0435\u043d \u0441\u0442\u0440\u0435\u043b\u043a\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u0442 \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435."] };
    const pairs = this.getZonePairs(zoneCount);
    const updates = [];
    for (let index = 0; index < zoneCount; index++) {
      const pair = pairs.get(index);
      if (!pair?.target || !pair?.corridor) continue;
      if (getSuppressionRegionFlag(pair.corridor)?.manuallyEdited === true) continue;
      const center = targetRegionCenter(pair.target, this.runtime.canvas?.grid);
      const result = buildSuppressionCorridorRegionShape({
        geometry,
        shooter,
        target: center,
        grid: this.runtime.canvas?.grid,
        sceneRect: this.runtime.canvas?.dimensions?.sceneRect ?? this.runtime.canvas?.dimensions?.rect ?? null
      });
      if (!result) return { valid: false, errors: ["\u0417\u043e\u043d\u0430 " + (index + 1) + ": \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044c \u043a\u043e\u0440\u0438\u0434\u043e\u0440."] };
      updates.push({
        _id: pair.corridor.id,
        shapes: [result.shape],
        [`flags.${MODULE_ID}.corridorGridCells`]: result.gridCells,
        [`flags.${MODULE_ID}.manuallyEdited`]: false
      });
    }
    if (updates.length) await this.scene.updateEmbeddedDocuments("Region", updates);
    return { valid: true, pairs: this.getZonePairs(zoneCount), geometry };
  }

  validate(zoneCount) {
    if (!this.scene) return { valid: false, errors: ["\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0441\u0446\u0435\u043d\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430."], pairs: [] };
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    const errors = [];
    if (!liveToken) errors.push("\u0422\u043e\u043a\u0435\u043d \u0441\u0442\u0440\u0435\u043b\u043a\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u0442 \u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0441\u0446\u0435\u043d\u0435.");
    const geometry = this.getGeometry();
    if (!geometry.valid) errors.push(geometry.error);
    const byZone = this.getZonePairs(zoneCount);
    const pairs = [];
    for (let index = 0; index < zoneCount; index++) {
      const pair = byZone.get(index);
      if (!pair?.target || !pair?.corridor) continue;
      const targetFlag = getSuppressionRegionFlag(pair.target);
      const corridorFlag = getSuppressionRegionFlag(pair.corridor);
      const sameScene = [pair.target, pair.corridor].every(region =>
        String(region.parent?.id ?? region.scene?.id ?? "") === String(this.scene.id)
      );
      if (!sameScene) continue;
      if (geometry.valid && (targetFlag?.scaleKey !== geometry.scaleKey || corridorFlag?.scaleKey !== geometry.scaleKey)) {
        errors.push("\u0417\u043e\u043d\u0430 " + (index + 1) + " \u0441\u043e\u0437\u0434\u0430\u043d\u0430 \u0434\u043b\u044f \u0434\u0440\u0443\u0433\u043e\u0433\u043e \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0430 \u0441\u0435\u0442\u043a\u0438.");
        continue;
      }
      if (geometry.valid && !isSuppressionTargetShapeSized(pair.target, geometry, this.runtime.canvas?.grid)) {
        errors.push("\u0417\u043e\u043d\u0430 " + (index + 1) + " \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435 \u0438\u043c\u0435\u0435\u0442 \u0442\u043e\u0447\u043d\u0443\u044e \u0448\u0438\u0440\u0438\u043d\u0443 2 \u044f\u0440\u0434\u0430.");
        continue;
      }
      const corridorShape = shapeSource(firstShape(pair.corridor));
      const corridorCells = getSuppressionRegionGridCells(pair.corridor);
      const corridorValid = geometry.twoHexMode
        ? corridorShape?.type === "grid" && corridorCells.length > 0
        : corridorShape?.type === "polygon" && Array.isArray(corridorShape.points) &&
          corridorShape.points.length === 8;
      if (!corridorValid) {
        errors.push("\u0417\u043e\u043d\u0430 " + (index + 1) + ": \u043a\u043e\u0440\u0438\u0434\u043e\u0440 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0435\u043d.");
        continue;
      }
      pairs[index] = pair;
    }
    if (pairs.filter(Boolean).length !== zoneCount) {
      errors.unshift("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0440\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0432\u0441\u0435 \u0446\u0435\u043b\u0435\u0432\u044b\u0435 \u0437\u043e\u043d\u044b \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0435\u0433\u043e \u043e\u0433\u043d\u044f.");
    } else {
      const adjacency = this.validateAdjacency(pairs.map(pair => pair.target));
      if (!adjacency.valid) errors.push(adjacency.error);
    }
    return { valid: errors.length === 0, errors, pairs, geometry };
  }

  _collectRegionTargets(region, found) {
    const shooterId = String(this.sourceTokenId ?? "");
    const documents = valuesOf(region?.tokens);
    if (documents.length) {
      for (const document of documents) {
        const token = document?.object ?? this.runtime.canvas?.tokens?.get?.(document?.id) ?? null;
        const id = String(document?.id ?? token?.id ?? "");
        if (!id || id === shooterId) continue;
        found.set(id, { id, name: getSafeSuppressionTargetName(token ?? document, this.runtime), token: token ?? document });
      }
      return;
    }
    const regionDocument = region?.document ?? region;
    for (const token of this.runtime.canvas?.tokens?.placeables ?? []) {
      const document = token?.document ?? token;
      const id = String(document?.id ?? token?.id ?? "");
      if (!id || id === shooterId || !document?.testInsideRegion?.(regionDocument)) continue;
      found.set(id, { id, name: getSafeSuppressionTargetName(token ?? document, this.runtime), token });
    }
  }

  getTargets(pair) {
    const found = new Map();
    if (pair?.target) this._collectRegionTargets(pair.target, found);
    if (pair?.corridor) this._collectRegionTargets(pair.corridor, found);
    return [...found.values()];
  }

  async clearZones() {
    this.clearPlacementHighlights({ cancel: true });
    const regions = this.getSessionRegions();
    await this._deleteDocuments(regions);
    return regions.length;
  }
}
