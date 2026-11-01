// A Blind Fighting roll covers one attack (B180), not a visibility/target-location state.
export function blindFightingContextKey(app, runtime = globalThis) {
  const attack = app.attack ?? app.sourceAttack;
  const ref = attack?.standaloneRef;
  return JSON.stringify({
    actor: app.actor?.id,
    token: app.token?.id ?? null,
    weapon: ref?.weaponId ?? attack?.key ?? attack?.uuid ?? attack?.name,
    mode: attack?.meleeProfile?.modeId ?? ref?.modeId ?? attack?.mode,
    grip: attack?.meleeProfile?.grip ?? null,
    slot: app._attackSlots?.[app._activeAttackSlot]?.type ?? 'attack',
    targets: Array.from(runtime.game?.user?.targets ?? [], t => t.id ?? t.document?.id).sort(),
    visibility: app.visibility ?? null
  });
}
