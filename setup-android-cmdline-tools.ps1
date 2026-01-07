# Android SDK Command-Line Tools Setup Script
# This script extracts and configures the command-line tools for Flutter

$ErrorActionPreference = "Stop"

Write-Host "=== Android SDK Command-Line Tools Setup ===" -ForegroundColor Cyan
Write-Host ""

# Paths
$zipPath = Join-Path $env:TEMP "commandlinetools-win-latest.zip"
$sdkRoot = "C:\Users\PC\AppData\Local\Android\Sdk"
$cmdlineToolsDir = Join-Path $sdkRoot "cmdline-tools"
$latestDir = Join-Path $cmdlineToolsDir "latest"

# Check if zip exists
if (!(Test-Path $zipPath)) {
    Write-Host "ERROR: Command-line tools zip not found at: $zipPath" -ForegroundColor Red
    Write-Host "Downloading now..." -ForegroundColor Yellow
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        Write-Host "Downloaded successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to download: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Found zip at: $zipPath" -ForegroundColor Green

# Create cmdline-tools directory
Write-Host "Creating directory: $cmdlineToolsDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $cmdlineToolsDir -Force | Out-Null

# Extract to temp location
$tempExtract = Join-Path $env:TEMP "cmdlinetools_extract_temp"
if (Test-Path $tempExtract) {
    Write-Host "Cleaning old temp directory..." -ForegroundColor Yellow
    Remove-Item -Path $tempExtract -Recurse -Force
}

Write-Host "Extracting zip to temp location..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $tempExtract -Force

# The zip contains a 'cmdline-tools' folder, we need to move its contents to 'latest'
$extractedCmdlineTools = Join-Path $tempExtract "cmdline-tools"

if (Test-Path $extractedCmdlineTools) {
    Write-Host "Moving contents to $latestDir..." -ForegroundColor Yellow
    
    # Remove existing latest directory if it exists
    if (Test-Path $latestDir) {
        Remove-Item -Path $latestDir -Recurse -Force
    }
    
    # Move the extracted cmdline-tools to 'latest'
    Move-Item -Path $extractedCmdlineTools -Destination $latestDir -Force
    Write-Host "Command-line tools installed to: $latestDir" -ForegroundColor Green
} else {
    Write-Host "ERROR: Expected 'cmdline-tools' folder not found in zip" -ForegroundColor Red
    exit 1
}

# Cleanup temp directory
Write-Host "Cleaning up temp files..." -ForegroundColor Yellow
Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

# Verify sdkmanager exists
$sdkmanager = Join-Path $latestDir "bin\sdkmanager.bat"
if (Test-Path $sdkmanager) {
    Write-Host ""
    Write-Host "SUCCESS! sdkmanager found at: $sdkmanager" -ForegroundColor Green
    Write-Host ""
    
    # Now install required SDK components
    Write-Host "=== Installing SDK Components ===" -ForegroundColor Cyan
    Write-Host ""
    
    $env:ANDROID_HOME = $sdkRoot
    
    Write-Host "Installing platform-tools..." -ForegroundColor Yellow
    & $sdkmanager "platform-tools" --sdk_root=$sdkRoot
    
    Write-Host "Installing build-tools..." -ForegroundColor Yellow
    & $sdkmanager "build-tools;34.0.0" --sdk_root=$sdkRoot
    
    Write-Host "Installing latest Android platform..." -ForegroundColor Yellow
    & $sdkmanager "platforms;android-34" --sdk_root=$sdkRoot
    
    Write-Host ""
    Write-Host "=== SDK Components Installed ===" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host "ERROR: sdkmanager.bat not found at expected location" -ForegroundColor Red
    exit 1
}

Write-Host "Setup complete! Run 'flutter doctor --android-licenses' next." -ForegroundColor Green
