# Webapp для записи в прачечную на Google Apps Script

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Этот документ должен поддерживаться в соответствии с `.agent/PLANS.md`. Все новые не-code артефакты пишутся на русском языке. Имена файлов, команд, API, библиотек и идентификаторов сохраняются в оригинальном виде.

## Purpose / Big Picture

После этой работы жильцы смогут записываться в прачечную через webapp, а не редактировать общую таблицу напрямую. Google Sheets останется хранилищем данных, админской панелью и читаемым источником состояния, но пользователи таблицы должны получить только readonly-доступ, чтобы случайные правки ячеек больше не ломали расписание.

Новый webapp будет построен на Google Apps Script backend и React + Vite + Material UI frontend, собранном внутрь Apps Script. Деплой кода будет выполняться из GitHub Actions через `clasp`. Существующие листы из скачанного файла, включая `Haier 1`, `Haier 2`, `Haier 3`, `Haier 4`, `Haier 5`, `Контакты`, `Правила` и `Лист83`, на первом этапе не изменяются, чтобы не нарушить текущую работу прачечной.

Проверяемый результат: владелец открывает URL Apps Script webapp, видит сетку доступных слотов, пользователь с доступным email может записаться и отменить свою запись, конкурентная запись в один слот невозможна, а GitHub Actions может задеплоить новую версию скрипта в Apps Script project.

## Progress

- [x] (2026-07-17 13:39Z) Зафиксированы исходные требования: webapp, Material UI, readonly-доступ к таблице для пользователей, настройки в отдельном листе, деплой через GitHub Actions, создание новых листов без изменения старых.
- [x] (2026-07-17 13:39Z) Проверено текущее состояние репозитория: есть `README.md`, `LICENSE`, `AGENTS.md`, `.agent/PLANS.md` и `Запись в прачечную 4_1.xlsx`; прикладного кода пока нет.
- [x] (2026-07-17 13:44Z) Уточнено хранение секретов: секретные файлы должны лежать в репозитории только в `sops`-зашифрованном виде, а в GitHub Secrets хранится только ключ расшифровки.
- [x] (2026-07-17 13:47Z) Добавлено требование наблюдаемости: ошибки не должны быть тихими, критичные ошибки логируются в отдельный лист и отправляются в Telegram через бота.
- [x] (2026-07-17 13:50Z) Добавлена модель окружений: `local` для frontend mock, `staging` для тестовой Google Sheets и тестового Telegram, `production` для реальной системы.
- [x] (2026-07-17 13:53Z) Уточнен GitHub flow: staging деплоится из ветки `staging`, которую можно force-push для тестов; production не деплоится автоматически.
- [x] (2026-07-17 14:34Z) Уточнено разделение Apps Script projects: staging и production должны иметь разные `scriptId` и разные encrypted clasp configs.
- [x] (2026-07-17 13:55Z) Создан каркас проекта Apps Script и frontend: `apps-script/`, `web/`, `scripts/`, `secrets/`, `.github/workflows/`, root package scripts и build pipeline.
- [x] (2026-07-17 14:05Z) Реализовано создание и валидация новых листов Google Sheets через `setupSheets()`.
- [x] (2026-07-17 14:05Z) Реализован backend API Apps Script для расписания, записи, отмены, проверки текущего пользователя, ErrorLog и Telegram-уведомлений.
- [x] (2026-07-17 14:05Z) Реализован React + Vite + Material UI frontend с `local` mock API.
- [x] (2026-07-17 14:05Z) Добавлен GitHub Actions deploy через `clasp` для staging branch и ручного production deploy.
- [ ] Провести ручную проверку webapp на тестовой копии Google Sheets.
- [x] (2026-07-17 14:07Z) Подготовлена инструкция в `README.md` для локального запуска, секретов, staging deploy, production deploy, runtime checks и readonly rollout.
- [x] (2026-07-17 14:48Z) После повторной ошибки `Request contains an invalid argument` удалены explicit `oauthScopes` из manifest и добавлена диагностика `clasp` перед push в GitHub Actions.
- [x] (2026-07-17 15:41Z) Исправлен build-скрипт инлайна frontend: `String.replace` заменен на function replacement, чтобы символы `$&` внутри minified JS не подменялись на placeholder.
- [x] (2026-07-17 15:22Z) Выявлено, что `clasp run` требует API executable deployment и не подходит для bootstrap runtime secrets сразу после `clasp push`.
- [x] (2026-07-17 15:31Z) Workflow упрощен: GitHub Actions больше не вызывает `setRuntimeSecretsFromJson`; runtime secrets настраиваются вручную в Apps Script Script Properties для каждого окружения.

## Surprises & Discoveries

- Observation: Репозиторий пока не содержит структуры Apps Script или frontend, поэтому план должен включать создание проекта с нуля.
  Evidence: `rg --files` показал только `Запись в прачечную 4_1.xlsx`, `README.md`, `AGENTS.md` и `LICENSE`.
- Observation: Рабочее дерево уже содержит untracked файлы и директории, не все из них относятся к этой задаче.
  Evidence: `git status --short` показал `.agent/`, `.local/`, `.vscode/`, `AGENTS.md` и `.xlsx` как untracked.
- Observation: Frontend build проходит, bundle Material UI получается около 388 kB до gzip и 121 kB gzip.
  Evidence: `npm run build` завершился успешно; Vite output показал `dist/assets/index-CKPXchSf.js 388.13 kB │ gzip: 121.37 kB`.
- Observation: `clasp run setRuntimeSecretsFromJson` не подходит для текущего bootstrap runtime secrets.
  Evidence: GitHub Actions вернул `Script function not found. Please make sure script is deployed as API executable.` Для `clasp run` нужен отдельный API executable deployment, которого нет после обычного `clasp push`.
- Observation: `clasp push` в GitHub Actions возвращает неинформативную ошибку `Request contains an invalid argument`.
  Evidence: staging workflow падает на `npx @google/clasp push --force` до запуска runtime-кода. В ответ manifest упрощен: удалены explicit `oauthScopes`, потому что Apps Script может определить scopes автоматически, а неподдержанный scope в manifest может приводить к этой ошибке.
- Observation: Белая страница staging webapp была вызвана повреждением minified JS при инлайне.
  Evidence: в `apps-script/dist/index.html` встречались строки `<!-- APP_JS -->` внутри JS bundle. Причина: `String.replace` воспринимает `$&` в replacement string как специальную подстановку. После замены на callback replacement `rg -n "APP_JS|APP_CSS" apps-script/dist/index.html` ничего не находит, а `node --check` inline JS проходит.

## Decision Log

- Decision: Делать webapp, а не автоматизировать старую Excel-подобную сетку как основной интерфейс.
  Rationale: Webapp позволяет не выдавать пользователям права редактирования таблицы, централизованно проверять конфликты, использовать email как идентификатор и хранить историю записей в нормализованном виде.
  Date/Author: 2026-07-17 / Codex

- Decision: Использовать Google Sheets как хранилище данных на первом этапе.
  Rationale: Это сохраняет простую эксплуатацию, видимость данных для владельца и не требует отдельной базы данных, сервера или платежной инфраструктуры.
  Date/Author: 2026-07-17 / Codex

- Decision: Старые листы не изменять и не использовать как источник истины для нового webapp.
  Rationale: Существующее расписание должно продолжать работать до завершения миграции; любые изменения старых листов могут нарушить текущий процесс записи.
  Date/Author: 2026-07-17 / Codex

- Decision: Создать новые листы `Settings`, `Machines`, `Users`, `Reservations`, `AuditLog` и опционально `ScheduleView`.
  Rationale: Разделение настроек, справочников, записей и аудита упрощает backend-логику, проверку конфликтов и будущую миграцию.
  Date/Author: 2026-07-17 / Codex

- Decision: Собрать React + Vite + Material UI внутрь Apps Script, а не хостить frontend отдельно.
  Rationale: Встроенный frontend упрощает получение пользователя через Apps Script context и позволяет вызывать backend через `google.script.run` без отдельной OAuth-интеграции между frontend и API.
  Date/Author: 2026-07-17 / Codex

- Decision: Использовать `LockService` для операций записи и отмены.
  Rationale: Два пользователя могут одновременно попытаться занять один слот; сервер обязан сериализовать критическую секцию и повторно проверять конфликт внутри lock.
  Date/Author: 2026-07-17 / Codex

- Decision: Хранить секретные файлы в репозитории в `sops`-зашифрованном виде, а в GitHub Secrets держать только `SOPS_AGE_KEY`.
  Rationale: Это позволяет ревьюить изменения зашифрованных credentials в git, не раскрывая сами секреты, и сводит GitHub Secrets к одному ключу расшифровки. Открытые `.clasprc.json`, `.clasp.json` с реальным `scriptId` и OAuth-токены не должны попадать в репозиторий.
  Date/Author: 2026-07-17 / Codex

- Decision: Добавить явное логирование ошибок и Telegram-уведомления о критичных сбоях.
  Rationale: На ранних этапах эксплуатации ошибки почти неизбежны. Тихие сбои опасны, потому что пользователи будут думать, что запись прошла или система работает, хотя backend мог упасть. Лист `ErrorLog` дает долговременный след в таблице, а Telegram-уведомление быстро сообщает владельцу о проблеме.
  Date/Author: 2026-07-17 / Codex

- Decision: Поддержать три окружения: `local`, `staging` и `production`.
  Rationale: React UI нужно быстро разрабатывать без деплоя в Apps Script после каждой правки, а backend нужно проверять на тестовой Google Sheets до касания реальной таблицы. Разделение окружений также предотвращает случайную отправку тестовых ошибок в реальную Telegram-беседу.
  Date/Author: 2026-07-17 / Codex

- Decision: Привязать staging deploy к ветке `staging`, а production deploy оставить ручным.
  Rationale: Пользователь планирует периодически делать `push --force` в ветку `staging` для быстрых тестов. Это нормально для тестового окружения, но production не должен обновляться от force-push или обычного push.
  Date/Author: 2026-07-17 / Codex

- Decision: Использовать разные Apps Script projects для staging и production.
  Rationale: Один `scriptId` для обоих окружений создает риск случайно перезаписать production тестовым деплоем. Разные `secrets/clasp-staging.json.enc` и `secrets/clasp-production.json.enc` физически разделяют deployments и URL webapp.
  Date/Author: 2026-07-17 / Codex

- Decision: Не задавать `oauthScopes` явно в `appsscript.json` на MVP.
  Rationale: Ручной список scopes повышает риск ошибки manifest при `clasp push`; Apps Script умеет вычислять scopes по используемым сервисам. Явные scopes можно вернуть позже, когда staging push стабилен и список подтвержден.
  Date/Author: 2026-07-17 / Codex

- Decision: Runtime secrets на MVP настраиваются вручную в Apps Script Script Properties, а не через `clasp run`.
  Rationale: `clasp run` требует отдельный API executable deployment и ломает простой staging deploy. Ручная настройка Script Properties выполняется один раз на staging и один раз на production, не вшивает секреты в исходники и не требует дополнительного executable deployment.
  Date/Author: 2026-07-17 / Codex

## Outcomes & Retrospective

2026-07-17: Реализован первый MVP-каркас. Есть Apps Script backend, React/Vite/MUI frontend, build pipeline, `sops` templates, GitHub Actions deploy workflow, локальный mock mode, ErrorLog и Telegram notification code. Локальная сборка проходит. Ручная проверка в реальном Apps Script deployment еще не выполнена, потому что для нее нужны реальные Google credentials, `scriptId`, staging Google Sheet и `sops` secrets.

2026-07-17: README обновлен инструкциями для локальной разработки, сборки, `sops`-секретов, staging branch deploy, ручного production deploy и readonly rollout. Остается провести проверку в staging Google Sheets после настройки реальных секретов.

2026-07-17: После повторной ошибки `clasp push` manifest упрощен: `webapp` уже был удален ранее, теперь удалены explicit `oauthScopes`. В workflow добавлен диагностический шаг перед push: проверка `.clasp.json`, печать manifest, список файлов и `clasp status` без раскрытия полного `scriptId`.

2026-07-17: Исправлена причина белой страницы после открытия webapp. Build script теперь инлайнит CSS/JS через callback replacement, чтобы minified bundle не повреждался спец-подстановками JavaScript `String.replace`.

## Context and Orientation

Репозиторий находится в `/home/syrenny/Desktop/clones/laundry-schedule`. В корне сейчас есть скачанный файл `Запись в прачечную 4_1.xlsx`, который отражает текущую таблицу записи в прачечную. По предварительному осмотру в нем есть старые листы `Контакты`, `Правила`, `Haier 1`, `Haier 2`, `Haier 3`, `Haier 4`, `Лист83` и `Haier 5`. Эти листы считаются legacy UI: люди уже используют их, поэтому план запрещает менять их на первом этапе.

Новая система должна жить рядом со старой. Источником истины для webapp станет лист `Reservations`, где каждая строка является одной записью на конкретную дату, время и машинку. Термин "источник истины" означает место, из которого backend принимает финальные решения: свободен ли слот, кто его занял, можно ли отменить запись. Визуальные сетки или старые листы не должны принимать такие решения.

Google Apps Script будет серверной частью. Apps Script functions вызываются frontend через `google.script.run`, который доступен внутри HTML, отданного `HtmlService`. Frontend будет обычным React-приложением, собранным Vite в статические файлы и встроенным в Apps Script HTML.

`clasp` будет инструментом деплоя. Он связывает локальные файлы с Apps Script project через `.clasp.json`, где хранится `scriptId`. Staging и production должны быть разными Apps Script projects: staging workflow расшифровывает `secrets/clasp-staging.json.enc`, production workflow расшифровывает `secrets/clasp-production.json.enc`. GitHub Actions будет запускать сборку frontend и `clasp push`. Учетные данные для `clasp` и реальные `.clasp.json` должны храниться в репозитории только как `sops`-зашифрованные файлы. В GitHub Secrets должен быть только ключ расшифровки `SOPS_AGE_KEY`.

Email пользователя является важным допущением. Apps Script может возвращать пустой email в некоторых режимах деплоя и доступа. Поэтому первый milestone реализации обязан включать probe-функцию, которая показывает `Session.getActiveUser().getEmail()` и `Session.getEffectiveUser().getEmail()` в реальном deployment mode.

Окружения должны быть явными. `local` означает локальную разработку frontend через Vite dev server и mock API без Google Apps Script. `staging` означает Apps Script deployment, подключенный к тестовой Google Sheets и тестовому Telegram chat. `production` означает Apps Script deployment, подключенный к реальной Google Sheets и реальной Telegram-беседе. Backend читает `APP_ENV` из Script Properties; frontend читает `VITE_APP_ENV` при локальной сборке и также получает server-reported environment из `getWeekSchedule` или отдельного bootstrap endpoint.

## Plan of Work

Сначала нужно создать структуру репозитория, не трогая legacy `.xlsx` и старые листы в реальной Google Sheets. Предлагаемая структура:

    apps-script/
      appsscript.json
      src/
        Code.js
        Api.js
        Config.js
        Sheets.js
        Reservations.js
        AuditLog.js
        ErrorLog.js
        Notifications.js
        Html.js
      templates/
        index.html
    web/
      package.json
      index.html
      src/
        App.tsx
        api.ts
        mockApi.ts
        main.tsx
        types.ts
        components/
    scripts/
      build-apps-script.mjs
    secrets/
      .sops.yaml
      clasp-staging.json.enc
      clasp-production.json.enc
      clasprc.json.enc
    .github/
      workflows/
        deploy.yml
    .clasp.json.example

`apps-script/src/Code.js` должен содержать entrypoints Apps Script: `doGet`, `onOpen` при необходимости, `setupSheets`, `getCurrentUserProbe`, `getWeekSchedule`, `reserveSlot`, `cancelReservation`. Эти функции должны быть глобально доступны после сборки, потому что `google.script.run` вызывает только глобальные server functions.

`apps-script/src/Sheets.js` должен содержать низкоуровневые операции чтения и записи листов. Все чтение должно выполняться диапазонами, а не ячейка-за-ячейкой. Это снижает задержки Apps Script.

`apps-script/src/Config.js` должен читать лист `Settings` и валидировать значения. Ошибка настроек должна возвращать понятное сообщение владельцу, а не молча ломать запись.

`apps-script/src/Reservations.js` должен реализовать бизнес-логику: построить расписание недели, проверить лимиты пользователя, проверить свободность слота, создать запись, отменить запись. Запись и отмена должны использовать `LockService.getScriptLock()`.

`apps-script/src/AuditLog.js` должен писать события `reserve`, `cancel`, `conflict`, `setup`, `settings_error` в лист `AuditLog`. Аудит нужен, чтобы владелец мог восстановить картину при спорных ситуациях.

`apps-script/src/ErrorLog.js` должен писать технические ошибки в лист `ErrorLog`. Запись должна включать timestamp, severity, context, actor_email, message, stack и details_json. Этот лист отличается от `AuditLog`: `AuditLog` описывает бизнес-события, а `ErrorLog` описывает сбои и неожиданные состояния.

`apps-script/src/Notifications.js` должен отправлять Telegram-уведомления о критичных ошибках через bot API. Token бота и chat id не должны храниться в `Settings` или в репозитории; они должны быть вручную записаны в Apps Script Script Properties для каждого окружения. Если Telegram API недоступен, ошибка отправки уведомления не должна ломать основную операцию, но должна быть записана в `ErrorLog` с severity `warning`.

`web/src/api.ts` должен оборачивать `google.script.run` в Promise. Frontend не должен обращаться к Google Sheets напрямую. В `local` окружении `web/src/mockApi.ts` должен возвращать реалистичные данные расписания, записи, конфликта и ошибки, чтобы UI можно было разрабатывать через `npm run dev` без Apps Script.

`web/src/App.tsx` должен отрисовывать интерфейс Material UI: выбор недели, список машин, сетку слотов, состояние загрузки, ошибку отсутствующего email, диалог подтверждения записи, snackbar для результата и кнопку отмены своей записи. В `staging` интерфейс должен показывать заметный, но не мешающий индикатор окружения, чтобы тестовую систему нельзя было перепутать с production.

`scripts/build-apps-script.mjs` должен собирать frontend через Vite и помещать результат в формат, который Apps Script сможет отдать через `HtmlService`. При необходимости скрипт может инлайнить CSS и JS в template, чтобы избежать проблем с путями assets в Apps Script.

`.github/workflows/deploy.yml` должен выполнять установку `sops`, расшифровку окруженческого clasp config и `secrets/clasprc.json.enc` через `SOPS_AGE_KEY`, `npm ci`, сборку frontend, подготовку Apps Script output и `clasp push --force`. Для staging используется `secrets/clasp-staging.json.enc`; для production используется `secrets/clasp-production.json.enc`. Workflow должен запускать staging deploy на push в ветку `staging`, включая force-push. Workflow также должен поддерживать `workflow_dispatch` для ручного запуска. Production deploy не должен запускаться автоматически на push; он разрешен только через ручной `workflow_dispatch` после успешной staging-проверки. Workflow не должен вызывать `clasp run` для runtime secrets.

GitHub Actions должен разделять staging и production. `deploy-staging` запускается из ветки `staging` и подключается к тестовой таблице. `deploy-production` запускается только через `workflow_dispatch` и требует явного выбора production environment или отдельного job, чтобы production не обновлялся случайным push. Ветка `main` является источником production-кандидата, но сама по себе не деплоит production.

## New Sheet Schema

Новые листы создаются функцией `setupSheets()` в реальной Google Sheets. Функция должна быть идемпотентной: повторный запуск не удаляет существующие данные, а только создает отсутствующие листы и заголовки.

`Settings`:

    key | value | description
    timezone | Asia/Novosibirsk | Часовой пояс расписания
    week_start | 2026-07-20 | Понедельник текущей недели по умолчанию
    slot_start_hour | 5 | Первый час расписания
    slot_count | 24 | Количество часовых слотов
    slot_duration_minutes | 60 | Длительность одного слота
    max_active_reservations_per_user | 1 | Максимум активных будущих записей на пользователя
    allow_cancel_before_minutes | 0 | За сколько минут до начала можно отменять запись
    schedule_version | 1 | Версия расписания для обновления UI
    app_status | active | active или maintenance
    app_env | staging | staging или production; в local используется только frontend mock
    telegram_notifications_enabled | TRUE | Включать Telegram-уведомления о критичных ошибках
    telegram_min_severity | error | Минимальный уровень ошибок для отправки в Telegram

`Machines`:

    id | name | enabled | sort_order | note
    haier_1 | Haier 1 | TRUE | 1 |
    haier_2 | Haier 2 | TRUE | 2 |
    haier_3 | Haier 3 | TRUE | 3 |
    haier_4 | Haier 4 | TRUE | 4 |
    haier_5 | Haier 5 | FALSE | 5 | Машинка не по записи

`Users`:

    email | display_name | room | role | enabled | note

`role` на первом этапе может быть `user` или `admin`. Если список пользователей пустой, система должна либо разрешать всех пользователей с непустым email, либо работать в strict mode через настройку `require_user_allowlist`. Это решение нужно подтвердить перед реализацией.

`Reservations`:

    id | date | start_time | end_time | machine_id | email | display_name | room | status | created_at | updated_at | cancelled_at | note

`status` принимает минимум `active` и `cancelled`. Удалять строки записей нельзя; отмена меняет status, чтобы сохранялась история.

`AuditLog`:

    timestamp | actor_email | action | entity_type | entity_id | details_json

`ErrorLog`:

    timestamp | severity | context | actor_email | message | stack | details_json | telegram_status

`severity` принимает минимум `info`, `warning`, `error` и `critical`. В Telegram отправляются только ошибки с уровнем не ниже `telegram_min_severity`. `telegram_status` фиксирует `sent`, `skipped`, `failed` или `disabled`.

`ScheduleView` является опциональным листом. Если он будет создан, он должен быть read-only представлением для владельца, построенным из `Reservations`, а не местом ручного редактирования.

## Concrete Steps

1. Работать из корня репозитория:

       cd /home/syrenny/Desktop/clones/laundry-schedule

2. Создать frontend package в `web/` с Vite, React, TypeScript и Material UI. Команды могут быть такими:

       npm create vite@latest web -- --template react-ts
       cd web
       npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

   Если генератор меняет лишние файлы или создает неподходящую структуру, допустимо создать минимальный `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` и `src/` вручную через `apply_patch`.

3. Создать Apps Script файлы в `apps-script/`. `appsscript.json` должен включать `timeZone`, `exceptionLogging`, `runtimeVersion: V8` и webapp scopes, необходимые для Spreadsheet access. Начать с минимального набора scopes и расширять только при необходимости.

4. Реализовать `setupSheets()` так, чтобы она создавала только новые листы. Она не должна переименовывать, очищать, скрывать или защищать старые листы. Если лист уже существует, функция должна проверить заголовки и вернуть отчет о состоянии.

5. Реализовать email probe:

       getCurrentUserProbe()

   Возвращаемый объект должен включать `activeUserEmail`, `effectiveUserEmail`, `temporaryActiveUserKey` и deployment hints. Его нужно использовать только для проверки режима доступа и не показывать лишнее обычным пользователям после MVP.

6. Реализовать API чтения расписания:

       getWeekSchedule(weekStartIso)

   Функция читает `Settings`, `Machines`, `Users`, `Reservations`, строит список дней и слотов, возвращает только данные, нужные UI. Она не должна отдавать приватные данные других пользователей сверх имени/комнаты, если это не принято владельцем.

7. Реализовать API записи:

       reserveSlot(request)

   `request` должен содержать `date`, `start_time`, `machine_id` и при необходимости `display_name` или `room`. Сервер сам берет email из `Session.getActiveUser().getEmail()`. Сервер валидирует, что email не пустой, machine enabled, slot входит в допустимую сетку, пользователь enabled, лимит записей не превышен, слот свободен. Проверка свободности и append новой строки выполняются внутри `LockService`.

8. Реализовать API отмены:

       cancelReservation(reservationId)

   Сервер разрешает обычному пользователю отменять только свою активную запись. Admin может отменять чужую запись только если это явно включено в MVP. Отмена меняет status на `cancelled`, заполняет `cancelled_at` и пишет событие в `AuditLog`.

9. Реализовать React UI. Минимальный экран должен включать:

   - состояние загрузки;
   - ошибку, если email недоступен;
   - выбор недели вперед/назад;
   - вкладки или переключатель машин;
   - сетку дней и слотов;
   - визуальное отличие свободных, занятых пользователем, занятых другими и недоступных слотов;
   - диалог подтверждения записи;
   - действие отмены своей записи;
   - snackbar с результатом;
   - кнопку ручного обновления.

10. Настроить build. После `npm run build` frontend должен попадать в Apps Script HTML template. Локальная проверка должна подтверждать, что сборка не оставляет ссылок на несуществующие absolute assets.

11. Настроить `sops + age` для deploy-секретов. В репозитории должны появиться `secrets/clasp-staging.json.enc`, `secrets/clasp-production.json.enc` и `secrets/clasprc.json.enc`. `secrets/clasp-staging.json.enc` и `secrets/clasp-production.json.enc` после расшифровки должны становиться `.clasp.json` в корне репозитория или в рабочей директории `clasp` в соответствующем workflow, а `secrets/clasprc.json.enc` после расшифровки должен становиться `~/.clasprc.json`. Runtime-секреты вроде `STAGING_SPREADSHEET_ID`, `PRODUCTION_SPREADSHEET_ID`, `TELEGRAM_BOT_TOKEN`, `STAGING_TELEGRAM_CHAT_ID`, `PRODUCTION_TELEGRAM_CHAT_ID` и `APP_ENV` не хранятся в репозитории и вручную задаются в Apps Script Script Properties соответствующего проекта. В GitHub Secrets должен храниться только `SOPS_AGE_KEY`. Открытые `.clasp.json`, `.clasprc.json`, OAuth-токены, Telegram token, chat id, spreadsheet ids и приватные `age` keys не должны коммититься.

12. Добавить GitHub Actions workflow. Workflow должен запускать `deploy-staging` на push в ветку `staging`, включая force-push, и также поддерживать ручной запуск через `workflow_dispatch`. Workflow обязан расшифровывать credentials в рантайме и удалять или оставлять их только в ephemeral filesystem GitHub runner. `deploy-production` должен запускаться только вручную через `workflow_dispatch`; production job не должен запускаться автоматически на push в `main`, `staging` или любую другую ветку.

13. Реализовать общий wrapper для backend server functions. Каждая публичная функция, вызываемая из frontend, должна ловить исключения, записывать их в `ErrorLog`, отправлять Telegram-уведомление при подходящем severity и возвращать клиенту понятный error response. Исключения не должны исчезать без записи в `ErrorLog`.

14. Реализовать dev-mode для frontend. `npm run dev` в `web/` должен запускать Vite и использовать `mockApi.ts`, если `VITE_APP_ENV=local` или если `google.script.run` недоступен. Mock должен включать свободные слоты, занятые чужие слоты, занятые текущим пользователем слоты, конфликт при записи и искусственную backend-ошибку.

15. Проверить все на тестовой копии Google Sheets. Только после этого подключать реальную таблицу и переводить пользователей таблицы в readonly.

## Validation and Acceptance

Первичная проверка выполняется на тестовой копии Google Sheets, а не на реальной таблице общежития.

Проверка setup:

    В staging Apps Script editor или через webapp admin entrypoint запустить setupSheets().
    Ожидаемый результат: созданы листы Settings, Machines, Users, Reservations, AuditLog, ErrorLog; старые листы не изменены.

Проверка email:

    Открыть deployed webapp под аккаунтом владельца и под обычным пользовательским аккаунтом.
    Ожидаемый результат: activeUserEmail непустой для обычного пользователя в выбранном deployment mode.
    Если activeUserEmail пустой, реализация не считается готовой к использованию; нужно пересмотреть deployment mode или auth design.

Проверка записи:

    Открыть webapp, выбрать свободный слот и нажать запись.
    Ожидаемый результат: в Reservations появляется строка со status active, machine_id, date, start_time, end_time и email текущего пользователя; UI показывает слот занятым этим пользователем.

Проверка конфликта:

    С двух аккаунтов открыть один и тот же свободный слот и почти одновременно нажать запись.
    Ожидаемый результат: только одна active-запись появляется в Reservations; второй пользователь получает понятную ошибку о занятом слоте; AuditLog содержит событие conflict или failed_reserve.

Проверка отмены:

    Пользователь отменяет свою запись.
    Ожидаемый результат: строка Reservations получает status cancelled и cancelled_at; UI снова показывает слот свободным или обновленным согласно правилам; AuditLog содержит cancel.

Проверка readonly:

    После успешного теста на копии владелец переводит обычных пользователей реальной Google Sheets в readonly.
    Ожидаемый результат: пользователи не могут редактировать листы напрямую, но могут записываться через webapp.

Проверка деплоя:

    Сделать push или push --force в ветку staging.
    Ожидаемый результат: workflow получает `SOPS_AGE_KEY` из GitHub Secrets, расшифровывает `secrets/clasp-staging.json.enc` и `secrets/clasprc.json.enc`, `clasp push` обновляет staging Apps Script project, webapp открывается и показывает актуальную версию UI с индикатором STAGING.

    Запустить GitHub Actions deploy workflow вручную для production только после успешной staging-проверки.
    Ожидаемый результат: production Apps Script project обновляется только после явного ручного запуска; push в main или staging не запускает production deploy.

Проверка секретов:

    Локально выполнить расшифровку тестовым ключом или реальным ключом владельца.
    Ожидаемый результат: `sops -d secrets/clasp-staging.json.enc` и `sops -d secrets/clasp-production.json.enc` возвращают JSON для разных Apps Script projects, `sops -d secrets/clasprc.json.enc` возвращает JSON credentials, а `git status --short` не показывает открытые `.clasp.json`, `.clasprc.json`, runtime-секреты или приватный age key как файлы для коммита.

Проверка логирования ошибок:

    В тестовом deployment вызвать специальную admin/test функцию, которая намеренно бросает исключение после определения текущего пользователя.
    Ожидаемый результат: frontend получает понятную ошибку, в ErrorLog появляется строка с severity error или critical, context тестовой функции и stack trace, а в Telegram-беседу приходит короткое сообщение с названием функции, timestamp и message.

Локальные проверки до деплоя:

    cd /home/syrenny/Desktop/clones/laundry-schedule/web
    npm run dev
    npm run build

Ожидаемый результат: `npm run dev` открывает local UI с mock schedule без Apps Script, а Vite build завершается без TypeScript ошибок. Если будут добавлены tests или lint, их команды нужно зафиксировать в README и в этом ExecPlan.

## Idempotence and Recovery

`setupSheets()` должна быть безопасной для повторного запуска. Она создает отсутствующие листы и заголовки, но не удаляет данные из существующих листов. Если заголовки существующего нового листа отличаются от ожидаемых, функция должна вернуть предупреждение и не перезаписывать лист автоматически.

Старые листы не изменяются до отдельного решения. Если новая система окажется неготовой, можно продолжать пользоваться старой таблицей без rollback.

Операции `reserveSlot` и `cancelReservation` должны быть атомарными с точки зрения данных. Если операция падает после получения lock, `finally` обязан освободить lock. Если append в `Reservations` прошел, но запись в `AuditLog` не прошла, это нужно логировать как warning в `ErrorLog`; основная запись не должна автоматически удаляться.

Telegram-уведомления являются вспомогательным каналом наблюдаемости, а не источником истины. Если `UrlFetchApp.fetch` к Telegram API падает, backend должен записать warning в `ErrorLog` и вернуть пользователю результат основной операции, если сама операция успела успешно завершиться. Telegram token и chat id должны храниться только в Apps Script Script Properties.

Деплой через GitHub Actions должен быть воспроизводимым. Secrets не должны попадать в git в открытом виде. Источником зашифрованных deploy-секретов являются `secrets/clasp-staging.json.enc`, `secrets/clasp-production.json.enc` и `secrets/clasprc.json.enc`; единственный секрет GitHub Actions для расшифровки называется `SOPS_AGE_KEY`. `.gitignore` должен исключать открытые `.clasp.json`, `.clasprc.json`, runtime-секреты, `keys.txt`, `age.key` и временные расшифрованные файлы.

Перед переводом реальных пользователей в readonly нужно иметь URL рабочей версии webapp и подтверждение, что email доступен. Если email недоступен, переход на readonly откладывается.

`local` режим не должен требовать `sops`, Google credentials, `.clasp.json` или доступа к Google Sheets. Он нужен только для разработки UI и проверки клиентских состояний. `staging` режим должен использовать тестовую Google Sheets и тестовый Telegram chat. `production` режим должен использовать реальную Google Sheets и реальную Telegram-беседу. Любая функция, которая меняет данные, должна логировать active environment в `AuditLog` или `ErrorLog`.

## Artifacts and Notes

Исходное состояние репозитория на момент создания плана:

    rg --files -g '!*node_modules*' -g '!*.git*'
    Запись в прачечную 4_1.xlsx
    README.md
    AGENTS.md
    LICENSE

    git status --short
    ?? .agent/
    ?? .local/
    ?? .vscode/
    ?? AGENTS.md
    ?? "Запись в прачечную 4_1.xlsx"

Ожидаемый README после реализации должен кратко описывать:

    - как создать Apps Script project;
    - как привязать `.clasp.json`;
    - как создать `age` key, зашифровать `clasp` credentials через `sops` и положить только `SOPS_AGE_KEY` в GitHub Secrets;
    - как создать Telegram bot, получить chat id, зашифровать runtime-секреты и проверить тестовое уведомление;
    - как запустить local dev-mode через `npm run dev`;
    - как создать staging Google Sheet и staging Telegram chat;
    - как использовать ветку `staging` для тестового деплоя, включая допустимый `git push --force`;
    - как запустить `setupSheets()`;
    - как проверить email;
    - как запустить локальную сборку frontend;
    - как работает GitHub Actions deploy;
    - какие листы нельзя редактировать вручную.

## Interfaces and Dependencies

Backend server functions, доступные через `google.script.run`:

    function doGet(e)
    function setupSheets()
    function getCurrentUserProbe()
    function getWeekSchedule(weekStartIso)
    function reserveSlot(request)
    function cancelReservation(reservationId)
    function sendTestTelegramNotification()
    function throwTestErrorForLogging()

Минимальные frontend types в `web/src/types.ts`:

    export type Machine = {
      id: string;
      name: string;
      enabled: boolean;
      sortOrder: number;
    };

    export type Slot = {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      machineId: string;
      status: 'free' | 'mine' | 'occupied' | 'disabled';
      reservationId?: string;
      occupantLabel?: string;
    };

    export type WeekSchedule = {
      weekStart: string;
      timezone: string;
      currentUser: {
        email: string;
        displayName?: string;
        room?: string;
        role: 'user' | 'admin';
      };
      environment: 'local' | 'staging' | 'production';
      machines: Machine[];
      days: Array<{ date: string; label: string }>;
      slots: Slot[];
      scheduleVersion: number;
    };

    export type ReserveRequest = {
      date: string;
      startTime: string;
      machineId: string;
    };

    export type ReserveResult = {
      ok: boolean;
      schedule?: WeekSchedule;
      error?: string;
    };

Frontend dependencies:

    React
    Vite
    TypeScript
    @mui/material
    @emotion/react
    @emotion/styled
    @mui/icons-material

Apps Script dependencies:

    SpreadsheetApp для работы с Google Sheets.
    HtmlService для отдачи webapp.
    Session для получения email пользователя.
    LockService для защиты от конкурентных записей.
    CacheService опционально для ускорения чтения расписания.
    PropertiesService опционально для технических версий миграций, но не для пользовательских настроек.
    UrlFetchApp для отправки Telegram-уведомлений через bot API.

Explicit `oauthScopes` в `appsscript.json` на MVP не задаются. Apps Script должен определить scopes автоматически по `SpreadsheetApp`, `UrlFetchApp`, `PropertiesService`, `Session` и другим используемым сервисам. Если позже потребуется строгий allowlist scopes, его нужно возвращать отдельным изменением после успешного staging push.

`CacheService` не должен быть источником истины. Его можно использовать только для ускорения `getWeekSchedule`; после успешной записи или отмены кэш нужно сбрасывать или менять `schedule_version`.

`PropertiesService` должен хранить runtime-секреты `TELEGRAM_BOT_TOKEN`, `STAGING_TELEGRAM_CHAT_ID`, `PRODUCTION_TELEGRAM_CHAT_ID`, `STAGING_SPREADSHEET_ID`, `PRODUCTION_SPREADSHEET_ID` и `APP_ENV`, потому что эти значения не должны быть видны в листе `Settings`. Лист `Settings` хранит только несекретные переключатели вроде `telegram_notifications_enabled`, `telegram_min_severity` и человекочитаемый `app_env`.

## Change Notes

2026-07-17 / Codex: Создан initial ExecPlan по требованию пользователя. План фиксирует решение делать webapp с Material UI, хранить настройки в отдельном листе, деплоить через GitHub Actions, создавать новые листы и не менять legacy-листы на первом этапе.

2026-07-17 / Codex: План обновлен по уточнению пользователя: секреты должны храниться в `sops`-зашифрованном формате в репозитории, а GitHub Secrets должен содержать только ключ расшифровки `SOPS_AGE_KEY`.

2026-07-17 / Codex: План обновлен требованием наблюдаемости: добавлены `ErrorLog`, `Notifications.js`, Telegram-уведомления о критичных ошибках, runtime-секреты в `sops` и проверка тестового сбоя.

2026-07-17 / Codex: План обновлен dev-mode моделью: добавлены окружения `local`, `staging`, `production`, mock API для Vite dev server, staging Google Sheet, staging Telegram chat и ручной production deploy.

2026-07-17 / Codex: План обновлен под веточную модель деплоя: staging deploy запускается из ветки `staging`, force-push в эту ветку допустим для тестирования, production deploy остается только ручным.

2026-07-17 / Codex: План обновлен под разные Apps Script projects для staging и production. `secrets/clasp.json.enc` заменен на `secrets/clasp-staging.json.enc` и `secrets/clasp-production.json.enc`.

2026-07-17 / Codex: План обновлен по результатам падения `clasp push`: explicit `oauthScopes` удалены из manifest, добавлены local clasp debug instructions и diagnostic step в GitHub Actions.

2026-07-17 / Codex: План обновлен по результатам white screen debug: причина была в повреждении inline JS из-за `$&` в replacement string; `scripts/build-apps-script.mjs` исправлен.

2026-07-17 / Codex: План обновлен после ошибки `clasp run`: автоматическая запись runtime secrets через `setRuntimeSecretsFromJson` удалена из workflow; runtime secrets задаются вручную в Apps Script Script Properties.

2026-07-17 / Codex: Из плана удалено хранение `secrets/runtime-secrets.json.enc`. Runtime-секреты больше не хранятся в репозитории даже в зашифрованном виде; в repo остаются только deploy-секреты для `clasp`.
