const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

const REG_KEYS = [
  'HKCU\\Software\\Classes\\Directory\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Drive\\shell\\OfflineAIStudio'
];

function findExe() {
  const candidates = [
    path.join(rootDir, 'desktop-app', 'OfflineAIStudio-Portable-1.0.0.exe'),
    path.join(rootDir, 'New folder', 'OfflineAIStudio-Portable-1.0.0.exe'),
    path.join(rootDir, 'public', 'release', 'win-unpacked', 'OfflineAIStudio.exe'),
    path.join(rootDir, 'OfflineAIStudio.bat')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(rootDir, 'OfflineAIStudio.bat');
}

const targetExe = findExe();
const iconPath = targetExe.endsWith('.bat')
  ? path.join(rootDir, 'desktop-app', 'icon.ico')
  : targetExe;

console.log('==========================================================');
console.log('   Offline AI Studio — Windows Context Menu Installer');
console.log('==========================================================');
console.log('Target Executable:', targetExe);
console.log('Target Icon:      ', iconPath);
console.log('');

const commandStr = targetExe.endsWith('.bat')
  ? `cmd.exe /c "\\"${targetExe}\\" \\"%V\\""`
  : `\\"${targetExe}\\" \\"%V\\"`;

for (const key of REG_KEYS) {
  try {
    execSync(`reg.exe add "${key}" /ve /t REG_SZ /d "Open with Offline AI Studio" /f`, { stdio: 'ignore' });
    if (fs.existsSync(iconPath)) {
      execSync(`reg.exe add "${key}" /v "Icon" /t REG_SZ /d "\\"${iconPath}\\",0" /f`, { stdio: 'ignore' });
    }
    execSync(`reg.exe add "${key}\\command" /ve /t REG_SZ /d "${commandStr}" /f`, { stdio: 'ignore' });
    console.log('[OK] Registered:', key);
  } catch (err) {
    console.error('[ERROR] Failed on', key, err.message);
  }
}

console.log('');
console.log('==========================================================');
console.log(' SUCCESS: "Open with Offline AI Studio" has been added to');
console.log(' your Windows Explorer Right-Click Menu!');
console.log('==========================================================');
