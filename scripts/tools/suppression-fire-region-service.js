import { getSuppressionRegionFlag, getSuppressionWeaponKey } from "./suppression-fire-session-service.js";

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
    return { valid: false, error: "Unable to determine the Scene Grid physical units in yards." };
  }
  const pixelsPerUnit = finite(distancePixels) ?? (
    finite(gridSize) && finite(gridDistance) && Number(gridDistance) > 0
      ? Number(gridSize) / Number(gridDistance)
      : null
  );
  if (!pixelsPerUnit || pixelsPerUnit <= 0) {
    return { valid: false, error: "Unable to determine the Scene Grid pixel scale." };
  }
  const pixelsPerYard = pixelsPerUnit / yardsPerUnit;
  return {
    valid: true,
    mode: "circle",
    isGridless,
    isHexagonal,
    gridBased: !isGridless,
    pixelsPerYard,
    targetRadiusPixels: pixelsPerYard,
    zonePixels: ZONE_WIDTH_YARDS * pixelsPerYard,
    scaleKey: `${isGridless ? "gridless" : isHexagonal ? "hex" : "square"}:${gridDistance}:${gridSize}:${gridUnits}`
  };
}

export function buildSuppressionCorridorShape({ shooter, target, pixelsPerYard, widthYards = 2 } = {}) {
  const sx = finite(shooter?.x);
  const sy = finite(shooter?.y);
  const tx = finite(target?.x);
  const ty = finite(target?.y);
  const scale = finite(pixelsPerYard);
  if ([sx, sy, tx, ty, scale].some(value => value === null) || scale <= 0) return null;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return null;
  const halfWidth = Math.max(0, Number(widthYards) * scale / 2);
  const px = (-dy / length) * halfWidth;
  const py = (dx / length) * halfWidth;
  return {
    type: "polygon",
    hole: false,
    points: [
      sx + px, sy + py,
      tx + px, ty + py,
      tx - px, ty - py,
      sx - px, sy - py
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

export function isSuppressionTargetShapeSized(region, geometry) {
  const shape = firstShape(region);
  const source = shapeSource(shape);
  if (!shape || !source || !geometry?.valid || source.type !== "circle") return false;
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

  _baseFlag(zoneIndex, geometry, regionRole) {
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
      targetRegionId: null,
      corridorRegionId: null,
      targetShapeId: null,
      corridorShapeId: null,
      state: "draft",
      active: false
    };
  }

  _targetShapeData(geometry) {
    return {
      type: "circle",
      hole: false,
      x: 0,
      y: 0,
      radius: geometry.targetRadiusPixels,
      gridBased: geometry.gridBased
    };
  }

  _visualData(zoneIndex, role) {
    const owner = this.runtime.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    const always = this.runtime.CONST?.REGION_VISIBILITY?.ALWAYS ?? 2;
    const style = ZONE_STYLES[zoneIndex % ZONE_STYLES.length];
    const levelId = this.runtime.canvas?.level?.id;
    return {
      color: style[role],
      locked: role === "corridor",
      restriction: { enabled: false },
      highlightMode: "coverage",
      displayMeasurements: role === "target",
      visibility: always,
      ownership: { [this.user.id]: owner },
      ...(levelId ? { levels: [levelId] } : {})
    };
  }

  _targetRegionData(zoneIndex, geometry) {
    return {
      name: `Suppression Fire - Zone ${zoneIndex + 1} - Target`,
      ...this._visualData(zoneIndex, "target"),
      shapes: [this._targetShapeData(geometry)],
      flags: { [MODULE_ID]: this._baseFlag(zoneIndex, geometry, "target") }
    };
  }

  _corridorRegionData(zoneIndex, geometry, corridor) {
    return {
      name: `Suppression Fire - Zone ${zoneIndex + 1} - Corridor`,
      ...this._visualData(zoneIndex, "corridor"),
      shapes: [corridor],
      flags: { [MODULE_ID]: this._baseFlag(zoneIndex, geometry, "corridor") }
    };
  }

  async _deleteDocuments(regions) {
    const ids = regions.map(region => region?.id).filter(Boolean);
    if (!ids.length) return [];
    return this.scene.deleteEmbeddedDocuments("Region", ids);
  }

  async placeZones(zoneCount) {
    if (!this.hasCreatePermission()) {
      return {
        ok: false,
        error: "You do not have Foundry permission to create Regions. A GM must grant Create Regions to your role."
      };
    }
    if (!this.scene || !this.layer?.placeRegion || !this.scene?.createEmbeddedDocuments) {
      return { ok: false, error: "Foundry v14 Scene Regions are unavailable on the current Scene." };
    }
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    if (!liveToken) return { ok: false, error: "The source token is no longer present on the current Scene." };
    const shooter = tokenCenter(liveToken);
    if (!shooter) return { ok: false, error: "Unable to determine the source token center." };
    const geometry = this.getGeometry();
    if (!geometry.valid) return { ok: false, error: geometry.error };
    const count = Math.max(1, Math.trunc(Number(zoneCount) || 1));
    const previous = this.getSessionRegions();
    this.runtime.ui?.notifications?.info?.(`Place the centers of ${count} suppression ${count === 1 ? "zone" : "zones"} in order.`);

    const targets = [];
    for (let index = 0; index < count; index++) {
      const target = await this.layer.placeRegion(
        this._targetRegionData(index, geometry),
        { allowRotation: false, create: true }
      );
      if (!target) {
        await this._deleteDocuments(targets);
        return { ok: false, cancelled: true, error: "Zone placement was cancelled; existing Regions were kept." };
      }
      targets.push(target);
    }

    let corridors = [];
    try {
      const corridorData = targets.map((target, index) => {
        const center = shapeCenter(firstShape(target));
        const corridor = buildSuppressionCorridorShape({ shooter, target: center, pixelsPerYard: geometry.pixelsPerYard });
        if (!corridor) throw new Error(`Zone ${index + 1}: unable to build a 2-yard suppression corridor.`);
        return this._corridorRegionData(index, geometry, corridor);
      });
      corridors = await this.scene.createEmbeddedDocuments("Region", corridorData);
      if (!Array.isArray(corridors) || corridors.length !== count) {
        throw new Error("Foundry did not create every suppression corridor.");
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
          corridorShapeId: `${corridor.id}:0`
        };
        refs[index] = { zoneIndex: index, ...link };
        for (const region of [target, corridor]) {
          updates.push({
            _id: region.id,
            locked: true,
            [`flags.${MODULE_ID}.targetRegionId`]: link.targetRegionId,
            [`flags.${MODULE_ID}.corridorRegionId`]: link.corridorRegionId,
            [`flags.${MODULE_ID}.targetShapeId`]: link.targetShapeId,
            [`flags.${MODULE_ID}.corridorShapeId`]: link.corridorShapeId
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
        return { valid: false, zoneIndex: index, error: `Zone ${index + 1} is not adjacent to Zone ${index}.` };
      }
    }
    return { valid: true };
  }

  async refreshCorridors(zoneCount) {
    const geometry = this.getGeometry();
    if (!geometry.valid) return { valid: false, errors: [geometry.error] };
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    const shooter = tokenCenter(liveToken);
    if (!liveToken || !shooter) return { valid: false, errors: ["The source token is no longer present on the current Scene."] };
    const pairs = this.getZonePairs(zoneCount);
    const updates = [];
    for (let index = 0; index < zoneCount; index++) {
      const pair = pairs.get(index);
      if (!pair?.target || !pair?.corridor) continue;
      const center = shapeCenter(firstShape(pair.target));
      const corridor = buildSuppressionCorridorShape({ shooter, target: center, pixelsPerYard: geometry.pixelsPerYard });
      if (!corridor) return { valid: false, errors: [`Zone ${index + 1}: unable to recalculate its corridor.`] };
      updates.push({ _id: pair.corridor.id, shapes: [corridor] });
    }
    if (updates.length) await this.scene.updateEmbeddedDocuments("Region", updates);
    return { valid: true, pairs: this.getZonePairs(zoneCount), geometry };
  }

  validate(zoneCount) {
    if (!this.scene) return { valid: false, errors: ["Current Scene is unavailable."], pairs: [] };
    const liveToken = this.runtime.canvas?.tokens?.get?.(this.sourceTokenId);
    const errors = [];
    if (!liveToken) errors.push("The source token is no longer present on the current Scene.");
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
        errors.push(`Zone ${index + 1} was created for a different Grid scale.`);
        continue;
      }
      if (geometry.valid && !isSuppressionTargetShapeSized(pair.target, geometry)) {
        errors.push(`Zone ${index + 1} is no longer exactly 2 yards across.`);
        continue;
      }
      const corridorShape = shapeSource(firstShape(pair.corridor));
      if (corridorShape?.type !== "polygon" || !Array.isArray(corridorShape.points) || corridorShape.points.length !== 8) {
        errors.push(`Zone ${index + 1}: its suppression corridor is invalid.`);
        continue;
      }
      pairs[index] = pair;
    }
    if (pairs.filter(Boolean).length !== zoneCount) {
      errors.unshift("Place every suppression target zone first.");
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
        found.set(id, { id, name: String(document?.name ?? token?.name ?? "Target"), token: token ?? document });
      }
      return;
    }
    const regionDocument = region?.document ?? region;
    for (const token of this.runtime.canvas?.tokens?.placeables ?? []) {
      const document = token?.document ?? token;
      const id = String(document?.id ?? token?.id ?? "");
      if (!id || id === shooterId || !document?.testInsideRegion?.(regionDocument)) continue;
      found.set(id, { id, name: String(document?.name ?? token?.name ?? "Target"), token });
    }
  }

  getTargets(pair) {
    const found = new Map();
    if (pair?.target) this._collectRegionTargets(pair.target, found);
    if (pair?.corridor) this._collectRegionTargets(pair.corridor, found);
    return [...found.values()];
  }

  async clearZones() {
    const regions = this.getSessionRegions();
    await this._deleteDocuments(regions);
    return regions.length;
  }
}
