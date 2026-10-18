# UT-1/UT-2: полнота оружия и боеприпасов

Проверка и реализация: 15 октября 2026 года. Версия модуля сохранена: **0.2.0**.

Для 28 основных режимов и шести отложенных режимов проверен полный применимый реестр UT. Все подтверждённые сочетания, которым достаточно существующего общего пути атаки, получили рецепты или сохранили уже работающий рецепт. Остальные допустимые сочетания перечислены с конкретными блокерами. **Полного функционального закрытия UT-1/UT-2 нет:** питание, управляемые снаряды, proximity и двойная подача ещё требуют разработки. Неопределённые источником конструкции не объявлены доступными.

## Источники и границы доказательств

Основной источник — локальный **GURPS Ultra-Tech, Fourth Edition, Version 1.0, 22 May 2007**, `E:\НРИ\GURPS\BooksCodex\GURPS 4E - Ultra-Tech.pdf`. SHA-256: `d1c930f8fdc2382ad833d68b4b6464c9d78e010ec62251e54ba1ee3e194efc38`. Проверено соответствие: печатная страница p соответствует странице PDF p+1 при нумерации с единицы. Прочитаны необходимые таблицы, примечания и перекрёстные правила: UT35–37, 88–89, 134–140, 146–147, 149, 152–162, 190, 193.

Дополнительно прочитан **GURPS Basic Set: Campaigns**, B378, B414–415, B432–433, B435–436. Для этого файла печатная Bp соответствует странице PDF p−335. SHA-256: `79cff8f75b91b4ba72e7947320bf98e184515e60108bda0f0891d379b3c96e80`. **Ultra-Tech Weapon Tables 2014**, печатная/PDF стр. 11, использована только для отсутствующего слагаемого урона Underbarrel Shotgun и отсутствующего типа урона Tank Cannon. Остальные расхождения не заменяют полные параметры UT2007.

Прочитаны четыре прежних UT-отчёта и индивидуальные таблицы внешнего предварительного аудита: `A:\Program Files\FoundryVTT-R\olegurps-qol-archive\source-audits\2026-10-14-ultra-tech-preliminary`. Проверены SHA-256 файлов из его `audit-manifest.json`; архив не изменялся. Предварительная таблица использовалась как перечень кандидатов, спорные допуски проверялись по книге. Параллельная задача отмены GM-допусков была завершена пользователем до объединения правок; её изменения сохранены.

Ограничения источниковой проверки:

- Обе официальные страницы исправлений SJGames (`ultra-tech.html` и `ultra-tech-2p.html`) вернули HTTP 403. Полную проверку актуальных errata подтвердить нельзя.
- Для Burrow Darts прочитан доступный русский текст UT155. Прежний аудит ссылается на английское изображение пользователя, но само изображение в этой сессии недоступно; повторное чтение этого английского фрагмента не заявляется. Доступные текст и аудит согласуются.
- В UT152 указан Swarm от 25mm, а подробное описание и таблица UT156 начинаются с 40mm. Для четырёх 25mm-носителей это оставлено неопределённым.
- У APHEX в данном издании нет опубликованных цены и LC. Они не придуманы. Величины между табличными настройками Mininuke/Micro-Antimatter не интерполируются.
- Книги и большие фрагменты их текста в репозиторий не копировались. Библиотека использовалась только для чтения.

## Машиночитаемая матрица

Полная индивидуальная матрица: [data/ut-weapon-ammunition-matrix.json](../data/ut-weapon-ammunition-matrix.json). Каждая строка содержит конкретные режим, физическое семейство, подачу, кандидата, статус, страницы, основание, TL/условия, рабочий рецепт либо блокер. CL, CLP, CLR, PC, N, T, air и ice остаются разными семействами.

SHA-256 матрицы: `1b423184dd738de476a1c5acc9d2dd9211a421995340c05d1c29a50d50b96daa`.

| Показатель | Число |
|---|---:|
| Основные режимы UT-1/UT-2 | 28 |
| Отложенные режимы, включая оба ствола UAW | 6 |
| Всего режимов | 34 |
| Конфигурации с двумя дополнительными подачами | 36 |
| Кандидаты на конфигурацию | 69 |
| Индивидуальные строки | 2 484 |
| Подтверждено источником | 320 |
| Допустимо при условиях | 505 |
| Недостаточно данных | 16 |
| Несовместимо | 1 643 |
| Источниково допустимые доступные строки | 454 |
| Источниково допустимые технически заблокированные строки | 371 |

Без двух альтернативных подач: 2 346 строк — 306 подтверждённых, 482 условных, 16 неопределённых, 1 542 несовместимых. Для основных подач доступны 446 строк; после исключения синонима Biochemical Liquid Pellet у Paint Pistol остаётся **445 различных сочетаний «режим × рецепт»**, включая исходные заряды. Числа отражают покрытие кандидатов, а не число разных заводских изделий или процент готовности: общий Homing и его пять сенсорных вариантов намеренно видны отдельно; альтернативные подачи повторяют ассортимент.

Воспроизводимое построение без книг и архива:

```powershell
node --experimental-default-type=module tools/audit-ut-ammunition-completeness.mjs
```

Проверка хеша первичного PDF и файлов предварительного аудита при наличии локальных источников:

```powershell
node --experimental-default-type=module tools/audit-ut-ammunition-completeness.mjs --verify-sources
```

Обычный Foundry и адресные тесты используют исходные правила и [контракт](../tests/fixtures/ut-ammunition-coverage-contract.json), без доступа к PDF/архиву. Старый HT-контракт не изменялся. Проверка матрицы независима от наличия рецепта: прямоугольник и статусы строятся по источниковым ограничениям, затем для каждой допустимой незаблокированной строки проверяются реальный recipe admission и resolver.

## Полный набор кандидатов

37 боевых частей/пуль, UT152–159: Standard/Inert, APHC, APDS, APEP, APHEX, Biochemical Aerosol, Biochemical Liquid, Flare, HE, HEC, HP, Shaped Charge, Memory Baton, Monochain, Shotshell, SEFOP, Tangler, Thermobaric, Burrow Darts, HEMP, Stingray, Swarm, APHD, Mininuke, Micro-Antimatter, EMP, Expendable Jammer, Strobe, Warbler, Force, Plasma, Implosion, Psi Bomb, Message Psi Bomb, Terror Psi Bomb, Stasis, Vortex.

Шесть специальных зарядов, UT139–140, 153, 161: Drugged Dart, Drugged Ice Sliver, Paint Pellet, Biochemical Liquid Pellet, Ice Needle, 25mm Solid Metal Slug.

20 семейств опубликованных конструкций/режимов из существующего реестра: Laser Wavelength, Laser Blinding, Laser Pulse, Omni-Blaster Stun, Force Kinetic/Stun, Neural Settings, Microwave/Sonic/Psychotronic Settings, Hotshot, Overheating, Beam Design Options, ETC, Liquid Propellant, EM Variable Velocity, Gyroc Mixed Chambers, Homing, Reactionless Missiles, Conversion Beams, Reality Disintegrators, Nuclear Jammers, Grenade Fuses. В каждой строке проверена область применимости; beam/EM/gyroc/missile/grenade-конструкции не превращены в пули выбранных guns.

Отдельно проверены пять вариантов Homing по UT146: Infrared; Multispectral — Hyperspectral Vision, Detect Radar and Radio, Imaging Radar; Multiscanner — Penetrating Para-Radar. Размер проверяется по выбранному TL каждого сенсора. Дополнительный кандидат — HE proximity, UT153–154.

Неметаллическое газовое оружие UT140 проверено отдельно: это конструкция самого оружия с множителем цены ×1.5, не новый боеприпас; Partisan Needler исключён. Свободные вещества, препараты и аэрозоли UT159–162 задаются через Note/описание/сопротивление. Совпадение названия с книгой не требуется, эффект по одному названию не автоматизируется. Настройки liquid propellant low/normal/boost рассмотрены вместе с конструкцией и её дробным расходом, а не посчитаны как независимые заводские патроны.

## Реализованная механика и ручные последствия

Добавлен resolver 28 оставшихся типов, из которых **27 доступны** на подтверждённых носителях; SEFOP удерживается блокером наведения. Расширены существующие кинетические рецепты на подтверждённые air/needle-платформы; добавлен общий Tangler для 25mmCL и 100mmCL. Используются прежние AmmoService, AttackProfileResolver, Fire Control, штатный бросок GGA и существующие ссылки компонентов Damage.

| Группа | Что рассчитывается | Что применяется вручную |
|---|---|---|
| APHC/APDS/APEP/HP/APHD, UT152–154, 156 | AD, piercing, опубликованная дальность и точные прибавки per die | Обычные последствия Damage штатным GGA |
| APHEX/HE/HEC, UT152–154 | Piercing/AD; отдельные follow-up либо linked и fragmentation; повышение табличного заряда по TL | Пробитие, выбор внутреннего/наружного взрыва, площадь и попадания осколков |
| Shaped Charge/HEMP, UT154–155 | Табличные primary/linked/fragmentation, AD; +1 per die внутри множителя при требуемом TL | Incendiary, следствия пробития и площади |
| Memory Baton, UT154 | Crushing, AD 0.25, double knockback, дальность /5 | Knockback и injury |
| Monochain, UT154 | Общий модификатор Fire Control +1; дальность /2; результат GGA /2 вниз; отдельная альтернативная cutting (10) ссылка | Выбор допустимой зоны либо SM ≤ −2; альтернативный компонент заменяет primary, не суммируется с ним |
| Burrow Darts, UT155 | Начальный piercing с AD 0.5 | После ≥1 injury — 1 HP/ход до смерти либо указанного времени; извлечение и First Aid со штрафом за прошедшие секунды |
| Stingray, UT155 | Piercing AD 0.25 и /2 результата; linked electrical без деления | HT и последствия локального/общего электрического поражения, Surge по B432–433 |
| Thermobaric, UT155 | Таблица, +1 per die от TL10; /2 в very thin, /4 в trace/vacuum после броска | Площадь взрыва, воспламенение |
| Plasma/Force, UT157–158 | Табличные компоненты, Surge/double knockback обозначены | Площадь, Surge и перемещение |
| EMP, UT157 | Отдельный настоящий HP-взрыв | HT−8 (2), длительность и отключение Electrical-целей |
| Mininuke/Micro-Antimatter/Implosion, UT156–158, 88 | Опубликованные primary/linked формулы и настройки до атаки; цена antimatter = base×10 + filler по TL | Разный спад компонентов с расстоянием, PF, Radiation Tolerance, доза и таблица B435–436, knockback |
| Flare, UT153 | 1d burn прямого попадания, радиус освещения | Горение 5 минут, HT/HT−3, ослепление и воспламенение |
| Jammer/Strobe/Warbler, UT157 | Радиус и точные инструкции без фиктивного HP | Помехи −10; HT с расстоянием; состояния, длительность и повторные проверки |
| Swarm, UT156 | Для 100mm — вместимость 16 кв. ярдов, без подмены её радиусом | Выбранный рой, команды, движение, питание и атаки по UT35–37 |
| Psi/Message/Terror, UT158 | Источниковый допуск и параметры/инструкции без HP | Сопротивление, выбранный psi-эффект и его последствия |
| Stasis/Vortex, UT158–159, 193 | Радиус; Stasis preset ≥300 секунд фиксируется до атаки | Стазис, защитные поля, окончание; атмосфера/гравитация и место выхода Vortex |
| Tangler, UT155 | Табличные ST/DR/радиус/длительность; 100mm ST60/DR20/+3 за слой, радиус 1 | Попадание сети, освобождение, слои и состояния |
| Biochemical, drugged/paint/ice, UT139–140, 153, 161 | Физический заряд, атака, источниковые дозы/площадь и свободные поля партии | Содержимое, сопротивления и действие вещества |

Число компонентов, осколков, доз или площадь роя не увеличивают физический расход. Списание идёт один раз за фактически выпущенные патроны; повторный Damage не списывает ещё один патрон. Деление результата Monochain/Stingray/Thermobaric использует уже завершённый бросок GGA, округляет вниз и не изменяет число кубов приближённо. Радиационные компоненты явно требуют ручного учёта дозы: выдача такой ссылки не означает автоматическое применение HP к цели.

Поля партии: произвольный либо пустой Note, ручной радиус или его удаление, сопротивление, описание, идентификатор партии; дополнительно TL, опубликованная настройка мощности/массы, длительность Stasis и атмосфера Thermobaric. Владелец сохраняет и редактирует их без GM-допуска. Новые элементы русские при Foundry ru/en; используется действующее окно ApplicationV2. Подробности в модульном чате закрыты в `<details>`, исход и ресурсы остаются видимыми; шаблон результата GGA сохранён.

Исторический shotSnapshot фиксирует содержимое и механические параметры. В сохранённый рецепт не записываются таблицы с ключами вроде `18.5mm`: Foundry раскрывает точки в flag-ключах. Сохраняются идентификатор определения, выбранная строка и параметры; полные таблицы остаются константами resolver. Это исправлено после проверки настоящего сохранения Actor и проверено повторно после перезагрузки.

Решения пользователя от 15.10.2026:

- **25mm Expendable Jammer — исходный радиус 25 ярдов.** В UT157 соответствующей строки нет; значение помечено ручным, может редактироваться/удаляться и не выдаётся за книжное.
- **Обычные conventional guns — встроенная B cell учитывается вручную.** UT135/149 не дают расхода на выстрел; численный drain не вводится. Моторы, Paint Carbine и ETC это решение не разблокирует.

## Все оставшиеся блокеры

Следующие обозначения используются ниже для каждой модели. Полные индивидуальные списки и основания находятся в JSON; далее также перечислены доступные и недостающие типы по каждой конфигурации.

- **H** — Homing, включая пять индивидуальных сенсорных вариантов: UT146 требует Artillery lock-on и независимого броска самого снаряда. Смена патрона пока не переключает общий путь на эти две стадии. SEFOP также требует этого пути. Решение: расширить общий профиль/Fire Control стадиями lock-on и projectile attack с сохранением обоих результатов, не имитировать их обычным Guns.
- **P** — HE proximity, UT153–154: требуются дистанция ≥40 ярдов, атака области +4, только осколки и рассеивание квадратом величины промаха. Ударный HE работает; proximity требует расширения общего расчёта области до атаки.
- **E** — ETC, UT139: обязательны конверсия оружия и ресурс A/B/C cell на 10 магазинов. Решение: общий атомарный учёт снарядов и энергии, с точной ёмкостью по источнику.
- **L** — Liquid Propellant, UT139: нужны отдельная бутылка propellant и совместный расход 1/1.5/0.25 со снарядом, включая изменение Damage/Range/Rcl и ограничения режимов. Решение: общий ресурсный ledger и отдельная конверсия оружия; обычный CL не имитирует эту конструкцию.
- **B** — Paint Carbine, UT139: B cell на 10 магазинов. До совместной транзакции питания и боеприпаса заблокированы все допустимые заряды.
- **M** — моторы, UT136–137: Gatling Carbine — B cell на 19 500 выстрелов; Minigun — C cell на 15 минут; Storm Chaingun — B cell на 15 минут; Heavy Chaingun — C cell на 15 минут. Нужны также корректный учёт времени работы и отсутствие частичного списания при ошибке. Все заряды этих платформ остаются заблокированы.
- **U** — UAW, UT135/137: два ствола требуют независимых подач. Дополнительно остаётся ранее выявленное расхождение shotgun-параметров между описанием и таблицей. Решение: две подачи в общем AmmoService и явный выбор источникового набора параметров; ни один ствол сейчас не объявлен работающим.

Неопределённые пары, всего 16: Swarm25 — четыре носителя; Liquid Propellant 18.5mmPC — четыре shotgun и shotgun-ствол UAW; Drugged Dart у Partisan — одна; Homing Ice Needle — общий и пять сенсорных вариантов, шесть. Для 18.5mmPC UT139 описывает liquid-propellant версию caseless-оружия, но не устанавливает тождество этой конструкции существующему plastic-cased патрону. Изготовление игл Partisan не доказывает самостоятельный drugged dart. Управляемая ледяная игла не подтверждена. Для этих случаев нужны уточнённый источник или явное пользовательское правило; прежние значения не заменяются догадками.

Общий статус «сложный эффект» как причина пропуска не используется. Ручные эффекты после безопасного выстрела доступны; блокеры удерживают только отсутствующую обязательную механику до/во время атаки или расхода. Grenade Fuses проверены как неприменимые к выбранным gun-режимам; гранаты и отдельные гранатомётные режимы не реализовывались.

## Покрытие по каждой модели

В таблице для каждого режима проверены все 69 кандидатов. «Исполнимые реализованы» означает наличие рецептов для всех строк без объективного блокера, а не автоматизацию всех последствий. Наличие H/P/E/L учитывается даже у исправно стреляющей базовой модели. Ice Gun закрыт по доказанному ассортименту, но имеет отдельную недоказанную конструкцию Homing; весь пакет полным не объявляется.

| Режим / семейство | Подтв. | Усл. | Неопр. | Несовм. | Доступно | Блок. | Блокеры | Полное функц. закрытие |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Holdout Pistol, 7.5mmCLP (`7_5mm_clp`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Medium Pistol, 7.5mmCLP (`7_5mm_clp`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Heavy Pistol, 10mmCLP (`10mm_clp`) | 9 | 16 | 0 | 44 | 16 | 9 | E/L/H/P | нет |
| Magnum Pistol, 15mmCLP (`15mm_clp`) | 11 | 19 | 0 | 39 | 20 | 10 | H/E/L/P | нет |
| Machine Pistol, 10mmCLP (`10mm_clp`) | 9 | 16 | 0 | 44 | 16 | 9 | E/L/H/P | нет |
| Personal Defense Weapon, 5.7mmCL (`5_7mm_cl`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Assault Carbine, 7mmCL (`7mm_cl`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Storm Carbine, 10mmCL (`10mm_cl`) | 9 | 16 | 0 | 44 | 16 | 9 | E/L/H/P | нет |
| Storm Rifle, 10mmCLR (`10mm_clr`) | 9 | 16 | 0 | 44 | 16 | 9 | E/L/H/P | нет |
| Hunting Rifle, 7mmCL (`7mm_cl`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Anti-Materiel Rifle, 15mmCL (`15mm_cl`) | 11 | 19 | 0 | 39 | 20 | 10 | H/E/L/P | нет |
| Payload Rifle, 25mmCL (`25mm_cl`) | 15 | 24 | 1 | 29 | 29 | 10 | H/E/L/P | нет |
| Light Support Weapon, 7mmCL (`7mm_cl`) | 5 | 7 | 0 | 57 | 8 | 4 | E/L/H | нет |
| Assault Cannon, 25mmCL (`25mm_cl`) | 15 | 24 | 1 | 29 | 29 | 10 | H/E/L/P | нет |
| Tank Cannon, 100mmCL (`100mm_cl`) | 16 | 27 | 0 | 26 | 33 | 10 | H/E/L/P | нет |
| Civilian Shotgun, 18.5mmPC (`18_5mm_pc`) | 12 | 18 | 1 | 38 | 21 | 9 | H/E/P | нет |
| Close Assault Weapon, 18.5mmPC (`18_5mm_pc`) | 12 | 18 | 1 | 38 | 21 | 9 | H/E/P | нет |
| Shotgun Pistol, 18.5mmPC (`18_5mm_pc`) | 12 | 18 | 1 | 38 | 21 | 9 | H/E/P | нет |
| Underbarrel Shotgun, 18.5mmPC (`18_5mm_pc`) | 12 | 18 | 1 | 38 | 21 | 9 | H/E/P | нет |
| Needler, 3mmN (`3mm_n`) | 5 | 6 | 0 | 58 | 9 | 2 | H | нет |
| Needle Rifle, 3mmN (`3mm_n`) | 5 | 6 | 0 | 58 | 9 | 2 | H | нет |
| Wrist Needler, 3mmN (`3mm_n`) | 5 | 6 | 0 | 58 | 9 | 2 | H | нет |
| Partisan Needler, 3mmN (`3mm_n`) | 5 | 5 | 1 | 58 | 8 | 2 | H | нет |
| Paint Pistol, 15mm (`15mm_air`) | 11 | 19 | 0 | 39 | 22 | 8 | H/P | нет |
| Paint Carbine, 15mm (`15mm_air`) | 11 | 19 | 0 | 39 | 0 | 30 | B | нет |
| Tangler, 25mmT (`25mm_t`) | 15 | 23 | 1 | 30 | 30 | 8 | H/P | нет |
| Tangler Pistol, 25mmT (`25mm_t`) | 15 | 23 | 1 | 30 | 30 | 8 | H/P | нет |
| Ice Gun, 3mm ice (`3mm_ice`) | 1 | 1 | 6 | 61 | 2 | 0 | — | по доказанному ассортименту |
| Gatling Carbine, 5.7mmCL (`5_7mm_cl`) | 5 | 7 | 0 | 57 | 0 | 12 | M | нет |
| Minigun, 7mmCL (`7mm_cl`) | 5 | 7 | 0 | 57 | 0 | 12 | M | нет |
| Storm Chaingun, 10mmCLR (`10mm_clr`) | 9 | 16 | 0 | 44 | 0 | 25 | M | нет |
| Heavy Chaingun, 15mmCL (`15mm_cl`) | 11 | 19 | 0 | 39 | 0 | 30 | M | нет |
| Urban Assault Weapon / SMG barrel, 10mmCLP (`10mm_clp`) | 9 | 16 | 0 | 44 | 0 | 25 | U | нет |
| Urban Assault Weapon / Shotgun barrel, 18.5mmPC (`18_5mm_pc`) | 12 | 18 | 1 | 38 | 0 | 30 | U | нет |

Дополнительные подачи UT136: Light Support Weapon принимает магазин Assault Carbine (50 вместо штатного 200) с теми же восемью доступными кандидатами; Storm Chaingun принимает магазин Storm Rifle, но все 25 допустимых строк остаются заблокированы мотором. Семейства 7mmCL и 10mmCLR сохранены; численно похожий 10mmCL не подставляется.

### Индивидуальные доступные и недостающие сочетания

Идентификаторы ниже совпадают с JSON. Перечень «заблокировано» включает только источниково допустимые строки; неопределённые вынесены отдельно. Стандартный заряд и синонимы сохранены, поэтому счётчик строк может превышать число разных рецептов.

**Holdout Pistol, 7.5mmCLP** (`WngbnzWRwLntvaRbR`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Medium Pistol, 7.5mmCLP** (`WlqvLkGz-INk0A-_o`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Heavy Pistol, 10mmCLP** (`W9chB7ydzOWTAxQP0`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Magnum Pistol, 15mmCLP** (`WIAo1otMCstnbi4Dv`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Machine Pistol, 10mmCLP** (`W5_0Tkbdr1S4b4Hlv`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Personal Defense Weapon, 5.7mmCL** (`WoLIvHFqsiusWgmXF`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Assault Carbine, 7mmCL** (`WFc8O-LgWxenUseNy`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Storm Carbine, 10mmCL** (`W30vD5BH3t_VdkWUZ`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Storm Rifle, 10mmCLR** (`W3Ggl5bTeg_44b_rU`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Hunting Rifle, 7mmCL** (`WeFF7cHxefAAGmowq`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Anti-Materiel Rifle, 15mmCL** (`WlstnlxI_Mm-2UJf0`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Payload Rifle, 25mmCL** (`WdUnAFzFvv59Smhhk`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, shaped_charge, memory_baton, monochain, tangler, thermobaric, HEMP, stingray, APHD, mininuke, micro_antimatter, EMP, expendable_jammer, strobe, warbler, force, plasma, psi_bomb, message_psi_bomb, terror_psi_bomb.

Заблокировано: SEFOP, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: swarm.

**Light Support Weapon, 7mmCL** (`W5_HQQYf_zjoG9A7J`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: etc, liquid_propellant, homing, Infrared Homing.

**Assault Cannon, 25mmCL** (`WgqAB3QGTUZrgtdES`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, shaped_charge, memory_baton, monochain, tangler, thermobaric, HEMP, stingray, APHD, mininuke, micro_antimatter, EMP, expendable_jammer, strobe, warbler, force, plasma, psi_bomb, message_psi_bomb, terror_psi_bomb.

Заблокировано: SEFOP, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: swarm.

**Tank Cannon, 100mmCL** (`WOMuCBSS_c_nIstvm`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, shaped_charge, memory_baton, monochain, tangler, thermobaric, HEMP, stingray, swarm, APHD, mininuke, micro_antimatter, EMP, expendable_jammer, strobe, warbler, force, plasma, implosion, psi_bomb, message_psi_bomb, terror_psi_bomb, stasis, vortex.

Заблокировано: SEFOP, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Civilian Shotgun, 18.5mmPC** (`W8mzf5YoC9fFjAhO2`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, shotshell, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: liquid_propellant.

**Close Assault Weapon, 18.5mmPC** (`WwK7xKN4sLQXIuQ64`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, shotshell, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: liquid_propellant.

**Shotgun Pistol, 18.5mmPC** (`Wap9nUEQPwuDkUEUp`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, shotshell, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: liquid_propellant.

**Underbarrel Shotgun, 18.5mmPC** (`WkudgdqO3lymAYks5`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, shotshell, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma.

Заблокировано: SEFOP, etc, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: liquid_propellant.

**Needler, 3mmN** (`WRsVDXjeX3ABpRPVp`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD, Drugged Dart.

Заблокировано: homing, Infrared Homing.

**Needle Rifle, 3mmN** (`WfcQvWVcsBWPUShFm`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD, Drugged Dart.

Заблокировано: homing, Infrared Homing.

**Wrist Needler, 3mmN** (`WGRshSOWjRXli8vBQ`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD, Drugged Dart.

Заблокировано: homing, Infrared Homing.

**Partisan Needler, 3mmN** (`WTVT6tvGqOqE1N6e6`).

Доступно: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD.

Заблокировано: homing, Infrared Homing.

Недостаточно данных: Drugged Dart.

**Paint Pistol, 15mm** (`W5Xb6neoqVfdlbqiS`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma, Paint Pellet, Biochemical Liquid Pellet.

Заблокировано: SEFOP, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Paint Carbine, 15mm** (`Wg_f0E5hqv6o1C0Uj`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, SEFOP, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma, Paint Pellet, Biochemical Liquid Pellet, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Tangler, 25mmT** (`WSv_Zh3pW3Tl-tCf5`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, shaped_charge, memory_baton, monochain, tangler, thermobaric, HEMP, stingray, APHD, mininuke, micro_antimatter, EMP, expendable_jammer, strobe, warbler, force, plasma, psi_bomb, message_psi_bomb, terror_psi_bomb, 25mm Solid Metal Slug.

Заблокировано: SEFOP, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: swarm.

**Tangler Pistol, 25mmT** (`WPa4KUGJ6449MaPL9`).

Доступно: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, shaped_charge, memory_baton, monochain, tangler, thermobaric, HEMP, stingray, APHD, mininuke, micro_antimatter, EMP, expendable_jammer, strobe, warbler, force, plasma, psi_bomb, message_psi_bomb, terror_psi_bomb, 25mm Solid Metal Slug.

Заблокировано: SEFOP, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: swarm.

**Ice Gun, 3mm ice** (`WPP4GGv21sVx2-CHg`).

Доступно: Drugged Ice Sliver, Ice Needle.

Заблокировано: нет.

Недостаточно данных: homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar.

**Gatling Carbine, 5.7mmCL** (`WYYJ_58OEKOTk38wi`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD, etc, liquid_propellant, homing, Infrared Homing.

**Minigun, 7mmCL** (`W6-C_sQqk0Ak_c-8_`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, hp, monochain, burrow_darts, APHD, etc, liquid_propellant, homing, Infrared Homing.

**Storm Chaingun, 10mmCLR** (`WmyROTLk0gs7lrYCE`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Heavy Chaingun, 15mmCL** (`W6bX3WBkGZdZfoeMu`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, SEFOP, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Urban Assault Weapon / SMG barrel, 10mmCLP** (`WtM51JNSpOUIy3Eo1`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, HE, HEC, hp, monochain, HEMP, stingray, APHD, micro_antimatter, expendable_jammer, plasma, etc, liquid_propellant, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

**Urban Assault Weapon / Shotgun barrel, 18.5mmPC** (`WRvS5pz3LMCzqQyiZ`).

Доступно: нет.

Заблокировано: Standard/Inert, aphc, apds, apep, APHEX, biochemical_aerosol, biochemical_liquid, flare, HE, HEC, memory_baton, monochain, shotshell, SEFOP, HEMP, stingray, APHD, micro_antimatter, EMP, expendable_jammer, force, plasma, etc, homing, Infrared Homing, Multispectral: Hyperspectral Vision, Multispectral: Detect Radar and Radio, Multispectral: Imaging Radar, Multiscanner: Penetrating Para-Radar, HE proximity.

Недостаточно данных: liquid_propellant.

## Проверки

Новый файл `tests/ut-ammunition-completeness.test.mjs`: **11 PASS, 0 FAIL**. Проверяются полный прямоугольник и воспроизводимость, все допустимые рецепты и неподтверждённые допуски, точные формулы/компоненты, однократный расход, OWNER без GM, разные партии, свободный/пустой Note и удаление радиуса, неизменность истории, настройки до выстрела, русский словарь при ru/en, Monochain в общем Fire Control и сброс при смене магазина, отсутствие точек в сохраняемых flag-ключах, все девять комбинаций цены Micro-Antimatter по TL/массе, альтернативный магазин LSW и реальный расход очереди.

Адресный набор из восьми файлов: **319 PASS, 0 FAIL** — `ut-conventional-firearms`, `ut-special-firearms`, `ut-ammunition-completeness`, `damage-shot-link`, `ammo-inventory`, `combat-calculation-engine`, `player-controlled-ammunition`, `ht-preservation` (все с суффиксом `.test.mjs`). На момент этого прогона новый файл содержал девять тестов. После исправления сохранения в настоящем Foundry и добавления цены/альтернативного магазина новый файл проверен отдельно, 11/11. После последующих уточнений матрицы/решения о B cell повторялись только соответствующие адресные проверки полноты и доступности; они прошли.

Связанные `automatic-ammunition-profiles.test.mjs` и `ammunition-effects.test.mjs`: **37 PASS, 0 FAIL**. Пять старых HT FAIL не объявляются исправленными этой задачей: существующие HT-тесты и соответствующий отдельный отчёт другой задачи сохранены. Текущие 37 проверок прошли на актуальном состоянии общей рабочей папки; исторический запуск с пятью ошибками не переписывался.

Команды используют `node --experimental-default-type=module --test --test-reporter=spec` с явно перечисленными файлами. **Полный набор проекта не запускался.** Первоначальная регрессия отображения шести отложенных режимов была устранена через общий признак блокировки платформы; итоговый адресный набор проходит без ослабления существующих тестов.

Построение матрицы с `--verify-sources` успешно. Итоговые статические проверки: 27 затронутых/новых файлов декодируются строгим UTF-8 без BOM, U+FFFD и проверенных признаков mojibake; синтаксис 21 JS/MJS-файла корректен; JSON разбирается, ru/en имеют одинаковые 786 конечных ключей, сгенерированный русский словарь совпадает с ru.json. `git diff --check` для файлов задачи проходит. Финальная адресная проверка воспроизводимости матрицы и доступности всех пар: 2 PASS, 0 FAIL.

### Живой Foundry

Foundry **14.364**, GGA **0.18.23**, язык работающего клиента **en**. Использован новый приватный временный Actor без изменения реальных персонажей. Проверены 30 представителей всех 27 новых исполнимых типов, Tangler100, APHC Needler и дополнительный APHEX. Дополнительно выполнена атака через настоящее окно Fire Control и его кнопку: Monochain дал общий +1, навык 10 → 11, расход 1.

Итого **31 атака и 37 штатных бросков Damage**, **68 приватных сообщений**. Проверены реальные Actor flags, сохранённые рецепты, штатная атака GGA и компонентные Damage-ссылки. Для деления проверен фактический GGA transfer: Monochain 7 → 3, Stingray 16 → 8, Thermobaric vacuum 39 → 9. Повторный Damage старого APHEX после редактирования партии не изменил снимок и не списал патрон. Применение урона к реальным целям и ручные эффекты не выполнялись.

В настоящем редакторе при Foundry en отображаются русские поля; очищены Note и радиус Jammer, изменено сопротивление. Количество и общий запас сохранены, старые 31 снимок не изменились. При стандартном окне 720px и viewport 1440×1000 осмотрена компоновка; настройка viewport возвращена. Проверка ru/en словарей выполнялась адресным тестом без смены языка пользователя.

После перезагрузки сохранены все 31 снимок, содержимое/приватность 68 сообщений и 30 рецептов. Хеши всех 12 прежних Actor совпали с исходными. Удалены ровно 68 временных сообщений и временный Actor; остались исходные 12 Actor и 17 сообщений. После последней перезагрузки ещё раз выполнена проверка только чтением: все исходные Actor неизменны, все исходные сообщения присутствуют, временный Actor отсутствует, временных сообщений 0. В загруженном окончательном коде стоимость 100mm Micro-Antimatter TL10/0.1ug равна $4250, включая наполнитель.

Реального активного non-GM клиента не было: OWNER без GM проверен тестами, живые действия выполнялись в доступном GM-клиенте. Не заявляется живое подтверждение non-GM или всех 445 сочетаний; полное машинное покрытие и репрезентативная живая проверка различаются.

## Изменения и сохранённые границы

Добавлены `ut-ammunition-scope.js`, `ut-extended-source.js`, `ut-extended-ammunition.js`, машинная матрица, контракт, аудитор, адресный тест и его helper. Расширены существующие UT-рецепты, общий resolver, AmmoService/editor, Fire Control modifier channel и адаптер завершённого GGA Damage. В ru/en добавлены ключи новых полей, пересобран `scripts/russian-ui.js`; язык модуля остаётся русским.

В **AGENTS.md** добавлен постоянный раздел «Полное покрытие оружия и боеприпасов»: полный ассортимент каждого режима, индивидуальная совместимость, все исполнимые сочетания, отдельные источниковые неопределённости/блокеры и проверка запаса, атаки, расхода и истории. Правило распространяется на HT/UT/LT и будущие книги; свобода владельца и запрет GM-допусков сохранены.

Сравнение SHA-256 со снимком 264 файлов на начало задачи выявило только 18 ожидаемых изменений существовавших файлов. Все 86 отслеженных в этом снимке файлов исходных каталогов, существующих тестов/фикстур и `module.json` сохранили свои хеши. Девять файлов задачи добавлены отдельно; существующие тесты не ослаблялись и не переписывались. Эта граница относится к началу данной задачи, а не к чистому Git HEAD: в общей папке уже находились изменения предыдущих задач.

Commit, push, merge, rebase и релиз не выполнялись. Версия 0.2.0 сохранена. GGA/GCS, исходные книги, внешний архив и чужие партии/снимки не изменялись. Существующие посторонние изменения рабочей папки и LevelDB не восстанавливались и не включались в отдельную операцию Git.

Остаётся разработать общие подсистемы H/P/E/L/B/M/U, разрешить 16 источниковых неопределённостей и проверить недоступные официальные errata. Эти зависимости перечислены индивидуально и не скрыты в проценте готовности. Все доступные в текущем пути источниково подтверждённые заряды реализованы; утверждение о полном функциональном закрытии пакета не делается.
