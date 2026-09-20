const MODULE_ID = "olegurps-qol";
const MACRO_PACK = `${MODULE_ID}.macros`;

const MODULE_MACROS = [
  {
    _id: "OQLuckMacro00001",
    name: "Luck",
    type: "script",
    img: `modules/${MODULE_ID}/assets/luck.png`,
    command: "game.olegurpsQOL.luck.open();",
    scope: "global",
    ownership: { default: 3 },
    flags: { [MODULE_ID]: { tool: "luck" } }
  },
  {
    _id: "OQDamageMacro001",
    name: "Damage",
    type: "script",
    img: `modules/${MODULE_ID}/assets/damage.png`,
    command: "game.olegurpsQOL.damage.open();",
    scope: "global",
    ownership: { default: 3 },
    flags: { [MODULE_ID]: { tool: "damage" } }
  },
  {
    _id: "OQMeleeAssist001",
    name: "Melee Assistant",
    type: "script",
    img: `modules/${MODULE_ID}/assets/melee-assistant.png`,
    command: "game.olegurpsQOL.melee.open();",
    scope: "global",
    ownership: { default: 3 },
    flags: { [MODULE_ID]: { tool: "melee-assistant" } }
  }
];

function needsUpdate(document, source) {
  return document.name !== source.name ||
    document.type !== source.type ||
    document.img !== source.img ||
    document.command !== source.command ||
    document.scope !== source.scope ||
    document.getFlag(MODULE_ID, "tool") !== source.flags[MODULE_ID].tool;
}

export async function ensureModuleMacros() {
  if (!game.user?.isGM) return;
  if (game.users?.activeGM && game.users.activeGM !== game.user) return;

  const pack = game.packs.get(MACRO_PACK);
  if (!pack) {
    console.warn(`OleGURPS QOL: macro compendium ${MACRO_PACK} not found.`);
    return;
  }

  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });

  try {
    const index = await pack.getIndex({ fields: ["name", "flags"] });
    for (const source of MODULE_MACROS) {
      const tool = source.flags[MODULE_ID].tool;
      const indexed = index.get(source._id) ?? index.find(entry =>
        entry.name === source.name ||
        (tool === "luck" && entry.name === "\u0423\u0434\u0430\u0447\u0430") ||
        (tool === "damage" && entry.name === "\u0423\u0440\u043e\u043d") ||
        entry.flags?.[MODULE_ID]?.tool === tool
      );
      const document = indexed ? await pack.getDocument(indexed._id) : null;
      if (!document) {
        await Macro.createDocuments([source], { pack: pack.collection, keepId: true });
      } else if (needsUpdate(document, source)) {
        await document.update({
          name: source.name,
          type: source.type,
          img: source.img,
          command: source.command,
          scope: source.scope,
          [`flags.${MODULE_ID}.tool`]: tool
        });
      }
    }
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
}
