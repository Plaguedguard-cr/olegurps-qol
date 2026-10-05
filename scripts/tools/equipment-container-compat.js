const MARKER = Symbol.for("olegurps-qol.equipment-container-compat");

function nonempty(record) {
  return record && typeof record === "object" && Object.keys(record).length > 0;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function identicalBranches(contains, collapsed) {
  return nonempty(contains) && nonempty(collapsed)
    && JSON.stringify(stable(contains)) === JSON.stringify(stable(collapsed));
}

function collectRepairs(entries, deltaEntries, path, changes) {
  for (const [key, item] of Object.entries(entries ?? {})) {
    if (!item || typeof item !== "object") continue;
    const itemPath = `${path}.${key}`;
    const deltaItem = deltaEntries?.[key];
    if (identicalBranches(item.contains, item.collapsed)) {
      // A synthetic Actor merges its delta recursively with the base Actor.
      // An empty delta object cannot hide children inherited from the base.
      const collapsedInDelta = nonempty(deltaItem?.collapsed);
      const containsInDelta = nonempty(deltaItem?.contains);
      const keep = collapsedInDelta && !containsInDelta ? "collapsed" : "contains";
      const remove = keep === "contains" ? "collapsed" : "contains";
      changes[`${itemPath}.${remove}`] = null;
      collectRepairs(item[keep], deltaItem?.[keep], `${itemPath}.${keep}`, changes);
    } else {
      collectRepairs(item.contains, deltaItem?.contains, `${itemPath}.contains`, changes);
      collectRepairs(item.collapsed, deltaItem?.collapsed, `${itemPath}.collapsed`, changes);
    }
  }
}

function removeIdenticalSiblings(entries) {
  if (!entries || typeof entries !== "object") return 0;
  let removed = 0;
  const seen = new Map();
  for (const [key, item] of Object.entries(entries)) {
    if (!item || typeof item !== "object") continue;
    const uuid = item.uuid;
    const signature = JSON.stringify(stable(item));
    if (uuid && seen.get(uuid) === signature) {
      delete entries[key];
      removed++;
      continue;
    }
    if (uuid) seen.set(uuid, signature);
    removed += removeIdenticalSiblings(item.contains);
    removed += removeIdenticalSiblings(item.collapsed);
  }
  return removed;
}

function normalizePreparedContainers(actor) {
  if (!actor.isToken) return 0;
  const equipment = actor.system?.equipment;
  return removeIdenticalSiblings(equipment?.carried)
    + removeIdenticalSiblings(equipment?.other)
    + removeIdenticalSiblings(actor.system?.ads);
}

export async function repairTokenContainers(tokenDocument) {
  if (!tokenDocument?.actor || tokenDocument.actorLink || !tokenDocument.delta) return 0;
  const equipment = tokenDocument.actor._source?.system?.equipment;
  const deltaEquipment = tokenDocument.delta._source?.system?.equipment;
  const changes = {};
  for (const section of ["carried", "other"]) {
    collectRepairs(equipment?.[section], deltaEquipment?.[section],
      `system.equipment.${section}`, changes);
  }
  collectRepairs(tokenDocument.actor._source?.system?.ads,
    tokenDocument.delta._source?.system?.ads, "system.ads", changes);
  const count = Object.keys(changes).length;
  if (count) await tokenDocument.delta.update(changes);
  return count;
}

async function repairCurrentCanvas() {
  for (const token of canvas?.tokens?.placeables ?? []) {
    try {
      await repairTokenContainers(token.document);
    } catch (error) {
      console.error("OleGURPS QOL: container repair failed.", error);
    }
  }
}

export async function installEquipmentContainerCompatibility() {
  if (game.system?.id !== "gurps") return;
  const prototype = CONFIG.Actor.documentClass?.prototype;
  if (typeof prototype?.toggleExpand !== "function"
    || typeof prototype.prepareBaseData !== "function"
    || typeof prototype.moveEquipment !== "function") {
    throw new Error("GGA equipment methods are unavailable");
  }
  if (!prototype[MARKER]) {
    const originalPrepare = prototype.prepareBaseData;
    prototype.prepareBaseData = function (...args) {
      const result = originalPrepare.apply(this, args);
      normalizePreparedContainers(this);
      return result;
    };
    const originalMove = prototype.moveEquipment;
    prototype.moveEquipment = async function (...args) {
      const result = await originalMove.apply(this, args);
      if (this.isToken) {
        await repairTokenContainers(this.token);
        this.prepareData();
        this.render(false);
      }
      return result;
    };
    const original = prototype.toggleExpand;
    prototype.toggleExpand = async function (path, ...args) {
      const result = await original.call(this, path, ...args);
      if (this.isToken && /^system\.(?:equipment\.(?:carried|other)|ads)\./.test(path)) {
        await repairTokenContainers(this.token);
      }
      return result;
    };
    Object.defineProperty(prototype, MARKER, { value: true });
    Hooks.on("canvasReady", () => { void repairCurrentCanvas(); });
  }
  await repairCurrentCanvas();
}
