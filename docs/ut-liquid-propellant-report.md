# Liquid Propellant — реализация и проверка

Дата: 17.10.2026. Версия модуля **0.2.0**.

LP реализован как отдельное исполнение оружия: прежние физические боеприпасы,
увеличенная подача и отдельный баллон. Доступны 18 моделей/основных подач.
ETC и LP не складываются. Исходные каталоги, GGA/GCS, Actor.system исходных
персонажей и исторические снимки не изменены.

## Проверенные первоисточники

Книги читались только из `E:\НРИ\GURPS\BooksCodex`; записи и копирования PDF
не выполнялись. Оригинальная библиотека `Книги` не использовалась.

- **GURPS Ultra-Tech Fourth Edition, Version 1.0, May 22 2007**: UT135–139 —
  конструкции, семейства, таблицы Shots, цены и LP; UT152–159 — полный
  применимый ассортимент, размеры, условия и самостоятельные боевые части.
  Печатная N соответствует PDF-странице N+1; соответствие проверено по
  извлечённым печатным номерам UT137–139 и UT152–159. UT139 находится на PDF140.
  SHA-256: `d1c930f8fdc2382ad833d68b4b6464c9d78e010ec62251e54ba1ee3e194efc38`.
- **GURPS Basic Set: Characters**, B9 = PDF11: общее округление вниз результатов
  действий. `floor(1.5 × N)` для LP-магазина — согласованное применение этого
  правила пользователем, с отдельным учётом патронника.
- **GURPS High-Tech**, HT166 = PDF167: действующие полосы преобразования Damage,
  adds и представление результатов свыше 12d. Общая функция `htDamageDice`
  сохранена без изменения. Для дальности сохранён существующий механизм
  округления к ближайшему целому; например, 235×1.3 → 306, 235÷2 → 118.

Официальная [эррата SJ Games](https://www.sjgames.com/errata/gurps/4e/ultra-tech.html)
ответила HTTP 403. Недоступная эррата не выдаётся за проверенную; неподтверждённые
исправления не применялись. В отчёте приведены расчёты и краткие ссылки,
текст книги и PDF в репозиторий не добавлялись.

## Все исходные строки LP и индивидуальные решения

Матрица содержит 36 строк кандидата `liquid_propellant`: 22 conditional,
5 undetermined и 9 incompatible. Из 22 conditional открыты 18, четыре
намеренно сохраняют блокировку. Ни один source status не изменён.

`N` — опубликованный номинал без патронника. LP N = floor(1.5×N);
баллон = 3×LP N Standard-выстрелов. Это расчётные значения конверсии UT139,
а не отдельная опубликованная таблица LP. Знак `—` означает, что LP-ёмкость
и ресурс этой конструкции не назначены. Внутренний запас баллона в четыре раза
больше указанного в таблице.

| Weapon / configurationId | Family | Base Shots / N | LP Shots | Bottle | Source status / technical status |
| --- | --- | --- | --- | --- | --- |
| Holdout Pistol, 7.5mmCLP `WngbnzWRwLntvaRbR` | `7_5mm_clp` | 18+1(3) | 27+1(3) | 81 | conditional / **available**; UT137,139 |
| Medium Pistol, 7.5mmCLP `WlqvLkGz-INk0A-_o` | `7_5mm_clp` | 30+1(3) | 45+1(3) | 135 | conditional / **available**; UT137,139 |
| Heavy Pistol, 10mmCLP `W9chB7ydzOWTAxQP0` | `10mm_clp` | 20+1(3) | 30+1(3) | 90 | conditional / **available**; UT137,139 |
| Magnum Pistol, 15mmCLP `WIAo1otMCstnbi4Dv` | `15mm_clp` | 9+1(3) | 13+1(3) | 39 | conditional / **available**; UT137,139 |
| Machine Pistol, 10mmCLP `W5_0Tkbdr1S4b4Hlv` | `10mm_clp` | 30+1(3) | 45+1(3) | 135 | conditional / **available**; UT137,139 |
| Personal Defense Weapon, 5.7mmCL `WoLIvHFqsiusWgmXF` | `5_7mm_cl` | 100+1(5) | 150+1(5) | 450 | conditional / **available**; UT137,139 |
| Assault Carbine, 7mmCL `WFc8O-LgWxenUseNy` | `7mm_cl` | 50+1(3) | 75+1(3) | 225 | conditional / **available**; UT137,139 |
| Storm Carbine, 10mmCL `W30vD5BH3t_VdkWUZ` | `10mm_cl` | 50+1(3) | 75+1(3) | 225 | conditional / **available**; UT137,139 |
| Storm Rifle, 10mmCLR `W3Ggl5bTeg_44b_rU` | `10mm_clr` | 12+1(3) | 18+1(3) | 54 | conditional / **available**; UT137,139 |
| Hunting Rifle, 7mmCL `WeFF7cHxefAAGmowq` | `7mm_cl` | 10+1(3) | 15+1(3) | 45 | conditional / **available**; UT137,139 |
| Anti-Materiel Rifle, 15mmCL `WlstnlxI_Mm-2UJf0` | `15mm_cl` | 10(3) | 15(3) | 45 | conditional / **available**; UT137,139 |
| Payload Rifle, 25mmCL `WdUnAFzFvv59Smhhk` | `25mm_cl` | 8+1(3) | 12+1(3) | 36 | conditional / **available**; UT137,139 |
| Light Support Weapon, 7mmCL `W5_HQQYf_zjoG9A7J` | `7mm_cl` | 200(5) | ? | ? | conditional / **blocked**; UT138,139; LP для обеих подач LSW исключён решением пользователя. |
| Assault Cannon, 25mmCL `WgqAB3QGTUZrgtdES` | `25mm_cl` | 34(5) | 51(5) | 153 | conditional / **available**; UT138,139 |
| Tank Cannon, 100mmCL `WOMuCBSS_c_nIstvm` | `100mm_cl` | 1(4) | ? | ? | conditional / **blocked**; UT138,139; Tank Cannon LP исключён решением пользователя: ёмкость питающей системы не определена. |
| Civilian Shotgun, 18.5mmPC `W8mzf5YoC9fFjAhO2` | `18_5mm_pc` | 5+1(3) | ? | ? | undetermined / **not-admitted**; UT136-138,139; LP для 18.5mmPC исключён решением пользователя; caseless-конверсия этой конструкции не подтверждена. |
| Close Assault Weapon, 18.5mmPC `WwK7xKN4sLQXIuQ64` | `18_5mm_pc` | 10+1(3) | ? | ? | undetermined / **not-admitted**; UT136-138,139; LP для 18.5mmPC исключён решением пользователя; caseless-конверсия этой конструкции не подтверждена. |
| Shotgun Pistol, 18.5mmPC `Wap9nUEQPwuDkUEUp` | `18_5mm_pc` | 5+1(3) | ? | ? | undetermined / **not-admitted**; UT136-138,139; LP для 18.5mmPC исключён решением пользователя; caseless-конверсия этой конструкции не подтверждена. |
| Underbarrel Shotgun, 18.5mmPC `WkudgdqO3lymAYks5` | `18_5mm_pc` | 5+1(3i) | ? | ? | undetermined / **not-admitted**; UT136-138,139; LP для 18.5mmPC исключён решением пользователя; caseless-конверсия этой конструкции не подтверждена. |
| Needler, 3mmN `WRsVDXjeX3ABpRPVp` | `3mm_n` | 100(3) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Needle Rifle, 3mmN `WfcQvWVcsBWPUShFm` | `3mm_n` | 100(3) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Wrist Needler, 3mmN `WGRshSOWjRXli8vBQ` | `3mm_n` | 25(3) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Partisan Needler, 3mmN `WTVT6tvGqOqE1N6e6` | `3mm_n` | 140(3) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Paint Pistol, 15mm `W5Xb6neoqVfdlbqiS` | `15mm_air` | 20+1(3i) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Paint Carbine, 15mm `Wg_f0E5hqv6o1C0Uj` | `15mm_air` | 50+1(3i) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Tangler, 25mmT `WSv_Zh3pW3Tl-tCf5` | `25mm_t` | 8+1(3i) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Tangler Pistol, 25mmT `WPa4KUGJ6449MaPL9` | `25mm_t` | 4+1(3i) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Ice Gun, 3mm ice `WPP4GGv21sVx2-CHg` | `3mm_ice` | 20(3) | ? | ? | incompatible / **not-admitted**; UT135–140;UT139; LP для этой конструкции не подтверждён. |
| Gatling Carbine, 5.7mmCL `WYYJ_58OEKOTk38wi` | `5_7mm_cl` | 200(5) | 300(5) | 900 | conditional / **available**; UT137,139 |
| Minigun, 7mmCL `W6-C_sQqk0Ak_c-8_` | `7mm_cl` | 400(5) | 600(5) | 1800 | conditional / **available**; UT138,139 |
| Storm Chaingun, 10mmCLR `WmyROTLk0gs7lrYCE` | `10mm_clr` | 60(5) | 90(5) | 270 | conditional / **available**; UT138,139 |
| Heavy Chaingun, 15mmCL `W6bX3WBkGZdZfoeMu` | `15mm_cl` | 50(5) | 75(5) | 225 | conditional / **available**; UT138,139 |
| Urban Assault Weapon `WtM51JNSpOUIy3Eo1` | `10mm_clp` | 40+1(3) | 60+1(3) | 180 | conditional / **available**; UT137,139 |
| Urban Assault Weapon `WRvS5pz3LMCzqQyiZ` | `18_5mm_pc` | 5+1(3i) | ? | ? | undetermined / **not-admitted**; UT136-138,139; LP для 18.5mmPC исключён решением пользователя; caseless-конверсия этой конструкции не подтверждена. |
| Light Support Weapon, 7mmCL `W5_HQQYf_zjoG9A7J:carbine-magazine` | `7mm_cl` | N=50 (UT136; Assault Carbine UT137) | ? | ? | conditional / **blocked**; UT136,139; LP для обеих подач LSW исключён решением пользователя. |
| Storm Chaingun, 10mmCLR `WmyROTLk0gs7lrYCE:storm-rifle-magazine` | `10mm_clr` | UT136: 30; Storm Rifle UT137: 12+1 | ? | ? | conditional / **blocked**; UT136,139; LP Storm Chaingun использует только основную подачу UT138: 60→90. Альтернативный магазин не переведён на LP. |

Storm Chaingun использует именно **UT138: 60(5) → 90(5), баллон 270**.
Противоречие с описательными 100 и альтернативными 30 в UT136 сохранено
в объяснении; ETC обеих подач остаётся закрыт. Старые альтернативные магазины
не удаляются и работают в ordinary, но LP-атака/установка/загрузка такой подачи
отклоняется. Их ёмкость не превращается в 90 автоматически.

UAW использует **UT137: 40+1(3) → 60+1(3), баллон 180** только основного
10mmCLP-ствола. Его 18.5mmPC-ствол остаётся `1d+1 pi`, Range `100/500`,
Shots `5+1(3i)`, Rcl 1 по ранее выбранной собственной строке UT137.
Противоречивая отсылка UT135 к Underbarrel Shotgun не переинтерпретирована.
Переключение активного ствола остаётся выбором магазина в соответствующей группе.

Tank Cannon исключён прямым решением пользователя: книга допускает upgrade,
но питающий номинал автозаряжания и тип исходного Damage остаются отдельными
источниковыми вопросами. Обе подачи LSW исключены тем же решением.
Четыре shotgun и дробовой UAW сохраняют undetermined: PC не объявлен
подтверждённым caseless-LP. Для air/ice/PLB-конструкций сохранён incompatible.

## Расчёт профиля и боеприпасы

`ut-liquid-propellant.js` хранит проверенные профили. `AttackProfileResolver`
каждый раз берёт исходную атаку, применяет одно исполнение оружия, затем
существующий resolver выбранного боеприпаса. Отдельной математики для UI нет.

| Режим | Piercing Damage | Обе границы Range | Топливо | Внутренние единицы |
| --- | --- | --- | --- | --- |
| Standard | исходный | исходные | 1 | 4 |
| Boosted | +1 на куб | ×1.3 | 1.5 | 6 |
| Low Velocity | ÷2 через прежний HT166 | ÷2 | 0.25 | 1 |

Примеры: Magnum Boosted `4d+5 pi++`, `306/3380`; Low Velocity `2d pi++`,
`118/1300`. Assault Carbine Boosted `6d+6 pi`, `910/5200`; Low Velocity
`3d pi`, `350/2000`. AMR Boosted использует прежнее представление больших
результатов HT166: `6d×3 pi+`; Low Velocity — `7d+2 pi+`.
**ETC AMR по-прежнему `15d pi+ → 6d×4 pi+`.**

APHC меняет только свой armor divisor/тип; APDS добавляет своё +1 на куб и
×1.5 Range после LP; APEP применяет свой divisor и удвоение Range. Для Carbine
Boosted это соответственно `6d+6(2) pi-`, `6d+12(2) pi-`, `6d+6(3) pi-`.
APHEX и impact HE/HEC получают LP только в обычном piercing-пробитии.
Follow-up, linked-взрыв, осколки, электричество Stingray, химические поля и
заменяющие заряды HEMP/SEFOP сохраняют собственный профиль и параметры.
У SEFOP→APHEX действует существующий путь APHEX. HE Proximity остаётся
осколочным. Полностью не определённый исходный piercing/Range блокируется.

Проверены все **366 доступных физических сочетаний** на 18 LP-моделях
во всех трёх режимах: **1098** последовательностей stock/load → native prepared
check → расход → snapshot в автоматическом runtime. Самостоятельные компоненты
сравниваются с ordinary отдельно, CPS и идентичность патрона сохраняются.
Условные сенсоры, ТУ, размеры, ручное наведение и прочие ограничения зарядов
не снимаются LP-конверсией. Отдельных физических рецептов LP не создано.

Acc, RoF, Rcl, ST, Bulk и навыки сохраняются. Справочная цена оружия ×1.5;
цена патрона, стоимость GGA Item и денежный инвентарь не изменяются.
Low Velocity добавляет только короткое указание «обнаружение звука −3, UT139»;
автоматического броска слуха нет.

## Сохранение, ёмкости и атомарность

В carrier сохраняются `executionVariant: lp`, `lpConfigured`, `lpFireMode`
и `lpFuel: {capacityUnits, remainingUnits, replacementId?}`. В snapshots и
receipts используется отдельное `resource.fuel`, а не энергетическое `power`.
Новое явное оснащение устанавливает полный баллон один раз. Старые LP без
состояния и повреждённые значения не чинятся открытием, stale save или
переключением исполнения: необходима подтверждённая замена.

Профиль баллона не зависит от количества магазинов или текущей загрузки.
Переходы ordinary/LP/ETC сохраняют прежние LP-баллон и ETC-батарею. Адаптация
проверенных магазинных объектов меняет вместимость, но не rounds, stocks,
партии или receipts. Загруженное сверх нового номинала сохраняется; новые
загрузки сверх номинала отклоняются сервисом. Объекты магазинов автоматически
не добавляются. Сохраняются общий лимит 10, UAW 5+5 и прежние fixed-feed правила.

`weapon-resources.js` расширяет общий путь расходуемых ресурсов; батареи
сохраняют прежнюю схему и receipts. Через очередь Actor в `AmmoService`
проверяются весь объявленный burst, физический патрон, LP mode, активная подача
и топливо. После успешного native execution патроны, топливо и receipt
сохраняются одной ресурсной записью. Недостаток любого ресурса, отмена и
ошибка native execution ничего не расходуют и не создают успешный receipt.
Attack ID защищает повторное выполнение, включая новый экземпляр сервиса.

Spraying Fire проверяет весь plannedAmmo до deferred execution; до завершения
расход нулевой. Завершение один раз списывает весь plannedAmmo, включая traverse,
и сохраняет общий fuel receipt. Смена LP mode между deferred-частями или перед
завершением отклоняется. Отмена расхода не производит. Native Damage использует
замороженный профиль и не проверяет/не расходует текущий баллон повторно.

Замена и стрельба сериализованы общей очередью. Замена сравнивает ожидаемый
баллон, защищает повторный requestId и отклоняет устаревшее подтверждение.
Ручное списание принимает только положительные конечные числа, кратные 0.25,
не превосходящие остаток. Магазины при этом не затрагиваются.
Новое LP скрыто/отклоняется при известном ТУ кампании ниже 9; уже существующие
ресурсы и снимки не удаляются при снижении ТУ. OWNER не требует GM approval;
изменения чужого Actor защищены.

## Интерфейс

В общей конфигурации доступны ordinary, ETC и Liquid Propellant по источниковому
допуску. Preview Damage/Range/Shots и цены меняется до Save без Actor.update;
ручные исходные параметры хранятся отдельно от вычисленного результата.
Fire Control сохраняет выбранный LP mode и сразу читает актуальный общий профиль.
Ordinary, ETC и дробовой UAW не получают LP-селектор.

Баллон находится справа в верхнем блоке, над разделителем; точный остаток слева.
Иконка имеет горлышко, корпус и непрерывный уровень жидкости с цветом по прежней
функции `magazineFill`. Это самостоятельная выбираемая область ресурса, без
класса магазинного чипа. Выбор меняет нижнее действие на «Заменить баллон»;
«Списать» работает с топливом. У магазинов прежние действия.

DialogV2 содержит вопрос и только **Да слева / Нет справа**, без дополнительных
полей. Non-Rechargeable, инвентарь/покупка/заправка баллонов и таймер не созданы.
Все новые подписи присутствуют в ru/en и скомпилированном русском словаре;
язык Foundry не менялся. Краткие LP-инструкции включены в общий генератор
свёрнутого описания заряда; Note, saving throw, radius и Description сохранены.
CSS-сокрытия длинного текста не добавлялось.

## Автоматическая проверка

Новый `tests/ut-liquid-propellant.test.mjs` — **77 тестов**; дополнительно три
native Damage replay-теста в `damage-shot-link.test.mjs`. Прежние тесты не
удалялись; skip/only не добавлялись. Источниковые фикстуры и хеши не изменены.

Проверены индивидуальные N/патронники/цены, три режима, точные четверти,
недостаток ресурсов, отмена/ошибка GGA, конкуренция, replacement ID, stale forms,
старое повреждённое состояние, mode/execution toggles, переполненные магазины,
реальная reference-семантика Foundry getFlag, UAW, Storm alternative feed,
OWNER/foreign Actor, ТУ, UI preview, диалог и компактный ChatMessage.

Адресный набор: LP, ETC, UAW limits, Motor/SEFOP, Battery Replacement,
Ammo Manager Performance, Weapon UI Followup, UT Completeness и Damage Shot Link:
**283 PASS, 0 FAIL, 0 SKIP**. Существующие performance-тесты проверяют адресное
обновление карточки и отсутствие копирования всех определений при одном чтении.
LP-профиль разрешается по прямому modeId; нового обхода всего каталога нет.

Единый полный финальный прогон **после последней правки кода/тестов/словарей**:
`node --test tests/*.test.mjs` — **87 файлов, 2102 PASS, 0 FAIL, 0 SKIP,
0 CANCELLED**. Исходные 2022 теста сохранены, добавлены 80.
TAP: `%TEMP%\olegurps-lp-full-final.tap`.

Синтаксис изменённых JS/MJS, строгий UTF-8, паритет ru/en, JSON и
`git diff --check` проверены. Сравнение с исходными SHA-256 подтвердило
неизменность каталогов и module.json. Чужие прежние изменения рабочей копии
и LevelDB packs сохранены; GGA/GCS и книги не редактировались.

## Живой Foundry

**Foundry 14.364 / GGA 0.18.23 / модуль 0.2.0**, язык Foundry en сохранён.
Созданы один временный Actor и один Token; исходные персонажи не использовались
для записей. Все 20 созданных ChatMessage приватны.

- Настоящий Fire Control Magnum: выбор Boosted сразу дал `4d+5 pi++`,
  `306/3380`; выстрел списал один патрон и 6 внутренних единиц топлива.
- Два настоящих native Damage GGA с Roll Confirmation дали
  `4d6[Damage] + 5 + 0` и ссылку на тот же shotSnapshot. Второй выполнен
  при пустом баллоне; повторного расхода нет.
- Carbine, AMR, Storm Chaingun primary и UAW main прошли все три режима
  через настоящий `executePreparedGgaRoll` и общий AmmoService. Проверены
  Damage/Range/Shots и расходы 4/6/1 во frozen fuel receipts.
- UAW shotgun выполнил обычную атаку `1d+1 pi`, `100/500`; LP-топливо
  основного ствола не изменилось. Партии и магазины двух стволов отдельные.
- Ordinary Magnum вернулся к `4d+1 pi++`; ETC AMR сохранил `6d×4 pi+`
  и прежний расход cell; Paint Carbine — `1d-4 pi++` и 500→499 энергии.
- Смена магазина Carbine не изменила топливо. На нуле топлива кнопка
  «Огонь» отключена, сервис отказал с «Баллон LP пуст» без списания патронов.
- Настоящий диалог замены имел Да слева, Нет справа, ноль полей ввода.
  Нет и X ничего не записали; Escape через настоящий CDP keyboard event
  вернул null и сохранил состояние. Да восстановило 39/39 без изменения патронов.
  Ручное списание через настоящий ввод шага 0.25 показало **38.75/39**.
- В настоящем окне «Настроить» LP preview показал `4d+5`, `306/3380`,
  `13+1(3)` и $1305 без изменения сохранённого Actor до Save.
- Weapon Bond проверен общим расчётом: 10→11, ровно +1.
- На ширинах карточки 900/620/460 px ресурс оставался справа над разделителем,
  переполнения карточки не было. Просмотрены фактические screenshots Fire Control
  и иконки баллона рядом с прежней десятисегментной ETC-батареей.
- После reload совпали полные JSON ресурсов, definitions и **17 shotSnapshots**.
  Отдельная PLAYER-сессия не использовалась; OWNER проверен автоматически.

Удалены временный Actor, Token и все **20** приватных сообщений; task apps и
временные hooks закрыты/сняты. Исходные **12 Actor, 4 Token и 12 ChatMessage**
совпали по полным каноническим документам. Controlled tokens, targets, rollMode,
язык и flags User совпали с исходными. Evidence JSON и screenshots сохранены
во временной области с префиксом `olegurps-lp-`, вне репозитория.

## Матрица, оставшиеся блокировки и границы

Итог: **2484 пары, 811 available, 14 blocked**. Источниковые распределения
не изменились: 320 confirmed, 505 conditional, 16 undetermined, 1643 incompatible.
14 blocked состоят из четырёх LP-строк (Tank, LSW обе подачи, Storm alternative),
девяти прежних ETC-строк и независимого UAW shotgun Shotshell. Недоказанные
18.5mmPC LP остаются not-admitted, не включаются в available ради количества.

Сохранены прежний ручной моторный учёт, допуски Homing/SEFOP и свобода
пользовательского содержимого боеприпасов. Новых GM approvals нет.
Постоянные LP-решения добавлены в AGENTS.md без удаления прежних правил.
Commit, push, merge, rebase, tag, ZIP и Release не выполнялись.
