# LeMat: актуализация исторических тестовых ожиданий — 0.2.0

Проверено 17.10.2026. Изменён только `tests/lemat-physical-ammunition.test.mjs`
и создан этот отчёт. Все 15 тестов LeMat проходят. Однако расширенный
запрошенный регрессионный прогон выявил 20 FAIL в четырёх других исторических
файлах HT/+P. Поэтому весь регрессионный этап нельзя объявить завершённым.
Эти файлы и игровая механика не изменялись.

## Исходное состояние и причины

Прочитаны AGENTS.md, отчёт UAW, текущие реализации каталогов, LeMat,
AmmoService, resolver и решений владельца, связанные тесты HT/+P и OWNER.
Исходный отдельный запуск LeMat: **12 PASS, 3 FAIL, 0 SKIP**, всего 15.
Отчёт UAW описывал две ошибки; в актуальной копии имеется также третья.

Первое ошибочное ожидание:

```js
test("+P needs both scoped GM safety and prior loading check; revoke affects future use",()=>{
  assert.equal(automatic.admission(prepared,{policy:"permissive"}).allowed,false);
  assert.equal(resolve(prepared.type,null).damage.nativeSafe,false);
  assert.equal(resolve(prepared.type,{...approval,plusPDecision:{loadingCheckPassed:false}}).damage.reason,"plus-p-loading-check-required");
  assert.equal(resolve(prepared.type,{...approval,active:false}).damage.nativeSafe,false);
  assert.equal(resolve(prepared.type,{...approval,weaponId:"revolver"}).damage.nativeSafe,false);
});
```

Ошибка начинается с требования запретить допуск без GM. Действующий допуск
LeMat сохраняет ранее разрешённую политику +P; решение владельца записывается
в `Actor.flags.olegurps-qol.ammunitionDecisions`. Для powder-and-shot остаётся
проверка безопасного заряжания. Допуск конструкции и подтверждение такой
проверки — отдельные условия. Отсутствие проверки по-прежнему даёт
`plus-p-loading-check-required`, а решение другого ствола не подходит.
Старое ожидание отмены выстрела посредством GM-флага заменено проверками
собственного решения, области его действия и отрицательных условий.

Второе ошибочное ожидание находилось внутри проверки остальных 510 пар:

```js
assert.deepEqual(effectiveMode,modes.get(modeId));
```

Без отдельного учёта HT92 оно ошибочно требовало равенства рабочего Acc 0
и сырого `null`. Речь идёт **о Zip-Gun**, `WwlfY-FYthqkLvByK`, а не о LeMat.
После устранения первого различия эта же проверка доходила до уже действующих
поправок идентичности четырёх режимов и профиля Hydra. Теперь каждая такая
поправка проверяется точным независимым ожиданием, затем только проверенные
поля возвращаются в копии к сырому виду для полного сравнения остальных полей.
Произвольные изменения и произвольная metadata не принимаются.

Третье исходное ошибочное ожидание:

```js
await assert.rejects(f.service.inventoryTransaction("shot","add-magazines",{capacity:2,amount:1}),/CapacityExceeded/);
```

При уже существующем объекте фиксированной подачи сначала срабатывает
`FixedFeedLimit`. Это прямо закреплено в AGENTS.md и отчёте UAW.
Теперь проверяются отказы для второго объекта ёмкостью 1 и 2, неизменность
инвентаря, а также `CapacityExceeded` для ёмкости 2 в отдельной пустой
тестовой подаче. Сохранена проверка предела 9 револьверного ствола.
Старая имитация записи допуска в world settings заменена реальным вызовом
сервиса решения OWNER и записью в локальные флаги Actor.

## Проверка книги и Acc

Источник прочитан только для чтения:
`E:\НРИ\GURPS\BooksCodex\GURPS - 4E - High Tech.pdf`, GURPS High-Tech 4e.
SHA-256: `d791a73bbbad780bf3a337a9a428829d8c7c0a34a9b89f3a47743e991d537260`.
Сверены печатные номера: HT92 соответствует PDF 93, HT94 — PDF 95.
Книга, её метаданные и каталоги не изменялись; текст книги в проект не копировался.

| Режим | Сырое значение Acc | Проверенный источник | Рабочий Acc |
| --- | --- | --- | --- |
| Zip-Gun, `WwlfY-FYthqkLvByK` | `null` | HT92, Dirty Tech: Improvised Guns, Zip-Gun: 0 | `"0"` |
| LeMat .42, `WbrBqEG-vOeKVREkf` | `"2"` | HT94, Revolvers Table: 2 | `"2"` |
| LeMat 18G, `WdzSSShGT_yv4ctOi` | `"1"` | HT94, описание центрального ствола: 1 | `"1"` |

Для Zip-Gun закреплены точные version/source/field/original/value поправки
и итоговый Acc resolver. Для двух LeMat дополнительно проверены сырые и
рабочие значения, отсутствие поправки Acc и итоговый Acc револьверного
профиля; итоговый Acc дробового профиля уже проверяется обычным тестом атаки.
Рабочие значения соответствуют первоисточнику; менять механику не требуется.
Acc 0 Zip-Gun сам по себе не доказывает совместимость с конкретным .22 LR.

HT165 подтверждает отдельную проверку безопасного заряжания powder-and-shot;
HT166 — общие правила изменения Damage. Проверены также соответствующие
места HT90–91, HT117/119 и HT150 для уже действующих поправок MAS,
трёх ранних карабинов Colt и отдельного пакета лазерного наведения Hydra.
Исходниковые идентичности, точные новые идентичности, обратные ссылки и
параметры Hydra проверяются явно, без автоматического принятия любых
изменений из производственных констант.

## Сохранённые ограничения

Тестовый Actor теперь раздельно хранит `world.gurpsAmmoManager` и модульные
флаги. Общие фикстуры и другие тестовые файлы не менялись. OWNER runtime
явно имеет `isGM:false`; попытка записи или регистрации world setting
выбрасывает ошибку. Проверяется единственная запись решения в флаги Actor,
пользовательский origin и сохранение инвентаря.

Проверены отказ чужому владельцу, неверные Actor/ствол/fingerprint,
недопустимый RoF, обязательная проверка заряжания. Неизвестная допустимость
давления без решения не проходит; пользовательское предположение не
превращается в опубликованное доказательство и не отменяет подтверждённый
запрет. Сохранены физическая несовместимость .42/18G, Damage, Range/ST/RoF,
однократное списание, идемпотентность, раздельность подач, старые рецепты,
неизменность shotSnapshots, локализация и все исходные 15 тестов.

## Итоговый прогон после всех правок

Команда финального пакета:

```powershell
node --test tests/lemat-physical-ammunition.test.mjs tests/player-controlled-ammunition.test.mjs tests/ht-ammunition-ux.test.mjs tests/ht64-kinetic-batch.test.mjs tests/standalone-weapons.test.mjs tests/standalone-combat.test.mjs tests/ut-uaw-magazine-limits.test.mjs tests/ammo-inventory.test.mjs tests/ut-conventional-firearms.test.mjs tests/ut-ammunition-completeness.test.mjs tests/ammunition-chat-compact.test.mjs tests/ht-plus-p.test.mjs tests/ht-plus-p-category-b.test.mjs tests/ht-plus-p-category-g.test.mjs tests/aps-environment-plus-p.test.mjs
```

| Группа | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| LeMat, полностью, входит в следующую строку | 15 | 0 | 0 |
| Первые 11 файлов: LeMat, OWNER, HT UX/kinetic, standalone, UAW, inventory, UT, compact | 361 | 0 | 0 |
| Четыре исторических файла HT/+P | 34 | 20 | 0 |
| Всего 15 файлов, 415 тестов | **395** | **20** | **0** |

Дополнительно: `node --check` изменённого MJS, строгий UTF-8 без BOM,
проверка искажений кодировки, `git diff --check` изменённых файлов и
сравнение SHA-256 с состоянием начала задачи. Производственные scripts,
каталоги/data, lang, общие fixtures, tools, AGENTS.md и module.json сохранены.
Версия 0.2.0 не менялась. Полный набор проекта и живой Foundry не запускались.

## Оставшиеся FAIL вне разрешённого тестового файла

Пути ниже указаны относительно `tests/`. Номера относятся к неизменённым
файлам. Эти результаты не скрыты, тесты не удалены и не пропущены.

| Файл и строка объявления | Количество FAIL | Наблюдаемое расхождение |
| --- | ---: | --- |
| `aps-environment-plus-p.test.mjs:37` | 1 | Допуск `true` вместо требуемого GM-запретом `false` |
| `aps-environment-plus-p.test.mjs:45` | 1 | Доступный пункт вместо ожидаемой недоступности |
| `aps-environment-plus-p.test.mjs:100` | 1 | `user-defined` вместо `gm-approved` |
| `aps-environment-plus-p.test.mjs:116` | 1 | Рабочий Derringer Acc `"0"` вместо сырого `null` |
| `ht-plus-p-category-b.test.mjs:29,50` | 2 | Счётчик 368 вместо 366 |
| `ht-plus-p-category-b.test.mjs:108` | 1 | Отсутствует ожидаемый старый GM-идентификатор |
| `ht-plus-p-category-g.test.mjs:33` | 7 | Проверки режимов W5biN11nvUhQ00ewl, WApJkhMAYa4wlXViK, WTrwxX4jwWz6xKiPz, WYmXQkUoq1luUajT-, WecVKS0hiwdjXu_uS, WgOt4XUnNzTOpdiAO, WHsI3V0zdU2TUI6w7: допуск `true` вместо `false` |
| `ht-plus-p-category-g.test.mjs:80,94,113` | 3 | Допуск KPV, APS и LeMat `true` вместо `false` |
| `ht-plus-p-category-g.test.mjs:140` | 1 | Исторический список допуска не равен текущему |
| `ht-plus-p.test.mjs:10` | 1 | Допуск `true` вместо старого `false` |
| `ht-plus-p.test.mjs:81` | 1 | Старая world-only фикстура не сохраняет/не читает решение Actor: `null` вместо записи |

Часть расхождений прямо связана с отменой GM-допусков, источниковыми
поправками и новым хранением решений. Счётчики и списки требуют отдельной
индивидуальной проверки, а не подстановки текущего числа ради PASS.
Их правильность в этой узкой задаче не устанавливалась. Другие тесты или
механика ради зелёного прогона не менялись. Для полного устранения этих
20 FAIL нужна отдельная задача по перечисленным файлам.

Commit, push, merge, rebase и Release не выполнялись.
