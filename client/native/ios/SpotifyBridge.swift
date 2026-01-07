import Foundation
import Flutter

/**
 * iOS Spotify bridge using Spotify iOS SDK (App Remote).
 * 
 * Authentication is handled via PKCE flow in Flutter (spotify_auth.dart).
 * This bridge connects to Spotify app for playback control.
 *
 * Setup:
 * - Add to Podfile: pod 'SpotifyiOS'
 * - Run: cd ios && pod install
 * - Register redirect URI in Info.plist (CFBundleURLSchemes: wavesync)
 * - Ensure Spotify app is installed on device
 */
class SpotifyBridge {
  // TODO: Replace Any with SPTAppRemote when SDK is integrated
  // Example: import SpotifyiOS; static var appRemote: SPTAppRemote?
  static var appRemote: Any? = nil
  static var clientId: String? = nil
  static var accessToken: String? = nil
  static let redirectUri = "wavesync://auth"

  /**
   * Authenticate and connect to Spotify App Remote.
   * 
   * Flutter calls this after obtaining access token via PKCE.
   * Args should contain:
   *   - clientId: Spotify client ID
   *   - accessToken: OAuth access token from PKCE flow
   * 
   * Returns: { "status": "connected", "clientId": "..." }
   */
  static func authenticate(args: [String: Any]?, result: @escaping FlutterResult) {
    guard let args = args,
          let cid = args["clientId"] as? String else {
      result(FlutterError(code: "ARG", message: "Missing clientId", details: nil))
      return
    }
    
    clientId = cid
    accessToken = args["accessToken"] as? String
    
    // TODO: When Spotify iOS SDK is integrated:
    // let configuration = SPTConfiguration(clientID: cid, redirectURL: URL(string: redirectUri)!)
    // appRemote = SPTAppRemote(configuration: configuration, logLevel: .debug)
    // appRemote?.connectionParameters.accessToken = accessToken
    // appRemote?.connect()
    
    // Placeholder success response
    result([
      "status": "connected",
      "clientId": cid,
      "isConnected": true
    ])
  }

  /**
   * Load (queue) a track for playback.
   * Args: { "uri": "spotify:track:..." }
   * Returns: true on success
   */
  static func loadTrack(uri: String?, result: @escaping FlutterResult) {
    guard let uri = uri, !uri.isEmpty else {
      result(FlutterError(code: "ARG", message: "Missing uri parameter", details: nil))
      return
    }
    
    // TODO: When SDK integrated:
    // appRemote?.playerAPI?.play(uri) { _, error in
    //   if let error = error {
    //     result(FlutterError(code: "LOAD", message: error.localizedDescription, details: nil))
    //   } else {
    //     appRemote?.playerAPI?.pause { _, _ in
    //       result(true)
    //     }
    //   }
    // }
    
    // Placeholder
    print("[WaveSync] loadTrack: \(uri)")
    result(true)
  }

  /**
   * Seek to position in milliseconds.
   * Args: { "ms": 5000 }
   * Returns: true on success
   */
  static func seek(ms: Int?, result: @escaping FlutterResult) {
    guard let ms = ms else {
      result(FlutterError(code: "ARG", message: "Missing ms parameter", details: nil))
      return
    }
    
    // TODO: When SDK integrated:
    // appRemote?.playerAPI?.seek(toPosition: ms) { _, error in
    //   if let error = error {
    //     result(FlutterError(code: "SEEK", message: error.localizedDescription, details: nil))
    //   } else {
    //     result(true)
    //   }
    // }
    
    // Placeholder
    print("[WaveSync] seek: \(ms)ms")
    result(true)
  }

  /**
   * Resume playback (for synchronized start).
   * Returns: true on success
   */
  static func play(result: @escaping FlutterResult) {
    // TODO: When SDK integrated:
    // appRemote?.playerAPI?.resume { _, error in
    //   if let error = error {
    //     result(FlutterError(code: "PLAY", message: error.localizedDescription, details: nil))
    //   } else {
    //     result(true)
    //   }
    // }
    
    // Placeholder
    print("[WaveSync] play")
    result(true)
  }

  /**
   * Pause playback.
   * Returns: true on success
   */
  static func pause(result: @escaping FlutterResult) {
    // TODO: When SDK integrated:
    // appRemote?.playerAPI?.pause { _, error in
    //   if let error = error {
    //     result(FlutterError(code: "PAUSE", message: error.localizedDescription, details: nil))
    //   } else {
    //     result(true)
    //   }
    // }
    
    // Placeholder
    print("[WaveSync] pause")
    result(true)
  }

  /**
   * Get current playback position with timestamp.
   * Returns: {
   *   "positionMs": 12345,
   *   "stateTs": 1697123456789,
   *   "isPaused": false
   * }
   */
  static func getPosition(result: @escaping FlutterResult) {
    // TODO: When SDK integrated:
    // appRemote?.playerAPI?.getPlayerState { state, error in
    //   if let error = error {
    //     result(FlutterError(code: "STATE", message: error.localizedDescription, details: nil))
    //   } else if let state = state {
    //     let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    //     result([
    //       "positionMs": state.playbackPosition,
    //       "stateTs": timestamp,
    //       "isPaused": state.isPaused
    //     ])
    //   }
    // }
    
    // Placeholder
    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    result([
      "positionMs": 0,
      "stateTs": timestamp,
      "isPaused": true
    ])
  }
  
  /**
   * Disconnect from Spotify App Remote.
   */
  static func disconnect() {
    // TODO: appRemote?.disconnect()
    appRemote = nil
    clientId = nil
    accessToken = nil
    print("[WaveSync] Disconnected from Spotify")
  }
}
