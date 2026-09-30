const MODULE_ID = "olegurps-qol";
const SESSIONS_FLAG = "suppressionFireSessions";
const REGION_TYPE = "suppressionFire";

const integer = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

const valuesOf = collection => {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  try { return Array.from(collection.values?.() ?? collection); }
  catch (_error) { return []; }
};

const copy = value => {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value));
};

const now = () => Date.now();

export function getSuppressionWeaponKey(weapon, attack = null) {
  const reference = weapon?.attackRef;
  const referenceKey = typeof reference === "string"
    ? reference
    : [reference?.uuid, reference?.path, reference?.name, reference?.mode].filter(Boolean).join("::");
  return String(weapon?.id || referenceKey || attack?.uuid || attack?.path ||
    [attack?.name, attack?.mode].filter(Boolean).join("::") || "ranged-attack");
}

export function getSuppressionRegionFlag(region) {
  const namespace = region?.flags?.[MODULE_ID] ?? null;
  if (namespace?.type === REGION_TYPE) return namespace;
  const nested = region?.getFlag?.(MODULE_ID, "suppressionFire") ?? namespace?.suppressionFire;
  return nested?.type === REGION_TYPE ? nested : null;
}

function normalizeGridCells(cells, limit = Number.MAX_SAFE_INTEGER) {
  return (Array.isArray(cells) ? cells : [])
    .map(cell => ({ i: Number(cell?.i), j: Number(cell?.j) }))
    .filter(cell => Number.isInteger(cell.i) && Number.isInteger(cell.j))
    .filter((cell, index, entries) =>
      entries.findIndex(other => other.i === cell.i && other.j === cell.j) === index)
    .slice(0, limit);
}

function normalizeTargetId(targetId, legacyTargetIds = []) {
  const value = String(targetId ?? "").trim();
  if (value) return value;
  const legacy = (Array.isArray(legacyTargetIds) ? legacyTargetIds : [])
    .map(entry => String(entry ?? "").trim())
    .find(Boolean);
  return legacy || null;
}

function normalizeZone(zone, index, defaultShots = 5) {
  const shotsAllocated = Math.max(0, integer(zone?.shotsAllocated ?? defaultShots));
  const hitsUsed = Math.max(0, Math.min(shotsAllocated, integer(zone?.hitsUsed)));
  const hitsRemaining = Math.max(0, Math.min(
    shotsAllocated - hitsUsed,
    integer(zone?.hitsRemaining ?? shotsAllocated - hitsUsed)
  ));
  const gridCells = normalizeGridCells(zone?.gridCells, 2);
  const corridorCells = normalizeGridCells(zone?.corridorCells ?? zone?.corridorGridCells);
  return {
    zoneIndex: index,
    shotsAllocated,
    hitsUsed: shotsAllocated - hitsRemaining,
    hitsRemaining,
    depleted: hitsRemaining <= 0,
    targetRegionId: zone?.targetRegionId ?? null,
    corridorRegionId: zone?.corridorRegionId ?? null,
    targetShapeId: zone?.targetShapeId ?? null,
    corridorShapeId: zone?.corridorShapeId ?? null,
    gridCells,
    corridorCells,
    manuallyEdited: zone?.manuallyEdited === true,
    targetId: Object.prototype.hasOwnProperty.call(zone ?? {}, "targetId")
      ? normalizeTargetId(zone?.targetId)
      : normalizeTargetId(null, zone?.targetIds),
    rangeIndex: Number.isInteger(Number(zone?.rangeIndex)) ? Number(zone.rangeIndex) : null,
    height: zone?.height ?? "",
    highGround: zone?.highGround === true,
    active: zone?.active === true,
    geometrySnapshot: zone?.geometrySnapshot ? copy(zone.geometrySnapshot) : null
  };
}

function normalizeSession(session) {
  const zoneCount = Math.max(1, integer(session?.zoneCount ?? session?.zones?.length ?? 1));
  const zones = Array.from({ length: zoneCount }, (_entry, index) =>
    normalizeZone(session?.zones?.[index], index)
  );
  const state = session?.state === "active" || session?.state === "activating" ? session.state : "draft";
  const mode = state === "draft"
    ? null
    : ["manual", "automatic"].includes(session?.mode) ? session.mode : "automatic";
  const ammoSpent = session?.ammoSpent === true || session?.ammoConsumed === true;
  return {
    version: 2,
    sessionId: String(session?.sessionId ?? ""),
    sceneId: session?.sceneId ?? null,
    sourceTokenId: session?.sourceTokenId ?? null,
    actorId: session?.actorId ?? null,
    userId: session?.userId ?? null,
    weaponKey: session?.weaponKey ?? null,
    attackId: session?.attackId ?? null,
    combatId: session?.combatId ?? null,
    combatantId: session?.combatantId ?? null,
    startingRound: session?.startingRound ?? null,
    startingTurn: session?.startingTurn ?? null,
    zoneCount,
    zones,
    controls: {
      mounted: !!session?.controls?.mounted,
      aimSeconds: session?.controls?.aimSeconds ?? "",
      braced: !!session?.controls?.braced,
      laserSight: !!session?.controls?.laserSight,
      manualModifier: session?.controls?.manualModifier ?? "",
      rangeIndex: session?.controls?.rangeIndex ?? null,
      governingSpecialty: session?.controls?.governingSpecialty ?? ""
    },
    state,
    mode,
    active: state === "active" && session?.active === true,
    ammoConsumed: ammoSpent,
    ammoSpent,
    createdAt: Number(session?.createdAt) || now(),
    updatedAt: Number(session?.updatedAt) || now()
  };
}

function readSessions(document) {
  const value = document?.getFlag?.(MODULE_ID, SESSIONS_FLAG) ?? document?.flags?.[MODULE_ID]?.[SESSIONS_FLAG];
  return value && typeof value === "object" && !Array.isArray(value) ? copy(value) : {};
}

async function writeSessions(document, sessions) {
  if (!document) throw new Error("The source Token document is unavailable.");
  if (Object.keys(sessions).length) return document.setFlag(MODULE_ID, SESSIONS_FLAG, sessions);
  return document.unsetFlag(MODULE_ID, SESSIONS_FLAG);
}

function sessionRegions(scene, sessionId) {
  return valuesOf(scene?.regions).filter(region =>
    String(getSuppressionRegionFlag(region)?.sessionId ?? "") === String(sessionId ?? "")
  );
}

function sessionMatchesContext(session, { sceneId, sourceTokenId, actorId, userId, weaponKey }) {
  return session && ["draft", "activating", "active"].includes(session.state) &&
    String(session.sceneId ?? "") === String(sceneId ?? "") &&
    String(session.sourceTokenId ?? "") === String(sourceTokenId ?? "") &&
    String(session.actorId ?? "") === String(actorId ?? "") &&
    String(session.userId ?? "") === String(userId ?? "") &&
    String(session.weaponKey ?? "") === String(weaponKey ?? "");
}

function recoverSessionsFromRegions(scene, context) {
  const grouped = new Map();
  for (const region of valuesOf(scene?.regions)) {
    const flag = getSuppressionRegionFlag(region);
    if (!flag?.sessionId || !sessionMatchesContext(flag, context)) continue;
    const sessionId = String(flag.sessionId);
    const entry = grouped.get(sessionId) ?? { flags: [], regions: [] };
    entry.flags.push(flag);
    entry.regions.push(region);
    grouped.set(sessionId, entry);
  }
  const sessions = [];
  for (const [sessionId, entry] of grouped) {
    const base = entry.flags[0] ?? {};
    const zoneCount = Math.max(1, integer(base.zoneCount), ...entry.flags.map(flag => integer(flag.zoneIndex) + 1));
    const zones = Array.from({ length: zoneCount }, (_item, index) => normalizeZone(null, index));
    for (let i = 0; i < entry.regions.length; i++) {
      const region = entry.regions[i];
      const flag = entry.flags[i];
      const index = integer(flag.zoneIndex);
      const zone = zones[index];
      if (!zone) continue;
      zone.shotsAllocated = Math.max(0, integer(flag.shotsAllocated ?? zone.shotsAllocated));
      zone.hitsUsed = Math.max(0, integer(flag.hitsUsed));
      zone.hitsRemaining = Math.max(0, integer(flag.hitsRemaining ?? zone.shotsAllocated - zone.hitsUsed));
      zone.depleted = flag.depleted === true || zone.hitsRemaining <= 0;
      zone.targetId = Object.prototype.hasOwnProperty.call(flag, "targetId")
        ? normalizeTargetId(flag.targetId)
        : normalizeTargetId(null, flag.targetIds);
      zone.rangeIndex = Number.isInteger(Number(flag.rangeIndex)) ? Number(flag.rangeIndex) : null;
      zone.height = flag.height ?? "";
      zone.highGround = flag.highGround === true;
      zone.active = flag.zoneActive === true;
      zone.geometrySnapshot = flag.geometrySnapshot ? copy(flag.geometrySnapshot) : null;
      if (Array.isArray(flag.gridCells)) zone.gridCells = copy(flag.gridCells);
      if (flag.regionRole === "target") {
        zone.targetRegionId = region.id;
        zone.targetShapeId = flag.targetShapeId ?? `${region.id}:0`;
      } else if (flag.regionRole === "corridor") {
        zone.corridorRegionId = region.id;
        zone.corridorShapeId = flag.corridorShapeId ?? `${region.id}:0`;
        zone.corridorCells = copy(flag.corridorGridCells ?? flag.corridorCells ?? []);
        zone.manuallyEdited = flag.manuallyEdited === true;
      }
    }
    sessions.push(normalizeSession({
      ...base,
      sessionId,
      zoneCount,
      zones,
      controls: base.controls ?? {},
      createdAt: base.createdAt,
      updatedAt: base.updatedAt
    }));
  }
  return sessions;
}

function findSourceCombatant(combat, sourceTokenId, actorId) {
  return valuesOf(combat?.combatants).find(combatant =>
    String(combatant?.tokenId ?? combatant?.token?.id ?? "") === String(sourceTokenId ?? "") ||
    String(combatant?.actorId ?? combatant?.actor?.id ?? "") === String(actorId ?? "")
  ) ?? null;
}

function combatSnapshot(runtime, sceneId, sourceTokenId, actorId) {
  const combat = runtime.game?.combat;
  const combatSceneId = combat?.scene?.id ?? combat?.sceneId;
  if (!combat || String(combatSceneId ?? "") !== String(sceneId ?? "")) {
    return { combatId: null, combatantId: null, startingRound: null, startingTurn: null };
  }
  const combatant = findSourceCombatant(combat, sourceTokenId, actorId);
  return {
    combatId: combat.id ?? null,
    combatantId: combatant?.id ?? null,
    startingRound: Number.isFinite(Number(combat.round)) ? Number(combat.round) : null,
    startingTurn: Number.isFinite(Number(combat.turn)) ? Number(combat.turn) : null
  };
}

function regionLinkData(regions, zoneCount) {
  const zones = Array.from({ length: zoneCount }, (_entry, index) => ({ zoneIndex: index }));
  for (const region of regions) {
    const flag = getSuppressionRegionFlag(region);
    const index = integer(flag?.zoneIndex);
    if (index < 0 || index >= zoneCount) continue;
    if (Array.isArray(flag.gridCells)) zones[index].gridCells = copy(flag.gridCells);
    if (flag.regionRole === "target") {
      zones[index].targetRegionId = region.id;
      zones[index].targetShapeId = flag.targetShapeId ?? `${region.id}:0`;
    } else if (flag.regionRole === "corridor") {
      zones[index].corridorRegionId = region.id;
      zones[index].corridorShapeId = flag.corridorShapeId ?? `${region.id}:0`;
      zones[index].corridorCells = copy(flag.corridorGridCells ?? flag.corridorCells ?? []);
      zones[index].manuallyEdited = flag.manuallyEdited === true;
    }
  }
  return zones;
}

export class SuppressionFireSessionService {
  constructor({ token, actor, weapon, attack, runtime = globalThis } = {}) {
    this.runtime = runtime;
    this.token = token;
    this.actor = actor;
    this.weapon = weapon;
    this.attack = attack;
    this.session = null;
  }

  get scene() { return this.runtime.canvas?.scene ?? null; }
  get storageDocument() {
    return this.token?.document ?? this.scene?.tokens?.get?.(this.sourceTokenId) ?? null;
  }
  get user() { return this.runtime.game?.user ?? null; }
  get sourceTokenId() { return this.token?.document?.id ?? this.token?.id ?? null; }
  get actorId() { return this.actor?.id ?? this.token?.actor?.id ?? null; }
  get weaponKey() { return getSuppressionWeaponKey(this.weapon, this.attack); }
  get attackId() {
    return String(this.attack?.uuid || this.attack?.path ||
      [this.attack?.name, this.attack?.mode].filter(Boolean).join("::") || "ranged-attack");
  }
  get isActive() { return this.session?.active === true && this.session?.state === "active"; }
  get isManualActive() { return this.isActive && this.session?.mode === "manual"; }
  get isAutomaticActive() { return this.isActive && this.session?.mode === "automatic"; }
  get hasStarted() { return this.session?.state === "active" || this.session?.state === "activating"; }

  _context() {
    return {
      sceneId: this.scene?.id ?? null,
      sourceTokenId: this.sourceTokenId,
      actorId: this.actorId,
      userId: this.user?.id ?? null,
      weaponKey: this.weaponKey
    };
  }

  findExisting() {
    const context = this._context();
    const candidates = [
      ...Object.values(readSessions(this.storageDocument)),
      ...recoverSessionsFromRegions(this.scene, context)
    ]
      .filter(session => sessionMatchesContext(session, context))
      .sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0));
    return candidates.length ? normalizeSession(candidates[0]) : null;
  }

  async loadExisting() {
    const existing = this.findExisting();
    if (!existing) {
      this.session = null;
      return null;
    }
    await this._save(existing, { syncRegions: false });
    await this._reconcileRegionLinks();
    return this.session;
  }

  async ensureSession() {
    if (this.session) return this.session;
    await this.loadExisting();
    if (this.session) return this.session;
    const randomID = this.runtime.foundry?.utils?.randomID ?? globalThis.foundry?.utils?.randomID;
    const sessionId = randomID?.(20) ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const context = this._context();
    this.session = normalizeSession({
      ...context,
      sessionId,
      attackId: this.attackId,
      zoneCount: 1,
      zones: [normalizeZone(null, 0)],
      state: "draft",
      active: false,
      ammoConsumed: false
    });
    await this._save(this.session, { syncRegions: false });
    return this.session;
  }

  async reconcileRegions() {
    return this._reconcileRegionLinks();
  }

  async _reconcileRegionLinks() {
    if (!this.session) return null;
    const links = regionLinkData(sessionRegions(this.scene, this.session.sessionId), this.session.zoneCount);
    let changed = false;
    const zones = this.session.zones.map((zone, index) => {
      const next = { ...zone };
      for (const key of [
        "targetRegionId", "corridorRegionId", "targetShapeId", "corridorShapeId",
        "gridCells", "corridorCells", "manuallyEdited"
      ]) {
        const value = ["gridCells", "corridorCells"].includes(key)
          ? (links[index]?.[key] ?? [])
          : key === "manuallyEdited"
            ? links[index]?.manuallyEdited === true
            : (links[index]?.[key] ?? null);
        if (JSON.stringify(next[key]) !== JSON.stringify(value)) changed = true;
        next[key] = value;
      }
      return next;
    });
    if (changed) await this._save({ ...this.session, zones }, { syncRegions: false });
    return this.session;
  }

  async _save(session, { syncRegions = true } = {}) {
    const normalized = normalizeSession({ ...session, updatedAt: now() });
    const sessions = readSessions(this.storageDocument);
    sessions[normalized.sessionId] = copy(normalized);
    await writeSessions(this.storageDocument, sessions);
    this.session = normalized;
    if (syncRegions) await this._syncRegionFlags(normalized);
    return normalized;
  }

  async _syncRegionFlags(session) {
    const regions = sessionRegions(this.scene, session.sessionId);
    if (!regions.length) return [];
    const updates = regions.map(region => {
      const flag = getSuppressionRegionFlag(region) ?? {};
      const zone = session.zones[integer(flag.zoneIndex)] ?? null;
      return {
        _id: region.id,
        [`flags.${MODULE_ID}.state`]: session.state,
        [`flags.${MODULE_ID}.active`]: session.active,
        [`flags.${MODULE_ID}.mode`]: session.mode,
        [`flags.${MODULE_ID}.ammoSpent`]: session.ammoSpent,
        [`flags.${MODULE_ID}.ammoConsumed`]: session.ammoConsumed,
        [`flags.${MODULE_ID}.combatId`]: session.combatId,
        [`flags.${MODULE_ID}.combatantId`]: session.combatantId,
        [`flags.${MODULE_ID}.startingRound`]: session.startingRound,
        [`flags.${MODULE_ID}.startingTurn`]: session.startingTurn,
        [`flags.${MODULE_ID}.attackId`]: session.attackId,
        [`flags.${MODULE_ID}.zoneCount`]: session.zoneCount,
        [`flags.${MODULE_ID}.controls`]: copy(session.controls),
        [`flags.${MODULE_ID}.createdAt`]: session.createdAt,
        [`flags.${MODULE_ID}.updatedAt`]: session.updatedAt,
        [`flags.${MODULE_ID}.shotsAllocated`]: zone?.shotsAllocated ?? 0,
        [`flags.${MODULE_ID}.hitsUsed`]: zone?.hitsUsed ?? 0,
        [`flags.${MODULE_ID}.hitsRemaining`]: zone?.hitsRemaining ?? 0,
        [`flags.${MODULE_ID}.depleted`]: zone?.depleted ?? false,
        [`flags.${MODULE_ID}.gridCells`]: copy(zone?.gridCells ?? []),
        [`flags.${MODULE_ID}.corridorGridCells`]: copy(zone?.corridorCells ?? []),
        [`flags.${MODULE_ID}.manuallyEdited`]: zone?.manuallyEdited === true,
        [`flags.${MODULE_ID}.targetId`]: zone?.targetId ?? null,
        [`flags.${MODULE_ID}.-=targetIds`]: null,
        [`flags.${MODULE_ID}.rangeIndex`]: zone?.rangeIndex ?? null,
        [`flags.${MODULE_ID}.height`]: zone?.height ?? "",
        [`flags.${MODULE_ID}.highGround`]: zone?.highGround === true,
        [`flags.${MODULE_ID}.zoneActive`]: zone?.active === true,
        [`flags.${MODULE_ID}.geometrySnapshot`]: copy(zone?.geometrySnapshot ?? null)
      };
    });
    return this.scene.updateEmbeddedDocuments("Region", updates);
  }

  async saveDraftConfiguration({ zoneCount, zoneShots, zoneConfigs, controls } = {}) {
    await this.ensureSession();
    if (this.isAutomaticActive || (this.hasStarted && this.session?.mode === "automatic")) return this.session;
    const manualLocked = this.hasStarted && this.session?.mode === "manual";
    const count = manualLocked
      ? this.session.zoneCount
      : Math.max(1, integer(zoneCount ?? this.session.zoneCount));
    const zones = Array.from({ length: count }, (_entry, index) => {
      const previous = this.session.zones[index] ?? {};
      const shotsAllocated = manualLocked
        ? Math.max(0, integer(previous.shotsAllocated ?? 5))
        : Math.max(0, integer(zoneShots?.[index] ?? previous.shotsAllocated ?? 5));
      const shotsChanged = shotsAllocated !== Math.max(0, integer(previous.shotsAllocated ?? 5));
      return normalizeZone({
        ...previous,
        ...(zoneConfigs?.[index] ?? {}),
        shotsAllocated,
        hitsUsed: shotsChanged ? 0 : previous.hitsUsed,
        hitsRemaining: shotsChanged ? shotsAllocated : previous.hitsRemaining,
        depleted: shotsChanged ? false : previous.depleted
      }, index);
    });
    const nextControls = manualLocked
      ? this.session.controls
      : { ...this.session.controls, ...controls };
    return this._save({ ...this.session, zoneCount: count, zones, controls: nextControls });
  }

  async resizeDraftZones(zoneCount, { defaultShots = 5 } = {}) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const count = Math.max(1, integer(zoneCount));
    const zones = Array.from({ length: count }, (_entry, index) =>
      this.session.zones[index]
        ? normalizeZone(this.session.zones[index], index)
        : normalizeZone(null, index, defaultShots)
    );
    return this._save({ ...this.session, zoneCount: count, zones });
  }

  async setPlacement(zoneRefs = []) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const zones = this.session.zones.map((zone, index) => ({
      ...zone,
      targetRegionId: zoneRefs[index]?.targetRegionId ?? null,
      corridorRegionId: zoneRefs[index]?.corridorRegionId ?? null,
      targetShapeId: zoneRefs[index]?.targetShapeId ?? null,
      corridorShapeId: zoneRefs[index]?.corridorShapeId ?? null,
      gridCells: copy(zoneRefs[index]?.gridCells ?? []),
      corridorCells: copy(zoneRefs[index]?.corridorCells ?? []),
      manuallyEdited: false
    }));
    return this._save({ ...this.session, zones });
  }

  async setZonePlacement(zoneIndex, zoneRef = {}) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const index = integer(zoneIndex);
    if (!this.session.zones[index]) throw new Error("Suppression Fire zone was not found.");
    const zones = this.session.zones.map((zone, entryIndex) => entryIndex === index
      ? normalizeZone({
          ...zone,
          targetRegionId: zoneRef.targetRegionId ?? null,
          corridorRegionId: zoneRef.corridorRegionId ?? null,
          targetShapeId: zoneRef.targetShapeId ?? null,
          corridorShapeId: zoneRef.corridorShapeId ?? null,
          gridCells: copy(zoneRef.gridCells ?? []),
          corridorCells: copy(zoneRef.corridorCells ?? []),
          manuallyEdited: zoneRef.manuallyEdited === true
        }, entryIndex)
      : zone
    );
    return this._save({ ...this.session, zones });
  }

  async clearZone(zoneIndex) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const index = integer(zoneIndex);
    const zones = this.session.zones.map((zone, entryIndex) => entryIndex === index
      ? normalizeZone({
          ...zone,
          targetRegionId: null,
          corridorRegionId: null,
          targetShapeId: null,
          corridorShapeId: null,
          gridCells: [],
          corridorCells: [],
          manuallyEdited: false,
          targetId: null,
          rangeIndex: null,
          height: "",
          highGround: false,
          active: false,
          geometrySnapshot: null
        }, entryIndex)
      : zone
    );
    return this._save({ ...this.session, zones });
  }

  async setZoneTarget(zoneIndex, targetId = null) {
    await this.ensureSession();
    if (this.isAutomaticActive || (this.hasStarted && this.session?.mode === "automatic")) return this.session;
    const index = integer(zoneIndex);
    if (!this.session.zones[index]) throw new Error("Suppression Fire zone was not found.");
    const zones = this.session.zones.map((zone, entryIndex) => entryIndex === index
      ? normalizeZone({ ...zone, targetId: normalizeTargetId(targetId) }, entryIndex)
      : zone
    );
    return this._save({ ...this.session, zones });
  }

  async setManualCorridor(zoneIndex, corridorCells = []) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const index = integer(zoneIndex);
    if (!this.session.zones[index]) throw new Error("Suppression Fire zone was not found.");
    const zones = this.session.zones.map((zone, entryIndex) => entryIndex === index
      ? normalizeZone({ ...zone, corridorCells, manuallyEdited: true }, entryIndex)
      : zone
    );
    return this._save({ ...this.session, zones });
  }

  async activate({ zoneShots, controls, mode = "automatic" } = {}) {
    await this.ensureSession();
    if (this.isActive || this.session.ammoSpent) return { session: this.session, alreadyActive: true };
    const activationMode = mode === "manual" ? "manual" : "automatic";
    const count = this.session.zoneCount;
    const zones = Array.from({ length: count }, (_entry, index) => {
      const shotsAllocated = Math.max(0, integer(
        zoneShots?.[index] ?? this.session.zones[index]?.shotsAllocated ?? 0
      ));
      return normalizeZone({
        ...(this.session.zones[index] ?? {}),
        shotsAllocated,
        hitsUsed: 0,
        hitsRemaining: shotsAllocated,
        depleted: false
      }, index);
    });
    const combat = activationMode === "automatic"
      ? combatSnapshot(this.runtime, this.scene?.id, this.sourceTokenId, this.actorId)
      : { combatId: null, combatantId: null, startingRound: null, startingTurn: null };
    if (activationMode === "automatic" && (!combat.combatId || !combat.combatantId)) {
      throw new Error("\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c \u043c\u043e\u0436\u043d\u043e \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0432 Combat, \u0433\u0434\u0435 \u0441\u0442\u0440\u0435\u043b\u043e\u043a \u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f combatant.");
    }
    const activeZones = zones.map((zone, index) => normalizeZone({
      ...zone,
      active: true,
      geometrySnapshot: {
        targetRegionId: zone.targetRegionId,
        corridorRegionId: zone.corridorRegionId,
        gridCells: copy(zone.gridCells),
        corridorCells: copy(zone.corridorCells),
        manuallyEdited: zone.manuallyEdited === true
      }
    }, index));
    const session = await this._save({
      ...this.session,
      ...combat,
      mode: activationMode,
      zones: activeZones,
      controls: { ...this.session.controls, ...controls },
      state: "activating",
      active: false,
      ammoConsumed: false,
      ammoSpent: false
    });
    return { session, alreadyActive: false };
  }

  async activateManual(options = {}) {
    return this.activate({ ...options, mode: "manual" });
  }

  async activateAutomatic(options = {}) {
    return this.activate({ ...options, mode: "automatic" });
  }

  async markAmmoConsumed() {
    if (!this.session) throw new Error("Suppression Fire session was not found.");
    return this._save({
      ...this.session,
      state: "active",
      active: true,
      ammoConsumed: true,
      ammoSpent: true
    });
  }

  async revertActivation() {
    if (!this.session || this.session.ammoSpent) return this.session;
    const zones = this.session.zones.map((zone, index) => normalizeZone({
      ...zone,
      hitsUsed: 0,
      hitsRemaining: zone.shotsAllocated,
      depleted: false,
      active: false,
      geometrySnapshot: null
    }, index));
    return this._save({
      ...this.session,
      zones,
      mode: null,
      state: "draft",
      active: false,
      ammoConsumed: false,
      ammoSpent: false,
      combatId: null,
      combatantId: null,
      startingRound: null,
      startingTurn: null
    });
  }
  async recordHits(zoneIndex, calculatedHits, { allowDraft = false } = {}) {
    if (!this.session) return { actualHits: 0, completed: false, session: null };
    const live = readSessions(this.storageDocument)[this.session.sessionId] ?? this.session;
    const session = normalizeSession(live);
    const index = integer(zoneIndex);
    const zone = session.zones[index];
    if ((!session.active && !allowDraft) || !zone || zone.depleted) {
      return { actualHits: 0, completed: false, session };
    }
    const actualHits = Math.min(zone.hitsRemaining, Math.max(0, integer(calculatedHits)));
    const zones = session.zones.map((entry, entryIndex) => entryIndex === index
      ? normalizeZone({
          ...entry,
          hitsUsed: entry.hitsUsed + actualHits,
          hitsRemaining: entry.hitsRemaining - actualHits
        }, entryIndex)
      : entry
    );
    const updated = await this._save({ ...session, zones });
    const completed = updated.active && updated.zones.every(entry => entry.depleted);
    if (completed) {
      if (updated.mode === "manual") {
        await this.finishManual();
      } else {
        const completedSessionId = updated.sessionId;
        await this.finish({ deleteRegions: true });
        this.runtime.Hooks?.callAll?.("olegurpsQolSuppressionFireEnded", [completedSessionId]);
      }
    }
    return { actualHits, completed, session: this.session };
  }

  async finishManual() {
    await this.ensureSession();
    if (!this.isManualActive && this.session?.mode !== "manual") return this.session;
    const zones = this.session.zones.map((zone, index) => normalizeZone({
      ...zone,
      hitsUsed: 0,
      hitsRemaining: zone.shotsAllocated,
      depleted: false,
      active: false,
      geometrySnapshot: null
    }, index));
    return this._save({
      ...this.session,
      zones,
      mode: null,
      state: "draft",
      active: false,
      ammoConsumed: false,
      ammoSpent: false,
      combatId: null,
      combatantId: null,
      startingRound: null,
      startingTurn: null
    });
  }

  async finish({ deleteRegions = true } = {}) {
    const session = this.session;
    if (!session) return { removedRegions: 0 };
    let removedRegions = 0;
    if (deleteRegions) {
      const regions = sessionRegions(this.scene, session.sessionId).filter(region => {
        const flag = getSuppressionRegionFlag(region);
        return String(flag?.sourceTokenId ?? "") === String(session.sourceTokenId ?? "") &&
          String(flag?.actorId ?? "") === String(session.actorId ?? "") &&
          String(flag?.weaponKey ?? "") === String(session.weaponKey ?? "");
      });
      const ids = regions.map(region => region.id).filter(Boolean);
      if (ids.length) {
        await this.scene.deleteEmbeddedDocuments("Region", ids);
        removedRegions = ids.length;
      }
    }
    const sessions = readSessions(this.storageDocument);
    delete sessions[session.sessionId];
    await writeSessions(this.storageDocument, sessions);
    this.session = null;
    return { removedRegions };
  }
}

function hasTurnAdvanced(session, combat) {
  const round = Number(combat?.round);
  const turn = Number(combat?.turn);
  const startingRound = Number(session?.startingRound);
  const startingTurn = Number(session?.startingTurn);
  if (![round, turn, startingRound, startingTurn].every(Number.isFinite)) return false;
  return round > startingRound || (round === startingRound && turn > startingTurn);
}

export function isSuppressionFireAuthority(session, runtime = globalThis) {
  const user = runtime.game?.user;
  if (!user) return false;
  if (String(user.id) === String(session.userId)) return true;
  if (!user.isGM) return false;
  const owner = runtime.game?.users?.get?.(session.userId);
  if (owner?.active) return false;
  const activeGms = valuesOf(runtime.game?.users)
    .filter(entry => entry?.active && entry?.isGM)
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  return String(activeGms[0]?.id ?? "") === String(user.id);
}

export async function expireSuppressionFireForCombat(combat, runtime = globalThis) {
  const scene = combat?.scene ?? runtime.game?.scenes?.get?.(combat?.sceneId) ??
    (String(runtime.canvas?.scene?.id ?? "") === String(combat?.sceneId ?? "") ? runtime.canvas.scene : null);
  if (!scene) return [];
  const currentCombatantId = combat?.combatant?.id ?? valuesOf(combat?.turns)[integer(combat?.turn)]?.id ?? null;
  if (!currentCombatantId) return [];

  const stores = valuesOf(scene.tokens).map(document => ({ document, sessions: readSessions(document) }));
  const expired = [];
  for (const store of stores) {
    for (const session of Object.values(store.sessions)) {
      if (session?.active !== true || session?.state !== "active" || session?.mode !== "automatic") continue;
      if (String(session.combatId ?? "") !== String(combat.id ?? "")) continue;
      if (String(session.combatantId ?? "") !== String(currentCombatantId)) continue;
      if (!hasTurnAdvanced(session, combat) || !isSuppressionFireAuthority(session, runtime)) continue;
      expired.push({ store, session });
    }
  }
  if (!expired.length) return [];

  const sessionIds = new Set(expired.map(entry => String(entry.session.sessionId)));
  const regionIds = valuesOf(scene.regions)
    .filter(region => sessionIds.has(String(getSuppressionRegionFlag(region)?.sessionId ?? "")))
    .map(region => region.id)
    .filter(Boolean);
  if (regionIds.length) await scene.deleteEmbeddedDocuments("Region", regionIds);

  for (const store of stores) {
    let changed = false;
    for (const sessionId of sessionIds) {
      if (!store.sessions[sessionId]) continue;
      delete store.sessions[sessionId];
      changed = true;
    }
    if (changed) await writeSessions(store.document, store.sessions);
  }
  const expiredIds = [...sessionIds];
  runtime.Hooks?.callAll?.("olegurpsQolSuppressionFireEnded", expiredIds);
  return expiredIds;
}

let hooksRegistered = false;
export function registerSuppressionFireHooks(runtime = globalThis) {
  if (hooksRegistered || !runtime.Hooks?.on) return;
  hooksRegistered = true;
  runtime.Hooks.on("updateCombat", async combat => {
    try {
      const expired = await expireSuppressionFireForCombat(combat, runtime);
      if (expired.length) runtime.ui?.notifications?.info?.("Suppression Fire ended at the start of the shooter's next turn.");
    } catch (error) {
      console.error("OleGURPS QOL | Suppression Fire combat cleanup:", error);
    }
  });
}