# AmmunitionCompatibilityService API

Reference data only. Uses CatalogService; no GGA UUID mapping, Actor access, UI, attacks or inventory changes.

## Access

```js
const service = game.modules.get("olegurps-qol").api.ammunitionCompatibility;
// Same instance: OleGURPSQOL.ammunitionCompatibility and game.olegurpsQOL.ammunitionCompatibility.
await service.load();
const list = service.getCompatibleAmmunition("W1FMPB_-58qp_bH-M");
const pair = service.checkCompatibility("W1FMPB_-58qp_bH-M", "ht_38_special_9x29mmr");
console.log(service.getDiagnostics());
```

## Methods

- `load()`: delegates to CatalogService.load(); reuses its cached promise, including partial availability. Returns catalog diagnostics.
- `getCompatibleAmmunition(modeId, options={})`: `{modeId, book, status, ammunition, variants, undetermined, reasons}`. `ready` means the mode can be queried. Confirmed item/family records are in ammunition; typed variants in variants; unresolved candidates in undetermined. Known incompatible records are excluded: use checkCompatibility for their reasons. Family entries are grouping records, not extra cartridges.
- `checkCompatibility(modeId, ammoId, options={})`: `{status, modeId, book, ammoId, kind, resourceKind, deliveryType, record, relation, reasons, warnings, restrictions}`. Status: compatible, incompatible or undetermined. Missing IDs/catalogs/links and unresolved conditions remain undetermined. Name/caliber/TL alone never establishes a link.
- `getDiagnostics()`: `{catalogs, unsupported, policy}`. Includes CatalogService versions, counts, indexes, validated links and unavailable reasons. Unsupported entries identify textual HT options, unresolved HT178 rules, alternate launcher generations and conflicting UT special-load tags. Detailed HT/UT entries contain IDs, exact JSON fields, reason and recommended DATA improvement. HT178 entries also include source/target cartridge IDs and native candidate mode IDs.

Options:

- `book`: optional lt/ht/ut namespace for checkCompatibility. No automatic cross-source permission.
- `kind`: optional collection kind. HT items and families often share an ID; default lookup selects the ammo item. Use kind=ammo-family for an explicit family query. Other ambiguities remain undetermined.
- `ammoItemId`: optional linked LT projectile context for an option. Unlinked context is rejected.
- `availabilityTL`: finite numeric ammunition availability TL, supplied explicitly. Restricts known min_tl options; required for UT TL-dependent size tables. Does not use weapon TL as campaign availability and never reads Actor/GGA skill TL. Without it, physical compatibility can be confirmed with AVAILABILITY_UNCHECKED; TL-dependent sizes remain undetermined.

Relation types: explicit-bidirectional-link, explicit-projectile-class, directed-ht178, explicit-special-load, linked-family-warhead-predicates. Includes catalog filename and field/collection path. Unresolved directed exceptions retain attempted relation and reasons. Variants retain associated item/family IDs.

Kinds: ammo-item, ammo-family, projectile-option, cartridge-upgrade, projectile-upgrade, case-option, special-load, warhead, feed-device, reference-option. Feed/reference equipment is rejected as ammunition. deliveryType preserves ammunition class/type or rocket delivery type; resourceKind distinguishes single-use-whole-weapon. Secondary effects stay in source records, never searchable cartridges.

All returned objects and arrays are independent deeply frozen snapshots. CatalogService stays untouched. Queries are synchronous after loading. Early queries return undetermined and can be retried after await load(). Private record/rule indexes are reused per loaded catalog identity. No world setting or user state affects queries.

## Full data audit

Текущие решения и ограничения описаны в [сводке High-Tech](high-tech.md). Исторические источниковые аудиты HT178, LT/HT/UT и примеры проверок хранятся в локальном архиве. Рекомендация требует подтверждения источником; неизвестность не становится совместимостью.
## Structured HT178 explicit_direction_v1

New directions use explicit source_ammo_item_ids/target_ammo_item_ids and exact mode_pair_assessments. Their from/to names are descriptive only. Legacy directions retain their prior handling. A structured rule never falls back to name matching or automatic chamber guesses. Missing assessments remain undetermined; excluded heavy-load source/targets are not promoted to ordinary shells.

Confirmed pairs additionally expose capabilities={firing:"confirmed",feedingAndCycling:"not-confirmed"}. relation.metadata is explicit_direction_v1 and contains source page, direction policy and platform conditions. Source warnings are preserved, including feeding-and-cycling-not-proven-by-HT178. Confirmation authorizes only the reference firing relationship, not automatic feeding, RoF, damage or rocket mechanics.

## HT option eligibility_v1

HT v1.3 supplies 64 structured predicates. checkCompatibility now returns eligibility={checks,facts,applicationAllowed} for HT variants. Each condition has confirmed/incompatible/undetermined status. Any confirmed prohibition rejects the pair; missing class, caliber, TL or special evidence stays undetermined. Current records do not map the required platform proofs, so none of the 64 variants can be fully auto-authorized.

Facts come only from linked ammo construction/class, high-confidence mechanism, explicit numeric fields and native secondary mode links. Names, caliber_hint, generic tags and skill names are not fact sources. Callers cannot supply verification flags, guessed caliber/classes or pressure/payload evidence. availabilityTL supplies campaign context; ammoItemId selects a confirmed native or directed-HT178 ammo record; missing records/pairs remain undetermined. selectedVariantIds and baseVariantId describe a proposed combination, not confirmed suitability. Explicit exclusions, exclusive layers and required base IDs are checked; poison+HP is kept as the declared base relationship.

Native overlap guards reject confirmed repeated Linked/Follow-Up application; absence of known overlap is not proof of safety. HT light-case broad min_tl=8 applies to small-arms only; unresolved shotshell availability branches stay undetermined. No stats, transformations or effects are applied. See ht-v1-3-eligibility-report.md for all 64 records and scoped condition counts.
