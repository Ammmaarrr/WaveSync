package com.example.wavesync_client

import android.app.Activity
import android.util.Log
import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.types.PlayerState
import io.flutter.plugin.common.MethodChannel.Result

/**
 * Android Spotify bridge using Spotify App Remote SDK.
 *
 * This bridge connects to the Spotify app using App Remote for playback control.
 * Authentication is handled via PKCE flow in Flutter (spotify_auth.dart),
 * which obtains access tokens through the server token exchange endpoints.
 *
 * Setup:
 * - Add Gradle dependency: implementation("com.spotify.android:app-remote:0.8.0")
 * - Register redirect URI in AndroidManifest (intent-filter for wavesync://auth)
 * - Ensure Spotify app is installed on device
 */
object SpotifyBridge {
    private const val TAG = "WaveSyncSpotify"
    // Client ID is passed from Flutter side via authenticate() call
    // Redirect URI uses custom scheme: wavesync://auth
    private const val REDIRECT_URI = "wavesync://auth"

    private var appRemote: SpotifyAppRemote? = null
    private var clientId: String? = null
    private var accessToken: String? = null

    private fun connectIfNeeded(activity: Activity, onReady: (SpotifyAppRemote) -> Unit, onError: (Throwable) -> Unit) {
        val current = appRemote
        if (current != null && current.isConnected) {
            onReady(current)
            return
        }
        
        val cid = clientId
        if (cid.isNullOrBlank()) {
            onError(IllegalStateException("Client ID not set. Call authenticate() first."))
            return
        }
        
        val connectionParams = ConnectionParams.Builder(cid)
            .setRedirectUri(REDIRECT_URI)
            .showAuthView(false) // Auth handled via Flutter PKCE flow
            .build()
            
        SpotifyAppRemote.connect(activity, connectionParams, object : Connector.ConnectionListener {
            override fun onConnected(remote: SpotifyAppRemote) {
                appRemote = remote
                Log.d(TAG, "Spotify App Remote connected")
                onReady(remote)
            }
            override fun onFailure(t: Throwable) {
                Log.e(TAG, "Spotify App Remote connect failed", t)
                onError(t)
            }
        })
    }

    /**
     * Authenticate and connect to Spotify App Remote.
     * 
     * Flutter calls this after obtaining access token via PKCE.
     * Args map should contain:
     *   - clientId: Spotify client ID
     *   - accessToken: OAuth access token from PKCE flow (optional, for future Web API calls)
     * 
     * Returns: { "status": "connected", "clientId": "..." }
     */
    fun authenticate(activity: Activity, args: Map<String, Any>?, result: Result) {
        val cid = args?.get("clientId") as? String
        val token = args?.get("accessToken") as? String
        
        if (cid.isNullOrBlank()) {
            result.error("ARG", "Missing clientId in authenticate() call", null)
            return
        }
        
        clientId = cid
        accessToken = token
        
        connectIfNeeded(activity, onReady = { remote ->
            result.success(mapOf(
                "status" to "connected",
                "clientId" to cid,
                "isConnected" to remote.isConnected
            ))
        }, onError = { err ->
            result.error("CONNECT", err.message ?: "Connection failed", null)
        })
    }

    /**
     * Load (queue) a track for playback.
     * For sync purposes, we load and pause immediately to minimize latency when play() is called.
     * 
     * Args: { "uri": "spotify:track:..." }
     * Returns: true on success
     */
    fun loadTrack(activity: Activity, uri: String?, result: Result) {
        if (uri.isNullOrBlank()) {
            result.error("ARG", "Missing uri parameter", null)
            return
        }
        
        connectIfNeeded(activity, onReady = { remote ->
            // Play the track to load it, then immediately pause
            remote.playerApi.play(uri)
                .setResultCallback {
                    Log.d(TAG, "Track loaded: $uri")
                    // Pause to ready it for synchronized start
                    remote.playerApi.pause()
                        .setResultCallback { 
                            Log.d(TAG, "Track paused, ready for sync start")
                            result.success(true) 
                        }
                        .setErrorCallback { e -> 
                            Log.w(TAG, "Pause after load failed: ${e.message}")
                            result.error("PAUSE", e.message, null) 
                        }
                }
                .setErrorCallback { e ->
                    Log.e(TAG, "Track load failed: ${e.message}")
                    result.error("LOAD", e.message, null)
                }
        }, onError = { err ->
            result.error("CONNECT", err.message, null)
        })
    }

    /**
     * Seek to position in milliseconds.
     * Args: { "ms": 5000 }
     * Returns: true on success
     */
    fun seek(activity: Activity, ms: Int, result: Result) {
        connectIfNeeded(activity, onReady = { remote ->
            remote.playerApi.seekTo(ms.toLong())
                .setResultCallback { 
                    Log.d(TAG, "Seeked to ${ms}ms")
                    result.success(true) 
                }
                .setErrorCallback { e -> 
                    Log.e(TAG, "Seek failed: ${e.message}")
                    result.error("SEEK", e.message, null) 
                }
        }, onError = { err ->
            result.error("CONNECT", err.message, null)
        })
    }

    /**
     * Resume playback (for synchronized start).
     * Returns: true on success
     */
    fun play(activity: Activity, result: Result) {
        connectIfNeeded(activity, onReady = { remote ->
            remote.playerApi.resume()
                .setResultCallback { 
                    Log.d(TAG, "Playback resumed")
                    result.success(true) 
                }
                .setErrorCallback { e -> 
                    Log.e(TAG, "Play failed: ${e.message}")
                    result.error("PLAY", e.message, null) 
                }
        }, onError = { err ->
            result.error("CONNECT", err.message, null)
        })
    }

    /**
     * Pause playback.
     * Returns: true on success
     */
    fun pause(activity: Activity, result: Result) {
        connectIfNeeded(activity, onReady = { remote ->
            remote.playerApi.pause()
                .setResultCallback { 
                    Log.d(TAG, "Playback paused")
                    result.success(true) 
                }
                .setErrorCallback { e -> 
                    Log.e(TAG, "Pause failed: ${e.message}")
                    result.error("PAUSE", e.message, null) 
                }
        }, onError = { err ->
            result.error("CONNECT", err.message, null)
        })
    }

    /**
     * Get current playback position with timestamp.
     * Returns: {
     *   "positionMs": 12345,
     *   "stateTs": 1697123456789,  // System.currentTimeMillis()
     *   "isPaused": false
     * }
     */
    fun getPosition(activity: Activity, result: Result) {
        connectIfNeeded(activity, onReady = { remote ->
            remote.playerApi.playerState
                .setResultCallback { state: PlayerState ->
                    val pos = state.playbackPosition ?: 0L
                    val timestamp = System.currentTimeMillis()
                    val map = mapOf(
                        "positionMs" to pos.toInt(),
                        "stateTs" to timestamp,
                        "isPaused" to state.isPaused
                    )
                    Log.d(TAG, "Position: ${pos}ms, paused=${state.isPaused}")
                    result.success(map)
                }
                .setErrorCallback { e -> 
                    Log.e(TAG, "getPosition failed: ${e.message}")
                    result.error("STATE", e.message, null) 
                }
        }, onError = { err ->
            result.error("CONNECT", err.message, null)
        })
    }
    
    /**
     * Disconnect from Spotify App Remote.
     * Call when disposing or logging out.
     */
    fun disconnect() {
        appRemote?.let {
            SpotifyAppRemote.disconnect(it)
            Log.d(TAG, "Disconnected from Spotify App Remote")
        }
        appRemote = null
        clientId = null
        accessToken = null
    }
}
