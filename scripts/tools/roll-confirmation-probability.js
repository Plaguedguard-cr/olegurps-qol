import { getFireSkillPreview } from "./fire-skill-preview.js";

const MODULE_ID = "olegurps-qol";
export const ROLL_CONFIRMATION_PROBABILITY_SETTING = "showRollConfirmationProbability";

function showRollConfirmationProbability() {
  try {
    return globalThis.game?.settings?.get?.(
      MODULE_ID, ROLL_CONFIRMATION_PROBABILITY_SETTING
    ) !== false;
  } catch (_error) {
    return true;
  }
}

export function addRollConfirmationProbability(app, element) {
  const root = element?.querySelector ? element : app?.element;
  const section = root?.querySelector?.(".cr-container .cr-result-section");
  const total = section?.querySelector?.("#cr-total");
  const original = section?.querySelector?.("#cr-target");
  const type = section?.querySelector?.(".cr-result-type");
  if (!total || !original || !type) return;

  const originalText = original.textContent?.trim() ?? "";
  const targetText = total.textContent?.trim() ?? "";
  const target = Number(targetText);
  const valid = /^[1-9]\d*$/.test(originalText) && /^-?\d+$/.test(targetText) &&
    Number.isSafeInteger(target);
  const existing = section.querySelector(".gam-roll-probability");
  if (!valid || !showRollConfirmationProbability()) {
    existing?.remove();
    root.classList?.remove?.("gam-roll-confirmation");
    return;
  }

  const preview = getFireSkillPreview(target);
  if (!Number.isFinite(preview.probability)) {
    existing?.remove();
    return;
  }
  root.classList?.add?.("gam-roll-confirmation");
  const probability = existing ?? root.ownerDocument.createElement("div");
  probability.className = "gam-roll-probability";
  probability.textContent = preview.chance + "%";
  const totalColor = root.ownerDocument?.defaultView?.getComputedStyle?.(total)?.color ?? total.style?.color;
  if (totalColor) probability.style.color = totalColor;
  if (!existing) type.insertAdjacentElement("afterend", probability);
}

export function registerRollConfirmationProbability() {
  globalThis.game.settings.register(MODULE_ID, ROLL_CONFIRMATION_PROBABILITY_SETTING, {
    name: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0448\u0430\u043d\u0441 \u0443\u0441\u043f\u0435\u0445\u0430 \u0432 Roll Confirmation",
    hint: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0432\u0435\u0440\u043e\u044f\u0442\u043d\u043e\u0441\u0442\u044c \u0443\u0441\u043f\u0435\u0448\u043d\u043e\u0433\u043e \u0431\u0440\u043e\u0441\u043a\u0430 \u043d\u0430 3d6 \u0432 \u043e\u043a\u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043d\u0430\u0432\u044b\u043a\u043e\u0432 \u0438 \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  globalThis.Hooks?.on?.("renderDialogV2", addRollConfirmationProbability);
}
