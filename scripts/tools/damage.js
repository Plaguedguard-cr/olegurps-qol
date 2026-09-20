import { createGgaDamageWithEasterEgg } from "./damage-result-easter-egg.js";

const INVALID_FORMULA_MESSAGE = "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0430\u044f \u0444\u043e\u0440\u043c\u0443\u043b\u0430 \u0443\u0440\u043e\u043d\u0430. \u041f\u0440\u0438\u043c\u0435\u0440\u044b: 10, 2d6+3, 2\u043a6+3, 2d6*3.";

export function normalizeDamageFormula(value) {
  const compact = String(value ?? "")
    .trim()
    .replace(/[\u043a\u041a]/g, "d")
    .replace(/D/g, "d")
    .replace(/[xX\u0445\u0425\u00d7]/g, "*")
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  if (/^[1-9]\d*$/.test(compact)) return compact;
  const match = compact.match(/^([1-9]\d*)d(6)?([+-]\d+)?(?:\*([1-9]\d*(?:\.\d+)?))?$/);
  if (!match) return null;
  const [, dice, , modifier = "", multiplier] = match;
  return `${dice}d${modifier}${multiplier ? `*${multiplier}` : ""}`;
}

function localizedDamageTypeLabel(type, definition) {
  const key = `GURPS.damageType${definition?.label ?? ""}`;
  const localized = game.i18n?.localize?.(key);
  const label = localized && localized !== key ? localized : String(definition?.label ?? type);
  return label === type ? type : `${type} \u2014 ${label}`;
}

export function getGgaDamageTypes() {
  const tables = globalThis.GURPS?.DamageTables;
  const modifiers = tables?.woundModifiers;
  if (!modifiers || typeof modifiers !== "object") return [];
  return Object.entries(modifiers)
    .filter(([type, definition]) =>
      type !== "dmg" && type !== "kb" && !definition?.nodisplay && !definition?.resource && tables.translate?.(type) === type
    )
    .map(([type, definition]) => ({
      type,
      label: localizedDamageTypeLabel(type, definition),
      icon: String(definition?.icon ?? '<i class="fa-solid fa-dice-d6"></i>')
    }));
}

export async function executeGgaDamage(formula, damageType = "") {
  const DamageChat = globalThis.GURPS?.DamageChat;
  if (typeof DamageChat?.create !== "function") {
    return ui.notifications.error("GGA DamageChat \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.");
  }
  const source = globalThis.GURPS?.LastActor ?? game.user;
  return createGgaDamageWithEasterEgg({
    DamageChat,
    actor: source,
    args: [
      source,
      formula,
      damageType,
      { shiftKey: false, ctrlKey: false, data: {} },
      null,
      []
    ]
  });
}

export async function openDamageRoll() {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (!DialogV2) return ui.notifications.error("\u042d\u0442\u043e\u0442 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 DialogV2.");
  if (typeof globalThis.GURPS?.DamageChat?.create !== "function") {
    return ui.notifications.error("GGA DamageChat \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.");
  }

  const escapeHTML = value => foundry?.utils?.escapeHTML
    ? foundry.utils.escapeHTML(String(value ?? ""))
    : String(value ?? "");
  const damageTypes = getGgaDamageTypes();
  const typeButtons = damageTypes.map(({ type, label, icon }) => `
    <button
      type="button"
      class="oq-damage-type"
      data-damage-type="${escapeHTML(type)}"
      aria-pressed="false"
      title="${escapeHTML(label)}"
    >
      <span class="oq-damage-type-icon">${icon}</span>
      <span class="oq-damage-type-code">${escapeHTML(type)}</span>
    </button>
  `).join("");

  const data = await DialogV2.wait({
    window: { title: "\u0423\u0440\u043e\u043d" },
    position: { width: 500 },
    content: `
      <div class="standard-form oq-damage">
        <div class="oq-damage-row">
          <label>\u0424\u043e\u0440\u043c\u0443\u043b\u0430 \u0443\u0440\u043e\u043d\u0430</label>
          <input type="text" name="formula" value="" placeholder="10 / 2d6+3" autocomplete="off" autofocus>
        </div>
        <div class="oq-damage-label">\u0422\u0438\u043f \u0443\u0440\u043e\u043d\u0430</div>
        <input type="hidden" name="damageType" value="">
        <div class="oq-damage-types" role="group" aria-label="\u0422\u0438\u043f \u0443\u0440\u043e\u043d\u0430">
          <button
            type="button"
            class="oq-damage-type selected"
            data-damage-type=""
            aria-pressed="true"
            title="Untyped / \u0411\u0435\u0437 \u0442\u0438\u043f\u0430"
          >
            <span class="oq-damage-type-icon"><i class="fa-solid fa-dice-d6"></i></span>
            <span class="oq-damage-type-code">Untyped</span>
          </button>
          ${typeButtons}
        </div>
        <p class="oq-damage-hint">\u0412\u044b\u0431\u043e\u0440 \u0442\u0438\u043f\u0430 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442 \u0431\u0440\u043e\u0441\u043e\u043a. \u041f\u0440\u0438\u043c\u0435\u0440\u044b: 10, 2d6+3, 2\u043a6+3, 2d6*3.</p>
      </div>
    `,
    render: (_event, dialog) => {
      const root = dialog.element;
      const userColor = game.user?.color?.css ?? game.user?.color?.toString?.() ?? "#ff9f3d";
      root?.style?.setProperty("--oq-damage-accent", userColor);
      const hidden = root?.querySelector('[name="damageType"]');
      root?.addEventListener("click", event => {
        const button = event.target?.closest?.("button[data-damage-type]");
        if (!button || !root.contains(button) || !hidden) return;
        event.preventDefault();
        hidden.value = button.dataset.damageType ?? "";
        for (const candidate of root.querySelectorAll("button[data-damage-type]")) {
          const selected = candidate === button;
          candidate.classList.toggle("selected", selected);
          candidate.setAttribute("aria-pressed", String(selected));
        }
      });
    },
    buttons: [{
      action: "roll",
      label: "\u0411\u0440\u043e\u0441\u0438\u0442\u044c \u0443\u0440\u043e\u043d",
      icon: "fa-solid fa-dice",
      default: true,
      callback: (_event, button) => ({
        formula: button.form?.elements?.formula?.value ?? "",
        damageType: button.form?.elements?.damageType?.value ?? ""
      })
    }],
    rejectClose: false,
    modal: false
  });
  if (!data) return;

  const formula = normalizeDamageFormula(data.formula);
  if (!formula) return ui.notifications.warn(INVALID_FORMULA_MESSAGE);
  const damageType = String(data.damageType ?? "");
  if (damageType && !damageTypes.some(entry => entry.type === damageType)) {
    return ui.notifications.warn("\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0442\u0438\u043f \u0443\u0440\u043e\u043d\u0430 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0432 GGA.");
  }
  return executeGgaDamage(formula, damageType);
}