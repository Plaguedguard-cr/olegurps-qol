import { createFireControlContext } from "./fire-control-context.js";
import { WeaponAssistantApp } from "./weapon-assistant-app.js";
import { FirePreparationApp } from "./fire-preparation-app.js";
import { FireService } from "./fire-service.js";
import { AmmoService } from "./ammo-service.js";
import { TargetingService } from "./targeting-service.js";
import { createTargetedAttackContext } from "./targeted-attack-service.js";
import {
  isBeamWeapon,
  parseElevationHeight,
  resolveEffectiveRange
} from "./fire-range-service.js";

const OPEN_ASSISTANTS = new Map();
const OPEN_FIRE_PREPARATIONS = new Map();
const TARGETED_ATTACK_CONTEXTS = new WeakMap();

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
  const { getRangeBands, getGgaTargetRangeRecommendation, getFireModeState,
    getTaggedModifierSettings, calculateEffectiveFireSkill } = createFireControlContext({ token, fireService });
  const ammoService = new AmmoService(actor);

  const MANAGER_CSS = `
    .gam-ammo-manager {
      display: block !important;
      width: 100% !important;
      max-height: 72vh;
      overflow-y: auto;
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

    .gam-loaded {
      display: block !important;
      flex: 0 0 auto !important;
      min-width: 72px !important;
      margin: 0 !important;
      padding: 5px 8px !important;
      border-radius: 5px;
      text-align: center !important;
      white-space: nowrap !important;
      font-size: 1.16em !important;
      font-weight: 700 !important;
      color: #fff;
      background-color: hsl(var(--gam-loaded-hue, 0) 72% 23%);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
      transition: background-color 160ms ease;
    }

    .gam-mag.low {
      background: rgba(210, 150, 40, 0.2);
    }

    .gam-mag.empty {
      background: rgba(190, 60, 60, 0.18);
    }

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
      flex: 0 0 auto !important;
      width: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 3px 7px !important;
      border: 1px solid rgba(128, 128, 128, 0.34);
      border-radius: 999px;
      color: inherit;
      background: rgba(255, 255, 255, 0.025);
      white-space: nowrap !important;
      line-height: 1.2 !important;
      cursor: pointer;
    }

    .gam-mag:hover,
    .gam-mag:focus-visible {
      border-color: rgba(220, 210, 190, 0.72);
      background: rgba(255, 255, 255, 0.09);
    }

    .gam-mag.loaded {
      border-color: var(--color-border-highlight, #ff6400);
      box-shadow: inset 0 0 0 1px var(--color-border-highlight, #ff6400);
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

      .gam-loaded {
        align-self: flex-start !important;
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

  function getRangedAttacks() {
    const result = [];

    walkTree(actor.system?.ranged, "system.ranged", (attack, path) => {
      const name = String(attack.name ?? "Без названия").trim();
      const mode = String(attack.mode ?? "").trim();

      result.push({
        path,
        uuid: String(attack.uuid ?? ""),
        name,
        mode,
        level: clampInteger(attack.level, 0, 999),
        shots: String(attack.shots ?? "").trim(),
        rof: String(attack.rof ?? "").trim(),
        acc: fireService.normalizeAccuracy(attack.acc),
        rcl: String(attack.rcl ?? "").trim(),
        label: mode ? `${name} — ${mode}` : name,
        data: attack
      });
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

  function getWeaponContext(state, weaponId) {
    const weapon = state.weapons.find(entry => entry.id === weaponId);
    if (!weapon) {
      throw new Error("Оружие не найдено в настройках макроса.");
    }

    normalizeWeaponShape(weapon);
    return {
      weapon,
      attack: resolveAttack(weapon.attackRef)
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

  function getCloseDamageReport(attack, fireMode) {
    if (!fireMode?.extremelyClose || !Number.isInteger(fireMode.closeDamageMultiplier) || fireMode.closeDamageMultiplier < 1) {
      return null;
    }
    const source = getAttackDamageFormula(attack);
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
  function calculateHitsFromMargin(shots, rcl, margin) {
    return fireService.calculateHitsFromMargin(shots, rcl, margin);
  }
  function parseShotOptions(weapon, attack, values, rangeBands, targetingService, effectRangePenalty = null) {
    const loaded = weapon.magazines[weapon.loadedIndex];
    const shotLimits = getShotLimits(attack, loaded, values.rofMode);
    const shotsText = String(values.shots ?? "").trim();
    const manualText = String(values.manualModifier ?? "").trim();
    const shots = Number(shotsText.replace(",", "."));
    const manualModifier = manualText === "" ? 0 : Number(manualText.replace(",", "."));
    const aimSeconds = fireService.normalizeAimSeconds(values.aimSeconds);
    const braced = parseBoolean(values.braced);
    const moveAndAttack = parseBoolean(values.moveAndAttack);
    const { aimBonus, bracingBonus } = fireService.resolveAimedFireBonuses({
      accuracy: attack?.acc,
      aimSeconds,
      braced,
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
    const highGround = parseBoolean(values.highGround);
    const beamWeapon = isBeamWeapon(attack);
    const { effectiveRange, elevation } = resolveEffectiveRange({
      rangeBands,
      rangeIndex,
      height: values.height,
      highGround,
      beamWeapon
    });
    const hitLocation = targetingService?.getSelection(values.hitLocationId, values.hitRegionId);
    const targetedAttackContext = TARGETED_ATTACK_CONTEXTS.get(targetingService) ?? null;
    const targetedAttack = targetedAttackContext?.resolve({
      specialty: values.governingSpecialty,
      target: hitLocation?.zoneId,
      basePenalty: hitLocation?.penalty
    });
    const fireMode = getFireModeState(attack, values, rangeBands);
    const errors = [];

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
    if (targetedAttackContext?.requiresSelection &&
      !targetedAttackContext.specialtyOptions.some(option => option.value === values.governingSpecialty)) {
      errors.push("выберите governing Guns specialty");
    }
    if (errors.length > 0) {
      ui.notifications.error(`Ошибка заполнения: ${errors.join("; ")}.`);
      return null;
    }

    const effectiveSkill = calculateEffectiveFireSkill(attack, values, rangeBands, targetingService, targetedAttackContext);
    const rcl = fireService.parseAttackRcl(attack, { extremelyClose: fireMode.extremelyClose });
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
      rcl,
      aimSeconds,
      aimBonus,
      braced,
      bracingBonus,
      moveAndAttack,
      moveAttackPenalty,
      laserSight: parseBoolean(values.laserSight),
      manualModifier,
      height: elevationHeight,
      highGround,
      beamWeapon,
      effectiveDistance: elevation?.effectiveDistance ?? null,
      rangePenalty: (effectiveRange ?? rangeEntry).penalty,
      rangeLabel: (effectiveRange ?? rangeEntry).label,
      effectRangePenalty: Number.isFinite(effectRangePenalty) ? effectRangePenalty : null,
      hitLocationId: hitLocation.zoneId,
      hitRegionId: hitLocation.regionId,
      hitLocationLabel: hitLocation.label,
      hitLocationModifierLabel: targetedAttack ? `${hitLocation.modifierLabel} (TA)` : hitLocation.modifierLabel,
      hitLocationPenalty: targetedAttack?.effectivePenalty ?? hitLocation.penalty,
      randomHitLocation: hitLocation.random
    };
  }
  async function executeRangedAttack(attack, options) {
    return fireService.executeRangedAttack(attack, options);
  }
  function buildFireChatBody(state, payload) {
    const lines = [];

    if (shouldReportField(state, "ammoType")) {
      lines.push(
        `Тип боеприпасов: <strong>${escapeHTML(payload.ammoType)}</strong>`
      );
    }

    if (shouldReportField(state, "shots")) {
      lines.push(`Выстрелов: <strong>${payload.fired}</strong>`);
    }

    if (shouldReportField(state, "hits")) {
      const hitText = payload.hits === null
        ? `не удалось определить автоматически; Rcl: <strong>${payload.rcl}</strong>`
        : `попаданий: <strong>${payload.hits}</strong>; запас успеха: <strong>${payload.margin}</strong>; Rcl: <strong>${payload.rcl}</strong>`;
      lines.push(`Результат попаданий: <strong>${hitText}</strong>`);
    }

    if (payload.closeDamage) {
      const damage = payload.closeDamage.formula
        ? escapeHTML(payload.closeDamage.formula)
        : `${escapeHTML(payload.closeDamage.source || "не удалось определить")} ×${payload.closeDamage.multiplier}`;
      lines.push(`Урон: <strong>${damage}</strong>; DR: <strong>×${payload.closeDamage.multiplier}</strong>`);
    }

    if (payload.hitLocationText) {
      lines.push(`Зона попадания: <strong>${escapeHTML(payload.hitLocationText)}</strong>`);
    }

    if (shouldReportField(state, "loadedMagazine")) {
      lines.push(
        `Установленный магазин: <strong>${payload.loadedAfter}/${payload.capacity}</strong>`
      );
    }

    if (shouldReportField(state, "totalAmmo")) {
      lines.push(`Общий боезапас: <strong>${payload.totalAmmo}</strong>`);
    }

    return lines.join(".<br><br>");
  }

  async function fireAndRoll(state, weaponId, rawShotOptions, targetingService) {
    await repairState(state, false);

    const { weapon, attack } = getWeaponContext(state, weaponId);
    if (!attack) {
      throw new Error(
        `Для «${weapon.name}» больше не найдена связанная дистанционная атака.`
      );
    }

    const loaded = weapon.magazines[weapon.loadedIndex];
    if (loaded <= 0 || weapon.totalAmmo <= 0) {
      ui.notifications.warn(`«${weapon.name}»: установленный магазин пуст.`);
      return false;
    }

    const rangeBands = getRangeBands();
    const effectRangePenalty = getTaggedModifierSettings()?.autoAdd
      ? getGgaTargetRangeRecommendation(rangeBands)?.penalty ?? null
      : null;
    const shotOptions = parseShotOptions(weapon, attack, rawShotOptions, rangeBands, targetingService, effectRangePenalty);
    if (!shotOptions) return false;

    const result = await executeRangedAttack(attack, shotOptions);
    if (!result.rolled) {
      ui.notifications.warn(
        "Бросок атаки не был выполнен. Патроны не списаны."
      );
      return false;
    }

    const fired = Math.min(shotOptions.physicalShots, loaded, weapon.totalAmmo);
    weapon.magazines[weapon.loadedIndex] -= fired;
    weapon.totalAmmo -= fired;
    await saveState(state);

    const rcl = shotOptions.rcl;
    const margin = extractMarginFromRoll(result.rollData);
    const hits = calculateHitsFromMargin(shotOptions.effectiveRoF, rcl, margin);
    const closeDamage = getCloseDamageReport(attack, shotOptions);
    let hitLocationText = shotOptions.hitLocationLabel;
    if (shotOptions.randomHitLocation && hits > 0) {
      try {
        const randomLocation = await targetingService.resolveRandomHitLocation();
        hitLocationText = `Случайная зона: ${randomLocation.label} (3d6: ${randomLocation.total})`;
      } catch (error) {
        console.error("Не удалось определить случайную зону попадания:", error);
        ui.notifications.warn("Попадание подтверждено, но случайную зону определить не удалось.");
      }
    }

    const body = buildFireChatBody(state, {
      ammoType: weapon.ammoType,
      fired,
      hits,
      margin,
      rcl,
      closeDamage,
      hitLocationText,
      loadedAfter: weapon.magazines[weapon.loadedIndex],
      capacity: weapon.capacity,
      totalAmmo: weapon.totalAmmo
    });

    if (body) {
      await reportToChat(state, "fire", weapon.name, body);
    }

    return true;
  }

  async function spendWithoutRoll(state, weaponId) {
    await repairState(state, false);
    const { weapon } = getWeaponContext(state, weaponId);
    const loaded = weapon.magazines[weapon.loadedIndex];

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
    weapon.magazines[weapon.loadedIndex] -= fired;
    weapon.totalAmmo -= fired;
    await saveState(state);

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

  async function switchMagazine(state, weaponId, magazineIndex) {
    const { weapon } = getWeaponContext(state, weaponId);
    const newIndex = Number(magazineIndex);
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= weapon.magazines.length) {
      ui.notifications.error("Выбранный магазин больше недоступен.");
      return false;
    }
    if (newIndex === weapon.loadedIndex) return false;

    const oldIndex = weapon.loadedIndex;
    weapon.loadedIndex = newIndex;
    await saveState(state);

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

  function renderTopUpTargetOptions(weapon) {
    return [
      '<option value="all">Все магазины</option>',
      ...weapon.magazines.map((rounds, index) => {
        const loadedText = index === weapon.loadedIndex ? " — установлен" : "";
        return `<option value="${index}">Магазин ${index + 1}: ${rounds}/${weapon.capacity}${loadedText}</option>`;
      })
    ].join("");
  }

  async function topUpMagazines(state, weaponId, selectedTarget = null) {
    await repairState(state, false);
    const { weapon } = getWeaponContext(state, weaponId);
    const loose = looseAmmo(weapon);

    if (loose <= 0) {
      ui.notifications.warn(`Для «${weapon.ammoType}» нет свободных патронов вне магазинов.`);
      return false;
    }

    let target = selectedTarget === null ? null : String(selectedTarget);
    if (target === null) {
      const data = await DialogV2.input({
        window: { title: `Снаряжение магазинов: ${weapon.name}` },
        position: { width: 540 },
        content: `
          <div class="standard-form">
            <div class="form-group">
              <label><strong>Какие магазины снарядить</strong></label>
              <div class="form-fields">
                <select name="target">${renderTopUpTargetOptions(weapon)}</select>
              </div>
            </div>
            <p class="hint">Свободный запас: ${loose}. Общий боезапас не изменится.</p>
          </div>
        `,
        ok: { label: "Снарядить", icon: "fa-solid fa-box-open" },
        rejectClose: false,
        modal: true
      });
      if (!data) return false;
      const values = data.object ?? data;
      target = String(values.target ?? "all");
    }
    let remaining = loose;
    let moved = 0;

    const fillIndex = index => {
      if (remaining <= 0) return;
      const need = Math.max(0, weapon.capacity - weapon.magazines[index]);
      const amount = Math.min(need, remaining);
      weapon.magazines[index] += amount;
      remaining -= amount;
      moved += amount;
    };

    if (target === "all") {
      fillIndex(weapon.loadedIndex);
      weapon.magazines.forEach((_rounds, index) => {
        if (index !== weapon.loadedIndex) fillIndex(index);
      });
    } else {
      fillIndex(clampInteger(target, 0, weapon.magazines.length - 1));
    }

    if (moved <= 0) {
      ui.notifications.warn("Выбранные магазины уже заполнены.");
      return false;
    }

    await saveState(state);

    await reportToChat(
      state,
      "topUp",
      weapon.name,
      `
        В магазины распределено патронов: <strong>${moved}</strong>.<br>
        Свободный запас: <strong>${remaining}</strong>
      `
    );

    return true;
  }

  async function unloadCurrentMagazine(state, weaponId) {
    const { weapon } = getWeaponContext(state, weaponId);
    const rounds = weapon.magazines[weapon.loadedIndex];

    if (rounds <= 0) {
      ui.notifications.warn("Установленный магазин уже пуст.");
      return false;
    }

    weapon.magazines[weapon.loadedIndex] = 0;
    await saveState(state);

    await reportToChat(
      state,
      "unload",
      weapon.name,
      `
        Из установленного магазина выгружено патронов: <strong>${rounds}</strong>.<br>
        Они возвращены в свободный запас
      `
    );

    return true;
  }

  async function manageMagazineLoad(state, weaponId) {
    const { weapon } = getWeaponContext(state, weaponId);
    const canTopUp = looseAmmo(weapon) > 0;
    const canUnload = weapon.magazines[weapon.loadedIndex] > 0;
    if (!canTopUp && !canUnload) {
      ui.notifications.warn("Нет доступных действий для снаряжения или разряжания.");
      return false;
    }

    const readTarget = button => button.form?.elements?.target?.value ?? "all";
    const buttons = [
      canTopUp ? {
        action: "top-up",
        label: "Снарядить",
        icon: "fa-solid fa-box-open",
        default: true,
        callback: (_event, button) => ({ operation: "top-up", target: readTarget(button) })
      } : null,
      canUnload ? {
        action: "unload",
        label: "Разрядить",
        icon: "fa-solid fa-arrow-down",
        default: !canTopUp,
        callback: () => ({ operation: "unload" })
      } : null
    ].filter(Boolean);
    const decision = await DialogV2.wait({
      window: { title: `Снарядить / разрядить: ${weapon.name}` },
      position: { width: 540 },
      content: `
        <div class="standard-form">
          ${canTopUp ? `
            <div class="form-group">
              <label><strong>Какие магазины снарядить</strong></label>
              <div class="form-fields">
                <select name="target">${renderTopUpTargetOptions(weapon)}</select>
              </div>
            </div>
            <p class="hint">Свободный запас: ${looseAmmo(weapon)}. Общий боезапас не изменится.</p>
          ` : '<p class="hint">Свободных патронов для снаряжения нет.</p>'}
        </div>
      `,
      buttons,
      rejectClose: false,
      modal: true
    });
    if (!decision) return false;

    return decision.operation === "unload"
      ? unloadCurrentMagazine(state, weaponId)
      : topUpMagazines(state, weaponId, decision.target);
  }

  async function editAmmoStock(state, weaponId) {
    const { weapon } = getWeaponContext(state, weaponId);

    const data = await DialogV2.input({
      window: { title: `Боезапас: ${weapon.name}` },
      position: { width: 560 },
      content: `
        <style>
          .gam-stock-form { font-size: 0.92em; }
          .gam-stock-row {
            padding: 9px 2px;
            border-bottom: 1px solid rgba(128,128,128,0.28);
          }
          .gam-stock-row:first-child {
            border-top: 1px solid rgba(128,128,128,0.28);
          }
          .gam-stock-line {
            display: grid;
            grid-template-columns: minmax(210px, 1fr) minmax(180px, 250px);
            align-items: center;
            gap: 8px 14px;
          }
          .gam-stock-line input { width: 100%; margin: 0; }
          .gam-stock-row .hint { margin: 4px 0 0; }
        </style>

        <div class="standard-form gam-stock-form">
          <div class="gam-stock-row">
            <div class="gam-stock-line">
              <label><strong>Тип боеприпасов</strong></label>
              <input type="text" name="ammoType" value="${escapeHTML(weapon.ammoType)}" required autofocus>
            </div>
          </div>

          <div class="gam-stock-row">
            <div class="gam-stock-line">
              <label><strong>Общее количество патронов</strong></label>
              <input type="number" name="totalAmmo" value="${weapon.totalAmmo}" min="0" step="1" required>
            </div>
            <p class="hint">
              Это все патроны вместе: в магазинах и в свободном запасе
              Сейчас в магазинах: ${sumMagazines(weapon)}
              Свободно: ${looseAmmo(weapon)}
            </p>
          </div>
        </div>
      `,
      ok: { label: "Сохранить", icon: "fa-solid fa-floppy-disk" },
      rejectClose: false,
      modal: true
    });

    if (!data) return false;
    const values = data.object ?? data;
    const ammoType = String(values.ammoType ?? "").trim();
    const totalText = String(values.totalAmmo ?? "").trim();
    const totalAmmo = Number(totalText.replace(",", "."));

    if (!ammoType) {
      ui.notifications.error("Укажите тип боеприпасов.");
      return false;
    }

    if (totalText === "" || !Number.isInteger(totalAmmo) || totalAmmo < 0) {
      ui.notifications.error(
        "Общее количество патронов должно быть целым числом не меньше 0."
      );
      return false;
    }

    const oldTotal = weapon.totalAmmo;
    const oldType = weapon.ammoType;
    weapon.ammoType = ammoType;
    weapon.totalAmmo = totalAmmo;

    const removed = repairWeaponAmmo(weapon);
    await saveState(state);

    if (removed > 0) {
      ui.notifications.warn(
        `Из магазинов убрано ${removed} патронов, потому что общий боезапас был уменьшен.`
      );
    }

    await reportToChat(
      state,
      "stock",
      weapon.name,
      `
        Боезапас изменён: ${escapeHTML(oldType)} ${oldTotal} → <strong>${escapeHTML(weapon.ammoType)} ${weapon.totalAmmo}</strong>
      `
    );

    return true;
  }

  async function editMagazines(state, weaponId) {
    const { weapon } = getWeaponContext(state, weaponId);

    const rows = weapon.magazines
      .map((rounds, index) => {
        return `
          <div class="gam-mag-edit-row">
            <label for="gam-mag-${index}"><strong>Магазин ${index + 1}</strong></label>
            <input id="gam-mag-${index}" type="number" name="mag-${index}" value="${rounds}" min="0" max="${weapon.capacity}" step="1" required>
            <label class="gam-loaded-choice">
              <input type="radio" name="loadedIndex" value="${index}" ${index === weapon.loadedIndex ? "checked" : ""}>
              Установлен
            </label>
          </div>
        `;
      })
      .join("");

    const data = await DialogV2.input({
      window: { title: `Магазины: ${weapon.name}` },
      position: { width: 600 },
      content: `
        <style>
          .gam-mag-edit {
            max-height: 65vh;
            overflow-y: auto;
            font-size: 0.9em;
          }
          .gam-mag-edit-row {
            display: grid;
            grid-template-columns: 1fr 110px 125px;
            align-items: center;
            gap: 8px 12px;
            padding: 8px 2px;
            border-bottom: 1px solid rgba(128,128,128,0.28);
          }
          .gam-mag-edit-row:first-child {
            border-top: 1px solid rgba(128,128,128,0.28);
          }
          .gam-mag-edit-row input[type="number"] { width: 100%; margin: 0; }
          .gam-loaded-choice {
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 0;
          }
          .gam-loaded-choice input { width: auto; margin: 0; }
          .gam-mag-edit .hint { margin: 6px 2px 0; }
        </style>
        <div class="standard-form gam-mag-edit">
          ${rows}
          <p class="hint">
            Сумма патронов в магазинах не может превышать общий боезапас ${weapon.totalAmmo}
          </p>
        </div>
      `,
      ok: { label: "Сохранить", icon: "fa-solid fa-floppy-disk" },
      rejectClose: false,
      modal: true
    });

    if (!data) return false;
    const values = data.object ?? data;
    const magazines = weapon.magazines.map((_rounds, index) => {
      return clampInteger(values[`mag-${index}`], 0, weapon.capacity);
    });

    const allocated = magazines.reduce((sum, rounds) => sum + rounds, 0);
    if (allocated > weapon.totalAmmo) {
      ui.notifications.error(
        `В магазинах указано ${allocated} патронов, но общий боезапас равен ${weapon.totalAmmo}.`
      );
      return false;
    }

    weapon.magazines = magazines;
    weapon.loadedIndex = clampInteger(values.loadedIndex, 0, magazines.length - 1);
    await saveState(state);
    return true;
  }

  async function configureWeapon(state, existingId = null) {
    const attacks = getRangedAttacks();
    const existing = existingId
      ? state.weapons.find(weapon => weapon.id === existingId)
      : null;

    if (attacks.length === 0) {
      ui.notifications.warn(
        "На листе выбранного токена не найдено дистанционных атак."
      );
      return false;
    }

    const currentAttack = existing
      ? resolveAttack(existing.attackRef, attacks) ?? attacks[0]
      : attacks[0];

    const attackOptions = attacks
      .map(attack => {
        const selected = currentAttack?.path === attack.path ? "selected" : "";
        const details = [
          attack.level > 0 ? `навык ${attack.level}` : "",
          attack.rof ? `RoF ${attack.rof}` : "",
          attack.shots ? `Shots ${attack.shots}` : "",
          attack.rcl ? `Rcl ${attack.rcl}` : ""
        ]
          .filter(Boolean)
          .join(", ");

        return `
          <option value="${escapeHTML(attack.path)}" ${selected}>
            ${escapeHTML(attack.label)}${details ? ` — ${escapeHTML(details)}` : ""}
          </option>
        `;
      })
      .join("");

    const ammoTypeValue = existing ? escapeHTML(existing.ammoType) : "";
    const totalAmmoValue = existing ? String(existing.totalAmmo) : "";
    const capacityValue = existing ? String(existing.capacity) : "";
    const magazineCountValue = existing ? String(existing.magazines.length) : "";

    const data = await DialogV2.input({
      window: {
        title: existing ? `Настройка: ${existing.name}` : "Добавить оружие"
      },
      position: { width: 720 },
      content: `
        <style>
          .gam-config {
            max-height: 72vh;
            overflow-y: auto;
            padding: 0 8px 0 2px;
            font-size: 0.9em;
          }
          .gam-config-row {
            padding: 9px 3px;
            border-bottom: 1px solid rgba(128,128,128,0.3);
          }
          .gam-config-row:first-child {
            border-top: 1px solid rgba(128,128,128,0.3);
          }
          .gam-config-line {
            display: grid;
            grid-template-columns: minmax(225px, 1fr) minmax(280px, 360px);
            align-items: center;
            gap: 8px 14px;
          }
          .gam-config-label {
            margin: 0;
            font-weight: 700;
            line-height: 1.2;
          }
          .gam-config select,
          .gam-config input[type="text"],
          .gam-config input[type="number"] {
            width: 100%;
            margin: 0;
          }
          .gam-config-hint {
            margin: 4px 0 0;
            line-height: 1.22;
            opacity: 0.78;
          }
          .gam-config-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            cursor: pointer;
            font-weight: 700;
            line-height: 1.2;
          }
          .gam-config-checkbox input {
            flex: 0 0 auto;
            width: auto;
            margin: 0;
          }
          @media (max-width: 680px) {
            .gam-config-line { grid-template-columns: 1fr; }
          }
        </style>

        <div class="standard-form gam-config">
          <div class="gam-config-row">
            <div class="gam-config-line">
              <label class="gam-config-label" for="gam-attack-path">Дистанционная атака</label>
              <select id="gam-attack-path" name="attackPath">${attackOptions}</select>
            </div>
            <p class="gam-config-hint">
              Кнопка «Огонь» запускает эту дистанционную атаку из листа выбранного токена
            </p>
          </div>

          <div class="gam-config-row">
            <div class="gam-config-line">
              <label class="gam-config-label" for="gam-ammo-type">Тип боеприпасов</label>
              <input id="gam-ammo-type" type="text" name="ammoType" value="${ammoTypeValue}" placeholder="Например: 9×19 мм" required>
            </div>
          </div>

          <div class="gam-config-row">
            <div class="gam-config-line">
              <label class="gam-config-label" for="gam-total-ammo">Общее количество патронов</label>
              <input id="gam-total-ammo" type="number" name="totalAmmo" value="${totalAmmoValue}" placeholder="Например: 60" min="0" step="1" required>
            </div>
            <p class="gam-config-hint">
              Все патроны вместе: в магазинах и в свободном запасе
              Инвентарь персонажа не используется
            </p>
          </div>

          <div class="gam-config-row">
            <div class="gam-config-line">
              <label class="gam-config-label" for="gam-capacity">Ёмкость магазина</label>
              <input id="gam-capacity" type="number" name="capacity" value="${capacityValue}" placeholder="Например: 15" min="1" step="1" required>
            </div>
          </div>

          <div class="gam-config-row">
            <div class="gam-config-line">
              <label class="gam-config-label" for="gam-magazine-count">Магазинов всего</label>
              <input id="gam-magazine-count" type="number" name="magazineCount" value="${magazineCountValue}" placeholder="Например: 4" min="1" step="1" required>
            </div>
            <p class="gam-config-hint">
              Первый магазин считается установленным
              Остальные — запасными
            </p>
          </div>

          <div class="gam-config-row">
            <label class="gam-config-checkbox">
              <input type="checkbox" name="fillAvailable" ${existing ? "" : "checked"}>
              <span>Заполнить магазины доступными патронами</span>
            </label>
          </div>
        </div>
      `,
      ok: { label: "Сохранить", icon: "fa-solid fa-floppy-disk" },
      rejectClose: false,
      modal: true
    });

    if (!data) return false;
    const values = data.object ?? data;

    const attack = attacks.find(
      entry => entry.path === String(values.attackPath)
    );

    if (!attack) {
      throw new Error("Не удалось определить выбранную дистанционную атаку.");
    }

    const rawAmmoType = String(values.ammoType ?? "").trim();
    const rawTotalAmmo = String(values.totalAmmo ?? "").trim();
    const rawCapacity = String(values.capacity ?? "").trim();
    const rawMagazineCount = String(values.magazineCount ?? "").trim();

    const parsedTotalAmmo = Number(rawTotalAmmo.replace(",", "."));
    const parsedCapacity = Number(rawCapacity.replace(",", "."));
    const parsedMagazineCount = Number(rawMagazineCount.replace(",", "."));

    const errors = [];

    if (!rawAmmoType) errors.push("укажите тип боеприпасов");
    if (
      rawTotalAmmo === "" ||
      !Number.isInteger(parsedTotalAmmo) ||
      parsedTotalAmmo < 0
    ) {
      errors.push(
        "общее количество патронов должно быть целым числом не меньше 0"
      );
    }

    if (
      rawCapacity === "" ||
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1
    ) {
      errors.push("ёмкость магазина должна быть целым числом не меньше 1");
    }

    if (
      rawMagazineCount === "" ||
      !Number.isInteger(parsedMagazineCount) ||
      parsedMagazineCount < 1
    ) {
      errors.push(
        "количество магазинов должно быть целым числом не меньше 1"
      );
    }

    if (errors.length > 0) {
      ui.notifications.error(`Ошибка заполнения: ${errors.join("; ")}.`);
      return false;
    }

    const newCapacity = clampInteger(parsedCapacity, 1, 100000);
    const newMagazineCount = clampInteger(parsedMagazineCount, 1, 1000);
    const newTotalAmmo = clampInteger(parsedTotalAmmo, 0);
    const newAmmoType = rawAmmoType;
    const fillAvailable = parseBoolean(values.fillAvailable);

    let weapon = existing;

    if (!weapon) {
      weapon = {
        id: randomId(),
        name: attack.label,
        attackRef: makeAttackRef(attack),
        ammoType: newAmmoType,
        totalAmmo: newTotalAmmo,
        capacity: newCapacity,
        magazines: Array(newMagazineCount).fill(0),
        loadedIndex: 0
      };
      state.weapons.push(weapon);
    } else {
      weapon.name = attack.label;
      weapon.attackRef = makeAttackRef(attack);
      weapon.ammoType = newAmmoType;
      weapon.totalAmmo = newTotalAmmo;
      weapon.capacity = newCapacity;
      weapon.magazines = weapon.magazines
        .slice(0, newMagazineCount)
        .map(rounds => Math.min(newCapacity, clampInteger(rounds, 0)));

      while (weapon.magazines.length < newMagazineCount) {
        weapon.magazines.push(0);
      }

      weapon.loadedIndex = Math.min(
        weapon.loadedIndex,
        weapon.magazines.length - 1
      );
    }

    normalizeWeaponShape(weapon);
    repairWeaponAmmo(weapon);

    if (fillAvailable) {
      let loose = looseAmmo(weapon);
      const fill = index => {
        if (loose <= 0) return;
        const need = weapon.capacity - weapon.magazines[index];
        const amount = Math.min(need, loose);
        weapon.magazines[index] += amount;
        loose -= amount;
      };

      fill(weapon.loadedIndex);
      weapon.magazines.forEach((_rounds, index) => {
        if (index !== weapon.loadedIndex) fill(index);
      });
    }

    await saveState(state);
    return true;
  }

  async function removeWeapon(state, weaponId) {
    const weapon = state.weapons.find(entry => entry.id === weaponId);
    if (!weapon) return false;

    const confirmed = await DialogV2.confirm({
      window: { title: "Удалить настройку оружия" },
      content: `
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
            ${radioRow("self", "Только себе (self only)", settings.mode !== "all")}
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

  function renderMagazineBadges(weapon) {
    return weapon.magazines
      .map((rounds, index) => {
        const loaded = index === weapon.loadedIndex;
        const ratio = weapon.capacity > 0 ? rounds / weapon.capacity : 0;
        const className =
          rounds === 0 ? "empty" : ratio <= 0.25 ? "low" : "";

        return `
          <button
            type="button"
            class="gam-mag ${className} ${loaded ? "loaded" : ""}"
            data-ammo-action="select-magazine"
            data-weapon-id="${weapon.id}"
            data-magazine-index="${index}"
            aria-pressed="${loaded}"
            aria-label="${loaded ? "Установленный" : "Установить"} магазин ${index + 1}: ${rounds} из ${weapon.capacity}"
            title="${loaded ? "Установленный магазин" : `Установить магазин ${index + 1}`}"
          >
            ${loaded ? "● " : ""}${index + 1}: ${rounds}/${weapon.capacity}
          </button>
        `;
      })
      .join("");
  }

  function magazineLoadHue(currentAmmo, capacity) {
    const ratio = capacity > 0
      ? Math.min(1, Math.max(0, Number(currentAmmo) / Number(capacity)))
      : 0;
    return (ratio * 120).toFixed(2);
  }

  async function openFirePreparation(state, weaponId, managerApp) {
    await repairState(state, false);
    const { weapon, attack } = getWeaponContext(state, weaponId);
    if (!attack) {
      throw new Error(`Для «${weapon.name}» больше не найдена связанная дистанционная атака.`);
    }

    const loaded = weapon.magazines[weapon.loadedIndex];
    if (loaded <= 0 || weapon.totalAmmo <= 0) {
      ui.notifications.warn(`«${weapon.name}»: установленный магазин пуст.`);
      return null;
    }

    const preparationKey = `${canvas?.scene?.id ?? "scene"}:${token.document?.id ?? token.id}:${weapon.id}`;
    const existing = OPEN_FIRE_PREPARATIONS.get(preparationKey);
    if (existing?.rendered) {
      existing.bringToTop();
      return existing;
    }

    const rangeBands = getRangeBands();
    const recommendation = getGgaTargetRangeRecommendation(rangeBands);
    const targetingService = await TargetingService.create({ attack });
    const targetedAttackContext = createTargetedAttackContext({ actor, attack });
    TARGETED_ATTACK_CONTEXTS.set(targetingService, targetedAttackContext);
    const rateOfFireProfile = fireService.parseRateOfFire(attack.rof);
    const preparation = new FirePreparationApp({
      token,
      weapon,
      attack,
      rangeBands,
      recommendation,
      beamWeapon: isBeamWeapon(attack),
      targetingService,
      targetedAttackContext,
      initialGoverningSpecialty: weapon.governingSpecialty,
      maximumShots: getMaximumShots(attack, loaded),
      rateOfFireProfile,
      calculateShotLimits: modeIndex => getShotLimits(attack, loaded, modeIndex),
      calculateRapidFireBonus,
      calculateAimBonus: (aimSeconds, moveAndAttack) => fireService.resolveAimedFireBonuses({
        accuracy: attack.acc, aimSeconds, moveAndAttack
      }).aimBonus,
      calculateBracingBonus: (braced, aimSeconds, moveAndAttack) => fireService.resolveAimedFireBonuses({
        accuracy: attack.acc, aimSeconds, braced, moveAndAttack
      }).bracingBonus,
      calculateFireMode: shotOptions => getFireModeState(attack, shotOptions, rangeBands),
      calculateEffectiveSkill: shotOptions => calculateEffectiveFireSkill(
        attack, shotOptions, rangeBands, targetingService, targetedAttackContext),
      onGoverningSpecialtyChange: async specialty => {
        if (specialty) weapon.governingSpecialty = specialty;
        else delete weapon.governingSpecialty;
        await saveState(state);
      },
      onClose: () => OPEN_FIRE_PREPARATIONS.delete(preparationKey),
      onConfirm: async rawShotOptions => {
        const changed = await fireAndRoll(state, weaponId, rawShotOptions, targetingService);
        if (!changed) return false;
        if (managerApp?.rendered) {
          managerApp.setManagerState(state);
          managerApp.setResult("Бросок выполнен, боезапас обновлён.");
          try {
            await managerApp.refreshContent();
          } catch (error) {
            console.error("Не удалось обновить Shooting Assistant после выстрела:", error);
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

  function buildManagerContent(state, uiState = {}) {
    const attacks = getRangedAttacks();

    const cards = state.weapons.length
      ? state.weapons
          .map(weapon => {
            normalizeWeaponShape(weapon);
            const attack = resolveAttack(weapon.attackRef, attacks);
            const loaded = weapon.magazines[weapon.loadedIndex];
            const loose = looseAmmo(weapon);
            const broken = !attack;
            const loadedHue = magazineLoadHue(loaded, weapon.capacity);

            const levelText = attack?.level > 0 ? `Навык ${attack.level}` : "Навык не указан";
            const rofText = attack?.rof ? `RoF ${escapeHTML(attack.rof)}` : "RoF не указан";
            const rclText = attack?.rcl ? `Rcl ${escapeHTML(attack.rcl)}` : "Rcl не указан";

            return `
              <section class="gam-card ${broken ? "broken" : ""}" data-weapon-card="${weapon.id}">
                <div class="gam-card-head">
                  <div class="gam-card-info">
                    <h3>${escapeHTML(weapon.name)}</h3>
                    <div class="gam-sub">
                      ${broken ? "Связанная дистанционная атака не найдена" : `${levelText} · ${rofText} · ${rclText}`}
                    </div>
                    <div class="gam-sub">
                      <strong>${escapeHTML(weapon.ammoType)}</strong>: всего ${weapon.totalAmmo}, свободно ${loose}
                    </div>
                  </div>

                  <div class="gam-loaded" style="--gam-loaded-hue:${loadedHue}">
                    ${loaded}/${weapon.capacity}
                  </div>
                </div>

                <div class="gam-magazines">${renderMagazineBadges(weapon)}</div>

                <div class="gam-actions">
                  <button type="button" data-ammo-action="fire-roll" data-weapon-id="${weapon.id}" ${broken || loaded <= 0 ? "disabled" : ""}>
                    <i class="fa-solid fa-crosshairs"></i>
                    Огонь
                  </button>

                  <button type="button" data-ammo-action="spend" data-weapon-id="${weapon.id}" ${loaded <= 0 ? "disabled" : ""}>
                    <i class="fa-solid fa-minus"></i>
                    Списать
                  </button>

                  <button type="button" data-ammo-action="manage-load" data-weapon-id="${weapon.id}" ${loose <= 0 && loaded <= 0 ? "disabled" : ""}>
                    <i class="fa-solid fa-box-open"></i>
                    Снарядить / Разрядить
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

    const modeText = state.chatSettings?.mode === "all" ? "для всех" : "self only";

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
      existing.bringToTop();
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

    const app = new WeaponAssistantApp({
      token,
      managerState: persistentState,
      title: `Патроны — ${token.name}`,
      styles: MANAGER_CSS,
      buildContent: buildManagerContent,
      onClose: () => OPEN_ASSISTANTS.delete(assistantKey),
      handleAction: async ({ action, weaponId, magazineIndex, app: managerApp }) => {
        if (action === "fire-roll") {
          await openFirePreparation(persistentState, weaponId, managerApp);
          return { changed: false, managerState: persistentState, message: "" };
        }
        let changed = false;
        if (action === "add") changed = await configureWeapon(persistentState);
        else if (action === "edit") changed = await configureWeapon(persistentState, weaponId);
        else if (action === "remove") changed = await removeWeapon(persistentState, weaponId);
        else if (action === "spend") changed = await spendWithoutRoll(persistentState, weaponId);
        else if (action === "select-magazine") changed = await switchMagazine(persistentState, weaponId, magazineIndex);
        else if (action === "manage-load") changed = await manageMagazineLoad(persistentState, weaponId);
        else if (action === "top-up") changed = await topUpMagazines(persistentState, weaponId);
        else if (action === "unload") changed = await unloadCurrentMagazine(persistentState, weaponId);
        else if (action === "stock") changed = await editAmmoStock(persistentState, weaponId);
        else if (action === "magazines") changed = await editMagazines(persistentState, weaponId);
        else if (action === "chat-settings") changed = await openChatSettings(persistentState);
        else if (action === "refresh") {
          persistentState = await loadState();
          await repairState(persistentState, true);
          changed = true;
        }
        return {
          changed,
          managerState: persistentState,
          message: changed ? actionMessages[action] ?? "" : ""
        };
      }
    });

    OPEN_ASSISTANTS.set(assistantKey, app);
    await app.render({ force: true });
    return app;
  }

  await openManager();

}
