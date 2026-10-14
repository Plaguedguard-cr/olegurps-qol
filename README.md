# OleGURPS QOL

Foundry VTT module for GURPS Game Aid.

Текущая версия исходников: **0.2.0**. Отправка изменений в `main` сохраняет
разработку в GitHub; установочный ZIP публикуется отдельно через тег версии.
До такой публикации ссылка установки ниже ведёт на последний опубликованный
GitHub Release, который может иметь более раннюю версию.

## Установка через Foundry VTT

1. Откройте **Add-on Modules**.
2. Нажмите **Install Module**.
3. Вставьте Manifest URL:

   `https://github.com/Plaguedguard-cr/olegurps-qol/releases/latest/download/module.json`

4. Нажмите **Install**.

## Ручная установка

Скачайте `olegurps-qol-vX.Y.Z.zip` из последнего [GitHub Release](https://github.com/Plaguedguard-cr/olegurps-qol/releases/latest) и распакуйте его в каталог `Data/modules/olegurps-qol`. Файл `module.json` должен находиться непосредственно в этом каталоге.

В исходном `module.json` поле `download` отсутствует до сборки: workflow тега
подставляет ссылку на ZIP соответствующей версии в распространяемый manifest
и в manifest внутри архива. Ссылка на ещё не опубликованный ZIP не выдаётся
за доступную загрузку из текущих исходников.
