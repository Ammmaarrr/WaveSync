# WaveSync Test Script - Windows PowerShell

Write-Host "🎵 WaveSync Setup & Test Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path "server\.env")) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host ""
    Write-Host "❌ Please edit server\.env and add your Spotify Client ID:" -ForegroundColor Red
    Write-Host "   1. Go to https://developer.spotify.com/dashboard" -ForegroundColor White
    Write-Host "   2. Create/select an app" -ForegroundColor White
    Write-Host "   3. Copy the Client ID" -ForegroundColor White
    Write-Host "   4. Add redirect URIs:" -ForegroundColor White
    Write-Host "      - http://localhost:5173/callback" -ForegroundColor White
    Write-Host "      - wavesync://auth" -ForegroundColor White
    Write-Host "   5. Paste Client ID into server\.env" -ForegroundColor White
    Write-Host ""
    notepad "server\.env"
    exit 1
}

# Verify client ID is configured
$envContent = Get-Content "server\.env" -Raw
if ($envContent -match "your_spotify_client_id_here") {
    Write-Host "❌ Spotify Client ID not configured in server\.env" -ForegroundColor Red
    Write-Host "   Please replace 'your_spotify_client_id_here' with actual ID" -ForegroundColor Yellow
    notepad "server\.env"
    exit 1
}

Write-Host "✅ Configuration looks good!" -ForegroundColor Green
Write-Host ""

# Check what we can test
Write-Host "📊 Testing Options:" -ForegroundColor Cyan
Write-Host ""

# Check if Android SDK available
$flutterDoctor = flutter doctor 2>&1 | Out-String
if ($flutterDoctor -match "Android toolchain.*\[X\]") {
    Write-Host "🌐 WEB CLIENT: ✅ Ready to test" -ForegroundColor Green
    Write-Host "📱 ANDROID:    ⏳ SDK not installed (optional)" -ForegroundColor Yellow
    $testWeb = $true
    $testAndroid = $false
} else {
    Write-Host "🌐 WEB CLIENT: ✅ Ready to test" -ForegroundColor Green
    Write-Host "📱 ANDROID:    ✅ Ready to test" -ForegroundColor Green
    $testWeb = $true
    $testAndroid = $true
}

Write-Host ""
Write-Host "Which would you like to test?" -ForegroundColor Cyan
Write-Host "  1) Web Client (browser)" -ForegroundColor White
if ($testAndroid) {
    Write-Host "  2) Android App (requires device)" -ForegroundColor White
    Write-Host "  3) Both" -ForegroundColor White
}
Write-Host "  Q) Quit" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice"

function Start-Server {
    Write-Host ""
    Write-Host "🚀 Starting server on port 4000..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm start"
    Start-Sleep -Seconds 3
    
    # Verify server started
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/server-time" -UseBasicParsing -TimeoutSec 2
        Write-Host "✅ Server running at http://localhost:4000" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "⚠️  Server may be starting... check the server terminal" -ForegroundColor Yellow
        return $false
    }
}

function Start-WebClient {
    Write-Host ""
    Write-Host "🌐 Starting web client on port 5173..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\web-client'; npm run dev"
    Start-Sleep -Seconds 3
    
    Write-Host "✅ Web client should be at http://localhost:5173" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Test Steps:" -ForegroundColor Cyan
    Write-Host "   1. Click 'PKCE Sign-In' button" -ForegroundColor White
    Write-Host "   2. Authorize on Spotify" -ForegroundColor White
    Write-Host "   3. Click 'Init Spotify Player'" -ForegroundColor White
    Write-Host "   4. Click 'Transfer Playback'" -ForegroundColor White
    Write-Host "   5. Test multi-device sync!" -ForegroundColor White
    Write-Host ""
    
    # Open browser
    Start-Process "http://localhost:5173"
}

function Start-AndroidApp {
    Write-Host ""
    Write-Host "📱 Starting Android app..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  Make sure:" -ForegroundColor Yellow
    Write-Host "   - Android device connected via USB" -ForegroundColor White
    Write-Host "   - USB debugging enabled" -ForegroundColor White
    Write-Host "   - Spotify app installed and logged in" -ForegroundColor White
    Write-Host ""
    
    $devices = flutter devices 2>&1 | Out-String
    if ($devices -match "android") {
        Write-Host "✅ Android device detected" -ForegroundColor Green
        Write-Host ""
        Read-Host "Press Enter to deploy app to device"
        
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; flutter run"
    } else {
        Write-Host "❌ No Android device detected" -ForegroundColor Red
        Write-Host "   Run: flutter devices" -ForegroundColor Yellow
        Write-Host ""
    }
}

switch ($choice) {
    "1" {
        Start-Server
        Start-WebClient
    }
    "2" {
        if ($testAndroid) {
            Start-Server
            Start-AndroidApp
        } else {
            Write-Host "❌ Android SDK not available. Please test web client instead." -ForegroundColor Red
        }
    }
    "3" {
        if ($testAndroid) {
            Start-Server
            Start-WebClient
            Start-Sleep -Seconds 2
            Start-AndroidApp
        } else {
            Write-Host "❌ Android SDK not available. Starting web client only..." -ForegroundColor Red
            Start-Server
            Start-WebClient
        }
    }
    "Q" {
        Write-Host "Goodbye! 👋" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Setup complete! Check the terminal windows." -ForegroundColor Green
Write-Host ""
Write-Host "📚 Docs:" -ForegroundColor Cyan
Write-Host "   - Quick Start: QUICKSTART_IMPLEMENTATION.md" -ForegroundColor White
Write-Host "   - Android Setup: docs/ANDROID_TROUBLESHOOTING.md" -ForegroundColor White
Write-Host "   - Native SDK: docs/NATIVE_SDK_INTEGRATION.md" -ForegroundColor White
Write-Host ""
