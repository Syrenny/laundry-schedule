# laundry-schedule
Google Apps Script automation for maintaining a rolling dormitory laundry schedule in Google Sheets.

## Weekly template reset

Основной сценарий: раз в неделю Apps Script полностью перезаписывает листы расписания из листа-шаблона и подставляет даты новой недели. Таблица больше не используется как база данных записей: жильцы заполняют рабочие листы руками, а скрипт только готовит чистую сетку.

В Google Sheets создайте лист `ScheduleTemplate`. В нем хранится вся сетка расписания, форматирование, ширины колонок, заголовки и теги дат. По умолчанию скрипт перезаписывает листы `Haier 1`, `Haier 2`, `Haier 3`, `Haier 4`.

Теги дат:

- `{{date:+0}}` — дата начала недели; если тег занимает всю ячейку, скрипт запишет значение типа `Date`, а формат отображения возьмется из формата ячейки шаблона.
- `{{date:+1}}` ... `{{date:+6}}` — следующие дни недели.
- `{{date:+0|dd.MM.yyyy}}` — строковая подстановка с обязательным явным форматом, удобна для текста внутри длинной ячейки.
- `{{date:+0|dd.MM.yyyy, EEE}}` — дата с коротким днем недели. Формат после `|` обрабатывается через Apps Script `Utilities.formatDate`, поэтому день недели задается как `EEE` или `EEEE`, а не как `ddd`.

Доступные script properties:

- `SCHEDULE_TEMPLATE_SHEET_NAME` — имя шаблонного листа, по умолчанию `ScheduleTemplate`.
- `SCHEDULE_TARGET_SHEET_NAMES` — рабочие листы через запятую, по умолчанию `Haier 1,Haier 2,Haier 3,Haier 4`.
- `SCHEDULE_WEEK_START_DAY` — день начала недели, по умолчанию `MONDAY`.
- `SCHEDULE_RESET_TRIGGER_HOUR` — час еженедельного запуска, по умолчанию `0`. День запуска всегда совпадает с `SCHEDULE_WEEK_START_DAY`.

Функции Apps Script:

- `resetWeeklySchedule()` — сразу очистить и заново заполнить рабочие листы из шаблона.
- `installWeeklyResetTrigger()` — поставить один еженедельный trigger для `resetWeeklySchedule`; старые trigger этой функции удаляются.
- `removeWeeklyResetTriggers()` — удалить trigger для еженедельного сброса.

Локальная проверка:

```sh
npm test
npm run build:apps-script
```
