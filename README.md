# OleGURPS QOL

Foundry VTT module for GURPS Game Aid.

Текущая версия: **0.2.3**. [Изменения релиза](docs/releases/v0.2.3.md).
Установочный ZIP и manifest публикуются GitHub Actions по тегу версии.

В этой версии: единый расчёт недостаточной ST в Shooting и Melee Assistant,
подтверждённые варианты поддержки оружия, ручные гранаты с картой, разбросом,
историей и Smart-взрывателями, отдельная вкладка мин HT/UT и учёт массы оружия,
магазинов и боеприпасов в нагрузке GGA. Исправлены подготовка melee-атак,
физические удары Zap Glove, отображение рюкзака и работа с составами боеприпасов.

Учёт массы по умолчанию выключен. Карточки GGA Damage применяются вручную;
длительные эффекты и специальные последствия требуют решений GM.
Для SMi35 и M16 высота подрыва вводится вручную. Проверенная среда:
Foundry VTT 14.364 и GURPS Game Aid 0.18.23; manifest сохраняет minimum 13 / verified 14.

## Установка через Foundry VTT

1. Откройте **Add-on Modules**.
2. Нажмите **Install Module**.
3. Вставьте Manifest URL:

   `https://github.com/Plaguedguard-cr/olegurps-qol/releases/latest/download/module.json`

4. Нажмите **Install**.

## Ручная установка

Скачайте `olegurps-qol-vX.Y.Z.zip` из последнего [GitHub Release](https://github.com/Plaguedguard-cr/olegurps-qol/releases/latest) и распакуйте его в каталог `Data/modules/olegurps-qol`. Файл `module.json` должен находиться непосредственно в этом каталоге.

Исходный `module.json`, распространяемый manifest и manifest внутри ZIP содержат
одинаковые версию и ссылку `download` на архив соответствующего тега.
