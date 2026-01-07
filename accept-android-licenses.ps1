# Accept Android SDK Licenses Script
# Automatically accepts all Android SDK licenses

$ErrorActionPreference = "Stop"

Write-Host "=== Accepting Android SDK Licenses ===" -ForegroundColor Cyan
Write-Host ""

$sdkRoot = "C:\Users\PC\AppData\Local\Android\Sdk"
$env:ANDROID_HOME = $sdkRoot

# Run flutter doctor --android-licenses with 'y' piped to accept all
Write-Host "Accepting all licenses..." -ForegroundColor Yellow
Write-Host ""

$yesResponses = "y`ny`ny`ny`ny`ny`ny`ny`ny`ny`n"
$yesResponses | flutter doctor --android-licenses

Write-Host ""
Write-Host "=== Licenses Accepted ===" -ForegroundColor Green
Write-Host ""
Write-Host "Running flutter doctor to verify..." -ForegroundColor Yellow
Write-Host ""

flutter doctor -v

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
