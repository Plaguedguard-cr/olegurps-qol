# OleGURPS QOL

## Рабочая документация и локальные источники

Актуальная сводка High-Tech: `docs/high-tech.md`. Исторические отчёты,
TAP, диагностические JSON, скриншоты и источниковые аудиты хранятся вне репозитория:
`A:\Program Files\FoundryVTT-R\olegurps-qol-archive\snapshots\2026-10-14-docs-reorganization`.
Манифест с путями, размерами и SHA-256 находится там же: `manifest.json`.

Для новых проверок правил использовать книги из `E:\НРИ\GURPS\BooksCodex`
по правилам раздела «Локальная библиотека правил GURPS» ниже. Копия High-Tech
в архиве документации является историческим материалом, а не рабочим источником
для новых проверок. Не публиковать книги или содержимое локального архива. `docs/audit` не использовать
как рабочее хранилище отчётов. Обычный Foundry и адресные тесты не должны требовать
архива или PDF; необходимые ожидания находятся в `tests/fixtures/ht-audit-contracts.json`.
Фикстуры извлечены из проверенных оригиналов и закреплены точным хешем: не менять
эталон ради успешного теста и не заменять проверки каталогов проверками наличия файла.

Источниковым инструментам `tools/audit-ht-*.mjs` и CLI `ht-plus-p-blockers.mjs`
нужен внешний архив. При ином расположении задать `OLEGURPS_ARCHIVE_ROOT` или
`OLEGURPS_ARCHIVE_SNAPSHOT`; исходники читаются из снимка с проверкой SHA-256,
новые отчёты по умолчанию записываются в `<archive-root>/generated`.
Проверка целостности: `node tools/verify-document-archive.mjs`.
Перенос на другой компьютер описан в `docs/docs-reorganization-report.md`.

## Локальная библиотека правил GURPS

Постоянный источник книг для проверки правил: `E:\НРИ\GURPS\BooksCodex`.
Это отдельная копия, предназначенная пользователем для Codex.

- Вся библиотека, все вложенные папки и файлы любых типов доступны строго
  только для чтения. Разрешены перечисление файлов, чтение PDF и извлечение текста.
- Запрещены любые записывающие операции: создание файлов, индексов, кешей
  и временных данных внутри библиотеки, редактирование и перезапись PDF,
  изменение метаданных, удаление, перемещение и переименование содержимого.
  Не выполнять очистку, оптимизацию, автоматическое исправление PDF или изменение прав доступа.
- Полностью запрещены любые операции с оригинальной библиотекой
  `E:\НРИ\GURPS\Книги`, включая проверку её существования, перечисление и чтение.
  Работать исключительно с BooksCodex.
- Перед использованием проверять доступность конкретного источника. Если диск,
  папка, книга или текст недоступны, сообщить об ограничении; не изменять разрешения
  и не выдумывать отсутствующие правила, таблицы или значения.
- При разработке механик сверяться с оригинальными книгами из BooksCodex:
  проверять таблицы, примечания и исключения, редакцию и официальные исправления,
  если они имеются. Прежние отчёты Codex не превосходят книгу по доказательной силе.
  При противоречии сообщить о нём и проверить первоисточник.
- В выводах о правилах обязательно указывать название книги и печатную страницу.
  Сначала проверять соответствие печатной нумерации страницам конкретного PDF;
  не переносить смещение автоматически между изданиями и файлами.
- При необходимости сохранять извлечённый текст и технические временные файлы
  только во временной области вне библиотеки и вне публичного репозитория.
- Не создавать дополнительные копии книг, не переносить их содержимое в проект,
  не добавлять книги в Git и не публиковать их. Не копировать полные книги или
  большие фрагменты защищённого текста в документацию.
- Это правило меняет источник новых проверок правил; исторические PDF, отчёты
  и архивы не удалять и не реорганизовывать в рамках подключения библиотеки.
  Обычная работа Foundry и адресные тесты по-прежнему не требуют доступа к книгам.

Рабочая папка модуля находится в:
`A:\Program Files\FoundryVTT-R\Data\modules\olegurps-qol`

Windows ACL этой папки уже проверены. Группа `CodexSandboxUsers` имеет наследуемые права Modify: `(OI)(CI)(M)`.

Если `apply_patch` сообщает об ошибке Windows ACL:

- не считать это автоматически проблемой прав доступа;
- сначала проверить возможность создать, изменить, переименовать и удалить временный файл внутри репозитория;
- если обычные файловые операции работают, считать проблемным именно `apply_patch` и использовать безопасный альтернативный способ точечного изменения файлов;
- не менять ACL, владельца папки и системные разрешения без отдельной необходимости.

## Hit Location и новые bodyplan

Каждая новая зона попадания и каждый новый bodyplan должны расширять существующий общий механизм Hit Location, а не создавать отдельную реализацию. Эталоном внешнего вида и поведения является уже действующий Humanoid UI; новый bodyplan обязан сохранять с ним паритет.

Обязательные требования:

- использовать общие `TargetingService`, состояние Fire Control, шаблон разметки и CSS-классы; различия bodyplan хранить в декларативных данных зоны, таблицы и геометрии;
- сохранять идентичную компоновку Fire Control: размеры колонок, прокрутку, положение списка зон и постоянно доступные нижние кнопки; переключение bodyplan не должно включать старую или отдельную версию UI;
- названия зон не должны выходить за границы строки; перенос текста, штраф, TA-индикация, выбранное и hover-состояние должны выглядеть так же, как у существующих зон;
- интерактивный контур должен точно совпадать с видимым силуэтом и реальными границами области; толщина линий и поведение внутренних белых границ при hover/selection должны повторять существующий силуэт;
- выбор зоны кликом по силуэту и по строке списка должен изменять одно и то же состояние и одинаково обновлять модификатор, эффективное умение и подсветку;
- штрафы и canonical specialty/TA должны проходить через общий pipeline; не добавлять отдельные расчёты или предположения по уровню навыка для нового bodyplan;
- случайную зону определять по таблице соответствующего bodyplan. Дополнительные броски стороны, передней/задней части и другие уточнения задавать данными bodyplan, а не специальными ветками UI;
- выполнять независимое определение случайной зоны для каждого фактического попадания;
- служебные броски Hit Location и уточняющие 1d6 не публиковать отдельными сообщениями чата; выводить их только в закрытом по умолчанию нумерованном списке итогового сообщения;
- обычный выбор конкретной зоны, случайная зона, несколько попаданий, Targeted Attack и недоступные precision-зоны должны сохранять поведение уже существующих bodyplan.

Перед завершением изменений Hit Location статически проверить синтаксис затронутых JS-файлов, отсутствие отдельных `roll.toMessage()` для служебных бросков, синхронизацию силуэта со списком и паритет новой реализации как минимум с Humanoid. Лайв-проверки проводить только если они разрешены текущей задачей.

## Collapsible calculation details in chat

In module-authored chat messages, keep the action and its outcome visible: roll result, hit or miss, final damage, and resource totals. Put supporting calculation details inside native `<details>` sections that are closed by default (no `open` attribute). This includes modifier and penalty lists, technique levels and their application, base skill derivations, channel replacements, situational calculations, and explanatory notes. The summary should name the section without exposing its detailed values.

Apply this consistently to public and personal messages from Shooting Assistant, Trademark Move, standalone Fire Control, Melee Assistant, special fire, falling damage, and future reports with similar calculations. Keep every related line inside its section, including cases where the base skill is unavailable. Preserve existing mechanics and the GGA-owned roll result template. Do not wrap `<details>` in a `<p>` element.

The existing fear and reaction tools, and the fragmentation report, are excluded from this presentation rule unless a later user request explicitly includes them.

Before finishing a chat presentation change, check representative messages for closed-by-default sections, visible outcomes, and no modifier or technique explanation left outside a section. Run syntax checks and the relevant tests.

## ApplicationV2 windows and settings menus

All new OleGURPS QOL windows, including settings submenus, must extend `foundry.applications.api.ApplicationV2` and use its window styling. Do not introduce legacy `Application` or `FormApplication` (V1) windows. When modifying an existing V1 window, migrate it to `ApplicationV2` while preserving its behavior. Use an `ApplicationV2` subclass for new `game.settings.registerMenu` menus.

## UTF-8-safe file editing

All repository text files must remain UTF-8. When `apply_patch` is unavailable because of the known helper/ACL failure:

- read the original file explicitly as UTF-8 and write it explicitly as UTF-8 without BOM;
- use a targeted replacement or a temporary UTF-8 file followed by an atomic rename; never rewrite unrelated content;
- for large-file changes, start with small targeted replacements split into bounded steps; do not attempt a full-file rewrite first, because Windows command-line length limits can reject the operation before it starts;
- never pass repository text through Windows-1251, the active console code page, `Encoding.Default`, or any encode/decode repair heuristic;
- prefer ASCII-only edit scripts. If a shell command must introduce non-ASCII JavaScript text, use JavaScript `\uXXXX` escapes in string literals or a verified UTF-8 temporary file;
- do not attempt a whole-file mojibake conversion. If corrupted text is already present, replace each affected literal from a known-good source;
- after every fallback edit, decode the result with strict UTF-8 and scan changed files for `U+FFFD` plus known mojibake code-point signatures; do not put literal Cyrillic examples into the scan rule itself;
- run the relevant syntax/parser checks after the encoding scan. Treat any new replacement character or mojibake marker as a failed edit and fix it before continuing.

## Test Execution Policy

1. По умолчанию запускай только адресные тесты, связанные с изменёнными компонентами.

2. Не запускай полный набор тестов автоматически, включая завершение задания.

3. Полный набор разрешён, если пользователь прямо запросил его.

4. Если изменения затрагивают критическую механику, общую архитектуру или сохранение данных и полный прогон действительно необходим, сначала объясни причину и запроси разрешение пользователя.

5. Не запускай одни и те же тесты повторно без изменений, требующих новой проверки.

6. В итоговом отчёте перечисляй запущенные тесты и их результаты. Если полный набор не запускался, прямо указывай это.

7. Не ослабляй, не удаляй и не пропускай существующие тесты ради успешного результата.

## UI Language and Localization Policy

1. Русский язык — основной язык разработки пользовательского интерфейса OleGURPS QOL.

2. Все новые окна, кнопки, подписи, подсказки, сообщения, уведомления и элементы настроек по умолчанию должны иметь русский текст для локализации ru.

3. Существующие тексты интерфейса НЕ изменяй, НЕ переводи и НЕ переименовывай без прямого указания пользователя, даже если сейчас они написаны по-английски.

4. Исключение: пользователь явно попросил использовать другой язык или изменить существующую локализацию.

5. Для новых элементов обязательно поддерживай обе локализации: ru и en. Русская — основная, английская — перевод.

6. Не используй английский текст как основной или единственный вариант для новых окон. Не оставляй новые английские строки непосредственно в коде интерфейса, если они предназначены для локализации.

7. При активной русской локализации Foundry новые элементы должны отображаться по-русски. Проверь фактическую загрузку переводов, а не только наличие ключей в lang/ru.json.

8. Не переводи названия игровых сущностей, характеристики, аббревиатуры, технические термины и обозначения автоматически, если в проекте для них уже установлено определённое написание.

9. Не меняй текущие языковые настройки Foundry или пользователя ради выполнения этого правила.

10. При разработке нового окна проверяй локализацию ru/en адресными проверками.

Это правило относится ко всем будущим изменениям пользовательского интерфейса.

## Always-Russian OleGURPS UI Policy

Этот раздел закрепляет постоянные правила для всех будущих заданий Codex. В вопросе языка собственного интерфейса OleGURPS QOL он имеет приоритет над прежними положениями о выборе локализации.

1. Весь пользовательский интерфейс OleGURPS QOL всегда должен быть на русском, независимо от языка Foundry.

2. Правило касается всех собственных окон, настроек, кнопок, подсказок, уведомлений, ошибок, карточек, сообщений чата и описаний игровых правил.

3. Новые функции сразу разрабатывай с русскими пользовательскими текстами. Не оставляй английские временные подписи или пояснения.

4. Английский допустим для названий оружия, имён собственных, официальных терминов GURPS, сокращений, формул, технических идентификаторов и исходного кода.

5. Штатные интерфейсы и карточки GGA не переводи и не изменяй. Русификация касается только элементов, принадлежащих OleGURPS QOL.

6. Не меняй глобальный язык Foundry, словари GGA или пользовательские настройки языка.

7. При изменении интерфейса проверяй русский текст как при Foundry ru, так и при Foundry en.

8. Английские словари проекта можно сохранять, но они не должны определять язык интерфейса модуля.
