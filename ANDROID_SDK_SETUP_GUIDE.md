# 📱 Android SDK Setup Guide for WaveSync

**Current Status:** Android SDK not installed  
**Goal:** Install Android Studio and SDK to enable mobile testing

---

## 🎯 Quick Overview

You need to install **Android Studio** which includes:
- Android SDK (required for Flutter)
- Android SDK Platform Tools
- Android SDK Build Tools
- Android Emulator (optional, WaveSync needs real device)

**Time Required:** 20-30 minutes (depending on download speed)  
**Disk Space:** ~4-5 GB

---

## 📥 Step 1: Download Android Studio

### Option A: Download via Browser (Recommended)

1. **Open this URL in your browser:**
   ```
   https://developer.android.com/studio
   ```

2. **Click the big green "Download Android Studio" button**

3. **Accept the terms and conditions**

4. **Save the installer** (filename: `android-studio-*-windows.exe`, ~1GB)

### Option B: Download via PowerShell

```powershell
# Create downloads folder if needed
$downloadPath = "$env:USERPROFILE\Downloads\android-studio-installer.exe"

# Note: Direct download URL changes frequently
# Better to use browser download from https://developer.android.com/studio
Write-Host "Please download from: https://developer.android.com/studio"
```

---

## 🔧 Step 2: Install Android Studio

1. **Run the downloaded installer** (`android-studio-*-windows.exe`)

2. **Installation wizard steps:**
   - Click "Next" on Welcome screen
   - ✅ **Keep all components checked:**
     - Android Studio
     - Android Virtual Device
   - Click "Next"
   - Choose install location (default is fine: `C:\Program Files\Android\Android Studio`)
   - Click "Install"
   - Wait 5-10 minutes for installation...
   - Click "Finish"

3. **Android Studio Setup Wizard will launch**

---

## ⚙️ Step 3: Android Studio Initial Setup

1. **Import Settings:**
   - Select "Do not import settings"
   - Click "OK"

2. **Data Sharing:**
   - Choose your preference (either option is fine)
   - Click "Next"

3. **Setup Type:**
   - ✅ **Select "Standard"** (recommended)
   - Click "Next"

4. **UI Theme:**
   - Choose "Light" or "Darcula" (your preference)
   - Click "Next"

5. **Verify Settings:**
   - Should show it will download:
     - Android SDK
     - Android SDK Platform
     - Performance (Intel HAXM - optional)
     - Android Virtual Device
   - Total download: ~1-2 GB
   - Click "Next"

6. **License Agreement:**
   - ✅ **Accept all licenses** (required)
   - Click "Finish"

7. **Downloading Components:**
   - Wait for SDK components to download and install
   - This takes 10-20 minutes depending on internet speed
   - ☕ Good time for a coffee break!

8. **Finish:**
   - Click "Finish" when complete

---

## ✅ Step 4: Verify Android SDK Installation

### Open PowerShell and run:

```powershell
# Navigate to WaveSync project
cd d:\WaveSync\client

# Check Flutter doctor again
flutter doctor -v
```

### Expected Output:

You should now see:
```
[√] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
    • Android SDK at C:\Users\<YourUser>\AppData\Local\Android\Sdk
    • Platform android-34, build-tools 34.0.0
    • Java binary at: C:\Program Files\Android\Android Studio\jbr\bin\java
    • Java version OpenJDK Runtime Environment
    • All Android licenses accepted
```

---

## 📜 Step 5: Accept Android Licenses

If `flutter doctor` shows license issues:

```powershell
flutter doctor --android-licenses
```

**Press `y` for each license prompt** (there will be 5-7 licenses)

---

## 🔌 Step 6: Connect Android Device (Required for WaveSync)

**⚠️ Important:** Spotify App Remote requires a **physical device** - emulators won't work!

### Enable USB Debugging on Your Android Phone:

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" **7 times**
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to Settings → System → Developer Options
   - Toggle "USB debugging" **ON**
   - Toggle "Install via USB" **ON** (if available)

3. **Connect Phone to PC:**
   - Use USB cable
   - On phone, tap "Allow USB debugging" when prompted
   - Check "Always allow from this computer"
   - Tap "OK"

4. **Verify Device Connected:**
   ```powershell
   flutter devices
   ```

   Expected output:
   ```
   2 connected devices:

   Android Device (mobile) • <serial> • android-arm64 • Android 13 (API 33)
   Chrome (web)           • chrome  • web-javascript • Google Chrome
   ```

---

## 📱 Step 7: Install Spotify on Your Device

**Required:** Spotify Premium account + Spotify app

1. **Install Spotify app from Google Play Store**
2. **Log in with your Premium account**
3. **Keep app running in background** (don't force close)

---

## 🚀 Step 8: Test WaveSync on Android

```powershell
cd d:\WaveSync\client

# Build and deploy to device
flutter run
```

### What to Expect:

1. **First build takes 5-10 minutes** (Gradle downloads dependencies)
2. **Subsequent builds: 30-60 seconds**
3. **App installs on your device automatically**
4. **Flutter hot reload works** (instant updates during development)

### Watch for Logs:

```powershell
# In another terminal, monitor Android logs:
adb logcat | findstr "WaveSyncSpotify"
```

Expected logs when authenticating:
```
D/WaveSyncSpotify: Spotify App Remote connected
D/WaveSyncSpotify: Track loaded: spotify:track:...
D/WaveSyncSpotify: Track paused, ready for sync start
```

---

## 🐛 Common Issues & Solutions

### Issue: "Unable to locate Android SDK"

**After installing Android Studio, restart your terminal:**
```powershell
# Close current PowerShell window
# Open new PowerShell
cd d:\WaveSync\client
flutter doctor -v
```

If still not found:
```powershell
# Manually set SDK path
flutter config --android-sdk "C:\Users\<YourUsername>\AppData\Local\Android\Sdk"
```

### Issue: "No connected devices"

**Check USB connection:**
```powershell
adb devices
```

Should show:
```
List of devices attached
<serial>    device
```

If shows "unauthorized":
- Check phone screen for USB debugging prompt
- Tap "Allow" and check "Always allow"

If shows nothing:
- Try different USB cable
- Try different USB port
- Install phone manufacturer's USB drivers

### Issue: "Gradle build failed"

**Solution 1 - Clean and rebuild:**
```powershell
cd d:\WaveSync\client\android
.\gradlew clean

cd ..
flutter clean
flutter pub get
flutter run
```

**Solution 2 - Increase Gradle memory:**

Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

### Issue: "Spotify app not found"

**Verify Spotify installed:**
- Open Spotify app on device
- Log in
- Play any song
- Keep app running
- Try WaveSync authentication again

### Issue: "Connection failed" in SpotifyBridge

**Troubleshooting:**
1. Check Spotify app is logged in
2. Force stop WaveSync app and restart
3. Check logcat for detailed errors:
   ```powershell
   adb logcat *:E | findstr "Spotify"
   ```

---

## 📊 Verify Everything Works

### Checklist:

- [ ] Android Studio installed
- [ ] `flutter doctor` shows Android toolchain with ✓
- [ ] All licenses accepted
- [ ] Physical device connected
- [ ] USB debugging enabled
- [ ] `flutter devices` shows your Android device
- [ ] Spotify app installed and logged in
- [ ] WaveSync app builds successfully
- [ ] App installs on device
- [ ] Can see app icon on device

---

## 🎯 Next Steps After Installation

### 1. Test Authentication Flow

Update your Flutter test code with your Spotify Client ID:

```dart
// In lib/main.dart
final authManager = SpotifyAuthManager();
final tokens = await authManager.signIn(
  clientId: 'YOUR_SPOTIFY_CLIENT_ID',
  redirectUri: 'wavesync://auth',
  scopes: [
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ],
  serverBase: 'http://YOUR_SERVER_IP:4000',
);

if (tokens != null) {
  final bridge = SpotifyBridge();
  await bridge.authenticateWithToken(
    clientId: 'YOUR_SPOTIFY_CLIENT_ID',
    accessToken: tokens.accessToken,
  );
  
  print('✅ Connected to Spotify App Remote!');
}
```

### 2. Test Playback Control

```dart
// Load a track
await bridge.loadTrack('spotify:track:3n3Ppam7vgaVa1iaRUc9Lp');

// Seek to position
await bridge.seek(5000); // 5 seconds

// Play
await bridge.play();

// Get position
final position = await bridge.getPosition();
print('Position: ${position['positionMs']}ms');
```

### 3. Test Multi-Device Sync

- Connect both web client and Android app
- Run clock sync on both
- Start synchronized playback
- Monitor drift < 50ms

---

## 📚 Additional Resources

- **Flutter Android Setup:** https://docs.flutter.dev/get-started/install/windows/mobile
- **Android Studio Guide:** https://developer.android.com/studio/intro
- **USB Debugging:** https://developer.android.com/studio/debug/dev-options
- **ADB Commands:** https://developer.android.com/studio/command-line/adb

---

## 🆘 Still Having Issues?

### Check our docs:
- `docs/ANDROID_TROUBLESHOOTING.md` - General Android help
- `docs/NATIVE_SDK_INTEGRATION.md` - SDK integration details
- `client/native/android/SETUP.md` - Android-specific config

### Common paths to check:

**Android SDK Location:**
```
C:\Users\<YourUser>\AppData\Local\Android\Sdk
```

**Android Studio:**
```
C:\Program Files\Android\Android Studio
```

**Flutter:**
```
D:\flutter
```

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ `flutter doctor` shows all green checks for Android
2. ✅ `flutter devices` lists your phone
3. ✅ `flutter run` deploys app to device
4. ✅ WaveSync app opens on your phone
5. ✅ PKCE authentication redirects work
6. ✅ Spotify App Remote connects
7. ✅ Playback control works
8. ✅ Multi-device sync achieves <50ms drift

---

**Estimated Total Time:** 30-45 minutes  
**Once complete:** Ready for production mobile testing! 🎉
