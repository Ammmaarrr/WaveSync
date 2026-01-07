# WaveSync Test Plan

This plan covers manual multi-device tests, simulation runs, and log analysis.

## Manual tests

1. Three devices on same Wi‑Fi
   - Steps:
     - Ensure server is running and reachable on LAN.
     - On each device, open the Flutter app, set the same session ID, connect WS, run clock sync.
     - Host schedules a Spotify track start 3s ahead (ensure native SDK is integrated or use tone test).
     - Observe: play() calls occur nearly simultaneously.
   - Success criteria:
     - Reported serverTs spread across devices ≤ 50–80 ms on modern phones with speaker output.

2. Five devices mixed (Wi‑Fi + 4G)
   - Steps:
     - Two on Wi‑Fi, three on cellular.
     - Join same session, sync, host schedules start.
   - Success criteria:
     - Spread ≤ 120–200 ms depending on carrier latency; drift corrections reduce error after ~10 s.

3. Bluetooth off vs on
   - Steps:
     - Repeat the 3-device test with Bluetooth off (speaker) and then on (A2DP headphones).
   - Expected:
     - With Bluetooth on, latency increases by ~100–200 ms; prompt is shown recommending speaker.
     - Spread and drift are higher; drift correction attempts small seeks.

4. Drift after 5 minutes
   - Steps:
     - Start a track; keep clients running 5 minutes.
     - Monitor telemetry drift logs every 3 s; ensure exponential backoff avoids oscillations.
   - Success criteria:
     - Mean absolute drift ≤ 50–100 ms after corrections; few large resyncs.

## Simulation (Node)

- Goal: emulate N clients and compute variance of scheduled start deltas.
- Tool: `client/simulator.ts`
- Example:
  - `npx -y --package=tsx --package=ws tsx client/simulator.ts --clients=10 --ws=ws://localhost:4000 --http=http://localhost:4000 --session=lobby`
  - Broadcast a start (Host) from any client; the simulator prints CSV rows with deltas.

## Web client (browser)

- Use `web-client` to verify Web Playback path with higher buffer (≥ 3000 ms).
- Steps:
  - `npm run dev` in `web-client`, open page, provide OAuth token and transfer playback.
  - Connect WS, sync, schedule a start. Review telemetry drift in console/log UI.

## Flutter debug build & logs → CSV

- Build/run debug:
  - Android: `flutter run -d <deviceId>`
  - iOS: `flutter run -d <deviceId>`
- Collect logs for each device separately:
  - Android: `flutter logs > deviceA.log` (while the app runs and a start is executed)
  - iOS: `flutter logs > deviceB.log`
- Then convert logs to CSV with the parser below, passing device ID label.

Expected CSV fields per device
- `deviceId`: label you pass to the parser
- `offset`: offset (ms) from clock sync
- `scheduledStart`: serverTime from the start message
- `playCallTs`: local wall clock when play() was invoked
- `sdkPositionAt1s`: position reported ~1 s after intended start
- `drift`: sdkPositionAt1s − expected (ms)

---

# Scripts

## Node: Spawn simulated clients and compute variance

Use the script in `tools/sim_variance.mjs` to launch the simulator and compute mean/median/stddev of `deltaFromTargetMs`.

Example (PowerShell):

```powershell
node tools/sim_variance.mjs --clients=10 --ws=ws://localhost:4000 --http=http://localhost:4000 --session=lobby
```

## Node: Summarize CSV files (mean/median/stddev)

Use `tools/summarize_csv.mjs`:

```powershell
node tools/summarize_csv.mjs --file=sim.csv --column=deltaFromTargetMs
node tools/summarize_csv.mjs --file=deviceA.csv --column=drift
```

## Node: Parse Flutter logs → CSV

Use `tools/flutter_logs_to_csv.mjs` to extract values from Flutter logs.

```powershell
# Parse a device log into CSV
node tools/flutter_logs_to_csv.mjs --file=deviceA.log --deviceId=Pixel7 > deviceA.csv
```

The parser looks for lines like:
- `Clock sync => offset=XX.XXms` → offset
- `Start track signal: ... server=NNN` → scheduledStart
- `Spotify play() call at NNN` → playCallTs
- `Micro-adjust check: expected=E ms, pos=P ms, drift=D ms` → sdkPositionAt1s, drift

Then use `tools/summarize_csv.mjs` to aggregate.

---

# Tips
- For consistent results, keep devices on the same LAN and disable battery optimizations.
- Bluetooth routing significantly increases latency; prefer speakers or wired headphones.
- On Web, always schedule with ≥ 3000 ms buffer.
