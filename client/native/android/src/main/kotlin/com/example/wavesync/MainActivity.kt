package com.example.wavesync

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "wavesync/spotify"
    private val AUDIO_CHANNEL = "wavesync/audio"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "authenticate" -> {
                        val args = call.arguments as? Map<String, Any>
                        SpotifyBridge.authenticate(this, args, result)
                    }
                    "loadTrack" -> {
                        val uri = call.argument<String>("uri")
                        SpotifyBridge.loadTrack(this, uri, result)
                    }
                    "seek" -> {
                        val ms = call.argument<Int>("ms") ?: 0
                        SpotifyBridge.seek(this, ms, result)
                    }
                    "play" -> SpotifyBridge.play(this, result)
                    "pause" -> SpotifyBridge.pause(this, result)
                    "getPosition" -> SpotifyBridge.getPosition(this, result)
                    else -> result.notImplemented()
                }
            }

        // Audio route channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, AUDIO_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "isBluetoothAudioActive" -> AudioRouteBridgeAndroid.isBluetoothAudioActive(this, result)
                    "routeToSpeaker" -> AudioRouteBridgeAndroid.routeToSpeaker(this, result)
                    "openBluetoothSettings" -> AudioRouteBridgeAndroid.openBluetoothSettings(this, result)
                    else -> result.notImplemented()
                }
            }
    }
}
