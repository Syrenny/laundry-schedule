import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsScriptSrc = path.join(root, 'apps-script');
const appsScriptDist = path.join(appsScriptSrc, 'dist');
const webDist = path.join(root, 'web', 'dist');

async function copyAppsScriptFiles() {
  await rm(appsScriptDist, { recursive: true, force: true });
  await mkdir(appsScriptDist, { recursive: true });
  await copyFile(path.join(appsScriptSrc, 'appsscript.json'), path.join(appsScriptDist, 'appsscript.json'));
  await copyFile(path.join(webDist, 'index.html'), path.join(appsScriptDist, 'index.html'));

  const sourceFiles = (await readdir(path.join(appsScriptSrc, 'src')))
    .filter((name) => name.endsWith('.js'))
    .sort();

  const preferredOrder = [
    'Constants.js',
    'Sheets.js',
    'WeeklyReset.js',
    'Config.js',
    'Users.js',
    'Notifications.js',
    'ErrorLog.js',
    'AuditLog.js',
    'Reservations.js',
    'Api.js',
    'Code.js'
  ];
  const ordered = [
    ...preferredOrder.filter((name) => sourceFiles.includes(name)),
    ...sourceFiles.filter((name) => !preferredOrder.includes(name))
  ];

  for (const name of ordered) {
    await copyFile(path.join(appsScriptSrc, 'src', name), path.join(appsScriptDist, name));
  }
}

await copyAppsScriptFiles();
console.log(`Built Apps Script project in ${path.relative(root, appsScriptDist)}`);
