// Shared, UI-independent resolution of attack channels and technique/option rules.
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const appliesTo = (rule, combatType) => !rule.combatType || rule.combatType === "both" || rule.combatType === combatType;

export function resolveRelativeTechniqueLevel({ techniqueLevel, governingSkillLevel,
  relativeLevel, baseAttackLevel } = {}) {
  const explicitRelative = relativeLevel !== null && relativeLevel !== undefined && relativeLevel !== ""
    ? Number(relativeLevel) : Number.NaN;
  const learned = techniqueLevel !== null && techniqueLevel !== undefined && techniqueLevel !== ""
    ? Number(techniqueLevel) : Number.NaN;
  const governing = governingSkillLevel !== null && governingSkillLevel !== undefined && governingSkillLevel !== ""
    ? Number(governingSkillLevel) : Number.NaN;
  const relative = Number.isFinite(explicitRelative) ? explicitRelative : learned - governing;
  const base = baseAttackLevel === null || baseAttackLevel === undefined || baseAttackLevel === ""
    ? Number.NaN : Number(baseAttackLevel);
  if (!Number.isFinite(relative) || !Number.isFinite(base)) return null;
  return { relativeLevel: relative, attackTechniqueLevel: base + relative };
}

export function resolveCombatCalculation({ combatType, actor = null, attack = null,
  baseAttackLevel, governingSkill = null, channels = [], rules = [], context = {},
  caps = [], attackSlot = null } = {}) {
  const baseSkill = baseAttackLevel === null || baseAttackLevel === undefined || baseAttackLevel === ""
    ? Number.NaN : Number(baseAttackLevel);
  if (!Number.isFinite(baseSkill)) return null;
  if (!new Set(["ranged", "melee"]).has(combatType)) throw new Error("Unknown combat type");
  const channelMap = new Map();
  for (const entry of channels) {
    if (!entry?.id || channelMap.has(entry.id)) throw new Error("Duplicate or missing combat channel");
    channelMap.set(entry.id, {
      id: entry.id, label: entry.label ?? entry.id, kind: entry.kind ?? "contextual",
      baseValue: number(entry.value), resolvedValue: number(entry.value),
      source: entry.source ?? "base", resolver: null, explanation: entry.explanation ?? "",
      roll: entry.roll !== false, priority: Number.NEGATIVE_INFINITY, appliedRules: []
    });
  }
  const combatContext = { ...context, combatType, actor, attack, baseAttackLevel: baseSkill,
    governingSkill, attackSlot };
  const applicable = rules.filter(rule => appliesTo(rule, combatType) &&
    (typeof rule.when !== "function" || rule.when(combatContext)));
  const ordered = [...applicable].sort((a, b) => number(b.priority) - number(a.priority) ||
    String(a.id).localeCompare(String(b.id)));
  const selected = [];
  const rejectedRules = [];
  for (const rule of ordered) {
    if (!rule.id || !rule.channel || typeof rule.resolve !== "function")
      throw new Error("Invalid combat rule descriptor");
    const conflicting = selected.find(other =>
      rule.incompatibilities?.includes(other.id) || other.incompatibilities?.includes(rule.id));
    if (conflicting) {
      rejectedRules.push({ id: rule.id, reason: "incompatible", with: conflicting.id });
      continue;
    }
    selected.push(rule);
  }
  const metadata = {};
  const appliedRules = [];
  for (const rule of selected) {
    const channel = channelMap.get(rule.channel);
    if (!channel) throw new Error("Combat rule has no channel: " + rule.id);
    const outcome = rule.resolve({ context: combatContext, channel: { ...channel },
      relative: rule.relativeLevel ? resolveRelativeTechniqueLevel({
        ...rule.relativeLevel(combatContext), baseAttackLevel: baseSkill }) : null });
    if (!outcome || !Number.isFinite(Number(outcome.value))) continue;
    const operation = outcome.operation ?? rule.operation ?? "replace";
    const priority = number(rule.priority);
    if (operation === "replace") {
      if (channel.resolver && channel.priority === priority) {
        throw new Error("Conflicting combat rules for " + channel.id);
      }
      if (channel.resolver && channel.priority > priority) {
        rejectedRules.push({ id: rule.id, reason: "channel-priority", with: channel.resolver });
        continue;
      }
      channel.resolvedValue = Number(outcome.value);
      channel.priority = priority;
    } else if (operation === "add") {
      channel.resolvedValue += Number(outcome.value);
    } else if (operation === "min") {
      channel.resolvedValue = Math.min(channel.resolvedValue, Number(outcome.value));
    } else if (operation === "max") {
      channel.resolvedValue = Math.max(channel.resolvedValue, Number(outcome.value));
    } else if (operation === "disable") {
      channel.resolvedValue = 0;
    } else throw new Error("Unknown channel operation: " + operation);
    channel.resolver = rule.id;
    channel.source = outcome.source ?? rule.id;
    channel.kind = rule.kind ?? channel.kind;
    channel.label = outcome.label ?? channel.label;
    channel.explanation = outcome.explanation ?? channel.explanation;
    channel.appliedRules.push(rule.id);
    appliedRules.push(rule);
    if (outcome.metadata) Object.assign(metadata, outcome.metadata);
  }
  const resolvedChannels = [...channelMap.values()].map(({ priority, ...channel }) => channel);
  const uncappedSkill = baseSkill + resolvedChannels.reduce((total, channel) => total + channel.resolvedValue, 0);
  const activeCaps = caps.filter(cap => !cap.when || cap.when(combatContext));
  const capValue = Math.min(Infinity, ...activeCaps.map(cap => Number(cap.maximum)).filter(Number.isFinite));
  const floorValue = Math.max(-Infinity, ...activeCaps.map(cap => Number(cap.minimum)).filter(Number.isFinite));
  const effectiveSkill = Math.max(floorValue, Math.min(capValue, uncappedSkill));
  const capAdjustment = effectiveSkill - uncappedSkill;
  const modifiers = resolvedChannels.map(channel => ({
    channel: channel.id, label: channel.label, value: channel.resolvedValue,
    baseValue: channel.baseValue, resolvedValue: channel.resolvedValue,
    source: channel.source, resolver: channel.resolver, explanation: channel.explanation
  }));
  if (capAdjustment) modifiers.push({ channel: "cap", label: activeCaps.find(cap =>
    Number(cap.maximum) === capValue || Number(cap.minimum) === floorValue)?.label ?? "Skill cap",
    value: capAdjustment, baseValue: 0, resolvedValue: capAdjustment, source: "cap" });
  return {
    combatType, baseSkill, baseSkillName: combatType === "ranged" ? "Ranged Weapon Level" : "Melee Attack Level",
    governingSkill, attackSlot, channels: resolvedChannels, modifiers,
    activeRules: appliedRules.map(rule => ({ id: rule.id, kind: rule.kind, activation: rule.activation })),
    rejectedRules, metadata, uncappedSkill, effectiveSkill, capAdjustment,
    rollModifiers: resolvedChannels.filter(channel => channel.roll && channel.resolvedValue !== 0)
      .map(channel => ({ channel: channel.id, value: channel.resolvedValue,
        label: channel.label, source: channel.source }))
  };
}
