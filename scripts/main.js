import { openFireControl } from "./tools/fire-control.js";
import { openAmmoManager } from "./tools/ammo.js";
import { openFrightCheck } from "./tools/fright.js";
import { openReactionRoll } from "./tools/reaction.js";
import { openCriticalTables } from "./tools/critical.js";
import { openFallingDamage } from "./tools/falling.js";
import { openExplosionFragmentation } from "./tools/explosion-fragmentation.js";
import { openLuck } from "./tools/luck.js";
import { openDamageRoll } from "./tools/damage.js";
import { openMeleeAssistant } from "./tools/melee-assistant.js";
import { ensureModuleMacros } from "./module-macros.js";
import { registerSuppressionFireHooks } from "./tools/suppression-fire-session-service.js";
import { registerSuppressionFireRuntimeHooks } from "./tools/suppression-fire-runtime-service.js";

const MODULE_ID = "olegurps-qol";
const STYLESHEET_PATH = `modules/${MODULE_ID}/styles/olegurps-qol.css`;

function ensureModuleStylesheet() {
  const isLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => link.href.includes(`/${STYLESHEET_PATH}`));
  if (isLoaded) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = STYLESHEET_PATH;
  link.dataset.olegurpsQol = "styles";
  document.head.append(link);
}

const api = {
  ammo: { open: openAmmoManager },
  fireControl: { open: openFireControl },
  fright: { open: openFrightCheck },
  reaction: { open: openReactionRoll },
  critical: { open: openCriticalTables },
  falling: { open: openFallingDamage },
  explosion: { open: openExplosionFragmentation },
  luck: { open: openLuck },
  damage: { open: openDamageRoll },
  melee: { open: openMeleeAssistant }
};

Hooks.once("init", () => {
  ensureModuleStylesheet();
  registerSuppressionFireHooks();
  registerSuppressionFireRuntimeHooks();
  globalThis.OleGURPSQOL = api;
});

Hooks.once("ready", async () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
  game.olegurpsQOL = api;
  try {
    await ensureModuleMacros();
  } catch (error) {
    console.error("OleGURPS QOL: не удалось обновить compendium макросов.", error);
  }
});
