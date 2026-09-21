; ==============================================================================
; Offline AI Studio - NSIS Windows Installer Script
; Compiles with makensis to generate OfflineAIStudio-Setup-1.0.0.exe
; ==============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General Configuration
Name "Offline AI Studio"
OutFile "../public/release/OfflineAIStudio-Setup-1.0.0.exe"
InstallDir "$PROGRAMFILES64\OfflineAIStudio"
InstallDirRegKey HKLM "Software\OfflineAIStudio" "Install_Dir"
RequestExecutionLevel admin

; UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "icon.png"
!define MUI_UNICON "icon.png"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "../LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "Offline AI Studio Core" SecCore
  SetOutPath "$INSTDIR"
  
  ; Copy source bundle, Electron runtime, and node launch binaries
  File /r "..\app"
  File /r "..\components"
  File /r "..\lib"
  File /r "..\client"
  File /r "..\public"
  File "..\package.json"
  File "..\tsconfig.json"
  File "..\next.config.ts"
  File "..\metadata.json"
  File "launcher.c"
  File "main.js"
  File "preload.js"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Registry Keys
  WriteRegStr HKLM "Software\OfflineAIStudio" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfflineAIStudio" "DisplayName" "Offline AI Studio"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfflineAIStudio" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfflineAIStudio" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfflineAIStudio" "NoRepair" 1
  
  ; Create Shortcuts
  CreateDirectory "$SMPROGRAMS\Offline AI Studio"
  CreateShortcut "$SMPROGRAMS\Offline AI Studio\Offline AI Studio.lnk" "$INSTDIR\start-offline-studio.cmd" "" "$INSTDIR\public\icon-512.svg" 0
  CreateShortcut "$SMPROGRAMS\Offline AI Studio\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Offline AI Studio.lnk" "$INSTDIR\start-offline-studio.cmd" "" "$INSTDIR\public\icon-512.svg" 0
SectionEnd

; Uninstaller Section
Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\Offline AI Studio\Offline AI Studio.lnk"
  Delete "$SMPROGRAMS\Offline AI Studio\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Offline AI Studio"
  Delete "$DESKTOP\Offline AI Studio.lnk"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OfflineAIStudio"
  DeleteRegKey HKLM "Software\OfflineAIStudio"
SectionEnd
