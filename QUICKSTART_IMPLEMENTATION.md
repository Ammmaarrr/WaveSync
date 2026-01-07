# WaveSync Quick Start Guide - Steps 1-3

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ and npm
- Flutter SDK 3.3+
- Spotify Developer account
- Spotify Premium subscription
- Android/iOS device with Spotify app installed

---

## 1. Clone & Install Dependencies

```bash
# Server
cd server
npm install

# Web Client
cd ../web-client
npm install

# Flutter Client
cd ../client
flutter pub get
```

---

## 2. Configure Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app or use existing
3. Add Redirect URIs:
   - `http://localhost:5173/callback` (web client)
   - `wavesync://auth` (Flutter mobile)
4. Copy your **Client ID**

---

## 3. Configure Server

Create `server/.env`:

```bash
PORT=4000
SPOTIFY_CLIENT_ID=paste_your_client_id_here
SPOTIFY_REDIRECT_URI_WEB=http://localhost:5173/callback
```

---

## 4. Start Server

```bash
cd server
npm run build
npm start
```

Server runs at `http://localhost:4000`

---

## 5. Test Web Client PKCE Flow

```bash
cd web-client
npm run dev
```

Open `http://localhost:5173`:

1. Click **"PKCE Sign-In"** button
2. Authorize on Spotify
3. Redirected back with tokens
4. Click **"Init Spotify Player"**
5. Click **"Transfer Playback"**
6. Ready to sync!

---

## 6. Configure Android

### Add Gradle Dependency

Edit `client/android/app/build.gradle`:

```gradle
dependencies {
    implementation 'com.spotify.android:app-remote:0.8.0'
}
```

### Add Maven Repository

Edit `client/android/build.gradle`:

```gradle
allprojects {
    repositories {
        maven { url 'https://maven.spotify.com/repository/' }
    }
}
```

### Update AndroidManifest.xml

Edit `client/android/app/src/main/AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity">
    <!-- Add this intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="wavesync" android:host="auth" />
    </intent-filter>
</activity>
```

---

## 7. Run Flutter App (Android)

```bash
cd client
flutter run
```

### Test Authentication:

```dart
// In your Flutter app, add a button:
ElevatedButton(
  onPressed: () async {
    final authManager = SpotifyAuthManager();
    final tokens = await authManager.signIn(
      clientId: 'YOUR_CLIENT_ID',
      redirectUri: 'wavesync://auth',
      scopes: ['streaming', 'user-read-playback-state', 'user-modify-playback-state'],
      serverBase: 'http://YOUR_SERVER_IP:4000',
    );
    
    if (tokens != null) {
      final bridge = SpotifyBridge();
      await bridge.authenticateWithToken(
        clientId: 'YOUR_CLIENT_ID',
        accessToken: tokens.accessToken,
      );
      print('Connected to Spotify!');
    }
  },
  child: Text('Sign in with Spotify'),
)
```

---

## 8. Test Multi-Device Sync

### On Host Device:

1. Connect to server WebSocket
2. Run clock sync (10 pings)
3. Enter track URI: `spotify:track:3n3Ppam7vgaVa1iaRUc9Lp`
4. Click **"Start in 3s"**

### On Client Devices:

1. Connect to same session
2. Run clock sync
3. Wait for start command
4. All devices play in sync!

---

## 9. iOS Setup (Optional)

### Install CocoaPods

```bash
cd client/ios
pod install
```

### Add to Podfile:

```ruby
pod 'SpotifyiOS', '~> 1.2.2'
```

### Update Info.plist:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>wavesync</string></array>
  </dict>
</array>
```

### Uncomment SDK Calls

Edit `client/native/ios/SpotifyBridge.swift` and replace TODOs with actual SDK calls.

---

## 🧪 Verify Everything Works

### ✅ Server
- `curl http://localhost:4000/server-time` returns `{"serverTime": ...}`
- Logs show "Server listening on port 4000"

### ✅ Web Client
- PKCE sign-in redirects to Spotify
- After approval, tokens appear in console
- Spotify Web Player initializes
- Transfer playback succeeds

### ✅ Android
- App builds without Gradle errors
- PKCE redirect to wavesync://auth works
- Spotify App Remote connects
- Playback controls work

### ✅ Sync Test
- Clock sync reports offset ±50ms
- Multiple devices start within 100ms
- Drift stays <50ms over 5 minutes

---

## 🐛 Common Issues

### "Client ID not configured"
**Fix:** Check `server/.env` has `SPOTIFY_CLIENT_ID=...`

### "Redirect URI mismatch"
**Fix:** Ensure Spotify Dashboard redirect URIs match exactly

### "Spotify app not installed"
**Fix:** Install Spotify app on Android/iOS device

### "Connection failed"
**Fix:** Ensure Spotify app is open and logged in

### "Token expired"
**Fix:** Tokens auto-refresh; if not, call `authManager.refreshTokens()`

---

## 📊 Monitor Sync Quality

### View Drift Telemetry

Check Flutter console logs:
```
telemetry drift=12ms ts=1697...
telemetry drift=-8ms ts=1697...
telemetry drift=3ms ts=1697...
```

### Export to CSV (Optional)

```bash
cd tools
node flutter_logs_to_csv.mjs ../logs/session1.txt
node summarize_csv.mjs ../logs/session1.csv
```

---

## 📚 Next Steps

- **Step 4:** Add persistent telemetry storage
- **Step 5:** Implement auto-reconnect logic
- **Step 6:** Build analytics dashboard
- **Step 7:** Production hardening

See `docs/IMPLEMENTATION_SUMMARY.md` for detailed roadmap.

---

## 🆘 Need Help?

- **PKCE Auth:** See `docs/PKCE_IMPLEMENTATION.md`
- **Native SDK:** See `docs/NATIVE_SDK_INTEGRATION.md`
- **Android:** See `client/native/android/SETUP.md`
- **iOS:** See `client/native/ios/SETUP.md`

---

**Status:** ✅ Ready for Testing  
**Last Updated:** October 12, 2025
