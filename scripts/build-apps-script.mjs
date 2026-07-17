import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsScriptSrc = path.join(root, 'apps-script');
const appsScriptDist = path.join(appsScriptSrc, 'dist');
const webDist = path.join(root, 'web', 'dist');

async function readAsset(assetPath) {
  return readFile(path.join(webDist, assetPath.replace(/^\//, '')), 'utf8');
}

function makeInlineScriptSafe(source) {
  return source
    .replaceAll('</script', '<\\/script')
    .replaceAll('<!--', '<\\!--')
    .replaceAll('javascript:', 'java" + "script:');
}

async function inlineFrontend() {
  const indexHtml = await readFile(path.join(webDist, 'index.html'), 'utf8');
  const cssAssets = [...indexHtml.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map((match) => match[1]);
  const jsAssets = [...indexHtml.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g)].map((match) => match[1]);

  const css = await Promise.all(cssAssets.map(readAsset));
  const js = (await Promise.all(jsAssets.map(readAsset))).map(makeInlineScriptSafe);
  let template = await readFile(path.join(appsScriptSrc, 'templates', 'index.html'), 'utf8');
  template = template.replace('<!-- APP_CSS -->', () => `<style>\n${css.join('\n')}\n</style>`);
  template = template.replace('<!-- APP_JS -->', () => `<script>\n${js.join('\n')}\n</script>`);
  await writeFile(path.join(appsScriptDist, 'index.html'), template);
}

async function copyAppsScriptFiles() {
  await rm(appsScriptDist, { recursive: true, force: true });
  await mkdir(appsScriptDist, { recursive: true });
  await copyFile(path.join(appsScriptSrc, 'appsscript.json'), path.join(appsScriptDist, 'appsscript.json'));

  const sourceFiles = (await readdir(path.join(appsScriptSrc, 'src')))
    .filter((name) => name.endsWith('.js'))
    .sort();

  const preferredOrder = [
    'Constants.js',
    'Sheets.js',
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
await inlineFrontend();
console.log(`Built Apps Script project in ${path.relative(root, appsScriptDist)}`);
