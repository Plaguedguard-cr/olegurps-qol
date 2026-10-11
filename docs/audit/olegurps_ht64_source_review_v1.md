# High-Tech 4e: проверка 64 вариантов снаряжения (09.10.2026)

## Область работы

Источник: пользовательская библиотека PDF **GURPS High-Tech, Fourth Edition**, страницы книги **164–175** (в PDF это страницы 165–176). Проверены правила для каждого ID из High-Tech v1.2. За основу взят файл `olegurps_ht_ammunition_catalog_v1_2.json` после предыдущего обновления каталогов.

Подготовлен `olegurps_ht_ammunition_catalog_v1_3.json`. Старый v1.2 не изменён. У всех 64 записей добавлено поле `eligibility_v1`, структура которого отделяет проверяемые классы платформ, типы патронов/снарядов, ограничения размера и ЭУ от **обязательных подтверждений** пригодности. Прежние `applies_to`, `mechanics`, ID, TL, `excludes`, `is_selectable` и прочие поля оставлены дословно.

**Принципиально:** отсутствие подтверждения даёт `undetermined`. Само совпадение класса оружия, калибра, названия или TL не означает `compatible`. Ни одна из 64 записей не получает автоматическое разрешение на основании общих характеристик.

## Сводка

| Группа | Записей | Изменение |
|---|---:|---|
| Улучшения целого патрона | 6 | Условия давления, конкретной партии, дозвуковости, особого оружия |
| Типы снарядов и заряды | 51 | Тип платформы и снаряда, ограничение калибра, специальные боеприпасы и родственные эффекты |
| Дополнительные улучшения снаряда | 4 | Совместимость взрывателей, зажигательного элемента и трассера |
| Конструкция гильзы | 3 | Строгая поддержка оружием безгильзовых/сгораемых патронов; ограничения облегчённых |
| **Всего** | **64** | Только дополнительные сведения о допустимости, ни одного изменения атаки |

## Существенные нюансы из правил

- **HT164, облегчённая гильза:** облегчённые дробовые патроны встречаются уже на позднем TL5, тогда как массовая пригодность облегчённой гильзы для большинства патронов стрелкового оружия относится к середине TL8. Существующий `ht_light_case.min_tl=8` сохранён как исходное значение, но новую машинную проверку нельзя интерпретировать как всеобщее требование TL8 для дробовых патронов. Нужна разветвлённая модель доступности по типу патрона.
- **HT165, +P:** требование безопасного давления оружия важнее совпадающего патрона; различать безотказную эксплуатацию и возможность выстрела. Перед применением штрафа к Malf. требуется подтвердить конструкцию оружия.
- **HT165 и HT174, матчевые:** фабричная точность и подобранная индивидуально партия — разные варианты; нельзя одновременно применять оба модификатора Acc, а персонально подобранная партия требует проверок изготовления.
- **HT165, дозвуковые:** учесть исходно дозвуковые патроны, классы pistol против PDW/rifle; от них зависят разные последствия.
- **HT166, slug:** для дробовика пересчёт идёт от *дробового* базового режима, при этом убирается множитель дробин в RoF. Не перекладывать повторно на исходный режим готового slug.
- **HT167, APDS/APFSDS:** класс «винтовка» или совпадающий калибр не доказывает существование пригодного патрона; APDS не для пистолетных калибров; APFSDS для определённых тяжёлых платформ/подтверждённых противоматериальных винтовок.
- **HT169–170, HE/HEAT/HESH/MS-HEAT:** книга не даёт универсальной формулы получения взрывного урона для всякого нового снаряда. Нужны опубликованные характеристики конкретного заряда и предотвращение повторного применения Linked/Follow-Up.
- **HT171–172, дым/слезоточивые:** средство доставки, радиус, химический наполнитель и эффект — разные составляющие; без подтверждённой конструкции/наполнителя вывод `undetermined`.
- **HT173–174, multi-projectile:** дробь, картечь, duplex/triplex, flechette и beehive имеют разную структуру и ограничения; нельзя свести их к общему множителю RoF.
- **HT174–175, дополнительные элементы:** Airburst не должен второй раз применяться к shrapnel, beehive, ABF, где уже включён; трассер не означает постоянный +1 к навыку.

## Полная сверка всех 64 ID

Колонка «Доказательства» — сведения, которые будущему сервису необходимы сверх общего класса и/или диаметра. Пустого доказательства **нет ни у одной записи**. Для всех без достаточных данных результат должен оставаться `undetermined`.

### Улучшения целого патрона (6)

| ID / книга | Машиночитаемые ограничения | Что ещё требуется подтвердить |
|---|---|---|
| `ht_plus_p` (HT 165) | боеприпас: fixed_round, powder_and_shot | weapon_pressure_rating_verified |
| `ht_match_grade` (HT 165) | снаряд: solid, hollow_point, ap, aphc; механизм: manual, single_shot, revolver, bolt_action; исключено: automatic_weapon | factory_match_grade_for_this_ammunition |
| `ht_match_handloaded` (HT 174) | боеприпас: cased_round; снаряд: solid, hollow_point, ap, aphc; механизм: manual, single_shot, revolver, bolt_action | matched_to_this_individual_weapon, armoury_and_iq_guns_success, handloaded_batch |
| `ht_subsonic_pistol` (HT 165) | боеприпас: fixed_round | cartridge_pistol_class_verified, original_load_supersonic |
| `ht_subsonic_rifle` (HT 165) | боеприпас: fixed_round | cartridge_rifle_or_pdw_class_verified, original_load_supersonic |
| `ht_silent` (HT 165) | боеприпас: cased_round | silent_ammunition_design_confirmed_for_weapon |

### Типы снарядов и заряды (51)

| ID / книга | Машиночитаемые ограничения | Что ещё требуется подтвердить |
|---|---|---|
| `ht_solid` (HT 166) | боеприпас: kinetic_round | native_projectile_baseline_verified |
| `ht_rifled_slug` (HT 166) | оружие: shotgun; боеприпас: shotgun_shotshell | slug_load_compatible_with_chamber |
| `ht_hollow_point` (HT 166-167) | снаряд: solid, fmj, kinetic_bullet | expanding_bullet_suitable_for_this_cartridge |
| `ht_poison` (HT 167) | снаряд: hollow_point; базовый вариант: ht_hollow_point | handloaded_round, blood_or_contact_agent_selected, payload_dose_confirmed |
| `ht_ap` (HT 167) | снаряд: kinetic_bullet, solid, kinetic_solid_shot | hardened_ap_construction_available |
| `ht_aphc` (HT 167) | снаряд: kinetic_bullet, solid, kinetic_solid_shot | hardcore_penetrator_construction_available |
| `ht_frangible` (HT 167) | снаряд: kinetic_bullet, solid, rifled_slug | frangible_construction_confirmed |
| `ht_apds` (HT 167) | оружие: tank_gun, autocannon, rifle, machine_gun; снаряд: kinetic_bullet, kinetic_solid_shot; исключено: pistol_cartridge | apds_round_for_this_chamber_confirmed |
| `ht_apfsds` (HT 167) | оружие: tank_gun, autocannon, anti_materiel_rifle | apfsds_round_for_this_chamber_confirmed |
| `ht_baton` (HT 168) | оружие: shotgun, grenade_launcher; калибр ≥ 10 мм | dedicated_baton_round_design_confirmed |
| `ht_beanbag` (HT 168) | оружие: shotgun, grenade_launcher, source_verified_revolver; калибр ≥ 9 мм | beanbag_round_design_confirmed |
| `ht_sapfsds` (HT 168) | оружие: rifle, special_flechette_small_arm; калибр ≤ 10 мм | flechette_load_design_confirmed |
| `ht_underwater_dart` (HT 169) | оружие: purpose_built_underwater_smoothbore | source_confirmed_underwater_dart_platform |
| `ht_apdu` (HT 169) | оружие: autocannon, source_verified_other_platform | du_penetrator_round_design_confirmed |
| `ht_apdsdu` (HT 169) | оружие: autocannon, source_verified_other_platform | apdsdu_round_design_confirmed |
| `ht_apfsdsdu` (HT 169) | оружие: tank_gun, autocannon; калибр ≥ 10 мм | apfsdsdu_round_design_confirmed |
| `ht_le` (HT 169) | боеприпас: explosive_shell | source_confirmed_shell_design, published_explosive_payload |
| `ht_saple` (HT 169) | боеприпас: explosive_shell | source_confirmed_shell_design, published_follow_up_explosion |
| `ht_apex` (HT 169) | боеприпас: ap_explosive_shell | source_confirmed_shell_design, published_follow_up_explosion |
| `ht_he` (HT 169) | боеприпас: explosive_shell | source_confirmed_he_payload, published_explosive_damage |
| `ht_saphe` (HT 169) | боеприпас: explosive_shell | source_confirmed_saphe_design, published_explosive_damage |
| `ht_saphec` (HT 169) | боеприпас: explosive_shell | source_confirmed_saphec_design, published_explosive_damage |
| `ht_aphex` (HT 170) | оружие: heavy_machine_gun, autocannon; боеприпас: explosive_shell | source_confirmed_aphex_design, published_explosive_damage |
| `ht_efp` (HT 170) | боеприпас: purpose_built_efp_munition; калибр ≥ 50 мм | source_confirmed_efp_design, published_efp_damage |
| `ht_heat` (HT 170) | оружие: grenade_launcher, rocket_launcher, tank_gun, recoilless_rifle, missile_launcher, other_source_verified_launcher; боеприпас: purpose_built_shaped_charge; калибр ≥ 20 мм | source_confirmed_heat_warhead, published_heat_damage |
| `ht_hedp` (HT 170) | боеприпас: purpose_built_hedp_shell; калибр ≥ 20 мм | source_confirmed_hedp_design, published_explosive_damage |
| `ht_hesh` (HT 170) | оружие: tank_gun, recoilless_rifle; боеприпас: purpose_built_hesh_shell; калибр ≥ 50 мм | source_confirmed_hesh_design, published_explosive_damage |
| `ht_ms_heat` (HT 170) | боеприпас: purpose_built_tandem_shaped_charge; калибр ≥ 50 мм | source_confirmed_tandem_warhead, published_precursor_and_main_charges |
| `ht_thermobaric` (HT 170) | боеприпас: purpose_built_thermobaric_grenade, purpose_built_thermobaric_rocket; калибр ≥ 20 мм | source_confirmed_thermobaric_design, published_explosive_damage |
| `ht_illumination` (HT 171) | оружие: flare_launcher, artillery, source_verified_cartridge_launcher; боеприпас: flare_cargo_shell; калибр ≥ 10 мм | source_confirmed_flare_cartridge |
| `ht_signal_flare` (HT 171) | оружие: signal_pistol, flare_launcher, source_verified_cartridge_launcher; боеприпас: signal_flare_round; калибр ≥ 10 мм | source_confirmed_flare_cartridge |
| `ht_smoke` (HT 171) | боеприпас: smoke_shell, smoke_canister; калибр ≥ 10 мм | source_confirmed_smoke_munition, smoke_payload_specified |
| `ht_colored_smoke` (HT 171) | боеприпас: smoke_shell; калибр ≥ 10 мм | source_confirmed_colored_smoke |
| `ht_hot_smoke` (HT 171) | боеприпас: smoke_shell; калибр ≥ 10 мм | source_confirmed_hot_smoke |
| `ht_prism_smoke` (HT 171) | боеприпас: smoke_shell; калибр ≥ 10 мм | source_confirmed_prism_smoke |
| `ht_em_smoke` (HT 171) | боеприпас: smoke_shell; калибр ≥ 10 мм | source_confirmed_em_smoke |
| `ht_tear_gas` (HT 171) | боеприпас: irritant_cargo_shell; калибр ≥ 10 мм | source_confirmed_tear_gas_shell, chemical_filler_selected |
| `ht_tear_gas_vomit` (HT 171) | боеприпас: irritant_cargo_shell; калибр ≥ 10 мм | source_confirmed_tear_gas_shell, vomiting_agent_selected |
| `ht_liquid` (HT 171-172) | оружие: low_power_smoothbore, paintball_gun, source_verified_low_velocity_launcher; боеприпас: liquid_cargo_pellet | muzzle_velocity_below_500_fps_confirmed, liquid_filler_selected |
| `ht_poison_gas` (HT 172) | оружие: purpose_built_artillery, purpose_built_grenade_launcher; боеприпас: gas_cargo_shell; калибр ≥ 20 мм | source_confirmed_poison_gas_shell, chemical_filler_selected |
| `ht_white_phosphorus` (HT 172) | боеприпас: purpose_built_wp_shell; калибр ≥ 20 мм | source_confirmed_wp_shell |
| `ht_canister` (HT 172-173) | оружие: artillery; боеприпас: canister_shell; калибр ≥ 20 мм | specific_canister_load_published, pellet_size_and_count_verified |
| `ht_shotshell` (HT 173) | оружие: shotgun, source_verified_smoothbore, source_verified_handgun, source_verified_grenade_launcher; боеприпас: shotload; калибр ≥ 5 мм | chambering_accepts_shotshell, pellet_size_and_count_verified |
| `ht_buck_and_ball` (HT 173) | оружие: smoothbore_musket, shotgun; боеприпас: buck_and_ball_load; калибр ≥ 10 мм | source_confirmed_buck_and_ball_load |
| `ht_shrapnel` (HT 173) | оружие: artillery; боеприпас: published_shrapnel_round | weapon_specific_shrapnel_spec |
| `ht_duplex` (HT 173) | оружие: revolver, bolt_action_rifle, automatic_rifle, machine_gun; боеприпас: documented_multi_ball_load | source_confirmed_duplex_chambering |
| `ht_triplex` (HT 173) | оружие: revolver, bolt_action_rifle, automatic_rifle, machine_gun; боеприпас: documented_multi_ball_load | source_confirmed_triplex_chambering |
| `ht_beehive` (HT 173) | оружие: tank_gun, recoilless_rifle, light_artillery; боеприпас: published_beehive_round | weapon_specific_beehive_spec |
| `ht_multi_flechette` (HT 174) | оружие: low_power_shotgun, low_power_grenade_launcher; боеприпас: multi_flechette_load; калибр ≥ 10 мм | low_power_platform_confirmed, flechette_size_and_count_verified |
| `ht_rubber_shot` (HT 174) | оружие: shotgun, source_verified_riot_launcher; боеприпас: rubber_shot_load; калибр ≥ 10 мм | source_confirmed_rubber_shot_round, rubber_ball_size_and_count_verified |
| `ht_abf` (HT 174) | оружие: aircraft_missile_launcher, autocannon; боеприпас: published_abf_round | weapon_specific_abf_spec |

### Дополнительные улучшения снаряда (4)

| ID / книга | Машиночитаемые ограничения | Что ещё требуется подтвердить |
|---|---|---|
| `ht_airburst` (HT 174-175) | боеприпас: explosive_round_with_airburst_fuse; исключено: already_airburst_shrapnel, already_airburst_beehive, already_airburst_abf | compatible_fuse_and_round_verified |
| `ht_incendiary` (HT 175) | снаряд: solid, source_confirmed_ap, source_confirmed_aphc | incendiary_cavity_or_combination_confirmed |
| `ht_self_destruct` (HT 175) | боеприпас: explosive_round_with_fuse; TL ≥ 6 | self_destruct_fuse_design_confirmed |
| `ht_tracer` (HT 175) | снаряд: bullet, source_confirmed_multi_projectile | tracer_component_for_this_round_confirmed |

### Конструкция гильзы (3)

| ID / книга | Машиночитаемые ограничения | Что ещё требуется подтвердить |
|---|---|---|
| `ht_light_case` (HT 164) | боеприпас: cased_round | light_case_compatible_with_pressure_and_manufacture |
| `ht_caseless` (HT 164-165) | боеприпас: caseless_round; гильза: caseless | weapon_explicitly_designed_for_caseless_ammo |
| `ht_consumable_case` (HT 164) | оружие: purpose_built_consumable_case_rifle, purpose_built_consumable_case_cannon; боеприпас: consumable_cased_round; гильза: consumable, semi_consumable | weapon_explicitly_designed_for_consumable_case |

## Формат и правила внедрения

В каждом option record находится `eligibility_v1` со следующими полями:

- `conditions`: допустимые группы платформ/зарядов, ограничения по размерам, механизму и типу гильзы. Это **ограничители**, а не подтверждение пригодности конкретного режима.
- `explicit_evidence_required`: обязательные подтверждения для конкретного оружия, патрона, партии, взрывателя или наполнителя. Совместимость автоматически не одобряется, если подтверждение отсутствует.
- `on_missing_evidence`: `undetermined`; `never_allow_by_caliber_name_or_tl_alone`: `true`.
- `do_not_reapply_native_effects` и `overlap_guard`: предупреждение о двойном учёте уже готового native payload; боевое применение отложено.
- `source_ref`: точная книжная страница; `source_rule_note`: нюансы, которые нельзя заменять примитивной булевой проверкой.

**Новая версия JSON сама по себе НЕ подключает 64 варианта к стрельбе и НЕ меняет ответ существующего `AmmunitionCompatibilityService`.** Следующим заданием Codex потребуется обновить загрузчик на HT v1.3, синхронизировать `weapon_reference_catalog` reverse-pointer, добавить валидатор и осторожную интерпретацию `eligibility_v1`. Не надо немедленно генерировать все сочетания «оружие × вариант»: это небезопасно без source-подтверждений.

## Не изменено и не проверено в живом Foundry

- Оригинальные 263 `ammo_items`, 262 `ammo_families`, 17 `interchangeability_rules` (в том числе все 68 HT178 assessments), связи оружия и ракетные контракты не изменены.
- Все `mechanics`, исходные TL, стоимость, веса и базовые характеристики исходных 64 записей неизменны.
- Не создавались новые weapon-mode ID связи и не подбирались конкретные платформы по названию/диаметру.
- Не проводились Node/Foundry тесты модуля: только проверка исходных JSON и регрессия исходных структур Python-тестом. Числа 393/393 из предыдущего отчёта **не являются** результатом проверки HT v1.3.
- Файлы исходного HT v1.2 и Weapon Reference v5.6 из локального комплекта не перезаписаны. При установке нового HT путь/версию и обратную ссылку в Weapon Reference потребуется согласовать.

## Проверка целостности

- `python test_ht64_structured_eligibility.py` — 693 утверждения PASS, 64/64; проверена полная неизменность старых атрибутов каждой записи и всех остальных разделов.
- SHA-256 исходного HT v1.2: `034659377eebdd3395ab75ebe42573de95e773341da071bee5e166282057c512`.
- SHA-256 нового HT v1.3: `435ed962d86dd8f097bd61ffb0553c703b465cb5e6ebc611f34c8c64734be385`.

## Вопросы, не закрытые только структурированием

1. Подбор конкретных mode/item ID для специальных конструкций и замены в GGA не выполнен. Можно подтверждать только по исходным признакам/исключениям при проверенной платформе.
2. Внешние требования (оружейник, безопасность давления, состояние патрона, выбор наполнителя, погода/обстоятельства) останутся зависимыми от подтверждённых данных или решения GM.
3. Особые ракетные модели, Javelin Follow-Up, Hydra RoF и направленная семантика Range сохраняют отдельные задачи; этот файл не должен их исправлять.
4. `ht_light_case` требует будущего более тонкого представления TL по виду патрона; исходное min_tl намеренно сохранено для совместимости.
