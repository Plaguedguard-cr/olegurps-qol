export async function openExplosionFragmentation() {
  const DialogV2 = foundry?.applications?.api?.DialogV2;

  if (!DialogV2) {
    ui.notifications.error(
      "Этот макрос требует Foundry VTT с поддержкой DialogV2."
    );
    return;
  }

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

  function parseGurpsDamage(raw) {
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

  function rangeModifier(distance) {
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

  const POSTURES = {
    standing: { label: "Стоя", modifier: 0 },
    crouching: { label: "Пригнувшись", modifier: -2 },
    kneeling: { label: "На коленях", modifier: -2 },
    crawling: { label: "Ползком", modifier: -2 },
    sitting: { label: "Сидя", modifier: -2 },
    lying: { label: "Лёжа", modifier: -2 }
  };

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

  async function createChat(content) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content
    });
  }

  function readForm(root) {
    const explosionDamage = root.querySelector('[name="explosionDamage"]')?.value ?? "";
    const fragmentDamage = root.querySelector('[name="fragmentDamage"]')?.value ?? "";
    const distance = parseNumber(root.querySelector('[name="distance"]')?.value, Number.NaN);
    const smRaw = parseNumber(root.querySelector('[name="sm"]')?.value, 0);
    const sm = Number.isFinite(smRaw) ? Math.trunc(smRaw) : 0;
    const postureKey = root.querySelector('[name="posture"]')?.value ?? "standing";
    const posture = POSTURES[postureKey] ?? POSTURES.standing;
    const autoLocations = !!root.querySelector('[name="autoLocations"]')?.checked;

    return {
      explosionDamage,
      fragmentDamage,
      distance,
      sm,
      posture,
      autoLocations
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
    const damage = parseGurpsDamage(values.explosionDamage);
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

    let finalDamage = 0;
    let calculation = "";
    let status = "";

    if (values.distance > blastRadius) {
      finalDamage = 0;
      status = `Цель находится за пределами радиуса взрыва (${blastRadius} ярд.)`;
      calculation = "Урон от взрывной волны: 0";
    } else if (values.distance <= 0) {
      finalDamage = Math.max(0, Math.floor(Number(roll.total) || 0));
      status = "В центре взрыва / прямое воздействие";
      calculation = `Итог: ${finalDamage}`;
    } else {
      const divisor = 3 * values.distance;
      finalDamage = Math.max(
        0,
        Math.floor((Number(roll.total) || 0) / divisor)
      );
      calculation = `${roll.total} ÷ (3 × ${values.distance}) = ${finalDamage}`;
    }

    const content = `
      <div class="gurps-explosion-card" style="font-size:0.92em;line-height:1.35;">
        <h3 style="margin:0 0 6px;">Взрыв</h3>
        <div><strong>Взрывной урон:</strong> ${escapeHTML(damage.pretty)}</div>
        <div><strong>Дистанция до центра:</strong> ${escapeHTML(values.distance)} ярд.</div>
        <div><strong>Радиус взрыва:</strong> ${escapeHTML(blastRadius)} ярд.</div>
        ${status ? `<div style="margin-top:4px;"><strong>${escapeHTML(status)}</strong></div>` : ""}
        <div style="margin-top:6px;"><strong>Расчёт:</strong> ${escapeHTML(calculation)}</div>
        <div style="margin-top:6px;font-size:1.12em;"><strong>Итоговый урон взрывом: ${finalDamage}</strong></div>
        <div style="margin-top:4px;opacity:0.8;">Для косвенного взрыва используется DR торса. Делитель брони исходной атаки к этому урону не применяется.</div>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;">Показать бросок исходного урона</summary>
          ${rollHTML}
        </details>
      </div>
    `;

    await createChat(content);
  }

  async function resolveFragments(values) {
    const damage = parseGurpsDamage(values.fragmentDamage);
    if (!damage) {
      ui.notifications.error(
        "Некорректный урон осколков. Примеры: 2d, 2к, 3d+1, 3к+1."
      );
      return;
    }

    if (!validateDistance(values.distance)) return;

    const dangerRadius = 5 * damage.effectiveDice;
    const rangeMod = rangeModifier(values.distance);
    const effectiveSkill = 15 + rangeMod + values.posture.modifier + values.sm;

    let attackRoll = null;
    let attackRollHTML = "";
    let margin = null;
    let hits = 0;

    if (values.distance <= dangerRadius) {
      attackRoll = await evaluateRoll("3d6");
      attackRollHTML = await renderRoll(attackRoll);
      const attackTotal = Number(attackRoll.total);
      margin = effectiveSkill - attackTotal;

      // Это обычный бросок атаки GURPS: 3-4 всегда попадают, 17-18 всегда промах.
      const success =
        attackTotal <= 4 ||
        (attackTotal < 17 && attackTotal <= effectiveSkill);

      if (success) {
        hits = 1 + Math.floor(Math.max(0, margin) / 3);
      }
    }

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

    const attackBlock = values.distance > dangerRadius
      ? `<div style="margin-top:6px;"><strong>Цель вне радиуса разлёта осколков. Попало осколков: 0</strong></div>`
      : `
        <div style="margin-top:6px;">
          <strong>Навык осколков:</strong>
          15 ${signed(rangeMod)} (дистанция) ${signed(values.posture.modifier)} (поза) ${signed(values.sm)} (SM)
          = <strong>${effectiveSkill}</strong>
        </div>
        <div style="margin-top:5px;"><strong>Бросок:</strong> ${escapeHTML(attackRoll.total)}; запас успеха: ${escapeHTML(margin)}</div>
        <div style="margin-top:5px;font-size:1.12em;"><strong>Попало осколков: ${hits}</strong></div>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;">Показать бросок попадания осколков</summary>
          ${attackRollHTML}
        </details>
      `;

    const content = `
      <div class="gurps-fragment-card" style="font-size:0.92em;line-height:1.35;">
        <h3 style="margin:0 0 6px;">Осколки</h3>
        <div><strong>Урон одного осколка:</strong> ${escapeHTML(damage.pretty)} cut</div>
        <div><strong>Дистанция до центра:</strong> ${escapeHTML(values.distance)} ярд.</div>
        <div><strong>Радиус разлёта:</strong> ${escapeHTML(dangerRadius)} ярд.</div>
        <div><strong>Поза:</strong> ${escapeHTML(values.posture.label)}; <strong>SM:</strong> ${signed(values.sm)}</div>
        ${attackBlock}
        ${values.autoLocations && hits > 0
          ? `<div style="margin-top:8px;"><strong>Случайные зоны попадания (гуманоид):</strong></div>${locationRows.join("")}`
          : ""}
        <div style="margin-top:8px;opacity:0.8;">Осколки наносят режущий урон. Делитель брони исходного взрыва к ним не применяется.</div>
      </div>
    `;

    await createChat(content);
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

    <div class="gurps-exfrag-form">
      <div class="gurps-exfrag-row">
        <label><strong>Урон взрыва</strong></label>
        <input type="text" name="explosionDamage" value="6d" placeholder="6d / 6к, 3d+2 / 3к+2, 6d×2">
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>Урон осколков</strong></label>
        <input type="text" name="fragmentDamage" value="2d" placeholder="2d / 2к, 3d+1 / 3к+1">
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>Дистанция до центра взрыва</strong></label>
        <input type="number" name="distance" value="1" min="0" step="0.1">
      </div>
      <div class="gurps-exfrag-hint">Ярды. Используется и для взрывной волны, и для попадания осколков.</div>

      <div class="gurps-exfrag-row">
        <label><strong>Поза цели</strong></label>
        <select name="posture">
          <option value="standing" selected>Стоя (0)</option>
          <option value="crouching">Пригнувшись (-2)</option>
          <option value="kneeling">На коленях (-2)</option>
          <option value="crawling">Ползком (-2)</option>
          <option value="sitting">Сидя (-2)</option>
          <option value="lying">Лёжа (-2)</option>
        </select>
      </div>

      <div class="gurps-exfrag-row">
        <label><strong>SM цели</strong></label>
        <input type="number" name="sm" value="0" step="1">
      </div>

      <label class="gurps-exfrag-check">
        <input type="checkbox" name="autoLocations">
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
    </div>
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

  await dialog.render({ force: true });

  const root = getDialogElement(dialog);
  if (!root) {
    ui.notifications.error("Не удалось получить элемент окна макроса.");
    return;
  }

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
      if (action === "fragments") {
        await resolveFragments(values);
      } else if (action === "explosion") {
        await resolveExplosion(values);
      }
    } catch (error) {
      console.error("GURPS Explosion/Fragmentation Macro:", error);
      ui.notifications.error(error?.message ?? String(error));
    } finally {
      button.disabled = false;
    }
  });
}
