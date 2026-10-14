import { russianUI } from "./russian-ui.js";

// Module UI always uses its own Russian resources. Foundry/GGA i18n is never changed.
export function moduleText(key, values = {}, fallback = "Текст интерфейса недоступен") {
  const template = russianUI[key] ?? fallback;
  return String(template).replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name] ?? "—") : token);
}

export function moduleMessage(value) {
  const message = String(value?.message ?? value ?? "");
  if (/[\u0400-\u04ff]/u.test(message)) return message;
  const key = Object.keys(russianUI).find(key => key === message || key.endsWith("." + message));
  return moduleText(key, {}, "Не удалось выполнить операцию. Проверьте условия и повторите попытку.");
}

export function appendInstructionSteps(parent, text, document = globalThis.document) {
  const steps = String(text).split(/\n/).filter(Boolean);
  const list = parent._olegurpsInstructionSteps ?? document.createElement("ol");
  list.className = "olegurps-ammunition-steps";
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step.replace(/^\d+[.)]\s*/, "");
    list.append(item);
  }
  if (!parent._olegurpsInstructionSteps) parent.append(list);
  parent._olegurpsInstructionSteps = list;
}
