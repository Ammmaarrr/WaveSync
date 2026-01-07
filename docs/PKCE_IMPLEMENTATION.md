# WaveSync PKCE Token Implementation - Step 2 Complete

## Overview
Successfully implemented PKCE-based Spotify authentication flow for WaveSync, enabling secure token management across Flutter mobile/web clients and TypeScript web client without exposing client secrets.

## Completed Work

### 1. Server-Side Token Service (✅ Step 1 - Previously Completed)
**File:** `server/src/server.ts`

#### New Endpoints:
- **POST `/spotify/exchange`** - Exchange authorization code for access/refresh tokens
  - Input: `{ code, codeVerifier, redirectUri }`
  - Returns: `{ access_token, refresh_token, expires_in, scope, token_type, received_at }`
  
- **POST `/spotify/refresh`** - Refresh expired access token
  - Input: `{ refreshToken }`
  - Returns: `{ access_token, expires_in, scope, token_type, received_at }`

#### Environment Variables:
- `SPOTIFY_CLIENT_ID` - Your Spotify app client ID
- `SPOTIFY_REDIRECT_URI_WEB` - Redirect URI for web client (e.g., `http://localhost:5173/callback`)

#### Documentation Updated:
- `server/.env.example` - Added Spotify env vars
- `server/README.md` - Documented new endpoints and usage

---

### 2. Flutter Client PKCE Implementation (✅ Step 2 - Just Completed)

#### New File: `client/lib/spotify_auth.dart`
Comprehensive token management module with:

**Classes:**
- `SpotifyTokens` - Token data model with:
  - `accessToken`, `refreshToken`, `expiresAt`, `scope`, `tokenType`
  - `isExpired` getter
  - JSON serialization (`toJson`, `fromJson`)
  - `copyWith` for immutable updates

- `SpotifyAuthManager` - Main authentication manager:
  - Secure token storage via `flutter_secure_storage`
  - PKCE code verifier/challenge generation (SHA-256)
  - State parameter for CSRF protection
  - Custom scheme validation (rejects `http`/`https`)

**Methods:**
- `signIn()` - Complete PKCE flow:
  1. Generate code verifier (128 chars)
  2. Create SHA-256 challenge
  3. Generate random state
  4. Launch Spotify auth via `flutter_web_auth_2`
  5. Validate callback state
  6. Exchange code via server endpoint
  7. Store tokens securely

- `exchangeCode()` - Call server `/spotify/exchange`
- `refreshTokens()` - Auto-refresh via server `/spotify/refresh`
- `getValidTokens()` - Get tokens, auto-refreshing if expired
- `loadTokens()` / `saveTokens()` / `clearTokens()` - Storage operations

#### Dependencies Added to `client/pubspec.yaml`:
```yaml
crypto: ^3.0.3                      # SHA-256 for PKCE challenge
flutter_secure_storage: ^9.0.0     # Encrypted token storage
flutter_web_auth_2: ^3.0.0         # Native auth browser flow
http: ^1.2.2                       # (already present)
```

#### Integration Points:
- Import added to `client/lib/main.dart`
- Ready to wire into UI login flow
- Compatible with existing `SpotifyBridge` for playback control

---

### 3. Web Client Token Integration (✅ Step 2 - Just Completed)

**File:** `web-client/src/main.ts`

#### New Features:
**State Management:**
- `accessToken`, `refreshToken`, `tokenExpiresAt` - In-memory token state
- Auto-refresh before Web Playback SDK calls

**PKCE Functions:**
- `pkceSignIn()` - Browser-based PKCE flow:
  - Generates verifier/challenge using Web Crypto API
  - Redirects to Spotify `/authorize`
  - Stores PKCE params in `sessionStorage`
  
- `handleCallback()` - Process OAuth callback:
  - Validates state parameter
  - Calls server `/spotify/exchange`
  - Stores tokens in memory
  - Cleans URL

- `refreshTokensFromServer()` - Auto-refresh tokens:
  - Called by Spotify SDK `getOAuthToken` callback
  - Updates tokens silently

**Helper Functions:**
- `generateCodeVerifier()` - 128-char random string
- `generateCodeChallenge()` - SHA-256 hash via SubtleCrypto
- `generateRandomString()` - State parameter generator

#### Updated Functions:
- `initSpotify()` - Now supports auto-refresh in `getOAuthToken` callback
- `transferPlayback()` - Uses `accessToken` or manual token
- `scheduleStart()` - Uses `accessToken` or manual token

**UI Updates (`web-client/index.html`):**
- Added **"PKCE Sign-In"** button
- Updated token input placeholder to indicate PKCE option
- Reorganized buttons into two rows

**On-Load Behavior:**
- Automatically detects `?code=` in URL
- Calls `handleCallback()` if present
- Seamlessly completes auth flow

---

## Configuration Required

### Server Environment
Create `server/.env`:
```bash
PORT=4000
SPOTIFY_CLIENT_ID=your_actual_spotify_client_id_here
SPOTIFY_REDIRECT_URI_WEB=http://localhost:5173/callback
```

### Spotify Dashboard Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create/edit your app
3. Add redirect URIs:
   - Web: `http://localhost:5173/callback` (for development)
   - Flutter Android: `wavesync://auth` (custom scheme)
   - Flutter iOS: `wavesync://auth` (custom scheme)
4. Copy Client ID to `.env`

### Flutter Android (`client/native/android/AndroidManifest.xml`)
Add intent filter for custom scheme:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="wavesync" android:host="auth" />
</intent-filter>
```

### Flutter iOS (`client/ios/Info.plist`)
Add URL scheme:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>wavesync</string>
    </array>
  </dict>
</array>
```

---

## Usage Examples

### Web Client Flow
```typescript
// 1. User clicks "PKCE Sign-In"
// 2. Redirected to Spotify authorization
// 3. After approval, redirected to http://localhost:5173/callback?code=...
// 4. handleCallback() automatically exchanges code
// 5. Tokens stored in memory
// 6. Click "Init Spotify Player" - uses stored tokens
// 7. SDK auto-refreshes when needed
```

### Flutter Mobile Flow
```dart
final authManager = SpotifyAuthManager();

// Sign in with PKCE
try {
  final tokens = await authManager.signIn(
    clientId: 'your_client_id',
    redirectUri: 'wavesync://auth',
    scopes: ['streaming', 'user-read-playback-state', 'user-modify-playback-state'],
    serverBase: 'http://your-server:4000',
  );
  print('Access token: ${tokens.accessToken}');
} catch (e) {
  print('Sign-in failed: $e');
}

// Later, get valid tokens (auto-refreshes if expired)
final tokens = await authManager.getValidTokens(
  serverBase: 'http://your-server:4000',
  refreshIfNeeded: true,
);

// Use tokens with Spotify SDK or API calls
if (tokens != null) {
  // Pass tokens.accessToken to native bridge or API
}
```

---

## Security Highlights

✅ **PKCE Protection:** Code verifier prevents authorization code interception  
✅ **State Validation:** CSRF protection via random state parameter  
✅ **Secure Storage:** Flutter tokens encrypted via native keychains  
✅ **No Client Secret:** Server proxies token exchange, keeps secret secure  
✅ **Token Rotation:** Refresh tokens extend session without re-auth  
✅ **Expiry Buffer:** 30-second safety margin prevents token expiry mid-request  
✅ **Custom Scheme Enforcement:** Flutter validates redirect URI scheme  

---

## Testing Checklist

- [ ] Server token exchange endpoint returns valid tokens
- [ ] Server refresh endpoint returns fresh access token
- [ ] Web client PKCE flow completes successfully
- [ ] Web client auto-refreshes tokens before expiry
- [ ] Flutter client stores tokens securely (check native storage)
- [ ] Flutter client validates custom scheme
- [ ] Flutter client auto-refreshes on `getValidTokens()`
- [ ] Tokens persist across app restarts (Flutter)
- [ ] Invalid state parameter rejected
- [ ] Expired refresh token handled gracefully

---

## Next Steps (PRD Alignment)

### ✅ Completed:
1. **Step 1:** Server token endpoints (exchange, refresh)
2. **Step 2:** Client PKCE flows (Flutter + Web)

### 🔜 Remaining Steps:

**Step 3: Wire Native Spotify SDK (Android/iOS)**
- Update `client/native/android/src/.../SpotifyBridge.kt`
- Update `client/native/ios/SpotifyBridge.swift`
- Implement App Remote connection with access tokens
- Wire `authenticate()`, `loadTrack()`, `play()`, `getPosition()` methods

**Step 4: Persistent Telemetry Storage**
- Add SQLite or file-based storage for drift telemetry
- Implement rolling window (last 5 minutes)
- Expose telemetry query endpoint

**Step 5: Auto-Reconnect Logic**
- WebSocket reconnection with exponential backoff
- Resume session on network recovery
- Preserve sync state across reconnects

**Step 6: Analytics Dashboard**
- Aggregate drift metrics (median, p95, p99)
- Real-time client health display
- Historical trend visualization

**Step 7: Production Hardening**
- Error boundaries and graceful degradation
- Logging infrastructure
- Rate limiting on token endpoints
- Environment-specific configs

---

## File Summary

### Modified Files:
- `server/src/server.ts` - Added `/spotify/exchange` and `/spotify/refresh`
- `server/.env.example` - Added Spotify config vars
- `server/README.md` - Documented new endpoints
- `client/pubspec.yaml` - Added PKCE dependencies
- `client/lib/main.dart` - Imported `spotify_auth.dart`
- `web-client/src/main.ts` - Added PKCE flow and auto-refresh
- `web-client/index.html` - Added PKCE sign-in button

### New Files:
- `client/lib/spotify_auth.dart` - Complete PKCE token manager

### Build Status:
- ✅ Server TypeScript compiles (`npm run build`)
- ✅ Flutter dependencies installed (`flutter pub get`)
- ✅ Web client TypeScript compiles (no errors)
- ✅ All modified files pass lint checks

---

## Configuration Summary

| Component | Config File | Key Variables |
|-----------|-------------|---------------|
| Server | `server/.env` | `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI_WEB` |
| Flutter | `client/pubspec.yaml` | Dependencies: `crypto`, `flutter_secure_storage`, `flutter_web_auth_2` |
| Android | `AndroidManifest.xml` | Intent filter for `wavesync://auth` |
| iOS | `Info.plist` | URL scheme for `wavesync` |
| Web | `web-client/src/main.ts` | Client ID hardcoded (line 46) - make configurable |

---

## Known Limitations & TODOs

1. **Web Client:** Spotify Client ID hardcoded in `main.ts` (line 46)
   - **TODO:** Make configurable via UI or env var

2. **Flutter:** Not yet wired to UI login flow
   - **TODO:** Add sign-in button in `main.dart`, call `authManager.signIn()`

3. **Native Bridges:** Placeholder implementations
   - **TODO:** Step 3 - Wire Android/iOS Spotify App Remote SDK

4. **Token Revocation:** No logout/revoke endpoint
   - **TODO:** Add `/spotify/revoke` endpoint, call `clearTokens()`

5. **Refresh Token Rotation:** Not implemented
   - **TODO:** Handle new refresh token in refresh response (some Spotify configs rotate)

6. **Web Callback Route:** Assumes `/callback` exists
   - **TODO:** Document or implement redirect handling in web server

---

## Deployment Notes

### Development:
```bash
# Terminal 1: Server
cd server
npm install
npm run build
npm start

# Terminal 2: Web Client
cd web-client
npm install
npm run dev

# Terminal 3: Flutter (Android/iOS)
cd client
flutter pub get
flutter run
```

### Production Considerations:
- Use HTTPS for all endpoints
- Store `SPOTIFY_CLIENT_SECRET` securely (env vars, secret manager)
- Implement rate limiting on token endpoints (prevent abuse)
- Set appropriate CORS origins (not `*` in production)
- Use persistent token storage for web (localStorage with encryption)
- Implement token cleanup/expiry in storage

---

## Support & References

- [Spotify PKCE Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [flutter_web_auth_2 Docs](https://pub.dev/packages/flutter_web_auth_2)
- [flutter_secure_storage Docs](https://pub.dev/packages/flutter_secure_storage)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)

---

**Implementation Status:** ✅ Step 2 Complete - Ready for Step 3 (Native SDK Integration)
