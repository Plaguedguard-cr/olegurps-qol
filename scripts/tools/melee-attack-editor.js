const text = value => String(value ?? "").trim();

export function validateMeleeAttackOverride(values) {
  const skillLevel = Number(text(values.skillLevel).replace(",", "."));
  const damage = text(values.damage);
  const reach = text(values.reach);
  const parry = text(values.parry);
  const errors = [];
  if (!Number.isInteger(skillLevel) || skillLevel < 0 || skillLevel > 999) {
    errors.push("Навык должен быть целым числом от 0 до 999");
  }
  if (!damage) errors.push("Укажите формулу урона");
  if (!reach) errors.push("Укажите Reach");
  return {
    valid: errors.length === 0,
    errors,
    value: errors.length ? null : { skillLevel, damage, reach, parry }
  };
}

export async function openMeleeAttackEditor({ DialogV2, attack, escapeHTML }) {
  const result = await DialogV2.wait({
    window: { title: "Параметры: " + attack.label },
    position: { width: 440 },
    content: `
      <div class="standard-form gam-attack-editor gam-melee-editor">
        <label class="gam-attack-editor-row">
          <span>Навык</span>
          <input type="number" name="skillLevel" value="${escapeHTML(attack.level)}" min="0" max="999" step="1" required autofocus>
        </label>
        <label class="gam-attack-editor-row">
          <span>Урон</span>
          <input type="text" name="damage" value="${escapeHTML(attack.damage)}" placeholder="sw+1 cut / 2d+2 imp" required>
        </label>
        <label class="gam-attack-editor-row">
          <span>Reach</span>
          <input type="text" name="reach" value="${escapeHTML(attack.reach)}" placeholder="C,1 / 1-2" required>
        </label>
        <label class="gam-attack-editor-row">
          <span>Parry</span>
          <input type="text" name="parry" value="${escapeHTML(attack.parry)}" placeholder="0 / 0F / -">
        </label>
        <p class="notes">Изменения хранятся в OleGURPS QOL и не изменяют атаку в чарлисте GGA.</p>
      </div>
    `,
    buttons: [
      {
        action: "save",
        label: "Сохранить",
        icon: "fa-solid fa-floppy-disk",
        default: true,
        callback: (_event, button) => ({
          action: "save",
          values: Object.fromEntries(new FormData(button.form).entries())
        })
      },
      {
        action: "reset",
        label: "Сбросить изменения",
        icon: "fa-solid fa-arrow-rotate-left",
        callback: () => ({ action: "reset" })
      }
    ],
    rejectClose: false,
    modal: true
  });
  if (!result || result.action === "reset") return result;
  const validation = validateMeleeAttackOverride(result.values);
  if (!validation.valid) {
    ui.notifications.error("Ошибка заполнения: " + validation.errors.join("; ") + ".");
    return null;
  }
  return { action: "save", value: validation.value };
}
