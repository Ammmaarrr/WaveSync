import 'dart:io';
import 'package:flutter/services.dart';

/// Platform audio route utilities.
/// Channel: wavesync/audio
class AudioRouteBridge {
  static const _channel = MethodChannel('wavesync/audio');

  Future<bool> isBluetoothAudioActive() async {
    try {
      final res = await _channel.invokeMethod('isBluetoothAudioActive');
      return res == true;
    } catch (_) {
      return false;
    }
  }

  /// Best-effort attempt to route audio to device speaker (Android only).
  Future<bool> routeToSpeaker() async {
    if (!Platform.isAndroid) return false;
    try {
      final res = await _channel.invokeMethod('routeToSpeaker');
      return res == true;
    } catch (_) {
      return false;
    }
  }

  /// Open platform Bluetooth settings (Android) or app Settings (iOS fallback).
  Future<bool> openBluetoothSettings() async {
    try {
      final res = await _channel.invokeMethod('openBluetoothSettings');
      return res == true;
    } catch (_) {
      return false;
    }
  }
}
