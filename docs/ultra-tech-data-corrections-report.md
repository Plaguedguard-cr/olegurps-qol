# UT-DATA: исправления каталожных данных Ultra-Tech

14 октября 2026 года. OleGURPS QOL остаётся **0.2.0**. UT-1–UT-8 и энергетическая подсистема не начинались.

## Итог

Разобраны все **122** сопоставления предварительного аудита: **67 A**, **25 B**, **26 C**, **4 D**. Исправлены 67 строк категории A: 66 по однозначным данным UT2007 и одна с разрешённым дополнением неполного Damage из WT2014. Вместе с зависимыми полями это 112 точечных путей данных 48 существующих режимов. Добавлены **две отдельные Gauss-модели** и **ровно две** физические связи. Каталожные индексы теперь 1154 equipment/1477 modes; UT — 36 физических семейств, 87 связей, 81 linked mode. Число специальных определений осталось прежним: 6 loads и 37 reference warheads; новой реализации их эффектов нет.

Четыре защищённых JSON-каталога **побайтно сохранены**. Поправки находятся в `scripts/ut-source-data.js` и применяются CatalogService к согласованному неизменяемому представлению для новых определений. Исходные данные доступны через `getSourceCatalog`; обычные `getCatalog`, `getMode`, `getEquipment` и связи работают с проверенным представлением. Это постоянный слой данных `ut-2007-1`, а не исправление Actor или таблиц GCS во время игры.

Режимы Gauss/EM не получают фиктивную готовность от наличия снарядов: новый бросок OleGURPS блокируется до Roll/ChatMessage и до списания. Старый Damage и снимки атак этой проверкой не изменяются. Ввод батарей, интерфейс питания и двойное списание не реализованы.

## Источники и уточнение пользователя

Основной источник: `E:\НРИ\GURPS\BooksCodex\GURPS 4E - Ultra-Tech.pdf`, Fourth Edition, Version1.0, 22 May2007. Прочитан титул; SHA-256 `d1c930f8fdc2382ad833d68b4b6464c9d78e010ec62251e54ba1ee3e194efc38`. Печатная страница p соответствует странице PDF p+1 при нумерации с единицы. Перед исправлениями перечитаны соответствующие описания, таблицы и примечания; фрагменты и технические результаты сохранялись только в TEMP.

По последующему указанию пользователя **WT2014 разрешён для отсутствующих/неполных данных**. Проверен локальный `Ultra-Tech_-_Weapon_Tables.pdf`; печатные страницы совпадают с PDF. Полное значение UT2007 не заменяется отличающимся значением WT2014.

Дополнения из WT11:

- Underbarrel Shotgun: неполная запись UT138 `4d+ pi++` дополнена до `4d+4 pi++`. Прежний каталог имел `4d pi++`, поэтому это фактическая поправка данных. Происхождение отдельно записано в режиме.
- Tank Cannon: UT138 содержит `6d×25` без типа; WT11 даёт `pi++`. Уже существовавшее значение `6dx25 pi++` сохранено, теперь его недостающая часть имеет явно отмеченное разрешённое происхождение.

Материалы предварительного аудита прочитаны из `olegurps-qol-archive\source-audits\2026-10-14-ultra-tech-preliminary` с проверкой хешей. Сам архив и закреплённые материалы не изменены. Их выводы не использованы вместо чтения книги. Errata, недоступная при предварительном аудите, не объявляется проверенной; поздние таблицы не объявляются автоматической errata.

## Исправленные данные

В этом разделе приведены основные изменения; полный индивидуальный разбор всех 122 строк находится ниже. Параметры — опубликованные базовые значения для каталога, а не принудительная замена импортированных характеристик персонажа.

| Оружие/группа | Было → стало в представлении | Печатный источник |
| --- | --- | --- |
| Partisan Needler | TL9 → 10; native TL в forward/reverse link согласован | UT140 |
| Railgun40mm | RoF1 → 20; `6dx25(3) pi++` → `6dx25(3) pi` | UT142 |
| Gauss Machine Pistol | Shots100(3) → 40(3) | UT142 |
| Gauss Rifle4mm | `6d+2(3) pi-` → `6d+2(3) pi` | UT142 |
| Gyroc Launch Pistol | Shots7(3) → 6(3) | UT145 |
| Holdout Gyroc | Acc null → 0 | UT145 |
| Laser Rifle | Range500/1500 → 700/2100 | UT116 |
| Heavy Rainbow Laser Pistol | Range90/2700 → 900/2700 | UT117 |
| Mortar Box64mm | Range80 → 360/3000 | UT138 |
| Fusion Cannon | `7dx50(2) burn ex` → `4dx50(2) burn ex` | UT128 |
| Heavy Electrolaser | Shots72(3) → 83(3); данные зависимого linked-компонента согласованы | UT120 |
| Graser Carbine | Shots28(5) → 28(3); Damage остаётся **4d(10)** | UT118 |
| Grav Needle Rifle | Bulk −2 →−3 | UT143 |
| Semi-Portable Blaster | Shots20(5) →**50(5)**; Bulk −10 →−8; optional Omni-строка согласована | UT123 |
| Spray/Pocket Aerosol | Сохранён опубликованный **Acc Jet**, RoFJet → 1; Spray Can ST4→ 2/Bulk−4→−2; Spray Tank Range2→ 3; исправлено основание geometry | UT134 |
| Underbarrel Shotgun | Acc1→ 2, RoF3→ 2, Shots5+1(3)→ 5+1(3i), Rcl5→ 4; Damage4d→ 4d+4 с дополнениемWT | UT136, 138; WT11 |
| Laser Crystal | RoF10→ 1, ST/Bulk null→ 0; источник одноразового встроенного питания и отдельных установленных crystals записан данными | UT115 |
| Rainbow Laser Crystal | ST/Bulk null→ 0; RoF1 сохранён; одноразовый отдельный crystal отмечен данными | UT117 |
| Long-Range Mindripper | Width3yd → 1yd в raw/type/geometry | UT122 |
| Heavy Pistol10mmCLP | Bulk −2→−3 | UT137 |
| Holdout/Medium Pistol7.5mmCLP | `pi-` → `pi` | UT137 |
| Machine Pistol10mmCLP | RoF10→**3** | UT137 |
| Ice Gun | Divisor0.2 →**0.25** | UT140 |
| Storm Carbine/Chaingun | `pi+` → `pi++` | UT137–138 |
| Storm Rifle | Acc5→ 4; pi++ и Bulk−4 сохранены | UT137 |
| Grav Hammer/Ram | Acc null→ 0; Range1→C/1; данные включают опубликованный dkb | UT84 |
| Graviton/Ghost | Восстановлен опубликованный cosmic∞; уже имевшийся nkb Graviton сохранён; Semi-Portable Graviton Range2900→ 2900/8700 | UT129, 131 |
| Sonic Shuriken / Stinger | Bulk null→ 0 | UT166/126 |
| X-Ray Laser Cannon / Strike Laser | Acc18→**24** | UT118; остальные колонки продолжаются наUT119 |
| Conventional ammo tables | У 15 семейств исправлен source_ref UT140→**UT139**, физические IDs не менялись | UT139 |

`host_inheritance` для Underbarrel Shotgun прямо указывает наследование **Bulk, ST и sighting bonuses** от установленного оружия, по UT136. Это не замена собственного Acc2 всем Acc host. Автоматический поиск/привязка host не добавлен: он относится к будущему оружейному пакету. Исторический экземпляр с ручными host-параметрами сохраняется. None/dash у остальных underbarrel-строк не заменены выдуманным универсальным числом.

Поправки cosmic/affliction/Jet — подготовка данных. Не добавлено исполнение космической защиты, нокбэка, сопротивления, конуса или одноразового энергоучёта. Их запись в каталоге не означает, что эти категории полностью реализованы.

## Две новые модели

Идентификаторы созданы OleGURPS для источниковых записей; они не выдаются за исходные UUID GCS.

| Поле | Gauss Needler, 3mm | Gauss PDW, 4mm |
| --- | --- | --- |
| Equipment ID | `eUT2007GaussNeedler3mm` | `eUT2007GaussPDW4mm` |
| Mode ID | `WUT2007GaussNeedler3mm` | `WUT2007GaussPDW4mm` |
| TL | 10 | 10 |
| Governing Skill | Guns (Submachine Gun) | Guns (Submachine Gun) |
| Damage | 2d(3) pi- | 4d(3) pi- |
| Acc | 2 | 6+1 |
| Range | 100/300 | 700/2900 |
| RoF | 12 | 16 |
| Shots | 100(3) | 80(3) |
| ST / Bulk / Rcl | 7† / −2 /2 | 9† /−3 /2 |
| Weight / Cost / LC | 1.5/0.5 lb. /$2000 /2 | 4.6/1 lb. /$3600 /2 |
| Физический снаряд | Только 3mm EM | Только 4mm EM |
| Питание | ДвеB cell на 100 shots | ОднаC cell на 80 shots |
| Источник | UT141–143 | UT141–143 |

Новые модели не объединены с Minineedler, Machine Pistol или Rifle. Они находятся в существующем поиске/каталожном API. Существующие семьи не размножались: добавлены две обратные связи к 3mm/4mm EM. Другие размеры, airgun, conventional и ice не получают разрешения по совпадению имени/калибра.

Новые special/warhead-сочетания для этих двух моделей остаются `undetermined`; не вводились 37 UT-effect implementations, готовые специальные рецепты или обход World Policy. Физическая совместимость 3mm/4mm подтверждается отдельно от отсутствующего учёта энергии.

## Что намеренно оставлено по книге 2007

Все 25 строк категории B оставлены с опубликованным UT2007 значением. Примеры:

- AMR/Heavy Chaingun15mm — `pi+`, а не более поздний `pi++`.
- Flamers — численный Acc, а не WT Jet.
- Graser Carbine/Rifle — 4d/5d, а не 5d/6d.
- Laser/X-Ray/Rainbow/Graser Pistol — Shots33(3), а не 66(3).
- Graviton Pistol — 33(3), Portable MAD — 83(5), Rainbow Strike — 45(5), Tactical Screamer/Semi-Portable Flamer — 100(5).
- Hunting Rifle/LSW/Minigun7mm — Acc4; Portable Railgun —Acc4.
- Magnum Pistol —Bulk −2; Storm Rifle —pi++/Bulk−4; UGL25mm —Acc4+2.

В случаях, где **прежний каталог следовал WT2014**, а полная книга 2007 даёт другое значение, выполнена поправка A: Gauss Rifle pi, Railgun pi, Ice divisor0.25, Machine PistolRoF3, Heavy PistolBulk−3, Storm Carbine/Chaingunpi++, Storm RifleAcc4, X-Ray Cannon/StrikeAcc24. Выбор источника не смешивается с хронологическим номером таблицы.

## Внутренние противоречия и неполнота

- **Gauss HMG:** заголовок/таблица 7mm и 200 shots против текста 4mm/4000. Сохранён старый 7mm forward link как исторические данные; новый допуск не выдаётся (`undetermined`). Не добавлена 4mm связь.
- **Gauss Minigun:** текст UT141 TL9, таблица UT143 TL10. Существующее значение 10 сохранено, но новая совместимость не объявляется безусловной. История и боезапас не удаляются.
- **Rainbow:** три TL10-строки UT117 против TL11-раздела UT116. Текущий TL11 не переписан; строки D3/74/78 остаются решением пользователя. WT2014 здесь не заполняет пропуск и поэтому не разрешает внутренний конфликт автоматически.
- **UAW shotgun:** UT135 явно отсылает к underbarrel shotgun, а UT137 даёт 1d+1pi/Rcl1. После разрешённого заполнения отдельного Underbarrel Shotgun изWT его параметры 4d+4pi++/Rcl4 расходятся со строкой UAW. Это внутреннее противоречие, а не отсутствующее значение. Прежние параметры UAW сохранены для review; новая реализация двух подач не начата.
- **Swarm25mm:** UT152 общее упоминание 25mm против подробного ограничения 40mm/таблицы UT156. Нового 25mm допуска нет; прежний строгий предел сохранён.
- **25mm Jammer:** UT157 допускает класс 10mm+, но не задаёт 25mm radius. Такой variant теперь `undetermined`, не получает выдуманный 25yd. Локальный WT не использован как источник отсутствующего радиуса: в нём нет этой таблицы боевых частей.
- **Gauss APDS:** UT152 отсылает кAPHC, но список исключений сформулирован иначе; nativeAD3 не складывается с новымAD2. Gauss APDS остаётся `undetermined`; явно исключённый railgun не становится разрешённым.
- **Electrolaser Carbine:** отсутствие `(2)` в строке UT120 разобрано по прямому общему правилу electrolaser shock UT119. Уже правильныйAD2 сохранён; это категория C, а не повод удалить опубликованное правило.
- Special/Bonder/Damper и ST-multiplier/T-notation не превращались в численный Damage или новые физические боеприпасы. Контекстные значения сохранены; отсутствие поля не замещалось произвольным нулём.

## Защита Gauss и граница исполнения

До исправления путь был: подтверждённая UT-family → `AttackProfileResolver` без recipe → `resolveAmmunitionEffects` с passthrough/nativeSafe → `executePreparedGgaRoll` → расход только физического боеприпаса. Наличие численного Damage позволяло забыть второй ресурс. Полного учёта энергии в этом пути нет.

Минимальная защита использует **точные источниковые Mode IDs**22 EM/Gauss-режимов, включая две новые модели и три Gauss Nail Gun. Профиль получает `UTPowerAccountingRequired`; preview сообщает причину; самостоятельная атака имеет readinessReason; общий prepared roll отклоняет её **до любых** Roll/ChatMessage/списания. Имя оружия и numeric caliber не используются для доказательства этого требования.

World Policy, GM approval, stock balance и caller-флаги вроде `powerReady` не могут заменить учёт энергии. `AmmoService` и его текущая транзакция побайтно сохранены. Никакого второго расхода, новых cells, EnergyService или автоматического заряда не добавлено. Обычные UT conventional и HT-режимы этой проверкой не блокируются.

Защита относится к новым броскам **OleGURPS с установленной каталожной идентичностью**. Штатный GGA actor-sheet и его собственные броски не патчились; неизвестное оружие не определяется как Gauss по одному имени. Damage уже состоявшегося выстрела использует сохранённый snapshot и не проходит эту проверку нового запуска.

Сообщения новых ограничений имеют RU/EN-ключи. Собственный интерфейс OleGURPS получает русский текст из фактически скомпилированного словаря и при Foundry ru, и при Foundry en; глобальный язык не менялся. Это адресная проверка загрузки ресурсов модуля в Node, не новая живая проверка окон Foundry.

## Сохранность GCS и пользователей

- Исходные четыре каталога, их protected hashes, GCS-source hashes и все прежние IDs сохранены. Старые физические связи присутствуют в согласованном представлении; изменена только доказанная nativeTL Partisan и добавлены две новые ссылки.
- Импортированная атака берётся из Actor/GCS как раньше. Каталожные Damage, RoF, Acc, Range, Shots и Bulk не накладываются на неё автоматически. Проверка питания запрещает неполный запуск, а не редактирует характеристику.
- Новое самостоятельное оружие получает исправленное определение. Открытие/сохранение существующего сохраняет его snapshot и overrides. Для изменения базы требуется существующее **явное** refresh/review.
- При явном refresh исправлена точка сравнения с исходным каталогом: прежняя базовая Shots100(3) не превращается случайно в override100(3), мешающий утверждённой поправке 40(3). Настоящий пользовательский Acc 15 сохраняется.
- Поправка каталожного Shots не уменьшает текущие rounds или capacity исторического магазина. Проверка использовала старый магазин 60/100, свободный запас 17 и старый receipt: они не изменились после review. Исторический shotSnapshot также сохранён.
- Legacy approvals, orphaned и прочие пользовательские данные не мигрировали, не удалялись и не переназначались. Реальные Actor/Token/ChatMessage не создавались и не изменялись.

## Проверки

| Реально выполнено | Результат |
| --- | --- |
| `ut-data-corrections`, `catalog-service`, `ammunition-compatibility-service`, `standalone-weapons`, `weapon-catalog-binding`, `attack-profile` | Первый адресный прогон: 282 PASS, 1 FAIL из 283. FAIL был в новой тестовой фикстуре snapshot: отсутствовал `resource.magazineId`, до проверки поведения код не дошёл. |
| Повтор только `existing definitions/overrides/stock/snapshots` после исправления фикстуры и расширения её реальным stock/magazine-состоянием | **1 PASS**, 0 FAIL. Все 283 уникальные проверки исходного адресного набора теперь имеют PASS. Проверки не удалялись и не ослаблялись. |
| После дополнения Tank-provenance и русских сообщений: `all 122 audit`, `source conflicts`, RU/EN-message checks | **4 PASS**, 0 FAIL; остальные прошедшие сценарии не повторялись. |
| `catalog-upgrade`: только current revisions / all prior equipment / exact catalog byte hashes / exactly four runtime JSON | **4 PASS**, 0 FAIL. HT178-матрица из этого файла не запускалась. |
| JSON и строгий UTF-8; syntax затронутых JS/MJS и bundled dictionary; `git diff --check` | **PASS** |
| SHA-256 четырёх защищённых каталогов, архивных таблиц и четырёх прочитанных книг; неизменность AmmoService, AGENTS.md, module.json, предварительного отчёта | **PASS** |

Полный набор, огромные HT-матрицы и новые боевые испытания Foundry **не запускались**. Проверки runtime выполнены на изолированных тестовых объектах без записей в реальные миры. TAP хранится в TEMP, не в репозитории. Исходные изменения живого `packs/macros` сохранены; Git staging/commit/push/merge/rebase не выполнялись.

## Перед UT-1

Основные conventional-данные для первого пакета приведены к книге 2007; этот DATA-этап завершён. UT-1 можно ставить отдельным заданием с конкретными источниково подтверждёнными сочетаниями. Это не объявление всех UT-платформ готовыми к стрельбе.

UAW требует решения противоречия второго ствола и будущего общего feed-контракта. Gauss/EM, ETC/liquid и прочие hybrid зависят от отдельно обсуждаемого питания. Например, **Gatling Carbine UT136 требует отдельную B cell на 19500 shots**: его не следует включать в законченный пакет обычных патронов, игнорируя электрический мотор. Этот факт отмечен после нового чтения источника; питание Gatling не реализовывалось. Гранатные, cosmic, affliction и persistent effects остаются за пределами DATA-этапа.

## Полный разбор 122 сопоставлений

Нумерация соответствует неизменённому `source-discrepancies.json` предварительного аудита. A — исправленные данные (для 110 разрешённое дополнениеWT); B — отличие только отWT, сохраненоUT2007; C — представление/контекст/пропуск, разобрано без произвольной коррекции (для 102 отдельно отмечено дополнениеWT); D — внутреннее противоречие, решение не выдумано. ID и точные пути до/после находятся также в компактной проверочной фикстуре `tests/fixtures/ut-2007-data-contract.json`; чтение книг/архива обычным тестам не требуется.

| № | Кат. | Оружие / поле | Было | UT2007 | Решение / источник |
| --- | --- | --- | --- | --- | --- |
| 1 | B | Anti-Materiel Rifle, 15mmCL / Damage | 15d pi+ | 15d pi+ | Сохранено UT2007; Ultra-Tech 137 |
| 2 | B | Assault Flamer / Acc | 6 | 6 | Сохранено UT2007; Ultra-Tech 127 |
| 3 | D | Dinosaur Rainbow Laser / TL | 11 | 10 | Нужно решение; Ultra-Tech 117 |
| 4 | C | Electrolaser Carbine / Damage | HT-4 (2) aff | HT-4 aff | AD2 по прямому правилу UT119; Ultra-Tech 120 |
| 5 | A | Fusion Cannon / Damage | 7dx50(2) burn ex | 4d¥50(2) burn ex | Исправлено; Ultra-Tech 128 |
| 6 | A | Gauss Machine Pistol, 4mm / Shots | 100(3) | 40(3) | Исправлено; Ultra-Tech 142 |
| 7 | C | Gauss Nail Gun / Acc | 0+3 | 0(+3) | Контекст / представление; Ultra-Tech 83 |
| 8 | C | Gauss Nail Gun / Acc | 0+3 | 0(+3) | Контекст / представление; Ultra-Tech 83 |
| 9 | C | Gauss Nail Gun / Acc | 0+3 | 0(+3) | Контекст / представление; Ultra-Tech 83 |
| 10 | A | Gauss Rifle, 4mm / Damage | 6d+2(3) pi- | 6d+2(3) pi | Исправлено; Ultra-Tech 142 |
| 11 | A | Ghost Particle Cannon / Damage | 6dx10 burn ex | 6d¥10( ∞ ) burn ex | Исправлено; Ultra-Tech 131 |
| 12 | B | Graser Carbine / Damage | 4d(10) burn, sur | 4d(10) burn, sur | Сохранено UT2007; Ultra-Tech 118 |
| 13 | A | Graser Carbine / Shots | 28(5) | 28(3) | Исправлено; Ultra-Tech 118 |
| 14 | B | Graser Pistol / Shots | 33(3) | 33(3) | Сохранено UT2007; Ultra-Tech 118 |
| 15 | B | Graser Rifle / Damage | 5d(10) burn, sur | 5d(10) burn, sur | Сохранено UT2007; Ultra-Tech 118 |
| 16 | A | Grav Hammer / Damage | 2d cr | 2d cr dkb | Исправлено; Ultra-Tech 84 |
| 17 | A | Grav Hammer / Acc | null | 0 | Исправлено; Ultra-Tech 84 |
| 18 | A | Grav Hammer / Range | 1 | C/1 | Исправлено; Ultra-Tech 84 |
| 19 | A | Grav Hammer / Damage | 3d cr | 3d cr dkb | Исправлено; Ultra-Tech 84 |
| 20 | A | Grav Hammer / Acc | null | 0 | Исправлено; Ultra-Tech 84 |
| 21 | A | Grav Hammer / Range | 1 | C/1 | Исправлено; Ultra-Tech 84 |
| 22 | A | Grav Needle Rifle / Bulk | -2 | -3 | Исправлено; Ultra-Tech 143 |
| 23 | A | Grav Ram / Damage | 4d cr | 4d cr dkb | Исправлено; Ultra-Tech 84 |
| 24 | A | Grav Ram / Acc | null | 0 | Исправлено; Ultra-Tech 84 |
| 25 | A | Grav Ram / Range | 1 | C/1 | Исправлено; Ultra-Tech 84 |
| 26 | A | Grav Ram / Damage | 6d cr | 6d cr dkb | Исправлено; Ultra-Tech 84 |
| 27 | A | Grav Ram / Acc | null | 0 | Исправлено; Ultra-Tech 84 |
| 28 | A | Grav Ram / Range | 1 | C/1 | Исправлено; Ultra-Tech 84 |
| 29 | A | Graviton Beamer / Damage | 1d cr nkb | 1d( ∞ ) cr | Исправлено; Ultra-Tech 129 |
| 30 | A | Graviton Cannon / Damage | 6dx5 cr nkb | 6d¥5( ∞ ) cr | Исправлено; Ultra-Tech 129 |
| 31 | A | Graviton Pistol / Damage | 1d+2 cr nkb | 1d+2( ∞ ) cr | Исправлено; Ultra-Tech 129 |
| 32 | B | Graviton Pistol / Shots | 33(3) | 33(3) | Сохранено UT2007; Ultra-Tech 129 |
| 33 | A | Graviton Rifle / Damage | 3d cr nkb | 3d( ∞ ) cr | Исправлено; Ultra-Tech 129 |
| 34 | A | Gyroc Launch Pistol, 15mm / Shots | 7(3) | 6(3) | Исправлено; Ultra-Tech 145 |
| 35 | B | Hand Flamer / Acc | 3 | 3 | Сохранено UT2007; Ultra-Tech 127 |
| 36 | B | Heavy Chaingun, 15mmCL / Damage | 15d pi+ | 15d pi+ | Сохранено UT2007; Ultra-Tech 138 |
| 37 | A | Heavy Electrolaser / Shots | 72(3) | 83(3) | Исправлено; Ultra-Tech 120 |
| 38 | B | Heavy Flamer / Acc | 6 | 6 | Сохранено UT2007; Ultra-Tech 127 |
| 39 | A | Heavy Ghost Particle Cannon / Damage | 6dx20 burn ex | 6d¥20( ∞ ) burn ex | Исправлено; Ultra-Tech 131 |
| 40 | C | Heavy Molecular Bonder / Damage | - | bond, not direct injury; tearing free Will check -> 1d-4 | Контекст / представление; Ultra-Tech 85 |
| 41 | A | Heavy Pistol, 10mmCLP / Bulk | -2 | -3 | Исправлено; Ultra-Tech 137 |
| 42 | A | Heavy Rainbow Laser Pistol / Range | 90/2, 700 | 900/2, 700 | Исправлено; Ultra-Tech 117 |
| 43 | A | Holdout Gyroc, 15mm / Acc | null | 0 | Исправлено; Ultra-Tech 145 |
| 44 | A | Holdout Pistol, 7.5mmCLP / Damage | 2d pi- | 2d pi | Исправлено; Ultra-Tech 137 |
| 45 | B | Hunting Rifle, 7mmCL / Acc | 4 | 4 | Сохранено UT2007; Ultra-Tech 137 |
| 46 | A | Ice Gun, 3mm ice / Damage | 1d-1(0.2) pi- | 1d-1 (0.25) pi- | Исправлено; Ultra-Tech 140 |
| 47 | A | Laser Crystal / RoF | 10 | 1 | Исправлено; Ultra-Tech 115 |
| 48 | A | Laser Crystal / ST | null | 0 | Исправлено; Ultra-Tech 115 |
| 49 | A | Laser Crystal / Bulk | null | 0 | Исправлено; Ultra-Tech 115 |
| 50 | B | Laser Pistol / Shots | 33(3) | 33(3) | Сохранено UT2007; Ultra-Tech 115 |
| 51 | A | Laser Rifle / Range | 500/1, 500 | 700/2, 100 | Исправлено; Ultra-Tech 116 |
| 52 | B | Light Support Weapon, 7mmCL / Acc | 4 | 4 | Сохранено UT2007; Ultra-Tech 138 |
| 53 | A | Long-Range Mindripper / Damage | HT-4 aff (3 yd) | HT-4 aff (1 yd) | Исправлено; Ultra-Tech 122 |
| 54 | A | Machine Pistol, 10mmCLP / RoF | 10 | 3 | Исправлено; Ultra-Tech 137 |
| 55 | B | Magnum Pistol, 15mmCLP / Bulk | -2 | -2 | Сохранено UT2007; Ultra-Tech 137 |
| 56 | A | Medium Pistol, 7.5mmCLP / Damage | 2d+2 pi- | 2d+2 pi | Исправлено; Ultra-Tech 137 |
| 57 | B | Minigun, 7mmCL / Acc | 4 | 4 | Сохранено UT2007; Ultra-Tech 138 |
| 58 | A | MLAWS, 64mm / Shots | 6(5i) | 6(5) | Исправлено; Ultra-Tech 146 |
| 59 | A | MLAWS, 64mm / Shots | 6(5i) | 6(5) | Исправлено; Ultra-Tech 146 |
| 60 | C | Morph Axe / Damage | sw+1 | sw+1; cut/imp/cr according to configured form | Контекст / представление; Ultra-Tech 83 |
| 61 | C | Morph Axe / Range | x1.5/x2.5 | STx1.5/STx2.5 | Контекст / представление; Ultra-Tech 83 |
| 62 | C | Morph Axe / Shots | T | T(1) | Контекст / представление; Ultra-Tech 83 |
| 63 | A | Mortar Box, 64mmPLB / Range | 80 | 360/3, 000 | Исправлено; Ultra-Tech 138 |
| 64 | C | Nuclear Damper Projector / Damage | Special | suppression of fission/fission-triggered fusion, not HP | Контекст / представление; Ultra-Tech 193 |
| 65 | C | Nuclear Damper Projector / Range | 5 mi | 5 miles | Контекст / представление; Ultra-Tech 193 |
| 66 | A | Partisan Needler, 3mmN / TL | 9 | 10 | Исправлено; Ultra-Tech 140 |
| 67 | A | Pocket Aerosol / RoF | Jet | 1 | Исправлено; Ultra-Tech 134 |
| 68 | C | Pocket Molecular Bonder / Damage | - | bond, not direct injury; tearing free Will check -> 1d-4 | Контекст / представление; Ultra-Tech 85 |
| 69 | B | Portable MAD / Shots | 83(5) | 83(5) | Сохранено UT2007; Ultra-Tech 120 |
| 70 | C | Portable Nuclear Damper Projector / Damage | Special | suppression of fission/fission-triggered fusion, not HP | Контекст / представление; Ultra-Tech 193 |
| 71 | B | Portable Railgun, 10mm / Acc | 4 | 4 | Сохранено UT2007; Ultra-Tech 142 |
| 72 | A | Railgun, 40mm / Damage | 6dx25(3) pi++ | 6d¥25(3) pi | Исправлено; Ultra-Tech 142 |
| 73 | A | Railgun, 40mm / RoF | 1 | 20 | Исправлено; Ultra-Tech 142 |
| 74 | D | Rainbow Laser Carbine / TL | 11 | 10 | Нужно решение; Ultra-Tech 117 |
| 75 | A | Rainbow Laser Crystal / ST | null | 0 | Исправлено; Ultra-Tech 117 |
| 76 | A | Rainbow Laser Crystal / Bulk | null | 0 | Исправлено; Ultra-Tech 117 |
| 77 | B | Rainbow Laser Pistol / Shots | 33(3) | 33(3) | Сохранено UT2007; Ultra-Tech 117 |
| 78 | D | Rainbow Laser Rifle / TL | 11 | 10 | Нужно решение; Ultra-Tech 117 |
| 79 | B | Rainbow Strike Laser / Shots | 45(5) | 45(5) | Сохранено UT2007; Ultra-Tech 117 |
| 80 | A | Semi-Portable Blaster / Shots | 20(5) | 50(5) | Исправлено; Ultra-Tech 123 |
| 81 | A | Semi-Portable Blaster / Bulk | -10 | -8 | Исправлено; Ultra-Tech 123 |
| 82 | B | Semi-Portable Flamer / Acc | 12 | 12 | Сохранено UT2007; Ultra-Tech 127 |
| 83 | B | Semi-Portable Flamer / Shots | 100(5) | 100(5) | Сохранено UT2007; Ultra-Tech 127 |
| 84 | A | Semi-Portable Graviton Beam / Damage | 6d cr nkb | 6d( ∞ ) cr | Исправлено; Ultra-Tech 129 |
| 85 | A | Semi-Portable Graviton Beam / Range | 2, 900 | 2, 900/8, 700 | Исправлено; Ultra-Tech 129 |
| 86 | C | Smart Nail Gun / Acc | 0+3 | 0(+3) | Контекст / представление; Ultra-Tech 83 |
| 87 | C | Sonic Shuriken / Range | x0.5/x1 | STx0.5/STx1 | Контекст / представление; Ultra-Tech 166 |
| 88 | C | Sonic Shuriken / Shots | T | T(1) | Контекст / представление; Ultra-Tech 166 |
| 89 | A | Sonic Shuriken / Bulk | null | 0 | Исправлено; Ultra-Tech 166 |
| 90 | A | Sonic Stinger / Bulk | null | 0 | Исправлено; Ultra-Tech 126 |
| 91 | A | Spray Can / RoF | Jet | 1 | Исправлено; Ultra-Tech 134 |
| 92 | A | Spray Can / ST | 4 | 2 | Исправлено; Ultra-Tech 134 |
| 93 | A | Spray Can / Bulk | -4 | -2 | Исправлено; Ultra-Tech 134 |
| 94 | A | Spray Tank / Range | 2 | 3 | Исправлено; Ultra-Tech 134 |
| 95 | A | Spray Tank / RoF | Jet | 1 | Исправлено; Ultra-Tech 134 |
| 96 | A | Storm Carbine, 10mmCL / Damage | 7d pi+ | 7d pi++ | Исправлено; Ultra-Tech 137 |
| 97 | A | Storm Chaingun, 10mmCLR / Damage | 9d pi+ | 9d pi++ | Исправлено; Ultra-Tech 138 |
| 98 | B | Storm Rifle, 10mmCLR / Damage | 9d pi++ | 9d pi++ | Сохранено UT2007; Ultra-Tech 137 |
| 99 | A | Storm Rifle, 10mmCLR / Acc | 5 | 4 | Исправлено; Ultra-Tech 137 |
| 100 | B | Storm Rifle, 10mmCLR / Bulk | -4 | -4 | Сохранено UT2007; Ultra-Tech 137 |
| 101 | B | Tactical Screamer / Shots | 100(5) | 100(5) | Сохранено UT2007; Ultra-Tech 126 |
| 102 | C | Tank Cannon, 100mmCL / Damage | 6dx25 pi++ | 6d¥25 | Сохранен pi++; происхождение WT11; Ultra-Tech 138 |
| 103 | C | Underbarrel Electrolaser / ST | null | 4 | Контекст / представление; Ultra-Tech 120 |
| 104 | C | Underbarrel Electrolaser / Bulk | null | – | Контекст / представление; Ultra-Tech 120 |
| 105 | C | Underbarrel EMGL, 25mmG / Bulk | null | – | Контекст / представление; Ultra-Tech 142 |
| 106 | B | Underbarrel Grenade Launcher, 25mmPC / Acc | 4+2 | 4+2 | Сохранено UT2007; Ultra-Tech 138 |
| 107 | C | Underbarrel Grenade Launcher, 25mmPC / Bulk | null | – | Контекст / представление; Ultra-Tech 138 |
| 108 | C | Underbarrel Grenade Launcher, 40mmPLB / Bulk | null | – | Контекст / представление; Ultra-Tech 138 |
| 109 | C | Underbarrel Gyroc, 15mm / Bulk | null | – | Контекст / представление; Ultra-Tech 145 |
| 110 | A | Underbarrel Shotgun, 18.5mmPC / Damage | 4d pi++ | 4d+ pi++ | Дополнено 4d+4 pi++; WT11; Ultra-Tech 138 |
| 111 | A | Underbarrel Shotgun, 18.5mmPC / Acc | 1 | 2 | Исправлено; Ultra-Tech 138 |
| 112 | A | Underbarrel Shotgun, 18.5mmPC / RoF | 3 | 2 | Исправлено; Ultra-Tech 138 |
| 113 | A | Underbarrel Shotgun, 18.5mmPC / Shots | 5+1(3) | 5+1(3i) | Исправлено; Ultra-Tech 138 |
| 114 | C | Underbarrel Shotgun, 18.5mmPC / Bulk | null | – | Контекст / представление; Ultra-Tech 138 |
| 115 | A | Underbarrel Shotgun, 18.5mmPC / Rcl | 5 | 4 | Исправлено; Ultra-Tech 138 |
| 116 | C | Underbarrel Vortex Projector / ST | null | – | Контекст / представление; Ultra-Tech 134 |
| 117 | C | Underbarrel Vortex Projector / Bulk | null | – | Контекст / представление; Ultra-Tech 134 |
| 118 | D | Urban Assault Weapon / Damage | 4d+4 pi++ | 1d+1 pi | Нужно решение; Ultra-Tech 137 |
| 119 | C | Urban Assault Weapon / Bulk | -3 | host | Контекст / представление; Ultra-Tech 137 |
| 120 | A | X-Ray Laser Cannon / Acc | 18 | 24 | Исправлено; Ultra-Tech 118 |
| 121 | B | X-Ray Laser Pistol / Shots | 33(3) | 33(3) | Сохранено UT2007; Ultra-Tech 118 |
| 122 | A | X-Ray Strike Laser / Acc | 18 | 24 | Исправлено; Ultra-Tech 118 |
