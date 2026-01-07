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
  let audioChannel = FlutterMethodChannel(name: "wavesync/audio", binaryMessenger: controller.binaryMessenger)

    channel.setMethodCallHandler { call, result in
      switch call.method {
      case "authenticate":
        let args = call.arguments as? [String: Any]
        SpotifyBridge.authenticate(args: args, result: result)
      case "loadTrack":
        let args = call.arguments as? [String: Any]
        let uri = args?["uri"] as? String
        SpotifyBridge.loadTrack(uri: uri, result: result)
      case "seek":
        let args = call.arguments as? [String: Any]
        let ms = args?["ms"] as? Int
        SpotifyBridge.seek(ms: ms, result: result)
      case "play": SpotifyBridge.play(result: result)
      case "pause": SpotifyBridge.pause(result: result)
      case "getPosition": SpotifyBridge.getPosition(result: result)
      default: result(FlutterMethodNotImplemented)
      }
    }

    audioChannel.setMethodCallHandler { call, result in
      switch call.method {
      case "isBluetoothAudioActive": AudioRouteBridge.isBluetoothAudioActive(result: result)
      case "routeToSpeaker": AudioRouteBridge.routeToSpeaker(result: result)
      case "openBluetoothSettings": AudioRouteBridge.openBluetoothSettings(result: result)
      default: result(FlutterMethodNotImplemented)
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
