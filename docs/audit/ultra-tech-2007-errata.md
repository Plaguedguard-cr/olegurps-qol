# Ultra-Tech 2007: постоянный реестр утверждённой эрраты

Основа: **GURPS Ultra-Tech Fourth Edition, Version 1.0, May 22 2007**.
Источник поправок — [предоставленный пользователем список в Notion](https://app.notion.com/p/3fc26aafea558179a8bcdddd0432d4c7),
подтверждённый заданием 18.10.2026. Официальная страница SJ Games по сообщению
пользователя возвращала HTTP 403; её самостоятельная загрузка здесь не заявляется.
Исходный PDF BooksCodex не изменяется. Печатная UT N = страница этого PDF N+1.

Приоритет: исходная книга → этот утверждённый errata overlay → пользовательские
переопределения экземпляра → боеприпас → завершающее B269.
Старые shotSnapshots сохраняют исходный результат, без миграции.

Реестр содержит **34 уникальные поправки**. Общая политика average racial IQ
учтена один раз с обеими ссылками. Поправка всем 7.5mm pistols также одна,
с перечислением двух существующих моделей. Повторения списка не дублируются.

Статусы: `already correct` — уже правильно; `fixed` — исправлено;
`not implemented` — механики/объекта нет, future; `unresolved` — осталось спорным.
Исправленная справочная запись не означает готовность атаки или питания.

| ID | Страница | Объект: было → должно быть | Использование и статус | Изменённые файлы | Автопроверка |
|---|---|---|---|---|---|
| E01 | UT16 | Adjusting for SM: начало −3,−2,−2,−1 → −4,−3,−2,−1 | Подсистемы масштабирования экипировки нет; **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E02 | UT27 | Mind Emulation Complexity: (IQ+5)/2 → IQ/2+4 | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E03 | UT27–28, UT220 | Все Machine Intelligence Lenses, AI и Mind Emulation: individual IQ → average racial IQ | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E04 | UT28 | Weak Dedicated AI: минимальная Complexity → ceil(IQ/2+1) | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E05 | UT35 | Microbot TL10: снять запрет Aerostat; исключается только Dust | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E06 | UT37 | Swarm Type Table, Self-Replicating: ссылка → UT92 | Таблицы chassis/swarm нет; **not implemented**, future. Заряд Swarm — отдельный объект | Только этот реестр | Реестровая; механики нет |
| E07 | UT45 | Causality Communicators: TL11^ → TL10^ | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E08 | UT105 | Laser Microphones: bug stompers и privacy field white-noise generators: always do → never do; они не мешают этому способу прослушивания. Ссылки UT62,188 | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E09 | UT117 | Все строки Beam Weapons (Rifle) этой страницы: TL11 | Существующие Rainbow rifle/carbine/survival определения уже TL11; **already correct**. Не распространять на остальные страницы или TL12 crystal | Нет | `ut-errata.test.mjs`, TL и прежние power blockers |
| E10 | UT118 | X-Ray Strike Laser: Acc 24 → 18 | Definition-only; **fixed**, питание/атака не разблокированы | `scripts/ut-errata.js`, общий проектор | `ut-errata.test.mjs` |
| E11 | UT118 | X-Ray Laser Cannon: Acc 24 → 18 | Definition-only; **fixed** | Те же | `ut-errata.test.mjs` |
| E12 | UT120 | Electrolaser Carbine: divisor (2) | Уже HT-4 (2) aff; **already correct**, без разблокировки | Нет | `ut-errata.test.mjs` |
| E13 | UT137 | Machine Pistol: RoF 3 → 10 | Источник, карточки, очереди и физический расход; **fixed** | `scripts/ut-errata.js`, общий проектор/чтение определений | `ut-errata.test.mjs`, live |
| E14 | UT137 | UAW shotgun: 1d+1 pi → 4d+4 pi++ | Каталог уже 4d+4, устранена старая подмена 1d+1; **fixed**. Acc2, Range100/500, RoF2, Rcl1, Shots5+1(3i) сохраняются | `scripts/ut-errata.js`, `standalone-weapon-service.js`, `ut-uaw.js`, генератор матрицы | UAW/errata тесты, live |
| E15 | UT137 | Storm Rifle: Acc 4 → 5 | Включая Aim и Fire Control; **fixed** | `scripts/ut-errata.js`, общий проектор/чтение определений | `ut-errata.test.mjs`, live |
| E16 | UT137 | Все 7.5mm pistols, Holdout и Medium: pi → pi-; кубы сохраняются | **fixed**, исходный тип для HP/APHC/APDS | Те же | `ut-errata.test.mjs`, live |
| E17 | UT137 | Heavy Pistol: Bulk −3 → −2 | **fixed** | Те же | `ut-errata.test.mjs` |
| E18 | UT137 | Storm Carbine: 7d pi++ → 7d pi+ | **fixed**, до ETC/LP и боеприпаса | Те же | `ut-errata.test.mjs`, live |
| E19 | UT138 | Tank Cannon: 6d×25 без типа → 6d×25 pi++ | Тип уже восстановлен прежним разрешённым дополнением; **already correct**. LP и спорное ETC не разблокированы | Подтверждён canonical overlay `scripts/ut-errata.js` | `ut-errata.test.mjs`, прежние исключения |
| E20 | UT138 | Storm Chaingun: 9d pi++ → 9d pi+ | **fixed**, ordinary/LP; Shots60, альтернативная подача и ручной моторный учёт сохраняются | `scripts/ut-errata.js`, общий проектор/чтение определений | `ut-errata.test.mjs`, live |
| E21 | UT139 | 5.7mmCL WPS 0.013 → 0.009 lb; CPS $0.26 → $0.18 | **fixed**, новые справочные значения; старые партии, количества и история не переписываются | `scripts/ut-errata.js`, адаптер старых auto-рецептов в `automatic-ammunition-profiles.js` | `ut-errata.test.mjs`, stock/history |
| E22 | UT140 | Ice Gun: divisor (0.25) → (0.2) | **fixed**, raw/stats/resolution и настоящий Damage | `scripts/ut-errata.js`, общий проектор/чтение определений | `ut-errata.test.mjs` |
| E23 | UT142 | Portable Railgun ammo designation: 10mmG → 10mm | Имя и caliber_hint уже 10mm; подпись физического семейства 10mmG → 10mm, **fixed**. Семейство `10mm_g` не объединяется с химическими патронами | `scripts/ut-errata.js` | `ut-errata.test.mjs`, compatibility |
| E24 | UT142 | Portable Railgun: Acc4 → Acc7 | Definition-only; **fixed** | `scripts/ut-errata.js`, общий проектор | `ut-errata.test.mjs` |
| E25 | UT142 | Railgun, 40mm: pi → pi++ | Definition-only; **fixed**, остальные параметры сохранены | Те же | `ut-errata.test.mjs` |
| E26 | UT142 | Gauss Rifle, 4mm: pi → pi- | **fixed**, отменяет старую проекцию на исходное ошибочное pi; питание не разблокировано | Те же | `ut-errata.test.mjs` |
| E27 | UT152–153 | APHEX: множитель CPS не задан → ×4 по HT170 | **fixed**, отдельная цена, Damage и партии не меняются из-за цены | `scripts/ut-errata.js`, `ut-extended-source.js` | `ut-errata.test.mjs`, live APHEX |
| E28 | UT153 | Biochemical Liquid, 64mm: 8 → 65 doses | Таблица **fixed**; 64mm носитель not implemented, future. Без фиктивной атаки/эффекта | `scripts/ut-errata.js`, `ut-special-ammunition.js`, адаптер auto-рецептов | `ut-errata.test.mjs` |
| E29 | UT153 | Biochemical Liquid, 100mm: 16 → 250 doses | **fixed**, та же политика | Те же | `ut-errata.test.mjs` |
| E30 | UT165 | Electric Stun Wand: divisor (0.5) | Linked HT-5(0.5) aff уже правилен; **already correct** | Нет | `ut-errata.test.mjs` |
| E31 | UT167 | Warbot: добавить Accessory (Microframe computer) [1]; стоимость → 290 points | Шаблона персонажа нет; **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E32 | UT179 | Space Biosuit: standard computer → small computer | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E33 | UT210 | Boosted Reflexes: Basic Speed +1 | **not implemented**, future | Только этот реестр | Реестровая; механики нет |
| E34 | UT229 | Tilt-Rotor Transport: Piloting (Light Airplane) → Piloting (Heavy Airplane) | **not implemented**, future | Только этот реестр | Реестровая; механики нет |

Общий проектор — `scripts/ut-source-data.js` → `scripts/ut-errata.js`,
после проверки исходных каталогов и до построения конечных индексов.
Для сохранённых модульных определений используется только узкое чтение
известных исправляемых полей по исходному ID/hash, затем применяются overrides.
Исходные JSON/GCS служат неизменным доказательством прежней транскрипции;
исправленная рабочая модель находится в общем источниковом слое, а не в UI.

Сводка статусов самих поправок: 18 fixed, 4 already correct, 12 not implemented,
0 unresolved. E28 исправляет существующую справочную таблицу; работающий 64mm
носитель от этого не появляется. Для шести затронутых Beam-определений обнаружен
старый обход проверки энергии; они включены в существующий общий список
`UT_POWER_MODE_IDS`, без изобретения питания. Это отдельно от уже правильных
чисел E09/E12. Вне затронутых определений новые семейства питания не создаются.

Реестр намеренно расположен в `docs/audit` по прямому требованию этого задания;
это постоянная нормативная запись, а не хранилище временных отчётов/PDF/TAP.
