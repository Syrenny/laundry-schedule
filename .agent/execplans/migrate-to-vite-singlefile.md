# Перевод Apps Script frontend на vite-plugin-singlefile

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Документ поддерживается в соответствии с `.agent/PLANS.md`. Все не-code артефакты написаны на русском языке; имена библиотек, файлов, команд и идентификаторов сохранены в оригинальном виде.

## Purpose / Big Picture

После изменения production-сборка frontend будет формироваться стандартным плагином `vite-plugin-singlefile`: JavaScript и CSS окажутся внутри одного `web/dist/index.html`. Подготовка Apps Script project больше не будет разбирать HTML регулярными выражениями и вручную вклеивать assets в отдельный шаблон. Проверяемый результат — `npm run build` создает `apps-script/dist/index.html` без внешних CSS/JS-файлов, а встроенный JavaScript остается синтаксически корректным и совместимым с Apps Script HtmlService.

## Progress

- [x] (2026-07-17 16:00Z) Исследованы текущие Vite config, build script, HTML-шаблоны, package scripts и установленная версия `vite-plugin-singlefile`.
- [x] (2026-07-17 16:08Z) Подключен `viteSingleFile()` для Apps Script build, а HtmlService-совместимый `<base target="_top">` перенесен в `web/index.html`.
- [x] (2026-07-17 16:08Z) `scripts/build-apps-script.mjs` упрощен до копирования готового single-file HTML и Apps Script sources.
- [x] (2026-07-17 16:08Z) Обновлено описание build script и удален ставший ненужным `apps-script/templates/index.html`.
- [x] (2026-07-17 16:10Z) Успешно выполнены typecheck, полная сборка и проверки структуры/синтаксиса итогового HTML.

## Surprises & Discoveries

- Observation: `vite-plugin-singlefile` уже добавлен в `web/package.json` и `web/package-lock.json`, но еще не используется в `web/vite.config.ts`.
  Evidence: dependency имеет версию `^2.3.3`, а массив `plugins` содержит только `react()` и custom HtmlService safety plugin.

- Observation: текущее ручное инлайнирование ранее уже повреждало JavaScript из-за replacement semantics и требовало отдельных исправлений.
  Evidence: существующий ExecPlan `.agent/execplans/webapp-material-ui.md` фиксирует замену string replacement на callback после появления `<!-- APP_JS -->` внутри bundle.

- Observation: текущий frontend не выпускает отдельный CSS asset, несмотря на использование Material UI.
  Evidence: после `npm run build` `web/dist` содержит только `index.html`, а проверка HTML показывает один inline script и ноль style tags; Emotion генерирует стили приложения во время выполнения.

## Decision Log

- Decision: Использовать пакет `vite-plugin-singlefile` и его export `viteSingleFile`, несмотря на разговорное название пользователя `vite-single-file`.
  Rationale: этот пакет уже установлен, предназначен для Vite и официально предоставляет требуемое преобразование CSS/JS в один HTML.
  Date/Author: 2026-07-17 / Codex

- Decision: Включать single-file plugin только в mode `apps-script`.
  Rationale: локальный Vite dev server не нуждается в single-file преобразовании, а условное подключение сохраняет обычный development flow.
  Date/Author: 2026-07-17 / Codex

- Decision: Сохранить custom Rollup transformation для литерала `javascript:`.
  Rationale: она решает отдельную совместимость с Apps Script HtmlService и должна сработать над JS chunk до того, как `vite-plugin-singlefile` встроит chunk в HTML.
  Date/Author: 2026-07-17 / Codex

## Outcomes & Retrospective

2026-07-17: Миграция завершена. `vite-plugin-singlefile` формирует готовый `web/dist/index.html`, ручной parser и отдельный Apps Script HTML-шаблон удалены, а подготовительный скрипт только копирует build output и backend sources. `npm run typecheck` и `npm run build` проходят. Итоговый HTML совпадает в `web/dist` и `apps-script/dist`, содержит один синтаксически валидный inline script и не содержит ссылок на generated CSS/JS или опасного цельного литерала `javascript:throw new Error`.

## Context and Orientation

Frontend находится в `web/`. Его entry HTML — `web/index.html`, конфигурация сборки — `web/vite.config.ts`. Команда `npm --prefix web run build` запускает TypeScript build и `vite build --mode apps-script`, создавая `web/dist`.

Сейчас `scripts/build-apps-script.mjs` читает список CSS и JS из `web/dist/index.html`, читает каждый asset и подставляет содержимое в markers `<!-- APP_CSS -->` и `<!-- APP_JS -->` файла `apps-script/templates/index.html`. Затем он копирует backend-файлы из `apps-script/src` и manifest в `apps-script/dist`, откуда `clasp` выполняет deploy.

`vite-plugin-singlefile` — Vite plugin, который на этапе build встраивает созданные CSS и JavaScript assets непосредственно в `index.html` и удаляет отдельные inlined files. После его подключения `web/dist/index.html` сам становится готовым frontend-артефактом, поэтому ручной parser и `apps-script/templates/index.html` больше не нужны.

## Plan of Work

В `web/vite.config.ts` нужно импортировать `viteSingleFile` и условно добавить его в массив plugins после React и HtmlService safety plugin. Текущие Apps Script build-параметры остаются явными, поскольку они документируют target, отключение minify и module preload; plugin может дополнительно применить совместимые Rollup defaults.

В `web/index.html` нужно добавить `<base target="_top">`, требуемый Apps Script iframe, и сохранить React entry script. После build этот же документ станет deployable HTML.

В `scripts/build-apps-script.mjs` нужно удалить чтение assets, регулярные выражения, marker replacements и inline escaping. После копирования backend sources скрипт должен просто скопировать `web/dist/index.html` в `apps-script/dist/index.html`. Файл `apps-script/templates/index.html` после этого удаляется, а `scripts/README.md` обновляется так, чтобы описывать новую границу ответственности.

## Concrete Steps

Рабочая директория для всех команд — `/home/syrenny/Desktop/clones/laundry-schedule`.

После редактирования выполнить:

    npm run typecheck
    npm run build

Затем проверить, что single-file output не ссылается на generated assets, markers старого шаблона отсутствуют, запрещенный цельный литерал не вернулся, а inline JavaScript парсится Node.js.

## Validation and Acceptance

`npm run typecheck` и `npm run build` должны завершиться с exit code 0. После сборки в `web/dist` должен остаться `index.html` без generated `.js`/`.css`, а `apps-script/dist/index.html` должен быть byte-for-byte равен ему. В deploy HTML должен присутствовать inline `<script>`; inline `<style>` присутствует только если frontend действительно создает CSS asset. Ссылки `src="...js"`, `href="...css"`, markers `APP_CSS`, `APP_JS` и цельная строка `javascript:throw new Error` должны отсутствовать. Содержимое основного inline script должно успешно разбираться `node:vm` как JavaScript.

## Idempotence and Recovery

Все build-команды повторяемы: Vite пересоздает `web/dist`, а `scripts/build-apps-script.mjs` удаляет и пересоздает `apps-script/dist`. При сбое готовый Apps Script output можно восстановить повторным `npm run build`; данные и внешние сервисы эти действия не изменяют.

## Artifacts and Notes

Ожидаемая структура после сборки:

    web/dist/index.html
    apps-script/dist/index.html
    apps-script/dist/appsscript.json
    apps-script/dist/*.js

## Interfaces and Dependencies

В `web/vite.config.ts` используется существующая devDependency `vite-plugin-singlefile@^2.3.3` и ее функция `viteSingleFile()`. Новых runtime API и backend interfaces не появляется. Root-команды `npm run build`, `npm run build:web` и `npm run build:apps-script` сохраняются.

Примечание об изменении (2026-07-17): создан первоначальный ExecPlan после исследования текущего ручного инлайнера и уже установленной зависимости; причина — зафиксировать безопасную миграцию и проверяемые критерии single-file output.

Примечание об изменении (2026-07-17): ExecPlan обновлен после реализации; отмечены выполненные шаги, зафиксировано отсутствие отдельного CSS asset и добавлены фактические результаты validation.
