# WaveSync Android Gradle Configuration

## Add Spotify App Remote SDK

Add to `client/android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    
    // Spotify App Remote SDK
    implementation 'com.spotify.android:app-remote:0.8.0'
}
```

## Add Maven Repository

Add to `client/android/build.gradle` (project-level):

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        // Add Spotify repository
        maven {
            url 'https://maven.spotify.com/repository/'
        }
    }
}
```

## AndroidManifest.xml Configuration

Add to `client/android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    <!-- ... existing application config -->
    
    <activity android:name=".MainActivity">
        <!-- Existing intent filters -->
        
        <!-- Add intent filter for Spotify PKCE redirect -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data
                android:scheme="wavesync"
                android:host="auth" />
        </intent-filter>
    </activity>
</application>
```

## Permissions

Add to `client/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Internet permission (usually already present) -->
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

## ProGuard Rules (if using ProGuard)

Add to `client/android/app/proguard-rules.pro`:

```proguard
# Spotify App Remote
-keep class com.spotify.** { *; }
-keep class com.spotify.protocol.** { *; }
```

## Build & Run

```bash
cd client
flutter build apk  # or flutter run
```

## Troubleshooting

- **App Remote connection fails**: Ensure Spotify app is installed on device
- **Auth redirect not working**: Verify intent-filter scheme matches `wavesync://auth`
- **Gradle sync issues**: Check Maven repository URL is correct
- **Runtime crashes**: Check ProGuard rules if using release build
