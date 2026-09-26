const { execSync } = require('child_process');

const REG_KEYS = [
  'HKCU\\Software\\Classes\\Directory\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Drive\\shell\\OfflineAIStudio'
];

console.log('Unregistering Offline AI Studio from Windows context menu...');

for (const key of REG_KEYS) {
  try {
    execSync(`reg.exe delete "${key}" /f`, { stdio: 'ignore' });
    console.log('[OK] Removed:', key);
  } catch (err) {
    // Key not found or already deleted
  }
}

console.log('[SUCCESS] Successfully unregistered Offline AI Studio from Windows context menu.');
