# Контрольная точка High-Tech F1–F3 и контракт HAFLA

Это отчёт предварительной проверки, а не выполненного коммита. Подготовка узкой контрольной точки была остановлена: проверка индекса обнаружила две конечные пустые строки. Пользователь затем расширил состав на весь проект и разрешил точечное исправление EOF. Окончательный состав, проверки и исключения приведены в [отчёте полного сохранения проекта](full-project-snapshot-report.md); приведённый ниже список отражает прежний этап подготовки.

Проверено 11 октября 2026. Цель — сохранить необходимые исходники, интеграции, каталоги, локализации, тесты и документы завершённых F1/F2/F3. Эта задача не меняет интерфейс, язык, игровые механики, каталоги или сохранения Foundry. F4 не начат.

## Причина прежних двух FAIL

`tests/catalog-upgrade.test.mjs` сохранял ожидания после FN BAR Range errata revision 1: единственная поправка дальности и SHA-256 `6d9aabb0292efbe25d3f302e682eb8120b5fe385788f07ef8d3c8acc0ba6f4d0`. Позднее утверждённая HAFLA Acc errata добавила `stats.accuracy: null → "0"` только для режима `Wr3VDL3Z6SR3KCz3K` и точные метаданные revision 2. Поэтому падали сравнение revision и сравнение полных байтов каталога.

Основание: [отчёт HAFLA](ht64-hafla-acc-fix-report.md), HT145, ранее сохранённый `approvedHaflaErrata` в [контракте сохранности](ht-v1-3-preservation.json). Каталог **не редактировался**.

Независимая сверка выполнена до изменения теста. `assertWeaponPreservation` проверил полные байты текущего каталога, исторический HT-pointer и исходные baseline. `restoreHaflaErrata` отменил исключительно HAFLA Acc и вернул точные метаданные revision 1: получен прежний SHA-256 `6d9aabb0292efbe25d3f302e682eb8120b5fe385788f07ef8d3c8acc0ba6f4d0`. Полное структурное сравнение показало только эту поправку и утверждённую замену метаданных. Других изменений нет.

Текущий SHA-256 Weapon Reference v5.6: **`f98687171a69b27ff46d89ab12d24b457375972de293fe482e881aceb63b5460`**. Он совпадает с хешем утверждённой версии, сохранённым до этой задачи; новый результат теста не использовался как единственное доказательство.

## Точечное изменение теста

- Ожидаются revision 2 и точный независимо проверенный SHA-256.
- Список разрешённых исправлений точно ограничен FN BAR Range и HAFLA Acc.
- Для HAFLA добавлены точное сравнение `{field: "accuracy", previous: null, corrected: "0"}` и проверка фактической Acc.
- При сравнении с прежним хешем коллекции отменяются только эти две поправки и уже объявленные теги. Исходный `weaponEquipmentHash` не изменён.
- Все прежние проверки ID, записей, коллекций, ссылок и полных байтов сохранены. Тест не удалялся и не пропускался.

## Проверки перед коммитом

Проверка воспроизводимости выполнена в отдельной временной копии: `HEAD` плюс только отобранные файлы контрольной точки. Непубликуемые рабочие файлы не использовались для прохождения тестов; Foundry не изменялся.

| Адресный тест | PASS | FAIL |
|---|---:|---:|
| `catalog-upgrade.test.mjs` | 86 | 0 |
| `ht64-complex-effects-f1.test.mjs` | 36 | 0 |
| `ht64-complex-effects-f2.test.mjs` | 49 | 0 |
| `ht64-complex-effects-f3.test.mjs` | 36 | 0 |
| `ht-preservation.test.mjs` | 18 | 0 |
| **Всего** | **225** | **0** |

Синтаксис 133 JS/MJS — PASS. Строгий UTF-8, 18 JSON, отсутствие конфликтных маркеров и `git diff --check` — PASS. Большие матрицы и полный набор не запускались. Изменений GGA/GCS и Actor.system нет.

## Git и безопасность состава

Ветка: `main`. Upstream: `origin/main`. Remote: `https://github.com/Plaguedguard-cr/olegurps-qol.git`. После fetch история совпадает: 0 локальных и 0 удалённых новых коммитов. Перед подготовкой индекс был пуст. Ветка не переключалась; pull/merge/rebase/reset/amend/force push не применялись.

Сообщение коммита: `High-Tech: complete F1-F3 and align HAFLA catalog tests`.

Сохранены зависимости ранее выполненных этапов боеприпасов и автономного оружия: опубликованная версия должна содержать фактически используемые источники и тестовые входы, а не только непосредственно изменённые в F3 файлы. Состав включает матрицу, отчёты F1/F2/F3 и отдельную DATA-задачу HAFLA.

Проверены текстовые файлы и JSON: признаков паролей, ключей, токенов, персональных адресов или пользовательских путей нет. Включённые JSON — каталоги, утверждённые обзоры правил, точные контракты сохранности и статические входы тестов; это не игровые сохранения и не снимки временных документов.

Не включены: изменения `packs/macros`, игровые базы и миры, резервные копии, временные Actor/Token/ChatMessage и User-дампы, все live/before/after/cleanup артефакты Foundry, TAP и временные итоги, скриншоты, кеши, node_modules, прежние вспомогательные корневые скрипты сверки 75 записей, а также самостоятельные изменения Critical Tables. Они не удалены из рабочего дерева. `.gitignore` не изменён.

Исторические отчёты сохранены без переписывания. Ссылки в них на исключённые локальные артефакты могут быть недоступны в GitHub; исходники, тестовые входы, матрица и текстовые результаты остаются воспроизводимыми. Реальная проверка независимого клиента игрока для F1–F3 по-прежнему BLOCKED из-за отсутствия активного игрока; эта задача не заявляет нового live-тестирования.

## Полный проверенный список файлов коммита

```text
AGENTS.md
data/catalogs/olegurps_ht_ammunition_catalog_v1_3.json
data/catalogs/olegurps_lt_ammunition_catalog_v1_2.json
data/catalogs/olegurps_ut_ammunition_catalog_v2_7.json
data/catalogs/olegurps_weapon_reference_catalog_v5_6.json
docs/ammunition-compatibility-report.md
docs/ammunition-compatibility-service.md
docs/ammunition-effects-stage-3.md
docs/ammunition-explosives-stage-4.md
docs/ammunition-inventory.md
docs/aps-plus-p-derringer-report.md
docs/attack-profile-stage-1.md
docs/audit/ammunition-compatibility-initial-report.md
docs/audit/catalog-upgrade-preservation.json
docs/audit/ht-12g-case-correction.json
docs/audit/ht-plus-p-blockers.json
docs/audit/ht-plus-p-category-b.json
docs/audit/ht-v1-3-preservation.json
docs/audit/ht64-cartridge-loads-batch-report.md
docs/audit/ht64-case-technology-batch-report.md
docs/audit/ht64-complex-effects-decision-matrix.json
docs/audit/ht64-complex-effects-decision-report.md
docs/audit/ht64-complex-effects-f1-report.md
docs/audit/ht64-complex-effects-f2-report.md
docs/audit/ht64-complex-effects-f3-report.md
docs/audit/ht64-environment-batch-report.md
docs/audit/ht64-explosives-batch-report.md
docs/audit/ht64-f1-f3-checkpoint-report.md
docs/audit/ht64-fuzes-tracer-batch-report.md
docs/audit/ht64-hafla-acc-fix-report.md
docs/audit/ht64-hafla-smoke-data-task.md
docs/audit/ht64-independent-audit.json
docs/audit/ht64-independent-audit.md
docs/audit/ht64-kinetic-batch-report.md
docs/audit/ht64-multishot-batch-report.md
docs/audit/ht64-multishot-plus-p-diagnostic.json
docs/audit/olegurps_ht178_68_mode_pairs_v1.json
docs/audit/olegurps_ht64_source_review_v1.md
docs/audit/olegurps_ht_64_structured_review_v1.json
docs/automatic-ammunition-profile-coverage.json
docs/automatic-ammunition-profiles.md
docs/catalog-service.md
docs/damage-shot-link.md
docs/developer-mode.md
docs/ht-12g-case-correction-report.md
docs/ht-ammunition-automation.md
docs/ht-catalog-bulk-report.md
docs/ht-plus-p-category-b-report.md
docs/ht-plus-p-category-g-report.md
docs/ht-special-ammunition-report.md
docs/ht-v1-3-eligibility-report.md
docs/lemat-physical-ammunition-report.md
docs/standalone-weapons-report.md
docs/standalone-weapons-stage-a.md
docs/targeted-attack-default-report.md
docs/weapon-catalog-binding-service.md
docs/weapon-configuration-ui.md
docs/weapon-configuration-visual-review.md
docs/weapon-skill-tl-policy.md
lang/en.json
lang/ru.json
module.json
scripts/ammunition-compatibility-service.js
scripts/audits/ht-plus-p-blockers.mjs
scripts/audits/ht-plus-p-category-b.mjs
scripts/audits/ht-plus-p-category-g.mjs
scripts/catalog-service.js
scripts/ht-ammunition-evidence.js
scripts/ht-kinetic-family-data.js
scripts/ht-native-charge-profiles.js
scripts/ht-option-eligibility.js
scripts/ht-physical-ammunition-evidence.js
scripts/ht-shotshell-source-data.js
scripts/ht-special-ammunition-evidence.js
scripts/main.js
scripts/tools/aim-status-effects.js
scripts/tools/ammo-inventory.js
scripts/tools/ammo-management-app.js
scripts/tools/ammo-management-localization.js
scripts/tools/ammo-service.js
scripts/tools/ammo.js
scripts/tools/ammunition-approval-service.js
scripts/tools/ammunition-condition-presentation.js
scripts/tools/ammunition-effects.js
scripts/tools/ammunition-f2-localization.js
scripts/tools/ammunition-f2.js
scripts/tools/ammunition-f3-localization.js
scripts/tools/ammunition-f3.js
scripts/tools/ammunition-recipe-editor.js
scripts/tools/ammunition-recipes.js
scripts/tools/attack-profile-resolver.js
scripts/tools/attack-profile-runtime.js
scripts/tools/automatic-ammunition-localization.js
scripts/tools/automatic-ammunition-profiles.js
scripts/tools/basic-damage-dice.js
scripts/tools/cartridge-load-conditions.js
scripts/tools/case-technology.js
scripts/tools/close-hip-shooting-service.js
scripts/tools/close-quarters-battle-service.js
scripts/tools/combat-calculation-engine.js
scripts/tools/damage-shot-link.js
scripts/tools/developer-localization.js
scripts/tools/developer-mode-app.js
scripts/tools/developer-roll-service.js
scripts/tools/du-ammunition.js
scripts/tools/environment-ammunition.js
scripts/tools/explosion-fragmentation.js
scripts/tools/explosive-ammunition-localization.js
scripts/tools/explosive-ammunition-model.js
scripts/tools/explosive-attack-profiles.js
scripts/tools/falling.js
scripts/tools/fire-control-context.js
scripts/tools/fire-preparation-app.js
scripts/tools/fire-range-service.js
scripts/tools/fire-service.js
scripts/tools/fuze-tracer-ammunition.js
scripts/tools/gga-damage-compatibility.js
scripts/tools/ht-ammunition-coverage.js
scripts/tools/ht-kinetic-rules.js
scripts/tools/legacy-plus-p-admission.js
scripts/tools/melee-assistant-app.js
scripts/tools/melee-assistant-state.js
scripts/tools/melee-assistant.js
scripts/tools/melee-attack-execution-app.js
scripts/tools/melee-service.js
scripts/tools/multishot-ammunition.js
scripts/tools/prepared-ammunition-profiles.js
scripts/tools/prepared-gga-roll.js
scripts/tools/ranged-governing-skill-service.js
scripts/tools/ranged-rapid-strike-service.js
scripts/tools/shotgun-ammunition.js
scripts/tools/spraying-fire-app.js
scripts/tools/spraying-fire-session-service.js
scripts/tools/standalone-attack-service.js
scripts/tools/standalone-skill-service.js
scripts/tools/standalone-weapon-configuration.js
scripts/tools/standalone-weapon-service.js
scripts/tools/suppression-fire-app.js
scripts/tools/suppression-fire-service.js
scripts/tools/suppression-fire-session-service.js
scripts/tools/targeted-attack-service.js
scripts/tools/weapon-attack-editor.js
scripts/tools/weapon-attack-overrides.js
scripts/tools/weapon-bulk.js
scripts/tools/weapon-configuration.js
scripts/tools/weapon-localization.js
scripts/tools/weapon-skill-settings-app.js
scripts/tools/weapon-skill-tl-policy.js
scripts/weapon-catalog-binding-service.js
styles/olegurps-qol.css
templates/developer-mode.hbs
tests/ammo-inventory.test.mjs
tests/ammo-ui-presentation.test.mjs
tests/ammunition-compatibility-service.test.mjs
tests/ammunition-effects.test.mjs
tests/aps-environment-plus-p.test.mjs
tests/attack-profile.test.mjs
tests/automatic-ammunition-profiles.test.mjs
tests/catalog-service.test.mjs
tests/catalog-upgrade.test.mjs
tests/damage-shot-link.test.mjs
tests/developer-mode.test.mjs
tests/explosive-ammunition.test.mjs
tests/fixtures/gga-combat-import-0.18.23.js
tests/fixtures/ht-preservation-contract.mjs
tests/fixtures/ht-special-context.mjs
tests/ht-12g-case-correction.test.mjs
tests/ht-ammunition-automation.test.mjs
tests/ht-catalog-bulk-defects.test.mjs
tests/ht-frangible.test.mjs
tests/ht-match.test.mjs
tests/ht-option-eligibility.test.mjs
tests/ht-plus-p-category-b.test.mjs
tests/ht-plus-p-category-g.test.mjs
tests/ht-plus-p.test.mjs
tests/ht-preservation.test.mjs
tests/ht-subsonic.test.mjs
tests/ht64-cartridge-loads-batch.test.mjs
tests/ht64-case-technology-batch.test.mjs
tests/ht64-complex-effects-f1.test.mjs
tests/ht64-complex-effects-f2.test.mjs
tests/ht64-complex-effects-f3.test.mjs
tests/ht64-environment-batch.test.mjs
tests/ht64-explosives-batch.test.mjs
tests/ht64-fuzes-tracer-batch.test.mjs
tests/ht64-hafla-acc.test.mjs
tests/ht64-kinetic-batch.test.mjs
tests/ht64-multishot-batch.test.mjs
tests/lemat-physical-ammunition.test.mjs
tests/ranged-hit-result.test.mjs
tests/standalone-combat.test.mjs
tests/standalone-weapons.test.mjs
tests/targeted-attack-defaults.test.mjs
tests/weapon-bond-regression.test.mjs
tests/weapon-catalog-binding.test.mjs
tests/weapon-configuration.test.mjs
tests/weapon-skill-tl-policy.test.mjs
```
