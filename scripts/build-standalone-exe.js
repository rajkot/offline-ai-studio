const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSZip = require('jszip');

async function buildStandalone() {
  const args = process.argv.slice(2);
  const buildWin = args.includes('--win') || args.includes('--all') || (!args.includes('--linux') && !args.includes('--mac'));
  const buildLinux = args.includes('--linux') || args.includes('--all') || (!args.includes('--win') && !args.includes('--mac'));
  const buildMac = args.includes('--mac') || args.includes('--all') || (!args.includes('--win') && !args.includes('--linux'));

  console.log('=====================================================================');
  console.log('    OFFLINE AI STUDIO - MULTI-OS STANDALONE PACKAGING PIPELINE      ');
  console.log('=====================================================================');
  console.log(`[TARGETS] Windows: ${buildWin} | Linux: ${buildLinux} | macOS: ${buildMac}`);

  const rootDir = process.cwd();
  const releaseDir = path.join(rootDir, 'public', 'release');
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  // 1. Stage .next/standalone bundle with static assets and public assets
  console.log('[STANDALONE-STAGER] Preparing .next/standalone engine bundle...');
  const standaloneDir = path.join(rootDir, '.next', 'standalone');
  if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
    console.log('[STANDALONE-STAGER] Standalone server not found. Compiling Next.js build...');
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  }

  // Stage .next/static into .next/standalone/.next/static
  const staticSrc = path.join(rootDir, '.next', 'static');
  const staticDst = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    if (!fs.existsSync(staticDst)) fs.mkdirSync(staticDst, { recursive: true });
    fs.cpSync(staticSrc, staticDst, { recursive: true, force: true });
    console.log('[STANDALONE-STAGER] Copied .next/static -> .next/standalone/.next/static');
  }

  // Stage public folder into .next/standalone/public (excluding large binaries/exes/releases)
  const publicSrc = path.join(rootDir, 'public');
  const publicDst = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicSrc)) {
    if (!fs.existsSync(publicDst)) fs.mkdirSync(publicDst, { recursive: true });
    fs.cpSync(publicSrc, publicDst, {
      recursive: true,
      force: true,
      filter: (src) => {
        const basename = path.basename(src);
        if (basename === 'release') return false;
        if (basename.endsWith('.exe') || basename.endsWith('.zip') || basename.endsWith('.dmg') || basename.endsWith('.AppImage')) return false;
        return true;
      }
    });
    console.log('[STANDALONE-STAGER] Copied public -> .next/standalone/public');
  }

  // Clean out stale heavy artifacts from standalone directory
  const standaloneStaleExe = path.join(standaloneDir, 'OfflineAIStudio-Setup-1.0.0.exe');
  if (fs.existsSync(standaloneStaleExe)) {
    try { fs.unlinkSync(standaloneStaleExe); } catch (e) {}
  }
  const standaloneDesktopApp = path.join(standaloneDir, 'desktop-app');
  if (fs.existsSync(standaloneDesktopApp)) {
    try { fs.rmSync(standaloneDesktopApp, { recursive: true, force: true }); } catch (e) {}
  }

  // 2. Pack full source tree into universal ZIP buffer
  console.log('[SOURCE-PACKER] Scanning workspace files and dependencies...');
  const zip = new JSZip();
  const dirsToInclude = ['app', 'components', 'lib', 'client', 'desktop-app', 'public'];
  const rootFiles = ['package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'metadata.json', 'tailwind.config.js'];

  function addDirToZip(dirPath, zipFolder) {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item === 'node_modules' || item === '.next' || item === '.git' || item === 'release' || item.endsWith('.exe') || item.endsWith('.dmg') || item.endsWith('.AppImage') || item.endsWith('.deb')) continue;
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFolder = zipFolder.folder(item);
        addDirToZip(fullPath, subFolder);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(item, content);
      }
    }
  }

  for (const dir of dirsToInclude) {
    const fullDirPath = path.join(rootDir, dir);
    if (fs.existsSync(fullDirPath)) {
      const folder = zip.folder(dir);
      addDirToZip(fullDirPath, folder);
    }
  }

  for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      zip.file(file, fs.readFileSync(filePath));
    }
  }

  const sourceZipPath = path.join(releaseDir, 'OfflineAIStudio-v1.0.0-Source-Bundle.zip');
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  fs.writeFileSync(sourceZipPath, zipBuffer);
  console.log(`[SOURCE-PACKER] Created Source Bundle: ${sourceZipPath} (${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

  const desktopAppDir = path.join(rootDir, 'desktop-app');

  // 3. Invoke electron-builder for selected targets
  if (buildWin) {
    console.log('[WINDOWS-BUILDER] Compiling native Windows Electron binaries with electron-builder...');
    
    // Close any lingering processes before build to prevent EBUSY
    try {
      execSync('powershell.exe -Command "Stop-Process -Name *OfflineAIStudio* -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
    } catch (_) {}

    execSync('npx -y electron-builder --win', { cwd: desktopAppDir, stdio: 'inherit' });

    // Safe copy with retry
    const safeCopy = (src, dest, maxRetries = 5) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (fs.existsSync(dest)) {
            try { fs.unlinkSync(dest); } catch (_) {}
          }
          fs.copyFileSync(src, dest);
          return true;
        } catch (err) {
          if (attempt === maxRetries) {
            console.warn(`[WINDOWS-BUILDER] Warning: could not copy to ${dest}: ${err.message}`);
            return false;
          }
          try {
            execSync('powershell.exe -Command "Stop-Process -Name *OfflineAIStudio* -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
          } catch (_) {}
          const delay = attempt * 500;
          const end = Date.now() + delay;
          while (Date.now() < end) {}
        }
      }
      return false;
    };

    // Ensure standard release filenames across release, root, and desktop-app dirs
    const setupSrc = path.join(releaseDir, 'OfflineAIStudio Setup 1.0.0.exe');
    const setupDst = path.join(releaseDir, 'OfflineAIStudio-Setup-1.0.0.exe');
    if (fs.existsSync(setupSrc)) {
      safeCopy(setupSrc, setupDst);
      safeCopy(setupSrc, path.join(rootDir, 'OfflineAIStudio-Setup-1.0.0.exe'));
      safeCopy(setupSrc, path.join(desktopAppDir, 'OfflineAIStudio-Setup-1.0.0.exe'));
      console.log(`[WINDOWS-BUILDER] Successfully synced: ${setupDst}`);
    }

    const portableSrc = path.join(releaseDir, 'OfflineAIStudio 1.0.0.exe');
    const portableDst = path.join(releaseDir, 'OfflineAIStudio-Portable-1.0.0.exe');
    if (fs.existsSync(portableSrc)) {
      safeCopy(portableSrc, portableDst);
      safeCopy(portableSrc, path.join(rootDir, 'OfflineAIStudio-Portable-1.0.0.exe'));
      safeCopy(portableSrc, path.join(desktopAppDir, 'OfflineAIStudio-Portable-1.0.0.exe'));
      console.log(`[WINDOWS-BUILDER] Successfully synced: ${portableDst}`);
    }
  }

  if (buildLinux) {
    console.log('[LINUX-BUILDER] Compiling native Linux Electron binaries with electron-builder...');
    try {
      execSync('npx -y electron-builder --linux tar.gz', { cwd: desktopAppDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('[LINUX-BUILDER] Warning during linux build:', e.message);
    }

    const tarSrc = path.join(releaseDir, 'offline-ai-studio-1.0.0.tar.gz');
    const tarDst = path.join(releaseDir, 'OfflineAIStudio-v1.0.0-Linux-x64.tar.gz');
    if (fs.existsSync(tarSrc)) {
      fs.copyFileSync(tarSrc, tarDst);
      console.log(`[LINUX-BUILDER] Created ${tarDst}`);
    }
  }

  if (buildMac) {
    console.log('[MAC-BUILDER] Compiling native macOS Electron binaries with electron-builder...');
    try {
      execSync('npx -y electron-builder --mac', { cwd: desktopAppDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('[MAC-BUILDER] Warning during macOS build:', e.message);
    }
  }

  console.log('=====================================================================');
  console.log('          STANDALONE PACKAGING COMPLETE FOR ALL TARGETS!            ');
  console.log('=====================================================================');
  const releaseFiles = fs.readdirSync(releaseDir);
  for (const f of releaseFiles) {
    const full = path.join(releaseDir, f);
    if (fs.statSync(full).isFile()) {
      const sz = (fs.statSync(full).size / (1024 * 1024)).toFixed(2);
      console.log(` * ${f.padEnd(45)} [${sz} MB]`);
    }
  }
}

buildStandalone().catch(err => {
  console.error('[FATAL] Standalone builder error:', err);
  process.exit(1);
});
