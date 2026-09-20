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

function normalizeZone(zone, index, defaultShots = 5) {
  const shotsAllocated = Math.max(0, integer(zone?.shotsAllocated ?? defaultShots));
  const hitsUsed = Math.max(0, Math.min(shotsAllocated, integer(zone?.hitsUsed)));
  const hitsRemaining = Math.max(0, Math.min(
    shotsAllocated - hitsUsed,
    integer(zone?.hitsRemaining ?? shotsAllocated - hitsUsed)
  ));
  return {
    zoneIndex: index,
    shotsAllocated,
    hitsUsed: shotsAllocated - hitsRemaining,
    hitsRemaining,
    depleted: hitsRemaining <= 0,
    targetRegionId: zone?.targetRegionId ?? null,
    corridorRegionId: zone?.corridorRegionId ?? null,
    targetShapeId: zone?.targetShapeId ?? null,
    corridorShapeId: zone?.corridorShapeId ?? null
  };
}

function normalizeSession(session) {
  const zoneCount = Math.max(1, integer(session?.zoneCount ?? session?.zones?.length ?? 1));
  const zones = Array.from({ length: zoneCount }, (_entry, index) =>
    normalizeZone(session?.zones?.[index], index)
  );
  return {
    version: 1,
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
    state: session?.state === "active" || session?.state === "activating" ? session.state : "draft",
    active: session?.active === true,
    ammoConsumed: session?.ammoConsumed === true,
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
      if (flag.regionRole === "target") {
        zone.targetRegionId = region.id;
        zone.targetShapeId = flag.targetShapeId ?? `${region.id}:0`;
      } else if (flag.regionRole === "corridor") {
        zone.corridorRegionId = region.id;
        zone.corridorShapeId = flag.corridorShapeId ?? `${region.id}:0`;
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
    if (flag.regionRole === "target") {
      zones[index].targetRegionId = region.id;
      zones[index].targetShapeId = flag.targetShapeId ?? `${region.id}:0`;
    } else if (flag.regionRole === "corridor") {
      zones[index].corridorRegionId = region.id;
      zones[index].corridorShapeId = flag.corridorShapeId ?? `${region.id}:0`;
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

  async _reconcileRegionLinks() {
    if (!this.session) return null;
    const links = regionLinkData(sessionRegions(this.scene, this.session.sessionId), this.session.zoneCount);
    let changed = false;
    const zones = this.session.zones.map((zone, index) => {
      const next = { ...zone };
      for (const key of ["targetRegionId", "corridorRegionId", "targetShapeId", "corridorShapeId"]) {
        const value = links[index]?.[key] ?? null;
        if (next[key] !== value) changed = true;
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
        [`flags.${MODULE_ID}.depleted`]: zone?.depleted ?? false
      };
    });
    return this.scene.updateEmbeddedDocuments("Region", updates);
  }

  async saveDraftConfiguration({ zoneCount, zoneShots, controls } = {}) {
    await this.ensureSession();
    if (this.hasStarted) return this.session;
    const count = Math.max(1, integer(zoneCount ?? this.session.zoneCount));
    const zones = Array.from({ length: count }, (_entry, index) => {
      const shotsAllocated = Math.max(0, integer(
        zoneShots?.[index] ?? this.session.zones[index]?.shotsAllocated ?? 5
      ));
      return normalizeZone({
        ...(this.session.zones[index] ?? {}),
        shotsAllocated,
        hitsUsed: 0,
        hitsRemaining: shotsAllocated,
        depleted: false
      }, index);
    });
    return this._save({ ...this.session, zoneCount: count, zones, controls: { ...this.session.controls, ...controls } });
  }

  async setPlacement(zoneRefs = []) {
    await this.ensureSession();
    const zones = this.session.zones.map((zone, index) => ({
      ...zone,
      targetRegionId: zoneRefs[index]?.targetRegionId ?? null,
      corridorRegionId: zoneRefs[index]?.corridorRegionId ?? null,
      targetShapeId: zoneRefs[index]?.targetShapeId ?? null,
      corridorShapeId: zoneRefs[index]?.corridorShapeId ?? null
    }));
    return this._save({ ...this.session, zones });
  }

  async activate({ zoneShots, controls } = {}) {
    await this.ensureSession();
    if (this.isActive || this.session.ammoConsumed) return { session: this.session, alreadyActive: true };
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
    const combat = combatSnapshot(this.runtime, this.scene?.id, this.sourceTokenId, this.actorId);
    const session = await this._save({
      ...this.session,
      ...combat,
      zones,
      controls: { ...this.session.controls, ...controls },
      state: "activating",
      active: false,
      ammoConsumed: false
    });
    return { session, alreadyActive: false };
  }

  async markAmmoConsumed() {
    if (!this.session) throw new Error("Suppression Fire session was not found.");
    return this._save({ ...this.session, state: "active", active: true, ammoConsumed: true });
  }

  async revertActivation() {
    if (!this.session || this.session.ammoConsumed) return this.session;
    return this._save({
      ...this.session,
      state: "draft",
      active: false,
      combatId: null,
      combatantId: null,
      startingRound: null,
      startingTurn: null
    });
  }

  async recordHits(zoneIndex, calculatedHits) {
    if (!this.session) return { actualHits: 0, completed: false, session: null };
    const live = readSessions(this.storageDocument)[this.session.sessionId] ?? this.session;
    const session = normalizeSession(live);
    const index = integer(zoneIndex);
    const zone = session.zones[index];
    if (!session.active || !zone || zone.depleted) {
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
    const completed = updated.zones.every(entry => entry.depleted);
    if (completed) await this.finish({ deleteRegions: true });
    return { actualHits, completed, session: completed ? null : this.session };
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

function isHookAuthority(session, runtime) {
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
      if (session?.active !== true || session?.state !== "active") continue;
      if (String(session.combatId ?? "") !== String(combat.id ?? "")) continue;
      if (String(session.combatantId ?? "") !== String(currentCombatantId)) continue;
      if (!hasTurnAdvanced(session, combat) || !isHookAuthority(session, runtime)) continue;
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
  return [...sessionIds];
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