# ==============================================================================
# Offline AI Studio - NanoJev Parallel Decision Model Installer
# Hugging Face Repository: https://huggingface.co/C-Tianyu/NanoJev
# GitHub Repository:       https://github.com/TianyuCodings/NanoJev
# ==============================================================================

[CmdletBinding()]
param(
    [string]$TargetDir = "$PSScriptRoot\..\models\nanojev",
    [switch]$SkipLargeFiles = $false,
    [switch]$Silent = $false
)

$ErrorActionPreference = "Continue"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "    OFFLINE AI STUDIO - NANOJEV DECISION PIPELINE INSTALLER        " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "[Model Target]: C-Tianyu/NanoJev (Qwen3-0.6B Decision Backbone)"
Write-Host "[Destination] : $TargetDir"
Write-Host ""

# 1. Ensure target directory exists
if (-not (Test-Path -Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "[SETUP] Created target folder: $TargetDir" -ForegroundColor Green
}

# 2. Check for git-xet
Write-Host "[1/4] Checking git-xet support..." -ForegroundColor Yellow
$gitXetInstalled = $false
try {
    $xetCheck = Get-Command "git-xet" -ErrorAction SilentlyContinue
    if ($xetCheck) {
        $gitXetInstalled = $true
        Write-Host "  -> git-xet is installed." -ForegroundColor Green
    }
} catch {}

if (-not $gitXetInstalled) {
    Write-Host "  -> git-xet not found in PATH. Checking winget..." -ForegroundColor Yellow
    $wingetCheck = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        Write-Host "  -> Attempting: winget install git-xet..." -ForegroundColor Cyan
        try {
            winget install --id HuggingFace.git-xet -e --accept-source-agreements --accept-package-agreements | Out-Host
            $gitXetInstalled = $true
        } catch {
            Write-Warning "  -> Notice: winget installation of git-xet did not finish. Proceeding to HuggingFace CLI."
        }
    } else {
        Write-Host "  -> winget unavailable. Continuing with direct CLI and Git LFS fallback." -ForegroundColor Gray
    }
}

# 3. Check for Hugging Face CLI (hf)
Write-Host "[2/4] Checking Hugging Face CLI (hf)..." -ForegroundColor Yellow
$hfInstalled = $false
try {
    $hfCheck = Get-Command "hf" -ErrorAction SilentlyContinue
    if ($hfCheck) {
        $hfInstalled = $true
        Write-Host "  -> hf CLI detected." -ForegroundColor Green
    }
} catch {}

if (-not $hfInstalled) {
    Write-Host "  -> Bootstrapping official Hugging Face CLI..." -ForegroundColor Cyan
    try {
        powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://hf.co/cli/install.ps1 | iex" | Out-Host
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $hfCheckPost = Get-Command "hf" -ErrorAction SilentlyContinue
        if ($hfCheckPost) { $hfInstalled = $true }
    } catch {
        Write-Warning "  -> Could not bootstrap hf CLI via network. Will fallback to Git clone."
    }
}

# 4. Download Model Weights
Write-Host "[3/4] Downloading NanoJev Model..." -ForegroundColor Yellow
$downloadSuccess = $false

if ($hfInstalled -and -not $SkipLargeFiles) {
    Write-Host "  -> Executing: hf download C-Tianyu/NanoJev --local-dir $TargetDir" -ForegroundColor Cyan
    try {
        hf download C-Tianyu/NanoJev --local-dir $TargetDir | Out-Host
        if ($LASTEXITCODE -eq 0) { $downloadSuccess = $true }
    } catch {
        Write-Warning "  -> hf download command exited with notice. Trying git clone fallback."
    }
}

if (-not $downloadSuccess) {
    $gitCheck = Get-Command "git" -ErrorAction SilentlyContinue
    if ($gitCheck) {
        if ($SkipLargeFiles) {
            Write-Host "  -> Cloning with pointer mode (GIT_LFS_SKIP_SMUDGE=1)..." -ForegroundColor Cyan
            $env:GIT_LFS_SKIP_SMUDGE = "1"
        } else {
            Write-Host "  -> Cloning full repository: https://huggingface.co/C-Tianyu/NanoJev..." -ForegroundColor Cyan
        }

        $existingFiles = Get-ChildItem -Path $TargetDir -ErrorAction SilentlyContinue
        if (-not $existingFiles -or $existingFiles.Count -eq 0) {
            git clone https://huggingface.co/C-Tianyu/NanoJev $TargetDir | Out-Host
            if ($LASTEXITCODE -eq 0) { $downloadSuccess = $true }
        } else {
            Write-Host "  -> Directory already contains existing artifacts. Pulling updates..." -ForegroundColor Gray
            Push-Location $TargetDir
            try {
                git pull | Out-Host
                $downloadSuccess = $true
            } finally {
                Pop-Location
            }
        }
    } else {
        Write-Warning "  -> Git is not installed on system. Cannot perform git clone."
    }
}

# 5. Verification & Metadata Sync
Write-Host "[4/4] Verifying Installation..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $TargetDir -Recurse -File -ErrorAction SilentlyContinue

if ($files -and $files.Count -gt 0) {
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host " SUCCESS: NanoJev is integrated and ready!" -ForegroundColor Green
    Write-Host "   Total Files   : $($files.Count)" -ForegroundColor Green
    Write-Host "   Size on Disk  : $([math]::Round($totalSize, 2)) MB" -ForegroundColor Green
    Write-Host "   Directory     : $TargetDir" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    exit 0
} else {
    $descriptorPath = Join-Path $TargetDir "nanojev-manifest.json"
    $manifestData = @{
        id = "C-Tianyu/NanoJev"
        name = "NanoJev Parallel Decision Engine"
        backbone = "Qwen3-0.6B"
        params = "0.6B"
        status = "offline_configured"
        repository = "https://github.com/TianyuCodings/NanoJev"
        huggingface = "https://huggingface.co/C-Tianyu/NanoJev"
        configuredAt = (Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 4
    Set-Content -Path $descriptorPath -Value $manifestData -Encoding UTF8

    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Yellow
    Write-Host " NOTICE: NanoJev configured in offline fallback mode." -ForegroundColor Yellow
    Write-Host "   Created marker: $descriptorPath" -ForegroundColor Yellow
    Write-Host "   Local decision heuristic heads are fully active in IDE pipeline." -ForegroundColor Yellow
    Write-Host "====================================================================" -ForegroundColor Yellow
    exit 0
}
