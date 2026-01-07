import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:math' as math;
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'spotify_bridge.dart';
import 'spotify_auth.dart';
import 'audio_route_bridge.dart';

void main() {
  runApp(const WaveSyncApp());
}

class WaveSyncApp extends StatelessWidget {
  const WaveSyncApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WaveSync',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Config
  final _serverBaseController = TextEditingController(text: 'http://localhost:4000');
  final _wsBaseController = TextEditingController(text: 'ws://localhost:4000');
  final _sessionController = TextEditingController(text: 'lobby');
  final _clientController = TextEditingController(text: 'flutter-${DateTime.now().millisecondsSinceEpoch % 10000}');
  final _trackUriController = TextEditingController(text: '');
  final _seekMsController = TextEditingController(text: '0');

  WebSocketChannel? _channel;
  StreamSubscription? _wsSub;
  bool _connected = false;

  // Sync
  double? _offsetMs; // median offset
  double? _rttMs; // median RTT
  double? _errorMs; // MAD-based error
  final List<String> _log = [];

  // Audio
  final AudioPlayer _player = AudioPlayer();
  late final List<int> _beepWav;
  final List<_StartReport> _reports = []; // collected start reports from self and peers
  final SpotifyBridge _spotify = SpotifyBridge();
  final AudioRouteBridge _audio = AudioRouteBridge();
  Timer? _driftTimer;
  int? _activeStartServerTime; // last commanded server start_time for track
  int _consecutiveDriftHits = 0;
  int _correctionBackoffMs = 0; // exponentially backed-off cooldown between corrections
  int _lastCorrectionLocalTs = 0; // ms epoch
  int _stableSamples = 0; // consecutive near-zero drift samples

  @override
  void initState() {
    super.initState();
    _beepWav = _generateBeepWavBytes(durationMs: 100, freqHz: 880); // 100ms beep
    _player.onPlayerStateChanged.listen((state) {
      if (state == PlayerState.playing) {
        final ts = DateTime.now().millisecondsSinceEpoch;
        _appendLog('Audio started at $ts');
        final offset = _offsetMs ?? 0.0;
        final serverTs = (ts + offset).round();
        // Record local report
        _upsertReport(_clientController.text.trim(), ts, serverTs);
        // Broadcast to peers
        final ch = _channel;
        if (ch != null) {
          ch.sink.add(jsonEncode({
            'type': 'reportStart',
            'clientId': _clientController.text.trim(),
            'localTs': ts,
            'serverTs': serverTs,
          }));
        }
      }
    });
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _channel?.sink.close();
  _driftTimer?.cancel();
    _serverBaseController.dispose();
    _wsBaseController.dispose();
    _sessionController.dispose();
    _clientController.dispose();
  _trackUriController.dispose();
  _seekMsController.dispose();
    _player.dispose();
    super.dispose();
  }

  void _appendLog(String line) {
    setState(() => _log.add(line));
  }

  Future<void> _createSession() async {
    final base = _serverBaseController.text.trim();
    final url = Uri.parse('$base/session/create');
    final resp = await http.post(url);
    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      _sessionController.text = data['sessionId']?.toString() ?? _sessionController.text;
      _appendLog('Created session: ${_sessionController.text}');
    } else {
      _appendLog('Create session failed: ${resp.statusCode} ${resp.body}');
    }
  }

  Future<void> _joinSession() async {
    final base = _serverBaseController.text.trim();
    final url = Uri.parse('$base/session/join');
    final body = {
      'sessionId': _sessionController.text.trim(),
      'clientId': _clientController.text.trim(),
    };
    final resp = await http.post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
    if (resp.statusCode == 200) {
      _appendLog('Joined session: ${_sessionController.text}');
    } else {
      _appendLog('Join failed: ${resp.statusCode} ${resp.body}');
    }
  }

  Future<void> _connectWs() async {
    await _wsSub?.cancel();
    await _channel?.sink.close();
    setState(() {
      _connected = false;
    });
    final wsBase = _wsBaseController.text.trim();
    final sessionId = _sessionController.text.trim();
    final clientId = _clientController.text.trim();
    final url = Uri.parse('$wsBase/ws?sessionId=$sessionId&clientId=$clientId');
    _appendLog('Connecting WS: $url');
    final ch = WebSocketChannel.connect(url);
    _channel = ch;
    _wsSub = ch.stream.listen((event) {
      final t2 = DateTime.now().millisecondsSinceEpoch;
      try {
        final msg = jsonDecode(event.toString());
        if (msg is Map && msg['type'] == 'pong') {
          _handlePong(msg as Map<String, dynamic>, t2);
        } else if (msg is Map && msg['type'] == 'relay') {
          _handleRelay(msg['data']);
        } else if (msg is Map && msg['type'] == 'welcome') {
          setState(() => _connected = true);
          _appendLog('WS welcome: ${event.toString()}');
        } else {
          _appendLog('WS msg: ${event.toString()}');
        }
      } catch (_) {
        _appendLog('WS text: ${event.toString()}');
      }
    }, onError: (e) {
      _appendLog('WS error: $e');
      setState(() => _connected = false);
    }, onDone: () {
      _appendLog('WS closed');
      setState(() => _connected = false);
    });
  }

  final List<_Sample> _samples = [];

  Future<void> _runClockSync() async {
    if (_channel == null) return;
    _samples.clear();
    const total = 10;
    for (int i = 0; i < total; i++) {
      final t1 = DateTime.now().millisecondsSinceEpoch;
      _channel!.sink.add(jsonEncode({ 'type': 'ping', 't1': t1 }));
      await Future.delayed(const Duration(milliseconds: 100));
    }
    await Future.delayed(const Duration(milliseconds: 200));
    if (_samples.isEmpty) {
      _appendLog('No ping/pong samples received.');
      return;
    }
    final result = _computeOffsetSamples(_samples);
    setState(() {
      _offsetMs = result.offsetMs;
      _rttMs = result.rttMs;
      _errorMs = result.errorMs;
    });
    _appendLog('Clock sync => offset=${_offsetMs!.toStringAsFixed(2)}ms, rtt=${_rttMs!.toStringAsFixed(2)}ms, err±${_errorMs!.toStringAsFixed(2)}ms');
  }

  void _handlePong(Map<String, dynamic> msg, int t2) {
    final t1 = (msg['t1'] as num?)?.toInt();
    final serverRecv = (msg['serverRecv'] as num?)?.toInt();
    final serverTime = (msg['serverTime'] as num?)?.toInt();
    if (t1 == null || serverRecv == null || serverTime == null) return;
    _samples.add(_Sample(t1: t1, t2: t2, serverRecv: serverRecv, serverTime: serverTime));
  }

  void _handleRelay(dynamic data) {
    if (data is Map && data['type'] == 'start') {
      // Support both keys: startTime and start_time; and trackUri/track_uri; optional seek_ms
      final startTime = (data['startTime'] as num? ?? data['start_time'] as num?)?.toInt();
      final trackUri = (data['trackUri'] as String? ?? data['track_uri'] as String?);
      final seekMs = (data['seek_ms'] as num?)?.toInt();
      if (startTime != null) {
        if (trackUri != null && trackUri.isNotEmpty) {
          _handleStartTrack(startTime, trackUri, seekMs: seekMs);
        } else {
          // Legacy: schedule tone test if no trackUri provided
          _scheduleStart(startTime);
        }
      }
    } else if (data is Map && data['type'] == 'reportStart') {
      final cid = (data['clientId'] as String?) ?? 'peer';
      final localTs = (data['localTs'] as num?)?.toInt();
      final serverTs = (data['serverTs'] as num?)?.toInt();
      if (localTs != null && serverTs != null) {
        _appendLog('Report from $cid: local=$localTs server=$serverTs');
        _upsertReport(cid, localTs, serverTs);
      }
    }
  }

  // Handle track-based start: preload and schedule precise play
  Future<void> _handleStartTrack(int startServerTime, String trackUri, {int? seekMs}) async {
  _activeStartServerTime = startServerTime;
  _consecutiveDriftHits = 0;
  // Check audio route and prompt if Bluetooth is active (A2DP likely adds latency)
  await _maybePromptBluetoothActive();
    _appendLog('Start received: start_time=$startServerTime, track=$trackUri, seekMs=${seekMs ?? 0}');
    if (kDebugMode) {
      print('[WaveSync] Start received: server=$startServerTime track=$trackUri seekMs=${seekMs ?? 0}');
    }
    final offset = _offsetMs ?? 0.0; // ms
    final localStart = (startServerTime - offset).round();
    _appendLog('Start track signal: uri=$trackUri | server=$startServerTime -> localTarget=$localStart (offset=${offset.toStringAsFixed(2)}ms)');

    // Preload: loadTrack and optional seek
    try {
      final ok = await _spotify.loadTrack(trackUri);
      _appendLog('loadTrack($trackUri) => $ok');
      if (kDebugMode) print('[WaveSync] loadTrack => $ok');
      if (seekMs != null && seekMs > 0) {
        final sk = await _spotify.seek(seekMs);
        _appendLog('seek($seekMs) => $sk');
        if (kDebugMode) print('[WaveSync] seek($seekMs) => $sk');
      }
    } catch (e) {
      _appendLog('Spotify preload error: $e');
      if (kDebugMode) print('[WaveSync] Preload error: $e');
    }

    // Schedule high-precision play with jitter compensation
  _scheduleExactSpotifyPlay(localStart, startServerTime);
  _startDriftMonitor();
  }

  // High-precision scheduler: plays as close as possible to localTarget.
  // Jitter compensation: if within ±50ms window, play immediately; then micro-adjust after 1s.
  void _scheduleExactSpotifyPlay(int localTargetMs, int startServerTime) {
    void microAdjust() async {
      // After ~1s from intended start, compare expected vs actual position and adjust if needed
      final now = DateTime.now().millisecondsSinceEpoch;
      final msUntil = (localTargetMs + 1000) - now;
      if (msUntil > 0) await Future.delayed(Duration(milliseconds: msUntil));
      try {
        final pos = await _spotify.getPosition();
        final expected = DateTime.now().millisecondsSinceEpoch - localTargetMs;
        final drift = pos - expected; // positive means ahead
        _appendLog('Micro-adjust check: expected=$expected ms, pos=$pos ms, drift=$drift ms');
        if (drift.abs() > 30) {
          final target = expected; // seek to where we should be now
          final ok = await _spotify.seek(target);
          _appendLog('Micro-adjust seek($target) => $ok');
        }
      } catch (e) {
        _appendLog('Micro-adjust error: $e');
      }
    }

    void triggerPlay() async {
      final callTs = DateTime.now().millisecondsSinceEpoch;
      _appendLog('Spotify play() call at $callTs (intended=$localTargetMs)');
      try {
        final ok = await _spotify.play();
        _appendLog('play() => $ok');
  if (kDebugMode) print('[WaveSync] play() => $ok');
      } catch (e) {
        _appendLog('play() error: $e');
  if (kDebugMode) print('[WaveSync] play() error: $e');
      }
      microAdjust();
  _activeStartServerTime = startServerTime;
      // Also record a report mapped to server time for later comparison
      final offset = _offsetMs ?? 0.0;
      final serverTs = (callTs + offset).round();
      _upsertReport(_clientController.text.trim(), callTs, serverTs);
      _channel?.sink.add(jsonEncode({
        'type': 'reportStart',
        'clientId': _clientController.text.trim(),
        'localTs': callTs,
        'serverTs': serverTs,
      }));
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    final diff = localTargetMs - now; // ms until start (can be negative)
    if (diff.abs() <= 50) {
      // In the window: go immediately
      triggerPlay();
      return;
    }
    if (diff > 50) {
      // Coarse wait until close to target, then 1ms tick
      final coarse = diff - 50;
      Timer(Duration(milliseconds: coarse), () {
        Timer.periodic(const Duration(milliseconds: 1), (t) {
          final n = DateTime.now().millisecondsSinceEpoch;
          if (n >= localTargetMs) {
            t.cancel();
            triggerPlay();
          }
        });
      });
    } else {
      // Already late by more than 50ms; start now, log late
      _appendLog('Late start by ${diff.abs()} ms; starting immediately');
      triggerPlay();
    }
  }

  void _startDriftMonitor() {
    _driftTimer?.cancel();
  // Fixed 3s interval per requirements
  Future<void> check() async {
      if (!mounted) return;
      final startServer = _activeStartServerTime;
      if (startServer == null) return;
      try {
        SpotifyPositionDetail posDetail;
        try {
          posDetail = await _spotify.getPositionDetail();
        } catch (e) {
          _appendLog('getPosition failed: $e, attempting re-auth');
          if (kDebugMode) print('[WaveSync] getPosition error: $e, re-authenticating');
          await _spotify.authenticate();
          posDetail = await _spotify.getPositionDetail();
        }
        final nowLocal = DateTime.now().millisecondsSinceEpoch;
        final offset = _offsetMs ?? 0.0;
        final nowServer = (nowLocal + offset).round();
        final expected = nowServer - startServer; // ms since start
        final actual = posDetail.positionMs;
        final drift = actual - expected; // positive means player ahead

        // Telemetry
        _channel?.sink.add(jsonEncode({
          'type': 'telemetry',
          'clientId': _clientController.text.trim(),
          'drift': drift,
          'timestamp': nowServer,
        }));
    if (kDebugMode) print('[WaveSync] telemetry drift=${drift}ms ts=$nowServer');

        // Smoothing: count consecutive drifts over 30ms; or correct immediately if >250ms
        final absDrift = drift.abs();
        if (absDrift > 30) {
          _consecutiveDriftHits++;
          _stableSamples = 0;
        } else {
          _consecutiveDriftHits = 0;
          _stableSamples++;
          // Decay backoff after 3 stable samples
          if (_stableSamples >= 3 && _correctionBackoffMs > 0) {
            _correctionBackoffMs = (_correctionBackoffMs / 2).floor();
            if (_correctionBackoffMs < 250) _correctionBackoffMs = 0;
            _appendLog('Drift stable, reducing backoff to ${_correctionBackoffMs}ms');
            _stableSamples = 0;
          }
        }

        final shouldCorrect = absDrift > 250 || _consecutiveDriftHits >= 3;
        if (!shouldCorrect) return;

        // Exponential backoff to avoid oscillations
        final sinceLastCorr = nowLocal - _lastCorrectionLocalTs;
        if (_correctionBackoffMs > 0 && sinceLastCorr < _correctionBackoffMs) {
          final remain = _correctionBackoffMs - sinceLastCorr;
          _appendLog('Backoff active (${_correctionBackoffMs}ms), skipping correction. ${remain}ms remaining');
          return;
        }

        if (absDrift <= 120) {
          // Small correction: seek to expected
          final ok = await _spotify.seek(expected);
          _appendLog('Drift small (${drift}ms) -> seek($expected) => $ok');
          _consecutiveDriftHits = 0;
          // Increase backoff if corrections are frequent (<10s apart), else decay
          if (sinceLastCorr < 10000) {
            _correctionBackoffMs = _correctionBackoffMs == 0 ? 2000 : math.min(15000, _correctionBackoffMs * 2);
          } else {
            _correctionBackoffMs = (_correctionBackoffMs / 2).floor();
          }
          _lastCorrectionLocalTs = nowLocal;
        } else {
          // Large correction: pause, seek to expected with small buffer (e.g., +30ms), then play
          try {
            await _spotify.pause();
          } catch (_) {}
          final target = math.max(0, expected + 30);
          final sk = await _spotify.seek(target);
          final pl = await _spotify.play();
          _appendLog('Drift large (${drift}ms) -> pause + seek($target) + play => seek:$sk play:$pl');
          // Update reference start time to keep expected coherent with current nowServer
          final newStart = nowServer - target;
          _activeStartServerTime = newStart;
          _consecutiveDriftHits = 0;
          _correctionBackoffMs = _correctionBackoffMs == 0 ? 4000 : math.min(20000, _correctionBackoffMs * 2);
          _lastCorrectionLocalTs = nowLocal;
        }
      } catch (e) {
        _appendLog('Drift check error: $e');
      }
    }

    _driftTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      unawaited(check());
    });
  }

  Future<void> _hostStartSpotifyIn3s() async {
    final trackUri = _trackUriController.text.trim();
    if (trackUri.isEmpty) {
      _appendLog('Provide a Spotify track URI');
      return;
    }
    final seekMs = int.tryParse(_seekMsController.text.trim()) ?? 0;
    try {
      final base = _serverBaseController.text.trim();
      final resp = await http.get(Uri.parse('$base/server-time'));
      if (resp.statusCode != 200) {
        _appendLog('Failed to get server time: ${resp.statusCode}');
        return;
      }
      final nowServer = (jsonDecode(resp.body)['serverTime'] as num).toInt();
      final startTime = nowServer + 3000;
      _appendLog('Host scheduling Spotify start at $startTime track=$trackUri seekMs=$seekMs');
      if (kDebugMode) print('[WaveSync] Host start: server=$startTime track=$trackUri seekMs=$seekMs');
      _channel?.sink.add(jsonEncode({
        'type': 'start',
        'start_time': startTime,
        'track_uri': trackUri,
        'seek_ms': seekMs,
      }));
      // Also schedule locally for host
      await _handleStartTrack(startTime, trackUri, seekMs: seekMs);
    } catch (e) {
      _appendLog('Error scheduling start: $e');
      if (kDebugMode) print('[WaveSync] Host start error: $e');
    }
  }

  Future<void> _testSyncStartIn3s() async {
    if (_channel == null) return;
    // Get authoritative server time
    final base = _serverBaseController.text.trim();
    final resp = await http.get(Uri.parse('$base/server-time'));
    if (resp.statusCode != 200) {
      _appendLog('Failed to get server time: ${resp.statusCode}');
      return;
    }
    final nowServer = (jsonDecode(resp.body)['serverTime'] as num).toInt();
    final startTime = nowServer + 3000; // 3s in the future
    _appendLog('Host scheduling start at serverTime=$startTime');
    // Inform others (server will relay to peers; host won\'t get its own message)
    _channel!.sink.add(jsonEncode({ 'type': 'start', 'startTime': startTime }));
    // Also schedule locally for host
    _scheduleStart(startTime);
  }

  void _scheduleStart(int startServerTime) {
    // Check audio route first
    unawaited(_maybePromptBluetoothActive());
    final offset = _offsetMs ?? 0.0; // ms
    final localTarget = startServerTime - offset; // when to start locally (ms epoch)
    final now = DateTime.now().millisecondsSinceEpoch.toDouble();
    final delayMs = math.max(0.0, localTarget - now);
    _appendLog('Scheduling local start in ${delayMs.toStringAsFixed(0)} ms (offset=${offset.toStringAsFixed(2)}ms)');
    Future.delayed(Duration(milliseconds: delayMs.round()), () async {
      final callTs = DateTime.now().millisecondsSinceEpoch;
      _appendLog('play() called at $callTs');
      // Play generated 100ms WAV tone from memory
      await _player.play(BytesSource(Uint8List.fromList(_beepWav)));
    });
  }

  Future<void> _maybePromptBluetoothActive() async {
    final bt = await _audio.isBluetoothAudioActive();
    if (!bt || !mounted) return;
    if (Theme.of(context).platform == TargetPlatform.android || Theme.of(context).platform == TargetPlatform.iOS) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Bluetooth audio detected'),
          content: const Text('Bluetooth A2DP can add 100–200ms latency and break sync. Switch to phone speaker or wired headphones for best results.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Continue'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(ctx).pop();
                final routed = await _audio.routeToSpeaker();
                if (!routed) {
                  await _audio.openBluetoothSettings();
                }
              },
              child: const Text('Route to speaker'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('WaveSync Clock Sync')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(spacing: 8, runSpacing: 8, children: [
              SizedBox(
                width: 260,
                child: TextField(
                  controller: _serverBaseController,
                  decoration: const InputDecoration(labelText: 'Server Base (HTTP)', hintText: 'http://localhost:4000'),
                ),
              ),
              SizedBox(
                width: 260,
                child: TextField(
                  controller: _wsBaseController,
                  decoration: const InputDecoration(labelText: 'WS Base', hintText: 'ws://localhost:4000'),
                ),
              ),
              SizedBox(
                width: 180,
                child: TextField(
                  controller: _sessionController,
                  decoration: const InputDecoration(labelText: 'Session ID'),
                ),
              ),
              SizedBox(
                width: 200,
                child: TextField(
                  controller: _clientController,
                  decoration: const InputDecoration(labelText: 'Client ID'),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              ElevatedButton(onPressed: _createSession, child: const Text('Create Session')),
              ElevatedButton(onPressed: _joinSession, child: const Text('Join Session')),
              ElevatedButton(onPressed: _connectWs, child: Text(_connected ? 'Reconnect WS' : 'Connect WS')),
              ElevatedButton(onPressed: _runClockSync, child: const Text('Sync Now (10x)')),
              ElevatedButton(onPressed: _testSyncStartIn3s, child: const Text('Test Sync: Start in 3s (Host)')),
              ElevatedButton(onPressed: _debugCompareStarts, child: const Text('Debug: Compare Starts')),
            ]),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
              SizedBox(
                width: 340,
                child: TextField(
                  controller: _trackUriController,
                  decoration: const InputDecoration(labelText: 'Spotify Track URI', hintText: 'spotify:track:...'),
                ),
              ),
              SizedBox(
                width: 160,
                child: TextField(
                  controller: _seekMsController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Seek (ms)', hintText: '0'),
                ),
              ),
              ElevatedButton(onPressed: _hostStartSpotifyIn3s, child: const Text('Start Spotify in 3s (Host)')),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Text('Offset: ${_offsetMs?.toStringAsFixed(2) ?? '--'} ms'),
              const SizedBox(width: 16),
              Text('RTT: ${_rttMs?.toStringAsFixed(2) ?? '--'} ms'),
              const SizedBox(width: 16),
              Text('Err±: ${_errorMs?.toStringAsFixed(2) ?? '--'} ms'),
            ]),
            const SizedBox(height: 12),
            const Text('Logs'),
            const SizedBox(height: 6),
            Expanded(
              child: Container(
                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300)),
                child: ListView.builder(
                  itemCount: _log.length,
                  itemBuilder: (context, i) => Text(_log[i]),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  // ===== Clock math helpers =====
  _Result _computeOffsetSamples(List<_Sample> samples) {
    // Exact formulas (as requested):
    // rtt = t2 - t1
    // offset = serverTime - ((t1 + t2) / 2)
    final derived = samples.map((s) {
      final rtt = (s.t2 - s.t1).toDouble();
      final offset = s.serverTime - ((s.t1 + s.t2) / 2);
      return _Derived(rtt: rtt, offset: offset);
    }).toList();

    derived.sort((a, b) => a.rtt.compareTo(b.rtt));
    List<_Derived> trimmed = derived;
    if (derived.length >= 7) {
      final k = math.min(2, derived.length ~/ 4);
      trimmed = derived.sublist(k, derived.length - k);
    }

    double median(List<double> arr) {
      final a = [...arr]..sort();
      final m = a.length ~/ 2;
      return a.length.isOdd ? a[m] : (a[m - 1] + a[m]) / 2.0;
    }

    final offsets = trimmed.map((e) => e.offset).toList();
    final rtts = trimmed.map((e) => e.rtt).toList();
    final offsetMed = median(offsets);
    final rttMed = median(rtts);

    // MAD-based error for offset
    final absDevs = offsets.map((v) => (v - offsetMed).abs()).toList();
    final mad = median(absDevs);
    final error = 1.4826 * mad; // ~1σ

    return _Result(offsetMs: offsetMed, rttMs: rttMed, errorMs: error);
  }

  // ===== Start reports and debugging =====
  void _upsertReport(String clientId, int localTs, int serverTs) {
    final idx = _reports.indexWhere((r) => r.clientId == clientId);
    final rep = _StartReport(clientId: clientId, localTs: localTs, serverTs: serverTs);
    setState(() {
      if (idx >= 0) {
        _reports[idx] = rep;
      } else {
        _reports.add(rep);
      }
    });
  }

  void _debugCompareStarts() {
    if (_reports.length < 2) {
      _appendLog('Need at least 2 reports to compare. Collected: ${_reports.length}');
      return;
    }
    final sorted = [..._reports]..sort((a, b) => a.serverTs.compareTo(b.serverTs));
    final minServer = sorted.first.serverTs;
    final maxServer = sorted.last.serverTs;
    final spread = maxServer - minServer;
    _appendLog('Start deltas (relative to earliest serverTs=$minServer):');
    for (final r in sorted) {
      final d = r.serverTs - minServer;
      final line = ' - ${r.clientId}: +$d ms (local=${r.localTs}, server=${r.serverTs})';
      _appendLog(line);
      if (kDebugMode) {
        print(line);
      }
    }
    final summary = 'Spread across devices: $spread ms (min=$minServer, max=$maxServer)';
    _appendLog(summary);
    if (kDebugMode) {
      print(summary);
    }
  }

  // ===== WAV tone generator (mono 16-bit PCM) =====
  List<int> _generateBeepWavBytes({int durationMs = 100, int freqHz = 880, int sampleRate = 44100, int amplitude = 16000}) {
    final sampleCount = (sampleRate * durationMs / 1000).round();
    final bytes = BytesBuilder();
    // WAV header
    final byteRate = sampleRate * 2; // mono 16-bit
    const blockAlign = 2; // channels(1) * bitsPerSample(16)/8
    final dataSize = sampleCount * 2;
    const fmtChunkSize = 16;
    final riffChunkSize = 4 + (8 + fmtChunkSize) + (8 + dataSize);
    void w8(int v) => bytes.add([v & 0xFF]);
    void w16(int v) { w8(v); w8(v >> 8); }
    void w32(int v) { w16(v & 0xFFFF); w16((v >> 16) & 0xFFFF); }
    // RIFF header
    bytes.add(asciiCodes('RIFF'));
    w32(riffChunkSize);
    bytes.add(asciiCodes('WAVE'));
    // fmt chunk
    bytes.add(asciiCodes('fmt '));
    w32(fmtChunkSize);
    w16(1); // PCM
    w16(1); // channels
    w32(sampleRate);
    w32(byteRate);
    w16(blockAlign);
    w16(16); // bits per sample
    // data chunk
    bytes.add(asciiCodes('data'));
    w32(dataSize);
    // samples
    for (int n = 0; n < sampleCount; n++) {
      final t = n / sampleRate;
      final sample = (amplitude * math.sin(2 * math.pi * freqHz * t)).round();
      final v = sample & 0xFFFF;
      w16(v);
    }
    return bytes.toBytes();
  }
}

class _Sample {
  final int t1;
  final int t2;
  final int serverRecv;
  final int serverTime;
  _Sample({required this.t1, required this.t2, required this.serverRecv, required this.serverTime});
}

class _Derived {
  final double rtt; // ms
  final double offset; // ms
  _Derived({required this.rtt, required this.offset});
}

class _Result {
  final double offsetMs;
  final double rttMs;
  final double errorMs;
  _Result({required this.offsetMs, required this.rttMs, required this.errorMs});
}

List<int> asciiCodes(String s) => s.codeUnits;

class _StartReport {
  final String clientId;
  final int localTs;  // local wall clock when audio started
  final int serverTs; // mapped to server timeline (localTs + offset)
  _StartReport({required this.clientId, required this.localTs, required this.serverTs});
}
