const text = value => String(value ?? "").trim();
const integer = value => {
  const number = Number(text(value).replace(",", "."));
  return Number.isInteger(number) ? number : null;
};

export function validateWeaponAttackOverride(values, parseRateOfFire) {
  const skillLevel = integer(values.skillLevel);
  const rof = text(values.rof);
  const acc = integer(values.acc);
  const scopeBonus = integer(values.scopeBonus);
  const bulk = integer(values.bulk);
  const rcl = text(values.rcl);
  const errors = [];

  if (skillLevel === null || skillLevel < 0 || skillLevel > 999) {
    errors.push("\u041d\u0430\u0432\u044b\u043a \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0446\u0435\u043b\u044b\u043c \u0447\u0438\u0441\u043b\u043e\u043c \u043e\u0442 0 \u0434\u043e 999");
  }
  const rofProfile = typeof parseRateOfFire === "function" ? parseRateOfFire(rof) : null;
  if (!rof || !rofProfile?.valid) {
    errors.push("RoF \u043d\u0435 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u043d Fire Control");
  }
  if (acc === null || acc < 0 || acc > 999) {
    errors.push("Acc \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0446\u0435\u043b\u044b\u043c \u0447\u0438\u0441\u043b\u043e\u043c \u043e\u0442 0 \u0434\u043e 999");
  }
  if (scopeBonus === null || scopeBonus < 0 || scopeBonus > 999) {
    errors.push("\u041f\u0440\u0438\u0446\u0435\u043b \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0446\u0435\u043b\u044b\u043c \u043d\u0435\u043e\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u043c \u0447\u0438\u0441\u043b\u043e\u043c");
  }
  if (bulk === null || bulk < -999 || bulk > 999) {
    errors.push("Bulk \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0446\u0435\u043b\u044b\u043c \u0447\u0438\u0441\u043b\u043e\u043c");
  }
  if (!/^\d+(?:\s*\/\s*\d+)?$/u.test(rcl) || rcl.split("/").some(part => Number(part.trim()) < 1)) {
    errors.push("Rcl \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432\u0438\u0434\u0430 2 \u0438\u043b\u0438 2/1");
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? { skillLevel, rof, acc, scopeBonus, bulk, rcl } : null
  };
}

export async function openWeaponAttackEditor({ DialogV2, attack, escapeHTML, parseRateOfFire }) {
  const result = await DialogV2.wait({
    window: { title: `\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b: ${attack.label}` },
    position: { width: 480 },
    content: `
      <div class="standard-form gam-attack-editor">
        <label class="gam-attack-editor-row">
          <span>\u041d\u0430\u0432\u044b\u043a</span>
          <input type="number" name="skillLevel" value="${escapeHTML(attack.level)}" min="0" max="999" step="1" required autofocus>
        </label>
        <label class="gam-attack-editor-row">
          <span>RoF</span>
          <input type="text" name="rof" value="${escapeHTML(attack.rof)}" placeholder="3 / 15! / 2\u00d79" required>
        </label>
        <div class="gam-attack-editor-accuracy">
          <label>
            <span>Acc</span>
            <input type="number" name="acc" value="${escapeHTML(attack.acc ?? 0)}" min="0" max="999" step="1" required>
          </label>
          <strong aria-hidden="true">+</strong>
          <label>
            <span>\u041f\u0440\u0438\u0446\u0435\u043b</span>
            <input type="number" name="scopeBonus" value="${escapeHTML(attack.scopeBonus ?? 0)}" min="0" max="999" step="1" required>
          </label>
        </div>
        <label class="gam-attack-editor-row">
          <span>Bulk</span>
          <input type="number" name="bulk" value="${escapeHTML(attack.data?.bulk ?? attack.bulk ?? 0)}" min="-999" max="999" step="1" required>
        </label>
        <label class="gam-attack-editor-row">
          <span>Rcl</span>
          <input type="text" name="rcl" value="${escapeHTML(attack.rcl)}" placeholder="2 / 2/1" required>
        </label>
      </div>
    `,
    buttons: [
      {
        action: "save",
        label: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => ({
          action: "save",
          values: Object.fromEntries(new FormData(button.form).entries())
        })
      },
      {
        action: "reset",
        label: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
        icon: "fa-solid fa-arrow-rotate-left",
        callback: () => ({ action: "reset" })
      }
    ],
    rejectClose: false,
    modal: true
  });

  if (!result || result.action === "reset") return result;
  const validation = validateWeaponAttackOverride(result.values, parseRateOfFire);
  if (!validation.valid) {
    ui.notifications.error(`\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f: ${validation.errors.join("; ")}.`);
    return null;
  }
  return { action: "save", value: validation.value };
}