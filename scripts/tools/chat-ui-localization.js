// Previously saved module-owned sections only; no stored content or native GGA changes.
export function localizeOwnChat(root, runtime = globalThis) {
  const doc = runtime.document;
  if (!root?.querySelectorAll || !doc?.createTreeWalker) return;
  const labels = new Map([
    ["Skill details", "Расчёт навыка"], ["Shot details", "Условия выстрела"],
    ["Attack details", "Условия атаки"], ["Zone details", "Расчёт зоны"],
    ["Ranged Weapon Level:", "Базовый навык оружия:"],
    ["Melee Attack Level:", "Базовый навык ближней атаки:"],
    ["Close-Hip result:", "Результат стрельбы от бедра:"],
    ["Attack entry level adjustment:", "Поправка уровня выбранной атаки:"],
    ["Committed Attack mode:", "Режим решительной атаки:"],
    ["Defensive Attack bonus:", "Бонус защитной атаки:"],
    ["Hit Location:", "Зона попадания:"],
    ["Cap Shooting Blind:", "Предел навыка при стрельбе вслепую:"]
  ]);
  const visited = new Set();
  for (const section of root.querySelectorAll(".olegurps-fire-chat-body,.olegurps-combat-channel-breakdown,.olegurps-attack-context,.olegurps-attack-modifiers")) {
    const walker = doc.createTreeWalker(section, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (visited.has(node)) continue;
      visited.add(node);
      for (const [old, translated] of labels) {
        const trimmed = node.nodeValue.trimStart();
        if (trimmed === old || old.endsWith(":") && trimmed.startsWith(old)) node.nodeValue = node.nodeValue.replace(old, translated);
      }
    }
  }
}
