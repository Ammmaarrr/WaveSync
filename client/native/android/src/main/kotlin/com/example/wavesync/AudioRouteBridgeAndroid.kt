package com.example.wavesync

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import io.flutter.plugin.common.MethodChannel.Result

object AudioRouteBridgeAndroid {
    fun isBluetoothAudioActive(activity: Activity, result: Result) {
        try {
            val am = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            var active = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                active = devices.any { d ->
                    d.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                    d.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                }
            } else {
                // Fallback heuristic for old APIs
                active = am.isBluetoothA2dpOn || am.isBluetoothScoOn
            }
            result.success(active)
        } catch (e: Exception) {
            result.success(false)
        }
    }

    fun routeToSpeaker(activity: Activity, result: Result) {
        try {
            val am = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            // Disable SCO and A2DP if possible
            try { am.stopBluetoothSco() } catch (_: Exception) {}
            try { am.setBluetoothScoOn(false) } catch (_: Exception) {}
            try { am.isSpeakerphoneOn = true } catch (_: Exception) {}
            // On newer Android, explicit routing is limited; this is best-effort
            result.success(true)
        } catch (e: Exception) {
            result.success(false)
        }
    }

    fun openBluetoothSettings(activity: Activity, result: Result) {
        try {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            result.success(true)
        } catch (e: Exception) {
            try {
                activity.startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                result.success(true)
            } catch (_: Exception) {
                result.success(false)
            }
        }
    }
}
