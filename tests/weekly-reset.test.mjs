import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const weeklyResetSource = readFileSync(
  new URL('../apps-script/src/WeeklyReset.js', import.meta.url),
  'utf8'
);

function makeApi(overrides = {}) {
  const context = {
    Date,
    ...overrides
  };
  vm.createContext(context);
  vm.runInContext(weeklyResetSource, context);
  return context.LaundryWeeklyReset._test;
}

test('startOfWeek возвращает понедельник текущей недели', () => {
  const api = makeApi();
  const weekStart = api.startOfWeek(new Date('2026-07-17T15:00:00Z'), 'MONDAY', 'UTC');

  assert.equal(weekStart.toISOString(), '2026-07-13T12:00:00.000Z');
});

test('replaceDateTagsInValues заменяет одиночный тег на Date для формата ячейки', () => {
  const api = makeApi();
  const result = api.replaceDateTagsInValues(
    [['{{date:+0}}', '{{date:+6}}']],
    new Date('2026-07-13T12:00:00Z'),
    'UTC',
    'ru'
  );

  assert.ok(result[0][0] instanceof Date);
  assert.equal(result[0][0].toISOString(), '2026-07-13T12:00:00.000Z');
  assert.equal(result[0][1].toISOString(), '2026-07-19T12:00:00.000Z');
});

test('replaceDateTagsInValues форматирует встроенные теги строкой', () => {
  const api = makeApi({
    Utilities: {
      formatDate: (date, timezone, pattern) => {
        assert.equal(timezone, 'Asia/Novosibirsk');
        assert.equal(pattern, 'dd.MM.yyyy');
        return date.toISOString().slice(0, 10);
      }
    }
  });
  const result = api.replaceDateTagsInValues(
    [['Неделя с {{date:+0|dd.MM.yyyy}} до {{date:+6|dd.MM.yyyy}}']],
    new Date('2026-07-13T12:00:00Z'),
    'Asia/Novosibirsk',
    'ru'
  );

  assert.deepEqual(result, [['Неделя с 2026-07-13 до 2026-07-19']]);
});

test('replaceDateTagsInValues не меняет обычные значения', () => {
  const api = makeApi();
  const originalDate = new Date('2026-07-17T00:00:00Z');
  const result = api.replaceDateTagsInValues(
    [['plain text', 42, originalDate]],
    new Date('2026-07-13T12:00:00Z'),
    'UTC',
    'en'
  );

  assert.equal(result[0][0], 'plain text');
  assert.equal(result[0][1], 42);
  assert.equal(result[0][2], originalDate);
});
