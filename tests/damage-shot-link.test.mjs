import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDamageShotLink, captureDamageSource, resolveDamageShotLink, shotDamageComponents } from "../scripts/tools/damage-shot-link.js";
import { AttackProfileResolver, createShotSnapshot } from "../scripts/tools/attack-profile-resolver.js";
import { resolveAmmunitionEffects, parseKineticDamage } from "../scripts/tools/ammunition-effects.js";

const scope = "olegurps-qol";
test("P3 historical multi-ball and mixed Damage keeps the exact original shot after reload without extra payloads",async()=>{
 for(const [variantId,formula,kind]of [["ht_duplex","4d+1 pi","bullet"],["ht_buck_and_ball","5d+1 pi","mixed"]]){
  const f=fixture({effects:true}),s=f.source(),p=structuredClone(s.shot.profile);
  p.ammunition.recipe={version:1,variantId,customId:"isolated-GM-P3"};p.effective.damage=formula;
  p.damage={status:"resolved",nativeSafe:true,formula,components:[{role:"kinetic",status:"resolved",formula}],transformations:[],rules:{projectiles:{count:2,kind,b409Eligible:false},...(kind==="mixed"?{hitAllocation:{first:"ball",later:"pellets",pellet:"1d+1 pi",automatic:false}}:{})}};
  s.shot=createShotSnapshot(p,{attackId:"attack-A",spent:1,messageId:"A"});s.message.flags[scope]={shotSnapshot:s.shot,attackProfile:p};const saved=JSON.stringify(s.shot);s.actor.system.ranged.Rifle.damage="99d pi-";
  for(let i=0;i<2;i++){s.message.flags[scope].shotSnapshot=JSON.parse(saved);const m=await f.damage(s);assert.equal(m.flags.gurps.transfer.payload.length,1);assert.equal(m.flags.gurps.transfer.payload[0].roll.formula,formula);assert.equal(JSON.stringify(s.message.getFlag(scope,"shotSnapshot")),saved);assert.equal(shotDamageComponents(s.message,f.runtime).length,0);}
 }
});
test("DU historical native Damage survives reload and current design/weapon changes without ignition dice",async()=>{
  const f=fixture({effects:true}),s=f.source(),profile=structuredClone(s.shot.profile);
  profile.raw.damage="6d pi+";profile.ammunition.recipe={version:1,variantId:"ht_apdu",customId:"isolated-confirmed-GM-design"};
  profile.damage=resolveAmmunitionEffects({raw:profile.raw,variantId:"ht_apdu",baseStatus:"compatible",constructionStatus:"gm-approved",
    facts:{caliberMm:20,availabilityTL:8,weaponPlatforms:{values:["autocannon"],complete:true},evidence:{du_penetrator_round_design_confirmed:{value:true,source:"isolated explicit GM test contract"}}}});
  assert.equal(profile.damage.nativeSafe,true);profile.effective.damage=profile.damage.formula;
  s.shot=createShotSnapshot(profile,{attackId:"attack-A",spent:1,messageId:"A"});s.message.flags[scope]={shotSnapshot:s.shot,attackProfile:profile};
  const saved=JSON.stringify(s.shot);s.actor.system.ranged.Rifle.damage="99d pi-";
  for(let i=0;i<2;i++){
    s.message.flags[scope].shotSnapshot=JSON.parse(saved);
    const m=await f.damage(s),payload=m.flags.gurps.transfer.payload;
    assert.equal(payload.length,1);assert.equal(payload[0].roll.formula,"7d+1(2) pi+");assert.equal(payload[0].armorDivisor,2);assert.equal(payload[0].damageType,"pi+");
    assert.equal(m.getFlag(scope,"damageLink").originatingAttackMessageId,"A");assert.equal(JSON.stringify(s.message.getFlag(scope,"shotSnapshot")),saved);
  }
});
test("historical LeMat .42 central snapshot retains native Damage after physical identity correction",async()=>{
  const f=fixture({effects:true}),s=f.source({mode:"Shot Barrel",ammoId:"ht_42_caplock_lemat"}),name="Girard LeMat, .42 Caplock";
  const profile=structuredClone(s.shot.profile);
  profile.mode.name=name;profile.raw.name=name;profile.raw.damage="1d(0.5) pi-";
  profile.effective.name=name;profile.effective.damage="1d(0.5) pi-";
  profile.damage=resolveAmmunitionEffects({raw:profile.raw});
  const historical=createShotSnapshot(profile,{attackId:"attack-A",spent:1,resourceTiming:"after-attack",resourceReceiptId:"attack-A",messageId:"A"});
  s.message.flags[scope].shotSnapshot=historical;s.message.flags[scope].attackProfile=profile;
  s.action.name=name+" (Shot Barrel)";
  // Current mode and load cannot rewrite a previously completed shot.
  Object.assign(s.actor.system.ranged["Shot Barrel"],{name,damage:"99d pi+"});
  const saved=JSON.stringify(historical),m=await f.damage(s);
  assert.equal(m.getFlag(scope,"damageLink").originatingAttackMessageId,"A");
  assert.equal(m.flags.gurps.transfer.payload[0].roll.formula,"1d(0.5) pi-");
  assert.equal(m.flags.gurps.transfer.payload[0].armorDivisor,0.5);
  assert.equal(m.flags.gurps.transfer.payload[0].damageType,"pi-");
  assert.equal(JSON.stringify(s.message.getFlag(scope,"shotSnapshot")),saved);
});
test("embedded shotgun chamber quote uses the exact native parser name without matching foreign Damage", () => {
  const f = fixture(), source = f.source();
  const shot = structuredClone(source.shot);
  shot.mode.name = 'Winchester Model 1897, 12G 2.75"'; shot.mode.mode = null;
  shot.profile.mode = shot.mode;
  source.message.flags[scope].shotSnapshot = shot;
  f.runtime.GURPS.parselink = text => text === 'D:"Winchester Model 1897, 12G 2.75\\""' ?
    { action: { type: "attackdamage", name: "Winchester Model 1897, 12G 2.75*" } } : {};
  const action = { type: "attackdamage", name: "Winchester Model 1897, 12G 2.75*", sourceId: shot.actorId };
  assert.equal(captureDamageSource(action, f.click(source), f.runtime).status, "linked");
  assert.equal(captureDamageSource({ ...action, name: "Winchester Model 1897*" }, f.click(source), f.runtime), null);
  source.message.isContentVisible = false;
  assert.equal(captureDamageSource(action, f.click(source), f.runtime).reason, "source-inaccessible");
});
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
test("P4 linked and tandem stage Damage stays native, source-bound and resource-free after reload",async()=>{
  const fx=fixture({effects:true}),source=fx.source(),p=structuredClone(source.shot.profile);
  p.ammunition.recipe={version:1,variantId:"ht_ms_heat",customId:"published-tandem"};
  p.damage={status:"resolved",nativeSafe:true,formula:"6d(10) pi++",components:[
    {role:"kinetic",status:"resolved",formula:"6d(10) pi++"},
    {role:"main-charge",status:"resolved",formula:"8d cr ex",relation:"follow_up"},
    {role:"linked",status:"resolved",formula:"4d cr ex",relation:"linked"}],rules:{componentOrder:["kinetic","main-charge","linked"]},transformations:[]};
  p.effective.damage=p.damage.formula;
  const shot=createShotSnapshot(p,{attackId:"attack-A",spent:1,messageId:"A"});
  source.message.flags[scope]={shotSnapshot:shot,attackProfile:p};
  const saved=JSON.stringify(source.message.flags),inventory=JSON.stringify(source.actor.inventory);
  source.actor.system.ranged.Rifle.damage="99d pi-";
  for(let repeat=0;repeat<2;repeat++)for(const component of shotDamageComponents(source.message,fx.runtime)){
    source.message.flags=JSON.parse(saved);
    const event=fx.click(source);event.currentTarget.dataset.olegurpsShotDamageSource="A";
    event.currentTarget.dataset.olegurpsShotComponent=component.role;
    await fx.runtime.GURPS.performAction(fx.runtime.GURPS.parselink(component.formula).action,source.actor,event);
    await Promise.all(fx.tasks);
    const m=fx.calls.at(-1).message;
    assert.equal(m.getFlag(scope,"damageLink").damageComponent,component.role);
    assert.equal(m.flags.gurps.transfer.payload[0].roll.formula,component.formula.replace(" ex",""));
    assert.equal(m.flags.gurps.transfer.payload[0].armorDivisor,1);
    assert.equal(JSON.stringify(source.message.flags),saved);
  }
  assert.equal(fx.calls.length,4);assert.equal(JSON.stringify(source.actor.inventory),inventory);
  source.message.isContentVisible=false;assert.equal(shotDamageComponents(source.message,fx.runtime).length,0);
});
function fixture({ effects = false } = {}) {
  let sequence = 0;
  const messages = new Map(), actors = new Map(), handlers = new Map(), tasks = [], calls = [], errors = [];
  const user = { id: "gm", isGM: true };
  const runtime = { crypto, console: { error: (...args) => errors.push(args) },
    game: { user, messages, actors, settings: { get: () => "public" } },
    Hooks: { on(name, fn) { const key = ++sequence; handlers.set(key, { name, fn }); return key; }, off(_name, key) { handlers.delete(key); } } };
  const emit = (name, ...args) => { for (const hook of handlers.values()) if (hook.name === name) hook.fn(...args); };
  class Message {
    constructor(data) { Object.assign(this, data); this.flags ??= {}; this.whisper ??= []; this.blind ??= false;
      this.visible = true; this.isContentVisible = true; this.isAuthor = true; }
    getFlag(namespace, key) { return this.flags[namespace]?.[key]; }
    async setFlag(namespace, key, value) { this.flags[namespace] ??= {}; this.flags[namespace][key] = structuredClone(value); }
    updateSource(data) { this.flags[scope] ??= {}; this.flags[scope].damageLink = structuredClone(data[`flags.${scope}.damageLink`]); }
  }
  runtime.ChatMessage = { getSpeakerActor: speaker => actors.get(speaker.actor), async create(data, options = {}) {
    // Foundry expands flat keys first; an explicit nested flags object takes precedence.
    const normalized = { ...data, flags: data.flags ?? { gurps: { transfer: data["flags.gurps.transfer"] } } };
    const message = new Message(normalized);
    if (options.messageMode === "gm" || options.messageMode === "blind") {
      message.whisper = ["gm"]; message.blind = options.messageMode === "blind";
    } else if (options.messageMode === "self") { message.whisper = [user.id]; message.blind = false; }
    else if (options.messageMode === "public") { message.whisper = []; message.blind = false; }
    emit("preCreateChatMessage", message, data, options, user.id);
    if (runtime.rejectCreate) throw new Error("native creation failed");
    message.id = "damage-" + ++sequence;
    messages.set(message.id, message);
    calls.push({ data, options, message });
    return message;
  } };
  class DamageChat {
    static create(actor, dice, type, event) {}
    _getDiceData(dice, type, mods) {}
    // Same relevant native contract: async template, unawaited create, first draggable Roll in messageData.
    async _createChatMessage(actor, dice, mods, payload, event) {
      if (event.templateGate) await event.templateGate.promise;
      const data = { user: user.id, speaker: { actor: actor.id }, content: "native DamageChat",
        rolls: [payload[0].roll], "flags.gurps.transfer": { type: "damageItem", payload },
        ...(event.shiftKey ? { blind: true, whisper: ["gm"] } : {}) };
      const creation = runtime.ChatMessage.create(data, { messageMode: event.messageMode ?? "public" });
      tasks.push(creation);
    }
  }
  runtime.GURPS = { DamageChat, lastTargetedRoll: { misleading: "B" }, parselink: otf => ({ action: JSON.parse(otf) }),
    async resolveDamageRoll(event, actor, otf) {
      if (event.resolutionGate) await event.resolutionGate.promise;
      return runtime.GURPS.performAction(JSON.parse(otf), actor, event);
    },
    async performAction(action, actor, event) {
      if (event.dispatchGate) await event.dispatchGate.promise;
      if (!actor.isOwner || event.cancel) return false; // Native permission/cancellation checks remain native.
      const mode = action.type === "damage" ? action.att : Object.values(actor.system.ranged).find(mode => `${mode.name} (${mode.mode})` === action.name);
      if (!mode) return false;
      const formula = action.type === "damage" ? action.formula + " " + action.damagetype : mode.damage;
      const parsed = parseKineticDamage(formula), damageType = parsed?.type ?? action.damagetype ?? "pi", armorDivisor = parsed?.divisor ?? 1;
      const roll = { formula, total: 17, options: {} };
      await new DamageChat()._createChatMessage(actor, { damageType }, [], [{ roll, damageType, armorDivisor }], event);
      return true;
    } };
  if (effects) {
    runtime.GURPS.actionFuncs = { attackdamage(context) {}, damage(context) {} };
    runtime.GURPS.parselink = text => {
      if (text.startsWith("{")) return { action: JSON.parse(text) };
      const parsed = parseKineticDamage(text);
      const secondary = text.match(/^(\d+d(?:[+-]\d+)?) (cr ex|cut)$/);
      if (secondary) return { action: { type: "damage", formula: secondary[1], damagetype: secondary[2].split(" ")[0],
        ...(secondary[2] === "cr ex" ? { extdamagetype: "ex" } : {}) } };
      return parsed ? { action: { type: "damage", formula: text.slice(0, text.lastIndexOf(" ")), damagetype: parsed.type } } : {};
    };
  }
  function source({ actorId = "actor-a", mode = "Rifle", id = "A", ammoId = "ordinary", pending = false,
    whisper = [], blind = false, variantId = null } = {}) {
    let actor = actors.get(actorId);
    if (!actor) { actor = { id: actorId, isOwner: true, system: { ranged: {}, skills: {}, equipment: {} },
      inventory: { installedId: "current", rounds: 11 } }; actors.set(actorId, actor); }
    const attack = { name: "AK-47", mode, path: "system.ranged." + mode, uuid: mode, damage: "5d+1 pi" };
    actor.system.ranged[mode] = structuredClone(attack);
    let profile = new AttackProfileResolver().resolve({ actorId, weaponId: "weapon", attack, rawAttack: attack,
      ammunition: { kind: "physical-magazine", magazineId: "mag-" + id, ammoKey: ammoId, available: 20, total: 40,
        type: { source: "catalog", book: "ht", kind: "ammo-item", ammoId, name: ammoId } } });
    if (variantId) {
      const damage = resolveAmmunitionEffects({ raw: attack, variantId, baseStatus:"compatible",constructionStatus:"compatible",
        facts: { caliberMm: 7.62, muzzleVelocityFps: 2536, availabilityTL: 8 } });
      profile = { ...profile, damage, effective: { ...profile.effective, damage: damage.formula },
        transformations: damage.transformations, ammunition: { ...profile.ammunition, recipe: { version: 1, variantId } } };
    }
    const shot = createShotSnapshot(profile, { attackId: "attack-" + id, spent: pending ? 0 : 3,
      resourceTiming: "after-attack", resourceReceiptId: pending ? null : "attack-" + id, messageId: pending ? null : id });
    const message = new Message({ id, speaker: { actor: actorId }, flags: { [scope]: { attackProfile: profile,
      [pending ? "pendingShotSnapshot" : "shotSnapshot"]: shot } }, whisper, blind });
    messages.set(id, message);
    return { actor, message, shot, action: { type: "attackdamage", sourceId: actorId, name: "AK-47 (" + mode + ")" } };
  }
  function click(source, extra = {}) {
    const element = { dataset: {}, classList: { contains: name => name === "gurpslink" },
      closest: selector => selector === "[data-message-id]" ? { dataset: { messageId: source.message.id } } : {} };
    return { currentTarget: element, target: element, preventDefault() {}, ...extra };
  }
  const installation = installDamageShotLink(runtime);
  const damage = async (source, extra = {}, actor = source.actor) => {
    await runtime.GURPS.performAction(source.action, actor, click(source, extra));
    await Promise.all(tasks); return calls.at(-1)?.message;
  };
  return { runtime, source, click, damage, calls, tasks, messages, emit, installation, errors };
}

test("A and B Damage in reverse order use their own shots after magazine and last-roll changes", async () => {
  const fx = fixture(), a = fx.source(), b = fx.source({ id: "B", ammoId: "other" });
  const saved = JSON.stringify([a.shot, b.shot, a.actor.system, a.actor.inventory]);
  a.actor.inventory.installedId = "unrelated-new-magazine";
  const resources = JSON.stringify(a.actor.inventory);
  for (const shot of [b, a]) {
    const message = await fx.damage(shot);
    const link = message.getFlag(scope, "damageLink");
    assert.equal(link.status, "linked"); assert.equal(link.originatingAttackMessageId, shot.message.id);
    assert.equal(link.reason, null);
    assert.equal(link.attackId, shot.shot.attackId); assert.equal(link.actorId, shot.actor.id);
    assert.equal(link.damageMessageId, message.id); assert.equal(link.shotSnapshot.ammunition.ammoId, shot.shot.ammunition.ammoId);
    assert.equal(message.rolls[0].formula, "5d+1 pi");
    assert.deepEqual(message.flags.gurps.transfer.payload[0], { roll: message.rolls[0], damageType: "pi", armorDivisor: 1 });
    assert.ok(!("profile" in link.shotSnapshot));
  }
  assert.equal(JSON.stringify(a.actor.inventory), resources);
  assert.equal(JSON.stringify([a.shot, b.shot, a.actor.system, { ...a.actor.inventory, installedId: "current" }]), saved);
  assert.equal(fx.errors.length, 0);
});

test("repeat Damage creates independent events for the same source, including a reused event object", async () => {
  const fx = fixture(), a = fx.source(), event = fx.click(a);
  await fx.runtime.GURPS.performAction(a.action, a.actor, event);
  await fx.runtime.GURPS.performAction(a.action, a.actor, event);
  await Promise.all(fx.tasks);
  const links = fx.calls.map(call => call.message.getFlag(scope, "damageLink"));
  assert.equal(links.length, 2); assert.notEqual(links[0].damageEventId, links[1].damageEventId);
  assert.notEqual(links[0].damageMessageId, links[1].damageMessageId);
  assert.deepEqual(links[0].shotSnapshot, links[1].shotSnapshot);
});

test("interleaved native awaits keep two actors and modes independent and use the clicked Actor", async () => {
  const fx = fixture(), a = fx.source(), b = fx.source({ id: "B", actorId: "actor-b", mode: "Auto", ammoId: "other" });
  const gateA = defer(), gateB = defer();
  const first = fx.runtime.GURPS.performAction(a.action, b.actor, fx.click(a, { dispatchGate: gateA }));
  const second = fx.runtime.GURPS.performAction(b.action, a.actor, fx.click(b, { templateGate: gateB }));
  gateA.resolve(); await first; gateB.resolve(); await second; await Promise.all(fx.tasks);
  assert.deepEqual(fx.calls.map(call => [call.message.speaker.actor, call.message.getFlag(scope, "damageLink").shotSnapshot.mode.mode]),
    [["actor-a", "Rifle"], ["actor-b", "Auto"]]);
});

test("native multiple/combine dialog captures source before its first await and DOM event cleanup", async () => {
  const fx = fixture(), a = fx.source(), b = fx.source({ id: "B", actorId: "actor-b" }), gate = defer();
  const event = fx.click(a, { resolutionGate: gate });
  const execution = fx.runtime.GURPS.resolveDamageRoll(event, b.actor, JSON.stringify(a.action));
  event.currentTarget = null; event.target = null;
  fx.runtime.GURPS.lastTargetedRoll = b.shot;
  gate.resolve(); await execution; await Promise.all(fx.tasks);
  assert.equal(fx.calls[0].message.getFlag(scope, "damageLink").attackId, a.shot.attackId);
  assert.equal(fx.calls[0].message.speaker.actor, a.actor.id);
});

test("two modes of one weapon retain independent source IDs through close/reopen and serialized chat", async () => {
  const fx = fixture(), a = fx.source(), b = fx.source({ id: "B", mode: "Auto", ammoId: "other" });
  for (const source of [b, a]) {
    const message = await fx.damage(source);
    // Resolve on a fresh runtime, without any of the adapter's event or Roll WeakMaps.
    const reloaded = { ...fx.runtime, GURPS: {}, game: { ...fx.runtime.game, messages: new Map() } };
    const document = { ...JSON.parse(JSON.stringify(message)), getFlag: message.getFlag };
    const resolved = resolveDamageShotLink(document, reloaded);
    assert.equal(resolved.attackId, source.shot.attackId); assert.equal(resolved.sourceAvailable, false);
    assert.equal(resolved.shotSnapshot.mode.mode, source.shot.mode.mode);
    assert.ok(Object.isFrozen(resolved.shotSnapshot.ammunition));
  }
});

test("pending-only, missing and malformed snapshots stay explicitly unlinked and preserve native Damage", async () => {
  for (const kind of ["pending-only", "missing", "malformed"]) {
    const fx = fixture(), a = fx.source({ pending: kind === "pending-only" });
    if (kind === "pending-only") delete a.message.flags[scope].attackProfile;
    else if (kind === "missing") delete a.message.flags[scope].shotSnapshot;
    else a.message.flags[scope].shotSnapshot = { ...a.shot, correlation: { attackMessageId: "other" } };
    const damage = await fx.damage(a), link = damage.getFlag(scope, "damageLink");
    assert.equal(link.status, "unlinked"); assert.equal(link.reason, "snapshot-incomplete");
    assert.equal(damage.rolls[0].formula, "5d+1 pi"); assert.ok(!link.shotSnapshot);
  }
});

test("deleting the source during async dispatch creates unlinked native damage without guessing", async () => {
  const fx = fixture(), a = fx.source(), gate = defer();
  const execution = fx.runtime.GURPS.performAction(a.action, a.actor, fx.click(a, { dispatchGate: gate }));
  fx.messages.delete(a.message.id); gate.resolve(); await execution; await Promise.all(fx.tasks);
  assert.equal(fx.calls[0].message.getFlag(scope, "damageLink").reason, "source-missing");
});

test("marked deleted source after chat reopening stays unlinked; ordinary links are not intercepted", async () => {
  const fx = fixture(), a = fx.source(), event = fx.click(a);
  event.currentTarget.dataset.otf = JSON.stringify(a.action);
  fx.emit("renderChatMessageHTML", a.message, { querySelectorAll: () => [event.currentTarget] });
  assert.equal(event.currentTarget.dataset.olegurpsShotDamageSource, a.message.id);
  fx.messages.delete(a.message.id);
  await fx.runtime.GURPS.performAction(a.action, a.actor, event); await Promise.all(fx.tasks);
  assert.equal(fx.calls[0].message.getFlag(scope, "damageLink").reason, "source-missing");
  const plain = fx.source({ id: "plain" }); plain.message.flags = {};
  const message = await fx.damage(plain);
  assert.equal(message.getFlag(scope, "damageLink"), undefined);
  const noMessage = fx.click(plain); noMessage.currentTarget.closest = selector => selector === "[data-message-id]" ? null : {};
  assert.equal(captureDamageSource(plain.action, noMessage, fx.runtime), null);
  const wrong = fx.source({ id: "wrong" }); wrong.action.name = "Other gun";
  assert.equal(captureDamageSource(wrong.action, fx.click(wrong), fx.runtime), null);
});

test("public, GM, blind, self and custom whisper settings keep native audience and content", async () => {
  for (const mode of ["public", "gm", "blind", "self"]) {
    const fx = fixture(), a = fx.source();
    const message = await fx.damage(a, { messageMode: mode, shiftKey: true });
    assert.equal(fx.calls[0].options.messageMode, mode);
    assert.deepEqual(message.whisper, mode === "public" ? [] : ["gm"]);
    assert.equal(message.blind, mode === "blind");
    assert.equal(message.content, "native DamageChat");
    assert.equal(message.getFlag(scope, "damageLink").status, "linked");
  }
  const fx = fixture(), a = fx.source();
  const message = await fx.damage(a, { messageMode: "custom-whisper", shiftKey: true });
  assert.deepEqual(message.whisper, ["gm"]); assert.equal(message.blind, true);
});

test("private source uses a permission-checked reference and never copies its snapshot to public flags", async () => {
  for (const blind of [true, false]) {
    const fx = fixture(), a = fx.source({ whisper: ["gm"], blind });
    const damage = await fx.damage(a), link = damage.getFlag(scope, "damageLink");
    assert.equal(link.storage, "reference"); assert.equal(link.attackId, a.shot.attackId);
    assert.equal(link.shotSnapshot, undefined); assert.equal(link.actorId, undefined);
    assert.ok(!JSON.stringify(link).includes("ordinary"));
    assert.equal(fx.installation.resolve(damage).shotSnapshot.ammunition.ammoId, "ordinary");
    a.message.isContentVisible = false;
    assert.equal(fx.installation.resolve(damage).reason, "source-inaccessible");
    fx.messages.delete(a.message.id);
    assert.equal(fx.installation.resolve(damage).reason, "source-missing");
    damage.isContentVisible = false;
    assert.equal(fx.installation.resolve(damage).reason, "damage-inaccessible");
  }
});

test("inaccessible source, Actor permission and cancellation preserve native restrictions", async () => {
  const fx = fixture(), a = fx.source(); a.message.isContentVisible = false;
  const damage = await fx.damage(a);
  assert.equal(damage.getFlag(scope, "damageLink").reason, "source-inaccessible");
  a.message.isContentVisible = true; a.actor.isOwner = false;
  assert.equal(await fx.runtime.GURPS.performAction(a.action, a.actor, fx.click(a)), false);
  a.actor.isOwner = true;
  assert.equal(await fx.runtime.GURPS.performAction(a.action, a.actor, fx.click(a, { cancel: true })), false);
  assert.equal(fx.calls.length, 1);
});

test("unrelated messages with identical formula and Actor cannot acquire an in-flight link", async () => {
  const fx = fixture(), a = fx.source(), gate = defer();
  const execution = fx.runtime.GURPS.performAction(a.action, a.actor, fx.click(a, { templateGate: gate }));
  const unrelated = await fx.runtime.ChatMessage.create({ rolls: [{ formula: "5d+1 pi" }], speaker: { actor: a.actor.id },
    flags: { gurps: { transfer: { type: "damageItem" } }, anotherModule: { preserved: true } } });
  assert.equal(unrelated.getFlag(scope, "damageLink"), undefined);
  assert.deepEqual(unrelated.flags.anotherModule, { preserved: true });
  gate.resolve(); await execution; await Promise.all(fx.tasks);
  assert.equal(fx.calls[1].message.getFlag(scope, "damageLink").attackId, a.shot.attackId);
});

test("native creation failure is not retried; metadata failure never changes the damage result", async () => {
  const fx = fixture(), a = fx.source(); fx.runtime.rejectCreate = true;
  await fx.runtime.GURPS.performAction(a.action, a.actor, fx.click(a));
  await assert.rejects(Promise.all(fx.tasks), /native creation failed/);
  assert.equal(fx.calls.length, 0);
  const other = fixture(), b = other.source(); other.runtime.crypto = { randomUUID() { throw new Error("metadata failure"); } };
  const damage = await other.damage(b);
  assert.equal(damage.rolls[0].formula, "5d+1 pi"); assert.equal(other.calls.length, 1);
  assert.equal(damage.getFlag(scope, "damageLink"), undefined);
});

test("install is idempotent and uninstall preserves other wrappers", () => {
  const fx = fixture(), installed = fx.runtime.GURPS.performAction;
  assert.equal(installDamageShotLink(fx.runtime), fx.installation);
  assert.equal(fx.runtime.GURPS.performAction, installed);
  const other = () => false; fx.runtime.GURPS.performAction = other;
  fx.installation.uninstall(); assert.equal(fx.runtime.GURPS.performAction, other);
});

test("adapter has no lastTargetedRoll correlation, ammo writes, formula edits or HT64 transformations", async () => {
  const code = await readFile(new URL("../scripts/tools/damage-shot-link.js", import.meta.url), "utf8");
  assert.doesNotMatch(code, /lastTargetedRoll|AmmoService|inventoryTransaction|\.system\s*=|\.formula\s*=|HT64|Follow.Up|Affliction/);
});

test("effective native formulas come from independent immutable shots B/A/repeat despite current GGA damage or magazines", async () => {
  const fx = fixture({ effects:true }), a = fx.source({variantId:"ht_ap"}), b = fx.source({id:"B",variantId:"ht_aphc"});
  assert.equal(fx.installation.diagnostic.compatible,true);
  a.actor.system.ranged.Rifle.damage="999d burn";a.actor.inventory.installedId="third";
  const before=JSON.stringify([a.actor.system,a.actor.inventory,a.shot,b.shot]);
  for(const source of [b,a,a]) { const message=await fx.damage(source);
    const expected=source===b?"5d+1(2) pi-":"4d-1(2) pi-";
    assert.equal(message.rolls[0].formula,expected);
    assert.equal(message.flags.gurps.transfer.payload[0].armorDivisor,2);
    assert.equal(message.flags.gurps.transfer.payload[0].damageType,"pi-");
    assert.equal(resolveDamageShotLink(message,fx.runtime).shotSnapshot.damage.formula,expected);
  }
  assert.equal(JSON.stringify([a.actor.system,a.actor.inventory,a.shot,b.shot]),before);
});
test("private HP snapshot keeps native audience and exact formula without copying private data to damage flags", async()=>{
  const fx=fixture({effects:true}),a=fx.source({variantId:"ht_hollow_point",whisper:["gm"],blind:true});
  const damage=await fx.damage(a,{messageMode:"blind"});
  assert.equal(damage.rolls[0].formula,"5d+1(0.5) pi+");assert.equal(damage.blind,true);assert.deepEqual(damage.whisper,["gm"]);
  assert.equal(damage.getFlag(scope,"damageLink").shotSnapshot,undefined);
  assert.equal(resolveDamageShotLink(damage,fx.runtime).shotSnapshot.damage.formula,"5d+1(0.5) pi+");
  a.message.isContentVisible=false;assert.equal(resolveDamageShotLink(damage,fx.runtime).status,"unlinked");
});
test("two Actors and modes keep different transformed native damage through overlapping dispatch",async()=>{
  const fx=fixture({effects:true}),a=fx.source({variantId:"ht_ap"}),b=fx.source({id:"B",actorId:"actor-b",mode:"Auto",variantId:"ht_hollow_point"});
  const gate=defer();const pending=fx.damage(a,{dispatchGate:gate},b.actor);await fx.damage(b,{},a.actor);gate.resolve();await pending;
  assert.deepEqual(fx.calls.map(c=>[c.message.speaker.actor,c.message.rolls[0].formula]),[["actor-b","5d+1(0.5) pi+"],["actor-a","4d-1(2) pi-"]]);
});
test("adapter incompatibility and post-install contract changes preserve native damage without current-ammo lookup",async()=>{
  for(const effects of [false,true]) {const fx=fixture({effects}),a=fx.source({variantId:"ht_ap"});
    if(effects)fx.runtime.GURPS.actionFuncs.damage=function changed(context){};
    const damage=await fx.damage(a);assert.equal(damage.rolls[0].formula,"5d+1 pi");assert.equal(fx.calls.length,1);
    assert.equal(a.actor.inventory.rounds,11);
  }
});

function confirmedLabelSource(fx, name, options = {}) {
  const source = fx.source(options), shot = structuredClone(source.shot);
  shot.ammunition = { ...shot.ammunition, status: "confirmed", source: "catalog", name };
  shot.profile.ammunition = structuredClone(shot.ammunition);
  source.message.flags[scope].shotSnapshot = shot;
  source.shot = shot;
  return source;
}
function renderDamageLabel(fx, source, { hook = "renderChatMessageHTML", action = source.action } = {}) {
  const event = fx.click(source), element = event.currentTarget;
  element.dataset.otf = JSON.stringify(action);
  element.dataset.action = Buffer.from(JSON.stringify(action)).toString("base64");
  element.textContent = "D:AK-47 (" + source.shot.mode.mode + ")";
  element.className = "gga-app gurpslink";
  fx.emit(hook, source.message, { querySelectorAll: () => [element] });
  return { event, element };
}
for (const [suffix, variantId] of [["", null], [" AP", "ht_ap"], [" APHC", "ht_aphc"], [" HP", "ht_hollow_point"]]) {
  test("native Damage label uses completed shot " + (suffix.trim() || "ordinary") + " without changing action or mechanics", async () => {
    const fx = fixture({ effects: true }), source = confirmedLabelSource(fx, "7.62\u00d739mm" + suffix, { variantId });
    const saved = JSON.stringify(source.message.flags), system = JSON.stringify(source.actor.system);
    const { event, element } = renderDamageLabel(fx, source);
    assert.equal(element.textContent, "D:7.62\u00d739mm" + suffix);
    assert.equal(element.dataset.otf, JSON.stringify(source.action));
    assert.equal(element.dataset.action, Buffer.from(JSON.stringify(source.action)).toString("base64"));
    assert.equal(element.className, "gga-app gurpslink");
    assert.equal(JSON.stringify(source.message.flags), saved);
    await fx.runtime.GURPS.performAction(source.action, source.actor, event); await Promise.all(fx.tasks);
    assert.equal(fx.calls.length, 1);
    assert.equal(fx.calls[0].message.rolls[0].formula, source.shot.profile.damage.formula);
    assert.equal(source.actor.inventory.rounds, 11);
    assert.equal(JSON.stringify(source.actor.system), system);
  });
}
test("Damage labels survive magazine changes, chat reopening and serialized reload independently", () => {
  const fx = fixture(), a = confirmedLabelSource(fx, "7.62x39mm AP", { id: "A" }),
    b = confirmedLabelSource(fx, "7.62x39mm HP", { id: "B" });
  const old = renderDamageLabel(fx, a).element;
  a.actor.inventory.installedId = "mag-B"; a.actor.system.ranged.Rifle.name = "Changed weapon";
  assert.equal(old.textContent, "D:7.62x39mm AP");
  assert.equal(renderDamageLabel(fx, b).element.textContent, "D:7.62x39mm HP");
  assert.equal(renderDamageLabel(fx, a, { hook: "renderChatMessage" }).element.textContent, "D:7.62x39mm AP");
  const persisted = JSON.parse(JSON.stringify(a.message));
  const element = renderDamageLabel(fx, a).element;
  element.textContent = "D:AK-47 (Rifle)";
  fx.messages.set(persisted.id, persisted);
  fx.runtime.document = { querySelectorAll: () => [{ dataset: { messageId: persisted.id },
    querySelectorAll: () => [element] }] };
  fx.installation.uninstall(); installDamageShotLink(fx.runtime);
  assert.equal(element.textContent, "D:7.62x39mm AP");
});
test("legacy, unresolved, unnamed, pending or miscorrelated snapshots keep the native weapon label", () => {
  for (const change of [shot => { shot.ammunition.status = "legacy"; },
    shot => { shot.ammunition.status = "unresolved"; }, shot => { shot.ammunition.source = "test"; },
    shot => { shot.ammunition.name = " "; }, shot => { shot.ammunition.name = null; },
    shot => { shot.correlation.attackMessageId = "other"; }, shot => { shot.spent = -1; }]) {
    const fx = fixture(), source = confirmedLabelSource(fx, "7.62x39mm AP");
    change(source.shot);
    assert.equal(renderDamageLabel(fx, source).element.textContent, "D:AK-47 (Rifle)");
  }
  const fx = fixture(), pending = fx.source({ pending: true });
  assert.equal(renderDamageLabel(fx, pending).element.textContent, "D:AK-47 (Rifle)");
});
test("blind and whisper label visibility follows current source permissions", () => {
  for (const options of [{ blind: true, whisper: ["gm"] }, { whisper: ["recipient"] }]) {
    const fx = fixture(), source = confirmedLabelSource(fx, "7.62x39mm HP", options);
    assert.equal(renderDamageLabel(fx, source).element.textContent, "D:7.62x39mm HP");
    source.message.isContentVisible = false;
    assert.equal(renderDamageLabel(fx, source).element.textContent, "D:AK-47 (Rifle)");
    source.message.isContentVisible = true; source.message.visible = false;
    assert.equal(renderDamageLabel(fx, source).element.textContent, "D:AK-47 (Rifle)");
    assert.equal(fx.calls.length, 0);
  }
});
test("Damage label is plain text and foreign actions retain their native labels", () => {
  const fx = fixture(), source = confirmedLabelSource(fx, "<img onerror=attack()> AP");
  assert.equal(renderDamageLabel(fx, source).element.textContent, "D:<img onerror=attack()> AP");
  for (const action of [{ ...source.action, sourceId: "foreign" }, { ...source.action, name: "Other weapon" },
    { ...source.action, type: "damage" }])
    assert.equal(renderDamageLabel(fx, source, { action }).element.textContent, "D:AK-47 (Rifle)");
});

function explosiveSource(fx, variantId, id="A") {
  const source = confirmedLabelSource(fx, "7.62x39mm " + variantId, {variantId,id});
  const shot=source.shot;
  shot.ammunition.recipe={version:1,variantId,customId:"custom-"+id};
  const parameters={projectileMassG:8,explosiveMassG:0.3,ref:1.4,fragmentMassG:6,referenceMassG:146,
    referenceDice:2,referenceSource:"GM test calibration estimate",q:1,source:{kind:"gm",note:"Conditional fixture"}};
  const damage=resolveAmmunitionEffects({raw:shot.profile.raw,variantId,baseStatus:"compatible",constructionStatus:"gm-approved",facts:{caliberMm:7.62},explosiveParameters:parameters});
  shot.profile.damage=damage;shot.profile.effective.damage=damage.formula;
  return source;
}
for(const variantId of ["ht_apex","ht_aphex"])test(variantId+" has three independent native Damage paths with source identity and no auto effects",async()=>{
  const fx=fixture({effects:true}),source=explosiveSource(fx,variantId);
  const buttons=shotDamageComponents(source.message,fx.runtime);
  assert.deepEqual(buttons.map(c=>[c.role,c.formula]),[["follow-up","1d-2 cr ex"],["fragmentation","1d-2 cut"]]);
  const inventory=JSON.stringify(source.actor.inventory),system=JSON.stringify(source.actor.system);
  const saved=JSON.stringify(source.message.flags);
  for(const component of [...buttons].reverse()){
    const event=fx.click(source);event.currentTarget.dataset.olegurpsShotDamageSource=source.message.id;
    event.currentTarget.dataset.olegurpsShotComponent=component.role;
    await fx.runtime.GURPS.performAction(fx.runtime.GURPS.parselink(component.formula).action,source.actor,event);await Promise.all(fx.tasks);
    const damage=fx.calls.at(-1).message;
    assert.equal(damage.flags.gurps.transfer.payload[0].damageType,component.role==="follow-up"?"cr":"cut");
    assert.equal(damage.flags.gurps.transfer.payload[0].armorDivisor,1);
    assert.equal(damage.getFlag(scope,"damageLink").damageComponent,component.role);
    assert.equal(resolveDamageShotLink(damage,fx.runtime).shotSnapshot.ammunition.recipe.customId,"custom-A");
  }
  await fx.damage(source);
  assert.equal(fx.calls.length,3);
  assert.equal(fx.calls.at(-1).message.rolls[0].formula,variantId==="ht_apex"?"4d-1(2) pi-":"5d+1(2) pi-");
  assert.equal(JSON.stringify(source.actor.inventory),inventory);assert.equal(JSON.stringify(source.actor.system),system);
  assert.equal(JSON.stringify(source.message.flags),saved);
});
test("secondary B/A/repeat stay immutable after magazine changes and use source permissions",async()=>{
  const fx=fixture({effects:true}),a=explosiveSource(fx,"ht_apex","A"),b=explosiveSource(fx,"ht_aphex","B");
  a.actor.inventory.installedId="new";a.actor.system.ranged.Rifle.damage="10d pi++";
  for(const source of [b,a,a]){
    const event=fx.click(source);event.currentTarget.dataset.olegurpsShotComponent="fragmentation";
    const action=fx.runtime.GURPS.parselink("99d cut").action;
    await fx.runtime.GURPS.performAction(action,source.actor,event);await Promise.all(fx.tasks);
    assert.equal(fx.calls.at(-1).message.rolls[0].formula,"1d-2 cut");
    assert.equal(fx.calls.at(-1).message.getFlag(scope,"damageLink").attackId,source.shot.attackId);
  }
  a.message.isContentVisible=false;
  const event=fx.click(a);event.currentTarget.dataset.olegurpsShotComponent="follow-up";
  assert.equal(await fx.runtime.GURPS.performAction(fx.runtime.GURPS.parselink("1d-2 cr ex").action,a.actor,event),false);
  assert.equal(shotDamageComponents(a.message,fx.runtime).length,0);
  assert.equal(fx.calls.length,3);
});
test("incomplete explosive snapshots block every component instead of silently rolling baseline",async()=>{
  const fx=fixture({effects:true}),source=explosiveSource(fx,"ht_apex");source.shot.profile.damage.nativeSafe=false;
  source.shot.profile.damage.status="unresolved";source.shot.profile.damage.reason="explosive-mass-and-ref-required";
  assert.ok(shotDamageComponents(source.message,fx.runtime).every(c=>c.formula===null));
  assert.equal(await fx.runtime.GURPS.performAction(source.action,source.actor,fx.click(source)),false);
  assert.equal(fx.calls.length,0);
});

test("private explosive components keep source-only metadata and reject unauthorized access", async () => {
  for (const role of ["follow-up", "fragmentation"]) {
    const fx = fixture({ effects: true }), source = explosiveSource(fx, "ht_aphex");
    source.message.whisper = ["gm"]; source.message.blind = true;
    const event = fx.click(source, { messageMode: "blind" });
    event.currentTarget.dataset.olegurpsShotComponent = role;
    const formula = role === "follow-up" ? "1d-2 cr ex" : "1d-2 cut";
    await fx.runtime.GURPS.performAction(fx.runtime.GURPS.parselink(formula).action, source.actor, event);
    await Promise.all(fx.tasks);
    const damage = fx.calls.at(-1).message, link = damage.getFlag(scope, "damageLink");
    assert.equal(damage.blind, true); assert.deepEqual(damage.whisper, ["gm"]);
    assert.equal(link.damageComponent, role); assert.equal(link.shotSnapshot, undefined);
    assert.equal(resolveDamageShotLink(damage, fx.runtime).status, "linked");
    source.message.isContentVisible = false;
    assert.equal(resolveDamageShotLink(damage, fx.runtime).status, "unlinked");
    assert.equal(shotDamageComponents(source.message, fx.runtime).length, 0);
  }
});

function standaloneSource(fx) {
  const source = fx.source();
  const profile = structuredClone(source.shot.profile);
  profile.mode.standaloneRef = { weaponId: 'module-owned', modeId: 'catalog-mode', combatType: 'ranged' };
  source.shot = createShotSnapshot(profile, { attackId: 'standalone-attack', spent: 0, messageId: source.message.id });
  source.message.flags[scope] = { attackProfile: profile, shotSnapshot: source.shot };
  source.actor.system.ranged = {};
  return source;
}
test('standalone D uses completed shot after source weapon removal and never needs an Actor attack', async () => {
  const fx = fixture({ effects: true }), source = standaloneSource(fx);
  const before = structuredClone(source.actor.system);
  const damage = await fx.damage(source);
  assert.equal(damage.rolls[0].formula, '5d+1 pi');
  assert.equal(damage.getFlag(scope, 'damageLink').attackId, 'standalone-attack');
  assert.deepEqual(source.actor.system, before);
});
test('standalone D fails closed for inaccessible, incomplete or unsafe shots instead of calling missing GGA attacks', async () => {
  for (const kind of ['private', 'pending', 'unsafe']) {
    const fx = fixture({ effects: true }), source = standaloneSource(fx);
    if (kind === 'private') source.message.isContentVisible = false;
    if (kind === 'pending') {
      const shot = structuredClone(source.shot); shot.correlation.attackMessageId = 'other';
      source.message.flags[scope].shotSnapshot = shot;
    }
    if (kind === 'unsafe') {
      const shot = structuredClone(source.shot); shot.profile.damage.nativeSafe = false;
      source.message.flags[scope].shotSnapshot = shot;
    }
    const result = await fx.runtime.GURPS.performAction(source.action, source.actor, fx.click(source));
    assert.equal(result, false); assert.equal(fx.calls.length, 0);
    assert.deepEqual(source.actor.system.ranged, {});
  }
});
