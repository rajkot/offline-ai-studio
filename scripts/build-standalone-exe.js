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

  // 1. Pack full source tree into universal ZIP buffer
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

  // 2. Invoke electron-builder for selected targets
  if (buildWin) {
    console.log('[WINDOWS-BUILDER] Compiling native Windows Electron binaries with electron-builder...');
    execSync('npx -y electron-builder --win', { cwd: desktopAppDir, stdio: 'inherit' });

    // Ensure standard release filenames
    const setupSrc = path.join(releaseDir, 'OfflineAIStudio Setup 1.0.0.exe');
    const setupDst = path.join(releaseDir, 'OfflineAIStudio-Setup-1.0.0.exe');
    if (fs.existsSync(setupSrc)) {
      fs.copyFileSync(setupSrc, setupDst);
      console.log(`[WINDOWS-BUILDER] Created ${setupDst}`);
    }

    const portableSrc = path.join(releaseDir, 'OfflineAIStudio 1.0.0.exe');
    const portableDst = path.join(releaseDir, 'OfflineAIStudio-Portable-1.0.0.exe');
    if (fs.existsSync(portableSrc)) {
      fs.copyFileSync(portableSrc, portableDst);
      console.log(`[WINDOWS-BUILDER] Created ${portableDst}`);
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
