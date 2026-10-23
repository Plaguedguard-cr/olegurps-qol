import { AmmoService } from "./ammo-service.js";
import { resolveRuntimeAttackProfile, newAttackId, attackProfileError } from "./attack-profile-runtime.js";
import {persistShotSnapshot} from './shot-history-storage.js';
import { createShotSnapshot } from "./attack-profile-resolver.js";
import { getSuppressionWeaponKey, getSuppressionRegionFlag } from "./suppression-fire-session-service.js";

const FLAG = "gurpsAmmoManager";
const MODULE = "olegurps-qol";
const clone = value => globalThis.foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
const sessionKey = (sceneId, tokenId, userId) => [sceneId, tokenId, userId].join(":");

export function getSpecialFireOwner({ token, actor } = {}) {
  const document = token?.document ?? token;
  const sceneId = token?.scene?.id ?? globalThis.canvas?.scene?.id;
  const ammoState = actor?.getFlag?.("world", FLAG);
  const spray = Object.values(ammoState?.sprayingFireSessions ?? {}).find(session =>
    session?.state === "planned" &&
    String(session.sceneId) === String(sceneId) &&
    String(session.sourceTokenId) === String(document?.id));
  if (spray) return { type: "spraying", session: spray };
  const suppression = document?.getFlag?.(MODULE, "suppressionFireSessions") ??
    document?.flags?.[MODULE]?.suppressionFireSessions ?? {};
  const entry = Object.values(suppression).find(session =>
    ["draft", "activating", "active"].includes(session?.state) &&
    String(session.sceneId) === String(sceneId) &&
    String(session.sourceTokenId) === String(document?.id));
  if (entry) return { type: "suppression", session: entry };
  const regions = globalThis.canvas?.scene?.regions?.contents ?? [];
  const recovered = regions.map(getSuppressionRegionFlag).find(session =>
    session && ["draft", "activating", "active"].includes(session.state) &&
    String(session.sourceTokenId) === String(document?.id));
  return recovered ? { type: "suppression", session: recovered } : null;
}

export class SprayingFireSessionService {
  constructor({ token, actor, weapon, attack, runtime = globalThis } = {}) {
    this.token = token;
    this.actor = actor;
    this.weapon = weapon;
    this.attack = attack;
    this.runtime = runtime;
    this.ammo = new AmmoService(actor);
    this.busy = false;
  }

  get key() {
    return sessionKey(this.runtime.canvas?.scene?.id, this.token?.document?.id ?? this.token?.id, this.runtime.game?.user?.id);
  }

  get weaponKey() { return getSuppressionWeaponKey(this.weapon, this.attack); }

  findExisting() {
    const state = this.actor?.getFlag?.("world", FLAG);
    const session = state?.sprayingFireSessions?.[this.key];
    return session?.state === "planned" && session.weaponKey === this.weaponKey ? clone(session) : null;
  }

  async save(session) {
    if (session?.state !== "planned") throw new Error("Only a confirmed Spraying Fire plan can be saved.");
    const state = await this.ammo.loadState();
    state.sprayingFireSessions ??= {};
    const current = state.sprayingFireSessions[this.key];
    if (current?.sessionId === session.sessionId) {
      if (current.ammunitionProfile) session.ammunitionProfile = clone(current.ammunitionProfile);
      if (current.attackExecutions) session.attackExecutions = clone(current.attackExecutions);
      if (current.ammoConsumed) session.ammoConsumed = true;
    }
    state.sprayingFireSessions[this.key] = clone({ ...session, updatedAt: Date.now() });
    await this.ammo.saveState(state, { preserveSprayingSessions: false });
    return clone(state.sprayingFireSessions[this.key]);
  }

  async deleteSession() {
    const sessions = this.actor?.getFlag?.("world", FLAG)?.sprayingFireSessions;
    if (!sessions?.[this.key]) return false;
    const path = Object.keys(sessions).length === 1
      ? `flags.world.${FLAG}.-=sprayingFireSessions`
      : `flags.world.${FLAG}.sprayingFireSessions.-=${this.key}`;
    await this.actor.update({ [path]: null });
    if (this.actor.getFlag("world", FLAG)?.sprayingFireSessions?.[this.key]) {
      throw new Error("Spraying Fire session was not deleted.");
    }
    return true;
  }

  async discardUnconfirmed() {
    const state = await this.ammo.loadState();
    if (state.sprayingFireSessions?.[this.key]?.state !== "selecting") return false;
    return this.deleteSession();
  }

  async createPlanned({ modeIndex = 0, direction = "left-to-right", targets, plannedAmmo } = {}) {
    if (!Array.isArray(targets) || targets.length < 2 || !Number.isInteger(plannedAmmo) || plannedAmmo < 2) {
      throw new Error("A confirmed Spraying Fire plan needs at least two targets and a valid ammo allocation.");
    }
    const existing = this.findExisting();
    if (existing) return existing;
    const owner = getSpecialFireOwner({ token: this.token, actor: this.actor });
    if (owner) throw new Error("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0438\u043b\u0438 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043c \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
    const ammo = await this.currentAmmo();
    if (plannedAmmo > Math.min(ammo.loaded, ammo.total)) {
      throw new Error("\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432 \u0434\u043b\u044f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u043d\u043e\u0439 \u043e\u0447\u0435\u0440\u0435\u0434\u0438");
    }
    return this.save({
      sessionId: this.runtime.foundry?.utils?.randomID?.(20) ?? crypto.randomUUID(),
      state: "planned", sceneId: this.runtime.canvas?.scene?.id,
      sourceTokenId: this.token?.document?.id ?? this.token?.id,
      actorId: this.actor.id, userId: this.runtime.game?.user?.id,
      weaponKey: this.weaponKey, modeIndex, direction,
      targets: clone(targets), common: {
        aimSeconds: 0, braced: false, laserSight: false, allOutAttack: false,
        moveAndAttack: false, manualModifier: 0,
        governingSpecialty: this.weapon?.governingSpecialty ?? ""
      },
      plannedAmmo, nextTarget: 0, createdAt: Date.now()
    });
  }
  async cancel() {
    const session = this.findExisting();
    if (session?.attackExecutions) await this.finalizeSnapshots(session, 0, { cancelled: true });
    return this.deleteSession();
  }

  async currentAmmo() {
    const state = await this.ammo.loadState();
    const weapon = state.weapons.find(entry => entry.id === this.weapon.id);
    if (!weapon) return { loaded: 0, total: 0 };
    return { loaded: weapon.magazines[weapon.loadedIndex] ?? 0, total: weapon.totalAmmo ?? 0 };
  }

  async executeTarget(session, options, execute) {
    const attackId = newAttackId();
    const result = await this.ammo.executeShot({ weaponId: this.weapon.id, attackId,
      resourceTiming: "spraying-completion", deferConsumption: true, sessionKey: this.key,
      prepare: ({ state, ammunition }) => {
        const persisted = state.sprayingFireSessions?.[this.key];
        if (!persisted || persisted.sessionId !== session.sessionId || persisted.ammoConsumed) throw new Error("Review");
        const pinned = persisted.ammunitionProfile?.resource;
        if (pinned && (pinned.magazineId !== ammunition?.magazineId || pinned.ammoKey !== ammunition?.ammoKey ||
            pinned.legacyIndex !== (ammunition?.legacyIndex ?? null))) throw new Error(attackProfileError("BurstMagazineChanged"));
        const profile = resolveRuntimeAttackProfile({ actor: this.actor, attack: this.attack,
          weaponId: this.weapon.id, state, ammunition,
          context: { kind: "spraying", sessionId: session.sessionId, physicalShots: options.physicalShots,
            effectiveSkill: options.effectiveSkill, effectiveRoF: options.effectiveRoF, rcl: options.rcl } });
        if(persisted.ammunitionProfile?.weaponConfiguration?.variant==='lp'&&
          persisted.ammunitionProfile.weaponConfiguration.fireMode!==profile.weaponConfiguration?.fireMode)throw Error('LPFireModeChanged');
        return { profile, amount: session.plannedAmmo };
      },
      execute: ({ profile }) => execute({ ...options, attackProfile: profile, attackId,
        resourceTiming: "spraying-completion", resourceReceiptId: "spraying:" + session.sessionId })
    }).catch(error => { throw new Error(attackProfileError(error.message, this.runtime)); });
    return result;
  }

  async finish() {
    if (this.busy) return false;
    this.busy = true;
    try {
      const state = await this.ammo.loadState();
      const session = state.sprayingFireSessions?.[this.key];
      if (!session || session.weaponKey !== this.weaponKey || session.state !== "planned" ||
          !session.targets?.length || session.targets.some(target => !target.completed)) return false;
      if (session.ammoConsumed) {
        await this.finalizeSnapshots(session, Number(session.plannedAmmo));
        return this.deleteSession();
      }
      const weapon = state.weapons.find(entry => entry.id === this.weapon.id);
      const pinned = session.ammunitionProfile?.resource;
      const actual = this.ammo.readAttackAmmunition(this.weapon.id);
      if (pinned && (pinned.magazineId !== actual?.magazineId || pinned.ammoKey !== actual?.ammoKey ||
          pinned.legacyIndex !== (actual?.legacyIndex ?? null))) throw new Error(attackProfileError("BurstMagazineChanged"));
      const planned = Number(session.plannedAmmo);
      if (!weapon || !Number.isInteger(planned) || planned < 1 ||
          weapon.magazines[weapon.loadedIndex] < planned || weapon.totalAmmo < planned) {
        throw new Error("\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0430\u0442\u0440\u043e\u043d\u043e\u0432 \u0434\u043b\u044f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u043d\u043e\u0439 \u043e\u0447\u0435\u0440\u0435\u0434\u0438");
      }
      if (!await this.ammo.consumeLoadedRounds(state, weapon, planned, { sessionKey: this.key, expectedResource: pinned })) throw new Error("Insufficient ammunition");
      await this.finalizeSnapshots(session, planned);
      await this.deleteSession();
      return true;
    } finally {
      this.busy = false;
    }
  }

  async finalizeSnapshots(session, planned, { cancelled = false } = {}) {
    for (const execution of session.attackExecutions ?? []) {
      const message = this.runtime.game?.messages?.get?.(execution.messageId);
      if (!message?.setFlag || message.getFlag?.("olegurps-qol", "shotSnapshot")) continue;
      const power = this.actor.getFlag('world','gurpsAmmoManager')?.sprayingFireSessions?.[this.key]?.powerReceipt;
      const fuel=this.actor.getFlag('world','gurpsAmmoManager')?.sprayingFireSessions?.[this.key]?.fuelReceipt;
      const profile = fuel&&!cancelled?{...execution.profile,resource:{...execution.profile.resource,fuel:{...fuel,allocation:execution.allocatedShots,sharedReceipt:'spraying:'+session.sessionId}}}:power && !cancelled ? {...execution.profile,resource:{...execution.profile.resource,
        power:{...power,allocation:execution.allocatedShots,sharedReceipt:'spraying:'+session.sessionId}}} : execution.profile;
      const snapshot = createShotSnapshot(profile, { attackId: execution.attackId,
        spent: cancelled ? 0 : execution.allocatedShots, resourceTiming: cancelled ? "spraying-cancelled" : "spraying-completion",
        resourceReceiptId: "spraying:" + session.sessionId, messageId: execution.messageId });
      try {
        await persistShotSnapshot(message,snapshot,{burstReceipt:{ id: "spraying:" + session.sessionId,
          totalSpent: planned, magazineId: snapshot.magazineId,
          // Traverse waste belongs to the one burst receipt, never to another consumption call.
          traverseSpent: Math.max(0, planned - session.attackExecutions.reduce((sum, entry) => sum + entry.allocatedShots, 0)) }});
      } catch (error) { console.error("OleGURPS QOL | Spraying shot metadata:", error); }
    }
  }
}
