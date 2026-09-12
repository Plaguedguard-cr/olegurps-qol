import { openFireControl } from "./tools/fire-control.js";
import { openAmmoManager } from "./tools/ammo.js";
import { openFrightCheck } from "./tools/fright.js";
import { openReactionRoll } from "./tools/reaction.js";
import { openCriticalTables } from "./tools/critical.js";
import { openFallingDamage } from "./tools/falling.js";
import { openExplosionFragmentation } from "./tools/explosion-fragmentation.js";

const MODULE_ID = "olegurps-qol";

const api = {
  ammo: { open: openAmmoManager },
  fireControl: { open: openFireControl },
  fright: { open: openFrightCheck },
  reaction: { open: openReactionRoll },
  critical: { open: openCriticalTables },
  falling: { open: openFallingDamage },
  explosion: { open: openExplosionFragmentation }
};

Hooks.once("init", () => {
  globalThis.OleGURPSQOL = api;
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
  game.olegurpsQOL = api;
});
