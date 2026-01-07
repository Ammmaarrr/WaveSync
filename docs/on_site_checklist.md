# WaveSync On‑Site Sync Validation Checklist

Use this checklist during field tests to measure and validate cross‑device synchronization. It includes multiple measurement methods (quick acoustic, slow‑motion video, stereo mic/DAW, oscilloscope) and clear pass/fail thresholds.

## Goals and thresholds
- Same Wi‑Fi, speakers or wired headphones: target spread ≤ 50–80 ms, acceptable ≤ 100 ms.
- Mixed Wi‑Fi + 4G: target ≤ 120–180 ms, acceptable ≤ 250 ms.
- Long‑run drift (5 minutes): mean |drift| ≤ 50–100 ms, with no more than 1 large resync (>120 ms) per minute.

## Materials
- 3–5 smartphones with the Flutter client installed.
- Stable Wi‑Fi with Internet; server URL reachable.
- Optional: one device on 4G for mixed‑network tests.
- Laptop with DAW (Audacity/REAPER/Logic) and stereo audio interface OR portable stereo recorder.
- Two mics (built‑in stereo, two lavs, or two small condensers) for left/right capture.
- Optional: oscilloscope with 2 channels and mic/line adapters.
- Smartphone capable of 240 fps slow‑motion video.
- Power, stands/tape to keep phone positions fixed.

## Environment prep
1. Quiet room, minimal echoes.
2. All devices: disable battery optimizations, enable “keep screen on”, set media volume to 70–80%.
3. Turn Bluetooth OFF unless running the Bluetooth test case.
4. Ensure all test devices are on the same SSID for the Wi‑Fi scenarios.
5. Server: verify health at `GET /health` and time at `GET /server-time`.

## Device prep (per phone)
1. Open app, set HTTP/WS base, Session ID (e.g., `lobby`), unique Client ID.
2. Connect WS and tap “Sync Now (10x)”; confirm offset/RTT populated.
3. Join the session via HTTP if required.

## Quick acoustic check (phones together)
1. Select a host phone.
2. Tap “Test Sync: Start in 3s (Host)” (beep test).
3. Hold two phones ~2–5 cm apart; listen for “flam” vs one tight click.
4. Repeat 5 times; note worst observed offset (subjective).
   - Pass: flam barely perceptible or ≤ ~50–80 ms.

## Slow‑motion video method (no extra gear)
1. Place two phones ~10–20 cm from the camera mic, separated left/right.
2. Run the beep test 5–10 times.
3. Record at 240 fps near the speakers while beeps play.
4. Review frame‑by‑frame: count frame offset between the two click wavefronts.
   - Convert frames → ms: `ms = frames * (1000 / 240 ≈ 4.17)`. Record max/median.

## Stereo mic + DAW (recommended)
1. Place phone A near the left mic and phone B near the right mic (equidistant, ~3–5 cm).
2. Arm a stereo track in the DAW at 44.1/48 kHz.
3. Run the beep test (or schedule multiple starts) and record 10–20 clicks.
4. In the DAW, zoom to sample level, locate each click transient on L/R.
5. Measure sample delta between L and R for each click.
   - Convert to ms: `ms = (samples / sample_rate) * 1000`.
6. Compute median, 95th percentile, and worst case.
   - Pass: median ≤ 50 ms, 95th ≤ 100 ms on same Wi‑Fi.

## Oscilloscope method (advanced)
1. Connect two identical mics or pickups to CH1 and CH2; place by each phone.
2. Set trigger on CH1 rising edge; capture beeps.
3. Measure Δt between CH1 and CH2 per click.
4. Record median and max Δt. Compare to thresholds above.

## Spotify track measurement (metronome/click)
1. Prepare a Spotify track with sharp per‑beat transients (click/metronome).
2. Enter `track_uri` on host; optional `seek_ms` to start on a bar line.
3. Tap “Start Spotify in 3s (Host)”.
4. Capture using slow‑mo, stereo mic, or oscilloscope as above for 30–60 s.
5. Collect app telemetry (every 3 s) for drift analysis (see below).

## Multi‑network scenario (Wi‑Fi + 4G)
1. Repeat “Spotify track measurement” with one or more phones on 4G.
2. Expect higher spread; verify corrections reduce drift over time.

## 5‑minute drift test
1. Start playback and leave running 5 minutes.
2. Ensure drift monitor is active (telemetry logs every 3 s).
3. Evaluate mean/median/stddev of drift; verify backoff avoids oscillations.

## Collect logs → CSV
1. While testing, capture Flutter logs:
   - Android/iOS: `flutter logs > deviceA.log` (one device per file).
2. Convert to CSV:
   - `node tools/flutter_logs_to_csv.mjs --file=deviceA.log --deviceId=PhoneA > deviceA.csv`
3. For simulators: capture `client/simulator.ts` CSV output into `sim.csv`.
4. Summarize:
   - `node tools/summarize_csv.mjs --file=sim.csv --column=deltaFromTargetMs`
   - `node tools/summarize_csv.mjs --file=deviceA.csv --column=drift`

## Pass/fail and reporting
- Include: environment, devices, OS versions, network type, Bluetooth state.
- Attach CSV stats (count/mean/median/stddev) and worst‑case observed offsets.
- Pass if thresholds in “Goals and thresholds” are met for the given scenario.

## Troubleshooting
- Bluetooth active: route to speaker or disable BT; A2DP adds 100–200 ms.
- High RTT/offset variance: re‑sync; prefer same Wi‑Fi; reduce network load.
- Long device wakeups: disable battery optimizations and power saver.
- Web client: use ≥ 3000 ms buffer; ensure HTTPS or localhost for token playback.
- Server time: ensure host OS is NTP‑synced; restart server if clock drift suspected.
