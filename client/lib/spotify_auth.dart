import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:http/http.dart' as http;

class SpotifyTokens {
  SpotifyTokens({
    required this.accessToken,
    required this.expiresAt,
    this.refreshToken,
    this.scope,
    this.tokenType,
  });

  final String accessToken;
  final DateTime expiresAt;
  final String? refreshToken;
  final String? scope;
  final String? tokenType;

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'expiresAt': expiresAt.toIso8601String(),
        'scope': scope,
        'tokenType': tokenType,
      };

  factory SpotifyTokens.fromJson(Map<String, dynamic> data) {
    return SpotifyTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String?,
      scope: data['scope'] as String?,
      tokenType: data['tokenType'] as String?,
      expiresAt: DateTime.parse(data['expiresAt'] as String),
    );
  }

  SpotifyTokens copyWith({
    String? accessToken,
    DateTime? expiresAt,
    String? refreshToken,
    String? scope,
    String? tokenType,
  }) {
    return SpotifyTokens(
      accessToken: accessToken ?? this.accessToken,
      expiresAt: expiresAt ?? this.expiresAt,
      refreshToken: refreshToken ?? this.refreshToken,
      scope: scope ?? this.scope,
      tokenType: tokenType ?? this.tokenType,
    );
  }
}

class SpotifyAuthManager {
  SpotifyAuthManager({
    FlutterSecureStorage? storage,
    http.Client? httpClient,
    Duration expirySafetyMargin = const Duration(seconds: 30),
  })  : _storage = storage ?? const FlutterSecureStorage(),
        _http = httpClient ?? http.Client(),
        _expirySafetyMargin = expirySafetyMargin;

  static const _storageKey = 'wavesync.spotify.tokens';
  final FlutterSecureStorage _storage;
  final http.Client _http;
  final Duration _expirySafetyMargin;
  final Random _rand = Random.secure();
  SpotifyTokens? _cached;

  Future<SpotifyTokens?> loadTokens() async {
    if (_cached != null && !_cached!.isExpired) {
      return _cached;
    }
    final raw = await _storage.read(key: _storageKey);
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final tokens = SpotifyTokens.fromJson(data);
      _cached = tokens;
      return tokens;
    } catch (_) {
      await _storage.delete(key: _storageKey);
      return null;
    }
  }

  Future<void> saveTokens(SpotifyTokens tokens) async {
    _cached = tokens;
    await _storage.write(key: _storageKey, value: jsonEncode(tokens.toJson()));
  }

  Future<void> clearTokens() async {
    _cached = null;
    await _storage.delete(key: _storageKey);
  }

  Future<SpotifyTokens> signIn({
    required String clientId,
    required String redirectUri,
    required List<String> scopes,
    required String serverBase,
  }) async {
    if (kIsWeb) {
      throw UnsupportedError('PKCE sign-in is handled by the web client runtime.');
    }

    final verifier = _generateCodeVerifier();
    final challenge = _generateCodeChallenge(verifier);
    final state = _generateState();

    final authUri = Uri.https('accounts.spotify.com', '/authorize', {
      'response_type': 'code',
      'client_id': clientId,
      'redirect_uri': redirectUri,
      'scope': scopes.join(' '),
      'code_challenge_method': 'S256',
      'code_challenge': challenge,
      'state': state,
      'show_dialog': 'false',
    });

    final callbackScheme = Uri.parse(redirectUri).scheme;
    if (callbackScheme.isEmpty || callbackScheme == 'http' || callbackScheme == 'https') {
      throw StateError('Redirect URI must use a custom scheme (e.g. wavesync://auth)');
    }

    final result = await FlutterWebAuth2.authenticate(
      url: authUri.toString(),
      callbackUrlScheme: callbackScheme,
    );
    final responseUri = Uri.parse(result);
    final returnedState = responseUri.queryParameters['state'];
    final code = responseUri.queryParameters['code'];
    if (code == null || code.isEmpty) {
      throw StateError('Spotify sign-in cancelled or missing code');
    }
    if (returnedState != state) {
      throw StateError('State verification failed');
    }

    final tokens = await exchangeCode(
      serverBase: serverBase,
      code: code,
      codeVerifier: verifier,
      redirectUri: redirectUri,
    );
    return tokens;
  }

  Future<SpotifyTokens> exchangeCode({
    required String serverBase,
    required String code,
    required String codeVerifier,
    required String redirectUri,
  }) async {
    final uri = _resolve(serverBase, '/spotify/exchange');
    final resp = await _http.post(
      uri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'code': code,
        'codeVerifier': codeVerifier,
        'redirectUri': redirectUri,
      }),
    );
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw StateError('Exchange failed (${resp.statusCode}): ${resp.body}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final expiresIn = (body['expires_in'] as num?)?.toInt() ?? 3600;
    final tokens = SpotifyTokens(
      accessToken: body['access_token'] as String,
      refreshToken: body['refresh_token'] as String?,
      scope: body['scope'] as String?,
      tokenType: body['token_type'] as String?,
      expiresAt: _computeExpiry(expiresIn),
    );
    await saveTokens(tokens);
    return tokens;
  }

  Future<SpotifyTokens?> refreshTokens({
    required String serverBase,
  }) async {
    final existing = await loadTokens();
    if (existing == null) return null;
    if (existing.refreshToken == null || existing.refreshToken!.isEmpty) {
      return existing;
    }
    if (!existing.isExpired) {
      return existing;
    }

    final uri = _resolve(serverBase, '/spotify/refresh');
    final resp = await _http.post(
      uri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': existing.refreshToken}),
    );
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw StateError('Refresh failed (${resp.statusCode}): ${resp.body}');
    }
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final expiresIn = (body['expires_in'] as num?)?.toInt() ?? 3600;
    final updated = existing.copyWith(
      accessToken: body['access_token'] as String?,
      scope: body['scope'] as String? ?? existing.scope,
      tokenType: body['token_type'] as String? ?? existing.tokenType,
      expiresAt: _computeExpiry(expiresIn),
    );
    await saveTokens(updated);
    return updated;
  }

  Future<SpotifyTokens?> getValidTokens({
    required String serverBase,
    bool refreshIfNeeded = true,
  }) async {
    final tokens = await loadTokens();
    if (tokens == null) return null;
    if (!refreshIfNeeded) return tokens;
    if (!tokens.isExpired) return tokens;
    return refreshTokens(serverBase: serverBase);
  }

  DateTime _computeExpiry(int expiresInSeconds) {
    final now = DateTime.now();
    final margin = expiresInSeconds - _expirySafetyMargin.inSeconds;
    final seconds = margin > 0 ? margin : expiresInSeconds;
    return now.add(Duration(seconds: seconds));
  }

  String _generateCodeVerifier() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    final buffer = StringBuffer();
    for (var i = 0; i < 128; i++) {
      buffer.write(chars[_rand.nextInt(chars.length)]);
    }
    return buffer.toString();
  }

  String _generateCodeChallenge(String verifier) {
    final digest = sha256.convert(utf8.encode(verifier));
    return base64UrlEncode(digest.bytes).replaceAll('=', '');
  }

  String _generateState() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final buffer = StringBuffer();
    for (var i = 0; i < 32; i++) {
      buffer.write(chars[_rand.nextInt(chars.length)]);
    }
    return buffer.toString();
  }

  Uri _resolve(String base, String path) {
    final uri = Uri.parse(base);
    if (path.startsWith('/')) {
      return uri.replace(path: path);
    }
    return uri.replace(path: '${uri.path}$path');
  }
}
