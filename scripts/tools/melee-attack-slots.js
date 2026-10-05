export function getMeleeAttackSlots({ allOutAttack = false, allOutAttackMode = "determined", rapidStrike = false } = {}) {
  const double = allOutAttack && allOutAttackMode === "double";
  if (double && rapidStrike) return [
    { type: "aoa", label: "AoA", rapidStrike: false },
    { type: "rs1", label: "RS 1", rapidStrike: true },
    { type: "rs2", label: "RS 2", rapidStrike: true }
  ];
  if (double) return [
    { type: "aoa1", label: "AoA 1", rapidStrike: false },
    { type: "aoa2", label: "AoA 2", rapidStrike: false }
  ];
  if (rapidStrike) return [
    { type: "rs1", label: "RS 1", rapidStrike: true },
    { type: "rs2", label: "RS 2", rapidStrike: true }
  ];
  return [{ type: "attack", label: "\u0410\u0442\u0430\u043a\u0430", rapidStrike: false }];
}
