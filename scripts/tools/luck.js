export function getLuckIntro(firstTotal, secondTotal) {
  return Number(firstTotal) === Number(secondTotal)
    ? "Все пути к одному исходу"
    : "Два дополнительных броска 3к6.";
}

export async function openLuck() {
  try {
    const firstRoll = await new Roll("3d6").evaluate();
    const secondRoll = await new Roll("3d6").evaluate();

    async function renderRoll(roll) {
      if (typeof roll.render === "function") return await roll.render();
      return `
        <div class="dice-roll">
          <div class="dice-result">
            <h4 class="dice-total">${roll.total}</h4>
          </div>
        </div>
      `;
    }

    const firstRollHTML = await renderRoll(firstRoll);
    const secondRollHTML = await renderRoll(secondRoll);
    const content = `
      <div style="font-size:0.92em; line-height:1.35;">
        <div style="font-weight:700; font-size:1em; margin:0 0 6px;">Удача</div>
        <div>${getLuckIntro(firstRoll.total, secondRoll.total)}</div>

        <details style="margin-top:8px;">
          <summary style="cursor:pointer;">Первый бросок: ${firstRoll.total}</summary>
          ${firstRollHTML}
        </details>

        <details style="margin-top:6px;">
          <summary style="cursor:pointer;">Второй бросок: ${secondRoll.total}</summary>
          ${secondRollHTML}
        </details>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content
    });
  } catch (error) {
    console.error("GURPS Luck Macro:", error);
    ui.notifications.error(error?.message ?? String(error));
  }
}
