import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsScriptSrc = path.join(root, 'apps-script');
const appsScriptDist = path.join(appsScriptSrc, 'dist');
const generatedFileHeaderPath = path.join(appsScriptSrc, 'generated-file-header.js.txt');

async function copyAppsScriptFiles() {
  await rm(appsScriptDist, { recursive: true, force: true });
  await mkdir(appsScriptDist, { recursive: true });
  await copyFile(path.join(appsScriptSrc, 'appsscript.json'), path.join(appsScriptDist, 'appsscript.json'));
  const generatedFileHeader = await readFile(generatedFileHeaderPath, 'utf8');

  const sourceFiles = (await readdir(path.join(appsScriptSrc, 'src')))
    .filter((name) => name.endsWith('.js'))
    .sort();

  const preferredOrder = ['Sheets.js', 'WeeklyReset.js', 'Code.js'];
  const ordered = [
    ...preferredOrder.filter((name) => sourceFiles.includes(name)),
    ...sourceFiles.filter((name) => !preferredOrder.includes(name))
  ];

  for (const name of ordered) {
    const source = await readFile(path.join(appsScriptSrc, 'src', name), 'utf8');
    await writeFile(path.join(appsScriptDist, name), generatedFileHeader + source);
  }
}

await copyAppsScriptFiles();
console.log(`Built Apps Script project in ${path.relative(root, appsScriptDist)}`);
