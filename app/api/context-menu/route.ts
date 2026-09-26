import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const REG_KEYS = [
  'HKCU\\Software\\Classes\\Directory\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Drive\\shell\\OfflineAIStudio'
];

function getBestExecutablePath(): string {
  const cwd = process.cwd();
  
  // Candidates in priority order:
  const candidates = [
    path.join(cwd, 'desktop-app', 'OfflineAIStudio-Portable-1.0.0.exe'),
    path.join(cwd, 'New folder', 'OfflineAIStudio-Portable-1.0.0.exe'),
    path.join(cwd, 'public', 'release', 'win-unpacked', 'OfflineAIStudio.exe'),
    path.join(cwd, 'public', 'OfflineAIStudio-Portable-1.0.0.exe'),
    path.join(cwd, 'scripts', 'OfflineAIStudio.bat')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to launcher script
  return path.join(cwd, 'scripts', 'OfflineAIStudio.bat');
}

function checkRegistryStatus(): { registered: boolean; commandValue?: string } {
  if (process.platform !== 'win32') {
    return { registered: false };
  }

  try {
    const out = execSync(`reg.exe query "${REG_KEYS[0]}\\command" /ve`, { stdio: 'pipe' }).toString();
    const match = out.match(/REG_SZ\s+(.*)/i);
    return {
      registered: true,
      commandValue: match ? match[1].trim() : out.trim()
    };
  } catch {
    return { registered: false };
  }
}

export async function GET() {
  const isWindows = process.platform === 'win32';
  const status = checkRegistryStatus();
  const exePath = getBestExecutablePath();

  return NextResponse.json({
    platform: process.platform,
    isWindows,
    registered: status.registered,
    commandValue: status.commandValue,
    recommendedExecutable: exePath,
    menuLabel: 'Open with Offline AI Studio'
  });
}

export async function POST(req: NextRequest) {
  try {
    if (process.platform !== 'win32') {
      return NextResponse.json({ error: 'Windows context menu is only applicable on Windows OS.' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action || 'register';
    const targetExe = body.executablePath || getBestExecutablePath();

    if (action === 'unregister') {
      for (const key of REG_KEYS) {
        try {
          execSync(`reg.exe delete "${key}" /f`, { stdio: 'pipe' });
        } catch {
          // Key may not exist
        }
      }

      return NextResponse.json({
        success: true,
        action: 'unregister',
        registered: false,
        message: 'Successfully removed "Open with Offline AI Studio" from Windows File Explorer context menu.'
      });
    }

    if (action === 'register') {
      const resolvedExe = path.resolve(targetExe);
      const iconPath = resolvedExe.endsWith('.bat') 
        ? path.join(process.cwd(), 'desktop-app', 'icon.ico')
        : resolvedExe;

      for (const key of REG_KEYS) {
        // 1. Menu entry label
        execSync(`reg.exe add "${key}" /ve /t REG_SZ /d "Open with Offline AI Studio" /f`, { stdio: 'pipe' });
        
        // 2. Icon
        if (fs.existsSync(iconPath)) {
          execSync(`reg.exe add "${key}" /v "Icon" /t REG_SZ /d "\\"${iconPath}\\",0" /f`, { stdio: 'pipe' });
        }

        // 3. Command execution line with %V or %1
        const commandString = resolvedExe.endsWith('.bat')
          ? `cmd.exe /c "\\"${resolvedExe}\\" \\"%V\\""`
          : `\\"${resolvedExe}\\" \\"%V\\"`;

        execSync(`reg.exe add "${key}\\command" /ve /t REG_SZ /d "${commandString}" /f`, { stdio: 'pipe' });
      }

      return NextResponse.json({
        success: true,
        action: 'register',
        registered: true,
        executablePath: resolvedExe,
        keys: REG_KEYS,
        message: 'Successfully registered "Open with Offline AI Studio" in Windows File Explorer context menu (Directories, Background, and Drives).'
      });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
