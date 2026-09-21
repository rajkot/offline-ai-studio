/*
 * Offline AI Studio - Native Windows x64 Portable Executable Launcher Stub
 * Compiles with: x86_64-w64-mingw32-gcc -O2 -mwindows -o OfflineAIStudio.exe launcher.c
 */

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <shellapi.h>
#include <process.h>

#define APP_NAME "Offline AI Studio"
#define APP_VERSION "1.0.0"
#define PORT 3000
#define SERVER_URL "http://localhost:3000"

// Check if Node.js runtime exists
BOOL IsNodeInstalled() {
    DWORD exitCode;
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags |= STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    ZeroMemory(&pi, sizeof(pi));

    char cmd[] = "node -v";
    if (CreateProcessA(NULL, cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        WaitForSingleObject(pi.hProcess, 3000);
        GetExitCodeProcess(pi.hProcess, &exitCode);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return (exitCode == 0);
    }
    return FALSE;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char currentDir[MAX_PATH];
    GetCurrentDirectoryA(MAX_PATH, currentDir);

    // Verify Node.js
    if (!IsNodeInstalled()) {
        int choice = MessageBoxA(
            NULL,
            "Node.js runtime was not detected in PATH.\n\n"
            "Offline AI Studio requires Node.js v18 or v20 LTS for local micro-kernel WASI execution.\n"
            "Would you like to open the official Node.js download page?",
            "Offline AI Studio - Runtime Dependency",
            MB_ICONQUESTION | MB_YESNO
        );
        if (choice == IDYES) {
            ShellExecuteA(NULL, "open", "https://nodejs.org/en/download/", NULL, NULL, SW_SHOWNORMAL);
        }
        return 1;
    }

    // Launch server in background
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));

    char startCmd[1024];
    snprintf(startCmd, sizeof(startCmd), "cmd.exe /c npm run dev");

    CreateProcessA(
        NULL,
        startCmd,
        NULL,
        NULL,
        FALSE,
        CREATE_NO_WINDOW,
        NULL,
        currentDir,
        &si,
        &pi
    );

    // Give server 2.5 seconds to bind to port 3000 then open default browser
    Sleep(2500);
    ShellExecuteA(NULL, "open", SERVER_URL, NULL, NULL, SW_SHOWNORMAL);

    return 0;
}
