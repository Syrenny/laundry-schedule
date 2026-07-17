# Scripts

`build-apps-script.mjs` копирует исходные файлы Apps Script и single-file сборку Vite в `apps-script/dist`, чтобы `clasp push` мог развернуть самодостаточный Apps Script webapp. Перед запуском скрипта `vite-plugin-singlefile` встраивает JavaScript и CSS в `web/dist/index.html`.
