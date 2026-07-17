# Еженедельное восстановление расписания из шаблона

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Этот документ поддерживается в соответствии с `.agent/PLANS.md`.

## Purpose / Big Picture

После этого изменения Google Apps Script перестает пытаться использовать таблицу как базу данных для записей. Основной полезный сценарий становится простым: раз в неделю скрипт берет лист-шаблон внутри той же Google Spreadsheet, полностью перезаписывает листы расписания для стиральных машин и подставляет даты новой недели в заранее оставленные теги. Пользователь видит чистую таблицу с прежним форматированием, колонками и актуальными датами, а дальше жильцы заполняют ее руками.

Проверить результат можно вручную через функцию `resetWeeklySchedule`, а автоматический еженедельный запуск ставится функцией `installWeeklyResetTrigger`.

## Progress

- [x] (2026-07-17T17:53:54Z) Изучены `.agent/PLANS.md`, `AGENTS.md`, текущий Apps Script-код и пример `Запись в прачечную 4_1.xlsx`.
- [x] (2026-07-17T17:53:54Z) Принято решение реализовать отдельный модуль для сброса расписания, не удаляя существующий web/API-код в рамках этого атомарного шага.
- [x] (2026-07-17T17:53:54Z) Добавить модуль Apps Script для копирования шаблона, замены тегов дат и установки еженедельного trigger.
- [x] (2026-07-17T17:53:54Z) Добавить тесты на вычисление понедельника недели, форматирование дат и замену тегов.
- [x] (2026-07-17T17:53:54Z) Обновить документацию по листу-шаблону и функциям запуска.
- [x] (2026-07-17T17:53:54Z) Запустить тесты и сборку Apps Script.
- [x] (2026-07-17T17:53:54Z) Получено уточнение: удалить всю логику, которая не относится к стратегии листа-шаблона.
- [x] (2026-07-17T17:53:54Z) Удалить web-приложение, API бронирований, служебные листы как базу данных и связанные тесты.
- [x] (2026-07-17T17:53:54Z) Упростить `Code.js`, `Sheets.js`, build script, README и тесты под единственную идею weekly template reset.
- [x] (2026-07-17T17:53:54Z) Повторно запустить тесты и сборку после чистки.

## Surprises & Discoveries

- Observation: В примере `.xlsx` листы `Haier 1`-`Haier 4` имеют одинаковую сетку расписания, а `Haier 5` содержит пометку `Машинка не по записи!`.
  Evidence: Разбор `Запись в прачечную 4_1.xlsx` показал даты в строке 2 через колонки `B`, `D`, `F`, `H`, `J`, `L`, `N`, `P` и временные слоты в `A4:A27`.

- Observation: В рабочем дереве уже изменен `README.md`, а `.xlsx` находится как untracked-файл.
  Evidence: `git status --short` показал ` M README.md` и `?? "Запись в прачечную 4_1.xlsx"`.

- Observation: Старая архитектура состоит из трех удаляемых блоков: Vite webapp, Apps Script API бронирований и тесты под `Config`/`Reservations`.
  Evidence: `rg` нашел ссылки на `getWeekSchedule`, `reserveSlot`, `cancelReservation`, `LaundryReservations`, `LaundryConfig`, `LaundryUsers` в `web/`, `apps-script/src/*` и `tests/*`.

## Decision Log

- Decision: Использовать теги вида `{{date:+0}}`, `{{date:+1}}`, ..., `{{date:+7}}` внутри листа-шаблона.
  Rationale: Такой формат читается человеком, не зависит от конкретных адресов ячеек и позволяет хранить формат отображения даты прямо в шаблоне через number format ячейки. Знак `+` делает смещение от начала недели явным.
  Date/Author: 2026-07-17 / Codex

- Decision: Сделать `resetWeeklySchedule` отдельным модулем, а не удалять старые API-модули в этом атомарном изменении.
  Rationale: Пользователь попросил вернуться к простой стратегии, но удаление web-приложения, API и старых листов одновременно увеличит риск и усложнит проверку. Отдельный модуль дает рабочее поведение сразу и оставляет последующее удаление старой архитектуры отдельным безопасным шагом.
  Date/Author: 2026-07-17 / Codex

- Decision: По умолчанию сбрасывать листы `Haier 1`, `Haier 2`, `Haier 3`, `Haier 4`, а имя шаблона сделать `ScheduleTemplate`.
  Rationale: Это соответствует примеру таблицы, где первые четыре машинки являются записными, а пятая явно не по записи. Значения можно переопределить через script properties без изменения кода.
  Date/Author: 2026-07-17 / Codex

- Decision: Удалить web-приложение и старый API бронирований полностью, а не оставлять неиспользуемый код рядом с weekly reset.
  Rationale: Пользователь прямо уточнил, что из репозитория надо убрать всю логику вне идеи с шаблоном. Наличие старых entrypoints создает ложное ожидание, что таблица все еще работает как база данных.
  Date/Author: 2026-07-17 / Codex

## Outcomes & Retrospective

Реализация завершена для атомарного шага еженедельного восстановления расписания и последующей чистки старой архитектуры. В проекте есть функция `resetWeeklySchedule`, которая перезаписывает целевые листы из `ScheduleTemplate` и подставляет даты недели. Функции `installWeeklyResetTrigger` и `removeWeeklyResetTriggers` управляют еженедельным trigger. Web-приложение, API бронирований, служебные листы как база данных и связанные тесты удалены.

Проверка выполнена командами `npm test` и `npm run build:apps-script`; обе команды завершились успешно после чистки.

## Context and Orientation

Репозиторий содержит Google Apps Script-проект в `apps-script/src`. Сборка копирует `.js`-файлы из `apps-script/src` в `apps-script/dist` через `scripts/build-apps-script.mjs`. Текущий код включает web-приложение, API для бронирования и служебные листы `Settings`, `Machines`, `Reservations`, `AuditLog`, `ErrorLog`. Новая задача не нуждается в этих листах как в базе данных.

Файл `Запись в прачечную 4_1.xlsx` в корне репозитория служит примером реальной таблицы. В нем есть листы `Контакты`, `Правила`, `Haier 1`, `Haier 2`, `Haier 3`, `Haier 4`, пустой `Лист83` и `Haier 5`. Листы `Haier 1`-`Haier 4` похожи на основное расписание: строка 2 содержит даты, строка 3 содержит заголовки имени и комнаты, строка 4 и ниже содержит временные слоты.

Новый лист-шаблон должен находиться в той же spreadsheet, что и рабочие листы. Его имя по умолчанию `ScheduleTemplate`. Пользователь должен разместить в нем сетку расписания и теги дат. Тег даты — это текст внутри ячейки, например `{{date:+0}}`. При сбросе недели скрипт заменит такой тег на объект `Date`, а формат отображения даты останется тем, который задан в шаблоне самой ячейки.

## Plan of Work

Сначала добавить `apps-script/src/WeeklyReset.js`. В нем создать объект `LaundryWeeklyReset` с функциями `resetWeeklySchedule`, `installWeeklyResetTrigger`, `removeWeeklyResetTriggers` и внутренними чистыми helper-функциями. `resetWeeklySchedule` должен брать spreadsheet через `LaundrySheets.getSpreadsheet`, читать script properties и использовать значения по умолчанию, если properties не заданы.

Script properties должны поддерживать:

- `SCHEDULE_TEMPLATE_SHEET_NAME`: имя листа-шаблона, по умолчанию `ScheduleTemplate`.
- `SCHEDULE_TARGET_SHEET_NAMES`: список рабочих листов через запятую, по умолчанию `Haier 1,Haier 2,Haier 3,Haier 4`.
- `SCHEDULE_WEEK_START_DAY`: день начала недели, по умолчанию `MONDAY`.
- `SCHEDULE_DATE_LOCALE`: locale для fallback-форматирования строк, по умолчанию `en`.
- `SCHEDULE_RESET_TRIGGER_HOUR`: час trigger, по умолчанию `0`. День trigger совпадает с `SCHEDULE_WEEK_START_DAY`.

Копирование шаблона должно быть простым и полным для используемой области листа: очистить целевой лист, привести его количество строк и колонок к размеру шаблона, скопировать range шаблона в target range через `copyTo`, а затем заменить теги дат в значениях target range. Если целевого листа нет, его надо создать. Если лист-шаблон не найден, функция должна бросить понятную ошибку.

После уточнения пользователя удалить `web/`, `apps-script/src/Api.js`, `AuditLog.js`, `Config.js`, `Constants.js`, `ErrorLog.js`, `Notifications.js`, `Reservations.js`, `Users.js`, а также тесты `tests/config.test.mjs` и `tests/reservations.test.mjs`. `apps-script/src/Sheets.js` упростить до открытия spreadsheet по script properties или active spreadsheet. `apps-script/src/Code.js` упростить до трех публичных функций для weekly reset без `LaundryApi.handle`.

Затем добавить thin wrappers в `apps-script/src/Code.js`, чтобы функции можно было запускать из редактора Apps Script: `resetWeeklySchedule`, `installWeeklyResetTrigger`, `removeWeeklyResetTriggers`.

После этого обновить `scripts/build-apps-script.mjs`, чтобы `WeeklyReset.js` загружался после `Sheets.js` и до `Code.js`.

Для тестов добавить `tests/weekly-reset.test.mjs`, который загружает `WeeklyReset.js` в `vm` и проверяет чистые helper-функции через экспорт `_test`. Тесты должны покрыть понедельник недели, замену тегов на `Date`, сохранение остального текста и fallback для текстовой ячейки с тегом внутри длинной строки.

Документацию обновить осторожно, учитывая уже измененный `README.md`: добавить раздел с правилами шаблона, tags и командами `npm test` / `npm run build:apps-script`.

## Concrete Steps

Работать из корня репозитория:

    cd /home/syrenny/Desktop/clones/laundry-schedule

Создать новый Apps Script-модуль:

    apps-script/src/WeeklyReset.js

Добавить wrappers в:

    apps-script/src/Code.js

Обновить порядок сборки:

    scripts/build-apps-script.mjs

Добавить тесты:

    tests/weekly-reset.test.mjs

Запустить:

    npm test
    npm run build:apps-script

Ожидаемый результат тестов: все тесты `node --test tests/*.test.mjs` проходят. Ожидаемый результат сборки: `Built Apps Script project in apps-script/dist`.

Фактический результат 2026-07-17 до чистки старой архитектуры: `npm test` прошел 15 тестов из 15; `npm run build:apps-script` вывел `Built Apps Script project in apps-script/dist`.

Фактический результат 2026-07-17 после чистки старой архитектуры: `npm test` прошел 5 тестов из 5; `npm run build:apps-script` вывел `Built Apps Script project in apps-script/dist`. Содержимое `apps-script/dist`: `Code.js`, `Sheets.js`, `WeeklyReset.js`, `appsscript.json`.

## Validation and Acceptance

При ручном запуске `resetWeeklySchedule` из редактора Apps Script таблица должна получить чистые листы `Haier 1`-`Haier 4`, скопированные из `ScheduleTemplate`. Ячейки шаблона с `{{date:+0}}` должны стать датой начала недели, `{{date:+1}}` — следующим днем, и так до нужного смещения. Формат даты должен отображаться согласно формату ячейки в шаблоне.

При запуске `installWeeklyResetTrigger` старые trigger для `resetWeeklySchedule` должны удалиться, затем должен появиться один еженедельный trigger на день из `SCHEDULE_WEEK_START_DAY` и час из `SCHEDULE_RESET_TRIGGER_HOUR`. Повторный запуск не должен создавать дубликаты.

Автоматическая проверка считается успешной, если `npm test` проходит и `npm run build:apps-script` создает `apps-script/dist/WeeklyReset.js`.

## Idempotence and Recovery

`resetWeeklySchedule` намеренно разрушает текущие записи на целевых листах, потому что это и есть требуемое недельное очищение. Повторный запуск в одну и ту же неделю должен приводить к тому же чистому расписанию на те же даты. Перед первым запуском на реальной spreadsheet пользователь должен убедиться, что список `SCHEDULE_TARGET_SHEET_NAMES` не включает `Контакты`, `Правила` или шаблонный лист.

Если шаблон испорчен, восстановление состоит в ручном исправлении `ScheduleTemplate` и повторном запуске `resetWeeklySchedule`. Если trigger поставлен неверно, надо изменить script properties и повторно запустить `installWeeklyResetTrigger`.

## Artifacts and Notes

Ключевые значения из примера `.xlsx`:

    Sheet Haier 1: B2 = 13.07.2026, Mon; D2 = 14.07.2026, Tue; ... P2 = 20.07.2026, Mon
    Sheet Haier 5: D4 = Машинка не по записи!

Эти значения подтверждают, что шаблон должен поддерживать несколько дневных колонок и что `Haier 5` не стоит включать в список целевых листов по умолчанию.

## Interfaces and Dependencies

В `apps-script/src/WeeklyReset.js` должен существовать объект:

    var LaundryWeeklyReset = (function () { ... })();

Он должен возвращать публичные функции:

    resetWeeklySchedule(referenceDate)
    installWeeklyResetTrigger()
    removeWeeklyResetTriggers()

Для тестов допускается вернуть поле `_test` с чистыми helper-функциями:

    startOfWeek(date, weekStartDay)
    addDays(date, days)
    replaceDateTagsInValues(values, weekStart, timezone, locale)

В `apps-script/src/Code.js` должны существовать глобальные wrapper-функции с теми же именами для ручного запуска в Apps Script.

Зависимости: использовать только стандартные сервисы Google Apps Script (`SpreadsheetApp`, `PropertiesService`, `ScriptApp`, `Utilities`) и существующий `LaundrySheets.getSpreadsheet`.

## Change Notes

2026-07-17 / Codex: Создан исходный ExecPlan после анализа текущей архитектуры и примера `.xlsx`; план фиксирует минимальный атомарный переход к еженедельному восстановлению расписания из листа-шаблона.

2026-07-17 / Codex: ExecPlan обновлен после реализации `WeeklyReset.js`, тестов, README-инструкции и успешной проверки; причина изменения — документ должен отражать фактический завершенный атомарный шаг.

2026-07-17 / Codex: ExecPlan обновлен после уточнения пользователя об удалении лишней логики; причина изменения — объем работы расширился с добавления weekly reset до удаления старой web/API-архитектуры.

2026-07-17 / Codex: ExecPlan обновлен после удаления старой web/API-архитектуры и успешной проверки; причина изменения — документ должен отражать завершенное состояние минимального проекта.

2026-07-17 / Codex: ExecPlan обновлен после упрощения настроек trigger; причина изменения — отдельный `SCHEDULE_RESET_TRIGGER_DAY` позволял создать противоречивую конфигурацию, поэтому день автозапуска теперь всегда берется из `SCHEDULE_WEEK_START_DAY`.
