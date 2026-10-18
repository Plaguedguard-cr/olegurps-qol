import { lpProfile, readLPFuel, lpText } from './ut-liquid-propellant.js';
import { weaponResourceProfile, weaponResourceHTML } from './weapon-resources.js';
import { resourceOnlyWeapon as beamWeapon, weaponResourceLabel as beamResourceLabel } from './weapon-resources.js';
import { confirmLPFuelReplacement } from './lp-fuel-replacement-dialog.js';
import { weaponResourceReason as weaponPowerReason } from './weapon-resources.js';
import { uawGroup, activeUAWCarrier, uawManagerWeapons, renderUAWMagazineGroups, uawWeaponView } from './ut-uaw.js';
import { PAINT_BATTERY_CSS } from './ut-paint-power.js';
import { weaponPowerProfile, readWeaponBattery, weaponBatteryHTML } from './weapon-power.js';
import { confirmBatteryReplacement } from './battery-replacement-dialog.js';
import { batteryText } from './weapon-power.js';
import { createFireControlContext, getTokenFireRangeContext } from "./fire-control-context.js";
import {platformMotionError} from '../ht-specialized-platforms.js';
import { WeaponAssistantApp, changedAmmunitionCards } from "./weapon-assistant-app.js";
import { installViewportBounds } from './application-viewport.js';
import { FirePreparationApp } from "./fire-preparation-app.js";
import { measureCanvasPointDistanceYards, measureTokenDistanceYards } from "./fire-control-context.js";
import { checkHearingMinusTwo, normalizeVisibility, visibilityRules } from "./limited-visibility.js";
import { SuppressionFireApp } from "./suppression-fire-app.js";
import { SpecialFireMenuApp } from "./special-fire-menu-app.js";
import { TrademarkMoveEditorApp } from "./trademark-move-editor-app.js";
import { TrademarkMoveExecutionApp } from "./trademark-move-execution-app.js";
import { RangedAttackExecutionApp } from "./ranged-attack-execution-app.js";
import { hasWeaponBondPerk, isWeaponBondActive } from "./weapon-bond-service.js";
import { TRADEMARK_MOVE_FLAG, hasTrademarkMovePerk, normalizeTrademarkMove, normalizeTrademarkMoveStep, applyTrademarkMoveBonus, getTrademarkMoveSkillPreview } from "./trademark-move-model.js";
import { getRangedRapidStrikeSpecialties, resolveRangedRapidStrike, validateRangedRapidStrikeSplit } from "./ranged-rapid-strike-service.js";
import { SprayingFireApp } from "./spraying-fire-app.js";
import { selectSprayingTargets } from "./spraying-fire-selection.js";
import { sprayingCapacity, planSprayingFire } from "./spraying-fire-service.js";
import { SprayingFireSessionService, getSpecialFireOwner } from "./spraying-fire-session-service.js";
import { getSafeTargetName, withClearedFoundryTargets, withFoundryTargets, clearFoundryTargets } from "./foundry-targets.js";
import { getSuppressionFireCapacity } from "./suppression-fire-service.js";
import { SuppressionFireSessionService } from "./suppression-fire-session-service.js";
import { FireService } from "./fire-service.js";
import { AmmoService } from "./ammo-service.js";
import { parseCampaignTL } from './ammunition-tech-level.js';
import { inventoryAmmoName, renderAmmunitionSummary } from "./ammo-caption.js";
import { attackProfilePresentation } from './weapon-profile-presentation.js';
import { parseWeaponBulk } from "./weapon-bulk.js";
import { resolveRuntimeAttackProfile, newAttackId, attackProfileError, withRuntimeAmmoStats } from "./attack-profile-runtime.js";
import { automaticAmmoText } from "./automatic-ammunition-localization.js";
import { moduleText } from '../localization.js';
import { TargetingService } from "./targeting-service.js";
import { buildRandomHitLocationsHtml } from "./hit-location-result.js";
import { createRangedTargetedAttackContext as createTargetedAttackContext } from "./ranged-governing-skill-service.js";
import { listRangedGoverningSkills, resolveRangedGoverningSkill,
  bindingForGoverningSkill, getRangedGoverningAttackKey } from "./ranged-governing-skill-service.js";
import {
  isBeamWeapon,
  parseElevationHeight,
  resolveEffectiveRange
} from "./fire-range-service.js";
import { openWeaponAttackEditor } from "./weapon-attack-editor.js";
import { openAmmoManagement } from "./ammo-management-app.js";
import { installedMagazine, magazineFill } from "./ammo-inventory.js";
import { ammoText, ammoWindowText, ammoDisplayName } from "./ammo-management-localization.js";
import { WeaponConfigurationDraft, weaponConfigurationHTML, bindWeaponConfiguration, weaponText } from "./weapon-configuration.js";
import { standaloneText, StandaloneWeaponService } from "./standalone-weapon-service.js";
import { lematBarrel } from "../ht-physical-ammunition-evidence.js";
import { readStandaloneAttack, standaloneAvailableRounds } from "./standalone-attack-service.js";
import {
  applyAttackOverride,
  getAttackOverrideKey,
  parseAccuracyComponents
} from "./weapon-attack-overrides.js";

const OPEN_ASSISTANTS = new Map();
const OPEN_FIRE_PREPARATIONS = new Map();
const OPEN_SUPPRESSION_FIRE = new Map();
const OPEN_SPECIAL_FIRE_MENUS = new Map();
const OPEN_SPRAYING_FIRE = new Map();
const OPEN_SPRAYING_SELECTIONS = new Map();
const LAST_FIRE_BODYPLANS = new Map();
const TARGETED_ATTACK_CONTEXTS = new WeakMap();

export function buildFireSkillBreakdownHtml(payload, escapeHTML) {
  const skillDetails = [];
  const bond = payload.combatCalculation?.modifiers?.find(entry =>
    entry.channel === "weaponBond" && entry.value !== 0);
  if (bond) skillDetails.push(`${escapeHTML(bond.label)}: <strong>+${bond.value}</strong>`);
  if (payload.closeHipShooting) {
    const chs = payload.closeHipShooting;
    skillDetails.push(`${escapeHTML(chs.governingSkillName)}: <strong>${chs.governingSkillLevel}</strong>; ` +
      `${escapeHTML(chs.label)}: <strong>${chs.techniqueLevel}</strong>; ` +
      `Bulk: <strong>${chs.bulk}</strong>; Результат стрельбы от бедра: <strong>${chs.closeHipBase}</strong>`);
  }
  if (payload.closeQuartersBattle) {
    const cqb = payload.closeQuartersBattle;
    skillDetails.push(`${escapeHTML(cqb.governingSkillName)}: <strong>${cqb.governingSkillLevel}</strong>; ` +
      `${escapeHTML(cqb.label)}: <strong>${cqb.techniqueLevel}</strong>; ` +
      `оружейная техника: <strong>${cqb.weaponTechniqueLevel}</strong>; Move and Attack / Bulk: <strong>${cqb.movePenalty}</strong>; ` +
      `База ближнего боя: <strong>${cqb.cqbBase}</strong>`);
  }
  if (payload.baseSkillName && Number.isFinite(payload.baseSkill)) {
    const base = escapeHTML(payload.baseSkillName) + ": <strong>" + payload.baseSkill + "</strong>";
    return `<details class="olegurps-fire-skill-breakdown olegurps-chat-details"><summary style="cursor:pointer">Расчёт навыка</summary><div>${base}` +
      (skillDetails.length ? `<br><br>${skillDetails.join(".<br><br>")}` : "") + `</div></details>`;
  }
  return skillDetails.length
    ? `<details class="olegurps-fire-skill-breakdown olegurps-chat-details"><summary style="cursor:pointer">Расчёт навыка</summary><div>${skillDetails.join(".<br><br>")}</div></details>`
    : "";
}

export async function openAmmoManager() {
  const ApplicationV2 = foundry?.applications?.api?.ApplicationV2;
  const DialogV2 = foundry?.applications?.api?.DialogV2;

  if (!ApplicationV2 || !DialogV2) {
    ui.notifications.error(
      "Этот макрос требует Foundry VTT с поддержкой ApplicationV2 и DialogV2."
    );
    return;
  }

  if (!globalThis.GURPS?.executeOTF || !globalThis.GURPS?.ModifierBucket) {
    ui.notifications.error(
      "Не найден GURPS Game Aid или необходимые функции GGA."
    );
    return;
  }

  const controlled = canvas?.tokens?.controlled ?? [];

  if (controlled.length === 0) {
    ui.notifications.error(
      "Токен не выбран. Выделите один токен и запустите макрос снова."
    );
    return;
  }

  if (controlled.length > 1) {
    ui.notifications.error(
      "Выбрано несколько токенов. Выделите только один токен."
    );
    return;
  }

  const token = controlled[0];
  const actor = token?.actor;

  if (!actor) {
    ui.notifications.error(
      "У выбранного токена не найден связанный персонаж."
    );
    return;
  }

  if (!actor.isOwner) {
    ui.notifications.error(
      `У вас нет прав на изменение персонажа «${actor.name}».`
    );
    return;
  }

  const fireService = new FireService({ actor, token });
  const { getRangeBands, getGgaTargetRangeRecommendation, getTargetRangeRecommendation, getFireModeState,
    getTaggedModifierSettings, calculateEffectiveFireSkill, calculateEffectiveFireSkillDetails, getFireBonuses } =
      createFireControlContext({ token, fireService });
  const ammoService = new AmmoService(actor);
  const selectedBatteries = new Set();
  const batteryReplacements = new Set();

  const MANAGER_CSS = `
    .gam-ammo-manager {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      width: 100% !important;
      overflow-y: hidden;
      overflow-x: hidden;
      box-sizing: border-box;
      padding: 2px 8px 2px 2px;
      font-size: 0.88em;
    }

    .gam-ammo-manager,
    .gam-ammo-manager * {
      box-sizing: border-box;
    }

    .gam-toolbar {
      flex: 0 0 auto;
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 7px !important;
      width: 100% !important;
      margin: 0 0 10px !important;
      padding: 0 0 10px !important;
      border-bottom: 1px solid rgba(128, 128, 128, 0.32);
    }

    .gam-toolbar button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 34px !important;
      margin: 0 !important;
      padding: 5px 7px !important;
      white-space: normal !important;
      line-height: 1.15 !important;
    }

    .gam-weapon-list {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      align-items: stretch !important;
      gap: 10px !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .gam-card {
      display: block !important;
      position: relative !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 10px !important;
      overflow: hidden !important;
      border: 1px solid rgba(128, 128, 128, 0.38);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.025);
    }

    .gam-card.broken {
      border-color: #b44;
    }

    .gam-card-head {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 0 0 8px !important;
      border-bottom: 1px solid rgba(128, 128, 128, 0.28);
    }

    .gam-card-info {
      display: block !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .gam-card h3 {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-wrap: anywhere;
      font-size: 1.13em !important;
      line-height: 1.18 !important;
    }

    .gam-sub {
      display: block !important;
      margin: 3px 0 0 !important;
      padding: 0 !important;
      opacity: 0.82;
      font-size: 0.92em !important;
      line-height: 1.22 !important;
      overflow-wrap: anywhere;
    }

    .gam-uaw-feeds { display:grid; gap:6px; }
    .gam-uaw-feed { display:grid; gap:3px; }
    .gam-magazines {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 6px !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 8px 0 !important;
      border-bottom: 1px solid rgba(128, 128, 128, 0.28);
    }

    .gam-mag {
      display: inline-flex !important;
      align-items: center !important;
      flex: 0 1 auto !important;
      width: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 3px 7px !important;
      position: relative;
      overflow: hidden;
      border: 1px solid hsl(var(--gam-mag-hue, 0) 78% 43%);
      border-radius: 999px;
      color: #fff;
      background: #19191d;
      font-weight: 600;
      text-shadow: 0 1px 2px #000;
      white-space: normal !important;
      line-height: 1.2 !important;
      cursor: pointer;
    }

    .gam-mag::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--gam-mag-fill, 0%);
      background: hsl(var(--gam-mag-hue, 0) 78% 43% / .42);
      transition: width 160ms ease, background-color 160ms ease;
      pointer-events: none;
    }

    .gam-mag { max-width: 100% !important; gap: 6px; }
    .gam-mag-label, .gam-mag-name { position: relative; z-index: 1; }
    .gam-mag-label { flex: 0 0 auto; white-space: nowrap; }
    .gam-mag-name { min-width: 0; overflow-wrap: anywhere; text-align: left; }
    .gam-ammo-stock-row { overflow-wrap: anywhere; }

    .gam-mag:hover,
    .gam-mag:focus-visible {
      outline: 1px solid #fff;
      outline-offset: 2px;
    }

    .gam-mag.loaded {
      outline: 2px solid #fff;
      outline-offset: 2px;
      cursor: default;
    }

    .gam-actions {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: stretch !important;
      gap: 7px !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 8px 0 0 !important;
    }

    .gam-actions button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 1 1 135px !important;
      gap: 6px !important;
      width: auto !important;
      min-width: 0 !important;
      min-height: 34px !important;
      margin: 0 !important;
      padding: 5px 7px !important;
      white-space: normal !important;
      overflow-wrap: anywhere;
      text-align: center !important;
      font-size: 0.91em !important;
      line-height: 1.15 !important;
    }

    .gam-actions .gam-action-remove {
      flex: 0 0 36px !important;
      width: 36px !important;
      min-width: 36px !important;
      padding: 5px !important;
      border-color: rgba(224, 70, 78, 0.72);
      color: #ef5962;
      background: rgba(160, 28, 35, 0.16);
    }

    .gam-actions .gam-action-remove:hover,
    .gam-actions .gam-action-remove:focus-visible {
      border-color: #ff626b;
      color: #ff737b;
      background: rgba(190, 34, 43, 0.3);
    }

    .gam-actions button i,
    .gam-toolbar button i {
      flex: 0 0 auto !important;
      margin: 0 !important;
    }

    .gam-empty {
      display: block !important;
      width: 100% !important;
      padding: 20px !important;
      text-align: center !important;
      opacity: 0.82;
      border: 1px dashed rgba(128, 128, 128, 0.42);
    }

    .gam-result:not(:empty) {
      margin: 0 0 10px;
      padding: 7px 9px;
      border: 1px solid rgba(128, 128, 128, 0.3);
      border-radius: 5px;
    }

    @media (max-width: 720px) {
      .gam-toolbar {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 480px) {
      .gam-toolbar {
        grid-template-columns: 1fr !important;
      }

      .gam-card-head {
        flex-direction: column !important;
      }

    }
  `;

  const escapeHTML = value => {
    const text = String(value ?? "");

    if (foundry?.utils?.escapeHTML) {
      return foundry.utils.escapeHTML(text);
    }

    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const parseNumber = (value, fallback = 0) => {
    const text = String(value ?? "").trim().replace(",", ".");
    if (text === "") return fallback;
    const number = Number(text);
    return Number.isFinite(number) ? number : fallback;
  };

  const clampInteger = (
    value,
    minimum = 0,
    maximum = Number.MAX_SAFE_INTEGER
  ) => {
    return Math.min(
      maximum,
      Math.max(minimum, Math.trunc(parseNumber(value, minimum)))
    );
  };

  const parseBoolean = value => {
    return (
      value === true ||
      value === "true" ||
      value === "on" ||
      value === 1 ||
      value === "1"
    );
  };

  const randomId = () => {
    return foundry?.utils?.randomID?.(16) ?? crypto.randomUUID();
  };

  function removeChatLinePeriods(html) {
    return String(html ?? "")
      .replace(/\.(?=\s*<br\s*\/?>)/gi, "")
      .replace(/\.(?=\s*<\/(?:p|div|li)>)/gi, "")
      .replace(/\.(?=\s*$)/g, "");
  }

  function walkTree(tree, basePath, callback, depth = 0) {
    if (!tree || typeof tree !== "object") return;

    for (const [key, entry] of Object.entries(tree)) {
      if (!entry || typeof entry !== "object") continue;
      const path = `${basePath}.${key}`;
      callback(entry, path, key, depth);
      walkTree(entry.contains, `${path}.contains`, callback, depth + 1);
      walkTree(entry.collapsed, `${path}.collapsed`, callback, depth + 1);
    }
  }

  function getRangedAttacks(state = null) {
    const result = [];

    walkTree(actor.system?.ranged, "system.ranged", (attack, path) => {
      const name = String(attack.name ?? "Без названия").trim();
      const mode = String(attack.mode ?? "").trim();
      const accuracy = parseAccuracyComponents(attack.acc);

      result.push(withRuntimeAmmoStats(applyAttackOverride({
        path,
        uuid: String(attack.uuid ?? ""),
        name,
        mode,
        level: clampInteger(attack.level, 0, 999),
        governingSkillBinding: state?.governingSkills?.[getRangedGoverningAttackKey({ path, uuid: attack.uuid, name, mode })] ?? null,
        shots: String(attack.shots ?? "").trim(),
        rof: String(attack.rof ?? "").trim(),
        acc: accuracy.acc,
        scopeBonus: accuracy.scopeBonus,
        bulk: fireService.normalizeBulk(attack.bulk),
        bulkMetadata: parseWeaponBulk(attack.bulk),
        rcl: String(attack.rcl ?? "").trim(),
        label: mode ? `${name} — ${mode}` : name,
        data: attack
      }, state), actor, state));
    });

    return result.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }

  function makeAttackRef(attack) {
    return {
      path: attack.path,
      uuid: attack.uuid,
      name: attack.name,
      mode: attack.mode
    };
  }

  function resolveAttack(ref, attacks = getRangedAttacks()) {
    if (!ref) return null;

    return (
      (ref.uuid && attacks.find(attack => attack.uuid === ref.uuid)) ||
      (ref.path && attacks.find(attack => attack.path === ref.path)) ||
      attacks.find(
        attack => attack.name === ref.name && attack.mode === ref.mode
      ) ||
      null
    );
  }

  const sumMagazines = weapon => ammoService.sumMagazines(weapon);
  const looseAmmo = weapon => ammoService.looseAmmo(weapon);
  const normalizeChatSettings = raw => ammoService.normalizeChatSettings(raw);
  const normalizeWeaponShape = weapon => ammoService.normalizeWeaponShape(weapon);
  const loadState = () => ammoService.loadState();
  const saveState = state => ammoService.saveState(state);
  const repairWeaponAmmo = weapon => ammoService.repairWeaponAmmo(weapon);
  const repairState = (state, showWarning = true) => ammoService.repairState(state, showWarning);
  function shouldReportEvent(state, key) {
    return !!state.chatSettings?.events?.[key];
  }

  function shouldReportField(state, key) {
    return !!state.chatSettings?.fireFields?.[key];
  }

  async function reportToChat(state, eventKey, title, body) {
    if (!shouldReportEvent(state, eventKey)) return;

    const cleanBody = removeChatLinePeriods(body);
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor, token }),
      content: `
        <div style="font-size: 0.84em; line-height: 1.25;">
          <h3 style="margin: 0 0 4px; font-size: 1.08em;">
            ${escapeHTML(title)}
          </h3>
          <div>${cleanBody}</div>
        </div>
      `
    };

    if (state.chatSettings?.mode !== "all") {
      chatData.whisper = [game.user.id];
    }

    await ChatMessage.create(chatData);
  }

  function withWeaponBond(attack, weapon) {
    return attack ? { ...attack, weaponBond: isWeaponBondActive(actor, attack.weaponBondSetting??weapon?.weaponBond) } : null;
  }

  function getWeaponContext(state, weaponId) {
    const weapon = uawWeaponView(state,state.weapons.find(entry => entry.id === weaponId));
    if (!weapon) {
      throw new Error("Оружие не найдено в настройках макроса.");
    }

    normalizeWeaponShape(weapon);
    if (weapon.ammunitionReview) throw new Error(ammoText("Review"));
    return {
      weapon,
      attack: withWeaponBond(weapon.standaloneWeaponId ?
        withRuntimeAmmoStats(readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId), actor, state) :
        resolveAttack(weapon.attackRef, getRangedAttacks(state)), weapon)
    };
  }

  function getShotLimits(attack, loaded, modeIndex = 0) {
    return fireService.getShotLimits(attack, loaded, modeIndex);
  }
  function getMaximumShots(attack, loaded, modeIndex = 0) {
    return getShotLimits(attack, loaded, modeIndex).maxShots;
  }
  function parseAttackRcl(attack) {
    return fireService.parseAttackRcl(attack);
  }
  function getAttackDamageFormula(attack) {
    const damage = attack?.data?.damage;
    if (typeof damage === "string") return damage.trim();
    if (!Array.isArray(damage)) return "";

    const getFormula = entry => typeof entry === "string"
      ? entry.trim()
      : String(entry?.damage ?? entry?.formula ?? entry?.basicDamage ?? "").trim();
    const attackMode = String(attack?.mode ?? "").trim();
    const matched = damage.find(entry => entry && typeof entry === "object" &&
      attackMode && String(entry.mode ?? entry.name ?? "").trim() === attackMode);
    if (matched) return getFormula(matched);
    const formulas = damage.map(getFormula).filter(Boolean);
    return formulas.length === 1 ? formulas[0] : "";
  }

  function getCloseDamageReport(attack, fireMode, profile = null) {
    if (!fireMode?.extremelyClose || !Number.isInteger(fireMode.closeDamageMultiplier) || fireMode.closeDamageMultiplier < 1) {
      return null;
    }
    const source = profile?.damage?.nativeSafe ? profile.damage.formula : getAttackDamageFormula(attack);
    const formula = fireService.multiplyBasicDamageFormula(source, fireMode.closeDamageMultiplier);
    return {
      source,
      multiplier: fireMode.closeDamageMultiplier,
      formula,
      parsed: !!formula
    };
  }

  function calculateRapidFireBonus(shots) {
    return fireService.calculateRapidFireBonus(shots);
  }
  function extractMarginFromRoll(rollData) {
    return fireService.extractMarginFromRoll(rollData);
  }
  function calculateHitsFromMargin(shots, rcl, margin, rollData) {
    return fireService.calculateHitsFromMargin(shots, rcl, margin, rollData);
  }
  function parseShotOptions(weapon, attack, values, rangeBands, targetingService, effectRangePenalty = null) {
    const visibility = normalizeVisibility(values.visibility);
    const visibilityRule = visibilityRules(visibility);
    if (visibilityRule?.random) {
      values = { ...values, aimSeconds: 0, braced: false, laserSight: false,
        hitLocationId: "silhouette", hitRegionId: null };
    }
    const loaded = standaloneAvailableRounds(weapon);
    const shotLimits = getShotLimits(attack, loaded, values.rofMode);
    if (values.rangedRapidStrikePart) shotLimits.minShots = 1;
    const shotsText = String(values.shots ?? "").trim();
    const manualText = String(values.manualModifier ?? "").trim();
    const shots = Number(shotsText.replace(",", "."));
    const manualModifier = manualText === "" ? 0 : Number(manualText.replace(",", "."));
    const aimSeconds = fireService.normalizeAimSeconds(values.aimSeconds);
    const braced = parseBoolean(values.braced);
    const laserSight = parseBoolean(values.laserSight);
    const moveAndAttack = parseBoolean(values.moveAndAttack);
    const allOutAttack = parseBoolean(values.allOutAttack) && !moveAndAttack;
    const allOutAttackBonus = fireService.calculateRangedAllOutAttackBonus(allOutAttack, moveAndAttack);
    const { aimBonus, bracingBonus, sightBonus, laserBonus } = fireService.resolveAimedFireBonuses({
      accuracy: attack?.acc,
      scopeBonus: attack?.scopeBonus ?? attack?.data?.scopeBonus ?? 0,
      aimSeconds,
      braced,
      laserSight,
      moveAndAttack
    });
    const moveAttackPenalty = fireService.calculateMoveAttackPenalty(
      attack?.data?.bulk ?? attack?.bulk,
      moveAndAttack
    );
    const rangeIndex = values.rangeIndex === null || values.rangeIndex === ""
      ? Number.NaN
      : Number(values.rangeIndex);
    const rangeEntry = rangeBands.find(entry => entry.index === rangeIndex);
    const elevationHeight = parseElevationHeight(values.height);
    const elevationDirection = values.elevationDirection ?? "level";
    const beamWeapon = isBeamWeapon(attack);
    const { effectiveRange, elevation, environment } = resolveEffectiveRange({
      rangeBands,
      rangeIndex,
      distance: values.manualRangeSelected ? null : values.targetDistanceOverride,
      height: values.height,
      elevationDirection,
      beamWeapon, environmentCapability: attack?.ammunitionEnvironment, attackEnvironment: values.attackEnvironment,
      depthFeet: values.depthFeet, weaponRange: attack?.data?.range
    });
    const hitLocation = targetingService?.getSelection(values.hitLocationId, values.hitRegionId);
    const targetedAttackContext = TARGETED_ATTACK_CONTEXTS.get(targetingService) ?? null;
    const governingSkill = resolveRangedGoverningSkill({ actor,
      binding: attack?.governingSkillBinding });
    const locationIgnored=attack?.platformRules?.hitLocationNotApplicable===true;
    const targetedAttack = !locationIgnored && !visibilityRule?.random && targetedAttackContext?.resolve({
      governingSkill, specialty: governingSkill?.specialty ?? values.governingSpecialty,
      target: hitLocation?.canonicalKeys ?? hitLocation?.canonicalKey ?? hitLocation?.zoneId,
      basePenalty: hitLocation?.penalty
    });
    const fireMode = getFireModeState(attack, values, rangeBands);
    const rapidStrike = values.rangedRapidStrike
      ? resolveRangedRapidStrike({ actor, attack, governingSkill,
        governingSpecialty: governingSkill?.specialty ?? values.governingSpecialty }) : null;
    const errors = [];
    const platformError=platformMotionError(attack,{...values,moveAndAttack});
    if(platformError)errors.push(platformError);
    if (environment?.error) errors.push(automaticAmmoText(environment.error));

    if (shotsText === "" || !Number.isInteger(shots) || shots < shotLimits.minShots || shots > shotLimits.maxShots) {
      const allowedShots = shotLimits.minShots === shotLimits.maxShots
        ? `ровно ${shotLimits.maxShots}`
        : `от ${shotLimits.minShots} до ${shotLimits.maxShots}`;
      errors.push(`количество выстрелов должно быть целым числом ${allowedShots}`);
    }
    if (!Number.isInteger(manualModifier)) {
      errors.push("бонусы/штрафы должны быть целым числом");
    }
    if (elevationHeight === null) {
      errors.push("высота должна быть числом не меньше 0");
    }
    if (!rangeEntry) {
      errors.push("выберите строку расстояния");
    }
    if (!hitLocation) {
      errors.push("выберите доступную зону попадания");
    }
    const quickSpecialties = values.rangedRapidStrike
      ? getRangedRapidStrikeSpecialties({ actor, attack }) : [];
    if (!governingSkill && quickSpecialties.length > 1 &&
        !quickSpecialties.some(option => option.value === values.governingSpecialty)) {
      errors.push("Выберите основной навык для Quick-Shot.");
    }
    if (visibility?.mode === "partial" &&
        (!Number.isInteger(Number(values.visibility?.partialPenalty)) ||
         Number(values.visibility.partialPenalty) < -9 || Number(values.visibility.partialPenalty) > -1)) {
      errors.push("\u0448\u0442\u0440\u0430\u0444 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u0438 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043e\u0442 -9 \u0434\u043e -1");
    }
    if (visibility?.mode === "unseen" &&
        (Boolean(visibility.targetTokenId) === Boolean(visibility.blindFireHex) ||
         (visibility.targetTokenId && !["approximate", "exact"].includes(visibility.location)))) {
      errors.push("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435 \u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0446\u0435\u043b\u0438 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0433\u0435\u043a\u0441 \u0434\u043b\u044f \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
    }
    if (visibility?.mode === "blind" && !visibility.knownLocation && !visibility.hex) {
      errors.push("\u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0435\u0434\u043f\u043e\u043b\u0430\u0433\u0430\u0435\u043c\u044b\u0439 \u0433\u0435\u043a\u0441");
    }
    if (errors.length > 0) {
      ui.notifications.error(`Ошибка заполнения: ${errors.join("; ")}.`);
      return null;
    }

    const skillDetails = calculateEffectiveFireSkillDetails(
      attack, values, rangeBands, targetingService, targetedAttackContext);
    const effectiveSkill = skillDetails?.effectiveSkill ?? null;
    const rcl = fireService.parseAttackRcl(attack);
    if (rcl === null && !(attack.platformRules?.rclNotApplicable && fireMode.effectiveRoF===1)) {
      ui.notifications.warn(automaticAmmoText("ProjectileRclRequired"));
      return null;
    }
    return {
      shots,
      physicalShots: shots,
      effectiveRoF: fireMode.effectiveRoF,
      rofProfile: fireMode.profile,
      rofMode: shotLimits.modeIndex,
      fullRoF: shotLimits.fullRoF,
      extremelyClose: fireMode.extremelyClose,
      physicalDistance: fireMode.physicalDistance,
      halfDamageRange: fireMode.halfDamageRange,
      closeDamageMultiplier: fireMode.closeDamageMultiplier,
      rapidFireBonus: calculateRapidFireBonus(fireMode.effectiveRoF),
      effectiveSkill,
      combatCalculation: skillDetails?.combatCalculation ?? null,
      airburstTarget: values.airburstTarget ?? "point",
      environment: environment ?? null,
      baseSkill: skillDetails?.baseSkill ?? Number(attack?.level),
      baseSkillName: skillDetails?.baseSkillName ?? "Базовый навык оружия",
      visibilityPenalty: visibilityRule?.penalty ?? 0,
      visibilityCapAdjustment: visibilityRule?.blind
        ? Math.min(0, effectiveSkill - (skillDetails?.calculatedSkill ?? effectiveSkill)) : 0,
      concealTargetDetails: visibility?.mode === "unseen" || visibility?.mode === "blind" && !visibility.knownLocation,
      capLabel: visibilityRule?.blind ? "Предел навыка при стрельбе вслепую: 9" : undefined,
      rcl,
      aimSeconds,
      aimBonus,
      braced,
      bracingBonus,
      sightBonus,
      moveAndAttack,
      moveAttackPenalty: skillDetails?.moveAttackPenalty ?? moveAttackPenalty,
      closeQuartersBattle: skillDetails?.closeQuartersBattle ?? null,
      closeHipShooting: skillDetails?.closeHipShooting ?? null,
      allOutAttack,
      allOutAttackBonus,
      laserSight,
      laserBonus,
      manualModifier,
      rangedRapidStrikePenalty: rapidStrike ? -6 : 0,
      quickShotBonus: rapidStrike?.quickShotBonus ?? 0,
      quickShotLabel: rapidStrike?.quickShotLabel ?? null,
      height: elevationHeight,
      elevationDirection,
      beamWeapon,
      effectiveDistance: environment?.effectiveDistance ?? elevation?.effectiveDistance ?? null,
      rangePenalty: attack?.platformRules?.rofJet?0:(effectiveRange ?? rangeEntry).penalty,
      rangeLabel: (effectiveRange ?? rangeEntry).label,
      effectRangePenalty: Number.isFinite(effectRangePenalty) ? effectRangePenalty : null,
      hitLocationId: hitLocation.zoneId,
      hitRegionId: hitLocation.regionId,
      hitLocationLabel: locationIgnored?'Зрение':hitLocation.label,
      hitLocationModifierLabel: targetedAttack ? `${hitLocation.modifierLabel} (TA)` : hitLocation.modifierLabel,
      hitLocationPenalty: locationIgnored?0:targetedAttack?.effectivePenalty ?? hitLocation.penalty,
      randomHitLocation: !locationIgnored&&hitLocation.random
    };
  }
  async function executeRangedAttack(attack, options) {
    return fireService.executeRangedAttack(attack, options);
  }
  function buildFireChatBody(state, payload) {
    const lines = [];

    if (payload.ammoType && shouldReportField(state, "ammoType")) {
      lines.push(
        `Тип боеприпасов: <strong>${escapeHTML(payload.ammoType)}</strong>`
      );
    }

    if (shouldReportField(state, "shots")) {
      lines.push(`Выстрелов: <strong>${payload.fired}</strong>`);
    }

    if (shouldReportField(state, "hits")) {
      const hitText = payload.heProximity ? moduleText('OleGURPS.UTPayload.ProximityManualOutcome') : payload.manualSEFOP ? 'Выстрел SEFOP зарегистрирован; наведение и попадание — вручную.' : payload.manualHoming ? moduleText('OleGURPS.UTPayload.HomingManualOutcome') : payload.artillery
        ? `Наведение: запас успеха <strong>${payload.margin}</strong>. Ведущий определяет рассеивание и попадание.`
        : payload.hits === null
        ? `не удалось определить автоматически; Rcl: <strong>${payload.rcl}</strong>`
        : payload.blindHex
          ? `\u043f\u043e\u0442\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0445 \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439 (\u0435\u0441\u043b\u0438 \u0446\u0435\u043b\u044c \u0432 \u0433\u0435\u043a\u0441\u0435): <strong>${payload.hits}</strong>; \u0437\u0430\u043f\u0430\u0441 \u0443\u0441\u043f\u0435\u0445\u0430: <strong>${payload.margin}</strong>; Rcl: <strong>${payload.rcl}</strong>`
        : `попаданий: <strong>${payload.hits}</strong>; запас успеха: <strong>${payload.margin}</strong>; Rcl: <strong>${payload.rcl}</strong>`;
      lines.push(`Результат попаданий: <strong>${hitText}</strong>`);
    }

    const skillBreakdown = buildFireSkillBreakdownHtml(payload, escapeHTML);
    if (skillBreakdown) lines.push(skillBreakdown);

    const shotDetails = [];
    if (payload.closeDamage) {
      const damage = payload.closeDamage.formula
        ? escapeHTML(payload.closeDamage.formula)
        : `${escapeHTML(payload.closeDamage.source || "\u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c")} \u00d7${payload.closeDamage.multiplier}`;
      shotDetails.push(`\u0423\u0440\u043e\u043d: <strong>${damage}</strong>; DR: <strong>\u00d7${payload.closeDamage.multiplier}</strong>`);
    }
    if (payload.blindHex) shotDetails.push(`\u041f\u0440\u0435\u0434\u043f\u043e\u043b\u0430\u0433\u0430\u0435\u043c\u044b\u0439 \u0433\u0435\u043a\u0441: <strong>${payload.blindHex.i}, ${payload.blindHex.j}</strong>`);
    if (payload.randomHitLocations?.length && payload.blindHex) {
      shotDetails.push("\u0421\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0435 \u0437\u043e\u043d\u044b \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u044b\u0445 \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0439 (\u0435\u0441\u043b\u0438 \u0446\u0435\u043b\u044c \u0432 \u0433\u0435\u043a\u0441\u0435)");
    }
    if (shotDetails.length) lines.push(`<details class="olegurps-fire-context-breakdown olegurps-chat-details"><summary style="cursor:pointer">Условия выстрела</summary><div>${shotDetails.join(".<br><br>")}</div></details>`);
    if (payload.randomHitLocations?.length) {
      lines.push(buildRandomHitLocationsHtml(payload.randomHitLocations, { escapeHtml: escapeHTML }));
    } else if (payload.hitLocationText) {
      lines.push(`Зона попадания: <strong>${escapeHTML(payload.hitLocationText)}</strong>`);
    }

    if(payload.beamResource)lines.push(escapeHTML(payload.beamResource));
    if (payload.loadedAfter !== undefined && shouldReportField(state, "loadedMagazine")) {
      lines.push(
        `Установленный магазин: <strong>${payload.loadedAfter}/${payload.capacity}</strong>`
      );
    }

    if (payload.loadedAfter !== undefined && shouldReportField(state, "totalAmmo")) {
      lines.push(`Общий боезапас: <strong>${payload.totalAmmo}</strong>`);
    }

    return `<div class="olegurps-fire-chat-body">${lines.map(line => `<div>${line}</div>`).join("")}</div>`;
  }

  async function fireAndRoll(state, weaponId, rawShotOptions, targetingService, trademarkMove = false, preparedSnapshot = null, expectedEffectiveSkill = null) {
    const visibility = normalizeVisibility(rawShotOptions.visibility);
    if (visibility?.mode === "unseen" && !preparedSnapshot) {
      if (Boolean(visibility.targetTokenId) === Boolean(visibility.blindFireHex))
        throw new Error("Выберите один источник цели.");
      if (visibility.blindFireHex) {
        const center = canvas?.grid?.getCenterPoint?.(visibility.blindFireHex);
        const distance = measureCanvasPointDistanceYards(token, center);
        if (!Number.isFinite(distance)) throw new Error("Не удалось измерить дистанцию до выбранного гекса.");
        rawShotOptions = { ...rawShotOptions, targetDistanceOverride: distance };
      } else {
        const targets = [...(game.user?.targets ?? [])];
        if (targets.length !== 1 || targets[0]?.id !== visibility.targetTokenId ||
            !["approximate", "exact"].includes(visibility.location))
          throw new Error("Выбранный токен больше недоступен.");
        const distance = measureTokenDistanceYards(token, targets[0]);
        if (!Number.isFinite(distance)) throw new Error("Не удалось измерить дистанцию до выбранного токена.");
        rawShotOptions = { ...rawShotOptions, targetDistanceOverride: distance };
      }
    }
    if (visibility?.mode === "blind" && !visibility.knownLocation && !preparedSnapshot) {
      if (!visibility.hex) throw new Error("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0435\u0434\u043f\u043e\u043b\u0430\u0433\u0430\u0435\u043c\u044b\u0439 \u0433\u0435\u043a\u0441.");
      const center = canvas?.grid?.getCenterPoint?.(visibility.hex);
      const distance = measureCanvasPointDistanceYards(token, center);
      if (!Number.isFinite(distance)) throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u0440\u0438\u0442\u044c \u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044e \u0434\u043e \u0433\u0435\u043a\u0441\u0430.");
      rawShotOptions = { ...rawShotOptions, targetDistanceOverride: distance };
    }
    let weapon, rollAttack, shotOptions;
    const rangeBands = getRangeBands();
    const effectRangePenalty = getTaggedModifierSettings()?.autoAdd && visibility?.mode !== "unseen" && !visibility?.hex
      ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null
      : null;
    const attackId = newAttackId();
    let result;
    try {
      result = await ammoService.executeShot({ weaponId, attackId,
        prepare: ({ state: current, ammunition }) => {
          const context = getWeaponContext(current, weaponId);
          weapon = context.weapon;
          if (!context.attack) throw new Error(attackProfileError("AttackMissing"));
          if (context.attack.readinessReason) throw new Error(context.attack.readinessReason);
          if (context.attack.ammunitionReadinessReason) throw Error(attackProfileError(context.attack.ammunitionReadinessReason));
          if (ammunition && Math.min(ammunition.available, ammunition.total) <= 0)
            throw new Error("InsufficientRounds");
          shotOptions = preparedSnapshot?.shotOptions ??
            parseShotOptions(weapon, context.attack, rawShotOptions, rangeBands, targetingService, effectRangePenalty);
          if (!shotOptions) return null;
          if (trademarkMove) shotOptions = applyTrademarkMoveBonus(shotOptions);
          if (trademarkMove && Number.isFinite(expectedEffectiveSkill) && shotOptions.effectiveSkill !== expectedEffectiveSkill)
            throw new Error("Эффективный навык изменился. Проверьте обновлённый расчёт перед броском.");
          rollAttack = preparedSnapshot?.attack ?? context.attack;
          const profile = resolveRuntimeAttackProfile({ actor, attack: rollAttack, weaponId,
            state: current, ammunition, context: { kind: preparedSnapshot ? "ranged-rapid-strike" : "normal",
              tokenId: token.id, physicalShots: shotOptions.physicalShots, effectiveSkill: shotOptions.effectiveSkill,
              manualGuidanceConfirmed: rawShotOptions.manualGuidanceConfirmed === true,
              effectiveRoF: shotOptions.effectiveRoF, rcl: shotOptions.rcl,
              airburstTarget: shotOptions.airburstTarget ?? "point",
              ...(shotOptions.environment ? { environment: shotOptions.environment } : {}),
              shotgun: { rawRoF: shotOptions.rofProfile?.source ?? rollAttack.rof, physicalShotsMax: shotOptions.rofProfile?.baseRoF ?? null,
                projectilesPerShot: shotOptions.rofProfile?.projectileMultiplier ?? 1,
                projectileKind: rollAttack.ammunitionProjectileKind ?? null, physicalDistance: shotOptions.physicalDistance,
                halfDamageRange: shotOptions.halfDamageRange, extremelyClose: shotOptions.extremelyClose,
                closeDamageMultiplier: shotOptions.closeDamageMultiplier, damageApplication: "native-GGA-GM-selection" } } });
          return { profile, amount: shotOptions.physicalShots };
        },
        execute: ({ profile }) => {
          const options = { ...shotOptions, attackProfile: profile, attackId, resourceTiming: "after-attack" };
          return visibility?.mode === "unseen" && visibility.blindFireHex ||
            visibility?.mode === "blind" && !visibility.knownLocation
            ? withClearedFoundryTargets(() => executeRangedAttack(rollAttack, options))
            : executeRangedAttack(rollAttack, options);
        }
      });
    } catch (error) {
      if (["GyrojetIdentityRequired","GuidanceRequired","AlternateLoadBallisticsRequired","GyrojetDistanceRequired","IncompatibleAmmunition", "InsufficientRounds", "Review", "AmmunitionChangedDuringAttack", "IncompleteShotAccounting", "IncompleteExplosiveRecipe", "IncompleteAmmunitionProfile"].includes(error.message)) {
        ui.notifications.warn(attackProfileError(error.message));
        return false;
      }
      throw error;
    }
    if (!result.rolled) {
      ui.notifications.warn(
        "Бросок атаки не был выполнен. Патроны не списаны."
      );
      return false;
    }

    Object.assign(state, result.state);
    weapon = result.weapon;
    const fired = result.profile.resource.kind === "unmanaged" ? shotOptions.physicalShots : result.spent;
    const firedAmmoType = result.profile.resource.kind === "unmanaged" ? null : ammoDisplayName(result.profile.ammunition) ?? weapon.ammoType;

    const rcl = shotOptions.rcl;
    const margin = extractMarginFromRoll(result.rollData);
    const hits = calculateHitsFromMargin(shotOptions.effectiveRoF, rcl, margin, result.rollData);
    const closeDamage = getCloseDamageReport(rollAttack, shotOptions, result.profile);
    let hitLocationText = shotOptions.hitLocationLabel;
    let randomHitLocations = [];
    if (shotOptions.randomHitLocation && hits > 0) {
      try {
        randomHitLocations = await targetingService.resolveRandomHitLocations(hits);
        hitLocationText = null;
      } catch (error) {
        console.error("Не удалось определить случайные зоны попаданий:", error);
        ui.notifications.warn("Попадания подтверждены, но случайные зоны определить не удалось.");
      }
    }

    const body = buildFireChatBody(state, {
      ammoType: firedAmmoType,
      fired,
      hits,
      heProximity:!!result.profile.damage?.rules?.heProximity,
      manualSEFOP:!!result.profile.damage?.rules?.manualSEFOP,
      manualHoming:!!result.profile.damage?.rules?.manualHoming,
      margin,
      rcl,
      artillery: rollAttack?.platformRules?.kind==='mortar',
      closeDamage,
      closeQuartersBattle: shotOptions.closeQuartersBattle,
      closeHipShooting: shotOptions.closeHipShooting,
      baseSkill: shotOptions.baseSkill, baseSkillName: shotOptions.baseSkillName,
      combatCalculation: shotOptions.combatCalculation,
      hitLocationText,
      randomHitLocations,
      blindHex: visibility?.mode === "unseen" ? visibility.blindFireHex
        : visibility?.mode === "blind" && !visibility.knownLocation ? visibility.hex : null,
      loadedAfter: weapon.magazines[weapon.loadedIndex],
      beamResource:beamResourceLabel(weapon),
      capacity: weapon.capacity,
      totalAmmo: weapon.totalAmmo
    });

    if (body) {
      await reportToChat(state, "fire", weapon.name, body);
    }

    return true;
  }

  async function spendWithoutRoll(state, weaponId) {
    if (selectedBatteries.has(weaponId)) {
      const weapon = uawWeaponView(state,state.weapons.find(w => w.id === weaponId));
      const fuel=lpProfile(weapon);
      const charge = fuel?(readLPFuel(weapon)?.remainingUnits??0)/4:readWeaponBattery(weapon)?.charge ?? 0;
      if (!charge) return false;
      const data = await DialogV2.input({window:{title:(fuel?lpText('Spend'):moduleText('OleGURPS.PaintBattery.Spend'))},
        content:`<label>${escapeHTML((fuel?lpText('Amount'):moduleText('OleGURPS.PaintBattery.Amount')))}<input type="number" name="charge" min="${fuel?0.25:1}" max="${charge}" step="${fuel?0.25:1}" required></label>`,
        ok:{label:(fuel?lpText('Spend'):moduleText('OleGURPS.PaintBattery.Spend'))},rejectClose:false,modal:true});
      if (!data) return false;
      const value = Number((data.object ?? data).charge);
      const updated = await (fuel?ammoService.spendLPFuel(weaponId,value):ammoService.spendWeaponCharge(weaponId, value));
      Object.assign(state, updated);
      return true;
    }
    await repairState(state, false);
    const { weapon } = getWeaponContext(state, weaponId);
    const loaded = weapon.magazines[weapon.loadedIndex] ?? 0;

    if (loaded <= 0) {
      ui.notifications.warn("Установленный магазин пуст.");
      return false;
    }

    const data = await DialogV2.input({
      window: { title: `Списать патроны: ${weapon.name}` },
      position: { width: 480 },
      content: `
        <style>
          .gam-small-form .gam-form-row {
            padding: 9px 2px;
            border-top: 1px solid rgba(128,128,128,0.28);
            border-bottom: 1px solid rgba(128,128,128,0.28);
          }
          .gam-small-form .gam-field-line {
            display: grid;
            grid-template-columns: 1fr 120px;
            align-items: center;
            gap: 10px;
          }
          .gam-small-form input { width: 100%; margin: 0; }
          .gam-small-form .hint { margin: 4px 0 0; }
        </style>
        <div class="standard-form gam-small-form">
          <div class="gam-form-row">
            <div class="gam-field-line">
              <label for="gam-spend-shots"><strong>Количество выстрелов</strong></label>
              <input id="gam-spend-shots" type="number" name="shots" value="" min="1" max="${loaded}" step="1" required autofocus>
            </div>
            <p class="hint">В установленном магазине: ${loaded}/${weapon.capacity}</p>
          </div>
        </div>
      `,
      ok: { label: "Списать", icon: "fa-solid fa-minus" },
      rejectClose: false,
      modal: true
    });

    if (!data) return false;
    const values = data.object ?? data;
    const requested = Number(String(values.shots ?? "").trim().replace(",", "."));

    if (!Number.isInteger(requested) || requested < 1 || requested > loaded) {
      ui.notifications.error(`Введите целое число от 1 до ${loaded}.`);
      return false;
    }

    const fired = Math.min(requested, loaded, weapon.totalAmmo);
    if (!await ammoService.consumeLoadedRounds(state, weapon, fired)) return false;

    await reportToChat(
      state,
      "spend",
      weapon.name,
      `
        Без броска списано патронов: <strong>${fired}</strong>.<br>
        Магазин: <strong>${weapon.magazines[weapon.loadedIndex]}/${weapon.capacity}</strong>.<br>
        Общий боезапас: <strong>${weapon.totalAmmo}</strong>
      `
    );

    return true;
  }

  async function switchMagazine(state, weaponId, magazineIndex, managerApp) {
    const { weapon } = getWeaponContext(state, weaponId);
    const newIndex = Number(magazineIndex);
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= weapon.magazines.length) {
      ui.notifications.error("Выбранный магазин больше недоступен.");
      return false;
    }
    if (newIndex === weapon.loadedIndex&&(!uawGroup(weapon)||activeUAWCarrier(state,weapon)?.id===weapon.id)) return false;

    const oldIndex = weapon.loadedIndex;
    if (weapon.ammunitionInventory) {
      const next = await ammoService.inventoryTransaction(weapon.id, "install", { magazineId: weapon.ammunitionInventory.magazines[newIndex].id });
      Object.assign(weapon, next.weapons.find(entry => entry.id === weapon.id));
      Object.assign(state, next);
    } else {
      weapon.loadedIndex = newIndex;
      await saveState(state);
    }

    const group=uawGroup(weapon);
    if(group){
      for(const app of [...OPEN_FIRE_PREPARATIONS.values()])if(app.rendered&&uawGroup(app.weapon)===group&&app.weapon.id!==weapon.id){
        const selection=Object.fromEntries(['selectedRangeIndex','manualRangeSelected','manualModifier','aimSeconds','braced','laserSight','height','elevationDirection','proximityDistance'].map(k=>[k,app.fireState[k]]));
        await app.close();const next=await openFirePreparation(state,weapon.id,managerApp);
        if(next){Object.assign(next.fireState,selection);await next.render({force:true});}
      }
    }
    await reportToChat(
      state,
      "reload",
      weapon.name,
      `
        Магазин ${oldIndex + 1} (${weapon.magazines[oldIndex]}/${weapon.capacity}) заменён на магазин ${newIndex + 1} (<strong>${weapon.magazines[newIndex]}/${weapon.capacity}</strong>)
      `
    );

    return true;
  }


  async function refreshAttackOverrideConsumers(state, reference, { refreshAssistants = true } = {}) {
    const referenceKey = getAttackOverrideKey(reference);
    if (!referenceKey) return;
    const preparations = [...OPEN_FIRE_PREPARATIONS.values()].filter(preparation =>
      preparation.token?.actor?.id === actor.id && getAttackOverrideKey(preparation.weapon?.attackRef) === referenceKey);
    const effectiveAttacks = preparations.length ? getRangedAttacks(state) : [];

    for (const preparation of OPEN_FIRE_PREPARATIONS.values()) {
      if (preparation.token?.actor?.id !== actor.id) continue;
      if (getAttackOverrideKey(preparation.weapon?.attackRef) !== referenceKey) continue;
      preparation.weapon = state.weapons.find(weapon => weapon.id === preparation.weapon.id) ?? preparation.weapon;
      const effectiveAttack = withWeaponBond(resolveAttack(preparation.weapon.attackRef, effectiveAttacks), preparation.weapon);
      if (!effectiveAttack) continue;
      const loaded = preparation.weapon.magazines[preparation.weapon.loadedIndex] ?? 0;
      await preparation.updateWeaponAttack(effectiveAttack, {
        rateOfFireProfile: fireService.parseRateOfFire(effectiveAttack.rof),
        maximumShots: getMaximumShots(effectiveAttack, loaded)
      });
    }

    for (const assistant of refreshAssistants ? OPEN_ASSISTANTS.values() : []) {
      if (assistant.token?.actor?.id !== actor.id || !assistant.rendered) continue;
      assistant.setManagerState(state);
      await assistant.refreshContent();
    }
  }

  async function configureWeapon(state, existingId = null) {
    const attacks = getRangedAttacks(state);
    const existing = existingId ? state.weapons.find(weapon => weapon.id === existingId) : null;
    const api = globalThis.OleGURPSQOL;
    // Catalog loading/failure never prevents the existing GGA configuration path.
    try { await api?.catalogs?.load(); } catch (error) { console.warn("OleGURPS QOL: catalog unavailable", error); }
    const draft = new WeaponConfigurationDraft({ actor, state, attacks, existing,
      catalogs: api?.catalogs, bindings: api?.weaponCatalogBindings, ammunition: api?.ammunitionCompatibility });
    const data = await DialogV2.input({
      window: { title: existing ? `${weaponText("Configure")}: ${existing.name}` : weaponText("Add") },
      position: { width: 720 },
      content: weaponConfigurationHTML(draft),
      render: (_event, dialog) => {
        installViewportBounds(dialog);
        bindWeaponConfiguration(dialog.element, draft, async (attack, mode) => {
        const effective = mode.override?.action === "reset" ?
          resolveAttack(makeAttackRef(attack), getRangedAttacks()) : mode.override?.action === "save" ?
            applyAttackOverride(attack, { attackOverrides: { [getAttackOverrideKey(attack)]: mode.override.value } }) : attack;
        return openWeaponAttackEditor({ DialogV2, attack: effective, escapeHTML,
          parseRateOfFire: value => fireService.parseRateOfFire(value),
          configuration: { catalogs: api?.catalogs, target: mode.target,
            candidates: mode.analysis?.automatic?.candidates ?? [] } });
        });
      },
      ok: { label: weaponText("Save"), icon: "fa-solid fa-floppy-disk" },
      rejectClose: false,
      modal: false
    });
    if (!data) return false;
    const values = data.object ?? data;
    draft.selectAttack(String(values.attackPath ?? draft.path));
    if (!draft.standalone && !draft.attack) {
      ui.notifications.error(weaponText("SelectAttack"));
      return false;
    }
    draft.campaignTL = parseCampaignTL(values.campaignTL ?? draft.campaignTL);
    const result = await draft.commit({ id: randomId() });
    await saveState(result.state);
    for (const key of Object.keys(state)) if (!Object.hasOwn(result.state, key)) delete state[key];
    Object.assign(state, result.state);
    // Existing Fire Control windows consume the same per-mode skill and override state.
    for (const attack of attacks) {
      if (!draft.modes.has(attack.path)) continue;
      await refreshAttackOverrideConsumers(state, attack);
    }
    return true;
  }

  async function removeWeapon(state, weaponId) {
    const weapon = state.weapons.find(entry => entry.id === weaponId);
    if (!weapon) return false;

    const confirmed = await DialogV2.confirm({
      window: { title: "Удалить настройку оружия" },
      content: weapon.standaloneWeaponId ? `<p>${escapeHTML(weapon.name)}</p><p>${escapeHTML(standaloneText("ConfirmDelete"))}</p>` : `
        <p>
          Удалить «<strong>${escapeHTML(weapon.name)}</strong>» из менеджера патронов?
        </p>
        <p>
          Лист персонажа не изменится. Будут удалены только данные макроса.
        </p>
      `,
      yes: { label: "Удалить", icon: "fa-solid fa-trash" },
      no: { label: "Отмена" },
      rejectClose: false,
      modal: true
    });

    if (!confirmed) return false;

    if (weapon.standaloneWeaponId) {
      const next = await ammoService.removeStandaloneWeapon(weaponId);
      Object.assign(state, next);
      return true;
    }

    state.weapons = state.weapons.filter(entry => entry.id !== weaponId);
    await saveState(state);
    return true;
  }

  async function openChatSettings(state) {
    const settings = normalizeChatSettings(state.chatSettings);

    const checkboxRow = (name, label, checked) => `
      <div class="gam-chat-row">
        <span class="gam-chat-label">${label}</span>
        <input type="checkbox" name="${name}" ${checked ? "checked" : ""}>
      </div>
    `;

    const radioRow = (value, label, checked) => `
      <label class="gam-chat-row gam-chat-radio-row">
        <span class="gam-chat-label">${label}</span>
        <input type="radio" name="chatMode" value="${value}" ${checked ? "checked" : ""}>
      </label>
    `;

    const data = await DialogV2.input({
      window: { title: "Настройки сообщений в чат" },
      position: { width: 680 },
      content: `
        <style>
          .gam-chat-settings {
            max-height: 72vh;
            overflow-y: auto;
            padding: 0 6px 0 2px;
            font-size: 0.96em;
          }
          .gam-chat-section-title {
            margin: 0 0 8px;
            padding: 0 0 6px;
            font-size: 1.04em;
            border-bottom: 1px solid rgba(128,128,128,0.3);
          }
          .gam-chat-block {
            margin: 0 0 14px;
            padding: 0;
          }
          .gam-chat-row {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 10px 14px;
            padding: 8px 2px;
            border-bottom: 1px solid rgba(128,128,128,0.24);
          }
          .gam-chat-row:first-of-type {
            border-top: 1px solid rgba(128,128,128,0.24);
          }
          .gam-chat-label {
            line-height: 1.25;
            font-weight: 700;
          }
          .gam-chat-row input[type="checkbox"],
          .gam-chat-row input[type="radio"] {
            width: auto;
            margin: 0;
            justify-self: end;
          }
          .gam-chat-note {
            margin: 8px 0 0;
            opacity: 0.78;
            line-height: 1.22;
          }
        </style>

        <div class="standard-form gam-chat-settings">
          <div class="gam-chat-block">
            <h3 class="gam-chat-section-title">Кому отправлять сообщения</h3>
            ${radioRow("self", "Только себе", settings.mode !== "all")}
            ${radioRow("all", "Для всех", settings.mode === "all")}
          </div>

          <div class="gam-chat-block">
            <h3 class="gam-chat-section-title">Какие действия выводить</h3>
            ${checkboxRow("eventFire", "Выстрелы и результаты попаданий", settings.events.fire)}
            ${checkboxRow("eventSpend", "Списание патронов без броска", settings.events.spend)}
            ${checkboxRow("eventReload", "Перезарядка", settings.events.reload)}
            ${checkboxRow("eventTopUp", "Снаряжение магазинов", settings.events.topUp)}
            ${checkboxRow("eventUnload", "Разряжание магазина", settings.events.unload)}
            ${checkboxRow("eventStock", "Изменение общего боезапаса", settings.events.stock)}
          </div>

          <div class="gam-chat-block">
            <h3 class="gam-chat-section-title">Что показывать после выстрела</h3>
            ${checkboxRow("fieldAmmoType", "Тип боеприпасов", settings.fireFields.ammoType)}
            ${checkboxRow("fieldShots", "Количество выстрелов", settings.fireFields.shots)}
            ${checkboxRow("fieldHits", "Количество попаданий, запас успеха и Rcl", settings.fireFields.hits)}
            ${checkboxRow("fieldLoaded", "Остаток в установленном магазине", settings.fireFields.loadedMagazine)}
            ${checkboxRow("fieldTotal", "Общий боезапас", settings.fireFields.totalAmmo)}
          </div>

          <p class="gam-chat-note">
            Настройки сохраняются отдельно для каждого персонажа
          </p>
        </div>
      `,
      ok: { label: "Сохранить", icon: "fa-solid fa-floppy-disk" },
      rejectClose: false,
      modal: true
    });

    if (!data) return false;
    const values = data.object ?? data;

    state.chatSettings = {
      mode: values.chatMode === "all" ? "all" : "self",
      events: {
        fire: parseBoolean(values.eventFire),
        spend: parseBoolean(values.eventSpend),
        reload: parseBoolean(values.eventReload),
        topUp: parseBoolean(values.eventTopUp),
        unload: parseBoolean(values.eventUnload),
        stock: parseBoolean(values.eventStock)
      },
      fireFields: {
        ammoType: parseBoolean(values.fieldAmmoType),
        shots: parseBoolean(values.fieldShots),
        hits: parseBoolean(values.fieldHits),
        loadedMagazine: parseBoolean(values.fieldLoaded),
        totalAmmo: parseBoolean(values.fieldTotal)
      }
    };

    await saveState(state);
    return true;
  }

  function renderMagazineBadges(weapon,state) {
    const render = (carrier, options={}) => renderSingleMagazineBadges(carrier,
      {...options,batterySelected:selectedBatteries.has(carrier.id)});
    return renderUAWMagazineGroups(state,weapon,render,escapeHTML)??render(weapon);
  }
  function renderSingleMagazineBadges(weapon,{active=true,batterySelected=false}={}) {
    if (weapon.ammunitionReview) return "";
    return weapon.magazines
      .map((rounds, index) => {
        const loaded = active&&index === weapon.loadedIndex;
        const capacity = weapon.ammunitionInventory?.magazines[index]?.capacity ?? weapon.capacity;
        const fill = magazineFill(rounds, capacity);
        const magazine = weapon.ammunitionInventory?.magazines[index];
        const ammunition = weapon.ammunitionInventory?.stocks.find(stock => stock.key === magazine?.ammoKey)?.type;
        const ammoName = rounds === 0 ? ammoWindowText("Empty")
          : ammunition ? inventoryAmmoName(ammunition) : weapon.ammoType || "Неизвестное прежнее название";
        const ratio = capacity > 0 ? rounds / capacity : 0;
        const className =
          rounds === 0 ? "empty" : ratio <= 0.25 ? "low" : "";

        return `
          <button
            type="button"
            class="gam-mag ${className} ${loaded && !batterySelected ? "loaded" : ""}"
            style="--gam-mag-fill:${fill.percent}%;--gam-mag-hue:${fill.hue}"
            data-ammo-action="select-magazine"
            data-weapon-id="${weapon.id}"
            data-magazine-index="${index}"
            aria-pressed="${loaded && !batterySelected}"
            aria-label="${loaded ? "Установленный" : "Установить"} магазин ${index + 1}: ${rounds} из ${capacity}, ${escapeHTML(ammoName)}"
            title="${escapeHTML(ammoName)}"
          >
            <span class="gam-mag-label">${loaded ? "● " : ""}${index + 1}: ${rounds}/${capacity}</span>
          </button>
        `;
      })
      .join("");
  }

  async function openFirePreparation(state, weaponId, managerApp, initialVisibility = null) {
    // A just-committed magazine change can precede the manager's async update hook.
    // Open from the current ledger, not the previous card's inventory snapshot.
    const currentState=await loadState();
    await repairState(currentState, false);
    const { weapon, attack } = getWeaponContext(currentState, weaponId);
    if (!attack) {
      throw new Error(`Для «${weapon.name}» больше не найдена связанная дистанционная атака.`);
    }

    if (attack.readinessReason) throw new Error(attack.readinessReason);
    const powerReason = weaponPowerReason(weapon);
    if (powerReason) throw Error(powerReason);
    const loaded = standaloneAvailableRounds(weapon);
    if (loaded <= 0 || !beamWeapon(weapon)&&loaded !== Infinity && weapon.totalAmmo <= 0) {
      ui.notifications.warn(`«${weapon.name}»: установленный магазин пуст.`);
      return null;
    }

    const preparationKey = `${canvas?.scene?.id ?? "scene"}:${token.document?.id ?? token.id}:${weapon.id}`;
    const existing = OPEN_FIRE_PREPARATIONS.get(preparationKey);
    if (existing?.rendered) {
      existing.placementApps = [managerApp];
      if (initialVisibility) await existing.activateVisibility(initialVisibility);
      else await existing.activateVisibility(null);
      return existing;
    }

    const rangeBands = getRangeBands();
    if (initialVisibility?.mode === "unseen") await clearFoundryTargets();

    const targetSelectionKey = `${actor.id}:${weapon.id}`;
    const initialBodyplan = LAST_FIRE_BODYPLANS.get(targetSelectionKey) ?? "humanoid";
    const targetingService = await TargetingService.create({
      attack,
      bodyplan: initialBodyplan
    });
    const targetedAttackContext = createTargetedAttackContext({ actor, attack });
    TARGETED_ATTACK_CONTEXTS.set(targetingService, targetedAttackContext);
    const rateOfFireProfile = fireService.parseRateOfFire(attack.rof);
    let preparation;
    const currentAttack = () => preparation?.attack ?? attack;
    preparation = new FirePreparationApp({
      token,
      weapon,
      attack,
      rangeBands,
      getTargetRangeRecommendation: () => getTargetRangeRecommendation(rangeBands),
      beamWeapon: isBeamWeapon(attack),
      targetingService,
      targetedAttackContext,
      initialVisibility,
      placementApps: [managerApp],
      onHearingCheck: manualLevel => checkHearingMinusTwo(actor, manualLevel),
      initialGoverningSpecialty: weapon.governingSpecialty,
      maximumShots: getMaximumShots(attack, loaded),
      rateOfFireProfile,
      calculateShotLimits: modeIndex => getShotLimits(currentAttack(),
        standaloneAvailableRounds(preparation?.weapon ?? weapon), modeIndex),
      calculateRapidFireBonus,
      calculateAimBonus: (aimSeconds, moveAndAttack, braced, laserSight) => {
        const bonuses = fireService.resolveAimedFireBonuses({
          accuracy: currentAttack().acc,
          scopeBonus: currentAttack().scopeBonus ?? 0,
          aimSeconds,
          braced,
          laserSight,
          moveAndAttack
        });
        return bonuses.aimBonus + bonuses.sightBonus;
      },
      calculateBracingBonus: (braced, aimSeconds, moveAndAttack, laserSight) => fireService.resolveAimedFireBonuses({
        accuracy: currentAttack().acc, scopeBonus: currentAttack().scopeBonus ?? 0, aimSeconds, braced, laserSight, moveAndAttack
      }).bracingBonus,
      calculateLaserBonus: (laserSight, aimSeconds, braced, moveAndAttack) => fireService.resolveAimedFireBonuses({
        accuracy: currentAttack().acc, scopeBonus: currentAttack().scopeBonus ?? 0, aimSeconds, braced, laserSight, moveAndAttack
      }).laserBonus,
      calculateFireMode: shotOptions => getFireModeState(currentAttack(), shotOptions, rangeBands),
      calculateEffectiveSkill: (shotOptions, currentTargetingService = targetingService) => calculateEffectiveFireSkill(
        currentAttack(), shotOptions, rangeBands, currentTargetingService, preparation?.targetedAttackContext ?? targetedAttackContext),
      onTargetingServiceChange: currentTargetingService => {
        TARGETED_ATTACK_CONTEXTS.set(currentTargetingService, targetedAttackContext);
        LAST_FIRE_BODYPLANS.set(targetSelectionKey, currentTargetingService.bodyplan);
      },
      onGoverningSpecialtyChange: async skillKey => {
        if (weapon.standaloneWeaponId) return;
        const skill = listRangedGoverningSkills(actor).find(entry => entry.key === skillKey);
        const attackKey = getRangedGoverningAttackKey(weapon.attackRef);
        state.governingSkills ??= {};
        if (skill) state.governingSkills[attackKey] = bindingForGoverningSkill(skill);
        else delete state.governingSkills[attackKey];
        if (skill?.specialty) weapon.governingSpecialty = skill.specialty;
        else delete weapon.governingSpecialty;
        await saveState(state);
      },
      onClose: () => OPEN_FIRE_PREPARATIONS.delete(preparationKey),
      onConfirm: async (rawShotOptions, currentTargetingService = targetingService) => {
        if (Array.isArray(rawShotOptions)) {
          const latest = await loadState();
          await repairState(latest, false);
          const { weapon: latestWeapon, attack: latestAttack } = getWeaponContext(latest, weaponId);
          const loadedNow = latestWeapon.magazines[latestWeapon.loadedIndex];
          const mode = rawShotOptions[0]?.rofMode;
          const availableRoF = getShotLimits(latestAttack, loadedNow, mode).maxShots;
          if (!validateRangedRapidStrikeSplit(Number(rawShotOptions[0]?.shots),
            Number(rawShotOptions[1]?.shots), availableRoF))
            throw new Error("Быстрая двойная стрельба: распределите доступный RoF между атаками 1 и 2.");
          TARGETED_ATTACK_CONTEXTS.set(currentTargetingService,
            createTargetedAttackContext({ actor, attack: latestAttack }));
          const snapshots = [];
          for (const [index, raw] of rawShotOptions.entries()) {
            const targetId = raw.targetTokenId ?? null;
            const target = targetId ? canvas?.tokens?.get?.(targetId) : null;
            if (targetId && !target) throw new Error("Атака " + (index + 1) + ": токен цели недоступен.");
            const snapshot = await withFoundryTargets(targetId ? [targetId] : [], () => {
              const measured = target ? getTokenFireRangeContext({
                sourceToken: token, targetToken: target, rangeBands
              }) : null;
              const values = { ...raw,
                targetDistanceOverride: measured?.distance ?? raw.targetDistanceOverride,
                rangeIndex: raw.manualRangeSelected ? raw.rangeIndex : measured?.rangeIndex ?? raw.rangeIndex
              };
              const effectRangePenalty = getTaggedModifierSettings()?.autoAdd &&
                raw.visibility?.mode !== "unseen" && !raw.visibility?.hex
                ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null : null;
              const shotOptions = parseShotOptions(latestWeapon, latestAttack, values,
                rangeBands, currentTargetingService, effectRangePenalty);
              if (!shotOptions) throw new Error("Атака " + (index + 1) + ": некорректные условия выстрела.");
              return {
                targetId, targetingService: currentTargetingService,
                visibility: raw.visibility,
                attack: foundry.utils.deepClone(latestAttack),
                shotOptions: { ...shotOptions, contextLabel: "Атака " + (index + 1) },
                summary: shotOptions.hitLocationLabel + " | " + shotOptions.physicalShots + " shots | " +
                  shotOptions.effectiveSkill
              };
            });
            snapshots.push(snapshot);
          }
          const execution = new RangedAttackExecutionApp({
            slots: snapshots,
            execute: async (snapshot, consumeAction) => {
              const fresh = await loadState();
              const done = await withFoundryTargets(snapshot.targetId ? [snapshot.targetId] : [], () =>
                fireAndRoll(fresh, weaponId, { visibility: snapshot.visibility },
                  snapshot.targetingService, false, { attack: snapshot.attack,
                    shotOptions: { ...snapshot.shotOptions, consumeAction } }));
              if (done && managerApp?.rendered) {
                managerApp.setManagerState(fresh);
                await managerApp.refreshContent();
              }
              return done;
            }
          });
          await execution.render({ force: true });
          return true;
        }
        TARGETED_ATTACK_CONTEXTS.set(currentTargetingService, preparation?.targetedAttackContext ?? targetedAttackContext);
        const latest = await loadState();
        const changed = await fireAndRoll(latest, weaponId, rawShotOptions, currentTargetingService);
        if (!changed) return false;
        Object.assign(state, latest);
        if (managerApp?.rendered) {
          managerApp.setManagerState(state);
          managerApp.setResult("Бросок выполнен, боезапас обновлён.");
          try {
            await managerApp.refreshContent({weaponIds:[weaponId]});
          } catch (error) {
            console.error("Не удалось обновить Помощник стрельбы после выстрела:", error);
          }
        }
        return true;
      }
    });

    OPEN_FIRE_PREPARATIONS.set(preparationKey, preparation);
    try {
      await preparation.render({ force: true });
      return preparation;
    } catch (error) {
      OPEN_FIRE_PREPARATIONS.delete(preparationKey);
      throw error;
    }
  }

  async function openSuppressionFire(state, weaponId, managerApp) {
    const selectionKey = [canvas?.scene?.id, token.document?.id ?? token.id, game.user?.id].join(":");
    const selecting = OPEN_SPRAYING_SELECTIONS.get(selectionKey);
    if (selecting) {
      selecting.controller.abort();
      await selecting.promise.catch(() => null);
    }
    const specialOwner = getSpecialFireOwner({ token, actor });
    if (specialOwner?.type === "spraying") {
      throw new Error("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0438\u043b\u0438 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043c \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
    }
    await repairState(state, false);
    const { weapon, attack } = getWeaponContext(state, weaponId);
    if (!attack) throw new Error(`Не найдена связанная дистанционная атака для "${weapon.name}".`);

    const appKey = `${canvas?.scene?.id ?? "scene"}:${token.document?.id ?? token.id}:${weapon.id}`;
    const existing = OPEN_SUPPRESSION_FIRE.get(appKey);
    if (existing?.rendered) {
      existing.bringToTop();
      return existing;
    }

    const sessionService = new SuppressionFireSessionService({ token, actor, weapon, attack });
    const restoredSession = await sessionService.loadExisting();
    if (specialOwner && !restoredSession) {
      throw new Error("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0438\u043b\u0438 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043c \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b");
    }
    const capacity = getSuppressionFireCapacity({
      profile: fireService.parseRateOfFire(attack.rof),
      loaded: weapon.magazines[weapon.loadedIndex],
      totalAmmo: weapon.totalAmmo
    });
    if (!capacity.eligible && !restoredSession) {
      ui.notifications.warn("Для подавляющего огня нужны эффективный RoF 5+ и не менее 5 патронов в установленном магазине.");
      return null;
    }
    await sessionService.ensureSession();

    const rangeBands = getRangeBands();
    const targetSelectionKey = `${actor.id}:${weapon.id}`;
    const bodyplan = LAST_FIRE_BODYPLANS.get(targetSelectionKey) ?? "humanoid";
    const targetingService = await TargetingService.create({ attack, bodyplan });
    const targetedAttackContext = createTargetedAttackContext({ actor, attack });
    let suppressionApp;
    suppressionApp = new SuppressionFireApp({
      token,
      actor,
      weapon,
      attack,
      fireService,
      rangeBands,
      targetingService,
      targetedAttackContext,
      sessionService,
      placementApps: [managerApp],
      calculateEffectiveFireSkillDetails,
      getEffectRangePenalty: () => getTaggedModifierSettings()?.autoAdd
        ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null
        : null,
      consumeAmmo: async amount => {
        const result = await ammoService.executeShot({ weaponId: weapon.id,
          attackId: "suppression:" + sessionService.session.sessionId, resourceTiming: "suppression-activation",
          prepare: ({ state: current, ammunition }) => {
            const actual = getWeaponContext(current, weapon.id);
            return { amount, profile: resolveRuntimeAttackProfile({ actor, attack: actual.attack,
              weaponId: weapon.id, state: current, ammunition,
              context: { kind: "suppression", sessionId: sessionService.session.sessionId, physicalShots: amount } }) };
          },
          execute: async () => ({ rolled: true })
        }).catch(error => { throw new Error(attackProfileError(error.message)); });
        if (result.duplicate) {
          const savedProfile = result.receipt.profile ?? sessionService.session.ammunitionProfile;
          return { receipt: result.receipt, profile: savedProfile };
        }
        Object.assign(state, result.state);
        Object.assign(weapon, result.weapon);
        return result;
      },
      onGoverningSkillChange: async specialty => {
        if (specialty) weapon.governingSpecialty = specialty;
        else delete weapon.governingSpecialty;
        await saveState(state);
      },
      onComplete: async mode => {
        if (!managerApp?.rendered) return;
        managerApp.setManagerState(state);
        managerApp.setResult(mode === "manual"
          ? "Manual Suppression Fire started; ammunition updated."
          : "Automatic Suppression Fire activated; ammunition updated.");
        await managerApp.refreshContent();
      },
      onClose: () => OPEN_SUPPRESSION_FIRE.delete(appKey)
    });

    OPEN_SUPPRESSION_FIRE.set(appKey, suppressionApp);
    try {
      await suppressionApp.render({ force: true });
      return suppressionApp;
    } catch (error) {
      OPEN_SUPPRESSION_FIRE.delete(appKey);
      throw error;
    }
  }

  async function openSprayingFire(state, weaponId, managerApp) {
    const currentState = await loadState();
    await repairState(currentState, false);
    const { weapon, attack } = getWeaponContext(currentState, weaponId);
    if (!attack) throw new Error("\u041d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u043e \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0435\u0435 \u043e\u0440\u0443\u0436\u0438\u0435");
    const key = (canvas?.scene?.id ?? "scene") + ":" + token.id + ":" + weapon.id;
    const open = OPEN_SPRAYING_FIRE.get(key);
    if (open?.rendered) { open.bringToTop(); return open; }
    const selectionKey = [canvas?.scene?.id, token.document?.id ?? token.id, game.user?.id].join(":");
    const previousSelection = OPEN_SPRAYING_SELECTIONS.get(selectionKey);
    if (previousSelection) {
      previousSelection.controller.abort();
      await previousSelection.promise.catch(() => null);
    }
    const service = new SprayingFireSessionService({ token, actor, weapon, attack });
    await service.discardUnconfirmed();
    let session = service.findExisting();
    const capacity = sprayingCapacity(fireService.parseRateOfFire(attack.rof),
      weapon.magazines[weapon.loadedIndex], weapon.totalAmmo);
    if (!session && !capacity.eligible) throw new Error(capacity.reason);
    const rangeBands = getRangeBands();
    if (!session) {
      const modeIndex = capacity.usableModes[0].index;
      const direction = "left-to-right";
      while (true) {
        const controller = new AbortController();
        const picker = selectSprayingTargets(token, [managerApp], globalThis, controller.signal);
        OPEN_SPRAYING_SELECTIONS.set(selectionKey, { controller, promise: picker });
        let picked;
        try { picked = await picker; }
        finally {
          if (OPEN_SPRAYING_SELECTIONS.get(selectionKey)?.promise === picker) {
            OPEN_SPRAYING_SELECTIONS.delete(selectionKey);
          }
        }
        if (!picked) return null;
        const profile = fireService.parseRateOfFire(attack.rof);
        const mode = profile.type === "full-auto" ? profile.modes[modeIndex] : {
          index: 0, fullRoF: profile.baseRoF, minRoF: 1
        };
        const plan = planSprayingFire({
          source: token, targets: picked, direction,
          fullRoF: mode.fullRoF, minRoF: mode.minRoF
        });
        const currentAmmo = await service.currentAmmo();
        const available = Math.min(currentAmmo.loaded, currentAmmo.total);
        if (!plan.valid || plan.minimum > available) {
          ui.notifications.warn(plan.minimum > available
            ? "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0431\u043e\u0435\u043f\u0440\u0438\u043f\u0430\u0441\u043e\u0432 \u0434\u043b\u044f \u044d\u0442\u0438\u0445 \u0446\u0435\u043b\u0435\u0439"
            : "\u0426\u0435\u043b\u0438 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0434\u0430\u043b\u0435\u043a\u043e \u0434\u0440\u0443\u0433 \u043e\u0442 \u0434\u0440\u0443\u0433\u0430 \u0434\u043b\u044f RoF");
          continue;
        }
        const snapshots = new Map(picked.map(target => {
          const document = target.document;
          return [target.id, {
            tokenId: target.id, sceneId: canvas.scene.id,
            name: getSafeTargetName(target),
            geometry: {
              id: target.id, x: document.x, y: document.y,
              width: document.width, height: document.height, elevation: document.elevation
            },
            elevation: document.elevation, shots: 1, modifier: 0,
            manualDistance: null, heightOverride: null, highGroundOverride: null,
            completed: false, traverseDistance: 0, wastedShots: 0, usedSnapshot: null
          }];
        }));
        const targets = plan.rows.map(row => {
          const snapshot = snapshots.get(row.target.id);
          snapshot.traverseDistance = row.traverseDistance;
          snapshot.wastedShots = row.wastedShots;
          return snapshot;
        });
        targets[0].shots += Math.max(0, mode.minRoF - (targets.length + plan.waste));
        session = await service.createPlanned({
          modeIndex, direction, targets,
          plannedAmmo: Math.max(mode.minRoF, targets.length + plan.waste)
        });
        break;
      }
    }
    const targetingService = await TargetingService.create({
      attack, bodyplan: LAST_FIRE_BODYPLANS.get(actor.id + ":" + weapon.id) ?? "humanoid"
    });
    const app = new SprayingFireApp({
      token, actor, weapon, attack, fireService, fireContext: {
        getFireModeState, calculateEffectiveFireSkillDetails, getFireBonuses,
        getTaggedModifierSettings, getGgaTargetRangeRecommendation
      }, rangeBands, targetingService, targetedAttackContext: createTargetedAttackContext({ actor, attack }),
      sessionService: service, managerApp,
      onReselect: () => openSprayingFire(currentState, weaponId, managerApp),
      onCancel: () => openSpecialFireMenu(currentState, weaponId, managerApp),
      onComplete: async () => {
        if (managerApp?.rendered) {
          managerApp.setManagerState(await loadState());
          await managerApp.refreshContent();
        }
      },
      onClose: () => OPEN_SPRAYING_FIRE.delete(key)
    });
    OPEN_SPRAYING_FIRE.set(key, app);
    try { await app.render({ force: true }); return app; }
    catch (error) { OPEN_SPRAYING_FIRE.delete(key); throw error; }
  }


  function trademarkWeapons(state) {
    const attacks = getRangedAttacks(state);
    return (state.weapons ?? []).flatMap(weapon => {
      const attack = resolveAttack(weapon.attackRef, attacks);
      return attack ? [{ weapon, attack: withWeaponBond(attack, weapon), attackRef: makeAttackRef(attack),
        profile: fireService.parseRateOfFire(attack.rof) }] : [];
    });
  }

  function savedTrademarkMove() {
    const storage = actor.getFlag("olegurps-qol", TRADEMARK_MOVE_FLAG);
    return normalizeTrademarkMove(storage?.moves?.find(move => move.id === "default"));
  }

  async function validateTrademarkSteps(steps, state) {
    if (!Array.isArray(steps) || !steps.length) throw new Error("Для фирменного приёма нужна хотя бы одна атака.");
    const weapons = trademarkWeapons(state);
    for (const [index, raw] of steps.entries()) {
      const step = normalizeTrademarkMoveStep(raw);
      const current = weapons.find(entry => entry.weapon.id === step.weaponId);
      if (!current || !step.attackRef ||
          resolveAttack(step.attackRef, getRangedAttacks(state))?.path !== current.attack.path)
        throw new Error("Атака фирменного приёма " + (index + 1) + ": дистанционная атака недоступна.");
      const mode = current.profile.type === "full-auto"
        ? current.profile.modes[step.rofMode] : null;
      if (current.profile.type === "full-auto" && !mode)
        throw new Error("Атака фирменного приёма " + (index + 1) + ": некорректный режим RoF.");
      const maximum = mode?.fullRoF ?? current.profile.baseRoF;
      const minimum = step.rangedRapidStrike ? 1 : mode?.minRoF ?? 1;
      if (!Number.isInteger(step.shots) || step.shots < minimum || step.shots > maximum)
        throw new Error("Атака фирменного приёма " + (index + 1) + ": некорректное число выстрелов.");
      if (!Number.isInteger(step.aimSeconds) || step.aimSeconds < 0)
        throw new Error("Атака фирменного приёма " + (index + 1) + ": некорректное прицеливание.");
      if (!TargetingService.getBodyplanOptions().some(entry => entry.id === step.bodyplanId))
        throw new Error("Атака фирменного приёма " + (index + 1) + ": некорректная схема тела.");
      const targeting = await TargetingService.create({ attack: current.attack, bodyplan: step.bodyplanId });
      if (!targeting.getSelection(step.hitLocationId, step.hitRegionId))
        throw new Error("Атака фирменного приёма " + (index + 1) + ": зона попадания недоступна.");
      const quickSpecialties = step.rangedRapidStrike
        ? getRangedRapidStrikeSpecialties({ actor, attack: current.attack }) : [];
      if (!resolveRangedGoverningSkill({ actor, binding: current.attack.governingSkillBinding }) &&
          step.rangedRapidStrike && quickSpecialties.length > 1 &&
          !quickSpecialties.some(entry => entry.value === step.governingSpecialty))
        throw new Error("Атака фирменного приёма " + (index + 1) + ": выберите основной навык для Quick-Shot.");
    }
  }

  async function openTrademarkEditor() {
    const state = await loadState();
    const saved = savedTrademarkMove();
    const app = new TrademarkMoveEditorApp({
      actor, weapons: trademarkWeapons(state), steps: saved?.steps,
      calculatePreview: (current, step, targetingService, targetedAttackContext) => getTrademarkMoveSkillPreview({
        attack: current.attack, values: { ...step, configuredPreview: true },
        rangeBands: getRangeBands(), targetingService, targetedAttackContext,
        calculateSkillDetails: calculateEffectiveFireSkillDetails
      }),
      onSave: async steps => {
        const latest = await loadState();
        await validateTrademarkSteps(steps, latest);
        const storage = actor.getFlag("olegurps-qol", TRADEMARK_MOVE_FLAG);
        const moves = Array.isArray(storage?.moves) ? storage.moves.filter(move => move.id !== "default") : [];
        moves.push({ id: "default", version: 1, steps: steps.map(normalizeTrademarkMoveStep) });
        await actor.setFlag("olegurps-qol", TRADEMARK_MOVE_FLAG, { version: 1, moves });
      },
      onDelete: async () => {
        const storage = actor.getFlag("olegurps-qol", TRADEMARK_MOVE_FLAG);
        const moves = Array.isArray(storage?.moves) ? storage.moves.filter(move => move.id !== "default") : [];
        if (moves.length) await actor.setFlag("olegurps-qol", TRADEMARK_MOVE_FLAG, { version: 1, moves });
        else await actor.unsetFlag("olegurps-qol", TRADEMARK_MOVE_FLAG);
      }
    }, { id: "olegurps-trademark-move-editor-" + actor.id });
    await app.render({ force: true });
    return app;
  }

  function getTrademarkExecutionOptions(step, situation, rangeBands) {
    if (parseElevationHeight(situation.height) === null || !Number.isInteger(situation.manualModifier) ||
        situation.visibilityMode === "partial" &&
        (!Number.isInteger(situation.partialPenalty) || situation.partialPenalty < -9 || situation.partialPenalty > -1))
      throw new Error("Некорректные дистанция, высота, ситуативный модификатор или штраф видимости.");
    const targets = [...(game.user?.targets ?? [])];
    if (targets.length > 1) throw new Error("Снимите выбор цели или выберите только одну текущую цель.");
    const manualRange = situation.rangeIndex === null ? null
      : rangeBands.find(entry => entry.index === situation.rangeIndex);
    if (situation.rangeIndex !== null && !manualRange)
      throw new Error("Выберите доступную дистанцию.");
    const measuredRange = targets.length === 1 ? getTokenFireRangeContext({
      sourceToken: token, targetToken: targets[0], rangeBands
    }) : null;
    if (!manualRange && !measuredRange)
      throw new Error("Выберите дистанцию или один токен цели.");
    if (!manualRange && !rangeBands.some(entry => entry.index === measuredRange.rangeIndex))
      throw new Error("Выбранная цель находится вне доступной таблицы дистанций.");
    const visibility = situation.visibilityMode === "normal" ? null
      : situation.visibilityMode === "partial" ? { mode: "partial", partialPenalty: situation.partialPenalty }
      : situation.visibilityMode === "unseen" || situation.visibilityMode === "unseen-exact"
        ? { mode: "unseen", location: situation.visibilityMode === "unseen-exact" ? "exact" : "approximate", targetTokenId: targets[0]?.id }
        : situation.visibilityMode === "known" ? { mode: "known", knownLocation: true }
        : { mode: "blind", knownLocation: true };
    return { ...step, visibility, manualModifier: situation.manualModifier,
      rangeIndex: manualRange?.index ?? measuredRange?.rangeIndex,
      manualRangeSelected: !!manualRange,
      targetDistanceOverride: manualRange ? null : measuredRange?.distance ?? null,
      height: situation.height,
      elevationDirection: situation.elevationDirection };
  }

  async function openTrademarkExecution(managerApp) {
    const move = savedTrademarkMove();
    if (!move) return openTrademarkEditor();
    const state = await loadState();
    await validateTrademarkSteps(move.steps, state);
    const weapons = trademarkWeapons(state);
    const slots = await Promise.all(move.steps.map(async raw => {
      const step = normalizeTrademarkMoveStep(raw);
      const current = weapons.find(entry => entry.weapon.id === step.weaponId);
      const service = await TargetingService.create({ attack: current.attack, bodyplan: step.bodyplanId });
      const location = service.getSelection(step.hitLocationId, step.hitRegionId);
      return { step, label: current.attack.label, summary: location.label + " | RoF " + step.shots };
    }));
    const app = new TrademarkMoveExecutionApp({
      slots, rangeBands: getRangeBands(),
      calculatePreviews: async situation => {
        const latest = await loadState();
        const weapons = trademarkWeapons(latest);
        const rangeBands = getRangeBands();
        return Promise.all(slots.map(async slot => {
          try {
            const current = weapons.find(entry => entry.weapon.id === slot.step.weaponId);
            if (!current) return null;
            const values = getTrademarkExecutionOptions(slot.step, situation, rangeBands);
            const targetingService = await TargetingService.create({
              attack: current.attack, bodyplan: slot.step.bodyplanId
            });
            return getTrademarkMoveSkillPreview({
              attack: current.attack, values, rangeBands, targetingService,
              targetedAttackContext: createTargetedAttackContext({ actor, attack: current.attack }),
              calculateSkillDetails: calculateEffectiveFireSkillDetails
            });
          } catch (_error) { return null; }
        }));
      },
      readTargetRangeContext: () => {
        const targets = [...(game.user?.targets ?? [])];
        return targets.length === 1 ? getTokenFireRangeContext({
          sourceToken: token, targetToken: targets[0], rangeBands: getRangeBands()
        }) : null;
      },
      execute: async (step, situation, expectedEffectiveSkill) => {
        const latest = await loadState();
        await validateTrademarkSteps([step], latest);
        const rangeBands = getRangeBands();
        const options = getTrademarkExecutionOptions(step, situation, rangeBands);
        const current = trademarkWeapons(latest).find(entry => entry.weapon.id === step.weaponId);
        const targeting = await TargetingService.create({ attack: current.attack, bodyplan: step.bodyplanId });
        TARGETED_ATTACK_CONTEXTS.set(targeting, createTargetedAttackContext({ actor, attack: current.attack }));
        const done = await fireAndRoll(latest, step.weaponId, options, targeting, true, null, expectedEffectiveSkill);
        if (done && managerApp?.rendered) {
          managerApp.setManagerState(await loadState());
          await managerApp.refreshContent();
        }
        return done;
      }
    }, { id: "olegurps-trademark-move-execution-" + actor.id });
    await app.render({ force: true });
    return app;
  }
  function specialFireRegistry(state, weaponId, managerApp) {
    const context = () => {
      const latest = actor.getFlag("world", "gurpsAmmoManager") ?? state;
      const weapon = latest.weapons?.find(entry => entry.id === weaponId);
      const attack = weapon ? resolveAttack(weapon.attackRef, getRangedAttacks(latest)) : null;
      const owner = getSpecialFireOwner({ token, actor });
      const suppression = weapon && attack ? new SuppressionFireSessionService({ token, actor, weapon, attack }).findExisting() : null;
      const spraying = weapon && attack ? new SprayingFireSessionService({ token, actor, weapon, attack }).findExisting() : null;
      return { weapon, attack, owner, suppression, spraying };
    };
    const availability = (type, check) => {
      const current = context();
      if (!token || !canvas?.tokens?.get?.(token.id)) return { available: false, reason: "\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0442\u043e\u043a\u0435\u043d\u0430 \u0441\u0442\u0440\u0435\u043b\u043a\u0430" };
      if (!actor || !current.weapon || !current.attack) return {
        available: false, reason: "\u041d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u043e \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0435\u0435 \u043e\u0440\u0443\u0436\u0438\u0435"
      };
      const own = type === "suppression" ? current.suppression : current.spraying;
      if (current.owner && !own) return {
        available: false, reason: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0438\u043b\u0438 \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043c \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b"
      };
      if (own) return { available: true, reason: null };
      const capacity = check(current);
      return { available: capacity.eligible, reason: capacity.reason };
    };
    return [
      {
        id: "suppression", label: "Suppression Fire (\u0422\u043e\u0442\u0430\u043b\u044c\u043d\u0430\u044f \u0430\u0442\u0430\u043a\u0430)",
        description: "\u041f\u043e\u0434\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043e\u0433\u043e\u043d\u044c",
        icon: "fa-solid fa-burst", sessionType: "suppressionFireSessions",
        hasSession: () => !!context().suppression,
        availability: () => availability("suppression", current => {
          const result = getSuppressionFireCapacity({
            profile: fireService.parseRateOfFire(current.attack.rof),
            loaded: current.weapon.magazines[current.weapon.loadedIndex],
            totalAmmo: current.weapon.totalAmmo
          });
          return { ...result, reason: result.eligible ? null :
            result.fullRoF < 5
              ? "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u044b\u0439 RoF: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f 5+"
              : "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0431\u043e\u0435\u043f\u0440\u0438\u043f\u0430\u0441\u043e\u0432" };
        }),
        open: () => openSuppressionFire(state, weaponId, managerApp)
      },
      {
        id: "spraying", label: "Стрельба с переносом огня",
        description: "\u041f\u0435\u0440\u0435\u043d\u043e\u0441 \u043e\u0433\u043d\u044f \u043f\u043e \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u0438\u043c \u0446\u0435\u043b\u044f\u043c",
        icon: "fa-solid fa-arrows-left-right", sessionType: "sprayingFireSessions",
        hasSession: () => !!context().spraying,
        availability: () => availability("spraying", current => sprayingCapacity(
          fireService.parseRateOfFire(current.attack.rof),
          current.weapon.magazines[current.weapon.loadedIndex], current.weapon.totalAmmo
        )),
        open: () => openSprayingFire(state, weaponId, managerApp)
      },
      {
        id: "visibility", label: "\u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u0430\u044f \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c",
        description: "Shooting Blind / \u043d\u0435\u0432\u0438\u0434\u0438\u043c\u0430\u044f \u0446\u0435\u043b\u044c",
        icon: "fa-solid fa-eye-slash",
        hasSession: () => false,
        availability: () => {
          const current = context();
          if (!token || !canvas?.tokens?.get?.(token.id) || !current.weapon || !current.attack)
            return { available: false, reason: "\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u043e\u0440\u0443\u0436\u0438\u044f" };
          return { available: true, reason: null };
        },
        open: () => openFirePreparation(state, weaponId, managerApp, { mode: "partial", partialPenalty: -1 })
      },
      ...(hasTrademarkMovePerk(actor) ? [{
        id: "trademark-move", label: "Фирменный приём", description: "Сохранённая последовательность дистанционных атак",
        icon: "fa-solid fa-star", showSavedSuffix: false,
        hasSession: () => !!savedTrademarkMove(),
        availability: () => ({ available: !!canvas?.tokens?.get?.(token.id), reason: "No active shooter token" }),
        open: () => openTrademarkExecution(managerApp), edit: () => openTrademarkEditor()
      }] : [])
    ];
  }

  async function openSpecialFireMenu(state, weaponId, managerApp) {
    const configuredWeapon = state.weapons?.find(entry => entry.id === weaponId);
    if (configuredWeapon) {
      await new SprayingFireSessionService({ token, actor, weapon: configuredWeapon })
        .discardUnconfirmed();
    }
    const key = (canvas?.scene?.id ?? "scene") + ":" + token.id + ":" + weaponId;
    const open = OPEN_SPECIAL_FIRE_MENUS.get(key);
    if (open?.rendered) { open.bringToTop(); return open; }
    const app = new SpecialFireMenuApp({
      registry: specialFireRegistry(state, weaponId, managerApp),
      onClose: () => OPEN_SPECIAL_FIRE_MENUS.delete(key)
    }, { id: "olegurps-special-fire-menu-" + token.id + "-" + weaponId });
    OPEN_SPECIAL_FIRE_MENUS.set(key, app);
    try { await app.render({ force: true }); return app; }
    catch (error) { OPEN_SPECIAL_FIRE_MENUS.delete(key); throw error; }
  }
  function buildManagerCards(state, weaponIds = null) {
    const attacks = state.weapons.some(w=>!w.standaloneWeaponId&&(!weaponIds||weaponIds.includes(w.id)))?getRangedAttacks(state):[];

    const cards = state.weapons.length
      ? uawManagerWeapons(state)
          .filter(weapon => !weaponIds || weaponIds.includes(weapon.id))
          .map(weapon => {
            normalizeWeaponShape(weapon);
            const attack = weapon.standaloneWeaponId ? withRuntimeAmmoStats(readStandaloneAttack(actor, weapon.standaloneWeaponId, weapon.standaloneModeId),actor,state) : resolveAttack(weapon.attackRef, attacks);
            const loaded = weapon.ammunitionReview ? 0 : weapon.magazines[weapon.loadedIndex] ?? 0;
            const broken = !attack;
            const beam=beamWeapon(weapon);
            if(beam&&!beam.oneShot)selectedBatteries.add(weapon.id);
            const batterySelected = weaponResourceProfile(weapon) && selectedBatteries.has(weapon.id);
            const powerReason = weaponPowerReason(weapon);

            const levelText = attack?.level > 0 ? `Навык ${attack.level}` : "Навык не указан";
            const rofText = attack?.rof ? `RoF ${escapeHTML(attack.rof)}` : "RoF не указан";
            const rclText = attack?.rcl ? `Rcl ${escapeHTML(attack.rcl)}` : "Rcl не указан";
            const accText = Number.isFinite(Number(attack?.acc)) ? `Acc ${attack.acc}` : "Acc \u2014";
            const scopeText = `\u041f\u0440\u0438\u0446\u0435\u043b ${Math.max(0, Math.trunc(Number(attack?.scopeBonus) || 0))}`;
            const bulkValue = attack?.data?.bulk ?? attack?.bulk;
            const bulkText = parseWeaponBulk(bulkValue) ? `Bulk ${bulkValue}` : "Bulk \u2014";

            return `
              <section class="gam-card ${broken ? "broken" : ""}" data-weapon-card="${weapon.id}">
                <div class="gam-card-head">
                  <div class="gam-card-info">
                    <h3>${escapeHTML(weapon.name)}</h3>
                    <div class="gam-sub">
                      ${weapon.standaloneWeaponId ? escapeHTML(attack?.readinessReason ?? attack?.skillDescription ?? standaloneText("Pending")) : broken ? "Связанная дистанционная атака не найдена" : levelText}
                    </div>
                    <div class="gam-sub">
                      ${beam?'':renderAmmunitionSummary(actor, weapon, escapeHTML,attack?.ammunitionDisplay)}
                    </div>
                    <div class="gam-sub gam-weapon-stats" data-current-weapon-stats>${[
                      escapeHTML((attack?.ammunitionDisplay??attackProfilePresentation(null)).damageText),
                      beamResourceLabel(weapon)??`магазин ${loaded}/${weapon.capacity}`,rofText,accText,scopeText,bulkText,rclText].join(' · ')}</div>
                  </div>
                  ${weaponResourceHTML(weapon,batterySelected,escapeHTML)}
                </div>

                ${beam?'':`<div class="${uawGroup(weapon)?'gam-uaw-feeds':'gam-magazines'}">${renderMagazineBadges(weapon,state)}</div>`}

                <div class="gam-actions">
                  ${weapon.standaloneWeaponId && lematBarrel(weapon.standaloneModeId) ? `<strong>${escapeHTML(attack?.data?.mode ?? "")}</strong><p class="hint">${escapeHTML(automaticAmmoText("BarrelSwitchReadyGM", globalThis.game?.i18n?.lang))}</p>` : weapon.standaloneWeaponId&&!uawGroup(weapon) ? `<select data-standalone-mode="${escapeHTML(weapon.id)}" aria-label="Режим атаки">${new StandaloneWeaponService(actor).get(weapon.standaloneWeaponId)?.modes.map(m => `<option value="${escapeHTML(m.modeId)}" ${m.modeId === weapon.standaloneModeId ? "selected" : ""}>${escapeHTML(m.snapshot.usage ?? "Основной режим")}</option>`).join("") ?? ""}</select>` : ""}
                  <button type="button" data-ammo-action="fire-roll" data-weapon-id="${weapon.id}" title="${escapeHTML(powerReason ?? attack?.readinessReason ?? '')}" ${broken || powerReason || attack?.readinessReason || standaloneAvailableRounds(weapon) <= 0 ? "disabled" : ""}>
                    <i class="fa-solid fa-crosshairs"></i>
                    Огонь
                  </button>

                  <button type="button" data-ammo-action="special-fire-modes" data-weapon-id="${weapon.id}" ${beam||weapon.standaloneWeaponId && standaloneAvailableRounds(weapon) === Infinity ? "disabled" : ""}>
                    <i class="fa-solid fa-burst"></i>
                    \u0420\u0435\u0436\u0438\u043c\u044b \u0441\u0442\u0440\u0435\u043b\u044c\u0431\u044b
                  </button>

                  <button type="button" data-ammo-action="spend" data-weapon-id="${weapon.id}" ${(batterySelected ? lpProfile(weapon)?readLPFuel(weapon)?.remainingUnits??0:readWeaponBattery(weapon)?.charge ?? 0 : loaded) <= 0 ? "disabled" : ""}>
                    <i class="fa-solid fa-minus"></i>
                    Списать
                  </button>

                  <button type="button" data-ammo-action="${batterySelected?'replace-battery':'manage-load'}" data-weapon-id="${weapon.id}" ${beam?.oneShot||batterySelected&&batteryReplacements.has(weapon.id)?'disabled':''}>
                    <i class="fa-solid fa-box-open"></i>
                    ${escapeHTML(beam?.oneShot?'Заряд одноразовый':beam?.chemical?beam.modeId==='WY4jJpxSq5uG4KNl2'?'Заменить бак':'Заменить ранец':batterySelected ? lpProfile(weapon)?lpText('Replace'):batteryText('Replace') : ammoWindowText("Title"))}
                  </button>

                  <button type="button" data-ammo-action="edit" data-weapon-id="${weapon.id}">
                    <i class="fa-solid fa-gear"></i>
                    Настроить
                  </button>

                  <button
                    type="button"
                    class="gam-action-remove"
                    data-ammo-action="remove"
                    data-weapon-id="${weapon.id}"
                    title="Удалить оружие"
                    aria-label="Удалить оружие"
                  >
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </section>
            `;
          })
          .join("")
      : `
        <div class="gam-empty">
          Оружие ещё не настроено. Нажмите «Добавить оружие».
        </div>
      `;

    return cards;
  }

  function buildManagerContent(state, uiState = {}) {
    const cards = buildManagerCards(state);
    const modeText = state.chatSettings?.mode === "all" ? "для всех" : "только себе";

    return `
      <div class="gam-ammo-manager">
        <div class="gam-toolbar">
          <button type="button" data-ammo-action="add">
            <i class="fa-solid fa-plus"></i>
            Добавить оружие
          </button>

          <button type="button" data-ammo-action="chat-settings">
            <i class="fa-solid fa-comments"></i>
            Настройки чата: ${modeText}
          </button>

          <button type="button" data-ammo-action="refresh">
            <i class="fa-solid fa-arrows-rotate"></i>
            Обновить
          </button>
        </div>

        <div class="gam-result" data-ammo-result aria-live="polite">${escapeHTML(uiState.result ?? "")}</div>
        <div class="gam-weapon-list">${cards}</div>
      </div>
    `;
  }

  async function openManager() {
    const assistantKey = `${canvas?.scene?.id ?? "scene"}:${token.document?.id ?? token.id}`;
    const existing = OPEN_ASSISTANTS.get(assistantKey);
    if (existing?.rendered) {
      existing.bringToFront();
      return existing;
    }

    let persistentState = await loadState();
    await repairState(persistentState, true);
    const actionMessages = {
      spend: "Патроны списаны.",
      "select-magazine": "Магазин заменён.",
      "manage-load": "Состояние магазинов обновлено.",
      "top-up": "Магазины снаряжены.",
      unload: "Текущий магазин разряжен.",
      stock: "Общий боезапас обновлён.",
      magazines: "Состояние магазинов обновлено.",
      add: "Оружие добавлено.",
      edit: "Настройки оружия обновлены.",
      remove: "Настройки оружия удалены.",
      "chat-settings": "Настройки чата сохранены.",
      refresh: "Данные обновлены."
    };

    let actorHook = null;
    const app = new WeaponAssistantApp({
      token,
      managerState: persistentState,
      title: `Патроны — ${token.name}`,
      styles: MANAGER_CSS + PAINT_BATTERY_CSS,
      buildContent: buildManagerContent,
      buildWeaponCards: buildManagerCards,
      onClose: () => {
        OPEN_ASSISTANTS.delete(assistantKey);
        if (actorHook !== null) { Hooks.off("updateActor", actorHook); actorHook = null; }
      },
      handleAction: async ({ action, weaponId, magazineIndex, app: managerApp }) => {
        if (action === 'replace-battery') {
          if (!selectedBatteries.has(weaponId) || batteryReplacements.has(weaponId)) return {changed:false};
          batteryReplacements.add(weaponId);
          try {
            const fuel=lpProfile(actor.getFlag('world','gurpsAmmoManager')?.weapons?.find(w=>w.id===weaponId));
            const updated = await (fuel?confirmLPFuelReplacement:confirmBatteryReplacement)({actor,weaponId,ammoService});
            if (!updated) return {changed:false};
            persistentState = updated;
            return {changed:true,weaponIds:[weaponId],managerState:persistentState,message:fuel?lpText('Replaced'):batteryText('Replaced')};
          } finally {
            batteryReplacements.delete(weaponId);
            if (managerApp?.rendered) await managerApp.refreshContent({weaponIds:[weaponId]});
          }
        }
        if (action === 'select-battery') {
          if (!weaponResourceProfile(uawWeaponView(persistentState,persistentState.weapons.find(w=>w.id===weaponId)))) return {changed:false};
          if (selectedBatteries.has(weaponId)) return {changed:false};
          selectedBatteries.add(weaponId);
          return {changed:true,weaponIds:[weaponId],managerState:persistentState};
        }
        const batteryWasSelected = action === 'select-magazine' && selectedBatteries.delete(weaponId);
        const configured = persistentState.weapons.find(weapon => weapon.id === weaponId);
        const configurationOnly = configured?.ammoUnconfigured === true;
        if (configurationOnly && !selectedBatteries.has(weaponId) && !(configured?.standaloneWeaponId && action === "fire-roll") && ["fire-roll", "special-fire-modes", "spend", "select-magazine", "top-up", "unload"].includes(action)) {
          ui.notifications.warn(weaponText("NoMagazines"));
          return { changed: false, managerState: persistentState, message: "" };
        }
        if (action === "fire-roll") {
          await openFirePreparation(persistentState, weaponId, managerApp);
          return { changed: false, managerState: persistentState, message: "" };
        }
        if (action === "special-fire-modes") {
          await openSpecialFireMenu(persistentState, weaponId, managerApp);
          return { changed: false, managerState: persistentState, message: "" };
        }
        let changed = false;
        if (action === "add") changed = await configureWeapon(persistentState);
        else if (action === "edit") changed = await configureWeapon(persistentState, weaponId);
        else if (action === "remove") changed = await removeWeapon(persistentState, weaponId);
        else if (action === "spend") changed = await spendWithoutRoll(persistentState, weaponId);
        else if (action === "select-magazine") changed = await switchMagazine(persistentState, weaponId, magazineIndex, managerApp);
        else if (["manage-load", "top-up", "unload", "stock", "magazines"].includes(action)) {
          await openAmmoManagement({ actor, weaponId, onUpdate: async state => {
            persistentState = state;
            // The Actor hook already refreshes the manager once after the confirmed write.
            const reference = state.weapons.find(entry => entry.id === weaponId)?.attackRef;
            if (reference) await refreshAttackOverrideConsumers(state, reference, { refreshAssistants: false });
          } });
        }
        else if (action === "chat-settings") changed = await openChatSettings(persistentState);
        else if (action === "refresh") {
          persistentState = await loadState();
          await repairState(persistentState, true);
          changed = true;
        }
        return {
          changed: changed || batteryWasSelected,
          weaponIds: ['select-magazine','spend'].includes(action) ? [weaponId] : null,
          managerState: persistentState,
          message: changed ? action==='spend' && selectedBatteries.has(weaponId) ? lpProfile(persistentState.weapons.find(w=>w.id===weaponId))?lpText('Spent'):moduleText('OleGURPS.PaintBattery.Spent') : actionMessages[action] ?? "" : ""
        };
      }
    });

    OPEN_ASSISTANTS.set(assistantKey, app);
    await app.render({ force: true });
    app.element.addEventListener("change", async event => {
      const id = event.target?.dataset?.standaloneMode;
      if (!id) return;
      const current = await loadState(), weapon = current.weapons.find(w => w.id === id);
      if (lematBarrel(weapon?.standaloneModeId)||uawGroup(weapon)) return;
      if (!weapon || !readStandaloneAttack(actor, weapon.standaloneWeaponId, event.target.value)) return;
      weapon.standaloneModeId = event.target.value;
      await saveState(current);
      persistentState = current;
      app.setManagerState(current);
      await app.refreshContent();
    });
    actorHook = Hooks.on("updateActor", async (updatedActor, changes) => {
      if (updatedActor.id !== actor.id || !app.rendered) return;
      try {
        const previous = structuredClone(app.managerState);
        persistentState = await loadState();
        if (!app.rendered) return;
        app.setManagerState(persistentState);
        await app.refreshContent({weaponIds:changedAmmunitionCards(previous,persistentState,changes ?? {})});
      } catch (error) { console.error("OleGURPS ammunition indicators refresh", error); }
    });
    return app;
  }

  await openManager();

}
