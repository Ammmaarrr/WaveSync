# Spotify integration (scaffold + steps)

This guide explains how to integrate Spotify into the Flutter client with native wrappers on Android (Kotlin) and iOS (Swift), plus a Flutter MethodChannel. It includes scaffold code and clear TODOs. No secrets are stored in the repo.

## 1) Spotify Developer setup

- Create a Spotify Developer account and register an app: https://developer.spotify.com/
- Record your client_id. Do NOT commit secrets.
- Configure Redirect URIs (add all that you plan to use):
  - Android: wavesync://auth-callback
  - iOS: wavesync://auth-callback
  - Web (optional during dev): http://localhost:4000/spotify/callback
- In your app, you’ll need to provide the same redirect URI you set in the dashboard.

Recommended storage of client_id and redirect URIs:
- Use server-side .env or local, uncommitted per-device configuration.
- In Flutter, inject via --dart-define (do not hardcode in source).

## 2) Flutter MethodChannel (Dart)

Create a wrapper class (already scaffolded for you in `client/lib/spotify_bridge.dart`) that exposes:
- authenticate()
- loadTrack(uri)
- seek(ms)
- play()
- pause()
- getPosition()

These map to native implementations on Android and iOS via the MethodChannel `wavesync/spotify`.

## 3) Android (Kotlin) scaffold

Files to create (after `flutter create .` generates the android/ folder):
- android/app/src/main/kotlin/<your/package>/MainActivity.kt
- android/app/src/main/kotlin/<your/package>/SpotifyBridge.kt

Gradle TODOs:
- TODO: Install Spotify Android SDK vX (placeholder)
  - Example (check latest docs): implementation("com.spotify.android:auth:<X>") and/or the Spotify App Remote SDK.
  - Add required repositories and permissions as per Spotify docs.

Example `MainActivity.kt` (adjust package):

```kotlin
package com.example.wavesync

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "wavesync/spotify"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "authenticate" -> SpotifyBridge.authenticate(this, result)
                    "loadTrack" -> SpotifyBridge.loadTrack(call.argument<String>("uri"), result)
                    "seek" -> SpotifyBridge.seek(call.argument<Int>("ms"), result)
                    "play" -> SpotifyBridge.play(result)
                    "pause" -> SpotifyBridge.pause(result)
                    "getPosition" -> SpotifyBridge.getPosition(result)
                    else -> result.notImplemented()
                }
            }
    }
}
```

Example `SpotifyBridge.kt` (stub methods; fill with actual Spotify SDK calls):

```kotlin
package com.example.wavesync

import android.app.Activity
import io.flutter.plugin.common.MethodChannel.Result

object SpotifyBridge {
    // TODO: Install Spotify Android SDK vX and wire initialization here.

    fun authenticate(activity: Activity, result: Result) {
        // TODO: Launch Spotify auth flow using client_id + redirect URI
        // Return access token or auth code if using PKCE.
        result.success(mapOf("status" to "ok"))
    }

    fun loadTrack(uri: String?, result: Result) {
        // TODO: Use Spotify App Remote / Web API to load track by URI
        result.success(true)
    }

    fun seek(ms: Int?, result: Result) {
        // TODO: Seek to position in ms
        result.success(true)
    }

    fun play(result: Result) {
        // TODO: Play
        result.success(true)
    }

    fun pause(result: Result) {
        // TODO: Pause
        result.success(true)
    }

    fun getPosition(result: Result) {
        // TODO: Return current playback position in ms
        result.success(0)
    }
}
```

Android intent-filter for custom scheme (AndroidManifest.xml):

```xml
<!-- In <activity android:name=".MainActivity" ...> -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="wavesync" android:host="auth-callback" />
</intent-filter>
```

## 4) iOS (Swift) scaffold

Files to create (after iOS platforms are generated):
- ios/Runner/AppDelegate.swift (channel wiring)
- ios/Runner/SpotifyBridge.swift (wrapper class)

CocoaPods TODOs:
- TODO: Add Pod for Spotify iOS SDK (placeholder). Check the latest SDK (App Remote / Web API usage).

Example `AppDelegate.swift`:

```swift
import UIKit
import Flutter

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let controller : FlutterViewController = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(name: "wavesync/spotify", binaryMessenger: controller.binaryMessenger)

    channel.setMethodCallHandler { call, result in
      switch call.method {
      case "authenticate": SpotifyBridge.authenticate(result: result)
      case "loadTrack": SpotifyBridge.loadTrack(uri: (call.arguments as? [String: Any])?["uri"] as? String, result: result)
      case "seek": SpotifyBridge.seek(ms: (call.arguments as? [String: Any])?["ms"] as? Int, result: result)
      case "play": SpotifyBridge.play(result: result)
      case "pause": SpotifyBridge.pause(result: result)
      case "getPosition": SpotifyBridge.getPosition(result: result)
      default: result(FlutterMethodNotImplemented)
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

Example `SpotifyBridge.swift` (stubs):

```swift
import Foundation

class SpotifyBridge {
  // TODO: Add Spotify iOS SDK (App Remote) and initialize.

  static func authenticate(result: FlutterResult) {
    // TODO: Perform auth via redirect URI
    result(["status": "ok"]) // placeholder
  }

  static func loadTrack(uri: String?, result: FlutterResult) {
    // TODO: Load track by Spotify URI
    result(true)
  }

  static func seek(ms: Int?, result: FlutterResult) {
    // TODO: Seek to ms
    result(true)
  }

  static func play(result: FlutterResult) {
    // TODO: Play
    result(true)
  }

  static func pause(result: FlutterResult) {
    // TODO: Pause
    result(true)
  }

  static func getPosition(result: FlutterResult) {
    // TODO: Return current position (ms)
    result(0)
  }
}
```

iOS URL scheme (Info.plist):

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

## 5) Flutter usage example

Dart calls via MethodChannel (`wavesync/spotify`). See `client/lib/spotify_bridge.dart` for the scaffold. Example:

```dart
final spotify = SpotifyBridge();
await spotify.authenticate();
await spotify.loadTrack('spotify:track:...');
await spotify.play();
await spotify.seek(30 * 1000);
final pos = await spotify.getPosition();
await spotify.pause();
```

## 6) TODOs checklist

- [ ] Install Spotify Android SDK vX (placeholder)
- [ ] Add Pod for Spotify iOS SDK (placeholder)
- [ ] Configure Android manifest intent-filter for wavesync://auth-callback
- [ ] Configure iOS Info.plist URL schemes for wavesync
- [ ] Provide client_id and redirect URIs via secure config (do not commit)
- [ ] Implement native logic in `SpotifyBridge.kt` and `SpotifyBridge.swift`
