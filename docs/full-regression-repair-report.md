# Полный регрессионный аудит и исправление — 0.2.0

Проверено 17.10.2026. Итог: **80 тестовых файлов, 1850 PASS, 0 FAIL,
0 SKIP**. Все 1842 прежних теста сохранены, добавлены 8 регрессионных.
Исходные 49 ошибок разобраны индивидуально; исправлены реальные дефекты UI,
неполные mock и исторические ожидания. Формулы боя, характеристики оружия,
GGA/GCS и исходные каталоги не менялись.

## 1. Исходный полный прогон

Прочитаны AGENTS.md, отчёты HT/+P, LeMat и двух подач UAW. До правок
автоматически обнаружены все 79 файлов. Воспроизведено ровно прежнее состояние:
**1842 теста: 1793 PASS, 49 FAIL, 0 SKIP**. Список имён и исходных строк
сохранён в `%TEMP%\olegurps-full-repair-initial-failures.json`, полный TAP —
`%TEMP%\olegurps-full-repair-before.tap`.

Для каждого файла scripts/tests/data/lang/tools/docs/styles/templates,
AGENTS.md и module.json сохранены исходные SHA-256. Предыдущая работа
HT/+P, LeMat, UAW и чужие изменения не откатывались.

## 2. Все 49 первоначальных ошибок

Классы: **A** — старое ожидание; **B** — неправильный mock/фикстура;
**C** — реальный производственный дефект; **D** — неопределённое правило;
**E** — среда. У исходных ошибок: A — 37, B — 7, C — 5; D/E не выявлены.
Это классификация первопричины, а не признание теста устаревшим по факту FAIL.
Строки ниже относятся к состоянию до задачи; параметризованные случаи
перечислены отдельно.

| # | Файл / строка | Исходный тест | Класс | Проверка / доказательство |
| ---: | --- | --- | --- | --- |
| 1 | `close-hip-shooting.test.mjs:69` | shared preview applies CHS without geometry and retains RRS/Quick-Shot modifiers | A | `closeCombatBulk=-2; GGA=11` |
| 2 | `close-hip-shooting.test.mjs:96` | actual roll receives one CHS modifier with no repeated Bulk | A | `closeCombatBulk=-2; GGA=11` |
| 3 | `close-hip-shooting.test.mjs:148` | personal fire report folds weapon level and technique details by default | A | `olegurps-chat-details; RU section; closed details` |
| 4 | `close-quarters-battle.test.mjs:67` | shared fire calculation replaces Bulk once, then applies later modifiers | A | `moveAndAttack=-1; resolver=closeQuartersBattle` |
| 5 | `close-quarters-battle.test.mjs:174` | clicking Range rows immediately updates CQB skill and modifier previews | B | `app.rangeBands=bands` |
| 6 | `close-quarters-battle.test.mjs:282` | RRS slots measure their own targets and TA, Quick-Shot, Trademark Move follow CQB | A | `moveAndAttack=-1; resolver=closeQuartersBattle` |
| 7 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: W19ooSM10ivSwlXSP Winchester Model 1897, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 8 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: W2EHajHoWWSlF8B6z Daewoo USAS-12, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 9 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: W8gU1gCeSF_EHefLt Remington Model 11, 12G 2.75" sawed-off | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 10 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: W9ki0p3eZ0dV761l1 C-More M26 MASS, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 11 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WG5D9pES9jpedWQBK Reutech Protecta Bulldog, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 12 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WGhQ3o1Zo4QfXJRmy Franchi SPAS-12, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 13 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WHlBefAVM5F3s_Fhx KAC Masterkey, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 14 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WIKNLT8GtI6laTFbn FN-Browning Auto-5, 12G, 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 15 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WSu2puv__x3S7ILvR Ithaca Model 37 Stakeout, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 16 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WUVxWN3HdmeKHmjv1 Remington Model 870P, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 17 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WVWyvqKW9KEoQ0dnM Remington Model 870, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 18 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WWpYkEgZSXCKAroUP Armsel Striker, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 19 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WedfHYdjmjQy4JdzJ Reutech Protecta 12", 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 20 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WepHIL4DWLPsoO8HC Ithaca Model 37 M&P, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 21 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: Wku81Y3GfqPAjHV-Y Reutech Protecta 18", 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 22 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WkzlenFdgtlwesK-q Condor AM-402, 12G 2.75" (slug) | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 23 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WmJ_QjDBYJH7Tmona Armsel Street Sweeper, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 24 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WsrbLU9pLyDPhDI5- Remington Model 11, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 25 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: Wu7wxc-g32vPxG2B- Remington Model 870P cruiser, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 26 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: WvUFCokYczEuOg49b Ithaca Model 37 Featherlight, 12G 2.75" | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 27 | `ht-12g-case-correction.test.mjs:37` | conventional-case +P: Wx10NaVSr1cp1bwKv Condor AM-402, 12G 2.75" (shot) | A | `strict: user-defined; ratingVerified=false; wrong ammo incompatible` |
| 28 | `ht-12g-case-correction.test.mjs:97` | independent legacy ledgers, old recipes and snapshot survive switch, reload and GM revocation without repeat spend | A | `OWNER RoF=3x9; snapshot RoF=2x9; total=30` |
| 29 | `ht-ammunition-automation.test.mjs:78` | new types load without an editor, keep separate stocks and preserve contents on magazine selection | C | `UI reference authority -> compatible construction` |
| 30 | `ht-ammunition-automation.test.mjs:91` | compatible but unresolved HP and already transformed attacks are blocked for new loading | A | `HP hidden; candidate unavailable=true` |
| 31 | `ht-ammunition-automation.test.mjs:99` | ordinary owners can select ready source profiles, while nonowners cannot open or mutate inventory | C | `UI reference authority -> compatible construction` |
| 32 | `ht-ammunition-automation.test.mjs:129` | coverage is read-only, compares every native pair, and keeps unsupported/evidence/forbidden states separate | A | `1351+21-16=1356; exact identity hash` |
| 33 | `ht-catalog-bulk-defects.test.mjs:159` | historical 227 +P restrictions stay intact; current B review preserves every E/F/G blocker | A | `APS/KPV; exact 368-pair checkpoint; E/F closed` |
| 34 | `ht-closure.test.mjs:111` | HT178 physical permission does not invent alternate ballistics: ht_22_short_5_6x11mmr | B | `getFlag(world,gurpsAmmoManager); campaignTL=undefined; alternate ballistics still required` |
| 35 | `ht-closure.test.mjs:111` | HT178 physical permission does not invent alternate ballistics: ht_38_special_9x29mmr | B | `getFlag(world,gurpsAmmoManager); campaignTL=undefined; alternate ballistics still required` |
| 36 | `ht-closure.test.mjs:111` | HT178 physical permission does not invent alternate ballistics: ht_44_special_10_9x29mmr | B | `getFlag(world,gurpsAmmoManager); campaignTL=undefined; alternate ballistics still required` |
| 37 | `ht-closure.test.mjs:111` | HT178 physical permission does not invent alternate ballistics: ht_20_gauge_2_5_15_56x63mmr | B | `getFlag(world,gurpsAmmoManager); campaignTL=undefined; alternate ballistics still required` |
| 38 | `ht-closure.test.mjs:111` | HT178 physical permission does not invent alternate ballistics: ht_12_gauge_2_5_18_5x63mmr | B | `getFlag(world,gurpsAmmoManager); campaignTL=undefined; alternate ballistics still required` |
| 39 | `ht-frangible.test.mjs:33` | Frangible unchanged stocks on switch; immutable conditions and historical Damage survive reload | C | `saved UI reference authority -> compatible construction; snapshot and one spend preserved` |
| 40 | `ht-match.test.mjs:46` | Match stock, Fire Control Acc, reload and repeated native Damage use historical snapshot without double spend | C | `saved UI reference authority -> compatible construction; snapshot and one spend preserved` |
| 41 | `ht-subsonic.test.mjs:62` | Subsonic stock, one spend, magazine switch, reload, historical repeated Damage and RU/EN | C | `saved UI reference authority -> compatible construction; snapshot and one spend preserved` |
| 42 | `ht64-cartridge-loads-batch.test.mjs:92` | legacy +P policy list is frozen; neither GM approval nor policy admits a new unproven pair | A | `userPressureAssumption=false; no published proof` |
| 43 | `ht64-cartridge-loads-batch.test.mjs:143` | P1 new labels and reason keys have exact RU/EN parity and real unavailable UI choices | A | `Handloaded Match conditional/incomplete; Silent hidden` |
| 44 | `limited-visibility.test.mjs:42` | visibility uses ordinary Fire Control and forces random/zero Aim for unseen targets | A | `aim/hitLocation/cap channel ids; Russian label; numeric results unchanged` |
| 45 | `limited-visibility.test.mjs:62` | Shooting Blind applies -10 or -6 before the final cap of 9 | A | `aim/hitLocation/cap channel ids; Russian label; numeric results unchanged` |
| 46 | `limited-visibility.test.mjs:128` | visibility block hides restricted target names and explains the blind cap | A | `aim/hitLocation/cap channel ids; Russian label; numeric results unchanged` |
| 47 | `ranged-governing-skill.test.mjs:71` | weapon base remains Ranged Level while Governing Skill anchors techniques | A | `baseSkillName RU; weapon base remains 8; Governing Skill anchors techniques` |
| 48 | `russian-ui-inventory.test.mjs:71` | first stable physical magazine is persisted once, even empty before a full magazine | B | `ordinary fixture has no phantom standalone definition; writes=1` |
| 49 | `russian-ui-inventory.test.mjs:132` | non-GM deletion needing world cleanup is rejected without partial deletion | A | `OWNER deletion; no world write; foreign decisions/resources preserved` |

## 3. Производственные исправления

### Допуск reference в списке боеприпасов

`AutomaticAmmunitionProfileService.admission()` возвращает authority
`reference` для источниково подтверждённого профиля. В двух местах
`ammo-management-app.js` эта authority передавалась в
`resolveAmmunitionEffects` как статус конструкции. Резолвер ожидает
`compatible`, а не `reference`. Поэтому новые и сохранённые APDS/SAPFSDS,
Frangible, Match и Subsonic получали ложную недоступность при работающем
AttackProfileResolver. Исправлено только преобразование успешного
reference-допуска в `compatible`, отдельно для нового выбора и запаса.

Не изменены admission, источниковые статусы, давление, физическая совместимость,
Damage, расход и права. Неполный или несовместимый профиль по-прежнему
не проходит. Пять новых тестов проверяют свежий и сохранённый тип, реальный
AmmoService от OWNER, неизменность истории и запрет повреждённого профиля.
Все пять воспроизводят прежний дефект при возврате старого преобразования.

### Русская секция при неизвестном base skill

Дополнительно найден реальный дефект представления: `buildFireSkillBreakdownHtml`
без base skill оставлял английский заголовок `Techniques`. Заменён на общий
русский «Расчёт навыка»; класс `olegurps-chat-details` и закрытое состояние
сохранены. Существующий тест теперь проверяет оба пути: с base skill и без него.
Это не изменение значения техники или формулы навыка.

### Диагностика состава HT

`auditHTCoverage` получил необязательный `includeIdentities:true`. Он добавляет
список реально посчитанных `{modeId, ammoId, variantId}`; по умолчанию прежний
формат сохранён. Предикат готовности и расчёты не менялись. Это позволяет
проверять состав множества вместо замены одного агрегата другим.

## 4. Боевые проверки и исправление mock

CHS/CQB/visibility вычислялись правильно. Падающие тесты искали английский
текст, которого больше нет в русском UI, и затем читали value у отсутствующего
результата find. Теперь численные проверки используют стабильные channel ID:
`closeCombatBulk`, `moveAndAttack`, `aim`, `hitLocation`, `cap`; русское
представление проверяется отдельно. Для actual-roll fallback проверяется
единственный русский CHS-модификатор -2 и отсутствие повторного Move and Attack.

В CQB `_selectRange` получал undefined `rangeBands` только из
`Object.create(FirePreparationApp.prototype)` в тесте. Оба рабочих места
создания окна — ammo.js и fire-control.js — передают диапазоны в конструктор.
В mock восстановлено это обязательное состояние; optional chaining, который
скрыл бы отсутствие диапазонов, в рабочий код не добавлялся.

Три новых теста проходят цепочку Fire Control → FireService → штатный
prepared GGA roll → ChatMessage. CHS: 13−2=11; CQB: 13−1=12;
blind: 30−10 с финальным пределом 9. Проверяются один фактический модификатор,
правильный итог, закрытые sections и восстановление ModifierBucket.

Формулы CHS, CQB, диапазона и видимости не менялись. Английский Hearing-2
сохранён как обозначение характеристики GURPS внутри русской подписи.
Базовый навык оружия не подменяется уровнем Governing Skill.

## 5. HT: доступ, ограничения и точный состав счётчиков

### OWNER, +P и пользовательские варианты

Для всех 21 conventional-case 12G-пар strict больше не трактуется как
обязательный GM-запрет. Сохранены исходные Damage/Range/ST/RoF/Rcl, CPS,
различия shot/slug и типов гильз. Добавлены проверки несовместимого 14.5mm
патрона, отсутствия опубликованного pressure rating и отказа новой платформе
без pressure proof. Изменение численного решения OWNER влияет на новый
профиль, но не переписывает прежний snapshot или партии.

Handloaded Match остаётся видимым условным выбором для ввода партии,
но неполный профиль недоступен для загрузки/стрельбы. Silent без доказанной
конструкции и платформы остаётся скрытым. HP с неподтверждённой конструкцией
проверяется через полный список кандидатов; отсутствие в селекторе теперь
проверяется явно, вместо чтения unavailable у undefined.

`userPressureAssumption:false` проверяется как отдельное поле происхождения
давления. Отсутствие GM-допуска не превращает предположение в книжное
доказательство. Источниковый статус +P остаётся `undetermined`.

### 366 → 368

Сохранён точный checkpoint из предыдущей задачи: добавлены только
`W10jqOZ0kjeSuoY3C/ht_5_66x39mm` (APS) и
`WK6cr08HEjTSsvYNS/ht_14_5x114mm` (KPV). Граница проверяется существующим
`assertPlusPReadyIdentities`, включая отказ на подмену/дубликат. E/F не открыты;
Derringer остаётся технически заблокированным, LeMat требует загрузочной
проверки OWNER. Устаревшее ожидание двух runtime-G-блокеров заменено точным
положительным допуском этих двух пар; официальные missing-evidence статусы
не переписаны.

### 1347 → 1356: не девять произвольно добавленных пар

Старый тест вычислял `1222+86+43−21+14+2+1=1347`, не сохранив соответствующее
множество. Для независимого сравнения только для чтения воспроизведён
исторический код и его каталоги из Git checkpoint
`be7eb91` (полный hash указан в новой фикстуре). Он действительно даёт
**1351 = 1222+86+43 готовых идентичностей**.

С текущим кодом сопоставлены все ключи `mode/ammo/variant`:
**21 добавление, 16 удалений, без дубликатов**, то есть
**1351 + 21 − 16 = 1356**.

Новые 21 состоят из 13 точных нативных HEAT, Javelin MS-HEAT, двух ручных
+P APS/KPV, трёх вариантов Hydra, Hale HE и Stinger HE-AB. Удалённые 16 —
пять вариантов на каждой из трёх старых NATO-связей Colt и только +P Zip-Gun.
Они не заменены произвольным калибром. В раннем checkpoint MAS не имел
готовых специальных вариантов, Zip-Gun имел только +P: вычитать из этой
базы 21 готовую identity было неверно. Физические новые .223-связи остаются
доступными в своих источниково проверенных UI-путях; исторический пересчёт
511 старых пар сам по себе их не добавляет.

Разница со старой арифметикой 1347 объясняется **пятью лишними вычитаниями**
и **четырьмя неучтёнными добавлениями**: APS, KPV, Hydra laser HE, Stinger HE.
Это не утверждение о девяти новых сочетаниях, возникших в текущей задаче:
1356 воспроизводились ещё до исправлений UI.

Новая `tests/fixtures/ht-coverage-history.json` содержит hash всех 1351
исторических ключей и явные 21/16 изменения с источниками. Тест удаляет
каждое ожидаемое добавление, восстанавливает каждое ожидаемое удаление и
сравнивает SHA-256 полного восстановленного множества с историческим.
Непредусмотренная добавленная или потерянная пара не пройдёт даже при том же
итоговом количестве. Обычный тест не требует Git, архивов или PDF.
Старые immutable audit contracts не менялись.

### Добавлено: 21

| Mode | Ammo | Variant | Source |
| --- | --- | --- | --- |
| `W-KvhNTS2RaLIZvSw` | `ht_specific_at4_84mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `W0nH5aEN5CsOLWS2t` | `ht_specific_javelin_fgm148a_mseat` | `ht_ms_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `W10jqOZ0kjeSuoY3C` | `ht_5_66x39mm` | `ht_plus_p` | HT117/120/165/169; OWNER manual +P |
| `W61HbVOrJ-DAQGkHW` | `ht_specific_rpg7_85mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WCN9YaUpioje5KB5t` | `ht_specific_m72a2_66mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WCjHOf4oONWBafSAa` | `ht_specific_stinger_fim92a_heab` | `ht_he` | HT152; native Stinger HE-AB |
| `WGykc_h_j4Ojyn6fu` | `ht_specific_pzf3_110mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WK6cr08HEjTSsvYNS` | `ht_14_5x114mm` | `ht_plus_p` | HT134/137/165; OWNER manual +P |
| `WLtxCaJ16zBNXOM6B` | `ht_specific_ss11_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WWhhyDtXaDfdAFrfB` | `ht_specific_armbrust_67mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WYtq-OBcCaZp7ShJJ` | `ht_specific_milan_103_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WbiMQvLGw4VhGQmTc` | `ht_specific_pf30_150mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WeXQmnN9negUgW4dp` | `ht_specific_malyutka_m_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WfQbQ4kVYxR2_9Ji1` | `ht_specific_dragon_127_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WhyC2rpq5gO7kJvPq` | `ht_specific_m20_89mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WjD-b9M0j2HJAcxyy` | `ht_specific_hydra_70mm_beehive` | `ht_beehive` | HT150; exact Hydra load / independent guidance |
| `WjD-b9M0j2HJAcxyy` | `ht_specific_hydra_70mm_wp` | `ht_white_phosphorus` | HT150; exact Hydra load / independent guidance |
| `WjD-b9M0j2HJAcxyy` | `ht_specific_hydra_laser_guided_70mm` | `ht_he` | HT150; exact Hydra load / independent guidance |
| `Wm1zVlIxEdhIN7Bdc` | `ht_specific_rpg2_82mm_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `WmG_jTzAKmvFs5myW` | `ht_specific_tow_bgm71a_heat` | `ht_heat` | HT147-153/170; exact native HEAT/MS-HEAT payload, not a second overlay |
| `Wx13jpOUxRC_YeDo6` | `ht_specific_hale_9pr_he` | `ht_he` | HT150; native Hale HE |

### Удалено: 16

| Mode | Ammo | Variant | Source |
| --- | --- | --- | --- |
| `W82oDY970UdeqLXTF` | `ht_5_56x45mm_nato` | `ht_ap` | HT117/119: old NATO link is not the reviewed .223 load |
| `W82oDY970UdeqLXTF` | `ht_5_56x45mm_nato` | `ht_apds` | HT117/119: old NATO link is not the reviewed .223 load |
| `W82oDY970UdeqLXTF` | `ht_5_56x45mm_nato` | `ht_aphc` | HT117/119: old NATO link is not the reviewed .223 load |
| `W82oDY970UdeqLXTF` | `ht_5_56x45mm_nato` | `ht_plus_p` | HT117/119: old NATO link is not the reviewed .223 load |
| `W82oDY970UdeqLXTF` | `ht_5_56x45mm_nato` | `ht_sapfsds` | HT117/119: old NATO link is not the reviewed .223 load |
| `WGJgRQusTscOtoLC9` | `ht_5_56x45mm_nato` | `ht_ap` | HT117/119: old NATO link is not the reviewed .223 load |
| `WGJgRQusTscOtoLC9` | `ht_5_56x45mm_nato` | `ht_apds` | HT117/119: old NATO link is not the reviewed .223 load |
| `WGJgRQusTscOtoLC9` | `ht_5_56x45mm_nato` | `ht_aphc` | HT117/119: old NATO link is not the reviewed .223 load |
| `WGJgRQusTscOtoLC9` | `ht_5_56x45mm_nato` | `ht_plus_p` | HT117/119: old NATO link is not the reviewed .223 load |
| `WGJgRQusTscOtoLC9` | `ht_5_56x45mm_nato` | `ht_sapfsds` | HT117/119: old NATO link is not the reviewed .223 load |
| `Wkvf5salwlKpkRx_c` | `ht_5_56x45mm_nato` | `ht_ap` | HT117/119: old NATO link is not the reviewed .223 load |
| `Wkvf5salwlKpkRx_c` | `ht_5_56x45mm_nato` | `ht_apds` | HT117/119: old NATO link is not the reviewed .223 load |
| `Wkvf5salwlKpkRx_c` | `ht_5_56x45mm_nato` | `ht_aphc` | HT117/119: old NATO link is not the reviewed .223 load |
| `Wkvf5salwlKpkRx_c` | `ht_5_56x45mm_nato` | `ht_plus_p` | HT117/119: old NATO link is not the reviewed .223 load |
| `Wkvf5salwlKpkRx_c` | `ht_5_56x45mm_nato` | `ht_sapfsds` | HT117/119: old NATO link is not the reviewed .223 load |
| `WwlfY-FYthqkLvByK` | `ht_22_long_rifle_5_7x16mmr` | `ht_plus_p` | HT92: .22 does not prove LR chamber |


Остальные связанные счётчики также проверены составом:

- APDS: ранние 99 минус три старых NATO-пары Colt = 96, а не 95.
- +P: ранние 370 минус четыре закрытые identity плюс APS/KPV = 368, а не 365.
- HE: ранние пять плюс Hale, Hydra laser HE и Stinger HE = 8, а не 6.
- Обычные: ранние 510 минус четыре закрытые identity = 506. MAS уже был
  неподтверждённым; второй раз его вычитать нельзя. Теперь неподтверждённых пять.
- Семейства: 101 историческое плюс 20 явно перечисленных новых = 121.
  Проверяется всё множество семейств, а не только 118/121. KPV не добавляет
  новое семейство: 14.5mm уже присутствовало в раннем множестве.
- APEX больше не требует GM under strict, но отсутствие численных входов
  не устраняется. HEAT native-preserved overlap guard exceptions остаются 15.

## 6. Источники, инвентарь и ТУ

Правила сверены с **GURPS High-Tech 4e**, рабочая копия только для чтения:
`E:\НРИ\GURPS\BooksCodex\GURPS - 4E - High Tech.pdf`.
SHA-256: `d791a73bbbad780bf3a337a9a428829d8c7c0a34a9b89f3a47743e991d537260`.
Проверены HT147–153 (нативные боевые части), HT165–167 (+P, Match,
Subsonic, APDS/Frangible), HT176–178 (гильзы и направленная взаимозаменяемость),
а также ранее подтверждённые APS/KPV. В этой копии печатная N = PDF N+1;
номера сверены по самим страницам. Книга и её метаданные не изменялись.
Отмена GM approvals, сохранение ручных методов и неизвестный ТУ основаны
на прямых решениях пользователя и действующем AGENTS.md. Источниковое
противоречие UAW UT135/137 не пересматривалось.

У пяти HT178-тестов mock `getFlag:()=>state` возвращал весь инвентарь даже
на `olegurps-qol.campaignTL`. Строгий parser правильно отвергал объект вместо
ТУ. Исправлены только scope/key getter и setter. Сохранены пять физических
совместимостей и запрет стрельбы без баллистики заменяющего патрона.
Неизвестный ТУ по-прежнему проходит фильтр; известный превышающий ТУ блокирует
новые опубликованные варианты. Старые запасы и снимки не переписываются.

Лишняя запись в тесте магазина вызвана другим mock: обычному оружию
одновременно добавлялось автономное определение с тем же resource ID.
Современный loadState законно создавал соответствующие подачи, после чего
initialize сохранял их catalog metadata. Фикстура теперь создаёт определение
только для явно заданного standaloneWeaponId. В отдельной проверке caption
тоже явно задаётся автономный экземпляр. Проверка единственного сохранения
и повторного initialize осталась; реальное поведение сервиса не ослаблено.
Mock setFlag теперь использует уже существующий recursive merge helper,
включая Foundry deletion keys.

Старый non-GM deletion запрет заменён на проверку OWNER: локальные решения
удалены, чужие ресурсы/решения и история сохранены, world write запрещён
исключением в mock. Legacy world approvals сохраняются для совместимости.
Отдельный тест отказа пользователю без ownership сохранён и проходит.

## 7. Изменённые файлы

Производственные:

- `scripts/tools/ammo-management-app.js` — два преобразования reference authority.
- `scripts/tools/ammo.js` — русский fallback заголовка section.
- `scripts/tools/ht-ammunition-coverage.js` — необязательная выдача ключей аудита.

Существующие тесты:
`close-hip-shooting`, `close-quarters-battle`, `limited-visibility`,
`ranged-governing-skill`, `combat-calculation-engine`, `ht-12g-case-correction`,
`ht-ammunition-automation`, `ht-catalog-bulk-defects`, `ht-closure`,
`ht64-cartridge-loads-batch`, `russian-ui-inventory` (`tests/*.test.mjs`).

Добавлены `tests/ammunition-reference-admission.test.mjs` (5 сценариев),
`tests/fixtures/ht-coverage-history.json` и этот отчёт. Ещё три сквозных
сценария добавлены в combat-calculation-engine. Файлы Frangible/Match/Subsonic
не менялись: их проверки прошли после исправления рабочего UI.

## 8. Тематические прогоны

| Группа | Состав | PASS | FAIL | SKIP |
| --- | --- | ---: | ---: | ---: |
| A | CHS, CQB, visibility, governing skill, combat engine, chat details | 54 | 0 | 0 |
| B | reference admission, 12G, HT automation, Frangible, Match, Subsonic, P1, catalog bulk | 95 | 0 | 0 |
| C | Russian inventory, HT closure, campaign TL, UAW, ammo inventory, OWNER, standalone weapons | 147 | 0 | 0 |
| Единый полный | Все автоматически обнаруженные файлы | **1850** | **0** | **0** |

Промежуточный побочный FAIL caption после упорядочения фикстуры разобран:
тест сам ссылался на не созданное им standalone-определение. В нём явно
создан нужный экземпляр; проверка saved caliber не удалена.

## 9. Последний полный прогон и дополнительные проверки

```powershell
$allTestFiles = @(rg --files tests |
  Where-Object { $_ -match '\.test\.(mjs|cjs|js)$' } | Sort-Object)
& node --test @allTestFiles
```

Последний прогон выполнен после всех изменений кода и тестов:
**80 файлов; 1850 тестов; 1850 PASS; 0 FAIL; 0 SKIP; 0 cancelled; 0 todo**.
Все файлы включены, test.only/skip не вводились, TAP создавался настоящим Node.
Результат: `%TEMP%\olegurps-full-repair-final.tap`.

Проверены синтаксис затронутых JS/MJS, строгий UTF-8, отсутствие BOM/U+FFFD
и новых искажений, JSON и ru/en key parity, `git diff --check`.
Каталоги, книги и вся data, включая матрицу Ultra-Tech, контракт и данные
источников, совпадают с исходными SHA-256. HT/UT, компактность сообщений,
снимки и Actor flags проверены полным прогоном. Версия **0.2.0** сохранена.
Глобальная локализация Foundry не менялась.

## 10. Живой Foundry

Среда: Foundry **14.364**, GGA **0.18.23**, модуль **0.2.0**, язык Foundry **en**.
После обновления страницы использован один временный Actor. Исходные
персонажи и реальные токены не изменялись. Живое окно Fire Control,
его состояние и предпросмотр проверены вместе с настоящими GGA rolls:

| Сценарий | Предпросмотр | Итог GGA | Ненулевой канал |
| --- | --- | --- | --- |
| CHS | 11 | 11 | closeCombatBulk −2, ровно один |
| CQB | 12 | 12 | moveAndAttack −1, ровно один |
| Полная слепота | 9 | 9 | visibility −10, затем финальный предел 9 |

Приватные ChatMessage сохраняют итоги с закрытыми details. Русский fallback
«Расчёт навыка» проверен без base skill. Первые попытки технического harness
были исправлены без изменения проекта: ему недоставало обязательных полей
магазина; обычную видимость нужно задавать штатным normalizeVisibility(null),
а не ненормализованным объектом. После исправления harness все три пути прошли.

Живой AmmoManagement: свежий и сохранённый APDS доступны, actual add-stock
кнопка включена при UI en/ru. Дополнительно проверены source choices
SAPFSDS, Match, Subsonic и новый/сохранённый Frangible (`2d+2(0.5) pi+`).
AW/APDS выстрел через AmmoService и штатный GGA сохранил `9d(2) pi-`,
списал **один** патрон: 3 → 2. Два штатных Damage по той же ссылке сохранили
APDS-профиль и originatingAttackMessageId, запас остался **2**. Нативные
GGA Roll Confirmation подтверждены; настройки подтверждений не менялись.
Один CDP wait истёк во время этих диалогов; обе фактические Damage-записи,
их приватность, связь и неизменный запас затем проверены отдельно.

Все **6 приватных сообщений** и временный Actor удалены; тестовые окна и hook
закрыты/сняты. Исходные **12 Actor** и **2 ChatMessage** совпали по полной
канонической сериализации и SHA-256:

- Actor: `c319b9d27db24a510e092a8510a22de2e2deef96660b313b053f243cd9caca13`.
- Messages: `8f3286e460aab3ab8bfd500a880ca4c8f931aaa966bd8557630dde956c10798e`.

Цели, controlled tokens и rollMode совпали с исходными. Права OWNER без GM
проверены автоматически; отдельная интерактивная PLAYER-сессия не открывалась.
JSON/DOM/TAP evidence находится только во временной области с префиксом
`olegurps-full-repair-`, без копий книг в репозитории.

## 11. Оставшиеся проблемы и границы

FAIL и нерешённых вопросов правил в рамках этого аудита не осталось.
Это не расширение ассортиментных или энергетических механик: Paint Carbine,
ETC, Liquid Propellant и новые системы не реализовывались. Сохранены все
прежние технические блокировки и согласованные ручные методы.
AGENTS.md и исторические shotSnapshots не переписывались. Commit, push,
merge, rebase, tag, Release и ZIP не выполнялись.
