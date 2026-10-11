# Historical initial ammunition compatibility audit

Historical snapshot: Weapon Reference 5.5 / LT 1.2 / HT 1.1 / UT 2.6. Its results do not describe the current catalog set; see ../ammunition-compatibility-report.md.

Date: 2026-10-09. Scope: immutable reference data only. Catalog files were not edited.

## Implementation

Created scripts/ammunition-compatibility-service.js, tests/ammunition-compatibility-service.test.mjs and these two documentation files. Changed scripts/main.js (import, singleton and API property) and tests/catalog-service.test.mjs (new constructor in lifecycle test). Other local changes are preserved.

CatalogService owns loading, version/ID/link validation and frozen records. The compatibility service builds private ID/HT178 rule indexes once per loaded catalog identity, delegates load() to CatalogService and returns deeply frozen independent snapshots. Queries made before readiness remain undetermined and can be retried after await load(). A failed catalog does not prevent queries against the others.

Statuses: compatible, incompatible, undetermined. Compatibility is not a claim that all payload rules, campaign availability or inventory requirements are complete. Warnings distinguish those issues from pair rejection.

LT: native bidirectional item/family links; projectile_options.applies_to matched only to explicit projectile_classes; accessory and GM conditions remain undetermined. HT: native exact-cartridge links and directly named HT178 exceptions; no reverse or transitive permission is synthesized. Revolver conditions use high-confidence mechanism.action_system. Textual options remain undetermined. UT: native family links; special-load links AND platform predicates; warheads evaluated against explicit family/profile, source, TL, platform, size, class, damage-type and homing constraints. Size is only a restriction after an explicit link. TL-dependent size requires explicit availabilityTL and warhead_class. Weapon/skill TL is never campaign availability.

Ammo items, families, projectile options, special loads, warheads and feed devices retain distinct kinds. SINGLE_USE_WHOLE_WEAPON additionally has resourceKind=single-use-whole-weapon. Feed devices, reference-only options and nonselectable records are rejected as ammunition. Linked/Follow-Up/Backblast are never indexed as cartridges. Alternate launcher generations are excluded from available ammunition.

## Confirmed query examples

| Book | Mode ID | Record ID | Result / evidence |
| --- | --- | --- | --- |
| LT | W4gnbkfxzHAYre3kO | lt_arbalest_bolt_lt81 | compatible; native bidirectional link |
| LT | W4gnbkfxzHAYre3kO | large_flaming_artillery_bolt | compatible variant; explicit artillery_bolt class; external-rule warning |
| HT | W1FMPB_-58qp_bH-M | ht_357_magnum_9x33mmr | compatible; native cartridge |
| HT | W1FMPB_-58qp_bH-M | ht_38_special_9x29mmr | compatible; directed HT178 revolver exception |
| HT | WGzlhKJ9A_d-LrvCX | ht_357_magnum_9x33mmr | incompatible; reverse permission absent |
| HT | WTadZ47v0MD21lmVk | ht_44_special_10_9x29mmr | incompatible; break-action does not satisfy revolver exception |
| HT | WYtq-OBcCaZp7ShJJ | ht_specific_milan_103_heat | compatible; native guided missile and explicit platform |
| HT | WYtq-OBcCaZp7ShJJ | ht_specific_milan2_115mm_heat | incompatible; alternate launcher generation |
| UT | WlstnlxI_Mm-2UJf0 | 15mm_cl | compatible; native family |
| UT | WlstnlxI_Mm-2UJf0 | he | compatible warhead; explicit profile constraints |
| UT | WfcQvWVcsBWPUShFm | drugged_dart | compatible special load; user payload details required |
| UT | Wg_f0E5hqv6o1C0Uj | paint_pellet | undetermined; positive link conflicts with concrete required tags |

## Every unconfirmed textual HT option

64 records. Each entry below identifies its collection path, exact conditions and a proposed DATA improvement. These options have no explicit applicable mode/item IDs or complete structured platform predicate. Consequently the service does not confirm them for any particular HT mode. The listed textual conditions are not translated into guessed weapon classifications. Native source_specific_payload/load_variant data stays separate from generic option application; existing native effects must not be applied twice.

### ht_plus_p

- `cartridge_upgrades.applies_to`: `"suitable powder-and-shot or fixed ammunition after firearm pressure safety check"`
- `cartridge_upgrades.mechanics`: `{"damage_multiplier":1.1,"range_multiplier":1.1,"st_multiplier":1.1,"cost_multiplier":1.5,"malfunction_penalty_possible":-1}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_match_grade

- `cartridge_upgrades.applies_to`: `"non-automatic weapons firing Solid/HP/AP/APHC bullets"`
- `cartridge_upgrades.mechanics`: `{"accuracy_multiplier":1.25,"accuracy_rounding":"floor","accuracy_bonus_cap":1,"cost_multiplier":2}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_match_handloaded

- `cartridge_upgrades.applies_to`: `"handloaded cased rounds matched to one specified gun, non-automatic"`
- `cartridge_upgrades.mechanics`: `{"accuracy_multiplier":1.5,"accuracy_rounding":"floor","accuracy_bonus_cap":2,"armoury_and_iq_guns_roll_required":true,"cost_multiplier":1}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 174; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_subsonic_pistol

- `cartridge_upgrades.applies_to`: `"fixed supersonic pistol rounds; no change for naturally subsonic rounds"`
- `cartridge_upgrades.mechanics`: `{"hearing_modifier":-1,"range_multiplier":0.8,"cost_multiplier":1.3}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_subsonic_rifle

- `cartridge_upgrades.applies_to`: `"fixed supersonic PDW/rifle rounds only"`
- `cartridge_upgrades.mechanics`: `{"hearing_modifier":-2,"damage_multiplier":0.6,"range_multiplier":0.6,"cost_multiplier":1.3}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_silent

- `cartridge_upgrades.applies_to`: `"cased ammunition with a specially designed weapon or a documented compatible design"`
- `cartridge_upgrades.mechanics`: `{"hearing_table_distance_yards":16,"cost_multiplier":10,"requires_special_firearm":true}`
- `cartridge_upgrades.gm_decision_required`: `false`
- `cartridge_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_solid

- `projectile_options.applies_to`: `"standard solid bullets and most cannon solid shot"`
- `projectile_options.mechanics`: `{"baseline":true}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 166; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_rifled_slug

- `projectile_options.applies_to`: `"shotgun shotshell platform"`
- `projectile_options.mechanics`: `{"damage_multiplier_vs_buckshot":4,"type_for_gauge_at_least_20":"pi++","type_for_gauge_below_20":"pi+","accuracy_add":1,"half_damage_range_multiplier":2.5,"max_range_multiplier":1.5,"remove_rof_pellet_multiplier":true}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 166; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_hollow_point

- `projectile_options.applies_to`: `"piercing solid bullet compatible with HP construction"`
- `projectile_options.mechanics`: `{"armor_divisor":0.5,"zero_dr_treated_as":1,"piercing_shift_up":1,"cost_multiplier":1,"tl5_to_7_automatic_malf_penalty":-1,"low_velocity_expansion_roll_1d_max":"TL-3, optional"}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 166-167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_poison

- `projectile_options.applies_to`: `"handloaded hollow-point compatible bullet"`
- `projectile_options.mechanics`: `{"base_variant":"ht_hollow_point","follow_up":"dose of selected blood or contact agent","cost_add":"one poison dose"}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_ap

- `projectile_options.applies_to`: `"kinetic solid bullets"`
- `projectile_options.mechanics`: `{"damage_multiplier":0.7,"armor_divisor":2,"piercing_shift_down_if_caliber_lt_mm":20,"cost_multiplier":1.5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_aphc

- `projectile_options.applies_to`: `"kinetic solid projectiles"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"piercing_shift_down_if_caliber_lt_mm":20,"cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_frangible

- `projectile_options.applies_to`: `"kinetic solid projectile or converted rifled slug"`
- `projectile_options.mechanics`: `{"armor_divisor":0.5,"zero_dr_treated_as":1,"piercing_shift_up":1,"range_multiplier":0.9,"cost_multiplier":1.5,"no_overpenetration_against_dr":true}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apds

- `projectile_options.applies_to`: `"cannon and autocannon; small arms rifle/MG with proven cartridge, not pistol rounds"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"damage_multiplier":1.3,"piercing_shift_down_if_caliber_lt_mm":30,"range_multiplier":1.5,"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apfsds

- `projectile_options.applies_to`: `"tank guns; suitable autocannon and some anti-materiel rifles at TL8"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"damage_multiplier":1.5,"piercing_rule_if_lt_40mm":"pi++ -> pi; pi+|pi -> pi-","range_multiplier":2,"cost_multiplier":4}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 167; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_baton

- `projectile_options.applies_to`: `"shotgun and grenade launchers with supported caliber"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"start_from":"rifled_slug for shotgun","armor_divisor":0.5,"damage_multiplier":0.2,"damage_type":"cr","double_knockback_if_caliber_gt_mm":35,"accuracy_add":-1,"range_multiplier":0.2,"cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 168; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_beanbag

- `projectile_options.applies_to`: `"suitable shotguns, launcher rounds, selected revolvers"`
- `projectile_options.mechanics`: `{"min_caliber_mm":9,"start_from":"rifled_slug for shotgun","armor_divisor":0.2,"damage_multiplier":0.2,"damage_type":"cr","double_knockback_if_caliber_gte_mm":15,"accuracy_set":0,"range_multiplier":0.125,"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 168; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_sapfsds

- `projectile_options.applies_to`: `"rifle and special flechette weapons, not generic cannon"`
- `projectile_options.mechanics`: `{"max_caliber_mm":10,"armor_divisor":2,"damage_type":"pi-","range_multiplier":1.5,"cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 168; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_underwater_dart

- `projectile_options.applies_to`: `"dedicated smoothbore underwater weapons only"`
- `projectile_options.mechanics`: `{"damage_type":"imp","underwater_distance_multiplier":25,"cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apdu

- `projectile_options.applies_to`: `"primarily autocannon; source-confirmed compatible projectiles"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"damage_multiplier":1.2,"piercing_shift_down_if_caliber_lt_mm":20,"cost_multiplier":3,"incendiary_if_penetrates_nonflexible_dr_gte":10}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apdsdu

- `projectile_options.applies_to`: `"primarily suitable autocannon"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"damage_multiplier":1.5,"piercing_shift_down_if_caliber_lt_mm":30,"range_multiplier":1.5,"cost_multiplier":4,"incendiary_if_penetrates_nonflexible_dr_gte":10}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apfsdsdu

- `projectile_options.applies_to`: `"tank guns and selected autocannon"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"armor_divisor":2,"damage_multiplier":1.7,"piercing_rule_if_lt_40mm":"pi++ -> pi+; pi+ -> pi","range_multiplier":2,"cost_multiplier":5,"incendiary_if_penetrates_nonflexible_dr_gte":10}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_le

- `projectile_options.applies_to`: `"suitable shells, not automatically small arms"`
- `projectile_options.mechanics`: `{"armor_divisor":0.5,"secondary":"linked cr ex plus cutting fragmentation","cost_multiplier":2,"explosion_dice":"source_weapon_or_gm"}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_saple

- `projectile_options.applies_to`: `"suitable purpose-built exploding shells"`
- `projectile_options.mechanics`: `{"secondary":"follow_up internal cr ex + cutting fragmentation","cost_multiplier":2,"tl5_6_explosion_success_1d":"TL-2 or less"}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_apex

- `projectile_options.applies_to`: `"suitable armor-piercing explosive shell"`
- `projectile_options.mechanics`: `{"damage_multiplier":0.7,"armor_divisor":2,"piercing_shift_down_if_caliber_lt_mm":20,"secondary":"follow_up internal cr ex + cutting fragmentation","cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_he

- `projectile_options.applies_to`: `"high explosive shells with explicit source effect"`
- `projectile_options.mechanics`: `{"armor_divisor":0.5,"secondary":"linked cr ex and cutting fragmentation","cost_multiplier":2,"explosion_dice":"source_weapon_or_gm"}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_saphe

- `projectile_options.applies_to`: `"suitable bursting shell"`
- `projectile_options.mechanics`: `{"secondary":"follow_up cr ex + cutting fragmentation","cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_saphec

- `projectile_options.applies_to`: `"suitable bursting shell"`
- `projectile_options.mechanics`: `{"secondary":"follow_up cr ex","cost_multiplier":2,"limited_fragmentation":true}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 169; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_aphex

- `projectile_options.applies_to`: `"heavy machine guns and suitable autocannon"`
- `projectile_options.mechanics`: `{"armor_divisor":2,"piercing_shift_down_if_caliber_lt_mm":20,"secondary":"follow_up cr ex + cutting fragmentation","cost_multiplier":4}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_efp

- `projectile_options.applies_to`: `"shaped-charge munition designed for EFP"`
- `projectile_options.mechanics`: `{"min_caliber_mm":50,"damage_type":"pi++","armor_divisor":2,"secondary":"linked cr ex","cost_multiplier":8}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_heat

- `projectile_options.applies_to`: `"shaped-charge grenade/rocket/cannon payload, caliber gate necessary but not sufficient"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"armor_divisor":10,"secondary":"linked cr ex","cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_hedp

- `projectile_options.applies_to`: `"compatible multipurpose grenade/rocket shell"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"armor_divisor":10,"secondary":"linked cr ex and cutting fragmentation","cost_multiplier":4}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_hesh

- `projectile_options.applies_to`: `"tank guns and recoilless rifles only"`
- `projectile_options.mechanics`: `{"min_caliber_mm":50,"armor_divisor":0.5,"secondary":"linked cr ex","spall_damage_rule":"10% of maximum blast vs 1/100 DR (ceil), unless laminated armor","cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_ms_heat

- `projectile_options.applies_to`: `"designed tandem-charge tank/rocket/missile payload"`
- `projectile_options.mechanics`: `{"min_caliber_mm":50,"armor_divisor":10,"secondary":"linked cr ex","cumulative_damage_without_era":true,"cost_multiplier":8}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_thermobaric

- `projectile_options.applies_to`: `"designed thermobaric grenade/rocket payload"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"armor_divisor":0.5,"secondary":"linked cr ex","explosion_falloff":"damage divided by 2 × distance in yards","cost_multiplier":8}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 170; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_illumination

- `projectile_options.applies_to`: `"flare-bearing shell and launchers"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"vision_penalty_limit":-3,"on_contact_burn_per_second":"1d, max 10 seconds","cost_multiplier":5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_signal_flare

- `projectile_options.applies_to`: `"signal-pistol and flare compatible launchers"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"vision_penalty_limit":-5,"on_contact_burn_per_second":"1d, max 10 seconds","cost_multiplier":5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_smoke

- `projectile_options.applies_to`: `"designed smoke shells and low-velocity canisters"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"vision_penalty":-10,"cloud_build_seconds_per_5_yards":1,"cloud_minutes":"1-4","armor_divisor":0.5,"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_colored_smoke

- `projectile_options.applies_to`: `"designed smoke shells"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"vision_penalty":-7,"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_hot_smoke

- `projectile_options.applies_to`: `"designed smoke shells"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"affects":["infravision","hyperspectral_vision"],"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_prism_smoke

- `projectile_options.applies_to`: `"designed smoke shells"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"affects":["hot_smoke","laser_beams"],"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_em_smoke

- `projectile_options.applies_to`: `"designed smoke shells"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"affects":["hot_smoke","radar","imaging_radar"],"cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_tear_gas

- `projectile_options.applies_to`: `"compatible teargas shells, vapor must reach target"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"resistance":[{"attribute":"HT","modifier":-2,"failure":"coughing"},{"attribute":"HT","modifier":-2,"failure":"temporary Blindness"}],"vision_penalty_per_yard":-3,"vision_penalty_cap":-10,"duration":"while exposed + MoF minutes","cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_tear_gas_vomit

- `projectile_options.applies_to`: `"compatible teargas shells with selected vomiting agent"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"resistance":[{"attribute":"HT","modifier":-2,"failure":"coughing"},{"attribute":"HT","modifier":-2,"failure":"Blindness"},{"attribute":"HT","modifier":-2,"failure":"retching"}],"retching_duration":"exposure + 5×MoF minutes","cost_multiplier":3}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_liquid

- `projectile_options.applies_to`: `"low-power smoothbores only (muzzle velocity below 500 fps)"`
- `projectile_options.mechanics`: `{"armor_divisor":0.2,"damage_multiplier":0.5,"damage_type":"cr","range_multiplier":0.25,"secondary":"linked chosen liquid filler","cost_multiplier":1}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 171-172; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_poison_gas

- `projectile_options.applies_to`: `"purpose-made artillery/launchers"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"armor_divisor":0.5,"secondary":"follow_up cr ex plus linked specified poison gas","cost_depends_on_filler":true}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 172; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_white_phosphorus

- `projectile_options.applies_to`: `"purpose-made WP shells, not generic firearm ammunition"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"armor_divisor":0.5,"secondary":"follow_up burn ex and burning fragments; linked smoke","fragment_repeated_damage":"1d(0.2) burn each 10s up to 60s","brush_off_roll":"DX","cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 172; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_canister

- `projectile_options.applies_to`: `"artillery with compatible canister load"`
- `projectile_options.mechanics`: `{"min_caliber_mm":20,"damage_multiplier":"1/sqrt(number_projectiles)","damage_type":"pi+ or pi++ by pellet size","half_damage_range_yards":"pellet_mm × 5","max_range_yards":"pellet_mm × 50","rof_multiplier":"NP","recoil_set":1}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 172-173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_shotshell

- `projectile_options.applies_to`: `"compatible shotgun and selected smoothbore/handgun chamberings"`
- `projectile_options.mechanics`: `{"min_caliber_mm":5,"damage_multiplier":"1/sqrt(number_projectiles)","damage_type":"by shot size","half_damage_range_yards":"pellet_mm × 5","max_range_yards":"pellet_mm × 100","rof_multiplier":"NP","recoil_set":1}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_buck_and_ball

- `projectile_options.applies_to`: `"smoothbore musket or shotgun"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"ball_damage":"base","pellet_damage":"1d+1 pi each","ball_range_multiplier":0.9,"recoil_set":1}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_shrapnel

- `projectile_options.applies_to`: `"specific artillery with published shrapnel round"`
- `projectile_options.mechanics`: `{"half_damage_range":null,"max_range":"burst_distance from weapon","cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_duplex

- `projectile_options.applies_to`: `"compatible revolver/bolt-action rifle (TL6+) or automatic rifle (TL7+)"`
- `projectile_options.mechanics`: `{"damage_multiplier":0.85,"range_multiplier":0.5,"rof_multiplier":2,"recoil_set":1,"cost_multiplier":1.5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_triplex

- `projectile_options.applies_to`: `"compatible revolver/bolt-action rifle (TL6+) or automatic rifle (TL7+)"`
- `projectile_options.mechanics`: `{"damage_multiplier":0.7,"range_multiplier":0.3333333333333333,"rof_multiplier":3,"recoil_set":1,"cost_multiplier":1.5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_beehive

- `projectile_options.applies_to`: `"specific tank/recoilless/light artillery weapon with beehive load"`
- `projectile_options.mechanics`: `{"half_damage_range":null,"max_range":"burst_distance","damage_type":"cut","cost_multiplier":5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 173; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_multi_flechette

- `projectile_options.applies_to`: `"low-powered large-bore shotgun/grenade launcher"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"damage_type":"pi-","damage_multiplier":"1/sqrt(NP)","half_damage_range_yards":"flechette_mm×50","max_range_yards":"flechette_mm×600","rof_multiplier":"NP","recoil_set":1,"cost_multiplier":4}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 174; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_rubber_shot

- `projectile_options.applies_to`: `"suitable shotgun and riot rounds"`
- `projectile_options.mechanics`: `{"min_caliber_mm":10,"damage_type":"cr","armor_divisor":0.2,"damage_multiplier":"1/sqrt(NP)","half_damage_range_yards":"ball_mm×2","max_range_yards":"ball_mm×10","rof_multiplier":"NP","recoil_set":1,"cost_multiplier":2}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 174; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_abf

- `projectile_options.applies_to`: `"published aircraft missile/autocannon payload"`
- `projectile_options.mechanics`: `{"cost_multiplier":5}`
- `projectile_options.gm_decision_required`: `false`
- `projectile_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 174; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_airburst

- `projectile_upgrades.applies_to`: `"compatible explosive projectile/fuse"`
- `projectile_upgrades.mechanics`: `{"tl5_6_area_attack_to_hit_bonus":3,"tl5_6_air_target_to_hit_bonus":1,"tl7_8_area_attack_to_hit_bonus":4,"scatter_distance_on_failure":"MoF squared","cost_multiplier":1.5}`
- `projectile_upgrades.gm_decision_required`: `false`
- `projectile_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 174-175; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_incendiary

- `projectile_upgrades.applies_to`: `"solid or source-confirmed AP/APHC projectiles"`
- `projectile_upgrades.mechanics`: `{"damage_modifier":"inc","cost_multiplier":1.5}`
- `projectile_upgrades.gm_decision_required`: `false`
- `projectile_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 175; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_self_destruct

- `projectile_upgrades.applies_to`: `"explosive projectiles with fuse, late TL6+"`
- `projectile_upgrades.mechanics`: `{"self_destruct_distance":"typically half damage range","cost_multiplier":1.5}`
- `projectile_upgrades.gm_decision_required`: `false`
- `projectile_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 175; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_tracer

- `projectile_upgrades.applies_to`: `"most bullets and even multiple-projectile loads with tracer component"`
- `projectile_upgrades.mechanics`: `{"damage_modifier":"inc within half_damage_range","skill_bonus":1,"bonus_trigger":"turn immediately after long automatic burst","reveals_shooter":true,"cost_multiplier":1.5}`
- `projectile_upgrades.gm_decision_required`: `false`
- `projectile_upgrades.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 175; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_light_case

- `case_construction_options.applies_to`: `"most cased small-arms cartridges by mid-TL8"`
- `case_construction_options.mechanics`: `{"wps_multiplier":0.7,"cost_multiplier":2}`
- `case_construction_options.gm_decision_required`: `false`
- `case_construction_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 164; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_caseless

- `case_construction_options.applies_to`: `"only expressly caseless-designed guns"`
- `case_construction_options.mechanics`: `{"requires_compatible_weapon":true}`
- `case_construction_options.gm_decision_required`: `false`
- `case_construction_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 164-165; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

### ht_consumable_case

- `case_construction_options.applies_to`: `"designated rifle or cannon only"`
- `case_construction_options.mechanics`: `{"requires_compatible_weapon":true}`
- `case_construction_options.gm_decision_required`: `false`
- `case_construction_options.is_selectable`: `true`
- Reason: No structured link or complete platform predicate confirms this HT option for a concrete mode.
- Recommended data correction: Verify HT 164; encode explicit applicable ammo/platform IDs and structured safety, construction and payload conditions. Do not use caliber alone. Represent each condition in the applies_to text above, including exclusions/required filler or GM decisions, as explicit predicates rather than just retaining a descriptive string.

## Every unresolved HT178 data rule

6 rule definitions. Explicit mode IDs are derived from native links of the named source cartridges. They are candidate contexts only; this is not permission for every listed mode.

### HT178 rule 2 / UNVERIFIED_HT178_CONDITION

- IDs: `{"from":["ht_44_special_10_9x29mmr"],"targets":[{"label":".44 Russian","ids":["ht_44_russian_11x25mmr"]},{"label":".44 American","ids":["ht_44_american_11x23mmr"]}],"modeIds":["Wxi1b6NRfsJxqbotx","WzaEgR-kwdhso6lo2"]}`
- Fields: `{"interchangeability_rules[2]":{"from":".44 Special","to":[".44 Russian",".44 American"],"requires":"revolver; chamber sufficiently long"}}`
- Reason: Chamber length, action or shorter-shell permission is not fully encoded for a concrete platform.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

### HT178 rule 6 / UNVERIFIED_HT178_CONDITION

- IDs: `{"from":["ht_45_long_colt"],"targets":[{"label":".45 S&W","ids":["ht_45_s_w_11_43x28mmr"]}],"modeIds":["WDr3xbILdqBzbwDka","WIoIaMUXecXYsSkUS","WbDlTUNcqJkmW6KLu","WoELTMe_KWWK4grLz"]}`
- Fields: `{"interchangeability_rules[6]":{"from":".45 Long Colt","to":[".45 S&W"],"requires":"revolver compatible chamber"}}`
- Reason: Chamber length, action or shorter-shell permission is not fully encoded for a concrete platform.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

### HT178 rule 11 / UNVERIFIED_HT178_CONDITION

- IDs: `{"from":["ht_22_long_rifle_5_7x16mmr"],"targets":[{"label":".22 Short","ids":["ht_22_short_5_6x11mmr"]}],"modeIds":["W09RarXVw2-ZAi-dC","W6bfzGQAngvdHu-iw","W6dgs1HSukosk0BM2","WK4QvDEDBTOGUOZ9D","WL0SlLUJxX2V_3KVh","WM8_OFbrJKJFziyfC","WXXqZ-u9AGxWAhfph","WlalvGJfGaAfR_YFJ","WmGJcfhuw4OrotOVu","WwlfY-FYthqkLvByK","WxsT21EBYb72XKYe_"]}`
- Fields: `{"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"}}`
- Reason: Chamber length, action or shorter-shell permission is not fully encoded for a concrete platform.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

### HT178 rule 12 / UNVERIFIED_HT178_CONDITION

- IDs: `{"from":["ht_20_gauge_2_75_15_56x70mmr"],"targets":[{"label":"20-gauge 2.5\"","ids":["ht_20_gauge_2_5_15_56x63mmr"]}],"modeIds":["WQTnqCZPMYRO8JrrL","WZvZ89iM4Kxz6xpoN","WsR6R-QL06g6aAm50","WziWTyBAQ6_3yc8fX"]}`
- Fields: `{"interchangeability_rules[12]":{"from":"20-gauge 2.75\"","to":["20-gauge 2.5\""],"requires":"weapon and chamber can use shorter shell"}}`
- Reason: Chamber length, action or shorter-shell permission is not fully encoded for a concrete platform.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

### HT178 rule 13 / AMBIGUOUS_RULE_REFERENCE

- IDs: `{"from":["ht_12_gauge_3_18_5x76mmr"],"targets":[{"label":"12-gauge 2.75\"","ids":["ht_12_gauge_2_75_18_5x70mmr","ht_12_gauge_2_75_18_5x70mmr_heavy_load"]},{"label":"12-gauge 2.5\"","ids":["ht_12_gauge_2_5_18_5x63mmr"]}],"modeIds":["W6LVJ8YGACnNB5h-S","W9LBQ9LeKd3uB9nSZ","WH-pkGPARCbK4CP4h","WLp8euYFMi9Oikpjp","WT-PUA77JBHLiLTPo","WaPnC1R8aLAvhe3rt","WcLG_XsJVbZ6CIT4p","WmeBcFEjqKNri5FAm"]}`
- Fields: `{"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"}}`
- Reason: Named cartridge reference is not unique.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

### HT178 rule 14 / AMBIGUOUS_RULE_REFERENCE

- IDs: `{"from":["ht_12_gauge_2_75_18_5x70mmr","ht_12_gauge_2_75_18_5x70mmr_heavy_load"],"targets":[{"label":"12-gauge 2.5\"","ids":["ht_12_gauge_2_5_18_5x63mmr"]}],"modeIds":["W19ooSM10ivSwlXSP","W2EHajHoWWSlF8B6z","W8gU1gCeSF_EHefLt","W9ki0p3eZ0dV761l1","WG5D9pES9jpedWQBK","WGhQ3o1Zo4QfXJRmy","WHlBefAVM5F3s_Fhx","WIKNLT8GtI6laTFbn","WSu2puv__x3S7ILvR","WUVxWN3HdmeKHmjv1","WVWyvqKW9KEoQ0dnM","WWpYkEgZSXCKAroUP","WedfHYdjmjQy4JdzJ","WepHIL4DWLPsoO8HC","Wku81Y3GfqPAjHV-Y","WkzlenFdgtlwesK-q","WmJ_QjDBYJH7Tmona","WsrbLU9pLyDPhDI5-","Wu7wxc-g32vPxG2B-","WvUFCokYczEuOg49b","Wx10NaVSr1cp1bwKv"]}`
- Fields: `{"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"}}`
- Reason: Named cartridge reference is not unique.
- Recommended data correction: Verify HT178; replace named references with explicit cartridge IDs and store directed platform/chamber conditions.

## UT Paint Gun: all four unresolved pairs

The catalogs explicitly link both Paint Carbine (equipment eRELs7fsg3GPD9j4s) and Paint Pistol (equipment ezQVq8VFK4g0wBsKF) to paint_pellet and biochemical_liquid_pellet. Both modes use family 15mm_air and profile tags air_gun, gun, paint_gun, projectile. Both special loads require ANY OF paint_pistol, paint_carbine. No tag alias, inheritance or rule says that paint_gun satisfies either concrete tag.

These fields describe distinct checks: special_load_ids supplies positive candidate links, while platform_tags_any restricts applicability. They can coexist consistently only when the linked platform satisfies at least one required tag. In the current data none does. This is a machine-readable tag-vocabulary conflict/underspecification, not evidence that the underlying UT139 rule prohibits paint ammunition. Weapon names alone do not authorize aliasing. The service therefore returns undetermined for these explicitly linked pairs rather than either approving them or claiming rules-level incompatibility. The matching 15mm size does not repair the tag check. biochemical_liquid_pellet.warhead_ref=biochemical_liquid passes its independent 15mm payload-size check; it does not solve the platform mismatch.

### Wg_f0E5hqv6o1C0Uj / paint_pellet

- Equipment ID: `eRELs7fsg3GPD9j4s`
- Fields: `{"ammunition_profile.special_load_ids":["paint_pellet","biochemical_liquid_pellet"],"ammunition_profile.platform_tags":["air_gun","gun","paint_gun","projectile"],"special_loads.platform_tags_any":["paint_pistol","paint_carbine"]}`
- Reason: The positive special-load link and mandatory platform tag predicate cannot both pass; no tag hierarchy is declared.
- Recommended data correction: Verify UT139 and the intended tag vocabulary. Then explicitly add the confirmed concrete platform tags or broaden the load predicate to paint_gun with source evidence. Do not infer aliases from names. Keep the narrow concrete-tag approach if those loads are meant only for these two platforms; broaden to paint_gun only after checking that every paint_gun platform should be allowed. No catalog change was made.

### W5Xb6neoqVfdlbqiS / paint_pellet

- Equipment ID: `ezQVq8VFK4g0wBsKF`
- Fields: `{"ammunition_profile.special_load_ids":["paint_pellet","biochemical_liquid_pellet"],"ammunition_profile.platform_tags":["air_gun","gun","paint_gun","projectile"],"special_loads.platform_tags_any":["paint_pistol","paint_carbine"]}`
- Reason: The positive special-load link and mandatory platform tag predicate cannot both pass; no tag hierarchy is declared.
- Recommended data correction: Verify UT139 and the intended tag vocabulary. Then explicitly add the confirmed concrete platform tags or broaden the load predicate to paint_gun with source evidence. Do not infer aliases from names. Keep the narrow concrete-tag approach if those loads are meant only for these two platforms; broaden to paint_gun only after checking that every paint_gun platform should be allowed. No catalog change was made.

### Wg_f0E5hqv6o1C0Uj / biochemical_liquid_pellet

- Equipment ID: `eRELs7fsg3GPD9j4s`
- Fields: `{"ammunition_profile.special_load_ids":["paint_pellet","biochemical_liquid_pellet"],"ammunition_profile.platform_tags":["air_gun","gun","paint_gun","projectile"],"special_loads.platform_tags_any":["paint_pistol","paint_carbine"]}`
- Reason: The positive special-load link and mandatory platform tag predicate cannot both pass; no tag hierarchy is declared.
- Recommended data correction: Verify UT139 and the intended tag vocabulary. Then explicitly add the confirmed concrete platform tags or broaden the load predicate to paint_gun with source evidence. Do not infer aliases from names. Keep the narrow concrete-tag approach if those loads are meant only for these two platforms; broaden to paint_gun only after checking that every paint_gun platform should be allowed. No catalog change was made.

### W5Xb6neoqVfdlbqiS / biochemical_liquid_pellet

- Equipment ID: `ezQVq8VFK4g0wBsKF`
- Fields: `{"ammunition_profile.special_load_ids":["paint_pellet","biochemical_liquid_pellet"],"ammunition_profile.platform_tags":["air_gun","gun","paint_gun","projectile"],"special_loads.platform_tags_any":["paint_pistol","paint_carbine"]}`
- Reason: The positive special-load link and mandatory platform tag predicate cannot both pass; no tag hierarchy is declared.
- Recommended data correction: Verify UT139 and the intended tag vocabulary. Then explicitly add the confirmed concrete platform tags or broaden the load predicate to paint_gun with source evidence. Do not infer aliases from names. Keep the narrow concrete-tag approach if those loads are meant only for these two platforms; broaden to paint_gun only after checking that every paint_gun platform should be allowed. No catalog change was made.

## Other limits

- LT GM-selected size/filler and required accessory/skill/powder-bag conditions are not auto-approved. Crossbow bolt stiffness/size and external rules are not fabricated.
- UT homing_projectile_support=source-conditional-by-guidance-and-size does not confirm a concrete SEFOP variant. mininuke/micro_antimatter require availabilityTL and explicit class. The optional higher-TL family exception for WkhAN9tcmB9eEkmY6 / 7mm_em remains undetermined.
- HT rocket platform generations and incomplete missile contracts (Javelin Follow-Up, Hydra RoF, Range semantics) are unchanged. This service confirms only the reference relationship, not the attack mechanics.
- Missing file, unavailable catalog, unknown ID, broken validated references or unknown future predicates return undetermined with a cause. Known excluded pair returns incompatible.
- ARCH-04 GGA UUID mapping, AttackProfileResolver, inventory/UI selection and rocket gameplay are outside this implementation.

## Verification

New focused tests: 41/41 PASS. Full Node project suite: 307/307 PASS (previous 266 tests preserved). Syntax and UTF-8 checks cover all edited JS/MJS. Catalog byte SHA-256 is unchanged and verified by tests.

Live Foundry 14.364: dynamically imported only the new pure service, using the already-loaded module CatalogService. LT base ammo, directed HT exception and UT HE returned compatible; Paint Carbine paint_pellet returned undetermined with CONFLICTING_SPECIAL_LOAD_TAGS. No page reload, Actor/world mutation or gameplay roll was performed. Normal main.js lifecycle/API registration is covered by automated tests; the new API property becomes available on the normal next reload.

No commit, push, merge or rebase was executed.

### Unchanged catalog hashes

- Weapon Reference 5.5 (historical): `a111f79a181f2f938eaebc5c1fbf82d90cd457a77d1ca43d91cd382a5d3d3cf0`
- olegurps_lt_ammunition_catalog_v1_2.json: `2e520c12f437ca917ab87cf6322128ce2e4776f7abd7e1a547503681a0914cdd`
- High-Tech 1.1 (historical): `b29bd4b85738aa99b5a001256c9e7299e18ab1c5677ed1d8ca59ddbd140c6b1e`
- Ultra-Tech 2.6 (historical): `20c136ae5dcca340998746eee767fcf90643e5cbcfcb35f7a9311a471a5bdadf`

## Every concrete unresolved HT178 mode/cartridge pair

74 pairs derived from native source-cartridge mode links. Each remains undetermined rather than confirming a textual chamber condition. This enumerates actual catalog candidates in addition to the six rule-definition issues above.

### Ww5uVCQTmwaTVQ48Y / ht_44_special_10_9x29mmr

- Rule index: 1
- JSON fields: {"interchangeability_rules[1]":{"from":".44 Magnum","to":[".44 Special",".44 Russian",".44 American"],"requires":"revolver chambered for .44 Magnum"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver chambered for .44 Magnum"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Ww5uVCQTmwaTVQ48Y / ht_44_russian_11x25mmr

- Rule index: 1
- JSON fields: {"interchangeability_rules[1]":{"from":".44 Magnum","to":[".44 Special",".44 Russian",".44 American"],"requires":"revolver chambered for .44 Magnum"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver chambered for .44 Magnum"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Ww5uVCQTmwaTVQ48Y / ht_44_american_11x23mmr

- Rule index: 1
- JSON fields: {"interchangeability_rules[1]":{"from":".44 Magnum","to":[".44 Special",".44 Russian",".44 American"],"requires":"revolver chambered for .44 Magnum"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver chambered for .44 Magnum"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Wxi1b6NRfsJxqbotx / ht_44_russian_11x25mmr

- Rule index: 2
- JSON fields: {"interchangeability_rules[2]":{"from":".44 Special","to":[".44 Russian",".44 American"],"requires":"revolver; chamber sufficiently long"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT97"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver; chamber sufficiently long"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Wxi1b6NRfsJxqbotx / ht_44_american_11x23mmr

- Rule index: 2
- JSON fields: {"interchangeability_rules[2]":{"from":".44 Special","to":[".44 Russian",".44 American"],"requires":"revolver; chamber sufficiently long"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT97"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver; chamber sufficiently long"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WzaEgR-kwdhso6lo2 / ht_44_russian_11x25mmr

- Rule index: 2
- JSON fields: {"interchangeability_rules[2]":{"from":".44 Special","to":[".44 Russian",".44 American"],"requires":"revolver; chamber sufficiently long"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT94"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver; chamber sufficiently long"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WzaEgR-kwdhso6lo2 / ht_44_american_11x23mmr

- Rule index: 2
- JSON fields: {"interchangeability_rules[2]":{"from":".44 Special","to":[".44 Russian",".44 American"],"requires":"revolver; chamber sufficiently long"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT94"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver; chamber sufficiently long"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WDr3xbILdqBzbwDka / ht_45_s_w_11_43x28mmr

- Rule index: 6
- JSON fields: {"interchangeability_rules[6]":{"from":".45 Long Colt","to":[".45 S&W"],"requires":"revolver compatible chamber"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"SA","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: single-action revolvers have RoF 1"],"source_reference":"HT95"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver compatible chamber"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WIoIaMUXecXYsSkUS / ht_45_s_w_11_43x28mmr

- Rule index: 6
- JSON fields: {"interchangeability_rules[6]":{"from":".45 Long Colt","to":[".45 S&W"],"requires":"revolver compatible chamber"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"SA","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: single-action revolvers have RoF 1"],"source_reference":"HT95"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver compatible chamber"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WbDlTUNcqJkmW6KLu / ht_45_s_w_11_43x28mmr

- Rule index: 6
- JSON fields: {"interchangeability_rules[6]":{"from":".45 Long Colt","to":[".45 S&W"],"requires":"revolver compatible chamber"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT96"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver compatible chamber"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WoELTMe_KWWK4grLz / ht_45_s_w_11_43x28mmr

- Rule index: 6
- JSON fields: {"interchangeability_rules[6]":{"from":".45 Long Colt","to":[".45 S&W"],"requires":"revolver compatible chamber"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"SA","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: single-action revolvers have RoF 1"],"source_reference":"HT94"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"revolver compatible chamber"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WHsI3V0zdU2TUI6w7 / ht_455_webley_11_5x19mmr

- Rule index: 7
- JSON fields: {"interchangeability_rules[7]":{"from":".476 Enfield","to":[".455 Webley",".450 Adams",".442 RIC"],"requires":"compatible revolver"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"compatible revolver"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WHsI3V0zdU2TUI6w7 / ht_450_adams_12_05x17mmr

- Rule index: 7
- JSON fields: {"interchangeability_rules[7]":{"from":".476 Enfield","to":[".455 Webley",".450 Adams",".442 RIC"],"requires":"compatible revolver"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"compatible revolver"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WHsI3V0zdU2TUI6w7 / ht_442_ric_11_2x17mmr

- Rule index: 7
- JSON fields: {"interchangeability_rules[7]":{"from":".476 Enfield","to":[".455 Webley",".450 Adams",".442 RIC"],"requires":"compatible revolver"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"compatible revolver"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W09RarXVw2-ZAi-dC / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech semiautomatic pistol section"],"source_reference":"HT99"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W6bfzGQAngvdHu-iw / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"break-action","trigger_mechanism":null,"fire_capabilities":["multi-barrel"],"confidence":"high","basis":["High-Tech: Model 1 is a modern copy of the break-open over-and-under Remington Model 95 (HT91)."],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W6dgs1HSukosk0BM2 / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WK4QvDEDBTOGUOZ9D / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech semiautomatic pistol section"],"source_reference":"HT99"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WL0SlLUJxX2V_3KVh / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT98"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WM8_OFbrJKJFziyfC / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech semiautomatic pistol section"],"source_reference":"HT101"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WXXqZ-u9AGxWAhfph / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech self-loading rifle/carbine table behavior (RoF 3)"],"source_reference":"HT120"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WlalvGJfGaAfR_YFJ / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"single-shot","trigger_mechanism":null,"fire_capabilities":["single-shot"],"confidence":"high","basis":["High-Tech pocketknife pistol description: one cartridge / single-shot configuration (HT98)."],"source_reference":"HT98"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WmGJcfhuw4OrotOVu / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech semiautomatic pistol section"],"source_reference":"HT100"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WwlfY-FYthqkLvByK / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT92"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WxsT21EBYb72XKYe_ / ht_22_short_5_6x11mmr

- Rule index: 11
- JSON fields: {"interchangeability_rules[11]":{"from":".22 Long Rifle","to":[".22 Short"],"requires":"gun can chamber shorter cartridge; HT178"},"mode.mechanism":{"action_system":"revolver","trigger_mechanism":"DA-or-DAO","fire_capabilities":[],"confidence":"high","basis":["High-Tech revolver section/table","High-Tech: double-action revolvers have RoF 3"],"source_reference":"HT94"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"gun can chamber shorter cartridge; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WQTnqCZPMYRO8JrrL / ht_20_gauge_2_5_15_56x63mmr

- Rule index: 12
- JSON fields: {"interchangeability_rules[12]":{"from":"20-gauge 2.75\"","to":["20-gauge 2.5\""],"requires":"weapon and chamber can use shorter shell"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"weapon and chamber can use shorter shell"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WZvZ89iM4Kxz6xpoN / ht_20_gauge_2_5_15_56x63mmr

- Rule index: 12
- JSON fields: {"interchangeability_rules[12]":{"from":"20-gauge 2.75\"","to":["20-gauge 2.5\""],"requires":"weapon and chamber can use shorter shell"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"weapon and chamber can use shorter shell"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WsR6R-QL06g6aAm50 / ht_20_gauge_2_5_15_56x63mmr

- Rule index: 12
- JSON fields: {"interchangeability_rules[12]":{"from":"20-gauge 2.75\"","to":["20-gauge 2.5\""],"requires":"weapon and chamber can use shorter shell"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"weapon and chamber can use shorter shell"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WziWTyBAQ6_3yc8fX / ht_20_gauge_2_5_15_56x63mmr

- Rule index: 12
- JSON fields: {"interchangeability_rules[12]":{"from":"20-gauge 2.75\"","to":["20-gauge 2.5\""],"requires":"weapon and chamber can use shorter shell"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"weapon and chamber can use shorter shell"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W6LVJ8YGACnNB5h-S / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W6LVJ8YGACnNB5h-S / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W6LVJ8YGACnNB5h-S / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W9LBQ9LeKd3uB9nSZ / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W9LBQ9LeKd3uB9nSZ / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W9LBQ9LeKd3uB9nSZ / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WH-pkGPARCbK4CP4h / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WH-pkGPARCbK4CP4h / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WH-pkGPARCbK4CP4h / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WLp8euYFMi9Oikpjp / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WLp8euYFMi9Oikpjp / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WLp8euYFMi9Oikpjp / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WT-PUA77JBHLiLTPo / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WT-PUA77JBHLiLTPo / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WT-PUA77JBHLiLTPo / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WaPnC1R8aLAvhe3rt / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WaPnC1R8aLAvhe3rt / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WaPnC1R8aLAvhe3rt / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WcLG_XsJVbZ6CIT4p / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WcLG_XsJVbZ6CIT4p / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WcLG_XsJVbZ6CIT4p / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WmeBcFEjqKNri5FAm / ht_12_gauge_2_75_18_5x70mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WmeBcFEjqKNri5FAm / ht_12_gauge_2_75_18_5x70mmr_heavy_load

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WmeBcFEjqKNri5FAm / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 13
- JSON fields: {"interchangeability_rules[13]":{"from":"12-gauge 3\"","to":["12-gauge 2.75\"","12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"UNVERIFIED_HT178_CONDITION","message":"pump-action shotgun chamber verified; HT178"}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W19ooSM10ivSwlXSP / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W2EHajHoWWSlF8B6z / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"automatic","trigger_mechanism":null,"fire_capabilities":["automatic-fire","selective-fire-candidate"],"confidence":"high","basis":["High-Tech automatic shotgun","High-Tech: RoF 4+ firearm without ! normally has fire selector"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W8gU1gCeSF_EHefLt / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### W9ki0p3eZ0dV761l1 / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"straight-pull-bolt-action","trigger_mechanism":null,"fire_capabilities":["manual-repeating"],"confidence":"high","basis":["High-Tech explicitly describes the M26 MASS as straight-pull bolt action (HT104)."],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WG5D9pES9jpedWQBK / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":["manual-repeating"],"confidence":"high","basis":["High-Tech: Protecta uses a pump-action mechanism to rotate the cylinder (HT104)."],"source_reference":"HT104","feed_system":"revolving-cylinder"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WGhQ3o1Zo4QfXJRmy / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"hybrid-pump-self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech dual-mode shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WHlBefAVM5F3s_Fhx / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WIKNLT8GtI6laTFbn / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WSu2puv__x3S7ILvR / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WUVxWN3HdmeKHmjv1 / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WVWyvqKW9KEoQ0dnM / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WWpYkEgZSXCKAroUP / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"revolving-cylinder","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech: Striker fires semiautomatically; a spring rotates the cylinder (HT104)."],"source_reference":"HT104","feed_system":"spring-indexed-revolving-cylinder"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WedfHYdjmjQy4JdzJ / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":["manual-repeating"],"confidence":"high","basis":["High-Tech: Protecta uses a pump-action mechanism to rotate the cylinder (HT104)."],"source_reference":"HT104","feed_system":"revolving-cylinder"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WepHIL4DWLPsoO8HC / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Wku81Y3GfqPAjHV-Y / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":["manual-repeating"],"confidence":"high","basis":["High-Tech: Protecta uses a pump-action mechanism to rotate the cylinder (HT104)."],"source_reference":"HT104","feed_system":"revolving-cylinder"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WkzlenFdgtlwesK-q / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WmJ_QjDBYJH7Tmona / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"revolving-cylinder","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech: Striker fires semiautomatically; a spring rotates the cylinder (HT104)."],"source_reference":"HT104","feed_system":"spring-indexed-revolving-cylinder"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WsrbLU9pLyDPhDI5- / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"self-loading","trigger_mechanism":null,"fire_capabilities":["semi-auto"],"confidence":"high","basis":["High-Tech autoloading shotgun description"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Wu7wxc-g32vPxG2B- / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### WvUFCokYczEuOg49b / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"pump-action","trigger_mechanism":null,"fire_capabilities":[],"confidence":"high","basis":["High-Tech model description / pump shotgun family"],"source_reference":"HT104"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.

### Wx10NaVSr1cp1bwKv / ht_12_gauge_2_5_18_5x63mmr

- Rule index: 14
- JSON fields: {"interchangeability_rules[14]":{"from":"12-gauge 2.75\"","to":["12-gauge 2.5\""],"requires":"pump-action shotgun chamber verified; HT178"},"mode.mechanism":{"action_system":"unknown","trigger_mechanism":null,"fire_capabilities":[],"confidence":"unknown","basis":[],"source_reference":"HT91"}}
- Reasons: [{"code":"AMBIGUOUS_RULE_REFERENCE","message":"Named HT178 rule does not resolve to a unique cartridge."}]
- Recommended data correction: Verify HT178 and this platform; encode explicit directed cartridge IDs, confirmed chamber dimensions/permission and action conditions. Do not infer shorter-round permission.
