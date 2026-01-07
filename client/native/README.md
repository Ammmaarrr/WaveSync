# Native Spotify bridge skeletons

This folder contains Android (Kotlin) and iOS (Swift) skeleton code for a Flutter MethodChannel plugin at `wavesync/spotify`.

How to use
- After your Flutter app has android/ and ios/ folders, copy these files into the appropriate locations:
  - Android:
    - android/app/src/main/kotlin/<your/package>/MainActivity.kt
    - android/app/src/main/kotlin/<your/package>/SpotifyBridge.kt
  - iOS:
    - ios/Runner/AppDelegate.swift
    - ios/Runner/SpotifyBridge.swift

TODOs
- Install Spotify Android SDK vX in Gradle
- Add Spotify iOS SDK Pod
- Implement actual SDK calls inside SpotifyBridge.*
- Configure redirect URI (wavesync://auth-callback) on both platforms
- Keep secrets out of source control
