import {grenadeDisplayName,grenadeDisplayProfile} from './ut-nomenclature.js';
import { moduleMessage } from "../localization.js";
import { explosiveText } from "./explosive-ammunition-localization.js";
import {mountGrenadeEffectCalculator} from './grenade-effect-ui.js';

const PREFERENCE_SCOPE = 'olegurps-qol';
const PREFERENCE_KEY = 'explosionFragmentation';
const preferenceWrites = new WeakMap();
let activeExplosionDialog = null;
const DEFAULT_PREFERENCES = Object.freeze({ explosionDamage: '6d', fragmentDamage: '2d',
  distance: '1', sm: '0', posture: 'standing', followUp: false, autoLocations: false });

export function normalizeExplosionPreferences(value = {}) {
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of ['explosionDamage', 'fragmentDamage', 'distance', 'sm']) {
    if (typeof value?.[key] === 'string' || (typeof value?.[key] === 'number' && Number.isFinite(value[key]))) {
      result[key] = String(value[key]);
    }
  }
  if (Object.hasOwn(FRAGMENT_POSTURES, value?.posture)) result.posture = value.posture;
  for (const key of ['followUp', 'autoLocations']) result[key] = value?.[key] === true;
  return result;
}

export function readExplosionPreferences(user = globalThis.game?.user) {
  return normalizeExplosionPreferences(user?.getFlag(PREFERENCE_SCOPE, PREFERENCE_KEY));
}

export function readExplosionFormPreferences(root) {
  return Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(key => {
    const input = root.querySelector(`[name="${key}"]`);
    return [key, typeof DEFAULT_PREFERENCES[key] === 'boolean' ? input?.checked === true : input?.value ?? DEFAULT_PREFERENCES[key]];
  }));
}

export function saveExplosionPreferences(values, user = globalThis.game?.user) {
  const snapshot = normalizeExplosionPreferences(values);
  const previous = preferenceWrites.get(user) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => user.setFlag(PREFERENCE_SCOPE, PREFERENCE_KEY, snapshot));
  preferenceWrites.set(user, next);
  return next;
}
export function fragmentHitCount({ total, skill, inRange = true, followUp = false }) {
  const success = inRange && Number.isFinite(total) && (total <= 4 || (total < 17 && total <= skill));
  const ordinary = success ? 1 + Math.floor(Math.max(0, skill - total) / 3) : 0;
  // The ordinary result already includes its first hit. Follow-Up guarantees that slot once.
  return followUp ? Math.max(1, ordinary) : ordinary;
}
export function parseFragmentDamage(raw) {
  let text = String(raw ?? "")
    .trim()
    .replace(/[\[\]]/g, "")
    .replace(/\s+/g, "")
    .replace(/[×*]/g, "x")
    .toLowerCase()
    .replace(/[кk]/g, "d");

  if (!text) return null;

  // Поддержка: d/к, 2d/2к, 2d6/2к6, 3d+1/3к+1, 4d-2, 6d×2 / 6к×2 / 6d*2 / 6к*2.
  const match = text.match(/^(\d*)d(?:6)?([+-]\d+)?(?:x(\d+(?:[.,]\d+)?))?$/i);
  if (!match) return null;

  const dice = match[1] ? Number(match[1]) : 1;
  const adds = match[2] ? Number(match[2]) : 0;
  const multiplier = match[3]
    ? Number(String(match[3]).replace(",", "."))
    : 1;

  if (
    !Number.isInteger(dice) ||
    dice <= 0 ||
    !Number.isInteger(adds) ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    return null;
  }

  const baseFormula = `${dice}d6${adds > 0 ? `+${adds}` : adds < 0 ? adds : ""}`;
  const formula = multiplier === 1
    ? baseFormula
    : `(${baseFormula})*${multiplier}`;

  const pretty = `${dice}d${adds > 0 ? `+${adds}` : adds < 0 ? adds : ""}${
    multiplier === 1 ? "" : `×${multiplier}`
  }`;

  return {
    dice,
    adds,
    multiplier,
    effectiveDice: dice * multiplier,
    formula,
    pretty
  };
}

const RANGE_TABLE = [
  [2, 0],
  [3, -1],
  [5, -2],
  [7, -3],
  [10, -4],
  [15, -5],
  [20, -6],
  [30, -7],
  [50, -8],
  [70, -9],
  [100, -10],
  [150, -11],
  [200, -12],
  [300, -13],
  [500, -14],
  [700, -15],
  [1000, -16],
  [1500, -17],
  [2000, -18],
  [3000, -19],
  [5000, -20],
  [7000, -21],
  [10000, -22],
  [15000, -23],
  [20000, -24],
  [30000, -25],
  [50000, -26],
  [70000, -27],
  [100000, -28]
];

export function fragmentRangeModifier(distance) {
  const d = Math.max(0, Number(distance) || 0);
  if (d <= 2) return 0;

  for (const [maxDistance, modifier] of RANGE_TABLE) {
    if (d <= maxDistance) return modifier;
  }

  // Продолжаем обычную последовательность 1-1.5-2-3-5-7 × 10^n.
  // Для дистанций за пределами таблицы этого макроса — безопасная аппроксимация.
  let threshold = 100000;
  let modifier = -28;
  const multipliers = [1.5, 2, 3, 5, 7, 10];
  let decade = 10000;

  while (threshold < d && modifier > -100) {
    decade *= 10;
    for (const factor of multipliers) {
      threshold = decade * factor;
      modifier -= 1;
      if (d <= threshold) return modifier;
    }
  }

  return modifier;
}

export const FRAGMENT_POSTURES = {
  standing: { label: "Стоя", modifier: 0 },
  crouching: { label: "Пригнувшись", modifier: -2 },
  kneeling: { label: "На коленях", modifier: -2 },
  crawling: { label: "Ползком", modifier: -2 },
  sitting: { label: "Сидя", modifier: -2 },
  lying: { label: "Лёжа", modifier: -2 }
};

export function fragmentTargetProfile({ damage, distance, sm, postureModifier, coverModifier = 0 }) {
  const dangerRadius = 5 * damage.effectiveDice;
  const rangeMod = fragmentRangeModifier(distance);
  const effectiveSkill = 15 + rangeMod + postureModifier + sm + coverModifier;
  return { dangerRadius, rangeMod, effectiveSkill };
}

// Shared B414–415 calculation, also used by manually placed mines.
export function explosionTargetDamage({damage,total,distance,environment='normal'}) {
  if(!damage||!Number.isFinite(total)||!Number.isFinite(distance)||distance<0)throw Error('Некорректные параметры взрыва.');
  const factor={normal:3,trace:10,vacuum:10,water:1}[environment];
  if(!factor)throw Error('Укажите среду взрыва.');
  const radius=2*damage.effectiveDice,divisor=distance===0?1:factor*distance;
  return {radius,divisor,value:distance>radius?0:Math.max(0,Math.floor(total/divisor))};
}

export async function openExplosionFragmentation({token=null}={}) {
  if(activeExplosionDialog?.rendered){await activeExplosionDialog.grenades?.setToken(token);activeExplosionDialog.bringToFront();return activeExplosionDialog;}
  const DialogV2 = foundry?.applications?.api?.DialogV2;

  if (!DialogV2) {
    ui.notifications.error(
      "Этот макрос требует Foundry VTT с поддержкой DialogV2."
    );
    return;
  }

  const user = game.user;
  await preferenceWrites.get(user)?.catch(() => {});
  const previous = readExplosionPreferences(user);

  const escapeHTML = (value) => {
    const text = String(value ?? "");
    if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const parseNumber = (value, fallback = Number.NaN) => {
    const text = String(value ?? "").trim().replace(",", ".");
    if (!text) return fallback;
    const number = Number(text);
    return Number.isFinite(number) ? number : fallback;
  };

  const signed = (value) => {
    const number = Number(value) || 0;
    return number >= 0 ? `+${number}` : String(number);
  };

  function getDialogElement(dialog) {
    const element = dialog?.element;
    if (element instanceof HTMLElement) return element;
    if (element?.[0] instanceof HTMLElement) return element[0];
    return null;
  }

  function humanoidHitLocation(total, sideRoll = null) {
    switch (total) {
      case 3:
      case 4:
        return "Череп";
      case 5:
        return "Лицо";
      case 6:
      case 7:
        return "Правая нога";
      case 8:
        return "Правая рука";
      case 9:
      case 10:
        return "Торс";
      case 11:
        return "Пах";
      case 12:
        return "Левая рука";
      case 13:
      case 14:
        return "Левая нога";
      case 15:
        return (sideRoll ?? 1) <= 3 ? "Правая кисть" : "Левая кисть";
      case 16:
        return (sideRoll ?? 1) <= 3 ? "Правая ступня" : "Левая ступня";
      case 17:
      case 18:
        return "Шея";
      default:
        return "Торс";
    }
  }

  async function evaluateRoll(formula) {
    return await new Roll(formula).evaluate();
  }

  async function renderRoll(roll) {
    if (typeof roll.render === "function") {
      return await roll.render();
    }
    return `<div class="dice-roll"><div class="dice-result"><h4 class="dice-total">${escapeHTML(roll.total)}</h4></div></div>`;
  }

  let grenadeEvent = null;
  async function createChat(content, grenadeDamage = null) {
    return ChatMessage.create({
      speaker: grenadeEvent ? {actor:grenadeEvent.actorId,alias:game.actors?.get(grenadeEvent.actorId)?.name??grenadeDisplayName(grenadeEvent.profile)} : ChatMessage.getSpeaker(),
      content,
      ...(grenadeDamage ? {flags:{'olegurps-qol':{grenadeDamage}}} : {})
    });
  }

  function readForm(root) {
    const explosionDamage = root.querySelector('[name="explosionDamage"]')?.value ?? "";
    const fragmentDamage = root.querySelector('[name="fragmentDamage"]')?.value ?? "";
    const distance = parseNumber(root.querySelector('[name="distance"]')?.value, Number.NaN);
    const smRaw = parseNumber(root.querySelector('[name="sm"]')?.value, 0);
    const sm = Number.isFinite(smRaw) ? Math.trunc(smRaw) : 0;
    const postureKey = root.querySelector('[name="posture"]')?.value ?? "standing";
    const posture = FRAGMENT_POSTURES[postureKey] ?? FRAGMENT_POSTURES.standing;
    const autoLocations = !!root.querySelector('[name="autoLocations"]')?.checked;

    return {
      explosionDamage,
      fragmentDamage,
      distance,
      sm,
      posture,
      autoLocations,
      followUp: !!root.querySelector('[name="followUp"]')?.checked
      ,blastType: root.querySelector('[name="blastType"]')?.value ?? 'cr'
      ,fragmentType: root.querySelector('[name="fragmentType"]')?.value ?? 'cut'
      ,fragmentDivisor: parseNumber(root.querySelector('[name="fragmentDivisor"]')?.value, 1)
      ,fragmentRadius: grenadeEvent?.detonation?.profile?.fragmentRadius ?? null
    };
  }

  function validateDistance(distance) {
    if (!Number.isFinite(distance) || distance < 0) {
      ui.notifications.error("Укажите дистанцию до центра взрыва в ярдах (0 или больше).");
      return false;
    }
    return true;
  }

  async function resolveExplosion(values) {
    if(grenadeEvent?.detonation?.profile?.specialBlast) {
      ui.notifications.warn('Особый взрыв: используйте сохранённые параметры и процедуру эффекта; общий делитель B414 к нему автоматически не применяется.');return;
    }
    const damage = parseFragmentDamage(values.explosionDamage);
    if (!damage) {
      ui.notifications.error(
        "Некорректный взрывной урон. Примеры: 6d, 6к, 3d+2, 3к+2, 6d×2, 6к*2."
      );
      return;
    }

    if (!validateDistance(values.distance)) return;

    const blastRadius = 2 * damage.effectiveDice;
    const roll = await evaluateRoll(damage.formula);
    const rollHTML = await renderRoll(roll);

    const finalDamage = explosionTargetDamage({damage,total:Number(roll.total),distance:values.distance}).value;
    let calculation = "";
    let status = "";

    if (values.distance > blastRadius) {
      status = `Цель находится за пределами радиуса взрыва (${blastRadius} ярд.)`;
      calculation = "Урон от взрывной волны: 0";
    } else if (values.distance <= 0) {
      status = "В центре взрыва / прямое воздействие";
      calculation = `Итог: ${finalDamage}`;
    } else {
      const divisor = 3 * values.distance;
      calculation = `${roll.total} ÷ (3 × ${values.distance}) = ${finalDamage}`;
    }

    const content = `
      <div class="gurps-explosion-card" style="font-size:0.92em;line-height:1.35;">
        <h3 style="margin:0 0 6px;">Взрыв</h3>
        <div><strong>Взрывной урон:</strong> ${escapeHTML(damage.pretty)} ${escapeHTML(values.blastType)} ex</div>
        <div><strong>Дистанция до центра:</strong> ${escapeHTML(values.distance)} ярд.</div>
        <div><strong>Радиус взрыва:</strong> ${escapeHTML(blastRadius)} ярд.</div>
        ${status ? `<div style="margin-top:4px;"><strong>${escapeHTML(status)}</strong></div>` : ""}
        <details class="olegurps-explosion-calculation"><summary style="cursor:pointer">Расчёт</summary>
          <div style="margin-top:6px;"><strong>Расчёт:</strong> ${escapeHTML(calculation)}</div>
          <div style="margin-top:4px;opacity:0.8;">Для косвенного взрыва используется DR торса. Делитель брони исходной атаки к этому урону не применяется.</div>
        </details>
        <div style="margin-top:6px;font-size:1.12em;"><strong>Итоговый урон взрывом: ${finalDamage}</strong></div>
        ${finalDamage>0?'<button type="button" data-grenade-native>Урон через GGA</button>':''}
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;">Показать бросок исходного урона</summary>
          ${rollHTML}
        </details>
      </div>
    `;

    await createChat(content, {actorId:grenadeEvent?.actorId??null,eventId:grenadeEvent?.id??null,
      formula:String(finalDamage),type:values.blastType,divisor:values.distance===0?grenadeEvent?.detonation?.profile?.blast?.divisor??1:1});
  }

  async function resolveFragments(values) {
    if(!Number.isFinite(values.fragmentDivisor)||values.fragmentDivisor<=0){ui.notifications.error('Укажите положительный бронеделитель осколков.');return;}
    const damage = parseFragmentDamage(values.fragmentDamage);
    if (!damage) {
      ui.notifications.error(
        "Некорректный урон осколков. Примеры: 2d, 2к, 3d+1, 3к+1."
      );
      return;
    }

    if (!validateDistance(values.distance)) return;

    const { dangerRadius: calculatedRadius, rangeMod, effectiveSkill } = fragmentTargetProfile({
      damage, distance: values.distance, sm: values.sm, postureModifier: values.posture.modifier
    });
    const dangerRadius=values.fragmentRadius??calculatedRadius;

    let attackRoll = null;
    let attackRollHTML = "";
    let margin = null;
    let hits = 0;

    if (values.distance <= dangerRadius) {
      attackRoll = await evaluateRoll("3d6");
      attackRollHTML = await renderRoll(attackRoll);
      const attackTotal = Number(attackRoll.total);
      margin = effectiveSkill - attackTotal;

      hits = fragmentHitCount({ total: attackTotal, skill: effectiveSkill, followUp: values.followUp });
    }
    if (values.followUp && values.distance > dangerRadius) hits = fragmentHitCount({ inRange: false, followUp: true });

    const locationRows = [];

    if (values.autoLocations && hits > 0) {
      for (let index = 1; index <= hits; index++) {
        const locationRoll = await evaluateRoll("3d6");
        const total = Number(locationRoll.total);
        let sideRoll = null;
        let sideRollHTML = "";

        if (total === 15 || total === 16) {
          sideRoll = await evaluateRoll("1d6");
          sideRollHTML = await renderRoll(sideRoll);
        }

        const location = humanoidHitLocation(total, sideRoll?.total ?? null);
        const locationRollHTML = await renderRoll(locationRoll);

        locationRows.push(`
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,0.25);">
            <strong>Осколок ${index}:</strong> ${escapeHTML(location)}
            <details style="margin-top:3px;">
              <summary style="cursor:pointer;">Показать бросок зоны</summary>
              ${locationRollHTML}
              ${sideRoll ? `<div style="margin-top:4px;"><strong>Сторона:</strong></div>${sideRollHTML}` : ""}
            </details>
          </div>
        `);
      }
    }

    const attackBlock = values.distance > dangerRadius && values.followUp
      ? `<div style="margin-top:6px;"><strong>${escapeHTML(explosiveText("Guaranteed"))}: ${hits}</strong></div>`
      : values.distance > dangerRadius
      ? `<div style="margin-top:6px;"><strong>Цель вне радиуса разлёта осколков. Попало осколков: 0</strong></div>`
      : `
        <div style="margin-top:6px;">
          <strong>Навык осколков:</strong>
          15 ${signed(rangeMod)} (дистанция) ${signed(values.posture.modifier)} (поза) ${signed(values.sm)} (SM)
          = <strong>${effectiveSkill}</strong>
        </div>
        <div style="margin-top:5px;"><strong>Бросок:</strong> ${escapeHTML(attackRoll.total)}; запас успеха: ${escapeHTML(margin)}</div>
        <div style="margin-top:5px;font-size:1.12em;"><strong>Попало осколков: ${hits}</strong></div>
        ${values.followUp ? `<div>${escapeHTML(explosiveText("Guaranteed"))}</div>` : ""}
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;">Показать бросок попадания осколков</summary>
          ${attackRollHTML}
        </details>
      `;

    const content = `
      <div class="gurps-fragment-card" style="font-size:0.92em;line-height:1.35;">
        <h3 style="margin:0 0 6px;">Осколки</h3>
        <div><strong>Урон одного осколка:</strong> ${escapeHTML(damage.pretty)}${values.fragmentDivisor!==1?'('+escapeHTML(values.fragmentDivisor)+')':''} ${escapeHTML(values.fragmentType)}</div>
        <div><strong>Дистанция до центра:</strong> ${escapeHTML(values.distance)} ярд.</div>
        <div><strong>Радиус разлёта:</strong> ${escapeHTML(dangerRadius)} ярд.</div>
        <div><strong>Поза:</strong> ${escapeHTML(values.posture.label)}; <strong>SM:</strong> ${signed(values.sm)}</div>
        ${attackBlock}
        ${values.autoLocations && hits > 0
          ? `<div style="margin-top:8px;"><strong>Случайные зоны попадания (гуманоид):</strong></div>${locationRows.join("")}`
          : ""}
        <div style="margin-top:8px;opacity:0.8;">Тип осколков: ${escapeHTML(values.fragmentType)}. Делитель брони исходного взрыва к ним не применяется.</div>
        ${hits>0?'<button type="button" data-grenade-native>Урон одного осколка через GGA</button>':''}
      </div>
    `;

    await createChat(content,{actorId:grenadeEvent?.actorId??null,eventId:grenadeEvent?.id??null,
      formula:damage.pretty,type:values.fragmentType,divisor:values.fragmentDivisor});
  }

  const content = `
    <style>
      .gurps-exfrag-form {
        display: grid;
        gap: 10px;
        font-size: 0.92em;
      }
      .gurps-exfrag-row {
        display: grid;
        grid-template-columns: minmax(190px, 1fr) minmax(120px, 180px);
        gap: 10px;
        align-items: center;
      }
      .gurps-exfrag-row input,
      .gurps-exfrag-row select {
        width: 100%;
        margin: 0;
      }
      .gurps-exfrag-hint {
        margin: -4px 0 0;
        opacity: 0.72;
        font-size: 0.9em;
        line-height: 1.25;
      }
      .gurps-exfrag-check {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .gurps-exfrag-check input {
        width: auto;
        margin: 0;
      }
      .gurps-exfrag-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
        width: 100%;
        min-width: 0;
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid rgba(128,128,128,0.3);
      }
      .gurps-exfrag-actions > button {
        width: 100% !important;
        min-width: 100% !important;
        max-width: none !important;
        inline-size: 100% !important;
        justify-self: stretch !important;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      @media (max-width: 520px) {
        .gurps-exfrag-row,
        .gurps-exfrag-actions {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <nav class="og-grenade-tabs" aria-label="Взрывы">
      <button type="button" data-exfrag-tab="grenades">Гранаты</button>
      <button type="button" data-exfrag-tab="mines">Мины</button>
      <button type="button" data-exfrag-tab="calculator">Расчёт взрыва</button>
    </nav>
    <section data-grenade-panel class="og-grenade-panel"></section>
    <section data-mine-panel class="og-grenade-panel og-mine-panel" hidden></section>
    <section data-exfrag-calculator hidden>
    <details data-grenade-transfer hidden><summary>Параметры гранаты и применение</summary><div data-grenade-profile></div><button type="button" data-exfrag-manual>Ручной расчёт</button></details>
    <section data-grenade-effects hidden></section>
    <div class="gurps-exfrag-form">
      <div class="gurps-exfrag-row">
        <label><strong>Урон взрыва</strong></label>
        <input type="text" name="explosionDamage" value="${escapeHTML(previous.explosionDamage)}" placeholder="6d / 6к, 3d+2 / 3к+2, 6d×2">
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>Урон осколков</strong></label>
        <input type="text" name="fragmentDamage" value="${escapeHTML(previous.fragmentDamage)}" placeholder="2d / 2к, 3d+1 / 3к+1">
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>Дистанция до центра взрыва</strong></label>
        <input type="number" name="distance" value="${escapeHTML(previous.distance)}" min="0" step="0.1">
      </div>
      <details><summary>Типы урона</summary><div class="gurps-exfrag-row">
        <label>Тип взрыва</label><select name="blastType"><option value="cr">cr</option><option value="burn">burn</option></select>
        <label>Тип осколков</label><select name="fragmentType"><option value="cut">cut</option><option value="burn">burn</option><option value="cr">cr</option></select>
        <label>Бронеделитель осколков</label><input name="fragmentDivisor" type="number" min="0.01" step="0.01" value="1">
      </div></details>
      <div class="gurps-exfrag-hint">Ярды. Используется и для взрывной волны, и для попадания осколков.</div>

      <div class="gurps-exfrag-row">
        <label><strong>Поза цели</strong></label>
        <select name="posture">
          <option value="standing" ${previous.posture === 'standing' ? 'selected' : ''}>Стоя (0)</option>
          <option value="crouching" ${previous.posture === 'crouching' ? 'selected' : ''}>Пригнувшись (-2)</option>
          <option value="kneeling" ${previous.posture === 'kneeling' ? 'selected' : ''}>На коленях (-2)</option>
          <option value="crawling" ${previous.posture === 'crawling' ? 'selected' : ''}>Ползком (-2)</option>
          <option value="sitting" ${previous.posture === 'sitting' ? 'selected' : ''}>Сидя (-2)</option>
          <option value="lying" ${previous.posture === 'lying' ? 'selected' : ''}>Лёжа (-2)</option>
        </select>
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>SM цели</strong></label>
        <input type="number" name="sm" value="${escapeHTML(previous.sm)}" step="1">
      </div>

      <label class="gurps-exfrag-check">
        <input type="checkbox" name="followUp" ${previous.followUp ? 'checked' : ''}>
        <span>${escapeHTML(explosiveText("FollowUp"))}</span>
      </label>
      <div class="gurps-exfrag-hint">${escapeHTML(explosiveText("FollowUpHint"))}</div>
      <label class="gurps-exfrag-check">
        <input type="checkbox" name="autoLocations" ${previous.autoLocations ? 'checked' : ''}>
        <span>Автоматически определить случайную зону для каждого попавшего осколка</span>
      </label>
      <div class="gurps-exfrag-hint">В этой версии используется таблица случайных зон человека/гуманоида.</div>

      <div class="gurps-exfrag-actions">
        <button type="button" data-exfrag-action="explosion" style="width:100%;min-width:100%;max-width:none;inline-size:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
          <i class="fa-solid fa-bomb"></i> Взрыв
        </button>
        <button type="button" data-exfrag-action="fragments" style="margin-top:12px !important;width:100%;min-width:100%;max-width:none;inline-size:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
          <i class="fa-solid fa-burst"></i> Осколки
        </button>
      </div>
    </div></section>
  `;

  const dialog = new DialogV2({
    window: {
      title: "Взрыв и осколки",
      resizable: true
    },
    position: {
      width: 610,
      height: "auto"
    },
    content,
    buttons: [
      {
        action: "close",
        label: "Закрыть",
        icon: "fa-solid fa-xmark"
      }
    ]
  });
  activeExplosionDialog=dialog;

  await dialog.render({ force: true });

  const root = getDialogElement(dialog);
  if (!root) {
    ui.notifications.error("Не удалось получить элемент окна макроса.");
    return;
  }
  const switchTab = name => {
    const panel=root.querySelector('[data-grenade-panel]'),calculator=root.querySelector('[data-exfrag-calculator]');
    if(panel)panel.hidden=name!=='grenades';if(calculator)calculator.hidden=name!=='calculator';
    const mines=root.querySelector('[data-mine-panel]');if(mines)mines.hidden=name!=='mines';
    for(const b of root.querySelectorAll?.('[data-exfrag-tab]')??[])b.setAttribute('aria-selected',String(b.dataset.exfragTab===name));
  };
  // Minimal test/third-party adapters may expose only the historic calculator DOM.
  const payloadCalculator=mountGrenadeEffectCalculator(root);
  if(payloadCalculator&&typeof dialog.close==='function'){
    const closeCalculator=dialog.close.bind(dialog);
    dialog.close=async function(...args){payloadCalculator.destroy();return closeCalculator(...args);};
  }
  if(game.actors&&root.querySelector('[data-grenade-panel]')) {
    const {mountMineAssistant}=await import('./mine-assistant.js');await mountMineAssistant(root,{dialog});
    const {mountGrenadeAssistant,grenadeProfileHTML}=await import('./grenade-assistant.js');
    await mountGrenadeAssistant(root,{dialog,token,showCalculator:(event,activate=true)=>{
      grenadeEvent=structuredClone(event);const p=grenadeDisplayProfile(event.detonation.profile);
      payloadCalculator?.transfer(event);
      const set=(name,value)=>{const e=root.querySelector(`[name="${name}"]`);if(e)e.value=value;};
      set('explosionDamage',p.blast?.formula??'');set('fragmentDamage',p.fragments?.formula??'');set('blastType',p.blast?.type??'cr');
      set('fragmentType',p.fragments?.type??'cut');set('fragmentDivisor',p.fragments?.divisor??1);
      // Distances to individual victims remain explicitly entered unless known.
      set('distance',event.targetDistance??'');root.querySelector('[name="followUp"]').checked=false;
      const transfer=root.querySelector('[data-grenade-transfer]');transfer.hidden=false;
      root.querySelector('[data-grenade-profile]').innerHTML=`<strong>${escapeHTML(p.name)}</strong>`+(p.radius!=null?`<div>Радиус эффекта: ${escapeHTML(p.radius)} ярд.</div>`:'')+grenadeProfileHTML(p)+`<p>Место: ${escapeHTML(event.calculationLocation?.place??event.detonation.place)}</p>`;
      root.querySelector('[data-exfrag-action="explosion"]').disabled=!p.blast||!!p.specialBlast;
      root.querySelector('[data-exfrag-action="fragments"]').disabled=!p.fragments;
      const form=root.querySelector('.gurps-exfrag-form');if(form)form.hidden=!!p.payloadEffect&&!p.fragments;
      for(const name of ['explosionDamage','distance']){const row=root.querySelector(`[name="${name}"]`)?.closest('.gurps-exfrag-row');if(row)row.hidden=!!p.payloadEffect;}
      root.querySelector('[data-exfrag-action="explosion"]').hidden=!!p.payloadEffect;
      for(const name of ['explosionDamage','fragmentDamage','blastType','fragmentType','fragmentDivisor']){const field=root.querySelector(`[name="${name}"]`);if(field){field[p.payloadEffect?'setAttribute':'removeAttribute']('readonly','');if(field.tagName==='SELECT')field.disabled=!!p.payloadEffect;}}
      if(activate)switchTab('calculator');
    }});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-exfrag-tab]');if(b){e.preventDefault();switchTab(b.dataset.exfragTab);}});
    root.querySelector('[data-exfrag-manual]').addEventListener('click',e=>{
      e.preventDefault();grenadeEvent=null;payloadCalculator?.transfer(null);root.querySelector('[data-grenade-transfer]').hidden=true;
      for(const field of root.querySelectorAll('[readonly]'))field.removeAttribute('readonly');
      const form=root.querySelector('.gurps-exfrag-form');if(form)form.hidden=false;
      for(const name of ['explosionDamage','distance']){const row=root.querySelector(`[name="${name}"]`)?.closest('.gurps-exfrag-row');if(row)row.hidden=false;}
      root.querySelector('[data-exfrag-action="explosion"]').hidden=false;
      for(const name of ['blastType','fragmentType'])root.querySelector(`[name="${name}"]`).disabled=false;
      root.querySelector('[data-exfrag-action="explosion"]').disabled=false;root.querySelector('[data-exfrag-action="fragments"]').disabled=false;
    });
    switchTab('grenades');
  }

  const remember = (event) => event?.target?.closest?.('[data-grenade-panel], [data-grenade-effects], [data-mine-panel]') ? Promise.resolve() : saveExplosionPreferences(readExplosionFormPreferences(root), user)
    .catch(error => console.warn('OleGURPS QOL | Explosion preferences:', error));
  root.addEventListener('input', remember);
  root.addEventListener('change', remember);

  root.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button[data-exfrag-action]");
    if (!button || !root.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.exfragAction;
    const values = readForm(root);
    button.disabled = true;

    try {
      await remember();
      if (action === "fragments") {
        await resolveFragments(values);
      } else if (action === "explosion") {
        if(grenadeEvent?.detonation?.profile?.payloadEffect)await payloadCalculator.resolve();else await resolveExplosion(values);
      }
    } catch (error) {
      console.error("GURPS Explosion/Fragmentation Macro:", error);
      ui.notifications.error(moduleMessage(error));
    } finally {
      button.disabled = false;
    }
  });
  return dialog;
}
