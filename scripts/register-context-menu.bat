@echo off
node "%~dp0register-context-menu.js"
if %ERRORLEVEL% NEQ 0 (
    echo An error occurred registering context menu.
)
pause
