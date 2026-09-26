const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  console.log('[AFTER-PACK] Injecting standalone server node_modules into release package...');
  const appOutDir = context.appOutDir;
  const targetServerDir = path.join(appOutDir, 'resources', 'server');
  const targetServerModules = path.join(targetServerDir, 'node_modules');
  const sourceStandaloneModules = path.join(__dirname, '..', '.next', 'standalone', 'node_modules');

  if (fs.existsSync(sourceStandaloneModules)) {
    if (!fs.existsSync(targetServerModules)) {
      fs.mkdirSync(targetServerModules, { recursive: true });
    }
    fs.cpSync(sourceStandaloneModules, targetServerModules, { recursive: true });
    console.log('[AFTER-PACK] Successfully injected standalone node_modules to:', targetServerModules);
  }

  console.log('[AFTER-PACK] Standalone server runtime package ready in:', targetServerDir);
};
