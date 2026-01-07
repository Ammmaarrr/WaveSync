# WaveSync iOS Spotify SDK Configuration

## Add Spotify iOS SDK via CocoaPods

Create/edit `client/ios/Podfile`:

```ruby
platform :ios, '14.0'

# Add Spotify iOS SDK source
source 'https://github.com/CocoaPods/Specs.git'

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
  
  # Spotify iOS SDK (App Remote)
  pod 'SpotifyiOS', '~> 1.2.2'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    # Fix Spotify SDK deployment target if needed
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
    end
  end
end
```

## Install Pods

```bash
cd client/ios
pod install
```

## Info.plist Configuration

Add to `client/ios/Runner/Info.plist`:

```xml
<dict>
    <!-- ... existing keys -->
    
    <!-- Spotify URL Scheme for PKCE redirect -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>wavesync</string>
            </array>
            <key>CFBundleURLName</key>
            <string>com.example.wavesync</string>
        </dict>
    </array>
    
    <!-- Allow Spotify app query -->
    <key>LSApplicationQueriesSchemes</key>
    <array>
        <string>spotify</string>
    </array>
    
    <!-- Optional: Describe mic/audio usage if needed -->
    <key>NSMicrophoneUsageDescription</key>
    <string>WaveSync needs microphone access for audio sync testing</string>
</dict>
```

## Update SpotifyBridge.swift

Once SDK is installed, update the TODO sections in `client/native/ios/SpotifyBridge.swift`:

```swift
import SpotifyiOS  // Add this import

class SpotifyBridge {
  // Change from Any to SPTAppRemote
  static var appRemote: SPTAppRemote? = nil
  
  // In authenticate():
  let configuration = SPTConfiguration(
    clientID: cid,
    redirectURL: URL(string: redirectUri)!
  )
  appRemote = SPTAppRemote(configuration: configuration, logLevel: .debug)
  appRemote?.connectionParameters.accessToken = accessToken
  appRemote?.delegate = self  // Implement SPTAppRemoteDelegate
  appRemote?.connect()
  
  // In loadTrack():
  appRemote?.playerAPI?.play(uri) { _, error in
    if let error = error {
      result(FlutterError(code: "LOAD", message: error.localizedDescription, details: nil))
    } else {
      appRemote?.playerAPI?.pause { _, _ in
        result(true)
      }
    }
  }
  
  // Similar for play(), pause(), seek(), getPosition()
}

// Implement delegate
extension SpotifyBridge: SPTAppRemoteDelegate {
  func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
    print("[WaveSync] Spotify App Remote connected")
  }
  
  func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
    print("[WaveSync] Connection failed: \(error?.localizedDescription ?? "unknown")")
  }
  
  func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
    print("[WaveSync] Disconnected: \(error?.localizedDescription ?? "none")")
  }
}
```

## Build & Run

```bash
cd client
flutter build ios  # or flutter run
```

## Troubleshooting

- **CocoaPods install fails**: Run `pod repo update` first
- **App Remote not connecting**: Ensure Spotify app is installed on iOS device
- **URL scheme not working**: Verify `CFBundleURLSchemes` includes `wavesync`
- **Build errors**: Check iOS deployment target is ≥14.0 in Podfile and Xcode project
- **Simulator issues**: Spotify App Remote requires a physical device with Spotify installed

## Testing

1. Install Spotify app on iOS device
2. Run WaveSync app
3. Trigger PKCE sign-in from Flutter (obtains access token)
4. Call `authenticateWithToken()` to connect App Remote
5. Test playback controls (loadTrack, play, pause, seek)
