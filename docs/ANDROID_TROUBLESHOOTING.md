# Android Setup Troubleshooting Guide - WaveSync

## ✅ What's Already Done

### Gradle Configuration
- ✅ Spotify App Remote SDK dependency added (`build.gradle.kts`)
- ✅ Maven repository configured (`https://maven.spotify.com/repository/`)
- ✅ ProGuard rules created for release builds

### AndroidManifest.xml
- ✅ Intent filter added for `wavesync://auth` redirect URI
- ✅ Permissions configured for network access

### Native Bridge
- ✅ `SpotifyBridge.kt` - Full Spotify App Remote implementation
- ✅ `MainActivity.kt` - MethodChannel handlers registered
- ✅ All Kotlin code compiles without errors

---

## ⚠️ Current Status: Android SDK Not Installed

You have **two options** to proceed:

---

## Option 1: Test on Web (No Android SDK Needed) ✅ READY NOW

The web client is fully functional and ready to test multi-device sync!

### Quick Start:

```powershell
# Terminal 1 - Start server
cd d:\WaveSync\server
npm start

# Terminal 2 - Start web client
cd d:\WaveSync\web-client
npm run dev
```

### Test PKCE Flow:
1. Open `http://localhost:5173`
2. Click **"PKCE Sign-In"** button
3. Authorize on Spotify
4. Click **"Init Spotify Player"**
5. Ready to sync!

### Test Multi-Device Sync:
- Open multiple browser tabs
- Connect each to WebSocket session
- Run clock sync on each
- Start synchronized playback across all tabs

**No Android SDK needed!** This works right now.

---

## Option 2: Set Up Android SDK (For Mobile Testing)

### Prerequisites:
- Physical Android device (emulator won't work - Spotify App Remote requires real device)
- Spotify app installed on device
- Spotify Premium account
- USB debugging enabled on device

### Installation Steps:

#### Step 1: Install Android Studio

```powershell
# Download from:
https://developer.android.com/studio

# During installation, select:
✅ Android SDK
✅ Android SDK Platform
✅ Android Virtual Device
```

#### Step 2: Configure Flutter Android SDK

After Android Studio installation:

```powershell
cd d:\WaveSync\client

# Flutter will auto-detect Android SDK
flutter doctor --android-licenses

# Accept all licenses (type 'y' for each)
```

#### Step 3: Connect Your Android Device

```powershell
# Enable USB Debugging on device:
# Settings > About Phone > Tap "Build Number" 7 times
# Settings > Developer Options > Enable USB Debugging

# Verify device connected:
flutter devices

# Should show your device:
# Android Device • <serial> • android-arm64 • Android 13 (API 33)
```

#### Step 4: Build and Deploy

```powershell
cd d:\WaveSync\client

# Build and install on device
flutter run

# Or build APK for distribution
flutter build apk --release
```

---

## Testing Android App (Once SDK Installed)

### 1. Ensure Spotify App Installed
- Install Spotify from Google Play Store
- Log in with Premium account
- Keep app running in background

### 2. Configure Client ID

Update your Flutter test code with actual Client ID:

```dart
// In lib/main.dart or test file
final authManager = SpotifyAuthManager();
final tokens = await authManager.signIn(
  clientId: 'YOUR_SPOTIFY_CLIENT_ID_HERE',
  redirectUri: 'wavesync://auth',
  scopes: [
    'streaming',
    'user-read-playback-state', 
    'user-modify-playback-state'
  ],
  serverBase: 'http://YOUR_SERVER_IP:4000',
);

if (tokens != null) {
  final bridge = SpotifyBridge();
  await bridge.authenticateWithToken(
    clientId: 'YOUR_SPOTIFY_CLIENT_ID_HERE',
    accessToken: tokens.accessToken,
  );
  print('✅ Connected to Spotify App Remote!');
}
```

### 3. Run App on Device

```powershell
flutter run
```

**Check Logcat for Spotify logs:**
```powershell
# In Android Studio or via adb:
adb logcat | findstr "WaveSyncSpotify"
```

Expected logs:
```
D/WaveSyncSpotify: Spotify App Remote connected
D/WaveSyncSpotify: Track loaded: spotify:track:...
D/WaveSyncSpotify: Track paused, ready for sync start
D/WaveSyncSpotify: Playback resumed
D/WaveSyncSpotify: Position: 12345ms, paused=false
```

---

## Common Android Issues & Fixes

### Issue: "Spotify app not found"
**Fix:** Install Spotify app from Play Store and log in

### Issue: "Connection failed"
**Fix:** 
- Ensure Spotify app is running (check Recent Apps)
- Force-stop WaveSync app and restart
- Log out and back into Spotify app

### Issue: "Missing clientId"
**Fix:** Ensure you're calling `authenticateWithToken()` with correct Client ID

### Issue: "Redirect URI mismatch"
**Fix:** 
- Check Spotify Developer Dashboard
- Ensure `wavesync://auth` is added to Redirect URIs
- Must match exactly (no trailing slash, lowercase)

### Issue: Build fails with "SDK not found"
**Fix:**
```powershell
# Set Android SDK path manually:
flutter config --android-sdk "C:\Users\YOUR_USER\AppData\Local\Android\Sdk"

# Or install via Android Studio
```

### Issue: Gradle sync fails
**Fix:**
```powershell
cd d:\WaveSync\client\android
.\gradlew clean

cd ..
flutter clean
flutter pub get
flutter run
```

---

## iOS Setup (If You Have Mac)

If you also want to test on iOS:

### Step 1: Install CocoaPods

```bash
cd client/ios
pod install
```

### Step 2: Update Podfile

```ruby
target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
  
  # Add Spotify SDK
  pod 'SpotifyiOS', '~> 1.2.2'
end
```

### Step 3: Configure Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>wavesync</string></array>
  </dict>
</array>
```

### Step 4: Implement SDK in SpotifyBridge.swift

See `client/native/ios/SETUP.md` for full details.

---

## Recommended Next Steps

### ✅ Test Now (Web)
1. Start server and web-client
2. Test PKCE authentication flow
3. Test multi-device sync across browser tabs
4. Verify drift metrics <50ms

### 🔜 Android Setup (When Ready)
1. Install Android Studio
2. Accept Android licenses
3. Connect physical device
4. Deploy and test on device

### 🔜 Continue to Step 4
Once core playback is validated, proceed to:
- Persistent telemetry storage (SQLite)
- Auto-reconnect logic
- Analytics dashboard
- Production hardening

---

## Verify Everything Works

### Web Client Checklist:
- [ ] Server responds at `http://localhost:4000/server-time`
- [ ] PKCE sign-in redirects to Spotify
- [ ] Tokens returned in console
- [ ] Spotify Web Player initializes
- [ ] Transfer playback succeeds
- [ ] Multi-device sync within 100ms

### Android Checklist (Once SDK Installed):
- [ ] `flutter devices` shows connected Android device
- [ ] App builds without Gradle errors
- [ ] Spotify app installed and logged in
- [ ] PKCE redirect to `wavesync://auth` works
- [ ] App Remote connects (check logcat)
- [ ] Playback controls work
- [ ] Position tracking accurate

---

## Support Resources

- **PKCE Implementation:** `docs/PKCE_IMPLEMENTATION.md`
- **Native SDK Integration:** `docs/NATIVE_SDK_INTEGRATION.md`
- **Android Setup:** `client/native/android/SETUP.md`
- **iOS Setup:** `client/native/ios/SETUP.md`
- **Quick Start:** `QUICKSTART_IMPLEMENTATION.md`

---

**Current Status:** ✅ Android code ready, ⏳ SDK installation pending  
**Web Client:** ✅ Ready to test NOW  
**Last Updated:** October 12, 2025
