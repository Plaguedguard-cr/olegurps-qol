# CatalogService

Infrastructure for the four reference catalogs in `data/catalogs/`.
It does not select ammunition or change Actors, Items, settings, attacks, damage,
inventory, or GGA. Record counts are calculated from the files, not enforced as
runtime constants.

## Initialization and availability

`scripts/main.js` constructs one service and starts `load()` in the existing
`init` hook without awaiting it. The existing `ready` hook publishes that same
instance through the module API.

The four requests run concurrently. Each file has a 15-second request timeout.
Repeated and concurrent calls return the same promise, including after a failed
load. There is no automatic retry or cache reset; reload the client to retry.

After startup:

```js
const catalogs = game.modules.get("olegurps-qol").api.catalogs;
await catalogs.load();
console.log(catalogs.getDiagnostics());
```

The same instance is available as `OleGURPSQOL.catalogs` after init and
`game.olegurpsQOL.catalogs` after the existing ready hook publishes the API.

Queries are synchronous. Await `load()` before using them. Until ready,
unavailable records return `null` and collection queries return `[]`.

## API

Catalog keys are `weapons`, `lt`, `ht`, and `ut`. IDs are exact, case-sensitive
source identifiers. There is no matching by name, diameter, character TL or skill.

| Method | Result |
| --- | --- |
| `load()` | Cached promise resolving to diagnostics |
| `getDiagnostics()` | Current service state and per-catalog diagnostics |
| `getStatus(book)` | One catalog's status, or null for an unknown key |
| `getCatalog(book)` | Complete, immutable source JSON |
| `getRecord(book, collection, id)` | Record in a named indexed collection |
| `getEquipment(id)` | Weapon Reference equipment |
| `getMode(id)` | Weapon Reference attack/effect mode |
| `getEquipmentForMode(id)` | Equipment owning a mode |
| `getModesForEquipment(id)` | Equipment's original mode records |
| `getAmmoItem(book, id)` | LT/HT ammunition item; UT returns null |
| `getAmmoFamily(book, id)` | LT/HT/UT family |
| `getVariant(book, id)` | Variant in the book's indexed variant collections |
| `getModeLinks(modeId)` | Validated declared ammunition links for a mode, or null |
| `getModesForAmmoItem(book, id)` | Modes from validated LT/HT reverse links |
| `getModesForAmmoFamily(book, id)` | Modes from validated family reverse links |

## Поправки UT2007

`getCatalog` и обычные lookup-методы возвращают согласованное представление с проверенными поправками `ut-2007-1` из `scripts/ut-source-data.js`. Четыре защищённых исходных JSON, их GCS-хеши и прежние IDs сохранены побайтно. `getSourceCatalog(book)` возвращает неизменяемые исходные данные до этого слоя.

В представление добавлены Gauss Needler 3mm и Gauss PDW 4mm с собственными идентификаторами OleGURPS и точными связями 3mm/4mm EM. Итоговые индексы: 1154 equipment, 1477 modes; UT — 87 связей и 81 linked mode. Schema/revision исходных каталогов и версия модуля 0.2.0 не изменены. WT2014 используется только для недостающего/неполного поля по разрешению пользователя; полные значения книги2007 имеют приоритет.

Этот слой не записывает Actor, не исправляет импорт GCS и не обновляет сохранённые определения автоматически. Полный разбор122 сопоставлений: [отчёт UT-DATA](ultra-tech-data-corrections-report.md).

`getModeLinks` returns:
`book`, `modeId`, `equipmentId`, `ammoItemIds`, `ammoFamilyIds`,
`specialLoadIds`, `defaultWarheadId`, and `suggestedWarheadIds`.
These are catalog declarations, not an evaluated list of selectable warheads.

LT variants are `projectile_options`. HT variants combine
`cartridge_upgrades`, `projectile_options`, `projectile_upgrades` and
`case_construction_options`. UT variants combine `special_loads` and `warheads`.
The original collections remain accessible individually with `getRecord`.

HT `shot_sizes` and `feed_devices_reference_only`, plus LT
`other_referenced_options`, have separate reference indexes when present.
Feed devices are never inserted into the ammunition-item index.
HT family IDs and item IDs may be identical because those namespaces are separate.

All returned source records, nested values, arrays, relationship descriptions
and diagnostic snapshots are deeply frozen. Private Maps are never exposed.
Data returned by an injected loader is cloned before entering the cache.

## Validation and failure isolation

Supported metadata:

| Key | Schema | Revision | Revision source |
| --- | --- | --- | --- |
| weapons | 5 | 5.6 | Separate `rules_audit_v5_6` marker; not schema_version |
| lt | 1 | 1.2 | `revision` |
| ht | 1 | 1.3 | `revision` |
| ut | 2 | 2.7 | `revision` |

Validation covers the required collections and identity fields, mode structure,
duplicate IDs, catalog pointers, family/item membership, family reverse-link
unions, LT variant references, HT option exclusions, UT special-load references,
UT embedded family indexes, and declared warhead references.

Cross-catalog checks verify existence, source book and both directions of
weapon/ammunition links. UT backlinks must name the actual owning equipment.
Existing native companion mode IDs are checked for existence and source;
missing semantic companion associations are not inferred.

Structural errors make that catalog unavailable and discard its query indexes.
A cross-catalog relationship error quarantines the affected ammunition catalog;
the Weapon Reference remains readable and reports partial relationship checks.
Other books continue loading. If Weapon Reference itself is unavailable,
ammunition records remain readable, but cross-catalog checks are `skipped`;
relationship lookup methods return no unchecked mode records.

The service reports the first structural error per invalid catalog, with a
code, path and reason. It does not modify or repair any input JSON.

Diagnostics contain:

- Service state: `idle`, `loading`, `ready`, `partial`, or `unavailable`.
- Per-catalog status, expected and detected versions, filename and failure reason.
- Computed collection counts and available index sizes.
- Forward/reverse relationship counts, linked modes and internal checks.
- Structural errors separately from reference/game-rule warnings.

The aggregate `variants` index overlaps its source collections; index sizes
should not be summed as if they were distinct source records.

Warnings include outdated stored summary counts, external-rule requirements,
textual HT interchangeability rules, and game rules not evaluated at this stage.
A successful link check does not assert complete GURPS rules or actual firing
compatibility. Javelin Follow-Up completeness, Hydra RoF, missile Range semantics,
guidance and rocket inventory contracts remain for later stages.

## Initial verified dataset

| Catalog | Equipment | Modes / linked modes | Ammo items | Families | Variants |
| --- | ---: | ---: | ---: | ---: | ---: |
| Weapon Reference | 1152 | 1475 modes | - | - | - |
| LT | - | 140 linked modes | 134 | 121 | 38 |
| HT | - | 478 linked modes | 263 | 262 | 64 |
| UT | - | 79 linked modes | - | 36 | 43 (6 loads + 37 warheads) |

Validated edges in each direction: LT 217, HT 511, UT 85.

The following SHA-256 values identify the current supplied catalog bytes.
They were verified before and after removing obsolete versions. Low-Tech is unchanged.

| Filename | SHA-256 |
| --- | --- |
| olegurps_weapon_reference_catalog_v5_6.json | `6d9aabb0292efbe25d3f302e682eb8120b5fe385788f07ef8d3c8acc0ba6f4d0` |

Weapon Reference 5.6 retains its schema/source identity and adds `catalog_errata_v1.revision = 1`:
HT120 corrects only `WRziobjV56cvaJtG2.stats.range` from `1,600` to `1,600/6,600`.
Original GCS source hashes, equipment/mode IDs, saved definitions and shot snapshots are unchanged.
The preservation check reverses this exact declared correction before comparing the historical equipment hash.
| olegurps_lt_ammunition_catalog_v1_2.json | `2e520c12f437ca917ab87cf6322128ce2e4776f7abd7e1a547503681a0914cdd` |
| olegurps_ht_ammunition_catalog_v1_3.json | `435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385` |
| olegurps_ut_ammunition_catalog_v2_7.json | `888dd25f46b43c8d51d7e81b529d616d84e1cde6591ffc0da5a5b9613d527ccc` |

## Tests

Run `node --test tests/catalog-service.test.mjs` for focused checks, or the full
`tests/*.test.mjs` suite. Failure scenarios use in-memory fixtures and injected
fetch responses; real catalogs are only read. The lifecycle test exercises the
existing init/ready callbacks with Foundry dependencies stubbed.

## Current catalog upgrade

Supported set: Weapon Reference 5.6, LT 1.2, HT 1.3, UT 2.7. Structured HT178 directions validate all source/target/excluded IDs, 68 unique assessments, equipment/mode identity, native source links, action and exact-chamber conditions. A broken direction disables HT only.

LT bytes are unchanged. Its historical schema-5 weapon filename is provenance, never a fetch path. CatalogService reports HISTORICAL_SOURCE_POINTER and validates every LT link against the current weapon catalog. It accepts only earlier schema-5 provenance with join_key=weapon_mode_id.

The independent 68-pair audit lives in docs/audit and is never loaded as a fifth catalog. See ammunition-compatibility-report.md for the current test results and limitations.

## HT v1.3 eligibility validation

Current HT revision is 1.3. CatalogService validates contract/rule category, required evidence arrays, missing-evidence policy, native guard types, base-variant references and finite/non-reversed numeric bounds. Invalid eligibility disables HT independently. The two source review files live under docs/audit and are not runtime catalogs.
