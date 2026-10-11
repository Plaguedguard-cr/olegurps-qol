# Temporary developer checks

## Open

After restarting Foundry to load the updated module manifest, log in as a GM.
Open Settings > Configure Settings > OleGURPS QOL > Open developer mode.
Select a 3d6 total (3-18) and apply it to the next check. Cancel override clears it.

GM API:

```js
const developer = game.modules.get("olegurps-qol").api.developer;
developer.open();
developer.arm(17);
developer.getPending(); // 17 or null
developer.cancel();
```

The facade is unavailable to players. Its methods, including saved references,
check the current GM identity. There is no persistent setting, Actor flag,
password, socket command or global Roll interception.

## Scope and implementation

Only the OleGURPS prepared attack and prepared skill executors call the service.
This covers Shooting Assistant attacks using that shared path, and standalone
prepared Fire Control checks. Native GGA, melee via native GGA, fear/reaction/luck,
damage and Hit Location tables are outside this scope.

The pending total belongs to the current GM user ID and lives in client memory.
A successful native Roll reconstruction consumes it once, before the existing
critical, failure, margin and RoF/Rcl calculations. Rejected/cancelled checks
before evaluation and failed reconstruction retain it. Concurrent checks cannot
consume the same request twice. Reloading the page resets it.

The service uses the original roll's serialized GGA Roll/Die classes and
[Foundry's public Roll.fromData API](https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html#fromData)
to produce three active d6 results summing to the selected total.
It verifies the restored total and dice before consuming the request.
There is no replacement attack calculation.

Test cards carry a visible Test roll label and
`flags["olegurps-qol"].testRoll = {total, userId}`.
These message flags identify a completed test; they do not store pending state.
Core roll visibility is preserved.

## Verification (2026-10-09)

- Automated suite: 256/256 PASS, including 25 new developer tests.
- Syntax, UTF-8 and git diff whitespace checks: PASS.
- Foundry 14.364 GM session: real GurpsRoll and native GGA template tested for
  3, 10, 17 and 18. Serialized totals and actual dice matched.
  At skill 25 / RoF 20 / Rcl 1: hits were 20, 16, 0 and 0.
  3 was critical success; 18 was critical failure; 17 was ordinary failure.
- Cancellation before evaluation retained 17.
- Real ApplicationV2 window: 16 options, GM-restricted settings entry,
  Apply/pending display/Cancel/Close verified.
- Live checks used in-memory ChatMessage and action boundaries, so no test
  messages, ammunition spending or Actor updates were persisted.
- Player denial, other-user isolation, ordinary subsequent rolls, damage
  exclusion and session reset were verified by automated tests.
- A complete persisted Shooting Assistant attack and a separate player client
  were not exercised live.

AmmoService, Fire Control calculations, the 17/18 fix, catalogs and GGA source
were not changed. Existing unrelated local files were preserved.
