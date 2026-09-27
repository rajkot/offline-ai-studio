@echo off
setlocal
title Offline AI Studio - NanoJev Installer

echo ======================================================================
echo   Launching Offline AI Studio NanoJev Auto-Download Pipeline...
echo ======================================================================

set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-nanojev.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation exited with error code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)

echo [SUCCESS] NanoJev pipeline installation finished.
exit /b 0
