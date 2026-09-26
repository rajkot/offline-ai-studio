@echo off
setlocal enabledelayedexpansion

:: Offline AI Studio — Windows CLI & Context Menu Launcher
:: Usage: OfflineAIStudio.bat [optional-folder-path]

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
if exist "%SCRIPT_DIR%package.json" (
    set "ROOT_DIR=%SCRIPT_DIR%"
)

set "TARGET_DIR=%~1"
if "%TARGET_DIR%"=="" set "TARGET_DIR=%CD%"

:: Resolve to full absolute path
for %%I in ("%TARGET_DIR%") do set "TARGET_DIR=%%~fI"

echo [Offline AI Studio] Launching workspace in: "%TARGET_DIR%"

:: Check for packaged Electron Executable
if exist "%ROOT_DIR%\desktop-app\OfflineAIStudio-Portable-1.0.0.exe" (
    start "" "%ROOT_DIR%\desktop-app\OfflineAIStudio-Portable-1.0.0.exe" "%TARGET_DIR%"
    exit /b 0
)

if exist "%ROOT_DIR%\New folder\OfflineAIStudio-Portable-1.0.0.exe" (
    start "" "%ROOT_DIR%\New folder\OfflineAIStudio-Portable-1.0.0.exe" "%TARGET_DIR%"
    exit /b 0
)

if exist "%ROOT_DIR%\public\release\win-unpacked\OfflineAIStudio.exe" (
    start "" "%ROOT_DIR%\public\release\win-unpacked\OfflineAIStudio.exe" "%TARGET_DIR%"
    exit /b 0
)

:: Web server fallback: Open browser with ?folder parameter
echo [Offline AI Studio] Opening via local web interface...
start "" "http://127.0.0.1:3000/?folder=%TARGET_DIR%"
exit /b 0
