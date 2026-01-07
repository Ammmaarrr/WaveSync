# ✅ Android SDK Installation Checklist

**Status:** In Progress  
**Date:** October 12, 2025

---

## 📋 Installation Steps

### Step 1: Download Android Studio
- [ ] Open https://developer.android.com/studio in browser
- [ ] Click "Download Android Studio" button
- [ ] Accept terms and conditions
- [ ] Save installer file (~1GB)
- [ ] Wait for download to complete

**File location:** `C:\Users\PC\Downloads\android-studio-*-windows.exe`

---

### Step 2: Run Installer
- [ ] Double-click the installer
- [ ] Click "Next" on Welcome screen
- [ ] Keep all components checked (Android Studio + Android Virtual Device)
- [ ] Click "Next"
- [ ] Accept default install location
- [ ] Click "Install"
- [ ] Wait 5-10 minutes
- [ ] Click "Finish"

**Install location:** `C:\Program Files\Android\Android Studio`

---

### Step 3: Android Studio Setup Wizard
- [ ] Select "Do not import settings"
- [ ] Choose data sharing preference
- [ ] Select "Standard" setup type
- [ ] Choose UI theme (Light or Darcula)
- [ ] Verify settings and click "Next"
- [ ] **Accept ALL licenses** (required!)
- [ ] Click "Finish"
- [ ] Wait for SDK download (10-20 minutes, ~1-2GB)
- [ ] Click "Finish" when complete

**SDK location:** `C:\Users\PC\AppData\Local\Android\Sdk`

▶ If components are missing (like cmdline-tools), open Android Studio → Settings/Preferences → Appearance & Behavior → System Settings → Android SDK:

- [ ] SDK Platforms tab: install the latest Android API (e.g., Android 35 or 36)
- [ ] SDK Tools tab: check and install
	- [ ] Android SDK Command-line Tools (latest)
	- [ ] Android SDK Platform-Tools
	- [ ] Android SDK Build-Tools (latest)
	- [ ] Google USB Driver (on Windows)

After installing, re-run the verification in Step 4.

---

### Step 4: Verify Installation
```powershell
# Close and reopen PowerShell
cd d:\WaveSync\client
flutter doctor -v
```

- [ ] Android toolchain shows ✓ (green checkmark)
- [ ] Android SDK path is listed
- [ ] No errors shown

---

### Step 5: Accept Licenses (If Needed)
```powershell
flutter doctor --android-licenses
```

- [ ] Press 'y' for each license
- [ ] All licenses accepted
- [ ] Run `flutter doctor` again - should be all green!

---

### Step 6: Connect Physical Device

**⚠️ Required: Spotify App Remote needs real device, not emulator**

#### On Your Phone:
- [ ] Go to Settings → About Phone
- [ ] Tap "Build Number" 7 times
- [ ] See "You are now a developer!" message
- [ ] Go to Settings → System → Developer Options
- [ ] Enable "USB debugging"
- [ ] Enable "Install via USB" (if available)

#### Connect to PC:
- [ ] Connect phone via USB cable
- [ ] Allow USB debugging popup on phone
- [ ] Check "Always allow from this computer"
- [ ] Tap "OK"

#### Verify Connection:
```powershell
flutter devices
```

- [ ] Your Android device is listed
- [ ] Shows model name and Android version

---

### Step 7: Install Spotify on Device
- [ ] Open Google Play Store on phone
- [ ] Search for "Spotify"
- [ ] Install Spotify app
- [ ] Open Spotify and log in with Premium account
- [ ] Keep app running in background

---

### Step 8: Deploy WaveSync to Device
```powershell
cd d:\WaveSync\client
flutter run
```

- [ ] First build starts (takes 5-10 minutes)
- [ ] No Gradle errors
- [ ] App installs on device
- [ ] App launches successfully
- [ ] Can see WaveSync app on device

---

### Step 9: Test Authentication

#### Make sure server is running:
```powershell
# In another terminal
cd d:\WaveSync\server
npm start
```

- [ ] Server running on port 4000
- [ ] Can access http://localhost:4000/server-time

#### Update server IP in app:
- You'll need to use your PC's local IP (not localhost)
- [ ] Find your IP: Run `ipconfig` and look for IPv4 Address
- [ ] Update Flutter code to use `http://YOUR_IP:4000`

#### Test flow:
- [ ] Click sign-in button in app
- [ ] Redirects to Spotify
- [ ] Authorize the app
- [ ] Redirects back to wavesync://auth
- [ ] Tokens received successfully
- [ ] SpotifyBridge.authenticate() called
- [ ] Check logcat: `adb logcat | findstr "WaveSyncSpotify"`
- [ ] See "Spotify App Remote connected" in logs

---

### Step 10: Test Playback

- [ ] Load a track
- [ ] Play/pause works
- [ ] Seek works
- [ ] Position tracking accurate
- [ ] Audio plays from Spotify app

---

## 🎯 Success Criteria

All checkboxes above completed = ✅ **Ready for production mobile testing!**

---

## ⏱️ Time Estimates

| Step | Time |
|------|------|
| Download Android Studio | 5-10 min |
| Install Android Studio | 5-10 min |
| Setup Wizard + SDK Download | 10-20 min |
| Verify & Accept Licenses | 2-5 min |
| Connect Device | 5 min |
| First Build & Deploy | 5-10 min |
| Test Authentication | 5 min |
| **Total** | **30-60 min** |

---

## 🐛 Stuck? Quick Fixes

### "Unable to locate Android SDK"
- Close and reopen PowerShell
- Run `flutter doctor -v` again

### "No devices found"
- Check USB cable
- Check USB debugging is enabled
- Try `adb devices` to see if phone is recognized

### "Gradle build failed"
```powershell
cd android
.\gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

### "Spotify connection failed"
- Make sure Spotify app is open and logged in
- Force close WaveSync app and restart
- Check logcat for errors

---

## 📚 Full Documentation

- **Detailed Guide:** `ANDROID_SDK_SETUP_GUIDE.md`
- **Troubleshooting:** `docs/ANDROID_TROUBLESHOOTING.md`
- **Integration Docs:** `docs/NATIVE_SDK_INTEGRATION.md`

---

## 💡 Current Step

**YOU ARE HERE:** Step 1 - Download Android Studio

👉 **Next:** Click the big green "Download" button in the browser window that just opened!

---

**Save this file and check off items as you complete them!**
