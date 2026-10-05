# OleGURPS QOL

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
