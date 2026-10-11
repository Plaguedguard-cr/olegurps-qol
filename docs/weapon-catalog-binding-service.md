# WeaponCatalogBindingService: first stage

Date: 2026-10-09. Foundry 14.364 / installed GGA 0.18.23. Reference suggestions and module-owned confirmations only.

## Files

Created:

- scripts/weapon-catalog-binding-service.js
- tests/weapon-catalog-binding.test.mjs
- tests/fixtures/gga-combat-import-0.18.23.js (research copy of the installed importer method body)
- docs/weapon-catalog-binding-service.md

Changed:

- scripts/main.js: import, singleton, weaponCatalogBindings API property.
- tests/catalog-service.test.mjs and tests/ammunition-compatibility-service.test.mjs: constructor/API integration tests.

No catalog, GGA, AmmoService, weapon selector, Fire Control, Shooting Assistant or attack calculation was modified. Existing local changes and ammunition state were preserved.

## What GGA actually imports

Evidence: installed systems/gurps/module/actor/actor-importer.js, actor-components.js and actor.js; Node execution of the copied combat method; execution of the actual installed method in the running Foundry page on in-memory source data.

| Value | Observed behavior | Persistence implications |
| --- | --- | --- |
| GCS equipment id | importEq assigns i.id to Equipment.uuid; parentuuid stores container ancestry | Persists when the source GCS record keeps its id. A replaced/copied source record may have another id. No claim of universal GCS identity stability. |
| GCS weapon-mode w.id | importCombatFromGCS uses its prefix to decide melee/ranged; does NOT copy it into the new attack | The original catalog weapon_mode_id cannot be recovered directly from a normal JSON-imported attack UUID. |
| Attack uuid | Named initializes uuid=''; direct JSON combat import does not assign it | Two actual in-memory imports with changed Wbefore/Wafter IDs both yielded empty attack uuid. Other GGA Item/manual paths can supply component UUIDs; they require corroboration. |
| system.ranged / system.melee path | Import rebuilds positional keys 00000 etc. in traversal order | Reordering/additions can change paths. A reused path cannot prove identity. |
| Foundry Item id / Item.uuid | Local embedded Document identity; Item generation/matching is distinct from source importid/component uuid | Never treated as durable mode identity. fromItem/itemid/eqtkey can locate equipment, but only its actual eqt.uuid is a source identity hint. parentuuid is not assumed to identify the weapon. |
| GGA generated component identifier | _getGGAId can reuse source uuid, create a GGA random id for saved objects, or hash name+type+generator if absent | Name-derived identifiers do not establish unique physical weapon or mode identity; duplicates and semantic/source conflicts require review. |
| Damage/Acc/RoF/Rcl/Bulk/Range/etc. | Imported attack fields use GCS weapon and calc values; Acc scope bonus is moved into notes by JSON importer | Compared as evidence, never overwritten. Damage or other edited stats do not automatically disqualify the catalog model. |
| Skill level | importCombatFromGCS stores calc.level in import; GGA computes current level later | Character-dependent level/check OTF are retained as diagnostic metadata, not used to identify a weapon model. Original GCS defaults/selected skill identity are not imported here as a stable mode identifier. Existing OleGURPS governing-skill overrides are untouched. |

The installed importer migrates OTF/notes by name and usage. This is GGA behavior, not proof that a name-only mapping is safe for this service. The new service uses stricter recovery.

The test/live evidence covers the combat import stage with source IDs changed. A complete persisted Actor reimport was not performed in the live world, to preserve its data and ammunition. Equipment UUID preservation is verified from the explicit assignment in installed source; it remains conditional on source GCS IDs actually being retained. Later postImport/Item-derived attack additions are separate and are handled conservatively by the service.

## Matching

The service traverses ranged and melee lists, including contains/collapsed. It indexes visible primary ranged/melee catalog modes and restricts candidates to the same combat type.

Scoring uses normalized display/original name, usage, source page, caliber and the available damage, accuracy, RoF, recoil, bulk, range, shots, ST, reach, parry and block. Scope-stripped GGA Acc is recognized. Caliber/name normalization is used ONLY for suggestions, never to authorize ammunition compatibility.

A unique strong model requires corroborating source/model or enough independent statistic matches and caliber/source support, plus a score/margin over the next candidate. Changed statistics only reduce score slightly and remain visible as differences. They are not a rejection rule. Close alternatives remain candidates; an unrelated/insufficient record remains unmatched/candidates. Scores are heuristics, not probabilities or user confirmations. Generic/localized/renamed records can need manual mapping.

Automatic matching never writes flags or actor fields and never returns a confirmed binding. A manual target can differ from the automatic suggestion and remains authoritative while identity is valid.

## Persistence and reimport

Confirmed entries are stored ONLY at flags.olegurps-qol.weaponCatalogBindings:

```js
{ version: 1, entries: [
  { id, equipmentId, modeId, anchor, confirmedBy, confirmedAt }
] }
```

The anchor snapshots names, combat type, usage, source page, component/source-equipment identity hints, statistics and duplicate-cohort information. It contains no inventory or magazine data. Actor flag operations are restricted to Actor owner or GM and serialized per Actor within the API singleton.

Every query reconciles anchors against the current actor data without writing. A unique corroborated component/equipment UUID can retain a confirmation despite changed stats and paths. UUID alone is insufficient: semantic mode identity and source/equipment/stat corroboration are required. Container parent IDs and local Item UUIDs are never sufficient.

If IDs changed or were absent, recovery requires the same semantic weapon/type/usage, the same nonempty source page and at least three equal nonempty statistic fields, with exactly one current candidate. Prior indistinguishable copies prevent a false unique recovery after one copy disappears. Missing corroboration or duplicate candidates returns needs_review, preserves the saved entry and supplies candidate paths. Paths are not used as recovery evidence. This is conservative corroboration, not a guarantee that physically identical replacements can always be distinguished.

reconcileActor explicitly persists safely resolved current anchors; unresolved anchors stay unchanged. No GGA import method, hook or mechanics is patched: reconciliation occurs lazily on each API query. Flags survive reimport into the same Actor because this state is outside the replaced GGA system lists. A newly created Actor does not inherit another Actor's confirmations.

Review/remapping needs explicit API confirmation, optionally with the existing bindingId. Saved orphaned confirmations are listed separately. An unavailable catalog retains confirmations for review. No confirmation is silently removed and no ammunition is reassigned.

## API (no new interface)

```js
const bindings = game.modules.get('olegurps-qol').api.weaponCatalogBindings;
// Same singleton: OleGURPSQOL.weaponCatalogBindings / game.olegurpsQOL.weaponCatalogBindings.
await bindings.load(); // existing CatalogService cached load

const report = bindings.analyzeActor(actor);
const mode = bindings.analyzeMode(actor, 'system.ranged.00000');

// Explicit user confirmation; no change to GGA attack data:
const saved = await bindings.confirm(actor, 'system.ranged.00000', {
  equipmentId: 'eT448e6j7QT5yBB9-',
  modeId: 'W27s4Lm8QlkKVKUPn'
});

await bindings.reconcileActor(actor); // optional persistent anchor refresh after import
// Explicit re-confirmation of an orphaned/ambiguous saved entry:
await bindings.confirm(actor, currentModePath, chosenTarget, { bindingId: saved.id });
await bindings.removeConfirmation(actor, saved.id);
```

Read results are deeply frozen snapshots. Statuses: suggested, candidates, unmatched, unavailable, confirmed, needs_review. confirmed always denotes explicit user confirmation, not automatic similarity. A mode result includes current attack snapshot, effective binding or null, manual entries, automatic ranked candidates, evidence/differences and identity/review reason. analyzeActor additionally reports orphanedConfirmations and catalog status.

Ordinary GGA firing does not call this service and is unaffected by any missing/uncertain binding. CatalogService/compatibility/HT eligibility stay unchanged. No UI, governing-skill editor, GGA UUID injection or AttackProfileResolver is added.

## Tests and live checks

- New focused tests: 27/27 PASS.
- Full project suite: 509/509 PASS (482 existing + 27 new).
- Exact/approximate/ambiguous matches, edited stats, wrong type, manual priority and permissions, flag isolation, serialized writes, missing catalogs/data, absent/changed/reused UUIDs, path reordering, duplicate instances, two usages of one weapon, equipment source UUID versus local Item UUID, melee type isolation and immutable queries.
- Actual installed combat importer in Foundry 14.364 / GGA 0.18.23: Wbefore/Wafter yielded uuid='' both times and imported level 13. The resulting AK-47 in-memory attack received the expected unconfirmed catalog suggestion.
- No live Actor/flag/world/pack writes, page reload or live combat rolls. Persistent/reimport recovery is tested with Actor mocks; full real-Actor reimport was not tested. New API becomes available in the normal module instance after the next page reload.
- Syntax, UTF-8 and preservation checks performed. No commit/push/merge/rebase.