import {installExoticBeamDamage} from './tools/exotic-beam-damage.js';
import { openUnifiedLauncher, registerLauncherSettings } from './unified-launcher.js';
import { launcherActions, runLauncherAction } from './launcher-actions.js';
import { launcherButton } from './launcher-button.js';
import { developerApi, registerDeveloperModeMenu } from "./tools/developer-mode-app.js";
import { registerWeaponSkillSettings } from "./tools/weapon-skill-settings-app.js";
import {registerLTPersonalSettings} from './lt-personal-source.js';
import { loadWeaponSkillTLTranslations } from "./tools/weapon-skill-tl-policy.js";
import { registerAmmunitionApprovals } from "./tools/ammunition-approval-service.js";
import { loadExplosiveTranslations } from "./tools/explosive-ammunition-localization.js";
import { AutomaticAmmunitionProfileService } from "./tools/automatic-ammunition-profiles.js";
import { registerAutomaticAmmoPolicy, loadAutomaticAmmoTranslations } from "./tools/automatic-ammunition-localization.js";
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
import { registerRollConfirmationProbability } from "./tools/roll-confirmation-probability.js";
import { registerCustomStatusEffects } from "./tools/defense-status-effects.js";
import { registerStatusEffectVisibilitySetting } from "./tools/status-effect-visibility.js";
import { registerReelingTiredSetting, installReelingTiredCompatibility } from "./tools/reeling-tired-compat.js";
import { installEquipmentContainerCompatibility } from "./tools/equipment-container-compat.js";
import { installEncumbranceCompatibility } from "./tools/encumbrance-compat.js";

import { CatalogService } from "./catalog-service.js";
import { WeaponCatalogBindingService } from "./weapon-catalog-binding-service.js";
import { AmmunitionCompatibilityService } from "./ammunition-compatibility-service.js";
import { AttackProfileResolver } from "./tools/attack-profile-resolver.js";
import { loadAttackProfileTranslations } from "./tools/attack-profile-runtime.js";
import { installDamageShotLink, resolveDamageShotLink } from "./tools/damage-shot-link.js";
import { installDoubleKnockback } from './tools/double-knockback.js';
import { installResistanceRoll, rollResistance, messageResistanceEffect } from './tools/resistance-roll.js';
import { diagnoseGgaDamageAdapters, warnGgaDamageCompatibility, loadAmmoEffectTranslations } from "./tools/gga-damage-compatibility.js";

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

const catalogs = new CatalogService();
const weaponCatalogBindings = new WeaponCatalogBindingService(catalogs);
const ammunitionCompatibility = new AmmunitionCompatibilityService(catalogs);
const automaticAmmunitionProfiles = new AutomaticAmmunitionProfileService({ catalogs, compatibility: ammunitionCompatibility });

const api = {
  launcher: { open: openUnifiedLauncher, actions: launcherActions, run: runLauncherAction },
  catalogs,
  ammunitionCompatibility,
  automaticAmmunitionProfiles,
  attackProfiles: new AttackProfileResolver({ catalogs, compatibility: ammunitionCompatibility }),
  damageShots: { resolve: resolveDamageShotLink, diagnose: diagnoseGgaDamageAdapters },
  resistance:{roll:rollResistance,readEffect:messageResistanceEffect},
  weaponCatalogBindings,
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

Object.defineProperty(api, "developer", { enumerable: true, get: () => globalThis.game?.user?.isGM ? developerApi : undefined });

Hooks.once("init", () => {
  registerLauncherSettings(() => launcherButton.refresh());
  registerAmmunitionApprovals();
  registerAutomaticAmmoPolicy();
  ensureModuleStylesheet();
  registerSuppressionFireHooks();
  registerSuppressionFireRuntimeHooks();
  registerRollConfirmationProbability();
  registerStatusEffectVisibilitySetting();
  registerReelingTiredSetting();
  registerDeveloperModeMenu();
  registerWeaponSkillSettings();
  registerLTPersonalSettings();
  globalThis.OleGURPSQOL = api;
  void catalogs.load().catch(error =>
    console.error("OleGURPS QOL: catalog initialization failed.", error));
});

Hooks.once("ready", async () => {
  await loadWeaponSkillTLTranslations().catch(error => console.error("OleGURPS QOL | Weapon skill translations:", error));
  await loadAmmoEffectTranslations().catch(error => console.error("OleGURPS QOL | Ammo effects translations:", error));
  await loadExplosiveTranslations().catch(error => console.error("OleGURPS QOL | Explosive translations:", error));
  await loadAutomaticAmmoTranslations().catch(error => console.error("OleGURPS QOL | Automatic ammo translations:", error));
  warnGgaDamageCompatibility(diagnoseGgaDamageAdapters());
  try { installExoticBeamDamage(); installDamageShotLink(); }
  catch (error) { console.error("OleGURPS QOL | Native damage linkage unavailable:", error); }
  try { installResistanceRoll(); }
  catch(error){console.error('OleGURPS QOL | Resistance hooks:',error);}
  try { installDoubleKnockback(); }
  catch (error) { console.error('OleGURPS QOL | dkb:', error); }
  await loadAttackProfileTranslations().catch(error => console.error("OleGURPS QOL | Attack profile translations:", error));
  try {
    await registerCustomStatusEffects();
    globalThis.setTimeout(() => {
      registerCustomStatusEffects().catch(error =>
        console.error("OleGURPS QOL: failed to finalize custom status effects.", error));
    }, 0);
  } catch (error) {
    console.error("OleGURPS QOL: failed to register custom status effects.", error);
  }
  try {
    installReelingTiredCompatibility();
  } catch (error) {
    console.error("OleGURPS QOL: failed to install Reeling/Tired compatibility.", error);
  }
  try {
    await installEquipmentContainerCompatibility();
  } catch (error) {
    console.error("OleGURPS QOL: equipment container compatibility failed.", error);
  }
  try {
    installEncumbranceCompatibility();
  } catch (error) {
    console.error("OleGURPS QOL: encumbrance compatibility failed.", error);
  }
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
  game.olegurpsQOL = api;
  launcherButton.start();
  try {
    await ensureModuleMacros();
  } catch (error) {
    console.error("OleGURPS QOL: не удалось обновить compendium макросов.", error);
  }
});
