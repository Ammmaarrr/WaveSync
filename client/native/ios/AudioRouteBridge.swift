import Foundation
import AVFoundation
import UIKit
import Flutter

class AudioRouteBridge {
  static func isBluetoothAudioActive(result: FlutterResult) {
    let session = AVAudioSession.sharedInstance()
    let outputs = session.currentRoute.outputs
    let active = outputs.contains(where: { out in
      return out.portType == .bluetoothA2DP || out.portType == .bluetoothLE || out.portType == .bluetoothHFP
    })
    result(active)
  }

  // iOS does not allow force routing away from user-selected outputs for most categories.
  // Return false to indicate no-op.
  static func routeToSpeaker(result: FlutterResult) {
    result(false)
  }

  static func openBluetoothSettings(result: FlutterResult) {
    // iOS doesn't have a public API to deep link directly to Bluetooth settings.
    // We open the app Settings as a fallback.
    guard let url = URL(string: UIApplication.openSettingsURLString) else { result(false); return }
    if UIApplication.shared.canOpenURL(url) {
      UIApplication.shared.open(url, options: [:], completionHandler: { _ in })
      result(true)
    } else {
      result(false)
    }
  }
}
