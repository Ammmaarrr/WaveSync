import 'package:flutter/services.dart';

/// Flutter MethodChannel wrapper for Spotify native bridges.
/// Channel: wavesync/spotify
///
/// All methods are placeholders — wire to native platform code.
class SpotifyBridge {
  static const _channel = MethodChannel('wavesync/spotify');

  /// Legacy authenticate method (no args).
  /// Kept for backward compatibility but deprecated.
  /// Use authenticateWithToken() for full PKCE integration.
  Future<Map?> authenticate() async {
    final res = await _channel.invokeMethod('authenticate');
    if (res is Map) return res;
    return null;
  }

  /// Authenticate with Spotify App Remote using client ID and access token.
  /// Call this after obtaining tokens via SpotifyAuthManager.signIn().
  /// 
  /// Args:
  ///   clientId: Spotify application client ID
  ///   accessToken: OAuth access token from PKCE flow (optional but recommended)
  /// 
  /// Returns: Map with { "status": "connected", "clientId": "...", "isConnected": true }
  Future<Map?> authenticateWithToken({
    required String clientId,
    String? accessToken,
  }) async {
    final args = <String, dynamic>{
      'clientId': clientId,
      if (accessToken != null) 'accessToken': accessToken,
    };
    final res = await _channel.invokeMethod('authenticate', args);
    if (res is Map) return Map<String, dynamic>.from(res);
    return null;
  }

  Future<bool> loadTrack(String uri) async {
    final res = await _channel.invokeMethod('loadTrack', {'uri': uri});
    return res == true;
  }

  Future<bool> seek(int ms) async {
    final res = await _channel.invokeMethod('seek', {'ms': ms});
    return res == true;
  }

  Future<bool> play() async {
    final res = await _channel.invokeMethod('play');
    return res == true;
  }

  Future<bool> pause() async {
    final res = await _channel.invokeMethod('pause');
    return res == true;
  }

  /// PKCE-capable authenticate. Native side may start auth UI and/or App Remote connect.
  /// Returns a Map (e.g., {status, code?}) depending on native implementation.
  Future<Map?> authenticatePkce({
    required String redirectUri,
    required String codeChallenge,
    List<String> scopes = const [
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
    ],
    String codeChallengeMethod = 'S256',
    String responseType = 'code',
    String? codeVerifier,
  }) async {
    final args = <String, dynamic>{
      'redirectUri': redirectUri,
      'codeChallenge': codeChallenge,
      'codeChallengeMethod': codeChallengeMethod,
      'responseType': responseType,
      'scopes': scopes,
      if (codeVerifier != null) 'codeVerifier': codeVerifier,
    };
    final res = await _channel.invokeMethod('authenticate', args);
    if (res is Map) return Map<String, dynamic>.from(res);
    return null;
  }

  Future<int> getPosition() async {
    final detail = await getPositionDetail();
    return detail.positionMs;
  }

  Future<SpotifyPositionDetail> getPositionDetail() async {
    final res = await _channel.invokeMethod('getPosition');
    if (res is Map) {
      final map = Map<String, dynamic>.from(res);
      final pos = _asInt(map['positionMs']) ?? _asInt(map['position']) ?? 0;
      final ts = _asInt(map['stateTs']) ?? _asInt(map['timestamp']);
      final paused = _asBool(map['isPaused']);
      return SpotifyPositionDetail(positionMs: pos, stateTs: ts, isPaused: paused);
    }
    if (res is int) {
      return SpotifyPositionDetail(positionMs: res, stateTs: null, isPaused: null);
    }
    return SpotifyPositionDetail(positionMs: 0, stateTs: null, isPaused: null);
  }

  int? _asInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }

  bool? _asBool(dynamic v) {
    if (v == null) return null;
    if (v is bool) return v;
    if (v is int) return v != 0;
    if (v is String) {
      final s = v.toLowerCase();
      if (s == 'true') return true;
      if (s == 'false') return false;
    }
    return null;
  }
}

class SpotifyPositionDetail {
  final int positionMs;
  final int? stateTs;
  final bool? isPaused;
  SpotifyPositionDetail({required this.positionMs, this.stateTs, this.isPaused});
}
