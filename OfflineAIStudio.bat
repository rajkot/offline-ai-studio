@echo off
setlocal enabledelayedexpansion

:: Offline AI Studio — Windows CLI & Context Menu Root Launcher
set "ROOT_DIR=%~dp0"
set "TARGET_DIR=%~1"
if "%TARGET_DIR%"=="" set "TARGET_DIR=%CD%"

for %%I in ("%TARGET_DIR%") do set "TARGET_DIR=%%~fI"

if exist "%ROOT_DIR%desktop-app\OfflineAIStudio-Portable-1.0.0.exe" (
    start "" "%ROOT_DIR%desktop-app\OfflineAIStudio-Portable-1.0.0.exe" "%TARGET_DIR%"
    exit /b 0
)

if exist "%ROOT_DIR%New folder\OfflineAIStudio-Portable-1.0.0.exe" (
    start "" "%ROOT_DIR%New folder\OfflineAIStudio-Portable-1.0.0.exe" "%TARGET_DIR%"
    exit /b 0
)

if exist "%ROOT_DIR%public\release\win-unpacked\OfflineAIStudio.exe" (
    start "" "%ROOT_DIR%public\release\win-unpacked\OfflineAIStudio.exe" "%TARGET_DIR%"
    exit /b 0
)

start "" "http://127.0.0.1:3000/?folder=%TARGET_DIR%"
exit /b 0
