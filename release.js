const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT = __dirname;
const GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const VJSON = path.join(ROOT, 'version.json');

function log(msg) { console.log(msg); }
function logErr(msg) { console.error('ОШИБКА: ' + msg); }

// --- Проверка файлов ---
if (!fs.existsSync(GRADLE)) { logErr('Не найден ' + GRADLE); process.exit(1); }
if (!fs.existsSync(VJSON)) { logErr('Не найден ' + VJSON); process.exit(1); }

// --- Спросить версию ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Введи новую версию (например 1.1.3): ', (newVersion) => {
  rl.close();

  newVersion = (newVersion || '').trim();
  if (!newVersion) {
    logErr('Версия не введена');
    process.exit(1);
  }

  // Проверка формата 1.1.3
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    logErr('Формат версии должен быть вида 1.1.3');
    process.exit(1);
  }

  log('');
  log('Новая версия: ' + newVersion);
  log('');

  // --- Читаем build.gradle ---
  let gradle = fs.readFileSync(GRADLE, 'utf8');

  // Текущий versionCode
  const codeMatch = gradle.match(/versionCode\s+(\d+)/);
  if (!codeMatch) {
    logErr('Не найден versionCode в build.gradle');
    process.exit(1);
  }
  const oldCode = parseInt(codeMatch[1], 10);
  const newCode = oldCode + 1;

  log('Текущий versionCode: ' + oldCode);
  log('Новый versionCode: ' + newCode);
  log('');

  // --- Обновляем build.gradle ---
  log('[1/4] Обновляю build.gradle...');
  gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + newCode);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "' + newVersion + '"');
  fs.writeFileSync(GRADLE, gradle, 'utf8');

  // --- Обновляем version.json ---
  log('[2/4] Обновляю version.json...');
  let vjson;
  try {
    vjson = JSON.parse(fs.readFileSync(VJSON, 'utf8'));
  } catch (e) {
    logErr('version.json битый: ' + e.message);
    process.exit(1);
  }

  vjson.versionCode = newCode;
  vjson.versionName = newVersion;
  vjson.apkUrl = 'https://github.com/WarizerNir/vetapp/releases/download/v' + newVersion + '/VetApp-' + newVersion + '-release.apk';
  vjson.changelog = 'Обновление ' + newVersion;

  fs.writeFileSync(VJSON, JSON.stringify(vjson, null, 2) + '\n', 'utf8');

  // --- npx cap copy ---
  log('[3/4] npx cap copy...');
  try {
    execSync('npx cap copy', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    logErr('npx cap copy упал');
    process.exit(1);
  }

  // --- Сборка APK ---
  log('');
  log('[4/4] Сборка release APK...');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  try {
    execSync(gradlew + ' assembleRelease', { cwd: path.join(ROOT, 'android'), stdio: 'inherit' });
  } catch (e) {
    logErr('Сборка APK упала');
    process.exit(1);
  }

  // --- Готово ---
  log('');
  log('============================================================');
  log('  ГОТОВО!');
  log('============================================================');
  log('  Версия:   ' + newVersion);
  log('  versionCode: ' + newCode);
  log('  APK:      android\\app\\build\\outputs\\apk\\release\\VetApp-' + newVersion + '-release.apk');
  log('============================================================');
  log('');
  log('ЧТО ДАЛЬШЕ (вручную):');
  log('');
  log('  1. GitHub Releases:');
  log('     github.com/WarizerNir/vetapp/releases');
  log('     Draft a new release, tag v' + newVersion);
  log('     Attach: VetApp-' + newVersion + '-release.apk');
  log('');
  log('  2. Обновить репу:');
  log('     git add .');
  log('     git commit -m "Release ' + newVersion + '"');
  log('     git push');
  log('');
  log('  3. Открой папку с APK (откроется проводник).');
  log('');

  // Открыть проводник с APK
  try {
    execSync('explorer "android\\app\\build\\outputs\\apk\\release"', { cwd: ROOT });
  } catch (e) {}

  log('Нажми Enter чтобы выйти...');
});