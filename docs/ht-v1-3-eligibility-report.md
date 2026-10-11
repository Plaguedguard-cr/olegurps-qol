# HT v1.3 structured eligibility implementation

Date: 2026-10-09. Reference API only; no gameplay/stat/inventory changes.

## Files and catalog update

- HT v1.3 is the active catalog. Removed HT v1.2 after preservation/functional checks. data/catalogs contains exactly Weapon Reference v5.6, LT v1.2, HT v1.3 and UT v2.7.
- Moved olegurps_ht_64_structured_review_v1.json and olegurps_ht64_source_review_v1.md into docs/audit without changing any bytes. They are not runtime catalogs.
- Weapon Reference changed only ht_ammunition_catalog_link.catalog_filename and catalog_revision. A byte-level regression restores just these two fields and verifies the previous whole-file hash; every other weapon field remains unchanged.
- Updated scripts/catalog-service.js: current filename/revision and eligibility contract, policy, evidence array, numeric bound, base-ID and native-guard validation. Invalid HT data does not block LT/UT.
- Updated scripts/ammunition-compatibility-service.js; created scripts/ht-option-eligibility.js. The pure evaluator supports every condition key in the 64 records and returns predicate checks, reasons, source facts and applicationAllowed.
- Updated existing catalog/compatibility/upgrade tests and documentation; created tests/ht-option-eligibility.test.mjs (89 tests), this report and preservation/runtime audit JSONs.

## Preservation

HT v1.3 differs only by revision/audit metadata plus eligibility_v1 on 64 existing options. Removing those additions produces the exact prior parsed catalog. IDs, mechanics, min_tl, excludes, selectable flags, prices/weights, ammo links, rocket contracts and all HT178 rules are preserved. New HT JSON bytes were not edited. The previous semantic checkpoint and source hashes are in docs/audit/ht-v1-3-preservation.json. LT and UT bytes are unchanged.

## Eligibility behavior

- compatible: every predicate and required source-backed special confirmation passes. No real option currently has all those platform-specific confirmations mapped, so zero variants are fully auto-authorized.
- incompatible: at least one confirmed prohibition. Examples: high-confidence automatic action versus manual-only match ammunition; an explicitly cased round versus caseless construction; explicit variant exclusions/exclusive layers; a guarded native Linked effect already present.
- undetermined: missing class/caliber/TL/pressure/design/filler/native-effect evidence. Missing values do not imply a negative class. Partial class sets can prove membership, but cannot disprove an unobserved class.
- Only explicit construction/class fields, high-confidence mechanisms, actual numeric caliber fields and native secondary-mode links provide catalog facts. Names, caliber_hint, skill specializations, generic tags, guessed diameters and caller verification flags are not accepted as evidence.
- availabilityTL is an explicit scenario input, not weapon/Guns TL. Unknown availability remains undetermined. ht_light_case broad min_tl=8 must not reject late-TL5/6/7 shotshells: that source-backed branch remains undetermined until encoded/proven, while known small-arms TL limits are checked.
- ammoItemId selects a confirmed native or directed-HT178 item; unknown records/pairs remain undetermined. selectedVariantIds and baseVariantId are proposed context, not proof of suitability. Poison keeps its explicit HP base dependency rather than being rejected as an arbitrary second projectile. AP/APHC and other alternative primary layers cannot stack.
- do_not_reapply_native_effects/overlap_guard blocks confirmed overlap. Unknown native effect identity stays undetermined. No effects, damage, Acc, Range, RoF, Roll, Actor or magazines are changed.

## Scoped automatic results

Exhaustive reference scan: 478 visible primary native HT modes x 64 variants = 30,592 pairs. No availabilityTL, caller proof or platform evidence was supplied; ambiguous multi-item contexts stayed unresolved. Counts are for this precise scope, not universal gameplay permissions.

| Outcome | Count |
| --- | ---: |
| Fully compatible pairs | 0 |
| Confirmed incompatible pairs | 1260 |
| Undetermined pairs | 29332 |
| Individual conditions confirmed | 2428 |
| Individual conditions prohibited | 1372 |
| Individual conditions undetermined | 143112 |

All 64 structured records loaded and evaluated. All 64 still require extra platform-specific facts for full positive authorization. A positive class/size/TL check alone never authorizes a variant. See docs/audit/ht-v1-3-runtime-eligibility-review.json for exact IDs, condition names, evidence requirements and per-option pair counts.

## Every one of the 64 variants

| Variant ID | Structured fields | Required confirmations | Compatible / incompatible / undetermined pairs |
| --- | --- | --- | --- |
| ht_plus_p | munition_classes_any | weapon_pressure_rating_verified | 0 / 0 / 478 |
| ht_match_grade | projectile_classes_any, weapon_actions_any, forbidden_classes | factory_match_grade_for_this_ammunition | 0 / 214 / 264 |
| ht_match_handloaded | munition_classes_any, projectile_classes_any, weapon_actions_any | matched_to_this_individual_weapon, armoury_and_iq_guns_success, handloaded_batch | 0 / 214 / 264 |
| ht_subsonic_pistol | munition_classes_any | cartridge_pistol_class_verified, original_load_supersonic | 0 / 0 / 478 |
| ht_subsonic_rifle | munition_classes_any | cartridge_rifle_or_pdw_class_verified, original_load_supersonic | 0 / 0 / 478 |
| ht_silent | munition_classes_any | silent_ammunition_design_confirmed_for_weapon | 0 / 0 / 478 |
| ht_solid | munition_classes_any | native_projectile_baseline_verified | 0 / 0 / 478 |
| ht_rifled_slug | weapon_platforms_any, munition_classes_any | slug_load_compatible_with_chamber | 0 / 0 / 478 |
| ht_hollow_point | projectile_classes_any | expanding_bullet_suitable_for_this_cartridge | 0 / 0 / 478 |
| ht_poison | projectile_classes_any, requires_base_variant_id | handloaded_round, blood_or_contact_agent_selected, payload_dose_confirmed | 0 / 0 / 478 |
| ht_ap | projectile_classes_any | hardened_ap_construction_available | 0 / 0 / 478 |
| ht_aphc | projectile_classes_any | hardcore_penetrator_construction_available | 0 / 0 / 478 |
| ht_frangible | projectile_classes_any | frangible_construction_confirmed | 0 / 0 / 478 |
| ht_apds | weapon_platforms_any, projectile_classes_any, forbidden_classes | apds_round_for_this_chamber_confirmed | 0 / 0 / 478 |
| ht_apfsds | weapon_platforms_any | apfsds_round_for_this_chamber_confirmed | 0 / 0 / 478 |
| ht_baton | weapon_platforms_any, minimum_caliber_mm | dedicated_baton_round_design_confirmed | 0 / 0 / 478 |
| ht_beanbag | weapon_platforms_any, minimum_caliber_mm | beanbag_round_design_confirmed | 0 / 0 / 478 |
| ht_sapfsds | weapon_platforms_any, maximum_caliber_mm | flechette_load_design_confirmed | 0 / 0 / 478 |
| ht_underwater_dart | weapon_platforms_any | source_confirmed_underwater_dart_platform | 0 / 0 / 478 |
| ht_apdu | weapon_platforms_any | du_penetrator_round_design_confirmed | 0 / 0 / 478 |
| ht_apdsdu | weapon_platforms_any | apdsdu_round_design_confirmed | 0 / 0 / 478 |
| ht_apfsdsdu | weapon_platforms_any, minimum_caliber_mm | apfsdsdu_round_design_confirmed | 0 / 0 / 478 |
| ht_le | munition_classes_any | source_confirmed_shell_design, published_explosive_payload | 0 / 12 / 466 |
| ht_saple | munition_classes_any | source_confirmed_shell_design, published_follow_up_explosion | 0 / 0 / 478 |
| ht_apex | munition_classes_any | source_confirmed_shell_design, published_follow_up_explosion | 0 / 0 / 478 |
| ht_he | munition_classes_any | source_confirmed_he_payload, published_explosive_damage | 0 / 12 / 466 |
| ht_saphe | munition_classes_any | source_confirmed_saphe_design, published_explosive_damage | 0 / 0 / 478 |
| ht_saphec | munition_classes_any | source_confirmed_saphec_design, published_explosive_damage | 0 / 0 / 478 |
| ht_aphex | weapon_platforms_any, munition_classes_any | source_confirmed_aphex_design, published_explosive_damage | 0 / 0 / 478 |
| ht_efp | munition_classes_any, minimum_caliber_mm | source_confirmed_efp_design, published_efp_damage | 0 / 12 / 466 |
| ht_heat | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_heat_warhead, published_heat_damage | 0 / 12 / 466 |
| ht_hedp | munition_classes_any, minimum_caliber_mm | source_confirmed_hedp_design, published_explosive_damage | 0 / 12 / 466 |
| ht_hesh | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_hesh_design, published_explosive_damage | 0 / 12 / 466 |
| ht_ms_heat | munition_classes_any, minimum_caliber_mm | source_confirmed_tandem_warhead, published_precursor_and_main_charges | 0 / 12 / 466 |
| ht_thermobaric | munition_classes_any, minimum_caliber_mm | source_confirmed_thermobaric_design, published_explosive_damage | 0 / 12 / 466 |
| ht_illumination | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_flare_cartridge | 0 / 0 / 478 |
| ht_signal_flare | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_flare_cartridge | 0 / 0 / 478 |
| ht_smoke | munition_classes_any, minimum_caliber_mm | source_confirmed_smoke_munition, smoke_payload_specified | 0 / 0 / 478 |
| ht_colored_smoke | munition_classes_any, minimum_caliber_mm | source_confirmed_colored_smoke | 0 / 0 / 478 |
| ht_hot_smoke | munition_classes_any, minimum_caliber_mm | source_confirmed_hot_smoke | 0 / 0 / 478 |
| ht_prism_smoke | munition_classes_any, minimum_caliber_mm | source_confirmed_prism_smoke | 0 / 0 / 478 |
| ht_em_smoke | munition_classes_any, minimum_caliber_mm | source_confirmed_em_smoke | 0 / 0 / 478 |
| ht_tear_gas | munition_classes_any, minimum_caliber_mm | source_confirmed_tear_gas_shell, chemical_filler_selected | 0 / 0 / 478 |
| ht_tear_gas_vomit | munition_classes_any, minimum_caliber_mm | source_confirmed_tear_gas_shell, vomiting_agent_selected | 0 / 0 / 478 |
| ht_liquid | weapon_platforms_any, munition_classes_any | muzzle_velocity_below_500_fps_confirmed, liquid_filler_selected | 0 / 0 / 478 |
| ht_poison_gas | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_poison_gas_shell, chemical_filler_selected | 0 / 0 / 478 |
| ht_white_phosphorus | munition_classes_any, minimum_caliber_mm | source_confirmed_wp_shell | 0 / 12 / 466 |
| ht_canister | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | specific_canister_load_published, pellet_size_and_count_verified | 0 / 0 / 478 |
| ht_shotshell | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | chambering_accepts_shotshell, pellet_size_and_count_verified | 0 / 0 / 478 |
| ht_buck_and_ball | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_buck_and_ball_load | 0 / 0 / 478 |
| ht_shrapnel | weapon_platforms_any, munition_classes_any | weapon_specific_shrapnel_spec | 0 / 0 / 478 |
| ht_duplex | weapon_platforms_any, munition_classes_any | source_confirmed_duplex_chambering | 0 / 0 / 478 |
| ht_triplex | weapon_platforms_any, munition_classes_any | source_confirmed_triplex_chambering | 0 / 0 / 478 |
| ht_beehive | weapon_platforms_any, munition_classes_any | weapon_specific_beehive_spec | 0 / 0 / 478 |
| ht_multi_flechette | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | low_power_platform_confirmed, flechette_size_and_count_verified | 0 / 0 / 478 |
| ht_rubber_shot | weapon_platforms_any, munition_classes_any, minimum_caliber_mm | source_confirmed_rubber_shot_round, rubber_ball_size_and_count_verified | 0 / 0 / 478 |
| ht_abf | weapon_platforms_any, munition_classes_any | weapon_specific_abf_spec | 0 / 0 / 478 |
| ht_airburst | munition_classes_any, forbidden_classes | compatible_fuse_and_round_verified | 0 / 0 / 478 |
| ht_incendiary | projectile_classes_any | incendiary_cavity_or_combination_confirmed | 0 / 0 / 478 |
| ht_self_destruct | munition_classes_any, minimum_availability_tl | self_destruct_fuse_design_confirmed | 0 / 0 / 478 |
| ht_tracer | projectile_classes_any | tracer_component_for_this_round_confirmed | 0 / 0 / 478 |
| ht_light_case | munition_classes_any | light_case_compatible_with_pressure_and_manufacture | 0 / 0 / 478 |
| ht_caseless | munition_classes_any, case_types_any | weapon_explicitly_designed_for_caseless_ammo | 0 / 361 / 117 |
| ht_consumable_case | weapon_platforms_any, munition_classes_any, case_types_any | weapon_explicitly_designed_for_consumable_case | 0 / 363 / 115 |

## Regression and live verification

- New focused suite: 89/89 PASS. Before removal: all 479 functional tests passed; the strict four-file inventory test was intentionally deferred. After removal: full suite 482/482 PASS, including the four-file inventory. Previous 393 tests are retained with current version/hash expectations.
- Full semantic preservation, byte/hash checks, all 64 IDs/contracts, condition statuses, TL exception, combinations, native guards, damaged eligibility isolation and immutable snapshots are covered. No current loader path uses HT v1.2.
- HT178 remains 33 confirmed firing / 35 undetermined; source warnings for unconfirmed feeding/cycling remain intact. LT/HT/UT links and all four UT Paint pairs are preserved.
- Foundry 14.364: fresh isolated CatalogService/compatibility imports loaded all four actual catalogs ready. For Colt Python W1FMPB_-58qp_bH-M, the 64 option checks returned 0 compatible, 2 incompatible and 62 undetermined. HT178 33/35, UT Paint 4/4, repeated native Linked rejected. No world/Actor/pack writes or page reload. Normal startup through a full page reload was not exercised; existing cached API instances refresh on the next ordinary reload.

## Limits and follow-up

The eligibility vocabulary deliberately includes source_verified/purpose_built classes and special evidence that are not mapped in existing equipment/ammo records. Those cannot be reconstructed from names or calibers. Adding explicit source-backed platform/load mappings is still required for positive candidate selection. Branches described only by source_rule_note are retained as limitations, not invented predicates. Historical LT provenance remains unchanged and is never a fetch path.

No UI selection, AttackProfileResolver, GGA UUID mapping, automatic Linked/Follow-Up, damage transformation or magazine modification was implemented. Other local changes are preserved. No commit/push/merge/rebase.

## SHA-256

- HT v1.3: 435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385
- Updated Weapon Reference (only HT pointer): 165dfdce9fe4cccf9ca0a638deec5fce13711d8de0d22e53aee3adb52e060020
- docs/audit/olegurps_ht_64_structured_review_v1.json: f798ef64962490fc125bcc439fa06ecdcb8592d321b90ff83ec67c277142dcd3
- docs/audit/olegurps_ht64_source_review_v1.md: 3efa4745da92f5def6c1cd78d892a24cca5098164fccf5a8f2f28c6de82596b2
